// 注入脚本到页面执行环境
const s = document.createElement('script');
s.src = chrome.runtime.getURL('scripts/injected_script.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

// 监听来自页面脚本的消息并转发给 Background
window.addEventListener("message", function(event) {
  // 确保只处理预期的消息源和类型
  if (event.source !== window || !event.data || event.data.type !== 'XYHELPER_FETCH_VALIDATE_SUCCESS') {
    return;
  }

  console.log('[ContentScript] Forwarding validated data:', event.data.payload);
  
  // 直接写入 storage，避免因页面跳转导致 sendMessage 失败
  chrome.storage.local.set({ 
      validateData: event.data.payload,
      validateDataTime: Date.now()
  }, () => {
      console.log('[ContentScript] Data saved to storage directly.');
      // 仍然尝试发送消息，以防 background 需要实时处理
      chrome.runtime.sendMessage({
        type: 'VALIDATE_SUCCESS',
        data: event.data.payload
      }).catch(err => {
          // 页面跳转时这很常见，忽略
          // console.error('[ContentScript] Failed to send message:', err);
      });
  });
});
