/**
 * FolderExplorer - Beautiful folder UI with drag & drop
 * Supports unlimited nesting, keyboard navigation, and context menus
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  Move,
  Copy,
  MoreVertical,
  Search,
  Home,
  Star,
  Clock,
  Users,
  Archive,
} from 'lucide-react';
import { folderService } from '../../organization/FolderService';
import { folderTree } from '../../organization/FolderTree';
import type { Folder, FolderTreeNode } from '../../types/organization';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../../hooks/useToast';

interface FolderExplorerProps {
  onFolderSelect?: (folderId: string | null) => void;
  onWorkflowMove?: (workflowIds: string[], folderId: string | null) => void;
  selectedFolderId?: string | null;
  className?: string;
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  onFolderSelect,
  onWorkflowMove,
  selectedFolderId,
  className = '',
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    folder: Folder | null;
  } | null>(null);
  const [dragState, setDragState] = useState<{
    draggedId: string | null;
    dropTargetId: string | null;
  }>({ draggedId: null, dropTargetId: null });
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const { success, error: showError, warning } = useToast();

  // Rebuild tree on mount
  useEffect(() => {
    folderTree.rebuild();
  }, []);

  // Handle folder toggle
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  // Handle folder selection
  const handleFolderClick = useCallback(
    (folderId: string | null) => {
      onFolderSelect?.(folderId);
    },
    [onFolderSelect]
  );

  // Forward declaration for handleDeleteFolder (defined later)
  const handleDeleteFolderRef = useRef<((folderId: string) => void) | null>(null);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, folderId: string) => {
      const node = folderTree.getNode(folderId);
      if (!node) return;

      switch (e.key) {
        case 'ArrowRight':
          if (!expandedIds.has(folderId) && node.children.length > 0) {
            toggleFolder(folderId);
          } else if (node.children.length > 0) {
            handleFolderClick(node.children[0].folder.id);
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (expandedIds.has(folderId)) {
            toggleFolder(folderId);
          } else if (node.parent) {
            handleFolderClick(node.parent.folder.id);
          }
          e.preventDefault();
          break;
        case 'ArrowDown': {
          const visible = folderTree.flatten(expandedIds);
          const currentIndex = visible.findIndex(
            (v) => v.node.folder.id === folderId
          );
          if (currentIndex < visible.length - 1) {
            handleFolderClick(visible[currentIndex + 1].node.folder.id);
          }
          e.preventDefault();
          break;
        }
        case 'ArrowUp': {
          const visible = folderTree.flatten(expandedIds);
          const currentIndex = visible.findIndex(
            (v) => v.node.folder.id === folderId
          );
          if (currentIndex > 0) {
            handleFolderClick(visible[currentIndex - 1].node.folder.id);
          }
          e.preventDefault();
          break;
        }
        case 'Enter':
          toggleFolder(folderId);
          e.preventDefault();
          break;
        case 'Delete':
          if (e.ctrlKey || e.metaKey) {
            handleDeleteFolderRef.current?.(folderId);
          }
          e.preventDefault();
          break;
      }
    },
    [expandedIds, toggleFolder, handleFolderClick]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, folderId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('folderId', folderId);
    setDragState((prev) => ({ ...prev, draggedId: folderId }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState((prev) => ({ ...prev, dropTargetId: folderId }));
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({ ...prev, dropTargetId: null }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetFolderId: string | null) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('folderId');

      if (draggedId && draggedId !== targetFolderId) {
        try {
          // Check if it's a valid move (not to descendant)
          if (
            targetFolderId &&
            folderTree.isDescendant(targetFolderId, draggedId)
          ) {
            warning('Cannot move folder', 'A folder cannot be moved into its own descendant.');
            return;
          }

          folderService.moveFolder({
            folderId: draggedId,
            targetParentId: targetFolderId,
          });
          folderTree.rebuild();
          setDragState({ draggedId: null, dropTargetId: null });
        } catch (error) {
          logger.error('Failed to move folder:', error);
          showError('Failed to move folder', error instanceof Error ? error.message : 'Unknown error');
        }
      }
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, dropTargetId: null });
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, folder: Folder | null) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        folder,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Folder operations
  const handleCreateFolder = useCallback((parentId: string | null) => {
    setNewFolderParent(parentId);
    setShowNewFolderDialog(true);
  }, []);

  const handleCreateFolderSubmit = useCallback(
    (name: string, color: string) => {
      try {
        folderService.createFolder({
          name,
          parentId: newFolderParent,
          color,
        });
        folderTree.rebuild();
        setShowNewFolderDialog(false);
        if (newFolderParent) {
          setExpandedIds((prev) => new Set(prev).add(newFolderParent));
        }
        success('Folder created', `Created folder "${name}"`);
      } catch (error) {
        showError('Failed to create folder', error instanceof Error ? error.message : 'Unknown error');
      }
    },
    [newFolderParent, success, showError]
  );

  const handleRenameFolder = useCallback((folderId: string) => {
    setEditingFolderId(folderId);
    closeContextMenu();
  }, [closeContextMenu]);

  const handleRenameFolderSubmit = useCallback(
    (folderId: string, newName: string) => {
      try {
        folderService.updateFolder(folderId, { name: newName });
        folderTree.rebuild();
        setEditingFolderId(null);
        success('Folder renamed', `Renamed folder to "${newName}"`);
      } catch (error) {
        showError('Failed to rename folder', error instanceof Error ? error.message : 'Unknown error');
      }
    },
    [success, showError]
  );

  const handleDeleteFolder = useCallback((folderId: string) => {
    const folder = folderService.getFolder(folderId);
    if (!folder) return;

    const hasChildren = folderTree.getChildren(folderId).length > 0;
    const hasWorkflows = folder.workflowIds.length > 0;

    let message = `Delete folder "${folder.name}"?`;
    if (hasChildren) message += '\n\nThis will also delete all subfolders.';
    if (hasWorkflows)
      message += `\n\nThis folder contains ${folder.workflowIds.length} workflow(s).`;

    if (confirm(message)) {
      try {
        folderService.deleteFolder(folderId, {
          recursive: hasChildren,
          moveWorkflows: hasWorkflows,
        });
        folderTree.rebuild();
        if (selectedFolderId === folderId) {
          handleFolderClick(null);
        }
        success('Folder deleted', `Deleted folder "${folder.name}"`);
      } catch (error) {
        showError('Failed to delete folder', error instanceof Error ? error.message : 'Unknown error');
      }
    }
    closeContextMenu();
  }, [selectedFolderId, handleFolderClick, closeContextMenu, success, showError]);

  // Assign to ref for use in handleKeyDown
  useEffect(() => {
    handleDeleteFolderRef.current = handleDeleteFolder;
  }, [handleDeleteFolder]);

  // Filter folders by search query
  const filteredNodes = searchQuery
    ? folderTree.search(searchQuery)
    : folderTree.getRootNodes();

  // Render folder item
  const renderFolderItem = (
    node: FolderTreeNode,
    depth: number,
    isVisible: boolean = true
  ): React.ReactNode => {
    const { folder } = node;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isDragging = dragState.draggedId === folder.id;
    const isDropTarget = dragState.dropTargetId === folder.id;
    const isEditing = editingFolderId === folder.id;

    return (
      <div key={folder.id} style={{ display: isVisible ? 'block' : 'none' }}>
        <div
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
            hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
            ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''}
            ${isDragging ? 'opacity-50' : ''}
            ${isDropTarget ? 'bg-blue-100 dark:bg-blue-800/50' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFolderClick(folder.id)}
          onKeyDown={(e) => handleKeyDown(e, folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder)}
          onDragStart={(e) => handleDragStart(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
          onDragEnd={handleDragEnd}
          draggable
          tabIndex={0}
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isSelected}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Folder Icon */}
          {isExpanded ? (
            <FolderOpen
              className="w-4 h-4 flex-shrink-0"
              style={{ color: folder.color }}
            />
          ) : (
            <FolderIcon
              className="w-4 h-4 flex-shrink-0"
              style={{ color: folder.color }}
            />
          )}

          {/* Folder Name */}
          {isEditing ? (
            <input
              type="text"
              defaultValue={folder.name}
              autoFocus
              onBlur={(e) =>
                handleRenameFolderSubmit(folder.id, e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameFolderSubmit(
                    folder.id,
                    e.currentTarget.value
                  );
                } else if (e.key === 'Escape') {
                  setEditingFolderId(null);
                }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0.5 text-sm border border-blue-500 rounded focus:outline-none"
            />
          ) : (
            <span className="flex-1 text-sm truncate">{folder.name}</span>
          )}

          {/* Workflow Count */}
          {folder.workflowIds.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {folder.workflowIds.length}
            </span>
          )}

          {/* More Menu */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e, folder);
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div role="group">
            {node.children.map((child) =>
              renderFolderItem(child, depth + 1, true)
            )}
          </div>
        )}
      </div>
    );
  };

  // Close context menu on outside click
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Folders</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800"
          />
        </div>

        {/* New Folder Button */}
        <button
          onClick={() => handleCreateFolder(null)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Folder
        </button>
      </div>

      {/* Folder Tree */}
      <div
        className="flex-1 overflow-y-auto p-2"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => handleDrop(e, null)}
        role="tree"
      >
        {/* All Workflows (Root) */}
        <div
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer mb-1
            hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
            ${selectedFolderId === null ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''}
          `}
          onClick={() => handleFolderClick(null)}
          onContextMenu={(e) => handleContextMenu(e, null)}
        >
          <Home className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="flex-1 text-sm font-medium">All Workflows</span>
        </div>

        {/* Folder List */}
        {filteredNodes.length > 0 ? (
          filteredNodes.map((node) => renderFolderItem(node, 0))
        ) : (
          <div className="text-center text-gray-500 text-sm py-8">
            {searchQuery ? 'No folders found' : 'No folders yet'}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleCreateFolder(contextMenu.folder?.id || null);
              closeContextMenu();
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" />
            New Subfolder
          </button>
          {contextMenu.folder && (
            <>
              <button
                onClick={() => handleRenameFolder(contextMenu.folder!.id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </button>
              <button
                onClick={() => handleDeleteFolder(contextMenu.folder!.id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <NewFolderDialog
          onSubmit={handleCreateFolderSubmit}
          onCancel={() => setShowNewFolderDialog(false)}
        />
      )}
    </div>
  );
};

// New Folder Dialog Component
const NewFolderDialog: React.FC<{
  onSubmit: (name: string, color: string) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), color);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="Enter folder name"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex gap-2">
              {[
                '#6366f1',
                '#8b5cf6',
                '#ec4899',
                '#f43f5e',
                '#f59e0b',
                '#10b981',
                '#06b6d4',
                '#3b82f6',
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
