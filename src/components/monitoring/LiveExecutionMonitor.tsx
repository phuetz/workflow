/**
 * Live Execution Monitor
 * Real-time workflow visualization with animated data flow
 *
 * Features:
 * - Real-time workflow visualization
 * - Animated data flow between nodes
 * - Live node status indicators
 * - Performance metrics (time per node)
 * - Memory usage tracking
 * - Interactive node inspection
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { logger } from '../../services/SimpleLogger';

// Temporary types until ExecutionStreamer is implemented
interface ExecutionStreamer {
  disconnect(): void;
}
interface ExecutionStreamEvent {
  type: string;
  timestamp: string;
  data: any;
}
interface NodeExecutionEvent extends ExecutionStreamEvent {
  data: {
    nodeId: string;
    nodeName?: string;
    nodeType?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    error?: string;
  };
}
interface DataFlowEvent extends ExecutionStreamEvent {
  data: {
    fromNodeId: string;
    toNodeId: string;
    edgeId: string;
    data: unknown;
  };
}
interface ExecutionProgressEvent extends ExecutionStreamEvent {
  data: {
    nodesCompleted: number;
    nodesTotal: number;
    nodesInProgress: number;
    percentage: number;
  };
}
class ExecutionStreamer {
  constructor(config: any) {}
  disconnect() {}
}

interface LiveExecutionMonitorProps {
  executionId: string;
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (nodeId: string) => void;
  onExecutionComplete?: (summary: Record<string, unknown>) => void;
  showMetrics?: boolean;
  showDataFlow?: boolean;
  autoLayout?: boolean;
}

interface NodeStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

interface ExecutionMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  nodesCompleted: number;
  nodesTotal: number;
  nodesInProgress: number;
  nodesFailed: number;
  progress: number;
  averageNodeTime: number;
  slowestNode?: { nodeId: string; duration: number };
  fastestNode?: { nodeId: string; duration: number };
  totalMemoryUsed: number;
  peakMemoryUsage: number;
}

interface DataFlowAnimation {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  edgeId: string;
  progress: number; // 0 to 1
  data: unknown;
  startTime: number;
}

const LiveExecutionMonitorComponent: React.FC<LiveExecutionMonitorProps> = ({
  executionId,
  workflowId,
  nodes: initialNodes,
  edges: initialEdges,
  onNodeClick,
  onExecutionComplete,
  showMetrics = true,
  showDataFlow = true,
  autoLayout = false
}) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeStatus>>(new Map());
  const [metrics, setMetrics] = useState<ExecutionMetrics>({
    startTime: Date.now(),
    nodesCompleted: 0,
    nodesTotal: initialNodes.length,
    nodesInProgress: 0,
    nodesFailed: 0,
    progress: 0,
    averageNodeTime: 0,
    totalMemoryUsed: 0,
    peakMemoryUsage: 0
  });
  const [dataFlowAnimations, setDataFlowAnimations] = useState<DataFlowAnimation[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'running' | 'completed' | 'failed' | 'cancelled'>('running');

  const streamerRef = useRef<ExecutionStreamer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { fitView } = useReactFlow();

  /**
   * Initialize execution streamer
   */
  useEffect(() => {
    const streamer = new ExecutionStreamer({
      executionId,
      workflowId,
      onEvent: handleStreamEvent,
      onError: (error) => {
        logger.error('Execution stream error:', error);
      },
      onDisconnect: () => {
        logger.warn('Execution stream disconnected');
      }
    });

    streamerRef.current = streamer;

    // Initialize node statuses
    const initialStatuses = new Map<string, NodeStatus>();
    initialNodes.forEach((node) => {
      initialStatuses.set(node.id, { status: 'pending' });
    });
    setNodeStatuses(initialStatuses);

    return () => {
      streamer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [executionId, workflowId]);

  /**
   * Handle stream events
   */
  const handleStreamEvent = useCallback((event: ExecutionStreamEvent) => {
    switch (event.type) {
      case 'started':
        handleExecutionStarted(event);
        break;
      case 'node_started':
        handleNodeStarted(event as NodeExecutionEvent);
        break;
      case 'node_completed':
        handleNodeCompleted(event as NodeExecutionEvent);
        break;
      case 'node_failed':
        handleNodeFailed(event as NodeExecutionEvent);
        break;
      case 'progress':
        if ('fromNodeId' in (event.data as any)) {
          handleDataFlow(event as DataFlowEvent);
        } else {
          handleProgress(event as ExecutionProgressEvent);
        }
        break;
      case 'completed':
        handleExecutionCompleted(event);
        break;
      case 'failed':
        handleExecutionFailed(event);
        break;
      case 'cancelled':
        handleExecutionCancelled(event);
        break;
    }
  }, []);

  /**
   * Handle execution started
   */
  const handleExecutionStarted = (event: ExecutionStreamEvent) => {
    setMetrics((prev) => ({
      ...prev,
      startTime: new Date(event.timestamp).getTime()
    }));
  };

  /**
   * Handle node started
   */
  const handleNodeStarted = (event: NodeExecutionEvent) => {
    const { nodeId, nodeName, nodeType, input } = event.data;

    setNodeStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.set(nodeId, {
        status: 'running',
        startTime: new Date(event.timestamp).getTime(),
        input
      });
      return newStatuses;
    });

    // Update node visual
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              className: 'animate-pulse',
              style: {
                ...node.style,
                border: '2px solid #3b82f6',
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
              }
            }
          : node
      )
    );

    setMetrics((prev) => ({
      ...prev,
      nodesInProgress: prev.nodesInProgress + 1
    }));
  };

  /**
   * Handle node completed
   */
  const handleNodeCompleted = (event: NodeExecutionEvent) => {
    const { nodeId, output, duration, memoryUsage, cpuUsage } = event.data;

    setNodeStatuses((prev) => {
      const newStatuses = new Map(prev);
      const existing = newStatuses.get(nodeId);
      newStatuses.set(nodeId, {
        ...existing,
        status: 'completed',
        endTime: new Date(event.timestamp).getTime(),
        duration,
        memoryUsage,
        cpuUsage,
        output
      });
      return newStatuses;
    });

    // Update node visual
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              className: '',
              style: {
                ...node.style,
                border: '2px solid #10b981',
                backgroundColor: '#d1fae5'
              }
            }
          : node
      )
    );

    // Update metrics
    setMetrics((prev) => {
      const completedNodes = prev.nodesCompleted + 1;
      const totalDuration = Array.from(nodeStatuses.values())
        .filter((s) => s.duration)
        .reduce((sum, s) => sum + (s.duration || 0), 0);
      const averageNodeTime = completedNodes > 0 ? totalDuration / completedNodes : 0;

      // Track slowest and fastest nodes
      const nodeDurations = Array.from(nodeStatuses.entries())
        .filter(([_, s]) => s.duration)
        .map(([id, s]) => ({ nodeId: id, duration: s.duration || 0 }));

      const slowestNode = nodeDurations.length > 0
        ? nodeDurations.reduce((max, curr) => (curr.duration > max.duration ? curr : max))
        : undefined;

      const fastestNode = nodeDurations.length > 0
        ? nodeDurations.reduce((min, curr) => (curr.duration < min.duration ? curr : min))
        : undefined;

      return {
        ...prev,
        nodesCompleted: completedNodes,
        nodesInProgress: Math.max(0, prev.nodesInProgress - 1),
        progress: Math.round((completedNodes / prev.nodesTotal) * 100),
        averageNodeTime,
        slowestNode,
        fastestNode,
        totalMemoryUsed: prev.totalMemoryUsed + (memoryUsage || 0),
        peakMemoryUsage: Math.max(prev.peakMemoryUsage, memoryUsage || 0)
      };
    });
  };

  /**
   * Handle node failed
   */
  const handleNodeFailed = (event: NodeExecutionEvent) => {
    const { nodeId, error, input } = event.data;

    setNodeStatuses((prev) => {
      const newStatuses = new Map(prev);
      const existing = newStatuses.get(nodeId);
      newStatuses.set(nodeId, {
        ...existing,
        status: 'failed',
        endTime: new Date(event.timestamp).getTime(),
        error,
        input
      });
      return newStatuses;
    });

    // Update node visual
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              className: '',
              style: {
                ...node.style,
                border: '2px solid #ef4444',
                backgroundColor: '#fee2e2'
              }
            }
          : node
      )
    );

    setMetrics((prev) => ({
      ...prev,
      nodesFailed: prev.nodesFailed + 1,
      nodesInProgress: Math.max(0, prev.nodesInProgress - 1)
    }));
  };

  /**
   * Handle data flow animation
   */
  const handleDataFlow = (event: DataFlowEvent) => {
    if (!showDataFlow) return;

    const { fromNodeId, toNodeId, edgeId, data } = event.data;

    const animation: DataFlowAnimation = {
      id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromNodeId,
      toNodeId,
      edgeId,
      progress: 0,
      data,
      startTime: Date.now()
    };

    setDataFlowAnimations((prev) => [...prev, animation]);

    // Highlight edge temporarily
    setEdges((prev) =>
      prev.map((edge) =>
        edge.id === edgeId || (edge.source === fromNodeId && edge.target === toNodeId)
          ? {
              ...edge,
              animated: true,
              style: { ...edge.style, stroke: '#3b82f6', strokeWidth: 3 }
            }
          : edge
      )
    );

    // Reset after animation
    setTimeout(() => {
      setEdges((prev) =>
        prev.map((edge) =>
          edge.id === edgeId || (edge.source === fromNodeId && edge.target === toNodeId)
            ? {
                ...edge,
                animated: false,
                style: { ...edge.style, stroke: '#b1b1b7', strokeWidth: 1 }
              }
            : edge
        )
      );
      setDataFlowAnimations((prev) => prev.filter((a) => a.id !== animation.id));
    }, 1000);
  };

  /**
   * Handle execution progress
   */
  const handleProgress = (event: ExecutionProgressEvent) => {
    const { nodesCompleted, nodesTotal, nodesInProgress, percentage } = event.data;

    setMetrics((prev) => ({
      ...prev,
      nodesCompleted,
      nodesTotal,
      nodesInProgress,
      progress: percentage
    }));
  };

  /**
   * Handle execution completed
   */
  const handleExecutionCompleted = (event: ExecutionStreamEvent) => {
    setExecutionStatus('completed');
    setMetrics((prev) => ({
      ...prev,
      endTime: new Date(event.timestamp).getTime(),
      duration: new Date(event.timestamp).getTime() - prev.startTime
    }));

    if (onExecutionComplete) {
      onExecutionComplete(event.data as Record<string, unknown>);
    }
  };

  /**
   * Handle execution failed
   */
  const handleExecutionFailed = (event: ExecutionStreamEvent) => {
    setExecutionStatus('failed');
    setMetrics((prev) => ({
      ...prev,
      endTime: new Date(event.timestamp).getTime(),
      duration: new Date(event.timestamp).getTime() - prev.startTime
    }));
  };

  /**
   * Handle execution cancelled
   */
  const handleExecutionCancelled = (event: ExecutionStreamEvent) => {
    setExecutionStatus('cancelled');
    setMetrics((prev) => ({
      ...prev,
      endTime: new Date(event.timestamp).getTime(),
      duration: new Date(event.timestamp).getTime() - prev.startTime
    }));
  };

  /**
   * Handle node click
   */
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  /**
   * Format duration
   */
  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  /**
   * Format memory
   */
  const formatMemory = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'running':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'skipped':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  /**
   * Auto-fit view on mount
   */
  useEffect(() => {
    if (autoLayout) {
      setTimeout(() => fitView(), 100);
    }
  }, [autoLayout, fitView]);

  // Selected node details
  const selectedNodeStatus = selectedNodeId ? nodeStatuses.get(selectedNodeId) : null;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Header with metrics */}
      {showMetrics && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Live Execution Monitor</h2>
              <p className="text-sm text-gray-500">Execution ID: {executionId}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              executionStatus === 'running' ? 'bg-blue-100 text-blue-800' :
              executionStatus === 'completed' ? 'bg-green-100 text-green-800' :
              executionStatus === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {executionStatus.charAt(0).toUpperCase() + executionStatus.slice(1)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-900">{metrics.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.progress}%` }}
              />
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg font-semibold text-gray-900">{metrics.nodesCompleted}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">In Progress</p>
              <p className="text-lg font-semibold text-blue-600">{metrics.nodesInProgress}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Failed</p>
              <p className="text-lg font-semibold text-red-600">{metrics.nodesFailed}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg. Time/Node</p>
              <p className="text-lg font-semibold text-gray-900">{formatDuration(metrics.averageNodeTime)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Duration</p>
              <p className="text-lg font-semibold text-gray-900">{formatDuration(metrics.duration)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Peak Memory</p>
              <p className="text-lg font-semibold text-gray-900">{formatMemory(metrics.peakMemoryUsage)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workflow visualization */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#b1b1b7', strokeWidth: 1 }
          }}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const status = nodeStatuses.get(node.id)?.status || 'pending';
              switch (status) {
                case 'pending':
                  return '#d1d5db';
                case 'running':
                  return '#3b82f6';
                case 'completed':
                  return '#10b981';
                case 'failed':
                  return '#ef4444';
                default:
                  return '#d1d5db';
              }
            }}
          />

          {/* Node inspection panel */}
          {selectedNodeId && selectedNodeStatus && (
            <Panel position="bottom-right" className="bg-white rounded-lg shadow-lg p-4 max-w-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Node Details</h3>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${getStatusColor(selectedNodeStatus.status)}`}>
                    {selectedNodeStatus.status}
                  </span>
                </div>
                {selectedNodeStatus.duration !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium text-gray-900">
                      {formatDuration(selectedNodeStatus.duration)}
                    </span>
                  </div>
                )}
                {selectedNodeStatus.memoryUsage !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Memory:</span>
                    <span className="font-medium text-gray-900">
                      {formatMemory(selectedNodeStatus.memoryUsage)}
                    </span>
                  </div>
                )}
                {selectedNodeStatus.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded">
                    <p className="text-xs text-red-700">{selectedNodeStatus.error}</p>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrap with ReactFlowProvider
export const LiveExecutionMonitor: React.FC<LiveExecutionMonitorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <LiveExecutionMonitorComponent {...props} />
    </ReactFlowProvider>
  );
};

export default LiveExecutionMonitor;
