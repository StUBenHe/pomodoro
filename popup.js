const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryText = document.getElementById('summary');
const musicSelect = document.getElementById('musicSelect');
const customTimeInput = document.getElementById('customTime');
const body = document.body;

let currentTimerState = 'stopped';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function setupOffscreen() {
  try {
    const existing = await chrome.offscreen.hasDocument();
    if (!existing) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Background music playback'
      });
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
  timerDisplay.textContent = formatTime(customMinutes * 60);
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
      if (response?.state === "paused") {
        chrome.runtime.sendMessage({ type: "RESUME_TIMER" }, resolve);
      } else {
        chrome.runtime.sendMessage({
          type: "START_TIMER",
          minutes: customMinutes,
          music: musicSelect.value
        }, resolve);
      }
    });
  });

  await updateUIState(); // 确保状态更新后刷新 UI
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

function updateTheme() {
  const themeValue = musicSelect.value;
  chrome.storage.local.set({ selectedTheme: themeValue }); // 保存主题选择
  
  document.body.classList.remove('theme-lofi', 'theme-rainy', 'theme-none');
  const theme = musicSelect.value.split('/').pop().split('.')[0]; // 例如 "music_rainy"
  if (theme === 'none') {
    body.classList.add('theme-none');
  } else if (theme.includes('rainy')) {
    body.classList.add('theme-rainy');
  } else if (theme.includes('lofi')) {
    body.classList.add('theme-lofi');
  }
}

musicSelect.addEventListener('change', updateTheme);
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TIMER_UPDATE") {
    timerDisplay.textContent = formatTime(message.timeLeft);
  }
  if (message.type === "STATE_CHANGED") {
    updateUIState(); // 收到通知立即更新 UI
  }
});

// 初始化
setupOffscreen();
loadCustomTime();
updateTimer();
updateSummary();
updateUIState();

// 读取上次的主题选择
chrome.storage.local.get(['selectedTheme'], (result) => {
  const theme = result.selectedTheme || "audio/none"; // 默认为无主题
  musicSelect.value = theme;
  updateTheme();
});
