/**
 * Performance Optimization Types
 * Advanced performance monitoring, optimization strategies, and resource management
 */

// System monitoring metrics
export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: [number, number, number];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  network?: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  uptime: number;
}

// Query performance metrics
export interface QueryMetrics {
  query: string;
  avgTime: number;
  count: number;
  maxTime?: number;
  minTime?: number;
  timestamp?: Date;
}

// Workflow execution metrics
export interface WorkflowMetrics {
  totalExecutions: number;
  active?: number;
  activeExecutions?: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  executionQueue?: number;
  nodeExecutions?: Map<string, number>;
  successRate?: number;
  executionStats?: Record<string, number>;
}

export interface PerformanceMetrics {
  workflowId: string;
  executionId?: string;
  timestamp: Date;
  duration: number;
  cpuUsage: number; // percentage
  memoryUsage: number; // bytes
  networkIO: number; // bytes
  diskIO: number; // bytes
  nodeExecutions: NodePerformanceMetric[];
  bottlenecks: PerformanceBottleneck[];
  optimizations: PerformanceOptimization[];
}

export interface NodePerformanceMetric {
  nodeId: string;
  nodeType: string;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  retries: number;
  throughput: number; // items processed per second
  latency: number; // average response time
}

export interface PerformanceBottleneck {
  id: string;
  type: BottleneckType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedNodes: string[];
  impact: BottleneckImpact;
  recommendations: string[];
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export type BottleneckType = 
  | 'cpu_intensive'
  | 'memory_leak'
  | 'network_latency'
  | 'disk_io'
  | 'database_query'
  | 'api_rate_limit'
  | 'synchronous_processing'
  | 'large_data_transfer'
  | 'inefficient_loop'
  | 'blocking_operation'
  | 'resource_contention';

export interface BottleneckImpact {
  executionTimeIncrease: number; // percentage
  resourceUsageIncrease: number; // percentage
  throughputDecrease: number; // percentage
  errorRateIncrease: number; // percentage
  affectedExecutions: number;
}

export interface PerformanceOptimization {
  id: string;
  type: OptimizationType;
  description: string;
  targetNodes: string[];
  config: OptimizationConfig;
  enabled: boolean;
  appliedAt?: Date;
  impact: OptimizationImpact;
  conditions: OptimizationCondition[];
}

export type OptimizationType = 
  | 'caching'
  | 'parallel_execution'
  | 'batch_processing'
  | 'lazy_loading'
  | 'connection_pooling'
  | 'data_compression'
  | 'query_optimization'
  | 'memory_management'
  | 'resource_sharing'
  | 'asynchronous_processing'
  | 'load_balancing'
  | 'prefetching';

export interface OptimizationConfig {
  priority: number;
  autoApply: boolean;
  conditions: Record<string, unknown>;
  parameters: Record<string, unknown>;
  rollbackCriteria?: OptimizationCondition[];
}

export interface OptimizationCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  value: number;
  timeWindow?: number; // milliseconds
}

export interface OptimizationImpact {
  expectedImprovement: {
    executionTime: number; // percentage reduction
    memoryUsage: number; // percentage reduction
    cpuUsage: number; // percentage reduction
    throughput: number; // percentage increase
  };
  actualImprovement?: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    throughput: number;
  };
  measurementPeriod?: { start: Date; end: Date };
}

export interface CacheConfiguration {
  id: string;
  name: string;
  type: CacheType;
  nodeTypes: string[];
  strategy: CacheStrategy;
  config: CacheConfig;
  metrics: CacheMetrics;
  enabled: boolean;
}

export type CacheType = 'memory' | 'redis' | 'database' | 'file' | 'distributed';

export type CacheStrategy = 'lru' | 'fifo' | 'lfu' | 'ttl' | 'write_through' | 'write_back' | 'write_around';

export interface CacheConfig {
  maxSize: number; // bytes or items
  ttl: number; // milliseconds
  evictionPolicy: string;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  replicationFactor?: number; // for distributed caches
  shardingStrategy?: 'hash' | 'range' | 'consistent_hash';
}

export interface CacheMetrics {
  hitRate: number; // percentage
  missRate: number; // percentage
  evictionRate: number; // percentage
  size: number; // current size
  utilization: number; // percentage of max size
  averageAccessTime: number; // milliseconds
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
}

export interface ResourcePool {
  id: string;
  name: string;
  type: ResourceType;
  maxSize: number;
  currentSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  config: ResourcePoolConfig;
  metrics: ResourcePoolMetrics;
}

