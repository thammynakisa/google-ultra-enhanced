/* G1 Ultra $0 Pro v3 — Background Service Worker */
chrome.runtime.onInstalled.addListener(() => {
  console.log("[G1 Ultra $0 Pro v3] Ready — 8-Method Activation Engine");
});

// Handle messages from content script & popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  if (msg.action === "OPEN_ALT_METHOD" && msg.url) {
    chrome.tabs.create({ url: msg.url, active: true }, (tab) => {
      sendResponse({ ok: true, tabId: tab ? tab.id : null });
    });
    return true; // async
  }

  if (msg.action === "OPEN_URL" && msg.url) {
    chrome.tabs.create({ url: msg.url, active: true });
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === "GET_CURRENT_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs && tabs[0] });
    });
    return true;
  }
});
