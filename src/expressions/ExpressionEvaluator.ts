/**
 * Expression Evaluator
 * Evaluates {{ expression }} syntax with full context access
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import { logger } from '../services/SimpleLogger';
import { ExpressionParser } from './ExpressionParser';
import { ExpressionValidator } from './ExpressionValidator';
import { FunctionLibrary } from './FunctionLibrary';
import type { ExpressionContext, ExpressionResult, EvaluationOptions } from '../types/expressions';

export class ExpressionEvaluator {
  private parser: ExpressionParser;
  private validator: ExpressionValidator;
  private functionLibrary: FunctionLibrary;

  constructor() {
    this.parser = new ExpressionParser();
    this.validator = new ExpressionValidator();
    this.functionLibrary = new FunctionLibrary();
    logger.debug('ExpressionEvaluator initialized');
  }

  /**
   * Evaluate a string containing {{ expressions }}
   * Supports multiple expressions in one string
   */
  async evaluate(
    input: string,
    context: ExpressionContext,
    options: EvaluationOptions = {}
  ): Promise<ExpressionResult> {
    try {
      // Find all {{ }} expressions in the input
      const expressions = this.parser.findExpressions(input);

      if (expressions.length === 0) {
        // No expressions found, return input as-is
        return {
          success: true,
          value: input,
          originalInput: input
        };
      }

      // If input is a single expression, return its value directly
      if (expressions.length === 1 && expressions[0].fullMatch === input) {
        return await this.evaluateSingleExpression(expressions[0].expression, context, options);
      }

      // Multiple expressions or mixed string: replace each expression
      let result = input;
      for (const expr of expressions) {
        const evaluated = await this.evaluateSingleExpression(expr.expression, context, options);

        if (!evaluated.success) {
          if (options.throwOnError) {
            throw new Error(evaluated.error);
          }
          // Keep expression as-is on error
          continue;
        }

        // Convert value to string for replacement
        const replacement = this.valueToString(evaluated.value);
        result = result.replace(expr.fullMatch, replacement);
      }

      return {
        success: true,
        value: result,
        originalInput: input
      };

    } catch (error) {
      logger.error('Expression evaluation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        originalInput: input
      };
    }
  }

  /**
   * Evaluate a single expression (without {{ }})
   */
  private async evaluateSingleExpression(
    expression: string,
    context: ExpressionContext,
    options: EvaluationOptions
  ): Promise<ExpressionResult> {
    try {
      // Validate expression first
      const validation = this.validator.validate(expression);
      if (!validation.valid) {
        throw new Error(`Invalid expression: ${validation.error}`);
      }

      // Parse expression into AST
      const ast = this.parser.parse(expression);

      // Evaluate AST with context
      const value = await this.evaluateAst(ast, context, options);

      return {
        success: true,
        value,
        originalInput: expression
      };

    } catch (error) {
      logger.error(`Failed to evaluate expression: ${expression}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        originalInput: expression
      };
    }
  }

  /**
   * Evaluate AST node with context
   */
  private async evaluateAst(
    ast: any,
    context: ExpressionContext,
    options: EvaluationOptions
  ): Promise<any> {
    if (!ast) {
      return undefined;
    }

    switch (ast.type) {
      case 'Literal':
        return ast.value;

      case 'Identifier':
        return this.resolveIdentifier(ast.name, context);

      case 'MemberExpression':
        return this.resolveMemberExpression(ast, context);

      case 'CallExpression':
        return await this.evaluateCallExpression(ast, context, options);

      case 'BinaryExpression':
        return await this.evaluateBinaryExpression(ast, context, options);

      case 'UnaryExpression':
        return await this.evaluateUnaryExpression(ast, context, options);

      case 'ConditionalExpression':
        return await this.evaluateConditionalExpression(ast, context, options);

      case 'ArrayExpression':
        return await this.evaluateArrayExpression(ast, context, options);

      case 'ObjectExpression':
        return await this.evaluateObjectExpression(ast, context, options);

      default:
        throw new Error(`Unknown AST node type: ${ast.type}`);
    }
  }

  /**
   * Resolve identifier (variable name)
   */
  private resolveIdentifier(name: string, context: ExpressionContext): any {
    // Special context variables
    if (name === '$variables' || name === '$vars') {
      return context.variables || {};
    }

    if (name === '$env') {
      return context.env || {};
    }

    if (name === '$node') {
      return context.nodeOutputs || {};
    }

    if (name === '$input') {
      return context.inputData || {};
    }

    if (name === '$workflow') {
      return context.workflowData || {};
    }

    if (name === '$execution') {
      return context.executionData || {};
    }

    // Check in local scope first
    if (context.localScope && name in context.localScope) {
      return context.localScope[name];
    }

    // Not found
    throw new Error(`Undefined variable: ${name}`);
  }

  /**
   * Resolve member expression (e.g., $variables.myVar, $node["HTTP Request"].json)
   */
  private resolveMemberExpression(ast: any, context: ExpressionContext): any {
    // Get object
    const object = this.evaluateAst(ast.object, context, {});

    if (object === null || object === undefined) {
      return undefined;
    }

    // Get property
    const property = ast.computed
      ? this.evaluateAst(ast.property, context, {})
      : ast.property.name;

    return object[property];
  }

  /**
   * Evaluate function call
   */
  private async evaluateCallExpression(
    ast: any,
    context: ExpressionContext,
    options: EvaluationOptions
  ): Promise<any> {
    // Get function name
    const functionName = ast.callee.name || this.getFunctionName(ast.callee);

    // Get function from library
    const func = this.functionLibrary.getFunction(functionName);
    if (!func) {
      throw new Error(`Unknown function: ${functionName}`);
    }

    // Evaluate arguments
    const args: any[] = [];
    for (const arg of ast.arguments) {
      const value = await this.evaluateAst(arg, context, options);
      args.push(value);
    }

    // Execute function
    try {
      const result = await func.execute(...args);
      return result;
    } catch (error) {
      throw new Error(`Function ${functionName} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get function name from callee AST
   */
  private getFunctionName(callee: any): string {
    if (callee.type === 'Identifier') {
      return callee.name;
    }
    if (callee.type === 'MemberExpression') {
      return callee.property.name;
    }
    throw new Error('Invalid function call');
  }

  /**
   * Evaluate binary expression (e.g., a + b, a > b)
   */
  private async evaluateBinaryExpression(
    ast: any,
    context: ExpressionContext,
    options: EvaluationOptions
  ): Promise<any> {
    const left = await this.evaluateAst(ast.left, context, options);
    const right = await this.evaluateAst(ast.right, context, options);

    switch (ast.operator) {
      // Arithmetic
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;

      // Comparison
      case '==': return left == right;
      case '===': return left === right;
      case '!=': return left != right;
      case '!==': return left !== right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;

      // Logical
      case '&&': return left && right;
      case '||': return left || right;

      // String
      case 'in': return right && typeof right === 'object' && left in right;

      default:
        throw new Error(`Unknown binary operator: ${ast.operator}`);
    }
  }

  /**
   * Evaluate unary expression (e.g., !value, -value)
   */
  private async evaluateUnaryExpression(
    ast: any,
    context: ExpressionContext,
    options: EvaluationOptions
  ): Promise<any> {
    const argument = await this.evaluateAst(ast.argument, context, options);

    switch (ast.operator) {
      case '!': return !argument;
      case '-': return -argument;
      case '+': return +argument;
      case 'typeof': return typeof argument;
      default:
        throw new Error(`Unknown unary operator: ${ast.operator}`);
    }
  }

  /**
   * Evaluate conditional expression (e.g., condition ? true : false)
   */
  private async evaluateConditionalExpression(
    ast: any,
    context: ExpressionContext,
    options: EvaluationOptions
  ): Promise<any> {
    const test = await this.evaluateAst(ast.test, context, options);
    return test
      ? await this.evaluateAst(ast.consequent, context, options)
      : await this.evaluateAst(ast.alternate, context, options);
  }

  /**
   * Evaluate array expression (e.g., [1, 2, 3])
   */
  private async evaluateArrayExpression(
    ast: any,
    context: ExpressionContext,
    options: EvaluationOptions
  ): Promise<any[]> {
    const elements: any[] = [];
    for (const element of ast.elements) {
      const value = await this.evaluateAst(element, context, options);
      elements.push(value);
    }
    return elements;
  }

  /**
   * Evaluate object expression (e.g., {key: value})
   */
  private async evaluateObjectExpression(
    ast: any,
    context: ExpressionContext,
    options: EvaluationOptions
  ): Promise<Record<string, any>> {
    const obj: Record<string, any> = {};
    for (const property of ast.properties) {
      const key = property.key.name || property.key.value;
      const value = await this.evaluateAst(property.value, context, options);
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Convert value to string for replacement
   */
  private valueToString(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Evaluate expression synchronously (for simple expressions)
   */
  evaluateSync(
    input: string,
    context: ExpressionContext,
    options: EvaluationOptions = {}
  ): any {
    // For now, use async version (in production, implement true sync version)
    // This is a simplified version for testing
    try {
      const expressions = this.parser.findExpressions(input);
      if (expressions.length === 0) return input;

      if (expressions.length === 1 && expressions[0].fullMatch === input) {
        const ast = this.parser.parse(expressions[0].expression);
        return this.evaluateAst(ast, context, options);
      }

      let result = input;
      for (const expr of expressions) {
        const ast = this.parser.parse(expr.expression);
        const value = this.evaluateAst(ast, context, options);
        const replacement = this.valueToString(value);
        result = result.replace(expr.fullMatch, replacement);
      }

      return result;
    } catch (error) {
      logger.error('Sync evaluation failed:', error);
      if (options.throwOnError) {
        throw error;
      }
      return input;
    }
  }

  /**
   * Test if a string contains expressions
   */
  hasExpressions(input: string): boolean {
    return this.parser.findExpressions(input).length > 0;
  }

  /**
   * Extract all expression strings from input
   */
  extractExpressions(input: string): string[] {
    return this.parser.findExpressions(input).map(e => e.expression);
  }
}

// Export singleton instance
let evaluatorInstance: ExpressionEvaluator | null = null;

export function getExpressionEvaluator(): ExpressionEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new ExpressionEvaluator();
  }
  return evaluatorInstance;
}

export function resetExpressionEvaluator(): void {
  evaluatorInstance = null;
}
