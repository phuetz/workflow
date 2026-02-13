import { createBasicLogger, type BasicLogger } from './sharedLoggingTypes';

/**
 * Interval Manager Utility
 * Centralized management of setInterval calls to prevent memory leaks
 */

// Use basic logger to break circular dependency
const logger: BasicLogger = createBasicLogger();

function getLogger(): BasicLogger {
  return logger;
}

interface ManagedInterval {
  id: NodeJS.Timeout;
  name: string;
  callback: () => void;
  interval: number;
  createdAt: Date;
  lastRun?: Date;
  runCount: number;
  context?: string;
}

class IntervalManager {
  private intervals: Map<string, ManagedInterval> = new Map();
  private cleanupOnUnload = true;

  constructor() {
    this.setupCleanupHandlers();
  }

  /**
   * Create a managed interval
   */
  create(
    name: string,
    callback: () => void,
    interval: number,
    context?: string,
    immediate = false
  ): string {
    // Clear any existing interval with the same name
    this.clear(name);

    // Create wrapped callback with error handling
    const wrappedCallback = () => {
      try {
        const managedInterval = this.intervals.get(name);
        if (managedInterval) {
          managedInterval.lastRun = new Date();
          managedInterval.runCount++;
        }
        callback();
      } catch (error) {
        getLogger().error(`Error in managed interval '${name}'`, error);
        // Don't clear the interval on error, let it continue
      }
    };

    // Create the actual interval
    const intervalId = setInterval(wrappedCallback, interval);

    const managedInterval: ManagedInterval = {
      id: intervalId,
      name,
      callback,
      interval,
      createdAt: new Date(),
      runCount: 0,
      context
    };

    this.intervals.set(name, managedInterval);

    // Run immediately if requested
    if (immediate) {
      wrappedCallback();
    }

    getLogger().debug(`Created managed interval '${name}'`, {
      interval,
      context,
      immediate
    });

    return name;
  }

  /**
   * Clear a specific interval
   */
  clear(name: string): boolean {
    const managedInterval = this.intervals.get(name);
    if (managedInterval) {
      globalThis.clearInterval(managedInterval.id as unknown as number);
      this.intervals.delete(name);

      getLogger().debug(`Cleared managed interval '${name}'`, {
        runCount: managedInterval.runCount,
        duration: Date.now() - managedInterval.createdAt.getTime()
      });

      return true;
    }
    return false;
  }

  /**
   * Clear all intervals
   */
  clearAll(): number {
    const count = this.intervals.size;

    for (const [, managedInterval] of Array.from(this.intervals.entries())) {
      globalThis.clearInterval(managedInterval.id as unknown as number);
    }

    this.intervals.clear();

    getLogger().info(`Cleared ${count} managed intervals`);
    return count;
  }

  /**
   * Clear intervals by context
   */
  clearByContext(context: string): number {
    let count = 0;

    for (const [name, managedInterval] of Array.from(this.intervals.entries())) {
      if (managedInterval.context === context) {
        globalThis.clearInterval(managedInterval.id as unknown as number);
        this.intervals.delete(name);
        count++;
      }
    }

    if (count > 0) {
      getLogger().debug(`Cleared ${count} managed intervals for context '${context}'`);
    }

    return count;
  }

  /**
   * Get information about all managed intervals
   */
  getInfo(): Array<{
    name: string;
    interval: number;
    context?: string;
    createdAt: Date;
    lastRun?: Date;
    runCount: number;
    uptime: number;
  }> {
    const now = Date.now();

    return Array.from(this.intervals.values()).map(interval => ({
      name: interval.name,
      interval: interval.interval,
      context: interval.context,
      createdAt: interval.createdAt,
      lastRun: interval.lastRun,
      runCount: interval.runCount,
      uptime: now - interval.createdAt.getTime()
    }));
  }

  /**
   * Check if an interval exists
   */
  exists(name: string): boolean {
    return this.intervals.has(name);
  }

  /**
   * Update interval timing
   */
  updateInterval(name: string, newInterval: number): boolean {
    const managedInterval = this.intervals.get(name);
    if (managedInterval) {
      // Clear and recreate with new interval
      globalThis.clearInterval(managedInterval.id as unknown as number);

      const newId = setInterval(() => {
        try {
          managedInterval.lastRun = new Date();
          managedInterval.runCount++;
          managedInterval.callback();
        } catch (error) {
          getLogger().error(`Error in managed interval '${name}'`, error);
        }
      }, newInterval);

      managedInterval.id = newId;
      managedInterval.interval = newInterval;

      getLogger().debug(`Updated interval '${name}' to ${newInterval}ms`);
      return true;
    }
    return false;
  }

