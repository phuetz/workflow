/**
 * Micro-Visualization Components
 * Modern, lightweight visualizations following 2025 UX trends
 */

import React, { useMemo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================================================
// Sparkline - Compact trend visualization
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  showDots?: boolean;
  animated?: boolean;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 24,
  color = '#6366f1',
  showArea = true,
  showDots = false,
  animated = true,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(!animated);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [animated]);

  const { path, areaPath, points, minY, maxY } = useMemo(() => {
    if (!data.length) return { path: '', areaPath: '', points: [], minY: 0, maxY: 0 };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;

    const xStep = (width - padding * 2) / (data.length - 1 || 1);
    const yScale = (height - padding * 2) / range;

    const pts = data.map((value, index) => ({
      x: padding + index * xStep,
      y: height - padding - (value - min) * yScale,
      value,
    }));

    const linePath = pts
      .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const area = `${linePath} L ${pts[pts.length - 1]?.x || 0} ${height} L ${padding} ${height} Z`;

    return { path: linePath, areaPath: area, points: pts, minY: min, maxY: max };
  }, [data, width, height]);

  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    return data[data.length - 1] - data[0];
  }, [data]);

  if (!data.length) return null;

  return (
    <svg
      width={width}
      height={height}
      className={`sparkline ${className} ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
      viewBox={`0 0 ${width} ${height}`}
    >
      {showArea && (
        <path
          d={areaPath}
          fill={color}
          fillOpacity={0.1}
          className={animated ? 'animate-fade-in' : ''}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? 'animate-draw-line' : ''}
        style={animated ? { strokeDasharray: 1000, strokeDashoffset: isVisible ? 0 : 1000 } : {}}
      />
      {showDots && points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r={2}
          fill={color}
          className={animated ? 'animate-scale-in' : ''}
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </svg>
  );
};

// ============================================================================
// ProgressRing - Circular progress indicator
// ============================================================================

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 48,
  strokeWidth = 4,
  color = '#6366f1',
  backgroundColor = '#e5e7eb',
  showLabel = true,
  label,
  animated = true,
  className = '',
}) => {
  const [displayProgress, setDisplayProgress] = useState(animated ? 0 : progress);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setDisplayProgress(progress), 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayProgress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
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
          className={animated ? 'transition-all duration-700 ease-out' : ''}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-semibold text-gray-700 dark:text-gray-300">
          {label || `${Math.round(displayProgress)}%`}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// MetricCard - Modern metric display with trend
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

const colorMap = {
  primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', text: 'text-primary-600 dark:text-primary-400', spark: '#6366f1' },
  success: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', spark: '#22c55e' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', spark: '#f59e0b' },
  error: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', spark: '#ef4444' },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', spark: '#3b82f6' },
};

const sizeMap = {
  sm: { card: 'p-3', title: 'text-xs', value: 'text-lg', icon: 'w-8 h-8' },
  md: { card: 'p-4', title: 'text-sm', value: 'text-2xl', icon: 'w-10 h-10' },
  lg: { card: 'p-5', title: 'text-base', value: 'text-3xl', icon: 'w-12 h-12' },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  sparklineData,
  icon,
  color = 'primary',
  size = 'md',
  animated = true,
  className = '',
  onClick,
}) => {
  const colors = colorMap[color];
  const sizes = sizeMap[size];

  const TrendIcon = change ? (change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus) : null;
  const trendColor = change ? (change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-400') : '';

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl bg-white dark:bg-gray-800
        border border-gray-100 dark:border-gray-700
        shadow-sm hover:shadow-md transition-all duration-300
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
        ${sizes.card} ${className}
        ${animated ? 'animate-fade-in-up' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`${sizes.title} font-medium text-gray-500 dark:text-gray-400 mb-1`}>
            {title}
          </p>
          <p className={`${sizes.value} font-bold text-gray-900 dark:text-gray-100`}>
            {value}
          </p>
          {(change !== undefined || changeLabel) && (
            <div className="flex items-center gap-1 mt-2">
              {TrendIcon && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
              <span className={`text-xs font-medium ${trendColor}`}>
                {change !== undefined && (change > 0 ? '+' : '')}{change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={`${sizes.icon} ${colors.bg} rounded-lg flex items-center justify-center`}>
            <div className={colors.text}>{icon}</div>
          </div>
        )}
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 -mx-1">
          <Sparkline
            data={sparklineData}
            width={size === 'sm' ? 80 : size === 'md' ? 120 : 160}
            height={size === 'sm' ? 20 : size === 'md' ? 28 : 36}
            color={colors.spark}
            animated={animated}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// StatusDot - Animated status indicator
// ============================================================================

interface StatusDotProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'success' | 'error' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
  className?: string;
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
};

const dotSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  size = 'sm',
  pulse = true,
  label,
  className = '',
}) => {
  const shouldPulse = pulse && ['online', 'busy', 'success', 'error'].includes(status);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative inline-flex">
        <span
          className={`${dotSizes[size]} ${statusColors[status]} rounded-full`}
        />
        {shouldPulse && (
          <span
            className={`absolute inset-0 ${dotSizes[size]} ${statusColors[status]} rounded-full animate-ping opacity-75`}
          />
        )}
      </span>
      {label && (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// MiniProgressBar - Compact horizontal progress
// ============================================================================

interface MiniProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const progressColors = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

const progressSizes = {
  xs: 'h-0.5',
  sm: 'h-1',
  md: 'h-1.5',
};

export const MiniProgressBar: React.FC<MiniProgressBarProps> = ({
  value,
  max = 100,
  color = 'primary',
  size = 'sm',
  showLabel = false,
  animated = true,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${progressSizes[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`${progressSizes[size]} ${progressColors[color]} rounded-full ${
            animated ? 'transition-all duration-500 ease-out' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[2.5rem] text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

// ============================================================================
// TrendBadge - Show trend direction with percentage
// ============================================================================

interface TrendBadgeProps {
  value: number;
  suffix?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({
  value,
  suffix = '%',
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  const bgColor = isPositive ? 'bg-green-50 dark:bg-green-900/20' : isNeutral ? 'bg-gray-50 dark:bg-gray-800' : 'bg-red-50 dark:bg-red-900/20';
  const textColor = isPositive ? 'text-green-600 dark:text-green-400' : isNeutral ? 'text-gray-500' : 'text-red-600 dark:text-red-400';

  return (
    <span
      className={`
        inline-flex items-center gap-0.5 rounded-full font-medium
        ${bgColor} ${textColor}
        ${size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
        ${className}
      `}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      <span>{isPositive ? '+' : ''}{value}{suffix}</span>
    </span>
  );
};

// ============================================================================
// AvatarStack - Overlapping avatar group
// ============================================================================

interface AvatarStackProps {
  avatars: Array<{
    src?: string;
    name: string;
    color?: string;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizes = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

const avatarOverlaps = {
  xs: '-ml-1.5',
  sm: '-ml-2',
  md: '-ml-2.5',
  lg: '-ml-3',
};

export const AvatarStack: React.FC<AvatarStackProps> = ({
  avatars,
  max = 4,
  size = 'sm',
  className = '',
}) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
      'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-red-500',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className={`flex items-center ${className}`}>
      {visible.map((avatar, index) => (
        <div
          key={index}
          className={`
            ${avatarSizes[size]} ${index > 0 ? avatarOverlaps[size] : ''}
            rounded-full border-2 border-white dark:border-gray-800
            flex items-center justify-center text-white font-medium
            ${avatar.color || getColor(avatar.name)}
            overflow-hidden
          `}
          title={avatar.name}
        >
          {avatar.src ? (
            <img src={avatar.src} alt={avatar.name} className="w-full h-full object-cover" />
          ) : (
            getInitials(avatar.name)
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`
            ${avatarSizes[size]} ${avatarOverlaps[size]}
            rounded-full border-2 border-white dark:border-gray-800
            flex items-center justify-center bg-gray-200 dark:bg-gray-600
            text-gray-600 dark:text-gray-300 font-medium
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CountUp - Animated number counter
// ============================================================================

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [count, setCount] = useState(start);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = start;
    const endValue = end;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = startValue + (endValue - startValue) * eased;
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, start, duration]);

  return (
    <span className={className}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
};

// ============================================================================
// Skeleton - Loading placeholder
// ============================================================================

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
}) => {
  const baseClass = 'bg-gray-200 dark:bg-gray-700 animate-shimmer';

  const variantClass = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const defaultDimensions = {
    text: { height: '1em', width: '100%' },
    circular: { height: 40, width: 40 },
    rectangular: { height: 100, width: '100%' },
  };

  return (
    <span
      className={`block ${baseClass} ${variantClass[variant]} ${className}`}
      style={{
        width: width || defaultDimensions[variant].width,
        height: height || defaultDimensions[variant].height,
      }}
    />
  );
};

// ============================================================================
// Export all components
// ============================================================================

export default {
  Sparkline,
  ProgressRing,
  MetricCard,
  StatusDot,
  MiniProgressBar,
  TrendBadge,
  AvatarStack,
  CountUp,
  Skeleton,
};
