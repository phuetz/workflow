/**
 * Performance Monitoring System
 *
 * Tracks and reports performance metrics including:
 * - Web Vitals (LCP, FID, CLS, FCP, TTFB)
 * - Custom business metrics
 * - API response times
 * - Workflow execution times
 * - Memory usage
 * - Error rates
 *
 * Usage:
 * import { PerformanceMonitor } from '@/performance/PerformanceMonitor';
 *
 * const monitor = PerformanceMonitor.getInstance();
 * monitor.startMetric('workflow.execution');
 * // ... do work
 * monitor.endMetric('workflow.execution');
 */

import type { Metric } from 'web-vitals';
import { logger } from '../services/SimpleLogger';

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string | number>;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export interface APIMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  success: boolean;
}

export interface WorkflowMetric {
  workflowId: string;
  executionId: string;
  duration: number;
  nodeCount: number;
  success: boolean;
  timestamp: number;
}

export interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
  usage: number; // percentage
}

// Performance thresholds based on Web Vitals
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: {
    good: 2500,
    poor: 4000,
  },
  FID: {
    good: 100,
    poor: 300,
  },
  CLS: {
    good: 0.1,
    poor: 0.25,
  },
  FCP: {
    good: 1800,
    poor: 3000,
  },
  TTFB: {
    good: 800,
    poor: 1800,
  },
  INP: {
    good: 200,
    poor: 500,
  },

  // Custom metrics
  API_RESPONSE: {
    good: 100,
    poor: 500,
  },
  WORKFLOW_EXECUTION: {
    good: 2000,
    poor: 10000,
  },
  MEMORY_USAGE: {
    good: 70, // percentage
    poor: 90,
  },
} as const;

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private workflowMetrics: WorkflowMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private activeTimers: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];
  private isMonitoring: boolean = false;
  private metricsBuffer: PerformanceMetric[] = [];
  private flushInterval: number | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.initializeWebVitals();
    this.initializePerformanceObservers();
    this.initializeMemoryMonitoring();
    this.startMetricsFlush();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Dynamically import web-vitals
    import('web-vitals').then((webVitals) => {
      const { onCLS, onFCP, onLCP, onTTFB, onINP } = webVitals;
      onCLS(this.handleWebVital.bind(this));
      // onFID has been deprecated in web-vitals v4, use INP instead
      if ('onFID' in webVitals) {
        (webVitals as any).onFID(this.handleWebVital.bind(this));
      }
      onFCP(this.handleWebVital.bind(this));
      onLCP(this.handleWebVital.bind(this));
      onTTFB(this.handleWebVital.bind(this));
      onINP(this.handleWebVital.bind(this));
    }).catch(err => {
      logger.warn('Web Vitals not available:', err);
    });
  }

  /**
   * Handle Web Vitals metric
   */
  private handleWebVital(metric: Metric): void {
    const { name, value, rating, delta, id, navigationType } = metric;

    const webVitalMetric: WebVitalsMetric = {
      name: name as WebVitalsMetric['name'],
      value,
      rating,
      delta,
      id,
      navigationType,
    };

    this.recordMetric({
      name: `webvitals.${name.toLowerCase()}`,
      value,
      timestamp: Date.now(),
      tags: {
        rating,
        navigationType,
        metricId: id,
      },
      rating,
    });

    // Send to analytics
    this.sendToAnalytics('web_vital', webVitalMetric);

    // Log poor performance
    if (rating === 'poor') {
      logger.warn(`Poor ${name} detected: ${value}`, { metric });
    }
  }

  /**
   * Initialize Performance Observers
   */
  private initializePerformanceObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // Long Tasks Observer (>50ms)
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'long_task',
            value: entry.duration,
            timestamp: entry.startTime,
            tags: {
              entryType: entry.entryType,
              name: entry.name,
            },
            rating: entry.duration > 100 ? 'poor' : 'needs-improvement',
          });

          if (entry.duration > 100) {
            logger.warn('Long task detected:', entry.duration, 'ms');
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

      // Resource Timing Observer
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.recordMetric({
            name: 'resource_load',
            value: resourceEntry.duration,
            timestamp: resourceEntry.startTime,
            tags: {
              resourceType: resourceEntry.initiatorType,
              resourceName: resourceEntry.name,
              transferSize: resourceEntry.transferSize,
            },
          });
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Navigation Timing Observer
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          this.recordMetric({
            name: 'navigation',
            value: navEntry.duration,
            timestamp: navEntry.startTime,
            tags: {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              type: navEntry.type,
            },
          });
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

    } catch (error) {
      logger.warn('Performance observers not fully supported:', error);
    }
  }

  /**
   * Initialize memory monitoring
   */
  private initializeMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Check memory every 30 seconds
    setInterval(() => {
      this.captureMemoryMetrics();
    }, 30000);

    // Initial capture
    this.captureMemoryMetrics();
  }

  /**
   * Capture current memory metrics
   */
  private captureMemoryMetrics(): void {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      const metric: MemoryMetric = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
        usage,
      };

      this.memoryMetrics.push(metric);

      // Keep only last 100 memory metrics
      if (this.memoryMetrics.length > 100) {
        this.memoryMetrics = this.memoryMetrics.slice(-100);
      }

      // Record as performance metric
      this.recordMetric({
        name: 'memory.usage',
        value: usage,
        timestamp: metric.timestamp,
        tags: {
          usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        },
        rating: this.getRating(usage, PERFORMANCE_THRESHOLDS.MEMORY_USAGE),
      });

      // Warn on high memory usage
      if (usage > PERFORMANCE_THRESHOLDS.MEMORY_USAGE.poor) {
        logger.warn('High memory usage detected:', Math.round(usage), '%');
      }
    }
  }

  /**
   * Start a performance timer
   */
  public startMetric(name: string, tags?: Record<string, string | number>): void {
    const key = tags ? `${name}:${JSON.stringify(tags)}` : name;
    this.activeTimers.set(key, performance.now());
  }

  /**
   * End a performance timer and record the metric
   */
  public endMetric(name: string, tags?: Record<string, string | number>): number {
    const key = tags ? `${name}:${JSON.stringify(tags)}` : name;
    const startTime = this.activeTimers.get(key);

    if (!startTime) {
      logger.warn(`No start time found for metric: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(key);

    this.recordMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      tags,
    });

    return duration;
  }

  /**
   * Record a custom metric
   */
  public recordMetric(metric: PerformanceMetric): void {
    // Add to buffer
    this.metricsBuffer.push(metric);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics();
    }
  }

  /**
   * Record API call metrics
   */
  public recordAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    success: boolean
  ): void {
    const metric: APIMetric = {
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: Date.now(),
      success,
    };

    this.apiMetrics.push(metric);

    // Keep only last 1000 API metrics
    if (this.apiMetrics.length > 1000) {
      this.apiMetrics = this.apiMetrics.slice(-1000);
    }

    // Record as performance metric
    this.recordMetric({
      name: 'api.response_time',
      value: duration,
      timestamp: metric.timestamp,
      tags: {
        endpoint,
        method,
        statusCode,
        success: success ? 1 : 0,
      },
      rating: this.getRating(duration, PERFORMANCE_THRESHOLDS.API_RESPONSE),
    });
  }

  /**
   * Record workflow execution metrics
   */
  public recordWorkflowExecution(
    workflowId: string,
    executionId: string,
    duration: number,
    nodeCount: number,
    success: boolean
  ): void {
    const metric: WorkflowMetric = {
      workflowId,
      executionId,
      duration,
      nodeCount,
      success,
      timestamp: Date.now(),
    };

    this.workflowMetrics.push(metric);

    // Keep only last 1000 workflow metrics
    if (this.workflowMetrics.length > 1000) {
      this.workflowMetrics = this.workflowMetrics.slice(-1000);
    }

    // Record as performance metric
    this.recordMetric({
      name: 'workflow.execution_time',
      value: duration,
      timestamp: metric.timestamp,
      tags: {
        workflowId,
        executionId,
        nodeCount,
        success: success ? 1 : 0,
      },
      rating: this.getRating(duration, PERFORMANCE_THRESHOLDS.WORKFLOW_EXECUTION),
    });
  }

  /**
   * Get performance rating based on thresholds
   */
  private getRating(
    value: number,
    threshold: { good: number; poor: number }
  ): 'good' | 'needs-improvement' | 'poor' {
    if (value <= threshold.good) return 'good';
    if (value >= threshold.poor) return 'poor';
    return 'needs-improvement';
  }

  /**
   * Start periodic metrics flush
   */
  private startMetricsFlush(): void {
    this.flushInterval = window.setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Flush metrics to analytics backend
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;

    const metricsToSend = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // Add to permanent storage
    this.metrics.push(...metricsToSend);

    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }

    // Send to backend
    this.sendMetricsToBackend(metricsToSend);
  }

  /**
   * Send metrics to analytics backend
   */
  private sendMetricsToBackend(metrics: PerformanceMetric[]): void {
    // Only send if we're in a browser and have metrics
    if (typeof window === 'undefined' || metrics.length === 0) return;

    // Use navigator.sendBeacon for reliability (even on page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ metrics })], {
        type: 'application/json',
      });
      navigator.sendBeacon('/api/analytics/performance', blob);
    } else {
      // Fallback to fetch
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
        keepalive: true,
      }).catch(err => {
        logger.warn('Failed to send performance metrics:', err);
      });
    }
  }

  /**
   * Send event to analytics
   */
  private sendToAnalytics(eventName: string, data: any): void {
    if (typeof window === 'undefined') return;

    // Send to custom analytics endpoint
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        data,
        timestamp: Date.now(),
      }),
      keepalive: true,
    }).catch(err => {
      logger.warn('Failed to send analytics event:', err);
    });
  }

  /**
   * Get all metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get API metrics
   */
  public getAPIMetrics(): APIMetric[] {
    return [...this.apiMetrics];
  }

  /**
   * Get workflow metrics
   */
  public getWorkflowMetrics(): WorkflowMetric[] {
    return [...this.workflowMetrics];
  }

  /**
   * Get memory metrics
   */
  public getMemoryMetrics(): MemoryMetric[] {
    return [...this.memoryMetrics];
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    webVitals: Record<string, { value: number; rating: string }>;
    api: { avgResponseTime: number; errorRate: number };
    workflows: { avgExecutionTime: number; successRate: number };
    memory: { currentUsage: number; avgUsage: number };
  } {
    // Web Vitals summary
    const webVitals: Record<string, { value: number; rating: string }> = {};
    ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'inp'].forEach(vital => {
      const vitalMetrics = this.metrics.filter(m => m.name === `webvitals.${vital}`);
      if (vitalMetrics.length > 0) {
        const latest = vitalMetrics[vitalMetrics.length - 1];
        webVitals[vital.toUpperCase()] = {
          value: latest.value,
          rating: latest.rating || 'unknown',
        };
      }
    });

    // API summary
    const apiResponseTimes = this.apiMetrics.map(m => m.duration);
    const apiErrors = this.apiMetrics.filter(m => !m.success).length;
    const api = {
      avgResponseTime: apiResponseTimes.length > 0
        ? apiResponseTimes.reduce((a, b) => a + b, 0) / apiResponseTimes.length
        : 0,
      errorRate: this.apiMetrics.length > 0
        ? (apiErrors / this.apiMetrics.length) * 100
        : 0,
    };

    // Workflow summary
    const workflowTimes = this.workflowMetrics.map(m => m.duration);
    const workflowSuccesses = this.workflowMetrics.filter(m => m.success).length;
    const workflows = {
      avgExecutionTime: workflowTimes.length > 0
        ? workflowTimes.reduce((a, b) => a + b, 0) / workflowTimes.length
        : 0,
      successRate: this.workflowMetrics.length > 0
        ? (workflowSuccesses / this.workflowMetrics.length) * 100
        : 0,
    };

    // Memory summary
    const memoryUsages = this.memoryMetrics.map(m => m.usage);
    const memory = {
      currentUsage: memoryUsages.length > 0
        ? memoryUsages[memoryUsages.length - 1]
        : 0,
      avgUsage: memoryUsages.length > 0
        ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
        : 0,
    };

    return { webVitals, api, workflows, memory };
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.apiMetrics = [];
    this.workflowMetrics = [];
    this.memoryMetrics = [];
    this.metricsBuffer = [];
  }

  /**
   * Start monitoring
   */
  public startMonitoring(): void {
    this.isMonitoring = true;
    logger.debug('Performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;

    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    this.flushMetrics();

    logger.debug('Performance monitoring stopped');
  }

  /**
   * Check if monitoring is active
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-start monitoring
if (typeof window !== 'undefined') {
  performanceMonitor.startMonitoring();
}
