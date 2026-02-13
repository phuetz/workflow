/**
 * Response Playbook Engine
 * Comprehensive incident response automation with 10+ pre-built playbooks
 *
 * This is the main orchestrator that delegates to specialized modules:
 * - PlaybookStore: Storage and CRUD operations
 * - PlaybookExecutor: Execution logic with retry and rollback
 * - ActionHandlers: Notification, blocking, remediation handlers
 * - ConditionEvaluator: Secure condition evaluation
 * - PreBuiltPlaybooks: 10 pre-built security playbooks
 *
 * @module PlaybookEngine
 * @author Claude Code
 * @version 3.0.0
 */

import { PlaybookStore } from './playbook/PlaybookStore';
import { PlaybookExecutor } from './playbook/PlaybookExecutor';
import { getAllPreBuiltPlaybooks } from './playbook/PreBuiltPlaybooks';
import type {
  PlaybookDefinition,
  PlaybookState,
  SeverityLevel,
  ExecutionRecord,
  EffectivenessMetrics,
  PlaybookVersion,
  ActionHandler
} from './playbook/types';

// Re-export types for backward compatibility
export type {
  PlaybookDefinition,
  ExecutionRecord,
  ActionExecutionResult,
  VariableContext,
  SeverityLevel,
  PlaybookState,
  ApprovalMode,
  ActionStatus,
  EventType
} from './playbook/types';

/**
 * PlaybookEngine
 *
 * Core engine for managing and executing incident response playbooks.
 * Supports 10+ pre-built playbooks with customizable triggers, actions,
 * approvals, and scheduling.
 *
 * @class PlaybookEngine
 */
export class PlaybookEngine {
  private store: PlaybookStore;
  private executor: PlaybookExecutor;

  /**
   * Initialize the PlaybookEngine
   */
  constructor() {
    this.store = new PlaybookStore();
    this.executor = new PlaybookExecutor();
    this.loadPreBuiltPlaybooks();
  }

  /**
   * Load and register pre-built playbooks
   */
  private loadPreBuiltPlaybooks(): void {
    const playbooks = getAllPreBuiltPlaybooks();
    for (const playbook of playbooks) {
      this.store.registerPlaybook(playbook);
    }
  }

  // ================================
  // PLAYBOOK CRUD OPERATIONS
  // ================================

  /**
   * Register a playbook in the engine
   */
  public registerPlaybook(playbook: PlaybookDefinition): void {
    this.store.registerPlaybook(playbook);
  }

  /**
   * Update a playbook and maintain version history
   */
  public updatePlaybook(
    playbookId: string,
    updates: Partial<PlaybookDefinition>,
    author: string,
    changeDescription: string
  ): PlaybookDefinition {
    return this.store.updatePlaybook(playbookId, updates, author, changeDescription);
  }

  /**
   * Get a playbook by ID
   */
  public getPlaybook(playbookId: string): PlaybookDefinition | undefined {
    return this.store.getPlaybook(playbookId);
  }

  /**
   * List all playbooks with optional filtering
   */
  public listPlaybooks(
    state?: PlaybookState,
    severity?: SeverityLevel,
    category?: string
  ): PlaybookDefinition[] {
    return this.store.listPlaybooks(state, severity, category);
  }

  /**
   * Delete a playbook
   */
  public deletePlaybook(playbookId: string): boolean {
    return this.store.deletePlaybook(playbookId);
  }

  // ================================
  // EXECUTION OPERATIONS
  // ================================

  /**
   * Execute a playbook with given event context
   */
  public async executePlaybook(
    playbookId: string,
    eventData: Record<string, unknown>,
    triggeredBy: string = 'system'
  ): Promise<ExecutionRecord> {
    const playbook = this.store.getPlaybook(playbookId);
    if (!playbook) throw new Error(`Playbook ${playbookId} not found`);
    if (playbook.metadata.state !== 'active') throw new Error(`Playbook is ${playbook.metadata.state}`);

    const execution = await this.executor.execute(playbook, eventData, triggeredBy);

    // Store execution record
    this.store.storeExecution(execution);

    // Update metrics
    this.store.updateMetrics(playbookId, execution);

    return execution;
  }

  /**
   * Get execution by ID
   */
  public getExecution(executionId: string): ExecutionRecord | undefined {
    return this.store.getExecution(executionId);
  }

  /**
   * Get execution history for a playbook
   */
  public getExecutionHistory(playbookId: string, limit: number = 100): ExecutionRecord[] {
    return this.store.getExecutionHistory(playbookId, limit);
  }

  /**
   * Get all executions with optional status filter
   */
  public getAllExecutions(status?: ExecutionRecord['status']): ExecutionRecord[] {
    return this.store.getAllExecutions(status);
  }

  // ================================
  // VERSION OPERATIONS
  // ================================

  /**
   * Get version history for a playbook
   */
  public getVersionHistory(playbookId: string): PlaybookVersion[] {
    return this.store.getVersionHistory(playbookId);
  }

  /**
   * Get a specific version of a playbook
   */
  public getPlaybookVersion(playbookId: string, version: number): PlaybookVersion | undefined {
    return this.store.getPlaybookVersion(playbookId, version);
  }

