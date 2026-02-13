/**
 * Debug Manager
 * Provides breakpoint debugging and step-through execution
 */

import { logger } from '../services/SimpleLogger';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { SafeObject, SafeExecutionResult } from '../utils/TypeSafetyUtils';

export interface Breakpoint {
  nodeId: string;
  enabled: boolean;
  condition?: string; // Expression to evaluate
  hitCount?: number;
  createdAt: string;
}

export interface DebugSession {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'stopped';
  currentNode: string | null;
  executionStack: string[];
  variables: Map<string, SafeObject>;
  breakpoints: Map<string, Breakpoint>;
  stepMode: 'over' | 'into' | 'out' | null;
  startTime: number;
}

export interface DebugEvent {
  type: 'breakpoint' | 'step' | 'error' | 'complete';
  nodeId: string;
  timestamp: string;
  data?: SafeObject;
}

export type DebugEventCallback = (event: DebugEvent) => void;

/**
 * Debug Manager for workflow execution
 */
export class DebugManager {
  private sessions = new Map<string, DebugSession>();
  private eventCallbacks: DebugEventCallback[] = [];
  private breakpointHitCounts = new Map<string, number>();

  constructor() {
    logger.info('🐛 Debug Manager initialized');
  }

  /**
   * Create a new debug session
   */
  createSession(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): DebugSession {
    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const session: DebugSession = {
      id: sessionId,
      status: 'idle',
      currentNode: null,
      executionStack: [],
      variables: new Map(),
      breakpoints: new Map(),
      stepMode: null,
      startTime: Date.now()
    };

    this.sessions.set(sessionId, session);

    logger.info(`🐛 Debug session created: ${sessionId}`);
    return session;
  }

  /**
   * Get debug session
   */
  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Delete debug session
   */
  deleteSession(sessionId: string): boolean {
    const existed = this.sessions.has(sessionId);
    if (existed) {
      this.sessions.delete(sessionId);
      logger.info(`🐛 Debug session deleted: ${sessionId}`);
    }
    return existed;
  }

