const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryText = document.getElementById('summary');

let currentTimerState = 'stopped'; // 用来跟踪当前计时器状态

function formatTime(timeLeft) {
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateTimer() {
  chrome.runtime.sendMessage({ type: "GET_TIME" }, (response) => {
    if (response) {
      timerDisplay.textContent = formatTime(response.timeLeft);
    }
  });
}

function updateSummary() {
  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
    const today = new Date().toISOString().split('T')[0]; // 获取当前日期，格式为 YYYY-MM-DD
    const total = response.history?.[today] || 0;
    summaryText.textContent = `今日累计：${total} 分钟`;
  });
}

// 启动或恢复计时器
startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response.state === "paused") {
      chrome.runtime.sendMessage({ type: "RESUME_TIMER" });
      currentTimerState = "running";
    } else {
      const customMinutes = parseInt(document.getElementById("customTime").value, 10) || 20;
      chrome.runtime.sendMessage({ type: "START_TIMER", minutes: customMinutes });
      saveCustomTime(customMinutes); // 保存当前用户设置的时间
      currentTimerState = "running";
    }
  });
});

// 暂停计时器
pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });
  currentTimerState = "paused";
});

// 重置计时器
resetBtn.addEventListener('click', () => {
  const customMinutes = parseInt(document.getElementById("customTime").value, 10) || 20;
  chrome.runtime.sendMessage({ type: "RESET_TIMER", minutes: customMinutes });
  saveCustomTime(customMinutes); // 保存当前设置的时间
  currentTimerState = "stopped";
  updateSummary();  // 更新计时器历史记录
});

// 获取上次的设置时间
function loadCustomTime() {
  chrome.storage.sync.get(['customTime'], (result) => {
    const lastTime = result.customTime || 20; // 默认20分钟
    document.getElementById('customTime').value = lastTime;
    timerDisplay.textContent = formatTime(lastTime * 60);
  });
}

// 保存当前设置的时间
function saveCustomTime(customMinutes) {
  chrome.storage.sync.set({ customTime: customMinutes }, () => {
    console.log('Time saved:', customMinutes);
  });
}

// 更新计时器历史记录
function updateHistory(timeSpent) {
  const today = new Date().toISOString().split('T')[0]; // 获取当前日期
  chrome.storage.sync.get(['history'], (result) => {
    const history = result.history || {};
    history[today] = (history[today] || 0) + timeSpent; // 累加今天的时间
    chrome.storage.sync.set({ history }, () => {
      console.log('History updated:', history[today]);
    });
  });
}
// 定时更新 UI
setInterval(() => {
  updateTimer();
  updateSummary();
}, 1000);

// 在计时器结束时更新历史记录
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TIMER_COMPLETED") {
    const customMinutes = parseInt(document.getElementById('customTime').value, 10) || 20;
    updateHistory(customMinutes);  // 在计时结束时更新历史记录
  }
});

// 加载上次设置的时间
loadCustomTime();
updateTimer();