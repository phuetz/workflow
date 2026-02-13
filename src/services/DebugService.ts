/**
 * Debug Service
 * Manages workflow debugging sessions with breakpoints, step execution, and state inspection
 */

import { eventNotificationService } from './EventNotificationService';
import { notificationService } from './NotificationService';
import { logger } from './SimpleLogger';

export interface DebugSession {
  id: string;
  workflowId: string;
  startTime: Date;
  status: 'idle' | 'running' | 'paused' | 'stepping' | 'stopped';
  currentNodeId: string | null;
  executionPath: string[];
  breakpoints: Set<string>;
  watchedVariables: Map<string, unknown>;
  callStack: CallStackFrame[];
  logs: DebugLog[];
}

export interface CallStackFrame {
  nodeId: string;
  nodeName: string;
  depth: number;
  timestamp: Date;
  variables: Record<string, unknown>;
}

export interface DebugLog {
  id: string;
  timestamp: Date;
  nodeId: string | null;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
}

export interface DebugState {
  status: 'idle' | 'running' | 'paused' | 'stepping' | 'stopped';
  currentNode: string | null;
  executionStack: string[];
  variables: Record<string, unknown>;
  logs: DebugLog[];
}

export class DebugService {
  private currentSession: DebugSession | null = null;
  private breakpoints: Set<string> = new Set();
  private watchedVariables: Map<string, () => any> = new Map();
  private stepMode: boolean = false;
  private listeners: Set<(session: DebugSession | null) => void> = new Set();

  constructor() {
    this.initializeDebugger();
  }

  private initializeDebugger(): void {
    // Load saved breakpoints from localStorage
    const savedBreakpoints = localStorage.getItem('debug_breakpoints');
    if (savedBreakpoints) {
      try {
        const breakpointArray = JSON.parse(savedBreakpoints);
        this.breakpoints = new Set(breakpointArray);
      } catch (error) {
        logger.error('Failed to load breakpoints:', error);
      }
    }
  }

  // Start a new debug session
  startDebugSession(workflowId: string): DebugSession {
    if (this.currentSession && this.currentSession.status !== 'stopped') {
      this.stopDebugSession();
    }

    this.currentSession = {
      id: `debug_${Date.now()}`,
      workflowId,
      startTime: new Date(),
      status: 'idle',
      currentNodeId: null,
      executionPath: [],
      breakpoints: new Set(this.breakpoints),
      watchedVariables: new Map(),
      callStack: [],
      logs: []
    };

    this.log('info', 'Debug session started', null);
    this.notifyListeners();

    eventNotificationService.emitEvent('debug_session_started', {
      sessionId: this.currentSession.id,
      workflowId
    }, 'debug_service');

    return this.currentSession;
  }

  // Stop the current debug session
  stopDebugSession(): void {
    if (!this.currentSession) return;

    const sessionId = this.currentSession.id;
    this.currentSession.status = 'stopped';
    this.log('info', 'Debug session stopped', null);

    eventNotificationService.emitEvent('debug_session_stopped', {
      sessionId,
      duration: Date.now() - this.currentSession.startTime.getTime()
    }, 'debug_service');

    this.currentSession = null;
    this.notifyListeners();
  }

  // Reset the debug session - clears everything and starts fresh
  resetDebugSession(): void {
    if (!this.currentSession) {
      notificationService.show('warning', 'No Debug Session', 'No active debug session to reset');
      return;
    }

    const workflowId = this.currentSession.workflowId;

    // Clear all session data
    this.clearCallStack();
    this.clearLogs();
    this.clearWatchedVariables();

    // Stop current session
    this.stopDebugSession();

    // Start a fresh session
    this.startDebugSession(workflowId);

    notificationService.show('success', 'Debug Reset', 'Debug session has been reset');

    eventNotificationService.emitEvent('debug_session_reset', {
      workflowId
    }, 'debug_service');
  }

  // Pause execution
  pauseExecution(): void {
    if (!this.currentSession || this.currentSession.status !== 'running') return;

    this.currentSession.status = 'paused';
    this.log('info', 'Execution paused', this.currentSession.currentNodeId);
    this.notifyListeners();
  }

  // Resume execution
  resumeExecution(): void {
    if (!this.currentSession || this.currentSession.status !== 'paused') return;

    this.currentSession.status = 'running';
    this.stepMode = false;
    this.log('info', 'Execution resumed', this.currentSession.currentNodeId);
    this.notifyListeners();
  }

  // Step to next node
  stepNext(): void {
    if (!this.currentSession || 
        (this.currentSession.status !== 'paused' && this.currentSession.status !== 'idle')) return;

    this.currentSession.status = 'stepping';
    this.stepMode = true;
    this.log('info', 'Stepping to next node', this.currentSession.currentNodeId);
    this.notifyListeners();
  }

  // Execute a node (called by execution engine)
  async executeNode(nodeId: string, nodeName: string, variables: Record<string, unknown>): Promise<boolean> {
    if (!this.currentSession) return true;

    this.currentSession.currentNodeId = nodeId;
    this.currentSession.executionPath.push(nodeId);

    // Add to call stack
    this.currentSession.callStack.push({
      nodeId,
      nodeName,
      depth: this.currentSession.callStack.length,
      timestamp: new Date(),
      variables: { ...variables }
    });

    // Update watched variables
    this.updateWatchedVariables(variables);

    // Check if we hit a breakpoint or are in step mode
    if (this.breakpoints.has(nodeId) || this.stepMode) {
      this.currentSession.status = 'paused';
      this.stepMode = false;
      
      this.log('info', `Breakpoint hit at node: ${nodeName}`, nodeId);
      notificationService.show('info', 'Breakpoint Hit', `Paused at node: ${nodeName}`);
      
      this.notifyListeners();

      // Wait for resume or step
      return await this.waitForResume();
    }

    return true;
  }

