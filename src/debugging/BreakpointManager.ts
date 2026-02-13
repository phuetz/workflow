/**
 * Breakpoint Manager
 * Manages breakpoints with support for conditional, hit count, and log points
 */

import type {
  BreakpointConfig,
  BreakpointType,
  VariableScope,
  BreakpointHit
} from '../types/debugging';
import { evaluateBreakpointCondition } from '../types/debugging';

export class BreakpointManager {
  private breakpoints: Map<string, BreakpointConfig> = new Map();
  private hitCounts: Map<string, number> = new Map();
  private listeners: Set<(event: BreakpointEvent) => void> = new Set();

  /**
   * Add a breakpoint
   */
  addBreakpoint(
    nodeId: string,
    workflowId: string,
    type: BreakpointType = 'standard',
    options: Partial<BreakpointConfig> = {}
  ): BreakpointConfig {
    const id = `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const breakpoint: BreakpointConfig = {
      id,
      nodeId,
      workflowId,
      enabled: true,
      createdAt: new Date(),
      createdBy: 'user',
      ...options
    };

    this.breakpoints.set(id, breakpoint);
    this.hitCounts.set(id, 0);
    this.emit({ type: 'added', breakpoint });

    return breakpoint;
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(breakpointId: string): boolean {
    const breakpoint = this.breakpoints.get(breakpointId);
    if (!breakpoint) return false;

    this.breakpoints.delete(breakpointId);
    this.hitCounts.delete(breakpointId);
    this.emit({ type: 'removed', breakpoint });

    return true;
  }

  /**
   * Toggle breakpoint enabled state
   */
  toggleBreakpoint(breakpointId: string): boolean {
    const breakpoint = this.breakpoints.get(breakpointId);
    if (!breakpoint) return false;

    breakpoint.enabled = !breakpoint.enabled;
    this.emit({ type: 'toggled', breakpoint });

    return breakpoint.enabled;
  }

  /**
   * Update breakpoint configuration
   */
  updateBreakpoint(
    breakpointId: string,
    updates: Partial<BreakpointConfig>
  ): BreakpointConfig | null {
    const breakpoint = this.breakpoints.get(breakpointId);
    if (!breakpoint) return null;

    Object.assign(breakpoint, updates);
    this.emit({ type: 'updated', breakpoint });

    return breakpoint;
  }

  /**
   * Get all breakpoints for a workflow
   */
  getBreakpointsForWorkflow(workflowId: string): BreakpointConfig[] {
    return Array.from(this.breakpoints.values()).filter(
      bp => bp.workflowId === workflowId
    );
  }

  /**
   * Get all breakpoints for a node
   */
  getBreakpointsForNode(nodeId: string): BreakpointConfig[] {
    return Array.from(this.breakpoints.values()).filter(
      bp => bp.nodeId === nodeId
    );
  }

  /**
   * Get a specific breakpoint
   */
  getBreakpoint(breakpointId: string): BreakpointConfig | null {
    return this.breakpoints.get(breakpointId) || null;
  }

  /**
   * Check if a node should break (called during execution)
   */
  shouldBreak(
    nodeId: string,
    workflowId: string,
    variables: VariableScope
  ): BreakpointHit | null {
    const nodeBreakpoints = Array.from(this.breakpoints.values()).filter(
      bp => bp.nodeId === nodeId && bp.workflowId === workflowId && bp.enabled
    );

    for (const breakpoint of nodeBreakpoints) {
      const hitCount = (this.hitCounts.get(breakpoint.id) || 0) + 1;
      this.hitCounts.set(breakpoint.id, hitCount);

      // Check breakpoint type
      if (breakpoint.condition) {
        // Conditional breakpoint
        const conditionResult = evaluateBreakpointCondition(
          breakpoint.condition,
          variables as unknown as Record<string, unknown>
        );

        if (!conditionResult) {
          continue; // Condition not met, skip this breakpoint
        }

        return {
          breakpointId: breakpoint.id,
          nodeId,
          sessionId: workflowId,
          condition: breakpoint.condition,
          conditionResult,
          hitCount,
          variables: variables as unknown as Record<string, unknown>,
          timestamp: new Date()
        };
      }

      if (breakpoint.hitCount !== undefined) {
        // Hit count breakpoint
        if (hitCount < breakpoint.hitCount) {
          continue; // Not reached hit count yet
        }

        return {
          breakpointId: breakpoint.id,
          nodeId,
          sessionId: workflowId,
          hitCount,
          variables: variables as unknown as Record<string, unknown>,
          timestamp: new Date()
        };
      }

      if (breakpoint.logMessage) {
        // Log point - don't break, just log
        this.emit({
          type: 'logpoint-hit',
          breakpoint,
          message: this.interpolateLogMessage(breakpoint.logMessage, variables)
        });
        continue; // Don't break on log points
      }

      // Standard breakpoint
      return {
        breakpointId: breakpoint.id,
        nodeId,
        sessionId: workflowId,
        hitCount,
        variables: variables as unknown as Record<string, unknown>,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Clear all breakpoints
   */
  clearAll(): void {
    this.breakpoints.clear();
    this.hitCounts.clear();
    this.emit({ type: 'cleared' });
  }

  /**
   * Clear all breakpoints for a workflow
   */
  clearForWorkflow(workflowId: string): void {
    const toRemove = Array.from(this.breakpoints.values())
      .filter(bp => bp.workflowId === workflowId)
      .map(bp => bp.id);

    toRemove.forEach(id => this.removeBreakpoint(id));
  }

  /**
   * Reset hit counts
   */
  resetHitCounts(): void {
    this.hitCounts.clear();
  }

  /**
   * Get hit count for a breakpoint
   */
  getHitCount(breakpointId: string): number {
    return this.hitCounts.get(breakpointId) || 0;
  }

  /**
   * Export breakpoints configuration
   */
  exportBreakpoints(): BreakpointConfig[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * Import breakpoints configuration
   */
  importBreakpoints(breakpoints: BreakpointConfig[]): void {
    breakpoints.forEach(bp => {
      this.breakpoints.set(bp.id, bp);
      this.hitCounts.set(bp.id, 0);
    });
    this.emit({ type: 'imported', count: breakpoints.length });
  }

  /**
   * Interpolate log message with variables
   */
  private interpolateLogMessage(message: string, variables: VariableScope): string {
    return message.replace(/\{([^}]+)\}/g, (match, expr) => {
      try {
        // Simple variable interpolation: {input.name}, {output.status}, etc.
        const parts = expr.trim().split('.');
        let value: unknown = variables;

        for (const part of parts) {
          value = (value as Record<string, unknown>)?.[part];
          if (value === undefined) break;
        }

        return value !== undefined ? String(value) : match;
      } catch {
        return match;
      }
    });
  }

  /**
   * Add event listener
   */
  on(listener: (event: BreakpointEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: BreakpointEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Get statistics
   */
  getStatistics(): BreakpointStatistics {
    const breakpoints = Array.from(this.breakpoints.values());
    return {
      total: breakpoints.length,
      enabled: breakpoints.filter(bp => bp.enabled).length,
      disabled: breakpoints.filter(bp => !bp.enabled).length,
      byType: {
        standard: breakpoints.filter(bp => !bp.condition && !bp.hitCount && !bp.logMessage).length,
        conditional: breakpoints.filter(bp => bp.condition).length,
        hitCount: breakpoints.filter(bp => bp.hitCount !== undefined).length,
        logPoint: breakpoints.filter(bp => bp.logMessage).length
      },
      totalHits: Array.from(this.hitCounts.values()).reduce((sum, count) => sum + count, 0)
    };
  }
}

// Event types
type BreakpointEvent =
  | { type: 'added'; breakpoint: BreakpointConfig }
  | { type: 'removed'; breakpoint: BreakpointConfig }
  | { type: 'toggled'; breakpoint: BreakpointConfig }
  | { type: 'updated'; breakpoint: BreakpointConfig }
  | { type: 'cleared' }
  | { type: 'imported'; count: number }
  | { type: 'logpoint-hit'; breakpoint: BreakpointConfig; message: string };

interface BreakpointStatistics {
  total: number;
  enabled: number;
  disabled: number;
  byType: {
    standard: number;
    conditional: number;
    hitCount: number;
    logPoint: number;
  };
  totalHits: number;
}

// Singleton instance
export const breakpointManager = new BreakpointManager();
