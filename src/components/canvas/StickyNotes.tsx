import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { isContrastSufficient, bestTextColor } from '../../utils/colorContrast';
import { Plus, X, GripVertical, Maximize2, Minimize2, Bold, Italic, List, Link2 } from 'lucide-react';

interface StickyNote {
  id: string;
  text: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
  rotation: number;
  attachedToNode?: string;
  zIndex?: number;
}

interface StickyNotesProps {
  notes: StickyNote[];
  onAddNote: (note: Omit<StickyNote, 'id'>) => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (id: string, updates: Partial<StickyNote>) => void;
}

const PRESET_COLORS = [
  '#fff740', '#ff6b6b', '#4ecdc4', '#45b7d1',
  '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'
];

function StickyNotes({
  notes,
  onAddNote,
  onDeleteNote,
  onUpdateNote
}: StickyNotesProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [srMessage, setSrMessage] = useState('');
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const [resizingNote, setResizingNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { darkMode } = useWorkflowStore();
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const defaultNoteSize = { width: 250, height: 200 };
  const noteWidth = defaultNoteSize.width;
  const noteHeight = defaultNoteSize.height;

  const isOverlapping = (x: number, y: number, excludeId?: string) => {
    return notes.some(n => {
      if (excludeId && n.id === excludeId) return false;
      return (
        x < n.position.x + noteWidth &&
        x + noteWidth > n.position.x &&
        y < n.position.y + noteHeight &&
        y + noteHeight > n.position.y
      );
    });
  };

  const getAccessibleColor = () => {
    const candidate = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    return candidate;
  };

  const handleAddNote = () => {
    const maxX = window.innerWidth - noteWidth - 100;
    const maxY = window.innerHeight - noteHeight - 100;
    let x = Math.random() * maxX;
    let y = Math.random() * maxY;
    let attempts = 0;
    
    while (isOverlapping(x, y) && attempts < 20) {
      x = Math.random() * maxX;
      y = Math.random() * maxY;
      attempts++;
    }

    const newNote = {
      text: 'New note',
      position: { x, y },
      size: defaultNoteSize,
      color: getAccessibleColor(),
      rotation: (Math.random() - 0.5) * 10
    };

    onAddNote(newNote);
    setIsAddingNote(false);
    setSrMessage('Sticky note added');
    addBtnRef.current?.focus();
  };

  const handleNoteClick = (noteId: string) => {
    setEditingNoteId(noteId);
  };

  const handleNoteUpdate = (noteId: string, newText: string) => {
    onUpdateNote(noteId, { text: newText });
    setEditingNoteId(null);
  };
  
  const delta = 10;

  return (
    <div className={`sticky-notes-container ${darkMode ? 'text-gray-100' : ''}`}>
      <button
        ref={addBtnRef}
        onClick={() => setIsAddingNote(!isAddingNote)}
        className={`add-note-btn flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${darkMode ? 'bg-yellow-600 hover:bg-yellow-500 text-gray-100' : 'bg-yellow-400 hover:bg-yellow-500'}`}
        aria-label="Add sticky note"
      >
        <Plus size={16} />
        Add Note
      </button>

      {isAddingNote && (
        <div className="mt-2">
          <button
            onClick={handleAddNote}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            aria-label="Create sticky note"
          >
            Create Note
          </button>
        </div>
      )}

      {notes.map((note) => (
        <div
          key={note.id}
          className={`sticky-note absolute w-48 h-32 p-3 shadow-lg cursor-pointer select-none ${darkMode ? 'border border-gray-600' : ''}`}
          role="region"
          aria-label="Sticky note"
          tabIndex={0}
          style={{
            backgroundColor: note.color,
            color: bestTextColor(note.color),
            left: note.position.x,
            top: note.position.y,
            transform: `rotate(${note.rotation}deg)`,
            fontFamily: 'Comic Sans MS, cursive'
          }}
          onClick={() => handleNoteClick(note.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleNoteClick(note.id);
            } else if (e.key === 'Delete') {
              onDeleteNote(note.id);
              setSrMessage('Sticky note deleted');
              addBtnRef.current?.focus();
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault();
              const updates: Partial<StickyNote> = { position: { ...note.position } } as unknown;
              if (e.key === 'ArrowUp') updates.position!.y = Math.max(0, note.position.y - delta);
              if (e.key === 'ArrowDown') updates.position!.y = note.position.y + delta;
              if (e.key === 'ArrowLeft') updates.position!.x = Math.max(0, note.position.x - delta);
              if (e.key === 'ArrowRight') updates.position!.x = note.position.x + delta;
              onUpdateNote(note.id, updates);
            }
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
              setSrMessage('Sticky note deleted');
              addBtnRef.current?.focus();
            }}
            className={`absolute top-1 right-1 transition-colors ${darkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-600 hover:text-red-600'}`}
            aria-label="Delete sticky note"
          >
            <X size={14} />
          </button>

          {editingNoteId === note.id ? (
            <textarea
              autoFocus
              value={note.text}
              onChange={(e) => handleNoteUpdate(note.id, e.target.value)}
              onBlur={() => setEditingNoteId(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleNoteUpdate(note.id, e.currentTarget.value);
                }
              }}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
              aria-label="Edit sticky note"
              style={{ fontFamily: 'inherit' }}
            />
          ) : (
            <div className="text-sm whitespace-pre-wrap overflow-hidden">
              {note.text}
            </div>
          )}
        </div>
      ))}
      <div role="status" aria-live="polite" className="sr-only">{srMessage}</div>
    </div>
  );
}

export { StickyNotes };
export default StickyNotes;