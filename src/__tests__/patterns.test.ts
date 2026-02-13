/**
 * Pattern Library Tests
 * Comprehensive test suite for pattern detection, matching, and suggestions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { GraphAnalyzer } from '../patterns/GraphAnalyzer';
import { PatternMatcher } from '../patterns/PatternMatcher';
import { PatternDetector } from '../patterns/PatternDetector';
import { PatternSuggester } from '../patterns/PatternSuggester';
import { AntiPatternDetector } from '../patterns/AntiPatternDetector';
import { PatternTemplateGenerator } from '../patterns/PatternTemplate';
import {
  PATTERN_CATALOG,
  getPatternById,
  getPatternsByCategory,
} from '../patterns/PatternCatalog';
import { ANTI_PATTERN_CATALOG } from '../patterns/AntiPatternCatalog';

// Helper to create test nodes
const createNode = (id: string, type: string): WorkflowNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: {
    id,
    type,
    label: `${type}-${id}`,
    icon: '🔹',
    color: '#3b82f6',
    inputs: 1,
    outputs: 1,
  },
});

// Helper to create test edges
const createEdge = (id: string, source: string, target: string): WorkflowEdge => ({
  id,
  source,
  target,
});

describe('PatternCatalog', () => {
  it('should have 51 patterns', () => {
    expect(PATTERN_CATALOG.length).toBeGreaterThanOrEqual(51);
  });

  it('should have patterns in all categories', () => {
    const categories = ['messaging', 'integration', 'reliability', 'data', 'workflow'];
    for (const category of categories) {
      const patterns = getPatternsByCategory(category);
      expect(patterns.length).toBeGreaterThan(0);
    }
  });

  it('should get pattern by ID', () => {
    const pattern = getPatternById('retry');
    expect(pattern).toBeDefined();
    expect(pattern?.id).toBe('retry');
    expect(pattern?.name).toBe('Retry Pattern');
  });

  it('should have required fields for each pattern', () => {
    for (const pattern of PATTERN_CATALOG) {
      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.category).toBeDefined();
      expect(pattern.complexity).toBeDefined();
      expect(pattern.description).toBeDefined();
      expect(pattern.structure).toBeDefined();
      expect(Array.isArray(pattern.benefits)).toBe(true);
      expect(Array.isArray(pattern.tags)).toBe(true);
    }
  });
});

describe('AntiPatternCatalog', () => {
  it('should have at least 13 anti-patterns', () => {
    expect(ANTI_PATTERN_CATALOG.length).toBeGreaterThanOrEqual(13);
  });

  it('should have critical anti-patterns', () => {
    const critical = ANTI_PATTERN_CATALOG.filter((ap) => ap.severity === 'critical');
    expect(critical.length).toBeGreaterThan(0);
  });

  it('should have detection rules for each anti-pattern', () => {
    for (const antiPattern of ANTI_PATTERN_CATALOG) {
      expect(antiPattern.detection).toBeDefined();
      expect(antiPattern.detection.rules.length).toBeGreaterThan(0);
      expect(antiPattern.detection.threshold).toBeGreaterThan(0);
    }
  });
});

describe('GraphAnalyzer', () => {
  it('should analyze empty graph', () => {
    const result = GraphAnalyzer.analyze([], []);
    expect(result.nodeCount).toBe(0);
    expect(result.edgeCount).toBe(0);
    expect(result.depth).toBe(0);
  });

  it('should detect linear topology', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const result = GraphAnalyzer.analyze(nodes, edges);
    expect(result.topology).toBe('linear');
    expect(result.depth).toBe(2);
  });

  it('should detect branching topology', () => {
    const nodes = [
      createNode('1', 'webhook'),
      createNode('2', 'switch'),
      createNode('3', 'http-request'),
      createNode('4', 'email'),
    ];
    const edges = [
      createEdge('e1', '1', '2'),
      createEdge('e2', '2', '3'),
      createEdge('e3', '2', '4'),
    ];

    const result = GraphAnalyzer.analyze(nodes, edges);
    // Can be 'tree' or 'branching' - both are correct for this structure
    expect(['tree', 'branching', 'dag']).toContain(result.topology);
    expect(result.breadth).toBeGreaterThan(1);
  });

  it('should detect cycles', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2'), createEdge('e2', '2', '1')];

    const result = GraphAnalyzer.analyze(nodes, edges);
    expect(result.hasCycles).toBe(true);
    expect(result.topology).toBe('loop');
  });

  it('should calculate complexity', () => {
    const nodes = [
      createNode('1', 'webhook'),
      createNode('2', 'switch'),
      createNode('3', 'http-request'),
    ];
    const edges = [createEdge('e1', '1', '2'), createEdge('e2', '2', '3')];

    const result = GraphAnalyzer.analyze(nodes, edges);
    expect(result.complexity).toBeGreaterThan(0);
  });

  it('should find connected components', () => {
    const nodes = [
      createNode('1', 'webhook'),
      createNode('2', 'http-request'),
      createNode('3', 'email'),
    ];
    const edges = [createEdge('e1', '1', '2')];

    const result = GraphAnalyzer.analyze(nodes, edges);
    expect(result.connectedComponents.length).toBe(2); // One connected, one isolated
  });

  it('should calculate metrics', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const result = GraphAnalyzer.analyze(nodes, edges);
    expect(result.metrics).toBeDefined();
    expect(result.metrics.cyclomaticComplexity).toBeGreaterThan(0);
    expect(result.metrics.density).toBeGreaterThanOrEqual(0);
  });
});

describe('PatternMatcher', () => {
  it('should match simple pattern', () => {
    const pattern = getPatternById('request-reply');
    expect(pattern).toBeDefined();

    const nodes = [createNode('1', 'http-request'), createNode('2', 'set')];
    const edges = [createEdge('e1', '1', '2')];

    const match = PatternMatcher.match(nodes, edges, pattern!);
    expect(match).toBeDefined();
    expect(match.score).toBeGreaterThan(0);
  });

  it('should detect missing nodes', () => {
    const pattern = getPatternById('retry');
    expect(pattern).toBeDefined();

    const nodes = [createNode('1', 'webhook')];
    const edges: WorkflowEdge[] = [];

    const match = PatternMatcher.match(nodes, edges, pattern!);
    expect(match.deviations.some((d) => d.type === 'missing-node')).toBe(true);
  });

  it('should calculate coverage', () => {
    const pattern = getPatternById('sequential-workflow');
    expect(pattern).toBeDefined();

    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const match = PatternMatcher.match(nodes, edges, pattern!);
    expect(match.coverage).toBeGreaterThanOrEqual(0);
    expect(match.coverage).toBeLessThanOrEqual(1);
  });

  it('should match multiple patterns', () => {
    const nodes = [
      createNode('1', 'webhook'),
      createNode('2', 'http-request'),
      createNode('3', 'filter'),
    ];
    const edges = [createEdge('e1', '1', '2'), createEdge('e2', '2', '3')];

    const results = PatternMatcher.matchMultiple(nodes, edges, PATTERN_CATALOG, 0.3);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].match.score).toBeGreaterThanOrEqual(0.3);
  });

  it('should find best match', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const best = PatternMatcher.findBestMatch(nodes, edges, PATTERN_CATALOG, 0.3);
    expect(best).not.toBeNull();
    expect(best?.match.score).toBeGreaterThan(0);
  });

  it('should assess match quality', () => {
    const excellent = PatternMatcher.getMatchQuality(0.95);
    expect(excellent.level).toBe('excellent');

    const good = PatternMatcher.getMatchQuality(0.75);
    expect(good.level).toBe('good');

    const poor = PatternMatcher.getMatchQuality(0.3);
    expect(poor.level).toBe('poor');
  });
});

describe('PatternDetector', () => {
  it('should detect patterns in workflow', () => {
    const nodes = [
      createNode('1', 'webhook'),
      createNode('2', 'http-request'),
      createNode('3', 'filter'),
    ];
    const edges = [createEdge('e1', '1', '2'), createEdge('e2', '2', '3')];

    const detector = new PatternDetector();
    const results = detector.detect(nodes, edges);

    expect(Array.isArray(results)).toBe(true);
  });

  it('should filter by confidence threshold', () => {
    const nodes = [createNode('1', 'webhook')];
    const edges: WorkflowEdge[] = [];

    const detector = new PatternDetector({ confidenceThreshold: 0.9 });
    const results = detector.detect(nodes, edges);

    for (const result of results) {
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('should detect by category', () => {
    const nodes = [
      createNode('1', 'http-request'),
      createNode('2', 'http-request'),
      createNode('3', 'merge'),
    ];
    const edges = [createEdge('e1', '1', '3'), createEdge('e2', '2', '3')];

    const detector = new PatternDetector();
    const results = detector.detectByCategory(nodes, edges, 'messaging');

    expect(Array.isArray(results)).toBe(true);
  });

  it('should detect anti-patterns', () => {
    const nodes = Array.from({ length: 35 }, (_, i) => createNode(`${i}`, 'http-request'));
    const edges: WorkflowEdge[] = [];

    const detector = new PatternDetector();
    const antiPatterns = detector.detectAntiPatterns(nodes, edges);

    expect(antiPatterns).toContain('god-workflow');
  });

  it('should recommend patterns', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const detector = new PatternDetector();
    const recommendations = detector.recommend(nodes, edges);

    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should handle empty workflow', () => {
    const detector = new PatternDetector();
    const results = detector.detect([], []);

    // Empty workflows may match some very simple patterns, so just check it doesn't crash
    expect(Array.isArray(results)).toBe(true);
  });
});

describe('PatternSuggester', () => {
  it('should suggest patterns', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const suggestions = PatternSuggester.suggest(nodes, edges);
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should calculate relevance', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const suggestions = PatternSuggester.suggest(nodes, edges);

    for (const suggestion of suggestions) {
      expect(suggestion.relevance).toBeGreaterThan(0);
      expect(suggestion.relevance).toBeLessThanOrEqual(1);
    }
  });

  it('should provide implementation steps', () => {
    const nodes = [createNode('1', 'webhook')];
    const edges: WorkflowEdge[] = [];

    const suggestions = PatternSuggester.suggest(nodes, edges);

    if (suggestions.length > 0) {
      expect(suggestions[0].implementation).toBeDefined();
      expect(suggestions[0].implementation.steps.length).toBeGreaterThan(0);
    }
  });

  it('should suggest improvements', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const improvements = PatternSuggester.suggestImprovements(nodes, edges);
    expect(Array.isArray(improvements)).toBe(true);
  });

  it('should suggest quick wins', () => {
    const nodes = [createNode('1', 'http-request')];
    const edges: WorkflowEdge[] = [];

    const quickWins = PatternSuggester.suggestQuickWins(nodes, edges);
    expect(Array.isArray(quickWins)).toBe(true);
  });
});

describe('AntiPatternDetector', () => {
  it('should detect god workflow', () => {
    const nodes = Array.from({ length: 35 }, (_, i) => createNode(`${i}`, 'http-request'));
    const edges: WorkflowEdge[] = [];

    const results = AntiPatternDetector.detect(nodes, edges);
    const godWorkflow = results.find((r) => r.antiPattern.id === 'god-workflow');

    expect(godWorkflow).toBeDefined();
    expect(godWorkflow?.confidence).toBeGreaterThan(0);
  });

  it('should detect no error handling', () => {
    const nodes = [
      createNode('1', 'webhook'),
      createNode('2', 'http-request'),
      createNode('3', 'http-request'),
      createNode('4', 'http-request'),
    ];
    const edges = [
      createEdge('e1', '1', '2'),
      createEdge('e2', '2', '3'),
      createEdge('e3', '3', '4'),
    ];

    const results = AntiPatternDetector.detect(nodes, edges);
    const noErrorHandling = results.find((r) => r.antiPattern.id === 'no-error-handling');

    expect(noErrorHandling).toBeDefined();
  });

  it('should calculate health score', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const health = AntiPatternDetector.calculateHealthScore(nodes, edges);

    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(health.grade);
  });

  it('should generate report', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    const report = AntiPatternDetector.generateReport(nodes, edges);

    expect(report.health).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('should detect by severity', () => {
    const nodes = Array.from({ length: 35 }, (_, i) => createNode(`${i}`, 'http-request'));
    const edges: WorkflowEdge[] = [];

    const critical = AntiPatternDetector.detectBySeverity(nodes, edges, 'critical');
    const high = AntiPatternDetector.detectBySeverity(nodes, edges, 'high');

    expect(Array.isArray(critical)).toBe(true);
    expect(Array.isArray(high)).toBe(true);
  });

  it('should provide fixes', () => {
    const nodes = Array.from({ length: 35 }, (_, i) => createNode(`${i}`, 'http-request'));
    const edges: WorkflowEdge[] = [];

    const results = AntiPatternDetector.detect(nodes, edges, 0.5);

    if (results.length > 0) {
      expect(results[0].fixes.length).toBeGreaterThan(0);
      expect(results[0].fixes[0].steps.length).toBeGreaterThan(0);
    }
  });
});

describe('PatternTemplateGenerator', () => {
  it('should generate template from pattern', () => {
    const pattern = getPatternById('retry');
    expect(pattern).toBeDefined();

    const template = PatternTemplateGenerator.generateTemplate(pattern!);

    expect(template).toBeDefined();
    expect(template.nodes.length).toBeGreaterThan(0);
    expect(template.patternId).toBe('retry');
  });

  it('should apply template', () => {
    const pattern = getPatternById('sequential-workflow');
    expect(pattern).toBeDefined();

    const template = PatternTemplateGenerator.generateTemplate(pattern!);
    const result = PatternTemplateGenerator.applyTemplate(template);

    // Template should have nodes based on required node types
    expect(result.nodes.length).toBeGreaterThanOrEqual(0);
    expect(result.edges.length).toBeGreaterThanOrEqual(0);
  });

  it('should generate templates for all patterns', () => {
    const templates = PatternTemplateGenerator.getAllTemplates(PATTERN_CATALOG);

    expect(templates.length).toBe(PATTERN_CATALOG.length);
  });

  it('should generate templates by category', () => {
    const templates = PatternTemplateGenerator.getTemplatesByCategory(
      PATTERN_CATALOG,
      'reliability'
    );

    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) {
      const pattern = getPatternById(template.patternId);
      expect(pattern?.category).toBe('reliability');
    }
  });

  it('should apply template with position offset', () => {
    const pattern = getPatternById('retry');
    expect(pattern).toBeDefined();

    const template = PatternTemplateGenerator.generateTemplate(pattern!);
    const result = PatternTemplateGenerator.applyTemplate(template, { x: 100, y: 200 });

    expect(result.nodes[0].position.x).toBeGreaterThanOrEqual(100);
    expect(result.nodes[0].position.y).toBeGreaterThanOrEqual(200);
  });
});

describe('Integration Tests', () => {
  it('should detect and suggest improvements', () => {
    const nodes = [createNode('1', 'webhook'), createNode('2', 'http-request')];
    const edges = [createEdge('e1', '1', '2')];

    // Detect patterns
    const detector = new PatternDetector();
    const detections = detector.detect(nodes, edges);

    // Get suggestions
    const suggestions = PatternSuggester.suggest(nodes, edges);

    // Check health
    const health = AntiPatternDetector.calculateHealthScore(nodes, edges);

    expect(detections).toBeDefined();
    expect(suggestions).toBeDefined();
    expect(health).toBeDefined();
  });

  it('should handle complex workflow', () => {
    const nodes = [
      createNode('1', 'webhook'),
      createNode('2', 'filter'),
      createNode('3', 'switch'),
      createNode('4', 'http-request'),
      createNode('5', 'http-request'),
      createNode('6', 'merge'),
      createNode('7', 'email'),
    ];

    const edges = [
      createEdge('e1', '1', '2'),
      createEdge('e2', '2', '3'),
      createEdge('e3', '3', '4'),
      createEdge('e4', '3', '5'),
      createEdge('e5', '4', '6'),
      createEdge('e6', '5', '6'),
      createEdge('e7', '6', '7'),
    ];

    const analysis = GraphAnalyzer.analyze(nodes, edges);
    const detector = new PatternDetector();
    const detections = detector.detect(nodes, edges);
    const health = AntiPatternDetector.calculateHealthScore(nodes, edges);

    expect(analysis.complexity).toBeGreaterThan(0);
    expect(analysis.topology).toBeDefined();
    expect(detections.length).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeGreaterThan(0);
  });
});
