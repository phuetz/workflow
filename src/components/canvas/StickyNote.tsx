/**
 * Enhanced Sticky Note Component
 * Features: Drag, Resize, Rich Text, Color Picker, Node Attachment
 * AGENT 5 - UI/UX IMPROVEMENTS
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { bestTextColor } from '../../utils/colorContrast';
import type { StickyNote } from '../../types/workflow';
import {
  Plus, X, GripVertical, Maximize2, Minimize2,
  Bold, Italic, List, Link2, Palette, Pin
} from 'lucide-react';

interface StickyNoteProps {
  note: StickyNote;
  onUpdate: (id: string, updates: Partial<StickyNote>) => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
}

// n8n-style vibrant sticky note colors
const PRESET_COLORS = [
  '#FFD43B', '#FF922B', '#FF6B6B', '#DA77F2',
  '#748FFC', '#4DABF7', '#38D9A9', '#69DB7C',
  '#A9E34B', '#FFE066', '#FFA8A8', '#D0BFFF',
];

const StickyNoteComponentInner = ({ note, onUpdate, onDelete, isDarkMode }: StickyNoteProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  // Use refs to avoid stale closures in event handlers
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.note-controls')) return;
    if (isEditing) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - note.position.x,
      y: e.clientY - note.position.y
    };
  }, [note.position.x, note.position.y, isEditing]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      onUpdate(note.id, {
        position: {
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y
        }
      });
    } else if (isResizing) {
      const newWidth = Math.max(150, e.clientX - note.position.x);
      const newHeight = Math.max(100, e.clientY - note.position.y);
      onUpdate(note.id, {
        size: { width: newWidth, height: newHeight }
      });
    }
  }, [isDragging, isResizing, note.id, note.position.x, note.position.y, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Close color picker when clicking outside
  useEffect(() => {
    if (!showColorPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (noteRef.current && !noteRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { width: note.size.width, height: note.size.height };
  }, [note.size.width, note.size.height]);

  const toggleBold = useCallback(() => {
    onUpdate(note.id, { fontWeight: note.fontWeight === 'bold' ? 'normal' : 'bold' });
  }, [note.id, note.fontWeight, onUpdate]);

  const toggleItalic = useCallback(() => {
    onUpdate(note.id, { fontStyle: note.fontStyle === 'italic' ? 'normal' : 'italic' });
  }, [note.id, note.fontStyle, onUpdate]);

  const changeFontSize = useCallback((delta: number) => {
    const currentSize = note.fontSize || 14;
    onUpdate(note.id, { fontSize: Math.max(10, Math.min(32, currentSize + delta)) });
  }, [note.id, note.fontSize, onUpdate]);

  const textColor = bestTextColor(note.color);

  return (
    <div
      ref={noteRef}
      className={`absolute rounded-lg overflow-hidden transition-shadow ${
        isDragging ? 'cursor-move shadow-xl' : 'cursor-auto shadow-md hover:shadow-lg'
      }`}
      style={{
        left: note.position.x,
        top: note.position.y,
        width: note.size.width,
        height: note.size.height,
        backgroundColor: note.color,
        color: textColor,
        transform: `rotate(${note.rotation}deg)`,
        zIndex: note.zIndex || 1000,
        userSelect: isDragging ? 'none' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header with controls */}
      <div
        className="note-controls flex items-center justify-between p-2 border-b"
        style={{
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'
        }}
      >
        <div className="flex items-center gap-1">
          <GripVertical size={16} className="cursor-move opacity-60" />

          <button
            onClick={toggleBold}
            className={`p-1 rounded hover:bg-black/10 ${note.fontWeight === 'bold' ? 'bg-black/20' : ''}`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>

          <button
            onClick={toggleItalic}
            className={`p-1 rounded hover:bg-black/10 ${note.fontStyle === 'italic' ? 'bg-black/20' : ''}`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>

          <button
            onClick={() => changeFontSize(2)}
            className="p-1 rounded hover:bg-black/10 text-xs font-bold"
            title="Increase font size"
          >
            A+
          </button>

          <button
            onClick={() => changeFontSize(-2)}
            className="p-1 rounded hover:bg-black/10 text-xs"
            title="Decrease font size"
          >
            A-
          </button>

          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded hover:bg-black/10"
              title="Change color"
            >
              <Palette size={14} />
            </button>

            {showColorPicker && (
              <div
                className="absolute top-full left-0 mt-1 p-2 rounded-lg shadow-xl z-50"
                style={{ backgroundColor: isDarkMode ? '#1f2937' : 'white' }}
              >
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        onUpdate(note.id, { color });
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: color === note.color ? textColor : 'transparent'
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(note.id)}
          className="p-1 rounded hover:bg-red-500/20 hover:text-red-600"
          title="Delete note (Delete key)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content area */}
      <div className="p-3 h-full overflow-auto" style={{ height: 'calc(100% - 36px)' }}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={(e) => onUpdate(note.id, { content: e.target.value })}
            onBlur={() => setIsEditing(false)}
            className="w-full h-full bg-transparent border-none outline-none resize-none"
            style={{
              color: textColor,
              fontSize: note.fontSize || 14,
              fontWeight: note.fontWeight || 'normal',
              fontStyle: note.fontStyle || 'normal',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full h-full cursor-text whitespace-pre-wrap break-words"
            style={{
              fontSize: note.fontSize || 14,
              fontWeight: note.fontWeight || 'normal',
              fontStyle: note.fontStyle || 'normal',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {note.content || 'Click to edit...'}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${textColor}40 50%)`,
        }}
      />
    </div>
  );
}

export const StickyNoteComponent = React.memo(StickyNoteComponentInner, (prev, next) => {
  return (
    prev.note.id === next.note.id &&
    prev.note.content === next.note.content &&
    prev.note.position.x === next.note.position.x &&
    prev.note.position.y === next.note.position.y &&
    prev.note.size.width === next.note.size.width &&
    prev.note.size.height === next.note.size.height &&
    prev.note.color === next.note.color &&
    prev.note.rotation === next.note.rotation &&
    prev.note.zIndex === next.note.zIndex &&
    prev.note.fontSize === next.note.fontSize &&
    prev.note.fontWeight === next.note.fontWeight &&
    prev.note.fontStyle === next.note.fontStyle &&
    prev.isDarkMode === next.isDarkMode &&
    prev.onUpdate === next.onUpdate &&
    prev.onDelete === next.onDelete
  );
});

// Container component for managing all sticky notes
export default function StickyNotesManager() {
  const { stickyNotes, addStickyNote, updateStickyNote, deleteStickyNote, darkMode } = useWorkflowStore();
  const [maxZIndex, setMaxZIndex] = useState(1000);

  const handleAddNote = useCallback(() => {
    const newNote: StickyNote = {
      id: `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: 'New Note',
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { width: 250, height: 200 },
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      rotation: (Math.random() - 0.5) * 5,
      zIndex: maxZIndex + 1,
      fontSize: 14,
      fontWeight: 'normal',
      fontStyle: 'normal'
    };

    addStickyNote(newNote);
    setMaxZIndex(maxZIndex + 1);
  }, [maxZIndex, addStickyNote]);

  const handleUpdateNote = useCallback((id: string, updates: Partial<StickyNote>) => {
    // Bring to front on interaction
    if (updates.position || updates.size) {
      updates.zIndex = maxZIndex + 1;
      setMaxZIndex(maxZIndex + 1);
    }
    updateStickyNote(id, updates);
  }, [maxZIndex, updateStickyNote]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n' && e.shiftKey) {
          e.preventDefault();
          handleAddNote();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddNote]);

  return (
    <div className="sticky-notes-layer absolute inset-0 pointer-events-none">
      <div className="pointer-events-auto absolute top-4 right-4 z-50">
        <button
          onClick={handleAddNote}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all hover:scale-105 ${
            darkMode
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'
          }`}
          title="Add Sticky Note (Ctrl+Shift+N)"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">Sticky Note</span>
        </button>
      </div>

      {stickyNotes && stickyNotes.map((note) => (
        <div key={note.id} className="pointer-events-auto">
          <StickyNoteComponent
            note={note}
            onUpdate={handleUpdateNote}
            onDelete={deleteStickyNote}
            isDarkMode={darkMode}
          />
        </div>
      ))}
    </div>
  );
}
