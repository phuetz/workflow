/**
 * Data Flow Visualizer
 * Generates visualization data for lineage graphs
 */

import {
  LineageGraph,
  LineageId,
  DataLineageNode,
  DataLineageEdge,
  LineageVisualizationOptions
} from '../types/lineage';

/**
 * Node position for visualization
 */
export interface VisualNode {
  id: LineageId;
  label: string;
  type: string;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  metadata: {
    recordCount: number;
    size: number;
    transformations: number;
    sensitivity?: string;
  };
}

/**
 * Edge visualization data
 */
export interface VisualEdge {
  id: string;
  source: LineageId;
  target: LineageId;
  label?: string;
  width: number;
  color: string;
  animated: boolean;
  metadata: {
    recordsTransferred: number;
    bytesTransferred: number;
    throughput: number;
  };
}

/**
 * Sankey diagram data
 */
export interface SankeyData {
  nodes: Array<{
    id: LineageId;
    name: string;
    color: string;
  }>;
  links: Array<{
    source: number; // Index in nodes array
    target: number; // Index in nodes array
    value: number; // Flow value
    color: string;
  }>;
}

/**
 * Data Flow Visualizer
 */
export class DataFlowVisualizer {
  private readonly nodeHeight = 80;
  private readonly nodeWidth = 200;
  private readonly levelSpacing = 300;
  private readonly nodeSpacing = 100;

  constructor(private graph: LineageGraph) {}

  /**
   * Generate visualization layout
   */
  generateLayout(options: LineageVisualizationOptions): {
    nodes: VisualNode[];
    edges: VisualEdge[];
  } {
    const { layout, orientation } = options;

    switch (layout) {
      case 'hierarchical':
        return this.generateHierarchicalLayout(options);
      case 'dagre':
        return this.generateDagreLayout(options);
      case 'sankey':
        return this.generateSankeyLayout(options);
      default:
        return this.generateHierarchicalLayout(options);
    }
  }

  /**
   * Generate hierarchical layout
   */
  private generateHierarchicalLayout(
    options: LineageVisualizationOptions
  ): {
    nodes: VisualNode[];
    edges: VisualEdge[];
  } {
    const visualNodes: VisualNode[] = [];
    const visualEdges: VisualEdge[] = [];

    // Assign levels to nodes (topological sort)
    const levels = this.assignLevels();

    // Group nodes by level
    const nodesByLevel = new Map<number, DataLineageNode[]>();
    for (const [nodeId, level] of levels) {
      const node = this.graph.nodes.get(nodeId);
      if (!node) continue;

      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(node);
    }

    // Position nodes
    const isHorizontal = options.orientation === 'horizontal';

    for (const [level, nodes] of nodesByLevel) {
      nodes.forEach((node, index) => {
        const x = isHorizontal
          ? level * this.levelSpacing
          : index * (this.nodeWidth + this.nodeSpacing);

        const y = isHorizontal
          ? index * (this.nodeHeight + this.nodeSpacing)
          : level * this.levelSpacing;

        visualNodes.push({
          id: node.id,
          label: node.metadata.nodeName,
          type: node.metadata.nodeType,
          level,
          x,
          y,
          width: this.nodeWidth,
          height: this.nodeHeight,
          color: this.getNodeColor(node, options),
          metadata: {
            recordCount: node.dataSnapshot?.recordCount || 0,
            size: node.dataSnapshot?.size || 0,
            transformations: node.transformations.length,
            sensitivity: node.dataSource.metadata.sensitivity
          }
        });
      });
    }

    // Create edges
    for (const edge of this.graph.edges.values()) {
      const sourceNode = visualNodes.find(n => n.id === edge.sourceNodeId);
      const targetNode = visualNodes.find(n => n.id === edge.targetNodeId);

      if (!sourceNode || !targetNode) continue;

      visualEdges.push({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: options.showMetrics
          ? `${edge.dataFlow.recordsTransferred.toLocaleString()} records`
          : undefined,
        width: this.getEdgeWidth(edge),
        color: this.getEdgeColor(edge, options),
        animated: edge.dataFlow.throughput > 1000,
        metadata: {
          recordsTransferred: edge.dataFlow.recordsTransferred,
          bytesTransferred: edge.dataFlow.bytesTransferred,
          throughput: edge.dataFlow.throughput
        }
      });
    }

    return { nodes: visualNodes, edges: visualEdges };
  }

  /**
   * Generate Dagre layout (directed graph)
   */
  private generateDagreLayout(
    options: LineageVisualizationOptions
  ): {
    nodes: VisualNode[];
    edges: VisualEdge[];
  } {
    // Simplified Dagre-style layout
    // In production, use actual Dagre library
    return this.generateHierarchicalLayout(options);
  }

