(function() {
  try {
    if (window.__yt_shorts_filter_installed__) return;
    window.__yt_shorts_filter_installed__ = true;

    // Add a flag to control whether the interceptor is active
    window.__yt_shorts_filter_enabled__ = true;

    // Listen for toggle messages from content script to enable/disable behavior
    window.addEventListener('message', function(event) {
      try {
        const data = event && event.data;
        if (data && data.type === 'YSF_TOGGLE') {
          window.__yt_shorts_filter_enabled__ = !!data.enabled;
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
          return u.toString();
        }
      } catch {}
      return null;
    };

    // Initial check on load
    try {
      const initial = toWatch(location.href);
      if (initial) {
        location.replace(initial);
      }
    } catch {}

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function(state, title, url) {
      // Check if the filter is enabled
      if (window.__yt_shorts_filter_enabled__) {
        const fixed = toWatch(url);
        if (fixed) {
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
          return origReplace.call(this, state, title, fixed);
        }
      }
      return origReplace.apply(this, arguments);
    };

    window.addEventListener('popstate', function() {
      if (!window.__yt_shorts_filter_enabled__) return;
      const fixed = toWatch(location.href);
      if (fixed) {
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
                e.intercept({ handler: () => location.replace(targetUrl) });
              } else {
                location.replace(targetUrl);
              }
            }
          } catch {}
        }, { capture: true });
      }
    } catch {}
  } catch (err) {
    console.warn('[YSF-injected] failed to install interceptor', err);
  }
})();


