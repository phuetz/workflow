/**
 * Comprehensive Health Check System
 * Deep health checks for all system dependencies with circuit breaker pattern
 */

import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { getLogger } from './EnhancedLogger';

const logger = getLogger('health-check-system');

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  critical: boolean;
  timeout?: number; // milliseconds
  interval?: number; // milliseconds for continuous checks
}

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  latency?: number;
  details?: any;
  timestamp: Date;
}

export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: Date;
  checks: Record<string, HealthCheckResult>;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextAttempt?: Date;
}

/**
 * Health Check System with Circuit Breaker
 */
export class HealthCheckSystem extends EventEmitter {
  private static instance: HealthCheckSystem;
  private checks: Map<string, HealthCheck> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private failureThreshold: number = 5;
  private resetTimeout: number = 60000; // 1 minute
  private halfOpenAttempts: number = 1;

  private constructor() {
    super();
    this.registerDefaultChecks();
  }

  public static getInstance(): HealthCheckSystem {
    if (!HealthCheckSystem.instance) {
      HealthCheckSystem.instance = new HealthCheckSystem();
    }
    return HealthCheckSystem.instance;
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    // Database health check
    this.registerCheck({
      name: 'database',
      check: this.checkDatabase.bind(this),
      critical: true,
      timeout: 5000,
      interval: 30000,
    });

    // Redis health check
    this.registerCheck({
      name: 'redis',
      check: this.checkRedis.bind(this),
      critical: true,
      timeout: 3000,
      interval: 30000,
    });

    // Memory health check
    this.registerCheck({
      name: 'memory',
      check: this.checkMemory.bind(this),
      critical: true,
      timeout: 1000,
      interval: 15000,
    });

    // Event loop health check
    this.registerCheck({
      name: 'eventloop',
      check: this.checkEventLoop.bind(this),
      critical: false,
      timeout: 2000,
      interval: 10000,
    });

    // Disk space health check
    this.registerCheck({
      name: 'disk',
      check: this.checkDiskSpace.bind(this),
      critical: true,
      timeout: 2000,
      interval: 60000,
    });

    logger.info('Default health checks registered');
  }

  /**
   * Register a custom health check
   */
  registerCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
    this.circuitBreakers.set(check.name, {
      state: 'closed',
      failures: 0,
    });

    // Start continuous checking if interval is specified
    if (check.interval) {
      this.startContinuousCheck(check.name, check.interval);
    }

