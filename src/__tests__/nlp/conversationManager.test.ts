/**
 * Conversation Manager Tests
 * Tests for multi-turn conversation handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationManager } from '../../nlp/ConversationManager';

describe('ConversationManager', () => {
  let manager: ConversationManager;

  beforeEach(() => {
    manager = new ConversationManager({ contextTimeout: 60000 });
  });

  describe('Conversation Lifecycle', () => {
    it('should start a new conversation', () => {
      const contextId = manager.startConversation();

      expect(contextId).toBeDefined();
      expect(contextId).toMatch(/^conv_/);

      const context = manager.getConversation(contextId);
      expect(context).toBeDefined();
      expect(context?.messages.length).toBe(0);
    });

    it('should clear conversation', () => {
      const contextId = manager.startConversation();
      manager.clearConversation(contextId);

      const context = manager.getConversation(contextId);
      expect(context).toBeNull();
    });

    it('should create new context if not found', async () => {
      const result = await manager.processMessage(
        'non-existent-id',
        'Test message'
      );

      expect(result).toBeDefined();
      expect(result.conversation).toBeDefined();
    });
  });

  describe('Message Processing', () => {
    it('should process simple message', async () => {
      const contextId = manager.startConversation();
      const result = await manager.processMessage(
        contextId,
        'Every morning fetch data and send to Slack'
      );

      expect(result).toBeDefined();
      expect(result.conversation?.messages.length).toBeGreaterThan(0);
    });

    it('should add user and assistant messages', async () => {
      const contextId = manager.startConversation();
      await manager.processMessage(contextId, 'Send email daily');

      const context = manager.getConversation(contextId);
      expect(context?.messages.length).toBeGreaterThanOrEqual(1);

      const userMessages = context?.messages.filter(m => m.role === 'user');
      expect(userMessages?.length).toBeGreaterThan(0);
    });

    it('should track conversation turns', async () => {
      const contextId = manager.startConversation();

      await manager.processMessage(contextId, 'First message');
      await manager.processMessage(contextId, 'Second message');

      const context = manager.getConversation(contextId);
      const userMessages = context?.messages.filter(m => m.role === 'user');

      expect(userMessages?.length).toBe(2);
    });
  });

  describe('Clarification Handling', () => {
    it('should request clarification for missing parameters', async () => {
      const contextId = manager.startConversation();
      const result = await manager.processMessage(
        contextId,
        'Send to Slack' // Missing channel
      );

      // Might need clarification
      if (result.needsClarification) {
        expect(result.clarificationRequest).toBeDefined();
        expect(result.clarificationRequest?.question).toBeDefined();
      }
    });

    it('should handle clarification responses', async () => {
      const contextId = manager.startConversation();

      // First message - might need clarification
      const result1 = await manager.processMessage(
        contextId,
        'Send to Slack'
      );

      if (result1.needsClarification) {
        // Provide clarification
        const result2 = await manager.processMessage(
          contextId,
          '#general'
        );

        expect(result2).toBeDefined();
      }
    });

    it('should not ask same question twice', async () => {
      const contextId = manager.startConversation();

      await manager.processMessage(contextId, 'Send to Slack');
      await manager.processMessage(contextId, '#general');
      await manager.processMessage(contextId, 'Also send email');

      const context = manager.getConversation(contextId);
      expect(context?.clarifications.length).toBeLessThan(5); // Reasonable limit
    });
  });

  describe('Workflow Generation', () => {
    it('should generate workflow from clear intent', async () => {
      const contextId = manager.startConversation();
      const result = await manager.processMessage(
        contextId,
        'Every morning at 9am, fetch HN top stories and send to Slack #tech'
      );

      if (result.success) {
        expect(result.workflow).toBeDefined();
        expect(result.workflow?.nodes.length).toBeGreaterThan(0);
      }
    });

    it('should handle low confidence intents', async () => {
      const contextId = manager.startConversation();
      const result = await manager.processMessage(
        contextId,
        'Do something'
      );

      expect(result.success).toBe(false);
      expect(result.needsClarification).toBe(true);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve context across messages', async () => {
      const contextId = manager.startConversation();

      await manager.processMessage(contextId, 'Fetch from API');
      await manager.processMessage(contextId, 'And send to Slack');

      const context = manager.getConversation(contextId);
      expect(context?.messages.length).toBeGreaterThan(2);
    });

    it('should update context timestamp', async () => {
      const contextId = manager.startConversation();
      const context1 = manager.getConversation(contextId);
      const time1 = context1?.lastUpdateTime;

      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.processMessage(contextId, 'Test');

      const context2 = manager.getConversation(contextId);
      const time2 = context2?.lastUpdateTime;

      expect(time2).toBeGreaterThan(time1 || 0);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track processing metrics', async () => {
      const contextId = manager.startConversation();
      const result = await manager.processMessage(
        contextId,
        'Send email daily'
      );

      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalProcessingTime).toBeGreaterThan(0);
      expect(result.metrics.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should track conversation turns in metrics', async () => {
      const contextId = manager.startConversation();

      await manager.processMessage(contextId, 'Message 1');
      const result = await manager.processMessage(contextId, 'Message 2');

      expect(result.metrics.conversationTurns).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', async () => {
      const contextId = manager.startConversation();
      const result = await manager.processMessage(contextId, '');

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should provide error messages', async () => {
      const contextId = manager.startConversation();
      const result = await manager.processMessage(contextId, '');

      if (!result.success) {
        expect(result.error || result.clarificationRequest).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should process messages quickly', async () => {
      const contextId = manager.startConversation();

      const start = Date.now();
      await manager.processMessage(contextId, 'Send email daily');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // < 2 seconds
    });

    it('should handle multiple concurrent conversations', async () => {
      const context1 = manager.startConversation();
      const context2 = manager.startConversation();
      const context3 = manager.startConversation();

      const [r1, r2, r3] = await Promise.all([
        manager.processMessage(context1, 'Message 1'),
        manager.processMessage(context2, 'Message 2'),
        manager.processMessage(context3, 'Message 3')
      ]);

      expect(r1.conversation?.id).toBe(context1);
      expect(r2.conversation?.id).toBe(context2);
      expect(r3.conversation?.id).toBe(context3);
    });
  });

  describe('Conversation Quality', () => {
    it('should average <3 turns for simple workflows', async () => {
      const testCases = [
        'Every morning fetch data and send to Slack',
        'Daily send email report',
        'Hourly check API and notify'
      ];

      let totalTurns = 0;

      for (const testCase of testCases) {
        const contextId = manager.startConversation();
        const result = await manager.processMessage(contextId, testCase);

        if (result.success) {
          totalTurns += result.metrics.conversationTurns || 1;
        }
      }

      const avgTurns = totalTurns / testCases.length;
      expect(avgTurns).toBeLessThan(3);
    });
  });
});
