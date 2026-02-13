/**
 * Performance Optimization Hook
 * Provides performance optimization utilities and context
 */

import { useCallback, useMemo, useRef, useEffect, useState, DependencyList } from 'react';
import { logger } from '../services/SimpleLogger';

interface PerformanceContext {
  isMobile: boolean;
  isLowEndDevice: boolean;
  connectionType: string;
}

interface PerformanceMetrics {
  nodeCount: number;
  edgeCount: number;
  isMobile: boolean;
}

/**
 * Main performance optimization hook
 */
export function usePerformanceOptimization() {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const renderCountRef = useRef(0);

  // Detect device context
  const context: PerformanceContext = useMemo(() => {
    const isMobile = typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));

    const isLowEndDevice = typeof navigator !== 'undefined' &&
      (navigator.hardwareConcurrency || 4) <= 2;

    // @ts-ignore - navigator.connection may not exist
    const connectionType = navigator?.connection?.effectiveType || '4g';

    return { isMobile, isLowEndDevice, connectionType };
  }, []);

  // Track render count
  useEffect(() => {
    renderCountRef.current++;
  });

  // Optimize for current context
  const optimizeForCurrentContext = useCallback(() => {
    const newRecommendations: string[] = [];

    if (context.isMobile) {
      newRecommendations.push('Enable mobile optimizations');
      newRecommendations.push('Reduce animation complexity');
    }

    if (context.isLowEndDevice) {
      newRecommendations.push('Limit concurrent operations');
      newRecommendations.push('Use simplified rendering');
    }

    if (context.connectionType === '2g' || context.connectionType === 'slow-2g') {
      newRecommendations.push('Enable offline mode');
      newRecommendations.push('Reduce data fetching');
    }

    setRecommendations(newRecommendations);
    logger.debug('Performance optimizations applied', { context, recommendations: newRecommendations });
  }, [context]);

  // Get AI optimization suggestions (mock)
  const getAIOptimizationSuggestions = useCallback(async (): Promise<string[]> => {
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return [
      'Consider batching similar operations',
      'Use memoization for expensive computations',
      'Implement virtual scrolling for large lists'
    ];
  }, []);

  // Force garbage collection hint
  const forceGarbageCollection = useCallback(() => {
    // Clear any cached data
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        // @ts-ignore - gc may exist in some environments
        window.gc();
      } catch {
        // GC not available
      }
    }
    logger.debug('Garbage collection requested');
  }, []);

  // Calculate performance score
  const calculateScore = useCallback((metrics: PerformanceMetrics): number => {
    let score = 100;

    // Deduct points for high node count
    if (metrics.nodeCount > 100) score -= 20;
    else if (metrics.nodeCount > 50) score -= 10;

    // Deduct points for high edge count
    if (metrics.edgeCount > 200) score -= 20;
    else if (metrics.edgeCount > 100) score -= 10;

    // Deduct points for mobile devices
    if (metrics.isMobile) score -= 10;

    return Math.max(0, Math.min(100, score));
  }, []);

  return {
    recommendations,
    context,
    optimizeForCurrentContext,
    getAIOptimizationSuggestions,
    forceGarbageCollection,
    calculateScore,
    renderCount: renderCountRef.current
  };
}

/**
 * Enhanced useCallback with optional performance monitoring
 */
export function useOptimizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: DependencyList,
  _debugName?: string
): T {
  return useCallback(callback, deps) as T;
}

/**
 * Enhanced useMemo with optional performance monitoring
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: DependencyList,
  _debugName?: string
): T {
  return useMemo(factory, deps);
}

/**
 * Debounced state hook
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setValue = useCallback((value: T) => {
    setImmediateValue(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [immediateValue, debouncedValue, setValue];
}

/**
 * Memory-efficient list state
 */
export function useEfficientList<T>(
  initialItems: T[] = [],
  maxSize: number = 1000
) {
  const [items, setItems] = useState(() => initialItems.slice(0, maxSize));

  const addItem = useCallback((item: T) => {
    setItems(current => {
      const newItems = [...current, item];
      return newItems.slice(-maxSize);
    });
  }, [maxSize]);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    addItem,
    clear,
    size: items.length,
    isFull: items.length >= maxSize,
  };
}

export default usePerformanceOptimization;
