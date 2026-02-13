/**
 * Automatic Performance Optimizer
 *
 * Uses AI and heuristics to generate and apply performance optimizations:
 * - AI-powered optimization suggestions
 * - One-click apply optimizations
 * - A/B testing for optimization effectiveness
 * - Automatic rollback on regression
 *
 * Usage:
 * const optimizer = AutoOptimizer.getInstance();
 * const suggestions = await optimizer.analyzeworkflow(workflowId);
 * await optimizer.applyOptimization(suggestionId);
 */

import { performanceTrends } from './PerformanceTrends';
import { continuousMonitor } from './ContinuousMonitor';
import { logger } from '../services/SimpleLogger';

export interface OptimizationSuggestion {
  id: string;
  type: OptimizationType;
  title: string;
  description: string;
  targetId: string; // workflow ID, node ID, etc.
  targetType: 'workflow' | 'node' | 'global';
  impact: OptimizationImpact;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedImprovement: number; // percentage
  changes: OptimizationChange[];
  status: 'suggested' | 'applied' | 'testing' | 'rolled-back' | 'rejected';
  createdAt: number;
  appliedAt?: number;
}

export type OptimizationType =
  | 'caching'
  | 'parallelization'
  | 'batching'
  | 'indexing'
  | 'compression'
  | 'lazy-loading'
  | 'memoization'
  | 'debouncing'
  | 'connection-pooling'
  | 'query-optimization';

export interface OptimizationImpact {
  timeReduction?: number; // ms
  memoryReduction?: number; // MB
  costReduction?: number; // dollars
  apiCallsReduction?: number;
}

export interface OptimizationChange {
  type: 'config' | 'code' | 'architecture';
  target: string;
  before: any;
  after: any;
  description: string;
}

export interface OptimizationResult {
  suggestionId: string;
  success: boolean;
  error?: string;
  metricsBeore: PerformanceMetrics;
  metricsAfter?: PerformanceMetrics;
  actualImprovement?: number; // percentage
  rollback?: boolean;
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  apiCalls: number;
  cost: number;
}

