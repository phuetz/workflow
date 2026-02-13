/**
 * LoggingService Unit Tests
 * Tests for both SimpleLogger and LoggingService
 *
 * Task: T2.2 - Tests LoggingService
 * Created: 2026-01-07
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================
// SimpleLogger Tests
// ============================================
describe('SimpleLogger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Log Format', () => {
    it('should format log messages with timestamp and level', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.info('Test message');

      expect(consoleSpy.info).toHaveBeenCalled();
      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/);
      expect(logMessage).toContain('[INFO]');
      expect(logMessage).toContain('Test message');
    });

    it('should include data in log message as JSON', async () => {
      const { logger } = await import('../../services/SimpleLogger');
      const testData = { key: 'value', count: 42 };

      logger.info('With data', testData);

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain(JSON.stringify(testData));
    });

    it('should handle undefined data gracefully', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.info('No data');

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).not.toContain('undefined');
    });
  });

  describe('info()', () => {
    it('should log info messages', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.info('Info message');

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should include INFO level in message', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.info('Test');

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain('[INFO]');
    });
  });

  describe('warn()', () => {
    it('should log warning messages', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should include WARN level in message', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.warn('Test');

      const logMessage = consoleSpy.warn.mock.calls[0][0];
      expect(logMessage).toContain('[WARN]');
    });
  });

  describe('error()', () => {
    it('should log error messages', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include ERROR level in message', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.error('Test');

      const logMessage = consoleSpy.error.mock.calls[0][0];
      expect(logMessage).toContain('[ERROR]');
    });
  });

  describe('fatal()', () => {
    it('should log fatal messages via console.error', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.fatal('Fatal message');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include FATAL level in message', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.fatal('Test');

      const logMessage = consoleSpy.error.mock.calls[0][0];
      expect(logMessage).toContain('[FATAL]');
    });
  });

  describe('debug()', () => {
    it('should log debug messages in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      vi.resetModules();

      const { logger } = await import('../../services/SimpleLogger');

      logger.debug('Debug message');

      expect(consoleSpy.debug).toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should include DEBUG level in message', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      vi.resetModules();

      const { logger } = await import('../../services/SimpleLogger');

      logger.debug('Test');

      const logMessage = consoleSpy.debug.mock.calls[0][0];
      expect(logMessage).toContain('[DEBUG]');
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('metric()', () => {
    it('should log metrics with name and value', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.metric('response_time', 150);

      expect(consoleSpy.info).toHaveBeenCalled();
      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain('[METRIC]');
      expect(logMessage).toContain('response_time=150');
    });

    it('should include unit when provided', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      logger.metric('memory_usage', 512, 'MB');

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain('memory_usage=512 MB');
    });

    it('should include tags in data', async () => {
      const { logger } = await import('../../services/SimpleLogger');
      const tags = { environment: 'production', service: 'api' };

      logger.metric('request_count', 1000, undefined, tags);

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain(JSON.stringify(tags));
    });
  });

  describe('setLevel()', () => {
    it('should accept valid log levels', async () => {
      const { logger } = await import('../../services/SimpleLogger');

      expect(() => logger.setLevel('debug')).not.toThrow();
      expect(() => logger.setLevel('info')).not.toThrow();
      expect(() => logger.setLevel('warn')).not.toThrow();
      expect(() => logger.setLevel('error')).not.toThrow();
      expect(() => logger.setLevel('fatal')).not.toThrow();
    });
  });

  describe('Convenience exports', () => {
    it('should export debug, info, warn, error, fatal functions', async () => {
      const { debug, info, warn, error, fatal } = await import('../../services/SimpleLogger');

      expect(typeof debug).toBe('function');
      expect(typeof info).toBe('function');
      expect(typeof warn).toBe('function');
      expect(typeof error).toBe('function');
      expect(typeof fatal).toBe('function');
    });
  });
});

// ============================================
// LoggingService Tests
// ============================================
describe('LoggingService', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
  };

  // Mock localStorage and sessionStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
      _getStore: () => store,
      _reset: () => { store = {}; }
    };
  })();

  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
      _reset: () => { store = {}; }
    };
  })();

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };

    // Reset storage mocks
    localStorageMock._reset();
    sessionStorageMock._reset();

    // Mock global objects
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true
    });

    Object.defineProperty(globalThis, 'sessionStorage', {
      value: sessionStorageMock,
      configurable: true,
      writable: true
    });

    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with default config', async () => {
      const { LoggingService } = await import('../../services/LoggingService');

      const service = new LoggingService();

      expect(service).toBeInstanceOf(LoggingService);
    });

    it('should accept partial config override', async () => {
      const { LoggingService } = await import('../../services/LoggingService');

      const service = new LoggingService({
        minLevel: 'warn',
        enableConsole: true,
        enableRemote: false
      });

      expect(service).toBeInstanceOf(LoggingService);
    });

    it('should load existing logs from localStorage', async () => {
      const existingLogs = [
        { timestamp: new Date().toISOString(), level: 'info', message: 'Previous log' }
      ];
      localStorageMock.setItem('app_logs', JSON.stringify(existingLogs));

      const { LoggingService } = await import('../../services/LoggingService');

      const service = new LoggingService({ enableConsole: false });
      const logs = service.getLogs();

      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Log Methods', () => {
    it('should log debug messages', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'debug', enableConsole: true });

      service.debug('Debug test');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log info messages', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'info', enableConsole: true });

      service.info('Info test');

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log warn messages', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'info', enableConsole: true });

      service.warn('Warn test');

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error messages', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'info', enableConsole: true });

      service.error('Error test');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log fatal messages via console.error', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'info', enableConsole: true });

      service.fatal('Fatal test');

      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Log Level Filtering', () => {
    it('should not log messages below min level', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'warn', enableConsole: true });

      service.debug('Should not appear');
      service.info('Should not appear');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('should log messages at or above min level', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'warn', enableConsole: true });

      service.warn('Should appear');
      service.error('Should appear');

      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should respect level hierarchy: debug < info < warn < error < fatal', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'error', enableConsole: false });
      service.clearLogs();

      service.debug('Debug message');
      service.info('Info message');
      service.warn('Warn message');
      service.error('Error message');
      service.fatal('Fatal message');

      // Only error and fatal should be in the log buffer
      const logs = service.getLogs();
      expect(logs.length).toBe(2);
      expect(logs[0].level).toBe('error');
      expect(logs[1].level).toBe('fatal');
    });
  });

  describe('Data Sanitization', () => {
    it('should redact password fields', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        minLevel: 'info',
        enableConsole: true,
        sanitizeData: true
      });

      service.info('Test', { password: 'secret123' });

      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect((lastLog.data as any).password).toBe('[REDACTED]');
    });

    it('should redact token fields', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ sanitizeData: true });

      service.info('Test', { accessToken: 'abc123xyz' });

      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect((lastLog.data as any).accessToken).toBe('[REDACTED]');
    });

    it('should redact api_key fields', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ sanitizeData: true });

      service.info('Test', { api_key: 'sk_live_123456' });

      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect((lastLog.data as any).api_key).toBe('[REDACTED]');
    });

    it('should redact credential fields', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ sanitizeData: true });

      service.info('Test', { userCredential: 'secret' });

      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect((lastLog.data as any).userCredential).toBe('[REDACTED]');
    });

    it('should redact long base64-like strings', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ sanitizeData: true });

      const longCredential = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWI';
      service.info('Test', longCredential);

      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect(lastLog.data).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive data', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ sanitizeData: true });

      service.info('Test', { username: 'john', email: 'john@example.com' });

      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect((lastLog.data as any).username).toBe('john');
      expect((lastLog.data as any).email).toBe('john@example.com');
    });

    it('should handle nested objects', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ sanitizeData: true });

      service.info('Test', {
        user: {
          name: 'John',
          auth: { password: 'secret' }
        }
      });

      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect((lastLog.data as any).user.name).toBe('John');
      expect((lastLog.data as any).user.auth).toBe('[REDACTED]');
    });

    it('should not sanitize when disabled', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ sanitizeData: false });

      service.info('Test', { password: 'visible' });

      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect((lastLog.data as any).password).toBe('visible');
    });
  });

  describe('localStorage Persistence', () => {
    it('should save logs to localStorage', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableLocalStorage: true, enableConsole: false });

      service.info('Stored log');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('app_logs', expect.any(String));
    });

    it('should respect maxLocalStorageEntries limit', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        enableLocalStorage: true,
        maxLocalStorageEntries: 5,
        enableConsole: false
      });

      // Log more than max entries
      for (let i = 0; i < 10; i++) {
        service.info(`Log ${i}`);
      }

      const storedLogs = JSON.parse(localStorageMock._getStore()['app_logs']);
      expect(storedLogs.length).toBeLessThanOrEqual(5);
    });

    it('should not write to localStorage when disabled', async () => {
      localStorageMock._reset();
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableLocalStorage: false, enableConsole: false });

      service.info('Not stored');

      // setItem was called during construction to load logs, but not for new logs
      const lastCall = localStorageMock.setItem.mock.calls.slice(-1)[0];
      expect(lastCall).toBeUndefined();
    });
  });

  describe('getLogs()', () => {
    it('should return all logs', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });

      service.info('Log 1');
      service.warn('Log 2');
      service.error('Log 3');

      const logs = service.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by level', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'info', enableConsole: false });
      service.clearLogs();

      service.info('Info log');
      service.warn('Warn log');
      service.error('Error log');

      const errorLogs = service.getLogs({ level: 'error' });
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].level).toBe('error');
    });

    it('should filter by context', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      service.info('API log', {}, 'api');
      service.info('UI log', {}, 'ui');

      const apiLogs = service.getLogs({ context: 'api' });
      expect(apiLogs.length).toBe(1);
      expect(apiLogs[0].context).toBe('api');
    });

    it('should filter by date range', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const twoHoursAgo = new Date(now.getTime() - 7200000);

      service.info('Log 1');

      const logs = service.getLogs({
        startDate: oneHourAgo,
        endDate: now
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect limit parameter', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      for (let i = 0; i < 10; i++) {
        service.info(`Log ${i}`);
      }

      const logs = service.getLogs({ limit: 3 });
      expect(logs.length).toBe(3);
    });
  });

  describe('clearLogs()', () => {
    it('should clear log buffer', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });

      service.info('Log 1');
      service.info('Log 2');

      service.clearLogs();

      expect(service.getLogs().length).toBe(0);
    });

    it('should remove logs from localStorage', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableLocalStorage: true, enableConsole: false });

      service.info('Stored log');
      service.clearLogs();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('app_logs');
    });
  });

  describe('exportLogs()', () => {
    it('should return logs as JSON string', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      service.info('Export test');

      const exported = service.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('should format JSON with indentation', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      service.info('Test');

      const exported = service.exportLogs();

      expect(exported).toContain('\n');
    });
  });

  describe('updateConfig()', () => {
    it('should update configuration', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'info', enableConsole: true });

      // Log at debug level - should not appear
      service.debug('Before update');
      expect(consoleSpy.log).not.toHaveBeenCalled();

      // Update min level
      service.updateConfig({ minLevel: 'debug' });

      // Now debug should appear
      service.debug('After update');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should merge with existing config', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        minLevel: 'info',
        enableConsole: true,
        sanitizeData: true
      });

      // Update only one property
      service.updateConfig({ minLevel: 'warn' });

      // Other properties should remain
      service.warn('Test', { password: 'secret' });
      const logs = service.getLogs();
      const lastLog = logs[logs.length - 1];
      expect((lastLog.data as any).password).toBe('[REDACTED]'); // sanitizeData still true
    });
  });

  describe('destroy()', () => {
    it('should clear log buffers', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });

      service.info('Log before destroy');
      service.destroy();

      expect(service.getLogs().length).toBe(0);
    });

    it('should log cleanup message', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });

      service.destroy();

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('LoggingService destroyed')
      );
    });
  });

  describe('Performance Timer', () => {
    it('should create a timer that logs duration', async () => {
      // Mock performance.now
      const performanceMock = {
        now: vi.fn()
          .mockReturnValueOnce(100)
          .mockReturnValueOnce(250)
      };
      vi.stubGlobal('performance', performanceMock);

      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'debug', enableConsole: false });
      service.clearLogs();

      const endTimer = service.startTimer('test-operation');
      endTimer();

      const logs = service.getLogs();
      const timerLog = logs.find(l => l.message.includes('Performance: test-operation'));
      expect(timerLog).toBeDefined();
      expect(timerLog?.context).toBe('performance');
    });

    it('should return duration in milliseconds', async () => {
      const performanceMock = {
        now: vi.fn()
          .mockReturnValueOnce(1000)
          .mockReturnValueOnce(1150)
      };
      vi.stubGlobal('performance', performanceMock);

      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ minLevel: 'debug', enableConsole: false });
      service.clearLogs();

      const endTimer = service.startTimer('api-call');
      endTimer();

      const logs = service.getLogs();
      const timerLog = logs.find(l => l.message.includes('api-call'));
      expect((timerLog?.data as any).duration).toContain('150');
    });
  });

  describe('Structured Logging Helpers', () => {
    describe('logApiCall()', () => {
      it('should log API call with method and URL', async () => {
        const { LoggingService } = await import('../../services/LoggingService');
        const service = new LoggingService({ enableConsole: false });
        service.clearLogs();

        service.logApiCall('GET', '/api/users');

        const logs = service.getLogs();
        const apiLog = logs.find(l => l.context === 'api');
        expect(apiLog).toBeDefined();
        expect((apiLog?.data as any).method).toBe('GET');
        expect((apiLog?.data as any).url).toBe('/api/users');
      });

      it('should include status when provided', async () => {
        const { LoggingService } = await import('../../services/LoggingService');
        const service = new LoggingService({ enableConsole: false });
        service.clearLogs();

        service.logApiCall('POST', '/api/users', 201);

        const logs = service.getLogs();
        const apiLog = logs.find(l => l.context === 'api');
        expect((apiLog?.data as any).status).toBe(201);
      });

      it('should include duration when provided', async () => {
        const { LoggingService } = await import('../../services/LoggingService');
        const service = new LoggingService({ enableConsole: false });
        service.clearLogs();

        service.logApiCall('GET', '/api/users', 200, 150);

        const logs = service.getLogs();
        const apiLog = logs.find(l => l.context === 'api');
        expect((apiLog?.data as any).duration).toBe('150ms');
      });
    });

    describe('logUserAction()', () => {
      it('should log user action with action name', async () => {
        const { LoggingService } = await import('../../services/LoggingService');
        const service = new LoggingService({ enableConsole: false });
        service.clearLogs();

        service.logUserAction('button_click');

        const logs = service.getLogs();
        const actionLog = logs.find(l => l.context === 'user-action');
        expect(actionLog).toBeDefined();
        expect((actionLog?.data as any).action).toBe('button_click');
      });

      it('should include details when provided', async () => {
        const { LoggingService } = await import('../../services/LoggingService');
        const service = new LoggingService({ enableConsole: false });
        service.clearLogs();

        service.logUserAction('form_submit', { formId: 'login', valid: true });

        const logs = service.getLogs();
        const actionLog = logs.find(l => l.context === 'user-action');
        expect((actionLog?.data as any).formId).toBe('login');
        expect((actionLog?.data as any).valid).toBe(true);
      });
    });

    describe('logStateChange()', () => {
      it('should log state change with component name', async () => {
        const { LoggingService } = await import('../../services/LoggingService');
        const service = new LoggingService({ minLevel: 'debug', enableConsole: false });
        service.clearLogs();

        service.logStateChange('WorkflowEditor', { nodeCount: 5 });

        const logs = service.getLogs();
        const stateLog = logs.find(l => l.context === 'state');
        expect(stateLog).toBeDefined();
        expect((stateLog?.data as any).component).toBe('WorkflowEditor');
        expect((stateLog?.data as any).change).toEqual({ nodeCount: 5 });
      });
    });
  });

  describe('Session Tracking', () => {
    it('should generate session ID', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      service.info('Test log');

      const logs = service.getLogs();
      expect(logs[0].sessionId).toBeDefined();
      expect(logs[0].sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should use same session ID for all logs', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      service.info('Log 1');
      service.info('Log 2');
      service.info('Log 3');

      const logs = service.getLogs();
      const sessionIds = logs.map(l => l.sessionId);
      expect(new Set(sessionIds).size).toBe(1);
    });

    it('should store session ID in sessionStorage', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });

      service.info('Test');

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'session_id',
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
      );
    });
  });

  describe('Log Entry Structure', () => {
    it('should have correct timestamp', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      const before = new Date();
      service.info('Test');
      const after = new Date();

      const logs = service.getLogs();
      const logTime = new Date(logs[0].timestamp);
      expect(logTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(logTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include context when provided', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({ enableConsole: false });
      service.clearLogs();

      service.info('Test', { key: 'value' }, 'my-context');

      const logs = service.getLogs();
      expect(logs[0].context).toBe('my-context');
    });

    it('should include stack trace for errors', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        enableConsole: false,
        includeStackTrace: true
      });
      service.clearLogs();

      service.error('Test error');

      const logs = service.getLogs();
      expect(logs[0].stack).toBeDefined();
      expect(logs[0].stack).toContain('Error');
    });

    it('should include stack trace for fatal', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        enableConsole: false,
        includeStackTrace: true
      });
      service.clearLogs();

      service.fatal('Test fatal');

      const logs = service.getLogs();
      expect(logs[0].stack).toBeDefined();
    });

    it('should not include stack trace when disabled', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        enableConsole: false,
        includeStackTrace: false
      });
      service.clearLogs();

      service.error('Test error');

      const logs = service.getLogs();
      expect(logs[0].stack).toBeUndefined();
    });
  });

  describe('Log Buffer Limits', () => {
    it('should limit buffer to 10000 entries', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        enableConsole: false,
        enableLocalStorage: false
      });
      service.clearLogs();

      // Log 10005 entries
      for (let i = 0; i < 10005; i++) {
        service.info(`Log ${i}`);
      }

      const logs = service.getLogs();
      expect(logs.length).toBe(10000);
    });

    it('should remove oldest entries when buffer is full', async () => {
      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        enableConsole: false,
        enableLocalStorage: false
      });
      service.clearLogs();

      // Log 10002 entries
      for (let i = 0; i < 10002; i++) {
        service.info(`Log ${i}`);
      }

      const logs = service.getLogs();
      // First two should have been removed
      expect(logs[0].message).toBe('Log 2');
    });
  });

  describe('Remote Logging', () => {
    it('should queue logs for remote when enabled', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        enableConsole: false,
        enableRemote: true,
        remoteEndpoint: 'https://logs.example.com/api/logs'
      });

      // Error triggers immediate flush
      service.error('Test error');

      // Wait for async flush
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fetchMock).toHaveBeenCalledWith(
        'https://logs.example.com/api/logs',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should not send remote logs when disabled', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);

      const { LoggingService } = await import('../../services/LoggingService');
      const service = new LoggingService({
        enableConsole: false,
        enableRemote: false
      });

      service.error('Test error');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('advancedLogger Export', () => {
    it('should export advancedLogger instance', async () => {
      const { advancedLogger } = await import('../../services/LoggingService');

      expect(advancedLogger).toBeDefined();
      expect(typeof advancedLogger.info).toBe('function');
      expect(typeof advancedLogger.error).toBe('function');
      expect(typeof advancedLogger.getLogs).toBe('function');
    });
  });

  describe('Re-exports from SimpleLogger', () => {
    it('should re-export logger from SimpleLogger', async () => {
      const { logger } = await import('../../services/LoggingService');

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should re-export convenience functions', async () => {
      const { debug, info, warn, error, fatal } = await import('../../services/LoggingService');

      expect(typeof debug).toBe('function');
      expect(typeof info).toBe('function');
      expect(typeof warn).toBe('function');
      expect(typeof error).toBe('function');
      expect(typeof fatal).toBe('function');
    });
  });
});
