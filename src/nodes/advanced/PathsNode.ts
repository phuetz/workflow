/**
 * Paths Node
 * Multi-branch conditional routing (like Zapier Paths)
 * Allows creating multiple conditional branches from a single node
 */

import { EventEmitter } from 'events';

export interface PathConfig {
  id: string;
  name: string;
  conditions: PathCondition[];
  continueIfFalse?: boolean;
  executeAll?: boolean; // Execute all matching paths vs only first match
}

export interface PathCondition {
  field: string;
  operator: PathOperator;
  value: unknown;
  valueType?: 'string' | 'number' | 'boolean' | 'date' | 'null' | 'regex';
  caseSensitive?: boolean;
  logicalOperator?: 'AND' | 'OR';
}

export type PathOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'isNull'
  | 'isNotNull'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'matches'
  | 'notMatches'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isTrue'
  | 'isFalse'
  | 'before'
  | 'after'
  | 'exists'
  | 'notExists';

export interface PathsNodeConfig {
  paths: PathConfig[];
  defaultPath?: string;
  stopOnFirstMatch?: boolean;
  evaluationOrder?: 'sequential' | 'parallel';
}

export interface PathEvaluationResult {
  pathId: string;
  pathName: string;
  matched: boolean;
  conditions: ConditionResult[];
  data: Record<string, unknown>;
}

export interface ConditionResult {
  field: string;
  operator: PathOperator;
  expectedValue: unknown;
  actualValue: unknown;
  matched: boolean;
}

export interface PathsResult {
  success: boolean;
  matchedPaths: PathEvaluationResult[];
  unmatchedPaths: PathEvaluationResult[];
  defaultPathUsed: boolean;
  totalPaths: number;
  evaluationTime: number;
}

export class PathsNode extends EventEmitter {
  private config: PathsNodeConfig;

  constructor(config: PathsNodeConfig) {
    super();
    this.config = {
      stopOnFirstMatch: true,
      evaluationOrder: 'sequential',
      ...config
    };
  }

  /**
   * Evaluate paths against input data
   */
  evaluate(data: Record<string, unknown>): PathsResult {
    const startTime = Date.now();
    const matchedPaths: PathEvaluationResult[] = [];
    const unmatchedPaths: PathEvaluationResult[] = [];

    this.emit('paths:evaluate-start', { pathCount: this.config.paths.length });

    for (const path of this.config.paths) {
      const result = this.evaluatePath(path, data);

      if (result.matched) {
        matchedPaths.push(result);
        this.emit('path:matched', { pathId: path.id, pathName: path.name });

        if (this.config.stopOnFirstMatch) {
          break;
        }
      } else {
        unmatchedPaths.push(result);
      }
    }

    const defaultPathUsed = matchedPaths.length === 0 && !!this.config.defaultPath;

    if (defaultPathUsed) {
      // Add default path as matched
      matchedPaths.push({
        pathId: this.config.defaultPath!,
        pathName: 'Default',
        matched: true,
        conditions: [],
        data
      });
      this.emit('path:default-used');
    }

    const result: PathsResult = {
      success: true,
      matchedPaths,
      unmatchedPaths,
      defaultPathUsed,
      totalPaths: this.config.paths.length,
      evaluationTime: Date.now() - startTime
    };

    this.emit('paths:evaluate-complete', result);
    return result;
  }

  /**
   * Evaluate a single path
   */
  evaluatePath(path: PathConfig, data: Record<string, unknown>): PathEvaluationResult {
    const conditionResults: ConditionResult[] = [];

    for (const condition of path.conditions) {
      const result = this.evaluateCondition(condition, data);
      conditionResults.push(result);
    }

    // Determine if path matches based on logical operators
    let matched: boolean;
    if (path.conditions.length === 0) {
      matched = true; // No conditions means always match
    } else {
      matched = this.combineConditionResults(conditionResults, path.conditions);
    }

    return {
      pathId: path.id,
      pathName: path.name,
      matched,
      conditions: conditionResults,
      data
    };
  }

  /**
   * Add a new path
   */
  addPath(path: PathConfig): void {
    this.config.paths.push(path);
    this.emit('path:added', { pathId: path.id });
  }

  /**
   * Remove a path
   */
  removePath(pathId: string): boolean {
    const index = this.config.paths.findIndex(p => p.id === pathId);
    if (index === -1) return false;

    this.config.paths.splice(index, 1);
    this.emit('path:removed', { pathId });
    return true;
  }

  /**
   * Update a path
   */
  updatePath(pathId: string, updates: Partial<PathConfig>): boolean {
    const path = this.config.paths.find(p => p.id === pathId);
    if (!path) return false;

    Object.assign(path, updates);
    this.emit('path:updated', { pathId });
    return true;
  }

