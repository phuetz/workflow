/**
 * Load Balancer Core
 * Backend management and core load balancing functionality
 */

import { EventEmitter } from 'events';
import type {
  Backend,
  BackendConfig,
  BackendStatus,
  CircuitBreakerInfo,
  LoadBalancerConfig,
  HealthCheckConfig,
  CircuitBreakerConfig
} from './types';

/**
 * Backend Manager - manages backend server registration and status
 */
export class BackendManager extends EventEmitter {
  private backends: Map<string, Backend> = new Map();

  registerBackend(config: BackendConfig): {
    success: boolean;
    backendId: string;
    error?: string;
  } {
    try {
      const validationError = this.validateBackendConfig(config);
      if (validationError) {
        return { success: false, backendId: config.id, error: validationError };
      }

      if (this.backends.has(config.id)) {
        return { success: false, backendId: config.id, error: 'Backend already exists' };
      }

      const now = new Date();
      const backend: Backend = {
        ...config,
        status: 'healthy',
        activeConnections: 0,
        totalRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        healthCheckFailures: 0,
        circuitBreaker: {
          state: 'closed',
          failures: 0,
          lastStateChange: now
        },
        createdAt: now,
        updatedAt: now
      };

      this.backends.set(config.id, backend);
      this.emit('backend:registered', { backendId: config.id, backend });

      return { success: true, backendId: config.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, backendId: config.id, error: errorMessage };
    }
  }

  removeBackend(backendId: string): boolean {
    const backend = this.backends.get(backendId);
    if (!backend) {
      return false;
    }

    this.backends.delete(backendId);
    this.emit('backend:removed', { backendId });

    return true;
  }

  getBackend(backendId: string): Backend | undefined {
    return this.backends.get(backendId);
  }

  getAllBackends(): Backend[] {
    return Array.from(this.backends.values());
  }

  getHealthyBackends(): Backend[] {
    return Array.from(this.backends.values()).filter(
      (b) => b.status === 'healthy' && b.circuitBreaker.state !== 'open'
    );
  }

  updateBackend(
    backendId: string,
    updates: Partial<BackendConfig>
  ): Backend | undefined {
    const backend = this.backends.get(backendId);
    if (!backend) {
      return undefined;
    }

    const updatedBackend: Backend = {
      ...backend,
      ...updates,
      id: backend.id,
      updatedAt: new Date()
    };

    this.backends.set(backendId, updatedBackend);
    this.emit('backend:updated', { backendId, backend: updatedBackend });

    return updatedBackend;
  }

  setBackendStatus(backendId: string, status: BackendStatus): boolean {
    const backend = this.backends.get(backendId);
    if (!backend) {
      return false;
    }

    backend.status = status;
    backend.updatedAt = new Date();
    this.backends.set(backendId, backend);

    this.emit('backend:statusChanged', { backendId, status });

    return true;
  }

  drainBackend(backendId: string): boolean {
    return this.setBackendStatus(backendId, 'draining');
  }

  incrementConnections(backendId: string): void {
    const backend = this.backends.get(backendId);
    if (backend) {
      backend.activeConnections++;
      backend.totalRequests++;
      backend.lastSuccessfulRequest = new Date();
      this.backends.set(backendId, backend);
    }
  }

  decrementConnections(backendId: string): void {
    const backend = this.backends.get(backendId);
    if (backend && backend.activeConnections > 0) {
      backend.activeConnections--;
      this.backends.set(backendId, backend);
    }
  }

  recordFailure(backendId: string): void {
    const backend = this.backends.get(backendId);
    if (backend) {
      backend.failedRequests++;
      if (backend.activeConnections > 0) {
        backend.activeConnections--;
      }
      this.backends.set(backendId, backend);
    }
  }

  updateLatency(backendId: string, latency: number): void {
    const backend = this.backends.get(backendId);
    if (backend) {
      backend.averageLatency = backend.averageLatency
        ? backend.averageLatency * 0.9 + latency * 0.1
        : latency;
      this.backends.set(backendId, backend);
    }
  }

  private validateBackendConfig(config: BackendConfig): string | null {
    if (!config.id || config.id.trim() === '') {
      return 'Backend ID is required';
    }

    if (!config.name || config.name.trim() === '') {
      return 'Backend name is required';
    }

    if (!config.host || config.host.trim() === '') {
      return 'Backend host is required';
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      return 'Invalid port number';
    }

    if (!['http', 'https', 'grpc'].includes(config.protocol)) {
      return 'Invalid protocol';
    }

    if (config.weight < 0 || config.weight > 100) {
      return 'Weight must be between 0 and 100';
    }

    if (config.maxConnections < 1) {
      return 'Max connections must be at least 1';
    }

    return null;
  }
}

