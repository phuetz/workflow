/**
 * Manual test for StickyNote component memory leak fixes
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StickyNoteComponent, StickyNote } from './src/components/StickyNote';

// Test sticky note
const testNote: StickyNote = {
  id: 'test-1',
  content: 'Test Note - Drag me!',
  position: { x: 100, y: 100 },
  size: { width: 250, height: 200 },
  color: '#fff740',
  rotation: 2,
  zIndex: 1000,
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal'
};

function TestApp() {
  const [note, setNote] = React.useState(testNote);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  const handleUpdate = (id: string, updates: Partial<StickyNote>) => {
    console.log('Update:', id, updates);
    setNote(prev => ({ ...prev, ...updates }));
  };

  const handleDelete = (id: string) => {
    console.log('Delete:', id);
    alert('Note deleted!');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 9999, background: 'white', padding: 10, borderRadius: 5 }}>
        <h3>Memory Leak Test - StickyNote</h3>
        <p>Test drag & drop, resize, and color picker</p>
        <label>
          <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} />
          Dark Mode
        </label>
        <p style={{ fontSize: 12, marginTop: 10 }}>
          Position: x={Math.round(note.position.x)}, y={Math.round(note.position.y)}<br/>
          Size: {Math.round(note.size.width)}x{Math.round(note.size.height)}
        </p>
      </div>
      <StickyNoteComponent
        note={note}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

// Mount
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<TestApp />);
}
