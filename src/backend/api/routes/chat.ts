/**
 * Chat API Routes
 * Handles chat trigger creation, management, and messages
 *
 * Implements a hybrid persistence approach:
 * - Primary: PostgreSQL via Prisma (when Chat models are available)
 * - Cache: Redis for frequently accessed data
 * - Fallback: In-memory storage for development/testing
 *
 * AI Integration:
 * - Supports multiple AI providers (OpenAI, Anthropic, Google, Azure)
 * - Streaming responses via Server-Sent Events
 * - Configurable model selection per chat
 *
 * Route handlers are organized in the ./chat/ subdirectory:
 * - types.ts: All interfaces and type definitions
 * - llmProviders.ts: LLM provider configurations
 * - aiHandlers.ts: AI response generation logic
 * - storage.ts: Data persistence layer
 * - configHandlers.ts: Chat configuration CRUD
 * - sessionHandlers.ts: Chat session management
 * - messageHandlers.ts: Message handling
 * - streamHandlers.ts: Streaming response handlers
 * - providerHandlers.ts: AI provider information
 */

import { Router } from 'express';

// Import route handlers from modular files
import {
  // Config handlers
  listConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  // Session handlers
  createSession,
  getSession,
  listSessions,
  endSession,
  // Message handlers
  sendMessage,
  submitFeedback,
  // Stream handlers
  streamMessage,
  // Provider handlers
  listProviders,
  listModels,
  getMetrics,
  healthCheck,
} from './chat/index';

const router = Router();

// =====================
// Chat Configuration Routes
// =====================

/**
 * GET /api/chat
 * List all chat configurations
 */
router.get('/', listConfigs);

/**
 * GET /api/chat/:chatId
 * Get chat configuration by ID
 */
router.get('/:chatId', getConfig);

/**
 * POST /api/chat
 * Create a new chat configuration
 */
router.post('/', createConfig);

/**
 * PUT /api/chat/:chatId
 * Update chat configuration
 */
router.put('/:chatId', updateConfig);

/**
 * DELETE /api/chat/:chatId
 * Delete a chat configuration
 */
router.delete('/:chatId', deleteConfig);

// =====================
// Chat Session Routes
// =====================

/**
 * POST /api/chat/:workflowId/session
 * Create a new chat session
 */
router.post('/:workflowId/session', createSession);

/**
 * GET /api/chat/:workflowId/session/:sessionId
 * Get chat session with messages
 */
router.get('/:workflowId/session/:sessionId', getSession);

/**
 * GET /api/chat/:workflowId/sessions
 * Get all sessions for a workflow (paginated)
 */
router.get('/:workflowId/sessions', listSessions);

/**
 * DELETE /api/chat/:workflowId/session/:sessionId
 * End a chat session
 */
router.delete('/:workflowId/session/:sessionId', endSession);

// =====================
// Chat Message Routes
// =====================

/**
 * POST /api/chat/:workflowId/message
 * Send a message (HTTP fallback for non-WebSocket clients)
 */
router.post('/:workflowId/message', sendMessage);

/**
 * POST /api/chat/:workflowId/feedback
 * Submit feedback for a message
 */
router.post('/:workflowId/feedback', submitFeedback);

// =====================
// Streaming Routes
// =====================

/**
 * POST /api/chat/:workflowId/stream
 * Send a message with streaming response (Server-Sent Events)
 */
router.post('/:workflowId/stream', streamMessage);

// =====================
// AI Provider Routes
// =====================

/**
 * GET /api/chat/providers
 * Get available AI providers and their models
 */
router.get('/providers', listProviders);

/**
 * GET /api/chat/models
 * Get all available AI models across providers
 */
router.get('/models', listModels);

/**
 * GET /api/chat/metrics
 * Get AI usage metrics
 */
router.get('/metrics', getMetrics);

/**
 * GET /api/chat/health
 * Health check for chat service
 */
router.get('/health', healthCheck);

export default router;
