// Content script for LLM Chrome Extension
import { MessageType } from '../shared/types/messages';
import { extractPageContent, extractHeadingsStructure } from './contentExtractor';

console.log('LLM Assistant: Content script loaded on', window.location.href);

// Message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);

  switch (message.type) {
    case MessageType.PING:
      sendResponse({ success: true, message: 'PONG from content script' });
      break;

    case MessageType.GET_PAGE_CONTENT:
      try {
        const content = extractPageContent();
        const headings = extractHeadingsStructure();

        if (!content) {
          sendResponse({
            success: false,
            error: 'Failed to extract page content'
          });
          break;
        }

        sendResponse({
          success: true,
          data: {
            content,
            headings
          }
        });
      } catch (error: any) {
        console.error('Error extracting page content:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to extract page content'
        });
      }
      break;

    case MessageType.HIGHLIGHT_CONTENT:
      // Will be implemented in Step 8
      console.log('TODO: Handle highlight content');
      sendResponse({ success: true, message: 'Highlighting will be implemented in Step 8' });
      break;

    case MessageType.CLEAR_HIGHLIGHTS:
      // Will be implemented in Step 8
      console.log('TODO: Handle clear highlights');
      sendResponse({ success: true, message: 'Clear highlights will be implemented in Step 8' });
      break;

    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Keep channel open for async response
});

// Notify background that content script is ready
chrome.runtime.sendMessage({
  type: MessageType.CONTENT_SCRIPT_READY,
  url: window.location.href,
  timestamp: Date.now()
});
