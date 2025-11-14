/**
 * Notification System Component
 * Real-time notifications with toast messages
 */

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationStore {
  notifications: Notification[];
  add: (notification: Omit<Notification, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotifications = create<NotificationStore>((set) => ({
  notifications: [],

  add: (notification) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification = { ...notification, id };

    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));

    // Auto-remove after duration
    const duration = notification.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        }));
      }, duration);
    }
  },

  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    })),

  clear: () => set({ notifications: [] })
}));

export default function NotificationSystem() {
  const { notifications, remove } = useNotifications();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'info':
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            pointer-events-auto
            max-w-sm w-full
            ${getStyles(notification.type)}
            border rounded-lg shadow-lg
            p-4
            transform transition-all duration-300 ease-in-out
            animate-slide-in-right
          `}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">
                {notification.title}
              </div>
              {notification.message && (
                <div className="text-sm mt-1 opacity-90">
                  {notification.message}
                </div>
              )}
              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className="text-sm font-medium mt-2 hover:underline"
                >
                  {notification.action.label}
                </button>
              )}
            </div>

            <button
              onClick={() => remove(notification.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper functions for easy usage
export const notify = {
  success: (title: string, message?: string, options?: Partial<Notification>) => {
    useNotifications.getState().add({
      type: 'success',
      title,
      message,
      ...options
    });
  },

  error: (title: string, message?: string, options?: Partial<Notification>) => {
    useNotifications.getState().add({
      type: 'error',
      title,
      message,
      duration: 7000,
      ...options
    });
  },

  warning: (title: string, message?: string, options?: Partial<Notification>) => {
    useNotifications.getState().add({
      type: 'warning',
      title,
      message,
      ...options
    });
  },

  info: (title: string, message?: string, options?: Partial<Notification>) => {
    useNotifications.getState().add({
      type: 'info',
      title,
      message,
      ...options
    });
  }
};
