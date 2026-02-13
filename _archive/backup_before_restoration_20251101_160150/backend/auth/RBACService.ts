/**
 * Role-Based Access Control (RBAC) Service
 * Complete RBAC implementation with resource-level permissions
 */

import { logger } from '../../services/LoggingService';

// Permission types
export enum Permission {
  // Workflow permissions
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',
  WORKFLOW_SHARE = 'workflow:share',
  WORKFLOW_PUBLISH = 'workflow:publish',
  WORKFLOW_EXPORT = 'workflow:export',
  WORKFLOW_IMPORT = 'workflow:import',

  // Credential permissions
  CREDENTIAL_CREATE = 'credential:create',
  CREDENTIAL_READ = 'credential:read',
  CREDENTIAL_UPDATE = 'credential:update',
  CREDENTIAL_DELETE = 'credential:delete',
  CREDENTIAL_USE = 'credential:use',

  // User management permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',

  // Team/Organization permissions
  TEAM_CREATE = 'team:create',
  TEAM_READ = 'team:read',
  TEAM_UPDATE = 'team:update',
  TEAM_DELETE = 'team:delete',
  TEAM_MANAGE_MEMBERS = 'team:manage_members',

  // API key permissions
  APIKEY_CREATE = 'apikey:create',
  APIKEY_READ = 'apikey:read',
  APIKEY_REVOKE = 'apikey:revoke',

  // Audit log permissions
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',

  // System administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_MONITORING = 'system:monitoring',

  // Billing permissions
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',

  // Webhook permissions
  WEBHOOK_CREATE = 'webhook:create',
  WEBHOOK_READ = 'webhook:read',
  WEBHOOK_UPDATE = 'webhook:update',
  WEBHOOK_DELETE = 'webhook:delete',

  // Execution permissions
  EXECUTION_READ = 'execution:read',
  EXECUTION_RETRY = 'execution:retry',
  EXECUTION_CANCEL = 'execution:cancel'
}

// Predefined roles
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  DEVELOPER = 'developer',
  USER = 'user',
  VIEWER = 'viewer',
  GUEST = 'guest'
}

// Resource types
export enum ResourceType {
  WORKFLOW = 'workflow',
  CREDENTIAL = 'credential',
  USER = 'user',
  TEAM = 'team',
  APIKEY = 'apikey',
  WEBHOOK = 'webhook',
  EXECUTION = 'execution'
}

// Resource ownership
export interface ResourceOwnership {
  resourceType: ResourceType;
  resourceId: string;
  ownerId: string;
  teamId?: string;
  visibility: 'private' | 'team' | 'public';
}

// Permission grant
export interface PermissionGrant {
  id: string;
  userId: string;
  permission: Permission;
  resourceType?: ResourceType;
  resourceId?: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

// Role definition
export interface RoleDefinition {
  role: Role;
  permissions: Permission[];
  description: string;
  inheritsFrom?: Role[];
}

// Access context
export interface AccessContext {
  userId: string;
  roles: Role[];
  teamId?: string;
  teamRoles?: Map<string, Role>; // teamId -> role
  customPermissions: Permission[];
}

export class RBACService {
  private roleDefinitions: Map<Role, RoleDefinition> = new Map();
  private userRoles: Map<string, Set<Role>> = new Map(); // userId -> roles
  private teamRoles: Map<string, Map<string, Role>> = new Map(); // teamId -> (userId -> role)
  private resourceOwnership: Map<string, ResourceOwnership> = new Map(); // resourceId -> ownership
  private permissionGrants: Map<string, PermissionGrant[]> = new Map(); // userId -> grants

  constructor() {
    this.initializeRoles();
    logger.info('RBACService initialized');
  }

