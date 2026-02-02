import { useChat } from '../hooks/useChat';
import { useRef, useEffect } from 'react';

function Chat() {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    streamingMessage,
    sendMessage,
    clearChat
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

      <div className="action-buttons">
        <button className="action-button" disabled={isStreaming}>
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
