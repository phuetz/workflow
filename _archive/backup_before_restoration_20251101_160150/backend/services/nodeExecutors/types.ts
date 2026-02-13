/**
 * Shared Node Executor Types - Breaking Circular Dependencies
 * This file contains only type definitions with no imports
 */

export interface NodeExecutionContext {
  nodeId: string;
  workflowId: string;
  executionId: string;
  input: any;
  config: any;
  credentials?: any;
  previousNodes?: Record<string, any>;
}

export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: any;
  logs?: string[];
  timestamp: string;
}

export interface NodeExecutor {
  execute: (context: NodeExecutionContext) => Promise<NodeExecutionResult>;
  validate?: (config: any) => Promise<boolean>;
}

export type NodeExecutorMap = Record<string, NodeExecutor>;
