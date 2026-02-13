/**
 * Usage Modal Component
 * Displays detailed API key usage statistics
 */

import React from 'react';
import { X, Activity, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import type { APIKey, APIUsageStats } from '../../../types/api';
import {
  formatNumber,
  getMethodBadgeClass,
  getStatusCodeColor,
  getStatusDotColor
} from './useAPIMetrics';

interface UsageModalProps {
  darkMode: boolean;
  apiKey: APIKey;
  usage: APIUsageStats;
  onClose: () => void;
}

export function UsageModal({
  darkMode,
  apiKey,
  usage,
  onClose
}: UsageModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2
              className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              API Usage - {apiKey.name}
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              } transition-colors`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Usage Stats */}
          <UsageStatsGrid darkMode={darkMode} usage={usage} />

          {/* Top Endpoints */}
          <TopEndpointsSection darkMode={darkMode} endpoints={usage.topEndpoints} />

          {/* Recent Activity */}
          <RecentActivitySection
            darkMode={darkMode}
            activities={usage.recentActivity}
          />
        </div>
      </div>
    </div>
  );
}

interface UsageStatsGridProps {
  darkMode: boolean;
  usage: APIUsageStats;
}

function UsageStatsGrid({ darkMode, usage }: UsageStatsGridProps) {
  const stats = [
    {
      icon: Activity,
      iconColor: 'text-blue-500',
      label: 'Total Requests',
      value: formatNumber(usage.totalRequests)
    },
    {
      icon: Clock,
      iconColor: 'text-green-500',
      label: 'Avg Response',
      value: `${usage.averageResponseTime.toFixed(0)}ms`
    },
    {
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      label: 'Error Rate',
      value: `${usage.errorRate.toFixed(1)}%`
    },
    {
      icon: TrendingUp,
      iconColor: 'text-purple-500',
      label: 'This Month',
      value: formatNumber(usage.requestsThisMonth)
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}
        >
          <div className="flex items-center space-x-2 mb-2">
            <stat.icon size={16} className={stat.iconColor} />
            <span
              className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {stat.label}
            </span>
          </div>
          <p
            className={`text-xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

interface TopEndpointsSectionProps {
  darkMode: boolean;
  endpoints: APIUsageStats['topEndpoints'];
}

function TopEndpointsSection({ darkMode, endpoints }: TopEndpointsSectionProps) {
  return (
    <div>
      <h3
        className={`text-lg font-medium mb-3 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        Top Endpoints
      </h3>
      <div className="space-y-2">
        {endpoints.map((endpoint, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}
          >
            <div>
              <span
                className={`px-2 py-1 text-xs font-mono rounded ${getMethodBadgeClass(
                  endpoint.method
                )}`}
              >
                {endpoint.method}
              </span>
              <code
                className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                {endpoint.endpoint}
              </code>
            </div>
            <div className="text-right">
              <div
                className={`text-sm font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {formatNumber(endpoint.requests)} requests
              </div>
              <div
                className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {endpoint.averageResponseTime.toFixed(0)}ms avg
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RecentActivitySectionProps {
  darkMode: boolean;
  activities: APIUsageStats['recentActivity'];
}

function RecentActivitySection({
  darkMode,
  activities
}: RecentActivitySectionProps) {
  return (
    <div>
      <h3
        className={`text-lg font-medium mb-3 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        Recent Activity
      </h3>
      <div className="space-y-2">
        {activities.map((activity, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-2 h-2 rounded-full ${getStatusDotColor(
                  activity.statusCode
                )}`}
              />
              <span
                className={`px-2 py-1 text-xs font-mono rounded ${getMethodBadgeClass(
                  activity.method
                )}`}
              >
                {activity.method}
              </span>
              <code
                className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                {activity.endpoint}
              </code>
            </div>
            <div className="text-right">
              <div className={`text-sm ${getStatusCodeColor(activity.statusCode)}`}>
                {activity.statusCode}
              </div>
              <div
                className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {activity.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
