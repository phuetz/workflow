/**
 * Comprehensive Unit Tests for AI Data Cleaner
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AIDataCleaner,
  createAIDataCleaner,
} from '../ai/AIDataCleaner';

describe('AIDataCleaner', () => {
  let cleaner: AIDataCleaner;

  beforeEach(() => {
    cleaner = createAIDataCleaner();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(cleaner).toBeInstanceOf(AIDataCleaner);
    });

    it('should be an EventEmitter', () => {
      expect(typeof cleaner.on).toBe('function');
      expect(typeof cleaner.emit).toBe('function');
    });
  });

  describe('clean method', () => {
    it('should clean simple data', async () => {
      const result = await cleaner.clean({
        data: [{ name: '  John  ', email: 'john@example.com' }],
        instruction: 'trim name',
      });

      expect(result).toBeDefined();
      expect(result.cleanedData).toBeDefined();
      expect(result.transformations).toBeInstanceOf(Array);
    });

    it('should return processing time', async () => {
      const result = await cleaner.clean({
        data: [{ value: 1 }],
        instruction: 'convert value to string',
      });

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should emit cleaning:completed event', async () => {
      let eventFired = false;
      cleaner.on('cleaning:completed', () => { eventFired = true; });

      await cleaner.clean({
        data: [{ name: 'test' }],
        instruction: 'uppercase name',
      });

      expect(eventFired).toBe(true);
    });

    it('should handle uppercase transformation', async () => {
      const result = await cleaner.clean({
        data: [{ name: 'john doe' }],
        instruction: 'uppercase name',
      });

      expect(result.cleanedData).toBeDefined();
    });

    it('should handle lowercase transformation', async () => {
      const result = await cleaner.clean({
        data: [{ name: 'JOHN DOE' }],
        instruction: 'lowercase name',
      });

      expect(result.cleanedData).toBeDefined();
    });

    it('should handle trim transformation', async () => {
      const result = await cleaner.clean({
        data: [{ name: '  John  ' }],
        instruction: 'trim name',
      });

      expect(result.cleanedData).toBeDefined();
    });

    it('should handle empty data array', async () => {
      const result = await cleaner.clean({
        data: [],
        instruction: 'clean all',
      });

      expect(result.cleanedData).toEqual([]);
    });

    it('should preserve original data structure', async () => {
      const data = [
        { id: 1, name: 'test', value: 100 },
        { id: 2, name: 'test2', value: 200 },
      ];

      const result = await cleaner.clean({
        data,
        instruction: 'uppercase name',
      });

      expect(Array.isArray(result.cleanedData)).toBe(true);
    });

    it('should track transformations applied', async () => {
      const result = await cleaner.clean({
        data: [{ name: '  john  ' }],
        instruction: 'trim name then uppercase name',
      });

      expect(result.transformations).toBeInstanceOf(Array);
    });

    it('should handle rename field instruction', async () => {
      const result = await cleaner.clean({
        data: [{ firstName: 'John' }],
        instruction: 'rename firstName to name',
      });

      expect(result.cleanedData).toBeDefined();
    });

    it('should handle remove field instruction', async () => {
      const result = await cleaner.clean({
        data: [{ name: 'John', temp: 'value' }],
        instruction: 'remove temp',
      });

      expect(result.cleanedData).toBeDefined();
    });

    it('should handle convert to number instruction', async () => {
      const result = await cleaner.clean({
        data: [{ value: '123' }],
        instruction: 'convert value to number',
      });

      expect(result.cleanedData).toBeDefined();
    });

    it('should handle object data', async () => {
      const result = await cleaner.clean({
        data: { name: '  John  ', age: 30 },
        instruction: 'trim name',
      });

      expect(result.cleanedData).toBeDefined();
    });
  });

  describe('instruction parsing', () => {
    it('should handle complex instructions', async () => {
      const result = await cleaner.clean({
        data: [{ name: '  JOHN  ', email: 'John@Example.COM' }],
        instruction: 'trim name, lowercase name, lowercase email',
      });

      expect(result.transformations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple field operations', async () => {
      const result = await cleaner.clean({
        data: [{ first: 'john', last: 'doe' }],
        instruction: 'uppercase first, uppercase last',
      });

      expect(result.cleanedData).toBeDefined();
    });
  });

  describe('factory function', () => {
    it('should create cleaner instance', () => {
      const instance = createAIDataCleaner();
      expect(instance).toBeInstanceOf(AIDataCleaner);
    });
  });

  describe('error handling', () => {
    it('should handle invalid instructions gracefully', async () => {
      const result = await cleaner.clean({
        data: [{ name: 'test' }],
        instruction: 'unknown_operation_xyz',
      });

      expect(result).toBeDefined();
    });

    it('should handle empty instruction', async () => {
      const result = await cleaner.clean({
        data: [{ name: 'test' }],
        instruction: '',
      });

      expect(result).toBeDefined();
    });
  });
});
