import { StateCreator } from 'zustand';

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  uptime: number;
  requestCount: number;
  errorCount: number;
  lastBackup: string | null;
}

export interface UISlice {
  // State
  darkMode: boolean;
  debugMode: boolean;
  stepByStep: boolean;
  alerts: Alert[];
  systemMetrics: SystemMetrics;
  // NOTE: debugSession, currentDebugNode moved to debugSlice (F1.3)

  // Actions
  toggleDarkMode: () => void;
  toggleDebugMode: () => void;
  toggleStepByStep: () => void;
  // NOTE: debugStep, debugContinue, debugStop moved to debugSlice (F1.3)
}

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set) => ({
  // Initial state
  darkMode: false,
  debugMode: false,
  stepByStep: false,
  alerts: [],
  systemMetrics: {
    cpu: 0,
    memory: 0,
    uptime: 0,
    requestCount: 0,
    errorCount: 0,
    lastBackup: null,
  },
  // NOTE: debugSession, currentDebugNode moved to debugSlice (F1.3)

  // Actions
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),

  toggleStepByStep: () => set((state) => ({ stepByStep: !state.stepByStep })),
  // NOTE: debugStep, debugContinue, debugStop moved to debugSlice (F1.3)
});
