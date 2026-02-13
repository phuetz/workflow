/**
 * Recommendation Engine
 * Generates proactive recommendations for workflow optimization
 */

import {
  Recommendation,
  RecommendationType,
  HealthScore,
  Anomaly,
  TrendAnalysis,
} from '../types/intelligence';
import { WorkflowMetrics } from '../types/analytics';
import { v4 as uuidv4 } from 'uuid';

export interface RecommendationEngineConfig {
  /** Minimum confidence threshold for recommendations */
  minimumConfidence: number;
  /** Auto-expire recommendations after days */
  expiryDays: number;
  /** Enable auto-implementation for safe recommendations */
  autoImplement: boolean;
  /** Maximum recommendations per workflow */
  maxRecommendationsPerWorkflow: number;
}

const DEFAULT_CONFIG: RecommendationEngineConfig = {
  minimumConfidence: 0.6,
  expiryDays: 30,
  autoImplement: false,
  maxRecommendationsPerWorkflow: 10,
};

interface WorkflowContext {
  id: string;
  name: string;
  healthScore: HealthScore;
  metrics: WorkflowMetrics;
  anomalies: Anomaly[];
  trends: TrendAnalysis[];
  similarWorkflows?: string[];
  lastRun?: Date;
  lastModified?: Date;
  nodeCount?: number;
  costPerExecution?: number;
  monthlyProjectedCost?: number;
}

/**
 * Generate intelligent recommendations for workflows
 */
export class RecommendationEngine {
  private config: RecommendationEngineConfig;
  private recommendations: Map<string, Recommendation> = new Map();

  constructor(config: Partial<RecommendationEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate recommendations for a workflow
   */
  public async generateRecommendations(
    context: WorkflowContext
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Health-based recommendations
    recommendations.push(...this.analyzeHealthScore(context));

    // Anomaly-based recommendations
    recommendations.push(...this.analyzeAnomalies(context));

    // Trend-based recommendations
    recommendations.push(...this.analyzeTrends(context));

    // Usage-based recommendations
    recommendations.push(...this.analyzeUsage(context));

    // Cost-based recommendations
    recommendations.push(...this.analyzeCost(context));

    // Pattern-based recommendations
    recommendations.push(...this.analyzePatterns(context));

    // Filter by confidence threshold
    const filtered = recommendations.filter(
      (r) => r.confidence >= this.config.minimumConfidence
    );

    // Sort by priority and confidence
    const sorted = this.sortRecommendations(filtered);

    // Limit to max per workflow
    const limited = sorted.slice(0, this.config.maxRecommendationsPerWorkflow);

    // Store recommendations
    limited.forEach((r) => this.recommendations.set(r.id, r));

    // Auto-implement if enabled
    if (this.config.autoImplement) {
      for (const rec of limited) {
        if (rec.autoImplementable) {
          await this.implementRecommendation(rec.id);
        }
      }
    }

    return limited;
  }

  /**
   * Get active recommendations
   */
  public async getActiveRecommendations(workflowId?: string): Promise<Recommendation[]> {
    const now = new Date();
    const active = Array.from(this.recommendations.values()).filter((r) => {
      const isActive = r.status === 'pending' || r.status === 'accepted';
      const notExpired = !r.expiresAt || r.expiresAt > now;
      const matchesWorkflow = !workflowId || r.workflowId === workflowId;
      return isActive && notExpired && matchesWorkflow;
    });

    return this.sortRecommendations(active);
  }

  /**
   * Accept a recommendation
   */
  public async acceptRecommendation(recommendationId: string, userId: string): Promise<void> {
    const rec = this.recommendations.get(recommendationId);
    if (rec) {
      rec.status = 'accepted';
      rec.actedBy = userId;
      rec.actedAt = new Date();
    }
  }

  /**
   * Reject a recommendation
   */
  public async rejectRecommendation(
    recommendationId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const rec = this.recommendations.get(recommendationId);
    if (rec) {
      rec.status = 'rejected';
      rec.actedBy = userId;
      rec.actedAt = new Date();
      if (reason) {
        rec.supportingData = { ...rec.supportingData, rejectionReason: reason };
      }
    }
  }

  /**
   * Auto-implement a recommendation
   */
  public async implementRecommendation(recommendationId: string): Promise<boolean> {
    const rec = this.recommendations.get(recommendationId);
    if (!rec || !rec.autoImplementable) {
      return false;
    }

    // Implementation logic would go here
    // For now, just mark as implemented
    rec.status = 'implemented';
    rec.actedAt = new Date();
    rec.actedBy = 'system';

    return true;
  }

  /**
   * Get recommendation by ID
   */
  public getRecommendation(id: string): Recommendation | undefined {
    return this.recommendations.get(id);
  }

  /**
   * Clear expired recommendations
   */
  public clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    for (const [id, rec] of this.recommendations.entries()) {
      if (rec.expiresAt && rec.expiresAt < now && rec.status === 'pending') {
        rec.status = 'expired';
        cleared++;
      }
    }

    return cleared;
  }

