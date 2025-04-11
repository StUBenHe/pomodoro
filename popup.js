const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

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

startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response.state === "paused") {
      chrome.runtime.sendMessage({ type: "RESUME_TIMER" });
    } else {
      const customMinutes = parseInt(document.getElementById("customTime").value, 10) || 20;
      chrome.runtime.sendMessage({ type: "START_TIMER", minutes: customMinutes });
    }
  });
});

pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });
});

resetBtn.addEventListener('click', () => {
  const customMinutes = parseInt(document.getElementById("customTime").value, 10) || 20;
  chrome.runtime.sendMessage({ type: "RESET_TIMER", minutes: customMinutes });
});

// 定时刷新 UI
setInterval(updateTimer, 1000);
updateTimer(); // 初始更新

