import React, { useState, /* useEffect, */ useMemo, useCallback } from 'react';
import {
  LineChart, Line, /* AreaChart, */ Area, /* BarChart, */ Bar, PieChart, Pie, Cell,
  /* ScatterChart, Scatter, */ ComposedChart, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush,
  ReferenceLine, ReferenceArea /*, ErrorBar */
} from 'recharts';

// Types
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  tags?: { [key: string]: string };
  metadata?: { [key: string]: unknown };
}

export interface MetricSeries {
  name: string;
  color: string;
  data: MetricDataPoint[];
  unit?: string;
  type: 'line' | 'area' | 'bar' | 'scatter';
  yAxis?: 'left' | 'right';
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface VisualizationConfig {
  type: 'timeseries' | 'histogram' | 'pie' | 'gauge' | 'heatmap' | 'table' | 'singlestat';
  title: string;
  description?: string;
  timeRange: { from: number; to: number };
  refreshInterval?: number;
  width?: number;
  height?: number;
  legend?: {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  axes?: {
    x?: {
      label?: string;
      type?: 'time' | 'category' | 'number';
      format?: string;
      min?: number;
      max?: number;
    };
    y?: {
      label?: string;
      type?: 'linear' | 'log';
      format?: string;
      min?: number;
      max?: number;
      unit?: string;
    };
    yRight?: {
      label?: string;
      type?: 'linear' | 'log';
      format?: string;
      min?: number;
      max?: number;
      unit?: string;
    };
  };
  thresholds?: Array<{
    value: number;
    color: string;
    label?: string;
    operator?: 'gt' | 'lt' | 'eq';
  }>;
  annotations?: Array<{
    x?: number;
    y?: number;
    xFrom?: number;
    xTo?: number;
    yFrom?: number;
    yTo?: number;
    text: string;
    color?: string;
    style?: 'line' | 'area' | 'point';
  }>;
  colors?: string[];
  styling?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    opacity?: number;
    gradient?: boolean;
    smooth?: boolean;
    showPoints?: boolean;
    pointSize?: number;
    strokeWidth?: number;
  };
}

export interface DashboardLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  resizeHandles?: ('s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne')[];
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: string;
  config: VisualizationConfig;
  layout: DashboardLayout;
  query: MetricQuery;
  data?: MetricSeries[];
  isLoading?: boolean;
  error?: string;
}

export interface MetricQuery {
  metrics: string[];
  filters?: { [key: string]: string[] };
  groupBy?: string[];
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'rate';
  timeRange: { from: number; to: number };
  interval?: string;
  limit?: number;
}

