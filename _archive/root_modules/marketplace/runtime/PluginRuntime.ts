import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as vm from 'vm';

export interface PluginContext {
  id: string;
  name: string;
  version: string;
  instanceId: string;
  permissions: PluginPermission[];
  config: { [key: string]: unknown };
  resources: ResourceLimits;
  sandbox: SandboxEnvironment;
  api: PluginAPI;
  storage: PluginStorage;
  events: PluginEventBus;
  logger: PluginLogger;
  metrics: PluginMetrics;
}

export interface PluginPermission {
  type: 'api' | 'filesystem' | 'network' | 'database' | 'system' | 'workflow';
  resource: string;
  actions: ('read' | 'write' | 'execute' | 'delete')[];
  granted: boolean;
  grantedAt?: number;
  grantedBy?: string;
}

export interface ResourceLimits {
  cpu: {
    maxUsage: number; // Percentage
    currentUsage: number;
    throttled: boolean;
  };
  memory: {
    maxHeap: number; // Bytes
    currentHeap: number;
    maxRSS: number;
    currentRSS: number;
  };
  storage: {
    maxSize: number; // Bytes
    currentSize: number;
    maxFiles: number;
    currentFiles: number;
  };
  network: {
    maxBandwidth: number; // Bytes/sec
    currentBandwidth: number;
    maxConnections: number;
    currentConnections: number;
  };
  execution: {
    maxTime: number; // Milliseconds
    currentTime: number;
    maxCalls: number;
    currentCalls: number;
  };
}

export interface SandboxEnvironment {
  global: unknown;
  context: vm.Context;
  restrictions: {
    allowedModules: string[];
    blockedGlobals: string[];
    timeoutMs: number;
    memoryLimit: number;
  };
  isolation: {
    filesystem: boolean;
    network: boolean;
    processes: boolean;
  };
}

export interface PluginInstance {
  id: string;
  pluginId: string;
  name: string;
  version: string;
  status: 'initializing' | 'running' | 'suspended' | 'stopped' | 'error';
  context: PluginContext;
  module: unknown;
  metadata: {
    startedAt: number;
    lastActivity: number;
    executions: number;
    errors: number;
    warnings: number;
  };
  health: {
    score: number;
    checks: HealthCheck[];
    lastCheck: number;
  };
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  timestamp: number;
  details?: unknown;
}

export interface ExecutionResult {
  success: boolean;
  result?: unknown;
  error?: Error;
  metrics: {
    duration: number;
    memoryUsed: number;
    cpuUsed: number;
    networkCalls: number;
  };
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  source: string;
}

export interface PluginRuntimeConfig {
  maxInstances: number;
  defaultTimeout: number;
  maxMemoryPerInstance: number;
  maxCpuPerInstance: number;
  sandboxing: {
    enabled: boolean;
    strictMode: boolean;
    allowedModules: string[];
    blockedGlobals: string[];
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    healthCheckInterval: number;
    alertThresholds: {
      memory: number;
      cpu: number;
      errors: number;
    };
  };
  security: {
    codeValidation: boolean;
    permissionEnforcement: boolean;
    resourceLimits: boolean;
    auditLogging: boolean;
  };
}

