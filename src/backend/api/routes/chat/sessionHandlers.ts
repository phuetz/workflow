/**
 * Session Handlers
 * Route handlers for chat session operations
 */

import type { Request, Response } from 'express';
import { logger } from '../../../../services/SimpleLogger';
import {
  storeChatSession,
  getChatSession,
  updateChatSession,
  getSessionsByWorkflow,
  getChatMessages,
} from './storage';

/**
 * POST /api/chat/:workflowId/session
 * Create a new chat session
 */
export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const { workflowId } = req.params;
    const { userId } = req.body;

    const session = await storeChatSession({
      workflowId,
      userId,
      messages: [],
      metadata: {
        startedAt: new Date(),
        lastMessageAt: new Date(),
        messageCount: 0,
        totalTokens: 0,
      },
      status: 'active',
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('Failed to create chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session',
    });
  }
}

/**
 * GET /api/chat/:workflowId/session/:sessionId
 * Get chat session
 */
export async function getSession(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;
    const session = await getChatSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Chat session not found',
      });
      return;
    }

    const messages = await getChatMessages(sessionId);

    res.json({
      success: true,
      data: {
        ...session,
        messages,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat session',
    });
  }
}

/**
 * GET /api/chat/:workflowId/sessions
 * Get all sessions for a workflow
 */
export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const { workflowId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { sessions, total } = await getSessionsByWorkflow(
      workflowId,
      Number(page),
      Number(limit)
    );

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
    });
  }
}

/**
 * DELETE /api/chat/:workflowId/session/:sessionId
 * End a chat session
 */
export async function endSession(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    const session = await getChatSession(sessionId);
    if (session) {
      await updateChatSession(sessionId, {
        status: 'ended',
        endedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Session ended successfully',
    });
  } catch (error) {
    logger.error('Failed to end session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session',
    });
  }
}
