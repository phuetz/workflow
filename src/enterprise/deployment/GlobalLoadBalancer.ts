/**
 * Global Load Balancer - Facade re-exporting from modular components
 * See ../loadbalancer/ directory for implementation details
 */

import { EventEmitter } from 'events';
import {
  BackendManager,
  CircuitBreakerManager,
  HealthCheckManager,
  DDoSProtectionManager,
  RateLimitManager,
  Router,
  SessionAffinityManager,
  TrafficMetricsManager,
  SSLConfigManager,
  MaintenanceManager,
  DEFAULT_CONFIG
} from '../loadbalancer';

export * from '../loadbalancer/types';

import type {
  Backend, BackendConfig, BackendStatus, CircuitBreakerConfig, CircuitBreakerInfo,
  DDoSProtectionConfig, HealthCheckConfig, LoadBalancerConfig, RateLimitConfig,
  RoutingPolicy, RoutingRequest, RoutingResult, SessionAffinityConfig, SSLConfig,
  TrafficMetrics, LoadBalancerStatistics, HealthStatus
} from '../loadbalancer/types';

/** Main facade class delegating to modular components */
export class GlobalLoadBalancer extends EventEmitter {
  private static instance: GlobalLoadBalancer | null = null;

  private config: LoadBalancerConfig;
  private backendManager: BackendManager;
  private circuitBreakerManager: CircuitBreakerManager;
  private healthCheckManager: HealthCheckManager;
  private ddosProtectionManager: DDoSProtectionManager;
  private rateLimitManager: RateLimitManager;
  private router: Router;
  private sessionAffinityManager: SessionAffinityManager;
  private trafficMetricsManager: TrafficMetricsManager;
  private sslConfigManager: SSLConfigManager;
  private maintenanceManager: MaintenanceManager;

  private constructor(config?: Partial<LoadBalancerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize managers
    this.backendManager = new BackendManager();
    this.circuitBreakerManager = new CircuitBreakerManager(
      this.config.circuitBreaker,
      this.backendManager
    );
    this.healthCheckManager = new HealthCheckManager(
      this.config.healthCheck,
      this.backendManager,
      this.circuitBreakerManager
    );
    this.ddosProtectionManager = new DDoSProtectionManager(this.config.ddosProtection);
    this.rateLimitManager = new RateLimitManager(this.config.rateLimit);
    this.router = new Router(this.config.routingPolicy);
    this.sessionAffinityManager = new SessionAffinityManager(
      this.config.sessionAffinity,
      this.backendManager
    );
    this.trafficMetricsManager = new TrafficMetricsManager(this.backendManager);
    this.sslConfigManager = new SSLConfigManager(this.config.ssl);
    this.maintenanceManager = new MaintenanceManager(
      this.sessionAffinityManager,
      this.ddosProtectionManager.getBlockedIPs(),
      this.rateLimitManager.getBuckets()
    );

    this.setupEventForwarding();
    this.maintenanceManager.startMaintenanceTasks();
  }

  public static getInstance(config?: Partial<LoadBalancerConfig>): GlobalLoadBalancer {
    if (!GlobalLoadBalancer.instance) {
      GlobalLoadBalancer.instance = new GlobalLoadBalancer(config);
    }
    return GlobalLoadBalancer.instance;
  }

  public static resetInstance(): void {
    if (GlobalLoadBalancer.instance) {
      GlobalLoadBalancer.instance.shutdown();
      GlobalLoadBalancer.instance.removeAllListeners();
      GlobalLoadBalancer.instance = null;
    }
  }

  private setupEventForwarding(): void {
    ['backend:registered', 'backend:removed', 'backend:updated', 'backend:statusChanged',
     'backend:recovered', 'backend:unhealthy'
    ].forEach((e) => this.backendManager.on(e, (d) => this.emit(e, d)));
    ['circuitBreaker:open', 'circuitBreaker:halfOpen', 'circuitBreaker:closed',
     'config:circuitBreakerEnabled', 'config:circuitBreakerDisabled'
    ].forEach((e) => this.circuitBreakerManager.on(e, (d) => this.emit(e, d)));
    ['healthCheck:completed', 'config:healthCheckChanged'
    ].forEach((e) => this.healthCheckManager.on(e, (d) => this.emit(e, d)));
    this.ddosProtectionManager.on('ddos:ipBlocked', (d) => this.emit('ddos:ipBlocked', d));
    this.ddosProtectionManager.on('ddos:ipUnblocked', (d) => this.emit('ddos:ipUnblocked', d));
  }

