/**
 * Personalized Dashboard
 * Adaptive dashboard following 2025 UX trends with role-based customization
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layout, LayoutGrid, Plus, Settings, Star, Clock, Zap,
  TrendingUp, Activity, AlertCircle, CheckCircle, Play,
  ChevronRight, GripVertical, X, Sparkles, Target,
  BarChart3, Users, Calendar, Bell, Workflow
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  MetricCard,
  Sparkline,
  ProgressRing,
  StatusDot,
  MiniProgressBar,
  CountUp,
  Skeleton,
  AvatarStack,
} from '../ui/MicroVisualizations';
import { logger } from '../../services/SimpleLogger';

// ============================================================================
// Types
// ============================================================================

type UserRole = 'developer' | 'analyst' | 'manager' | 'admin';
type WidgetSize = 'small' | 'medium' | 'large';
type WidgetType =
  | 'quick-actions'
  | 'recent-workflows'
  | 'execution-stats'
  | 'performance-metrics'
  | 'team-activity'
  | 'favorites'
  | 'notifications'
  | 'goals'
  | 'insights';

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: number;
  visible: boolean;
}

interface DashboardPreferences {
  role: UserRole;
  widgets: DashboardWidget[];
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  showWelcome: boolean;
}

interface PersonalizedDashboardProps {
  userName?: string;
  userRole?: UserRole;
  onNavigate?: (path: string) => void;
}

// ============================================================================
// Default widget configurations by role
// ============================================================================

const roleWidgets: Record<UserRole, WidgetType[]> = {
  developer: ['quick-actions', 'recent-workflows', 'execution-stats', 'performance-metrics', 'favorites'],
  analyst: ['execution-stats', 'performance-metrics', 'insights', 'recent-workflows', 'goals'],
  manager: ['team-activity', 'execution-stats', 'performance-metrics', 'goals', 'notifications'],
  admin: ['execution-stats', 'team-activity', 'performance-metrics', 'notifications', 'quick-actions'],
};

// ============================================================================
// Mock Data
// ============================================================================

const generateSparklineData = (length: number = 12) =>
  Array.from({ length }, () => Math.floor(Math.random() * 100));

const mockStats = {
  totalWorkflows: 47,
  activeWorkflows: 23,
  executionsToday: 156,
  successRate: 94.5,
  avgExecutionTime: 2.4,
  scheduledTasks: 12,
};

const mockRecentWorkflows = [
  { id: '1', name: 'Data Sync Pipeline', status: 'running', lastRun: '5 min ago', executions: 234 },
  { id: '2', name: 'Email Notification', status: 'success', lastRun: '1 hour ago', executions: 89 },
  { id: '3', name: 'Report Generator', status: 'scheduled', lastRun: 'Tomorrow 9 AM', executions: 156 },
  { id: '4', name: 'API Integration', status: 'error', lastRun: '2 hours ago', executions: 67 },
];

const mockTeamMembers = [
  { name: 'Alice Johnson' },
  { name: 'Bob Smith' },
  { name: 'Carol Williams' },
  { name: 'David Brown' },
  { name: 'Eve Davis' },
];

const mockGoals = [
  { name: 'Reduce errors by 50%', progress: 72, target: '< 5%' },
  { name: 'Automate 100 processes', progress: 47, target: '100' },
  { name: 'Improve avg. execution time', progress: 85, target: '< 2s' },
];

// ============================================================================
// Widget Components
// ============================================================================

const QuickActionsWidget: React.FC<{ onAction?: (action: string) => void }> = ({ onAction }) => {
  const actions = [
    { id: 'new-workflow', icon: <Plus className="w-5 h-5" />, label: 'New Workflow', color: 'bg-primary-500' },
    { id: 'run-all', icon: <Play className="w-5 h-5" />, label: 'Run All', color: 'bg-green-500' },
    { id: 'templates', icon: <Layout className="w-5 h-5" />, label: 'Templates', color: 'bg-purple-500' },
    { id: 'import', icon: <Zap className="w-5 h-5" />, label: 'Import', color: 'bg-amber-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => onAction?.(action.id)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
        >
          <div className={`${action.color} p-3 rounded-xl text-white group-hover:scale-110 transition-transform`}>
            {action.icon}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

const RecentWorkflowsWidget: React.FC<{ onSelect?: (id: string) => void }> = ({ onSelect }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'online';
      case 'success': return 'success';
      case 'error': return 'error';
      case 'scheduled': return 'away';
      default: return 'offline';
    }
  };

  return (
    <div className="space-y-2">
      {mockRecentWorkflows.map(workflow => (
        <button
          key={workflow.id}
          onClick={() => onSelect?.(workflow.id)}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
        >
          <StatusDot status={getStatusColor(workflow.status) as any} />
          <div className="flex-1 text-left">
            <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {workflow.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {workflow.lastRun} • {workflow.executions} executions
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </button>
      ))}
    </div>
  );
};

const ExecutionStatsWidget: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        title="Executions Today"
        value={<CountUp end={mockStats.executionsToday} />}
        change={12}
        changeLabel="vs yesterday"
        sparklineData={generateSparklineData()}
        icon={<Activity className="w-5 h-5" />}
        color="primary"
        size="sm"
      />
      <MetricCard
        title="Success Rate"
        value={`${mockStats.successRate}%`}
        change={2.3}
        changeLabel="this week"
        icon={<CheckCircle className="w-5 h-5" />}
        color="success"
        size="sm"
      />
      <MetricCard
        title="Active Workflows"
        value={mockStats.activeWorkflows}
        change={-5}
        changeLabel="vs last week"
        icon={<Workflow className="w-5 h-5" />}
        color="info"
        size="sm"
      />
      <MetricCard
        title="Avg. Execution"
        value={`${mockStats.avgExecutionTime}s`}
        change={-15}
        changeLabel="improved"
        icon={<Clock className="w-5 h-5" />}
        color="warning"
        size="sm"
      />
    </div>
  );
};

const PerformanceMetricsWidget: React.FC = () => {
  const metrics = [
    { label: 'CPU Usage', value: 45, color: 'primary' as const },
    { label: 'Memory', value: 68, color: 'warning' as const },
    { label: 'Network I/O', value: 23, color: 'success' as const },
    { label: 'Queue', value: 12, color: 'info' as const },
  ];

  return (
    <div className="space-y-4">
      {metrics.map(metric => (
        <div key={metric.label} className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-24">
            {metric.label}
          </span>
          <div className="flex-1">
            <MiniProgressBar value={metric.value} color={metric.color} showLabel />
          </div>
        </div>
      ))}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Execution trend (24h)</p>
        <Sparkline
          data={generateSparklineData(24)}
          width={280}
          height={40}
          showArea
          color="#6366f1"
        />
      </div>
    </div>
  );
};

const TeamActivityWidget: React.FC = () => {
  const activities = [
    { user: 'Alice', action: 'deployed', target: 'Data Pipeline v2', time: '5m ago' },
    { user: 'Bob', action: 'created', target: 'Email Automation', time: '1h ago' },
    { user: 'Carol', action: 'fixed', target: 'API Integration', time: '2h ago' },
    { user: 'David', action: 'updated', target: 'Report Generator', time: '3h ago' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Team members online</span>
        <AvatarStack avatars={mockTeamMembers} max={4} />
      </div>
      <div className="space-y-3 pt-2">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
              {activity.user[0]}
            </div>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-gray-100">
                <span className="font-medium">{activity.user}</span>{' '}
                <span className="text-gray-500 dark:text-gray-400">{activity.action}</span>{' '}
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-xs text-gray-400">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GoalsWidget: React.FC = () => {
  return (
    <div className="space-y-4">
      {mockGoals.map((goal, i) => (
        <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {goal.name}
            </span>
            <ProgressRing progress={goal.progress} size={36} strokeWidth={3} />
          </div>
          <div className="flex items-center justify-between">
            <MiniProgressBar value={goal.progress} color="primary" className="flex-1 mr-4" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Target: {goal.target}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const InsightsWidget: React.FC = () => {
  const insights = [
    { icon: <Sparkles className="w-4 h-4" />, text: 'Data Pipeline could be 20% faster with parallel execution', type: 'optimization' },
    { icon: <AlertCircle className="w-4 h-4" />, text: 'API Integration has failed 3 times today', type: 'warning' },
    { icon: <TrendingUp className="w-4 h-4" />, text: 'Email Automation usage up 50% this week', type: 'trend' },
  ];

  const typeColors = {
    optimization: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    trend: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  };

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-lg ${typeColors[insight.type as keyof typeof typeColors]}`}
        >
          <div className="mt-0.5">{insight.icon}</div>
          <p className="text-sm">{insight.text}</p>
        </div>
      ))}
    </div>
  );
};

const FavoritesWidget: React.FC<{ onSelect?: (id: string) => void }> = ({ onSelect }) => {
  const favorites = [
    { id: '1', name: 'Main Pipeline', starred: true },
    { id: '2', name: 'Customer Sync', starred: true },
    { id: '3', name: 'Daily Report', starred: true },
  ];

  return (
    <div className="space-y-2">
      {favorites.map(fav => (
        <button
          key={fav.id}
          onClick={() => onSelect?.(fav.id)}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
            {fav.name}
          </span>
          <Play className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
};

const NotificationsWidget: React.FC = () => {
  const notifications = [
    { icon: <CheckCircle className="w-4 h-4" />, text: 'Pipeline completed successfully', time: '2m ago', read: false },
    { icon: <AlertCircle className="w-4 h-4" />, text: 'Scheduled maintenance at 3 AM', time: '1h ago', read: false },
    { icon: <Users className="w-4 h-4" />, text: 'New team member joined', time: '3h ago', read: true },
  ];

  return (
    <div className="space-y-2">
      {notifications.map((notif, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
            notif.read ? 'opacity-60' : 'bg-primary-50/50 dark:bg-primary-900/10'
          }`}
        >
          <div className="text-gray-500 dark:text-gray-400 mt-0.5">{notif.icon}</div>
          <div className="flex-1">
            <p className="text-sm text-gray-900 dark:text-gray-100">{notif.text}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{notif.time}</p>
          </div>
          {!notif.read && <div className="w-2 h-2 rounded-full bg-primary-500" />}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Widget Renderer
// ============================================================================

const WidgetRenderer: React.FC<{
  widget: DashboardWidget;
  onAction?: (action: string) => void;
}> = ({ widget, onAction }) => {
  const widgetComponents: Record<WidgetType, React.ReactNode> = {
    'quick-actions': <QuickActionsWidget onAction={onAction} />,
    'recent-workflows': <RecentWorkflowsWidget onSelect={(id) => onAction?.(`workflow:${id}`)} />,
    'execution-stats': <ExecutionStatsWidget />,
    'performance-metrics': <PerformanceMetricsWidget />,
    'team-activity': <TeamActivityWidget />,
    'favorites': <FavoritesWidget onSelect={(id) => onAction?.(`workflow:${id}`)} />,
    'notifications': <NotificationsWidget />,
    'goals': <GoalsWidget />,
    'insights': <InsightsWidget />,
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800
        shadow-sm hover:shadow-md transition-shadow duration-300
        ${widget.size === 'large' ? 'col-span-2' : ''}
        animate-fade-in-up
      `}
      style={{ animationDelay: `${widget.position * 50}ms` }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{widget.title}</h3>
        <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5">
        {widgetComponents[widget.type]}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({
  userName = 'User',
  userRole = 'developer',
  onNavigate,
}) => {
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('dashboard_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to defaults
      }
    }

    // Generate default widgets based on role
    const defaultWidgets: DashboardWidget[] = roleWidgets[userRole].map((type, i) => ({
      id: `${type}-${i}`,
      type,
      title: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      size: i === 2 ? 'large' : 'medium',
      position: i,
      visible: true,
    }));

    return {
      role: userRole,
      widgets: defaultWidgets,
      theme: 'system',
      compactMode: false,
      showWelcome: true,
    };
  });

  const [isCustomizing, setIsCustomizing] = useState(false);

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('dashboard_preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleAction = useCallback((action: string) => {
    logger.debug('Dashboard action', { action });
    if (action.startsWith('workflow:')) {
      onNavigate?.(`/workflows/${action.split(':')[1]}`);
    } else if (action === 'new-workflow') {
      onNavigate?.('/workflows/new');
    } else if (action === 'templates') {
      onNavigate?.('/templates');
    }
  }, [onNavigate]);

  const visibleWidgets = preferences.widgets.filter(w => w.visible);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {greeting}, {userName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Here's what's happening with your workflows today
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-colors duration-200
                ${isCustomizing
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              <LayoutGrid className="w-4 h-4" />
              Customize
            </button>
            <button
              onClick={() => onNavigate?.('/settings')}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">Total Workflows</p>
                <p className="text-3xl font-bold mt-1">
                  <CountUp end={mockStats.totalWorkflows} />
                </p>
              </div>
              <Workflow className="w-10 h-10 text-primary-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Success Rate</p>
                <p className="text-3xl font-bold mt-1">{mockStats.successRate}%</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Executions Today</p>
                <p className="text-3xl font-bold mt-1">
                  <CountUp end={mockStats.executionsToday} />
                </p>
              </div>
              <Activity className="w-10 h-10 text-amber-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Scheduled</p>
                <p className="text-3xl font-bold mt-1">
                  <CountUp end={mockStats.scheduledTasks} />
                </p>
              </div>
              <Calendar className="w-10 h-10 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-2 gap-6">
          {visibleWidgets.map(widget => (
            <WidgetRenderer
              key={widget.id}
              widget={widget}
              onAction={handleAction}
            />
          ))}
        </div>

        {/* Customization Panel */}
        {isCustomizing && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 animate-slide-in-up">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Add Widget:
              </span>
              <div className="flex gap-2">
                {(['quick-actions', 'recent-workflows', 'execution-stats', 'performance-metrics', 'team-activity', 'favorites', 'notifications', 'goals', 'insights'] as WidgetType[])
                  .filter(type => !preferences.widgets.find(w => w.type === type && w.visible))
                  .map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setPreferences(prev => ({
                          ...prev,
                          widgets: [
                            ...prev.widgets,
                            {
                              id: `${type}-${Date.now()}`,
                              type,
                              title: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                              size: 'medium',
                              position: prev.widgets.length,
                              visible: true,
                            },
                          ],
                        }));
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      + {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
              </div>
              <button
                onClick={() => setIsCustomizing(false)}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizedDashboard;
