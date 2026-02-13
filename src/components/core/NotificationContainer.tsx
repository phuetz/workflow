import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { notificationService, Notification, NotificationType } from '../../services/NotificationService';
import { useWorkflowStore } from '../../store/workflowStore';

const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { darkMode } = useWorkflowStore();
  
  useEffect(() => {
    // Load initial notifications
    setNotifications(notificationService.getNotifications());
    
    // Listen for new notifications
    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    };
    
    const handleDismiss = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    };
    
    notificationService.on('notification', handleNotification);
    notificationService.on('dismiss', handleDismiss);
    
    return () => {
      notificationService.off('notification', handleNotification);
      notificationService.off('dismiss', handleDismiss);
    };
  }, []);
  
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
    }
  };
  
  const getNotificationStyles = (type: NotificationType) => {
    const baseStyles = 'p-4 rounded-lg shadow-lg flex items-center space-x-3 transition-all duration-300';
    if (darkMode) {
      switch (type) {
        case 'success':
          return `${baseStyles} bg-green-900 border border-green-700 text-green-100`;
        case 'error':
          return `${baseStyles} bg-red-900 border border-red-700 text-red-100`;
        case 'warning':
          return `${baseStyles} bg-yellow-900 border border-yellow-700 text-yellow-100`;
        case 'info':
          return `${baseStyles} bg-blue-900 border border-blue-700 text-blue-100`;
      }
    } else {
      switch (type) {
        case 'success':
          return `${baseStyles} bg-green-50 border border-green-200 text-green-800`;
        case 'error':
          return `${baseStyles} bg-red-50 border border-red-200 text-red-800`;
        case 'warning':
          return `${baseStyles} bg-yellow-50 border border-yellow-200 text-yellow-800`;
        case 'info':
          return `${baseStyles} bg-blue-50 border border-blue-200 text-blue-800`;
      }
    }
    return baseStyles;
  };
  
  const getIconColor = (type: NotificationType) => {
    if (darkMode) {
      switch (type) {
        case 'success':
          return 'text-green-400';
        case 'error':
          return 'text-red-400';
        case 'warning':
          return 'text-yellow-400';
        case 'info':
          return 'text-blue-400';
      }
    } else {
      switch (type) {
        case 'success':
          return 'text-green-600';
        case 'error':
          return 'text-red-600';
        case 'warning':
          return 'text-yellow-600';
        case 'info':
          return 'text-blue-600';
      }
    }
    return 'text-gray-600';
  };
  
  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getNotificationStyles(notification.type)} animate-slideIn`}
          role="alert"
        >
          <div className={getIconColor(notification.type)}>
            {getIcon(notification.type)}
          </div>
          
          <div className="flex-1">
            <h4 className="font-semibold mb-1">{notification.title}</h4>
            <p className="text-sm opacity-90">{notification.message}</p>
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="mt-3 flex items-center space-x-2">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
                      action.style === 'primary'
                        ? darkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                        : action.style === 'danger'
                        ? darkMode
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                        : darkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={() => notificationService.dismiss(notification.id)}
            className={`${
              darkMode
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-400 hover:text-gray-600'
            } transition-colors`}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;