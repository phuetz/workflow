/**
 * Workflow Management Service - MIGRATED VERSION
 * Now uses database repositories with migration adapter for smooth transition
 *
 * Migration Status: PHASE 2 - Using ServiceMigrationAdapter
 * - Dual mode operation (memory + database)
 * - Backward compatible with existing API
 * - Enhanced with EventBus integration
 * - Monitoring and tracing enabled
 */

import { BaseService } from './BaseService';
import { logger } from './LoggingService';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { workflowRepository, executionRepository } from '../backend/database/repositories';
import { ServiceMigrationAdapter } from '../backend/services/ServiceMigrationAdapter';
import { EventBus } from '../backend/services/EventBus';
import type { Workflow as DBWorkflow } from '@prisma/client';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  executionCount: number;
  isActive: boolean;
  version: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  results?: Record<string, unknown>;
  errors?: Array<{ nodeId: string; error: string }>;
}

export interface WorkflowFilter {
  tags?: string[];
  isActive?: boolean;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'executionCount';
  sortOrder?: 'asc' | 'desc';
  userId?: string;
}

export class WorkflowService extends BaseService {
  private static instance: WorkflowService;
  private adapter: ServiceMigrationAdapter<Workflow>;
  private eventBus?: EventBus;

  public static getInstance(eventBus?: EventBus): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService(eventBus);
    }
    return WorkflowService.instance;
  }

  constructor(eventBus?: EventBus) {
    super('WorkflowService');
    this.eventBus = eventBus;

    // Initialize migration adapter in dual mode
    this.adapter = new ServiceMigrationAdapter<Workflow>(
      'workflows',
      {
        mode: 'dual', // Start in dual mode for safe migration
        syncToDatabase: true,
        syncFromDatabase: true,
        fallbackToMemory: true,
      },
      eventBus
    );

    this.initializeService();
  }

  protected async initializeService(): Promise<void> {
    await super.initializeService();
    logger.info('WorkflowService initialized with database support');
  }

  /**
   * Convert database workflow to service format
   */
  private dbToService(dbWorkflow: any): Workflow {
    return {
      id: dbWorkflow.id,
      name: dbWorkflow.name,
      description: dbWorkflow.description || undefined,
      nodes: Array.isArray(dbWorkflow.nodes) ? dbWorkflow.nodes : [],
      edges: Array.isArray(dbWorkflow.edges) ? dbWorkflow.edges : [],
      createdAt: new Date(dbWorkflow.createdAt),
      updatedAt: new Date(dbWorkflow.updatedAt),
      lastExecutedAt: dbWorkflow.lastExecutedAt ? new Date(dbWorkflow.lastExecutedAt) : undefined,
      executionCount: dbWorkflow.executionCount || 0,
      isActive: dbWorkflow.isActive,
      version: dbWorkflow.version,
      tags: dbWorkflow.tags || undefined,
      metadata: dbWorkflow.metadata ? (typeof dbWorkflow.metadata === 'object' ? dbWorkflow.metadata : {}) : undefined,
      userId: dbWorkflow.userId,
    };
  }

  /**
   * List workflows with optional filtering
   */
  async listWorkflows(filter?: WorkflowFilter): Promise<Workflow[]> {
    try {
      const workflows = await this.adapter.list(async () => {
        // Fetch from database
        const dbWorkflows = await workflowRepository.findMany({
          isActive: filter?.isActive,
          tags: filter?.tags,
          userId: filter?.userId,
        });

        return dbWorkflows.map(this.dbToService);
      });

      // Apply client-side filters
      let filtered = workflows;

      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        filtered = filtered.filter(w =>
          w.name.toLowerCase().includes(searchLower) ||
          (w.description && w.description.toLowerCase().includes(searchLower))
        );
      }

      // Apply sorting
      if (filter?.sortBy) {
        filtered.sort((a, b) => {
          let compareValue = 0;
          switch (filter.sortBy) {
            case 'name':
              compareValue = a.name.localeCompare(b.name);
              break;
            case 'createdAt':
              compareValue = a.createdAt.getTime() - b.createdAt.getTime();
              break;
            case 'updatedAt':
              compareValue = a.updatedAt.getTime() - b.updatedAt.getTime();
              break;
            case 'executionCount':
              compareValue = a.executionCount - b.executionCount;
              break;
          }
          return filter.sortOrder === 'desc' ? -compareValue : compareValue;
        });
      }

      return filtered;
    } catch (error) {
      logger.error('Failed to list workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow | null> {
    try {
      return await this.adapter.get(id, async (workflowId) => {
        const dbWorkflow = await workflowRepository.findById(workflowId);
        return dbWorkflow ? this.dbToService(dbWorkflow) : null;
      });
    } catch (error) {
      logger.error(`Failed to get workflow ${id}:`, error);
      return null;
    }
  }

  /**
   * Create new workflow
   */
  async createWorkflow(
    workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'version'>,
    userId?: string
  ): Promise<Workflow> {
    try {
      const newWorkflow: Workflow = {
        ...workflow,
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
        version: 1,
        isActive: workflow.isActive !== false,
        userId: userId || workflow.userId,
      };

      const created = await this.adapter.set(
        newWorkflow.id,
        newWorkflow,
        async (id, data) => {
          const dbWorkflow = await workflowRepository.create({
            name: data.name,
            description: data.description,
            nodes: data.nodes as any,
            edges: data.edges as any,
            userId: data.userId || 'system',
            tags: data.tags,
            settings: data.metadata || {},
          });
          return this.dbToService(dbWorkflow);
        }
      );

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit({
          id: `workflow-created-${created.id}`,
          type: 'workflow.created',
          timestamp: new Date(),
          source: 'WorkflowService',
          data: {
            workflowId: created.id,
            name: created.name,
            userId: created.userId,
          },
        });
      }

      logger.info(`Created workflow: ${created.id}`);
      return created;
    } catch (error) {
      logger.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
    try {
      const existing = await this.getWorkflow(id);
      if (!existing) {
        logger.warn(`Workflow ${id} not found for update`);
        return null;
      }

      const updated: Workflow = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
        version: existing.version + 1,
      };

      const result = await this.adapter.set(id, updated, async (workflowId, data) => {
        const dbWorkflow = await workflowRepository.update(workflowId, {
          name: data.name,
          description: data.description,
          nodes: data.nodes as any,
          edges: data.edges as any,
          tags: data.tags,
          isActive: data.isActive,
          settings: data.metadata || {},
        });
        return dbWorkflow ? this.dbToService(dbWorkflow) : data;
      });

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit({
          id: `workflow-updated-${id}`,
          type: 'workflow.updated',
          timestamp: new Date(),
          source: 'WorkflowService',
          data: {
            workflowId: id,
            updates: Object.keys(updates),
          },
        });
      }

      logger.info(`Updated workflow: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Failed to update workflow ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    try {
      const deleted = await this.adapter.delete(id, async (workflowId) => {
        return await workflowRepository.delete(workflowId);
      });

      if (deleted && this.eventBus) {
        this.eventBus.emit({
          id: `workflow-deleted-${id}`,
          type: 'workflow.deleted',
          timestamp: new Date(),
          source: 'WorkflowService',
          data: { workflowId: id },
        });
      }

      logger.info(`Deleted workflow: ${id}`);
      return deleted;
    } catch (error) {
      logger.error(`Failed to delete workflow ${id}:`, error);
      return false;
    }
  }

  /**
   * Duplicate workflow
   */
  async duplicateWorkflow(id: string, newName?: string, userId?: string): Promise<Workflow | null> {
    try {
      const original = await this.getWorkflow(id);
      if (!original) {
        return null;
      }

      const duplicate = await this.createWorkflow(
        {
          name: newName || `${original.name} (Copy)`,
          description: original.description,
          nodes: JSON.parse(JSON.stringify(original.nodes)), // Deep clone
          edges: JSON.parse(JSON.stringify(original.edges)), // Deep clone
          isActive: original.isActive,
          tags: original.tags ? [...original.tags] : undefined,
          metadata: original.metadata ? { ...original.metadata } : undefined,
        },
        userId || original.userId
      );

      if (this.eventBus) {
        this.eventBus.emit({
          id: `workflow-cloned-${duplicate.id}`,
          type: 'workflow.cloned',
          timestamp: new Date(),
          source: 'WorkflowService',
          data: {
            originalId: id,
            newId: duplicate.id,
          },
        });
      }

      return duplicate;
    } catch (error) {
      logger.error(`Failed to duplicate workflow ${id}:`, error);
      return null;
    }
  }

  /**
   * Validate workflow structure
   */
  async validateWorkflow(id: string): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const workflow = await this.getWorkflow(id);
      if (!workflow) {
        return { isValid: false, errors: ['Workflow not found'] };
      }

      const errors: string[] = [];
      const nodeIds = new Set(workflow.nodes.map(n => n.id));

      // Check for orphaned edges
      workflow.edges.forEach(edge => {
        if (!nodeIds.has(edge.source)) {
          errors.push(`Edge references non-existent source node: ${edge.source}`);
        }
        if (!nodeIds.has(edge.target)) {
          errors.push(`Edge references non-existent target node: ${edge.target}`);
        }
      });

      // Check for circular dependencies
      if (this.hasCircularDependency(workflow)) {
        errors.push('Workflow contains circular dependencies');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      logger.error(`Failed to validate workflow ${id}:`, error);
      return { isValid: false, errors: ['Validation error: ' + String(error)] };
    }
  }

  /**
   * Check for circular dependencies using DFS
   */
  private hasCircularDependency(workflow: Workflow): boolean {
    const adjacencyList: Map<string, string[]> = new Map();

    // Build adjacency list
    workflow.nodes.forEach(node => {
      adjacencyList.set(node.id, []);
    });

    workflow.edges.forEach(edge => {
      const neighbors = adjacencyList.get(edge.source) || [];
      neighbors.push(edge.target);
      adjacencyList.set(edge.source, neighbors);
    });

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of adjacencyList.keys()) {
      if (!visited.has(nodeId)) {
        if (hasCycle(nodeId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get workflow statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalExecutions: number;
  }> {
    try {
      const stats = await workflowRepository.getStatistics();
      return {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        totalExecutions: 0, // TODO: Add from execution repository
      };
    } catch (error) {
      logger.error('Failed to get workflow statistics:', error);
      return { total: 0, active: 0, inactive: 0, totalExecutions: 0 };
    }
  }

  /**
   * Get migration adapter (for monitoring and management)
   */
  getAdapter(): ServiceMigrationAdapter<Workflow> {
    return this.adapter;
  }

  /**
   * Switch to database-only mode (final migration step)
   */
  async switchToDatabaseOnly(): Promise<void> {
    logger.info('Switching WorkflowService to database-only mode');
    this.adapter.setMode('database-only');

    // Clear memory to free up resources
    this.adapter.clearMemory();

    logger.info('WorkflowService now running in database-only mode');
  }
}

// Export singleton instance
export const workflowService = WorkflowService.getInstance();
