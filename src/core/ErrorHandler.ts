/**
 * Error Handler System
 * Comprehensive error handling with recovery strategies
 */

import { WorkflowNode } from '../types/workflow';
import { ExecutionResult as CommonExecutionResult, NodeOutputData, ErrorDetails, UnknownRecord } from '../types/common-types';
import { logger } from '../services/SimpleLogger';
import { EventEmitter } from 'events';

// Extended ExecutionResult with additional fields for error handling
export interface ExecutionResult extends CommonExecutionResult<NodeOutputData> {
  output?: NodeOutputData;
  requiresRetry?: boolean;
  skipped?: boolean;
  warning?: string;
  alerted?: boolean;
  errorCode?: string;
  stack?: string;
  fallback?: boolean;
  recovered?: boolean;
  compensated?: boolean;
}

export interface ErrorContext {
  nodeId: string;
  nodeType: string;
  executionId: string;
  workflowId?: string;
  input?: UnknownRecord;
  timestamp: Date;
  environment?: string;
  userId?: string;
}

export interface CompensationStep {
  name: string;
  type: 'rollback' | 'cleanup' | 'notify' | string;
  config?: UnknownRecord;
}

export interface ErrorHandlingStrategy {
  type: 'retry' | 'fallback' | 'compensate' | 'skip' | 'fail' | 'alert' | 'custom';
  config?: {
    maxRetries?: number;
    strategy?: string;
    initialDelay?: number;
    notify?: string;
    handler?: (error: Error, context: ErrorContext) => Promise<ExecutionResult>;
    fallbackValue?: unknown;
    fallbackFunction?: (context: ErrorContext) => Promise<unknown>;
    recoveryStrategy?: string;
    compensationSteps?: CompensationStep[];
    [key: string]: unknown;
  };
}

export interface ErrorClassification {
  category: 'network' | 'auth' | 'validation' | 'timeout' | 'rate-limit' | 'system' | 'business' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
  isRecoverable: boolean;
  suggestedStrategy: ErrorHandlingStrategy;
}

export interface ErrorRecord {
  id: string;
  error: Error;
  context: ErrorContext;
  classification: ErrorClassification;
  strategy: ErrorHandlingStrategy;
  resolution?: {
    resolved: boolean;
    method: string;
    timestamp: Date;
    result?: NodeOutputData;
  };
}

export class ErrorHandler extends EventEmitter {
  private errorHistory: Map<string, ErrorRecord[]> = new Map();
  private errorPatterns: Map<string, ErrorClassification> = new Map();
  private recoveryStrategies: Map<string, (error: Error, context: ErrorContext) => Promise<unknown>> = new Map();

  constructor() {
    super();
    this.initializeErrorPatterns();
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize common error patterns
   */
  private initializeErrorPatterns(): void {
    // Network errors
    this.errorPatterns.set('ECONNREFUSED', {
      category: 'network',
      severity: 'medium',
      isRetryable: true,
      isRecoverable: true,
      suggestedStrategy: { type: 'retry', config: { maxRetries: 5 } }
    });

    this.errorPatterns.set('ETIMEDOUT', {
      category: 'timeout',
      severity: 'medium',
      isRetryable: true,
      isRecoverable: true,
      suggestedStrategy: { type: 'retry', config: { maxRetries: 3, strategy: 'exponential' } }
    });

    // Auth errors
    this.errorPatterns.set('401', {
      category: 'auth',
      severity: 'high',
      isRetryable: false,
      isRecoverable: true,
      suggestedStrategy: { type: 'alert', config: { notify: 'admin' } }
    });

    this.errorPatterns.set('403', {
      category: 'auth',
      severity: 'high',
      isRetryable: false,
      isRecoverable: false,
      suggestedStrategy: { type: 'fail' }
    });

    // Rate limiting
    this.errorPatterns.set('429', {
      category: 'rate-limit',
      severity: 'low',
      isRetryable: true,
      isRecoverable: true,
      suggestedStrategy: { type: 'retry', config: { strategy: 'exponential', initialDelay: 5000 } }
    });

    // Validation errors
    this.errorPatterns.set('VALIDATION_ERROR', {
      category: 'validation',
      severity: 'medium',
      isRetryable: false,
      isRecoverable: false,
      suggestedStrategy: { type: 'fail' }
    });
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Fallback to cached data
    this.recoveryStrategies.set('use-cache', async (error, context) => {
      logger.info(`Using cached data for ${context.nodeId} due to error`);
      // Implement cache retrieval logic
      return { source: 'cache', data: null };
    });

    // Use default value
    this.recoveryStrategies.set('use-default', async (error, context) => {
      logger.info(`Using default value for ${context.nodeId}`);
      return { source: 'default', data: context.input?.defaultValue || null };
    });

    // Skip node
    this.recoveryStrategies.set('skip-node', async (error, context) => {
      logger.warn(`Skipping node ${context.nodeId} due to error`);
      return { skipped: true };
    });

    // Compensating transaction
    this.recoveryStrategies.set('compensate', async (error, context) => {
      logger.info(`Executing compensating transaction for ${context.nodeId}`);
      // Implement compensation logic
      return { compensated: true };
    });
  }

  /**
   * Handle error with context
   */
  async handleError(
    error: Error,
    context: ErrorContext,
    strategy?: ErrorHandlingStrategy
  ): Promise<ExecutionResult> {
    // Classify the error
    const classification = this.classifyError(error);
    
    // Determine strategy
    const finalStrategy = strategy || classification.suggestedStrategy;

    // Create error record
    const errorRecord: ErrorRecord = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      error,
      context,
      classification,
      strategy: finalStrategy
    };

    // Store in history
    this.addToHistory(context.nodeId, errorRecord);

    // Emit error event
    this.emit('error', errorRecord);

    // Execute strategy
    const result = await this.executeStrategy(errorRecord);

    // Update resolution
    errorRecord.resolution = {
      resolved: result.success,
      method: finalStrategy.type,
      timestamp: new Date(),
      result: result.output
    };

    // Emit resolution event
    this.emit('error-resolved', errorRecord);

    return result;
  }