  // Wait for user to resume or step
  private async waitForResume(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkStatus = setInterval(() => {
        if (!this.currentSession ||
            this.currentSession.status === 'running' ||
            this.currentSession.status === 'stepping' ||
            this.currentSession.status === 'stopped') {
          clearInterval(checkStatus);
          resolve(this.currentSession?.status !== 'stopped');
        }
      }, 100);
    });
  }

  // Node execution completed
  completeNode(nodeId: string): void {
    if (!this.currentSession) return;

    // Remove from call stack
    const index = this.currentSession.callStack.findIndex(frame => frame.nodeId === nodeId);
    if (index !== -1) {
      this.currentSession.callStack.splice(index, 1);
    }

    this.log('debug', `Node completed: ${nodeId}`, nodeId);
  }

  // Breakpoint management
  toggleBreakpoint(nodeId: string): void {
    if (this.breakpoints.has(nodeId)) {
      this.breakpoints.delete(nodeId);
    } else {
      this.breakpoints.add(nodeId);
    }

    // Save to localStorage
    localStorage.setItem('debug_breakpoints', JSON.stringify(Array.from(this.breakpoints)));

    // Update current session if active
    if (this.currentSession) {
      this.currentSession.breakpoints = new Set(this.breakpoints);
    }

    this.notifyListeners();
  }

  clearAllBreakpoints(): void {
    this.breakpoints.clear();
    localStorage.removeItem('debug_breakpoints');

    if (this.currentSession) {
      this.currentSession.breakpoints.clear();
    }

    this.notifyListeners();
  }

  // Variable watching
  addWatchVariable(name: string, getter?: () => any): void {
    this.watchedVariables.set(name, getter || (() => null));
    
    if (this.currentSession) {
      this.updateWatchedVariables({});
    }

    this.notifyListeners();
  }

  removeWatchVariable(name: string): void {
    this.watchedVariables.delete(name);
    
    if (this.currentSession) {
      this.currentSession.watchedVariables.delete(name);
    }

    this.notifyListeners();
  }

  private updateWatchedVariables(currentVariables: Record<string, unknown>): void {
    if (!this.currentSession) return;

    this.watchedVariables.forEach((getter, name) => {
      try {
        // First check if variable exists in current scope
        if (name in currentVariables) {
          this.currentSession!.watchedVariables.set(name, currentVariables[name]);
        } else {
          // Otherwise use the getter function
          const value = getter();
          this.currentSession!.watchedVariables.set(name, value);
        }
      } catch (error) {
        this.currentSession!.watchedVariables.set(name, `<Error: ${error}>`);
      }
    });
  }

  // Logging
  log(level: DebugLog['level'], message: string, nodeId: string | null, data?: unknown): void {
    if (!this.currentSession) return;

    const log: DebugLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      nodeId,
      level,
      message,
      data
    };

    this.currentSession.logs.push(log);

    // Keep only last 1000 logs
    if (this.currentSession.logs.length > 1000) {
      this.currentSession.logs = this.currentSession.logs.slice(-1000);
    }

    this.notifyListeners();
  }

  clearLogs(): void {
    if (!this.currentSession) return;
    this.currentSession.logs = [];
    this.notifyListeners();
  }

  // Call stack management
  getCallStack(): CallStackFrame[] {
    return this.currentSession?.callStack || [];
  }

  clearCallStack(): void {
    if (!this.currentSession) return;
    this.currentSession.callStack = [];
    this.notifyListeners();
  }

  // Watched variables
  clearWatchedVariables(): void {
    if (!this.currentSession) return;
    this.currentSession.watchedVariables.clear();
    this.notifyListeners();
  }

  // State getters
  getCurrentSession(): DebugSession | null {
    return this.currentSession;
  }

  getDebugState(): DebugState {
    if (!this.currentSession) {
      return {
        status: 'idle',
        currentNode: null,
        executionStack: [],
        variables: {},
        logs: []
      };
    }

    const variables: Record<string, unknown> = {};
    this.currentSession.watchedVariables.forEach((value, key) => {
      variables[key] = value;
    });

    return {
      status: this.currentSession.status,
      currentNode: this.currentSession.currentNodeId,
      executionStack: this.currentSession.executionPath,
      variables,
      logs: this.currentSession.logs
    };
  }

  getBreakpoints(): string[] {
    return Array.from(this.breakpoints);
  }

  hasBreakpoint(nodeId: string): boolean {
    return this.breakpoints.has(nodeId);
  }

  // Event subscription
  subscribe(listener: (session: DebugSession | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentSession);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentSession);
      } catch (error) {
        logger.error('Error in debug listener:', error);
      }
    });
  }

  // Export debug data
  exportDebugData(): object {
    if (!this.currentSession) {
      return { error: 'No active debug session' };
    }

    return {
      session: {
        id: this.currentSession.id,
        workflowId: this.currentSession.workflowId,
        startTime: this.currentSession.startTime,
        status: this.currentSession.status,
        executionPath: this.currentSession.executionPath
      },
      breakpoints: Array.from(this.currentSession.breakpoints),
      watchedVariables: Object.fromEntries(this.currentSession.watchedVariables),
      callStack: this.currentSession.callStack,
      logs: this.currentSession.logs
    };
  }
}

// Singleton instance
export const debugService = new DebugService();