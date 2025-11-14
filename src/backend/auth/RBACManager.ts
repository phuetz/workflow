/**
 * Role-Based Access Control (RBAC) Manager
 * Advanced permission and role management system
 */

export type Permission = string;
export type Role = string;

export interface RoleDefinition {
  name: Role;
  displayName: string;
  description: string;
  permissions: Permission[];
  inheritsFrom?: Role[];
  priority: number; // Higher priority = more permissions
}

export interface PermissionDefinition {
  name: Permission;
  resource: string;
  action: string;
  description: string;
  requiresOwnership?: boolean;
}

export interface AccessContext {
  userId: string;
  resourceId?: string;
  resourceOwnerId?: string;
  organizationId?: string;
  teamId?: string;
}

export class RBACManager {
  private roles: Map<Role, RoleDefinition> = new Map();
  private permissions: Map<Permission, PermissionDefinition> = new Map();
  private userRoles: Map<string, Set<Role>> = new Map();
  private customPermissions: Map<string, Set<Permission>> = new Map();

  constructor() {
    this.initializeDefaultRoles();
    this.initializeDefaultPermissions();
  }

  /**
   * Initialize default system roles
   */
  private initializeDefaultRoles(): void {
    // Super Admin - Full system access
    this.defineRole({
      name: 'super_admin',
      displayName: 'Super Administrator',
      description: 'Full system access with all permissions',
      permissions: ['*'], // Wildcard for all permissions
      priority: 1000
    });

    // Admin - Organization-level admin
    this.defineRole({
      name: 'admin',
      displayName: 'Administrator',
      description: 'Full access to organization resources',
      permissions: [
        'workflow.*',
        'credential.*',
        'user.read', 'user.update', 'user.invite', 'user.remove',
        'team.*',
        'execution.*',
        'webhook.*',
        'variable.*',
        'audit.read',
        'settings.manage',
        'billing.read', 'billing.update'
      ],
      priority: 900
    });

    // Power User - Advanced user with extra capabilities
    this.defineRole({
      name: 'power_user',
      displayName: 'Power User',
      description: 'Advanced user with team management capabilities',
      permissions: [
        'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
        'workflow.execute', 'workflow.share', 'workflow.publish', 'workflow.version',
        'credential.create', 'credential.read', 'credential.update', 'credential.delete',
        'execution.read', 'execution.retry', 'execution.cancel',
        'team.read', 'team.invite',
        'webhook.create', 'webhook.read', 'webhook.update', 'webhook.delete',
        'variable.create', 'variable.read', 'variable.update', 'variable.delete'
      ],
      priority: 700
    });

    // User - Standard user
    this.defineRole({
      name: 'user',
      displayName: 'User',
      description: 'Standard user with workflow creation and execution',
      permissions: [
        'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
        'workflow.execute', 'workflow.share',
        'credential.create', 'credential.read', 'credential.update', 'credential.delete',
        'execution.read', 'execution.retry',
        'team.read',
        'webhook.create', 'webhook.read', 'webhook.update', 'webhook.delete',
        'variable.create', 'variable.read', 'variable.update', 'variable.delete'
      ],
      priority: 500
    });

    // Developer - API and integration focused
    this.defineRole({
      name: 'developer',
      displayName: 'Developer',
      description: 'Developer with API and webhook access',
      permissions: [
        'workflow.read', 'workflow.execute',
        'execution.read',
        'webhook.*',
        'api.read', 'api.create',
        'variable.read'
      ],
      priority: 400
    });

    // Viewer - Read-only access
    this.defineRole({
      name: 'viewer',
      displayName: 'Viewer',
      description: 'Read-only access to workflows and executions',
      permissions: [
        'workflow.read',
        'execution.read',
        'team.read'
      ],
      priority: 300
    });

    // Guest - Limited access
    this.defineRole({
      name: 'guest',
      displayName: 'Guest',
      description: 'Very limited access for external collaborators',
      permissions: [
        'workflow.read'
      ],
      priority: 100
    });
  }

