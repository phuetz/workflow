/**
 * Threat Detection Module
 * Barrel export for all threat detection components
 * @module threat
 */

// Types
export type {
  SecurityEvent,
  SecurityFeatures,
  SequencePattern,
  ThreatClassificationScores,
  ThreatExplainability,
  ThreatPrediction,
  ModelMetrics,
  MLModelConfig,
} from './types';

export { DEFAULT_CONFIG } from './types';

// Models and Components
export { IsolationForest } from './IsolationForest';
export { ThreatClassifier } from './ThreatClassifier';
export { SequenceAnalyzer, KILL_CHAIN_STAGES } from './SequenceAnalyzer';
export { ThreatClusterer } from './ThreatClusterer';
export { FeatureExtractor, DEFAULT_BASELINE } from './FeatureExtractor';
export type { BaselineMetrics } from './FeatureExtractor';
export { ExplainabilityEngine } from './ExplainabilityEngine';
