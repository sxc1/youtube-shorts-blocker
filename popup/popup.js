document.addEventListener('DOMContentLoaded', () => {
  const radios = document.querySelectorAll('input[name="mode"]');

  // Load saved setting
  chrome.storage.sync.get(['mode'], ({ mode }) => {
    if (mode) {
      document.querySelector(`input[value="${mode}"]`).checked = true;
    }
  });

  // Save setting when changed
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      const mode = document.querySelector('input[name="mode"]:checked').value;
      chrome.storage.sync.set({ mode }, () => {
        // Send message to content script to apply changes immediately
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          chrome.tabs.sendMessage(tabs[0].id, { mode });
        });
      });
    });
  });
});
