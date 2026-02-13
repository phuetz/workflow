/**
 * Search Bar Component
 * Advanced search with autocomplete, suggestions, and filters
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Tag, Star, Sparkles } from 'lucide-react';
import { SearchSuggestion, RecentSearch } from '../../types/marketplaceEnhanced';
import { logger } from '../../services/SimpleLogger';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  darkMode?: boolean;
  onSearch?: (query: string) => void;
  showSuggestions?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  darkMode = false,
  onSearch,
  showSuggestions = true
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentSearches(parsed.slice(0, 5));
      } catch (error) {
        logger.error('Failed to parse recent searches:', error);
      }
    }
  }, []);

  // Fetch suggestions when value changes
  useEffect(() => {
    if (value.length >= 2) {
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
    }
    setSelectedIndex(-1);
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    try {
      // Simulate API call
      const mockSuggestions: SearchSuggestion[] = [
        { query: `${query} automation`, type: 'template', count: 12 },
        { query: `${query} workflow`, type: 'template', count: 8 },
        { query: `${query}`, type: 'category', count: 5 },
        { query: `#${query}`, type: 'tag', count: 15 }
      ];
      setSuggestions(mockSuggestions);
    } catch (error) {
      logger.error('Failed to fetch suggestions:', error);
    }
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    // Save to recent searches
    const newSearch: RecentSearch = {
      query,
      timestamp: new Date(),
      resultsCount: 0
    };

    const updated = [newSearch, ...recentSearches.filter(s => s.query !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    // Execute search
    onChange(query);
    onSearch?.(query);
    setFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const visibleItems = value ? suggestions : recentSearches;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i < visibleItems.length - 1 ? i + 1 : i));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i > 0 ? i - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const item = visibleItems[selectedIndex];
          const query = 'query' in item ? item.query : (item as any).query;
          handleSearch(query);
        } else {
          handleSearch(value);
        }
        break;
      case 'Escape':
        setFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const removeRecentSearch = (query: string) => {
    const updated = recentSearches.filter(s => s.query !== query);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'template':
        return <Sparkles className="w-4 h-4" />;
      case 'category':
        return <Tag className="w-4 h-4" />;
      case 'tag':
        return <Tag className="w-4 h-4" />;
      case 'author':
        return <Star className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const showDropdown = focused && showSuggestions && (suggestions.length > 0 || recentSearches.length > 0 || value.length >= 2);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-12 pr-12 py-3 rounded-lg text-sm transition-all ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-600'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-gray-50'
          } border focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
          aria-label="Search templates"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="search-dropdown"
        />
        {value && (
          <button
            onClick={handleClear}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
              darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
            }`}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          id="search-dropdown"
          className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
          role="listbox"
        >
          {/* Recent Searches */}
          {!value && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className={`text-xs ${darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(search.query)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedIndex === index
                      ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className="flex-1 text-sm">{search.query}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(search.query);
                    }}
                    className={`p-1 rounded hover:bg-gray-600 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {value && suggestions.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Suggestions
                </span>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion.query)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedIndex === index
                      ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className={darkMode ? 'text-purple-400' : 'text-purple-600'}>
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <span className="flex-1 text-sm">
                    {suggestion.query}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {suggestion.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches (shown when input is empty) */}
          {!value && recentSearches.length === 0 && (
            <div className="p-2">
              <div className="px-3 py-2">
                <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                  Popular Searches
                </span>
              </div>
              {['automation workflow', 'email campaign', 'data sync', 'slack integration'].map((term, index) => (
                <button
                  key={term}
                  onClick={() => handleSearch(term)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    selectedIndex === index
                      ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <TrendingUp className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
                  <span className="flex-1 text-sm">{term}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
