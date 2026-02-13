/**
 * DataFlowVisualizer - Core logic for lineage graph layout and visualization
 */

import dagre from 'dagre';
import {
  LineageGraph,
  LineageVisualizationOptions,
  DataLineageNode,
  DataSensitivity
} from '../../../types/lineage';
import {
  VisualNode,
  VisualEdge,
  FieldInfo,
  FieldMapping,
  LineagePath,
  VisualizationStats
} from './types';

export class DataFlowVisualizer {
  private graph: dagre.graphlib.Graph;
  private lineageGraph: LineageGraph;
  private nodePositions: Map<string, { x: number; y: number }>;
  private options: LineageVisualizationOptions;

  constructor(lineageGraph: LineageGraph) {
    this.lineageGraph = lineageGraph;
    this.nodePositions = new Map();
    this.options = {
      layout: 'dagre',
      orientation: 'horizontal',
      showMetrics: true,
      showTransformations: false,
      showCompliance: false,
      highlightCriticalPath: false,
      colorBy: 'status',
      enableZoom: true,
      enablePan: true,
      enableSelection: true,
      enableTooltips: true
    };

    this.graph = new dagre.graphlib.Graph({ directed: true, multigraph: false });
    this.initializeGraph();
  }

  private initializeGraph(): void {
    this.graph.setGraph({
      rankdir: 'LR',
      ranksep: 100,
      nodesep: 50,
      edgesep: 20,
      marginx: 40,
      marginy: 40,
      acyclicer: 'greedy',
      ranker: 'network-simplex'
    });
    this.graph.setDefaultEdgeLabel(() => ({}));
  }

  private categorizeNode(node: DataLineageNode): 'source' | 'transform' | 'destination' | 'unknown' {
    const upstreamCount = node.upstreamNodes.length;
    const downstreamCount = node.downstreamNodes.length;
    const nodeType = node.metadata.nodeType.toLowerCase();

    if (upstreamCount === 0 && downstreamCount > 0) {
      return 'source';
    }

    if (upstreamCount > 0 && downstreamCount === 0) {
      return 'destination';
    }

    const sourceTypes = ['trigger', 'webhook', 'schedule', 'manual', 'database_read', 'api_source', 'file_read'];
    const transformTypes = ['filter', 'map', 'merge', 'split', 'aggregate', 'transform', 'code', 'function'];
    const destTypes = ['database_write', 'api_dest', 'file_write', 'email', 'slack', 'notification'];

    if (sourceTypes.some(t => nodeType.includes(t))) {
      return 'source';
    }
    if (destTypes.some(t => nodeType.includes(t))) {
      return 'destination';
    }
    if (transformTypes.some(t => nodeType.includes(t)) || (upstreamCount > 0 && downstreamCount > 0)) {
      return 'transform';
    }

    return 'unknown';
  }

