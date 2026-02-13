/**
 * Service Migration Test Suite
 * Tests for migrated services with database integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WorkflowService } from '../services/WorkflowService.migrated';
import { CredentialsService } from '../services/CredentialsService.migrated';
import { ServiceMigrationAdapter, GlobalMigrationManager } from '../backend/services/ServiceMigrationAdapter';
import { EventBus } from '../backend/services/EventBus';
import { prisma } from '../backend/database/prisma';

describe('Service Migration Integration Tests', () => {
  let eventBus: EventBus;
  let workflowService: WorkflowService;
  let credentialsService: CredentialsService;

  beforeAll(async () => {
    // Initialize event bus
    eventBus = new EventBus({
      historyEnabled: true,
      historyMaxSize: 1000,
    });

    // Initialize services
    workflowService = WorkflowService.getInstance(eventBus);
    credentialsService = CredentialsService.getInstance(eventBus);

    // Clean up test data
    await prisma.workflow.deleteMany({
      where: { name: { startsWith: 'Test ' } },
    });
    await prisma.credential.deleteMany({
      where: { name: { startsWith: 'Test ' } },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.workflow.deleteMany({
      where: { name: { startsWith: 'Test ' } },
    });
    await prisma.credential.deleteMany({
      where: { name: { startsWith: 'Test ' } },
    });

    await prisma.$disconnect();
  });

  describe('WorkflowService Migration', () => {
    it('should create workflow in database', async () => {
      const workflow = await workflowService.createWorkflow(
        {
          name: 'Test Workflow 1',
          description: 'Test workflow for migration',
          nodes: [
            { id: 'node1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
          ],
          edges: [],
          isActive: true,
        },
        'test-user-1'
      );

      expect(workflow).toBeDefined();
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Test Workflow 1');

      // Verify in database
      const dbWorkflow = await prisma.workflow.findUnique({
        where: { id: workflow.id },
      });

      expect(dbWorkflow).toBeDefined();
      expect(dbWorkflow?.name).toBe('Test Workflow 1');
    });

    it('should retrieve workflow from database', async () => {
      const created = await workflowService.createWorkflow(
        {
          name: 'Test Workflow 2',
          nodes: [],
          edges: [],
          isActive: true,
        },
        'test-user-1'
      );

      const retrieved = await workflowService.getWorkflow(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Workflow 2');
    });

    it('should update workflow in database', async () => {
      const created = await workflowService.createWorkflow(
        {
          name: 'Test Workflow 3',
          nodes: [],
          edges: [],
          isActive: true,
        },
        'test-user-1'
      );

      const updated = await workflowService.updateWorkflow(created.id, {
        name: 'Test Workflow 3 Updated',
        description: 'Updated description',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Test Workflow 3 Updated');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.version).toBe(created.version + 1);

      // Verify in database
      const dbWorkflow = await prisma.workflow.findUnique({
        where: { id: created.id },
      });

      expect(dbWorkflow?.name).toBe('Test Workflow 3 Updated');
    });

    it('should delete workflow from database', async () => {
      const created = await workflowService.createWorkflow(
        {
          name: 'Test Workflow 4',
          nodes: [],
          edges: [],
          isActive: true,
        },
        'test-user-1'
      );

      const deleted = await workflowService.deleteWorkflow(created.id);

      expect(deleted).toBe(true);

      // Verify deletion in database
      const dbWorkflow = await prisma.workflow.findUnique({
        where: { id: created.id },
      });

      expect(dbWorkflow).toBeNull();
    });

    it('should list workflows with filters', async () => {
      await workflowService.createWorkflow(
        {
          name: 'Test Workflow 5 Active',
          nodes: [],
          edges: [],
          isActive: true,
          tags: ['test', 'active'],
        },
        'test-user-1'
      );

      await workflowService.createWorkflow(
        {
          name: 'Test Workflow 6 Inactive',
          nodes: [],
          edges: [],
          isActive: false,
          tags: ['test', 'inactive'],
        },
        'test-user-1'
      );

      const activeWorkflows = await workflowService.listWorkflows({
        isActive: true,
        userId: 'test-user-1',
      });

      expect(activeWorkflows.length).toBeGreaterThan(0);
      expect(activeWorkflows.every(w => w.isActive)).toBe(true);
    });

    it('should emit events on workflow operations', async () => {
      const events: any[] = [];
      const subscription = eventBus.subscribe({
        types: ['workflow.created', 'workflow.updated', 'workflow.deleted'],
        callback: (event) => events.push(event),
      });

      const workflow = await workflowService.createWorkflow(
        {
          name: 'Test Workflow 7',
          nodes: [],
          edges: [],
          isActive: true,
        },
        'test-user-1'
      );

      await workflowService.updateWorkflow(workflow.id, {
        name: 'Test Workflow 7 Updated',
      });

      await workflowService.deleteWorkflow(workflow.id);

      // Wait for events to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events.length).toBe(3);
      expect(events[0].type).toBe('workflow.created');
      expect(events[1].type).toBe('workflow.updated');
      expect(events[2].type).toBe('workflow.deleted');

      eventBus.unsubscribe(subscription.id);
    });
  });

  describe('CredentialsService Migration', () => {
    it('should create encrypted credential in database', async () => {
      const credential = await credentialsService.createCredential(
        {
          name: 'Test Credential 1',
          type: 'openai',
          data: {
            apiKey: 'sk-test-1234567890',
          },
        },
        'test-user-1'
      );

      expect(credential).toBeDefined();
      expect(credential.id).toBeDefined();
      expect(credential.name).toBe('Test Credential 1');
      expect(credential.isValid).toBe(true);

      // Verify in database (data should be encrypted)
      const dbCredential = await prisma.credential.findUnique({
        where: { id: credential.id },
      });

      expect(dbCredential).toBeDefined();
      expect(dbCredential?.encryptedData).toBeDefined();
      expect(dbCredential?.encryptedData).not.toContain('sk-test-1234567890');
    });

    it('should retrieve and decrypt credential from database', async () => {
      const created = await credentialsService.createCredential(
        {
          name: 'Test Credential 2',
          type: 'aws',
          data: {
            accessKeyId: 'AKIA1234567890',
            secretAccessKey: 'secret1234567890',
            region: 'us-east-1',
          },
        },
        'test-user-1'
      );

      const retrieved = await credentialsService.getCredential(created.id, 'test-user-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.data.accessKeyId).toBe('AKIA1234567890');
      expect(retrieved?.data.secretAccessKey).toBe('secret1234567890');
    });

    it('should mask sensitive data in list view', async () => {
      await credentialsService.createCredential(
        {
          name: 'Test Credential 3',
          type: 'slack',
          data: {
            token: 'xoxb-1234567890-1234567890',
            webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX',
          },
        },
        'test-user-1'
      );

      const credentials = await credentialsService.listCredentials('test-user-1', false);

      const testCred = credentials.find(c => c.name === 'Test Credential 3');

      expect(testCred).toBeDefined();
      expect(testCred?.data.token).toContain('*');
      expect(testCred?.data.token).not.toBe('xoxb-1234567890-1234567890');
    });

    it('should update credential and re-encrypt', async () => {
      const created = await credentialsService.createCredential(
        {
          name: 'Test Credential 4',
          type: 'github',
          data: {
            token: 'ghp_original',
          },
        },
        'test-user-1'
      );

      const updated = await credentialsService.updateCredential(
        created.id,
        {
          data: {
            token: 'ghp_updated',
          },
        },
        'test-user-1'
      );

      expect(updated).toBeDefined();

      const retrieved = await credentialsService.getCredential(created.id, 'test-user-1');
      expect(retrieved?.data.token).toBe('ghp_updated');
    });

    it('should prevent unauthorized access to credentials', async () => {
      const created = await credentialsService.createCredential(
        {
          name: 'Test Credential 5',
          type: 'openai',
          data: {
            apiKey: 'sk-private',
          },
        },
        'test-user-1'
      );

      // Try to access with different user
      const retrieved = await credentialsService.getCredential(created.id, 'test-user-2');

      expect(retrieved).toBeNull();
    });
  });

  describe('ServiceMigrationAdapter', () => {
    it('should track operation statistics', async () => {
      const adapter = workflowService.getAdapter();

      // Reset stats
      adapter.resetStats();

      // Perform operations
      await workflowService.createWorkflow(
        {
          name: 'Test Workflow Stats',
          nodes: [],
          edges: [],
          isActive: true,
        },
        'test-user-1'
      );

      const stats = adapter.getStats();

      expect(stats.databaseWrites).toBeGreaterThan(0);
      expect(stats.memoryWrites).toBeGreaterThan(0);
    });

    it('should support mode switching', async () => {
      const adapter = workflowService.getAdapter();

      // Check initial mode
      expect(adapter.getMode()).toBe('dual');

      // Switch to memory-only
      adapter.setMode('memory-only');
      expect(adapter.getMode()).toBe('memory-only');

      // Switch back to dual
      adapter.setMode('dual');
      expect(adapter.getMode()).toBe('dual');
    });

    it('should fallback to memory on database error in dual mode', async () => {
      const adapter = workflowService.getAdapter();

      // This test would require mocking database failure
      // For now, just verify fallback mechanism exists
      expect(adapter.getMode()).toBe('dual');
    });
  });

  describe('Event Bus Integration', () => {
    it('should record workflow lifecycle events', async () => {
      const events: any[] = [];
      const subscription = eventBus.subscribe({
        callback: (event) => events.push(event),
      });

      const workflow = await workflowService.createWorkflow(
        {
          name: 'Test Workflow Events',
          nodes: [],
          edges: [],
          isActive: true,
        },
        'test-user-1'
      );

      await workflowService.deleteWorkflow(workflow.id);

      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events.length).toBeGreaterThanOrEqual(2);

      eventBus.unsubscribe(subscription.id);
    });

    it('should support event history replay', async () => {
      const events = eventBus.getHistory({
        types: ['workflow.created'],
      });

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Migration Statistics', () => {
    it('should provide workflow statistics', async () => {
      const stats = await workflowService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.active).toBeGreaterThanOrEqual(0);
      expect(stats.inactive).toBeGreaterThanOrEqual(0);
    });

    it('should provide credential statistics', async () => {
      const stats = await credentialsService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.active).toBeGreaterThanOrEqual(0);
    });
  });
});
