/**
 * Workflow Health Scorer
 * Calculates multi-factor health scores for workflows with trend analysis
 */

import {
  HealthScore,
  HealthScoreWeights,
  DEFAULT_HEALTH_WEIGHTS,
  Recommendation,
  TimeSeriesData,
} from '../types/intelligence';
import { WorkflowMetrics, PerformanceMetrics, ReliabilityMetrics } from '../types/analytics';

interface WorkflowData {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  lastRun?: Date;
}

interface CostData {
  totalCost: number;
  executionCount: number;
  costPerExecution: number;
  monthlyProjected: number;
}

/**
 * Calculate health score for workflows based on multiple factors
 */
export class HealthScorer {
  private weights: HealthScoreWeights;
  private scoreHistory: Map<string, Array<{ timestamp: Date; score: number }>>;

  constructor(weights: HealthScoreWeights = DEFAULT_HEALTH_WEIGHTS) {
    this.weights = weights;
    this.scoreHistory = new Map();
  }

  /**
   * Calculate comprehensive health score for a workflow
   */
  public calculateScore(
    workflowData: WorkflowData,
    metrics: WorkflowMetrics,
    performance: PerformanceMetrics,
    reliability: ReliabilityMetrics,
    costData: CostData
  ): HealthScore {
    const calculatedAt = new Date();

    // Calculate component scores
    const reliabilityScore = this.scoreReliability(metrics.successRate, reliability.errorRate);
    const performanceScore = this.scorePerformance(
      performance.averageLatency,
      performance.p95Latency,
      metrics.throughput
    );
    const costScore = this.scoreCost(costData.costPerExecution, costData.monthlyProjected);
    const usageScore = this.scoreUsage(
      metrics.totalExecutions,
      metrics.throughput,
      this.getDaysSince(workflowData.lastRun)
    );
    const freshnessScore = this.scoreFreshness(
      this.getDaysSince(workflowData.lastModified),
      this.getDaysSince(workflowData.lastRun)
    );

    // Calculate weighted overall score
    const overall = Math.round(
      reliabilityScore * this.weights.reliability +
      performanceScore * this.weights.performance +
      costScore * this.weights.cost +
      usageScore * this.weights.usage +
      freshnessScore * this.weights.freshness
    );

    // Determine trend
    const history = this.getHistory(workflowData.id);
    const { trend, confidence } = this.calculateTrend(history, overall);

    // Update history
    this.updateHistory(workflowData.id, calculatedAt, overall);

    // Generate recommendations based on scores
    const recommendations = this.generateRecommendations(
      workflowData,
      {
        overall,
        reliability: reliabilityScore,
        performance: performanceScore,
        cost: costScore,
        usage: usageScore,
        freshness: freshnessScore,
      },
      metrics,
      costData
    );

    return {
      overall,
      components: {
        reliability: reliabilityScore,
        performance: performanceScore,
        cost: costScore,
        usage: usageScore,
        freshness: freshnessScore,
      },
      trend,
      trendConfidence: confidence,
      recommendations,
      history: history.slice(-30), // Last 30 data points
      metadata: {
        calculatedAt,
        dataPoints: metrics.totalExecutions,
        timeRange: this.getDaysSince(workflowData.createdAt),
      },
    };
  }

  /**
   * Score reliability based on success rate and error rate
   * Weight: 30%
   */
  private scoreReliability(successRate: number, errorRate: number): number {
    // Success rate contributes 70% of reliability score
    const successScore = successRate;

    // Error rate contributes 30% (inverted - lower is better)
    const errorScore = Math.max(0, 100 - errorRate * 10);

    return Math.round(successScore * 0.7 + errorScore * 0.3);
  }

