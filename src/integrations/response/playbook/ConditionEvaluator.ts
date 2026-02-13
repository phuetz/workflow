/**
 * Condition Evaluator for Playbook Engine
 * Secure condition evaluation using SecureExpressionEngineV2
 *
 * @module playbook/ConditionEvaluator
 */

import { SecureExpressionEngineV2 } from '../../../expressions/SecureExpressionEngineV2';
import type { VariableContext } from './types';

/**
 * ConditionEvaluator class
 * Safely evaluates playbook conditions without using eval()
 */
export class ConditionEvaluator {
  private readonly timeout: number;

  constructor(timeout: number = 1000) {
    this.timeout = timeout;
  }

  /**
   * Evaluate a condition expression securely
   * Uses SecureExpressionEngineV2 instead of dangerous eval()
   *
   * @param condition - The condition expression to evaluate
   * @param variables - The variable context for evaluation
   * @returns boolean result of condition evaluation
   */
  public evaluate(condition: string, variables: VariableContext): boolean {
    try {
      const result = SecureExpressionEngineV2.evaluateExpression(
        condition,
        variables as Record<string, unknown>,
        { timeout: this.timeout }
      );

      if (!result.success) {
        // Log security blocks if any
        if (result.securityBlocks && result.securityBlocks.length > 0) {
          console.warn('Playbook condition blocked for security:', result.securityBlocks);
        }
        return false;
      }

      return Boolean(result.value);
    } catch {
      return false;
    }
  }

  /**
   * Validate a condition expression without executing it
   *
   * @param condition - The condition expression to validate
   * @returns Object with valid flag and optional error message
   */
  public validate(condition: string): { valid: boolean; error?: string } {
    try {
      // Basic validation - check for common issues
      if (!condition || typeof condition !== 'string') {
        return { valid: false, error: 'Condition must be a non-empty string' };
      }

      // Check for balanced brackets
      const openBrackets = (condition.match(/\{\{/g) || []).length;
      const closeBrackets = (condition.match(/\}\}/g) || []).length;
      if (openBrackets !== closeBrackets) {
        return { valid: false, error: 'Unbalanced variable brackets {{ }}' };
      }

      // Check for basic forbidden patterns
      const forbiddenPatterns = [
        /eval\s*\(/i,
        /Function\s*\(/i,
        /require\s*\(/i,
        /import\s*\(/i,
        /process\s*\./i,
        /__proto__/i,
        /constructor\s*\[/i
      ];

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(condition)) {
          return { valid: false, error: `Forbidden pattern detected: ${pattern.source}` };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown validation error' };
    }
  }

  /**
   * Extract variable references from a condition
   *
   * @param condition - The condition expression to parse
   * @returns Array of variable paths referenced in the condition
   */
  public extractVariables(condition: string): string[] {
    const variables: string[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(condition)) !== null) {
      const varPath = match[1].trim();
      if (!variables.includes(varPath)) {
        variables.push(varPath);
      }
    }

    return variables;
  }
}
