// OpenAI Provider Implementation
import { LLMProvider, ChatParams } from './llmService';
import { Settings } from '../shared/types/settings';
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';

  /**
   * Validate OpenAI configuration
   */
  async validateConfig(settings: Settings): Promise<{ valid: boolean; error?: string }> {
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return { valid: false, error: 'OpenAI API key is required' };
    }

    if (!settings.model || settings.model.trim() === '') {
      return { valid: false, error: 'Model is required' };
    }

    return { valid: true };
  }

  /**
   * Send chat request to OpenAI with streaming
   */
  async *chat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Running in service worker
    });

    // Convert ChatMessage[] to OpenAI message format
    const messages = params.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    try {
      const stream = await openai.chat.completions.create({
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
      console.error('OpenAI API error:', error);

      // Handle specific error types
      if (error.status === 401) {
        throw new Error('Invalid API key');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (error.status === 500) {
        throw new Error('OpenAI server error');
      } else {
        throw new Error(error.message || 'OpenAI request failed');
      }
    }
  }

  /**
   * Get API key from storage
   */
  private async getApiKey(): Promise<string | null> {
    const result = await chrome.storage.sync.get('llm_assistant_settings');
    return result.llm_assistant_settings?.apiKey || null;
  }
}

// Export singleton instance
export const openaiProvider = new OpenAIProvider();