  /**
   * Score performance based on latency and throughput
   * Weight: 25%
   */
  private scorePerformance(
    averageLatency: number,
    p95Latency: number,
    throughput: number
  ): number {
    // Latency score (lower is better)
    // < 1s = 100, 1-5s = 80, 5-10s = 60, 10-30s = 40, 30-60s = 20, > 60s = 0
    let latencyScore = 100;
    if (averageLatency > 60000) latencyScore = 0;
    else if (averageLatency > 30000) latencyScore = 20;
    else if (averageLatency > 10000) latencyScore = 40;
    else if (averageLatency > 5000) latencyScore = 60;
    else if (averageLatency > 1000) latencyScore = 80;

    // P95 penalty - if P95 is much higher than average, penalize
    const p95Ratio = p95Latency / (averageLatency || 1);
    const consistencyScore = Math.max(0, 100 - (p95Ratio - 1) * 20);

    // Throughput score (higher is better)
    // > 100/hr = 100, 50-100 = 80, 10-50 = 60, 1-10 = 40, < 1 = 20
    let throughputScore = 20;
    if (throughput > 100) throughputScore = 100;
    else if (throughput > 50) throughputScore = 80;
    else if (throughput > 10) throughputScore = 60;
    else if (throughput > 1) throughputScore = 40;

    // Weighted average: latency 50%, consistency 30%, throughput 20%
    return Math.round(latencyScore * 0.5 + consistencyScore * 0.3 + throughputScore * 0.2);
  }

  /**
   * Score cost efficiency
   * Weight: 20%
   */
  private scoreCost(costPerExecution: number, monthlyProjected: number): number {
    // Cost per execution score (lower is better)
    // < $0.01 = 100, $0.01-0.05 = 80, $0.05-0.10 = 60, $0.10-0.50 = 40, $0.50-1 = 20, > $1 = 0
    let perExecScore = 100;
    if (costPerExecution > 1) perExecScore = 0;
    else if (costPerExecution > 0.5) perExecScore = 20;
    else if (costPerExecution > 0.1) perExecScore = 40;
    else if (costPerExecution > 0.05) perExecScore = 60;
    else if (costPerExecution > 0.01) perExecScore = 80;

    // Monthly cost score (lower is better)
    // < $10 = 100, $10-50 = 80, $50-100 = 60, $100-500 = 40, $500-1000 = 20, > $1000 = 0
    let monthlyScore = 100;
    if (monthlyProjected > 1000) monthlyScore = 0;
    else if (monthlyProjected > 500) monthlyScore = 20;
    else if (monthlyProjected > 100) monthlyScore = 40;
    else if (monthlyProjected > 50) monthlyScore = 60;
    else if (monthlyProjected > 10) monthlyScore = 80;

    // Weighted average: per-exec 60%, monthly 40%
    return Math.round(perExecScore * 0.6 + monthlyScore * 0.4);
  }

  /**
   * Score usage and activity
   * Weight: 15%
   */
  private scoreUsage(
    totalExecutions: number,
    throughput: number,
    daysSinceLastRun: number
  ): number {
    // Total executions score
    let executionsScore = 0;
    if (totalExecutions > 10000) executionsScore = 100;
    else if (totalExecutions > 1000) executionsScore = 80;
    else if (totalExecutions > 100) executionsScore = 60;
    else if (totalExecutions > 10) executionsScore = 40;
    else if (totalExecutions > 0) executionsScore = 20;

    // Activity score (recent usage is better)
    let activityScore = 100;
    if (daysSinceLastRun > 30) activityScore = 0;
    else if (daysSinceLastRun > 14) activityScore = 20;
    else if (daysSinceLastRun > 7) activityScore = 40;
    else if (daysSinceLastRun > 3) activityScore = 60;
    else if (daysSinceLastRun > 1) activityScore = 80;

    // Throughput consistency (regular usage is better)
    let consistencyScore = 60;
    if (throughput > 10) consistencyScore = 100;
    else if (throughput > 1) consistencyScore = 80;
    else if (throughput > 0.1) consistencyScore = 60;
    else if (throughput > 0) consistencyScore = 40;

    // Weighted: executions 30%, activity 50%, consistency 20%
    return Math.round(executionsScore * 0.3 + activityScore * 0.5 + consistencyScore * 0.2);
  }

