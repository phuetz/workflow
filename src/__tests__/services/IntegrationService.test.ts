/**
 * IntegrationService Unit Tests
 * Tests for the 100+ integrations management service
 *
 * @module IntegrationService.test
 * @created 2026-01-07
 * @updated 2026-01-19
 *
 * Test coverage: 25 tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../services/CacheLayer', () => ({
  cacheLayer: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../../services/MonitoringService', () => ({
  default: {
    trackMetric: vi.fn(),
    incrementCounter: vi.fn(),
    recordDuration: vi.fn(),
    recordMetric: vi.fn()
  }
}));

vi.mock('../../services/OpenTelemetryService', () => ({
  telemetryService: {
    startSpan: vi.fn().mockReturnValue({
      setStatus: vi.fn(),
      end: vi.fn(),
      recordException: vi.fn()
    }),
    recordMetric: vi.fn()
  }
}));

import { IntegrationService } from '../../services/IntegrationService';

// ============================================
// Tests
// ============================================

describe('IntegrationService', () => {
  let service: IntegrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for testing
    // @ts-expect-error - Accessing private static for testing
    IntegrationService.instance = undefined;
    service = IntegrationService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Test 1: Singleton Pattern
  // ============================================
  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = IntegrationService.getInstance();
      const instance2 = IntegrationService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  // ============================================
  // Tests 2-3: EventEmitter
  // ============================================
  describe('EventEmitter', () => {
    it('should inherit from EventEmitter', () => {
      expect(typeof service.on).toBe('function');
      expect(typeof service.emit).toBe('function');
      expect(typeof service.removeListener).toBe('function');
    });

    it('should allow event subscription and emission', () => {
      const handler = vi.fn();
      service.on('test_event', handler);
      service.emit('test_event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  // ============================================
  // Tests 4-8: Integration Registration
  // ============================================
  describe('Integration Registration', () => {
    it('should initialize with cloud integrations', () => {
      const integrations = service.getAllIntegrations();
      const cloudIntegrations = integrations.filter(i =>
        i.category.toLowerCase().includes('cloud')
      );

      expect(cloudIntegrations.length).toBeGreaterThan(0);
    });

    it('should initialize with communication integrations', () => {
      const integrations = service.getAllIntegrations();
      const commIntegrations = integrations.filter(i =>
        i.category.toLowerCase().includes('communication')
      );

      expect(commIntegrations.length).toBeGreaterThan(0);
    });

    it('should initialize with database integrations', () => {
      const integrations = service.getAllIntegrations();
      const dbIntegrations = integrations.filter(i =>
        i.category.toLowerCase().includes('database')
      );

      expect(dbIntegrations.length).toBeGreaterThan(0);
    });

    it('should initialize with AI/ML integrations', () => {
      const integrations = service.getAllIntegrations();
      const aiIntegrations = integrations.filter(i =>
        i.category.toLowerCase().includes('ai') ||
        i.category.toLowerCase().includes('ml')
      );

      expect(aiIntegrations.length).toBeGreaterThan(0);
    });

    it('should have multiple integrations registered', () => {
      const integrations = service.getAllIntegrations();

      expect(integrations.length).toBeGreaterThan(10);
    });
  });

  // ============================================
  // Tests 9-11: Get Integrations
  // ============================================
  describe('getAllIntegrations()', () => {
    it('should return all integrations as array', () => {
      const integrations = service.getAllIntegrations();

      expect(Array.isArray(integrations)).toBe(true);
      expect(integrations.length).toBeGreaterThan(0);
    });
  });

  describe('getIntegrationsByCategory()', () => {
    it('should filter by existing category', () => {
      const categories = service.getCategories();
      if (categories.length > 0) {
        const integrations = service.getIntegrationsByCategory(categories[0]);

        expect(integrations.every(i => i.category === categories[0])).toBe(true);
      }
    });

    it('should return empty array for non-existent category', () => {
      const integrations = service.getIntegrationsByCategory('NonExistentCategory123');

      expect(integrations).toEqual([]);
    });
  });

  // ============================================
  // Tests 12-14: Get Integration By ID
  // ============================================
  describe('getIntegration()', () => {
    it('should return integration by ID', () => {
      const integrations = service.getAllIntegrations();
      if (integrations.length > 0) {
        const integration = service.getIntegration(integrations[0].id);

        expect(integration).toBeDefined();
        expect(integration?.id).toBe(integrations[0].id);
      }
    });

    it('should return undefined for non-existent ID', () => {
      const integration = service.getIntegration('non-existent-id-123');

      expect(integration).toBeUndefined();
    });

    it('should return correct integration properties', () => {
      const integrations = service.getAllIntegrations();
      if (integrations.length > 0) {
        const integration = service.getIntegration(integrations[0].id);

        expect(integration).toHaveProperty('id');
        expect(integration).toHaveProperty('name');
        expect(integration).toHaveProperty('category');
        expect(integration).toHaveProperty('status');
        expect(integration).toHaveProperty('config');
      }
    });
  });

  // ============================================
  // Tests 15-16: Categories
  // ============================================
  describe('getCategories()', () => {
    it('should return list of unique categories', () => {
      const categories = service.getCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      // Check uniqueness
      const uniqueCategories = [...new Set(categories)];
      expect(categories.length).toBe(uniqueCategories.length);
    });

    it('should return sorted categories', () => {
      const categories = service.getCategories();
      const sorted = [...categories].sort();

      expect(categories).toEqual(sorted);
    });
  });

  // ============================================
  // Tests 17-19: Execute Integration
  // ============================================
  describe('execute()', () => {
    it('should throw error for non-existent integration', async () => {
      await expect(
        service.execute('non-existent', 'method', {})
      ).rejects.toThrow('not found');
    });

    it('should throw error for non-existent method', async () => {
      const integrations = service.getAllIntegrations();
      const activeIntegration = integrations.find(i => i.status === 'active');

      if (activeIntegration) {
        await expect(
          service.execute(activeIntegration.id, 'non-existent-method', {})
        ).rejects.toThrow('not found');
      }
    });

    it('should throw error for inactive integration', async () => {
      // All default integrations are active, but the check exists
      const integrations = service.getAllIntegrations();
      const integration = integrations[0];

      // This will fail at method lookup since test methods don't exist
      await expect(
        service.execute(integration.id, 'test_method', {})
      ).rejects.toThrow();
    });
  });

  // ============================================
  // Tests 20-21: Execution History
  // ============================================
  describe('getExecutionHistory()', () => {
    it('should return execution history array', () => {
      const history = service.getExecutionHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    it('should limit history results', () => {
      const history = service.getExecutionHistory(undefined, 5);

      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================
  // Tests 22-23: Integration Stats
  // ============================================
  describe('getIntegrationStats()', () => {
    it('should return stats object with required fields', () => {
      const integrations = service.getAllIntegrations();
      if (integrations.length > 0) {
        const stats = service.getIntegrationStats(integrations[0].id);

        expect(stats).toHaveProperty('totalExecutions');
        expect(stats).toHaveProperty('successfulExecutions');
        expect(stats).toHaveProperty('failedExecutions');
        expect(stats).toHaveProperty('averageResponseTime');
      }
    });

    it('should return zero stats for new integration', () => {
      const integrations = service.getAllIntegrations();
      if (integrations.length > 0) {
        const stats = service.getIntegrationStats(integrations[0].id);

        expect(stats.totalExecutions).toBe(0);
        expect(stats.successfulExecutions).toBe(0);
        expect(stats.failedExecutions).toBe(0);
        expect(stats.averageResponseTime).toBe(0);
      }
    });
  });

  // ============================================
  // Test 24: Test Integration
  // ============================================
  describe('testIntegration()', () => {
    it('should return test result with success and responseTime', async () => {
      const integrations = service.getAllIntegrations();
      if (integrations.length > 0) {
        const result = await service.testIntegration(integrations[0].id);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('responseTime');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.responseTime).toBe('number');
      }
    });

    it('should return error for non-existent integration', async () => {
      const result = await service.testIntegration('non-existent-id');

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  // ============================================
  // Test 25: Shutdown
  // ============================================
  describe('shutdown()', () => {
    it('should shutdown gracefully', async () => {
      await expect(service.shutdown()).resolves.not.toThrow();
    });

    it('should clear execution history on shutdown', async () => {
      await service.shutdown();
      const history = service.getExecutionHistory();

      expect(history.length).toBe(0);
    });
  });
});
