/**
 * PLAN C PHASE 4 - Intelligent Load Balancer
 * Système de répartition de charge intelligent avec ML
 * Supporte multiple stratégies et auto-apprentissage
 */

import { EventEmitter } from 'events';
import {
  withErrorHandling,
  withRetry,
  withCache,
  generateId,
  memoize
} from '../../utils/SharedPatterns';
import {
  JsonValue,
  UnknownObject,
  isNumber
} from '../../types/StrictTypes';

// ============================================
// Types
// ============================================

export interface ServerNode {
  id: string;
  host: string;
  port: number;
  weight: number;
  maxConnections: number;
  currentConnections: number;
  health: HealthStatus;
  metrics: NodeMetrics;
  metadata: NodeMetadata;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'draining';
  lastCheck: Date;
  consecutiveFailures: number;
  responseTime: number;
  errorRate: number;
}

export interface NodeMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
}

export interface NodeMetadata {
  region: string;
  zone: string;
  version: string;
  capabilities: string[];
  tags: Record<string, string>;
}

export interface LoadBalancerConfig {
  strategy: BalancingStrategy;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
  stickySession: boolean;
  sessionTimeout: number;
  enableML: boolean;
  metricsWindow: number;
}

export type BalancingStrategy = 
  | 'round-robin'
  | 'least-connections'
  | 'weighted-round-robin'
  | 'ip-hash'
  | 'least-response-time'
  | 'random'
  | 'ml-optimized';

export interface Request {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: JsonValue;
  clientIp: string;
  sessionId?: string;
  priority: number;
  timestamp: Date;
}

export interface Response {
  statusCode: number;
  headers: Record<string, string>;
  body?: JsonValue;
  nodeId: string;
  responseTime: number;
}

export interface RoutingDecision {
  nodeId: string;
  reason: string;
  score: number;
  fallbacks: string[];
}

export interface LoadBalancerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  throughput: number;
  activeConnections: number;
  nodeDistribution: Record<string, number>;
  errorRate: number;
}

// ============================================
// ML Model for Intelligent Routing
// ============================================

class MLRoutingModel {
  private weights: Map<string, number[]> = new Map();
  private learningRate = 0.01;
  private features = [
    'responseTime',
    'errorRate',
    'cpuUsage',
    'memoryUsage',
    'throughput',
    'connections'
  ];

  predict(node: ServerNode): number {
    const features = this.extractFeatures(node);
    const weights = this.weights.get(node.id) || this.initializeWeights();
    
    let score = 0;
    for (let i = 0; i < features.length; i++) {
      score += features[i] * weights[i];
    }
    
    return this.sigmoid(score);
  }

  update(node: ServerNode, reward: number): void {
    const features = this.extractFeatures(node);
    const weights = this.weights.get(node.id) || this.initializeWeights();
    const prediction = this.predict(node);
    const error = reward - prediction;
    
    // Gradient descent update
    for (let i = 0; i < weights.length; i++) {
      weights[i] += this.learningRate * error * features[i];
    }
    
    this.weights.set(node.id, weights);
  }

  private extractFeatures(node: ServerNode): number[] {
    return [
      this.normalize(node.metrics.avgResponseTime, 0, 1000),
      this.normalize(node.metrics.errorRate, 0, 100),
      this.normalize(node.metrics.cpuUsage, 0, 100),
      this.normalize(node.metrics.memoryUsage, 0, 100),
      this.normalize(node.metrics.throughput, 0, 10000),
      this.normalize(node.currentConnections, 0, node.maxConnections)
    ];
  }

  private initializeWeights(): number[] {
    return Array(this.features.length).fill(0).map(() => Math.random() - 0.5);
  }

  private normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}

// ============================================
// Circuit Breaker Implementation
// ============================================

class CircuitBreaker {
  private states: Map<string, BreakerState> = new Map();
  private threshold: number;
  private timeout: number;
  private resetTimeout: number;

  constructor(threshold: number = 5, timeout: number = 60000, resetTimeout: number = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
  }

  canRequest(nodeId: string): boolean {
    const state = this.states.get(nodeId) || this.initState(nodeId);
    
    switch (state.status) {
      case 'closed':
        return true;
      
      case 'open':
        const now = Date.now();
        if (now - state.lastFailure > this.resetTimeout) {
          state.status = 'half-open';
          state.successCount = 0;
          return true;
        }
        return false;
      
      case 'half-open':
        return state.successCount < 3; // Allow 3 test requests
      
      default:
        return false;
    }
  }

  recordSuccess(nodeId: string): void {
    const state = this.states.get(nodeId) || this.initState(nodeId);
    
    state.successCount++;
    state.failureCount = 0;
    
    if (state.status === 'half-open' && state.successCount >= 3) {
      state.status = 'closed';
    }
  }