  // ============================================================================
  // Private Methods - Analysis Functions
  // ============================================================================

  /**
   * Analyze health score for recommendations
   */
  private analyzeHealthScore(context: WorkflowContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const { healthScore, id, name } = context;

    // Low overall health
    if (healthScore.overall < 50) {
      recommendations.push({
        id: `${id}-overall-health-${Date.now()}`,
        type: 'add_monitoring',
        priority: 'high',
        title: `Improve Overall Health of "${name}"`,
        description: `Workflow health score is ${healthScore.overall}/100. Multiple areas need attention.`,
        impact: {
          metric: 'Health Score',
          currentValue: healthScore.overall,
          expectedValue: 80,
          improvement: 80 - healthScore.overall,
          improvementPercent: ((80 - healthScore.overall) / healthScore.overall) * 100,
          unit: 'points',
        },
        effort: 'high',
        steps: [
          `Improve reliability (currently ${healthScore.components.reliability}/100)`,
          `Optimize performance (currently ${healthScore.components.performance}/100)`,
          `Reduce costs (currently ${healthScore.components.cost}/100)`,
        ],
        workflowId: id,
        createdAt: new Date(),
        expiresAt: this.getExpiryDate(),
        status: 'pending',
        confidence: 0.9,
        autoImplementable: false,
      });
    }

    // Low reliability
    if (healthScore.components.reliability < 60) {
      recommendations.push(this.createReliabilityRecommendation(context));
    }

    // Low performance
    if (healthScore.components.performance < 60) {
      recommendations.push(this.createPerformanceRecommendation(context));
    }

    // Low usage
    if (healthScore.components.usage < 30) {
      recommendations.push(this.createUsageRecommendation(context));
    }

    // Low freshness
    if (healthScore.components.freshness < 40) {
      recommendations.push(this.createFreshnessRecommendation(context));
    }

    return recommendations;
  }

  /**
   * Analyze anomalies for recommendations
   */
  private analyzeAnomalies(context: WorkflowContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const anomaly of context.anomalies) {
      if (anomaly.resolved) continue;

      // Add anomaly-specific recommendations
      recommendations.push(...anomaly.recommendations);
    }

