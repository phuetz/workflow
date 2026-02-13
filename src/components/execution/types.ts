import type { WorkflowNode, WorkflowEdge } from '../../types/workflow';

/** Default timeout in milliseconds (30 seconds) */
export const DEFAULT_NODE_TIMEOUT = 30000;

/** Result of a single node execution */
export interface NodeExecutionResult {
  status: 'success' | 'error';
  success: boolean;
  data?: Record<string, unknown>;
  error?: ExecutionError;
  duration: number;
  timestamp: string;
  nodeId: string;
  nodeType: string;
  timedOut?: boolean;
}

/** Error details for failed executions */
export interface ExecutionError {
  message: string;
  stack?: string;
  code: string;
}

/** Options for the workflow executor */
export interface ExecutorOptions {
  loadWorkflow?: (workflowId: string) => Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>;
  [key: string]: unknown;
}

/** Callback types for execution events */
export type OnNodeStart = (nodeId: string) => void;
export type OnNodeComplete = (nodeId: string, inputData: Record<string, unknown>, result: NodeExecutionResult) => void;
export type OnNodeError = (nodeId: string, error: ExecutionError) => void;

/** Configuration for node execution */
export interface NodeConfig {
  [key: string]: unknown;
}

/** Item with batch information */
export interface BatchItem {
  $batchIndex?: number;
  $batchTotal?: number;
  $itemIndex?: number;
  [key: string]: unknown;
}

/** Batch result structure */
export interface BatchResult {
  items: BatchItem[];
  batchIndex: number;
  batchTotal: number;
}

/** Aggregation operation types */
export type AggregationOperation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last' | 'concat' | 'unique';

/** Aggregation configuration */
export interface AggregationConfig {
  field: string;
  operation: AggregationOperation;
  outputField?: string;
}

/** Edit field operation */
export interface EditFieldOperation {
  action: 'set' | 'remove' | 'rename' | 'move' | 'copy';
  field: string;
  newField?: string;
  value?: unknown;
}

/** Assignment for Set node */
export interface SetAssignment {
  name: string;
  value: unknown;
  type?: string;
}

/** HTTP Request authentication config */
export interface HttpAuthentication {
  type: 'bearer' | 'basic' | 'apiKey';
  token?: string;
  username?: string;
  password?: string;
  name?: string;
  value?: string;
  in?: 'header' | 'query';
}

/** HTTP Response structure */
export interface HttpResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  url: string;
  method: string;
  duration: number;
  success: boolean;
}

/** Execution queue item */
export interface ExecutionQueueItem {
  node: WorkflowNode;
  inputData: Record<string, unknown>;
}

/** Re-export workflow types for convenience */
export type { WorkflowNode, WorkflowEdge };
