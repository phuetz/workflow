import { describe, it, expect } from 'vitest';
import { useWorkflowStore } from '../store/workflowStore';

describe('stickyNotes state', () => {
  it('initializes as empty array', () => {
    const state = useWorkflowStore.getState();
    expect(Array.isArray(state.stickyNotes)).toBe(true);
    expect(state.stickyNotes.length).toBe(0);
  });
});
