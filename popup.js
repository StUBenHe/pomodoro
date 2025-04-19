const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryText = document.getElementById('summary');
const musicSelect = document.getElementById('musicSelect');
const customTimeInput = document.getElementById('customTime');
const body = document.body;
let isUpdating = false;

let currentTimerState = 'stopped';


async function preciseUpdate() {
  if (isUpdating) return;
  isUpdating = true;
  
  // 直接请求最新状态而非依赖轮询
  const state = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, resolve);
  });
  
  timerDisplay.textContent = formatTime(state.timeLeft);
  startBtn.disabled = state.state === 'running';
  pauseBtn.disabled = state.state !== 'running';
  resetBtn.disabled = state.state === 'stopped';
  
  isUpdating = false;
}

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
  await preciseUpdate();
  chrome.runtime.sendMessage({ type: "SYNC_STATE" });
}

startBtn.addEventListener('click', async () => {
  await setupOffscreen();

  const customMinutes = parseInt(customTimeInput.value, 10) || 20;
  saveCustomTime(customMinutes);
  timerDisplay.textContent = formatTime(customMinutes * 60);

  // 直接根据当前状态发送单一指令
  const state = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, resolve);
  });

  if (state?.state === "paused") {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "RESUME_TIMER" }, resolve);
    });
  } else {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "START_TIMER",
        minutes: customMinutes,
        music: musicSelect.value
      }, resolve);
    });
  }

  await updateUIState();
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
  chrome.storage.local.set({ selectedTheme: themeValue });
  
  // 动态移除所有主题类
  const classList = [...body.classList];
  classList.forEach(className => {
    if (className.startsWith('theme-')) {
      body.classList.remove(className);
    }
  });

  // 精确匹配逻辑
  if (themeValue.includes('forest')) {
    body.classList.add('theme-forest');
  } else if (themeValue.includes('rainy')) {
    body.classList.add('theme-rainy');
  } else if (themeValue.includes('lofi')) {
    body.classList.add('theme-lofi');
  } else {
    body.classList.add('theme-none');
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
  if (message.type === "TIMER_FINISHED") {
    // 强制更新所有状态
    updateTimer();
    updateUIState();
    
    // 双重保障发送停止指令
    chrome.runtime.sendMessage({
      type: "MUSIC_CONTROL",
      target: "offscreen",
      action: "stop"
    });
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
