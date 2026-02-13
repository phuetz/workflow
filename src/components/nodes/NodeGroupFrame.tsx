/**
 * Node Group Frame Component
 * Visual grouping of nodes with a labeled frame (like n8n)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { Folder, Edit3, Trash2, Palette, Lock, Unlock, GripVertical } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeGroupData {
  label: string;
  color: string;
  isLocked?: boolean;
  description?: string;
}

const GROUP_COLORS = [
  { name: 'Blue', value: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  { name: 'Green', value: '#d1fae5', border: '#10b981', text: '#065f46' },
  { name: 'Purple', value: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
  { name: 'Orange', value: '#ffedd5', border: '#f59e0b', text: '#9a3412' },
  { name: 'Pink', value: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { name: 'Gray', value: '#f3f4f6', border: '#6b7280', text: '#374151' },
];

const NodeGroupFrame: React.FC<NodeProps<NodeGroupData>> = ({
  id,
  data,
  selected,
}) => {
  const { updateNode, deleteNode } = useWorkflowStore();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [label, setLabel] = useState(data.label || 'Group');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const currentColor = GROUP_COLORS.find(c => c.value === data.color) || GROUP_COLORS[0];

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingLabel]);

  // Close color picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLabelDoubleClick = useCallback(() => {
    if (!data.isLocked) {
      setIsEditingLabel(true);
    }
  }, [data.isLocked]);

  const handleLabelBlur = useCallback(() => {
    setIsEditingLabel(false);
    if (label.trim()) {
      updateNode(id, { ...data, label: label.trim() });
    } else {
      setLabel(data.label || 'Group');
    }
  }, [id, data, label, updateNode]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelBlur();
    } else if (e.key === 'Escape') {
      setLabel(data.label || 'Group');
      setIsEditingLabel(false);
    }
  }, [data.label, handleLabelBlur]);

  const handleColorChange = useCallback((color: typeof GROUP_COLORS[0]) => {
    updateNode(id, { ...data, color: color.value });
    setShowColorPicker(false);
  }, [id, data, updateNode]);

  const handleToggleLock = useCallback(() => {
    updateNode(id, { ...data, isLocked: !data.isLocked });
  }, [id, data, updateNode]);

  const handleDelete = useCallback(() => {
    if (!data.isLocked) {
      deleteNode(id);
    }
  }, [id, data.isLocked, deleteNode]);

  return (
    <>
      {/* Resizer */}
      {!data.isLocked && (
        <NodeResizer
          minWidth={200}
          minHeight={150}
          isVisible={selected}
          lineClassName="border-blue-400"
          handleClassName="h-3 w-3 bg-white border-2 border-blue-400 rounded"
        />
      )}

      <div
        className={`
          w-full h-full rounded-xl transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500' : ''}
          ${data.isLocked ? 'opacity-80' : ''}
        `}
        style={{
          backgroundColor: `${currentColor.value}40`,
          border: `2px dashed ${currentColor.border}`,
          minWidth: 200,
          minHeight: 150,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-t-xl cursor-move"
          style={{
            backgroundColor: currentColor.value,
            borderBottom: `2px dashed ${currentColor.border}`,
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical size={14} style={{ color: currentColor.text }} className="opacity-50 flex-shrink-0" />
            <Folder size={16} style={{ color: currentColor.border }} className="flex-shrink-0" />

            {isEditingLabel ? (
              <input
                ref={inputRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={handleLabelKeyDown}
                className="flex-1 bg-white/80 px-2 py-0.5 rounded text-sm font-medium outline-none border border-blue-400"
                style={{ color: currentColor.text }}
              />
            ) : (
              <span
                onDoubleClick={handleLabelDoubleClick}
                className="font-semibold text-sm truncate cursor-text"
                style={{ color: currentColor.text }}
                title={data.label}
              >
                {data.label || 'Group'}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-1 ${selected ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
            <button
              onClick={handleToggleLock}
              className="p-1 rounded hover:bg-white/50 transition-colors"
              title={data.isLocked ? 'Unlock group' : 'Lock group'}
            >
              {data.isLocked ? (
                <Lock size={14} style={{ color: currentColor.text }} />
              ) : (
                <Unlock size={14} style={{ color: currentColor.text }} />
              )}
            </button>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded hover:bg-white/50 transition-colors"
              title="Change color"
            >
              <Palette size={14} style={{ color: currentColor.text }} />
            </button>
            {!data.isLocked && (
              <>
                <button
                  onClick={() => setIsEditingLabel(true)}
                  className="p-1 rounded hover:bg-white/50 transition-colors"
                  title="Rename"
                >
                  <Edit3 size={14} style={{ color: currentColor.text }} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 rounded hover:bg-red-200 transition-colors"
                  title="Delete group"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Color picker */}
        {showColorPicker && (
          <div
            ref={colorPickerRef}
            className="absolute top-12 right-2 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex gap-1"
          >
            {GROUP_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => handleColorChange(color)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  data.color === color.value ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                }`}
                style={{ backgroundColor: color.value, borderColor: color.border }}
                title={color.name}
              />
            ))}
          </div>
        )}

        {/* Description area */}
        {data.description && (
          <div
            className="absolute bottom-2 left-3 right-3 text-xs opacity-60"
            style={{ color: currentColor.text }}
          >
            {data.description}
          </div>
        )}

        {/* Lock indicator */}
        {data.isLocked && (
          <div className="absolute bottom-2 right-2">
            <Lock size={14} style={{ color: currentColor.border }} className="opacity-50" />
          </div>
        )}
      </div>
    </>
  );
};

export default NodeGroupFrame;
