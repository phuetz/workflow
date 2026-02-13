/**
 * Parallel Execution Engine
 * Enables concurrent execution of multiple workflow branches
 */

import { WorkflowNode } from '../types/workflow';
import { ExecutionResult } from '../types/common-types';
import { logger } from '../services/SimpleLogger';
import { EventEmitter } from 'events';

export interface ParallelBranch {
  id: string;
  name?: string;
  nodes: WorkflowNode[];
  condition?: string; // Optional condition for branch execution
  weight?: number; // Priority weight for resource allocation
  maxRetries?: number;
  timeout?: number;
}

export interface ParallelExecutionConfig {
  branches: ParallelBranch[];
  strategy: 'all' | 'race' | 'some' | 'weighted';
  maxConcurrency?: number; // Maximum number of branches to run simultaneously
  timeout?: number; // Global timeout for all branches
  continueOnError?: boolean;
  aggregationStrategy?: 'merge' | 'array' | 'custom';
  customAggregator?: (results: any[]) => any;
}

export interface BranchResult {
  branchId: string;
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  retries?: number;
}

export class ParallelExecutor extends EventEmitter {
  private activeExecutions: Map<string, AbortController> = new Map();
  private executionQueue: ParallelBranch[] = [];
  private results: Map<string, BranchResult> = new Map();
  
  constructor(
    private nodeExecutor: any // Reference to main node executor
  ) {
    super();
  }

  /**
   * Execute multiple branches in parallel
   */
  async execute(
    config: ParallelExecutionConfig,
    inputData: any,
    executionId: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.results.clear();
    
    try {
      // Filter branches based on conditions
      const activeBranches = await this.filterBranches(config.branches, inputData);
      
      if (activeBranches.length === 0) {
        return {
          success: true,
          data: null,
          metadata: {
            executionTime: Date.now() - startTime,
            message: 'No branches met execution conditions'
          }
        };
      }

      // Execute based on strategy
      let results: BranchResult[];
      
      switch (config.strategy) {
        case 'race':
          results = await this.executeRace(activeBranches, inputData, config);
          break;
        
        case 'some':
          results = await this.executeSome(activeBranches, inputData, config);
          break;
        
        case 'weighted':
          results = await this.executeWeighted(activeBranches, inputData, config);
          break;
        
        case 'all':
        default:
          results = await this.executeAll(activeBranches, inputData, config);
          break;
      }

      // Aggregate results
      const aggregatedOutput = this.aggregateResults(results, config);
      
      // Check overall success
      const overallSuccess = config.continueOnError 
        ? results.some(r => r.success)
        : results.every(r => r.success);

      return {
        success: overallSuccess,
        data: aggregatedOutput,
        metadata: {
          executionTime: Date.now() - startTime,
          branches: results
        }
      };

    } catch (error) {
      logger.error('Parallel execution failed:', error);
      return {
        success: false,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack
        },
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    } finally {
      // Cleanup
      this.activeExecutions.clear();
      this.executionQueue = [];
    }
  }

  /**
   * Execute all branches and wait for all to complete
   */
  private async executeAll(
    branches: ParallelBranch[],
    inputData: any,
    config: ParallelExecutionConfig
  ): Promise<BranchResult[]> {
    const maxConcurrency = config.maxConcurrency || branches.length;
    const results: BranchResult[] = [];
    
    // Create execution promises with concurrency control
    const executing: Promise<void>[] = [];
    
    for (const branch of branches) {
      const promise = this.executeBranch(branch, inputData, config).then(result => {
        results.push(result);
      });
      
      executing.push(promise);
      
      // Control concurrency
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }
    
    // Wait for all remaining executions
    await Promise.all(executing);
    
    return results;
  }

  /**
   * Execute branches and return first to complete
   */
  private async executeRace(
    branches: ParallelBranch[],
    inputData: any,
    config: ParallelExecutionConfig
  ): Promise<BranchResult[]> {
    return new Promise((resolve) => {
      const promises = branches.map(branch => 
        this.executeBranch(branch, inputData, config)
      );
      
      Promise.race(promises).then(result => {
        // Cancel other executions
        this.cancelAll();
        resolve([result]);
      });
    });
  }

  /**
   * Execute branches until N succeed
   */
  private async executeSome(
    branches: ParallelBranch[],
    inputData: any,
    config: ParallelExecutionConfig,
    requiredCount: number = 1
  ): Promise<BranchResult[]> {
    const results: BranchResult[] = [];
    const promises = branches.map(branch => 
      this.executeBranch(branch, inputData, config)
    );
    
    return new Promise((resolve) => {
      promises.forEach(promise => {
        promise.then(result => {
          results.push(result);
          if (results.filter(r => r.success).length >= requiredCount) {
            this.cancelAll();
            resolve(results);
          }
        });
      });
      
      // Fallback if not enough succeed
      Promise.all(promises).then(() => {
        resolve(results);
      });
    });
  }

