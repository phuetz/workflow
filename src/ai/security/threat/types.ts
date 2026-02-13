/**
 * Type definitions for ML Threat Detection System
 * @module threat/types
 */

/**
 * Security event for threat detection
 */
export interface SecurityEvent {
  timestamp: number;
  eventType: string;
  sourceIP: string;
  targetIP: string;
  userId: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  port?: number;
  protocol?: string;
  payload?: string;
  metadata: Record<string, unknown>;
}

/**
 * Features extracted from security events
 */
export interface SecurityFeatures {
  // Numerical features
  eventCount: number;
  eventsPerHour: number;
  failureRate: number;
  avgPayloadSize: number;
  portDiversity: number;
  protocolDiversity: number;
  timeSinceLast: number;

  // Categorical features
  eventTypes: Map<string, number>;
  sourceCountries: Map<string, number>;
  targetPorts: Map<number, number>;
  protocols: Map<string, number>;

  // Temporal features
  hour: number;
  dayOfWeek: number;
  isBusinessHours: boolean;
  weekendActivity: boolean;

  // Behavioral features
  eventRateDeviation: number;
  failureRateDeviation: number;
  portDiversityAnomaly: number;

  // Network features
  uniqueSourceIPs: number;
  uniqueTargetIPs: number;
  geoIPMismatches: number;
  suspiciousProtocols: number;
}

/**
 * Attack sequence pattern
 */
export interface SequencePattern {
  pattern: string[];
  confidence: number;
  killChainStage: string;
  estimatedImpact: number;
}

/**
 * Threat classification scores
 */
export interface ThreatClassificationScores {
  malware: number;
  phishing: number;
  ddos: number;
  bruteForce: number;
  dataExfiltration: number;
  insiderThreat: number;
  apt: number;
}

/**
 * Explainability information for predictions
 */
export interface ThreatExplainability {
  featureImportance: Map<string, number>;
  topFeatures: Array<{ feature: string; value: number; impact: number }>;
  humanReadableInsights: string[];
}

/**
 * Threat detection prediction result
 */
export interface ThreatPrediction {
  anomalyScore: number;
  isAnomaly: boolean;
  threatClassification: ThreatClassificationScores;
  primaryThreat: string;
  threatConfidence: number;
  sequencePatterns: SequencePattern[];
  clusterAssignment: number;
  explainability: ThreatExplainability;
  metadata: {
    timestamp: number;
    modelVersion: string;
    processingTime: number;
  };
}

/**
 * Model metrics
 */
export interface ModelMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  falsePositiveRate: number;
  threshold: number;
}

/**
 * Model configuration
 */
export interface MLModelConfig {
  anomalyThreshold: number;
  threatThreshold: number;
  enableOnlineLearning: boolean;
  maxHistoryEvents: number;
  featureWindowSize: number;
  modelVersion: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: MLModelConfig = {
  anomalyThreshold: 0.7,
  threatThreshold: 0.6,
  enableOnlineLearning: true,
  maxHistoryEvents: 10000,
  featureWindowSize: 100,
  modelVersion: '1.0.0',
};