  recordFailure(nodeId: string): void {
    const state = this.states.get(nodeId) || this.initState(nodeId);
    
    state.failureCount++;
    state.lastFailure = Date.now();
    
    if (state.failureCount >= this.threshold) {
      state.status = 'open';
      state.successCount = 0;
    }
  }

  private initState(nodeId: string): BreakerState {
    const state: BreakerState = {
      status: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailure: 0
    };
    
    this.states.set(nodeId, state);
    return state;
  }
}

interface BreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailure: number;
}

// ============================================
// Load Balancer Implementation
// ============================================

export class IntelligentLoadBalancer extends EventEmitter {
  private nodes: Map<string, ServerNode> = new Map();
  private sessions: Map<string, string> = new Map(); // sessionId -> nodeId
  private config: LoadBalancerConfig;
  private stats: LoadBalancerStats;
  private circuitBreaker: CircuitBreaker;
  private mlModel?: MLRoutingModel;
  private roundRobinIndex = 0;
  private healthCheckTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;

  constructor(config?: Partial<LoadBalancerConfig>) {
    super();
    
    this.config = {
      strategy: config?.strategy || 'round-robin',
      healthCheckInterval: config?.healthCheckInterval || 5000,
      healthCheckTimeout: config?.healthCheckTimeout || 3000,
      maxRetries: config?.maxRetries || 3,
      circuitBreakerThreshold: config?.circuitBreakerThreshold || 5,
      stickySession: config?.stickySession || false,
      sessionTimeout: config?.sessionTimeout || 3600000,
      enableML: config?.enableML || false,
      metricsWindow: config?.metricsWindow || 60000
    };
    
    this.stats = this.initializeStats();
    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreakerThreshold);
    
    if (this.config.enableML) {
      this.mlModel = new MLRoutingModel();
    }
    
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  // ============================================
  // Node Management
  // ============================================

  /**
   * Add a server node to the pool
   */
  addNode(node: Partial<ServerNode> & { host: string; port: number }): string {
    const nodeId = node.id || generateId('node');
    
    const serverNode: ServerNode = {
      id: nodeId,
      host: node.host,
      port: node.port,
      weight: node.weight || 1,
      maxConnections: node.maxConnections || 1000,
      currentConnections: 0,
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        consecutiveFailures: 0,
        responseTime: 0,
        errorRate: 0
      },
      metrics: {
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        networkLatency: 0
      },
      metadata: node.metadata || {
        region: 'default',
        zone: 'default',
        version: '1.0.0',
        capabilities: [],
        tags: {}
      }
    };
    
    this.nodes.set(nodeId, serverNode);
    this.emit('node:added', serverNode);
    
