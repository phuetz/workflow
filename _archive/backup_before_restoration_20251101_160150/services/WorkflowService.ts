/**
 * Workflow Management Service
 * Handles workflow CRUD operations, validation, and execution
 */

 

import { BaseService } from './BaseService';
import { useWorkflowStore } from '../store/workflowStore';
import { logger } from './LoggingService';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

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
}

export class WorkflowService extends BaseService {
  private static instance: WorkflowService;
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  
  public static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  constructor() {
    super('WorkflowService');
    this.initializeService();
  }

  protected async initializeService(): Promise<void> {
    await super.initializeService();
    // Load workflows from store
    this.loadWorkflowsFromStore();
  }

  private loadWorkflowsFromStore(): void {
    try {
      const { _nodes, edges, workflows } = store;
      
      // Create default workflow if nodes/edges exist but no workflows
      if (nodes.length > 0 && Object.keys(workflows).length === 0) {
        const defaultWorkflow: Workflow = {
          id: 'default',
          name: 'Default Workflow',
          nodes: nodes as WorkflowNode[],
          edges: edges as WorkflowEdge[],
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
          isActive: true,
          version: 1
        };
        this.workflows.set(defaultWorkflow.id, defaultWorkflow);
      }
      
      // Load existing workflows
      Object.entries(workflows).forEach(([id, workflowData]) => {
        const workflow: Workflow = {
          id,
          name: (workflowData as unknown).name || `Workflow ${id}`,
          description: (workflowData as unknown).description,
          nodes: (workflowData as unknown).nodes || [],
          edges: (workflowData as unknown).edges || [],
          createdAt: new Date((workflowData as unknown).createdAt || Date.now()),
          updatedAt: new Date((workflowData as unknown).updatedAt || Date.now()),
          lastExecutedAt: (workflowData as unknown).lastExecutedAt ? new Date((workflowData as unknown).lastExecutedAt) : undefined,
          executionCount: (workflowData as unknown).executionCount || 0,
          isActive: (workflowData as unknown).isActive !== false,
          version: (workflowData as unknown).version || 1,
          tags: (workflowData as unknown).tags,
          metadata: (workflowData as unknown).metadata
        };
        this.workflows.set(id, workflow);
      });
    } catch (error) {
      logger.error('Failed to load workflows from store', error);
    }
  }

