/**
 * API Keys Tab Component
 * Displays and manages API keys with search and filter capabilities
 */

import React from 'react';
import {
  Search,
  Activity,
  Clock,
  BarChart3,
  RotateCw,
  Trash2,
  Copy
} from 'lucide-react';
import type { APIKey } from '../../../types/api';
import type { EnvironmentFilter } from './types';
import {
  formatNumber,
  getKeyStatus,
  getKeyStatusColor,
  getEnvironmentBadgeClass
} from './useAPIMetrics';

interface APIKeysTabProps {
  darkMode: boolean;
  filteredKeys: APIKey[];
  searchQuery: string;
  filterEnv: EnvironmentFilter;
  onSearchChange: (query: string) => void;
  onFilterChange: (env: EnvironmentFilter) => void;
  onViewUsage: (key: APIKey) => void;
  onRotateKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
  onCopy: (text: string) => void;
}

export function APIKeysTab({
  darkMode,
  filteredKeys,
  searchQuery,
  filterEnv,
  onSearchChange,
  onFilterChange,
  onViewUsage,
  onRotateKey,
  onDeleteKey,
  onCopy
}: APIKeysTabProps) {
  return (
    <div>
      {/* Search and Filter */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={16}
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          />
          <input
            type="text"
            placeholder="Search API keys..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        <select
          value={filterEnv}
          onChange={(e) => onFilterChange(e.target.value as EnvironmentFilter)}
          className={`px-3 py-2 rounded-lg border ${
            darkMode
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          <option value="all">All Environments</option>
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </select>
      </div>

      {/* API Keys Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredKeys.map((key) => (
          <APIKeyCard
            key={key.id}
            apiKey={key}
            darkMode={darkMode}
            onViewUsage={() => onViewUsage(key)}
            onRotate={() => onRotateKey(key.id)}
            onDelete={() => onDeleteKey(key.id)}
            onCopy={onCopy}
          />
        ))}
      </div>

      {filteredKeys.length === 0 && (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>No API keys found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

interface APIKeyCardProps {
  apiKey: APIKey;
  darkMode: boolean;
  onViewUsage: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
}

function APIKeyCard({
  apiKey,
  darkMode,
  onViewUsage,
  onRotate,
  onDelete,
  onCopy
}: APIKeyCardProps) {
  return (
    <div
      className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } rounded-lg border p-6`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3
              className={`text-lg font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {apiKey.name}
            </h3>
            <span
              className={`px-2 py-1 text-xs rounded-full ${getKeyStatusColor(
                apiKey
              )} bg-current bg-opacity-10`}
            >
              {getKeyStatus(apiKey)}
            </span>
            <span
              className={`px-2 py-1 text-xs rounded-full ${getEnvironmentBadgeClass(
                apiKey.metadata.environment
              )}`}
            >
              {apiKey.metadata.environment}
            </span>
          </div>

          {apiKey.metadata.description && (
            <p
              className={`${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              } text-sm mb-3`}
            >
              {apiKey.metadata.description}
            </p>
          )}

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Activity
                size={14}
                className={darkMode ? 'text-gray-400' : 'text-gray-500'}
              />
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                {formatNumber(apiKey.usage.totalRequests)} requests
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock
                size={14}
                className={darkMode ? 'text-gray-400' : 'text-gray-500'}
              />
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                {apiKey.lastUsedAt
                  ? apiKey.lastUsedAt.toLocaleDateString()
                  : 'Never used'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onViewUsage}
            className={`p-2 rounded-lg ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } transition-colors`}
            title="View Usage"
          >
            <BarChart3 size={16} />
          </button>
          <button
            onClick={onRotate}
            className={`p-2 rounded-lg ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } transition-colors`}
            title="Rotate Key"
          >
            <RotateCw size={16} />
          </button>
          <button
            onClick={onDelete}
            className={`p-2 rounded-lg text-red-500 ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } transition-colors`}
            title="Delete Key"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Key Preview */}
      <div
        className={`${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        } rounded-lg p-3 flex items-center justify-between`}
      >
        <code
          className={`text-sm font-mono ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          {apiKey.keyPrefix}••••••••••••••••
        </code>
        <button
          onClick={() => onCopy(apiKey.keyPrefix)}
          className={`p-1 rounded ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
          } transition-colors`}
        >
          <Copy size={14} />
        </button>
      </div>

      {/* Permissions Preview */}
      <div className="mt-3">
        <div className="flex flex-wrap gap-1">
          {apiKey.scopes.slice(0, 4).map((scope) => (
            <span
              key={scope}
              className={`px-2 py-1 text-xs rounded ${
                darkMode
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {scope}
            </span>
          ))}
          {apiKey.scopes.length > 4 && (
            <span
              className={`px-2 py-1 text-xs rounded ${
                darkMode
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              +{apiKey.scopes.length - 4} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
