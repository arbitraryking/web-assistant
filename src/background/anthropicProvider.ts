// Anthropic Provider Implementation
import { LLMProvider, ChatParams } from './llmService';
import { Settings } from '../shared/types/settings';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';

  /**
   * Validate Anthropic configuration
   */
  async validateConfig(settings: Settings): Promise<{ valid: boolean; error?: string }> {
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return { valid: false, error: 'Anthropic API key is required' };
    }

    if (!settings.model || settings.model.trim() === '') {
      return { valid: false, error: 'Model is required' };
    }

    return { valid: true };
  }

  /**
   * Send chat request to Anthropic with streaming
   */
  async *chat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      throw new Error('Anthropic API key not found');
    }

    // Convert ChatMessage[] to Anthropic message format
    // Anthropic requires system messages to be separate
    let systemMessage = '';
    const messages: Array<{ role: string; content: string }> = [];

    for (const msg of params.messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Use fetch API for streaming (old SDK doesn't support browser well)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.maxTokens || 2000,
        temperature: params.temperature || 0.7,
        system: systemMessage || undefined,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);

      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (response.status === 500) {
        throw new Error('Anthropic server error');
      } else {
        throw new Error(`Anthropic request failed: ${response.statusText}`);
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
              const event = JSON.parse(data);
              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'text_delta'
              ) {
                yield event.delta.text;
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
export const anthropicProvider = new AnthropicProvider();
