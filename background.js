let running = false;
let timeLeft = 20 * 60; // 20 minutes
let timerState = "stopped"; // "running", "paused", "stopped"

console.log("Service Worker 启动了");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("接收到消息：", message);

  if (message.type === "START_TIMER") {
    console.log("启动计时器");
    timeLeft = (message.minutes || 20) * 60;
    running = true;
    timerState = "running";
    chrome.alarms.create("pomodoro", { periodInMinutes: 1 / 60 });
  }

  if (message.type === "RESUME_TIMER") {
    if (timerState === "paused" && timeLeft > 0) {
      console.log("恢复计时器");
      running = true;
      timerState = "running";
      chrome.alarms.create("pomodoro", { periodInMinutes: 1 / 60 });
    }
  }

  if (message.type === "PAUSE_TIMER") {
    running = false;
    timerState = "paused";
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "RESET_TIMER") {
    running = false;
    timerState = "stopped";
    timeLeft = (message.minutes || 20) * 60;
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "GET_TIME") {
    sendResponse({ timeLeft, running });
  }

  if (message.type === "GET_STATE") {
    sendResponse({ state: timerState });
  }

  return true; // 异步响应
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoro" && running) {
    if (timeLeft > 0) {
      timeLeft--;
    } else {
      chrome.alarms.clear("pomodoro");
      running = false;
      timerState = "stopped";
      chrome.notifications.create({
        type: "basic",
        iconUrl: "sunflower.png",
        title: "番茄时间到啦！",
        message: "休息一下吧 🍅"
      });
    }
  }
});
