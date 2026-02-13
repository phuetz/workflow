/**
 * Approval Manager - Manages pending approvals and coordinates with notifications
 * Singleton pattern for global approval state management
 */

import { logger } from '../../services/SimpleLogger';
import { ApprovalEngine } from './ApprovalEngine';
import {
  ApprovalRequest,
  ApprovalResponse,
  ApprovalFilterOptions,
  ApprovalStatistics,
  BulkApprovalOperation,
  ApprovalMetrics,
  Approver,
} from '../../types/approval';

export class ApprovalManager {
  private static instance: ApprovalManager;
  private engine: ApprovalEngine;
  private pendingCallbacks = new Map<string, (result: { approved: boolean; data?: unknown }) => void>();

  private constructor() {
    this.engine = new ApprovalEngine({
      enableAutoApproval: true,
      enableDelegation: true,
      enableAuditTrail: true,
      maxConcurrentApprovals: 1000,
    });

    logger.info('ApprovalManager initialized');
  }

  static getInstance(): ApprovalManager {
    if (!ApprovalManager.instance) {
      ApprovalManager.instance = new ApprovalManager();
    }
    return ApprovalManager.instance;
  }

  /**
   * Get the underlying engine
   */
  getEngine(): ApprovalEngine {
    return this.engine;
  }

  /**
   * Register a callback for when an approval is completed
   */
  registerCallback(requestId: string, callback: (result: { approved: boolean; data?: unknown }) => void): void {
    this.pendingCallbacks.set(requestId, callback);
  }

  /**
   * Submit an approval response and trigger callbacks
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
    const result = await this.engine.submitResponse(requestId, approverId, decision, comment, metadata);

    // If completed, trigger callback
    if (result.completed && result.finalDecision) {
      const callback = this.pendingCallbacks.get(requestId);
      if (callback) {
        callback({
          approved: result.finalDecision === 'approved',
          data: result.request.data,
        });
        this.pendingCallbacks.delete(requestId);
      }
    }

    return result;
  }

  /**
   * Get pending approvals for a specific approver
   */
  getPendingApprovalsForUser(approverId: string): ApprovalRequest[] {
    return this.engine.getAllApprovalRequests({
      status: 'pending',
      approverId,
    });
  }

  /**
   * Get all approvals with filtering
   */
  getApprovals(filter?: ApprovalFilterOptions): ApprovalRequest[] {
    let requests = this.engine.getAllApprovalRequests({
      approverId: filter?.approverId,
      workflowId: filter?.workflowId,
    });

    // Apply additional filters
    if (filter?.status && filter.status.length > 0) {
      requests = requests.filter(r => filter.status!.includes(r.status));
    }

    if (filter?.dateFrom) {
      const fromDate = new Date(filter.dateFrom).getTime();
      requests = requests.filter(r => new Date(r.createdAt).getTime() >= fromDate);
    }

    if (filter?.dateTo) {
      const toDate = new Date(filter.dateTo).getTime();
      requests = requests.filter(r => new Date(r.createdAt).getTime() <= toDate);
    }

    if (filter?.priority && filter.priority.length > 0) {
      requests = requests.filter(r => r.priority && filter.priority!.includes(r.priority));
    }

    if (filter?.tags && filter.tags.length > 0) {
      requests = requests.filter(r =>
        r.tags && r.tags.some(tag => filter.tags!.includes(tag))
      );
    }

    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      requests = requests.filter(r =>
        r.workflowName.toLowerCase().includes(searchLower) ||
        r.nodeName.toLowerCase().includes(searchLower) ||
        (r.dataPreview?.summary || '').toLowerCase().includes(searchLower)
      );
    }

