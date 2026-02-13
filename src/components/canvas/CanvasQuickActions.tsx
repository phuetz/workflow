/**
 * Canvas Quick Actions
 * Floating context menu for quick actions on canvas (like n8n)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus,
  Play,
  Pause,
  Copy,
  Trash2,
  FolderPlus,
  StickyNote,
  GitBranch,
  Zap,
  Search,
  Settings,
  LayoutGrid,
  MousePointer,
  Hand,
  Magnet,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Maximize,
  Save,
  Download,
  Upload,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface CanvasQuickActionsProps {
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  selectedNodeIds?: string[];
  onAddNode?: (position: { x: number; y: number }) => void;
  onAddStickyNote?: (position: { x: number; y: number }) => void;
  onGroupNodes?: () => void;
  onDuplicateNodes?: () => void;
  onDeleteNodes?: () => void;
  onExecuteSelected?: () => void;
}

interface ActionGroup {
  label: string;
  icon: React.ReactNode;
  actions: ActionItem[];
}

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const CanvasQuickActions: React.FC<CanvasQuickActionsProps> = ({
  position,
  isOpen,
  onClose,
  selectedNodeIds = [],
  onAddNode,
  onAddStickyNote,
  onGroupNodes,
  onDuplicateNodes,
  onDeleteNodes,
  onExecuteSelected,
}) => {
  const {
    isExecuting,
    undo,
    redo,
    undoHistory,
    redoHistory,
    setIsExecuting,
  } = useWorkflowStore();

  // Derive canUndo and canRedo from history
  const canUndo = undoHistory.length > 0;
  const canRedo = redoHistory.length > 0;

  // Define executeWorkflow and stopExecution functions
  const executeWorkflow = () => {
    setIsExecuting(true);
    // Actual execution logic would be handled elsewhere
  };

  const stopExecution = () => {
    setIsExecuting(false);
  };

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedNodeIds.length > 0;
  const multipleSelected = selectedNodeIds.length > 1;

  // Define action groups
  const actionGroups: ActionGroup[] = [
    {
      label: 'Add',
      icon: <Plus size={14} />,
      actions: [
        {
          id: 'add-node',
          label: 'Add Node',
          icon: <Plus size={16} />,
          shortcut: 'Tab',
          onClick: () => {
            onAddNode?.(position);
            onClose();
          },
        },
        {
          id: 'add-sticky',
          label: 'Add Sticky Note',
          icon: <StickyNote size={16} />,
          shortcut: 'S',
          onClick: () => {
            onAddStickyNote?.(position);
            onClose();
          },
        },
        {
          id: 'add-branch',
          label: 'Add Branch',
          icon: <GitBranch size={16} />,
          onClick: () => onClose(),
        },
      ],
    },
    {
      label: 'Selection',
      icon: <MousePointer size={14} />,
      actions: [
        {
          id: 'duplicate',
          label: 'Duplicate',
          icon: <Copy size={16} />,
          shortcut: 'Ctrl+D',
          onClick: () => {
            onDuplicateNodes?.();
            onClose();
          },
          disabled: !hasSelection,
        },
        {
          id: 'group',
          label: 'Group Nodes',
          icon: <FolderPlus size={16} />,
          shortcut: 'Ctrl+G',
          onClick: () => {
            onGroupNodes?.();
            onClose();
          },
          disabled: !multipleSelected,
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: <Trash2 size={16} />,
          shortcut: 'Del',
          onClick: () => {
            onDeleteNodes?.();
            onClose();
          },
          disabled: !hasSelection,
          danger: true,
        },
      ],
    },
    {
      label: 'Execute',
      icon: <Zap size={14} />,
      actions: [
        {
          id: 'execute-all',
          label: isExecuting ? 'Stop Execution' : 'Execute Workflow',
          icon: isExecuting ? <Pause size={16} /> : <Play size={16} />,
          shortcut: 'F5',
          onClick: () => {
            if (isExecuting) {
              stopExecution();
            } else {
              executeWorkflow();
            }
            onClose();
          },
        },
        {
          id: 'execute-selected',
          label: 'Execute Selected',
          icon: <Zap size={16} />,
          onClick: () => {
            onExecuteSelected?.();
            onClose();
          },
          disabled: !hasSelection,
        },
      ],
    },
    {
      label: 'Canvas',
      icon: <LayoutGrid size={14} />,
      actions: [
        {
          id: 'zoom-in',
          label: 'Zoom In',
          icon: <ZoomIn size={16} />,
          shortcut: 'Ctrl++',
          onClick: () => onClose(),
        },
        {
          id: 'zoom-out',
          label: 'Zoom Out',
          icon: <ZoomOut size={16} />,
          shortcut: 'Ctrl+-',
          onClick: () => onClose(),
        },
        {
          id: 'fit-view',
          label: 'Fit to View',
          icon: <Maximize size={16} />,
          shortcut: 'Ctrl+0',
          onClick: () => onClose(),
        },
        {
          id: 'toggle-grid',
          label: 'Toggle Grid',
          icon: <Grid3X3 size={16} />,
          shortcut: 'G',
          onClick: () => onClose(),
        },
        {
          id: 'toggle-snap',
          label: 'Toggle Snap',
          icon: <Magnet size={16} />,
          onClick: () => onClose(),
        },
      ],
    },
    {
      label: 'History',
      icon: <Undo size={14} />,
      actions: [
        {
          id: 'undo',
          label: 'Undo',
          icon: <Undo size={16} />,
          shortcut: 'Ctrl+Z',
          onClick: () => {
            undo?.();
            onClose();
          },
          disabled: !canUndo,
        },
        {
          id: 'redo',
          label: 'Redo',
          icon: <Redo size={16} />,
          shortcut: 'Ctrl+Y',
          onClick: () => {
            redo?.();
            onClose();
          },
          disabled: !canRedo,
        },
      ],
    },
    {
      label: 'Workflow',
      icon: <Settings size={14} />,
      actions: [
        {
          id: 'save',
          label: 'Save Workflow',
          icon: <Save size={16} />,
          shortcut: 'Ctrl+S',
          onClick: () => onClose(),
        },
        {
          id: 'export',
          label: 'Export Workflow',
          icon: <Download size={16} />,
          onClick: () => onClose(),
        },
        {
          id: 'import',
          label: 'Import Workflow',
          icon: <Upload size={16} />,
          onClick: () => onClose(),
        },
      ],
    },
  ];

  // Filter actions based on search
  const filteredGroups = searchTerm
    ? actionGroups
        .map(group => ({
          ...group,
          actions: group.actions.filter(
            a =>
              a.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
              a.shortcut?.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter(g => g.actions.length > 0)
    : actionGroups;

  // Get all actions for quick display
  const allQuickActions = actionGroups.slice(0, 3).flatMap(g => g.actions.slice(0, 2));

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95"
      style={{
        left: position.x,
        top: position.y,
        minWidth: 280,
      }}
    >
      {/* Search bar */}
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search actions..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      </div>

      {/* Quick actions bar */}
      {!searchTerm && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
          {allQuickActions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`p-2 rounded-lg transition-colors ${
                action.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : action.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* Action groups */}
      <div className="max-h-80 overflow-y-auto">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <button
              onClick={() => setActiveGroup(activeGroup === group.label ? null : group.label)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50"
            >
              {group.icon}
              {group.label}
              <span className="ml-auto text-gray-400">
                {group.actions.filter(a => !a.disabled).length}
              </span>
            </button>

            {(searchTerm || activeGroup === group.label || activeGroup === null) && (
              <div className="pb-1">
                {group.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                      action.disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : action.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={action.disabled ? 'opacity-50' : ''}>{action.icon}</span>
                    <span className="flex-1 text-left">{action.label}</span>
                    {action.shortcut && (
                      <kbd className={`text-xs px-1.5 py-0.5 rounded ${
                        action.disabled
                          ? 'bg-gray-100 text-gray-300'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {action.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        {hasSelection ? (
          <span>{selectedNodeIds.length} node{selectedNodeIds.length > 1 ? 's' : ''} selected</span>
        ) : (
          <span>Right-click for more options</span>
        )}
      </div>
    </div>
  );
};

export default CanvasQuickActions;
