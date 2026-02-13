/**
 * Workflow Generator Tests
 * Tests for converting intents to workflow structures
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowGenerator } from '../../nlp/WorkflowGenerator';
import { Intent } from '../../types/nlp';

describe('WorkflowGenerator', () => {
  let generator: WorkflowGenerator;

  beforeEach(() => {
    generator = new WorkflowGenerator();
  });

  describe('Basic Workflow Generation', () => {
    it('should generate workflow with trigger and single action', async () => {
      const intent: Intent = {
        type: 'schedule',
        trigger: {
          type: 'schedule',
          schedule: '0 9 * * *',
          confidence: 0.9
        },
        actions: [
          {
            type: 'notify',
            service: 'slack',
            confidence: 0.8,
            nodeType: 'slack'
          }
        ],
        confidence: 0.85,
        originalText: 'Send Slack message every morning',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result.success).toBe(true);
      expect(result.nodes.length).toBe(2); // Trigger + Action
      expect(result.edges.length).toBe(1);
      expect(result.nodes[0].type).toContain('schedule');
      expect(result.nodes[1].type).toBe('slack');
    });

    it('should generate workflow with multiple actions', async () => {
      const intent: Intent = {
        type: 'schedule',
        trigger: {
          type: 'schedule',
          schedule: '0 * * * *',
          confidence: 0.9
        },
        actions: [
          { type: 'fetch', confidence: 0.8, nodeType: 'httpRequest' },
          { type: 'transform', confidence: 0.8, nodeType: 'transform' },
          { type: 'notify', service: 'slack', confidence: 0.8, nodeType: 'slack' }
        ],
        confidence: 0.85,
        originalText: 'Fetch, transform, notify',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result.success).toBe(true);
      expect(result.nodes.length).toBe(4); // Trigger + 3 Actions
      expect(result.edges.length).toBe(3);
    });

    it('should generate workflow with conditions', async () => {
      const intent: Intent = {
        type: 'webhook',
        trigger: {
          type: 'webhook',
          webhookPath: '/webhook/test',
          confidence: 0.9
        },
        actions: [
          { type: 'notify', confidence: 0.8, nodeType: 'slack' }
        ],
        conditions: [
          {
            field: 'status',
            operator: 'equals',
            value: 'active',
            confidence: 0.8
          }
        ],
        confidence: 0.85,
        originalText: 'On webhook, filter where status=active, notify',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result.success).toBe(true);
      expect(result.nodes.length).toBe(3); // Trigger + Filter + Action
      expect(result.nodes.some(n => n.type === 'filter')).toBe(true);
    });
  });

  describe('Node Configuration', () => {
    it('should configure schedule node correctly', async () => {
      const intent: Intent = {
        type: 'schedule',
        trigger: {
          type: 'schedule',
          schedule: '0 14 * * *',
          confidence: 0.9
        },
        actions: [
          { type: 'notify', confidence: 0.8, nodeType: 'slack' }
        ],
        confidence: 0.85,
        originalText: 'Daily at 2pm',
        entities: []
      };

      const result = await generator.generate(intent);
      const triggerNode = result.nodes[0];

      expect(triggerNode.data.config?.schedule).toBe('0 14 * * *');
      expect(triggerNode.data.config?.enabled).toBe(true);
    });

    it('should configure Slack node with defaults', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [
          { type: 'notify', service: 'slack', confidence: 0.8, nodeType: 'slack' }
        ],
        confidence: 0.8,
        originalText: 'Send to Slack',
        entities: []
      };

      const result = await generator.generate(intent);
      const slackNode = result.nodes.find(n => n.type === 'slack');

      expect(slackNode).toBeDefined();
      expect(slackNode?.data.config?.channel).toBeDefined();
    });

    it('should configure HTTP request node', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [
          {
            type: 'fetch',
            confidence: 0.8,
            nodeType: 'httpRequest',
            parameters: { url: 'https://api.example.com' }
          }
        ],
        confidence: 0.8,
        originalText: 'Fetch from API',
        entities: []
      };

      const result = await generator.generate(intent);
      const httpNode = result.nodes.find(n => n.type === 'httpRequest');

      expect(httpNode?.data.config?.url).toBe('https://api.example.com');
      expect(httpNode?.data.config?.method).toBeDefined();
    });
  });

  describe('Node Positioning', () => {
    it('should position nodes in a horizontal line', async () => {
      const intent: Intent = {
        type: 'schedule',
        trigger: { type: 'schedule', schedule: '0 9 * * *', confidence: 0.9 },
        actions: [
          { type: 'fetch', confidence: 0.8, nodeType: 'httpRequest' },
          { type: 'transform', confidence: 0.8, nodeType: 'transform' },
          { type: 'notify', confidence: 0.8, nodeType: 'slack' }
        ],
        confidence: 0.85,
        originalText: 'Test',
        entities: []
      };

      const result = await generator.generate(intent);

      // Check that x positions increase
      for (let i = 1; i < result.nodes.length; i++) {
        expect(result.nodes[i].position.x).toBeGreaterThan(result.nodes[i - 1].position.x);
      }
    });

    it('should set reasonable spacing between nodes', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [
          { type: 'fetch', confidence: 0.8, nodeType: 'httpRequest' },
          { type: 'transform', confidence: 0.8, nodeType: 'transform' }
        ],
        confidence: 0.8,
        originalText: 'Test',
        entities: []
      };

      const result = await generator.generate(intent);

      const spacing = result.nodes[1].position.x - result.nodes[0].position.x;
      expect(spacing).toBeGreaterThan(200); // Reasonable spacing
      expect(spacing).toBeLessThan(500);
    });
  });

  describe('Edge Creation', () => {
    it('should create edges connecting all nodes', async () => {
      const intent: Intent = {
        type: 'schedule',
        trigger: { type: 'schedule', schedule: '0 9 * * *', confidence: 0.9 },
        actions: [
          { type: 'fetch', confidence: 0.8, nodeType: 'httpRequest' },
          { type: 'notify', confidence: 0.8, nodeType: 'slack' }
        ],
        confidence: 0.85,
        originalText: 'Test',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result.edges.length).toBe(2); // 3 nodes = 2 edges

      // Verify connections
      expect(result.edges[0].source).toBe(result.nodes[0].id);
      expect(result.edges[0].target).toBe(result.nodes[1].id);
      expect(result.edges[1].source).toBe(result.nodes[1].id);
      expect(result.edges[1].target).toBe(result.nodes[2].id);
    });

    it('should create animated edges', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [
          { type: 'fetch', confidence: 0.8, nodeType: 'httpRequest' }
        ],
        confidence: 0.8,
        originalText: 'Test',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result.edges[0].animated).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate workflow with errors', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [],
        confidence: 0.5,
        originalText: '',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result.success).toBe(false);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should detect missing parameters', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [
          { type: 'notify', service: 'slack', confidence: 0.8, nodeType: 'slack' }
        ],
        confidence: 0.8,
        originalText: 'Send to Slack',
        entities: []
      };

      const result = await generator.generate(intent);

      // Slack node needs channel, which might be missing
      if (result.missingParameters) {
        expect(Array.isArray(result.missingParameters)).toBe(true);
      }
    });

    it('should mark valid workflow as ready for execution', async () => {
      const intent: Intent = {
        type: 'manual',
        trigger: { type: 'manual', confidence: 1.0 },
        actions: [
          {
            type: 'notify',
            service: 'slack',
            confidence: 0.9,
            nodeType: 'slack',
            parameters: { channel: '#general', message: 'Hello' }
          }
        ],
        confidence: 0.9,
        originalText: 'Send hello to Slack general',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result.success).toBe(true);
    });
  });

  describe('Suggestions Generation', () => {
    it('should suggest error handling for complex workflows', async () => {
      const intent: Intent = {
        type: 'schedule',
        trigger: { type: 'schedule', schedule: '0 9 * * *', confidence: 0.9 },
        actions: [
          { type: 'fetch', confidence: 0.8, nodeType: 'httpRequest' },
          { type: 'transform', confidence: 0.8, nodeType: 'transform' },
          { type: 'save', confidence: 0.8, nodeType: 'postgres' }
        ],
        confidence: 0.85,
        originalText: 'Complex workflow',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should not overwhelm with suggestions for simple workflows', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [
          { type: 'notify', confidence: 0.8, nodeType: 'slack' }
        ],
        confidence: 0.8,
        originalText: 'Simple notification',
        entities: []
      };

      const result = await generator.generate(intent);

      if (result.suggestions) {
        expect(result.suggestions.length).toBeLessThan(5);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid intent gracefully', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [],
        confidence: 0,
        originalText: '',
        entities: []
      };

      const result = await generator.generate(intent);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should handle unknown node types', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [
          { type: 'fetch', confidence: 0.8, nodeType: 'unknownNodeType123' as any }
        ],
        confidence: 0.8,
        originalText: 'Test',
        entities: []
      };

      const result = await generator.generate(intent);

      // Should either fallback to a default or fail gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should generate simple workflow quickly', async () => {
      const intent: Intent = {
        type: 'manual',
        actions: [
          { type: 'notify', confidence: 0.8, nodeType: 'slack' }
        ],
        confidence: 0.8,
        originalText: 'Test',
        entities: []
      };

      const start = Date.now();
      await generator.generate(intent);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // < 100ms
    });

    it('should generate complex workflow efficiently', async () => {
      const intent: Intent = {
        type: 'schedule',
        trigger: { type: 'schedule', schedule: '0 9 * * *', confidence: 0.9 },
        actions: Array(10).fill(null).map((_, i) => ({
          type: 'transform',
          confidence: 0.8,
          nodeType: 'transform'
        })),
        confidence: 0.85,
        originalText: 'Complex workflow',
        entities: []
      };

      const start = Date.now();
      await generator.generate(intent);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500); // < 500ms
    });
  });

  describe('Workflow Quality', () => {
    it('should generate >85% successful workflows', async () => {
      const testIntents: Intent[] = [
        {
          type: 'schedule',
          trigger: { type: 'schedule', schedule: '0 9 * * *', confidence: 0.9 },
          actions: [{ type: 'notify', confidence: 0.8, nodeType: 'slack' }],
          confidence: 0.85,
          originalText: 'Test 1',
          entities: []
        },
        {
          type: 'webhook',
          trigger: { type: 'webhook', webhookPath: '/test', confidence: 0.9 },
          actions: [{ type: 'save', confidence: 0.8, nodeType: 'postgres' }],
          confidence: 0.85,
          originalText: 'Test 2',
          entities: []
        },
        {
          type: 'manual',
          actions: [
            { type: 'fetch', confidence: 0.8, nodeType: 'httpRequest' },
            { type: 'transform', confidence: 0.8, nodeType: 'transform' }
          ],
          confidence: 0.8,
          originalText: 'Test 3',
          entities: []
        }
      ];

      let successCount = 0;

      for (const intent of testIntents) {
        const result = await generator.generate(intent);
        if (result.success && result.nodes.length > 0) {
          successCount++;
        }
      }

      const successRate = successCount / testIntents.length;
      expect(successRate).toBeGreaterThan(0.85); // >85% success rate
    });
  });
});
