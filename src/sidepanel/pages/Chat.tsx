import { useState } from 'react';

function Chat() {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (!message.trim()) return;

    // Send message to background (will be implemented in later steps)
    console.log('Sending message:', message);

    // Test connection with background
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
      console.log('Background response:', response);
    });

    setMessage('');
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
        <h1>LLM Assistant</h1>
        <p>Chat with AI or summarize the current page</p>
      </div>

      <div className="messages">
        <div className="message assistant">
          <p>Hello! I'm your AI assistant. How can I help you today?</p>
        </div>
      </div>

      <div className="action-buttons">
        <button className="action-button">Summarize Page</button>
      </div>

      <div className="input-container">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          rows={3}
        />
        <button onClick={handleSendMessage} disabled={!message.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
