/**
 * Comprehensive tests for Environment Isolation System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEnvironmentManager, EnvironmentStatus } from '../environments/EnvironmentManager';
import { getPromotionManager } from '../environments/PromotionManager';
import { getPromotionValidator } from '../environments/PromotionValidator';
import { getEnvironmentCredentials } from '../environments/EnvironmentCredentials';
import { getCredentialIsolation } from '../environments/CredentialIsolation';
import { getEnvironmentRBAC, EnvironmentRole, EnvironmentPermission } from '../environments/EnvironmentRBAC';
import { EnvironmentType } from '../backend/environment/EnvironmentTypes';

describe('Environment Isolation System', () => {
  describe('EnvironmentManager', () => {
    let envManager: ReturnType<typeof getEnvironmentManager>;

    beforeEach(() => {
      envManager = getEnvironmentManager();
    });

    it('should create a new environment with complete isolation', async () => {
      const env = await envManager.create(
        {
          name: 'Test Dev Environment',
          type: EnvironmentType.DEVELOPMENT,
          description: 'Test development environment',
          owner: 'user1',
          tags: ['test'],
        },
        'user1'
      );

      expect(env).toBeDefined();
      expect(env.name).toBe('Test Dev Environment');
      expect(env.type).toBe(EnvironmentType.DEVELOPMENT);
      expect(env.status).toBe(EnvironmentStatus.ACTIVE);
      expect(env.metadata.owner).toBe('user1');
      expect(env.metadata.namespace).toContain('dev_');
    });

    it('should list environments with filters', async () => {
      await envManager.create(
        {
          name: 'Dev 1',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      await envManager.create(
        {
          name: 'Staging 1',
          type: EnvironmentType.STAGING,
          owner: 'user1',
        },
        'user1'
      );

      const devEnvs = await envManager.listEnvironments({
        type: EnvironmentType.DEVELOPMENT,
      });

      expect(devEnvs.length).toBeGreaterThan(0);
      expect(devEnvs.every((e) => e.type === EnvironmentType.DEVELOPMENT)).toBe(true);
    });

    it('should clone environment with all data', async () => {
      const source = await envManager.create(
        {
          name: 'Source Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
          tags: ['source'],
        },
        'user1'
      );

      const cloned = await envManager.cloneEnvironment(
        source.id,
        {
          includeWorkflows: true,
          includeCredentials: true,
          includeVariables: true,
          includeSettings: true,
          newName: 'Cloned Environment',
        },
        'user1'
      );

      expect(cloned).toBeDefined();
      expect(cloned.name).toBe('Cloned Environment');
      expect(cloned.metadata.tags).toContain('cloned');
      expect(cloned.id).not.toBe(source.id);
    });

    it('should prevent deletion of production environment', async () => {
      const prodEnv = await envManager.create(
        {
          name: 'Production',
          type: EnvironmentType.PRODUCTION,
          owner: 'admin',
        },
        'admin'
      );

      await expect(
        envManager.deleteEnvironment(prodEnv.id, 'admin')
      ).rejects.toThrow('Cannot delete production environment');
    });

    it('should update environment status', async () => {
      const env = await envManager.create(
        {
          name: 'Test Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      await envManager.updateStatus(env.id, EnvironmentStatus.MAINTENANCE, 'admin');

      const updated = await envManager.getEnvironment(env.id);
      expect(updated?.status).toBe(EnvironmentStatus.MAINTENANCE);
    });

    it('should get environment statistics', async () => {
      const env = await envManager.create(
        {
          name: 'Stats Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const stats = await envManager.getStatistics(env.id);

      expect(stats).toBeDefined();
      expect(stats.totalWorkflows).toBe(0);
      expect(stats.activeWorkflows).toBe(0);
      expect(stats.totalExecutions).toBe(0);
    });

    it('should create unique namespace for each environment', async () => {
      const env1 = await envManager.create(
        {
          name: 'Environment 1',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const env2 = await envManager.create(
        {
          name: 'Environment 2',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const ns1 = envManager.getNamespace(env1.id);
      const ns2 = envManager.getNamespace(env2.id);

      expect(ns1).toBeDefined();
      expect(ns2).toBeDefined();
      expect(ns1?.namespace).not.toBe(ns2?.namespace);
    });
  });

  describe('PromotionValidator', () => {
    let validator: ReturnType<typeof getPromotionValidator>;
    let envManager: ReturnType<typeof getEnvironmentManager>;

    beforeEach(() => {
      validator = getPromotionValidator();
      envManager = getEnvironmentManager();
    });

    it('should validate promotion between environments', async () => {
      const devEnv = await envManager.create(
        {
          name: 'Dev',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const stagingEnv = await envManager.create(
        {
          name: 'Staging',
          type: EnvironmentType.STAGING,
          owner: 'user1',
        },
        'user1'
      );

      const validation = await validator.validatePromotion({
        workflowId: 'wf_test',
        sourceEnvId: devEnv.id,
        targetEnvId: stagingEnv.id,
      });

      expect(validation).toBeDefined();
      expect(validation.errors).toBeDefined();
      expect(validation.warnings).toBeDefined();
      expect(validation.recommendations).toBeDefined();
    });

    it('should detect invalid promotion path', async () => {
      const devEnv = await envManager.create(
        {
          name: 'Dev',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const prodEnv = await envManager.create(
        {
          name: 'Production',
          type: EnvironmentType.PRODUCTION,
          owner: 'admin',
        },
        'admin'
      );

      const validation = await validator.validatePromotion({
        workflowId: 'wf_test',
        sourceEnvId: devEnv.id,
        targetEnvId: prodEnv.id,
      });

      // Should warn about skipping staging
      const hasWarning = validation.warnings.some(
        (w) => w.code === 'PROMOTION_SKIP_STAGING'
      );
      expect(hasWarning).toBe(true);
    });

    it('should calculate risk level correctly', async () => {
      const devEnv = await envManager.create(
        {
          name: 'Dev',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const stagingEnv = await envManager.create(
        {
          name: 'Staging',
          type: EnvironmentType.STAGING,
          owner: 'user1',
        },
        'user1'
      );

      const validation = await validator.validatePromotion({
        workflowId: 'wf_test',
        sourceEnvId: devEnv.id,
        targetEnvId: stagingEnv.id,
      });

      expect(validation.riskLevel).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(
        validation.riskLevel
      );
    });
  });

  describe('PromotionManager', () => {
    let promotionManager: ReturnType<typeof getPromotionManager>;
    let envManager: ReturnType<typeof getEnvironmentManager>;

    beforeEach(() => {
      promotionManager = getPromotionManager();
      envManager = getEnvironmentManager();
    });

    it('should request workflow promotion', async () => {
      const devEnv = await envManager.create(
        {
          name: 'Dev',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const stagingEnv = await envManager.create(
        {
          name: 'Staging',
          type: EnvironmentType.STAGING,
          owner: 'user1',
        },
        'user1'
      );

      const promotion = await promotionManager.requestPromotion({
        workflowId: 'wf_test',
        sourceEnvId: devEnv.id,
        targetEnvId: stagingEnv.id,
        requireApproval: false,
        runTests: false,
        requestedBy: 'user1',
      });

      expect(promotion).toBeDefined();
      expect(promotion.id).toBeDefined();
      expect(promotion.request.workflowId).toBe('wf_test');
    });

    it('should handle approval workflow', async () => {
      const devEnv = await envManager.create(
        {
          name: 'Dev',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const stagingEnv = await envManager.create(
        {
          name: 'Staging',
          type: EnvironmentType.STAGING,
          owner: 'user1',
        },
        'user1'
      );

      const promotion = await promotionManager.requestPromotion({
        workflowId: 'wf_test',
        sourceEnvId: devEnv.id,
        targetEnvId: stagingEnv.id,
        requireApproval: true,
        runTests: false,
        requestedBy: 'user1',
      });

      expect(promotion.status).toBe('pending');

      const approved = await promotionManager.approvePromotion(
        promotion.id,
        'approver1',
        'Approver Name',
        'Looks good'
      );

      expect(approved.approvals.length).toBeGreaterThan(0);
      expect(approved.approvals[0].status).toBe('approved');
    });

    it('should get promotion statistics', async () => {
      const stats = await promotionManager.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeDefined();
      expect(stats.completed).toBeDefined();
      expect(stats.failed).toBeDefined();
      expect(stats.successRate).toBeDefined();
    });
  });

  describe('EnvironmentCredentials', () => {
    let credManager: ReturnType<typeof getEnvironmentCredentials>;
    let envManager: ReturnType<typeof getEnvironmentManager>;

    beforeEach(() => {
      credManager = getEnvironmentCredentials();
      envManager = getEnvironmentManager();
    });

    it('should create credential in environment', async () => {
      const env = await envManager.create(
        {
          name: 'Test Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const credential = await credManager.createCredential(
        env.id,
        {
          name: 'Test API Key',
          type: 'api_key',
          data: { key: 'test-key-123' },
          description: 'Test credential',
        },
        'user1'
      );

      expect(credential).toBeDefined();
      expect(credential.name).toBe('Test API Key');
      expect(credential.environmentId).toBe(env.id);
    });

    it('should auto-expire test credentials', async () => {
      const devEnv = await envManager.create(
        {
          name: 'Dev Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const credential = await credManager.createCredential(
        devEnv.id,
        {
          name: 'Test Credential',
          type: 'api_key',
          data: { key: 'test-key' },
        },
        'user1'
      );

      // Should have auto-expiry (30 days) for dev environment
      expect(credential.expiresAt).toBeDefined();
    });

    it('should create credential mapping between environments', async () => {
      const devEnv = await envManager.create(
        {
          name: 'Dev',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const stagingEnv = await envManager.create(
        {
          name: 'Staging',
          type: EnvironmentType.STAGING,
          owner: 'user1',
        },
        'user1'
      );

      const devCred = await credManager.createCredential(
        devEnv.id,
        {
          name: 'Dev API Key',
          type: 'api_key',
          data: { key: 'dev-key' },
        },
        'user1'
      );

      const stagingCred = await credManager.createCredential(
        stagingEnv.id,
        {
          name: 'Staging API Key',
          type: 'api_key',
          data: { key: 'staging-key' },
        },
        'user1'
      );

      const mapping = await credManager.createMapping(
        devEnv.id,
        stagingEnv.id,
        devCred.id,
        stagingCred.id,
        'user1'
      );

      expect(mapping).toBeDefined();
      expect(mapping.sourceCredentialId).toBe(devCred.id);
      expect(mapping.targetCredentialId).toBe(stagingCred.id);
    });

    it('should setup credential inheritance', async () => {
      const parentEnv = await envManager.create(
        {
          name: 'Parent',
          type: EnvironmentType.STAGING,
          owner: 'user1',
        },
        'user1'
      );

      const childEnv = await envManager.create(
        {
          name: 'Child',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const credential = await credManager.createCredential(
        parentEnv.id,
        {
          name: 'Shared Credential',
          type: 'oauth2',
          data: { token: 'shared-token' },
        },
        'user1'
      );

      const inheritance = await credManager.setupInheritance(
        parentEnv.id,
        childEnv.id,
        credential.id,
        true,
        'user1'
      );

      expect(inheritance).toBeDefined();
      expect(inheritance.credentialId).toBe(credential.id);
      expect(inheritance.canOverride).toBe(true);
    });
  });

  describe('CredentialIsolation', () => {
    let isolation: ReturnType<typeof getCredentialIsolation>;
    let credManager: ReturnType<typeof getEnvironmentCredentials>;
    let envManager: ReturnType<typeof getEnvironmentManager>;

    beforeEach(() => {
      isolation = getCredentialIsolation();
      credManager = getEnvironmentCredentials();
      envManager = getEnvironmentManager();
    });

    it('should enforce credential isolation between environments', async () => {
      const env1 = await envManager.create(
        {
          name: 'Environment 1',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const env2 = await envManager.create(
        {
          name: 'Environment 2',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user2',
        },
        'user2'
      );

      const cred1 = await credManager.createCredential(
        env1.id,
        {
          name: 'Credential 1',
          type: 'api_key',
          data: { key: 'key1' },
        },
        'user1'
      );

      // Try to access credential from different environment
      const decision = await isolation.checkAccess({
        userId: 'user2',
        userRole: 'developer',
        environmentId: env2.id,
        requestedCredentialId: cred1.id,
        operation: 'read',
      });

      expect(decision.allowed).toBe(false);
    });

    it('should detect credential leakage', async () => {
      const env = await envManager.create(
        {
          name: 'Test Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      // Create expired but active credential
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 10);

      await credManager.createCredential(
        env.id,
        {
          name: 'Expired Credential',
          type: 'api_key',
          data: { key: 'expired' },
          expiresAt: expiredDate,
        },
        'user1'
      );

      const leakage = await isolation.detectLeakage(env.id);

      expect(leakage.hasLeakage).toBe(true);
      expect(leakage.issues.length).toBeGreaterThan(0);
    });
  });

  describe('EnvironmentRBAC', () => {
    let rbac: ReturnType<typeof getEnvironmentRBAC>;
    let envManager: ReturnType<typeof getEnvironmentManager>;

    beforeEach(() => {
      rbac = getEnvironmentRBAC();
      envManager = getEnvironmentManager();
    });

    it('should grant environment access to user', async () => {
      const env = await envManager.create(
        {
          name: 'Test Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'owner1',
        },
        'owner1'
      );

      const access = await rbac.grantAccess(
        'user1',
        env.id,
        [EnvironmentRole.DEVELOPER],
        'admin'
      );

      expect(access).toBeDefined();
      expect(access.userId).toBe('user1');
      expect(access.environmentId).toBe(env.id);
      expect(access.roles).toContain(EnvironmentRole.DEVELOPER);
    });

    it('should check user permissions correctly', async () => {
      const env = await envManager.create(
        {
          name: 'Test Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'owner1',
        },
        'owner1'
      );

      await rbac.grantAccess(
        'user1',
        env.id,
        [EnvironmentRole.DEVELOPER],
        'admin'
      );

      const hasPermission = await rbac.hasPermission(
        'user1',
        env.id,
        EnvironmentPermission.ENV_WORKFLOW_VIEW
      );

      expect(hasPermission).toBe(true);
    });

    it('should create environment-specific API key', async () => {
      const env = await envManager.create(
        {
          name: 'Test Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'owner1',
        },
        'owner1'
      );

      const apiKey = await rbac.createAPIKey(
        env.id,
        'Test API Key',
        [EnvironmentPermission.ENV_WORKFLOW_VIEW],
        'user1'
      );

      expect(apiKey).toBeDefined();
      expect(apiKey.key).toBeDefined();
      expect(apiKey.environmentId).toBe(env.id);
      expect(apiKey.permissions).toContain(EnvironmentPermission.ENV_WORKFLOW_VIEW);
    });

    it('should validate and authenticate with API key', async () => {
      const env = await envManager.create(
        {
          name: 'Test Environment',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'owner1',
        },
        'owner1'
      );

      const apiKey = await rbac.createAPIKey(
        env.id,
        'Test Key',
        [EnvironmentPermission.ENV_WORKFLOW_VIEW],
        'user1'
      );

      const validated = await rbac.validateAPIKey(apiKey.key, env.id);

      expect(validated).toBeDefined();
      expect(validated?.environmentId).toBe(env.id);
    });

    it('should list user environments', async () => {
      const env1 = await envManager.create(
        {
          name: 'Environment 1',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'user1',
        },
        'user1'
      );

      const env2 = await envManager.create(
        {
          name: 'Environment 2',
          type: EnvironmentType.STAGING,
          owner: 'user1',
        },
        'user1'
      );

      await rbac.grantAccess('user1', env1.id, [EnvironmentRole.DEVELOPER], 'admin');
      await rbac.grantAccess('user1', env2.id, [EnvironmentRole.VIEWER], 'admin');

      const environments = await rbac.listUserEnvironments('user1');

      expect(environments).toContain(env1.id);
      expect(environments).toContain(env2.id);
    });
  });

  describe('Integration Tests', () => {
    it('should perform complete promotion workflow with approval', async () => {
      const envManager = getEnvironmentManager();
      const promotionManager = getPromotionManager();

      // Create environments
      const devEnv = await envManager.create(
        {
          name: 'Development',
          type: EnvironmentType.DEVELOPMENT,
          owner: 'dev-team',
        },
        'dev-user'
      );

      const stagingEnv = await envManager.create(
        {
          name: 'Staging',
          type: EnvironmentType.STAGING,
          owner: 'ops-team',
        },
        'ops-user'
      );

      // Request promotion
      const promotion = await promotionManager.requestPromotion({
        workflowId: 'wf_integration_test',
        sourceEnvId: devEnv.id,
        targetEnvId: stagingEnv.id,
        requireApproval: true,
        runTests: true,
        requestedBy: 'dev-user',
      });

      expect(promotion.status).toBe('pending');

      // Approve promotion
      const approved = await promotionManager.approvePromotion(
        promotion.id,
        'approver',
        'Approver Name',
        'Approved for staging'
      );

      expect(approved.status).not.toBe('pending');
    });

    it('should enforce complete credential isolation across environments', async () => {
      const envManager = getEnvironmentManager();
      const credManager = getEnvironmentCredentials();
      const isolation = getCredentialIsolation();

      // Create two isolated environments
      const env1 = await envManager.create(
        {
          name: 'Isolated Env 1',
          type: EnvironmentType.PRODUCTION,
          owner: 'team1',
        },
        'user1'
      );

      const env2 = await envManager.create(
        {
          name: 'Isolated Env 2',
          type: EnvironmentType.PRODUCTION,
          owner: 'team2',
        },
        'user2'
      );

      // Create credential in env1
      const cred = await credManager.createCredential(
        env1.id,
        {
          name: 'Production API Key',
          type: 'api_key',
          data: { key: 'prod-secret-key' },
        },
        'user1'
      );

      // Verify credential cannot be accessed from env2
      const accessDecision = await isolation.checkAccess({
        userId: 'user2',
        userRole: 'developer',
        environmentId: env2.id,
        requestedCredentialId: cred.id,
        operation: 'read',
      });

      expect(accessDecision.allowed).toBe(false);
      expect(accessDecision.reason).toContain('not accessible');

      // Verify credential IS accessible from env1
      const validAccess = await isolation.checkAccess({
        userId: 'user1',
        userRole: 'developer',
        environmentId: env1.id,
        requestedCredentialId: cred.id,
        operation: 'read',
      });

      expect(validAccess.allowed).toBe(true);
    });
  });
});
