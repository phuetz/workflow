/**
 * Workflow Execution Debugger
 * Advanced debugging and monitoring for workflow executions
 */

import type { Node, Edge } from 'reactflow';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface NodeExecutionState {
  nodeId: string;
  status: ExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  retryCount?: number;
  memoryUsage?: number;
  cpuTime?: number;
}

export interface DebugLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  nodeId?: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

export interface Breakpoint {
  id: string;
  nodeId: string;
  condition?: string; // JavaScript expression that must evaluate to true
  enabled: boolean;
  hitCount: number;
  logMessage?: string; // Log instead of pausing
}

export interface WatchExpression {
  id: string;
  expression: string;
  value?: any;
  error?: string;
}

export interface ExecutionSnapshot {
  timestamp: Date;
  nodeStates: Map<string, NodeExecutionState>;
  variables: Record<string, any>;
  logs: DebugLog[];
}

export interface DebuggerState {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  currentNode?: string;
  nodeStates: Map<string, NodeExecutionState>;
  logs: DebugLog[];
  breakpoints: Map<string, Breakpoint>;
  watchExpressions: WatchExpression[];
  variables: Record<string, any>;
  snapshots: ExecutionSnapshot[];
  startedAt?: Date;
  completedAt?: Date;
  totalDuration?: number;
}

class ExecutionDebugger {
  private sessions: Map<string, DebuggerState> = new Map();
  private listeners: Map<string, Set<(state: DebuggerState) => void>> = new Map();
  private stepMode: boolean = false;

  /**
   * Start a new debug session
   */
  startSession(
    executionId: string,
    workflowId: string,
    nodes: Node[]
  ): DebuggerState {
    const state: DebuggerState = {
      executionId,
      workflowId,
      status: ExecutionStatus.PENDING,
      nodeStates: new Map(),
      logs: [],
      breakpoints: new Map(),
      watchExpressions: [],
      variables: {},
      snapshots: [],
      startedAt: new Date()
    };

    // Initialize node states
    nodes.forEach(node => {
      state.nodeStates.set(node.id, {
        nodeId: node.id,
        status: ExecutionStatus.PENDING
      });
    });

    this.sessions.set(executionId, state);
    this.notifyListeners(executionId, state);

    return state;
  }

  /**
   * Update node execution state
   */
  updateNodeState(
    executionId: string,
    nodeId: string,
    updates: Partial<NodeExecutionState>
  ): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    const nodeState = state.nodeStates.get(nodeId);
    if (!nodeState) return;

    // Update node state
    const updatedState = { ...nodeState, ...updates };

    // Calculate duration if completed
    if (updatedState.completedAt && updatedState.startedAt) {
      updatedState.duration =
        updatedState.completedAt.getTime() - updatedState.startedAt.getTime();
    }

    state.nodeStates.set(nodeId, updatedState);
    state.currentNode = nodeId;

    // Create snapshot on state change
    if (updates.status) {
      this.createSnapshot(executionId);
    }

