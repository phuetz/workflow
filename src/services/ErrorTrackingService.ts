/**
 * Error Tracking Service
 *
 * Provides integration with external error tracking services
 * such as Sentry, Rollbar, Datadog, etc.
 *
 * Usage:
 *   errorTracking.captureError(error, { context: 'ComponentName' });
 *   errorTracking.captureMessage('Something unexpected happened', 'warning');
 */

import { logger } from './SimpleLogger';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  workflowId?: string;
  nodeId?: string;
  executionId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface UserInfo {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: string;
  userAgent: string;
  url: string;
  user?: UserInfo;
}

/**
 * Error Tracking Provider interface
 * Implement this to add new error tracking services
 */
export interface ErrorTrackingProvider {
  name: string;
  captureError(error: Error, context?: ErrorContext): void;
  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): void;
  setUser(user: UserInfo | null): void;
  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void;
}

/**
 * Console Provider (for development)
 */
class ConsoleProvider implements ErrorTrackingProvider {
  name = 'console';

  captureError(error: Error, context?: ErrorContext): void {
    console.group(`[ErrorTracking] ${error.name}: ${error.message}`);
    console.error('Stack:', error.stack);
    if (context) {
      console.info('Context:', context);
    }
    console.groupEnd();
  }

  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): void {
    const logMethod = severity === 'error' || severity === 'fatal'
      ? console.error
      : severity === 'warning'
        ? console.warn
        : console.log;

    logMethod(`[ErrorTracking] [${severity.toUpperCase()}] ${message}`, context || '');
  }

  setUser(user: UserInfo | null): void {
    console.log('[ErrorTracking] User set:', user?.id || 'anonymous');
  }

  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    console.log(`[ErrorTracking] Breadcrumb: [${category}] ${message}`, data || '');
  }
}

/**
 * HTTP Provider (sends errors to a custom endpoint)
 */
class HTTPProvider implements ErrorTrackingProvider {
  name = 'http';
  private endpoint: string;
  private apiKey?: string;
  private user: UserInfo | null = null;
  private breadcrumbs: Array<{ message: string; category: string; data?: Record<string, unknown>; timestamp: string }> = [];

  constructor(endpoint: string, apiKey?: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async captureError(error: Error, context?: ErrorContext): Promise<void> {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      severity: 'error',
      context: context || {},
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      user: this.user || undefined,
    };

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          type: 'error',
          report,
          breadcrumbs: this.breadcrumbs.slice(-20), // Last 20 breadcrumbs
        }),
      });
    } catch (e) {
      logger.error('[ErrorTracking] Failed to send error report', e);
    }
  }

  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          type: 'message',
          message,
          severity,
          context,
          timestamp: new Date().toISOString(),
          user: this.user,
        }),
      });
    } catch (e) {
      logger.error('[ErrorTracking] Failed to send message', e);
    }
  }

  setUser(user: UserInfo | null): void {
    this.user = user;
  }

  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    this.breadcrumbs.push({
      message,
      category,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 100 breadcrumbs
    if (this.breadcrumbs.length > 100) {
      this.breadcrumbs = this.breadcrumbs.slice(-100);
    }
  }
}

/**
 * Sentry-like Provider Stub
 * Replace with actual Sentry SDK integration when needed
 */
class SentryProvider implements ErrorTrackingProvider {
  name = 'sentry';
  private dsn: string;
  private initialized = false;

  constructor(dsn: string) {
    this.dsn = dsn;
    this.initialize();
  }

  private initialize(): void {
    // In a real implementation, you would initialize Sentry here:
    // Sentry.init({ dsn: this.dsn, ... });

    if (this.dsn) {
      logger.info('[ErrorTracking] Sentry provider initialized with DSN');
      this.initialized = true;
    }
  }

