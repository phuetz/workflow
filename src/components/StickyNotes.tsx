import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface StickyNote {
  id: string;
  text: string;
  position: { x: number; y: number };
  color: string;
  rotation: number;
}

interface StickyNotesProps {
  notes: StickyNote[];
  onAddNote: (note: Omit<StickyNote, 'id'>) => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (id: string, updates: Partial<StickyNote>) => void;
}

const COLORS = [
  '#fff740', '#ff6b6b', '#4ecdc4', '#45b7d1',
  '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'
];

export default function StickyNotes({
  notes,
  onAddNote,
  onDeleteNote,
  onUpdateNote
}: StickyNotesProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const noteWidth = 192;
  const noteHeight = 128;
  const maxX = 300;
  const maxY = 200;

  const isOverlapping = (x: number, y: number) => {
    return notes.some(n => {
      return (
        x < n.position.x + noteWidth &&
        x + noteWidth > n.position.x &&
        y < n.position.y + noteHeight &&
        y + noteHeight > n.position.y
      );
    });
  };

  const handleAddNote = () => {
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
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: (Math.random() - 0.5) * 10
    };

    onAddNote(newNote);
    setIsAddingNote(false);
  };

  const handleNoteClick = (noteId: string) => {
    setEditingNoteId(noteId);
  };

  const handleNoteUpdate = (noteId: string, newText: string) => {
    onUpdateNote(noteId, { text: newText });
    setEditingNoteId(null);
  };

  return (
    <div className="sticky-notes-container">
      <button
        onClick={() => setIsAddingNote(!isAddingNote)}
        className="add-note-btn flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors"
        aria-label="Add sticky note"
      >
        <Plus size={16} />
        Add Note
      </button>

      {isAddingNote && (
        <div className="mt-2">
          <button
            onClick={handleAddNote}
            className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            aria-label="Create sticky note"
          >
            Create Note
          </button>
        </div>
      )}

      {notes.map((note) => (
        <div
          key={note.id}
          className="sticky-note absolute w-48 h-32 p-3 shadow-lg cursor-pointer select-none"
          role="region"
          aria-label="Sticky note"
          style={{
            backgroundColor: note.color,
            left: note.position.x,
            top: note.position.y,
            transform: `rotate(${note.rotation}deg)`,
            fontFamily: 'Comic Sans MS, cursive'
          }}
          onClick={() => handleNoteClick(note.id)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNote(note.id);
            }}
            className="absolute top-1 right-1 text-gray-600 hover:text-red-600 transition-colors"
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
    </div>
  );
}