/**
 * ErrorBoundary Component Tests
 * Tests for error handling, recovery strategies, and boundary behavior
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock logger
vi.mock('../../services/LoggingService', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

// Store original NODE_ENV
const originalEnv = process.env.NODE_ENV;

// Test component that throws errors
const TestErrorComponent = ({ shouldThrow = false, errorType = 'default' }: { shouldThrow?: boolean; errorType?: string }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('NetworkError: Failed to fetch');
      case 'chunk':
        throw new Error('ChunkLoadError: Loading chunk failed');
      case 'state':
        throw new Error('StateError: Invalid state transition');
      default:
        throw new Error('Test error');
    }
  }
  return <div>No error</div>;
};

// Alias for backward compatibility
const ThrowError = TestErrorComponent;

// Component that renders without errors
const GoodComponent = () => <div>Working component</div>;

// Component that throws nested error
const NestedError = () => {
  throw new Error('Nested error');
};

// Fallback with context
const FallbackWithContext = ({ error, retryCount, resetError }: { error: Error; retryCount: number; resetError: () => void }) => (
  <div>
    <div>Error: {error.message}</div>
    <div>Retry count: {retryCount}</div>
    <button onClick={resetError}>Reset</button>
  </div>
);

// Mock import for chunk loading tests
const mockImport = vi.fn().mockResolvedValue({ default: () => <div>Loaded</div> });

describe('ErrorBoundary', () => {
  let onErrorMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onErrorMock = vi.fn();

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true
    });

    // Mock localStorage
    const localStorageMock = {
      clear: vi.fn(),
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should catch and display error when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should display custom fallback UI when provided', () => {
    const CustomFallback = ({ error }: { error: Error }) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/custom error: test error/i)).toBeInTheDocument();
  });

  it('should attempt network error recovery', async () => {
    // Mock successful fetch for recovery
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200
    });

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="network" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    // Wait for recovery attempt
    await waitFor(() => {
      // After recovery, component should re-render without error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle chunk load error recovery', async () => {
    // Mock dynamic import for chunk recovery
    (global as any).import = mockImport;

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="chunk" />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
    });

    // Should attempt to reload chunks
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should handle state error recovery', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="state" />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
    });

    // Should clear localStorage for state recovery
    expect(localStorage.clear).toHaveBeenCalled();
  });

  it('should limit retry attempts', async () => {
    const { rerender } = render(
      <ErrorBoundary maxRetries={2}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // First retry
    let retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      rerender(
        <ErrorBoundary maxRetries={2}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    // Second retry
    retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      rerender(
        <ErrorBoundary maxRetries={2}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    // Third attempt should show no retry button
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByText(/reload the page/i)).toBeInTheDocument();
  });

  it('should reset error state when key changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="key1">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Change reset key
    rerender(
      <ErrorBoundary resetKey="key2">
        <GoodComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should display error details in development mode', () => {
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error details/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it('should hide error details in production mode', () => {
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/error details/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();
  });

  it('should handle recovery failure gracefully', async () => {
    // Mock failed recovery
    global.fetch = vi.fn().mockRejectedValue(new Error('Recovery failed'));

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType="network" />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      // Should still show error state after failed recovery
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('should provide error context to fallback component', () => {
    render(
      <ErrorBoundary fallback={FallbackWithContext}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error: test error/i)).toBeInTheDocument();
    expect(screen.getByText(/retry count: 0/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('should handle nested error boundaries correctly', () => {
    render(
      <ErrorBoundary>
        <div>
          <ErrorBoundary>
            <NestedError />
          </ErrorBoundary>
          <GoodComponent />
        </div>
      </ErrorBoundary>
    );

    // Inner boundary should catch the error
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    // Outer component should still render
    expect(screen.getByText('Working component')).toBeInTheDocument();
  });
});
