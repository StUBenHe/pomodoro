// offscreen.js

// ==================== 音频播放器核心 ====================
let bgm = new Audio();
bgm.loop = true; // 启用循环播放
let currentMusic = null; // 当前播放的音乐路径

// ==================== 调试日志系统 ====================
const logger = {
  log: (message) => console.log(`[Offscreen][${new Date().toISOString()}] ${message}`),
  error: (message) => console.error(`[Offscreen][${new Date().toISOString()}] ${message}`)
};

// ==================== 音频控制函数 ====================
function handlePlay(musicPath) {
  const musicURL = chrome.runtime.getURL(musicPath);
  
  // 仅在需要时更新音源（优化性能）
  if (currentMusic !== musicURL) {
    bgm.src = musicURL;
    currentMusic = musicURL;
    logger.log(`Loading new audio source: ${musicURL}`);
  }

  bgm.play()
    .then(() => logger.log("Playback started successfully"))
    .catch(err => {
      logger.error(`Playback failed: ${err.message}`);
      // 重置播放状态避免卡死
      bgm.pause();
      bgm.currentTime = 0;
    });
}

function handlePause() {
  bgm.pause();
  logger.log("Playback paused");
}

function handleStop() {
  bgm.pause();
  bgm.currentTime = 0;
  bgm.src = "";
  currentMusic = null;
  logger.log("Playback fully stopped");
}

// ==================== 消息路由处理 ====================
chrome.runtime.onMessage.addListener((message) => {
  logger.log(`Received message: ${JSON.stringify(message)}`);
  
  // 过滤非目标消息
  if (message.target !== 'offscreen') return;

  switch (message.action) {
    case 'play':
      if (!message.music) {
        logger.error("Missing music parameter in play action");
        return;
      }
      handlePlay(message.music);
      break;
      
    case 'pause':
      handlePause();
      break;
      
    case 'stop':
      handleStop();
      break;

    default:
      logger.error(`Unknown action type: ${message.action}`);
  }
});

// ==================== 内存管理 ====================
// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  handleStop();
  logger.log("Offscreen document unloading...");
});