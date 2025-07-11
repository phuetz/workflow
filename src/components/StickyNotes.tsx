import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { StickyNote, Plus, X, Edit } from 'lucide-react';

interface StickyNote {
  id: string;
  content: string;
  position: { x: number; y: number };
  color: string;
  author: string;
  createdAt: string;
}

export default function StickyNotes() {
  const { darkMode, stickyNotes, addStickyNote, updateStickyNote, deleteStickyNote } = useWorkflowStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNotePosition, setNewNotePosition] = useState({ x: 0, y: 0 });

  const colors = [
    '#fef3c7', // yellow
    '#fde68a', // amber
    '#fed7aa', // orange
    '#fecaca', // red
    '#c7d2fe', // indigo
    '#d1fae5', // green
    '#e0e7ff', // blue
    '#f3e8ff', // purple
  ];

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isAdding) {
      const rect = e.currentTarget.getBoundingClientRect();
      setNewNotePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      
      const note = {
        id: Date.now().toString(),
        content: newNoteContent || 'New note',
        position: newNotePosition,
        color: colors[Math.floor(Math.random() * colors.length)],
        author: 'Current User',
        createdAt: new Date().toISOString()
      };
      
      addStickyNote(note);
      setIsAdding(false);
      setNewNoteContent('');
    }
  };

  const handleNoteUpdate = (noteId: string, content: string) => {
    updateStickyNote(noteId, { content });
    setEditingNote(null);
  };

  return (
    <>
      {/* Add Note Button */}
      <button
        onClick={() => setIsAdding(!isAdding)}
        className={`fixed top-32 right-4 z-40 p-2 rounded-lg ${
          isAdding ? 'bg-yellow-500 text-white' : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
        } shadow-lg border transition-colors`}
        title="Add sticky note"
      >
        <StickyNote size={16} />
      </button>

      {/* Canvas overlay for adding notes */}
      {isAdding && (
        <div
          className="fixed inset-0 z-10 cursor-crosshair"
          onClick={handleCanvasClick}
        >
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded-lg">
            Click anywhere to add a sticky note
          </div>
        </div>
      )}

      {/* Sticky Notes */}
      {stickyNotes?.map((note: StickyNote) => (
        <div
          key={note.id}
          className="absolute z-20 w-48 min-h-32 p-3 rounded-lg shadow-lg cursor-move"
          style={{
            left: note.position.x,
            top: note.position.y,
            backgroundColor: note.color,
            transform: 'rotate(-1deg)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'rotate(0deg) scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'rotate(-1deg) scale(1)';
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-600 font-medium">
              {note.author}
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setEditingNote(note.id)}
                className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
              >
                <Edit size={12} />
              </button>
              <button
                onClick={() => deleteStickyNote(note.id)}
                className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Content */}
          {editingNote === note.id ? (
            <textarea
              defaultValue={note.content}
              className="w-full h-20 bg-transparent border-none outline-none resize-none text-sm"
              autoFocus
              onBlur={(e) => handleNoteUpdate(note.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleNoteUpdate(note.id, e.currentTarget.value);
                }
              }}
            />
          ) : (
            <div 
              className="text-sm whitespace-pre-wrap min-h-16"
              onDoubleClick={() => setEditingNote(note.id)}
            >
              {note.content}
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-gray-500 mt-2">
            {new Date(note.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </>
  );
}