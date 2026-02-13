/**
 * Tests for AI Recommendations Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AIRecommendationsEngine,
  getAIRecommendationsEngine,
  Workflow,
} from '../../analytics/AIRecommendations';

describe('AIRecommendationsEngine', () => {
  let engine: AIRecommendationsEngine;
  let mockWorkflow: Workflow;

  beforeEach(() => {
    engine = new AIRecommendationsEngine();
    mockWorkflow = createMockWorkflow();
  });

  it('should analyze workflow and generate recommendations', async () => {
    const analysis = await engine.analyzeWorkflow(mockWorkflow);

    expect(analysis).toBeDefined();
    expect(analysis.workflow).toBe(mockWorkflow);
    expect(analysis.recommendations).toBeInstanceOf(Array);
    expect(analysis.score.current).toBeGreaterThanOrEqual(0);
    expect(analysis.score.current).toBeLessThanOrEqual(100);
    expect(analysis.score.potential).toBeGreaterThanOrEqual(analysis.score.current);
    expect(analysis.summary).toBeTruthy();
  });

  it('should detect redundant nodes', async () => {
    const workflowWithDeadEnd: Workflow = {
      id: 'wf-1',
      name: 'Test Workflow',
      nodes: [
        { id: '1', type: 'start', data: {} },
        { id: '2', type: 'httpRequest', data: {} },
        { id: '3', type: 'filter', data: {} }, // Dead end
        { id: '4', type: 'end', data: {} },
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '4' },
      ],
    };

    const analysis = await engine.analyzeWorkflow(workflowWithDeadEnd);

    const redundantRec = analysis.recommendations.find((r) =>
      r.title.includes('Unused')
    );

    expect(redundantRec).toBeDefined();
    if (redundantRec) {
      expect(redundantRec.type).toBe('optimization');
      expect(redundantRec.suggestedChanges.length).toBeGreaterThan(0);
    }
  });

  it('should suggest parallelization', async () => {
    const workflowWithParallelizable: Workflow = {
      id: 'wf-2',
      name: 'Sequential Workflow',
      nodes: [
        { id: '1', type: 'start', data: {} },
        { id: '2', type: 'httpRequest', data: {} },
        { id: '3', type: 'httpRequest', data: {} },
        { id: '4', type: 'merge', data: {} },
        { id: '5', type: 'end', data: {} },
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '1', target: '3' },
        { id: 'e3', source: '2', target: '4' },
        { id: 'e4', source: '3', target: '4' },
        { id: 'e5', source: '4', target: '5' },
      ],
    };

    const analysis = await engine.analyzeWorkflow(workflowWithParallelizable);

    const parallelRec = analysis.recommendations.find((r) =>
      r.title.includes('Parallel')
    );

    expect(parallelRec).toBeDefined();
    if (parallelRec) {
      expect(parallelRec.type).toBe('performance');
      expect(parallelRec.impact.performance).toBeGreaterThan(0);
    }
  });

  it('should suggest caching', async () => {
    const workflowWithCacheable: Workflow = {
      id: 'wf-3',
      name: 'API Workflow',
      nodes: [
        { id: '1', type: 'start', data: {} },
        { id: '2', type: 'httpRequest', data: { method: 'GET', url: 'https://api.example.com' } },
        { id: '3', type: 'end', data: {} },
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' },
      ],
    };

    const analysis = await engine.analyzeWorkflow(workflowWithCacheable);

    const cacheRec = analysis.recommendations.find((r) =>
      r.title.includes('Caching')
    );

    expect(cacheRec).toBeDefined();
    if (cacheRec) {
      expect(cacheRec.type).toBe('cost');
      expect(cacheRec.impact.cost).toBeGreaterThan(0);
    }
  });

  it('should detect missing error handling', async () => {
    const workflowWithoutErrors: Workflow = {
      id: 'wf-4',
      name: 'No Error Handling',
      nodes: [
        { id: '1', type: 'start', data: {} },
        { id: '2', type: 'httpRequest', data: {} },
        { id: '3', type: 'database', data: {} },
        { id: '4', type: 'end', data: {} },
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' },
        { id: 'e3', source: '3', target: '4' },
      ],
    };

    const analysis = await engine.analyzeWorkflow(workflowWithoutErrors);

    const errorRec = analysis.recommendations.find((r) =>
      r.title.includes('Error Handling')
    );

    expect(errorRec).toBeDefined();
    if (errorRec) {
      expect(errorRec.type).toBe('best_practice');
    }
  });

  it('should suggest retry policy', async () => {
    const workflowWithoutRetry: Workflow = {
      id: 'wf-5',
      name: 'No Retry',
      nodes: [
        { id: '1', type: 'start', data: {} },
        { id: '2', type: 'httpRequest', data: {} },
        { id: '3', type: 'end', data: {} },
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' },
      ],
      settings: {}, // No retry policy
    };

    const analysis = await engine.analyzeWorkflow(workflowWithoutRetry);

    const retryRec = analysis.recommendations.find((r) =>
      r.title.includes('Retry')
    );

    expect(retryRec).toBeDefined();
  });

  it('should detect security issues', async () => {
    const workflowWithSecurityIssues: Workflow = {
      id: 'wf-6',
      name: 'Insecure Workflow',
      nodes: [
        { id: '1', type: 'start', data: {} },
        {
          id: '2',
          type: 'httpRequest',
          data: {
            url: 'http://api.example.com', // HTTP instead of HTTPS
            apiKey: 'hardcoded-secret', // Hardcoded secret
          },
        },
        { id: '3', type: 'end', data: {} },
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' },
      ],
    };

    const analysis = await engine.analyzeWorkflow(workflowWithSecurityIssues);

    const securityRecs = analysis.recommendations.filter(
      (r) => r.type === 'security'
    );

    expect(securityRecs.length).toBeGreaterThan(0);
  });

  it('should suggest sub-workflows for complex workflows', async () => {
    const complexWorkflow: Workflow = {
      id: 'wf-7',
      name: 'Complex Workflow',
      nodes: Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        type: 'httpRequest',
        data: {},
      })),
      edges: Array.from({ length: 24 }, (_, i) => ({
        id: `e${i + 1}`,
        source: `${i + 1}`,
        target: `${i + 2}`,
      })),
    };

    const analysis = await engine.analyzeWorkflow(complexWorkflow);

    const subWorkflowRec = analysis.recommendations.find((r) =>
      r.title.includes('Sub-Workflow')
    );

    expect(subWorkflowRec).toBeDefined();
  });

  it('should suggest webhooks over polling', async () => {
    const pollingWorkflow: Workflow = {
      id: 'wf-8',
      name: 'Polling Workflow',
      nodes: [
        { id: '1', type: 'schedule', data: {} },
        { id: '2', type: 'poll', data: {} },
        { id: '3', type: 'end', data: {} },
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' },
      ],
    };

    const analysis = await engine.analyzeWorkflow(pollingWorkflow);

    const webhookRec = analysis.recommendations.find((r) =>
      r.title.includes('Webhook')
    );

    expect(webhookRec).toBeDefined();
    if (webhookRec) {
      expect(webhookRec.type).toBe('alternative');
    }
  });

  it('should prioritize recommendations correctly', async () => {
    const analysis = await engine.analyzeWorkflow(mockWorkflow);

    // Check that critical priority comes before high
    let lastPriority = 5;
    const priorityValues = { critical: 4, high: 3, medium: 2, low: 1 };

    for (const rec of analysis.recommendations) {
      const currentPriority = priorityValues[rec.priority];
      expect(currentPriority).toBeLessThanOrEqual(lastPriority);
      lastPriority = currentPriority;
    }
  });

  it('should calculate workflow score', async () => {
    const simpleWorkflow: Workflow = {
      id: 'wf-9',
      name: 'Simple Workflow',
      nodes: [
        { id: '1', type: 'start', data: {} },
        { id: '2', type: 'httpRequest', data: {} },
        { id: '3', type: 'end', data: {} },
      ],
      edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e1-error', source: '2', target: '3', sourceHandle: 'error' },
        { id: 'e2', source: '2', target: '3' },
      ],
      settings: {
        retryPolicy: { maxRetries: 3, backoff: 'exponential' },
      },
    };

    const analysis = await engine.analyzeWorkflow(simpleWorkflow);

    // Simple workflow with good practices should score higher
    expect(analysis.score.current).toBeGreaterThan(70);
  });

  it('should provide actionable suggested changes', async () => {
    const analysis = await engine.analyzeWorkflow(mockWorkflow);

    for (const rec of analysis.recommendations) {
      expect(rec.suggestedChanges).toBeInstanceOf(Array);

      for (const change of rec.suggestedChanges) {
        expect(change.action).toMatch(/^(add|remove|modify|replace)$/);
        expect(change.target.type).toMatch(/^(node|edge|setting|workflow)$/);
        expect(change.details).toBeTruthy();
      }
    }
  });

  it('should estimate effort correctly', async () => {
    const analysis = await engine.analyzeWorkflow(mockWorkflow);

    for (const rec of analysis.recommendations) {
      expect(rec.effort).toMatch(/^(low|medium|high)$/);
    }
  });

  it('should provide confidence scores', async () => {
    const analysis = await engine.analyzeWorkflow(mockWorkflow);

    for (const rec of analysis.recommendations) {
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe('getAIRecommendationsEngine (singleton)', () => {
  it('should return the same instance', () => {
    const instance1 = getAIRecommendationsEngine();
    const instance2 = getAIRecommendationsEngine();

    expect(instance1).toBe(instance2);
  });
});

// Helper function
function createMockWorkflow(): Workflow {
  return {
    id: 'wf-mock',
    name: 'Mock Workflow',
    nodes: [
      { id: '1', type: 'start', data: {} },
      { id: '2', type: 'httpRequest', data: { method: 'GET' } },
      { id: '3', type: 'filter', data: {} },
      { id: '4', type: 'database', data: {} },
      { id: '5', type: 'end', data: {} },
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '4', target: '5' },
    ],
  };
}
