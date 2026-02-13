/**
 * Collaboration Slice
 * Handles real-time collaboration state including collaborators, cursors, presence, and sync status
 */

import type { StateCreator } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export interface CollaboratorCursor {
  x: number;
  y: number;
  nodeId?: string;
  timestamp: number;
}

export interface CollaboratorPresence {
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
  activeNodeId?: string;
}

export interface Collaborator {
  id: string;
  email: string;
  name: string;
  color: string;
  permissions: string[];
  cursor?: CollaboratorCursor;
  presence?: CollaboratorPresence;
  addedAt: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'conflict' | 'error';

export interface SyncError {
  message: string;
  timestamp: number;
  retryCount: number;
}

export interface CollaborationSession {
  sessionId: string;
  workflowId: string;
  startedAt: number;
  participants: string[];
}

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface CollaborationState {
  // Collaborators
  collaborators: Collaborator[];
  currentUserId: string | null;

  // Sync status
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  syncError: SyncError | null;
  pendingChanges: number;

  // Session
  activeSession: CollaborationSession | null;

  // Lock state for editing
  lockedNodes: Record<string, string>; // nodeId -> collaboratorId
}

// ============================================================================
// ACTIONS INTERFACE
// ============================================================================

export interface CollaborationActions {
  // Collaborator management
  setCollaborators: (collaborators: Collaborator[]) => void;
  addCollaborator: (collaborator: Omit<Collaborator, 'addedAt'>) => void;
  removeCollaborator: (collaboratorId: string) => void;
  updateCollaborator: (collaboratorId: string, updates: Partial<Collaborator>) => void;

  // Cursor management
  updateCollaboratorCursor: (collaboratorId: string, cursor: CollaboratorCursor) => void;
  clearCollaboratorCursor: (collaboratorId: string) => void;

  // Presence management
  updateCollaboratorPresence: (collaboratorId: string, presence: CollaboratorPresence) => void;
  setCurrentUserId: (userId: string | null) => void;

  // Sync status
  setSyncStatus: (status: SyncStatus) => void;
  setSyncError: (error: SyncError | null) => void;
  updateLastSyncTime: () => void;
  incrementPendingChanges: () => void;
  resetPendingChanges: () => void;

  // Session management
  startCollaborationSession: (workflowId: string, participants: string[]) => string;
  endCollaborationSession: () => void;
  joinSession: (participantId: string) => void;
  leaveSession: (participantId: string) => void;

