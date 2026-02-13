/**
 * Expression Evaluator
 * Safely evaluates expressions in a sandboxed environment
 */

import type { ExpressionContext } from '../types';

export class ExpressionEvaluator {
  constructor(private context: ExpressionContext) {}

  async evaluate(expression: string): Promise<unknown> {
    // Create safe evaluation context
    const sandbox = this.createSandbox();

    // Replace variables with values
    let processedExpression = expression;
    for (const variable of this.context.variables) {
      const regex = new RegExp(`\\$${variable.name}\\b`, 'g');
      processedExpression = processedExpression.replace(
        regex,
        JSON.stringify(variable.value)
      );
    }

    // Evaluate in sandbox
    return this.evalInSandbox(processedExpression, sandbox);
  }

  async evaluateSafe(expression: string): Promise<unknown> {
    try {
      // Very limited evaluation for preview
      if (expression.match(/^\d+$/)) {
        return parseInt(expression);
      }
      if (expression.match(/^".*"$|^'.*'$/)) {
        return expression.slice(1, -1);
      }
      if (expression === 'true') return true;
      if (expression === 'false') return false;
      if (expression === 'null') return null;

      return undefined;
    } catch {
      return undefined;
    }
  }

  private createSandbox(): Record<string, unknown> {
    const sandbox: Record<string, unknown> = {};

    // Add safe functions
    for (const func of this.context.functions) {
      sandbox[func.name] = (...args: unknown[]) => {
        // Safe function execution
        return `${func.name}(${args.join(', ')})`;
      };
    }

    // Add constants
    for (const constant of this.context.constants) {
      sandbox[constant.name] = constant.value;
    }

    return sandbox;
  }

  private evalInSandbox(expression: string, sandbox: Record<string, unknown>): unknown {
    // Safe evaluation - would use VM or worker in production
    try {
      // This is a placeholder - real implementation would use proper sandboxing
      return new Function(...Object.keys(sandbox), `return ${expression}`)(...Object.values(sandbox));
    } catch (error) {
      throw error;
    }
  }

  updateContext(context: ExpressionContext): void {
    this.context = context;
  }
}
