/**
 * Safe Correction Framework - Detection & Recommendation System
 *
 * This framework DETECTS errors and RECOMMENDS fixes but does NOT apply them automatically.
 * All corrections require human validation before application.
 *
 * @important This follows the project's rule: NO AUTOMATIC CORRECTIONS without validation
 */

import { notificationService } from '../../services/core/UnifiedNotificationService';

export interface ErrorContext {
  timestamp: Date;
  error: Error;
  stack?: string;
  metadata: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CorrectionRecommendation {
  id: string;
  errorType: string;
  description: string;
  steps: CorrectionStep[];
  estimatedImpact: 'safe' | 'moderate' | 'risky';
  requiresRestart: boolean;
  requiresDowntime: boolean;
  validationChecks: ValidationCheck[];
  rollbackPlan: RollbackStep[];
}

export interface CorrectionStep {
  order: number;
  description: string;
  command?: string;
  code?: string;
  manualAction?: string;
  estimatedDuration: number; // seconds
}

export interface ValidationCheck {
  name: string;
  description: string;
  check: () => Promise<boolean>;
  failureMessage: string;
}

export interface RollbackStep {
  order: number;
  description: string;
  action: () => Promise<void>;
}

export interface CorrectionResult {
  success: boolean;
  appliedAt?: Date;
  validationResults: Array<{
    check: string;
    passed: boolean;
    message: string;
  }>;
  requiresRollback: boolean;
  logs: string[];
}

/**
 * Base class for error correctors
 * Subclasses provide recommendations, NOT automatic fixes
 */
export abstract class ErrorCorrector {
  abstract readonly name: string;
  abstract readonly category: string;

  /**
   * Check if this corrector can handle the error
   */
  abstract canHandle(error: ErrorContext): boolean;

  /**
   * Analyze the error and provide correction recommendations
   * DOES NOT apply the correction - only provides guidance
   */
  abstract analyze(error: ErrorContext): Promise<CorrectionRecommendation>;

  /**
   * Validate that a proposed correction is safe
   * Runs in test environment before human approval
   */
  abstract validateCorrection(
    recommendation: CorrectionRecommendation
  ): Promise<ValidationResult>;

  /**
   * Generate a rollback plan in case correction fails
   */
  abstract generateRollbackPlan(
    recommendation: CorrectionRecommendation
  ): Promise<RollbackStep[]>;
}

export interface ValidationResult {
  safe: boolean;
  warnings: string[];
  risks: string[];
  testResults: Array<{
    test: string;
    passed: boolean;
    details: string;
  }>;
}

/**
 * Orchestrator that manages error detection and correction recommendations
 *
 * IMPORTANT: This does NOT auto-apply fixes. It provides recommendations
 * that must be reviewed and manually approved by a human.
 */
export class CorrectionOrchestrator {
  private correctors: Map<string, ErrorCorrector> = new Map();
  private errorLog: ErrorContext[] = [];
  private recommendationLog: CorrectionRecommendation[] = [];

  /**
   * Register an error corrector
   */
  registerCorrector(corrector: ErrorCorrector): void {
    this.correctors.set(corrector.name, corrector);
    console.log(`[CorrectionOrchestrator] Registered corrector: ${corrector.name}`);
  }

  /**
   * Analyze an error and generate recommendations
   * DOES NOT apply fixes automatically
   */
  async analyzeError(error: Error, metadata?: Record<string, any>): Promise<CorrectionRecommendation | null> {
    const context: ErrorContext = {
      timestamp: new Date(),
      error,
      stack: error.stack,
      metadata: metadata || {},
      severity: this.calculateSeverity(error, metadata),
    };

    // Log the error
    this.errorLog.push(context);

    // Find a corrector that can handle this error
    const corrector = this.findCorrector(context);
    if (!corrector) {
      console.warn(`[CorrectionOrchestrator] No corrector found for error: ${error.message}`);
      return null;
    }

    // Generate recommendation
    console.log(`[CorrectionOrchestrator] Analyzing error with ${corrector.name}`);
    const recommendation = await corrector.analyze(context);

    // Validate in test environment
    console.log(`[CorrectionOrchestrator] Validating recommendation in test environment`);
    const validation = await corrector.validateCorrection(recommendation);

    if (!validation.safe) {
      console.warn(`[CorrectionOrchestrator] Recommendation is NOT SAFE:`, validation.risks);
      recommendation.estimatedImpact = 'risky';
    }

    // Log the recommendation
    this.recommendationLog.push(recommendation);

    // Notify humans (do not auto-apply)
    await this.notifyHumans(recommendation, validation);

    return recommendation;
  }

  /**
   * Find a corrector that can handle the error
   */
  private findCorrector(context: ErrorContext): ErrorCorrector | undefined {
    for (const corrector of this.correctors.values()) {
      if (corrector.canHandle(context)) {
        return corrector;
      }
    }
    return undefined;
  }

  /**
   * Calculate error severity
   */
  private calculateSeverity(error: Error, metadata?: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    // Check error type
    if (error.name === 'OutOfMemoryError' || error.message.includes('ENOMEM')) {
      return 'critical';
    }
    if (error.name === 'DatabaseError' || error.message.includes('ECONNREFUSED')) {
      return 'high';
    }
    if (error.name === 'NetworkError' || error.message.includes('ETIMEDOUT')) {
      return 'medium';
    }

    // Check frequency
    const recentErrors = this.errorLog.filter(
      e => e.error.message === error.message && Date.now() - e.timestamp.getTime() < 300000 // 5 minutes
    );
    if (recentErrors.length > 10) {
      return 'high';
    }

    return 'low';
  }

  /**
   * Notify humans about the recommendation
   * Sends to Slack, email, dashboard, etc.
   */
  private async notifyHumans(
    recommendation: CorrectionRecommendation,
    validation: ValidationResult
  ): Promise<void> {
    const notification = {
      timestamp: new Date().toISOString(),
      recommendation,
      validation,
      message: `Error detected: ${recommendation.errorType}\nRecommended fix available for review.`,
      actionRequired: 'Review and manually apply the recommended correction',
    };

    console.log('[CorrectionOrchestrator] NOTIFICATION:', JSON.stringify(notification, null, 2));

    // Send notification through the notification service
    notificationService.send({
      type: recommendation.severity === 'critical' ? 'error' : 'warning',
      title: `Correction Required: ${recommendation.errorType}`,
      message: notification.message,
      data: {
        recommendationId: recommendation.id,
        severity: recommendation.severity,
        actionRequired: notification.actionRequired,
      },
      channels: ['dashboard', 'email'],
      priority: recommendation.severity === 'critical' ? 'high' : 'normal',
    });
  }

  /**
   * Get all recommendations (for dashboard)
   */
  getRecommendations(): CorrectionRecommendation[] {
    return [...this.recommendationLog];
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorContext[] {
    return [...this.errorLog];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recommendationsGenerated: number;
  } {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    for (const error of this.errorLog) {
      const type = error.error.name || 'Unknown';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    }

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      errorsBySeverity,
      recommendationsGenerated: this.recommendationLog.length,
    };
  }
}

/**
 * Global singleton instance
 */
export const correctionOrchestrator = new CorrectionOrchestrator();
