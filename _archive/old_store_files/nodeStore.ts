/**
 * PLAN C PHASE 3 - Refactoring: Node Management Store
 * Extracted from monolithic workflowStore.ts
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Node, Edge } from 'reactflow';
import { logger } from '../../services/LoggingService';
import { eventNotificationService } from '../../services/EventNotificationService';

export interface NodeState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  nodeStats: Record<string, any>;
  
  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  
  addEdge: (edge: Edge) => void;
  updateEdge: (id: string, data: Partial<Edge>) => void;
  deleteEdge: (id: string) => void;
  
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  clearSelection: () => void;
  
  // Bulk operations
  batchUpdateNodes: (updates: Array<{ id: string; data: Partial<Node> }>) => void;
  batchDeleteNodes: (ids: string[]) => void;
  
  // Node statistics
  updateNodeStats: (nodeId: string, stats: any) => void;
  getNodeById: (id: string) => Node | undefined;
  getEdgeById: (id: string) => Edge | undefined;
  
  // Validation
  validateNodeConnections: (nodeId: string) => boolean;
  getConnectedNodes: (nodeId: string) => string[];
  getIncomingEdges: (nodeId: string) => Edge[];
  getOutgoingEdges: (nodeId: string) => Edge[];
}

export const useNodeStore = create<NodeState>()(
  subscribeWithSelector((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    selectedEdge: null,
    nodeStats: {},
    
    setNodes: (nodes) => {
      set({ nodes });
      logger.debug(`Set ${nodes.length} nodes`);
    },
    
    setEdges: (edges) => {
      set({ edges });
      logger.debug(`Set ${edges.length} edges`);
    },
    
    addNode: (node) => {
      set((state) => {
        const exists = state.nodes.some(n => n.id === node.id);
        if (exists) {
          logger.warn(`Node ${node.id} already exists`);
          return state;
        }
        
        const newNodes = [...state.nodes, node];
        eventNotificationService.notify('node.added', { node });
        logger.info(`Added node ${node.id}`);
        
        return { nodes: newNodes };
      });
    },
    
    updateNode: (id, data) => {
      set((state) => {
        const nodeIndex = state.nodes.findIndex(n => n.id === id);
        if (nodeIndex === -1) {
          logger.warn(`Node ${id} not found`);
          return state;
        }
        
        const updatedNodes = [...state.nodes];
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          ...data,
          data: {
            ...updatedNodes[nodeIndex].data,
            ...(data.data || {})
          }
        };
        
        eventNotificationService.notify('node.updated', { id, data });
        logger.debug(`Updated node ${id}`);
        
        return { 
          nodes: updatedNodes,
          selectedNode: state.selectedNode?.id === id 
            ? updatedNodes[nodeIndex] 
            : state.selectedNode
        };
      });
    },
    
    deleteNode: (id) => {
      set((state) => {
        const newNodes = state.nodes.filter(n => n.id !== id);
        const newEdges = state.edges.filter(e => 
          e.source !== id && e.target !== id
        );
        
        eventNotificationService.notify('node.deleted', { id });
        logger.info(`Deleted node ${id} and its connections`);
        
        return {
          nodes: newNodes,
          edges: newEdges,
          selectedNode: state.selectedNode?.id === id ? null : state.selectedNode
        };
      });
    },
    
    duplicateNode: (id) => {
      const state = get();
      const nodeToDuplicate = state.nodes.find(n => n.id === id);
      
      if (!nodeToDuplicate) {
        logger.warn(`Node ${id} not found for duplication`);
        return;
      }
      
      const newNode = {
        ...nodeToDuplicate,
        id: `${nodeToDuplicate.id}_copy_${Date.now()}`,
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50
        }
      };
      
      state.addNode(newNode);
    },
    
    addEdge: (edge) => {
      set((state) => {
        const exists = state.edges.some(e => 
          e.source === edge.source && 
          e.target === edge.target &&
          e.sourceHandle === edge.sourceHandle &&
          e.targetHandle === edge.targetHandle
        );
        
        if (exists) {
          logger.warn(`Edge already exists`);
          return state;
        }
        
        const newEdges = [...state.edges, edge];
        eventNotificationService.notify('edge.added', { edge });
        logger.debug(`Added edge from ${edge.source} to ${edge.target}`);
        
        return { edges: newEdges };
      });
    },
    
    updateEdge: (id, data) => {
      set((state) => {
        const edgeIndex = state.edges.findIndex(e => e.id === id);
        if (edgeIndex === -1) {
          logger.warn(`Edge ${id} not found`);
          return state;
        }
        
        const updatedEdges = [...state.edges];
        updatedEdges[edgeIndex] = {
          ...updatedEdges[edgeIndex],
          ...data
        };
        
        eventNotificationService.notify('edge.updated', { id, data });
        logger.debug(`Updated edge ${id}`);
        
        return { 
          edges: updatedEdges,
          selectedEdge: state.selectedEdge?.id === id 
            ? updatedEdges[edgeIndex]
            : state.selectedEdge
        };
      });
    },
    
    deleteEdge: (id) => {
      set((state) => {
        const newEdges = state.edges.filter(e => e.id !== id);
        
        eventNotificationService.notify('edge.deleted', { id });
        logger.debug(`Deleted edge ${id}`);
        
        return {
          edges: newEdges,
          selectedEdge: state.selectedEdge?.id === id ? null : state.selectedEdge
        };
      });
    },
    
    setSelectedNode: (node) => {
      set({ 
        selectedNode: node,
        selectedEdge: null // Clear edge selection when selecting a node
      });
      
      if (node) {
        eventNotificationService.notify('node.selected', { node });
      }
    },
    
    setSelectedEdge: (edge) => {
      set({ 
        selectedEdge: edge,
        selectedNode: null // Clear node selection when selecting an edge
      });
      
      if (edge) {
        eventNotificationService.notify('edge.selected', { edge });
      }
    },
    
    clearSelection: () => {
      set({ selectedNode: null, selectedEdge: null });
    },
    
    batchUpdateNodes: (updates) => {
      set((state) => {
        const nodeMap = new Map(state.nodes.map(n => [n.id, n]));
        
        updates.forEach(({ id, data }) => {
          const node = nodeMap.get(id);
          if (node) {
            nodeMap.set(id, {
              ...node,
              ...data,
              data: {
                ...node.data,
                ...(data.data || {})
              }
            });
          }
        });
        
        const updatedNodes = Array.from(nodeMap.values());
        logger.info(`Batch updated ${updates.length} nodes`);
        
        return { nodes: updatedNodes };
      });
    },
    
    batchDeleteNodes: (ids) => {
      set((state) => {
        const idsSet = new Set(ids);
        const newNodes = state.nodes.filter(n => !idsSet.has(n.id));
        const newEdges = state.edges.filter(e => 
          !idsSet.has(e.source) && !idsSet.has(e.target)
        );
        
        logger.info(`Batch deleted ${ids.length} nodes`);
        
        return {
          nodes: newNodes,
          edges: newEdges,
          selectedNode: state.selectedNode && idsSet.has(state.selectedNode.id) 
            ? null 
            : state.selectedNode
        };
      });
    },
    
    updateNodeStats: (nodeId, stats) => {
      set((state) => ({
        nodeStats: {
          ...state.nodeStats,
          [nodeId]: {
            ...state.nodeStats[nodeId],
            ...stats,
            lastUpdated: Date.now()
          }
        }
      }));
    },
    
    getNodeById: (id) => {
      return get().nodes.find(n => n.id === id);
    },
    
    getEdgeById: (id) => {
      return get().edges.find(e => e.id === id);
    },
    
    validateNodeConnections: (nodeId) => {
      const state = get();
      const node = state.nodes.find(n => n.id === nodeId);
      
      if (!node) return false;
      
      // Check if node has required inputs
      const incomingEdges = state.edges.filter(e => e.target === nodeId);
      const nodeType = node.data?.type;
      
      // Add validation logic based on node type
      if (nodeType === 'merge' && incomingEdges.length < 2) {
        return false;
      }
      
      return true;
    },
    
    getConnectedNodes: (nodeId) => {
      const state = get();
      const connectedIds = new Set<string>();
      
      state.edges.forEach(edge => {
        if (edge.source === nodeId) {
          connectedIds.add(edge.target);
        }
        if (edge.target === nodeId) {
          connectedIds.add(edge.source);
        }
      });
      
      return Array.from(connectedIds);
    },
    
    getIncomingEdges: (nodeId) => {
      return get().edges.filter(e => e.target === nodeId);
    },
    
    getOutgoingEdges: (nodeId) => {
      return get().edges.filter(e => e.source === nodeId);
    }
  }))
);