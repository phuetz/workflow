/**
 * Error Workflow Service
 * Handles error workflows, retry logic, and error recovery
 */

import {
  ErrorType,
  ErrorSeverity,
  RetryStrategy,
  RetryPolicy,
  ErrorHandlingConfig,
  WorkflowError,
  ErrorWorkflow,
  ErrorRecovery,
  RecoveryStrategy,
  RecoveryStatus,
  ErrorAlert,
  AlertChannel,
  ErrorStatistics,
  ErrorTriggerCondition,
  CreateErrorWorkflowRequest,
  UpdateErrorWorkflowRequest,
  ErrorQueryFilter,
  RetryExecutionRequest,
  ErrorResolutionRequest,
  ErrorResolution,
  ErrorDashboardMetrics,
} from './ErrorWorkflowTypes';
import { logger } from '../services/LogService';
import { getAuditService } from '../audit/AuditService';
import { AuditAction, AuditCategory, AuditSeverity } from '../audit/AuditTypes';

export class ErrorWorkflowService {
  private errors: Map<string, WorkflowError> = new Map();
  private errorWorkflows: Map<string, ErrorWorkflow> = new Map();
  private recoveries: Map<string, ErrorRecovery> = new Map();
  private alerts: Map<string, ErrorAlert> = new Map();
  private defaultRetryPolicy: RetryPolicy;