  /**
   * Pause an interval (useful for debugging)
   */
  pause(name: string): boolean {
    const managedInterval = this.intervals.get(name);
    if (managedInterval) {
      globalThis.clearInterval(managedInterval.id as unknown as number);
      // Keep the interval in the map but with a null id to indicate it's paused
      (managedInterval as unknown as { paused: boolean }).paused = true;
      getLogger().debug(`Paused interval '${name}'`);
      return true;
    }
    return false;
  }

  /**
   * Resume a paused interval
   */
  resume(name: string): boolean {
    const managedInterval = this.intervals.get(name);
    if (managedInterval && (managedInterval as unknown as { paused?: boolean }).paused) {
      const newId = setInterval(() => {
        try {
          managedInterval.lastRun = new Date();
          managedInterval.runCount++;
          managedInterval.callback();
        } catch (error) {
          getLogger().error(`Error in managed interval '${name}'`, error);
        }
      }, managedInterval.interval);

      managedInterval.id = newId;
      delete (managedInterval as unknown as { paused?: boolean }).paused;
      
      getLogger().debug(`Resumed interval '${name}'`);
      return true;
    }
    return false;
  }

  /**
   * Setup cleanup handlers for browser unload events
   */
  private setupCleanupHandlers(): void {
    // Only set up browser event handlers if we're in a browser environment
    if (typeof (globalThis as any).window !== 'undefined' && this.cleanupOnUnload) {
      // Clean up on page unload
      (globalThis as any).window.addEventListener('beforeunload', () => {
        this.clearAll();
      });

      // Clean up on page visibility change (when tab is closed/hidden)
      if (typeof (globalThis as any).document !== 'undefined') {
        (globalThis as any).document.addEventListener('visibilitychange', () => {
          if ((globalThis as any).document.visibilityState === 'hidden') {
            // Optional: pause intervals when page is hidden to save resources
            // This can be configurable based on needs
          }
        });
      }
    }

    // Clean up long-running intervals periodically
    this.create(
      '_interval_manager_cleanup',
      () => this.performPeriodicCleanup(),
      5 * 60 * 1000, // Every 5 minutes
      'system'
    );
  }

  /**
   * Perform periodic cleanup of stale intervals
   */
  private performPeriodicCleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    let cleaned = 0;

    for (const [name, interval] of Array.from(this.intervals.entries())) {
      // Skip system intervals
      if (interval.context === 'system') continue;

      // Check if interval has been running too long without activity
      const age = now - interval.createdAt.getTime();
      const timeSinceLastRun = interval.lastRun
        ? now - interval.lastRun.getTime()
        : age;

      // Clean up intervals that are very old or haven't run in a long time
      if (age > maxAge || timeSinceLastRun > maxAge) {
        getLogger().warn(`Cleaning up stale interval '${name}'`, {
          age: age / 1000 / 60,
          timeSinceLastRun: timeSinceLastRun / 1000 / 60,
          runCount: interval.runCount
        });

        this.clear(name);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      getLogger().info(`Cleaned up ${cleaned} stale intervals`);
    }
  }

  /**
   * Get statistics about interval usage
   */
  getStats(): {
    totalIntervals: number;
    totalRunCount: number;
    averageRunCount: number;
    oldestInterval: Date | null;
    contexts: Record<string, number>;
  } {
    const intervals = Array.from(this.intervals.values());
    let totalRunCount = 0;
    let oldestInterval: Date | null = null;
    const contexts: Record<string, number> = {};

    for (const interval of intervals) {
      totalRunCount += interval.runCount;

      if (!oldestInterval || interval.createdAt < oldestInterval) {
        oldestInterval = interval.createdAt;
      }

      const context = interval.context || 'default';
      contexts[context] = (contexts[context] || 0) + 1;
    }

    return {
      totalIntervals: intervals.length,
      totalRunCount,
      averageRunCount: intervals.length > 0 ? totalRunCount / intervals.length : 0,
      oldestInterval,
      contexts
    };
  }
}

// Export singleton instance
export const intervalManager = new IntervalManager();

// Convenience functions
export const createInterval = intervalManager.create.bind(intervalManager);
export const clearInterval = intervalManager.clear.bind(intervalManager);
export const clearAllIntervals = intervalManager.clearAll.bind(intervalManager);