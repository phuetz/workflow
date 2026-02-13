import React, { useState, useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { notificationService, Notification as ServiceNotification } from '../../services/NotificationService';
import { eventNotificationService } from '../../services/EventNotificationService';
import { Bell, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

interface ExecutionResult {
  duration?: number;
  success?: boolean;
  error?: string | Error;
  [key: string]: unknown;
}

export default function NotificationCenter() {
  const { darkMode } = useWorkflowStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // PERFORMANCE FIX: Use useCallback to prevent stale closures in intervals
  const addNotification = useCallback((notification: Partial<Notification>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    } as Notification;
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };
  
  // Enhanced notification action handlers with proper callbacks
  const handleNotificationAction = (notification: Notification) => {
    if (notification.action) {
      // Log action execution for analytics
      eventNotificationService.emitEvent('notification_action_executed', {
        notificationId: notification.id,
        notificationType: notification.type,
        actionLabel: notification.action.label,
        timestamp: new Date()
      }, 'notification_center');
      
      // Execute the actual callback
      notification.action.callback();
      
      // Mark as read after action
      markAsRead(notification.id);
    }
  };


  // Listen to real notification service events
  useEffect(() => {
    const handleNotification = (serviceNotification: any) => {
      addNotification({
        type: serviceNotification.type,
        title: serviceNotification.title,
        message: serviceNotification.message,
        action: serviceNotification.actions?.[0] ? {
          label: serviceNotification.actions[0].label,
          callback: serviceNotification.actions[0].action
        } : undefined
      });
    };

    const handleDismiss = (notificationId: string) => {
      removeNotification(notificationId);
    };

    // Subscribe to notification service events
    notificationService.on('notification', handleNotification);
    notificationService.on('dismiss', handleDismiss);

    return () => {
      notificationService.off('notification', handleNotification);
      notificationService.off('dismiss', handleDismiss);
    };
  }, [addNotification]); // Add missing dependency

  // Listen to workflow store changes and emit events
  useEffect(() => {
    let previousIsExecuting = false;
    let previousExecutionResults: any = {};
    let executionStartTime = Date.now();

    const unsubscribe = useWorkflowStore.subscribe((currentState) => {
      const hasErrors = Object.keys(currentState.executionErrors).length > 0;

      // Track execution start time
      if (!previousIsExecuting && currentState.isExecuting) {
        executionStartTime = Date.now();
      }

      const executionTime = Date.now() - executionStartTime;

      // Emit workflow execution completed events
      if (previousIsExecuting && !currentState.isExecuting) {

        eventNotificationService.emitEvent('workflow_execution_completed', {
          workflowName: 'Current Workflow',
          success: !hasErrors,
          duration: executionTime,
          error: hasErrors ? Object.values(currentState.executionErrors)[0] : null,
          nodeCount: currentState.nodes.length
        }, 'workflow_store');
      }
      
      // Emit node execution events when execution results change
      const currentResultKeys = Object.keys(currentState.executionResults);
      const previousResultKeys = Object.keys(previousExecutionResults);
      
      if (currentResultKeys.length > previousResultKeys.length) {
        // New node execution completed
        const newNodeIds = currentResultKeys.filter(id => !previousResultKeys.includes(id));
        newNodeIds.forEach(nodeId => {
          const result = currentState.executionResults[nodeId] as ExecutionResult;
          const node = currentState.nodes.find(n => n.id === nodeId);

          if (result && node) {
            eventNotificationService.emitEvent('node_execution_completed', {
              nodeName: node.data?.label || node.data?.type || nodeId,
              nodeType: node.data?.type || 'unknown',
              duration: result.duration || 0,
              success: result.success !== false,
              error: result.error
            }, 'workflow_store');
          }
        });
      }
      
      // Update previous state for next comparison
      previousIsExecuting = currentState.isExecuting;
      previousExecutionResults = currentState.executionResults;
    });

    return unsubscribe;
  }, [addNotification]);

  // Initialize event-based notifications
  useEffect(() => {
    // Start the event notification service if not already started
    if (typeof window !== 'undefined') {
      // Proper initialization callback instead of console.log
      const onInitialized = () => {
        // Emit initialization event
        eventNotificationService.emitEvent('notification_center_initialized', {
          timestamp: new Date(),
          notificationCount: notifications.length
        }, 'notification_center');
        
        // Show initialization notification if in development
        if (process.env.NODE_ENV === 'development') {
          notificationService.show('info', 'System Ready', 'Event-based notification system initialized', {
            duration: 3000
          });
        }
      };
      
      // Call initialization callback
      onInitialized();
      
      // Generate some initial events for demonstration
      setTimeout(() => {
        eventNotificationService.emitEvent('quota_check', {
          quotaType: 'API calls',
          percentage: 75,
          used: 750,
          limit: 1000
        }, 'quota_manager');
      }, 5000);
      
      // Simulate a template being added
      setTimeout(() => {
        eventNotificationService.emitEvent('template_added', {
          templateName: 'Data Processing Pipeline',
          category: 'data',
          author: 'System'
        }, 'template_manager');
      }, 10000);
    }
    
    // No cleanup needed as the event service manages its own lifecycle
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <X className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="relative">
      {/* Bouton notification */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        } transition-colors`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel des notifications */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden`}>
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center space-x-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Tout effacer
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b last:border-b-0 ${
                    !notification.read
                      ? darkMode ? 'bg-gray-700' : 'bg-blue-50'
                      : ''
                  } hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-sm opacity-75 mt-1">{notification.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-50">
                          {new Date(notification.timestamp).toLocaleString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          {notification.action && (
                            <button
                              onClick={() => handleNotificationAction(notification)}
                              className="text-xs text-blue-500 hover:text-blue-600"
                            >
                              {notification.action.label}
                            </button>
                          )}
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-500 hover:text-blue-600"
                            >
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}