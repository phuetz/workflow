/**
 * Browser-compatible logging service with console-based output
 * Provides centralized logging for the entire application
 */
class LoggingService {
  constructor() {
    this.performanceTimers = new Map();
    this.requestCounter = 0;
    this.errorCounter = 0;
    this.logLevel = 'info';
    this.enabled = true;
    this.initialize();
  }

  /**
   * Initialize the logger
   */
  initialize() {
    // Use import.meta.env for Vite environment variables
    const logLevel = import.meta?.env?.VITE_LOG_LEVEL || 'info';
    this.logLevel = logLevel;

    // Detect if running in browser or Node.js
    this.isBrowser = typeof window !== 'undefined';

    // Log initialization
    this.info('LoggingService initialized', {
      level: logLevel,
      environment: import.meta?.env?.MODE || 'development',
      platform: this.isBrowser ? 'browser' : 'node'
    });
  }

  /**
   * Check if log level is enabled
   */
  isLevelEnabled(level) {
    const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex <= currentLevelIndex;
  }

  /**
   * Format log message with metadata
   */
  formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaString}`;
  }

  /**
   * Log info level message
   */
  info(message, meta = {}) {
    if (!this.enabled || !this.isLevelEnabled('info')) return;

    const enrichedMeta = this.enrichMetadata(meta);
    if (this.isBrowser) {
      console.info(`ℹ️ ${message}`, enrichedMeta);
    } else {
      console.log(this.formatLog('info', message, enrichedMeta));
    }
  }

  /**
   * Log warning level message
   */
  warn(message, meta = {}) {
    if (!this.enabled || !this.isLevelEnabled('warn')) return;

    const enrichedMeta = this.enrichMetadata(meta);
    console.warn(`⚠️ ${message}`, enrichedMeta);
  }

  /**
   * Log error level message
   */
  error(message, error = null, meta = {}) {
    if (!this.enabled || !this.isLevelEnabled('error')) return;

    this.errorCounter++;

    const errorMeta = {
      ...this.enrichMetadata(meta),
      errorCount: this.errorCounter
    };

    if (error instanceof Error) {
      errorMeta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      };
    } else if (error) {
      errorMeta.error = error;
    }

    console.error(`❌ ${message}`, errorMeta);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }

  /**
   * Log debug level message
   */
  debug(message, meta = {}) {
    if (!this.enabled || !this.isLevelEnabled('debug')) return;

    const enrichedMeta = this.enrichMetadata(meta);
    if (this.isBrowser) {
      console.debug(`🔍 ${message}`, enrichedMeta);
    } else {
      console.log(this.formatLog('debug', message, enrichedMeta));
    }
  }

  /**
   * Log verbose level message
   */
  verbose(message, meta = {}) {
    if (!this.enabled || !this.isLevelEnabled('verbose')) return;

    const enrichedMeta = this.enrichMetadata(meta);
    if (this.isBrowser) {
      console.debug(`📝 ${message}`, enrichedMeta);
    } else {
      console.log(this.formatLog('verbose', message, enrichedMeta));
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(label, meta = {}) {
    const timer = {
      label,
      start: Date.now(),
      meta
    };

    this.performanceTimers.set(label, timer);

    this.debug(`Timer started: ${label}`, meta);

    return timer;
  }

  /**
   * End a performance timer and log the duration
   */
  endTimer(label) {
    const timer = this.performanceTimers.get(label);

    if (!timer) {
      this.warn(`Timer not found: ${label}`);
      return null;
    }

    const duration = Date.now() - timer.start;

    this.performanceTimers.delete(label);

    this.info(`Performance: ${label}`, {
      ...timer.meta,
      duration_ms: duration,
      duration_seconds: (duration / 1000).toFixed(2)
    });

    return duration;
  }

  /**
   * Log an audit event
   */
  audit(action, userId, details = {}) {
    this.info(`AUDIT: ${action}`, {
      type: 'audit',
      action,
      userId,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
      ...details
    });
  }

  /**
   * Log a metric
   */
  metric(name, value, tags = {}) {
    this.info(`METRIC: ${name}`, {
      type: 'metric',
      metric: name,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  /**
   * Express middleware for request logging
   * Note: This is for backend compatibility only, no-op in browser
   */
  requestLogger() {
    if (this.isBrowser) {
      // Return no-op middleware for browser compatibility
      return (req, res, next) => next && next();
    }

    return (req, res, next) => {
      const requestId = ++this.requestCounter;
      const start = Date.now();

      // Attach request ID to request object
      req.requestId = requestId;

      // Log request start
      this.debug('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent')
      });

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - start;

        const logData = {
          requestId,
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration_ms: duration,
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent')
        };

        // Choose log level based on status code
        if (res.statusCode >= 500) {
          this.error('Request failed', null, logData);
        } else if (res.statusCode >= 400) {
          this.warn('Request client error', logData);
        } else {
          this.info('Request completed', logData);
        }

        // Log performance metric
        this.metric('http_request_duration', duration, {
          method: req.method,
          route: req.route?.path || req.url,
          status: res.statusCode
        });
      });

      next();
    };
  }

  /**
   * Express error handler middleware
   * Note: This is for backend compatibility only, no-op in browser
   */
  errorLogger() {
    if (this.isBrowser) {
      // Return no-op middleware for browser compatibility
      return (err, req, res, next) => next && next(err);
    }

    return (err, req, res, next) => {
      this.error('Request error', err, {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent')
      });

      next(err);
    };
  }

  /**
   * Enrich metadata with common fields
   */
  enrichMetadata(meta) {
    const enriched = {
      ...meta,
      timestamp: Date.now()
    };

    // Add browser-specific or node-specific metadata
    if (this.isBrowser) {
      enriched.userAgent = navigator?.userAgent;
      enriched.url = window?.location?.href;
    } else {
      // Only access process in Node.js environment
      if (typeof process !== 'undefined') {
        enriched.pid = process.pid;
        enriched.hostname = process.env.HOSTNAME || 'unknown';
      }
    }

    return enriched;
  }

  /**
   * Flush all pending logs
   */
  async flush() {
    // In browser with console, nothing to flush
    return Promise.resolve();
  }

  /**
   * Get current statistics
   */
  getStats() {
    const stats = {
      requestCount: this.requestCounter,
      errorCount: this.errorCounter,
      activeTimers: this.performanceTimers.size
    };

    // Add uptime only in Node.js
    if (!this.isBrowser && typeof process !== 'undefined') {
      stats.uptime = process.uptime();
    }

    return stats;
  }
}

// Create singleton instance
const loggingService = new LoggingService();

// Export both the instance and the class
// Also export a named `logger` alias for compatibility with existing imports
export default loggingService;
export { LoggingService };
export const logger = loggingService;
