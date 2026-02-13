/**
 * Comprehensive tests for RBACService
 * Target coverage: >85% (statements, branches, functions, lines)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RBACService, Permission, Role, ResourceType } from '../../backend/auth/RBACService';

// Mock logger
vi.mock('../../services/LoggingService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock crypto for UUID generation
global.crypto = {
  randomUUID: () => 'grant-' + Math.random().toString(36).substring(7)
} as any;

describe('RBACService', () => {
  let rbacService: RBACService;
  const testUserId = 'user-123';
  const testTeamId = 'team-456';
  const testResourceId = 'resource-789';

  beforeEach(() => {
    rbacService = new RBACService();
    vi.clearAllMocks();
  });

  describe('Role Initialization', () => {
    it('should initialize all predefined roles', () => {
      expect(rbacService['roleDefinitions'].size).toBeGreaterThan(0);
      expect(rbacService['roleDefinitions'].has(Role.SUPER_ADMIN)).toBe(true);
      expect(rbacService['roleDefinitions'].has(Role.ADMIN)).toBe(true);
      expect(rbacService['roleDefinitions'].has(Role.MANAGER)).toBe(true);
      expect(rbacService['roleDefinitions'].has(Role.DEVELOPER)).toBe(true);
      expect(rbacService['roleDefinitions'].has(Role.USER)).toBe(true);
      expect(rbacService['roleDefinitions'].has(Role.VIEWER)).toBe(true);
      expect(rbacService['roleDefinitions'].has(Role.GUEST)).toBe(true);
    });

    it('should assign all permissions to SUPER_ADMIN role', () => {
      const superAdminRole = rbacService['roleDefinitions'].get(Role.SUPER_ADMIN);
      expect(superAdminRole).toBeDefined();
      expect(superAdminRole!.permissions.length).toBeGreaterThan(50);
      expect(superAdminRole!.permissions).toContain(Permission.SYSTEM_ADMIN);
      expect(superAdminRole!.permissions).toContain(Permission.WORKFLOW_DELETE);
      expect(superAdminRole!.permissions).toContain(Permission.USER_DELETE);
    });

    it('should assign appropriate permissions to ADMIN role', () => {
      const adminRole = rbacService['roleDefinitions'].get(Role.ADMIN);
      expect(adminRole).toBeDefined();
      expect(adminRole!.permissions).toContain(Permission.WORKFLOW_CREATE);
      expect(adminRole!.permissions).toContain(Permission.USER_CREATE);
      expect(adminRole!.permissions).toContain(Permission.CREDENTIAL_DELETE);
    });

    it('should assign limited permissions to VIEWER role', () => {
      const viewerRole = rbacService['roleDefinitions'].get(Role.VIEWER);
      expect(viewerRole).toBeDefined();
      expect(viewerRole!.permissions).toContain(Permission.WORKFLOW_READ);
      expect(viewerRole!.permissions).not.toContain(Permission.WORKFLOW_CREATE);
      expect(viewerRole!.permissions).not.toContain(Permission.WORKFLOW_DELETE);
    });

    it('should assign minimal permissions to GUEST role', () => {
      const guestRole = rbacService['roleDefinitions'].get(Role.GUEST);
      expect(guestRole).toBeDefined();
      expect(guestRole!.permissions.length).toBe(1);
      expect(guestRole!.permissions).toContain(Permission.WORKFLOW_READ);
    });
  });

  describe('Role Assignment', () => {
    it('should assign role to user', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);

      const roles = rbacService.getUserRoles(testUserId);
      expect(roles).toContain(Role.DEVELOPER);
    });

    it('should assign multiple roles to user', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);
      rbacService.assignRole(testUserId, Role.MANAGER);

      const roles = rbacService.getUserRoles(testUserId);
      expect(roles).toContain(Role.DEVELOPER);
      expect(roles).toContain(Role.MANAGER);
      expect(roles.length).toBe(2);
    });

    it('should not duplicate roles', () => {
      rbacService.assignRole(testUserId, Role.USER);
      rbacService.assignRole(testUserId, Role.USER);

      const roles = rbacService.getUserRoles(testUserId);
      expect(roles.filter(r => r === Role.USER).length).toBe(1);
    });

    it('should return empty array for user with no roles', () => {
      const roles = rbacService.getUserRoles('nonexistent-user');
      expect(roles).toEqual([]);
    });
  });

  describe('Role Removal', () => {
    it('should remove role from user', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);
      rbacService.assignRole(testUserId, Role.MANAGER);

      rbacService.removeRole(testUserId, Role.DEVELOPER);

      const roles = rbacService.getUserRoles(testUserId);
      expect(roles).not.toContain(Role.DEVELOPER);
      expect(roles).toContain(Role.MANAGER);
    });

    it('should handle removing non-existent role gracefully', () => {
      rbacService.assignRole(testUserId, Role.USER);
      rbacService.removeRole(testUserId, Role.ADMIN);

      const roles = rbacService.getUserRoles(testUserId);
      expect(roles).toContain(Role.USER);
    });

    it('should handle removing role from non-existent user gracefully', () => {
      rbacService.removeRole('nonexistent-user', Role.USER);
      // Should not throw error
    });
  });

  describe('Team Roles', () => {
    it('should assign team role to user', () => {
      rbacService.assignTeamRole(testUserId, testTeamId, Role.MANAGER);

      const teamRole = rbacService.getUserTeamRole(testUserId, testTeamId);
      expect(teamRole).toBe(Role.MANAGER);
    });

    it('should override previous team role', () => {
      rbacService.assignTeamRole(testUserId, testTeamId, Role.USER);
      rbacService.assignTeamRole(testUserId, testTeamId, Role.MANAGER);

      const teamRole = rbacService.getUserTeamRole(testUserId, testTeamId);
      expect(teamRole).toBe(Role.MANAGER);
    });

    it('should return null for user not in team', () => {
      const teamRole = rbacService.getUserTeamRole('nonexistent-user', testTeamId);
      expect(teamRole).toBeNull();
    });

    it('should handle multiple teams for same user', () => {
      const team1 = 'team-1';
      const team2 = 'team-2';

      rbacService.assignTeamRole(testUserId, team1, Role.ADMIN);
      rbacService.assignTeamRole(testUserId, team2, Role.DEVELOPER);

      expect(rbacService.getUserTeamRole(testUserId, team1)).toBe(Role.ADMIN);
      expect(rbacService.getUserTeamRole(testUserId, team2)).toBe(Role.DEVELOPER);
    });
  });

  describe('Permission Checking', () => {
    it('should grant permission based on user role', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);

      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_CREATE)).toBe(true);
      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_READ)).toBe(true);
      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_EXECUTE)).toBe(true);
    });

    it('should deny permission not in user role', () => {
      rbacService.assignRole(testUserId, Role.VIEWER);

      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_CREATE)).toBe(false);
      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_DELETE)).toBe(false);
      expect(rbacService.hasPermission(testUserId, Permission.USER_CREATE)).toBe(false);
    });

    it('should grant system admin permission only to SUPER_ADMIN', () => {
      rbacService.assignRole(testUserId, Role.ADMIN);
      expect(rbacService.hasPermission(testUserId, Permission.SYSTEM_ADMIN)).toBe(false);

      rbacService.assignRole(testUserId, Role.SUPER_ADMIN);
      expect(rbacService.hasPermission(testUserId, Permission.SYSTEM_ADMIN)).toBe(true);
    });

    it('should combine permissions from multiple roles', () => {
      rbacService.assignRole(testUserId, Role.VIEWER);
      rbacService.assignRole(testUserId, Role.USER);

      // Should have both viewer and user permissions
      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_READ)).toBe(true);
      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_CREATE)).toBe(true);
    });

    it('should include team role permissions', () => {
      rbacService.assignRole(testUserId, Role.VIEWER);
      rbacService.assignTeamRole(testUserId, testTeamId, Role.DEVELOPER);

      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_CREATE, {
        teamId: testTeamId
      })).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the permissions', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);

      const result = rbacService.hasAnyPermission(testUserId, [
        Permission.WORKFLOW_CREATE,
        Permission.USER_DELETE,
        Permission.SYSTEM_ADMIN
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      rbacService.assignRole(testUserId, Role.VIEWER);

      const result = rbacService.hasAnyPermission(testUserId, [
        Permission.WORKFLOW_CREATE,
        Permission.USER_DELETE,
        Permission.SYSTEM_ADMIN
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      rbacService.assignRole(testUserId, Role.ADMIN);

      const result = rbacService.hasAllPermissions(testUserId, [
        Permission.WORKFLOW_CREATE,
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_UPDATE
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user missing any permission', () => {
      rbacService.assignRole(testUserId, Role.USER);

      const result = rbacService.hasAllPermissions(testUserId, [
        Permission.WORKFLOW_CREATE,
        Permission.USER_DELETE
      ]);

      expect(result).toBe(false);
    });
  });

  describe('Custom Permission Grants', () => {
    it('should grant custom permission to user', () => {
      const grant = rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.WORKFLOW_DELETE,
        grantedBy: 'admin-123'
      });

      expect(grant.id).toBeTruthy();
      expect(grant.userId).toBe(testUserId);
      expect(grant.permission).toBe(Permission.WORKFLOW_DELETE);
      expect(grant.grantedAt).toBeInstanceOf(Date);
    });

    it('should grant resource-specific permission', () => {
      const grant = rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.WORKFLOW_UPDATE,
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        grantedBy: 'admin-123'
      });

      expect(grant.resourceType).toBe(ResourceType.WORKFLOW);
      expect(grant.resourceId).toBe(testResourceId);
    });

    it('should grant time-limited permission', () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const grant = rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.CREDENTIAL_USE,
        grantedBy: 'admin-123',
        expiresAt
      });

      expect(grant.expiresAt).toEqual(expiresAt);
    });

    it('should honor custom permission grants', () => {
      rbacService.assignRole(testUserId, Role.VIEWER);

      // Viewer doesn't have delete permission
      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_DELETE)).toBe(false);

      // Grant custom permission
      rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.WORKFLOW_DELETE,
        grantedBy: 'admin-123'
      });

      // Now should have permission
      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_DELETE)).toBe(true);
    });

    it('should ignore expired permission grants', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.WORKFLOW_DELETE,
        grantedBy: 'admin-123',
        expiresAt: pastDate
      });

      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_DELETE)).toBe(false);
    });

    it('should revoke permission grant', () => {
      const grant = rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.APIKEY_CREATE,
        grantedBy: 'admin-123'
      });

      expect(rbacService.hasPermission(testUserId, Permission.APIKEY_CREATE)).toBe(true);

      const revoked = rbacService.revokePermissionGrant(grant.id, testUserId);
      expect(revoked).toBe(true);

      expect(rbacService.hasPermission(testUserId, Permission.APIKEY_CREATE)).toBe(false);
    });

    it('should return false when revoking non-existent grant', () => {
      const revoked = rbacService.revokePermissionGrant('non-existent-id', testUserId);
      expect(revoked).toBe(false);
    });
  });

  describe('Resource Ownership', () => {
    it('should set resource ownership', () => {
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: testUserId,
        visibility: 'private'
      });

      const ownership = rbacService.getResourceOwnership(ResourceType.WORKFLOW, testResourceId);
      expect(ownership).toBeDefined();
      expect(ownership!.ownerId).toBe(testUserId);
      expect(ownership!.visibility).toBe('private');
    });

    it('should get resource ownership', () => {
      rbacService.setResourceOwnership({
        resourceType: ResourceType.CREDENTIAL,
        resourceId: 'cred-123',
        ownerId: testUserId,
        visibility: 'team',
        teamId: testTeamId
      });

      const ownership = rbacService.getResourceOwnership(ResourceType.CREDENTIAL, 'cred-123');
      expect(ownership).toBeDefined();
      expect(ownership!.teamId).toBe(testTeamId);
    });

    it('should return null for non-existent resource ownership', () => {
      const ownership = rbacService.getResourceOwnership(ResourceType.WORKFLOW, 'non-existent');
      expect(ownership).toBeNull();
    });
  });

  describe('Resource Access Control', () => {
    it('should grant access to resource owner', () => {
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: testUserId,
        visibility: 'private'
      });

      expect(rbacService.hasResourceAccess(testUserId, ResourceType.WORKFLOW, testResourceId)).toBe(true);
    });

    it('should deny access to non-owner for private resource', () => {
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: 'owner-123',
        visibility: 'private'
      });

      expect(rbacService.hasResourceAccess(testUserId, ResourceType.WORKFLOW, testResourceId)).toBe(false);
    });

    it('should grant access to public resources', () => {
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: 'owner-123',
        visibility: 'public'
      });

      expect(rbacService.hasResourceAccess(testUserId, ResourceType.WORKFLOW, testResourceId)).toBe(true);
    });

    it('should grant access to team members for team resources', () => {
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: 'owner-123',
        visibility: 'team',
        teamId: testTeamId
      });

      rbacService.assignTeamRole(testUserId, testTeamId, Role.DEVELOPER);

      expect(rbacService.hasResourceAccess(testUserId, ResourceType.WORKFLOW, testResourceId)).toBe(true);
    });

    it('should deny access to non-team members for team resources', () => {
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: 'owner-123',
        visibility: 'team',
        teamId: testTeamId
      });

      expect(rbacService.hasResourceAccess(testUserId, ResourceType.WORKFLOW, testResourceId)).toBe(false);
    });

    it('should grant system admin access to resources without ownership', () => {
      rbacService.assignRole(testUserId, Role.SUPER_ADMIN);

      expect(rbacService.hasResourceAccess(testUserId, ResourceType.WORKFLOW, 'any-resource')).toBe(true);
    });
  });

  describe('canPerformAction', () => {
    it('should allow action when user has permission and resource access', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: testUserId,
        visibility: 'private'
      });

      const canUpdate = rbacService.canPerformAction(
        testUserId,
        Permission.WORKFLOW_UPDATE,
        ResourceType.WORKFLOW,
        testResourceId
      );

      expect(canUpdate).toBe(true);
    });

    it('should deny action when user lacks permission', () => {
      rbacService.assignRole(testUserId, Role.VIEWER);
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: testUserId,
        visibility: 'private'
      });

      const canUpdate = rbacService.canPerformAction(
        testUserId,
        Permission.WORKFLOW_UPDATE,
        ResourceType.WORKFLOW,
        testResourceId
      );

      expect(canUpdate).toBe(false);
    });

    it('should deny action when user lacks resource access', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: testResourceId,
        ownerId: 'other-user',
        visibility: 'private'
      });

      const canUpdate = rbacService.canPerformAction(
        testUserId,
        Permission.WORKFLOW_UPDATE,
        ResourceType.WORKFLOW,
        testResourceId
      );

      expect(canUpdate).toBe(false);
    });
  });

  describe('getAccessibleResources', () => {
    it('should return all accessible resources of type', () => {
      // Create multiple resources
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: 'workflow-1',
        ownerId: testUserId,
        visibility: 'private'
      });

      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: 'workflow-2',
        ownerId: 'other-user',
        visibility: 'public'
      });

      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: 'workflow-3',
        ownerId: 'other-user',
        visibility: 'private'
      });

      const accessible = rbacService.getAccessibleResources(testUserId, ResourceType.WORKFLOW);

      expect(accessible).toContain('workflow-1'); // Owner
      expect(accessible).toContain('workflow-2'); // Public
      expect(accessible).not.toContain('workflow-3'); // Private, not owner
    });

    it('should filter by resource type', () => {
      rbacService.setResourceOwnership({
        resourceType: ResourceType.WORKFLOW,
        resourceId: 'workflow-1',
        ownerId: testUserId,
        visibility: 'public'
      });

      rbacService.setResourceOwnership({
        resourceType: ResourceType.CREDENTIAL,
        resourceId: 'cred-1',
        ownerId: testUserId,
        visibility: 'public'
      });

      const workflows = rbacService.getAccessibleResources(testUserId, ResourceType.WORKFLOW);
      const credentials = rbacService.getAccessibleResources(testUserId, ResourceType.CREDENTIAL);

      expect(workflows).toContain('workflow-1');
      expect(workflows).not.toContain('cred-1');
      expect(credentials).toContain('cred-1');
      expect(credentials).not.toContain('workflow-1');
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions from user roles', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);

      const permissions = rbacService.getUserPermissions(testUserId);

      expect(permissions.has(Permission.WORKFLOW_CREATE)).toBe(true);
      expect(permissions.has(Permission.WORKFLOW_READ)).toBe(true);
      expect(permissions.has(Permission.CREDENTIAL_CREATE)).toBe(true);
    });

    it('should combine permissions from multiple roles', () => {
      rbacService.assignRole(testUserId, Role.USER);
      rbacService.assignRole(testUserId, Role.VIEWER);

      const permissions = rbacService.getUserPermissions(testUserId);

      expect(permissions.size).toBeGreaterThan(0);
    });

    it('should include team role permissions when teamId provided', () => {
      rbacService.assignRole(testUserId, Role.VIEWER);
      rbacService.assignTeamRole(testUserId, testTeamId, Role.MANAGER);

      const permissions = rbacService.getUserPermissions(testUserId, testTeamId);

      expect(permissions.has(Permission.WORKFLOW_READ)).toBe(true);
      expect(permissions.has(Permission.TEAM_MANAGE_MEMBERS)).toBe(true);
    });

    it('should include custom permission grants', () => {
      rbacService.assignRole(testUserId, Role.VIEWER);
      rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.WORKFLOW_DELETE,
        grantedBy: 'admin-123'
      });

      const permissions = rbacService.getUserPermissions(testUserId);

      expect(permissions.has(Permission.WORKFLOW_DELETE)).toBe(true);
    });
  });

  describe('cleanupExpiredGrants', () => {
    it('should remove expired permission grants', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);

      rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.WORKFLOW_DELETE,
        grantedBy: 'admin-123',
        expiresAt: pastDate
      });

      const cleaned = rbacService.cleanupExpiredGrants();

      expect(cleaned).toBe(1);
    });

    it('should keep valid grants', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);

      rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.WORKFLOW_DELETE,
        grantedBy: 'admin-123',
        expiresAt: futureDate
      });

      rbacService.cleanupExpiredGrants();

      expect(rbacService.hasPermission(testUserId, Permission.WORKFLOW_DELETE)).toBe(true);
    });

    it('should return count of cleaned grants', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);

      rbacService.grantPermission({
        userId: 'user-1',
        permission: Permission.WORKFLOW_DELETE,
        grantedBy: 'admin-123',
        expiresAt: pastDate
      });

      rbacService.grantPermission({
        userId: 'user-2',
        permission: Permission.CREDENTIAL_DELETE,
        grantedBy: 'admin-123',
        expiresAt: pastDate
      });

      const cleaned = rbacService.cleanupExpiredGrants();
      expect(cleaned).toBe(2);
    });
  });

  describe('exportUserPermissions', () => {
    it('should export complete user permission profile', () => {
      rbacService.assignRole(testUserId, Role.DEVELOPER);
      rbacService.assignRole(testUserId, Role.MANAGER);
      rbacService.assignTeamRole(testUserId, testTeamId, Role.ADMIN);
      rbacService.grantPermission({
        userId: testUserId,
        permission: Permission.SYSTEM_ADMIN,
        grantedBy: 'super-admin'
      });

      const exported = rbacService.exportUserPermissions(testUserId);

      expect(exported.userId).toBe(testUserId);
      expect(exported.roles).toContain(Role.DEVELOPER);
      expect(exported.roles).toContain(Role.MANAGER);
      expect(exported.permissions).toContain(Permission.WORKFLOW_CREATE);
      expect(exported.permissions).toContain(Permission.SYSTEM_ADMIN);
      expect(exported.teamRoles).toHaveLength(1);
      expect(exported.teamRoles[0].teamId).toBe(testTeamId);
      expect(exported.teamRoles[0].role).toBe(Role.ADMIN);
      expect(exported.grants).toHaveLength(1);
    });

    it('should export empty profile for user with no permissions', () => {
      const exported = rbacService.exportUserPermissions('new-user');

      expect(exported.userId).toBe('new-user');
      expect(exported.roles).toEqual([]);
      expect(exported.permissions).toEqual([]);
      expect(exported.grants).toEqual([]);
      expect(exported.teamRoles).toEqual([]);
    });
  });

  describe('Permission Enum Coverage', () => {
    it('should have workflow permissions', () => {
      expect(Permission.WORKFLOW_CREATE).toBeDefined();
      expect(Permission.WORKFLOW_READ).toBeDefined();
      expect(Permission.WORKFLOW_UPDATE).toBeDefined();
      expect(Permission.WORKFLOW_DELETE).toBeDefined();
      expect(Permission.WORKFLOW_EXECUTE).toBeDefined();
      expect(Permission.WORKFLOW_SHARE).toBeDefined();
      expect(Permission.WORKFLOW_PUBLISH).toBeDefined();
    });

    it('should have credential permissions', () => {
      expect(Permission.CREDENTIAL_CREATE).toBeDefined();
      expect(Permission.CREDENTIAL_READ).toBeDefined();
      expect(Permission.CREDENTIAL_UPDATE).toBeDefined();
      expect(Permission.CREDENTIAL_DELETE).toBeDefined();
    });

    it('should have user management permissions', () => {
      expect(Permission.USER_CREATE).toBeDefined();
      expect(Permission.USER_READ).toBeDefined();
      expect(Permission.USER_UPDATE).toBeDefined();
      expect(Permission.USER_DELETE).toBeDefined();
    });

    it('should have system administration permissions', () => {
      expect(Permission.SYSTEM_ADMIN).toBeDefined();
      expect(Permission.SYSTEM_SETTINGS).toBeDefined();
      expect(Permission.AUDIT_READ).toBeDefined();
    });
  });

  describe('Role Hierarchy', () => {
    it('should respect role hierarchy in permissions', () => {
      const superAdminPerms = rbacService['roleDefinitions'].get(Role.SUPER_ADMIN)!.permissions;
      const adminPerms = rbacService['roleDefinitions'].get(Role.ADMIN)!.permissions;
      const developerPerms = rbacService['roleDefinitions'].get(Role.DEVELOPER)!.permissions;
      const viewerPerms = rbacService['roleDefinitions'].get(Role.VIEWER)!.permissions;

      expect(superAdminPerms.length).toBeGreaterThan(adminPerms.length);
      expect(adminPerms.length).toBeGreaterThan(developerPerms.length);
      expect(developerPerms.length).toBeGreaterThan(viewerPerms.length);
    });
  });
});
