/**
 * Sub-Workflow Executor
 * Enables nested workflow execution and reusability
 */

import { WorkflowNode } from '../types/workflow';
import { WorkflowExecutor } from '../components/ExecutionEngine';
import { useWorkflowStore } from '../store/workflowStore';
import { logger } from '../services/SimpleLogger';
import type { UseBoundStore, StoreApi } from 'zustand';

// ExecutionResult interface matching the WorkflowExecutor's expected output
interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  executionId?: string;
  subWorkflowId?: string;
  subExecutionId?: string;
  warning?: string;
}

export interface SubWorkflowConfig {
  workflowId: string;
  workflowName?: string;
  inputMapping?: Record<string, any>;
  outputMapping?: Record<string, string>;
  async?: boolean;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  errorStrategy?: 'fail' | 'continue' | 'fallback';
  fallbackValue?: any;
}

export class SubWorkflowExecutor {
  private executionStack: string[] = [];
  private maxDepth = 10; // Maximum nesting depth to prevent infinite recursion

  constructor(
    private workflowStore: UseBoundStore<StoreApi<any>>,
    private mainExecutor: WorkflowExecutor
  ) {}

  /**
   * Execute a sub-workflow
   */
  async execute(
    parentNode: WorkflowNode,
    inputData: any,
    parentExecutionId: string
  ): Promise<ExecutionResult> {
    const config = parentNode.data.config as unknown as SubWorkflowConfig;
    const startTime = Date.now();

    try {
      // Check recursion depth
      if (this.executionStack.length >= this.maxDepth) {
        throw new Error(`Maximum sub-workflow depth (${this.maxDepth}) exceeded`);
      }

      // Check for circular reference
      if (this.executionStack.includes(config.workflowId)) {
        throw new Error(`Circular reference detected: workflow ${config.workflowId} is already in execution stack`);
      }

      // Load sub-workflow
      const subWorkflow = await this.loadWorkflow(config.workflowId);
      
      if (!subWorkflow) {
        throw new Error(`Sub-workflow ${config.workflowId} not found`);
      }

      // Map input data
      const mappedInput = this.mapInputData(inputData, config.inputMapping);

      // Add to execution stack
      this.executionStack.push(config.workflowId);

      // Execute sub-workflow with retry logic
      let result: ExecutionResult;
      let lastError: Error | null = null;
      const retryCount = config.retryCount || 0;
      const retryDelay = config.retryDelay || 1000;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          if (attempt > 0) {
            logger.info(`Retrying sub-workflow execution (attempt ${attempt + 1}/${retryCount + 1})`);
            await this.delay(retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
          }

          result = await this.executeSubWorkflow(
            subWorkflow,
            mappedInput,
            parentExecutionId,
            config
          );

          // If successful, break the retry loop
          break;
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === retryCount) {
            // Last attempt failed
            throw error;
          }
        }
      }

      // Remove from execution stack
      this.executionStack.pop();

      // Map output data
      const mappedOutput = this.mapOutputData(result!.output, config.outputMapping);