  /**
   * Score freshness (how recently maintained)
   * Weight: 10%
   */
  private scoreFreshness(daysSinceModified: number, daysSinceRun: number): number {
    // Handle infinity (never run/modified)
    if (daysSinceModified === Infinity) daysSinceModified = 365;
    if (daysSinceRun === Infinity) daysSinceRun = 365;

    // Modified score (more recent is better)
    let modifiedScore = 100;
    if (daysSinceModified > 180) modifiedScore = 0;
    else if (daysSinceModified > 90) modifiedScore = 20;
    else if (daysSinceModified > 60) modifiedScore = 40;
    else if (daysSinceModified > 30) modifiedScore = 60;
    else if (daysSinceModified > 14) modifiedScore = 80;

    // Run score (more recent is better)
    let runScore = 100;
    if (daysSinceRun > 90) runScore = 0;
    else if (daysSinceRun > 60) runScore = 20;
    else if (daysSinceRun > 30) runScore = 40;
    else if (daysSinceRun > 14) runScore = 60;
    else if (daysSinceRun > 7) runScore = 80;

    // Weighted: modified 40%, run 60%
    return Math.round(modifiedScore * 0.4 + runScore * 0.6);
  }

  /**
   * Calculate trend from historical scores
   */
  private calculateTrend(
    history: Array<{ timestamp: Date; score: number }>,
    currentScore: number
  ): { trend: 'improving' | 'stable' | 'degrading'; confidence: number } {
    if (history.length < 3) {
      return { trend: 'stable', confidence: 0.3 };
    }

    // Calculate linear regression slope
    const n = Math.min(history.length, 10); // Use last 10 points
    const recentHistory = history.slice(-n);

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    recentHistory.forEach((point, i) => {
      sumX += i;
      sumY += point.score;
      sumXY += i * point.score;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    recentHistory.forEach((point, i) => {
      const predicted = slope * i + (meanY - slope * (n - 1) / 2);
      ssTotal += Math.pow(point.score - meanY, 2);
      ssResidual += Math.pow(point.score - predicted, 2);
    });

    const rSquared = 1 - (ssResidual / (ssTotal || 1));
    const confidence = Math.min(Math.max(rSquared, 0), 1);

    // Determine trend based on slope
    let trend: 'improving' | 'stable' | 'degrading';
    if (Math.abs(slope) < 0.5) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'improving';
    } else {
      trend = 'degrading';
    }

    return { trend, confidence };
  }

  /**
   * Generate recommendations based on component scores
   */
  private generateRecommendations(
    workflowData: WorkflowData,
    scores: {
      overall: number;
      reliability: number;
      performance: number;
      cost: number;
      usage: number;
      freshness: number;
    },
    metrics: WorkflowMetrics,
    costData: CostData
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Low reliability - suggest error handling
    if (scores.reliability < 60) {
      recommendations.push({
        id: `${workflowData.id}-reliability-${Date.now()}`,
        type: 'add_error_handling',
        priority: scores.reliability < 40 ? 'critical' : 'high',
        title: 'Improve Workflow Reliability',
        description: `Success rate is ${metrics.successRate.toFixed(1)}%. Add error handling and retry logic.`,
        impact: {
          metric: 'Success Rate',
          currentValue: metrics.successRate,
          expectedValue: Math.min(metrics.successRate + 20, 95),
          improvement: 20,
          improvementPercent: 20,
          unit: '%',
        },
        effort: 'medium',
        steps: [
          'Add Try/Catch nodes around failure-prone operations',
          'Configure retry logic with exponential backoff',
          'Set up error notifications',
        ],
        workflowId: workflowData.id,
        createdAt: new Date(),
        status: 'pending',
        confidence: 0.85,
        autoImplementable: false,
      });
    }

    // Low performance - suggest optimization
    if (scores.performance < 60) {
      recommendations.push({
        id: `${workflowData.id}-performance-${Date.now()}`,
        type: 'performance_improvement',
        priority: 'high',
        title: 'Optimize Workflow Performance',
        description: 'Workflow is running slower than optimal. Consider adding caching or reducing API calls.',
        impact: {
          metric: 'Execution Time',
          currentValue: 100,
          expectedValue: 40,
          improvement: 60,
          improvementPercent: 60,
          unit: '%',
        },
        effort: 'medium',
        steps: [
          'Identify bottleneck nodes using performance profiler',
          'Add caching for frequently accessed data',
          'Parallelize independent operations',
        ],
        workflowId: workflowData.id,
        createdAt: new Date(),
        status: 'pending',
        confidence: 0.78,
        autoImplementable: false,
      });
    }

    // High cost - suggest optimization
    if (scores.cost < 60 && costData.monthlyProjected > 50) {
      recommendations.push({
        id: `${workflowData.id}-cost-${Date.now()}`,
        type: 'cost_optimization',
        priority: costData.monthlyProjected > 200 ? 'high' : 'medium',
        title: 'Reduce Workflow Costs',
        description: `Monthly cost is projected at $${costData.monthlyProjected.toFixed(2)}. Optimize API usage or switch to cheaper alternatives.`,
        impact: {
          metric: 'Monthly Cost',
          currentValue: costData.monthlyProjected,
          expectedValue: costData.monthlyProjected * 0.5,
          improvement: costData.monthlyProjected * 0.5,
          improvementPercent: 50,
          unit: '$',
        },
        effort: 'medium',
        steps: [
          'Review API calls for optimization opportunities',
          'Consider switching to cheaper AI models (e.g., GPT-4o-mini)',
          'Implement request batching',
        ],
        workflowId: workflowData.id,
        createdAt: new Date(),
        status: 'pending',
        confidence: 0.82,
        autoImplementable: false,
      });
    }

    // Low usage - suggest archiving
    const daysSinceRun = this.getDaysSince(workflowData.lastRun);
    if (scores.usage < 30 && daysSinceRun > 45) {
      recommendations.push({
        id: `${workflowData.id}-archive-${Date.now()}`,
        type: 'archive_unused',
        priority: 'low',
        title: 'Archive Unused Workflow',
        description: `Workflow hasn't run in ${daysSinceRun} days. Consider archiving it.`,
        impact: {
          metric: 'Maintenance Overhead',
          currentValue: 1,
          expectedValue: 0,
          improvement: 1,
          improvementPercent: 100,
        },
        effort: 'low',
        steps: [
          'Review workflow purpose with stakeholders',
          'Archive workflow if no longer needed',
          'Set up reactivation process if needed in future',
        ],
        workflowId: workflowData.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        confidence: 0.9,
        autoImplementable: true,
      });
    }

    return recommendations;
  }

  /**
   * Get score history for a workflow
   */
  private getHistory(workflowId: string): Array<{ timestamp: Date; score: number }> {
    return this.scoreHistory.get(workflowId) || [];
  }

  /**
   * Update score history
   */
  private updateHistory(workflowId: string, timestamp: Date, score: number): void {
    const history = this.getHistory(workflowId);
    history.push({ timestamp, score });

    // Keep only last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(h => h.timestamp >= ninetyDaysAgo);

    this.scoreHistory.set(workflowId, filtered);
  }

  /**
   * Get days since a date
   */
  private getDaysSince(date?: Date): number {
    if (!date) return Infinity;
    return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  }

  /**
   * Clear history for a workflow
   */
  public clearHistory(workflowId: string): void {
    this.scoreHistory.delete(workflowId);
  }

  /**
   * Get all workflows with scores below threshold
   */
  public getUnhealthyWorkflows(threshold: number = 60): string[] {
    const unhealthy: string[] = [];

    for (const [workflowId, history] of this.scoreHistory.entries()) {
      if (history.length > 0) {
        const latestScore = history[history.length - 1].score;
        if (latestScore < threshold) {
          unhealthy.push(workflowId);
        }
      }
    }

    return unhealthy;
  }
}

/**
 * Create a default health scorer instance
 */
export function createHealthScorer(weights?: Partial<HealthScoreWeights>): HealthScorer {
  const finalWeights = { ...DEFAULT_HEALTH_WEIGHTS, ...weights };
  return new HealthScorer(finalWeights);
}
