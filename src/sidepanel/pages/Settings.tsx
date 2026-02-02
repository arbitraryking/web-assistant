import { useSettings } from '../hooks/useSettings';
import { PROVIDER_CONFIGS, LLMProvider } from '../../shared/types/settings';

function Settings() {
  const {
    settings,
    loading,
    error,
    saving,
    updateSetting,
    saveSettings
  } = useSettings();

  const handleSave = async () => {
    const success = await saveSettings(settings);
    if (success) {
      alert('Settings saved successfully!');
    }
  };

  const providerConfig = PROVIDER_CONFIGS[settings.provider];

  if (loading) {
    return (
      <div className="settings-container">
        <h1>Settings</h1>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <h1>Settings</h1>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="settings-form">
        <div className="form-group">
          <label htmlFor="provider">LLM Provider</label>
          <select
            id="provider"
            value={settings.provider}
            onChange={(e) => {
              const newProvider = e.target.value as LLMProvider;
              updateSetting('provider', newProvider);
              // Update model to default for new provider
              const config = PROVIDER_CONFIGS[newProvider];
              if (config.defaultModel) {
                updateSetting('model', config.defaultModel);
              }
            }}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="custom">Custom (OpenAI-compatible)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">API Key</label>
          <input
            id="apiKey"
            type="password"
            value={settings.apiKey}
            onChange={(e) => updateSetting('apiKey', e.target.value)}
            placeholder="Enter your API key"
          />
        </div>

        <div className="form-group">
          <label htmlFor="model">Model</label>
          <select
            id="model"
            value={settings.model}
            onChange={(e) => updateSetting('model', e.target.value)}
          >
            {providerConfig.models.length > 0 ? (
              providerConfig.models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))
            ) : (
              <option value="">Enter custom model name</option>
            )}
          </select>
        </div>

        {settings.provider === 'custom' && providerConfig.models.length === 0 && (
          <div className="form-group">
            <label htmlFor="customModel">Model Name</label>
            <input
              id="customModel"
              type="text"
              value={settings.model}
              onChange={(e) => updateSetting('model', e.target.value)}
              placeholder="e.g., gpt-3.5-turbo"
            />
          </div>
        )}

        {settings.provider === 'custom' && (
          <div className="form-group">
            <label htmlFor="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              type="url"
              value={settings.baseUrl || ''}
              onChange={(e) => updateSetting('baseUrl', e.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="temperature">
            Temperature ({settings.temperature})
          </label>
          <input
            id="temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
          />
          <small>Lower = more focused, Higher = more creative</small>
        </div>

        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving || !settings.apiKey}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-info">
        <p>
          <strong>Note:</strong> Your API key is stored securely in Chrome's
          encrypted storage and is never shared with anyone.
        </p>
      </div>
    </div>
  );
}

export default Settings;
