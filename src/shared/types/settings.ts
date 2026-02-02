// Settings types for LLM provider configuration

export type LLMProvider = 'openai' | 'anthropic' | 'custom';

export interface Settings {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string; // For custom provider
  model: string;
  temperature: number;
  maxTokens: number;
  customPrompts: {
    summarize: string;
    default: string;
  };
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  models: ModelOption[];
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
  defaultModel: string;
}

export interface ModelOption {
  id: string;
  name: string;
  contextWindow: number;
  supportsStreaming: boolean;
}

// Provider configurations
export const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    models: [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        supportsStreaming: true
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        contextWindow: 8192,
        supportsStreaming: true
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        supportsStreaming: true
      }
    ],
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'gpt-4-turbo'
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic',
    models: [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        supportsStreaming: true
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        contextWindow: 200000,
        supportsStreaming: true
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        supportsStreaming: true
      }
    ],
    requiresApiKey: true,
    requiresBaseUrl: false,
    defaultModel: 'claude-3-sonnet-20240229'
  },
  custom: {
    name: 'custom',
    displayName: 'Custom (OpenAI-compatible)',
    models: [],
    requiresApiKey: true,
    requiresBaseUrl: true,
    defaultModel: ''
  }
};

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  customPrompts: {
    summarize: `You are a web page summarization assistant. Analyze the following page content and provide:

1. A brief overview (2-3 sentences)
2. Key sections with:
   - Section title
   - Brief summary (1-2 sentences)
   - Importance level (high/medium/low)
   - Text snippet for locating the section (first 20-30 words)

Format your response as JSON:
{
  "overview": "...",
  "sections": [
    {
      "title": "...",
      "summary": "...",
      "importance": "high",
      "textSnippet": "..."
    }
  ]
}`,
    default: 'You are a helpful AI assistant. Provide clear, concise, and accurate answers.'
  }
};
