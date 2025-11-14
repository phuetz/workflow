import React, { useState, useCallback } from 'react';
import { StickyNote as StickyNoteIcon, Plus } from 'lucide-react';
import StickyNote, { StickyNoteData } from './StickyNote';
import { useWorkflowStore } from '../store/workflowStore';

interface StickyNotesManagerProps {
  workflowId: string;
  scale: number;
  canvasOffset: { x: number; y: number };
}

export default function StickyNotesManager({
  workflowId,
  scale,
  canvasOffset
}: StickyNotesManagerProps) {
  const { darkMode } = useWorkflowStore();
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);

  // Load notes from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem(`sticky-notes-${workflowId}`);
    if (stored) {
      try {
        setNotes(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load sticky notes:', error);
      }
    }
  }, [workflowId]);

  // Save notes to localStorage
  React.useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(`sticky-notes-${workflowId}`, JSON.stringify(notes));
    }
  }, [notes, workflowId]);

  const createNote = useCallback(() => {
    const newNote: StickyNoteData = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: '',
      position: {
        x: (window.innerWidth / 2 - canvasOffset.x) / scale - 125,
        y: (window.innerHeight / 2 - canvasOffset.y) / scale - 100
      },
      size: { width: 250, height: 200 },
      color: JSON.stringify({ bg: '#fef08a', text: '#854d0e' }),
      fontSize: 14,
      zIndex: Math.max(...notes.map(n => n.zIndex), 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotes(prev => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
  }, [notes, scale, canvasOffset]);

  const updateNote = useCallback((id: string, updates: Partial<StickyNoteData>) => {
    setNotes(prev => prev.map(note =>
      note.id === id ? { ...note, ...updates } : note
    ));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  }, [selectedNoteId]);

  const duplicateNote = useCallback((id: string) => {
    const original = notes.find(n => n.id === id);
    if (!original) return;

    const duplicate: StickyNoteData = {
      ...original,
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: original.position.x + 20,
        y: original.position.y + 20
      },
      zIndex: Math.max(...notes.map(n => n.zIndex), 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotes(prev => [...prev, duplicate]);
    setSelectedNoteId(duplicate.id);
  }, [notes]);

  const bringToFront = useCallback((id: string) => {
    const maxZ = Math.max(...notes.map(n => n.zIndex), 0);
    updateNote(id, { zIndex: maxZ + 1 });
  }, [notes, updateNote]);

  const handleNoteSelect = useCallback((id: string) => {
    setSelectedNoteId(id);
    bringToFront(id);
  }, [bringToFront]);

  const clearAllNotes = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all sticky notes?')) {
      setNotes([]);
      setSelectedNoteId(null);
      localStorage.removeItem(`sticky-notes-${workflowId}`);
    }
  }, [workflowId]);

  const exportNotes = useCallback(() => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sticky-notes-${workflowId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [notes, workflowId]);

  const importNotes = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          setNotes(prev => [...prev, ...imported]);
        }
      } catch (error) {
        alert('Failed to import sticky notes. Invalid file format.');
      }
    };
    reader.readAsText(file);
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected note with Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
          e.preventDefault();
          deleteNote(selectedNoteId);
        }
      }

      // Duplicate with Ctrl+D
      if (e.ctrlKey && e.key === 'd' && selectedNoteId) {
        e.preventDefault();
        duplicateNote(selectedNoteId);
      }

      // Create new note with Ctrl+N
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createNote();
      }

      // Deselect with Escape
      if (e.key === 'Escape') {
        setSelectedNoteId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId, deleteNote, duplicateNote, createNote]);

  return (
    <>
      {/* Sticky Notes Toolbar */}
      <div className={`absolute top-4 right-4 z-40 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } rounded-lg shadow-lg border p-2 transition-all ${
        showToolbar ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center space-x-2">
              <StickyNoteIcon size={16} />
              <span className="text-sm font-medium">Sticky Notes</span>
            </div>
            <button
              onClick={() => setShowToolbar(false)}
              className="text-xs opacity-50 hover:opacity-100"
            >
              Hide
            </button>
          </div>

          <button
            onClick={createNote}
            className="flex items-center space-x-2 px-3 py-2 bg-yellow-400 text-yellow-900 rounded hover:bg-yellow-500 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            <span>New Note</span>
          </button>

          <div className="text-xs opacity-75 pt-2 border-t">
            <div className="mb-1 font-medium">Shortcuts:</div>
            <div>Ctrl+N - New note</div>
            <div>Ctrl+D - Duplicate</div>
            <div>Delete - Remove</div>
            <div>Double-click - Edit</div>
          </div>

          {notes.length > 0 && (
            <>
              <div className="pt-2 border-t space-y-2">
                <div className="text-xs opacity-75">
                  {notes.length} note{notes.length !== 1 ? 's' : ''}
                </div>

                <button
                  onClick={exportNotes}
                  className="w-full px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Export Notes
                </button>

                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importNotes}
                    className="hidden"
                  />
                  <div className="w-full px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-center cursor-pointer">
                    Import Notes
                  </div>
                </label>

                <button
                  onClick={clearAllNotes}
                  className="w-full px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toggle button when toolbar is hidden */}
      {!showToolbar && (
        <button
          onClick={() => setShowToolbar(true)}
          className={`absolute top-4 right-4 z-40 p-2 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } rounded-lg shadow-lg border hover:scale-110 transition-transform`}
          title="Show sticky notes toolbar"
        >
          <StickyNoteIcon size={20} />
          {notes.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {notes.length}
            </span>
          )}
        </button>
      )}

      {/* Render all sticky notes */}
      {notes.map(note => (
        <StickyNote
          key={note.id}
          note={note}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onDuplicate={duplicateNote}
          isSelected={selectedNoteId === note.id}
          onSelect={handleNoteSelect}
          scale={scale}
        />
      ))}
    </>
  );
}
