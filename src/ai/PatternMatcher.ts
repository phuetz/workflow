/**
 * Pattern Matcher for Workflow Recommendations
 *
 * Recognizes common workflow patterns and suggests improvements
 * based on best practices and usage patterns.
 */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';

export interface WorkflowPattern {
  name: string;
  description: string;
  confidence: number;
  nodes: WorkflowNode[];
  recommendation?: string;
}

export interface PatternMatch {
  pattern: string;
  confidence: number;
  nodes: string[];
  suggestion: string;
  category: 'optimization' | 'best-practice' | 'security' | 'performance';
}

export class PatternMatcher {
  /**
   * Detect all patterns in workflow
   */
  detectPatterns(nodes: WorkflowNode[], edges: WorkflowEdge[]): PatternMatch[] {
    const matches: PatternMatch[] = [];

    // Performance patterns
    matches.push(...this.detectPerformancePatterns(nodes, edges));

    // Security patterns
    matches.push(...this.detectSecurityPatterns(nodes, edges));

    // Best practice patterns
    matches.push(...this.detectBestPracticePatterns(nodes, edges));

    // Optimization patterns
    matches.push(...this.detectOptimizationPatterns(nodes, edges));

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect performance anti-patterns
   */
  private detectPerformancePatterns(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Pattern: API calls in loop
    const loopNodes = nodes.filter(n =>
      ['forEach', 'whileLoop', 'loop'].includes(n.type)
    );

    for (const loopNode of loopNodes) {
      const loopChildren = this.getChildNodes(loopNode, edges, nodes);
      const hasApiCall = loopChildren.some(n => n.type === 'httpRequest');

      if (hasApiCall) {
        patterns.push({
          pattern: 'api-in-loop',
          confidence: 90,
          nodes: [loopNode.id, ...loopChildren.map(n => n.id)],
          suggestion: 'Consider batching API calls instead of calling inside loop. This can improve performance by 10-100x.',
          category: 'performance'
        });
      }
    }

    // Pattern: Sequential API calls that could be parallel
    const parallelizable = this.detectParallelizableSequence(nodes, edges);
    if (parallelizable.length > 0) {
      patterns.push({
        pattern: 'parallelizable-sequence',
        confidence: 85,
        nodes: parallelizable,
        suggestion: `These ${parallelizable.length} nodes can run in parallel. Enable parallel execution to reduce total execution time.`,
        category: 'performance'
      });
    }

    // Pattern: Large data transformation
    const largeTransforms = nodes.filter(n =>
      n.type === 'set' &&
      n.data.config?.values &&
      Array.isArray(n.data.config.values) &&
      n.data.config.values.length > 20
    );

    for (const transform of largeTransforms) {
      patterns.push({
        pattern: 'large-transform',
        confidence: 70,
        nodes: [transform.id],
        suggestion: 'Consider breaking this large transformation into smaller chunks to improve memory usage.',
        category: 'performance'
      });
    }

    return patterns;
  }

  /**
   * Detect security anti-patterns
   */
  private detectSecurityPatterns(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Pattern: Webhook without validation
    const webhooks = nodes.filter(n => n.type === 'webhook');

    for (const webhook of webhooks) {
      const children = this.getChildNodes(webhook, edges, nodes);
      const hasValidation = children.some(n =>
        ['if', 'validate', 'filter'].includes(n.type)
      );

      if (!hasValidation) {
        patterns.push({
          pattern: 'webhook-no-validation',
          confidence: 95,
          nodes: [webhook.id],
          suggestion: 'Add data validation after webhook trigger to prevent malicious inputs.',
          category: 'security'
        });
      }
    }

    // Pattern: API key in config (should use credentials)
    const nodesWithApiKeys = nodes.filter(n => {
      const config = n.data.config || {};
      const configStr = JSON.stringify(config).toLowerCase();
      return configStr.includes('api_key') || configStr.includes('apikey') || configStr.includes('token');
    });

    for (const node of nodesWithApiKeys) {
      patterns.push({
        pattern: 'credentials-in-config',
        confidence: 80,
        nodes: [node.id],
        suggestion: 'Move API keys and tokens to credentials manager for better security.',
        category: 'security'
      });
    }

    // Pattern: No HTTPS enforcement
    const httpNodes = nodes.filter(n => {
      if (n.type !== 'httpRequest') return false;
      const url = n.data.config?.url as string;
      return url && url.startsWith('http://');
    });

    for (const node of httpNodes) {
      patterns.push({
        pattern: 'http-not-https',
        confidence: 75,
        nodes: [node.id],
        suggestion: 'Use HTTPS instead of HTTP for secure communication.',
        category: 'security'
      });
    }

    return patterns;
  }

  /**
   * Detect best practice anti-patterns
   */
  private detectBestPracticePatterns(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Pattern: HTTP request without error handling
    const httpNodes = nodes.filter(n => n.type === 'httpRequest');

    for (const httpNode of httpNodes) {
      const hasErrorHandling = edges.some(e =>
        e.source === httpNode.id && e.sourceHandle === 'error'
      );

      if (!hasErrorHandling) {
        patterns.push({
          pattern: 'no-error-handling',
          confidence: 90,
          nodes: [httpNode.id],
          suggestion: 'Add error handling to HTTP request to handle network failures gracefully.',
          category: 'best-practice'
        });
      }
    }

    // Pattern: No logging in critical workflow
    const hasCriticalNodes = nodes.some(n =>
      ['database', 'payment', 'stripe', 'paypal'].includes(n.type)
    );

    const hasLogging = nodes.some(n =>
      n.type === 'log' || n.data.config?.logging === true
    );

    if (hasCriticalNodes && !hasLogging) {
      patterns.push({
        pattern: 'no-logging',
        confidence: 85,
        nodes: nodes.filter(n =>
          ['database', 'payment', 'stripe', 'paypal'].includes(n.type)
        ).map(n => n.id),
        suggestion: 'Add logging to critical operations for debugging and monitoring.',
        category: 'best-practice'
      });
    }

    // Pattern: Generic node names
    const genericNodes = nodes.filter(n =>
      ['node', 'new node', 'untitled'].includes(n.data.label.toLowerCase())
    );

    if (genericNodes.length > 0) {
      patterns.push({
        pattern: 'generic-names',
        confidence: 70,
        nodes: genericNodes.map(n => n.id),
        suggestion: `${genericNodes.length} nodes have generic names. Use descriptive names for better maintainability.`,
        category: 'best-practice'
      });
    }

    return patterns;
  }

  /**
   * Detect optimization opportunities
   */
  private detectOptimizationPatterns(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    // Pattern: Duplicate API calls
    const apiCalls = nodes.filter(n => n.type === 'httpRequest');
    const urlGroups = new Map<string, WorkflowNode[]>();

    for (const node of apiCalls) {
      const url = node.data.config?.url as string;
      if (url) {
        if (!urlGroups.has(url)) {
          urlGroups.set(url, []);
        }
        urlGroups.get(url)!.push(node);
      }
    }

    for (const [url, duplicates] of urlGroups.entries()) {
      if (duplicates.length > 1) {
        patterns.push({
          pattern: 'duplicate-api-calls',
          confidence: 85,
          nodes: duplicates.map(n => n.id),
          suggestion: `${duplicates.length} nodes call the same API endpoint. Consider caching the result.`,
          category: 'optimization'
        });
      }
    }

    // Pattern: Expensive operations without caching
    const expensiveNodes = nodes.filter(n =>
      ['llm', 'ai', 'gpt', 'openai', 'anthropic'].includes(n.type)
    );

    for (const node of expensiveNodes) {
      const hasCache = node.data.config?.cache === true;

      if (!hasCache) {
        patterns.push({
          pattern: 'no-caching',
          confidence: 80,
          nodes: [node.id],
          suggestion: 'Enable caching for this expensive operation to save costs and improve performance.',
          category: 'optimization'
        });
      }
    }

    // Pattern: Heavy workflow without sub-workflows
    if (nodes.length > 30) {
      const hasSubWorkflows = nodes.some(n => n.type === 'subworkflow');

      if (!hasSubWorkflows) {
        patterns.push({
          pattern: 'no-modularization',
          confidence: 75,
          nodes: [],
          suggestion: 'This workflow is complex. Consider breaking it into sub-workflows for better maintainability.',
          category: 'optimization'
        });
      }
    }

    return patterns;
  }

  /**
   * Get child nodes (nodes connected after this node)
   */
  private getChildNodes(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    allNodes: WorkflowNode[]
  ): WorkflowNode[] {
    const childEdges = edges.filter(e => e.source === node.id);
    const childIds = childEdges.map(e => e.target);
    return allNodes.filter(n => childIds.includes(n.id));
  }

  /**
   * Detect sequence of nodes that could run in parallel
   */
  private detectParallelizableSequence(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): string[] {
    const parallelizable: string[] = [];

    // Find nodes that have same parent but no dependencies on each other
    for (const node of nodes) {
      const incomingEdges = edges.filter(e => e.target === node.id);

      if (incomingEdges.length === 1) {
        const parent = incomingEdges[0].source;
        const siblings = edges
          .filter(e => e.source === parent && e.target !== node.id)
          .map(e => e.target);

        if (siblings.length > 0) {
          // Check if node and siblings have no dependencies on each other
          const hasDependency = siblings.some(siblingId => {
            return this.hasPath(siblingId, node.id, edges) ||
                   this.hasPath(node.id, siblingId, edges);
          });

          if (!hasDependency) {
            parallelizable.push(node.id, ...siblings);
          }
        }
      }
    }

    return [...new Set(parallelizable)];
  }

  /**
   * Check if there's a path from source to target
   */
  private hasPath(
    sourceId: string,
    targetId: string,
    edges: WorkflowEdge[]
  ): boolean {
    const visited = new Set<string>();
    const queue = [sourceId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === targetId) {
        return true;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const outgoing = edges.filter(e => e.source === current);
      queue.push(...outgoing.map(e => e.target));
    }

    return false;
  }

  /**
   * Calculate pattern similarity score
   */
  calculateSimilarity(
    workflow1: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
    workflow2: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  ): number {
    const types1 = workflow1.nodes.map(n => n.type).sort();
    const types2 = workflow2.nodes.map(n => n.type).sort();

    // Jaccard similarity
    const set1 = new Set(types1);
    const set2 = new Set(types2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }
}

export const patternMatcher = new PatternMatcher();
