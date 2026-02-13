/**
 * Test Scenario Analyzer
 * Analyzes workflows and identifies test scenarios
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type { TestScenario } from './AITestGenerator';

export interface ScenarioAnalysis {
  totalScenarios: number;
  criticalScenarios: number;
  coverage: {
    nodes: number;
    edges: number;
    paths: number;
  };
  complexity: {
    score: number;
    factors: string[];
  };
  recommendations: string[];
  gaps: TestGap[];
}

export interface TestGap {
  type: 'missing-test' | 'insufficient-coverage' | 'missing-edge-case';
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedTests: string[];
}

export interface PathAnalysis {
  path: string[];
  complexity: number;
  riskLevel: 'high' | 'medium' | 'low';
  testScenarios: TestScenario[];
}

export class TestScenarioAnalyzer {
  /**
   * Analyze a workflow and identify test scenarios
   */
  analyzeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    existingTests: TestScenario[] = []
  ): ScenarioAnalysis {
    // Calculate coverage
    const coverage = this.calculateCoverage(nodes, edges, existingTests);

    // Calculate complexity
    const complexity = this.calculateComplexity(nodes, edges);

    // Identify gaps
    const gaps = this.identifyGaps(nodes, edges, existingTests);

    // Generate recommendations
    const recommendations = this.generateRecommendations(coverage, complexity, gaps);

    // Count critical scenarios
    const criticalScenarios = existingTests.filter((t) => t.priority === 'critical').length;

    return {
      totalScenarios: existingTests.length,
      criticalScenarios,
      coverage,
      complexity,
      recommendations,
      gaps,
    };
  }

  /**
   * Analyze all execution paths in a workflow
   */
  analyzeExecutionPaths(nodes: WorkflowNode[], edges: WorkflowEdge[]): PathAnalysis[] {
    const paths = this.findAllPaths(nodes, edges);
    return paths.map((path) => this.analyzePath(path, nodes, edges));
  }

  /**
   * Identify critical paths that need testing
   */
  identifyCriticalPaths(nodes: WorkflowNode[], edges: WorkflowEdge[]): PathAnalysis[] {
    const allPaths = this.analyzeExecutionPaths(nodes, edges);
    return allPaths.filter((p) => p.riskLevel === 'high' || p.complexity > 5);
  }

  /**
   * Suggest test scenarios for untested areas
   */
  suggestTestScenarios(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    existingTests: TestScenario[]
  ): TestScenario[] {
    const suggestions: TestScenario[] = [];
    const gaps = this.identifyGaps(nodes, edges, existingTests);

    gaps.forEach((gap) => {
      gap.suggestedTests.forEach((testName) => {
        suggestions.push({
          id: `suggested_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: testName,
          description: gap.description,
          priority: gap.priority,
          category: gap.type === 'missing-edge-case' ? 'edge-case' : 'happy-path',
          steps: [],
          expectedOutcome: 'To be defined',
        });
      });
    });

    return suggestions;
  }

  /**
   * Calculate test coverage metrics
   */
  private calculateCoverage(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    tests: TestScenario[]
  ) {
    // Extract tested nodes from test scenarios
    const testedNodes = new Set<string>();
    const testedEdges = new Set<string>();
    const testedPaths = new Set<string>();

    tests.forEach((test) => {
      // Extract node IDs from test steps
      test.steps.forEach((step) => {
        if (step.description.includes('node:')) {
          const match = step.description.match(/node:(\w+)/);
          if (match) {
            testedNodes.add(match[1]);
          }
        }
      });

      // Create path signature
      const pathSignature = test.steps.map((s) => s.action).join('-');
      testedPaths.add(pathSignature);
    });

    // Calculate coverage percentages
    const nodeCoverage = nodes.length > 0 ? (testedNodes.size / nodes.length) * 100 : 0;
    const edgeCoverage = edges.length > 0 ? (testedEdges.size / edges.length) * 100 : 0;

    // Find all possible paths
    const allPaths = this.findAllPaths(nodes, edges);
    const pathCoverage = allPaths.length > 0 ? (testedPaths.size / allPaths.length) * 100 : 0;

    return {
      nodes: Math.round(nodeCoverage),
      edges: Math.round(edgeCoverage),
      paths: Math.round(pathCoverage),
    };
  }

  /**
   * Calculate workflow complexity
   */
  private calculateComplexity(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const factors: string[] = [];
    let score = 0;

    // Cyclomatic complexity: edges - nodes + 2
    const cyclomaticComplexity = edges.length - nodes.length + 2;
    score += cyclomaticComplexity;

    if (cyclomaticComplexity > 10) {
      factors.push('High cyclomatic complexity');
    }

    // Count conditional nodes
    const conditionalNodes = nodes.filter(
      (n) => n.type === 'conditional' || n.type === 'switch'
    );
    score += conditionalNodes.length * 2;

    if (conditionalNodes.length > 3) {
      factors.push('Multiple conditional branches');
    }

    // Count loop nodes
    const loopNodes = nodes.filter((n) => n.type === 'loop' || n.type === 'forEach');
    score += loopNodes.length * 3;

    if (loopNodes.length > 0) {
      factors.push('Contains loops');
    }

    // Count error handlers
    const errorHandlers = nodes.filter((n) => n.type === 'errorHandler');
    score += errorHandlers.length;

    if (errorHandlers.length > 2) {
      factors.push('Complex error handling');
    }

    // Count external integrations
    const externalNodes = nodes.filter(
      (n) => n.type === 'http' || n.type === 'api' || n.type === 'webhook'
    );
    score += externalNodes.length * 2;

    if (externalNodes.length > 3) {
      factors.push('Multiple external integrations');
    }

    // Depth of workflow
    const depth = this.calculateMaxDepth(nodes, edges);
    score += depth;

    if (depth > 5) {
      factors.push('Deep workflow nesting');
    }

    // Fan-out (nodes with many outgoing edges)
    const maxFanOut = Math.max(...nodes.map((n) => edges.filter((e) => e.source === n.id).length));
    score += maxFanOut;

    if (maxFanOut > 3) {
      factors.push('High branching factor');
    }

    return { score, factors };
  }

  /**
   * Identify testing gaps
   */
  private identifyGaps(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    tests: TestScenario[]
  ): TestGap[] {
    const gaps: TestGap[] = [];

    // Find untested nodes
    const testedNodeTypes = new Set(
      tests.flatMap((t) =>
        t.steps
          .map((s) => s.description.match(/(\w+) node/)?.[1])
          .filter(Boolean)
      )
    );

    const untestedNodeTypes = new Set(
      nodes.map((n) => n.type).filter((type) => !testedNodeTypes.has(type))
    );

    if (untestedNodeTypes.size > 0) {
      gaps.push({
        type: 'missing-test',
        description: `No tests for node types: ${Array.from(untestedNodeTypes).join(', ')}`,
        priority: 'high',
        suggestedTests: Array.from(untestedNodeTypes).map(
          (type) => `Test ${type} node functionality`
        ),
      });
    }

    // Check for missing error handling tests
    const hasErrorTests = tests.some((t) => t.category === 'error-handling');
    if (!hasErrorTests && nodes.length > 0) {
      gaps.push({
        type: 'missing-test',
        description: 'No error handling tests found',
        priority: 'critical',
        suggestedTests: [
          'Test error handling for failed nodes',
          'Test workflow recovery from errors',
          'Test error propagation',
        ],
      });
    }

    // Check for missing edge case tests
    const hasEdgeCaseTests = tests.some((t) => t.category === 'edge-case');
    if (!hasEdgeCaseTests && nodes.length > 3) {
      gaps.push({
        type: 'missing-edge-case',
        description: 'No edge case tests found',
        priority: 'high',
        suggestedTests: [
          'Test with empty inputs',
          'Test with maximum data size',
          'Test with invalid data types',
        ],
      });
    }

    // Check for conditional branch coverage
    const conditionalNodes = nodes.filter(
      (n) => n.type === 'conditional' || n.type === 'switch'
    );

    if (conditionalNodes.length > 0) {
      const hasBranchTests = tests.some((t) => t.name.toLowerCase().includes('branch'));
      if (!hasBranchTests) {
        gaps.push({
          type: 'insufficient-coverage',
          description: 'Conditional branches not fully tested',
          priority: 'high',
          suggestedTests: conditionalNodes.flatMap((node) => [
            `Test ${node.data.label} - true branch`,
            `Test ${node.data.label} - false branch`,
          ]),
        });
      }
    }

    // Check for performance tests
    const hasPerformanceTests = tests.some((t) => t.category === 'performance');
    if (!hasPerformanceTests && nodes.length > 5) {
      gaps.push({
        type: 'missing-test',
        description: 'No performance tests found for complex workflow',
        priority: 'medium',
        suggestedTests: [
          'Test workflow execution time',
          'Test with large data volumes',
          'Test concurrent executions',
        ],
      });
    }

    return gaps;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    coverage: { nodes: number; edges: number; paths: number },
    complexity: { score: number; factors: string[] },
    gaps: TestGap[]
  ): string[] {
    const recommendations: string[] = [];

    // Coverage recommendations
    if (coverage.nodes < 80) {
      recommendations.push(
        `Increase node coverage from ${coverage.nodes}% to at least 80%`
      );
    }

    if (coverage.paths < 70) {
      recommendations.push(
        `Increase path coverage from ${coverage.paths}% to at least 70%`
      );
    }

    // Complexity recommendations
    if (complexity.score > 20) {
      recommendations.push(
        'Consider refactoring workflow to reduce complexity (current score: ' +
          complexity.score +
          ')'
      );
    }

    if (complexity.factors.includes('Multiple conditional branches')) {
      recommendations.push(
        'Add comprehensive tests for all conditional branch combinations'
      );
    }

    if (complexity.factors.includes('Contains loops')) {
      recommendations.push('Add boundary tests for loop conditions (0, 1, max iterations)');
    }

    // Gap recommendations
    const criticalGaps = gaps.filter((g) => g.priority === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(
        `Address ${criticalGaps.length} critical testing gap(s) immediately`
      );
    }

    const highGaps = gaps.filter((g) => g.priority === 'high');
    if (highGaps.length > 0) {
      recommendations.push(`Prioritize ${highGaps.length} high-priority testing gap(s)`);
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Test coverage is good! Consider adding more edge cases.');
    }

    return recommendations;
  }

  /**
   * Find all execution paths
   */
  private findAllPaths(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[][] {
    const startNodes = nodes.filter(
      (n) => n.type === 'trigger' || !edges.some((e) => e.target === n.id)
    );

    const allPaths: string[][] = [];

    startNodes.forEach((start) => {
      const paths = this.findPathsFromNode(start.id, nodes, edges);
      allPaths.push(...paths);
    });

    return allPaths;
  }

  /**
   * Find paths from a specific node
   */
  private findPathsFromNode(
    nodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    visited: Set<string> = new Set(),
    currentPath: string[] = []
  ): string[][] {
    // Prevent infinite loops
    if (visited.has(nodeId)) {
      return [currentPath];
    }

    visited.add(nodeId);
    currentPath.push(nodeId);

    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    // End of path
    if (outgoingEdges.length === 0) {
      return [currentPath];
    }

    const paths: string[][] = [];

    outgoingEdges.forEach((edge) => {
      const subPaths = this.findPathsFromNode(
        edge.target,
        nodes,
        edges,
        new Set(visited),
        [...currentPath]
      );
      paths.push(...subPaths);
    });

    return paths;
  }

  /**
   * Analyze a single execution path
   */
  private analyzePath(
    path: string[],
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): PathAnalysis {
    const pathNodes = path.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as WorkflowNode[];

    // Calculate complexity
    let complexity = pathNodes.length;

    // Add complexity for specific node types
    pathNodes.forEach((node) => {
      if (node.type === 'conditional' || node.type === 'switch') {
        complexity += 2;
      } else if (node.type === 'loop' || node.type === 'forEach') {
        complexity += 3;
      } else if (node.type === 'http' || node.type === 'api') {
        complexity += 1;
      }
    });

    // Determine risk level
    let riskLevel: 'high' | 'medium' | 'low' = 'low';
    if (complexity > 10) {
      riskLevel = 'high';
    } else if (complexity > 5) {
      riskLevel = 'medium';
    }

    // Check for risky nodes
    const hasExternalCalls = pathNodes.some(
      (n) => n.type === 'http' || n.type === 'api' || n.type === 'webhook'
    );
    const hasDataTransform = pathNodes.some((n) => n.type === 'transform' || n.type === 'code');

    if (hasExternalCalls) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    }

    return {
      path,
      complexity,
      riskLevel,
      testScenarios: [],
    };
  }

  /**
   * Calculate maximum depth of workflow
   */
  private calculateMaxDepth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    const startNodes = nodes.filter(
      (n) => n.type === 'trigger' || !edges.some((e) => e.target === n.id)
    );

    let maxDepth = 0;

    startNodes.forEach((start) => {
      const depth = this.getDepthFromNode(start.id, edges);
      maxDepth = Math.max(maxDepth, depth);
    });

    return maxDepth;
  }

  /**
   * Get depth from a specific node
   */
  private getDepthFromNode(
    nodeId: string,
    edges: WorkflowEdge[],
    visited: Set<string> = new Set()
  ): number {
    if (visited.has(nodeId)) {
      return 0;
    }

    visited.add(nodeId);

    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    if (outgoingEdges.length === 0) {
      return 1;
    }

    const depths = outgoingEdges.map((edge) =>
      this.getDepthFromNode(edge.target, edges, new Set(visited))
    );

    return 1 + Math.max(...depths);
  }
}

export default TestScenarioAnalyzer;
