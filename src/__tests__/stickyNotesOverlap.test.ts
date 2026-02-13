import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../store/workflowStore';

interface StickyNote {
  id: string;
  text: string;
  position: { x: number; y: number };
  color: string;
  rotation: number;
}

describe('stickyNotes overlap prevention', () => {
  beforeEach(() => {
    // reset store
    useWorkflowStore.setState({ stickyNotes: [] });
  });

  it('updateStickyNote avoids overlapping positions', () => {
    const { addStickyNote, updateStickyNote } = useWorkflowStore.getState();

    const noteA: StickyNote = { id: 'a', text: '', position: { x: 0, y: 0 }, color: '#fff', rotation: 0 };
    const noteB: StickyNote = { id: 'b', text: '', position: { x: 50, y: 50 }, color: '#fff', rotation: 0 };

    addStickyNote(noteA);
    addStickyNote(noteB);

    updateStickyNote('a', { position: { x: 50, y: 50 } });

    const state = useWorkflowStore.getState();
    const a = state.stickyNotes.find(n => n.id === 'a');
    const b = state.stickyNotes.find(n => n.id === 'b');

    expect(a).toBeDefined();
    expect(b).toBeDefined();

    if (a && b) {
      expect(a.position.x === b.position.x && a.position.y === b.position.y).toBe(false);
    }
  });
});
