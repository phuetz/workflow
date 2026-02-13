/**
 * Unit Tests for Log Streaming (No Network Calls)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreamBuffer } from '../logging/StreamBuffer';
import { StructuredLogger } from '../logging/StructuredLogger';
import { LogContext } from '../logging/LogContext';
import { LogRetention, createDefaultPolicies } from '../logging/LogRetention';
import { LogFilter } from '../logging/LogFilter';
import { StreamedLog } from '../logging/LogStreamer';

describe('StreamBuffer Unit Tests', () => {
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

  it('should buffer logs correctly', async () => {
    const log: StreamedLog = {
      id: 'test-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test log',
    };

    await buffer.add(log);

    expect(buffer.getSize()).toBe(1);
    expect(buffer.getUtilization()).toBe(10);
    expect(buffer.isEmpty()).toBe(false);
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

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(flushedLogs.length).toBe(10);
    expect(buffer.isEmpty()).toBe(true);
  });

  it('should track statistics accurately', async () => {
    await buffer.add({
      id: 'test-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test',
    });

    await buffer.add({
      id: 'test-2',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test',
    });

    const stats = buffer.getStats();
    expect(stats.totalAdded).toBe(2);
    expect(stats.size).toBe(2);
  });

  it('should handle manual flush', async () => {
    await buffer.add({
      id: 'test-1',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Test',
    });

    expect(buffer.getSize()).toBe(1);

    await buffer.flush();

    expect(buffer.isEmpty()).toBe(true);
    expect(flushedLogs.length).toBe(1);
  });
});

describe('StructuredLogger Unit Tests', () => {
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

  it('should create structured logs with all fields', () => {
    logger.info('Test message', {
      metadata: { key: 'value' },
    });

    expect(logs.length).toBe(1);
    expect(logs[0]).toHaveProperty('id');
    expect(logs[0]).toHaveProperty('timestamp');
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Test message');
    expect(logs[0].metadata).toEqual({ key: 'value' });
    expect(logs[0].context.service).toBe('test-service');
  });

  it('should respect minimum log level', () => {
    logger.setLevel('warn');

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    expect(logs.length).toBe(2); // warn and error
    expect(logs[0].level).toBe('warn');
    expect(logs[1].level).toBe('error');
  });

  it('should handle all log levels', () => {
    logger.setLevel('trace');

    logger.trace('Trace');
    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warn');
    logger.error('Error');
    logger.fatal('Fatal');

    expect(logs.length).toBe(6);
    expect(logs.map(l => l.level)).toEqual([
      'trace', 'debug', 'info', 'warn', 'error', 'fatal'
    ]);
  });

  it('should include error information', () => {
    const error = new Error('Test error');
    error.name = 'TestError';

    logger.error('Error occurred', error);

    expect(logs[0].error).toBeDefined();
    expect(logs[0].error.name).toBe('TestError');
    expect(logs[0].error.message).toBe('Test error');
    expect(logs[0].error.stack).toBeDefined();
    expect(Array.isArray(logs[0].error.stack)).toBe(true);
  });

  it('should create child logger with additional context', () => {
    const child = logger.child({
      userId: 'user-123',
      requestId: 'req-456',
    });

    const childLogs: StreamedLog[] = [];
    child.on('log', (log) => childLogs.push(log));

    child.info('Child log');

    expect(childLogs[0].context.userId).toBe('user-123');
    expect(childLogs[0].context.requestId).toBe('req-456');
    expect(childLogs[0].context.service).toBe('test-service');
  });

  it('should track performance with timer', () => {
    const endTimer = logger.startTimer('test-operation');

    // Simulate work
    const start = Date.now();
    while (Date.now() - start < 10);

    endTimer();

    const perfLog = logs.find(l => l.message.includes('completed'));
    expect(perfLog).toBeDefined();
    expect(perfLog?.performance?.duration).toBeGreaterThan(0);
  });

  it('should log metrics', () => {
    logger.metric('api.requests', 100, 'count', {
      endpoint: '/api/users',
      method: 'GET',
    });

    const metricLog = logs.find(l => l.message === 'Metric');
    expect(metricLog).toBeDefined();
    expect(metricLog?.metadata?.metric?.name).toBe('api.requests');
    expect(metricLog?.metadata?.metric?.value).toBe(100);
    expect(metricLog?.metadata?.metric?.unit).toBe('count');
  });
});

describe('LogContext Unit Tests', () => {
  let context: LogContext;

  beforeEach(() => {
    context = new LogContext({
      service: 'test-service',
      environment: 'test',
    });
  });

  it('should create context with defaults', () => {
    expect(context.get('service')).toBe('test-service');
    expect(context.get('environment')).toBe('test');
    expect(context.get('pid')).toBeDefined();
  });

  it('should manage trace IDs', () => {
    const traceId = context.generateTraceId();

    expect(traceId).toBeDefined();
    expect(typeof traceId).toBe('string');
    expect(context.getTraceId()).toBe(traceId);
  });

  it('should manage spans hierarchically', () => {
    // First span generates trace ID automatically
    const span1 = context.startSpan();
    const currentSpanId1 = context.getSpanId();
    expect(currentSpanId1).toBeDefined();
    expect(context.getTraceId()).toBeDefined();

    const span2 = context.startSpan();
    const currentSpanId2 = context.getSpanId();
    expect(currentSpanId2).toBeDefined();
    expect(currentSpanId2).not.toBe(currentSpanId1);
    // After starting span2, span1 becomes the parent
    expect(context.getParentSpanId()).toBeDefined();

    context.endSpan();
    // After ending span2, we go back to span1
    expect(context.getSpanId()).toBeDefined();
  });

  it('should set and get values', () => {
    context.setUserId('user-123');
    context.setSessionId('session-456');
    context.setRequestId('req-789');

    expect(context.get('userId')).toBe('user-123');
    expect(context.get('sessionId')).toBe('session-456');
    expect(context.get('requestId')).toBe('req-789');
  });

  it('should create child context', () => {
    context.setUserId('user-123');

    const child = context.child({
      requestId: 'req-456',
    });

    expect(child.get('userId')).toBe('user-123');
    expect(child.get('requestId')).toBe('req-456');
    expect(child.get('service')).toBe('test-service');
  });

  it('should clone context', () => {
    context.setUserId('user-123');

    const clone = context.clone();

    expect(clone.get('userId')).toBe('user-123');
    expect(clone).not.toBe(context);

    clone.setUserId('user-456');
    expect(context.get('userId')).toBe('user-123');
  });

  it('should convert to JSON', () => {
    context.setUserId('user-123');

    const json = context.toJSON();

    expect(json).toHaveProperty('service');
    expect(json).toHaveProperty('userId');
    expect(json.userId).toBe('user-123');
  });
});

describe('LogRetention Unit Tests', () => {
  let retention: LogRetention;

  beforeEach(() => {
    retention = new LogRetention(100);
  });

  afterEach(() => {
    retention.shutdown();
  });

  it('should add and retrieve policies', () => {
    const policy = retention.addPolicy({
      name: 'Test Policy',
      period: '7d',
      levels: ['error'],
      enabled: true,
    });

    expect(policy.id).toBeDefined();
    expect(policy.name).toBe('Test Policy');

    const retrieved = retention.getPolicy(policy.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Test Policy');

    const allPolicies = retention.getPolicies();
    expect(allPolicies.length).toBe(1);
  });

  it('should retain recent logs', () => {
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

    expect(retention.shouldRetain(recentLog)).toBe(true);
  });

  it('should not retain old logs', () => {
    retention.addPolicy({
      name: 'Short Retention',
      period: '7d',
      enabled: true,
    });

    const oldLog: StreamedLog = {
      id: 'old',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      level: 'info',
      message: 'Old log',
    };

    expect(retention.shouldRetain(oldLog)).toBe(false);
  });

  it('should apply policy priority correctly', () => {
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

    // Should use high priority policy (90d retention)
    expect(retention.shouldRetain(errorLog)).toBe(true);
  });

  it('should handle forever retention', () => {
    retention.addPolicy({
      name: 'Forever',
      period: 'forever',
      categories: ['audit'],
      enabled: true,
    });

    const veryOldLog: StreamedLog = {
      id: 'audit',
      timestamp: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      level: 'info',
      message: 'Audit log',
      category: 'audit',
    };

    expect(retention.shouldRetain(veryOldLog)).toBe(true);
  });

  it('should provide statistics', () => {
    const stats = retention.getStats();

    expect(stats).toHaveProperty('totalLogs');
    expect(stats).toHaveProperty('retainedLogs');
    expect(stats).toHaveProperty('deletedLogs');
  });

  it('should create default policies', () => {
    const policies = createDefaultPolicies();

    expect(policies.length).toBeGreaterThan(0);
    expect(policies.find(p => p.name.includes('Error'))).toBeDefined();
    expect(policies.find(p => p.name.includes('Security'))).toBeDefined();
  });
});

describe('LogFilter Unit Tests', () => {
  let filter: LogFilter;

  beforeEach(() => {
    filter = new LogFilter();
  });

  afterEach(() => {
    filter.shutdown();
  });

  it('should add and retrieve filter rules', () => {
    const rule = filter.addRule({
      name: 'Test Rule',
      type: 'level',
      action: 'include',
      config: {
        levels: ['error'],
      },
      enabled: true,
    });

    expect(rule.id).toBeDefined();
    expect(rule.name).toBe('Test Rule');

    const rules = filter.getRules();
    expect(rules.length).toBe(1);
  });

  it('should filter by log level (include)', () => {
    filter.addRule({
      name: 'Error Only',
      type: 'level',
      action: 'include',
      config: {
        levels: ['error', 'fatal'],
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

  it('should filter by log level (exclude)', () => {
    filter.addRule({
      name: 'No Debug',
      type: 'level',
      action: 'exclude',
      config: {
        levels: ['debug', 'trace'],
      },
      enabled: true,
    });

    const debugLog: StreamedLog = {
      id: 'debug',
      timestamp: new Date().toISOString(),
      level: 'debug',
      message: 'Debug',
    };

    const infoLog: StreamedLog = {
      id: 'info',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Info',
    };

    expect(filter.filter(debugLog)).toBe(false);
    expect(filter.filter(infoLog)).toBe(true);
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

  it('should filter by regex pattern', () => {
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
      message: 'Something went wrong',
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

    // Should be approximately 50% (with some variance)
    expect(passed).toBeGreaterThan(40);
    expect(passed).toBeLessThan(60);
  });

  it('should provide filter statistics', () => {
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

describe('Performance Tests', () => {
  it('should handle high-volume logging', () => {
    const logger = new StructuredLogger();
    const logs: StreamedLog[] = [];

    logger.on('log', (log) => logs.push(log));

    const start = Date.now();
    const count = 10000;

    for (let i = 0; i < count; i++) {
      logger.info(`Log ${i}`, {
        metadata: { index: i },
      });
    }

    const duration = Date.now() - start;
    const logsPerSecond = (count / duration) * 1000;

    expect(logs.length).toBe(count);
    expect(logsPerSecond).toBeGreaterThan(1000); // Should handle > 1000 logs/sec
  });

  it('should buffer efficiently', async () => {
    let flushCount = 0;
    const buffer = new StreamBuffer({
      maxSize: 100,
      flushInterval: 100,
      onFlush: async (logs) => {
        flushCount++;
      },
    });

    const start = Date.now();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      await buffer.add({
        id: `log-${i}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Log ${i}`,
      });
    }

    await buffer.flush();
    const duration = Date.now() - start;

    expect(flushCount).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second

    await buffer.shutdown();
  });
});
