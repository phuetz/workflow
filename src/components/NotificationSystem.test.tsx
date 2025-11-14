/**
 * Unit tests for NotificationSystem
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationSystem, { useNotifications, notify } from '../components/NotificationSystem';

describe('NotificationSystem', () => {
  beforeEach(() => {
    // Clear all notifications before each test
    useNotifications.getState().clear();
  });

  it('should render without crashing', () => {
    render(<NotificationSystem />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should display success notification', async () => {
    render(<NotificationSystem />);

    notify.success('Test Success', 'This is a success message');

    await waitFor(() => {
      expect(screen.getByText('Test Success')).toBeInTheDocument();
      expect(screen.getByText('This is a success message')).toBeInTheDocument();
    });
  });

  it('should display error notification', async () => {
    render(<NotificationSystem />);

    notify.error('Test Error', 'This is an error message');

    await waitFor(() => {
      expect(screen.getByText('Test Error')).toBeInTheDocument();
      expect(screen.getByText('This is an error message')).toBeInTheDocument();
    });
  });

  it('should display warning notification', async () => {
    render(<NotificationSystem />);

    notify.warning('Test Warning', 'This is a warning message');

    await waitFor(() => {
      expect(screen.getByText('Test Warning')).toBeInTheDocument();
    });
  });

  it('should display info notification', async () => {
    render(<NotificationSystem />);

    notify.info('Test Info', 'This is an info message');

    await waitFor(() => {
      expect(screen.getByText('Test Info')).toBeInTheDocument();
    });
  });

  it('should remove notification when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<NotificationSystem />);

    notify.success('Test Notification');

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button');
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Test Notification')).not.toBeInTheDocument();
    });
  });

  it('should auto-remove notification after duration', async () => {
    vi.useFakeTimers();
    render(<NotificationSystem />);

    notify.success('Auto Remove Test', undefined, { duration: 1000 });

    await waitFor(() => {
      expect(screen.getByText('Auto Remove Test')).toBeInTheDocument();
    });

    vi.advanceTimersByTime(1100);

    await waitFor(() => {
      expect(screen.queryByText('Auto Remove Test')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('should display multiple notifications', async () => {
    render(<NotificationSystem />);

    notify.success('Notification 1');
    notify.error('Notification 2');
    notify.warning('Notification 3');

    await waitFor(() => {
      expect(screen.getByText('Notification 1')).toBeInTheDocument();
      expect(screen.getByText('Notification 2')).toBeInTheDocument();
      expect(screen.getByText('Notification 3')).toBeInTheDocument();
    });
  });

  it('should execute action when action button is clicked', async () => {
    const user = userEvent.setup();
    const actionFn = vi.fn();

    render(<NotificationSystem />);

    notify.info('Action Test', 'Click the action', {
      action: {
        label: 'Click Me',
        onClick: actionFn
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    const actionButton = screen.getByText('Click Me');
    await user.click(actionButton);

    expect(actionFn).toHaveBeenCalledTimes(1);
  });

  it('should clear all notifications', async () => {
    render(<NotificationSystem />);

    notify.success('Test 1');
    notify.success('Test 2');
    notify.success('Test 3');

    await waitFor(() => {
      expect(screen.getByText('Test 1')).toBeInTheDocument();
    });

    useNotifications.getState().clear();

    await waitFor(() => {
      expect(screen.queryByText('Test 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Test 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Test 3')).not.toBeInTheDocument();
    });
  });
});
