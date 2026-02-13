/**
 * Core Debugging Engine
 * Orchestrates step-by-step debugging with breakpoints, variable inspection, and profiling
 */

import type {
  DebugSession,
  DebuggerOptions,
  VariableScope,
  CallStackFrame,
  WatchExpression,
  DebuggerEventType,
  LogLevel,
  LogEntry
} from '../types/debugging';
import { BreakpointManager } from './BreakpointManager';
import { StepController } from './StepController';
import { ExtendedLogger } from './ExtendedLogger';

// Extended DebugSession interface with additional runtime properties
interface ExtendedDebugSession extends Omit<DebugSession, 'callStack'> {
  state: 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  isPaused: boolean;
  endTime?: number;
  watchExpressions: WatchExpression[];
  callStack: CallStackFrame[]; // Use CallStackFrame instead of DebugFrame
}

export class Debugger {
  private sessions: Map<string, ExtendedDebugSession> = new Map();
  private activeSessionId: string | null = null;
  private breakpointManager: BreakpointManager;
  private stepController: StepController;
  private logger: ExtendedLogger;
  private listeners: Set<(event: DebuggerEventType) => void> = new Set();
  private options: Required<DebuggerOptions>;

  constructor(
    breakpointManager: BreakpointManager,
    stepController: StepController,
    logger: ExtendedLogger,
    options: DebuggerOptions = {}
  ) {
    this.breakpointManager = breakpointManager;
    this.stepController = stepController;
    this.logger = logger;

    this.options = {
      enableBreakpoints: true,
      enableProfiling: true,
      enableMemoryProfiling: false,
      maxLogEntries: 1000,
      logLevel: 'INFO',
      profilingInterval: 100,
      memorySnapshotInterval: 1000,
      ...options
    };
  }

  /**
   * Start a new debug session
   */
  startSession(workflowId: string, executionId: string, workflowName?: string): ExtendedDebugSession {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: ExtendedDebugSession = {
      id: sessionId,
      workflowId,
      executionId,
      workflowName: workflowName || 'Workflow', // Store workflow name in session
      status: 'running',
      state: 'running',
      currentNodeId: undefined,
      callStack: [],
      breakpoints: new Map(),
      watchExpressions: [],
      variables: {
        nodeInput: {},
        nodeOutput: {},
        workflowVariables: {},
        environmentVariables: {},
        credentials: {}
      },
      stepMode: 'none',
      startTime: new Date(),
      logs: [],
      isPaused: false
    };

    // Copy workflow breakpoints to session
    const workflowBreakpoints = this.breakpointManager.getBreakpointsForWorkflow(workflowId);
    workflowBreakpoints.forEach(bp => {
      session.breakpoints.set(bp.id, bp);
    });

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;
    this.stepController.reset();
    this.stepController.setExecutionState('running');

    this.emit({
      type: 'execution-resumed'
    });

    this.logger.log('INFO', 'Debugger', `Debug session started: ${sessionId}`, {
      workflowId,
      executionId,
      sessionId
    });

    return session;
  }