  /**
   * Add breakpoint
   */
  addBreakpoint(
    sessionId: string,
    nodeId: string,
    condition?: string
  ): Breakpoint {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session not found: ${sessionId}`);
    }

    const breakpoint: Breakpoint = {
      nodeId,
      enabled: true,
      condition,
      hitCount: 0,
      createdAt: new Date().toISOString()
    };

    session.breakpoints.set(nodeId, breakpoint);
    this.breakpointHitCounts.set(nodeId, 0);

    logger.info(`🔴 Breakpoint added at node: ${nodeId}`);
    return breakpoint;
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(sessionId: string, nodeId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const existed = session.breakpoints.has(nodeId);
    if (existed) {
      session.breakpoints.delete(nodeId);
      this.breakpointHitCounts.delete(nodeId);
      logger.info(`⚪ Breakpoint removed from node: ${nodeId}`);
    }

    return existed;
  }

  /**
   * Toggle breakpoint
   */
  toggleBreakpoint(sessionId: string, nodeId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const breakpoint = session.breakpoints.get(nodeId);
    if (breakpoint) {
      breakpoint.enabled = !breakpoint.enabled;
      logger.info(`🔴 Breakpoint ${breakpoint.enabled ? 'enabled' : 'disabled'} at node: ${nodeId}`);
      return breakpoint.enabled;
    }

    return false;
  }

  /**
   * Check if should pause at node
   */
  shouldPauseAtNode(
    sessionId: string,
    nodeId: string,
    variables?: SafeObject
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Check if in step mode
    if (session.stepMode === 'over') {
      return true;
    }

    // Check breakpoint
    const breakpoint = session.breakpoints.get(nodeId);
    if (!breakpoint || !breakpoint.enabled) {
      return false;
    }

    // Increment hit count
    const currentHitCount = this.breakpointHitCounts.get(nodeId) || 0;
    this.breakpointHitCounts.set(nodeId, currentHitCount + 1);
    breakpoint.hitCount = currentHitCount + 1;

    // Evaluate condition if present
    if (breakpoint.condition && variables) {
      try {
        const shouldPause = this.evaluateBreakpointCondition(
          breakpoint.condition,
          variables
        );
        return shouldPause;
      } catch (error) {
        logger.error(`Failed to evaluate breakpoint condition: ${breakpoint.condition}`, error);
        return true; // Pause on error
      }
    }

    return true;
  }

  /**
   * Pause execution
   */
  pause(sessionId: string, nodeId: string, variables?: SafeObject): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'paused';
    session.currentNode = nodeId;

    if (variables) {
      session.variables.set(nodeId, variables);
    }

    logger.info(`⏸️ Execution paused at node: ${nodeId}`);

    // Emit event
    this.emitEvent({
      type: 'breakpoint',
      nodeId,
      timestamp: new Date().toISOString(),
      data: variables
    });
  }

  /**
   * Continue execution
   */
  continue(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'running';
    session.stepMode = null;

    logger.info(`▶️ Execution continued from node: ${session.currentNode}`);
  }

  /**
   * Step over (execute current node and pause at next)
   */
  stepOver(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'running';
    session.stepMode = 'over';

    logger.info(`👣 Step over from node: ${session.currentNode}`);
  }

  /**
   * Step into (go into sub-workflow or continue)
   */
  stepInto(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'running';
    session.stepMode = 'into';

    logger.info(`👣 Step into from node: ${session.currentNode}`);
  }

  /**
   * Step out (continue until current sub-workflow completes)
   */
  stepOut(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'running';
    session.stepMode = 'out';

    logger.info(`👣 Step out from node: ${session.currentNode}`);
  }

  /**
   * Stop debugging
   */
  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'stopped';
    session.currentNode = null;
    session.stepMode = null;

    logger.info(`⏹️ Debugging stopped for session: ${sessionId}`);

    // Emit event
    this.emitEvent({
      type: 'complete',
      nodeId: session.currentNode || '',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get execution variables
   */
  getVariables(sessionId: string, nodeId?: string): SafeObject | Map<string, SafeObject> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {};
    }

    if (nodeId) {
      return session.variables.get(nodeId) || {};
    }

    return session.variables;
  }

  /**
   * Set execution variable
   */
  setVariable(
    sessionId: string,
    nodeId: string,
    key: string,
    value: unknown
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const variables = session.variables.get(nodeId) || {};
    variables[key] = value;
    session.variables.set(nodeId, variables);

    logger.debug(`Set variable ${key} for node ${nodeId}`);
  }

  /**
   * Get execution stack
   */
  getExecutionStack(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.executionStack] : [];
  }

  /**
   * Push to execution stack
   */
  pushToStack(sessionId: string, nodeId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.executionStack.push(nodeId);
    }
  }

  /**
   * Pop from execution stack
   */
  popFromStack(sessionId: string): string | undefined {
    const session = this.sessions.get(sessionId);
    return session ? session.executionStack.pop() : undefined;
  }

  /**
   * Register event callback
   */
  onEvent(callback: DebugEventCallback): () => void {
    this.eventCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit debug event
   */
  private emitEvent(event: DebugEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error in debug event callback:', error);
      }
    }
  }

  /**
   * Evaluate breakpoint condition
   */
  private evaluateBreakpointCondition(
    condition: string,
    variables: SafeObject
  ): boolean {
    try {
      // Simple expression evaluation
      // In production, use a proper expression evaluator

      // Example: "value > 10" or "status === 'error'"
      const fn = new Function(...Object.keys(variables), `return ${condition}`);
      const result = fn(...Object.values(variables));

      return Boolean(result);
    } catch (error) {
      logger.error(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Get debug statistics
   */
  getStats(sessionId: string): {
    totalBreakpoints: number;
    enabledBreakpoints: number;
    totalHits: number;
    variableCount: number;
    stackDepth: number;
    elapsedTime: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        totalBreakpoints: 0,
        enabledBreakpoints: 0,
        totalHits: 0,
        variableCount: 0,
        stackDepth: 0,
        elapsedTime: 0
      };
    }

    const totalBreakpoints = session.breakpoints.size;
    const enabledBreakpoints = Array.from(session.breakpoints.values())
      .filter(bp => bp.enabled).length;
    const totalHits = Array.from(this.breakpointHitCounts.values())
      .reduce((sum, count) => sum + count, 0);

    return {
      totalBreakpoints,
      enabledBreakpoints,
      totalHits,
      variableCount: session.variables.size,
      stackDepth: session.executionStack.length,
      elapsedTime: Date.now() - session.startTime
    };
  }

  /**
   * Clear all breakpoints
   */
  clearAllBreakpoints(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.breakpoints.clear();
      this.breakpointHitCounts.clear();
      logger.info(`🗑️ Cleared all breakpoints for session: ${sessionId}`);
    }
  }

  /**
   * Export debug session state
   */
  exportSession(sessionId: string): Record<string, unknown> | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      status: session.status,
      currentNode: session.currentNode,
      executionStack: session.executionStack,
      breakpoints: Array.from(session.breakpoints.entries()),
      variables: Array.from(session.variables.entries()),
      stepMode: session.stepMode,
      elapsedTime: Date.now() - session.startTime
    };
  }
}

/**
 * Singleton instance
 */
export const debugManager = new DebugManager();
