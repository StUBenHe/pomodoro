let running = false;
let timeLeft = 20 * 60; // 默认20分钟
let timerState = "stopped";
let customMinutes = 20; // 初始设置时间为20分钟

console.log("Service Worker 启动了");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_TIMER") {
    customMinutes = message.minutes || 20;  // 保存用户设置的分钟
    timeLeft = customMinutes * 60; // 根据设定时间初始化计时
    running = true;
    timerState = "running";
    chrome.alarms.create("pomodoro", { periodInMinutes: 1 / 60 });
  }

  if (message.type === "RESUME_TIMER") {
    if (timerState === "paused" && timeLeft > 0) {
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
    timeLeft = customMinutes * 60; // 重置为用户设置的时间
    chrome.alarms.clear("pomodoro");
  }

  if (message.type === "GET_TIME") {
    sendResponse({ timeLeft, running });
  }

  if (message.type === "GET_STATE") {
    sendResponse({ state: timerState });
  }

  if (message.type === "GET_HISTORY") {
    chrome.storage.local.get(null, (result) => {
      sendResponse({ history: result });
    });
    return true;
  }

  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoro" && running) {
    if (timeLeft > 0) {
      timeLeft--;
    } else {
      chrome.alarms.clear("pomodoro");
      running = false;
      timerState = "stopped";

      // ✅ 记录实际使用的时间（不再固定为20分钟，而是根据用户设置）
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      chrome.storage.local.get([today], (data) => {
        const currentTotal = data[today] || 0;
        chrome.storage.local.set({ [today]: currentTotal + customMinutes }); // 累加用户设定的时间（而不是20分钟）
      });

      chrome.notifications.create({
        type: "basic",
        iconUrl: "sunflower.png",
        title: "番茄时间到啦！",
        message: `已完成一个番茄（${customMinutes} 分钟） 🍅`
      });
    }
  }
});
