/**
 * BackupService Unit Tests
 * Tests for the backup and disaster recovery service
 *
 * @module BackupService.test
 * @created 2026-01-07
 * @updated 2026-01-19
 *
 * Test coverage: 20 tests
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

vi.mock('../../services/WorkflowService', () => ({
  workflowService: {
    getWorkflows: vi.fn().mockResolvedValue([]),
    exportWorkflow: vi.fn().mockResolvedValue({}),
    importWorkflow: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../services/CredentialsService', () => ({
  credentialsService: {
    getCredentials: vi.fn().mockResolvedValue([]),
    exportCredentials: vi.fn().mockResolvedValue([]),
    importCredentials: vi.fn().mockResolvedValue([])
  }
}));

import { BackupService } from '../../services/BackupService';

// ============================================
// Tests
// ============================================

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for testing
    // @ts-expect-error - Accessing private static for testing
    BackupService.instance = undefined;
    service = BackupService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Test 1: Singleton Pattern
  // ============================================
  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = BackupService.getInstance();
      const instance2 = BackupService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  // ============================================
  // Tests 2-5: Backup Configuration Management
  // ============================================
  describe('Backup Configuration', () => {
    describe('listBackupConfigs()', () => {
      it('should return array of backup configs', async () => {
        const configs = await service.listBackupConfigs();

        expect(Array.isArray(configs)).toBe(true);
      });

      it('should include default configs on initialization', async () => {
        const configs = await service.listBackupConfigs();

        expect(configs.length).toBeGreaterThan(0);
      });
    });

    describe('createBackupConfig()', () => {
      it('should create a new backup config with generated ID', async () => {
        const config = await service.createBackupConfig({
          name: 'Test Backup Config',
          description: 'Test description',
          enabled: true
        });

        expect(config).toHaveProperty('id');
        expect(config.id).toBeTruthy();
        expect(config.name).toBe('Test Backup Config');
        expect(config.enabled).toBe(true);
      });

      it('should generate unique IDs for each config', async () => {
        const config1 = await service.createBackupConfig({ name: 'Config 1' });
        const config2 = await service.createBackupConfig({ name: 'Config 2' });

        expect(config1.id).not.toBe(config2.id);
      });
    });

    describe('updateBackupConfig()', () => {
      it('should update an existing config', async () => {
        const config = await service.createBackupConfig({ name: 'Original' });
        const updated = await service.updateBackupConfig(config.id, {
          name: 'Updated'
        });

        expect(updated.name).toBe('Updated');
        expect(updated.id).toBe(config.id);
      });

      it('should throw for non-existent config', async () => {
        await expect(
          service.updateBackupConfig('non-existent', { name: 'Test' })
        ).rejects.toThrow('not found');
      });
    });
  });

  // ============================================
  // Tests 6-9: Backup Operations
  // ============================================
  describe('Backup Operations', () => {
    describe('createBackup()', () => {
      it('should create a backup from config', async () => {
        const configs = await service.listBackupConfigs();
        if (configs.length > 0) {
          const backup = await service.createBackup(configs[0].id);

          expect(backup).toHaveProperty('id');
          expect(backup).toHaveProperty('configId', configs[0].id);
          expect(backup).toHaveProperty('status');
          expect(backup).toHaveProperty('createdAt');
        }
      });

      it('should throw for non-existent config', async () => {
        await expect(
          service.createBackup('non-existent-config')
        ).rejects.toThrow('not found');
      });
    });

    describe('listBackups()', () => {
      it('should return array of backups', async () => {
        const backups = await service.listBackups();

        expect(Array.isArray(backups)).toBe(true);
      });
    });

    describe('getBackup()', () => {
      it('should return backup by ID', async () => {
        const configs = await service.listBackupConfigs();
        if (configs.length > 0) {
          const backup = await service.createBackup(configs[0].id);
          const retrieved = await service.getBackup(backup.id);

          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(backup.id);
        }
      });

      it('should return null for non-existent ID', async () => {
        const backup = await service.getBackup('non-existent-id');

        expect(backup).toBeNull();
      });
    });
  });

  // ============================================
  // Tests 10-11: Backup Verification
  // ============================================
  describe('Backup Verification', () => {
    describe('verifyBackup()', () => {
      it('should verify backup and return validation result', async () => {
        const configs = await service.listBackupConfigs();
        if (configs.length > 0) {
          const backup = await service.createBackup(configs[0].id);
          const result = await service.verifyBackup(backup.id);

          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('warnings');
          expect(result).toHaveProperty('errors');
          expect(typeof result.passed).toBe('boolean');
        }
      });

      it('should return failed validation for non-existent backup', async () => {
        const result = await service.verifyBackup('non-existent-backup');

        expect(result.passed).toBe(false);
        expect(result.errors).toContain('Backup not found');
      });
    });
  });

  // ============================================
  // Tests 12-14: Restore Operations
  // ============================================
  describe('Restore Operations', () => {
    describe('previewRestore()', () => {
      it('should preview restore and return preview object', async () => {
        const configs = await service.listBackupConfigs();
        if (configs.length > 0) {
          const backup = await service.createBackup(configs[0].id);
          const preview = await service.previewRestore(backup.id);

          expect(preview).toHaveProperty('backup');
          expect(preview).toHaveProperty('conflicts');
          expect(preview).toHaveProperty('requirements');
          expect(preview).toHaveProperty('estimatedTime');
        }
      });

      it('should throw for non-existent backup', async () => {
        await expect(
          service.previewRestore('non-existent')
        ).rejects.toThrow('not found');
      });
    });

    describe('restoreBackup()', () => {
      it('should restore from backup and return result', async () => {
        const configs = await service.listBackupConfigs();
        if (configs.length > 0) {
          const backup = await service.createBackup(configs[0].id);
          const result = await service.restoreBackup({
            backupId: backup.id,
            strategy: 'overwrite',
            scope: 'full',
            options: {
              restoreWorkflows: true,
              restoreCredentials: true
            }
          });

          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('duration');
          expect(result).toHaveProperty('restoredItems');
          expect(typeof result.duration).toBe('number');
        }
      });
    });
  });

  // ============================================
  // Tests 15-17: Disaster Recovery
  // ============================================
  describe('Disaster Recovery', () => {
    describe('createDRPlan()', () => {
      it('should create a DR plan', async () => {
        const plan = await service.createDRPlan({
          name: 'Test DR Plan',
          description: 'Test disaster recovery plan'
        });

        expect(plan).toHaveProperty('id');
        expect(plan.name).toBe('Test DR Plan');
      });
    });

    describe('testDRPlan()', () => {
      it('should test a DR plan and return result', async () => {
        const plan = await service.createDRPlan({
          name: 'Test Plan'
        });

        const result = await service.testDRPlan(plan.id);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('startTime');
        expect(result).toHaveProperty('endTime');
        expect(result).toHaveProperty('metrics');
      });

      it('should throw for non-existent DR plan', async () => {
        await expect(
          service.testDRPlan('non-existent')
        ).rejects.toThrow('not found');
      });
    });

    describe('activateDRPlan()', () => {
      it('should activate a DR plan', async () => {
        const plan = await service.createDRPlan({
          name: 'Activation Test Plan'
        });

        const result = await service.activateDRPlan(plan.id);

        expect(result).toHaveProperty('activated', true);
        expect(result).toHaveProperty('startTime');
        expect(result).toHaveProperty('status');
      });
    });
  });

  // ============================================
  // Tests 18-20: Utility Operations
  // ============================================
  describe('Utility Operations', () => {
    describe('calculateBackupSize()', () => {
      it('should calculate and return backup size', async () => {
        const size = await service.calculateBackupSize({
          includeWorkflows: ['*'],
          excludeWorkflows: [],
          includeCredentials: true,
          includeExecutionHistory: false,
          includeNodeData: true,
          includeLogs: false,
          includeMetrics: false
        });

        expect(typeof size).toBe('number');
        expect(size).toBeGreaterThanOrEqual(0);
      });
    });

    describe('exportBackup()', () => {
      it('should export backup as blob', async () => {
        const configs = await service.listBackupConfigs();
        if (configs.length > 0) {
          const backup = await service.createBackup(configs[0].id);
          const blob = await service.exportBackup(backup.id, 'zip');

          expect(blob).toBeInstanceOf(Blob);
        }
      });

      it('should throw for non-existent backup', async () => {
        await expect(
          service.exportBackup('non-existent', 'zip')
        ).rejects.toThrow('not found');
      });
    });

    describe('scheduleBackup()', () => {
      it('should schedule a backup without throwing', async () => {
        const configs = await service.listBackupConfigs();
        if (configs.length > 0) {
          await expect(
            service.scheduleBackup(configs[0].id)
          ).resolves.not.toThrow();
        }
      });
    });
  });
});
