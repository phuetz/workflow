/**
 * Cost Breakdown Widget
 *
 * Interactive widget for visualizing cost breakdown across different
 * dimensions with charts and detailed analytics.
 */

import React, { useState, useMemo } from 'react';
import {
  CostAttribution,
  CostCategory,
} from '../../observability/types/observability';

interface CostBreakdownWidgetProps {
  costData: CostAttribution;
  onDrillDown?: (dimension: string, id: string) => void;
}

export const CostBreakdownWidget: React.FC<CostBreakdownWidgetProps> = ({
  costData,
  onDrillDown,
}) => {
  const [selectedDimension, setSelectedDimension] = useState<
    'category' | 'agent' | 'workflow' | 'user' | 'team'
  >('category');

  // Calculate percentages
  const breakdown = useMemo(() => {
    let data: Array<{ id: string; label: string; value: number; percentage: number; color: string }> = [];

    switch (selectedDimension) {
      case 'category':
        data = Object.entries(costData.byCategory).map(([category, value], index) => ({
          id: category,
          label: category.toUpperCase(),
          value,
          percentage: (value / costData.total) * 100,
          color: getCategoryColor(category as CostCategory),
        }));
        break;

      case 'agent':
        data = Object.entries(costData.byAgent)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id, value], index) => ({
            id,
            label: `Agent ${id.substring(0, 8)}`,
            value,
            percentage: (value / costData.total) * 100,
            color: getColorByIndex(index),
          }));
        break;

      case 'workflow':
        data = Object.entries(costData.byWorkflow)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id, value], index) => ({
            id,
            label: `Workflow ${id.substring(0, 8)}`,
            value,
            percentage: (value / costData.total) * 100,
            color: getColorByIndex(index),
          }));
        break;

      case 'user':
        data = Object.entries(costData.byUser)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id, value], index) => ({
            id,
            label: `User ${id.substring(0, 8)}`,
            value,
            percentage: (value / costData.total) * 100,
            color: getColorByIndex(index),
          }));
        break;

      case 'team':
        data = Object.entries(costData.byTeam)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id, value], index) => ({
            id,
            label: `Team ${id}`,
            value,
            percentage: (value / costData.total) * 100,
            color: getColorByIndex(index),
          }));
        break;
    }

    return data.filter(d => d.value > 0);
  }, [costData, selectedDimension]);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Cost Breakdown</h3>
          <div className="text-2xl font-bold text-purple-600">
            ${costData.total.toFixed(2)}
          </div>
        </div>

        {/* Dimension Selector */}
        <div className="flex gap-2 mt-4">
          <DimensionButton
            label="Category"
            active={selectedDimension === 'category'}
            onClick={() => setSelectedDimension('category')}
          />
          <DimensionButton
            label="Agent"
            active={selectedDimension === 'agent'}
            onClick={() => setSelectedDimension('agent')}
          />
          <DimensionButton
            label="Workflow"
            active={selectedDimension === 'workflow'}
            onClick={() => setSelectedDimension('workflow')}
          />
          <DimensionButton
            label="User"
            active={selectedDimension === 'user'}
            onClick={() => setSelectedDimension('user')}
          />
          <DimensionButton
            label="Team"
            active={selectedDimension === 'team'}
            onClick={() => setSelectedDimension('team')}
          />
        </div>
      </div>

      {/* Visualization */}
      <div className="p-6">
        {/* Pie Chart */}
        <div className="mb-6">
          <PieChart data={breakdown} total={costData.total} />
        </div>

        {/* Table */}
        <div className="space-y-2">
          {breakdown.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onDrillDown?.(selectedDimension, item.id)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="text-sm font-medium text-gray-900">{item.label}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</div>
                <div className="text-sm font-semibold text-gray-900">
                  ${item.value.toFixed(4)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trends */}
        {costData.trends && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Cost Trends</h4>
            <div className="grid grid-cols-2 gap-4">
              <TrendCard
                label="Daily Average"
                value={`$${costData.trends.dailyAverage.toFixed(2)}`}
                trend={costData.trends.growth}
              />
              <TrendCard
                label="30-Day Forecast"
                value={`$${costData.trends.forecast30Days.toFixed(2)}`}
                trend={costData.trends.growth}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Dimension Button Component
const DimensionButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-3 py-1.5 text-sm rounded-lg transition-colors
      ${active
        ? 'bg-purple-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }
    `}
  >
    {label}
  </button>
);

// Simple Pie Chart Component
const PieChart: React.FC<{
  data: Array<{ id: string; label: string; value: number; color: string }>;
  total: number;
}> = ({ data, total }) => {
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  // Calculate pie slices
  const slices = useMemo(() => {
    let currentAngle = 0;
    return data.map((item) => {
      const percentage = item.value / total;
      const angle = percentage * 360;
      const slice = {
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage,
      };
      currentAngle += angle;
      return slice;
    });
  }, [data, total]);

  return (
    <div className="flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {slices.map((slice, index) => {
          const startAngle = (slice.startAngle - 90) * (Math.PI / 180);
          const endAngle = (slice.endAngle - 90) * (Math.PI / 180);

          const x1 = centerX + radius * Math.cos(startAngle);
          const y1 = centerY + radius * Math.sin(startAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);

          const largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

          const path = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            'Z',
          ].join(' ');

          return (
            <path
              key={slice.id}
              d={path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          );
        })}
      </svg>
    </div>
  );
};

// Trend Card Component
const TrendCard: React.FC<{
  label: string;
  value: string;
  trend: number;
}> = ({ label, value, trend }) => {
  const isPositive = trend > 0;
  const trendColor = isPositive ? 'text-red-600' : 'text-green-600';
  const trendIcon = isPositive ? '↑' : '↓';

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-lg font-semibold text-gray-900">{value}</div>
        <div className={`text-sm font-medium ${trendColor}`}>
          {trendIcon} {Math.abs(trend).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

// Color helpers
function getCategoryColor(category: CostCategory): string {
  const colors: Record<CostCategory, string> = {
    llm: '#10b981',       // green
    compute: '#3b82f6',   // blue
    storage: '#8b5cf6',   // purple
    network: '#f59e0b',   // amber
    external: '#ec4899',  // pink
  };
  return colors[category];
}

function getColorByIndex(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16', // lime
  ];
  return colors[index % colors.length];
}

export default CostBreakdownWidget;
