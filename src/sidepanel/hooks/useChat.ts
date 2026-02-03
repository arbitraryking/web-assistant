// Hook for managing chat state and communication with background
import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, MessageType, HighlightResult } from '../../shared/types/messages';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [highlights, setHighlights] = useState<HighlightResult[]>([]); // Track current highlights

  /**
   * Listen for streaming chunks from background
   */
  useEffect(() => {
    const handleMessage = (message: any) => {
      console.log('Chat received message:', message);

      switch (message.type) {
        case MessageType.STREAM_CHUNK:
          // Append chunk to streaming message
          setStreamingMessage((prev) => prev + message.data.chunk);
          break;

        case MessageType.STREAM_COMPLETE:
          // Finalize streaming message
          setIsStreaming(false);
          if (streamingMessage) {
            const assistantMessage: ChatMessage = {
              id: message.data.messageId,
              role: 'assistant',
              content: streamingMessage,
              timestamp: Date.now()
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingMessage('');
          }
          break;

        case MessageType.HIGHLIGHTS_READY:
          // Store highlights for display
          console.log('Highlights ready:', message.data.highlights);
          setHighlights(message.data.highlights || []);
          break;

        case MessageType.ERROR:
          // Handle error
          setIsStreaming(false);
          setError(message.data.message || 'An error occurred');
          setStreamingMessage('');
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [streamingMessage]);

  /**
   * Send a message to the background
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    setError(null);
    setStreamingMessage('');

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      // Send message to background
      const response = await chrome.runtime.sendMessage({
        type: MessageType.CHAT_MESSAGE,
        data: {
          messages: [...messages, userMessage]
        },
        timestamp: Date.now()
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      setIsStreaming(false);
    }
  }, [messages, isStreaming]);

  /**
   * Clear chat history
   */
  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. How can I help you today?',
        timestamp: Date.now()
      }
    ]);
    setError(null);
    setStreamingMessage('');
    setHighlights([]);
  }, []);

  /**
   * Scroll to a specific highlight on the page
   */
  const scrollToHighlight = useCallback(async (highlightId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.SCROLL_TO_HIGHLIGHT,
        data: { highlightId, animate: true },
        timestamp: Date.now()
      });

      if (!response?.success) {
        console.warn('Failed to scroll to highlight:', highlightId);
      }
    } catch (err) {
      console.error('Error scrolling to highlight:', err);
    }
  }, []);

  return {
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
  };
}
