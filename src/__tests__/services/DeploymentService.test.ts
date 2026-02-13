/**
 * DeploymentService Unit Tests
 * Tests for the self-hosted deployment service
 *
 * @module DeploymentService.test
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

import { DeploymentService } from '../../services/DeploymentService';

// ============================================
// Tests
// ============================================

describe('DeploymentService', () => {
  let service: DeploymentService;

  // Helper to create a minimal valid deployment config
  const createValidDeploymentConfig = (overrides: Record<string, unknown> = {}) => ({
    id: overrides.id || 'test-deployment',
    name: overrides.name || 'Test Deployment',
    templateId: overrides.templateId || 'docker-small',
    status: overrides.status || 'draft',
    type: 'docker' as const,
    infrastructure: {
      provider: 'on-premise',
      specifications: {
        compute: { cpu: 2, architecture: 'x86_64' },
        memory: { ram: 4 },
        storage: { type: 'ssd', size: 50 },
        network: { bandwidth: 100, publicIPs: 1, privateIPs: 0 }
      },
      networking: { bandwidth: 100, publicIPs: 1, privateIPs: 0 },
      tags: {}
    },
    application: {
      version: 'latest',
      components: [],
      environment: {},
      secrets: [],
      features: {},
      customization: {}
    },
    database: {
      type: 'postgresql',
      version: '14',
      connection: { host: 'localhost', port: 5432, database: 'test', username: 'test', ssl: false, poolSize: 10, connectionTimeout: 30000 },
      backup: { enabled: true, schedule: '0 0 * * *', retention: 7, location: '/backups', encryption: false },
      maintenance: { autoVacuum: true, autoAnalyze: true, schedule: '0 3 * * 0' }
    },
    storage: { type: 'local', configuration: {}, quotas: {}, lifecycle: [] },
    networking: {
      subnets: [],
      securityGroups: [],
      dns: { provider: 'custom', domain: 'localhost', records: [] },
      ssl: { enabled: false, provider: 'letsencrypt', certificates: [], autoRenew: true }
    },
    security: {
      authentication: { providers: [], mfa: { enabled: false, required: false, methods: [] }, session: {}, passwordPolicy: {} },
      authorization: { model: 'rbac', roles: [], policies: [] },
      encryption: { atRest: { enabled: true, algorithm: 'AES-256', keyManagement: 'local' }, inTransit: { enabled: true, minTlsVersion: '1.2', cipherSuites: [] } },
      firewall: { enabled: false, rules: [], ddosProtection: false, ipWhitelist: [], ipBlacklist: [] },
      audit: { enabled: true, logLevel: 'info', retention: 30, destinations: [] },
      compliance: { standards: [], dataResidency: [], dataRetention: 365 }
    },
    monitoring: {
      metrics: { enabled: true, provider: 'prometheus', interval: 15, retention: 7, exporters: [] },
      logging: { enabled: true, level: 'info', format: 'json', destinations: [] },
      tracing: { enabled: false, provider: 'jaeger', samplingRate: 0.1, endpoint: '' },
      alerting: { enabled: false, rules: [], channels: [] },
      dashboards: []
    },
    scaling: { type: 'manual', minInstances: 1, maxInstances: 1, metrics: [], policies: [] },
    backup: { enabled: true, schedule: {}, retention: {}, destinations: [], encryption: false, verification: true },
    metadata: { version: '1.0.0', environment: 'development', owner: 'test', team: 'test', tags: {}, documentation: '' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for testing
    // @ts-expect-error - Accessing private static for testing
    DeploymentService.instance = undefined;
    service = DeploymentService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Test 1: Singleton Pattern
  // ============================================
  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = DeploymentService.getInstance();
      const instance2 = DeploymentService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  // ============================================
  // Tests 2-5: Template Management
  // ============================================
  describe('getTemplates()', () => {
    it('should return array of templates', async () => {
      const templates = await service.getTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include Docker templates', async () => {
      const templates = await service.getTemplates();
      const dockerTemplates = templates.filter(t => t.type === 'docker');

      expect(dockerTemplates.length).toBeGreaterThan(0);
    });

    it('should include Kubernetes templates', async () => {
      const templates = await service.getTemplates();
      const k8sTemplates = templates.filter(t => t.type === 'kubernetes');

      expect(k8sTemplates.length).toBeGreaterThan(0);
    });

    it('should have required fields on templates', async () => {
      const templates = await service.getTemplates();

      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('configuration');
        expect(template).toHaveProperty('requirements');
      });
    });
  });

  describe('getTemplate()', () => {
    it('should return template by ID', async () => {
      const templates = await service.getTemplates();
      if (templates.length > 0) {
        const template = await service.getTemplate(templates[0].id);

        expect(template).toBeDefined();
        expect(template?.id).toBe(templates[0].id);
      }
    });

    it('should return null for non-existent ID', async () => {
      const template = await service.getTemplate('non-existent-id');

      expect(template).toBeNull();
    });
  });

  // ============================================
  // Tests 7-11: Deployment CRUD
  // ============================================
  describe('Deployment CRUD', () => {
    describe('createDeployment()', () => {
      it('should create a new deployment with generated ID', async () => {
        const config = createValidDeploymentConfig({ id: undefined, name: 'New Deployment' });
        const deployment = await service.createDeployment(config as any);

        expect(deployment).toHaveProperty('id');
        expect(deployment.id).toBeTruthy();
        expect(deployment.name).toBe('New Deployment');
      });

      it('should set initial status to provisioning', async () => {
        const config = createValidDeploymentConfig({ name: 'Status Test' });
        const deployment = await service.createDeployment(config as any);

        expect(deployment.status).toBe('provisioning');
      });

      it('should set createdAt and updatedAt timestamps', async () => {
        const config = createValidDeploymentConfig({ name: 'Timestamp Test' });
        const deployment = await service.createDeployment(config as any);

        expect(deployment.createdAt).toBeInstanceOf(Date);
        expect(deployment.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('getDeployment()', () => {
      it('should return deployment by ID', async () => {
        const config = createValidDeploymentConfig({ name: 'Get Test' });
        const created = await service.createDeployment(config as any);
        const retrieved = await service.getDeployment(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
      });

      it('should return null for non-existent ID', async () => {
        const deployment = await service.getDeployment('non-existent');

        expect(deployment).toBeNull();
      });
    });

    describe('listDeployments()', () => {
      it('should return array of all deployments', async () => {
        const deployments = await service.listDeployments();

        expect(Array.isArray(deployments)).toBe(true);
      });
    });

    describe('updateDeployment()', () => {
      it('should update an existing deployment', async () => {
        const config = createValidDeploymentConfig({ name: 'Original Name' });
        const deployment = await service.createDeployment(config as any);

        const updated = await service.updateDeployment(deployment.id, {
          name: 'Updated Name'
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.id).toBe(deployment.id);
      });

      it('should throw for non-existent deployment', async () => {
        await expect(
          service.updateDeployment('non-existent', { name: 'Test' })
        ).rejects.toThrow('not found');
      });
    });

    describe('deleteDeployment()', () => {
      it('should delete an existing deployment', async () => {
        const config = createValidDeploymentConfig({ name: 'To Delete' });
        const deployment = await service.createDeployment(config as any);

        await service.deleteDeployment(deployment.id);

        const deleted = await service.getDeployment(deployment.id);
        expect(deleted).toBeNull();
      });

      it('should throw for non-existent deployment', async () => {
        await expect(
          service.deleteDeployment('non-existent')
        ).rejects.toThrow('not found');
      });
    });
  });

  // ============================================
  // Tests 12-16: Deployment Operations
  // ============================================
  describe('Deployment Operations', () => {
    describe('deployApplication()', () => {
      it('should deploy an application and return result', async () => {
        const config = createValidDeploymentConfig({ name: 'Deploy Test' });
        const deployment = await service.createDeployment(config as any);

        const result = await service.deployApplication(deployment.id);

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('deploymentId', deployment.id);
        expect(result).toHaveProperty('endpoints');
        expect(result).toHaveProperty('credentials');
      });

      it('should throw for non-existent deployment', async () => {
        await expect(
          service.deployApplication('non-existent')
        ).rejects.toThrow('not found');
      });
    });

    describe('stopDeployment()', () => {
      it('should stop a deployment', async () => {
        const config = createValidDeploymentConfig({ name: 'Stop Test' });
        const deployment = await service.createDeployment(config as any);

        await expect(
          service.stopDeployment(deployment.id)
        ).resolves.not.toThrow();

        const stopped = await service.getDeployment(deployment.id);
        expect(stopped?.status).toBe('stopped');
      });
    });

    describe('restartDeployment()', () => {
      it('should restart a deployment', async () => {
        const config = createValidDeploymentConfig({ name: 'Restart Test' });
        const deployment = await service.createDeployment(config as any);

        await expect(
          service.restartDeployment(deployment.id)
        ).resolves.not.toThrow();
      });
    });

    describe('scaleDeployment()', () => {
      it('should scale a running deployment', async () => {
        const config = createValidDeploymentConfig({ name: 'Scale Test' });
        const deployment = await service.createDeployment(config as any);

        // Deploy first to set status to running
        await service.deployApplication(deployment.id);

        await expect(
          service.scaleDeployment(deployment.id, 3)
        ).resolves.not.toThrow();
      });

      it('should throw when scaling non-running deployment', async () => {
        const config = createValidDeploymentConfig({ name: 'Scale Fail Test' });
        const deployment = await service.createDeployment(config as any);

        // Don't deploy - status won't be 'running'
        await expect(
          service.scaleDeployment(deployment.id, 3)
        ).rejects.toThrow('must be running');
      });
    });
  });

  // ============================================
  // Tests 17-19: Validation
  // ============================================
  describe('Validation', () => {
    describe('validateConfig()', () => {
      it('should validate a valid deployment config', async () => {
        const config = createValidDeploymentConfig({ name: 'Valid Config' });
        const result = await service.validateConfig(config as any);

        expect(result).toHaveProperty('valid', true);
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
      });

      it('should return errors for insufficient CPU', async () => {
        const config = createValidDeploymentConfig({ name: 'Invalid CPU' });
        (config.infrastructure.specifications.compute as any).cpu = 1;

        const result = await service.validateConfig(config as any);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should return errors for insufficient memory', async () => {
        const config = createValidDeploymentConfig({ name: 'Invalid Memory' });
        (config.infrastructure.specifications.memory as any).ram = 2;

        const result = await service.validateConfig(config as any);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.message.toLowerCase().includes('ram') || e.message.toLowerCase().includes('memory'))).toBe(true);
      });
    });
  });

  // ============================================
  // Tests 20-22: Configuration Export
  // ============================================
  describe('Configuration Export', () => {
    describe('exportConfig()', () => {
      it('should export config as JSON', async () => {
        const config = createValidDeploymentConfig({ name: 'Export JSON Test' });
        const deployment = await service.createDeployment(config as any);

        const json = await service.exportConfig(deployment.id, 'json');

        expect(typeof json).toBe('string');
        expect(() => JSON.parse(json)).not.toThrow();
      });

      it('should export config as YAML', async () => {
        const config = createValidDeploymentConfig({ name: 'Export YAML Test' });
        const deployment = await service.createDeployment(config as any);

        const yaml = await service.exportConfig(deployment.id, 'yaml');

        expect(typeof yaml).toBe('string');
        expect(yaml.length).toBeGreaterThan(0);
      });

      it('should export config as Terraform', async () => {
        const config = createValidDeploymentConfig({ name: 'Export Terraform Test' });
        const deployment = await service.createDeployment(config as any);

        const terraform = await service.exportConfig(deployment.id, 'terraform');

        expect(typeof terraform).toBe('string');
      });
    });
  });

  // ============================================
  // Tests 23-25: Monitoring & Metrics
  // ============================================
  describe('Monitoring', () => {
    describe('getDeploymentStatus()', () => {
      it('should return deployment status string', async () => {
        const config = createValidDeploymentConfig({ name: 'Status Test' });
        const deployment = await service.createDeployment(config as any);

        const status = await service.getDeploymentStatus(deployment.id);

        expect(typeof status).toBe('string');
        expect(['provisioning', 'running', 'stopped', 'deploying', 'stopping', 'scaling', 'updating', 'error', 'draft']).toContain(status);
      });

      it('should throw for non-existent deployment', async () => {
        await expect(
          service.getDeploymentStatus('non-existent')
        ).rejects.toThrow('not found');
      });
    });

    describe('getDeploymentMetrics()', () => {
      it('should return metrics object with expected fields', async () => {
        const config = createValidDeploymentConfig({ name: 'Metrics Test' });
        const deployment = await service.createDeployment(config as any);

        const metrics = await service.getDeploymentMetrics(deployment.id);

        expect(metrics).toBeDefined();
        expect(metrics).toHaveProperty('cpu');
        expect(metrics).toHaveProperty('memory');
        expect(metrics).toHaveProperty('disk');
        expect(metrics).toHaveProperty('network');
      });
    });

    describe('getDeploymentLogs()', () => {
      it('should return array of log entries', async () => {
        const config = createValidDeploymentConfig({ name: 'Logs Test' });
        const deployment = await service.createDeployment(config as any);

        const logs = await service.getDeploymentLogs(deployment.id);

        expect(Array.isArray(logs)).toBe(true);
      });

      it('should filter logs by level', async () => {
        const config = createValidDeploymentConfig({ name: 'Logs Filter Test' });
        const deployment = await service.createDeployment(config as any);

        const logs = await service.getDeploymentLogs(deployment.id, { level: 'info' });

        expect(logs.every(log => log.level === 'info')).toBe(true);
      });
    });
  });
});
