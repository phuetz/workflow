/**
 * Distributed Executor - Parallel workflow execution with partitioning
 * Splits workflows into parallel execution groups for maximum throughput
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';
import { SafeExecutionResult, SafeObject } from '../../utils/TypeSafetyUtils';
import {
  Task,
  TaskPriority,
  WorkflowPartition,
  DistributedExecutionPlan,
  AggregatedResult
} from '../../types/taskrunner';

export class DistributedExecutor extends EventEmitter {
  constructor() {
    super();
    logger.info('DistributedExecutor initialized');
  }

  /**
   * Create execution plan by partitioning workflow
   */
  createExecutionPlan(
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): DistributedExecutionPlan {
    logger.info('Creating distributed execution plan', {
      workflowId,
      nodeCount: nodes.length,
      edgeCount: edges.length
    });

    // Build dependency graph
    const dependencyMap = this.buildDependencyGraph(nodes, edges);

    // Find execution levels (nodes that can run in parallel)
    const executionLevels = this.findExecutionLevels(nodes, dependencyMap);

    // Create partitions for each level
    const partitions: WorkflowPartition[] = [];
    const executionOrder: string[][] = [];

    executionLevels.forEach((level, index) => {
      const levelPartitions: string[] = [];

      // Group nodes in this level into partitions
      const partition = this.createPartition(
        `partition_${index}`,
        level,
        edges,
        dependencyMap
      );

      partitions.push(partition);
      levelPartitions.push(partition.id);

      executionOrder.push(levelPartitions);
    });

    // Estimate total duration
    const totalEstimatedDuration = partitions.reduce(
      (max, partition) => Math.max(max, partition.estimatedDuration),
      0
    );

    const plan: DistributedExecutionPlan = {
      workflowId,
      partitions,
      executionOrder,
      totalEstimatedDuration
    };

    logger.info('Execution plan created', {
      workflowId,
      partitionCount: partitions.length,
      parallelLevels: executionOrder.length,
      estimatedDuration: `${totalEstimatedDuration}ms`
    });

    return plan;
  }

  /**
   * Execute workflow using distributed execution plan
   */
  async executeDistributed(
    plan: DistributedExecutionPlan,
    executeTask: (task: Task) => Promise<void>,
    priority: TaskPriority = 'normal'
  ): Promise<AggregatedResult> {
    logger.info('Starting distributed execution', {
      workflowId: plan.workflowId,
      partitions: plan.partitions.length
    });

    const startTime = Date.now();
    const partitionResults = new Map<string, Map<string, SafeExecutionResult>>();
    const errors: Array<{ partitionId: string; nodeId: string; error: string }> = [];

    try {
      // Execute partitions level by level
      for (const levelPartitionIds of plan.executionOrder) {
        const levelPartitions = plan.partitions.filter(p =>
          levelPartitionIds.includes(p.id)
        );

        logger.debug('Executing partition level', {
          level: plan.executionOrder.indexOf(levelPartitionIds),
          partitions: levelPartitions.length
        });

        // Execute partitions in parallel
        const levelPromises = levelPartitions.map(partition =>
          this.executePartition(
            partition,
            executeTask,
            priority,
            partitionResults
          )
        );

        const levelResults = await Promise.allSettled(levelPromises);

        // Collect results and errors
        levelResults.forEach((result, index) => {
          const partition = levelPartitions[index];

          if (result.status === 'fulfilled') {
            partitionResults.set(partition.id, result.value);
          } else {
            logger.error('Partition execution failed', {
              partitionId: partition.id,
              error: result.reason
            });

            partition.nodes.forEach(node => {
              errors.push({
                partitionId: partition.id,
                nodeId: node.id,
                error: result.reason?.message || 'Unknown error'
              });
            });
          }
        });

        // Stop if there are errors and dependencies
        if (errors.length > 0) {
          logger.warn('Errors detected, checking dependencies');
          // Continue only if next level doesn't depend on failed partitions
        }
      }

      const totalExecutionTime = Date.now() - startTime;
      const success = errors.length === 0;

      logger.info('Distributed execution completed', {
        workflowId: plan.workflowId,
        success,
        duration: `${totalExecutionTime}ms`,
        errors: errors.length
      });

      const result: AggregatedResult = {
        workflowId: plan.workflowId,
        success,
        partitionResults,
        totalExecutionTime,
        errors
      };

      this.emit('execution_completed', result);

      return result;

    } catch (error) {
      logger.error('Distributed execution failed', {
        workflowId: plan.workflowId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Execute a single partition
   */
  private async executePartition(
    partition: WorkflowPartition,
    executeTask: (task: Task) => Promise<void>,
    priority: TaskPriority,
    previousResults: Map<string, Map<string, SafeExecutionResult>>
  ): Promise<Map<string, SafeExecutionResult>> {
    logger.debug('Executing partition', {
      partitionId: partition.id,
      nodeCount: partition.nodes.length
    });

    const results = new Map<string, SafeExecutionResult>();

    // Execute nodes in partition sequentially (respecting internal dependencies)
    for (const node of partition.nodes) {
      try {
        // Gather input data from previous results
        const inputData = this.gatherInputData(node, partition.edges, previousResults, results);

        // Create task
        const task: Task = {
          id: `task_${node.id}_${Date.now()}`,
          workflowId: partition.id,
          nodeId: node.id,
          node,
          inputData,
          priority,
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now(),
          timeout: 60000,
          dependencies: []
        };

        // Execute task
        await executeTask(task);

        // Simulate result (in real implementation, get from task result)
        const result: SafeExecutionResult = {
          success: true,
          status: 'success',
          data: { processed: true },
          nodeId: node.id,
          timestamp: Date.now(),
          duration: 100
        };

        results.set(node.id, result);

      } catch (error) {
        logger.error('Node execution failed in partition', {
          partitionId: partition.id,
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        });

        const errorResult: SafeExecutionResult = {
          success: false,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          nodeId: node.id,
          timestamp: Date.now(),
          duration: 0
        };

        results.set(node.id, errorResult);
        throw error;
      }
    }

    return results;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private buildDependencyGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();

    // Initialize all nodes
    nodes.forEach(node => {
      dependencyMap.set(node.id, []);
    });

    // Build dependencies
    edges.forEach(edge => {
      const deps = dependencyMap.get(edge.target) || [];
      deps.push(edge.source);
      dependencyMap.set(edge.target, deps);
    });

    return dependencyMap;
  }

  private findExecutionLevels(
    nodes: WorkflowNode[],
    dependencyMap: Map<string, string[]>
  ): WorkflowNode[][] {
    const levels: WorkflowNode[][] = [];
    const processed = new Set<string>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    while (processed.size < nodes.length) {
      const level: WorkflowNode[] = [];

      // Find nodes whose dependencies are all processed
      for (const node of nodes) {
        if (processed.has(node.id)) continue;

        const deps = dependencyMap.get(node.id) || [];
        const allDepsProcessed = deps.every(dep => processed.has(dep));

        if (allDepsProcessed) {
          level.push(node);
        }
      }

      if (level.length === 0) {
        // Circular dependency detected
        logger.warn('Circular dependency detected, breaking');
        break;
      }

      levels.push(level);
      level.forEach(node => processed.add(node.id));
    }

    return levels;
  }

  private createPartition(
    id: string,
    nodes: WorkflowNode[],
    allEdges: WorkflowEdge[],
    dependencyMap: Map<string, string[]>
  ): WorkflowPartition {
    const nodeIds = new Set(nodes.map(n => n.id));

    // Get edges within this partition
    const edges = allEdges.filter(
      edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    // Get dependencies on other partitions
    const dependencies = Array.from(
      new Set(
        nodes.flatMap(node => {
          const deps = dependencyMap.get(node.id) || [];
          return deps.filter(dep => !nodeIds.has(dep));
        })
      )
    );

    // Estimate complexity (simple heuristic)
    const complexity = nodes.reduce((sum, node) => {
      const nodeComplexity = this.estimateNodeComplexity(node);
      return sum + nodeComplexity;
    }, 0);

    // Estimate duration (100ms per complexity unit)
    const estimatedDuration = complexity * 100;

    return {
      id,
      nodes,
      edges,
      dependencies,
      estimatedComplexity: complexity,
      estimatedDuration
    };
  }

  private estimateNodeComplexity(node: WorkflowNode): number {
    // Simple complexity estimation based on node type
    const complexityMap: Record<string, number> = {
      http_request: 5,
      database_query: 7,
      code_execution: 10,
      ai_processing: 15,
      data_transformation: 3,
      webhook: 2,
      delay: 1
    };

    return complexityMap[node.data.type] || 5;
  }

  private gatherInputData(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    previousResults: Map<string, Map<string, SafeExecutionResult>>,
    currentResults: Map<string, SafeExecutionResult>
  ): SafeObject {
    const inputData: SafeObject = {};

    // Find incoming edges
    const incomingEdges = edges.filter(e => e.target === node.id);

    incomingEdges.forEach(edge => {
      // Check current partition results first
      let result = currentResults.get(edge.source);

      // If not found, check previous partition results
      if (!result) {
        for (const partitionResults of previousResults.values()) {
          result = partitionResults.get(edge.source);
          if (result) break;
        }
      }

      if (result?.data) {
        Object.assign(inputData, result.data);
      }
    });

    return inputData;
  }

  /**
   * Aggregate results from all partitions
   */
  aggregateResults(result: AggregatedResult): Map<string, SafeExecutionResult> {
    const aggregated = new Map<string, SafeExecutionResult>();

    for (const partitionResults of result.partitionResults.values()) {
      for (const [nodeId, nodeResult] of partitionResults.entries()) {
        aggregated.set(nodeId, nodeResult);
      }
    }

    return aggregated;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(result: AggregatedResult) {
    const aggregated = this.aggregateResults(result);
    const successCount = Array.from(aggregated.values()).filter(r => r.success).length;
    const failureCount = Array.from(aggregated.values()).filter(r => !r.success).length;

    return {
      totalNodes: aggregated.size,
      successfulNodes: successCount,
      failedNodes: failureCount,
      successRate: aggregated.size > 0 ? successCount / aggregated.size : 0,
      totalExecutionTime: result.totalExecutionTime,
      partitionsExecuted: result.partitionResults.size,
      errors: result.errors.length
    };
  }
}
