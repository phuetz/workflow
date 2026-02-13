/**
 * History Slice
 * Handles undo/redo functionality
 */

import type { StateCreator } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { logger } from '../../services/SimpleLogger';

// Browser-compatible UUID generation
const randomUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
  timestamp?: number;
  id?: string;
}

export interface HistoryState {
  undoHistory: HistoryEntry[];
  redoHistory: HistoryEntry[];
}

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  addToHistory: (nodes: Node[], edges: Edge[]) => Promise<void>;
}

export type HistorySlice = HistoryState & HistoryActions;

export const createHistorySlice: StateCreator<
  HistorySlice & { nodes: Node[]; edges: Edge[] },
  [],
  [],
  HistorySlice
> = (set) => ({
  // Initial state
  undoHistory: [],
  redoHistory: [],

  // Actions
  undo: () => {
    set((state) => {
      if (state.undoHistory.length === 0) return state;

      const lastState = state.undoHistory[state.undoHistory.length - 1];
      const currentState = { nodes: state.nodes, edges: state.edges };

      return {
        nodes: lastState.nodes,
        edges: lastState.edges,
        undoHistory: state.undoHistory.slice(0, -1),
        redoHistory: [...state.redoHistory, currentState]
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.redoHistory.length === 0) return state;

      const nextState = state.redoHistory[state.redoHistory.length - 1];
      const currentState = { nodes: state.nodes, edges: state.edges };

      return {
        nodes: nextState.nodes,
        edges: nextState.edges,
        undoHistory: [...state.undoHistory, currentState],
        redoHistory: state.redoHistory.slice(0, -1)
      };
    });
  },

  clearHistory: () => set({ undoHistory: [], redoHistory: [] }),

  addToHistory: async (nodes, edges) => {
    return new Promise<void>((resolve) => {
      set((state) => {
        const currentNodes = nodes || state.nodes;
        const currentEdges = edges || state.edges;

        if (!Array.isArray(currentNodes) || !Array.isArray(currentEdges)) {
          logger.warn('Invalid nodes or edges provided to addToHistory');
          resolve();
          return state;
        }

        const historyEntry: HistoryEntry = {
          nodes: [...currentNodes],
          edges: [...currentEdges],
          timestamp: Date.now(),
          id: randomUUID()
        };

        resolve();
        return {
          ...state,
          undoHistory: [...state.undoHistory.slice(-19), historyEntry],
          redoHistory: []
        };
      });
    });
  },
});
