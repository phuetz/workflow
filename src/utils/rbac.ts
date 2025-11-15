/**
 * Advanced Role-Based Access Control (RBAC) System
 * Enterprise-grade permissions and access management
 */

export type Permission =
  // Workflow permissions
  | 'workflow.create'
  | 'workflow.read'
  | 'workflow.update'
  | 'workflow.delete'
  | 'workflow.execute'
  | 'workflow.publish'
  | 'workflow.share'
  | 'workflow.export'
  | 'workflow.import'
  // Execution permissions
  | 'execution.read'
  | 'execution.cancel'
  | 'execution.retry'
  | 'execution.delete'
  // User permissions
  | 'user.create'
  | 'user.read'
  | 'user.update'
  | 'user.delete'
  | 'user.invite'
  // Team permissions
  | 'team.create'
  | 'team.read'
  | 'team.update'
  | 'team.delete'
  | 'team.manage_members'
  // Settings permissions
  | 'settings.read'
  | 'settings.update'
  | 'settings.integrations'
  // Audit permissions
  | 'audit.read'
  | 'audit.export'
  // Template permissions
  | 'template.create'
  | 'template.read'
  | 'template.update'
  | 'template.delete'
  | 'template.publish'
  // Credential permissions
  | 'credential.create'
  | 'credential.read'
  | 'credential.update'
  | 'credential.delete'
  // Admin permissions
  | 'admin.all';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem?: boolean; // Cannot be deleted/modified
  isCustom?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[]; // Role IDs
  teams?: string[]; // Team IDs
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: string[]; // User IDs
  roles: string[]; // Role IDs assigned to team
  owner: string; // User ID
  createdAt: string;
  updatedAt: string;
}

export interface ResourcePermission {
  resourceType: 'workflow' | 'execution' | 'template' | 'credential';
  resourceId: string;
  userId?: string;
  teamId?: string;
  roleId?: string;
  permissions: Permission[];
  expiresAt?: string;
}

export interface AccessRequest {
  id: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  permissions: Permission[];
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

class RBACManager {
  private roles: Map<string, Role> = new Map();
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private resourcePermissions: Map<string, ResourcePermission[]> = new Map();
  private accessRequests: Map<string, AccessRequest> = new Map();

  constructor() {
    this.initializeSystemRoles();
    this.loadFromStorage();
  }

  /**
   * Initialize system roles
   */
  private initializeSystemRoles(): void {
    const systemRoles: Role[] = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: ['admin.all'],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'owner',
        name: 'Owner',
        description: 'Workflow owner with full access',
        permissions: [
          'workflow.create',
          'workflow.read',
          'workflow.update',
          'workflow.delete',
          'workflow.execute',
          'workflow.publish',
          'workflow.share',
          'workflow.export',
          'workflow.import',
          'execution.read',
          'execution.cancel',
          'execution.retry',
          'execution.delete',
          'template.create',
          'template.read',
          'template.update',
          'template.delete',
          'template.publish',
          'credential.create',
          'credential.read',
          'credential.update',
          'credential.delete'
        ],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'editor',
        name: 'Editor',
        description: 'Can create and edit workflows',
        permissions: [
          'workflow.create',
          'workflow.read',
          'workflow.update',
          'workflow.execute',
          'workflow.export',
          'execution.read',
          'execution.cancel',
          'template.read',
          'credential.read'
        ],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access',
        permissions: [
          'workflow.read',
          'execution.read',
          'template.read'
        ],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'executor',
        name: 'Executor',
        description: 'Can only execute workflows',
        permissions: [
          'workflow.read',
          'workflow.execute',
          'execution.read'
        ],
        isSystem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const role of systemRoles) {
      this.roles.set(role.id, role);
    }
  }

