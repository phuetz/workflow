/**
 * Debug Data Pinner
 * Pin failed execution data for debugging and replay
 */

import type { PinnedData, EvaluationResult } from '../types/evaluation';

/**
 * DebugDataPinner - Pin and manage debug data from evaluations
 */
export class DebugDataPinner {
  private pinnedData: Map<string, PinnedData>;
  private storage?: StorageInterface;
  private logger?: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };

  constructor(options?: { storage?: unknown; logger?: unknown }) {
    this.pinnedData = new Map();
    this.storage = options?.storage as StorageInterface | undefined;
    this.logger = options?.logger as typeof this.logger;
  }

  /**
   * Pin data from a failed evaluation result
   */
  async pinFromEvaluationResult(result: EvaluationResult, nodeId?: string): Promise<PinnedData[]> {
    const pinned: PinnedData[] = [];

    // Pin failed test data
    if (!result.passed && result.executionData) {
      // Pin overall execution data
      const overallPin = await this.pin({
        evaluationId: result.evaluationId,
        evaluationResultId: result.id,
        inputId: result.inputId,
        nodeId: nodeId || 'workflow',
        data: {
          input: result.executionData,
          output: result.workflowOutput,
          metrics: result.metrics,
        },
        reason: 'failure',
        notes: `Evaluation failed with score ${result.overallScore.toFixed(2)}`,
      });

      pinned.push(overallPin);

      // Pin per-node data if available
      if (result.executionData.nodeResults) {
        for (const [nId, nodeData] of Object.entries(result.executionData.nodeResults)) {
          const nodePin = await this.pin({
            evaluationId: result.evaluationId,
            evaluationResultId: result.id,
            inputId: result.inputId,
            nodeId: nId,
            data: nodeData,
            reason: 'failure',
            notes: `Node data from failed evaluation`,
          });

          pinned.push(nodePin);
        }
      }

      // Pin error data
      if (result.executionData.errors && result.executionData.errors.length > 0) {
        for (const error of result.executionData.errors) {
          const errorPin = await this.pin({
            evaluationId: result.evaluationId,
            evaluationResultId: result.id,
            inputId: result.inputId,
            nodeId: error.nodeId,
            data: { error: error.message },
            reason: 'failure',
            notes: `Error: ${error.message}`,
          });

          pinned.push(errorPin);
        }
      }
    }

    this.logger?.info('Pinned data from evaluation result', {
      evaluationId: result.evaluationId,
      resultId: result.id,
      pinnedCount: pinned.length,
    });

    return pinned;
  }

  /**
   * Pin data manually
   */
  async pin(options: {
    evaluationId: string;
    evaluationResultId: string;
    inputId: string;
    nodeId: string;
    data: unknown;
    reason?: 'failure' | 'manual' | 'interesting';
    notes?: string;
  }): Promise<PinnedData> {
    const id = this.generateId();
    const timestamp = new Date();

    const pinnedData: PinnedData = {
      id,
      evaluationId: options.evaluationId,
      evaluationResultId: options.evaluationResultId,
      inputId: options.inputId,
      nodeId: options.nodeId,
      data: options.data,
      timestamp,
      metadata: {
        reason: options.reason,
        notes: options.notes,
      },
    };

    // Store in memory
    this.pinnedData.set(id, pinnedData);

    // Persist to storage if available
    if (this.storage) {
      try {
        await this.storage.save(`pinned_data_${id}`, pinnedData);
      } catch (error) {
        this.logger?.error('Failed to persist pinned data', {
          id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return pinnedData;
  }

  /**
   * Get pinned data by ID
   */
  async get(id: string): Promise<PinnedData | null> {
    // Check memory first
    const memoryData = this.pinnedData.get(id);
    if (memoryData) return memoryData;

    // Check storage
    if (this.storage) {
      try {
        const data = await this.storage.load(`pinned_data_${id}`);
        if (data) {
          this.pinnedData.set(id, data as PinnedData);
          return data as PinnedData;
        }
      } catch (error) {
        this.logger?.error('Failed to load pinned data', {
          id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return null;
  }

  /**
   * Get all pinned data for an evaluation
   */
  async getForEvaluation(evaluationId: string): Promise<PinnedData[]> {
    const results: PinnedData[] = [];

    // Get from memory
    for (const data of this.pinnedData.values()) {
      if (data.evaluationId === evaluationId) {
        results.push(data);
      }
    }

    // TODO: Query storage for additional data if needed

    return results;
  }

  /**
   * Get all pinned data for a node
   */
  async getForNode(nodeId: string): Promise<PinnedData[]> {
    const results: PinnedData[] = [];

    for (const data of this.pinnedData.values()) {
      if (data.nodeId === nodeId) {
        results.push(data);
      }
    }

    return results;
  }

  /**
   * Unpin data
   */
  async unpin(id: string): Promise<boolean> {
    // Remove from memory
    const removed = this.pinnedData.delete(id);

    // Remove from storage
    if (this.storage) {
      try {
        await this.storage.delete(`pinned_data_${id}`);
      } catch (error) {
        this.logger?.error('Failed to delete pinned data', {
          id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return removed;
  }

  /**
   * Apply pinned data to workflow editor
   */
  async applyToEditor(pinnedDataId: string, workflowStore: WorkflowStoreInterface): Promise<boolean> {
    const data = await this.get(pinnedDataId);
    if (!data) return false;

    try {
      // Set pinned data on the node
      workflowStore.setPinnedData(data.nodeId, data.data);

      this.logger?.info('Applied pinned data to editor', {
        pinnedDataId,
        nodeId: data.nodeId,
      });

      return true;
    } catch (error) {
      this.logger?.error('Failed to apply pinned data to editor', {
        pinnedDataId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Clear all pinned data for an evaluation
   */
  async clearForEvaluation(evaluationId: string): Promise<number> {
    let count = 0;

    const toDelete: string[] = [];
    for (const [id, data] of this.pinnedData.entries()) {
      if (data.evaluationId === evaluationId) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      if (await this.unpin(id)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get all pinned data
   */
  getAll(): PinnedData[] {
    return Array.from(this.pinnedData.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byReason: Record<string, number>;
    byEvaluation: Record<string, number>;
  } {
    const total = this.pinnedData.size;
    const byReason: Record<string, number> = {};
    const byEvaluation: Record<string, number> = {};

    for (const data of this.pinnedData.values()) {
      const reason = data.metadata?.reason || 'unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;

      byEvaluation[data.evaluationId] = (byEvaluation[data.evaluationId] || 0) + 1;
    }

    return { total, byReason, byEvaluation };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `pinned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Storage interface
 */
interface StorageInterface {
  save(key: string, data: unknown): Promise<void>;
  load(key: string): Promise<unknown>;
  delete(key: string): Promise<void>;
}

/**
 * Workflow store interface (minimal)
 */
interface WorkflowStoreInterface {
  setPinnedData(nodeId: string, data: unknown): void;
}

export default DebugDataPinner;
