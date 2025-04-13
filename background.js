let timeLeft = 20 * 60;
let running = false;
let timerState = "stopped";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_TIMER") {
    timeLeft = (message.minutes || 20) * 60;
    running = true;
    timerState = "running";
    chrome.alarms.create("pomodoro", { periodInMinutes: 1 / 60 });
  }

  if (message.type === "RESUME_TIMER") {
    running = true;
    timerState = "running";
    chrome.alarms.create("pomodoro", { periodInMinutes: 1 / 60 });
  }

  if (message.type === "PAUSE_TIMER") {
    running = false;
    timerState = "paused";
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "RESET_TIMER") {
    running = false;
    timeLeft = (message.minutes || 20) * 60;
    timerState = "stopped";
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "GET_TIME") {
    sendResponse({ timeLeft, running });
  }

  if (message.type === "GET_STATE") {
    sendResponse({ state: timerState });
  }

  if (message.type === "GET_HISTORY") {
    chrome.storage.sync.get(["history"], (result) => {
      sendResponse({ history: result.history || {} });
    });
    return true;
  }

  if (message.type === "UPDATE_HISTORY") {
    const timeSpent = message.timeSpent || 0;
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.sync.get(["history"], (result) => {
      const history = result.history || {};
      history[today] = (history[today] || 0) + timeSpent;
      chrome.storage.sync.set({ history }, () => {
        console.log("历史记录已更新：", history[today]);
      });
    });
  }

  return true;
});

// 定时器逻辑
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoro" && running) {
    if (timeLeft > 0) {
      timeLeft--;
    } else {
      chrome.alarms.clear("pomodoro");
      running = false;
      timerState = "stopped";

      chrome.runtime.sendMessage({ type: "TIMER_COMPLETED" });

      // 自动更新历史记录
      const today = new Date().toISOString().split('T')[0];
      chrome.storage.sync.get(["customTime", "history"], (result) => {
        const usedMinutes = result.customTime || 20;
        const history = result.history || {};
        history[today] = (history[today] || 0) + usedMinutes;

        chrome.storage.sync.set({ history }, () => {
          console.log("计时结束，自动更新历史：", history[today]);
        });
      });

      chrome.notifications.create({
        type: "basic",
        iconUrl: "sunflower.png",
        title: "番茄时间到啦！",
        message: "休息一下吧 🍅"
      });
    }
  }
});
