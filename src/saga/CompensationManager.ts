/**
 * Compensation Manager
 * Manages compensation (rollback) logic for failed sagas
 */

import { logger } from '../services/SimpleLogger';
import {
  SagaDefinition,
  CompensationStep,
  SagaContext,
  CompensationExecutor,
} from './types/saga';

/**
 * Compensation Manager Configuration
 */
export interface CompensationManagerConfig {
  /** Default timeout for compensations */
  defaultTimeout: number;

  /** Enable parallel compensations */
  enableParallel: boolean;

  /** Max concurrent compensations */
  maxConcurrent: number;

  /** Enable retry on compensation failure */
  enableRetry: boolean;

  /** Max retry attempts */
  maxRetries: number;
}

/**
 * Compensation Result
 */
export interface CompensationResult {
  /** Step ID */
  stepId: string;

  /** Success flag */
  success: boolean;

  /** Error message */
  error?: string;

  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Compensation Manager Implementation
 */
export class CompensationManager {
  private config: CompensationManagerConfig;
  private compensationExecutors: Map<string, CompensationExecutor> = new Map();

  constructor(config?: Partial<CompensationManagerConfig>) {
    this.config = {
      defaultTimeout: config?.defaultTimeout || 30000,
      enableParallel: config?.enableParallel || false,
      maxConcurrent: config?.maxConcurrent || 5,
      enableRetry: config?.enableRetry !== false,
      maxRetries: config?.maxRetries || 3,
    };
  }

  /**
   * Register a compensation executor
   */
  registerCompensationExecutor(
    action: string,
    executor: CompensationExecutor
  ): void {
    this.compensationExecutors.set(action, executor);
  }

  /**
   * Execute compensations for completed steps
   */
  async compensate(
    saga: SagaDefinition,
    completedSteps: string[],
    context: SagaContext
  ): Promise<CompensationResult[]> {
    // Find compensations for completed steps
    const compensations = saga.compensations.filter((c) =>
      completedSteps.includes(c.forStep)
    );

    if (compensations.length === 0) {
      return [];
    }

    // Execute compensations in reverse order (LIFO)
    const reversedCompensations = [...compensations].reverse();

    if (this.config.enableParallel) {
      return this.executeParallel(reversedCompensations, context);
    } else {
      return this.executeSequential(reversedCompensations, context);
    }
  }

  /**
   * Execute compensations sequentially
   */
  private async executeSequential(
    compensations: CompensationStep[],
    context: SagaContext
  ): Promise<CompensationResult[]> {
    const results: CompensationResult[] = [];

    for (const compensation of compensations) {
      const result = await this.executeCompensation(compensation, context);
      results.push(result);

      // If compensation failed and retry is disabled, continue
      if (!result.success && !this.config.enableRetry) {
        logger.warn(
          `Compensation for step ${compensation.forStep} failed: ${result.error}`
        );
      }
    }

    return results;
  }

  /**
   * Execute compensations in parallel
   */
  private async executeParallel(
    compensations: CompensationStep[],
    context: SagaContext
  ): Promise<CompensationResult[]> {
    const results: CompensationResult[] = [];
    const batches: CompensationStep[][] = [];

    // Split into batches
    for (let i = 0; i < compensations.length; i += this.config.maxConcurrent) {
      batches.push(compensations.slice(i, i + this.config.maxConcurrent));
    }

    // Execute batches
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map((c) => this.executeCompensation(c, context))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute a single compensation
   */
  private async executeCompensation(
    compensation: CompensationStep,
    context: SagaContext
  ): Promise<CompensationResult> {
    const startTime = Date.now();
    const timeout = compensation.timeout || this.config.defaultTimeout;

    try {
      const executor = this.compensationExecutors.get(compensation.action);
      if (!executor) {
        throw new Error(
          `No compensation executor registered for action: ${compensation.action}`
        );
      }

      // Execute with timeout
      await Promise.race([
        executor(compensation, context),
        this.timeoutPromise(
          timeout,
          `Compensation ${compensation.action} timed out`
        ),
      ]);

      return {
        stepId: compensation.forStep,
        success: true,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Retry if enabled
      if (this.config.enableRetry) {
        return this.retryCompensation(compensation, context, startTime);
      }

      return {
        stepId: compensation.forStep,
        success: false,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Retry compensation
   */
  private async retryCompensation(
    compensation: CompensationStep,
    context: SagaContext,
    originalStartTime: number
  ): Promise<CompensationResult> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const executor = this.compensationExecutors.get(compensation.action);
        if (!executor) {
          throw new Error(
            `No compensation executor registered for action: ${compensation.action}`
          );
        }

        const timeout = compensation.timeout || this.config.defaultTimeout;

        await Promise.race([
          executor(compensation, context),
          this.timeoutPromise(
            timeout,
            `Compensation ${compensation.action} timed out`
          ),
        ]);

        return {
          stepId: compensation.forStep,
          success: true,
          durationMs: Date.now() - originalStartTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';

        // Wait before retry
        if (attempt < this.config.maxRetries) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    return {
      stepId: compensation.forStep,
      success: false,
      error: `Failed after ${this.config.maxRetries} retries: ${lastError}`,
      durationMs: Date.now() - originalStartTime,
    };
  }

  /**
   * Timeout promise utility
   */
  private timeoutPromise(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get registered compensation executors
   */
  getRegisteredExecutors(): string[] {
    return Array.from(this.compensationExecutors.keys());
  }
}

/**
 * Global compensation manager instance
 */
export const compensationManager = new CompensationManager();
