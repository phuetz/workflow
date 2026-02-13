/**
 * Store Hooks
 * Convenience hooks for accessing store state and actions
 */

import { useWorkflowStore } from './workflowStore';

// ============================================================================
// SELECTOR HOOKS FOR PERFORMANCE OPTIMIZATION
// ============================================================================

// Node selectors
export const useNodes = () => useWorkflowStore((state) => state.nodes);
export const useSelectedNode = () => useWorkflowStore((state) => state.selectedNode);
export const useNodeGroups = () => useWorkflowStore((state) => state.nodeGroups);
export const useStickyNotes = () => useWorkflowStore((state) => state.stickyNotes);

// Edge selectors
export const useEdges = () => useWorkflowStore((state) => state.edges);
export const useSelectedEdge = () => useWorkflowStore((state) => state.selectedEdge);

// Execution selectors
export const useIsExecuting = () => useWorkflowStore((state) => state.isExecuting);
export const useExecutionResults = () => useWorkflowStore((state) => state.executionResults);
export const useExecutionErrors = () => useWorkflowStore((state) => state.executionErrors);
export const useCurrentExecutingNode = () => useWorkflowStore((state) => state.currentExecutingNode);

// UI selectors
export const useDarkMode = () => useWorkflowStore((state) => state.darkMode);
export const useDebugMode = () => useWorkflowStore((state) => state.debugMode);
export const useAlerts = () => useWorkflowStore((state) => state.alerts);

// Workflow meta selectors
export const useWorkflows = () => useWorkflowStore((state) => state.workflows);
export const useCurrentWorkflowId = () => useWorkflowStore((state) => state.currentWorkflowId);
export const useWorkflowName = () => useWorkflowStore((state) => state.workflowName);
export const useIsSaved = () => useWorkflowStore((state) => state.isSaved);

// History selectors
export const useUndoHistory = () => useWorkflowStore((state) => state.undoHistory);
export const useRedoHistory = () => useWorkflowStore((state) => state.redoHistory);
export const useCanUndo = () => useWorkflowStore((state) => state.undoHistory.length > 0);
export const useCanRedo = () => useWorkflowStore((state) => state.redoHistory.length > 0);

// Multi-select selectors
export const useSelectedNodes = () => useWorkflowStore((state) => state.selectedNodes);

// Credentials selectors
export const useCredentials = () => useWorkflowStore((state) => state.credentials);
export const useCurrentEnvironment = () => useWorkflowStore((state) => state.currentEnvironment);
export const useGlobalVariables = () => useWorkflowStore((state) => state.globalVariables);

// Debug selectors
export const useBreakpoints = () => useWorkflowStore((state) => state.breakpoints);
export const useDebugSession = () => useWorkflowStore((state) => state.debugSession);

// Collaboration selectors
export const useCollaborators = () => useWorkflowStore((state) => state.collaborators);
export const useSyncStatus = () => useWorkflowStore((state) => state.syncStatus);
export const useLockedNodes = () => useWorkflowStore((state) => state.lockedNodes);
export const useActiveSession = () => useWorkflowStore((state) => state.activeSession);
export const useCurrentUserId = () => useWorkflowStore((state) => state.currentUserId);

// ============================================================================
// ACTION HOOKS FOR CONVENIENCE
// ============================================================================
export const useWorkflowActions = () => useWorkflowStore((state) => ({
  // Node actions
  setNodes: state.setNodes,
  addNode: state.addNode,
  updateNode: state.updateNode,
  deleteNode: state.deleteNode,
  duplicateNode: state.duplicateNode,
  setSelectedNode: state.setSelectedNode,
  updateNodeConfig: state.updateNodeConfig,
  updateNodePosition: state.updateNodePosition,

  // Edge actions
  setEdges: state.setEdges,
  addEdge: state.addEdge,
  updateEdge: state.updateEdge,
  deleteEdge: state.deleteEdge,
  setSelectedEdge: state.setSelectedEdge,

  // Execution actions
  setIsExecuting: state.setIsExecuting,
  setExecutionResult: state.setExecutionResult,
  setExecutionError: state.setExecutionError,
  clearExecution: state.clearExecution,

  // Workflow meta actions
  saveWorkflow: state.saveWorkflow,
  loadWorkflow: state.loadWorkflow,
  exportWorkflow: state.exportWorkflow,
  importWorkflow: state.importWorkflow,
  validateWorkflow: state.validateWorkflow,
  testWorkflow: state.testWorkflow,

  // History actions
  undo: state.undo,
  redo: state.redo,
  addToHistory: state.addToHistory,

  // UI actions
  toggleDarkMode: state.toggleDarkMode,
  toggleDebugMode: state.toggleDebugMode,

  // Collaboration actions
  setCollaborators: state.setCollaborators,
  addCollaborator: state.addCollaborator,
  removeCollaborator: state.removeCollaborator,
  updateCollaboratorCursor: state.updateCollaboratorCursor,
  setSyncStatus: state.setSyncStatus,
  lockNode: state.lockNode,
  unlockNode: state.unlockNode,
  startCollaborationSession: state.startCollaborationSession,
  endCollaborationSession: state.endCollaborationSession
}));
