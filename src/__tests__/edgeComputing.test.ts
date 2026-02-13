/**
 * Edge Computing System Tests
 * Comprehensive tests for edge runtime, compiler, hybrid execution, sync, and device management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EdgeWorkflowRuntime } from '../edge/EdgeWorkflowRuntime';
import { EdgeCompiler } from '../edge/EdgeCompiler';
import { HybridExecutionManager } from '../edge/HybridExecutionManager';
import { SyncEngine } from '../edge/SyncEngine';
import { DeviceManager } from '../edge/DeviceManager';
import type { Workflow, WorkflowNode } from '../types/workflow';
import type { EdgeDevice, CompiledWorkflow, EdgeMetrics } from '../types/edge';

describe('Edge Workflow Runtime', () => {
  let runtime: EdgeWorkflowRuntime;

  beforeEach(() => {
    runtime = new EdgeWorkflowRuntime('test-device', {
      maxMemory: 512,
      maxCpu: 80,
      offlineBufferSize: 1000,
      logLevel: 'error'
    });
  });

  it('should initialize runtime with correct configuration', () => {
    expect(runtime).toBeDefined();
    const runtimeInfo = runtime.getRuntime();
    expect(runtimeInfo.deviceId).toBe('test-device');
    expect(runtimeInfo.configuration.maxMemory).toBe(512);
  });

  it('should start and stop runtime successfully', async () => {
    await runtime.start();
    const runtimeInfo = runtime.getRuntime();
    expect(runtimeInfo.uptime).toBeGreaterThan(0);

    await runtime.stop();
  });

  it('should load and unload workflows', async () => {
    const workflow: CompiledWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      compiled: {
        code: 'console.log("test")',
        size: 100,
        checksum: 'abc123'
      },
      dependencies: [],
      targetPlatform: 'node',
      optimization: {
        level: 'basic',
        minified: false,
        treeShaken: false
      },
      metadata: {
        compiledAt: new Date(),
        compiler: 'test',
        sourceNodes: 1,
        targetSize: 100
      }
    };

    await runtime.loadWorkflow(workflow);
    await runtime.unloadWorkflow('test-workflow');
  });

  it('should execute workflow on edge', async () => {
    const workflow: CompiledWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      compiled: {
        code: 'return { success: true }',
        size: 100,
        checksum: runtime['calculateChecksum']('return { success: true }')
      },
      dependencies: [],
      targetPlatform: 'node',
      optimization: {
        level: 'basic',
        minified: false,
        treeShaken: false
      },
      metadata: {
        compiledAt: new Date(),
        compiler: 'test',
        sourceNodes: 1,
        targetSize: 100
      }
    };

    await runtime.loadWorkflow(workflow);
    const execution = await runtime.executeWorkflow('test-workflow', { input: 'test' });

    expect(execution.status).toBe('completed');
    expect(execution.location).toBe('edge');
    expect(execution.duration).toBeGreaterThan(0);
  });

  it('should handle offline mode and buffer events', async () => {
    runtime.setOnlineStatus(false);

    const workflow: CompiledWorkflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      compiled: {
        code: 'return { success: true }',
        size: 100,
        checksum: runtime['calculateChecksum']('return { success: true }')
      },
      dependencies: [],
      targetPlatform: 'node',
      optimization: {
        level: 'basic',
        minified: false,
        treeShaken: false
      },
      metadata: {
        compiledAt: new Date(),
        compiler: 'test',
        sourceNodes: 1,
        targetSize: 100
      }
    };

    await runtime.loadWorkflow(workflow);
    await runtime.executeWorkflow('test-workflow', { input: 'test' });

    const buffer = runtime.getOfflineBuffer();
    expect(buffer.events.length).toBeGreaterThan(0);
  });

  it('should maintain memory footprint under 5MB', () => {
    const footprint = runtime.getMemoryFootprint();
    expect(footprint).toBeLessThan(5 * 1024 * 1024); // 5MB
  });

  it('should collect and update metrics', async () => {
    await runtime.start();
    await new Promise(resolve => setTimeout(resolve, 1100));

    const metrics = runtime.getMetrics();
    expect(metrics.timestamp).toBeDefined();
    expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
    expect(metrics.memory.usage).toBeGreaterThanOrEqual(0);

    await runtime.stop();
  });
});

describe('Edge Compiler', () => {
  let compiler: EdgeCompiler;

  beforeEach(() => {
    compiler = new EdgeCompiler();
  });

  const createMockWorkflow = (): Workflow => ({
    id: 'test-workflow',
    name: 'Test Workflow',
    version: '1.0.0',
    nodes: [
      {
        id: 'node-1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {}
      },
      {
        id: 'node-2',
        type: 'http-request',
        position: { x: 100, y: 0 },
        data: { url: 'https://api.example.com', method: 'GET' }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  it('should compile workflow successfully', async () => {
    const workflow = createMockWorkflow();
    const result = await compiler.compile(workflow);

    expect(result.workflow).toBeDefined();
    expect(result.workflow.compiled.code).toBeTruthy();
    expect(result.workflow.compiled.size).toBeGreaterThan(0);
    expect(result.stats.nodesCompiled).toBe(2);
  });

  it('should optimize code with aggressive setting', async () => {
    const workflow = createMockWorkflow();
    const result = await compiler.compile(workflow, {
      optimization: 'aggressive',
      minify: true,
      treeShake: true
    });

    expect(result.workflow.optimization.level).toBe('aggressive');
    expect(result.workflow.optimization.minified).toBe(true);
    expect(result.workflow.optimization.treeShaken).toBe(true);
  });

  it('should generate valid checksum', async () => {
    const workflow = createMockWorkflow();
    const result = await compiler.compile(workflow);

    expect(result.workflow.compiled.checksum).toBeTruthy();
    expect(result.workflow.compiled.checksum.length).toBeGreaterThan(0);
  });

  it('should achieve compression ratio > 2x', async () => {
    const workflow = createMockWorkflow();
    const result = await compiler.compile(workflow, {
      optimization: 'aggressive',
      minify: true,
      treeShake: true
    });

    expect(result.stats.compressionRatio).toBeGreaterThan(2);
  });

  it('should compile for different platforms', async () => {
    const workflow = createMockWorkflow();

    const nodeResult = await compiler.compile(workflow, { targetPlatform: 'node' });
    expect(nodeResult.workflow.targetPlatform).toBe('node');

    const denoResult = await compiler.compile(workflow, { targetPlatform: 'deno' });
    expect(denoResult.workflow.targetPlatform).toBe('deno');
  });
});

describe('Hybrid Execution Manager', () => {
  let manager: HybridExecutionManager;
  let mockDevice: EdgeDevice;

  beforeEach(() => {
    manager = new HybridExecutionManager();
    mockDevice = {
      id: 'device-1',
      name: 'Test Device',
      type: 'raspberry-pi',
      platform: 'linux-arm64',
      status: 'online',
      capabilities: {
        cpu: { cores: 4, architecture: 'arm64', clockSpeed: 1500 },
        memory: { total: 4096, available: 2048 },
        storage: { total: 64, available: 32 },
        network: { type: 'wifi', bandwidth: 100, latency: 5 }
      },
      metadata: {},
      createdAt: new Date(),
      lastSeen: new Date()
    };

    manager.registerDevice(mockDevice);
  });

  const createMockWorkflow = (): Workflow => ({
    id: 'test-workflow',
    name: 'Test Workflow',
    version: '1.0.0',
    nodes: [
      {
        id: 'node-1',
        type: 'sensor-read',
        position: { x: 0, y: 0 },
        data: {}
      }
    ],
    edges: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  it('should make execution decision based on latency', async () => {
    const workflow = createMockWorkflow();
    const decision = await manager.decideExecution({
      workflow,
      input: {},
      device: mockDevice,
      criteria: { maxLatency: 10 }
    });

    expect(decision).toBeDefined();
    expect(decision.location).toBeDefined();
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
  });

  it('should prefer edge for low-latency requirements', async () => {
    const workflow = createMockWorkflow();
    const decision = await manager.decideExecution({
      workflow,
      input: {},
      device: mockDevice,
      criteria: { maxLatency: 10, preferEdge: true }
    });

    expect(decision.location).toBe('edge');
    expect(decision.estimatedLatency).toBeLessThan(50);
  });

  it('should create hybrid execution plan', async () => {
    const workflow = createMockWorkflow();
    const plan = await manager.createHybridPlan({
      workflow,
      input: {},
      device: mockDevice,
      criteria: {}
    });

    expect(plan).toBeDefined();
    expect(plan.strategy).toBeDefined();
    expect(plan.estimatedLatency).toBeGreaterThan(0);
    expect(plan.estimatedCost).toBeGreaterThan(0);
  });

  it('should route to edge when offline required', async () => {
    const workflow = createMockWorkflow();
    const decision = await manager.decideExecution({
      workflow,
      input: {},
      device: mockDevice,
      criteria: { requireOffline: true }
    });

    expect(decision.location).toBe('edge');
    expect(decision.confidence).toBe(1.0);
  });
});

describe('Sync Engine', () => {
  let syncEngine: SyncEngine;

  beforeEach(() => {
    syncEngine = new SyncEngine('test-device', {
      syncInterval: 30,
      batchSize: 100,
      compressionEnabled: true,
      conflictResolution: 'timestamp',
      retryAttempts: 3,
      retryDelay: 1000
    });
  });

  it('should initialize sync engine', () => {
    expect(syncEngine).toBeDefined();
    const stats = syncEngine.getStats();
    expect(stats.totalOperations).toBe(0);
  });

  it('should queue sync operations', async () => {
    const operationId = await syncEngine.queueOperation({
      type: 'push',
      status: 'pending',
      deviceId: 'test-device',
      dataType: 'workflow',
      payload: { test: 'data' },
      size: 100
    });

    expect(operationId).toBeTruthy();
    const pending = syncEngine.getPendingOperations();
    expect(pending.length).toBe(1);
  });

  it('should handle offline/online transitions', () => {
    syncEngine.setOnlineStatus(false);
    syncEngine.setOnlineStatus(true);

    const stats = syncEngine.getStats();
    expect(stats).toBeDefined();
  });

  it('should sync offline buffer', async () => {
    const buffer = {
      deviceId: 'test-device',
      events: [
        {
          id: 'event-1',
          type: 'execution' as const,
          timestamp: new Date(),
          data: { test: 'data' },
          size: 100,
          synced: false,
          retryCount: 0
        }
      ],
      size: 100,
      maxSize: 10000,
      oldestEvent: new Date(),
      newestEvent: new Date()
    };

    const result = await syncEngine.syncOfflineBuffer(buffer);
    expect(result.synced).toBeGreaterThanOrEqual(0);
  });

  it('should track sync statistics', async () => {
    await syncEngine.queueOperation({
      type: 'push',
      status: 'pending',
      deviceId: 'test-device',
      dataType: 'workflow',
      payload: {},
      size: 100
    });

    const stats = syncEngine.getStats();
    expect(stats.totalOperations).toBeGreaterThan(0);
  });
});

describe('Device Manager', () => {
  let deviceManager: DeviceManager;

  beforeEach(() => {
    deviceManager = new DeviceManager();
  });

  it('should register new devices', async () => {
    const device = await deviceManager.registerDevice({
      name: 'Test Device',
      type: 'raspberry-pi',
      platform: 'linux-arm64',
      status: 'online',
      capabilities: {
        cpu: { cores: 4, architecture: 'arm64', clockSpeed: 1500 },
        memory: { total: 4096, available: 2048 },
        storage: { total: 64, available: 32 },
        network: { type: 'wifi', bandwidth: 100, latency: 5 }
      },
      metadata: {}
    });

    expect(device.id).toBeTruthy();
    expect(device.name).toBe('Test Device');
  });

  it('should update device information', async () => {
    const device = await deviceManager.registerDevice({
      name: 'Test Device',
      type: 'raspberry-pi',
      platform: 'linux-arm64',
      status: 'online',
      capabilities: {
        cpu: { cores: 4, architecture: 'arm64', clockSpeed: 1500 },
        memory: { total: 4096, available: 2048 },
        storage: { total: 64, available: 32 },
        network: { type: 'wifi', bandwidth: 100, latency: 5 }
      },
      metadata: {}
    });

    const updated = await deviceManager.updateDevice(device.id, {
      status: 'offline'
    });

    expect(updated.status).toBe('offline');
  });

  it('should perform health checks', async () => {
    const device = await deviceManager.registerDevice({
      name: 'Test Device',
      type: 'raspberry-pi',
      platform: 'linux-arm64',
      status: 'online',
      capabilities: {
        cpu: { cores: 4, architecture: 'arm64', clockSpeed: 1500 },
        memory: { total: 4096, available: 2048 },
        storage: { total: 64, available: 32 },
        network: { type: 'wifi', bandwidth: 100, latency: 5 }
      },
      metadata: {}
    });

    const result = await deviceManager.healthCheck(device.id);
    expect(result.healthy).toBeDefined();
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should create and manage device groups', async () => {
    const device = await deviceManager.registerDevice({
      name: 'Test Device',
      type: 'raspberry-pi',
      platform: 'linux-arm64',
      status: 'online',
      capabilities: {
        cpu: { cores: 4, architecture: 'arm64', clockSpeed: 1500 },
        memory: { total: 4096, available: 2048 },
        storage: { total: 64, available: 32 },
        network: { type: 'wifi', bandwidth: 100, latency: 5 }
      },
      metadata: {}
    });

    const group = await deviceManager.createGroup({
      name: 'Test Group',
      description: 'Test group',
      deviceIds: [device.id],
      tags: ['test'],
      deployments: []
    });

    expect(group.id).toBeTruthy();
    expect(group.deviceIds).toContain(device.id);
  });

  it('should get fleet statistics', async () => {
    await deviceManager.registerDevice({
      name: 'Test Device 1',
      type: 'raspberry-pi',
      platform: 'linux-arm64',
      status: 'online',
      capabilities: {
        cpu: { cores: 4, architecture: 'arm64', clockSpeed: 1500 },
        memory: { total: 4096, available: 2048 },
        storage: { total: 64, available: 32 },
        network: { type: 'wifi', bandwidth: 100, latency: 5 }
      },
      metadata: {}
    });

    const stats = deviceManager.getFleetStats();
    expect(stats.totalDevices).toBeGreaterThan(0);
    expect(stats.onlineDevices).toBeGreaterThanOrEqual(0);
  });
});
