/**
 * Chat Storage
 * Handles chat data persistence with database, cache, and fallback storage
 */

import { prisma } from '../../../database/prisma';
import { cacheLayer as cacheService } from '../../../../services/CacheLayer';
import { logger } from '../../../../services/SimpleLogger';
import type { ChatConfig, ChatSession, ChatMessage, ChatFeedback, PaginatedSessions } from './types';
import { CACHE_TTL, CACHE_NAMESPACE } from './types';
import type { Prisma } from '@prisma/client';

// Helper to cast typed objects to Prisma InputJsonValue
const toJson = (val: unknown): Prisma.InputJsonValue => val as Prisma.InputJsonValue;

// In-memory fallback (used when database is not available)
export const fallbackChatConfigs: Map<string, ChatConfig> = new Map();
export const fallbackChatSessions: Map<string, ChatSession> = new Map();
export const fallbackChatMessages: Map<string, ChatMessage[]> = new Map();
export const fallbackChatFeedback: Map<string, ChatFeedback> = new Map();

/**
 * Check if Chat models exist in Prisma
 * Allows graceful degradation when schema hasn't been migrated
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn('Database not available for chat storage, using fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =====================
// Chat Config Storage
// =====================

/**
 * Store chat configuration (with fallback)
 */
export async function storeChatConfig(config: Partial<ChatConfig>): Promise<ChatConfig> {
  const chatId = config.id || generateId('chat');
  const now = new Date();

  const configData: ChatConfig = {
    ...config,
    id: chatId,
    createdAt: config.createdAt || now,
    updatedAt: now,
  } as ChatConfig;

  try {
    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      await prisma.auditLog.create({
        data: {
          action: 'CHAT_CONFIG_CREATE',
          resource: 'chat_config',
          resourceId: chatId,
          details: toJson(configData),
          timestamp: now,
        },
      });
    }

    fallbackChatConfigs.set(chatId, configData);

    await cacheService.set(`config:${chatId}`, configData, {
      ttl: CACHE_TTL,
      namespace: CACHE_NAMESPACE,
      tags: ['chat_configs'],
    });

    return configData;
  } catch (error) {
    logger.error('Error storing chat config:', error);
    fallbackChatConfigs.set(chatId, configData);
    return configData;
  }
}

/**
 * Get chat configuration by ID
 */
export async function getChatConfig(chatId: string): Promise<ChatConfig | null> {
  try {
    const cached = await cacheService.get<ChatConfig>(`config:${chatId}`, {
      namespace: CACHE_NAMESPACE,
    });
    if (cached) {
      return cached;
    }

    if (fallbackChatConfigs.has(chatId)) {
      const config = fallbackChatConfigs.get(chatId)!;
      await cacheService.set(`config:${chatId}`, config, {
        ttl: CACHE_TTL,
        namespace: CACHE_NAMESPACE,
      });
      return config;
    }

    const dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resource: 'chat_config',
          resourceId: chatId,
          action: {
            in: ['CHAT_CONFIG_CREATE', 'CHAT_CONFIG_UPDATE'],
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      if (auditLog) {
        const config = auditLog.details as unknown as ChatConfig;
        fallbackChatConfigs.set(chatId, config);
        await cacheService.set(`config:${chatId}`, config, {
          ttl: CACHE_TTL,
          namespace: CACHE_NAMESPACE,
        });
        return config;
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting chat config:', error);
    return fallbackChatConfigs.get(chatId) || null;
  }
}

/**
 * Get all chat configurations
 */
export async function getAllChatConfigs(): Promise<ChatConfig[]> {
  try {
    const cached = await cacheService.get<ChatConfig[]>('configs:all', {
      namespace: CACHE_NAMESPACE,
    });
    if (cached) {
      return cached;
    }

    const dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          resource: 'chat_config',
          action: {
            in: ['CHAT_CONFIG_CREATE', 'CHAT_CONFIG_UPDATE'],
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      const configMap = new Map<string, ChatConfig>();
      for (const log of auditLogs) {
        const config = log.details as unknown as ChatConfig;
        if (config?.id && !configMap.has(config.id)) {
          configMap.set(config.id, config);
        }
      }

      for (const [id, config] of configMap) {
        if (!fallbackChatConfigs.has(id)) {
          fallbackChatConfigs.set(id, config);
        }
      }
    }

    const result = Array.from(fallbackChatConfigs.values());

    await cacheService.set('configs:all', result, {
      ttl: 60,
      namespace: CACHE_NAMESPACE,
      tags: ['chat_configs'],
    });

    return result;
  } catch (error) {
    logger.error('Error getting all chat configs:', error);
    return Array.from(fallbackChatConfigs.values());
  }
}

/**
 * Update chat configuration
 */
export async function updateChatConfig(
  chatId: string,
  updates: Partial<ChatConfig>
): Promise<ChatConfig | null> {
  const existing = await getChatConfig(chatId);
  if (!existing) {
    return null;
  }

  const updatedConfig: ChatConfig = {
    ...existing,
    ...updates,
    id: chatId,
    updatedAt: new Date(),
  };

  try {
    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      await prisma.auditLog.create({
        data: {
          action: 'CHAT_CONFIG_UPDATE',
          resource: 'chat_config',
          resourceId: chatId,
          details: toJson(updatedConfig),
          timestamp: new Date(),
        },
      });
    }

    fallbackChatConfigs.set(chatId, updatedConfig);

    await cacheService.delete(`config:${chatId}`, CACHE_NAMESPACE);
    await cacheService.invalidateByTags(['chat_configs']);

    return updatedConfig;
  } catch (error) {
    logger.error('Error updating chat config:', error);
    fallbackChatConfigs.set(chatId, updatedConfig);
    return updatedConfig;
  }
}

/**
 * Delete chat configuration
 */
export async function deleteChatConfig(chatId: string): Promise<boolean> {
  try {
    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      await prisma.auditLog.create({
        data: {
          action: 'CHAT_CONFIG_DELETE',
          resource: 'chat_config',
          resourceId: chatId,
          details: toJson({ deletedAt: new Date().toISOString() }),
          timestamp: new Date(),
        },
      });
    }

    fallbackChatConfigs.delete(chatId);

    await cacheService.delete(`config:${chatId}`, CACHE_NAMESPACE);
    await cacheService.invalidateByTags(['chat_configs']);

    return true;
  } catch (error) {
    logger.error('Error deleting chat config:', error);
    fallbackChatConfigs.delete(chatId);
    return true;
  }
}

