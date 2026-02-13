/**
 * Unified Toast/Notification Component
 * Accessible notifications with aria-live
 * Fixes P1-NOTIF-001 and P1-NOTIF-002
 */

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast icons and styles by type
const toastConfig: Record<ToastType, { icon: React.ReactNode; bgColor: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    iconColor: 'text-green-500',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
  },
};

// Default durations by type (errors don't auto-dismiss)
const defaultDurations: Record<ToastType, number> = {
  success: 4000,
  error: 0, // Manual dismiss only
  warning: 6000,
  info: 5000,
};

// Individual Toast Item Component with modern animations
const ToastItem: React.FC<{
  toast: Toast;
  onRemove: (id: string) => void;
  index: number;
}> = ({ toast, onRemove, index }) => {
  const config = toastConfig[toast.type];
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  const duration = toast.duration ?? defaultDurations[toast.type];

  useEffect(() => {
    if (duration > 0 && !isHovered) {
      // Progress bar animation
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        if (remaining > 0) {
          requestAnimationFrame(animate);
        } else {
          setIsExiting(true);
          setTimeout(() => onRemove(toast.id), 300);
        }
      };

      const frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }
  }, [toast, onRemove, duration, isHovered]);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  // Determine gradient for progress bar
  const progressGradient = {
    success: 'from-green-400 to-green-600',
    error: 'from-red-400 to-red-600',
    warning: 'from-amber-400 to-amber-600',
    info: 'from-blue-400 to-blue-600',
  }[toast.type];

  return (
    <div
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative overflow-hidden
        flex items-start gap-3 p-4 rounded-xl
        bg-white dark:bg-gray-800
        border border-gray-100 dark:border-gray-700
        shadow-xl shadow-black/5 dark:shadow-black/20
        backdrop-blur-xl
        transform transition-all duration-300 ease-out
        ${isExiting
          ? 'opacity-0 translate-x-full scale-95'
          : 'opacity-100 translate-x-0 scale-100'
        }
        hover:shadow-2xl hover:scale-[1.02]
      `}
      style={{
        animationDelay: `${index * 50}ms`,
        animation: isExiting ? 'none' : 'slideInRight 0.3s ease-out forwards',
      }}
    >
      {/* Colored accent bar on the left */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${progressGradient}`}
      />

      {/* Icon with pulse effect */}
      <div
        className={`
          flex-shrink-0 p-2 rounded-lg
          ${config.bgColor}
          ${config.iconColor}
          transition-transform duration-200
          ${isHovered ? 'scale-110' : 'scale-100'}
        `}
        aria-hidden="true"
      >
        <div className={toast.type === 'success' ? 'animate-bounce-once' : ''}>
          {config.icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-1">
        {toast.title && (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
            {toast.title}
          </h3>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300">{toast.message}</p>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline transition-colors"
          >
            {toast.action.label} →
          </button>
        )}
      </div>

      {/* Close button with hover effect */}
      <button
        onClick={handleRemove}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 group"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </button>

      {/* Progress bar at bottom */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-100`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Toast Container Component with stacked layout
export const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto animate-fade-in-up">
          <ToastItem toast={toast} onRemove={onRemove} index={index} />
        </div>
      ))}
    </div>
  );
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, title?: string) => addToast({ type: 'success', message, title }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string) => addToast({ type: 'error', message, title }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: 'warning', message, title }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) => addToast({ type: 'info', message, title }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
