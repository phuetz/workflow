/**
 * Prisma-backed Role-Based Access Control (RBAC) Service
 * Persistent RBAC implementation using database
 */

import { prisma } from '../database/prisma';
import { logger } from '../../services/SimpleLogger';
import { Role, ResourceType as PrismaResourceType } from '@prisma/client';

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

  // Team permissions
  TEAM_CREATE = 'team:create',
  TEAM_READ = 'team:read',
  TEAM_UPDATE = 'team:update',
  TEAM_DELETE = 'team:delete',
  TEAM_MANAGE_MEMBERS = 'team:manage_members',

  // Execution permissions
  EXECUTION_READ = 'execution:read',
  EXECUTION_RETRY = 'execution:retry',
  EXECUTION_CANCEL = 'execution:cancel',

  // System administration
  SYSTEM_ADMIN = 'system:admin',
  AUDIT_READ = 'audit:read',
}

// Role permission mappings
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.WORKFLOW_CREATE, Permission.WORKFLOW_READ, Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE, Permission.WORKFLOW_EXECUTE, Permission.WORKFLOW_SHARE,
    Permission.WORKFLOW_PUBLISH, Permission.CREDENTIAL_CREATE, Permission.CREDENTIAL_READ,
    Permission.CREDENTIAL_UPDATE, Permission.CREDENTIAL_DELETE, Permission.CREDENTIAL_USE,
    Permission.USER_CREATE, Permission.USER_READ, Permission.USER_UPDATE, Permission.USER_DELETE,
    Permission.TEAM_CREATE, Permission.TEAM_READ, Permission.TEAM_UPDATE, Permission.TEAM_DELETE,
    Permission.TEAM_MANAGE_MEMBERS, Permission.EXECUTION_READ, Permission.EXECUTION_RETRY,
    Permission.EXECUTION_CANCEL, Permission.SYSTEM_ADMIN, Permission.AUDIT_READ,
  ],
  [Role.USER]: [
    Permission.WORKFLOW_CREATE, Permission.WORKFLOW_READ, Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE, Permission.WORKFLOW_EXECUTE, Permission.WORKFLOW_SHARE,
    Permission.CREDENTIAL_CREATE, Permission.CREDENTIAL_READ, Permission.CREDENTIAL_UPDATE,
    Permission.CREDENTIAL_DELETE, Permission.CREDENTIAL_USE, Permission.EXECUTION_READ,
    Permission.EXECUTION_RETRY,
  ],
  [Role.VIEWER]: [
    Permission.WORKFLOW_READ, Permission.CREDENTIAL_READ, Permission.EXECUTION_READ,
  ],
};

export interface PermissionCheck {
  hasPermission: boolean;
  reason?: string;
}

export class RBACPrismaService {
  private static instance: RBACPrismaService;

  private constructor() {}

  public static getInstance(): RBACPrismaService {
    if (!RBACPrismaService.instance) {
      RBACPrismaService.instance = new RBACPrismaService();
    }
    return RBACPrismaService.instance;
  }

  /**
   * Get permissions for a role
   */
  getPermissionsForRole(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    userId: string,
    permission: Permission,
    resourceType?: PrismaResourceType,
    resourceId?: string
  ): Promise<PermissionCheck> {
    try {
      // Get user with role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, status: true },
      });

      if (!user) {
        return { hasPermission: false, reason: 'User not found' };
      }

      if (user.status !== 'ACTIVE') {
        return { hasPermission: false, reason: 'User is not active' };
      }

      // Check role permissions
      const rolePermissions = this.getPermissionsForRole(user.role);
      if (rolePermissions.includes(permission)) {
        // If resource-specific, check ownership or sharing
        if (resourceType && resourceId) {
          const hasAccess = await this.checkResourceAccess(userId, resourceType, resourceId);
          if (!hasAccess) {
            return { hasPermission: false, reason: 'No access to resource' };
          }
        }
        return { hasPermission: true };
      }

