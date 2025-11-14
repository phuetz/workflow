/**
 * Subworkflow Executor
 * Execute workflows within workflows (n8n-like subworkflows)
 */

import type { Node, Edge } from 'reactflow';

export interface SubworkflowOptions {
  waitForCompletion?: boolean; // Wait for subworkflow to complete
  passData?: boolean; // Pass current item data to subworkflow
  returnData?: boolean; // Return subworkflow results
  errorHandling?: 'stop' | 'continue' | 'fallback';
  timeout?: number; // Timeout in milliseconds
}

export interface SubworkflowResult {
  success: boolean;
  executionId: string;
  data?: any;
  error?: string;
  duration: number;
}

class SubworkflowExecutor {
  private executions: Map<string, SubworkflowExecution> = new Map();

  /**
   * Execute a subworkflow
   */
  async execute(
    workflowId: string,
    input: any,
    options: SubworkflowOptions = {}
  ): Promise<SubworkflowResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    const execution: SubworkflowExecution = {
      id: executionId,
      workflowId,
      parentExecutionId: this.getCurrentExecutionId(),
      input,
      status: 'running',
      startTime
    };

    this.executions.set(executionId, execution);

    try {
      // Set timeout if specified
      const timeoutPromise = options.timeout
        ? new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Subworkflow timeout')), options.timeout)
          )
        : null;

      // Execute the workflow
      const executionPromise = this.executeWorkflow(workflowId, input);

      const result = timeoutPromise
        ? await Promise.race([executionPromise, timeoutPromise])
        : await executionPromise;

      execution.status = 'completed';
      execution.output = result;
      execution.endTime = Date.now();

      return {
        success: true,
        executionId,
        data: options.returnData ? result : undefined,
        duration: execution.endTime - startTime
      };
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = Date.now();

      if (options.errorHandling === 'continue') {
        return {
          success: false,
          executionId,
          error: execution.error,
          duration: execution.endTime! - startTime
        };
      }

      throw error;
    }
  }

  /**
   * Execute workflow (stub - would integrate with actual workflow engine)
   */
  private async executeWorkflow(workflowId: string, input: any): Promise<any> {
    // In production, this would call the actual workflow execution engine
    // For now, return a simulated result

    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate execution

    return {
      success: true,
      data: input,
      timestamp: new Date()
    };
  }

  /**
   * Get current execution ID from context
   */
  private getCurrentExecutionId(): string | undefined {
    // Would get from execution context in production
    return undefined;
  }

  /**
   * Execute multiple subworkflows in parallel
   */
  async executeParallel(
    workflows: Array<{ workflowId: string; input: any }>,
    options: SubworkflowOptions = {}
  ): Promise<SubworkflowResult[]> {
    const promises = workflows.map(({ workflowId, input }) =>
      this.execute(workflowId, input, options).catch(error => ({
        success: false,
        executionId: '',
        error: error.message,
        duration: 0
      }))
    );

    return Promise.all(promises);
  }

  /**
   * Execute subworkflows sequentially
   */
  async executeSequential(
    workflows: Array<{ workflowId: string; input: any }>,
    options: SubworkflowOptions = {}
  ): Promise<SubworkflowResult[]> {
    const results: SubworkflowResult[] = [];

    for (const { workflowId, input } of workflows) {
      const result = await this.execute(workflowId, input, options);
      results.push(result);

      // Stop on error if configured
      if (!result.success && options.errorHandling === 'stop') {
        break;
      }
    }

    return results;
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): SubworkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Cancel a running subworkflow
   */
  async cancel(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = Date.now();
    }
  }

  /**
   * Get all executions for a parent
   */
  getChildExecutions(parentExecutionId: string): SubworkflowExecution[] {
    return Array.from(this.executions.values()).filter(
      e => e.parentExecutionId === parentExecutionId
    );
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executions.clear();
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface SubworkflowExecution {
  id: string;
  workflowId: string;
  parentExecutionId?: string;
  input: any;
  output?: any;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  startTime: number;
  endTime?: number;
}

// Singleton instance
export const subworkflowExecutor = new SubworkflowExecutor();

/**
 * Subworkflow Node Configuration
 */
export const SubworkflowNodeType = {
  type: 'subworkflow',
  category: 'Flow Control',
  label: 'Execute Workflow',
  icon: '🔄',
  color: '#9333ea',
  description: 'Execute another workflow as a subworkflow',
  inputs: [
    { name: 'trigger', type: 'any', required: true }
  ],
  outputs: [
    { name: 'success', type: 'any' },
    { name: 'error', type: 'any' }
  ],
  settings: [
    {
      key: 'workflowId',
      label: 'Workflow',
      type: 'select',
      required: true,
      options: [] // Would be populated with available workflows
    },
    {
      key: 'waitForCompletion',
      label: 'Wait for Completion',
      type: 'boolean',
      default: true
    },
    {
      key: 'passData',
      label: 'Pass Input Data',
      type: 'boolean',
      default: true
    },
    {
      key: 'returnData',
      label: 'Return Data',
      type: 'boolean',
      default: true
    },
    {
      key: 'errorHandling',
      label: 'Error Handling',
      type: 'select',
      default: 'stop',
      options: [
        { label: 'Stop on Error', value: 'stop' },
        { label: 'Continue on Error', value: 'continue' }
      ]
    },
    {
      key: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      default: 30000
    }
  ],
  execute: async (config: any, input: any) => {
    const result = await subworkflowExecutor.execute(config.workflowId, input, {
      waitForCompletion: config.waitForCompletion,
      passData: config.passData,
      returnData: config.returnData,
      errorHandling: config.errorHandling,
      timeout: config.timeout
    });

    if (!result.success) {
      throw new Error(result.error || 'Subworkflow execution failed');
    }

    return result.data;
  }
};
