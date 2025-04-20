// popup.js

// ==================== DOM元素初始化 ====================
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const summaryText = document.getElementById('summary');
const musicSelect = document.getElementById('musicSelect');
const customTimeInput = document.getElementById('customTime');
const body = document.body;

// ==================== 全局状态 ====================
let isUpdating = false;
let currentTimerState = 'stopped';

// ==================== 初始化函数 ====================
async function initializeApp() {
  await setupOffscreen();
  loadCustomTime();
  updateTimer();
  updateSummary();
  restoreTheme();
  await updateUIState();
}

// ==================== 状态管理 ====================
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

// ==================== UI更新逻辑 ====================
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function fetchAndUpdateState() {
  if (isUpdating) return;
  isUpdating = true;

  const state = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, resolve);
  });

  timerDisplay.textContent = formatTime(state.timeLeft);
  startBtn.disabled = state.state === 'running';
  pauseBtn.disabled = state.state !== 'running';
  resetBtn.disabled = state.state === 'stopped';

  isUpdating = false;
}

function updateTimer() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    timerDisplay.textContent = formatTime(response?.timeLeft || 0);
  });
}

function updateSummary() {
  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
    const today = new Date().toISOString().split('T')[0];
    const total = response.history?.[today] || 0;
    summaryText.textContent = `今日累计：${total} 分钟`;
  });
}

// ==================== 定时器控制 ====================
async function handleStart() {
  await setupOffscreen();

  const customMinutes = parseInt(customTimeInput.value, 10) || 20;
  saveCustomTime(customMinutes);
  timerDisplay.textContent = formatTime(customMinutes * 60);

  const state = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, resolve);
  });

  const messageType = state?.state === "paused" ? "RESUME_TIMER" : "START_TIMER";
  await new Promise(resolve => {
    chrome.runtime.sendMessage({
      type: messageType,
      minutes: customMinutes,
      music: musicSelect.value
    }, resolve);
  });

  await updateUIState();
}

function handlePause() {
  chrome.runtime.sendMessage({ type: "PAUSE_TIMER" });
  updateUIState();
}

function handleReset() {
  const customMinutes = parseInt(customTimeInput.value, 10) || 20;
  saveCustomTime(customMinutes);
  chrome.runtime.sendMessage({ type: "RESET_TIMER", minutes: customMinutes });
  updateSummary();
  updateUIState();
}

// ==================== 主题管理 ====================
function updateTheme() {
  const themeValue = musicSelect.value;
  chrome.storage.local.set({ selectedTheme: themeValue });

  // 清理旧主题样式
  const themeClasses = Array.from(body.classList).filter(c => c.startsWith('theme-'));
  body.classList.remove(...themeClasses);

  // 应用新主题
  const themeMap = {
    forest: 'theme-forest',
    rainy: 'theme-rainy',
    lofi: 'theme-lofi',
    none: 'theme-none'
  };
  const themeClass = Object.entries(themeMap).find(([key]) => themeValue.includes(key))?.[1] || 'theme-none';
  body.classList.add(themeClass);
}

function restoreTheme() {
  chrome.storage.local.get(['selectedTheme'], (result) => {
    musicSelect.value = result.selectedTheme || "audio/none";
    updateTheme();
  });
}

// ==================== 消息监听 ====================
chrome.runtime.onMessage.addListener((message) => {
  switch(message.type) {
    case "TIMER_UPDATE":
      timerDisplay.textContent = formatTime(message.timeLeft);
      break;
      
    case "STATE_CHANGED":
      fetchAndUpdateState();
      break;

    case "TIMER_FINISHED":
      updateTimer();
      fetchAndUpdateState();
      chrome.runtime.sendMessage({
        type: "MUSIC_CONTROL",
        target: "offscreen",
        action: "stop"
      });
      break;
  }
});

// ==================== 事件监听 ====================
startBtn.addEventListener('click', handleStart);
pauseBtn.addEventListener('click', handlePause);
resetBtn.addEventListener('click', handleReset);
musicSelect.addEventListener('change', updateTheme);

// ==================== 辅助功能 ====================
async function setupOffscreen() {
  try {
    if (!await chrome.offscreen.hasDocument()) {
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

async function updateUIState() {
  await fetchAndUpdateState();
  chrome.runtime.sendMessage({ type: "SYNC_STATE" });
}

// ==================== 应用初始化 ====================
initializeApp();