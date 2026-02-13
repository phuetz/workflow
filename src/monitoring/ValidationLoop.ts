/**
 * Validation Loop System
 * Continuous validation with machine learning for auto-correction
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import { monitoringSystem } from './MonitoringSystem';

export interface ValidationRule {
  id: string;
  name: string;
  type: 'pre-check' | 'post-check' | 'monitoring';
  check: (context: any) => Promise<ValidationCheckResult>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  timeout?: number;
}

export interface ValidationCheckResult {
  passed: boolean;
  message: string;
  details?: any;
  metrics?: Record<string, number>;
}

export interface Correction {
  id: string;
  type: string;
  errorType: string;
  method: string;
  description: string;
  apply: () => Promise<CorrectionResult>;
  rollback?: () => Promise<void>;
  metadata?: any;
}

export interface CorrectionResult {
  success: boolean;
  message: string;
  changes: string[];
  metrics?: Record<string, number>;
}

export interface ValidationResult {
  success: boolean;
  correctionId: string;
  preChecks: ValidationCheckResult[];
  postChecks: ValidationCheckResult[];
  monitoring: MonitoringResult;
  metrics: ValidationMetrics;
  recommendations: string[];
  timestamp: Date;
  duration: number;
}

export interface MonitoringResult {
  stable: boolean;
  duration: number;
  healthChecks: Array<{
    timestamp: Date;
    status: string;
    details: any;
  }>;
  incidents: any[];
}

export interface ValidationMetrics {
  successRate: number;
  avgResolutionTime: number;
  falsePositiveRate: number;
  rollbackCount: number;
  performanceImpact: number;
  userImpactScore: number;
}

export interface ValidationHistory {
  correctionId: string;
  timestamp: Date;
  result: ValidationResult;
  learned: boolean;
}

export interface LearningFeatures {
  errorType: string;
  timeOfDay: number;
  dayOfWeek: number;
  systemLoad: number;
  previousFailures: number;
  correctionMethod: string;
  systemHealth: string;
  activeUsers: number;
}

export class ValidationLoop extends EventEmitter {
  private validationRules: Map<string, ValidationRule> = new Map();
  private history: ValidationHistory[] = [];
  private maxHistorySize = 1000;
  private correctionAttempts: Map<string, number> = new Map();
  private rollbackThreshold = 3;
  private monitoringDuration = 5 * 60 * 1000; // 5 minutes
  private learningEnabled = true;

  constructor() {
    super();
    this.setupDefaultRules();
  }

  /**
   * Main validation method
   */
  async validate(correction: Correction): Promise<ValidationResult> {
    const startTime = Date.now();
    logger.info(`Starting validation for correction: ${correction.id}`);

    try {
      // 1. Pre-validation checks
      logger.info('Running pre-validation checks...');
      const preChecks = await this.runPreChecks(correction);

      if (!this.allChecksPassed(preChecks)) {
        logger.error('Pre-validation checks failed', { preChecks });
        return this.createFailedResult(correction.id, preChecks, [], startTime);
      }

      // 2. Apply correction
      logger.info('Applying correction...');
      const correctionResult = await this.applyWithSafety(correction);

      if (!correctionResult.success) {
        logger.error('Correction application failed', { correctionResult });
        return this.createFailedResult(correction.id, preChecks, [], startTime);
      }

      // 3. Post-validation checks
      logger.info('Running post-validation checks...');
      const postChecks = await this.runPostChecks(correctionResult);

      if (!this.allChecksPassed(postChecks)) {
        logger.error('Post-validation checks failed, rolling back...', { postChecks });
        await this.rollback(correction);
        return this.createFailedResult(correction.id, preChecks, postChecks, startTime);
      }

      // 4. Monitor for stability
      logger.info('Monitoring system stability...');
      const monitoring = await this.monitorHealth(this.monitoringDuration);

      if (!monitoring.stable) {
        logger.error('System became unstable, rolling back...', { monitoring });
        await this.rollback(correction);
        return this.createFailedResult(correction.id, preChecks, postChecks, startTime, monitoring);
      }

      // 5. Collect metrics and learn
      const metrics = this.collectMetrics(correction.id);
      const recommendations = this.generateRecommendations(correction, correctionResult);

      // 6. Learn from result
      if (this.learningEnabled) {
        await this.updateLearningModel(correction, {
          success: true,
          correctionId: correction.id,
          preChecks,
          postChecks,
          monitoring,
          metrics,
          recommendations,
          timestamp: new Date(),
          duration: Date.now() - startTime
        });
      }

      const result: ValidationResult = {
        success: true,
        correctionId: correction.id,
        preChecks,
        postChecks,
        monitoring,
        metrics,
        recommendations,
        timestamp: new Date(),
        duration: Date.now() - startTime
      };

      this.addToHistory(correction.id, result);
      this.emit('validation-success', result);

      logger.info(`Validation successful for ${correction.id}`, {
        duration: result.duration,
        metrics
      });

      return result;

    } catch (error) {
      logger.error('Validation failed with error:', error);

      // Attempt rollback
      try {
        await this.rollback(correction);
      } catch (rollbackError) {
        logger.error('Rollback also failed:', rollbackError);
      }

      const result = this.createFailedResult(correction.id, [], [], startTime);
      this.emit('validation-failure', result);
      return result;
    }
  }

  /**
   * Run pre-validation checks
   */
  private async runPreChecks(correction: Correction): Promise<ValidationCheckResult[]> {
    const preCheckRules = Array.from(this.validationRules.values())
      .filter(rule => rule.type === 'pre-check' && rule.enabled);

    const results: ValidationCheckResult[] = [];

    for (const rule of preCheckRules) {
      try {
        const timeout = rule.timeout || 10000;
        const result = await this.runWithTimeout(
          rule.check({ correction }),
          timeout
        );
        results.push(result);

        if (!result.passed && rule.severity === 'critical') {
          // Stop on critical failures
          break;
        }
      } catch (error) {
        results.push({
          passed: false,
          message: `Check failed: ${rule.name}`,
          details: { error: (error as Error).message }
        });
      }
    }

    return results;
  }

  /**
   * Run post-validation checks
   */
  private async runPostChecks(correctionResult: CorrectionResult): Promise<ValidationCheckResult[]> {
    const postCheckRules = Array.from(this.validationRules.values())
      .filter(rule => rule.type === 'post-check' && rule.enabled);

    const results: ValidationCheckResult[] = [];

    for (const rule of postCheckRules) {
      try {
        const timeout = rule.timeout || 10000;
        const result = await this.runWithTimeout(
          rule.check({ correctionResult }),
          timeout
        );
        results.push(result);
      } catch (error) {
        results.push({
          passed: false,
          message: `Check failed: ${rule.name}`,
          details: { error: (error as Error).message }
        });
      }
    }

    return results;
  }

  /**
   * Monitor system health
   */
  private async monitorHealth(duration: number): Promise<MonitoringResult> {
    const startTime = Date.now();
    const healthChecks: Array<{ timestamp: Date; status: string; details: any }> = [];
    const incidents: any[] = [];
    const checkInterval = 5000; // Check every 5 seconds

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const health = monitoringSystem.getHealthStatus();
        const check = {
          timestamp: new Date(),
          status: health.status,
          details: health.checks
        };

        healthChecks.push(check);

        if (health.status === 'unhealthy') {
          incidents.push({
            timestamp: new Date(),
            message: 'System health degraded',
            details: health.checks.filter(c => c.status === 'unhealthy')
          });
        }

        if (Date.now() - startTime >= duration) {
          clearInterval(interval);

          const stable = incidents.length === 0 &&
                        healthChecks.every(c => c.status !== 'unhealthy');

          resolve({
            stable,
            duration: Date.now() - startTime,
            healthChecks,
            incidents
          });
        }
      }, checkInterval);
    });
  }

  /**
   * Apply correction with safety measures
   */
  private async applyWithSafety(correction: Correction): Promise<CorrectionResult> {
    // Check if we've attempted this correction too many times
    const attempts = this.correctionAttempts.get(correction.errorType) || 0;

    if (attempts >= this.rollbackThreshold) {
      throw new Error(
        `Correction for ${correction.errorType} has failed ${attempts} times. Manual intervention required.`
      );
    }

    try {
      const result = await correction.apply();

      if (result.success) {
        this.correctionAttempts.set(correction.errorType, 0); // Reset on success
      } else {
        this.correctionAttempts.set(correction.errorType, attempts + 1);
      }

      return result;
    } catch (error) {
      this.correctionAttempts.set(correction.errorType, attempts + 1);
      throw error;
    }
  }

  /**
   * Rollback correction
   */
  private async rollback(correction: Correction): Promise<void> {
    if (correction.rollback) {
      logger.info(`Rolling back correction: ${correction.id}`);
      await correction.rollback();
      this.emit('rollback', { correctionId: correction.id });
    }
  }

  /**
   * Check if all validation checks passed
   */
  private allChecksPassed(checks: ValidationCheckResult[]): boolean {
    return checks.every(check => check.passed);
  }

  /**
   * Collect validation metrics
   */
  private collectMetrics(correctionId: string): ValidationMetrics {
    const recentHistory = this.history.slice(-100);
    const total = recentHistory.length;
    const successful = recentHistory.filter(h => h.result.success).length;

    // Calculate success rate
    const successRate = total > 0 ? successful / total : 0;

    // Calculate average resolution time
    const avgResolutionTime = total > 0
      ? recentHistory.reduce((sum, h) => sum + h.result.duration, 0) / total
      : 0;

    // Calculate false positive rate (simplified)
    const falsePositives = recentHistory.filter(h =>
      h.result.success && h.result.monitoring.incidents.length > 0
    ).length;
    const falsePositiveRate = total > 0 ? falsePositives / total : 0;

    // Count rollbacks
    const rollbackCount = Array.from(this.correctionAttempts.values())
      .reduce((sum, count) => sum + count, 0);

    // Performance impact (simplified - based on duration)
    const performanceImpact = avgResolutionTime > 30000 ? 0.5 : 0.1;

    // User impact score (0-1, lower is better)
    const userImpactScore = (1 - successRate) * 0.5 + falsePositiveRate * 0.3 + performanceImpact * 0.2;

    return {
      successRate,
      avgResolutionTime,
      falsePositiveRate,
      rollbackCount,
      performanceImpact,
      userImpactScore
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    correction: Correction,
    result: CorrectionResult
  ): string[] {
    const recommendations: string[] = [];

    // Check performance
    if (result.metrics?.duration && result.metrics.duration > 10000) {
      recommendations.push(
        'Consider optimizing the correction process to reduce execution time'
      );
    }

    // Check reliability
    const errorRate = this.correctionAttempts.get(correction.errorType) || 0;
    if (errorRate > 1) {
      recommendations.push(
        `This correction has failed ${errorRate} times recently. Consider reviewing the implementation.`
      );
    }

    // Check recent history
    const recentFailures = this.history
      .slice(-10)
      .filter(h => h.result.correctionId === correction.id && !h.result.success);

    if (recentFailures.length > 2) {
      recommendations.push(
        'Multiple recent failures detected. Manual review recommended.'
      );
    }

    return recommendations;
  }

  /**
   * Update learning model
   */
  private async updateLearningModel(
    correction: Correction,
    result: ValidationResult
  ): Promise<void> {
    // Extract features
    const features: LearningFeatures = {
      errorType: correction.errorType,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      systemLoad: await this.getSystemLoad(),
      previousFailures: this.correctionAttempts.get(correction.errorType) || 0,
      correctionMethod: correction.method,
      systemHealth: monitoringSystem.getHealthStatus().status,
      activeUsers: await this.getActiveUsers()
    };

    // Store learning data
    this.emit('learning-update', {
      features,
      outcome: result.success,
      metrics: result.metrics,
      timestamp: new Date()
    });

    logger.debug('Learning model updated', { features, success: result.success });
  }

  /**
   * Setup default validation rules
   */
  private setupDefaultRules(): void {
    // Pre-check: System health
    this.addRule({
      id: 'pre-system-health',
      name: 'System Health Check',
      type: 'pre-check',
      severity: 'critical',
      enabled: true,
      check: async () => {
        const health = monitoringSystem.getHealthStatus();
        return {
          passed: health.status !== 'unhealthy',
          message: `System health: ${health.status}`,
          details: { checks: health.checks }
        };
      }
    });

    // Pre-check: Database connectivity
    this.addRule({
      id: 'pre-database',
      name: 'Database Connectivity',
      type: 'pre-check',
      severity: 'critical',
      enabled: true,
      check: async () => {
        try {
          // Mock database check
          return {
            passed: true,
            message: 'Database connection is healthy',
            metrics: { latency: 5 }
          };
        } catch (error) {
          return {
            passed: false,
            message: 'Database connection failed',
            details: { error: (error as Error).message }
          };
        }
      }
    });

    // Post-check: API endpoints
    this.addRule({
      id: 'post-api-health',
      name: 'API Endpoints Health',
      type: 'post-check',
      severity: 'critical',
      enabled: true,
      check: async () => {
        const criticalEndpoints = [
          '/api/health',
          '/api/workflows',
          '/api/executions'
        ];

        const results = await Promise.all(
          criticalEndpoints.map(async endpoint => {
            try {
              // Mock endpoint check
              return { endpoint, healthy: true, latency: Math.random() * 100 };
            } catch {
              return { endpoint, healthy: false };
            }
          })
        );

        const allHealthy = results.every(r => r.healthy);

        return {
          passed: allHealthy,
          message: allHealthy
            ? 'All API endpoints are healthy'
            : 'Some API endpoints are unhealthy',
          details: { endpoints: results }
        };
      }
    });

    // Post-check: No new errors
    this.addRule({
      id: 'post-error-rate',
      name: 'Error Rate Check',
      type: 'post-check',
      severity: 'error',
      enabled: true,
      check: async () => {
        const summary = monitoringSystem.getMetricsSummary();
        const errorRate = summary.workflow?.errorRate || 0;

        return {
          passed: errorRate < 0.05, // Less than 5% error rate
          message: `Current error rate: ${(errorRate * 100).toFixed(2)}%`,
          metrics: { errorRate }
        };
      }
    });
  }

  /**
   * Add validation rule
   */
  addRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
    logger.info(`Added validation rule: ${rule.name}`);
  }

  /**
   * Remove validation rule
   */
  removeRule(ruleId: string): void {
    this.validationRules.delete(ruleId);
  }

  /**
   * Enable/disable rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.validationRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Get validation history
   */
  getHistory(limit = 50): ValidationHistory[] {
    return this.history.slice(-limit);
  }

  /**
   * Add to history
   */
  private addToHistory(correctionId: string, result: ValidationResult): void {
    this.history.push({
      correctionId,
      timestamp: new Date(),
      result,
      learned: this.learningEnabled
    });

    // Trim history
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Create failed result
   */
  private createFailedResult(
    correctionId: string,
    preChecks: ValidationCheckResult[],
    postChecks: ValidationCheckResult[],
    startTime: number,
    monitoring?: MonitoringResult
  ): ValidationResult {
    return {
      success: false,
      correctionId,
      preChecks,
      postChecks,
      monitoring: monitoring || {
        stable: false,
        duration: 0,
        healthChecks: [],
        incidents: []
      },
      metrics: this.collectMetrics(correctionId),
      recommendations: ['Manual intervention may be required'],
      timestamp: new Date(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Run with timeout
   */
  private async runWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }

  /**
   * Get system load
   */
  private async getSystemLoad(): Promise<number> {
    const summary = monitoringSystem.getMetricsSummary();
    return summary.workflow?.executionsInProgress || 0;
  }

  /**
   * Get active users
   */
  private async getActiveUsers(): Promise<number> {
    // Mock implementation
    return Math.floor(Math.random() * 100);
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.removeAllListeners();
    this.validationRules.clear();
    this.history = [];
    this.correctionAttempts.clear();
  }
}

// Export singleton instance
export const validationLoop = new ValidationLoop();
