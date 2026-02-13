/**
 * Store Slices - Barrel Export
 * Exports all Zustand store slices for modular state management
 */

// ============================================================================
// NODES SLICE
// Handles node CRUD operations, node positions, node data updates, groups, sticky notes
// ============================================================================
export { createNodeSlice } from './nodeSlice';
export type {
  Node,
  NodeGroup,
  StickyNote,
  NodesState,
  NodesActions,
  NodesSlice,
  NodeSlice // backwards compatibility
} from './nodeSlice';

// ============================================================================
// EDGES SLICE
// Handles edge CRUD operations and edge validation
// ============================================================================
export { createEdgesSlice } from './edgesSlice';
export type {
  Edge,
  EdgeValidationResult,
  EdgesState,
  EdgesActions,
  EdgesSlice
} from './edgesSlice';

// ============================================================================
// EXECUTION SLICE
// Handles workflow execution state, results, errors, logs
// ============================================================================
export { createExecutionSlice } from './executionSlice';
export type {
  ExecutionResult,
  ExecutionError,
  ExecutionHistory,
  ExecutionSlice
} from './executionSlice';

// ============================================================================
// UI SLICE
// Handles UI state (dark mode, debug mode, alerts, system metrics)
// ============================================================================
export { createUISlice } from './uiSlice';
export type {
  Alert,
  SystemMetrics,
  UISlice
} from './uiSlice';

// ============================================================================
// HISTORY SLICE
// Handles undo/redo functionality
// ============================================================================
export { createHistorySlice } from './historySlice';
export type {
  HistoryEntry,
  HistoryState,
  HistoryActions,
  HistorySlice
} from './historySlice';

// ============================================================================
// CREDENTIALS SLICE
// Handles credentials, environments, collaborators, webhooks, scheduled jobs
// ============================================================================
export { createCredentialsSlice } from './credentialsSlice';
export type {
  Credentials,
  Collaborator,
  ScheduledJob,
  WebhookEndpoint,
  CredentialsSlice
} from './credentialsSlice';

// ============================================================================
// WORKFLOW SLICE - DEPRECATED (F1.3)
// @deprecated Use workflowMetaSlice instead. This slice is NOT used in workflowStore.
// Kept only for backwards compatibility with external imports.
// ============================================================================
/** @deprecated Use createWorkflowMetaSlice instead */
export { createWorkflowSlice } from './workflowSlice';
/** @deprecated Use Workflow from workflowMetaSlice instead */
export type {
  Workflow,
  WorkflowSlice
} from './workflowSlice';

// ============================================================================
// WORKFLOW META SLICE
// Handles workflow metadata, templates, versioning, validation, testing
// ============================================================================
export { createWorkflowMetaSlice } from './workflowMetaSlice';
export type {
  WorkflowTemplate,
  WorkflowVersion,
  Workflow as WorkflowMeta,
  ValidationResult,
  TestResult,
  WorkflowMetaState,
  WorkflowMetaActions,
  WorkflowMetaSlice
} from './workflowMetaSlice';

// ============================================================================
// MULTI-SELECT SLICE
// Handles multi-selection and bulk operations
// ============================================================================
export { createMultiSelectSlice } from './multiSelectSlice';
export type {
  MultiSelectState,
  MultiSelectActions,
  MultiSelectSlice
} from './multiSelectSlice';

// ============================================================================
// DEBUG SLICE
// Handles debugging and breakpoint functionality
// ============================================================================
export { createDebugSlice } from './debugSlice';
export type {
  DebugSession,
  DebugState,
  DebugActions,
  DebugSlice
} from './debugSlice';

// ============================================================================
// COLLABORATION SLICE
// Handles real-time collaboration, cursors, presence, and sync status
// ============================================================================
export { createCollaborationSlice } from './collaborationSlice';
export type {
  Collaborator as CollaborationCollaborator,
  CollaboratorCursor,
  CollaboratorPresence,
  SyncStatus,
  SyncError,
  CollaborationSession,
  CollaborationState,
  CollaborationActions,
  CollaborationSlice
} from './collaborationSlice';

// ============================================================================
// VALIDATION SLICE
// Handles workflow validation with detailed error reporting
// ============================================================================
export { createValidationSlice } from './validationSlice';
export type {
  ValidationIssue,
  ValidationResult,
  ValidationState,
  ValidationActions,
  ValidationSlice,
  ValidationRuleConfig
} from './validationSlice';

// ============================================================================
// TESTING SLICE
// Handles workflow testing, dry runs, and test data management
// ============================================================================
export { createTestingSlice } from './testingSlice';
export type {
  TestCase,
  TestAssertion,
  TestRun,
  NodeTestResult,
  TestSummary,
  TestResult,
  TestingState,
  TestingActions,
  TestingSlice,
  TestConfig
} from './testingSlice';

// ============================================================================
// COMBINED STORE TYPE
// Type representing the combined store with all slices
// ============================================================================
export type CombinedStoreState =
  & NodesSlice
  & EdgesSlice
  & ExecutionSlice
  & UISlice
  & HistorySlice
  & CredentialsSlice
  & WorkflowMetaSlice
  & MultiSelectSlice
  & DebugSlice
  & CollaborationSlice
  & ValidationSlice
  & TestingSlice;
