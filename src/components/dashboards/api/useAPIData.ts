/**
 * useAPIData Hook
 * Manages API data loading and key operations
 */

import { useState, useEffect, useCallback } from 'react';
import { APIService } from '../../../services/APIService';
import type { APIKey, APIEndpoint, WebhookEndpoint } from '../../../types/api';
import type { CreateAPIKeyOptions, EnvironmentFilter } from './types';
import { logger } from '../../../services/SimpleLogger';

interface UseAPIDataReturn {
  // Data
  apiKeys: APIKey[];
  endpoints: APIEndpoint[];
  webhooks: WebhookEndpoint[];
  loading: boolean;
  error: string | null;

  // Filtered keys
  filteredKeys: APIKey[];

  // Search and filter state
  searchQuery: string;
  filterEnv: EnvironmentFilter;
  setSearchQuery: (query: string) => void;
  setFilterEnv: (env: EnvironmentFilter) => void;

  // API Key operations
  createAPIKey: (options: CreateAPIKeyOptions) => Promise<string | null>;
  deleteAPIKey: (keyId: string) => Promise<boolean>;
  rotateAPIKey: (keyId: string) => Promise<string | null>;

  // Refresh data
  refreshData: () => Promise<void>;
}

export function useAPIData(): UseAPIDataReturn {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnv, setFilterEnv] = useState<EnvironmentFilter>('all');

  const apiService = APIService.getInstance();

  const loadAPIData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [keysData, endpointsData] = await Promise.all([
        apiService.listAPIKeys(),
        apiService.getAPIDocumentation()
      ]);

      setApiKeys(keysData);
      setEndpoints(endpointsData);
      setWebhooks([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load API data';
      logger.error('Failed to load API data:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  useEffect(() => {
    loadAPIData();
  }, [loadAPIData]);

  const createAPIKey = useCallback(async (options: CreateAPIKeyOptions): Promise<string | null> => {
    try {
      const newKey = await apiService.createAPIKey(options);
      setApiKeys(prev => [newKey, ...prev]);
      return newKey.hashedKey;
    } catch (err) {
      logger.error('Failed to create API key:', err);
      return null;
    }
  }, [apiService]);

  const deleteAPIKey = useCallback(async (keyId: string): Promise<boolean> => {
    try {
      await apiService.deleteAPIKey(keyId);
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      return true;
    } catch (err) {
      logger.error('Failed to delete API key:', err);
      return false;
    }
  }, [apiService]);

  const rotateAPIKey = useCallback(async (keyId: string): Promise<string | null> => {
    try {
      const rotatedKey = await apiService.rotateAPIKey(keyId);
      setApiKeys(prev => prev.map(key => key.id === keyId ? rotatedKey : key));
      return rotatedKey.hashedKey;
    } catch (err) {
      logger.error('Failed to rotate API key:', err);
      return null;
    }
  }, [apiService]);

  // Filter keys based on search and environment
  const filteredKeys = apiKeys.filter(key => {
    const matchesSearch = searchQuery === '' ||
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.metadata.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEnv = filterEnv === 'all' || key.metadata.environment === filterEnv;

    return matchesSearch && matchesEnv;
  });

  return {
    apiKeys,
    endpoints,
    webhooks,
    loading,
    error,
    filteredKeys,
    searchQuery,
    filterEnv,
    setSearchQuery,
    setFilterEnv,
    createAPIKey,
    deleteAPIKey,
    rotateAPIKey,
    refreshData: loadAPIData
  };
}
