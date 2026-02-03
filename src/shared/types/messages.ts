// Message types for communication between extension components

export enum MessageType {
  // Chat messages
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  STREAM_CHUNK = 'STREAM_CHUNK',
  STREAM_COMPLETE = 'STREAM_COMPLETE',

  // Page summarization
  SUMMARIZE_PAGE = 'SUMMARIZE_PAGE',
  GET_PAGE_CONTENT = 'GET_PAGE_CONTENT',
  PAGE_CONTENT_RESPONSE = 'PAGE_CONTENT_RESPONSE',

  // Highlighting
  HIGHLIGHT_CONTENT = 'HIGHLIGHT_CONTENT',
  CLEAR_HIGHLIGHTS = 'CLEAR_HIGHLIGHTS',
  SCROLL_TO_HIGHLIGHT = 'SCROLL_TO_HIGHLIGHT',
  HIGHLIGHTS_READY = 'HIGHLIGHTS_READY',
  SUMMARY_READY = 'SUMMARY_READY',

  // Settings
  GET_SETTINGS = 'GET_SETTINGS',
  SAVE_SETTINGS = 'SAVE_SETTINGS',
  SETTINGS_RESPONSE = 'SETTINGS_RESPONSE',

  // General
  ERROR = 'ERROR',
  PING = 'PING',
  CONTENT_SCRIPT_READY = 'CONTENT_SCRIPT_READY'
}

// Base message structure
export interface BaseMessage {
  type: MessageType;
  data?: any;
  timestamp: number;
}

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// Page content structure
export interface PageContent {
  url: string;
  title: string;
  content: string;
  structure?: ContentNode[];
  metadata?: {
    description?: string;
    author?: string;
    publishDate?: string;
  };
}

export interface ContentNode {
  type: 'heading' | 'paragraph' | 'list' | 'code';
  level?: number; // For headings: h1=1, h2=2, etc.
  text: string;
  children?: ContentNode[];
}

// Highlight instruction
export interface HighlightInstruction {
  id: string;
  textSnippet: string; // Text to find on page
  selector?: string; // CSS selector (optional)
  xpath?: string; // XPath selector (optional)
  scrollTo: boolean;
  animateScroll: boolean;
  style: {
    backgroundColor: string;
    border: string;
    color?: string;
  };
  duration?: number; // How long to show highlight (ms)
}

// Summary result
export interface SummaryResult {
  overview: string;
  sections: SummarySection[];
}

export interface SummarySection {
  id?: string;
  title: string;
  summary: string;
  importance: 'high' | 'medium' | 'low';
  textSnippet: string;
  highlightId?: string;
}

// Error info
export interface ErrorInfo {
  type: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Specific message types
export interface ChatMessageRequest extends BaseMessage {
  type: MessageType.CHAT_MESSAGE;
  data: {
    messages: ChatMessage[];
    settings?: any;
  };
}

export interface StreamChunkResponse extends BaseMessage {
  type: MessageType.STREAM_CHUNK;
  data: {
    chunk: string;
    messageId: string;
  };
}

export interface SummarizePageRequest extends BaseMessage {
  type: MessageType.SUMMARIZE_PAGE;
  data?: {
    customPrompt?: string;
  };
}

export interface GetPageContentRequest extends BaseMessage {
  type: MessageType.GET_PAGE_CONTENT;
}

export interface PageContentResponse extends BaseMessage {
  type: MessageType.PAGE_CONTENT_RESPONSE;
  data: {
    content: PageContent;
  };
}

export interface HighlightContentRequest extends BaseMessage {
  type: MessageType.HIGHLIGHT_CONTENT;
  data: {
    instructions: HighlightInstruction[];
  };
}

export interface ScrollToHighlightRequest extends BaseMessage {
  type: MessageType.SCROLL_TO_HIGHLIGHT;
  data: {
    highlightId: string;
    animate?: boolean;
  };
}

export interface HighlightsReadyResponse extends BaseMessage {
  type: MessageType.HIGHLIGHTS_READY;
  data: {
    highlights: HighlightResult[];
  };
}

export interface HighlightResult {
  id: string;
  textSnippet: string;
  element: string; // Human-readable description
}

export interface SummaryReadyResponse extends BaseMessage {
  type: MessageType.SUMMARY_READY;
  data: {
    overview: string;
    sections: SummarySection[];
    pageTitle: string;
    pageUrl: string;
  };
}

export interface ErrorResponse extends BaseMessage {
  type: MessageType.ERROR;
  data: ErrorInfo;
}

// Type guard helpers
export function isChatMessage(message: BaseMessage): message is ChatMessageRequest {
  return message.type === MessageType.CHAT_MESSAGE;
}

export function isStreamChunk(message: BaseMessage): message is StreamChunkResponse {
  return message.type === MessageType.STREAM_CHUNK;
}

export function isSummarizePage(message: BaseMessage): message is SummarizePageRequest {
  return message.type === MessageType.SUMMARIZE_PAGE;
}

export function isGetPageContent(message: BaseMessage): message is GetPageContentRequest {
  return message.type === MessageType.GET_PAGE_CONTENT;
}

export function isHighlightContent(message: BaseMessage): message is HighlightContentRequest {
  return message.type === MessageType.HIGHLIGHT_CONTENT;
}
