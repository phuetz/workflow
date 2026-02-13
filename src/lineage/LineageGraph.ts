/**
 * Lineage Graph
 * Advanced graph operations for lineage analysis
 */

import {
  LineageId,
  LineageGraph,
  DataLineageNode,
  DataLineageEdge,
  DataTransformation,
  LineageQueryOptions
} from '../types/lineage';

/**
 * Graph algorithms and utilities for lineage analysis
 */
export class LineageGraphManager {
  /**
   * Find all upstream dependencies for a node
   */
  static getUpstreamLineage(
    graph: LineageGraph,
    nodeId: LineageId,
    maxDepth: number = Infinity
  ): {
    nodes: DataLineageNode[];
    edges: DataLineageEdge[];
    depth: number;
  } {
    const upstreamNodes: DataLineageNode[] = [];
    const upstreamEdges: DataLineageEdge[] = [];
    const visited = new Set<LineageId>();
    let maxDepthReached = 0;

    const traverse = (currentNodeId: LineageId, currentDepth: number) => {
      if (currentDepth > maxDepth || visited.has(currentNodeId)) {
        return;
      }

      visited.add(currentNodeId);
      maxDepthReached = Math.max(maxDepthReached, currentDepth);

      const node = graph.nodes.get(currentNodeId);
      if (!node) return;

      upstreamNodes.push(node);

      for (const upstreamId of node.upstreamNodes) {
        // Find edge connecting upstream to current
        const edge = this.findEdge(graph, upstreamId, currentNodeId);
        if (edge && !upstreamEdges.find(e => e.id === edge.id)) {
          upstreamEdges.push(edge);
        }

        traverse(upstreamId, currentDepth + 1);
      }
    };

    traverse(nodeId, 0);

    return {
      nodes: upstreamNodes,
      edges: upstreamEdges,
      depth: maxDepthReached
    };
  }

  /**
   * Find all downstream dependencies for a node
   */
  static getDownstreamLineage(
    graph: LineageGraph,
    nodeId: LineageId,
    maxDepth: number = Infinity
  ): {
    nodes: DataLineageNode[];
    edges: DataLineageEdge[];
    depth: number;
  } {
    const downstreamNodes: DataLineageNode[] = [];
    const downstreamEdges: DataLineageEdge[] = [];
    const visited = new Set<LineageId>();
    let maxDepthReached = 0;

    const traverse = (currentNodeId: LineageId, currentDepth: number) => {
      if (currentDepth > maxDepth || visited.has(currentNodeId)) {
        return;
      }

      visited.add(currentNodeId);
      maxDepthReached = Math.max(maxDepthReached, currentDepth);

      const node = graph.nodes.get(currentNodeId);
      if (!node) return;

      downstreamNodes.push(node);

      for (const downstreamId of node.downstreamNodes) {
        // Find edge connecting current to downstream
        const edge = this.findEdge(graph, currentNodeId, downstreamId);
        if (edge && !downstreamEdges.find(e => e.id === edge.id)) {
          downstreamEdges.push(edge);
        }

        traverse(downstreamId, currentDepth + 1);
      }
    };

    traverse(nodeId, 0);

    return {
      nodes: downstreamNodes,
      edges: downstreamEdges,
      depth: maxDepthReached
    };
  }

