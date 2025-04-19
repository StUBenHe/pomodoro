// offscreen.js
let bgm = new Audio();
bgm.loop = true;
let currentMusic = null; 

chrome.runtime.onMessage.addListener((message) => {
  // 添加调试日志
  console.log('[Offscreen] Received message:', message);
  
  if (message.target !== 'offscreen') return;

  switch (message.action) { // 注意改为 action 字段
    case 'play':
      const musicURL = chrome.runtime.getURL(message.music);
      if (currentMusic !== musicURL) { // 仅当音乐变化时更新
        bgm.src = musicURL;
        currentMusic = musicURL;
      }
      bgm.src = chrome.runtime.getURL(message.music);
      bgm.play()
        .then(() => console.log('Playback started'))
        .catch(err => console.error('Playback failed:', err));
      break;
      
    case 'pause':
      bgm.pause();
      console.log('Playback paused');
      break;
      
    case 'stop':
      bgm.pause();
      bgm.currentTime = 0;
      bgm.src = ""; // 清除音频源
      currentMusic = null; // 清除记录
      console.log('Playback stopped');
      break;
  }
});