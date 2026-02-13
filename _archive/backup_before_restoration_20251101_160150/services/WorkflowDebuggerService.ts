/**
 * Workflow Debugger Service
 * Manages debugging sessions, breakpoints, and step-through execution
 */

import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import { SecureExpressionEvaluator } from '../utils/SecureExpressionEvaluator';
import type {
  DebugSession,
  BreakpointConfig,
  DebugFrame,
  DebugLog,
  DebuggerState,
  DebuggerSettings,
  StepResult,
  DebuggerEvent,
  BreakpointHit,
  WorkflowTrace,
  createBreakpoint,
  createDebugSession,
  createDebugLog,
  evaluateBreakpointCondition
} from '../types/debugging';
import type { NodeExecution } from '../types/workflowTypes';

export class WorkflowDebuggerService extends BaseService {
  private state: DebuggerState;
  private eventListeners: Map<string, ((event: DebuggerEvent) => void)[]> = new Map();
  private stepPromises: Map<string, { resolve: (result: StepResult) => void; reject: (error: Error) => void }> = new Map();

  constructor() {
    super('WorkflowDebugger', {
      enableCaching: false, // Debug sessions should not be cached
      enableRetry: false
    });

    this.state = {
      sessions: new Map(),
      globalBreakpoints: new Map(),
      settings: this.getDefaultSettings()
    };
  }

  private getDefaultSettings(): DebuggerSettings {
    return {
      pauseOnError: true,
      pauseOnWarning: false,
      logAllNodes: false,
      maxLogEntries: 1000,
      stepTimeout: 30000, // 30 seconds
      enableConditionalBreakpoints: true,
      enableExpressionEvaluation: true
    };
  }

  /**
   * Start a new debugging session
   */
  public async startDebugSession(
    workflowId: string,
    executionId: string,
    options: {
      breakpoints?: BreakpointConfig[];
      stepMode?: 'step-into' | 'step-over';
      pauseOnStart?: boolean;
    } = {}
  ): Promise<DebugSession> {
    return this.executeOperation('startDebugSession', async () => {
      
      // Set initial step mode
      if (options.stepMode) {
        session.stepMode = options.stepMode;
      }

      // Add breakpoints
      if (options.breakpoints) {
        options.breakpoints.forEach(bp => {
          session.breakpoints.set(bp.id, bp);
        });
      }

      // Pause on start if requested
      if (options.pauseOnStart) {
        session.status = 'paused';
      }

      // Store session
      this.state.sessions.set(session.id, session);
      this.state.activeSessionId = session.id;

      // Log session start
      this.addDebugLog(session.id, 'info', `Debug session started for workflow ${workflowId}`);

      // Emit event
      this.emitEvent({
        type: 'session-started',
        sessionId: session.id,
        data: { workflowId, executionId },
        timestamp: new Date()
      });

      logger.info('Debug session started', {
        sessionId: session.id,
        workflowId,
        executionId
      });

      return session;
    });
  }

  /**
   * Stop a debugging session
   */
  public async stopDebugSession(sessionId: string): Promise<void> {
    return this.executeOperation('stopDebugSession', async () => {
      if (!session) {
        throw new Error('Debug session not found');
      }

      session.status = 'stopped';
      
      // Clean up step promises
      if (stepPromise) {
        stepPromise.reject(new Error('Session stopped'));
        this.stepPromises.delete(sessionId);
      }

      // Add final log
      this.addDebugLog(sessionId, 'info', 'Debug session stopped');

      // Emit event
      this.emitEvent({
        type: 'session-stopped',
        sessionId,
        timestamp: new Date()
      });

      // Clear active session if this was active
      if (this.state.activeSessionId === sessionId) {
        this.state.activeSessionId = undefined;
      }

      logger.info('Debug session stopped', { sessionId });
    });
  }

  /**
   * Pause execution at current node
   */
  public async pauseSession(sessionId: string): Promise<void> {
    return this.executeOperation('pauseSession', async () => {
      if (!session) {
        throw new Error('Debug session not found');
      }

      if (session.status === 'running') {
        session.status = 'paused';
        session.pausedAt = new Date();

        this.addDebugLog(sessionId, 'info', 'Execution paused');

        this.emitEvent({
          type: 'session-paused',
          sessionId,
          timestamp: new Date()
        });

        logger.info('Debug session paused', { sessionId });
      }
    });
  }

