/**
 * Node Executor Type Definitions
 */

import { Node } from '@xyflow/react';
import { WorkflowContext } from './common';

export interface NodeExecutor {
  /**
   * Execute the node with given context
   */
  execute(node: Node, context: WorkflowContext): Promise<unknown>;
  
  /**
   * Validate node configuration
   */
  validate(node: Node): string[];
  
  /**
   * Optional methods for specific node types
   */
  setup?(node: Node): Promise<void>;
  cleanup?(node: Node): Promise<void>;
  
  /**
   * Helper methods (optional)
   */
  [key: string]: unknown;
}

export interface NodeConfiguration {
  // Common configuration fields
  name?: string;
  description?: string;
  enabled?: boolean;
  timeout?: number;
  retryAttempts?: number;
  
  // Type-specific configuration
  [key: string]: unknown;
}

export interface NodeData {
  label: string;
  type: string;
  config?: NodeConfiguration;
  metadata?: NodeMetadata;
  validation?: NodeValidation;
}

export interface NodeMetadata {
  createdAt?: Date;
  updatedAt?: Date;
  executionCount?: number;
  lastExecutedAt?: Date;
  averageExecutionTime?: number;
  errorRate?: number;
}

export interface NodeValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Specific node type configurations
export interface TransformNodeConfig extends NodeConfiguration {
  transformType: 'mapping' | 'expression' | 'template';
  mapping?: Record<string, string>;
  expression?: string;
  template?: string;
}

export interface FilterNodeConfig extends NodeConfiguration {
  condition: string;
  operator?: 'and' | 'or';
  filters?: FilterCondition[];
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: unknown;
}

export interface APINodeConfig extends NodeConfiguration {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'apiKey';
    credentials?: Record<string, string>;
  };
}

export interface DatabaseNodeConfig extends NodeConfiguration {
  connectionString?: string;
  query: string;
  parameters?: Record<string, unknown>;
  operation: 'query' | 'insert' | 'update' | 'delete';
  transaction?: boolean;
}

export interface ConditionalNodeConfig extends NodeConfiguration {
  conditions: ConditionalBranch[];
  defaultBranch?: string;
}

export interface ConditionalBranch {
  id: string;
  condition: string;
  nextNode: string;
}

export interface LoopNodeConfig extends NodeConfiguration {
  iteratorType: 'array' | 'range' | 'while' | 'forEach';
  source?: string; // Path to array for array/forEach
  start?: number; // For range
  end?: number; // For range
  step?: number; // For range
  condition?: string; // For while
  maxIterations?: number;
}

export interface DelayNodeConfig extends NodeConfiguration {
  delayMs: number;
  delayType: 'fixed' | 'random' | 'exponential';
  minDelay?: number; // For random
  maxDelay?: number; // For random
  factor?: number; // For exponential
}

export interface ErrorHandlerNodeConfig extends NodeConfiguration {
  errorTypes: string[];
  retryStrategy?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
  fallbackNode?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Export type guards
export function isTransformNode(config: NodeConfiguration): config is TransformNodeConfig {
  return 'transformType' in config;
}

export function isFilterNode(config: NodeConfiguration): config is FilterNodeConfig {
  return 'condition' in config || 'filters' in config;
}

export function isAPINode(config: NodeConfiguration): config is APINodeConfig {
  return 'url' in config && 'method' in config;
}

export function isDatabaseNode(config: NodeConfiguration): config is DatabaseNodeConfig {
  return 'query' in config && 'operation' in config;
}

export function isConditionalNode(config: NodeConfiguration): config is ConditionalNodeConfig {
  return 'conditions' in config && Array.isArray(config.conditions);
}

export function isLoopNode(config: NodeConfiguration): config is LoopNodeConfig {
  return 'iteratorType' in config;
}

export function isDelayNode(config: NodeConfiguration): config is DelayNodeConfig {
  return 'delayMs' in config && 'delayType' in config;
}

export function isErrorHandlerNode(config: NodeConfiguration): config is ErrorHandlerNodeConfig {
  return 'errorTypes' in config && Array.isArray(config.errorTypes);
}