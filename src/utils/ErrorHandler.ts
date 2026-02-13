/**
 * Error Handler Utility
 * Centralized error handling to reduce code duplication across the application
 */

import { logger } from '../services/SimpleLogger';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  FILE_SYSTEM = 'file_system',
  MEMORY = 'memory',
  TIMEOUT = 'timeout'
}

export interface ErrorContext {
  userId?: string;
  operationId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  method?: string;
  params?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ApplicationError {
  id: string;
  message: string;
  originalError?: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: number;
  stack?: string;
  userMessage?: string;
  retryable: boolean;
  actionable: boolean;
}

export class ErrorHandler {
  private static errorHistory: ApplicationError[] = [];
  private static maxHistorySize = 1000;
  private static errorListeners: Array<(error: ApplicationError) => void> = [];

  /**
   * Create and handle an application error
   */
  static handle(
    error: Error | string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext = {},
    options: {
      userMessage?: string;
      retryable?: boolean;
      actionable?: boolean;
      silent?: boolean;
    } = {}
  ): ApplicationError {
    const appError: ApplicationError = {
      id: this.generateErrorId(),
      message: typeof error === 'string' ? error : error.message,
      originalError: typeof error === 'object' ? error : undefined,
      category,
      severity,
      context,
      timestamp: Date.now(),
      stack: typeof error === 'object' ? error.stack : new Error().stack,
      userMessage: options.userMessage,
      retryable: options.retryable ?? this.isRetryableByDefault(category),
      actionable: options.actionable ?? this.isActionableByDefault(category, severity)
    };

    // Store in history
    this.addToHistory(appError);

    // Log the error
    if (!options.silent) {
      this.logError(appError);
    }

    // Notify listeners
    this.notifyListeners(appError);

    // Handle critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(appError);
    }

    return appError;
  }

  /**
   * Handle validation errors
   */
  static validation(
    message: string,
    context: ErrorContext = {},
    details?: Record<string, string[]>
  ): ApplicationError {
    return this.handle(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      { ...context, metadata: { ...context.metadata, validationDetails: details } },
      {
        userMessage: 'Please check your input and try again.',
        retryable: false,
        actionable: true
      }
    );
  }

  /**
   * Handle network errors
   */
  static network(
    error: Error,
    context: ErrorContext = {},
    endpoint?: string
  ): ApplicationError {
    return this.handle(
      error,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      { ...context, metadata: { ...context.metadata, endpoint } },
      {
        userMessage: 'Network error occurred. Please check your connection and try again.',
        retryable: true,
        actionable: true
      }
    );
  }

  /**
   * Handle authentication errors
   */
  static authentication(
    message: string,
    context: ErrorContext = {}
  ): ApplicationError {
    return this.handle(
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.HIGH,
      context,
      {
        userMessage: 'Authentication failed. Please log in again.',
        retryable: false,
        actionable: true
      }
    );
  }

  /**
   * Handle authorization errors
   */
  static authorization(
    message: string,
    context: ErrorContext = {},
    requiredPermissions?: string[]
  ): ApplicationError {
    return this.handle(
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      { ...context, metadata: { ...context.metadata, requiredPermissions } },
      {
        userMessage: 'You do not have permission to perform this action.',
        retryable: false,
        actionable: false
      }
    );
  }

  /**
   * Handle business logic errors
   */
  static businessLogic(
    message: string,
    context: ErrorContext = {},
    userMessage?: string
  ): ApplicationError {
    return this.handle(
      message,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      context,
      {
        userMessage: userMessage || 'An error occurred while processing your request.',
        retryable: false,
        actionable: true
      }
    );
  }

  /**
   * Handle system errors
   */
  static system(
    error: Error,
    context: ErrorContext = {}
  ): ApplicationError {
    return this.handle(
      error,
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      context,
      {
        userMessage: 'A system error occurred. Please try again later.',
        retryable: true,
        actionable: false
      }
    );
  }

  /**
   * Handle database errors
   */
  static database(
    error: Error,
    context: ErrorContext = {},
    query?: string
  ): ApplicationError {
    return this.handle(
      error,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      { ...context, metadata: { ...context.metadata, query } },
      {
        userMessage: 'A database error occurred. Please try again later.',
        retryable: true,
        actionable: false
      }
    );
  }

  /**
   * Handle timeout errors
   */
  static timeout(
    operation: string,
    context: ErrorContext = {},
    timeoutMs?: number
  ): ApplicationError {
    return this.handle(
      `Operation timeout: ${operation}`,
      ErrorCategory.TIMEOUT,
      ErrorSeverity.MEDIUM,
      { ...context, metadata: { ...context.metadata, operation, timeoutMs } },
      {
        userMessage: 'The operation took too long. Please try again.',
        retryable: true,
        actionable: true
      }
    );
  }

