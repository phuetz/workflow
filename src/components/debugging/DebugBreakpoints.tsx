/**
 * Debug Breakpoints Component
 * Features: Set breakpoints, step-through execution, inspect data, continue/stop
 * AGENT 5 - UI/UX IMPROVEMENTS
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';
import {
  CircleDot, Play, Pause, StepForward, StopCircle,
  Eye, EyeOff, Trash2, Plus, CheckCircle, XCircle
} from 'lucide-react';

interface Breakpoint {
  id: string;
  nodeId: string;
  nodeName: string;
  enabled: boolean;
  condition?: string;
  hitCount: number;
  lastHit?: Date;
}

interface DebugSession {
  active: boolean;
  currentNode: string | null;
  paused: boolean;
  breakpointHit: string | null;
  stepMode: 'into' | 'over' | 'out' | null;
}

function DebugBreakpointsComponent() {
  const {
    nodes,
    breakpoints = {},
    addBreakpoint,
    removeBreakpoint,
    nodeExecutionStatus,
    nodeExecutionData,
    currentExecutingNode,
    isExecuting,
    darkMode,
    debugSession,
    debugStep,
    debugContinue,
    debugStop
  } = useWorkflowStore();

  const [localBreakpoints, setLocalBreakpoints] = useState<Breakpoint[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAddBreakpoint, setShowAddBreakpoint] = useState(false);
  const [selectedBreakpoint, setSelectedBreakpoint] = useState<string | null>(null);
  const [condition, setCondition] = useState('');
  const [session, setSession] = useState<DebugSession>({
    active: false,
    currentNode: null,
    paused: false,
    breakpointHit: null,
    stepMode: null
  });

  // Sync breakpoints from store
  useEffect(() => {
    const bps: Breakpoint[] = Object.entries(breakpoints).map(([nodeId, enabled]) => {
      const node = nodes.find(n => n.id === nodeId);
      const existingBp = localBreakpoints.find(bp => bp.nodeId === nodeId);

      return {
        id: existingBp?.id || `bp_${nodeId}`,
        nodeId,
        nodeName: node?.data?.label || nodeId,
        enabled: Boolean(enabled),
        condition: existingBp?.condition,
        hitCount: existingBp?.hitCount || 0,
        lastHit: existingBp?.lastHit
      };
    });

    setLocalBreakpoints(bps);
  }, [breakpoints, nodes]);

  // Monitor execution and check breakpoints
  useEffect(() => {
    if (!isExecuting || !currentExecutingNode) {
      return;
    }

    const breakpoint = localBreakpoints.find(
      bp => bp.nodeId === currentExecutingNode && bp.enabled
    );

    if (breakpoint) {
      // Check condition if present
      if (breakpoint.condition) {
        try {
          const nodeData = nodeExecutionData[currentExecutingNode];
          const result = evaluateCondition(breakpoint.condition, nodeData);

          if (!result) return;
        } catch (error) {
          logger.error('Breakpoint condition error:', error);
          return;
        }
      }

      // Hit breakpoint
      setSession({
        ...session,
        active: true,
        currentNode: currentExecutingNode,
        paused: true,
        breakpointHit: breakpoint.id
      });

      // Update hit count
      setLocalBreakpoints(bps =>
        bps.map(bp =>
          bp.id === breakpoint.id
            ? { ...bp, hitCount: bp.hitCount + 1, lastHit: new Date() }
            : bp
        )
      );
    }
  }, [currentExecutingNode, isExecuting, localBreakpoints, nodeExecutionData]);

  // Evaluate breakpoint condition
  const evaluateCondition = (condition: string, nodeData: any): boolean => {
    try {
      const context = {
        output: nodeData?.output,
        input: nodeData?.input,
        error: nodeData?.error,
        status: nodeExecutionStatus[currentExecutingNode || '']
      };

      const result = new Function(...Object.keys(context), `return ${condition}`)(
        ...Object.values(context)
      );

      return Boolean(result);
    } catch {
      return false;
    }
  };

  // Add breakpoint
  const handleAddBreakpoint = (nodeId: string) => {
    addBreakpoint(nodeId);
    setShowAddBreakpoint(false);
    setSelectedNode(null);
  };

  // Remove breakpoint
  const handleRemoveBreakpoint = (nodeId: string) => {
    removeBreakpoint(nodeId);
    if (selectedBreakpoint === nodeId) {
      setSelectedBreakpoint(null);
    }
  };

  // Toggle breakpoint
  const toggleBreakpoint = (nodeId: string) => {
    const isEnabled = breakpoints[nodeId];
    if (isEnabled) {
      removeBreakpoint(nodeId);
    } else {
      addBreakpoint(nodeId);
    }
  };

  // Set conditional breakpoint
  const setConditionalBreakpoint = (nodeId: string, condition: string) => {
    setLocalBreakpoints(bps =>
      bps.map(bp =>
        bp.nodeId === nodeId ? { ...bp, condition } : bp
      )
    );
  };

  // Debug controls
  const handleContinue = () => {
    setSession({
      ...session,
      paused: false,
      breakpointHit: null,
      stepMode: null
    });
    debugContinue();
  };

  const handleStepOver = () => {
    setSession({
      ...session,
      stepMode: 'over'
    });
    debugStep();
  };

  const handleStop = () => {
    setSession({
      active: false,
      currentNode: null,
      paused: false,
      breakpointHit: null,
      stepMode: null
    });
    debugStop();
  };

  // Get node status indicator
  const getNodeStatusIndicator = (nodeId: string) => {
    const status = nodeExecutionStatus[nodeId];
    if (session.currentNode === nodeId && session.paused) {
      return <CircleDot size={12} className="text-yellow-500 animate-pulse" />;
    }

    switch (status) {
      case 'success':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'error':
        return <XCircle size={12} className="text-red-500" />;
      case 'running':
        return <Play size={12} className="text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  // Available nodes for breakpoints
  const availableNodes = nodes.filter(
    node => !Object.keys(breakpoints).includes(node.id)
  );

  return (
    <div className={`debug-breakpoints h-full flex flex-col ${
      darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CircleDot size={20} />
            Breakpoints & Debugging
          </h2>

          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
            session.active
              ? 'bg-blue-600 text-white'
              : darkMode
                ? 'bg-gray-700'
                : 'bg-gray-100'
          }`}>
            {session.active ? 'Debugging' : 'Inactive'}
          </div>
        </div>

        {/* Debug Controls */}
        {session.active && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleContinue}
              disabled={!session.paused}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                session.paused
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title="Continue execution (F8)"
            >
              <Play size={16} />
              Continue
            </button>

            <button
              onClick={handleStepOver}
              disabled={!session.paused}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                session.paused
                  ? darkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title="Step over (F10)"
            >
              <StepForward size={16} />
              Step
            </button>

            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              title="Stop debugging"
            >
              <StopCircle size={16} />
              Stop
            </button>

            {session.paused && session.currentNode && (
              <div className={`ml-auto px-3 py-2 rounded-lg text-sm ${
                darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-800'
              }`}>
                Paused at: {nodes.find(n => n.id === session.currentNode)?.data?.label}
              </div>
            )}
          </div>
        )}

        {/* Add Breakpoint Button */}
        <button
          onClick={() => setShowAddBreakpoint(!showAddBreakpoint)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
            darkMode
              ? 'bg-blue-700 text-white hover:bg-blue-600'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          <Plus size={16} />
          Add Breakpoint
        </button>

        {/* Add Breakpoint Panel */}
        {showAddBreakpoint && (
          <div className={`mt-3 p-3 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <label className="block text-sm font-medium mb-2">Select Node:</label>
            <select
              value={selectedNode || ''}
              onChange={(e) => setSelectedNode(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border mb-2 ${
                darkMode
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Choose a node...</option>
              {availableNodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.data.label || node.id}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => selectedNode && handleAddBreakpoint(selectedNode)}
                disabled={!selectedNode}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddBreakpoint(false);
                  setSelectedNode(null);
                }}
                className={`px-3 py-1.5 rounded-lg ${
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
      </div>

      {/* Breakpoints List */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="text-sm font-semibold mb-3 opacity-60">
          Active Breakpoints ({localBreakpoints.length})
        </h3>

        {localBreakpoints.length === 0 ? (
          <div className="text-center py-12 opacity-60">
            <CircleDot size={48} className="mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No breakpoints set</p>
            <p className="text-sm">Add breakpoints to pause execution at specific nodes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {localBreakpoints.map(breakpoint => {
              const isSelected = selectedBreakpoint === breakpoint.id;
              const isActive = session.currentNode === breakpoint.nodeId && session.paused;

              return (
                <div
                  key={breakpoint.id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isActive
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : isSelected
                        ? 'border-blue-500'
                        : darkMode
                          ? 'border-gray-700 bg-gray-800 hover:bg-gray-750'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedBreakpoint(isSelected ? null : breakpoint.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBreakpoint(breakpoint.nodeId);
                          }}
                          className={`${
                            breakpoint.enabled
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-gray-400 hover:text-gray-500'
                          }`}
                        >
                          <CircleDot size={20} />
                        </button>

                        <div>
                          <div className="font-medium">{breakpoint.nodeName}</div>
                          <div className="text-xs opacity-60 font-mono">{breakpoint.nodeId}</div>
                        </div>

                        {getNodeStatusIndicator(breakpoint.nodeId)}
                      </div>

                      {breakpoint.condition && (
                        <div className={`ml-8 text-xs p-2 rounded-lg font-mono ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          Condition: {breakpoint.condition}
                        </div>
                      )}

                      <div className="ml-8 flex items-center gap-4 text-xs opacity-60 mt-2">
                        <span>Hits: {breakpoint.hitCount}</span>
                        {breakpoint.lastHit && (
                          <span>Last hit: {new Date(breakpoint.lastHit).toLocaleTimeString()}</span>
                        )}
                      </div>

                      {isSelected && (
                        <div className="ml-8 mt-3">
                          <label className="block text-xs font-medium mb-1">
                            Conditional Breakpoint:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., output.status === 'error'"
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            className={`w-full px-2 py-1 rounded text-sm font-mono border ${
                              darkMode
                                ? 'bg-gray-700 border-gray-600'
                                : 'bg-white border-gray-300'
                            }`}
                          />
                          <button
                            onClick={() => {
                              setConditionalBreakpoint(breakpoint.nodeId, condition);
                              setCondition('');
                            }}
                            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Set Condition
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBreakpoint(breakpoint.nodeId);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded text-red-600"
                      title="Remove breakpoint"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Current node data when paused */}
                  {isActive && nodeExecutionData[breakpoint.nodeId] && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      darkMode ? 'bg-gray-900' : 'bg-white'
                    }`}>
                      <h4 className="text-xs font-semibold mb-2">Current Data:</h4>
                      <pre className="text-xs font-mono overflow-auto max-h-32">
                        {JSON.stringify(nodeExecutionData[breakpoint.nodeId], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className={`p-3 border-t text-xs ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between opacity-60">
          <span>F8: Continue</span>
          <span>F10: Step Over</span>
          <span>Shift+F5: Stop</span>
        </div>
      </div>
    </div>
  );
}

export const DebugBreakpoints = React.memo(DebugBreakpointsComponent);

export default DebugBreakpoints;
