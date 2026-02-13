import { EventEmitter } from 'events';
// import { APIDefinition } from '../gateway/APIGateway'; // Currently unused

export interface APIService {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'rest' | 'graphql' | 'grpc' | 'websocket' | 'soap';
  status: 'active' | 'inactive' | 'deprecated' | 'maintenance';
  endpoints: Array<{
    name: string;
    path: string;
    method?: string;
    description: string;
    deprecated?: boolean;
  }>;
  health: {
    status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
    lastCheck?: Date;
    uptime?: number;
    responseTime?: number;
    errorRate?: number;
  };
  metadata: {
    owner: string;
    team: string;
    contact: string;
    repository?: string;
    documentation?: string;
    tags: string[];
    category: string;
    businessDomain: string;
  };
  deployment: {
    environment: string;
    region: string;
    instances: Array<{
      id: string;
      host: string;
      port: number;
      healthy: boolean;
      lastHeartbeat?: Date;
      metadata?: unknown;
    }>;
    loadBalancer?: {
      type: 'round-robin' | 'least-connections' | 'weighted';
      healthCheck: boolean;
    };
  };
  dependencies: Array<{
    serviceId: string;
    type: 'sync' | 'async' | 'database' | 'cache' | 'external';
    critical: boolean;
    fallback?: string;
  }>;
  metrics: {
    requests: {
      total: number;
      success: number;
      error: number;
      rate: number; // per second
    };
    latency: {
      p50: number;
      p95: number;
      p99: number;
      avg: number;
    };
    resources: {
      cpu: number;
      memory: number;
      disk: number;
    };
  };
  sla: {
    availability: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  security: {
    authentication: string[];
    authorization: string[];
    encryption: boolean;
    compliance: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  registeredBy: string;
}

export interface ServiceDependency {
  id: string;
  consumer: string;
  provider: string;
  type: 'sync' | 'async' | 'database' | 'cache' | 'external';
  protocol: string;
  endpoint?: string;
  critical: boolean;
  fallback?: {
    type: 'service' | 'cache' | 'static';
    config: unknown;
  };
  circuit: {
    enabled: boolean;
    threshold: number;
    timeout: number;
    resetTimeout: number;
    state: 'closed' | 'open' | 'half-open';
  };
  monitoring: {
    enabled: boolean;
    alerts: Array<{
      condition: string;
      threshold: number;
      action: string;
    }>;
  };
  createdAt: Date;
  lastUsed?: Date;
}

export interface ServiceTopology {
  services: APIService[];
  dependencies: ServiceDependency[];
  layers: Array<{
    name: string;
    services: string[];
    type: 'presentation' | 'business' | 'data' | 'integration';
  }>;
  domains: Array<{
    name: string;
    services: string[];
    boundaries: {
      contexts: string[];
      aggregates: string[];
    };
  }>;
  patterns: Array<{
    name: string;
    type: 'gateway' | 'proxy' | 'circuit-breaker' | 'bulkhead' | 'saga';
    services: string[];
    config: unknown;
  }>;
}

export interface ServiceCatalog {
  id: string;
  name: string;
  description: string;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    services: string[];
    subcategories?: Array<{
      id: string;
      name: string;
      services: string[];
    }>;
  }>;
  templates: Array<{
    id: string;
    name: string;
    type: string;
    template: APIService;
    variables: Array<{
      name: string;
      type: string;
      required: boolean;
      default?: unknown;
    }>;
  }>;
  policies: Array<{
    id: string;
    name: string;
    scope: 'catalog' | 'category' | 'service';
    rules: unknown[];
    enforcement: 'advisory' | 'mandatory';
  }>;
  governance: {
    approvalRequired: boolean;
    reviewers: string[];
    lifecycle: {
      stages: string[];
      transitions: Array<{
        from: string;
        to: string;
        conditions: string[];
      }>;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistryConfig {
  discovery: {
    enabled: boolean;
    protocol: 'consul' | 'etcd' | 'eureka' | 'kubernetes' | 'dns';
    config: unknown;
    interval: number; // seconds
  };
  healthCheck: {
    enabled: boolean;
    interval: number; // seconds
    timeout: number; // seconds
    retries: number;
    gracePeriod: number; // seconds
    endpoints: Array<{
      path: string;
      method: string;
      expectedStatus: number[];
    }>;
  };
  versioning: {
    strategy: 'semantic' | 'timestamp' | 'sequential';
    compatibility: {
      backward: boolean;
      forward: boolean;
    };
    deprecation: {
      warningPeriod: number; // days
      supportPeriod: number; // days
    };
  };
  security: {
    registration: {
      authentication: boolean;
      authorization: string[];
    };
    discovery: {
      filtering: boolean;
      permissions: string[];
    };
  };
  monitoring: {
    metrics: {
      enabled: boolean;
      retention: number; // days
      aggregation: string[];
    };
    alerting: {
      enabled: boolean;
      channels: string[];
      rules: Array<{
        condition: string;
        threshold: number;
        severity: string;
      }>;
    };
  };
  storage: {
    backend: 'memory' | 'redis' | 'database' | 'consul';
    config: unknown;
    backup: {
      enabled: boolean;
      frequency: string;
      retention: number;
    };
  };
}

export class APIRegistry extends EventEmitter {
  private config: RegistryConfig;
  private services: Map<string, APIService> = new Map();
  private dependencies: Map<string, ServiceDependency> = new Map();
  private catalogs: Map<string, ServiceCatalog> = new Map();
  private topology: ServiceTopology | null = null;
  private healthChecker: unknown;
  private discoveryAgent: unknown;
  private metrics: Map<string, unknown> = new Map();
  private isInitialized = false;

  constructor(config: RegistryConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize storage backend
      await this.initializeStorage();

      // Start discovery agent
      if (this.config.discovery.enabled) {
        await this.startDiscoveryAgent();
      }

      // Start health checker
      if (this.config.healthCheck.enabled) {
        await this.startHealthChecker();
      }

      // Load existing data
      await this.loadPersistedData();

      // Build initial topology
      await this.buildTopology();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async registerService(
    serviceSpec: Omit<APIService, 'id' | 'health' | 'metrics' | 'createdAt' | 'updatedAt'>,
    registrantId: string
  ): Promise<string> {
    const serviceId = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const service: APIService = {
      ...serviceSpec,
      id: serviceId,
      health: {
        status: 'unknown'
      },
      metrics: {
        requests: { total: 0, success: 0, error: 0, rate: 0 },
        latency: { p50: 0, p95: 0, p99: 0, avg: 0 },
        resources: { cpu: 0, memory: 0, disk: 0 }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      registeredBy: registrantId
    };

    // Validate service
    this.validateService(service);

    this.services.set(serviceId, service);

    // Start health monitoring
    if (this.config.healthCheck.enabled) {
      await this.startServiceHealthMonitoring(service);
    }

    // Update topology
    await this.updateTopology();

    // Notify discovery
    if (this.discoveryAgent) {
      await this.discoveryAgent.announce(service);
    }

    this.emit('serviceRegistered', { service });
    return serviceId;
  }

  public async updateService(
    serviceId: string,
    updates: Partial<APIService>
  ): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const previousVersion = { ...service };

    // Apply updates
    Object.assign(service, updates, {
      updatedAt: new Date()
    });

    // Validate updated service
    this.validateService(service);

    // Check for breaking changes
    const breaking = this.detectBreakingChanges(previousVersion, service);
    if (breaking.length > 0) {
      this.emit('breakingChanges', { serviceId, changes: breaking });
    }

    // Update topology if structure changed
    if (this.structureChanged(previousVersion, service)) {
      await this.updateTopology();
    }

    // Notify discovery
    if (this.discoveryAgent) {
      await this.discoveryAgent.update(service);
    }

    this.emit('serviceUpdated', { serviceId, updates, breaking });
  }

  public async deregisterService(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    // Check for dependent services
    const dependents = this.findDependentServices(serviceId);
    if (dependents.length > 0) {
      this.emit('serviceHasDependents', { 
        serviceId, 
        dependents: dependents.map(d => d.id) 
      });
    }

    // Remove service
    this.services.delete(serviceId);

    // Remove dependencies
    for (const [depId, dependency] of this.dependencies.entries()) {
      if (dependency.consumer === serviceId || dependency.provider === serviceId) {
        this.dependencies.delete(depId);
      }
    }

    // Update topology
    await this.updateTopology();

    // Notify discovery
    if (this.discoveryAgent) {
      await this.discoveryAgent.remove(serviceId);
    }

    this.emit('serviceDeregistered', { serviceId, service });
  }

  public async discoverServices(
    query?: {
      type?: APIService['type'];
      status?: APIService['status'];
      tags?: string[];
      domain?: string;
      environment?: string;
    }
  ): Promise<APIService[]> {
    let services = Array.from(this.services.values());

    if (query?.type) {
      services = services.filter(s => s.type === query.type);
    }

    if (query?.status) {
      services = services.filter(s => s.status === query.status);
    }

    if (query?.tags) {
      services = services.filter(s => 
        query.tags!.some(tag => s.metadata.tags.includes(tag))
      );
    }

    if (query?.domain) {
      services = services.filter(s => s.metadata.businessDomain === query.domain);
    }

    if (query?.environment) {
      services = services.filter(s => s.deployment.environment === query.environment);
    }

    return services;
  }

  public async createDependency(
    dependencySpec: Omit<ServiceDependency, 'id' | 'createdAt' | 'lastUsed'>
  ): Promise<string> {
    const depId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dependency: ServiceDependency = {
      ...dependencySpec,
      id: depId,
      createdAt: new Date()
    };

    // Validate dependency
    if (!this.services.has(dependency.consumer) || 
        !this.services.has(dependency.provider)) {
      throw new Error('Both consumer and provider services must be registered');
    }

    // Check for circular dependencies
    if (this.createsCyclicDependency(dependency)) {
      throw new Error('Dependency would create a cycle');
    }

    this.dependencies.set(depId, dependency);

    // Update topology
    await this.updateTopology();

    this.emit('dependencyCreated', { dependency });
    return depId;
  }

  public async createCatalog(
    catalogSpec: Omit<ServiceCatalog, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const catalogId = `catalog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const catalog: ServiceCatalog = {
      ...catalogSpec,
      id: catalogId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.catalogs.set(catalogId, catalog);
    this.emit('catalogCreated', { catalog });
    
    return catalogId;
  }

  public async getServiceHealth(serviceId: string): Promise<{
    status: APIService['health']['status'];
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      timestamp: Date;
      output?: string;
    }>;
    dependencies: Array<{
      serviceId: string;
      status: string;
      critical: boolean;
    }>;
  }> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    // Get service dependencies and their health
    const serviceDeps = Array.from(this.dependencies.values())
      .filter(dep => dep.consumer === serviceId)
      .map(dep => ({
        serviceId: dep.provider,
        status: this.services.get(dep.provider)?.health.status || 'unknown',
        critical: dep.critical
      }));

    // Mock health checks
    const checks = [
      {
        name: 'http',
        status: service.health.status === 'healthy' ? 'pass' as const : 'fail' as const,
        timestamp: new Date(),
        output: service.health.status === 'healthy' ? 'OK' : 'Service unreachable'
      },
      {
        name: 'database',
        status: 'pass' as const,
        timestamp: new Date(),
        output: 'Connection pool healthy'
      }
    ];

    return {
      status: service.health.status,
      checks,
      dependencies: serviceDeps
    };
  }

  public async getTopology(): Promise<ServiceTopology> {
    if (!this.topology) {
      await this.buildTopology();
    }
    return this.topology!;
  }

  public async generateServiceMap(options?: {
    focus?: string;
    depth?: number;
    includeExternal?: boolean;
  }): Promise<{
    nodes: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      layer: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: string;
      critical: boolean;
    }>;
  }> {
    const nodes = Array.from(this.services.values()).map(service => ({
      id: service.id,
      name: service.name,
      type: service.type,
      status: service.status,
      layer: this.determineServiceLayer(service)
    }));

    const edges = Array.from(this.dependencies.values()).map(dep => ({
      source: dep.consumer,
      target: dep.provider,
      type: dep.type,
      critical: dep.critical
    }));

    // Apply focus and depth filtering if specified
    if (options?.focus) {
      const filteredGraph = this.filterGraphByFocus(
        { nodes, edges }, 
        options.focus, 
        options.depth || 2
      );
      return filteredGraph;
    }

    return { nodes, edges };
  }

  public async getServiceMetrics(
    serviceId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    requests: Array<{ timestamp: Date; count: number; errors: number }>;
    latency: Array<{ timestamp: Date; p50: number; p95: number; p99: number }>;
    availability: Array<{ timestamp: Date; uptime: number }>;
    dependencies: Array<{
      serviceId: string;
      healthy: boolean;
      responseTime: number;
    }>;
  }> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    // Mock metrics generation
    const metrics = {
      requests: this.generateRequestMetrics(period),
      latency: this.generateLatencyMetrics(period),
      availability: this.generateAvailabilityMetrics(period),
      dependencies: this.getDependencyMetrics(serviceId)
    };

    return metrics;
  }

  public getService(id: string): APIService | undefined {
    return this.services.get(id);
  }

  public getServices(filters?: {
    status?: APIService['status'];
    type?: APIService['type'];
    environment?: string;
  }): APIService[] {
    let services = Array.from(this.services.values());

    if (filters?.status) {
      services = services.filter(s => s.status === filters.status);
    }

    if (filters?.type) {
      services = services.filter(s => s.type === filters.type);
    }

    if (filters?.environment) {
      services = services.filter(s => s.deployment.environment === filters.environment);
    }

    return services;
  }

  public getDependencies(serviceId?: string): ServiceDependency[] {
    let dependencies = Array.from(this.dependencies.values());

    if (serviceId) {
      dependencies = dependencies.filter(dep => 
        dep.consumer === serviceId || dep.provider === serviceId
      );
    }

    return dependencies;
  }

  public getCatalogs(): ServiceCatalog[] {
    return Array.from(this.catalogs.values());
  }

  public async shutdown(): Promise<void> {
    // Stop health checker
    if (this.healthChecker) {
      await this.healthChecker.stop();
    }

    // Stop discovery agent
    if (this.discoveryAgent) {
      await this.discoveryAgent.stop();
    }

    // Persist data
    await this.persistData();

    this.isInitialized = false;
    this.emit('shutdown');
  }

  private async initializeStorage(): Promise<void> {
    // Mock storage initialization
    this.emit('storageInitialized');
  }

  private async startDiscoveryAgent(): Promise<void> {
    this.discoveryAgent = {
      announce: async (service: APIService) => {
        this.emit('serviceAnnounced', { serviceId: service.id });
      },
      update: async (service: APIService) => {
        this.emit('serviceUpdated', { serviceId: service.id });
      },
      remove: async (serviceId: string) => {
        this.emit('serviceRemoved', { serviceId });
      },
      stop: async () => {}
    };
  }

  private async startHealthChecker(): Promise<void> {
    this.healthChecker = {
      stop: async () => {}
    };

    // Start health checking interval
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheck.interval * 1000);
  }

  private async loadPersistedData(): Promise<void> {
    // Mock data loading
    this.emit('dataLoaded');
  }

  private async persistData(): Promise<void> {
    // Mock data persistence
    this.emit('dataPersisted');
  }

  private validateService(service: APIService): void {
    if (!service.name || !service.version) {
      throw new Error('Service name and version are required');
    }

    if (!service.deployment.instances || service.deployment.instances.length === 0) {
      throw new Error('Service must have at least one instance');
    }

    // Validate endpoints
    for (const endpoint of service.endpoints) {
      if (!endpoint.name || !endpoint.path) {
        throw new Error('Endpoint name and path are required');
      }
    }
  }

  private detectBreakingChanges(previous: APIService, current: APIService): string[] {
    const changes = [];

    // Version change
    if (this.isBreakingVersionChange(previous.version, current.version)) {
      changes.push('Major version change');
    }

    // Removed endpoints
    const removedEndpoints = previous.endpoints.filter(prevEp =>
      !current.endpoints.some(currEp => currEp.name === prevEp.name)
    );
    
    if (removedEndpoints.length > 0) {
      changes.push(`Removed endpoints: ${removedEndpoints.map(e => e.name).join(', ')}`);
    }

    // Changed endpoint paths
    for (const prevEp of previous.endpoints) {
      const currEp = current.endpoints.find(e => e.name === prevEp.name);
      if (currEp && currEp.path !== prevEp.path) {
        changes.push(`Changed endpoint path: ${prevEp.name}`);
      }
    }

    return changes;
  }

  private isBreakingVersionChange(previous: string, current: string): boolean {
    const prevParts = previous.split('.').map(Number);
    const currParts = current.split('.').map(Number);
    
    return currParts[0] > prevParts[0]; // Major version increase
  }

  private structureChanged(previous: APIService, current: APIService): boolean {
    return (
      previous.endpoints.length !== current.endpoints.length ||
      previous.dependencies.length !== current.dependencies.length ||
      previous.deployment.instances.length !== current.deployment.instances.length
    );
  }

  private findDependentServices(serviceId: string): APIService[] {
    const dependentIds = Array.from(this.dependencies.values())
      .filter(dep => dep.provider === serviceId)
      .map(dep => dep.consumer);

    return dependentIds
      .map(id => this.services.get(id))
      .filter(Boolean) as APIService[];
  }

  private createsCyclicDependency(newDep: ServiceDependency): boolean {
    // Simple cycle detection - would use more sophisticated algorithm in production
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (serviceId: string): boolean => {
      if (recursionStack.has(serviceId)) return true;
      if (visited.has(serviceId)) return false;

      visited.add(serviceId);
      recursionStack.add(serviceId);

      // Get dependencies of current service
      const deps = Array.from(this.dependencies.values())
        .filter(dep => dep.consumer === serviceId)
        .map(dep => dep.provider);

      // Add new dependency if it involves current service
      if (newDep.consumer === serviceId) {
        deps.push(newDep.provider);
      }

      for (const depId of deps) {
        if (hasCycle(depId)) return true;
      }

      recursionStack.delete(serviceId);
      return false;
    };

    return hasCycle(newDep.consumer);
  }

  private async buildTopology(): Promise<void> {
    const services = Array.from(this.services.values());
    const dependencies = Array.from(this.dependencies.values());

    // Determine layers
    const layers = this.determineLayers(services, dependencies);

    // Identify domains
    const domains = this.identifyDomains(services);

    // Detect patterns
    const patterns = this.detectPatterns(services, dependencies);

    this.topology = {
      services,
      dependencies,
      layers,
      domains,
      patterns
    };
  }

  private async updateTopology(): Promise<void> {
    await this.buildTopology();
    this.emit('topologyUpdated');
  }

  private determineLayers(services: APIService[], _dependencies: ServiceDependency[]): ServiceTopology['layers'] { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock layer determination
    return [
      {
        name: 'Presentation',
        services: services.filter(s => s.metadata.category === 'frontend').map(s => s.id),
        type: 'presentation'
      },
      {
        name: 'Business Logic',
        services: services.filter(s => s.metadata.category === 'business').map(s => s.id),
        type: 'business'
      },
      {
        name: 'Data',
        services: services.filter(s => s.metadata.category === 'data').map(s => s.id),
        type: 'data'
      }
    ];
  }

  private identifyDomains(services: APIService[]): ServiceTopology['domains'] {
    const domainMap = new Map<string, APIService[]>();

    for (const service of services) {
      const domain = service.metadata.businessDomain;
      if (!domainMap.has(domain)) {
        domainMap.set(domain, []);
      }
      domainMap.get(domain)!.push(service);
    }

    return Array.from(domainMap.entries()).map(([name, services]) => ({
      name,
      services: services.map(s => s.id),
      boundaries: {
        contexts: [...new Set(services.map(s => s.metadata.category))],
        aggregates: services.map(s => s.name)
      }
    }));
  }

  private detectPatterns(services: APIService[], dependencies: ServiceDependency[]): ServiceTopology['patterns'] {
    const patterns = [];

    // Detect gateway pattern
    const gateways = services.filter(s => 
      s.name.toLowerCase().includes('gateway') || 
      s.metadata.tags.includes('gateway')
    );

    if (gateways.length > 0) {
      patterns.push({
        name: 'API Gateway',
        type: 'gateway',
        services: gateways.map(g => g.id),
        config: {}
      });
    }

    // Detect circuit breaker pattern
    const circuitBreakers = dependencies.filter(dep => dep.circuit.enabled);
    if (circuitBreakers.length > 0) {
      patterns.push({
        name: 'Circuit Breaker',
        type: 'circuit-breaker',
        services: [...new Set([...circuitBreakers.map(cb => cb.consumer), ...circuitBreakers.map(cb => cb.provider)])],
        config: { dependencies: circuitBreakers.length }
      });
    }

    return patterns;
  }

  private async startServiceHealthMonitoring(service: APIService): Promise<void> {
    // Mock health monitoring start
    setInterval(async () => {
      await this.checkServiceHealth(service);
    }, this.config.healthCheck.interval * 1000);
  }

  private async performHealthChecks(): Promise<void> {
    for (const service of this.services.values()) {
      await this.checkServiceHealth(service);
    }
  }

  private async checkServiceHealth(service: APIService): Promise<void> {
    try {
      // Mock health check
      const healthy = Math.random() > 0.1; // 90% healthy
      
      service.health = {
        status: healthy ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        uptime: healthy ? 99.9 : 95.0,
        responseTime: Math.random() * 100,
        errorRate: healthy ? Math.random() * 0.01 : Math.random() * 0.1
      };

      if (!healthy && service.health.status !== 'unhealthy') {
        this.emit('serviceUnhealthy', { serviceId: service.id });
      }

    } catch (error) {
      service.health.status = 'unknown';
      this.emit('healthCheckError', { serviceId: service.id, error });
    }
  }

  private determineServiceLayer(service: APIService): string {
    if (service.metadata.category === 'frontend') return 'presentation';
    if (service.metadata.category === 'business') return 'business';
    if (service.metadata.category === 'data') return 'data';
    return 'integration';
  }

  private filterGraphByFocus(
    graph: { nodes: unknown[]; edges: unknown[] },
    focusId: string,
    depth: number
  ): { nodes: unknown[]; edges: unknown[] } {
    const visited = new Set<string>();
    const queue = [{ id: focusId, currentDepth: 0 }];
    const relevantNodes = new Set<string>();

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      
      if (visited.has(id) || currentDepth > depth) continue;
      
      visited.add(id);
      relevantNodes.add(id);

      // Add connected nodes
      const connectedEdges = graph.edges.filter(e => e.source === id || e.target === id);
      for (const edge of connectedEdges) {
        const connectedId = edge.source === id ? edge.target : edge.source;
        if (!visited.has(connectedId)) {
          queue.push({ id: connectedId, currentDepth: currentDepth + 1 });
        }
      }
    }

    return {
      nodes: graph.nodes.filter(n => relevantNodes.has(n.id)),
      edges: graph.edges.filter(e => relevantNodes.has(e.source) && relevantNodes.has(e.target))
    };
  }

  private generateRequestMetrics(period: { start: Date; end: Date }): Array<{
    timestamp: Date;
    count: number;
    errors: number;
  }> {
    const metrics = [];
    const start = period.start.getTime();
    const end = period.end.getTime();
    const interval = (end - start) / 24; // 24 data points

    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(start + i * interval);
      metrics.push({
        timestamp,
        count: Math.floor(Math.random() * 1000) + 100,
        errors: Math.floor(Math.random() * 50)
      });
    }

    return metrics;
  }

  private generateLatencyMetrics(period: { start: Date; end: Date }): Array<{
    timestamp: Date;
    p50: number;
    p95: number;
    p99: number;
  }> {
    const metrics = [];
    const start = period.start.getTime();
    const end = period.end.getTime();
    const interval = (end - start) / 24;

    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(start + i * interval);
      const base = Math.random() * 100 + 50;
      metrics.push({
        timestamp,
        p50: base,
        p95: base * 2,
        p99: base * 4
      });
    }

    return metrics;
  }

  private generateAvailabilityMetrics(period: { start: Date; end: Date }): Array<{
    timestamp: Date;
    uptime: number;
  }> {
    const metrics = [];
    const start = period.start.getTime();
    const end = period.end.getTime();
    const interval = (end - start) / 24;

    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(start + i * interval);
      metrics.push({
        timestamp,
        uptime: 99 + Math.random() * 1 // 99-100% uptime
      });
    }

    return metrics;
  }

  private getDependencyMetrics(serviceId: string): Array<{
    serviceId: string;
    healthy: boolean;
    responseTime: number;
  }> {
    const dependencies = Array.from(this.dependencies.values())
      .filter(dep => dep.consumer === serviceId);

    return dependencies.map(dep => {
      const provider = this.services.get(dep.provider);
      return {
        serviceId: dep.provider,
        healthy: provider?.health.status === 'healthy',
        responseTime: provider?.health.responseTime || 0
      };
    });
  }
}