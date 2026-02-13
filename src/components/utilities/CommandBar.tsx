/**
 * Command Bar Component (Ctrl+K)
 * Similar to n8n's command palette for quick actions
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Save,
  Play,
  Download,
  Upload,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Undo2,
  Redo2,
  Layout,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Eye,
  EyeOff,
  Settings,
  Keyboard,
  FileJson,
  Workflow,
  Zap,
  Bug,
  History,
  FolderOpen,
  FilePlus,
  Share2,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Command,
  Sparkles,
  Palette,
  StickyNote,
  Moon,
  Sun,
  HelpCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { nodeTypes, nodeCategories } from '../../data/nodeTypes';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  category: 'workflow' | 'node' | 'edit' | 'view' | 'navigation' | 'help';
  action: () => void;
  keywords?: string[];
}

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (nodeType: string) => void;
  onSave: () => void;
  onExecute: () => void;
  onExport: () => void;
  onImport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
  onToggleMiniMap: () => void;
  onToggleSidebar: () => void;
  onOpenShortcuts: () => void;
  onOpenTemplates: () => void;
  onOpenAIBuilder: () => void;
  onOpenN8nImport: () => void;
  onTidyUp: () => void;
  onToggleDarkMode: () => void;
  onAddStickyNote: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const CommandBar: React.FC<CommandBarProps> = ({
  isOpen,
  onClose,
  onAddNode,
  onSave,
  onExecute,
  onExport,
  onImport,
  onUndo,
  onRedo,
  onFitView,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
  onToggleMiniMap,
  onToggleSidebar,
  onOpenShortcuts,
  onOpenTemplates,
  onOpenAIBuilder,
  onOpenN8nImport,
  onTidyUp,
  onToggleDarkMode,
  onAddStickyNote,
  onDeleteSelected,
  onDuplicateSelected,
  onSelectAll,
  onDeselectAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'commands' | 'nodes'>('commands');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { darkMode, selectedNode, selectedNodes } = useWorkflowStore();

  // Define all commands
  const commands: CommandItem[] = useMemo(() => [
    // Workflow Actions
    {
      id: 'save',
      label: 'Save Workflow',
      description: 'Save current workflow',
      icon: <Save className="w-4 h-4" />,
      shortcut: '⌘S',
      category: 'workflow',
      action: onSave,
      keywords: ['save', 'store', 'persist'],
    },
    {
      id: 'execute',
      label: 'Execute Workflow',
      description: 'Run the workflow',
      icon: <Play className="w-4 h-4" />,
      shortcut: '⌘Enter',
      category: 'workflow',
      action: onExecute,
      keywords: ['run', 'execute', 'start', 'play'],
    },
    {
      id: 'export',
      label: 'Export Workflow',
      description: 'Export as JSON',
      icon: <Download className="w-4 h-4" />,
      shortcut: '⌘E',
      category: 'workflow',
      action: onExport,
      keywords: ['export', 'download', 'json'],
    },
    {
      id: 'import',
      label: 'Import Workflow',
      description: 'Import from JSON',
      icon: <Upload className="w-4 h-4" />,
      shortcut: '⌘I',
      category: 'workflow',
      action: onImport,
      keywords: ['import', 'upload', 'load'],
    },
    {
      id: 'import-n8n',
      label: 'Import n8n Workflow',
      description: 'Import workflow from n8n format',
      icon: <FileJson className="w-4 h-4 text-orange-500" />,
      category: 'workflow',
      action: onOpenN8nImport,
      keywords: ['n8n', 'import', 'convert', 'migrate'],
    },
    {
      id: 'templates',
      label: 'Browse Templates',
      description: 'Open template gallery',
      icon: <Workflow className="w-4 h-4" />,
      category: 'workflow',
      action: onOpenTemplates,
      keywords: ['templates', 'gallery', 'examples'],
    },
    {
      id: 'ai-builder',
      label: 'AI Workflow Builder',
      description: 'Create workflow with AI',
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      category: 'workflow',
      action: onOpenAIBuilder,
      keywords: ['ai', 'assistant', 'generate', 'create'],
    },

    // Node Actions
    {
      id: 'add-node',
      label: 'Add Node...',
      description: 'Search and add a node',
      icon: <Plus className="w-4 h-4" />,
      shortcut: 'Tab',
      category: 'node',
      action: () => setMode('nodes'),
      keywords: ['add', 'new', 'node', 'insert'],
    },
    {
      id: 'sticky-note',
      label: 'Add Sticky Note',
      description: 'Add a sticky note to canvas',
      icon: <StickyNote className="w-4 h-4 text-yellow-500" />,
      shortcut: '⇧S',
      category: 'node',
      action: onAddStickyNote,
      keywords: ['sticky', 'note', 'comment', 'annotation'],
    },
    {
      id: 'delete',
      label: 'Delete Selected',
      description: 'Delete selected nodes',
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      shortcut: 'Del',
      category: 'node',
      action: onDeleteSelected,
      keywords: ['delete', 'remove', 'trash'],
    },
    {
      id: 'duplicate',
      label: 'Duplicate Selected',
      description: 'Duplicate selected nodes',
      icon: <Copy className="w-4 h-4" />,
      shortcut: '⌘D',
      category: 'node',
      action: onDuplicateSelected,
      keywords: ['duplicate', 'copy', 'clone'],
    },

    // Edit Actions
    {
      id: 'undo',
      label: 'Undo',
      description: 'Undo last action',
      icon: <Undo2 className="w-4 h-4" />,
      shortcut: '⌘Z',
      category: 'edit',
      action: onUndo,
      keywords: ['undo', 'back', 'revert'],
    },
    {
      id: 'redo',
      label: 'Redo',
      description: 'Redo last action',
      icon: <Redo2 className="w-4 h-4" />,
      shortcut: '⌘⇧Z',
      category: 'edit',
      action: onRedo,
      keywords: ['redo', 'forward'],
    },
    {
      id: 'select-all',
      label: 'Select All',
      description: 'Select all nodes',
      icon: <Grid3X3 className="w-4 h-4" />,
      shortcut: '⌘A',
      category: 'edit',
      action: onSelectAll,
      keywords: ['select', 'all'],
    },
    {
      id: 'deselect',
      label: 'Deselect All',
      description: 'Clear selection',
      icon: <X className="w-4 h-4" />,
      shortcut: 'Esc',
      category: 'edit',
      action: onDeselectAll,
      keywords: ['deselect', 'clear', 'none'],
    },

    // View Actions
    {
      id: 'fit-view',
      label: 'Fit to Screen',
      description: 'Fit workflow to viewport',
      icon: <Maximize2 className="w-4 h-4" />,
      shortcut: '⌘1',
      category: 'view',
      action: onFitView,
      keywords: ['fit', 'zoom', 'screen', 'viewport'],
    },
    {
      id: 'zoom-in',
      label: 'Zoom In',
      description: 'Zoom in canvas',
      icon: <ZoomIn className="w-4 h-4" />,
      shortcut: '⌘+',
      category: 'view',
      action: onZoomIn,
      keywords: ['zoom', 'in', 'magnify'],
    },
    {
      id: 'zoom-out',
      label: 'Zoom Out',
      description: 'Zoom out canvas',
      icon: <ZoomOut className="w-4 h-4" />,
      shortcut: '⌘-',
      category: 'view',
      action: onZoomOut,
      keywords: ['zoom', 'out', 'shrink'],
    },
    {
      id: 'tidy-up',
      label: 'Tidy Up / Auto-Layout',
      description: 'Arrange nodes automatically',
      icon: <Layout className="w-4 h-4" />,
      category: 'view',
      action: onTidyUp,
      keywords: ['tidy', 'arrange', 'layout', 'organize', 'auto'],
    },
    {
      id: 'toggle-grid',
      label: 'Toggle Grid',
      description: 'Show/hide background grid',
      icon: <Grid3X3 className="w-4 h-4" />,
      category: 'view',
      action: onToggleGrid,
      keywords: ['grid', 'background', 'dots'],
    },
    {
      id: 'toggle-minimap',
      label: 'Toggle Minimap',
      description: 'Show/hide minimap',
      icon: <Eye className="w-4 h-4" />,
      category: 'view',
      action: onToggleMiniMap,
      keywords: ['minimap', 'overview', 'navigator'],
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      description: 'Show/hide node panel',
      icon: <AlignLeft className="w-4 h-4" />,
      shortcut: 'Tab',
      category: 'view',
      action: onToggleSidebar,
      keywords: ['sidebar', 'panel', 'nodes'],
    },
    {
      id: 'dark-mode',
      label: 'Toggle Dark Mode',
      description: 'Switch theme',
      icon: darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      category: 'view',
      action: onToggleDarkMode,
      keywords: ['dark', 'light', 'theme', 'mode'],
    },

    // Help
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all shortcuts',
      icon: <Keyboard className="w-4 h-4" />,
      shortcut: '?',
      category: 'help',
      action: onOpenShortcuts,
      keywords: ['keyboard', 'shortcuts', 'keys', 'help'],
    },
  ], [darkMode, onSave, onExecute, onExport, onImport, onOpenN8nImport, onOpenTemplates,
      onOpenAIBuilder, onAddStickyNote, onDeleteSelected, onDuplicateSelected, onUndo,
      onRedo, onSelectAll, onDeselectAll, onFitView, onZoomIn, onZoomOut, onTidyUp,
      onToggleGrid, onToggleMiniMap, onToggleSidebar, onToggleDarkMode, onOpenShortcuts]);

  // Node types for the node search mode
  const nodeTypesList = useMemo(() => {
    return Object.values(nodeTypes).map(node => ({
      id: node.type,
      label: node.label,
      description: node.description,
      icon: <Zap className="w-4 h-4" style={{ color: node.color }} />,
      category: node.category as string,
      action: () => {
        onAddNode(node.type);
        onClose();
      },
      keywords: [node.type, node.label, node.category, ...(node.description?.split(' ') || [])],
    })) as Array<CommandItem & { category: string }>;
  }, [onAddNode, onClose]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const items: Array<CommandItem | (CommandItem & { category: string })> = mode === 'nodes' ? nodeTypesList : commands;

    if (!searchQuery.trim()) {
      return items.slice(0, 15); // Show first 15 items when no search
    }

    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      const labelMatch = item.label.toLowerCase().includes(query);
      const descMatch = item.description?.toLowerCase().includes(query);
      const keywordsMatch = item.keywords?.some(k => k.toLowerCase().includes(query));
      return labelMatch || descMatch || keywordsMatch;
    }).slice(0, 15);
  }, [searchQuery, mode, commands, nodeTypesList]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach(item => {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            if (mode === 'commands') onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (mode === 'nodes') {
            setMode('commands');
            setSearchQuery('');
          } else {
            onClose();
          }
          break;
        case 'Backspace':
          if (searchQuery === '' && mode === 'nodes') {
            setMode('commands');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, mode, searchQuery, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setMode('commands');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    workflow: 'Workflow',
    node: 'Nodes',
    edit: 'Edit',
    view: 'View',
    navigation: 'Navigation',
    help: 'Help',
    trigger: 'Triggers',
    action: 'Actions',
    logic: 'Logic',
    transform: 'Transform',
    integration: 'Integrations',
  };

  let itemIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Bar */}
      <div className="relative w-full max-w-2xl mx-4 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Command className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={mode === 'nodes' ? 'Search nodes...' : 'Type a command or search...'}
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-lg"
          />
          {mode === 'nodes' && (
            <button
              onClick={() => setMode('commands')}
              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
            >
              ← Back
            </button>
          )}
          <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded border border-slate-600">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">
              No results found for "{searchQuery}"
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {categoryLabels[category] || category}
                </div>
                {items.map((item) => {
                  const currentIndex = itemIndex++;
                  return (
                    <button
                      key={item.id}
                      data-index={currentIndex}
                      onClick={() => {
                        item.action();
                        if (mode === 'commands' && item.id !== 'add-node') onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        currentIndex === selectedIndex
                          ? 'bg-blue-600/20 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`flex-shrink-0 ${currentIndex === selectedIndex ? 'text-blue-400' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.label}</div>
                        {item.description && (
                          <div className="text-xs text-slate-500 truncate">{item.description}</div>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="flex-shrink-0 px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded border border-slate-600">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">ESC</kbd> Close
            </span>
          </div>
          <span>{filteredItems.length} results</span>
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
