/**
 * Execution Storage
 * Handles persistence of workflow execution records
 * PROJET SAUVÉ - Phase 5.3: Execution History & Logs
 */

import { logger } from '../services/SimpleLogger';
import type {
  WorkflowExecution,
  NodeExecution,
  ExecutionLog,
  ExecutionFilter,
  NodeExecutionFilter,
  ExecutionLogFilter,
  ExecutionStatus,
  NodeExecutionStatus
} from '../types/execution';

export class ExecutionStorage {
  private storage: Storage;
  private executionsKey = 'workflow_executions';
  private nodeExecutionsKey = 'workflow_node_executions';
  private logsKey = 'workflow_execution_logs';

  private executionsCache: Map<string, WorkflowExecution>;
  private nodeExecutionsCache: Map<string, NodeExecution>;
  private logsCache: Map<string, ExecutionLog>;

  private maxExecutions = 1000; // Max executions to keep in storage
  private maxLogs = 10000; // Max logs to keep in storage

  constructor() {
    this.storage = typeof window !== 'undefined' ? window.localStorage : ({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0
    } as Storage);

    this.executionsCache = new Map();
    this.nodeExecutionsCache = new Map();
    this.logsCache = new Map();

    this.loadFromStorage();
  }

  /**
   * Load data from storage
   */
  private loadFromStorage(): void {
    try {
      // Load executions
      const executionsData = this.storage.getItem(this.executionsKey);
      if (executionsData) {
        const executions: WorkflowExecution[] = JSON.parse(executionsData);
        for (const execution of executions) {
          this.executionsCache.set(execution.id, this.deserializeExecution(execution));
        }
        logger.info(`Loaded ${executions.length} executions from storage`);
      }

      // Load node executions
      const nodeExecutionsData = this.storage.getItem(this.nodeExecutionsKey);
      if (nodeExecutionsData) {
        const nodeExecutions: NodeExecution[] = JSON.parse(nodeExecutionsData);
        for (const nodeExec of nodeExecutions) {
          this.nodeExecutionsCache.set(nodeExec.id, this.deserializeNodeExecution(nodeExec));
        }
        logger.info(`Loaded ${nodeExecutions.length} node executions from storage`);
      }

      // Load logs
      const logsData = this.storage.getItem(this.logsKey);
      if (logsData) {
        const logs: ExecutionLog[] = JSON.parse(logsData);
        for (const log of logs) {
          this.logsCache.set(log.id, this.deserializeLog(log));
        }
        logger.info(`Loaded ${logs.length} logs from storage`);
      }
    } catch (error) {
      logger.error('Failed to load execution data from storage:', error);
    }
  }

  /**
   * Save data to storage
   */
  private saveToStorage(): void {
    try {
      // Save executions
      const executions = Array.from(this.executionsCache.values());
      this.storage.setItem(this.executionsKey, JSON.stringify(executions));

      // Save node executions
      const nodeExecutions = Array.from(this.nodeExecutionsCache.values());
      this.storage.setItem(this.nodeExecutionsKey, JSON.stringify(nodeExecutions));

      // Save logs
      const logs = Array.from(this.logsCache.values());
      this.storage.setItem(this.logsKey, JSON.stringify(logs));
    } catch (error) {
      logger.error('Failed to save execution data to storage:', error);
      throw new Error('Failed to save execution data');
    }
  }

  /**
   * Create execution record
   */
  async createExecution(execution: Omit<WorkflowExecution, 'id'>): Promise<WorkflowExecution> {
    const id = this.generateId('exec');
    const newExecution: WorkflowExecution = {
      ...execution,
      id,
      nodeExecutions: []
    };

    this.executionsCache.set(id, newExecution);
    this.cleanupOldExecutions();
    this.saveToStorage();

    logger.info(`Execution created: ${id} for workflow ${execution.workflowName}`);
    return newExecution;
  }

  /**
   * Update execution
   */
  async updateExecution(id: string, updates: Partial<WorkflowExecution>): Promise<WorkflowExecution> {
    const execution = this.executionsCache.get(id);
    if (!execution) {
      throw new Error(`Execution not found: ${id}`);
    }

    const updated: WorkflowExecution = {
      ...execution,
      ...updates,
      id: execution.id // prevent ID change
    };

    this.executionsCache.set(id, updated);
    this.saveToStorage();

    logger.debug(`Execution updated: ${id}`);
    return updated;
  }

  /**
   * Get execution by ID
   */
  async getExecution(id: string): Promise<WorkflowExecution | null> {
    return this.executionsCache.get(id) || null;
  }

