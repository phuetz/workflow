/**
 * Query Builder - Query execution engine
 */

import type {
  Row,
  Query,
  Condition,
  SimpleCondition,
  Sort,
  Aggregation
} from './types';

export class QueryEngine {
  /**
   * Execute a query on rows
   */
  async execute(rows: Map<string, Row>, query: Query): Promise<Row[]> {
    let results = Array.from(rows.values());

    // Apply WHERE clause
    if (query.where) {
      results = results.filter(row => this.evaluateCondition(row.data, query.where!));
    }

    // Apply JOINs (placeholder for future implementation)
    if (query.joins) {
      // Implement joins
    }

    // Apply GROUP BY (placeholder for future implementation)
    if (query.groupBy) {
      // Implement grouping
    }

    // Apply ORDER BY
    if (query.orderBy) {
      results = this.sort(results, query.orderBy);
    }

    // Apply LIMIT and OFFSET
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Aggregate rows
   */
  aggregate(rows: Row[], aggregations: Aggregation[]): any {
    const result: any = {};

    for (const agg of aggregations) {
      const values = rows
        .map(r => r.data[agg.field])
        .filter(v => v !== null && v !== undefined);
      const key = agg.alias || `${agg.function}(${agg.field})`;

      switch (agg.function) {
        case 'count':
          result[key] = values.length;
          break;
        case 'sum':
          result[key] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result[key] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          result[key] = Math.min(...values);
          break;
        case 'max':
          result[key] = Math.max(...values);
          break;
        case 'stddev':
          result[key] = this.calculateStdDev(values);
          break;
        case 'variance':
          result[key] = this.calculateVariance(values);
          break;
      }
    }

    return result;
  }

  /**
   * Evaluate a condition against data
   */
  private evaluateCondition(data: any, condition: Condition): boolean {
    if ('field' in condition) {
      // Simple condition
      const simple = condition as unknown as SimpleCondition;
      return this.evaluateSimpleCondition(data, simple);
    }

    // Compound condition
    const results = condition.conditions.map(c =>
      this.evaluateCondition(data, c as any)
    );

    return condition.operator === 'and'
      ? results.every(r => r)
      : results.some(r => r);
  }

  /**
   * Evaluate a simple condition
   */
  private evaluateSimpleCondition(data: any, condition: SimpleCondition): boolean {
    const value = data[condition.field];
    const expected = condition.value;

    switch (condition.operator) {
      case '=':
        return value === expected;
      case '!=':
        return value !== expected;
      case '>':
        return value > expected;
      case '>=':
        return value >= expected;
      case '<':
        return value < expected;
      case '<=':
        return value <= expected;
      case 'like':
        return String(value).includes(String(expected));
      case 'not like':
        return !String(value).includes(String(expected));
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'not in':
        return Array.isArray(expected) && !expected.includes(value);
      case 'between':
        return Array.isArray(expected) && value >= expected[0] && value <= expected[1];
      case 'is null':
        return value === null || value === undefined;
      case 'is not null':
        return value !== null && value !== undefined;
      default:
        return false;
    }
  }

  /**
   * Sort rows by multiple criteria
   */
  private sort(rows: Row[], orderBy: Sort[]): Row[] {
    return rows.sort((a, b) => {
      for (const sort of orderBy) {
        const aVal = a.data[sort.field];
        const bVal = b.data[sort.field];

        if (aVal === null || aVal === undefined) {
          return sort.nullsFirst ? -1 : 1;
        }
        if (bVal === null || bVal === undefined) {
          return sort.nullsFirst ? 1 : -1;
        }

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const variance = this.calculateVariance(values);
    return Math.sqrt(variance);
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}

/**
 * Query builder helper for creating queries programmatically
 */
export class QueryBuilder {
  private query: Query;

  constructor(from: string) {
    this.query = { from };
  }

  select(...columns: string[]): QueryBuilder {
    this.query.select = columns;
    return this;
  }

  where(condition: Condition): QueryBuilder {
    this.query.where = condition;
    return this;
  }

  whereSimple(field: string, operator: SimpleCondition['operator'], value: any): QueryBuilder {
    this.query.where = {
      operator: 'and',
      conditions: [{ field, operator, value }]
    };
    return this;
  }

  andWhere(field: string, operator: SimpleCondition['operator'], value: any): QueryBuilder {
    if (!this.query.where) {
      return this.whereSimple(field, operator, value);
    }

    this.query.where.conditions.push({ field, operator, value });
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc', nullsFirst?: boolean): QueryBuilder {
    if (!this.query.orderBy) {
      this.query.orderBy = [];
    }
    this.query.orderBy.push({ field, direction, nullsFirst });
    return this;
  }

  groupBy(...columns: string[]): QueryBuilder {
    this.query.groupBy = columns;
    return this;
  }

  limit(count: number): QueryBuilder {
    this.query.limit = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.query.offset = count;
    return this;
  }

  build(): Query {
    return { ...this.query };
  }
}
