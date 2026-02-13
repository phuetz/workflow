/**
 * Notification Service
 * Handles application-wide notifications and user feedback
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  actions?: NotificationAction[];
  metadata?: Record<string, unknown>;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export class NotificationService extends EventEmitter {
  private notifications: Map<string, Notification> = new Map();
  private defaultDuration = 5000; // 5 seconds
  private maxNotifications = 10;
  
  constructor() {
    super();
  }
  
  /**
   * Show a notification
   */
  show(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      actions?: NotificationAction[];
      metadata?: Record<string, unknown>;
    }
  ): string {
    // Generate unique ID for notification
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notification: Notification = {
      id,
      type,
      title,
      message,
      timestamp: new Date(),
      duration: options?.duration ?? this.defaultDuration,
      actions: options?.actions,
      metadata: options?.metadata
    };
    
    // Add to notifications map
    this.notifications.set(id, notification);
    
    // Emit event for UI components
    this.emit('notification', notification);
    
    // Auto-dismiss if duration is set
    if (notification.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
    }
    
    // Limit number of notifications
    this.limitNotifications();
    
    return id;
  }
  
  /**
   * Convenience methods for different notification types
   */
  success(title: string, message: string, options?: Record<string, unknown>): string {
    return this.show('success', title, message, options);
  }
  
  error(title: string, message: string, options?: NotificationOptions): string {
    return this.show('error', title, message, {
      ...options,
      duration: 0 // Error notifications don't auto-dismiss by default
    });
  }
  
  warning(title: string, message: string, options?: unknown): string {
    return this.show('warning', title, message, options);
  }
  
  info(title: string, message: string, options?: unknown): string {
    return this.show('info', title, message, options);
  }
  
  /**
   * Dismiss a notification
   */
  dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.delete(id);
      this.emit('dismiss', id);
    }
  }
  
  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.dismiss(id));
  }
  
  /**
   * Get all active notifications
   */
  getNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Handle errors globally
   */
  handleError(error: Error | unknown, context?: string): void {
    logger.error(`Error${context ? ` in ${context}` : ''}:`, error);

    let title = 'Error';
    let message = 'An unexpected error occurred';

    if (error instanceof Error) {
      message = error.message;
      
      // Handle specific error types
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        title = 'Network Error';
        message = 'Unable to connect to the server. Please check your connection.';
      } else if (error.name === 'ValidationError') {
        title = 'Validation Error';
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        title = 'Authentication Error';
        message = 'Your session has expired. Please log in again.';
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        title = 'Access Denied';
        message = 'You do not have permission to perform this action.';
      } else if (error.message.includes('404')) {
        title = 'Not Found';
        message = 'The requested resource was not found.';
      } else if (error.message.includes('500')) {
        title = 'Server Error';
        message = 'The server encountered an error. Please try again later.';
      }
    }
    
    this.error(title, message, {
      metadata: {
        error: error,
        context: context,
        stack: error?.stack
      }
    });
  }
  
  /**
   * Show a loading notification
   */
  showLoading(message: string): string {
    return this.info('Loading', message, {
      duration: 0,
      metadata: { loading: true }
    });
  }
  
  /**
   * Update a loading notification to success
   */
  updateLoadingSuccess(id: string, message: string): void {
    const notification = this.notifications.get(id);
    if (notification && notification.metadata?.loading) {
      this.dismiss(id);
      this.success('Success', message);
    }
  }
  
  /**
   * Update a loading notification to error
   */
  updateLoadingError(id: string, message: string): void {
    const notification = this.notifications.get(id);
    if (notification && notification.metadata?.loading) {
      this.dismiss(id);
      this.error('Error', message);
    }
  }
  
  /**
   * Show a confirmation dialog
   */
  async confirm(
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      danger?: boolean;
    }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const id = this.show('confirmation', title, message, {
        duration: 0,
        actions: [
          {
            label: options?.confirmText || 'Confirm',
            action: () => {
              this.dismiss(id);
              resolve(true);
            },
            style: options?.danger ? 'danger' : 'primary'
          },
          {
            label: options?.cancelText || 'Cancel',
            action: () => {
              this.dismiss(id);
              resolve(false);
            },
            style: 'secondary'
          }
        ]
      });
    });
  }
  
  /**
   * Limit the number of notifications
   */
  private limitNotifications(): void {
    const notifications = Array.from(this.notifications.values());
    if (notifications.length > this.maxNotifications) {
      const toRemove = notifications.slice(0, notifications.length - this.maxNotifications);
      toRemove.forEach(n => this.dismiss(n.id));
    }
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    notificationService.handleError(event.reason, 'Unhandled Promise Rejection');
  });
  
  window.addEventListener('error', (event) => {
    notificationService.handleError(event.error || event.message, 'Global Error');
  });
}