/**
 * Pattern Matcher
 * Matches workflow graphs against pattern definitions
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type {
  PatternDefinition,
  PatternMatch,
  PatternDeviation,
} from '../types/patterns';
import { GraphAnalyzer } from './GraphAnalyzer';

/**
 * Matches workflows against pattern definitions
 */
export class PatternMatcher {
  /**
   * Match workflow against a pattern
   */
  static match(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition
  ): PatternMatch {
    const nodeIds: string[] = [];
    const edgeIds: string[] = [];
    const deviations: PatternDeviation[] = [];

    // Check basic constraints
    const constraintResults = this.checkConstraints(nodes, edges, pattern);
    deviations.push(...constraintResults.deviations);

    // Check node types
    const nodeTypeResults = this.checkNodeTypes(nodes, pattern);
    nodeIds.push(...nodeTypeResults.matchedNodes);
    deviations.push(...nodeTypeResults.deviations);

    // Check edges
    const edgeResults = this.checkEdges(nodes, edges, pattern);
    edgeIds.push(...edgeResults.matchedEdges);
    deviations.push(...edgeResults.deviations);

    // Check topology
    const topologyResults = this.checkTopology(nodes, edges, pattern);
    deviations.push(...topologyResults.deviations);

    // Calculate score and coverage
    const score = this.calculateScore(
      nodes,
      edges,
      pattern,
      nodeIds,
      edgeIds,
      deviations
    );
    const coverage = this.calculateCoverage(nodes, edges, nodeIds, edgeIds);

    return {
      nodeIds,
      edgeIds,
      score,
      coverage,
      deviations,
    };
  }

  /**
   * Check pattern constraints
   */
  private static checkConstraints(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition
  ): {
    deviations: PatternDeviation[];
  } {
    const deviations: PatternDeviation[] = [];

    for (const constraint of pattern.structure.constraints) {
      const isValid = constraint.validate(nodes, edges);

      if (!isValid) {
        deviations.push({
          type: 'config-mismatch',
          severity: 'medium',
          description: `Constraint failed: ${constraint.description}`,
          suggestion: `Ensure workflow meets: ${constraint.description}`,
        });
      }
    }

    return { deviations };
  }

  /**
   * Check node types match pattern
   */
  private static checkNodeTypes(
    nodes: WorkflowNode[],
    pattern: PatternDefinition
  ): {
    matchedNodes: string[];
    deviations: PatternDeviation[];
  } {
    const matchedNodes: string[] = [];
    const deviations: PatternDeviation[] = [];

    // Check required node types
    for (const requiredType of pattern.structure.requiredNodeTypes) {
      const matchingNodes = nodes.filter((node) => node.type === requiredType);

      if (matchingNodes.length === 0) {
        deviations.push({
          type: 'missing-node',
          severity: 'high',
          description: `Required node type '${requiredType}' not found`,
          suggestion: `Add a '${requiredType}' node to match this pattern`,
        });
      } else {
        matchedNodes.push(...matchingNodes.map((n) => n.id));
      }
    }

    // Check for extra nodes
    const allowedTypes = new Set([
      ...pattern.structure.requiredNodeTypes,
      ...pattern.structure.optionalNodeTypes,
    ]);

    const extraNodes = nodes.filter((node) => !allowedTypes.has(node.type));

    if (extraNodes.length > 0) {
      for (const extraNode of extraNodes) {
        deviations.push({
          type: 'extra-node',
          severity: 'low',
          description: `Unexpected node type '${extraNode.type}'`,
          suggestion: `Consider removing or recategorizing node '${extraNode.data.label}'`,
        });
      }
    }

    return { matchedNodes, deviations };
  }

