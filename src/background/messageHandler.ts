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

        case MessageType.SCROLL_TO_HIGHLIGHT:
          this.handleScrollToHighlight(message, sender, sendResponse).catch((err) => {
            console.error('Error in handleScrollToHighlight:', err);
            sendResponse({
              success: false,
              error: err.message || 'Failed to scroll to highlight'
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

      // Send progress: extracting content
      chrome.runtime.sendMessage({
        type: MessageType.PROGRESS,
        data: {
          stage: 'extracting_content',
          message: 'Extracting page content...',
          progress: 10
        },
        timestamp: Date.now()
      });

      // Get page content from content script
      const contentResponse = await this.sendToContentScript(tab.id, {
        type: MessageType.GET_PAGE_CONTENT,
        timestamp: Date.now()
      });

      if (!contentResponse.success || !contentResponse.data?.content) {
        throw new Error(contentResponse.error || 'Failed to extract page content');
      }

      const pageContent = contentResponse.data.content;

      // Debug: Log parsed content for inspection
      console.log('=== PAGE CONTENT DEBUG INFO ===');
      console.log('Title:', pageContent.title);
      console.log('URL:', pageContent.url);
      console.log('Content Length:', pageContent.content.length);
      console.log('Content Preview (first 500 chars):');
      console.log(pageContent.content.substring(0, 500));
      console.log('Content Preview (last 500 chars):');
      console.log(pageContent.content.substring(pageContent.content.length - 500));
      console.log('==============================');

      // Start keep-alive
      startKeepAlive();

      // Send initial response
      sendResponse({
        success: true,
        streaming: true,
        message: 'Starting page summarization'
      });

      // Send progress: generating summary
      chrome.runtime.sendMessage({
        type: MessageType.PROGRESS,
        data: {
          stage: 'generating_summary',
          message: 'Generating summary with AI...',
          progress: 30
        },
        timestamp: Date.now()
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

        // Send progress: creating highlights
        chrome.runtime.sendMessage({
          type: MessageType.PROGRESS,
          data: {
            stage: 'creating_highlights',
            message: 'Creating page highlights...',
            progress: 80
          },
          timestamp: Date.now()
        });

        // Parse response and extract highlights and summary structure
        const parsedSummary = this.parseSummaryStructure(fullResponse);
        const highlights = this.parseHighlightsFromSummary(fullResponse, pageContent.content);

        // Send structured summary to side panel
        if (parsedSummary) {
          chrome.runtime.sendMessage({
            type: MessageType.SUMMARY_READY,
            data: {
              summary: {
                ...parsedSummary,
                pageTitle: pageContent.title,
                pageUrl: pageContent.url
              }
            },
            timestamp: Date.now()
          });
        }

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

        // Send progress: complete (will be cleared by side panel)
        chrome.runtime.sendMessage({
          type: MessageType.PROGRESS,
          data: {
            stage: 'complete',
            message: 'Summary complete!',
            progress: 100
          },
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

For each key point, indicate the approximate location using this format:
- [Point 1] Location: "first 15-20 words from that section"
- [Point 2] Location: "first 15-20 words from that section"

Use actual quotes from the page content (inside quotes) so I can find and highlight these sections.

Keep the summary concise and focused on the most important information.`;
  }

  /**
   * Parse summary structure from LLM response
   * Extracts overview and sections for the summary panel
   */
  private parseSummaryStructure(summary: string): { overview: string; sections: any[] } | null {
    console.log('[Summary Parser] Parsing summary structure');

    // Try to parse as JSON first
    try {
      const jsonMatch = summary.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[Summary Parser] Found JSON structure');

        const sections = (parsed.sections || parsed.key_points || []).map((section: any, index: number) => ({
          id: section.id || `section_${index}`,
          title: section.title || section.section || `Section ${index + 1}`,
          summary: section.summary || section.description || '',
          textSnippet: section.textSnippet || section.quote || section.location || section.text || '',
          importance: section.importance || 'medium'
        }));

        return {
          overview: parsed.overview || parsed.description || '',
          sections
        };
      }
    } catch (e) {
      console.log('[Summary Parser] JSON parsing failed, will try text parsing');
    }

    // Fallback: Try to extract overview and sections from text format
    const overviewMatch = summary.match(/(?:overview|summary|introduction)[:\s]*([^:\n]*)/i);
    const overview = overviewMatch ? overviewMatch[1].trim() : '';

    // Extract bullet points or numbered list as sections
    const sectionMatches = summary.matchAll(/(?:[-•*]|\d+\.)\s+(.+?)(?=\n\s*(?:[-•*]|\d+\.|$))/gs);
    const sections: any[] = [];

    for (const match of sectionMatches) {
      const text = match[1].trim();
      // Extract location from the section text
      const locationMatch = text.match(/location[:\s]*"([^"]+)"/i);
      const textSnippet = locationMatch ? locationMatch[1] : text.substring(0, 100);

      sections.push({
        id: `section_${sections.length}`,
        title: text.split(':')[0].substring(0, 50) || `Section ${sections.length + 1}`,
        summary: text.replace(/location[:\s]*"[^"]*"/i, '').trim(),
        textSnippet,
        importance: 'medium'
      });
    }

    if (overview || sections.length > 0) {
      return { overview, sections };
    }

    return null;
  }

  /**
   * Parse highlights from summary response
   */
  private parseHighlightsFromSummary(summary: string, pageContent: string): any[] {
    const highlights: any[] = [];

    console.log('[Highlight Parser] Parsing summary, length:', summary.length);
    console.log('[Highlight Parser] Page content length:', pageContent.length);

    // First try to parse as JSON (if LLM returned structured format)
    try {
      const jsonMatch = summary.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[Highlight Parser] Found JSON in summary');
        const parsed = JSON.parse(jsonMatch[0]);

        // Handle different JSON structures
        const sections = parsed.sections || parsed.key_points || [];
        console.log('[Highlight Parser] Found sections:', sections.length);

        for (const section of sections) {
          const snippet = section.textSnippet || section.quote || section.location || section.text;
          if (snippet && typeof snippet === 'string' && snippet.length > 10) {
            const cleanSnippet = snippet.replace(/^["']|["']$/g, '').trim();
            // const existsInContent = pageContent.toLowerCase().includes(cleanSnippet.toLowerCase());
            const existsInContent = true
            console.log('[Highlight Parser] Snippet:', cleanSnippet.substring(0, 50) + '...');
            // console.log('[Highlight Parser] Exists in content:', existsInContent);

            if (existsInContent) {
              highlights.push({
                id: `highlight_${highlights.length}`,
                textSnippet: cleanSnippet,
                scrollTo: highlights.length === 0,
                animateScroll: true,
                style: {
                  backgroundColor: 'rgba(255, 235, 59, 0.3)',
                  border: '2px solid rgba(255, 193, 7, 0.8)'
                },
                // duration: 30000
              });
            }
          }
        }

        console.log('[Highlight Parser] Total highlights from JSON:', highlights.length);
        if (highlights.length > 0) return highlights;
      }
    } catch (e) {
      console.log('[Highlight Parser] JSON parsing failed:', e);
      // Not JSON, continue with regex parsing
    }

    // Fall back to regex for quoted text
    const quotes = summary.match(/"([^"]{15,150})"/g) || [];
    console.log('[Highlight Parser] Found quotes:', quotes.length);
    const locationPattern = /Location:\s*"([^"]{15,150})"/gi;
    let locationMatch;
    const locations: string[] = [];

    // First extract explicit "Location:" quotes
    while ((locationMatch = locationPattern.exec(summary)) !== null) {
      locations.push(locationMatch[1]);
    }

    // Use explicit locations first, then fall back to other quotes
    const allQuotes = [...locations, ...quotes.filter(q => !locations.includes(q.replace(/"/g, '')))];

    allQuotes.slice(0, 5).forEach((quote) => {
      const text = quote.replace(/"/g, '').trim();

      // Only create highlight if text is long enough and exists in content
      if (text.length > 10 && pageContent.toLowerCase().includes(text.toLowerCase())) {
        highlights.push({
          id: `highlight_${highlights.length}`,
          textSnippet: text,
          scrollTo: highlights.length === 0, // Only scroll to first highlight
          animateScroll: true,
          style: {
            backgroundColor: 'rgba(255, 235, 59, 0.3)',
            border: '2px solid rgba(255, 193, 7, 0.8)'
          },
          // duration: 30000 // 30 seconds
        });
      }
    });

    console.log('[Highlight Parser] Total highlights from regex:', highlights.length);

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
   * Handle scroll to highlight requests
   */
  private async handleScrollToHighlight(
    message: any,
    _sender: MessageSender,
    sendResponse: SendResponse
  ): Promise<void> {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Forward to content script
      const response = await this.sendToContentScript(tab.id, message);

      sendResponse(response);
    } catch (error: any) {
      console.error('Error scrolling to highlight:', error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to scroll to highlight'
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
