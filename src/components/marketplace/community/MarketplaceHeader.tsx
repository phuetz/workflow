/**
 * Marketplace Header Component
 * Header with title, description and tab navigation
 */

import React from 'react';
import { Package, Download, Plus } from 'lucide-react';
import type { MarketplaceHeaderProps } from './types';
import { getThemeClasses } from './utils';

const TABS = [
  { key: 'discover' as const, label: 'Discover', icon: Package },
  { key: 'installed' as const, label: 'Installed', icon: Download },
  { key: 'submit' as const, label: 'Submit Node', icon: Plus }
];

function MarketplaceHeader({ darkMode, activeTab, onTabChange }: MarketplaceHeaderProps) {
  const theme = getThemeClasses(darkMode);

  return (
    <>
      {/* Title */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold ${theme.text} mb-2`}>
          Community Marketplace
        </h1>
        <p className={theme.textSecondary}>
          Discover and install community-contributed nodes to extend your workflows
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default MarketplaceHeader;