  /**
   * Resume execution
   */
  public async resumeSession(sessionId: string): Promise<void> {
    return this.executeOperation('resumeSession', async () => {
      if (!session) {
        throw new Error('Debug session not found');
      }

      if (session.status === 'paused') {
        session.status = 'running';
        session.pausedAt = undefined;
        session.stepMode = 'none';

        this.addDebugLog(sessionId, 'info', 'Execution resumed');

        // Resume any waiting step promises
        if (stepPromise) {
          stepPromise.resolve({ action: 'resumed' });
          this.stepPromises.delete(sessionId);
        }

        this.emitEvent({
          type: 'session-resumed',
          sessionId,
          timestamp: new Date()
        });

        logger.info('Debug session resumed', { sessionId });
      }
    });
  }

  /**
   * Step to next node
   */
  public async stepNext(sessionId: string): Promise<StepResult> {
    return this.executeOperation('stepNext', async () => {
      if (!session) {
        throw new Error('Debug session not found');
      }

      session.stepMode = 'step-over';
      session.status = 'running';

      // Create promise that resolves when step completes
      return new Promise<StepResult>((resolve, reject) => {
          this.stepPromises.delete(sessionId);
          reject(new Error('Step timeout'));
        }, this.state.settings.stepTimeout);

        this.stepPromises.set(sessionId, {
          resolve: (result: StepResult) => {
            clearTimeout(timeout);
            resolve(result);
          },
          reject: (error: Error) => {
            clearTimeout(timeout);
            reject(error);
          }
        });

        this.addDebugLog(sessionId, 'debug', 'Stepping to next node');
      });
    });
  }

  /**
   * Handle node execution during debugging
   */
  public async handleNodeExecution(
    sessionId: string,
    nodeExecution: NodeExecution
  ): Promise<{ shouldPause: boolean; breakpointHit?: BreakpointHit }> {
    return this.executeOperation('handleNodeExecution', async () => {
      if (!session) {
        return { shouldPause: false };
      }

      // Create debug frame
      const frame: DebugFrame = {
        nodeId: nodeExecution.nodeId,
        nodeName: `Node ${nodeExecution.nodeId}`,
        nodeType: 'unknown', // Would be determined from workflow
        input: nodeExecution.input || {},
        output: nodeExecution.output,
        variables: { ...session.variables },
        timestamp: nodeExecution.startTime,
        duration: nodeExecution.duration,
        error: nodeExecution.error
      };

      // Update current node
      session.currentNodeId = nodeExecution.nodeId;

      // Add to call stack
      session.callStack.push(frame);

      // Update variables
      if (nodeExecution.output) {
        session.variables = {
          ...session.variables,
          [`node_${nodeExecution.nodeId}_output`]: nodeExecution.output
        };
      }

      // Log node execution
      if (this.state.settings.logAllNodes) {
        this.addDebugLog(
          sessionId,
          'debug',
          `Executing node ${nodeExecution.nodeId}`,
          {
            nodeId: nodeExecution.nodeId,
            input: nodeExecution.input,
            output: nodeExecution.output
          }
        );
      }

      // Check for breakpoints
      let breakpointHit: BreakpointHit | undefined;

      if (breakpoint && breakpoint.enabled) {

        // Check condition if present
        if (breakpoint.condition && this.state.settings.enableConditionalBreakpoints) {
          try {
            shouldBreak = evaluateBreakpointCondition(
              breakpoint.condition,
              session.variables
            );
          } catch (error) {
            this.addDebugLog(
              sessionId,
              'warn',
              `Breakpoint condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
              { breakpointId: breakpoint.id }
            );
            shouldBreak = false;
          }
        }

        if (shouldBreak) {
          breakpointHit = {
            breakpointId: breakpoint.id,
            nodeId: nodeExecution.nodeId,
            sessionId,
            condition: breakpoint.condition,
            conditionResult: shouldBreak,
            hitCount: (breakpoint.hitCount || 0) + 1,
            variables: { ...session.variables },
            timestamp: new Date()
          };

          // Update hit count
          breakpoint.hitCount = breakpointHit.hitCount;

          // Log breakpoint hit
          this.addDebugLog(
            sessionId,
            'info',
            `Breakpoint hit at node ${nodeExecution.nodeId}`,
            {
              breakpointId: breakpoint.id,
              hitCount: breakpointHit.hitCount
            }
          );

          // Log custom message if present
          if (breakpoint.logMessage) {
            this.addDebugLog(sessionId, 'info', breakpoint.logMessage, {
              breakpointId: breakpoint.id,
              nodeId: nodeExecution.nodeId
            });
          }
        }
      }

      // Determine if should pause

      if (breakpointHit) {
        shouldPause = true;
        session.status = 'paused';
        session.pausedAt = new Date();

        this.emitEvent({
          type: 'breakpoint-hit',
          sessionId,
          data: breakpointHit,
          timestamp: new Date()
        });
      } else if (session.stepMode === 'step-over' || session.stepMode === 'step-into') {
        shouldPause = true;
        session.status = 'paused';
        session.pausedAt = new Date();
        session.stepMode = 'none';

        // Resolve step promise
        if (stepPromise) {
          const result: StepResult = {
            sessionId,
            nodeId: nodeExecution.nodeId,
            action: 'stepped',
            frame,
            variables: session.variables,
            logs: session.logs.slice(-10) // Last 10 logs
          };
          stepPromise.resolve(result);
          this.stepPromises.delete(sessionId);
        }

        this.emitEvent({
          type: 'step-completed',
          sessionId,
          data: { nodeId: nodeExecution.nodeId },
          timestamp: new Date()
        });
      } else if (nodeExecution.error && this.state.settings.pauseOnError) {
        shouldPause = true;
        session.status = 'paused';
        session.pausedAt = new Date();

        this.addDebugLog(
          sessionId,
          'error',
          `Paused on error: ${nodeExecution.error.message}`,
          {
            nodeId: nodeExecution.nodeId,
            error: nodeExecution.error.message
          }
        );

        this.emitEvent({
          type: 'error-occurred',
          sessionId,
          data: { nodeId: nodeExecution.nodeId, error: nodeExecution.error },
          timestamp: new Date()
        });
      }

      return { shouldPause, breakpointHit };
    });
  }

  /**
   * Add or update breakpoint
   */
  public async setBreakpoint(
    workflowId: string,
    nodeId: string,
    options: Partial<BreakpointConfig> = {}
  ): Promise<BreakpointConfig> {
    return this.executeOperation('setBreakpoint', async () => {
      
      // Add to global breakpoints
      this.state.globalBreakpoints.set(breakpoint.id, breakpoint);

      // Add to active session if exists
      if (activeSession && activeSession.workflowId === workflowId) {
        activeSession.breakpoints.set(breakpoint.id, breakpoint);
        this.addDebugLog(
          activeSession.id,
          'info',
          `Breakpoint set at node ${nodeId}`,
          { breakpointId: breakpoint.id }
        );
      }

      logger.info('Breakpoint set', {
        breakpointId: breakpoint.id,
        workflowId,
        nodeId
      });

      return breakpoint;
    });
  }

  /**
   * Remove breakpoint
   */
  public async removeBreakpoint(breakpointId: string): Promise<void> {
    return this.executeOperation('removeBreakpoint', async () => {
      if (!breakpoint) {
        throw new Error('Breakpoint not found');
      }

      // Remove from global breakpoints
      this.state.globalBreakpoints.delete(breakpointId);

      // Remove from all sessions
      this.state.sessions.forEach(session => {
        if (session.breakpoints.has(breakpointId)) {
          session.breakpoints.delete(breakpointId);
          this.addDebugLog(
            session.id,
            'info',
            `Breakpoint removed from node ${breakpoint.nodeId}`,
            { breakpointId }
          );
        }
      });

      logger.info('Breakpoint removed', { breakpointId });
    });
  }

  /**
   * Evaluate expression in debug context
   */
  public async evaluateExpression(
    sessionId: string,
    expression: string
  ): Promise<{ value: unknown; error?: string }> {
    return this.executeOperation('evaluateExpression', async () => {
      if (!session) {
        throw new Error('Debug session not found');
      }

      if (!this.state.settings.enableExpressionEvaluation) {
        return { value: null, error: 'Expression evaluation disabled' };
      }

      try {
          variables: session.variables,
          ...session.variables
        });

        if (!result.success) {
          return { value: null, error: result.error };
        }

        this.addDebugLog(
          sessionId,
          'debug',
          `Expression evaluated: ${expression} = ${String(result.value)}`,
          { expression, result: result.value }
        );

        return { value: result.value };
      } catch (error) {
        return { value: null, error: errorMessage };
      }
    });
  }

  /**
   * Get debug session
   */
  public getSession(sessionId: string): DebugSession | undefined {
    return this.state.sessions.get(sessionId);
  }

  /**
   * Get active session
   */
  public getActiveSession(): DebugSession | undefined {
    return this.state.activeSessionId 
      ? this.state.sessions.get(this.state.activeSessionId)
      : undefined;
  }

  /**
   * Get all sessions
   */
  public getAllSessions(): DebugSession[] {
    return Array.from(this.state.sessions.values());
  }

  /**
   * Get breakpoints for workflow
   */
  public getWorkflowBreakpoints(workflowId: string): BreakpointConfig[] {
    return Array.from(this.state.globalBreakpoints.values())
      .filter(bp => bp.workflowId === workflowId);
  }

  /**
   * Update debugger settings
   */
  public updateSettings(settings: Partial<DebuggerSettings>): void {
    this.state.settings = { ...this.state.settings, ...settings };
    logger.info('Debugger settings updated', { settings });
  }

  /**
   * Get debugger settings
   */
  public getSettings(): DebuggerSettings {
    return { ...this.state.settings };
  }

  /**
   * Add debug log entry
   */
  private addDebugLog(
    sessionId: string,
    level: DebugLog['level'],
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (!session) return;

    session.logs.push(log);

    // Trim logs if exceeded max
    if (session.logs.length > this.state.settings.maxLogEntries) {
      session.logs = session.logs.slice(-this.state.settings.maxLogEntries);
    }
  }

  /**
   * Emit debug event
   */
  private emitEvent(event: DebuggerEvent): void {
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in debug event listener', { error, event });
      }
    });
  }

  /**
   * Add event listener
   */
  public addEventListener(
    type: DebuggerEvent['type'],
    listener: (event: DebuggerEvent) => void
  ): () => void {
    listeners.push(listener);
    this.eventListeners.set(type, listeners);

    // Return unsubscribe function
    return () => {
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  /**
   * Create workflow trace from completed session
   */
  public createWorkflowTrace(sessionId: string): WorkflowTrace | null {
    if (!session || session.status !== 'completed') {
      return null;
    }

      nodeId: frame.nodeId,
      status: frame.error ? 'error' : 'success' as const,
      startTime: frame.timestamp,
      endTime: new Date(frame.timestamp.getTime() + (frame.duration || 0)),
      duration: frame.duration || 0,
      input: frame.input,
      output: frame.output,
      error: frame.error
    }));


    return {
      workflowId: session.workflowId,
      executionId: session.executionId,
      startTime: session.startTime,
      endTime: new Date(),
      totalDuration,
      nodeExecutions,
      debugLogs: [...session.logs],
      performanceMetrics: {
        nodesExecuted: session.callStack.length,
        averageNodeTime: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0,
        slowestNode: session.callStack.reduce((slowest, frame) => 
          (frame.duration || 0) > (slowest.duration || 0) ? { nodeId: frame.nodeId, duration: frame.duration || 0 } : slowest,
          { nodeId: '', duration: 0 }
        ),
        fastestNode: session.callStack.reduce((fastest, frame) => 
          (frame.duration || 0) < (fastest.duration || Infinity) ? { nodeId: frame.nodeId, duration: frame.duration || 0 } : fastest,
          { nodeId: '', duration: Infinity }
        ),
        memoryPeak: 0, // Would need memory monitoring
        errorCount: session.callStack.filter(f => f.error).length
      }
    };
  }

  /**
   * Export debug session data
   */
  public exportSessionData(sessionId: string): string {
    if (!session) {
      throw new Error('Debug session not found');
    }

    
    return JSON.stringify({
      session: {
        id: session.id,
        workflowId: session.workflowId,
        executionId: session.executionId,
        status: session.status,
        startTime: session.startTime,
        pausedAt: session.pausedAt,
        logs: session.logs,
        callStack: session.callStack,
        variables: session.variables
      },
      trace,
      breakpoints: Array.from(session.breakpoints.values())
    }, null, 2);
  }
}

// Export singleton instance
export const workflowDebugger = new WorkflowDebuggerService();