  /**
   * Find the critical path (longest path) in the graph
   */
  static findCriticalPath(graph: LineageGraph): {
    path: LineageId[];
    totalDuration: number;
    bottleneck: LineageId | null;
  } {
    const paths: LineageId[][] = [];
    const pathDurations: number[] = [];

    const findPaths = (
      nodeId: LineageId,
      currentPath: LineageId[],
      currentDuration: number,
      visited: Set<LineageId>
    ) => {
      if (visited.has(nodeId)) return;

      const newPath = [...currentPath, nodeId];
      const node = graph.nodes.get(nodeId);

      if (!node) return;

      visited.add(nodeId);

      // Calculate duration from transformations
      const nodeDuration = node.transformations.reduce((sum, tId) => {
        const t = graph.transformations.get(tId);
        return sum + (t?.metrics.duration || 0);
      }, 0);

      const totalDuration = currentDuration + nodeDuration;

      if (node.downstreamNodes.length === 0) {
        // Leaf node - save path
        paths.push(newPath);
        pathDurations.push(totalDuration);
      } else {
        // Continue traversing
        for (const downstreamId of node.downstreamNodes) {
          findPaths(downstreamId, newPath, totalDuration, new Set(visited));
        }
      }
    };

    // Start from all source nodes
    for (const sourceId of graph.sources) {
      findPaths(sourceId, [], 0, new Set());
    }

    // Find longest path
    let criticalPathIndex = 0;
    let maxDuration = 0;

    for (let i = 0; i < pathDurations.length; i++) {
      if (pathDurations[i] > maxDuration) {
        maxDuration = pathDurations[i];
        criticalPathIndex = i;
      }
    }

    const criticalPath = paths[criticalPathIndex] || [];

    // Find bottleneck (node with highest duration)
    let bottleneck: LineageId | null = null;
    let maxNodeDuration = 0;

    for (const nodeId of criticalPath) {
      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      const nodeDuration = node.transformations.reduce((sum, tId) => {
        const t = graph.transformations.get(tId);
        return sum + (t?.metrics.duration || 0);
      }, 0);

      if (nodeDuration > maxNodeDuration) {
        maxNodeDuration = nodeDuration;
        bottleneck = nodeId;
      }
    }

    return {
      path: criticalPath,
      totalDuration: maxDuration,
      bottleneck
    };
  }

