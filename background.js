let running = false;
let timeLeft = 20 * 60; // 20 minutes

console.log("Service Worker 启动了");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("接收到消息：", message);

  if (message.type === "START_TIMER") {
    console.log("启动计时器");
    if (!running) {
      timeLeft = (message.minutes || 20) * 60;
      running = true;
      chrome.alarms.create("pomodoro", { periodInMinutes: 1 / 60 });
    }
  }

  if (message.type === "PAUSE_TIMER") {
    running = false;
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "RESET_TIMER") {
    running = false;
    timeLeft = (message.minutes || 20) * 60;
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "GET_TIME") {
    sendResponse({ timeLeft, running });
  }

  return true; // 表示异步 sendResponse
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
        iconUrl: "sunflower.png",
        title: "番茄时间到啦！",
        message: "休息一下吧 🍅"
      });
    }
  }
});