  /**
   * Generate Sankey diagram data
   */
  private generateSankeyLayout(
    options: LineageVisualizationOptions
  ): {
    nodes: VisualNode[];
    edges: VisualEdge[];
  } {
    const sankeyData = this.generateSankeyData();

    // Convert Sankey data to visual format
    const visualNodes: VisualNode[] = sankeyData.nodes.map((n, index) => {
      const node = this.graph.nodes.get(n.id);
      if (!node) {
        throw new Error(`Node ${n.id} not found`);
      }

      return {
        id: n.id,
        label: n.name,
        type: node.metadata.nodeType,
        level: 0, // Will be calculated by Sankey
        x: 0,
        y: index * (this.nodeHeight + this.nodeSpacing),
        width: this.nodeWidth,
        height: this.nodeHeight,
        color: n.color,
        metadata: {
          recordCount: node.dataSnapshot?.recordCount || 0,
          size: node.dataSnapshot?.size || 0,
          transformations: node.transformations.length,
          sensitivity: node.dataSource.metadata.sensitivity
        }
      };
    });

    const visualEdges: VisualEdge[] = sankeyData.links.map(link => {
      const sourceNode = sankeyData.nodes[link.source];
      const targetNode = sankeyData.nodes[link.target];

      const edge = Array.from(this.graph.edges.values()).find(
        e => e.sourceNodeId === sourceNode.id && e.targetNodeId === targetNode.id
      );

      return {
        id: `${sourceNode.id}-${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        width: Math.max(1, link.value / 1000),
        color: link.color,
        animated: false,
        metadata: edge ? {
          recordsTransferred: edge.dataFlow.recordsTransferred,
          bytesTransferred: edge.dataFlow.bytesTransferred,
          throughput: edge.dataFlow.throughput
        } : {
          recordsTransferred: 0,
          bytesTransferred: 0,
          throughput: 0
        }
      };
    });

    return { nodes: visualNodes, edges: visualEdges };
  }

  /**
   * Generate Sankey diagram data
   */
  generateSankeyData(): SankeyData {
    const nodes: SankeyData['nodes'] = [];
    const nodeIndexMap = new Map<LineageId, number>();

    // Create nodes
    for (const node of this.graph.nodes.values()) {
      const index = nodes.length;
      nodeIndexMap.set(node.id, index);

      nodes.push({
        id: node.id,
        name: node.metadata.nodeName,
        color: this.getNodeColorByType(node.metadata.nodeType)
      });
    }

    // Create links
    const links: SankeyData['links'] = [];

    for (const edge of this.graph.edges.values()) {
      const sourceIndex = nodeIndexMap.get(edge.sourceNodeId);
      const targetIndex = nodeIndexMap.get(edge.targetNodeId);

      if (sourceIndex === undefined || targetIndex === undefined) continue;

      links.push({
        source: sourceIndex,
        target: targetIndex,
        value: edge.dataFlow.recordsTransferred || edge.dataFlow.bytesTransferred,
        color: this.getEdgeColorByThroughput(edge.dataFlow.throughput)
      });
    }

    return { nodes, links };
  }

  /**
   * Export as SVG
   */
  exportAsSVG(
    options: LineageVisualizationOptions,
    width: number = 1200,
    height: number = 800
  ): string {
    const { nodes, edges } = this.generateLayout(options);

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<defs>';
    svg += '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">';
    svg += '<polygon points="0 0, 10 3.5, 0 7" fill="#999" />';
    svg += '</marker>';
    svg += '</defs>';

    // Draw edges first
    for (const edge of edges) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) continue;

      const x1 = sourceNode.x + sourceNode.width;
      const y1 = sourceNode.y + sourceNode.height / 2;
      const x2 = targetNode.x;
      const y2 = targetNode.y + targetNode.height / 2;

      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" `;
      svg += `stroke="${edge.color}" stroke-width="${edge.width}" `;
      svg += 'marker-end="url(#arrowhead)" />';

      if (edge.label) {
        const labelX = (x1 + x2) / 2;
        const labelY = (y1 + y2) / 2;
        svg += `<text x="${labelX}" y="${labelY}" fill="#666" font-size="12">${edge.label}</text>`;
      }
    }

    // Draw nodes
    for (const node of nodes) {
      svg += `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" `;
      svg += `fill="${node.color}" stroke="#333" stroke-width="2" rx="5" />`;

      svg += `<text x="${node.x + 10}" y="${node.y + 30}" fill="#fff" font-size="14" font-weight="bold">`;
      svg += node.label;
      svg += '</text>';

      if (options.showMetrics) {
        svg += `<text x="${node.x + 10}" y="${node.y + 50}" fill="#fff" font-size="11">`;
        svg += `Records: ${node.metadata.recordCount.toLocaleString()}`;
        svg += '</text>';
      }
    }

    svg += '</svg>';

    return svg;
  }

  /**
   * Get graph statistics for visualization
   */
  getVisualizationStats(): {
    totalNodes: number;
    totalEdges: number;
    maxLevel: number;
    avgNodesPerLevel: number;
    estimatedWidth: number;
    estimatedHeight: number;
  } {
    const levels = this.assignLevels();
    const maxLevel = Math.max(...levels.values());

    const nodesByLevel = new Map<number, number>();
    for (const level of levels.values()) {
      nodesByLevel.set(level, (nodesByLevel.get(level) || 0) + 1);
    }

    const avgNodesPerLevel = this.graph.nodes.size / (maxLevel + 1);
    const maxNodesInLevel = Math.max(...nodesByLevel.values());

    return {
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.size,
      maxLevel,
      avgNodesPerLevel,
      estimatedWidth: (maxLevel + 1) * this.levelSpacing,
      estimatedHeight: maxNodesInLevel * (this.nodeHeight + this.nodeSpacing)
    };
  }

  // Private helper methods

  private assignLevels(): Map<LineageId, number> {
    const levels = new Map<LineageId, number>();

    // BFS from sources to assign levels
    const queue: Array<{ nodeId: LineageId; level: number }> = [];

    for (const sourceId of this.graph.sources) {
      queue.push({ nodeId: sourceId, level: 0 });
      levels.set(sourceId, 0);
    }

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;
      const node = this.graph.nodes.get(nodeId);

      if (!node) continue;

      for (const downstreamId of node.downstreamNodes) {
        const currentLevel = levels.get(downstreamId);
        const newLevel = level + 1;

        if (currentLevel === undefined || newLevel > currentLevel) {
          levels.set(downstreamId, newLevel);
          queue.push({ nodeId: downstreamId, level: newLevel });
        }
      }
    }

    return levels;
  }

  private getNodeColor(
    node: DataLineageNode,
    options: LineageVisualizationOptions
  ): string {
    if (!options.colorBy) {
      return this.getNodeColorByType(node.metadata.nodeType);
    }

    switch (options.colorBy) {
      case 'sensitivity':
        return this.getNodeColorBySensitivity(node.dataSource.metadata.sensitivity);
      case 'compliance':
        return this.getNodeColorByCompliance(
          node.dataSource.metadata.complianceFrameworks?.length || 0
        );
      case 'performance':
        return this.getNodeColorByPerformance(node.transformations.length);
      default:
        return this.getNodeColorByType(node.metadata.nodeType);
    }
  }

  private getNodeColorByType(type: string): string {
    const colors: Record<string, string> = {
      trigger: '#10b981',
      action: '#3b82f6',
      transform: '#8b5cf6',
      filter: '#f59e0b',
      aggregate: '#ef4444',
      join: '#ec4899',
      default: '#6b7280'
    };

    return colors[type.toLowerCase()] || colors.default;
  }

  private getNodeColorBySensitivity(sensitivity?: string): string {
    const colors: Record<string, string> = {
      public: '#10b981',
      internal: '#3b82f6',
      confidential: '#f59e0b',
      restricted: '#ef4444',
      pii: '#dc2626',
      phi: '#b91c1c',
      pci: '#991b1b'
    };

    return colors[sensitivity || 'public'] || colors.public;
  }

  private getNodeColorByCompliance(frameworkCount: number): string {
    if (frameworkCount === 0) return '#6b7280';
    if (frameworkCount === 1) return '#3b82f6';
    if (frameworkCount === 2) return '#f59e0b';
    return '#ef4444';
  }

  private getNodeColorByPerformance(transformationCount: number): string {
    if (transformationCount === 0) return '#10b981';
    if (transformationCount < 3) return '#3b82f6';
    if (transformationCount < 5) return '#f59e0b';
    return '#ef4444';
  }

  private getEdgeWidth(edge: DataLineageEdge): number {
    const baseWidth = 2;
    const volumeFactor = Math.log10(edge.dataFlow.recordsTransferred + 1);
    return Math.max(baseWidth, Math.min(10, baseWidth + volumeFactor));
  }

  private getEdgeColor(
    edge: DataLineageEdge,
    options: LineageVisualizationOptions
  ): string {
    if (options.colorBy === 'performance') {
      return this.getEdgeColorByThroughput(edge.dataFlow.throughput);
    }

    return '#9ca3af';
  }

  private getEdgeColorByThroughput(throughput: number): string {
    if (throughput > 10000) return '#10b981';
    if (throughput > 1000) return '#3b82f6';
    if (throughput > 100) return '#f59e0b';
    return '#ef4444';
  }
}