  /**
   * Initialize default permissions
   */
  private initializeDefaultPermissions(): void {
    // Workflow permissions
    this.definePermission({
      name: 'workflow.create',
      resource: 'workflow',
      action: 'create',
      description: 'Create new workflows'
    });

    this.definePermission({
      name: 'workflow.read',
      resource: 'workflow',
      action: 'read',
      description: 'View workflows',
      requiresOwnership: true
    });

    this.definePermission({
      name: 'workflow.update',
      resource: 'workflow',
      action: 'update',
      description: 'Edit workflows',
      requiresOwnership: true
    });

    this.definePermission({
      name: 'workflow.delete',
      resource: 'workflow',
      action: 'delete',
      description: 'Delete workflows',
      requiresOwnership: true
    });

    this.definePermission({
      name: 'workflow.execute',
      resource: 'workflow',
      action: 'execute',
      description: 'Execute workflows'
    });

    this.definePermission({
      name: 'workflow.share',
      resource: 'workflow',
      action: 'share',
      description: 'Share workflows with others',
      requiresOwnership: true
    });

    this.definePermission({
      name: 'workflow.publish',
      resource: 'workflow',
      action: 'publish',
      description: 'Publish workflows to marketplace'
    });

    this.definePermission({
      name: 'workflow.version',
      resource: 'workflow',
      action: 'version',
      description: 'Manage workflow versions'
    });

    // Credential permissions
    this.definePermission({
      name: 'credential.create',
      resource: 'credential',
      action: 'create',
      description: 'Create credentials'
    });

    this.definePermission({
      name: 'credential.read',
      resource: 'credential',
      action: 'read',
      description: 'View credentials',
      requiresOwnership: true
    });

    this.definePermission({
      name: 'credential.update',
      resource: 'credential',
      action: 'update',
      description: 'Update credentials',
      requiresOwnership: true
    });

    this.definePermission({
      name: 'credential.delete',
      resource: 'credential',
      action: 'delete',
      description: 'Delete credentials',
      requiresOwnership: true
    });

    // User management permissions
    this.definePermission({
      name: 'user.create',
      resource: 'user',
      action: 'create',
      description: 'Create new users'
    });

    this.definePermission({
      name: 'user.read',
      resource: 'user',
      action: 'read',
      description: 'View user information'
    });

    this.definePermission({
      name: 'user.update',
      resource: 'user',
      action: 'update',
      description: 'Update user information'
    });

    this.definePermission({
      name: 'user.delete',
      resource: 'user',
      action: 'delete',
      description: 'Delete users'
    });

    this.definePermission({
      name: 'user.invite',
      resource: 'user',
      action: 'invite',
      description: 'Invite new users'
    });

    this.definePermission({
      name: 'user.remove',
      resource: 'user',
      action: 'remove',
      description: 'Remove users from organization'
    });

    // Team permissions
    this.definePermission({
      name: 'team.create',
      resource: 'team',
      action: 'create',
      description: 'Create teams'
    });

    this.definePermission({
      name: 'team.read',
      resource: 'team',
      action: 'read',
      description: 'View teams'
    });

    this.definePermission({
      name: 'team.update',
      resource: 'team',
      action: 'update',
      description: 'Update teams'
    });

    this.definePermission({
      name: 'team.delete',
      resource: 'team',
      action: 'delete',
      description: 'Delete teams'
    });

    this.definePermission({
      name: 'team.invite',
      resource: 'team',
      action: 'invite',
      description: 'Invite members to teams'
    });

    // Execution permissions
    this.definePermission({
      name: 'execution.read',
      resource: 'execution',
      action: 'read',
      description: 'View execution history'
    });

    this.definePermission({
      name: 'execution.retry',
      resource: 'execution',
      action: 'retry',
      description: 'Retry failed executions'
    });

    this.definePermission({
      name: 'execution.cancel',
      resource: 'execution',
      action: 'cancel',
      description: 'Cancel running executions'
    });

    this.definePermission({
      name: 'execution.delete',
      resource: 'execution',
      action: 'delete',
      description: 'Delete execution history'
    });

    // System permissions
    this.definePermission({
      name: 'system.admin',
      resource: 'system',
      action: 'admin',
      description: 'System administration access'
    });

    this.definePermission({
      name: 'audit.read',
      resource: 'audit',
      action: 'read',
      description: 'View audit logs'
    });

    this.definePermission({
      name: 'settings.manage',
      resource: 'settings',
      action: 'manage',
      description: 'Manage system settings'
    });
  }

  /**
   * Define a new role
   */
  defineRole(definition: RoleDefinition): void {
    this.roles.set(definition.name, definition);
  }

  /**
   * Define a new permission
   */
  definePermission(definition: PermissionDefinition): void {
    this.permissions.set(definition.name, definition);
  }

  /**
   * Assign role to user
   */
  assignRole(userId: string, role: Role): void {
    if (!this.roles.has(role)) {
      throw new Error(`Role '${role}' does not exist`);
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    this.userRoles.get(userId)!.add(role);
  }

  /**
   * Revoke role from user
   */
  revokeRole(userId: string, role: Role): void {
    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(role);
    }
  }

