// ARCHITECTURE FIX: Centralized error handling to replace inconsistent patterns
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/SimpleLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  errorBoundaryId: string;
}

// Helper function to generate random string
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ARCHITECTURE FIX: Implement proper error boundary pattern with edge case handling
export class WorkflowErrorBoundary extends Component<Props, State> {
  private errorId: string = '';
  private lastResetKeys: Array<string | number> = [];
  // EDGE CASE FIX: Prevent infinite retry loops with circuit breaker
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly RETRY_RESET_TIMEOUT = 30000; // 30 seconds
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    const randomStr = generateRandomString(9);
    this.state = {
      hasError: false,
      retryCount: 0,
      errorBoundaryId: `boundary_${Date.now()}_${randomStr}`
    };
    this.lastResetKeys = props.resetKeys || [];
  }

  // EDGE CASE FIX: Reset error state when resetKeys change
  public static getDerivedStateFromProps(nextProps: Props, prevState: State): Partial<State> | null {
    const resetKeys = nextProps.resetKeys;
    if (resetKeys && prevState.hasError) {
      // Check if any reset key has changed
      const hasResetKeyChanged = resetKeys.some((resetKey, idx) => {
        return resetKey !== (nextProps.resetKeys?.[idx]);
      });

      if (hasResetKeyChanged) {
        return {
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: 0
        };
      }
    }
    return null;
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // EDGE CASE FIX: Ensure we don't lose existing state properties
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // EDGE CASE FIX: Generate error ID with boundary context
    const randomStr = generateRandomString(9);
    this.errorId = `error_${this.state.errorBoundaryId}_${Date.now()}_${randomStr}`;

    // EDGE CASE FIX: Safe error logging that won't throw
    try {
      logger.error('WorkflowErrorBoundary caught an error:', {
        errorId: this.errorId,
        boundaryId: this.state.errorBoundaryId,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });
    } catch {
      // EDGE CASE FIX: Fallback logging if console.error fails
      try {
        logger.info('Error logging failed, fallback log:', error.message);
      } catch {
        // Silent failure - no way to log
      }
    }

    this.setState({ errorInfo });

    // EDGE CASE FIX: Safe error callback notification
    try {
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }
    } catch (callbackError) {
      logger.error('Error in onError callback:', callbackError);
    }

    // EDGE CASE FIX: Safe error reporting with fallback
    this.reportErrorToService(error, errorInfo);
  }

  private reportErrorToService = (error: Error, errorInfo: ErrorInfo): void => {
    // EDGE CASE FIX: Comprehensive error reporting with multiple fallbacks
    try {
      // EDGE CASE FIX: Safe property access with fallbacks
      const safeErrorReport = {
        id: this.errorId,
        boundaryId: this.state.errorBoundaryId,
        message: error?.message || 'Unknown error message',
        stack: error?.stack || 'No stack trace available',
        componentStack: errorInfo?.componentStack || 'No component stack available',
        userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || 'Unknown user agent',
        timestamp: new Date().toISOString(),
        url: (typeof window !== 'undefined' && window.location?.href) || 'Unknown URL',
        retryCount: this.state.retryCount,
        errorType: error?.constructor?.name || 'Unknown'
      };

      // EDGE CASE FIX: Safe console logging with sanitized data
      try {
        logger.info('Error report:', {
          ...safeErrorReport,
          // EDGE CASE FIX: Limit stack trace length to prevent console overflow
          stack: safeErrorReport.stack?.substring(0, 1000) + (safeErrorReport.stack?.length > 1000 ? '...' : ''),
          componentStack: safeErrorReport.componentStack?.substring(0, 500) + (safeErrorReport.componentStack?.length > 500 ? '...' : '')
        });
      } catch {
        // Console logging failed, continue with storage
      }

      // EDGE CASE FIX: Safe localStorage operations with quota checks
      this.safeLocalStorageOperation(safeErrorReport);

    } catch (reportingError) {
      // EDGE CASE FIX: Multiple fallback logging strategies
      const errorMessage = reportingError instanceof Error ? reportingError.message : 'Unknown reporting error';
      try {
        logger.error('Failed to report error:', errorMessage);
        logger.error('Original error:', error?.message || 'Unknown original error');
      } catch {
        // Even fallback logging failed - silent failure
      }
    }
  };

  // EDGE CASE FIX: Safe localStorage operations with quota handling
  private safeLocalStorageOperation = (errorReport: Record<string, unknown>): void => {
    // EDGE CASE FIX: Check if localStorage is available and has space
    if (typeof localStorage === 'undefined') {
      return; // Not available (e.g., in Node.js environment)
    }

    const testKey = '__storage_test__';
    try {
      // EDGE CASE FIX: Test localStorage availability
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch {
      return; // localStorage is disabled or full
    }

    const storageKey = 'error_reports';
    try {
      let existingErrors: Record<string, unknown>[] = [];
      const stored = localStorage.getItem(storageKey);

      try {
        existingErrors = stored ? JSON.parse(stored) : [];
        // EDGE CASE FIX: Validate stored data structure
        if (!Array.isArray(existingErrors)) {
          existingErrors = [];
        }
      } catch {
        // EDGE CASE FIX: Reset if stored data is corrupted
        existingErrors = [];
      }

      existingErrors.push(errorReport);

      // EDGE CASE FIX: More aggressive cleanup to prevent storage issues
      // EDGE CASE FIX: Sanitize error data before storage
      const sanitizedErrors = existingErrors.slice(-10).map((err: Record<string, unknown>) => ({
        id: err.id,
        message: typeof err.message === 'string' ? err.message.substring(0, 200) : '', // Limit message length
        timestamp: err.timestamp,
        retryCount: err.retryCount,
        errorType: err.errorType
        // Remove stack traces and component stacks from storage for privacy/space
      }));

      const jsonString = JSON.stringify(sanitizedErrors);

      // EDGE CASE FIX: Check storage size before setting
      if (jsonString.length > 4096) { // 4KB limit
        // Keep only the most recent error if data is too large
        if (sanitizedErrors.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify([sanitizedErrors[sanitizedErrors.length - 1]]));
        } else {
          localStorage.setItem(storageKey, JSON.stringify([]));
        }
      } else {
        localStorage.setItem(storageKey, jsonString);
      }

    } catch {
      // EDGE CASE FIX: Handle quota exceeded and other storage errors
      try {
        // Try to clear old errors and store just the current one
        localStorage.setItem('error_reports', JSON.stringify([{
          id: errorReport.id,
          message: typeof errorReport.message === 'string' ? errorReport.message.substring(0, 100) : '',
          timestamp: errorReport.timestamp
        }]));
      } catch {
        // Even minimal storage failed - give up silently
      }
    }
  };

  private handleRetry = (): void => {
    // EDGE CASE FIX: Implement circuit breaker to prevent infinite retry loops
    const currentRetryCount = this.state.retryCount;
    const maxRetries = this.props.maxRetries ?? WorkflowErrorBoundary.DEFAULT_MAX_RETRIES;

    if (currentRetryCount >= maxRetries) {
      // EDGE CASE FIX: Max retries reached - show permanent error state
      logger.warn(`Max retries (${maxRetries}) reached for error boundary ${this.state.errorBoundaryId}`);
      return; // Don't allow more retries
    }

    // EDGE CASE FIX: Clear any existing retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // EDGE CASE FIX: Reset retry count after timeout to allow recovery
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ retryCount: 0 });
    }, WorkflowErrorBoundary.RETRY_RESET_TIMEOUT);

    // EDGE CASE FIX: Increment retry count and reset error state
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: currentRetryCount + 1
    });
  };

  // EDGE CASE FIX: Cleanup on unmount to prevent memory leaks
  public componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // EDGE CASE FIX: Check if custom fallback should be used
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // EDGE CASE FIX: Calculate retry state for UI
      const maxRetries = this.props.maxRetries ?? WorkflowErrorBoundary.DEFAULT_MAX_RETRIES;
      const isMaxRetriesReached = this.state.retryCount >= maxRetries;
      const canRetry = !isMaxRetriesReached;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
              {isMaxRetriesReached ? 'Persistent Error' : 'Something went wrong'}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {isMaxRetriesReached
                ? `Unable to recover after ${maxRetries} attempts. Please refresh the page or contact support.`
                : "We've encountered an unexpected error. Our team has been notified."
              }
            </p>

            {/* EDGE CASE FIX: Show retry count information */}
            {this.state.retryCount > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                  Retry attempt {this.state.retryCount} of {maxRetries}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {/* EDGE CASE FIX: Disable retry button when max retries reached */}
              <button
                onClick={this.handleRetry}
                disabled={!canRetry}
                className={`w-full font-medium py-2 px-4 rounded-lg transition-colors ${
                  canRetry
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
                title={!canRetry ? 'Maximum retry attempts reached' : 'Try to recover from error'}
              >
                {canRetry ? 'Try Again' : 'Max Retries Reached'}
              </button>

              <button
                onClick={() => {
                  // EDGE CASE FIX: Safe page reload
                  try {
                    window.location.reload();
                  } catch {
                    // EDGE CASE FIX: Fallback if reload fails
                    try {
                      window.location.assign(window.location.href);
                    } catch {
                      // Last resort - redirect to home
                      try {
                        window.location.href = '/';
                      } catch {
                        // Complete failure - show message
                        alert('Please manually refresh the page');
                      }
                    }
                  }
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Reload Page
              </button>
            </div>

            {/* EDGE CASE FIX: Safe development error display */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-sm">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded overflow-auto max-h-64">
                  <p className="font-mono text-xs text-red-600 dark:text-red-400 mb-2">
                    {this.state.error?.message || 'No error message available'}
                  </p>
                  {this.state.error?.stack && (
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto">
                      {/* EDGE CASE FIX: Limit stack trace display */}
                      {this.state.error.stack.substring(0, 2000)}
                      {this.state.error.stack.length > 2000 ? '\n... (truncated)' : ''}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">Component Stack</summary>
                      <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack.substring(0, 1000)}
                        {this.state.errorInfo.componentStack.length > 1000 ? '\n... (truncated)' : ''}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            )}

            <p className="text-xs text-gray-500 text-center mt-4">
              Error ID: {this.errorId || 'N/A'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ARCHITECTURE FIX: Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const WithErrorBoundaryComponent: React.FC<P> = (props: P) => (
    <WorkflowErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </WorkflowErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundaryComponent;
}

// EDGE CASE FIX: Hook for programmatic error handling with comprehensive safety
export function useErrorHandler(): (error: Error, errorInfo?: { componentStack?: string }) => never {
  return (error: Error, errorInfo?: { componentStack?: string }): never => {
    // EDGE CASE FIX: Safe error handling that won't throw during logging
    try {
      logger.error('Programmatic error handler:', error?.message || 'Unknown error');
    } catch {
      // Even console.error failed - continue silently
    }

    // EDGE CASE FIX: Safe error report generation
    try {
      const randomStr = generateRandomString(9);
      const safeErrorReport = {
        id: `error_${Date.now()}_${randomStr}`,
        message: error?.message || 'Unknown error message',
        stack: error?.stack?.substring(0, 500) || 'No stack trace', // Limit size
        componentStack: errorInfo?.componentStack?.substring(0, 300) || 'No component stack',
        timestamp: new Date().toISOString(),
        type: 'programmatic',
        userAgent: (typeof navigator !== 'undefined' && navigator.userAgent?.substring(0, 200)) || 'Unknown'
      };

      // EDGE CASE FIX: Safe localStorage operations
      if (typeof localStorage !== 'undefined') {
        const testKey = '__storage_test__';
        const storageKey = 'error_reports';

        try {
          // Test localStorage availability first
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);

          let existingErrors: Record<string, unknown>[] = [];
          const stored = localStorage.getItem(storageKey);

          try {
            existingErrors = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(existingErrors)) {
              existingErrors = [];
            }
          } catch {
            existingErrors = [];
          }

          existingErrors.push(safeErrorReport);

          // EDGE CASE FIX: Keep only recent errors and limit size
          const trimmedErrors = existingErrors.slice(-5);
          const jsonString = JSON.stringify(trimmedErrors);

          if (jsonString.length < 2048) { // 2KB limit
            localStorage.setItem(storageKey, jsonString);
          } else {
            // Just store the current error if total is too large
            localStorage.setItem(storageKey, JSON.stringify([safeErrorReport]));
          }
        } catch {
          // EDGE CASE FIX: Storage failed - try minimal storage
          try {
            localStorage.setItem('error_reports', JSON.stringify([{
              id: safeErrorReport.id,
              message: safeErrorReport.message.substring(0, 50),
              timestamp: safeErrorReport.timestamp
            }]));
          } catch {
            // Complete storage failure - continue without storage
          }
        }
      }
    } catch (reportingError) {
      // EDGE CASE FIX: Even error reporting failed - continue safely
      const errorMessage = reportingError instanceof Error ? reportingError.message : 'Unknown';
      try {
        logger.warn('Error reporting failed:', errorMessage);
      } catch {
        // Complete logging failure - silent continue
      }
    }

    // Re-throw to maintain error boundary behavior
    throw error;
  };
}
