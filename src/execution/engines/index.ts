/**
 * Execution Engines - Unified Export
 *
 * This module provides a unified interface for all execution engine implementations.
 *
 * Architecture:
 * - WorkflowExecutor: Main execution engine for direct workflow execution
 * - AdvancedExecutionEngine: Extended features (scheduling, analytics, etc.)
 * - WorkerExecutionEngine: Background/worker-based execution
 * - TestExecutionEngine: Test harness execution (optional)
 *
 * Usage:
 * - For direct execution: use WorkflowExecutor
 * - For scheduled execution: use advancedExecutionEngine
 * - For background processing: use workerExecutionEngine
 */

// Import engines for local use
import { WorkflowExecutor } from '../../components/ExecutionEngine';
import { advancedExecutionEngine, AdvancedExecutionEngine } from '../../services/AdvancedExecutionEngine';
import { workerExecutionEngine, WorkerExecutionEngine } from '../../services/WorkerExecutionEngine';
import { testExecutionEngine, TestExecutionEngine } from '../../services/TestExecutionEngine';

// Re-export for external consumers
export { WorkflowExecutor } from '../../components/ExecutionEngine';
export { advancedExecutionEngine, AdvancedExecutionEngine } from '../../services/AdvancedExecutionEngine';
export { workerExecutionEngine, WorkerExecutionEngine } from '../../services/WorkerExecutionEngine';
export { testExecutionEngine, TestExecutionEngine } from '../../services/TestExecutionEngine';

// Common execution types
export interface ExecutionOptions {
  timeout?: number;
  retryOnError?: boolean;
  maxRetries?: number;
  executionMode?: 'sequential' | 'parallel';
  debug?: boolean;
  dryRun?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  nodeResults: Map<string, NodeExecutionResult>;
  error?: Error;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  input?: unknown;
  output?: unknown;
  error?: Error;
  duration?: number;
}

/**
 * Factory function to get the appropriate execution engine
 * Note: For 'default' type, WorkflowExecutor class is returned (not an instance)
 * as it requires nodes and edges parameters for instantiation.
 */
export function getExecutionEngine(type: 'advanced' | 'worker' | 'test') {
  switch (type) {
    case 'advanced':
      return advancedExecutionEngine;
    case 'worker':
      return workerExecutionEngine;
    case 'test':
      return testExecutionEngine;
  }
}
