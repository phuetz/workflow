/**
 * Expression Formatter
 * Formats expressions for better readability
 */

import type { Range } from '../types';

export class ExpressionFormatter {
  format(expression: string): string {
    // Basic formatting
    let formatted = expression;

    // Add spaces around operators
    formatted = formatted.replace(/([+\-*/%=<>!&|]+)/g, ' $1 ');

    // Format brackets
    formatted = formatted.replace(/\s*{\s*/g, ' {\n  ');
    formatted = formatted.replace(/\s*}\s*/g, '\n}');

    // Format commas
    formatted = formatted.replace(/\s*,\s*/g, ', ');

    // Remove multiple spaces
    formatted = formatted.replace(/  +/g, ' ');

    // Trim lines
    formatted = formatted.split('\n').map(line => line.trim()).join('\n');

    return formatted;
  }

  formatRange(expression: string, range: Range): string {
    const lines = expression.split('\n');
    const selectedLines = lines.slice(range.start.line, range.end.line + 1);
    const formatted = this.format(selectedLines.join('\n'));

    lines.splice(range.start.line, range.end.line - range.start.line + 1, ...formatted.split('\n'));

    return lines.join('\n');
  }
}
