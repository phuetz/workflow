/**
 * Data Lineage Viewer Component
 * Interactive visualization of data lineage and flow with dagre layout
 */

import React, { useState, useRef } from 'react';
import { LineageVisualizationOptions, LineageId } from '../../types/lineage';

// Import extracted components
import { LineageNode } from './lineage/LineageNode';
import { LineageEdge } from './lineage/LineageEdge';
import { LineageDetails } from './lineage/LineageDetails';
import { LineageControls, LineageMiniMap, LineageLegend, LineageSvgDefs } from './lineage/LineageControls';
import { LineageFilters } from './lineage/LineageFilters';

// Import hooks
import { useLineageVisualization, useLineageSelection, useLineagePanZoom } from './lineage/hooks';

// Import types and utilities
import { DataLineageViewerProps, VisualEdge } from './lineage/types';

// Re-export buildLineageGraphFromWorkflow for backward compatibility
export { buildLineageGraphFromWorkflow } from './lineage/buildLineageGraph';

// ============================================================================
// DataLineageViewer Component
// ============================================================================

export const DataLineageViewer: React.FC<DataLineageViewerProps> = ({
  graph,
  onNodeClick,
  onEdgeClick,
  onFieldSelect,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [options, setOptions] = useState<LineageVisualizationOptions>({
    layout: 'dagre',
    orientation: 'horizontal',
    showMetrics: true,
    showTransformations: false,
    showCompliance: false,
    highlightCriticalPath: false,
    colorBy: 'status',
    enableZoom: true,
    enablePan: true,
    enableSelection: true,
    enableTooltips: true
  });

  const [showFieldPanel, setShowFieldPanel] = useState(false);

  // Use extracted hooks
  const { nodes, edges, stats, traceFieldLineage } = useLineageVisualization(graph, options);

  const {
    selectedNode, selectedField, hoveredNode, hoveredEdge, highlightedPath,
    handleNodeClick, handleFieldClick, clearFieldSelection, setHoveredNode, setHoveredEdge
  } = useLineageSelection(traceFieldLineage, onNodeClick, onFieldSelect);

  const {
    zoom, pan, isDragging,
    handleZoomIn, handleZoomOut, handleResetZoom,
    handleMouseDown, handleMouseMove, handleMouseUp, handleWheel
  } = useLineagePanZoom(options.enablePan, options.enableZoom, () => {
    handleNodeClick(selectedNode as LineageId);
    clearFieldSelection();
  });

  const handleEdgeClick = (edge: VisualEdge) => onEdgeClick?.(edge.source, edge.target);

  const viewWidth = stats.estimatedWidth / zoom;
  const viewHeight = stats.estimatedHeight / zoom;

  return (
    <div className="data-lineage-viewer bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      <LineageFilters
        options={options}
        stats={stats}
        selectedField={selectedField}
        showFieldPanel={showFieldPanel}
        onOptionsChange={setOptions}
        onFieldPanelToggle={() => setShowFieldPanel(!showFieldPanel)}
        onClearFieldSelection={clearFieldSelection}
      />

      <LineageLegend stats={stats} />

      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${viewWidth} ${viewHeight}`}
          style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}
        >
          <LineageSvgDefs />
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g className="edges">
            {edges.map(edge => (
              <LineageEdge
                key={edge.id}
                edge={edge}
                highlighted={highlightedPath.has(edge.id) || selectedNode === edge.source || selectedNode === edge.target}
                hovered={hoveredEdge === edge.id}
                showFieldMappings={showFieldPanel}
                onClick={() => handleEdgeClick(edge)}
                onMouseEnter={() => setHoveredEdge(edge.id)}
                onMouseLeave={() => setHoveredEdge(null)}
              />
            ))}
          </g>

          <g className="nodes">
            {nodes.map(node => (
              <LineageNode
                key={node.id}
                node={node}
                selected={selectedNode === node.id}
                highlighted={highlightedPath.has(node.id)}
                hovered={hoveredNode === node.id}
                showMetrics={options.showMetrics}
                showFields={showFieldPanel}
                selectedField={selectedField?.nodeId === node.id ? selectedField.field : undefined}
                onClick={() => handleNodeClick(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onFieldClick={(field) => handleFieldClick(node.id, field)}
              />
            ))}
          </g>
        </svg>

        <LineageControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onResetZoom={handleResetZoom} />
        <LineageMiniMap nodes={nodes} stats={stats} pan={pan} zoom={zoom} viewWidth={viewWidth} viewHeight={viewHeight} />
      </div>

      {selectedNode && (
        <LineageDetails
          nodeId={selectedNode}
          graph={graph}
          onClose={() => handleNodeClick(selectedNode)}
          onFieldClick={(field) => handleFieldClick(selectedNode, field)}
        />
      )}
    </div>
  );
};

export default DataLineageViewer;
