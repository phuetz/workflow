/**
 * Helper functions to build LineageGraph from WorkflowNode/Edge
 */

import {
  LineageGraph,
  LineageId,
  DataLineageNode,
  DataLineageEdge,
  DataSensitivity,
  DataSourceType
} from '../../../types/lineage';
import { WorkflowNode, WorkflowEdge } from '../../../types/workflow';

export function buildLineageGraphFromWorkflow(
  workflowNodes: WorkflowNode[],
  workflowEdges: WorkflowEdge[],
  workflowId: string,
  executionId: string
): LineageGraph {
  const nodes = new Map<LineageId, DataLineageNode>();
  const edges = new Map<LineageId, DataLineageEdge>();
  const sources: LineageId[] = [];
  const sinks: LineageId[] = [];

  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  workflowEdges.forEach(edge => {
    if (!incomingEdges.has(edge.target)) incomingEdges.set(edge.target, []);
    incomingEdges.get(edge.target)!.push(edge.source);
    if (!outgoingEdges.has(edge.source)) outgoingEdges.set(edge.source, []);
    outgoingEdges.get(edge.source)!.push(edge.target);
  });

  workflowNodes.forEach(wfNode => {
    const upstream = incomingEdges.get(wfNode.id) || [];
    const downstream = outgoingEdges.get(wfNode.id) || [];
    const timestamp = new Date().toISOString();

    const lineageNode: DataLineageNode = {
      id: wfNode.id,
      nodeId: wfNode.id,
      executionId,
      timestamp,
      dataSource: {
        id: `ds-${wfNode.id}`,
        type: inferDataSourceType(wfNode.type),
        name: wfNode.data.label,
        location: wfNode.id,
        metadata: {
          createdAt: timestamp,
          updatedAt: timestamp,
          sensitivity: inferSensitivity(wfNode),
          tags: [wfNode.data.type]
        }
      },
      dataSnapshot: wfNode.data.pinnedData ? {
        schema: extractSchemaFromData(wfNode.data.pinnedData.data),
        recordCount: Object.keys(wfNode.data.pinnedData.data).length,
        size: JSON.stringify(wfNode.data.pinnedData.data).length
      } : { schema: {}, recordCount: 0, size: 0 },
      upstreamNodes: upstream,
      downstreamNodes: downstream,
      transformations: [],
      metadata: { nodeName: wfNode.data.label, nodeType: wfNode.type, workflowId }
    };

    nodes.set(wfNode.id, lineageNode);
    if (upstream.length === 0) sources.push(wfNode.id);
    if (downstream.length === 0) sinks.push(wfNode.id);
  });

  workflowEdges.forEach(wfEdge => {
    const lineageEdge: DataLineageEdge = {
      id: wfEdge.id,
      sourceNodeId: wfEdge.source,
      targetNodeId: wfEdge.target,
      executionId,
      timestamp: new Date().toISOString(),
      dataFlow: { recordsTransferred: 0, bytesTransferred: 0, duration: 0, throughput: 0 },
      metadata: {
        edgeLabel: wfEdge.data?.condition,
        branchType: wfEdge.data?.condition ? 'conditional' : 'default'
      }
    };
    edges.set(wfEdge.id, lineageEdge);
  });

  return {
    id: `lineage-${workflowId}-${executionId}`,
    workflowId,
    executionId,
    timestamp: new Date().toISOString(),
    nodes,
    edges,
    transformations: new Map(),
    sources,
    sinks,
    metadata: {
      totalNodes: nodes.size,
      totalEdges: edges.size,
      totalTransformations: 0,
      depth: calculateGraphDepth(sources, edges),
      complexity: nodes.size + edges.size
    }
  };
}

function inferDataSourceType(nodeType: string): DataSourceType {
  const typeMap: Record<string, DataSourceType> = {
    webhook: 'webhook', trigger: 'webhook', schedule: 'manual',
    database: 'database', http: 'api', api: 'api',
    file: 'file', cache: 'cache', stream: 'stream'
  };
  const lowerType = nodeType.toLowerCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (lowerType.includes(key)) return value;
  }
  return 'computed';
}

function inferSensitivity(node: WorkflowNode): DataSensitivity | undefined {
  const type = node.type.toLowerCase();
  const label = node.data.label.toLowerCase();
  if (type.includes('pii') || label.includes('personal')) return DataSensitivity.PII;
  if (type.includes('health') || label.includes('medical')) return DataSensitivity.PHI;
  if (type.includes('payment') || label.includes('card')) return DataSensitivity.PCI;
  if (type.includes('secret') || label.includes('password')) return DataSensitivity.RESTRICTED;
  return undefined;
}

function extractSchemaFromData(data: Record<string, unknown>): Record<string, string> {
  const schema: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    schema[key] = Array.isArray(value) ? 'array' : typeof value;
  }
  return schema;
}

function calculateGraphDepth(sources: LineageId[], edges: Map<LineageId, DataLineageEdge>): number {
  if (sources.length === 0) return 0;
  let maxDepth = 0;
  const visited = new Set<string>();
  const dfs = (nodeId: string, depth: number): void => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    maxDepth = Math.max(maxDepth, depth);
    edges.forEach(edge => {
      if (edge.sourceNodeId === nodeId) dfs(edge.targetNodeId, depth + 1);
    });
  };
  sources.forEach(sourceId => dfs(sourceId, 0));
  return maxDepth;
}
