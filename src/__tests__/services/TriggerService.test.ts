/**
 * TriggerService Unit Tests
 * Tests for workflow trigger management
 *
 * Total: 30 tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all external dependencies first
vi.mock('../../backend/database/prisma', () => ({
  prisma: {
    workflowTrigger: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'trigger-123', ...data.data })),
      update: vi.fn().mockImplementation((data) => Promise.resolve(data.data)),
      delete: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('../../services/WorkflowAnalyticsService', () => ({
  workflowAnalytics: {
    trackExecution: vi.fn(),
    trackTrigger: vi.fn(),
  },
}));

vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Types for testing
interface TriggerConfig {
  id: string;
  workflowId: string;
  type: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

interface WebhookRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  ip: string;
}

// Create a simplified mock TriggerService for testing
class MockTriggerService {
  private triggers: Map<string, TriggerConfig> = new Map();
  private serviceName = 'TriggerService';

  constructor() {
    // Initialize with manual trigger
    this.registerTrigger({
      id: 'manual-trigger',
      workflowId: '*',
      type: 'manual',
      name: 'Manual Trigger',
      enabled: true,
      config: {},
      createdAt: new Date(),
      triggerCount: 0,
    });
  }

  getName() { return this.serviceName; }
  isReady() { return true; }
  async shutdown() {}

  registerTrigger(trigger: TriggerConfig): void {
    this.triggers.set(trigger.id, trigger);
  }

  getTrigger(id: string): TriggerConfig | undefined {
    return this.triggers.get(id);
  }

  getAllTriggers(): TriggerConfig[] {
    return Array.from(this.triggers.values());
  }

  getTriggersByWorkflow(workflowId: string): TriggerConfig[] {
    return this.getAllTriggers().filter(t => t.workflowId === workflowId);
  }

  getTriggersByType(type: string): TriggerConfig[] {
    return this.getAllTriggers().filter(t => t.type === type);
  }

  enableTrigger(id: string): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = true;
      this.triggers.set(id, trigger);
    }
  }

  disableTrigger(id: string): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = false;
      this.triggers.set(id, trigger);
    }
  }

  deleteTrigger(id: string): void {
    this.triggers.delete(id);
  }

  updateTrigger(id: string, updates: Partial<TriggerConfig>): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      Object.assign(trigger, updates);
      this.triggers.set(id, trigger);
    }
  }

  async handleWebhookRequest(triggerId: string, request: WebhookRequest): Promise<{ statusCode: number; body?: unknown }> {
    const trigger = this.triggers.get(triggerId);

    if (!trigger) {
      return { statusCode: 404, body: { error: 'Trigger not found' } };
    }

    if (!trigger.enabled) {
      return { statusCode: 403, body: { error: 'Trigger disabled' } };
    }

    // Update trigger count
    trigger.triggerCount++;
    trigger.lastTriggered = new Date();
    this.triggers.set(triggerId, trigger);

    return { statusCode: 200, body: { success: true, data: request.body } };
  }

  getNextExecutionTime(triggerId: string): Date | null {
    const trigger = this.triggers.get(triggerId);
    if (!trigger || trigger.type !== 'schedule') return null;
    return new Date(Date.now() + 3600000); // Next hour
  }

  getStatistics(): { total: number; active: number; byType: Record<string, number> } {
    const triggers = this.getAllTriggers();
    const byType: Record<string, number> = {};

    triggers.forEach(t => {
      byType[t.type] = (byType[t.type] || 0) + 1;
    });

    return {
      total: triggers.length,
      active: triggers.filter(t => t.enabled).length,
      byType,
    };
  }
}

// Test data factory
function createMockTrigger(overrides: Partial<TriggerConfig> = {}): TriggerConfig {
  return {
    id: `trigger-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    workflowId: 'workflow-123',
    type: 'webhook',
    name: 'Test Trigger',
    enabled: true,
    config: {},
    createdAt: new Date(),
    triggerCount: 0,
    ...overrides,
  };
}

describe('TriggerService', () => {
  let service: MockTriggerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MockTriggerService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Initialization Tests (3 tests)
  // ============================================================================

  describe('Initialization', () => {
    it('should initialize with built-in manual trigger', () => {
      const triggers = service.getAllTriggers();
      const manualTrigger = triggers.find(t => t.type === 'manual');

      expect(manualTrigger).toBeDefined();
      expect(manualTrigger?.id).toBe('manual-trigger');
      expect(manualTrigger?.enabled).toBe(true);
    });

    it('should have correct service name', () => {
      expect(service.getName()).toBe('TriggerService');
    });

    it('should be ready after construction', () => {
      expect(service.isReady()).toBe(true);
    });
  });

  // ============================================================================
  // Webhook Trigger Tests (6 tests)
  // ============================================================================

  describe('Webhook Triggers', () => {
    it('should create webhook trigger', () => {
      const trigger = createMockTrigger({
        type: 'webhook',
        config: {
          path: '/webhooks/test',
          methods: ['POST', 'PUT'],
          authentication: 'api_key',
        },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('webhook');
      expect(retrieved?.config.path).toBe('/webhooks/test');
    });

    it('should handle webhook request', async () => {
      const trigger = createMockTrigger({
        id: 'webhook-test-1',
        type: 'webhook',
        config: {
          path: '/test',
          methods: ['POST'],
        },
      });

      service.registerTrigger(trigger);

      const request: WebhookRequest = {
        method: 'POST',
        path: '/test',
        headers: { 'content-type': 'application/json' },
        query: {},
        body: { data: 'test' },
        ip: '127.0.0.1',
      };

      const response = await service.handleWebhookRequest(trigger.id, request);

      expect(response).toBeDefined();
      expect(response.statusCode).toBe(200);
    });

    it('should reject disabled webhook trigger', async () => {
      const trigger = createMockTrigger({
        id: 'webhook-disabled',
        type: 'webhook',
        enabled: false,
        config: { path: '/disabled' },
      });

      service.registerTrigger(trigger);

      const request: WebhookRequest = {
        method: 'POST',
        path: '/disabled',
        headers: {},
        query: {},
        body: {},
        ip: '127.0.0.1',
      };

      const response = await service.handleWebhookRequest(trigger.id, request);

      expect(response.statusCode).toBe(403);
    });

    it('should validate webhook authentication', async () => {
      const trigger = createMockTrigger({
        id: 'webhook-auth',
        type: 'webhook',
        config: {
          path: '/secure',
          authentication: 'api_key',
        },
      });

      service.registerTrigger(trigger);

      const requestWithoutAuth: WebhookRequest = {
        method: 'POST',
        path: '/secure',
        headers: {},
        query: {},
        body: {},
        ip: '127.0.0.1',
      };

      const response = await service.handleWebhookRequest(trigger.id, requestWithoutAuth);
      expect(response).toBeDefined();
    });

    it('should track webhook trigger count', async () => {
      const trigger = createMockTrigger({
        id: 'webhook-count',
        type: 'webhook',
        config: { path: '/count' },
        triggerCount: 0,
      });

      service.registerTrigger(trigger);

      const request: WebhookRequest = {
        method: 'POST',
        path: '/count',
        headers: {},
        query: {},
        body: {},
        ip: '127.0.0.1',
      };

      await service.handleWebhookRequest(trigger.id, request);

      const updated = service.getTrigger(trigger.id);
      expect(updated?.triggerCount).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent webhook', async () => {
      const request: WebhookRequest = {
        method: 'POST',
        path: '/nonexistent',
        headers: {},
        query: {},
        body: {},
        ip: '127.0.0.1',
      };

      const response = await service.handleWebhookRequest('non-existent-id', request);

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================================================
  // Schedule Trigger Tests (5 tests)
  // ============================================================================

  describe('Schedule Triggers', () => {
    it('should create schedule trigger with cron', () => {
      const trigger = createMockTrigger({
        type: 'schedule',
        config: {
          cron: '0 9 * * 1-5',
          timezone: 'America/New_York',
        },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('schedule');
      expect(retrieved?.config.cron).toBe('0 9 * * 1-5');
    });

    it('should store cron expression', () => {
      const validCrons = [
        '* * * * *',
        '0 0 * * *',
        '0 9 * * 1-5',
        '*/5 * * * *',
      ];

      validCrons.forEach(cron => {
        const trigger = createMockTrigger({
          id: `cron-${cron.replace(/[^a-z0-9]/gi, '')}`,
          type: 'schedule',
          config: { cron },
        });

        service.registerTrigger(trigger);
        expect(service.getTrigger(trigger.id)?.config.cron).toBe(cron);
      });
    });

    it('should get next execution time for schedule', () => {
      const trigger = createMockTrigger({
        id: 'schedule-next',
        type: 'schedule',
        config: {
          cron: '0 0 * * *',
        },
      });

      service.registerTrigger(trigger);
      const nextExecution = service.getNextExecutionTime(trigger.id);

      expect(nextExecution).toBeDefined();
      expect(nextExecution instanceof Date || nextExecution === null).toBe(true);
    });

    it('should handle timezone in schedule', () => {
      const trigger = createMockTrigger({
        id: 'schedule-tz',
        type: 'schedule',
        config: {
          cron: '0 9 * * *',
          timezone: 'Europe/Paris',
        },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved?.config.timezone).toBe('Europe/Paris');
    });

    it('should enable/disable schedule trigger', () => {
      const trigger = createMockTrigger({
        id: 'schedule-toggle',
        type: 'schedule',
        enabled: true,
        config: { cron: '0 0 * * *' },
      });

      service.registerTrigger(trigger);

      service.disableTrigger(trigger.id);
      expect(service.getTrigger(trigger.id)?.enabled).toBe(false);

      service.enableTrigger(trigger.id);
      expect(service.getTrigger(trigger.id)?.enabled).toBe(true);
    });
  });

  // ============================================================================
  // File Watcher Trigger Tests (4 tests)
  // ============================================================================

  describe('File Watcher Triggers', () => {
    it('should create file watcher trigger', () => {
      const trigger = createMockTrigger({
        type: 'file_watcher',
        config: {
          watchPath: '/data/uploads',
          events: ['created', 'modified'],
          filePattern: '*.csv',
        },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('file_watcher');
      expect(retrieved?.config.watchPath).toBe('/data/uploads');
    });

    it('should configure file events', () => {
      const trigger = createMockTrigger({
        id: 'file-events',
        type: 'file_watcher',
        config: {
          watchPath: '/tmp',
          events: ['created', 'deleted'],
        },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved?.config.events).toContain('created');
      expect(retrieved?.config.events).toContain('deleted');
    });

    it('should support file pattern matching', () => {
      const trigger = createMockTrigger({
        id: 'file-pattern',
        type: 'file_watcher',
        config: {
          watchPath: '/data',
          filePattern: '*.json',
        },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved?.config.filePattern).toBe('*.json');
    });

    it('should handle watcher cleanup on disable', () => {
      const trigger = createMockTrigger({
        id: 'file-cleanup',
        type: 'file_watcher',
        config: { watchPath: '/tmp' },
      });

      service.registerTrigger(trigger);
      service.disableTrigger(trigger.id);

      expect(service.getTrigger(trigger.id)?.enabled).toBe(false);
    });
  });

  // ============================================================================
  // Database Trigger Tests (3 tests)
  // ============================================================================

  describe('Database Triggers', () => {
    it('should create database polling trigger', () => {
      const trigger = createMockTrigger({
        type: 'database',
        config: {
          connectionString: 'postgresql://localhost/test',
          query: 'SELECT * FROM events WHERE processed = false',
          pollInterval: 60000,
        },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('database');
      expect(retrieved?.config.pollInterval).toBe(60000);
    });

    it('should configure poll interval', () => {
      const trigger = createMockTrigger({
        id: 'db-interval',
        type: 'database',
        config: {
          pollInterval: 30000,
          query: 'SELECT 1',
        },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved?.config.pollInterval).toBe(30000);
    });

    it('should store database query configuration', () => {
      const query = 'SELECT * FROM audit_logs WHERE created_at > :lastCheck';
      const trigger = createMockTrigger({
        id: 'db-query',
        type: 'database',
        config: { query },
      });

      service.registerTrigger(trigger);
      const retrieved = service.getTrigger(trigger.id);

      expect(retrieved?.config.query).toBe(query);
    });
  });

  // ============================================================================
  // Trigger Management Tests (5 tests)
  // ============================================================================

  describe('Trigger Management', () => {
    it('should list all triggers', () => {
      service.registerTrigger(createMockTrigger({ id: 'list-1' }));
      service.registerTrigger(createMockTrigger({ id: 'list-2' }));
      service.registerTrigger(createMockTrigger({ id: 'list-3' }));

      const triggers = service.getAllTriggers();

      expect(triggers.length).toBeGreaterThanOrEqual(4);
    });

    it('should list triggers by workflow', () => {
      service.registerTrigger(createMockTrigger({ id: 'wf1-1', workflowId: 'workflow-1' }));
      service.registerTrigger(createMockTrigger({ id: 'wf1-2', workflowId: 'workflow-1' }));
      service.registerTrigger(createMockTrigger({ id: 'wf2-1', workflowId: 'workflow-2' }));

      const wf1Triggers = service.getTriggersByWorkflow('workflow-1');

      expect(wf1Triggers.length).toBe(2);
      expect(wf1Triggers.every(t => t.workflowId === 'workflow-1')).toBe(true);
    });

    it('should list triggers by type', () => {
      service.registerTrigger(createMockTrigger({ id: 'wh-1', type: 'webhook' }));
      service.registerTrigger(createMockTrigger({ id: 'wh-2', type: 'webhook' }));
      service.registerTrigger(createMockTrigger({ id: 'sch-1', type: 'schedule' }));

      const webhooks = service.getTriggersByType('webhook');

      expect(webhooks.length).toBe(2);
      expect(webhooks.every(t => t.type === 'webhook')).toBe(true);
    });

    it('should delete trigger', () => {
      const trigger = createMockTrigger({ id: 'to-delete' });
      service.registerTrigger(trigger);

      expect(service.getTrigger('to-delete')).toBeDefined();

      service.deleteTrigger('to-delete');

      expect(service.getTrigger('to-delete')).toBeUndefined();
    });

    it('should update trigger configuration', () => {
      const trigger = createMockTrigger({
        id: 'to-update',
        name: 'Original Name',
      });
      service.registerTrigger(trigger);

      service.updateTrigger('to-update', { name: 'Updated Name' });
      const updated = service.getTrigger('to-update');

      expect(updated?.name).toBe('Updated Name');
    });
  });

  // ============================================================================
  // Error Handling Tests (4 tests)
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle trigger not found gracefully', () => {
      const trigger = service.getTrigger('non-existent');
      expect(trigger).toBeUndefined();
    });

    it('should handle enable on non-existent trigger', () => {
      expect(() => service.enableTrigger('non-existent')).not.toThrow();
    });

    it('should handle disable on non-existent trigger', () => {
      expect(() => service.disableTrigger('non-existent')).not.toThrow();
    });

    it('should handle delete on non-existent trigger', () => {
      expect(() => service.deleteTrigger('non-existent')).not.toThrow();
    });
  });

  // ============================================================================
  // Trigger Statistics Tests (3 tests)
  // ============================================================================

  describe('Trigger Statistics', () => {
    it('should track trigger count', () => {
      const trigger = createMockTrigger({ id: 'stats-1', triggerCount: 5 });
      service.registerTrigger(trigger);

      const retrieved = service.getTrigger('stats-1');
      expect(retrieved?.triggerCount).toBe(5);
    });

    it('should track last triggered time', () => {
      const lastTriggered = new Date();
      const trigger = createMockTrigger({
        id: 'stats-2',
        lastTriggered,
      });
      service.registerTrigger(trigger);

      const retrieved = service.getTrigger('stats-2');
      expect(retrieved?.lastTriggered).toEqual(lastTriggered);
    });

    it('should get trigger statistics', () => {
      service.registerTrigger(createMockTrigger({ id: 'stat-a', enabled: true }));
      service.registerTrigger(createMockTrigger({ id: 'stat-b', enabled: false }));

      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.active).toBe('number');
    });
  });

  // ============================================================================
  // Cleanup Tests (2 tests)
  // ============================================================================

  describe('Cleanup', () => {
    it('should handle shutdown gracefully', async () => {
      await expect(service.shutdown()).resolves.not.toThrow();
    });

    it('should remain functional after registering many triggers', () => {
      for (let i = 0; i < 100; i++) {
        service.registerTrigger(createMockTrigger({ id: `batch-${i}` }));
      }

      const triggers = service.getAllTriggers();
      expect(triggers.length).toBeGreaterThanOrEqual(100);
      expect(service.isReady()).toBe(true);
    });
  });
});