export class PluginRuntime extends EventEmitter {
  private config: PluginRuntimeConfig;
  private instances: Map<string, PluginInstance> = new Map();
  private moduleCache: Map<string, unknown> = new Map();
  private resourceMonitor: ResourceMonitor;
  private securityManager: SecurityManager;
  private apiRegistry: APIRegistry;
  private isInitialized = false;
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: PluginRuntimeConfig) {
    super();
    this.config = config;
    this.resourceMonitor = new ResourceMonitor(config.monitoring);
    this.securityManager = new SecurityManager(config.security);
    this.apiRegistry = new APIRegistry();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize security manager
      await this.securityManager.initialize();
      
      // Initialize API registry
      await this.apiRegistry.initialize();
      
      // Initialize resource monitor
      await this.resourceMonitor.initialize();
      
      // Start monitoring
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }

      this.isInitialized = true;
      this.emit('initialized');

    } catch (error) {
      this.emit('initialization:error', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    // Stop all instances
    const stopPromises = Array.from(this.instances.values()).map(instance => 
      this.stopInstance(instance.id)
    );
    await Promise.all(stopPromises);

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Shutdown components
    await this.resourceMonitor.shutdown();
    await this.securityManager.shutdown();
    await this.apiRegistry.shutdown();

    this.isInitialized = false;
    this.emit('shutdown');
  }

  // Instance Management
  public async createInstance(
    pluginId: string,
    code: string,
    config: unknown = {},
    permissions: PluginPermission[] = []
  ): Promise<string> {
    if (this.instances.size >= this.config.maxInstances) {
      throw new Error(`Maximum instances limit reached: ${this.config.maxInstances}`);
    }

    const instanceId = crypto.randomUUID();
    
    try {
      // Validate code
      if (this.config.security.codeValidation) {
        await this.securityManager.validateCode(code);
      }

      // Create sandbox
      const sandbox = await this.createSandbox(instanceId, permissions);
      
      // Create context
      const context = await this.createPluginContext(instanceId, pluginId, config, permissions, sandbox);
      
      // Create instance
      const instance: PluginInstance = {
        id: instanceId,
        pluginId,
        name: config.name || pluginId,
        version: config.version || '1.0.0',
        status: 'initializing',
        context,
        module: null,
        metadata: {
          startedAt: Date.now(),
          lastActivity: Date.now(),
          executions: 0,
          errors: 0,
          warnings: 0
        },
        health: {
          score: 100,
          checks: [],
          lastCheck: Date.now()
        }
      };

      // Load and execute plugin code
      instance.module = await this.loadPluginModule(code, context);
      instance.status = 'running';

      this.instances.set(instanceId, instance);
      this.emit('instance:created', instance);

      return instanceId;

    } catch (error) {
      this.emit('instance:creation:failed', { pluginId, error });
      throw error;
    }
  }

  public async executePlugin(
    instanceId: string,
    method: string,
    args: unknown[] = [],
    options: { timeout?: number } = {}
  ): Promise<ExecutionResult> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Plugin instance not found: ${instanceId}`);
    }

    if (instance.status !== 'running') {
      throw new Error(`Plugin instance is not running: ${instance.status}`);
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const networkCalls = 0;
    const logs: LogEntry[] = [];

    try {
      // Check resource limits
      await this.checkResourceLimits(instance);

      // Setup execution context
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push({
          timestamp: Date.now(),
          level: 'info',
          message: args.join(' '),
          source: instanceId
        });
      };

      // Execute with timeout
      const timeout = options.timeout || this.config.defaultTimeout;
      const executionPromise = this.executeInSandbox(instance, method, args);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), timeout);
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Restore console
      console.log = originalLog;

      // Update metrics
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      instance.metadata.executions++;
      instance.metadata.lastActivity = endTime;

      const executionResult: ExecutionResult = {
        success: true,
        result,
        metrics: {
          duration: endTime - startTime,
          memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
          cpuUsed: 0, // Would measure actual CPU usage
          networkCalls
        },
        logs
      };

      this.emit('execution:completed', { instance, result: executionResult });
      return executionResult;

    } catch (error) {
      // Restore console
      console.log = (...args: unknown[]) => {
        logs.push({
          timestamp: Date.now(),
          level: 'error',
          message: args.join(' '),
          source: instanceId
        });
      };

      instance.metadata.errors++;
      
      const executionResult: ExecutionResult = {
        success: false,
        error,
        metrics: {
          duration: Date.now() - startTime,
          memoryUsed: process.memoryUsage().heapUsed - startMemory.heapUsed,
          cpuUsed: 0,
          networkCalls
        },
        logs
      };

      this.emit('execution:failed', { instance, error, result: executionResult });
      return executionResult;
    }
  }

  public async stopInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Plugin instance not found: ${instanceId}`);
    }

    try {
      // Call cleanup if available
      if (instance.module && typeof instance.module.cleanup === 'function') {
        await instance.module.cleanup();
      }

      instance.status = 'stopped';
      this.instances.delete(instanceId);

      this.emit('instance:stopped', instance);

    } catch (error) {
      this.emit('instance:stop:failed', { instance, error });
      throw error;
    }
  }

  public async suspendInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Plugin instance not found: ${instanceId}`);
    }

    instance.status = 'suspended';
    this.emit('instance:suspended', instance);
  }

  public async resumeInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Plugin instance not found: ${instanceId}`);
    }

    if (instance.status !== 'suspended') {
      throw new Error(`Instance is not suspended: ${instance.status}`);
    }

    instance.status = 'running';
    this.emit('instance:resumed', instance);
  }

  // Instance Information
  public getInstance(instanceId: string): PluginInstance | null {
    return this.instances.get(instanceId) || null;
  }

  public getAllInstances(): PluginInstance[] {
    return Array.from(this.instances.values());
  }

  public getInstancesByPlugin(pluginId: string): PluginInstance[] {
    return Array.from(this.instances.values()).filter(i => i.pluginId === pluginId);
  }

  public getRunningInstances(): PluginInstance[] {
    return Array.from(this.instances.values()).filter(i => i.status === 'running');
  }

  // Health and Monitoring
  public async performHealthCheck(instanceId: string): Promise<HealthCheck[]> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Plugin instance not found: ${instanceId}`);
    }

    const checks: HealthCheck[] = [];

    // Memory check
    const memoryUsage = instance.context.resources.memory.currentHeap / instance.context.resources.memory.maxHeap;
    checks.push({
      name: 'memory',
      status: memoryUsage > 0.9 ? 'fail' : memoryUsage > 0.7 ? 'warn' : 'pass',
      message: `Memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
      timestamp: Date.now(),
      details: { usage: memoryUsage }
    });

    // CPU check
    const cpuUsage = instance.context.resources.cpu.currentUsage / instance.context.resources.cpu.maxUsage;
    checks.push({
      name: 'cpu',
      status: cpuUsage > 0.9 ? 'fail' : cpuUsage > 0.7 ? 'warn' : 'pass',
      message: `CPU usage: ${(cpuUsage * 100).toFixed(1)}%`,
      timestamp: Date.now(),
      details: { usage: cpuUsage }
    });

    // Error rate check
    const errorRate = instance.metadata.errors / Math.max(instance.metadata.executions, 1);
    checks.push({
      name: 'error_rate',
      status: errorRate > 0.1 ? 'fail' : errorRate > 0.05 ? 'warn' : 'pass',
      message: `Error rate: ${(errorRate * 100).toFixed(1)}%`,
      timestamp: Date.now(),
      details: { rate: errorRate }
    });

    // Response time check (if plugin has health check method)
    if (instance.module && typeof instance.module.healthCheck === 'function') {
      try {
        const startTime = Date.now();
        await instance.module.healthCheck();
        const responseTime = Date.now() - startTime;
        
        checks.push({
          name: 'response_time',
          status: responseTime > 5000 ? 'fail' : responseTime > 1000 ? 'warn' : 'pass',
          message: `Response time: ${responseTime}ms`,
          timestamp: Date.now(),
          details: { responseTime }
        });
      } catch (error) {
        checks.push({
          name: 'health_check',
          status: 'fail',
          message: `Health check failed: ${error.message}`,
          timestamp: Date.now(),
          details: { error: error.message }
        });
      }
    }

    // Calculate overall health score
    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const _failCount = checks.filter(c => c.status === 'fail').length; // eslint-disable-line @typescript-eslint/no-unused-vars
    
    instance.health.score = Math.floor(((passCount * 100) + (warnCount * 50)) / checks.length);
    instance.health.checks = checks;
    instance.health.lastCheck = Date.now();

    return checks;
  }

  public async getMetrics(instanceId: string): Promise<unknown> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Plugin instance not found: ${instanceId}`);
    }

    return {
      instance: {
        id: instance.id,
        pluginId: instance.pluginId,
        status: instance.status,
        uptime: Date.now() - instance.metadata.startedAt
      },
      executions: {
        total: instance.metadata.executions,
        errors: instance.metadata.errors,
        warnings: instance.metadata.warnings,
        successRate: (instance.metadata.executions - instance.metadata.errors) / Math.max(instance.metadata.executions, 1)
      },
      resources: instance.context.resources,
      health: instance.health
    };
  }

  // Helper Methods
  private async createSandbox(instanceId: string, permissions: PluginPermission[]): Promise<SandboxEnvironment> {
    const allowedModules = this.config.sandboxing.allowedModules.filter(module => 
      permissions.some(p => p.type === 'system' && p.resource === module && p.granted)
    );

    const context = vm.createContext({
      console,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      Buffer,
      process: {
        env: {},
        version: process.version,
        platform: process.platform
      }
    });

    return {
      global: context,
      context,
      restrictions: {
        allowedModules,
        blockedGlobals: this.config.sandboxing.blockedGlobals,
        timeoutMs: this.config.defaultTimeout,
        memoryLimit: this.config.maxMemoryPerInstance
      },
      isolation: {
        filesystem: true,
        network: true,
        processes: true
      }
    };
  }

  private async createPluginContext(
    instanceId: string,
    pluginId: string,
    config: unknown,
    permissions: PluginPermission[],
    sandbox: SandboxEnvironment
  ): Promise<PluginContext> {
    return {
      id: pluginId,
      name: config.name || pluginId,
      version: config.version || '1.0.0',
      instanceId,
      permissions,
      config,
      resources: {
        cpu: {
          maxUsage: this.config.maxCpuPerInstance,
          currentUsage: 0,
          throttled: false
        },
        memory: {
          maxHeap: this.config.maxMemoryPerInstance,
          currentHeap: 0,
          maxRSS: this.config.maxMemoryPerInstance * 2,
          currentRSS: 0
        },
        storage: {
          maxSize: 100 * 1024 * 1024, // 100MB
          currentSize: 0,
          maxFiles: 1000,
          currentFiles: 0
        },
        network: {
          maxBandwidth: 10 * 1024 * 1024, // 10MB/s
          currentBandwidth: 0,
          maxConnections: 10,
          currentConnections: 0
        },
        execution: {
          maxTime: this.config.defaultTimeout,
          currentTime: 0,
          maxCalls: 1000,
          currentCalls: 0
        }
      },
      sandbox,
      api: this.apiRegistry.createAPI(instanceId, permissions),
      storage: new PluginStorage(instanceId),
      events: new PluginEventBus(instanceId),
      logger: new PluginLogger(instanceId),
      metrics: new PluginMetrics(instanceId)
    };
  }

  private async loadPluginModule(code: string, context: PluginContext): Promise<unknown> {
    try {
      // Wrap code in module format
      const wrappedCode = `
        (function(exports, require, module, __filename, __dirname, context) {
          ${code}
        })
      `;

      // Compile code
      const compiledWrapper = vm.runInContext(wrappedCode, context.sandbox.context);
      
      // Create module object
      const module = { exports: {} };
      const require = this.createRequireFunction(context);
      
      // Execute code
      compiledWrapper(
        module.exports,
        require,
        module,
        'plugin.js',
        '/plugins',
        context
      );

      return module.exports;

    } catch (error) {
      throw new Error(`Failed to load plugin module: ${error.message}`);
    }
  }

  private createRequireFunction(context: PluginContext): (id: string) => unknown {
    return (id: string) => {
      // Check if module is allowed
      if (!context.sandbox.restrictions.allowedModules.includes(id)) {
        throw new Error(`Module not allowed: ${id}`);
      }

      // Check permissions
      const hasPermission = context.permissions.some(p => 
        p.type === 'system' && p.resource === id && p.granted
      );
      
      if (!hasPermission) {
        throw new Error(`No permission to access module: ${id}`);
      }

      // Load module (mock implementation)
      switch (id) {
        case 'events':
          return EventEmitter;
        case 'crypto':
          return crypto;
        case 'util':
          return { promisify: (fn: (...args: unknown[]) => unknown) => fn };
        default:
          throw new Error(`Module not found: ${id}`);
      }
    };
  }

  private async executeInSandbox(instance: PluginInstance, method: string, args: unknown[]): Promise<unknown> {
    if (!instance.module || typeof instance.module[method] !== 'function') {
      throw new Error(`Method not found: ${method}`);
    }

    // Update resource tracking
    instance.context.resources.execution.currentCalls++;
    const startTime = Date.now();

    try {
      const result = await instance.module[method](...args);
      
      // Update execution time
      instance.context.resources.execution.currentTime += Date.now() - startTime;
      
      return result;
    } catch (error) {
      instance.context.resources.execution.currentTime += Date.now() - startTime;
      throw error;
    }
  }

  private async checkResourceLimits(instance: PluginInstance): Promise<void> {
    const resources = instance.context.resources;

    // Check execution limits
    if (resources.execution.currentCalls >= resources.execution.maxCalls) {
      throw new Error('Execution call limit exceeded');
    }

    if (resources.execution.currentTime >= resources.execution.maxTime) {
      throw new Error('Execution time limit exceeded');
    }

    // Check memory limits
    if (resources.memory.currentHeap >= resources.memory.maxHeap) {
      throw new Error('Memory limit exceeded');
    }

    // Check CPU limits
    if (resources.cpu.throttled) {
      throw new Error('CPU limit exceeded - instance throttled');
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.updateResourceMetrics();
    }, this.config.monitoring.metricsInterval);

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.monitoring.healthCheckInterval);
  }

  private async updateResourceMetrics(): Promise<void> {
    for (const instance of this.instances.values()) {
      try {
        // Update memory usage
        const memoryUsage = process.memoryUsage();
        instance.context.resources.memory.currentHeap = memoryUsage.heapUsed;
        instance.context.resources.memory.currentRSS = memoryUsage.rss;

        // Reset execution counters periodically
        instance.context.resources.execution.currentCalls = 0;
        instance.context.resources.execution.currentTime = 0;

      } catch (error) {
        this.emit('monitoring:error', { instance, error });
      }
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const instance of this.instances.values()) {
      if (instance.status === 'running') {
        try {
          await this.performHealthCheck(instance.id);
          
          // Check if alerts should be triggered
          const alerts = this.checkAlertThresholds(instance);
          if (alerts.length > 0) {
            this.emit('alerts:triggered', { instance, alerts });
          }
          
        } catch (error) {
          this.emit('health-check:error', { instance, error });
        }
      }
    }
  }

  private checkAlertThresholds(instance: PluginInstance): string[] {
    const alerts: string[] = [];
    const thresholds = this.config.monitoring.alertThresholds;

    // Memory alert
    const memoryUsage = instance.context.resources.memory.currentHeap / instance.context.resources.memory.maxHeap;
    if (memoryUsage > thresholds.memory) {
      alerts.push(`High memory usage: ${(memoryUsage * 100).toFixed(1)}%`);
    }

    // CPU alert
    const cpuUsage = instance.context.resources.cpu.currentUsage / instance.context.resources.cpu.maxUsage;
    if (cpuUsage > thresholds.cpu) {
      alerts.push(`High CPU usage: ${(cpuUsage * 100).toFixed(1)}%`);
    }

    // Error rate alert
    const errorRate = instance.metadata.errors / Math.max(instance.metadata.executions, 1);
    if (errorRate > thresholds.errors) {
      alerts.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    }

    return alerts;
  }
}

// Helper Classes
class ResourceMonitor {
  constructor(private config: unknown) {}
  
  async initialize(): Promise<void> {
    console.log('Resource monitor initialized');
  }
  
  async shutdown(): Promise<void> {
    console.log('Resource monitor shutdown');
  }
}

class SecurityManager {
  constructor(private config: unknown) {}
  
  async initialize(): Promise<void> {
    console.log('Security manager initialized');
  }
  
  async shutdown(): Promise<void> {
    console.log('Security manager shutdown');
  }
  
  async validateCode(code: string): Promise<void> {
    // Mock code validation
    if (code.includes('eval(') || code.includes('Function(')) {
      throw new Error('Unsafe code detected');
    }
  }
}

class APIRegistry {
  async initialize(): Promise<void> {
    console.log('API registry initialized');
  }
  
  async shutdown(): Promise<void> {
    console.log('API registry shutdown');
  }
  
  createAPI(instanceId: string, permissions: PluginPermission[]): PluginAPI {
    return new PluginAPI(instanceId, permissions);
  }
}

class PluginAPI {
  constructor(private instanceId: string, private permissions: PluginPermission[]) {}
  
  // Mock API methods
  async call(method: string, ...args: unknown[]): Promise<unknown> {
    console.log(`API call: ${method}`, args);
    return { success: true };
  }
}

class PluginStorage {
  constructor(private instanceId: string) {}
  
  async get(_key: string): Promise<unknown> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock storage implementation
    return null;
  }
  
  async set(key: string, value: unknown): Promise<void> {
    // Mock storage implementation
    console.log(`Storage set: ${key}`, value);
  }
}

class PluginEventBus {
  constructor(private instanceId: string) {}
  
  emit(event: string, data: unknown): void {
    console.log(`Event emitted: ${event}`, data);
  }
  
  on(event: string, _handler: (...args: unknown[]) => void): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    console.log(`Event listener added: ${event}`);
  }
}

class PluginLogger {
  constructor(private instanceId: string) {}
  
  debug(message: string, ...args: unknown[]): void {
    console.log(`[${this.instanceId}] DEBUG: ${message}`, ...args);
  }
  
  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.instanceId}] INFO: ${message}`, ...args);
  }
  
  warn(message: string, ...args: unknown[]): void {
    console.log(`[${this.instanceId}] WARN: ${message}`, ...args);
  }
  
  error(message: string, ...args: unknown[]): void {
    console.log(`[${this.instanceId}] ERROR: ${message}`, ...args);
  }
}

class PluginMetrics {
  constructor(private instanceId: string) {}
  
  increment(metric: string, value: number = 1): void {
    console.log(`Metric increment: ${metric} +${value}`);
  }
  
  gauge(metric: string, value: number): void {
    console.log(`Metric gauge: ${metric} = ${value}`);
  }
  
  histogram(metric: string, value: number): void {
    console.log(`Metric histogram: ${metric} = ${value}`);
  }
}

export default PluginRuntime;