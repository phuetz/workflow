/**
 * Enhanced Canvas Minimap
 * Minimap with node type colors and interaction (like n8n)
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Map,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Target,
  Layers,
  Settings,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface EnhancedCanvasMinimapProps {
  width?: number;
  height?: number;
  pannable?: boolean;
  zoomable?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
}

interface MinimapNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  label: string;
  color: string;
  isSelected: boolean;
  isExecuting: boolean;
  hasError: boolean;
}

// Node type colors matching the main editor
const NODE_TYPE_COLORS: Record<string, string> = {
  'trigger': '#10B981',
  'webhook': '#10B981',
  'schedule': '#3B82F6',
  'http-request': '#6366F1',
  'code': '#8B5CF6',
  'function': '#8B5CF6',
  'if': '#F59E0B',
  'switch': '#EAB308',
  'loop': '#14B8A6',
  'merge': '#06B6D4',
  'split': '#EC4899',
  'set': '#F97316',
  'filter': '#EC4899',
  'sort': '#06B6D4',
  'slack': '#4A154B',
  'email': '#EA4335',
  'openai': '#10A37F',
  'database': '#336791',
  'default': '#6B7280',
};

const EnhancedCanvasMinimap: React.FC<EnhancedCanvasMinimapProps> = ({
  width = 200,
  height = 150,
  pannable = true,
  zoomable = true,
  position = 'bottom-right',
  onViewportChange,
}) => {
  const { nodes, selectedNodes, nodeExecutionStatus } = useWorkflowStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    showLabels: false,
    showConnections: true,
    colorByType: true,
    highlightSelected: true,
  });

  // Calculate bounds and transform
  const { minimapNodes, bounds, scale } = useMemo(() => {
    if (nodes.length === 0) {
      return {
        minimapNodes: [],
        bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
        scale: 1,
      };
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      const x = node.position.x;
      const y = node.position.y;
      const w = (node.data as any).width || 150;
      const h = (node.data as any).height || 50;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + w);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h);
    });

    // Add padding
    const padding = 20;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    const scaleX = width / boundsWidth;
    const scaleY = height / boundsHeight;
    const calcScale = Math.min(scaleX, scaleY);

    const mmNodes: MinimapNode[] = nodes.map(node => {
      const nodeType = node.data?.type || 'default';
      const status = nodeExecutionStatus[node.id];

      return {
        id: node.id,
        x: (node.position.x - minX) * calcScale,
        y: (node.position.y - minY) * calcScale,
        width: Math.max(((node.data as any).width || 150) * calcScale, 4),
        height: Math.max(((node.data as any).height || 50) * calcScale, 3),
        type: nodeType,
        label: node.data?.label || nodeType,
        color: settings.colorByType
          ? NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.default
          : '#6B7280',
        isSelected: selectedNodes.includes(node.id),
        isExecuting: status === 'running',
        hasError: status === 'error',
      };
    });

    return {
      minimapNodes: mmNodes,
      bounds: { minX, maxX, minY, maxY },
      scale: calcScale,
    };
  }, [nodes, selectedNodes, nodeExecutionStatus, width, height, settings.colorByType]);

  // Calculate viewport rectangle on minimap
  const viewportRect = useMemo(() => {
    // This would come from the actual canvas viewport
    // For demo, using a mock viewport
    const viewWidth = (800 / (bounds.maxX - bounds.minX)) * width;
    const viewHeight = (600 / (bounds.maxY - bounds.minY)) * height;

    return {
      x: viewport.x * scale + (width - viewWidth) / 2,
      y: viewport.y * scale + (height - viewHeight) / 2,
      width: Math.min(viewWidth, width),
      height: Math.min(viewHeight, height),
    };
  }, [viewport, bounds, scale, width, height]);

  // Handle click on minimap to pan
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!pannable) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale + bounds.minX;
    const y = (e.clientY - rect.top) / scale + bounds.minY;

    setViewport(prev => ({ ...prev, x, y }));
    onViewportChange?.({ x, y, zoom: viewport.zoom });
  }, [pannable, scale, bounds, viewport.zoom, onViewportChange]);

  // Handle drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pannable) return;
    setIsDragging(true);
    e.preventDefault();
  }, [pannable]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !pannable) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale + bounds.minX;
    const y = (e.clientY - rect.top) / scale + bounds.minY;

    setViewport(prev => ({ ...prev, x, y }));
    onViewportChange?.({ x, y, zoom: viewport.zoom });
  }, [isDragging, pannable, scale, bounds, viewport.zoom, onViewportChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Position classes
  const positionClasses: Record<string, string> = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-30 transition-all duration-200`}
      style={{ width: isExpanded ? width : 40 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-white rounded-t-lg border border-b-0 border-gray-200 shadow-sm">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
        >
          <Map size={14} />
          {isExpanded && <span>Minimap</span>}
        </button>
        {isExpanded && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1 rounded transition-colors ${
                showSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <Settings size={12} />
            </button>
            <button
              onClick={() => onViewportChange?.({ x: 0, y: 0, zoom: 1 })}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
              title="Reset view"
            >
              <Target size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Settings panel */}
      {isExpanded && showSettings && (
        <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50">
          <label className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={settings.colorByType}
              onChange={(e) => setSettings(s => ({ ...s, colorByType: e.target.checked }))}
              className="w-3 h-3 text-blue-600 rounded"
            />
            <span className="text-xs text-gray-700">Color by type</span>
          </label>
          <label className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showConnections}
              onChange={(e) => setSettings(s => ({ ...s, showConnections: e.target.checked }))}
              className="w-3 h-3 text-blue-600 rounded"
            />
            <span className="text-xs text-gray-700">Show connections</span>
          </label>
          <label className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={settings.highlightSelected}
              onChange={(e) => setSettings(s => ({ ...s, highlightSelected: e.target.checked }))}
              className="w-3 h-3 text-blue-600 rounded"
            />
            <span className="text-xs text-gray-700">Highlight selected</span>
          </label>
        </div>
      )}

      {/* Minimap content */}
      {isExpanded && (
        <div
          ref={containerRef}
          className="bg-gray-100 rounded-b-lg border border-gray-200 overflow-hidden cursor-crosshair relative"
          style={{ width, height }}
          onClick={handleMinimapClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern id="minimap-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#9CA3AF" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#minimap-grid)" />
          </svg>

          {/* Connections */}
          {settings.showConnections && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* Connections would be drawn here based on edges */}
            </svg>
          )}

          {/* Nodes */}
          {minimapNodes.map(node => (
            <div
              key={node.id}
              className={`absolute rounded-sm transition-all ${
                node.isExecuting ? 'animate-pulse' : ''
              } ${
                settings.highlightSelected && node.isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-1'
                  : ''
              }`}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                backgroundColor: node.hasError ? '#EF4444' : node.color,
                opacity: node.isSelected ? 1 : 0.8,
              }}
              title={node.label}
            />
          ))}

          {/* Viewport indicator */}
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10 rounded pointer-events-none"
            style={{
              left: viewportRect.x,
              top: viewportRect.y,
              width: viewportRect.width,
              height: viewportRect.height,
            }}
          />

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Layers size={20} className="mx-auto opacity-50" />
                <p className="text-xs mt-1">No nodes</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zoom controls */}
      {isExpanded && zoomable && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white rounded-lg shadow border border-gray-200 p-0.5">
          <button
            onClick={() => {
              const newZoom = Math.max(0.5, viewport.zoom - 0.25);
              setViewport(v => ({ ...v, zoom: newZoom }));
              onViewportChange?.({ ...viewport, zoom: newZoom });
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ZoomOut size={12} className="text-gray-600" />
          </button>
          <span className="text-xs text-gray-500 min-w-[3ch] text-center">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button
            onClick={() => {
              const newZoom = Math.min(2, viewport.zoom + 0.25);
              setViewport(v => ({ ...v, zoom: newZoom }));
              onViewportChange?.({ ...viewport, zoom: newZoom });
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ZoomIn size={12} className="text-gray-600" />
          </button>
        </div>
      )}

      {/* Node count badge */}
      {isExpanded && nodes.length > 0 && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-gray-800 text-white text-xs rounded">
          {nodes.length} nodes
        </div>
      )}
    </div>
  );
};

export default EnhancedCanvasMinimap;