  /**
   * List executions with filter
   */
  async listExecutions(filter?: ExecutionFilter): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.executionsCache.values());

    if (filter) {
      // Filter by workflow ID
      if (filter.workflowId) {
        executions = executions.filter(e => e.workflowId === filter.workflowId);
      }

      // Filter by status
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        executions = executions.filter(e => statuses.includes(e.status));
      }

      // Filter by mode
      if (filter.mode) {
        executions = executions.filter(e => e.mode === filter.mode);
      }

      // Filter by triggered by
      if (filter.triggeredBy) {
        executions = executions.filter(e => e.triggeredBy === filter.triggeredBy);
      }

      // Filter by date range
      if (filter.startDate) {
        executions = executions.filter(e => e.startedAt >= filter.startDate!);
      }
      if (filter.endDate) {
        executions = executions.filter(e => e.startedAt <= filter.endDate!);
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        executions = executions.filter(e =>
          e.tags?.some(tag => filter.tags!.includes(tag))
        );
      }

      // Search
      if (filter.search) {
        const search = filter.search.toLowerCase();
        executions = executions.filter(e =>
          e.workflowName.toLowerCase().includes(search) ||
          e.id.toLowerCase().includes(search)
        );
      }

      // Sort
      const sortBy = filter.sortBy || 'startedAt';
      const sortOrder = filter.sortOrder || 'desc';
      executions.sort((a, b) => {
        let aVal: any = a[sortBy];
        let bVal: any = b[sortBy];

        if (aVal instanceof Date) aVal = aVal.getTime();
        if (bVal instanceof Date) bVal = bVal.getTime();

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Pagination
      if (filter.offset !== undefined || filter.limit !== undefined) {
        const offset = filter.offset || 0;
        const limit = filter.limit || 50;
        executions = executions.slice(offset, offset + limit);
      }
    }

    return executions;
  }

  /**
   * Delete execution
   */
  async deleteExecution(id: string): Promise<boolean> {
    const deleted = this.executionsCache.delete(id);

    if (deleted) {
      // Delete associated node executions
      const nodeExecutions = Array.from(this.nodeExecutionsCache.values())
        .filter(ne => ne.executionId === id);
      for (const nodeExec of nodeExecutions) {
        this.nodeExecutionsCache.delete(nodeExec.id);
      }

      // Delete associated logs
      const logs = Array.from(this.logsCache.values())
        .filter(log => log.executionId === id);
      for (const log of logs) {
        this.logsCache.delete(log.id);
      }

      this.saveToStorage();
      logger.info(`Execution deleted: ${id}`);
    }

    return deleted;
  }

  /**
   * Create node execution
   */
  async createNodeExecution(nodeExecution: Omit<NodeExecution, 'id'>): Promise<NodeExecution> {
    const id = this.generateId('node_exec');
    const newNodeExecution: NodeExecution = {
      ...nodeExecution,
      id,
      logs: []
    };

    this.nodeExecutionsCache.set(id, newNodeExecution);

    // Add to parent execution
    const execution = this.executionsCache.get(nodeExecution.executionId);
    if (execution) {
      execution.nodeExecutions.push(newNodeExecution);
      this.executionsCache.set(execution.id, execution);
    }

    this.saveToStorage();

    logger.debug(`Node execution created: ${id} for node ${nodeExecution.nodeName}`);
    return newNodeExecution;
  }

  /**
   * Update node execution
   */
  async updateNodeExecution(id: string, updates: Partial<NodeExecution>): Promise<NodeExecution> {
    const nodeExecution = this.nodeExecutionsCache.get(id);
    if (!nodeExecution) {
      throw new Error(`Node execution not found: ${id}`);
    }

    const updated: NodeExecution = {
      ...nodeExecution,
      ...updates,
      id: nodeExecution.id
    };

    this.nodeExecutionsCache.set(id, updated);

    // Update in parent execution
    const execution = this.executionsCache.get(nodeExecution.executionId);
    if (execution) {
      const index = execution.nodeExecutions.findIndex(ne => ne.id === id);
      if (index !== -1) {
        execution.nodeExecutions[index] = updated;
        this.executionsCache.set(execution.id, execution);
      }
    }

    this.saveToStorage();

    logger.debug(`Node execution updated: ${id}`);
    return updated;
  }

  /**
   * Get node executions
   */
  async getNodeExecutions(filter?: NodeExecutionFilter): Promise<NodeExecution[]> {
    let nodeExecutions = Array.from(this.nodeExecutionsCache.values());

    if (filter) {
      if (filter.executionId) {
        nodeExecutions = nodeExecutions.filter(ne => ne.executionId === filter.executionId);
      }
      if (filter.nodeId) {
        nodeExecutions = nodeExecutions.filter(ne => ne.nodeId === filter.nodeId);
      }
      if (filter.nodeType) {
        nodeExecutions = nodeExecutions.filter(ne => ne.nodeType === filter.nodeType);
      }
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        nodeExecutions = nodeExecutions.filter(ne => statuses.includes(ne.status));
      }
      if (filter.hasError !== undefined) {
        nodeExecutions = nodeExecutions.filter(ne => filter.hasError ? ne.error !== undefined : ne.error === undefined);
      }
      if (filter.minDuration !== undefined) {
        nodeExecutions = nodeExecutions.filter(ne => (ne.duration || 0) >= filter.minDuration!);
      }
      if (filter.maxDuration !== undefined) {
        nodeExecutions = nodeExecutions.filter(ne => (ne.duration || 0) <= filter.maxDuration!);
      }
    }

    return nodeExecutions;
  }

  /**
   * Add log entry
   */
  async addLog(log: Omit<ExecutionLog, 'id'>): Promise<ExecutionLog> {
    const id = this.generateId('log');
    const newLog: ExecutionLog = {
      ...log,
      id
    };

    this.logsCache.set(id, newLog);

    // Add to node execution if applicable
    if (log.nodeExecutionId) {
      const nodeExecution = this.nodeExecutionsCache.get(log.nodeExecutionId);
      if (nodeExecution) {
        nodeExecution.logs.push(newLog);
        this.nodeExecutionsCache.set(nodeExecution.id, nodeExecution);
      }
    }

    this.cleanupOldLogs();
    this.saveToStorage();

    return newLog;
  }

  /**
   * Get logs
   */
  async getLogs(filter?: ExecutionLogFilter): Promise<ExecutionLog[]> {
    let logs = Array.from(this.logsCache.values());

    if (filter) {
      if (filter.executionId) {
        logs = logs.filter(log => log.executionId === filter.executionId);
      }
      if (filter.nodeExecutionId) {
        logs = logs.filter(log => log.nodeExecutionId === filter.nodeExecutionId);
      }
      if (filter.level) {
        const levels = Array.isArray(filter.level) ? filter.level : [filter.level];
        logs = logs.filter(log => levels.includes(log.level));
      }
      if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!);
      }
      if (filter.search) {
        const search = filter.search.toLowerCase();
        logs = logs.filter(log => log.message.toLowerCase().includes(search));
      }
      if (filter.category) {
        logs = logs.filter(log => log.category === filter.category);
      }

      // Pagination
      if (filter.offset !== undefined || filter.limit !== undefined) {
        const offset = filter.offset || 0;
        const limit = filter.limit || 100;
        logs = logs.slice(offset, offset + limit);
      }
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logs;
  }

  /**
   * Cleanup old executions
   */
  private cleanupOldExecutions(): void {
    const executions = Array.from(this.executionsCache.values());
    if (executions.length > this.maxExecutions) {
      // Sort by startedAt, keep newest
      executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      const toDelete = executions.slice(this.maxExecutions);

      for (const execution of toDelete) {
        this.executionsCache.delete(execution.id);
      }

      logger.info(`Cleaned up ${toDelete.length} old executions`);
    }
  }

  /**
   * Cleanup old logs
   */
  private cleanupOldLogs(): void {
    const logs = Array.from(this.logsCache.values());
    if (logs.length > this.maxLogs) {
      // Sort by timestamp, keep newest
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const toDelete = logs.slice(this.maxLogs);

      for (const log of toDelete) {
        this.logsCache.delete(log.id);
      }

      logger.debug(`Cleaned up ${toDelete.length} old logs`);
    }
  }

  /**
   * Clear all execution data
   */
  async clear(): Promise<void> {
    this.executionsCache.clear();
    this.nodeExecutionsCache.clear();
    this.logsCache.clear();
    this.storage.removeItem(this.executionsKey);
    this.storage.removeItem(this.nodeExecutionsKey);
    this.storage.removeItem(this.logsKey);
    logger.info('All execution data cleared');
  }

  /**
   * Get count
   */
  async getExecutionCount(): Promise<number> {
    return this.executionsCache.size;
  }

  /**
   * Deserialize execution (convert date strings)
   */
  private deserializeExecution(execution: any): WorkflowExecution {
    return {
      ...execution,
      startedAt: new Date(execution.startedAt),
      finishedAt: execution.finishedAt ? new Date(execution.finishedAt) : undefined,
      error: execution.error ? {
        ...execution.error,
        timestamp: new Date(execution.error.timestamp)
      } : undefined
    };
  }

  /**
   * Deserialize node execution
   */
  private deserializeNodeExecution(nodeExecution: any): NodeExecution {
    return {
      ...nodeExecution,
      startedAt: new Date(nodeExecution.startedAt),
      finishedAt: nodeExecution.finishedAt ? new Date(nodeExecution.finishedAt) : undefined,
      error: nodeExecution.error ? {
        ...nodeExecution.error,
        timestamp: new Date(nodeExecution.error.timestamp)
      } : undefined,
      logs: nodeExecution.logs?.map((log: any) => this.deserializeLog(log)) || []
    };
  }

  /**
   * Deserialize log
   */
  private deserializeLog(log: any): ExecutionLog {
    return {
      ...log,
      timestamp: new Date(log.timestamp)
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
let storageInstance: ExecutionStorage | null = null;

export function getExecutionStorage(): ExecutionStorage {
  if (!storageInstance) {
    storageInstance = new ExecutionStorage();
  }
  return storageInstance;
}

export function resetExecutionStorage(): void {
  storageInstance = null;
}
