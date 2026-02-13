/**
 * Memory Optimizer - Memory management and garbage collection optimization
 * Monitors and optimizes memory usage across the task runner system
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

interface MemoryThresholds {
  warning: number; // MB
  critical: number; // MB
  gcTrigger: number; // MB
}

interface MemoryOptimizationConfig {
  enableAutoGC: boolean;
  gcInterval: number; // ms
  memoryCheckInterval: number; // ms
  thresholds: MemoryThresholds;
  enableMemoryLeakDetection: boolean;
  leakDetectionWindow: number; // ms
  maxHeapGrowthRate: number; // MB per second
}

export class MemoryOptimizer extends EventEmitter {
  private config: Required<MemoryOptimizationConfig>;
  private memoryHistory: Array<{ timestamp: number; stats: MemoryStats }> = [];
  private gcInterval?: NodeJS.Timeout;
  private checkInterval?: NodeJS.Timeout;
  private lastGcTime = Date.now();

  // Metrics
  private metrics = {
    totalGcRuns: 0,
    totalMemoryFreed: 0,
    averageMemoryFreed: 0,
    warningsIssued: 0,
    criticalAlertsIssued: 0,
    leaksDetected: 0
  };

  constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    super();

    this.config = {
      enableAutoGC: config.enableAutoGC !== false,
      gcInterval: config.gcInterval || 60000, // 1 minute
      memoryCheckInterval: config.memoryCheckInterval || 10000, // 10 seconds
      thresholds: {
        warning: config.thresholds?.warning || 400, // 400 MB
        critical: config.thresholds?.critical || 800, // 800 MB
        gcTrigger: config.thresholds?.gcTrigger || 300 // 300 MB
      },
      enableMemoryLeakDetection: config.enableMemoryLeakDetection !== false,
      leakDetectionWindow: config.leakDetectionWindow || 300000, // 5 minutes
      maxHeapGrowthRate: config.maxHeapGrowthRate || 10 // 10 MB/sec
    };

    this.initialize();
  }

  private initialize(): void {
    logger.info('Memory optimizer initialized', {
      autoGC: this.config.enableAutoGC,
      thresholds: this.config.thresholds,
      leakDetection: this.config.enableMemoryLeakDetection
    });

    // Start memory monitoring
    this.startMemoryMonitoring();

    // Start auto GC if enabled
    if (this.config.enableAutoGC) {
      this.startAutoGC();
    }
  }

  // ============================================================================
  // Memory Monitoring
  // ============================================================================

  private startMemoryMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.memoryCheckInterval);
  }

  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    const heapUsedMB = stats.heapUsed / 1024 / 1024;

    // Record in history
    this.memoryHistory.push({
      timestamp: Date.now(),
      stats
    });

    // Keep only recent history (last 30 minutes)
    const cutoff = Date.now() - 30 * 60 * 1000;
    this.memoryHistory = this.memoryHistory.filter(h => h.timestamp > cutoff);

    // Check thresholds
    if (heapUsedMB > this.config.thresholds.critical) {
      this.handleCriticalMemory(heapUsedMB);
    } else if (heapUsedMB > this.config.thresholds.warning) {
      this.handleWarningMemory(heapUsedMB);
    }

    // Check for memory leaks
    if (this.config.enableMemoryLeakDetection) {
      this.detectMemoryLeaks();
    }

    // Trigger GC if needed
    if (heapUsedMB > this.config.thresholds.gcTrigger) {
      this.triggerGarbageCollection('threshold');
    }

    this.emit('memory_check', stats);
  }

  private handleWarningMemory(heapUsedMB: number): void {
    this.metrics.warningsIssued++;

    logger.warn('Memory usage warning', {
      heapUsed: `${heapUsedMB.toFixed(2)} MB`,
      threshold: `${this.config.thresholds.warning} MB`
    });

    this.emit('memory_warning', {
      heapUsed: heapUsedMB,
      threshold: this.config.thresholds.warning
    });

    // Suggest cleanup
    this.suggestCleanup();
  }

  private handleCriticalMemory(heapUsedMB: number): void {
    this.metrics.criticalAlertsIssued++;

    logger.error('CRITICAL: Memory usage exceeds threshold', {
      heapUsed: `${heapUsedMB.toFixed(2)} MB`,
      threshold: `${this.config.thresholds.critical} MB`
    });

    this.emit('memory_critical', {
      heapUsed: heapUsedMB,
      threshold: this.config.thresholds.critical
    });

    // Force aggressive garbage collection
    this.forceAggressiveGC();

    // Suggest emergency cleanup
    this.suggestEmergencyCleanup();
  }

  // ============================================================================
  // Garbage Collection
  // ============================================================================

  private startAutoGC(): void {
    this.gcInterval = setInterval(() => {
      this.triggerGarbageCollection('scheduled');
    }, this.config.gcInterval);

    logger.info('Auto GC enabled', {
      interval: `${this.config.gcInterval}ms`
    });
  }

  triggerGarbageCollection(reason: 'scheduled' | 'threshold' | 'manual' = 'manual'): void {
    const beforeStats = this.getMemoryStats();
    const beforeHeapMB = beforeStats.heapUsed / 1024 / 1024;

    logger.info('Triggering garbage collection', { reason });

    // Force GC if available (requires --expose-gc flag)
    if (global.gc) {
      global.gc();
    } else {
      // Fallback: create memory pressure to trigger GC
      this.createMemoryPressure();
    }

    // Wait a bit for GC to complete
    setTimeout(() => {
      const afterStats = this.getMemoryStats();
      const afterHeapMB = afterStats.heapUsed / 1024 / 1024;
      const freedMB = beforeHeapMB - afterHeapMB;

      this.metrics.totalGcRuns++;
      this.metrics.totalMemoryFreed += Math.max(0, freedMB);
      this.metrics.averageMemoryFreed = this.metrics.totalMemoryFreed / this.metrics.totalGcRuns;

      this.lastGcTime = Date.now();

      logger.info('Garbage collection completed', {
        reason,
        before: `${beforeHeapMB.toFixed(2)} MB`,
        after: `${afterHeapMB.toFixed(2)} MB`,
        freed: `${freedMB.toFixed(2)} MB`
      });

      this.emit('gc_completed', {
        reason,
        before: beforeHeapMB,
        after: afterHeapMB,
        freed: freedMB
      });
    }, 100);
  }

  private forceAggressiveGC(): void {
    logger.warn('Forcing aggressive garbage collection');

    // Run multiple GC cycles
    for (let i = 0; i < 3; i++) {
      if (global.gc) {
        global.gc();
      } else {
        this.createMemoryPressure();
      }
    }

    this.emit('aggressive_gc_triggered');
  }

  private createMemoryPressure(): void {
    // Create and release large objects to trigger GC
    const pressure: unknown[] = [];
    for (let i = 0; i < 100; i++) {
      pressure.push(new Array(1000).fill(Math.random()));
    }
    pressure.length = 0;
  }

  // ============================================================================
  // Memory Leak Detection
  // ============================================================================

  private detectMemoryLeaks(): void {
    if (this.memoryHistory.length < 10) {
      return; // Not enough data
    }

    // Calculate memory growth rate
    const windowStart = Date.now() - this.config.leakDetectionWindow;
    const recentHistory = this.memoryHistory.filter(h => h.timestamp >= windowStart);

    if (recentHistory.length < 2) {
      return;
    }

    const firstEntry = recentHistory[0];
    const lastEntry = recentHistory[recentHistory.length - 1];

    const timeDiffSec = (lastEntry.timestamp - firstEntry.timestamp) / 1000;
    const heapGrowthMB = (lastEntry.stats.heapUsed - firstEntry.stats.heapUsed) / 1024 / 1024;
    const growthRate = heapGrowthMB / timeDiffSec;

    // Check if growth rate exceeds threshold
    if (growthRate > this.config.maxHeapGrowthRate) {
      this.metrics.leaksDetected++;

      logger.warn('Potential memory leak detected', {
        growthRate: `${growthRate.toFixed(2)} MB/sec`,
        threshold: `${this.config.maxHeapGrowthRate} MB/sec`,
        totalGrowth: `${heapGrowthMB.toFixed(2)} MB`,
        window: `${timeDiffSec.toFixed(0)} seconds`
      });

      this.emit('memory_leak_detected', {
        growthRate,
        threshold: this.config.maxHeapGrowthRate,
        totalGrowth: heapGrowthMB,
        windowSeconds: timeDiffSec
      });

      // Suggest investigation
      this.suggestLeakInvestigation(growthRate);
    }
  }

  // ============================================================================
  // Cleanup Suggestions
  // ============================================================================

  private suggestCleanup(): void {
    const suggestions = [
      'Clear old cache entries',
      'Release idle database connections',
      'Clean up completed task results',
      'Remove expired deduplication entries'
    ];

    logger.info('Memory cleanup suggestions', { suggestions });

    this.emit('cleanup_suggested', suggestions);
  }

  private suggestEmergencyCleanup(): void {
    const actions = [
      'IMMEDIATE: Clear all caches',
      'IMMEDIATE: Close idle connections',
      'IMMEDIATE: Scale down idle workers',
      'IMMEDIATE: Purge old execution results',
      'IMMEDIATE: Clear task queues of completed tasks'
    ];

    logger.error('EMERGENCY memory cleanup required', { actions });

    this.emit('emergency_cleanup_required', actions);
  }

  private suggestLeakInvestigation(growthRate: number): void {
    const investigations = [
      `High memory growth rate: ${growthRate.toFixed(2)} MB/sec`,
      'Check for unclosed connections',
      'Check for event listener leaks',
      'Check for unbounded caches or queues',
      'Check for circular references',
      'Review recent code changes',
      'Enable heap profiling for detailed analysis'
    ];

    logger.warn('Memory leak investigation required', { investigations });

    this.emit('leak_investigation_suggested', investigations);
  }

  // ============================================================================
  // Memory Stats
  // ============================================================================

  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      rss: usage.rss
    };
  }

  getFormattedMemoryStats() {
    const stats = this.getMemoryStats();

    return {
      heapUsed: `${(stats.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(stats.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(stats.external / 1024 / 1024).toFixed(2)} MB`,
      arrayBuffers: `${(stats.arrayBuffers / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(stats.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUtilization: `${((stats.heapUsed / stats.heapTotal) * 100).toFixed(2)}%`
    };
  }

  getMemoryTrend(): { increasing: boolean; rate: number } {
    if (this.memoryHistory.length < 10) {
      return { increasing: false, rate: 0 };
    }

    const recent = this.memoryHistory.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    const heapDiff = (last.stats.heapUsed - first.stats.heapUsed) / 1024 / 1024; // MB

    const rate = heapDiff / timeDiff; // MB/sec

    return {
      increasing: heapDiff > 0,
      rate
    };
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  getMetrics() {
    const stats = this.getMemoryStats();
    const trend = this.getMemoryTrend();

    return {
      current: {
        heapUsedMB: stats.heapUsed / 1024 / 1024,
        heapTotalMB: stats.heapTotal / 1024 / 1024,
        rssMB: stats.rss / 1024 / 1024,
        externalMB: stats.external / 1024 / 1024
      },
      thresholds: this.config.thresholds,
      trend,
      gc: {
        totalRuns: this.metrics.totalGcRuns,
        totalMemoryFreedMB: this.metrics.totalMemoryFreed,
        averageMemoryFreedMB: this.metrics.averageMemoryFreed,
        lastGcTime: this.lastGcTime,
        timeSinceLastGc: Date.now() - this.lastGcTime
      },
      alerts: {
        warnings: this.metrics.warningsIssued,
        critical: this.metrics.criticalAlertsIssued,
        leaks: this.metrics.leaksDetected
      }
    };
  }

  // ============================================================================
  // Control Methods
  // ============================================================================

  /**
   * Update memory thresholds
   */
  updateThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.config.thresholds = {
      ...this.config.thresholds,
      ...thresholds
    };

    logger.info('Memory thresholds updated', { thresholds: this.config.thresholds });
    this.emit('thresholds_updated', this.config.thresholds);
  }

  /**
   * Enable/disable auto GC
   */
  setAutoGC(enabled: boolean): void {
    if (enabled && !this.gcInterval) {
      this.startAutoGC();
    } else if (!enabled && this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = undefined;
      logger.info('Auto GC disabled');
    }

    this.config.enableAutoGC = enabled;
  }

  /**
   * Clear memory history
   */
  clearHistory(): void {
    this.memoryHistory = [];
    logger.info('Memory history cleared');
  }

  // ============================================================================
  // Shutdown
  // ============================================================================

  shutdown(): void {
    logger.info('Shutting down memory optimizer');

    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.removeAllListeners();

    logger.info('Memory optimizer shutdown complete');
  }
}