  /**
   * Reorder paths
   */
  reorderPaths(pathIds: string[]): void {
    const newPaths: PathConfig[] = [];
    for (const id of pathIds) {
      const path = this.config.paths.find(p => p.id === id);
      if (path) newPaths.push(path);
    }
    this.config.paths = newPaths;
    this.emit('paths:reordered');
  }

  /**
   * Get all paths
   */
  getPaths(): PathConfig[] {
    return [...this.config.paths];
  }

  private evaluateCondition(condition: PathCondition, data: Record<string, unknown>): ConditionResult {
    const actualValue = this.getNestedValue(data, condition.field);
    const expectedValue = this.castValue(condition.value, condition.valueType);
    const matched = this.compareValues(actualValue, expectedValue, condition);

    return {
      field: condition.field,
      operator: condition.operator,
      expectedValue: condition.value,
      actualValue,
      matched
    };
  }

  private compareValues(actual: unknown, expected: unknown, condition: PathCondition): boolean {
    const { operator, caseSensitive = false } = condition;

    // Handle null/undefined checks first
    if (operator === 'isNull') return actual === null || actual === undefined;
    if (operator === 'isNotNull') return actual !== null && actual !== undefined;
    if (operator === 'exists') return actual !== undefined;
    if (operator === 'notExists') return actual === undefined;
    if (operator === 'isEmpty') return this.isEmpty(actual);
    if (operator === 'isNotEmpty') return !this.isEmpty(actual);
    if (operator === 'isTrue') return actual === true || actual === 'true' || actual === 1;
    if (operator === 'isFalse') return actual === false || actual === 'false' || actual === 0;

    // String operations
    const actualStr = caseSensitive ? String(actual ?? '') : String(actual ?? '').toLowerCase();
    const expectedStr = caseSensitive ? String(expected ?? '') : String(expected ?? '').toLowerCase();

    switch (operator) {
      case 'equals':
        return actualStr === expectedStr;
      case 'notEquals':
        return actualStr !== expectedStr;
      case 'contains':
        return actualStr.includes(expectedStr);
      case 'notContains':
        return !actualStr.includes(expectedStr);
      case 'startsWith':
        return actualStr.startsWith(expectedStr);
      case 'endsWith':
        return actualStr.endsWith(expectedStr);
      case 'matches':
        try {
          const regex = new RegExp(String(expected), caseSensitive ? '' : 'i');
          return regex.test(String(actual));
        } catch {
          return false;
        }
      case 'notMatches':
        try {
          const regex = new RegExp(String(expected), caseSensitive ? '' : 'i');
          return !regex.test(String(actual));
        } catch {
          return false;
        }
    }

    // Numeric operations
    const actualNum = Number(actual);
    const expectedNum = Number(expected);

    switch (operator) {
      case 'greaterThan':
        return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum > expectedNum;
      case 'lessThan':
        return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum < expectedNum;
      case 'greaterThanOrEqual':
        return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum >= expectedNum;
      case 'lessThanOrEqual':
        return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum <= expectedNum;
    }

    // Array operations
    if (operator === 'in' || operator === 'notIn') {
      const arr = Array.isArray(expected) ? expected : [expected];
      const isIn = arr.some(v => String(v).toLowerCase() === actualStr);
      return operator === 'in' ? isIn : !isIn;
    }

    // Range operation
    if (operator === 'between' && Array.isArray(expected) && expected.length >= 2) {
      const [min, max] = expected.map(Number);
      return !isNaN(actualNum) && actualNum >= min && actualNum <= max;
    }

    // Date operations
    if (operator === 'before' || operator === 'after') {
      const actualDate = new Date(actual as string | number | Date);
      const expectedDate = new Date(expected as string | number | Date);
      if (isNaN(actualDate.getTime()) || isNaN(expectedDate.getTime())) return false;
      return operator === 'before'
        ? actualDate.getTime() < expectedDate.getTime()
        : actualDate.getTime() > expectedDate.getTime();
    }

    return false;
  }

  private combineConditionResults(results: ConditionResult[], conditions: PathCondition[]): boolean {
    if (results.length === 0) return true;
    if (results.length === 1) return results[0].matched;

    // Default to AND logic
    let result = results[0].matched;

    for (let i = 1; i < results.length; i++) {
      const logicalOp = conditions[i]?.logicalOperator || 'AND';
      if (logicalOp === 'AND') {
        result = result && results[i].matched;
      } else {
        result = result || results[i].matched;
      }
    }

    return result;
  }

  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  private castValue(value: unknown, type?: string): unknown {
    if (!type || value === null || value === undefined) return value;

    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === true || value === 'true' || value === 1;
      case 'date':
        return new Date(value as string | number);
      case 'null':
        return null;
      default:
        return value;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}

// Export factory function
export function createPathsNode(config: PathsNodeConfig): PathsNode {
  return new PathsNode(config);
}

// Export default empty config
export function createEmptyPathsConfig(): PathsNodeConfig {
  return {
    paths: [],
    stopOnFirstMatch: true,
    evaluationOrder: 'sequential'
  };
}