      return {
        success: true,
        output: mappedOutput,
        executionTime: Date.now() - startTime,
        subWorkflowId: config.workflowId,
        subExecutionId: result!.executionId
      };

    } catch (error) {
      // Remove from execution stack on error
      this.executionStack = this.executionStack.filter(id => id !== config.workflowId);

      // Handle error based on strategy
      return this.handleError(error as Error, config, startTime);
    }
  }

  /**
   * Load workflow definition
   */
  private async loadWorkflow(workflowId: string): Promise<any> {
    // This would typically load from database or storage
    const state = this.workflowStore.getState();
    const workflows = state.workflows;
    // workflows is Record<string, Workflow>, so we need to get by key
    return workflows ? workflows[workflowId] : null;
  }

  /**
   * Execute the sub-workflow
   */
  private async executeSubWorkflow(
    workflow: any,
    inputData: any,
    parentExecutionId: string,
    config: SubWorkflowConfig
  ): Promise<ExecutionResult> {
    const executionId = `${parentExecutionId}_sub_${Date.now()}`;

    // Create execution context
    const context = {
      executionId,
      parentExecutionId,
      workflowId: workflow.id,
      input: inputData,
      startTime: Date.now(),
      timeout: config.timeout || 60000, // Default 60 seconds
      async: config.async || false
    };

    // If async execution, return immediately
    if (config.async) {
      this.executeAsync(workflow, context);
      return {
        success: true,
        output: { 
          message: 'Sub-workflow started asynchronously',
          executionId 
        },
        executionId,
        executionTime: 0
      };
    }

    // Execute synchronously with timeout
    return await this.executeWithTimeout(workflow, context, config.timeout || 60000);
  }

  /**
   * Execute workflow with timeout
   */
  private async executeWithTimeout(
    workflow: any,
    context: any,
    timeout: number
  ): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Sub-workflow execution timed out after ${timeout}ms`));
      }, timeout);

      // Create a new WorkflowExecutor instance with the sub-workflow nodes and edges
      const executor = new WorkflowExecutor(workflow.nodes || [], workflow.edges || []);

      executor.execute()
        .then(resultMap => {
          clearTimeout(timer);
          // Convert Map<string, NodeExecutionResult> to ExecutionResult
          const executionResult = this.convertMapToExecutionResult(resultMap, context.executionId);
          resolve(executionResult);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Execute workflow asynchronously
   */
  private async executeAsync(workflow: any, context: any): Promise<void> {
    try {
      // Create a new WorkflowExecutor instance with the sub-workflow nodes and edges
      const executor = new WorkflowExecutor(workflow.nodes || [], workflow.edges || []);
      const resultMap = await executor.execute();

      // Convert Map to ExecutionResult
      const result = this.convertMapToExecutionResult(resultMap, context.executionId);

      // Store result for later retrieval
      this.storeAsyncResult(context.executionId, result);

      // Emit event for completion
      this.emitCompletionEvent(context.executionId, result);
    } catch (error) {
      // Store error for later retrieval
      this.storeAsyncError(context.executionId, error as Error);

      // Emit event for error
      this.emitErrorEvent(context.executionId, error as Error);
    }
  }

  /**
   * Map input data based on configuration
   */
  private mapInputData(data: any, mapping?: Record<string, any>): any {
    if (!mapping) return data;

    const mapped: any = {};

    for (const [targetKey, sourceExpression] of Object.entries(mapping)) {
      try {
        // Evaluate expression to get value from source data
        const value = this.evaluateExpression(sourceExpression, data);
        this.setNestedProperty(mapped, targetKey, value);
      } catch (error) {
        logger.warn(`Failed to map input ${targetKey}: ${error}`);
      }
    }

    return mapped;
  }

  /**
   * Map output data based on configuration
   */
  private mapOutputData(data: any, mapping?: Record<string, string>): any {
    if (!mapping) return data;

    const mapped: any = {};

    for (const [targetKey, sourcePath] of Object.entries(mapping)) {
      try {
        const value = this.getNestedProperty(data, sourcePath);
        this.setNestedProperty(mapped, targetKey, value);
      } catch (error) {
        logger.warn(`Failed to map output ${targetKey}: ${error}`);
      }
    }

    return mapped;
  }

  /**
   * Evaluate expression to extract value
   */
  private evaluateExpression(expression: any, data: any): any {
    if (typeof expression === 'string') {
      // Handle JSONPath-like expressions
      if (expression.startsWith('$.')) {
        return this.getNestedProperty(data, expression.substring(2));
      }
      // Handle template literals
      if (expression.includes('${')) {
        return expression.replace(/\${([^}]+)}/g, (_, path) => {
          return this.getNestedProperty(data, path);
        });
      }
    }
    return expression;
  }

  /**
   * Get nested property from object
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        // Handle array notation
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        return current?.[arrayKey]?.[index];
      }
      return current?.[key];
    }, obj);
  }

  /**
   * Set nested property in object
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }

  /**
   * Handle execution error based on strategy
   */
  private handleError(
    error: Error,
    config: SubWorkflowConfig,
    startTime: number
  ): ExecutionResult {
    logger.error(`Sub-workflow execution failed: ${error.message}`);

    switch (config.errorStrategy) {
      case 'continue':
        // Continue with null output
        return {
          success: true,
          output: null,
          executionTime: Date.now() - startTime,
          warning: `Sub-workflow failed but continued: ${error.message}`
        };
      
      case 'fallback':
        // Use fallback value
        return {
          success: true,
          output: config.fallbackValue || null,
          executionTime: Date.now() - startTime,
          warning: `Sub-workflow failed, using fallback value: ${error.message}`
        };
      
      case 'fail':
      default:
        // Propagate error
        return {
          success: false,
          error: error.message,
          executionTime: Date.now() - startTime
        };
    }
  }

  /**
   * Store async execution result
   */
  private storeAsyncResult(executionId: string, result: ExecutionResult): void {
    // Store in cache or database
    // Note: Since asyncExecutions doesn't exist in the store interface,
    // we're using a temporary in-memory storage that could be enhanced later
    if (!(this.workflowStore as any).setState) {
      logger.warn('Cannot store async result: setState not available');
      return;
    }

    (this.workflowStore as any).setState((state: any) => ({
      ...state,
      asyncExecutions: {
        ...(state.asyncExecutions || {}),
        [executionId]: {
          status: 'completed',
          result,
          completedAt: new Date()
        }
      }
    }));
  }

  /**
   * Store async execution error
   */
  private storeAsyncError(executionId: string, error: Error): void {
    // Store in cache or database
    // Note: Since asyncExecutions doesn't exist in the store interface,
    // we're using a temporary in-memory storage that could be enhanced later
    if (!(this.workflowStore as any).setState) {
      logger.warn('Cannot store async error: setState not available');
      return;
    }

    (this.workflowStore as any).setState((state: any) => ({
      ...state,
      asyncExecutions: {
        ...(state.asyncExecutions || {}),
        [executionId]: {
          status: 'failed',
          error: error.message,
          failedAt: new Date()
        }
      }
    }));
  }

  /**
   * Emit completion event
   */
  private emitCompletionEvent(executionId: string, result: ExecutionResult): void {
    // Emit event through event bus or webhook
    logger.info(`Sub-workflow ${executionId} completed successfully`);
  }

  /**
   * Emit error event
   */
  private emitErrorEvent(executionId: string, error: Error): void {
    // Emit event through event bus or webhook
    logger.error(`Sub-workflow ${executionId} failed: ${error.message}`);
  }

  /**
   * Convert Map<string, NodeExecutionResult> to ExecutionResult
   */
  private convertMapToExecutionResult(resultMap: Map<string, any>, executionId: string): ExecutionResult {
    // Check if any node failed
    const hasError = Array.from(resultMap.values()).some(r => r.status === 'error');

    // Collect all output data
    const output: Record<string, any> = {};
    resultMap.forEach((result, nodeId) => {
      if (result.data) {
        output[nodeId] = result.data;
      }
    });

    // Calculate total execution time
    const executionTime = Array.from(resultMap.values()).reduce((sum, r) => sum + (r.duration || 0), 0);

    if (hasError) {
      const errorNode = Array.from(resultMap.values()).find(r => r.status === 'error');
      return {
        success: false,
        error: errorNode?.error?.message || 'Sub-workflow execution failed',
        executionTime,
        executionId
      };
    }

    return {
      success: true,
      output,
      executionTime,
      executionId
    };
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get async execution status
   */
  async getAsyncStatus(executionId: string): Promise<any> {
    const state = this.workflowStore.getState() as any;
    return state.asyncExecutions?.[executionId] || null;
  }
}