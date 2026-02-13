/**
 * Floating Action Menu
 * Quick access toolbar for canvas operations (2025 UX pattern)
 */

import React, { useState, useCallback } from 'react';
import {
  Plus, Play, Pause, Save, Undo, Redo, ZoomIn, ZoomOut,
  Maximize2, Grid3X3, Map, AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Trash2, Copy, Clipboard, Lock, Unlock, Eye, EyeOff,
  MoreHorizontal, ChevronUp, Settings, Sparkles, Download,
  Upload, Share2, GitBranch, History, Layers
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ActionButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}

interface ActionGroup {
  id: string;
  label: string;
  actions: ActionButton[];
}

interface FloatingActionMenuProps {
  position?: 'bottom' | 'left' | 'right';
  onAction?: (actionId: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isExecuting?: boolean;
  isGridVisible?: boolean;
  isMinimapVisible?: boolean;
  zoomLevel?: number;
  className?: string;
}

// ============================================================================
// Action Button Component
// ============================================================================

const ActionBtn: React.FC<ActionButton & { showLabel?: boolean }> = ({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  active,
  danger,
  showLabel = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      relative group
      p-2.5 rounded-xl
      transition-all duration-200
      ${disabled
        ? 'opacity-40 cursor-not-allowed'
        : active
        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
        : danger
        ? 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
      }
    `}
    title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
  >
    {icon}

    {/* Tooltip */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
      {label}
      {shortcut && <span className="ml-1.5 text-gray-400">{shortcut}</span>}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
    </div>

    {showLabel && (
      <span className="ml-2 text-sm font-medium">{label}</span>
    )}
  </button>
);

// ============================================================================
// Divider
// ============================================================================

const Divider: React.FC = () => (
  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
);

// ============================================================================
// Main Component
// ============================================================================

export const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
  position = 'bottom',
  onAction,
  canUndo = true,
  canRedo = false,
  isExecuting = false,
  isGridVisible = true,
  isMinimapVisible = true,
  zoomLevel = 100,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);

  const handleAction = useCallback((actionId: string) => {
    onAction?.(actionId);
  }, [onAction]);

  // Position classes
  const positionClasses = {
    bottom: 'bottom-6 left-1/2 -translate-x-1/2 flex-row',
    left: 'left-6 top-1/2 -translate-y-1/2 flex-col',
    right: 'right-6 top-1/2 -translate-y-1/2 flex-col',
  };

  return (
    <div
      className={`
        fixed z-40
        ${positionClasses[position]}
        ${className}
      `}
    >
      {/* Main toolbar */}
      <div className="flex items-center gap-1 p-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        {/* Add node */}
        <ActionBtn
          id="add-node"
          icon={<Plus className="w-5 h-5" />}
          label="Add Node"
          shortcut="N"
          onClick={() => handleAction('add-node')}
        />

        <Divider />

        {/* Execution controls */}
        {isExecuting ? (
          <ActionBtn
            id="stop"
            icon={<Pause className="w-5 h-5" />}
            label="Stop Execution"
            shortcut="Ctrl+."
            onClick={() => handleAction('stop')}
            danger
          />
        ) : (
          <ActionBtn
            id="execute"
            icon={<Play className="w-5 h-5" />}
            label="Execute Workflow"
            shortcut="Ctrl+Enter"
            onClick={() => handleAction('execute')}
          />
        )}

        <ActionBtn
          id="save"
          icon={<Save className="w-5 h-5" />}
          label="Save"
          shortcut="Ctrl+S"
          onClick={() => handleAction('save')}
        />

        <Divider />

        {/* History */}
        <ActionBtn
          id="undo"
          icon={<Undo className="w-5 h-5" />}
          label="Undo"
          shortcut="Ctrl+Z"
          onClick={() => handleAction('undo')}
          disabled={!canUndo}
        />
        <ActionBtn
          id="redo"
          icon={<Redo className="w-5 h-5" />}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          onClick={() => handleAction('redo')}
          disabled={!canRedo}
        />

        <Divider />

        {/* Zoom controls */}
        <ActionBtn
          id="zoom-out"
          icon={<ZoomOut className="w-5 h-5" />}
          label="Zoom Out"
          shortcut="Ctrl+-"
          onClick={() => handleAction('zoom-out')}
        />

        <div className="px-2 min-w-[50px] text-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {zoomLevel}%
          </span>
        </div>

        <ActionBtn
          id="zoom-in"
          icon={<ZoomIn className="w-5 h-5" />}
          label="Zoom In"
          shortcut="Ctrl++"
          onClick={() => handleAction('zoom-in')}
        />

        <ActionBtn
          id="fit"
          icon={<Maximize2 className="w-5 h-5" />}
          label="Fit to Screen"
          shortcut="Ctrl+1"
          onClick={() => handleAction('fit')}
        />

        <Divider />

        {/* View toggles */}
        <ActionBtn
          id="toggle-grid"
          icon={<Grid3X3 className="w-5 h-5" />}
          label="Toggle Grid"
          shortcut="G"
          onClick={() => handleAction('toggle-grid')}
          active={isGridVisible}
        />

        <ActionBtn
          id="toggle-minimap"
          icon={<Map className="w-5 h-5" />}
          label="Toggle Minimap"
          shortcut="M"
          onClick={() => handleAction('toggle-minimap')}
          active={isMinimapVisible}
        />

        {/* More actions */}
        <div className="relative">
          <ActionBtn
            id="more"
            icon={<MoreHorizontal className="w-5 h-5" />}
            label="More Actions"
            onClick={() => setIsExpanded(!isExpanded)}
            active={isExpanded}
          />

          {/* Expanded menu */}
          {isExpanded && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[200px]">
              {/* Alignment section */}
              <div className="mb-2">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Align</p>
                <div className="flex gap-1">
                  <ActionBtn
                    id="align-left"
                    icon={<AlignLeft className="w-4 h-4" />}
                    label="Align Left"
                    onClick={() => handleAction('align-left')}
                  />
                  <ActionBtn
                    id="align-center-h"
                    icon={<AlignCenter className="w-4 h-4" />}
                    label="Align Center"
                    onClick={() => handleAction('align-center-h')}
                  />
                  <ActionBtn
                    id="align-right"
                    icon={<AlignRight className="w-4 h-4" />}
                    label="Align Right"
                    onClick={() => handleAction('align-right')}
                  />
                  <ActionBtn
                    id="align-top"
                    icon={<AlignStartVertical className="w-4 h-4" />}
                    label="Align Top"
                    onClick={() => handleAction('align-top')}
                  />
                  <ActionBtn
                    id="align-center-v"
                    icon={<AlignCenterVertical className="w-4 h-4" />}
                    label="Align Middle"
                    onClick={() => handleAction('align-center-v')}
                  />
                  <ActionBtn
                    id="align-bottom"
                    icon={<AlignEndVertical className="w-4 h-4" />}
                    label="Align Bottom"
                    onClick={() => handleAction('align-bottom')}
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 my-2" />

              {/* Other actions */}
              <div className="space-y-0.5">
                <button
                  onClick={() => handleAction('ai-copilot')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI Copilot
                </button>
                <button
                  onClick={() => handleAction('version-history')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <History className="w-4 h-4" />
                  Version History
                </button>
                <button
                  onClick={() => handleAction('export')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Workflow
                </button>
                <button
                  onClick={() => handleAction('import')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import Workflow
                </button>
                <button
                  onClick={() => handleAction('share')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 my-2" />

              {/* Settings */}
              <button
                onClick={() => handleAction('settings')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Workflow Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Mini Floating Action Button (for mobile/minimal UI)
// ============================================================================

export const FloatingActionButton: React.FC<{
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}> = ({
  onClick,
  icon = <Plus className="w-6 h-6" />,
  label = 'Add',
  position = 'bottom-right',
  className = '',
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <button
      onClick={onClick}
      className={`
        fixed z-40
        ${positionClasses[position]}
        w-14 h-14 rounded-full
        bg-primary-600 hover:bg-primary-700
        text-white shadow-lg shadow-primary-500/30
        hover:shadow-xl hover:shadow-primary-500/40
        hover:scale-110
        transition-all duration-200
        flex items-center justify-center
        group
        ${className}
      `}
      aria-label={label}
    >
      {icon}

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {label}
        <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
      </div>
    </button>
  );
};

export default FloatingActionMenu;
