/**
 * Actionable Insights Panel
 * Connects metrics with actions using CTAs (2025 UX trend)
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap,
  ArrowRight, X, ChevronRight, Lightbulb, Target, Clock,
  AlertCircle, RefreshCw, Play, Settings, Sparkles, Bell,
  BarChart3, Activity
} from 'lucide-react';
import { Sparkline, ProgressRing, TrendBadge } from '../ui/MicroVisualizations';

// ============================================================================
// Types
// ============================================================================

type InsightType = 'optimization' | 'warning' | 'success' | 'trend' | 'action';
type InsightPriority = 'high' | 'medium' | 'low';

interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  metric?: {
    value: string | number;
    change?: number;
    label: string;
  };
  actions: InsightAction[];
  timestamp: Date;
  dismissed?: boolean;
}

interface InsightAction {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
  onClick: () => void;
}

interface ActionableInsightsPanelProps {
  insights?: Insight[];
  onInsightAction?: (insightId: string, actionId: string) => void;
  onDismiss?: (insightId: string) => void;
  maxVisible?: number;
  className?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const defaultInsights: Insight[] = [
  {
    id: '1',
    type: 'optimization',
    priority: 'high',
    title: 'Optimize Data Pipeline Performance',
    description: 'Your Data Pipeline workflow could be 35% faster by enabling parallel execution for independent nodes.',
    metric: {
      value: '2.4s',
      change: -35,
      label: 'Potential improvement',
    },
    actions: [
      { id: 'optimize', label: 'Apply optimization', variant: 'primary', icon: <Zap className="w-4 h-4" />, onClick: () => {} },
      { id: 'learn', label: 'Learn more', variant: 'ghost', onClick: () => {} },
    ],
    timestamp: new Date(),
  },
  {
    id: '2',
    type: 'warning',
    priority: 'high',
    title: 'API Rate Limit Warning',
    description: 'Your Slack integration is approaching rate limits. Consider implementing request queuing.',
    metric: {
      value: '85%',
      label: 'Rate limit usage',
    },
    actions: [
      { id: 'configure', label: 'Configure queuing', variant: 'primary', icon: <Settings className="w-4 h-4" />, onClick: () => {} },
      { id: 'view', label: 'View usage', variant: 'secondary', onClick: () => {} },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '3',
    type: 'success',
    priority: 'low',
    title: 'Email Workflow Performing Well',
    description: 'Your email notification workflow has a 99.2% success rate this week.',
    metric: {
      value: '99.2%',
      change: 2.1,
      label: 'Success rate',
    },
    actions: [
      { id: 'view', label: 'View details', variant: 'secondary', onClick: () => {} },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '4',
    type: 'trend',
    priority: 'medium',
    title: 'Execution Volume Increasing',
    description: 'Workflow executions are up 45% this week. Consider scaling your infrastructure.',
    metric: {
      value: '+45%',
      change: 45,
      label: 'Week over week',
    },
    actions: [
      { id: 'scale', label: 'Review scaling options', variant: 'primary', icon: <TrendingUp className="w-4 h-4" />, onClick: () => {} },
      { id: 'dismiss', label: 'Dismiss', variant: 'ghost', onClick: () => {} },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: '5',
    type: 'action',
    priority: 'medium',
    title: 'Pending Approval Required',
    description: '3 workflow changes are waiting for your approval before deployment.',
    actions: [
      { id: 'review', label: 'Review changes', variant: 'primary', icon: <CheckCircle className="w-4 h-4" />, onClick: () => {} },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
];

// ============================================================================
// Insight Card Component
// ============================================================================

const insightTypeConfig: Record<InsightType, {
  icon: React.ReactNode;
  bgColor: string;
  iconBg: string;
  borderColor: string;
  iconColor: string;
}> = {
  optimization: {
    icon: <Sparkles className="w-5 h-5" />,
    bgColor: 'bg-purple-50 dark:bg-purple-900/10',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    bgColor: 'bg-amber-50 dark:bg-amber-900/10',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    bgColor: 'bg-green-50 dark:bg-green-900/10',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  trend: {
    icon: <TrendingUp className="w-5 h-5" />,
    bgColor: 'bg-blue-50 dark:bg-blue-900/10',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  action: {
    icon: <Bell className="w-5 h-5" />,
    bgColor: 'bg-primary-50 dark:bg-primary-900/10',
    iconBg: 'bg-primary-100 dark:bg-primary-900/30',
    borderColor: 'border-primary-200 dark:border-primary-800',
    iconColor: 'text-primary-600 dark:text-primary-400',
  },
};

const priorityBadge: Record<InsightPriority, { label: string; color: string }> = {
  high: { label: 'High Priority', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const InsightCard: React.FC<{
  insight: Insight;
  onAction: (actionId: string) => void;
  onDismiss: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}> = ({ insight, onAction, onDismiss, isExpanded = false, onToggleExpand }) => {
  const config = insightTypeConfig[insight.type];
  const priority = priorityBadge[insight.priority];

  const timeAgo = useMemo(() => {
    const diff = Date.now() - insight.timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [insight.timestamp]);

  return (
    <div
      className={`
        relative rounded-xl border overflow-hidden
        transition-all duration-300 ease-out
        ${config.bgColor} ${config.borderColor}
        hover:shadow-md
        ${isExpanded ? 'shadow-lg' : ''}
      `}
    >
      {/* Priority indicator bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          insight.priority === 'high' ? 'bg-red-500' :
          insight.priority === 'medium' ? 'bg-amber-500' :
          'bg-gray-300 dark:bg-gray-600'
        }`}
      />

      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.iconBg} ${config.iconColor}`}>
            {config.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.color}`}>
                {priority.label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
            </div>

            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {insight.title}
            </h4>

            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {insight.description}
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metric */}
        {insight.metric && (
          <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{insight.metric.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {insight.metric.value}
                </span>
                {insight.metric.change !== undefined && (
                  <TrendBadge value={insight.metric.change} size="sm" />
                )}
              </div>
            </div>
            {insight.metric.change !== undefined && (
              <ProgressRing
                progress={Math.min(100, Math.abs(insight.metric.change))}
                size={48}
                strokeWidth={4}
                color={insight.metric.change > 0 ? '#22c55e' : '#ef4444'}
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {insight.actions.map(action => (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 hover:scale-105
                ${action.variant === 'primary'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                  : action.variant === 'secondary'
                  ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              {action.icon}
              {action.label}
              {action.variant === 'primary' && <ArrowRight className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ActionableInsightsPanel: React.FC<ActionableInsightsPanelProps> = ({
  insights = defaultInsights,
  onInsightAction,
  onDismiss,
  maxVisible = 5,
  className = '',
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InsightType | 'all'>('all');

  const visibleInsights = useMemo(() => {
    return insights
      .filter(i => !dismissedIds.has(i.id) && !i.dismissed)
      .filter(i => filter === 'all' || i.type === filter)
      .slice(0, maxVisible);
  }, [insights, dismissedIds, filter, maxVisible]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    onDismiss?.(id);
  };

  const handleAction = (insightId: string, actionId: string) => {
    onInsightAction?.(insightId, actionId);
  };

  const insightCounts = useMemo(() => {
    const active = insights.filter(i => !dismissedIds.has(i.id) && !i.dismissed);
    return {
      all: active.length,
      optimization: active.filter(i => i.type === 'optimization').length,
      warning: active.filter(i => i.type === 'warning').length,
      success: active.filter(i => i.type === 'success').length,
      trend: active.filter(i => i.type === 'trend').length,
      action: active.filter(i => i.type === 'action').length,
    };
  }, [insights, dismissedIds]);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Insights & Actions</h3>
            {insightCounts.all > 0 && (
              <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full">
                {insightCounts.all}
              </span>
            )}
          </div>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'optimization', 'warning', 'action', 'trend'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap
                transition-colors duration-150
                ${filter === type
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
              {insightCounts[type] > 0 && (
                <span className="ml-1 text-xs opacity-70">({insightCounts[type]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Insights list */}
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {visibleInsights.length > 0 ? (
          visibleInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAction={(actionId) => handleAction(insight.id, actionId)}
              onDismiss={() => handleDismiss(insight.id)}
              isExpanded={expandedId === insight.id}
              onToggleExpand={() => setExpandedId(prev => prev === insight.id ? null : insight.id)}
            />
          ))
        ) : (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">All caught up!</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              No {filter === 'all' ? '' : filter} insights require your attention.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {visibleInsights.length > 0 && insights.length > maxVisible && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button className="w-full py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex items-center justify-center gap-1">
            View all {insights.length - dismissedIds.size} insights
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ActionableInsightsPanel;
