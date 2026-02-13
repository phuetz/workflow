import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workflow, Execution, User, AuthState, AppSettings, DashboardStats } from '../types';

interface AppState {
  // Auth
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;
  logout: () => Promise<void>;

  // Workflows
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;

  // Executions
  executions: Execution[];
  setExecutions: (executions: Execution[]) => void;
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;
  deleteExecution: (id: string) => void;

  // UI State
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Stats
  stats: DashboardStats | null;
  setStats: (stats: DashboardStats) => void;

  // Network
  isOnline: boolean;
  setIsOnline: (isOnline: boolean) => void;
  syncQueueLength: number;
  setSyncQueueLength: (length: number) => void;

  // Hydration
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  notifications: {
    enabled: true,
    executionComplete: true,
    executionFailed: true,
    workflowUpdated: true,
  },
  biometricAuth: false,
  offlineMode: true,
  syncInterval: 15,
  autoExecute: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  auth: {
    isAuthenticated: false,
  },
  setAuth: (auth) =>
    set((state) => ({
      auth: { ...state.auth, ...auth },
    })),
  logout: async () => {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user']);
    set({
      auth: { isAuthenticated: false },
      workflows: [],
      executions: [],
    });
  },

  // Workflows
  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),
  addWorkflow: (workflow) =>
    set((state) => ({
      workflows: [workflow, ...state.workflows],
    })),
  updateWorkflow: (id, updates) =>
    set((state) => ({
      workflows: state.workflows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),
  deleteWorkflow: (id) =>
    set((state) => ({
      workflows: state.workflows.filter((w) => w.id !== id),
    })),

  // Executions
  executions: [],
  setExecutions: (executions) => set({ executions }),
  addExecution: (execution) =>
    set((state) => ({
      executions: [execution, ...state.executions],
    })),
  updateExecution: (id, updates) =>
    set((state) => ({
      executions: state.executions.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  deleteExecution: (id) =>
    set((state) => ({
      executions: state.executions.filter((e) => e.id !== id),
    })),

  // UI State
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),

  // Settings
  settings: defaultSettings,
  updateSettings: (updates) =>
    set((state) => ({
      settings: { ...state.settings, ...updates },
    })),

  // Stats
  stats: null,
  setStats: (stats) => set({ stats }),

  // Network
  isOnline: true,
  setIsOnline: (isOnline) => set({ isOnline }),
  syncQueueLength: 0,
  setSyncQueueLength: (syncQueueLength) => set({ syncQueueLength }),

  // Hydration
  hydrated: false,
  setHydrated: (hydrated) => set({ hydrated }),
}));

// Persist auth state
export const persistAuthState = async (auth: AuthState) => {
  try {
    await AsyncStorage.setItem('auth_state', JSON.stringify(auth));
  } catch (error) {
    console.error('Error persisting auth state:', error);
  }
};

export const hydrateAuthState = async (): Promise<AuthState | null> => {
  try {
    const authStr = await AsyncStorage.getItem('auth_state');
    return authStr ? JSON.parse(authStr) : null;
  } catch (error) {
    console.error('Error hydrating auth state:', error);
    return null;
  }
};

// Persist settings
export const persistSettings = async (settings: AppSettings) => {
  try {
    await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error persisting settings:', error);
  }
};

export const hydrateSettings = async (): Promise<AppSettings | null> => {
  try {
    const settingsStr = await AsyncStorage.getItem('app_settings');
    return settingsStr ? JSON.parse(settingsStr) : null;
  } catch (error) {
    console.error('Error hydrating settings:', error);
    return null;
  }
};
