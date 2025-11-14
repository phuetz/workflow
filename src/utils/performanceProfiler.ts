/**
 * Performance Profiler
 * Monitor and analyze application performance
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | '%';
  timestamp: Date;
  category: 'render' | 'network' | 'memory' | 'workflow' | 'custom';
}

export interface ProfileMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  period: { start: Date; end: Date };
  metrics: {
    avgRenderTime: number;
    avgNetworkTime: number;
    memoryUsage: number;
    slowestOperations: Array<{ name: string; duration: number }>;
    renderCount: number;
    networkRequests: number;
  };
  recommendations: string[];
}

class PerformanceProfiler {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, ProfileMark> = new Map();
  private maxMetrics: number = 1000;
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupObservers();
  }

  /**
   * Setup performance observers
   */
  private setupObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Observe long tasks
    try {
      const longTaskObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'long_task',
            value: entry.duration,
            unit: 'ms',
            category: 'render'
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (e) {
      // longtask not supported in all browsers
    }

    // Observe layout shifts
    try {
      const layoutShiftObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const cls = entry as any;
          if (!cls.hadRecentInput) {
            this.recordMetric({
              name: 'layout_shift',
              value: cls.value,
              unit: 'count',
              category: 'render'
            });
          }
        }
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(layoutShiftObserver);
    } catch (e) {
      // layout-shift not supported
    }
  }

  /**
   * Start a performance measurement
   */
  start(name: string, metadata?: Record<string, any>): void {
    const mark: ProfileMark = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.marks.set(name, mark);

    if (typeof performance.mark !== 'undefined') {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * End a performance measurement
   */
  end(name: string): number {
    const mark = this.marks.get(name);
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`);
      return 0;
    }

    mark.endTime = performance.now();
    mark.duration = mark.endTime - mark.startTime;

    if (typeof performance.mark !== 'undefined') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    this.recordMetric({
      name,
      value: mark.duration,
      unit: 'ms',
      category: 'custom'
    });

    this.marks.delete(name);

    return mark.duration;
  }

  /**
   * Measure function execution time
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    category: PerformanceMetric['category'] = 'custom'
  ): Promise<T> {
    this.start(name);

    try {
      const result = await fn();
      return result;
    } finally {
      const duration = this.end(name);
      this.recordMetric({ name, value: duration, unit: 'ms', category });
    }
  }

  /**
   * Record a metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Limit metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): number | null {
    if (typeof (performance as any).memory === 'undefined') return null;

    const memory = (performance as any).memory;
    return memory.usedJSHeapSize;
  }

  /**
   * Record memory snapshot
   */
  recordMemorySnapshot(): void {
    const usage = this.getMemoryUsage();
    if (usage !== null) {
      this.recordMetric({
        name: 'memory_usage',
        value: usage,
        unit: 'bytes',
        category: 'memory'
      });
    }
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals() {
    const vitals = {
      LCP: null as number | null, // Largest Contentful Paint
      FID: null as number | null, // First Input Delay
      CLS: null as number | null, // Cumulative Layout Shift
      FCP: null as number | null, // First Contentful Paint
      TTFB: null as number | null // Time to First Byte
    };

    // Get from performance entries
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      vitals.TTFB = navTiming.responseStart - navTiming.requestStart;
    }

    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
    if (fcp) {
      vitals.FCP = fcp.startTime;
    }

    // CLS from recorded metrics
    const clsMetrics = this.metrics.filter(m => m.name === 'layout_shift');
    if (clsMetrics.length > 0) {
      vitals.CLS = clsMetrics.reduce((sum, m) => sum + m.value, 0);
    }

    return vitals;
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Calculate average for a metric
   */
  getAverage(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Get percentile value
   */
  getPercentile(name: string, percentile: number): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Generate performance report
   */
  generateReport(startDate?: Date, endDate?: Date): PerformanceReport {
    let filteredMetrics = this.metrics;

    if (startDate) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startDate);
    }
    if (endDate) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endDate);
    }

    const renderMetrics = filteredMetrics.filter(m => m.category === 'render');
    const networkMetrics = filteredMetrics.filter(m => m.category === 'network');
    const memoryMetrics = filteredMetrics.filter(m => m.name === 'memory_usage');

    const avgRenderTime =
      renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length || 0;

    const avgNetworkTime =
      networkMetrics.reduce((sum, m) => sum + m.value, 0) / networkMetrics.length || 0;

    const latestMemory = memoryMetrics[memoryMetrics.length - 1]?.value || 0;

    // Find slowest operations
    const allTimings = filteredMetrics.filter(m => m.unit === 'ms');
    const slowest = [...allTimings]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(m => ({ name: m.name, duration: m.value }));

    // Generate recommendations
    const recommendations: string[] = [];

    if (avgRenderTime > 16) {
      recommendations.push('Rendering is taking longer than 16ms. Consider optimizing React components.');
    }

    if (avgNetworkTime > 1000) {
      recommendations.push('Network requests are slow. Consider implementing caching or reducing payload size.');
    }

    if (latestMemory > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push('Memory usage is high. Check for memory leaks and optimize data structures.');
    }

    const longTasks = filteredMetrics.filter(m => m.name === 'long_task');
    if (longTasks.length > 10) {
      recommendations.push('Multiple long tasks detected. Break up heavy operations into smaller chunks.');
    }

    return {
      period: {
        start: startDate || new Date(filteredMetrics[0]?.timestamp || Date.now()),
        end: endDate || new Date()
      },
      metrics: {
        avgRenderTime,
        avgNetworkTime,
        memoryUsage: latestMemory,
        slowestOperations: slowest,
        renderCount: renderMetrics.length,
        networkRequests: networkMetrics.length
      },
      recommendations
    };
  }

  /**
   * Export metrics
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceProfiler = new PerformanceProfiler();

/**
 * Decorator for profiling methods
 */
export function Profile(category: PerformanceMetric['category'] = 'custom') {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const name = `${target.constructor.name}.${propertyKey}`;
      return performanceProfiler.measure(name, () => originalMethod.apply(this, args), category);
    };

    return descriptor;
  };
}

/**
 * React hook for profiling component renders
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = React.useRef(0);
  const renderStart = React.useRef(0);

  React.useEffect(() => {
    renderCount.current++;
    const duration = performance.now() - renderStart.current;

    if (renderCount.current > 1) {
      performanceProfiler.recordMetric({
        name: `${componentName}_render`,
        value: duration,
        unit: 'ms',
        category: 'render'
      });
    }
  });

  renderStart.current = performance.now();

  return { renderCount: renderCount.current };
}

// React namespace
import * as React from 'react';
