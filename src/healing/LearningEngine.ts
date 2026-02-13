/**
 * Learning Engine
 * Learns from healing attempts to improve strategy selection over time
 */

import {
  WorkflowError,
  ErrorType,
  HealingStrategy,
  HealingResult,
  LearningData,
  LearningModel,
  LearningFeatures
} from '../types/healing';
import { logger } from '../services/SimpleLogger';

export class LearningEngine {
  private learningData: LearningData[] = [];
  private model: LearningModel | null = null;
  private minSampleSize: number = 10;
  private maxDataPoints: number = 1000;

  /**
   * Learn from a healing attempt
   */
  async learn(
    error: WorkflowError,
    strategy: HealingStrategy,
    result: HealingResult
  ): Promise<void> {
    const features = this.extractFeatures(error);
    
    const learningPoint: LearningData = {
      strategyId: strategy.id,
      errorType: this.classifyError(error),
      success: result.success,
      duration: result.duration,
      timestamp: new Date(),
      features
    };

    this.learningData.push(learningPoint);

    // Keep only recent data
    if (this.learningData.length > this.maxDataPoints) {
      this.learningData = this.learningData.slice(-this.maxDataPoints);
    }

    // Retrain model if we have enough data
    if (this.learningData.length >= this.minSampleSize) {
      await this.trainModel();
    }

    logger.debug(`Learned from healing attempt: ${result.success ? 'SUCCESS' : 'FAILURE'}`);
  }

  /**
   * Extract features from error context
   */
  private extractFeatures(error: WorkflowError): LearningFeatures {
    const now = new Date();
    
    return {
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      errorFrequency: error.attempt,
      nodeType: error.nodeType,
      previousAttempts: error.previousErrors?.length || 0,
      serviceHealth: 'healthy', // Would be determined from monitoring
      loadLevel: 'medium' // Would be determined from system metrics
    };
  }

  /**
   * Classify error (simplified version)
   */
  private classifyError(error: WorkflowError): ErrorType {
    // This would use the ErrorDiagnostician in production
    // For now, simple classification
    if (error.message.toLowerCase().includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    if (error.message.toLowerCase().includes('rate limit')) {
      return ErrorType.RATE_LIMIT;
    }
    return ErrorType.UNKNOWN;
  }

  /**
   * Train machine learning model
   */
  private async trainModel(): Promise<void> {
    if (this.learningData.length < this.minSampleSize) {
      return;
    }

    logger.info('Training healing strategy model...');

    // Simple learning algorithm: Calculate success rates by error type
    const strategyRankings: Record<ErrorType, string[]> = {} as Record<ErrorType, string[]>;
    const confidenceScores: Record<string, number> = {};

    // Group by error type
    const errorTypeGroups = new Map<ErrorType, LearningData[]>();
    for (const point of this.learningData) {
      if (!errorTypeGroups.has(point.errorType)) {
        errorTypeGroups.set(point.errorType, []);
      }
      errorTypeGroups.get(point.errorType)!.push(point);
    }

    // Calculate success rates for each strategy per error type
    for (const [errorType, points] of errorTypeGroups) {
      const strategyStats = new Map<string, { successes: number; total: number }>();
      
      for (const point of points) {
        if (!strategyStats.has(point.strategyId)) {
          strategyStats.set(point.strategyId, { successes: 0, total: 0 });
        }
        
        const stats = strategyStats.get(point.strategyId)!;
        stats.total++;
        if (point.success) {
          stats.successes++;
        }
      }

      // Rank strategies by success rate
      const ranked = Array.from(strategyStats.entries())
        .map(([strategyId, stats]) => ({
          strategyId,
          successRate: stats.successes / stats.total,
          confidence: Math.min(1, stats.total / this.minSampleSize)
        }))
        .sort((a, b) => b.successRate - a.successRate);

      strategyRankings[errorType] = ranked.map(r => r.strategyId);

      // Store confidence scores
      for (const r of ranked) {
        const key = `${r.strategyId}-${errorType}`;
        confidenceScores[key] = r.confidence;
      }
    }

    // Simple feature weights (would be more sophisticated in production)
    const featureWeights: Record<string, number> = {
      timeOfDay: 0.1,
      dayOfWeek: 0.05,
      errorFrequency: 0.3,
      nodeType: 0.2,
      previousAttempts: 0.25,
      serviceHealth: 0.1,
      loadLevel: 0.0
    };

    // Calculate accuracy (using leave-one-out cross-validation approximation)
    let correct = 0;
    for (const point of this.learningData) {
      const topStrategy = strategyRankings[point.errorType]?.[0];
      if (topStrategy === point.strategyId && point.success) {
        correct++;
      }
    }
    const accuracy = correct / this.learningData.length;

    this.model = {
      version: '1.0.0',
      trainedAt: new Date(),
      accuracy,
      strategyRankings,
      confidenceScores,
      featureWeights
    };

    logger.info(`Model trained with accuracy: ${(accuracy * 100).toFixed(2)}%`);
  }

  /**
   * Get recommended strategies for error type
   */
  getRecommendations(errorType: ErrorType): string[] {
    if (!this.model) {
      return [];
    }

    return this.model.strategyRankings[errorType] || [];
  }

  /**
   * Get confidence score for strategy-error combination
   */
  getConfidence(strategyId: string, errorType: ErrorType): number {
    if (!this.model) {
      return 0.5; // Default confidence
    }

    const key = `${strategyId}-${errorType}`;
    return this.model.confidenceScores[key] || 0.5;
  }

  /**
   * Get model
   */
  getModel(): LearningModel | null {
    return this.model;
  }

  /**
   * Get learning data
   */
  getLearningData(): LearningData[] {
    return [...this.learningData];
  }

  /**
   * Clear learning data
   */
  clearData(): void {
    this.learningData = [];
    this.model = null;
    logger.info('Learning data cleared');
  }

  /**
   * Export model
   */
  exportModel(): string {
    if (!this.model) {
      return JSON.stringify({ error: 'No model trained' });
    }

    return JSON.stringify(this.model, null, 2);
  }

  /**
   * Import model
   */
  importModel(modelJson: string): void {
    try {
      this.model = JSON.parse(modelJson);
      logger.info('Model imported successfully');
    } catch (error) {
      logger.error(`Failed to import model: ${(error as Error).message}`);
    }
  }
}

// Export singleton
export const learningEngine = new LearningEngine();
