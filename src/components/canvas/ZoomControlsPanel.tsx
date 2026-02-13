/**
 * Zoom Controls Panel
 * Advanced zoom controls with zoom to selection (like n8n)
 */

import React, { useCallback, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Focus,
  Minimize2,
  RotateCcw,
  Grid3X3,
  Move,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useWorkflowStore } from '../../store/workflowStore';

interface ZoomControlsPanelProps {
  zoomLevel: number;
  showGrid: boolean;
  onToggleGrid: () => void;
}

const ZOOM_PRESETS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
];

const ZoomControlsPanelComponent: React.FC<ZoomControlsPanelProps> = ({
  zoomLevel,
  showGrid,
  onToggleGrid,
}) => {
  const { zoomIn, zoomOut, fitView, zoomTo, setCenter, getNodes } = useReactFlow();
  const { selectedNode, selectedNodes } = useWorkflowStore();
  const [showPresets, setShowPresets] = useState(false);

  // Zoom to fit selected nodes
  const handleZoomToSelection = useCallback(() => {
    const nodesToFit = selectedNodes.length > 0
      ? selectedNodes
      : selectedNode
        ? [selectedNode]
        : [];

    if (nodesToFit.length > 0) {
      const nodeIds = nodesToFit.map(n => n.id);
      fitView({
        nodes: getNodes().filter(n => nodeIds.includes(n.id)),
        padding: 0.5,
        duration: 300,
      });
    }
  }, [selectedNode, selectedNodes, fitView, getNodes]);

  // Center on specific node
  const handleCenterOnNode = useCallback((nodeId: string) => {
    const nodes = getNodes();
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCenter(
        node.position.x + (node.width || 150) / 2,
        node.position.y + (node.height || 50) / 2,
        { zoom: 1, duration: 300 }
      );
    }
  }, [getNodes, setCenter]);

  // Reset view
  const handleResetView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
    zoomTo(1);
  }, [fitView, zoomTo]);

  // Handle preset zoom
  const handlePresetZoom = useCallback((value: number) => {
    zoomTo(value, { duration: 200 });
    setShowPresets(false);
  }, [zoomTo]);

  const hasSelection = selectedNode || selectedNodes.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Zoom Level Display */}
      <div className="relative">
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
        >
          <span className="font-mono">{Math.round(zoomLevel * 100)}%</span>
        </button>

        {/* Zoom presets dropdown */}
        {showPresets && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-10">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetZoom(preset.value)}
                className={`w-full px-4 py-1.5 text-sm text-left hover:bg-gray-100 transition-colors ${
                  Math.abs(zoomLevel - preset.value) < 0.05
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex border-t border-gray-200">
        <button
          onClick={() => zoomOut({ duration: 200 })}
          className="flex-1 p-2 hover:bg-gray-100 transition-colors border-r border-gray-200"
          title="Zoom Out (-)"
        >
          <ZoomOut size={16} className="mx-auto text-gray-600" />
        </button>
        <button
          onClick={() => zoomIn({ duration: 200 })}
          className="flex-1 p-2 hover:bg-gray-100 transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn size={16} className="mx-auto text-gray-600" />
        </button>
      </div>

      {/* Fit/Focus controls */}
      <div className="flex border-t border-gray-200">
        <button
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          className="flex-1 p-2 hover:bg-gray-100 transition-colors border-r border-gray-200"
          title="Fit View (Ctrl+F)"
        >
          <Maximize2 size={16} className="mx-auto text-gray-600" />
        </button>
        <button
          onClick={handleZoomToSelection}
          disabled={!hasSelection}
          className={`flex-1 p-2 transition-colors ${
            hasSelection
              ? 'hover:bg-gray-100 text-gray-600'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Zoom to Selection"
        >
          <Focus size={16} className="mx-auto" />
        </button>
      </div>

      {/* View options */}
      <div className="flex border-t border-gray-200">
        <button
          onClick={onToggleGrid}
          className={`flex-1 p-2 transition-colors border-r border-gray-200 ${
            showGrid ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
          }`}
          title="Toggle Grid (G)"
        >
          <Grid3X3 size={16} className="mx-auto" />
        </button>
        <button
          onClick={handleResetView}
          className="flex-1 p-2 hover:bg-gray-100 transition-colors"
          title="Reset View"
        >
          <RotateCcw size={16} className="mx-auto text-gray-600" />
        </button>
      </div>

      {/* Pan mode indicator */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-center gap-1">
        <Move size={12} />
        <span>Scroll to pan</span>
      </div>
    </div>
  );
};

export const ZoomControlsPanel = React.memo(ZoomControlsPanelComponent, (prev, next) => {
  return (
    prev.zoomLevel === next.zoomLevel &&
    prev.showGrid === next.showGrid &&
    prev.onToggleGrid === next.onToggleGrid
  );
});

export default ZoomControlsPanel;
