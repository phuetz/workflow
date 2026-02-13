export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  roles: Role[];
  permissions: Permission[];
  organizationId: string;
  teamIds: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  isSystemPermission: boolean;
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  settings: OrganizationSettings;
  plan: 'free' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
}

export interface OrganizationSettings {
  ssoEnabled: boolean;
  ssoProvider?: 'google' | 'microsoft' | 'okta' | 'saml';
  ssoConfig?: Record<string, unknown>;
  auditLogging: boolean;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number;
  ipWhitelist: string[];
  mfaRequired: boolean;
  allowedDomains: string[];
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;
  historyCount: number;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  memberIds: string[];
  roles: Role[];
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ResourcePermission {
  resource: string;
  resourceId: string;
  userId: string;
  permissions: string[];
  grantedAt: string;
  grantedBy: string;
  expiresAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: unknown;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  organizationId: string;
}

export interface AccessRequest {
  id: string;
  userId: string;
  requestedPermissions: Permission[];
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  expiresAt?: string;
  createdAt: string;
  organizationId: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  active: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityRule {
  id: string;
  name: string;
  condition: string;
  action: 'allow' | 'deny' | 'require_approval';
  priority: number;
  enabled: boolean;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
  active: boolean;
}

export interface APIKey {
  id: string;
  name: string;
  userId: string;
  key: string;
  permissions: Permission[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  active: boolean;
}

export interface RoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
  conditions?: RoleCondition[];
}

export interface RoleCondition {
  type: 'time_based' | 'location_based' | 'resource_based' | 'approval_based';
  config: Record<string, unknown>;
}

export interface PermissionEvaluation {
  granted: boolean;
  reason: string;
  conditions?: PermissionCondition[];
  evaluatedAt: string;
}

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
  requiresMFA?: boolean;
  requiresPasswordChange?: boolean;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason: string;
  requiredPermissions: Permission[];
  missingPermissions: Permission[];
  context: AuthorizationContext;
}

export interface AuthorizationContext {
  userId: string;
  resource: string;
  action: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  organizationId: string;
}

export interface SystemPermissions {
  // User Management
  USERS_READ: 'users:read';
  USERS_WRITE: 'users:write';
  USERS_DELETE: 'users:delete';
  USERS_INVITE: 'users:invite';
  
  // Role Management
  ROLES_READ: 'roles:read';
  ROLES_WRITE: 'roles:write';
  ROLES_DELETE: 'roles:delete';
  ROLES_ASSIGN: 'roles:assign';
  
  // Organization Management
  ORG_READ: 'organization:read';
  ORG_WRITE: 'organization:write';
  ORG_DELETE: 'organization:delete';
  ORG_SETTINGS: 'organization:settings';
  
  // Workflow Management
  WORKFLOWS_READ: 'workflows:read';
  WORKFLOWS_WRITE: 'workflows:write';
  WORKFLOWS_DELETE: 'workflows:delete';
  WORKFLOWS_EXECUTE: 'workflows:execute';
  WORKFLOWS_SHARE: 'workflows:share';
  
  // Plugin Management
  PLUGINS_READ: 'plugins:read';
  PLUGINS_INSTALL: 'plugins:install';
  PLUGINS_UNINSTALL: 'plugins:uninstall';
  PLUGINS_CONFIGURE: 'plugins:configure';
  
  // Secrets Management
  SECRETS_READ: 'secrets:read';
  SECRETS_WRITE: 'secrets:write';
  SECRETS_DELETE: 'secrets:delete';
  
  // Audit & Monitoring
  AUDIT_READ: 'audit:read';
  MONITORING_READ: 'monitoring:read';
  SYSTEM_ADMIN: 'system:admin';
}

export interface RoleTemplates {
  ADMIN: 'admin';
  EDITOR: 'editor';
  VIEWER: 'viewer';
  DEVELOPER: 'developer';
  ANALYST: 'analyst';
  GUEST: 'guest';
}

export interface PermissionMap {
  [key: string]: {
    resource: string;
    actions: string[];
    description: string;
  };
}