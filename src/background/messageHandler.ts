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
    _message: any,
    _sender: MessageSender,
    sendResponse: SendResponse
  ): Promise<void> {
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

      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id || tab.url?.startsWith('chrome://')) {
        sendResponse({
          success: false,
          error: tab.url?.startsWith('chrome://')
            ? 'Cannot summarize Chrome pages'
            : 'No active tab found'
        });
        return;
      }

      // Ensure content script is loaded
      await this.ensureContentScriptLoaded(tab.id);

      // Get page content from content script
      const contentResponse = await this.sendToContentScript(tab.id, {
        type: MessageType.GET_PAGE_CONTENT,
        timestamp: Date.now()
      });

      if (!contentResponse.success || !contentResponse.data?.content) {
        throw new Error(contentResponse.error || 'Failed to extract page content');
      }

      const pageContent = contentResponse.data.content;

      // Start keep-alive
      startKeepAlive();

      // Send initial response
      sendResponse({
        success: true,
        streaming: true,
        message: 'Starting page summarization'
      });

      // Create summarization prompt
      const prompt = settings.customPrompts.summarize || this.getDefaultSummarizePrompt();
      const fullPrompt = `${prompt}\n\nPage Title: ${pageContent.title}\n\nPage Content:\n${pageContent.content}`;

      const messages = [
        {
          id: `system_${Date.now()}`,
          role: 'system' as const,
          content: 'You are a helpful assistant that summarizes web pages.',
          timestamp: Date.now()
        },
        {
          id: `user_${Date.now()}`,
          role: 'user' as const,
          content: fullPrompt,
          timestamp: Date.now()
        }
      ];

      // Stream response
      const messageId = `summary_${Date.now()}`;
      let fullResponse = '';

      try {
        for await (const chunk of llmService.chat(settings, messages)) {
          fullResponse += chunk;

          // Send chunk to side panel
          chrome.runtime.sendMessage({
            type: MessageType.STREAM_CHUNK,
            data: {
              chunk,
              messageId
            },
            timestamp: Date.now()
          });
        }

        // Parse response and extract highlights
        const highlights = this.parseHighlightsFromSummary(fullResponse, pageContent.content);

        // Send highlights to content script
        if (highlights.length > 0) {
          await this.sendToContentScript(tab.id, {
            type: MessageType.HIGHLIGHT_CONTENT,
            data: { instructions: highlights },
            timestamp: Date.now()
          });
        }

        // Send completion
        chrome.runtime.sendMessage({
          type: MessageType.STREAM_COMPLETE,
          data: { messageId },
          timestamp: Date.now()
        });
      } catch (streamError: any) {
        chrome.runtime.sendMessage({
          type: MessageType.ERROR,
          data: {
            type: 'STREAM_ERROR',
            message: streamError.message || 'Summarization failed',
            timestamp: Date.now()
          },
          timestamp: Date.now()
        });
      } finally {
        stopKeepAlive();
      }
    } catch (error: any) {
      console.error('Error handling summarize page:', error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to summarize page'
      });
      stopKeepAlive();
    }
  }

  /**
   * Get default summarization prompt
   */
  private getDefaultSummarizePrompt(): string {
    return `Please summarize this web page. Provide:

1. A brief overview (2-3 sentences)
2. Key points (bullet list of main topics)
3. For each key point, include the first few words that appear in the content so I can find it.

Keep the summary concise and focused on the most important information.`;
  }

  /**
   * Parse highlights from summary response
   */
  private parseHighlightsFromSummary(summary: string, pageContent: string): any[] {
    const highlights: any[] = [];

    // Try to extract quoted text or keywords that might be in the summary
    const quotes = summary.match(/"([^"]+)"/g) || [];

    quotes.slice(0, 5).forEach((quote, index) => {
      const text = quote.replace(/"/g, '').trim();

      // Only create highlight if text is long enough and exists in content
      if (text.length > 10 && pageContent.toLowerCase().includes(text.toLowerCase())) {
        highlights.push({
          id: `highlight_${index}`,
          textSnippet: text,
          scrollTo: index === 0, // Only scroll to first highlight
          animateScroll: true,
          style: {
            backgroundColor: 'rgba(255, 235, 59, 0.3)',
            border: '2px solid rgba(255, 193, 7, 0.8)'
          },
          duration: 30000 // 30 seconds
        });
      }
    });

    return highlights;
  }

  /**
   * Handle get page content requests
   */
  private async handleGetPageContent(
    _sender: MessageSender,
    sendResponse: SendResponse
  ): Promise<void> {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Request content from content script
      const response = await this.sendToContentScript(tab.id, {
        type: MessageType.GET_PAGE_CONTENT,
        timestamp: Date.now()
      });

      if (response.success) {
        sendResponse({
          success: true,
          data: response.data
        });
      } else {
        throw new Error(response.error || 'Failed to get page content');
      }
    } catch (error: any) {
      console.error('Error getting page content:', error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to get page content'
      });
    }
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
   * Ensure content script is loaded in the tab
   */
  private async ensureContentScriptLoaded(tabId: number): Promise<void> {
    try {
      // Try to ping the content script
      await this.sendToContentScript(tabId, {
        type: MessageType.PING,
        timestamp: Date.now()
      });
    } catch (error) {
      // Content script not loaded, inject it
      console.log('Content script not loaded, injecting...');
      try {
        // Get the content script file from manifest
        const manifest = chrome.runtime.getManifest();
        const contentScript = manifest.content_scripts?.[0]?.js?.[0];

        if (!contentScript) {
          throw new Error('Content script not found in manifest');
        }

        await chrome.scripting.executeScript({
          target: { tabId },
          files: [contentScript]
        });

        // Wait a bit for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
        throw new Error('Failed to load content script. Please refresh the page and try again.');
      }
    }
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
