// Background service worker for LLM Chrome Extension
console.log('LLM Assistant: Background service worker loaded');

// Set up side panel on extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('LLM Assistant: Extension installed');
});

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Message listener (will be expanded later)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message);

  // Handle different message types
  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'PONG' });
      break;
    default:
      console.log('Unknown message type:', message.type);
  }

  return true; // Keep channel open for async response
});

// Keep service worker alive during streaming (prevent premature termination)
let keepAlive: number | null = null;

export function startKeepAlive() {
  if (keepAlive) return;
  keepAlive = setInterval(() => {
    console.log('Service worker keep-alive ping');
  }, 20000); // Ping every 20 seconds
}

export function stopKeepAlive() {
  if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
}
