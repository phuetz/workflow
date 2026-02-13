/**
 * Playbook Store
 * Storage and CRUD operations for playbooks, executions, versions, and metrics
 *
 * @module playbook/PlaybookStore
 */

import type {
  PlaybookDefinition,
  PlaybookVersion,
  PlaybookState,
  SeverityLevel,
  ExecutionRecord,
  EffectivenessMetrics
} from './types';

/**
 * PlaybookStore class
 * Manages in-memory storage of playbooks, execution history, versions, and metrics
 */
export class PlaybookStore {
  private playbooks: Map<string, PlaybookDefinition>;
  private executions: Map<string, ExecutionRecord>;
  private versions: Map<string, PlaybookVersion[]>;
  private metrics: Map<string, EffectivenessMetrics>;

  constructor() {
    this.playbooks = new Map();
    this.executions = new Map();
    this.versions = new Map();
    this.metrics = new Map();
  }

  // ================================
  // PLAYBOOK CRUD OPERATIONS
  // ================================

  /**
   * Register a playbook in the store
   */
  public registerPlaybook(playbook: PlaybookDefinition): void {
    this.playbooks.set(playbook.metadata.id, playbook);
    this.versions.set(playbook.metadata.id, [
      {
        version: 1,
        createdAt: playbook.metadata.created,
        createdBy: playbook.metadata.author,
        description: playbook.metadata.description,
        changes: ['Initial version']
      }
    ]);
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
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) throw new Error(`Playbook ${playbookId} not found`);

    const newVersion = playbook.metadata.version + 1;
    const updated: PlaybookDefinition = {
      ...playbook,
      ...updates,
      metadata: {
        ...playbook.metadata,
        version: newVersion,
        updated: new Date().toISOString(),
        state: 'active'
      }
    };

    this.playbooks.set(playbookId, updated);

    const versions = this.versions.get(playbookId) || [];
    versions.push({
      version: newVersion,
      createdAt: new Date().toISOString(),
      createdBy: author,
      description: changeDescription,
      changes: [changeDescription]
    });
    this.versions.set(playbookId, versions);

    return updated;
  }

  /**
   * Get a playbook by ID
   */
  public getPlaybook(playbookId: string): PlaybookDefinition | undefined {
    return this.playbooks.get(playbookId);
  }

  /**
   * List all playbooks with optional filtering
   */
  public listPlaybooks(
    state?: PlaybookState,
    severity?: SeverityLevel,
    category?: string
  ): PlaybookDefinition[] {
    return Array.from(this.playbooks.values()).filter((pb) => {
      if (state && pb.metadata.state !== state) return false;
      if (severity && pb.metadata.severity !== severity) return false;
      if (category && pb.metadata.category !== category) return false;
      return true;
    });
  }

  /**
   * Delete a playbook
   */
  public deletePlaybook(playbookId: string): boolean {
    const deleted = this.playbooks.delete(playbookId);
    if (deleted) {
      this.versions.delete(playbookId);
      // Also delete associated metrics
      const metricsKey = `${playbookId}_default`;
      this.metrics.delete(metricsKey);
    }
    return deleted;
  }

  /**
   * Get playbook count
   */
  public getPlaybookCount(): number {
    return this.playbooks.size;
  }

  // ================================
  // VERSION OPERATIONS
  // ================================

  /**
   * Get version history for a playbook
   */
  public getVersionHistory(playbookId: string): PlaybookVersion[] {
    return this.versions.get(playbookId) || [];
  }

  /**
   * Get a specific version of a playbook
   */
  public getPlaybookVersion(playbookId: string, version: number): PlaybookVersion | undefined {
    const versions = this.versions.get(playbookId);
    return versions?.find((v) => v.version === version);
  }

  // ================================
  // EXECUTION OPERATIONS
  // ================================

  /**
   * Store an execution record
   */
  public storeExecution(execution: ExecutionRecord): void {
    this.executions.set(execution.executionId, execution);
  }

  /**
   * Get an execution by ID
   */
  public getExecution(executionId: string): ExecutionRecord | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get execution history for a playbook
   */
  public getExecutionHistory(playbookId: string, limit: number = 100): ExecutionRecord[] {
    return Array.from(this.executions.values())
      .filter((e) => e.playbookId === playbookId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  /**
   * Get all executions with optional status filter
   */
  public getAllExecutions(status?: ExecutionRecord['status']): ExecutionRecord[] {
    const executions = Array.from(this.executions.values());
    if (status) {
      return executions.filter((e) => e.status === status);
    }
    return executions;
  }

  /**
   * Get execution count
   */
  public getExecutionCount(): number {
    return this.executions.size;
  }

  // ================================
  // METRICS OPERATIONS
  // ================================

  /**
   * Update playbook effectiveness metrics
   */
  public updateMetrics(playbookId: string, execution: ExecutionRecord): void {
    const key = `${playbookId}_default`;
    const current = this.metrics.get(key);

    const successRate = execution.status === 'success' ? 1 : 0;
    const newMetrics: EffectivenessMetrics = {
      playbookId,
      variant: 'default',
      executions: (current?.executions ?? 0) + 1,
      successRate: current ? (current.successRate + successRate) / 2 : successRate,
      averageDuration: current
        ? (current.averageDuration + execution.metrics.totalDuration) / 2
        : execution.metrics.totalDuration,
      userSatisfaction: 0,
      incidentResolution: successRate
    };

    this.metrics.set(key, newMetrics);
  }

  /**
   * Get metrics for a playbook
   */
  public getMetrics(playbookId: string): EffectivenessMetrics | undefined {
    return this.metrics.get(`${playbookId}_default`);
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): EffectivenessMetrics[] {
    return Array.from(this.metrics.values());
  }

  // ================================
  // UTILITY OPERATIONS
  // ================================

  /**
   * Clear all data (for testing)
   */
  public clear(): void {
    this.playbooks.clear();
    this.executions.clear();
    this.versions.clear();
    this.metrics.clear();
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
    const versions: Record<string, PlaybookVersion[]> = {};
    this.versions.forEach((v, k) => {
      versions[k] = v;
    });

    return {
      playbooks: Array.from(this.playbooks.values()),
      executions: Array.from(this.executions.values()),
      versions,
      metrics: Array.from(this.metrics.values())
    };
  }

  /**
   * Import data from JSON
   */
  public importData(data: {
    playbooks?: PlaybookDefinition[];
    versions?: Record<string, PlaybookVersion[]>;
  }): void {
    if (data.playbooks) {
      for (const playbook of data.playbooks) {
        this.playbooks.set(playbook.metadata.id, playbook);
      }
    }
    if (data.versions) {
      for (const [id, versionList] of Object.entries(data.versions)) {
        this.versions.set(id, versionList);
      }
    }
  }
}