  /**
   * Create custom role
   */
  createRole(name: string, permissions: Permission[], description?: string): Role {
    const role: Role = {
      id: this.generateId('role'),
      name,
      description,
      permissions,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.roles.set(role.id, role);
    this.saveToStorage();

    return role;
  }

  /**
   * Update role
   */
  updateRole(roleId: string, updates: Partial<Role>): Role {
    const role = this.roles.get(roleId);

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot modify system role');
    }

    const updated = {
      ...role,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.roles.set(roleId, updated);
    this.saveToStorage();

    return updated;
  }

  /**
   * Delete role
   */
  deleteRole(roleId: string): void {
    const role = this.roles.get(roleId);

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system role');
    }

    this.roles.delete(roleId);
    this.saveToStorage();
  }

  /**
   * Assign role to user
   */
  assignRole(userId: string, roleId: string): void {
    const user = this.users.get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.roles.includes(roleId)) {
      user.roles.push(roleId);
      this.users.set(userId, user);
      this.saveToStorage();
    }
  }

  /**
   * Remove role from user
   */
  removeRole(userId: string, roleId: string): void {
    const user = this.users.get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    user.roles = user.roles.filter(r => r !== roleId);
    this.users.set(userId, user);
    this.saveToStorage();
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, permission: Permission, resourceId?: string): boolean {
    const user = this.users.get(userId);

    if (!user || !user.isActive) {
      return false;
    }

    // Check user roles
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);

      if (role) {
        // Admin has all permissions
        if (role.permissions.includes('admin.all')) {
          return true;
        }

        // Check specific permission
        if (role.permissions.includes(permission)) {
          return true;
        }
      }
    }

    // Check team roles
    if (user.teams) {
      for (const teamId of user.teams) {
        const team = this.teams.get(teamId);

        if (team) {
          for (const roleId of team.roles) {
            const role = this.roles.get(roleId);

            if (role && role.permissions.includes(permission)) {
              return true;
            }
          }
        }
      }
    }

    // Check resource-specific permissions
    if (resourceId) {
      const resourcePerms = this.resourcePermissions.get(resourceId) || [];

      for (const perm of resourcePerms) {
        // Check if permission is expired
        if (perm.expiresAt && new Date(perm.expiresAt) < new Date()) {
          continue;
        }

        if (perm.userId === userId && perm.permissions.includes(permission)) {
          return true;
        }

        if (perm.teamId && user.teams?.includes(perm.teamId) && perm.permissions.includes(permission)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): Permission[] {
    const user = this.users.get(userId);

    if (!user || !user.isActive) {
      return [];
    }

    const permissions = new Set<Permission>();

    // Collect from user roles
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);

      if (role) {
        for (const perm of role.permissions) {
          permissions.add(perm);
        }
      }
    }

    // Collect from team roles
    if (user.teams) {
      for (const teamId of user.teams) {
        const team = this.teams.get(teamId);

        if (team) {
          for (const roleId of team.roles) {
            const role = this.roles.get(roleId);

            if (role) {
              for (const perm of role.permissions) {
                permissions.add(perm);
              }
            }
          }
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Grant resource permission
   */
  grantResourcePermission(
    resourceType: ResourcePermission['resourceType'],
    resourceId: string,
    permissions: Permission[],
    options: {
      userId?: string;
      teamId?: string;
      roleId?: string;
      expiresAt?: string;
    }
  ): void {
    const perm: ResourcePermission = {
      resourceType,
      resourceId,
      permissions,
      ...options
    };

    const existing = this.resourcePermissions.get(resourceId) || [];
    existing.push(perm);
    this.resourcePermissions.set(resourceId, existing);
    this.saveToStorage();
  }

  /**
   * Revoke resource permission
   */
  revokeResourcePermission(resourceId: string, userId?: string, teamId?: string): void {
    let perms = this.resourcePermissions.get(resourceId) || [];

    perms = perms.filter(p => {
      if (userId && p.userId === userId) return false;
      if (teamId && p.teamId === teamId) return false;
      return true;
    });

    this.resourcePermissions.set(resourceId, perms);
    this.saveToStorage();
  }

  /**
   * Create team
   */
  createTeam(name: string, owner: string, description?: string): Team {
    const team: Team = {
      id: this.generateId('team'),
      name,
      description,
      members: [owner],
      roles: [],
      owner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.teams.set(team.id, team);
    this.saveToStorage();

    return team;
  }

  /**
   * Add member to team
   */
  addTeamMember(teamId: string, userId: string): void {
    const team = this.teams.get(teamId);
    const user = this.users.get(userId);

    if (!team) throw new Error('Team not found');
    if (!user) throw new Error('User not found');

    if (!team.members.includes(userId)) {
      team.members.push(userId);
    }

    if (!user.teams) user.teams = [];
    if (!user.teams.includes(teamId)) {
      user.teams.push(teamId);
    }

    this.teams.set(teamId, team);
    this.users.set(userId, user);
    this.saveToStorage();
  }

  /**
   * Remove member from team
   */
  removeTeamMember(teamId: string, userId: string): void {
    const team = this.teams.get(teamId);
    const user = this.users.get(userId);

    if (!team) throw new Error('Team not found');

    team.members = team.members.filter(m => m !== userId);

    if (user && user.teams) {
      user.teams = user.teams.filter(t => t !== teamId);
      this.users.set(userId, user);
    }

    this.teams.set(teamId, team);
    this.saveToStorage();
  }

  /**
   * Request access
   */
  requestAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    permissions: Permission[],
    reason?: string
  ): AccessRequest {
    const request: AccessRequest = {
      id: this.generateId('access_req'),
      userId,
      resourceType,
      resourceId,
      permissions,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.accessRequests.set(request.id, request);
    this.saveToStorage();

    return request;
  }

  /**
   * Review access request
   */
  reviewAccessRequest(
    requestId: string,
    reviewerId: string,
    approved: boolean
  ): AccessRequest {
    const request = this.accessRequests.get(requestId);

    if (!request) {
      throw new Error('Access request not found');
    }

    request.status = approved ? 'approved' : 'rejected';
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date().toISOString();

    if (approved) {
      this.grantResourcePermission(
        request.resourceType as any,
        request.resourceId,
        request.permissions,
        { userId: request.userId }
      );
    }

    this.accessRequests.set(requestId, request);
    this.saveToStorage();

    return request;
  }

  /**
   * Get all roles
   */
  getRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get role
   */
  getRole(id: string): Role | undefined {
    return this.roles.get(id);
  }

  /**
   * Generate ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('rbac-roles', JSON.stringify(Array.from(this.roles.entries())));
        localStorage.setItem('rbac-users', JSON.stringify(Array.from(this.users.entries())));
        localStorage.setItem('rbac-teams', JSON.stringify(Array.from(this.teams.entries())));
        localStorage.setItem('rbac-resource-permissions', JSON.stringify(Array.from(this.resourcePermissions.entries())));
        localStorage.setItem('rbac-access-requests', JSON.stringify(Array.from(this.accessRequests.entries())));
      } catch (error) {
        console.error('Failed to save RBAC data:', error);
      }
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const roles = localStorage.getItem('rbac-roles');
        if (roles) {
          const data = JSON.parse(roles);
          // Merge with system roles
          for (const [id, role] of new Map(data)) {
            if (!role.isSystem) {
              this.roles.set(id, role);
            }
          }
        }

        const users = localStorage.getItem('rbac-users');
        if (users) this.users = new Map(JSON.parse(users));

        const teams = localStorage.getItem('rbac-teams');
        if (teams) this.teams = new Map(JSON.parse(teams));

        const resourcePermissions = localStorage.getItem('rbac-resource-permissions');
        if (resourcePermissions) this.resourcePermissions = new Map(JSON.parse(resourcePermissions));

        const accessRequests = localStorage.getItem('rbac-access-requests');
        if (accessRequests) this.accessRequests = new Map(JSON.parse(accessRequests));
      } catch (error) {
        console.error('Failed to load RBAC data:', error);
      }
    }
  }
}

// Singleton instance
export const rbacManager = new RBACManager();

/**
 * Permission check decorator
 */
export function requirePermission(permission: Permission) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const userId = args[0]; // Assume first arg is userId

      if (!rbacManager.hasPermission(userId, permission)) {
        throw new Error(`Permission denied: ${permission}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
