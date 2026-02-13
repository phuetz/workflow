/**
 * Quick Node Search
 * Opens with Tab key for fast node addition (like n8n)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Plus, Zap, X, ArrowRight, Hash, Clock, Star } from 'lucide-react';
import { nodeTypes, nodeCategories } from '../../data/nodeTypes';
import { useWorkflowStore } from '../../store/workflowStore';

interface QuickNodeSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (nodeType: string, position?: { x: number; y: number }) => void;
  position?: { x: number; y: number };
}

const QuickNodeSearch: React.FC<QuickNodeSearchProps> = ({
  isOpen,
  onClose,
  onAddNode,
  position,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Recent nodes (stored in localStorage)
  const recentNodes = useMemo(() => {
    try {
      const stored = localStorage.getItem('recentNodes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Popular nodes
  const popularNodes = ['http-request', 'code', 'set-variable', 'condition', 'merge', 'webhook', 'schedule'];

  // Categories with icons
  const categories = useMemo(() => {
    const cats = new Map<string, { count: number; color: string }>();
    Object.values(nodeTypes).forEach(node => {
      const cat = node.category || 'other';
      const existing = cats.get(cat) || { count: 0, color: node.color || '#6b7280' };
      cats.set(cat, { count: existing.count + 1, color: existing.color });
    });
    return Array.from(cats.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      color: data.color,
    }));
  }, []);

  // Fuzzy search scoring function
  const fuzzyScore = useCallback((str: string, query: string): number => {
    const s = str.toLowerCase();
    const q = query.toLowerCase();

    // Exact match gets highest score
    if (s === q) return 100;
    // Starts with gets high score
    if (s.startsWith(q)) return 80 + (q.length / s.length) * 20;
    // Contains gets medium score
    if (s.includes(q)) return 50 + (q.length / s.length) * 30;

    // Fuzzy matching - characters in order
    let score = 0;
    let queryIndex = 0;
    let consecutive = 0;

    for (let i = 0; i < s.length && queryIndex < q.length; i++) {
      if (s[i] === q[queryIndex]) {
        queryIndex++;
        consecutive++;
        score += consecutive * 2; // Bonus for consecutive matches
      } else {
        consecutive = 0;
      }
    }

    if (queryIndex === q.length) {
      return Math.min(40, score + (q.length / s.length) * 20);
    }

    return 0;
  }, []);

  // Filter and score nodes
  const filteredNodes = useMemo(() => {
    let nodes = Object.values(nodeTypes);

    // Filter by category
    if (selectedCategory) {
      nodes = nodes.filter(n => n.category === selectedCategory);
    }

    // Filter and score by search
    if (search.trim()) {
      const query = search.toLowerCase();

      // Score each node
      const scoredNodes = nodes.map(n => {
        const labelScore = fuzzyScore(n.label, query);
        const typeScore = fuzzyScore(n.type, query) * 0.8;
        const descScore = n.description ? fuzzyScore(n.description, query) * 0.5 : 0;
        const categoryScore = n.category ? fuzzyScore(n.category, query) * 0.3 : 0;

        // Bonus for popular nodes
        const isPopular = popularNodes.includes(n.type);
        const popularBonus = isPopular ? 5 : 0;

        // Bonus for recent nodes
        const isRecent = recentNodes.includes(n.type);
        const recentBonus = isRecent ? 10 : 0;

        const totalScore = Math.max(labelScore, typeScore, descScore, categoryScore) + popularBonus + recentBonus;

        return { node: n, score: totalScore };
      });

      // Filter and sort by score
      return scoredNodes
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ node }) => node)
        .slice(0, 20);
    }

    // Without search, prioritize recent and popular
    const recent = nodes.filter(n => recentNodes.includes(n.type));
    const popular = nodes.filter(n => popularNodes.includes(n.type) && !recentNodes.includes(n.type));
    const others = nodes.filter(n => !recentNodes.includes(n.type) && !popularNodes.includes(n.type));

    return [...recent, ...popular, ...others].slice(0, 20);
  }, [search, selectedCategory, fuzzyScore, recentNodes]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredNodes.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredNodes[selectedIndex]) {
            handleAddNode(filteredNodes[selectedIndex].type);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (selectedCategory) {
            setSelectedCategory(null);
          } else {
            onClose();
          }
          break;
        case 'Tab':
          e.preventDefault();
          // Cycle through categories
          const catIndex = categories.findIndex(c => c.name === selectedCategory);
          if (catIndex < categories.length - 1) {
            setSelectedCategory(categories[catIndex + 1].name);
          } else {
            setSelectedCategory(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNodes, selectedIndex, selectedCategory, categories, onClose]);

  // Reset and focus when opening
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setSelectedCategory(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Handle add node
  const handleAddNode = useCallback((nodeType: string) => {
    // Save to recent
    const recent = [nodeType, ...recentNodes.filter((n: string) => n !== nodeType)].slice(0, 5);
    localStorage.setItem('recentNodes', JSON.stringify(recent));

    onAddNode(nodeType, position);
    onClose();
  }, [onAddNode, onClose, position, recentNodes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Search Panel */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search nodes... (Tab to filter by category)"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
          />
          {selectedCategory && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              {selectedCategory}
            </span>
          )}
          <kbd className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">ESC</kbd>
        </div>

        {/* Categories */}
        {!search && !selectedCategory && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 8).map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="capitalize">{cat.name}</span>
                  <span className="text-xs text-gray-400">({cat.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent & Popular */}
        {!search && !selectedCategory && recentNodes.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock size={12} /> Recent
            </p>
            <div className="flex flex-wrap gap-1">
              {recentNodes.map((type: string) => {
                const node = nodeTypes[type];
                if (!node) return null;
                return (
                  <button
                    key={type}
                    onClick={() => handleAddNode(type)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-blue-100 hover:text-blue-700 transition-colors"
                  >
                    {node.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Node List */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {filteredNodes.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No nodes found for "{search}"
            </div>
          ) : (
            filteredNodes.map((node, index) => (
              <button
                key={node.type}
                data-index={index}
                onClick={() => handleAddNode(node.type)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-sm"
                  style={{ backgroundColor: node.color || '#6b7280' }}
                >
                  {node.label.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{node.label}</span>
                    {popularNodes.includes(node.type) && (
                      <Star size={12} className="text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {node.description}
                  </p>
                  <span className="text-xs text-gray-400 capitalize">{node.category}</span>
                </div>
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100">
                  <Plus size={16} className="text-gray-400" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border rounded">↵</kbd> Add
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border rounded">Tab</kbd> Category
            </span>
          </div>
          <span>{filteredNodes.length} nodes</span>
        </div>
      </div>
    </div>
  );
};

export default QuickNodeSearch;
