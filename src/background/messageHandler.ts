// Message handler for routing messages between components
import {
  BaseMessage,
  MessageType,
  isChatMessage,
  isSummarizePage,
  isGetPageContent,
  ErrorInfo
} from '../shared/types/messages';
import { storageService } from './storageService';
import { Settings } from '../shared/types/settings';
import { llmService } from './llmService';
import { startKeepAlive, stopKeepAlive } from './index';

type MessageSender = chrome.runtime.MessageSender;
type SendResponse = (response?: any) => void;

export class MessageHandler {
  /**
   * Handle incoming messages and route them to appropriate handlers
   */
  handle(
    message: BaseMessage,
    sender: MessageSender,
    sendResponse: SendResponse
  ): boolean {
    console.log('MessageHandler: Received message', message.type, message);

    try {
      switch (message.type) {
        case MessageType.PING:
          sendResponse({ success: true, message: 'PONG from background' });
          return false; // Synchronous response

        case MessageType.CHAT_MESSAGE:
          if (isChatMessage(message)) {
            this.handleChatMessage(message, sendResponse).catch((err) => {
              console.error('Error in handleChatMessage:', err);
              sendResponse({
                success: false,
                error: err.message || 'Failed to handle chat message'
              });
            });
            return true; // Async response
          }
          break;

        case MessageType.SUMMARIZE_PAGE:
          if (isSummarizePage(message)) {
            this.handleSummarizePage(message, sender, sendResponse).catch((err) => {
              console.error('Error in handleSummarizePage:', err);
              sendResponse({
                success: false,
                error: err.message || 'Failed to summarize page'
              });
            });
            return true; // Async response
          }
          break;

        case MessageType.GET_PAGE_CONTENT:
          if (isGetPageContent(message)) {
            this.handleGetPageContent(sender, sendResponse).catch((err) => {
              console.error('Error in handleGetPageContent:', err);
              sendResponse({
                success: false,
                error: err.message || 'Failed to get page content'
              });
            });
            return true; // Async response
          }
          break;

        case MessageType.GET_SETTINGS:
          this.handleGetSettings(sendResponse).catch((err) => {
            console.error('Error in handleGetSettings:', err);
            sendResponse({
              success: false,
              error: err.message || 'Failed to get settings'
            });
          });
          return true; // Async response

        case MessageType.SAVE_SETTINGS:
          this.handleSaveSettings(message.data, sendResponse).catch((err) => {
            console.error('Error in handleSaveSettings:', err);
            sendResponse({
              success: false,
              error: err.message || 'Failed to save settings'
            });
          });
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
   * Handle chat messages with streaming
   */
  private async handleChatMessage(
    message: any,
    sendResponse: SendResponse
  ): Promise<void> {
    const { messages } = message.data;

    try {
      // Get settings
      const settings = await storageService.getSettings();

      // Validate settings
      const validation = storageService.validateSettings(settings);
      if (!validation.valid) {
        sendResponse({
          success: false,
          error: validation.errors.join(', ')
        });
        return;
      }

      // Start keep-alive to prevent service worker from terminating
      startKeepAlive();

      // Send initial response to acknowledge request
      sendResponse({
        success: true,
        streaming: true,
        message: 'Starting chat stream'
      });

      // Stream response chunks back to side panel
      const messageId = `msg_${Date.now()}`;

      try {
        for await (const chunk of llmService.chat(settings, messages)) {
          // Send each chunk to side panel
          chrome.runtime.sendMessage({
            type: MessageType.STREAM_CHUNK,
            data: {
              chunk,
              messageId
            },
            timestamp: Date.now()
          });
        }

        // Send completion message
        chrome.runtime.sendMessage({
          type: MessageType.STREAM_COMPLETE,
          data: { messageId },
          timestamp: Date.now()
        });
      } catch (streamError: any) {
        // Send error to side panel
        chrome.runtime.sendMessage({
          type: MessageType.ERROR,
          data: {
            type: 'STREAM_ERROR',
            message: streamError.message || 'Streaming failed',
            timestamp: Date.now()
          },
          timestamp: Date.now()
        });
      } finally {
        // Stop keep-alive
        stopKeepAlive();
      }
    } catch (error: any) {
      console.error('Error handling chat message:', error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to process chat message'
      });
      stopKeepAlive();
    }
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
    try {
      const settings = await storageService.getSettings();
      sendResponse({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting settings:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings'
      });
    }
  }

  /**
   * Handle save settings requests
   */
  private async handleSaveSettings(
    settings: Settings,
    sendResponse: SendResponse
  ): Promise<void> {
    try {
      // Validate settings first
      const validation = storageService.validateSettings(settings);

      if (!validation.valid) {
        sendResponse({
          success: false,
          error: 'Invalid settings',
          errors: validation.errors
        });
        return;
      }

      // Save settings
      await storageService.saveSettings(settings);

      sendResponse({
        success: true,
        message: 'Settings saved successfully',
        data: settings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save settings'
      });
    }
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
