/**
 * Simple Logger - No dependencies
 * Used to avoid circular dependencies during bundling
 *
 * Security: Automatically sanitizes sensitive data from logs
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface SimpleLoggerInterface {
  debug: (message: string, data?: unknown, context?: string) => void;
  info: (message: string, data?: unknown, context?: string) => void;
  warn: (message: string, data?: unknown, context?: string) => void;
  error: (message: string, data?: unknown, context?: string) => void;
  fatal: (message: string, data?: unknown, context?: string) => void;
  metric: (name: string, value: number, unit?: string, tags?: Record<string, string>) => void;
  setLevel: (level: LogLevel) => void;
}

/**
 * Patterns for detecting sensitive field names
 * Matches various naming conventions (camelCase, snake_case, kebab-case)
 */
const SENSITIVE_FIELD_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /bearer/i,
  /jwt/i,
  /session/i,
  /cookie/i,
  /private/i,
  /credential/i,
  /ssn/i,
  /credit/i,
  /cvv/i,
  /pin/i,
  /key[_-]?id/i,
  /access[_-]?key/i,
  /secret[_-]?key/i,
  /encryption/i,
  /signature/i,
  /cert/i,
  /x[_-]?api/i,
  /oauth/i,
  /refresh/i,
];

/**
 * Patterns for detecting sensitive values (tokens, API keys, etc.)
 */
const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /^Bearer\s+.+$/i,       // Bearer tokens
  /^Basic\s+.+$/i,        // Basic auth
  /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,  // JWT tokens
  /^[A-Za-z0-9]{32,}$/,   // Long alphanumeric strings (potential API keys)
  /^sk[_-]?[A-Za-z0-9]+$/,  // Stripe-style secret keys
  /^pk[_-]?[A-Za-z0-9]+$/,  // Public keys that may still be sensitive
  /^ghp_[A-Za-z0-9]+$/,     // GitHub personal access tokens
  /^xox[pbar]-[A-Za-z0-9-]+$/, // Slack tokens
];

/**
 * Check if a field name matches any sensitive pattern
 */
function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Check if a value looks like a sensitive token or secret
 */
function isSensitiveValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return SENSITIVE_VALUE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Recursively sanitize an object to redact sensitive data
 * Handles nested objects and arrays
 */
function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return isSensitiveValue(data) ? '[REDACTED]' : data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

const formatMessage = (level: string, message: string, data?: unknown): string => {
  const timestamp = new Date().toISOString();
  // Sanitize data before logging to prevent secrets from appearing in logs
  const sanitizedData = data !== undefined ? sanitizeData(data) : undefined;
  const dataStr = sanitizedData ? ` ${JSON.stringify(sanitizedData)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
};

let currentLogLevel: LogLevel = 'info';

export const logger: SimpleLoggerInterface = {
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('DEBUG', message, data));
    }
  },
  info: (message: string, data?: unknown) => {
    console.info(formatMessage('INFO', message, data));
  },
  warn: (message: string, data?: unknown) => {
    console.warn(formatMessage('WARN', message, data));
  },
  error: (message: string, data?: unknown) => {
    console.error(formatMessage('ERROR', message, data));
  },
  fatal: (message: string, data?: unknown) => {
    console.error(formatMessage('FATAL', message, data));
  },
  metric: (name: string, value: number, unit?: string, tags?: Record<string, string>) => {
    const unitStr = unit ? ` ${unit}` : '';
    console.info(formatMessage('METRIC', `${name}=${value}${unitStr}`, tags));
  },
  setLevel: (level: LogLevel) => {
    currentLogLevel = level;
  }
};

// Convenience exports
export const debug = logger.debug;
export const info = logger.info;
export const warn = logger.warn;
export const error = logger.error;
export const fatal = logger.fatal;

// Export sanitization utilities for use by other modules
export { sanitizeData, isSensitiveField, isSensitiveValue, SENSITIVE_FIELD_PATTERNS, SENSITIVE_VALUE_PATTERNS };

export default logger;
