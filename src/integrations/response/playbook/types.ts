/**
 * Playbook Types and Interfaces
 * All type definitions for the Playbook Engine
 *
 * @module playbook/types
 */

/** Severity level for incidents and playbooks */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Approval mode for playbook actions */
export type ApprovalMode = 'auto' | 'manual' | 'escalating';

/** Playbook state enumeration */
export type PlaybookState = 'draft' | 'active' | 'archived' | 'disabled';

/** Action execution status */
export type ActionStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'rolled_back';

/** Event type for trigger conditions */
export type EventType = 'security_alert' | 'performance_alert' | 'data_alert' | 'access_alert' | 'custom';

/**
 * Variable context for expression evaluation
 */
export interface VariableContext {
  [key: string]: unknown;
  event: Record<string, unknown>;
  timestamp: string;
  playbookId: string;
  executionId: string;
  previousActions: Record<string, unknown>;
}

/**
 * Trigger condition definition
 */
export interface TriggerCondition {
  eventType: EventType;
  condition: string;
  threshold?: number;
  timeWindow?: number;
  pattern?: string;
}

/**
 * Action definition with dependencies
 */
export interface PlaybookAction {
  id: string;
  name: string;
  type: 'notification' | 'blocking' | 'remediation' | 'logging' | 'escalation';
  service: string;
  payload: Record<string, unknown>;
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  dependsOn?: string[];
  runInParallel?: boolean;
  rollbackAction?: PlaybookAction;
}

/**
 * Conditional branching rule
 */
export interface ConditionalBranch {
  condition: string;
  actions: PlaybookAction[];
  elseActions?: PlaybookAction[];
}

/**
 * Playbook version information
 */
export interface PlaybookVersion {
  version: number;
  createdAt: string;
  createdBy: string;
  description: string;
  changes: string[];
}

/**
 * Playbook metadata
 */
export interface PlaybookMetadata {
  id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  author: string;
  version: number;
  state: PlaybookState;
  created: string;
  updated: string;
  tags: string[];
  category: string;
}

/**
 * Complete playbook definition
 */
export interface PlaybookDefinition {
  metadata: PlaybookMetadata;
  triggers: TriggerCondition[];
  variables: Record<string, unknown>;
  actions: PlaybookAction[];
  conditionalBranches?: ConditionalBranch[];
  approval?: {
    mode: ApprovalMode;
    requiredApprovers?: string[];
    timeoutMs?: number;
    timeoutAction?: 'auto_approve' | 'cancel' | 'escalate';
  };
  schedule?: {
    immediate: boolean;
    delayed?: number;
    recurring?: string;
  };
  abTesting?: {
    enabled: boolean;
    variants: string[];
    distribution: Record<string, number>;
  };
}

/**
 * Action execution result
 */
export interface ActionExecutionResult {
  actionId: string;
  status: ActionStatus;
  result?: unknown;
  error?: string;
  duration: number;
  timestamp: string;
  retryCount: number;
}

/**
 * Approval record for audit trail
 */
export interface ApprovalRecord {
  id: string;
  approverEmail: string;
  approvedAt: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  escalated: boolean;
}

/**
 * Playbook execution record
 */
export interface ExecutionRecord {
  executionId: string;
  playbookId: string;
  playbookVersion: number;
  triggeredBy: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'failed' | 'rolled_back' | 'cancelled';
  actions: ActionExecutionResult[];
  variables: VariableContext;
  approvals: ApprovalRecord[];
  metrics: {
    totalDuration: number;
    actionsCompleted: number;
    actionsFailed: number;
    effectivenessScore?: number;
  };
}

/**
 * Effectiveness metrics for A/B testing
 */
export interface EffectivenessMetrics {
  playbookId: string;
  variant: string;
  executions: number;
  successRate: number;
  averageDuration: number;
  userSatisfaction: number;
  incidentResolution: number;
}

/**
 * Action handler function type
 */
export type ActionHandler = (
  action: PlaybookAction,
  context: VariableContext
) => Promise<unknown>;
