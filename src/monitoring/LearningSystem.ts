/**
 * Learning System for Auto-Correction
 * Machine learning for improving correction success rates
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import type { Correction, ValidationResult } from './ValidationLoop';

export interface LearningFeatures {
  errorType: string;
  timeOfDay: number;
  dayOfWeek: number;
  systemLoad: number;
  previousFailures: number;
  correctionMethod: string;
  systemHealth: string;
  activeUsers: number;
  cpuUsage?: number;
  memoryUsage?: number;
  recentErrorRate?: number;
}

export interface TrainingData {
  features: LearningFeatures;
  outcome: boolean;
  confidence: number;
  timestamp: Date;
  metadata?: any;
}

export interface PredictionResult {
  successProbability: number;
  confidence: number;
  recommendations: string[];
  alternativeMethods?: string[];
}

export interface CorrectionStrategy {
  errorType: string;
  method: string;
  successRate: number;
  avgExecutionTime: number;
  conditions: string[];
  priority: number;
}

export interface DecisionNode {
  feature: string;
  threshold?: number;
  leftChild?: DecisionNode;
  rightChild?: DecisionNode;
  prediction?: boolean;
  confidence?: number;
}

export class CorrectionLearner extends EventEmitter {
  private trainingData: Map<string, TrainingData> = new Map();
  private strategies: Map<string, CorrectionStrategy[]> = new Map();
  private decisionTree: DecisionNode | null = null;
  private maxTrainingData = 10000;
  private minDataForTraining = 50;
  private retrainingInterval = 3600000; // 1 hour
  private lastTraining: Date | null = null;

  constructor() {
    super();
    this.initializeDefaultStrategies();
    this.startPeriodicRetraining();
  }

  /**
   * Learn from correction result
   */
  async learn(correction: Correction, result: ValidationResult): Promise<void> {
    logger.info(`Learning from correction: ${correction.id}`);

    // Extract features
    const features = await this.extractFeatures(correction, result);

    // Create training data
    const trainingData: TrainingData = {
      features,
      outcome: result.success,
      confidence: this.calculateConfidence(result),
      timestamp: new Date(),
      metadata: {
        correctionId: correction.id,
        duration: result.duration,
        rollbacks: result.metrics.rollbackCount
      }
    };

    // Store training data
    this.addTrainingData(trainingData);

    // Update strategy performance
    this.updateStrategy(correction.errorType, correction.method, result);

    // Adjust strategy if needed
    if (!result.success) {
      await this.adjustStrategy(correction.errorType);
    }

    // Retrain model if needed
    if (this.shouldRetrain()) {
      await this.trainModel();
    }

    this.emit('learning-complete', {
      correctionId: correction.id,
      success: result.success,
      features
    });
  }

  /**
   * Predict success probability for a correction
   */
  predictSuccess(correction: Correction): PredictionResult {
    // Extract current features
    const features: LearningFeatures = {
      errorType: correction.errorType,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      systemLoad: 0, // Would be populated with actual data
      previousFailures: 0,
      correctionMethod: correction.method,
      systemHealth: 'healthy',
      activeUsers: 0
    };

    // Use decision tree if trained
    let successProbability = 0.5;
    let confidence = 0.3;

    if (this.decisionTree) {
      const prediction = this.traverseTree(this.decisionTree, features);
      successProbability = prediction.probability;
      confidence = prediction.confidence;
    } else {
      // Use historical data
      const historicalSuccess = this.getHistoricalSuccessRate(
        correction.errorType,
        correction.method
      );
      successProbability = historicalSuccess;
      confidence = 0.5;
    }

    // Generate recommendations
    const recommendations = this.generatePredictionRecommendations(
      features,
      successProbability
    );

    // Find alternative methods if probability is low
    const alternativeMethods = successProbability < 0.6
      ? this.findAlternativeMethods(correction.errorType, correction.method)
      : undefined;

    return {
      successProbability,
      confidence,
      recommendations,
      alternativeMethods
    };
  }

  /**
   * Get best strategy for error type
   */
  getBestStrategy(errorType: string): CorrectionStrategy | null {
    const strategies = this.strategies.get(errorType);
    if (!strategies || strategies.length === 0) return null;

    // Sort by success rate and execution time
    const sorted = [...strategies].sort((a, b) => {
      const scoreA = a.successRate * 0.7 + (1 - a.avgExecutionTime / 10000) * 0.3;
      const scoreB = b.successRate * 0.7 + (1 - b.avgExecutionTime / 10000) * 0.3;
      return scoreB - scoreA;
    });

    return sorted[0];
  }

  /**
   * Adjust strategy based on failures
   */
  private async adjustStrategy(errorType: string): Promise<void> {
    logger.info(`Adjusting strategy for error type: ${errorType}`);

    const strategies = this.strategies.get(errorType);
    if (!strategies) return;

    // Find failing strategies
    const failing = strategies.filter(s => s.successRate < 0.6);

    for (const strategy of failing) {
      // Decrease priority
      strategy.priority = Math.max(0, strategy.priority - 1);

      // Try to find patterns in failures
      const failures = Array.from(this.trainingData.values())
        .filter(d =>
          d.features.errorType === errorType &&
          d.features.correctionMethod === strategy.method &&
          !d.outcome
        );

      if (failures.length > 5) {
        const commonConditions = this.findCommonConditions(failures);
        strategy.conditions.push(...commonConditions);

        logger.info(`Updated strategy conditions for ${errorType}:${strategy.method}`, {
          newConditions: commonConditions
        });
      }
    }

    this.emit('strategy-adjusted', { errorType, strategies });
  }

  /**
   * Train decision tree model
   */
  private async trainModel(): Promise<void> {
    logger.info('Training decision tree model...');

    const data = Array.from(this.trainingData.values());

    if (data.length < this.minDataForTraining) {
      logger.warn(`Not enough training data: ${data.length}/${this.minDataForTraining}`);
      return;
    }

    try {
      // Build decision tree
      this.decisionTree = this.buildDecisionTree(data, 0, 5); // Max depth 5

      this.lastTraining = new Date();

      logger.info('Model training completed', {
        dataPoints: data.length,
        timestamp: this.lastTraining
      });

      this.emit('model-trained', {
        dataPoints: data.length,
        timestamp: this.lastTraining
      });
    } catch (error) {
      logger.error('Model training failed:', error);
    }
  }

  /**
   * Build decision tree recursively
   */
  private buildDecisionTree(
    data: TrainingData[],
    depth: number,
    maxDepth: number
  ): DecisionNode {
    // Base case: return leaf node
    if (depth >= maxDepth || data.length < 10) {
      const successCount = data.filter(d => d.outcome).length;
      return {
        feature: 'leaf',
        prediction: successCount > data.length / 2,
        confidence: Math.abs(successCount / data.length - 0.5) * 2
      };
    }

    // Find best split
    const bestSplit = this.findBestSplit(data);

    if (!bestSplit) {
      const successCount = data.filter(d => d.outcome).length;
      return {
        feature: 'leaf',
        prediction: successCount > data.length / 2,
        confidence: successCount / data.length
      };
    }

    // Split data
    const leftData = data.filter(d => this.evaluateSplit(d.features, bestSplit));
    const rightData = data.filter(d => !this.evaluateSplit(d.features, bestSplit));

    return {
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      leftChild: this.buildDecisionTree(leftData, depth + 1, maxDepth),
      rightChild: this.buildDecisionTree(rightData, depth + 1, maxDepth)
    };
  }

  /**
   * Find best split for decision tree
   */
  private findBestSplit(data: TrainingData[]): { feature: string; threshold: number } | null {
    const features = ['systemLoad', 'previousFailures', 'timeOfDay', 'activeUsers'];
    let bestGini = 1;
    let bestSplit = null;

    for (const feature of features) {
      const values = data
        .map(d => (d.features as any)[feature])
        .filter(v => typeof v === 'number');

      if (values.length === 0) continue;

      // Try different thresholds
      const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);

      for (const threshold of uniqueValues) {
        const left = data.filter(d => ((d.features as any)[feature] || 0) <= threshold);
        const right = data.filter(d => ((d.features as any)[feature] || 0) > threshold);

        const gini = this.calculateGini(left, right);

        if (gini < bestGini) {
          bestGini = gini;
          bestSplit = { feature, threshold };
        }
      }
    }

    return bestSplit;
  }

  /**
   * Calculate Gini impurity
   */
  private calculateGini(left: TrainingData[], right: TrainingData[]): number {
    const total = left.length + right.length;
    if (total === 0) return 1;

    const giniLeft = this.calculateGiniForSet(left);
    const giniRight = this.calculateGiniForSet(right);

    return (left.length / total) * giniLeft + (right.length / total) * giniRight;
  }

  /**
   * Calculate Gini for a dataset
   */
  private calculateGiniForSet(data: TrainingData[]): number {
    if (data.length === 0) return 0;

    const successCount = data.filter(d => d.outcome).length;
    const successRate = successCount / data.length;

    return 1 - (successRate ** 2 + (1 - successRate) ** 2);
  }

  /**
   * Evaluate split condition
   */
  private evaluateSplit(
    features: LearningFeatures,
    split: { feature: string; threshold: number }
  ): boolean {
    const value = (features as any)[split.feature];
    return typeof value === 'number' && value <= split.threshold;
  }

  /**
   * Traverse decision tree for prediction
   */
  private traverseTree(
    node: DecisionNode,
    features: LearningFeatures
  ): { probability: number; confidence: number } {
    if (node.prediction !== undefined) {
      return {
        probability: node.prediction ? 0.8 : 0.2,
        confidence: node.confidence || 0.5
      };
    }

    const value = (features as any)[node.feature];
    const goLeft = typeof value === 'number' && node.threshold !== undefined && value <= node.threshold;

    const nextNode = goLeft ? node.leftChild : node.rightChild;

    if (!nextNode) {
      return { probability: 0.5, confidence: 0.3 };
    }

    return this.traverseTree(nextNode, features);
  }

  /**
   * Extract features from correction and result
   */
  private async extractFeatures(
    correction: Correction,
    result: ValidationResult
  ): Promise<LearningFeatures> {
    return {
      errorType: correction.errorType,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      systemLoad: result.metrics.performanceImpact,
      previousFailures: result.metrics.rollbackCount,
      correctionMethod: correction.method,
      systemHealth: result.monitoring.stable ? 'healthy' : 'degraded',
      activeUsers: 0, // Would be populated with actual data
      cpuUsage: result.metrics.performanceImpact,
      memoryUsage: result.metrics.performanceImpact,
      recentErrorRate: 1 - result.metrics.successRate
    };
  }

  /**
   * Calculate confidence in result
   */
  private calculateConfidence(result: ValidationResult): number {
    let confidence = 0.5;

    // Increase confidence for stable monitoring
    if (result.monitoring.stable) confidence += 0.2;

    // Increase confidence for passing all checks
    if (result.preChecks.every(c => c.passed) && result.postChecks.every(c => c.passed)) {
      confidence += 0.2;
    }

    // Decrease confidence for low success rate
    if (result.metrics.successRate < 0.7) confidence -= 0.2;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Add training data
   */
  private addTrainingData(data: TrainingData): void {
    const dataArray = Array.from(this.trainingData.values());
    dataArray.push(data);

    // Trim old data
    if (dataArray.length > this.maxTrainingData) {
      this.trainingData = new Map(
        dataArray.slice(-this.maxTrainingData).map((d, i) => [i.toString(), d])
      );
    } else {
      this.trainingData.set(dataArray.length.toString(), data);
    }
  }

  /**
   * Update strategy performance
   */
  private updateStrategy(
    errorType: string,
    method: string,
    result: ValidationResult
  ): void {
    const strategies = this.strategies.get(errorType) || [];
    let strategy = strategies.find(s => s.method === method);

    if (!strategy) {
      strategy = {
        errorType,
        method,
        successRate: 0,
        avgExecutionTime: 0,
        conditions: [],
        priority: 5
      };
      strategies.push(strategy);
      this.strategies.set(errorType, strategies);
    }

    // Update success rate (exponential moving average)
    const alpha = 0.3;
    strategy.successRate =
      alpha * (result.success ? 1 : 0) + (1 - alpha) * strategy.successRate;

    // Update average execution time
    strategy.avgExecutionTime =
      alpha * result.duration + (1 - alpha) * strategy.avgExecutionTime;
  }

  /**
   * Get historical success rate
   */
  private getHistoricalSuccessRate(errorType: string, method: string): number {
    const relevant = Array.from(this.trainingData.values()).filter(
      d => d.features.errorType === errorType && d.features.correctionMethod === method
    );

    if (relevant.length === 0) return 0.5;

    const successful = relevant.filter(d => d.outcome).length;
    return successful / relevant.length;
  }

  /**
   * Find common conditions in failures
   */
  private findCommonConditions(failures: TrainingData[]): string[] {
    const conditions: string[] = [];

    // Check time of day
    const hours = failures.map(f => f.features.timeOfDay);
    if (hours.filter(h => h >= 9 && h <= 17).length > failures.length * 0.7) {
      conditions.push('avoid_business_hours');
    }

    // Check system load
    const loads = failures.map(f => f.features.systemLoad);
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
    if (avgLoad > 0.7) {
      conditions.push('high_system_load');
    }

    return conditions;
  }

  /**
   * Generate recommendations based on prediction
   */
  private generatePredictionRecommendations(
    features: LearningFeatures,
    probability: number
  ): string[] {
    const recommendations: string[] = [];

    if (probability < 0.5) {
      recommendations.push('Success probability is low. Consider alternative methods.');
    }

    if (features.systemLoad > 0.7) {
      recommendations.push('High system load detected. Wait for lower load period.');
    }

    if (features.previousFailures > 2) {
      recommendations.push('Multiple previous failures. Manual intervention recommended.');
    }

    if (features.timeOfDay >= 9 && features.timeOfDay <= 17) {
      recommendations.push('Consider running during off-peak hours.');
    }

    return recommendations;
  }

  /**
   * Find alternative correction methods
   */
  private findAlternativeMethods(errorType: string, currentMethod: string): string[] {
    const strategies = this.strategies.get(errorType);
    if (!strategies) return [];

    return strategies
      .filter(s => s.method !== currentMethod && s.successRate > 0.6)
      .sort((a, b) => b.successRate - a.successRate)
      .map(s => s.method)
      .slice(0, 3);
  }

  /**
   * Check if model should be retrained
   */
  private shouldRetrain(): boolean {
    if (!this.lastTraining) return true;

    const timeSinceTraining = Date.now() - this.lastTraining.getTime();
    const dataPoints = this.trainingData.size;

    return (
      timeSinceTraining > this.retrainingInterval ||
      dataPoints % 100 === 0
    );
  }

  /**
   * Start periodic retraining
   */
  private startPeriodicRetraining(): void {
    setInterval(() => {
      if (this.shouldRetrain()) {
        this.trainModel();
      }
    }, this.retrainingInterval);
  }

  /**
   * Initialize default strategies
   */
  private initializeDefaultStrategies(): void {
    // Example strategies
    const strategies: CorrectionStrategy[] = [
      {
        errorType: 'NETWORK_ERROR',
        method: 'retry_with_backoff',
        successRate: 0.85,
        avgExecutionTime: 5000,
        conditions: [],
        priority: 8
      },
      {
        errorType: 'DATABASE_ERROR',
        method: 'reconnect_and_retry',
        successRate: 0.9,
        avgExecutionTime: 3000,
        conditions: [],
        priority: 9
      }
    ];

    for (const strategy of strategies) {
      const existing = this.strategies.get(strategy.errorType) || [];
      existing.push(strategy);
      this.strategies.set(strategy.errorType, existing);
    }
  }

  /**
   * Export model for analysis
   */
  exportModel(): any {
    return {
      trainingDataSize: this.trainingData.size,
      strategies: Array.from(this.strategies.entries()),
      lastTraining: this.lastTraining,
      decisionTree: this.decisionTree
    };
  }

  /**
   * Reset learning system
   */
  reset(): void {
    this.trainingData.clear();
    this.decisionTree = null;
    this.lastTraining = null;
    this.initializeDefaultStrategies();
    this.emit('system-reset');
  }
}

// Export singleton instance
export const correctionLearner = new CorrectionLearner();
