/**
 * Playbook Module - Barrel Export
 * Re-exports all playbook-related modules for clean imports
 *
 * @module playbook
 */

// Types
export type {
  SeverityLevel,
  ApprovalMode,
  PlaybookState,
  ActionStatus,
  EventType,
  VariableContext,
  TriggerCondition,
  PlaybookAction,
  ConditionalBranch,
  PlaybookVersion,
  PlaybookMetadata,
  PlaybookDefinition,
  ActionExecutionResult,
  ApprovalRecord,
  ExecutionRecord,
  EffectivenessMetrics,
  ActionHandler
} from './types';

// Classes
export { ActionHandlers } from './ActionHandlers';
export { ConditionEvaluator } from './ConditionEvaluator';
export { PlaybookExecutor } from './PlaybookExecutor';
export { PlaybookStore } from './PlaybookStore';

// Pre-built playbooks
export {
  createBruteForcePlaybook,
  createMalwareDetectionPlaybook,
  createDataExfiltrationPlaybook,
  createPrivilegeEscalationPlaybook,
  createRansomwarePlaybook,
  createPhishingPlaybook,
  createDDoSPlaybook,
  createInsiderThreatPlaybook,
  createAPIAbusePlaybook,
  createCredentialCompromisePlaybook,
  getAllPreBuiltPlaybooks
} from './PreBuiltPlaybooks';
