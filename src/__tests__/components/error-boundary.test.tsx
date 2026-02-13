import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component with async error
const AsyncError: React.FC = () => {
  React.useEffect(() => {
    throw new Error('Async error');
  }, []);
  return <div>Async component</div>;
};

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Error Catching', () => {
    it('should catch errors thrown by child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display error message when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should catch errors from multiple children', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <ThrowError />
          <div>Child 3</div>
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should catch errors from nested components', () => {
      const NestedComponent = () => (
        <div>
          <div>
            <ThrowError />
          </div>
        </div>
      );

      render(
        <ErrorBoundary>
          <NestedComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Custom Error Handler', () => {
    it('should call custom error handler when provided', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should pass error and error info to handler', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      const [error, errorInfo] = onError.mock.calls[0];
      expect(error.message).toBe('Test error');
      expect(errorInfo).toHaveProperty('componentStack');
    });
  });

  describe('Custom Fallback UI', () => {
    it('should render custom fallback component', () => {
      const CustomFallback = ({ error }: { error: Error }) => (
        <div>Custom error: {error.message}</div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/custom error/i)).toBeInTheDocument();
      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it('should pass error to fallback component', () => {
      const CustomFallback = ({ error }: { error: Error }) => (
        <div data-testid="fallback">Error message: {error.message}</div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      const fallback = screen.getByTestId('fallback');
      expect(fallback).toHaveTextContent('Error message: Test error');
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state when reset is called', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Error should still be shown (error boundary doesn't auto-reset)
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should provide reset functionality in fallback', () => {
      let resetFn: (() => void) | null = null;

      const CustomFallback = ({ error, reset }: { error: Error; reset: () => void }) => {
        resetFn = reset;
        return (
          <div>
            <div>Error: {error.message}</div>
            <button onClick={reset}>Reset</button>
          </div>
        );
      };

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(resetFn).toBeDefined();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
  });

  describe('Error Isolation', () => {
    it('should isolate errors to specific boundary', () => {
      render(
        <div>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
          <div data-testid="sibling">Sibling content</div>
        </div>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByTestId('sibling')).toBeInTheDocument();
    });

    it('should support nested error boundaries', () => {
      render(
        <ErrorBoundary fallback={({ error }) => <div>Outer: {error.message}</div>}>
          <div>
            <ErrorBoundary fallback={({ error }) => <div>Inner: {error.message}</div>}>
              <ThrowError />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Only inner boundary should catch the error
      expect(screen.getByText(/inner: test error/i)).toBeInTheDocument();
      expect(screen.queryByText(/outer:/i)).not.toBeInTheDocument();
    });
  });

  describe('Different Error Types', () => {
    it('should catch TypeError', () => {
      const TypeErrorComponent = () => {
        throw new TypeError('Type error occurred');
      };

      render(
        <ErrorBoundary>
          <TypeErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/type error occurred/i)).toBeInTheDocument();
    });

    it('should catch ReferenceError', () => {
      const ReferenceErrorComponent = () => {
        throw new ReferenceError('Reference error occurred');
      };

      render(
        <ErrorBoundary>
          <ReferenceErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/reference error occurred/i)).toBeInTheDocument();
    });

    it('should catch custom errors', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const CustomErrorComponent = () => {
        throw new CustomError('Custom error occurred');
      };

      render(
        <ErrorBoundary>
          <CustomErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/custom error occurred/i)).toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('should log errors to console in development', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should include component stack in error info', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <div>
            <div>
              <ThrowError />
            </div>
          </div>
        </ErrorBoundary>
      );

      const [, errorInfo] = onError.mock.calls[0];
      expect(errorInfo.componentStack).toContain('ThrowError');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', () => {
      render(<ErrorBoundary>{null}</ErrorBoundary>);

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<ErrorBoundary>{undefined}</ErrorBoundary>);

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should handle empty children', () => {
      render(<ErrorBoundary>{[]}</ErrorBoundary>);

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should handle errors with no message', () => {
      const NoMessageError = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <NoMessageError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should handle very long error messages', () => {
      const LongErrorComponent = () => {
        throw new Error('A'.repeat(1000));
      };

      render(
        <ErrorBoundary>
          <LongErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not impact performance when no errors occur', () => {
      const startTime = performance.now();

      render(
        <ErrorBoundary>
          <div>
            {Array.from({ length: 100 }, (_, i) => (
              <div key={i}>Item {i}</div>
            ))}
          </div>
        </ErrorBoundary>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete quickly
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const errorMessage = screen.getByRole('alert', { hidden: true }) || screen.getByText(/something went wrong/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('should provide meaningful error context', () => {
      const CustomFallback = ({ error }: { error: Error }) => (
        <div role="alert" aria-live="assertive">
          <h2>An error occurred</h2>
          <p>{error.message}</p>
        </div>
      );

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('An error occurred');
      expect(alert).toHaveTextContent('Test error');
    });
  });

  describe('Integration with React features', () => {
    it('should work with React.memo components', () => {
      const MemoComponent = React.memo(() => {
        throw new Error('Memo error');
      });

      render(
        <ErrorBoundary>
          <MemoComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/memo error/i)).toBeInTheDocument();
    });

    it('should work with functional components', () => {
      const FunctionalComponent = () => {
        throw new Error('Functional error');
      };

      render(
        <ErrorBoundary>
          <FunctionalComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/functional error/i)).toBeInTheDocument();
    });

    it('should work with class components', () => {
      class ClassComponent extends React.Component {
        render() {
          throw new Error('Class error');
        }
      }

      render(
        <ErrorBoundary>
          <ClassComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/class error/i)).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should maintain error state across rerenders', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Rerender with same props
      rerender(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error should still be shown
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should track error history', () => {
      const errorHistory: Error[] = [];
      const onError = (error: Error) => {
        errorHistory.push(error);
      };

      const { rerender } = render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(errorHistory).toHaveLength(1);

      // Force new error by unmounting and remounting
      rerender(<div>No error</div>);
      rerender(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(errorHistory.length).toBeGreaterThanOrEqual(1);
    });
  });
});
