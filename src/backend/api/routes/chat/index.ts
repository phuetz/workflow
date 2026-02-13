/**
 * Chat Module Index
 * Barrel export for all chat-related modules
 */

// Types
export * from './types';

// LLM Providers
export { getLLMService, initializeLLMProviders } from './llmProviders';

// AI Handlers
export { generateAIResponse, generateAIResponseStream } from './aiHandlers';

// Storage
export {
  isDatabaseAvailable,
  generateId,
  storeChatConfig,
  getChatConfig,
  getAllChatConfigs,
  updateChatConfig,
  deleteChatConfig,
  storeChatSession,
  getChatSession,
  updateChatSession,
  getSessionsByWorkflow,
  storeChatMessage,
  getChatMessages,
  storeChatFeedback,
  fallbackChatConfigs,
  fallbackChatSessions,
  fallbackChatMessages,
  fallbackChatFeedback,
} from './storage';

// Config Handlers
export {
  listConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
} from './configHandlers';

// Session Handlers
export {
  createSession,
  getSession,
  listSessions,
  endSession,
} from './sessionHandlers';

// Message Handlers
export { sendMessage, submitFeedback } from './messageHandlers';

// Stream Handlers
export { streamMessage } from './streamHandlers';

// Provider Handlers
export {
  listProviders,
  listModels,
  getMetrics,
  healthCheck,
} from './providerHandlers';
