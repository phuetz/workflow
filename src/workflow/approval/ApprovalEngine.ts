/**
 * Approval Engine - Core Logic for Human-in-the-Loop Workflows
 * Handles approval lifecycle, timeout management, and decision evaluation
 */

import { logger } from '../../services/SimpleLogger';
import {
  ApprovalRequest,
  ApprovalResponse,
  ApprovalStatus,
  ApprovalNodeConfig,
  ApprovalError,
  ApprovalErrorCode,
  ApprovalHistoryEntry,
  ApprovalDelegation,
  Approver,
} from '../../types/approval';

export interface ApprovalEngineOptions {
  enableAutoApproval?: boolean;
  enableDelegation?: boolean;
  enableAuditTrail?: boolean;
  maxConcurrentApprovals?: number;
}

/**
 * Core approval engine that manages approval lifecycle
 */
export class ApprovalEngine {
  private approvalRequests = new Map<string, ApprovalRequest>();
  private approvalHistory = new Map<string, ApprovalHistoryEntry[]>();
  private delegations = new Map<string, ApprovalDelegation[]>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  private options: Required<ApprovalEngineOptions>;

  constructor(options: ApprovalEngineOptions = {}) {
    this.options = {
      enableAutoApproval: options.enableAutoApproval ?? true,
      enableDelegation: options.enableDelegation ?? true,
      enableAuditTrail: options.enableAuditTrail ?? true,
      maxConcurrentApprovals: options.maxConcurrentApprovals ?? 1000,
    };

    logger.info('ApprovalEngine initialized', this.options);
  }

  /**
   * Create a new approval request
   */
  async createApprovalRequest(
    config: ApprovalNodeConfig,
    context: {
      workflowId: string;
      workflowName: string;
      executionId: string;
      nodeId: string;
      nodeName: string;
      data: Record<string, unknown>;
    }
  ): Promise<ApprovalRequest> {
    const startTime = Date.now();

    try {
      // Check max concurrent approvals
      if (this.approvalRequests.size >= this.options.maxConcurrentApprovals) {
        throw new ApprovalError(
          ApprovalErrorCode.TIMEOUT,
          'Maximum concurrent approvals reached',
          { max: this.options.maxConcurrentApprovals }
        );
      }

      // Validate approvers
      if (!config.approvers || config.approvers.length === 0) {
        throw new ApprovalError(
          ApprovalErrorCode.INVALID_APPROVER,
          'At least one approver is required'
        );
      }

      // Check for auto-approval rules
      if (this.options.enableAutoApproval && config.autoApprovalRules) {
        const autoApprovalResult = await this.evaluateAutoApprovalRules(
          config.autoApprovalRules,
          context.data
        );

        if (autoApprovalResult) {
          logger.info('Auto-approval rule matched', {
            rule: autoApprovalResult.rule,
            action: autoApprovalResult.action
          });

          // Create a synthetic approval request that's already resolved
          const request = this.buildApprovalRequest(config, context);
          request.status = autoApprovalResult.action === 'approve' ? 'approved' : 'rejected';

          // Add synthetic response
          request.responses.push({
            id: `auto_${Date.now()}`,
            requestId: request.id,
            approverId: 'system',
            approverName: 'Auto-Approval Rule',
            decision: autoApprovalResult.action,
            comment: `Auto-${autoApprovalResult.action}ed by rule: ${autoApprovalResult.rule}`,
            timestamp: new Date().toISOString(),
          });

          this.addHistoryEntry(request.id, {
            action: autoApprovalResult.action === 'approve' ? 'approved' : 'rejected',
            userId: 'system',
            userName: 'Auto-Approval',
            details: { rule: autoApprovalResult.rule },
          });

          return request;
        }
      }

      // Create the approval request
      const request = this.buildApprovalRequest(config, context);

      // Store the request
      this.approvalRequests.set(request.id, request);

      // Setup timeout if configured
      if (config.timeoutMs && config.timeoutMs > 0) {
        this.setupTimeout(request.id, config.timeoutMs, config.timeoutAction);
      }

      // Add history entry
      this.addHistoryEntry(request.id, {
        action: 'created',
        details: {
          approvers: config.approvers.length,
          mode: config.approvalMode,
          timeout: config.timeoutMs,
        },
      });

      const duration = Date.now() - startTime;
      logger.info('Approval request created', {
        requestId: request.id,
        nodeId: context.nodeId,
        approvers: config.approvers.length,
        duration,
      });

      return request;
    } catch (error) {
      logger.error('Failed to create approval request', error);
      throw error;
    }
  }

