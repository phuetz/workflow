/**
 * Workflow Graph Analyzer
 * Analyzes workflow structure for pattern detection
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type {
  GraphAnalysisResult,
  GraphMetrics,
  TopologyType,
} from '../types/patterns';

/**
 * Analyzes workflow graph structure
 */
export class GraphAnalyzer {
  /**
   * Perform complete graph analysis
   */
  static analyze(nodes: WorkflowNode[], edges: WorkflowEdge[]): GraphAnalysisResult {
    const topology = this.detectTopology(nodes, edges);
    const depth = this.calculateDepth(nodes, edges);
    const breadth = this.calculateBreadth(nodes, edges);
    const complexity = this.calculateComplexity(nodes, edges);
    const hasCycles = this.hasCycles(nodes, edges);
    const connectedComponents = this.findConnectedComponents(nodes, edges);
    const criticalPaths = this.findCriticalPaths(nodes, edges);
    const metrics = this.calculateMetrics(nodes, edges);

    return {
      topology,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      depth,
      breadth,
      complexity,
      hasCycles,
      connectedComponents,
      criticalPaths,
      metrics,
    };
  }

  /**
   * Detect graph topology type
   */
  static detectTopology(nodes: WorkflowNode[], edges: WorkflowEdge[]): TopologyType {
    if (nodes.length === 0) return 'linear';

    const hasCycles = this.hasCycles(nodes, edges);
    if (hasCycles) return 'loop';

    const inDegree = this.calculateInDegree(nodes, edges);
    const outDegree = this.calculateOutDegree(nodes, edges);

    // Linear: all nodes have in-degree and out-degree of at most 1
    const isLinear = nodes.every(
      (node) => inDegree[node.id] <= 1 && outDegree[node.id] <= 1
    );
    if (isLinear) return 'linear';

    // Star: one central node with high degree
    const maxDegree = Math.max(
      ...nodes.map((node) => inDegree[node.id] + outDegree[node.id])
    );
    const avgDegree =
      nodes.reduce((sum, node) => sum + inDegree[node.id] + outDegree[node.id], 0) /
      nodes.length;
    if (maxDegree > avgDegree * 2) return 'star';

    // Tree: no cycles and single root
    const roots = nodes.filter((node) => inDegree[node.id] === 0);
    if (roots.length === 1 && !hasCycles) return 'tree';

    // Branching: has conditional branches
    const hasBranching = nodes.some((node) => outDegree[node.id] > 1);
    if (hasBranching && !hasCycles) return 'branching';

    // Mesh: highly connected
    const density = this.calculateDensity(nodes, edges);
    if (density > 0.5) return 'mesh';

    // DAG: directed acyclic graph
    return 'dag';
  }

  /**
   * Calculate maximum depth of graph
   */
  static calculateDepth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    if (nodes.length === 0) return 0;

    const adjList = this.buildAdjacencyList(nodes, edges);
    const startNodes = this.findStartNodes(nodes, edges);

    let maxDepth = 0;

