/**
 * Session Affinity
 * Session persistence and traffic metrics management
 */

import { EventEmitter } from 'events';
import type {
  Backend,
  SessionAffinityConfig,
  SessionEntry,
  Region,
  TrafficMetrics,
  RegionMetrics,
  BackendMetrics,
  RequestLogEntry,
  SSLConfig
} from './types';
import { BackendManager } from './LoadBalancerCore';

/**
 * Session Affinity Manager - manages sticky sessions
 */
export class SessionAffinityManager extends EventEmitter {
  private sessionStore: Map<string, SessionEntry> = new Map();
  private config: SessionAffinityConfig;
  private backendManager: BackendManager;

  constructor(config: SessionAffinityConfig, backendManager: BackendManager) {
    super();
    this.config = config;
    this.backendManager = backendManager;
  }

  configure(config: Partial<SessionAffinityConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:sessionAffinityChanged', { config: this.config });
  }

  getBackend(sessionId: string): Backend | undefined {
    const entry = this.sessionStore.get(sessionId);
    if (!entry) return undefined;

    // Check if session has expired
    if (entry.expiresAt < new Date()) {
      this.sessionStore.delete(sessionId);
      return undefined;
    }

    return this.backendManager.getBackend(entry.backendId);
  }

  storeAffinity(sessionId: string, backendId: string): void {
    const expiresAt = new Date(Date.now() + this.config.ttl * 1000);
    this.sessionStore.set(sessionId, { backendId, expiresAt });
  }

  removeAffinity(sessionId: string): void {
    this.sessionStore.delete(sessionId);
  }

  removeBackendSessions(backendId: string): void {
    for (const [sessionId, entry] of this.sessionStore.entries()) {
      if (entry.backendId === backendId) {
        this.sessionStore.delete(sessionId);
      }
    }
  }

  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, entry] of this.sessionStore.entries()) {
      if (entry.expiresAt < now) {
        this.sessionStore.delete(sessionId);
      }
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): SessionAffinityConfig {
    return { ...this.config };
  }

  getSessionCount(): number {
    return this.sessionStore.size;
  }
}

/**
 * Traffic Metrics Manager - collects and calculates traffic metrics
 */
export class TrafficMetricsManager {
  private requestLog: RequestLogEntry[] = [];
  private latencyRecords: number[] = [];
  private backendManager: BackendManager;

  constructor(backendManager: BackendManager) {
    this.backendManager = backendManager;
  }

  recordRequest(
    backendId: string,
    latency: number,
    success: boolean,
    region?: Region
  ): void {
    this.requestLog.push({
      timestamp: new Date(),
      latency,
      success,
      region,
      backendId
    });

    this.latencyRecords.push(latency);

    // Keep only last hour of requests
    this.cleanupOldRecords();
  }

  private cleanupOldRecords(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.requestLog = this.requestLog.filter((r) => r.timestamp >= oneHourAgo);
    if (this.latencyRecords.length > 10000) {
      this.latencyRecords = this.latencyRecords.slice(-10000);
    }
  }

  getMetrics(timeRangeMs: number = 3600000): TrafficMetrics {
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRangeMs);

    // Filter recent requests
    const recentRequests = this.requestLog.filter(
      (r) => r.timestamp >= startTime
    );

    const totalRequests = recentRequests.length;
    const successfulRequests = recentRequests.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;

    // Calculate latencies
    const latencies = recentRequests.map((r) => r.latency).sort((a, b) => a - b);
    const averageLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;
    const p50Latency = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || 0;

    // Calculate RPS
    const timeRangeSeconds = timeRangeMs / 1000;
    const requestsPerSecond = totalRequests / timeRangeSeconds;

    // Calculate active connections
    const activeConnections = this.backendManager
      .getAllBackends()
      .reduce((sum, b) => sum + b.activeConnections, 0);

    // Region metrics
    const byRegion = this.calculateRegionMetrics(recentRequests);

