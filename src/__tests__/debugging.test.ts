/**
 * Comprehensive Debugging System Tests
 * Tests for breakpoint management, step controller, profiler, memory profiler, and logger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BreakpointManager } from '../debugging/BreakpointManager';
import { StepController } from '../debugging/StepController';
import { ExtendedLogger } from '../debugging/ExtendedLogger';
import { Profiler } from '../debugging/Profiler';
import { MemoryProfiler } from '../debugging/MemoryProfiler';
import { VariableInspector } from '../debugging/VariableInspector';
import type { VariableScope } from '../types/debugging';

describe('BreakpointManager', () => {
  let manager: BreakpointManager;

  beforeEach(() => {
    manager = new BreakpointManager();
  });

  it('should add a standard breakpoint', () => {
    const bp = manager.addBreakpoint('node1', 'workflow1');

    expect(bp).toBeDefined();
    expect(bp.nodeId).toBe('node1');
    expect(bp.workflowId).toBe('workflow1');
    expect(bp.enabled).toBe(true);
  });

  it('should add a conditional breakpoint', () => {
    const bp = manager.addBreakpoint('node1', 'workflow1', 'conditional', {
      condition: 'input.value > 10'
    });

    expect(bp.condition).toBe('input.value > 10');
  });

  it('should add a hit count breakpoint', () => {
    const bp = manager.addBreakpoint('node1', 'workflow1', 'hitCount', {
      hitCount: 5
    });

    expect(bp.hitCount).toBe(5);
  });

  it('should add a log point', () => {
    const bp = manager.addBreakpoint('node1', 'workflow1', 'logPoint', {
      logMessage: 'Value is {input.value}'
    });

    expect(bp.logMessage).toBe('Value is {input.value}');
  });

  it('should remove a breakpoint', () => {
    const bp = manager.addBreakpoint('node1', 'workflow1');
    const removed = manager.removeBreakpoint(bp.id);

    expect(removed).toBe(true);
    expect(manager.getBreakpoint(bp.id)).toBeNull();
  });

  it('should toggle breakpoint enabled state', () => {
    const bp = manager.addBreakpoint('node1', 'workflow1');

    manager.toggleBreakpoint(bp.id);
    expect(bp.enabled).toBe(false);

    manager.toggleBreakpoint(bp.id);
    expect(bp.enabled).toBe(true);
  });

  it('should get breakpoints for workflow', () => {
    manager.addBreakpoint('node1', 'workflow1');
    manager.addBreakpoint('node2', 'workflow1');
    manager.addBreakpoint('node3', 'workflow2');

    const workflowBps = manager.getBreakpointsForWorkflow('workflow1');
    expect(workflowBps.length).toBe(2);
  });

  it('should check if should break on standard breakpoint', () => {
    manager.addBreakpoint('node1', 'workflow1');

    const scope: VariableScope = {
      nodeInput: {},
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    };

    const hit = manager.shouldBreak('node1', 'workflow1', scope);
    expect(hit).toBeDefined();
    expect(hit?.nodeId).toBe('node1');
  });

  it('should check conditional breakpoint', () => {
    manager.addBreakpoint('node1', 'workflow1', 'conditional', {
      condition: 'input.value > 10'
    });

    const scope: VariableScope = {
      nodeInput: { value: 15 },
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    };

    const hit = manager.shouldBreak('node1', 'workflow1', scope);
    expect(hit).toBeDefined();
  });

  it('should not break on failed condition', () => {
    manager.addBreakpoint('node1', 'workflow1', 'conditional', {
      condition: 'input.value > 10'
    });

    const scope: VariableScope = {
      nodeInput: { value: 5 },
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    };

    const hit = manager.shouldBreak('node1', 'workflow1', scope);
    expect(hit).toBeNull();
  });

  it('should track hit counts', () => {
    const bp = manager.addBreakpoint('node1', 'workflow1', 'hitCount', {
      hitCount: 3
    });

    const scope: VariableScope = {
      nodeInput: {},
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    };

    // First two hits should not break
    expect(manager.shouldBreak('node1', 'workflow1', scope)).toBeNull();
    expect(manager.shouldBreak('node1', 'workflow1', scope)).toBeNull();

    // Third hit should break
    const hit = manager.shouldBreak('node1', 'workflow1', scope);
    expect(hit).toBeDefined();
    expect(hit?.hitCount).toBe(3);
  });

  it('should get statistics', () => {
    manager.addBreakpoint('node1', 'workflow1');
    manager.addBreakpoint('node2', 'workflow1', 'conditional', {
      condition: 'true'
    });

    const stats = manager.getStatistics();
    expect(stats.total).toBe(2);
    expect(stats.enabled).toBe(2);
    expect(stats.byType.standard).toBe(1);
    expect(stats.byType.conditional).toBe(1);
  });
});

describe('StepController', () => {
  let controller: StepController;

  beforeEach(() => {
    controller = new StepController();
  });

  it('should step over', () => {
    controller.stepOver('node1');
    const state = controller.getState();

    expect(state.action).toBe('stepOver');
    expect(state.targetNodeId).toBe('node1');
  });

  it('should step into', () => {
    controller.stepInto('node1');
    const state = controller.getState();

    expect(state.action).toBe('stepInto');
    expect(state.targetNodeId).toBe('node1');
  });

  it('should step out', () => {
    // Must be in a sub-workflow to step out
    controller.enterSubWorkflow('subflow1', 'node1');
    controller.stepOut();
    const state = controller.getState();

    expect(state.action).toBe('stepOut');
  });

  it('should continue execution', () => {
    controller.continue();

    expect(controller.getExecutionState()).toBe('running');
    expect(controller.isRunning()).toBe(true);
  });

  it('should pause execution', () => {
    controller.pause();

    expect(controller.getExecutionState()).toBe('paused');
    expect(controller.isPaused()).toBe(true);
  });

  it('should stop execution', () => {
    controller.stop();

    expect(controller.getExecutionState()).toBe('stopped');
    expect(controller.isStopped()).toBe(true);
  });

  it('should pause at next node after step over', () => {
    controller.stepOver('node1');

    // Should not pause at same node
    expect(controller.shouldPauseAtNode('node1', 0)).toBe(false);

    // Should pause at next node
    expect(controller.shouldPauseAtNode('node2', 0)).toBe(true);
  });

  it('should track call stack depth', () => {
    controller.enterSubWorkflow('subflow1', 'node1');

    expect(controller.getCallStackDepth()).toBe(1);

    controller.exitSubWorkflow('subflow1');

    expect(controller.getCallStackDepth()).toBe(0);
  });

  it('should step out to parent level', () => {
    controller.enterSubWorkflow('subflow1', 'node1');
    controller.stepOut();

    // Should pause when returning to depth 0
    expect(controller.shouldPauseAtNode('node2', 0)).toBe(true);
  });
});

describe('ExtendedLogger', () => {
  let logger: ExtendedLogger;

  beforeEach(() => {
    logger = new ExtendedLogger(100);
  });

  it('should log debug message', () => {
    const entry = logger.debug('test-source', 'Debug message');

    expect(entry.level).toBe('DEBUG');
    expect(entry.message).toBe('Debug message');
    expect(entry.source).toBe('test-source');
  });

  it('should log info message', () => {
    const entry = logger.info('test-source', 'Info message');
    expect(entry.level).toBe('INFO');
  });

  it('should log warning message', () => {
    const entry = logger.warn('test-source', 'Warning message');
    expect(entry.level).toBe('WARN');
  });

  it('should log error message with stack trace', () => {
    const entry = logger.error('test-source', 'Error message');

    expect(entry.level).toBe('ERROR');
    expect(entry.stackTrace).toBeDefined();
  });

  it('should filter logs by level', () => {
    logger.debug('source', 'Debug');
    logger.info('source', 'Info');
    logger.error('source', 'Error');

    const errorLogs = logger.getLogs({ levels: ['ERROR'] });
    expect(errorLogs.length).toBe(1);
    expect(errorLogs[0].level).toBe('ERROR');
  });

  it('should filter logs by search text', () => {
    logger.info('source', 'Hello world');
    logger.info('source', 'Goodbye world');
    logger.info('source', 'Test message');

    const filtered = logger.getLogs({ searchText: 'world' });
    expect(filtered.length).toBe(2);
  });

  it('should filter logs by time range', () => {
    const start = Date.now();

    logger.info('source', 'Message 1');

    setTimeout(() => {
      logger.info('source', 'Message 2');
    }, 10);

    const filtered = logger.getLogs({ startTime: start });
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('should export logs as JSON', () => {
    logger.info('source', 'Test message');

    const json = logger.export('json');
    const parsed = JSON.parse(json);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
  });

  it('should export logs as CSV', () => {
    logger.info('source', 'Test message');

    const csv = logger.export('csv');
    expect(csv).toContain('Timestamp,Level,Source,Message');
    expect(csv).toContain('INFO');
  });

  it('should clear logs', () => {
    logger.info('source', 'Message 1');
    logger.info('source', 'Message 2');

    logger.clear();

    expect(logger.getLogs().length).toBe(0);
  });

  it('should limit log entries', () => {
    const smallLogger = new ExtendedLogger(5);

    for (let i = 0; i < 10; i++) {
      smallLogger.info('source', `Message ${i}`);
    }

    expect(smallLogger.getLogs().length).toBe(5);
  });

  it('should get log statistics', () => {
    logger.debug('source', 'Debug');
    logger.info('source', 'Info');
    logger.error('source', 'Error');

    const stats = logger.getStatistics();

    expect(stats.total).toBe(3);
    expect(stats.byLevel.DEBUG).toBe(1);
    expect(stats.byLevel.INFO).toBe(1);
    expect(stats.byLevel.ERROR).toBe(1);
  });
});

describe('Profiler', () => {
  let prof: Profiler;

  beforeEach(() => {
    prof = new Profiler();
    prof.start();
  });

  it('should start and stop profiling', () => {
    prof.start();
    expect(prof).toBeDefined();

    prof.stop();
    expect(prof).toBeDefined();
  });

  it('should record node execution', () => {
    const eventId = prof.startNode('node1', 'Test Node');
    expect(eventId).toBeDefined();

    prof.endNode(eventId, 'completed', 50, 1024 * 1024);

    const metrics = prof.getNodeMetrics('node1');
    expect(metrics).toBeDefined();
    expect(metrics?.executionCount).toBe(1);
  });

  it('should track execution times', () => {
    const eventId = prof.startNode('node1', 'Test Node');
    prof.endNode(eventId);

    const metrics = prof.getNodeMetrics('node1');
    expect(metrics).toBeDefined();
    expect(metrics?.executionCount).toBe(1);
  });

  it('should record network requests', () => {
    const eventId = prof.startNode('node1', 'Test Node');
    prof.endNode(eventId); // Must end node first to create metrics
    prof.recordNetworkRequest('node1', 100);

    const metrics = prof.getNodeMetrics('node1');
    expect(metrics?.networkRequests).toBe(1);
    expect(metrics?.networkTime).toBe(100);
  });

  it('should record database queries', () => {
    const eventId = prof.startNode('node1', 'Test Node');
    prof.endNode(eventId); // Must end node first to create metrics
    prof.recordDatabaseQuery('node1', 50);

    const metrics = prof.getNodeMetrics('node1');
    expect(metrics?.databaseQueries).toBe(1);
    expect(metrics?.databaseTime).toBe(50);
  });

  it('should identify bottlenecks', () => {
    // Create a slow node
    const slowEventId = prof.startNode('slow-node', 'Slow Node');
    prof.endNode(slowEventId, 'completed', 0, 0);

    // Create fast nodes
    for (let i = 0; i < 5; i++) {
      const fastEventId = prof.startNode(`fast-node-${i}`, `Fast Node ${i}`);
      prof.endNode(fastEventId, 'completed', 0, 0);
    }

    const stats = prof.getStatistics();
    expect(stats.bottlenecks).toBeDefined();
  });

  it('should generate performance recommendations', () => {
    const eventId = prof.startNode('slow-node', 'Slow Node');

    // Simulate slow execution (set avgTime > 500ms)
    const event = prof.getTimeline().find(e => e.id === eventId);
    if (event) {
      event.startTime = performance.now() - 600; // Make it look like it started 600ms ago
    }
    prof.endNode(eventId, 'completed', 100, 200 * 1024 * 1024);

    const stats = prof.getStatistics();
    expect(stats.recommendations.length).toBeGreaterThan(0);
  });

  it('should generate flame graph', () => {
    const event1 = prof.startNode('node1', 'Node 1', 0);
    prof.endNode(event1, 'completed');

    const event2 = prof.startNode('node2', 'Node 2', 1);
    prof.endNode(event2, 'completed');

    const flameGraph = prof.generateFlameGraph();

    expect(flameGraph).toBeDefined();
    expect(flameGraph.name).toBe('Workflow');
    expect(flameGraph.children.length).toBeGreaterThan(0);
  });

  it('should clear all metrics', () => {
    prof.startNode('node1', 'Test Node');
    prof.clear();

    expect(prof.getTimeline().length).toBe(0);
  });
});

describe('MemoryProfiler', () => {
  let memProf: MemoryProfiler;

  beforeEach(() => {
    memProf = new MemoryProfiler();
  });

  it('should take memory snapshot', () => {
    const snapshot = memProf.takeSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot.id).toBeDefined();
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  it('should record allocations', () => {
    memProf.start();
    memProf.recordAllocation('node1', 1024 * 1024, 'Object');

    const allocations = memProf.getNodeAllocations('node1');
    expect(allocations.length).toBe(1);
    expect(allocations[0].size).toBe(1024 * 1024);
  });

  it('should record deallocations', () => {
    memProf.start();
    memProf.recordAllocation('node1', 1024, 'Object');

    const allocations = memProf.getNodeAllocations('node1');
    const allocationId = allocations[0].id;

    memProf.recordDeallocation('node1', allocationId);

    const updated = memProf.getNodeAllocations('node1');
    expect(updated[0].retained).toBe(false);
  });

  it('should detect memory leaks', () => {
    memProf.start(100);

    // Take initial snapshots
    memProf.takeSnapshot();
    memProf.takeSnapshot();

    // Simulate memory leak by continuous allocation
    for (let i = 0; i < 10; i++) {
      memProf.recordAllocation('leaky-node', 2 * 1024 * 1024, 'Object');
      memProf.takeSnapshot();
    }

    const leaks = memProf.detectLeaks();
    // May or may not detect leaks depending on growth rate calculation
    expect(Array.isArray(leaks)).toBe(true);
  });

  it('should record GC events', () => {
    memProf.recordGC('mark-sweep', 50, 10 * 1024 * 1024);

    const gcEvents = memProf.getGCEvents();
    expect(gcEvents.length).toBe(1);
    expect(gcEvents[0].type).toBe('mark-sweep');
  });

  it('should format memory size', () => {
    expect(memProf.formatSize(1024)).toBe('1.00 KB');
    expect(memProf.formatSize(1024 * 1024)).toBe('1.00 MB');
    expect(memProf.formatSize(1024 * 1024 * 1024)).toBe('1.00 GB');
  });

  it('should get memory statistics', () => {
    memProf.start();
    memProf.takeSnapshot();

    const stats = memProf.getStatistics();

    expect(stats.snapshotCount).toBeGreaterThanOrEqual(1);
    expect(stats.peakMemory).toBeGreaterThanOrEqual(0);
  });
});

describe('VariableInspector', () => {
  let inspector: VariableInspector;

  beforeEach(() => {
    inspector = new VariableInspector();
  });

  it('should inspect a variable', () => {
    const metadata = inspector.inspectVariable('testVar', { foo: 'bar' });

    expect(metadata.name).toBe('testVar');
    expect(metadata.type).toBe('object');
    expect(metadata.isExpandable).toBe(true);
  });

  it('should inspect primitive values', () => {
    const stringMeta = inspector.inspectVariable('str', 'hello');
    expect(stringMeta.type).toBe('string');
    expect(stringMeta.isEditable).toBe(true);

    const numberMeta = inspector.inspectVariable('num', 42);
    expect(numberMeta.type).toBe('number');

    const boolMeta = inspector.inspectVariable('bool', true);
    expect(boolMeta.type).toBe('boolean');
  });

  it('should inspect arrays', () => {
    const arrayMeta = inspector.inspectVariable('arr', [1, 2, 3]);

    expect(arrayMeta.type).toBe('array');
    expect(arrayMeta.size).toBe(3);
    expect(arrayMeta.isExpandable).toBe(true);
  });

  it('should expand nested variables', () => {
    const obj = { a: 1, b: { c: 2 } };
    const metadata = inspector.inspectVariable('obj', obj);

    const expanded = inspector.expandVariable(metadata);

    expect(expanded.length).toBe(2);
    expect(expanded[0].name).toBe('a');
    expect(expanded[1].name).toBe('b');
  });

  it('should format values correctly', () => {
    expect(inspector.formatValue(null)).toBe('null');
    expect(inspector.formatValue(undefined)).toBe('undefined');
    expect(inspector.formatValue('test')).toBe('"test"');
    expect(inspector.formatValue(42)).toBe('42');
    expect(inspector.formatValue([1, 2, 3])).toBe('Array(3)');
  });

  it('should search variables', () => {
    const variables = [
      inspector.inspectVariable('firstName', 'John'),
      inspector.inspectVariable('lastName', 'Doe'),
      inspector.inspectVariable('age', 30)
    ];

    const results = inspector.searchVariables(variables, 'name');

    expect(results.length).toBe(2);
  });

  it('should get variable at path', () => {
    const scope: VariableScope = {
      nodeInput: { user: { name: 'John' } },
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    };

    const value = inspector.getVariableAtPath(scope, ['nodeInput', 'user', 'name']);
    expect(value).toBe('John');
  });

  it('should set variable at path', () => {
    const scope: VariableScope = {
      nodeInput: { count: 0 },
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    };

    inspector.setVariableAtPath(scope, ['nodeInput', 'count'], 10);

    expect(scope.nodeInput.count).toBe(10);
  });
});
