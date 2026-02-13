/**
 * Impact Analyzer
 * Analyzes the impact of changes on data lineage and workflows
 * Performance target: <1s for impact analysis
 */

import { logger } from '../services/SimpleLogger';
import {
  LineageId,
  LineageGraph,
  ImpactAnalysisResult,
  ComplianceFramework,
  DataSensitivity,
  DataSource
} from '../types/lineage';
import { LineageGraphManager } from './LineageGraph';

/**
 * Risk assessment configuration
 */
interface RiskWeights {
  dataVolume: number;
  sensitivity: number;
  compliance: number;
  complexity: number;
  depth: number;
}

/**
 * Impact analysis options
 */
export interface ImpactAnalysisOptions {
  direction: 'upstream' | 'downstream' | 'bidirectional';
  maxDepth?: number;
  includeCompliance?: boolean;
  includeRiskAssessment?: boolean;
  riskWeights?: Partial<RiskWeights>;
}

/**
 * Impact Analyzer - performs "what-if" analysis on lineage changes
 */
export class ImpactAnalyzer {
  private defaultRiskWeights: RiskWeights = {
    dataVolume: 0.2,
    sensitivity: 0.3,
    compliance: 0.3,
    complexity: 0.1,
    depth: 0.1
  };

  constructor(private graph: LineageGraph) {}

