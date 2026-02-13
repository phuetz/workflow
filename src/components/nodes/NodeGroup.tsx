/**
 * Enhanced Node Group Component
 * Features: Collapsible groups, nested groups, group naming, visual boundaries
 * AGENT 5 - UI/UX IMPROVEMENTS
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  Group, Ungroup, ChevronDown, ChevronRight, Edit2, Check, X,
  Palette, Lock, Unlock, Move, Maximize2, Minimize2
} from 'lucide-react';
import { NodeGroup as StoreNodeGroup } from '../../store/slices/nodeSlice';

// Extended NodeGroup with additional UI properties
export interface NodeGroup extends StoreNodeGroup {
  collapsed?: boolean;
  locked?: boolean;
  parentGroupId?: string;
  zIndex?: number;
}

interface NodeGroupProps {
  group: NodeGroup;
  onUpdate: (id: string, updates: Partial<NodeGroup>) => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const GROUP_COLORS = [
  '#e0e7ff', '#fce7f3', '#fef3c7', '#d1fae5',
  '#dbeafe', '#f3e8ff', '#fee2e2', '#e0f2fe'
];

export function NodeGroupComponent({
  group,
  onUpdate,
  onDelete,
  isDarkMode,
  isSelected,
  onSelect
}: NodeGroupProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { nodes } = useWorkflowStore();

  const groupNodes = nodes.filter(n => group.nodes.includes(n.id));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (group.locked ?? false) return;
    if ((e.target as HTMLElement).closest('.group-controls')) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - group.position.x,
      y: e.clientY - group.position.y
    });
    onSelect(group.id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && !(group.locked ?? false)) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Move all nodes in the group
      const deltaX = newX - group.position.x;
      const deltaY = newY - group.position.y;

      onUpdate(group.id, {
        position: { x: newX, y: newY }
      });

      // Update node positions
      groupNodes.forEach(node => {
        const { updateNode } = useWorkflowStore.getState();
        updateNode(node.id, {
          position: {
            x: node.position.x + deltaX,
            y: node.position.y + deltaY
          }
        });
      });
    }
  }, [isDragging, group.locked, group.position.x, group.position.y, group.id, dragStart.x, dragStart.y, groupNodes, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleCollapse = () => {
    onUpdate(group.id, { collapsed: !(group.collapsed ?? false) });
  };

  const toggleLock = () => {
    onUpdate(group.id, { locked: !(group.locked ?? false) });
  };

  const saveName = () => {
    onUpdate(group.id, { name: editedName });
    setIsEditingName(false);
  };

  const borderColor = isDarkMode
    ? isSelected ? '#60a5fa' : group.color
    : isSelected ? '#3b82f6' : group.color;

  return (
    <div
      className={`absolute pointer-events-auto transition-all ${
        isDragging ? 'cursor-move' : 'cursor-default'
      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: group.position.x,
        top: group.position.y,
        width: (group.collapsed ?? false) ? 200 : group.size.width,
        height: (group.collapsed ?? false) ? 40 : group.size.height,
        zIndex: group.zIndex ?? 0
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Group boundary */}
      <div
        className="w-full h-full rounded-lg border-2 transition-all"
        style={{
          backgroundColor: (group.collapsed ?? false)
            ? group.color + '40'
            : group.color + '20',
          borderColor: borderColor,
          borderStyle: (group.locked ?? false) ? 'solid' : 'dashed'
        }}
      >
        {/* Header */}
        <div
          className="group-controls flex items-center justify-between px-3 py-2 rounded-t-lg"
          style={{
            backgroundColor: group.color + '60',
            borderBottom: (group.collapsed ?? false) ? 'none' : `1px solid ${borderColor}`
          }}
        >
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={toggleCollapse}
              className="p-1 hover:bg-black/10 rounded"
              title={(group.collapsed ?? false) ? 'Expand group' : 'Collapse group'}
            >
              {(group.collapsed ?? false) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>

            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveName();
                    if (e.key === 'Escape') {
                      setEditedName(group.name);
                      setIsEditingName(false);
                    }
                  }}
                  className="flex-1 px-2 py-1 text-sm bg-white/80 border border-gray-300 rounded"
                  autoFocus
                />
                <button
                  onClick={saveName}
                  className="p-1 hover:bg-green-500/20 rounded text-green-600"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => {
                    setEditedName(group.name);
                    setIsEditingName(false);
                  }}
                  className="p-1 hover:bg-red-500/20 rounded text-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-semibold">{group.name}</span>
                <span className="text-xs opacity-60">({group.nodes.length} nodes)</span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 hover:bg-black/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename group"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleLock}
              className="p-1 hover:bg-black/10 rounded"
              title={(group.locked ?? false) ? 'Unlock group' : 'Lock group'}
            >
              {(group.locked ?? false) ? <Lock size={14} /> : <Unlock size={14} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 hover:bg-black/10 rounded"
                title="Change color"
              >
                <Palette size={14} />
              </button>

              {showColorPicker && (
                <div
                  className="absolute top-full right-0 mt-1 p-2 rounded-lg shadow-xl z-50"
                  style={{ backgroundColor: isDarkMode ? '#1f2937' : 'white' }}
                >
                  <div className="grid grid-cols-4 gap-2">
                    {GROUP_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          onUpdate(group.id, { color });
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: color,
                          borderColor: color === group.color ? '#000' : 'transparent'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onDelete(group.id)}
              className="p-1 hover:bg-red-500/20 rounded text-red-600"
              title="Delete group"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Group content - hidden when collapsed */}
        {!(group.collapsed ?? false) && (
          <div className="p-2">
            <div className="text-xs opacity-60">
              Drag nodes here or select and group them
            </div>
          </div>
        )}
      </div>

      {/* Drag handle indicator */}
      {!(group.locked ?? false) && (
        <div className="absolute top-2 left-2 opacity-30 pointer-events-none">
          <Move size={12} />
        </div>
      )}
    </div>
  );
}

