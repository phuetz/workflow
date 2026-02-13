/**
 * useLineageSelection - Hook for managing node/field selection state
 */

import { useState, useCallback } from 'react';
import { LineageId } from '../../../../types/lineage';
import { UseLineageSelectionResult, LineagePath } from '../types';

export function useLineageSelection(
  traceFieldLineage: (fieldId: string, startNodeId: string) => LineagePath[],
  onNodeClick?: (nodeId: LineageId) => void,
  onFieldSelect?: (nodeId: LineageId, fieldName: string) => void
): UseLineageSelectionResult {
  const [selectedNode, setSelectedNode] = useState<LineageId | null>(null);
  const [selectedField, setSelectedField] = useState<{ nodeId: string; field: string } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<LineageId | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<Set<string>>(new Set());

  const handleNodeClick = useCallback(
    (nodeId: LineageId) => {
      setSelectedNode(prev => prev === nodeId ? null : nodeId);
      setSelectedField(null);
      onNodeClick?.(nodeId);
    },
    [onNodeClick]
  );

  const handleFieldClick = useCallback(
    (nodeId: string, fieldName: string) => {
      setSelectedField({ nodeId, field: fieldName });
      onFieldSelect?.(nodeId, fieldName);

      // Trace field lineage and highlight path
      const paths = traceFieldLineage(fieldName, nodeId);
      const highlightSet = new Set<string>();

      paths.forEach(path => {
        path.nodes.forEach(n => highlightSet.add(n));
        path.edges.forEach(e => highlightSet.add(e));
      });

      setHighlightedPath(highlightSet);
    },
    [traceFieldLineage, onFieldSelect]
  );

  const clearFieldSelection = useCallback(() => {
    setSelectedField(null);
    setHighlightedPath(new Set());
  }, []);

  return {
    selectedNode,
    selectedField,
    hoveredNode,
    hoveredEdge,
    highlightedPath,
    handleNodeClick,
    handleFieldClick,
    clearFieldSelection,
    setHoveredNode,
    setHoveredEdge
  };
}

export default useLineageSelection;