  /**
   * Analyze impact of changes to a specific node
   */
  analyzeNodeImpact(
    nodeId: LineageId,
    options: ImpactAnalysisOptions = { direction: 'downstream' }
  ): ImpactAnalysisResult {
    const startTime = performance.now();

    logger.debug('Starting impact analysis', { nodeId, direction: options.direction });

    const node = this.graph.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found in lineage graph`);
    }

    // Get affected nodes based on direction
    const affectedData = this.getAffectedNodes(nodeId, options);

    // Assess risks
    const riskAssessment = options.includeRiskAssessment !== false
      ? this.assessRisk(affectedData.nodes, options.riskWeights)
      : this.getDefaultRiskAssessment();

    // Check compliance impact
    const complianceImpact = options.includeCompliance !== false
      ? this.assessComplianceImpact(affectedData.nodes)
      : this.getDefaultComplianceImpact();

    // Get affected data sources
    const affectedDataSources = this.getAffectedDataSources(affectedData.nodes);

    // Get affected transformations
    const affectedTransformations = this.getAffectedTransformations(affectedData.nodes);

    const result: ImpactAnalysisResult = {
      targetNodeId: nodeId,
      impactType: options.direction,
      timestamp: new Date().toISOString(),
      affectedNodes: affectedData.nodes.map(n => ({
        nodeId: n.id,
        distance: n.distance,
        impact: n.distance === 1 ? 'direct' : 'indirect',
        riskLevel: this.calculateNodeRiskLevel(n.node, n.distance),
        description: `${n.node.metadata.nodeName} (${n.node.metadata.nodeType})`
      })),
      affectedDataSources,
      affectedTransformations,
      riskAssessment,
      complianceImpact
    };

    const duration = performance.now() - startTime;
    logger.info('Impact analysis completed', {
      nodeId,
      duration: `${duration.toFixed(2)}ms`,
      affectedNodes: result.affectedNodes.length,
      overallRisk: result.riskAssessment.overallRisk
    });

    return result;
  }

  /**
   * Compare two lineage graphs to identify changes
   */
  compareGraphs(
    oldGraph: LineageGraph,
    newGraph: LineageGraph
  ): {
    added: LineageId[];
    removed: LineageId[];
    modified: LineageId[];
    unchanged: LineageId[];
  } {
    const oldNodeIds = new Set(oldGraph.nodes.keys());
    const newNodeIds = new Set(newGraph.nodes.keys());

    const added: LineageId[] = [];
    const removed: LineageId[] = [];
    const modified: LineageId[] = [];
    const unchanged: LineageId[] = [];

    // Find added nodes
    for (const nodeId of newNodeIds) {
      if (!oldNodeIds.has(nodeId)) {
        added.push(nodeId);
      }
    }

    // Find removed nodes
    for (const nodeId of oldNodeIds) {
      if (!newNodeIds.has(nodeId)) {
        removed.push(nodeId);
      }
    }

    // Find modified and unchanged nodes
    for (const nodeId of newNodeIds) {
      if (oldNodeIds.has(nodeId)) {
        const oldNode = oldGraph.nodes.get(nodeId)!;
        const newNode = newGraph.nodes.get(nodeId)!;

        if (this.nodesAreDifferent(oldNode, newNode)) {
          modified.push(nodeId);
        } else {
          unchanged.push(nodeId);
        }
      }
    }

    return { added, removed, modified, unchanged };
  }

  /**
   * Simulate impact of removing a node
   */
  simulateNodeRemoval(nodeId: LineageId): {
    orphanedNodes: LineageId[];
    brokenPaths: { from: LineageId; to: LineageId }[];
    affectedWorkflows: string[];
    estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
  } {
    const node = this.graph.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Find orphaned downstream nodes
    const orphanedNodes: LineageId[] = [];
    for (const downstreamId of node.downstreamNodes) {
      const downstreamNode = this.graph.nodes.get(downstreamId);
      if (downstreamNode && downstreamNode.upstreamNodes.length === 1) {
        orphanedNodes.push(downstreamId);
      }
    }

    // Find broken paths
    const brokenPaths: { from: LineageId; to: LineageId }[] = [];
    for (const upstreamId of node.upstreamNodes) {
      for (const downstreamId of node.downstreamNodes) {
        brokenPaths.push({ from: upstreamId, to: downstreamId });
      }
    }

    // Get affected workflows
    const affectedWorkflows = [node.metadata.workflowId];

    // Estimate impact
    let estimatedImpact: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (orphanedNodes.length > 5 || brokenPaths.length > 10) {
      estimatedImpact = 'critical';
    } else if (orphanedNodes.length > 2 || brokenPaths.length > 5) {
      estimatedImpact = 'high';
    } else if (orphanedNodes.length > 0 || brokenPaths.length > 0) {
      estimatedImpact = 'medium';
    }

    return {
      orphanedNodes,
      brokenPaths,
      affectedWorkflows,
      estimatedImpact
    };
  }

  /**
   * Analyze blast radius of a failure
   */
  analyzeBlastRadius(
    failedNodeId: LineageId,
    maxDepth: number = Infinity
  ): {
    directImpact: LineageId[];
    indirectImpact: LineageId[];
    totalAffected: number;
    criticalPathAffected: boolean;
    estimatedDowntime: number;
  } {
    const downstream = LineageGraphManager.getDownstreamLineage(
      this.graph,
      failedNodeId,
      maxDepth
    );

    const directImpact: LineageId[] = [];
    const indirectImpact: LineageId[] = [];

    for (const node of downstream.nodes) {
      if (node.upstreamNodes.includes(failedNodeId)) {
        directImpact.push(node.id);
      } else {
        indirectImpact.push(node.id);
      }
    }

    // Check if critical path is affected
    const criticalPath = LineageGraphManager.findCriticalPath(this.graph);
    const criticalPathAffected = criticalPath.path.includes(failedNodeId);

    // Estimate downtime based on recovery time
    const estimatedDowntime = this.estimateRecoveryTime(
      downstream.nodes.length,
      criticalPathAffected
    );

    return {
      directImpact,
      indirectImpact,
      totalAffected: downstream.nodes.length,
      criticalPathAffected,
      estimatedDowntime
    };
  }

  /**
   * Find single points of failure
   */
  findSinglePointsOfFailure(): {
    nodeId: LineageId;
    downstreamCount: number;
    criticalityScore: number;
  }[] {
    const spofs: {
      nodeId: LineageId;
      downstreamCount: number;
      criticalityScore: number;
    }[] = [];

    for (const [nodeId, node] of this.graph.nodes) {
      // A node is a SPOF if removing it would orphan downstream nodes
      const downstream = LineageGraphManager.getDownstreamLineage(this.graph, nodeId);

      let orphanedCount = 0;
      for (const downstreamNode of downstream.nodes) {
        // Check if this downstream node has only one path from sources
        const upstream = LineageGraphManager.getUpstreamLineage(
          this.graph,
          downstreamNode.id
        );

        const pathsFromSources = this.countPathsFromSources(downstreamNode.id);
        if (pathsFromSources === 1) {
          orphanedCount++;
        }
      }

      if (orphanedCount > 0) {
        const criticalityScore = this.calculateCriticalityScore(
          node,
          downstream.nodes.length,
          orphanedCount
        );

        spofs.push({
          nodeId,
          downstreamCount: downstream.nodes.length,
          criticalityScore
        });
      }
    }

    // Sort by criticality score
    return spofs.sort((a, b) => b.criticalityScore - a.criticalityScore);
  }

  /**
   * Recommend mitigation strategies
   */
  recommendMitigations(
    impactAnalysis: ImpactAnalysisResult
  ): {
    strategy: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    effort: 'low' | 'medium' | 'high';
    description: string;
  }[] {
    const recommendations: {
      strategy: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      effort: 'low' | 'medium' | 'high';
      description: string;
    }[] = [];

    // Based on overall risk
    if (impactAnalysis.riskAssessment.overallRisk === 'critical') {
      recommendations.push({
        strategy: 'Implement redundancy',
        priority: 'critical',
        effort: 'high',
        description: 'Add redundant data paths to eliminate single points of failure'
      });
    }

    // Based on compliance impact
    if (impactAnalysis.complianceImpact.breachRisk) {
      recommendations.push({
        strategy: 'Compliance audit',
        priority: 'critical',
        effort: 'medium',
        description: 'Perform immediate compliance audit to assess breach risk'
      });
    }

    // Based on affected nodes
    if (impactAnalysis.affectedNodes.length > 10) {
      recommendations.push({
        strategy: 'Staged rollout',
        priority: 'high',
        effort: 'medium',
        description: 'Implement changes in stages to minimize blast radius'
      });
    }

    // Data source recommendations
    if (impactAnalysis.affectedDataSources.length > 5) {
      recommendations.push({
        strategy: 'Data source consolidation',
        priority: 'medium',
        effort: 'high',
        description: 'Consider consolidating data sources to reduce dependencies'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Private helper methods

  private getAffectedNodes(
    nodeId: LineageId,
    options: ImpactAnalysisOptions
  ): {
    nodes: Array<{
      id: LineageId;
      node: any;
      distance: number;
    }>;
  } {
    const affectedNodesMap = new Map<LineageId, { node: any; distance: number }>();

    if (options.direction === 'upstream' || options.direction === 'bidirectional') {
      const upstream = LineageGraphManager.getUpstreamLineage(
        this.graph,
        nodeId,
        options.maxDepth
      );

      for (const node of upstream.nodes) {
        // Calculate distance (simplified)
        const distance = this.calculateDistance(nodeId, node.id, 'upstream');
        affectedNodesMap.set(node.id, { node, distance });
      }
    }

    if (options.direction === 'downstream' || options.direction === 'bidirectional') {
      const downstream = LineageGraphManager.getDownstreamLineage(
        this.graph,
        nodeId,
        options.maxDepth
      );

      for (const node of downstream.nodes) {
        const distance = this.calculateDistance(nodeId, node.id, 'downstream');
        if (!affectedNodesMap.has(node.id)) {
          affectedNodesMap.set(node.id, { node, distance });
        }
      }
    }

    return {
      nodes: Array.from(affectedNodesMap.entries()).map(([id, data]) => ({
        id,
        node: data.node,
        distance: data.distance
      }))
    };
  }

  private calculateDistance(
    fromId: LineageId,
    toId: LineageId,
    direction: 'upstream' | 'downstream'
  ): number {
    const path = LineageGraphManager.findShortestPath(this.graph, fromId, toId);
    return path ? path.length - 1 : Infinity;
  }

  private assessRisk(
    nodes: Array<{ node: any; distance: number }>,
    customWeights?: Partial<RiskWeights>
  ): ImpactAnalysisResult['riskAssessment'] {
    const weights = { ...this.defaultRiskWeights, ...customWeights };

    let riskScore = 0;
    const riskFactors: string[] = [];
    const mitigationStrategies: string[] = [];

    // Data volume risk
    const totalRecords = nodes.reduce((sum, n) => {
      return sum + (n.node.dataSnapshot?.recordCount || 0);
    }, 0);

    if (totalRecords > 1000000) {
      riskScore += weights.dataVolume * 100;
      riskFactors.push(`Large data volume: ${totalRecords.toLocaleString()} records`);
      mitigationStrategies.push('Implement incremental processing');
    }

    // Sensitivity risk
    const hasSensitiveData = nodes.some(n =>
      n.node.dataSource.metadata.sensitivity &&
      ['restricted', 'pii', 'phi', 'pci'].includes(n.node.dataSource.metadata.sensitivity)
    );

    if (hasSensitiveData) {
      riskScore += weights.sensitivity * 100;
      riskFactors.push('Contains sensitive data');
      mitigationStrategies.push('Enable encryption and access controls');
    }

    // Compliance risk
    const complianceFrameworks = new Set<string>();
    for (const n of nodes) {
      for (const framework of n.node.dataSource.metadata.complianceFrameworks || []) {
        complianceFrameworks.add(framework);
      }
    }

    if (complianceFrameworks.size > 0) {
      riskScore += weights.compliance * 100 * complianceFrameworks.size;
      riskFactors.push(`Compliance requirements: ${Array.from(complianceFrameworks).join(', ')}`);
      mitigationStrategies.push('Maintain compliance audit trail');
    }

    // Complexity risk
    if (nodes.length > 20) {
      riskScore += weights.complexity * 100;
      riskFactors.push(`High complexity: ${nodes.length} affected nodes`);
      mitigationStrategies.push('Break down into smaller changes');
    }

    // Depth risk
    const maxDepth = Math.max(...nodes.map(n => n.distance));
    if (maxDepth > 10) {
      riskScore += weights.depth * 100;
      riskFactors.push(`Deep dependency chain: ${maxDepth} levels`);
      mitigationStrategies.push('Consider architecture refactoring');
    }

    // Determine overall risk level
    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore < 25) overallRisk = 'low';
    else if (riskScore < 50) overallRisk = 'medium';
    else if (riskScore < 75) overallRisk = 'high';
    else overallRisk = 'critical';

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies,
      estimatedDowntime: this.estimateRecoveryTime(nodes.length, overallRisk === 'critical'),
      estimatedDataLoss: hasSensitiveData ? totalRecords * 0.01 : 0
    };
  }

  private assessComplianceImpact(
    nodes: Array<{ node: any; distance: number }>
  ): ImpactAnalysisResult['complianceImpact'] {
    const affectedFrameworks = new Set<ComplianceFramework>();
    let breachRisk = false;
    const requiredActions: string[] = [];

    for (const n of nodes) {
      const frameworks = n.node.dataSource.metadata.complianceFrameworks || [];
      for (const framework of frameworks) {
        affectedFrameworks.add(framework);
      }

      // Check for breach risk indicators
      const sensitivity = n.node.dataSource.metadata.sensitivity;
      if (sensitivity && ['pii', 'phi', 'pci'].includes(sensitivity)) {
        breachRisk = true;
      }
    }

    if (affectedFrameworks.has(ComplianceFramework.GDPR)) {
      requiredActions.push('Update data processing records');
      requiredActions.push('Verify consent management');
    }

    if (affectedFrameworks.has(ComplianceFramework.HIPAA)) {
      requiredActions.push('Document PHI access');
      requiredActions.push('Update business associate agreements');
    }

    if (affectedFrameworks.has(ComplianceFramework.PCI_DSS)) {
      requiredActions.push('Verify encryption standards');
      requiredActions.push('Update cardholder data environment documentation');
    }

    if (breachRisk) {
      requiredActions.push('Prepare breach notification procedures');
      requiredActions.push('Notify security team');
    }

    return {
      affectedFrameworks: Array.from(affectedFrameworks),
      breachRisk,
      requiredActions
    };
  }

  private getAffectedDataSources(
    nodes: Array<{ node: any; distance: number }>
  ): DataSource[] {
    const sourcesMap = new Map<string, DataSource>();

    for (const n of nodes) {
      const source = n.node.dataSource;
      if (!sourcesMap.has(source.id)) {
        sourcesMap.set(source.id, source);
      }
    }

    return Array.from(sourcesMap.values());
  }

  private getAffectedTransformations(
    nodes: Array<{ node: any; distance: number }>
  ): string[] {
    const transformationIds = new Set<string>();

    for (const n of nodes) {
      for (const tId of n.node.transformations || []) {
        transformationIds.add(tId);
      }
    }

    return Array.from(transformationIds);
  }

  private calculateNodeRiskLevel(
    node: any,
    distance: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Distance factor
    riskScore += Math.max(0, 10 - distance);

    // Sensitivity factor
    const sensitivity = node.dataSource.metadata.sensitivity;
    if (sensitivity === 'restricted' || sensitivity === 'pii' || sensitivity === 'phi') {
      riskScore += 20;
    }

    // Data volume factor
    const recordCount = node.dataSnapshot?.recordCount || 0;
    if (recordCount > 100000) riskScore += 10;

    // Compliance factor
    if (node.dataSource.metadata.complianceFrameworks?.length > 0) {
      riskScore += 15;
    }

    if (riskScore < 15) return 'low';
    if (riskScore < 30) return 'medium';
    if (riskScore < 45) return 'high';
    return 'critical';
  }

  private estimateRecoveryTime(affectedCount: number, isCritical: boolean): number {
    // Base recovery time in minutes
    let recoveryTime = affectedCount * 2;

    if (isCritical) {
      recoveryTime *= 2;
    }

    return Math.min(recoveryTime, 480); // Max 8 hours
  }

  private nodesAreDifferent(node1: any, node2: any): boolean {
    // Simple comparison - in production, use deep equality
    return (
      node1.dataSnapshot?.checksum !== node2.dataSnapshot?.checksum ||
      node1.transformations.length !== node2.transformations.length
    );
  }

  private countPathsFromSources(nodeId: LineageId): number {
    let pathCount = 0;

    for (const sourceId of this.graph.sources) {
      const paths = LineageGraphManager.getAllPaths(this.graph, sourceId, nodeId);
      pathCount += paths.length;
    }

    return pathCount;
  }

  private calculateCriticalityScore(
    node: any,
    downstreamCount: number,
    orphanedCount: number
  ): number {
    let score = 0;

    // Downstream impact
    score += downstreamCount * 10;

    // Orphaned nodes (very critical)
    score += orphanedCount * 50;

    // Data sensitivity
    if (node.dataSource.metadata.sensitivity === 'restricted') {
      score += 100;
    }

    // Compliance
    score += (node.dataSource.metadata.complianceFrameworks?.length || 0) * 30;

    return score;
  }

  private getDefaultRiskAssessment(): ImpactAnalysisResult['riskAssessment'] {
    return {
      overallRisk: 'low',
      riskFactors: [],
      mitigationStrategies: []
    };
  }

  private getDefaultComplianceImpact(): ImpactAnalysisResult['complianceImpact'] {
    return {
      affectedFrameworks: [],
      breachRisk: false,
      requiredActions: []
    };
  }
}
