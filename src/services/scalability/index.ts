/**
 * PLAN C PHASE 4 - Scalability Services Export
 * Point d'entrée central pour tous les services de scalabilité
 * Architecture micro-services complète pour 10K+ utilisateurs
 */

// ============================================
// Core Scalability Components
// ============================================

export {
  // Worker Pool
  DistributedWorkerPool,
  workerPool,
  type WorkerConfig,
  type WorkerTask,
  type WorkerInstance,
  type WorkerPerformance,
  type PoolMetrics,
  type TaskResult
} from './WorkerPool';

export {
  // Distributed Queue
  DistributedQueue,
  QueueManager,
  queueManager,
  type QueueConfig,
  type Message,
  type MessageMetadata,
  type QueueStats,
  type ConsumerOptions,
  type ProducerOptions,
  type MessageHandler,
  type QueueBinding
} from './DistributedQueue';

export {
  // Load Balancer
  IntelligentLoadBalancer,
  loadBalancer,
  type ServerNode,
  type HealthStatus,
  type NodeMetrics,
  type NodeMetadata,
  type LoadBalancerConfig,
  type BalancingStrategy,
  type Request,
  type Response,
  type RoutingDecision,
  type LoadBalancerStats
} from './LoadBalancer';

export {
  // Auto Scaler
  IntelligentAutoScaler,
  autoScaler,
  type AutoScalerConfig,
  type ScalingPolicy,
  type ScalingRule,
  type ScheduleEntry,
  type Instance,
  type ResourceAllocation,
  type InstanceMetrics,
  type ScalingMetrics,
  type ScalingDecision,
  type PredictionData
} from './AutoScaler';

export {
  // GraphQL Federation
  GraphQLFederationGateway,
  federationGateway,
  type ServiceDefinition,
  type ServiceHealth,
  type ServiceMetadata,
  type FederationConfig,
  type GatewayConfig,
  type PollingConfig,
  type CachingConfig,
  type SecurityConfig,
  type RateLimitConfig,
  type CorsConfig,
  type QueryPlan,
  type ServiceExecution,
  type ExecutionResult,
  type GraphQLError,
  type Extensions,
  type TracingData,
  type MetricsData,
  type CacheData
} from './GraphQLFederation';

// ============================================
// Unified Scalability Manager
// ============================================

import { EventEmitter } from 'events';
import { workerPool } from './WorkerPool';
import { queueManager } from './DistributedQueue';
import { loadBalancer } from './LoadBalancer';
import { autoScaler } from './AutoScaler';
import { federationGateway } from './GraphQLFederation';

export interface ScalabilityConfig {
  enableWorkerPool?: boolean;
  enableQueue?: boolean;
  enableLoadBalancer?: boolean;
  enableAutoScaling?: boolean;
  enableFederation?: boolean;
  monitoring?: {
    enabled: boolean;
    interval: number;
  };
}

export interface ScalabilityStatus {
  workers: {
    active: boolean;
    metrics?: any;
  };
  queues: {
    active: boolean;
    stats?: any;
  };
  loadBalancer: {
    active: boolean;
    nodes?: number;
    stats?: any;
  };
  autoScaler: {
    active: boolean;
    instances?: number;
    metrics?: any;
  };
  federation: {
    active: boolean;
    services?: number;
  };
}

/**
 * Unified manager for all scalability services
 */
