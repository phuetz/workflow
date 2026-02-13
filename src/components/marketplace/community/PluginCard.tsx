/**
 * Plugin Card Component
 * Displays a community node in the marketplace grid
 */

import React from 'react';
import { Star, Download, Shield, TrendingUp, CheckCircle } from 'lucide-react';
import type { PluginCardProps } from './types';
import { formatNumber, getNodeIcon, getThemeClasses } from './utils';

function PluginCard({ node, darkMode, isInstalled, onInstall, onSelect }: PluginCardProps) {
  const theme = getThemeClasses(darkMode);

  return (
    <div
      className={`${theme.bg} ${theme.border} rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${node.color}20`, color: node.color }}
        >
          {getNodeIcon(node.icon)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium truncate ${theme.text}`}>
            {node.displayName}
          </h3>
          <div className="flex items-center space-x-2 text-xs">
            <span className={theme.textSecondary}>
              by {node.author.displayName}
            </span>
            {node.author.verified && <CheckCircle size={12} className="text-blue-500" />}
          </div>
        </div>
      </div>

      <p className={`text-sm mb-3 line-clamp-2 ${theme.textSecondary}`}>
        {node.description}
      </p>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 text-xs">
          <span className={`px-2 py-1 rounded-full ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
          }`}>
            {node.category}
          </span>
          {node.security.verified && (
            <span title="Security Verified">
              <Shield size={14} className="text-green-500" />
            </span>
          )}
          {node.metadata.trending && (
            <span title="Trending">
              <TrendingUp size={14} className="text-orange-500" />
            </span>
          )}
        </div>
        <span className={`text-xs ${theme.textMuted}`}>
          v{node.version}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1">
            <Star size={12} className="text-yellow-500" />
            <span className={theme.textSecondary}>
              {node.ratings.average.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Download size={12} className={theme.textSecondary} />
            <span className={theme.textSecondary}>
              {formatNumber(node.stats.downloads.total)}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onInstall();
          }}
          disabled={isInstalled}
          className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
            isInstalled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isInstalled ? 'Installed' : 'Install'}
        </button>
      </div>
    </div>
  );
}

export default PluginCard;
