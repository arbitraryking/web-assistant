// Hook for managing settings in the side panel
import { useState, useEffect } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../../shared/types/settings';
import { MessageType } from '../../shared/types/messages';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * Load settings from background
   */
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_SETTINGS,
        timestamp: Date.now()
      });

      if (response.success) {
        setSettings(response.data);
      } else {
        setError(response.error || 'Failed to load settings');
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save settings to background
   */
  const saveSettings = async (newSettings: Settings): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);

      const response = await chrome.runtime.sendMessage({
        type: MessageType.SAVE_SETTINGS,
        data: newSettings,
        timestamp: Date.now()
      });

      if (response.success) {
        setSettings(response.data);
        return true;
      } else {
        const errorMsg = response.errors
          ? response.errors.join(', ')
          : response.error || 'Failed to save settings';
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Update a specific setting field
   */
  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'sync' && changes.llm_assistant_settings) {
        const newSettings = changes.llm_assistant_settings.newValue;
        if (newSettings) {
          setSettings(newSettings);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return {
    settings,
    loading,
    error,
    saving,
    updateSetting,
    saveSettings,
    loadSettings
  };
}