    return requests;
  }

  /**
   * Get approval statistics
   */
  getStatistics(filter?: { approverId?: string; dateFrom?: string; dateTo?: string }): ApprovalStatistics {
    let requests = this.engine.getAllApprovalRequests();

    // Apply filters
    if (filter?.approverId) {
      requests = requests.filter(r =>
        r.approvers.some(a => a.id === filter.approverId || a.email === filter.approverId)
      );
    }

    if (filter?.dateFrom) {
      const fromDate = new Date(filter.dateFrom).getTime();
      requests = requests.filter(r => new Date(r.createdAt).getTime() >= fromDate);
    }

    if (filter?.dateTo) {
      const toDate = new Date(filter.dateTo).getTime();
      requests = requests.filter(r => new Date(r.createdAt).getTime() <= toDate);
    }

    // Calculate statistics
    const stats: ApprovalStatistics = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      expired: requests.filter(r => r.status === 'expired').length,
      escalated: requests.filter(r => r.status === 'escalated').length,
      averageResponseTimeMs: 0,
      medianResponseTimeMs: 0,
      byApprover: {},
      byPriority: {},
      byTimeOfDay: {},
    };

    // Calculate response times
    const responseTimes: number[] = [];
    for (const request of requests) {
      if (request.responses.length > 0) {
        const createdTime = new Date(request.createdAt).getTime();
        const firstResponseTime = new Date(request.responses[0].timestamp).getTime();
        responseTimes.push(firstResponseTime - createdTime);
      }
    }

    if (responseTimes.length > 0) {
      stats.averageResponseTimeMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      responseTimes.sort((a, b) => a - b);
      stats.medianResponseTimeMs = responseTimes[Math.floor(responseTimes.length / 2)];
    }

    // By approver
    const approverStats = new Map<string, { total: number; approved: number; rejected: number; responseTimes: number[] }>();
    for (const request of requests) {
      for (const response of request.responses) {
        if (!approverStats.has(response.approverId)) {
          approverStats.set(response.approverId, { total: 0, approved: 0, rejected: 0, responseTimes: [] });
        }
        const stat = approverStats.get(response.approverId)!;
        stat.total++;
        if (response.decision === 'approve') stat.approved++;
        if (response.decision === 'reject') stat.rejected++;

        const createdTime = new Date(request.createdAt).getTime();
        const responseTime = new Date(response.timestamp).getTime();
        stat.responseTimes.push(responseTime - createdTime);
      }
    }

    for (const [approverId, stat] of Array.from(approverStats.entries())) {
      stats.byApprover[approverId] = {
        total: stat.total,
        approved: stat.approved,
        rejected: stat.rejected,
        averageResponseTimeMs: stat.responseTimes.reduce((a, b) => a + b, 0) / stat.responseTimes.length,
      };
    }

    // By priority
    for (const request of requests) {
      const priority = request.priority || 'medium';
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    }

    // By time of day
    for (const request of requests) {
      const hour = new Date(request.createdAt).getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      stats.byTimeOfDay[timeOfDay] = (stats.byTimeOfDay[timeOfDay] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get approval metrics for monitoring
   */
  getMetrics(): ApprovalMetrics {
    const allRequests = this.engine.getAllApprovalRequests();
    const pendingRequests = allRequests.filter(r => r.status === 'pending');
    const completedRequests = allRequests.filter(r => r.status === 'approved' || r.status === 'rejected');

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    for (const request of completedRequests) {
      if (request.responses.length > 0) {
        const createdTime = new Date(request.createdAt).getTime();
        const lastResponseTime = new Date(request.responses[request.responses.length - 1].timestamp).getTime();
        totalResponseTime += (lastResponseTime - createdTime);
        responseCount++;
      }
    }

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    const approved = allRequests.filter(r => r.status === 'approved').length;
    const rejected = allRequests.filter(r => r.status === 'rejected').length;
    const expired = allRequests.filter(r => r.status === 'expired').length;
    const escalated = allRequests.filter(r => r.status === 'escalated').length;

    const total = allRequests.length;

    return {
      timestamp: new Date().toISOString(),
      totalRequests: total,
      pendingRequests: pendingRequests.length,
      avgResponseTime,
      expiredCount: expired,
      escalatedCount: escalated,
      approvalRate: total > 0 ? (approved / total) * 100 : 0,
      rejectionRate: total > 0 ? (rejected / total) * 100 : 0,
      timeoutRate: total > 0 ? ((expired + escalated) / total) * 100 : 0,
    };
  }

  /**
   * Perform bulk approval operation
   */
  async bulkApprove(operation: BulkApprovalOperation): Promise<{
    successful: string[];
    failed: Array<{ requestId: string; error: string }>;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ requestId: string; error: string }>,
    };

    for (const requestId of operation.requestIds) {
      try {
        await this.engine.submitResponse(
          requestId,
          operation.approverId,
          operation.action,
          operation.comment
        );
        results.successful.push(requestId);
      } catch (error) {
        results.failed.push({
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Bulk approval operation completed', {
      total: operation.requestIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return results;
  }

  /**
   * Delegate approval
   */
  async delegateApproval(
    requestId: string,
    fromApproverId: string,
    toApprover: Approver,
    reason?: string
  ) {
    return this.engine.delegateApproval(requestId, fromApproverId, toApprover, reason);
  }

  /**
   * Cancel approval request
   */
  async cancelApproval(requestId: string, reason?: string): Promise<void> {
    await this.engine.cancelApprovalRequest(requestId, reason);

    // Remove callback if exists
    const callback = this.pendingCallbacks.get(requestId);
    if (callback) {
      callback({ approved: false });
      this.pendingCallbacks.delete(requestId);
    }
  }

  /**
   * Get approval request details
   */
  getApprovalRequest(requestId: string): ApprovalRequest | undefined {
    return this.engine.getApprovalRequest(requestId);
  }

  /**
   * Get approval history
   */
  getApprovalHistory(requestId: string) {
    return this.engine.getApprovalHistory(requestId);
  }

  /**
   * Get delegations
   */
  getDelegations(requestId: string) {
    return this.engine.getDelegations(requestId);
  }

  /**
   * Cleanup old approvals
   */
  cleanup(olderThanMs?: number): number {
    return this.engine.cleanup(olderThanMs);
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.engine.shutdown();
    this.pendingCallbacks.clear();
  }
}

// Export singleton instance
export const approvalManager = ApprovalManager.getInstance();
