// Hook for managing chat state and communication with background
import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, MessageType, HighlightResult, SummarySection, Progress, SelectedTextContext } from '../../shared/types/messages';

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
  const [summary, setSummary] = useState<{ overview: string; sections: SummarySection[]; pageTitle: string; pageUrl: string } | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true); // Summary panel collapse state
  const [summarizationProgress, setSummarizationProgress] = useState<Progress | null>(null); // Track summarization progress
  const [selectedTexts, setSelectedTexts] = useState<SelectedTextContext[]>([]); // Track selected text contexts

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
          setSummarizationProgress(null); // Clear progress on complete
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

        case MessageType.SUMMARY_READY:
          // Store structured summary data
          console.log('Summary ready:', message.data.summary);
          setSummary(message.data.summary || null);
          setSummarizationProgress(null); // Clear progress when summary is ready
          break;

        case MessageType.PROGRESS:
          // Update progress
          console.log('Progress:', message.data);
          const progress = message.data;
          // Clear progress if complete
          if (progress.stage === 'complete') {
            setSummarizationProgress(null);
          } else {
            setSummarizationProgress(progress);
          }
          break;

        case MessageType.ADD_SELECTED_TEXT:
          // Add selected text as context for questioning
          console.log('Selected text added:', message.data);
          const { text, pageTitle, url } = message.data;
          const newContext: SelectedTextContext = {
            id: `context_${Date.now()}`,
            text,
            pageTitle,
            url
          };
          setSelectedTexts((prev) => [...prev, newContext]);
          break;

        case MessageType.ERROR:
          // Handle error
          setIsStreaming(false);
          setSummarizationProgress(null); // Clear progress on error
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

    // Prepare message content with selected text context if available
    let messageContent = content.trim();
    if (selectedTexts.length > 0) {
      const contextBlocks = selectedTexts.map(
        (ctx) => `[Context from ${ctx.pageTitle}:\n${ctx.text}]`
      ).join('\n\n');
      messageContent = `${contextBlocks}\n\nUser question: ${content}`;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageContent,
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
  }, [messages, isStreaming, selectedTexts]);

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
    setSummary(null);
    setSummarizationProgress(null);
    setSelectedTexts([]);
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

  const toggleSummary = useCallback(() => {
    setSummaryExpanded(prev => !prev);
  }, []);

  const removeSelectedText = useCallback((id: string) => {
    setSelectedTexts((prev) => prev.filter(ctx => ctx.id !== id));
  }, []);

  return {
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
    selectedTexts,
    toggleSummary,
    removeSelectedText,
    sendMessage,
    clearChat,
    scrollToHighlight
  };
}
