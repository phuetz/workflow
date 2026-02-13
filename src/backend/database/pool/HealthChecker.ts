/**
 * Health Checker
 * Connection health monitoring and validation
 */

import type { PoolConfig, PooledConnection } from './types';

export class HealthChecker {
  constructor(private config: PoolConfig) {}

  /**
   * Check if connection is still valid
   */
  isConnectionValid(pooled: PooledConnection): boolean {
    // Check if connection has been idle too long
    if (Date.now() - pooled.lastUsed > this.config.idleTimeout) {
      return false;
    }

    // Check error rate
    if (pooled.queryCount > 0 && pooled.errorCount / pooled.queryCount > 0.5) {
      return false;
    }

    return true;
  }
}
