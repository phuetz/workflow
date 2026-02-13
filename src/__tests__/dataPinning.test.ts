/**
 * Data Pinning Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataPinningService } from '../execution/DataPinning';

describe('DataPinningService', () => {
  let service: DataPinningService;

  beforeEach(() => {
    service = new DataPinningService();
  });

  describe('pinData', () => {
    it('should pin data to a node', () => {
      const nodeId = 'node-1';
      const data = { value: 42, name: 'test' };

      const pinned = service.pinData(nodeId, data);

      expect(pinned.nodeId).toBe(nodeId);
      expect(pinned.data).toEqual(data);
      expect(pinned.source).toBe('manual');
      expect(pinned.timestamp).toBeDefined();
    });

    it('should pin data with description', () => {
      const nodeId = 'node-1';
      const data = { value: 42 };
      const description = 'Test data';

      const pinned = service.pinData(nodeId, data, 'manual', description);

      expect(pinned.description).toBe(description);
    });

    it('should pin data from execution', () => {
      const nodeId = 'node-1';
      const data = { result: 'success' };

      const pinned = service.pinData(nodeId, data, 'execution');

      expect(pinned.source).toBe('execution');
    });

    it('should infer schema when enabled', () => {
      const service = new DataPinningService({ enableSchemaInference: true });
      const nodeId = 'node-1';
      const data = { name: 'test', value: 42, active: true };

      const pinned = service.pinData(nodeId, data);

      expect(pinned.schema).toBeDefined();
      expect(pinned.schema?.type).toBe('object');
      expect(pinned.schema?.properties).toBeDefined();
    });

    it('should reject data exceeding max size', () => {
      const service = new DataPinningService({ maxDataSize: 100 });
      const nodeId = 'node-1';
      const largeData = { data: 'x'.repeat(1000) };

      expect(() => {
        service.pinData(nodeId, largeData);
      }).toThrow(/exceeds maximum allowed size/);
    });

    it('should detect circular references', () => {
      const service = new DataPinningService({ autoValidate: true });
      const nodeId = 'node-1';
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        service.pinData(nodeId, circular);
      }).toThrow(/circular/i);
    });
  });

  describe('unpinData', () => {
    it('should unpin data from a node', () => {
      const nodeId = 'node-1';
      service.pinData(nodeId, { value: 42 });

      const result = service.unpinData(nodeId);

      expect(result).toBe(true);
      expect(service.hasPinnedData(nodeId)).toBe(false);
    });

    it('should return false if no data was pinned', () => {
      const result = service.unpinData('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getPinnedData', () => {
    it('should get pinned data for a node', () => {
      const nodeId = 'node-1';
      const data = { value: 42 };
      service.pinData(nodeId, data);

      const pinned = service.getPinnedData(nodeId);

      expect(pinned).toBeDefined();
      expect(pinned?.data).toEqual(data);
    });

    it('should return undefined for non-existent node', () => {
      const pinned = service.getPinnedData('non-existent');

      expect(pinned).toBeUndefined();
    });
  });

  describe('hasPinnedData', () => {
    it('should check if node has pinned data', () => {
      const nodeId = 'node-1';

      expect(service.hasPinnedData(nodeId)).toBe(false);

      service.pinData(nodeId, { value: 42 });

      expect(service.hasPinnedData(nodeId)).toBe(true);
    });
  });

  describe('updatePinnedData', () => {
    it('should update existing pinned data', () => {
      const nodeId = 'node-1';
      service.pinData(nodeId, { value: 42 });

      const updated = service.updatePinnedData(nodeId, { value: 100 });

      expect(updated.data).toEqual({ value: 100 });
    });

    it('should throw error if no data exists', () => {
      expect(() => {
        service.updatePinnedData('non-existent', { value: 42 });
      }).toThrow(/no pinned data found/i);
    });
  });

  describe('clearAll', () => {
    it('should clear all pinned data', () => {
      service.pinData('node-1', { value: 1 });
      service.pinData('node-2', { value: 2 });
      service.pinData('node-3', { value: 3 });

      service.clearAll();

      expect(service.hasPinnedData('node-1')).toBe(false);
      expect(service.hasPinnedData('node-2')).toBe(false);
      expect(service.hasPinnedData('node-3')).toBe(false);
    });
  });

  describe('exportPinnedData', () => {
    it('should export all pinned data', () => {
      service.pinData('node-1', { value: 1 });
      service.pinData('node-2', { value: 2 });

      const exported = service.exportPinnedData();

      expect(Object.keys(exported)).toHaveLength(2);
      expect(exported['node-1']).toBeDefined();
      expect(exported['node-2']).toBeDefined();
    });
  });

  describe('importPinnedData', () => {
    it('should import pinned data', () => {
      const data = {
        'node-1': {
          nodeId: 'node-1',
          data: { value: 1 },
          timestamp: new Date().toISOString(),
          source: 'manual' as const
        },
        'node-2': {
          nodeId: 'node-2',
          data: { value: 2 },
          timestamp: new Date().toISOString(),
          source: 'execution' as const
        }
      };

      const count = service.importPinnedData(data);

      expect(count).toBe(2);
      expect(service.hasPinnedData('node-1')).toBe(true);
      expect(service.hasPinnedData('node-2')).toBe(true);
    });
  });

  describe('generateSampleData', () => {
    it('should generate sample data for http-request', () => {
      const sample = service.generateSampleData('http-request');

      expect(sample).toHaveProperty('method');
      expect(sample).toHaveProperty('url');
      expect(sample).toHaveProperty('response');
    });

    it('should generate sample data for email', () => {
      const sample = service.generateSampleData('email');

      expect(sample).toHaveProperty('to');
      expect(sample).toHaveProperty('subject');
      expect(sample).toHaveProperty('body');
    });

    it('should generate generic sample data for unknown type', () => {
      const sample = service.generateSampleData('unknown-type');

      expect(sample).toHaveProperty('message');
      expect(sample).toHaveProperty('timestamp');
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      service.pinData('node-1', { value: 1 }, 'manual');
      service.pinData('node-2', { value: 2 }, 'execution');
      service.pinData('node-3', { value: 3 }, 'import');

      const stats = service.getStats();

      expect(stats.totalPinned).toBe(3);
      expect(stats.bySource.manual).toBe(1);
      expect(stats.bySource.execution).toBe(1);
      expect(stats.bySource.import).toBe(1);
      expect(stats.totalDataSize).toBeGreaterThan(0);
    });
  });

  describe('schema inference', () => {
    it('should infer object schema', () => {
      const service = new DataPinningService({ enableSchemaInference: true });
      const data = { name: 'test', age: 30 };

      const pinned = service.pinData('node-1', data);

      expect(pinned.schema?.type).toBe('object');
      expect(pinned.schema?.properties).toHaveProperty('name');
      expect(pinned.schema?.properties).toHaveProperty('age');
    });

    it('should infer array schema', () => {
      const service = new DataPinningService({ enableSchemaInference: true });
      const data = [{ id: 1 }, { id: 2 }];

      const pinned = service.pinData('node-1', data);

      expect(pinned.schema?.type).toBe('array');
      expect(pinned.schema?.items).toBeDefined();
    });

    it('should infer nested schema', () => {
      const service = new DataPinningService({ enableSchemaInference: true });
      const data = {
        user: {
          name: 'John',
          contact: {
            email: 'john@example.com'
          }
        }
      };

      const pinned = service.pinData('node-1', data);

      expect(pinned.schema?.type).toBe('object');
      expect(pinned.schema?.properties?.user).toBeDefined();
    });
  });
});
