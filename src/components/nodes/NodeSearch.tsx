/**
 * Node Search Component
 * Provides fuzzy search for workflow nodes with keyboard shortcuts
 * Gap P1 fix: Better node discovery UX similar to n8n
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, Zap, Clock, Star, ArrowRight } from 'lucide-react';
import { nodeTypes } from '../../data/nodeTypes';

interface NodeSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeType: string) => void;
}

interface SearchResult {
  type: string;
  label: string;
  category: string;
  description: string;
  icon: string;
  score: number;
}

// Simple fuzzy search implementation
function fuzzyMatch(pattern: string, str: string): number {
  pattern = pattern.toLowerCase();
  str = str.toLowerCase();

  if (pattern === '') return 1;
  if (str.includes(pattern)) return 0.9 + (pattern.length / str.length) * 0.1;

  let score = 0;
  let patternIdx = 0;
  let prevMatchIdx = -1;
  let consecutiveBonus = 0;

  for (let i = 0; i < str.length && patternIdx < pattern.length; i++) {
    if (str[i] === pattern[patternIdx]) {
      score += 1;
      if (prevMatchIdx === i - 1) {
        consecutiveBonus += 0.5;
      }
      prevMatchIdx = i;
      patternIdx++;
    }
  }

  if (patternIdx !== pattern.length) return 0;

  return (score + consecutiveBonus) / pattern.length;
}

export const NodeSearch: React.FC<NodeSearchProps> = ({
  isOpen,
  onClose,
  onSelectNode
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentNodes, setRecentNodes] = useState<string[]>([]);
  const [favoriteNodes, setFavoriteNodes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent and favorite nodes from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentNodes');
    const favorites = localStorage.getItem('favoriteNodes');
    if (recent) setRecentNodes(JSON.parse(recent));
    if (favorites) setFavoriteNodes(JSON.parse(favorites));
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search results with fuzzy matching
  const searchResults = useMemo((): SearchResult[] => {
    const allNodes = Object.entries(nodeTypes).map(([type, node]) => ({
      type,
      label: node.label,
      category: node.category,
      description: node.description || '',
      icon: node.icon || 'Zap',
      score: 0
    }));

    if (!query.trim()) {
      // Show recent nodes first, then favorites, then popular
      const recentSet = new Set(recentNodes);
      const favoriteSet = new Set(favoriteNodes);

      return allNodes
        .map(node => ({
          ...node,
          score: recentSet.has(node.type) ? 100 : favoriteSet.has(node.type) ? 50 : 0
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    }

    // Fuzzy search on label, type, category, and description
    return allNodes
      .map(node => {
        const labelScore = fuzzyMatch(query, node.label) * 4;
        const typeScore = fuzzyMatch(query, node.type) * 3;
        const categoryScore = fuzzyMatch(query, node.category) * 2;
        const descScore = fuzzyMatch(query, node.description) * 1;
        return {
          ...node,
          score: Math.max(labelScore, typeScore, categoryScore, descScore)
        };
      })
      .filter(node => node.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [query, recentNodes, favoriteNodes]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex].type);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [searchResults, selectedIndex, onClose]);

  // Handle node selection
  const handleSelect = (nodeType: string) => {
    // Update recent nodes
    const newRecent = [nodeType, ...recentNodes.filter(n => n !== nodeType)].slice(0, 10);
    setRecentNodes(newRecent);
    localStorage.setItem('recentNodes', JSON.stringify(newRecent));

    onSelectNode(nodeType);
    onClose();
  };

  // Toggle favorite
  const toggleFavorite = (nodeType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favoriteNodes.includes(nodeType)
      ? favoriteNodes.filter(n => n !== nodeType)
      : [...favoriteNodes, nodeType];
    setFavoriteNodes(newFavorites);
    localStorage.setItem('favoriteNodes', JSON.stringify(newFavorites));
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search nodes... (e.g. 'slack', 'http', 'email')"
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto"
        >
          {searchResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No nodes found for "{query}"
            </div>
          ) : (
            searchResults.map((result, index) => (
              <div
                key={result.type}
                className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => handleSelect(result.type)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* Node icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white mr-3`}>
                  <Zap className="w-5 h-5" />
                </div>

                {/* Node info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {result.label}
                    </span>
                    {recentNodes.includes(result.type) && (
                      <span title="Recently used">
                        <Clock className="w-3 h-3 text-gray-400" />
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {result.category} - {result.description}
                  </div>
                </div>

                {/* Favorite button */}
                <button
                  onClick={(e) => toggleFavorite(result.type, e)}
                  className={`p-2 rounded-lg transition-colors ${
                    favoriteNodes.includes(result.type)
                      ? 'text-yellow-500 hover:bg-yellow-50'
                      : 'text-gray-300 hover:text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <Star className={`w-4 h-4 ${favoriteNodes.includes(result.type) ? 'fill-current' : ''}`} />
                </button>

                {/* Arrow indicator */}
                {index === selectedIndex && (
                  <ArrowRight className="w-4 h-4 text-blue-500 ml-2" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer with shortcuts */}
        <div className="px-4 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border">Enter</kbd> Select</span>
          <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border">Esc</kbd> Close</span>
          <span className="ml-auto">{searchResults.length} nodes</span>
        </div>
      </div>
    </div>
  );
};

export default NodeSearch;
