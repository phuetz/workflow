import React, { useState, useEffect } from 'react';
import {
  Edit, Eye, HelpCircle, Info, Keyboard, Navigation,
  Search, Workflow, X
} from 'lucide-react';
import { useKeyboardShortcuts, KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { getShortcutsByCategory, formatShortcut, isMac } = useKeyboardShortcuts(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const shortcuts = getShortcutsByCategory();

  // Filter shortcuts based on search
  const filteredShortcuts = Object.entries(shortcuts).reduce(
    (acc, [category, categoryShortcuts]) => {
      if (selectedCategory !== 'all' && category !== selectedCategory) {
        return acc;
      }

      const filtered = categoryShortcuts.filter(
        shortcut =>
          shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          formatShortcut(shortcut).toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filtered.length > 0) {
        acc[category] = filtered;
      }

      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  // Category labels and icons
  const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    workflow: {
      label: 'Workflow Management',
      icon: <Workflow className="w-4 h-4" />,
      color: 'text-blue-500',
    },
    editing: {
      label: 'Editing',
      icon: <Edit className="w-4 h-4" />,
      color: 'text-green-500',
    },
    navigation: {
      label: 'Navigation',
      icon: <Navigation className="w-4 h-4" />,
      color: 'text-purple-500',
    },
    view: {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      color: 'text-orange-500',
    },
    help: {
      label: 'Help',
      icon: <HelpCircle className="w-4 h-4" />,
      color: 'text-gray-500',
    },
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalShortcuts = Object.values(shortcuts).reduce((sum, cat) => sum + cat.length, 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {totalShortcuts} shortcuts available
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search shortcuts..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                autoFocus
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {config.icon}
                {config.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {Object.keys(filteredShortcuts).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No shortcuts found matching "{searchTerm}"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(filteredShortcuts).map(([category, categoryShortcuts]) => {
                const config = categoryConfig[category];
                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={config.color}>{config.icon}</div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {config.label}
                      </h3>
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {categoryShortcuts.length}
                      </span>
                    </div>

                    {/* Shortcuts List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors group"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {formatShortcut(shortcut)
                              .split(isMac ? '' : '+')
                              .map((key, i) => (
                                <kbd
                                  key={i}
                                  className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300 shadow-sm min-w-[28px] text-center"
                                >
                                  {key}
                                </kbd>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono">Esc</kbd> to close</span>
              <span>•</span>
              <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono">?</kbd> to open</span>
            </div>
            <div className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>Shortcuts work globally in the editor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