      // Check custom resource permissions
      if (resourceType && resourceId) {
        const resourcePermission = await prisma.resourcePermission.findFirst({
          where: {
            userId,
            resourceType,
            resourceId,
            isActive: true,
            permissions: { has: permission },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        });

        if (resourcePermission) {
          return { hasPermission: true };
        }
      }

      return { hasPermission: false, reason: 'Permission not granted' };
    } catch (error) {
      logger.error('Error checking permission:', error);
      return { hasPermission: false, reason: 'Error checking permission' };
    }
  }

  /**
   * Check if user has access to a resource
   */
  async checkResourceAccess(
    userId: string,
    resourceType: PrismaResourceType,
    resourceId: string
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'WORKFLOW':
          return this.checkWorkflowAccess(userId, resourceId);
        case 'CREDENTIAL':
          return this.checkCredentialAccess(userId, resourceId);
        case 'EXECUTION':
          return this.checkExecutionAccess(userId, resourceId);
        case 'TEAM':
          return this.checkTeamAccess(userId, resourceId);
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error checking resource access:', error);
      return false;
    }
  }

  /**
   * Check workflow access
   */
  private async checkWorkflowAccess(userId: string, workflowId: string): Promise<boolean> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        shares: {
          where: { userId },
        },
        team: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!workflow) return false;

    // Owner always has access
    if (workflow.userId === userId) return true;

    // Check if shared with user
    if (workflow.shares.length > 0) return true;

    // Check if in same team
    if (workflow.team && workflow.team.members.length > 0) return true;

    // Check visibility
    if (workflow.visibility === 'PUBLIC') return true;

    return false;
  }

  /**
   * Check credential access
   */
  private async checkCredentialAccess(userId: string, credentialId: string): Promise<boolean> {
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      include: {
        shares: {
          where: {
            sharedWithId: userId,
            isActive: true,
          },
        },
      },
    });

    if (!credential) return false;

    // Owner always has access
    if (credential.userId === userId) return true;

    // Check if shared with user
    if (credential.shares.length > 0) return true;

    return false;
  }

  /**
   * Check execution access
   */
  private async checkExecutionAccess(userId: string, executionId: string): Promise<boolean> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
      },
    });

    if (!execution) return false;

    // Owner of execution has access
    if (execution.userId === userId) return true;

    // Owner of workflow has access
    if (execution.workflow.userId === userId) return true;

    // Check workflow access
    return this.checkWorkflowAccess(userId, execution.workflowId);
  }

  /**
   * Check team access
   */
  private async checkTeamAccess(userId: string, teamId: string): Promise<boolean> {
    const member = await prisma.teamMember.findFirst({
      where: { teamId, userId },
    });

    return member !== null;
  }

  /**
   * Grant permission to user for a resource
   */
  async grantResourcePermission(
    userId: string,
    resourceType: PrismaResourceType,
    resourceId: string,
    permissions: string[],
    grantedBy: string,
    expiresAt?: Date
  ): Promise<void> {
    await prisma.resourcePermission.upsert({
      where: {
        userId_resourceType_resourceId: {
          userId,
          resourceType,
          resourceId,
        },
      },
      update: {
        permissions,
        grantedBy,
        expiresAt,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        resourceType,
        resourceId,
        permissions,
        grantedBy,
        expiresAt,
        isActive: true,
      },
    });

    logger.info('Resource permission granted', {
      userId,
      resourceType,
      resourceId,
      permissions,
      grantedBy,
    });
  }

  /**
   * Revoke permission from user for a resource
   */
  async revokeResourcePermission(
    userId: string,
    resourceType: PrismaResourceType,
    resourceId: string
  ): Promise<boolean> {
    try {
      await prisma.resourcePermission.update({
        where: {
          userId_resourceType_resourceId: {
            userId,
            resourceType,
            resourceId,
          },
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info('Resource permission revoked', {
        userId,
        resourceType,
        resourceId,
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user's role
   */
  async getUserRole(userId: string): Promise<Role | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role || null;
  }

  /**
   * Update user's role
   */
  async updateUserRole(userId: string, role: Role, updatedBy: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'role_update',
        resource: 'user',
        resourceId: userId,
        details: { newRole: role },
      },
    });

    logger.info('User role updated', { userId, role, updatedBy });
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return [];

    const rolePermissions = this.getPermissionsForRole(user.role);

    // Get custom resource permissions
    const resourcePermissions = await prisma.resourcePermission.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    // Combine permissions
    const allPermissions = new Set<Permission>(rolePermissions);
    for (const rp of resourcePermissions) {
      for (const perm of rp.permissions) {
        if (Object.values(Permission).includes(perm as Permission)) {
          allPermissions.add(perm as Permission);
        }
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * Check multiple permissions at once
   */
  async hasAnyPermission(
    userId: string,
    permissions: Permission[],
    resourceType?: PrismaResourceType,
    resourceId?: string
  ): Promise<boolean> {
    for (const permission of permissions) {
      const check = await this.hasPermission(userId, permission, resourceType, resourceId);
      if (check.hasPermission) return true;
    }
    return false;
  }

  /**
   * Check all permissions at once
   */
  async hasAllPermissions(
    userId: string,
    permissions: Permission[],
    resourceType?: PrismaResourceType,
    resourceId?: string
  ): Promise<boolean> {
    for (const permission of permissions) {
      const check = await this.hasPermission(userId, permission, resourceType, resourceId);
      if (!check.hasPermission) return false;
    }
    return true;
  }

  /**
   * Cleanup expired permissions
   */
  async cleanupExpiredPermissions(): Promise<number> {
    const result = await prisma.resourcePermission.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired permissions`);
    }

    return result.count;
  }
}

// Export singleton instance
export const rbacPrismaService = RBACPrismaService.getInstance();
