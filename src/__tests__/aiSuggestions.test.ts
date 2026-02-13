/**
 * Comprehensive Tests for AI Suggestions Features
 *
 * Tests for auto-naming, smart recommendations, completions,
 * and quality analysis.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { autoNamingService } from '../ai/AutoNaming';
import { workflowRecommender } from '../ai/WorkflowRecommender';
import { smartCompletionService } from '../ai/SmartCompletion';
import { parameterSuggester } from '../ai/ParameterSuggester';
import { qualityAnalyzer } from '../ai/QualityAnalyzer';
import { patternMatcher } from '../ai/PatternMatcher';
import { contextAnalyzer } from '../ai/ContextAnalyzer';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

describe('Auto-Naming Service', () => {
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];

  beforeEach(() => {
    nodes = [];
    edges = [];
  });

  it('should generate meaningful name for HTTP GET request', () => {
    const node: WorkflowNode = {
      id: '1',
      type: 'httpRequest',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'httpRequest',
        label: 'HTTP Request',
        position: { x: 0, y: 0 },
        icon: '🌐',
        color: '#10b981',
        inputs: 1,
        outputs: 1,
        config: {
          method: 'GET',
          url: 'https://api.example.com/users'
        }
      }
    };

    const result = autoNamingService.generateNodeName(node, [node], []);

    expect(result.suggestedName).toContain('Fetch');
    expect(result.suggestedName.toLowerCase()).toContain('user');
    expect(result.confidence).toBeGreaterThan(70);
  });

  it('should generate name for database operation', () => {
    const node: WorkflowNode = {
      id: '1',
      type: 'database',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'database',
        label: 'Database',
        position: { x: 0, y: 0 },
        icon: '🗄️',
        color: '#f59e0b',
        inputs: 1,
        outputs: 1,
        config: {
          operation: 'SELECT',
          table: 'customers'
        }
      }
    };

    const result = autoNamingService.generateNodeName(node, [node], []);

    expect(result.suggestedName).toContain('Query');
    expect(result.suggestedName).toContain('Customers');
  });

  it('should add "Trigger:" prefix for first node', () => {
    const node: WorkflowNode = {
      id: '1',
      type: 'webhook',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'webhook',
        label: 'Webhook',
        position: { x: 0, y: 0 },
        icon: '🔗',
        color: '#3b82f6',
        inputs: 0,
        outputs: 1,
        config: {}
      }
    };

    const edge: WorkflowEdge = {
      id: 'e1-2',
      source: '1',
      target: '2'
    };

    const result = autoNamingService.generateNodeName(node, [node], [edge]);

    expect(result.suggestedName).toContain('Trigger');
  });

  it('should ensure uniqueness of names', () => {
    const node1: WorkflowNode = {
      id: '1',
      type: 'httpRequest',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'httpRequest',
        label: 'Fetch Users from API',
        position: { x: 0, y: 0 },
        icon: '🌐',
        color: '#10b981',
        inputs: 1,
        outputs: 1,
        config: { method: 'GET', url: '/api/users' }
      }
    };

    const node2: WorkflowNode = {
      id: '2',
      type: 'httpRequest',
      position: { x: 0, y: 100 },
      data: {
        id: '2',
        type: 'httpRequest',
        label: 'HTTP Request',
        position: { x: 0, y: 100 },
        icon: '🌐',
        color: '#10b981',
        inputs: 1,
        outputs: 1,
        config: { method: 'GET', url: '/api/users' }
      }
    };

    // Clear cache to ensure fresh generation
    autoNamingService.clearCache();

    const result2 = autoNamingService.generateNodeName(node2, [node1, node2], []);

    // Should add a number to make it unique
    expect(result2.suggestedName).toMatch(/Fetch Users from API \d+/);
  });

  it('should analyze workflow naming quality', () => {
    const goodNodes: WorkflowNode[] = [
      {
        id: '1',
        type: 'webhook',
        position: { x: 0, y: 0 },
        data: {
          id: '1',
          type: 'webhook',
          label: 'Receive Webhook from Stripe',
          position: { x: 0, y: 0 },
          icon: '🔗',
          color: '#3b82f6',
          inputs: 0,
          outputs: 1
        }
      },
      {
        id: '2',
        type: 'database',
        position: { x: 0, y: 100 },
        data: {
          id: '2',
          type: 'database',
          label: 'Save Payment to Database',
          position: { x: 0, y: 100 },
          icon: '🗄️',
          color: '#f59e0b',
          inputs: 1,
          outputs: 1
        }
      }
    ];

    const analysis = autoNamingService.analyzeWorkflowNaming(goodNodes);

    expect(analysis.score).toBeGreaterThan(60);
    expect(analysis.issues.length).toBe(0);
  });
});

describe('Workflow Recommender', () => {
  it('should suggest next nodes after HTTP request', () => {
    const httpNode: WorkflowNode = {
      id: '1',
      type: 'httpRequest',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'httpRequest',
        label: 'API Call',
        position: { x: 0, y: 0 },
        icon: '🌐',
        color: '#10b981',
        inputs: 1,
        outputs: 1
      }
    };

    const suggestions = workflowRecommender.suggestNextNodes({
      currentNode: httpNode,
      allNodes: [httpNode],
      edges: [],
      availableNodeTypes: []
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.nodeType === 'if')).toBe(true);
  });

  it('should suggest error handling for webhook', () => {
    const webhookNode: WorkflowNode = {
      id: '1',
      type: 'webhook',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'webhook',
        label: 'Webhook',
        position: { x: 0, y: 0 },
        icon: '🔗',
        color: '#3b82f6',
        inputs: 0,
        outputs: 1
      }
    };

    const suggestions = workflowRecommender.suggestNextNodes({
      currentNode: webhookNode,
      allNodes: [webhookNode],
      edges: [],
      availableNodeTypes: []
    });

    const validationSuggestion = suggestions.find(s => s.nodeType === 'if');
    expect(validationSuggestion).toBeDefined();
    expect(validationSuggestion?.confidence).toBeGreaterThan(80);
  });

  it('should suggest optimizations for API in loop', () => {
    const loopNode: WorkflowNode = {
      id: '1',
      type: 'forEach',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'forEach',
        label: 'For Each',
        position: { x: 0, y: 0 },
        icon: '🔁',
        color: '#8b5cf6',
        inputs: 1,
        outputs: 1
      }
    };

    const apiNode: WorkflowNode = {
      id: '2',
      type: 'httpRequest',
      position: { x: 0, y: 100 },
      data: {
        id: '2',
        type: 'httpRequest',
        label: 'API Call',
        position: { x: 0, y: 100 },
        icon: '🌐',
        color: '#10b981',
        inputs: 1,
        outputs: 1
      }
    };

    const edge: WorkflowEdge = {
      id: 'e1-2',
      source: '1',
      target: '2'
    };

    const optimizations = workflowRecommender.suggestOptimizations({
      allNodes: [loopNode, apiNode],
      edges: [edge],
      availableNodeTypes: []
    });

    const apiInLoopIssue = optimizations.find(o => o.type === 'performance');
    expect(apiInLoopIssue).toBeDefined();
  });
});

describe('Smart Completion Service', () => {
  it('should suggest variables from previous nodes', () => {
    const node1: WorkflowNode = {
      id: '1',
      type: 'httpRequest',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'httpRequest',
        label: 'Get Users',
        position: { x: 0, y: 0 },
        icon: '🌐',
        color: '#10b981',
        inputs: 0,
        outputs: 1
      }
    };

    const node2: WorkflowNode = {
      id: '2',
      type: 'set',
      position: { x: 0, y: 100 },
      data: {
        id: '2',
        type: 'set',
        label: 'Set Data',
        position: { x: 0, y: 100 },
        icon: '🔧',
        color: '#6366f1',
        inputs: 1,
        outputs: 1
      }
    };

    const edge: WorkflowEdge = {
      id: 'e1-2',
      source: '1',
      target: '2'
    };

    const suggestions = smartCompletionService.getSuggestions({
      text: '{{',
      cursorPosition: 2,
      currentNode: node2,
      allNodes: [node1, node2],
      edges: [edge]
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.label.includes('Get Users'))).toBe(true);
  });

  it('should suggest built-in functions', () => {
    const node: WorkflowNode = {
      id: '1',
      type: 'set',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'set',
        label: 'Set',
        position: { x: 0, y: 0 },
        icon: '🔧',
        color: '#6366f1',
        inputs: 1,
        outputs: 1
      }
    };

    const suggestions = smartCompletionService.getSuggestions({
      text: '{{ now',
      cursorPosition: 6,
      currentNode: node,
      allNodes: [node],
      edges: []
    });

    expect(suggestions.some(s => s.label === 'now()')).toBe(true);
  });

  it('should suggest HTTP headers', () => {
    const node: WorkflowNode = {
      id: '1',
      type: 'httpRequest',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'httpRequest',
        label: 'HTTP',
        position: { x: 0, y: 0 },
        icon: '🌐',
        color: '#10b981',
        inputs: 1,
        outputs: 1
      }
    };

    const suggestions = smartCompletionService.getSuggestions({
      text: 'header',
      cursorPosition: 6,
      currentNode: node,
      allNodes: [node],
      edges: [],
      field: 'headers'
    });

    expect(suggestions.some(s => s.label.includes('Content-Type'))).toBe(true);
  });
});

describe('Parameter Suggester', () => {
  it('should suggest timeout for HTTP request', () => {
    const suggestions = parameterSuggester.suggestParameters('httpRequest', {});

    const timeoutSuggestion = suggestions.find(s => s.field === 'timeout');

    expect(timeoutSuggestion).toBeDefined();
    expect(timeoutSuggestion?.value).toBe(30000);
  });

  it('should suggest retry configuration', () => {
    const suggestions = parameterSuggester.suggestParameters('httpRequest', {});

    const retrySuggestion = suggestions.find(s => s.field === 'retry');

    expect(retrySuggestion).toBeDefined();
    expect(retrySuggestion?.value).toHaveProperty('attempts');
  });

  it('should provide config templates for Slack', () => {
    const templates = parameterSuggester.getConfigTemplates('slack');

    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0]).toHaveProperty('name');
    expect(templates[0]).toHaveProperty('config');
  });

  it('should validate and suggest corrections for invalid URL', () => {
    const result = parameterSuggester.validateAndSuggest(
      'httpRequest',
      'url',
      'http://example.com'
    );

    expect(result.valid).toBe(true);
    expect(result.suggestion).toBe('https://example.com');
  });
});

describe('Quality Analyzer', () => {
  it('should calculate quality score for workflow', () => {
    const nodes: WorkflowNode[] = [
      {
        id: '1',
        type: 'webhook',
        position: { x: 0, y: 0 },
        data: {
          id: '1',
          type: 'webhook',
          label: 'Webhook Trigger',
          position: { x: 0, y: 0 },
          icon: '🔗',
          color: '#3b82f6',
          inputs: 0,
          outputs: 1
        }
      },
      {
        id: '2',
        type: 'httpRequest',
        position: { x: 0, y: 100 },
        data: {
          id: '2',
          type: 'httpRequest',
          label: 'API Call',
          position: { x: 0, y: 100 },
          icon: '🌐',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      }
    ];

    const edges: WorkflowEdge[] = [
      {
        id: 'e1-2',
        source: '1',
        target: '2'
      }
    ];

    const report = qualityAnalyzer.analyzeWorkflow(nodes, edges);

    expect(report.score.overall).toBeGreaterThan(0);
    expect(report.score.overall).toBeLessThanOrEqual(100);
    expect(report.grade).toMatch(/^[A-F]$/);
  });

  it('should detect missing error handling', () => {
    const nodes: WorkflowNode[] = [
      {
        id: '1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          id: '1',
          type: 'httpRequest',
          label: 'API Call',
          position: { x: 0, y: 0 },
          icon: '🌐',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      }
    ];

    const report = qualityAnalyzer.analyzeWorkflow(nodes, []);

    expect(report.score.dimensions.errorHandling).toBeLessThan(100);
  });

  it('should provide recommendations for improvement', () => {
    const nodes: WorkflowNode[] = [
      {
        id: '1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          id: '1',
          type: 'httpRequest',
          label: 'node',
          position: { x: 0, y: 0 },
          icon: '🌐',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      }
    ];

    const report = qualityAnalyzer.analyzeWorkflow(nodes, []);

    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('should estimate execution time', () => {
    const nodes: WorkflowNode[] = [
      {
        id: '1',
        type: 'httpRequest',
        position: { x: 0, y: 0 },
        data: {
          id: '1',
          type: 'httpRequest',
          label: 'API',
          position: { x: 0, y: 0 },
          icon: '🌐',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      }
    ];

    const report = qualityAnalyzer.analyzeWorkflow(nodes, []);

    expect(report.predictions.estimatedExecutionTime).toBeDefined();
    expect(report.predictions.estimatedExecutionTime).not.toBe('');
  });
});

describe('Pattern Matcher', () => {
  it('should detect API in loop pattern', () => {
    const loopNode: WorkflowNode = {
      id: '1',
      type: 'forEach',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'forEach',
        label: 'Loop',
        position: { x: 0, y: 0 },
        icon: '🔁',
        color: '#8b5cf6',
        inputs: 1,
        outputs: 1
      }
    };

    const apiNode: WorkflowNode = {
      id: '2',
      type: 'httpRequest',
      position: { x: 0, y: 100 },
      data: {
        id: '2',
        type: 'httpRequest',
        label: 'API',
        position: { x: 0, y: 100 },
        icon: '🌐',
        color: '#10b981',
        inputs: 1,
        outputs: 1
      }
    };

    const edge: WorkflowEdge = {
      id: 'e1-2',
      source: '1',
      target: '2'
    };

    const patterns = patternMatcher.detectPatterns([loopNode, apiNode], [edge]);

    expect(patterns.some(p => p.pattern === 'api-in-loop')).toBe(true);
  });

  it('should detect webhook without validation', () => {
    const webhookNode: WorkflowNode = {
      id: '1',
      type: 'webhook',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'webhook',
        label: 'Webhook',
        position: { x: 0, y: 0 },
        icon: '🔗',
        color: '#3b82f6',
        inputs: 0,
        outputs: 1
      }
    };

    const actionNode: WorkflowNode = {
      id: '2',
      type: 'database',
      position: { x: 0, y: 100 },
      data: {
        id: '2',
        type: 'database',
        label: 'Save',
        position: { x: 0, y: 100 },
        icon: '🗄️',
        color: '#f59e0b',
        inputs: 1,
        outputs: 1
      }
    };

    const edge: WorkflowEdge = {
      id: 'e1-2',
      source: '1',
      target: '2'
    };

    const patterns = patternMatcher.detectPatterns([webhookNode, actionNode], [edge]);

    expect(patterns.some(p => p.pattern === 'webhook-no-validation')).toBe(true);
  });
});

describe('Context Analyzer', () => {
  it('should determine node position correctly', () => {
    const firstNode: WorkflowNode = {
      id: '1',
      type: 'webhook',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'webhook',
        label: 'Start',
        position: { x: 0, y: 0 },
        icon: '🔗',
        color: '#3b82f6',
        inputs: 0,
        outputs: 1
      }
    };

    const secondNode: WorkflowNode = {
      id: '2',
      type: 'httpRequest',
      position: { x: 0, y: 100 },
      data: {
        id: '2',
        type: 'httpRequest',
        label: 'API',
        position: { x: 0, y: 100 },
        icon: '🌐',
        color: '#10b981',
        inputs: 1,
        outputs: 1
      }
    };

    const edge: WorkflowEdge = {
      id: 'e1-2',
      source: '1',
      target: '2'
    };

    const context = contextAnalyzer.analyzeNodeContext({
      nodes: [firstNode, secondNode],
      edges: [edge],
      currentNode: firstNode
    });

    expect(context.position).toBe('first');
  });

  it('should detect node in loop', () => {
    const loopNode: WorkflowNode = {
      id: '1',
      type: 'forEach',
      position: { x: 0, y: 0 },
      data: {
        id: '1',
        type: 'forEach',
        label: 'Loop',
        position: { x: 0, y: 0 },
        icon: '🔁',
        color: '#8b5cf6',
        inputs: 1,
        outputs: 1
      }
    };

    const insideNode: WorkflowNode = {
      id: '2',
      type: 'set',
      position: { x: 0, y: 100 },
      data: {
        id: '2',
        type: 'set',
        label: 'Transform',
        position: { x: 0, y: 100 },
        icon: '🔧',
        color: '#6366f1',
        inputs: 1,
        outputs: 1
      }
    };

    const edge: WorkflowEdge = {
      id: 'e1-2',
      source: '1',
      target: '2'
    };

    const context = contextAnalyzer.analyzeNodeContext({
      nodes: [loopNode, insideNode],
      edges: [edge],
      currentNode: insideNode
    });

    expect(context.isInLoop).toBe(true);
  });
});
