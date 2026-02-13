/**
 * Chat Module Types
 * All interfaces and types for the chat API
 */

import type { Request, Response } from 'express';

/**
 * AI Response Generation Configuration
 */
export interface AIConfig {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

/**
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt:
    'You are a helpful AI assistant integrated into a workflow automation platform. ' +
    'You can help users with questions about their workflows, provide suggestions, ' +
    'and assist with various tasks. Be concise, helpful, and professional.',
  stream: false,
};

/**
 * Chat configuration stored in the system
 */
export interface ChatConfig {
  id: string;
  workflowId?: string;
  name?: string;
  aiConfig?: AIConfig;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

/**
 * Chat session
 */
export interface ChatSession {
  id: string;
  workflowId: string;
  userId?: string;
  messages: ChatMessage[];
  metadata: SessionMetadata;
  status: 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  totalTokens: number;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: MessageAttachment[];
  metadata?: MessageMetadata;
  timestamp: Date;
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  type: string;
  url?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  data?: string;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  model?: string;
  tokens?: { input: number; output: number };
  latency?: number;
  provider?: string;
  streaming?: boolean;
  error?: string;
}

/**
 * Chat feedback
 */
export interface ChatFeedback {
  id: string;
  workflowId: string;
  sessionId: string;
  messageId: string;
  rating: number;
  comment?: string;
  timestamp: Date;
}

/**
 * AI response result
 */
export interface AIResponseResult {
  content: string;
  usage: { input: number; output: number };
  model: string;
  latency: number;
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  chunk: string;
  done: boolean;
  usage?: { input: number; output: number };
}

/**
 * Paginated sessions result
 */
export interface PaginatedSessions {
  sessions: ChatSession[];
  total: number;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Express request handler type
 */
export type RequestHandler = (req: Request, res: Response) => Promise<void | Response>;

/**
 * Cache configuration
 */
export const CACHE_TTL = 300; // 5 minutes
export const CACHE_NAMESPACE = 'chat';
