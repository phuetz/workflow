/**
 * Memory Manager
 * Comprehensive memory leak prevention and monitoring system
 */

import { logger } from '../services/SimpleLogger';
import { useEffect, useCallback } from 'react';

// Extend window interface to include optional gc function
declare global {
  interface Window {
    gc?: () => void;
  }
}

// Interface for performance.memory
interface PerformanceMemory {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface MemoryLeak {
  id: string;
  type: 'listener' | 'interval' | 'timeout' | 'subscription' | 'observer';
  source: string;
  createdAt: number;
  cleanupFn?: () => void;
}

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

class MemoryManager {
  private static instance: MemoryManager;
  private leaks: Map<string, MemoryLeak> = new Map();
  private memoryHistory: MemoryStats[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private warningThreshold = 0.8; // 80% of heap limit
  private criticalThreshold = 0.95; // 95% of heap limit
  private maxHistorySize = 100;
  
  private constructor() {
    this.startMonitoring();
    this.setupCleanupOnUnload();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Register a potential memory leak source
   */
  register(
    id: string,
    type: MemoryLeak['type'],
    source: string,
    cleanupFn?: () => void
  ): void {
    const leak: MemoryLeak = {
      id,
      type,
      source,
      createdAt: Date.now(),
      cleanupFn,
    };

    this.leaks.set(id, leak);
    
    logger.debug('Memory leak source registered', {
      id,
      type,
      source,
      totalRegistered: this.leaks.size,
    });
  }

  /**
   * Unregister and cleanup a memory leak source
   */
  unregister(id: string): boolean {
    const leak = this.leaks.get(id);
    if (!leak) {
      logger.warn('Attempted to unregister unknown memory leak source', { id });
      return false;
    }

    try {
      if (leak.cleanupFn) {
        leak.cleanupFn();
      }
      
      this.leaks.delete(id);
      
      logger.debug('Memory leak source unregistered', {
        id,
        type: leak.type,
        source: leak.source,
        lifespan: Date.now() - leak.createdAt,
        remainingRegistered: this.leaks.size,
      });
      
      return true;
    } catch (error) {
      logger.error('Error during memory leak cleanup', { id, error });
      return false;
    }
  }

  /**
   * Cleanup all registered memory leak sources
   */
  cleanupAll(): number {
    const startTime = Date.now();
    let cleanedCount = 0;

    for (const [id, leak] of Array.from(this.leaks.entries())) {
      try {
        if (leak.cleanupFn) {
          leak.cleanupFn();
        }
        cleanedCount++;
      } catch (error) {
        logger.error('Error cleaning up memory leak', { id, type: leak.type, error });
      }
    }

    this.leaks.clear();

    logger.info('Memory cleanup completed', {
      cleanedCount,
      duration: Date.now() - startTime,
    });

    return cleanedCount;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryStats | null {
    if (!('memory' in performance)) {
      return null;
    }

    const memory = (performance as unknown as PerformanceMemory).memory;
    if (!memory) {
      return null;
    }

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    };
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(minutes: number = 5): MemoryStats[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.memoryHistory.filter(stat => stat.timestamp > cutoff);
  }

  /**
   * Check if memory usage is approaching critical levels
   */
  checkMemoryPressure(): {
    level: 'normal' | 'warning' | 'critical';
    usage: number;
    recommendations: string[];
  } {
    const currentUsage = this.getCurrentMemoryUsage();
    if (!currentUsage) {
      return {
        level: 'normal',
        usage: 0,
        recommendations: [],
      };
    }

    const usageRatio = currentUsage.usedJSHeapSize / currentUsage.jsHeapSizeLimit;
    const recommendations: string[] = [];

    let level: 'normal' | 'warning' | 'critical' = 'normal';

    if (usageRatio >= this.criticalThreshold) {
      level = 'critical';
      recommendations.push(
        'Force garbage collection',
        'Clear large data structures',
        'Reduce active components',
        'Consider page reload'
      );
    } else if (usageRatio >= this.warningThreshold) {
      level = 'warning';
      recommendations.push(
        'Clear unnecessary data',
        'Cleanup old event listeners',
        'Reduce memory-intensive operations'
      );
    }

    return {
      level,
      usage: usageRatio,
      recommendations,
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    try {
      if (window.gc) {
        window.gc();
        logger.info('Forced garbage collection');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to force garbage collection', error);
      return false;
    }
  }

  /**
   * Get detailed memory report
   */
  getMemoryReport(): {
    current: MemoryStats | null;
    registeredLeaks: number;
    leaksByType: Record<string, number>;
    oldestLeak: MemoryLeak | null;
    memoryPressure: ReturnType<typeof this.checkMemoryPressure>;
    trend: MemoryStats[];
  } {
    const leaksByType: Record<string, number> = {};
    let oldestLeak: MemoryLeak | null = null;

    for (const leak of Array.from(this.leaks.values())) {
      leaksByType[leak.type] = (leaksByType[leak.type] || 0) + 1;
      
      if (!oldestLeak || leak.createdAt < oldestLeak.createdAt) {
        oldestLeak = leak;
      }
    }

    return {
      current: this.getCurrentMemoryUsage(),
      registeredLeaks: this.leaks.size,
      leaksByType,
      oldestLeak,
      memoryPressure: this.checkMemoryPressure(),
      trend: this.getMemoryTrend(),
    };
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      const currentUsage = this.getCurrentMemoryUsage();
      if (currentUsage) {
        this.memoryHistory.push(currentUsage);

        // Keep history size manageable
        if (this.memoryHistory.length > this.maxHistorySize) {
          this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
        }

        // Check for memory pressure
        const pressure = this.checkMemoryPressure();
        if (pressure.level === 'critical') {
          logger.error('Critical memory pressure detected', {
            usage: pressure.usage,
            usedHeap: currentUsage.usedJSHeapSize,
            heapLimit: currentUsage.jsHeapSizeLimit,
            registeredLeaks: this.leaks.size,
          });

          // Attempt automatic cleanup
          this.attemptAutomaticCleanup();
        } else if (pressure.level === 'warning') {
          logger.warn('Memory pressure warning', {
            usage: pressure.usage,
            recommendations: pressure.recommendations,
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Attempt automatic cleanup during memory pressure
   */
  private attemptAutomaticCleanup(): void {
    logger.info('Attempting automatic memory cleanup');

    // 1. Force garbage collection
    this.forceGarbageCollection();

    // 2. Clean up old registered leaks (older than 5 minutes with no activity)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const leaksToCleanup: string[] = [];

    for (const [id, leak] of Array.from(this.leaks.entries())) {
      if (leak.createdAt < fiveMinutesAgo) {
        leaksToCleanup.push(id);
      }
    }

    let cleanedUp = 0;
    for (const id of leaksToCleanup) {
      if (this.unregister(id)) {
        cleanedUp++;
      }
    }

    // 3. Clear memory history to free up space
    this.memoryHistory = this.memoryHistory.slice(-10);

    logger.info('Automatic cleanup completed', {
      leaksCleanedUp: cleanedUp,
      remainingLeaks: this.leaks.size,
    });
  }

  /**
   * Setup cleanup on page unload
   */
  private setupCleanupOnUnload(): void {
    const cleanup = () => {
      logger.info('Page unload detected, cleaning up memory');
      this.destroy();
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // Also cleanup on visibility change (mobile Safari)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        cleanup();
      }
    });
  }

  /**
   * Destroy the memory manager
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.cleanupAll();
    this.memoryHistory = [];
    
    logger.info('MemoryManager destroyed');
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// Export React hook for easy component integration
export function useMemoryManager() {
  const register = useCallback((
    id: string,
    type: MemoryLeak['type'],
    source: string,
    cleanupFn?: () => void
  ) => {
    memoryManager.register(id, type, source, cleanupFn);
  }, []);

  const unregister = useCallback((id: string) => {
    return memoryManager.unregister(id);
  }, []);

  // Auto-cleanup on component unmount
  useEffect(() => {
    const componentId = `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return () => {
      // Component is unmounting, cleanup any registered leaks with this component's ID
      unregister(componentId);
    };
  }, [unregister]);

  return {
    register,
    unregister,
    getCurrentUsage: memoryManager.getCurrentMemoryUsage.bind(memoryManager),
    getReport: memoryManager.getMemoryReport.bind(memoryManager),
    forceGC: memoryManager.forceGarbageCollection.bind(memoryManager),
  };
}

// Export utility for creating cleanup-aware intervals
export function createManagedInterval(
  callback: () => void,
  delay: number,
  source: string
): string {
  const id = `interval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const intervalId = setInterval(callback, delay);

  memoryManager.register(id, 'interval', source, () => {
    clearInterval(intervalId);
  });

  return id;
}

// Export utility for creating cleanup-aware timeouts
export function createManagedTimeout(
  callback: () => void,
  delay: number,
  source: string
): string {
  const id = `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timeoutId = setTimeout(() => {
    callback();
    memoryManager.unregister(id); // Auto-cleanup after execution
  }, delay);

  memoryManager.register(id, 'timeout', source, () => {
    clearTimeout(timeoutId);
  });

  return id;
}

// Export utility for creating cleanup-aware event listeners
export function createManagedEventListener<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  source?: string
): string;
export function createManagedEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (this: Document, ev: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  source?: string
): string;
export function createManagedEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  source?: string
): string;
export function createManagedEventListener(
  target: EventTarget,
  type: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions,
  source: string = 'unknown'
): string {
  const id = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  target.addEventListener(type, listener, options);

  memoryManager.register(id, 'listener', source, () => {
    target.removeEventListener(type, listener, options);
  });

  return id;
}