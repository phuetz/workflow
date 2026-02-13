/**
 * Column Manager - Column validation and operations
 */

import type {
  Table,
  Column,
  ValidationRule,
  CacheEntry
} from './types';

export class ColumnManager {
  private autoNumberCache: Map<string, CacheEntry> = new Map();

  /**
   * Validate row data against table schema
   */
  async validateRowData(
    table: Table,
    data: any,
    isUpdate = false
  ): Promise<void> {
    for (const column of table.schema.columns) {
      const value = data[column.name];

      // Check required
      if (!isUpdate && !column.nullable && value === undefined) {
        throw new Error(`Field ${column.name} is required`);
      }

      // Skip undefined values in updates
      if (isUpdate && value === undefined) {
        continue;
      }

      // Validate type
      if (value !== null && value !== undefined) {
        this.validateColumnType(column, value);
      }

      // Apply validation rules
      if (column.validation) {
        for (const rule of column.validation) {
          this.validateRule(column.name, value, rule);
        }
      }
    }

    // Check constraints
    if (table.schema.checkConstraints) {
      for (const constraint of table.schema.checkConstraints) {
        if (!this.evaluateExpression(constraint.expression, data)) {
          throw new Error(constraint.message || `Constraint ${constraint.name} failed`);
        }
      }
    }
  }

  /**
   * Validate column type
   */
  validateColumnType(column: Column, value: any): void {
    switch (column.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        if (typeof value !== 'string') {
          throw new Error(`Field ${column.name} must be a string`);
        }
        break;

      case 'number':
      case 'currency':
      case 'percent':
      case 'rating':
        if (typeof value !== 'number') {
          throw new Error(`Field ${column.name} must be a number`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Field ${column.name} must be a boolean`);
        }
        break;

      case 'date':
      case 'datetime':
      case 'time':
        if (!(value instanceof Date) && !Date.parse(value)) {
          throw new Error(`Field ${column.name} must be a valid date`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Field ${column.name} must be an array`);
        }
        break;

      case 'json':
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
        } catch {
          throw new Error(`Field ${column.name} must be valid JSON`);
        }
        break;
    }
  }

  /**
   * Validate a single rule
   */
  validateRule(field: string, value: any, rule: ValidationRule): void {
    switch (rule.type) {
      case 'required':
        if (!value) {
          throw new Error(rule.message || `${field} is required`);
        }
        break;

      case 'min':
        if (value < rule.constraint) {
          throw new Error(rule.message || `${field} must be at least ${rule.constraint}`);
        }
        break;

      case 'max':
        if (value > rule.constraint) {
          throw new Error(rule.message || `${field} must be at most ${rule.constraint}`);
        }
        break;

      case 'minLength':
        if (value.length < rule.constraint) {
          throw new Error(rule.message || `${field} must be at least ${rule.constraint} characters`);
        }
        break;

      case 'maxLength':
        if (value.length > rule.constraint) {
          throw new Error(rule.message || `${field} must be at most ${rule.constraint} characters`);
        }
        break;

      case 'pattern':
        if (!new RegExp(rule.constraint).test(value)) {
          throw new Error(rule.message || `${field} format is invalid`);
        }
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error(rule.message || `${field} must be a valid email`);
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          throw new Error(rule.message || `${field} must be a valid URL`);
        }
        break;
    }
  }

  /**
   * Apply default values to data
   */
  applyDefaults(table: Table, data: any): any {
    const result = { ...data };

    for (const column of table.schema.columns) {
      if (result[column.name] === undefined && column.defaultValue !== undefined) {
        result[column.name] = typeof column.defaultValue === 'function'
          ? column.defaultValue()
          : column.defaultValue;
      }

      // Handle auto-number
      if (column.type === 'autonumber' && !result[column.name]) {
        result[column.name] = this.getNextAutoNumber(table.id, column.id);
      }
    }

    return result;
  }

  /**
   * Get next auto number value
   */
  private getNextAutoNumber(tableId: string, columnId: string): number {
    const key = `${tableId}:${columnId}`;
    const current = this.autoNumberCache.get(key)?.data || 0;
    const next = current + 1;
    this.autoNumberCache.set(key, { data: next, timestamp: Date.now() });
    return next;
  }

  /**
   * Evaluate expression (simple implementation)
   */
  private evaluateExpression(_expression: string, _data: any): boolean {
    // Simple expression evaluation
    // In production, use a safe expression evaluator
    try {
      return true;
    } catch {
      return false;
    }
  }
}
