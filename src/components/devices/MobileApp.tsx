import React, { useState, useEffect } from 'react';
import {
  Activity, Bell, CreditCard, HelpCircle, Home, MoreHorizontal,
  Play, Plus, RefreshCw, Search, Settings, Sparkles,
  User, Workflow
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface MobileAppProps {
  isMobile: boolean;
}

interface WorkflowExecution {
  id: string;
  workflowName: string;
  status: 'running' | 'success' | 'error' | 'paused';
  startTime: Date;
  duration?: number;
  progress: number;
  logs: string[];
}

interface Notification {
  id: number;
  type: 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function MobileApp({ isMobile }: MobileAppProps) {
  const { workflows: workflowsRecord, darkMode, isExecuting } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workflows' | 'executions' | 'settings'>('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Gérer le statut de connexion
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simuler les notifications push
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% de chance
        const notification: Notification = {
          id: Date.now(),
          type: Math.random() > 0.7 ? 'error' : 'success',
          title: Math.random() > 0.7 ? 'Workflow Failed' : 'Workflow Completed',
          message: 'Email automation workflow #1234',
          timestamp: new Date(),
          read: false
        };
        setNotifications(prev => [notification, ...prev.slice(0, 9)]);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Simuler les exécutions
  useEffect(() => {
    const progressIntervals: NodeJS.Timeout[] = [];
    const interval = setInterval(() => {
      const execution: WorkflowExecution = {
        id: `exec_${Date.now()}`,
        workflowName: `Workflow ${Math.floor(Math.random() * 100)}`,
        status: 'running',
        startTime: new Date(),
        progress: 0,
        logs: ['Starting workflow execution...']
      };

      setExecutions(prev => [execution, ...prev.slice(0, 19)]);

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setExecutions(prev => prev.map(exec => {
          if (exec.id === execution.id && exec.status === 'running') {
            const newProgress = Math.min(100, exec.progress + Math.random() * 20);
            if (newProgress >= 100) {
              return {
                ...exec,
                status: Math.random() > 0.2 ? 'success' : 'error',
                progress: 100,
                duration: Date.now() - exec.startTime.getTime(),
                logs: [...exec.logs, 'Workflow completed']
              };
            }
            return {
              ...exec,
              progress: newProgress,
              logs: [...exec.logs, `Step ${Math.floor(newProgress / 20)} completed`]
            };
          }
          return exec;
        }));
      }, 1000);

      progressIntervals.push(progressInterval);
      setTimeout(() => {
        clearInterval(progressInterval);
        const index = progressIntervals.indexOf(progressInterval);
        if (index > -1) progressIntervals.splice(index, 1);
      }, 8000);
    }, 15000);

    return () => {
      clearInterval(interval);
      // Clear all progress intervals on unmount
      progressIntervals.forEach(clearInterval);
    };
  }, []);

  if (!isMobile) {
    return null;
  }

  const workflows = Object.values(workflowsRecord || {});

  const DashboardTab = () => (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Workflows</p>
              <p className="text-2xl font-bold text-green-500">{workflows.length}</p>
            </div>
            <Activity className="text-green-500" size={24} />
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Runs</p>
              <p className="text-2xl font-bold text-blue-500">{executions.length}</p>
            </div>
            <Play className="text-blue-500" size={24} />
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {!isOnline && (
            <span className="text-xs text-gray-500">
              Changes will sync when online
            </span>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h3 className="font-medium mb-3">Recent Notifications</h3>
        <div className="space-y-2">
          {notifications.slice(0, 3).map(notification => (
            <div key={notification.id} className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-gray-500">{notification.message}</p>
              </div>
              <span className="text-xs text-gray-400">
                {notification.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h3 className="font-medium mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center space-x-2 p-3 bg-purple-500 text-white rounded-lg">
            <Sparkles size={16} />
            <span className="text-sm">AI Builder</span>
          </button>
          <button className="flex items-center space-x-2 p-3 bg-green-500 text-white rounded-lg">
            <Play size={16} />
            <span className="text-sm">Run Workflow</span>
          </button>
        </div>
      </div>
    </div>
  );

  const WorkflowsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">My Workflows</h3>
        <button className="text-purple-500">
          <Plus size={20} />
        </button>
      </div>
      
      <div className="space-y-3">
        {workflows.map((workflow, index) => (
          <div key={index} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium">Workflow {index + 1}</h4>
                <p className="text-sm text-gray-500">Last run: 2 hours ago</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <button className="text-gray-500">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ExecutionsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Recent Executions</h3>
        <button className="text-blue-500">
          <RefreshCw size={20} />
        </button>
      </div>
      
      <div className="space-y-3">
        {executions.map(execution => (
          <div key={execution.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{execution.workflowName}</h4>
              <div className={`px-2 py-1 rounded-full text-xs ${
                execution.status === 'success' ? 'bg-green-100 text-green-800' :
                execution.status === 'error' ? 'bg-red-100 text-red-800' :
                execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {execution.status}
              </div>
            </div>
            
            {execution.status === 'running' && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(execution.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${execution.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{execution.startTime.toLocaleTimeString()}</span>
              {execution.duration && (
                <span>{(execution.duration / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h3 className="font-medium mb-3">App Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Dark Mode</span>
            <button className={`w-12 h-6 rounded-full transition-colors ${
              darkMode ? 'bg-purple-500' : 'bg-gray-300'
            }`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Push Notifications</span>
            <button className="w-12 h-6 rounded-full bg-purple-500">
              <div className="w-5 h-5 rounded-full bg-white translate-x-6" />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Offline Mode</span>
            <button className="w-12 h-6 rounded-full bg-purple-500">
              <div className="w-5 h-5 rounded-full bg-white translate-x-6" />
            </button>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h3 className="font-medium mb-3">Account</h3>
        <div className="space-y-3">
          <button className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center space-x-3">
              <User size={20} />
              <span>Profile Settings</span>
            </div>
          </button>
          
          <button className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center space-x-3">
              <CreditCard size={20} />
              <span>Billing</span>
            </div>
          </button>
          
          <button className="w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center space-x-3">
              <HelpCircle size={20} />
              <span>Help & Support</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Workflow className="text-white" size={16} />
            </div>
            <h1 className="text-lg font-bold">Workflow Pro</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Bell size={20} className="text-gray-500" />
              {notifications.some(n => !n.read) && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
            <Search size={20} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'workflows' && <WorkflowsTab />}
        {activeTab === 'executions' && <ExecutionsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* Bottom Navigation */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm px-4 py-2`}>
        <div className="flex items-center justify-around">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'workflows', label: 'Workflows', icon: Workflow },
            { id: 'executions', label: 'Executions', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'dashboard' | 'workflows' | 'executions' | 'settings')}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-500 bg-purple-50 dark:bg-purple-900'
                  : 'text-gray-500'
              }`}
            >
              <tab.icon size={20} />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}