import { useState } from 'react';

function Settings() {
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'custom'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4-turbo');
  const [baseUrl, setBaseUrl] = useState('');

  const handleSave = () => {
    // Save settings (will be implemented in later steps)
    console.log('Saving settings:', { provider, apiKey, model, baseUrl });
    alert('Settings saved! (Implementation pending)');
  };

  return (
    <div className="settings-container">
      <h1>Settings</h1>

      <div className="settings-form">
        <div className="form-group">
          <label htmlFor="provider">LLM Provider</label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
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
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
          />
        </div>

        <div className="form-group">
          <label htmlFor="model">Model</label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {provider === 'openai' && (
              <>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </>
            )}
            {provider === 'anthropic' && (
              <>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
              </>
            )}
            {provider === 'custom' && (
              <option value="custom-model">Custom Model</option>
            )}
          </select>
        </div>

        {provider === 'custom' && (
          <div className="form-group">
            <label htmlFor="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </div>
        )}

        <button className="save-button" onClick={handleSave}>
          Save Settings
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