// =====================
// Chat Session Storage
// =====================

/**
 * Store chat session
 */
export async function storeChatSession(session: Partial<ChatSession>): Promise<ChatSession> {
  const sessionId = session.id || generateId('session');
  const now = new Date();

  const sessionData: ChatSession = {
    ...session,
    id: sessionId,
    createdAt: now,
    updatedAt: now,
  } as ChatSession;

  try {
    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      await prisma.auditLog.create({
        data: {
          action: 'CHAT_SESSION_CREATE',
          resource: 'chat_session',
          resourceId: sessionId,
          details: toJson(sessionData),
          timestamp: now,
        },
      });
    }

    fallbackChatSessions.set(sessionId, sessionData);
    fallbackChatMessages.set(sessionId, []);

    await cacheService.set(`session:${sessionId}`, sessionData, {
      ttl: CACHE_TTL,
      namespace: CACHE_NAMESPACE,
      tags: ['chat_sessions', `workflow:${session.workflowId}`],
    });

    return sessionData;
  } catch (error) {
    logger.error('Error storing chat session:', error);
    fallbackChatSessions.set(sessionId, sessionData);
    fallbackChatMessages.set(sessionId, []);
    return sessionData;
  }
}

/**
 * Get chat session
 */
export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const cached = await cacheService.get<ChatSession>(`session:${sessionId}`, {
      namespace: CACHE_NAMESPACE,
    });
    if (cached) {
      return cached;
    }

    if (fallbackChatSessions.has(sessionId)) {
      return fallbackChatSessions.get(sessionId)!;
    }

    const dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resource: 'chat_session',
          resourceId: sessionId,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      if (auditLog) {
        const session = auditLog.details as unknown as ChatSession;
        fallbackChatSessions.set(sessionId, session);
        return session;
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting chat session:', error);
    return fallbackChatSessions.get(sessionId) || null;
  }
}

/**
 * Update chat session
 */
export async function updateChatSession(
  sessionId: string,
  updates: Partial<ChatSession>
): Promise<ChatSession | null> {
  const existing = await getChatSession(sessionId);
  if (!existing) {
    return null;
  }

  const updatedSession: ChatSession = {
    ...existing,
    ...updates,
    id: sessionId,
    updatedAt: new Date(),
  };

  try {
    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      await prisma.auditLog.create({
        data: {
          action: 'CHAT_SESSION_UPDATE',
          resource: 'chat_session',
          resourceId: sessionId,
          details: toJson(updatedSession),
          timestamp: new Date(),
        },
      });
    }

    fallbackChatSessions.set(sessionId, updatedSession);

    await cacheService.delete(`session:${sessionId}`, CACHE_NAMESPACE);

    return updatedSession;
  } catch (error) {
    logger.error('Error updating chat session:', error);
    fallbackChatSessions.set(sessionId, updatedSession);
    return updatedSession;
  }
}

