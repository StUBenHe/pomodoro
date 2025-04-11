let running = false;
let timeLeft = 20 * 60; // 20 minutes

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_TIMER") {
    if (!running) {
      running = true;
      chrome.alarms.create("pomodoro", { periodInMinutes: 1 / 60 }); // 每秒钟触发一次
    }
  }

  if (message.type === "PAUSE_TIMER") {
    running = false;
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "RESET_TIMER") {
    running = false;
    timeLeft = 20 * 60;
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "GET_TIME") {
    sendResponse({ timeLeft, running });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoro" && running) {
    if (timeLeft > 0) {
      timeLeft--;
    } else {
      chrome.alarms.clear("pomodoro");
      running = false;
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "番茄时间到啦！",
        message: "休息一下吧 🍅"
      });
    }
  }
});
