/**
 * useDragDrop
 *
 * Handles drag and drop of nodes from the palette onto the canvas.
 * Supports:
 * - Basic node placement
 * - Snap to grid
 * - Edge splitting (drop on edge to insert node)
 */

import { useCallback } from 'react';
import { MarkerType } from '@xyflow/react';
import { WorkflowNode, WorkflowEdge, NodeData } from '../../../../../types/workflow';
import { useWorkflowStore } from '../../../../../store/workflowStore';
import { nodeTypes } from '../../../../../data/nodeTypes';
import { notificationService } from '../../../../../services/NotificationService';
import { logger } from '../../../../../services/SimpleLogger';

export interface UseDragDropOptions {
  /** Reference to the ReactFlow wrapper */
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  /** Project screen coordinates to flow coordinates */
  project: (position: { x: number; y: number }) => { x: number; y: number };
  /** Generate unique node ID */
  getId: () => string;
  /** Whether snap to grid is enabled */
  snapToGrid: boolean;
  /** Create node data for a new node */
  createNodeData: (id: string, nodeType: string, position: { x: number; y: number }) => NodeData;
}

export interface UseDragDropReturn {
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

const GRID_SIZE = 20;
const DROP_RADIUS = 30; // Pixels tolerance for edge drop detection

/**
 * Check if a point is near a line segment (for edge splitting)
 */
function isPointNearEdge(
  point: { x: number; y: number },
  source: { x: number; y: number },
  target: { x: number; y: number }
): { isNear: boolean; t: number } {
  const sx = source.x + 100; // Approximate node center
  const sy = source.y + 40;
  const tx = target.x + 100;
  const ty = target.y + 40;

  const lineLengthSquared = (tx - sx) ** 2 + (ty - sy) ** 2;
  if (lineLengthSquared === 0) return { isNear: false, t: 0 };

  const t = Math.max(
    0,
    Math.min(1, ((point.x - sx) * (tx - sx) + (point.y - sy) * (ty - sy)) / lineLengthSquared)
  );

  const projX = sx + t * (tx - sx);
  const projY = sy + t * (ty - sy);
  const distance = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);

  // Check if we're in the middle section of the edge (not near endpoints)
  return {
    isNear: distance < DROP_RADIUS && t > 0.2 && t < 0.8,
    t,
  };
}

/**
 * Hook for handling drag and drop operations
 */
export function useDragDrop(options: UseDragDropOptions): UseDragDropReturn {
  const { reactFlowWrapper, project, getId, snapToGrid, createNodeData } = options;

  // Store actions
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setEdges = useWorkflowStore((state) => state.setEdges);
  const addToHistory = useWorkflowStore((state) => state.addToHistory);

  /**
   * Handle drag over - allow drop
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drop - create node at drop position
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Prevent modifications when workflow is locked
      const isLocked = useWorkflowStore.getState().isCurrentWorkflowLocked;
      if (isLocked) {
        notificationService.warning('Workflow Locked', 'This workflow is locked. Unlock to add nodes.');
        return;
      }

      const type = event.dataTransfer.getData('text/plain');
      logger.info('Drop event - type:', type);

      if (!type) {
        logger.info('No type found in dataTransfer');
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) {
        logger.error('ReactFlow wrapper not found');
        return;
      }

      // Calculate drop position
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Snap to grid if enabled
      if (snapToGrid) {
        position.x = Math.round(position.x / GRID_SIZE) * GRID_SIZE;
        position.y = Math.round(position.y / GRID_SIZE) * GRID_SIZE;
      }

      const nodeConfig = nodeTypes[type];
      if (!nodeConfig) {
        logger.error(`Node type ${type} not found in nodeTypes`);
        return;
      }

      // Create new node
      const newNodeId = getId();
      const newNode: WorkflowNode = {
        id: newNodeId,
        type: 'custom',
        position,
        data: createNodeData(newNodeId, type, position),
      };

      // Get current state
      const currentNodes = useWorkflowStore.getState().nodes;
      const currentEdges = useWorkflowStore.getState().edges;

      // Check if dropping on an edge - insert node in the middle
      let edgeToSplit: WorkflowEdge | null = null;

      for (const edge of currentEdges) {
        const sourceNode = currentNodes.find((n) => n.id === edge.source);
        const targetNode = currentNodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          const result = isPointNearEdge(position, sourceNode.position, targetNode.position);
          if (result.isNear) {
            edgeToSplit = edge;
            break;
          }
        }
      }

      let updatedEdges = currentEdges;

      if (edgeToSplit) {
        // Insert node in the middle of the edge
        const newEdge1: WorkflowEdge = {
          id: `edge_${Date.now()}_1`,
          source: edgeToSplit.source,
          target: newNodeId,
          sourceHandle: edgeToSplit.sourceHandle,
          animated: true,
          style: { stroke: '#22c55e', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e', width: 16, height: 16 },
        };

        const newEdge2: WorkflowEdge = {
          id: `edge_${Date.now()}_2`,
          source: newNodeId,
          target: edgeToSplit.target,
          targetHandle: edgeToSplit.targetHandle,
          animated: true,
          style: { stroke: '#22c55e', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e', width: 16, height: 16 },
        };

        // Remove old edge, add two new edges
        updatedEdges = [
          ...currentEdges.filter((e) => e.id !== edgeToSplit!.id),
          newEdge1,
          newEdge2,
        ];

        notificationService.success('Edge Split', 'Node inserted into connection');
      }

      // Update store
      setNodes([...currentNodes, newNode]);
      setEdges(updatedEdges);
      addToHistory(currentNodes, currentEdges);

      // Animation feedback
      setTimeout(() => {
        const nodeElement = document.querySelector(`[data-id="${newNode.id}"]`);
        if (nodeElement) {
          nodeElement.classList.add('animate-bounce');
          setTimeout(() => nodeElement.classList.remove('animate-bounce'), 600);
        }
      }, 100);

      // Log the action
      const addLog = useWorkflowStore.getState().addLog;
      addLog({
        level: 'info',
        message: `Node added: ${nodeConfig.label}`,
        data: { nodeId: newNode.id, type, position },
      });
    },
    [project, setNodes, setEdges, addToHistory, snapToGrid, getId, reactFlowWrapper, createNodeData]
  );

  return {
    onDragOver,
    onDrop,
  };
}

export default useDragDrop;
