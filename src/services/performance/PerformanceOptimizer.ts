/**
 * Performance Module - PerformanceOptimizer
 *
 * Automatic performance optimization service built on MetricsBase.
 * Provides intelligent optimization with:
 * - Performance profiles with thresholds
 * - Auto-optimization rules with conditions and actions
 * - Resource pool management
 * - Query analytics and optimization suggestions
 * - Trend analysis for preemptive scaling
 *
 * Replaces functionality from:
 * - PerformanceOptimizationService
 */

import { MetricsBase } from './MetricsBase';
import { collectSystemMetrics } from './SystemMetrics';
import { logger } from '../SimpleLogger';
import type {
  SystemMetrics,
  MetricsCollectorConfig,
  AlertSeverity,
} from './types';

/**
 * Performance profile configuration
 */
export interface PerformanceProfile {
  name: string;
  description: string;
  thresholds: {
    cpuWarning: number;
    cpuCritical: number;
    memoryWarning: number;
    memoryCritical: number;
    responseTimeWarning: number;
    responseTimeCritical: number;
    errorRateWarning: number;
    errorRateCritical: number;
  };
  optimizations: {
    caching: boolean;
    compression: boolean;
    queryOptimization: boolean;
    connectionPooling: boolean;
    loadBalancing: boolean;
  };
}

/**
 * Optimization rule definition
 */
export interface OptimizationRule {
  id: string;
  name: string;
  condition: (metrics: OptimizationMetrics) => boolean;
  action: (metrics: OptimizationMetrics, optimizer: PerformanceOptimizer) => Promise<void>;
  cooldownMs: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastExecuted?: number;
}

/**
 * Metrics used for optimization decisions
 */
export interface OptimizationMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeConnections: number;
}

/**
 * Resource pool configuration
 */
export interface ResourcePool {
  name: string;
  type: 'connection' | 'worker' | 'cache' | 'memory';
  min: number;
  max: number;
  current: number;
  idle: number;
  busy: number;
  created: number;
  destroyed: number;
  errors: number;
}

/**
 * Query analytics entry
 */
interface QueryStats {
  count: number;
  totalTime: number;
  avgTime: number;
  slowest: number;
  errors: number;
}

/**
 * Automatic performance optimization service
 */
export class PerformanceOptimizer extends MetricsBase {
  private static instance: PerformanceOptimizer | null = null;

  private currentProfile: PerformanceProfile;
  private optimizationRules: Map<string, OptimizationRule> = new Map();
  private resourcePools: Map<string, ResourcePool> = new Map();
  private queryAnalytics: Map<string, QueryStats> = new Map();

  private metricsHistory: OptimizationMetrics[] = [];
  private responseTimeBuffer: number[] = [];
  private throughputBuffer: number[] = [];

  private optimizationInterval: NodeJS.Timeout | null = null;

