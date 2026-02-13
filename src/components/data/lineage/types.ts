/**
 * Types for Data Lineage Viewer components
 */

import { LineageVisualizationOptions, LineageId, LineageGraph } from '../../../types/lineage';

// ============================================================================
// Visual Node and Edge Types
// ============================================================================

export interface VisualNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
  type: 'source' | 'transform' | 'destination' | 'unknown';
  fields: FieldInfo[];
  metadata: {
    nodeType: string;
    recordCount: number;
    sensitivity?: import('../../../types/lineage').DataSensitivity;
    transformationType?: import('../../../types/lineage').TransformationType;
    isSelected?: boolean;
    isHighlighted?: boolean;
  };
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  width: number;
  animated?: boolean;
  label?: string;
  fieldMappings: FieldMapping[];
  path?: string;
}

export interface FieldInfo {
  name: string;
  type: string;
  isPII?: boolean;
  isKey?: boolean;
}

export interface FieldMapping {
  from: string;
  to: string;
  transformation?: string;
}

export interface LineagePath {
  fieldId: string;
  nodes: string[];
  edges: string[];
  transformations: string[];
}

export interface VisualizationStats {
  totalNodes: number;
  totalEdges: number;
  maxLevel: number;
  estimatedWidth: number;
  estimatedHeight: number;
  sources: number;
  destinations: number;
  transforms: number;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface DataLineageViewerProps {
  graph: LineageGraph;
  onNodeClick?: (nodeId: LineageId) => void;
  onEdgeClick?: (sourceId: LineageId, targetId: LineageId) => void;
  onFieldSelect?: (nodeId: LineageId, fieldName: string) => void;
  height?: number;
}

export interface LineageNodeProps {
  node: VisualNode;
  selected: boolean;
  highlighted: boolean;
  hovered: boolean;
  showMetrics: boolean;
  showFields: boolean;
  selectedField?: string;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFieldClick: (field: string) => void;
}

export interface LineageEdgeProps {
  edge: VisualEdge;
  highlighted: boolean;
  hovered: boolean;
  showFieldMappings: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export interface LineageControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export interface LineageDetailsProps {
  nodeId: LineageId;
  graph: LineageGraph;
  onClose: () => void;
  onFieldClick: (field: string) => void;
}

export interface LineageFiltersProps {
  options: LineageVisualizationOptions;
  stats: VisualizationStats;
  selectedField: { nodeId: string; field: string } | null;
  showFieldPanel: boolean;
  onOptionsChange: (options: LineageVisualizationOptions) => void;
  onFieldPanelToggle: () => void;
  onClearFieldSelection: () => void;
}

export interface LineageMiniMapProps {
  nodes: VisualNode[];
  stats: VisualizationStats;
  pan: { x: number; y: number };
  zoom: number;
  viewWidth: number;
  viewHeight: number;
}

// ============================================================================
// Hook Types
// ============================================================================

export interface UseLineageVisualizationResult {
  nodes: VisualNode[];
  edges: VisualEdge[];
  stats: VisualizationStats;
  traceFieldLineage: (fieldId: string, startNodeId: string) => LineagePath[];
}

export interface UseLineageSelectionResult {
  selectedNode: LineageId | null;
  selectedField: { nodeId: string; field: string } | null;
  hoveredNode: LineageId | null;
  hoveredEdge: string | null;
  highlightedPath: Set<string>;
  handleNodeClick: (nodeId: LineageId) => void;
  handleFieldClick: (nodeId: string, fieldName: string) => void;
  clearFieldSelection: () => void;
  setHoveredNode: (nodeId: LineageId | null) => void;
  setHoveredEdge: (edgeId: string | null) => void;
}

export interface UseLineagePanZoomResult {
  zoom: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}

// Re-export from lineage types for convenience
export type { LineageVisualizationOptions, LineageId, LineageGraph } from '../../../types/lineage';