  constructor() {
    this.defaultRetryPolicy = {
      enabled: true,
      maxRetries: 3,
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        ErrorType.NETWORK_ERROR,
        ErrorType.TIMEOUT_ERROR,
        ErrorType.RATE_LIMIT_ERROR,
        ErrorType.SERVER_ERROR,
      ],
      nonRetryableErrors: [
        ErrorType.AUTHENTICATION_ERROR,
        ErrorType.AUTHORIZATION_ERROR,
        ErrorType.VALIDATION_ERROR,
        ErrorType.CONFIGURATION_ERROR,
      ],
    };
  }

  /**
   * Log workflow error
   */
  async logError(error: Omit<WorkflowError, 'id' | 'timestamp'>): Promise<WorkflowError> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const workflowError: WorkflowError = {
      ...error,
      id: errorId,
      timestamp: new Date(),
    };

    this.errors.set(errorId, workflowError);

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.EXECUTION_FAILURE,
      category: AuditCategory.EXECUTION,
      severity: this.mapErrorSeverityToAudit(error.severity),
      userId: 'system',
      resourceType: 'workflow-error',
      resourceId: errorId,
      success: false,
      errorMessage: error.message,
      details: {
        errorType: error.type,
        workflowId: error.workflowId,
        nodeId: error.nodeId,
        retryCount: error.retryCount,
      },
    });

    logger.error('Workflow error logged', {
      errorId,
      type: error.type,
      severity: error.severity,
      workflowId: error.workflowId,
      nodeId: error.nodeId,
    });

    // Check if error triggers any error workflows
    await this.triggerErrorWorkflows(workflowError);

    // Create alert if severity is high or critical
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      await this.createAlert(workflowError);
    }

    // Check if error is retryable and create recovery
    if (workflowError.isRetryable && workflowError.retryCount < this.defaultRetryPolicy.maxRetries) {
      await this.createRecovery(workflowError);
    }

    return workflowError;
  }

  /**
   * Get error by ID
   */
  async getError(errorId: string): Promise<WorkflowError | null> {
    return this.errors.get(errorId) || null;
  }

  /**
   * Query errors with filters
   */
  async queryErrors(filter: ErrorQueryFilter = {}): Promise<{
    errors: WorkflowError[];
    total: number;
    hasMore: boolean;
  }> {
    let filtered = Array.from(this.errors.values());

    // Apply filters
    if (filter.startDate) {
      filtered = filtered.filter((e) => e.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      filtered = filtered.filter((e) => e.timestamp <= filter.endDate!);
    }
    if (filter.errorTypes) {
      filtered = filtered.filter((e) => filter.errorTypes!.includes(e.type));
    }
    if (filter.severities) {
      filtered = filtered.filter((e) => filter.severities!.includes(e.severity));
    }
    if (filter.workflowIds) {
      filtered = filtered.filter((e) => filter.workflowIds!.includes(e.workflowId));
    }
    if (filter.nodeTypes) {
      filtered = filtered.filter((e) => filter.nodeTypes!.includes(e.nodeType));
    }
    if (filter.executionIds) {
      filtered = filtered.filter((e) => filter.executionIds!.includes(e.executionId));
    }
    if (filter.isRetryable !== undefined) {
      filtered = filtered.filter((e) => e.isRetryable === filter.isRetryable);
    }
    if (filter.minRetryCount !== undefined) {
      filtered = filtered.filter((e) => e.retryCount >= filter.minRetryCount!);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filtered.length;
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    const errors = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return { errors, total, hasMore };
  }

  /**
   * Create error workflow
   */
  async createErrorWorkflow(
    request: CreateErrorWorkflowRequest,
    userId: string
  ): Promise<ErrorWorkflow> {
    const id = `errwf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorWorkflow: ErrorWorkflow = {
      id,
      name: request.name,
      description: request.description,
      triggerConditions: request.triggerConditions,
      workflowId: request.workflowId,
      enabled: true,
      priority: request.priority || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.errorWorkflows.set(id, errorWorkflow);

    logger.info('Error workflow created', {
      id,
      name: request.name,
      createdBy: userId,
    });

    return errorWorkflow;
  }

  /**
   * Update error workflow
   */
  async updateErrorWorkflow(
    id: string,
    request: UpdateErrorWorkflowRequest,
    userId: string
  ): Promise<ErrorWorkflow> {
    const errorWorkflow = this.errorWorkflows.get(id);
    if (!errorWorkflow) {
      throw new Error(`Error workflow not found: ${id}`);
    }

    if (request.name) errorWorkflow.name = request.name;
    if (request.description !== undefined) errorWorkflow.description = request.description;
    if (request.triggerConditions) errorWorkflow.triggerConditions = request.triggerConditions;
    if (request.workflowId) errorWorkflow.workflowId = request.workflowId;
    if (request.enabled !== undefined) errorWorkflow.enabled = request.enabled;
    if (request.priority !== undefined) errorWorkflow.priority = request.priority;

    errorWorkflow.updatedAt = new Date();
    this.errorWorkflows.set(id, errorWorkflow);

    logger.info('Error workflow updated', {
      id,
      updatedBy: userId,
    });

    return errorWorkflow;
  }

  /**
   * Delete error workflow
   */
  async deleteErrorWorkflow(id: string, userId: string): Promise<void> {
    const errorWorkflow = this.errorWorkflows.get(id);
    if (!errorWorkflow) {
      throw new Error(`Error workflow not found: ${id}`);
    }

    this.errorWorkflows.delete(id);

    logger.info('Error workflow deleted', {
      id,
      deletedBy: userId,
    });
  }

  /**
   * List error workflows
   */
  async listErrorWorkflows(): Promise<ErrorWorkflow[]> {
    return Array.from(this.errorWorkflows.values()).sort(
      (a, b) => b.priority - a.priority
    );
  }

  /**
   * Trigger error workflows based on error
   */
  private async triggerErrorWorkflows(error: WorkflowError): Promise<void> {
    const workflows = Array.from(this.errorWorkflows.values()).filter(
      (wf) => wf.enabled
    );

    for (const workflow of workflows) {
      if (this.matchesTriggerConditions(error, workflow.triggerConditions)) {
        logger.info('Triggering error workflow', {
          errorWorkflowId: workflow.id,
          errorId: error.id,
          workflowId: workflow.workflowId,
        });

        // In production, execute the error handling workflow
        // For now, just log the trigger
      }
    }
  }

  /**
   * Check if error matches trigger conditions
   */
  private matchesTriggerConditions(
    error: WorkflowError,
    conditions: ErrorTriggerCondition[]
  ): boolean {
    if (conditions.length === 0) return false;

    return conditions.some((condition) => {
      // Check error types
      if (condition.errorTypes && !condition.errorTypes.includes(error.type)) {
        return false;
      }

      // Check severities
      if (condition.severities && !condition.severities.includes(error.severity)) {
        return false;
      }

      // Check workflow IDs
      if (condition.workflowIds && !condition.workflowIds.includes(error.workflowId)) {
        return false;
      }

      // Check node types
      if (condition.nodeTypes && !condition.nodeTypes.includes(error.nodeType)) {
        return false;
      }

      // All conditions matched
      return true;
    });
  }

  /**
   * Create error recovery
   */
  private async createRecovery(error: WorkflowError): Promise<ErrorRecovery> {
    const recoveryId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const nextAttemptDelay = this.calculateRetryDelay(
      error.retryCount,
      this.defaultRetryPolicy
    );

    const recovery: ErrorRecovery = {
      id: recoveryId,
      errorId: error.id,
      strategy: RecoveryStrategy.RETRY,
      status: RecoveryStatus.PENDING,
      attempts: 0,
      lastAttempt: undefined,
      nextAttempt: new Date(Date.now() + nextAttemptDelay),
    };

    this.recoveries.set(recoveryId, recovery);

    logger.info('Error recovery created', {
      recoveryId,
      errorId: error.id,
      nextAttempt: recovery.nextAttempt,
    });

    return recovery;
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateRetryDelay(retryCount: number, policy: RetryPolicy): number {
    let delay: number;

    switch (policy.strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = policy.initialDelay * Math.pow(policy.backoffMultiplier || 2, retryCount);
        break;
      case RetryStrategy.LINEAR_BACKOFF:
        delay = policy.initialDelay * (retryCount + 1);
        break;
      case RetryStrategy.FIXED_DELAY:
        delay = policy.initialDelay;
        break;
      case RetryStrategy.IMMEDIATE:
        delay = 0;
        break;
      default:
        delay = policy.initialDelay;
    }

    return Math.min(delay, policy.maxDelay);
  }

  /**
   * Retry execution
   */
  async retryExecution(request: RetryExecutionRequest, userId: string): Promise<ErrorRecovery> {
    const error = this.errors.get(request.errorId);
    if (!error) {
      throw new Error(`Error not found: ${request.errorId}`);
    }

    const recoveryId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const recovery: ErrorRecovery = {
      id: recoveryId,
      errorId: request.errorId,
      strategy: request.strategy || RecoveryStrategy.RETRY,
      status: RecoveryStatus.IN_PROGRESS,
      attempts: 1,
      lastAttempt: new Date(),
    };

    this.recoveries.set(recoveryId, recovery);

    logger.info('Manual retry initiated', {
      recoveryId,
      errorId: request.errorId,
      initiatedBy: userId,
    });

    return recovery;
  }

  /**
   * Create error alert
   */
  private async createAlert(error: WorkflowError): Promise<ErrorAlert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: ErrorAlert = {
      id: alertId,
      errorId: error.id,
      severity: error.severity,
      title: `${error.type}: ${error.nodeName}`,
      message: error.message,
      workflowId: error.workflowId,
      executionId: error.executionId,
      createdAt: new Date(),
      channels: [AlertChannel.IN_APP],
    };

    this.alerts.set(alertId, alert);

    logger.warn('Error alert created', {
      alertId,
      errorId: error.id,
      severity: error.severity,
    });

    return alert;
  }

  /**
   * Get error statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<ErrorStatistics> {
    let errors = Array.from(this.errors.values());

    if (startDate) {
      errors = errors.filter((e) => e.timestamp >= startDate);
    }
    if (endDate) {
      errors = errors.filter((e) => e.timestamp <= endDate);
    }

    const errorsByType: Record<ErrorType, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;
    const workflowErrorCounts = new Map<string, { name: string; count: number }>();
    const nodeErrorCounts = new Map<string, number>();

    errors.forEach((error) => {
      // Count by type
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;

      // Count by severity
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;

      // Count by workflow
      const wfCount = workflowErrorCounts.get(error.workflowId);
      if (wfCount) {
        wfCount.count++;
      } else {
        workflowErrorCounts.set(error.workflowId, {
          name: error.workflowName,
          count: 1,
        });
      }

      // Count by node
      nodeErrorCounts.set(error.nodeType, (nodeErrorCounts.get(error.nodeType) || 0) + 1);
    });

    const recoveries = Array.from(this.recoveries.values());
    const totalRetries = recoveries.reduce((sum, r) => sum + r.attempts, 0);
    const successfulRetries = recoveries.filter((r) => r.status === RecoveryStatus.SUCCEEDED)
      .length;
    const failedRetries = recoveries.filter((r) => r.status === RecoveryStatus.FAILED).length;

    return {
      totalErrors: errors.length,
      errorsByType,
      errorsBySeverity,
      errorsByWorkflow: Array.from(workflowErrorCounts.entries()).map(([workflowId, data]) => ({
        workflowId,
        workflowName: data.name,
        count: data.count,
      })),
      errorsByNode: Array.from(nodeErrorCounts.entries()).map(([nodeType, count]) => ({
        nodeType,
        count,
      })),
      retryStatistics: {
        totalRetries,
        successfulRetries,
        failedRetries,
        averageRetries: recoveries.length > 0 ? totalRetries / recoveries.length : 0,
      },
      timeRange: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
    };
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<ErrorDashboardMetrics> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentErrors = Array.from(this.errors.values())
      .filter((e) => e.timestamp >= oneDayAgo)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const activeErrors = recentErrors.filter(
      (e) => e.severity === ErrorSeverity.HIGH || e.severity === ErrorSeverity.CRITICAL
    ).length;

    const criticalErrors = recentErrors.filter(
      (e) => e.severity === ErrorSeverity.CRITICAL
    ).length;

    const pendingRecoveries = Array.from(this.recoveries.values()).filter(
      (r) => r.status === RecoveryStatus.PENDING || r.status === RecoveryStatus.IN_PROGRESS
    ).length;

    const hourlyErrors = Array.from(this.errors.values()).filter(
      (e) => e.timestamp >= oneHourAgo
    );
    const errorRate = hourlyErrors.length;

    const totalRecoveries = Array.from(this.recoveries.values()).length;
    const successfulRecoveries = Array.from(this.recoveries.values()).filter(
      (r) => r.status === RecoveryStatus.SUCCEEDED
    ).length;
    const recoveryRate = totalRecoveries > 0 ? (successfulRecoveries / totalRecoveries) * 100 : 0;

    // Calculate MTTR (mean time to recovery)
    const recoveredErrors = Array.from(this.recoveries.values()).filter(
      (r) => r.status === RecoveryStatus.SUCCEEDED && r.recoveredAt
    );
    const mttr =
      recoveredErrors.length > 0
        ? recoveredErrors.reduce((sum, r) => {
            const error = this.errors.get(r.errorId);
            if (error && r.recoveredAt) {
              return sum + (r.recoveredAt.getTime() - error.timestamp.getTime());
            }
            return sum;
          }, 0) / recoveredErrors.length / 60000 // convert to minutes
        : 0;

    // Calculate errors from previous hour for trend comparison
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const previousHourErrors = Array.from(this.errors.values()).filter(
      (e) => e.timestamp >= twoHoursAgo && e.timestamp < oneHourAgo
    );

    // Top errors by type with trend calculation
    const errorTypeCounts = new Map<ErrorType, number>();
    hourlyErrors.forEach((e) => {
      errorTypeCounts.set(e.type, (errorTypeCounts.get(e.type) || 0) + 1);
    });

    // Previous hour counts for trend calculation
    const previousErrorTypeCounts = new Map<ErrorType, number>();
    previousHourErrors.forEach((e) => {
      previousErrorTypeCounts.set(e.type, (previousErrorTypeCounts.get(e.type) || 0) + 1);
    });

    const topErrors = Array.from(errorTypeCounts.entries())
      .map(([type, count]) => {
        const previousCount = previousErrorTypeCounts.get(type) || 0;
        let trend: 'up' | 'down' | 'stable';

        if (previousCount === 0 && count > 0) {
          trend = 'up';
        } else if (previousCount > 0 && count === 0) {
          trend = 'down';
        } else if (previousCount > 0) {
          const changePercent = ((count - previousCount) / previousCount) * 100;
          if (changePercent > 10) {
            trend = 'up';
          } else if (changePercent < -10) {
            trend = 'down';
          } else {
            trend = 'stable';
          }
        } else {
          trend = 'stable';
        }

        return { type, count, trend };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      current: {
        activeErrors,
        criticalErrors,
        pendingRecoveries,
      },
      trends: {
        errorRate,
        recoveryRate,
        mttr,
      },
      topErrors,
      recentErrors: recentErrors.slice(0, 10),
    };
  }

  /**
   * Map error severity to audit severity
   */
  private mapErrorSeverityToAudit(severity: ErrorSeverity): AuditSeverity {
    switch (severity) {
      case ErrorSeverity.LOW:
        return AuditSeverity.INFO;
      case ErrorSeverity.MEDIUM:
        return AuditSeverity.WARNING;
      case ErrorSeverity.HIGH:
        return AuditSeverity.ERROR;
      case ErrorSeverity.CRITICAL:
        return AuditSeverity.CRITICAL;
      default:
        return AuditSeverity.INFO;
    }
  }
}

// Singleton instance
let errorWorkflowServiceInstance: ErrorWorkflowService | null = null;

export function getErrorWorkflowService(): ErrorWorkflowService {
  if (!errorWorkflowServiceInstance) {
    errorWorkflowServiceInstance = new ErrorWorkflowService();
    logger.info('Error workflow service initialized');
  }

  return errorWorkflowServiceInstance;
}

export function initializeErrorWorkflowService(): ErrorWorkflowService {
  if (errorWorkflowServiceInstance) {
    logger.warn('Error workflow service already initialized');
    return errorWorkflowServiceInstance;
  }

  errorWorkflowServiceInstance = new ErrorWorkflowService();
  logger.info('Error workflow service initialized');
  return errorWorkflowServiceInstance;
}
