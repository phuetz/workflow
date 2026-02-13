/**
 * Service Discovery System
 * Dynamic service registration, discovery, and health monitoring
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

export interface Service {
  id: string;
  name: string;
  version: string;
  type: ServiceType;
  endpoints: ServiceEndpoint[];
  metadata: ServiceMetadata;
  health: HealthStatus;
  status: ServiceStatus;
  tags?: string[];
  dependencies?: string[];
  registeredAt: Date;
  lastHeartbeat: Date;
  lastHealthCheck?: Date;
}

export type ServiceType = 
  | 'api'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'compute'
  | 'gateway'
  | 'proxy'
  | 'custom';

export interface ServiceEndpoint {
  protocol: Protocol;
  host: string;
  port: number;
  path?: string;
  secure?: boolean;
  weight?: number;
  priority?: number;
  zone?: string;
  datacenter?: string;
}

export type Protocol = 'http' | 'https' | 'tcp' | 'udp' | 'grpc' | 'websocket' | 'custom';

export interface ServiceMetadata {
  description?: string;
  owner?: string;
  team?: string;
  environment?: string;
  region?: string;
  datacenter?: string;
  runtime?: string;
  framework?: string;
  capabilities?: string[];
  sla?: SLAConfig;
  custom?: Record<string, any>;
}

export interface SLAConfig {
  availability: number; // percentage
  latencyP50?: number; // milliseconds
  latencyP95?: number;
  latencyP99?: number;
  throughput?: number; // requests per second
}

export interface HealthStatus {
  status: HealthState;
  checks: HealthCheck[];
  lastCheck: Date;
  consecutiveFailures: number;
  uptime: number;
  responseTime?: number;
}

export type HealthState = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheck {
  name: string;
  type: HealthCheckType;
  status: HealthState;
  message?: string;
  duration?: number;
  timestamp: Date;
  details?: any;
}

export type HealthCheckType = 
  | 'ping'
  | 'http'
  | 'tcp'
  | 'script'
  | 'disk'
  | 'memory'
  | 'cpu'
  | 'custom';

export type ServiceStatus = 
  | 'registering'
  | 'active'
  | 'draining'
  | 'maintenance'
  | 'deregistering'
  | 'deregistered';

export interface ServiceInstance {
  serviceId: string;
  instanceId: string;
  endpoint: ServiceEndpoint;
  health: HealthStatus;
  load?: LoadMetrics;
  metadata?: any;
}

export interface LoadMetrics {
  cpu: number;
  memory: number;
  connections: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface ServiceRegistry {
  services: Map<string, Service>;
  instances: Map<string, ServiceInstance[]>;
  watchers: Map<string, ServiceWatcher[]>;
  locks: Map<string, ServiceLock>;
}

export interface ServiceWatcher {
  id: string;
  serviceName: string;
  callback: WatchCallback;
  filters?: WatchFilter;
  active: boolean;
}

export type WatchCallback = (event: WatchEvent) => void;

export interface WatchEvent {
  type: WatchEventType;
  service: Service;
  instance?: ServiceInstance;
  timestamp: Date;
}

export type WatchEventType = 
  | 'service-registered'
  | 'service-updated'
  | 'service-deregistered'
  | 'instance-added'
  | 'instance-removed'
  | 'health-changed';

export interface WatchFilter {
  tags?: string[];
  status?: ServiceStatus[];
  health?: HealthState[];
  metadata?: Record<string, any>;
}

export interface ServiceLock {
  id: string;
  serviceName: string;
  holder: string;
  acquiredAt: Date;
  ttl: number;
  renewable: boolean;
}

export interface ServiceQuery {
  name?: string;
  tags?: string[];
  status?: ServiceStatus[];
  health?: HealthState[];
  type?: ServiceType[];
  metadata?: Record<string, any>;
  datacenter?: string;
  zone?: string;
}

export interface LoadBalancerConfig {
  strategy: LoadBalancerStrategy;
  healthCheck?: HealthCheckConfig;
  stickySession?: StickySessionConfig;
  circuitBreaker?: CircuitBreakerConfig;
  retry?: RetryConfig;
}

export type LoadBalancerStrategy = 
  | 'round-robin'
  | 'least-connections'
  | 'weighted'
  | 'random'
  | 'ip-hash'
  | 'consistent-hash'
  | 'resource-based';

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  path?: string;
  expectedStatus?: number[];
}

export interface StickySessionConfig {
  enabled: boolean;
  cookieName?: string;
  ttl?: number;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  threshold: number;
  timeout: number;
  halfOpenRequests: number;
}

export interface RetryConfig {
  maxAttempts: number;
  backoff: 'exponential' | 'linear' | 'constant';
  initialDelay: number;
  maxDelay?: number;
}

export interface ServiceMesh {
  services: Map<string, MeshService>;
  policies: TrafficPolicy[];
  observability: ObservabilityConfig;
}

export interface MeshService {
  service: Service;
  virtualService?: VirtualService;
  destinationRule?: DestinationRule;
  serviceEntry?: ServiceEntry;
}

export interface VirtualService {
  hosts: string[];
  http?: HttpRoute[];
  tcp?: TcpRoute[];
  tls?: TlsRoute[];
}

export interface HttpRoute {
  match?: HttpMatchRequest[];
  route: RouteDestination[];
  redirect?: HttpRedirect;
  rewrite?: HttpRewrite;
  timeout?: number;
  retries?: RetryPolicy;
  fault?: FaultInjection;
  mirror?: Destination;
}

export interface HttpMatchRequest {
  uri?: StringMatch;
  headers?: Record<string, StringMatch>;
  method?: StringMatch;
  queryParams?: Record<string, StringMatch>;
}

export interface StringMatch {
  exact?: string;
  prefix?: string;
  regex?: string;
}

export interface RouteDestination {
  destination: Destination;
  weight?: number;
  headers?: HeaderOperations;
}

export interface Destination {
  host: string;
  subset?: string;
  port?: number;
}

export interface HeaderOperations {
  set?: Record<string, string>;
  add?: Record<string, string>;
  remove?: string[];
}

export interface HttpRedirect {
  uri?: string;
  authority?: string;
  redirectCode?: number;
}

export interface HttpRewrite {
  uri?: string;
  authority?: string;
}

export interface RetryPolicy {
  attempts: number;
  perTryTimeout?: number;
  retryOn?: string;
}

export interface FaultInjection {
  delay?: DelayFault;
  abort?: AbortFault;
}

export interface DelayFault {
  percentage: number;
  fixedDelay: number;
}

export interface AbortFault {
  percentage: number;
  httpStatus: number;
}

export interface TcpRoute {
  match?: L4MatchAttributes[];
  route: RouteDestination[];
}

export interface L4MatchAttributes {
  destinationSubnets?: string[];
  port?: number;
  sourceLabels?: Record<string, string>;
}

export interface TlsRoute {
  match?: TlsMatchAttributes[];
  route: RouteDestination[];
}

export interface TlsMatchAttributes {
  sniHosts: string[];
  destinationSubnets?: string[];
  port?: number;
}

export interface DestinationRule {
  host: string;
  trafficPolicy?: TrafficPolicy;
  subsets?: Subset[];
}

export interface TrafficPolicy {
  loadBalancer?: LoadBalancerSettings;
  connectionPool?: ConnectionPoolSettings;
  outlierDetection?: OutlierDetection;
  tls?: TlsConfig;
}

export interface LoadBalancerSettings {
  simple?: LoadBalancerStrategy;
  consistentHash?: ConsistentHashLB;
}

export interface ConsistentHashLB {
  httpHeaderName?: string;
  httpCookie?: HttpCookie;
  useSourceIp?: boolean;
  minimumRingSize?: number;
}

export interface HttpCookie {
  name: string;
  path?: string;
  ttl: number;
}

export interface ConnectionPoolSettings {
  tcp?: TcpSettings;
  http?: HttpSettings;
}

export interface TcpSettings {
  maxConnections?: number;
  connectTimeout?: number;
}

export interface HttpSettings {
  http1MaxPendingRequests?: number;
  http2MaxRequests?: number;
  maxRequestsPerConnection?: number;
  maxRetries?: number;
  idleTimeout?: number;
}

export interface OutlierDetection {
  consecutiveErrors?: number;
  interval?: number;
  baseEjectionTime?: number;
  maxEjectionPercent?: number;
  minHealthPercent?: number;
  splitExternalLocalOriginErrors?: boolean;
}

export interface TlsConfig {
  mode: TlsMode;
  clientCertificate?: string;
  privateKey?: string;
  caCertificates?: string;
  sni?: string;
}

export type TlsMode = 'DISABLE' | 'SIMPLE' | 'MUTUAL' | 'ISTIO_MUTUAL';

export interface Subset {
  name: string;
  labels: Record<string, string>;
  trafficPolicy?: TrafficPolicy;
}

export interface ServiceEntry {
  hosts: string[];
  ports: Port[];
  location: 'MESH_EXTERNAL' | 'MESH_INTERNAL';
  resolution: 'NONE' | 'STATIC' | 'DNS';
  endpoints?: WorkloadEntry[];
}

export interface Port {
  number: number;
  protocol: string;
  name: string;
}

export interface WorkloadEntry {
  address: string;
  ports?: Record<string, number>;
  labels?: Record<string, string>;
  weight?: number;
}

export interface ObservabilityConfig {
  metrics: MetricsConfig;
  tracing: TracingConfig;
  logging: LoggingConfig;
}

export interface MetricsConfig {
  enabled: boolean;
  providers: string[];
  interval: number;
}

export interface TracingConfig {
  enabled: boolean;
  provider: string;
  samplingRate: number;
}

export interface LoggingConfig {
  enabled: boolean;
  level: string;
  format: string;
}

export interface ServiceDiscoveryMetrics {
  totalServices: number;
  totalInstances: number;
  healthyInstances: number;
  unhealthyInstances: number;
  registrationsPerMinute: number;
  deregistrationsPerMinute: number;
  healthChecksPerMinute: number;
  averageResponseTime: number;
  discoveryLatency: number;
}

export class ServiceDiscoverySystem extends EventEmitter {
  private registry: ServiceRegistry;
  private mesh: ServiceMesh;
  private healthCheckers: Map<string, HealthChecker> = new Map();
  private loadBalancers: Map<string, LoadBalancer> = new Map();
  private leaderElection: LeaderElection;
  private consensus: ConsensusProtocol;
  private metrics: ServiceDiscoveryMetrics;
  private config: ServiceDiscoveryConfig;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<ServiceDiscoveryConfig>) {
    super();
    this.config = {
      heartbeatInterval: 10000, // 10 seconds
      healthCheckInterval: 30000, // 30 seconds
      deregistrationTimeout: 60000, // 1 minute
      enableServiceMesh: true,
      enableHealthChecks: true,
      enableLoadBalancing: true,
      replicationFactor: 3,
      consensusAlgorithm: 'raft',
      ...config
    };

    this.registry = {
      services: new Map(),
      instances: new Map(),
      watchers: new Map(),
      locks: new Map()
    };

    this.mesh = {
      services: new Map(),
      policies: [],
      observability: {
        metrics: { enabled: true, providers: ['prometheus'], interval: 60000 },
        tracing: { enabled: true, provider: 'jaeger', samplingRate: 0.1 },
        logging: { enabled: true, level: 'info', format: 'json' }
      }
    };

    this.leaderElection = new LeaderElection();
    this.consensus = new ConsensusProtocol(this.config.consensusAlgorithm);
    this.metrics = this.createEmptyMetrics();
    this.initialize();
  }

  /**
   * Initialize service discovery system
   */
  private initialize(): void {
    // Start health checking
    if (this.config.enableHealthChecks) {
      this.startHealthChecking();
    }

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    // Start background processes
    this.startBackgroundProcesses();

    logger.debug('Service Discovery System initialized');
  }

  /**
   * Register service
   */
  async registerService(
    name: string,
    version: string,
    endpoints: ServiceEndpoint[],
    options?: {
      type?: ServiceType;
      metadata?: ServiceMetadata;
      tags?: string[];
      dependencies?: string[];
      healthCheck?: HealthCheckConfig;
    }
  ): Promise<Service> {
    // Create service
    const service: Service = {
      id: this.generateServiceId(),
      name,
      version,
      type: options?.type || 'api',
      endpoints,
      metadata: options?.metadata || {},
      health: {
        status: 'unknown',
        checks: [],
        lastCheck: new Date(),
        consecutiveFailures: 0,
        uptime: 0
      },
      status: 'registering',
      tags: options?.tags,
      dependencies: options?.dependencies,
      registeredAt: new Date(),
      lastHeartbeat: new Date()
    };

    // Register with consensus
    await this.consensus.propose('register', service);

    // Store service
    this.registry.services.set(service.id, service);

    // Create instances
    const instances: ServiceInstance[] = endpoints.map(endpoint => ({
      serviceId: service.id,
      instanceId: this.generateInstanceId(),
      endpoint,
      health: service.health
    }));

    this.registry.instances.set(service.id, instances);

    // Set up health checking
    if (options?.healthCheck) {
      this.setupHealthCheck(service, options.healthCheck);
    }

    // Update status
    service.status = 'active';

    // Notify watchers
    this.notifyWatchers(service.name, {
      type: 'service-registered',
      service,
      timestamp: new Date()
    });

    // Update metrics
    this.metrics.totalServices++;
    this.metrics.totalInstances += instances.length;

    this.emit('service:registered', service);
    return service;
  }

  /**
   * Deregister service
   */
  async deregisterService(serviceId: string): Promise<void> {
    const service = this.registry.services.get(serviceId);
    
    if (!service) {
      throw new Error('Service not found');
    }

    service.status = 'deregistering';

    // Remove health checker
    const healthChecker = this.healthCheckers.get(serviceId);
    if (healthChecker) {
      healthChecker.stop();
      this.healthCheckers.delete(serviceId);
    }

    // Remove from consensus
    await this.consensus.propose('deregister', { serviceId });

    // Remove instances
    this.registry.instances.delete(serviceId);

    // Remove service
    this.registry.services.delete(serviceId);

    // Notify watchers
    this.notifyWatchers(service.name, {
      type: 'service-deregistered',
      service,
      timestamp: new Date()
    });

    // Update metrics
    this.metrics.totalServices--;
    this.metrics.deregistrationsPerMinute++;

    this.emit('service:deregistered', service);
  }

  /**
   * Discover services
   */
  async discoverServices(query?: ServiceQuery): Promise<Service[]> {
    let services = Array.from(this.registry.services.values());

    if (query) {
      // Filter by name
      if (query.name) {
        services = services.filter(s => s.name === query.name);
      }

      // Filter by tags
      if (query.tags?.length) {
        services = services.filter(s => 
          query.tags!.every(tag => s.tags?.includes(tag))
        );
      }

      // Filter by status
      if (query.status?.length) {
        services = services.filter(s => query.status!.includes(s.status));
      }

      // Filter by health
      if (query.health?.length) {
        services = services.filter(s => query.health!.includes(s.health.status));
      }

      // Filter by type
      if (query.type?.length) {
        services = services.filter(s => query.type!.includes(s.type));
      }

      // Filter by metadata
      if (query.metadata) {
        services = services.filter(s => 
          Object.entries(query.metadata!).every(([key, value]) => 
            s.metadata.custom?.[key] === value
          )
        );
      }

      // Filter by datacenter
      if (query.datacenter) {
        services = services.filter(s => 
          s.metadata.datacenter === query.datacenter ||
          s.endpoints.some(e => e.datacenter === query.datacenter)
        );
      }

      // Filter by zone
      if (query.zone) {
        services = services.filter(s => 
          s.endpoints.some(e => e.zone === query.zone)
        );
      }
    }

    return services;
  }

  /**
   * Get service instances
   */
  async getServiceInstances(
    serviceName: string,
    healthy = true
  ): Promise<ServiceInstance[]> {
    const services = await this.discoverServices({ name: serviceName });
    
    if (services.length === 0) {
      return [];
    }

    let instances: ServiceInstance[] = [];
    
    for (const service of services) {
      const serviceInstances = this.registry.instances.get(service.id) || [];
      
      if (healthy) {
        instances = instances.concat(
          serviceInstances.filter(i => i.health.status === 'healthy')
        );
      } else {
        instances = instances.concat(serviceInstances);
      }
    }

    return instances;
  }

  /**
   * Watch service changes
   */
  watchService(
    serviceName: string,
    callback: WatchCallback,
    filters?: WatchFilter
  ): string {
    const watcher: ServiceWatcher = {
      id: this.generateWatcherId(),
      serviceName,
      callback,
      filters,
      active: true
    };

    if (!this.registry.watchers.has(serviceName)) {
      this.registry.watchers.set(serviceName, []);
    }

    this.registry.watchers.get(serviceName)!.push(watcher);

    this.emit('watcher:created', watcher);
    return watcher.id;
  }

  /**
   * Unwatch service
   */
  unwatchService(watcherId: string): void {
    for (const [serviceName, watchers] of this.registry.watchers) {
      const index = watchers.findIndex(w => w.id === watcherId);
      if (index !== -1) {
        watchers.splice(index, 1);
        if (watchers.length === 0) {
          this.registry.watchers.delete(serviceName);
        }
        break;
      }
    }
  }

  /**
   * Create load balancer
   */
  createLoadBalancer(
    serviceName: string,
    config: LoadBalancerConfig
  ): string {
    const loadBalancer = new LoadBalancer(serviceName, config);
    const id = this.generateLoadBalancerId();
    
    this.loadBalancers.set(id, loadBalancer);
    
    // Watch for service changes
    this.watchService(serviceName, (event) => {
      loadBalancer.updateInstances(this.registry.instances.get(event.service.id) || []);
    });

    this.emit('loadbalancer:created', { id, serviceName, config });
    return id;
  }

  /**
   * Get next instance from load balancer
   */
  async getNextInstance(loadBalancerId: string): Promise<ServiceInstance | null> {
    const loadBalancer = this.loadBalancers.get(loadBalancerId);
    
    if (!loadBalancer) {
      throw new Error('Load balancer not found');
    }

    return loadBalancer.next();
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(
    serviceName: string,
    holder: string,
    ttl = 30000
  ): Promise<ServiceLock | null> {
    // Check if lock exists
    const existingLock = this.registry.locks.get(serviceName);
    
    if (existingLock && Date.now() - existingLock.acquiredAt.getTime() < existingLock.ttl) {
      return null; // Lock is held by someone else
    }

    // Acquire lock through consensus
    const lock: ServiceLock = {
      id: this.generateLockId(),
      serviceName,
      holder,
      acquiredAt: new Date(),
      ttl,
      renewable: true
    };

    const acquired = await this.consensus.propose('acquire-lock', lock);
    
    if (acquired) {
      this.registry.locks.set(serviceName, lock);
      
      // Auto-release after TTL
      setTimeout(() => {
        this.releaseLock(serviceName, holder);
      }, ttl);

      this.emit('lock:acquired', lock);
      return lock;
    }

    return null;
  }

  /**
   * Release distributed lock
   */
  async releaseLock(serviceName: string, holder: string): Promise<void> {
    const lock = this.registry.locks.get(serviceName);
    
    if (lock && lock.holder === holder) {
      await this.consensus.propose('release-lock', { serviceName });
      this.registry.locks.delete(serviceName);
      this.emit('lock:released', lock);
    }
  }

  /**
   * Create virtual service for service mesh
   */
  createVirtualService(
    serviceName: string,
    virtualService: VirtualService
  ): void {
    const service = Array.from(this.registry.services.values())
      .find(s => s.name === serviceName);
    
    if (!service) {
      throw new Error('Service not found');
    }

    let meshService = this.mesh.services.get(service.id);
    
    if (!meshService) {
      meshService = { service };
      this.mesh.services.set(service.id, meshService);
    }

    meshService.virtualService = virtualService;
    this.emit('virtualservice:created', { serviceName, virtualService });
  }

  /**
   * Create destination rule for service mesh
   */
  createDestinationRule(
    serviceName: string,
    destinationRule: DestinationRule
  ): void {
    const service = Array.from(this.registry.services.values())
      .find(s => s.name === serviceName);
    
    if (!service) {
      throw new Error('Service not found');
    }

    let meshService = this.mesh.services.get(service.id);
    
    if (!meshService) {
      meshService = { service };
      this.mesh.services.set(service.id, meshService);
    }

    meshService.destinationRule = destinationRule;
    this.emit('destinationrule:created', { serviceName, destinationRule });
  }

  /**
   * Health check service
   */
  private async performHealthCheck(service: Service): Promise<void> {
    const checks: HealthCheck[] = [];
    let overallStatus: HealthState = 'healthy';

    for (const endpoint of service.endpoints) {
      const check = await this.checkEndpointHealth(endpoint);
      checks.push(check);
      
      if (check.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (check.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }

    // Update health status
    const previousStatus = service.health.status;
    service.health = {
      status: overallStatus,
      checks,
      lastCheck: new Date(),
      consecutiveFailures: overallStatus === 'unhealthy' 
        ? service.health.consecutiveFailures + 1 
        : 0,
      uptime: service.health.uptime + (Date.now() - service.registeredAt.getTime())
    };

    // Update instance health
    const instances = this.registry.instances.get(service.id);
    if (instances) {
      instances.forEach(instance => {
        instance.health = service.health;
      });
    }

    // Notify if health changed
    if (previousStatus !== overallStatus) {
      this.notifyWatchers(service.name, {
        type: 'health-changed',
        service,
        timestamp: new Date()
      });
    }

    // Update metrics
    if (overallStatus === 'healthy') {
      this.metrics.healthyInstances++;
    } else {
      this.metrics.unhealthyInstances++;
    }
    this.metrics.healthChecksPerMinute++;
  }

  /**
   * Check endpoint health
   */
  private async checkEndpointHealth(endpoint: ServiceEndpoint): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simulate health check based on protocol
      const isHealthy = Math.random() > 0.1; // 90% healthy
      
      return {
        name: `${endpoint.protocol}://${endpoint.host}:${endpoint.port}`,
        type: endpoint.protocol === 'http' || endpoint.protocol === 'https' ? 'http' : 'tcp',
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Service is responsive' : 'Service is not responding',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: `${endpoint.protocol}://${endpoint.host}:${endpoint.port}`,
        type: 'ping',
        status: 'unhealthy',
        message: (error as Error).message,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Setup health check for service
   */
  private setupHealthCheck(service: Service, config: HealthCheckConfig): void {
    const healthChecker = new HealthChecker(service, config);
    
    healthChecker.on('health-check', async () => {
      await this.performHealthCheck(service);
    });

    healthChecker.start();
    this.healthCheckers.set(service.id, healthChecker);
  }

  /**
   * Notify watchers
   */
  private notifyWatchers(serviceName: string, event: WatchEvent): void {
    const watchers = this.registry.watchers.get(serviceName) || [];
    
    for (const watcher of watchers) {
      if (!watcher.active) continue;

      // Apply filters
      if (watcher.filters) {
        if (watcher.filters.status && !watcher.filters.status.includes(event.service.status)) {
          continue;
        }
        if (watcher.filters.health && !watcher.filters.health.includes(event.service.health.status)) {
          continue;
        }
        if (watcher.filters.tags && !watcher.filters.tags.every(tag => event.service.tags?.includes(tag))) {
          continue;
        }
      }

      watcher.callback(event);
    }
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    setInterval(() => {
      for (const service of this.registry.services.values()) {
        if (service.status === 'active') {
          this.performHealthCheck(service);
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const service of this.registry.services.values()) {
        const timeSinceHeartbeat = now - service.lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat > this.config.deregistrationTimeout) {
          // Auto-deregister stale service
          this.deregisterService(service.id);
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Send heartbeat
   */
  async sendHeartbeat(serviceId: string): Promise<void> {
    const service = this.registry.services.get(serviceId);
    
    if (service) {
      service.lastHeartbeat = new Date();
      await this.consensus.propose('heartbeat', { serviceId });
    }
  }

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    // Update metrics
    setInterval(() => {
      this.updateMetrics();
    }, 60000);

    // Cleanup stale watchers
    setInterval(() => {
      this.cleanupStaleWatchers();
    }, 300000);
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.totalServices = this.registry.services.size;
    this.metrics.totalInstances = Array.from(this.registry.instances.values())
      .reduce((sum, instances) => sum + instances.length, 0);
    
    // Calculate average response time
    let totalResponseTime = 0;
    let count = 0;
    
    for (const service of this.registry.services.values()) {
      if (service.health.responseTime) {
        totalResponseTime += service.health.responseTime;
        count++;
      }
    }
    
    this.metrics.averageResponseTime = count > 0 ? totalResponseTime / count : 0;
  }

  /**
   * Cleanup stale watchers
   */
  private cleanupStaleWatchers(): void {
    for (const [serviceName, watchers] of this.registry.watchers) {
      const activeWatchers = watchers.filter(w => w.active);
      
      if (activeWatchers.length === 0) {
        this.registry.watchers.delete(serviceName);
      } else {
        this.registry.watchers.set(serviceName, activeWatchers);
      }
    }
  }

  /**
   * ID generators
   */
  private generateServiceId(): string {
    return `svc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateInstanceId(): string {
    return `inst_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateWatcherId(): string {
    return `watch_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateLoadBalancerId(): string {
    return `lb_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateLockId(): string {
    return `lock_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private createEmptyMetrics(): ServiceDiscoveryMetrics {
    return {
      totalServices: 0,
      totalInstances: 0,
      healthyInstances: 0,
      unhealthyInstances: 0,
      registrationsPerMinute: 0,
      deregistrationsPerMinute: 0,
      healthChecksPerMinute: 0,
      averageResponseTime: 0,
      discoveryLatency: 0
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): ServiceDiscoveryMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    // Stop health checkers
    for (const healthChecker of this.healthCheckers.values()) {
      healthChecker.stop();
    }

    // Clear timers
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }

    this.removeAllListeners();
    logger.debug('Service Discovery System shut down');
  }
}

// Helper classes
class HealthChecker extends EventEmitter {
  private service: Service;
  private config: HealthCheckConfig;
  private timer?: NodeJS.Timeout;

  constructor(service: Service, config: HealthCheckConfig) {
    super();
    this.service = service;
    this.config = config;
  }

  start(): void {
    if (this.config.enabled) {
      this.timer = setInterval(() => {
        this.emit('health-check');
      }, this.config.interval);
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

class LoadBalancer {
  private serviceName: string;
  private config: LoadBalancerConfig;
  private instances: ServiceInstance[] = [];
  private currentIndex = 0;
  private connections: Map<string, number> = new Map();

  constructor(serviceName: string, config: LoadBalancerConfig) {
    this.serviceName = serviceName;
    this.config = config;
  }

  updateInstances(instances: ServiceInstance[]): void {
    this.instances = instances.filter(i => i.health.status === 'healthy');
  }

  next(): ServiceInstance | null {
    if (this.instances.length === 0) {
      return null;
    }

    switch (this.config.strategy) {
      case 'round-robin':
        return this.roundRobin();
      case 'least-connections':
        return this.leastConnections();
      case 'weighted':
        return this.weighted();
      case 'random':
        return this.random();
      default:
        return this.roundRobin();
    }
  }

  private roundRobin(): ServiceInstance {
    const instance = this.instances[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.instances.length;
    return instance;
  }

  private leastConnections(): ServiceInstance {
    let minConnections = Infinity;
    let selectedInstance = this.instances[0];

    for (const instance of this.instances) {
      const connections = this.connections.get(instance.instanceId) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedInstance = instance;
      }
    }

    return selectedInstance;
  }

  private weighted(): ServiceInstance {
    const totalWeight = this.instances.reduce((sum, i) => 
      sum + (i.endpoint.weight || 1), 0
    );
    
    let random = Math.random() * totalWeight;
    
    for (const instance of this.instances) {
      random -= (instance.endpoint.weight || 1);
      if (random <= 0) {
        return instance;
      }
    }
    
    return this.instances[0];
  }

  private random(): ServiceInstance {
    const index = Math.floor(Math.random() * this.instances.length);
    return this.instances[index];
  }
}

class LeaderElection {
  private isLeader = false;
  private term = 0;

  async elect(): Promise<boolean> {
    // Simplified leader election
    this.term++;
    this.isLeader = Math.random() > 0.5;
    return this.isLeader;
  }

  getLeader(): boolean {
    return this.isLeader;
  }
}

class ConsensusProtocol {
  private algorithm: string;

  constructor(algorithm: string) {
    this.algorithm = algorithm;
  }

  async propose(operation: string, data: any): Promise<boolean> {
    // Simplified consensus - in production would use Raft or Paxos
    return true;
  }
}

// Configuration interface
interface ServiceDiscoveryConfig {
  heartbeatInterval: number;
  healthCheckInterval: number;
  deregistrationTimeout: number;
  enableServiceMesh: boolean;
  enableHealthChecks: boolean;
  enableLoadBalancing: boolean;
  replicationFactor: number;
  consensusAlgorithm: string;
}

// Export singleton instance
export const serviceDiscoverySystem = new ServiceDiscoverySystem();