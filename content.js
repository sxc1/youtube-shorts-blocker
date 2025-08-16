 

// Global state to avoid stacking observers/listeners when mode changes
let currentMode = null;
let linkObserver = null;
let hideObserver = null;

function ensureBodyReady(callback) {
  if (document.body) {
    callback();
    return;
  }
  window.addEventListener('DOMContentLoaded', () => callback(), { once: true });
}

function handleNavigateEvent(e) {
  // Allow keyboard Enter
  if (e.type === 'keydown' && e.key !== 'Enter') return;

  const path = e.composedPath ? e.composedPath() : [e.target];
  // Find any element that has an href pointing to /shorts/
  const link = path.find(el => el && typeof el.href === 'string' && el.href.includes('/shorts/'));
  if (!link) return;

  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();

  // Robust ID extraction and URL build
  let watchUrl = null;
  try {
    const u = new URL(link.href, location.origin);
    const id = u.pathname.split('/shorts/')[1]?.split('/')[0];
    if (id) {
      const out = new URL('https://www.youtube.com/watch');
      out.searchParams.set('v', id);
      watchUrl = out.toString();
    }
  } catch {}
  if (!watchUrl) {
    console.warn('[YSF] could not build watch URL from', link && link.href);
    return;
  }

  const newTab = e.type === 'auxclick' || e.ctrlKey || e.metaKey || (e.type === 'keydown' && (e.ctrlKey || e.metaKey));
  if (newTab) {
    window.open(watchUrl, '_blank', 'noopener');
  } else {
    // replace avoids adding the shorts URL to history
    window.location.replace(watchUrl);
  }
}

const navigationEventTypes = ['pointerdown','mousedown','touchstart','pointerup','mouseup','touchend','click','auxclick','keydown'];
let navigateInterceptorsActive = false;

function addPageNavigateInterceptors() {
  if (navigateInterceptorsActive) return;
  navigationEventTypes.forEach(type => {
    document.addEventListener(type, handleNavigateEvent, true); // capture=true
  });
  navigateInterceptorsActive = true;
}

function removePageNavigateInterceptors() {
  if (!navigateInterceptorsActive) return;
  navigationEventTypes.forEach(type => {
    document.removeEventListener(type, handleNavigateEvent, true);
  });
  navigateInterceptorsActive = false;
}

function installHistoryInterceptor() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.type = 'text/javascript';
    script.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {
    console.warn('[YSF] failed to inject page script', err);
  }
}

function convertShortsLinks() {
  const anchors = document.querySelectorAll('a[href*="/shorts/"]');
  let converted = 0;
  anchors.forEach(link => {
    try {
      const u = new URL(link.href, location.origin);
      const id = u.pathname.split('/shorts/')[1]?.split('/')[0];
      if (!id) return;
      const out = new URL('https://www.youtube.com/watch');
      out.search = '';
      out.searchParams.set('v', id);
      link.href = out.toString();
      converted++;
    } catch {}
  });
  
}

function enableNormalMode() {
  installHistoryInterceptor();
  const start = () => {
    // Ensure page-level navigation interceptors are active in Normal mode only
    addPageNavigateInterceptors();
    convertShortsLinks();
    if (linkObserver) linkObserver.disconnect();
    linkObserver = new MutationObserver(() => {
      convertShortsLinks();
    });
    linkObserver.observe(document.body, { childList: true, subtree: true });

    // Also redirect if current URL is already a Shorts URL
    try {
      const u = new URL(location.href);
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2];
        const out = new URL('https://www.youtube.com/watch');
        out.searchParams.set('v', id);
        location.replace(out.toString());
      }
    } catch {}
  };
  ensureBodyReady(start);
}

// --- MODE: Hide Shorts from Recommendations (verified working)
function hideShortsElements() {
  document.querySelectorAll('ytd-rich-section-renderer, ytd-reel-shelf-renderer').forEach(el => {
    el.remove();
  });
  
}

function enableHideMode() {
  const start = () => {
    hideShortsElements();
    if (hideObserver) hideObserver.disconnect();
    hideObserver = new MutationObserver(() => {
      hideShortsElements();
    });
    hideObserver.observe(document.body, { childList: true, subtree: true });
  };
  ensureBodyReady(start);
}

// --- Apply Mode ---
function applyMode(mode) {
  if (mode === currentMode) return;

  currentMode = mode;
  // Clean up any existing observers
  if (linkObserver) {
    linkObserver.disconnect();
    linkObserver = null;
  }
  if (hideObserver) {
    hideObserver.disconnect();
    hideObserver = null;
  }
  // Remove page-level navigation interceptors unless Normal mode re-enables them
  removePageNavigateInterceptors();
  
  // Control the injected script behavior (communicate with page context)
  try {
    window.postMessage({ type: 'YSF_TOGGLE', enabled: (mode === 'normal') }, '*');
  } catch {}

  if (mode === 'hide') {
    enableHideMode();
  } else if (mode === 'normal') {
    enableNormalMode();
  }
  // else mode = 'disabled', do nothing
}

// --- React to Popup Changes ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.mode) {
    applyMode(message.mode);
  }
});

// --- Initial Load ---
chrome.storage.sync.get(['mode'], ({ mode }) => {
  applyMode(mode || 'normal');
});
