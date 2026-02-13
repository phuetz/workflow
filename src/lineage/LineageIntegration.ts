/**
 * Lineage Integration
 * Integrates data lineage tracking with workflow execution
 */

import { logger } from '../services/SimpleLogger';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { SafeExecutionResult, SafeObject } from '../utils/TypeSafetyUtils';
import { DataLineageTracker } from './DataLineageTracker';
import { globalOTelService } from '../observability/OpenTelemetryIntegration';
import {
  DataSourceType,
  TransformationType,
  ComplianceFramework,
  DataSensitivity,
  NodeId,
  ExecutionId
} from '../types/lineage';

/**
 * Lineage integration options
 */
export interface LineageIntegrationOptions {
  enabled: boolean;
  captureSnapshots: boolean;
  trackTransformations: boolean;
  enableTracing: boolean;
  complianceFrameworks: ComplianceFramework[];
}

/**
 * Lineage-aware execution wrapper
 */
export class LineageAwareExecution {
  private lineageTracker: DataLineageTracker;
  private options: LineageIntegrationOptions;
  private nodeLineageMap = new Map<NodeId, string>(); // Maps node ID to lineage node ID

  constructor(
    lineageTracker: DataLineageTracker,
    options: Partial<LineageIntegrationOptions> = {}
  ) {
    this.lineageTracker = lineageTracker;
    this.options = {
      enabled: true,
      captureSnapshots: true,
      trackTransformations: true,
      enableTracing: true,
      complianceFrameworks: [],
      ...options
    };
  }

  /**
   * Start tracking execution
   */
  startExecution(workflowId: string, executionId: ExecutionId): void {
    if (!this.options.enabled) return;

    this.lineageTracker.startExecution(workflowId, executionId);

    if (this.options.enableTracing) {
      globalOTelService.startTrace(workflowId, executionId);
    }

    logger.debug('Lineage tracking started', { workflowId, executionId });
  }

  /**
   * End tracking execution
   */
  endExecution(): void {
    if (!this.options.enabled) return;

    this.lineageTracker.endExecution();

    logger.debug('Lineage tracking ended');
  }

  /**
   * Track node execution start
   */
  trackNodeStart(
    node: WorkflowNode,
    inputData: SafeObject
  ): string | null {
    if (!this.options.enabled) return null;

    const spanId = this.options.enableTracing
      ? globalOTelService.startSpan(
          `execute-${node.data.type}`,
          'INTERNAL',
          {
            'node.id': node.id,
            'node.type': node.data.type,
            'node.label': node.data.label
          }
        )
      : null;

    // Register data source
    const dataSource = this.lineageTracker.registerDataSource(
      node.id,
      this.inferDataSourceType(node.data.type),
      node.data.label,
      `workflow://${node.id}`,
      {
        schema: inputData as Record<string, unknown>,
        sensitivity: this.inferDataSensitivity(node.data.type),
        complianceFrameworks: this.options.complianceFrameworks,
        tags: [node.data.type]
      }
    );

    // Get upstream lineage nodes
    const upstreamNodes = this.getUpstreamLineageNodes(node.id);

    // Track lineage node
    const lineageNode = this.lineageTracker.trackNode(
      node.id,
      dataSource,
      {
        upstreamNodes,
        schema: this.extractSchema(inputData),
        recordCount: this.countRecords(inputData),
        size: this.estimateSize(inputData),
        nodeName: node.data.label,
        nodeType: node.data.type
      }
    );

    this.nodeLineageMap.set(node.id, lineageNode.id);

    return spanId;
  }

  /**
   * Track node execution completion
   */
  trackNodeComplete(
    node: WorkflowNode,
    inputData: SafeObject,
    result: SafeExecutionResult,
    spanId: string | null
  ): void {
    if (!this.options.enabled) return;

    const lineageNodeId = this.nodeLineageMap.get(node.id);
    if (!lineageNodeId) return;

    // Track transformation if applicable
    if (this.options.trackTransformations && this.isTransformationNode(node.data.type)) {
      const upstreamLineageNodes = this.getUpstreamLineageNodesObjects(node.id);
      const currentLineageNode = this.lineageTracker['lineageNodes'].get(lineageNodeId);

      if (currentLineageNode) {
        this.lineageTracker.trackTransformation(
          this.inferTransformationType(node.data.type),
          node.id,
          upstreamLineageNodes,
          [currentLineageNode],
          {
            name: node.data.type,
            description: `${node.data.label} transformation`,
            parameters: node.data.config
          },
          {
            duration: result.duration || 0,
            inputRecords: this.countRecords(inputData),
            outputRecords: this.countRecords(result.data || {}),
            bytesProcessed: this.estimateSize(result.data || {})
          },
          {
            frameworks: this.options.complianceFrameworks,
            auditTrail: true,
            encryptionApplied: this.hasEncryption(node.data.config),
            piiDetected: this.detectPII(result.data || {})
          }
        );
      }
    }

    // End tracing span
    if (this.options.enableTracing && spanId) {
      globalOTelService.endSpan(
        spanId,
        result.success ? 'OK' : 'ERROR',
        result.error
      );

      // Record metrics
      if (result.duration) {
        globalOTelService.recordMetric(
          'node.execution.duration',
          result.duration,
          'ms',
          {
            'node.type': node.data.type,
            'node.id': node.id
          }
        );
      }
    }
  }

