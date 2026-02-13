/**
 * Edge Compute Engine
 * Distributed computing engine for edge devices
 */

import { Worker } from 'worker_threads';
import * as vm from 'vm';
import * as WebAssembly from 'webassembly';
import { EventEmitter } from 'events';

interface ComputeTask {
  id: string;
  type: 'javascript' | 'wasm' | 'tensorflow' | 'onnx';
  code?: string;
  wasmModule?: Buffer;
  modelPath?: string;
  input: unknown;
  priority: number;
  timeout?: number;
  memoryLimit?: number;
}

interface ComputeResult {
  taskId: string;
  output: unknown;
  executionTime: number;
  memoryUsed: number;
  error?: string;
}

interface WorkerPool {
  workers: Worker[];
  busy: Set<Worker>;
  queue: ComputeTask[];
}

export class EdgeComputeEngine extends EventEmitter {
  private resources: {
    cpu: number;
    memory: number;
    gpu?: boolean;
  };
  
  private workerPools: Map<string, WorkerPool> = new Map();
  private taskQueue: ComputeTask[] = [];
  private activeTasks: Map<string, ComputeTask> = new Map();
  private vmContexts: Map<string, vm.Context> = new Map();
  private wasmInstances: Map<string, WebAssembly.Instance> = new Map();
  private models: Map<string, unknown> = new Map();
  
  constructor(resources: unknown) {
    super();
    this.resources = resources;
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize worker pools for different compute types
    const workerCount = this.resources.cpu || 4;
    
    // JavaScript workers
    this.createWorkerPool('javascript', workerCount);
    
    // WebAssembly workers
    this.createWorkerPool('wasm', Math.floor(workerCount / 2));
    
    // ML inference workers
    if (this.resources.gpu) {
      this.createWorkerPool('ml', 2);
    }
    
    console.log(`Edge Compute Engine initialized with ${workerCount} CPU cores`);
  }
  
