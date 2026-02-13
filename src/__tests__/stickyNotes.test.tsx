import { describe, it, expect } from 'vitest';
import { useWorkflowStore } from '../store/workflowStore';
import React from 'react';
import { StickyNotes } from '../components/canvas/StickyNotes';
import { renderToString } from 'react-dom/server';

describe('stickyNotes state', () => {
  it('initializes as empty array', () => {
    const state = useWorkflowStore.getState();
    expect(Array.isArray(state.stickyNotes)).toBe(true);
    expect(state.stickyNotes.length).toBe(0);
  });

  it('add note button has aria-label', () => {
    const html = renderToString(
      <StickyNotes
        notes={[]}
        onAddNote={() => {}}
        onDeleteNote={() => {}}
        onUpdateNote={() => {}}
      />
    );
    expect(html.includes('aria-label="Add sticky note"')).toBe(true);
  });

  it('sticky notes are keyboard focusable', () => {
    const html = renderToString(
      <StickyNotes
        notes={[{ id: '1', text: 'Hi', position: { x: 0, y: 0 }, color: '#fff740', rotation: 0 }]}
        onAddNote={() => {}}
        onDeleteNote={() => {}}
        onUpdateNote={() => {}}
      />
    );
    expect(html.includes('tabindex="0"')).toBe(true);
  });

  it('includes aria-live status region', () => {
    const html = renderToString(
      <StickyNotes
        notes={[]}
        onAddNote={() => {}}
        onDeleteNote={() => {}}
        onUpdateNote={() => {}}
      />
    );
    expect(html.includes('aria-live="polite"')).toBe(true);
    expect(html.includes('role="status"')).toBe(true);
  });
});