  captureError(error: Error, context?: ErrorContext): void {
    if (!this.initialized) return;

    // In a real implementation:
    // Sentry.captureException(error, { extra: context });

    logger.debug('[Sentry] Would capture error', { message: error.message, context, component: 'ErrorTracking' });
  }

  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): void {
    if (!this.initialized) return;

    // In a real implementation:
    // Sentry.captureMessage(message, severity);

    logger.debug('[Sentry] Would capture message', { message, severity, context, component: 'ErrorTracking' });
  }

  setUser(user: UserInfo | null): void {
    if (!this.initialized) return;

    // In a real implementation:
    // Sentry.setUser(user);

    logger.debug('[Sentry] Would set user', { userId: user?.id, component: 'ErrorTracking' });
  }

  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    if (!this.initialized) return;

    // In a real implementation:
    // Sentry.addBreadcrumb({ message, category, data });

    logger.debug('[Sentry] Would add breadcrumb', { message, category, component: 'ErrorTracking' });
  }
}

/**
 * Main Error Tracking Service
 */
class ErrorTrackingService {
  private providers: ErrorTrackingProvider[] = [];
  private enabled = true;
  private localStorageKey = 'app_errors';
  private maxLocalErrors = 50;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Always add console provider in development
    if (process.env.NODE_ENV === 'development') {
      this.providers.push(new ConsoleProvider());
    }

    // Add Sentry if DSN is configured
    const sentryDsn = process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN;
    if (sentryDsn) {
      this.providers.push(new SentryProvider(sentryDsn));
    }

    // Add HTTP provider if endpoint is configured
    const errorEndpoint = process.env.VITE_ERROR_TRACKING_ENDPOINT || process.env.ERROR_TRACKING_ENDPOINT;
    const errorApiKey = process.env.VITE_ERROR_TRACKING_API_KEY || process.env.ERROR_TRACKING_API_KEY;
    if (errorEndpoint) {
      this.providers.push(new HTTPProvider(errorEndpoint, errorApiKey));
    }
  }

  /**
   * Add a custom error tracking provider
   */
  addProvider(provider: ErrorTrackingProvider): void {
    this.providers.push(provider);
  }

  /**
   * Enable or disable error tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Capture an error with optional context
   */
  captureError(error: Error, context?: ErrorContext): void {
    if (!this.enabled) return;

    // Store in localStorage for debugging
    this.storeLocalError(error, context);

    // Send to all providers
    for (const provider of this.providers) {
      try {
        provider.captureError(error, context);
      } catch (e) {
        logger.error(`[ErrorTracking] Provider ${provider.name} failed`, e, { provider: provider.name });
      }
    }
  }

  /**
   * Capture a message with severity level
   */
  captureMessage(message: string, severity: ErrorSeverity = 'info', context?: ErrorContext): void {
    if (!this.enabled) return;

    for (const provider of this.providers) {
      try {
        provider.captureMessage(message, severity, context);
      } catch (e) {
        logger.error(`[ErrorTracking] Provider ${provider.name} failed`, e, { provider: provider.name });
      }
    }
  }

  /**
   * Set the current user for error context
   */
  setUser(user: UserInfo | null): void {
    for (const provider of this.providers) {
      try {
        provider.setUser(user);
      } catch (e) {
        logger.error(`[ErrorTracking] Provider ${provider.name} failed to set user`, e, { provider: provider.name });
      }
    }
  }

  /**
   * Add a breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    if (!this.enabled) return;

    for (const provider of this.providers) {
      try {
        provider.addBreadcrumb(message, category, data);
      } catch (e) {
        logger.error(`[ErrorTracking] Provider ${provider.name} failed to add breadcrumb`, e, { provider: provider.name });
      }
    }
  }

  /**
   * Store error in localStorage for local debugging
   */
  private storeLocalError(error: Error, context?: ErrorContext): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const errors = JSON.parse(localStorage.getItem(this.localStorageKey) || '[]');
      errors.push({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'server',
      });

      // Keep only recent errors
      if (errors.length > this.maxLocalErrors) {
        errors.splice(0, errors.length - this.maxLocalErrors);
      }

      localStorage.setItem(this.localStorageKey, JSON.stringify(errors));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Get locally stored errors (for debugging)
   */
  getLocalErrors(): Array<{ message: string; stack?: string; context?: ErrorContext; timestamp: string; url: string }> {
    if (typeof localStorage === 'undefined') return [];

    try {
      return JSON.parse(localStorage.getItem(this.localStorageKey) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear locally stored errors
   */
  clearLocalErrors(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.localStorageKey);
  }
}

// Singleton export
export const errorTracking = new ErrorTrackingService();

export default errorTracking;