/**
 * Get sessions by workflow
 */
export async function getSessionsByWorkflow(
  workflowId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedSessions> {
  try {
    let allSessions = Array.from(fallbackChatSessions.values()).filter(
      (s) => s.workflowId === workflowId
    );

    const dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          resource: 'chat_session',
          action: {
            in: ['CHAT_SESSION_CREATE', 'CHAT_SESSION_UPDATE'],
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      const sessionMap = new Map<string, ChatSession>();
      for (const log of auditLogs) {
        const session = log.details as unknown as ChatSession;
        if (
          session?.id &&
          session?.workflowId === workflowId &&
          !sessionMap.has(session.id)
        ) {
          sessionMap.set(session.id, session);
        }
      }

      for (const [id, session] of sessionMap) {
        if (!fallbackChatSessions.has(id)) {
          fallbackChatSessions.set(id, session);
        }
      }

      allSessions = Array.from(fallbackChatSessions.values()).filter(
        (s) => s.workflowId === workflowId
      );
    }

    const total = allSessions.length;
    const startIndex = (page - 1) * limit;
    const paginatedSessions = allSessions.slice(startIndex, startIndex + limit);

    return { sessions: paginatedSessions, total };
  } catch (error) {
    logger.error('Error getting sessions by workflow:', error);
    const allSessions = Array.from(fallbackChatSessions.values()).filter(
      (s) => s.workflowId === workflowId
    );
    return {
      sessions: allSessions.slice((page - 1) * limit, page * limit),
      total: allSessions.length,
    };
  }
}

// =====================
// Chat Message Storage
// =====================

/**
 * Store chat message
 */
export async function storeChatMessage(
  sessionId: string,
  message: Partial<ChatMessage>
): Promise<ChatMessage> {
  const messageId = message.id || generateId('msg');
  const now = new Date();

  const messageData: ChatMessage = {
    ...message,
    id: messageId,
    sessionId,
    timestamp: now,
  } as ChatMessage;

  try {
    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      await prisma.auditLog.create({
        data: {
          action: 'CHAT_MESSAGE_CREATE',
          resource: 'chat_message',
          resourceId: messageId,
          details: toJson(messageData),
          timestamp: now,
        },
      });
    }

    if (!fallbackChatMessages.has(sessionId)) {
      fallbackChatMessages.set(sessionId, []);
    }
    fallbackChatMessages.get(sessionId)!.push(messageData);

    return messageData;
  } catch (error) {
    logger.error('Error storing chat message:', error);
    if (!fallbackChatMessages.has(sessionId)) {
      fallbackChatMessages.set(sessionId, []);
    }
    fallbackChatMessages.get(sessionId)!.push(messageData);
    return messageData;
  }
}

/**
 * Get chat messages for session
 */
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    if (fallbackChatMessages.has(sessionId)) {
      return fallbackChatMessages.get(sessionId) || [];
    }

    const dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          resource: 'chat_message',
          action: 'CHAT_MESSAGE_CREATE',
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      const messages = auditLogs
        .map((log) => log.details as unknown as ChatMessage)
        .filter((msg) => msg?.sessionId === sessionId);

      fallbackChatMessages.set(sessionId, messages);
      return messages;
    }

    return [];
  } catch (error) {
    logger.error('Error getting chat messages:', error);
    return fallbackChatMessages.get(sessionId) || [];
  }
}

// =====================
// Chat Feedback Storage
// =====================

/**
 * Store chat feedback
 */
export async function storeChatFeedback(feedback: Partial<ChatFeedback>): Promise<ChatFeedback> {
  const feedbackId = feedback.id || generateId('feedback');
  const now = new Date();

  const feedbackData: ChatFeedback = {
    ...feedback,
    id: feedbackId,
    timestamp: now,
  } as ChatFeedback;

  try {
    const dbAvailable = await isDatabaseAvailable();

    if (dbAvailable) {
      await prisma.auditLog.create({
        data: {
          action: 'CHAT_FEEDBACK_CREATE',
          resource: 'chat_feedback',
          resourceId: feedbackId,
          details: toJson(feedbackData),
          timestamp: now,
        },
      });
    }

    fallbackChatFeedback.set(feedbackId, feedbackData);

    return feedbackData;
  } catch (error) {
    logger.error('Error storing chat feedback:', error);
    fallbackChatFeedback.set(feedbackId, feedbackData);
    return feedbackData;
  }
}
