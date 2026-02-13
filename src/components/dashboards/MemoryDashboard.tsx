import React, { useState, useEffect } from 'react';
import {
  Memory,
  MemoryType,
  MemoryHealth,
  PerformanceMetrics,
  MemoryWithScore,
} from '../../types/memory';
import { MemoryStore } from '../../memory/MemoryStore';
import { MemorySearch } from '../../memory/MemorySearch';
import { logger } from '../../services/SimpleLogger';

interface MemoryDashboardProps {
  memoryStore: MemoryStore;
  memorySearch: MemorySearch;
  userId: string;
  agentId: string;
}

export const MemoryDashboard: React.FC<MemoryDashboardProps> = ({
  memoryStore,
  memorySearch,
  userId,
  agentId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemoryWithScore[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [health, setHealth] = useState<MemoryHealth | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [filterType, setFilterType] = useState<MemoryType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'importance' | 'relevance'>(
    'relevance'
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadHealthAndMetrics();
  }, []);

  const loadHealthAndMetrics = async () => {
    try {
      const [healthData, metricsData] = await Promise.all([
        memoryStore.getHealth(),
        memoryStore.getMetrics(),
      ]);
      setHealth(healthData);
      setMetrics(metricsData);
    } catch (error) {
      logger.error('Failed to load health/metrics:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await memorySearch.search({
        query: searchQuery,
        userId,
        agentId,
        type: filterType === 'all' ? undefined : filterType,
        limit: 20,
        sortBy,
      });

      setSearchResults(result.memories);
    } catch (error) {
      logger.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) {
      return;
    }

    try {
      await memoryStore.delete(memoryId);
      setSearchResults((prev) => prev.filter((m) => m.id !== memoryId));
      if (selectedMemory?.id === memoryId) {
        setSelectedMemory(null);
      }
      await loadHealthAndMetrics();
    } catch (error) {
      logger.error('Failed to delete memory:', error);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getHealthStatusColor = (status: MemoryHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="memory-dashboard p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Memory Dashboard
          </h1>
          <p className="text-gray-600">
            Manage and search your agent's persistent memory
          </p>
        </div>

        {/* Health Status Card */}
        {health && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                System Health
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(
                  health.status
                )}`}
              >
                {health.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Total Memories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {health.totalMemories}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Storage Used</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(health.storageUsed / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Search Latency</p>
                <p className="text-2xl font-bold text-gray-900">
                  {health.avgSearchLatency.toFixed(0)}ms
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Recall Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(health.recallAccuracy * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Storage Utilization Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Storage Utilization</span>
                <span className="text-gray-900 font-medium">
                  {health.utilizationPercent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    health.utilizationPercent > 90
                      ? 'bg-red-600'
                      : health.utilizationPercent > 75
                      ? 'bg-yellow-600'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(100, health.utilizationPercent)}%` }}
                />
              </div>
            </div>

            {/* Issues */}
            {health.issues.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Issues</h3>
                {health.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="flex items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <span className={`mr-2 ${getSeverityColor(issue.severity)}`}>
                      ●
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {issue.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(issue.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {health.recommendations.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-900">
                  Recommendations
                </h3>
                {health.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <span className="mr-2 text-blue-600">💡</span>
                    <p className="text-sm text-gray-700">{rec}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Search Memories
          </h2>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search memories by content..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as MemoryType | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="conversation">Conversation</option>
                  <option value="preference">Preference</option>
                  <option value="workflow">Workflow</option>
                  <option value="feedback">Feedback</option>
                  <option value="pattern">Pattern</option>
                  <option value="skill">Skill</option>
                  <option value="context">Context</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'timestamp' | 'importance' | 'relevance')
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="relevance">Relevance</option>
                  <option value="timestamp">Timestamp</option>
                  <option value="importance">Importance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-gray-900">
                Results ({searchResults.length})
              </h3>
              {searchResults.map((memory) => (
                <div
                  key={memory.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => setSelectedMemory(memory)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {memory.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          Score: {(memory.score * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          Importance: {(memory.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {memory.content}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMemory(memory.id);
                      }}
                      className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete memory"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimestamp(memory.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !isLoading && (
            <div className="mt-6 text-center py-8 text-gray-500">
              No memories found matching your search.
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        {metrics && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Performance Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Latency Metrics */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Search Latency
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">P50</span>
                    <span className="font-medium">
                      {metrics.recallLatency.p50.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">P90</span>
                    <span className="font-medium">
                      {metrics.recallLatency.p90.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">P95</span>
                    <span className="font-medium">
                      {metrics.recallLatency.p95.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average</span>
                    <span className="font-medium">
                      {metrics.recallLatency.avg.toFixed(1)}ms
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage Efficiency */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Storage Efficiency
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Memory Count</span>
                    <span className="font-medium">
                      {metrics.storageEfficiency.memoryCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Compression Ratio</span>
                    <span className="font-medium">
                      {(metrics.storageEfficiency.compressionRatio * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Memory Size</span>
                    <span className="font-medium">
                      {(metrics.storageEfficiency.avgMemorySize / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Storage Per User</span>
                    <span className="font-medium">
                      {(metrics.storageEfficiency.storagePerUser / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Memory Detail Modal */}
        {selectedMemory && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMemory(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Memory Details
                  </h2>
                  <button
                    onClick={() => setSelectedMemory(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID
                    </label>
                    <p className="text-sm text-gray-600 font-mono">
                      {selectedMemory.id}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded">
                      {selectedMemory.type}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedMemory.content}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Importance
                      </label>
                      <p className="text-sm text-gray-800">
                        {(selectedMemory.importance * 100).toFixed(0)}%
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Access Count
                      </label>
                      <p className="text-sm text-gray-800">
                        {selectedMemory.accessCount}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created
                      </label>
                      <p className="text-sm text-gray-800">
                        {formatTimestamp(selectedMemory.timestamp)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Accessed
                      </label>
                      <p className="text-sm text-gray-800">
                        {formatTimestamp(selectedMemory.lastAccessed)}
                      </p>
                    </div>
                  </div>

                  {selectedMemory.metadata && Object.keys(selectedMemory.metadata).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metadata
                      </label>
                      <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedMemory.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleDeleteMemory(selectedMemory.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete Memory
                    </button>
                    <button
                      onClick={() => setSelectedMemory(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
