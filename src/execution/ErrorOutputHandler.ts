/**
 * Error Output Handler
 * Manages error routing to dedicated error output handles
 *
 * Features:
 * - Route errors to error output (output[1])
 * - Success data to normal output (output[0])
 * - Error data structure with full context
 * - Visual distinction for error edges
 */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from '../services/SimpleLogger';

export interface ErrorOutputData {
  error: {
    message: string;
    code?: string;
    stack?: string;
    timestamp: number;
    nodeId: string;
    nodeType: string;
    nodeName: string;
  };
  originalInput?: Record<string, unknown>;
  executionContext?: {
    executionId: string;
    workflowId: string;
    attemptNumber?: number;
  };
}

export interface SuccessOutputData {
  data: Record<string, unknown>;
  metadata?: {
    executionTime: number;
    timestamp: number;
    nodeId: string;
  };
}

export interface OutputRoute {
  targetNodeId: string;
  outputIndex: number; // 0 = success, 1 = error
  data: SuccessOutputData | ErrorOutputData;
}

export class ErrorOutputHandler {
  private errorHandleNodes: Set<string> = new Set();
  private errorEdges: Map<string, WorkflowEdge[]> = new Map();
  private successEdges: Map<string, WorkflowEdge[]> = new Map();

  constructor(
    private nodes: WorkflowNode[],
    private edges: WorkflowEdge[]
  ) {
    this.analyzeErrorHandles();
  }

