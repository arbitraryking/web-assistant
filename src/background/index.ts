// Background service worker for LLM Chrome Extension
import { messageHandler } from './messageHandler';
import { BaseMessage } from '../shared/types/messages';
import { llmService } from './llmService';
import { openaiProvider } from './openaiProvider';
import { anthropicProvider } from './anthropicProvider';
import { customProvider } from './customProvider';

console.log('PagePilot: Background service worker loaded');

// Register LLM providers
llmService.registerProvider(openaiProvider);
llmService.registerProvider(anthropicProvider);
llmService.registerProvider(customProvider);

// Set up side panel on extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('PagePilot: Extension installed');

  // Register context menu for text selection
  chrome.contextMenus.create({
    id: 'ask-ai',
    title: 'Ask AI about this',
    contexts: ['selection']
  });
});

// Handle context menu clicks - this is a legitimate user gesture
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ask-ai' && tab?.id) {
    // Open side panel FIRST (must be synchronous with user gesture)
    await chrome.sidePanel.open({ tabId: tab.id });

    // Store selected text AFTER opening panel (no await to not block)
    if (info.selectionText) {
      chrome.storage.session.set({
        selectedText: info.selectionText,
        selectedTextUrl: tab.url,
        selectedTextTitle: tab.title,
        pendingTextTransfer: true // Flag to indicate pending transfer
      }).catch(err => console.error('Failed to store selected text:', err));

      // Also send message as backup in case side panel is already open
      chrome.runtime.sendMessage({
        type: 'SELECTED_TEXT_FROM_MENU',
        data: {
          text: info.selectionText,
          url: tab.url,
          pageTitle: tab.title
        },
        timestamp: Date.now()
      });
    }
  }
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
