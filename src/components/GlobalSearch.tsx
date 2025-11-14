/**
 * Global Search Component (Cmd+K / Ctrl+K)
 * Quick navigation and command palette
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Workflow, Settings, FileText, Zap, Clock, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { nodeTypes } from '../data/nodeTypes';
import { useWorkflowStore } from '../store/workflowStore';

interface SearchResult {
  type: 'workflow' | 'node' | 'command' | 'recent';
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { workflows, addNode, darkMode } = useWorkflowStore();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
          onClose();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, query, onClose]);

  // Generate search results
  const results = useMemo(() => {
    const searchResults: SearchResult[] = [];

    if (!query) {
      // Show recent items when no query
      searchResults.push({
        type: 'recent',
        id: 'recent-1',
        title: 'Create New Workflow',
        subtitle: 'Start from scratch',
        icon: <Workflow size={18} />,
        action: () => console.log('Create workflow'),
        category: 'Quick Actions'
      });

      searchResults.push({
        type: 'command',
        id: 'settings',
        title: 'Open Settings',
        subtitle: 'Configure your workspace',
        icon: <Settings size={18} />,
        action: () => console.log('Open settings'),
        category: 'Quick Actions'
      });

      return searchResults;
    }

    const lowerQuery = query.toLowerCase();

    // Search workflows
    workflows.forEach(workflow => {
      if (workflow.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'workflow',
          id: workflow.id,
          title: workflow.name,
          subtitle: workflow.description || 'Workflow',
          icon: <FileText size={18} />,
          action: () => console.log('Open workflow:', workflow.id),
          category: 'Workflows'
        });
      }
    });

    // Search nodes
    Object.values(nodeTypes).forEach(node => {
      if (node.label.toLowerCase().includes(lowerQuery) ||
          node.description?.toLowerCase().includes(lowerQuery)) {
        const Icon = Icons[node.icon as keyof typeof Icons] as React.ComponentType<any>;
        searchResults.push({
          type: 'node',
          id: node.type,
          title: node.label,
          subtitle: node.description || 'Node',
          icon: Icon ? <Icon size={18} /> : <Zap size={18} />,
          action: () => addNode(node.type, { x: 100, y: 100 }),
          category: 'Nodes'
        });
      }
    });

    // Search commands
    const commands = [
      {
        id: 'create-workflow',
        title: 'Create New Workflow',
        subtitle: 'Start a new workflow',
        action: () => console.log('Create workflow')
      },
      {
        id: 'import-workflow',
        title: 'Import Workflow',
        subtitle: 'Import from JSON file',
        action: () => console.log('Import workflow')
      },
      {
        id: 'export-workflow',
        title: 'Export Workflow',
        subtitle: 'Save as JSON file',
        action: () => console.log('Export workflow')
      },
      {
        id: 'toggle-dark-mode',
        title: 'Toggle Dark Mode',
        subtitle: darkMode ? 'Switch to light mode' : 'Switch to dark mode',
        action: () => console.log('Toggle dark mode')
      }
    ];

    commands.forEach(cmd => {
      if (cmd.title.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'command',
          id: cmd.id,
          title: cmd.title,
          subtitle: cmd.subtitle,
          icon: <Zap size={18} />,
          action: cmd.action,
          category: 'Commands'
        });
      }
    });

    return searchResults;
  }, [query, workflows, darkMode, addNode]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>();

    results.forEach(result => {
      const category = result.category || 'Other';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(result);
    });

    return groups;
  }, [results]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl mx-4 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-2xl border overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className={`flex items-center px-4 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <Search className="text-gray-400 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search workflows, nodes, commands..."
            className={`flex-1 bg-transparent outline-none text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center space-x-2">
            <kbd className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {groupedResults.size === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Search className="mx-auto mb-3" size={40} />
              <p>No results found</p>
            </div>
          ) : (
            Array.from(groupedResults.entries()).map(([category, items]) => (
              <div key={category}>
                <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-500 bg-gray-800' : 'text-gray-600 bg-gray-50'}`}>
                  {category}
                </div>
                {items.map((result, idx) => {
                  const globalIndex = results.indexOf(result);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={result.id}
                      className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                        isSelected
                          ? darkMode ? 'bg-gray-800' : 'bg-blue-50'
                          : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        result.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        {result.icon}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-sm text-gray-500 truncate">
                            {result.subtitle}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <ChevronRight className="flex-shrink-0 text-gray-400" size={16} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex items-center justify-between text-xs text-gray-500`}>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <kbd className={`px-2 py-1 mr-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center">
              <kbd className={`px-2 py-1 mr-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>Enter</kbd>
              Select
            </span>
          </div>
          <div className="flex items-center">
            {results.length} results
          </div>
        </div>
      </div>
    </div>
  );
}

// Global keyboard shortcut hook
export function useGlobalSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
