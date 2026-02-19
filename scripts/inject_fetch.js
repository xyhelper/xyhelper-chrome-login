(function() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        try {
            const url = response.url;
            if (url.includes('api/accounts/email-otp/validate')) {
                const clone = response.clone();
                clone.json().then(data => {
                    console.log('Detected validate response:', data);
                    // 发送给 background
                    chrome.runtime.sendMessage({
                        type: 'FETCH_VALIDATE_SUCCESS',
                        data: data
                    });
                }).catch(err => {
                    console.error('Failed to parse validate response:', err);
                });
            }
        } catch (e) {
            console.error('Error in fetch interceptor:', e);
        }

        return response;
    };
})();
