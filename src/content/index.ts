// Content script for LLM Chrome Extension
console.log('LLM Assistant: Content script loaded on', window.location.href);

// Message listener (will be expanded later)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);

  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'PONG from content script' });
      break;
    case 'GET_PAGE_URL':
      sendResponse({
        success: true,
        url: window.location.href,
        title: document.title
      });
      break;
    default:
      console.log('Unknown message type:', message.type);
  }

  return true; // Keep channel open for async response
});

// Notify background that content script is ready
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_READY',
  url: window.location.href
});
