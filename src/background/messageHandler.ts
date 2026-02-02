// Message handler for routing messages between components
import {
  BaseMessage,
  MessageType,
  isChatMessage,
  isSummarizePage,
  isGetPageContent,
  ErrorInfo
} from '../shared/types/messages';

type MessageSender = chrome.runtime.MessageSender;
type SendResponse = (response?: any) => void;

export class MessageHandler {
  /**
   * Handle incoming messages and route them to appropriate handlers
   */
  async handle(
    message: BaseMessage,
    sender: MessageSender,
    sendResponse: SendResponse
  ): Promise<boolean> {
    console.log('MessageHandler: Received message', message.type, message);

    try {
      switch (message.type) {
        case MessageType.PING:
          sendResponse({ success: true, message: 'PONG from background' });
          return false; // Synchronous response

        case MessageType.CHAT_MESSAGE:
          if (isChatMessage(message)) {
            this.handleChatMessage(message, sendResponse);
            return true; // Async response
          }
          break;

        case MessageType.SUMMARIZE_PAGE:
          if (isSummarizePage(message)) {
            this.handleSummarizePage(message, sender, sendResponse);
            return true; // Async response
          }
          break;

        case MessageType.GET_PAGE_CONTENT:
          if (isGetPageContent(message)) {
            this.handleGetPageContent(sender, sendResponse);
            return true; // Async response
          }
          break;

        case MessageType.GET_SETTINGS:
          this.handleGetSettings(sendResponse);
          return true; // Async response

        case MessageType.SAVE_SETTINGS:
          this.handleSaveSettings(message.data, sendResponse);
          return true; // Async response

        case MessageType.CONTENT_SCRIPT_READY:
          console.log('Content script ready on:', message.data?.url || 'unknown URL');
          sendResponse({ success: true });
          return false;

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({
            success: false,
            error: 'Unknown message type'
          });
          return false;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      const errorInfo: ErrorInfo = {
        type: 'MESSAGE_HANDLER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        timestamp: Date.now()
      };
      sendResponse({ success: false, error: errorInfo });
      return false;
    }

    return false;
  }

  /**
   * Handle chat messages (will be implemented with LLM integration)
   */
  private async handleChatMessage(
    message: any,
    sendResponse: SendResponse
  ): Promise<void> {
    console.log('TODO: Handle chat message', message);
    // This will be implemented in Step 5 (LLM Integration)
    sendResponse({
      success: true,
      message: 'Chat functionality will be implemented in Step 5'
    });
  }

  /**
   * Handle page summarization requests
   */
  private async handleSummarizePage(
    message: any,
    _sender: MessageSender,
    sendResponse: SendResponse
  ): Promise<void> {
    console.log('TODO: Handle summarize page', message);

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Request page content from content script
      // This will be fully implemented in Step 9 (Summarization Workflow)
      sendResponse({
        success: true,
        message: 'Summarization will be implemented in Step 9'
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle get page content requests
   */
  private async handleGetPageContent(
    _sender: MessageSender,
    sendResponse: SendResponse
  ): Promise<void> {
    console.log('TODO: Handle get page content');
    // This will be implemented in Step 7 (Content Extraction)
    sendResponse({
      success: true,
      message: 'Content extraction will be implemented in Step 7'
    });
  }

  /**
   * Handle get settings requests
   */
  private async handleGetSettings(sendResponse: SendResponse): Promise<void> {
    console.log('TODO: Handle get settings');
    // This will be implemented in Step 4 (Settings System)
    sendResponse({
      success: true,
      message: 'Settings retrieval will be implemented in Step 4'
    });
  }

  /**
   * Handle save settings requests
   */
  private async handleSaveSettings(
    settings: any,
    sendResponse: SendResponse
  ): Promise<void> {
    console.log('TODO: Handle save settings', settings);
    // This will be implemented in Step 4 (Settings System)
    sendResponse({
      success: true,
      message: 'Settings saving will be implemented in Step 4'
    });
  }

  /**
   * Send message to content script in a specific tab
   */
  async sendToContentScript(
    tabId: number,
    message: BaseMessage
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send message to side panel (via runtime)
   */
  sendToSidePanel(message: BaseMessage): void {
    chrome.runtime.sendMessage(message);
  }
}

// Export singleton instance
export const messageHandler = new MessageHandler();
