/**
 * Live Execution Monitor
 * Real-time tracking of active workflow executions
 *
 * Features:
 * - Active execution tracking
 * - Real-time progress updates
 * - Data flow visualization
 * - Performance metrics per node
 * - Error detection and alerts
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import { globalMetricsCollector } from './RealTimeMetricsCollector';

/**
 * Execution status
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

/**
 * Node execution status
 */
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';

/**
 * Node execution info
 */
export interface NodeExecutionInfo {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: NodeExecutionStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  retryCount?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Data flow event
 */
export interface DataFlowEvent {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  timestamp: number;
  dataSize?: number;
  data?: unknown;
}

/**
 * Live execution
 */
export interface LiveExecution {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  progress: number; // 0-100
  nodes: Map<string, NodeExecutionInfo>;
  dataFlows: DataFlowEvent[];
  currentNode?: string;
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  triggeredBy?: string;
  environment?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  executionId: string;
  totalDuration: number;
  nodeMetrics: Map<string, {
    duration: number;
    memoryUsage: number;
    cpuUsage: number;
  }>;
  slowestNode?: { nodeId: string; duration: number };
  fastestNode?: { nodeId: string; duration: number };
  averageNodeDuration: number;
  dataTransferred: number;
  errorCount: number;
  retryCount: number;
}

/**
 * Execution filter
 */
export interface ExecutionFilter {
  workflowId?: string;
  status?: ExecutionStatus[];
  environment?: string;
  startTimeFrom?: number;
  startTimeTo?: number;
  tags?: string[];
}

/**
 * Live Execution Monitor
 */
export class LiveExecutionMonitor extends EventEmitter {
  private activeExecutions = new Map<string, LiveExecution>();
  private executionHistory: LiveExecution[] = [];
  private maxHistorySize = 1000;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startMetricsCollection();
    logger.info('LiveExecutionMonitor initialized');
  }

  /**
   * Start execution tracking
   */
  startExecution(
    executionId: string,
    workflowId: string,
    workflowName: string,
    options?: {
      triggeredBy?: string;
      environment?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      totalNodes?: number;
    }
  ): void {
    const execution: LiveExecution = {
      executionId,
      workflowId,
      workflowName,
      status: 'running',
      startTime: Date.now(),
      progress: 0,
      nodes: new Map(),
      dataFlows: [],
      totalNodes: options?.totalNodes || 0,
      completedNodes: 0,
      failedNodes: 0,
      triggeredBy: options?.triggeredBy,
      environment: options?.environment,
      tags: options?.tags,
      metadata: options?.metadata
    };

    this.activeExecutions.set(executionId, execution);

    // Record metric
    globalMetricsCollector.incrementCounter('workflow_executions_total', {
      status: 'started',
      workflow_id: workflowId
    });

    globalMetricsCollector.setGauge('active_executions', this.activeExecutions.size);

    this.emit('execution:started', { executionId, execution });

    logger.info('Execution started', {
      executionId,
      workflowId,
      workflowName
    });
  }

  /**
   * Update execution progress
   */
  updateProgress(executionId: string, progress: number): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.progress = Math.max(0, Math.min(100, progress));

