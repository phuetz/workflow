/**
 * Shared Node Executor Types - Breaking Circular Dependencies
 * This file contains only type definitions with no imports
 */

/** Backend-native node interface (no React dependency) */
export interface BackendNode {
  id: string;
  type: string;
  data: {
    type?: string;
    label?: string;
    config?: Record<string, unknown>;
    credentialId?: string;
    [key: string]: unknown;
  };
  position?: { x: number; y: number };
}

export interface BinaryDataReference {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

export interface NodeExecutionContext {
  nodeId: string;
  workflowId: string;
  executionId: string;
  input: any;
  config: any;
  credentials?: Record<string, any>;
  env?: Record<string, string>;
  previousNodes?: Record<string, any>;
}

export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: any;
  logs?: string[];
  timestamp: string;
  binaryData?: BinaryDataReference[];
}

export interface NodeExecutor {
  execute: (context: NodeExecutionContext) => Promise<NodeExecutionResult>;
  validate?: (config: any) => Promise<boolean>;
}

export type NodeExecutorMap = Record<string, NodeExecutor>;
