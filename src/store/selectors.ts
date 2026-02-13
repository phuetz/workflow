/**
 * Store Selectors
 * Optimized, memoized selectors for efficient state access
 */

import { useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { CombinedStoreState } from './slices';

// ============================================================================
// NODE SELECTORS
// ============================================================================

/**
 * Select a single node by ID
 */
export const selectNodeById = (state: CombinedStoreState, nodeId: string) =>
  state.nodes.find((n) => n.id === nodeId);

/**
 * Select nodes by type
 */
export const selectNodesByType = (state: CombinedStoreState, nodeType: string) =>
  state.nodes.filter((n) => n.data?.type === nodeType);

/**
 * Select trigger nodes
 */
export const selectTriggerNodes = (state: CombinedStoreState) => {
  const triggerTypes = ['trigger', 'webhook', 'schedule', 'manualTrigger'];
  return state.nodes.filter((n) => triggerTypes.includes(n.data?.type || ''));
};

/**
 * Select selected node
 */
export const selectSelectedNode = (state: CombinedStoreState) =>
  state.selectedNode ? state.nodes.find((n) => n.id === state.selectedNode) : null;

/**
 * Select node count
 */
export const selectNodeCount = (state: CombinedStoreState) => state.nodes.length;

/**
 * Select node IDs
 */
export const selectNodeIds = (state: CombinedStoreState) =>
  state.nodes.map((n) => n.id);

// ============================================================================
// EDGE SELECTORS
// ============================================================================

/**
 * Select edges connected to a node
 */
export const selectEdgesForNode = (state: CombinedStoreState, nodeId: string) =>
  state.edges.filter((e) => e.source === nodeId || e.target === nodeId);

/**
 * Select incoming edges for a node
 */
export const selectIncomingEdges = (state: CombinedStoreState, nodeId: string) =>
  state.edges.filter((e) => e.target === nodeId);

/**
 * Select outgoing edges for a node
 */
export const selectOutgoingEdges = (state: CombinedStoreState, nodeId: string) =>
  state.edges.filter((e) => e.source === nodeId);

/**
 * Select edge count
 */
export const selectEdgeCount = (state: CombinedStoreState) => state.edges.length;

// ============================================================================
// EXECUTION SELECTORS
// ============================================================================

/**
 * Select if workflow is currently executing
 */
export const selectIsExecuting = (state: CombinedStoreState) => state.isExecuting;

/**
 * Select current executing node
 */
export const selectCurrentExecutingNode = (state: CombinedStoreState) =>
  state.currentExecutingNode;

/**
 * Select node execution status
 */
export const selectNodeStatus = (state: CombinedStoreState, nodeId: string) =>
  state.nodeStatuses?.[nodeId];

/**
 * Select execution result
 */
export const selectExecutionResult = (state: CombinedStoreState) =>
  state.executionResult;

/**
 * Select execution logs
 */
export const selectExecutionLogs = (state: CombinedStoreState) =>
  state.executionLogs || [];

/**
 * Select execution history
 */
export const selectExecutionHistory = (state: CombinedStoreState) =>
  state.executionHistory || [];

// ============================================================================
// UI SELECTORS
// ============================================================================

/**
 * Select dark mode
 */
export const selectIsDarkMode = (state: CombinedStoreState) => state.isDarkMode;

/**
 * Select debug mode
 */
export const selectIsDebugMode = (state: CombinedStoreState) => state.isDebugMode;

/**
 * Select alerts
 */
export const selectAlerts = (state: CombinedStoreState) => state.alerts || [];

/**
 * Select active alerts count
 */
export const selectActiveAlertsCount = (state: CombinedStoreState) =>
  (state.alerts || []).length;

// ============================================================================
// WORKFLOW META SELECTORS
// ============================================================================

/**
 * Select workflow name
 */
export const selectWorkflowName = (state: CombinedStoreState) => state.workflowName;

/**
 * Select if workflow is saved
 */
export const selectIsSaved = (state: CombinedStoreState) => state.isSaved;

/**
 * Select last saved time
 */
export const selectLastSaved = (state: CombinedStoreState) => state.lastSaved;

/**
 * Select current workflow ID
 */
export const selectCurrentWorkflowId = (state: CombinedStoreState) =>
  state.currentWorkflowId;

/**
 * Select all workflows
 */
export const selectWorkflows = (state: CombinedStoreState) => state.workflows;

/**
 * Select workflow templates
 */
export const selectWorkflowTemplates = (state: CombinedStoreState) =>
  state.workflowTemplates;

// ============================================================================
// VALIDATION SELECTORS
// ============================================================================

/**
 * Select last validation result
 */
export const selectLastValidation = (state: CombinedStoreState) =>
  state.lastValidation;

/**
 * Select if validation is in progress
 */
export const selectIsValidating = (state: CombinedStoreState) => state.isValidating;

/**
 * Select validation errors
 */
export const selectValidationErrors = (state: CombinedStoreState) =>
  state.lastValidation?.errors || [];

/**
 * Select validation warnings
 */
export const selectValidationWarnings = (state: CombinedStoreState) =>
  state.lastValidation?.warnings || [];

/**
 * Select if workflow is valid
 */
export const selectIsWorkflowValid = (state: CombinedStoreState) =>
  state.lastValidation?.isValid ?? true;

// ============================================================================
// TESTING SELECTORS
// ============================================================================

/**
 * Select test cases
 */
export const selectTestCases = (state: CombinedStoreState) => state.testCases;

/**
 * Select current test run
 */
export const selectCurrentTestRun = (state: CombinedStoreState) =>
  state.currentTestRun;

/**
 * Select if test is running
 */
export const selectIsTestRunning = (state: CombinedStoreState) => state.isTestRunning;

/**
 * Select test runs history
 */
export const selectTestRuns = (state: CombinedStoreState) => state.testRuns;

// ============================================================================
// CREDENTIALS SELECTORS
// ============================================================================

/**
 * Select credentials
 */
export const selectCredentials = (state: CombinedStoreState) => state.credentials;

/**
 * Select current environment
 */
export const selectCurrentEnvironment = (state: CombinedStoreState) =>
  state.currentEnvironment;

/**
 * Select environments
 */
export const selectEnvironments = (state: CombinedStoreState) => state.environments;

// ============================================================================
// HISTORY SELECTORS
// ============================================================================

/**
 * Select if can undo
 */
export const selectCanUndo = (state: CombinedStoreState) =>
  (state.historyIndex ?? 0) > 0;

/**
 * Select if can redo
 */
export const selectCanRedo = (state: CombinedStoreState) =>
  (state.historyIndex ?? 0) < (state.history?.length ?? 0) - 1;

// ============================================================================
// MULTI-SELECT SELECTORS
// ============================================================================

/**
 * Select selected node IDs
 */
export const selectSelectedNodeIds = (state: CombinedStoreState) =>
  state.selectedNodeIds || [];

/**
 * Select selected edge IDs
 */
export const selectSelectedEdgeIds = (state: CombinedStoreState) =>
  state.selectedEdgeIds || [];

/**
 * Select if multi-select is active
 */
export const selectIsMultiSelectActive = (state: CombinedStoreState) =>
  (state.selectedNodeIds?.length || 0) > 1 || (state.selectedEdgeIds?.length || 0) > 1;

// ============================================================================
// DEBUG SELECTORS
// ============================================================================

/**
 * Select breakpoints
 */
export const selectBreakpoints = (state: CombinedStoreState) =>
  state.breakpoints || [];

/**
 * Select debug session
 */
export const selectDebugSession = (state: CombinedStoreState) => state.debugSession;

/**
 * Select if debugging
 */
export const selectIsDebugging = (state: CombinedStoreState) =>
  state.debugSession?.status === 'paused' || state.debugSession?.status === 'running';

// ============================================================================
// COLLABORATION SELECTORS
// ============================================================================

/**
 * Select all collaborators
 */
export const selectCollaborators = (state: CombinedStoreState) =>
  state.collaborators || [];

/**
 * Select collaborator by ID
 */
export const selectCollaboratorById = (state: CombinedStoreState, collaboratorId: string) =>
  state.collaborators?.find(c => c.id === collaboratorId);

/**
 * Select online collaborators
 */
export const selectOnlineCollaborators = (state: CombinedStoreState) =>
  (state.collaborators || []).filter(c => c.presence?.status === 'online');

/**
 * Select collaborator cursors
 */
export const selectCollaboratorCursors = (state: CombinedStoreState) =>
  (state.collaborators || [])
    .filter(c => c.cursor)
    .map(c => ({ id: c.id, name: c.name, color: c.color, cursor: c.cursor! }));

/**
 * Select sync status
 */
export const selectSyncStatus = (state: CombinedStoreState) => state.syncStatus;

/**
 * Select if syncing
 */
export const selectIsSyncing = (state: CombinedStoreState) =>
  state.syncStatus === 'syncing';

/**
 * Select sync error
 */
export const selectSyncError = (state: CombinedStoreState) => state.syncError;

/**
 * Select active collaboration session
 */
export const selectActiveSession = (state: CombinedStoreState) => state.activeSession;

/**
 * Select locked nodes
 */
export const selectLockedNodes = (state: CombinedStoreState) => state.lockedNodes || {};

/**
 * Select if node is locked
 */
export const selectIsNodeLocked = (state: CombinedStoreState, nodeId: string) =>
  nodeId in (state.lockedNodes || {});

/**
 * Select lock owner for node
 */
export const selectNodeLockOwner = (state: CombinedStoreState, nodeId: string) =>
  state.lockedNodes?.[nodeId] || null;

/**
 * Select current user ID
 */
export const selectCurrentUserId = (state: CombinedStoreState) => state.currentUserId;

/**
 * Select pending changes count
 */
export const selectPendingChanges = (state: CombinedStoreState) => state.pendingChanges || 0;

// ============================================================================
// COMPOSITE SELECTORS
// ============================================================================

/**
 * Select workflow stats
 */
export const selectWorkflowStats = (state: CombinedStoreState) => ({
  nodeCount: state.nodes.length,
  edgeCount: state.edges.length,
  triggerCount: selectTriggerNodes(state).length,
  isSaved: state.isSaved,
  isValid: state.lastValidation?.isValid ?? true,
  errorCount: state.lastValidation?.errors.length ?? 0,
  warningCount: state.lastValidation?.warnings.length ?? 0,
});

/**
 * Select execution stats
 */
export const selectExecutionStats = (state: CombinedStoreState) => ({
  isExecuting: state.isExecuting,
  currentNode: state.currentExecutingNode,
  logsCount: (state.executionLogs || []).length,
  historyCount: (state.executionHistory || []).length,
});

/**
 * Select collaboration stats
 */
export const selectCollaborationStats = (state: CombinedStoreState) => ({
  totalCollaborators: (state.collaborators || []).length,
  onlineCollaborators: selectOnlineCollaborators(state).length,
  lockedNodesCount: Object.keys(state.lockedNodes || {}).length,
  syncStatus: state.syncStatus,
  pendingChanges: state.pendingChanges || 0,
  hasActiveSession: !!state.activeSession,
});

// ============================================================================
// HOOK CREATORS
// ============================================================================

/**
 * Create a shallow selector hook for multiple state properties
 * @example
 * const { nodes, edges } = useShallowSelector(state => ({
 *   nodes: state.nodes,
 *   edges: state.edges
 * }));
 */
export function createShallowSelector<T>(
  selector: (state: CombinedStoreState) => T
) {
  return (store: { getState: () => CombinedStoreState }) => {
    const state = store.getState();
    return selector(state);
  };
}

/**
 * Create a memoized selector
 */
export function createMemoizedSelector<T, Args extends unknown[]>(
  selector: (state: CombinedStoreState, ...args: Args) => T,
  deps: (state: CombinedStoreState, ...args: Args) => unknown[]
) {
  let lastDeps: unknown[] | null = null;
  let lastResult: T;

  return (state: CombinedStoreState, ...args: Args): T => {
    const currentDeps = deps(state, ...args);

    if (
      lastDeps &&
      currentDeps.length === lastDeps.length &&
      currentDeps.every((dep, i) => dep === lastDeps![i])
    ) {
      return lastResult;
    }

    lastDeps = currentDeps;
    lastResult = selector(state, ...args);
    return lastResult;
  };
}
