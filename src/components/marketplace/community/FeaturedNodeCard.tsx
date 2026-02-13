/**
 * Featured Node Card Component
 * Displays a featured/highlighted community node
 */

import React from 'react';
import { Star, Download, Award } from 'lucide-react';
import type { FeaturedNodeCardProps } from './types';
import { formatNumber, getNodeIcon, getThemeClasses } from './utils';

function FeaturedNodeCard({ node, darkMode, isInstalled, onInstall, onSelect }: FeaturedNodeCardProps) {
  const theme = getThemeClasses(darkMode);

  return (
    <div
      className={`${theme.bg} ${theme.border} rounded-lg border p-6 hover:shadow-lg transition-shadow cursor-pointer`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
          style={{ backgroundColor: `${node.color}20`, color: node.color }}
        >
          {getNodeIcon(node.icon)}
        </div>
        <Award className="text-yellow-500" size={20} />
      </div>

      <h3 className={`font-semibold mb-2 ${theme.text}`}>
        {node.displayName}
      </h3>
      <p className={`text-sm mb-4 line-clamp-2 ${theme.textSecondary}`}>
        {node.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-sm">
          <div className="flex items-center space-x-1">
            <Star size={14} className="text-yellow-500" />
            <span className={theme.textSecondary}>
              {node.ratings.average.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Download size={14} className={theme.textSecondary} />
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
          className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
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

export default FeaturedNodeCard;
