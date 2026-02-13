/**
 * Workflow Execution Debugger
 * Step-by-step inspection, breakpoints, and performance profiling for workflow executions
 */

import { EventEmitter } from 'events';
import { getLogger } from './EnhancedLogger';
import { SecureExpressionEngineV2 } from '../../expressions/SecureExpressionEngineV2';

const logger = getLogger('workflow-debugger');

export type BreakpointType = 'node' | 'error' | 'condition' | 'step';

export interface Breakpoint {
  id: string;
  type: BreakpointType;
  enabled: boolean;
  condition?: string;
  nodeId?: string;
  workflowId?: string;
  hitCount?: number;
  logMessage?: string;
}

export interface DebugSession {
  id: string;
  executionId: string;
  workflowId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  state: 'running' | 'paused' | 'stepping' | 'completed' | 'error';
  currentNodeId?: string;
  breakpoints: Breakpoint[];
  variables: Map<string, any>;
  callStack: StackFrame[];
  performance: PerformanceProfile;
}

export interface StackFrame {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  enteredAt: Date;
  data?: any;
}

export interface PerformanceProfile {
  totalDuration: number;
  nodes: Map<string, NodePerformance>;
  bottlenecks: string[];
}

export interface NodePerformance {
  nodeId: string;
  nodeType: string;
  executionCount: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
  errors: number;
}

export interface DebuggerEvent {
  type: 'breakpoint' | 'step' | 'error' | 'complete' | 'variable_change';
  timestamp: Date;
  nodeId?: string;
  data?: any;
}

export interface InspectionData {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input: any;
  output?: any;
  error?: Error;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  memory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

/**
 * Workflow Debugger
 */
export class WorkflowDebugger extends EventEmitter {
  private static instance: WorkflowDebugger;
  private sessions: Map<string, DebugSession> = new Map();
  private globalBreakpoints: Map<string, Breakpoint> = new Map();
  private inspectionHistory: Map<string, InspectionData[]> = new Map();
  private eventHistory: Map<string, DebuggerEvent[]> = new Map();
  private maxHistorySize: number = 1000;

  private constructor() {
    super();
  }

  public static getInstance(): WorkflowDebugger {
    if (!WorkflowDebugger.instance) {
      WorkflowDebugger.instance = new WorkflowDebugger();
    }
    return WorkflowDebugger.instance;
  }

  /**
   * Start a debug session
   */
  startSession(
    executionId: string,
    workflowId: string,
    userId?: string
  ): DebugSession {
    const session: DebugSession = {
      id: this.generateSessionId(),
      executionId,
      workflowId,
      userId,
      startTime: new Date(),
      state: 'running',
      breakpoints: [],
      variables: new Map(),
      callStack: [],
      performance: {
        totalDuration: 0,
        nodes: new Map(),
        bottlenecks: [],
      },
    };

    this.sessions.set(session.id, session);
    this.inspectionHistory.set(session.id, []);
    this.eventHistory.set(session.id, []);

    logger.info('Debug session started', {
      sessionId: session.id,
      executionId,
      workflowId,
    });

    this.emitEvent(session.id, {
      type: 'step',
      timestamp: new Date(),
      data: { message: 'Debug session started' },
    });

    return session;
  }

  /**
   * End a debug session
   */
  endSession(sessionId: string, success: boolean = true): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.endTime = new Date();
    session.state = success ? 'completed' : 'error';
    session.performance.totalDuration =
      session.endTime.getTime() - session.startTime.getTime();

    // Analyze bottlenecks
    session.performance.bottlenecks = this.identifyBottlenecks(session);

    logger.info('Debug session ended', {
      sessionId,
      duration: session.performance.totalDuration,
      state: session.state,
    });

    this.emitEvent(sessionId, {
      type: 'complete',
      timestamp: new Date(),
      data: {
        duration: session.performance.totalDuration,
        bottlenecks: session.performance.bottlenecks,
      },
    });
  }

