/**
 * Priority Ranker for AI Recommendations
 *
 * Handles sorting recommendations by priority and impact,
 * and calculating workflow scores.
 *
 * @module recommendations/PriorityRanker
 */

import {
  Recommendation,
  RecommendationPriority,
  Workflow,
  WorkflowExecutionData,
} from './types';
import { DataAnalyzer } from './DataAnalyzer';

/**
 * Priority weights for sorting recommendations
 */
const PRIORITY_WEIGHTS: Record<RecommendationPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Handles priority ranking and scoring for recommendations
 */
export class PriorityRanker {
  private dataAnalyzer: DataAnalyzer;

  constructor(dataAnalyzer: DataAnalyzer) {
    this.dataAnalyzer = dataAnalyzer;
  }

  /**
   * Sort recommendations by priority and impact
   */
  sortRecommendations(recommendations: Recommendation[]): Recommendation[] {
    return [...recommendations].sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // Sort by total impact
      const aImpact = this.calculateTotalImpact(a);
      const bImpact = this.calculateTotalImpact(b);

      return bImpact - aImpact;
    });
  }

  /**
   * Calculate total impact score for a recommendation
   */
  calculateTotalImpact(recommendation: Recommendation): number {
    return (
      (recommendation.impact.performance || 0) +
      (recommendation.impact.cost || 0) +
      (recommendation.impact.reliability || 0)
    );
  }

  /**
   * Calculate overall workflow score
   */
  calculateWorkflowScore(
    workflow: Workflow,
    executionData?: WorkflowExecutionData[]
  ): number {
    let score = 100;

    // Deduct for complexity
    score -= Math.min(20, workflow.nodes.length * 0.5);

    // Deduct for missing error handling
    const nodesWithoutErrors = workflow.nodes.filter(
      (n) => !this.dataAnalyzer.hasErrorHandling(n, workflow)
    ).length;
    score -= nodesWithoutErrors * 2;

    // Deduct for performance issues
    if (executionData && executionData.length > 0) {
      const avgDuration =
        executionData.reduce((sum, d) => sum + d.duration, 0) / executionData.length;
      if (avgDuration > 30000) score -= 10;
      if (avgDuration > 60000) score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate potential score after implementing recommendations
   */
  calculatePotentialScore(
    currentScore: number,
    recommendations: Recommendation[]
  ): number {
    let improvement = 0;

    for (const rec of recommendations) {
      const impact =
        (rec.impact.performance || 0) +
        (rec.impact.reliability || 0) +
        (rec.impact.cost || 0) * 0.5;

      improvement += impact * rec.confidence * 0.1;
    }

    return Math.min(100, currentScore + improvement);
  }

  /**
   * Get priority weight for a given priority level
   */
  getPriorityWeight(priority: RecommendationPriority): number {
    return PRIORITY_WEIGHTS[priority];
  }

  /**
   * Calculate average execution cost from execution data
   */
  calculateAverageCost(executionData: WorkflowExecutionData[]): number {
    if (!executionData || executionData.length === 0) return 0;
    return executionData.reduce((sum, d) => sum + d.cost, 0) / executionData.length;
  }

  /**
   * Calculate average execution duration from execution data
   */
  calculateAverageDuration(executionData: WorkflowExecutionData[]): number {
    if (!executionData || executionData.length === 0) return 0;
    return executionData.reduce((sum, d) => sum + d.duration, 0) / executionData.length;
  }
}
