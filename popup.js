// popup.js
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryText = document.getElementById('summary');
const musicSelect = document.getElementById('musicSelect');
const customTimeInput = document.getElementById('customTime');

let currentTimerState = 'stopped';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function setupOffscreen() {
  try {
    const existing = await chrome.offscreen.hasDocument();
    console.log('Offscreen document exists:', existing);
    
    if (!existing) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Background music playback'
      });
      console.log('Offscreen document created');
    }
  } catch (err) {
    console.error('Offscreen setup failed:', err);
  }
}
function saveCustomTime(minutes) {
  const validMinutes = Math.max(1, Math.min(120, minutes));
  chrome.storage.local.set({ customTime: validMinutes });
}

function loadCustomTime() {
  chrome.storage.local.get(['customTime'], (result) => {
    const minutes = result.customTime || 20;
    customTimeInput.value = minutes;
    timerDisplay.textContent = formatTime(minutes * 60);
  });
}

function updateTimer() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response?.timeLeft !== undefined) {
      timerDisplay.textContent = formatTime(response.timeLeft);
    }
  });
}

function updateSummary() {
  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
    const today = new Date().toISOString().split('T')[0];
    const total = response.history?.[today] || 0;
    summaryText.textContent = `今日累计：${total} 分钟`;
  });
}

async function updateUIState() {
  const result = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  currentTimerState = result?.state || 'stopped';

  startBtn.disabled = currentTimerState === 'running';
  pauseBtn.disabled = currentTimerState !== 'running';
  resetBtn.disabled = currentTimerState === 'stopped';
}

startBtn.addEventListener('click', async () => {
  await setupOffscreen();
  
  const customMinutes = parseInt(customTimeInput.value, 10) || 20;
  saveCustomTime(customMinutes);

  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response?.state === "paused") {
      chrome.runtime.sendMessage({ type: "RESUME_TIMER" });
    } else {
      chrome.runtime.sendMessage({
        type: "START_TIMER",
        minutes: customMinutes,
        music: musicSelect.value
      });
    }
  });
  updateUIState();
});

pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });
  updateUIState();
});

resetBtn.addEventListener('click', () => {
  const customMinutes = parseInt(customTimeInput.value, 10) || 20;
  saveCustomTime(customMinutes);
  chrome.runtime.sendMessage({ type: "RESET_TIMER", minutes: customMinutes });
  updateSummary();
  updateUIState();
});

musicSelect.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    type: "SET_MUSIC",
    music: musicSelect.value
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TIMER_UPDATE") {
    timerDisplay.textContent = formatTime(message.timeLeft);
  }
});

setInterval(() => {
  updateTimer();
  updateSummary();
}, 1000);

const select = document.getElementById('musicSelect');
select.addEventListener('change', () => {
  document.body.classList.remove('theme-rainy', 'theme-lofi', 'theme-none');
  const theme = select.value;
  document.body.classList.add(`theme-${theme}`);
});


// 初始化
setupOffscreen();
loadCustomTime();
updateTimer();
updateSummary();
updateUIState();