  /**
   * Grant custom permission to user
   */
  grantPermission(userId: string, permission: Permission): void {
    if (!this.customPermissions.has(userId)) {
      this.customPermissions.set(userId, new Set());
    }

    this.customPermissions.get(userId)!.add(permission);
  }

  /**
   * Revoke custom permission from user
   */
  revokePermission(userId: string, permission: Permission): void {
    const permissions = this.customPermissions.get(userId);
    if (permissions) {
      permissions.delete(permission);
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, permission: Permission, context?: AccessContext): boolean {
    const userPermissions = this.getUserPermissions(userId);

    // Check for wildcard permission
    if (userPermissions.has('*')) {
      return true;
    }

    // Check for exact permission match
    if (userPermissions.has(permission)) {
      // If permission requires ownership, verify it
      const permDef = this.permissions.get(permission);
      if (permDef?.requiresOwnership && context) {
        return this.checkOwnership(userId, context);
      }
      return true;
    }

    // Check for wildcard resource permissions (e.g., 'workflow.*')
    const [resource, action] = permission.split('.');
    const wildcardPermission = `${resource}.*`;
    if (userPermissions.has(wildcardPermission)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(userId: string, permissions: Permission[], context?: AccessContext): boolean {
    return permissions.some(permission => this.hasPermission(userId, permission, context));
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(userId: string, permissions: Permission[], context?: AccessContext): boolean {
    return permissions.every(permission => this.hasPermission(userId, permission, context));
  }

  /**
   * Check if user has role
   */
  hasRole(userId: string, role: Role): boolean {
    const userRoles = this.userRoles.get(userId);
    return userRoles?.has(role) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(userId: string, roles: Role[]): boolean {
    return roles.some(role => this.hasRole(userId, role));
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string): Set<Permission> {
    const permissions = new Set<Permission>();

    // Add permissions from roles
    const userRoles = this.userRoles.get(userId);
    if (userRoles) {
      for (const roleName of userRoles) {
        const role = this.roles.get(roleName);
        if (role) {
          // Add direct permissions
          role.permissions.forEach(p => permissions.add(p));

          // Add inherited permissions
          if (role.inheritsFrom) {
            for (const inheritedRole of role.inheritsFrom) {
              const inherited = this.roles.get(inheritedRole);
              if (inherited) {
                inherited.permissions.forEach(p => permissions.add(p));
              }
            }
          }
        }
      }
    }

    // Add custom permissions
    const customPerms = this.customPermissions.get(userId);
    if (customPerms) {
      customPerms.forEach(p => permissions.add(p));
    }

    return permissions;
  }

  /**
   * Get all roles for a user
   */
  getUserRoles(userId: string): Set<Role> {
    return this.userRoles.get(userId) || new Set();
  }

  /**
   * Get highest priority role for user
   */
  getPrimaryRole(userId: string): RoleDefinition | null {
    const userRoles = this.userRoles.get(userId);
    if (!userRoles || userRoles.size === 0) {
      return null;
    }

    let primaryRole: RoleDefinition | null = null;
    let highestPriority = -1;

    for (const roleName of userRoles) {
      const role = this.roles.get(roleName);
      if (role && role.priority > highestPriority) {
        primaryRole = role;
        highestPriority = role.priority;
      }
    }

    return primaryRole;
  }

  /**
   * Check resource ownership
   */
  private checkOwnership(userId: string, context: AccessContext): boolean {
    // Same user
    if (context.resourceOwnerId === userId) {
      return true;
    }

    // Admin override
    if (this.hasRole(userId, 'admin') || this.hasRole(userId, 'super_admin')) {
      return true;
    }

    // Team membership (would need to be implemented with actual team data)
    // For now, return false if not owner and not admin
    return false;
  }

  /**
   * Require permission (throws if not authorized)
   */
  requirePermission(userId: string, permission: Permission, context?: AccessContext): void {
    if (!this.hasPermission(userId, permission, context)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  /**
   * Require role (throws if not authorized)
   */
  requireRole(userId: string, role: Role): void {
    if (!this.hasRole(userId, role)) {
      throw new Error(`Role required: ${role}`);
    }
  }

  /**
   * Get all available roles
   */
  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): PermissionDefinition[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get role definition
   */
  getRole(roleName: Role): RoleDefinition | undefined {
    return this.roles.get(roleName);
  }

  /**
   * Get permission definition
   */
  getPermission(permissionName: Permission): PermissionDefinition | undefined {
    return this.permissions.get(permissionName);
  }
}

// Export singleton instance
export const rbacManager = new RBACManager();
