/**
 * Edges Slice
 * Handles edge CRUD operations and edge validation
 */

import type { StateCreator } from 'zustand';
import { logger } from '../../services/SimpleLogger';

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
  data?: Record<string, unknown>;
  label?: string;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
}

export interface EdgeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EdgesState {
  edges: Edge[];
  selectedEdge: Edge | null;
}

export interface EdgesActions {
  setEdges: (edges: Edge[]) => void;
  addEdge: (edge: Edge) => void;
  updateEdge: (id: string, data: Partial<Edge>) => void;
  deleteEdge: (id: string) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  validateEdge: (edge: Edge) => EdgeValidationResult;
  validateAllEdges: () => EdgeValidationResult;
  getEdgesByNode: (nodeId: string) => { incoming: Edge[]; outgoing: Edge[] };
  deleteEdgesByNode: (nodeId: string) => void;
}

export type EdgesSlice = EdgesState & EdgesActions;

export const createEdgesSlice: StateCreator<
  EdgesSlice & { nodes: Array<{ id: string }> },
  [],
  [],
  EdgesSlice
> = (set, get) => ({
  // Initial state
  edges: [],
  selectedEdge: null,

  // Actions
  setEdges: (edges) => set({ edges }),

  addEdge: (edge) => {
    try {
      set((state) => {
        // Validate edge data
        if (!edge || !edge.id || !edge.source || !edge.target) {
          throw new Error('Invalid edge data: missing required fields');
        }

        // Check for duplicate edge IDs
        if (state.edges.some(e => e.id === edge.id)) {
          throw new Error(`Edge with ID ${edge.id} already exists`);
        }

        // Validate source and target nodes exist
        const nodeIds = new Set(state.nodes.map(n => n.id));
        if (!nodeIds.has(edge.source)) {
          throw new Error(`Source node ${edge.source} does not exist`);
        }
        if (!nodeIds.has(edge.target)) {
          throw new Error(`Target node ${edge.target} does not exist`);
        }

        // Prevent self-referencing edges
        if (edge.source === edge.target) {
          throw new Error('Cannot create edge from a node to itself');
        }

        // Check for duplicate connection (same source, target, and handles)
        const isDuplicate = state.edges.some(e =>
          e.source === edge.source &&
          e.target === edge.target &&
          e.sourceHandle === edge.sourceHandle &&
          e.targetHandle === edge.targetHandle
        );

        if (isDuplicate) {
          throw new Error('Duplicate edge connection already exists');
        }

        logger.info(`Adding edge ${edge.id}: ${edge.source} -> ${edge.target}`);

        return {
          edges: [...state.edges, edge]
        };
      });
    } catch (error) {
      logger.error('Failed to add edge:', error);
      throw error;
    }
  },

  updateEdge: (id, data) => {
    try {
      set((state) => {
        if (!id) {
          throw new Error('Edge ID is required for update');
        }

        const edgeIndex = state.edges.findIndex(e => e.id === id);
        if (edgeIndex === -1) {
          throw new Error(`Edge with ID ${id} not found`);
        }

        const updatedEdges = [...state.edges];
        updatedEdges[edgeIndex] = {
          ...updatedEdges[edgeIndex],
          ...data,
          data: {
            ...updatedEdges[edgeIndex].data,
            ...data.data
          }
        };

        logger.info(`Updated edge ${id}`);

        return { edges: updatedEdges };
      });
    } catch (error) {
      logger.error('Failed to update edge:', error);
      throw error;
    }
  },

  deleteEdge: (id) => {
    try {
      set((state) => {
        if (!id) {
          throw new Error('Edge ID is required for deletion');
        }

        const edgeExists = state.edges.some(e => e.id === id);
        if (!edgeExists) {
          throw new Error(`Edge with ID ${id} not found`);
        }

        logger.info(`Deleting edge ${id}`);

        return {
          edges: state.edges.filter(e => e.id !== id),
          selectedEdge: state.selectedEdge?.id === id ? null : state.selectedEdge
        };
      });
    } catch (error) {
      logger.error('Failed to delete edge:', error);
      throw error;
    }
  },

  setSelectedEdge: (edge) => set({ selectedEdge: edge }),

  validateEdge: (edge) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const state = get();

    // Check required fields
    if (!edge.id) errors.push('Edge is missing an ID');
    if (!edge.source) errors.push('Edge is missing a source node');
    if (!edge.target) errors.push('Edge is missing a target node');

    // Check node existence
    const nodeIds = new Set(state.nodes.map(n => n.id));
    if (edge.source && !nodeIds.has(edge.source)) {
      errors.push(`Source node ${edge.source} does not exist`);
    }
    if (edge.target && !nodeIds.has(edge.target)) {
      errors.push(`Target node ${edge.target} does not exist`);
    }

    // Check for self-reference
    if (edge.source && edge.target && edge.source === edge.target) {
      warnings.push('Edge connects a node to itself');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  validateAllEdges: () => {
    const state = get();
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const nodeIds = new Set(state.nodes.map(n => n.id));

    // Check each edge
    state.edges.forEach(edge => {
      const result = state.validateEdge(edge);
      allErrors.push(...result.errors.map(e => `Edge ${edge.id}: ${e}`));
      allWarnings.push(...result.warnings.map(w => `Edge ${edge.id}: ${w}`));
    });

    // Check for orphaned edges (edges pointing to non-existent nodes)
    const orphanedEdges = state.edges.filter(e =>
      !nodeIds.has(e.source) || !nodeIds.has(e.target)
    );
    if (orphanedEdges.length > 0) {
      allErrors.push(`Found ${orphanedEdges.length} orphaned edges`);
    }

    // Check for duplicate edges
    const edgeSignatures = new Set<string>();
    state.edges.forEach(edge => {
      const signature = `${edge.source}-${edge.target}-${edge.sourceHandle || ''}-${edge.targetHandle || ''}`;
      if (edgeSignatures.has(signature)) {
        allWarnings.push(`Duplicate edge connection: ${edge.source} -> ${edge.target}`);
      }
      edgeSignatures.add(signature);
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  },

  getEdgesByNode: (nodeId) => {
    const state = get();
    return {
      incoming: state.edges.filter(e => e.target === nodeId),
      outgoing: state.edges.filter(e => e.source === nodeId)
    };
  },

  deleteEdgesByNode: (nodeId) => {
    set((state) => ({
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      selectedEdge: state.selectedEdge &&
        (state.selectedEdge.source === nodeId || state.selectedEdge.target === nodeId)
        ? null
        : state.selectedEdge
    }));
  }
});
