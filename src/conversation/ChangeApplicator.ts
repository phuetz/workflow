/**
 * ChangeApplicator - Applies workflow changes from conversation intents
 */

import { v4 as uuidv4 } from 'uuid';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from '../services/SimpleLogger';
import {
  WorkflowChange,
  ChangeType,
  ConversationContext,
  WorkflowUpdateResult,
} from './types';

/**
 * Applies parsed changes to workflow nodes and edges
 */
export class ChangeApplicator {
  /**
   * Apply a list of changes to the workflow
   */
  apply(
    changes: WorkflowChange[],
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowUpdateResult {
    const newNodes = [...nodes];
    const newEdges = [...edges];
    const appliedChanges: WorkflowChange[] = [];
    const errors: string[] = [];

    for (const change of changes) {
      try {
        const result = this.applySingleChange(change, newNodes, newEdges);
        if (result.success) {
          appliedChanges.push(change);
        } else if (result.error) {
          errors.push(result.error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to apply change ${change.id}: ${errorMessage}`);
        logger.error(`Change application failed`, { changeId: change.id, error });
      }
    }

    return {
      success: errors.length === 0,
      changes: appliedChanges,
      newNodes,
      newEdges,
      errors: errors.length > 0 ? errors : undefined,
      summary: this.generateSummary(appliedChanges, errors),
    };
  }

  /**
   * Alias for apply() - for backward compatibility
   */
  applyChanges(
    changes: WorkflowChange[],
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowUpdateResult {
    return this.apply(changes, nodes, edges);
  }

  /**
   * Apply a single change to the workflow
   */
  private applySingleChange(
    change: WorkflowChange,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { success: boolean; error?: string } {
    switch (change.type) {
      case 'add_node':
        return this.applyAddNode(change, nodes);
      case 'remove_node':
        return this.applyRemoveNode(change, nodes, edges);
      case 'update_node':
        return this.applyUpdateNode(change, nodes);
      case 'add_edge':
        return this.applyAddEdge(change, edges, nodes);
      case 'remove_edge':
        return this.applyRemoveEdge(change, edges);
      case 'optimize_flow':
        return this.applyOptimization(change, nodes, edges);
      default:
        return { success: false, error: `Unknown change type: ${change.type}` };
    }
  }

  /**
   * Add a new node to the workflow
   */
  private applyAddNode(
    change: WorkflowChange,
    nodes: WorkflowNode[]
  ): { success: boolean; error?: string } {
    const nodeData = change.operation.data as Partial<WorkflowNode> | undefined;

    if (!nodeData) {
      return { success: false, error: 'No node data provided for add_node' };
    }

    const newNode: WorkflowNode = {
      id: nodeData.id || uuidv4(),
      type: nodeData.type || 'default',
      position: nodeData.position || { x: 250, y: 250 },
      data: {
        label: nodeData.data?.label || 'New Node',
        config: nodeData.data?.config || {},
        ...nodeData.data,
      },
    };

    nodes.push(newNode);
    logger.info(`Added node: ${newNode.id}`);

    return { success: true };
  }

  /**
   * Remove a node and its connected edges
   */
  private applyRemoveNode(
    change: WorkflowChange,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { success: boolean; error?: string } {
    const nodeId = change.operation.target;

    if (!nodeId) {
      return { success: false, error: 'No target node ID for remove_node' };
    }

    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return { success: false, error: `Node not found: ${nodeId}` };
    }

    // Remove the node
    nodes.splice(nodeIndex, 1);

    // Remove connected edges
    const edgesToRemove = edges.filter(
      e => e.source === nodeId || e.target === nodeId
    );
    for (const edge of edgesToRemove) {
      const edgeIndex = edges.findIndex(e => e.id === edge.id);
      if (edgeIndex !== -1) {
        edges.splice(edgeIndex, 1);
      }
    }

    logger.info(`Removed node: ${nodeId} and ${edgesToRemove.length} edges`);

    return { success: true };
  }

  /**
   * Update an existing node's configuration
   */
  private applyUpdateNode(
    change: WorkflowChange,
    nodes: WorkflowNode[]
  ): { success: boolean; error?: string } {
    const nodeId = change.operation.target;
    const updateData = change.operation.data as Partial<WorkflowNode['data']> | undefined;

    if (!nodeId) {
      return { success: false, error: 'No target node ID for update_node' };
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      return { success: false, error: `Node not found: ${nodeId}` };
    }

    if (updateData) {
      node.data = {
        ...node.data,
        ...updateData,
        config: {
          ...node.data.config,
          ...(updateData.config || {}),
        },
      };
    }

    logger.info(`Updated node: ${nodeId}`);

    return { success: true };
  }

  /**
   * Add a new edge between nodes
   */
  private applyAddEdge(
    change: WorkflowChange,
    edges: WorkflowEdge[],
    nodes: WorkflowNode[]
  ): { success: boolean; error?: string } {
    const edgeData = change.operation.data as { source?: string; target?: string } | undefined;

    if (!edgeData?.source || !edgeData?.target) {
      return { success: false, error: 'Missing source or target for add_edge' };
    }

    // Validate that both nodes exist
    const sourceExists = nodes.some(n => n.id === edgeData.source);
    const targetExists = nodes.some(n => n.id === edgeData.target);

    if (!sourceExists) {
      return { success: false, error: `Source node not found: ${edgeData.source}` };
    }
    if (!targetExists) {
      return { success: false, error: `Target node not found: ${edgeData.target}` };
    }

    // Check for duplicate edges
    const duplicateExists = edges.some(
      e => e.source === edgeData.source && e.target === edgeData.target
    );
    if (duplicateExists) {
      return { success: false, error: 'Edge already exists' };
    }

    const newEdge: WorkflowEdge = {
      id: uuidv4(),
      source: edgeData.source,
      target: edgeData.target,
    };

    edges.push(newEdge);
    logger.info(`Added edge: ${newEdge.source} -> ${newEdge.target}`);

    return { success: true };
  }

  /**
   * Remove an edge from the workflow
   */
  private applyRemoveEdge(
    change: WorkflowChange,
    edges: WorkflowEdge[]
  ): { success: boolean; error?: string } {
    const edgeId = change.operation.target;

    if (!edgeId) {
      // Try to find by source/target
      const edgeData = change.operation.data as { source?: string; target?: string } | undefined;
      if (edgeData?.source && edgeData?.target) {
        const edgeIndex = edges.findIndex(
          e => e.source === edgeData.source && e.target === edgeData.target
        );
        if (edgeIndex !== -1) {
          edges.splice(edgeIndex, 1);
          return { success: true };
        }
        return { success: false, error: 'Edge not found by source/target' };
      }
      return { success: false, error: 'No edge ID or source/target for remove_edge' };
    }

    const edgeIndex = edges.findIndex(e => e.id === edgeId);
    if (edgeIndex === -1) {
      return { success: false, error: `Edge not found: ${edgeId}` };
    }

    edges.splice(edgeIndex, 1);
    logger.info(`Removed edge: ${edgeId}`);

    return { success: true };
  }

  /**
   * Apply workflow optimizations
   */
  private applyOptimization(
    change: WorkflowChange,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { success: boolean; error?: string } {
    const optimizationType = change.operation.action;

    switch (optimizationType) {
      case 'remove_unused_nodes':
        return this.removeUnusedNodes(nodes, edges);
      case 'parallelize_independent':
        return this.parallelizeIndependentNodes(nodes, edges);
      case 'add_error_handling':
        return this.addErrorHandling(nodes);
      default:
        logger.info(`Generic optimization applied: ${optimizationType}`);
        return { success: true };
    }
  }

  /**
   * Remove nodes that have no connections
   */
  private removeUnusedNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { success: boolean; error?: string } {
    const connectedNodeIds = new Set<string>();

    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    // Keep trigger nodes even if disconnected
    const nodesToRemove = nodes.filter(
      n => !connectedNodeIds.has(n.id) && n.type !== 'trigger'
    );

    for (const node of nodesToRemove) {
      const index = nodes.findIndex(n => n.id === node.id);
      if (index !== -1) {
        nodes.splice(index, 1);
      }
    }

    logger.info(`Removed ${nodesToRemove.length} unused nodes`);

    return { success: true };
  }

  /**
   * Identify and mark nodes that can run in parallel
   */
  private parallelizeIndependentNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { success: boolean; error?: string } {
    // Build dependency graph
    const dependencies = new Map<string, Set<string>>();

    for (const node of nodes) {
      dependencies.set(node.id, new Set());
    }

    for (const edge of edges) {
      dependencies.get(edge.target)?.add(edge.source);
    }

    // Find nodes with same dependencies (can run in parallel)
    const parallelGroups = new Map<string, string[]>();

    for (const [nodeId, deps] of Array.from(dependencies.entries())) {
      const key = Array.from(deps).sort().join(',');
      if (!parallelGroups.has(key)) {
        parallelGroups.set(key, []);
      }
      parallelGroups.get(key)?.push(nodeId);
    }

    // Mark parallel nodes
    for (const [, group] of Array.from(parallelGroups.entries())) {
      if (group.length > 1) {
        for (const nodeId of group) {
          const node = nodes.find(n => n.id === nodeId);
          if (node) {
            node.data = {
              ...node.data,
              config: {
                ...node.data.config,
                parallelGroup: group,
              },
            };
          }
        }
      }
    }

    logger.info(`Identified ${parallelGroups.size} parallel groups`);

    return { success: true };
  }

  /**
   * Add error handling nodes after action nodes
   */
  private addErrorHandling(
    nodes: WorkflowNode[]
  ): { success: boolean; error?: string } {
    for (const node of nodes) {
      const hasErrorHandling = node.data.config?.hasErrorHandling as boolean | undefined;
      if (node.type === 'action' && !hasErrorHandling) {
        node.data = {
          ...node.data,
          config: {
            ...node.data.config,
            hasErrorHandling: true,
            errorConfig: {
              retryCount: 3,
              retryDelay: 1000,
              fallbackAction: 'log_error',
            },
          },
        };
      }
    }

    logger.info('Added error handling configuration to action nodes');

    return { success: true };
  }

  /**
   * Undo a previously applied change
   */
  undoChange(
    change: WorkflowChange,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowUpdateResult {
    if (!change.reversible) {
      return {
        success: false,
        changes: [],
        newNodes: nodes,
        newEdges: edges,
        errors: ['This change is not reversible'],
        summary: 'Undo failed: change is not reversible',
      };
    }

    // Create inverse change
    const inverseChange = this.createInverseChange(change);

    return this.apply([inverseChange], nodes, edges);
  }

  /**
   * Create an inverse change for undo operations
   */
  private createInverseChange(change: WorkflowChange): WorkflowChange {
    const inverseTypeMap: Record<ChangeType, ChangeType> = {
      add_node: 'remove_node',
      remove_node: 'add_node',
      update_node: 'update_node',
      add_edge: 'remove_edge',
      remove_edge: 'add_edge',
      optimize_flow: 'optimize_flow',
    };

    return {
      ...change,
      id: uuidv4(),
      type: inverseTypeMap[change.type],
      timestamp: new Date(),
      description: `Undo: ${change.description}`,
      operation: {
        ...change.operation,
        data: change.operation.before || change.operation.data,
        before: change.operation.data,
      },
    };
  }

  /**
   * Generate a human-readable summary of applied changes
   */
  private generateSummary(
    appliedChanges: WorkflowChange[],
    errors: string[]
  ): string {
    if (appliedChanges.length === 0 && errors.length === 0) {
      return 'No changes were applied.';
    }

    const parts: string[] = [];

    if (appliedChanges.length > 0) {
      const changesByType = appliedChanges.reduce((acc, change) => {
        acc[change.type] = (acc[change.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const changeSummaries = Object.entries(changesByType).map(
        ([type, count]) => `${count} ${type.replace(/_/g, ' ')}${count > 1 ? 's' : ''}`
      );

      parts.push(`Applied ${appliedChanges.length} change(s): ${changeSummaries.join(', ')}`);
    }

    if (errors.length > 0) {
      parts.push(`${errors.length} error(s) occurred`);
    }

    return parts.join('. ');
  }

  /**
   * Validate that a change can be applied
   */
  validateChange(
    change: WorkflowChange,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (change.type) {
      case 'add_node':
        // Validate node data
        if (!change.operation.data) {
          errors.push('Node data is required for add_node');
        }
        break;

      case 'remove_node':
      case 'update_node':
        // Validate target exists
        if (!change.operation.target) {
          errors.push('Target node ID is required');
        } else if (!nodes.some(n => n.id === change.operation.target)) {
          errors.push(`Node not found: ${change.operation.target}`);
        }
        break;

      case 'add_edge':
        const edgeData = change.operation.data as { source?: string; target?: string } | undefined;
        if (!edgeData?.source || !edgeData?.target) {
          errors.push('Source and target are required for add_edge');
        }
        break;

      case 'remove_edge':
        if (!change.operation.target && !change.operation.data) {
          errors.push('Edge ID or source/target required for remove_edge');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