  async listWorkflows(filter?: WorkflowFilter): Promise<Workflow[]> {
    
    // Apply filters
    if (filter) {
      if (filter.tags && filter.tags.length > 0) {
        workflows = workflows.filter(w => 
          w.tags && filter.tags!.some(tag => w.tags!.includes(tag))
        );
      }
      
      if (filter.isActive !== undefined) {
        workflows = workflows.filter(w => w.isActive === filter.isActive);
      }
      
      if (filter.search) {
        workflows = workflows.filter(w => 
          w.name.toLowerCase().includes(searchLower) ||
          (w.description && w.description.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply sorting
      if (filter.sortBy) {
        workflows.sort((a, b) => {
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
    }
    
    return workflows;
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null;
  }

  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'version'>): Promise<Workflow> {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `workflow_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      version: 1,
      isActive: workflow.isActive !== false
    };

    this.workflows.set(newWorkflow.id, newWorkflow);
    
    // Update store
    this.updateStore(newWorkflow);
    
    logger.info(`Created workflow: ${newWorkflow.id}`);
    return newWorkflow;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
    if (!workflow) {
      return null;
    }

    const updatedWorkflow: Workflow = {
      ...workflow,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
      version: workflow.version + 1
    };

    this.workflows.set(id, updatedWorkflow);
    
    // Update store
    this.updateStore(updatedWorkflow);
    
    logger.info(`Updated workflow: ${id}`);
    return updatedWorkflow;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    if (!workflow) {
      return false;
    }

    this.workflows.delete(id);
    
    // Remove from store
    delete workflows[id];
    store.updateState({ workflows });
    
    logger.info(`Deleted workflow: ${id}`);
    return true;
  }

  async duplicateWorkflow(id: string, newName?: string): Promise<Workflow | null> {
    if (!original) {
      return null;
    }

      name: newName || `${original.name} (Copy)`,
      description: original.description,
      nodes: JSON.parse(JSON.stringify(original.nodes)), // Deep clone
      edges: JSON.parse(JSON.stringify(original.edges)), // Deep clone
      isActive: original.isActive,
      tags: original.tags ? [...original.tags] : undefined,
      metadata: original.metadata ? { ...original.metadata } : undefined
    });

    return duplicate;
  }

  async validateWorkflow(id: string): Promise<{ isValid: boolean; errors: string[] }> {
    if (!workflow) {
      return { isValid: false, errors: ['Workflow not found'] };
    }

    const errors: string[] = [];
    
    // Check for orphaned nodes
    workflow.edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    });
    
    // Check for nodes without connections (except triggers)
    workflow.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    workflow.nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && node.type !== 'trigger') {
        errors.push(`Node ${node.id} is not connected to any other nodes`);
      }
    });
    
    // Check for circular dependencies
    if (this.hasCircularDependency(workflow)) {
      errors.push('Workflow contains circular dependencies');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private hasCircularDependency(workflow: Workflow): boolean {
    const adjacencyList: Map<string, string[]> = new Map();
    
    // Build adjacency list
    workflow.nodes.forEach(node => {
      adjacencyList.set(node.id, []);
    });
    
    workflow.edges.forEach(edge => {
      neighbors.push(edge.target);
      adjacencyList.set(edge.source, neighbors);
    });
    
    // DFS to detect cycles
    
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
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

  private updateStore(workflow: Workflow): void {
    try {
        ...store.workflows,
        [workflow.id]: {
          ...workflow,
          createdAt: workflow.createdAt.toISOString(),
          updatedAt: workflow.updatedAt.toISOString(),
          lastExecutedAt: workflow.lastExecutedAt?.toISOString()
        }
      };
      store.updateState({ workflows });
    } catch (error) {
      logger.error('Failed to update workflow in store', error);
    }
  }

  // Execution tracking methods
  async startExecution(workflowId: string): Promise<WorkflowExecution> {
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      workflowId,
      status: 'running',
      startedAt: new Date()
    };

    this.executions.set(execution.id, execution);
    
    // Update workflow execution count
    workflow.executionCount++;
    workflow.lastExecutedAt = new Date();
    this.workflows.set(workflowId, workflow);
    
    return execution;
  }

  async completeExecution(executionId: string, results?: Record<string, unknown>, errors?: Array<{ nodeId: string; error: string }>): Promise<void> {
    if (!execution) {
      return;
    }

    execution.status = errors && errors.length > 0 ? 'failed' : 'completed';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    execution.results = results;
    execution.errors = errors;

    this.executions.set(executionId, execution);
  }

  async getExecutionHistory(workflowId: string, limit = 10): Promise<WorkflowExecution[]> {
    return Array.from(this.executions.values())
      .filter(exec => exec.workflowId === workflowId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  // Utility methods for backup service
  async exportWorkflows(): Promise<Record<string, unknown>> {
    const exported: Record<string, unknown> = {};
    
    this.workflows.forEach((workflow, id) => {
      exported[id] = {
        ...workflow,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        lastExecutedAt: workflow.lastExecutedAt?.toISOString()
      };
    });
    
    return exported;
  }

  async importWorkflows(data: Record<string, unknown>): Promise<void> {
    Object.entries(data).forEach(([id, workflowData]) => {
      const workflow: Workflow = {
        ...(workflowData as unknown),
        createdAt: new Date((workflowData as unknown).createdAt),
        updatedAt: new Date((workflowData as unknown).updatedAt),
        lastExecutedAt: (workflowData as unknown).lastExecutedAt ? new Date((workflowData as unknown).lastExecutedAt) : undefined
      };
      this.workflows.set(id, workflow);
    });
    
    logger.info(`Imported ${Object.keys(data).length} workflows`);
  }
}

// Export singleton instance
export const workflowService = WorkflowService.getInstance();