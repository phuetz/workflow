/**
 * Chat Trigger Types
 * Types for the AI chat trigger system
 */

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
    };
    latency?: number;
    toolCalls?: ChatToolCall[];
  };
  attachments?: ChatAttachment[];
  isStreaming?: boolean;
  error?: string;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  name: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
}

export interface ChatToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ChatSession {
  id: string;
  workflowId: string;
  userId?: string;
  messages: ChatMessage[];
  metadata: {
    startedAt: Date;
    lastMessageAt: Date;
    messageCount: number;
    totalTokens: number;
  };
  context?: Record<string, unknown>;
  status: 'active' | 'ended' | 'error';
}

export interface ChatTriggerConfig {
  id: string;
  workflowId: string;
  title: string;
  subtitle?: string;
  welcomeMessage?: string;
  placeholderText?: string;

  // Authentication
  authentication: {
    type: 'none' | 'jwt' | 'session' | 'apiKey';
    config?: Record<string, string>;
  };

  // Features
  features: {
    streaming: boolean;
    memory: boolean;
    fileUpload: boolean;
    voiceInput: boolean;
    voiceOutput: boolean;
    typing: boolean;
    feedback: boolean;
    history: boolean;
  };

  // Limits
  limits: {
    maxMessageLength: number;
    maxHistoryLength: number;
    maxFileSize: number; // MB
    rateLimit: {
      maxMessages: number;
      windowMs: number;
    };
  };

  // Styling
  style: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    borderRadius: string;
    position: 'bottom-right' | 'bottom-left' | 'center';
    size: 'small' | 'medium' | 'large' | 'fullscreen';
    avatarUrl?: string;
    logoUrl?: string;
    customCss?: string;
  };

  // AI Configuration
  ai: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    memoryType?: 'buffer' | 'summary' | 'vector';
    memoryConfig?: Record<string, unknown>;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatWidgetConfig {
  chatId: string;
  position: 'bottom-right' | 'bottom-left';
  buttonText?: string;
  buttonIcon?: string;
  autoOpen?: boolean;
  openDelay?: number;
}

// WebSocket message types
export type ChatWebSocketMessageType =
  | 'connect'
  | 'disconnect'
  | 'message'
  | 'stream_start'
  | 'stream_chunk'
  | 'stream_end'
  | 'typing_start'
  | 'typing_end'
  | 'tool_start'
  | 'tool_end'
  | 'error'
  | 'feedback';

export interface ChatWebSocketMessage {
  type: ChatWebSocketMessageType;
  sessionId: string;
  data: unknown;
  timestamp: Date;
}

// Chat execution context for workflow
export interface ChatExecutionContext {
  sessionId: string;
  messageId: string;
  userMessage: string;
  history: ChatMessage[];
  attachments?: ChatAttachment[];
  metadata: {
    userId?: string;
    ip?: string;
    userAgent?: string;
  };
}

// Chat feedback
export interface ChatFeedback {
  messageId: string;
  sessionId: string;
  rating: 'positive' | 'negative';
  comment?: string;
  timestamp: Date;
}

// Chat analytics
export interface ChatAnalytics {
  sessionId: string;
  workflowId: string;
  metrics: {
    totalMessages: number;
    averageResponseTime: number;
    totalTokens: number;
    feedbackScore: number;
    duration: number;
  };
}