    this.notifyListeners(executionId, state);
  }

  /**
   * Log a message
   */
  log(
    executionId: string,
    level: LogLevel,
    message: string,
    data?: any,
    nodeId?: string
  ): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    const log: DebugLog = {
      id: this.generateId('log'),
      timestamp: new Date(),
      level,
      nodeId,
      message,
      data,
      stackTrace: level === LogLevel.ERROR ? new Error().stack : undefined
    };

    state.logs.push(log);

    // Keep only last 1000 logs
    if (state.logs.length > 1000) {
      state.logs = state.logs.slice(-1000);
    }

    this.notifyListeners(executionId, state);
  }

  /**
   * Add breakpoint
   */
  addBreakpoint(
    executionId: string,
    nodeId: string,
    condition?: string,
    logMessage?: string
  ): Breakpoint {
    const state = this.sessions.get(executionId);
    if (!state) throw new Error('Session not found');

    const breakpoint: Breakpoint = {
      id: this.generateId('bp'),
      nodeId,
      condition,
      enabled: true,
      hitCount: 0,
      logMessage
    };

    state.breakpoints.set(breakpoint.id, breakpoint);
    this.notifyListeners(executionId, state);

    return breakpoint;
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(executionId: string, breakpointId: string): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    state.breakpoints.delete(breakpointId);
    this.notifyListeners(executionId, state);
  }

  /**
   * Toggle breakpoint
   */
  toggleBreakpoint(executionId: string, breakpointId: string): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    const breakpoint = state.breakpoints.get(breakpointId);
    if (!breakpoint) return;

    breakpoint.enabled = !breakpoint.enabled;
    this.notifyListeners(executionId, state);
  }

  /**
   * Check if should break at node
   */
  shouldBreak(executionId: string, nodeId: string, context: any): boolean {
    const state = this.sessions.get(executionId);
    if (!state) return false;

    // Check if in step mode
    if (this.stepMode) {
      return true;
    }

    // Check breakpoints
    for (const breakpoint of state.breakpoints.values()) {
      if (breakpoint.nodeId !== nodeId || !breakpoint.enabled) continue;

      breakpoint.hitCount++;

      // Check condition if present
      if (breakpoint.condition) {
        try {
          const result = this.evaluateExpression(breakpoint.condition, context);
          if (!result) continue;
        } catch (error) {
          this.log(
            executionId,
            LogLevel.WARN,
            `Breakpoint condition error: ${error}`,
            undefined,
            nodeId
          );
          continue;
        }
      }

      // Log message if configured
      if (breakpoint.logMessage) {
        this.log(
          executionId,
          LogLevel.INFO,
          `Breakpoint: ${breakpoint.logMessage}`,
          undefined,
          nodeId
        );
        continue;
      }

      return true;
    }

    return false;
  }

  /**
   * Add watch expression
   */
  addWatch(executionId: string, expression: string): WatchExpression {
    const state = this.sessions.get(executionId);
    if (!state) throw new Error('Session not found');

    const watch: WatchExpression = {
      id: this.generateId('watch'),
      expression
    };

    state.watchExpressions.push(watch);
    this.updateWatches(executionId);

    return watch;
  }

  /**
   * Remove watch expression
   */
  removeWatch(executionId: string, watchId: string): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    state.watchExpressions = state.watchExpressions.filter(w => w.id !== watchId);
    this.notifyListeners(executionId, state);
  }

  /**
   * Update all watch expressions
   */
  private updateWatches(executionId: string): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    for (const watch of state.watchExpressions) {
      try {
        watch.value = this.evaluateExpression(watch.expression, state.variables);
        watch.error = undefined;
      } catch (error) {
        watch.value = undefined;
        watch.error = error instanceof Error ? error.message : String(error);
      }
    }

    this.notifyListeners(executionId, state);
  }

  /**
   * Evaluate JavaScript expression
   */
  private evaluateExpression(expression: string, context: any): any {
    // Create a safe evaluation context
    const func = new Function(
      ...Object.keys(context),
      `return ${expression}`
    );
    return func(...Object.values(context));
  }

  /**
   * Set variable
   */
  setVariable(executionId: string, name: string, value: any): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    state.variables[name] = value;
    this.updateWatches(executionId);
    this.notifyListeners(executionId, state);
  }

  /**
   * Create execution snapshot
   */
  createSnapshot(executionId: string): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    const snapshot: ExecutionSnapshot = {
      timestamp: new Date(),
      nodeStates: new Map(state.nodeStates),
      variables: { ...state.variables },
      logs: [...state.logs]
    };

    state.snapshots.push(snapshot);

    // Keep only last 50 snapshots
    if (state.snapshots.length > 50) {
      state.snapshots = state.snapshots.slice(-50);
    }
  }

  /**
   * Restore from snapshot
   */
  restoreSnapshot(executionId: string, snapshotIndex: number): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    const snapshot = state.snapshots[snapshotIndex];
    if (!snapshot) return;

    state.nodeStates = new Map(snapshot.nodeStates);
    state.variables = { ...snapshot.variables };
    state.logs = [...snapshot.logs];

    this.notifyListeners(executionId, state);
  }

  /**
   * Pause execution
   */
  pause(executionId: string): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    state.status = ExecutionStatus.PAUSED;
    this.createSnapshot(executionId);
    this.notifyListeners(executionId, state);
  }

  /**
   * Resume execution
   */
  resume(executionId: string): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    state.status = ExecutionStatus.RUNNING;
    this.stepMode = false;
    this.notifyListeners(executionId, state);
  }

  /**
   * Step to next node
   */
  stepOver(executionId: string): void {
    this.stepMode = true;
    this.resume(executionId);
  }

  /**
   * Complete execution
   */
  complete(executionId: string, success: boolean = true): void {
    const state = this.sessions.get(executionId);
    if (!state) return;

    state.status = success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;
    state.completedAt = new Date();

    if (state.startedAt) {
      state.totalDuration = state.completedAt.getTime() - state.startedAt.getTime();
    }

    this.createSnapshot(executionId);
    this.notifyListeners(executionId, state);
  }

  /**
   * Get execution statistics
   */
  getStatistics(executionId: string) {
    const state = this.sessions.get(executionId);
    if (!state) return null;

    const nodeStates = Array.from(state.nodeStates.values());

    return {
      totalNodes: nodeStates.length,
      completedNodes: nodeStates.filter(n => n.status === ExecutionStatus.COMPLETED).length,
      failedNodes: nodeStates.filter(n => n.status === ExecutionStatus.FAILED).length,
      pendingNodes: nodeStates.filter(n => n.status === ExecutionStatus.PENDING).length,
      totalDuration: state.totalDuration || 0,
      averageNodeDuration:
        nodeStates
          .filter(n => n.duration)
          .reduce((sum, n) => sum + (n.duration || 0), 0) / nodeStates.length || 0,
      slowestNode: nodeStates.reduce((slowest, node) =>
        (node.duration || 0) > (slowest.duration || 0) ? node : slowest
      , nodeStates[0]),
      errorCount: state.logs.filter(l => l.level === LogLevel.ERROR).length,
      warningCount: state.logs.filter(l => l.level === LogLevel.WARN).length
    };
  }

  /**
   * Export debug session
   */
  exportSession(executionId: string): string {
    const state = this.sessions.get(executionId);
    if (!state) throw new Error('Session not found');

    const exportData = {
      executionId: state.executionId,
      workflowId: state.workflowId,
      status: state.status,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      totalDuration: state.totalDuration,
      nodeStates: Array.from(state.nodeStates.entries()),
      logs: state.logs,
      variables: state.variables,
      statistics: this.getStatistics(executionId)
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(executionId: string, callback: (state: DebuggerState) => void): () => void {
    if (!this.listeners.has(executionId)) {
      this.listeners.set(executionId, new Set());
    }

    this.listeners.get(executionId)!.add(callback);

    return () => {
      const listeners = this.listeners.get(executionId);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(executionId: string, state: DebuggerState): void {
    const listeners = this.listeners.get(executionId);
    if (!listeners) return;

    listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in debugger listener:', error);
      }
    });
  }

  /**
   * Get session state
   */
  getState(executionId: string): DebuggerState | undefined {
    return this.sessions.get(executionId);
  }

  /**
   * Clear session
   */
  clearSession(executionId: string): void {
    this.sessions.delete(executionId);
    this.listeners.delete(executionId);
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const executionDebugger = new ExecutionDebugger();

/**
 * React hook for debugging
 */
export function useExecutionDebugger(executionId: string) {
  const [state, setState] = React.useState<DebuggerState | undefined>();

  React.useEffect(() => {
    const currentState = executionDebugger.getState(executionId);
    if (currentState) {
      setState(currentState);
    }

    const unsubscribe = executionDebugger.subscribe(executionId, setState);
    return unsubscribe;
  }, [executionId]);

  return {
    state,
    log: (level: LogLevel, message: string, data?: any, nodeId?: string) =>
      executionDebugger.log(executionId, level, message, data, nodeId),
    addBreakpoint: (nodeId: string, condition?: string) =>
      executionDebugger.addBreakpoint(executionId, nodeId, condition),
    removeBreakpoint: (breakpointId: string) =>
      executionDebugger.removeBreakpoint(executionId, breakpointId),
    addWatch: (expression: string) =>
      executionDebugger.addWatch(executionId, expression),
    pause: () => executionDebugger.pause(executionId),
    resume: () => executionDebugger.resume(executionId),
    stepOver: () => executionDebugger.stepOver(executionId),
    getStatistics: () => executionDebugger.getStatistics(executionId)
  };
}

// React namespace
import * as React from 'react';
