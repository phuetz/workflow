/**
 * Step Controller
 * Manages step-by-step execution control (step over, into, out, continue, pause)
 */

import type {
  StepAction,
  StepControllerState,
  ExecutionState
} from '../types/debugging';

export class StepController {
  private state: StepControllerState = {
    action: null,
    targetNodeId: null,
    shouldPause: false,
    stepDepth: 0
  };

  private executionState: ExecutionState = 'idle';
  private listeners: Set<(event: StepEvent) => void> = new Set();
  private currentNodeId: string | null = null;
  private callStackDepth = 0;

  /**
   * Step Over (F10)
   * Execute current node and pause at the next node at the same level
   */
  stepOver(currentNodeId: string): void {
    this.state = {
      action: 'stepOver',
      targetNodeId: currentNodeId,
      shouldPause: false,
      stepDepth: this.callStackDepth
    };

    this.emit({ type: 'step-over', nodeId: currentNodeId });
  }

  /**
   * Step Into (F11)
   * Step into sub-workflow if the current node contains one
   */
  stepInto(currentNodeId: string): void {
    this.state = {
      action: 'stepInto',
      targetNodeId: currentNodeId,
      shouldPause: false,
      stepDepth: this.callStackDepth
    };

    this.emit({ type: 'step-into', nodeId: currentNodeId });
  }

  /**
   * Step Out (Shift+F11)
   * Execute until we exit the current sub-workflow
   */
  stepOut(): void {
    if (this.callStackDepth === 0) {
      // Already at top level, continue to end
      this.continue();
      return;
    }

    this.state = {
      action: 'stepOut',
      targetNodeId: null,
      shouldPause: false,
      stepDepth: this.callStackDepth - 1
    };

    this.emit({ type: 'step-out', depth: this.callStackDepth });
  }

  /**
   * Continue (F5)
   * Resume execution until next breakpoint or completion
   */
  continue(): void {
    this.state = {
      action: 'continue',
      targetNodeId: null,
      shouldPause: false,
      stepDepth: this.callStackDepth
    };

    this.executionState = 'running';
    this.emit({ type: 'continue' });
  }

  /**
   * Pause (F6)
   * Pause execution at the next opportunity
   */
  pause(): void {
    this.state = {
      action: 'pause',
      targetNodeId: null,
      shouldPause: true,
      stepDepth: this.callStackDepth
    };

    this.executionState = 'paused';
    this.emit({ type: 'pause' });
  }

  /**
   * Stop (Shift+F5)
   * Stop execution completely
   */
  stop(): void {
    this.state = {
      action: 'stop',
      targetNodeId: null,
      shouldPause: true,
      stepDepth: 0
    };

    this.executionState = 'stopped';
    this.callStackDepth = 0;
    this.currentNodeId = null;
    this.emit({ type: 'stop' });
  }

  /**
   * Check if execution should pause at a node
   */
  shouldPauseAtNode(nodeId: string, depth: number): boolean {
    this.currentNodeId = nodeId;
    this.callStackDepth = depth;

    const { action, targetNodeId, shouldPause, stepDepth } = this.state;

    // Always pause if pause was requested
    if (shouldPause) {
      return true;
    }

    // Check action-specific pause conditions
    switch (action) {
      case 'stepOver':
        // Pause at next node at same depth after target node
        if (depth === stepDepth && nodeId !== targetNodeId) {
          this.resetAction();
          return true;
        }
        break;

      case 'stepInto':
        // Pause at next node (any depth)
        if (nodeId !== targetNodeId) {
          this.resetAction();
          return true;
        }
        break;

      case 'stepOut':
        // Pause when we return to parent level
        if (depth <= stepDepth) {
          this.resetAction();
          return true;
        }
        break;

      case 'pause':
        // Pause immediately
        this.resetAction();
        return true;

      case 'continue':
        // Don't pause (will pause on breakpoints)
        return false;

      case 'stop':
        // Stopped, should not continue
        return true;

      default:
        return false;
    }

    return false;
  }

  /**
   * Notify entering a sub-workflow
   */
  enterSubWorkflow(workflowId: string, nodeId: string): void {
    this.callStackDepth++;
    this.emit({
      type: 'enter-subworkflow',
      workflowId,
      nodeId,
      depth: this.callStackDepth
    });
  }

  /**
   * Notify exiting a sub-workflow
   */
  exitSubWorkflow(workflowId: string): void {
    if (this.callStackDepth > 0) {
      this.callStackDepth--;
    }
    this.emit({
      type: 'exit-subworkflow',
      workflowId,
      depth: this.callStackDepth
    });
  }

  /**
   * Reset action after pause
   */
  private resetAction(): void {
    this.state.action = null;
    this.state.targetNodeId = null;
  }

  /**
   * Get current state
   */
  getState(): StepControllerState {
    return { ...this.state };
  }

  /**
   * Get execution state
   */
  getExecutionState(): ExecutionState {
    return this.executionState;
  }

  /**
   * Set execution state
   */
  setExecutionState(state: ExecutionState): void {
    this.executionState = state;
    this.emit({ type: 'state-changed', state });
  }

  /**
   * Get current node ID
   */
  getCurrentNodeId(): string | null {
    return this.currentNodeId;
  }

  /**
   * Get call stack depth
   */
  getCallStackDepth(): number {
    return this.callStackDepth;
  }

  /**
   * Reset controller
   */
  reset(): void {
    this.state = {
      action: null,
      targetNodeId: null,
      shouldPause: false,
      stepDepth: 0
    };
    this.executionState = 'idle';
    this.currentNodeId = null;
    this.callStackDepth = 0;
    this.emit({ type: 'reset' });
  }

  /**
   * Check if currently stepping
   */
  isStepping(): boolean {
    return this.state.action !== null && this.state.action !== 'continue';
  }

  /**
   * Check if execution is paused
   */
  isPaused(): boolean {
    return this.executionState === 'paused';
  }

  /**
   * Check if execution is running
   */
  isRunning(): boolean {
    return this.executionState === 'running';
  }

  /**
   * Check if execution is stopped
   */
  isStopped(): boolean {
    return this.executionState === 'stopped';
  }

  /**
   * Add event listener
   */
  on(listener: (event: StepEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: StepEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Get keyboard shortcut for action
   */
  static getShortcut(action: StepAction): string {
    const shortcuts: Record<StepAction, string> = {
      stepOver: 'F10',
      stepInto: 'F11',
      stepOut: 'Shift+F11',
      continue: 'F5',
      pause: 'F6',
      stop: 'Shift+F5'
    };
    return shortcuts[action] || '';
  }

  /**
   * Get action description
   */
  static getDescription(action: StepAction): string {
    const descriptions: Record<StepAction, string> = {
      stepOver: 'Execute current node and stop at next',
      stepInto: 'Step into sub-workflow',
      stepOut: 'Exit current sub-workflow',
      continue: 'Run until next breakpoint',
      pause: 'Pause execution',
      stop: 'Stop debugging'
    };
    return descriptions[action] || '';
  }
}

// Event types
type StepEvent =
  | { type: 'step-over'; nodeId: string }
  | { type: 'step-into'; nodeId: string }
  | { type: 'step-out'; depth: number }
  | { type: 'continue' }
  | { type: 'pause' }
  | { type: 'stop' }
  | { type: 'enter-subworkflow'; workflowId: string; nodeId: string; depth: number }
  | { type: 'exit-subworkflow'; workflowId: string; depth: number }
  | { type: 'state-changed'; state: ExecutionState }
  | { type: 'reset' };

// Singleton instance
export const stepController = new StepController();
