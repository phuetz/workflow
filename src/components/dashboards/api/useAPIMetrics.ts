/**
 * useAPIMetrics Hook
 * Manages API key metrics and usage data
 */

import { useState, useCallback } from 'react';
import { APIService } from '../../../services/APIService';
import type { APIKey, APIUsageStats } from '../../../types/api';
import { logger } from '../../../services/SimpleLogger';

interface UseAPIMetricsReturn {
  usage: APIUsageStats | null;
  loading: boolean;
  error: string | null;
  loadUsageData: (keyId: string) => Promise<void>;
  clearUsage: () => void;
}

export function useAPIMetrics(): UseAPIMetricsReturn {
  const [usage, setUsage] = useState<APIUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = APIService.getInstance();

  const loadUsageData = useCallback(async (keyId: string) => {
    setLoading(true);
    setError(null);

    try {
      const usageData = await apiService.getAPIUsage(keyId);
      setUsage(usageData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load usage data';
      logger.error('Failed to load usage data:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  const clearUsage = useCallback(() => {
    setUsage(null);
    setError(null);
  }, []);

  return {
    usage,
    loading,
    error,
    loadUsageData,
    clearUsage
  };
}

// Utility functions for formatting
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function getKeyStatusColor(key: APIKey): string {
  if (!key.isActive) return 'text-gray-500';
  if (key.expiresAt && key.expiresAt < new Date()) return 'text-red-500';
  return 'text-green-500';
}

export function getKeyStatus(key: APIKey): string {
  if (!key.isActive) return 'Inactive';
  if (key.expiresAt && key.expiresAt < new Date()) return 'Expired';
  return 'Active';
}

export function getEnvironmentBadgeClass(environment: string): string {
  switch (environment) {
    case 'production':
      return 'text-red-600 bg-red-100';
    case 'staging':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-blue-600 bg-blue-100';
  }
}

export function getMethodBadgeClass(method: string): string {
  switch (method) {
    case 'GET':
      return 'bg-green-100 text-green-800';
    case 'POST':
      return 'bg-blue-100 text-blue-800';
    case 'PUT':
      return 'bg-yellow-100 text-yellow-800';
    case 'DELETE':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusCodeColor(statusCode: number): string {
  if (statusCode < 300) return 'text-green-600';
  if (statusCode < 400) return 'text-yellow-600';
  return 'text-red-600';
}

export function getStatusDotColor(statusCode: number): string {
  if (statusCode < 300) return 'bg-green-500';
  if (statusCode < 400) return 'bg-yellow-500';
  return 'bg-red-500';
}
