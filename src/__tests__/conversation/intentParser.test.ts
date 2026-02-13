/**
 * IntentParser Tests
 * Agent 53 - Conversational Workflow Editor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentParser } from '../../conversation/IntentParser';
import { ConversationContext } from '../../conversation/types';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

describe('IntentParser', () => {
  let parser: IntentParser;
  let mockContext: ConversationContext;

  beforeEach(() => {
    parser = new IntentParser();
    
    mockContext = {
      sessionId: 'test-session',
      workflowId: 'test-workflow',
      history: [],
      pendingChanges: [],
      appliedChanges: [],
      userIntent: null,
      currentNodes: [],
      currentEdges: [],
      startTime: new Date(),
    };
  });

  describe('Add Node Intent', () => {
    it('should parse "add HTTP node"', async () => {
      const intent = await parser.parse('add an HTTP node', mockContext);
      expect(intent.type).toBe('add_node');
      expect(intent.entities.nodeTypes).toContain('http-request');
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it('should parse "create database"', async () => {
      const intent = await parser.parse('create a database node', mockContext);
      expect(intent.type).toBe('add_node');
      expect(intent.entities.nodeTypes).toContain('database');
    });

    it('should normalize node type aliases', async () => {
      const intent = await parser.parse('add an API node', mockContext);
      expect(intent.entities.nodeTypes).toContain('http-request');
    });
  });

  describe('Remove Node Intent', () => {
    beforeEach(() => {
      mockContext.currentNodes = [
        {
          id: 'node1',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: {
            id: 'node1',
            type: 'email',
            label: 'Send Email',
            position: { x: 0, y: 0 },
            icon: '📧',
            color: '#f59e0b',
            inputs: 1,
            outputs: 1,
          },
        },
      ];
    });

    it('should parse "remove node1"', async () => {
      const intent = await parser.parse('remove node1', mockContext);
      expect(intent.type).toBe('remove_node');
      expect(intent.entities.nodeIds).toContain('node1');
    });

    it('should find node by label', async () => {
      const intent = await parser.parse('delete Send Email', mockContext);
      expect(intent.type).toBe('remove_node');
      expect(intent.entities.nodeIds).toBeDefined();
    });
  });

  describe('Optimization Intent', () => {
    it('should parse "make faster"', async () => {
      const intent = await parser.parse('make this faster', mockContext);
      expect(intent.type).toBe('optimize_workflow');
      expect(intent.confidence).toBeGreaterThan(0.6);
    });

    it('should parse "optimize"', async () => {
      const intent = await parser.parse('optimize the workflow', mockContext);
      expect(intent.type).toBe('optimize_workflow');
    });
  });

  describe('Explanation Intent', () => {
    it('should parse "explain workflow"', async () => {
      const intent = await parser.parse('explain this workflow', mockContext);
      expect(intent.type).toBe('explain_workflow');
    });

    it('should parse "how does it work"', async () => {
      const intent = await parser.parse('how does this work', mockContext);
      expect(intent.type).toBe('explain_workflow');
    });
  });

  describe('Confidence Scoring', () => {
    it('should give high confidence for exact matches', async () => {
      const intent = await parser.parse('add an HTTP request node', mockContext);
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it('should give lower confidence for ambiguous queries', async () => {
      const intent = await parser.parse('maybe do something', mockContext);
      expect(intent.confidence).toBeLessThan(0.5);
    });
  });
});