  // ================================
  // METRICS OPERATIONS
  // ================================

  /**
   * Get metrics for a playbook
   */
  public getMetrics(playbookId: string): EffectivenessMetrics | undefined {
    return this.store.getMetrics(playbookId);
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): EffectivenessMetrics[] {
    return this.store.getAllMetrics();
  }

  // ================================
  // EXTENSIBILITY
  // ================================

  /**
   * Register a custom action handler
   */
  public registerActionHandler(actionType: string, handler: ActionHandler): void {
    this.executor.getActionHandlers().registerHandler(actionType, handler);
  }

  // ================================
  // UTILITY OPERATIONS
  // ================================

  /**
   * Get playbook count
   */
  public getPlaybookCount(): number {
    return this.store.getPlaybookCount();
  }

  /**
   * Get execution count
   */
  public getExecutionCount(): number {
    return this.store.getExecutionCount();
  }

  /**
   * Export all data as JSON
   */
  public exportData(): {
    playbooks: PlaybookDefinition[];
    executions: ExecutionRecord[];
    versions: Record<string, PlaybookVersion[]>;
    metrics: EffectivenessMetrics[];
  } {
    return this.store.exportData();
  }

  /**
   * Import playbooks from JSON
   */
  public importPlaybooks(playbooks: PlaybookDefinition[]): void {
    for (const playbook of playbooks) {
      this.store.registerPlaybook(playbook);
    }
  }

  /**
   * Clear all data (for testing)
   */
  public clear(): void {
    this.store.clear();
  }

  /**
   * Reload pre-built playbooks
   */
  public reloadPreBuiltPlaybooks(): void {
    this.loadPreBuiltPlaybooks();
  }

  /**
   * Check if a playbook exists
   */
  public hasPlaybook(playbookId: string): boolean {
    return this.store.getPlaybook(playbookId) !== undefined;
  }

  /**
   * Get playbook IDs
   */
  public getPlaybookIds(): string[] {
    return this.listPlaybooks().map((pb) => pb.metadata.id);
  }

  /**
   * Validate a playbook definition
   */
  public validatePlaybook(playbook: PlaybookDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!playbook.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!playbook.metadata.id) errors.push('Missing metadata.id');
      if (!playbook.metadata.name) errors.push('Missing metadata.name');
      if (!playbook.metadata.severity) errors.push('Missing metadata.severity');
    }

    if (!playbook.triggers || playbook.triggers.length === 0) {
      errors.push('At least one trigger is required');
    }

    if (!playbook.actions || playbook.actions.length === 0) {
      errors.push('At least one action is required');
    } else {
      const actionIds = new Set<string>();
      for (const action of playbook.actions) {
        if (!action.id) errors.push('Action missing id');
        if (!action.type) errors.push(`Action ${action.id} missing type`);
        if (!action.service) errors.push(`Action ${action.id} missing service`);
        if (actionIds.has(action.id)) errors.push(`Duplicate action id: ${action.id}`);
        actionIds.add(action.id);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clone a playbook with a new ID
   */
  public clonePlaybook(playbookId: string, newId: string, author: string): PlaybookDefinition {
    const original = this.store.getPlaybook(playbookId);
    if (!original) throw new Error(`Playbook ${playbookId} not found`);

    const cloned: PlaybookDefinition = {
      ...original,
      metadata: {
        ...original.metadata,
        id: newId,
        name: `${original.metadata.name} (Copy)`,
        version: 1,
        state: 'draft',
        author,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    };

    this.store.registerPlaybook(cloned);
    return cloned;
  }

  /** Enable a playbook */
  public enablePlaybook(playbookId: string, author: string): PlaybookDefinition {
    const pb = this.store.getPlaybook(playbookId)!;
    return this.store.updatePlaybook(playbookId, { metadata: { ...pb.metadata, state: 'active' } }, author, 'Enabled');
  }

  /** Disable a playbook */
  public disablePlaybook(playbookId: string, author: string): PlaybookDefinition {
    const pb = this.store.getPlaybook(playbookId)!;
    return this.store.updatePlaybook(playbookId, { metadata: { ...pb.metadata, state: 'disabled' } }, author, 'Disabled');
  }

  /** Archive a playbook */
  public archivePlaybook(playbookId: string, author: string): PlaybookDefinition {
    const pb = this.store.getPlaybook(playbookId)!;
    return this.store.updatePlaybook(playbookId, { metadata: { ...pb.metadata, state: 'archived' } }, author, 'Archived');
  }

  /** Get playbooks by category */
  public getPlaybooksByCategory(category: string): PlaybookDefinition[] {
    return this.store.listPlaybooks(undefined, undefined, category);
  }

  /** Get playbooks by severity */
  public getPlaybooksBySeverity(severity: SeverityLevel): PlaybookDefinition[] {
    return this.store.listPlaybooks(undefined, severity, undefined);
  }

  /** Search playbooks by name, description, or tags */
  public searchPlaybooks(query: string): PlaybookDefinition[] {
    const q = query.toLowerCase();
    return this.listPlaybooks().filter((pb) =>
      pb.metadata.name.toLowerCase().includes(q) ||
      pb.metadata.description.toLowerCase().includes(q) ||
      pb.metadata.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
}
