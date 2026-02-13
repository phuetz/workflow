/**
 * Execution Pool Manager
 * Manages execution pools, queues, and worker scaling
 */

import { logger } from '../SimpleLogger';
import { RateLimiter } from './RateLimiter';
import type {
  ExecutionPool,
  ExecutionQueue,
  ExecutionPriority,
  WorkflowExecution
} from './types';

export class ExecutionPoolManager {
  private executionPools: Map<string, ExecutionPool> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultPools();
  }

  /**
   * Initialize default execution pools
   */
  private initializeDefaultPools(): void {
    // Default execution pool
    const defaultPool: ExecutionPool = {
      id: 'default',
      maxWorkers: 10,
      queues: [
        {
          id: 'critical',
          priority: 'critical',
          maxConcurrency: 5,
          rateLimiting: { enabled: false, requestsPerSecond: 0, burstSize: 0 },
          deadLetterQueue: true
        },
        {
          id: 'high',
          priority: 'high',
          maxConcurrency: 8,
          rateLimiting: { enabled: true, requestsPerSecond: 100, burstSize: 10 },
          deadLetterQueue: true
        },
        {
          id: 'normal',
          priority: 'normal',
          maxConcurrency: 15,
          rateLimiting: { enabled: true, requestsPerSecond: 50, burstSize: 5 },
          deadLetterQueue: true
        },
        {
          id: 'low',
          priority: 'low',
          maxConcurrency: 20,
          rateLimiting: { enabled: true, requestsPerSecond: 20, burstSize: 3 },
          deadLetterQueue: false
        }
      ],
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000
      },
      scaling: {
        enabled: true,
        minWorkers: 2,
        maxWorkers: 50,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.3
      }
    };

    this.executionPools.set('default', defaultPool);

    // Background processing pool
    const backgroundPool: ExecutionPool = {
      id: 'background',
      maxWorkers: 5,
      queues: [
        {
          id: 'scheduled',
          priority: 'normal',
          maxConcurrency: 10,
          rateLimiting: { enabled: true, requestsPerSecond: 10, burstSize: 2 },
          deadLetterQueue: true
        },
        {
          id: 'cleanup',
          priority: 'low',
          maxConcurrency: 3,
          rateLimiting: { enabled: true, requestsPerSecond: 5, burstSize: 1 },
          deadLetterQueue: false
        }
      ],
      healthCheck: {
        enabled: true,
        interval: 60000,
        timeout: 10000
      },
      scaling: {
        enabled: false,
        minWorkers: 2,
        maxWorkers: 10,
        scaleUpThreshold: 0.9,
        scaleDownThreshold: 0.2
      }
    };

    this.executionPools.set('background', backgroundPool);

    logger.info('Execution pools initialized', {
      pools: Array.from(this.executionPools.keys()),
      totalQueues: Array.from(this.executionPools.values())
        .reduce((sum, pool) => sum + pool.queues.length, 0)
    });
  }

  /**
   * Get a pool by ID
   */
  getPool(poolId: string): ExecutionPool | undefined {
    return this.executionPools.get(poolId);
  }

  /**
   * Get all pool IDs
   */
  getPoolIds(): string[] {
    return Array.from(this.executionPools.keys());
  }

  /**
   * Find appropriate queue for execution priority
   */
  findQueue(poolId: string, priority: ExecutionPriority): ExecutionQueue | undefined {
    const pool = this.executionPools.get(poolId);
    if (!pool) return undefined;

    return pool.queues.find(q => q.priority === priority) ||
           pool.queues.find(q => q.priority === 'normal');
  }

  /**
   * Get or create rate limiter for a queue
   */
  getRateLimiter(queueId: string): RateLimiter {
    if (!this.rateLimiters.has(queueId)) {
      this.rateLimiters.set(queueId, new RateLimiter(50, 1000));
    }
    return this.rateLimiters.get(queueId)!;
  }

  /**
   * Scale pool workers
   */
  async scalePool(poolId: string, direction: 'up' | 'down'): Promise<void> {
    const pool = this.executionPools.get(poolId);
    if (!pool) return;

    const oldWorkerCount = pool.maxWorkers;
    if (direction === 'up') {
      pool.maxWorkers = Math.min(pool.maxWorkers + 2, pool.scaling.maxWorkers);
    } else {
      pool.maxWorkers = Math.max(pool.maxWorkers - 1, pool.scaling.minWorkers);
    }

    if (pool.maxWorkers !== oldWorkerCount) {
      logger.info('Pool scaled', {
        poolId,
        direction,
        oldWorkerCount,
        newWorkerCount: pool.maxWorkers
      });
    }
  }

  /**
   * Monitor execution health and auto-scale
   */
  async monitorHealth(activeExecutions: Map<string, WorkflowExecution>): Promise<void> {
    for (const [poolId, pool] of Array.from(this.executionPools.entries())) {
      if (!pool.healthCheck.enabled) continue;

      const activeCount = Array.from(activeExecutions.values())
        .filter(exec => exec.context.priority !== 'low').length;

      const utilizationRate = activeCount / pool.maxWorkers;

      // Auto-scaling logic
      if (pool.scaling.enabled) {
        if (utilizationRate > pool.scaling.scaleUpThreshold &&
            pool.maxWorkers < pool.scaling.maxWorkers) {
          await this.scalePool(poolId, 'up');
        } else if (utilizationRate < pool.scaling.scaleDownThreshold &&
                   pool.maxWorkers > pool.scaling.minWorkers) {
          await this.scalePool(poolId, 'down');
        }
      }

      logger.debug('Pool health check', {
        poolId,
        activeExecutions: activeCount,
        maxWorkers: pool.maxWorkers,
        utilization: utilizationRate
      });
    }
  }

  /**
   * Update pool configuration
   */
  updatePoolConfiguration(poolId: string, config: Partial<ExecutionPool>): boolean {
    const pool = this.executionPools.get(poolId);
    if (!pool) return false;

    Object.assign(pool, config);
    logger.info('Execution pool configuration updated', { poolId, config });
    return true;
  }

  /**
   * Calculate pool utilization
   */
  calculatePoolUtilization(
    activeExecutions: Map<string, WorkflowExecution>
  ): Record<string, number> {
    const utilization: Record<string, number> = {};

    for (const [poolId, pool] of Array.from(this.executionPools.entries())) {
      const poolExecutions = Array.from(activeExecutions.values()).filter(exec =>
        exec.context.environment === (poolId === 'default' ? 'production' : 'development')
      ).length;
      utilization[poolId] = poolExecutions / pool.maxWorkers;
    }

    return utilization;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring(
    activeExecutions: Map<string, WorkflowExecution>,
    intervalMs: number = 30000
  ): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.monitorHealth(activeExecutions);
    }, intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    this.stopHealthMonitoring();
    this.executionPools.clear();
    this.rateLimiters.clear();
  }
}
