(function() {
    console.log('[XYHelper] Hooking fetch...');
    const originalFetch = window.fetch;

    window.fetch = async function(...args) {
        let response;
        try {
            response = await originalFetch.apply(window, args);
        } catch (error) {
            // 只有当不是监控类请求的错误时才打印，避免刷屏
            const url = args[0] ? (typeof args[0] === 'string' ? args[0] : args[0].url) : '';
            if (url && !url.includes('datadog') && !url.includes('sentry') && !url.includes('browser-intake')) {
                console.warn('[XYHelper] Fetch error:', error);
            }
            throw error;
        }

        const clone = response.clone();
        const url = clone.url;
        
        const shouldCaptureContinueUrl = url && (
            url.includes('/api/accounts/email-otp/validate') ||
            url.includes('/api/accounts/mfa/verify')
        );

        if (shouldCaptureContinueUrl) {
            clone.json().then(data => {
                // 只提取 continue_url
                if (data && data.continue_url) {
                    console.log('[XYHelper] Intercepted continue_url:', data.continue_url);
                    window.postMessage({
                        type: 'XYHELPER_FETCH_VALIDATE_SUCCESS',
                        payload: data.continue_url
                    }, '*');
                }
            }).catch(err => console.error('[XYHelper] Error parsing response:', err));
        }

        return response;
    };
})();
