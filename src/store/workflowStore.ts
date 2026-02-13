/**
 * Workflow Store
 * Main Zustand store that combines all modular slices
 *
 * This store uses Zustand's slice pattern to maintain a modular architecture
 * while providing a single unified store interface for the application.
 *
 * Middleware Stack (F1.4):
 * - persist: LocalStorage persistence with SafeLocalStorage
 * - immer: Enables immutable updates with mutable syntax
 *
 * Slices:
 * - nodesSlice: Node CRUD operations, positions, groups, sticky notes
 * - edgesSlice: Edge CRUD operations, validation
 * - executionSlice: Workflow execution state, results, logs
 * - uiSlice: UI state (dark mode, debug mode, alerts)
 * - historySlice: Undo/redo functionality
 * - credentialsSlice: Credentials, environments
 * - workflowMetaSlice: Workflow metadata, templates, versioning
 * - multiSelectSlice: Multi-selection and bulk operations
 * - debugSlice: Debugging and breakpoints
 * - collaborationSlice: Collaborators, cursors, presence, sync status
 */

import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { logger } from '../services/SimpleLogger';
import {
  atomicLock,
  randomUUID,
  SafeLocalStorage,
  partializeState,
  onRehydrateStorage
} from './utils';

// Import all slice creators and types
import {
  createNodeSlice,
  createEdgesSlice,
  createExecutionSlice,
  createUISlice,
  createHistorySlice,
  createCredentialsSlice,
  createWorkflowMetaSlice,
  createMultiSelectSlice,
  createDebugSlice,
  createCollaborationSlice,
  type NodesSlice,
  type EdgesSlice,
  type ExecutionSlice,
  type UISlice,
  type HistorySlice,
  type CredentialsSlice,
  type WorkflowMetaSlice,
  type MultiSelectSlice,
  type DebugSlice,
  type CollaborationSlice,
  type Node,
  type Edge,
  type NodeGroup,
  type StickyNote
} from './slices';

// Re-export types for backwards compatibility
export type { Node, Edge, NodeGroup, StickyNote } from './slices';
export type {
  ExecutionResult,
  ExecutionError,
  ExecutionHistory,
  Alert,
  SystemMetrics,
  Credentials,
  Collaborator,
  ScheduledJob,
  WebhookEndpoint,
  WorkflowTemplate,
  WorkflowVersion,
  ValidationResult,
  TestResult,
  DebugSession,
  HistoryEntry
} from './slices';

// Re-export collaboration types
export type {
  CollaborationCollaborator,
  CollaboratorCursor,
  CollaboratorPresence,
  SyncStatus,
  SyncError,
  CollaborationSession
} from './slices';

// ============================================================================
// COMBINED STORE STATE TYPE
// ============================================================================
export interface WorkflowStoreState
  extends NodesSlice,
    EdgesSlice,
    ExecutionSlice,
    UISlice,
    HistorySlice,
    CredentialsSlice,
    WorkflowMetaSlice,
    MultiSelectSlice,
    DebugSlice,
    CollaborationSlice {
  // Additional cross-slice actions
  executeTransaction: (
    operations: Array<(state: WorkflowStoreState) => Partial<WorkflowStoreState>>
  ) => Promise<boolean>;
  resolveConflict: (
    remoteChanges: { nodes?: Node[]; edges?: Edge[] },
    strategy?: 'merge' | 'remote' | 'local'
  ) => void;

  // Tracking fields
  updateSequence?: number;
  lastExecutionUpdate?: number;
  lastBatchUpdate?: {
    batchId: string;
    timestamp: number;
    updateCount: number;
    invalidUpdateCount: number;
  };
  lastExecutionClear?: number;
  executionClearId?: string;
  lastHistoryAdd?: number;
  lastTransactionId?: string;
  lastTransactionTime?: number;
  lastHistoryUpdate?: number;
  executionStartTime?: number | null;
}