    // Backend metrics
    const byBackend = this.calculateBackendMetrics(recentRequests);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      requestsPerSecond,
      bytesTransferred: 0, // Would need actual tracking
      activeConnections,
      byRegion,
      byBackend,
      timeRange: {
        start: startTime,
        end: now
      }
    };
  }

  private calculateRegionMetrics(
    requests: RequestLogEntry[]
  ): Record<Region, RegionMetrics> {
    const regions: Region[] = [
      'us-east',
      'us-west',
      'eu-west',
      'eu-central',
      'ap-southeast',
      'ap-northeast',
      'sa-east',
      'af-south',
      'me-south',
      'ap-south'
    ];

    const byRegion: Record<Region, RegionMetrics> = {} as Record<Region, RegionMetrics>;

    for (const region of regions) {
      const regionRequests = requests.filter((r) => r.region === region);
      const regionLatencies = regionRequests.map((r) => r.latency);
      const regionErrors = regionRequests.filter((r) => !r.success).length;

      byRegion[region] = {
        requests: regionRequests.length,
        averageLatency:
          regionLatencies.length > 0
            ? regionLatencies.reduce((a, b) => a + b, 0) / regionLatencies.length
            : 0,
        errorRate:
          regionRequests.length > 0
            ? (regionErrors / regionRequests.length) * 100
            : 0
      };
    }

    return byRegion;
  }

  private calculateBackendMetrics(
    requests: RequestLogEntry[]
  ): Record<string, BackendMetrics> {
    const byBackend: Record<string, BackendMetrics> = {};

    for (const backend of this.backendManager.getAllBackends()) {
      const backendRequests = requests.filter((r) => r.backendId === backend.id);
      const backendLatencies = backendRequests.map((r) => r.latency);
      const backendErrors = backendRequests.filter((r) => !r.success).length;

      byBackend[backend.id] = {
        requests: backendRequests.length,
        errors: backendErrors,
        averageLatency:
          backendLatencies.length > 0
            ? backendLatencies.reduce((a, b) => a + b, 0) / backendLatencies.length
            : 0,
        activeConnections: backend.activeConnections,
        healthCheckStatus: backend.status
      };
    }

    return byBackend;
  }

  clearMetrics(): void {
    this.requestLog = [];
    this.latencyRecords = [];
  }
}

/**
 * SSL Configuration Manager
 */
export class SSLConfigManager extends EventEmitter {
  private config: SSLConfig;

  constructor(config: SSLConfig) {
    super();
    this.config = config;
  }

  configure(config: Partial<SSLConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:sslChanged', { config: this.config });
  }

  getConfig(): SSLConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * Maintenance Manager - handles cleanup tasks
 */
export class MaintenanceManager {
  private sessionManager: SessionAffinityManager;
  private ddosBlocklist: Map<string, Date>;
  private rateLimitBuckets: Map<string, { tokens: number; lastRefill: number }>;
  private cleanupIntervals: ReturnType<typeof setInterval>[] = [];

  constructor(
    sessionManager: SessionAffinityManager,
    ddosBlocklist: Map<string, Date>,
    rateLimitBuckets: Map<string, { tokens: number; lastRefill: number }>
  ) {
    this.sessionManager = sessionManager;
    this.ddosBlocklist = ddosBlocklist;
    this.rateLimitBuckets = rateLimitBuckets;
  }

  startMaintenanceTasks(): void {
    // Clean up expired sessions every minute
    const sessionCleanup = setInterval(() => {
      this.sessionManager.cleanupExpiredSessions();
    }, 60000);
    this.cleanupIntervals.push(sessionCleanup);

    // Clean up expired DDoS blocks every minute
    const ddosCleanup = setInterval(() => {
      const now = new Date();
      for (const [ip, expiry] of this.ddosBlocklist.entries()) {
        if (expiry < now) {
          this.ddosBlocklist.delete(ip);
        }
      }
    }, 60000);
    this.cleanupIntervals.push(ddosCleanup);

    // Clean up stale rate limit buckets every 5 minutes
    const rateLimitCleanup = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 300000;
      for (const [key, bucket] of this.rateLimitBuckets.entries()) {
        if (bucket.lastRefill < fiveMinutesAgo) {
          this.rateLimitBuckets.delete(key);
        }
      }
    }, 300000);
    this.cleanupIntervals.push(rateLimitCleanup);
  }

  stopMaintenanceTasks(): void {
    for (const interval of this.cleanupIntervals) {
      clearInterval(interval);
    }
    this.cleanupIntervals = [];
  }
}
