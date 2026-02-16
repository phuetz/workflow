/**
 * Integration layer between Organization System and Workflow Store
 * Provides seamless integration of folders, tags, search, and archives
 */

import { useWorkflowStore } from '../store/workflowStore';
import { folderService } from './FolderService';
import { tagService } from './TagService';
import { archiveService } from './ArchiveService';
import { searchService } from './SearchService';
import { bulkOperationsService } from './BulkOperations';
import type { WorkflowStatus } from '../types/organization';

/**
 * Extended workflow store with organization features
 */
export class WorkflowOrganizationManager {
  /**
   * Initialize organization system with current workflows
   */
  initialize() {
    const workflows = useWorkflowStore.getState().workflows;

    // Index all workflows for search
    Object.entries(workflows).forEach(([id, workflow]) => {
      searchService.indexWorkflow(id, {
        name: workflow.name || 'Untitled Workflow',
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        createdBy: 'current-user', // Would come from auth
        status: this.getWorkflowStatus(id),
        description: workflow.description,
        nodes: workflow.nodes,
      });
    });
  }

  /**
   * Get workflow status
   */
  private getWorkflowStatus(workflowId: string): WorkflowStatus {
    const state = useWorkflowStore.getState();
    const workflow = state.workflows[workflowId];

    if (!workflow) return 'draft';

    // Check if archived
    const archives = archiveService.getAllArchives();
    if (archives.some((a) => a.originalWorkflowId === workflowId)) {
      return 'archived';
    }

    // Check if has executions in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hasRecentExecution = state.executionHistory.some(
      (exec) =>
        exec.workflowId === workflowId &&
        new Date(exec.timestamp) > thirtyDaysAgo
    );