  /**
   * Execute branches with weighted priority
   */
  private async executeWeighted(
    branches: ParallelBranch[],
    inputData: any,
    config: ParallelExecutionConfig
  ): Promise<BranchResult[]> {
    // Sort branches by weight
    const sortedBranches = [...branches].sort((a, b) => 
      (b.weight || 0) - (a.weight || 0)
    );
    
    const results: BranchResult[] = [];
    const maxConcurrency = config.maxConcurrency || 3;
    
    // Execute in priority order with concurrency control
    for (let i = 0; i < sortedBranches.length; i += maxConcurrency) {
      const batch = sortedBranches.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(
        batch.map(branch => this.executeBranch(branch, inputData, config))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Execute a single branch
   */
  private async executeBranch(
    branch: ParallelBranch,
    inputData: any,
    config: ParallelExecutionConfig
  ): Promise<BranchResult> {
    const startTime = Date.now();
    const abortController = new AbortController();
    this.activeExecutions.set(branch.id, abortController);
    
    let retries = 0;
    const maxRetries = branch.maxRetries || 0;
    const timeout = branch.timeout || config.timeout || 30000;
    
    while (retries <= maxRetries) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(
          () => this.executeBranchNodes(branch.nodes, inputData, abortController.signal),
          timeout,
          abortController
        );
        
        this.activeExecutions.delete(branch.id);
        
        return {
          branchId: branch.id,
          success: true,
          output: result,
          executionTime: Date.now() - startTime,
          retries
        };
        
      } catch (error) {
        retries++;
        
        if (retries > maxRetries) {
          this.activeExecutions.delete(branch.id);
          
          return {
            branchId: branch.id,
            success: false,
            error: (error as Error).message,
            executionTime: Date.now() - startTime,
            retries
          };
        }
        
        // Exponential backoff for retries
        await this.delay(Math.pow(2, retries) * 1000);
      }
    }
    
    return {
      branchId: branch.id,
      success: false,
      error: 'Max retries exceeded',
      executionTime: Date.now() - startTime,
      retries
    };
  }

  /**
   * Execute nodes in a branch
   */
  private async executeBranchNodes(
    nodes: WorkflowNode[],
    inputData: any,
    signal: AbortSignal
  ): Promise<any> {
    let currentData = inputData;
    
    for (const node of nodes) {
      if (signal.aborted) {
        throw new Error('Execution aborted');
      }
      
      // Execute node
      const result = await this.nodeExecutor.execute(node, currentData);
      
      if (!result.success) {
        throw new Error(result.error || 'Node execution failed');
      }
      
      currentData = result.output;
    }
    
    return currentData;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
    abortController: AbortController
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          abortController.abort();
          reject(new Error(`Execution timed out after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * Filter branches based on conditions
   */
  private async filterBranches(
    branches: ParallelBranch[],
    inputData: any
  ): Promise<ParallelBranch[]> {
    const filtered: ParallelBranch[] = [];
    
    for (const branch of branches) {
      if (branch.condition) {
        try {
          // Evaluate condition
          const shouldExecute = await this.evaluateCondition(branch.condition, inputData);
          if (shouldExecute) {
            filtered.push(branch);
          }
        } catch (error) {
          logger.warn(`Failed to evaluate condition for branch ${branch.id}: ${error}`);
          // Skip branch if condition evaluation fails
        }
      } else {
        // No condition, always execute
        filtered.push(branch);
      }
    }
    
    return filtered;
  }

  /**
   * Evaluate branch condition
   */
  private async evaluateCondition(condition: string, data: any): Promise<boolean> {
    // Simple expression evaluation
    // In production, use a proper expression evaluator
    try {
      // Replace data references with actual values
      const expression = condition.replace(/\$\{([^}]+)\}/g, (_, path) => {
        return JSON.stringify(this.getValueByPath(data, path));
      });
      
      // Safe evaluation using SecureSandbox
      const { default: sandbox } = await import('../utils/SecureSandbox');
      const result = await sandbox.evaluate(
        expression,
        {
          variables: { data },
          constants: { true: true, false: false, null: null }
        },
        { timeout: 1000, enableAsync: false }
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Evaluation failed');
      }
      return result.value;
    } catch (error) {
      logger.error(`Condition evaluation failed: ${error}`);
      return false;
    }
  }

  /**
   * Get value from object by path
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Aggregate branch results based on strategy
   */
  private aggregateResults(
    results: BranchResult[],
    config: ParallelExecutionConfig
  ): any {
    const successfulResults = results
      .filter(r => r.success)
      .map(r => r.output);
    
    if (successfulResults.length === 0) {
      return null;
    }
    
    switch (config.aggregationStrategy) {
      case 'array':
        return successfulResults;
      
      case 'custom':
        return config.customAggregator 
          ? config.customAggregator(successfulResults)
          : successfulResults;
      
      case 'merge':
      default:
        // Merge objects
        if (successfulResults.every(r => typeof r === 'object' && !Array.isArray(r))) {
          return Object.assign({}, ...successfulResults);
        }
        // Return as array if not all objects
        return successfulResults;
    }
  }

  /**
   * Cancel all active executions
   */
  private cancelAll(): void {
    this.activeExecutions.forEach(controller => {
      controller.abort();
    });
    this.activeExecutions.clear();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get execution status
   */
  getStatus(): {
    activeCount: number;
    queuedCount: number;
    results: BranchResult[];
  } {
    return {
      activeCount: this.activeExecutions.size,
      queuedCount: this.executionQueue.length,
      results: Array.from(this.results.values())
    };
  }
}