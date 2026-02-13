/**
 * RBAC Service Test Suite
 *
 * Comprehensive tests for Role-Based Access Control
 * Covers: permission checking, credential sharing, groups, teams
 *
 * @group rbac
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, Role, ResourceType, CredentialPermission, CredentialType } from '@prisma/client';
import { RBACService, getRBACService } from '../../backend/services/RBACService';

const prisma = new PrismaClient();
const rbac = getRBACService();

// Test users
const testUsers = {
  admin: { id: 'admin-user', email: 'admin@test.com', role: Role.ADMIN },
  user1: { id: 'user-1', email: 'user1@test.com', role: Role.USER },
  user2: { id: 'user-2', email: 'user2@test.com', role: Role.USER },
  viewer: { id: 'viewer-user', email: 'viewer@test.com', role: Role.VIEWER }
};

// Test credential
let testCredentialId: string;

describe('RBAC Service Tests', () => {
  beforeAll(async () => {
    // Seed default role permissions
    await rbac.seedRolePermissions();

    // Create test users
    for (const user of Object.values(testUsers)) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: { ...user, passwordHash: 'test' }
      });
    }
  });

  afterAll(async () => {
    // Cleanup
    await prisma.credentialShare.deleteMany({ where: { sharedById: testUsers.user1.id } });
    await prisma.credential.deleteMany({ where: { userId: testUsers.user1.id } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(testUsers).map(u => u.id) } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create fresh test credential
    const cred = await prisma.credential.create({
      data: {
        userId: testUsers.user1.id,
        name: 'Test Credential',
        type: CredentialType.API_KEY,
        data: 'v1:abc:def:ghi',
        isEncrypted: true
      }
    });
    testCredentialId = cred.id;
  });

  describe('1. Permission Checking', () => {
    it('1.1 should allow owner full access', async () => {
      const result = await rbac.checkPermission({
        userId: testUsers.user1.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      expect(result.allowed).toBe(true);
      expect(result.source).toBe('direct');
      expect(result.reason).toContain('owner');
    });

    it('1.2 should allow ADMIN all permissions', async () => {
      const result = await rbac.checkPermission({
        userId: testUsers.admin.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'delete'
      });

      expect(result.allowed).toBe(true);
      expect(result.source).toBe('role');
    });

    it('1.3 should deny non-owner USER without share', async () => {
      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      expect(result.allowed).toBe(false);
    });

    it('1.4 should allow VIEWER read permission', async () => {
      // Grant read permission
      await rbac.grantResourcePermission(
        testUsers.viewer.id,
        ResourceType.CREDENTIAL,
        testCredentialId,
        ['read'],
        testUsers.user1.id
      );

      const result = await rbac.checkPermission({
        userId: testUsers.viewer.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      expect(result.allowed).toBe(true);
    });

    it('1.5 should deny VIEWER write permission', async () => {
      const result = await rbac.checkPermission({
        userId: testUsers.viewer.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'edit'
      });

      expect(result.allowed).toBe(false);
    });

    it('1.6 should handle non-existent resource', async () => {
      const result = await rbac.checkPermission({
        userId: testUsers.user1.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: 'non-existent-id',
        action: 'read'
      });

      expect(result.allowed).toBe(false);
    });

    it('1.7 should respect permission expiration', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await rbac.grantResourcePermission(
        testUsers.user2.id,
        ResourceType.CREDENTIAL,
        testCredentialId,
        ['read'],
        testUsers.user1.id,
        yesterday
      );

      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('2. Credential Sharing', () => {
    it('2.1 should share credential successfully', async () => {
      const result = await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.READ, CredentialPermission.USE]
      });

      expect(result.success).toBe(true);
      expect(result.shareId).toBeDefined();
    });

    it('2.2 should allow shared user to use credential', async () => {
      await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.READ, CredentialPermission.USE]
      });

      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'use'
      });

      expect(result.allowed).toBe(true);
      expect(result.source).toBe('share');
    });

    it('2.3 should deny shared user edit without permission', async () => {
      await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.READ]
      });

      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'edit'
      });

      expect(result.allowed).toBe(false);
    });

    it('2.4 should revoke credential share', async () => {
      await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.READ]
      });

      const revoke = await rbac.revokeCredentialShare(
        testCredentialId,
        testUsers.user2.id,
        testUsers.user1.id
      );

      expect(revoke.success).toBe(true);

      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      expect(result.allowed).toBe(false);
    });

    it('2.5 should list credential access', async () => {
      await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.READ]
      });

      const list = await rbac.listCredentialAccess(testCredentialId, testUsers.user1.id);

      expect(list.success).toBe(true);
      expect(list.shares).toHaveLength(1);
      expect(list.shares![0].userId).toBe(testUsers.user2.id);
    });

    it('2.6 should respect share expiration', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.READ],
        expiresAt: yesterday
      });

      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      expect(result.allowed).toBe(false);
    });

    it('2.7 should enforce usage limits', async () => {
      await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.READ],
        maxUses: 2
      });

      // Use 1
      await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      // Use 2
      await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      // Use 3 - should fail
      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('usage limit');
    });

    it('2.8 should allow ADMIN permission to all actions', async () => {
      await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.ADMIN]
      });

      const actions = ['read', 'use', 'edit', 'delete', 'share'];

      for (const action of actions) {
        const result = await rbac.checkPermission({
          userId: testUsers.user2.id,
          resourceType: ResourceType.CREDENTIAL,
          resourceId: testCredentialId,
          action
        });

        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('3. Resource Permissions', () => {
    it('3.1 should grant direct permission', async () => {
      const grant = await rbac.grantResourcePermission(
        testUsers.user2.id,
        ResourceType.CREDENTIAL,
        testCredentialId,
        ['read', 'use'],
        testUsers.user1.id
      );

      expect(grant.success).toBe(true);
    });

    it('3.2 should allow granted permissions', async () => {
      await rbac.grantResourcePermission(
        testUsers.user2.id,
        ResourceType.CREDENTIAL,
        testCredentialId,
        ['read', 'use'],
        testUsers.user1.id
      );

      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      expect(result.allowed).toBe(true);
      expect(result.source).toBe('direct');
    });

    it('3.3 should revoke permission', async () => {
      await rbac.grantResourcePermission(
        testUsers.user2.id,
        ResourceType.CREDENTIAL,
        testCredentialId,
        ['read'],
        testUsers.user1.id
      );

      const revoke = await rbac.revokeResourcePermission(
        testUsers.user2.id,
        ResourceType.CREDENTIAL,
        testCredentialId
      );

      expect(revoke.success).toBe(true);
    });

    it('3.4 should support wildcard permissions', async () => {
      await rbac.grantResourcePermission(
        testUsers.user2.id,
        ResourceType.CREDENTIAL,
        testCredentialId,
        ['*'],
        testUsers.user1.id
      );

      const result = await rbac.checkPermission({
        userId: testUsers.user2.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'any-action'
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('4. Performance & Edge Cases', () => {
    it('4.1 should handle concurrent permission checks', async () => {
      await rbac.shareCredential({
        credentialId: testCredentialId,
        ownerId: testUsers.user1.id,
        sharedWithId: testUsers.user2.id,
        permissions: [CredentialPermission.READ]
      });

      const checks = Array.from({ length: 100 }, () =>
        rbac.checkPermission({
          userId: testUsers.user2.id,
          resourceType: ResourceType.CREDENTIAL,
          resourceId: testCredentialId,
          action: 'read'
        })
      );

      const results = await Promise.all(checks);

      expect(results.every(r => r.allowed)).toBe(true);
    });

    it('4.2 should complete permission check quickly', async () => {
      const start = Date.now();

      await rbac.checkPermission({
        userId: testUsers.user1.id,
        resourceType: ResourceType.CREDENTIAL,
        resourceId: testCredentialId,
        action: 'read'
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});