export type ResourceType = 'database' | 'http' | 'file' | 'memory' | 'compute' | 'network';

export interface ResourcePoolConfig {
  minSize: number;
  maxSize: number;
  acquireTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  maxLifetime: number; // milliseconds
  validationQuery?: string;
  testOnBorrow: boolean;
  testOnReturn: boolean;
  testWhileIdle: boolean;
}

export interface ResourcePoolMetrics {
  utilizationRate: number; // percentage
  averageWaitTime: number; // milliseconds
  averageActiveTime: number; // milliseconds
  totalAcquisitions: number;
  totalReleases: number;
  totalTimeouts: number;
  totalErrors: number;
}

export interface LoadBalancer {
  id: string;
  name: string;
  algorithm: LoadBalancingAlgorithm;
  targets: LoadBalancerTarget[];
  healthCheck: HealthCheckConfig;
  config: LoadBalancerConfig;
  metrics: LoadBalancerMetrics;
}

export type LoadBalancingAlgorithm = 
  | 'round_robin'
  | 'least_connections'
  | 'least_response_time'
  | 'weighted_round_robin'
  | 'ip_hash'
  | 'least_bandwidth'
  | 'resource_based';

export interface LoadBalancerTarget {
  id: string;
  address: string;
  weight: number;
  status: 'healthy' | 'unhealthy' | 'draining';
  currentConnections: number;
  responseTime: number;
  errorRate: number;
  lastHealthCheck: Date;
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  unhealthyThreshold: number;
  healthyThreshold: number;
  path?: string;
  expectedStatus?: number;
}

export interface LoadBalancerConfig {
  sessionAffinity: boolean;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCompression: boolean;
  enableKeepAlive: boolean;
}

export interface LoadBalancerMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  activeConnections: number;
  bytesTransferred: number;
}

