/**
 * Debug Slice
 * Handles debugging and breakpoint functionality
 */

import type { StateCreator } from 'zustand';
import { logger } from '../../services/SimpleLogger';

export interface DebugSession {
  id: string;
  startedAt: string;
  status: 'running' | 'paused' | 'stopped';
  currentNode: string | null;
}

export interface DebugState {
  breakpoints: Record<string, boolean>;
  debugSession: DebugSession | null;
  currentDebugNode: string | null;
  testSessions: Record<string, {
    id: string;
    name: string;
    testData: unknown;
    results: unknown[];
  }>;
  expressions: Record<string, string>;
  customFunctions: Record<string, string>;
}

export interface DebugActions {
  addBreakpoint: (nodeId: string) => void;
  removeBreakpoint: (nodeId: string) => void;
  debugStep: () => void;
  debugContinue: () => void;
  debugStop: () => void;
}

export type DebugSlice = DebugState & DebugActions;

export const createDebugSlice: StateCreator<
  DebugSlice,
  [],
  [],
  DebugSlice
> = (set) => ({
  // Initial state
  breakpoints: {},
  debugSession: null,
  currentDebugNode: null,
  testSessions: {},
  expressions: {},
  customFunctions: {},

  // Actions
  addBreakpoint: (nodeId) => set((state) => ({
    breakpoints: { ...state.breakpoints, [nodeId]: true }
  })),

  removeBreakpoint: (nodeId) => set((state) => {
    const newBreakpoints = { ...state.breakpoints };
    delete newBreakpoints[nodeId];
    return { breakpoints: newBreakpoints };
  }),

  debugStep: () => {
    logger.info('Debug step');
  },

  debugContinue: () => {
    logger.info('Debug continue');
  },

  debugStop: () => set({
    debugSession: null,
    currentDebugNode: null
  }),
});