  /**
   * Detect cycles in the lineage graph
   */
  static detectCycles(graph: LineageGraph): LineageId[][] {
    const cycles: LineageId[][] = [];
    const visited = new Set<LineageId>();
    const recursionStack = new Set<LineageId>();

    const dfs = (nodeId: LineageId, path: LineageId[]): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = graph.nodes.get(nodeId);
      if (!node) return false;

      for (const downstreamId of node.downstreamNodes) {
        if (!visited.has(downstreamId)) {
          if (dfs(downstreamId, [...path, nodeId])) {
            return true;
          }
        } else if (recursionStack.has(downstreamId)) {
          // Found a cycle
          const cycleStartIndex = path.indexOf(downstreamId);
          const cycle = [...path.slice(cycleStartIndex), nodeId];
          cycles.push(cycle);
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const [nodeId] of graph.nodes) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }

  /**
   * Find common ancestors between two nodes
   */
  static findCommonAncestors(
    graph: LineageGraph,
    nodeId1: LineageId,
    nodeId2: LineageId
  ): DataLineageNode[] {
    const upstream1 = this.getUpstreamLineage(graph, nodeId1);
    const upstream2 = this.getUpstreamLineage(graph, nodeId2);

    const nodeIds1 = new Set(upstream1.nodes.map(n => n.id));
    const commonNodes = upstream2.nodes.filter(n => nodeIds1.has(n.id));

    return commonNodes;
  }

  /**
   * Calculate graph metrics
   */
  static calculateGraphMetrics(graph: LineageGraph): {
    density: number;
    avgDegree: number;
    avgPathLength: number;
    diameter: number;
    clusteringCoefficient: number;
  } {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.size;

    // Graph density
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

    // Average degree
    let totalDegree = 0;
    for (const node of graph.nodes.values()) {
      totalDegree += node.upstreamNodes.length + node.downstreamNodes.length;
    }
    const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

    // Average path length and diameter
    const { avgPathLength, diameter } = this.calculatePathMetrics(graph);

    // Clustering coefficient (simplified)
    const clusteringCoefficient = this.calculateClusteringCoefficient(graph);

    return {
      density,
      avgDegree,
      avgPathLength,
      diameter,
      clusteringCoefficient
    };
  }

  /**
   * Find shortest path between two nodes
   */
  static findShortestPath(
    graph: LineageGraph,
    startNodeId: LineageId,
    endNodeId: LineageId
  ): LineageId[] | null {
    const queue: { nodeId: LineageId; path: LineageId[] }[] = [
      { nodeId: startNodeId, path: [startNodeId] }
    ];
    const visited = new Set<LineageId>();

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === endNodeId) {
        return path;
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      for (const downstreamId of node.downstreamNodes) {
        if (!visited.has(downstreamId)) {
          queue.push({
            nodeId: downstreamId,
            path: [...path, downstreamId]
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Get all paths between two nodes
   */
  static getAllPaths(
    graph: LineageGraph,
    startNodeId: LineageId,
    endNodeId: LineageId,
    maxDepth: number = 50
  ): LineageId[][] {
    const allPaths: LineageId[][] = [];

    const dfs = (currentId: LineageId, targetId: LineageId, path: LineageId[], visited: Set<LineageId>) => {
      if (path.length > maxDepth) return;

      path.push(currentId);
      visited.add(currentId);

      if (currentId === targetId) {
        allPaths.push([...path]);
      } else {
        const node = graph.nodes.get(currentId);
        if (node) {
          for (const downstreamId of node.downstreamNodes) {
            if (!visited.has(downstreamId)) {
              dfs(downstreamId, targetId, path, visited);
            }
          }
        }
      }

      path.pop();
      visited.delete(currentId);
    };

    dfs(startNodeId, endNodeId, [], new Set());
    return allPaths;
  }

  /**
   * Topological sort of the graph
   */
  static topologicalSort(graph: LineageGraph): LineageId[] {
    const sorted: LineageId[] = [];
    const visited = new Set<LineageId>();
    const tempMark = new Set<LineageId>();

    const visit = (nodeId: LineageId) => {
      if (tempMark.has(nodeId)) {
        throw new Error('Graph has cycles - cannot perform topological sort');
      }

      if (!visited.has(nodeId)) {
        tempMark.add(nodeId);

        const node = graph.nodes.get(nodeId);
        if (node) {
          for (const downstreamId of node.downstreamNodes) {
            visit(downstreamId);
          }
        }

        tempMark.delete(nodeId);
        visited.add(nodeId);
        sorted.unshift(nodeId);
      }
    };

    for (const [nodeId] of graph.nodes) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    return sorted;
  }

  // Private helper methods

  private static findEdge(
    graph: LineageGraph,
    sourceId: LineageId,
    targetId: LineageId
  ): DataLineageEdge | undefined {
    for (const edge of graph.edges.values()) {
      if (edge.sourceNodeId === sourceId && edge.targetNodeId === targetId) {
        return edge;
      }
    }
    return undefined;
  }

  private static calculatePathMetrics(graph: LineageGraph): {
    avgPathLength: number;
    diameter: number;
  } {
    const nodeIds = Array.from(graph.nodes.keys());
    const pathLengths: number[] = [];
    let maxPathLength = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const path = this.findShortestPath(graph, nodeIds[i], nodeIds[j]);
        if (path) {
          const length = path.length - 1;
          pathLengths.push(length);
          maxPathLength = Math.max(maxPathLength, length);
        }
      }
    }

    const avgPathLength = pathLengths.length > 0
      ? pathLengths.reduce((sum, len) => sum + len, 0) / pathLengths.length
      : 0;

    return {
      avgPathLength,
      diameter: maxPathLength
    };
  }

  private static calculateClusteringCoefficient(graph: LineageGraph): number {
    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const node of graph.nodes.values()) {
      const neighbors = new Set([
        ...node.upstreamNodes,
        ...node.downstreamNodes
      ]);

      if (neighbors.size < 2) continue;

      let connectedPairs = 0;
      const neighborArray = Array.from(neighbors);

      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const path = this.findShortestPath(graph, neighborArray[i], neighborArray[j]);
          if (path && path.length === 2) {
            connectedPairs++;
          }
        }
      }

      const possiblePairs = (neighbors.size * (neighbors.size - 1)) / 2;
      const coefficient = possiblePairs > 0 ? connectedPairs / possiblePairs : 0;

      totalCoefficient += coefficient;
      nodeCount++;
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }
}
