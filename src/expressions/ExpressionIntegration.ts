/**
 * ExpressionIntegration - Bridge between Expression System and Execution Engine
 *
 * This module provides integration utilities to use the new expression system
 * within the workflow execution engine.
 */

import { SecureExpressionEngineV2 as ExpressionEngine, EvaluationResult } from './SecureExpressionEngineV2';
import { ExpressionContext, WorkflowItem, NodeData, WorkflowMetadata, ExecutionMetadata } from './ExpressionContext';
import { WorkflowNode } from '../types/workflow';
import { logger } from '../services/SimpleLogger';

export interface NodeExecutionData {
  json: any[];
  binary?: any[];
  error?: Error;
}

export interface ExpressionEvaluationContext {
  currentNode: WorkflowNode;
  currentItem?: WorkflowItem;
  currentItemIndex?: number;
  allItems?: WorkflowItem[];
  previousNodes?: Map<string, NodeExecutionData>;
  workflow?: WorkflowMetadata;
  execution?: ExecutionMetadata;
  environment?: Record<string, string>;
  runIndex?: number;
}

/**
 * Evaluate expressions in node configuration
 */
export class ExpressionEvaluator {
  /**
   * Evaluate all expressions in an object recursively
   */
  static evaluateObjectExpressions(
    obj: any,
    context: ExpressionEvaluationContext
  ): { result: any; errors: string[] } {
    const errors: string[] = [];

    // Build expression context
    const expressionContext = this.buildExpressionContext(context);
    const contextData = expressionContext.buildContext();

    // Recursive evaluation
    const evaluate = (value: any): any => {
      if (value === null || value === undefined) {
        return value;
      }

      // String - may contain expressions
      if (typeof value === 'string') {
        const evaluation = ExpressionEngine.evaluateAll(value, contextData);

        if (!evaluation.success) {
          errors.push(evaluation.error || 'Unknown error');
          return value; // Return original on error
        }

        return evaluation.value;
      }

      // Array - evaluate each element
      if (Array.isArray(value)) {
        return value.map(item => evaluate(item));
      }

      // Object - evaluate each property
      if (typeof value === 'object') {
        const result: any = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            result[key] = evaluate(value[key]);
          }
        }
        return result;
      }

      // Other types - return as is
      return value;
    };

    const result = evaluate(obj);

    return { result, errors };
  }

  /**
   * Evaluate a single expression
   */
  static evaluateExpression(
    expression: string,
    context: ExpressionEvaluationContext
  ): EvaluationResult {
    const expressionContext = this.buildExpressionContext(context);
    const contextData = expressionContext.buildContext();

    return ExpressionEngine.evaluateAll(expression, contextData);
  }

  /**
   * Test if a value contains expressions
   */
  static hasExpressions(value: any): boolean {
    if (typeof value === 'string') {
      return ExpressionEngine.hasExpressions(value);
    }

    if (Array.isArray(value)) {
      return value.some(item => this.hasExpressions(item));
    }

    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(item => this.hasExpressions(item));
    }

    return false;
  }

  /**
   * Build ExpressionContext from execution context
   */
  private static buildExpressionContext(
    context: ExpressionEvaluationContext
  ): ExpressionContext {
    // Convert previous nodes data to Map<string, NodeData>
    const nodeData = new Map<string, NodeData>();
    if (context.previousNodes) {
      const entries = Array.from(context.previousNodes.entries());
      for (const [nodeName, data] of entries) {
        nodeData.set(nodeName, {
          json: data.json || [],
          binary: data.binary,
          error: data.error,
        });
      }
    }

    return new ExpressionContext({
      currentItem: context.currentItem,
      currentItemIndex: context.currentItemIndex ?? 0,
      allItems: context.allItems ?? [],
      nodeData,
      workflow: context.workflow,
      execution: context.execution,
      environment: context.environment ?? {},
      runIndex: context.runIndex ?? 0,
      previousNodeName: this.findPreviousNodeName(context),
    });
  }

  /**
   * Find the name of the previous node
   */
  private static findPreviousNodeName(
    context: ExpressionEvaluationContext
  ): string | undefined {
    if (!context.previousNodes || context.previousNodes.size === 0) {
      return undefined;
    }

    // Return the first previous node (or implement more sophisticated logic)
    return Array.from(context.previousNodes.keys())[0];
  }
}

/**
 * Helper to process node parameters with expressions
 */
