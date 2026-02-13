/**
 * Enhanced Error Boundary Component
 * Provides comprehensive error handling and recovery mechanisms
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { notificationService } from '../../services/NotificationService';

// Inline logger to avoid circular dependencies during build
const logger = {
  debug: (msg: string, ...args: unknown[]) => console.debug(`[ErrorBoundary] ${msg}`, ...args),
  info: (msg: string, ...args: unknown[]) => console.info(`[ErrorBoundary] ${msg}`, ...args),
  warn: (msg: string, data?: unknown) => console.warn(`[ErrorBoundary] ${msg}`, data),
  error: (msg: string, data?: unknown) => console.error(`[ErrorBoundary] ${msg}`, data),
};

// Extend Window interface for global properties
declare global {
  interface Window {
    gc?: () => void;
    workflowStore?: {
      getState: () => {
        clearExecutionHistory?: () => void;
      };
    };
    Sentry?: {
      captureException: (error: Error, options?: { extra?: Record<string, unknown> }) => void;
    };
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRecovering: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    errorInfo: ErrorInfo;
    retry: () => void;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  maxRetries?: number;
  enableAutoRecovery?: boolean;
  recoveryDelay?: number;
  level?: 'component' | 'page' | 'app';
  isolateErrors?: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private errorRecoveryStrategies: Map<string, () => Promise<boolean>> = new Map();

  static defaultProps: Partial<ErrorBoundaryProps> = {
    maxRetries: 3,
    enableAutoRecovery: true,
    recoveryDelay: 2000,
    level: 'component',
    isolateErrors: true,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
    };

    // Register common recovery strategies
    this.registerRecoveryStrategy('NetworkError', this.recoverFromNetworkError);
    this.registerRecoveryStrategy('ChunkLoadError', this.recoverFromChunkLoadError);
    this.registerRecoveryStrategy('StateError', this.recoverFromStateError);
    this.registerRecoveryStrategy('MemoryError', this.recoverFromMemoryError);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;

    // Enhanced error classification
    const errorId = this.state.errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errorType = this.classifyError(error);
    const severity = this.calculateSeverity(error, errorInfo, level);

    // Log comprehensive error details
    logger.error('Error Boundary caught error', {
      errorId,
      errorType,
      severity,
      level,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      props: this.props,
      state: this.state,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler
    if (onError) {
      try {
        onError(error, errorInfo, errorId);
      } catch (handlerError) {
        logger.error('Error in custom error handler', handlerError);
      }
    }

    // Show user notification based on severity
    this.showErrorNotification(error, severity);

    // Attempt automatic recovery if enabled
    if (this.props.enableAutoRecovery && this.canAttemptRecovery()) {
      this.attemptAutoRecovery(errorType);
    }

    // Report to external error tracking if available
    this.reportToExternalService(error, errorInfo, errorId);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch')) {
      return 'NetworkError';
    }
    if (message.includes('chunk') || message.includes('loading chunk')) {
      return 'ChunkLoadError';
    }
    if (message.includes('cannot read prop') || message.includes('undefined')) {
      return 'StateError';
    }
    if (message.includes('memory') || stack.includes('maximum call stack')) {
      return 'MemoryError';
    }
    if (error.name === 'SyntaxError') {
      return 'SyntaxError';
    }
    if (error.name === 'TypeError') {
      return 'TypeError';
    }
    if (error.name === 'ReferenceError') {
      return 'ReferenceError';
    }

    return 'UnknownError';
  }

  private calculateSeverity(error: Error, errorInfo: ErrorInfo, level: string): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: App-level errors or security-related errors
    if (level === 'app' || error.message.includes('security') || error.message.includes('unauthorized')) {
      return 'critical';
    }
    
    // High: Page-level errors or data corruption
    if (level === 'page' || error.message.includes('corrupt') || error.message.includes('invalid state')) {
      return 'high';
    }
    
    // Medium: Component errors affecting functionality
    if (errorInfo.componentStack.includes('important') || error.message.includes('required')) {
      return 'medium';
    }
    
    // Low: Minor component errors
    return 'low';
  }

  private canAttemptRecovery(): boolean {
    const { maxRetries = 3 } = this.props;
    return this.state.retryCount < maxRetries;
  }

  private showErrorNotification(error: Error, severity: string) {
    const messages = {
      low: 'A minor issue occurred. The application is still functional.',
      medium: 'An error occurred. Some features may be temporarily unavailable.',
      high: 'A significant error occurred. Please refresh the page if issues persist.',
      critical: 'A critical error occurred. Please contact support if the problem continues.',
    };

    const types = {
      low: 'info' as const,
      medium: 'warning' as const,
      high: 'error' as const,
      critical: 'error' as const,
    };

    notificationService.show(
      types[severity as keyof typeof types],
      'Error Detected',
      messages[severity as keyof typeof messages]
    );
  }

  private async attemptAutoRecovery(errorType: string): Promise<void> {
    const { recoveryDelay = 2000 } = this.props;

    this.setState({ isRecovering: true });

    // Wait before attempting recovery
    await new Promise(resolve => {
      this.retryTimeoutId = setTimeout(resolve, recoveryDelay);
    });

    try {
      const strategy = this.errorRecoveryStrategies.get(errorType);
      let recovered = false;

      if (strategy) {
        recovered = await strategy();
      } else {
        // Default recovery: simple retry
        recovered = await this.defaultRecovery();
      }

      if (recovered) {
        logger.info('Auto-recovery successful', { errorType, retryCount: this.state.retryCount });
        this.resetError();
      } else {
        logger.warn('Auto-recovery failed', { errorType, retryCount: this.state.retryCount });
        this.setState({ isRecovering: false });
      }
    } catch (recoveryError) {
      logger.error('Recovery attempt failed', recoveryError);
      this.setState({ isRecovering: false });
    }
  }

  private registerRecoveryStrategy(errorType: string, strategy: () => Promise<boolean>) {
    this.errorRecoveryStrategies.set(errorType, strategy);
  }

  private recoverFromNetworkError = async (): Promise<boolean> => {
    // Test network connectivity
    try {
      await fetch(window.location.origin, { method: 'HEAD', cache: 'no-cache' });
      return true;
    } catch {
      return false;
    }
  };

  private recoverFromChunkLoadError = async (): Promise<boolean> => {
    // Force reload to get fresh chunks
    try {
      window.location.reload();
      return true;
    } catch {
      return false;
    }
  };

  private recoverFromStateError = async (): Promise<boolean> => {
    // Clear potentially corrupted state
    try {
      // Clear localStorage items that might be corrupted
      const keysToCheck = ['workflowStore', 'userPreferences', 'executionState'];
      keysToCheck.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            JSON.parse(value); // Test if it's valid JSON
          }
        } catch {
          localStorage.removeItem(key);
          logger.info(`Cleared corrupted localStorage key: ${key}`);
        }
      });
      return true;
    } catch {
      return false;
    }
  };

  private recoverFromMemoryError = async (): Promise<boolean> => {
    // Clear memory-intensive operations
    try {
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Clear large data structures
      if (window.workflowStore) {
        // Clear execution history that might be consuming memory
        window.workflowStore.getState().clearExecutionHistory?.();
      }
      
      return true;
    } catch {
      return false;
    }
  };

  private defaultRecovery = async (): Promise<boolean> => {
    // Simple wait and hope strategy
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  };

  private reportToExternalService(error: Error, errorInfo: ErrorInfo, errorId: string) {
    // Report to external error tracking service (Sentry, Bugsnag, etc.)
    try {
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          extra: {
            errorId,
            componentStack: errorInfo.componentStack,
            level: this.props.level,
          },
        });
      }
      
      // Or report to custom endpoint
      if (process.env.REACT_APP_ERROR_REPORTING_URL) {
        fetch(process.env.REACT_APP_ERROR_REPORTING_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            errorId,
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {
          // Silently fail - don't throw errors in error reporting
        });
      }
    } catch (reportingError) {
      logger.warn('Failed to report error to external service', reportingError);
    }
  }

  private retry = () => {
    if (!this.canAttemptRecovery()) {
      notificationService.show('warning', 'Maximum Retries Reached', 'Please refresh the page manually.');
      return;
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
    }));

    // Attempt recovery
    this.attemptAutoRecovery(this.classifyError(this.state.error!));
  };

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
    });
  };

  render() {
    const { hasError, error, errorInfo, isRecovering } = this.state;
    const CustomFallback = this.props.fallback;

    if (hasError && error && errorInfo) {
      // Use custom fallback if provided
      if (CustomFallback) {
        return (
          <CustomFallback
            error={error}
            errorInfo={errorInfo}
            retry={this.retry}
            resetError={this.resetError}
          />
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
              Something went wrong
            </h2>

            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              {isRecovering
                ? 'Attempting to recover...'
                : 'An unexpected error occurred. We\'re working to fix it.'
              }
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <summary className="cursor-pointer text-sm font-medium">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.retry}
                disabled={isRecovering || !this.canAttemptRecovery()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
              >
                {isRecovering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recovering...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry ({this.props.maxRetries! - this.state.retryCount} left)
                  </>
                )}
              </button>

              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reload Page
              </button>
            </div>

            {this.state.errorId && (
              <p className="text-xs text-gray-500 text-center mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;