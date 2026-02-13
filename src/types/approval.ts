/**
 * Human-in-the-Loop Approval System Type Definitions
 * Provides comprehensive types for approval workflows with manual intervention
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'escalated' | 'cancelled';

export type ApprovalMode = 'any' | 'all' | 'majority' | 'custom';

export type TimeoutAction = 'approve' | 'reject' | 'escalate' | 'cancel';

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'sms' | 'webhook' | 'in-app';

/**
 * Approver definition
 */
export interface Approver {
  id: string;
  email?: string;
  userId?: string;
  name: string;
  role?: string;
  notificationChannels: NotificationChannel[];
}

/**
 * Approval request definition
 */
export interface ApprovalRequest {
  id: string;
  workflowId: string;
  workflowName: string;
  executionId: string;
  nodeId: string;
  nodeName: string;

  // Approval configuration
  approvers: Approver[];
  approvalMode: ApprovalMode;
  customApprovalLogic?: string; // Expression for custom approval logic

  // Status tracking
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;

  // Data to approve
  data: Record<string, unknown>;
  dataPreview?: {
    title: string;
    summary: string;
    fields: Array<{ label: string; value: string; type?: string }>;
  };

  // Timeout configuration
  timeoutMs?: number;
  timeoutAction: TimeoutAction;
  escalationTargets?: Approver[];

  // Notification settings
  notificationChannels: NotificationChannel[];
  notificationTemplate?: string;
  reminderIntervalMs?: number;

  // Responses
  responses: ApprovalResponse[];

  // Additional metadata
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Individual approval response
 */
export interface ApprovalResponse {
  id: string;
  requestId: string;
  approverId: string;
  approverName: string;
  approverEmail?: string;

  decision: 'approve' | 'reject';
  comment?: string;
  timestamp: string;

  // IP and device tracking
  ipAddress?: string;
  userAgent?: string;

  // Delegation
  delegatedFrom?: string;
  delegatedTo?: string;
}

/**
 * Approval configuration for the node
 */
export interface ApprovalNodeConfig {
  // Approvers
  approvers: Approver[];
  approvalMode: ApprovalMode;
  customApprovalLogic?: string;

  // Allow delegation
  allowDelegation?: boolean;
  delegationRules?: {
    maxDepth: number; // How many levels of delegation allowed
    requireNotification: boolean;
  };

  // Auto-approval rules
  autoApprovalRules?: Array<{
    id: string;
    name: string;
    condition: string; // Expression to evaluate
    action: 'approve' | 'reject';
  }>;

  // Timeout
  timeoutMs: number; // Default 24 hours
  timeoutAction: TimeoutAction;
  escalationTargets?: Approver[];

  // Notifications
  notificationChannels: NotificationChannel[];
  notificationTemplate?: string;
  sendReminders: boolean;
  reminderIntervalMs?: number; // Send reminder every X ms

  // Data preview configuration
  dataPreviewConfig?: {
    enabled: boolean;
    title?: string;
    summaryExpression?: string;
    fields?: Array<{
      label: string;
      path: string; // JSONPath to extract value
      type?: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'json';
      format?: string;
    }>;
  };

  // Audit trail
  enableAuditTrail: boolean;
  auditTrailWebhook?: string;

  // Priority
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
}

/**
 * Approval history entry
 */
export interface ApprovalHistoryEntry {
  id: string;
  requestId: string;
  action: 'created' | 'approved' | 'rejected' | 'expired' | 'escalated' | 'cancelled' | 'reminded' | 'delegated';
  userId?: string;
  userName?: string;
  timestamp: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Approval statistics
 */
export interface ApprovalStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  escalated: number;

  averageResponseTimeMs: number;
  medianResponseTimeMs: number;

  byApprover: Record<string, {
    total: number;
    approved: number;
    rejected: number;
    averageResponseTimeMs: number;
  }>;

  byPriority: Record<string, number>;
  byTimeOfDay: Record<string, number>;
}

/**
 * Approval delegation request
 */
export interface ApprovalDelegation {
  id: string;
  requestId: string;
  fromApproverId: string;
  fromApproverName: string;
  toApproverId: string;
  toApproverName: string;
  toApproverEmail: string;
  reason?: string;
  timestamp: string;
  expiresAt?: string;
}

/**
 * Approval notification payload
 */
export interface ApprovalNotification {
  requestId: string;
  approver: Approver;
  type: 'new_request' | 'reminder' | 'escalation' | 'delegation' | 'status_change';
  subject: string;
  body: string;
  data: Record<string, unknown>;
  actionLinks?: {
    approve: string;
    reject: string;
    view: string;
  };
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Approval settings (global)
 */
export interface ApprovalSettings {
  defaultTimeoutMs: number;
  defaultTimeoutAction: TimeoutAction;
  defaultNotificationChannels: NotificationChannel[];
  enableReminders: boolean;
  defaultReminderIntervalMs: number;
  maxDelegationDepth: number;
  allowSelfApproval: boolean;
  requireComments: boolean;
  enableAuditTrail: boolean;
  auditRetentionDays: number;
}

/**
 * Approval filter options
 */
export interface ApprovalFilterOptions {
  status?: ApprovalStatus[];
  approverId?: string;
  workflowId?: string;
  priority?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  tags?: string[];
}

/**
 * Bulk approval operation
 */
export interface BulkApprovalOperation {
  requestIds: string[];
  action: 'approve' | 'reject';
  comment?: string;
  approverId: string;
}

/**
 * Approval metrics
 */
export interface ApprovalMetrics {
  timestamp: string;
  totalRequests: number;
  pendingRequests: number;
  avgResponseTime: number;
  expiredCount: number;
  escalatedCount: number;
  approvalRate: number; // percentage
  rejectionRate: number; // percentage
  timeoutRate: number; // percentage
}

/**
 * Approval webhook payload
 */
export interface ApprovalWebhookPayload {
  event: 'approval.created' | 'approval.approved' | 'approval.rejected' | 'approval.expired' | 'approval.escalated';
  timestamp: string;
  request: ApprovalRequest;
  response?: ApprovalResponse;
}

/**
 * Approval error types
 */
export enum ApprovalErrorCode {
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  ALREADY_RESPONDED = 'ALREADY_RESPONDED',
  REQUEST_EXPIRED = 'REQUEST_EXPIRED',
  INVALID_APPROVER = 'INVALID_APPROVER',
  INVALID_STATUS = 'INVALID_STATUS',
  DELEGATION_NOT_ALLOWED = 'DELEGATION_NOT_ALLOWED',
  MAX_DELEGATION_DEPTH = 'MAX_DELEGATION_DEPTH',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
  TIMEOUT = 'TIMEOUT',
}

export class ApprovalError extends Error {
  constructor(
    public code: ApprovalErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApprovalError';
  }
}
