/**
 * Message Handlers
 * Route handlers for chat message operations
 */

import type { Request, Response } from 'express';
import { logger } from '../../../../services/SimpleLogger';
import {
  storeChatSession,
  getChatSession,
  updateChatSession,
  storeChatMessage,
  getChatMessages,
  getChatConfig,
  storeChatFeedback,
} from './storage';
import { generateAIResponse } from './aiHandlers';
import type { AIConfig } from './types';

/**
 * POST /api/chat/:workflowId/message
 * Send a message (HTTP fallback for non-WebSocket clients)
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const { workflowId } = req.params;
    const { sessionId, content, attachments } = req.body;

    let session = await getChatSession(sessionId);
    if (!session) {
      // Create session if it doesn't exist
      session = await storeChatSession({
        id: sessionId,
        workflowId,
        messages: [],
        metadata: {
          startedAt: new Date(),
          lastMessageAt: new Date(),
          messageCount: 0,
          totalTokens: 0,
        },
        status: 'active',
      });
    }

    // Add user message
    await storeChatMessage(sessionId, {
      role: 'user',
      content,
      attachments,
    });

    // Get chat configuration for AI settings
    const chatConfig = await getChatConfig(workflowId);
    const aiConfig: AIConfig = chatConfig?.aiConfig || {};

    // Build conversation history for context
    const existingMessages = await getChatMessages(sessionId);
    const conversationHistory = existingMessages.map((msg) => ({
      role: msg.role as string,
      content: msg.content as string,
    }));

    // Add current user message
    conversationHistory.push({
      role: 'user',
      content,
    });

    let assistantMessage;

    try {
      // Generate real AI response
      const aiResponse = await generateAIResponse(conversationHistory, {
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
        systemPrompt: aiConfig.systemPrompt,
      });

      assistantMessage = await storeChatMessage(sessionId, {
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          model: aiResponse.model,
          tokens: { input: aiResponse.usage.input, output: aiResponse.usage.output },
          latency: aiResponse.latency,
          provider: 'llm-service',
        },
      });
    } catch (aiError) {
      // Fallback to simulated response if AI service fails
      logger.warn('AI service failed, using fallback response:', aiError);

      const errorMessage =
        aiError instanceof Error ? aiError.message : 'AI service unavailable';

      assistantMessage = await storeChatMessage(sessionId, {
        role: 'assistant',
        content:
          `I apologize, but I'm currently unable to process your request due to a technical issue: ${errorMessage}. ` +
          `Please ensure an AI provider is configured (set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, or AZURE_OPENAI_API_KEY in your environment). ` +
          `Your message was: "${content}"`,
        metadata: {
          model: 'fallback',
          tokens: { input: content.length / 4, output: 50 },
          latency: 0,
          error: errorMessage,
        },
      });
    }

    // Update session metadata
    const messages = await getChatMessages(sessionId);
    await updateChatSession(sessionId, {
      metadata: {
        ...session.metadata,
        lastMessageAt: new Date(),
        messageCount: messages.length,
      },
    });

    res.json({
      success: true,
      data: assistantMessage,
    });
  } catch (error) {
    logger.error('Failed to process message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
    });
  }
}

/**
 * POST /api/chat/:workflowId/feedback
 * Submit feedback for a message
 */
export async function submitFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { workflowId } = req.params;
    const { messageId, sessionId, rating, comment } = req.body;

    const feedback = await storeChatFeedback({
      workflowId,
      sessionId,
      messageId,
      rating,
      comment,
    });

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    logger.error('Failed to submit feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
}
