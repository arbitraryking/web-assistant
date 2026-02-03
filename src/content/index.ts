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

// Inject styles for the floating button
function injectFloatingButtonStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .llm-assistant-ask-button {
      position: absolute;
      z-index: 999998;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      animation: llm-ask-button-fade-in 0.2s ease;
    }

    .llm-assistant-ask-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
    }

    .llm-assistant-ask-button:active {
      transform: translateY(0);
    }

    .ask-button-icon {
      font-size: 16px;
      line-height: 1;
    }

    .ask-button-text {
      font-size: 13px;
      font-weight: 500;
    }

    @keyframes llm-ask-button-fade-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(styleElement);
}

// Inject styles immediately
injectFloatingButtonStyles();

// Text selection feature
class TextSelectionHandler {
  private floatingButton: HTMLElement | null = null;
  private hideTimeout: number | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for text selection changes
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));

    // Listen for clicks outside to hide button
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
  }

  private handleMouseUp() {
    // Small delay to let selection complete
    setTimeout(() => {
      this.showFloatingButtonIfNeeded();
    }, 100);
  }

  private handleSelectionChange() {
    this.showFloatingButtonIfNeeded();
  }

  private handleMouseDown(e: MouseEvent) {
    // Hide button if clicking outside of it
    if (this.floatingButton && !this.floatingButton.contains(e.target as Node)) {
      this.hideFloatingButton();
    }
  }

  private getSelectedText(): string {
    const selection = window.getSelection();
    return selection?.toString().trim() || '';
  }

  private showFloatingButtonIfNeeded() {
    const selectedText = this.getSelectedText();

    // Hide button if no selection or too short
    if (!selectedText || selectedText.length < 5) {
      this.hideFloatingButton();
      return;
    }

    // Don't show in input/textarea elements
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       (activeElement as HTMLElement).isContentEditable)
    ) {
      return;
    }

    this.showFloatingButton(selectedText);
  }

  private showFloatingButton(selectedText: string) {
    // Remove existing button
    this.hideFloatingButton();

    // Create floating button
    const button = document.createElement('div');
    button.className = 'llm-assistant-ask-button';
    button.innerHTML = `
      <span class="ask-button-icon">💬</span>
      <span class="ask-button-text">Ask about this</span>
    `;

    // Position button near selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      button.style.position = 'absolute';
      button.style.top = `${rect.top + window.scrollY - 45}px`;
      button.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 80}px`;
    }

    // Click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.sendSelectedTextToChat(selectedText);
      this.hideFloatingButton();
    });

    document.body.appendChild(button);
    this.floatingButton = button;

    // Auto-hide after 10 seconds
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = window.setTimeout(() => {
      this.hideFloatingButton();
    }, 10000);
  }

  private hideFloatingButton() {
    if (this.floatingButton) {
      this.floatingButton.remove();
      this.floatingButton = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private sendSelectedTextToChat(text: string) {
    chrome.runtime.sendMessage({
      type: MessageType.ADD_SELECTED_TEXT,
      data: {
        text,
        url: window.location.href,
        pageTitle: document.title
      },
      timestamp: Date.now()
    });
  }
}

// Initialize text selection handler after a short delay
// to ensure page is ready
setTimeout(() => {
  new TextSelectionHandler();
}, 1000);
