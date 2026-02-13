/**
 * Step Debug Panel
 * Provides step-through execution debugging controls with:
 * - Step Over, Continue, Stop buttons
 * - Current node highlight
 * - Input/Output data display
 * - Breakpoint management
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  StepForward,
  SkipForward,
  CircleDot,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  Plus,
  Activity,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { debugManager, DebugSession, Breakpoint, DebugEvent } from '../../execution/DebugManager';
import { logger } from '../../services/SimpleLogger';

interface StepDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeHighlight?: (nodeId: string | null) => void;
}

const StepDebugPanelComponent: React.FC<StepDebugPanelProps> = ({
  isOpen,
  onClose,
  onNodeHighlight,
}) => {
  // Store state
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const darkMode = useWorkflowStore((state) => state.darkMode);
  const breakpoints = useWorkflowStore((state) => state.breakpoints);
  const addBreakpoint = useWorkflowStore((state) => state.addBreakpoint);
  const removeBreakpoint = useWorkflowStore((state) => state.removeBreakpoint);
  const nodeExecutionData = useWorkflowStore((state) => state.nodeExecutionData);
  const nodeExecutionStatus = useWorkflowStore((state) => state.nodeExecutionStatus);
  const currentExecutingNode = useWorkflowStore((state) => state.currentExecutingNode);
  const isExecuting = useWorkflowStore((state) => state.isExecuting);

  // Local state
  const [debugSession, setDebugSession] = useState<DebugSession | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    controls: true,
    breakpoints: true,
    currentNode: true,
    data: false,
  });
  const [selectedBreakpointNode, setSelectedBreakpointNode] = useState<string>('');
  const [showAddBreakpoint, setShowAddBreakpoint] = useState(false);

  // Initialize debug session
  useEffect(() => {
    if (isOpen && !sessionId) {
      const session = debugManager.createSession(nodes, edges);
      setSessionId(session.id);
      setDebugSession(session);
      logger.info('Debug session created:', session.id);
    }

    return () => {
      if (sessionId) {
        debugManager.deleteSession(sessionId);
        setSessionId(null);
        setDebugSession(null);
      }
    };
  }, [isOpen, nodes, edges]);

  // Sync breakpoints from store to debug manager
  useEffect(() => {
    if (!sessionId) return;

    Object.entries(breakpoints).forEach(([nodeId, enabled]) => {
      if (enabled) {
        try {
          const existingSession = debugManager.getSession(sessionId);
          if (existingSession && !existingSession.breakpoints.has(nodeId)) {
            debugManager.addBreakpoint(sessionId, nodeId);
          }
        } catch {
          // Breakpoint may already exist
        }
      } else {
        debugManager.removeBreakpoint(sessionId, nodeId);
      }
    });
  }, [breakpoints, sessionId]);

  // Listen to debug events
  useEffect(() => {
    const unsubscribe = debugManager.onEvent((event: DebugEvent) => {
      logger.debug('Debug event:', event);

      if (event.type === 'breakpoint') {
        onNodeHighlight?.(event.nodeId);
      } else if (event.type === 'complete') {
        onNodeHighlight?.(null);
      }

      // Refresh session state
      if (sessionId) {
        const session = debugManager.getSession(sessionId);
        setDebugSession(session || null);
      }
    });

    return unsubscribe;
  }, [sessionId, onNodeHighlight]);

  // Update session state periodically when executing
  useEffect(() => {
    if (!sessionId || !isExecuting) return;

    const interval = setInterval(() => {
      const session = debugManager.getSession(sessionId);
      setDebugSession(session || null);
    }, 100);

    return () => clearInterval(interval);
  }, [sessionId, isExecuting]);

  // Debug control handlers
  const handleStepOver = useCallback(() => {
    if (sessionId) {
      debugManager.stepOver(sessionId);
      logger.info('Step over triggered');
    }
  }, [sessionId]);

  const handleContinue = useCallback(() => {
    if (sessionId) {
      debugManager.continue(sessionId);
      onNodeHighlight?.(null);
      logger.info('Continue triggered');
    }
  }, [sessionId, onNodeHighlight]);

  const handleStop = useCallback(() => {
    if (sessionId) {
      debugManager.stop(sessionId);
      onNodeHighlight?.(null);
      logger.info('Stop triggered');
    }
  }, [sessionId, onNodeHighlight]);

  const handlePause = useCallback(() => {
    if (sessionId && currentExecutingNode) {
      debugManager.pause(sessionId, currentExecutingNode);
      onNodeHighlight?.(currentExecutingNode);
      logger.info('Pause triggered at node:', currentExecutingNode);
    }
  }, [sessionId, currentExecutingNode, onNodeHighlight]);

  // Breakpoint handlers
  const handleAddBreakpoint = useCallback((nodeId: string) => {
    addBreakpoint(nodeId);
    if (sessionId) {
      debugManager.addBreakpoint(sessionId, nodeId);
    }
    setShowAddBreakpoint(false);
    setSelectedBreakpointNode('');
  }, [addBreakpoint, sessionId]);

  const handleRemoveBreakpoint = useCallback((nodeId: string) => {
    removeBreakpoint(nodeId);
    if (sessionId) {
      debugManager.removeBreakpoint(sessionId, nodeId);
    }
  }, [removeBreakpoint, sessionId]);

  const handleToggleBreakpoint = useCallback((nodeId: string) => {
    if (breakpoints[nodeId]) {
      handleRemoveBreakpoint(nodeId);
    } else {
      handleAddBreakpoint(nodeId);
    }
  }, [breakpoints, handleAddBreakpoint, handleRemoveBreakpoint]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get current node data
  const currentNodeId = debugSession?.currentNode || currentExecutingNode;
  const currentNode = nodes.find((n) => n.id === currentNodeId);
  const currentNodeData = currentNodeId ? nodeExecutionData[currentNodeId] : null;

  // Get nodes available for breakpoints (not already set)
  const availableNodes = useMemo(() => {
    return nodes.filter((n) => !breakpoints[n.id]);
  }, [nodes, breakpoints]);

  // Get active breakpoint nodes with their info
  const breakpointNodes = useMemo(() => {
    return Object.entries(breakpoints)
      .filter(([, enabled]) => enabled)
      .map(([nodeId]) => {
        const node = nodes.find((n) => n.id === nodeId);
        return {
          nodeId,
          nodeName: node?.data?.label || nodeId,
          nodeType: node?.type || 'unknown',
          status: nodeExecutionStatus[nodeId],
        };
      });
  }, [breakpoints, nodes, nodeExecutionStatus]);

  // Determine debug status
  const debugStatus = useMemo(() => {
    if (!debugSession) return 'idle';
    return debugSession.status;
  }, [debugSession]);

  const isPaused = debugStatus === 'paused';
  const isRunning = debugStatus === 'running' || isExecuting;
  const isStopped = debugStatus === 'stopped' || debugStatus === 'idle';

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-4 top-20 w-96 rounded-xl shadow-2xl border z-50 overflow-hidden ${
        darkMode
          ? 'bg-gray-900 border-gray-700 text-gray-100'
          : 'bg-white border-gray-200 text-gray-900'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          <h3 className="text-lg font-semibold">Step Debugger</h3>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              isPaused
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                : isRunning
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {debugStatus.toUpperCase()}
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg transition-colors ${
            darkMode
              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
              : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
          }`}
        >
          <X size={18} />
        </button>
      </div>

      {/* Controls Section */}
      <div
        className={`border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <button
          onClick={() => toggleSection('controls')}
          className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${
            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
          }`}
        >
          <span>Debug Controls</span>
          {expandedSections.controls ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

        {expandedSections.controls && (
          <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
            {/* Step Over */}
            <button
              onClick={handleStepOver}
              disabled={!isPaused}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isPaused
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : darkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Step Over (F10)"
            >
              <StepForward size={16} />
              Step Over
            </button>

            {/* Continue / Pause */}
            {isPaused || isStopped ? (
              <button
                onClick={handleContinue}
                disabled={isStopped && !isExecuting}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  !isStopped || isExecuting
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : darkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Continue (F5)"
              >
                <Play size={16} />
                Continue
              </button>
            ) : (
              <button
                onClick={handlePause}
                disabled={!isRunning}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isRunning
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : darkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Pause (F6)"
              >
                <Pause size={16} />
                Pause
              </button>
            )}

            {/* Stop */}
            <button
              onClick={handleStop}
              disabled={isStopped && !isExecuting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                !isStopped || isExecuting
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : darkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Stop (Shift+F5)"
            >
              <Square size={16} />
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Breakpoints Section */}
      <div
        className={`border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <button
          onClick={() => toggleSection('breakpoints')}
          className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${
            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>Breakpoints</span>
            <span
              className={`px-1.5 py-0.5 text-xs rounded-full ${
                darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            >
              {breakpointNodes.length}
            </span>
          </div>
          {expandedSections.breakpoints ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

        {expandedSections.breakpoints && (
          <div className="px-4 pb-4">
            {/* Add breakpoint button */}
            {!showAddBreakpoint ? (
              <button
                onClick={() => setShowAddBreakpoint(true)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 mb-3 rounded-lg border-2 border-dashed text-sm transition-all ${
                  darkMode
                    ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-800 text-gray-400'
                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-500'
                }`}
              >
                <Plus size={16} />
                Add Breakpoint
              </button>
            ) : (
              <div
                className={`mb-3 p-3 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}
              >
                <select
                  value={selectedBreakpointNode}
                  onChange={(e) => setSelectedBreakpointNode(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border mb-2 text-sm ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Select a node...</option>
                  {availableNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.data?.label || node.id}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedBreakpointNode) {
                        handleAddBreakpoint(selectedBreakpointNode);
                      }
                    }}
                    disabled={!selectedBreakpointNode}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddBreakpoint(false);
                      setSelectedBreakpointNode('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Breakpoint list */}
            {breakpointNodes.length === 0 ? (
              <div
                className={`text-center py-4 text-sm ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                <CircleDot size={24} className="mx-auto mb-2 opacity-50" />
                No breakpoints set
              </div>
            ) : (
              <div className="space-y-2">
                {breakpointNodes.map((bp) => (
                  <div
                    key={bp.nodeId}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      currentNodeId === bp.nodeId
                        ? darkMode
                          ? 'bg-yellow-900/30 border border-yellow-600'
                          : 'bg-yellow-50 border border-yellow-300'
                        : darkMode
                        ? 'bg-gray-800'
                        : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CircleDot
                        size={16}
                        className="text-red-500 fill-red-500"
                      />
                      <div>
                        <div className="text-sm font-medium">{bp.nodeName}</div>
                        <div
                          className={`text-xs ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}
                        >
                          {bp.nodeType}
                        </div>
                      </div>
                      {bp.status && (
                        <span
                          className={`ml-2 ${
                            bp.status === 'success'
                              ? 'text-green-500'
                              : bp.status === 'error'
                              ? 'text-red-500'
                              : bp.status === 'running'
                              ? 'text-blue-500'
                              : 'text-gray-400'
                          }`}
                        >
                          {bp.status === 'success' && <CheckCircle2 size={14} />}
                          {bp.status === 'error' && <XCircle size={14} />}
                          {bp.status === 'running' && (
                            <RefreshCw size={14} className="animate-spin" />
                          )}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveBreakpoint(bp.nodeId)}
                      className={`p-1 rounded transition-colors ${
                        darkMode
                          ? 'hover:bg-red-900/50 text-red-400'
                          : 'hover:bg-red-100 text-red-500'
                      }`}
                      title="Remove breakpoint"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Node Section */}
      <div
        className={`border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <button
          onClick={() => toggleSection('currentNode')}
          className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${
            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
          }`}
        >
          <span>Current Node</span>
          {expandedSections.currentNode ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

        {expandedSections.currentNode && (
          <div className="px-4 pb-4">
            {currentNode ? (
              <div
                className={`p-3 rounded-lg ${
                  isPaused
                    ? darkMode
                      ? 'bg-yellow-900/20 border border-yellow-700'
                      : 'bg-yellow-50 border border-yellow-200'
                    : darkMode
                    ? 'bg-gray-800'
                    : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isPaused && (
                    <Pause size={14} className="text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {currentNode.data?.label || currentNode.id}
                  </span>
                </div>
                <div
                  className={`text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <div>Type: {currentNode.type}</div>
                  <div>ID: {currentNode.id}</div>
                  {nodeExecutionStatus[currentNodeId!] && (
                    <div>Status: {nodeExecutionStatus[currentNodeId!]}</div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`text-center py-4 text-sm ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {isExecuting ? 'Waiting for node...' : 'No node selected'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Section */}
      <div>
        <button
          onClick={() => toggleSection('data')}
          className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium ${
            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>Input/Output Data</span>
            {currentNodeData && (
              <Eye size={14} className="text-blue-500" />
            )}
          </div>
          {expandedSections.data ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

        {expandedSections.data && (
          <div className="px-4 pb-4 max-h-64 overflow-auto">
            {currentNodeData ? (
              <div className="space-y-3">
                {/* Input Data */}
                {currentNodeData.input && (
                  <div>
                    <div
                      className={`text-xs font-medium mb-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      Input
                    </div>
                    <pre
                      className={`p-2 rounded-lg text-xs overflow-auto ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-100'
                      }`}
                    >
                      {JSON.stringify(currentNodeData.input, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Output Data */}
                {currentNodeData.output && (
                  <div>
                    <div
                      className={`text-xs font-medium mb-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      Output
                    </div>
                    <pre
                      className={`p-2 rounded-lg text-xs overflow-auto ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-100'
                      }`}
                    >
                      {JSON.stringify(currentNodeData.output, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error if present */}
                {currentNodeData.error && (
                  <div>
                    <div className="text-xs font-medium mb-1 text-red-500">
                      Error
                    </div>
                    <pre
                      className={`p-2 rounded-lg text-xs overflow-auto ${
                        darkMode
                          ? 'bg-red-900/20 text-red-300'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {typeof currentNodeData.error === 'string'
                        ? currentNodeData.error
                        : JSON.stringify(currentNodeData.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`text-center py-4 text-sm ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                <EyeOff size={24} className="mx-auto mb-2 opacity-50" />
                No data available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with keyboard shortcuts */}
      <div
        className={`px-4 py-2 border-t text-xs ${
          darkMode
            ? 'border-gray-700 bg-gray-800 text-gray-500'
            : 'border-gray-200 bg-gray-50 text-gray-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <span>F10: Step</span>
          <span>F5: Continue</span>
          <span>Shift+F5: Stop</span>
        </div>
      </div>
    </div>
  );
};

export const StepDebugPanel = React.memo(StepDebugPanelComponent, (prev, next) => {
  return (
    prev.isOpen === next.isOpen &&
    prev.onClose === next.onClose &&
    prev.onNodeHighlight === next.onNodeHighlight
  );
});

export default StepDebugPanel;
