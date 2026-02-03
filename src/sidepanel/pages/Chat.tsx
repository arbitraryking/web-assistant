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

      {/* Highlight links section */}
      {highlights.length > 0 && (
        <div className="highlights-section">
          <div className="highlights-header">
            <h3>Highlighted Sections</h3>
            <span className="highlights-count">{highlights.length}</span>
          </div>
          <div className="highlights-list">
            {highlights.map((highlight, index) => (
              <button
                key={highlight.id}
                className="highlight-link"
                onClick={() => scrollToHighlight(highlight.id)}
                title={highlight.textSnippet}
              >
                <span className="highlight-index">{index + 1}</span>
                <span className="highlight-text">
                  {highlight.textSnippet.length > 60
                    ? highlight.textSnippet.substring(0, 60) + '...'
                    : highlight.textSnippet}
                </span>
                <span className="highlight-element">{highlight.element}</span>
              </button>
            ))}
          </div>
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