  /**
   * Analyze which nodes have error handles and categorize edges
   */
  private analyzeErrorHandles(): void {
    // Identify nodes with error handles
    this.nodes.forEach(node => {
      if (node.data.config?.enableErrorHandle || node.data.config?.errorHandle) {
        this.errorHandleNodes.add(node.id);
        logger.debug(`Node ${node.id} (${node.data.type}) has error handle enabled`);
      }
    });

    // Categorize edges as success or error paths
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      if (!sourceNode) return;

      // Error edges are identified by sourceHandle='error' or 'output_1'
      const isErrorEdge =
        edge.sourceHandle === 'error' ||
        edge.sourceHandle === 'output_1' ||
        (edge.data as any)?.type === 'error';

      if (isErrorEdge) {
        if (!this.errorEdges.has(edge.source)) {
          this.errorEdges.set(edge.source, []);
        }
        this.errorEdges.get(edge.source)!.push(edge);
      } else {
        if (!this.successEdges.has(edge.source)) {
          this.successEdges.set(edge.source, []);
        }
        this.successEdges.get(edge.source)!.push(edge);
      }
    });

    logger.info(`Error Output Handler initialized: ${this.errorHandleNodes.size} nodes with error handles`);
  }

  /**
   * Route execution result to appropriate output handles
   */
  routeOutput(
    nodeId: string,
    success: boolean,
    data: Record<string, unknown>,
    error?: Error,
    executionContext?: {
      executionId: string;
      workflowId: string;
      attemptNumber?: number;
    }
  ): OutputRoute[] {
    const routes: OutputRoute[] = [];
    const node = this.nodes.find(n => n.id === nodeId);

    if (!node) {
      logger.warn(`Node ${nodeId} not found for output routing`);
      return routes;
    }

    if (success) {
      // Route to success output (output[0])
      const successEdges = this.successEdges.get(nodeId) || [];

      successEdges.forEach(edge => {
        routes.push({
          targetNodeId: edge.target,
          outputIndex: 0,
          data: {
            data,
            metadata: {
              executionTime: 0,
              timestamp: Date.now(),
              nodeId
            }
          }
        });
      });

      logger.debug(`Routed success output from ${nodeId} to ${routes.length} targets`);
    } else {
      // Check if node has error handle
      const hasErrorHandle = this.errorHandleNodes.has(nodeId);

      if (hasErrorHandle) {
        // Route to error output (output[1])
        const errorEdges = this.errorEdges.get(nodeId) || [];

        const errorData: ErrorOutputData = {
          error: {
            message: error?.message || 'Unknown error',
            code: (error as any)?.code,
            stack: error?.stack,
            timestamp: Date.now(),
            nodeId,
            nodeType: node.data.type,
            nodeName: node.data.label
          },
          originalInput: data,
          executionContext
        };

        errorEdges.forEach(edge => {
          routes.push({
            targetNodeId: edge.target,
            outputIndex: 1,
            data: errorData
          });
        });

        logger.info(`Routed error output from ${nodeId} to ${routes.length} error handlers`);
      } else {
        // No error handle - error propagates up
        logger.warn(`Node ${nodeId} failed but has no error handle`);
      }
    }

    return routes;
  }

  /**
   * Create error output data structure
   */
  createErrorOutput(
    nodeId: string,
    error: Error,
    originalInput?: Record<string, unknown>,
    executionContext?: {
      executionId: string;
      workflowId: string;
      attemptNumber?: number;
    }
  ): ErrorOutputData {
    const node = this.nodes.find(n => n.id === nodeId);

    return {
      error: {
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
        timestamp: Date.now(),
        nodeId,
        nodeType: node?.data.type || 'unknown',
        nodeName: node?.data.label || 'Unknown Node'
      },
      originalInput,
      executionContext
    };
  }

  /**
   * Check if a node has error output handle
   */
  hasErrorHandle(nodeId: string): boolean {
    return this.errorHandleNodes.has(nodeId);
  }

  /**
   * Get all error output targets for a node
   */
  getErrorOutputTargets(nodeId: string): string[] {
    const errorEdges = this.errorEdges.get(nodeId) || [];
    return errorEdges.map(edge => edge.target);
  }

  /**
   * Get all success output targets for a node
   */
  getSuccessOutputTargets(nodeId: string): string[] {
    const successEdges = this.successEdges.get(nodeId) || [];
    return successEdges.map(edge => edge.target);
  }

  /**
   * Enable error handle for a node
   */
  enableErrorHandle(nodeId: string): void {
    this.errorHandleNodes.add(nodeId);
    logger.info(`Enabled error handle for node ${nodeId}`);
  }

  /**
   * Disable error handle for a node
   */
  disableErrorHandle(nodeId: string): void {
    this.errorHandleNodes.delete(nodeId);
    this.errorEdges.delete(nodeId);
    logger.info(`Disabled error handle for node ${nodeId}`);
  }

  /**
   * Get error edge style for visual distinction
   */
  static getErrorEdgeStyle(): {
    stroke: string;
    strokeDasharray: string;
    strokeWidth: number;
  } {
    return {
      stroke: '#ef4444', // red-500
      strokeDasharray: '5,5',
      strokeWidth: 2
    };
  }

  /**
   * Get success edge style
   */
  static getSuccessEdgeStyle(): {
    stroke: string;
    strokeWidth: number;
  } {
    return {
      stroke: '#10b981', // green-500
      strokeWidth: 2
    };
  }

  /**
   * Create error edge configuration for ReactFlow
   */
  createErrorEdge(
    sourceNodeId: string,
    targetNodeId: string,
    edgeId?: string
  ): WorkflowEdge {
    return {
      id: edgeId || `${sourceNodeId}-error-${targetNodeId}`,
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: 'error',
      targetHandle: 'input',
      animated: true,
      style: ErrorOutputHandler.getErrorEdgeStyle(),
      data: {
        ...(({ type: 'error' } as any))
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#ef4444',
        width: 20,
        height: 20
      }
    };
  }

  /**
   * Validate error output configuration
   */
  validateErrorOutputs(): {
    valid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for error edges without error handles
    this.errorEdges.forEach((edges, sourceNodeId) => {
      if (!this.errorHandleNodes.has(sourceNodeId)) {
        issues.push(`Node ${sourceNodeId} has error edges but error handle is not enabled`);
      }
    });

    // Check for error handles without error edges
    this.errorHandleNodes.forEach(nodeId => {
      const errorEdges = this.errorEdges.get(nodeId) || [];
      if (errorEdges.length === 0) {
        warnings.push(`Node ${nodeId} has error handle enabled but no error edges defined`);
      }
    });

    // Check for circular error paths
    const visited = new Set<string>();
    const circularPaths = this.detectCircularErrorPaths(visited);
    if (circularPaths.length > 0) {
      warnings.push(`Detected potential circular error paths: ${circularPaths.join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Detect circular error paths (basic check)
   */
  private detectCircularErrorPaths(visited: Set<string>, currentNode?: string): string[] {
    const circular: string[] = [];

    // Simple cycle detection - could be enhanced
    this.errorEdges.forEach((edges, sourceId) => {
      edges.forEach(edge => {
        if (edge.target === currentNode) {
          circular.push(`${sourceId} -> ${edge.target}`);
        }
      });
    });

    return circular;
  }

  /**
   * Get statistics about error outputs
   */
  getStatistics(): {
    totalNodes: number;
    nodesWithErrorHandles: number;
    errorEdges: number;
    successEdges: number;
  } {
    let errorEdgeCount = 0;
    let successEdgeCount = 0;

    this.errorEdges.forEach(edges => {
      errorEdgeCount += edges.length;
    });

    this.successEdges.forEach(edges => {
      successEdgeCount += edges.length;
    });

    return {
      totalNodes: this.nodes.length,
      nodesWithErrorHandles: this.errorHandleNodes.size,
      errorEdges: errorEdgeCount,
      successEdges: successEdgeCount
    };
  }
}

/**
 * Factory function to create error output handler
 */
export const createErrorOutputHandler = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ErrorOutputHandler => {
  return new ErrorOutputHandler(nodes, edges);
};
