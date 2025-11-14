import React, { useState, useRef, useEffect } from 'react';
import { X, GripVertical, Edit2, Trash2, Copy, Palette } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';

export interface StickyNoteData {
  id: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  fontSize: number;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface StickyNoteProps {
  note: StickyNoteData;
  onUpdate: (id: string, updates: Partial<StickyNoteData>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  scale: number;
}

const COLORS = [
  { name: 'Yellow', value: '#fef08a', text: '#854d0e' },
  { name: 'Pink', value: '#fbcfe8', text: '#831843' },
  { name: 'Blue', value: '#bfdbfe', text: '#1e3a8a' },
  { name: 'Green', value: '#bbf7d0', text: '#14532d' },
  { name: 'Purple', value: '#e9d5ff', text: '#581c87' },
  { name: 'Orange', value: '#fed7aa', text: '#7c2d12' },
  { name: 'Gray', value: '#e5e7eb', text: '#1f2937' }
];

export default function StickyNote({
  note,
  onUpdate,
  onDelete,
  onDuplicate,
  isSelected,
  onSelect,
  scale
}: StickyNoteProps) {
  const { darkMode } = useWorkflowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === noteRef.current || (e.target as HTMLElement).classList.contains('drag-handle')) {
      e.stopPropagation();
      onSelect(note.id);
      setIsDragging(true);
      setDragStart({
        x: e.clientX - note.position.x * scale,
        y: e.clientY - note.position.y * scale
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = (e.clientX - dragStart.x) / scale;
      const newY = (e.clientY - dragStart.y) / scale;
      onUpdate(note.id, {
        position: { x: newX, y: newY },
        updatedAt: new Date().toISOString()
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(150, resizeStart.width + deltaX / scale);
      const newHeight = Math.max(100, resizeStart.height + deltaY / scale);
      onUpdate(note.id, {
        size: { width: newWidth, height: newHeight },
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: note.size.width,
      height: note.size.height,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(note.id, {
      content: e.target.value,
      updatedAt: new Date().toISOString()
    });
  };

  const handleColorChange = (color: string, textColor: string) => {
    onUpdate(note.id, {
      color: JSON.stringify({ bg: color, text: textColor }),
      updatedAt: new Date().toISOString()
    });
    setShowColorPicker(false);
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(10, Math.min(24, note.fontSize + delta));
    onUpdate(note.id, {
      fontSize: newSize,
      updatedAt: new Date().toISOString()
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName !== 'TEXTAREA') {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const colorData = (() => {
    try {
      return JSON.parse(note.color);
    } catch {
      return { bg: '#fef08a', text: '#854d0e' };
    }
  })();

  return (
    <div
      ref={noteRef}
      className={`absolute rounded-lg shadow-lg transition-shadow ${
        isSelected ? 'ring-2 ring-blue-500 shadow-xl' : ''
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: note.position.x,
        top: note.position.y,
        width: note.size.width,
        minHeight: note.size.height,
        backgroundColor: colorData.bg,
        color: colorData.text,
        zIndex: note.zIndex + (isSelected ? 1000 : 0),
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={() => onSelect(note.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-black/10">
        <div className="drag-handle flex items-center space-x-1 cursor-grab">
          <GripVertical size={14} className="opacity-50" />
          <span className="text-xs opacity-50 font-medium">Note</span>
        </div>

        <div className="flex items-center space-x-1">
          {/* Font size controls */}
          <button
            onClick={() => handleFontSizeChange(-1)}
            className="p-1 rounded hover:bg-black/10 text-xs"
            title="Decrease font size"
          >
            A-
          </button>
          <button
            onClick={() => handleFontSizeChange(1)}
            className="p-1 rounded hover:bg-black/10 text-xs"
            title="Increase font size"
          >
            A+
          </button>

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 rounded hover:bg-black/10"
              title="Change color"
            >
              <Palette size={14} />
            </button>

            {showColorPicker && (
              <div
                className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-2 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-4 gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => handleColorChange(c.value, c.text)}
                      className="w-8 h-8 rounded border-2 border-transparent hover:border-blue-500 transition-colors"
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Edit mode */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
            }}
            className={`p-1 rounded hover:bg-black/10 ${isEditing ? 'bg-black/20' : ''}`}
            title="Edit"
          >
            <Edit2 size={14} />
          </button>

          {/* Duplicate */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(note.id);
            }}
            className="p-1 rounded hover:bg-black/10"
            title="Duplicate"
          >
            <Copy size={14} />
          </button>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="p-1 rounded hover:bg-red-500/20 text-red-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3" style={{ fontSize: note.fontSize }}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={handleContentChange}
            onBlur={handleBlur}
            className="w-full h-full bg-transparent border-none outline-none resize-none"
            style={{
              color: colorData.text,
              fontSize: note.fontSize,
              minHeight: note.size.height - 60
            }}
            placeholder="Type your note here..."
          />
        ) : (
          <div
            className="whitespace-pre-wrap break-words"
            style={{ minHeight: note.size.height - 60 }}
          >
            {note.content || 'Double-click to edit...'}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-50 hover:opacity-100"
        onMouseDown={handleResizeStart}
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${colorData.text} 50%)`
        }}
      />

      {/* Footer metadata */}
      {isSelected && (
        <div className="px-3 pb-2 text-xs opacity-50">
          Updated: {new Date(note.updatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