  /**
   * Submit an approval response
   */
  async submitResponse(
    requestId: string,
    approverId: string,
    decision: 'approve' | 'reject',
    comment?: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{ request: ApprovalRequest; completed: boolean; finalDecision?: 'approved' | 'rejected' }> {
    const startTime = Date.now();

    try {
      const request = this.approvalRequests.get(requestId);
      if (!request) {
        throw new ApprovalError(
          ApprovalErrorCode.REQUEST_NOT_FOUND,
          `Approval request ${requestId} not found`
        );
      }

      // Check if request is still pending
      if (request.status !== 'pending') {
        throw new ApprovalError(
          ApprovalErrorCode.INVALID_STATUS,
          `Request is not pending (status: ${request.status})`
        );
      }

      // Check if approver is authorized
      const approver = this.findApprover(request, approverId);
      if (!approver) {
        throw new ApprovalError(
          ApprovalErrorCode.INVALID_APPROVER,
          `User ${approverId} is not an authorized approver for this request`
        );
      }

      // Check if approver has already responded
      const existingResponse = request.responses.find(r => r.approverId === approverId);
      if (existingResponse) {
        throw new ApprovalError(
          ApprovalErrorCode.ALREADY_RESPONDED,
          `Approver ${approverId} has already responded`
        );
      }

      // Create response
      const response: ApprovalResponse = {
        id: `response_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        requestId,
        approverId,
        approverName: approver.name,
        approverEmail: approver.email,
        decision,
        comment,
        timestamp: new Date().toISOString(),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };

      // Add response to request
      request.responses.push(response);
      request.updatedAt = new Date().toISOString();

      // Add history entry
      this.addHistoryEntry(requestId, {
        action: decision === 'approve' ? 'approved' : 'rejected',
        userId: approverId,
        userName: approver.name,
        details: { comment, hasMetadata: !!metadata },
        ipAddress: metadata?.ipAddress,
      });

      // Evaluate if approval is complete
      const evaluationResult = this.evaluateApprovalStatus(request);

      let completed = false;
      let finalDecision: 'approved' | 'rejected' | undefined;

      if (evaluationResult.complete) {
        request.status = evaluationResult.decision === 'approved' ? 'approved' : 'rejected';
        completed = true;
        finalDecision = evaluationResult.decision;

        // Clear timeout
        this.clearTimeout(requestId);

        logger.info('Approval request completed', {
          requestId,
          decision: finalDecision,
          totalResponses: request.responses.length,
          duration: Date.now() - startTime,
        });
      }

      const duration = Date.now() - startTime;
      logger.info('Approval response submitted', {
        requestId,
        approverId,
        decision,
        completed,
        duration,
      });

      return { request, completed, finalDecision };
    } catch (error) {
      logger.error('Failed to submit approval response', error);
      throw error;
    }
  }

  /**
   * Delegate approval to another user
   */
  async delegateApproval(
    requestId: string,
    fromApproverId: string,
    toApprover: Approver,
    reason?: string
  ): Promise<ApprovalDelegation> {
    if (!this.options.enableDelegation) {
      throw new ApprovalError(
        ApprovalErrorCode.DELEGATION_NOT_ALLOWED,
        'Delegation is not enabled'
      );
    }

    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new ApprovalError(
        ApprovalErrorCode.REQUEST_NOT_FOUND,
        `Approval request ${requestId} not found`
      );
    }

    // Check delegation depth
    const delegationChain = this.delegations.get(requestId) || [];
    const maxDepth = 3; // Could be configurable
    if (delegationChain.length >= maxDepth) {
      throw new ApprovalError(
        ApprovalErrorCode.MAX_DELEGATION_DEPTH,
        `Maximum delegation depth (${maxDepth}) exceeded`
      );
    }

    const fromApprover = this.findApprover(request, fromApproverId);
    if (!fromApprover) {
      throw new ApprovalError(
        ApprovalErrorCode.INVALID_APPROVER,
        `User ${fromApproverId} is not an authorized approver`
      );
    }

    // Create delegation
    const delegation: ApprovalDelegation = {
      id: `delegation_${Date.now()}`,
      requestId,
      fromApproverId,
      fromApproverName: fromApprover.name,
      toApproverId: toApprover.id,
      toApproverName: toApprover.name,
      toApproverEmail: toApprover.email || '',
      reason,
      timestamp: new Date().toISOString(),
    };

    // Store delegation
    if (!this.delegations.has(requestId)) {
      this.delegations.set(requestId, []);
    }
    this.delegations.get(requestId)!.push(delegation);

    // Add new approver to request
    request.approvers.push(toApprover);

    // Add history entry
    this.addHistoryEntry(requestId, {
      action: 'delegated',
      userId: fromApproverId,
      userName: fromApprover.name,
      details: {
        toApprover: toApprover.name,
        reason,
      },
    });

    logger.info('Approval delegated', {
      requestId,
      from: fromApprover.name,
      to: toApprover.name,
    });

    return delegation;
  }

  /**
   * Cancel an approval request
   */
  async cancelApprovalRequest(requestId: string, reason?: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new ApprovalError(
        ApprovalErrorCode.REQUEST_NOT_FOUND,
        `Approval request ${requestId} not found`
      );
    }

    request.status = 'cancelled';
    request.updatedAt = new Date().toISOString();

    // Clear timeout
    this.clearTimeout(requestId);

    // Add history entry
    this.addHistoryEntry(requestId, {
      action: 'cancelled',
      details: { reason },
    });

    logger.info('Approval request cancelled', { requestId, reason });
  }

  /**
   * Get approval request by ID
   */
  getApprovalRequest(requestId: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(requestId);
  }

  /**
   * Get all approval requests (with optional filter)
   */
  getAllApprovalRequests(filter?: {
    status?: ApprovalStatus;
    approverId?: string;
    workflowId?: string;
  }): ApprovalRequest[] {
    let requests = Array.from(this.approvalRequests.values());

    if (filter?.status) {
      requests = requests.filter(r => r.status === filter.status);
    }

    if (filter?.approverId) {
      requests = requests.filter(r =>
        r.approvers.some(a => a.id === filter.approverId || a.email === filter.approverId)
      );
    }

    if (filter?.workflowId) {
      requests = requests.filter(r => r.workflowId === filter.workflowId);
    }

    return requests;
  }

  /**
   * Get approval history
   */
  getApprovalHistory(requestId: string): ApprovalHistoryEntry[] {
    return this.approvalHistory.get(requestId) || [];
  }

  /**
   * Get delegations for a request
   */
  getDelegations(requestId: string): ApprovalDelegation[] {
    return this.delegations.get(requestId) || [];
  }

  /**
   * Cleanup expired requests
   */
  cleanup(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    let cleaned = 0;

    for (const [id, request] of Array.from(this.approvalRequests.entries())) {
      const createdAt = new Date(request.createdAt).getTime();
      if (createdAt < cutoff && request.status !== 'pending') {
        this.approvalRequests.delete(id);
        this.approvalHistory.delete(id);
        this.delegations.delete(id);
        this.clearTimeout(id);
        cleaned++;
      }
    }

    logger.info('Approval cleanup completed', { cleaned, total: this.approvalRequests.size });
    return cleaned;
  }

  // Private helper methods

  private buildApprovalRequest(
    config: ApprovalNodeConfig,
    context: {
      workflowId: string;
      workflowName: string;
      executionId: string;
      nodeId: string;
      nodeName: string;
      data: Record<string, unknown>;
    }
  ): ApprovalRequest {
    const now = new Date().toISOString();
    const requestId = `approval_${context.executionId}_${context.nodeId}_${Date.now()}`;

    const request: ApprovalRequest = {
      id: requestId,
      workflowId: context.workflowId,
      workflowName: context.workflowName,
      executionId: context.executionId,
      nodeId: context.nodeId,
      nodeName: context.nodeName,
      approvers: [...config.approvers],
      approvalMode: config.approvalMode,
      customApprovalLogic: config.customApprovalLogic,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt: config.timeoutMs ? new Date(Date.now() + config.timeoutMs).toISOString() : undefined,
      data: context.data,
      dataPreview: this.buildDataPreview(config, context.data),
      timeoutMs: config.timeoutMs,
      timeoutAction: config.timeoutAction,
      escalationTargets: config.escalationTargets,
      notificationChannels: config.notificationChannels,
      notificationTemplate: config.notificationTemplate,
      reminderIntervalMs: config.reminderIntervalMs,
      responses: [],
      priority: config.priority,
      tags: config.tags,
    };

    return request;
  }

  private buildDataPreview(
    config: ApprovalNodeConfig,
    data: Record<string, unknown>
  ): ApprovalRequest['dataPreview'] {
    if (!config.dataPreviewConfig?.enabled) {
      return undefined;
    }

    const summaryResult = this.evaluateExpression(config.dataPreviewConfig.summaryExpression, data);
    const preview: NonNullable<ApprovalRequest['dataPreview']> = {
      title: config.dataPreviewConfig.title || 'Approval Request',
      summary: typeof summaryResult === 'string' ? summaryResult : String(summaryResult || ''),
      fields: [],
    };

    if (config.dataPreviewConfig.fields) {
      for (const fieldConfig of config.dataPreviewConfig.fields) {
        const value = this.extractValue(data, fieldConfig.path);
        preview.fields.push({
          label: fieldConfig.label,
          value: this.formatValue(value, fieldConfig.type, fieldConfig.format),
          type: fieldConfig.type,
        });
      }
    }

    return preview;
  }

  private async evaluateAutoApprovalRules(
    rules: NonNullable<ApprovalNodeConfig['autoApprovalRules']>,
    data: Record<string, unknown>
  ): Promise<{ rule: string; action: 'approve' | 'reject' } | null> {
    for (const rule of rules) {
      try {
        const result = this.evaluateExpression(rule.condition, data);
        if (result) {
          return { rule: rule.name, action: rule.action };
        }
      } catch (error) {
        logger.error('Error evaluating auto-approval rule', { rule: rule.name, error });
      }
    }
    return null;
  }

  private evaluateApprovalStatus(request: ApprovalRequest): {
    complete: boolean;
    decision?: 'approved' | 'rejected';
  } {
    const totalApprovers = request.approvers.length;
    const totalResponses = request.responses.length;
    const approvals = request.responses.filter(r => r.decision === 'approve').length;
    const rejections = request.responses.filter(r => r.decision === 'reject').length;

    switch (request.approvalMode) {
      case 'any': {
        // Any single approval is enough
        if (approvals > 0) {
          return { complete: true, decision: 'approved' };
        }
        // All rejected means rejected
        if (rejections === totalApprovers) {
          return { complete: true, decision: 'rejected' };
        }
        break;
      }

      case 'all': {
        // All must approve
        if (approvals === totalApprovers) {
          return { complete: true, decision: 'approved' };
        }
        // Any rejection means rejected
        if (rejections > 0) {
          return { complete: true, decision: 'rejected' };
        }
        break;
      }

      case 'majority': {
        const required = Math.ceil(totalApprovers / 2);
        if (approvals >= required) {
          return { complete: true, decision: 'approved' };
        }
        if (rejections >= required) {
          return { complete: true, decision: 'rejected' };
        }
        break;
      }

      case 'custom': {
        if (request.customApprovalLogic) {
          try {
            const result = this.evaluateExpression(request.customApprovalLogic, {
              totalApprovers,
              totalResponses,
              approvals,
              rejections,
              responses: request.responses,
            });
            if (typeof result === 'object' && result !== null) {
              return result as { complete: boolean; decision?: 'approved' | 'rejected' };
            }
          } catch (error) {
            logger.error('Error evaluating custom approval logic', error);
          }
        }
        break;
      }
    }

    return { complete: false };
  }

  private setupTimeout(requestId: string, timeoutMs: number, action: string): void {
    const timeout = setTimeout(async () => {
      await this.handleTimeout(requestId, action);
    }, timeoutMs);

    this.timeouts.set(requestId, timeout);
  }

  private clearTimeout(requestId: string): void {
    const timeout = this.timeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(requestId);
    }
  }

  private async handleTimeout(requestId: string, action: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      return;
    }

    logger.warn('Approval request timed out', { requestId, action });

    switch (action) {
      case 'approve':
        request.status = 'approved';
        break;
      case 'reject':
        request.status = 'rejected';
        break;
      case 'escalate':
        request.status = 'escalated';
        // Would trigger escalation notification here
        break;
      case 'cancel':
        request.status = 'cancelled';
        break;
      default:
        request.status = 'expired';
    }

    request.updatedAt = new Date().toISOString();

    this.addHistoryEntry(requestId, {
      action: 'expired',
      details: { timeoutAction: action },
    });
  }

  private findApprover(request: ApprovalRequest, approverId: string): Approver | undefined {
    return request.approvers.find(a => a.id === approverId || a.email === approverId);
  }

  private addHistoryEntry(
    requestId: string,
    entry: Omit<ApprovalHistoryEntry, 'id' | 'requestId' | 'timestamp'>
  ): void {
    if (!this.options.enableAuditTrail) {
      return;
    }

    const historyEntry: ApprovalHistoryEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      requestId,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    if (!this.approvalHistory.has(requestId)) {
      this.approvalHistory.set(requestId, []);
    }

    this.approvalHistory.get(requestId)!.push(historyEntry);
  }

  private evaluateExpression(expression: string | undefined, data: Record<string, unknown>): unknown {
    if (!expression) {
      return '';
    }

    // Simple template replacement for now
    // In production, use a proper expression evaluator
    try {
      let result = expression;
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
      }
      return result;
    } catch (error) {
      logger.error('Error evaluating expression', { expression, error });
      return '';
    }
  }

  private extractValue(data: Record<string, unknown>, path: string): unknown {
    // Simple path extraction (e.g., "user.email")
    const parts = path.split('.');
    let value: unknown = data;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private formatValue(value: unknown, type?: string, format?: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'date':
        return new Date(value as string).toLocaleDateString();
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
      case 'number':
        return Number(value).toLocaleString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'json':
        return JSON.stringify(value, null, 2);
      default:
        return String(value);
    }
  }

  /**
   * Shutdown the engine
   */
  shutdown(): void {
    // Clear all timeouts
    for (const timeout of Array.from(this.timeouts.values())) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();

    logger.info('ApprovalEngine shut down', {
      pendingApprovals: this.getAllApprovalRequests({ status: 'pending' }).length,
    });
  }
}
