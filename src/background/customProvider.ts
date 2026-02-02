// Custom Provider Implementation (OpenAI-compatible APIs)
import { LLMProvider, ChatParams } from './llmService';
import { Settings } from '../shared/types/settings';
import OpenAI from 'openai';

export class CustomProvider implements LLMProvider {
  name = 'custom';

  /**
   * Validate custom provider configuration
   */
  async validateConfig(settings: Settings): Promise<{ valid: boolean; error?: string }> {
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return { valid: false, error: 'API key is required' };
    }

    if (!settings.baseUrl || settings.baseUrl.trim() === '') {
      return { valid: false, error: 'Base URL is required for custom provider' };
    }

    // Validate base URL format
    try {
      const url = new URL(settings.baseUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return { valid: false, error: 'Base URL must use HTTP or HTTPS protocol' };
      }
    } catch {
      return { valid: false, error: 'Invalid base URL format' };
    }

    if (!settings.model || settings.model.trim() === '') {
      return { valid: false, error: 'Model name is required' };
    }

    return { valid: true };
  }

  /**
   * Send chat request to custom OpenAI-compatible API with streaming
   */
  async *chat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const config = await this.getConfig();

    if (!config.apiKey || !config.baseUrl) {
      throw new Error('Custom provider configuration not found');
    }

    // Use OpenAI SDK with custom base URL
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true // Running in service worker
    });

    // Convert ChatMessage[] to OpenAI message format
    const messages = params.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    try {
      const stream = await client.chat.completions.create({
        model: params.model,
        messages: messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 2000,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: any) {
      console.error('Custom provider API error:', error);

      // Handle specific error types
      if (error.status === 401) {
        throw new Error('Invalid API key');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (error.status === 404) {
        throw new Error('API endpoint not found - check your base URL');
      } else if (error.status === 500) {
        throw new Error('Server error');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused - check your base URL');
      } else {
        throw new Error(error.message || 'Custom provider request failed');
      }
    }
  }

  /**
   * Get configuration from storage
   */
  private async getConfig(): Promise<{ apiKey: string | null; baseUrl: string | null }> {
    const result = await chrome.storage.sync.get('llm_assistant_settings');
    const settings = result.llm_assistant_settings;
    return {
      apiKey: settings?.apiKey || null,
      baseUrl: settings?.baseUrl || null
    };
  }
}

// Export singleton instance
export const customProvider = new CustomProvider();
