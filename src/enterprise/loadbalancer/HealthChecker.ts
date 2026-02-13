/**
 * Health Checker
 * Backend health checking and monitoring functionality
 */

import { EventEmitter } from 'events';
import type { Backend, HealthCheckConfig } from './types';
import { BackendManager, CircuitBreakerManager } from './LoadBalancerCore';

/**
 * Health Check Manager - performs periodic health checks on backends
 */
export class HealthCheckManager extends EventEmitter {
  private config: HealthCheckConfig;
  private backendManager: BackendManager;
  private circuitBreakerManager: CircuitBreakerManager;
  private healthCheckIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(
    config: HealthCheckConfig,
    backendManager: BackendManager,
    circuitBreakerManager: CircuitBreakerManager
  ) {
    super();
    this.config = config;
    this.backendManager = backendManager;
    this.circuitBreakerManager = circuitBreakerManager;
  }

  configure(config: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart health checks with new configuration
    if (this.config.enabled) {
      for (const backend of this.backendManager.getAllBackends()) {
        this.stopHealthCheck(backend.id);
        this.startHealthCheck(backend.id);
      }
    } else {
      for (const backend of this.backendManager.getAllBackends()) {
        this.stopHealthCheck(backend.id);
      }
    }

    this.emit('config:healthCheckChanged', { config: this.config });
  }

  startHealthCheck(backendId: string): void {
    const backend = this.backendManager.getBackend(backendId);
    if (!backend) return;

    const interval = setInterval(
      () => this.performHealthCheck(backendId),
      this.config.interval
    );

    this.healthCheckIntervals.set(backendId, interval);

    // Perform immediate health check
    this.performHealthCheck(backendId);
  }

  stopHealthCheck(backendId: string): void {
    const interval = this.healthCheckIntervals.get(backendId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(backendId);
    }
  }

  stopAllHealthChecks(): void {
    for (const [backendId] of this.healthCheckIntervals) {
      this.stopHealthCheck(backendId);
    }
  }

  async performHealthCheck(backendId: string): Promise<void> {
    const backend = this.backendManager.getBackend(backendId);
    if (!backend) return;

    const startTime = Date.now();
    let isHealthy = false;

    try {
      isHealthy = await this.simulateHealthCheck(backend);
      const latency = Date.now() - startTime;

      if (isHealthy) {
        this.handleHealthCheckSuccess(backend, latency);
      } else {
        this.handleHealthCheckFailure(backend);
      }

      backend.lastHealthCheck = new Date();
      backend.updatedAt = new Date();

      this.emit('healthCheck:completed', {
        backendId,
        isHealthy,
        latency,
        status: backend.status
      });
    } catch (error) {
      this.handleHealthCheckFailure(backend);
      backend.lastHealthCheck = new Date();
    }
  }

  private async simulateHealthCheck(backend: Backend): Promise<boolean> {
    // In production, this would make actual HTTP/TCP requests
    // For now, simulate based on backend status
    if (backend.status === 'disabled') {
      return false;
    }

    // Random failure simulation (remove in production)
    return Math.random() > 0.05; // 95% success rate
  }

  private handleHealthCheckSuccess(backend: Backend, latency: number): void {
    backend.healthCheckFailures = 0;

    if (backend.status === 'unhealthy' || backend.status === 'degraded') {
      const healthyChecks = (backend.metadata?.healthyChecks as number) || 0;
      if (healthyChecks + 1 >= this.config.healthyThreshold) {
        backend.status = 'healthy';
        backend.metadata = { ...backend.metadata, healthyChecks: 0 };
        this.emit('backend:recovered', { backendId: backend.id });
      } else {
        backend.metadata = { ...backend.metadata, healthyChecks: healthyChecks + 1 };
      }
    }

    // Update latency
    this.backendManager.updateLatency(backend.id, latency);

    // Handle circuit breaker recovery
    if (backend.circuitBreaker.state === 'half-open') {
      backend.circuitBreaker.failures = 0;
      backend.circuitBreaker.state = 'closed';
      backend.circuitBreaker.lastStateChange = new Date();
      this.emit('circuitBreaker:closed', { backendId: backend.id });
    }
  }

