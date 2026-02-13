/**
 * Debug Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DebugManager } from '../execution/DebugManager';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

describe('DebugManager', () => {
  let manager: DebugManager;
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];

  beforeEach(() => {
    manager = new DebugManager();

    nodes = [
      {
        id: 'node-1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          id: 'node-1',
          type: 'trigger',
          label: 'Node 1',
          position: { x: 0, y: 0 },
          icon: 'play',
          color: '#3b82f6',
          inputs: 0,
          outputs: 1
        }
      },
      {
        id: 'node-2',
        type: 'action',
        position: { x: 200, y: 0 },
        data: {
          id: 'node-2',
          type: 'action',
          label: 'Node 2',
          position: { x: 200, y: 0 },
          icon: 'zap',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      }
    ];

    edges = [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2'
      }
    ];
  });

  describe('createSession', () => {
    it('should create a debug session', () => {
      const session = manager.createSession(nodes, edges);

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^debug_/);
      expect(session.status).toBe('idle');
      expect(session.currentNode).toBeNull();
      expect(session.breakpoints.size).toBe(0);
    });
  });

  describe('getSession', () => {
    it('should get existing session', () => {
      const created = manager.createSession(nodes, edges);
      const retrieved = manager.getSession(created.id);

      expect(retrieved).toBe(created);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = manager.getSession('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('deleteSession', () => {
    it('should delete session', () => {
      const session = manager.createSession(nodes, edges);
      const deleted = manager.deleteSession(session.id);

      expect(deleted).toBe(true);
      expect(manager.getSession(session.id)).toBeUndefined();
    });

    it('should return false for non-existent session', () => {
      const deleted = manager.deleteSession('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('breakpoints', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = manager.createSession(nodes, edges);
      sessionId = session.id;
    });

    it('should add breakpoint', () => {
      const breakpoint = manager.addBreakpoint(sessionId, 'node-1');

      expect(breakpoint.nodeId).toBe('node-1');
      expect(breakpoint.enabled).toBe(true);
      expect(breakpoint.hitCount).toBe(0);
    });

    it('should add breakpoint with condition', () => {
      const condition = 'value > 10';
      const breakpoint = manager.addBreakpoint(sessionId, 'node-1', condition);

      expect(breakpoint.condition).toBe(condition);
    });

    it('should remove breakpoint', () => {
      manager.addBreakpoint(sessionId, 'node-1');
      const removed = manager.removeBreakpoint(sessionId, 'node-1');

      expect(removed).toBe(true);

      const session = manager.getSession(sessionId);
      expect(session?.breakpoints.has('node-1')).toBe(false);
    });

    it('should toggle breakpoint', () => {
      manager.addBreakpoint(sessionId, 'node-1');

      const disabled = manager.toggleBreakpoint(sessionId, 'node-1');
      expect(disabled).toBe(false);

      const enabled = manager.toggleBreakpoint(sessionId, 'node-1');
      expect(enabled).toBe(true);
    });

    it('should check if should pause at breakpoint', () => {
      manager.addBreakpoint(sessionId, 'node-1');

      const shouldPause = manager.shouldPauseAtNode(sessionId, 'node-1');

      expect(shouldPause).toBe(true);
    });

    it('should not pause at disabled breakpoint', () => {
      manager.addBreakpoint(sessionId, 'node-1');
      manager.toggleBreakpoint(sessionId, 'node-1'); // Disable

      const shouldPause = manager.shouldPauseAtNode(sessionId, 'node-1');

      expect(shouldPause).toBe(false);
    });

    it('should evaluate breakpoint condition', () => {
      manager.addBreakpoint(sessionId, 'node-1', 'value > 10');

      const shouldPause1 = manager.shouldPauseAtNode(sessionId, 'node-1', { value: 15 });
      expect(shouldPause1).toBe(true);

      const shouldPause2 = manager.shouldPauseAtNode(sessionId, 'node-1', { value: 5 });
      expect(shouldPause2).toBe(false);
    });

    it('should clear all breakpoints', () => {
      manager.addBreakpoint(sessionId, 'node-1');
      manager.addBreakpoint(sessionId, 'node-2');

      manager.clearAllBreakpoints(sessionId);

      const session = manager.getSession(sessionId);
      expect(session?.breakpoints.size).toBe(0);
    });
  });

  describe('execution control', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = manager.createSession(nodes, edges);
      sessionId = session.id;
    });

    it('should pause execution', () => {
      manager.pause(sessionId, 'node-1', { data: 'test' });

      const session = manager.getSession(sessionId);
      expect(session?.status).toBe('paused');
      expect(session?.currentNode).toBe('node-1');
    });

    it('should continue execution', () => {
      manager.pause(sessionId, 'node-1');
      manager.continue(sessionId);

      const session = manager.getSession(sessionId);
      expect(session?.status).toBe('running');
      expect(session?.stepMode).toBeNull();
    });

    it('should step over', () => {
      manager.pause(sessionId, 'node-1');
      manager.stepOver(sessionId);

      const session = manager.getSession(sessionId);
      expect(session?.status).toBe('running');
      expect(session?.stepMode).toBe('over');
    });

    it('should step into', () => {
      manager.pause(sessionId, 'node-1');
      manager.stepInto(sessionId);

      const session = manager.getSession(sessionId);
      expect(session?.status).toBe('running');
      expect(session?.stepMode).toBe('into');
    });

    it('should step out', () => {
      manager.pause(sessionId, 'node-1');
      manager.stepOut(sessionId);

      const session = manager.getSession(sessionId);
      expect(session?.status).toBe('running');
      expect(session?.stepMode).toBe('out');
    });

    it('should stop debugging', () => {
      manager.pause(sessionId, 'node-1');
      manager.stop(sessionId);

      const session = manager.getSession(sessionId);
      expect(session?.status).toBe('stopped');
      expect(session?.currentNode).toBeNull();
    });
  });

  describe('variables', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = manager.createSession(nodes, edges);
      sessionId = session.id;
    });

    it('should set variable', () => {
      manager.setVariable(sessionId, 'node-1', 'testKey', 'testValue');

      const variables = manager.getVariables(sessionId, 'node-1') as Record<string, unknown>;
      expect(variables.testKey).toBe('testValue');
    });

    it('should get all variables', () => {
      manager.setVariable(sessionId, 'node-1', 'key1', 'value1');
      manager.setVariable(sessionId, 'node-2', 'key2', 'value2');

      const allVariables = manager.getVariables(sessionId);
      expect(allVariables).toBeInstanceOf(Map);
      expect((allVariables as Map<string, unknown>).size).toBe(2);
    });
  });

  describe('execution stack', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = manager.createSession(nodes, edges);
      sessionId = session.id;
    });

    it('should push to stack', () => {
      manager.pushToStack(sessionId, 'node-1');
      manager.pushToStack(sessionId, 'node-2');

      const stack = manager.getExecutionStack(sessionId);
      expect(stack).toEqual(['node-1', 'node-2']);
    });

    it('should pop from stack', () => {
      manager.pushToStack(sessionId, 'node-1');
      manager.pushToStack(sessionId, 'node-2');

      const popped = manager.popFromStack(sessionId);
      expect(popped).toBe('node-2');

      const stack = manager.getExecutionStack(sessionId);
      expect(stack).toEqual(['node-1']);
    });
  });

  describe('events', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = manager.createSession(nodes, edges);
      sessionId = session.id;
    });

    it('should register event callback', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onEvent(callback);

      manager.pause(sessionId, 'node-1');

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should unsubscribe from events', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onEvent(callback);

      unsubscribe();

      manager.pause(sessionId, 'node-1');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = manager.createSession(nodes, edges);
      sessionId = session.id;
    });

    it('should return debug statistics', () => {
      manager.addBreakpoint(sessionId, 'node-1');
      manager.addBreakpoint(sessionId, 'node-2');
      manager.setVariable(sessionId, 'node-1', 'key', 'value');
      manager.pushToStack(sessionId, 'node-1');

      const stats = manager.getStats(sessionId);

      expect(stats.totalBreakpoints).toBe(2);
      expect(stats.enabledBreakpoints).toBe(2);
      expect(stats.variableCount).toBe(1);
      expect(stats.stackDepth).toBe(1);
      expect(stats.elapsedTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exportSession', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = manager.createSession(nodes, edges);
      sessionId = session.id;
    });

    it('should export session state', () => {
      manager.addBreakpoint(sessionId, 'node-1');
      manager.pause(sessionId, 'node-1');

      const exported = manager.exportSession(sessionId);

      expect(exported).toBeDefined();
      expect(exported?.id).toBe(sessionId);
      expect(exported?.status).toBe('paused');
      expect(exported?.currentNode).toBe('node-1');
    });

    it('should return null for non-existent session', () => {
      const exported = manager.exportSession('non-existent');

      expect(exported).toBeNull();
    });
  });
});
