/**
 * Threat Classification Model
 * Multi-class threat classification using weighted scoring
 * @module threat/ThreatClassifier
 */

import type { SecurityFeatures, ThreatClassificationScores } from './types';

/**
 * Threat weights for each threat category
 */
const THREAT_WEIGHTS: Record<string, number[]> = {
  malware: [0.3, 0.1, 0.05, 0.15, 0.2, 0.1, 0.1],
  phishing: [0.05, 0.2, 0.15, 0.05, 0.1, 0.25, 0.2],
  ddos: [0.5, 0.2, 0.05, 0.05, 0.1, 0.05, 0.05],
  bruteForce: [0.1, 0.5, 0.2, 0.05, 0.05, 0.05, 0.05],
  dataExfiltration: [0.15, 0.1, 0.05, 0.2, 0.3, 0.1, 0.1],
  insiderThreat: [0.1, 0.15, 0.05, 0.1, 0.2, 0.25, 0.15],
  apt: [0.2, 0.1, 0.1, 0.1, 0.25, 0.15, 0.1],
};

/**
 * Threat Classification Model
 */
export class ThreatClassifier {
  private weights: Record<string, number[]>;

  constructor() {
    this.weights = { ...THREAT_WEIGHTS };
  }

  /**
   * Classify threat type
   */
  classify(features: SecurityFeatures): ThreatClassificationScores {
    const vector = this.featuresToVector(features);
    const scores: Record<string, number> = {};

    for (const [threat, weights] of Object.entries(this.weights)) {
      scores[threat] = this.scoreClass(vector, weights);
    }

    return {
      malware: scores.malware || 0,
      phishing: scores.phishing || 0,
      ddos: scores.ddos || 0,
      bruteForce: scores.bruteForce || 0,
      dataExfiltration: scores.dataExfiltration || 0,
      insiderThreat: scores.insiderThreat || 0,
      apt: scores.apt || 0,
    };
  }

  /**
   * Get threat category with highest score
   */
  getPrimaryThreat(classification: ThreatClassificationScores): string {
    let maxThreat = 'malware';
    let maxScore = 0;

    for (const [threat, score] of Object.entries(classification)) {
      if (score > maxScore) {
        maxScore = score;
        maxThreat = threat;
      }
    }

    return maxThreat;
  }

  /**
   * Score classification
   */
  private scoreClass(vector: number[], weights: number[]): number {
    let score = 0;
    for (let i = 0; i < Math.min(vector.length, weights.length); i++) {
      score += Math.min(vector[i], 1) * weights[i];
    }
    return Math.min(score, 1);
  }

  /**
   * Convert features to vector for classification
   */
  private featuresToVector(features: SecurityFeatures): number[] {
    return [
      Math.min(features.failureRate * 2, 1),
      Math.min(features.eventsPerHour / 100, 1),
      Math.min(features.portDiversity / 100, 1),
      Math.min(features.geoIPMismatches / 10, 1),
      Math.min(features.avgPayloadSize / 10000, 1),
      Math.min(features.suspiciousProtocols / 10, 1),
      Math.min(features.eventRateDeviation / 10, 1),
    ];
  }

  /**
   * Update classifier with new data (online learning)
   */
  update(_features: SecurityFeatures, _classification: ThreatClassificationScores): void {
    // Online learning update - placeholder for future implementation
  }
}

export default ThreatClassifier;
