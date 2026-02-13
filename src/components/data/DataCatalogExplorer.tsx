/**
 * Data Catalog Explorer - UI for browsing data catalog
 *
 * Provides comprehensive interface for exploring, searching, and managing
 * the data catalog with filters, lineage visualization, and metadata.
 *
 * @module components/DataCatalogExplorer
 */

import React, { useState, useEffect } from 'react';
import { getDataCatalog, SearchQuery } from '../../semantic/DataCatalog';
import {
  CatalogEntry,
  CatalogEntryType,
  DataSourceType,
  DataClassification
} from '../../semantic/types/semantic';

/**
 * DataCatalogExplorer component
 */
export const DataCatalogExplorer: React.FC = () => {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<CatalogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SearchQuery>({});
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const catalog = getDataCatalog();

  // Load catalog entries
  useEffect(() => {
    loadEntries();
  }, []);

  // Filter entries when search or filters change
  useEffect(() => {
    applyFilters();
  }, [searchText, filters, entries]);

  /**
   * Load catalog entries
   */
  const loadEntries = () => {
    setLoading(true);
    try {
      const allEntries = catalog.getAllEntries();
      setEntries(allEntries);
      setFilteredEntries(allEntries);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply search and filters
   */
  const applyFilters = () => {
    const query: SearchQuery = {
      text: searchText || undefined,
      ...filters
    };

    const results = catalog.search(query);
    setFilteredEntries(results);
  };

  /**
   * Update filter
   */
  const updateFilter = (key: keyof SearchQuery, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSearchText('');
    setFilters({});
  };

  /**
   * Get classification badge color
   */
  const getClassificationColor = (classification: DataClassification): string => {
    const colors: Record<DataClassification, string> = {
      [DataClassification.PUBLIC]: 'bg-green-100 text-green-800',
      [DataClassification.INTERNAL]: 'bg-blue-100 text-blue-800',
      [DataClassification.CONFIDENTIAL]: 'bg-orange-100 text-orange-800',
      [DataClassification.RESTRICTED]: 'bg-red-100 text-red-800'
    };

    return colors[classification];
  };

  /**
   * Get quality score color
   */
  const getQualityColor = (score: number): string => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Format date
   */
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Format number
   */
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Catalog</h1>
            <p className="text-sm text-gray-600 mt-1">
              Browse and discover data assets ({filteredEntries.length} of {entries.length})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                showFilters
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
            </button>

            <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'list' ? 'bg-gray-100' : ''
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'grid' ? 'bg-gray-100' : ''
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search data assets..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">🔍</div>

            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-4 gap-4">
              {/* Entry Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Type
                </label>
                <select
                  value={filters.types?.[0] || ''}
                  onChange={(e) =>
                    updateFilter('types', e.target.value ? [e.target.value as CatalogEntryType] : undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Types</option>
                  {Object.values(CatalogEntryType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Source Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Type
                </label>
                <select
                  value={filters.sourceTypes?.[0] || ''}
                  onChange={(e) =>
                    updateFilter('sourceTypes', e.target.value ? [e.target.value as DataSourceType] : undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Sources</option>
                  {Object.values(DataSourceType).slice(0, 10).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Classification Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classification
                </label>
                <select
                  value={filters.classification || ''}
                  onChange={(e) =>
                    updateFilter('classification', e.target.value as DataClassification || undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All</option>
                  {Object.values(DataClassification).map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Quality Score Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Quality Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.minQualityScore || ''}
                  onChange={(e) =>
                    updateFilter('minQualityScore', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="0.0 - 1.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Entries List/Grid */}
        <div className={`${selectedEntry ? 'w-2/3' : 'w-full'} overflow-y-auto p-6`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No data assets found</p>
              {(searchText || Object.keys(filters).length > 0) && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedEntry?.id === entry.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {entry.name}
                        </h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {entry.type}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getClassificationColor(entry.classification)}`}>
                          {entry.classification}
                        </span>
                        {entry.hasPII && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            PII
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mt-2">
                        {entry.description || 'No description'}
                      </p>

                      <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                        <div>
                          Source: <span className="font-medium">{entry.dataSource.type}</span>
                        </div>
                        <div>
                          Quality: <span className={`font-medium ${getQualityColor(entry.qualityScore)}`}>
                            {(entry.qualityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          Updated: {formatDate(entry.updatedAt)}
                        </div>
                        {entry.usageMetrics.queryCount > 0 && (
                          <div>
                            Queries: {formatNumber(entry.usageMetrics.queryCount)}
                          </div>
                        )}
                      </div>

                      {entry.tags.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {entry.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedEntry?.id === entry.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 truncate" title={entry.name}>
                    {entry.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {entry.description || 'No description'}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {entry.type}
                    </span>
                    <span className={`font-medium ${getQualityColor(entry.qualityScore)}`}>
                      {(entry.qualityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedEntry && (
          <div className="w-1/3 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{selectedEntry.name}</h2>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Overview */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Overview</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium">{selectedEntry.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Source:</span>
                    <span className="ml-2 font-medium">{selectedEntry.dataSource.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Classification:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${getClassificationColor(selectedEntry.classification)}`}>
                      {selectedEntry.classification}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Owner:</span>
                    <span className="ml-2 font-medium">{selectedEntry.owner || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedEntry.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
                  <p className="text-sm text-gray-600">{selectedEntry.description}</p>
                </div>
              )}

              {/* Quality Metrics */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quality Metrics</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Overall Score</span>
                    <span className={`font-medium ${getQualityColor(selectedEntry.qualityScore)}`}>
                      {(selectedEntry.qualityScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Completeness</span>
                    <span>{(selectedEntry.qualityMetrics.completeness * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Accuracy</span>
                    <span>{(selectedEntry.qualityMetrics.accuracy * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Freshness</span>
                    <span>{(selectedEntry.qualityMetrics.freshness * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Usage Metrics */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Usage</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Queries</span>
                    <span className="font-medium">{formatNumber(selectedEntry.usageMetrics.queryCount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Users</span>
                    <span className="font-medium">{selectedEntry.usageMetrics.userCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Avg Query Time</span>
                    <span className="font-medium">{selectedEntry.usageMetrics.avgQueryTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedEntry.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lineage */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Lineage</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Upstream:</span>
                    <span className="ml-2 font-medium">{selectedEntry.upstreamDependencies.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Downstream:</span>
                    <span className="ml-2 font-medium">{selectedEntry.downstreamDependencies.length}</span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Metadata</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2">{formatDate(selectedEntry.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Updated:</span>
                    <span className="ml-2">{formatDate(selectedEntry.updatedAt)}</span>
                  </div>
                  {selectedEntry.lastAccessedAt && (
                    <div>
                      <span className="text-gray-600">Last Accessed:</span>
                      <span className="ml-2">{formatDate(selectedEntry.lastAccessedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataCatalogExplorer;