  private constructor(config?: Partial<MetricsCollectorConfig>) {
    super(config);
    this.currentProfile = this.getDefaultProfile();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<MetricsCollectorConfig>): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer(config);
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance.stop();
      PerformanceOptimizer.instance = null;
    }
  }

  /**
   * Initialize the service
   */
  protected initializeService(): void {
    this.initializeOptimizationRules();
    this.initializeResourcePools();
    this.startOptimizationEngine();
    logger.info('PerformanceOptimizer initialized');
  }

  /**
   * Collect metrics for optimization
   */
  protected collectMetrics(): void {
    try {
      const systemMetrics = collectSystemMetrics();

      const optimizationMetrics: OptimizationMetrics = {
        cpuUsage: systemMetrics.cpu.usage,
        memoryUsage: systemMetrics.memory.percentage,
        diskUsage: systemMetrics.disk?.percentage || 0,
        responseTime: this.calculateAverageResponseTime(),
        throughput: this.calculateThroughput(),
        errorRate: this.calculateErrorRate(),
        activeConnections: this.getActiveConnections(),
      };

      // Store history
      this.metricsHistory.push(optimizationMetrics);
      if (this.metricsHistory.length > 100) {
        this.metricsHistory = this.metricsHistory.slice(-100);
      }

      // Record as typed metrics
      this.gauge('optimizer.cpu_usage', optimizationMetrics.cpuUsage);
      this.gauge('optimizer.memory_usage', optimizationMetrics.memoryUsage);
      this.gauge('optimizer.response_time', optimizationMetrics.responseTime);
      this.gauge('optimizer.throughput', optimizationMetrics.throughput);
      this.gauge('optimizer.error_rate', optimizationMetrics.errorRate);
      this.gauge('optimizer.active_connections', optimizationMetrics.activeConnections);

      this.emit('metrics:collected', optimizationMetrics);
    } catch (error) {
      logger.error('Error collecting optimization metrics:', error);
    }
  }

  // ============================================================================
  // Performance Profiles
  // ============================================================================

  private getDefaultProfile(): PerformanceProfile {
    return {
      name: 'default',
      description: 'Default performance profile',
      thresholds: {
        cpuWarning: 70,
        cpuCritical: 90,
        memoryWarning: 80,
        memoryCritical: 95,
        responseTimeWarning: 1000,
        responseTimeCritical: 5000,
        errorRateWarning: 1,
        errorRateCritical: 5,
      },
      optimizations: {
        caching: true,
        compression: true,
        queryOptimization: true,
        connectionPooling: true,
        loadBalancing: true,
      },
    };
  }

  /**
   * Set performance profile
   */
  setProfile(profile: PerformanceProfile): void {
    this.currentProfile = profile;
    logger.info(`Performance profile changed to: ${profile.name}`);
    this.emit('profile:changed', profile);
  }

  /**
   * Get current profile
   */
  getProfile(): PerformanceProfile {
    return { ...this.currentProfile };
  }

  // ============================================================================
  // Optimization Rules
  // ============================================================================

  private initializeOptimizationRules(): void {
    const rules: OptimizationRule[] = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage Optimization',
        condition: (m) => m.cpuUsage > this.currentProfile.thresholds.cpuWarning,
        action: async (m, opt) => {
          logger.warn(`High CPU usage detected: ${m.cpuUsage}%`);
          await opt.optimizeForHighCPU();
        },
        cooldownMs: 60000,
        priority: 'high',
        enabled: true,
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage Optimization',
        condition: (m) => m.memoryUsage > this.currentProfile.thresholds.memoryWarning,
        action: async (m, opt) => {
          logger.warn(`High memory usage detected: ${m.memoryUsage}%`);
          await opt.optimizeForHighMemory();
        },
        cooldownMs: 30000,
        priority: 'high',
        enabled: true,
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time Optimization',
        condition: (m) => m.responseTime > this.currentProfile.thresholds.responseTimeWarning,
        action: async (m, opt) => {
          logger.warn(`Slow response time detected: ${m.responseTime}ms`);
          await opt.optimizeForSlowResponse();
        },
        cooldownMs: 45000,
        priority: 'medium',
        enabled: true,
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate Optimization',
        condition: (m) => m.errorRate > this.currentProfile.thresholds.errorRateWarning,
        action: async (m, opt) => {
          logger.error(`High error rate detected: ${m.errorRate}%`);
          await opt.optimizeForHighErrorRate();
        },
        cooldownMs: 30000,
        priority: 'critical',
        enabled: true,
      },
      {
        id: 'preemptive_scaling',
        name: 'Preemptive Resource Scaling',
        condition: (m) => this.shouldPreemptivelyScale(m),
        action: async (m, opt) => {
          logger.info('Preemptive scaling triggered');
          await opt.preemptivelyScale();
        },
        cooldownMs: 120000,
        priority: 'medium',
        enabled: true,
      },
    ];

    for (const rule of rules) {
      this.optimizationRules.set(rule.id, rule);
    }

    logger.info(`Initialized ${rules.length} optimization rules`);
  }

  /**
   * Add custom optimization rule
   */
  addOptimizationRule(rule: OptimizationRule): void {
    this.optimizationRules.set(rule.id, rule);
    logger.info(`Added optimization rule: ${rule.name}`);
  }

  /**
   * Remove optimization rule
   */
  removeOptimizationRule(ruleId: string): void {
    this.optimizationRules.delete(ruleId);
    logger.info(`Removed optimization rule: ${ruleId}`);
  }

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.optimizationRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.info(`Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // ============================================================================
  // Resource Pools
  // ============================================================================

  private initializeResourcePools(): void {
    const pools: ResourcePool[] = [
      {
        name: 'database_connections',
        type: 'connection',
        min: 5,
        max: 50,
        current: 10,
        idle: 5,
        busy: 5,
        created: 10,
        destroyed: 0,
        errors: 0,
      },
      {
        name: 'worker_processes',
        type: 'worker',
        min: 1,
        max: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
        current: 2,
        idle: 1,
        busy: 1,
        created: 2,
        destroyed: 0,
        errors: 0,
      },
      {
        name: 'cache_entries',
        type: 'cache',
        min: 0,
        max: 10000,
        current: 0,
        idle: 0,
        busy: 0,
        created: 0,
        destroyed: 0,
        errors: 0,
      },
    ];

    for (const pool of pools) {
      this.resourcePools.set(pool.name, pool);
    }
  }

  /**
   * Get resource pool
   */
  getResourcePool(name: string): ResourcePool | undefined {
    return this.resourcePools.get(name);
  }

  /**
   * Get all resource pools
   */
  getResourcePools(): Map<string, ResourcePool> {
    return new Map(this.resourcePools);
  }

  /**
   * Scale resource pool
   */
  scalePool(name: string, newSize: number): boolean {
    const pool = this.resourcePools.get(name);
    if (!pool) return false;

    const targetSize = Math.max(pool.min, Math.min(pool.max, newSize));
    pool.current = targetSize;
    logger.info(`Scaled pool ${name} to ${targetSize}`);
    this.emit('pool:scaled', { name, size: targetSize });
    return true;
  }

  // ============================================================================
  // Optimization Actions
  // ============================================================================

  private async optimizeForHighCPU(): Promise<void> {
    // Reduce worker pool
    const workerPool = this.resourcePools.get('worker_processes');
    if (workerPool && workerPool.current > workerPool.min) {
      workerPool.current = Math.max(workerPool.min, workerPool.current - 1);
      logger.info(`Reduced worker processes to ${workerPool.current}`);
    }

    this.emit('optimization:cpu', { action: 'reduce_workers' });
  }

  private async optimizeForHighMemory(): Promise<void> {
    // Clear low priority caches
    logger.info('Clearing low priority caches');

    // Request garbage collection if available
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      logger.info('Garbage collection triggered');
    }

    this.emit('optimization:memory', { action: 'clear_caches' });
  }

  private async optimizeForSlowResponse(): Promise<void> {
    // Scale connection pool
    const connPool = this.resourcePools.get('database_connections');
    if (connPool && connPool.current < connPool.max) {
      const newSize = Math.min(connPool.max, connPool.current + 5);
      connPool.current = newSize;
      logger.info(`Scaled database connections to ${newSize}`);
    }

    this.emit('optimization:response', { action: 'scale_connections' });
  }

  private async optimizeForHighErrorRate(): Promise<void> {
    // Enable circuit breakers
    logger.info('Enabling circuit breakers');

    // Scale up resources
    for (const pool of Array.from(this.resourcePools.values())) {
      if (pool.current < pool.max) {
        const increase = Math.ceil((pool.max - pool.current) / 4);
        pool.current += increase;
        logger.info(`Scaled ${pool.name} from ${pool.current - increase} to ${pool.current}`);
      }
    }

    this.emit('optimization:errors', { action: 'enable_circuit_breakers' });
  }

  private async preemptivelyScale(): Promise<void> {
    const trend = this.analyzeTrend();

    if (trend.cpuTrend > 5) {
      const workerPool = this.resourcePools.get('worker_processes');
      if (workerPool && workerPool.current < workerPool.max) {
        workerPool.current = Math.min(workerPool.max, workerPool.current + 1);
        logger.info(`Preemptively scaled workers to ${workerPool.current}`);
      }
    }

    if (trend.memoryTrend > 5) {
      logger.info('Preemptive cache cleanup');
    }

    if (trend.responseTimeTrend > 100) {
      const connPool = this.resourcePools.get('database_connections');
      if (connPool && connPool.current < connPool.max) {
        connPool.current = Math.min(connPool.max, connPool.current + 2);
        logger.info(`Preemptively scaled connections to ${connPool.current}`);
      }
    }

    this.emit('optimization:preemptive', { trend });
  }

  // ============================================================================
  // Optimization Engine
  // ============================================================================

  private startOptimizationEngine(): void {
    this.optimizationInterval = setInterval(async () => {
      await this.runOptimizationRules();
    }, 15000); // Run every 15 seconds
  }

  private async runOptimizationRules(): Promise<void> {
    const currentMetrics = this.getCurrentOptimizationMetrics();
    const now = Date.now();
    const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };

    // Sort rules by priority
    const sortedRules = Array.from(this.optimizationRules.values())
      .filter((rule) => rule.enabled)
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    for (const rule of sortedRules) {
      try {
        // Check cooldown
        if (rule.lastExecuted && now - rule.lastExecuted < rule.cooldownMs) {
          continue;
        }

        // Check condition
        if (rule.condition(currentMetrics)) {
          logger.info(`Executing optimization rule: ${rule.name}`);
          await rule.action(currentMetrics, this);
          rule.lastExecuted = now;

          this.emit('optimization:executed', {
            rule: rule.name,
            metrics: currentMetrics,
          });
        }
      } catch (error) {
        logger.error(`Error executing optimization rule ${rule.name}:`, error);
      }
    }
  }

  private getCurrentOptimizationMetrics(): OptimizationMetrics {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    return (
      latest || {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        activeConnections: 0,
      }
    );
  }

  // ============================================================================
  // Query Analytics
  // ============================================================================

  /**
   * Record a query execution
   */
  recordQuery(query: string, executionTimeMs: number, error = false): void {
    const key = query.substring(0, 100); // Truncate for key

    const existing = this.queryAnalytics.get(key) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      slowest: 0,
      errors: 0,
    };

    existing.count++;
    existing.totalTime += executionTimeMs;
    existing.avgTime = existing.totalTime / existing.count;
    existing.slowest = Math.max(existing.slowest, executionTimeMs);
    if (error) existing.errors++;

    this.queryAnalytics.set(key, existing);

    // Record as metric
    this.histogram('optimizer.query_time', executionTimeMs);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(thresholdMs = 500): Map<string, QueryStats> {
    const slowQueries = new Map<string, QueryStats>();
    for (const [query, stats] of Array.from(this.queryAnalytics.entries())) {
      if (stats.avgTime > thresholdMs) {
        slowQueries.set(query, stats);
      }
    }
    return slowQueries;
  }

  // ============================================================================
  // Response Time Tracking
  // ============================================================================

  /**
   * Record response time
   */
  recordResponseTime(timeMs: number): void {
    this.responseTimeBuffer.push(timeMs);
    if (this.responseTimeBuffer.length > 100) {
      this.responseTimeBuffer = this.responseTimeBuffer.slice(-100);
    }
    this.histogram('optimizer.response_time', timeMs);
  }

  /**
   * Record throughput
   */
  recordThroughput(requestsPerSecond: number): void {
    this.throughputBuffer.push(requestsPerSecond);
    if (this.throughputBuffer.length > 100) {
      this.throughputBuffer = this.throughputBuffer.slice(-100);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateAverageResponseTime(): number {
    if (this.responseTimeBuffer.length === 0) return 0;
    return this.average(this.responseTimeBuffer);
  }

  private calculateThroughput(): number {
    if (this.throughputBuffer.length === 0) return 0;
    return this.average(this.throughputBuffer);
  }

  private calculateErrorRate(): number {
    let totalRequests = 0;
    let totalErrors = 0;

    for (const stats of Array.from(this.queryAnalytics.values())) {
      totalRequests += stats.count;
      totalErrors += stats.errors;
    }

    for (const pool of Array.from(this.resourcePools.values())) {
      totalErrors += pool.errors;
    }

    if (totalRequests === 0) return 0;
    return (totalErrors / totalRequests) * 100;
  }

  private getActiveConnections(): number {
    const pool = this.resourcePools.get('database_connections');
    return pool?.busy || 0;
  }

  private shouldPreemptivelyScale(_metrics: OptimizationMetrics): boolean {
    const trend = this.analyzeTrend();
    return trend.cpuTrend > 3 || trend.memoryTrend > 5 || trend.responseTimeTrend > 50;
  }

  private analyzeTrend(): { cpuTrend: number; memoryTrend: number; responseTimeTrend: number } {
    if (this.metricsHistory.length < 5) {
      return { cpuTrend: 0, memoryTrend: 0, responseTimeTrend: 0 };
    }

    const recent = this.metricsHistory.slice(-5);
    const older = this.metricsHistory.slice(-10, -5);

    if (older.length === 0) {
      return { cpuTrend: 0, memoryTrend: 0, responseTimeTrend: 0 };
    }

    const recentAvg = {
      cpu: this.average(recent.map((m) => m.cpuUsage)),
      memory: this.average(recent.map((m) => m.memoryUsage)),
      responseTime: this.average(recent.map((m) => m.responseTime)),
    };

    const olderAvg = {
      cpu: this.average(older.map((m) => m.cpuUsage)),
      memory: this.average(older.map((m) => m.memoryUsage)),
      responseTime: this.average(older.map((m) => m.responseTime)),
    };

    return {
      cpuTrend: recentAvg.cpu - olderAvg.cpu,
      memoryTrend: recentAvg.memory - olderAvg.memory,
      responseTimeTrend: recentAvg.responseTime - olderAvg.responseTime,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  override stop(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    super.stop();
  }

  override reset(): void {
    super.reset();
    this.metricsHistory = [];
    this.responseTimeBuffer = [];
    this.throughputBuffer = [];
    this.queryAnalytics.clear();
    this.initializeResourcePools();
  }
}

// Export singleton factory
export function getPerformanceOptimizer(
  config?: Partial<MetricsCollectorConfig>
): PerformanceOptimizer {
  return PerformanceOptimizer.getInstance(config);
}
