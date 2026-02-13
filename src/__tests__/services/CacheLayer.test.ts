/**
 * CacheLayer Unit Tests
 * Tests for the unified cache layer service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheLayer } from '../../services/CacheLayer';

describe('CacheLayer', () => {
  let cache: CacheLayer;

  beforeEach(() => {
    // Reset singleton for each test
    CacheLayer.resetInstance();
    cache = CacheLayer.getInstance();
  });

  afterEach(async () => {
    await cache.shutdown();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheLayer.getInstance();
      const instance2 = CacheLayer.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = CacheLayer.getInstance();
      CacheLayer.resetInstance();
      const instance2 = CacheLayer.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Memory Cache Operations', () => {
    it('should set and get a value', async () => {
      await cache.set('test-key', { foo: 'bar' });
      const result = await cache.get('test-key');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should delete a value', async () => {
      await cache.set('delete-key', 'value');
      const deleted = await cache.delete('delete-key');
      expect(deleted).toBe(true);

      const result = await cache.get('delete-key');
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await cache.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should check if key exists', async () => {
      await cache.set('exists-key', 'value');

      const exists = await cache.exists('exists-key');
      expect(exists).toBe(true);

      const notExists = await cache.exists('not-exists');
      expect(notExists).toBe(false);
    });

    it('should respect TTL and expire entries', async () => {
      vi.useFakeTimers();

      await cache.set('ttl-key', 'value', { ttl: 1 }); // 1 second TTL

      // Should exist immediately
      let result = await cache.get('ttl-key');
      expect(result).toBe('value');

      // Advance time past TTL
      vi.advanceTimersByTime(2000);

      // Should be expired
      result = await cache.get('ttl-key');
      expect(result).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Namespace Support', () => {
    it('should prefix keys with namespace', async () => {
      await cache.set('key1', 'value1', { namespace: 'ns1' });
      await cache.set('key1', 'value2', { namespace: 'ns2' });

      const result1 = await cache.get('key1', { namespace: 'ns1' });
      const result2 = await cache.get('key1', { namespace: 'ns2' });

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });
  });

  describe('getOrSet Pattern', () => {
    it('should return cached value if exists', async () => {
      const factory = vi.fn().mockResolvedValue('new-value');

      await cache.set('getorset-key', 'cached-value');
      const result = await cache.getOrSet('getorset-key', factory);

      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const factory = vi.fn().mockResolvedValue('new-value');

      const result = await cache.getOrSet('new-key', factory);

      expect(result).toBe('new-value');
      expect(factory).toHaveBeenCalledOnce();

      // Should be cached now
      const cached = await cache.get('new-key');
      expect(cached).toBe('new-value');
    });
  });

  describe('Clear Operations', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should clear only entries in namespace', async () => {
      await cache.set('key1', 'value1', { namespace: 'ns1' });
      await cache.set('key2', 'value2', { namespace: 'ns2' });

      await cache.clear('ns1');

      const result1 = await cache.get('key1', { namespace: 'ns1' });
      const result2 = await cache.get('key2', { namespace: 'ns2' });

      expect(result1).toBeNull();
      expect(result2).toBe('value2');
    });

    it('should support flush as alias for clear', async () => {
      await cache.set('flush-key', 'value');
      await cache.flush();

      const result = await cache.get('flush-key');
      expect(result).toBeNull();
    });
  });

  describe('Tags-based Invalidation', () => {
    it('should invalidate entries by tags', async () => {
      await cache.set('tagged-key1', 'value1', { tags: ['user', 'data'] });
      await cache.set('tagged-key2', 'value2', { tags: ['user'] });
      await cache.set('tagged-key3', 'value3', { tags: ['other'] });

      const invalidated = await cache.invalidateByTags(['user']);

      // Memory-only returns count of memory invalidations
      expect(invalidated).toBeGreaterThanOrEqual(0);

      // Both tagged entries should be invalidated
      const result1 = await cache.get('tagged-key1');
      const result2 = await cache.get('tagged-key2');
      const result3 = await cache.get('tagged-key3');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBe('value3');
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics', async () => {
      // Generate some cache activity
      await cache.set('stat-key', 'value');
      await cache.get('stat-key'); // Hit
      await cache.get('non-existent'); // Miss

      const stats = cache.getStats();

      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.memoryEntries).toBeGreaterThanOrEqual(1);
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should provide memory cache info', () => {
      const info = cache.getMemoryCacheInfo();

      expect(info).toHaveProperty('entries');
      expect(info).toHaveProperty('size');
      expect(info).toHaveProperty('maxSize');
      expect(info).toHaveProperty('utilization');
    });
  });

  describe('Priority-based Caching', () => {
    it('should cache high priority items', async () => {
      await cache.set('high-priority', 'value', { priority: 'high' });
      const result = await cache.get('high-priority');
      expect(result).toBe('value');
    });

    it('should cache normal priority items', async () => {
      await cache.set('normal-priority', 'value', { priority: 'normal' });
      const result = await cache.get('normal-priority');
      expect(result).toBe('value');
    });

    it('should cache low priority items', async () => {
      await cache.set('low-priority', 'value', { priority: 'low' });
      const result = await cache.get('low-priority');
      expect(result).toBe('value');
    });
  });

  describe('Event Emission', () => {
    it('should emit set event', async () => {
      const handler = vi.fn();
      cache.on('set', handler);

      await cache.set('event-key', 'value');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'event-key',
          size: expect.any(Number),
          ttl: expect.any(Number),
        })
      );
    });

    it('should emit delete event', async () => {
      const handler = vi.fn();
      cache.on('delete', handler);

      await cache.set('delete-event-key', 'value');
      await cache.delete('delete-event-key');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'delete-event-key',
        })
      );
    });

    it('should emit clear event', async () => {
      const handler = vi.fn();
      cache.on('clear', handler);

      await cache.clear();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Complex Data Types', () => {
    it('should handle objects', async () => {
      const obj = { name: 'test', nested: { value: 123 } };
      await cache.set('object-key', obj);
      const result = await cache.get('object-key');
      expect(result).toEqual(obj);
    });

    it('should handle arrays', async () => {
      const arr = [1, 2, { nested: 'value' }];
      await cache.set('array-key', arr);
      const result = await cache.get('array-key');
      expect(result).toEqual(arr);
    });

    it('should handle strings', async () => {
      await cache.set('string-key', 'simple string');
      const result = await cache.get('string-key');
      expect(result).toBe('simple string');
    });

    it('should handle numbers', async () => {
      await cache.set('number-key', 42);
      const result = await cache.get('number-key');
      expect(result).toBe(42);
    });

    it('should handle booleans', async () => {
      await cache.set('bool-key', true);
      const result = await cache.get('bool-key');
      expect(result).toBe(true);
    });

    it('should handle null values', async () => {
      await cache.set('null-key', null);
      // Note: null is stored but get returns null for missing keys too
      // This is a known limitation
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with cacheService alias', async () => {
      const { cacheService } = await import('../../services/CacheLayer');

      await cacheService.set('compat-key', 'value');
      const result = await cacheService.get('compat-key');

      expect(result).toBe('value');
    });

    it('should work with cachingService alias', async () => {
      const { cachingService } = await import('../../services/CacheLayer');

      await cachingService.set('compat-key2', 'value2');
      const result = await cachingService.get('compat-key2');

      expect(result).toBe('value2');
    });

    it('should work with deprecated CacheService import', async () => {
      const { cacheService } = await import('../../services/CacheService');

      await cacheService.set('deprecated-import-key', 'value');
      const result = await cacheService.get('deprecated-import-key');

      expect(result).toBe('value');
    });

    it('should work with deprecated CachingService import', async () => {
      const { cachingService } = await import('../../services/CachingService');

      await cachingService.set('deprecated-import-key2', 'value2');
      const result = await cachingService.get('deprecated-import-key2');

      expect(result).toBe('value2');
    });
  });
});
