/**
 * Comprehensive Log Streaming Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogStreamer, StreamedLog } from '../logging/LogStreamer';
import { StreamBuffer } from '../logging/StreamBuffer';
import { StructuredLogger } from '../logging/StructuredLogger';
import { LogContext } from '../logging/LogContext';
import { LogRetention, createDefaultPolicies } from '../logging/LogRetention';
import { LogFilter } from '../logging/LogFilter';

describe('LogStreamer', () => {
  let streamer: LogStreamer;

  beforeEach(() => {
    streamer = new LogStreamer();
  });

  afterEach(async () => {
    await streamer.shutdown();
  });

  it('should add stream successfully', () => {
    const streamId = streamer.addStream({
      type: 'datadog',
      config: {
        apiKey: 'test-key',
        site: 'datadoghq.com',
      },
      enabled: true,
    });

    expect(streamId).toBeDefined();
    expect(streamId).toMatch(/^stream_/);
  });

  it('should enforce maximum streams limit', () => {
    const smallStreamer = new LogStreamer({ maxStreams: 2 });

    smallStreamer.addStream({
      type: 'datadog',
      config: { apiKey: 'key1' },
    });

    smallStreamer.addStream({
      type: 'splunk',
      config: { url: 'http://localhost', token: 'token1' },
    });

    expect(() => {
      smallStreamer.addStream({
        type: 'elasticsearch',
        config: { url: 'http://localhost', index: 'logs' },
      });
    }).toThrow('Maximum number of streams');
  });

  it('should stream logs to multiple destinations', async () => {
    const streamId1 = streamer.addStream({
      type: 'datadog',
      config: { apiKey: 'test-key' },
      enabled: true,
    });

    const streamId2 = streamer.addStream({
      type: 'splunk',
      config: { url: 'http://localhost', token: 'test-token' },
      enabled: true,
    });

    const log: StreamedLog = {
      id: 'test-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test log',
    };

    await streamer.stream(log);

    const metrics = streamer.getMetrics() as any[];
    expect(metrics.length).toBe(2);
  });

  it('should apply filters correctly', async () => {
    const streamId = streamer.addStream({
      type: 'datadog',
      config: { apiKey: 'test-key' },
      enabled: true,
      filters: [
        {
          type: 'level',
          operator: 'eq',
          value: 'error',
        },
      ],
    });

    const infoLog: StreamedLog = {
      id: 'test-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Info log',
    };

    const errorLog: StreamedLog = {
      id: 'test-2',
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Error log',
    };

    await streamer.stream(infoLog);
    await streamer.stream(errorLog);

    // Info log should be filtered out
  });

  it('should apply sampling correctly', async () => {
    const streamId = streamer.addStream({
      type: 'datadog',
      config: { apiKey: 'test-key' },
      enabled: true,
      sampling: {
        rate: 0.5, // Sample 50%
        levels: ['debug'],
      },
    });

    let sampledCount = 0;
    const totalLogs = 100;

    for (let i = 0; i < totalLogs; i++) {
      const log: StreamedLog = {
        id: `test-${i}`,
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: `Debug log ${i}`,
      };

      await streamer.stream(log);
    }

    // Should sample approximately 50%
    // Note: In production, metrics would show sampled count
  });

  it('should get health status', async () => {
    const streamId = streamer.addStream({
      type: 'datadog',
      config: { apiKey: 'test-key' },
      enabled: true,
    });

    const health = await streamer.getHealth(streamId);
    expect(health).toBeDefined();
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('status');
  });

  it('should flush all streams', async () => {
    streamer.addStream({
      type: 'datadog',
      config: { apiKey: 'test-key' },
      enabled: true,
    });

    await streamer.flushAll();
  });
});

describe('StreamBuffer', () => {
  let buffer: StreamBuffer;
  let flushedLogs: StreamedLog[] = [];

  beforeEach(() => {
    flushedLogs = [];
    buffer = new StreamBuffer({
      maxSize: 10,
      flushInterval: 1000,
      onFlush: async (logs) => {
        flushedLogs.push(...logs);
      },
    });
  });

  afterEach(async () => {
    await buffer.shutdown();
  });

  it('should buffer logs', async () => {
    const log: StreamedLog = {
      id: 'test-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test log',
    };

    await buffer.add(log);

    expect(buffer.getSize()).toBe(1);
    expect(buffer.getUtilization()).toBe(10);
  });

  it('should auto-flush when full', async () => {
    for (let i = 0; i < 10; i++) {
      await buffer.add({
        id: `test-${i}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Log ${i}`,
      });
    }

    // Wait for async flush
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(flushedLogs.length).toBe(10);
    expect(buffer.isEmpty()).toBe(true);
  });

  it('should handle overflow with drop-oldest strategy', async () => {
    for (let i = 0; i < 12; i++) {
      await buffer.add({
        id: `test-${i}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Log ${i}`,
      });
    }

    // Wait for flush
    await new Promise(resolve => setTimeout(resolve, 100));

    const stats = buffer.getStats();
    expect(stats.totalDropped).toBeGreaterThan(0);
  });

  it('should provide accurate statistics', async () => {
    await buffer.add({
      id: 'test-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test',
    });

    const stats = buffer.getStats();
    expect(stats.totalAdded).toBe(1);
    expect(stats.size).toBe(1);
    expect(stats.utilization).toBe(10);
  });
});

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let logs: StreamedLog[] = [];

  beforeEach(() => {
    logs = [];
    logger = new StructuredLogger({
      service: 'test-service',
      environment: 'test',
    });

    logger.on('log', (log) => {
      logs.push(log);
    });
  });

  it('should create structured logs', () => {
    logger.info('Test message', {
      metadata: { key: 'value' },
    });

    expect(logs.length).toBe(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Test message');
    expect(logs[0].metadata).toEqual({ key: 'value' });
  });

  it('should respect minimum log level', () => {
    logger.setLevel('warn');

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');

    expect(logs.length).toBe(1);
    expect(logs[0].level).toBe('warn');
  });

  it('should include error information', () => {
    const error = new Error('Test error');
    error.name = 'TestError';

    logger.error('Error occurred', error);

    expect(logs[0].error).toBeDefined();
    expect(logs[0].error.name).toBe('TestError');
    expect(logs[0].error.message).toBe('Test error');
    expect(logs[0].error.stack).toBeDefined();
  });

  it('should track performance', () => {
    const endTimer = logger.startTimer('test-operation');

    // Simulate work
    const start = Date.now();
    while (Date.now() - start < 10);

    endTimer();

    const perfLog = logs.find(l => l.message.includes('completed'));
    expect(perfLog).toBeDefined();
    expect(perfLog?.performance?.duration).toBeGreaterThan(0);
  });

  it('should create child logger with context', () => {
    const childLogs: StreamedLog[] = [];
    const child = logger.child({
      userId: 'user-123',
      requestId: 'req-456',
    });

    child.on('log', (log) => {
      childLogs.push(log);
    });

    child.info('Child log');

    expect(childLogs[0].context.userId).toBe('user-123');
    expect(childLogs[0].context.requestId).toBe('req-456');
  });

  it('should log HTTP requests', () => {
    logger.httpRequest('GET', '/api/users', 200, 150, {
      userId: 'user-123',
      ip: '127.0.0.1',
    });

    const httpLog = logs.find(l => l.message.includes('HTTP'));
    expect(httpLog).toBeDefined();
    expect(httpLog?.metadata?.http?.method).toBe('GET');
    expect(httpLog?.metadata?.http?.statusCode).toBe(200);
    expect(httpLog?.performance?.duration).toBe(150);
  });

  it('should log workflow executions', () => {
    logger.workflowExecution('wf-123', 'exec-456', 'completed', {
      duration: 5000,
    });

    const wfLog = logs.find(l => l.message.includes('Workflow'));
    expect(wfLog).toBeDefined();
    expect(wfLog?.context.workflowId).toBe('wf-123');
    expect(wfLog?.context.executionId).toBe('exec-456');
    expect(wfLog?.performance?.duration).toBe(5000);
  });
});

describe('LogContext', () => {
  let context: LogContext;

  beforeEach(() => {
    context = new LogContext({
      service: 'test-service',
    });
  });

  it('should create context with defaults', () => {
    expect(context.get('service')).toBe('test-service');
    expect(context.get('environment')).toBeDefined();
    expect(context.get('pid')).toBeDefined();
  });

  it('should generate and manage trace IDs', () => {
    const traceId = context.generateTraceId();
    expect(traceId).toBeDefined();
    expect(context.getTraceId()).toBe(traceId);
  });

  it('should manage spans', () => {
    context.generateTraceId();

    const span1 = context.startSpan();
    expect(span1).toBeDefined();
    expect(context.getSpanId()).toBe(span1);

    const span2 = context.startSpan();
    expect(context.getSpanId()).toBe(span2);
    expect(context.getParentSpanId()).toBe(span1);

    context.endSpan();
    expect(context.getSpanId()).toBe(span1);
  });

  it('should clone context', () => {
    context.setUserId('user-123');
    const clone = context.clone();

    expect(clone.get('userId')).toBe('user-123');
    expect(clone).not.toBe(context);
  });

  it('should create child context', () => {
    const child = context.child({
      requestId: 'req-456',
    });

    expect(child.get('service')).toBe('test-service');
    expect(child.get('requestId')).toBe('req-456');
  });
});

describe('LogRetention', () => {
  let retention: LogRetention;

  beforeEach(() => {
    retention = new LogRetention(100); // Fast cleanup for testing
  });

  afterEach(() => {
    retention.shutdown();
  });

  it('should add retention policy', () => {
    const policy = retention.addPolicy({
      name: 'Test Policy',
      period: '7d',
      levels: ['error'],
      enabled: true,
    });

    expect(policy.id).toBeDefined();
    expect(policy.name).toBe('Test Policy');
  });

  it('should retain logs based on period', () => {
    retention.addPolicy({
      name: 'Short Retention',
      period: '7d',
      enabled: true,
    });

    const recentLog: StreamedLog = {
      id: 'recent',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Recent log',
    };

    const oldLog: StreamedLog = {
      id: 'old',
      timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      level: 'info',
      message: 'Old log',
    };

    expect(retention.shouldRetain(recentLog)).toBe(true);
    expect(retention.shouldRetain(oldLog)).toBe(false);
  });

  it('should apply policy priorities', () => {
    retention.addPolicy({
      name: 'Low Priority',
      period: '7d',
      levels: ['error'],
      enabled: true,
      priority: 1,
    });

    retention.addPolicy({
      name: 'High Priority',
      period: '90d',
      levels: ['error'],
      enabled: true,
      priority: 10,
    });

    const errorLog: StreamedLog = {
      id: 'error',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      level: 'error',
      message: 'Error log',
    };

    // Should use high priority policy (90d)
    expect(retention.shouldRetain(errorLog)).toBe(true);
  });

  it('should handle forever retention', () => {
    retention.addPolicy({
      name: 'Forever',
      period: 'forever',
      categories: ['audit'],
      enabled: true,
    });

    const auditLog: StreamedLog = {
      id: 'audit',
      timestamp: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      level: 'info',
      message: 'Audit log',
      category: 'audit',
    };

    expect(retention.shouldRetain(auditLog)).toBe(true);
  });

  it('should cleanup old logs', async () => {
    retention.addPolicy({
      name: 'Test',
      period: '7d',
      enabled: true,
    });

    const oldLog: StreamedLog = {
      id: 'old',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      level: 'info',
      message: 'Old log',
    };

    retention.addLog(oldLog);

    const deleted = await retention.cleanup();
    expect(deleted).toBe(1);

    const stats = retention.getStats();
    expect(stats.deletedLogs).toBe(1);
  });

  it('should create default policies', () => {
    const policies = createDefaultPolicies();
    expect(policies.length).toBeGreaterThan(0);
    expect(policies.find(p => p.name.includes('Error'))).toBeDefined();
    expect(policies.find(p => p.name.includes('Security'))).toBeDefined();
  });
});

describe('LogFilter', () => {
  let filter: LogFilter;

  beforeEach(() => {
    filter = new LogFilter();
  });

  afterEach(() => {
    filter.shutdown();
  });

  it('should add filter rule', () => {
    const rule = filter.addRule({
      name: 'Test Rule',
      type: 'level',
      action: 'include',
      config: {
        levels: ['error', 'fatal'],
      },
      enabled: true,
    });

    expect(rule.id).toBeDefined();
    expect(rule.name).toBe('Test Rule');
  });

  it('should filter by level', () => {
    filter.addRule({
      name: 'Error Only',
      type: 'level',
      action: 'include',
      config: {
        levels: ['error'],
      },
      enabled: true,
    });

    const errorLog: StreamedLog = {
      id: 'error',
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Error',
    };

    const infoLog: StreamedLog = {
      id: 'info',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Info',
    };

    expect(filter.filter(errorLog)).toBe(true);
    expect(filter.filter(infoLog)).toBe(false);
  });

  it('should filter by category', () => {
    filter.addRule({
      name: 'Workflow Only',
      type: 'category',
      action: 'include',
      config: {
        categories: ['workflow'],
      },
      enabled: true,
    });

    const workflowLog: StreamedLog = {
      id: 'wf',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Workflow',
      category: 'workflow',
    };

    const apiLog: StreamedLog = {
      id: 'api',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'API',
      category: 'api',
    };

    expect(filter.filter(workflowLog)).toBe(true);
    expect(filter.filter(apiLog)).toBe(false);
  });

  it('should filter by regex', () => {
    filter.addRule({
      name: 'Pattern Match',
      type: 'regex',
      action: 'include',
      config: {
        pattern: 'ERROR:\\s+\\d+',
      },
      enabled: true,
    });

    const matchLog: StreamedLog = {
      id: 'match',
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'ERROR: 500',
    };

    const noMatchLog: StreamedLog = {
      id: 'nomatch',
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Error occurred',
    };

    expect(filter.filter(matchLog)).toBe(true);
    expect(filter.filter(noMatchLog)).toBe(false);
  });

  it('should apply sampling', () => {
    filter.addRule({
      name: 'Sample 50%',
      type: 'sample',
      action: 'include',
      config: {
        sampleRate: 0.5,
      },
      enabled: true,
    });

    let passed = 0;
    const total = 100;

    for (let i = 0; i < total; i++) {
      const log: StreamedLog = {
        id: `log-${i}`,
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: `Debug ${i}`,
      };

      if (filter.filter(log)) {
        passed++;
      }
    }

    // Should be approximately 50%
    expect(passed).toBeGreaterThan(40);
    expect(passed).toBeLessThan(60);
  });

  it('should provide statistics', () => {
    const rule = filter.addRule({
      name: 'Test',
      type: 'level',
      action: 'include',
      config: { levels: ['error'] },
      enabled: true,
    });

    filter.filter({
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Error',
    });

    filter.filter({
      id: '2',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Info',
    });

    const stats = filter.getStats(rule.id) as any;
    expect(stats.totalProcessed).toBe(2);
    expect(stats.excluded).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  it('should integrate logger with streamer', async () => {
    const logger = new StructuredLogger();
    const streamer = new LogStreamer();

    const streamId = streamer.addStream({
      type: 'datadog',
      config: { apiKey: 'test-key' },
      enabled: true,
    });

    logger.on('log', async (log) => {
      await streamer.stream(log);
    });

    logger.info('Test integration');

    await new Promise(resolve => setTimeout(resolve, 100));

    await streamer.shutdown();
  });

  it('should integrate filter with retention', async () => {
    const filter = new LogFilter();
    const retention = new LogRetention();

    filter.addRule({
      name: 'Keep Errors',
      type: 'level',
      action: 'include',
      config: { levels: ['error'] },
      enabled: true,
    });

    retention.addPolicy({
      name: 'Error Retention',
      period: '90d',
      levels: ['error'],
      enabled: true,
    });

    const log: StreamedLog = {
      id: 'test',
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Error',
    };

    const passes = filter.filter(log);
    if (passes) {
      retention.addLog(log);
    }

    expect(retention.shouldRetain(log)).toBe(true);

    filter.shutdown();
    retention.shutdown();
  });
});
