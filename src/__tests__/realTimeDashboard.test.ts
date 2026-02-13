/**
 * Real-Time Dashboard & Observability Tests
 * Comprehensive test suite for real-time monitoring components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RealTimeMetricsCollector,
  Metric,
  MetricQuery
} from '../observability/RealTimeMetricsCollector';
import {
  LiveExecutionMonitor,
  ExecutionStatus
} from '../observability/LiveExecutionMonitor';
import {
  MultiAgentView,
  AgentStatus
} from '../observability/MultiAgentView';
import {
  EdgeDeviceMonitor,
  DeviceStatus
} from '../observability/EdgeDeviceMonitor';
import {
  EventTimeline,
  EventType,
  EventSeverity
} from '../observability/EventTimeline';

describe('RealTimeMetricsCollector', () => {
  let collector: RealTimeMetricsCollector;

  beforeEach(() => {
    collector = new RealTimeMetricsCollector();
  });

  afterEach(() => {
    collector.shutdown();
  });

  it('should register metrics', () => {
    const metric: Metric = {
      name: 'test_metric',
      type: 'counter',
      help: 'Test metric',
      labels: ['label1']
    };

    collector.registerMetric(metric);
    const snapshot = collector.getSnapshot(['test_metric']);
    expect(snapshot).toBeDefined();
  });

  it('should record counter metrics', () => {
    collector.registerMetric({
      name: 'requests_total',
      type: 'counter',
      help: 'Total requests',
      labels: []
    });

    collector.incrementCounter('requests_total');
    collector.incrementCounter('requests_total', {}, 5);

    const query: MetricQuery = {
      metric: 'requests_total',
      start: Date.now() - 60000,
      end: Date.now()
    };

    const results = collector.query(query);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should record gauge metrics', () => {
    collector.registerMetric({
      name: 'cpu_usage',
      type: 'gauge',
      help: 'CPU usage',
      labels: []
    });

    collector.setGauge('cpu_usage', 45.5);
    collector.setGauge('cpu_usage', 67.2);

    const timeSeries = collector.getTimeSeries('cpu_usage');
    expect(timeSeries.length).toBeGreaterThan(0);
  });

  it('should record histogram metrics', () => {
    collector.registerMetric({
      name: 'request_duration',
      type: 'histogram',
      help: 'Request duration',
      labels: []
    });

    collector.observeHistogram('request_duration', 100);
    collector.observeHistogram('request_duration', 200);
    collector.observeHistogram('request_duration', 150);

    const query: MetricQuery = {
      metric: 'request_duration',
      start: Date.now() - 60000,
      end: Date.now(),
      aggregation: 'avg'
    };

    const results = collector.query(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].value).toBeCloseTo(150, 0);
  });

  it('should aggregate metrics correctly', () => {
    collector.registerMetric({
      name: 'latency',
      type: 'histogram',
      help: 'Latency',
      labels: []
    });

    for (let i = 1; i <= 100; i++) {
      collector.observeHistogram('latency', i);
    }

    const query: MetricQuery = {
      metric: 'latency',
      start: Date.now() - 60000,
      end: Date.now(),
      aggregation: 'p95'
    };

    const results = collector.query(query);
    expect(results[0].value).toBeGreaterThanOrEqual(95);
  });

  it('should stream metrics', async () => {
    collector.registerMetric({
      name: 'stream_metric',
      type: 'counter',
      help: 'Stream metric',
      labels: []
    });

    const streamPromise = new Promise<void>((resolve) => {
      let updateCount = 0;
      collector.on('stream:update', () => {
        updateCount++;
        if (updateCount >= 2) {
          collector.stopStreaming('client1');
          expect(updateCount).toBeGreaterThanOrEqual(2);
          resolve();
        }
      });
    });

    collector.startStreaming('client1', {
      metrics: ['stream_metric'],
      interval: 100
    });

    collector.incrementCounter('stream_metric');
    await streamPromise;
  });

  it('should handle metrics with labels', () => {
    collector.registerMetric({
      name: 'http_requests',
      type: 'counter',
      help: 'HTTP requests',
      labels: ['method', 'status']
    });

    collector.recordMetric('http_requests', 1, { method: 'GET', status: '200' });
    collector.recordMetric('http_requests', 1, { method: 'POST', status: '201' });

    const timeSeries = collector.getTimeSeries('http_requests');
    expect(timeSeries.length).toBe(2);
  });

  it('should cleanup old metrics', () => {
    collector.registerMetric({
      name: 'old_metric',
      type: 'counter',
      help: 'Old metric',
      labels: []
    });

    const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    collector.recordMetric('old_metric', 1, {}, oldTimestamp);
    collector.recordMetric('old_metric', 1); // Current

    // Force cleanup
    (collector as any).cleanup();

    const timeSeries = collector.getTimeSeries('old_metric');
    expect(timeSeries[0].points.length).toBe(1);
  });
});

describe('LiveExecutionMonitor', () => {
  let monitor: LiveExecutionMonitor;

  beforeEach(() => {
    monitor = new LiveExecutionMonitor();
  });

  afterEach(() => {
    monitor.shutdown();
  });

  it('should start execution tracking', () => {
    monitor.startExecution('exec1', 'wf1', 'Test Workflow', { totalNodes: 5 });

    const execution = monitor.getExecution('exec1');
    expect(execution).toBeDefined();
    expect(execution?.workflowId).toBe('wf1');
    expect(execution?.status).toBe('running');
  });

  it('should track node execution', () => {
    monitor.startExecution('exec1', 'wf1', 'Test Workflow', { totalNodes: 3 });
    monitor.startNode('exec1', 'node1', 'HTTP Request', 'http');
    monitor.completeNode('exec1', 'node1', { success: true });

    const execution = monitor.getExecution('exec1');
    expect(execution?.completedNodes).toBe(1);
    expect(execution?.progress).toBeGreaterThan(0);
  });

  it('should handle node failures', () => {
    monitor.startExecution('exec1', 'wf1', 'Test Workflow', { totalNodes: 2 });
    monitor.startNode('exec1', 'node1', 'HTTP Request', 'http');
    monitor.failNode('exec1', 'node1', 'Connection timeout');

    const execution = monitor.getExecution('exec1');
    expect(execution?.failedNodes).toBe(1);

    const nodeInfo = execution?.nodes.get('node1');
    expect(nodeInfo?.status).toBe('failed');
    expect(nodeInfo?.error).toBe('Connection timeout');
  });

  it('should complete execution', () => {
    monitor.startExecution('exec1', 'wf1', 'Test Workflow', { totalNodes: 2 });
    monitor.startNode('exec1', 'node1', 'Start', 'trigger');
    monitor.completeNode('exec1', 'node1');
    monitor.startNode('exec1', 'node2', 'End', 'action');
    monitor.completeNode('exec1', 'node2');
    monitor.completeExecution('exec1');

    const execution = monitor.getExecution('exec1');
    expect(execution).toBeNull(); // Moved to history

    const history = monitor.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('completed');
  });

  it('should calculate execution metrics', () => {
    monitor.startExecution('exec1', 'wf1', 'Test Workflow', { totalNodes: 3 });
    monitor.startNode('exec1', 'node1', 'Node 1', 'http');
    monitor.completeNode('exec1', 'node1', undefined, { memoryUsage: 1024 * 1024 });
    monitor.startNode('exec1', 'node2', 'Node 2', 'http');
    monitor.completeNode('exec1', 'node2', undefined, { memoryUsage: 2048 * 1024 });

    const metrics = monitor.getMetrics('exec1');
    expect(metrics).toBeDefined();
    expect(metrics?.nodeMetrics.size).toBe(2);
    expect(metrics?.averageNodeDuration).toBeGreaterThan(0);
  });

  it('should filter executions', () => {
    monitor.startExecution('exec1', 'wf1', 'WF1', { totalNodes: 1, environment: 'dev' });
    monitor.startExecution('exec2', 'wf2', 'WF2', { totalNodes: 1, environment: 'prod' });

    const filtered = monitor.getActiveExecutions({ environment: 'dev' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].environment).toBe('dev');
  });

  it('should get execution statistics', () => {
    monitor.startExecution('exec1', 'wf1', 'WF1', { totalNodes: 1 });
    monitor.completeExecution('exec1');

    const stats = monitor.getStatistics();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.activeExecutions).toBe(0);
  });

  it('should record data flows', () => {
    monitor.startExecution('exec1', 'wf1', 'WF1', { totalNodes: 2 });
    monitor.recordDataFlow('exec1', 'node1', 'node2', { data: 'test' });

    const execution = monitor.getExecution('exec1');
    expect(execution?.dataFlows.length).toBe(1);
    expect(execution?.dataFlows[0].fromNodeId).toBe('node1');
  });
});

describe('MultiAgentView', () => {
  let agentView: MultiAgentView;

  beforeEach(() => {
    agentView = new MultiAgentView();
  });

  afterEach(() => {
    agentView.shutdown();
  });

  it('should register agents', () => {
    agentView.registerAgent('agent1', 'worker', 'Worker Agent', ['task1', 'task2']);

    const agent = agentView.getAgent('agent1');
    expect(agent).toBeDefined();
    expect(agent?.agentType).toBe('worker');
    expect(agent?.capabilities).toHaveLength(2);
  });

  it('should update agent status', () => {
    agentView.registerAgent('agent1', 'worker', 'Worker', []);
    agentView.updateAgentStatus('agent1', 'busy');

    const agent = agentView.getAgent('agent1');
    expect(agent?.status).toBe('busy');
  });

  it('should update agent health', () => {
    agentView.registerAgent('agent1', 'worker', 'Worker', []);
    agentView.updateAgentHealth('agent1', { errorRate: 0.15 });

    const agent = agentView.getAgent('agent1');
    expect(agent?.health.errorRate).toBe(0.15);
  });

  it('should record agent communications', () => {
    agentView.registerAgent('agent1', 'worker', 'Agent 1', []);
    agentView.registerAgent('agent2', 'worker', 'Agent 2', []);

    agentView.recordCommunication('agent1', 'agent2', 'task_request', true, 100);

    const communications = agentView.getCommunications();
    expect(communications.length).toBe(1);
    expect(communications[0].fromAgent).toBe('agent1');
    expect(communications[0].toAgent).toBe('agent2');
  });

  it('should detect bottlenecks', () => {
    agentView.registerAgent('agent1', 'worker', 'Worker', []);
    agentView.updateAgentResources('agent1', { cpuPercent: 95, queueSize: 200 });

    const bottlenecks = agentView.getBottlenecks();
    expect(bottlenecks.length).toBeGreaterThan(0);
    expect(bottlenecks[0].type).toBe('cpu');
  });

  it('should get agent statistics', () => {
    agentView.registerAgent('agent1', 'worker', 'Worker 1', []);
    agentView.registerAgent('agent2', 'worker', 'Worker 2', []);
    agentView.updateAgentStatus('agent1', 'busy');

    const stats = agentView.getStatistics();
    expect(stats.totalAgents).toBe(2);
    expect(stats.activeAgents).toBe(1);
  });

  it('should filter agents', () => {
    agentView.registerAgent('agent1', 'worker', 'Worker 1', []);
    agentView.registerAgent('agent2', 'manager', 'Manager', []);
    agentView.updateAgentStatus('agent1', 'busy');

    const filtered = agentView.getAgents({ status: ['busy'] });
    expect(filtered.length).toBe(1);
    expect(filtered[0].agentId).toBe('agent1');
  });

  it('should generate communication graph', () => {
    agentView.registerAgent('agent1', 'worker', 'Agent 1', []);
    agentView.registerAgent('agent2', 'worker', 'Agent 2', []);
    agentView.recordCommunication('agent1', 'agent2', 'msg', true);

    const graph = agentView.getCommunicationGraph();
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBe(1);
  });
});

describe('EdgeDeviceMonitor', () => {
  let deviceMonitor: EdgeDeviceMonitor;

  beforeEach(() => {
    deviceMonitor = new EdgeDeviceMonitor();
  });

  afterEach(() => {
    deviceMonitor.shutdown();
  });

  it('should register devices', () => {
    deviceMonitor.registerDevice('device1', 'Edge Server 1', 'us-east', ['compute', 'storage']);

    const device = deviceMonitor.getDevice('device1');
    expect(device).toBeDefined();
    expect(device?.region).toBe('us-east');
    expect(device?.capabilities).toHaveLength(2);
  });

  it('should update device status', () => {
    deviceMonitor.registerDevice('device1', 'Device 1', 'us-east', []);
    deviceMonitor.updateStatus('device1', 'offline');

    const device = deviceMonitor.getDevice('device1');
    expect(device?.status).toBe('offline');
  });

  it('should update device resources', () => {
    deviceMonitor.registerDevice('device1', 'Device 1', 'us-east', []);
    deviceMonitor.updateResources('device1', {
      cpuPercent: 75,
      memoryPercent: 60,
      diskPercent: 80
    });

    const device = deviceMonitor.getDevice('device1');
    expect(device?.resources.cpuPercent).toBe(75);
  });

  it('should detect resource alerts', () => {
    deviceMonitor.registerDevice('device1', 'Device 1', 'us-east', []);
    deviceMonitor.updateResources('device1', { cpuPercent: 95 });

    const alerts = deviceMonitor.getAlerts('device1');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should track heartbeats', () => {
    deviceMonitor.registerDevice('device1', 'Device 1', 'us-east', []);
    deviceMonitor.heartbeat('device1');

    const device = deviceMonitor.getDevice('device1');
    expect(device?.status).toBe('online');
  });

  it('should filter devices by region', () => {
    deviceMonitor.registerDevice('device1', 'Device 1', 'us-east', []);
    deviceMonitor.registerDevice('device2', 'Device 2', 'eu-west', []);

    const usDevices = deviceMonitor.getDevices({ region: 'us-east' });
    expect(usDevices.length).toBe(1);
    expect(usDevices[0].region).toBe('us-east');
  });

  it('should get device statistics', () => {
    deviceMonitor.registerDevice('device1', 'Device 1', 'us-east', []);
    deviceMonitor.registerDevice('device2', 'Device 2', 'us-east', []);
    deviceMonitor.updateStatus('device2', 'offline');

    const stats = deviceMonitor.getStatistics();
    expect(stats.totalDevices).toBe(2);
    expect(stats.onlineDevices).toBe(1);
    expect(stats.offlineDevices).toBe(1);
  });
});

describe('EventTimeline', () => {
  let timeline: EventTimeline;

  beforeEach(() => {
    timeline = new EventTimeline();
  });

  afterEach(() => {
    timeline.shutdown();
  });

  it('should add events', () => {
    const eventId = timeline.addEvent({
      type: 'execution',
      severity: 'info',
      source: 'workflow-engine',
      title: 'Execution started'
    });

    expect(eventId).toBeDefined();
    const event = timeline.getEvent(eventId);
    expect(event?.title).toBe('Execution started');
  });

  it('should filter events by type', () => {
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'E1' });
    timeline.addEvent({ type: 'agent', severity: 'info', source: 'test', title: 'A1' });

    const filtered = timeline.getEvents({ types: ['execution'] });
    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe('execution');
  });

  it('should filter events by severity', () => {
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'Info' });
    timeline.addEvent({ type: 'execution', severity: 'error', source: 'test', title: 'Error' });

    const filtered = timeline.getEvents({ severities: ['error'] });
    expect(filtered.length).toBe(1);
    expect(filtered[0].severity).toBe('error');
  });

  it('should search events', () => {
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'Database query' });
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'HTTP request' });

    const results = timeline.searchEvents('database');
    expect(results.length).toBe(1);
    expect(results[0].title).toContain('Database');
  });

  it('should get events in time range', () => {
    const now = Date.now();
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'E1' });

    const events = timeline.getEventsInRange(now - 1000, now + 1000);
    expect(events.length).toBe(1);
  });

  it('should correlate events', () => {
    const correlationId = 'corr-123';
    timeline.addEvent({
      type: 'execution',
      severity: 'info',
      source: 'test',
      title: 'E1',
      correlationId
    });
    timeline.addEvent({
      type: 'execution',
      severity: 'info',
      source: 'test',
      title: 'E2',
      correlationId
    });

    const correlated = timeline.getCorrelatedEvents(correlationId);
    expect(correlated.length).toBe(2);
  });

  it('should get timeline statistics', () => {
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'E1' });
    timeline.addEvent({ type: 'execution', severity: 'error', source: 'test', title: 'E2' });

    const stats = timeline.getStatistics();
    expect(stats.totalEvents).toBe(2);
    expect(stats.eventsBySeverity.info).toBe(1);
    expect(stats.eventsBySeverity.error).toBe(1);
  });

  it('should export events', () => {
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'E1' });

    const json = timeline.exportEvents(undefined, 'json');
    expect(json).toBeDefined();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('should clear old events', () => {
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'E1' });
    timeline.addEvent({ type: 'execution', severity: 'info', source: 'test', title: 'E2' });

    timeline.clearEvents(Date.now() + 1000); // Clear everything
    const events = timeline.getEvents();
    expect(events.length).toBe(0);
  });
});

describe('Integration Tests', () => {
  it('should integrate metrics with execution monitoring', () => {
    const monitor = new LiveExecutionMonitor();
    const collector = new RealTimeMetricsCollector();

    monitor.startExecution('exec1', 'wf1', 'Test', { totalNodes: 1 });
    monitor.completeExecution('exec1');

    // Metrics should be recorded
    const query = collector.query({
      metric: 'workflow_executions_total',
      start: Date.now() - 60000,
      end: Date.now()
    });

    expect(query.length).toBeGreaterThan(0);

    monitor.shutdown();
    collector.shutdown();
  });

  it('should integrate agents with event timeline', () => {
    const agentView = new MultiAgentView();
    const timeline = new EventTimeline();

    agentView.registerAgent('agent1', 'worker', 'Worker', []);

    // This would trigger events in a real scenario
    const events = timeline.getEvents({ types: ['agent'] });
    expect(Array.isArray(events)).toBe(true);

    agentView.shutdown();
    timeline.shutdown();
  });
});
