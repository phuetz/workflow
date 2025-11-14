/**
 * Health Check System
 * Monitor system health and dependencies
 */

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

export interface HealthCheckResult {
  status: HealthStatus;
  checks: Record<string, CheckResult>;
  timestamp: Date;
  uptime: number; // milliseconds
  version: string;
}

export interface CheckResult {
  status: HealthStatus;
  message?: string;
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
}

export type HealthChecker = () => Promise<CheckResult>;

class HealthCheckSystem {
  private checkers: Map<string, HealthChecker> = new Map();
  private startTime: number = Date.now();
  private version: string;

  constructor(version: string = '2.0.0') {
    this.version = version;
    this.registerDefaultCheckers();
  }

  /**
   * Register a health checker
   */
  register(name: string, checker: HealthChecker): void {
    this.checkers.set(name, checker);
  }

  /**
   * Unregister a health checker
   */
  unregister(name: string): void {
    this.checkers.delete(name);
  }

  /**
   * Run all health checks
   */
  async check(): Promise<HealthCheckResult> {
    const checks: Record<string, CheckResult> = {};

    for (const [name, checker] of this.checkers.entries()) {
      const startTime = Date.now();

      try {
        checks[name] = await checker();
        checks[name].duration = Date.now() - startTime;
      } catch (error) {
        checks[name] = {
          status: HealthStatus.UNHEALTHY,
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        };
      }
    }

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    const overall = statuses.includes(HealthStatus.UNHEALTHY)
      ? HealthStatus.UNHEALTHY
      : statuses.includes(HealthStatus.DEGRADED)
      ? HealthStatus.DEGRADED
      : HealthStatus.HEALTHY;

    return {
      status: overall,
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: this.version
    };
  }

  /**
   * Get simple health status
   */
  async isHealthy(): Promise<boolean> {
    const result = await this.check();
    return result.status === HealthStatus.HEALTHY;
  }

  /**
   * Register default health checkers
   */
  private registerDefaultCheckers(): void {
    // Memory check
    this.register('memory', async () => {
      if (typeof (performance as any).memory === 'undefined') {
        return {
          status: HealthStatus.HEALTHY,
          message: 'Memory API not available'
        };
      }

      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const percentage = (usedMB / limitMB) * 100;

      let status = HealthStatus.HEALTHY;
      if (percentage > 90) status = HealthStatus.UNHEALTHY;
      else if (percentage > 75) status = HealthStatus.DEGRADED;

      return {
        status,
        message: `Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB (${percentage.toFixed(1)}%)`,
        metadata: {
          used: usedMB,
          limit: limitMB,
          percentage: percentage.toFixed(1)
        }
      };
    });

    // Local storage check
    this.register('localStorage', async () => {
      try {
        const testKey = '__health_check__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);

        return {
          status: HealthStatus.HEALTHY,
          message: 'Local storage is accessible'
        };
      } catch (error) {
        return {
          status: HealthStatus.DEGRADED,
          message: 'Local storage is not accessible'
        };
      }
    });

    // IndexedDB check
    this.register('indexedDB', async () => {
      if (!window.indexedDB) {
        return {
          status: HealthStatus.DEGRADED,
          message: 'IndexedDB not available'
        };
      }

      try {
        const dbName = '__health_check__';
        const request = indexedDB.open(dbName, 1);

        return new Promise<CheckResult>(resolve => {
          request.onsuccess = () => {
            request.result.close();
            indexedDB.deleteDatabase(dbName);
            resolve({
              status: HealthStatus.HEALTHY,
              message: 'IndexedDB is accessible'
            });
          };

          request.onerror = () => {
            resolve({
              status: HealthStatus.DEGRADED,
              message: 'IndexedDB access error'
            });
          };

          request.onupgradeneeded = () => {
            // Database created successfully
          };
        });
      } catch (error) {
        return {
          status: HealthStatus.DEGRADED,
          message: 'IndexedDB check failed'
        };
      }
    });

    // API connectivity check (if base URL is configured)
    if (import.meta.env.VITE_API_BASE_URL) {
      this.register('api', async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`, {
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (response.ok) {
            return {
              status: HealthStatus.HEALTHY,
              message: 'API is reachable'
            };
          } else {
            return {
              status: HealthStatus.DEGRADED,
              message: `API returned ${response.status}`
            };
          }
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: 'API is unreachable'
          };
        }
      });
    }
  }
}

// Singleton instance
export const healthCheck = new HealthCheckSystem();

/**
 * Health check endpoint handler
 */
export async function healthCheckHandler(): Promise<Response> {
  const result = await healthCheck.check();
  const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;

  return new Response(JSON.stringify(result, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

/**
 * Liveness probe (simpler check - just returns OK if process is running)
 */
export async function livenessProbe(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'alive',
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Readiness probe (checks if app is ready to serve traffic)
 */
export async function readinessProbe(): Promise<Response> {
  const isHealthy = await healthCheck.isHealthy();

  return new Response(
    JSON.stringify({
      status: isHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString()
    }),
    {
      status: isHealthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * React hook for health monitoring
 */
export function useHealthCheck(intervalMs: number = 60000) {
  const [health, setHealth] = React.useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const runCheck = async () => {
      setLoading(true);
      const result = await healthCheck.check();
      setHealth(result);
      setLoading(false);
    };

    runCheck();
    const interval = setInterval(runCheck, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return { health, loading, isHealthy: health?.status === HealthStatus.HEALTHY };
}

// React namespace
import * as React from 'react';
