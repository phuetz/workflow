/**
 * Stream Handlers
 * Route handlers for streaming chat responses via Server-Sent Events
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
} from './storage';
import { generateAIResponseStream } from './aiHandlers';
import type { AIConfig } from './types';

/**
 * POST /api/chat/:workflowId/stream
 * Send a message with streaming response (Server-Sent Events)
 */
export async function streamMessage(req: Request, res: Response): Promise<void> {
  try {
    const { workflowId } = req.params;
    const { sessionId, content, attachments } = req.body;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let session = await getChatSession(sessionId);
    if (!session) {
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

    // Build conversation history
    const existingMessages = await getChatMessages(sessionId);
    const conversationHistory = existingMessages.map((msg) => ({
      role: msg.role as string,
      content: msg.content as string,
    }));

    conversationHistory.push({
      role: 'user',
      content,
    });

    let fullContent = '';
    let totalUsage = { input: 0, output: 0 };

    try {
      // Generate streaming AI response
      const stream = generateAIResponseStream(conversationHistory, {
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
        systemPrompt: aiConfig.systemPrompt,
      });

      for await (const chunk of stream) {
        fullContent += chunk.chunk;

        // Send chunk via SSE
        res.write(`data: ${JSON.stringify({ chunk: chunk.chunk, done: chunk.done })}\n\n`);

        if (chunk.usage) {
          totalUsage = chunk.usage;
        }

        if (chunk.done) {
          break;
        }
      }

      // Store the complete assistant message
      const assistantMessage = await storeChatMessage(sessionId, {
        role: 'assistant',
        content: fullContent,
        metadata: {
          model: aiConfig.model || 'default',
          tokens: totalUsage,
          streaming: true,
          provider: 'llm-service',
        },
      });

      // Send completion event
      res.write(
        `data: ${JSON.stringify({ done: true, messageId: assistantMessage.id, usage: totalUsage })}\n\n`
      );
    } catch (aiError) {
      logger.error('Streaming AI response failed:', aiError);

      const errorMessage = aiError instanceof Error ? aiError.message : 'AI service unavailable';

      // Send error event
      res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);

      // Store error message
      await storeChatMessage(sessionId, {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${errorMessage}`,
        metadata: {
          model: 'fallback',
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

    res.end();
  } catch (error) {
    logger.error('Failed to process streaming message:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to process message', done: true })}\n\n`);
    res.end();
  }
}