  private handleHealthCheckFailure(backend: Backend): void {
    backend.healthCheckFailures++;

    if (backend.healthCheckFailures >= this.config.unhealthyThreshold) {
      if (backend.status !== 'unhealthy' && backend.status !== 'disabled') {
        backend.status = 'unhealthy';
        this.emit('backend:unhealthy', { backendId: backend.id });
      }
    } else if (backend.healthCheckFailures >= 1) {
      if (backend.status === 'healthy') {
        backend.status = 'degraded';
      }
    }

    // Update circuit breaker
    if (this.circuitBreakerManager.isEnabled()) {
      this.circuitBreakerManager.incrementFailure(backend);
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }

  getHealthCheckInterval(backendId: string): ReturnType<typeof setInterval> | undefined {
    return this.healthCheckIntervals.get(backendId);
  }
}

/**
 * DDoS Protection Manager
 */
export class DDoSProtectionManager extends EventEmitter {
  private blocklist: Map<string, Date> = new Map();
  private rateLimitBuckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private config: {
    enabled: boolean;
    rateLimit: number;
    burstLimit: number;
    blockDuration: number;
    whitelistedIPs: string[];
    blacklistedIPs: string[];
  };

  constructor(config: any) {
    super();
    this.config = config;
  }

  configure(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:ddosProtectionChanged', { config: this.config });
  }

  checkProtection(clientIP: string): { allowed: boolean; reason?: string } {
    // Check whitelist
    if (this.config.whitelistedIPs.includes(clientIP)) {
      return { allowed: true };
    }

    // Check blacklist
    if (this.config.blacklistedIPs.includes(clientIP)) {
      return { allowed: false, reason: 'IP blacklisted' };
    }

    // Check temporary blocklist
    const blockExpiry = this.blocklist.get(clientIP);
    if (blockExpiry && blockExpiry > new Date()) {
      return { allowed: false, reason: 'IP temporarily blocked' };
    }

    // Check rate limit
    const bucket = this.rateLimitBuckets.get(clientIP);
    const now = Date.now();

    if (!bucket) {
      this.rateLimitBuckets.set(clientIP, {
        tokens: this.config.burstLimit - 1,
        lastRefill: now
      });
      return { allowed: true };
    }

    // Refill tokens
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.config.burstLimit,
      bucket.tokens + elapsedSeconds * this.config.rateLimit
    );
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return { allowed: true };
    }

    // Block IP temporarily
    this.blocklist.set(
      clientIP,
      new Date(Date.now() + this.config.blockDuration * 1000)
    );

    this.emit('ddos:ipBlocked', { clientIP });

    return { allowed: false, reason: 'Rate limit exceeded' };
  }

  blockIP(ip: string, duration?: number): void {
    const blockDuration = duration || this.config.blockDuration;
    this.blocklist.set(ip, new Date(Date.now() + blockDuration * 1000));
    this.emit('ddos:ipBlocked', { ip, duration: blockDuration });
  }

  unblockIP(ip: string): void {
    this.blocklist.delete(ip);
    this.emit('ddos:ipUnblocked', { ip });
  }

  getBlockedIPs(): Map<string, Date> {
    return new Map(this.blocklist);
  }

  getRateLimitBuckets(): Map<string, { tokens: number; lastRefill: number }> {
    return new Map(this.rateLimitBuckets);
  }

  cleanupExpiredBlocks(): void {
    const now = new Date();
    for (const [ip, expiry] of this.blocklist.entries()) {
      if (expiry < now) {
        this.blocklist.delete(ip);
      }
    }
  }

  cleanupStaleBuckets(staleThresholdMs: number = 300000): void {
    const threshold = Date.now() - staleThresholdMs;
    for (const [key, bucket] of this.rateLimitBuckets.entries()) {
      if (bucket.lastRefill < threshold) {
        this.rateLimitBuckets.delete(key);
      }
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }
}

/**
 * Rate Limit Manager
 */
export class RateLimitManager {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private config: {
    enabled: boolean;
    requestsPerSecond: number;
    burstSize: number;
    perRegion: boolean;
    perBackend: boolean;
  };

  constructor(config: any) {
    this.config = config;
  }

  configure(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
  }

  checkLimit(key: string): { allowed: boolean } {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket) {
      this.buckets.set(key, {
        tokens: this.config.burstSize - 1,
        lastRefill: now
      });
      return { allowed: true };
    }

    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.config.burstSize,
      bucket.tokens + elapsedSeconds * this.config.requestsPerSecond
    );
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return { allowed: true };
    }

    return { allowed: false };
  }

  getKey(clientRegion?: string): string {
    if (this.config.perRegion && clientRegion) {
      return `region:${clientRegion}`;
    }
    return 'global';
  }

  getBuckets(): Map<string, { tokens: number; lastRefill: number }> {
    return new Map(this.buckets);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }
}
