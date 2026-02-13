/**
 * usePerformanceMetrics Hook
 * Custom React hook for accessing performance metrics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '../services/PerformanceMonitoringService';
import { logger } from '../services/SimpleLogger';

// Use any to avoid type conflicts between service and types/performance.ts
type PerformanceMetrics = any;
type PerformanceAlert = any;
type MetricSnapshot = any;

interface UsePerformanceMetricsOptions {
  refreshInterval?: number;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  includeHistory?: boolean;
}

interface UsePerformanceMetricsReturn {
  metrics: PerformanceMetrics | null;
  history: MetricSnapshot[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  exportData: (format: 'json' | 'csv') => void;
  subscribeToAlerts: (callback: (alert: PerformanceAlert) => void) => () => void;
}

export function usePerformanceMetrics(
  options: UsePerformanceMetricsOptions = {}
): UsePerformanceMetricsReturn {
  const {
    refreshInterval = 5000,
    timeRange = '1h',
    includeHistory = true
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [history, setHistory] = useState<MetricSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current metrics
      const currentMetrics = performanceMonitor.getMetrics();

      if (isMounted.current) {
        setMetrics(currentMetrics);

        // Get history if requested
        if (includeHistory) {
          const bucket = timeRangeToBucket(timeRange);
          const historyData = performanceMonitor.getMetricHistory(bucket);
          setHistory(historyData);
        }

        setLoading(false);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
        setLoading(false);
      }
    }
  }, [timeRange, includeHistory]);

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  // Export data
  const exportData = useCallback((format: 'json' | 'csv') => {
    try {
      const data = format === 'json'
        ? JSON.stringify({ metrics, history }, null, 2)
        : convertToCSV({ metrics, history });

      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-metrics-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Failed to export metrics:', err);
    }
  }, [metrics, history]);

  // Subscribe to alerts
  const subscribeToAlerts = useCallback((callback: (alert: PerformanceAlert) => void) => {
    performanceMonitor.on('alert', callback);
    return () => {
      performanceMonitor.off('alert', callback);
    };
  }, []);

  // Setup auto-refresh
  useEffect(() => {
    isMounted.current = true;

    // Initial fetch
    fetchMetrics();

    // Setup interval if auto-refresh is enabled
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchMetrics, refreshInterval);
    }

    // Subscribe to metric updates
    const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
      if (isMounted.current) {
        setMetrics(newMetrics);
      }
    };

    performanceMonitor.on('metrics-updated', handleMetricsUpdate);

    // Cleanup
    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      performanceMonitor.off('metrics-updated', handleMetricsUpdate);
    };
  }, [refreshInterval, fetchMetrics]);

  return {
    metrics,
    history,
    loading,
    error,
    refresh,
    exportData,
    subscribeToAlerts
  };
}

// Helper function to convert time range to history bucket
function timeRangeToBucket(timeRange: string): '1m' | '5m' | '1h' {
  switch (timeRange) {
    case '1h':
      return '1m';
    case '6h':
    case '24h':
      return '5m';
    case '7d':
    case '30d':
      return '1h';
    default:
      return '5m';
  }
}

// Helper function to convert metrics to CSV
function convertToCSV(data: { metrics: PerformanceMetrics | null; history: MetricSnapshot[] }): string {
  const lines: string[] = [];

  // Header
  lines.push('Timestamp,CPU Usage,Memory Usage,API Requests,Workflow Executions');

  // Current metrics
  if (data.metrics) {
    lines.push([
      data.metrics.timestamp,
      data.metrics.system?.cpu?.usage || 0,
      data.metrics.system?.memory?.usagePercent || 0,
      data.metrics.api?.totalRequests || 0,
      data.metrics.workflows?.totalExecutions || 0
    ].join(','));
  }

  // History data
  data.history.forEach((snapshot: any) => {
    lines.push([
      snapshot.timestamp,
      snapshot.system?.cpu?.usage || 0,
      snapshot.system?.memory?.usagePercent || 0,
      snapshot.api?.totalRequests || 0,
      snapshot.workflows?.totalExecutions || 0
    ].join(','));
  });

  return lines.join('\n');
}

// Additional hooks for specific metrics

export function useSystemMetrics(refreshInterval = 5000) {
  const { metrics, loading, error } = usePerformanceMetrics({
    refreshInterval,
    includeHistory: false
  });

  return {
    system: metrics?.system || null,
    loading,
    error
  };
}

export function useAPIMetrics(refreshInterval = 5000) {
  const { metrics, loading, error } = usePerformanceMetrics({
    refreshInterval,
    includeHistory: false
  });

  return {
    api: metrics?.api || null,
    loading,
    error
  };
}

export function useWorkflowMetrics(refreshInterval = 5000) {
  const { metrics, loading, error } = usePerformanceMetrics({
    refreshInterval,
    includeHistory: false
  });

  return {
    workflows: metrics?.workflows || null,
    loading,
    error
  };
}

export function usePerformanceAlerts() {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [newAlert, setNewAlert] = useState<PerformanceAlert | null>(null);

  useEffect(() => {
    // Get initial alerts
    const activeAlerts = performanceMonitor.getActiveAlerts();
    setAlerts(activeAlerts);

    // Subscribe to new alerts
    const handleAlert = (alert: PerformanceAlert) => {
      setNewAlert(alert);
      setAlerts(prev => [...prev, alert]);
    };

    const handleAlertCleared = (alert: PerformanceAlert) => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    };

    performanceMonitor.on('alert', handleAlert);
    performanceMonitor.on('alert-cleared', handleAlertCleared);

    return () => {
      performanceMonitor.off('alert', handleAlert);
      performanceMonitor.off('alert-cleared', handleAlertCleared);
    };
  }, []);

  const clearAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    setNewAlert(null);
  }, []);

  return {
    alerts,
    newAlert,
    clearAlert
  };
}
