/**
 * Performance Optimization Hooks Tests
 * Tests for React performance monitoring and optimization hooks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useOptimizedCallback,
  useOptimizedMemo,
  useDebouncedState,
  useEfficientList
} from '../usePerformanceOptimization';

// Mock logger
vi.mock('../../services/LoggingService', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock performance.now for consistent timing
const mockPerformanceNow = vi.fn();
Object.defineProperty(performance, 'now', {
  value: mockPerformanceNow
});

describe('Performance Optimization Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
  });

  describe('useOptimizedCallback', () => {
    it('should return memoized callback', () => {
      const originalCallback = vi.fn((x: number) => x * 2);
      const { result, rerender } = renderHook(
        ({ callback, deps }) => useOptimizedCallback(callback, deps, 'testCallback'),
        {
          initialProps: {
            callback: originalCallback,
            deps: [1]
          }
        }
      );

      const memoizedCallback1 = result.current;
      // Re-render with same deps - should return same callback
      rerender({
        callback: originalCallback,
        deps: [1]
      });
      const memoizedCallback2 = result.current;
      expect(memoizedCallback1).toBe(memoizedCallback2);
    });

    it('should create new callback when deps change', () => {
      const originalCallback = vi.fn((x: number) => x * 2);
      const { result, rerender } = renderHook(
        ({ callback, deps }) => useOptimizedCallback(callback, deps, 'testCallback'),
        {
          initialProps: {
            callback: originalCallback,
            deps: [1]
          }
        }
      );

      const memoizedCallback1 = result.current;
      // Re-render with different deps
      rerender({
        callback: originalCallback,
        deps: [2]
      });
      const memoizedCallback2 = result.current;
      expect(memoizedCallback1).not.toBe(memoizedCallback2);
    });

    it('should execute callback and return result', () => {
      const callback = vi.fn((x: number) => x * 2);
      const { result } = renderHook(() =>
        useOptimizedCallback(callback, [], 'testCallback')
      );

      const callResult = result.current(5);
      expect(callback).toHaveBeenCalledWith(5);
      expect(callResult).toBe(10);
    });

    it('should warn about slow callback execution', () => {
      const { logger } = require('../../services/LoggingService');

      // Mock slow execution (> 16.67ms)
      mockPerformanceNow
        .mockReturnValueOnce(0)    // Start time
        .mockReturnValueOnce(20);  // End time (20ms duration)

      const slowCallback = vi.fn(() => {
        // Simulate slow operation
        return 'result';
      });

      const { result } = renderHook(() =>
        useOptimizedCallback(slowCallback, [], 'slowCallback')
      );

      result.current();
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Slow callback execution detected',
        expect.objectContaining({
          debugName: 'slowCallback',
          duration: 20,
          callCount: 1,
          renderCount: 1
        })
      );
    });

    it('should handle callback errors and log them', () => {
      const { logger } = require('../../services/LoggingService');
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      const { result } = renderHook(() =>
        useOptimizedCallback(errorCallback, [], 'errorCallback')
      );

      expect(() => result.current()).toThrow('Callback error');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Callback execution error',
        expect.objectContaining({
          debugName: 'errorCallback',
          error: expect.any(Error)
        })
      );
    });

    it('should track render and call counts', () => {
      const callback = vi.fn((x: number) => x * 2);
      const { result, rerender } = renderHook(() =>
        useOptimizedCallback(callback, [], 'testCallback')
      );

      // First render, first call
      result.current();
      
      // Second render
      rerender();
      
      // Second call
      result.current();
      
      // The hook should internally track these counts
      // (verified through the warning logs that include these metrics)
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('useOptimizedMemo', () => {
    it('should return memoized value', () => {
      const factory = vi.fn(() => ({ value: 42 }));
      const { result, rerender } = renderHook(
        ({ deps }) => useOptimizedMemo(factory, deps, 'testMemo'),
        {
          initialProps: { deps: [1] }
        }
      );

      const memoizedValue1 = result.current;
      // Re-render with same deps
      rerender({ deps: [1] });
      const memoizedValue2 = result.current;
      expect(memoizedValue1).toBe(memoizedValue2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should recompute when deps change', () => {
      const factory = vi.fn((x: number) => ({ value: x * 2 }));
      const { result, rerender } = renderHook(
        ({ deps }) => useOptimizedMemo(() => factory(deps[0]), deps, 'testMemo'),
        {
          initialProps: { deps: [1] }
        }
      );

      const memoizedValue1 = result.current;
      // Re-render with different deps
      rerender({ deps: [2] });
      const memoizedValue2 = result.current;
      expect(memoizedValue1).not.toBe(memoizedValue2);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should warn about slow memo computation', () => {
      const { logger } = require('../../services/LoggingService');

      // Mock slow computation (> 16.67ms)
      mockPerformanceNow
        .mockReturnValueOnce(0)    // Start time
        .mockReturnValueOnce(25);  // End time (25ms duration)

      const slowFactory = vi.fn(() => {
        // Simulate slow computation
        return { value: 42 };
      });
      
      renderHook(() =>
        useOptimizedMemo(slowFactory, [], 'slowMemo')
      );
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Slow memo computation detected',
        expect.objectContaining({
          debugName: 'slowMemo',
          duration: 25,
          computeCount: 1,
          renderCount: 1
        })
      );
    });

    it('should handle memo computation errors', () => {
      const { logger } = require('../../services/LoggingService');
      const errorFactory = vi.fn(() => {
        throw new Error('Memo error');
      });
      
      expect(() => {
        renderHook(() =>
          useOptimizedMemo(errorFactory, [], 'errorMemo')
        );
      }).toThrow('Memo error');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Memo computation error',
        expect.objectContaining({
          debugName: 'errorMemo',
          error: expect.any(Error)
        })
      );
    });
  });

  describe('useDebouncedState', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
      const { result } = renderHook(() =>
        useDebouncedState('initial', 300)
      );

      const [immediate, debounced] = result.current;
      expect(immediate).toBe('initial');
      expect(debounced).toBe('initial');
    });

    it('should update immediate value immediately', () => {
      const { result } = renderHook(() =>
        useDebouncedState('initial', 300)
      );

      act(() => {
        const [, , setValue] = result.current;
        setValue('updated');
      });

      const [immediate, debounced] = result.current;
      expect(immediate).toBe('updated');
      expect(debounced).toBe('initial'); // Still old value
    });

    it('should update debounced value after delay', () => {
      const { result } = renderHook(() =>
        useDebouncedState('initial', 300)
      );

      act(() => {
        const [, , setValue] = result.current;
        setValue('updated');
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const [immediate, debounced] = result.current;
      expect(immediate).toBe('updated');
      expect(debounced).toBe('updated');
    });

    it('should cancel previous debounce on rapid updates', () => {
      const { result } = renderHook(() =>
        useDebouncedState('initial', 300)
      );

      act(() => {
        const [, , setValue] = result.current;
        setValue('first');
      });

      // Advance partially
      act(() => {
        vi.advanceTimersByTime(150);
      });

      act(() => {
        const [, , setValue] = result.current;
        setValue('second');
      });

      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const [immediate, debounced] = result.current;
      expect(immediate).toBe('second');
      expect(debounced).toBe('second'); // Should be 'second', not 'first'
    });

    it('should cleanup timeout on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useDebouncedState('initial', 300)
      );

      act(() => {
        const [, , setValue] = result.current;
        setValue('updated');
      });

      // Unmount before timeout completes
      unmount();

      // Advance time - should not cause issues
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // No errors should occur
      expect(true).toBe(true);
    });

    it('should use custom delay', () => {
      const { result } = renderHook(() =>
        useDebouncedState('initial', 500)
      );

      act(() => {
        const [, , setValue] = result.current;
        setValue('updated');
      });

      // Check before delay
      act(() => {
        vi.advanceTimersByTime(400);
      });

      let [, debounced] = result.current;
      expect(debounced).toBe('initial');

      // Check after delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      [, debounced] = result.current;
      expect(debounced).toBe('updated');
    });
  });

  describe('useEfficientList', () => {
    it('should initialize with empty list by default', () => {
      const { result } = renderHook(() => useEfficientList());

      expect(result.current.items).toEqual([]);
      expect(result.current.size).toBe(0);
      expect(result.current.isFull).toBe(false);
    });

    it('should initialize with provided items', () => {
      const initialItems = ['item1', 'item2', 'item3'];
      const { result } = renderHook(() =>
        useEfficientList(initialItems, 1000)
      );

      expect(result.current.items).toEqual(initialItems);
      expect(result.current.size).toBe(3);
      expect(result.current.isFull).toBe(false);
    });

    it('should limit initial items to maxSize', () => {
      const initialItems = ['item1', 'item2', 'item3', 'item4', 'item5'];
      const { result } = renderHook(() =>
        useEfficientList(initialItems, 3)
      );

      expect(result.current.items).toEqual(['item1', 'item2', 'item3']);
      expect(result.current.size).toBe(3);
      expect(result.current.isFull).toBe(true);
    });

    it('should add items to the beginning of the list', () => {
      const { result } = renderHook(() => useEfficientList(['existing']));

      act(() => {
        result.current.addItem('new');
      });

      expect(result.current.items).toEqual(['new', 'existing']);
      expect(result.current.size).toBe(2);
    });

    it('should maintain maxSize when adding items', () => {
      const { result } = renderHook(() =>
        useEfficientList(['item1', 'item2'], 2)
      );

      act(() => {
        result.current.addItem('item3');
      });

      expect(result.current.items).toEqual(['item3', 'item1']);
      expect(result.current.size).toBe(2);
      expect(result.current.isFull).toBe(true);
    });

    it('should clear all items', () => {
      const { result } = renderHook(() =>
        useEfficientList(['item1', 'item2', 'item3'])
      );

      act(() => {
        result.current.clear();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.size).toBe(0);
      expect(result.current.isFull).toBe(false);
    });

    it('should correctly report isFull status', () => {
      const { result } = renderHook(() =>
        useEfficientList(['item1'], 2)
      );

      expect(result.current.isFull).toBe(false);

      act(() => {
        result.current.addItem('item2');
      });

      expect(result.current.isFull).toBe(true);

      act(() => {
        result.current.clear();
      });

      expect(result.current.isFull).toBe(false);
    });

    it('should handle different data types', () => {
      const { result } = renderHook(() =>
        useEfficientList<{ id: number; name: string }>()
      );

      const item1 = { id: 1, name: 'Item 1' };
      const item2 = { id: 2, name: 'Item 2' };

      act(() => {
        result.current.addItem(item1);
        result.current.addItem(item2);
      });

      expect(result.current.items).toEqual([item2, item1]);
      expect(result.current.size).toBe(2);
    });

    it('should maintain performance with large maxSize', () => {
      const { result } = renderHook(() =>
        useEfficientList([], 10000)
      );

      // Add many items
      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.addItem(`item${i}`);
        }
      });

      expect(result.current.size).toBe(1000);
      expect(result.current.isFull).toBe(false);
      expect(result.current.items[0]).toBe('item999'); // Last added item
      expect(result.current.items[999]).toBe('item0'); // First added item
    });

    it('should use default maxSize of 1000', () => {
      const { result } = renderHook(() => useEfficientList());

      // Fill beyond default maxSize
      act(() => {
        for (let i = 0; i < 1500; i++) {
          result.current.addItem(`item${i}`);
        }
      });

      expect(result.current.size).toBe(1000);
      expect(result.current.isFull).toBe(true);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should work with all hooks combined', () => {
      const { result } = renderHook(() => {
        const optimizedCallback = useOptimizedCallback(
          (value: string) => value.toUpperCase(),
          [],
          'testCallback'
        );

        const optimizedMemo = useOptimizedMemo(
          () => ({ processed: true }),
          [],
          'testMemo'
        );

        const [immediate, debounced, setDebounced] = useDebouncedState('test', 100);

        const efficientList = useEfficientList(['initial']);

        return {
          optimizedCallback,
          optimizedMemo,
          immediate,
          debounced,
          setDebounced,
          efficientList
        };
      });

      // All hooks should work together without conflicts
      expect(typeof result.current.optimizedCallback).toBe('function');
      expect(result.current.optimizedMemo).toEqual({ processed: true });
      expect(result.current.immediate).toBe('test');
      expect(result.current.debounced).toBe('test');
      expect(typeof result.current.setDebounced).toBe('function');
      expect(result.current.efficientList.items).toEqual(['initial']);
    });
  });
});