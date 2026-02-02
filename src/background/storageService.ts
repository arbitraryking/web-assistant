// Storage service for managing chrome.storage
import { Settings, DEFAULT_SETTINGS } from '../shared/types/settings';
import { STORAGE_KEYS } from '../shared/constants';

export class StorageService {
  /**
   * Get settings from chrome.storage.sync
   */
  async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      const settings = result[STORAGE_KEYS.SETTINGS];

      if (settings) {
        // Merge with defaults to ensure all keys exist
        return { ...DEFAULT_SETTINGS, ...settings };
      }

      // Return default settings if none exist
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save settings to chrome.storage.sync
   */
  async saveSettings(settings: Settings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: settings
      });
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  /**
   * Clear all settings
   */
  async clearSettings(): Promise<void> {
    try {
      await chrome.storage.sync.remove(STORAGE_KEYS.SETTINGS);
      console.log('Settings cleared successfully');
    } catch (error) {
      console.error('Error clearing settings:', error);
      throw error;
    }
  }

  /**
   * Validate settings
   */
  validateSettings(settings: Settings): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check API key
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      errors.push('API key is required');
    }

    // Check base URL for custom provider
    if (settings.provider === 'custom') {
      if (!settings.baseUrl || settings.baseUrl.trim() === '') {
        errors.push('Base URL is required for custom provider');
      } else {
        try {
          const url = new URL(settings.baseUrl);
          if (url.protocol !== 'https:') {
            errors.push('Base URL must use HTTPS protocol');
          }
        } catch {
          errors.push('Invalid base URL format');
        }
      }
    }

    // Check model
    if (!settings.model || settings.model.trim() === '') {
      errors.push('Model is required');
    }

    // Check temperature
    if (settings.temperature < 0 || settings.temperature > 2) {
      errors.push('Temperature must be between 0 and 2');
    }

    // Check max tokens
    if (settings.maxTokens < 1 || settings.maxTokens > 100000) {
      errors.push('Max tokens must be between 1 and 100000');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get chat history from chrome.storage.local
   */
  async getChatHistory(): Promise<any[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CHAT_HISTORY);
      return result[STORAGE_KEYS.CHAT_HISTORY] || [];
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  /**
   * Save chat history to chrome.storage.local
   */
  async saveChatHistory(history: any[]): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.CHAT_HISTORY]: history
      });
    } catch (error) {
      console.error('Error saving chat history:', error);
      throw error;
    }
  }

  /**
   * Clear chat history
   */
  async clearChatHistory(): Promise<void> {
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.CHAT_HISTORY);
      console.log('Chat history cleared successfully');
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }

  /**
   * Listen for storage changes
   */
  onStorageChange(callback: (changes: any) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[STORAGE_KEYS.SETTINGS]) {
        callback(changes[STORAGE_KEYS.SETTINGS].newValue);
      }
    });
  }
}

// Export singleton instance
export const storageService = new StorageService();
