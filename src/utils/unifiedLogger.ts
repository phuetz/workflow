/**
 * Unified Logger Facade
 *
 * This module provides a single entry point for all logging operations.
 * It wraps the underlying logging implementations to ensure consistency.
 *
 * Usage:
 *   import { logger } from '@utils/unifiedLogger';
 *   logger.info('Message', { context: 'value' });
 *
 * Available methods:
 *   - logger.debug(message, meta?)
 *   - logger.info(message, meta?)
 *   - logger.warn(message, meta?)
 *   - logger.error(message, error?, meta?)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, error?: Error | unknown, meta?: LogMeta): void;
  child(meta: LogMeta): Logger;
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

/**
 * Get color code for log level (for terminal output)
 */
function getLevelColor(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
  };
  return colors[level];
}

const RESET = '\x1b[0m';

/**
 * Create a logger instance
 */
function createLogger(baseMeta: LogMeta = {}): Logger {
  const log = (level: LogLevel, message: string, meta?: LogMeta): void => {
    // Skip logging in test environment unless explicitly enabled
    if (isTest && !process.env.ENABLE_TEST_LOGGING) {
      return;
    }

    const fullMeta = { ...baseMeta, ...meta };
    const formattedMessage = formatMessage(level, message, Object.keys(fullMeta).length > 0 ? fullMeta : undefined);

    if (isDevelopment) {
      const color = getLevelColor(level);
      const output = `${color}${formattedMessage}${RESET}`;

      switch (level) {
        case 'debug':
           
          console.debug(output);
          break;
        case 'info':
           
          console.info(output);
          break;
        case 'warn':
           
          console.warn(output);
          break;
        case 'error':
           
          console.error(output);
          break;
      }
    } else {
      // Production: structured JSON output
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...fullMeta,
      };

       
      console.log(JSON.stringify(logEntry));
    }
  };

  return {
    debug(message: string, meta?: LogMeta): void {
      log('debug', message, meta);
    },

    info(message: string, meta?: LogMeta): void {
      log('info', message, meta);
    },

    warn(message: string, meta?: LogMeta): void {
      log('warn', message, meta);
    },

    error(message: string, error?: Error | unknown, meta?: LogMeta): void {
      const errorMeta: LogMeta = { ...meta };

      if (error instanceof Error) {
        errorMeta.error = {
          name: error.name,
          message: error.message,
          stack: isDevelopment ? error.stack : undefined,
        };
      } else if (error !== undefined) {
        errorMeta.error = String(error);
      }

      log('error', message, errorMeta);
    },

    child(meta: LogMeta): Logger {
      return createLogger({ ...baseMeta, ...meta });
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: string, meta?: LogMeta): Logger {
  return createLogger({ context, ...meta });
}

/**
 * Logger factory for specific modules
 */
export function getLogger(moduleName: string): Logger {
  return createLogger({ module: moduleName });
}

export default logger;