  // Backend Management
  public registerBackend(config: BackendConfig): {
    success: boolean;
    backendId: string;
    error?: string;
  } {
    const result = this.backendManager.registerBackend(config);

    if (result.success && this.config.healthCheck.enabled) {
      this.healthCheckManager.startHealthCheck(config.id);
    }

    return result;
  }

  public removeBackend(backendId: string): boolean {
    this.healthCheckManager.stopHealthCheck(backendId);
    this.sessionAffinityManager.removeBackendSessions(backendId);
    return this.backendManager.removeBackend(backendId);
  }

  public getBackend(backendId: string): Backend | undefined {
    return this.backendManager.getBackend(backendId);
  }

  public getAllBackends(): Backend[] {
    return this.backendManager.getAllBackends();
  }

  public getHealthyBackends(): Backend[] {
    return this.backendManager.getHealthyBackends();
  }

  public updateBackend(
    backendId: string,
    updates: Partial<BackendConfig>
  ): Backend | undefined {
    return this.backendManager.updateBackend(backendId, updates);
  }

  public setBackendStatus(backendId: string, status: BackendStatus): boolean {
    return this.backendManager.setBackendStatus(backendId, status);
  }

  public drainBackend(backendId: string): boolean {
    return this.backendManager.drainBackend(backendId);
  }

  // Request Routing
  public async routeRequest(request: RoutingRequest): Promise<RoutingResult> {
    const startTime = Date.now();

    try {
      // DDoS protection check
      if (this.config.ddosProtection.enabled) {
        const ddosResult = this.ddosProtectionManager.checkProtection(request.clientIP);
        if (!ddosResult.allowed) {
          return {
            success: false,
            error: 'Request blocked by DDoS protection',
            errorCode: 'DDOS_BLOCKED'
          };
        }
      }

      // Rate limiting check
      if (this.config.rateLimit.enabled) {
        const rateLimitKey = this.rateLimitManager.getKey(request.clientRegion);
        const rateLimitResult = this.rateLimitManager.checkLimit(rateLimitKey);
        if (!rateLimitResult.allowed) {
          return {
            success: false,
            error: 'Rate limit exceeded',
            errorCode: 'RATE_LIMITED'
          };
        }
      }

      // Check session affinity
      if (this.config.sessionAffinity.enabled && request.sessionId) {
        const sessionBackend = this.sessionAffinityManager.getBackend(request.sessionId);
        if (sessionBackend && sessionBackend.status === 'healthy') {
          const latency = Date.now() - startTime;
          this.trafficMetricsManager.recordRequest(
            sessionBackend.id,
            latency,
            true,
            request.clientRegion
          );

          return {
            success: true,
            backend: sessionBackend,
            latency,
            sessionAffinity: true
          };
        }
      }

      // Select backend based on routing policy
      const healthyBackends = this.backendManager.getHealthyBackends();
      const backend = this.router.selectBackend(healthyBackends, request);

      if (!backend) {
        return {
          success: false,
          error: 'No healthy backends available',
          errorCode: 'NO_BACKENDS'
        };
      }

      // Store session affinity
      if (this.config.sessionAffinity.enabled && request.sessionId) {
        this.sessionAffinityManager.storeAffinity(request.sessionId, backend.id);
      }

      // Update backend stats
      this.backendManager.incrementConnections(backend.id);

      const latency = Date.now() - startTime;
      this.trafficMetricsManager.recordRequest(
        backend.id,
        latency,
        true,
        request.clientRegion
      );

      this.emit('request:routed', {
        requestId: request.id,
        backendId: backend.id,
        latency
      });

      return {
        success: true,
        backend,
        latency,
        sessionAffinity: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Routing failed';
      return {
        success: false,
        error: errorMessage,
        errorCode: 'ROUTING_ERROR'
      };
    }
  }

  // Routing Policy
  public setRoutingPolicy(policy: RoutingPolicy): void {
    this.config.routingPolicy = policy;
    this.router.setPolicy(policy);
    this.emit('config:routingPolicyChanged', { policy });
  }

  public getRoutingPolicy(): RoutingPolicy {
    return this.config.routingPolicy;
  }

  // Health Check
  public configureHealthCheck(config: Partial<HealthCheckConfig>): void {
    this.config.healthCheck = { ...this.config.healthCheck, ...config };
    this.healthCheckManager.configure(config);
  }

  // Circuit Breaker
  public enableCircuitBreaker(config?: Partial<CircuitBreakerConfig>): void {
    this.circuitBreakerManager.enable(config);
  }

  public disableCircuitBreaker(): void {
    this.circuitBreakerManager.disable();
  }

  public getCircuitBreakerState(backendId: string): CircuitBreakerInfo | undefined {
    return this.circuitBreakerManager.getState(backendId);
  }

  public recordBackendSuccess(backendId: string): void {
    this.circuitBreakerManager.recordSuccess(backendId);
  }

  public recordBackendFailure(backendId: string): void {
    this.circuitBreakerManager.recordFailure(backendId);
  }

  // Session Affinity
  public configureSessionAffinity(config: Partial<SessionAffinityConfig>): void {
    this.config.sessionAffinity = { ...this.config.sessionAffinity, ...config };
    this.sessionAffinityManager.configure(config);
  }

  // DDoS Protection
  public configureDDoSProtection(config: Partial<DDoSProtectionConfig>): void {
    this.config.ddosProtection = { ...this.config.ddosProtection, ...config };
    this.ddosProtectionManager.configure(config);
  }

  public blockIP(ip: string, duration?: number): void {
    this.ddosProtectionManager.blockIP(ip, duration);
  }

  public unblockIP(ip: string): void {
    this.ddosProtectionManager.unblockIP(ip);
  }

  // Rate Limiting
  public configureRateLimit(config: Partial<RateLimitConfig>): void {
    this.config.rateLimit = { ...this.config.rateLimit, ...config };
    this.rateLimitManager.configure(config);
    this.emit('config:rateLimitChanged', { config: this.config.rateLimit });
  }

  // SSL/TLS
  public configureSSL(config: Partial<SSLConfig>): void {
    this.config.ssl = { ...this.config.ssl, ...config };
    this.sslConfigManager.configure(config);
  }

  public getSSLConfig(): SSLConfig {
    return this.sslConfigManager.getConfig();
  }

  // Traffic Metrics
  public getTrafficMetrics(timeRangeMs: number = 3600000): TrafficMetrics {
    return this.trafficMetricsManager.getMetrics(timeRangeMs);
  }

  // Configuration
  public getConfig(): LoadBalancerConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', { config: this.config });
  }