// Components
export interface TimeSeriesChartProps {
  series: MetricSeries[];
  config: VisualizationConfig;
  onPointClick?: (point: MetricDataPoint, series: MetricSeries) => void;
  onBrushChange?: (range: { from: number; to: number }) => void;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  series,
  config,
  onPointClick: _onPointClick, // eslint-disable-line @typescript-eslint/no-unused-vars
  onBrushChange
}) => {
  const [_selectedRange, setSelectedRange] = useState<{ from?: number; to?: number }>({}); // eslint-disable-line @typescript-eslint/no-unused-vars

  const data = useMemo(() => {
    if (series.length === 0) return [];

    // Combine all series data by timestamp
    const timeMap = new Map<number, unknown>();
    
    series.forEach(s => {
      s.data.forEach(point => {
        if (!timeMap.has(point.timestamp)) {
          timeMap.set(point.timestamp, { timestamp: point.timestamp });
        }
        timeMap.get(point.timestamp)![s.name] = point.value;
      });
    });

    return Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [series]);

  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }, []);

  const formatValue = useCallback((value: number, unit?: string) => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';

    let formatted: string;
    if (Math.abs(value) >= 1e9) {
      formatted = (value / 1e9).toFixed(2) + 'B';
    } else if (Math.abs(value) >= 1e6) {
      formatted = (value / 1e6).toFixed(2) + 'M';
    } else if (Math.abs(value) >= 1e3) {
      formatted = (value / 1e3).toFixed(2) + 'K';
    } else if (Math.abs(value) >= 1) {
      formatted = value.toFixed(2);
    } else {
      formatted = value.toFixed(4);
    }

    return unit ? `${formatted} ${unit}` : formatted;
  }, []);

  const CustomTooltip = ({ active, payload, label }: unknown) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatTimestamp(label)}
        </p>
        {payload.map((entry: unknown, index: number) => {
          const series = series.find(s => s.name === entry.dataKey);
          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {formatValue(entry.value, series?.unit)}
            </p>
          );
        })}
      </div>
    );
  };

  const handleBrushChange = (brushData: unknown) => {
    if (brushData?.startIndex !== undefined && brushData?.endIndex !== undefined) {
      const startTime = data[brushData.startIndex]?.timestamp;
      const endTime = data[brushData.endIndex]?.timestamp;
      
      if (startTime && endTime) {
        setSelectedRange({ from: startTime, to: endTime });
        onBrushChange?.({ from: startTime, to: endTime });
      }
    }
  };

  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {config.title}
        </h3>
        {config.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {config.description}
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          
          <XAxis 
            dataKey="timestamp"
            tickFormatter={formatTimestamp}
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 12 }}
            tickCount={8}
          />
          
          <YAxis 
            yAxisId="left"
            tickFormatter={(value) => formatValue(value, config.axes?.y?.unit)}
            tick={{ fontSize: 12 }}
            label={{ 
              value: config.axes?.y?.label || 'Value', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
          />
          
          {config.axes?.yRight && (
            <YAxis 
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => formatValue(value, config.axes?.yRight?.unit)}
              tick={{ fontSize: 12 }}
              label={{ 
                value: config.axes?.yRight?.label || 'Value', 
                angle: 90, 
                position: 'insideRight',
                style: { fontSize: 12 }
              }}
            />
          )}

          <Tooltip content={<CustomTooltip />} />
          
          {config.legend?.show && (
            <Legend 
              verticalAlign={config.legend.position === 'top' ? 'top' : 'bottom'}
              height={36}
              wrapperStyle={{ fontSize: 12 }}
            />
          )}

          {/* Render threshold lines */}
          {config.thresholds?.map((threshold, index) => (
            <ReferenceLine
              key={index}
              yAxisId="left"
              y={threshold.value}
              stroke={threshold.color}
              strokeDasharray="5 5"
              label={threshold.label}
            />
          ))}

          {/* Render annotation areas */}
          {config.annotations?.filter(a => a.style === 'area').map((annotation, index) => (
            <ReferenceArea
              key={index}
              x1={annotation.xFrom}
              x2={annotation.xTo}
              y1={annotation.yFrom}
              y2={annotation.yTo}
              fill={annotation.color || '#ff7300'}
              fillOpacity={0.2}
              label={annotation.text}
            />
          ))}

          {/* Render series */}
          {series.map((s, index) => {
            const color = s.color || config.colors?.[index % (config.colors?.length || 10)] || '#8884d8';
            const yAxisId = s.yAxis || 'left';

            if (s.type === 'area') {
              return (
                <Area
                  key={s.name}
                  yAxisId={yAxisId}
                  type={config.styling?.smooth ? 'monotone' : 'linear'}
                  dataKey={s.name}
                  stroke={color}
                  fill={color}
                  fillOpacity={config.styling?.opacity || 0.3}
                  strokeWidth={config.styling?.strokeWidth || 2}
                />
              );
            } else if (s.type === 'bar') {
              return (
                <Bar
                  key={s.name}
                  yAxisId={yAxisId}
                  dataKey={s.name}
                  fill={color}
                  opacity={config.styling?.opacity || 0.8}
                />
              );
            } else {
              return (
                <Line
                  key={s.name}
                  yAxisId={yAxisId}
                  type={config.styling?.smooth ? 'monotone' : 'linear'}
                  dataKey={s.name}
                  stroke={color}
                  strokeWidth={config.styling?.strokeWidth || 2}
                  dot={config.styling?.showPoints ? { r: config.styling?.pointSize || 3 } : false}
                  activeDot={{ r: 6 }}
                />
              );
            }
          })}

          {/* Brush for time selection */}
          <Brush
            dataKey="timestamp"
            height={30}
            stroke="#8884d8"
            tickFormatter={formatTimestamp}
            onChange={handleBrushChange}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface PieChartVisualizationProps {
  data: Array<{ name: string; value: number; color?: string }>;
  config: VisualizationConfig;
  onSliceClick?: (slice: { name: string; value: number }) => void;
}

export const PieChartVisualization: React.FC<PieChartVisualizationProps> = ({
  data,
  config,
  onSliceClick
}) => {
  const COLORS = config.colors || ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const formatValue = useCallback((value: number) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const percentage = ((value / total) * 100).toFixed(1);
    return `${value} (${percentage}%)`;
  }, [data]);

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: unknown) => {
    if (percent < 0.05) return null; // Hide labels for slices < 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: unknown) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {data.name}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatValue(data.value)}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {config.title}
        </h3>
        {config.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {config.description}
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={<CustomLabel />}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            onClick={onSliceClick}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {config.legend?.show && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  thresholds?: Array<{ value: number; color: string; label?: string }>;
  config: VisualizationConfig;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  min = 0,
  max = 100,
  thresholds = [],
  config
}) => {
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  const angle = (percentage / 100) * 180;

  const getThresholdColor = (val: number) => {
    const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value);
    
    for (let i = sortedThresholds.length - 1; i >= 0; i--) {
      if (val >= sortedThresholds[i].value) {
        return sortedThresholds[i].color;
      }
    }
    
    return '#10B981'; // Default green
  };

  const needleColor = getThresholdColor(normalizedValue);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {config.title}
        </h3>
        {config.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {config.description}
          </p>
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <svg width="300" height="200" viewBox="0 0 300 200" className="max-w-full max-h-full">
          {/* Gauge background */}
          <path
            d="M 50 150 A 100 100 0 0 1 250 150"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Threshold arcs */}
          {thresholds.map((threshold, index) => {
            const thresholdAngle = ((threshold.value - min) / (max - min)) * 180;
            const startAngle = index === 0 ? 0 : (((thresholds[index - 1]?.value || min) - min) / (max - min)) * 180;
            const endAngle = thresholdAngle;
            
            if (startAngle >= endAngle) return null;

            const startX = 150 + 100 * Math.cos((Math.PI * (180 - startAngle)) / 180);
            const startY = 150 - 100 * Math.sin((Math.PI * (180 - startAngle)) / 180);
            const endX = 150 + 100 * Math.cos((Math.PI * (180 - endAngle)) / 180);
            const endY = 150 - 100 * Math.sin((Math.PI * (180 - endAngle)) / 180);

            const largeArcFlag = (endAngle - startAngle) > 90 ? 1 : 0;

            return (
              <path
                key={index}
                d={`M ${startX} ${startY} A 100 100 0 ${largeArcFlag} 0 ${endX} ${endY}`}
                fill="none"
                stroke={threshold.color}
                strokeWidth="20"
                strokeLinecap="round"
              />
            );
          })}

          {/* Needle */}
          <g transform={`rotate(${angle - 90} 150 150)`}>
            <line
              x1="150"
              y1="150"
              x2="150"
              y2="60"
              stroke={needleColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="150" cy="150" r="8" fill={needleColor} />
          </g>

          {/* Value text */}
          <text
            x="150"
            y="180"
            textAnchor="middle"
            className="fill-current text-2xl font-bold text-gray-900 dark:text-gray-100"
          >
            {normalizedValue.toFixed(1)}
          </text>

          {/* Min/Max labels */}
          <text x="60" y="165" textAnchor="middle" className="fill-current text-sm text-gray-600 dark:text-gray-400">
            {min}
          </text>
          <text x="240" y="165" textAnchor="middle" className="fill-current text-sm text-gray-600 dark:text-gray-400">
            {max}
          </text>
        </svg>
      </div>

      {/* Threshold legend */}
      {thresholds.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {thresholds.map((threshold, index) => (
            <div key={index} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: threshold.color }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {threshold.label || `${threshold.value}+`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export interface SingleStatProps {
  value: number;
  previousValue?: number;
  config: VisualizationConfig;
  sparklineData?: MetricDataPoint[];
}

export const SingleStat: React.FC<SingleStatProps> = ({
  value,
  previousValue,
  config,
  sparklineData
}) => {
  const formatValue = useCallback((val: number) => {
    if (typeof val !== 'number' || isNaN(val)) return 'N/A';

    const unit = config.axes?.y?.unit || '';
    
    if (Math.abs(val) >= 1e9) {
      return (val / 1e9).toFixed(2) + 'B' + (unit ? ` ${unit}` : '');
    } else if (Math.abs(val) >= 1e6) {
      return (val / 1e6).toFixed(2) + 'M' + (unit ? ` ${unit}` : '');
    } else if (Math.abs(val) >= 1e3) {
      return (val / 1e3).toFixed(2) + 'K' + (unit ? ` ${unit}` : '');
    } else if (Math.abs(val) >= 1) {
      return val.toFixed(2) + (unit ? ` ${unit}` : '');
    } else {
      return val.toFixed(4) + (unit ? ` ${unit}` : '');
    }
  }, [config.axes?.y?.unit]);

  const getValueColor = (val: number) => {
    if (!config.thresholds) return 'text-gray-900 dark:text-gray-100';

    const sortedThresholds = [...config.thresholds].sort((a, b) => b.value - a.value);
    
    for (const threshold of sortedThresholds) {
      const isAboveThreshold = threshold.operator === 'gt' ? val > threshold.value :
                             threshold.operator === 'lt' ? val < threshold.value :
                             val === threshold.value;
      
      if (isAboveThreshold) {
        return threshold.color;
      }
    }
    
    return 'text-gray-900 dark:text-gray-100';
  };

  const calculateChange = () => {
    if (previousValue === undefined || previousValue === 0) return null;
    
    const change = ((value - previousValue) / previousValue) * 100;
    return {
      percentage: change,
      isPositive: change > 0,
      isSignificant: Math.abs(change) > 5
    };
  };

  const change = calculateChange();
  const valueColor = getValueColor(value);

  return (
    <div className="w-full h-full p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {config.title}
        </h3>
        {config.description && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {config.description}
          </p>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex-1">
          <div className={`text-3xl font-bold ${valueColor}`}>
            {formatValue(value)}
          </div>

          {change && (
            <div className="flex items-center mt-1">
              <span className={`text-sm font-medium ${
                change.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.isPositive ? '↗' : '↘'} {Math.abs(change.percentage).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
                vs previous
              </span>
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="w-24 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData.map(d => ({ value: d.value }))}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={change?.isPositive ? '#10B981' : '#EF4444'} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Threshold indicators */}
      {config.thresholds && config.thresholds.length > 0 && (
        <div className="mt-4 space-y-1">
          {config.thresholds.map((threshold, index) => (
            <div key={index} className="flex items-center text-xs">
              <div 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: threshold.color }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {threshold.label || `${threshold.operator || 'gt'} ${threshold.value}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export interface MetricTableProps {
  data: Array<{ [key: string]: unknown }>;
  config: VisualizationConfig & {
    columns?: Array<{
      key: string;
      label: string;
      type?: 'string' | 'number' | 'date' | 'duration' | 'bytes';
      format?: string;
      sortable?: boolean;
      width?: number;
    }>;
  };
  onRowClick?: (row: unknown) => void;
}

export const MetricTable: React.FC<MetricTableProps> = ({
  data,
  config,
  onRowClick
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const columns = config.columns || Object.keys(data[0] || {}).map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    sortable: true
  }));

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * direction;
      }
      
      return String(aVal).localeCompare(String(bVal)) * direction;
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatCellValue = (value: unknown, column: typeof columns[0]) => {
    if (value === null || value === undefined) return 'N/A';

    switch (column.type) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'duration':
        return `${value}ms`;
      case 'bytes':
        if (typeof value === 'number') {
          if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
          if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB`;
          if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KB`;
          return `${value} B`;
        }
        return value;
      default:
        return value;
    }
  };

  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {config.title}
        </h3>
        {config.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {config.description}
          </p>
        )}
      </div>

      <div className="overflow-auto h-full">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && sortConfig?.key === column.key && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className={`${
                  onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                  >
                    {formatCellValue(row[column.key], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default {
  TimeSeriesChart,
  PieChartVisualization,
  GaugeChart,
  SingleStat,
  MetricTable
};