  /**
   * Classify error based on patterns
   */
  private classifyError(error: Error): ErrorClassification {
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code || '';

    // Check known patterns
    for (const [pattern, classification] of Array.from(this.errorPatterns.entries())) {
      if (errorCode === pattern || errorMessage.includes(pattern.toLowerCase())) {
        return classification;
      }
    }

    // Analyze error message for classification
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        category: 'network',
        severity: 'medium',
        isRetryable: true,
        isRecoverable: true,
        suggestedStrategy: { type: 'retry' }
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        category: 'timeout',
        severity: 'medium',
        isRetryable: true,
        isRecoverable: true,
        suggestedStrategy: { type: 'retry', config: { maxRetries: 2 } }
      };
    }

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        category: 'validation',
        severity: 'low',
        isRetryable: false,
        isRecoverable: false,
        suggestedStrategy: { type: 'fail' }
      };
    }

    // Default classification
    return {
      category: 'unknown',
      severity: 'medium',
      isRetryable: false,
      isRecoverable: false,
      suggestedStrategy: { type: 'fail' }
    };
  }

  /**
   * Execute error handling strategy
   */
  private async executeStrategy(errorRecord: ErrorRecord): Promise<ExecutionResult> {
    const { strategy, error, context } = errorRecord;

    switch (strategy.type) {
      case 'retry':
        // Retry logic handled by RetryHandler
        return {
          success: false,
          data: undefined,
          error: {
            message: 'Retry strategy should be handled by RetryHandler',
            code: 'REQUIRES_RETRY'
          },
          requiresRetry: true
        };

      case 'fallback':
        return await this.executeFallback(errorRecord);

      case 'compensate':
        return await this.executeCompensation(errorRecord);

      case 'skip':
        return {
          success: true,
          data: undefined,
          output: undefined,
          skipped: true,
          warning: `Node ${context.nodeId} skipped due to error: ${error.message}`
        };

      case 'alert':
        await this.sendAlert(errorRecord);
        return {
          success: false,
          data: undefined,
          error: {
            message: error.message,
            code: (error as any).code,
            stack: error.stack
          },
          alerted: true
        };

      case 'custom':
        if (strategy.config?.handler) {
          return await strategy.config.handler(error, context);
        }
        return {
          success: false,
          data: undefined,
          error: {
            message: 'No custom handler provided',
            code: 'NO_HANDLER'
          }
        };

      case 'fail':
      default:
        return {
          success: false,
          data: undefined,
          error: {
            message: error.message,
            code: (error as any).code,
            stack: error.stack
          },
          errorCode: (error as any).code,
          stack: error.stack
        };
    }
  }

  /**
   * Execute fallback strategy
   */
  private async executeFallback(errorRecord: ErrorRecord): Promise<ExecutionResult> {
    const { strategy, context } = errorRecord;

    if (strategy.config?.fallbackValue !== undefined) {
      const fallbackData = strategy.config.fallbackValue as NodeOutputData;
      return {
        success: true,
        data: fallbackData,
        output: fallbackData,
        fallback: true,
        warning: 'Using fallback value due to error'
      };
    }

    if (strategy.config?.fallbackFunction) {
      try {
        const result = await strategy.config.fallbackFunction(context);
        const resultData = result as NodeOutputData;
        return {
          success: true,
          data: resultData,
          output: resultData,
          fallback: true
        };
      } catch (fallbackError) {
        return {
          success: false,
          data: undefined,
          error: {
            message: `Fallback failed: ${(fallbackError as Error).message}`,
            code: 'FALLBACK_FAILED'
          }
        };
      }
    }

    // Try recovery strategies
    if (strategy.config?.recoveryStrategy) {
      const recovery = this.recoveryStrategies.get(strategy.config.recoveryStrategy);
      if (recovery) {
        try {
          const result = await recovery(errorRecord.error, context);
          const recoveryData = result as NodeOutputData;
          return {
            success: true,
            data: recoveryData,
            output: recoveryData,
            recovered: true
          };
        } catch (recoveryError) {
          return {
            success: false,
            data: undefined,
            error: {
              message: `Recovery failed: ${(recoveryError as Error).message}`,
              code: 'RECOVERY_FAILED'
            }
          };
        }
      }
    }

    return {
      success: false,
      data: undefined,
      error: {
        message: 'No fallback mechanism available',
        code: 'NO_FALLBACK'
      }
    };
  }

  /**
   * Execute compensation strategy
   */
  private async executeCompensation(errorRecord: ErrorRecord): Promise<ExecutionResult> {
    const { strategy, context } = errorRecord;

    if (strategy.config?.compensationSteps) {
      try {
        const results: unknown[] = [];
        for (const step of strategy.config.compensationSteps) {
          const result = await this.executeCompensationStep(step, context);
          results.push(result);
        }

        const outputData = { compensated: true, steps: results } as NodeOutputData;
        return {
          success: true,
          data: outputData,
          output: outputData,
          compensated: true
        };
      } catch (compensationError) {
        return {
          success: false,
          data: undefined,
          error: {
            message: `Compensation failed: ${(compensationError as Error).message}`,
            code: 'COMPENSATION_FAILED'
          }
        };
      }
    }

    return {
      success: false,
      data: undefined,
      error: {
        message: 'No compensation steps defined',
        code: 'NO_COMPENSATION_STEPS'
      }
    };
  }

  /**
   * Execute a single compensation step
   */
  private async executeCompensationStep(step: CompensationStep, context: ErrorContext): Promise<UnknownRecord> {
    logger.info(`Executing compensation step: ${step.name} for ${context.nodeId}`);

    // Implementation depends on step type
    if (step.type === 'rollback') {
      // Rollback database transaction
      return { type: 'rollback', success: true };
    } else if (step.type === 'cleanup') {
      // Clean up resources
      return { type: 'cleanup', success: true };
    } else if (step.type === 'notify') {
      // Send notification
      return { type: 'notify', success: true };
    }

    return { success: false, error: 'Unknown compensation step type' };
  }

  /**
   * Send alert for error
   */
  private async sendAlert(errorRecord: ErrorRecord): Promise<void> {
    const { error, context, classification } = errorRecord;
    
    const alert = {
      title: `Error in ${context.nodeType} node`,
      severity: classification.severity,
      nodeId: context.nodeId,
      executionId: context.executionId,
      error: error.message,
      timestamp: context.timestamp
    };

    // Send to monitoring system
    logger.error('Alert sent:', alert);
    
    // Emit alert event
    this.emit('alert', alert);
  }

  /**
   * Add error to history
   */
  private addToHistory(nodeId: string, errorRecord: ErrorRecord): void {
    if (!this.errorHistory.has(nodeId)) {
      this.errorHistory.set(nodeId, []);
    }
    
    const history = this.errorHistory.get(nodeId)!;
    history.push(errorRecord);
    
    // Keep only last 100 errors per node
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(nodeId?: string): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    unresolved: number;
    retryable: number;
    recoverable: number;
  } {
    const errors = nodeId
      ? this.errorHistory.get(nodeId) || []
      : Array.from(this.errorHistory.values()).flat();

    const stats = {
      total: errors.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      resolved: 0,
      unresolved: 0,
      retryable: 0,
      recoverable: 0
    };

    for (const error of errors) {
      // By category
      stats.byCategory[error.classification.category] =
        (stats.byCategory[error.classification.category] || 0) + 1;

      // By severity
      stats.bySeverity[error.classification.severity] =
        (stats.bySeverity[error.classification.severity] || 0) + 1;

      // Resolution status
      if (error.resolution?.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }

      // Characteristics
      if (error.classification.isRetryable) stats.retryable++;
      if (error.classification.isRecoverable) stats.recoverable++;
    }

    return stats;
  }

  /**
   * Clear error history
   */
  clearHistory(nodeId?: string): void {
    if (nodeId) {
      this.errorHistory.delete(nodeId);
    } else {
      this.errorHistory.clear();
    }
  }

  /**
   * Register custom error pattern
   */
  registerErrorPattern(pattern: string, classification: ErrorClassification): void {
    this.errorPatterns.set(pattern, classification);
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(
    name: string,
    handler: (error: Error, context: ErrorContext) => Promise<unknown>
  ): void {
    this.recoveryStrategies.set(name, handler);
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();