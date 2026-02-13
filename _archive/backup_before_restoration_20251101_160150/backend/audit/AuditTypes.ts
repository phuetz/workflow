/**
 * Audit Log Types
 * Definitions for enterprise audit logging
 */

export enum AuditAction {
  // Workflow actions
  WORKFLOW_CREATE = 'workflow.create',
  WORKFLOW_UPDATE = 'workflow.update',
  WORKFLOW_DELETE = 'workflow.delete',
  WORKFLOW_EXECUTE = 'workflow.execute',
  WORKFLOW_ACTIVATE = 'workflow.activate',
  WORKFLOW_DEACTIVATE = 'workflow.deactivate',
  WORKFLOW_IMPORT = 'workflow.import',
  WORKFLOW_EXPORT = 'workflow.export',
  WORKFLOW_PROMOTE = 'workflow.promote',
  WORKFLOW_ROLLBACK = 'workflow.rollback',

  // Credential actions
  CREDENTIAL_CREATE = 'credential.create',
  CREDENTIAL_UPDATE = 'credential.update',
  CREDENTIAL_DELETE = 'credential.delete',
  CREDENTIAL_VIEW = 'credential.view',

  // User actions
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_PASSWORD_CHANGE = 'user.password_change',
  USER_ROLE_CHANGE = 'user.role_change',

  // Execution actions
  EXECUTION_START = 'execution.start',
  EXECUTION_SUCCESS = 'execution.success',
  EXECUTION_FAILURE = 'execution.failure',
  EXECUTION_CANCEL = 'execution.cancel',
  EXECUTION_RETRY = 'execution.retry',

  // Settings actions
  SETTINGS_UPDATE = 'settings.update',
  SETTINGS_VIEW = 'settings.view',

  // Integration actions
  INTEGRATION_ADD = 'integration.add',
  INTEGRATION_REMOVE = 'integration.remove',
  INTEGRATION_UPDATE = 'integration.update',

  // Environment actions
  ENVIRONMENT_CREATE = 'environment.create',
  ENVIRONMENT_UPDATE = 'environment.update',
  ENVIRONMENT_DELETE = 'environment.delete',
  ENVIRONMENT_SWITCH = 'environment.switch',
  ENVIRONMENT_SYNC = 'environment.sync',

  // Queue actions
  QUEUE_PAUSE = 'queue.pause',
  QUEUE_RESUME = 'queue.resume',
  QUEUE_CLEAN = 'queue.clean',

  // Security actions
  SECURITY_SSO_LOGIN = 'security.sso_login',
  SECURITY_API_KEY_CREATE = 'security.api_key_create',
  SECURITY_API_KEY_REVOKE = 'security.api_key_revoke',
  SECURITY_PERMISSION_GRANT = 'security.permission_grant',
  SECURITY_PERMISSION_REVOKE = 'security.permission_revoke',
}

export enum AuditCategory {
  WORKFLOW = 'workflow',
  CREDENTIAL = 'credential',
  USER = 'user',
  EXECUTION = 'execution',
  SETTINGS = 'settings',
  INTEGRATION = 'integration',
  ENVIRONMENT = 'environment',
  QUEUE = 'queue',
  SECURITY = 'security',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  userId: string;
  username?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  actions?: AuditAction[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  userIds?: string[];
  resourceTypes?: string[];
  resourceIds?: string[];
  success?: boolean;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalEntries: number;
  byCategory: Record<AuditCategory, number>;
  bySeverity: Record<AuditSeverity, number>;
  byAction: Record<string, number>;
  recentActivity: AuditLogEntry[];
  topUsers: Array<{ userId: string; count: number }>;
  failureRate: number;
}
