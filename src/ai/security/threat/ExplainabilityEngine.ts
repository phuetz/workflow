/**
 * Explainability Engine for ML Threat Detection
 * Generates human-readable explanations for predictions
 * @module threat/ExplainabilityEngine
 */

import type {
  SecurityFeatures,
  ThreatClassificationScores,
  SequencePattern,
  ThreatExplainability,
} from './types';

/**
 * Explainability Engine
 */
export class ExplainabilityEngine {
  /**
   * Generate explanation for predictions
   */
  generateExplanation(
    features: SecurityFeatures,
    anomalyScore: number,
    _threatClassification: ThreatClassificationScores,
    patterns: SequencePattern[]
  ): ThreatExplainability {
    const featureImportance = this.calculateFeatureImportance(features, anomalyScore);
    const topFeatures = this.getTopFeatures(features, featureImportance);
    const humanReadableInsights = this.generateInsights(features, anomalyScore, patterns);

    return {
      featureImportance,
      topFeatures,
      humanReadableInsights,
    };
  }

  /**
   * Calculate feature importance
   */
  private calculateFeatureImportance(
    features: SecurityFeatures,
    anomalyScore: number
  ): Map<string, number> {
    const importance = new Map<string, number>();

    importance.set('eventRateDeviation', Math.min(features.eventRateDeviation / 10, 1));
    importance.set('failureRate', Math.min(features.failureRate * 2, 1));
    importance.set('portDiversity', features.portDiversity > 20 ? 0.8 : 0.2);
    importance.set('geoIPMismatches', Math.min(features.geoIPMismatches / 5, 1));
    importance.set('uniqueSourceIPs', Math.min(features.uniqueSourceIPs / 100, 1));
    importance.set('anomalyScore', anomalyScore);
    importance.set('suspiciousProtocols', Math.min(features.suspiciousProtocols / 10, 1));
    importance.set('timeSinceLast', features.timeSinceLast < 100 ? 0.7 : 0.1);

    return importance;
  }

  /**
   * Get top features by importance
   */
  private getTopFeatures(
    features: SecurityFeatures,
    featureImportance: Map<string, number>
  ): Array<{ feature: string; value: number; impact: number }> {
    return Array.from(featureImportance.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature, importance]) => ({
        feature,
        value: this.getFeatureValue(features, feature),
        impact: importance,
      }));
  }

  /**
   * Get feature value for explanation
   */
  private getFeatureValue(features: SecurityFeatures, featureName: string): number {
    const value = (features as unknown as Record<string, unknown>)[featureName];
    if (typeof value === 'number') {
      return value;
    }
    if (value instanceof Map) {
      return value.size;
    }
    return 0;
  }

  /**
   * Generate human-readable insights
   */
  private generateInsights(
    features: SecurityFeatures,
    anomalyScore: number,
    patterns: SequencePattern[]
  ): string[] {
    const insights: string[] = [];

    if (anomalyScore > 0.8) {
      insights.push('Critical anomaly detected in security behavior');
    } else if (anomalyScore > 0.6) {
      insights.push('Moderate anomaly detected in security behavior');
    }

    if (features.failureRate > 0.3) {
      insights.push('Unusually high failure rate detected');
    }

    if (features.portDiversity > 50) {
      insights.push('Port scanning behavior identified');
    }

    if (features.geoIPMismatches > 5) {
      insights.push('Geographically impossible login detected');
    }

    if (features.suspiciousProtocols > 5) {
      insights.push('High usage of suspicious protocols detected');
    }

    if (!features.isBusinessHours && features.eventsPerHour > 50) {
      insights.push('Unusual activity detected outside business hours');
    }

    if (features.weekendActivity && features.eventCount > 20) {
      insights.push('Significant weekend activity detected');
    }

    if (features.eventRateDeviation > 5) {
      insights.push('Event rate significantly above baseline');
    }

    if (patterns.length > 0) {
      insights.push(`${patterns.length} attack pattern(s) recognized`);

      // Add specific pattern insights
      for (const pattern of patterns.slice(0, 3)) {
        insights.push(`Detected ${pattern.killChainStage} stage attack with ${Math.round(pattern.confidence * 100)}% confidence`);
      }
    }

    return insights;
  }
}

export default ExplainabilityEngine;
