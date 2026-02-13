/**
 * Editor Hooks
 * Export all editor-related hooks
 */

// Existing hooks
export { useProcessedNodes, useSelectedNodeIds } from './useProcessedNodes';
export { useProcessedEdges } from './useProcessedEdges';
export { useWorkflowExecution } from './useWorkflowExecution';
export { useAutoLayout } from './useAutoLayout';

// New extracted hooks from ModernWorkflowEditor
export {
  useWorkflowState,
  type UseWorkflowStateReturn,
  type UseWorkflowStateOptions,
  type ViewMode,
  type ConnectionStyleType,
  type ContextMenuState,
  type DataPreviewState,
  type PinDataPanelState,
  type ClipboardState,
  type QuickSearchPosition,
  type N8nNodePanelPosition,
  type WorkflowExecutionResultState,
  type WorkflowExecutionErrorState,
} from './useWorkflowState';

export {
  useWorkflowActions,
  type UseWorkflowActionsOptions,
  type UseWorkflowActionsReturn,
  type ClipboardData,
} from './useWorkflowActions';

// Original useWorkflowEvents (661 lines - for backwards compatibility)
export {
  useWorkflowEvents,
  type UseWorkflowEventsOptions,
  type UseWorkflowEventsReturn,
  type ContextMenuState as EventContextMenuState,
} from './useWorkflowEvents';

// Refactored modular event hooks
export * from './events';

// Refactored useWorkflowEvents (uses modular hooks)
export { useWorkflowEvents as useWorkflowEventsRefactored } from './useWorkflowEventsRefactored';
