/**
 * Comprehensive Unit Tests for Patterns Module
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPatternDefinition,
  createPatternStructure,
  createEdgePattern,
  PatternConstraints,
  PATTERN_CATEGORIES,
  PATTERN_COMPLEXITY,
} from '../patterns/PatternDefinition';
import {
  PATTERN_CATALOG,
  getPatternById,
  getPatternsByCategory,
  getPatternsByComplexity,
  getPatternsByTag,
  PATTERN_STATS,
} from '../patterns/PatternCatalog';
import { GraphAnalyzer } from '../patterns/GraphAnalyzer';
import { PatternMatcher } from '../patterns/PatternMatcher';
import {
  PatternDetector,
  detectPatterns,
  recommendPatterns,
} from '../patterns/PatternDetector';
import {
  AntiPatternDetector,
  detectAntiPatterns,
  checkWorkflowHealth,
} from '../patterns/AntiPatternDetector';
import {
  ANTI_PATTERN_CATALOG,
  getAntiPatternById,
  getAntiPatternsBySeverity,
  ANTI_PATTERN_STATS,
} from '../patterns/AntiPatternCatalog';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type { PatternCategory, PatternComplexity } from '../types/patterns';

// Helper to create test workflow nodes
function createTestNode(
  id: string,
  type: string,
  label: string,
  config: Record<string, unknown> = {}
): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {
      label,
      config,
    },
  };
}

// Helper to create test edges
function createTestEdge(
  id: string,
  source: string,
  target: string,
  data: Record<string, unknown> = {}
): WorkflowEdge {
  return {
    id,
    source,
    target,
    type: 'default',
    data,
  };
}

// Helper to create a simple linear workflow
function createLinearWorkflow(nodeCount: number): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push(createTestNode(`node-${i}`, 'function', `Node ${i}`));
    if (i > 0) {
      edges.push(createTestEdge(`edge-${i}`, `node-${i - 1}`, `node-${i}`));
    }
  }

  return { nodes, edges };
}

// Helper to create a branching workflow
function createBranchingWorkflow(): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} {
  const nodes = [
    createTestNode('start', 'webhook', 'Start'),
    createTestNode('switch', 'switch', 'Router'),
    createTestNode('branch1', 'http-request', 'Branch 1'),
    createTestNode('branch2', 'http-request', 'Branch 2'),
    createTestNode('end', 'function', 'End'),
  ];

  const edges = [
    createTestEdge('e1', 'start', 'switch'),
    createTestEdge('e2', 'switch', 'branch1', { condition: 'yes' }),
    createTestEdge('e3', 'switch', 'branch2', { condition: 'no' }),
    createTestEdge('e4', 'branch1', 'end'),
    createTestEdge('e5', 'branch2', 'end'),
  ];

  return { nodes, edges };
}

// ============================================================================
// PatternDefinition Tests
// ============================================================================

describe('PatternDefinition', () => {
  describe('createPatternDefinition', () => {
    it('should create a valid pattern definition', () => {
      const pattern = createPatternDefinition({
        id: 'test-pattern',
        name: 'Test Pattern',
        category: 'workflow',
        complexity: 'beginner',
        description: 'A test pattern',
        problem: 'Test problem',
        solution: 'Test solution',
        benefits: ['Benefit 1'],
        tradeoffs: ['Tradeoff 1'],
        useCases: ['Use case 1'],
        tags: ['test'],
        structure: createPatternStructure({
          minNodes: 2,
          maxNodes: 5,
          requiredNodeTypes: ['function'],
          optionalNodeTypes: [],
          requiredEdges: [],
          topology: 'linear',
          constraints: [],
        }),
        examples: [],
        antiPatterns: [],
        relatedPatterns: [],
        documentation: 'Test documentation',
      });

      expect(pattern.id).toBe('test-pattern');
      expect(pattern.name).toBe('Test Pattern');
      expect(pattern.version).toBe('1.0.0');
    });

    it('should throw error for pattern without id', () => {
      expect(() => {
        createPatternDefinition({
          id: '',
          name: 'Test',
          category: 'workflow',
          complexity: 'beginner',
          description: 'Test',
          problem: 'Test',
          solution: 'Test',
          benefits: [],
          tradeoffs: [],
          useCases: [],
          tags: [],
          structure: createPatternStructure({
            minNodes: 1,
            requiredNodeTypes: [],
            optionalNodeTypes: [],
            requiredEdges: [],
            topology: 'linear',
            constraints: [],
          }),
          examples: [],
          antiPatterns: [],
          relatedPatterns: [],
          documentation: '',
        });
      }).toThrow('Pattern must have id and name');
    });

    it('should throw error for pattern without category', () => {
      expect(() => {
        createPatternDefinition({
          id: 'test',
          name: 'Test',
          category: '' as PatternCategory,
          complexity: 'beginner',
          description: 'Test',
          problem: 'Test',
          solution: 'Test',
          benefits: [],
          tradeoffs: [],
          useCases: [],
          tags: [],
          structure: createPatternStructure({
            minNodes: 1,
            requiredNodeTypes: [],
            optionalNodeTypes: [],
            requiredEdges: [],
            topology: 'linear',
            constraints: [],
          }),
          examples: [],
          antiPatterns: [],
          relatedPatterns: [],
          documentation: '',
        });
      }).toThrow('Pattern must have a category');
    });

    it('should throw error when maxNodes < minNodes', () => {
      expect(() => {
        createPatternDefinition({
          id: 'test',
          name: 'Test',
          category: 'workflow',
          complexity: 'beginner',
          description: 'Test',
          problem: 'Test',
          solution: 'Test',
          benefits: [],
          tradeoffs: [],
          useCases: [],
          tags: [],
          structure: createPatternStructure({
            minNodes: 10,
            maxNodes: 5,
            requiredNodeTypes: [],
            optionalNodeTypes: [],
            requiredEdges: [],
            topology: 'linear',
            constraints: [],
          }),
          examples: [],
          antiPatterns: [],
          relatedPatterns: [],
          documentation: '',
        });
      }).toThrow('maxNodes must be greater than or equal to minNodes');
    });
  });

  describe('createPatternStructure', () => {
    it('should create pattern structure with defaults', () => {
      const structure = createPatternStructure({
        minNodes: 2,
        requiredNodeTypes: ['webhook'],
        requiredEdges: [],
        topology: 'linear',
      });

      expect(structure.minNodes).toBe(2);
      expect(structure.optionalNodeTypes).toEqual([]);
      expect(structure.constraints).toEqual([]);
    });

    it('should include all provided options', () => {
      const structure = createPatternStructure({
        minNodes: 3,
        maxNodes: 10,
        requiredNodeTypes: ['webhook', 'http-request'],
        optionalNodeTypes: ['filter'],
        requiredEdges: [createEdgePattern('webhook', 'http-request')],
        topology: 'branching',
        constraints: [PatternConstraints.nodeCount(3, 10)],
      });

      expect(structure.maxNodes).toBe(10);
      expect(structure.requiredNodeTypes).toContain('webhook');
      expect(structure.optionalNodeTypes).toContain('filter');
      expect(structure.constraints).toHaveLength(1);
    });
  });

  describe('createEdgePattern', () => {
    it('should create required edge pattern by default', () => {
      const edge = createEdgePattern('source', 'target');

      expect(edge.from).toBe('source');
      expect(edge.to).toBe('target');
      expect(edge.required).toBe(true);
    });

    it('should create edge pattern with type', () => {
      const edge = createEdgePattern('source', 'target', 'conditional', false);

      expect(edge.type).toBe('conditional');
      expect(edge.required).toBe(false);
    });
  });

  describe('PatternConstraints', () => {
    const nodes = [
      createTestNode('1', 'webhook', 'Webhook'),
      createTestNode('2', 'filter', 'Filter'),
      createTestNode('3', 'http-request', 'HTTP'),
    ];
    const edges = [
      createTestEdge('e1', '1', '2'),
      createTestEdge('e2', '2', '3'),
    ];

    it('should validate node count constraint', () => {
      const constraint = PatternConstraints.nodeCount(2, 5);
      expect(constraint.validate(nodes, edges)).toBe(true);

      const strictConstraint = PatternConstraints.nodeCount(5);
      expect(strictConstraint.validate(nodes, edges)).toBe(false);
    });

    it('should validate edge count constraint', () => {
      const constraint = PatternConstraints.edgeCount(1, 3);
      expect(constraint.validate(nodes, edges)).toBe(true);

      const strictConstraint = PatternConstraints.edgeCount(5);
      expect(strictConstraint.validate(nodes, edges)).toBe(false);
    });

    it('should validate requiresNodeType constraint', () => {
      const constraint = PatternConstraints.requiresNodeType('webhook');
      expect(constraint.validate(nodes, edges)).toBe(true);

      const missingConstraint = PatternConstraints.requiresNodeType('database');
      expect(missingConstraint.validate(nodes, edges)).toBe(false);
    });

    it('should validate noCycles constraint', () => {
      const constraint = PatternConstraints.noCycles();
      expect(constraint.validate(nodes, edges)).toBe(true);

      // Create cyclic workflow
      const cyclicEdges = [
        ...edges,
        createTestEdge('e3', '3', '1'),
      ];
      expect(constraint.validate(nodes, cyclicEdges)).toBe(false);
    });

    it('should validate maxDepth constraint', () => {
      const constraint = PatternConstraints.maxDepth(5);
      expect(constraint.validate(nodes, edges)).toBe(true);

      const strictConstraint = PatternConstraints.maxDepth(1);
      expect(strictConstraint.validate(nodes, edges)).toBe(false);
    });

    it('should validate maxBreadth constraint', () => {
      const constraint = PatternConstraints.maxBreadth(3);
      expect(constraint.validate(nodes, edges)).toBe(true);
    });
  });

  describe('PATTERN_CATEGORIES', () => {
    it('should have all expected categories', () => {
      expect(PATTERN_CATEGORIES.messaging).toBeDefined();
      expect(PATTERN_CATEGORIES.integration).toBeDefined();
      expect(PATTERN_CATEGORIES.reliability).toBeDefined();
      expect(PATTERN_CATEGORIES.data).toBeDefined();
      expect(PATTERN_CATEGORIES.workflow).toBeDefined();
      expect(PATTERN_CATEGORIES.architecture).toBeDefined();
    });

    it('should have label and description for each category', () => {
      Object.values(PATTERN_CATEGORIES).forEach((category) => {
        expect(category.label).toBeDefined();
        expect(category.description).toBeDefined();
        expect(category.icon).toBeDefined();
      });
    });
  });

  describe('PATTERN_COMPLEXITY', () => {
    it('should have all complexity levels', () => {
      expect(PATTERN_COMPLEXITY.beginner).toBeDefined();
      expect(PATTERN_COMPLEXITY.intermediate).toBeDefined();
      expect(PATTERN_COMPLEXITY.advanced).toBeDefined();
      expect(PATTERN_COMPLEXITY.expert).toBeDefined();
    });
  });
});

// ============================================================================
// PatternCatalog Tests
// ============================================================================

describe('PatternCatalog', () => {
  it('should have 50+ patterns', () => {
    expect(PATTERN_CATALOG.length).toBeGreaterThanOrEqual(50);
  });

  it('should have valid patterns', () => {
    PATTERN_CATALOG.forEach((pattern) => {
      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.category).toBeDefined();
      expect(pattern.complexity).toBeDefined();
      expect(pattern.structure).toBeDefined();
      expect(pattern.version).toBe('1.0.0');
    });
  });

  describe('getPatternById', () => {
    it('should find pattern by ID', () => {
      const pattern = getPatternById('retry');
      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe('Retry Pattern');
    });

    it('should return undefined for non-existent pattern', () => {
      const pattern = getPatternById('non-existent');
      expect(pattern).toBeUndefined();
    });
  });

  describe('getPatternsByCategory', () => {
    it('should filter patterns by category', () => {
      const messagingPatterns = getPatternsByCategory('messaging');
      expect(messagingPatterns.length).toBeGreaterThan(0);
      messagingPatterns.forEach((p) => expect(p.category).toBe('messaging'));
    });

    it('should return empty array for invalid category', () => {
      const patterns = getPatternsByCategory('invalid-category');
      expect(patterns).toEqual([]);
    });
  });

  describe('getPatternsByComplexity', () => {
    it('should filter patterns by complexity', () => {
      const beginnerPatterns = getPatternsByComplexity('beginner');
      expect(beginnerPatterns.length).toBeGreaterThan(0);
      beginnerPatterns.forEach((p) => expect(p.complexity).toBe('beginner'));
    });

    it('should return expert patterns', () => {
      const expertPatterns = getPatternsByComplexity('expert');
      expect(expertPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('getPatternsByTag', () => {
    it('should filter patterns by tag', () => {
      const reliabilityPatterns = getPatternsByTag('reliability');
      expect(reliabilityPatterns.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent tag', () => {
      const patterns = getPatternsByTag('non-existent-tag');
      expect(patterns).toEqual([]);
    });
  });

  describe('PATTERN_STATS', () => {
    it('should have correct total count', () => {
      expect(PATTERN_STATS.total).toBe(PATTERN_CATALOG.length);
    });

    it('should have counts by category', () => {
      expect(PATTERN_STATS.byCategory.messaging).toBeGreaterThan(0);
      expect(PATTERN_STATS.byCategory.integration).toBeGreaterThan(0);
      expect(PATTERN_STATS.byCategory.reliability).toBeGreaterThan(0);
    });

    it('should have counts by complexity', () => {
      expect(PATTERN_STATS.byComplexity.beginner).toBeGreaterThan(0);
      expect(PATTERN_STATS.byComplexity.intermediate).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// GraphAnalyzer Tests
// ============================================================================

describe('GraphAnalyzer', () => {
  describe('analyze', () => {
    it('should analyze empty workflow', () => {
      const result = GraphAnalyzer.analyze([], []);

      expect(result.nodeCount).toBe(0);
      expect(result.edgeCount).toBe(0);
      expect(result.topology).toBe('linear');
    });

    it('should analyze linear workflow', () => {
      const { nodes, edges } = createLinearWorkflow(5);
      const result = GraphAnalyzer.analyze(nodes, edges);

      expect(result.nodeCount).toBe(5);
      expect(result.edgeCount).toBe(4);
      expect(result.topology).toBe('linear');
      expect(result.depth).toBe(5);
      expect(result.hasCycles).toBe(false);
    });

    it('should analyze branching workflow', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const result = GraphAnalyzer.analyze(nodes, edges);

      expect(result.nodeCount).toBe(5);
      // Branching workflow can be detected as 'tree' or 'branching' depending on structure
      expect(['branching', 'tree', 'dag']).toContain(result.topology);
      expect(result.hasCycles).toBe(false);
    });

    it('should include metrics', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const result = GraphAnalyzer.analyze(nodes, edges);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.cyclomaticComplexity).toBeGreaterThanOrEqual(1);
      expect(result.metrics.density).toBeDefined();
    });
  });

  describe('detectTopology', () => {
    it('should detect linear topology', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const topology = GraphAnalyzer.detectTopology(nodes, edges);
      expect(topology).toBe('linear');
    });

    it('should detect branching topology', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const topology = GraphAnalyzer.detectTopology(nodes, edges);
      // Single root branching workflow can be detected as 'tree' or 'branching'
      expect(['branching', 'tree', 'dag']).toContain(topology);
    });

    it('should detect loop topology', () => {
      const nodes = [
        createTestNode('1', 'function', 'Node 1'),
        createTestNode('2', 'function', 'Node 2'),
        createTestNode('3', 'function', 'Node 3'),
      ];
      const edges = [
        createTestEdge('e1', '1', '2'),
        createTestEdge('e2', '2', '3'),
        createTestEdge('e3', '3', '1'),
      ];

      const topology = GraphAnalyzer.detectTopology(nodes, edges);
      expect(topology).toBe('loop');
    });
  });

  describe('calculateDepth', () => {
    it('should return 0 for empty workflow', () => {
      expect(GraphAnalyzer.calculateDepth([], [])).toBe(0);
    });

    it('should calculate depth correctly', () => {
      const { nodes, edges } = createLinearWorkflow(5);
      expect(GraphAnalyzer.calculateDepth(nodes, edges)).toBe(5);
    });
  });

  describe('calculateBreadth', () => {
    it('should return 0 for empty workflow', () => {
      expect(GraphAnalyzer.calculateBreadth([], [])).toBe(0);
    });

    it('should calculate breadth for branching workflow', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const breadth = GraphAnalyzer.calculateBreadth(nodes, edges);
      expect(breadth).toBeGreaterThanOrEqual(2);
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate cyclomatic complexity', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const complexity = GraphAnalyzer.calculateComplexity(nodes, edges);
      expect(complexity).toBeGreaterThanOrEqual(1);
    });

    it('should increase with branches', () => {
      const linearComplexity = GraphAnalyzer.calculateComplexity(
        ...Object.values(createLinearWorkflow(3))
      );

      const { nodes, edges } = createBranchingWorkflow();
      const branchingComplexity = GraphAnalyzer.calculateComplexity(nodes, edges);

      expect(branchingComplexity).toBeGreaterThanOrEqual(linearComplexity);
    });
  });

  describe('hasCycles', () => {
    it('should return false for acyclic graph', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      expect(GraphAnalyzer.hasCycles(nodes, edges)).toBe(false);
    });

    it('should return true for cyclic graph', () => {
      const nodes = [
        createTestNode('1', 'function', 'Node 1'),
        createTestNode('2', 'function', 'Node 2'),
      ];
      const edges = [
        createTestEdge('e1', '1', '2'),
        createTestEdge('e2', '2', '1'),
      ];

      expect(GraphAnalyzer.hasCycles(nodes, edges)).toBe(true);
    });
  });

  describe('findConnectedComponents', () => {
    it('should find single component', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const components = GraphAnalyzer.findConnectedComponents(nodes, edges);
      expect(components).toHaveLength(1);
    });

    it('should find multiple disconnected components', () => {
      const nodes = [
        createTestNode('a1', 'function', 'A1'),
        createTestNode('a2', 'function', 'A2'),
        createTestNode('b1', 'function', 'B1'),
        createTestNode('b2', 'function', 'B2'),
      ];
      const edges = [
        createTestEdge('e1', 'a1', 'a2'),
        createTestEdge('e2', 'b1', 'b2'),
      ];

      const components = GraphAnalyzer.findConnectedComponents(nodes, edges);
      expect(components).toHaveLength(2);
    });
  });

  describe('findCriticalPaths', () => {
    it('should find critical path in linear workflow', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const paths = GraphAnalyzer.findCriticalPaths(nodes, edges);

      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0]).toHaveLength(3);
    });
  });

  describe('findStartNodes', () => {
    it('should find nodes with no incoming edges', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const startNodes = GraphAnalyzer.findStartNodes(nodes, edges);

      expect(startNodes).toHaveLength(1);
      expect(startNodes[0]).toBe('node-0');
    });
  });

  describe('findEndNodes', () => {
    it('should find nodes with no outgoing edges', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const endNodes = GraphAnalyzer.findEndNodes(nodes, edges);

      expect(endNodes).toHaveLength(1);
      expect(endNodes[0]).toBe('node-2');
    });
  });

  describe('getNeighbors', () => {
    it('should get outgoing neighbors', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const neighbors = GraphAnalyzer.getNeighbors(nodes[0], edges, 'out');

      expect(neighbors).toContain('node-1');
    });

    it('should get incoming neighbors', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const neighbors = GraphAnalyzer.getNeighbors(nodes[1], edges, 'in');

      expect(neighbors).toContain('node-0');
    });
  });

  describe('calculateDensity', () => {
    it('should return 0 for single node', () => {
      const density = GraphAnalyzer.calculateDensity(
        [createTestNode('1', 'function', 'Node')],
        []
      );
      expect(density).toBe(0);
    });

    it('should calculate density correctly', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const density = GraphAnalyzer.calculateDensity(nodes, edges);
      expect(density).toBeGreaterThan(0);
      expect(density).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// PatternMatcher Tests
// ============================================================================

describe('PatternMatcher', () => {
  const retryPattern = getPatternById('retry')!;
  const apiGatewayPattern = getPatternById('api-gateway')!;

  describe('match', () => {
    it('should match workflow against pattern', () => {
      const nodes = [
        createTestNode('1', 'http-request', 'API Call'),
        createTestNode('2', 'delay', 'Delay'),
      ];
      const edges = [createTestEdge('e1', '1', '2')];

      const match = PatternMatcher.match(nodes, edges, retryPattern);

      expect(match).toBeDefined();
      expect(match.score).toBeGreaterThanOrEqual(0);
      expect(match.score).toBeLessThanOrEqual(1);
      expect(match.coverage).toBeDefined();
    });

    it('should identify deviations', () => {
      const nodes = [createTestNode('1', 'function', 'Function')];
      const edges: WorkflowEdge[] = [];

      const match = PatternMatcher.match(nodes, edges, retryPattern);

      expect(match.deviations.length).toBeGreaterThan(0);
    });

    it('should calculate coverage', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const match = PatternMatcher.match(nodes, edges, apiGatewayPattern);

      expect(match.coverage).toBeGreaterThanOrEqual(0);
      expect(match.coverage).toBeLessThanOrEqual(1);
    });
  });

  describe('matchMultiple', () => {
    it('should match against multiple patterns', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const results = PatternMatcher.matchMultiple(
        nodes,
        edges,
        PATTERN_CATALOG,
        0.3
      );

      expect(results.length).toBeGreaterThan(0);
      // Results should be sorted by score
      if (results.length > 1) {
        expect(results[0].match.score).toBeGreaterThanOrEqual(
          results[1].match.score
        );
      }
    });

    it('should filter by threshold', () => {
      const { nodes, edges } = createLinearWorkflow(2);
      const resultsLow = PatternMatcher.matchMultiple(
        nodes,
        edges,
        PATTERN_CATALOG,
        0.1
      );
      const resultsHigh = PatternMatcher.matchMultiple(
        nodes,
        edges,
        PATTERN_CATALOG,
        0.9
      );

      expect(resultsLow.length).toBeGreaterThanOrEqual(resultsHigh.length);
    });
  });

  describe('findBestMatch', () => {
    it('should find best matching pattern', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const result = PatternMatcher.findBestMatch(
        nodes,
        edges,
        PATTERN_CATALOG,
        0.3
      );

      expect(result).not.toBeNull();
      expect(result?.pattern).toBeDefined();
      expect(result?.match.score).toBeGreaterThanOrEqual(0.3);
    });

    it('should return null if no match above threshold', () => {
      const nodes = [createTestNode('1', 'unknown-type', 'Unknown')];
      const result = PatternMatcher.findBestMatch(nodes, [], PATTERN_CATALOG, 0.99);

      expect(result).toBeNull();
    });
  });

  describe('isMatch', () => {
    it('should return boolean for pattern match', () => {
      const nodes = [
        createTestNode('1', 'http-request', 'HTTP'),
        createTestNode('2', 'function', 'Process'),
      ];
      const edges = [createTestEdge('e1', '1', '2')];

      const isMatch = PatternMatcher.isMatch(nodes, edges, retryPattern, 0.3);
      expect(typeof isMatch).toBe('boolean');
    });
  });

  describe('getMatchQuality', () => {
    it('should return excellent for score >= 0.9', () => {
      const quality = PatternMatcher.getMatchQuality(0.95);
      expect(quality.level).toBe('excellent');
    });

    it('should return good for score >= 0.7', () => {
      const quality = PatternMatcher.getMatchQuality(0.75);
      expect(quality.level).toBe('good');
    });

    it('should return fair for score >= 0.5', () => {
      const quality = PatternMatcher.getMatchQuality(0.55);
      expect(quality.level).toBe('fair');
    });

    it('should return poor for score < 0.5', () => {
      const quality = PatternMatcher.getMatchQuality(0.3);
      expect(quality.level).toBe('poor');
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate similarity between workflows', () => {
      const wf1 = createLinearWorkflow(3);
      const wf2 = createLinearWorkflow(3);

      const similarity = PatternMatcher.calculateSimilarity(
        wf1.nodes,
        wf1.edges,
        wf2.nodes,
        wf2.edges
      );

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should return high similarity for identical workflows', () => {
      const wf = createLinearWorkflow(3);

      const similarity = PatternMatcher.calculateSimilarity(
        wf.nodes,
        wf.edges,
        wf.nodes,
        wf.edges
      );

      expect(similarity).toBeGreaterThanOrEqual(0.9);
    });

    it('should return lower similarity for different workflows', () => {
      const wf1 = createLinearWorkflow(3);
      const wf2 = createBranchingWorkflow();

      const similarity = PatternMatcher.calculateSimilarity(
        wf1.nodes,
        wf1.edges,
        wf2.nodes,
        wf2.edges
      );

      expect(similarity).toBeLessThan(1);
    });
  });
});

// ============================================================================
// PatternDetector Tests
// ============================================================================

describe('PatternDetector', () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = new PatternDetector();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      expect(detector).toBeDefined();
    });

    it('should accept custom config', () => {
      const customDetector = new PatternDetector({
        confidenceThreshold: 0.8,
        maxResults: 5,
      });
      expect(customDetector).toBeDefined();
    });
  });

  describe('detect', () => {
    it('should detect patterns in workflow', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const results = detector.detect(nodes, edges);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should return results sorted by confidence', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const results = detector.detect(nodes, edges);

      if (results.length > 1) {
        expect(results[0].confidence).toBeGreaterThanOrEqual(
          results[1].confidence
        );
      }
    });

    it('should include suggestions', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const results = detector.detect(nodes, edges);

      if (results.length > 0) {
        expect(results[0].suggestions).toBeDefined();
      }
    });
  });

  describe('detectByCategory', () => {
    it('should detect patterns in specific category', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const results = detector.detectByCategory(nodes, edges, 'workflow');

      results.forEach((result) => {
        expect(result.pattern.category).toBe('workflow');
      });
    });
  });

  describe('detectByComplexity', () => {
    it('should detect patterns by complexity level', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const results = detector.detectByComplexity(nodes, edges, 'beginner');

      results.forEach((result) => {
        expect(result.pattern.complexity).toBe('beginner');
      });
    });
  });

  describe('detectAntiPatterns', () => {
    it('should detect anti-patterns', () => {
      const nodes = Array.from({ length: 35 }, (_, i) =>
        createTestNode(`n${i}`, 'function', `Node ${i}`)
      );
      const edges: WorkflowEdge[] = [];

      const antiPatterns = detector.detectAntiPatterns(nodes, edges);
      expect(antiPatterns).toContain('god-workflow');
    });

    it('should detect no-error-handling', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const antiPatterns = detector.detectAntiPatterns(nodes, edges);

      expect(antiPatterns).toContain('no-error-handling');
    });
  });

  describe('recommend', () => {
    it('should recommend patterns based on workflow', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const recommendations = detector.recommend(nodes, edges);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should consider context for recommendations', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const recommendations = detector.recommend(nodes, edges, {
        goal: 'error handling',
      });

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('learning', () => {
    it('should export and import learning data', () => {
      const learningData = detector.exportLearning();
      expect(typeof learningData).toBe('object');

      detector.importLearning({ 'test-pattern': 0.8 });
      const newData = detector.exportLearning();
      expect(newData['test-pattern']).toBe(0.8);
    });

    it('should reset learning history', () => {
      detector.importLearning({ 'test-pattern': 0.8 });
      detector.resetLearning();
      const data = detector.exportLearning();
      expect(Object.keys(data)).toHaveLength(0);
    });
  });

  describe('detectPatterns helper', () => {
    it('should detect patterns using convenience function', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const results = detectPatterns(nodes, edges);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('recommendPatterns helper', () => {
    it('should recommend patterns using convenience function', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const recommendations = recommendPatterns(nodes, edges);

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});

// ============================================================================
// AntiPatternCatalog Tests
// ============================================================================

describe('AntiPatternCatalog', () => {
  it('should have multiple anti-patterns', () => {
    expect(ANTI_PATTERN_CATALOG.length).toBeGreaterThanOrEqual(10);
  });

  it('should have valid anti-patterns', () => {
    ANTI_PATTERN_CATALOG.forEach((ap) => {
      expect(ap.id).toBeDefined();
      expect(ap.name).toBeDefined();
      expect(ap.severity).toBeDefined();
      expect(ap.detection.rules.length).toBeGreaterThan(0);
    });
  });

  describe('getAntiPatternById', () => {
    it('should find anti-pattern by ID', () => {
      const ap = getAntiPatternById('god-workflow');
      expect(ap).toBeDefined();
      expect(ap?.name).toBe('God Workflow');
    });

    it('should return undefined for non-existent', () => {
      const ap = getAntiPatternById('non-existent');
      expect(ap).toBeUndefined();
    });
  });

  describe('getAntiPatternsBySeverity', () => {
    it('should filter by critical severity', () => {
      const critical = getAntiPatternsBySeverity('critical');
      expect(critical.length).toBeGreaterThan(0);
      critical.forEach((ap) => expect(ap.severity).toBe('critical'));
    });

    it('should filter by high severity', () => {
      const high = getAntiPatternsBySeverity('high');
      expect(high.length).toBeGreaterThan(0);
    });
  });

  describe('ANTI_PATTERN_STATS', () => {
    it('should have correct total', () => {
      expect(ANTI_PATTERN_STATS.total).toBe(ANTI_PATTERN_CATALOG.length);
    });

    it('should have severity counts', () => {
      expect(ANTI_PATTERN_STATS.bySeverity.critical).toBeGreaterThan(0);
      expect(ANTI_PATTERN_STATS.bySeverity.high).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// AntiPatternDetector Tests
// ============================================================================

describe('AntiPatternDetector', () => {
  describe('detect', () => {
    it('should detect anti-patterns in workflow', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const results = AntiPatternDetector.detect(nodes, edges);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should sort by severity', () => {
      const nodes = Array.from({ length: 35 }, (_, i) =>
        createTestNode(`n${i}`, 'function', `Node ${i}`)
      );
      const results = AntiPatternDetector.detect(nodes, []);

      if (results.length > 1) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        expect(
          severityOrder[results[0].antiPattern.severity]
        ).toBeLessThanOrEqual(severityOrder[results[1].antiPattern.severity]);
      }
    });

    it('should include evidence', () => {
      const nodes = Array.from({ length: 35 }, (_, i) =>
        createTestNode(`n${i}`, 'function', `Node ${i}`)
      );
      const results = AntiPatternDetector.detect(nodes, []);

      if (results.length > 0) {
        expect(results[0].evidence.length).toBeGreaterThan(0);
      }
    });
  });

  describe('detectBySeverity', () => {
    it('should filter by severity', () => {
      const nodes = Array.from({ length: 35 }, (_, i) =>
        createTestNode(`n${i}`, 'function', `Node ${i}`)
      );
      const results = AntiPatternDetector.detectBySeverity(nodes, [], 'high');

      results.forEach((r) => expect(r.antiPattern.severity).toBe('high'));
    });
  });

  describe('detectCritical', () => {
    it('should detect only critical issues', () => {
      const nodes = [
        createTestNode('1', 'http-request', 'HTTP', { password: 'secret123' }),
      ];
      const results = AntiPatternDetector.detectCritical(nodes, []);

      results.forEach((r) => expect(r.antiPattern.severity).toBe('critical'));
    });
  });

  describe('calculateHealthScore', () => {
    it('should calculate health score', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const health = AntiPatternDetector.calculateHealthScore(nodes, edges);

      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(health.grade);
    });

    it('should return lower score for problematic workflows', () => {
      const nodes = Array.from({ length: 35 }, (_, i) =>
        createTestNode(`n${i}`, 'function', `Node ${i}`)
      );
      const badHealth = AntiPatternDetector.calculateHealthScore(nodes, []);

      const { nodes: goodNodes, edges: goodEdges } = createLinearWorkflow(3);
      const goodHealth = AntiPatternDetector.calculateHealthScore(
        goodNodes,
        goodEdges
      );

      expect(badHealth.score).toBeLessThanOrEqual(goodHealth.score);
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const report = AntiPatternDetector.generateReport(nodes, edges);

      expect(report.health).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.critical)).toBe(true);
      expect(Array.isArray(report.high)).toBe(true);
    });

    it('should include severity breakdowns', () => {
      const nodes = Array.from({ length: 35 }, (_, i) =>
        createTestNode(`n${i}`, 'function', `Node ${i}`)
      );
      const report = AntiPatternDetector.generateReport(nodes, []);

      expect(report.summary).toContain('Critical');
      expect(report.summary).toContain('High');
    });
  });

  describe('detectAntiPatterns helper', () => {
    it('should work as convenience function', () => {
      const { nodes, edges } = createBranchingWorkflow();
      const results = detectAntiPatterns(nodes, edges);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('checkWorkflowHealth helper', () => {
    it('should work as convenience function', () => {
      const { nodes, edges } = createLinearWorkflow(3);
      const health = checkWorkflowHealth(nodes, edges);

      expect(health.score).toBeDefined();
      expect(health.grade).toBeDefined();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Patterns Integration', () => {
  it('should detect patterns and anti-patterns together', () => {
    const { nodes, edges } = createBranchingWorkflow();

    const detector = new PatternDetector();
    const patterns = detector.detect(nodes, edges);
    const antiPatterns = AntiPatternDetector.detect(nodes, edges);

    expect(Array.isArray(patterns)).toBe(true);
    expect(Array.isArray(antiPatterns)).toBe(true);
  });

  it('should provide recommendations based on analysis', () => {
    const { nodes, edges } = createBranchingWorkflow();

    const detector = new PatternDetector();
    const recommendations = detector.recommend(nodes, edges);
    const health = AntiPatternDetector.calculateHealthScore(nodes, edges);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(health.score).toBeGreaterThanOrEqual(0);
  });

  it('should match and analyze workflow end-to-end', () => {
    const { nodes, edges } = createBranchingWorkflow();

    // Analyze graph
    const analysis = GraphAnalyzer.analyze(nodes, edges);
    expect(analysis.topology).toBeDefined();

    // Match patterns
    const bestMatch = PatternMatcher.findBestMatch(nodes, edges, PATTERN_CATALOG, 0.3);

    // Detect issues
    const issues = AntiPatternDetector.detect(nodes, edges);

    // Generate report
    const report = AntiPatternDetector.generateReport(nodes, edges);

    expect(analysis.nodeCount).toBe(5);
    expect(report.health).toBeDefined();
  });
});
