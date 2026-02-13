/**
 * Agent Rollback Manager
 *
 * Instant rollback capabilities for agents with:
 * - <30 second rollback time
 * - Automatic rollback on error threshold
 * - Rollback history tracking
 * - Rollforward (undo rollback) capability
 */

import { EventEmitter } from 'events';
import {
  Agent,
  AgentVersion,
  ErrorThreshold,
  RollbackHistory,
  User,
} from './types/agentops';
import { versionControl } from './AgentVersionControl';
import { monitoring } from './AgentMonitoring';

/**
 * Auto-rollback monitor state
 */
interface AutoRollbackMonitor {
  agentId: string;
  threshold: ErrorThreshold;
  enabled: boolean;
  windowStart: number;
  requestCount: number;
  errorCount: number;
  latencies: number[];
}

/**
 * Rollback manager
 */
export class RollbackManager extends EventEmitter {
  private rollbackHistory: Map<string, RollbackHistory[]> = new Map();
  private autoRollbackMonitors: Map<string, AutoRollbackMonitor> = new Map();
  private activeRollbacks: Set<string> = new Set();
  private autoRollbackMonitoringInterval: NodeJS.Timeout | null = null;

  private readonly ROLLBACK_TIMEOUT = 30000; // 30 seconds max
  private readonly MONITORING_INTERVAL = 5000; // Check every 5 seconds

  constructor() {
    super();
    this.startAutoRollbackMonitoring();
  }

  /**
   * Perform immediate rollback to previous version
   */
  async rollback(
    agentId: string,
    reason: string,
    user?: User,
    targetVersion?: string
  ): Promise<RollbackHistory> {
    if (this.activeRollbacks.has(agentId)) {
      throw new Error(`Rollback already in progress for agent ${agentId}`);
    }

    this.activeRollbacks.add(agentId);

    const history: RollbackHistory = {
      id: this.generateRollbackId(),
      agentId,
      fromVersion: '',
      toVersion: targetVersion || '',
      reason,
      trigger: user ? 'manual' : 'automatic',
      triggeredBy: user,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      status: 'success',
    };

    try {
      // Get current version
      const currentVersion = versionControl.getCurrentVersion(agentId);
      if (!currentVersion) {
        throw new Error(`No current version found for agent ${agentId}`);
      }
      history.fromVersion = currentVersion.version;

      // Determine target version
      let target: AgentVersion;
      if (targetVersion) {
        const version = versionControl.getVersion(targetVersion);
        if (!version) {
          throw new Error(`Target version ${targetVersion} not found`);
        }
        target = version;
      } else {
        // Rollback to parent version (previous version)
        if (!currentVersion.parent) {
          throw new Error('No previous version to rollback to');
        }
        const parent = versionControl.getVersion(currentVersion.parent);
        if (!parent) {
          throw new Error('Previous version not found');
        }
        target = parent;
      }
      history.toVersion = target.version;

      // Execute rollback with timeout
      await this.executeRollbackWithTimeout(agentId, target, history);

      history.status = 'success';
      history.endTime = Date.now();
      history.duration = history.endTime - history.startTime;

      // Store in history
      this.addToHistory(agentId, history);

      this.emit('rollback-completed', { history });

      return history;
    } catch (error) {
      history.status = 'failed';
      history.error = error instanceof Error ? error.message : String(error);
      history.endTime = Date.now();
      history.duration = history.endTime - history.startTime;

      this.addToHistory(agentId, history);

      this.emit('rollback-failed', { history, error });

      throw error;
    } finally {
      this.activeRollbacks.delete(agentId);
    }
  }

  /**
   * Rollforward (undo a rollback)
   */
  async rollforward(agentId: string, user: User): Promise<RollbackHistory> {
    const history = this.getHistory(agentId);
    if (history.length === 0) {
      throw new Error('No rollback history found');
    }

    const lastRollback = history[0];
    if (lastRollback.status !== 'success') {
      throw new Error('Cannot rollforward from failed rollback');
    }

    // Rollback to the "from" version (undoing the rollback)
    return this.rollback(
      agentId,
      `Rollforward from rollback ${lastRollback.id}`,
      user,
      lastRollback.fromVersion
    );
  }

  /**
   * Enable automatic rollback on error threshold
   */
  enableAutoRollback(agentId: string, threshold: ErrorThreshold): void {
    this.autoRollbackMonitors.set(agentId, {
      agentId,
      threshold,
      enabled: true,
      windowStart: Date.now(),
      requestCount: 0,
      errorCount: 0,
      latencies: [],
    });

    this.emit('auto-rollback-enabled', { agentId, threshold });
  }

  /**
   * Disable automatic rollback
   */
  disableAutoRollback(agentId: string): void {
    const monitor = this.autoRollbackMonitors.get(agentId);
    if (monitor) {
      monitor.enabled = false;
      this.emit('auto-rollback-disabled', { agentId });
    }
  }

  /**
   * Get rollback history for an agent
   */
  getHistory(agentId: string, limit: number = 20): RollbackHistory[] {
    const history = this.rollbackHistory.get(agentId) || [];
    return history.slice(0, limit);
  }