// ============================================================================
// COMBINED STORE CREATOR
// ============================================================================
const createCombinedStore: StateCreator<WorkflowStoreState, [], []> = (set, get, api) => {
  // Create all slices with their state creators
  const nodesSlice = createNodeSlice(
    set as Parameters<typeof createNodeSlice>[0],
    get as Parameters<typeof createNodeSlice>[1],
    api as Parameters<typeof createNodeSlice>[2]
  );

  const edgesSlice = createEdgesSlice(
    set as Parameters<typeof createEdgesSlice>[0],
    get as Parameters<typeof createEdgesSlice>[1],
    api as Parameters<typeof createEdgesSlice>[2]
  );

  const executionSlice = createExecutionSlice(
    set as Parameters<typeof createExecutionSlice>[0],
    get as Parameters<typeof createExecutionSlice>[1],
    api as Parameters<typeof createExecutionSlice>[2]
  );

  const uiSlice = createUISlice(
    set as Parameters<typeof createUISlice>[0],
    get as Parameters<typeof createUISlice>[1],
    api as Parameters<typeof createUISlice>[2]
  );

  const historySlice = createHistorySlice(
    set as Parameters<typeof createHistorySlice>[0],
    get as Parameters<typeof createHistorySlice>[1],
    api as Parameters<typeof createHistorySlice>[2]
  );

  const credentialsSlice = createCredentialsSlice(
    set as Parameters<typeof createCredentialsSlice>[0],
    get as Parameters<typeof createCredentialsSlice>[1],
    api as Parameters<typeof createCredentialsSlice>[2]
  );

  const workflowMetaSlice = createWorkflowMetaSlice(
    set as Parameters<typeof createWorkflowMetaSlice>[0],
    get as Parameters<typeof createWorkflowMetaSlice>[1],
    api as Parameters<typeof createWorkflowMetaSlice>[2]
  );

  const multiSelectSlice = createMultiSelectSlice(
    set as Parameters<typeof createMultiSelectSlice>[0],
    get as Parameters<typeof createMultiSelectSlice>[1],
    api as Parameters<typeof createMultiSelectSlice>[2]
  );

  const debugSlice = createDebugSlice(
    set as Parameters<typeof createDebugSlice>[0],
    get as Parameters<typeof createDebugSlice>[1],
    api as Parameters<typeof createDebugSlice>[2]
  );

  const collaborationSlice = createCollaborationSlice(
    set as Parameters<typeof createCollaborationSlice>[0],
    get as Parameters<typeof createCollaborationSlice>[1],
    api as Parameters<typeof createCollaborationSlice>[2]
  );

  return {
    // Spread all slice states and actions
    ...nodesSlice,
    ...edgesSlice,
    ...executionSlice,
    ...uiSlice,
    ...historySlice,
    ...credentialsSlice,
    ...workflowMetaSlice,
    ...multiSelectSlice,
    ...debugSlice,
    ...collaborationSlice,

    // Override setEdges to use history from historySlice
    setEdges: (edges: Edge[]) => {
      set({ edges });
    },

    // Cross-slice transaction support
    executeTransaction: async (operations) => {
      const release = await atomicLock.acquire('executeTransaction');
      try {
        return new Promise<boolean>((resolve, reject) => {
          set((currentState) => {
            const backup = {
              nodes: [...currentState.nodes],
              edges: [...currentState.edges],
              selectedNode: currentState.selectedNode,
              selectedEdge: currentState.selectedEdge,
              executionResults: { ...currentState.executionResults },
              nodeExecutionStatus: { ...currentState.nodeExecutionStatus },
              nodeExecutionData: { ...currentState.nodeExecutionData }
            };

            try {
              let transactionState = { ...currentState };

              for (const operation of operations) {
                const result = operation(transactionState as WorkflowStoreState);
                if (result && typeof result === 'object') {
                  transactionState = { ...transactionState, ...result };
                }
              }

              transactionState.lastTransactionId = randomUUID();
              transactionState.lastTransactionTime = Date.now();

              logger.info(`Transaction ${transactionState.lastTransactionId} completed successfully`);
              resolve(true);
              return transactionState as WorkflowStoreState;
            } catch (error) {
              logger.error('Transaction failed, rolling back:', error);
              reject(error);
              return backup as WorkflowStoreState;
            }
          });
        });
      } finally {
        release();
      }
    },

    // Cross-slice conflict resolution
    resolveConflict: (remoteChanges, strategy = 'merge') => {
      const localState = get();

      try {
        switch (strategy) {
          case 'merge': {
            const mergedNodes = [...localState.nodes];
            const mergedEdges = [...localState.edges];

            remoteChanges.nodes?.forEach(remoteNode => {
              if (!mergedNodes.find(n => n.id === remoteNode.id)) {
                mergedNodes.push(remoteNode);
              }
            });

            remoteChanges.edges?.forEach(remoteEdge => {
              if (!mergedEdges.find(e => e.id === remoteEdge.id)) {
                mergedEdges.push(remoteEdge);
              }
            });

            set({
              nodes: mergedNodes,
              edges: mergedEdges,
              isSaved: false
            });
            break;
          }

          case 'remote': {
            set({
              nodes: remoteChanges.nodes || localState.nodes,
              edges: remoteChanges.edges || localState.edges,
              isSaved: false
            });
            break;
          }

          case 'local':
            // Keep local changes (no-op)
            break;

          default:
            throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
        }
      } catch (error) {
        logger.error('Conflict resolution failed:', error);
        throw error;
      }
    },

    // Tracking fields
    updateSequence: 0,
    lastExecutionUpdate: undefined,
    lastBatchUpdate: undefined,
    lastExecutionClear: undefined,
    executionClearId: undefined,
    lastHistoryAdd: undefined,
    lastTransactionId: undefined,
    lastTransactionTime: undefined,
    lastHistoryUpdate: undefined,
    executionStartTime: null
  };
};

// ============================================================================
// CREATE THE STORE WITH PERSISTENCE AND IMMER
// ============================================================================
export const useWorkflowStore = create<WorkflowStoreState>()(
  persist(
    immer(createCombinedStore),
    {
      name: 'workflow-storage-v4',
      storage: createJSONStorage(() => new SafeLocalStorage('workflow-storage-v4')),
      partialize: partializeState,
      onRehydrateStorage
    }
  )
);

// ============================================================================
// RE-EXPORT HOOKS FOR BACKWARDS COMPATIBILITY
// Hooks are defined in ./hooks.ts for better organization
// ============================================================================
export {
  // Node selectors
  useNodes,
  useSelectedNode,
  useNodeGroups,
  useStickyNotes,
  // Edge selectors
  useEdges,
  useSelectedEdge,
  // Execution selectors
  useIsExecuting,
  useExecutionResults,
  useExecutionErrors,
  useCurrentExecutingNode,
  // UI selectors
  useDarkMode,
  useDebugMode,
  useAlerts,
  // Workflow meta selectors
  useWorkflows,
  useCurrentWorkflowId,
  useWorkflowName,
  useIsSaved,
  // History selectors
  useUndoHistory,
  useRedoHistory,
  useCanUndo,
  useCanRedo,
  // Multi-select selectors
  useSelectedNodes,
  // Credentials selectors
  useCredentials,
  useCurrentEnvironment,
  useGlobalVariables,
  // Debug selectors
  useBreakpoints,
  useDebugSession,
  // Collaboration selectors
  useCollaborators,
  useSyncStatus,
  useLockedNodes,
  useActiveSession,
  useCurrentUserId,
  // Action hooks
  useWorkflowActions
} from './hooks';

// Export default for convenience
export default useWorkflowStore;
