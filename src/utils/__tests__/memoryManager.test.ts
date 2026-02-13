/**
 * Memory Manager Tests
 * Comprehensive tests for memory leak prevention and monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  memoryManager,
  useMemoryManager,
  createManagedInterval,
  createManagedTimeout,
  createManagedEventListener
} from '../memoryManager';

// Mock logger
vi.mock('../../services/LoggingService', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock React for hook testing
const mockUseEffect = vi.fn((fn) => {
  const cleanup = fn();
  return cleanup;
});
const mockUseCallback = vi.fn((fn) => fn);

vi.mock('react', () => ({
  useEffect: mockUseEffect,
  useCallback: mockUseCallback
}));

describe('MemoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock performance.memory
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 15000000,
        jsHeapSizeLimit: 100000000
      },
      configurable: true
    });

    // Mock window.gc
    Object.defineProperty(window, 'gc', {
      value: vi.fn(),
      configurable: true
    });

    // Clear any existing registrations
    memoryManager.cleanupAll();
  });

  afterEach(() => {
    memoryManager.cleanupAll();
    vi.clearAllTimers();
  });

  describe('Registration and Cleanup', () => {
    it('should register memory leak sources', () => {
      const cleanupFn = vi.fn();
      memoryManager.register('test-1', 'listener', 'TestComponent', cleanupFn);

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(1);
      expect(report.leaksByType.listener).toBe(1);
    });

    it('should unregister and cleanup memory leak sources', () => {
      const cleanupFn = vi.fn();
      memoryManager.register('test-1', 'listener', 'TestComponent', cleanupFn);

      const result = memoryManager.unregister('test-1');
      expect(result).toBe(true);
      expect(cleanupFn).toHaveBeenCalled();

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(0);
    });

    it('should handle unregistering unknown sources', () => {
      const result = memoryManager.unregister('unknown-id');
      expect(result).toBe(false);
    });

    it('should handle cleanup function errors gracefully', () => {
      const faultyCleanup = vi.fn(() => {
        throw new Error('Cleanup failed');
      });

      memoryManager.register('faulty', 'timeout', 'TestComponent', faultyCleanup);

      const result = memoryManager.unregister('faulty');
      expect(result).toBe(false);
      expect(faultyCleanup).toHaveBeenCalled();
    });

    it('should cleanup all registered sources', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      memoryManager.register('test-1', 'listener', 'Component1', cleanup1);
      memoryManager.register('test-2', 'interval', 'Component2', cleanup2);

      const cleanedCount = memoryManager.cleanupAll();
      expect(cleanedCount).toBe(2);
      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(0);
    });
  });

  describe('Memory Monitoring', () => {
    it('should get current memory usage', () => {
      const usage = memoryManager.getCurrentUsage();
      expect(usage).toBeTruthy();
      expect(usage!.usedJSHeapSize).toBe(10000000);
      expect(usage!.totalJSHeapSize).toBe(15000000);
      expect(usage!.jsHeapSizeLimit).toBe(100000000);
      expect(usage!.timestamp).toBeGreaterThan(0);
    });

    it('should return null when performance.memory is not available', () => {
      delete (performance as typeof performance & { memory?: unknown }).memory;

      const usage = memoryManager.getCurrentUsage();
      expect(usage).toBeNull();
    });

    it('should detect normal memory pressure', () => {
      const pressure = memoryManager.getMemoryPressure();
      expect(pressure.level).toBe('normal');
      expect(pressure.usage).toBe(0.1); // 10MB / 100MB
      expect(pressure.recommendations).toHaveLength(0);
    });

    it('should detect warning memory pressure', () => {
      // Set memory usage to 85% (warning threshold is 80%)
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 85000000,
          totalJSHeapSize: 90000000,
          jsHeapSizeLimit: 100000000
        }
      });

      const pressure = memoryManager.getMemoryPressure();
      expect(pressure.level).toBe('warning');
      expect(pressure.usage).toBe(0.85);
      expect(pressure.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect critical memory pressure', () => {
      // Set memory usage to 96% (critical threshold is 95%)
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 96000000,
          totalJSHeapSize: 98000000,
          jsHeapSizeLimit: 100000000
        }
      });

      const pressure = memoryManager.getMemoryPressure();
      expect(pressure.level).toBe('critical');
      expect(pressure.usage).toBe(0.96);
      expect(pressure.recommendations).toContain('Force garbage collection');
      expect(pressure.recommendations).toContain('Consider page reload');
    });

    it('should force garbage collection when available', () => {
      const result = memoryManager.forceGC();
      expect(result).toBe(true);
      expect(window.gc).toHaveBeenCalled();
    });

    it('should handle missing garbage collection gracefully', () => {
      delete (window as typeof window & { gc?: () => void }).gc;

      const result = memoryManager.forceGC();
      expect(result).toBe(false);
    });
  });

  describe('Memory Report', () => {
    it('should generate comprehensive memory report', () => {
      memoryManager.register('test-1', 'listener', 'Component1');
      memoryManager.register('test-2', 'listener', 'Component2');
      memoryManager.register('test-3', 'interval', 'Component3');

      const report = memoryManager.getReport();
      expect(report.current).toBeTruthy();
      expect(report.registeredLeaks).toBe(3);
      expect(report.leaksByType.listener).toBe(2);
      expect(report.leaksByType.interval).toBe(1);
      expect(report.oldestLeak).toBeTruthy();
      expect(report.memoryPressure.level).toBe('normal');
      expect(Array.isArray(report.trend)).toBe(true);
    });

    it('should identify oldest leak correctly', () => {
      // Register leaks with slight delay to ensure different timestamps
      memoryManager.register('newer', 'listener', 'Component1');

      // Manually set older timestamp
      memoryManager.register('older', 'interval', 'Component2');

      // Access private leaks map to modify timestamp
      const olderLeak = (memoryManager as any).leaks.get('older');
      const olderTimestamp = Date.now() - 60000; // 1 minute ago
      olderLeak.createdAt = olderTimestamp;

      const report = memoryManager.getReport();
      expect(report.oldestLeak?.id).toBe('older');
    });
  });

  describe('Managed Utilities', () => {
    it('should create managed interval', () => {
      const callback = vi.fn();
      const id = createManagedInterval(callback, 1000, 'TestComponent');

      expect(id).toMatch(/^interval_/);

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(1);
      expect(report.leaksByType.interval).toBe(1);
    });

    it('should create managed timeout', () => {
      const callback = vi.fn();
      const id = createManagedTimeout(callback, 1000, 'TestComponent');

      expect(id).toMatch(/^timeout_/);

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(1);
      expect(report.leaksByType.timeout).toBe(1);
    });

    it('should auto-cleanup timeout after execution', async () => {
      const callback = vi.fn();
      createManagedTimeout(callback, 50, 'TestComponent');

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callback).toHaveBeenCalled();

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(0);
    });

    it('should create managed event listener for window', () => {
      const handler = vi.fn();
      const id = createManagedEventListener(window, 'resize', handler, 'TestComponent');

      expect(id).toMatch(/^listener_/);

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(1);
      expect(report.leaksByType.listener).toBe(1);
    });

    it('should create managed event listener for document', () => {
      const handler = vi.fn();
      const id = createManagedEventListener(document, 'click', handler, 'TestComponent');

      expect(id).toMatch(/^listener_/);

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(1);
    });

    it('should create managed event listener for HTML element', () => {
      const element = document.createElement('div');
      const handler = vi.fn();
      const id = createManagedEventListener(element, 'click', handler, 'TestComponent');

      expect(id).toMatch(/^listener_/);

      const report = memoryManager.getReport();
      expect(report.registeredLeaks).toBe(1);
    });
  });

  describe('React Hook Integration', () => {
    it('should provide register and unregister functions', () => {
      // Mock React being available
      require.cache[require.resolve('react')] = {
        exports: {
          useEffect: mockUseEffect,
          useCallback: mockUseCallback
        }
      } as typeof require.cache[string];

      const hook = useMemoryManager();
      expect(typeof hook.register).toBe('function');
      expect(typeof hook.unregister).toBe('function');
      expect(typeof hook.getCurrentUsage).toBe('function');
      expect(typeof hook.getReport).toBe('function');
      expect(typeof hook.forceGC).toBe('function');
    });

    it('should setup cleanup on component unmount', () => {
      let unmountCallback: (() => void) | undefined;

      mockUseEffect.mockImplementation((fn) => {
        const cleanup = fn();
        if (typeof cleanup === 'function') {
          unmountCallback = cleanup;
        }
      });

      useMemoryManager();

      expect(mockUseEffect).toHaveBeenCalled();
      expect(typeof unmountCallback).toBe('function');
    });
  });

  describe('Automatic Cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should perform automatic cleanup during critical memory pressure', () => {
      // Set critical memory pressure
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 96000000,
          totalJSHeapSize: 98000000,
          jsHeapSizeLimit: 100000000
        }
      });

      const cleanup = vi.fn();
      memoryManager.register('old-leak', 'listener', 'Component', cleanup);

      // Fast-forward time to trigger monitoring
      vi.advanceTimersByTime(30000);

      expect(window.gc).toHaveBeenCalled();
    });

    it('should cleanup old leaks during automatic cleanup', () => {
      const oldCleanup = vi.fn();
      const newCleanup = vi.fn();

      // Register an old leak (simulate it being 6 minutes old)
      memoryManager.register('old-leak', 'listener', 'Component', oldCleanup);
      const oldLeak = (memoryManager as any).leaks.get('old-leak');
      oldLeak.createdAt = Date.now() - (6 * 60 * 1000);

      // Register a new leak
      memoryManager.register('new-leak', 'listener', 'Component', newCleanup);

      // Set critical memory to trigger cleanup
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 96000000,
          totalJSHeapSize: 98000000,
          jsHeapSizeLimit: 100000000
        }
      });

      // Trigger automatic cleanup
      vi.advanceTimersByTime(30000);

      expect(oldCleanup).toHaveBeenCalled();
      expect(newCleanup).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle performance.memory errors gracefully', () => {
      Object.defineProperty(performance, 'memory', {
        get() {
          throw new Error('Memory API error');
        }
      });

      expect(() => {
        const usage = memoryManager.getCurrentUsage();
        expect(usage).toBeNull();
      }).not.toThrow();
    });

    it('should handle garbage collection errors gracefully', () => {
      Object.defineProperty(window, 'gc', {
        value: () => {
          throw new Error('GC error');
        }
      });

      const result = memoryManager.forceGC();
      expect(result).toBe(false);
    });
  });
});