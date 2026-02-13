/**
 * Data Lineage Tracker
 * Core system for tracking data flow, transformations, and provenance
 * Performance target: <5% overhead
 */

import { randomUUID } from 'crypto';
import { logger } from '../services/SimpleLogger';
import {
  LineageId,
  NodeId,
  ExecutionId,
  TransformationId,
  DataLineageNode,
  DataLineageEdge,
  DataTransformation,
  DataSource,
  DataProvenance,
  LineageGraph,
  LineageQueryOptions,
  LineageStatistics,
  DataSourceType,
  TransformationType,
  ComplianceFramework,
  DataSensitivity
} from '../types/lineage';

/**
 * Configuration for the lineage tracker
 */
export interface LineageTrackerConfig {
  enabled: boolean;
  captureSnapshots: boolean;
  snapshotMaxSize: number; // bytes
  retentionDays: number;
  compressionEnabled: boolean;
  asyncMode: boolean; // For minimal performance impact
  batchSize: number;
  flushIntervalMs: number;
}

/**
 * Main Data Lineage Tracker class
 */
export class DataLineageTracker {
  private config: LineageTrackerConfig;

  // In-memory storage (would be replaced with DB in production)
  private lineageNodes = new Map<LineageId, DataLineageNode>();
  private lineageEdges = new Map<LineageId, DataLineageEdge>();
  private transformations = new Map<TransformationId, DataTransformation>();
  private dataSources = new Map<LineageId, DataSource>();
  private provenanceRecords = new Map<LineageId, DataProvenance>();

  // Current execution context
  private currentExecutionId: ExecutionId | null = null;
  private currentWorkflowId: string | null = null;

  // Batch processing for async mode
  private pendingOperations: Array<() => void> = [];
  private flushTimer: NodeJS.Timeout | null = null;

  // Performance tracking
  private performanceMetrics = {
    totalOperations: 0,
    totalTime: 0,
    averageOverhead: 0
  };

  constructor(config: Partial<LineageTrackerConfig> = {}) {
    this.config = {
      enabled: true,
      captureSnapshots: true,
      snapshotMaxSize: 1024 * 1024, // 1MB
      retentionDays: 90,
      compressionEnabled: true,
      asyncMode: true,
      batchSize: 100,
      flushIntervalMs: 1000,
      ...config
    };

    if (this.config.asyncMode) {
      this.startBatchProcessing();
    }

    logger.info('DataLineageTracker initialized', {
      asyncMode: this.config.asyncMode,
      captureSnapshots: this.config.captureSnapshots
    });
  }

  /**
   * Start tracking a new execution
   */
  startExecution(workflowId: string, executionId: ExecutionId): void {
    if (!this.config.enabled) return;

    this.currentWorkflowId = workflowId;
    this.currentExecutionId = executionId;

    logger.debug('Started lineage tracking', { workflowId, executionId });
  }

  /**
   * End tracking for current execution
   */
  endExecution(): void {
    if (!this.config.enabled) return;

    if (this.config.asyncMode && this.pendingOperations.length > 0) {
      this.flush();
    }

    logger.debug('Ended lineage tracking', {
      workflowId: this.currentWorkflowId,
      executionId: this.currentExecutionId,
      nodesTracked: this.lineageNodes.size,
      edgesTracked: this.lineageEdges.size
    });

    this.currentWorkflowId = null;
    this.currentExecutionId = null;
  }

  /**
   * Register a data source
   */
  registerDataSource(
    nodeId: NodeId,
    type: DataSourceType,
    name: string,
    location: string,
    options: {
      schema?: Record<string, unknown>;
      sensitivity?: DataSensitivity;
      complianceFrameworks?: ComplianceFramework[];
      tags?: string[];
    } = {}
  ): DataSource {
    const startTime = performance.now();

    const dataSource: DataSource = {
      id: this.generateLineageId(),
      type,
      name,
      location,
      schema: options.schema,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sensitivity: options.sensitivity,
        complianceFrameworks: options.complianceFrameworks || [],
        tags: options.tags
      }
    };

    this.executeOperation(() => {
      this.dataSources.set(dataSource.id, dataSource);
    });

    this.trackPerformance(performance.now() - startTime);

