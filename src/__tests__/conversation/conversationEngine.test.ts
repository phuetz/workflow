/**
 * ConversationEngine Tests
 * Agent 53 - Conversational Workflow Editor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationEngine } from '../../conversation/ConversationEngine';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

describe('ConversationEngine', () => {
  let engine: ConversationEngine;
  let sessionId: string;
  let mockNodes: WorkflowNode[];
  let mockEdges: WorkflowEdge[];

  beforeEach(() => {
    engine = new ConversationEngine();
    
    mockNodes = [
      {
        id: 'node1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          id: 'node1',
          type: 'http-request',
          label: 'API Call',
          position: { x: 100, y: 100 },
          icon: '🌐',
          color: '#3b82f6',
          inputs: 1,
          outputs: 1,
        },
      },
    ];

    mockEdges = [];

    const context = engine.createContext('test-workflow', mockNodes, mockEdges);
    sessionId = context.sessionId;
  });

  describe('Intent Recognition', () => {
    it('should recognize add node intent', async () => {
      const response = await engine.processMessage('add an email node', sessionId);
      expect(response.message).toContain('email');
      expect(response.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize remove node intent', async () => {
      const response = await engine.processMessage('remove node1', sessionId);
      expect(response.message).toContain('remove');
      expect(response.needsConfirmation).toBe(true);
    });

    it('should recognize optimization intent', async () => {
      const response = await engine.processMessage('make this faster', sessionId);
      expect(response.message).toContain('optimi');
    });

    it('should recognize explanation intent', async () => {
      const response = await engine.processMessage('explain this workflow', sessionId);
      expect(response.message).toContain('workflow');
    });
  });

  describe('Workflow Modification', () => {
    it('should add node successfully', async () => {
      await engine.processMessage('add a database node', sessionId);
      const applyResponse = await engine.processMessage('yes', sessionId);
      
      const context = engine.getContext(sessionId);
      expect(context?.currentNodes.length).toBe(2);
    });

    it('should remove node successfully', async () => {
      await engine.processMessage('remove node1', sessionId);
      await engine.applyChanges(sessionId);
      
      const context = engine.getContext(sessionId);
      expect(context?.currentNodes.length).toBe(0);
    });

    it('should handle undo correctly', async () => {
      await engine.processMessage('add a filter node', sessionId);
      await engine.applyChanges(sessionId);
      
      const undoResponse = await engine.processMessage('undo', sessionId);
      expect(undoResponse.message).toContain('Undid');
    });
  });

  describe('Conversation Context', () => {
    it('should maintain conversation history', async () => {
      await engine.processMessage('add a node', sessionId);
      await engine.processMessage('explain it', sessionId);
      
      const context = engine.getContext(sessionId);
      expect(context?.history.length).toBeGreaterThan(2);
    });

    it('should track pending changes', async () => {
      await engine.processMessage('add an email node', sessionId);
      
      const context = engine.getContext(sessionId);
      expect(context?.pendingChanges.length).toBeGreaterThan(0);
    });
  });
});
