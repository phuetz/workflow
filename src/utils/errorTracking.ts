/**
 * Error Tracking & Monitoring
 * Centralized error handling and reporting system
 */

export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXECUTION = 'execution',
  WORKFLOW = 'workflow',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  userId?: string;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  url?: string;
  userAgent?: string;
  timestamp: Date;
  [key: string]: any;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

class ErrorTracker {
  private errors: Map<string, ErrorReport> = new Map();
  private listeners: Array<(error: ErrorReport) => void> = [];
  private sentryEnabled = false;

  constructor() {
    this.initializeSentry();
    this.setupGlobalHandlers();
  }

  private initializeSentry() {
    if (import.meta.env.VITE_SENTRY_DSN && typeof window !== 'undefined') {
      // Sentry initialization would go here
      this.sentryEnabled = true;
    }
  }

  private setupGlobalHandlers() {
    if (typeof window === 'undefined') return;

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          category: ErrorCategory.UNKNOWN,
          severity: ErrorSeverity.ERROR,
          context: { type: 'unhandledRejection' }
        }
      );
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.ERROR,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
  }

  /**
   * Generate unique fingerprint for error grouping
   */
  private generateFingerprint(error: Error, category: ErrorCategory, context: Partial<ErrorContext>): string {
    const parts = [
      error.name,
      error.message,
      category,
      context.nodeId || '',
      context.workflowId || ''
    ];

    return parts.join('::');
  }

  /**
   * Capture and report an error
   */
  captureError(
    error: Error,
    options?: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Partial<ErrorContext>;
    }
  ): string {
    const category = options?.category || this.categorizeError(error);
    const severity = options?.severity || this.determineSeverity(error, category);

    const context: ErrorContext = {
      ...options?.context,
      timestamp: new Date(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };

    const fingerprint = this.generateFingerprint(error, category, context);
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if we've seen this error before
    const existing = this.errors.get(fingerprint);

    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
      this.errors.set(fingerprint, existing);
      this.notifyListeners(existing);
      return existing.id;
    }

    // Create new error report
    const report: ErrorReport = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      category,
      severity,
      context,
      fingerprint,
      count: 1,
      firstSeen: new Date(),
      lastSeen: new Date()
    };

    this.errors.set(fingerprint, report);
    this.notifyListeners(report);
    this.sendToExternalServices(error, report);
    this.logToConsole(report);

    return errorId;
  }

  /**
   * Categorize error based on type and message
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('database') || message.includes('query')) {
      return ErrorCategory.DATABASE;
    }
    if (message.includes('workflow') || message.includes('execution')) {
      return ErrorCategory.EXECUTION;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical categories
    if (category === ErrorCategory.DATABASE || category === ErrorCategory.AUTHENTICATION) {
      return ErrorSeverity.CRITICAL;
    }

    // Authorization and execution errors are high severity
    if (category === ErrorCategory.AUTHORIZATION || category === ErrorCategory.EXECUTION) {
      return ErrorSeverity.ERROR;
    }

    // Validation and network errors are warnings
    if (category === ErrorCategory.VALIDATION || category === ErrorCategory.NETWORK) {
      return ErrorSeverity.WARNING;
    }

    return ErrorSeverity.ERROR;
  }

  /**
   * Send error to external monitoring services
   */
  private sendToExternalServices(error: Error, report: ErrorReport) {
    // Send to Sentry
    if (this.sentryEnabled && window.Sentry) {
      window.Sentry.captureException(error, {
        level: report.severity as any,
        tags: {
          category: report.category
        },
        contexts: {
          custom: report.context
        },
        fingerprint: [report.fingerprint]
      });
    }

    // Send to custom logging endpoint
    if (import.meta.env.VITE_ERROR_LOGGING_ENDPOINT) {
      fetch(import.meta.env.VITE_ERROR_LOGGING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          report
        })
      }).catch(() => {
        // Silently fail - don't want to create error loop
      });
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(report: ErrorReport) {
    if (import.meta.env.DEV) {
      const style = this.getConsoleStyle(report.severity);
      console.groupCollapsed(
        `%c[${report.severity.toUpperCase()}] ${report.category}: ${report.message}`,
        style
      );
      console.log('Error ID:', report.id);
      console.log('Fingerprint:', report.fingerprint);
      console.log('Context:', report.context);
      if (report.stack) {
        console.log('Stack trace:', report.stack);
      }
      console.groupEnd();
    }
  }

  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles = {
      [ErrorSeverity.DEBUG]: 'color: #888',
      [ErrorSeverity.INFO]: 'color: #0066cc',
      [ErrorSeverity.WARNING]: 'color: #ff9800; font-weight: bold',
      [ErrorSeverity.ERROR]: 'color: #f44336; font-weight: bold',
      [ErrorSeverity.CRITICAL]: 'color: #fff; background: #d32f2f; padding: 2px 4px; font-weight: bold'
    };
    return styles[severity];
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: ErrorReport) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(error: ErrorReport) {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorReport[] {
    return Array.from(this.errors.values());
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): ErrorReport[] {
    return this.getErrors().filter(e => e.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): ErrorReport[] {
    return this.getErrors().filter(e => e.severity === severity);
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors.clear();
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const errors = this.getErrors();
    return {
      total: errors.reduce((sum, e) => sum + e.count, 0),
      unique: errors.length,
      byCategory: Object.values(ErrorCategory).reduce((acc, cat) => ({
        ...acc,
        [cat]: this.getErrorsByCategory(cat).length
      }), {} as Record<ErrorCategory, number>),
      bySeverity: Object.values(ErrorSeverity).reduce((acc, sev) => ({
        ...acc,
        [sev]: this.getErrorsBySeverity(sev).length
      }), {} as Record<ErrorSeverity, number>)
    };
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

/**
 * Helper to wrap async functions with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Partial<ErrorContext>
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorTracker.captureError(
        error instanceof Error ? error : new Error(String(error)),
        { context }
      );
      throw error;
    }
  }) as T;
}

/**
 * Custom error classes
 */
export class WorkflowError extends Error {
  constructor(message: string, public workflowId: string, public nodeId?: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number, public url?: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Declare Sentry on window
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
    };
  }
}
