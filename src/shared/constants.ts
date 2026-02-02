// Shared constants for the extension

export const STORAGE_KEYS = {
  SETTINGS: 'llm_assistant_settings',
  CHAT_HISTORY: 'llm_assistant_chat_history',
  CURRENT_SESSION: 'llm_assistant_current_session'
};

export const HIGHLIGHT_COLORS = {
  default: {
    backgroundColor: 'rgba(255, 235, 59, 0.3)',
    border: '2px solid rgba(255, 193, 7, 0.8)',
    color: '#000'
  },
  high: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    border: '2px solid rgba(76, 175, 80, 0.8)',
    color: '#000'
  },
  medium: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    border: '2px solid rgba(33, 150, 243, 0.8)',
    color: '#000'
  },
  low: {
    backgroundColor: 'rgba(158, 158, 158, 0.3)',
    border: '2px solid rgba(158, 158, 158, 0.8)',
    color: '#000'
  }
};

export const DEFAULT_HIGHLIGHT_DURATION = 30000; // 30 seconds

export const KEEP_ALIVE_INTERVAL = 20000; // 20 seconds
