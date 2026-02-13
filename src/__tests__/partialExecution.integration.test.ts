/**
 * Partial Execution Integration Tests
 * Tests the integration between PartialExecutor, DataPinning, and DebugManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PartialExecutor } from '../execution/PartialExecutor';
import { DataPinningService } from '../execution/DataPinning';
import { DebugManager } from '../execution/DebugManager';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

describe('Partial Execution Integration', () => {
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];
  let executor: PartialExecutor;
  let dataPinning: DataPinningService;
  let debugManager: DebugManager;

  beforeEach(() => {
    // Create workflow
    nodes = [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          id: 'trigger',
          type: 'webhook',
          label: 'Webhook Trigger',
          position: { x: 0, y: 0 },
          icon: 'webhook',
          color: '#3b82f6',
          inputs: 0,
          outputs: 1
        }
      },
      {
        id: 'process',
        type: 'action',
        position: { x: 200, y: 0 },
        data: {
          id: 'process',
          type: 'transform',
          label: 'Process Data',
          position: { x: 200, y: 0 },
          icon: 'transform',
          color: '#10b981',
          inputs: 1,
          outputs: 1
        }
      },
      {
        id: 'validate',
        type: 'action',
        position: { x: 400, y: 0 },
        data: {
          id: 'validate',
          type: 'filter',
          label: 'Validate',
          position: { x: 400, y: 0 },
          icon: 'filter',
          color: '#f59e0b',
          inputs: 1,
          outputs: 1
        }
      },
      {
        id: 'save',
        type: 'action',
        position: { x: 600, y: 0 },
        data: {
          id: 'save',
          type: 'database',
          label: 'Save to DB',
          position: { x: 600, y: 0 },
          icon: 'database',
          color: '#8b5cf6',
          inputs: 1,
          outputs: 1
        }
      }
    ];

    edges = [
      { id: 'e1', source: 'trigger', target: 'process' },
      { id: 'e2', source: 'process', target: 'validate' },
      { id: 'e3', source: 'validate', target: 'save' }
    ];

    executor = new PartialExecutor(nodes, edges);
    dataPinning = new DataPinningService();
    debugManager = new DebugManager();
  });

  it('should execute from pinned node with pinned data', async () => {
    // Pin data to process node
    const pinnedData = {
      user: { id: 1, name: 'John Doe' },
      timestamp: new Date().toISOString()
    };

    dataPinning.pinData('process', pinnedData);

    // Execute from process node
    const result = await executor.executeFromNode({
      startNodeId: 'process',
      testData: pinnedData
    });

    expect(result.success).toBe(true);
    expect(result.nodesExecuted).toBe(3); // process, validate, save
  });

  it('should pause at breakpoint during partial execution', async () => {
    const session = debugManager.createSession(nodes, edges);

    // Add breakpoint at validate node
    debugManager.addBreakpoint(session.id, 'validate');

    let pausedAtBreakpoint = false;

    await executor.executeFromNode(
      {
        startNodeId: 'process',
        testData: { value: 42 }
      },
      undefined,
      (nodeId) => {
        // Check if should pause
        if (debugManager.shouldPauseAtNode(session.id, nodeId)) {
          debugManager.pause(session.id, nodeId);
          pausedAtBreakpoint = true;
        }
      }
    );

    expect(pausedAtBreakpoint).toBe(true);
  });

  it('should use pinned data for multiple test runs', async () => {
    // Pin test data
    const testData = { count: 100, active: true };
    dataPinning.pinData('process', testData);

    // First run
    const result1 = await executor.executeFromNode({
      startNodeId: 'process',
      testData
    });

    // Second run with same data
    const result2 = await executor.executeFromNode({
      startNodeId: 'process',
      testData
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(dataPinning.hasPinnedData('process')).toBe(true);
  });

  it('should track execution through debug session', async () => {
    const session = debugManager.createSession(nodes, edges);

    await executor.executeFromNode(
      {
        startNodeId: 'process',
        testData: { value: 10 }
      },
      (nodeId) => {
        debugManager.pushToStack(session.id, nodeId);
      }
    );

    const stack = debugManager.getExecutionStack(session.id);
    expect(stack.length).toBeGreaterThan(0);
  });

  it('should export and import pinned data for workflow', () => {
    // Pin data to multiple nodes
    dataPinning.pinData('process', { step: 'process', value: 1 });
    dataPinning.pinData('validate', { step: 'validate', value: 2 });
    dataPinning.pinData('save', { step: 'save', value: 3 });

    // Export
    const exported = dataPinning.exportPinnedData();
    expect(Object.keys(exported)).toHaveLength(3);

    // Clear and import
    dataPinning.clearAll();
    const importCount = dataPinning.importPinnedData(exported);

    expect(importCount).toBe(3);
    expect(dataPinning.hasPinnedData('process')).toBe(true);
    expect(dataPinning.hasPinnedData('validate')).toBe(true);
    expect(dataPinning.hasPinnedData('save')).toBe(true);
  });

  it('should step through execution with breakpoints', async () => {
    const session = debugManager.createSession(nodes, edges);

    // Add breakpoints
    debugManager.addBreakpoint(session.id, 'process');
    debugManager.addBreakpoint(session.id, 'validate');

    const executionOrder: string[] = [];

    await executor.executeFromNode(
      {
        startNodeId: 'process',
        testData: { test: true }
      },
      (nodeId) => {
        executionOrder.push(nodeId);

        if (debugManager.shouldPauseAtNode(session.id, nodeId)) {
          debugManager.pause(session.id, nodeId);
          // Simulate stepping
          debugManager.stepOver(session.id);
        }
      }
    );

    expect(executionOrder).toContain('process');
    expect(executionOrder).toContain('validate');
  });

  it('should validate workflow before partial execution', async () => {
    // Build subgraph
    const subgraph = executor.buildExecutionSubgraph('process');

    // Validate without test data
    const validation1 = executor.validateSubgraph(subgraph);
    expect(validation1.isValid).toBe(true);
    expect(validation1.warnings.length).toBeGreaterThan(0); // Should warn about missing test data

    // Validate with test data
    const validation2 = executor.validateSubgraph(subgraph, { data: 'test' });
    expect(validation2.isValid).toBe(true);
  });

  it('should handle conditional breakpoints during execution', async () => {
    const session = debugManager.createSession(nodes, edges);

    // Add conditional breakpoint
    debugManager.addBreakpoint(session.id, 'validate', 'value > 50');

    let pausedCount = 0;

    // First execution - should NOT pause (value = 25)
    await executor.executeFromNode(
      {
        startNodeId: 'process',
        testData: { value: 25 }
      },
      undefined,
      (nodeId) => {
        if (debugManager.shouldPauseAtNode(session.id, nodeId, { value: 25 })) {
          pausedCount++;
        }
      }
    );

    // Second execution - SHOULD pause (value = 75)
    await executor.executeFromNode(
      {
        startNodeId: 'process',
        testData: { value: 75 }
      },
      undefined,
      (nodeId) => {
        if (debugManager.shouldPauseAtNode(session.id, nodeId, { value: 75 })) {
          pausedCount++;
        }
      }
    );

    expect(pausedCount).toBeGreaterThan(0);
  });

  it('should generate and use sample data for testing', async () => {
    // Generate sample data for transform node
    const sampleData = dataPinning.generateSampleData('transform');

    expect(sampleData).toBeDefined();
    expect(typeof sampleData).toBe('object');

    // Use sample data for execution
    const result = await executor.executeFromNode({
      startNodeId: 'process',
      testData: sampleData
    });

    expect(result.success).toBe(true);
  });

  it('should track variables during debug execution', async () => {
    const session = debugManager.createSession(nodes, edges);

    await executor.executeFromNode(
      {
        startNodeId: 'process',
        testData: { initial: 'value' }
      },
      undefined,
      (nodeId, result) => {
        // Store execution result as variable
        debugManager.setVariable(session.id, nodeId, 'result', result.data);
      }
    );

    const processVars = debugManager.getVariables(session.id, 'process') as Record<string, unknown>;
    expect(processVars.result).toBeDefined();
  });
});
