/**
 * Node Search History
 * Track and display recent node searches (like n8n)
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  Clock,
  Star,
  Trash2,
  TrendingUp,
  X,
  ArrowRight,
  History,
  Zap,
  Filter,
} from 'lucide-react';
import { logger } from '../../services/SimpleLogger';

interface NodeSearchHistoryProps {
  onSelectNode: (nodeType: string) => void;
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

interface SearchHistoryItem {
  id: string;
  query: string;
  nodeType: string;
  nodeName: string;
  timestamp: Date;
  usageCount: number;
  isFavorite: boolean;
}

interface TrendingNode {
  nodeType: string;
  nodeName: string;
  category: string;
  usageCount: number;
  trend: 'up' | 'down' | 'stable';
}

const STORAGE_KEY = 'nodeSearchHistory';
const MAX_HISTORY_ITEMS = 20;

// Mock trending nodes
const TRENDING_NODES: TrendingNode[] = [
  { nodeType: 'http-request', nodeName: 'HTTP Request', category: 'Core', usageCount: 1250, trend: 'up' },
  { nodeType: 'openai', nodeName: 'OpenAI', category: 'AI', usageCount: 980, trend: 'up' },
  { nodeType: 'webhook', nodeName: 'Webhook', category: 'Triggers', usageCount: 890, trend: 'stable' },
  { nodeType: 'code', nodeName: 'Code', category: 'Core', usageCount: 756, trend: 'up' },
  { nodeType: 'if', nodeName: 'If', category: 'Logic', usageCount: 654, trend: 'stable' },
  { nodeType: 'slack', nodeName: 'Slack', category: 'Communication', usageCount: 543, trend: 'down' },
];

const NodeSearchHistory: React.FC<NodeSearchHistoryProps> = ({
  onSelectNode,
  isOpen,
  onClose,
  position,
}) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'recent' | 'favorites' | 'trending'>('recent');
  const [searchTerm, setSearchTerm] = useState('');

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSearchHistory(parsed.map((item: SearchHistoryItem) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        })));
      } catch (e) {
        logger.error('Failed to parse search history');
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((history: SearchHistoryItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
  }, []);

  // Add to history
  const addToHistory = useCallback((nodeType: string, nodeName: string, query?: string) => {
    setSearchHistory(prev => {
      const existing = prev.find(h => h.nodeType === nodeType);
      let updated: SearchHistoryItem[];

      if (existing) {
        updated = prev.map(h =>
          h.nodeType === nodeType
            ? { ...h, usageCount: h.usageCount + 1, timestamp: new Date() }
            : h
        );
      } else {
        updated = [
          {
            id: `history-${Date.now()}`,
            query: query || nodeName,
            nodeType,
            nodeName,
            timestamp: new Date(),
            usageCount: 1,
            isFavorite: false,
          },
          ...prev,
        ].slice(0, MAX_HISTORY_ITEMS);
      }

      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // Toggle favorite
  const toggleFavorite = useCallback((itemId: string) => {
    setSearchHistory(prev => {
      const updated = prev.map(h =>
        h.id === itemId ? { ...h, isFavorite: !h.isFavorite } : h
      );
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // Remove from history
  const removeFromHistory = useCallback((itemId: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(h => h.id !== itemId);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Handle select
  const handleSelect = useCallback((item: SearchHistoryItem | TrendingNode) => {
    const nodeType = item.nodeType;
    const nodeName = item.nodeName;
    addToHistory(nodeType, nodeName);
    onSelectNode(nodeType);
    onClose();
  }, [addToHistory, onSelectNode, onClose]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items: SearchHistoryItem[] = [];

    if (activeTab === 'recent') {
      items = searchHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else if (activeTab === 'favorites') {
      items = searchHistory.filter(h => h.isFavorite);
    }

    if (searchTerm) {
      items = items.filter(item =>
        item.nodeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.query.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [searchHistory, activeTab, searchTerm]);

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95"
      style={{
        left: position?.x || '50%',
        top: position?.y || '50%',
        transform: !position ? 'translate(-50%, -50%)' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <History size={18} className="text-blue-600" />
          <span className="font-semibold text-gray-900">Search History</span>
        </div>
        <div className="flex items-center gap-1">
          {activeTab === 'recent' && searchHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
              title="Clear history"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Search filter */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter history..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'recent'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={14} />
          Recent
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'favorites'
              ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Star size={14} />
          Favorites
        </button>
        <button
          onClick={() => setActiveTab('trending')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'trending'
              ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp size={14} />
          Trending
        </button>
      </div>

      {/* Content */}
      <div className="max-h-72 overflow-y-auto">
        {activeTab === 'trending' ? (
          // Trending nodes
          <div className="p-2">
            {TRENDING_NODES.map(node => (
              <button
                key={node.nodeType}
                onClick={() => handleSelect(node)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                  <Zap size={16} className="text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">{node.nodeName}</p>
                  <p className="text-xs text-gray-500">{node.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{node.usageCount.toLocaleString()}</span>
                  {node.trend === 'up' && (
                    <TrendingUp size={12} className="text-green-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            {activeTab === 'favorites' ? (
              <>
                <Star size={32} className="opacity-50 mb-2" />
                <p className="text-sm">No favorites yet</p>
                <p className="text-xs mt-1">Star items to add them here</p>
              </>
            ) : (
              <>
                <Clock size={32} className="opacity-50 mb-2" />
                <p className="text-sm">No search history</p>
                <p className="text-xs mt-1">Your recent searches will appear here</p>
              </>
            )}
          </div>
        ) : (
          // History list
          <div className="p-2">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => handleSelect(item)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Search size={14} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.nodeName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatRelativeTime(item.timestamp)}</span>
                      {item.usageCount > 1 && (
                        <span className="px-1 bg-gray-100 rounded">×{item.usageCount}</span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                      item.isFavorite ? 'text-amber-500' : 'text-gray-400'
                    }`}
                  >
                    <Star size={14} fill={item.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => removeFromHistory(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        <span>
          {activeTab === 'trending'
            ? 'Based on community usage'
            : `${filteredItems.length} items`
          }
        </span>
        <button className="text-blue-600 hover:underline flex items-center gap-1">
          View all <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
};

export default NodeSearchHistory;
