/**
 * Bulk Operations Panel
 * Perform bulk operations on multiple selected nodes (like n8n)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Layers,
  X,
  Trash2,
  Copy,
  FolderPlus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  ArrowDownToLine,
  ArrowRightToLine,
  Grid3X3,
  CheckCircle,
  XCircle,
  Play,
  Settings,
  Tag,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface BulkOperationsPanelProps {
  selectedNodeIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onGroup?: () => void;
  onAlign?: (alignment: AlignmentType) => void;
  onDistribute?: (direction: 'horizontal' | 'vertical') => void;
  onToggleEnabled?: (enabled: boolean) => void;
  onSetColor?: (color: string) => void;
  onAddTag?: (tag: string) => void;
}

type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  requiresMultiple?: boolean;
}

const QUICK_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  selectedNodeIds,
  isOpen,
  onClose,
  onDelete,
  onDuplicate,
  onGroup,
  onAlign,
  onDistribute,
  onToggleEnabled,
  onSetColor,
  onAddTag,
}) => {
  const { nodes } = useWorkflowStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const selectedCount = selectedNodeIds.length;
  const hasMultiple = selectedCount > 1;

  // Get selected nodes info
  const selectedNodesInfo = useMemo(() => {
    const selected = nodes.filter(n => selectedNodeIds.includes(n.id));
    const types = new Set(selected.map(n => n.data?.type));
    const allEnabled = selected.every(n => n.data?.enabled !== false);
    const allDisabled = selected.every(n => n.data?.enabled === false);

    return {
      nodes: selected,
      typeCount: types.size,
      types: Array.from(types),
      allEnabled,
      allDisabled,
    };
  }, [nodes, selectedNodeIds]);

  // Handle alignment
  const handleAlign = useCallback((alignment: AlignmentType) => {
    onAlign?.(alignment);
  }, [onAlign]);

  // Handle distribute
  const handleDistribute = useCallback((direction: 'horizontal' | 'vertical') => {
    onDistribute?.(direction);
  }, [onDistribute]);

  // Handle add tag
  const handleAddTag = useCallback(() => {
    if (newTag.trim()) {
      onAddTag?.(newTag.trim());
      setNewTag('');
      setShowTagInput(false);
    }
  }, [newTag, onAddTag]);

  // Define bulk actions
  const actions: BulkAction[] = [
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy size={16} />,
      onClick: () => onDuplicate?.(),
    },
    {
      id: 'group',
      label: 'Group',
      icon: <FolderPlus size={16} />,
      onClick: () => onGroup?.(),
      requiresMultiple: true,
    },
    {
      id: 'enable',
      label: selectedNodesInfo.allEnabled ? 'Disable' : 'Enable',
      icon: selectedNodesInfo.allEnabled ? <EyeOff size={16} /> : <Eye size={16} />,
      onClick: () => onToggleEnabled?.(!selectedNodesInfo.allEnabled),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: () => onDelete?.(),
      danger: true,
    },
  ];

  if (!isOpen || selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center">
        {/* Selection info */}
        <div className="px-4 py-3 border-r border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {selectedCount} node{selectedCount !== 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-gray-500">
                {selectedNodesInfo.typeCount} type{selectedNodesInfo.typeCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 px-2 py-2">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled || (action.requiresMultiple && !hasMultiple)}
              className={`p-2 rounded-lg transition-colors ${
                action.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${(action.disabled || (action.requiresMultiple && !hasMultiple)) ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Set color"
            >
              <Palette size={16} />
            </button>
            {showColorPicker && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200">
                <div className="grid grid-cols-4 gap-1">
                  {QUICK_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        onSetColor?.(color);
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 rounded transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tag input */}
          <div className="relative">
            <button
              onClick={() => setShowTagInput(!showTagInput)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add tag"
            >
              <Tag size={16} />
            </button>
            {showTagInput && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200 w-48">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Tag name..."
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Alignment buttons (only for multiple) */}
          {hasMultiple && (
            <>
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => handleAlign('left')}
                  className="p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  title="Align left"
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  onClick={() => handleAlign('center')}
                  className="p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  title="Align center"
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  onClick={() => handleAlign('right')}
                  className="p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  title="Align right"
                >
                  <AlignRight size={14} />
                </button>
              </div>

              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => handleAlign('top')}
                  className="p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  title="Align top"
                >
                  <AlignStartVertical size={14} />
                </button>
                <button
                  onClick={() => handleAlign('middle')}
                  className="p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  title="Align middle"
                >
                  <AlignCenterVertical size={14} />
                </button>
                <button
                  onClick={() => handleAlign('bottom')}
                  className="p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  title="Align bottom"
                >
                  <AlignEndVertical size={14} />
                </button>
              </div>

              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => handleDistribute('horizontal')}
                  className="p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  title="Distribute horizontally"
                >
                  <ArrowRightToLine size={14} />
                </button>
                <button
                  onClick={() => handleDistribute('vertical')}
                  className="p-1.5 text-gray-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  title="Distribute vertically"
                >
                  <ArrowDownToLine size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="px-3 py-3 border-l border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default BulkOperationsPanel;
