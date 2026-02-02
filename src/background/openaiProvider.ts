// OpenAI Provider Implementation
import { LLMProvider, ChatParams } from './llmService';
import { Settings } from '../shared/types/settings';

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
   * Send chat request to OpenAI with streaming using fetch API
   */
  async *chat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Convert ChatMessage[] to OpenAI message format
    const messages = params.messages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }));

    // Use fetch API directly to avoid service worker issues with OpenAI SDK
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: params.model,
        messages: messages,
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 2000,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);

      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (response.status === 500) {
        throw new Error('OpenAI server error');
      } else {
        throw new Error(`OpenAI request failed: ${response.statusText}`);
      }
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
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
