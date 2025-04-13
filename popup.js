const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryText = document.getElementById('summary');

let currentTimerState = 'stopped'; // 当前计时器状态

// 时间格式化函数（mm:ss）
function formatTime(timeLeft) {
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// 从 background 获取剩余时间
function updateTimer() {
  chrome.runtime.sendMessage({ type: "GET_TIME" }, (response) => {
    if (response) {
      timerDisplay.textContent = formatTime(response.timeLeft);
    }
  });
}

// 获取并显示今日累计时间
function updateSummary() {
  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
    const today = new Date().toISOString().split('T')[0];
    const total = response.history?.[today] || 0;
    summaryText.textContent = `今日累计：${total} 分钟`;
  });
}

// 启动/恢复计时器
startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    const customMinutes = parseInt(document.getElementById("customTime").value, 10) || 20;

    if (response.state === "paused") {
      chrome.runtime.sendMessage({ type: "RESUME_TIMER" });
    } else {
      chrome.runtime.sendMessage({ type: "START_TIMER", minutes: customMinutes });
      saveCustomTime(customMinutes);
    }

    currentTimerState = "running";
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
  saveCustomTime(customMinutes);
  currentTimerState = "stopped";
  updateSummary(); // 更新历史显示
});

// 读取上次设置时间
function loadCustomTime() {
  chrome.storage.sync.get(['customTime'], (result) => {
    const lastTime = result.customTime || 20;
    document.getElementById('customTime').value = lastTime;
    timerDisplay.textContent = formatTime(lastTime * 60);
  });
}

// 保存当前设置时间
function saveCustomTime(customMinutes) {
  chrome.storage.sync.set({ customTime: customMinutes }, () => {
    console.log('Time saved:', customMinutes);
  });
}

// 定时刷新UI（包括倒计时和累计）
setInterval(() => {
  updateTimer();
  updateSummary();
}, 1000);

// 页面加载时初始化
loadCustomTime();
updateTimer();
