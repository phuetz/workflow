/**
 * Bento Dashboard - Linear-Style 2025 Dashboard Design
 * Uses the Linear design system for consistent styling
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, Bell, Bot,
  ChevronRight, Clock, Heart, Layers, LineChart,
  Plus, RefreshCw, Settings, Sparkles, Target,
  TrendingDown, TrendingUp, Upload, Workflow, Zap,
  CheckCircle, XCircle, Circle, Play, Calendar,
  GitBranch, Database, Globe, Users
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

// ============================================================================
// Types
// ============================================================================

interface WorkflowExecution {
  id: string;
  name: string;
  status: 'success' | 'error' | 'running' | 'pending';
  duration?: number;
  timestamp: Date;
  nodes: number;
}

interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  gradient: string;
}

// ============================================================================
// Linear Card Component
// ============================================================================

const LinearCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  noPadding?: boolean;
}> = ({ children, className = '', hover = false, onClick, noPadding = false }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl
        bg-[var(--linear-surface-1)]
        border border-[var(--linear-border-subtle)]
        ${!noPadding ? 'p-5' : ''}
        ${hover ? 'cursor-pointer transition-all duration-200 hover:bg-[var(--linear-surface-2)] hover:border-[var(--linear-border-default)] linear-hover-lift' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// ============================================================================
// Animated Counter Component
// ============================================================================

const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}> = ({ value, duration = 1000, prefix = '', suffix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(easeOut * value);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
};

// ============================================================================
// Sparkline Mini Chart
// ============================================================================

const SparklineChart: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  showGradient?: boolean;
}> = ({ data, color = 'var(--linear-accent-purple)', height = 40, showGradient = true }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} 100,${height}`;
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGradient && (
        <polygon
          points={areaPoints}
          fill={`url(#${gradientId})`}
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="100"
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="4"
        fill={color}
        className="animate-pulse"
      />
    </svg>
  );
};

// ============================================================================
// Progress Ring Component
// ============================================================================

const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showLabel?: boolean;
}> = ({
  progress,
  size = 80,
  strokeWidth = 6,
  color = 'var(--linear-accent-green)',
  showLabel = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--linear-surface-3)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-semibold text-[var(--linear-text-primary)]">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
};

// ============================================================================
// Status Indicator Component
// ============================================================================

const StatusIndicator: React.FC<{
  status: 'success' | 'error' | 'running' | 'pending' | 'idle';
  pulse?: boolean;
}> = ({ status, pulse = true }) => {
  const colors = {
    success: 'var(--linear-accent-green)',
    error: 'var(--linear-accent-red)',
    running: 'var(--linear-accent-blue)',
    pending: 'var(--linear-accent-yellow)',
    idle: 'var(--linear-text-muted)',
  };

  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && (status === 'running' || status === 'pending') && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
          style={{ backgroundColor: colors[status] }}
        />
      )}
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: colors[status] }}
      />
    </span>
  );
};

// ============================================================================
// Execution Item Component
// ============================================================================

const ExecutionItem: React.FC<{
  execution: WorkflowExecution;
  onClick?: () => void;
}> = ({ execution, onClick }) => {
  const statusIcons = {
    success: <CheckCircle className="w-4 h-4" style={{ color: 'var(--linear-accent-green)' }} />,
    error: <XCircle className="w-4 h-4" style={{ color: 'var(--linear-accent-red)' }} />,
    running: <RefreshCw className="w-4 h-4 animate-spin" style={{ color: 'var(--linear-accent-blue)' }} />,
    pending: <Circle className="w-4 h-4" style={{ color: 'var(--linear-accent-yellow)' }} />,
  };

  return (
    <div
      onClick={onClick}
      className="
        flex items-center gap-3 p-3 rounded-lg
        hover:bg-[var(--linear-surface-hover)]
        cursor-pointer transition-colors duration-150
      "
    >
      <div className="flex-shrink-0">
        {statusIcons[execution.status]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--linear-text-primary)] truncate">
          {execution.name}
        </p>
        <p className="text-xs text-[var(--linear-text-muted)]">
          {execution.nodes} nodes
          {execution.duration && ` • ${execution.duration}ms`}
        </p>
      </div>
      <div className="flex-shrink-0 text-xs text-[var(--linear-text-muted)]">
        {new Date(execution.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

// ============================================================================
// Quick Stat Widget
// ============================================================================

const QuickStatWidget: React.FC<QuickStat & { onClick?: () => void }> = ({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  gradient,
  onClick,
}) => {
  return (
    <LinearCard hover={!!onClick} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--linear-text-secondary)] mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-[var(--linear-text-primary)]">
            {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              changeType === 'positive' ? 'text-[var(--linear-accent-green)]' :
              changeType === 'negative' ? 'text-[var(--linear-accent-red)]' : 'text-[var(--linear-text-muted)]'
            }`}>
              {changeType === 'positive' ? <TrendingUp className="w-3 h-3" /> :
               changeType === 'negative' ? <TrendingDown className="w-3 h-3" /> : null}
              <span>{change > 0 ? '+' : ''}{change}%</span>
              <span className="text-[var(--linear-text-muted)]">vs last week</span>
            </div>
          )}
        </div>
        <div
          className="p-2.5 rounded-xl text-white"
          style={{ background: gradient }}
        >
          {icon}
        </div>
      </div>
    </LinearCard>
  );
};

// ============================================================================
// AI Insights Panel
// ============================================================================

const AIInsightsPanel: React.FC = () => {
  const insights = [
    {
      type: 'optimization',
      title: 'Workflow Optimization',
      description: 'Your "Email Campaign" workflow can be 23% faster with parallel execution.',
      action: 'Optimize Now',
      priority: 'high',
    },
    {
      type: 'prediction',
      title: 'Failure Prediction',
      description: 'API rate limit may be reached in 2 hours based on current usage.',
      action: 'View Details',
      priority: 'medium',
    },
    {
      type: 'suggestion',
      title: 'New Integration',
      description: 'Based on your workflows, you might benefit from the Slack integration.',
      action: 'Learn More',
      priority: 'low',
    },
  ];

  return (
    <LinearCard className="h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg" style={{ background: 'var(--linear-gradient-pink)' }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-[var(--linear-text-primary)]">AI Insights</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--linear-accent-purple)]/20 text-[var(--linear-accent-purple)]">
          3 new
        </span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-[var(--linear-surface-2)] border border-[var(--linear-border-subtle)] linear-animate-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className={`
                p-1.5 rounded-lg
                ${insight.priority === 'high' ? 'bg-[var(--linear-accent-red)]/20' :
                  insight.priority === 'medium' ? 'bg-[var(--linear-accent-yellow)]/20' :
                  'bg-[var(--linear-accent-blue)]/20'}
              `}>
                {insight.type === 'optimization' ? <Zap className="w-3.5 h-3.5" style={{ color: 'var(--linear-accent-red)' }} /> :
                 insight.type === 'prediction' ? <Target className="w-3.5 h-3.5" style={{ color: 'var(--linear-accent-yellow)' }} /> :
                 <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--linear-accent-blue)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--linear-text-primary)]">
                  {insight.title}
                </p>
                <p className="text-xs text-[var(--linear-text-muted)] mt-0.5">
                  {insight.description}
                </p>
                <button className="mt-2 text-xs font-medium text-[var(--linear-accent-purple)] hover:text-[var(--linear-accent-purple)]/80 flex items-center gap-1 transition-colors">
                  {insight.action}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </LinearCard>
  );
};

// ============================================================================
// Activity Stream Component
// ============================================================================

const ActivityStream: React.FC = () => {
  const activities = [
    { user: 'You', action: 'deployed', target: 'Email Campaign v2.1', time: '2m ago', avatar: '👤' },
    { user: 'System', action: 'auto-scaled', target: 'API Workers', time: '15m ago', avatar: '🤖' },
    { user: 'You', action: 'created', target: 'Data Sync Workflow', time: '1h ago', avatar: '👤' },
    { user: 'Alert', action: 'resolved', target: 'Rate limit warning', time: '2h ago', avatar: '🔔' },
    { user: 'You', action: 'updated', target: 'Slack Integration', time: '3h ago', avatar: '👤' },
  ];

  return (
    <LinearCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--linear-text-primary)]">Activity</h3>
        <button className="text-xs text-[var(--linear-accent-purple)] hover:text-[var(--linear-accent-purple)]/80 font-medium transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-start gap-3 linear-animate-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="text-lg">{activity.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--linear-text-secondary)]">
                <span className="font-medium text-[var(--linear-text-primary)]">{activity.user}</span>
                {' '}{activity.action}{' '}
                <span className="font-medium text-[var(--linear-text-primary)]">{activity.target}</span>
              </p>
              <p className="text-xs text-[var(--linear-text-muted)] mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </LinearCard>
  );
};

// ============================================================================
// System Health Widget
// ============================================================================

const SystemHealthWidget: React.FC = () => {
  const services = [
    { name: 'API Gateway', status: 'healthy', latency: 23 },
    { name: 'Database', status: 'healthy', latency: 12 },
    { name: 'Queue', status: 'healthy', latency: 8 },
    { name: 'Cache', status: 'warning', latency: 45 },
  ];

  return (
    <LinearCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5" style={{ color: 'var(--linear-accent-green)' }} />
          <h3 className="font-semibold text-[var(--linear-text-primary)]">System Health</h3>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--linear-accent-green)]/20 text-[var(--linear-accent-green)]">
          Operational
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {services.map((service, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--linear-surface-2)]"
          >
            <div className="flex items-center gap-2">
              <StatusIndicator status={service.status === 'healthy' ? 'success' : 'pending'} pulse={false} />
              <span className="text-sm font-medium text-[var(--linear-text-secondary)]">
                {service.name}
              </span>
            </div>
            <span className="text-xs text-[var(--linear-text-muted)]">{service.latency}ms</span>
          </div>
        ))}
      </div>
    </LinearCard>
  );
};

// ============================================================================
// Quick Actions Grid
// ============================================================================

const QuickActionsGrid: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const actions = [
    { icon: <Plus className="w-5 h-5" />, label: 'New Workflow', path: '/workflows', gradient: 'var(--linear-gradient-blue)' },
    { icon: <Upload className="w-5 h-5" />, label: 'Import', path: '/import-export', gradient: 'var(--linear-gradient-green)' },
    { icon: <Layers className="w-5 h-5" />, label: 'Templates', path: '/templates', gradient: 'var(--linear-gradient-purple)' },
    { icon: <Bot className="w-5 h-5" />, label: 'AI Builder', path: '/ai', gradient: 'var(--linear-gradient-pink)' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onNavigate(action.path)}
          className="
            flex flex-col items-center gap-2 p-4 rounded-xl
            bg-[var(--linear-surface-1)]
            border border-[var(--linear-border-subtle)]
            hover:bg-[var(--linear-surface-2)]
            hover:border-[var(--linear-border-default)]
            transition-all duration-200
            linear-hover-lift
          "
        >
          <div
            className="p-3 rounded-xl text-white"
            style={{ background: action.gradient }}
          >
            {action.icon}
          </div>
          <span className="text-xs font-medium text-[var(--linear-text-secondary)]">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// Main Bento Dashboard Component
// ============================================================================

const BentoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { nodes, workflows } = useWorkflowStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [chartData] = useState(() =>
    Array.from({ length: 24 }, () => Math.floor(Math.random() * 100) + 20)
  );

  // Mock recent executions
  const recentExecutions: WorkflowExecution[] = useMemo(() => [
    { id: '1', name: 'Email Campaign', status: 'success', duration: 1234, timestamp: new Date(), nodes: 8 },
    { id: '2', name: 'Data Sync', status: 'running', timestamp: new Date(Date.now() - 60000), nodes: 12 },
    { id: '3', name: 'API Integration', status: 'success', duration: 567, timestamp: new Date(Date.now() - 120000), nodes: 5 },
    { id: '4', name: 'Report Generator', status: 'error', duration: 890, timestamp: new Date(Date.now() - 180000), nodes: 15 },
    { id: '5', name: 'Slack Notification', status: 'success', duration: 234, timestamp: new Date(Date.now() - 240000), nodes: 3 },
  ], []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [currentTime]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--linear-bg-primary)] linear-animate-in">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[var(--linear-accent-purple)]/5 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-[var(--linear-accent-blue)]/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 rounded-full bg-[var(--linear-accent-pink)]/5 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--linear-text-primary)] linear-text-h1">
                {greeting}! <span className="wave inline-block">👋</span>
              </h1>
              <p className="text-[var(--linear-text-secondary)] mt-1">
                Here's what's happening with your workflows today
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="linear-icon-btn">
                <Bell className="w-5 h-5" />
              </button>
              <button className="linear-icon-btn">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActionsGrid onNavigate={handleNavigate} />
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(140px,auto)] linear-stagger">
          {/* Large KPI Card - Executions */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2">
            <LinearCard className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl" style={{ background: 'var(--linear-gradient-blue)' }}>
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-[var(--linear-text-secondary)]">Executions Today</span>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--linear-accent-green)]/20 text-[var(--linear-accent-green)]">
                  +12.5%
                </span>
              </div>
              <div className="text-4xl font-bold text-[var(--linear-text-primary)] mb-2">
                <AnimatedCounter value={1247} />
              </div>
              <p className="text-sm text-[var(--linear-text-muted)] mb-4">
                <span className="text-[var(--linear-accent-green)]">↑ 156</span> from yesterday
              </p>
              <div className="flex-1 mt-auto">
                <SparklineChart data={chartData} color="var(--linear-accent-blue)" height={80} />
              </div>
            </LinearCard>
          </div>

          {/* Success Rate Ring */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <LinearCard className="h-full flex flex-col items-center justify-center">
              <ProgressRing progress={94.5} size={90} />
              <p className="text-sm font-medium text-[var(--linear-text-secondary)] mt-3">Success Rate</p>
              <p className="text-xs text-[var(--linear-accent-green)]">+2.3% this week</p>
            </LinearCard>
          </div>

          {/* Active Workflows */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <QuickStatWidget
              label="Active Workflows"
              value={Object.keys(workflows).length || 24}
              change={8}
              changeType="positive"
              icon={<Workflow className="w-5 h-5" />}
              gradient="var(--linear-gradient-purple)"
            />
          </div>

          {/* Nodes Count */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <QuickStatWidget
              label="Total Nodes"
              value={nodes.length || 156}
              change={15}
              changeType="positive"
              icon={<Layers className="w-5 h-5" />}
              gradient="var(--linear-gradient-sunset)"
            />
          </div>

          {/* Error Rate */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <QuickStatWidget
              label="Error Rate"
              value="2.1%"
              change={-0.5}
              changeType="positive"
              icon={<AlertTriangle className="w-5 h-5" />}
              gradient="linear-gradient(135deg, var(--linear-accent-red) 0%, #f97316 100%)"
            />
          </div>

          {/* AI Insights - Tall */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2">
            <AIInsightsPanel />
          </div>

          {/* Recent Executions */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2">
            <LinearCard className="h-full" noPadding>
              <div className="p-5 pb-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[var(--linear-text-primary)]">Recent Executions</h3>
                  <button className="text-xs text-[var(--linear-accent-purple)] hover:text-[var(--linear-accent-purple)]/80 font-medium flex items-center gap-1 transition-colors">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="px-2 pb-2">
                {recentExecutions.map((execution, index) => (
                  <div key={execution.id} className="linear-animate-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <ExecutionItem execution={execution} />
                  </div>
                ))}
              </div>
            </LinearCard>
          </div>

          {/* Activity Stream */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 row-span-2">
            <ActivityStream />
          </div>

          {/* System Health */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <SystemHealthWidget />
          </div>

          {/* Performance Chart */}
          <div className="col-span-12 lg:col-span-8">
            <LinearCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-[var(--linear-text-muted)]" />
                  <h3 className="font-semibold text-[var(--linear-text-primary)]">Performance Overview</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--linear-accent-purple)]/20 text-[var(--linear-accent-purple)]">
                    24h
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--linear-text-muted)] hover:bg-[var(--linear-surface-hover)] transition-colors">
                    7d
                  </button>
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--linear-text-muted)] hover:bg-[var(--linear-surface-hover)] transition-colors">
                    30d
                  </button>
                </div>
              </div>
              <div className="h-32">
                <SparklineChart
                  data={Array.from({ length: 48 }, () => Math.floor(Math.random() * 60) + 40)}
                  color="var(--linear-accent-purple)"
                  height={128}
                />
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--linear-border-subtle)]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--linear-text-primary)]">23ms</p>
                  <p className="text-xs text-[var(--linear-text-muted)]">Avg. Latency</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--linear-text-primary)]">99.9%</p>
                  <p className="text-xs text-[var(--linear-text-muted)]">Uptime</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--linear-text-primary)]">4.2k</p>
                  <p className="text-xs text-[var(--linear-text-muted)]">Requests/min</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--linear-text-primary)]">0</p>
                  <p className="text-xs text-[var(--linear-text-muted)]">Errors</p>
                </div>
              </div>
            </LinearCard>
          </div>
        </div>
      </div>

      {/* CSS for wave animation */}
      <style>{`
        .wave {
          animation-name: wave;
          animation-duration: 2.5s;
          animation-iteration-count: infinite;
          transform-origin: 70% 70%;
        }

        @keyframes wave {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default BentoDashboard;
