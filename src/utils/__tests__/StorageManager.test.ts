/**
 * StorageManager Tests
 * Integration tests for the centralized storage abstraction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStorageManager, StorageManager } from '../StorageManager';

describe('StorageManager', () => {
  beforeEach(() => {
    // Clear all storage and cached instances before each test
    localStorage.clear();
    sessionStorage.clear();
    StorageManager.clearInstances();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve data', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      const testData = { name: 'John', age: 30 };
      const success = await storage.setItem('user', testData);
      expect(success).toBe(true);

      const retrieved = await storage.getItem('user');
      expect(retrieved).toEqual(testData);
    });

    it('should handle different storage adapters', async () => {
      const localStore = createStorageManager({ adapter: 'localStorage', namespace: 'local' });
      const sessionStore = createStorageManager({ adapter: 'sessionStorage', namespace: 'session' });
      const memoryStore = createStorageManager({ adapter: 'memory', namespace: 'memory' });

      // Test localStorage
      await localStore.setItem('key1', 'value1');

      // Test sessionStorage
      await sessionStore.setItem('key2', 'value2');

      // Test memory storage
      await memoryStore.setItem('key3', 'value3');

      expect(await localStore.getItem('key1')).toBe('value1');
      expect(await sessionStore.getItem('key2')).toBe('value2');
      expect(await memoryStore.getItem('key3')).toBe('value3');
    });

    it('should return null for non-existent items', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      const result = await storage.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('should return default value for non-existent items', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      const result = await storage.getItem('nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('should remove items', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      await storage.setItem('toRemove', 'value');
      expect(await storage.getItem('toRemove')).toBe('value');

      const removed = await storage.removeItem('toRemove');
      expect(removed).toBe(true);
      expect(await storage.getItem('toRemove')).toBeNull();
    });
  });

  describe('Size Limits', () => {
    it('should reject data exceeding max size', async () => {
      const storage = createStorageManager({
        adapter: 'localStorage',
        namespace: 'test',
        maxSize: 100 // 100 bytes
      });

      const success = await storage.setItem('large', 'x'.repeat(200));
      expect(success).toBe(false);
    });

    it('should accept data within size limits', async () => {
      const storage = createStorageManager({
        adapter: 'localStorage',
        namespace: 'test',
        maxSize: 1000
      });

      const success = await storage.setItem('small', 'x'.repeat(50));
      expect(success).toBe(true);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire items after TTL', async () => {
      const storage = createStorageManager({
        adapter: 'localStorage',
        namespace: 'test',
        ttl: 100 // 100ms
      });

      await storage.setItem('expiring', 'value');
      expect(await storage.getItem('expiring')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await storage.getItem('expiring')).toBeNull();
    });

    it('should not expire items before TTL', async () => {
      const storage = createStorageManager({
        adapter: 'localStorage',
        namespace: 'test',
        ttl: 1000
      });

      await storage.setItem('notExpired', 'value');
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(await storage.getItem('notExpired')).toBe('value');
    });

    it('should allow per-item TTL override', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      await storage.setItem('shortLived', 'value', { ttl: 100 });
      await storage.setItem('longLived', 'value', { ttl: 5000 });

      // Wait 150ms
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await storage.getItem('shortLived')).toBeNull();
      expect(await storage.getItem('longLived')).toBe('value');
    });
  });

  describe('Data Integrity', () => {
    it('should detect corrupted data via checksum', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test', enableChecksum: true });
      await storage.setItem('data', { value: 'test' });

      // Manually corrupt the data
      const key = 'test:data';
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.data.value = 'corrupted';
        localStorage.setItem(key, JSON.stringify(parsed));
      }

      // Should detect corruption and return null
      const result = await storage.getItem('data');
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      // Manually set invalid JSON
      localStorage.setItem('test:invalid', 'not-json');

      const result = await storage.getItem('invalid');
      expect(result).toBeNull();
    });
  });

  describe('Namespace Isolation', () => {
    it('should isolate data between namespaces', async () => {
      const storage1 = createStorageManager({ adapter: 'localStorage', namespace: 'ns1' });
      const storage2 = createStorageManager({ adapter: 'localStorage', namespace: 'ns2' });
      await storage1.setItem('key', 'value1');
      await storage2.setItem('key', 'value2');

      expect(await storage1.getItem('key')).toBe('value1');
      expect(await storage2.getItem('key')).toBe('value2');
    });

    it('should only clear items in its namespace', async () => {
      const storage1 = createStorageManager({ adapter: 'localStorage', namespace: 'ns1' });
      const storage2 = createStorageManager({ adapter: 'localStorage', namespace: 'ns2' });
      await storage1.setItem('key1', 'value1');
      await storage2.setItem('key2', 'value2');

      await storage1.clear();

      expect(await storage1.getItem('key1')).toBeNull();
      expect(await storage2.getItem('key2')).toBe('value2');
    });
  });

  describe('Statistics and Maintenance', () => {
    it('should provide storage statistics', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      await storage.setItem('item1', { data: 'test1' });
      await storage.setItem('item2', { data: 'test2' });
      await storage.setItem('item3', { data: 'test3' });

      const stats = await storage.getStats();
      expect(stats.namespace).toBe('test');
      expect(stats.adapter).toBe('localStorage');
      expect(stats.itemCount).toBe(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestItem).toBeDefined();
      expect(stats.newestItem).toBeDefined();
    });

    it('should cleanup expired items', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      // Add items with different TTLs
      await storage.setItem('expired1', 'value', { ttl: 100 });
      await storage.setItem('expired2', 'value', { ttl: 100 });
      await storage.setItem('notExpired', 'value', { ttl: 5000 });

      // Wait for some to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await storage.cleanup();
      expect(result.removed).toBe(2);
      expect(result.errors).toBe(0);
      
      // Verify cleanup worked
      expect(await storage.getItem('expired1')).toBeNull();
      expect(await storage.getItem('expired2')).toBeNull();
      expect(await storage.getItem('notExpired')).toBe('value');
    });
  });

  describe('Complex Data Types', () => {
    it('should handle nested objects', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      const complexData = {
        user: {
          name: 'John',
          preferences: {
            theme: 'dark',
            language: 'en',
            notifications: {
              email: true,
              push: false
            }
          }
        },
        metadata: {
          created: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      await storage.setItem('complex', complexData);
      const retrieved = await storage.getItem('complex');
      expect(retrieved).toEqual(complexData);
    });

    it('should handle arrays', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      const arrayData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];

      await storage.setItem('array', arrayData);
      const retrieved = await storage.getItem('array');
      expect(retrieved).toEqual(arrayData);
    });

    it('should handle special characters in keys', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      const specialKeys = [
        'key-with-dash',
        'key_with_underscore',
        'key.with.dots',
        'key:with:colons'
      ];

      for (const key of specialKeys) {
        await storage.setItem(key, `value for ${key}`);
        expect(await storage.getItem(key)).toBe(`value for ${key}`);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle storage quota errors', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      const originalSetItem = localStorage.setItem;
      // Mock localStorage to throw quota error
      localStorage.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      const success = await storage.setItem('key', 'value');
      expect(success).toBe(false);

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('should handle corrupted storage gracefully', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      // Set some valid data first
      await storage.setItem('valid', 'data');
      
      // Corrupt the namespace
      localStorage.setItem('test:corrupted', '{invalid json');
      
      // Should still be able to get valid data
      expect(await storage.getItem('valid')).toBe('data');
      
      // Corrupted item should return null
      expect(await storage.getItem('corrupted')).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of items efficiently', async () => {
      const storage = createStorageManager({ adapter: 'localStorage', namespace: 'test' });
      const itemCount = 1000;
      const writeStart = Date.now();
      // Write many items
      for (let i = 0; i < itemCount; i++) {
        await storage.setItem(`item${i}`, { index: i, data: `data${i}` });
      }
      const writeTime = Date.now() - writeStart;

      const readStart = Date.now();
      // Read all items
      for (let i = 0; i < itemCount; i++) {
        const item = await storage.getItem(`item${i}`);
        expect(item).toEqual({ index: i, data: `data${i}` });
      }
      const readTime = Date.now() - readStart;

      // Performance assertions
      expect(writeTime).toBeLessThan(1000); // Should write 1000 items in less than 1 second
      expect(readTime).toBeLessThan(500); // Should read 1000 items in less than 0.5 seconds

      const stats = await storage.getStats();
      expect(stats.itemCount).toBe(itemCount);
    });
  });
});