// Custom Provider Implementation (OpenAI-compatible APIs)
import { LLMProvider, ChatParams } from './llmService';
import { Settings } from '../shared/types/settings';

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
   * Send chat request to custom OpenAI-compatible API with streaming using fetch
   */
  async *chat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const config = await this.getConfig();

    if (!config.apiKey || !config.baseUrl) {
      throw new Error('Custom provider configuration not found');
    }

    // Convert ChatMessage[] to OpenAI message format
    const messages = params.messages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }));

    // Ensure base URL ends with proper endpoint
    let url = config.baseUrl.replace(/\/$/, '');
    if (!url.endsWith('/chat/completions')) {
      url += '/chat/completions';
    }

    // Use fetch API directly to avoid service worker issues
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
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
      console.error('Custom provider API error:', error);

      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (response.status === 404) {
        throw new Error('API endpoint not found - check your base URL');
      } else if (response.status === 500) {
        throw new Error('Server error');
      } else {
        throw new Error(`Custom provider request failed: ${response.statusText}`);
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
