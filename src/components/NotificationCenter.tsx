import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
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

export default function NotificationCenter() {
  const { darkMode } = useWorkflowStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
  };

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

  const unreadCount = notifications.filter(n => !n.read).length;

  // Écouter les événements du store pour créer des notifications
  useEffect(() => {
    const store = useWorkflowStore.getState();
    
    // Simuler des notifications basées sur les actions
    const handleStoreChange = () => {
      const currentState = useWorkflowStore.getState();
      
      // Notification d'exécution terminée
      if (currentState.isExecuting !== store.isExecuting && !currentState.isExecuting) {
        const hasErrors = Object.keys(currentState.executionErrors).length > 0;
        addNotification({
          type: hasErrors ? 'error' : 'success',
          title: hasErrors ? 'Exécution échouée' : 'Exécution réussie',
          message: hasErrors 
            ? 'Votre workflow s\'est terminé avec des erreurs' 
            : 'Votre workflow s\'est exécuté avec succès',
          action: {
            label: 'Voir les détails',
            callback: () => console.log('Voir les détails d\'exécution')
          }
        });
      }
    };

    const unsubscribe = useWorkflowStore.subscribe(handleStoreChange);
    return unsubscribe;
  }, []);

  // Notifications automatiques d'exemple
  useEffect(() => {
    const interval = setInterval(() => {
      const exampleNotifications = [
        {
          type: 'info' as const,
          title: 'Nouveau template disponible',
          message: 'Un nouveau template "E-commerce Analytics" est disponible'
        },
        {
          type: 'warning' as const,
          title: 'Limite de quota approchée',
          message: 'Vous avez utilisé 80% de votre quota mensuel'
        },
        {
          type: 'success' as const,
          title: 'Webhook configuré',
          message: 'Votre webhook a été configuré avec succès'
        }
      ];

      if (Math.random() > 0.7) {
        const randomNotification = exampleNotifications[Math.floor(Math.random() * exampleNotifications.length)];
        addNotification(randomNotification);
      }
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
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
                              onClick={notification.action.callback}
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