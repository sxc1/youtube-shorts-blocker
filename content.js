// Global state to avoid stacking observers/listeners when mode changes
let currentMode = null;
let hideObserver = null;

// --- Initial Load ---
chrome.storage.sync.get(['mode'], ({ mode }) => {
  applyMode(mode || 'normal');
});

// --- React to Popup Changes ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.mode) {
    applyMode(message.mode);
  }
});

// --- Apply Mode ---
function applyMode(mode) {
  if (mode === currentMode) return;

  currentMode = mode;
  // Clean up any existing observers
  if (hideObserver) {
    hideObserver.disconnect();
    hideObserver = null;
  }
  
  // Control the injected script behavior (communicate with page context)
  try {
    window.postMessage({ type: 'YSF_TOGGLE', enabled: (mode === 'normal') }, '*');
  } catch {}

  if (mode === 'hide') {
    enableHideMode();
  } else if (mode === 'normal') {
    enableNormalMode();
  }
  // else mode is 'disabled', do nothing
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

// --- MODE: Hide Shorts from Recommendations (verified working)
function hideShortsElements() {
  document.querySelectorAll('ytd-rich-section-renderer, ytd-reel-shelf-renderer').forEach(el => {
    el.remove();
  });
  
}

function enableNormalMode() {
  installHistoryInterceptor();
  const start = () => {
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


function ensureBodyReady(callback) {
  if (document.body) {
    callback();
    return;
  }
  window.addEventListener('DOMContentLoaded', () => callback(), { once: true });
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

// This actually doesn't work, see injected.js for the actual solution
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