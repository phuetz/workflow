/**
 * Enhanced Status Bar
 * Rich status bar with execution info, zoom, and quick actions (like n8n)
 */

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  Workflow,
  GitBranch,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Map,
  Keyboard,
  ChevronUp,
  Play,
  Square,
  RotateCcw,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import ZoomPresetsDropdown from './ZoomPresetsDropdown';

interface EnhancedStatusBarProps {
  zoomLevel: number;
  viewMode: 'normal' | 'compact' | 'detailed';
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomTo: (zoom: number) => void;
  onFitView: () => void;
  onToggleGrid: () => void;
  onToggleMiniMap: () => void;
  onOpenShortcuts: () => void;
  showGrid: boolean;
  showMiniMap: boolean;
  darkMode?: boolean;
}

const EnhancedStatusBarComponent: React.FC<EnhancedStatusBarProps> = ({
  zoomLevel,
  viewMode,
  onZoomIn,
  onZoomOut,
  onZoomTo,
  onFitView,
  onToggleGrid,
  onToggleMiniMap,
  onOpenShortcuts,
  showGrid,
  showMiniMap,
  darkMode = false,
}) => {
  const {
    nodes,
    edges,
    isExecuting,
    nodeExecutionStatus,
    currentEnvironment,
    executionHistory,
    workflowName,
    lastSaved,
  } = useWorkflowStore();

  const [expanded, setExpanded] = useState(false);

  // Calculate execution statistics
  const executionStats = useMemo(() => {
    const total = nodes.length;
    const statuses = Object.values(nodeExecutionStatus);
    const completed = statuses.filter(s => s === 'success').length;
    const failed = statuses.filter(s => s === 'error').length;
    const running = statuses.filter(s => s === 'running').length;
    const pending = total - completed - failed - running;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, failed, running, pending, progress };
  }, [nodes, nodeExecutionStatus]);

  // Get last execution info
  const lastExecution = useMemo(() => {
    if (!executionHistory || executionHistory.length === 0) return null;
    return executionHistory[executionHistory.length - 1];
  }, [executionHistory]);

  // Format time ago
  const formatTimeAgo = (date: Date | string | number) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Node type breakdown
  const nodeBreakdown = useMemo(() => {
    const triggers = nodes.filter(n => n.data?.type?.includes('trigger') || n.data?.type?.includes('webhook')).length;
    const actions = nodes.filter(n => !n.data?.type?.includes('trigger') && !n.data?.type?.includes('webhook')).length;
    return { triggers, actions };
  }, [nodes]);

  const baseClass = darkMode
    ? 'bg-gray-900 text-gray-300 border-gray-700'
    : 'bg-white text-gray-700 border-gray-200';

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-300 ${baseClass}`}>
      {/* Expanded panel */}
      {expanded && (
        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
          <div className="grid grid-cols-4 gap-4 max-w-6xl mx-auto">
            {/* Workflow Info */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Workflow</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Name:</span>
                  <span className="text-sm font-medium">{workflowName || 'Untitled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Nodes:</span>
                  <span className="text-sm font-medium">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Connections:</span>
                  <span className="text-sm font-medium">{edges.length}</span>
                </div>
              </div>
            </div>

            {/* Node Types */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Node Types</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    <span className="text-sm text-gray-500">Triggers:</span>
                  </div>
                  <span className="text-sm font-medium">{nodeBreakdown.triggers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-blue-500" />
                    <span className="text-sm text-gray-500">Actions:</span>
                  </div>
                  <span className="text-sm font-medium">{nodeBreakdown.actions}</span>
                </div>
              </div>
            </div>

            {/* Execution Stats */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Execution</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span className="text-sm text-gray-500">Success:</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">{executionStats.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className="text-red-500" />
                    <span className="text-sm text-gray-500">Failed:</span>
                  </div>
                  <span className="text-sm font-medium text-red-600">{executionStats.failed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-500" />
                    <span className="text-sm text-gray-500">Pending:</span>
                  </div>
                  <span className="text-sm font-medium">{executionStats.pending}</span>
                </div>
              </div>
            </div>

            {/* Last Execution */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Last Run</h4>
              {lastExecution ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {lastExecution.status === 'success' ? (
                      <CheckCircle size={14} className="text-green-500" />
                    ) : lastExecution.status === 'error' ? (
                      <XCircle size={14} className="text-red-500" />
                    ) : (
                      <Clock size={14} className="text-gray-500" />
                    )}
                    <span className="text-sm capitalize">{lastExecution.status}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(lastExecution.timestamp)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No executions yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main status bar */}
      <div className={`h-8 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center px-4 text-xs`}>
        {/* Left section - Status indicators */}
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <Wifi size={12} className="text-green-500" />
            <span>Online</span>
          </div>

          {/* Execution status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isExecuting
                  ? 'bg-blue-500 animate-pulse'
                  : executionStats.failed > 0
                  ? 'bg-red-500'
                  : 'bg-green-500'
              }`}
            />
            <span>{isExecuting ? 'Executing...' : 'Ready'}</span>
          </div>

          {/* Progress during execution */}
          {isExecuting && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${executionStats.progress}%` }}
                />
              </div>
              <span className="text-gray-500">{executionStats.progress}%</span>
            </div>
          )}

          {/* Environment */}
          <div className="flex items-center gap-1.5">
            <GitBranch size={12} className="text-purple-500" />
            <span className="text-purple-600 font-medium">{currentEnvironment || 'development'}</span>
          </div>
        </div>

        {/* Center section - Workflow stats */}
        <div className="flex-1 flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5">
            <Workflow size={12} className="text-gray-400" />
            <span>{nodes.length} nodes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-gray-400" />
            <span>{edges.length} connections</span>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Cloud size={12} />
              <span>Saved {formatTimeAgo(lastSaved)}</span>
            </div>
          )}
        </div>

        {/* Right section - Controls */}
        <div className="flex items-center gap-2">
          {/* View controls */}
          <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
            <button
              onClick={onToggleGrid}
              className={`p-1 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              title="Toggle Grid (G)"
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={onToggleMiniMap}
              className={`p-1 rounded ${showMiniMap ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              title="Toggle Mini Map (M)"
            >
              <Map size={14} />
            </button>
            <button
              onClick={onOpenShortcuts}
              className="p-1 rounded hover:bg-gray-100"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard size={14} />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onZoomOut}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title="Zoom Out (-)"
            >
              <ZoomOut size={14} />
            </button>
            <ZoomPresetsDropdown
              currentZoom={zoomLevel}
              onZoomTo={onZoomTo}
              onFitView={onFitView}
              darkMode={darkMode}
            />
            <button
              onClick={onZoomIn}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title="Zoom In (+)"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={onFitView}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title="Fit View (Ctrl+F)"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* View mode */}
          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">
            {viewMode}
          </span>

          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-1 rounded hover:bg-gray-100 transition-transform ${expanded ? 'rotate-180' : ''}`}
            title="Toggle Details"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const EnhancedStatusBar = React.memo(EnhancedStatusBarComponent, (prev, next) => {
  return (
    prev.zoomLevel === next.zoomLevel &&
    prev.viewMode === next.viewMode &&
    prev.showGrid === next.showGrid &&
    prev.showMiniMap === next.showMiniMap &&
    prev.darkMode === next.darkMode &&
    prev.onZoomIn === next.onZoomIn &&
    prev.onZoomOut === next.onZoomOut &&
    prev.onZoomTo === next.onZoomTo &&
    prev.onFitView === next.onFitView &&
    prev.onToggleGrid === next.onToggleGrid &&
    prev.onToggleMiniMap === next.onToggleMiniMap &&
    prev.onOpenShortcuts === next.onOpenShortcuts
  );
});

export default EnhancedStatusBar;
