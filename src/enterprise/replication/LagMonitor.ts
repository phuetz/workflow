/**
 * Lag Monitor
 * Monitors replication lag and emits alerts when thresholds are exceeded
 */

import { EventEmitter } from 'events';
import type {
  ReplicationConfig,
  ReplicationLag,
  ReplicationStream,
  ReplicationMetrics,
  AlertSeverity,
} from './types';

export class LagMonitor extends EventEmitter {
  private config: ReplicationConfig | null = null;
  private alerts: Map<string, Date> = new Map();

  public setConfig(config: ReplicationConfig | null): void {
    this.config = config;
  }

  public getReplicationLag(
    regionId: string | undefined,
    streams: Map<string, ReplicationStream>
  ): ReplicationLag | ReplicationLag[] {
    if (!this.config) {
      throw new Error('Replication not configured');
    }

    const lags: ReplicationLag[] = [];

    for (const region of this.config.regions) {
      if (regionId && region.id !== regionId) continue;

      const lag = this.calculateRegionLag(region.id, streams);
      lags.push(lag);
      this.checkLagAlerts(lag);
    }

    return regionId ? lags[0] : lags;
  }

  public calculateRegionLag(
    regionId: string,
    streams: Map<string, ReplicationStream>
  ): ReplicationLag {
    const now = new Date();
    let totalLagMs = 0;
    let totalBytesPerSecond = 0;
    let streamCount = 0;
    let lastSyncTimestamp = new Date(0);

    for (const stream of streams.values()) {
      if (stream.targetRegion === regionId && stream.state === 'active') {
        const streamLag = stream.lastEventTimestamp
          ? now.getTime() - stream.lastEventTimestamp.getTime()
          : 0;

        totalLagMs += streamLag;
        totalBytesPerSecond += stream.metrics.bytesReplicated /
          ((now.getTime() - stream.startedAt.getTime()) / 1000);

        if (stream.lastEventTimestamp && stream.lastEventTimestamp > lastSyncTimestamp) {
          lastSyncTimestamp = stream.lastEventTimestamp;
        }

        streamCount++;
      }
    }

    const averageLagMs = streamCount > 0 ? totalLagMs / streamCount : 0;
    const bytesPerSecond = streamCount > 0 ? totalBytesPerSecond / streamCount : 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (this.config) {
      if (averageLagMs > this.config.lagToleranceMs * 2) {
        status = 'critical';
      } else if (averageLagMs > this.config.lagToleranceMs) {
        status = 'warning';
      }
    }

    return {
      regionId,
      lagMs: averageLagMs,
      lastSyncTimestamp,
      pendingEvents: 0,
      bytesPerSecond,
      estimatedCatchupMs: bytesPerSecond > 0 ? 0 : 0,
      status
    };
  }

  public checkLagAlerts(lag: ReplicationLag): void {
    if (!this.config?.alerting.enabled) return;

    const alertKey = `lag-${lag.regionId}`;
    const lastAlert = this.alerts.get(alertKey);
    const now = new Date();

    if (lastAlert && (now.getTime() - lastAlert.getTime()) < this.config.alerting.cooldownMs) {
      return;
    }

    if (lag.lagMs > this.config.alerting.lagThresholdMs) {
      const severity: AlertSeverity = lag.status === 'critical' ? 'critical' : 'warning';

      this.alerts.set(alertKey, now);
      this.emit('alert', {
        type: 'replication_lag',
        severity,
        regionId: lag.regionId,
        lagMs: lag.lagMs,
        threshold: this.config.alerting.lagThresholdMs,
        message: `Replication lag for region ${lag.regionId} is ${lag.lagMs}ms (threshold: ${this.config.alerting.lagThresholdMs}ms)`
      });
    }
  }

  public updateMetricsWithLag(
    metrics: ReplicationMetrics,
    streams: Map<string, ReplicationStream>
  ): void {
    if (!this.config) return;

    const lags: ReplicationLag[] = [];
    for (const region of this.config.regions) {
      lags.push(this.calculateRegionLag(region.id, streams));
    }

    if (lags.length > 0) {
      metrics.averageLagMs = lags.reduce((sum, lag) => sum + lag.lagMs, 0) / lags.length;
    }
  }

  public cleanup(): void {
    this.alerts.clear();
    this.removeAllListeners();
  }
}
