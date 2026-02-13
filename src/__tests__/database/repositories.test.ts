/**
 * Database Repositories Integration Tests
 * Tests all repository operations with real database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  userRepository,
  workflowRepository,
  executionRepository,
  credentialRepository,
  webhookRepository,
  analyticsRepository,
} from '../../backend/database/repositories';
import { prisma, connectWithRetry, disconnectDatabase } from '../../backend/database/prisma';
import { Role, WorkflowStatus, ExecutionStatus, CredentialType, HttpMethod } from '@prisma/client';

describe('Database Repositories', () => {
  let testUserId: string;
  let testWorkflowId: string;
  let testExecutionId: string;
  let testCredentialId: string;
  let testWebhookId: string;

  beforeAll(async () => {
    // Connect to test database
    await connectWithRetry(3, 1000);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.workflowExecution.deleteMany({ where: { userId: testUserId } });
    await prisma.workflow.deleteMany({ where: { userId: testUserId } });
    await prisma.credential.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
    await disconnectDatabase();
  });

  describe('UserRepository', () => {
    it('should create a new user', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        role: Role.USER,
      };

      const user = await userRepository.create(userData);
      testUserId = user.id;

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.firstName).toBe(userData.firstName);
      expect(user.role).toBe(Role.USER);
    });

    it('should find user by email', async () => {
      const user = await userRepository.findById(testUserId);
      expect(user).toBeDefined();

      if (user) {
        const foundUser = await userRepository.findByEmail(user.email);
        expect(foundUser).toBeDefined();
        expect(foundUser?.id).toBe(testUserId);
      }
    });

    it('should update user', async () => {
      const updatedUser = await userRepository.update(testUserId, {
        firstName: 'Updated',
        emailVerified: true,
      });

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.emailVerified).toBe(true);
    });

    it('should handle failed login attempts', async () => {
      await userRepository.recordFailedLogin(testUserId);
      await userRepository.recordFailedLogin(testUserId);

      const user = await userRepository.findById(testUserId);
      expect(user?.failedLoginAttempts).toBe(2);
    });

    it('should reset failed logins', async () => {
      await userRepository.resetFailedLogins(testUserId);

      const user = await userRepository.findById(testUserId);
      expect(user?.failedLoginAttempts).toBe(0);
    });

    it('should get user statistics', async () => {
      const stats = await userRepository.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.active).toBe('number');
    });
  });

  describe('WorkflowRepository', () => {
    it('should create a new workflow', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test workflow description',
        nodes: [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        userId: testUserId,
        tags: ['test'],
      };

      const workflow = await workflowRepository.create(workflowData);
      testWorkflowId = workflow.id;

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe(workflowData.name);
      expect(workflow.userId).toBe(testUserId);
      expect(workflow.status).toBe(WorkflowStatus.DRAFT);
    });

    it('should find workflows by user', async () => {
      const result = await workflowRepository.findByUser(testUserId);

      expect(result.workflows).toBeDefined();
      expect(result.workflows.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should update workflow', async () => {
      const updated = await workflowRepository.update(
        testWorkflowId,
        {
          name: 'Updated Workflow',
          status: WorkflowStatus.ACTIVE,
        },
        testUserId
      );

      expect(updated.name).toBe('Updated Workflow');
      expect(updated.status).toBe(WorkflowStatus.ACTIVE);
    });

    it('should get workflow versions', async () => {
      const versions = await workflowRepository.getVersions(testWorkflowId);

      expect(versions).toBeDefined();
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].version).toBe(1);
    });

    it('should duplicate workflow', async () => {
      const duplicate = await workflowRepository.duplicate(
        testWorkflowId,
        testUserId,
        'Duplicated Workflow'
      );

      expect(duplicate).toBeDefined();
      expect(duplicate?.name).toBe('Duplicated Workflow');
      expect(duplicate?.status).toBe(WorkflowStatus.DRAFT);

      // Cleanup
      if (duplicate) {
        await workflowRepository.delete(duplicate.id);
      }
    });

    it('should get workflow statistics', async () => {
      const stats = await workflowRepository.getStatistics(testUserId);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.active).toBe('number');
    });
  });

  describe('ExecutionRepository', () => {
    it('should create execution', async () => {
      const executionData = {
        workflowId: testWorkflowId,
        userId: testUserId,
        trigger: { type: 'manual', timestamp: new Date() },
        input: { test: 'data' },
      };

      const execution = await executionRepository.createExecution(executionData);
      testExecutionId = execution.id;

      expect(execution).toBeDefined();
      expect(execution.workflowId).toBe(testWorkflowId);
      expect(execution.status).toBe(ExecutionStatus.PENDING);
    });

    it('should update execution', async () => {
      const updated = await executionRepository.updateExecution(testExecutionId, {
        status: ExecutionStatus.SUCCESS,
        finishedAt: new Date(),
        output: { result: 'success' },
      });

      expect(updated.status).toBe(ExecutionStatus.SUCCESS);
      expect(updated.finishedAt).toBeDefined();
    });

    it('should find execution by ID', async () => {
      const execution = await executionRepository.findById(testExecutionId);

      expect(execution).toBeDefined();
      expect(execution?.id).toBe(testExecutionId);
    });

    it('should find executions by workflow', async () => {
      const result = await executionRepository.findByWorkflow(testWorkflowId);

      expect(result.executions).toBeDefined();
      expect(result.executions.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should get execution statistics', async () => {
      const stats = await executionRepository.getStatistics(testWorkflowId);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.success).toBe('number');
    });
  });

  describe('CredentialRepository', () => {
    it('should create encrypted credential', async () => {
      const credentialData = {
        userId: testUserId,
        name: 'Test API Key',
        type: CredentialType.API_KEY,
        data: {
          apiKey: 'secret_key_12345',
          endpoint: 'https://api.example.com',
        },
        description: 'Test credential',
      };

      const credential = await credentialRepository.create(credentialData);
      testCredentialId = credential.id;

      expect(credential).toBeDefined();
      expect(credential.name).toBe(credentialData.name);
      expect(credential.data).not.toBe(JSON.stringify(credentialData.data)); // Should be encrypted
    });

    it('should decrypt credential data', async () => {
      const decrypted = await credentialRepository.findByIdDecrypted(
        testCredentialId,
        testUserId
      );

      expect(decrypted).toBeDefined();
      expect(decrypted?.data).toBeDefined();
      expect(decrypted?.data.apiKey).toBe('secret_key_12345');
    });

    it('should find credentials by user', async () => {
      const result = await credentialRepository.findByUser(testUserId);

      expect(result.credentials).toBeDefined();
      expect(result.credentials.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should validate active credential', async () => {
      const isValid = await credentialRepository.isValid(testCredentialId);

      expect(isValid).toBe(true);
    });

    it('should get credential statistics', async () => {
      const stats = await credentialRepository.getStatistics(testUserId);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.active).toBe('number');
    });
  });

  describe('WebhookRepository', () => {
    it('should create webhook', async () => {
      const webhookData = {
        workflowId: testWorkflowId,
        url: `https://webhook.test/${Date.now()}`,
        method: HttpMethod.POST,
        secret: 'webhook_secret',
      };

      const webhook = await webhookRepository.create(webhookData);
      testWebhookId = webhook.id;

      expect(webhook).toBeDefined();
      expect(webhook.url).toBe(webhookData.url);
      expect(webhook.method).toBe(HttpMethod.POST);
    });

    it('should create webhook event', async () => {
      const eventData = {
        webhookId: testWebhookId,
        eventType: 'test_event',
        payload: { test: 'data' },
        headers: { 'content-type': 'application/json' },
        ipAddress: '127.0.0.1',
      };

      const event = await webhookRepository.createEvent(eventData);

      expect(event).toBeDefined();
      expect(event.webhookId).toBe(testWebhookId);
      expect(event.processed).toBe(false);
    });

    it('should find webhooks by workflow', async () => {
      const webhooks = await webhookRepository.findByWorkflow(testWorkflowId);

      expect(webhooks).toBeDefined();
      expect(webhooks.length).toBeGreaterThan(0);
    });

    it('should get webhook statistics', async () => {
      const stats = await webhookRepository.getStatistics(testWebhookId);

      expect(stats).toBeDefined();
      expect(typeof stats.totalEvents).toBe('number');
    });
  });

  describe('AnalyticsRepository', () => {
    it('should record workflow analytics', async () => {
      const analyticsData = {
        workflowId: testWorkflowId,
        date: new Date(),
        executions: 10,
        successfulRuns: 8,
        failedRuns: 2,
        avgDuration: 5000,
        totalDuration: 50000,
      };

      const analytics = await analyticsRepository.recordWorkflowAnalytics(analyticsData);

      expect(analytics).toBeDefined();
      expect(analytics.workflowId).toBe(testWorkflowId);
    });

    it('should get workflow analytics', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const analytics = await analyticsRepository.getWorkflowAnalytics(
        testWorkflowId,
        startDate,
        endDate
      );

      expect(analytics).toBeDefined();
      expect(Array.isArray(analytics)).toBe(true);
    });

    it('should create audit log', async () => {
      const auditData = {
        userId: testUserId,
        action: 'test_action',
        resource: 'workflow',
        resourceId: testWorkflowId,
        details: { test: 'data' },
      };

      const log = await analyticsRepository.createAuditLog(auditData);

      expect(log).toBeDefined();
      expect(log.action).toBe(auditData.action);
    });

    it('should create notification', async () => {
      const notificationData = {
        userId: testUserId,
        type: 'WORKFLOW_COMPLETED' as any,
        title: 'Test Notification',
        message: 'Test message',
      };

      const notification = await analyticsRepository.createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.title).toBe(notificationData.title);
      expect(notification.read).toBe(false);
    });

    it('should get user notifications', async () => {
      const result = await analyticsRepository.getNotifications(testUserId);

      expect(result.notifications).toBeDefined();
      expect(result.unreadCount).toBeGreaterThan(0);
    });
  });
});