  /**
   * Get a debug session
   */
  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add a breakpoint
   */
  addBreakpoint(breakpoint: Omit<Breakpoint, 'id' | 'hitCount'>): Breakpoint {
    const bp: Breakpoint = {
      ...breakpoint,
      id: this.generateBreakpointId(),
      hitCount: 0,
    };

    this.globalBreakpoints.set(bp.id, bp);

    logger.debug('Breakpoint added', {
      breakpointId: bp.id,
      type: bp.type,
      nodeId: bp.nodeId,
    });

    return bp;
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(breakpointId: string): boolean {
    const deleted = this.globalBreakpoints.delete(breakpointId);
    if (deleted) {
      logger.debug('Breakpoint removed', { breakpointId });
    }
    return deleted;
  }

  /**
   * Enable/disable breakpoint
   */
  toggleBreakpoint(breakpointId: string, enabled: boolean): boolean {
    const bp = this.globalBreakpoints.get(breakpointId);
    if (bp) {
      bp.enabled = enabled;
      logger.debug('Breakpoint toggled', { breakpointId, enabled });
      return true;
    }
    return false;
  }

  /**
   * Step into node execution
   */
  async stepInto(
    sessionId: string,
    nodeId: string,
    nodeName: string,
    nodeType: string,
    input: any
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.currentNodeId = nodeId;

    // Push to call stack
    const frame: StackFrame = {
      nodeId,
      nodeName,
      nodeType,
      enteredAt: new Date(),
      data: input,
    };
    session.callStack.push(frame);

    // Record memory usage
    const memUsage = process.memoryUsage();

    // Create inspection data
    const inspection: InspectionData = {
      nodeId,
      nodeName,
      nodeType,
      input,
      startTime: new Date(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
    };

    const history = this.inspectionHistory.get(sessionId) || [];
    history.push(inspection);
    this.trimHistory(history);
    this.inspectionHistory.set(sessionId, history);

    // Check breakpoints
    const shouldPause = await this.checkBreakpoints(session, nodeId);
    if (shouldPause) {
      session.state = 'paused';
      this.emitEvent(sessionId, {
        type: 'breakpoint',
        timestamp: new Date(),
        nodeId,
        data: { nodeName, nodeType, input },
      });

      logger.debug('Execution paused at breakpoint', {
        sessionId,
        nodeId,
        nodeName,
      });
    }

    this.emitEvent(sessionId, {
      type: 'step',
      timestamp: new Date(),
      nodeId,
      data: { nodeName, nodeType, state: session.state },
    });
  }

  /**
   * Step out of node execution
   */
  stepOut(
    sessionId: string,
    nodeId: string,
    output?: any,
    error?: Error
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Pop from call stack
    const frame = session.callStack.pop();
    if (!frame) {
      return;
    }

    const duration = Date.now() - frame.enteredAt.getTime();

    // Update inspection data
    const history = this.inspectionHistory.get(sessionId) || [];
    const inspection = history.find(
      (i) => i.nodeId === nodeId && !i.endTime
    );

    if (inspection) {
      inspection.endTime = new Date();
      inspection.duration = duration;
      inspection.output = output;
      inspection.error = error;
    }

    // Update performance profile
    this.updatePerformanceProfile(session, nodeId, frame.nodeType, duration, !!error);

    if (error) {
      this.emitEvent(sessionId, {
        type: 'error',
        timestamp: new Date(),
        nodeId,
        data: {
          nodeName: frame.nodeName,
          error: error.message,
          stack: error.stack,
        },
      });
    }

    // Update current node
    if (session.callStack.length > 0) {
      const parentFrame = session.callStack[session.callStack.length - 1];
      session.currentNodeId = parentFrame.nodeId;
    } else {
      session.currentNodeId = undefined;
    }
  }

  /**
   * Set a variable value
   */
  setVariable(sessionId: string, name: string, value: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.variables.set(name, value);

    this.emitEvent(sessionId, {
      type: 'variable_change',
      timestamp: new Date(),
      data: { name, value },
    });

    logger.debug('Variable set', { sessionId, name });
  }

  /**
   * Get a variable value
   */
  getVariable(sessionId: string, name: string): any {
    const session = this.sessions.get(sessionId);
    return session?.variables.get(name);
  }

  /**
   * Get all variables
   */
  getVariables(sessionId: string): Record<string, any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {};
    }

    return Object.fromEntries(session.variables.entries());
  }

  /**
   * Resume execution from pause
   */
  resume(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'paused') {
      return;
    }

    session.state = 'running';

    logger.debug('Execution resumed', { sessionId });

