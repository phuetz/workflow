/**
 * Nodes Slice
 * Handles node CRUD operations, node positions, node data updates
 * Also manages node groups and sticky notes
 */

import { StateCreator } from 'zustand';
import { logger } from '../../services/SimpleLogger';
import { updateTimestampService } from '../../services/UpdateTimestampService';
import { eventNotificationService } from '../../services/EventNotificationService';

export interface Node {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown> & {
    type?: string;
    label?: string;
    config?: Record<string, unknown>;
    disabled?: boolean;
  };
}

export interface NodeGroup {
  id: string;
  name: string;
  color: string;
  nodes: string[];
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  author?: string;
  createdAt?: string;
}

export interface NodesState {
  nodes: Node[];
  selectedNode: Node | null;
  nodeGroups: NodeGroup[];
  stickyNotes: StickyNote[];
  nodeStats: Record<string, number>;
}

export interface NodesActions {
  // Node CRUD
  setNodes: (nodes: Node[]) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<Node['data']>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  setSelectedNode: (node: Node | null) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => Promise<void>;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;

  // Node Groups
  addNodeGroup: (group: NodeGroup) => void;
  updateNodeGroup: (groupId: string, updates: Partial<NodeGroup>) => void;
  deleteNodeGroup: (groupId: string) => void;

  // Sticky Notes
  addStickyNote: (note: StickyNote) => void;
  updateStickyNote: (noteId: string, updates: Partial<StickyNote>) => void;
  deleteStickyNote: (noteId: string) => void;

  // Utility
  getNodeById: (id: string) => Node | undefined;
  getNodesByType: (type: string) => Node[];
}

export type NodesSlice = NodesState & NodesActions;

// Re-export for backwards compatibility
export type NodeSlice = NodesSlice;

export const createNodeSlice: StateCreator<
  NodesSlice & { currentWorkflowId?: string },
  [],
  [],
  NodesSlice
> = (set, get) => ({
  // Initial state
  nodes: [],
  selectedNode: null,
  nodeGroups: [],
  stickyNotes: [],
  nodeStats: {},

  // Node CRUD
  setNodes: (nodes) => set({ nodes }),

  addNode: (node) => {
    try {
      set((state) => {
        if (!node || !node.id || !node.data) {
          throw new Error('Invalid node data');
        }

        if (state.nodes.some(n => n.id === node.id)) {
          throw new Error(`Node with ID ${node.id} already exists`);
        }

        const nodeType = (node.data as { type?: string }).type || 'unknown';
        logger.info(`Adding node ${node.id} of type ${nodeType}`);

        return {
          nodes: [...state.nodes, node],
          nodeStats: {
            ...state.nodeStats,
            [nodeType]: (state.nodeStats[nodeType] || 0) + 1
          }
        };
      });
    } catch (error) {
      logger.error('Failed to add node:', error);
      throw error;
    }
  },

  updateNode: (id, data) => {
    try {
      set((state) => {
        if (!id) {
          throw new Error('Node ID is required for update');
        }

        const nodeIndex = state.nodes.findIndex(n => n.id === id);
        if (nodeIndex === -1) {
          throw new Error(`Node with ID ${id} not found`);
        }

        const updatedNodes = [...state.nodes];
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: { ...updatedNodes[nodeIndex].data, ...data }
        };

        logger.info(`Updated node ${id}`);

        return { nodes: updatedNodes };
      });
    } catch (error) {
      logger.error('Failed to update node:', error);
      throw error;
    }
  },

  deleteNode: (id) => {
    try {
      set((state) => {
        if (!id) {
          throw new Error('Node ID is required for deletion');
        }

        const nodeToDelete = state.nodes.find(n => n.id === id);
        if (!nodeToDelete) {
          throw new Error(`Node with ID ${id} not found`);
        }

        logger.info(`Deleting node ${id}`);

        return {
          nodes: state.nodes.filter(node => node.id !== id),
          selectedNode: state.selectedNode?.id === id ? null : state.selectedNode,
        };
      });
    } catch (error) {
      logger.error('Failed to delete node:', error);
      throw error;
    }
  },

  duplicateNode: (id) => {
    set((state) => {
      const node = state.nodes.find(n => n.id === id);
      if (node) {
        const newNode: Node = {
          ...node,
          id: `${node.id}_copy_${Date.now()}`,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          data: {
            ...node.data,
            label: `${node.data.label || node.data.type || 'Node'} (Copy)`
          }
        };
        logger.info(`Duplicated node ${id} to ${newNode.id}`);
        return { nodes: [...state.nodes, newNode] };
      }
      return {};
    });
  },

  setSelectedNode: (node) => {
    logger.info('Setting selected node:', node?.id || null);
    set({ selectedNode: node });
  },

  updateNodeConfig: async (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    }));

    updateTimestampService.updateTimestamp('node_config', 'updated', { nodeId });
    eventNotificationService.emitEvent('node_configuration_updated', {
      nodeId,
      config
    }, 'workflow_store');

    const state = get();
    const currentWorkflowId = (state as { currentWorkflowId?: string }).currentWorkflowId;
    if (currentWorkflowId) {
      try {
        const response = await fetch(`/api/workflows/${currentWorkflowId}/nodes/${nodeId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ config })
        });

        if (!response.ok) {
          logger.error('Failed to update node config on server');
        }
      } catch (error) {
        logger.error('Error updating node config:', error);
      }
    }
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map(node =>
        node.id === id ? { ...node, position } : node
      )
    }));
  },

  // Node Groups
  addNodeGroup: (group) => set((state) => ({
    nodeGroups: [...state.nodeGroups, group]
  })),

  updateNodeGroup: (groupId, updates) => set((state) => ({
    nodeGroups: state.nodeGroups.map(group =>
      group.id === groupId ? { ...group, ...updates } : group
    )
  })),

  deleteNodeGroup: (groupId) => set((state) => ({
    nodeGroups: state.nodeGroups.filter(g => g.id !== groupId),
  })),

  // Sticky Notes
  addStickyNote: (note) => set((state) => ({
    stickyNotes: [...state.stickyNotes, note]
  })),

  updateStickyNote: (noteId, updates) => set((state) => {
    const noteWidth = 200;
    const noteHeight = 100;
    const delta = 20;

    const isOverlapping = (x: number, y: number): boolean => {
      return state.stickyNotes.some((n) => {
        if (n.id === noteId) return false;
        return (
          x < n.position.x + noteWidth &&
          x + noteWidth > n.position.x &&
          y < n.position.y + noteHeight &&
          y + noteHeight > n.position.y
        );
      });
    };

    const stickyNotes = state.stickyNotes.map((note) => {
      if (note.id !== noteId) return note;

      const updated = { ...note, ...updates };
      if (updates.position) {
        let { x, y } = updates.position;
        let attempts = 0;
        while (isOverlapping(x, y) && attempts < 20) {
          x += delta;
          y += delta;
          attempts++;
        }
        updated.position = { x, y };
      }
      return updated;
    });

    return { stickyNotes };
  }),

  deleteStickyNote: (noteId) => set((state) => ({
    stickyNotes: state.stickyNotes.filter(note => note.id !== noteId)
  })),

  // Utility
  getNodeById: (id) => {
    return get().nodes.find(n => n.id === id);
  },

  getNodesByType: (type) => {
    return get().nodes.filter(n => n.data.type === type);
  }
});
