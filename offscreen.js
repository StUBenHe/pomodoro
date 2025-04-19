// offscreen.js
let bgm = new Audio();
bgm.loop = true;

chrome.runtime.onMessage.addListener((message) => {
  // 添加调试日志
  console.log('[Offscreen] Received message:', message);
  
  if (message.target !== 'offscreen') return;

  switch (message.action) { // 注意改为 action 字段
    case 'play':
      bgm.src = chrome.runtime.getURL(message.music);
      bgm.play()
        .then(() => console.log('Playback started'))
        .catch(err => console.error('Playback failed:', err));
      break;
      
    case 'pause':
      bgm.pause();
      break;
      
    case 'stop':
      bgm.pause();
      bgm.currentTime = 0;
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = ""; // 释放音频资源
        audioElement = null;  // 清除引用
      }
      break;
  }
});