    return recommendations;
  }

  /**
   * Analyze trends for recommendations
   */
  private analyzeTrends(context: WorkflowContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const trend of context.trends) {
      // Declining performance
      if (
        trend.metric.toLowerCase().includes('performance') &&
        trend.direction === 'down' &&
        trend.strength > 0.7
      ) {
        recommendations.push({
          id: `${context.id}-perf-trend-${Date.now()}`,
          type: 'performance_improvement',
          priority: 'high',
          title: 'Performance Degrading',
          description: `${trend.metric} is trending down by ${Math.abs(trend.changePercent).toFixed(1)}% over ${trend.period.days} days.`,
          impact: {
            metric: trend.metric,
            currentValue: trend.currentValue,
            expectedValue: trend.previousValue,
            improvement: Math.abs(trend.changeAbsolute),
            improvementPercent: Math.abs(trend.changePercent),
            unit: 'ms',
          },
          effort: 'medium',
          steps: [
            'Identify performance bottlenecks',
            'Add caching where appropriate',
            'Optimize database queries',
          ],
          workflowId: context.id,
          createdAt: new Date(),
          expiresAt: this.getExpiryDate(),
          status: 'pending',
          confidence: trend.strength,
          autoImplementable: false,
        });
      }

      // Rising costs
      if (
        trend.metric.toLowerCase().includes('cost') &&
        trend.direction === 'up' &&
        trend.strength > 0.6
      ) {
        recommendations.push({
          id: `${context.id}-cost-trend-${Date.now()}`,
          type: 'cost_optimization',
          priority: 'high',
          title: 'Costs Increasing',
          description: `${trend.metric} is trending up by ${trend.changePercent.toFixed(1)}%. Projected to reach $${trend.forecast.value.toFixed(2)}/month.`,
          impact: {
            metric: trend.metric,
            currentValue: trend.currentValue,
            expectedValue: trend.currentValue * 0.7,
            improvement: trend.currentValue * 0.3,
            improvementPercent: 30,
            unit: '$',
          },
          effort: 'medium',
          steps: [
            'Review API usage for optimization',
            'Consider cheaper alternatives (e.g., GPT-4o-mini vs GPT-4)',
            'Implement request caching',
          ],
          workflowId: context.id,
          createdAt: new Date(),
          expiresAt: this.getExpiryDate(),
          status: 'pending',
          confidence: trend.strength,
          autoImplementable: false,
        });
      }

      // Declining usage
      if (
        trend.metric.toLowerCase().includes('usage') &&
        trend.direction === 'down' &&
        trend.strength > 0.7
      ) {
        recommendations.push({
          id: `${context.id}-usage-trend-${Date.now()}`,
          type: 'archive_unused',
          priority: 'low',
          title: 'Usage Declining',
          description: `Workflow usage has declined ${Math.abs(trend.changePercent).toFixed(1)}% over ${trend.period.days} days.`,
          impact: {
            metric: 'Maintenance Overhead',
            currentValue: 1,
            expectedValue: 0,
            improvement: 1,
            improvementPercent: 100,
          },
          effort: 'low',
          steps: [
            'Verify workflow is still needed',
            'Check for alternative workflows',
            'Consider archiving if obsolete',
          ],
          workflowId: context.id,
          createdAt: new Date(),
          expiresAt: this.getExpiryDate(),
          status: 'pending',
          confidence: trend.strength,
          autoImplementable: true,
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze usage patterns
   */
  private analyzeUsage(context: WorkflowContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check if workflow hasn't run recently
    if (context.lastRun) {
      const daysSinceRun = Math.floor(
        (Date.now() - context.lastRun.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysSinceRun > 45) {
        recommendations.push({
          id: `${context.id}-unused-${Date.now()}`,
          type: 'archive_unused',
          priority: 'medium',
          title: `Workflow Unused for ${daysSinceRun} Days`,
          description: `"${context.name}" hasn't run in ${daysSinceRun} days. Consider archiving it.`,
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
            'Set up reactivation process if needed',
          ],
          workflowId: context.id,
          createdAt: new Date(),
          expiresAt: this.getExpiryDate(),
          status: 'pending',
          confidence: 0.9,
          autoImplementable: true,
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze costs
   */
  private analyzeCost(context: WorkflowContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // High cost per execution
    if (context.costPerExecution && context.costPerExecution > 0.5) {
      const potentialSavings = context.costPerExecution * 0.5;

      recommendations.push({
        id: `${context.id}-high-cost-${Date.now()}`,
        type: 'cost_optimization',
        priority: 'high',
        title: 'High Cost Per Execution',
        description: `Each execution costs $${context.costPerExecution.toFixed(2)}. Optimize to reduce by ~50%.`,
        impact: {
          metric: 'Cost Per Execution',
          currentValue: context.costPerExecution,
          expectedValue: context.costPerExecution * 0.5,
          improvement: potentialSavings,
          improvementPercent: 50,
          unit: '$',
        },
        effort: 'medium',
        steps: [
          'Switch to cheaper AI models (GPT-4o-mini is 85% cheaper)',
          'Reduce API calls through batching',
          'Implement caching for repeated queries',
        ],
        workflowId: context.id,
        createdAt: new Date(),
        expiresAt: this.getExpiryDate(),
        status: 'pending',
        confidence: 0.85,
        autoImplementable: false,
        supportingData: {
          currentCost: context.costPerExecution,
          projectedSavings: potentialSavings * (context.metrics?.totalExecutions || 100),
        },
      });
    }

    // High monthly cost
    if (context.monthlyProjectedCost && context.monthlyProjectedCost > 100) {
      recommendations.push({
        id: `${context.id}-high-monthly-${Date.now()}`,
        type: 'cost_optimization',
        priority: context.monthlyProjectedCost > 500 ? 'critical' : 'high',
        title: 'High Monthly Cost',
        description: `Projected monthly cost: $${context.monthlyProjectedCost.toFixed(2)}. Optimize to reduce by 40%.`,
        impact: {
          metric: 'Monthly Cost',
          currentValue: context.monthlyProjectedCost,
          expectedValue: context.monthlyProjectedCost * 0.6,
          improvement: context.monthlyProjectedCost * 0.4,
          improvementPercent: 40,
          unit: '$',
        },
        effort: 'high',
        steps: [
          'Audit all external API calls',
          'Implement aggressive caching strategy',
          'Consider self-hosting some services',
          'Negotiate volume discounts with providers',
        ],
        workflowId: context.id,
        createdAt: new Date(),
        expiresAt: this.getExpiryDate(),
        status: 'pending',
        confidence: 0.8,
        autoImplementable: false,
      });
    }

    return recommendations;
  }

  /**
   * Analyze patterns and similarities
   */
  private analyzePatterns(context: WorkflowContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Similar workflows consolidation
    if (context.similarWorkflows && context.similarWorkflows.length >= 2) {
      recommendations.push({
        id: `${context.id}-consolidate-${Date.now()}`,
        type: 'consolidate_workflows',
        priority: 'medium',
        title: 'Consolidate Similar Workflows',
        description: `Found ${context.similarWorkflows.length} similar workflows. Consolidating could reduce maintenance overhead by ${context.similarWorkflows.length * 30}%.`,
        impact: {
          metric: 'Maintenance Overhead',
          currentValue: context.similarWorkflows.length + 1,
          expectedValue: 1,
          improvement: context.similarWorkflows.length,
          improvementPercent: (context.similarWorkflows.length / (context.similarWorkflows.length + 1)) * 100,
        },
        effort: 'high',
        steps: [
          'Review similar workflows for consolidation opportunities',
          'Create unified workflow with conditional logic',
          'Test thoroughly before deprecating old workflows',
          'Update all integrations to use new workflow',
        ],
        workflowId: context.id,
        createdAt: new Date(),
        expiresAt: this.getExpiryDate(),
        status: 'pending',
        confidence: 0.75,
        autoImplementable: false,
        supportingData: {
          similarWorkflows: context.similarWorkflows,
        },
      });
    }

    // Complex workflow splitting
    if (context.nodeCount && context.nodeCount > 30) {
      recommendations.push({
        id: `${context.id}-split-${Date.now()}`,
        type: 'split_workflow',
        priority: 'medium',
        title: 'Split Complex Workflow',
        description: `Workflow has ${context.nodeCount} nodes. Consider splitting for better maintainability.`,
        impact: {
          metric: 'Maintainability',
          currentValue: context.nodeCount,
          expectedValue: 15,
          improvement: context.nodeCount - 15,
          improvementPercent: ((context.nodeCount - 15) / context.nodeCount) * 100,
          unit: 'nodes',
        },
        effort: 'high',
        steps: [
          'Identify logical boundaries in workflow',
          'Create sub-workflows for distinct operations',
          'Use workflow composition patterns',
          'Ensure proper error handling between workflows',
        ],
        workflowId: context.id,
        createdAt: new Date(),
        expiresAt: this.getExpiryDate(),
        status: 'pending',
        confidence: 0.7,
        autoImplementable: false,
      });
    }

    return recommendations;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createReliabilityRecommendation(context: WorkflowContext): Recommendation {
    return {
      id: `${context.id}-reliability-${Date.now()}`,
      type: 'add_error_handling',
      priority: context.healthScore.components.reliability < 40 ? 'critical' : 'high',
      title: 'Improve Reliability',
      description: `Reliability score is ${context.healthScore.components.reliability}/100. Add error handling and retry logic.`,
      impact: {
        metric: 'Reliability Score',
        currentValue: context.healthScore.components.reliability,
        expectedValue: 90,
        improvement: 90 - context.healthScore.components.reliability,
        improvementPercent: ((90 - context.healthScore.components.reliability) / context.healthScore.components.reliability) * 100,
        unit: 'points',
      },
      effort: 'medium',
      steps: [
        'Add Try/Catch nodes around failure-prone operations',
        'Configure retry logic with exponential backoff',
        'Set up error notifications',
        'Add circuit breakers for external services',
      ],
      workflowId: context.id,
      createdAt: new Date(),
      expiresAt: this.getExpiryDate(),
      status: 'pending',
      confidence: 0.85,
      autoImplementable: false,
    };
  }

  private createPerformanceRecommendation(context: WorkflowContext): Recommendation {
    return {
      id: `${context.id}-performance-${Date.now()}`,
      type: 'add_caching',
      priority: 'high',
      title: 'Optimize Performance',
      description: `Performance score is ${context.healthScore.components.performance}/100. Add caching and optimize slow nodes.`,
      impact: {
        metric: 'Performance Score',
        currentValue: context.healthScore.components.performance,
        expectedValue: 85,
        improvement: 85 - context.healthScore.components.performance,
        improvementPercent: ((85 - context.healthScore.components.performance) / context.healthScore.components.performance) * 100,
        unit: 'points',
      },
      effort: 'medium',
      steps: [
        'Use performance profiler to identify bottlenecks',
        'Add caching for frequently accessed data',
        'Parallelize independent operations',
        'Optimize database queries',
      ],
      workflowId: context.id,
      createdAt: new Date(),
      expiresAt: this.getExpiryDate(),
      status: 'pending',
      confidence: 0.8,
      autoImplementable: false,
    };
  }

  private createUsageRecommendation(context: WorkflowContext): Recommendation {
    return {
      id: `${context.id}-low-usage-${Date.now()}`,
      type: 'archive_unused',
      priority: 'low',
      title: 'Low Usage Detected',
      description: `Usage score is ${context.healthScore.components.usage}/100. Workflow may be underutilized.`,
      impact: {
        metric: 'Maintenance Overhead',
        currentValue: 1,
        expectedValue: 0,
        improvement: 1,
        improvementPercent: 100,
      },
      effort: 'low',
      steps: [
        'Review workflow purpose and necessity',
        'Check if there are replacement workflows',
        'Archive if no longer needed',
      ],
      workflowId: context.id,
      createdAt: new Date(),
      expiresAt: this.getExpiryDate(),
      status: 'pending',
      confidence: 0.75,
      autoImplementable: true,
    };
  }

  private createFreshnessRecommendation(context: WorkflowContext): Recommendation {
    return {
      id: `${context.id}-stale-${Date.now()}`,
      type: 'upgrade_node',
      priority: 'low',
      title: 'Update Stale Workflow',
      description: `Freshness score is ${context.healthScore.components.freshness}/100. Workflow hasn't been maintained recently.`,
      impact: {
        metric: 'Freshness Score',
        currentValue: context.healthScore.components.freshness,
        expectedValue: 80,
        improvement: 80 - context.healthScore.components.freshness,
        improvementPercent: ((80 - context.healthScore.components.freshness) / context.healthScore.components.freshness) * 100,
        unit: 'points',
      },
      effort: 'low',
      steps: [
        'Review workflow for outdated integrations',
        'Update to latest node versions',
        'Test thoroughly after updates',
      ],
      workflowId: context.id,
      createdAt: new Date(),
      expiresAt: this.getExpiryDate(),
      status: 'pending',
      confidence: 0.7,
      autoImplementable: false,
    };
  }

  private sortRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const priorityScores = { critical: 4, high: 3, medium: 2, low: 1 };

    return recommendations.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityScores[b.priority] - priorityScores[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      const confidenceDiff = b.confidence - a.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;

      // Then by impact
      return b.impact.improvementPercent - a.impact.improvementPercent;
    });
  }

  private getExpiryDate(): Date {
    return new Date(Date.now() + this.config.expiryDays * 24 * 60 * 60 * 1000);
  }
}

/**
 * Create a default recommendation engine instance
 */
export function createRecommendationEngine(
  config?: Partial<RecommendationEngineConfig>
): RecommendationEngine {
  return new RecommendationEngine(config);
}
