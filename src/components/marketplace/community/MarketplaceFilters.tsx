/**
 * Marketplace Filters Component
 * Search bar and filters for marketplace nodes
 */

import React from 'react';
import { Search, Filter } from 'lucide-react';
import type { MarketplaceFiltersProps, MarketplaceSearchProps, NodeCategory, NodeSortOption } from './types';
import { CATEGORIES, getThemeClasses } from './types';

interface CombinedFiltersProps extends MarketplaceFiltersProps, MarketplaceSearchProps {
  showFilters: boolean;
}

function MarketplaceFilters({
  searchQuery,
  onSearchChange,
  onToggleFilters,
  selectedCategory,
  sortBy,
  onCategoryChange,
  onSortChange,
  showFilters,
  darkMode
}: CombinedFiltersProps) {
  const theme = getThemeClasses(darkMode);

  return (
    <div className="mb-6">
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search
            size={16}
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme.textSecondary}`}
          />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 rounded-lg border ${theme.input} ${theme.inputPlaceholder} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
        </div>
        <button
          onClick={onToggleFilters}
          className={`p-2 rounded-lg border ${theme.bg} ${theme.border} ${theme.textSecondary} ${theme.hover} transition-colors`}
        >
          <Filter size={16} />
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className={`mt-4 p-4 rounded-lg border ${theme.bg} ${theme.border}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value as NodeCategory | 'all')}
                className={`w-full px-3 py-2 rounded-lg border ${theme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.key} value={cat.key}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as NodeSortOption)}
                className={`w-full px-3 py-2 rounded-lg border ${theme.input} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="relevance">Relevance</option>
                <option value="downloads">Most Downloads</option>
                <option value="rating">Highest Rated</option>
                <option value="recent">Recently Updated</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketplaceFilters;
