console.log("[YouTube Shorts Filter] content.js loaded");

// --- MODE: Convert Shorts to Normal Videos ---
// TODO: This is not working as expected.
function interceptShortsClicks() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="/shorts/"]');
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      const videoId = link.href.split('/shorts/')[1].split('?')[0];
      console.log(`[Shorts Filter] Redirecting /shorts/${videoId} → /watch?v=${videoId}`);
      window.location.href = `/watch?v=${videoId}`;
    }
  }, true);
}

function convertShortsLinks() {
  document.querySelectorAll('a[href*="/shorts/"]').forEach(link => {
    const videoId = link.href.split('/shorts/')[1].split('?')[0];
    link.href = `/watch?v=${videoId}`;
    console.log(`[Shorts Filter] Rewrote link to: ${link.href}`);
  });
}

function enableNormalMode() {
  convertShortsLinks();
  interceptShortsClicks();

  const observer = new MutationObserver(() => {
    convertShortsLinks();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// --- MODE: Hide Shorts from Recommendations (verified working)
function hideShortsElements() {
  document.querySelectorAll('ytd-rich-section-renderer, ytd-reel-shelf-renderer').forEach(el => {
    el.remove();
  });
  console.log("[Shorts Filter] Removed Shorts elements");
}

function enableHideMode() {
  hideShortsElements();
  const observer = new MutationObserver(() => {
    hideShortsElements();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// --- Apply Mode ---
function applyMode(mode) {
  console.log(`[YouTube Shorts Filter] Applying mode: ${mode}`);
  if (mode === 'hide') {
    enableHideMode();
  } else if (mode === 'normal') {
    enableNormalMode();
  }
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
