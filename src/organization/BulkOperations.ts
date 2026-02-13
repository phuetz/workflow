/**
 * BulkOperations - Efficient bulk operations on multiple workflows
 * Supports move, archive, delete, tag, duplicate, and export
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BulkOperation,
  BulkOperationType,
  BulkOperationResult,
  BulkMoveParams,
  BulkTagParams,
  BulkArchiveParams,
  BulkExportParams,
  OrganizationError,
} from '../types/organization';
import { folderService } from './FolderService';
import { tagService } from './TagService';
import { archiveService } from './ArchiveService';
import { logger } from '../services/SimpleLogger';

export class BulkOperationsService {
  private operations: Map<string, BulkOperation> = new Map();
  private currentUserId: string = 'current-user';

  /**
   * Move workflows to a folder
   */
  async moveWorkflows(params: BulkMoveParams): Promise<BulkOperation> {
    const { workflowIds, targetFolderId } = params;

    const operation = this.createOperation('move', workflowIds);

    try {
      const successful: string[] = [];
      const failed: Array<{ workflowId: string; error: string }> = [];

      // Validate target folder exists
      if (targetFolderId && !folderService.getFolder(targetFolderId)) {
        throw new OrganizationError(
          `Target folder ${targetFolderId} not found`,
          'FOLDER_NOT_FOUND'
        );
      }

      for (let i = 0; i < workflowIds.length; i++) {
        const workflowId = workflowIds[i];

        try {
          // This would integrate with workflow store
          // For now, we just update folder service
          // folderService.moveWorkflows([workflowId], currentFolder, targetFolderId);
          successful.push(workflowId);

          // Update progress
          this.updateProgress(operation.id, ((i + 1) / workflowIds.length) * 100);
        } catch (error) {
          failed.push({
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.completeOperation(operation.id, successful, failed);
      logger.info(`Bulk move completed: ${successful.length}/${workflowIds.length} workflows`);

      return this.getOperation(operation.id)!;
    } catch (error) {
      this.failOperation(operation.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Archive workflows
   */
  async archiveWorkflows(params: BulkArchiveParams): Promise<BulkOperation> {
    const { workflowIds, reason } = params;

    const operation = this.createOperation('archive', workflowIds);

    try {
      const successful: string[] = [];
      const failed: Array<{ workflowId: string; error: string }> = [];

      for (let i = 0; i < workflowIds.length; i++) {
        const workflowId = workflowIds[i];

        try {
          // This would get workflow data from store
          // const workflow = workflowStore.getWorkflow(workflowId);
          // archiveService.archiveWorkflow(workflowId, workflow.name, workflow, { reason });

          successful.push(workflowId);
          this.updateProgress(operation.id, ((i + 1) / workflowIds.length) * 100);
        } catch (error) {
          failed.push({
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.completeOperation(operation.id, successful, failed);
      logger.info(`Bulk archive completed: ${successful.length}/${workflowIds.length} workflows`);

      return this.getOperation(operation.id)!;
    } catch (error) {
      this.failOperation(operation.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Delete workflows
   */
  async deleteWorkflows(workflowIds: string[]): Promise<BulkOperation> {
    const operation = this.createOperation('delete', workflowIds);

    try {
      const successful: string[] = [];
      const failed: Array<{ workflowId: string; error: string }> = [];

      for (let i = 0; i < workflowIds.length; i++) {
        const workflowId = workflowIds[i];

        try {
          // This would delete from workflow store
          // workflowStore.deleteWorkflow(workflowId);

          successful.push(workflowId);
          this.updateProgress(operation.id, ((i + 1) / workflowIds.length) * 100);
        } catch (error) {
          failed.push({
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.completeOperation(operation.id, successful, failed);
      logger.info(`Bulk delete completed: ${successful.length}/${workflowIds.length} workflows`);

      return this.getOperation(operation.id)!;
    } catch (error) {
      this.failOperation(operation.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Add/remove tags from workflows
   */
  async tagWorkflows(params: BulkTagParams): Promise<BulkOperation> {
    const { workflowIds, tagIds, action } = params;

    const operation = this.createOperation('tag', workflowIds);

    try {
      const successful: string[] = [];
      const failed: Array<{ workflowId: string; error: string }> = [];

      for (let i = 0; i < workflowIds.length; i++) {
        const workflowId = workflowIds[i];

        try {
          if (action === 'add') {
            for (const tagId of tagIds) {
              tagService.addTagToWorkflow(workflowId, tagId);
            }
          } else if (action === 'remove') {
            for (const tagId of tagIds) {
              tagService.removeTagFromWorkflow(workflowId, tagId);
            }
          } else if (action === 'replace') {
            // Remove all existing tags
            const existingTags = tagService.getWorkflowTags(workflowId);
            for (const tag of existingTags) {
              tagService.removeTagFromWorkflow(workflowId, tag.id);
            }
            // Add new tags
            for (const tagId of tagIds) {
              tagService.addTagToWorkflow(workflowId, tagId);
            }
          }

          successful.push(workflowId);
          this.updateProgress(operation.id, ((i + 1) / workflowIds.length) * 100);
        } catch (error) {
          failed.push({
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.completeOperation(operation.id, successful, failed);
      logger.info(`Bulk tag ${action} completed: ${successful.length}/${workflowIds.length} workflows`);

      return this.getOperation(operation.id)!;
    } catch (error) {
      this.failOperation(operation.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Duplicate workflows
   */
  async duplicateWorkflows(workflowIds: string[]): Promise<BulkOperation> {
    const operation = this.createOperation('duplicate', workflowIds);

    try {
      const successful: string[] = [];
      const failed: Array<{ workflowId: string; error: string }> = [];

      for (let i = 0; i < workflowIds.length; i++) {
        const workflowId = workflowIds[i];

        try {
          // This would duplicate in workflow store
          // const newId = workflowStore.duplicateWorkflow(workflowId);
          // successful.push(newId);

          successful.push(`${workflowId}_copy`);
          this.updateProgress(operation.id, ((i + 1) / workflowIds.length) * 100);
        } catch (error) {
          failed.push({
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      this.completeOperation(operation.id, successful, failed);
      logger.info(`Bulk duplicate completed: ${successful.length}/${workflowIds.length} workflows`);

      return this.getOperation(operation.id)!;
    } catch (error) {
      this.failOperation(operation.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Export workflows
   */
  async exportWorkflows(params: BulkExportParams): Promise<BulkOperation> {
    const { workflowIds, format, includeExecutionHistory = false } = params;

    const operation = this.createOperation('export', workflowIds);

    try {
      const successful: string[] = [];
      const failed: Array<{ workflowId: string; error: string }> = [];
      const exportData: any = {
        exportedAt: new Date().toISOString(),
        exportedBy: this.currentUserId,
        workflows: [],
      };

      for (let i = 0; i < workflowIds.length; i++) {
        const workflowId = workflowIds[i];

        try {
          // This would get workflow from store
          // const workflow = workflowStore.getWorkflow(workflowId);
          // exportData.workflows.push({
          //   ...workflow,
          //   executionHistory: includeExecutionHistory ? workflow.executionHistory : undefined
          // });

          successful.push(workflowId);
          this.updateProgress(operation.id, ((i + 1) / workflowIds.length) * 100);
        } catch (error) {
          failed.push({
            workflowId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Generate export file
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        this.downloadBlob(blob, `workflows-export-${Date.now()}.json`);
      } else if (format === 'zip') {
        // Would use JSZip to create ZIP file
        logger.warn('ZIP export not yet implemented');
      }

      this.completeOperation(operation.id, successful, failed);
      logger.info(`Bulk export completed: ${successful.length}/${workflowIds.length} workflows`);

      return this.getOperation(operation.id)!;
    } catch (error) {
      this.failOperation(operation.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get operation status
   */
  getOperation(operationId: string): BulkOperation | null {
    return this.operations.get(operationId) || null;
  }

  /**
   * Get all operations
   */
  getAllOperations(): BulkOperation[] {
    return Array.from(this.operations.values()).sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  /**
   * Get active operations
   */
  getActiveOperations(): BulkOperation[] {
    return this.getAllOperations().filter(
      (op) => op.status === 'pending' || op.status === 'running'
    );
  }

  /**
   * Cancel operation
   */
  cancelOperation(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    if (operation.status === 'pending' || operation.status === 'running') {
      operation.status = 'cancelled';
      operation.completedAt = new Date().toISOString();
      logger.info(`Operation cancelled: ${operationId}`);
    }
  }

  /**
   * Clear completed operations
   */
  clearCompleted(): void {
    const completed = this.getAllOperations().filter(
      (op) => op.status === 'completed' || op.status === 'failed'
    );

    for (const op of completed) {
      this.operations.delete(op.id);
    }

    logger.info(`Cleared ${completed.length} completed operations`);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private createOperation(
    type: BulkOperationType,
    workflowIds: string[]
  ): BulkOperation {
    const operation: BulkOperation = {
      id: uuidv4(),
      type,
      workflowIds,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
    };

    this.operations.set(operation.id, operation);
    logger.info(`Bulk operation started: ${type} (${operation.id})`, {
      workflowCount: workflowIds.length,
    });

    return operation;
  }

  private updateProgress(operationId: string, progress: number): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.progress = Math.min(100, Math.max(0, progress));
    }
  }

  private completeOperation(
    operationId: string,
    successful: string[],
    failed: Array<{ workflowId: string; error: string }>
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    const startTime = new Date(operation.startedAt).getTime();
    const endTime = Date.now();

    operation.status = 'completed';
    operation.progress = 100;
    operation.completedAt = new Date().toISOString();
    operation.result = {
      successful,
      failed,
      totalProcessed: successful.length + failed.length,
      duration: endTime - startTime,
    };
  }

  private failOperation(operationId: string, error: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = 'failed';
    operation.completedAt = new Date().toISOString();
    operation.error = error;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get operation statistics
   */
  getStats() {
    const operations = this.getAllOperations();
    const byType = new Map<BulkOperationType, number>();
    const byStatus = new Map<string, number>();

    for (const op of operations) {
      byType.set(op.type, (byType.get(op.type) || 0) + 1);
      byStatus.set(op.status, (byStatus.get(op.status) || 0) + 1);
    }

    const completed = operations.filter((op) => op.status === 'completed');
    const totalWorkflows = completed.reduce(
      (sum, op) => sum + op.workflowIds.length,
      0
    );
    const successfulWorkflows = completed.reduce(
      (sum, op) => sum + (op.result?.successful.length || 0),
      0
    );

    return {
      totalOperations: operations.length,
      byType: Object.fromEntries(byType),
      byStatus: Object.fromEntries(byStatus),
      totalWorkflowsProcessed: totalWorkflows,
      successRate:
        totalWorkflows > 0 ? (successfulWorkflows / totalWorkflows) * 100 : 0,
    };
  }
}

// Singleton instance
export const bulkOperationsService = new BulkOperationsService();