  /**
   * Handle external service errors
   */
  static externalService(
    error: Error,
    service: string,
    context: ErrorContext = {}
  ): ApplicationError {
    return this.handle(
      error,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.MEDIUM,
      { ...context, metadata: { ...context.metadata, service } },
      {
        userMessage: `External service (${service}) is temporarily unavailable. Please try again later.`,
        retryable: true,
        actionable: true
      }
    );
  }

  /**
   * Get error statistics
   */
  static getStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
    criticalErrors: number;
  } {
    const errorsByCategory: Record<ErrorCategory, number> = {} as Record<ErrorCategory, number>;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as Record<ErrorSeverity, number>;
    let recentErrors = 0;
    let criticalErrors = 0;
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    for (const error of this.errorHistory) {
      // Count by category
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      
      // Count by severity
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
      
      // Count recent errors
      if (error.timestamp > oneHourAgo) {
        recentErrors++;
      }
      
      // Count critical errors
      if (error.severity === ErrorSeverity.CRITICAL) {
        criticalErrors++;
      }
    }

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
      criticalErrors
    };
  }

  /**
   * Get recent errors
   */
  static getRecentErrors(limit = 50): ApplicationError[] {
    return this.errorHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear error history
   */
  static clearHistory(): void {
    this.errorHistory = [];
    logger.info('Error history cleared');
  }

  /**
   * Add error listener
   */
  static addListener(listener: (error: ApplicationError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  static removeListener(listener: (error: ApplicationError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Convert ApplicationError to user-friendly message
   */
  static toUserMessage(error: ApplicationError): string {
    if (error.userMessage) {
      return error.userMessage;
    }

    // Fallback user messages based on category
    switch (error.category) {
      case ErrorCategory.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorCategory.NETWORK:
        return 'Network error. Please check your connection.';
      case ErrorCategory.AUTHENTICATION:
        return 'Please log in to continue.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission for this action.';
      case ErrorCategory.TIMEOUT:
        return 'Operation timed out. Please try again.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  // Private helper methods
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static addToHistory(error: ApplicationError): void {
    this.errorHistory.push(error);
    
    // Trim history if it gets too large
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  private static logError(error: ApplicationError): void {
    const logData = {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      context: error.context,
      retryable: error.retryable,
      actionable: error.actionable
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`CRITICAL ERROR: ${error.message}`, logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error(`HIGH SEVERITY: ${error.message}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`MEDIUM SEVERITY: ${error.message}`, logData);
        break;
      case ErrorSeverity.LOW:
        logger.info(`LOW SEVERITY: ${error.message}`, logData);
        break;
    }
  }

  private static notifyListeners(error: ApplicationError): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (listenerError) {
        logger.error('Error in error listener', { listenerError });
      }
    }
  }

  private static handleCriticalError(error: ApplicationError): void {
    logger.error('CRITICAL ERROR DETECTED - System may be unstable', {
      errorId: error.id,
      context: error.context,
      message: error.message
    });

    // In a real application, you might want to:
    // - Send alerts to monitoring systems
    // - Trigger automatic recovery procedures
    // - Notify administrators
    // - Create incident tickets
  }

  private static isRetryableByDefault(category: ErrorCategory): boolean {
    const retryableCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.TIMEOUT,
      ErrorCategory.SYSTEM,
      ErrorCategory.DATABASE
    ];

    return retryableCategories.includes(category);
  }

  private static isActionableByDefault(
    category: ErrorCategory,
    _severity: ErrorSeverity // eslint-disable-line @typescript-eslint/no-unused-vars
  ): boolean {
    // Non-actionable categories (user can't do anything about them)
    const nonActionableCategories = [
      ErrorCategory.SYSTEM,
      ErrorCategory.DATABASE,
      ErrorCategory.MEMORY
    ];

    if (nonActionableCategories.includes(category)) {
      return false;
    }
    
    // Authorization errors are not actionable unless the user can change permissions
    if (category === ErrorCategory.AUTHORIZATION) {
      return false;
    }
    
    return true;
  }
}

// Export convenience functions
export const handleError = ErrorHandler.handle.bind(ErrorHandler);
export const validationError = ErrorHandler.validation.bind(ErrorHandler);
export const networkError = ErrorHandler.network.bind(ErrorHandler);
export const authenticationError = ErrorHandler.authentication.bind(ErrorHandler);
export const authorizationError = ErrorHandler.authorization.bind(ErrorHandler);
export const businessLogicError = ErrorHandler.businessLogic.bind(ErrorHandler);
export const systemError = ErrorHandler.system.bind(ErrorHandler);
export const databaseError = ErrorHandler.database.bind(ErrorHandler);
export const timeoutError = ErrorHandler.timeout.bind(ErrorHandler);
export const externalServiceError = ErrorHandler.externalService.bind(ErrorHandler);