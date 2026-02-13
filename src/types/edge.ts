/**
 * Edge Computing Type Definitions
 * Comprehensive types for edge runtime, hybrid execution, and device management
 */

export interface EdgeDevice {
  id: string;
  name: string;
  type: 'raspberry-pi' | 'industrial-gateway' | 'iot-hub' | 'arm-server' | 'custom';
  platform: 'linux-arm64' | 'linux-x64' | 'deno' | 'node';
  status: 'online' | 'offline' | 'syncing' | 'error';
  capabilities: {
    cpu: {
      cores: number;
      architecture: string;
      clockSpeed: number; // MHz
    };
    memory: {
      total: number; // MB
      available: number; // MB
    };
    storage: {
      total: number; // GB
      available: number; // GB
    };
    network: {
      type: 'ethernet' | 'wifi' | 'cellular' | '5g';
      bandwidth: number; // Mbps
      latency: number; // ms
    };
  };
  location?: {
    lat: number;
    lon: number;
    name: string;
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastSeen: Date;
}

export interface EdgeRuntime {
  id: string;
  deviceId: string;
  version: string;
  workflowCount: number;
  uptime: number; // seconds
  metrics: EdgeMetrics;
  configuration: EdgeRuntimeConfig;
}

export interface EdgeRuntimeConfig {
  maxMemory: number; // MB
  maxCpu: number; // percentage
  offlineBufferSize: number; // events
  syncInterval: number; // seconds
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface EdgeMetrics {
  timestamp: Date;
  cpu: {
    usage: number; // percentage
    temperature?: number; // celsius
  };
  memory: {
    used: number; // MB
    available: number; // MB
    usage: number; // percentage
  };
  storage: {
    used: number; // GB
    available: number; // GB
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    latency: number; // ms
    packetsDropped: number;
  };
  workflows: {
    active: number;
    executions: number;
    errors: number;
    avgExecutionTime: number; // ms
  };
}

export interface CompiledWorkflow {
  id: string;
  name: string;
  version: string;
  compiled: {
    code: string; // Minified JavaScript/TypeScript
    size: number; // bytes
    checksum: string;
  };
  dependencies: string[];
  targetPlatform: 'node' | 'deno' | 'browser';
  optimization: {
    level: 'none' | 'basic' | 'aggressive';
    minified: boolean;
    treeShaken: boolean;
  };
  metadata: {
    compiledAt: Date;
    compiler: string;
    sourceNodes: number;
    targetSize: number;
  };
}

export interface ExecutionDecision {
  workflowId: string;
  nodeId: string;
  location: 'edge' | 'cloud' | 'hybrid';
  reasoning: {
    latencyRequirement: number; // ms
    dataSize: number; // bytes
    networkAvailable: boolean;
    deviceCapable: boolean;
    costOptimized: boolean;
  };
  confidence: number; // 0-1
  estimatedLatency: number; // ms
}

export interface SyncOperation {
  id: string;
  type: 'push' | 'pull' | 'bidirectional';
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';
  deviceId: string;
  dataType: 'workflow' | 'execution' | 'metrics' | 'logs';
  payload: unknown;
  size: number; // bytes
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SyncConflict {
  id: string;
  syncOperationId: string;
  type: 'data-mismatch' | 'version-conflict' | 'concurrent-modification';
  localData: unknown;
  remoteData: unknown;
  resolution?: 'local-wins' | 'remote-wins' | 'merge' | 'manual';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface OfflineBuffer {
  deviceId: string;
  events: OfflineEvent[];
  size: number; // bytes
  maxSize: number; // bytes
  oldestEvent: Date;
  newestEvent: Date;
}

export interface OfflineEvent {
  id: string;
  type: 'execution' | 'metric' | 'log' | 'error';
  timestamp: Date;
  data: unknown;
  size: number; // bytes
  synced: boolean;
  retryCount: number;
}

export interface HybridExecutionPlan {
  workflowId: string;
  executionId: string;
  strategy: 'edge-first' | 'cloud-first' | 'split' | 'dynamic';
  edgeNodes: string[];
  cloudNodes: string[];
  dataTransfers: DataTransfer[];
  estimatedLatency: number; // ms
  estimatedCost: number; // USD
  reasoning: string;
}

export interface DataTransfer {
  from: string;
  to: string;
  size: number; // bytes
  compressed: boolean;
  encrypted: boolean;
  estimatedDuration: number; // ms
}

export interface DeviceGroup {
  id: string;
  name: string;
  description: string;
  deviceIds: string[];
  tags: string[];
  deployments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OTAUpdate {
  id: string;
  version: string;
  deviceIds: string[];
  updateType: 'runtime' | 'workflow' | 'configuration' | 'full';
  package: {
    url: string;
    size: number; // bytes
    checksum: string;
  };
  status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed' | 'rollback';
  progress: number; // percentage
  rollbackVersion?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface EdgeDeployment {
  id: string;
  workflowId: string;
  targetDevices: string[];
  status: 'preparing' | 'compiling' | 'deploying' | 'active' | 'failed' | 'retired';
  compiledWorkflow: CompiledWorkflow;
  deploymentPlan: {
    targetPlatform: string;
    requiredCapabilities: string[];
    resourceLimits: {
      maxMemory: number;
      maxCpu: number;
    };
  };
  deployedDevices: string[];
  failedDevices: Array<{
    deviceId: string;
    error: string;
  }>;
  createdAt: Date;
  deployedAt?: Date;
  metrics?: {
    totalExecutions: number;
    avgLatency: number;
    errorRate: number;
  };
}

export interface EdgePlatformIntegration {
  type: 'aws-greengrass' | 'azure-iot-edge' | 'gcp-edge' | 'k3s' | 'custom';
  configuration: {
    endpoint: string;
    region?: string;
    credentials: unknown;
    settings: Record<string, unknown>;
  };
  status: 'connected' | 'disconnected' | 'error';
  devices: string[];
  lastSync: Date;
}

export interface LatencyBenchmark {
  deviceId: string;
  workflowId: string;
  measurements: {
    edge: number[]; // ms
    cloud: number[]; // ms
    hybrid: number[]; // ms
  };
  statistics: {
    edge: LatencyStats;
    cloud: LatencyStats;
    hybrid: LatencyStats;
  };
  improvement: {
    edgeVsCloud: number; // percentage
    hybridVsCloud: number; // percentage
  };
  timestamp: Date;
}

export interface LatencyStats {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export interface EdgeWorkflowExecution {
  id: string;
  workflowId: string;
  deviceId: string;
  status: 'running' | 'completed' | 'failed' | 'offline-buffered';
  startTime: Date;
  endTime?: Date;
  duration?: number; // ms
  location: 'edge' | 'cloud' | 'hybrid';
  results?: unknown;
  error?: string;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    networkUsage: number;
    latency: number;
  };
  offlineMode: boolean;
  syncedAt?: Date;
}

export interface BandwidthSavings {
  deviceId: string;
  period: {
    start: Date;
    end: Date;
  };
  baseline: {
    totalBytes: number; // Cloud-only scenario
  };
  actual: {
    edgeBytes: number;
    cloudBytes: number;
    totalBytes: number;
  };
  savings: {
    bytes: number;
    percentage: number;
    cost: number; // USD
  };
}
