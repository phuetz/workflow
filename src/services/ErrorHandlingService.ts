/**
 * Advanced Error Handling Service
 * Comprehensive error management, recovery strategies, and fault tolerance
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import { encryptionService } from './EncryptionService';
import type {
  WorkflowError,
  RecoveryStrategy,
  RecoveryContext,
  RecoveryResult,
  RecoveryAttempt,
  CircuitBreaker,
  // CircuitBreakerState, // eslint-disable-line @typescript-eslint/no-unused-vars
  FaultTolerance,
  FaultToleranceConfig,
  HealthCheck,
  HealthStatus,
  ErrorPattern,
  ErrorDashboard,
  ErrorFilters,
  FaultToleranceMetrics,
  ErrorHandlingService as IErrorHandlingService,
  ErrorSeverity,
  ErrorCategory,
  // RecoveryAction, // eslint-disable-line @typescript-eslint/no-unused-vars
  // BackoffStrategy, // eslint-disable-line @typescript-eslint/no-unused-vars
  Bulkhead,
  RateLimiter
} from '../types/errorHandling';

export class ErrorHandlingService extends BaseService implements IErrorHandlingService {
  private errors: Map<string, WorkflowError> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private faultToleranceConfigs: Map<string, FaultTolerance> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private recoveryHistory: Map<string, RecoveryAttempt[]> = new Map();
  private bulkheads: Map<string, Bulkhead> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor() {
    super('ErrorHandlingService', {
      enableRetry: true,
      maxRetries: 3,
      enableCaching: false
    });

    this.initializeErrorHandling();
  }

  private async initializeErrorHandling(): Promise<void> {
    await this.registerBuiltInRecoveryStrategies();
    await this.createDefaultHealthChecks();
    this.startBackgroundTasks();

    logger.info('Error handling service initialized', {
      recoveryStrategies: this.recoveryStrategies.size,
      circuitBreakers: this.circuitBreakers.size,
      healthChecks: this.healthChecks.size
    });
  }

  private async registerBuiltInRecoveryStrategies(): Promise<void> {
    // Network Error Recovery
    const networkRetryStrategy: RecoveryStrategy = {
      id: 'network-retry',
      name: 'Network Retry',
      description: 'Retry network requests with exponential backoff',
      applicable: (error) => error.category === 'network' && error.retryable,
      execute: async (error, context) => {
        const initialDelay = context.config.initialDelay as number;
        const maxDelay = context.config.maxDelay as number;
        const delay = Math.min(
          initialDelay * Math.pow(2, context.attemptNumber - 1),
          maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));

        return {
          success: true,
          action: 'retry',
          message: `Retrying after ${delay}ms delay`,
          nextRetryDelay: delay * 2,
          shouldContinue: true
        };
      },
      config: {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffStrategy: 'exponential',
        conditions: [
          { field: 'category', operator: 'eq', value: 'network' },
          { field: 'retryable', operator: 'eq', value: true }
        ],
        timeout: 60000,
        parallel: false
      },
      priority: 1
    };

    // Rate Limit Recovery
    const rateLimitStrategy: RecoveryStrategy = {
      id: 'rate-limit-backoff',
      name: 'Rate Limit Backoff',
      description: 'Wait and retry when rate limited',
      applicable: (error) => error.category === 'rate_limit',
      execute: async (error, _context) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Extract retry-after header or use default
        const retryAfter = error.context.metadata?.retryAfter as number || 60000;

        await new Promise(resolve => setTimeout(resolve, retryAfter));

        return {
          success: true,
          action: 'wait_and_retry',
          message: `Waiting ${retryAfter}ms for rate limit reset`,
          nextRetryDelay: retryAfter,
          shouldContinue: true
        };
      },
      config: {
        maxAttempts: 3,
        initialDelay: 60000,
        maxDelay: 300000,
        backoffStrategy: 'linear',
        conditions: [
          { field: 'category', operator: 'eq', value: 'rate_limit' }
        ],
        timeout: 600000,
        parallel: false
      },
      priority: 2
    };

    // Authentication Error Recovery
    const authRefreshStrategy: RecoveryStrategy = {
      id: 'auth-refresh',
      name: 'Authentication Refresh',
      description: 'Refresh expired credentials and retry',
      applicable: (error) => error.category === 'authentication' && error.code === 'TOKEN_EXPIRED',
      execute: async (error, context) => {
        try {
          // Mock credential refresh - in production would call actual refresh endpoint
          await new Promise(resolve => setTimeout(resolve, 1000));

          return {
            success: true,
            action: 'refresh_credentials',
            message: 'Credentials refreshed successfully',
            shouldContinue: true,
            modifiedContext: {
              variables: new Map([...Array.from(context.variables), ['credentials_refreshed', true]])
            }
          };
        } catch (_refreshError) { // eslint-disable-line @typescript-eslint/no-unused-vars
          return {
            success: false,
            action: 'escalate',
            message: 'Failed to refresh credentials',
            shouldContinue: false,
            newError: {
              ...error,
              message: 'Credential refresh failed',
              code: 'REFRESH_FAILED'
            }
          };
        }
      },
      config: {
        maxAttempts: 2,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffStrategy: 'fixed',
        conditions: [
          { field: 'category', operator: 'eq', value: 'authentication' },
          { field: 'code', operator: 'eq', value: 'TOKEN_EXPIRED' }
        ],
        timeout: 30000,
        parallel: false
      },
      priority: 3
    };

    // Fallback Data Strategy
    const fallbackDataStrategy: RecoveryStrategy = {
      id: 'fallback-data',
      name: 'Fallback Data',
      description: 'Use cached or default data when primary source fails',
      applicable: (error) => error.category === 'external_service' || error.category === 'network',
      execute: async (error, context) => {
        // Try to get cached data
        const cachedData = context.variables.get('cachedData');
        const defaultData = context.variables.get('defaultData');

        if (cachedData || defaultData) {
          return {
            success: true,
            action: 'use_cached_data',
            message: 'Using fallback data',
            data: cachedData || defaultData,
            shouldContinue: true,
            recommendations: ['Check primary data source', 'Update cache if needed']
          };
        }

        return {
          success: false,
          action: 'skip_node',
          message: 'No fallback data available',
          shouldContinue: true
        };
      },
      config: {
        maxAttempts: 1,
        initialDelay: 0,
        maxDelay: 0,
        backoffStrategy: 'fixed',
        conditions: [
          { field: 'category', operator: 'in', value: ['external_service', 'network'] }
        ],
        timeout: 5000,
        parallel: true
      },
      priority: 4
    };

    // Graceful Degradation Strategy
    const gracefulDegradationStrategy: RecoveryStrategy = {
      id: 'graceful-degradation',
      name: 'Graceful Degradation',
      description: 'Continue with reduced functionality',
      applicable: (error) => error.severity !== 'critical' && error.severity !== 'fatal',
      execute: async (_error, _context) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        return {
          success: true,
          action: 'fail_gracefully',
          message: 'Continuing with reduced functionality',
          shouldContinue: true,
          recommendations: [
            'Monitor system health',
            'Address underlying issue when possible',
            'Consider alternative approaches'
          ]
        };
      },
      config: {
        maxAttempts: 1,
        initialDelay: 0,
        maxDelay: 0,
        backoffStrategy: 'fixed',
        conditions: [
          { field: 'severity', operator: 'nin', value: ['critical', 'fatal'] }
        ],
        skipConditions: [
          { field: 'userActionRequired', operator: 'eq', value: true }
        ],
        timeout: 1000,
        parallel: true
      },
      priority: 10 // Low priority - last resort
    };

    await Promise.all([
      this.registerRecoveryStrategy(networkRetryStrategy),
      this.registerRecoveryStrategy(rateLimitStrategy),
      this.registerRecoveryStrategy(authRefreshStrategy),
      this.registerRecoveryStrategy(fallbackDataStrategy),
      this.registerRecoveryStrategy(gracefulDegradationStrategy)
    ]);
  }

  private async createDefaultHealthChecks(): Promise<void> {
    const systemHealthCheck: HealthCheck = {
      id: 'system-health',
      name: 'System Health',
      interval: 30000, // 30 seconds
      timeout: 5000,
      retries: 3,
      status: 'unknown',
      lastCheck: new Date(),
      consecutiveFailures: 0,
      metrics: {
        uptime: 0,
        availability: 100,
        averageResponseTime: 0,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0
      }
    };

    this.healthChecks.set(systemHealthCheck.id, systemHealthCheck);
  }

  private startBackgroundTasks(): void {
    // Health check monitoring
    setInterval(() => {
      this.performAllHealthChecks();
    }, 30000); // Every 30 seconds

    // Circuit breaker state management
    setInterval(() => {
      this.updateCircuitBreakerStates();
    }, 10000); // Every 10 seconds

    // Error pattern detection
    setInterval(() => {
      this.detectErrorPatterns();
    }, 300000); // Every 5 minutes

    // Cleanup old errors
    setInterval(() => {
      this.cleanupOldErrors();
    }, 3600000); // Every hour
  }

  private async performAllHealthChecks(): Promise<void> {
    for (const [id, _healthCheck] of Array.from(this.healthChecks.entries())) { // eslint-disable-line @typescript-eslint/no-unused-vars
      try {
        await this.performHealthCheck(id);
      } catch (error) {
        logger.error('Health check failed', { healthCheckId: id, error });
      }
    }
  }

  private updateCircuitBreakerStates(): void {
    for (const [id, breaker] of Array.from(this.circuitBreakers.entries())) {
      if (breaker.state === 'open' && breaker.config.automaticTransitionFromOpenToHalfOpenEnabled) {
        const timeSinceStateChange = Date.now() - breaker.lastStateChange.getTime();

        if (timeSinceStateChange >= breaker.config.waitDurationInOpenState) {
          breaker.state = 'half_open';
          breaker.lastStateChange = new Date();

          logger.info('Circuit breaker transitioned to half-open', { breakerId: id });
        }
      }
    }
  }

  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [id, error] of Array.from(this.errors.entries())) {
      if (error.timestamp.getTime() < cutoffTime && error.severity !== 'critical' && error.severity !== 'fatal') {
        this.errors.delete(id);
        this.recoveryHistory.delete(id);
      }
    }
  }

  /**
   * Log a workflow error
   */
  public async logError(error: WorkflowError): Promise<void> {
    await this.executeOperation('logError', async () => {
      // Encrypt sensitive data in error context
      if (error.context.inputData || error.context.variables) {
        const encryptedData = await encryptionService.encryptData(
          JSON.stringify({
            inputData: error.context.inputData,
            variables: error.context.variables
          }),
          'logs'
        );

        error.context.metadata = {
          ...error.context.metadata,
          encryptedData
        };

        // Remove sensitive data from plain context
        delete error.context.inputData;
        delete error.context.variables;
      }

      this.errors.set(error.id, error);

      // Update circuit breaker if applicable
      await this.updateCircuitBreakerForError(error);

      // Try automatic recovery if error is recoverable
      if (error.recoverable) {
        setImmediate(() => this.executeRecovery(error));
      }

      logger.error('Workflow error logged', {
        errorId: error.id,
        code: error.code,
        severity: error.severity,
        category: error.category,
        workflowId: error.workflowId,
        nodeId: error.nodeId
      });
    });
  }

  private async updateCircuitBreakerForError(error: WorkflowError): Promise<void> {
    // Find applicable circuit breakers
    for (const [id, breaker] of Array.from(this.circuitBreakers.entries())) {
      if (this.isCircuitBreakerApplicable(breaker, error)) {
        await this.recordCircuitBreakerCall(id, false, 0);
      }
    }
  }

  private isCircuitBreakerApplicable(breaker: CircuitBreaker, error: WorkflowError): boolean {
    // Check if circuit breaker applies to this error
    if (breaker.serviceUrl && error.context.metadata?.url) {
      return error.context.metadata.url.toString().includes(breaker.serviceUrl);
    }

    if (breaker.nodeType && error.nodeId) {
      return error.context.metadata?.nodeType === breaker.nodeType;
    }

    return false;
  }

  /**
   * Get a specific error by ID
   */
  public async getError(errorId: string): Promise<WorkflowError | null> {
    const error = this.errors.get(errorId);

    if (error && error.context.metadata?.encryptedData) {
      // Decrypt sensitive data
      try {
        const decryptedData = await encryptionService.decryptData(
          error.context.metadata.encryptedData as any
        );
        const parsedData = JSON.parse(decryptedData.data);
        error.context.inputData = parsedData.inputData;
        error.context.variables = parsedData.variables;
      } catch (decryptError) {
        logger.warn('Failed to decrypt error context data', { errorId, decryptError });
      }
    }

    return error || null;
  }

  /**
   * Get errors with filters
   */
  public async getErrors(filters: ErrorFilters): Promise<WorkflowError[]> {
    let errors = Array.from(this.errors.values());

    // Apply filters
    if (filters.workflowId) {
      errors = errors.filter(e => e.workflowId === filters.workflowId);
    }

    if (filters.executionId) {
      errors = errors.filter(e => e.executionId === filters.executionId);
    }

    if (filters.nodeId) {
      errors = errors.filter(e => e.nodeId === filters.nodeId);
    }

    if (filters.severity?.length) {
      errors = errors.filter(e => filters.severity!.includes(e.severity));
    }

    if (filters.category?.length) {
      errors = errors.filter(e => filters.category!.includes(e.category));
    }

    if (filters.code?.length) {
      errors = errors.filter(e => filters.code!.includes(e.code));
    }

    if (filters.timeRange) {
      errors = errors.filter(e =>
        e.timestamp >= filters.timeRange!.start &&
        e.timestamp <= filters.timeRange!.end
      );
    }

    if (filters.recoverable !== undefined) {
      errors = errors.filter(e => e.recoverable === filters.recoverable);
    }

    if (filters.retryable !== undefined) {
      errors = errors.filter(e => e.retryable === filters.retryable);
    }

    // Sort by timestamp (newest first)
    errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const start = filters.offset || 0;
    const end = start + (filters.limit || 50);
    return errors.slice(start, end);
  }

  /**
   * Update an error
   */
  public async updateError(errorId: string, updates: Partial<WorkflowError>): Promise<void> {
    await this.executeOperation('updateError', async () => {
      const error = this.errors.get(errorId);
      if (!error) {
        throw new Error(`Error ${errorId} not found`);
      }

      Object.assign(error, updates);
      this.errors.set(errorId, error);

      logger.info('Error updated', { errorId, updates });
    });
  }

  /**
   * Delete an error
   */
  public async deleteError(errorId: string): Promise<void> {
    await this.executeOperation('deleteError', async () => {
      const deleted = this.errors.delete(errorId);
      if (!deleted) {
        throw new Error(`Error ${errorId} not found`);
      }

      this.recoveryHistory.delete(errorId);
      logger.info('Error deleted', { errorId });
    });
  }

  /**
   * Register a recovery strategy
   */
  public async registerRecoveryStrategy(strategy: RecoveryStrategy): Promise<void> {
    await this.executeOperation('registerRecoveryStrategy', async () => {
      this.recoveryStrategies.set(strategy.id, strategy);

      logger.info('Recovery strategy registered', {
        strategyId: strategy.id,
        name: strategy.name,
        priority: strategy.priority
      });
    });
  }

  /**
   * Remove a recovery strategy
   */
  public async removeRecoveryStrategy(strategyId: string): Promise<void> {
    await this.executeOperation('removeRecoveryStrategy', async () => {
      const removed = this.recoveryStrategies.delete(strategyId);
      if (!removed) {
        throw new Error(`Recovery strategy ${strategyId} not found`);
      }

      logger.info('Recovery strategy removed', { strategyId });
    });
  }

  /**
   * Execute recovery for an error
   */
  public async executeRecovery(error: WorkflowError): Promise<RecoveryResult> {
    const result = await this.executeOperation('executeRecovery', async () => {
      const applicableStrategies = Array.from(this.recoveryStrategies.values())
        .filter(strategy => strategy.applicable(error))
        .sort((a, b) => a.priority - b.priority);

      if (applicableStrategies.length === 0) {
        const noStrategiesResult: RecoveryResult = {
          success: false,
          action: 'escalate',
          message: 'No applicable recovery strategies found',
          shouldContinue: false
        };
        return noStrategiesResult;
      }

      const history = this.recoveryHistory.get(error.id) || [];
      for (const strategy of applicableStrategies) {
        const strategyAttempts = history.filter(a => a.strategyId === strategy.id);

        if (strategyAttempts.length >= strategy.config.maxAttempts) {
          continue; // Strategy exhausted
        }

        const context: RecoveryContext = {
          workflowId: error.workflowId,
          executionId: error.executionId,
          nodeId: error.nodeId,
          attemptNumber: strategyAttempts.length + 1,
          previousAttempts: strategyAttempts,
          variables: new Map(),
          config: strategy.config as unknown as Record<string, unknown>,
          environment: error.context.environment
        };

        try {
          const startTime = Date.now();
          const result = await Promise.race([
            strategy.execute(error, context),
            new Promise<RecoveryResult>((_, reject) =>
              setTimeout(() => reject(new Error('Recovery timeout')), strategy.config.timeout)
            )
          ]);

          const duration = Date.now() - startTime;

          const attempt: RecoveryAttempt = {
            strategyId: strategy.id,
            attemptNumber: context.attemptNumber,
            timestamp: new Date(),
            result,
            duration
          };

          history.push(attempt);
          this.recoveryHistory.set(error.id, history);

          logger.info('Recovery strategy executed', {
            errorId: error.id,
            strategyId: strategy.id,
            success: result.success,
            action: result.action,
            duration
          });

          if (result.success || !result.shouldContinue) {
            return result;
          }

        } catch (recoveryError) {
          const attempt: RecoveryAttempt = {
            strategyId: strategy.id,
            attemptNumber: context.attemptNumber,
            timestamp: new Date(),
            result: {
              success: false,
              action: 'escalate',
              message: `Recovery strategy failed: ${recoveryError}`,
              shouldContinue: false
            },
            duration: Date.now() - Date.now(),
            error: {
              ...error,
              message: `Recovery failed: ${recoveryError}`,
              cause: error
            }
          };

          history.push(attempt);
          this.recoveryHistory.set(error.id, history);

          logger.error('Recovery strategy failed', {
            errorId: error.id,
            strategyId: strategy.id,
            error: recoveryError
          });
        }
      }

      const exhaustedResult: RecoveryResult = {
        success: false,
        action: 'escalate',
        message: 'All recovery strategies exhausted',
        shouldContinue: false
      };
      return exhaustedResult;
    });
    return result.data;
  }

  /**
   * Get recovery history for an error
   */
  public async getRecoveryHistory(errorId: string): Promise<RecoveryAttempt[]> {
    return this.recoveryHistory.get(errorId) || [];
  }

  /**
   * Create a circuit breaker
   */
  public async createCircuitBreaker(config: Omit<CircuitBreaker, 'id' | 'metrics' | 'lastStateChange'>): Promise<CircuitBreaker> {
    const result = await this.executeOperation('createCircuitBreaker', async () => {
      const id = `cb_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const circuitBreaker: CircuitBreaker = {
        ...config,
        id,
        metrics: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          consecutiveFailures: 0,
          averageResponseTime: 0
        },
        lastStateChange: new Date()
      };

      this.circuitBreakers.set(id, circuitBreaker);

      logger.info('Circuit breaker created', {
        breakerId: id,
        name: circuitBreaker.name,
        threshold: circuitBreaker.failureThreshold
      });

      return circuitBreaker;
    });
    return result.data;
  }

  /**
   * Check if circuit breaker allows calls
   */
  public async checkCircuitBreaker(breakerId: string): Promise<boolean> {
    const breaker = this.circuitBreakers.get(breakerId);
    if (!breaker || !breaker.config.enabled) {
      return true; // Allow if breaker doesn't exist or is disabled
    }

    switch (breaker.state) {
      case 'closed':
        return true;

      case 'open': {
        const timeSinceOpen = Date.now() - breaker.lastStateChange.getTime();
        if (timeSinceOpen >= breaker.timeout) {
          breaker.state = 'half_open';
          breaker.lastStateChange = new Date();
          return true;
        }
        return false;
      }

      case 'half_open':
        // Allow limited calls to test if service has recovered
        return breaker.metrics.totalCalls < breaker.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Record a circuit breaker call result
   */
  public async recordCircuitBreakerCall(breakerId: string, success: boolean, duration: number): Promise<void> {
    await this.executeOperation('recordCircuitBreakerCall', async () => {
      const breaker = this.circuitBreakers.get(breakerId);
      if (!breaker) return;

      breaker.metrics.totalCalls++;

      if (success) {
        breaker.metrics.successfulCalls++;
        breaker.metrics.consecutiveFailures = 0;
        breaker.metrics.lastSuccessTime = new Date();

        // Update average response time
        breaker.metrics.averageResponseTime =
          (breaker.metrics.averageResponseTime * (breaker.metrics.totalCalls - 1) + duration) /
          breaker.metrics.totalCalls;

        // If in half-open state and enough successful calls, close the circuit
        if (breaker.state === 'half_open' &&
            breaker.metrics.successfulCalls >= breaker.successThreshold) {
          breaker.state = 'closed';
          breaker.lastStateChange = new Date();
          logger.info('Circuit breaker closed after recovery', { breakerId });
        }

      } else {
        breaker.metrics.failedCalls++;
        breaker.metrics.consecutiveFailures++;
        breaker.metrics.lastFailureTime = new Date();

        // Check if we should open the circuit
        if ((breaker.state === 'closed' || breaker.state === 'half_open') &&
            breaker.metrics.consecutiveFailures >= breaker.failureThreshold) {
          breaker.state = 'open';
          breaker.lastStateChange = new Date();
          logger.warn('Circuit breaker opened due to failures', {
            breakerId,
            consecutiveFailures: breaker.metrics.consecutiveFailures
          });
        }
      }
    });
  }

  /**
   * Perform a health check
   */
  public async performHealthCheck(healthCheckId: string): Promise<HealthStatus> {
    const result = await this.executeOperation('performHealthCheck', async () => {
      const healthCheck = this.healthChecks.get(healthCheckId);
      if (!healthCheck) {
        throw new Error(`Health check ${healthCheckId} not found`);
      }

      let status: HealthStatus = 'healthy';
      let success = false;

      try {
        const startTime = Date.now();
        // Simulate health check - in production would make actual HTTP request
        if (healthCheck.url) {
          // Mock HTTP health check
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
          success = Math.random() > 0.1; // 90% success rate for demo
        } else {
          // Mock internal component check
          success = Math.random() > 0.05; // 95% success rate for demo
        }

        const duration = Date.now() - startTime;

        if (success) {
          status = duration > 5000 ? 'degraded' : 'healthy';
          healthCheck.consecutiveFailures = 0;
          healthCheck.lastSuccess = new Date();
          healthCheck.metrics.successfulChecks++;
        } else {
          status = 'unhealthy';
          healthCheck.consecutiveFailures++;
          healthCheck.lastFailure = new Date();
          healthCheck.metrics.failedChecks++;
        }

        // Update metrics
        healthCheck.metrics.totalChecks++;
        healthCheck.metrics.averageResponseTime =
          (healthCheck.metrics.averageResponseTime * (healthCheck.metrics.totalChecks - 1) + duration) /
          healthCheck.metrics.totalChecks;

        healthCheck.metrics.availability =
          (healthCheck.metrics.successfulChecks / healthCheck.metrics.totalChecks) * 100;

      } catch (error) {
        status = 'unhealthy';
        healthCheck.consecutiveFailures++;
        healthCheck.lastFailure = new Date();
        healthCheck.metrics.failedChecks++;

        logger.error('Health check failed', { healthCheckId, error });
      }

      healthCheck.status = status;
      healthCheck.lastCheck = new Date();

      return status;
    });
    return result.data;
  }

  /**
   * Get overall system health
   */
  public async getSystemHealth(): Promise<{ overall: HealthStatus; components: Record<string, HealthStatus> }> {
    const components: Record<string, HealthStatus> = {};
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;

    for (const [id, healthCheck] of Array.from(this.healthChecks.entries())) {
      components[id] = healthCheck.status;

      switch (healthCheck.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'degraded':
          degradedCount++;
          break;
        case 'unhealthy':
          unhealthyCount++;
          break;
      }
    }

    let overall: HealthStatus;
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else if (healthyCount > 0) {
      overall = 'healthy';
    } else {
      overall = 'unknown';
    }

    return { overall, components };
  }

  /**
   * Detect error patterns
   */
  public async detectErrorPatterns(): Promise<ErrorPattern[]> {
    const result = await this.executeOperation('detectErrorPatterns', async () => {
      const patterns: ErrorPattern[] = [];
      const errors = Array.from(this.errors.values());

      // Group errors by code and category
      const errorGroups = new Map<string, WorkflowError[]>();
      errors.forEach(error => {
        const key = `${error.code}-${error.category}`;
        const group = errorGroups.get(key) || [];
        group.push(error);
        errorGroups.set(key, group);
      });

      // Identify patterns (groups with multiple occurrences)
      errorGroups.forEach((groupErrors, key) => {
        if (groupErrors.length >= 3) { // At least 3 occurrences to be a pattern
          const [code, category] = key.split('-');
          const latestError = groupErrors[groupErrors.length - 1];
          const frequency = groupErrors.length;

          const pattern: ErrorPattern = {
            id: `pattern-${key}-${Date.now()}`,
            name: `${code} Pattern`,
            description: `Recurring ${category} error: ${code}`,
            conditions: [
              { field: 'code', operator: 'eq', value: code },
              { field: 'category', operator: 'eq', value: category }
            ],
            commonCauses: this.analyzeCommonCauses(groupErrors),
            recommendedActions: this.generateRecommendedActions(category as ErrorCategory, code),
            preventionTips: this.generatePreventionTips(category as ErrorCategory),
            severity: latestError.severity,
            frequency,
            lastSeen: latestError.timestamp,
            examples: groupErrors.slice(0, 3) // Keep first 3 as examples
          };

          patterns.push(pattern);
          this.errorPatterns.set(pattern.id, pattern);
        }
      });

      logger.info('Error patterns detected', { patternCount: patterns.length });
      return patterns;
    });
    return result.data;
  }

  private analyzeCommonCauses(errors: WorkflowError[]): string[] {
    const causes = new Set<string>();

    errors.forEach(error => {
      switch (error.category) {
        case 'network':
          causes.add('Network connectivity issues');
          causes.add('DNS resolution problems');
          causes.add('Firewall blocking requests');
          break;
        case 'authentication':
          causes.add('Expired credentials');
          causes.add('Invalid API keys');
          causes.add('Insufficient permissions');
          break;
        case 'rate_limit':
          causes.add('Exceeding API rate limits');
          causes.add('Too many concurrent requests');
          break;
        case 'timeout':
          causes.add('Slow external service response');
          causes.add('Network latency');
          causes.add('Large data processing');
          break;
        default:
          causes.add('Unknown cause');
      }
    });

    return Array.from(causes);
  }

  private generateRecommendedActions(category: ErrorCategory, _code: string): string[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    const actions: string[] = [];

    switch (category) {
      case 'network':
        actions.push('Check network connectivity');
        actions.push('Verify DNS settings');
        actions.push('Test with different network');
        break;
      case 'authentication':
        actions.push('Refresh credentials');
        actions.push('Verify API key validity');
        actions.push('Check permission settings');
        break;
      case 'rate_limit':
        actions.push('Implement exponential backoff');
        actions.push('Reduce request frequency');
        actions.push('Use batch operations');
        break;
      case 'timeout':
        actions.push('Increase timeout values');
        actions.push('Optimize data processing');
        actions.push('Implement pagination');
        break;
      default:
        actions.push('Review error logs');
        actions.push('Contact support if persistent');
    }

    return actions;
  }

  private generatePreventionTips(category: ErrorCategory): string[] {
    const tips: string[] = [];

    switch (category) {
      case 'network':
        tips.push('Use reliable network connections');
        tips.push('Implement retry mechanisms');
        tips.push('Monitor network health');
        break;
      case 'authentication':
        tips.push('Implement automatic token refresh');
        tips.push('Use secure credential storage');
        tips.push('Monitor credential expiration');
        break;
      case 'rate_limit':
        tips.push('Implement rate limiting on client side');
        tips.push('Use exponential backoff');
        tips.push('Monitor API usage');
        break;
      case 'timeout':
        tips.push('Set appropriate timeout values');
        tips.push('Implement circuit breakers');
        tips.push('Use async processing for large operations');
        break;
      default:
        tips.push('Implement comprehensive monitoring');
        tips.push('Use proper error handling');
    }

    return tips;
  }

  /**
   * Get error dashboard data
   */
  public async getErrorDashboard(timeRange: { start: Date; end: Date }): Promise<ErrorDashboard> {
    const result = await this.executeOperation('getErrorDashboard', async () => {
      const errors = Array.from(this.errors.values()).filter(e =>
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
      const totalErrors = errors.length;

      // Calculate recovery rate
      const recoverableErrors = errors.filter(e => e.recoverable);
      const recoveredErrors = recoverableErrors.filter(error => {
        const history = this.recoveryHistory.get(error.id) || [];
        return history.some(attempt => attempt.result.success);
      });

      const recoveryRate = recoverableErrors.length > 0 ?
        (recoveredErrors.length / recoverableErrors.length) * 100 : 0;

      // Calculate average resolution time
      const resolvedErrors = errors.filter(error => {
        const history = this.recoveryHistory.get(error.id) || [];
        return history.length > 0;
      });

      const avgResolutionTime = resolvedErrors.length > 0 ?
        resolvedErrors.reduce((sum, error) => {
          const history = this.recoveryHistory.get(error.id) || [];
          const totalDuration = history.reduce((s, h) => s + h.duration, 0);
          return sum + totalDuration;
        }, 0) / resolvedErrors.length : 0;

      // Error rate calculation (errors per hour)
      const timeRangeHours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
      const errorRate = timeRangeHours > 0 ? totalErrors / timeRangeHours : 0;

      const dashboard: ErrorDashboard = {
        timeRange,
        summary: {
          totalErrors,
          errorRate,
          recoveryRate,
          averageResolutionTime: avgResolutionTime,
          criticalErrors: errors.filter(e => e.severity === 'critical' || e.severity === 'fatal').length,
          systemHealth: (await this.getSystemHealth()).overall
        },
        errorsByCategory: this.aggregateByCategory(errors),
        errorsBySeverity: this.aggregateBySeverity(errors),
        topErrors: this.getTopErrors(errors),
        recoveryStrategies: this.getRecoveryStrategyStats(),
        systemComponents: await this.getSystemComponentStats(),
        timeline: this.generateErrorTimeline(errors, timeRange)
      };

      return dashboard;
    });
    return result.data;
  }

  private aggregateByCategory(errors: WorkflowError[]): Record<ErrorCategory, number> {
    const aggregation: Partial<Record<ErrorCategory, number>> = {};

    errors.forEach(error => {
      aggregation[error.category] = (aggregation[error.category] || 0) + 1;
    });

    return aggregation as Record<ErrorCategory, number>;
  }

  private aggregateBySeverity(errors: WorkflowError[]): Record<ErrorSeverity, number> {
    const aggregation: Partial<Record<ErrorSeverity, number>> = {};

    errors.forEach(error => {
      aggregation[error.severity] = (aggregation[error.severity] || 0) + 1;
    });

    return aggregation as Record<ErrorSeverity, number>;
  }

  private getTopErrors(errors: WorkflowError[]): Array<{
    code: string;
    message: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    const errorCounts = new Map<string, { message: string; count: number; category: ErrorCategory }>();

    errors.forEach(error => {
      const existing = errorCounts.get(error.code) || { message: error.message, count: 0, category: error.category };
      existing.count++;
      errorCounts.set(error.code, existing);
    });

    return Array.from(errorCounts.entries())
      .map(([code, data]) => ({
        code,
        message: data.message,
        count: data.count,
        percentage: (data.count / errors.length) * 100,
        trend: 'stable' as const // Would be calculated from historical data
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getRecoveryStrategyStats(): Array<{
    strategyId: string;
    name: string;
    successRate: number;
    averageTime: number;
    usageCount: number;
  }> {
    const stats: Map<string, {
      name: string;
      attempts: number;
      successes: number;
      totalTime: number;
    }> = new Map();

    // Initialize with registered strategies
    this.recoveryStrategies.forEach(strategy => {
      stats.set(strategy.id, {
        name: strategy.name,
        attempts: 0,
        successes: 0,
        totalTime: 0
      });
    });

    // Aggregate from recovery history
    this.recoveryHistory.forEach(history => {
      history.forEach(attempt => {
        const stat = stats.get(attempt.strategyId);
        if (stat) {
          stat.attempts++;
          stat.totalTime += attempt.duration;
          if (attempt.result.success) {
            stat.successes++;
          }
        }
      });
    });

    return Array.from(stats.entries()).map(([strategyId, stat]) => ({
      strategyId,
      name: stat.name,
      successRate: stat.attempts > 0 ? (stat.successes / stat.attempts) * 100 : 0,
      averageTime: stat.attempts > 0 ? stat.totalTime / stat.attempts : 0,
      usageCount: stat.attempts
    }));
  }

  private async getSystemComponentStats(): Promise<Array<{
    name: string;
    status: HealthStatus;
    uptime: number;
    errorCount: number;
  }>> {
    const components: Array<{
      name: string;
      status: HealthStatus;
      uptime: number;
      errorCount: number;
    }> = [];

    for (const [id, healthCheck] of Array.from(this.healthChecks.entries())) {
      const errorCount = Array.from(this.errors.values())
        .filter(error => error.context.metadata?.component === id).length;

      components.push({
        name: healthCheck.name,
        status: healthCheck.status,
        uptime: healthCheck.metrics.availability,
        errorCount
      });
    }

    return components;
  }

  private generateErrorTimeline(
    errors: WorkflowError[],
    timeRange: { start: Date; end: Date }
  ): Array<{
    timestamp: Date;
    errors: number;
    recoveries: number;
    criticalEvents: number;
  }> {
    const timeline: Record<string, {
      errors: number;
      recoveries: number;
      criticalEvents: number;
    }> = {};

    // Initialize timeline with hourly buckets
    const current = new Date(timeRange.start);
    while (current <= timeRange.end) {
      const key = current.toISOString();
      timeline[key] = { errors: 0, recoveries: 0, criticalEvents: 0 };
      current.setHours(current.getHours() + 1);
    }

    // Aggregate errors
    errors.forEach(error => {
      const hourKey = new Date(error.timestamp.getFullYear(), error.timestamp.getMonth(), error.timestamp.getDate(), error.timestamp.getHours()).toISOString();
      if (timeline[hourKey]) {
        timeline[hourKey].errors++;

        if (error.severity === 'critical' || error.severity === 'fatal') {
          timeline[hourKey].criticalEvents++;
        }
      }
    });

    // Aggregate recoveries
    this.recoveryHistory.forEach(history => {
      history.forEach(attempt => {
        const hourKey = new Date(attempt.timestamp.getFullYear(), attempt.timestamp.getMonth(), attempt.timestamp.getDate(), attempt.timestamp.getHours()).toISOString();
        if (attempt.result.success) {
          if (timeline[hourKey]) {
            timeline[hourKey].recoveries++;
          }
        }
      });
    });

    return Object.entries(timeline).map(([timestamp, data]) => ({
      timestamp: new Date(timestamp),
      ...data
    }));
  }

  /**
   * Get metrics for a specific workflow or overall
   */
  public async getMetrics(workflowId?: string): Promise<FaultToleranceMetrics> {
    const errors = workflowId ?
      Array.from(this.errors.values()).filter(e => e.workflowId === workflowId) :
      Array.from(this.errors.values());

    const recoveredErrors = errors.filter(error => {
      const history = this.recoveryHistory.get(error.id) || [];
      return history.some(attempt => attempt.result.success);
    });

    const totalRecoveryTime = recoveredErrors.reduce((sum, error) => {
      const history = this.recoveryHistory.get(error.id) || [];
      return sum + history.reduce((s, h) => s + h.duration, 0);
    }, 0);

    const avgRecoveryTime = recoveredErrors.length > 0 ?
      totalRecoveryTime / recoveredErrors.length : 0;

    const recoverySuccessRate = errors.filter(e => e.recoverable).length > 0 ?
      (recoveredErrors.length / errors.filter(e => e.recoverable).length) * 100 : 0;

    // Get most common errors
    const errorCounts = new Map<string, { count: number; category: ErrorCategory }>();
    errors.forEach(error => {
      const existing = errorCounts.get(error.code) || { count: 0, category: error.category };
      existing.count++;
      errorCounts.set(error.code, existing);
    });

    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([code, data]) => ({ code, count: data.count, category: data.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const systemHealth = await this.getSystemHealth();

    return {
      totalErrors: errors.length,
      recoveredErrors: recoveredErrors.length,
      unrecoveredErrors: errors.length - recoveredErrors.length,
      averageRecoveryTime: avgRecoveryTime,
      recoverySuccessRate,
      mostCommonErrors,
      errorTrends: [], // Would be calculated from historical data
      systemHealth
    };
  }

  /**
   * Export error report as CSV
   */
  public async exportErrorReport(filters: ErrorFilters): Promise<string> {
    const result = await this.executeOperation('exportErrorReport', async () => {
      const errors = await this.getErrors(filters);
      const headers = [
        'ID', 'Code', 'Message', 'Severity', 'Category', 'Timestamp',
        'Workflow ID', 'Execution ID', 'Node ID', 'Recoverable', 'Retryable'
      ];

      const rows = errors.map(error => [
        error.id,
        error.code,
        error.message.replace(/"/g, '""'), // Escape quotes
        error.severity,
        error.category,
        error.timestamp.toISOString(),
        error.workflowId,
        error.executionId,
        error.nodeId || '',
        error.recoverable.toString(),
        error.retryable.toString()
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      return csv;
    });
    return result.data;
  }

  // Additional utility methods for fault tolerance features
  public async enableFaultTolerance(_workflowId: string, _config: FaultToleranceConfig): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Implementation for enabling fault tolerance
  }

  public async disableFaultTolerance(_workflowId: string): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Implementation for disabling fault tolerance
  }

  public async getFaultTolerance(workflowId: string): Promise<FaultTolerance | null> {
    return this.faultToleranceConfigs.get(workflowId) || null;
  }

  public async updateCircuitBreaker(_breakerId: string, _updates: Partial<CircuitBreaker>): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Implementation for updating circuit breaker
  }

  public async getCircuitBreaker(breakerId: string): Promise<CircuitBreaker | null> {
    return this.circuitBreakers.get(breakerId) || null;
  }

  public async createHealthCheck(healthCheck: Omit<HealthCheck, 'id' | 'metrics' | 'lastCheck'>): Promise<HealthCheck> {
    const id = `health_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newHealthCheck: HealthCheck = {
      ...healthCheck,
      id,
      lastCheck: new Date(),
      metrics: {
        uptime: 0,
        availability: 0,
        averageResponseTime: 0,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0
      }
    };

    this.healthChecks.set(id, newHealthCheck);
    return newHealthCheck;
  }

  public async createErrorPattern(pattern: Omit<ErrorPattern, 'id' | 'frequency' | 'lastSeen' | 'examples'>): Promise<ErrorPattern> {
    const id = `pattern_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newPattern: ErrorPattern = {
      ...pattern,
      id,
      frequency: 0,
      lastSeen: new Date(),
      examples: []
    };

    this.errorPatterns.set(id, newPattern);
    return newPattern;
  }
}

// Export singleton instance
export const errorHandlingService = new ErrorHandlingService();