export interface PerformanceProfile {
  id: string;
  name: string;
  workflowId: string;
  nodeProfiles: NodeProfile[];
  resourceRequirements: ResourceRequirements;
  scalingRules: ScalingRule[];
  optimizations: PerformanceOptimization[];
  benchmarks: PerformanceBenchmark[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeProfile {
  nodeId: string;
  nodeType: string;
  averageExecutionTime: number;
  memoryProfile: MemoryProfile;
  cpuProfile: CpuProfile;
  ioProfile: IOProfile;
  scalabilityFactor: number; // how performance scales with input size
  dependencies: string[]; // node IDs this depends on
}

export interface MemoryProfile {
  baseUsage: number; // bytes
  peakUsage: number; // bytes
  growthRate: number; // bytes per input item
  leakDetected: boolean;
  garbageCollectionFrequency: number;
}

export interface CpuProfile {
  averageUsage: number; // percentage
  peakUsage: number; // percentage
  computeIntensity: 'low' | 'medium' | 'high' | 'extreme';
  parallelizable: boolean;
  threadSafe: boolean;
}

export interface IOProfile {
  networkRequests: number;
  diskReads: number;
  diskWrites: number;
  databaseQueries: number;
  averageIOWait: number; // milliseconds
  ioIntensity: 'low' | 'medium' | 'high';
}

export interface ResourceRequirements {
  minCpu: number; // percentage
  minMemory: number; // bytes
  minDiskSpace: number; // bytes
  minNetworkBandwidth: number; // bytes per second
  recommendedCpu: number;
  recommendedMemory: number;
  maxCpu: number;
  maxMemory: number;
}

export interface ScalingRule {
  id: string;
  metric: string;
  threshold: number;
  action: ScalingAction;
  cooldown: number; // milliseconds
  enabled: boolean;
}

export type ScalingAction = 'scale_up' | 'scale_down' | 'optimize' | 'alert' | 'throttle';

export interface PerformanceBenchmark {
  id: string;
  name: string;
  description: string;
  testData: BenchmarkTestData;
  results: BenchmarkResult[];
  baseline: BenchmarkResult;
  createdAt: Date;
}

export interface BenchmarkTestData {
  inputSize: number;
  complexity: 'simple' | 'medium' | 'complex' | 'extreme';
  dataType: string;
  concurrency: number;
}

export interface BenchmarkResult {
  timestamp: Date;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  errorRate: number;
  version: string;
  environment: string;
}

export interface PerformanceAlert {
  id: string;
  type: PerformanceAlertType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  workflowId: string;
  nodeId?: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions: PerformanceAction[];
}

export type PerformanceAlertType = 
  | 'high_cpu'
  | 'high_memory'
  | 'slow_execution'
  | 'high_error_rate'
  | 'resource_exhaustion'
  | 'bottleneck_detected'
  | 'performance_degradation'
  | 'scaling_needed';

export interface PerformanceAction {
  id: string;
  type: 'optimize' | 'scale' | 'alert' | 'throttle' | 'cache' | 'parallel';
  description: string;
  automated: boolean;
  executed: boolean;
  executedAt?: Date;
  result?: string;
}

export interface PerformanceDashboard {
  timeRange: { start: Date; end: Date };
  summary: {
    totalExecutions: number;
    averageExecutionTime: number;
    averageCpuUsage: number;
    averageMemoryUsage: number;
    bottleneckCount: number;
    optimizationCount: number;
    performanceScore: number; // 0-100
  };
  trends: {
    executionTime: TrendData[];
    resourceUsage: TrendData[];
    throughput: TrendData[];
    errorRate: TrendData[];
  };
  topBottlenecks: PerformanceBottleneck[];
  topOptimizations: PerformanceOptimization[];
  resourceUtilization: ResourceUtilization[];
  cachePerformance: CacheConfiguration[];
  alerts: PerformanceAlert[];
}

export interface TrendData {
  timestamp: Date;
  value: number;
  baseline?: number;
}

export interface ResourceUtilization {
  resource: string;
  current: number;
  maximum: number;
  utilization: number; // percentage
  trend: 'up' | 'down' | 'stable';
}

export interface PerformanceService {
  // Metrics Collection
  collectMetrics(workflowId: string, executionId?: string): Promise<PerformanceMetrics>;
  getMetrics(workflowId: string, timeRange?: { start: Date; end: Date }): Promise<PerformanceMetrics[]>;
  getNodeMetrics(nodeId: string, timeRange?: { start: Date; end: Date }): Promise<NodePerformanceMetric[]>;
  
  // Bottleneck Detection
  detectBottlenecks(workflowId: string): Promise<PerformanceBottleneck[]>;
  resolveBottleneck(bottleneckId: string): Promise<void>;
  getBottleneckHistory(workflowId: string): Promise<PerformanceBottleneck[]>;
  
  // Optimization Management
  suggestOptimizations(workflowId: string): Promise<PerformanceOptimization[]>;
  applyOptimization(optimizationId: string): Promise<void>;
  rollbackOptimization(optimizationId: string): Promise<void>;
  getOptimizationImpact(optimizationId: string): Promise<OptimizationImpact>;
  
  // Caching
  configureCaching(config: CacheConfiguration): Promise<void>;
  getCacheMetrics(cacheId: string): Promise<CacheMetrics>;
  clearCache(cacheId: string): Promise<void>;
  
  // Resource Management
  createResourcePool(config: Omit<ResourcePool, 'id' | 'metrics'>): Promise<ResourcePool>;
  getResourcePool(poolId: string): Promise<ResourcePool | null>;
  updateResourcePool(poolId: string, config: Partial<ResourcePoolConfig>): Promise<void>;
  
  // Load Balancing
  createLoadBalancer(config: Omit<LoadBalancer, 'id' | 'metrics'>): Promise<LoadBalancer>;
  updateLoadBalancer(balancerId: string, config: Partial<LoadBalancerConfig>): Promise<void>;
  getLoadBalancerMetrics(balancerId: string): Promise<LoadBalancerMetrics>;
  
  // Performance Profiling
  createPerformanceProfile(workflowId: string): Promise<PerformanceProfile>;
  updatePerformanceProfile(profileId: string, updates: Partial<PerformanceProfile>): Promise<void>;
  runBenchmark(profileId: string, testData: BenchmarkTestData): Promise<BenchmarkResult>;
  
  // Alerts and Monitoring
  createPerformanceAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp'>): Promise<PerformanceAlert>;
  acknowledgeAlert(alertId: string, userId: string): Promise<void>;
  resolveAlert(alertId: string): Promise<void>;
  getActiveAlerts(workflowId?: string): Promise<PerformanceAlert[]>;
  
  // Dashboard and Reporting
  getPerformanceDashboard(timeRange: { start: Date; end: Date }, workflowId?: string): Promise<PerformanceDashboard>;
  generatePerformanceReport(workflowId: string, timeRange: { start: Date; end: Date }): Promise<string>;
  exportMetrics(workflowId: string, format: 'csv' | 'json'): Promise<string>;
}