// Manager component for all node groups
export default function NodeGroupManager() {
  const {
    nodeGroups = [],
    selectedNodes,
    addNodeGroup,
    updateNodeGroup,
    deleteNodeGroup,
    darkMode,
    nodes,
    groupSelectedNodes,
    ungroupSelectedNodes
  } = useWorkflowStore();

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const handleCreateGroup = useCallback(() => {
    if (selectedNodes.length < 2) return;

    const selectedNodeData = nodes.filter(n => selectedNodes.includes(n.id));
    if (selectedNodeData.length === 0) return;

    const minX = Math.min(...selectedNodeData.map(n => n.position.x));
    const minY = Math.min(...selectedNodeData.map(n => n.position.y));
    const maxX = Math.max(...selectedNodeData.map(n => n.position.x + 200));
    const maxY = Math.max(...selectedNodeData.map(n => n.position.y + 100));

    const newGroup: NodeGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Group ${nodeGroups.length + 1}`,
      color: GROUP_COLORS[nodeGroups.length % GROUP_COLORS.length],
      nodes: selectedNodes,
      position: { x: minX - 20, y: minY - 50 },
      size: { width: maxX - minX + 40, height: maxY - minY + 70 },
      collapsed: false,
      locked: false,
      zIndex: 0
    };

    addNodeGroup(newGroup);
  }, [selectedNodes, nodes, nodeGroups.length, addNodeGroup]);

  const handleDeleteGroup = useCallback((groupId: string) => {
    deleteNodeGroup(groupId);
    if (selectedGroup === groupId) {
      setSelectedGroup(null);
    }
  }, [deleteNodeGroup, selectedGroup]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'g') {
          e.preventDefault();
          handleCreateGroup();
        }
        if (e.key === 'u' && e.shiftKey && selectedGroup) {
          e.preventDefault();
          handleDeleteGroup(selectedGroup);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, selectedGroup, nodeGroups, handleCreateGroup, handleDeleteGroup]);

  return (
    <>
      {/* Toolbar */}
      <div
        className={`absolute top-20 left-4 z-40 flex items-center gap-2 p-2 rounded-lg shadow-lg ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}
      >
        <button
          onClick={handleCreateGroup}
          disabled={selectedNodes.length < 2}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            selectedNodes.length >= 2
              ? darkMode
                ? 'bg-blue-700 text-white hover:bg-blue-600'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title="Group selected nodes (Ctrl+G)"
        >
          <Group size={16} />
          Group ({selectedNodes.length})
        </button>

        {nodeGroups.length > 0 && (
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {nodeGroups.length} group{nodeGroups.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Render all groups */}
      {nodeGroups.map(group => (
        <NodeGroupComponent
          key={group.id}
          group={group}
          onUpdate={updateNodeGroup}
          onDelete={handleDeleteGroup}
          isDarkMode={darkMode}
          isSelected={selectedGroup === group.id}
          onSelect={setSelectedGroup}
        />
      ))}
    </>
  );
}
