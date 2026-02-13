/**
 * Data Subject Rights Handler
 * Implements GDPR data subject rights
 */

import { EventEmitter } from 'events';
import { DataSubjectRequest, DataSubjectRight } from '../../types/compliance';

export class DataSubjectRights extends EventEmitter {
  private requests: Map<string, DataSubjectRequest> = new Map();

  /**
   * Create data subject request
   */
  createRequest(
    userId: string,
    requestType: DataSubjectRight,
    requestedBy: string,
    verificationMethod: string
  ): DataSubjectRequest {
    const request: DataSubjectRequest = {
      id: `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      requestType,
      requestedAt: new Date(),
      requestedBy,
      status: 'pending',
      verificationMethod,
      verified: false,
    };

    this.requests.set(request.id, request);
    this.emit('request:created', { request });

    return request;
  }

  /**
   * Verify request
   */
  verifyRequest(requestId: string): void {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.verified = true;
    request.status = 'in_progress';
    this.emit('request:verified', { request });
  }

  /**
   * Complete request
   */
  completeRequest(
    requestId: string,
    completedBy: string,
    dataExportUrl?: string
  ): void {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.status = 'completed';
    request.completedAt = new Date();
    request.completedBy = completedBy;
    request.dataExportUrl = dataExportUrl;

    this.emit('request:completed', { request });
  }

  /**
   * Reject request
   */
  rejectRequest(requestId: string, reason: string): void {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.status = 'rejected';
    request.rejectionReason = reason;
    this.emit('request:rejected', { request, reason });
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): DataSubjectRequest[] {
    return Array.from(this.requests.values()).filter(
      r => r.status === 'pending' || r.status === 'in_progress'
    );
  }

  /**
   * Get user requests
   */
  getUserRequests(userId: string): DataSubjectRequest[] {
    return Array.from(this.requests.values()).filter(r => r.userId === userId);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    rejected: number;
    byType: Record<DataSubjectRight, number>;
  } {
    const requests = Array.from(this.requests.values());
    const byType: Partial<Record<DataSubjectRight, number>> = {};

    for (const request of requests) {
      byType[request.requestType] = (byType[request.requestType] || 0) + 1;
    }

    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      completed: requests.filter(r => r.status === 'completed').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      byType: byType as Record<DataSubjectRight, number>,
    };
  }
}
