/**
 * useAutoLayout Hook
 * Handles automatic node layout using dagre
 */

import { useCallback } from 'react';
import dagre from 'dagre';
import { logger } from '../../../../services/SimpleLogger';
import { useWorkflowStore } from '../../../../store/workflowStore';

export function useAutoLayout() {
  const { setNodes, addToHistory } = useWorkflowStore();

  const performAutoLayout = useCallback(() => {
    // Get fresh state from store instead of using stale closures
    const currentNodes = useWorkflowStore.getState().nodes;
    const currentEdges = useWorkflowStore.getState().edges;

    if (currentNodes.length === 0) return;

    try {
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

      currentNodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 150, height: 80 });
      });

      currentEdges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      const layoutedNodes = currentNodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - 75,
            y: nodeWithPosition.y - 40,
          },
        };
      });

      setNodes(layoutedNodes);
      addToHistory(currentNodes, currentEdges);
    } catch (error) {
      logger.error('Error during auto-layout:', error);
      // Fallback: simple grid layout
      const fallbackNodes = currentNodes.map((node, index) => ({
        ...node,
        position: {
          x: (index % 3) * 200,
          y: Math.floor(index / 3) * 150,
        },
      }));
      setNodes(fallbackNodes);
      addToHistory(currentNodes, currentEdges);
    }
  }, [setNodes, addToHistory]);

  return { performAutoLayout };
}
