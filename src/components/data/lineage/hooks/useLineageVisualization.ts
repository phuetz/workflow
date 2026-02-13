/**
 * useLineageVisualization - Hook for managing lineage visualization state
 */

import { useMemo } from 'react';
import { LineageGraph, LineageVisualizationOptions } from '../../../../types/lineage';
import { DataFlowVisualizer } from '../DataFlowVisualizer';
import { UseLineageVisualizationResult } from '../types';

export function useLineageVisualization(
  graph: LineageGraph,
  options: LineageVisualizationOptions
): UseLineageVisualizationResult {
  const visualizer = useMemo(() => new DataFlowVisualizer(graph), [graph]);

  const { nodes, edges } = useMemo(() => {
    return visualizer.generateLayout(options);
  }, [visualizer, options]);

  const stats = useMemo(() => {
    return visualizer.getVisualizationStats();
  }, [visualizer]);

  const traceFieldLineage = useMemo(() => {
    return (fieldId: string, startNodeId: string) => {
      return visualizer.traceFieldLineage(fieldId, startNodeId);
    };
  }, [visualizer]);

  return {
    nodes,
    edges,
    stats,
    traceFieldLineage
  };
}

export default useLineageVisualization;
