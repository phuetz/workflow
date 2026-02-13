/**
 * Formatting Utilities
 * Helper functions for formatting various data types
 */

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date to relative time
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffSecs > 0) {
    return `${diffSecs} second${diffSecs > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Format date to ISO string in local timezone
 */
export function formatDateTime(date: Date | string | number): string {
  return new Date(date).toLocaleString();
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Truncate string with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Format SQL query for display
 */
export function formatSQL(query: string, maxLength = 100): string {
  // Remove extra whitespace
  const formatted = query.replace(/\s+/g, ' ').trim();

  // Truncate if needed
  if (formatted.length > maxLength) {
    return formatted.substring(0, maxLength - 3) + '...';
  }

  return formatted;
}

/**
 * Format error message
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  } else {
    return 'An unknown error occurred';
  }
}

/**
 * Format metric value based on type
 */
export function formatMetricValue(value: number, type: string): string {
  switch (type) {
    case 'bytes':
      return formatBytes(value);
    case 'duration':
    case 'milliseconds':
      return formatDuration(value);
    case 'percentage':
      return formatPercentage(value);
    case 'currency':
      return formatCurrency(value);
    case 'count':
      return formatNumber(value);
    default:
      return value.toString();
  }
}

/**
 * Format health score with color
 */
export function formatHealthScore(score: number): {
  text: string;
  color: string;
  status: 'healthy' | 'warning' | 'critical';
} {
  let status: 'healthy' | 'warning' | 'critical';
  let color: string;

  if (score >= 80) {
    status = 'healthy';
    color = '#10B981'; // green
  } else if (score >= 60) {
    status = 'warning';
    color = '#F59E0B'; // yellow
  } else {
    status = 'critical';
    color = '#EF4444'; // red
  }

  return {
    text: `${score}%`,
    color,
    status
  };
}

/**
 * Format change indicator
 */
export function formatChange(current: number, previous: number): {
  value: number;
  text: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
} {
  if (previous === 0) {
    return {
      value: 0,
      text: '0%',
      trend: 'stable',
      color: '#6B7280' // gray
    };
  }

  const change = ((current - previous) / previous) * 100;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
  const color = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280';

  return {
    value: change,
    text: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
    trend,
    color
  };
}

/**
 * Parse size string to bytes
 */
export function parseSize(sizeStr: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024
  };

  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);

  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }

  const [, value, unit] = match;
  const multiplier = units[unit.toUpperCase()] || 1;

  return parseFloat(value) * multiplier;
}

/**
 * Format time series data for charts
 */
export function formatTimeSeriesData(
  data: Array<{ timestamp: Date | string | number; value: number }>,
  interval: 'minute' | 'hour' | 'day' = 'hour'
): Array<{ time: string; value: number }> {
  return data.map(item => {
    const date = new Date(item.timestamp);
    let time: string;

    switch (interval) {
      case 'minute':
        time = date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit'
        });
        break;
      case 'hour':
        time = date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit'
        });
        break;
      case 'day':
        time = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
        break;
      default:
        time = date.toLocaleString();
    }

    return { time, value: item.value };
  });
}