  /**
   * Stop a debug session
   */
  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'stopped';
    session.status = 'stopped';
    session.endTime = Date.now();
    this.stepController.stop();

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }

    this.emit({
      type: 'execution-stopped'
    });

    this.logger.log('INFO', 'Debugger', `Debug session stopped: ${sessionId}`, {
      workflowId: session.workflowId,
      workflowName: session.workflowName || 'Workflow',
      executionId: session.executionId
    });
  }

  /**
   * Called before executing a node
   */
  async beforeNodeExecution(
    sessionId: string,
    nodeId: string,
    nodeName: string,
    nodeInput: Record<string, unknown>,
    depth: number = 0
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return true; // Continue execution

    session.currentNodeId = nodeId;

    // Update variables - create proper VariableScope
    const variableScope: VariableScope = {
      nodeInput,
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    };

    // Add to call stack
    const frame: CallStackFrame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId: session.workflowId,
      workflowName: session.workflowName || 'Workflow', // Get from session
      nodeId,
      nodeName,
      depth,
      variables: variableScope,
      timestamp: Date.now()
    };
    session.callStack.push(frame);

    // Evaluate watch expressions
    this.evaluateWatchExpressions(session);

    // Check for breakpoints
    if (this.options.enableBreakpoints) {
      const breakpointHit = this.breakpointManager.shouldBreak(
        nodeId,
        session.workflowId,
        variableScope
      );

      if (breakpointHit) {
        await this.pauseAtBreakpoint(session, breakpointHit.breakpointId);
        return false; // Pause execution
      }
    }

    // Check step controller
    if (this.stepController.shouldPauseAtNode(nodeId, depth)) {
      await this.pauseAtNode(session, nodeId);
      return false; // Pause execution
    }

    this.logger.log('DEBUG', nodeId, `Executing node: ${nodeName}`, {
      workflowId: session.workflowId,
      workflowName: session.workflowName || 'Workflow',
      executionId: session.executionId,
      nodeId
    });

    return true; // Continue execution
  }

  /**
   * Called after executing a node
   */
  afterNodeExecution(
    sessionId: string,
    nodeId: string,
    nodeOutput: Record<string, unknown>,
    duration: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Update call stack with output
    const currentFrame = session.callStack[session.callStack.length - 1];
    if (currentFrame) {
      currentFrame.variables.nodeOutput = nodeOutput;
    }

    // Evaluate watch expressions
    this.evaluateWatchExpressions(session);

    this.logger.log('DEBUG', nodeId, `Node executed successfully`, {
      workflowId: session.workflowId,
      workflowName: session.workflowName || 'Workflow',
      executionId: session.executionId,
      nodeId
    });

    // Create VariableScope for the event
    const variableScope: VariableScope = {
      nodeInput: (currentFrame?.variables.nodeInput as Record<string, unknown>) || {},
      nodeOutput,
      workflowVariables: (currentFrame?.variables.workflowVariables as Record<string, unknown>) || {},
      environmentVariables: (currentFrame?.variables.environmentVariables as Record<string, string>) || {},
      credentials: (currentFrame?.variables.credentials as Record<string, string>) || {}
    };

    this.emit({
      type: 'step-completed',
      nodeId,
      variables: variableScope
    });
  }

  /**
   * Pause execution at a breakpoint
   */
  private async pauseAtBreakpoint(session: ExtendedDebugSession, breakpointId: string): Promise<void> {
    session.state = 'paused';
    session.status = 'paused';
    session.isPaused = true;
    this.stepController.pause();

    const breakpoint = session.breakpoints.get(breakpointId);
    if (breakpoint) {
      // Get current variables from call stack
      const currentFrame = session.callStack[session.callStack.length - 1];
      const variableScope: VariableScope = currentFrame ? currentFrame.variables : this.createEmptyVariableScope();

      this.emit({
        type: 'breakpoint-hit',
        breakpoint,
        variables: variableScope
      });

      this.logger.log('WARN', 'Debugger', `Breakpoint hit: ${breakpoint.nodeId}`, {
        workflowId: session.workflowId,
        workflowName: session.workflowName || 'Workflow',
        executionId: session.executionId,
        nodeId: breakpoint.nodeId
      });
    }

    // Wait for resume signal
    await this.waitForResume(session);
  }

  /**
   * Pause execution at a node (step mode)
   */
  private async pauseAtNode(session: ExtendedDebugSession, nodeId: string): Promise<void> {
    session.state = 'paused';
    session.status = 'paused';
    session.isPaused = true;

    this.emit({
      type: 'execution-paused',
      nodeId
    });

    this.logger.log('INFO', 'Debugger', `Execution paused at node: ${nodeId}`, {
      workflowId: session.workflowId,
      workflowName: session.workflowName || 'Workflow',
      executionId: session.executionId,
      nodeId
    });

    // Wait for resume signal
    await this.waitForResume(session);
  }

  /**
   * Wait for resume signal
   */
  private async waitForResume(session: ExtendedDebugSession): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!session.isPaused || session.state === 'stopped') {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Resume execution
   */
  resume(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'running';
    session.status = 'running';
    session.isPaused = false;
    this.stepController.continue();

    this.emit({
      type: 'execution-resumed'
    });

    this.logger.log('INFO', 'Debugger', `Execution resumed`, {
      workflowId: session.workflowId,
      workflowName: session.workflowName || 'Workflow',
      executionId: session.executionId
    });
  }

  /**
   * Step over (F10)
   */
  stepOver(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentNodeId) return;

    session.isPaused = false;
    this.stepController.stepOver(session.currentNodeId);

    this.logger.log('DEBUG', 'Debugger', `Step over`, {
      workflowId: session.workflowId,
      executionId: session.executionId,
      nodeId: session.currentNodeId
    });
  }

  /**
   * Step into (F11)
   */
  stepInto(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentNodeId) return;

    session.isPaused = false;
    this.stepController.stepInto(session.currentNodeId);

    this.logger.log('DEBUG', 'Debugger', `Step into`, {
      workflowId: session.workflowId,
      executionId: session.executionId,
      nodeId: session.currentNodeId
    });
  }

  /**
   * Step out (Shift+F11)
   */
  stepOut(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isPaused = false;
    this.stepController.stepOut();

    this.logger.log('DEBUG', 'Debugger', `Step out`, {
      workflowId: session.workflowId,
      executionId: session.executionId
    });
  }

  /**
   * Add watch expression
   */
  addWatchExpression(sessionId: string, expression: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const watch: WatchExpression = {
      id: `watch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      expression,
      value: undefined,
      type: 'undefined',
      lastEvaluated: Date.now()
    };

    session.watchExpressions.push(watch);
    this.evaluateWatchExpression(session, watch);
  }

  /**
   * Remove watch expression
   */
  removeWatchExpression(sessionId: string, watchId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.watchExpressions = session.watchExpressions.filter(w => w.id !== watchId);
  }

  /**
   * Evaluate all watch expressions
   */
  private evaluateWatchExpressions(session: ExtendedDebugSession): void {
    session.watchExpressions.forEach(watch => {
      this.evaluateWatchExpression(session, watch);
    });
  }

  /**
   * Evaluate a single watch expression
   */
  private evaluateWatchExpression(session: ExtendedDebugSession, watch: WatchExpression): void {
    try {
      // Get current frame variables
      const currentFrame = session.callStack[session.callStack.length - 1];
      const variables: VariableScope = currentFrame ? currentFrame.variables : this.createEmptyVariableScope();

      const evalFunc = new Function(
        'variables',
        'input',
        'output',
        `return ${watch.expression}`
      );

      watch.value = evalFunc(
        variables,
        variables.nodeInput,
        variables.nodeOutput
      );
      watch.type = typeof watch.value;
      watch.error = undefined;
      watch.lastEvaluated = Date.now();
    } catch (error) {
      watch.value = undefined;
      watch.type = 'error';
      watch.error = error instanceof Error ? error.message : 'Evaluation failed';
      watch.lastEvaluated = Date.now();
    }
  }

  /**
   * Get active session
   */
  getActiveSession(): ExtendedDebugSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ExtendedDebugSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Create empty variable scope
   */
  private createEmptyVariableScope(): VariableScope {
    return {
      nodeInput: {},
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    };
  }

  /**
   * Add event listener
   */
  on(listener: (event: DebuggerEventType) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: DebuggerEventType): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Get statistics
   */
  getStatistics(): DebuggerStatistics {
    const sessions = Array.from(this.sessions.values());
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.state === 'running' || s.state === 'paused').length,
      completedSessions: sessions.filter(s => s.state === 'completed').length,
      failedSessions: sessions.filter(s => s.state === 'error').length,
      averageDuration: this.calculateAverageDuration(sessions),
      totalBreakpointsHit: this.breakpointManager.getStatistics().totalHits
    };
  }

  /**
   * Calculate average session duration
   */
  private calculateAverageDuration(sessions: ExtendedDebugSession[]): number {
    const completed = sessions.filter(s => s.endTime !== undefined);
    if (completed.length === 0) return 0;

    const total = completed.reduce((sum, s) => {
      const endTime = s.endTime || Date.now();
      const startTime = s.startTime.getTime();
      return sum + (endTime - startTime);
    }, 0);
    return total / completed.length;
  }
}

interface DebuggerStatistics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  averageDuration: number;
  totalBreakpointsHit: number;
}

export default Debugger;