    logger.info('Health check registered', {
      name: check.name,
      critical: check.critical,
      interval: check.interval,
    });
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name: string): boolean {
    this.stopContinuousCheck(name);
    this.checks.delete(name);
    this.results.delete(name);
    this.circuitBreakers.delete(name);

    logger.info('Health check unregistered', { name });
    return true;
  }

  /**
   * Start continuous health check
   */
  private startContinuousCheck(name: string, interval: number): void {
    // Clear existing interval
    this.stopContinuousCheck(name);

    // Run immediately
    this.runCheck(name).catch((err) => logger.error('Error', err));

    // Set up interval
    const intervalId = setInterval(() => {
      this.runCheck(name).catch((err) => logger.error('Error', err));
    }, interval);

    this.intervals.set(name, intervalId);
  }

  /**
   * Stop continuous health check
   */
  private stopContinuousCheck(name: string): void {
    const intervalId = this.intervals.get(name);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(name);
    }
  }

  /**
   * Run a specific health check
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check not found: ${name}`);
    }

    const circuitBreaker = this.circuitBreakers.get(name)!;

    // Check circuit breaker state
    if (circuitBreaker.state === 'open') {
      if (circuitBreaker.nextAttempt && new Date() < circuitBreaker.nextAttempt) {
        // Circuit is still open
        const result: HealthCheckResult = {
          status: 'unhealthy',
          message: 'Circuit breaker open',
          timestamp: new Date(),
        };
        this.results.set(name, result);
        return result;
      } else {
        // Try half-open
        circuitBreaker.state = 'half-open';
        logger.debug('Circuit breaker half-open', { name });
      }
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      // Run check with timeout
      const checkPromise = check.check();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout || 5000)
      );

      result = await Promise.race([checkPromise, timeoutPromise]);
      result.latency = Date.now() - startTime;
      result.timestamp = new Date();

      // Update circuit breaker
      this.handleCheckSuccess(name, circuitBreaker);

      this.results.set(name, result);
      this.emit('check-success', { name, result });

      return result;
    } catch (error: any) {
      const latency = Date.now() - startTime;
      result = {
        status: 'unhealthy',
        message: error.message,
        latency,
        timestamp: new Date(),
      };

      // Update circuit breaker
      this.handleCheckFailure(name, circuitBreaker, error);

      this.results.set(name, result);
      this.emit('check-failure', { name, result, error });

      logger.error(`Health check failed: ${name}`, error, { latency });

      return result;
    }
  }

  /**
   * Handle successful check
   */
  private handleCheckSuccess(name: string, breaker: CircuitBreakerState): void {
    breaker.lastSuccess = new Date();
    breaker.failures = 0;

    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
      logger.info('Circuit breaker closed', { name });
      this.emit('circuit-breaker-closed', { name });
    }
  }

  /**
   * Handle failed check
   */
  private handleCheckFailure(name: string, breaker: CircuitBreakerState, error: Error): void {
    breaker.lastFailure = new Date();
    breaker.failures++;

    if (breaker.state === 'half-open') {
      // Open circuit immediately on half-open failure
      breaker.state = 'open';
      breaker.nextAttempt = new Date(Date.now() + this.resetTimeout);
      logger.warn('Circuit breaker opened (half-open failure)', { name });
      this.emit('circuit-breaker-opened', { name, error });
    } else if (breaker.failures >= this.failureThreshold) {
      // Open circuit after threshold failures
      breaker.state = 'open';
      breaker.nextAttempt = new Date(Date.now() + this.resetTimeout);
      logger.warn('Circuit breaker opened (threshold exceeded)', {
        name,
        failures: breaker.failures,
      });
      this.emit('circuit-breaker-opened', { name, error });
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<SystemHealth> {
    const checks: Record<string, HealthCheckResult> = {};

    await Promise.all(
      Array.from(this.checks.keys()).map(async (name) => {
        try {
          checks[name] = await this.runCheck(name);
        } catch (error) {
          checks[name] = {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          };
        }
      })
    );

    const overallStatus = this.calculateOverallStatus(checks);

    const systemHealth: SystemHealth = {
      status: overallStatus,
      version: process.env.APP_VERSION || '2.0.0',
      uptime: process.uptime(),
      timestamp: new Date(),
      checks,
    };

    return systemHealth;
  }

  /**
   * Calculate overall system health status
   */
  private calculateOverallStatus(checks: Record<string, HealthCheckResult>): HealthStatus {
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([_, check]) => check.critical)
      .map(([name]) => name);

    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const [name, result] of Object.entries(checks)) {
      if (result.status === 'unhealthy') {
        if (criticalChecks.includes(name)) {
          return 'unhealthy'; // Critical check failed
        }
        hasUnhealthy = true;
      } else if (result.status === 'degraded') {
        hasDegraded = true;
      }
    }

    if (hasUnhealthy || hasDegraded) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get current system health
   */
  getSystemHealth(): SystemHealth {
    const checks: Record<string, HealthCheckResult> = {};

    for (const [name, result] of this.results.entries()) {
      checks[name] = result;
    }

    return {
      status: this.calculateOverallStatus(checks),
      version: process.env.APP_VERSION || '2.0.0',
      uptime: process.uptime(),
      timestamp: new Date(),
      checks,
    };
  }

  /**
   * Database health check
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    try {
      const { PrismaClient } = await import('@prisma/client').catch(() => ({
        PrismaClient: null,
      }));

      if (!PrismaClient) {
        return {
          status: 'healthy',
          message: 'Database not configured (development mode)',
          timestamp: new Date(),
        };
      }

      const prisma = new PrismaClient();
      const start = Date.now();

      try {
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;

        await prisma.$disconnect();

        if (latency > 1000) {
          return {
            status: 'degraded',
            message: 'Database responding slowly',
            latency,
            timestamp: new Date(),
          };
        }

        return {
          status: 'healthy',
          message: 'Database connection successful',
          latency,
          timestamp: new Date(),
        };
      } catch (error) {
        await prisma.$disconnect().catch(() => {});
        throw error;
      }
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: error.message || 'Database check failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Redis health check
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    try {
      const cacheService = await import('../../../services/CacheService')
        .then((m) => m.default)
        .catch(() => null);

      if (!cacheService) {
        return {
          status: 'healthy',
          message: 'Redis not configured (development mode)',
          timestamp: new Date(),
        };
      }

      const start = Date.now();
      const stats = await cacheService.getStats();
      const latency = Date.now() - start;

      if (!stats.redisAvailable) {
        return {
          status: 'degraded',
          message: 'Using memory cache fallback',
          latency,
          details: stats,
          timestamp: new Date(),
        };
      }

      return {
        status: 'healthy',
        message: 'Redis connection successful',
        latency,
        details: stats,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: error.message || 'Redis check failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Memory health check
   */
  private async checkMemory(): Promise<HealthCheckResult> {
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    let status: HealthStatus = 'healthy';
    let message = 'Memory usage normal';

    if (heapUsedPercent > 90) {
      status = 'unhealthy';
      message = 'Critical memory usage';
    } else if (heapUsedPercent > 80) {
      status = 'degraded';
      message = 'High memory usage';
    }

    return {
      status,
      message,
      details: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        heapUsedPercent: heapUsedPercent.toFixed(2),
        external: usage.external,
        rss: usage.rss,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Event loop health check
   */
  private async checkEventLoop(): Promise<HealthCheckResult> {
    return new Promise((resolve) => {
      const start = Date.now();

      setImmediate(() => {
        const lag = Date.now() - start;

        let status: HealthStatus = 'healthy';
        let message = 'Event loop lag normal';

        if (lag > 1000) {
          status = 'unhealthy';
          message = 'Severe event loop lag';
        } else if (lag > 500) {
          status = 'degraded';
          message = 'High event loop lag';
        }

        resolve({
          status,
          message,
          details: { lagMs: lag },
          timestamp: new Date(),
        });
      });
    });
  }

  /**
   * Disk space health check
   */
  private async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      // This is a simplified check. In production, use a proper disk space checking library
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      const usagePercent = parseInt(parts[4].replace('%', ''));

      let status: HealthStatus = 'healthy';
      let message = 'Disk space sufficient';

      if (usagePercent > 95) {
        status = 'unhealthy';
        message = 'Critical disk space';
      } else if (usagePercent > 85) {
        status = 'degraded';
        message = 'Low disk space';
      }

      return {
        status,
        message,
        details: {
          usagePercent,
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          mountpoint: parts[5],
        },
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        status: 'unknown',
        message: 'Could not check disk space',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Express middleware for health endpoint
   */
  healthEndpoint() {
    return async (_req: Request, res: Response) => {
      const health = await this.runAllChecks();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    };
  }

  /**
   * Express middleware for readiness endpoint
   */
  readinessEndpoint() {
    return async (_req: Request, res: Response) => {
      const health = await this.runAllChecks();
      const ready = health.status === 'healthy' || health.status === 'degraded';
      const statusCode = ready ? 200 : 503;

      res.status(statusCode).json({
        ready,
        status: health.status,
        timestamp: health.timestamp,
        checks: health.checks,
      });
    };
  }

  /**
   * Express middleware for liveness endpoint
   */
  livenessEndpoint() {
    return (_req: Request, res: Response) => {
      // Liveness check is simple - is the process running?
      res.status(200).json({
        alive: true,
        uptime: process.uptime(),
        timestamp: new Date(),
      });
    };
  }

  /**
   * Stop all health checks
   */
  shutdown(): void {
    for (const name of this.intervals.keys()) {
      this.stopContinuousCheck(name);
    }
    logger.info('Health check system shutdown');
  }
}

export function getHealthCheckSystem(): HealthCheckSystem {
  return HealthCheckSystem.getInstance();
}

export default HealthCheckSystem;
