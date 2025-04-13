const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryText = document.getElementById('summary');

const musicSelect = document.getElementById('musicSelect');
const bgm = document.getElementById('bgm');
const ding = document.getElementById('ding');

let currentTimerState = 'stopped';

// 时间格式化
function formatTime(timeLeft) {
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// 获取剩余时间
function updateTimer() {
  chrome.runtime.sendMessage({ type: "GET_TIME" }, (response) => {
    if (response) {
      timerDisplay.textContent = formatTime(response.timeLeft);
    }
  });
}

// 更新今日累计
function updateSummary() {
  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
    const today = new Date().toISOString().split('T')[0];
    const total = response.history?.[today] || 0;
    summaryText.textContent = `今日累计：${total} 分钟`;
  });
}

// 加载设置时间
function loadCustomTime() {
  chrome.storage.sync.get(['customTime'], (result) => {
    const lastTime = result.customTime || 20;
    document.getElementById('customTime').value = lastTime;
    timerDisplay.textContent = formatTime(lastTime * 60);
  });
}

// 保存设置时间
function saveCustomTime(customMinutes) {
  chrome.storage.sync.set({ customTime: customMinutes }, () => {
    console.log('Time saved:', customMinutes);
  });
}

// 启动或恢复
startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    const customMinutes = parseInt(document.getElementById("customTime").value, 10) || 20;
    if (response.state === "paused") {
      chrome.runtime.sendMessage({ type: "RESUME_TIMER" });
    } else {
      chrome.runtime.sendMessage({ type: "START_TIMER", minutes: customMinutes });
      saveCustomTime(customMinutes);
    }

    bgm.src = musicSelect.value;
    bgm.play();
    currentTimerState = "running";
  });
});

// 暂停
pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });
  bgm.pause();
  currentTimerState = "paused";
});

// 重置
resetBtn.addEventListener('click', () => {
  const customMinutes = parseInt(document.getElementById("customTime").value, 10) || 20;
  chrome.runtime.sendMessage({ type: "RESET_TIMER", minutes: customMinutes });
  saveCustomTime(customMinutes);
  bgm.pause();
  currentTimerState = "stopped";
  updateSummary();
});

// 音乐切换
musicSelect.addEventListener('change', () => {
  bgm.src = musicSelect.value;
  if (currentTimerState === 'running') {
    bgm.play();
  }
});

// 计时结束：播放提示音 + 停止背景音乐
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TIMER_COMPLETED") {
    ding.play();
    bgm.pause();
  }
});

// 定时刷新 UI
setInterval(() => {
  updateTimer();
  updateSummary();
}, 1000);

// 初始化
loadCustomTime();
updateTimer();
