/**
 * Recommendation Formatter for AI Recommendations
 *
 * Handles formatting and summarizing recommendations output.
 *
 * @module recommendations/RecommendationFormatter
 */

import { Recommendation } from './types';

/**
 * Formats and summarizes recommendations for output
 */
export class RecommendationFormatter {
  /**
   * Generate a summary string for the recommendations
   */
  generateSummary(
    recommendations: Recommendation[],
    currentScore: number,
    potentialScore: number
  ): string {
    const highPriority = recommendations.filter(
      (r) => r.priority === 'high' || r.priority === 'critical'
    ).length;
    const improvement = potentialScore - currentScore;

    return `Workflow score: ${currentScore.toFixed(1)}/100. Found ${recommendations.length} optimization opportunities (${highPriority} high priority). Potential improvement: +${improvement.toFixed(1)} points.`;
  }

  /**
   * Format a single recommendation for display
   */
  formatRecommendation(recommendation: Recommendation): string {
    const priorityEmoji = this.getPriorityEmoji(recommendation.priority);
    const impactStr = this.formatImpact(recommendation.impact);

    return `${priorityEmoji} [${recommendation.type.toUpperCase()}] ${recommendation.title}
Description: ${recommendation.description}
Impact: ${impactStr}
Effort: ${recommendation.effort}
Confidence: ${(recommendation.confidence * 100).toFixed(0)}%
Reasoning: ${recommendation.reasoning}`;
  }

  /**
   * Format all recommendations as a report
   */
  formatReport(
    recommendations: Recommendation[],
    currentScore: number,
    potentialScore: number
  ): string {
    const summary = this.generateSummary(recommendations, currentScore, potentialScore);
    const formattedRecs = recommendations
      .map((rec, idx) => `${idx + 1}. ${this.formatRecommendation(rec)}`)
      .join('\n\n');

    return `=== Workflow Optimization Report ===

${summary}

=== Recommendations ===

${formattedRecs}`;
  }

  /**
   * Get emoji for priority level (for display purposes)
   */
  private getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'critical':
        return '[CRITICAL]';
      case 'high':
        return '[HIGH]';
      case 'medium':
        return '[MEDIUM]';
      case 'low':
        return '[LOW]';
      default:
        return '[INFO]';
    }
  }

  /**
   * Format impact object as string
   */
  private formatImpact(impact: Recommendation['impact']): string {
    const parts: string[] = [];

    if (impact.performance !== undefined) {
      parts.push(`Performance: +${impact.performance}%`);
    }
    if (impact.cost !== undefined) {
      parts.push(`Cost: -${impact.cost}%`);
    }
    if (impact.reliability !== undefined) {
      parts.push(`Reliability: +${impact.reliability}%`);
    }
    if (impact.security !== undefined) {
      parts.push(`Security: +${impact.security}/10`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No measurable impact';
  }

  /**
   * Group recommendations by type
   */
  groupByType(recommendations: Recommendation[]): Record<string, Recommendation[]> {
    const groups: Record<string, Recommendation[]> = {};

    for (const rec of recommendations) {
      if (!groups[rec.type]) {
        groups[rec.type] = [];
      }
      groups[rec.type].push(rec);
    }

    return groups;
  }

  /**
   * Group recommendations by priority
   */
  groupByPriority(recommendations: Recommendation[]): Record<string, Recommendation[]> {
    const groups: Record<string, Recommendation[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    for (const rec of recommendations) {
      groups[rec.priority].push(rec);
    }

    return groups;
  }

  /**
   * Filter recommendations by minimum priority
   */
  filterByMinPriority(
    recommendations: Recommendation[],
    minPriority: 'low' | 'medium' | 'high' | 'critical'
  ): Recommendation[] {
    const priorityOrder = ['low', 'medium', 'high', 'critical'];
    const minIndex = priorityOrder.indexOf(minPriority);

    return recommendations.filter((rec) => {
      const recIndex = priorityOrder.indexOf(rec.priority);
      return recIndex >= minIndex;
    });
  }

  /**
   * Get total estimated impact across all recommendations
   */
  getTotalImpact(recommendations: Recommendation[]): {
    performance: number;
    cost: number;
    reliability: number;
    security: number;
  } {
    return recommendations.reduce(
      (total, rec) => ({
        performance: total.performance + (rec.impact.performance || 0),
        cost: total.cost + (rec.impact.cost || 0),
        reliability: total.reliability + (rec.impact.reliability || 0),
        security: total.security + (rec.impact.security || 0),
      }),
      { performance: 0, cost: 0, reliability: 0, security: 0 }
    );
  }
}