  /**
   * Check edges match pattern
   */
  private static checkEdges(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition
  ): {
    matchedEdges: string[];
    deviations: PatternDeviation[];
  } {
    const matchedEdges: string[] = [];
    const deviations: PatternDeviation[] = [];

    for (const requiredEdge of pattern.structure.requiredEdges) {
      if (!requiredEdge.required) continue;

      // Find nodes matching the from/to types
      const fromNodes = nodes.filter((node) => node.type === requiredEdge.from);
      const toNodes = nodes.filter((node) => node.type === requiredEdge.to);

      let found = false;

      for (const fromNode of fromNodes) {
        for (const toNode of toNodes) {
          const edge = edges.find(
            (e) => e.source === fromNode.id && e.target === toNode.id
          );

          if (edge) {
            matchedEdges.push(edge.id);
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        deviations.push({
          type: 'missing-edge',
          severity: 'high',
          description: `Required edge from '${requiredEdge.from}' to '${requiredEdge.to}' not found`,
          suggestion: `Add connection from '${requiredEdge.from}' to '${requiredEdge.to}'`,
        });
      }
    }

    return { matchedEdges, deviations };
  }

  /**
   * Check topology matches pattern
   */
  private static checkTopology(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition
  ): {
    deviations: PatternDeviation[];
  } {
    const deviations: PatternDeviation[] = [];

    const analysis = GraphAnalyzer.analyze(nodes, edges);
    const expectedTopology = pattern.structure.topology;

    if (analysis.topology !== expectedTopology) {
      deviations.push({
        type: 'wrong-topology',
        severity: 'medium',
        description: `Expected '${expectedTopology}' topology but found '${analysis.topology}'`,
        suggestion: `Restructure workflow to match '${expectedTopology}' topology`,
      });
    }

    return { deviations };
  }

  /**
   * Calculate match score (0-1)
   */
  private static calculateScore(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition,
    matchedNodeIds: string[],
    matchedEdgeIds: string[],
    deviations: PatternDeviation[]
  ): number {
    let score = 1.0;

    // Penalize for missing required nodes
    const requiredNodeCount = pattern.structure.requiredNodeTypes.length;
    const missingNodes = deviations.filter((d) => d.type === 'missing-node').length;
    if (requiredNodeCount > 0) {
      score -= (missingNodes / requiredNodeCount) * 0.3;
    }

    // Penalize for missing required edges
    const requiredEdgeCount = pattern.structure.requiredEdges.filter(
      (e) => e.required
    ).length;
    const missingEdges = deviations.filter((d) => d.type === 'missing-edge').length;
    if (requiredEdgeCount > 0) {
      score -= (missingEdges / requiredEdgeCount) * 0.3;
    }

    // Penalize for wrong topology
    const wrongTopology = deviations.some((d) => d.type === 'wrong-topology');
    if (wrongTopology) {
      score -= 0.2;
    }

    // Penalize for constraint violations
    const constraintViolations = deviations.filter(
      (d) => d.type === 'config-mismatch'
    ).length;
    score -= constraintViolations * 0.05;

    // Small penalty for extra nodes
    const extraNodes = deviations.filter((d) => d.type === 'extra-node').length;
    score -= extraNodes * 0.02;

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate coverage (percentage of workflow covered by pattern)
   */
  private static calculateCoverage(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    matchedNodeIds: string[],
    matchedEdgeIds: string[]
  ): number {
    if (nodes.length === 0 && edges.length === 0) return 0;

    const nodeCoverage =
      nodes.length > 0 ? matchedNodeIds.length / nodes.length : 0;
    const edgeCoverage =
      edges.length > 0 ? matchedEdgeIds.length / edges.length : 0;

    // Weighted average: nodes are more important
    return nodeCoverage * 0.7 + edgeCoverage * 0.3;
  }

  /**
   * Match multiple patterns and return best matches
   */
  static matchMultiple(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    patterns: PatternDefinition[],
    threshold = 0.5
  ): Array<{ pattern: PatternDefinition; match: PatternMatch }> {
    const results = patterns
      .map((pattern) => ({
        pattern,
        match: this.match(nodes, edges, pattern),
      }))
      .filter((result) => result.match.score >= threshold)
      .sort((a, b) => b.match.score - a.match.score);

    return results;
  }

  /**
   * Find best matching pattern
   */
  static findBestMatch(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    patterns: PatternDefinition[],
    threshold = 0.5
  ): { pattern: PatternDefinition; match: PatternMatch } | null {
    const matches = this.matchMultiple(nodes, edges, patterns, threshold);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Check if workflow matches pattern (simple boolean)
   */
  static isMatch(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition,
    threshold = 0.7
  ): boolean {
    const match = this.match(nodes, edges, pattern);
    return match.score >= threshold;
  }

  /**
   * Get match quality assessment
   */
  static getMatchQuality(score: number): {
    level: 'excellent' | 'good' | 'fair' | 'poor';
    description: string;
  } {
    if (score >= 0.9) {
      return {
        level: 'excellent',
        description: 'Workflow closely matches this pattern',
      };
    } else if (score >= 0.7) {
      return {
        level: 'good',
        description: 'Workflow matches this pattern with minor deviations',
      };
    } else if (score >= 0.5) {
      return {
        level: 'fair',
        description: 'Workflow partially matches this pattern',
      };
    } else {
      return {
        level: 'poor',
        description: 'Workflow does not match this pattern well',
      };
    }
  }

  /**
   * Calculate similarity between two workflows
   */
  static calculateSimilarity(
    nodes1: WorkflowNode[],
    edges1: WorkflowEdge[],
    nodes2: WorkflowNode[],
    edges2: WorkflowEdge[]
  ): number {
    // Calculate structural similarity

    // Node type similarity
    const types1 = new Set(nodes1.map((n) => n.type));
    const types2 = new Set(nodes2.map((n) => n.type));
    const commonTypes = new Set([...types1].filter((t) => types2.has(t)));
    const allTypes = new Set([...types1, ...types2]);
    const typeSimilarity = commonTypes.size / allTypes.size;

    // Size similarity
    const sizeDiff = Math.abs(nodes1.length - nodes2.length);
    const avgSize = (nodes1.length + nodes2.length) / 2;
    const sizeSimilarity = avgSize > 0 ? 1 - sizeDiff / avgSize : 1;

    // Topology similarity
    const analysis1 = GraphAnalyzer.analyze(nodes1, edges1);
    const analysis2 = GraphAnalyzer.analyze(nodes2, edges2);
    const topologySimilarity = analysis1.topology === analysis2.topology ? 1 : 0.5;

    // Weighted average
    return typeSimilarity * 0.5 + sizeSimilarity * 0.3 + topologySimilarity * 0.2;
  }

  /**
   * Extract subgraph matching pattern
   */
  static extractMatchingSubgraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    pattern: PatternDefinition
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null {
    const match = this.match(nodes, edges, pattern);

    if (match.score < 0.5) return null;

    const matchedNodes = nodes.filter((node) => match.nodeIds.includes(node.id));
    const matchedEdges = edges.filter((edge) => match.edgeIds.includes(edge.id));

    return {
      nodes: matchedNodes,
      edges: matchedEdges,
    };
  }
}
