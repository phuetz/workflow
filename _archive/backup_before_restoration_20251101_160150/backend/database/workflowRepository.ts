/**
 * Workflow Repository
 * Database operations for workflow management
 */

import { Node, Edge } from 'reactflow';
import { analyticsService } from '../services/analyticsService';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  tags: string[];
  nodes: Node[];
  edges: Edge[];
  settings: WorkflowSettings;
  statistics: WorkflowStatistics;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface WorkflowSettings {
  errorWorkflow?: string;
  timezone?: string;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveExecutionProgress?: boolean;
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface WorkflowStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutedAt?: Date;
}

export class WorkflowRepository {
  private workflows: Map<string, Workflow> = new Map();
  private userWorkflows: Map<string, Set<string>> = new Map(); // userId -> workflowIds

  /**
   * Find workflow by ID
   */
  async findById(id: string, userId?: string): Promise<Workflow | null> {
    
    if (!workflow || workflow.deletedAt) {
      return null;
    }

    // Check ownership if userId provided
    if (userId && workflow.createdBy !== userId) {
      if (!userWorkflowIds?.has(id)) {
        return null;
      }
    }

    return workflow;
  }

  /**
   * Find all workflows for a user
   */
  async findByUser(
    userId: string,
    options?: {
      skip?: number;
      limit?: number;
      status?: string;
      tags?: string[];
      search?: string;
    }
  ): Promise<{ workflows: Workflow[]; total: number }> {
    let workflows = Array.from(this.userWorkflows.get(userId) || [])
      .map(id => this.workflows.get(id))
      .filter((w): w is Workflow => w !== undefined && !w.deletedAt);

    // Apply filters
    if (options?.status) {
      workflows = workflows.filter(w => w.status === options.status);
    }

    if (options?.tags && options.tags.length > 0) {
      workflows = workflows.filter(w => 
        options.tags!.some(tag => w.tags.includes(tag))
      );
    }

    if (options?.search) {
      workflows = workflows.filter(w => 
        w.name.toLowerCase().includes(search) ||
        w.description?.toLowerCase().includes(search) ||
        w.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Sort by updated date
    workflows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());


    // Apply pagination
    workflows = workflows.slice(skip, skip + limit);

    return { workflows, total };
  }

  /**
   * Create new workflow
   */
  async create(
    workflowData: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'statistics'>,
    userId: string
  ): Promise<Workflow> {
    const workflow: Workflow = {
      ...workflowData,
      id: this.generateId(),
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      statistics: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      }
    };

    this.workflows.set(workflow.id, workflow);

    // Add to user's workflows
    if (!this.userWorkflows.has(userId)) {
      this.userWorkflows.set(userId, new Set());
    }
    this.userWorkflows.get(userId)!.add(workflow.id);

    // Track workflow creation in analytics
    analyticsService.trackEvent({
      type: 'workflow_created',
      timestamp: workflow.createdAt,
      workflowId: workflow.id,
      userId: userId,
      metadata: {
        workflowName: workflow.name,
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length,
        status: workflow.status,
        tags: workflow.tags,
        hasErrorWorkflow: !!workflow.settings.errorWorkflow,
        hasTimeout: !!workflow.settings.timeout,
        retryEnabled: !!workflow.settings.retryOnFailure
      }
    });

    return workflow;
  }

