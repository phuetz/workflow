/**
 * RBAC Service - Role-Based Access Control
 *
 * Manages granular permissions for resources (credentials, workflows, etc.)
 * Implements enterprise-grade authorization with:
 * - Role-based permissions
 * - Resource-level permissions
 * - Credential sharing with expiration
 * - User groups
 * - Permission inheritance
 *
 * @module backend/services/RBACService
 */

import { PrismaClient, Role, ResourceType as PrismaResourceType, CredentialPermission as PrismaCredentialPermission, CredentialVisibility as PrismaCredentialVisibility } from '@prisma/client';

// Export Prisma types with enum values
export const ResourceType = {
  WORKFLOW: 'WORKFLOW' as const,
  CREDENTIAL: 'CREDENTIAL' as const,
  EXECUTION: 'EXECUTION' as const,
  WEBHOOK: 'WEBHOOK' as const,
  TEAM: 'TEAM' as const,
  USER_GROUP: 'USER_GROUP' as const,
  FILE: 'FILE' as const
};
export type ResourceType = PrismaResourceType;

export const CredentialPermission = {
  READ: 'READ' as const,
  USE: 'USE' as const,
  EDIT: 'EDIT' as const,
  DELETE: 'DELETE' as const,
  SHARE: 'SHARE' as const,
  ADMIN: 'ADMIN' as const
};
export type CredentialPermission = PrismaCredentialPermission;

export const CredentialVisibility = {
  PRIVATE: 'PRIVATE' as const,
  TEAM: 'TEAM' as const,
  SHARED: 'SHARED' as const,
  PUBLIC: 'PUBLIC' as const
};
export type CredentialVisibility = PrismaCredentialVisibility;

const prisma = new PrismaClient();

export interface PermissionCheck {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  action: string;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  source?: 'role' | 'direct' | 'share' | 'group' | 'team';
}

export interface ShareCredentialInput {
  credentialId: string;
  ownerId: string;
  sharedWithId: string;
  permissions: CredentialPermission[];
  expiresAt?: Date;
  maxUses?: number;
}

/**
 * Permission condition types for RBAC
 */
export interface PermissionCondition {
  // Logical operators
  and?: PermissionCondition[];
  or?: PermissionCondition[];
  not?: PermissionCondition;

  // Time-based conditions
  timeWindow?: {
    start?: string;  // HH:MM format
    end?: string;    // HH:MM format
    daysOfWeek?: number[];  // 0-6 (Sunday-Saturday)
    timezone?: string;
  };

  // IP-based conditions
  ipRange?: {
    allowed?: string[];   // CIDR ranges or IPs
    denied?: string[];
  };

  // Resource ownership
  ownerOnly?: boolean;
  teamOnly?: boolean;

  // Environment conditions
  environment?: string[];  // e.g., ['production', 'staging']

  // Custom attribute conditions
  userAttributes?: Record<string, string | number | boolean | string[]>;
  resourceAttributes?: Record<string, string | number | boolean | string[]>;
}

export interface ConditionContext {
  userId: string;
  resourceType: ResourceType;
  resourceId?: string;
  action: string;
  ipAddress?: string;
  userAttributes?: Record<string, unknown>;
  resourceAttributes?: Record<string, unknown>;
}

/**
 * RBAC Service Class
 */
export class RBACService {
  /**
   * Check if user has permission to perform action on resource
   */
  async checkPermission(check: PermissionCheck): Promise<PermissionResult> {
    const { userId, resourceType, resourceId, action } = check;

    // 1. Check if user is resource owner
    const isOwner = await this.isResourceOwner(userId, resourceType, resourceId);
    if (isOwner) {
      return {
        allowed: true,
        reason: 'User is resource owner',
        source: 'direct'
      };
    }

    // 2. Check role-based permissions
    const rolePermission = await this.checkRolePermission(userId, resourceType, action);
    if (rolePermission.allowed) {
      return rolePermission;
    }

    // 3. Check direct resource permissions
    const resourcePermission = await this.checkResourcePermission(userId, resourceType, resourceId, action);
    if (resourcePermission.allowed) {
      return resourcePermission;
    }

    // 4. Check credential sharing (if credential)
    if (resourceType === ResourceType.CREDENTIAL) {
      const sharePermission = await this.checkCredentialShare(userId, resourceId, action);
      if (sharePermission.allowed) {
        return sharePermission;
      }
    }

    // 5. Check group permissions
    const groupPermission = await this.checkGroupPermission(userId, resourceType, action);
    if (groupPermission.allowed) {
      return groupPermission;
    }

    // 6. Check team permissions (if resource belongs to team)
    const teamPermission = await this.checkTeamPermission(userId, resourceType, resourceId, action);
    if (teamPermission.allowed) {
      return teamPermission;
    }

    // No permission found
    return {
      allowed: false,
      reason: 'User does not have required permission'
    };
  }