  private getNodeColor(node: DataLineageNode, category: 'source' | 'transform' | 'destination' | 'unknown'): string {
    if (this.options.colorBy === 'sensitivity') {
      const sensitivity = node.dataSource.metadata.sensitivity;
      switch (sensitivity) {
        case DataSensitivity.RESTRICTED:
        case DataSensitivity.PHI:
        case DataSensitivity.PCI:
          return '#dc2626';
        case DataSensitivity.CONFIDENTIAL:
        case DataSensitivity.PII:
          return '#ea580c';
        case DataSensitivity.INTERNAL:
          return '#ca8a04';
        case DataSensitivity.PUBLIC:
        default:
          return '#16a34a';
      }
    }

    if (this.options.colorBy === 'compliance') {
      const frameworks = node.dataSource.metadata.complianceFrameworks || [];
      if (frameworks.length > 2) return '#dc2626';
      if (frameworks.length > 0) return '#ea580c';
      return '#16a34a';
    }

    switch (category) {
      case 'source':
        return '#2563eb';
      case 'transform':
        return '#7c3aed';
      case 'destination':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  }

  private extractFields(node: DataLineageNode): FieldInfo[] {
    const fields: FieldInfo[] = [];

    if (node.dataSnapshot?.schema) {
      for (const [name, type] of Object.entries(node.dataSnapshot.schema)) {
        fields.push({
          name,
          type: String(type),
          isPII: this.isPIIField(name),
          isKey: this.isKeyField(name)
        });
      }
    }

    return fields;
  }

  private isPIIField(fieldName: string): boolean {
    const piiPatterns = [
      'email', 'phone', 'ssn', 'social_security', 'address', 'name',
      'first_name', 'last_name', 'date_of_birth', 'dob', 'credit_card',
      'card_number', 'cvv', 'password', 'passport', 'driver_license'
    ];
    const lowerName = fieldName.toLowerCase();
    return piiPatterns.some(pattern => lowerName.includes(pattern));
  }

  private isKeyField(fieldName: string): boolean {
    const keyPatterns = ['id', '_id', 'key', 'pk', 'primary_key', 'uuid'];
    const lowerName = fieldName.toLowerCase();
    return keyPatterns.some(pattern => lowerName === pattern || lowerName.endsWith('_' + pattern));
  }

  private inferFieldMappings(sourceNode?: DataLineageNode, targetNode?: DataLineageNode): FieldMapping[] {
    if (!sourceNode || !targetNode) return [];

    const mappings: FieldMapping[] = [];
    const sourceFields = sourceNode.dataSnapshot?.schema || {};
    const targetFields = targetNode.dataSnapshot?.schema || {};

    for (const sourceField of Object.keys(sourceFields)) {
      if (targetFields[sourceField]) {
        mappings.push({ from: sourceField, to: sourceField });
        continue;
      }

      const lowerSource = sourceField.toLowerCase();
      for (const targetField of Object.keys(targetFields)) {
        if (targetField.toLowerCase() === lowerSource) {
          mappings.push({ from: sourceField, to: targetField });
          break;
        }
      }

      const transformPatterns = [
        { pattern: /^(.+)_id$/i, replacement: '$1Id' },
        { pattern: /^(.+)Id$/i, replacement: '$1_id' },
        { pattern: /^(.+)_(.+)$/i, replacement: (_m: string, p1: string, p2: string) => p1 + p2.charAt(0).toUpperCase() + p2.slice(1) },
      ];

      for (const { pattern, replacement } of transformPatterns) {
        const transformed = sourceField.replace(pattern, replacement as string);
        if (targetFields[transformed]) {
          mappings.push({ from: sourceField, to: transformed, transformation: 'rename' });
          break;
        }
      }
    }

    return mappings;
  }

  generateLayout(options: LineageVisualizationOptions): { nodes: VisualNode[]; edges: VisualEdge[] } {
    this.options = options;

    this.graph.nodes().forEach(n => this.graph.removeNode(n));

    this.graph.setGraph({
      ...this.graph.graph(),
      rankdir: options.orientation === 'horizontal' ? 'LR' : 'TB'
    });

    const visualNodes: VisualNode[] = [];
    const visualEdges: VisualEdge[] = [];

    this.lineageGraph.nodes.forEach((node, id) => {
      const category = this.categorizeNode(node);
      const fields = this.extractFields(node);

      const baseWidth = 200;
      const baseHeight = 80;
      const fieldHeight = Math.min(fields.length * 16, 80);
      const nodeHeight = options.showMetrics ? baseHeight + fieldHeight : baseHeight;

      const visualNode: VisualNode = {
        id,
        x: 0,
        y: 0,
        width: baseWidth,
        height: nodeHeight,
        color: this.getNodeColor(node, category),
        label: node.metadata.nodeName,
        type: category,
        fields,
        metadata: {
          nodeType: node.metadata.nodeType,
          recordCount: node.dataSnapshot?.recordCount || 0,
          sensitivity: node.dataSource.metadata.sensitivity,
          isSelected: false,
          isHighlighted: false
        }
      };

      this.graph.setNode(id, {
        width: visualNode.width,
        height: visualNode.height
      });

      visualNodes.push(visualNode);
    });

    this.lineageGraph.edges.forEach((edge, id) => {
      const sourceNode = this.lineageGraph.nodes.get(edge.sourceNodeId);
      const targetNode = this.lineageGraph.nodes.get(edge.targetNodeId);

      const fieldMappings = this.inferFieldMappings(sourceNode, targetNode);

      const visualEdge: VisualEdge = {
        id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        color: edge.metadata.branchType === 'error' ? '#dc2626' : '#6b7280',
        width: Math.max(1, Math.min(5, Math.log10(edge.dataFlow.recordsTransferred + 1))),
        animated: edge.metadata.branchType === 'conditional',
        label: edge.metadata.edgeLabel,
        fieldMappings
      };

      this.graph.setEdge(edge.sourceNodeId, edge.targetNodeId);
      visualEdges.push(visualEdge);
    });

    dagre.layout(this.graph);

    visualNodes.forEach(node => {
      const dagreNode = this.graph.node(node.id);
      if (dagreNode) {
        node.x = dagreNode.x - node.width / 2;
        node.y = dagreNode.y - node.height / 2;
        this.nodePositions.set(node.id, { x: node.x, y: node.y });
      }
    });

    visualEdges.forEach(edge => {
      edge.path = this.generateEdgePath(edge, visualNodes, options.orientation);
    });

    return { nodes: visualNodes, edges: visualEdges };
  }

  private generateEdgePath(
    edge: VisualEdge,
    nodes: VisualNode[],
    orientation: 'horizontal' | 'vertical'
  ): string {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return '';

    let x1: number, y1: number, x2: number, y2: number;

    if (orientation === 'horizontal') {
      x1 = sourceNode.x + sourceNode.width;
      y1 = sourceNode.y + sourceNode.height / 2;
      x2 = targetNode.x;
      y2 = targetNode.y + targetNode.height / 2;
    } else {
      x1 = sourceNode.x + sourceNode.width / 2;
      y1 = sourceNode.y + sourceNode.height;
      x2 = targetNode.x + targetNode.width / 2;
      y2 = targetNode.y;
    }

    const dx = x2 - x1;
    const dy = y2 - y1;

    if (orientation === 'horizontal') {
      const cx1 = x1 + dx * 0.4;
      const cy1 = y1;
      const cx2 = x2 - dx * 0.4;
      const cy2 = y2;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    } else {
      const cx1 = x1;
      const cy1 = y1 + dy * 0.4;
      const cx2 = x2;
      const cy2 = y2 - dy * 0.4;
      return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }
  }

  traceFieldLineage(fieldId: string, startNodeId: string): LineagePath[] {
    const paths: LineagePath[] = [];
    const visited = new Set<string>();

    const traceUpstream = (nodeId: string, field: string, path: LineagePath): void => {
      if (visited.has(`${nodeId}-${field}`)) return;
      visited.add(`${nodeId}-${field}`);

      const node = this.lineageGraph.nodes.get(nodeId);
      if (!node) return;

      path.nodes.push(nodeId);

      this.lineageGraph.edges.forEach((edge) => {
        if (edge.targetNodeId === nodeId) {
          path.edges.push(edge.id);
          if (edge.transformation) {
            path.transformations.push(edge.transformation);
          }
          traceUpstream(edge.sourceNodeId, field, path);
        }
      });
    };

    const traceDownstream = (nodeId: string, field: string, path: LineagePath): void => {
      if (visited.has(`${nodeId}-${field}-down`)) return;
      visited.add(`${nodeId}-${field}-down`);

      const node = this.lineageGraph.nodes.get(nodeId);
      if (!node) return;

      path.nodes.push(nodeId);

      this.lineageGraph.edges.forEach((edge) => {
        if (edge.sourceNodeId === nodeId) {
          path.edges.push(edge.id);
          if (edge.transformation) {
            path.transformations.push(edge.transformation);
          }
          traceDownstream(edge.targetNodeId, field, path);
        }
      });
    };

    const upstreamPath: LineagePath = { fieldId, nodes: [], edges: [], transformations: [] };
    const downstreamPath: LineagePath = { fieldId, nodes: [], edges: [], transformations: [] };

    traceUpstream(startNodeId, fieldId, upstreamPath);
    visited.clear();
    traceDownstream(startNodeId, fieldId, downstreamPath);

    if (upstreamPath.nodes.length > 0) paths.push(upstreamPath);
    if (downstreamPath.nodes.length > 0) paths.push(downstreamPath);

    return paths;
  }

  getVisualizationStats(): VisualizationStats {
    const nodes = Array.from(this.lineageGraph.nodes.values());

    let maxX = 0;
    let maxY = 0;
    let sources = 0;
    let destinations = 0;
    let transforms = 0;

    nodes.forEach(node => {
      const pos = this.nodePositions.get(node.id);
      if (pos) {
        maxX = Math.max(maxX, pos.x + 200);
        maxY = Math.max(maxY, pos.y + 100);
      }

      const category = this.categorizeNode(node);
      if (category === 'source') sources++;
      else if (category === 'destination') destinations++;
      else if (category === 'transform') transforms++;
    });

    let maxLevel = 0;
    const calculateLevel = (nodeId: string, level: number, visited: Set<string>): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      maxLevel = Math.max(maxLevel, level);

      this.lineageGraph.edges.forEach(edge => {
        if (edge.sourceNodeId === nodeId) {
          calculateLevel(edge.targetNodeId, level + 1, visited);
        }
      });
    };

    this.lineageGraph.sources.forEach(sourceId => {
      calculateLevel(sourceId, 0, new Set());
    });

    return {
      totalNodes: this.lineageGraph.metadata.totalNodes,
      totalEdges: this.lineageGraph.metadata.totalEdges,
      maxLevel,
      estimatedWidth: Math.max(800, maxX + 100),
      estimatedHeight: Math.max(600, maxY + 100),
      sources,
      destinations,
      transforms
    };
  }
}
