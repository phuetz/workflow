/**
 * Chat Components - Barrel Export
 * AI chat trigger system components
 */

export { ChatMessage } from './ChatMessage';
export { ChatInput } from './ChatInput';
export { ChatInterface } from './ChatInterface';
export { ChatWidget } from './ChatWidget';

// Re-export types
export type {
  ChatMessageRole,
  ChatMessage as ChatMessageType,
  ChatAttachment,
  ChatToolCall,
  ChatSession,
  ChatTriggerConfig,
  ChatWidgetConfig,
  ChatWebSocketMessageType,
  ChatWebSocketMessage,
  ChatExecutionContext,
  ChatFeedback,
  ChatAnalytics,
} from '@/types/chat';
