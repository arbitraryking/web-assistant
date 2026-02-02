// LLM Service - Provider abstraction layer
import { ChatMessage } from '../shared/types/messages';
import { Settings } from '../shared/types/settings';

export interface ChatParams {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
}

export interface LLMProvider {
  name: string;

  /**
   * Send chat messages and get streaming response
   */
  chat(params: ChatParams): AsyncGenerator<string, void, unknown>;

  /**
   * Validate provider configuration
   */
  validateConfig(settings: Settings): Promise<{ valid: boolean; error?: string }>;
}

/**
 * LLM Service - manages provider selection and requests
 */
export class LLMService {
  private providers: Map<string, LLMProvider> = new Map();

  /**
   * Register a provider
   */
  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
    console.log(`LLM Provider registered: ${provider.name}`);
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Send chat request using configured provider
   */
  async *chat(settings: Settings, messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    const provider = this.getProvider(settings.provider);

    if (!provider) {
      throw new Error(`Provider not found: ${settings.provider}`);
    }

    // Validate configuration
    const validation = await provider.validateConfig(settings);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid provider configuration');
    }

    // Call provider's chat method
    const params: ChatParams = {
      messages,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      stream: true
    };

    yield* provider.chat(params);
  }
}

// Export singleton instance
export const llmService = new LLMService();
