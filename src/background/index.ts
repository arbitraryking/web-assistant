// Background service worker for LLM Chrome Extension
import { messageHandler } from './messageHandler';
import { BaseMessage } from '../shared/types/messages';

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

// Message listener - route all messages through the message handler
chrome.runtime.onMessage.addListener((message: BaseMessage, sender, sendResponse) => {
  console.log('Background received message:', message.type);

  // Use message handler to process the message
  const shouldKeepChannelOpen = messageHandler.handle(message, sender, sendResponse);

  // Return true if we need to keep the channel open for async response
  return shouldKeepChannelOpen;
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