export class NodeParameterProcessor {
  /**
   * Process node parameters and evaluate expressions
   */
  static processParameters(
    node: WorkflowNode,
    context: ExpressionEvaluationContext
  ): { parameters: any; errors: string[] } {
    logger.debug(`Processing parameters for node: ${node.id}`);

    const parameters = node.data?.config || {};

    // Check if parameters contain expressions
    if (!ExpressionEvaluator.hasExpressions(parameters)) {
      return { parameters, errors: [] };
    }

    // Evaluate expressions in parameters
    const { result, errors } = ExpressionEvaluator.evaluateObjectExpressions(
      parameters,
      context
    );

    if (errors.length > 0) {
      logger.warn(`Errors evaluating expressions in node ${node.id}:`, errors);
    }

    return { parameters: result, errors };
  }

  /**
   * Process a single parameter value
   */
  static processParameter(
    parameterValue: any,
    context: ExpressionEvaluationContext
  ): { value: any; error?: string } {
    if (!ExpressionEvaluator.hasExpressions(parameterValue)) {
      return { value: parameterValue };
    }

    const { result, errors } = ExpressionEvaluator.evaluateObjectExpressions(
      parameterValue,
      context
    );

    return {
      value: result,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }
}

/**
 * Helper to convert execution results to WorkflowItem format
 */
export class ExecutionDataConverter {
  /**
   * Convert node execution result to WorkflowItem
   */
  static resultToWorkflowItem(result: any): WorkflowItem {
    if (!result) {
      return { json: {} };
    }

    // If result is already in WorkflowItem format
    if (result.json !== undefined) {
      return {
        json: result.json,
        binary: result.binary,
        pairedItem: result.pairedItem,
      };
    }

    // Otherwise, wrap in WorkflowItem
    return {
      json: result,
    };
  }

  /**
   * Convert array of results to WorkflowItem array
   */
  static resultsToWorkflowItems(results: any[]): WorkflowItem[] {
    if (!Array.isArray(results)) {
      return [this.resultToWorkflowItem(results)];
    }

    return results.map(result => this.resultToWorkflowItem(result));
  }

  /**
   * Convert node execution data to NodeExecutionData format
   */
  static toNodeExecutionData(data: any): NodeExecutionData {
    if (!data) {
      return { json: [] };
    }

    // If already in correct format
    if (data.json !== undefined && Array.isArray(data.json)) {
      return data as NodeExecutionData;
    }

    // Convert to array format
    if (Array.isArray(data)) {
      return { json: data };
    }

    // Wrap single item
    return { json: [data] };
  }
}

/**
 * Expression validation utilities
 */
export class ExpressionValidator {
  /**
   * Validate all expressions in an object
   */
  static validateExpressions(obj: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const validate = (value: any, path: string = ''): void => {
      if (typeof value === 'string') {
        const expressions = ExpressionEngine.parseExpressions(value);

        for (const expr of expressions) {
          const validation = ExpressionEngine.validateExpression(expr.expression);

          if (!validation.valid) {
            errors.push(`${path}: ${validation.error}`);
          }
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => validate(item, `${path}[${index}]`));
      } else if (typeof value === 'object' && value !== null) {
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            validate(value[key], path ? `${path}.${key}` : key);
          }
        }
      }
    };

    validate(obj);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate node parameters
   */
  static validateNodeParameters(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const parameters = node.data?.config || {};
    return this.validateExpressions(parameters);
  }
}

/**
 * Expression performance monitoring
 */
export class ExpressionPerformanceMonitor {
  private static evaluationTimes: Map<string, number[]> = new Map();

  /**
   * Track expression evaluation time
   */
  static trackEvaluation(nodeId: string, evaluationTime: number): void {
    if (!this.evaluationTimes.has(nodeId)) {
      this.evaluationTimes.set(nodeId, []);
    }

    this.evaluationTimes.get(nodeId)!.push(evaluationTime);
  }

  /**
   * Get performance statistics
   */
  static getStatistics(nodeId?: string): {
    nodeId: string;
    count: number;
    average: number;
    min: number;
    max: number;
  }[] {
    const stats: any[] = [];

    const nodesToProcess = nodeId
      ? [[nodeId, this.evaluationTimes.get(nodeId) || []] as [string, number[]]]
      : Array.from(this.evaluationTimes.entries());

    const processEntries = Array.from(nodesToProcess);
    for (const [id, times] of processEntries) {
      if (!times || times.length === 0) continue;

      const timesArray = Array.from(times);
      stats.push({
        nodeId: id,
        count: times.length,
        average: timesArray.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...timesArray),
        max: Math.max(...timesArray),
      });
    }

    return stats;
  }

  /**
   * Clear statistics
   */
  static clear(nodeId?: string): void {
    if (nodeId) {
      this.evaluationTimes.delete(nodeId);
    } else {
      this.evaluationTimes.clear();
    }
  }
}

export default {
  ExpressionEvaluator,
  NodeParameterProcessor,
  ExecutionDataConverter,
  ExpressionValidator,
  ExpressionPerformanceMonitor,
};