  /**
   * Initialize predefined roles with permissions
   */
  private initializeRoles(): void {
    // Super Admin - all permissions
    this.roleDefinitions.set(Role.SUPER_ADMIN, {
      role: Role.SUPER_ADMIN,
      description: 'Super administrator with all permissions',
      permissions: Object.values(Permission)
    });

    // Admin - most permissions except system admin
    this.roleDefinitions.set(Role.ADMIN, {
      role: Role.ADMIN,
      description: 'Administrator with full access to workflows and users',
      permissions: [
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_UPDATE,
        Permission.WORKFLOW_DELETE,
        Permission.WORKFLOW_EXECUTE,
        Permission.WORKFLOW_SHARE,
        Permission.WORKFLOW_PUBLISH,
        Permission.WORKFLOW_EXPORT,
        Permission.WORKFLOW_IMPORT,
        Permission.CREDENTIAL_CREATE,
        Permission.CREDENTIAL_READ,
        Permission.CREDENTIAL_UPDATE,
        Permission.CREDENTIAL_DELETE,
        Permission.CREDENTIAL_USE,
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.USER_INVITE,
        Permission.TEAM_CREATE,
        Permission.TEAM_READ,
        Permission.TEAM_UPDATE,
        Permission.TEAM_DELETE,
        Permission.TEAM_MANAGE_MEMBERS,
        Permission.APIKEY_CREATE,
        Permission.APIKEY_READ,
        Permission.APIKEY_REVOKE,
        Permission.AUDIT_READ,
        Permission.AUDIT_EXPORT,
        Permission.WEBHOOK_CREATE,
        Permission.WEBHOOK_READ,
        Permission.WEBHOOK_UPDATE,
        Permission.WEBHOOK_DELETE,
        Permission.EXECUTION_READ,
        Permission.EXECUTION_RETRY,
        Permission.EXECUTION_CANCEL
      ]
    });

    // Manager - team management and workflow permissions
    this.roleDefinitions.set(Role.MANAGER, {
      role: Role.MANAGER,
      description: 'Manager with team and workflow management permissions',
      permissions: [
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_UPDATE,
        Permission.WORKFLOW_DELETE,
        Permission.WORKFLOW_EXECUTE,
        Permission.WORKFLOW_SHARE,
        Permission.CREDENTIAL_CREATE,
        Permission.CREDENTIAL_READ,
        Permission.CREDENTIAL_UPDATE,
        Permission.CREDENTIAL_USE,
        Permission.USER_READ,
        Permission.USER_INVITE,
        Permission.TEAM_READ,
        Permission.TEAM_UPDATE,
        Permission.TEAM_MANAGE_MEMBERS,
        Permission.WEBHOOK_CREATE,
        Permission.WEBHOOK_READ,
        Permission.WEBHOOK_UPDATE,
        Permission.EXECUTION_READ,
        Permission.EXECUTION_RETRY
      ]
    });

    // Developer - full workflow and credential access
    this.roleDefinitions.set(Role.DEVELOPER, {
      role: Role.DEVELOPER,
      description: 'Developer with workflow and credential management',
      permissions: [
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_UPDATE,
        Permission.WORKFLOW_EXECUTE,
        Permission.WORKFLOW_SHARE,
        Permission.WORKFLOW_EXPORT,
        Permission.CREDENTIAL_CREATE,
        Permission.CREDENTIAL_READ,
        Permission.CREDENTIAL_UPDATE,
        Permission.CREDENTIAL_USE,
        Permission.WEBHOOK_CREATE,
        Permission.WEBHOOK_READ,
        Permission.WEBHOOK_UPDATE,
        Permission.EXECUTION_READ,
        Permission.EXECUTION_RETRY
      ]
    });

    // User - basic workflow access
    this.roleDefinitions.set(Role.USER, {
      role: Role.USER,
      description: 'Regular user with basic workflow access',
      permissions: [
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_UPDATE,
        Permission.WORKFLOW_EXECUTE,
        Permission.CREDENTIAL_READ,
        Permission.CREDENTIAL_USE,
        Permission.EXECUTION_READ
      ]
    });

    // Viewer - read-only access
    this.roleDefinitions.set(Role.VIEWER, {
      role: Role.VIEWER,
      description: 'Viewer with read-only access',
      permissions: [
        Permission.WORKFLOW_READ,
        Permission.CREDENTIAL_READ,
        Permission.EXECUTION_READ
      ]
    });

    // Guest - minimal access
    this.roleDefinitions.set(Role.GUEST, {
      role: Role.GUEST,
      description: 'Guest with minimal access',
      permissions: [
        Permission.WORKFLOW_READ
      ]
    });

    logger.info('RBAC roles initialized', { roleCount: this.roleDefinitions.size });
  }