    this.emitEvent(sessionId, {
      type: 'step',
      timestamp: new Date(),
      data: { message: 'Execution resumed' },
    });
  }

  /**
   * Step to next node
   */
  stepNext(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'paused') {
      return;
    }

    session.state = 'stepping';

    logger.debug('Stepping to next node', { sessionId });
  }

  /**
   * Check if any breakpoints should trigger
   */
  private async checkBreakpoints(session: DebugSession, nodeId: string): Promise<boolean> {
    const breakpoints = Array.from(this.globalBreakpoints.values()).filter(
      (bp) =>
        bp.enabled &&
        (!bp.workflowId || bp.workflowId === session.workflowId) &&
        (!bp.nodeId || bp.nodeId === nodeId)
    );

    for (const bp of breakpoints) {
      // Check condition if specified
      if (bp.condition) {
        try {
          const shouldBreak = await this.evaluateCondition(
            bp.condition,
            session
          );
          if (!shouldBreak) {
            continue;
          }
        } catch (error) {
          logger.warn('Breakpoint condition evaluation failed', {
            breakpointId: bp.id,
            error,
          });
          continue;
        }
      }

      // Increment hit count
      bp.hitCount = (bp.hitCount || 0) + 1;

      // Log message if specified
      if (bp.logMessage) {
        logger.info(bp.logMessage, {
          sessionId: session.id,
          nodeId,
          hitCount: bp.hitCount,
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Evaluate breakpoint condition
   */
  private async evaluateCondition(
    condition: string,
    session: DebugSession
  ): Promise<boolean> {
    try {
      // Create safe evaluation context
      const context = {
        variables: Object.fromEntries(session.variables.entries()),
        currentNode: session.currentNodeId,
        // Add other safe context variables as needed
      };

      // SECURITY FIX: Use SecureExpressionEngineV2 instead of new Function()
      // This prevents RCE attacks through malicious breakpoint conditions
      const evalResult = SecureExpressionEngineV2.evaluateExpression(
        condition,
        context,
        { timeout: 500 } // Reasonable timeout for breakpoint condition
      );

      if (!evalResult.success) {
        logger.warn('Breakpoint condition evaluation failed', {
          condition,
          error: evalResult.error,
          securityBlocks: evalResult.securityBlocks,
        });
        return false;
      }

      return Boolean(evalResult.value);
    } catch (error) {
      logger.error('Error evaluating breakpoint condition', error, {
        condition,
      });
      return false;
    }
  }

  /**
   * Update performance profile
   */
  private updatePerformanceProfile(
    session: DebugSession,
    nodeId: string,
    nodeType: string,
    duration: number,
    hasError: boolean
  ): void {
    let nodePerf = session.performance.nodes.get(nodeId);

    if (!nodePerf) {
      nodePerf = {
        nodeId,
        nodeType,
        executionCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastDuration: 0,
        errors: 0,
      };
      session.performance.nodes.set(nodeId, nodePerf);
    }

    nodePerf.executionCount++;
    nodePerf.totalDuration += duration;
    nodePerf.averageDuration = nodePerf.totalDuration / nodePerf.executionCount;
    nodePerf.minDuration = Math.min(nodePerf.minDuration, duration);
    nodePerf.maxDuration = Math.max(nodePerf.maxDuration, duration);
    nodePerf.lastDuration = duration;

    if (hasError) {
      nodePerf.errors++;
    }
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(session: DebugSession): string[] {
    const bottlenecks: string[] = [];
    const threshold = 1000; // 1 second

    for (const [nodeId, perf] of session.performance.nodes.entries()) {
      if (perf.averageDuration > threshold) {
        bottlenecks.push(
          `Node ${nodeId} (${perf.nodeType}): avg ${perf.averageDuration.toFixed(0)}ms`
        );
      }
    }

    return bottlenecks.sort((a, b) => {
      const aDuration = parseFloat(a.match(/avg (\d+)ms/)?.[1] || '0');
      const bDuration = parseFloat(b.match(/avg (\d+)ms/)?.[1] || '0');
      return bDuration - aDuration;
    });
  }

  /**
   * Get inspection history
   */
  getInspectionHistory(sessionId: string): InspectionData[] {
    return this.inspectionHistory.get(sessionId) || [];
  }

  /**
   * Get event history
   */
  getEventHistory(sessionId: string): DebuggerEvent[] {
    return this.eventHistory.get(sessionId) || [];
  }

  /**
   * Get performance profile
   */
  getPerformanceProfile(sessionId: string): PerformanceProfile | undefined {
    const session = this.sessions.get(sessionId);
    return session?.performance;
  }

  /**
   * Emit debugger event
   */
  private emitEvent(sessionId: string, event: DebuggerEvent): void {
    const events = this.eventHistory.get(sessionId) || [];
    events.push(event);
    this.trimHistory(events);
    this.eventHistory.set(sessionId, events);

    this.emit('debug-event', { sessionId, event });
  }

  /**
   * Trim history to max size
   */
  private trimHistory(history: any[]): void {
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate breakpoint ID
   */
  private generateBreakpointId(): string {
    return `bp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clear old sessions
   */
  clearOldSessions(olderThan: Date = new Date(Date.now() - 86400000)): number {
    let cleared = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.endTime && session.endTime < olderThan) {
        this.sessions.delete(sessionId);
        this.inspectionHistory.delete(sessionId);
        this.eventHistory.delete(sessionId);
        cleared++;
      }
    }

    logger.info('Cleared old debug sessions', { count: cleared });
    return cleared;
  }

  /**
   * Export session data for analysis
   */
  exportSession(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      session: {
        ...session,
        variables: Object.fromEntries(session.variables.entries()),
        performance: {
          ...session.performance,
          nodes: Array.from(session.performance.nodes.entries()).map(([id, perf]) => ({
            id,
            ...perf,
          })),
        },
      },
      inspectionHistory: this.getInspectionHistory(sessionId),
      eventHistory: this.getEventHistory(sessionId),
    };
  }
}

export function getWorkflowDebugger(): WorkflowDebugger {
  return WorkflowDebugger.getInstance();
}

export default WorkflowDebugger;
