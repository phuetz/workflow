/**
 * Installed Node Card Component
 * Displays an installed community node with management options
 */

import React from 'react';
import { Clock } from 'lucide-react';
import type { InstalledNodeCardProps } from './types';
import { formatTimeAgo, getNodeIcon, getThemeClasses } from './utils';

function InstalledNodeCard({ node, installation, darkMode, onUninstall, onSelect }: InstalledNodeCardProps) {
  const theme = getThemeClasses(darkMode);

  return (
    <div
      className={`${theme.bg} ${theme.border} rounded-lg border p-6 cursor-pointer`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${node.color}20`, color: node.color }}
          >
            {getNodeIcon(node.icon)}
          </div>
          <div>
            <h3 className={`font-semibold ${theme.text}`}>
              {node.displayName}
            </h3>
            <p className={`text-sm ${theme.textSecondary}`}>
              v{installation.version}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {installation.autoUpdate && (
            <span className={`px-2 py-1 text-xs rounded-full ${
              darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
            }`}>
              Auto-update
            </span>
          )}
        </div>
      </div>

      <p className={`text-sm mb-4 ${theme.textSecondary}`}>
        Installed {formatTimeAgo(installation.installedAt)}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-sm">
          <div className="flex items-center space-x-1">
            <Clock size={14} className={theme.textSecondary} />
            <span className={theme.textSecondary}>
              {installation.lastUsedAt ? `Used ${formatTimeAgo(installation.lastUsedAt)}` : 'Never used'}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to uninstall this node?')) {
              onUninstall();
            }
          }}
          className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-red-900 hover:bg-red-800 text-red-300'
              : 'bg-red-100 hover:bg-red-200 text-red-700'
          }`}
        >
          Uninstall
        </button>
      </div>
    </div>
  );
}

export default InstalledNodeCard;
