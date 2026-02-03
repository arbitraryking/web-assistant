import { useChat } from '../hooks/useChat';
import { useRef, useEffect } from 'react';
import { MessageType } from '../../shared/types/messages';

function Chat() {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    streamingMessage,
    highlights,
    summary,
    summaryExpanded,
    summarizationProgress,
    toggleSummary,
    sendMessage,
    clearChat,
    scrollToHighlight
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const handleSendMessage = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
  };

  const handleSummarizePage = async () => {
    if (isStreaming) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.SUMMARIZE_PAGE,
        timestamp: Date.now()
      });

      if (!response.success && response.error) {
        console.error('Failed to start summarization:', response.error);
      }
    } catch (err) {
      console.error('Error summarizing page:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h1>LLM Assistant</h1>
          <p>Chat with AI or summarize the current page</p>
        </div>
        <button className="clear-button" onClick={clearChat} title="Clear chat">
          Clear
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Summarization progress indicator */}
      {summarizationProgress && (
        <div className="progress-banner">
          <div className="progress-header">
            <div className="progress-spinner"></div>
            <span className="progress-message">{summarizationProgress.message}</span>
          </div>
          {summarizationProgress.progress !== undefined && (
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${summarizationProgress.progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-role">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}

        {/* Show streaming message */}
        {isStreaming && streamingMessage && (
          <div className="message assistant streaming">
            <div className="message-role">Assistant</div>
            <div className="message-content">
              {streamingMessage}
              <span className="streaming-cursor">▋</span>
            </div>
          </div>
        )}

        {/* Show loading indicator when streaming starts */}
        {isStreaming && !streamingMessage && (
          <div className="message assistant streaming">
            <div className="message-role">Assistant</div>
            <div className="message-content">
              <span className="typing-indicator">●●●</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Summary panel with overview and section cards */}
      {summary && (
        <div className={`summary-panel ${!summaryExpanded ? 'collapsed' : ''}`}>
          <div className="summary-header">
            <div className="summary-header-left">
              <button
                className="summary-toggle"
                onClick={toggleSummary}
                title={summaryExpanded ? 'Collapse summary' : 'Expand summary'}
              >
                {summaryExpanded ? '▼' : '▶'}
              </button>
              <h3>{summaryExpanded ? 'Page Summary' : 'Page Summary (collapsed)'}</h3>
            </div>
            <button className="summary-close" onClick={clearChat} title="Close summary">
              ×
            </button>
          </div>

          {summaryExpanded && (
            <>
              {summary.pageTitle && (
                <div className="summary-page-title">{summary.pageTitle}</div>
              )}

              {summary.overview && (
                <div className="summary-overview">
                  <h4>Overview</h4>
                  <p>{summary.overview}</p>
                </div>
              )}

              {summary.sections && summary.sections.length > 0 && (
                <div className="summary-sections">
                  <h4>Key Sections</h4>
                  <div className="section-cards">
                    {summary.sections.map((section, index) => (
                      <div
                        key={section.id || index}
                        className="section-card"
                        onClick={() => {
                          // Find corresponding highlight and scroll to it
                          const highlight = highlights[index];
                          if (highlight) {
                            scrollToHighlight(highlight.id);
                          }
                        }}
                      >
                        <div className="section-card-header">
                          <span className="section-index">{index + 1}</span>
                          <h5 className="section-title">{section.title}</h5>
                        </div>
                        <p className="section-summary">{section.summary}</p>
                        <div className="section-card-footer">
                          <span className="section-hint">Click to jump to section</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="action-buttons">
        <button className="action-button" onClick={handleSummarizePage} disabled={isStreaming}>
          Summarize Page
        </button>
      </div>

      <div className="input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          rows={3}
          disabled={isStreaming}
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default Chat;
