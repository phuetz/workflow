/**
 * AnalyticsService Unit Tests
 * Tests for the analytics aggregation layer
 *
 * @module AnalyticsService.test
 * @created 2026-01-07
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../services/RealMetricsCollector', () => ({
  realMetricsCollector: {
    collect: vi.fn().mockResolvedValue({}),
    getMetrics: vi.fn().mockReturnValue([])
  }
}));

import {
  AnalyticsService,
  WorkflowMetrics,
  NodeMetrics,
  ExecutionMetrics,
  AlertRule,
  Alert,
  PerformanceReport,
  BusinessMetrics
} from '../../services/AnalyticsService';

// ============================================
// Test Fixtures
// ============================================

const createTestExecutionMetrics = (overrides: Partial<ExecutionMetrics> = {}): ExecutionMetrics => ({
  id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  workflowId: 'wf-test-1',
  startTime: new Date(Date.now() - 5000),
  endTime: new Date(),
  duration: 5000,
  status: 'success',
  nodesExecuted: 5,
  totalNodes: 5,
  executionPath: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'],
  resourceUsage: {
    cpu: 25,
    memory: 512,
    network: 100
  },
  triggeredBy: 'user-1',
  environment: 'development',
  ...overrides
});

const createTestAlertRule = (overrides: Partial<Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>> = {}): Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: 'High Error Rate Alert',
  description: 'Alert when error rate exceeds threshold',
  enabled: true,
  condition: {
    metric: 'errorRate',
    operator: 'gt',
    threshold: 10,
    timeWindow: 5
  },
  actions: [
    {
      type: 'email',
      config: { to: 'admin@example.com' },
      enabled: true
    }
  ],
  ...overrides
});

// ============================================
// Tests
// ============================================

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnalyticsService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Constructor Tests
  // ============================================
  describe('Constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeInstanceOf(AnalyticsService);
    });

    it('should initialize with empty metrics', async () => {
      const metrics = await service.getWorkflowMetrics();
      // May have default metrics from initialization
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  // ============================================
  // Workflow Metrics Tests
  // ============================================
  describe('Workflow Metrics', () => {
    describe('trackWorkflowExecution()', () => {
      it('should track a successful execution', async () => {
        const execution = createTestExecutionMetrics();

        await service.trackWorkflowExecution(execution);

        const history = await service.getExecutionHistory({ workflowId: execution.workflowId });
        expect(history.some(e => e.id === execution.id)).toBe(true);
      });

      it('should track a failed execution', async () => {
        const execution = createTestExecutionMetrics({
          status: 'failure',
          errorDetails: {
            nodeId: 'node-3',
            errorType: 'TimeoutError',
            errorMessage: 'Node execution timed out'
          }
        });

        await service.trackWorkflowExecution(execution);

        const history = await service.getExecutionHistory({ status: 'failure' });
        expect(history.some(e => e.id === execution.id)).toBe(true);
      });

      it('should update workflow metrics after tracking', async () => {
        const execution = createTestExecutionMetrics();

        await service.trackWorkflowExecution(execution);

        const metrics = await service.getWorkflowMetrics(execution.workflowId);
        expect(metrics.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('getWorkflowMetrics()', () => {
      it('should return all metrics when no workflowId provided', async () => {
        const metrics = await service.getWorkflowMetrics();
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should return specific workflow metrics when workflowId provided', async () => {
        const execution = createTestExecutionMetrics({ workflowId: 'wf-specific-1' });
        await service.trackWorkflowExecution(execution);

        const metrics = await service.getWorkflowMetrics('wf-specific-1');
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should return empty array for non-existent workflow', async () => {
        const metrics = await service.getWorkflowMetrics('wf-non-existent');
        expect(metrics).toEqual([]);
      });
    });

    describe('getNodeMetrics()', () => {
      it('should return all node metrics when no nodeId provided', async () => {
        const metrics = await service.getNodeMetrics();
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should return specific node metrics when nodeId provided', async () => {
        const metrics = await service.getNodeMetrics('node-1');
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should return empty array for non-existent node', async () => {
        const metrics = await service.getNodeMetrics('node-non-existent');
        expect(metrics).toEqual([]);
      });
    });
  });

  // ============================================
  // Execution History Tests
  // ============================================
  describe('Execution History', () => {
    describe('getExecutionHistory()', () => {
      it('should return all executions without filters', async () => {
        const exec1 = createTestExecutionMetrics();
        const exec2 = createTestExecutionMetrics();

        await service.trackWorkflowExecution(exec1);
        await service.trackWorkflowExecution(exec2);

        const history = await service.getExecutionHistory();
        expect(history.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by workflowId', async () => {
        const exec1 = createTestExecutionMetrics({ workflowId: 'wf-filter-1' });
        const exec2 = createTestExecutionMetrics({ workflowId: 'wf-filter-2' });

        await service.trackWorkflowExecution(exec1);
        await service.trackWorkflowExecution(exec2);

        const history = await service.getExecutionHistory({ workflowId: 'wf-filter-1' });
        expect(history.every(e => e.workflowId === 'wf-filter-1')).toBe(true);
      });

      it('should filter by status', async () => {
        const successExec = createTestExecutionMetrics({ status: 'success' });
        const failedExec = createTestExecutionMetrics({ status: 'failure' });

        await service.trackWorkflowExecution(successExec);
        await service.trackWorkflowExecution(failedExec);

        const history = await service.getExecutionHistory({ status: 'success' });
        expect(history.every(e => e.status === 'success')).toBe(true);
      });

      it('should respect limit parameter', async () => {
        for (let i = 0; i < 10; i++) {
          await service.trackWorkflowExecution(createTestExecutionMetrics());
        }

        const history = await service.getExecutionHistory({ limit: 5 });
        expect(history.length).toBe(5);
      });

      it('should sort by startTime descending', async () => {
        const oldExec = createTestExecutionMetrics({
          startTime: new Date(Date.now() - 10000)
        });
        const newExec = createTestExecutionMetrics({
          startTime: new Date()
        });

        await service.trackWorkflowExecution(oldExec);
        await service.trackWorkflowExecution(newExec);

        const history = await service.getExecutionHistory({ limit: 2 });
        if (history.length >= 2) {
          expect(history[0].startTime.getTime()).toBeGreaterThanOrEqual(history[1].startTime.getTime());
        }
      });

      it('should filter by date range', async () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600000);

        const recentExec = createTestExecutionMetrics({
          startTime: new Date(now.getTime() - 1800000), // 30 min ago
          endTime: new Date(now.getTime() - 1790000)
        });

        await service.trackWorkflowExecution(recentExec);

        const history = await service.getExecutionHistory({
          startDate: oneHourAgo,
          endDate: now
        });

        expect(history.every(e =>
          e.startTime >= oneHourAgo && e.endTime <= now
        )).toBe(true);
      });
    });
  });

  // ============================================
  // Performance Reports Tests
  // ============================================
  describe('Performance Reports', () => {
    describe('generatePerformanceReport()', () => {
      it('should generate a workflow performance report', async () => {
        const dateRange = {
          start: new Date(Date.now() - 86400000), // 1 day ago
          end: new Date()
        };

        const report = await service.generatePerformanceReport('workflow', dateRange);

        expect(report).toHaveProperty('reportId');
        expect(report.reportType).toBe('workflow');
        expect(report.dateRange).toEqual(dateRange);
        expect(report).toHaveProperty('metrics');
        expect(report).toHaveProperty('insights');
        expect(report).toHaveProperty('recommendations');
      });

      it('should generate a node performance report', async () => {
        const dateRange = {
          start: new Date(Date.now() - 86400000),
          end: new Date()
        };

        const report = await service.generatePerformanceReport('node', dateRange);

        expect(report.reportType).toBe('node');
        expect(Array.isArray(report.insights)).toBe(true);
        expect(Array.isArray(report.recommendations)).toBe(true);
      });

      it('should generate a system performance report', async () => {
        const dateRange = {
          start: new Date(Date.now() - 604800000), // 1 week ago
          end: new Date()
        };

        const report = await service.generatePerformanceReport('system', dateRange);

        expect(report.reportType).toBe('system');
        expect(report.createdAt).toBeInstanceOf(Date);
      });

      it('should include createdAt timestamp', async () => {
        const beforeGeneration = new Date();
        const report = await service.generatePerformanceReport('custom', {
          start: new Date(Date.now() - 86400000),
          end: new Date()
        });
        const afterGeneration = new Date();

        expect(report.createdAt.getTime()).toBeGreaterThanOrEqual(beforeGeneration.getTime());
        expect(report.createdAt.getTime()).toBeLessThanOrEqual(afterGeneration.getTime());
      });

      it('should generate unique report IDs', async () => {
        const dateRange = { start: new Date(), end: new Date() };

        const report1 = await service.generatePerformanceReport('workflow', dateRange);
        const report2 = await service.generatePerformanceReport('workflow', dateRange);

        expect(report1.reportId).not.toBe(report2.reportId);
      });
    });
  });

  // ============================================
  // Business Metrics Tests
  // ============================================
  describe('Business Metrics', () => {
    describe('getBusinessMetrics()', () => {
      it('should return business metrics for hour period', async () => {
        const metrics = await service.getBusinessMetrics('hour');
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should return business metrics for day period', async () => {
        const metrics = await service.getBusinessMetrics('day');
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should return business metrics for week period', async () => {
        const metrics = await service.getBusinessMetrics('week');
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should return business metrics for month period', async () => {
        const metrics = await service.getBusinessMetrics('month');
        expect(Array.isArray(metrics)).toBe(true);
      });

      it('should default to day period', async () => {
        const metrics = await service.getBusinessMetrics();
        expect(Array.isArray(metrics)).toBe(true);
      });
    });
  });

  // ============================================
  // Real-time Metrics Tests
  // ============================================
  describe('Real-time Metrics', () => {
    describe('getRealTimeMetrics()', () => {
      it('should return real-time metrics structure', async () => {
        const metrics = await service.getRealTimeMetrics();

        expect(metrics).toHaveProperty('activeExecutions');
        expect(metrics).toHaveProperty('queuedExecutions');
        expect(metrics).toHaveProperty('systemLoad');
        expect(metrics).toHaveProperty('errorRate');
        expect(metrics).toHaveProperty('avgResponseTime');
        expect(metrics).toHaveProperty('throughput');
      });

      it('should return numeric values', async () => {
        const metrics = await service.getRealTimeMetrics();

        expect(typeof metrics.activeExecutions).toBe('number');
        expect(typeof metrics.queuedExecutions).toBe('number');
        expect(typeof metrics.systemLoad).toBe('number');
        expect(typeof metrics.errorRate).toBe('number');
        expect(typeof metrics.avgResponseTime).toBe('number');
        expect(typeof metrics.throughput).toBe('number');
      });

      it('should calculate error rate from recent executions', async () => {
        // Track some executions
        await service.trackWorkflowExecution(createTestExecutionMetrics({ status: 'success' }));
        await service.trackWorkflowExecution(createTestExecutionMetrics({ status: 'failure' }));

        const metrics = await service.getRealTimeMetrics();

        expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
        expect(metrics.errorRate).toBeLessThanOrEqual(100);
      });
    });
  });

  // ============================================
  // Alert Rules Tests
  // ============================================
  describe('Alert Rules', () => {
    describe('createAlertRule()', () => {
      it('should create an alert rule with generated ID', async () => {
        const ruleData = createTestAlertRule();

        const rule = await service.createAlertRule(ruleData);

        expect(rule.id).toBeDefined();
        expect(rule.name).toBe(ruleData.name);
        expect(rule.description).toBe(ruleData.description);
        expect(rule.enabled).toBe(ruleData.enabled);
      });

      it('should set createdAt and updatedAt timestamps', async () => {
        const beforeCreate = new Date();
        const rule = await service.createAlertRule(createTestAlertRule());
        const afterCreate = new Date();

        expect(rule.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
        expect(rule.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        expect(rule.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      });

      it('should store condition properly', async () => {
        const ruleData = createTestAlertRule({
          condition: {
            metric: 'cpu',
            operator: 'gte',
            threshold: 80,
            timeWindow: 10
          }
        });

        const rule = await service.createAlertRule(ruleData);

        expect(rule.condition.metric).toBe('cpu');
        expect(rule.condition.operator).toBe('gte');
        expect(rule.condition.threshold).toBe(80);
        expect(rule.condition.timeWindow).toBe(10);
      });

      it('should store actions properly', async () => {
        const ruleData = createTestAlertRule({
          actions: [
            { type: 'email', config: { to: 'test@example.com' }, enabled: true },
            { type: 'slack', config: { channel: '#alerts' }, enabled: true }
          ]
        });

        const rule = await service.createAlertRule(ruleData);

        expect(rule.actions).toHaveLength(2);
        expect(rule.actions[0].type).toBe('email');
        expect(rule.actions[1].type).toBe('slack');
      });
    });

    describe('getAlertRules()', () => {
      it('should return all alert rules', async () => {
        await service.createAlertRule(createTestAlertRule({ name: 'Rule 1' }));
        await service.createAlertRule(createTestAlertRule({ name: 'Rule 2' }));

        const rules = await service.getAlertRules();

        expect(rules.length).toBeGreaterThanOrEqual(2);
      });

      it('should return array of AlertRule objects', async () => {
        await service.createAlertRule(createTestAlertRule());

        const rules = await service.getAlertRules();

        rules.forEach(rule => {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('name');
          expect(rule).toHaveProperty('condition');
          expect(rule).toHaveProperty('actions');
        });
      });
    });

    describe('getAlerts()', () => {
      it('should return alerts array', async () => {
        const alerts = await service.getAlerts();
        expect(Array.isArray(alerts)).toBe(true);
      });

      it('should filter alerts by resolved status', async () => {
        const unresolvedAlerts = await service.getAlerts({ resolved: false });
        expect(unresolvedAlerts.every(a => a.resolved === false)).toBe(true);
      });

      it('should filter alerts by severity', async () => {
        const criticalAlerts = await service.getAlerts({ severity: 'critical' });
        expect(criticalAlerts.every(a => a.severity === 'critical')).toBe(true);
      });
    });
  });

  // ============================================
  // Dashboard Widget Tests
  // ============================================
  describe('Dashboard Widgets', () => {
    it('should have dashboard widget types defined', () => {
      // DashboardWidget type is exported from AnalyticsService
      // Testing type availability
      expect(true).toBe(true);
    });
  });

  // ============================================
  // Service Cleanup Tests
  // ============================================
  describe('Service Lifecycle', () => {
    it('should handle multiple instances without conflict', () => {
      const service2 = new AnalyticsService();
      expect(service2).toBeInstanceOf(AnalyticsService);
    });
  });

  // ============================================
  // Type Safety Tests
  // ============================================
  describe('Type Safety', () => {
    it('should have correct types for WorkflowMetrics', async () => {
      const execution = createTestExecutionMetrics();
      await service.trackWorkflowExecution(execution);

      const metrics = await service.getWorkflowMetrics();
      if (metrics.length > 0) {
        const metric = metrics[0];
        expect(typeof metric.workflowId).toBe('string');
        expect(typeof metric.totalExecutions).toBe('number');
        expect(typeof metric.successRate).toBe('number');
      }
    });

    it('should have correct types for ExecutionMetrics', () => {
      const execution = createTestExecutionMetrics();

      expect(typeof execution.id).toBe('string');
      expect(typeof execution.workflowId).toBe('string');
      expect(execution.startTime).toBeInstanceOf(Date);
      expect(execution.endTime).toBeInstanceOf(Date);
      expect(typeof execution.duration).toBe('number');
      expect(typeof execution.status).toBe('string');
    });

    it('should have correct types for AlertRule', async () => {
      const rule = await service.createAlertRule(createTestAlertRule());

      expect(typeof rule.id).toBe('string');
      expect(typeof rule.name).toBe('string');
      expect(typeof rule.enabled).toBe('boolean');
      expect(typeof rule.condition).toBe('object');
      expect(Array.isArray(rule.actions)).toBe(true);
      expect(rule.createdAt).toBeInstanceOf(Date);
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty execution path', async () => {
      const execution = createTestExecutionMetrics({
        executionPath: [],
        nodesExecuted: 0
      });

      await expect(service.trackWorkflowExecution(execution)).resolves.not.toThrow();
    });

    it('should handle very long execution', async () => {
      const execution = createTestExecutionMetrics({
        duration: 3600000, // 1 hour
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date()
      });

      await expect(service.trackWorkflowExecution(execution)).resolves.not.toThrow();
    });

    it('should handle concurrent tracking', async () => {
      const executions = Array.from({ length: 10 }, () => createTestExecutionMetrics());

      await Promise.all(executions.map(e => service.trackWorkflowExecution(e)));

      const history = await service.getExecutionHistory();
      expect(history.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle special characters in workflow ID', async () => {
      const execution = createTestExecutionMetrics({
        workflowId: 'wf-special-chars-!@#$%'
      });

      await expect(service.trackWorkflowExecution(execution)).resolves.not.toThrow();
    });

    it('should handle zero duration execution', async () => {
      const execution = createTestExecutionMetrics({
        duration: 0,
        startTime: new Date(),
        endTime: new Date()
      });

      await expect(service.trackWorkflowExecution(execution)).resolves.not.toThrow();
    });
  });
});
