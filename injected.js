(function() {
  try {
    if (window.__yt_shorts_filter_installed__) return;
    window.__yt_shorts_filter_installed__ = true;
    console.log('[YSF-injected] Installing history/navigation interceptor');

    // Add a flag to control whether the interceptor is active
    window.__yt_shorts_filter_enabled__ = true;

    // Listen for toggle messages from content script to enable/disable behavior
    window.addEventListener('message', function(event) {
      try {
        const data = event && event.data;
        if (data && data.type === 'YSF_TOGGLE') {
          window.__yt_shorts_filter_enabled__ = !!data.enabled;
          console.log('[YSF-injected] toggle', window.__yt_shorts_filter_enabled__);
        }
      } catch {}
    }, true);

    const toWatch = (url) => {
      // Check if the filter is enabled
      if (!window.__yt_shorts_filter_enabled__) return null;

      try {
        const u = new URL(url, location.origin);
        if (u.pathname.startsWith('/shorts/')) {
          const id = u.pathname.split('/shorts/')[1].split('/')[0];
          u.pathname = '/watch';
          u.searchParams.set('v', id);
          console.log('[YSF-injected] toWatch redirect', { from: url, id, to: u.toString() });
          return u.toString();
        }
      } catch {}
      return null;
    };

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function(state, title, url) {
      // Check if the filter is enabled
      if (window.__yt_shorts_filter_enabled__) {
        const fixed = toWatch(url);
        if (fixed) {
          console.log('[YSF-injected] history.pushState redirected');
          return origReplace.call(this, state, title, fixed);
        }
      }
      return origPush.apply(this, arguments);
    };
    history.replaceState = function(state, title, url) {
      // Check if the filter is enabled
      if (window.__yt_shorts_filter_enabled__) {
        const fixed = toWatch(url);
        if (fixed) {
          console.log('[YSF-injected] history.replaceState redirected');
          return origReplace.call(this, state, title, fixed);
        }
      }
      return origReplace.apply(this, arguments);
    };

    window.addEventListener('popstate', function() {
      if (!window.__yt_shorts_filter_enabled__) return;
      const fixed = toWatch(location.href);
      if (fixed) {
        console.log('[YSF-injected] popstate redirected');
        location.replace(fixed);
      }
    }, true);

    // Intercept Navigation API if available
    try {
      if ('navigation' in window && navigation.addEventListener) {
        navigation.addEventListener('navigate', (e) => {
          // Check if the filter is enabled
          if (!window.__yt_shorts_filter_enabled__) return;
          
          try {
            const dest = e && e.destination && e.destination.url ? new URL(e.destination.url) : null;
            if (dest && dest.pathname.startsWith('/shorts/')) {
              const id = dest.pathname.split('/')[2];
              dest.pathname = '/watch';
              dest.searchParams.set('v', id);
              const targetUrl = dest.toString();
              if (e.canIntercept) {
                console.log('[YSF-injected] Navigation API intercepted', targetUrl);
                e.intercept({ handler: () => location.replace(targetUrl) });
              } else {
                console.log('[YSF-injected] Navigation API redirect (no intercept)', targetUrl);
                location.replace(targetUrl);
              }
            }
          } catch {}
        }, { capture: true });
      }
    } catch {}

    // YouTube SPA custom events
    window.addEventListener('yt-navigate-start', function() {
      // Check if the filter is enabled
      if (!window.__yt_shorts_filter_enabled__) return;
      
      const fixed = toWatch(location.href);
      if (fixed) {
        console.log('[YSF-injected] yt-navigate-start redirected');
        location.replace(fixed);
      }
    }, true);
    window.addEventListener('yt-navigate-finish', function() {
      // Check if the filter is enabled
      if (!window.__yt_shorts_filter_enabled__) return;
      
      const fixed = toWatch(location.href);
      if (fixed) {
        console.log('[YSF-injected] yt-navigate-finish redirected');
        location.replace(fixed);
      }
    }, true);

    // Fallback periodic check
    setInterval(() => {
      // Check if the filter is enabled
      if (!window.__yt_shorts_filter_enabled__) return;
      
      const fixed = toWatch(location.href);
      if (fixed) {
        console.log('[YSF-injected] interval redirected');
        location.replace(fixed);
      }
    }, 500);
  } catch (err) {
    console.warn('[YSF-injected] failed to install interceptor', err);
  }
})();


