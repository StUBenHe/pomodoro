// background.js
let timerState = "stopped";
let currentTimeLeft = 20 * 60;
let targetEndTime = null;
let currentMusic = null;

// 初始化加载状态
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

function saveState() {
  chrome.storage.local.set({
    timerState,
    currentTimeLeft,
    targetEndTime,
    currentMusic
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "START_TIMER":
      const minutes = Math.max(1, Math.min(120, message.minutes || 20));
      currentTimeLeft = minutes * 60;
      targetEndTime = Date.now() + currentTimeLeft * 1000;
      timerState = "running";
      currentMusic = message.music;
      chrome.storage.local.set({ currentSessionMinutes: minutes });
      chrome.alarms.create("tick", { periodInMinutes: 1 / 60 });
      saveState();
      chrome.runtime.sendMessage({
        type: "MUSIC_CONTROL",
        target: "offscreen", // 添加 target 字段
        action: "play",
        music: currentMusic
      });
      break;

    case "RESUME_TIMER":
      if (currentTimeLeft > 0) {
        targetEndTime = Date.now() + currentTimeLeft * 1000;
        timerState = "running";
        chrome.alarms.create("tick", { periodInMinutes: 1 / 60 });
        saveState();
        chrome.runtime.sendMessage({
          type: "MUSIC_CONTROL",
          target: "offscreen", // 添加 target 字段
          action: "play",
          music: currentMusic
        });
      }
      chrome.runtime.sendMessage({ type: "STATE_CHANGED" });
      break;

    case "PAUSE_TIMER":
      if (timerState === "running") {
        currentTimeLeft = Math.ceil((targetEndTime - Date.now()) / 1000);
      }
      timerState = "paused";
      targetEndTime = null;
      chrome.alarms.clear("tick");
      saveState();
      chrome.runtime.sendMessage({ 
        type: "MUSIC_CONTROL",
        target: "offscreen", // 添加 target 字段
        action: "pause" });
      chrome.runtime.sendMessage({ type: "STATE_CHANGED" });  
      break;

    case "RESET_TIMER":
      timerState = "stopped";
      currentTimeLeft = Math.max(1, Math.min(120, message.minutes || 20)) * 60;
      targetEndTime = null;
      chrome.alarms.clear("tick");
      saveState();
      chrome.runtime.sendMessage({
        type: "MUSIC_CONTROL",
        target: "offscreen",
        action: "stop"
      });
      
      chrome.runtime.sendMessage({ type: "STATE_CHANGED" });
      break;

    case "GET_STATE":
      sendResponse({ state: timerState, timeLeft: currentTimeLeft });
      chrome.runtime.sendMessage({ type: "STATE_CHANGED" });
      break;

    case "SET_MUSIC":
      currentMusic = message.music;
      saveState();
      if (timerState === "running") {
        chrome.runtime.sendMessage({
          type: "MUSIC_CONTROL",
          target: "offscreen", // 添加 target 字段
          action: "play",
          music: currentMusic
        });
      }
      break;

    case "GET_HISTORY":
      chrome.storage.local.get(["history"], (result) => {
        sendResponse({ history: result.history || {} });
      });
      return true;

    case "UPDATE_HISTORY":
      const timeSpent = message.timeSpent || 0;
      const today = new Date().toISOString().split("T")[0];
      chrome.storage.local.get(["history"], (result) => {
        const history = result.history || {};
        history[today] = (history[today] || 0) + timeSpent;
        chrome.storage.local.set({ history });
      });
      break;
  }
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tick" && timerState === "running") {
    currentTimeLeft = Math.ceil((targetEndTime - Date.now()) / 1000);

    if (currentTimeLeft <= 0) {
      timerState = "stopped";
      currentTimeLeft = 0;
      chrome.alarms.clear("tick");
      chrome.runtime.sendMessage({
        type: "MUSIC_CONTROL",
        target: "offscreen",
        action: "stop"       // 明确停止动作
      });
      const today = new Date().toISOString().split("T")[0];
      chrome.storage.local.get(["history", "currentSessionMinutes"], (result) => {
        const usedMinutes = result.currentSessionMinutes || 20;
        const history = result.history || {};
        history[today] = (history[today] || 0) + usedMinutes;
        chrome.storage.local.set({ history });
      });

      chrome.notifications.create({
        type: "basic",
        iconUrl: "sunflower.png",
        title: "番茄时间到啦！",
        message: "休息一下吧 🍅"
      });

      chrome.runtime.sendMessage({ type: "MUSIC_CONTROL", action: "stop" });
    }

    saveState();
    chrome.runtime.sendMessage({
      type: "TIMER_UPDATE",
      timeLeft: currentTimeLeft
    });
  }
});