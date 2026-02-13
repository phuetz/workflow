/**
 * Shared Agentic Pattern Types - Breaking Circular Dependencies
 * This file contains only type definitions with no imports
 */

export interface AgentTask {
  id: string;
  type: string;
  input: any;
  context?: any;
  priority?: number;
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: any;
  timestamp: string;
}

export interface PatternExecutor {
  execute: (task: AgentTask) => Promise<AgentResult>;
  getName: () => string;
}

export type PatternRegistry = Record<string, PatternExecutor>;
