import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';

export interface ComplexityMetrics {
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  branchCount: number;
  cycleCount: number;
  orphanedNodes: string[];
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  score: number; // 0-100
}

export interface RenderMetrics {
  fps: number;
  renderTime: number;
  paintTime: number;
  lastUpdate: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  percentage: number;
}

export interface PerformanceWarning {
  id: string;
  type: 'complexity' | 'performance' | 'memory';
  severity: 'low' | 'medium' | 'high';
  message: string;
  fix?: {
    type: string;
    nodeIds?: string[];
  };
}

export interface OptimizationSuggestion {
  id: string;
  message: string;
  description: string;
  impact: number; // Estimated % improvement
  action: string;
  nodeIds?: string[];
}

export interface WorkflowPerformanceMetrics {
  complexity: ComplexityMetrics;
  render: RenderMetrics;
  memory: MemoryMetrics;
  score: number; // Overall score 0-100
  warnings: PerformanceWarning[];
  suggestions: OptimizationSuggestion[];
}

/**
 * Hook to track workflow editor performance metrics in real-time
 */
export const useWorkflowPerformance = (enabled: boolean = true) => {
  const { nodes, edges } = useWorkflowStore();
  const [metrics, setMetrics] = useState<WorkflowPerformanceMetrics>({
    complexity: {
      nodeCount: 0,
      edgeCount: 0,
      maxDepth: 0,
      branchCount: 0,
      cycleCount: 0,
      orphanedNodes: [],
      complexity: 'low',
      score: 100,
    },
    render: {
      fps: 60,
      renderTime: 0,
      paintTime: 0,
      lastUpdate: Date.now(),
    },
    memory: {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      percentage: 0,
    },
    score: 100,
    warnings: [],
    suggestions: [],
  });

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const fpsHistoryRef = useRef<number[]>([]);

  /**
   * Calculate maximum depth of workflow using DFS
   */
  const calculateMaxDepth = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]): number => {
    if (nodes.length === 0) return 0;

    // Build adjacency list
    const adjList = new Map<string, string[]>();
    nodes.forEach(node => adjList.set(node.id, []));
    edges.forEach(edge => {
      const sources = adjList.get(edge.source) || [];
      sources.push(edge.target);
      adjList.set(edge.source, sources);
    });

    // Find trigger nodes (nodes with no incoming edges)
    const incomingCount = new Map<string, number>();
    nodes.forEach(node => incomingCount.set(node.id, 0));
    edges.forEach(edge => {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    });

    const triggerNodes = nodes.filter(node => (incomingCount.get(node.id) || 0) === 0);

    if (triggerNodes.length === 0) return nodes.length; // Circular workflow

    // DFS from each trigger to find max depth
    const visited = new Set<string>();
    let maxDepth = 0;

    const dfs = (nodeId: string, depth: number) => {
      if (visited.has(nodeId)) return depth;
      visited.add(nodeId);

      maxDepth = Math.max(maxDepth, depth);

      const children = adjList.get(nodeId) || [];
      children.forEach(child => {
        dfs(child, depth + 1);
      });

      return depth;
    };

    triggerNodes.forEach(node => {
      visited.clear();
      dfs(node.id, 1);
    });

    return maxDepth;
  }, []);

  /**
   * Detect cycles in workflow using DFS
   */
  const detectCycles = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]): number => {
    if (nodes.length === 0) return 0;

    const adjList = new Map<string, string[]>();
    nodes.forEach(node => adjList.set(node.id, []));
    edges.forEach(edge => {
      const sources = adjList.get(edge.source) || [];
      sources.push(edge.target);
      adjList.set(edge.source, sources);
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();
    let cycleCount = 0;

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const children = adjList.get(nodeId) || [];
      for (const child of children) {
        if (!visited.has(child)) {
          if (hasCycle(child)) {
            cycleCount++;
            return true;
          }
        } else if (recStack.has(child)) {
          cycleCount++;
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        hasCycle(node.id);
      }
    });

    return cycleCount;
  }, []);

  /**
   * Find orphaned nodes (no connections)
   */
  const findOrphanedNodes = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] => {
    const connectedNodes = new Set<string>();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    return nodes
      .filter(node => !connectedNodes.has(node.id))
      .map(node => node.id);
  }, []);

  /**
   * Calculate complexity metrics
   */
  const calculateComplexity = useCallback((): ComplexityMetrics => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const maxDepth = calculateMaxDepth(nodes, edges);
    const cycleCount = detectCycles(nodes, edges);
    const orphanedNodes = findOrphanedNodes(nodes, edges);

    // Count branches (nodes with multiple outgoing edges)
    const branchCount = nodes.filter(node =>
      edges.filter(edge => edge.source === node.id).length > 1
    ).length;

    // Calculate complexity score (0-100, higher is better)
    let score = 100;

    // Penalties
    if (nodeCount > 50) score -= 15;
    else if (nodeCount > 30) score -= 10;
    else if (nodeCount > 20) score -= 5;

    if (maxDepth > 10) score -= 15;
    else if (maxDepth > 7) score -= 10;
    else if (maxDepth > 5) score -= 5;

    if (cycleCount > 0) score -= 25; // Cycles are bad

    if (branchCount > 10) score -= 10;
    else if (branchCount > 5) score -= 5;

    if (orphanedNodes.length > 0) score -= 5;

    score = Math.max(0, Math.min(100, score));

    // Determine complexity level
    let complexity: ComplexityMetrics['complexity'];
    if (score >= 80) complexity = 'low';
    else if (score >= 60) complexity = 'medium';
    else if (score >= 40) complexity = 'high';
    else complexity = 'very-high';

    return {
      nodeCount,
      edgeCount,
      maxDepth,
      branchCount,
      cycleCount,
      orphanedNodes,
      complexity,
      score,
    };
  }, [nodes, edges, calculateMaxDepth, detectCycles, findOrphanedNodes]);

  /**
   * Generate warnings based on metrics
   */
  const generateWarnings = useCallback((
    complexity: ComplexityMetrics,
    render: RenderMetrics,
    memory: MemoryMetrics
  ): PerformanceWarning[] => {
    const warnings: PerformanceWarning[] = [];

    // Complexity warnings
    if (complexity.cycleCount > 0) {
      warnings.push({
        id: 'cycle-detected',
        type: 'complexity',
        severity: 'high',
        message: `${complexity.cycleCount} cycle(s) detected in workflow. This may cause infinite loops.`,
      });
    }

    if (complexity.maxDepth > 10) {
      warnings.push({
        id: 'deep-nesting',
        type: 'complexity',
        severity: 'medium',
        message: `Workflow depth is ${complexity.maxDepth} (recommended: < 10). Consider using sub-workflows.`,
      });
    }

    if (complexity.orphanedNodes.length > 0) {
      warnings.push({
        id: 'orphaned-nodes',
        type: 'complexity',
        severity: 'low',
        message: `${complexity.orphanedNodes.length} orphaned node(s) detected with no connections.`,
        fix: {
          type: 'remove-orphaned',
          nodeIds: complexity.orphanedNodes,
        },
      });
    }

    // Performance warnings
    if (render.fps < 30) {
      warnings.push({
        id: 'low-fps',
        type: 'performance',
        severity: 'high',
        message: `Low FPS detected (${render.fps.toFixed(0)}). Editor may feel sluggish.`,
      });
    }

    if (render.renderTime > 33) {
      warnings.push({
        id: 'slow-render',
        type: 'performance',
        severity: 'medium',
        message: `Render time is ${render.renderTime.toFixed(0)}ms (recommended: < 16ms).`,
      });
    }

    // Memory warnings
    if (memory.percentage > 90) {
      warnings.push({
        id: 'high-memory',
        type: 'memory',
        severity: 'high',
        message: `Memory usage is ${memory.percentage.toFixed(0)}% of available heap.`,
      });
    } else if (memory.percentage > 70) {
      warnings.push({
        id: 'moderate-memory',
        type: 'memory',
        severity: 'medium',
        message: `Memory usage is ${memory.percentage.toFixed(0)}% of available heap.`,
      });
    }

    return warnings;
  }, []);

  /**
   * Generate optimization suggestions
   */
  const generateSuggestions = useCallback((
    complexity: ComplexityMetrics,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Suggestion 1: Use sub-workflows for deep nesting
    if (complexity.maxDepth > 7) {
      suggestions.push({
        id: 'use-subworkflows',
        message: 'Use sub-workflows to reduce complexity',
        description: `Your workflow has a depth of ${complexity.maxDepth}. Breaking it into sub-workflows will improve maintainability and performance.`,
        impact: 25,
        action: 'split-into-subworkflows',
      });
    }

    // Suggestion 2: Parallelize independent branches
    if (complexity.branchCount > 3) {
      suggestions.push({
        id: 'enable-parallel',
        message: 'Enable parallel execution for independent branches',
        description: `${complexity.branchCount} branches detected. Running them in parallel could reduce execution time by up to 60%.`,
        impact: 60,
        action: 'enable-parallel-execution',
      });
    }

    // Suggestion 3: Remove orphaned nodes
    if (complexity.orphanedNodes.length > 0) {
      suggestions.push({
        id: 'remove-orphaned',
        message: 'Remove orphaned nodes',
        description: `${complexity.orphanedNodes.length} node(s) are not connected to the workflow and serve no purpose.`,
        impact: 5,
        action: 'remove-orphaned-nodes',
        nodeIds: complexity.orphanedNodes,
      });
    }

    // Suggestion 4: Simplify complex workflow
    if (complexity.nodeCount > 50) {
      suggestions.push({
        id: 'simplify-workflow',
        message: 'Consider simplifying workflow',
        description: `Your workflow has ${complexity.nodeCount} nodes. Large workflows are harder to maintain and debug.`,
        impact: 20,
        action: 'refactor-workflow',
      });
    }

    // Sort by impact (highest first)
    return suggestions.sort((a, b) => b.impact - a.impact);
  }, []);

  /**
   * Calculate overall performance score
   */
  const calculateOverallScore = useCallback((
    complexity: ComplexityMetrics,
    render: RenderMetrics,
    memory: MemoryMetrics
  ): number => {
    let score = 100;

    // Complexity (40% weight)
    const complexityPenalty = (100 - complexity.score) * 0.4;
    score -= complexityPenalty;

    // Render performance (30% weight)
    let renderScore = 100;
    if (render.fps < 60) renderScore -= 20;
    if (render.fps < 30) renderScore -= 30;
    if (render.renderTime > 16) renderScore -= 20;
    if (render.renderTime > 33) renderScore -= 30;
    const renderPenalty = (100 - renderScore) * 0.3;
    score -= renderPenalty;

    // Memory (20% weight)
    let memoryScore = 100;
    if (memory.percentage > 70) memoryScore -= 30;
    if (memory.percentage > 90) memoryScore -= 50;
    const memoryPenalty = (100 - memoryScore) * 0.2;
    score -= memoryPenalty;

    return Math.max(0, Math.min(100, Math.round(score)));
  }, []);

  /**
   * Measure FPS
   */
  useEffect(() => {
    if (!enabled) return;

    let frameId: number;

    const measureFPS = () => {
      const now = Date.now();
      const delta = now - lastFrameTimeRef.current;

      if (delta > 0) {
        const currentFPS = 1000 / delta;
        fpsHistoryRef.current.push(currentFPS);

        // Keep only last 60 frames
        if (fpsHistoryRef.current.length > 60) {
          fpsHistoryRef.current.shift();
        }

        // Calculate average FPS
        const avgFPS = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;

        setMetrics(prev => ({
          ...prev,
          render: {
            ...prev.render,
            fps: Math.round(avgFPS),
            lastUpdate: now,
          },
        }));
      }

      lastFrameTimeRef.current = now;
      frameId = requestAnimationFrame(measureFPS);
    };

    frameId = requestAnimationFrame(measureFPS);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [enabled]);

  /**
   * Monitor memory usage
   */
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      // @ts-ignore - performance.memory is only available in Chrome
      if (performance.memory) {
        // @ts-ignore
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;

        setMetrics(prev => ({
          ...prev,
          memory: {
            heapUsed: usedJSHeapSize,
            heapTotal: totalJSHeapSize,
            heapLimit: jsHeapSizeLimit,
            percentage: (usedJSHeapSize / jsHeapSizeLimit) * 100,
          },
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  /**
   * Update complexity metrics when workflow changes
   */
  useEffect(() => {
    if (!enabled) return;

    const complexity = calculateComplexity();
    const warnings = generateWarnings(complexity, metrics.render, metrics.memory);
    const suggestions = generateSuggestions(complexity, nodes, edges);
    const score = calculateOverallScore(complexity, metrics.render, metrics.memory);

    setMetrics(prev => ({
      ...prev,
      complexity,
      warnings,
      suggestions,
      score,
    }));
  }, [
    enabled,
    nodes,
    edges,
    calculateComplexity,
    generateWarnings,
    generateSuggestions,
    calculateOverallScore,
  ]);

  return metrics;
};

export default useWorkflowPerformance;
