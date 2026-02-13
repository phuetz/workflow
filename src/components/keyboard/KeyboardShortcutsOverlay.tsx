/**
 * Keyboard Shortcuts Overlay
 * Press '?' to show all available shortcuts (2025 UX standard)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Command, Keyboard, Search, Copy, Trash2, Play,
  Save, Undo, Redo, ZoomIn, ZoomOut, Maximize2,
  Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Home, Settings, HelpCircle
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ShortcutGroup {
  name: string;
  icon: React.ReactNode;
  shortcuts: Shortcut[];
}

interface Shortcut {
  keys: string[];
  description: string;
  category?: string;
}

// ============================================================================
// Shortcut Data
// ============================================================================

const shortcutGroups: ShortcutGroup[] = [
  {
    name: 'General',
    icon: <Command className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Ctrl', 'S'], description: 'Save workflow' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', 'F'], description: 'Search nodes' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close panel / Deselect' },
    ],
  },
  {
    name: 'Canvas',
    icon: <Maximize2 className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Space', 'Drag'], description: 'Pan canvas' },
      { keys: ['Ctrl', '+'], description: 'Zoom in' },
      { keys: ['Ctrl', '-'], description: 'Zoom out' },
      { keys: ['Ctrl', '0'], description: 'Reset zoom' },
      { keys: ['Ctrl', '1'], description: 'Fit to screen' },
      { keys: ['G'], description: 'Toggle grid' },
      { keys: ['M'], description: 'Toggle minimap' },
    ],
  },
  {
    name: 'Nodes',
    icon: <Plus className="w-4 h-4" />,
    shortcuts: [
      { keys: ['N'], description: 'Add new node' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected nodes' },
      { keys: ['Ctrl', 'V'], description: 'Paste nodes' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selected' },
      { keys: ['Delete'], description: 'Delete selected' },
      { keys: ['Ctrl', 'A'], description: 'Select all nodes' },
      { keys: ['Shift', 'Click'], description: 'Multi-select nodes' },
      { keys: ['Enter'], description: 'Open node settings' },
    ],
  },
  {
    name: 'Execution',
    icon: <Play className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], description: 'Execute workflow' },
      { keys: ['Shift', 'Enter'], description: 'Execute selected node' },
      { keys: ['Ctrl', '.'], description: 'Stop execution' },
      { keys: ['F5'], description: 'Run with debug' },
      { keys: ['F9'], description: 'Toggle breakpoint' },
      { keys: ['F10'], description: 'Step over' },
    ],
  },
  {
    name: 'Navigation',
    icon: <ArrowUp className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Tab'], description: 'Next node' },
      { keys: ['Shift', 'Tab'], description: 'Previous node' },
      { keys: ['↑', '↓', '←', '→'], description: 'Move selected node' },
      { keys: ['Home'], description: 'Go to start node' },
      { keys: ['End'], description: 'Go to end node' },
    ],
  },
];

// ============================================================================
// Key Display Component
// ============================================================================

const KeyBadge: React.FC<{ keyName: string }> = ({ keyName }) => {
  // Map special keys to symbols or shorter text
  const keyMap: Record<string, string> = {
    'Ctrl': '⌃',
    'Alt': '⌥',
    'Shift': '⇧',
    'Enter': '↵',
    'Delete': '⌫',
    'Space': '␣',
    'Tab': '⇥',
    'Esc': '⎋',
    'Escape': '⎋',
  };

  const displayKey = keyMap[keyName] || keyName;
  const isSymbol = Object.values(keyMap).includes(displayKey);

  return (
    <kbd
      className={`
        inline-flex items-center justify-center
        min-w-[24px] h-6 px-1.5
        bg-gray-100 dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        rounded-md shadow-sm
        text-xs font-mono font-medium
        text-gray-700 dark:text-gray-300
        ${isSymbol ? 'text-base' : ''}
      `}
    >
      {displayKey}
    </kbd>
  );
};

// ============================================================================
// Shortcut Row Component
// ============================================================================

const ShortcutRow: React.FC<{ shortcut: Shortcut }> = ({ shortcut }) => {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {shortcut.description}
      </span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, i) => (
          <React.Fragment key={i}>
            <KeyBadge keyName={key} />
            {i < shortcut.keys.length - 1 && (
              <span className="text-gray-400 text-xs">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface KeyboardShortcutsOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const KeyboardShortcutsOverlay: React.FC<KeyboardShortcutsOverlayProps> = ({
  isOpen: controlledIsOpen,
  onClose,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const isOpen = controlledIsOpen ?? internalIsOpen;
  const handleClose = onClose ?? (() => setInternalIsOpen(false));

  // Listen for '?' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setInternalIsOpen(prev => !prev);
      }

      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Filter shortcuts based on search
  const filteredGroups = shortcutGroups.map(group => ({
    ...group,
    shortcuts: group.shortcuts.filter(s =>
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keys.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter(group => group.shortcuts.length > 0);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Keyboard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Press <KeyBadge keyName="?" /> anytime to view
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-180px)]">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveGroup(null)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${activeGroup === null
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              All
            </button>
            {shortcutGroups.map(group => (
              <button
                key={group.name}
                onClick={() => setActiveGroup(group.name)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                  ${activeGroup === group.name
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                {group.icon}
                {group.name}
              </button>
            ))}
          </div>

          {/* Shortcuts list */}
          <div className="space-y-6">
            {(activeGroup ? filteredGroups.filter(g => g.name === activeGroup) : filteredGroups).map(group => (
              <div key={group.name}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 dark:text-gray-500">{group.icon}</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {group.name}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ({group.shortcuts.length})
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
                  {group.shortcuts.map((shortcut, i) => (
                    <ShortcutRow key={i} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className="py-8 text-center">
                <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No shortcuts found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Pro tip: Most shortcuts work when the canvas is focused</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <KeyBadge keyName="↑" />
                <KeyBadge keyName="↓" />
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <KeyBadge keyName="Esc" />
                Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Hook for programmatic control
export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle, setIsOpen };
}

export default KeyboardShortcutsOverlay;