export class ScalabilityManager extends EventEmitter {
  private config: ScalabilityConfig;
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config?: ScalabilityConfig) {
    super();
    this.config = {
      enableWorkerPool: config?.enableWorkerPool !== false,
      enableQueue: config?.enableQueue !== false,
      enableLoadBalancer: config?.enableLoadBalancer !== false,
      enableAutoScaling: config?.enableAutoScaling !== false,
      enableFederation: config?.enableFederation !== false,
      monitoring: {
        enabled: config?.monitoring?.enabled !== false,
        interval: config?.monitoring?.interval || 30000
      }
    };
  }

  /**
   * Start all enabled scalability services
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    const startPromises: Promise<void>[] = [];

    // Start Worker Pool
    if (this.config.enableWorkerPool) {
      startPromises.push(
        workerPool.start().then(() => {
          this.emit('service:started', { service: 'WorkerPool' });
        })
      );
    }

    // Start Auto Scaler (should be started before load balancer)
    if (this.config.enableAutoScaling) {
      startPromises.push(
        autoScaler.start().then(() => {
          this.emit('service:started', { service: 'AutoScaler' });
        })
      );
    }

    // Start Load Balancer
    if (this.config.enableLoadBalancer) {
      // Add initial nodes
      loadBalancer.addNode({
        host: 'localhost',
        port: 3001,
        weight: 1
      });
      loadBalancer.addNode({
        host: 'localhost',
        port: 3002,
        weight: 1
      });
      this.emit('service:started', { service: 'LoadBalancer' });
    }

    // Start Federation Gateway
    if (this.config.enableFederation) {
      startPromises.push(
        federationGateway.start().then(() => {
          this.emit('service:started', { service: 'FederationGateway' });
        })
      );
    }

    // Initialize Queues
    if (this.config.enableQueue) {
      // Create default queues
      queueManager.createQueue('high-priority', {
        maxSize: 1000,
        persistence: true
      });
      queueManager.createQueue('normal-priority', {
        maxSize: 5000
      });
      queueManager.createQueue('low-priority', {
        maxSize: 10000
      });
      this.emit('service:started', { service: 'QueueManager' });
    }

    await Promise.all(startPromises);

    // Start monitoring
    if (this.config.monitoring?.enabled) {
      this.startMonitoring();
    }

    this.emit('scalability:ready', this.getStatus());
  }

  /**
   * Stop all scalability services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    const stopPromises: Promise<void>[] = [];

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Stop services
    if (this.config.enableWorkerPool) {
      stopPromises.push(workerPool.stop());
    }

    if (this.config.enableAutoScaling) {
      stopPromises.push(autoScaler.stop());
    }

    if (this.config.enableLoadBalancer) {
      loadBalancer.destroy();
    }

    if (this.config.enableFederation) {
      stopPromises.push(federationGateway.stop());
    }

    await Promise.all(stopPromises);

    this.emit('scalability:stopped');
  }

  /**
   * Get current status of all services
   */
  getStatus(): ScalabilityStatus {
    return {
      workers: {
        active: this.config.enableWorkerPool || false,
        metrics: this.config.enableWorkerPool ? workerPool.getMetrics() : undefined
      },
      queues: {
        active: this.config.enableQueue || false,
        stats: this.config.enableQueue ? queueManager.getGlobalStats() : undefined
      },
      loadBalancer: {
        active: this.config.enableLoadBalancer || false,
        nodes: this.config.enableLoadBalancer ? loadBalancer.getNodes().length : undefined,
        stats: this.config.enableLoadBalancer ? loadBalancer.getStats() : undefined
      },
      autoScaler: {
        active: this.config.enableAutoScaling || false,
        instances: this.config.enableAutoScaling ? autoScaler.getInstances().length : undefined,
        metrics: this.config.enableAutoScaling ? autoScaler.getMetrics() : undefined
      },
      federation: {
        active: this.config.enableFederation || false,
        services: this.config.enableFederation ? federationGateway.getServiceStatus().length : undefined
      }
    };
  }

  /**
   * Scale to specific number of instances
   */
  async scaleTo(instances: number): Promise<void> {
    if (!this.config.enableAutoScaling) {
      throw new Error('Auto-scaling is not enabled');
    }
    
    await autoScaler.scaleTo(instances);
  }

  /**
   * Submit task to worker pool
   */
  async submitTask(type: string, payload: any, options?: any): Promise<string> {
    if (!this.config.enableWorkerPool) {
      throw new Error('Worker pool is not enabled');
    }
    
    return workerPool.submitTask(type, payload, options);
  }

  /**
   * Send message to queue
   */
  async sendToQueue(queueName: string, payload: any, options?: any): Promise<string> {
    if (!this.config.enableQueue) {
      throw new Error('Queue system is not enabled');
    }
    
    const queue = queueManager.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    return queue.send(payload, options);
  }

  /**
   * Route request through load balancer
   */
  async route(request: any): Promise<any> {
    if (!this.config.enableLoadBalancer) {
      throw new Error('Load balancer is not enabled');
    }
    
    return loadBalancer.route(request);
  }

  /**
   * Execute GraphQL query through federation
   */
  async executeQuery(query: string, variables?: any): Promise<any> {
    if (!this.config.enableFederation) {
      throw new Error('Federation gateway is not enabled');
    }
    
    return federationGateway.execute(query, variables);
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const status = this.getStatus();
      
      // Emit metrics
      this.emit('metrics:collected', status);
      
      // Check for issues
      this.checkHealth(status);
    }, this.config.monitoring!.interval);
  }

  private checkHealth(status: ScalabilityStatus): void {
    const issues: string[] = [];
    
    // Check worker pool
    if (status.workers.active && status.workers.metrics) {
      if (status.workers.metrics.failedTasks > 100) {
        issues.push('High number of failed tasks in worker pool');
      }
    }
    
    // Check queues
    if (status.queues.active && status.queues.stats) {
      for (const [name, stats] of Object.entries(status.queues.stats)) {
        if ((stats as any).errorRate > 10) {
          issues.push(`High error rate in queue ${name}`);
        }
      }
    }
    
    // Check load balancer
    if (status.loadBalancer.active && status.loadBalancer.stats) {
      if ((status.loadBalancer.stats as any).errorRate > 5) {
        issues.push('High error rate in load balancer');
      }
    }
    
    // Check auto scaler
    if (status.autoScaler.active && status.autoScaler.metrics) {
      if ((status.autoScaler.metrics as any).avgCpuUsage > 80) {
        issues.push('High CPU usage detected');
      }
    }
    
    if (issues.length > 0) {
      this.emit('health:issues', issues);
    }
  }
}

