/**
 * Performance Optimization Utilities
 * Provides tools for React component optimization
 */

import React from 'react';

/**
 * Deep comparison for React.memo
 * Use for complex props with nested objects
 */
export const deepCompare = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keys?: (keyof T)[]
): boolean => {
  const keysToCompare = keys || Object.keys(prevProps) as (keyof T)[];

  return keysToCompare.every((key) => {
    const prev = prevProps[key];
    const next = nextProps[key];

    // Same reference
    if (prev === next) return true;

    // Both null/undefined
    if (prev == null && next == null) return true;

    // One is null/undefined
    if (prev == null || next == null) return false;

    // Arrays
    if (Array.isArray(prev) && Array.isArray(next)) {
      if (prev.length !== next.length) return false;
      return prev.every((item, index) => {
        if (typeof item === 'object' && item !== null) {
          return JSON.stringify(item) === JSON.stringify(next[index]);
        }
        return item === next[index];
      });
    }

    // Objects
    if (typeof prev === 'object' && typeof next === 'object') {
      return JSON.stringify(prev) === JSON.stringify(next);
    }

    // Primitives
    return prev === next;
  });
};

/**
 * Shallow comparison for React.memo
 * Use for simple props with primitives
 */
export const shallowCompare = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T
): boolean => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) return false;

  return prevKeys.every((key) => prevProps[key] === nextProps[key]);
};

/**
 * Performance monitoring HOC
 * Wraps component to measure render performance
 */
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    const startTime = performance.now();

    React.useEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      if (renderTime > 16) { // Longer than one frame (60fps)
        console.warn(
          `[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render (target: <16ms)`
        );
      }
    });

    return React.createElement(Component, props);
  });
};

/**
 * Debounce hook for expensive operations
 */
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Throttle hook for high-frequency events
 */
export const useThrottle = <T,>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

/**
 * Intersection Observer hook for lazy rendering
 */
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
};

/**
 * Image lazy loading hook
 */
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const isVisible = useIntersectionObserver(imageRef, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  React.useEffect(() => {
    if (isVisible && !isLoaded) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
    }
  }, [isVisible, src, isLoaded]);

  return { imageSrc, isLoaded, imageRef };
};

/**
 * Memoized selector hook
 * Use for deriving expensive computed values from store
 */
export const useMemoizedSelector = <T, R>(
  selector: (state: T) => R,
  state: T,
  dependencies: React.DependencyList = []
): R => {
  return React.useMemo(() => selector(state), [state, ...dependencies]);
};

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private static metrics: Map<string, number[]> = new Map();

  static record(componentName: string, duration: number): void {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, []);
    }
    this.metrics.get(componentName)!.push(duration);
  }

  static getStats(componentName: string) {
    const durations = this.metrics.get(componentName) || [];
    if (durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    return {
      count: durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  static getAllStats() {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    this.metrics.forEach((_value, key) => {
      stats[key] = this.getStats(key);
    });
    return stats;
  }

  static clear(): void {
    this.metrics.clear();
  }
}

/**
 * Component render tracker
 */
export const useRenderCount = (componentName: string): void => {
  const renderCount = React.useRef(0);

  React.useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current > 10) {
      console.warn(
        `[Performance] ${componentName} has rendered ${renderCount.current} times`
      );
    }
  });
};

/**
 * Virtualization helper
 */
export const calculateVirtualizedRange = (
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  itemCount: number,
  overscan: number = 3
) => {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return { startIndex, endIndex };
};