    const dfs = (nodeId: string, depth: number, visited: Set<string>): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      maxDepth = Math.max(maxDepth, depth);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, depth + 1, visited);
      }
    };

    for (const startNode of startNodes) {
      dfs(startNode, 1, new Set());
    }

    return maxDepth;
  }

  /**
   * Calculate maximum breadth of graph
   */
  static calculateBreadth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    if (nodes.length === 0) return 0;

    const adjList = this.buildAdjacencyList(nodes, edges);
    const startNodes = this.findStartNodes(nodes, edges);

    const levels = new Map<number, Set<string>>();

    const bfs = (startNode: string): void => {
      const queue: [string, number][] = [[startNode, 0]];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const [nodeId, level] = queue.shift()!;

        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        if (!levels.has(level)) {
          levels.set(level, new Set());
        }
        levels.get(level)!.add(nodeId);

        const neighbors = adjList.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push([neighbor, level + 1]);
          }
        }
      }
    };

    for (const startNode of startNodes) {
      bfs(startNode);
    }

    let maxBreadth = 0;
    for (const nodeSet of levels.values()) {
      maxBreadth = Math.max(maxBreadth, nodeSet.size);
    }

    return maxBreadth;
  }

  /**
   * Calculate cyclomatic complexity
   */
  static calculateComplexity(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    // Cyclomatic complexity: M = E - N + 2P
    // where E = edges, N = nodes, P = connected components
    const E = edges.length;
    const N = nodes.length;
    const P = this.findConnectedComponents(nodes, edges).length;

    return Math.max(1, E - N + 2 * P);
  }

  /**
   * Check if graph has cycles
   */
  static hasCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const adjList = this.buildAdjacencyList(nodes, edges);
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recStack.add(nodeId);

        const neighbors = adjList.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (dfs(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (dfs(node.id)) return true;
    }

    return false;
  }

  /**
   * Find connected components
   */
  static findConnectedComponents(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): string[][] {
    const adjList = this.buildUndirectedAdjacencyList(nodes, edges);
    const visited = new Set<string>();
    const components: string[][] = [];

    const dfs = (nodeId: string, component: string[]): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      component.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, component);
      }
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const component: string[] = [];
        dfs(node.id, component);
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Find critical paths (longest paths)
   */
  static findCriticalPaths(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): string[][] {
    const adjList = this.buildAdjacencyList(nodes, edges);
    const startNodes = this.findStartNodes(nodes, edges);
    const endNodes = this.findEndNodes(nodes, edges);

    const allPaths: string[][] = [];

    const dfs = (
      nodeId: string,
      path: string[],
      visited: Set<string>
    ): void => {
      if (visited.has(nodeId)) return;

      const newPath = [...path, nodeId];
      const newVisited = new Set(visited);
      newVisited.add(nodeId);

      if (endNodes.includes(nodeId)) {
        allPaths.push(newPath);
        return;
      }

      const neighbors = adjList.get(nodeId) || [];
      if (neighbors.length === 0) {
        allPaths.push(newPath);
        return;
      }

      for (const neighbor of neighbors) {
        dfs(neighbor, newPath, newVisited);
      }
    };

    for (const startNode of startNodes) {
      dfs(startNode, [], new Set());
    }

    // Return longest paths
    const maxLength = Math.max(...allPaths.map((p) => p.length), 0);
    return allPaths.filter((p) => p.length === maxLength);
  }

  /**
   * Calculate comprehensive metrics
   */
  static calculateMetrics(nodes: WorkflowNode[], edges: WorkflowEdge[]): GraphMetrics {
    const cyclomaticComplexity = this.calculateComplexity(nodes, edges);
    const fanIn = this.calculateInDegree(nodes, edges);
    const fanOut = this.calculateOutDegree(nodes, edges);
    const density = this.calculateDensity(nodes, edges);
    const modularity = this.calculateModularity(nodes, edges);
    const clustering = this.calculateClusteringCoefficient(nodes, edges);

    return {
      cyclomaticComplexity,
      fanIn,
      fanOut,
      density,
      modularity,
      clustering,
    };
  }

  /**
   * Calculate in-degree for all nodes
   */
  static calculateInDegree(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Record<string, number> {
    const inDegree: Record<string, number> = {};

    for (const node of nodes) {
      inDegree[node.id] = 0;
    }

    for (const edge of edges) {
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }

    return inDegree;
  }

  /**
   * Calculate out-degree for all nodes
   */
  static calculateOutDegree(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Record<string, number> {
    const outDegree: Record<string, number> = {};

    for (const node of nodes) {
      outDegree[node.id] = 0;
    }

    for (const edge of edges) {
      outDegree[edge.source] = (outDegree[edge.source] || 0) + 1;
    }

    return outDegree;
  }

  /**
   * Calculate graph density
   */
  static calculateDensity(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    const n = nodes.length;
    if (n <= 1) return 0;

    const maxEdges = n * (n - 1); // Directed graph
    return edges.length / maxEdges;
  }

  /**
   * Calculate modularity (simplified)
   */
  static calculateModularity(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
    const components = this.findConnectedComponents(nodes, edges);

    if (components.length <= 1) return 0;

    // Simple modularity: ratio of internal to external edges
    let internalEdges = 0;
    let externalEdges = 0;

    for (const edge of edges) {
      const sourceComponent = components.findIndex((comp) =>
        comp.includes(edge.source)
      );
      const targetComponent = components.findIndex((comp) =>
        comp.includes(edge.target)
      );

      if (sourceComponent === targetComponent) {
        internalEdges++;
      } else {
        externalEdges++;
      }
    }

    const totalEdges = internalEdges + externalEdges;
    return totalEdges > 0 ? internalEdges / totalEdges : 0;
  }

  /**
   * Calculate clustering coefficient
   */
  static calculateClusteringCoefficient(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): number {
    if (nodes.length === 0) return 0;

    const adjList = this.buildUndirectedAdjacencyList(nodes, edges);
    let totalCoefficient = 0;

    for (const node of nodes) {
      const neighbors = adjList.get(node.id) || [];
      const k = neighbors.length;

      if (k < 2) {
        continue;
      }

      // Count edges between neighbors
      let edgesBetweenNeighbors = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const neighborsOfI = adjList.get(neighbors[i]) || [];
          if (neighborsOfI.includes(neighbors[j])) {
            edgesBetweenNeighbors++;
          }
        }
      }

      const possibleEdges = (k * (k - 1)) / 2;
      const coefficient = edgesBetweenNeighbors / possibleEdges;
      totalCoefficient += coefficient;
    }

    return totalCoefficient / nodes.length;
  }

  /**
   * Build directed adjacency list
   */
  static buildAdjacencyList(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Map<string, string[]> {
    const adjList = new Map<string, string[]>();

    for (const node of nodes) {
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      const neighbors = adjList.get(edge.source) || [];
      neighbors.push(edge.target);
      adjList.set(edge.source, neighbors);
    }

    return adjList;
  }

  /**
   * Build undirected adjacency list
   */
  static buildUndirectedAdjacencyList(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Map<string, string[]> {
    const adjList = new Map<string, string[]>();

    for (const node of nodes) {
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      const neighbors1 = adjList.get(edge.source) || [];
      neighbors1.push(edge.target);
      adjList.set(edge.source, neighbors1);

      const neighbors2 = adjList.get(edge.target) || [];
      neighbors2.push(edge.source);
      adjList.set(edge.target, neighbors2);
    }

    return adjList;
  }

  /**
   * Find start nodes (no incoming edges)
   */
  static findStartNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const nodesWithIncoming = new Set(edges.map((e) => e.target));
    return nodes.filter((node) => !nodesWithIncoming.has(node.id)).map((n) => n.id);
  }

  /**
   * Find end nodes (no outgoing edges)
   */
  static findEndNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const nodesWithOutgoing = new Set(edges.map((e) => e.source));
    return nodes.filter((node) => !nodesWithOutgoing.has(node.id)).map((n) => n.id);
  }

  /**
   * Find nodes by type
   */
  static findNodesByType(nodes: WorkflowNode[], type: string): WorkflowNode[] {
    return nodes.filter((node) => node.type === type);
  }

  /**
   * Find edges by type
   */
  static findEdgesByCondition(
    edges: WorkflowEdge[],
    condition: (edge: WorkflowEdge) => boolean
  ): WorkflowEdge[] {
    return edges.filter(condition);
  }

  /**
   * Check if subgraph exists
   */
  static hasSubgraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    requiredNodes: string[],
    requiredEdges: Array<{ from: string; to: string }>
  ): boolean {
    // Check if all required node types exist
    const nodeTypes = new Set(nodes.map((n) => n.type));
    if (!requiredNodes.every((type) => nodeTypes.has(type))) {
      return false;
    }

    // Check if all required edges exist
    for (const reqEdge of requiredEdges) {
      const sourceNodes = nodes.filter((n) => n.type === reqEdge.from);
      const targetNodes = nodes.filter((n) => n.type === reqEdge.to);

      let found = false;
      for (const source of sourceNodes) {
        for (const target of targetNodes) {
          if (edges.some((e) => e.source === source.id && e.target === target.id)) {
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) return false;
    }

    return true;
  }

  /**
   * Get node neighbors
   */
  static getNeighbors(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    direction: 'in' | 'out' | 'both' = 'both'
  ): string[] {
    const neighbors: string[] = [];

    if (direction === 'in' || direction === 'both') {
      for (const edge of edges) {
        if (edge.target === node.id) {
          neighbors.push(edge.source);
        }
      }
    }

    if (direction === 'out' || direction === 'both') {
      for (const edge of edges) {
        if (edge.source === node.id) {
          neighbors.push(edge.target);
        }
      }
    }

    return neighbors;
  }
}