    this.emit('execution:progress', {
      executionId,
      progress: execution.progress
    });
  }

  /**
   * Start node execution
   */
  startNode(
    executionId: string,
    nodeId: string,
    nodeName: string,
    nodeType: string,
    input?: unknown
  ): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    const nodeInfo: NodeExecutionInfo = {
      nodeId,
      nodeName,
      nodeType,
      status: 'running',
      startTime: Date.now(),
      input,
      retryCount: 0
    };

    execution.nodes.set(nodeId, nodeInfo);
    execution.currentNode = nodeId;

    this.emit('node:started', {
      executionId,
      nodeId,
      nodeInfo
    });

    logger.debug('Node started', {
      executionId,
      nodeId,
      nodeName,
      nodeType
    });
  }

  /**
   * Complete node execution
   */
  completeNode(
    executionId: string,
    nodeId: string,
    output?: unknown,
    metrics?: {
      memoryUsage?: number;
      cpuUsage?: number;
    }
  ): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    const nodeInfo = execution.nodes.get(nodeId);
    if (!nodeInfo) return;

    nodeInfo.status = 'completed';
    nodeInfo.endTime = Date.now();
    nodeInfo.duration = nodeInfo.endTime - (nodeInfo.startTime || nodeInfo.endTime);
    nodeInfo.output = output;
    nodeInfo.memoryUsage = metrics?.memoryUsage;
    nodeInfo.cpuUsage = metrics?.cpuUsage;

    execution.completedNodes++;
    execution.progress = (execution.completedNodes / execution.totalNodes) * 100;

    // Record metrics
    globalMetricsCollector.observeHistogram('node_execution_duration_ms', nodeInfo.duration, {
      node_type: nodeInfo.nodeType,
      workflow_id: execution.workflowId
    });

    this.emit('node:completed', {
      executionId,
      nodeId,
      nodeInfo
    });

    logger.debug('Node completed', {
      executionId,
      nodeId,
      duration: nodeInfo.duration
    });
  }

  /**
   * Fail node execution
   */
  failNode(
    executionId: string,
    nodeId: string,
    error: string
  ): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    const nodeInfo = execution.nodes.get(nodeId);
    if (!nodeInfo) return;

    nodeInfo.status = 'failed';
    nodeInfo.endTime = Date.now();
    nodeInfo.duration = nodeInfo.endTime - (nodeInfo.startTime || nodeInfo.endTime);
    nodeInfo.error = error;

    execution.failedNodes++;

    this.emit('node:failed', {
      executionId,
      nodeId,
      nodeInfo,
      error
    });

    logger.warn('Node failed', {
      executionId,
      nodeId,
      error
    });
  }

  /**
   * Record data flow between nodes
   */
  recordDataFlow(
    executionId: string,
    fromNodeId: string,
    toNodeId: string,
    data?: unknown
  ): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    const dataFlow: DataFlowEvent = {
      id: `${executionId}-${fromNodeId}-${toNodeId}-${Date.now()}`,
      fromNodeId,
      toNodeId,
      timestamp: Date.now(),
      data,
      dataSize: data ? JSON.stringify(data).length : undefined
    };

    execution.dataFlows.push(dataFlow);

    // Keep only last 100 data flows
    if (execution.dataFlows.length > 100) {
      execution.dataFlows = execution.dataFlows.slice(-100);
    }

    this.emit('data:flow', {
      executionId,
      dataFlow
    });
  }

  /**
   * Complete execution
   */
  completeExecution(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;
    execution.progress = 100;

    // Move to history
    this.moveToHistory(execution);

    // Record metrics
    globalMetricsCollector.observeHistogram('workflow_execution_duration_ms', execution.duration, {
      workflow_id: execution.workflowId
    });

    globalMetricsCollector.incrementCounter('workflow_executions_total', {
      status: 'completed',
      workflow_id: execution.workflowId
    });

    globalMetricsCollector.setGauge('active_executions', this.activeExecutions.size);

    this.emit('execution:completed', {
      executionId,
      execution
    });

    logger.info('Execution completed', {
      executionId,
      duration: execution.duration,
      completedNodes: execution.completedNodes,
      failedNodes: execution.failedNodes
    });
  }

  /**
   * Fail execution
   */
  failExecution(executionId: string, error: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;

    // Move to history
    this.moveToHistory(execution);

    // Record metrics
    globalMetricsCollector.incrementCounter('workflow_executions_total', {
      status: 'failed',
      workflow_id: execution.workflowId
    });

    globalMetricsCollector.setGauge('active_executions', this.activeExecutions.size);

    this.emit('execution:failed', {
      executionId,
      execution,
      error
    });

    logger.error('Execution failed', {
      executionId,
      error,
      duration: execution.duration
    });
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.status = 'cancelled';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;

    // Move to history
    this.moveToHistory(execution);

    // Record metrics
    globalMetricsCollector.incrementCounter('workflow_executions_total', {
      status: 'cancelled',
      workflow_id: execution.workflowId
    });

    globalMetricsCollector.setGauge('active_executions', this.activeExecutions.size);

    this.emit('execution:cancelled', {
      executionId,
      execution
    });

    logger.warn('Execution cancelled', {
      executionId,
      duration: execution.duration
    });
  }

  /**
   * Get active executions
   */
  getActiveExecutions(filter?: ExecutionFilter): LiveExecution[] {
    let executions = Array.from(this.activeExecutions.values());

    if (filter) {
      executions = this.filterExecutions(executions, filter);
    }

    return executions;
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): LiveExecution | null {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * Get execution history
   */
  getHistory(filter?: ExecutionFilter, limit: number = 100): LiveExecution[] {
    let history = [...this.executionHistory];

    if (filter) {
      history = this.filterExecutions(history, filter);
    }

    return history.slice(0, limit);
  }

  /**
   * Get execution metrics
   */
  getMetrics(executionId: string): ExecutionMetrics | null {
    const execution = this.activeExecutions.get(executionId) ||
                      this.executionHistory.find(e => e.executionId === executionId);

    if (!execution) return null;

    const nodeMetrics = new Map<string, {
      duration: number;
      memoryUsage: number;
      cpuUsage: number;
    }>();

    let totalDuration = 0;
    let slowestNode: { nodeId: string; duration: number } | undefined;
    let fastestNode: { nodeId: string; duration: number } | undefined;
    let dataTransferred = 0;
    let errorCount = 0;
    let retryCount = 0;

    for (const [nodeId, nodeInfo] of execution.nodes) {
      if (nodeInfo.duration) {
        nodeMetrics.set(nodeId, {
          duration: nodeInfo.duration,
          memoryUsage: nodeInfo.memoryUsage || 0,
          cpuUsage: nodeInfo.cpuUsage || 0
        });

        totalDuration += nodeInfo.duration;

        if (!slowestNode || nodeInfo.duration > slowestNode.duration) {
          slowestNode = { nodeId, duration: nodeInfo.duration };
        }

        if (!fastestNode || nodeInfo.duration < fastestNode.duration) {
          fastestNode = { nodeId, duration: nodeInfo.duration };
        }
      }

      if (nodeInfo.status === 'failed') {
        errorCount++;
      }

      retryCount += nodeInfo.retryCount || 0;
    }

    for (const flow of execution.dataFlows) {
      dataTransferred += flow.dataSize || 0;
    }

    const averageNodeDuration = nodeMetrics.size > 0 ? totalDuration / nodeMetrics.size : 0;

    return {
      executionId,
      totalDuration: execution.duration || (Date.now() - execution.startTime),
      nodeMetrics,
      slowestNode,
      fastestNode,
      averageNodeDuration,
      dataTransferred,
      errorCount,
      retryCount
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    activeExecutions: number;
    totalExecutions: number;
    completedToday: number;
    failedToday: number;
    averageDuration: number;
    successRate: number;
  } {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const completedToday = this.executionHistory.filter(
      e => e.status === 'completed' && e.startTime >= todayStart
    ).length;

    const failedToday = this.executionHistory.filter(
      e => e.status === 'failed' && e.startTime >= todayStart
    ).length;

    const completedExecutions = this.executionHistory.filter(e => e.duration);
    const totalDuration = completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
    const averageDuration = completedExecutions.length > 0
      ? totalDuration / completedExecutions.length
      : 0;

    const totalCompleted = this.executionHistory.filter(e => e.status === 'completed').length;
    const totalFailed = this.executionHistory.filter(e => e.status === 'failed').length;
    const successRate = (totalCompleted + totalFailed) > 0
      ? (totalCompleted / (totalCompleted + totalFailed)) * 100
      : 0;

    return {
      activeExecutions: this.activeExecutions.size,
      totalExecutions: this.executionHistory.length,
      completedToday,
      failedToday,
      averageDuration,
      successRate
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.executionHistory = [];
    logger.info('Execution history cleared');
  }

  /**
   * Shutdown monitor
   */
  shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.removeAllListeners();
    logger.info('LiveExecutionMonitor shutdown');
  }

  // Private methods

  private moveToHistory(execution: LiveExecution): void {
    this.activeExecutions.delete(execution.executionId);
    this.executionHistory.unshift(execution);

    // Limit history size
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
    }
  }

  private filterExecutions(
    executions: LiveExecution[],
    filter: ExecutionFilter
  ): LiveExecution[] {
    return executions.filter(execution => {
      if (filter.workflowId && execution.workflowId !== filter.workflowId) {
        return false;
      }

      if (filter.status && !filter.status.includes(execution.status)) {
        return false;
      }

      if (filter.environment && execution.environment !== filter.environment) {
        return false;
      }

      if (filter.startTimeFrom && execution.startTime < filter.startTimeFrom) {
        return false;
      }

      if (filter.startTimeTo && execution.startTime > filter.startTimeTo) {
        return false;
      }

      if (filter.tags && filter.tags.length > 0) {
        const executionTags = execution.tags || [];
        if (!filter.tags.some(tag => executionTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  private startMetricsCollection(): void {
    // Update metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      globalMetricsCollector.setGauge('active_executions', this.activeExecutions.size);
    }, 5000);
  }
}

/**
 * Global execution monitor instance
 */
export const globalExecutionMonitor = new LiveExecutionMonitor();
