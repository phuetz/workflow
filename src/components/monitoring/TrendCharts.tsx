/**
 * Trend Charts
 * Visualizes workflow metrics trends and forecasts
 */

import React, { useMemo } from 'react';
import { IntelligenceMetrics, TrendAnalysis } from '../../types/intelligence';

interface TrendChartsProps {
  workflowId?: string;
  metrics: IntelligenceMetrics[];
  className?: string;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({
  workflowId,
  metrics,
  className = '',
}) => {
  // Aggregate trends from all workflows
  const aggregatedTrends = useMemo(() => {
    const trends = {
      usage: [] as TrendAnalysis[],
      performance: [] as TrendAnalysis[],
      cost: [] as TrendAnalysis[],
      errorRate: [] as TrendAnalysis[],
    };

    metrics.forEach(metric => {
      if (metric.trends.usage) trends.usage.push(metric.trends.usage);
      if (metric.trends.performance) trends.performance.push(metric.trends.performance);
      if (metric.trends.cost) trends.cost.push(metric.trends.cost);
      if (metric.trends.errorRate) trends.errorRate.push(metric.trends.errorRate);
    });

    return trends;
  }, [metrics]);

  const renderMiniChart = (trend: TrendAnalysis) => {
    const points = trend.dataPoints.slice(-30); // Last 30 points
    if (points.length < 2) return null;

    const values = points.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const pathData = points
      .map((point, i) => {
        const x = (i / (points.length - 1)) * 100;
        const y = 100 - ((point.value - min) / range) * 100;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    return (
      <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  const getTrendColor = (direction: TrendAnalysis['direction']): string => {
    switch (direction) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
    }
  };

  const getTrendIcon = (direction: TrendAnalysis['direction']): string => {
    switch (direction) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
    }
  };

  return (
    <div className={`trend-charts ${className}`}>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Trends & Forecasts</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Usage Trend */}
        {aggregatedTrends.usage.length > 0 && (
          <TrendCard
            title="Usage Trend"
            icon="📊"
            trend={aggregatedTrends.usage[0]}
            renderChart={renderMiniChart}
            getTrendColor={getTrendColor}
            getTrendIcon={getTrendIcon}
          />
        )}

        {/* Performance Trend */}
        {aggregatedTrends.performance.length > 0 && (
          <TrendCard
            title="Performance Trend"
            icon="⚡"
            trend={aggregatedTrends.performance[0]}
            renderChart={renderMiniChart}
            getTrendColor={getTrendColor}
            getTrendIcon={getTrendIcon}
          />
        )}

        {/* Cost Trend */}
        {aggregatedTrends.cost.length > 0 && (
          <TrendCard
            title="Cost Trend"
            icon="💰"
            trend={aggregatedTrends.cost[0]}
            renderChart={renderMiniChart}
            getTrendColor={getTrendColor}
            getTrendIcon={getTrendIcon}
          />
        )}

        {/* Error Rate Trend */}
        {aggregatedTrends.errorRate.length > 0 && (
          <TrendCard
            title="Error Rate Trend"
            icon="⚠️"
            trend={aggregatedTrends.errorRate[0]}
            renderChart={renderMiniChart}
            getTrendColor={getTrendColor}
            getTrendIcon={getTrendIcon}
          />
        )}
      </div>
    </div>
  );
};

interface TrendCardProps {
  title: string;
  icon: string;
  trend: TrendAnalysis;
  renderChart: (trend: TrendAnalysis) => React.ReactNode;
  getTrendColor: (direction: TrendAnalysis['direction']) => string;
  getTrendIcon: (direction: TrendAnalysis['direction']) => string;
}

const TrendCard: React.FC<TrendCardProps> = ({
  title,
  icon,
  trend,
  renderChart,
  getTrendColor,
  getTrendIcon,
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor(trend.direction)}`}>
        <span className="text-xl">{getTrendIcon(trend.direction)}</span>
        <span>{Math.abs(trend.changePercent).toFixed(1)}%</span>
      </div>
    </div>

    {/* Chart */}
    <div className={`mb-4 ${getTrendColor(trend.direction)}`}>
      {renderChart(trend)}
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div>
        <div className="text-xs text-gray-600 mb-1">Current</div>
        <div className="text-lg font-semibold text-gray-900">
          {trend.currentValue.toFixed(2)}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-600 mb-1">Change</div>
        <div className={`text-lg font-semibold ${getTrendColor(trend.direction)}`}>
          {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-600 mb-1">Forecast</div>
        <div className="text-lg font-semibold text-gray-900">
          {trend.forecast.value.toFixed(2)}
        </div>
      </div>
    </div>

    {/* Forecast Range */}
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>Forecast Range</span>
        <span>{(trend.forecast.confidence * 100).toFixed(0)}% confidence</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-700">
          {trend.forecast.confidenceInterval.lower.toFixed(2)}
        </span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{
              marginLeft: '25%',
              width: '50%',
            }}
          />
        </div>
        <span className="text-gray-700">
          {trend.forecast.confidenceInterval.upper.toFixed(2)}
        </span>
      </div>
    </div>

    {/* Metadata */}
    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
      {trend.period.days} days • {trend.dataPoints.length} data points • p-value: {trend.significance.toFixed(3)}
    </div>
  </div>
);

export default TrendCharts;
