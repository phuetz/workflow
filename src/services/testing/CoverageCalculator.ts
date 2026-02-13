/**
 * Coverage Calculator
 * Handles test coverage calculation for workflows
 */

import { PrismaClient } from '@prisma/client';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowExecution, NodeExecution } from '../../types/workflowTypes';
import type { TestCoverage, WorkflowTestResult } from '../../types/testing';

const prisma = new PrismaClient();

/**
 * CoverageCalculator handles coverage metrics for workflow tests
 */
export class CoverageCalculator {
  /**
   * Calculate test coverage for a workflow execution
   */
  async calculateCoverage(
    workflowId: string,
    execution: WorkflowExecution
  ): Promise<TestCoverage> {
    // Fetch workflow from database
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId }
    });

    // Get all nodes in workflow from database
    const allNodes: Node[] = workflow?.nodes ? (workflow.nodes as unknown as Node[]) : [];
    const executedNodeIds = new Set(execution.nodeExecutions?.map(n => n.nodeId) || []);

    // Calculate node coverage
    const nodeCoverage = {
      total: allNodes.length,
      covered: executedNodeIds.size,
      percentage: allNodes.length > 0 ? (executedNodeIds.size / allNodes.length) * 100 : 0
    };

    // Get all edges/paths from database
    const allEdges: Edge[] = workflow?.edges ? (workflow.edges as unknown as Edge[]) : [];

    // Calculate executed paths based on node executions
    const executedPaths = this.getExecutedPaths(execution.nodeExecutions || [], allEdges);

    // Calculate path coverage
    const pathCoverage = {
      total: allEdges.length,
      covered: executedPaths.size,
      percentage: allEdges.length > 0 ? (executedPaths.size / allEdges.length) * 100 : 0
    };

    // Identify uncovered elements
    const uncoveredNodes = allNodes
      .filter(node => !executedNodeIds.has(node.id))
      .map(node => node.id);

    // Identify uncovered paths
    const allPathStrings = allEdges.map(edge => `${edge.source}->${edge.target}`);
    const uncoveredPaths = allPathStrings.filter(path => !executedPaths.has(path));

    return {
      nodes: nodeCoverage,
      paths: pathCoverage,
      overall: (nodeCoverage.percentage + pathCoverage.percentage) / 2,
      uncoveredNodes,
      uncoveredPaths,
      executionPaths: Array.from(executedPaths)
    };
  }

  /**
   * Get executed paths from node executions
   */
  getExecutedPaths(nodeExecutions: NodeExecution[], allEdges: Edge[]): Set<string> {
    const executedPaths = new Set<string>();

    for (let i = 0; i < nodeExecutions.length - 1; i++) {
      const currentNode = nodeExecutions[i].nodeId;
      const nextNode = nodeExecutions[i + 1].nodeId;
      // Find matching edge
      const matchingEdge = allEdges.find(
        edge => edge.source === currentNode && edge.target === nextNode
      );
      if (matchingEdge) {
        executedPaths.add(`${matchingEdge.source}->${matchingEdge.target}`);
      }
    }

    return executedPaths;
  }

  /**
   * Aggregate coverage from multiple test results
   */
  aggregateCoverage(results: WorkflowTestResult[]): TestCoverage {
    const allCoveredPaths = new Set<string>();
    const allCoveredNodes = new Set<string>();
    let totalNodes = 0;
    let totalPaths = 0;

    for (const result of results) {
      if (result.coverage) {
        result.coverage.executionPaths.forEach(path => allCoveredPaths.add(path));
        result.coverage.uncoveredNodes.forEach(nodeId => {
          // Track all nodes (covered and uncovered)
          allCoveredNodes.add(nodeId);
        });
        totalNodes = Math.max(totalNodes, result.coverage.nodes.total);
        totalPaths = Math.max(totalPaths, result.coverage.paths.total);
      }
    }

    return {
      nodes: {
        total: totalNodes,
        covered: allCoveredNodes.size,
        percentage: totalNodes > 0 ? (allCoveredNodes.size / totalNodes) * 100 : 0
      },
      paths: {
        total: totalPaths,
        covered: allCoveredPaths.size,
        percentage: totalPaths > 0 ? (allCoveredPaths.size / totalPaths) * 100 : 0
      },
      overall: 0, // Would calculate properly
      uncoveredNodes: [],
      uncoveredPaths: [],
      executionPaths: Array.from(allCoveredPaths)
    };
  }
}

// Export singleton instance
export const coverageCalculator = new CoverageCalculator();