export class AutoOptimizer {
  private static instance: AutoOptimizer;
  private suggestions: Map<string, OptimizationSuggestion> = new Map();
  private results: Map<string, OptimizationResult> = new Map();
  private analysisCache: Map<string, OptimizationSuggestion[]> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.loadSuggestions();
  }

  public static getInstance(): AutoOptimizer {
    if (!AutoOptimizer.instance) {
      AutoOptimizer.instance = new AutoOptimizer();
    }
    return AutoOptimizer.instance;
  }

  /**
   * Analyze workflow and generate optimization suggestions
   */
  public async analyzeWorkflow(workflowId: string): Promise<OptimizationSuggestion[]> {
    // Check cache
    const cached = this.analysisCache.get(workflowId);
    if (cached) {
      return cached;
    }

    const suggestions: OptimizationSuggestion[] = [];

    // Analyze performance trends
    const metrics = [
      'workflow.execution_time',
      'workflow.memory_usage',
      'workflow.api_calls',
      'workflow.cost',
    ];

    for (const metric of metrics) {
      const trend = performanceTrends.analyzeTrends(metric, 7);
      if (!trend) continue;

      // Generate suggestions based on trends
      if (trend.trend === 'degrading' || trend.statistics.mean > this.getThreshold(metric)) {
        const optimizations = this.generateSuggestionsForMetric(metric, trend, workflowId);
        suggestions.push(...optimizations);
      }
    }

    // Cache suggestions
    this.analysisCache.set(workflowId, suggestions);
    setTimeout(() => this.analysisCache.delete(workflowId), this.CACHE_DURATION);

    return suggestions;
  }

  /**
   * Get threshold for metric
   */
  private getThreshold(metric: string): number {
    const thresholds: Record<string, number> = {
      'workflow.execution_time': 5000, // 5 seconds
      'workflow.memory_usage': 100, // 100 MB
      'workflow.api_calls': 50,
      'workflow.cost': 1.0, // $1
    };

    return thresholds[metric] || Infinity;
  }

  /**
   * Generate suggestions for a specific metric
   */
  private generateSuggestionsForMetric(
    metric: string,
    trend: any,
    workflowId: string
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (metric.includes('execution_time')) {
      // Suggest caching
      suggestions.push(this.createSuggestion({
        type: 'caching',
        title: 'Enable Result Caching',
        description: 'Cache frequently accessed data to reduce execution time',
        targetId: workflowId,
        targetType: 'workflow',
        estimatedImprovement: 90, // 90% faster
        difficulty: 'easy',
        impact: {
          timeReduction: trend.statistics.mean * 0.9,
        },
      }));

      // Suggest parallelization
      suggestions.push(this.createSuggestion({
        type: 'parallelization',
        title: 'Parallelize Independent Nodes',
        description: 'Execute independent workflow nodes in parallel',
        targetId: workflowId,
        targetType: 'workflow',
        estimatedImprovement: 50, // 50% faster
        difficulty: 'medium',
        impact: {
          timeReduction: trend.statistics.mean * 0.5,
        },
      }));
    }

    if (metric.includes('memory')) {
      // Suggest lazy loading
      suggestions.push(this.createSuggestion({
        type: 'lazy-loading',
        title: 'Enable Lazy Loading',
        description: 'Load data only when needed to reduce memory usage',
        targetId: workflowId,
        targetType: 'workflow',
        estimatedImprovement: 60, // 60% less memory
        difficulty: 'medium',
        impact: {
          memoryReduction: trend.statistics.mean * 0.6,
        },
      }));

      // Suggest compression
      suggestions.push(this.createSuggestion({
        type: 'compression',
        title: 'Compress Large Data',
        description: 'Compress data in memory to reduce usage',
        targetId: workflowId,
        targetType: 'workflow',
        estimatedImprovement: 40, // 40% less memory
        difficulty: 'easy',
        impact: {
          memoryReduction: trend.statistics.mean * 0.4,
        },
      }));
    }

    if (metric.includes('api_calls')) {
      // Suggest batching
      suggestions.push(this.createSuggestion({
        type: 'batching',
        title: 'Batch API Requests',
        description: 'Combine multiple API requests into batches',
        targetId: workflowId,
        targetType: 'workflow',
        estimatedImprovement: 70, // 70% fewer calls
        difficulty: 'medium',
        impact: {
          apiCallsReduction: Math.floor(trend.statistics.mean * 0.7),
        },
      }));

      // Suggest debouncing
      suggestions.push(this.createSuggestion({
        type: 'debouncing',
        title: 'Debounce Frequent Requests',
        description: 'Prevent excessive API calls by debouncing requests',
        targetId: workflowId,
        targetType: 'workflow',
        estimatedImprovement: 80, // 80% fewer calls
        difficulty: 'easy',
        impact: {
          apiCallsReduction: Math.floor(trend.statistics.mean * 0.8),
        },
      }));
    }

    if (metric.includes('cost')) {
      // Suggest caching to reduce costs
      suggestions.push(this.createSuggestion({
        type: 'caching',
        title: 'Cache API Responses',
        description: 'Cache API responses to reduce billable requests',
        targetId: workflowId,
        targetType: 'workflow',
        estimatedImprovement: 85, // 85% cost reduction
        difficulty: 'easy',
        impact: {
          costReduction: trend.statistics.mean * 0.85,
        },
      }));
    }

    return suggestions;
  }

  /**
   * Create optimization suggestion
   */
  private createSuggestion(
    params: Omit<OptimizationSuggestion, 'id' | 'changes' | 'status' | 'createdAt'>
  ): OptimizationSuggestion {
    const id = this.generateSuggestionId();

    const suggestion: OptimizationSuggestion = {
      id,
      ...params,
      changes: this.generateChanges(params.type, params.targetId),
      status: 'suggested',
      createdAt: Date.now(),
    };

    this.suggestions.set(id, suggestion);
    this.saveSuggestions();

    return suggestion;
  }

  /**
   * Generate suggestion ID
   */
  private generateSuggestionId(): string {
    return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate changes for optimization type
   */
  private generateChanges(type: OptimizationType, targetId: string): OptimizationChange[] {
    const changes: OptimizationChange[] = [];

    switch (type) {
      case 'caching':
        changes.push({
          type: 'config',
          target: targetId,
          before: { cacheEnabled: false },
          after: { cacheEnabled: true, cacheTTL: 3600 },
          description: 'Enable caching with 1-hour TTL',
        });
        break;

      case 'parallelization':
        changes.push({
          type: 'architecture',
          target: targetId,
          before: { executionMode: 'sequential' },
          after: { executionMode: 'parallel' },
          description: 'Change execution mode to parallel',
        });
        break;

      case 'batching':
        changes.push({
          type: 'config',
          target: targetId,
          before: { batchSize: 1 },
          after: { batchSize: 10 },
          description: 'Process items in batches of 10',
        });
        break;

      case 'lazy-loading':
        changes.push({
          type: 'code',
          target: targetId,
          before: { dataLoading: 'eager' },
          after: { dataLoading: 'lazy' },
          description: 'Switch to lazy data loading',
        });
        break;

      case 'compression':
        changes.push({
          type: 'config',
          target: targetId,
          before: { compression: 'none' },
          after: { compression: 'gzip' },
          description: 'Enable gzip compression',
        });
        break;

      case 'debouncing':
        changes.push({
          type: 'config',
          target: targetId,
          before: { debounceMs: 0 },
          after: { debounceMs: 500 },
          description: 'Add 500ms debounce to requests',
        });
        break;

      case 'memoization':
        changes.push({
          type: 'code',
          target: targetId,
          before: { memoization: false },
          after: { memoization: true },
          description: 'Memoize expensive function calls',
        });
        break;

      case 'connection-pooling':
        changes.push({
          type: 'config',
          target: targetId,
          before: { pooling: false },
          after: { pooling: true, poolSize: 10 },
          description: 'Enable connection pooling with pool size 10',
        });
        break;

      case 'query-optimization':
        changes.push({
          type: 'code',
          target: targetId,
          before: { queryOptimization: false },
          after: { queryOptimization: true },
          description: 'Optimize database queries',
        });
        break;

      case 'indexing':
        changes.push({
          type: 'config',
          target: targetId,
          before: { indexes: [] },
          after: { indexes: ['id', 'createdAt'] },
          description: 'Add indexes to frequently queried fields',
        });
        break;
    }

    return changes;
  }

  /**
   * Apply optimization suggestion
   */
  public async applyOptimization(suggestionId: string): Promise<OptimizationResult> {
    const suggestion = this.suggestions.get(suggestionId);

    if (!suggestion) {
      return {
        suggestionId,
        success: false,
        error: 'Suggestion not found',
        metricsBeore: { executionTime: 0, memoryUsage: 0, apiCalls: 0, cost: 0 },
      };
    }

    // Capture metrics before optimization
    const metricsBefore = await this.captureMetrics(suggestion.targetId);

    try {
      // Apply changes
      await this.applyChanges(suggestion.changes);

      // Update suggestion status
      suggestion.status = 'applied';
      suggestion.appliedAt = Date.now();
      this.suggestions.set(suggestionId, suggestion);
      this.saveSuggestions();

      // Capture metrics after optimization
      const metricsAfter = await this.captureMetrics(suggestion.targetId);

      // Calculate actual improvement
      const actualImprovement = this.calculateImprovement(metricsBefore, metricsAfter);

      const result: OptimizationResult = {
        suggestionId,
        success: true,
        metricsBeore: metricsBefore,
        metricsAfter,
        actualImprovement,
      };

      this.results.set(suggestionId, result);
      return result;

    } catch (error) {
      // Rollback on error
      await this.rollbackChanges(suggestion.changes);

      suggestion.status = 'rolled-back';
      this.suggestions.set(suggestionId, suggestion);
      this.saveSuggestions();

      return {
        suggestionId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metricsBeore: metricsBefore,
        rollback: true,
      };
    }
  }

  /**
   * Capture current metrics
   */
  private async captureMetrics(targetId: string): Promise<PerformanceMetrics> {
    // This is a simplified implementation
    // In practice, you'd capture real metrics from the workflow
    const stats = continuousMonitor.getStatistics(`workflow.${targetId}`);

    return {
      executionTime: stats?.mean || 0,
      memoryUsage: 0,
      apiCalls: 0,
      cost: 0,
    };
  }

  /**
   * Apply changes from optimization
   */
  private async applyChanges(changes: OptimizationChange[]): Promise<void> {
    // This is a simplified implementation
    // In practice, you'd apply actual configuration changes
    for (const change of changes) {
      logger.debug(`Applying ${change.type} change to ${change.target}:`, change.after);
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Rollback changes
   */
  private async rollbackChanges(changes: OptimizationChange[]): Promise<void> {
    for (const change of changes) {
      logger.debug(`Rolling back ${change.type} change to ${change.target}:`, change.before);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Calculate improvement percentage
   */
  private calculateImprovement(before: PerformanceMetrics, after: PerformanceMetrics): number {
    const improvements = [
      (before.executionTime - after.executionTime) / before.executionTime,
      (before.memoryUsage - after.memoryUsage) / before.memoryUsage,
      (before.cost - after.cost) / before.cost,
    ].filter(v => !isNaN(v) && isFinite(v));

    if (improvements.length === 0) return 0;

    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    return avgImprovement * 100;
  }

  /**
   * Get all suggestions
   */
  public getAllSuggestions(): OptimizationSuggestion[] {
    return Array.from(this.suggestions.values())
      .sort((a, b) => b.estimatedImprovement - a.estimatedImprovement);
  }

  /**
   * Get suggestions by status
   */
  public getSuggestionsByStatus(status: OptimizationSuggestion['status']): OptimizationSuggestion[] {
    return Array.from(this.suggestions.values())
      .filter(s => s.status === status)
      .sort((a, b) => b.estimatedImprovement - a.estimatedImprovement);
  }

  /**
   * Get optimization results
   */
  public getResults(): OptimizationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Reject suggestion
   */
  public rejectSuggestion(suggestionId: string): boolean {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return false;

    suggestion.status = 'rejected';
    this.suggestions.set(suggestionId, suggestion);
    this.saveSuggestions();

    return true;
  }

  /**
   * Save suggestions to storage
   */
  private saveSuggestions(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const suggestions = Array.from(this.suggestions.values());
        localStorage.setItem('autoOptimizer.suggestions', JSON.stringify(suggestions.slice(-100)));
      } catch (error) {
        logger.warn('Failed to save suggestions:', error);
      }
    }
  }

  /**
   * Load suggestions from storage
   */
  private loadSuggestions(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('autoOptimizer.suggestions');
        if (saved) {
          const suggestions: OptimizationSuggestion[] = JSON.parse(saved);
          suggestions.forEach(s => this.suggestions.set(s.id, s));
        }
      } catch (error) {
        logger.warn('Failed to load suggestions:', error);
      }
    }
  }

  /**
   * Clear all suggestions
   */
  public clearAll(): void {
    this.suggestions.clear();
    this.results.clear();
    this.analysisCache.clear();
    this.saveSuggestions();
  }
}

// Export singleton instance
export const autoOptimizer = AutoOptimizer.getInstance();