  /**
   * Check if user owns the resource
   */
  private async isResourceOwner(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    switch (resourceType) {
      case ResourceType.CREDENTIAL:
        const credential = await prisma.credential.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return credential?.userId === userId;

      case ResourceType.WORKFLOW:
        const workflow = await prisma.workflow.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return workflow?.userId === userId;

      case ResourceType.EXECUTION:
        const execution = await prisma.workflowExecution.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return execution?.userId === userId;

      default:
        return false;
    }
  }

  /**
   * Check role-based permissions
   */
  private async checkRolePermission(
    userId: string,
    resourceType: ResourceType,
    action: string
  ): Promise<PermissionResult> {
    // Get user role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // ADMIN has all permissions
    if (user.role === Role.ADMIN) {
      return {
        allowed: true,
        reason: 'User is admin',
        source: 'role'
      };
    }

    // Check role permissions table
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        role_resource_action: {
          role: user.role,
          resource: resourceType,
          action
        }
      }
    });

    if (rolePermission) {
      // Check conditions if any
      if (rolePermission.conditions) {
        const conditionResult = await this.evaluateConditions(
          rolePermission.conditions as PermissionCondition,
          { userId, resourceType, resourceId: undefined, action }
        );
        if (!conditionResult.allowed) {
          return {
            allowed: false,
            reason: conditionResult.reason || 'Permission conditions not met'
          };
        }
      }

      return {
        allowed: true,
        reason: `Role ${user.role} has ${action} permission on ${resourceType}`,
        source: 'role'
      };
    }

    return {
      allowed: false,
      reason: `Role ${user.role} does not have ${action} permission on ${resourceType}`
    };
  }

  /**
   * Check direct resource permissions
   */
  private async checkResourcePermission(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    action: string
  ): Promise<PermissionResult> {
    const permission = await prisma.resourcePermission.findFirst({
      where: {
        userId,
        resourceType,
        resourceId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (!permission) {
      return { allowed: false };
    }

    // Check if action is in permissions array
    if (permission.permissions.includes(action) || permission.permissions.includes('*')) {
      return {
        allowed: true,
        reason: 'Direct resource permission',
        source: 'direct'
      };
    }

    return { allowed: false };
  }

  /**
   * Evaluate permission conditions
   */
  private async evaluateConditions(
    condition: PermissionCondition,
    context: ConditionContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Handle logical AND
    if (condition.and && condition.and.length > 0) {
      for (const subCondition of condition.and) {
        const result = await this.evaluateConditions(subCondition, context);
        if (!result.allowed) {
          return result;
        }
      }
      return { allowed: true };
    }

    // Handle logical OR
    if (condition.or && condition.or.length > 0) {
      for (const subCondition of condition.or) {
        const result = await this.evaluateConditions(subCondition, context);
        if (result.allowed) {
          return { allowed: true };
        }
      }
      return { allowed: false, reason: 'None of the OR conditions matched' };
    }

    // Handle logical NOT
    if (condition.not) {
      const result = await this.evaluateConditions(condition.not, context);
      return {
        allowed: !result.allowed,
        reason: result.allowed ? 'NOT condition failed' : undefined
      };
    }

    // Check time window
    if (condition.timeWindow) {
      const timeResult = this.checkTimeWindow(condition.timeWindow);
      if (!timeResult.allowed) {
        return timeResult;
      }
    }

    // Check IP range
    if (condition.ipRange && context.ipAddress) {
      const ipResult = this.checkIPRange(condition.ipRange, context.ipAddress);
      if (!ipResult.allowed) {
        return ipResult;
      }
    }

    // Check owner only
    if (condition.ownerOnly && context.resourceId) {
      const ownerResult = await this.checkOwnership(context.userId, context.resourceType, context.resourceId);
      if (!ownerResult.allowed) {
        return ownerResult;
      }
    }

    // Check team only
    if (condition.teamOnly && context.resourceId) {
      const teamResult = await this.checkTeamMembership(context.userId, context.resourceType, context.resourceId);
      if (!teamResult.allowed) {
        return teamResult;
      }
    }

    // Check environment
    if (condition.environment && condition.environment.length > 0) {
      const currentEnv = process.env.NODE_ENV || 'development';
      if (!condition.environment.includes(currentEnv)) {
        return {
          allowed: false,
          reason: `Operation not allowed in ${currentEnv} environment`
        };
      }
    }

    // Check user attributes
    if (condition.userAttributes && context.userAttributes) {
      for (const [key, expectedValue] of Object.entries(condition.userAttributes)) {
        const actualValue = context.userAttributes[key];
        if (!this.matchAttributeValue(actualValue, expectedValue)) {
          return {
            allowed: false,
            reason: `User attribute ${key} does not match`
          };
        }
      }
    }

    // Check resource attributes
    if (condition.resourceAttributes && context.resourceAttributes) {
      for (const [key, expectedValue] of Object.entries(condition.resourceAttributes)) {
        const actualValue = context.resourceAttributes[key];
        if (!this.matchAttributeValue(actualValue, expectedValue)) {
          return {
            allowed: false,
            reason: `Resource attribute ${key} does not match`
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check time window condition
   */
  private checkTimeWindow(timeWindow: NonNullable<PermissionCondition['timeWindow']>): { allowed: boolean; reason?: string } {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Check days of week
    if (timeWindow.daysOfWeek && timeWindow.daysOfWeek.length > 0) {
      if (!timeWindow.daysOfWeek.includes(currentDay)) {
        return {
          allowed: false,
          reason: `Access not allowed on this day of the week`
        };
      }
    }

    // Check time range
    if (timeWindow.start && timeWindow.end) {
      const [startHour, startMinute] = timeWindow.start.split(':').map(Number);
      const [endHour, endMinute] = timeWindow.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Handle overnight time windows
      if (startMinutes <= endMinutes) {
        // Normal time window (e.g., 09:00 - 17:00)
        if (currentTimeMinutes < startMinutes || currentTimeMinutes > endMinutes) {
          return {
            allowed: false,
            reason: `Access only allowed between ${timeWindow.start} and ${timeWindow.end}`
          };
        }
      } else {
        // Overnight time window (e.g., 22:00 - 06:00)
        if (currentTimeMinutes < startMinutes && currentTimeMinutes > endMinutes) {
          return {
            allowed: false,
            reason: `Access only allowed between ${timeWindow.start} and ${timeWindow.end}`
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check IP range condition
   */
  private checkIPRange(ipRange: NonNullable<PermissionCondition['ipRange']>, ip: string): { allowed: boolean; reason?: string } {
    // Check denied list first
    if (ipRange.denied && ipRange.denied.length > 0) {
      if (this.isIPInRanges(ip, ipRange.denied)) {
        return {
          allowed: false,
          reason: 'IP address is in denied list'
        };
      }
    }

    // Check allowed list
    if (ipRange.allowed && ipRange.allowed.length > 0) {
      if (!this.isIPInRanges(ip, ipRange.allowed)) {
        return {
          allowed: false,
          reason: 'IP address not in allowed list'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if IP is in given CIDR ranges
   */
  private isIPInRanges(ip: string, ranges: string[]): boolean {
    for (const range of ranges) {
      if (this.isIPInRange(ip, range)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if IP is in a single CIDR range
   */
  private isIPInRange(ip: string, range: string): boolean {
    // Handle exact IP match
    if (!range.includes('/')) {
      return ip === range;
    }

    // Parse CIDR notation
    const [rangeIP, prefixStr] = range.split('/');
    const prefix = parseInt(prefixStr, 10);

    // Convert IPs to 32-bit numbers
    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(rangeIP);

    // Create mask
    const mask = ~((1 << (32 - prefix)) - 1);

    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Convert IP address to number
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  /**
   * Check resource ownership
   */
  private async checkOwnership(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    let owner: string | null = null;

    switch (resourceType) {
      case ResourceType.WORKFLOW:
        const workflow = await prisma.workflow.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        owner = workflow?.userId || null;
        break;

      case ResourceType.CREDENTIAL:
        const credential = await prisma.credential.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        owner = credential?.userId || null;
        break;

      default:
        // For other resource types, try a generic query
        break;
    }

    if (owner && owner === userId) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'User is not the owner of this resource'
    };
  }

  /**
   * Check team membership for resource
   */
  private async checkTeamMembership(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get resource's team
    let teamId: string | null = null;

    switch (resourceType) {
      case ResourceType.WORKFLOW:
        const workflow = await prisma.workflow.findUnique({
          where: { id: resourceId },
          select: { teamId: true }
        });
        teamId = workflow?.teamId || null;
        break;

      case ResourceType.CREDENTIAL:
        // Credentials don't have teamId in schema, check via shares or user's team
        return {
          allowed: false,
          reason: 'Credentials do not support team-based access'
        };

      default:
        break;
    }

    if (!teamId) {
      return {
        allowed: false,
        reason: 'Resource has no team association'
      };
    }

    // Check if user is a member of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId
      }
    });

    if (membership) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'User is not a member of the resource team'
    };
  }

  /**
   * Match attribute values (supports arrays for "any of" matching)
   */
  private matchAttributeValue(actual: unknown, expected: string | number | boolean | string[]): boolean {
    if (Array.isArray(expected)) {
      // If expected is array, actual must match any value
      return expected.includes(actual as string);
    }
    return actual === expected;
  }

  /**
   * Check credential sharing permissions
   */
  private async checkCredentialShare(
    userId: string,
    credentialId: string,
    action: string
  ): Promise<PermissionResult> {
    const share = await prisma.credentialShare.findFirst({
      where: {
        credentialId,
        sharedWithId: userId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (!share) {
      return { allowed: false };
    }

    // Check if max uses exceeded
    if (share.maxUses && share.usageCount >= share.maxUses) {
      return {
        allowed: false,
        reason: 'Maximum usage limit reached'
      };
    }

    // Map action to credential permission
    const permissionMap: Record<string, CredentialPermission> = {
      'read': CredentialPermission.READ,
      'use': CredentialPermission.USE,
      'edit': CredentialPermission.EDIT,
      'delete': CredentialPermission.DELETE,
      'share': CredentialPermission.SHARE
    };

    const requiredPermission = permissionMap[action];
    if (!requiredPermission) {
      return { allowed: false, reason: 'Invalid action' };
    }

    if (share.permissions.includes(requiredPermission) || share.permissions.includes(CredentialPermission.ADMIN)) {
      // Increment usage count
      await prisma.credentialShare.update({
        where: { id: share.id },
        data: { usageCount: { increment: 1 } }
      });

      return {
        allowed: true,
        reason: 'Credential shared with user',
        source: 'share'
      };
    }

    return { allowed: false };
  }

  /**
   * Check group permissions
   */
  private async checkGroupPermission(
    userId: string,
    resourceType: ResourceType,
    action: string
  ): Promise<PermissionResult> {
    // Get user's groups
    const groupMemberships = await prisma.userGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: { permissions: true }
        }
      }
    });

    for (const membership of groupMemberships) {
      const permissionString = `${resourceType}:${action}`;
      if (
        membership.group.permissions.includes(permissionString) ||
        membership.group.permissions.includes('*:*')
      ) {
        return {
          allowed: true,
          reason: 'Group permission',
          source: 'group'
        };
      }
    }

    return { allowed: false };
  }

  /**
   * Check team permissions
   */
  private async checkTeamPermission(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    action: string
  ): Promise<PermissionResult> {
    // Only check for workflows currently
    if (resourceType !== ResourceType.WORKFLOW) {
      return { allowed: false };
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: resourceId },
      include: {
        team: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!workflow?.team) {
      return { allowed: false };
    }

    const member = workflow.team.members[0];
    if (!member) {
      return { allowed: false };
    }

    // Team owner and admin have all permissions
    if (member.role === 'OWNER' || member.role === 'ADMIN') {
      return {
        allowed: true,
        reason: `Team ${member.role.toLowerCase()}`,
        source: 'team'
      };
    }

    // Members can read and execute
    if (member.role === 'MEMBER' && (action === 'read' || action === 'execute')) {
      return {
        allowed: true,
        reason: 'Team member',
        source: 'team'
      };
    }

    // Viewers can only read
    if (member.role === 'VIEWER' && action === 'read') {
      return {
        allowed: true,
        reason: 'Team viewer',
        source: 'team'
      };
    }

    return { allowed: false };
  }

  /**
   * Share credential with another user
   */
  async shareCredential(input: ShareCredentialInput): Promise<{
    success: boolean;
    shareId?: string;
    error?: string;
  }> {
    const { credentialId, ownerId, sharedWithId, permissions, expiresAt, maxUses } = input;

    // 1. Verify ownership
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      select: { userId: true, visibility: true }
    });

    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    if (credential.userId !== ownerId) {
      return { success: false, error: 'Not credential owner' };
    }

    // 2. Check if already shared
    const existingShare = await prisma.credentialShare.findUnique({
      where: {
        credentialId_sharedWithId: {
          credentialId,
          sharedWithId
        }
      }
    });

    if (existingShare) {
      // Update existing share
      const updated = await prisma.credentialShare.update({
        where: { id: existingShare.id },
        data: {
          permissions,
          expiresAt,
          maxUses,
          isActive: true,
          updatedAt: new Date()
        }
      });

      return { success: true, shareId: updated.id };
    }

    // 3. Create new share
    const share = await prisma.credentialShare.create({
      data: {
        credentialId,
        sharedWithId,
        sharedById: ownerId,
        permissions,
        expiresAt,
        maxUses
      }
    });

    // 4. Update share count
    await prisma.credential.update({
      where: { id: credentialId },
      data: {
        shareCount: { increment: 1 },
        visibility: CredentialVisibility.SHARED
      }
    });

    return { success: true, shareId: share.id };
  }

  /**
   * Revoke credential share
   */
  async revokeCredentialShare(
    credentialId: string,
    sharedWithId: string,
    ownerId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verify ownership
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      select: { userId: true }
    });

    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    if (credential.userId !== ownerId) {
      return { success: false, error: 'Not credential owner' };
    }

    // Deactivate share
    await prisma.credentialShare.updateMany({
      where: {
        credentialId,
        sharedWithId
      },
      data: { isActive: false }
    });

    // Update share count
    const activeShares = await prisma.credentialShare.count({
      where: {
        credentialId,
        isActive: true
      }
    });

    await prisma.credential.update({
      where: { id: credentialId },
      data: {
        shareCount: activeShares,
        visibility: activeShares > 0 ? CredentialVisibility.SHARED : CredentialVisibility.PRIVATE
      }
    });

    return { success: true };
  }

  /**
   * List users who have access to credential
   */
  async listCredentialAccess(credentialId: string, ownerId: string): Promise<{
    success: boolean;
    shares?: Array<{
      userId: string;
      email: string;
      permissions: CredentialPermission[];
      expiresAt?: Date;
      usageCount: number;
      maxUses?: number;
    }>;
    error?: string;
  }> {
    // Verify ownership
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      select: { userId: true }
    });

    if (!credential) {
      return { success: false, error: 'Credential not found' };
    }

    if (credential.userId !== ownerId) {
      return { success: false, error: 'Not credential owner' };
    }

    // Get all shares
    const shares = await prisma.credentialShare.findMany({
      where: {
        credentialId,
        isActive: true
      },
      include: {
        credential: {
          select: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Batch fetch all users to avoid N+1 query
    const userIds = shares.map(share => share.sharedWithId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true }
    });
    const usersMap = new Map(users.map(u => [u.id, u]));

    // Map to user info
    const result = shares.map(share => {
      const user = usersMap.get(share.sharedWithId);
      return {
        userId: share.sharedWithId,
        email: user?.email || 'Unknown',
        permissions: share.permissions,
        expiresAt: share.expiresAt || undefined,
        usageCount: share.usageCount,
        maxUses: share.maxUses || undefined
      };
    });

    return { success: true, shares: result };
  }

  /**
   * Grant direct resource permission
   */
  async grantResourcePermission(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    permissions: string[],
    grantedBy: string,
    expiresAt?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.resourcePermission.upsert({
        where: {
          userId_resourceType_resourceId: {
            userId,
            resourceType,
            resourceId
          }
        },
        update: {
          permissions,
          grantedBy,
          expiresAt,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          userId,
          resourceType,
          resourceId,
          permissions,
          grantedBy,
          expiresAt
        }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to grant permission'
      };
    }
  }

  /**
   * Revoke resource permission
   */
  async revokeResourcePermission(
    userId: string,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await prisma.resourcePermission.updateMany({
        where: {
          userId,
          resourceType,
          resourceId
        },
        data: { isActive: false }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke permission'
      };
    }
  }

  /**
   * Seed default role permissions
   */
  async seedRolePermissions(): Promise<void> {
    const defaultPermissions = [
      // ADMIN - full access
      { role: Role.ADMIN, resource: ResourceType.WORKFLOW, action: 'create' },
      { role: Role.ADMIN, resource: ResourceType.WORKFLOW, action: 'read' },
      { role: Role.ADMIN, resource: ResourceType.WORKFLOW, action: 'update' },
      { role: Role.ADMIN, resource: ResourceType.WORKFLOW, action: 'delete' },
      { role: Role.ADMIN, resource: ResourceType.WORKFLOW, action: 'execute' },
      { role: Role.ADMIN, resource: ResourceType.CREDENTIAL, action: 'create' },
      { role: Role.ADMIN, resource: ResourceType.CREDENTIAL, action: 'read' },
      { role: Role.ADMIN, resource: ResourceType.CREDENTIAL, action: 'update' },
      { role: Role.ADMIN, resource: ResourceType.CREDENTIAL, action: 'delete' },
      { role: Role.ADMIN, resource: ResourceType.CREDENTIAL, action: 'share' },

      // USER - standard access
      { role: Role.USER, resource: ResourceType.WORKFLOW, action: 'create' },
      { role: Role.USER, resource: ResourceType.WORKFLOW, action: 'read', conditions: { ownOnly: true } },
      { role: Role.USER, resource: ResourceType.WORKFLOW, action: 'update', conditions: { ownOnly: true } },
      { role: Role.USER, resource: ResourceType.WORKFLOW, action: 'delete', conditions: { ownOnly: true } },
      { role: Role.USER, resource: ResourceType.WORKFLOW, action: 'execute', conditions: { ownOnly: true } },
      { role: Role.USER, resource: ResourceType.CREDENTIAL, action: 'create' },
      { role: Role.USER, resource: ResourceType.CREDENTIAL, action: 'read', conditions: { ownOnly: true } },
      { role: Role.USER, resource: ResourceType.CREDENTIAL, action: 'update', conditions: { ownOnly: true } },
      { role: Role.USER, resource: ResourceType.CREDENTIAL, action: 'delete', conditions: { ownOnly: true } },
      { role: Role.USER, resource: ResourceType.CREDENTIAL, action: 'share', conditions: { ownOnly: true } },

      // VIEWER - read-only
      { role: Role.VIEWER, resource: ResourceType.WORKFLOW, action: 'read' },
      { role: Role.VIEWER, resource: ResourceType.CREDENTIAL, action: 'read' }
    ];

    // Batch upsert all role permissions in a single transaction to avoid N+1
    await prisma.$transaction(
      defaultPermissions.map(perm =>
        prisma.rolePermission.upsert({
          where: {
            role_resource_action: {
              role: perm.role,
              resource: perm.resource,
              action: perm.action
            }
          },
          update: {
            conditions: perm.conditions ? JSON.parse(JSON.stringify(perm.conditions)) : undefined
          },
          create: perm
        })
      )
    );
  }
}

// Singleton instance
let rbacServiceInstance: RBACService | null = null;

/**
 * Get singleton instance of RBACService
 */
export function getRBACService(): RBACService {
  if (!rbacServiceInstance) {
    rbacServiceInstance = new RBACService();
  }
  return rbacServiceInstance;
}
