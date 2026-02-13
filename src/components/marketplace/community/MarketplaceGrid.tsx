/**
 * Marketplace Grid Component
 * Grid display of nodes with pagination
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MarketplaceGridProps } from './types';
import PluginCard from './PluginCard';
import { getThemeClasses } from './utils';

function MarketplaceGrid({
  nodes,
  darkMode,
  isNodeInstalled,
  onInstall,
  onSelect,
  loading,
  currentPage,
  totalPages,
  onPageChange
}: MarketplaceGridProps) {
  const theme = getThemeClasses(darkMode);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {nodes.map(node => (
          <PluginCard
            key={node.id}
            node={node}
            darkMode={darkMode}
            isInstalled={isNodeInstalled(node.id)}
            onInstall={() => onInstall(node.id)}
            onSelect={() => onSelect(node)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center space-x-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg ${
              currentPage === 1
                ? 'opacity-50 cursor-not-allowed'
                : theme.hover
            } transition-colors`}
          >
            <ChevronLeft size={16} />
          </button>
          <span className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg ${
              currentPage === totalPages
                ? 'opacity-50 cursor-not-allowed'
                : theme.hover
            } transition-colors`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}

export default MarketplaceGrid;
