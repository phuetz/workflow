/**
 * N8N-Style Node Panel
 * Inspired by n8n's nodes panel with categories and Tab key access
 * Reference: https://docs.n8n.io/courses/level-one/chapter-1/
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Plus, Zap, Database, GitBranch, Code2,
  Mail, MessageSquare, Calendar, FileText, Globe,
  Settings, ArrowRight, Star, Clock, Sparkles,
  Users, Filter, Merge, Split, RefreshCw, Play,
  Webhook, Timer, Bot, Brain, ChevronRight, Hash,
  Layers, Terminal, Table, Send, Download, Upload
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface NodeCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface NodeTypeItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  color: string;
  description: string;
  tags?: string[];
  isNew?: boolean;
  isPro?: boolean;
}

interface N8NStyleNodePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeType: string) => void;
  position?: { x: number; y: number } | null;
  isTriggerMode?: boolean;
}

// ============================================================================
// Categories (n8n style)
// ============================================================================

const categories: NodeCategory[] = [
  { id: 'triggers', label: 'Triggers', icon: <Zap className="w-4 h-4" />, color: '#f97316', description: 'Start your workflow' },
  { id: 'ai', label: 'Advanced AI', icon: <Brain className="w-4 h-4" />, color: '#8b5cf6', description: 'AI & ML operations' },
  { id: 'actions', label: 'Actions', icon: <Play className="w-4 h-4" />, color: '#3b82f6', description: 'Perform actions in apps' },
  { id: 'transform', label: 'Data Transform', icon: <RefreshCw className="w-4 h-4" />, color: '#10b981', description: 'Transform & manipulate data' },
  { id: 'flow', label: 'Flow', icon: <GitBranch className="w-4 h-4" />, color: '#ec4899', description: 'Control workflow logic' },
  { id: 'core', label: 'Core', icon: <Terminal className="w-4 h-4" />, color: '#6b7280', description: 'Essential building blocks' },
  { id: 'human', label: 'Human in Loop', icon: <Users className="w-4 h-4" />, color: '#f59e0b', description: 'Manual approvals & input' },
];

// ============================================================================
// Sample Node Types
// ============================================================================

const nodeTypes: NodeTypeItem[] = [
  // Triggers
  { type: 'webhook', label: 'Webhook', icon: <Webhook className="w-5 h-5" />, category: 'triggers', color: '#f97316', description: 'Start workflow on HTTP request', tags: ['http', 'api'] },
  { type: 'schedule', label: 'Schedule', icon: <Timer className="w-5 h-5" />, category: 'triggers', color: '#f97316', description: 'Run on a schedule', tags: ['cron', 'timer'] },
  { type: 'email-trigger', label: 'Email Trigger', icon: <Mail className="w-5 h-5" />, category: 'triggers', color: '#f97316', description: 'Trigger on new email' },
  { type: 'manual', label: 'Manual Trigger', icon: <Play className="w-5 h-5" />, category: 'triggers', color: '#f97316', description: 'Start manually' },

  // AI
  { type: 'openai', label: 'OpenAI', icon: <Sparkles className="w-5 h-5" />, category: 'ai', color: '#8b5cf6', description: 'GPT models & embeddings', tags: ['gpt', 'chat'], isNew: true },
  { type: 'anthropic', label: 'Anthropic Claude', icon: <Bot className="w-5 h-5" />, category: 'ai', color: '#8b5cf6', description: 'Claude AI models', tags: ['claude'], isNew: true },
  { type: 'ai-agent', label: 'AI Agent', icon: <Brain className="w-5 h-5" />, category: 'ai', color: '#8b5cf6', description: 'Autonomous AI agent', tags: ['agent', 'autonomous'], isNew: true },
  { type: 'vector-store', label: 'Vector Store', icon: <Database className="w-5 h-5" />, category: 'ai', color: '#8b5cf6', description: 'Store & query embeddings', tags: ['embeddings', 'rag'] },

  // Actions
  { type: 'http-request', label: 'HTTP Request', icon: <Globe className="w-5 h-5" />, category: 'actions', color: '#3b82f6', description: 'Make HTTP requests', tags: ['api', 'rest'] },
  { type: 'slack', label: 'Slack', icon: <MessageSquare className="w-5 h-5" />, category: 'actions', color: '#3b82f6', description: 'Send Slack messages', tags: ['chat', 'notification'] },
  { type: 'gmail', label: 'Gmail', icon: <Mail className="w-5 h-5" />, category: 'actions', color: '#3b82f6', description: 'Send & read emails', tags: ['email', 'google'] },
  { type: 'google-sheets', label: 'Google Sheets', icon: <Table className="w-5 h-5" />, category: 'actions', color: '#3b82f6', description: 'Read & write spreadsheets', tags: ['spreadsheet', 'data'] },
  { type: 'notion', label: 'Notion', icon: <FileText className="w-5 h-5" />, category: 'actions', color: '#3b82f6', description: 'Manage Notion pages', tags: ['docs', 'database'] },

  // Data Transform
  { type: 'set', label: 'Set', icon: <Hash className="w-5 h-5" />, category: 'transform', color: '#10b981', description: 'Set field values' },
  { type: 'filter', label: 'Filter', icon: <Filter className="w-5 h-5" />, category: 'transform', color: '#10b981', description: 'Filter items by condition' },
  { type: 'sort', label: 'Sort', icon: <ArrowRight className="w-5 h-5" />, category: 'transform', color: '#10b981', description: 'Sort items' },
  { type: 'aggregate', label: 'Aggregate', icon: <Layers className="w-5 h-5" />, category: 'transform', color: '#10b981', description: 'Aggregate items into one' },
  { type: 'split-out', label: 'Split Out', icon: <Split className="w-5 h-5" />, category: 'transform', color: '#10b981', description: 'Split array into items' },

  // Flow
  { type: 'if', label: 'IF', icon: <GitBranch className="w-5 h-5" />, category: 'flow', color: '#ec4899', description: 'Conditional branching' },
  { type: 'switch', label: 'Switch', icon: <GitBranch className="w-5 h-5" />, category: 'flow', color: '#ec4899', description: 'Multiple condition routing' },
  { type: 'merge', label: 'Merge', icon: <Merge className="w-5 h-5" />, category: 'flow', color: '#ec4899', description: 'Merge multiple inputs' },
  { type: 'loop', label: 'Loop Over Items', icon: <RefreshCw className="w-5 h-5" />, category: 'flow', color: '#ec4899', description: 'Loop through items' },
  { type: 'wait', label: 'Wait', icon: <Clock className="w-5 h-5" />, category: 'flow', color: '#ec4899', description: 'Pause execution' },

  // Core
  { type: 'code', label: 'Code', icon: <Code2 className="w-5 h-5" />, category: 'core', color: '#6b7280', description: 'Write JavaScript/Python' },
  { type: 'function', label: 'Function', icon: <Terminal className="w-5 h-5" />, category: 'core', color: '#6b7280', description: 'Run custom function' },
  { type: 'execute-workflow', label: 'Execute Workflow', icon: <Play className="w-5 h-5" />, category: 'core', color: '#6b7280', description: 'Run another workflow' },
  { type: 'no-op', label: 'No Operation', icon: <ArrowRight className="w-5 h-5" />, category: 'core', color: '#6b7280', description: 'Pass through data' },

  // Human in Loop
  { type: 'approval', label: 'Wait for Approval', icon: <Users className="w-5 h-5" />, category: 'human', color: '#f59e0b', description: 'Wait for human approval' },
  { type: 'form', label: 'Form', icon: <FileText className="w-5 h-5" />, category: 'human', color: '#f59e0b', description: 'Collect form input' },
  { type: 'send-email', label: 'Send & Wait', icon: <Send className="w-5 h-5" />, category: 'human', color: '#f59e0b', description: 'Send email and wait for reply' },
];

// ============================================================================
// Node Item Component
// ============================================================================

const NodeItem: React.FC<{
  node: NodeTypeItem;
  isSelected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}> = ({ node, isSelected, onSelect, onAdd }) => {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onAdd}
      className={`
        group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer
        transition-all duration-150 ease-out
        ${isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
      `}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110"
        style={{ backgroundColor: node.color }}
      >
        {node.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {node.label}
          </span>
          {node.isNew && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
              NEW
            </span>
          )}
          {node.isPro && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
              PRO
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {node.description}
        </p>
      </div>

      {/* Add button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className={`
          p-2 rounded-lg transition-all duration-150
          ${isSelected
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100'
          }
          hover:bg-primary-600 hover:text-white
        `}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const N8NStyleNodePanel: React.FC<N8NStyleNodePanelProps> = ({
  isOpen,
  onClose,
  onSelectNode,
  position,
  isTriggerMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(isTriggerMode ? 'triggers' : null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentNodes, setRecentNodes] = useState<string[]>(['http-request', 'code', 'if', 'slack']);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    let nodes = nodeTypes;

    // Category filter
    if (selectedCategory) {
      nodes = nodes.filter(n => n.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      nodes = nodes.filter(n =>
        n.label.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query) ||
        n.description.toLowerCase().includes(query) ||
        n.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    return nodes;
  }, [searchQuery, selectedCategory]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
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
          onClose();
          break;
        case 'Tab':
          if (!e.shiftKey) {
            e.preventDefault();
            // Cycle through categories
            const catIds = categories.map(c => c.id);
            const currentIdx = selectedCategory ? catIds.indexOf(selectedCategory) : -1;
            const nextIdx = (currentIdx + 1) % (catIds.length + 1);
            setSelectedCategory(nextIdx < catIds.length ? catIds[nextIdx] : null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNodes, selectedIndex, selectedCategory, onClose]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedCategory]);

  const handleAddNode = useCallback((nodeType: string) => {
    // Add to recent
    setRecentNodes(prev => {
      const filtered = prev.filter(n => n !== nodeType);
      return [nodeType, ...filtered].slice(0, 5);
    });
    onSelectNode(nodeType);
    onClose();
  }, [onSelectNode, onClose]);

  if (!isOpen) return null;

  const panelContent = (
    <div
      ref={panelRef}
      className="w-[420px] max-h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-scale-in"
      style={position ? {
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 10001,
      } : {}}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {isTriggerMode ? 'Select a Trigger' : 'Add Node'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
              transition-colors duration-150
              ${selectedCategory === null
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                transition-colors duration-150
                ${selectedCategory === cat.id
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Recent nodes */}
        {!searchQuery && !selectedCategory && recentNodes.length > 0 && (
          <div className="mb-4">
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recently Used
            </p>
            <div className="flex flex-wrap gap-2 px-2">
              {recentNodes.map(nodeType => {
                const node = nodeTypes.find(n => n.type === nodeType);
                if (!node) return null;
                return (
                  <button
                    key={nodeType}
                    onClick={() => handleAddNode(nodeType)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white"
                      style={{ backgroundColor: node.color }}
                    >
                      {React.cloneElement(node.icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {node.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Node list */}
        {filteredNodes.length > 0 ? (
          <div className="space-y-1">
            {!searchQuery && selectedCategory && (
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                {categories.find(c => c.id === selectedCategory)?.label}
              </p>
            )}
            {filteredNodes.map((node, index) => (
              <NodeItem
                key={node.type}
                node={node}
                isSelected={index === selectedIndex}
                onSelect={() => setSelectedIndex(index)}
                onAdd={() => handleAddNode(node.type)}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No nodes found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Try a different search term
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono">↵</kbd>
              Add
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] font-mono">Tab</kbd>
              Categories
            </span>
          </div>
          <span>{filteredNodes.length} nodes</span>
        </div>
      </div>
    </div>
  );

  // If position is provided, render in place, otherwise use portal
  if (position) {
    return panelContent;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative">
        {panelContent}
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Hook for Tab key
// ============================================================================

export function useNodePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTriggerMode, setIsTriggerMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Tab key to open panel
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setIsTriggerMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    isTriggerMode,
    open: (triggerMode = false) => {
      setIsTriggerMode(triggerMode);
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}

export default N8NStyleNodePanel;
