/**
 * ML-Based Threat Detection System
 *
 * Advanced machine learning models for detecting and classifying security threats:
 * - Anomaly detection using Isolation Forest
 * - Multi-class threat classification
 * - Attack sequence pattern recognition
 * - Threat clustering and campaign detection
 *
 * @module MLThreatDetector
 */

import {
  type SecurityEvent,
  type SecurityFeatures,
  type ThreatPrediction,
  type ModelMetrics,
  type MLModelConfig,
  DEFAULT_CONFIG,
  IsolationForest,
  ThreatClassifier,
  SequenceAnalyzer,
  ThreatClusterer,
  FeatureExtractor,
  ExplainabilityEngine,
} from './threat';

// Re-export types for backward compatibility
export type {
  SecurityEvent,
  SecurityFeatures,
  ThreatPrediction,
  ModelMetrics,
  MLModelConfig,
} from './threat';

export type { SequencePattern } from './threat';

/**
 * ML-Based Threat Detection System
 * Combines multiple ML models for comprehensive security threat detection
 */
export class MLThreatDetector {
  private config: MLModelConfig;
  private eventHistory: SecurityEvent[] = [];
  private isolationForest: IsolationForest;
  private threatClassifier: ThreatClassifier;
  private sequenceAnalyzer: SequenceAnalyzer;
  private threatClusterer: ThreatClusterer;
  private featureExtractor: FeatureExtractor;
  private explainabilityEngine: ExplainabilityEngine;
  private metrics: Map<string, ModelMetrics> = new Map();
  private modelVersion: string;

  /**
   * Initialize ML Threat Detector
   */
  constructor(config: Partial<MLModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.modelVersion = this.config.modelVersion;

    // Initialize components
    this.isolationForest = new IsolationForest({ threshold: this.config.anomalyThreshold });
    this.threatClassifier = new ThreatClassifier();
    this.sequenceAnalyzer = new SequenceAnalyzer();
    this.threatClusterer = new ThreatClusterer();
    this.featureExtractor = new FeatureExtractor();
    this.explainabilityEngine = new ExplainabilityEngine();
  }

  /**
   * Predict threats for a security event
   */
  async predictThreat(event: SecurityEvent): Promise<ThreatPrediction> {
    const startTime = Date.now();

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.config.maxHistoryEvents) {
      this.eventHistory.shift();
    }

    // Get recent events for feature extraction
    const recentEvents = this.eventHistory.slice(-this.config.featureWindowSize);

    // Extract features
    const features = this.featureExtractor.extractFeatures(event, recentEvents);

    // Run detection models
    const anomalyScore = this.isolationForest.scoreAnomaly(features);
    const isAnomaly = anomalyScore > this.config.anomalyThreshold;

    const threatClassification = this.threatClassifier.classify(features);
    const primaryThreat = this.threatClassifier.getPrimaryThreat(threatClassification);
    const threatConfidence = threatClassification[primaryThreat as keyof typeof threatClassification] || 0;

    const sequencePatterns = this.sequenceAnalyzer.analyzePatterns(recentEvents);
    const clusterAssignment = this.threatClusterer.assignCluster(features);

    const explainability = this.explainabilityEngine.generateExplanation(
      features,
      anomalyScore,
      threatClassification,
      sequencePatterns
    );

    const prediction: ThreatPrediction = {
      anomalyScore,
      isAnomaly,
      threatClassification,
      primaryThreat,
      threatConfidence,
      sequencePatterns,
      clusterAssignment,
      explainability,
      metadata: {
        timestamp: Date.now(),
        modelVersion: this.modelVersion,
        processingTime: Date.now() - startTime,
      },
    };

    // Online learning
    if (this.config.enableOnlineLearning) {
      this.updateModels(features, prediction);
    }

    return prediction;
  }

  /**
   * Batch predict threats
   */
  async batchPredict(events: SecurityEvent[]): Promise<ThreatPrediction[]> {
    return Promise.all(events.map(event => this.predictThreat(event)));
  }

  /**
   * Update models with new data (online learning)
   */
  private updateModels(features: SecurityFeatures, prediction: ThreatPrediction): void {
    this.isolationForest.update(features, prediction.isAnomaly);
    this.threatClassifier.update(features, prediction.threatClassification);
    this.threatClusterer.update(features, prediction.clusterAssignment);
  }

  /**
   * Get model metrics
   */
  getMetrics(): Map<string, ModelMetrics> {
    return this.metrics;
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(events: SecurityEvent[], labels: boolean[]): Promise<void> {
    const predictions = await this.batchPredict(events);

    let tp = 0, fp = 0, tn = 0, fn = 0;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i].isAnomaly;
      const actual = labels[i];

      if (predicted && actual) tp++;
      else if (predicted && !actual) fp++;
      else if (!predicted && !actual) tn++;
      else fn++;
    }

    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const falsePositiveRate = fp / (fp + tn) || 0;

    this.metrics.set('anomaly', {
      precision,
      recall,
      f1Score,
      rocAuc: 0.85, // Placeholder
      falsePositiveRate,
      threshold: this.config.anomalyThreshold,
    });
  }

  /**
   * Export model for persistence
   */
  exportModel(): unknown {
    return {
      version: this.modelVersion,
      config: this.config,
      baselineMetrics: Object.fromEntries(
        Object.entries(this.featureExtractor.getBaseline())
      ),
      metrics: Object.fromEntries(this.metrics),
      timestamp: Date.now(),
    };
  }

  /**
   * Import model from persistence
   */
  importModel(data: unknown): void {
    const model = data as Record<string, unknown>;
    if (typeof model.version === 'string') {
      this.modelVersion = model.version;
    }
    if (typeof model.timestamp === 'number') {
      console.log(`Loaded model from ${new Date(model.timestamp).toISOString()}`);
    }
  }

  /**
   * Get event history length
   */
  getEventHistoryLength(): number {
    return this.eventHistory.length;
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get configuration
   */
  getConfig(): MLModelConfig {
    return { ...this.config };
  }
}

export default MLThreatDetector;