  /**
   * Assign role to user
   */
  assignRole(userId: string, role: Role): void {
    let roles = this.userRoles.get(userId);
    if (!roles) {
      roles = new Set();
      this.userRoles.set(userId, roles);
    }

    roles.add(role);
    logger.info('Role assigned', { userId, role });
  }

  /**
   * Remove role from user
   */
  removeRole(userId: string, role: Role): void {
    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(role);
      logger.info('Role removed', { userId, role });
    }
  }

  /**
   * Get user roles
   */
  getUserRoles(userId: string): Role[] {
    const roles = this.userRoles.get(userId);
    return roles ? Array.from(roles) : [];
  }

  /**
   * Assign team role to user
   */
  assignTeamRole(userId: string, teamId: string, role: Role): void {
    let teamRoles = this.teamRoles.get(teamId);
    if (!teamRoles) {
      teamRoles = new Map();
      this.teamRoles.set(teamId, teamRoles);
    }

    teamRoles.set(userId, role);
    logger.info('Team role assigned', { userId, teamId, role });
  }

  /**
   * Get user's role in team
   */
  getUserTeamRole(userId: string, teamId: string): Role | null {
    const teamRoles = this.teamRoles.get(teamId);
    return teamRoles?.get(userId) || null;
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, permission: Permission, context?: {
    resourceType?: ResourceType;
    resourceId?: string;
    teamId?: string;
  }): boolean {
    // Get all permissions for user
    const allPermissions = this.getUserPermissions(userId, context?.teamId);

    // Check if user has the permission
    if (allPermissions.has(permission)) {
      // If resource-specific check, verify ownership/access
      if (context?.resourceId && context?.resourceType) {
        return this.hasResourceAccess(userId, context.resourceType, context.resourceId);
      }
      return true;
    }

    // Check custom permission grants
    const grants = this.permissionGrants.get(userId) || [];
    for (const grant of grants) {
      if (grant.permission === permission) {
        // Check if grant is still valid
        if (!grant.expiresAt || grant.expiresAt > new Date()) {
          // Check resource match
          if (!context?.resourceId ||
              (grant.resourceType === context.resourceType && grant.resourceId === context.resourceId)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(userId: string, permissions: Permission[], context?: {
    resourceType?: ResourceType;
    resourceId?: string;
    teamId?: string;
  }): boolean {
    return permissions.some(permission => this.hasPermission(userId, permission, context));
  }

  /**
   * Check if user has all permissions
   */
  hasAllPermissions(userId: string, permissions: Permission[], context?: {
    resourceType?: ResourceType;
    resourceId?: string;
    teamId?: string;
  }): boolean {
    return permissions.every(permission => this.hasPermission(userId, permission, context));
  }

  /**
   * Get all permissions for user (from roles and grants)
   */
  getUserPermissions(userId: string, teamId?: string): Set<Permission> {
    const permissions = new Set<Permission>();

    // Get permissions from user roles
    const roles = this.userRoles.get(userId) || new Set();
    for (const role of roles) {
      const roleDef = this.roleDefinitions.get(role);
      if (roleDef) {
        roleDef.permissions.forEach(p => permissions.add(p));
      }
    }

    // Get permissions from team role if teamId provided
    if (teamId) {
      const teamRole = this.getUserTeamRole(userId, teamId);
      if (teamRole) {
        const teamRoleDef = this.roleDefinitions.get(teamRole);
        if (teamRoleDef) {
          teamRoleDef.permissions.forEach(p => permissions.add(p));
        }
      }
    }

    // Add custom permission grants
    const grants = this.permissionGrants.get(userId) || [];
    for (const grant of grants) {
      if (!grant.expiresAt || grant.expiresAt > new Date()) {
        permissions.add(grant.permission);
      }
    }

    return permissions;
  }

  /**
   * Grant custom permission to user
   */
  grantPermission(grant: Omit<PermissionGrant, 'id' | 'grantedAt'>): PermissionGrant {
    const permissionGrant: PermissionGrant = {
      ...grant,
      id: crypto.randomUUID(),
      grantedAt: new Date()
    };

    let grants = this.permissionGrants.get(grant.userId);
    if (!grants) {
      grants = [];
      this.permissionGrants.set(grant.userId, grants);
    }

    grants.push(permissionGrant);
    logger.info('Permission granted', {
      userId: grant.userId,
      permission: grant.permission,
      resourceType: grant.resourceType,
      resourceId: grant.resourceId
    });

    return permissionGrant;
  }

  /**
   * Revoke permission grant
   */
  revokePermissionGrant(grantId: string, userId: string): boolean {
    const grants = this.permissionGrants.get(userId);
    if (!grants) return false;

    const index = grants.findIndex(g => g.id === grantId);
    if (index === -1) return false;

    grants.splice(index, 1);
    logger.info('Permission grant revoked', { grantId, userId });
    return true;
  }

  /**
   * Set resource ownership
   */
  setResourceOwnership(ownership: ResourceOwnership): void {
    const key = `${ownership.resourceType}:${ownership.resourceId}`;
    this.resourceOwnership.set(key, ownership);
    logger.info('Resource ownership set', ownership);
  }

  /**
   * Get resource ownership
   */
  getResourceOwnership(resourceType: ResourceType, resourceId: string): ResourceOwnership | null {
    const key = `${resourceType}:${resourceId}`;
    return this.resourceOwnership.get(key) || null;
  }

  /**
   * Check if user has access to resource
   */
  hasResourceAccess(userId: string, resourceType: ResourceType, resourceId: string): boolean {
    const ownership = this.getResourceOwnership(resourceType, resourceId);
    if (!ownership) {
      // No ownership defined, use system admin permission
      return this.hasPermission(userId, Permission.SYSTEM_ADMIN);
    }

    // Owner always has access
    if (ownership.ownerId === userId) {
      return true;
    }

    // Check visibility
    if (ownership.visibility === 'public') {
      return true;
    }

    if (ownership.visibility === 'team' && ownership.teamId) {
      // Check if user is in the team
      const teamRole = this.getUserTeamRole(userId, ownership.teamId);
      return teamRole !== null;
    }

    // Private - only owner has access
    return false;
  }

  /**
   * Check if user can perform action on resource
   */
  canPerformAction(
    userId: string,
    action: Permission,
    resourceType: ResourceType,
    resourceId: string
  ): boolean {
    // Check if user has the permission
    if (!this.hasPermission(userId, action, { resourceType, resourceId })) {
      return false;
    }

    // Check if user has access to the resource
    return this.hasResourceAccess(userId, resourceType, resourceId);
  }

  /**
   * Get user's accessible resources
   */
  getAccessibleResources(userId: string, resourceType: ResourceType): string[] {
    const accessible: string[] = [];

    for (const [key, ownership] of this.resourceOwnership.entries()) {
      if (!key.startsWith(`${resourceType}:`)) continue;

      const resourceId = key.split(':')[1];

      if (this.hasResourceAccess(userId, resourceType, resourceId)) {
        accessible.push(resourceId);
      }
    }

    return accessible;
  }

  /**
   * Cleanup expired permission grants
   */
  cleanupExpiredGrants(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [userId, grants] of this.permissionGrants.entries()) {
      const validGrants = grants.filter(grant => {
        if (grant.expiresAt && grant.expiresAt <= now) {
          cleaned++;
          return false;
        }
        return true;
      });

      this.permissionGrants.set(userId, validGrants);
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired permission grants`);
    }

    return cleaned;
  }

  /**
   * Export user permissions for audit
   */
  exportUserPermissions(userId: string): {
    userId: string;
    roles: Role[];
    permissions: Permission[];
    grants: PermissionGrant[];
    teamRoles: Array<{ teamId: string; role: Role }>;
  } {
    const roles = this.getUserRoles(userId);
    const permissions = Array.from(this.getUserPermissions(userId));
    const grants = this.permissionGrants.get(userId) || [];

    const teamRoles: Array<{ teamId: string; role: Role }> = [];
    for (const [teamId, teamRoleMap] of this.teamRoles.entries()) {
      const role = teamRoleMap.get(userId);
      if (role) {
        teamRoles.push({ teamId, role });
      }
    }

    return {
      userId,
      roles,
      permissions,
      grants,
      teamRoles
    };
  }
}

// Singleton instance
export const rbacService = new RBACService();