  /**
   * Update workflow
   */
  async update(
    id: string,
    updates: Partial<Workflow>,
    userId: string
  ): Promise<Workflow | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      id: workflow.id, // Prevent ID change
      createdBy: workflow.createdBy, // Prevent creator change
      createdAt: workflow.createdAt, // Prevent creation date change
      updatedBy: userId,
      updatedAt: new Date()
    };

    this.workflows.set(id, updatedWorkflow);

    // Track workflow update in analytics
    analyticsService.trackEvent({
      type: 'workflow_updated',
      timestamp: updatedWorkflow.updatedAt,
      workflowId: id,
      userId: userId,
      metadata: {
        workflowName: updatedWorkflow.name,
        nodeCount: updatedWorkflow.nodes.length,
        edgeCount: updatedWorkflow.edges.length,
        status: updatedWorkflow.status,
        wasStatusChange: workflow.status !== updatedWorkflow.status,
        changedFields: Object.keys(updates).filter(key => 
          key !== 'updatedAt' && key !== 'updatedBy'
        )
      }
    });

    return updatedWorkflow;
  }

  /**
   * Delete workflow (soft delete)
   */
  async delete(id: string, userId: string): Promise<boolean> {
    if (!workflow) return false;

    workflow.deletedAt = new Date();
    workflow.updatedBy = userId;
    workflow.updatedAt = new Date();

    this.workflows.set(id, workflow);

    // Track workflow deletion in analytics
    analyticsService.trackEvent({
      type: 'workflow_deleted',
      timestamp: workflow.deletedAt,
      workflowId: id,
      userId: userId,
      metadata: {
        workflowName: workflow.name,
        wasOwner: workflow.createdBy === userId,
        totalExecutions: workflow.statistics.totalExecutions,
        successRate: workflow.statistics.totalExecutions > 0 
          ? (workflow.statistics.successfulExecutions / workflow.statistics.totalExecutions * 100).toFixed(2)
          : '0',
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length,
        createdDaysAgo: Math.floor((workflow.deletedAt.getTime() - workflow.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }
    });

    return true;
  }

  /**
   * Duplicate workflow
   */
  async duplicate(
    id: string,
    userId: string,
    newName?: string
  ): Promise<Workflow | null> {
    if (!original) return null;

    const duplicate: Workflow = {
      ...original,
      id: this.generateId(),
      name: newName || `${original.name} (Copy)`,
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      statistics: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0
      }
    };

    this.workflows.set(duplicate.id, duplicate);

    // Add to user's workflows
    if (!this.userWorkflows.has(userId)) {
      this.userWorkflows.set(userId, new Set());
    }
    this.userWorkflows.get(userId)!.add(duplicate.id);

    // Track workflow duplication in analytics
    analyticsService.trackEvent({
      type: 'workflow_created',
      timestamp: duplicate.createdAt,
      workflowId: duplicate.id,
      userId: userId,
      metadata: {
        workflowName: duplicate.name,
        nodeCount: duplicate.nodes.length,
        edgeCount: duplicate.edges.length,
        status: duplicate.status,
        isDuplicate: true,
        originalWorkflowId: original.id,
        originalWorkflowName: original.name
      }
    });

    return duplicate;
  }

  /**
   * Update workflow statistics
   */
  async updateStatistics(
    id: string,
    execution: {
      success: boolean;
      duration: number;
    }
  ): Promise<void> {
    if (!workflow || workflow.deletedAt) return;

    stats.totalExecutions++;
    
    if (execution.success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    // Update average execution time
    stats.averageExecutionTime = totalTime / stats.totalExecutions;
    
    stats.lastExecutedAt = new Date();

    workflow.updatedAt = new Date();
    this.workflows.set(id, workflow);
  }

  /**
   * Search workflows across all users (admin only)
   */
  async searchAll(query: string): Promise<Workflow[]> {
    const results: Workflow[] = [];

    for (const workflow of this.workflows.values()) {
      if (workflow.deletedAt) continue;

      if (
        workflow.name.toLowerCase().includes(search) ||
        workflow.description?.toLowerCase().includes(search) ||
        workflow.tags.some(tag => tag.toLowerCase().includes(search))
      ) {
        results.push(workflow);
      }
    }

    return results;
  }

  /**
   * Get workflow statistics
   */
  async getStatistics(userId?: string): Promise<{
    total: number;
    active: number;
    draft: number;
    inactive: number;
    totalExecutions: number;
    avgExecutionTime: number;
  }> {
    let workflows = Array.from(this.workflows.values())
      .filter(w => !w.deletedAt);

    if (userId) {
      const userWorkflowIds = new Set(
        Array.from(this.workflows.values())
          .filter(w => w.createdBy === userId)
          .map(w => w.id)
      );
      workflows = workflows.filter(w => userWorkflowIds.has(w.id));
    }

    let totalTime = 0;
    const stats = {
      total: workflows.length,
      active: workflows.filter(w => w.status === 'active').length,
      draft: workflows.filter(w => w.status === 'draft').length,
      inactive: workflows.filter(w => w.status === 'inactive').length,
      totalExecutions: 0,
      avgExecutionTime: 0
    };

    // Calculate aggregate statistics
    for (const workflow of workflows) {
      if (workflow.statistics) {
        stats.totalExecutions += workflow.statistics.totalExecutions || 0;
        totalTime += (workflow.statistics.averageExecutionTime || 0) * (workflow.statistics.totalExecutions || 0);
      }
    }

    if (stats.totalExecutions > 0) {
      stats.avgExecutionTime = totalTime / stats.totalExecutions;
    }

    return stats;
  }

  /**
   * Export workflow
   */
  async export(id: string, userId: string): Promise<Record<string, unknown> | null> {
    if (!workflow) return null;

    // Remove sensitive data (statistics, createdBy, updatedBy not needed)
    delete exportData.statistics;
    delete exportData.createdBy;
    delete exportData.updatedBy;
    
    return {
      ...exportData,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import workflow
   */
  async import(
    workflowData: Record<string, unknown>,
    userId: string
  ): Promise<Workflow> {
    // Remove import metadata (not needed for new workflow)
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.exportedAt;
    delete data.version;

    return this.create({
      ...data,
      status: 'draft', // Always import as draft
      createdBy: userId,
      updatedBy: userId
    }, userId);
  }

  private generateId(): string {
    return 'wf_' + Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const workflowRepository = new WorkflowRepository();