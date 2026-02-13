/**
 * Workflow API Service
 * Handles communication with the workflow execution backend
 */

import { logger } from './LoggingService';
import { config, ConfigHelpers } from '../config/environment';

export interface WorkflowExecutionRequest {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  settings: {
    environment: string;
    variables: Record<string, unknown>;
  };
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'running' | 'success' | 'error';
  output?: unknown;
  error?: unknown;
  duration?: number;
}

export interface WorkflowExecutionResult {
  success: boolean;
  executionId: string;
  data?: unknown;
  error?: unknown;
  totalDuration: number;
  nodeResults: NodeExecutionResult[];
}

export class WorkflowAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.workflows;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, workflowData: WorkflowExecutionRequest): Promise<WorkflowExecutionResult> {
    try {
      logger.info('Starting workflow execution', { workflowId, nodeCount: workflowData.nodes.length });

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(workflowData),
        signal: AbortSignal.timeout(ConfigHelpers.getTimeout('workflowExecution'))
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info('Workflow execution completed', { executionId: result.executionId, success: result.success });
      
      return result;
    } catch (error) {
      logger.error('Workflow execution failed', error);
      throw error;
    }
  }

  /**
   * Get workflow execution status (for real-time updates)
   */
  async getExecutionStatus(executionId: string): Promise<{
    status: 'running' | 'completed' | 'failed';
    progress: number;
    currentNode?: string;
    results: NodeExecutionResult[];
  }> {
    try {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get execution status', error);
      throw error;
    }
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    try {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info('Workflow execution cancelled', { executionId });
    } catch (error) {
      logger.error('Failed to cancel execution', error);
      throw error;
    }
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId: string, limit: number = 50): Promise<WorkflowExecutionResult[]> {
    try {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get execution history', error);
      throw error;
    }
  }

  /**
   * Validate workflow before execution
   */
  async validateWorkflow(workflowData: WorkflowExecutionRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(workflowData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Workflow validation failed', error);
      throw error;
    }
  }

  /**
   * Start real-time execution monitoring using WebSocket or Server-Sent Events
   */
  async startExecutionMonitoring(
    executionId: string, 
    onUpdate: (update: NodeExecutionResult) => void,
    onComplete: (result: WorkflowExecutionResult) => void,
    onError: (error: unknown) => void
  ): Promise<() => void> {
    try {
      // Use Server-Sent Events for real-time updates
        `${this.baseUrl}/executions/${executionId}/stream?token=${this.getAuthToken()}`
      );

      eventSource.onmessage = (event) => {
        try {
          
          switch (data.type) {
            case 'node_update':
              onUpdate(data.payload);
              break;
            case 'execution_complete':
              onComplete(data.payload);
              eventSource.close();
              break;
            case 'execution_error':
              onError(data.payload);
              eventSource.close();
              break;
          }
        } catch (parseError) {
          logger.error('Failed to parse execution update', parseError);
        }
      };

      eventSource.onerror = (error) => {
        logger.error('Execution monitoring error', error);
        onError(error);
        eventSource.close();
      };

      // Return cleanup function
      return () => {
        eventSource.close();
      };
    } catch (error) {
      logger.error('Failed to start execution monitoring', error);
      throw error;
    }
  }

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }
}

// Singleton instance
export const workflowAPI = new WorkflowAPI();