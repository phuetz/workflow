/**
 * Multi-Select Slice
 * Handles multi-selection and bulk operations
 */

import type { StateCreator } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { logger } from '../../services/SimpleLogger';

export interface MultiSelectState {
  selectedNodes: string[];
}

export interface MultiSelectActions {
  setSelectedNodes: (nodes: string[]) => void;
  deleteSelectedNodes: () => void;
  copySelectedNodes: () => void;
  pasteNodes: () => void;
  alignNodes: (direction: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY') => void;
  distributeNodes: (orientation: 'horizontal' | 'vertical') => void;
  groupSelectedNodes: () => void;
  ungroupSelectedNodes: () => void;
  selectAllNodes: () => void;
  selectNodesByType: (nodeType: string) => void;
  selectNodesByCategory: (category: string) => void;
  selectDisabledNodes: () => void;
  selectErrorNodes: () => void;
  invertSelection: () => void;

  // Bulk operations
  bulkEnableNodes: () => void;
  bulkDisableNodes: () => void;
  bulkConfigureNodes: (configUpdates: Record<string, unknown>) => void;
  bulkSetRetryConfig: (retryConfig: { enabled: boolean; maxRetries?: number; retryInterval?: number }) => void;
  bulkSetTimeout: (timeoutMs: number) => void;
  bulkSetContinueOnFail: (continueOnFail: boolean) => void;
  bulkDuplicateNodes: () => void;
  bulkMoveNodes: (deltaX: number, deltaY: number) => void;
  bulkSetColor: (color: string) => void;
  bulkSetNotes: (notes: string) => void;
}

export type MultiSelectSlice = MultiSelectState & MultiSelectActions;

interface NodeData {
  type?: string;
  category?: string;
  disabled?: boolean;
  label?: string;
  config?: Record<string, unknown>;
  retryOnFail?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  timeout?: number;
  continueOnFail?: boolean;
  color?: string;
  notes?: string;
}

export const createMultiSelectSlice: StateCreator<
  MultiSelectSlice & {
    nodes: Node[];
    edges: Edge[];
    nodeGroups: Array<{ id: string; name: string; color: string; nodes: string[]; position: { x: number; y: number }; size: { width: number; height: number } }>;
    executionErrors: Record<string, unknown>;
    addToHistory: (nodes: Node[], edges: Edge[]) => Promise<void>;
  },
  [],
  [],
  MultiSelectSlice
> = (set, get) => ({
  // Initial state
  selectedNodes: [],

  // Actions
  setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),

  deleteSelectedNodes: () => {
    set((state) => {
      const nodeIdsToDelete = state.selectedNodes;
      return {
        nodes: state.nodes.filter(n => !nodeIdsToDelete.includes(n.id)),
        edges: state.edges.filter(e =>
          !nodeIdsToDelete.includes(e.source) && !nodeIdsToDelete.includes(e.target)
        ),
        selectedNodes: []
      };
    });
  },

  copySelectedNodes: () => {
    const state = get();
    const nodeObjects = state.selectedNodes
      .map(id => state.nodes.find(n => n.id === id))
      .filter(Boolean) as Node[];
    const edgesToCopy = state.edges.filter(e =>
      nodeObjects.some(n => n.id === e.source) && nodeObjects.some(n => n.id === e.target)
    );

    if (Array.isArray(nodeObjects) && Array.isArray(edgesToCopy)) {
      localStorage.setItem('copiedNodes', JSON.stringify({
        nodes: nodeObjects,
        edges: edgesToCopy
      }));
    }
  },

  pasteNodes: () => {
    const copied = localStorage.getItem('copiedNodes');
    if (!copied) return;

    try {
      const { nodes: copiedNodes = [], edges: copiedEdges = [] } = JSON.parse(copied);
      const idMap: Record<string, string> = {};
      const offset = 50;

      const newNodes = copiedNodes.map((n: Node) => {
        const newId = `${n.id}_copy_${Date.now()}`;
        idMap[n.id] = newId;
        return {
          ...n,
          id: newId,
          position: {
            x: n.position.x + offset,
            y: n.position.y + offset
          }
        };
      });

      const newEdges = copiedEdges.map((e: Edge) => ({
        ...e,
        id: `${e.id}_copy_${Date.now()}`,
        source: idMap[e.source],
        target: idMap[e.target]
      }));

      set((state) => {
        state.addToHistory(state.nodes, state.edges);
        return {
          nodes: [...state.nodes, ...newNodes],
          edges: [...state.edges, ...newEdges]
        };
      });
    } catch (err) {
      logger.error('Error pasting nodes', err);
    }
  },

  alignNodes: (direction) => {
    set((state) => {
      const selected = state.nodes.filter(n => state.selectedNodes.includes(n.id));
      if (selected.length < 2) return state;

      const xs = selected.map(n => n.position.x);
      const ys = selected.map(n => n.position.y);

      const targetX = direction === 'left' ? Math.min(...xs)
        : direction === 'right' ? Math.max(...xs)
        : direction === 'centerX' ? (Math.min(...xs) + Math.max(...xs)) / 2
        : null;

      const targetY = direction === 'top' ? Math.min(...ys)
        : direction === 'bottom' ? Math.max(...ys)
        : direction === 'centerY' ? (Math.min(...ys) + Math.max(...ys)) / 2
        : null;

      return {
        nodes: state.nodes.map(n => {
          if (selected.some(sn => sn.id === n.id)) {
            return {
              ...n,
              position: {
                x: targetX !== null ? targetX : n.position.x,
                y: targetY !== null ? targetY : n.position.y
              }
            };
          }
          return n;
        })
      };
    });
  },

  distributeNodes: (orientation) => {
    set((state) => {
      const selected = state.nodes.filter(n => state.selectedNodes.includes(n.id));
      if (selected.length < 3) return state;

      const key = orientation === 'horizontal' ? 'x' : 'y';
      const sortedSelected = [...selected].sort((a, b) => a.position[key] - b.position[key]);

      const start = sortedSelected[0].position[key];
      const end = sortedSelected[sortedSelected.length - 1].position[key];
      const gap = (end - start) / (sortedSelected.length - 1);

      return {
        nodes: state.nodes.map(n => {
          const idx = sortedSelected.findIndex(sn => sn.id === n.id);
          if (idx !== -1) {
            return {
              ...n,
              position: {
                ...n.position,
                [key]: start + gap * idx
              }
            };
          }
          return n;
        })
      };
    });
  },

  groupSelectedNodes: () => {
    set((state) => {
      if (state.selectedNodes.length < 2) return state;

      const selectedNodeObjects = state.nodes.filter(n => state.selectedNodes.includes(n.id));
      const minX = Math.min(...selectedNodeObjects.map(n => n.position.x));
      const maxX = Math.max(...selectedNodeObjects.map(n => n.position.x));
      const minY = Math.min(...selectedNodeObjects.map(n => n.position.y));
      const maxY = Math.max(...selectedNodeObjects.map(n => n.position.y));

      const groupId = `group_${Date.now()}`;
      const group = {
        id: groupId,
        name: `Group ${(state.nodeGroups?.length || 0) + 1}`,
        color: '#3b82f6',
        nodes: state.selectedNodes,
        position: { x: minX - 20, y: minY - 20 },
        size: { width: maxX - minX + 240, height: maxY - minY + 140 }
      };

      return {
        nodeGroups: [...(state.nodeGroups || []), group],
        selectedNodes: []
      };
    });
  },

  ungroupSelectedNodes: () => {
    set((state) => {
      const nodeIds = state.selectedNodes;
      return {
        nodeGroups: (state.nodeGroups || []).filter(group =>
          !group.nodes.some(nodeId => nodeIds.includes(nodeId))
        ),
        selectedNodes: []
      };
    });
  },

  selectAllNodes: () => {
    set((state) => ({
      selectedNodes: state.nodes.map(n => n.id)
    }));
  },

  selectNodesByType: (nodeType) => {
    set((state) => ({
      selectedNodes: state.nodes
        .filter(n => (n.data as NodeData)?.type === nodeType)
        .map(n => n.id)
    }));
  },

  selectNodesByCategory: (category) => {
    set((state) => ({
      selectedNodes: state.nodes
        .filter(n => (n.data as NodeData)?.category === category)
        .map(n => n.id)
    }));
  },

  selectDisabledNodes: () => {
    set((state) => ({
      selectedNodes: state.nodes
        .filter(n => (n.data as NodeData)?.disabled === true)
        .map(n => n.id)
    }));
  },

  selectErrorNodes: () => {
    set((state) => ({
      selectedNodes: state.nodes
        .filter(n => state.executionErrors[n.id])
        .map(n => n.id)
    }));
  },

  invertSelection: () => {
    set((state) => ({
      selectedNodes: state.nodes
        .filter(n => !state.selectedNodes.includes(n.id))
        .map(n => n.id)
    }));
  },

  // Bulk operations
  bulkEnableNodes: () => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? { ...node, data: { ...node.data, disabled: false } }
            : node
        )
      };
    });
  },

  bulkDisableNodes: () => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? { ...node, data: { ...node.data, disabled: true } }
            : node
        )
      };
    });
  },

  bulkConfigureNodes: (configUpdates) => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: { ...(node.data as NodeData).config, ...configUpdates }
                }
              }
            : node
        )
      };
    });
  },

  bulkSetRetryConfig: (retryConfig) => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? {
                ...node,
                data: {
                  ...node.data,
                  retryOnFail: retryConfig.enabled,
                  maxRetries: retryConfig.maxRetries ?? 3,
                  retryInterval: retryConfig.retryInterval ?? 1000
                }
              }
            : node
        )
      };
    });
  },

  bulkSetTimeout: (timeoutMs) => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? { ...node, data: { ...node.data, timeout: timeoutMs } }
            : node
        )
      };
    });
  },

  bulkSetContinueOnFail: (continueOnFail) => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? { ...node, data: { ...node.data, continueOnFail } }
            : node
        )
      };
    });
  },

  bulkDuplicateNodes: () => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      const selectedNodeObjects = state.nodes.filter(n => state.selectedNodes.includes(n.id));
      const offset = 50;
      const idMap: Record<string, string> = {};

      const newNodes = selectedNodeObjects.map(node => {
        const newId = `${node.id}_dup_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        idMap[node.id] = newId;
        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + offset,
            y: node.position.y + offset
          },
          data: {
            ...node.data,
            label: `${(node.data as NodeData).label || (node.data as NodeData).type} (Copy)`
          }
        };
      });

      const newEdges = state.edges
        .filter(e =>
          state.selectedNodes.includes(e.source) &&
          state.selectedNodes.includes(e.target)
        )
        .map(edge => ({
          ...edge,
          id: `${edge.id}_dup_${Date.now()}`,
          source: idMap[edge.source],
          target: idMap[edge.target]
        }));

      return {
        nodes: [...state.nodes, ...newNodes],
        edges: [...state.edges, ...newEdges],
        selectedNodes: newNodes.map(n => n.id)
      };
    });
  },

  bulkMoveNodes: (deltaX, deltaY) => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? {
                ...node,
                position: {
                  x: node.position.x + deltaX,
                  y: node.position.y + deltaY
                }
              }
            : node
        )
      };
    });
  },

  bulkSetColor: (color) => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? { ...node, data: { ...node.data, color } }
            : node
        )
      };
    });
  },

  bulkSetNotes: (notes) => {
    set((state) => {
      if (state.selectedNodes.length === 0) return state;
      state.addToHistory(state.nodes, state.edges);

      return {
        nodes: state.nodes.map(node =>
          state.selectedNodes.includes(node.id)
            ? { ...node, data: { ...node.data, notes } }
            : node
        )
      };
    });
  },
});
