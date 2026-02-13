/**
 * Sticky Note Node Component
 * Colored notes on the canvas for documentation (like n8n)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { Palette, Trash2, Copy, Pin, GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface StickyNoteData {
  content: string;
  color: string;
  fontSize?: 'small' | 'medium' | 'large';
  isMinimized?: boolean;
}

const COLORS = [
  { name: 'Yellow', value: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  { name: 'Green', value: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  { name: 'Blue', value: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  { name: 'Purple', value: '#ede9fe', border: '#c4b5fd', text: '#5b21b6' },
  { name: 'Pink', value: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  { name: 'Orange', value: '#ffedd5', border: '#fdba74', text: '#9a3412' },
  { name: 'Gray', value: '#f3f4f6', border: '#d1d5db', text: '#374151' },
];

const StickyNoteNode: React.FC<NodeProps<StickyNoteData>> = ({
  id,
  data,
  selected,
}) => {
  const { updateNode, deleteNode, duplicateNode } = useWorkflowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content || '');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const currentColor = COLORS.find(c => c.value === data.color) || COLORS[0];

  // Focus textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, [isEditing, content.length]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (!data.isMinimized) {
      setIsEditing(true);
    }
  }, [data.isMinimized]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    updateNode(id, { ...data, content });
  }, [id, data, content, updateNode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setContent(data.content || '');
    }
    // Allow Enter for new lines (no special handling needed)
  }, [data.content]);

  const handleColorChange = useCallback((color: typeof COLORS[0]) => {
    updateNode(id, { ...data, color: color.value });
    setShowColorPicker(false);
  }, [id, data, updateNode]);

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const handleDuplicate = useCallback(() => {
    duplicateNode(id);
  }, [id, duplicateNode]);

  const handleToggleMinimize = useCallback(() => {
    updateNode(id, { ...data, isMinimized: !data.isMinimized });
  }, [id, data, updateNode]);

  const getFontSize = () => {
    switch (data.fontSize) {
      case 'small': return 'text-xs';
      case 'large': return 'text-lg';
      default: return 'text-sm';
    }
  };

  return (
    <>
      {/* Node Resizer */}
      <NodeResizer
        minWidth={150}
        minHeight={data.isMinimized ? 40 : 100}
        isVisible={selected}
        lineClassName="border-blue-400"
        handleClassName="h-3 w-3 bg-white border-2 border-blue-400 rounded"
      />

      <div
        className={`
          relative rounded-lg shadow-lg transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        `}
        style={{
          backgroundColor: currentColor.value,
          borderLeft: `4px solid ${currentColor.border}`,
          minWidth: 150,
          minHeight: data.isMinimized ? 40 : 100,
        }}
      >
        {/* Header with drag handle and actions */}
        <div
          className="flex items-center justify-between px-2 py-1 cursor-move"
          style={{ borderBottom: `1px solid ${currentColor.border}` }}
        >
          <div className="flex items-center gap-1">
            <GripVertical size={14} style={{ color: currentColor.text }} className="opacity-50" />
            <span
              className="text-xs font-medium truncate max-w-[100px]"
              style={{ color: currentColor.text }}
            >
              Note
            </span>
          </div>

          {/* Action buttons - visible on hover/select */}
          <div className={`flex items-center gap-0.5 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            <button
              onClick={handleToggleMinimize}
              className="p-1 rounded hover:bg-black/10 transition-colors"
              title={data.isMinimized ? 'Expand' : 'Minimize'}
            >
              {data.isMinimized ? (
                <Maximize2 size={12} style={{ color: currentColor.text }} />
              ) : (
                <Minimize2 size={12} style={{ color: currentColor.text }} />
              )}
            </button>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded hover:bg-black/10 transition-colors"
              title="Change color"
            >
              <Palette size={12} style={{ color: currentColor.text }} />
            </button>
            <button
              onClick={handleDuplicate}
              className="p-1 rounded hover:bg-black/10 transition-colors"
              title="Duplicate"
            >
              <Copy size={12} style={{ color: currentColor.text }} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-200 transition-colors"
              title="Delete"
            >
              <Trash2 size={12} className="text-red-500" />
            </button>
          </div>
        </div>

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div
            ref={colorPickerRef}
            className="absolute top-8 right-0 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex gap-1"
          >
            {COLORS.map((color) => (
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

        {/* Content area */}
        {!data.isMinimized && (
          <div
            className="p-3 h-full min-h-[60px]"
            onDoubleClick={handleDoubleClick}
          >
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`w-full h-full bg-transparent resize-none outline-none ${getFontSize()}`}
                style={{ color: currentColor.text }}
                placeholder="Double-click to edit..."
              />
            ) : (
              <div
                className={`whitespace-pre-wrap break-words ${getFontSize()}`}
                style={{ color: currentColor.text }}
              >
                {content || (
                  <span className="opacity-50 italic">Double-click to add text...</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Minimized indicator */}
        {data.isMinimized && content && (
          <div
            className="px-3 py-1 text-xs truncate"
            style={{ color: currentColor.text }}
          >
            {content.substring(0, 30)}{content.length > 30 ? '...' : ''}
          </div>
        )}
      </div>
    </>
  );
};

export default StickyNoteNode;
