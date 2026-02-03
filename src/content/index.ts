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
      (async () => {
        try {
          const instructions: HighlightInstruction[] = message.data?.instructions || [];
          const results = await highlighter.highlight(instructions);

          // Send results back for side panel to display
          sendResponse({
            success: true,
            data: { results }
          });

          // Also notify side panel that highlights are ready
          chrome.runtime.sendMessage({
            type: MessageType.HIGHLIGHTS_READY,
            data: { highlights: results },
            timestamp: Date.now()
          });
        } catch (error: any) {
          console.error('Error highlighting content:', error);
          sendResponse({
            success: false,
            error: error.message || 'Failed to highlight content'
          });
        }
      })();
      return true; // Async response

    case MessageType.SCROLL_TO_HIGHLIGHT:
      (async () => {
        try {
          const { highlightId, animate = true } = message.data || {};
          const success = await highlighter.scrollToHighlight(highlightId, animate);
          sendResponse({ success });
        } catch (error: any) {
          console.error('Error scrolling to highlight:', error);
          sendResponse({
            success: false,
            error: error.message || 'Failed to scroll to highlight'
          });
        }
      })();
      return true; // Async response

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
