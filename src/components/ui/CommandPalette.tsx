/**
 * Command Palette / Spotlight Search
 * Modern keyboard-first navigation following 2025 UX best practices
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Command, X, ArrowRight, Clock, Star,
  FileText, Workflow, Settings, Zap, Users, Database,
  Play, Plus, Folder, Hash, Terminal, HelpCircle,
  ChevronRight, CornerDownLeft
} from 'lucide-react';
import { logger } from '../../services/SimpleLogger';

// ============================================================================
// Types
// ============================================================================

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  category: string;
  keywords?: string[];
  shortcut?: string[];
  action: () => void;
  badge?: string;
}

export interface CommandCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: CommandItem[];
  placeholder?: string;
  recentSearches?: string[];
  onSearch?: (query: string) => void;
}

// ============================================================================
// Default Categories
// ============================================================================

const DEFAULT_CATEGORIES: CommandCategory[] = [
  { id: 'workflows', label: 'Workflows', icon: <Workflow className="w-4 h-4" /> },
  { id: 'nodes', label: 'Nodes', icon: <Hash className="w-4 h-4" /> },
  { id: 'actions', label: 'Actions', icon: <Zap className="w-4 h-4" /> },
  { id: 'navigation', label: 'Navigation', icon: <ArrowRight className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  { id: 'help', label: 'Help', icon: <HelpCircle className="w-4 h-4" /> },
];

// ============================================================================
// Default Commands
// ============================================================================

const DEFAULT_COMMANDS: CommandItem[] = [
  {
    id: 'new-workflow',
    title: 'Create New Workflow',
    description: 'Start a new automation workflow',
    icon: <Plus className="w-4 h-4" />,
    category: 'workflows',
    keywords: ['new', 'create', 'workflow', 'add'],
    shortcut: ['Ctrl', 'N'],
    action: () => logger.debug('Command palette: Create workflow'),
  },
  {
    id: 'open-workflow',
    title: 'Open Workflow',
    description: 'Open an existing workflow',
    icon: <Folder className="w-4 h-4" />,
    category: 'workflows',
    keywords: ['open', 'load', 'workflow'],
    shortcut: ['Ctrl', 'O'],
    action: () => logger.debug('Command palette: Open workflow'),
  },
  {
    id: 'run-workflow',
    title: 'Execute Workflow',
    description: 'Run the current workflow',
    icon: <Play className="w-4 h-4" />,
    category: 'actions',
    keywords: ['run', 'execute', 'start', 'play'],
    shortcut: ['Ctrl', 'Enter'],
    action: () => logger.debug('Command palette: Run workflow'),
  },
  {
    id: 'add-node',
    title: 'Add Node',
    description: 'Add a new node to the canvas',
    icon: <Plus className="w-4 h-4" />,
    category: 'nodes',
    keywords: ['add', 'node', 'new'],
    shortcut: ['N'],
    action: () => logger.debug('Command palette: Add node'),
  },
  {
    id: 'templates',
    title: 'Browse Templates',
    description: 'Explore workflow templates',
    icon: <FileText className="w-4 h-4" />,
    category: 'navigation',
    keywords: ['templates', 'examples', 'browse'],
    action: () => logger.debug('Command palette: Browse templates'),
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Open application settings',
    icon: <Settings className="w-4 h-4" />,
    category: 'settings',
    keywords: ['settings', 'preferences', 'config'],
    shortcut: ['Ctrl', ','],
    action: () => logger.debug('Command palette: Open settings'),
  },
  {
    id: 'documentation',
    title: 'Documentation',
    description: 'View documentation and guides',
    icon: <HelpCircle className="w-4 h-4" />,
    category: 'help',
    keywords: ['help', 'docs', 'documentation', 'guide'],
    shortcut: ['F1'],
    action: () => logger.debug('Command palette: Open docs'),
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'View all keyboard shortcuts',
    icon: <Command className="w-4 h-4" />,
    category: 'help',
    keywords: ['shortcuts', 'keyboard', 'keys', 'hotkeys'],
    shortcut: ['?'],
    action: () => logger.debug('Command palette: Show shortcuts'),
  },
];

// ============================================================================
// Component
// ============================================================================

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands = DEFAULT_COMMANDS,
  placeholder = 'Type a command or search...',
  recentSearches = [],
  onSearch,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query && !selectedCategory) return commands;

    return commands.filter(cmd => {
      // Category filter
      if (selectedCategory && cmd.category !== selectedCategory) return false;

      // Text search
      if (query) {
        const searchLower = query.toLowerCase();
        const matchTitle = cmd.title.toLowerCase().includes(searchLower);
        const matchDesc = cmd.description?.toLowerCase().includes(searchLower);
        const matchKeywords = cmd.keywords?.some(k => k.toLowerCase().includes(searchLower));
        return matchTitle || matchDesc || matchKeywords;
      }

      return true;
    });
  }, [commands, query, selectedCategory]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSelectedCategory(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (query || selectedCategory) {
          setQuery('');
          setSelectedCategory(null);
        } else {
          onClose();
        }
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through categories
        const categoryIds = DEFAULT_CATEGORIES.map(c => c.id);
        const currentIndex = selectedCategory ? categoryIds.indexOf(selectedCategory) : -1;
        const nextIndex = (currentIndex + 1) % (categoryIds.length + 1);
        setSelectedCategory(nextIndex < categoryIds.length ? categoryIds[nextIndex] : null);
        break;
    }
  }, [filteredCommands, selectedIndex, query, selectedCategory, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  if (!isOpen) return null;

  const getCategoryLabel = (categoryId: string) => {
    return DEFAULT_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
  };

  const getCategoryIcon = (categoryId: string) => {
    return DEFAULT_CATEGORIES.find(c => c.id === categoryId)?.icon;
  };

  let flatIndex = 0;

  return createPortal(
    <div className="fixed inset-0 z-[10001]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl animate-scale-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-12 pr-12 py-4 text-lg bg-transparent border-b border-gray-100 dark:border-gray-800 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 px-4 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                transition-colors duration-150
                ${!selectedCategory
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              All
            </button>
            {DEFAULT_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                  transition-colors duration-150
                  ${selectedCategory === category.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {category.icon}
                {category.label}
              </button>
            ))}
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[400px] overflow-y-auto py-2"
          >
            {Object.entries(groupedCommands).length > 0 ? (
              Object.entries(groupedCommands).map(([category, items]) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                  </div>

                  {/* Commands in category */}
                  {items.map(cmd => {
                    const currentIndex = flatIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        data-index={currentIndex}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5
                          transition-colors duration-100
                          ${isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }
                        `}
                      >
                        {/* Icon */}
                        <div
                          className={`
                            p-2 rounded-lg
                            ${isSelected
                              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }
                          `}
                        >
                          {cmd.icon || <Command className="w-4 h-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                isSelected
                                  ? 'text-primary-700 dark:text-primary-300'
                                  : 'text-gray-900 dark:text-gray-100'
                              }`}
                            >
                              {cmd.title}
                            </span>
                            {cmd.badge && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                                {cmd.badge}
                              </span>
                            )}
                          </div>
                          {cmd.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {cmd.description}
                            </p>
                          )}
                        </div>

                        {/* Shortcut */}
                        {cmd.shortcut && (
                          <div className="flex items-center gap-1">
                            {cmd.shortcut.map((key, i) => (
                              <kbd
                                key={i}
                                className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}

                        {/* Arrow indicator */}
                        {isSelected && (
                          <ChevronRight className="w-4 h-4 text-primary-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No commands found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>

          {/* Footer with hints */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="kbd">Tab</kbd>
                  <span>Categories</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="kbd">↑</kbd>
                  <kbd className="kbd">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  <span>Select</span>
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="kbd">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Hook for global keyboard shortcut
// ============================================================================

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}

export default CommandPalette;