    return hasRecentExecution ? 'active' : 'inactive';
  }

  /**
   * Move workflows to folder
   */
  moveWorkflowsToFolder(workflowIds: string[], folderId: string | null) {
    // Get current folder for each workflow
    const currentFolders = new Map<string, string | null>();

    for (const workflowId of workflowIds) {
      const allFolders = folderService.getAllFolders();
      const currentFolder = allFolders.find((f) =>
        f.workflowIds.includes(workflowId)
      );
      currentFolders.set(workflowId, currentFolder?.id || null);
    }

    // Move workflows
    folderService.moveWorkflows(
      workflowIds,
      currentFolders.get(workflowIds[0]) || null,
      folderId
    );

    // Re-index for search
    for (const workflowId of workflowIds) {
      this.reindexWorkflow(workflowId);
    }
  }

  /**
   * Archive workflow
   */
  archiveWorkflow(workflowId: string, reason?: string) {
    const state = useWorkflowStore.getState();
    const workflow = state.workflows[workflowId];

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Get current folder and tags
    const allFolders = folderService.getAllFolders();
    const currentFolder = allFolders.find((f) =>
      f.workflowIds.includes(workflowId)
    );
    const tags = tagService.getWorkflowTags(workflowId);

    // Archive
    const archive = archiveService.archiveWorkflow(
      workflowId,
      workflow.name || 'Untitled Workflow',
      workflow,
      {
        reason,
        folderId: currentFolder?.id,
        tags: tags.map((t) => t.id),
      }
    );

    // Remove from folder
    if (currentFolder) {
      folderService.removeWorkflowFromFolder(currentFolder.id, workflowId);
    }

    // Remove from search index
    searchService.removeFromIndex(workflowId);

    return archive;
  }

  /**
   * Restore workflow from archive
   */
  restoreWorkflow(archiveId: string) {
    const archive = archiveService.getArchive(archiveId);
    if (!archive) {
      throw new Error(`Archive ${archiveId} not found`);
    }

    // Restore workflow data
    const workflowData = archiveService.restoreWorkflow(archiveId);

    // Add back to workflow store
    const state = useWorkflowStore.getState();
    const newWorkflowId = `workflow_${Date.now()}`;

    // Ensure workflowData is an object with required properties
    const baseWorkflow = {
      nodes: [],
      edges: [],
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state.workflows[newWorkflowId] = {
      ...baseWorkflow,
      ...(typeof workflowData === 'object' && workflowData !== null ? workflowData : {}),
      id: newWorkflowId,
      name: archive.workflowName,
    };

    // Restore to original folder
    if (archive.folderId) {
      folderService.addWorkflowToFolder(archive.folderId, newWorkflowId);
    }

    // Restore tags
    for (const tagId of archive.tags) {
      tagService.addTagToWorkflow(newWorkflowId, tagId);
    }

    // Re-index
    this.reindexWorkflow(newWorkflowId);

    // Delete archive
    archiveService.deleteArchive(archiveId);

    return newWorkflowId;
  }

  /**
   * Search workflows
   */
  searchWorkflows(query: string, filters: any = {}) {
    return searchService.search({
      query,
      filters,
      sort: { field: 'updatedAt', direction: 'desc' },
      pagination: { page: 1, pageSize: 50 },
    });
  }

  /**
   * Get workflows in folder
   */
  getWorkflowsInFolder(folderId: string | null, includeSubfolders = false) {
    if (folderId === null) {
      // Return all workflows not in any folder
      const allFolders = folderService.getAllFolders();
      const allWorkflowsInFolders = new Set(
        allFolders.flatMap((f) => f.workflowIds)
      );
      const state = useWorkflowStore.getState();
      return Object.keys(state.workflows).filter(
        (id) => !allWorkflowsInFolders.has(id)
      );
    }

    const folder = folderService.getFolder(folderId);
    if (!folder) return [];

    const workflowIds = [...folder.workflowIds];

    if (includeSubfolders) {
      const descendants = folderService.getDescendants(folderId);
      for (const desc of descendants) {
        workflowIds.push(...desc.workflowIds);
      }
    }

    return Array.from(new Set(workflowIds)); // Remove duplicates
  }

  /**
   * Get workflows with tag
   */
  getWorkflowsWithTag(tagId: string) {
    return tagService.getWorkflowsWithTag(tagId);
  }

  /**
   * Re-index workflow for search
   */
  private reindexWorkflow(workflowId: string) {
    const state = useWorkflowStore.getState();
    const workflow = state.workflows[workflowId];

    if (!workflow) return;

    // Get folder
    const allFolders = folderService.getAllFolders();
    const folder = allFolders.find((f) => f.workflowIds.includes(workflowId));

    // Get execution stats
    const executions = state.executionHistory.filter(
      (e) => e.workflowId === workflowId
    );
    const successful = executions.filter((e) => e.status === 'success').length;
    const totalExecutions = executions.length;
    const successRate = totalExecutions > 0 ? (successful / totalExecutions) * 100 : 0;
    const avgExecutionTime =
      executions.reduce((sum, e) => sum + (e.duration || 0), 0) /
        (totalExecutions || 1);
    const lastExecuted = executions[0]?.timestamp;

    searchService.indexWorkflow(workflowId, {
      name: workflow.name || 'Untitled Workflow',
      folderId: folder?.id,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      createdBy: 'current-user',
      status: this.getWorkflowStatus(workflowId),
      description: workflow.description,
      nodes: workflow.nodes,
      executionStats: {
        totalExecutions,
        successRate,
        avgExecutionTime,
        lastExecuted,
      },
    });
  }

  /**
   * Get smart collections
   */
  getSmartCollections() {
    const state = useWorkflowStore.getState();
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return {
      recent: {
        name: 'Recently Modified',
        workflows: Object.entries(state.workflows)
          .sort(
            ([, a], [, b]) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )
          .slice(0, 10)
          .map(([id]) => id),
      },

      myWorkflows: {
        name: 'My Workflows',
        workflows: Object.keys(state.workflows), // Would filter by current user
      },

      favorites: {
        name: 'Favorites',
        workflows: [], // Would track favorites in store
      },

      highExecution: {
        name: 'High Execution',
        workflows: Object.keys(state.workflows)
          .map((id) => ({
            id,
            count: state.executionHistory.filter((e) => e.workflowId === id)
              .length,
          }))
          .filter((w) => w.count >= 10)
          .sort((a, b) => b.count - a.count)
          .map((w) => w.id),
      },

      failing: {
        name: 'Failing Workflows',
        workflows: Object.keys(state.workflows).filter((id) => {
          const executions = state.executionHistory.filter(
            (e) => e.workflowId === id
          );
          const recent = executions.slice(0, 5);
          const failures = recent.filter((e) => e.status === 'error').length;
          return failures >= 3;
        }),
      },

      inactive: {
        name: 'Inactive',
        workflows: Object.keys(state.workflows).filter((id) => {
          const lastExec = state.executionHistory.find(
            (e) => e.workflowId === id
          );
          if (!lastExec) return true;
          return new Date(lastExec.timestamp) < ninetyDaysAgo;
        }),
      },
    };
  }

  /**
   * Bulk operations integration
   */
  async bulkMoveToFolder(workflowIds: string[], folderId: string | null) {
    const operation = await bulkOperationsService.moveWorkflows({
      workflowIds,
      targetFolderId: folderId,
    });

    // Update folder service
    this.moveWorkflowsToFolder(workflowIds, folderId);

    return operation;
  }

  async bulkArchive(workflowIds: string[], reason?: string) {
    const workflows = workflowIds.map((id) => {
      const state = useWorkflowStore.getState();
      const workflow = state.workflows[id];
      const allFolders = folderService.getAllFolders();
      const folder = allFolders.find((f) => f.workflowIds.includes(id));
      const tags = tagService.getWorkflowTags(id);

      return {
        workflowId: id,
        workflowName: workflow?.name || 'Untitled',
        workflowData: workflow,
        folderId: folder?.id,
        tags: tags.map((t) => t.id),
      };
    });

    return await bulkOperationsService.archiveWorkflows(
      { workflowIds, reason },
    );
  }

  async bulkTag(
    workflowIds: string[],
    tagIds: string[],
    action: 'add' | 'remove' | 'replace'
  ) {
    return await bulkOperationsService.tagWorkflows({
      workflowIds,
      tagIds,
      action,
    });
  }

  /**
   * Get organization statistics
   */
  getStats() {
    const state = useWorkflowStore.getState();
    const allFolders = folderService.getAllFolders();
    const allTags = tagService.getAllTags();
    const archives = archiveService.getAllArchives();

    const workflowsInFolders = allFolders.reduce(
      (sum, f) => sum + f.workflowIds.length,
      0
    );
    const workflowsWithTags = new Set(
      tagService.getWorkflowTags.length > 0 ? ['dummy'] : []
    ).size;

    return {
      totalWorkflows: Object.keys(state.workflows).length,
      totalFolders: allFolders.length,
      totalTags: allTags.length,
      totalArchives: archives.length,
      workflowsOrganized: workflowsInFolders,
      workflowsTagged: workflowsWithTags,
      organizationRate:
        (workflowsInFolders / Object.keys(state.workflows).length) * 100 || 0,
    };
  }
}

// Singleton instance
export const workflowOrganization = new WorkflowOrganizationManager();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  workflowOrganization.initialize();
}