/**
 * Circuit Breaker Manager - manages circuit breaker state for backends
 */
export class CircuitBreakerManager extends EventEmitter {
  private config: CircuitBreakerConfig;
  private backendManager: BackendManager;

  constructor(config: CircuitBreakerConfig, backendManager: BackendManager) {
    super();
    this.config = config;
    this.backendManager = backendManager;
  }

  configure(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  enable(config?: Partial<CircuitBreakerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      enabled: true
    };
    this.emit('config:circuitBreakerEnabled', { config: this.config });
  }

  disable(): void {
    this.config.enabled = false;

    for (const backend of this.backendManager.getAllBackends()) {
      backend.circuitBreaker = {
        state: 'closed',
        failures: 0,
        lastStateChange: new Date()
      };
    }

    this.emit('config:circuitBreakerDisabled', {});
  }

  getState(backendId: string): CircuitBreakerInfo | undefined {
    return this.backendManager.getBackend(backendId)?.circuitBreaker;
  }

  incrementFailure(backend: Backend): void {
    if (!this.config.enabled) return;

    const cb = backend.circuitBreaker;
    cb.failures++;
    cb.lastFailure = new Date();

    if (
      cb.state === 'closed' &&
      cb.failures >= this.config.failureThreshold
    ) {
      cb.state = 'open';
      cb.lastStateChange = new Date();
      cb.nextRetry = new Date(Date.now() + this.config.timeout);

      this.emit('circuitBreaker:open', { backendId: backend.id });

      // Schedule half-open transition
      setTimeout(() => {
        const currentBackend = this.backendManager.getBackend(backend.id);
        if (currentBackend && currentBackend.circuitBreaker.state === 'open') {
          currentBackend.circuitBreaker.state = 'half-open';
          currentBackend.circuitBreaker.lastStateChange = new Date();
          this.emit('circuitBreaker:halfOpen', { backendId: backend.id });
        }
      }, this.config.timeout);
    } else if (cb.state === 'half-open') {
      cb.state = 'open';
      cb.lastStateChange = new Date();
      cb.nextRetry = new Date(Date.now() + this.config.timeout);
      this.emit('circuitBreaker:open', { backendId: backend.id });
    }
  }

  recordSuccess(backendId: string): void {
    const backend = this.backendManager.getBackend(backendId);
    if (!backend) return;

    const cb = backend.circuitBreaker;
    if (cb.state === 'half-open') {
      const successCount = (backend.metadata?.halfOpenSuccesses as number) || 0;
      if (successCount + 1 >= this.config.successThreshold) {
        cb.state = 'closed';
        cb.failures = 0;
        cb.lastStateChange = new Date();
        backend.metadata = { ...backend.metadata, halfOpenSuccesses: 0 };
        this.emit('circuitBreaker:closed', { backendId });
      } else {
        backend.metadata = { ...backend.metadata, halfOpenSuccesses: successCount + 1 };
      }
    }

    this.backendManager.decrementConnections(backendId);
  }

  recordFailure(backendId: string): void {
    const backend = this.backendManager.getBackend(backendId);
    if (!backend) return;

    backend.failedRequests++;
    this.backendManager.decrementConnections(backendId);

    if (this.config.enabled) {
      this.incrementFailure(backend);
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }
}

/**
 * Default Load Balancer Configuration
 */
export const DEFAULT_CONFIG: LoadBalancerConfig = {
  routingPolicy: 'latency-based',
  healthCheck: {
    enabled: true,
    protocol: 'http',
    path: '/health',
    interval: 10000,
    timeout: 5000,
    healthyThreshold: 2,
    unhealthyThreshold: 3,
    expectedStatusCodes: [200, 204]
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    volumeThreshold: 10,
    errorPercentageThreshold: 50,
    rollingWindowMs: 60000
  },
  sessionAffinity: {
    enabled: false,
    type: 'cookie',
    cookieName: 'SERVERID',
    ttl: 3600
  },
  ssl: {
    enabled: true,
    protocols: ['TLSv1.2', 'TLSv1.3'],
    ciphers: [
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384'
    ],
    preferServerCiphers: true,
    sessionTimeout: 300,
    sessionCacheSize: 10000
  },
  ddosProtection: {
    enabled: true,
    rateLimit: 100,
    burstLimit: 200,
    blockDuration: 300,
    whitelistedIPs: [],
    blacklistedIPs: [],
    geoBlocking: {
      enabled: false,
      blockedCountries: [],
      allowedCountries: []
    }
  },
  rateLimit: {
    enabled: true,
    requestsPerSecond: 1000,
    burstSize: 2000,
    perRegion: true,
    perBackend: false
  },
  failoverEnabled: true,
  retryAttempts: 3,
  retryDelay: 1000,
  connectionTimeout: 5000,
  requestTimeout: 30000
};