  // Statistics
  public getStatistics(): LoadBalancerStatistics {
    const backends = this.backendManager.getAllBackends();

    return {
      backends: {
        total: backends.length,
        healthy: backends.filter((b) => b.status === 'healthy').length,
        unhealthy: backends.filter((b) => b.status === 'unhealthy').length,
        draining: backends.filter((b) => b.status === 'draining').length,
        disabled: backends.filter((b) => b.status === 'disabled').length
      },
      circuitBreakers: {
        closed: backends.filter((b) => b.circuitBreaker.state === 'closed').length,
        open: backends.filter((b) => b.circuitBreaker.state === 'open').length,
        halfOpen: backends.filter((b) => b.circuitBreaker.state === 'half-open').length
      },
      sessions: this.sessionAffinityManager.getSessionCount(),
      blockedIPs: this.ddosProtectionManager.getBlockedIPs().size,
      rateLimitBuckets: this.rateLimitManager.getBuckets().size
    };
  }

  public getHealthStatus(): HealthStatus {
    const healthyBackends = this.backendManager.getHealthyBackends().length;
    const totalBackends = this.backendManager.getAllBackends().length;
    const healthy = healthyBackends > 0;

    return {
      healthy,
      healthyBackends,
      totalBackends,
      details: healthy
        ? `${healthyBackends}/${totalBackends} backends healthy`
        : 'No healthy backends available'
    };
  }

  // Shutdown
  public shutdown(): void {
    this.healthCheckManager.stopAllHealthChecks();
    this.maintenanceManager.stopMaintenanceTasks();
    this.emit('loadBalancer:shutdown', {});
  }
}

// Export singleton accessor
export function getGlobalLoadBalancer(
  config?: Partial<LoadBalancerConfig>
): GlobalLoadBalancer {
  return GlobalLoadBalancer.getInstance(config);
}

export default GlobalLoadBalancer;