// Export singleton manager
export const scalabilityManager = new ScalabilityManager({
  enableWorkerPool: true,
  enableQueue: true,
  enableLoadBalancer: true,
  enableAutoScaling: true,
  enableFederation: true,
  monitoring: {
    enabled: true,
    interval: 30000
  }
});

// ============================================
// Utility Functions
// ============================================

/**
 * Initialize all scalability services with optimal configuration
 */
export async function initializeScalability(config?: ScalabilityConfig): Promise<ScalabilityManager> {
  const manager = new ScalabilityManager(config);
  await manager.start();
  return manager;
}

/**
 * Get recommended configuration based on expected load
 */
export function getRecommendedConfig(expectedUsers: number): ScalabilityConfig {
  if (expectedUsers < 100) {
    return {
      enableWorkerPool: true,
      enableQueue: true,
      enableLoadBalancer: false,
      enableAutoScaling: false,
      enableFederation: false
    };
  } else if (expectedUsers < 1000) {
    return {
      enableWorkerPool: true,
      enableQueue: true,
      enableLoadBalancer: true,
      enableAutoScaling: false,
      enableFederation: false
    };
  } else if (expectedUsers < 10000) {
    return {
      enableWorkerPool: true,
      enableQueue: true,
      enableLoadBalancer: true,
      enableAutoScaling: true,
      enableFederation: false
    };
  } else {
    return {
      enableWorkerPool: true,
      enableQueue: true,
      enableLoadBalancer: true,
      enableAutoScaling: true,
      enableFederation: true
    };
  }
}

// Default export
export default scalabilityManager;