    return nodeId;
  }

  /**
   * Remove a node from the pool
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    
    if (node) {
      // Mark as draining
      node.health.status = 'draining';
      
      // Wait for connections to drain
      setTimeout(() => {
        this.nodes.delete(nodeId);
        this.emit('node:removed', { nodeId });
      }, 30000);
    }
  }

  /**
   * Update node configuration
   */
  updateNode(nodeId: string, updates: Partial<ServerNode>): void {
    const node = this.nodes.get(nodeId);
    
    if (node) {
      Object.assign(node, updates);
      this.emit('node:updated', node);
    }
  }

  // ============================================
  // Request Routing
  // ============================================

  /**
   * Route a request to the best available node
   */
  async route(request: Request): Promise<Response> {
    return await withErrorHandling(
      async () => {
        // Get routing decision
        const decision = await this.getRoutingDecision(request);
        
        if (!decision) {
          throw new Error('No available nodes');
        }
        
        // Try primary node
        let response = await this.tryNode(decision.nodeId, request);
        
        // Try fallbacks if needed
        if (!response && decision.fallbacks.length > 0) {
          for (const fallbackId of decision.fallbacks) {
            response = await this.tryNode(fallbackId, request);
            if (response) break;
          }
        }
        
        if (!response) {
          throw new Error('All nodes failed');
        }
        
        // Update stats
        this.updateStats(response);
        
        // Update ML model if enabled
        if (this.config.enableML && this.mlModel) {
          const node = this.nodes.get(response.nodeId);
          if (node) {
            const reward = this.calculateReward(response);
            this.mlModel.update(node, reward);
          }
        }
        
        return response;
      },
      {
        operation: 'route',
        module: 'IntelligentLoadBalancer'
      }
    ) as Promise<Response>;
  }

  /**
   * Get routing decision based on strategy
   */
  private async getRoutingDecision(request: Request): Promise<RoutingDecision | null> {
    // Check sticky session
    if (this.config.stickySession && request.sessionId) {
      const nodeId = this.sessions.get(request.sessionId);
      if (nodeId && this.isNodeAvailable(nodeId)) {
        return {
          nodeId,
          reason: 'sticky-session',
          score: 1,
          fallbacks: this.getFallbackNodes(nodeId)
        };
      }
    }
    
    // Get available nodes
    const availableNodes = this.getAvailableNodes();
    
    if (availableNodes.length === 0) {
      return null;
    }
    
    // Select based on strategy
    let selectedNode: ServerNode | null = null;
    let reason = this.config.strategy;
    
    switch (this.config.strategy) {
      case 'round-robin':
        selectedNode = this.selectRoundRobin(availableNodes);
        break;
      
      case 'least-connections':
        selectedNode = this.selectLeastConnections(availableNodes);
        break;
      
      case 'weighted-round-robin':
        selectedNode = this.selectWeightedRoundRobin(availableNodes);
        break;
      
      case 'ip-hash':
        selectedNode = this.selectIpHash(availableNodes, request.clientIp);
        break;
      
      case 'least-response-time':
        selectedNode = this.selectLeastResponseTime(availableNodes);
        break;
      
      case 'random':
        selectedNode = this.selectRandom(availableNodes);
        break;
      
      case 'ml-optimized':
        selectedNode = this.selectMLOptimized(availableNodes);
        reason = 'ml-optimized';
        break;
      
      default:
        selectedNode = this.selectRoundRobin(availableNodes);
    }
    
    if (!selectedNode) {
      return null;
    }
    
    // Store session if needed
    if (this.config.stickySession && request.sessionId) {
      this.sessions.set(request.sessionId, selectedNode.id);
      
      // Clean up old sessions
      setTimeout(() => {
        this.sessions.delete(request.sessionId!);
      }, this.config.sessionTimeout);
    }
    
    return {
      nodeId: selectedNode.id,
      reason,
      score: this.calculateNodeScore(selectedNode),
      fallbacks: this.getFallbackNodes(selectedNode.id)
    };
  }

  // ============================================
  // Selection Strategies
  // ============================================

  private selectRoundRobin(nodes: ServerNode[]): ServerNode {
    const node = nodes[this.roundRobinIndex % nodes.length];
    this.roundRobinIndex++;
    return node;
  }

  private selectLeastConnections(nodes: ServerNode[]): ServerNode {
    return nodes.reduce((min, node) => 
      node.currentConnections < min.currentConnections ? node : min
    );
  }

  private selectWeightedRoundRobin(nodes: ServerNode[]): ServerNode {
    const totalWeight = nodes.reduce((sum, node) => sum + node.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const node of nodes) {
      random -= node.weight;
      if (random <= 0) {
        return node;
      }
    }
    
    return nodes[0];
  }

  private selectIpHash(nodes: ServerNode[], clientIp: string): ServerNode {
    const hash = this.hashString(clientIp);
    return nodes[hash % nodes.length];
  }

  private selectLeastResponseTime(nodes: ServerNode[]): ServerNode {
    return nodes.reduce((min, node) => 
      node.metrics.avgResponseTime < min.metrics.avgResponseTime ? node : min
    );
  }

  private selectRandom(nodes: ServerNode[]): ServerNode {
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  private selectMLOptimized(nodes: ServerNode[]): ServerNode | null {
    if (!this.mlModel) return this.selectRoundRobin(nodes);
    
    let bestNode: ServerNode | null = null;
    let bestScore = -1;
    
    for (const node of nodes) {
      const score = this.mlModel.predict(node);
      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
      }
    }
    
    return bestNode;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async tryNode(nodeId: string, request: Request): Promise<Response | null> {
    const node = this.nodes.get(nodeId);
    
    if (!node || !this.circuitBreaker.canRequest(nodeId)) {
      return null;
    }
    
    try {
      // Increment connections
      node.currentConnections++;
      
      // Simulate request (in production, make actual HTTP request)
      const startTime = Date.now();
      const response = await this.makeRequest(node, request);
      const responseTime = Date.now() - startTime;
      
      // Update metrics
      node.metrics.requestCount++;
      node.metrics.avgResponseTime = 
        (node.metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
      
      // Record success
      this.circuitBreaker.recordSuccess(nodeId);
      
      // Decrement connections
      node.currentConnections--;
      
      return {
        ...response,
        nodeId,
        responseTime
      };
      
    } catch (error) {
      // Update error metrics
      node.metrics.errorCount++;
      node.metrics.errorRate = 
        (node.metrics.errorCount / node.metrics.requestCount) * 100;
      
      // Record failure
      this.circuitBreaker.recordFailure(nodeId);
      
      // Decrement connections
      node.currentConnections--;
      
      return null;
    }
  }

  private async makeRequest(node: ServerNode, request: Request): Promise<Response> {
    // Simulate HTTP request
    await new Promise(resolve => 
      setTimeout(resolve, 50 + Math.random() * 150)
    );
    
    // Simulate occasional failures
    if (Math.random() < 0.05) {
      throw new Error('Request failed');
    }
    
    return {
      statusCode: 200,
      headers: {},
      body: { success: true },
      nodeId: node.id,
      responseTime: 0
    };
  }

  private getAvailableNodes(): ServerNode[] {
    return Array.from(this.nodes.values()).filter(node => 
      this.isNodeAvailable(node.id)
    );
  }

  private isNodeAvailable(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    
    if (!node) return false;
    
    return (
      node.health.status === 'healthy' &&
      node.currentConnections < node.maxConnections &&
      this.circuitBreaker.canRequest(nodeId)
    );
  }

  private getFallbackNodes(excludeId: string): string[] {
    return this.getAvailableNodes()
      .filter(node => node.id !== excludeId)
      .sort((a, b) => this.calculateNodeScore(b) - this.calculateNodeScore(a))
      .slice(0, 3)
      .map(node => node.id);
  }

  private calculateNodeScore(node: ServerNode): number {
    const connectionScore = 1 - (node.currentConnections / node.maxConnections);
    const responseTimeScore = 1 - Math.min(node.metrics.avgResponseTime / 1000, 1);
    const errorScore = 1 - (node.metrics.errorRate / 100);
    const healthScore = node.health.status === 'healthy' ? 1 : 0.5;
    
    return (
      connectionScore * 0.3 +
      responseTimeScore * 0.3 +
      errorScore * 0.2 +
      healthScore * 0.2
    ) * node.weight;
  }

  private calculateReward(response: Response): number {
    const timeReward = Math.max(0, 1 - (response.responseTime / 1000));
    const successReward = response.statusCode < 400 ? 1 : 0;
    
    return (timeReward * 0.7) + (successReward * 0.3);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ============================================
  // Health Checks
  // ============================================

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const node of this.nodes.values()) {
        await this.checkNodeHealth(node);
      }
    }, this.config.healthCheckInterval);
  }

  private async checkNodeHealth(node: ServerNode): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Simulate health check
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.95) {
            resolve(true);
          } else {
            reject(new Error('Health check failed'));
          }
        }, Math.random() * 100);
      });
      
      const responseTime = Date.now() - startTime;
      
      // Update health status
      node.health.status = 'healthy';
      node.health.consecutiveFailures = 0;
      node.health.responseTime = responseTime;
      node.health.lastCheck = new Date();
      
    } catch (error) {
      node.health.consecutiveFailures++;
      
      if (node.health.consecutiveFailures >= 3) {
        node.health.status = 'unhealthy';
      } else if (node.health.consecutiveFailures >= 2) {
        node.health.status = 'degraded';
      }
      
      node.health.lastCheck = new Date();
    }
  }

  // ============================================
  // Metrics & Stats
  // ============================================

  private initializeStats(): LoadBalancerStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      throughput: 0,
      activeConnections: 0,
      nodeDistribution: {},
      errorRate: 0
    };
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.updateGlobalMetrics();
      this.emit('metrics:updated', this.getStats());
    }, 5000);
  }

  private updateStats(response: Response): void {
    this.stats.totalRequests++;
    
    if (response.statusCode < 400) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    // Update average response time
    this.stats.avgResponseTime = 
      (this.stats.avgResponseTime * 0.95) + (response.responseTime * 0.05);
    
    // Update node distribution
    this.stats.nodeDistribution[response.nodeId] = 
      (this.stats.nodeDistribution[response.nodeId] || 0) + 1;
  }

  private updateGlobalMetrics(): void {
    // Calculate active connections
    this.stats.activeConnections = Array.from(this.nodes.values())
      .reduce((sum, node) => sum + node.currentConnections, 0);
    
    // Calculate error rate
    this.stats.errorRate = this.stats.totalRequests > 0
      ? (this.stats.failedRequests / this.stats.totalRequests) * 100
      : 0;
    
    // Calculate throughput
    this.stats.throughput = this.stats.totalRequests / 
      (this.config.metricsWindow / 1000);
  }

  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  getNodes(): ServerNode[] {
    return Array.from(this.nodes.values());
  }

  // ============================================
  // Cleanup
  // ============================================

  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    this.removeAllListeners();
  }
}

// Export singleton
export const loadBalancer = new IntelligentLoadBalancer({
  strategy: 'ml-optimized',
  enableML: true
});