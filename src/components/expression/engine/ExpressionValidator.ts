/**
 * Expression Validator
 * Validates expressions for syntax errors and issues
 */

import type {
  ExpressionContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  Position
} from '../types';

export class ExpressionValidator {
  constructor(private context: ExpressionContext) {}

  validate(expression: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Check syntax
    try {
      new Function(expression);
    } catch (error) {
      const match = (error as Error).message.match(/line (\d+)/);
      errors.push({
        line: match ? parseInt(match[1]) - 1 : 0,
        column: 0,
        message: (error as Error).message,
        severity: 'error',
        code: 'syntax-error'
      });
    }

    // Check undefined variables
    const variablePattern = /\$(\w+)/g;
    let match;
    while ((match = variablePattern.exec(expression)) !== null) {
      const varName = match[1];
      if (!this.context.variables.find(v => v.name === varName)) {
        errors.push({
          line: 0,
          column: match.index,
          message: `Undefined variable: '$${varName}'`,
          severity: 'error',
          code: 'undefined-variable'
        });
      }
    }

    // Check deprecated functions
    for (const func of this.context.functions) {
      if (func.deprecated && expression.includes(func.name)) {
        warnings.push({
          line: 0,
          column: expression.indexOf(func.name),
          message: `Function '${func.name}' is deprecated`,
          severity: 'warning',
          code: 'deprecated-function'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  validatePartial(expression: string, position: Position): ValidationResult {
    // Quick validation for current line
    const lines = expression.split('\n');
    const currentLine = lines[position.line] || '';

    return this.validate(currentLine);
  }

  updateContext(context: ExpressionContext): void {
    this.context = context;
  }
}