    return dataSource;
  }

  /**
   * Track a node in the lineage
   */
  trackNode(
    nodeId: NodeId,
    dataSource: DataSource,
    options: {
      upstreamNodes?: LineageId[];
      schema?: Record<string, string>;
      sampleData?: unknown[];
      recordCount?: number;
      size?: number;
      nodeName?: string;
      nodeType?: string;
    } = {}
  ): DataLineageNode {
    if (!this.config.enabled || !this.currentExecutionId) {
      return this.createDummyNode(nodeId);
    }

    const startTime = performance.now();

    const lineageNode: DataLineageNode = {
      id: this.generateLineageId(),
      nodeId,
      executionId: this.currentExecutionId,
      timestamp: new Date().toISOString(),
      dataSource,
      dataSnapshot: this.config.captureSnapshots ? {
        schema: options.schema || {},
        sampleData: this.captureSample(options.sampleData),
        recordCount: options.recordCount || 0,
        size: options.size || 0,
        checksum: this.calculateChecksum(options.sampleData)
      } : undefined,
      upstreamNodes: options.upstreamNodes || [],
      downstreamNodes: [],
      transformations: [],
      metadata: {
        nodeName: options.nodeName || nodeId,
        nodeType: options.nodeType || 'unknown',
        workflowId: this.currentWorkflowId || 'unknown',
        version: '1.0'
      }
    };

    this.executeOperation(() => {
      this.lineageNodes.set(lineageNode.id, lineageNode);

      // Update upstream nodes' downstream references
      for (const upstreamId of lineageNode.upstreamNodes) {
        const upstreamNode = this.lineageNodes.get(upstreamId);
        if (upstreamNode && !upstreamNode.downstreamNodes.includes(lineageNode.id)) {
          upstreamNode.downstreamNodes.push(lineageNode.id);
        }
      }
    });

    this.trackPerformance(performance.now() - startTime);

    return lineageNode;
  }

  /**
   * Track a transformation
   */
  trackTransformation(
    type: TransformationType,
    nodeId: NodeId,
    inputs: DataLineageNode[],
    outputs: DataLineageNode[],
    operation: {
      name: string;
      description?: string;
      code?: string;
      expression?: string;
      parameters?: Record<string, unknown>;
    },
    metrics: {
      duration: number;
      inputRecords: number;
      outputRecords: number;
      bytesProcessed: number;
    },
    compliance: {
      frameworks?: ComplianceFramework[];
      auditTrail?: boolean;
      encryptionApplied?: boolean;
      piiDetected?: boolean;
    } = {}
  ): DataTransformation {
    if (!this.config.enabled || !this.currentExecutionId) {
      return this.createDummyTransformation();
    }

    const startTime = performance.now();

    const transformation: DataTransformation = {
      id: this.generateTransformationId(),
      type,
      nodeId,
      executionId: this.currentExecutionId,
      timestamp: new Date().toISOString(),
      inputs,
      outputs,
      operation,
      metrics,
      quality: {
        dataQualityScore: this.calculateDataQuality(inputs, outputs, metrics),
        validationErrors: 0,
        duplicatesRemoved: 0,
        nullsHandled: 0
      },
      compliance: {
        frameworks: compliance.frameworks || [],
        auditTrail: compliance.auditTrail ?? true,
        encryptionApplied: compliance.encryptionApplied ?? false,
        piiDetected: compliance.piiDetected ?? false
      }
    };

    this.executeOperation(() => {
      this.transformations.set(transformation.id, transformation);

      // Link transformation to lineage nodes
      for (const output of outputs) {
        const node = this.lineageNodes.get(output.id);
        if (node && !node.transformations.includes(transformation.id)) {
          node.transformations.push(transformation.id);
        }
      }
    });

    this.trackPerformance(performance.now() - startTime);

    return transformation;
  }

  /**
   * Track data flow (edge) between nodes
   */
  trackDataFlow(
    sourceNode: DataLineageNode,
    targetNode: DataLineageNode,
    metrics: {
      recordsTransferred: number;
      bytesTransferred: number;
      duration: number;
    },
    transformation?: TransformationId
  ): DataLineageEdge {
    if (!this.config.enabled || !this.currentExecutionId) {
      return this.createDummyEdge();
    }

    const startTime = performance.now();

    const edge: DataLineageEdge = {
      id: this.generateLineageId(),
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      executionId: this.currentExecutionId,
      timestamp: new Date().toISOString(),
      dataFlow: {
        ...metrics,
        throughput: metrics.duration > 0 ? metrics.recordsTransferred / (metrics.duration / 1000) : 0
      },
      transformation,
      metadata: {}
    };

    this.executeOperation(() => {
      this.lineageEdges.set(edge.id, edge);
    });

    this.trackPerformance(performance.now() - startTime);

    return edge;
  }

  /**
   * Create provenance record for data
   */
  createProvenance(
    dataId: LineageId,
    source: DataSource,
    transformationChain: TransformationId[],
    options: {
      creator?: string;
      purpose?: string;
      consentObtained?: boolean;
      retentionExpiry?: string;
    } = {}
  ): DataProvenance {
    const processingNodes = this.getProcessingNodesForData(dataId);

    const provenance: DataProvenance = {
      dataId,
      timestamp: new Date().toISOString(),
      origin: {
        source,
        originalTimestamp: new Date().toISOString(),
        creator: options.creator,
        purpose: options.purpose
      },
      transformationChain,
      processingNodes,
      auditTrail: {
        accessLog: [],
        modifications: []
      },
      compliance: {
        consentObtained: options.consentObtained ?? false,
        frameworks: source.metadata.complianceFrameworks || []
      }
    };

    this.executeOperation(() => {
      this.provenanceRecords.set(dataId, provenance);
    });

    return provenance;
  }

  /**
   * Build complete lineage graph for execution
   */
  buildLineageGraph(executionId?: ExecutionId): LineageGraph {
    const targetExecutionId = executionId || this.currentExecutionId;
    if (!targetExecutionId) {
      throw new Error('No execution ID provided or active');
    }

    // Filter nodes and edges for this execution
    const executionNodes = new Map<LineageId, DataLineageNode>();
    const executionEdges = new Map<LineageId, DataLineageEdge>();
    const executionTransformations = new Map<TransformationId, DataTransformation>();

    for (const [id, node] of this.lineageNodes) {
      if (node.executionId === targetExecutionId) {
        executionNodes.set(id, node);
      }
    }

    for (const [id, edge] of this.lineageEdges) {
      if (edge.executionId === targetExecutionId) {
        executionEdges.set(id, edge);
      }
    }

    for (const [id, transformation] of this.transformations) {
      if (transformation.executionId === targetExecutionId) {
        executionTransformations.set(id, transformation);
      }
    }

    // Identify sources and sinks
    const sources: LineageId[] = [];
    const sinks: LineageId[] = [];

    for (const [id, node] of executionNodes) {
      if (node.upstreamNodes.length === 0) {
        sources.push(id);
      }
      if (node.downstreamNodes.length === 0) {
        sinks.push(id);
      }
    }

    const graph: LineageGraph = {
      id: randomUUID(),
      workflowId: this.currentWorkflowId || 'unknown',
      executionId: targetExecutionId,
      timestamp: new Date().toISOString(),
      nodes: executionNodes,
      edges: executionEdges,
      transformations: executionTransformations,
      sources,
      sinks,
      metadata: {
        totalNodes: executionNodes.size,
        totalEdges: executionEdges.size,
        totalTransformations: executionTransformations.size,
        depth: this.calculateGraphDepth(executionNodes, sources),
        complexity: this.calculateComplexity(executionNodes, executionEdges)
      }
    };

    return graph;
  }

  /**
   * Query lineage with filters
   */
  queryLineage(options: LineageQueryOptions): {
    nodes: DataLineageNode[];
    edges: DataLineageEdge[];
    transformations: DataTransformation[];
  } {
    let nodes = Array.from(this.lineageNodes.values());
    let edges = Array.from(this.lineageEdges.values());
    let transformations = Array.from(this.transformations.values());

    // Apply filters
    if (options.workflowId) {
      nodes = nodes.filter(n => n.metadata.workflowId === options.workflowId);
    }

    if (options.executionId) {
      nodes = nodes.filter(n => n.executionId === options.executionId);
      edges = edges.filter(e => e.executionId === options.executionId);
      transformations = transformations.filter(t => t.executionId === options.executionId);
    }

    if (options.nodeIds && options.nodeIds.length > 0) {
      nodes = nodes.filter(n => options.nodeIds!.includes(n.nodeId));
    }

    if (options.timeRange) {
      const start = new Date(options.timeRange.start);
      const end = new Date(options.timeRange.end);
      nodes = nodes.filter(n => {
        const timestamp = new Date(n.timestamp);
        return timestamp >= start && timestamp <= end;
      });
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 1000;

    return {
      nodes: nodes.slice(offset, offset + limit),
      edges: edges.slice(offset, offset + limit),
      transformations: transformations.slice(offset, offset + limit)
    };
  }

  /**
   * Get statistics
   */
  getStatistics(period?: { start: string; end: string }): LineageStatistics {
    let nodes = Array.from(this.lineageNodes.values());
    let transformations = Array.from(this.transformations.values());

    if (period) {
      const start = new Date(period.start);
      const end = new Date(period.end);
      nodes = nodes.filter(n => {
        const timestamp = new Date(n.timestamp);
        return timestamp >= start && timestamp <= end;
      });
      transformations = transformations.filter(t => {
        const timestamp = new Date(t.timestamp);
        return timestamp >= start && timestamp <= end;
      });
    }

    const totalRecordsProcessed = transformations.reduce(
      (sum, t) => sum + t.metrics.inputRecords,
      0
    );

    const totalBytesProcessed = transformations.reduce(
      (sum, t) => sum + t.metrics.bytesProcessed,
      0
    );

    const averageTransformationTime = transformations.length > 0
      ? transformations.reduce((sum, t) => sum + t.metrics.duration, 0) / transformations.length
      : 0;

    return {
      timestamp: new Date().toISOString(),
      period: period || { start: '', end: '' },
      totalNodes: nodes.length,
      totalEdges: this.lineageEdges.size,
      totalTransformations: transformations.length,
      totalDataSources: this.dataSources.size,
      totalRecordsProcessed,
      totalBytesProcessed,
      averageTransformationTime,
      averageThroughput: totalRecordsProcessed / (transformations.length || 1),
      complianceScore: this.calculateComplianceScore(),
      violationCount: 0,
      auditTrailCoverage: this.calculateAuditTrailCoverage(),
      dataQualityScore: this.calculateOverallDataQuality(),
      errorRate: 0,
      topDataSources: [],
      topTransformations: [],
      mostComplexWorkflows: []
    };
  }

  /**
   * Get provenance for specific data
   */
  getProvenance(dataId: LineageId): DataProvenance | undefined {
    return this.provenanceRecords.get(dataId);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      overheadPercentage: this.performanceMetrics.averageOverhead * 100,
      enabled: this.config.enabled,
      asyncMode: this.config.asyncMode
    };
  }

  /**
   * Clear old data based on retention policy
   */
  cleanup(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    const cutoffTime = cutoffDate.toISOString();

    let removedNodes = 0;
    let removedEdges = 0;
    let removedTransformations = 0;

    for (const [id, node] of this.lineageNodes) {
      if (node.timestamp < cutoffTime) {
        this.lineageNodes.delete(id);
        removedNodes++;
      }
    }

    for (const [id, edge] of this.lineageEdges) {
      if (edge.timestamp < cutoffTime) {
        this.lineageEdges.delete(id);
        removedEdges++;
      }
    }

    for (const [id, transformation] of this.transformations) {
      if (transformation.timestamp < cutoffTime) {
        this.transformations.delete(id);
        removedTransformations++;
      }
    }

    logger.info('Lineage cleanup completed', {
      removedNodes,
      removedEdges,
      removedTransformations,
      retentionDays: this.config.retentionDays
    });
  }

  /**
   * Shutdown tracker and flush pending operations
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flush();

    logger.info('DataLineageTracker shut down', {
      totalNodes: this.lineageNodes.size,
      totalEdges: this.lineageEdges.size,
      performanceOverhead: `${(this.performanceMetrics.averageOverhead * 100).toFixed(2)}%`
    });
  }

  // Private helper methods

  private generateLineageId(): LineageId {
    return `lineage-${randomUUID()}`;
  }

  private generateTransformationId(): TransformationId {
    return `transform-${randomUUID()}`;
  }

  private executeOperation(operation: () => void): void {
    if (this.config.asyncMode) {
      this.pendingOperations.push(operation);
      if (this.pendingOperations.length >= this.config.batchSize) {
        this.flush();
      }
    } else {
      operation();
    }
  }

  private startBatchProcessing(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);
  }

  private flush(): void {
    if (this.pendingOperations.length === 0) return;

    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      operation();
    }

    logger.debug(`Flushed ${operations.length} lineage operations`);
  }

  private captureSample(data?: unknown[]): unknown[] | undefined {
    if (!data || !this.config.captureSnapshots) return undefined;

    // Limit sample size
    const maxSamples = 10;
    return data.slice(0, maxSamples);
  }

  private calculateChecksum(data?: unknown[]): string | undefined {
    if (!data) return undefined;

    // Simple hash for demo - in production use proper hashing
    return `checksum-${data.length}-${Date.now()}`;
  }

  private calculateDataQuality(
    inputs: DataLineageNode[],
    outputs: DataLineageNode[],
    metrics: { inputRecords: number; outputRecords: number }
  ): number {
    // Simple quality score based on data preservation
    if (metrics.inputRecords === 0) return 100;
    const preservationRatio = metrics.outputRecords / metrics.inputRecords;
    return Math.min(100, preservationRatio * 100);
  }

  private getProcessingNodesForData(dataId: LineageId): DataProvenance['processingNodes'] {
    const node = this.lineageNodes.get(dataId);
    if (!node) return [];

    return [{
      nodeId: dataId,
      timestamp: node.timestamp,
      operation: 'created',
      changes: []
    }];
  }

  private calculateGraphDepth(
    nodes: Map<LineageId, DataLineageNode>,
    sources: LineageId[]
  ): number {
    let maxDepth = 0;

    const calculateDepth = (nodeId: LineageId, currentDepth: number, visited: Set<LineageId>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      maxDepth = Math.max(maxDepth, currentDepth);

      const node = nodes.get(nodeId);
      if (node) {
        for (const downstreamId of node.downstreamNodes) {
          calculateDepth(downstreamId, currentDepth + 1, visited);
        }
      }
    };

    for (const sourceId of sources) {
      calculateDepth(sourceId, 1, new Set());
    }

    return maxDepth;
  }

  private calculateComplexity(
    nodes: Map<LineageId, DataLineageNode>,
    edges: Map<LineageId, DataLineageEdge>
  ): number {
    // Complexity metric based on nodes, edges, and branching factor
    const nodeCount = nodes.size;
    const edgeCount = edges.size;
    const avgBranching = nodeCount > 0 ? edgeCount / nodeCount : 0;

    return Math.round(nodeCount * (1 + avgBranching));
  }

  private calculateComplianceScore(): number {
    const totalTransformations = this.transformations.size;
    if (totalTransformations === 0) return 100;

    const compliantTransformations = Array.from(this.transformations.values()).filter(
      t => t.compliance.auditTrail && t.compliance.frameworks.length > 0
    ).length;

    return Math.round((compliantTransformations / totalTransformations) * 100);
  }

  private calculateAuditTrailCoverage(): number {
    const totalNodes = this.lineageNodes.size;
    if (totalNodes === 0) return 100;

    const nodesWithAuditTrail = Array.from(this.lineageNodes.values()).filter(
      n => n.transformations.length > 0
    ).length;

    return Math.round((nodesWithAuditTrail / totalNodes) * 100);
  }

  private calculateOverallDataQuality(): number {
    const transformations = Array.from(this.transformations.values());
    if (transformations.length === 0) return 100;

    const avgQuality = transformations.reduce(
      (sum, t) => sum + (t.quality.dataQualityScore || 100),
      0
    ) / transformations.length;

    return Math.round(avgQuality);
  }

  private trackPerformance(operationTime: number): void {
    this.performanceMetrics.totalOperations++;
    this.performanceMetrics.totalTime += operationTime;
    this.performanceMetrics.averageOverhead =
      this.performanceMetrics.totalTime / this.performanceMetrics.totalOperations / 1000; // Convert to seconds
  }

  private createDummyNode(nodeId: NodeId): DataLineageNode {
    return {
      id: 'dummy',
      nodeId,
      executionId: 'none',
      timestamp: new Date().toISOString(),
      dataSource: this.createDummyDataSource(),
      upstreamNodes: [],
      downstreamNodes: [],
      transformations: [],
      metadata: {
        nodeName: nodeId,
        nodeType: 'unknown',
        workflowId: 'unknown'
      }
    };
  }

  private createDummyDataSource(): DataSource {
    return {
      id: 'dummy',
      type: DataSourceType.MANUAL,
      name: 'dummy',
      location: 'none',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        complianceFrameworks: []
      }
    };
  }

  private createDummyTransformation(): DataTransformation {
    return {
      id: 'dummy',
      type: TransformationType.CUSTOM,
      nodeId: 'dummy',
      executionId: 'none',
      timestamp: new Date().toISOString(),
      inputs: [],
      outputs: [],
      operation: { name: 'dummy' },
      metrics: {
        duration: 0,
        inputRecords: 0,
        outputRecords: 0,
        bytesProcessed: 0
      },
      quality: {},
      compliance: {
        frameworks: [],
        auditTrail: false,
        encryptionApplied: false,
        piiDetected: false
      }
    };
  }

  private createDummyEdge(): DataLineageEdge {
    return {
      id: 'dummy',
      sourceNodeId: 'dummy',
      targetNodeId: 'dummy',
      executionId: 'none',
      timestamp: new Date().toISOString(),
      dataFlow: {
        recordsTransferred: 0,
        bytesTransferred: 0,
        duration: 0,
        throughput: 0
      },
      metadata: {}
    };
  }
}

/**
 * Singleton instance for global lineage tracking
 */
export const globalLineageTracker = new DataLineageTracker({
  enabled: true,
  asyncMode: true,
  captureSnapshots: true
});
