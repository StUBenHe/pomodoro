// background.js

// ==================== 全局状态变量 ====================
let timerState = "stopped";
let currentTimeLeft = 20 * 60;
let targetEndTime = null;
let currentMusic = null;

// ==================== 状态初始化 ====================
chrome.storage.local.get(
  ["timerState", "currentTimeLeft", "targetEndTime", "currentMusic", "currentSessionMinutes"],
  (result) => {
    timerState = result.timerState || "stopped";
    currentTimeLeft = result.currentTimeLeft || 20 * 60;
    targetEndTime = result.targetEndTime || null;
    currentMusic = result.currentMusic || null;

    if (timerState === "running" && targetEndTime) {
      const remaining = Math.ceil((targetEndTime - Date.now()) / 1000);
      if (remaining > 0) {
        currentTimeLeft = remaining;
        chrome.alarms.create("tick", { periodInMinutes: 1 / 60 });
      } else {
        timerState = "stopped";
        saveState();
      }
    }
  }
);

// ==================== 状态管理 ====================
function saveState() {
  chrome.storage.local.set({
    timerState,
    currentTimeLeft,
    targetEndTime,
    currentMusic
  });
}

// ==================== 音乐控制 ====================
function playMusic() {
  chrome.runtime.sendMessage({
    type: "MUSIC_CONTROL",
    target: "offscreen",
    action: "play",
    music: currentMusic
  });
}

function pauseMusic() {
  chrome.runtime.sendMessage({ 
    type: "MUSIC_CONTROL",
    target: "offscreen",
    action: "pause" 
  });
}

function stopMusic() {
  chrome.runtime.sendMessage({
    type: "MUSIC_CONTROL",
    target: "offscreen",
    action: "stop"
  });
}

// ==================== 历史记录 ====================
function updateHistory(timeSpent) {
  const today = new Date().toISOString().split("T")[0];
  chrome.storage.local.get(["history", "currentSessionMinutes"], (result) => {
    const usedMinutes = timeSpent || result.currentSessionMinutes || 20;
    const history = result.history || {};
    history[today] = (history[today] || 0) + usedMinutes;
    chrome.storage.local.set({ history });
  });
}

// ==================== 定时器核心逻辑 ====================
function handleTimerFinish() {
  timerState = "stopped";
  currentTimeLeft = 0;
  chrome.alarms.clear("tick");
  stopMusic();
  
  chrome.notifications.create({
    type: "basic",
    iconUrl: "sunflower.png",
    title: "番茄时间到啦！",
    message: "休息一下吧 🍅"
  });

  updateHistory();
}

// ==================== 消息监听处理 ====================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    // ---------- 定时器控制 ----------
    case "START_TIMER":
      const minutes = Math.max(1, Math.min(120, message.minutes || 20));
      currentTimeLeft = minutes * 60;
      targetEndTime = Date.now() + currentTimeLeft * 1000;
      timerState = "running";
      currentMusic = message.music;
      chrome.storage.local.set({ currentSessionMinutes: minutes });
      chrome.alarms.create("tick", { periodInMinutes: 1 / 60 });
      saveState();
      playMusic();
      break;

    case "RESUME_TIMER":
      if (currentTimeLeft > 0) {
        targetEndTime = Date.now() + currentTimeLeft * 1000;
        timerState = "running";
        chrome.alarms.create("tick", { periodInMinutes: 1 / 60 });
        saveState();
        playMusic();
      }
      break;

    case "PAUSE_TIMER":
      if (timerState === "running") {
        currentTimeLeft = Math.ceil((targetEndTime - Date.now()) / 1000);
      }
      timerState = "paused";
      targetEndTime = null;
      chrome.alarms.clear("tick");
      saveState();
      pauseMusic();
      break;

    case "RESET_TIMER":
      timerState = "stopped";
      currentTimeLeft = Math.max(1, Math.min(120, message.minutes || 20)) * 60;
      targetEndTime = null;
      chrome.alarms.clear("tick");
      saveState();
      stopMusic();
      break;

    // ---------- 状态查询 ----------
    case "GET_STATE":
      sendResponse({ state: timerState, timeLeft: currentTimeLeft });
      break;

    // ---------- 音乐控制 ----------
    case "SET_MUSIC":
      currentMusic = message.music;
      saveState();
      if (timerState === "running") playMusic();
      break;

    // ---------- 历史记录 ----------
    case "GET_HISTORY":
      chrome.storage.local.get(["history"], (result) => {
        sendResponse({ history: result.history || {} });
      });
      return true; // 保持异步响应

    case "UPDATE_HISTORY":
      updateHistory(message.timeSpent);
      break;
  }
  
  // 通知所有监听器状态变化
  chrome.runtime.sendMessage({ type: "STATE_CHANGED" });
  return true;
});

// ==================== 定时器触发 ====================
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tick" && timerState === "running") {
    currentTimeLeft = Math.ceil((targetEndTime - Date.now()) / 1000);

    if (currentTimeLeft <= 0) {
      handleTimerFinish();
    }

    saveState();
    chrome.runtime.sendMessage({
      type: "TIMER_UPDATE",
      timeLeft: currentTimeLeft
    });
  }
});