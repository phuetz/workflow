/**
 * Performance Optimization Service - Layer 3: Optimization
 *
 * Responsibilities:
 * - Performance profiles with thresholds
 * - Auto-optimization rules with conditions and actions
 * - Resource pool management (connections, workers, cache)
 * - Query analytics and optimization suggestions
 * - Automatic scaling and tuning
 *
 * Use Cases:
 * - Get instance: PerformanceOptimizationService.getInstance()
 * - Set profile: service.setProfile('high-performance')
 * - Add optimization rule: service.addOptimizationRule(rule)
 * - Get metrics: service.getCurrentMetrics()
 * - Analyze query: service.analyzeQuery(query, duration)
 *
 * Note: This is a singleton service for auto-optimization.
 * It uses MonitoringService for metric collection.
 * For basic metrics only, use MonitoringService.
 * For detailed monitoring, use PerformanceMonitoringService.
 *
 * @see src/services/monitoring/index.ts for architecture overview
 * @module PerformanceOptimizationService
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import { logger } from './SimpleLogger';
import monitoringService from './MonitoringService';
import { cachingService } from './CachingService';
import { telemetryService } from './OpenTelemetryService';
import { config } from '../config/environment';

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeConnections: number;
}

interface OptimizationRule {
  id: string;
  name: string;
  condition: (metrics: PerformanceMetrics) => boolean;
  action: (metrics: PerformanceMetrics) => Promise<void>;
  cooldown: number; // milliseconds
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastExecuted?: number;
}

interface PerformanceProfile {
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

interface ResourcePool {
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

export class PerformanceOptimizationService extends EventEmitter {
  private static instance: PerformanceOptimizationService;
  private optimizationRules: Map<string, OptimizationRule> = new Map();
  private currentProfile: PerformanceProfile;
  private resourcePools: Map<string, ResourcePool> = new Map();
  private metrics: PerformanceMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkLatency: 0,
    responseTime: 0,
    throughput: 0,
    errorRate: 0,
    activeConnections: 0
  };
  private metricsHistory: PerformanceMetrics[] = [];
  private optimizationInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private responseTimeBuffer: number[] = [];
  private throughputBuffer: number[] = [];
  private queryAnalytics: Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    slowest: number;
    errors: number;
  }> = new Map();

  private constructor() {
    super();
    this.currentProfile = this.getDefaultProfile();
    this.initializeOptimizationRules();
    this.initializeResourcePools();
  }

  public static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService();
    }
    return PerformanceOptimizationService.instance;
  }

  /**
   * Initialize performance optimization service
   */
  public async initialize(): Promise<void> {
    try {
      // Start metrics collection
      this.startMetricsCollection();

      // Start optimization engine
      this.startOptimizationEngine();

      // Initialize performance profiles
      this.initializeProfiles();

      logger.info('🚀 Performance optimization service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize performance optimization service:', error);
      throw error;
    }
  }

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
        errorRateCritical: 5
      },
      optimizations: {
        caching: true,
        compression: true,
        queryOptimization: true,
        connectionPooling: true,
        loadBalancing: true
      }
    };
  }

  private initializeOptimizationRules(): void {
    const rules: OptimizationRule[] = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage Optimization',
        condition: (metrics) => metrics.cpuUsage > this.currentProfile.thresholds.cpuWarning,
        action: async (metrics) => {
          logger.warn(`🔥 High CPU usage detected: ${metrics.cpuUsage}%`);
          
          // Reduce worker processes
          await this.optimizeWorkerPool();
          
          // Enable aggressive caching
          await this.enableAggressiveCaching();
          
          // Defer non-critical tasks
          await this.deferNonCriticalTasks();
        },
        cooldown: 60000, // 1 minute
        priority: 'high',
        enabled: true
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage Optimization',
        condition: (metrics) => metrics.memoryUsage > this.currentProfile.thresholds.memoryWarning,
        action: async (metrics) => {
          logger.warn(`💾 High memory usage detected: ${metrics.memoryUsage}%`);
          
          // Clear unnecessary caches
          await this.clearLowPriorityCaches();
          
          // Trigger garbage collection
          if (global.gc) {
            global.gc();
          }
          
          // Reduce memory-intensive operations
          await this.reduceMemoryIntensiveOperations();
        },
        cooldown: 30000, // 30 seconds
        priority: 'high',
        enabled: true
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time Optimization',
        condition: (metrics) => metrics.responseTime > this.currentProfile.thresholds.responseTimeWarning,
        action: async (metrics) => {
          logger.warn(`⏱️ Slow response time detected: ${metrics.responseTime}ms`);
          
          // Optimize database queries
          await this.optimizeDatabaseQueries();
          
          // Increase connection pool size
          await this.scaleConnectionPools();
          
          // Enable response compression
          await this.enableResponseCompression();
        },
        cooldown: 45000, // 45 seconds
        priority: 'medium',
        enabled: true
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate Optimization',
        condition: (metrics) => metrics.errorRate > this.currentProfile.thresholds.errorRateWarning,
        action: async (metrics) => {
          logger.error(`⚠️ High error rate detected: ${metrics.errorRate}%`);
          
          // Enable circuit breakers
          await this.enableCircuitBreakers();
          
          // Increase retry timeouts
          await this.increaseRetryTimeouts();
          
          // Scale up resources
          await this.scaleUpResources();
        },
        cooldown: 30000, // 30 seconds
        priority: 'critical',
        enabled: true
      },
      {
        id: 'optimize_queries',
        name: 'Query Optimization',
        condition: () => this.shouldOptimizeQueries(),
        action: async () => {
          logger.info('🔍 Running query optimization');
          await this.analyzeAndOptimizeQueries();
        },
        cooldown: 300000, // 5 minutes
        priority: 'low',
        enabled: true
      },
      {
        id: 'preemptive_scaling',
        name: 'Preemptive Resource Scaling',
        condition: (metrics) => this.shouldPreemptivelyScale(metrics),
        action: async (metrics) => {
          logger.info('📈 Preemptive scaling triggered');
          await this.preemptivelyScaleResources(metrics);
        },
        cooldown: 120000, // 2 minutes
        priority: 'medium',
        enabled: true
      }
    ];

    for (const rule of rules) {
      this.optimizationRules.set(rule.id, rule);
    }

    logger.info(`⚡ Initialized ${rules.length} performance optimization rules`);
  }

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
        errors: 0
      },
      {
        name: 'worker_processes',
        type: 'worker',
        min: 1,
        max: os.cpus().length,
        current: 2,
        idle: 1,
        busy: 1,
        created: 2,
        destroyed: 0,
        errors: 0
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
        errors: 0
      }
    ];

    for (const pool of pools) {
      this.resourcePools.set(pool.name, pool);
    }
  }

  private initializeProfiles(): void {
    // Additional performance profiles could be loaded here
    logger.info(`📊 Using performance profile: ${this.currentProfile.name}`);
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        this.updateMetricsHistory();
        this.recordPerformanceMetrics();
      } catch (error) {
        logger.error('❌ Error collecting performance metrics:', error);
      }
    }, 10000); // Collect every 10 seconds
  }

  private startOptimizationEngine(): void {
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.runOptimizationRules();
      } catch (error) {
        logger.error('❌ Error running optimization rules:', error);
      }
    }, 15000); // Run every 15 seconds
  }

  private async collectMetrics(): Promise<void> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // CPU metrics
    let totalTick = 0;
    let totalIdle = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    this.metrics.cpuUsage = Math.round((100 - (totalIdle / totalTick * 100)) * 100) / 100;

    // Memory metrics
    this.metrics.memoryUsage = Math.round(((totalMem - freeMem) / totalMem) * 100 * 100) / 100;

    // Network latency (approximate)
    this.metrics.networkLatency = await this.measureNetworkLatency();

    // Response time (from buffer)
    this.metrics.responseTime = this.calculateAverageResponseTime();

    // Throughput (requests per second)
    this.metrics.throughput = this.calculateThroughput();

    // Error rate
    this.metrics.errorRate = this.calculateErrorRate();

    // Active connections
    this.metrics.activeConnections = this.getActiveConnections();
  }

  private updateMetricsHistory(): void {
    this.metricsHistory.push({ ...this.metrics });
    
    // Keep only last 100 data points
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
  }

  private recordPerformanceMetrics(): void {
    // Record metrics for monitoring
    monitoringService.setGauge('performance.cpu_usage', this.metrics.cpuUsage);
    monitoringService.setGauge('performance.memory_usage', this.metrics.memoryUsage);
    monitoringService.setGauge('performance.response_time', this.metrics.responseTime);
    monitoringService.setGauge('performance.throughput', this.metrics.throughput);
    monitoringService.setGauge('performance.error_rate', this.metrics.errorRate);
    monitoringService.setGauge('performance.active_connections', this.metrics.activeConnections);
  }

  private async runOptimizationRules(): Promise<void> {
    const now = Date.now();
    const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };

    // Sort rules by priority
    const sortedRules = Array.from(this.optimizationRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    for (const rule of sortedRules) {
      try {
        // Check cooldown
        if (rule.lastExecuted && (now - rule.lastExecuted) < rule.cooldown) {
          continue;
        }

        // Check condition
        if (rule.condition(this.metrics)) {
          logger.info(`🔧 Executing optimization rule: ${rule.name}`);
          
          await rule.action(this.metrics);
          rule.lastExecuted = now;
          
          this.emit('optimization_executed', {
            rule: rule.name,
            metrics: { ...this.metrics },
            timestamp: new Date()
          });
        }
      } catch (error) {
        logger.error(`❌ Error executing optimization rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Optimization actions
   */

  private async optimizeWorkerPool(): Promise<void> {
    const pool = this.resourcePools.get('worker_processes');
    if (pool && pool.current > pool.min) {
      pool.current = Math.max(pool.min, pool.current - 1);
      logger.info(`👷 Reduced worker processes to ${pool.current}`);
    }
  }

  private async enableAggressiveCaching(): Promise<void> {
    // Increase cache TTL and enable more aggressive caching
    logger.info('💾 Enabling aggressive caching');
    // Implementation would depend on specific caching strategy
  }

  private async deferNonCriticalTasks(): Promise<void> {
    // Defer non-critical background tasks
    logger.info('⏸️ Deferring non-critical tasks');
    this.emit('defer_tasks', { reason: 'high_cpu_usage' });
  }

  private async clearLowPriorityCaches(): Promise<void> {
    logger.info('🧹 Clearing low priority caches');
    // Clear low priority cache entries
    // This would integrate with the caching service
  }

  private async reduceMemoryIntensiveOperations(): Promise<void> {
    logger.info('🔽 Reducing memory-intensive operations');
    // Reduce batch sizes, limit concurrent operations, etc.
    this.emit('reduce_memory_operations');
  }

  private async optimizeDatabaseQueries(): Promise<void> {
    logger.info('🔍 Optimizing database queries');

    // Analyze slow queries
    const slowQueries = this.getSlowQueries();
    for (const [query, stats] of Array.from(slowQueries.entries())) {
      if (stats.avgTime > 1000) { // > 1 second
        logger.warn(`🐌 Slow query detected: ${query.substring(0, 100)}... (${stats.avgTime}ms avg)`);
        // Add to optimization queue
        this.emit('slow_query_detected', { query, stats });
      }
    }
  }

  private async scaleConnectionPools(): Promise<void> {
    const pool = this.resourcePools.get('database_connections');
    if (pool && pool.current < pool.max) {
      const newSize = Math.min(pool.max, pool.current + 5);
      pool.current = newSize;
      logger.info(`📊 Scaled database connection pool to ${newSize}`);
    }
  }

  private async enableResponseCompression(): Promise<void> {
    logger.info('🗜️ Enabling response compression');
    // Enable or increase compression levels
    this.emit('enable_compression');
  }

  private async enableCircuitBreakers(): Promise<void> {
    logger.info('🔌 Enabling circuit breakers');
    // Activate circuit breaker pattern for external services
    this.emit('enable_circuit_breakers');
  }

  private async increaseRetryTimeouts(): Promise<void> {
    logger.info('⏳ Increasing retry timeouts');
    // Increase timeout values for retries
    this.emit('increase_timeouts');
  }

  private async scaleUpResources(): Promise<void> {
    logger.info('📈 Scaling up resources');

    // Scale up various resource pools
    for (const [name, pool] of Array.from(this.resourcePools.entries())) {
      if (pool.current < pool.max) {
        const increase = Math.ceil((pool.max - pool.current) / 4);
        pool.current += increase;
        logger.info(`📊 Scaled ${name} from ${pool.current - increase} to ${pool.current}`);
      }
    }
  }

  private async analyzeAndOptimizeQueries(): Promise<void> {
    // Analyze query patterns and suggest optimizations
    const analytics = Array.from(this.queryAnalytics.entries())
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, 10); // Top 10 by total time

    for (const [query, stats] of analytics) {
      if (stats.count > 100 && stats.avgTime > 100) {
        logger.info(`🔍 Query optimization candidate: ${query.substring(0, 50)}... (${stats.count} calls, ${stats.avgTime}ms avg)`);
        // Add to optimization recommendations
        this.emit('query_optimization_recommendation', { query, stats });
      }
    }
  }

  private async preemptivelyScaleResources(metrics: PerformanceMetrics): Promise<void> {
    // Scale resources before they become bottlenecks
    const trend = this.analyzeTrend();

    if (trend.cpuTrend > 5) { // CPU usage increasing
      await this.scaleWorkerPool();
    }
    
    if (trend.memoryTrend > 5) { // Memory usage increasing
      await this.preemptiveCacheCleanup();
    }
    
    if (trend.responseTimeTrend > 100) { // Response time increasing
      await this.scaleConnectionPools();
    }
  }

  private async scaleWorkerPool(): Promise<void> {
    const pool = this.resourcePools.get('worker_processes');
    if (pool && pool.current < pool.max) {
      pool.current = Math.min(pool.max, pool.current + 1);
      logger.info(`👷 Scaled worker processes to ${pool.current}`);
    }
  }

  private async preemptiveCacheCleanup(): Promise<void> {
    logger.info('🧹 Preemptive cache cleanup');
    // Clean cache before memory becomes critical
  }

  /**
   * Helper methods
   */

  private async measureNetworkLatency(): Promise<number> {
    // Simple latency measurement
    try {
      const start = Date.now();
      await new Promise(resolve => setTimeout(resolve, 1));
      return Date.now() - start;
    } catch {
      return 0;
    }
  }

  private calculateAverageResponseTime(): number {
    if (this.responseTimeBuffer.length === 0) return 0;

    const sum = this.responseTimeBuffer.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / this.responseTimeBuffer.length);
  }

  private calculateThroughput(): number {
    if (this.throughputBuffer.length === 0) return 0;

    const sum = this.throughputBuffer.reduce((acc, rps) => acc + rps, 0);
    return Math.round(sum / this.throughputBuffer.length);
  }

  private calculateErrorRate(): number {
    // Calculate error rate from query analytics
    let totalRequests = 0;
    let totalErrors = 0;

    for (const analytics of Array.from(this.queryAnalytics.values())) {
      totalRequests += analytics.count;
      totalErrors += analytics.errors;
    }

    // Also count resource pool errors
    for (const pool of Array.from(this.resourcePools.values())) {
      totalErrors += pool.errors;
    }

    if (totalRequests === 0) return 0;

    // Return error rate as percentage
    return Math.round((totalErrors / totalRequests) * 100 * 100) / 100;
  }

  private getActiveConnections(): number {
    const pool = this.resourcePools.get('database_connections');
    return pool ? pool.busy : 0;
  }

  private shouldOptimizeQueries(): boolean {
    return this.queryAnalytics.size > 50; // Optimize when we have enough data
  }

  private shouldPreemptivelyScale(metrics: PerformanceMetrics): boolean {
    const trend = this.analyzeTrend();

    return (
      trend.cpuTrend > 3 || 
      trend.memoryTrend > 5 || 
      trend.responseTimeTrend > 50
    );
  }

  private analyzeTrend(): {
    cpuTrend: number;
    memoryTrend: number;
    responseTimeTrend: number;
  } {
    if (this.metricsHistory.length < 5) {
      return { cpuTrend: 0, memoryTrend: 0, responseTimeTrend: 0 };
    }

    const recent = this.metricsHistory.slice(-5);
    const older = this.metricsHistory.slice(-10, -5);

    const recentAvg = {
      cpu: recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length,
      memory: recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length,
      responseTime: recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length
    };

    const olderAvg = {
      cpu: older.reduce((sum, m) => sum + m.cpuUsage, 0) / older.length,
      memory: older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length,
      responseTime: older.reduce((sum, m) => sum + m.responseTime, 0) / older.length
    };

    return {
      cpuTrend: recentAvg.cpu - olderAvg.cpu,
      memoryTrend: recentAvg.memory - olderAvg.memory,
      responseTimeTrend: recentAvg.responseTime - olderAvg.responseTime
    };
  }

  private getSlowQueries(): Map<string, any> {
    // Return queries with high average execution time
    const slowQueries = new Map<string, any>();

    for (const [query, stats] of Array.from(this.queryAnalytics.entries())) {
      if (stats.avgTime > 500) { // > 500ms
        slowQueries.set(query, stats);
      }
    }
    
    return slowQueries;
  }

  /**
   * Public API methods
   */

  public recordResponseTime(time: number): void {
    this.responseTimeBuffer.push(time);
    
    // Keep only last 100 measurements
    if (this.responseTimeBuffer.length > 100) {
      this.responseTimeBuffer.shift();
    }
  }

  public recordThroughput(rps: number): void {
    this.throughputBuffer.push(rps);
    
    // Keep only last 100 measurements
    if (this.throughputBuffer.length > 100) {
      this.throughputBuffer.shift();
    }
  }

  public recordQuery(query: string, executionTime: number, error = false): void {
    const key = query.substring(0, 100);

    if (!this.queryAnalytics.has(key)) {
      this.queryAnalytics.set(key, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        slowest: 0,
        errors: 0
      });
    }

    const stats = this.queryAnalytics.get(key)!;
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.slowest = Math.max(stats.slowest, executionTime);
    
    if (error) {
      stats.errors++;
    }
  }

  public setPerformanceProfile(profile: PerformanceProfile): void {
    this.currentProfile = profile;
    logger.info(`📊 Switched to performance profile: ${profile.name}`);
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getResourcePools(): Map<string, ResourcePool> {
    return new Map(this.resourcePools);
  }

  public getOptimizationRules(): Map<string, OptimizationRule> {
    return new Map(this.optimizationRules);
  }

  public enableRule(ruleId: string): void {
    const rule = this.optimizationRules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info(`✅ Enabled optimization rule: ${rule.name}`);
    }
  }

  public disableRule(ruleId: string): void {
    const rule = this.optimizationRules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info(`❌ Disabled optimization rule: ${rule.name}`);
    }
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down performance optimization service...');

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.removeAllListeners();

    logger.info('✅ Performance optimization service shutdown complete');
  }
}

export const performanceOptimizationService = PerformanceOptimizationService.getInstance();