  private createWorkerPool(type: string, count: number): void {
    const pool: WorkerPool = {
      workers: [],
      busy: new Set(),
      queue: []
    };
    
    for (let i = 0; i < count; i++) {
      const worker = new Worker(`
        const { parentPort } = require('worker_threads');
        const vm = require('vm');
        const tf = require('@tensorflow/tfjs-node');
        
        parentPort.on('message', async (task) => {
          const startTime = Date.now();
          const startMemory = process.memoryUsage().heapUsed;
          
          try {
            let result;
            
            switch (task.type) {
              case 'javascript':
                const context = vm.createContext({
                  input: task.input,
                  console,
                  Math,
                  Date,
                  JSON,
                  Buffer
                });
                
                result = vm.runInContext(task.code, context, {
                  timeout: task.timeout || 5000,
                  memoryLimit: task.memoryLimit || 128
                });
                break;
                
              case 'tensorflow':
                const model = await tf.loadLayersModel(task.modelPath);
                const inputTensor = tf.tensor(task.input);
                const prediction = model.predict(inputTensor);
                result = await prediction.data();
                inputTensor.dispose();
                prediction.dispose();
                break;
                
              default:
                throw new Error(\`Unsupported task type: \${task.type}\`);
            }
            
            const executionTime = Date.now() - startTime;
            const memoryUsed = process.memoryUsage().heapUsed - startMemory;
            
            parentPort.postMessage({
              taskId: task.id,
              output: result,
              executionTime,
              memoryUsed
            });
            
          } catch (error) {
            parentPort.postMessage({
              taskId: task.id,
              error: error.message,
              executionTime: Date.now() - startTime,
              memoryUsed: process.memoryUsage().heapUsed - startMemory
            });
          }
        });
      `, { eval: true });
      
      worker.on('error', (error) => {
        console.error(`Worker error: ${error}`);
        this.emit('worker:error', { type, error });
      });
      
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker exited with code ${code}`);
          // Replace crashed worker
          const index = pool.workers.indexOf(worker);
          if (index > -1) {
            pool.workers.splice(index, 1);
            this.createWorkerPool(type, 1);
          }
        }
      });
      
      pool.workers.push(worker);
    }
    
    this.workerPools.set(type, pool);
  }
  
  public async execute(task: ComputeTask): Promise<ComputeResult> {
    // Validate task
    if (!task.id || !task.type) {
      throw new Error('Invalid task: missing id or type');
    }
    
    // Check resource availability
    if (!this.hasAvailableResources(task)) {
      // Queue task if resources are not available
      this.queueTask(task);
      throw new Error('Insufficient resources, task queued');
    }
    
    // Store active task
    this.activeTasks.set(task.id, task);
    
    try {
      let result: ComputeResult;
      
      switch (task.type) {
        case 'javascript':
          result = await this.executeJavaScript(task);
          break;
          
        case 'wasm':
          result = await this.executeWebAssembly(task);
          break;
          
        case 'tensorflow':
        case 'onnx':
          result = await this.executeMLInference(task);
          break;
          
        default:
          throw new Error(`Unsupported task type: ${task.type}`);
      }
      
      // Clean up
      this.activeTasks.delete(task.id);
      
      // Process queued tasks
      this.processQueue();
      
      this.emit('task:complete', result);
      return result;
      
    } catch (error) {
      this.activeTasks.delete(task.id);
      this.emit('task:error', { taskId: task.id, error });
      throw error;
    }
  }
  
  private async executeJavaScript(task: ComputeTask): Promise<ComputeResult> {
    const pool = this.workerPools.get('javascript')!;
    const worker = await this.getAvailableWorker(pool);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        pool.busy.delete(worker);
        reject(new Error(`Task ${task.id} timed out`));
      }, task.timeout || 30000);
      
      worker.once('message', (result: ComputeResult) => {
        clearTimeout(timeout);
        pool.busy.delete(worker);
        
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });
      
      pool.busy.add(worker);
      worker.postMessage(task);
    });
  }
  
  private async executeWebAssembly(task: ComputeTask): Promise<ComputeResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      // Load or get cached WASM instance
      let instance = this.wasmInstances.get(task.id);
      
      if (!instance && task.wasmModule) {
        const module = await WebAssembly.compile(task.wasmModule);
        instance = await WebAssembly.instantiate(module, {
          env: {
            memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
            table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
            abort: () => { throw new Error('WASM abort'); }
          }
        });
        
        this.wasmInstances.set(task.id, instance);
      }
      
      if (!instance) {
        throw new Error('No WASM module provided');
      }
      
      // Execute WASM function
      const exports = instance.exports as unknown;
      const result = exports.main ? exports.main(task.input) : exports.compute(task.input);
      
      return {
        taskId: task.id,
        output: result,
        executionTime: Date.now() - startTime,
        memoryUsed: process.memoryUsage().heapUsed - startMemory
      };
      
    } catch (error) {
      return {
        taskId: task.id,
        output: null,
        executionTime: Date.now() - startTime,
        memoryUsed: process.memoryUsage().heapUsed - startMemory,
        error: error.message
      };
    }
  }
  
  private async executeMLInference(task: ComputeTask): Promise<ComputeResult> {
    const pool = this.workerPools.get('ml') || this.workerPools.get('javascript')!;
    const worker = await this.getAvailableWorker(pool);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        pool.busy.delete(worker);
        reject(new Error(`ML inference task ${task.id} timed out`));
      }, task.timeout || 60000);
      
      worker.once('message', (result: ComputeResult) => {
        clearTimeout(timeout);
        pool.busy.delete(worker);
        
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });
      
      pool.busy.add(worker);
      worker.postMessage(task);
    });
  }
  
  private async getAvailableWorker(pool: WorkerPool): Promise<Worker> {
    // Find available worker
    for (const worker of pool.workers) {
      if (!pool.busy.has(worker)) {
        return worker;
      }
    }
    
    // Wait for worker to become available
    return new Promise((resolve) => {
      const checkWorker = setInterval(() => {
        for (const worker of pool.workers) {
          if (!pool.busy.has(worker)) {
            clearInterval(checkWorker);
            resolve(worker);
            return;
          }
        }
      }, 100);
    });
  }
  
  private hasAvailableResources(task: ComputeTask): boolean {
    const memoryUsage = process.memoryUsage();
    const availableMemory = this.resources.memory * 1024 * 1024 - memoryUsage.heapUsed;
    
    // Check memory requirements
    if (task.memoryLimit && task.memoryLimit * 1024 * 1024 > availableMemory) {
      return false;
    }
    
    // Check worker availability
    const pool = this.workerPools.get(task.type === 'tensorflow' || task.type === 'onnx' ? 'ml' : task.type);
    if (!pool) {
      return false;
    }
    
    return pool.busy.size < pool.workers.length;
  }
  
  private queueTask(task: ComputeTask): void {
    // Insert task in priority order
    const index = this.taskQueue.findIndex(t => t.priority < task.priority);
    if (index === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(index, 0, task);
    }
    
    this.emit('task:queued', { taskId: task.id, queueLength: this.taskQueue.length });
  }
  
  private processQueue(): void {
    if (this.taskQueue.length === 0) {
      return;
    }
    
    // Try to execute queued tasks
    const tasksToProcess = [...this.taskQueue];
    this.taskQueue = [];
    
    for (const task of tasksToProcess) {
      if (this.hasAvailableResources(task)) {
        this.execute(task).catch(error => {
          console.error(`Failed to execute queued task ${task.id}: ${error}`);
        });
      } else {
        this.taskQueue.push(task);
      }
    }
  }
  
  public async deployFunction(code: string, triggers: unknown[]): Promise<string> {
    const functionId = `func_${Date.now()}`;
    
    // Validate function code
    try {
      new vm.Script(code);
    } catch (error) {
      throw new Error(`Invalid function code: ${error.message}`);
    }
    
    // Create sandboxed context for function
    const context = vm.createContext({
      console: {
        log: (...args: unknown[]) => this.emit('function:log', { functionId, args }),
        error: (...args: unknown[]) => this.emit('function:error', { functionId, args })
      },
      require: (module: string) => {
        // Whitelist allowed modules
        const allowed = ['crypto', 'buffer', 'util'];
        if (allowed.includes(module)) {
          return await import(module);
        }
        throw new Error(`Module ${module} not allowed`);
      }
    });
    
    this.vmContexts.set(functionId, context);
    
    this.emit('function:deployed', { functionId, triggers });
    return functionId;
  }
  
  public async invokeFunction(functionId: string, input: unknown): Promise<unknown> {
    const context = this.vmContexts.get(functionId);
    if (!context) {
      throw new Error(`Function ${functionId} not found`);
    }
    
    const task: ComputeTask = {
      id: `invoke_${functionId}_${Date.now()}`,
      type: 'javascript',
      code: `
        const handler = ${context.handler};
        handler(input);
      `,
      input,
      priority: 5
    };
    
    const result = await this.execute(task);
    return result.output;
  }
  
  public async getMetrics(): Promise<unknown> {
    const memoryUsage = process.memoryUsage();
    const metrics: unknown = {
      resources: this.resources,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: this.resources.memory,
        available: this.resources.memory - Math.round(memoryUsage.heapUsed / 1024 / 1024)
      },
      tasks: {
        active: this.activeTasks.size,
        queued: this.taskQueue.length,
        completed: this.getCompletedTaskCount()
      },
      workers: {}
    };
    
    // Worker pool metrics
    for (const [type, pool] of this.workerPools) {
      metrics.workers[type] = {
        total: pool.workers.length,
        busy: pool.busy.size,
        available: pool.workers.length - pool.busy.size
      };
    }
    
    return metrics;
  }
  
  private completedTasks = 0;
  
  private getCompletedTaskCount(): number {
    return this.completedTasks;
  }
  
  public async shutdown(): Promise<void> {
    // Terminate all workers
    for (const [_type, pool] of this.workerPools) { // eslint-disable-line @typescript-eslint/no-unused-vars
      for (const worker of pool.workers) {
        await worker.terminate();
      }
    }
    
    // Clear caches
    this.vmContexts.clear();
    this.wasmInstances.clear();
    this.models.clear();
    
    console.log('Edge Compute Engine shutdown complete');
  }
}