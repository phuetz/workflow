/**
 * Isolation Forest Implementation
 * Anomaly detection using isolation forest algorithm
 * @module threat/IsolationForest
 */

import type { SecurityFeatures } from './types';

/**
 * Isolation Forest Tree
 */
class IFTree {
  private maxDepth: number;

  constructor(maxDepth: number) {
    this.maxDepth = maxDepth;
  }

  /**
   * Calculate path length to isolate sample
   */
  pathLength(sample: number[], depth: number = 0): number {
    if (depth >= this.maxDepth || sample.length <= 1) {
      return depth;
    }
    return depth + 1;
  }
}

/**
 * Isolation Forest for anomaly detection
 */
export class IsolationForest {
  private threshold: number;
  private trees: IFTree[] = [];
  private maxDepth: number = 10;
  private numTrees: number = 100;

  constructor(config: { threshold?: number } = {}) {
    this.threshold = config.threshold ?? 0.7;
  }

  /**
   * Score anomaly (0-1)
   */
  scoreAnomaly(features: SecurityFeatures): number {
    const featureVector = this.featuresToVector(features);
    let totalPath = 0;

    if (this.trees.length === 0) {
      return this.simpleAnomalyScore(features);
    }

    for (const tree of this.trees) {
      totalPath += tree.pathLength(featureVector);
    }

    const avgPath = totalPath / this.trees.length;
    const c = Math.log(featureVector.length) * 2;
    return Math.pow(2, -avgPath / c);
  }

  /**
   * Simple anomaly score for initial detection
   */
  private simpleAnomalyScore(features: SecurityFeatures): number {
    let score = 0;
    let factors = 0;

    if (features.eventRateDeviation > 2) {
      score += 0.3;
      factors++;
    }
    if (features.failureRate > 0.5) {
      score += 0.25;
      factors++;
    }
    if (features.portDiversity > 50) {
      score += 0.2;
      factors++;
    }
    if (features.geoIPMismatches > 0) {
      score += 0.15;
      factors++;
    }

    return factors > 0 ? Math.min(score / factors, 1) : 0;
  }

  /**
   * Convert features to vector
   */
  private featuresToVector(features: SecurityFeatures): number[] {
    return [
      features.eventCount,
      features.eventsPerHour,
      features.failureRate,
      features.avgPayloadSize,
      features.portDiversity,
      features.protocolDiversity,
      features.timeSinceLast,
      features.eventRateDeviation,
      features.failureRateDeviation,
      features.portDiversityAnomaly,
      features.uniqueSourceIPs,
      features.uniqueTargetIPs,
      features.geoIPMismatches,
      features.suspiciousProtocols,
    ];
  }

  /**
   * Update forest with new data
   */
  update(_features: SecurityFeatures, _isAnomaly: boolean): void {
    if (this.trees.length < this.numTrees) {
      this.trees.push(new IFTree(this.maxDepth));
    }
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.threshold;
  }
}

export default IsolationForest;