  /**
   * Track data flow between nodes
   */
  trackDataFlow(
    sourceNode: WorkflowNode,
    targetNode: WorkflowNode,
    data: SafeObject,
    duration: number
  ): void {
    if (!this.options.enabled) return;

    const sourceLineageId = this.nodeLineageMap.get(sourceNode.id);
    const targetLineageId = this.nodeLineageMap.get(targetNode.id);

    if (!sourceLineageId || !targetLineageId) return;

    const sourceLineageNode = this.lineageTracker['lineageNodes'].get(sourceLineageId);
    const targetLineageNode = this.lineageTracker['lineageNodes'].get(targetLineageId);

    if (!sourceLineageNode || !targetLineageNode) return;

    this.lineageTracker.trackDataFlow(
      sourceLineageNode,
      targetLineageNode,
      {
        recordsTransferred: this.countRecords(data),
        bytesTransferred: this.estimateSize(data),
        duration
      }
    );
  }

  /**
   * Get complete lineage graph
   */
  getLineageGraph(executionId?: ExecutionId) {
    if (!this.options.enabled) return null;
    return this.lineageTracker.buildLineageGraph(executionId);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    if (!this.options.enabled) return null;
    return this.lineageTracker.getPerformanceMetrics();
  }

  // Private helper methods

  private getUpstreamLineageNodes(nodeId: NodeId): string[] {
    const upstreamIds: string[] = [];

    for (const [id, lineageId] of this.nodeLineageMap) {
      if (id !== nodeId) {
        // This is simplified - in production, check actual edges
        upstreamIds.push(lineageId);
      }
    }

    return upstreamIds;
  }

  private getUpstreamLineageNodesObjects(nodeId: NodeId) {
    const nodes: any[] = [];
    const upstreamIds = this.getUpstreamLineageNodes(nodeId);

    for (const id of upstreamIds) {
      const node = this.lineageTracker['lineageNodes'].get(id);
      if (node) nodes.push(node);
    }

    return nodes;
  }

  private inferDataSourceType(nodeType: string): DataSourceType {
    const typeMap: Record<string, DataSourceType> = {
      webhook: DataSourceType.WEBHOOK,
      http: DataSourceType.API,
      database: DataSourceType.DATABASE,
      file: DataSourceType.FILE,
      stream: DataSourceType.STREAM,
      cache: DataSourceType.CACHE,
      manual: DataSourceType.MANUAL
    };

    for (const [key, type] of Object.entries(typeMap)) {
      if (nodeType.toLowerCase().includes(key)) {
        return type;
      }
    }

    return DataSourceType.COMPUTED;
  }

  private inferDataSensitivity(nodeType: string): DataSensitivity {
    // Simplified - in production, analyze data content
    if (nodeType.includes('pii') || nodeType.includes('personal')) {
      return DataSensitivity.PII;
    }
    if (nodeType.includes('health') || nodeType.includes('medical')) {
      return DataSensitivity.PHI;
    }
    if (nodeType.includes('payment') || nodeType.includes('card')) {
      return DataSensitivity.PCI;
    }
    return DataSensitivity.INTERNAL;
  }

  private inferTransformationType(nodeType: string): TransformationType {
    const typeMap: Record<string, TransformationType> = {
      map: TransformationType.MAP,
      filter: TransformationType.FILTER,
      reduce: TransformationType.REDUCE,
      aggregate: TransformationType.AGGREGATE,
      join: TransformationType.JOIN,
      split: TransformationType.SPLIT,
      merge: TransformationType.MERGE,
      encrypt: TransformationType.ENCRYPT,
      decrypt: TransformationType.DECRYPT
    };

    for (const [key, type] of Object.entries(typeMap)) {
      if (nodeType.toLowerCase().includes(key)) {
        return type;
      }
    }

    return TransformationType.CUSTOM;
  }

  private isTransformationNode(nodeType: string): boolean {
    const transformationTypes = [
      'map', 'filter', 'reduce', 'aggregate', 'join', 'split',
      'merge', 'transform', 'convert', 'parse'
    ];

    return transformationTypes.some(type =>
      nodeType.toLowerCase().includes(type)
    );
  }

  private extractSchema(data: SafeObject): Record<string, string> {
    const schema: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      schema[key] = typeof value;
    }

    return schema;
  }

  private countRecords(data: SafeObject): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    }
    return 1;
  }

  private estimateSize(data: SafeObject): number {
    // Rough estimation - in production, use proper serialization
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private hasEncryption(config?: Record<string, unknown>): boolean {
    if (!config) return false;

    return Object.keys(config).some(key =>
      key.toLowerCase().includes('encrypt') ||
      key.toLowerCase().includes('ssl') ||
      key.toLowerCase().includes('tls')
    );
  }

  private detectPII(data: SafeObject): boolean {
    // Simplified PII detection - in production, use proper scanner
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/ // Phone
    ];

    const dataStr = JSON.stringify(data);

    return piiPatterns.some(pattern => pattern.test(dataStr));
  }
}

/**
 * Create lineage-aware execution wrapper
 */
export function createLineageAwareExecution(
  tracker: DataLineageTracker,
  options?: Partial<LineageIntegrationOptions>
): LineageAwareExecution {
  return new LineageAwareExecution(tracker, options);
}