  // Node locking
  lockNode: (nodeId: string, collaboratorId: string) => boolean;
  unlockNode: (nodeId: string, collaboratorId: string) => boolean;
  forceUnlockNode: (nodeId: string) => void;
  isNodeLocked: (nodeId: string) => boolean;
  getNodeLockOwner: (nodeId: string) => string | null;
}

// ============================================================================
// COMBINED SLICE TYPE
// ============================================================================

export type CollaborationSlice = CollaborationState & CollaborationActions;

// ============================================================================
// UUID GENERATION
// ============================================================================

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

// ============================================================================
// COLOR GENERATION FOR COLLABORATORS
// ============================================================================

const collaboratorColors = [
  '#E53E3E', // red
  '#DD6B20', // orange
  '#38A169', // green
  '#3182CE', // blue
  '#805AD5', // purple
  '#D53F8C', // pink
  '#00B5D8', // cyan
  '#319795', // teal
];

const getCollaboratorColor = (index: number): string => {
  return collaboratorColors[index % collaboratorColors.length];
};

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createCollaborationSlice: StateCreator<
  CollaborationSlice,
  [],
  [],
  CollaborationSlice
> = (set, get) => ({
  // Initial state
  collaborators: [],
  currentUserId: null,
  syncStatus: 'synced',
  lastSyncTime: null,
  syncError: null,
  pendingChanges: 0,
  activeSession: null,
  lockedNodes: {},

  // Collaborator management
  setCollaborators: (collaborators) => set({ collaborators }),

  addCollaborator: (collaborator) => set((state) => {
    // Check if collaborator already exists
    if (state.collaborators.find(c => c.id === collaborator.id)) {
      return state;
    }

    const newCollaborator: Collaborator = {
      ...collaborator,
      color: collaborator.color || getCollaboratorColor(state.collaborators.length),
      addedAt: new Date().toISOString(),
    };

    return {
      collaborators: [...state.collaborators, newCollaborator],
    };
  }),

  removeCollaborator: (collaboratorId) => set((state) => {
    // Also unlock any nodes locked by this collaborator
    const newLockedNodes = { ...state.lockedNodes };
    Object.keys(newLockedNodes).forEach(nodeId => {
      if (newLockedNodes[nodeId] === collaboratorId) {
        delete newLockedNodes[nodeId];
      }
    });

    return {
      collaborators: state.collaborators.filter(c => c.id !== collaboratorId),
      lockedNodes: newLockedNodes,
    };
  }),

  updateCollaborator: (collaboratorId, updates) => set((state) => ({
    collaborators: state.collaborators.map(c =>
      c.id === collaboratorId ? { ...c, ...updates } : c
    ),
  })),

  // Cursor management
  updateCollaboratorCursor: (collaboratorId, cursor) => set((state) => ({
    collaborators: state.collaborators.map(c =>
      c.id === collaboratorId
        ? { ...c, cursor: { ...cursor, timestamp: Date.now() } }
        : c
    ),
  })),

  clearCollaboratorCursor: (collaboratorId) => set((state) => ({
    collaborators: state.collaborators.map(c =>
      c.id === collaboratorId ? { ...c, cursor: undefined } : c
    ),
  })),

  // Presence management
  updateCollaboratorPresence: (collaboratorId, presence) => set((state) => ({
    collaborators: state.collaborators.map(c =>
      c.id === collaboratorId ? { ...c, presence } : c
    ),
  })),

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  // Sync status
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  setSyncError: (syncError) => set({
    syncError,
    syncStatus: syncError ? 'error' : get().syncStatus,
  }),

  updateLastSyncTime: () => set({
    lastSyncTime: Date.now(),
    syncStatus: 'synced',
    pendingChanges: 0,
  }),

  incrementPendingChanges: () => set((state) => ({
    pendingChanges: state.pendingChanges + 1,
    syncStatus: 'syncing',
  })),

  resetPendingChanges: () => set({ pendingChanges: 0 }),

  // Session management
  startCollaborationSession: (workflowId, participants) => {
    const sessionId = randomUUID();
    set({
      activeSession: {
        sessionId,
        workflowId,
        startedAt: Date.now(),
        participants,
      },
    });
    return sessionId;
  },

  endCollaborationSession: () => set({
    activeSession: null,
    lockedNodes: {},
  }),

  joinSession: (participantId) => set((state) => {
    if (!state.activeSession) return state;

    if (state.activeSession.participants.includes(participantId)) {
      return state;
    }

    return {
      activeSession: {
        ...state.activeSession,
        participants: [...state.activeSession.participants, participantId],
      },
    };
  }),

  leaveSession: (participantId) => set((state) => {
    if (!state.activeSession) return state;

    // Unlock nodes locked by leaving participant
    const newLockedNodes = { ...state.lockedNodes };
    Object.keys(newLockedNodes).forEach(nodeId => {
      if (newLockedNodes[nodeId] === participantId) {
        delete newLockedNodes[nodeId];
      }
    });

    return {
      activeSession: {
        ...state.activeSession,
        participants: state.activeSession.participants.filter(p => p !== participantId),
      },
      lockedNodes: newLockedNodes,
    };
  }),

  // Node locking
  lockNode: (nodeId, collaboratorId) => {
    const state = get();

    // Check if already locked by someone else
    if (state.lockedNodes[nodeId] && state.lockedNodes[nodeId] !== collaboratorId) {
      return false;
    }

    set({
      lockedNodes: {
        ...state.lockedNodes,
        [nodeId]: collaboratorId,
      },
    });

    return true;
  },

  unlockNode: (nodeId, collaboratorId) => {
    const state = get();

    // Only the owner can unlock
    if (state.lockedNodes[nodeId] !== collaboratorId) {
      return false;
    }

    const newLockedNodes = { ...state.lockedNodes };
    delete newLockedNodes[nodeId];

    set({ lockedNodes: newLockedNodes });
    return true;
  },

  forceUnlockNode: (nodeId) => set((state) => {
    const newLockedNodes = { ...state.lockedNodes };
    delete newLockedNodes[nodeId];
    return { lockedNodes: newLockedNodes };
  }),

  isNodeLocked: (nodeId) => {
    return nodeId in get().lockedNodes;
  },

  getNodeLockOwner: (nodeId) => {
    return get().lockedNodes[nodeId] || null;
  },
});
