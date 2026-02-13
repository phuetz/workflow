/**
 * Load Balancer
 * Advanced load balancing with multiple algorithms, health checks, and failover
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface LoadBalancerConfig {
  algorithm: LoadBalancingAlgorithm;
  healthCheck: HealthCheckConfig;
  failover: FailoverConfig;
  sticky: StickySessionConfig;
  timeout: {
    connect: number;
    request: number;
    response: number;
  };
  retries: {
    enabled: boolean;
    maxAttempts: number;
    backoff: 'linear' | 'exponential';
    baseDelay: number;
  };
  circuit: CircuitBreakerConfig;
}

export enum LoadBalancingAlgorithm {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  WEIGHTED_LEAST_CONNECTIONS = 'weighted_least_connections',
  IP_HASH = 'ip_hash',
  RANDOM = 'random',
  WEIGHTED_RANDOM = 'weighted_random',
  RESPONSE_TIME = 'response_time',
  LEAST_RESPONSE_TIME = 'least_response_time',
  RESOURCE_BASED = 'resource_based'
}

export interface BackendServer {
  id: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  weight: number;
  maxConnections: number;
  currentConnections: number;
  health: ServerHealth;
  metrics: ServerMetrics;
  tags: Record<string, string>;
  metadata: Record<string, unknown>;
}

export enum ServerHealth {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  DRAINING = 'draining',
  MAINTENANCE = 'maintenance'
}

export interface ServerMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number; // requests per second
  };
  responseTime: {
    current: number;
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  connections: {
    active: number;
    total: number;
    rejected: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
  lastUpdated: Date;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  path: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatus: number[];
  expectedBody?: string;
  headers?: Record<string, string>;
  unhealthyThreshold: number;
  healthyThreshold: number;
}

export interface FailoverConfig {
  enabled: boolean;
  mode: 'active_passive' | 'active_active';
  backupServers: string[];
  autoFailback: boolean;
  failbackDelay: number; // milliseconds
  maxFailures: number;
  failureWindow: number; // milliseconds
}

export interface StickySessionConfig {
  enabled: boolean;
  method: 'cookie' | 'ip' | 'header';
  cookieName?: string;
  headerName?: string;
  ttl: number; // milliseconds
  failover: boolean; // Allow failover to other servers
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  halfOpenMaxCalls: number;
  metrics: {
    windowSize: number; // milliseconds
    minimumCalls: number;
  };
}

export interface LoadBalancerRequest {
  id: string;
  clientIp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: Date;
  sessionId?: string;
  tags: Record<string, string>;
}

export interface LoadBalancerResponse {
  requestId: string;
  serverId: string;
  status: number;
  headers: Record<string, string>;
  body?: unknown;
  responseTime: number;
  timestamp: Date;
  retries: number;
}

export interface RoutingDecision {
  server: BackendServer;
  reason: string;
  algorithm: LoadBalancingAlgorithm;
  sessionAffinity: boolean;
  backup: boolean;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreaker {
  serverId: string;
  state: CircuitState;
  failures: number;
  lastFailureTime: Date;
  nextAttempt: Date;
  halfOpenCalls: number;
  metrics: {
    successCount: number;
    failureCount: number;
    timeouts: number;
    windowStart: Date;
  };
}

export class LoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private servers: Map<string, BackendServer> = new Map();
  private healthCheckers: Map<string, NodeJS.Timeout> = new Map();
  private circuits: Map<string, CircuitBreaker> = new Map();
  private stickySessions: Map<string, string> = new Map(); // sessionId -> serverId
  private roundRobinIndex: number = 0;
  private requestHistory: Map<string, LoadBalancerRequest[]> = new Map();
  private responseTimeHistory: Map<string, number[]> = new Map();
  
  constructor(config: LoadBalancerConfig) {
    super();
    this.config = config;
    this.startHealthChecks();
  }
  
  // Server Management
  
  public addServer(server: Omit<BackendServer, 'id' | 'currentConnections' | 'health' | 'metrics'>): string {
    const serverId = crypto.randomUUID();
    
    const backendServer: BackendServer = {
      ...server,
      id: serverId,
      currentConnections: 0,
      health: ServerHealth.HEALTHY,
      metrics: {
        requests: { total: 0, successful: 0, failed: 0, rate: 0 },
        responseTime: { current: 0, average: 0, p50: 0, p95: 0, p99: 0 },
        connections: { active: 0, total: 0, rejected: 0 },
        resources: { cpu: 0, memory: 0, disk: 0 },
        lastUpdated: new Date()
      }
    };
    
    this.servers.set(serverId, backendServer);
    
    if (this.config.circuit.enabled) {
      this.circuits.set(serverId, {
        serverId,
        state: CircuitState.CLOSED,
        failures: 0,
        lastFailureTime: new Date(0),
        nextAttempt: new Date(),
        halfOpenCalls: 0,
        metrics: {
          successCount: 0,
          failureCount: 0,
          timeouts: 0,
          windowStart: new Date()
        }
      });
    }
    
    // Start health check for this server
    if (this.config.healthCheck.enabled) {
      this.startHealthCheckForServer(serverId);
    }
    
    this.emit('serverAdded', { serverId, server: backendServer });
    
    return serverId;
  }
  
  public removeServer(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }
    
    // Stop health check
    const healthChecker = this.healthCheckers.get(serverId);
    if (healthChecker) {
      clearInterval(healthChecker);
      this.healthCheckers.delete(serverId);
    }
    
    // Remove from all tracking
    this.servers.delete(serverId);
    this.circuits.delete(serverId);
    this.requestHistory.delete(serverId);
    this.responseTimeHistory.delete(serverId);
    
    // Clean up sticky sessions
    for (const [sessionId, sId] of this.stickySessions.entries()) {
      if (sId === serverId) {
        this.stickySessions.delete(sessionId);
      }
    }
    
    this.emit('serverRemoved', { serverId });
    
    return true;
  }
  
  public updateServer(serverId: string, updates: Partial<BackendServer>): boolean {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }
    
    Object.assign(server, updates);
    
    this.emit('serverUpdated', { serverId, updates });
    
    return true;
  }
  
  public getServer(serverId: string): BackendServer | undefined {
    return this.servers.get(serverId);
  }
  
  public getAllServers(): BackendServer[] {
    return Array.from(this.servers.values());
  }
  
  public getHealthyServers(): BackendServer[] {
    return this.getAllServers().filter(server => 
      server.health === ServerHealth.HEALTHY || 
      server.health === ServerHealth.DEGRADED
    );
  }
  
  // Load Balancing
  
  public async selectServer(request: LoadBalancerRequest): Promise<RoutingDecision | null> {
    const availableServers = this.getAvailableServers();
    
    if (availableServers.length === 0) {
      this.emit('noServersAvailable', { request });
      return null;
    }
    
    // Check for sticky session
    if (this.config.sticky.enabled && request.sessionId) {
      const stickyServerId = this.stickySessions.get(request.sessionId);
      if (stickyServerId) {
        const stickyServer = this.servers.get(stickyServerId);
        
        if (stickyServer && this.isServerAvailable(stickyServer)) {
          return {
            server: stickyServer,
            reason: `Sticky session (${this.config.sticky.method})`,
            algorithm: this.config.algorithm,
            sessionAffinity: true,
            backup: false
          };
        } else if (!this.config.sticky.failover) {
          // Sticky session required but server unavailable and failover disabled
          return null;
        }
      }
    }
    
    // Select server using configured algorithm
    const server = await this.selectServerByAlgorithm(availableServers, request);
    
    if (!server) {
      return null;
    }
    
    // Update sticky session if enabled
    if (this.config.sticky.enabled && request.sessionId) {
      this.stickySessions.set(request.sessionId, server.id);
    }
    
    return {
      server,
      reason: `Selected by ${this.config.algorithm}`,
      algorithm: this.config.algorithm,
      sessionAffinity: false,
      backup: false
    };
  }
  
  private async selectServerByAlgorithm(servers: BackendServer[], request: LoadBalancerRequest): Promise<BackendServer | null> {
    switch (this.config.algorithm) {
      case LoadBalancingAlgorithm.ROUND_ROBIN:
        return this.selectRoundRobin(servers);
      
      case LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN:
        return this.selectWeightedRoundRobin(servers);
      
      case LoadBalancingAlgorithm.LEAST_CONNECTIONS:
        return this.selectLeastConnections(servers);
      
      case LoadBalancingAlgorithm.WEIGHTED_LEAST_CONNECTIONS:
        return this.selectWeightedLeastConnections(servers);
      
      case LoadBalancingAlgorithm.IP_HASH:
        return this.selectIpHash(servers, request.clientIp);
      
      case LoadBalancingAlgorithm.RANDOM:
        return this.selectRandom(servers);
      
      case LoadBalancingAlgorithm.WEIGHTED_RANDOM:
        return this.selectWeightedRandom(servers);
      
      case LoadBalancingAlgorithm.RESPONSE_TIME:
        return this.selectByResponseTime(servers);
      
      case LoadBalancingAlgorithm.LEAST_RESPONSE_TIME:
        return this.selectLeastResponseTime(servers);
      
      case LoadBalancingAlgorithm.RESOURCE_BASED:
        return this.selectResourceBased(servers);
      
      default:
        return this.selectRoundRobin(servers);
    }
  }
  
  private selectRoundRobin(servers: BackendServer[]): BackendServer {
    const server = servers[this.roundRobinIndex % servers.length];
    this.roundRobinIndex++;
    return server;
  }
  
  private selectWeightedRoundRobin(servers: BackendServer[]): BackendServer {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }
    
    return servers[servers.length - 1];
  }
  
  private selectLeastConnections(servers: BackendServer[]): BackendServer {
    return servers.reduce((least, server) => 
      server.currentConnections < least.currentConnections ? server : least
    );
  }
  
  private selectWeightedLeastConnections(servers: BackendServer[]): BackendServer {
    return servers.reduce((best, server) => {
      const currentRatio = server.currentConnections / server.weight;
      const bestRatio = best.currentConnections / best.weight;
      return currentRatio < bestRatio ? server : best;
    });
  }
  
  private selectIpHash(servers: BackendServer[], clientIp: string): BackendServer {
    const hash = crypto.createHash('md5').update(clientIp).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % servers.length;
    return servers[index];
  }
  
  private selectRandom(servers: BackendServer[]): BackendServer {
    const index = Math.floor(Math.random() * servers.length);
    return servers[index];
  }
  
  private selectWeightedRandom(servers: BackendServer[]): BackendServer {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }
    
    return servers[servers.length - 1];
  }
  
  private selectByResponseTime(servers: BackendServer[]): BackendServer {
    return servers.reduce((fastest, server) => 
      server.metrics.responseTime.average < fastest.metrics.responseTime.average ? server : fastest
    );
  }
  
  private selectLeastResponseTime(servers: BackendServer[]): BackendServer {
    // Combination of least connections and response time
    return servers.reduce((best, server) => {
      const currentScore = server.currentConnections * server.metrics.responseTime.average;
      const bestScore = best.currentConnections * best.metrics.responseTime.average;
      return currentScore < bestScore ? server : best;
    });
  }
  
  private selectResourceBased(servers: BackendServer[]): BackendServer {
    // Select based on resource utilization (CPU, memory, etc.)
    return servers.reduce((best, server) => {
      const currentLoad = (server.metrics.resources.cpu + server.metrics.resources.memory) / 2;
      const bestLoad = (best.metrics.resources.cpu + best.metrics.resources.memory) / 2;
      return currentLoad < bestLoad ? server : best;
    });
  }
  
  private getAvailableServers(): BackendServer[] {
    return this.getAllServers().filter(server => this.isServerAvailable(server));
  }
  
  private isServerAvailable(server: BackendServer): boolean {
    // Check health
    if (server.health === ServerHealth.UNHEALTHY || server.health === ServerHealth.MAINTENANCE) {
      return false;
    }
    
    // Check circuit breaker
    if (this.config.circuit.enabled) {
      const circuit = this.circuits.get(server.id);
      if (circuit && circuit.state === CircuitState.OPEN) {
        if (Date.now() < circuit.nextAttempt.getTime()) {
          return false;
        } else {
          // Transition to half-open
          circuit.state = CircuitState.HALF_OPEN;
          circuit.halfOpenCalls = 0;
        }
      }
    }
    
    // Check connection limits
    if (server.currentConnections >= server.maxConnections) {
      return false;
    }
    
    return true;
  }
  
  // Request Processing
  
  public async processRequest(request: LoadBalancerRequest): Promise<LoadBalancerResponse | null> {
    const routingDecision = await this.selectServer(request);
    
    if (!routingDecision) {
      this.emit('requestFailed', { request, reason: 'No available servers' });
      return null;
    }
    
    const server = routingDecision.server;
    
    return await this.executeRequest(request, server);
  }
  
  private async executeRequest(request: LoadBalancerRequest, server: BackendServer, attempt: number = 1): Promise<LoadBalancerResponse | null> {
    const startTime = Date.now();
    
    try {
      // Increment connection count
      server.currentConnections++;
      
      // Make the actual request
      const response = await this.makeHttpRequest(request, server);
      
      // Update metrics on success
      this.updateServerMetrics(server.id, {
        success: true,
        responseTime: Date.now() - startTime,
        statusCode: response.status
      });
      
      // Update circuit breaker
      if (this.config.circuit.enabled) {
        this.updateCircuitBreaker(server.id, true);
      }
      
      this.emit('requestCompleted', {
        requestId: request.id,
        serverId: server.id,
        responseTime: Date.now() - startTime,
        status: response.status
      });
      
      return {
        requestId: request.id,
        serverId: server.id,
        status: response.status,
        headers: response.headers,
        body: response.body,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        retries: attempt - 1
      };
      
    } catch (error) {
      // Update metrics on failure
      this.updateServerMetrics(server.id, {
        success: false,
        responseTime: Date.now() - startTime,
        error: error as Error
      });
      
      // Update circuit breaker
      if (this.config.circuit.enabled) {
        this.updateCircuitBreaker(server.id, false);
      }
      
      // Handle retries
      if (this.config.retries.enabled && attempt < this.config.retries.maxAttempts) {
        const delay = this.calculateRetryDelay(attempt);
        
        this.emit('requestRetry', {
          requestId: request.id,
          serverId: server.id,
          attempt,
          delay,
          error: (error as Error).message
        });
        
        await this.sleep(delay);
        
        // Try with a different server if possible
        const newDecision = await this.selectServer(request);
        const nextServer = newDecision ? newDecision.server : server;
        
        return await this.executeRequest(request, nextServer, attempt + 1);
      }
      
      this.emit('requestFailed', {
        requestId: request.id,
        serverId: server.id,
        error: (error as Error).message,
        attempts: attempt
      });
      
      return null;
    } finally {
      // Decrement connection count
      server.currentConnections = Math.max(0, server.currentConnections - 1);
    }
  }
  
  private async makeHttpRequest(request: LoadBalancerRequest, server: BackendServer): Promise<{
    status: number;
    headers: Record<string, string>;
    body?: unknown;
  }> {
    return new Promise((resolve, reject) => {
      const isHttps = server.protocol === 'https';
      const httpModule = isHttps ? https : http;
      
      const url = new URL(request.url);
      const options = {
        hostname: server.host,
        port: server.port,
        path: url.pathname + url.search,
        method: request.method,
        headers: request.headers,
        timeout: this.config.timeout.request
      };
      
      const req = httpModule.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode || 500,
            headers: res.headers as Record<string, string>,
            body: body || undefined
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (request.body) {
        req.write(JSON.stringify(request.body));
      }
      
      req.end();
    });
  }
  
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retries.baseDelay;
    
    switch (this.config.retries.backoff) {
      case 'linear':
        return baseDelay * attempt;
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);
      default:
        return baseDelay;
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Health Checking
  
  private startHealthChecks(): void {
    if (!this.config.healthCheck.enabled) {
      return;
    }
    
    // Start health checks for existing servers
    for (const serverId of this.servers.keys()) {
      this.startHealthCheckForServer(serverId);
    }
  }
  
  private startHealthCheckForServer(serverId: string): void {
    const interval = setInterval(() => {
      this.performHealthCheck(serverId);
    }, this.config.healthCheck.interval);
    
    this.healthCheckers.set(serverId, interval);
  }
  
  private async performHealthCheck(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      return;
    }
    
    const healthCheck = this.config.healthCheck;
    let attempts = 0;
    let success = false;
    
    while (attempts < healthCheck.retries && !success) {
      attempts++;
      
      try {
        const isHealthy = await this.checkServerHealth(server);
        
        if (isHealthy) {
          success = true;
          this.handleHealthCheckSuccess(server);
        } else {
          this.handleHealthCheckFailure(server);
        }
      } catch {
        this.handleHealthCheckFailure(server);
        
        if (attempts < healthCheck.retries) {
          await this.sleep(1000); // Wait 1 second between retries
        }
      }
    }
  }
  
  private async checkServerHealth(server: BackendServer): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const isHttps = server.protocol === 'https';
      const httpModule = isHttps ? https : http;
      const healthCheck = this.config.healthCheck;
      
      const options = {
        hostname: server.host,
        port: server.port,
        path: healthCheck.path,
        method: healthCheck.method,
        headers: healthCheck.headers || {},
        timeout: healthCheck.timeout
      };
      
      const req = httpModule.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          const statusOk = healthCheck.expectedStatus.includes(res.statusCode || 500);
          const bodyOk = !healthCheck.expectedBody || body.includes(healthCheck.expectedBody);
          
          resolve(statusOk && bodyOk);
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
      
      req.end();
    });
  }
  
  private handleHealthCheckSuccess(server: BackendServer): void {
    const wasUnhealthy = server.health === ServerHealth.UNHEALTHY;
    
    server.health = ServerHealth.HEALTHY;
    
    if (wasUnhealthy) {
      this.emit('serverHealthy', { serverId: server.id });
    }
  }
  
  private handleHealthCheckFailure(server: BackendServer): void {
    const wasHealthy = server.health === ServerHealth.HEALTHY;
    
    server.health = ServerHealth.UNHEALTHY;
    
    if (wasHealthy) {
      this.emit('serverUnhealthy', { serverId: server.id });
    }
  }
  
  // Circuit Breaker
  
  private updateCircuitBreaker(serverId: string, success: boolean): void {
    const circuit = this.circuits.get(serverId);
    if (!circuit) {
      return;
    }
    
    const now = new Date();
    const config = this.config.circuit;
    
    // Reset metrics window if needed
    if (now.getTime() - circuit.metrics.windowStart.getTime() > config.metrics.windowSize) {
      circuit.metrics.successCount = 0;
      circuit.metrics.failureCount = 0;
      circuit.metrics.timeouts = 0;
      circuit.metrics.windowStart = now;
    }
    
    if (success) {
      circuit.metrics.successCount++;
      circuit.failures = 0;
      
      if (circuit.state === CircuitState.HALF_OPEN) {
        circuit.halfOpenCalls++;
        
        if (circuit.halfOpenCalls >= config.halfOpenMaxCalls) {
          circuit.state = CircuitState.CLOSED;
          this.emit('circuitClosed', { serverId });
        }
      }
    } else {
      circuit.metrics.failureCount++;
      circuit.failures++;
      circuit.lastFailureTime = now;
      
      const totalCalls = circuit.metrics.successCount + circuit.metrics.failureCount;
      const failureRate = circuit.metrics.failureCount / totalCalls;
      
      if (totalCalls >= config.metrics.minimumCalls && 
          failureRate >= config.failureThreshold) {
        
        if (circuit.state !== CircuitState.OPEN) {
          circuit.state = CircuitState.OPEN;
          circuit.nextAttempt = new Date(now.getTime() + config.recoveryTimeout);
          
          this.emit('circuitOpened', { serverId });
        }
      }
    }
  }
  
  // Metrics and Monitoring
  
  private updateServerMetrics(serverId: string, result: {
    success: boolean;
    responseTime: number;
    statusCode?: number;
    error?: Error;
  }): void {
    const server = this.servers.get(serverId);
    if (!server) {
      return;
    }
    
    const metrics = server.metrics;
    
    // Update request metrics
    metrics.requests.total++;
    if (result.success) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
    }
    
    // Update response time metrics
    metrics.responseTime.current = result.responseTime;
    
    // Update response time history
    if (!this.responseTimeHistory.has(serverId)) {
      this.responseTimeHistory.set(serverId, []);
    }
    
    const responseHistory = this.responseTimeHistory.get(serverId)!;
    responseHistory.push(result.responseTime);
    
    // Keep only last 100 response times
    if (responseHistory.length > 100) {
      responseHistory.shift();
    }
    
    // Calculate percentiles
    const sortedTimes = responseHistory.slice().sort((a, b) => a - b);
    const len = sortedTimes.length;
    
    if (len > 0) {
      metrics.responseTime.average = responseHistory.reduce((sum, time) => sum + time, 0) / len;
      metrics.responseTime.p50 = sortedTimes[Math.floor(len * 0.5)];
      metrics.responseTime.p95 = sortedTimes[Math.floor(len * 0.95)];
      metrics.responseTime.p99 = sortedTimes[Math.floor(len * 0.99)];
    }
    
    metrics.lastUpdated = new Date();
  }
  
  // Public API
  
  public getStats(): {
    totalServers: number;
    healthyServers: number;
    unhealthyServers: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    circuitBreakerStats: {
      open: number;
      halfOpen: number;
      closed: number;
    };
  } {
    const servers = this.getAllServers();
    const healthyCount = servers.filter(s => s.health === ServerHealth.HEALTHY).length;
    const totalRequests = servers.reduce((sum, s) => sum + s.metrics.requests.total, 0);
    const successfulRequests = servers.reduce((sum, s) => sum + s.metrics.requests.successful, 0);
    const failedRequests = servers.reduce((sum, s) => sum + s.metrics.requests.failed, 0);
    const avgResponseTime = servers.length > 0 
      ? servers.reduce((sum, s) => sum + s.metrics.responseTime.average, 0) / servers.length
      : 0;
    
    const circuits = Array.from(this.circuits.values());
    const circuitStats = {
      open: circuits.filter(c => c.state === CircuitState.OPEN).length,
      halfOpen: circuits.filter(c => c.state === CircuitState.HALF_OPEN).length,
      closed: circuits.filter(c => c.state === CircuitState.CLOSED).length
    };
    
    return {
      totalServers: servers.length,
      healthyServers: healthyCount,
      unhealthyServers: servers.length - healthyCount,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: avgResponseTime,
      circuitBreakerStats: circuitStats
    };
  }
  
  public getServerStats(serverId: string): ServerMetrics | null {
    const server = this.servers.get(serverId);
    return server ? server.metrics : null;
  }
  
  public updateServerResources(serverId: string, resources: { cpu: number; memory: number; disk: number }): boolean {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }
    
    server.metrics.resources = resources;
    server.metrics.lastUpdated = new Date();
    
    return true;
  }
  
  public drainServer(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }
    
    server.health = ServerHealth.DRAINING;
    
    this.emit('serverDraining', { serverId });
    
    return true;
  }
  
  public enableServer(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }
    
    if (server.health === ServerHealth.MAINTENANCE || server.health === ServerHealth.DRAINING) {
      server.health = ServerHealth.HEALTHY;
      
      this.emit('serverEnabled', { serverId });
      
      return true;
    }
    
    return false;
  }
  
  public setMaintenanceMode(serverId: string, maintenance: boolean): boolean {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }
    
    server.health = maintenance ? ServerHealth.MAINTENANCE : ServerHealth.HEALTHY;
    
    this.emit('serverMaintenanceChanged', { serverId, maintenance });
    
    return true;
  }
  
  public clearStickySession(sessionId: string): boolean {
    return this.stickySessions.delete(sessionId);
  }
  
  public getStickySession(sessionId: string): string | undefined {
    return this.stickySessions.get(sessionId);
  }
  
  public destroy(): void {
    // Clear all health check intervals
    for (const [, interval] of this.healthCheckers.entries()) {
      clearInterval(interval);
    }
    
    this.healthCheckers.clear();
    this.servers.clear();
    this.circuits.clear();
    this.stickySessions.clear();
    this.requestHistory.clear();
    this.responseTimeHistory.clear();
    
    this.emit('destroyed');
  }
}