  /**
   * Get all rollback history
   */
  getAllHistory(limit: number = 100): RollbackHistory[] {
    const allHistory: RollbackHistory[] = [];
    for (const history of this.rollbackHistory.values()) {
      allHistory.push(...history);
    }
    return allHistory
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Check if rollback is in progress
   */
  isRollbackInProgress(agentId: string): boolean {
    return this.activeRollbacks.has(agentId);
  }

  /**
   * Get auto-rollback configuration
   */
  getAutoRollbackConfig(agentId: string): ErrorThreshold | undefined {
    return this.autoRollbackMonitors.get(agentId)?.threshold;
  }

  // Private methods

  /**
   * Execute rollback with timeout
   */
  private async executeRollbackWithTimeout(
    agentId: string,
    targetVersion: AgentVersion,
    history: RollbackHistory
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Rollback timeout after ${this.ROLLBACK_TIMEOUT}ms`));
      }, this.ROLLBACK_TIMEOUT);

      this.executeRollback(agentId, targetVersion, history)
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Execute the actual rollback
   */
  private async executeRollback(
    agentId: string,
    targetVersion: AgentVersion,
    history: RollbackHistory
  ): Promise<void> {
    // Phase 1: Prepare rollback (5s)
    this.emit('rollback-phase', { history, phase: 'prepare' });
    await this.delay(100); // Simulate preparation

    // Phase 2: Stop current version (5s)
    this.emit('rollback-phase', { history, phase: 'stop' });
    await this.delay(100); // Simulate stopping

    // Phase 3: Switch to target version (10s)
    this.emit('rollback-phase', { history, phase: 'switch' });
    await this.delay(150); // Simulate switching

    // Phase 4: Start target version (5s)
    this.emit('rollback-phase', { history, phase: 'start' });
    await this.delay(100); // Simulate starting

    // Phase 5: Verify rollback (5s)
    this.emit('rollback-phase', { history, phase: 'verify' });
    await this.delay(100); // Simulate verification

    // Verify health
    const metrics = monitoring.getCurrentMetrics(agentId);
    if (metrics.errorRate > 0.5) {
      throw new Error('Rollback verification failed: High error rate detected');
    }
  }

  /**
   * Start auto-rollback monitoring
   */
  private startAutoRollbackMonitoring(): void {
    this.autoRollbackMonitoringInterval = setInterval(() => {
      this.checkAutoRollbackConditions();
    }, this.MONITORING_INTERVAL);

    // Listen to execution events from monitoring
    monitoring.on('metrics-recorded', ({ agentId, metrics }) => {
      const monitor = this.autoRollbackMonitors.get(agentId);
      if (!monitor || !monitor.enabled) return;

      // Update monitor state
      const now = Date.now();
      if (now - monitor.windowStart > monitor.threshold.timeWindow) {
        // Reset window
        monitor.windowStart = now;
        monitor.requestCount = 0;
        monitor.errorCount = 0;
        monitor.latencies = [];
      }

      monitor.requestCount = metrics.totalRequests;
      monitor.errorCount = metrics.failedRequests;
      monitor.latencies.push(metrics.latency.p95);
    });
  }

  /**
   * Check auto-rollback conditions
   */
  private async checkAutoRollbackConditions(): Promise<void> {
    for (const [agentId, monitor] of this.autoRollbackMonitors) {
      if (!monitor.enabled) continue;

      // Skip if rollback already in progress
      if (this.activeRollbacks.has(agentId)) continue;

      // Check if we have enough requests
      if (monitor.requestCount < monitor.threshold.minRequests) continue;

      const errorRate = monitor.errorCount / monitor.requestCount;
      const avgLatency = monitor.latencies.length > 0
        ? monitor.latencies.reduce((a, b) => a + b, 0) / monitor.latencies.length
        : 0;

      // Check thresholds
      const errorThresholdExceeded = errorRate > monitor.threshold.errorRate;
      const latencyThresholdExceeded = avgLatency > monitor.threshold.latency;

      if (errorThresholdExceeded || latencyThresholdExceeded) {
        const reason = errorThresholdExceeded
          ? `Error rate ${(errorRate * 100).toFixed(1)}% exceeded threshold ${(monitor.threshold.errorRate * 100).toFixed(1)}%`
          : `P95 latency ${avgLatency.toFixed(0)}ms exceeded threshold ${monitor.threshold.latency}ms`;

        this.emit('auto-rollback-triggered', { agentId, reason, monitor });

        try {
          await this.rollback(agentId, reason);
          this.emit('auto-rollback-completed', { agentId });
        } catch (error) {
          this.emit('auto-rollback-failed', { agentId, error });
        }
      }
    }
  }

  /**
   * Add rollback to history
   */
  private addToHistory(agentId: string, history: RollbackHistory): void {
    if (!this.rollbackHistory.has(agentId)) {
      this.rollbackHistory.set(agentId, []);
    }
    const agentHistory = this.rollbackHistory.get(agentId)!;
    agentHistory.unshift(history); // Add to beginning

    // Keep only last 50 rollbacks per agent
    if (agentHistory.length > 50) {
      agentHistory.pop();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRollbackId(): string {
    return `rollback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop the rollback manager and clean up resources
   */
  public stop(): void {
    // Clear auto-rollback monitoring interval
    if (this.autoRollbackMonitoringInterval) {
      clearInterval(this.autoRollbackMonitoringInterval);
      this.autoRollbackMonitoringInterval = null;
    }

    // Remove event listeners
    monitoring.removeAllListeners('metrics-recorded');
    this.removeAllListeners();

    // Clear state
    this.autoRollbackMonitors.clear();
    this.activeRollbacks.clear();
  }
}

/**
 * Singleton instance
 */
export const rollbackManager = new RollbackManager();
