// Content script for LLM Chrome Extension
import { MessageType, HighlightInstruction } from '../shared/types/messages';
import { extractPageContent, extractHeadingsStructure } from './contentExtractor';
import { highlighter } from './highlighter';

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
      try {
        const instructions: HighlightInstruction[] = message.data?.instructions || [];
        highlighter.highlight(instructions);
        sendResponse({ success: true });
      } catch (error: any) {
        console.error('Error highlighting content:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to highlight content'
        });
      }
      break;

    case MessageType.CLEAR_HIGHLIGHTS:
      try {
        highlighter.clearHighlights();
        sendResponse({ success: true });
      } catch (error: any) {
        console.error('Error clearing highlights:', error);
        sendResponse({
          success: false,
          error: error.message || 'Failed to clear highlights'
        });
      }
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
