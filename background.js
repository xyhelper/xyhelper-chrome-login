console.log('Background script loaded');
// 兼容 Firefox 与 Chrome 的 API 命名
if (typeof chrome === 'undefined' && typeof browser !== 'undefined') {
    var chrome = browser;
}

// 在响应阶段检查重定向的 Location，并在支持的环境中阻断到 app scheme 的跳转
(function registerInterceptor() {
    const manifest = (chrome && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest() : { manifest_version: 3 };
    const supportBlocking = Number(manifest.manifest_version) === 2; // MV2 可阻断；MV3 Chrome 不支持阻断 webRequest

    function handler(details) {
        try {
            const headers = details.responseHeaders || [];
            const locationHeader = headers.find(h => h.name && h.name.toLowerCase() === 'location');
            const redirect = locationHeader && locationHeader.value ? locationHeader.value : '';
            if (redirect.startsWith('com.openai.chat://auth0.openai.com/ios/com.openai.chat/callback?')) {
                const code = new URL(redirect).searchParams.get('code');
                console.log('Intercept redirect -> app scheme, code:', code);
                chrome.storage.local.set({ location: redirect }, function () {
                    if (details.tabId >= 0) {
                        chrome.tabs.update(details.tabId, { url: 'popup.html' });
                    }
                });
                if (supportBlocking) {
                    return { cancel: true };
                }
            }
        } catch (e) {
            console.warn('onHeadersReceived handler error:', e);
        }
    }

    const urls = [
        "https://auth0.openai.com/*",
        "https://auth.openai.com/*"
    ];
    const extra = ["responseHeaders"];
    if (supportBlocking) extra.push("blocking");
    try {
        chrome.webRequest.onHeadersReceived.addListener(handler, { urls }, extra);
    } catch (e) {
        console.warn('Failed to register webRequest listener:', e);
    }
})();

// 监听来自 Content Script 的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'VALIDATE_SUCCESS') {
        processValidateData(request.data);
    }
});

// 监听 Storage 变化 (应对 sendMessage 因页面跳转失败的情况)
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace !== 'local') return;

    // 只要 validateData 或 validateDataTime 发生变化，就尝试读取最新数据
    if (changes.validateData || changes.validateDataTime) {
        // 为了确保拿到完整的数据，最好直接 get 一次，而不是只依赖 changes
        chrome.storage.local.get(['validateData', 'validateDataTime'], function(result) {
            processValidateData(result.validateData);
        });
    }
});

let isProcessing = false;

function processValidateData(data) {
    if (!data) return;
    if (isProcessing) return; //以此防止短时间内重复处理
    isProcessing = true;
    
    // 添加视觉反馈，在图标上显示 "OK"
    chrome.action.setBadgeText({ text: 'OK' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

    console.log('Intercepted VALIDATE_SUCCESS:', data);
    chrome.storage.local.set({ location: data }, function () {
            console.log('Validate data saved to storage.');
            
            // 获取当前活跃的标签页并跳转
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs.length > 0) {
                    chrome.tabs.update(tabs[0].id, { url: 'popup.html' });
                }
            });
    });


    // 3秒后清除 Badge 并重置锁
    setTimeout(() => {
         chrome.action.setBadgeText({ text: '' });
         isProcessing = false; // 3秒后允许再次处理
    }, 3000);


    
}
