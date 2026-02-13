/**
 * QueryOptimizer - Query optimization and cost estimation
 */

import type { ParsedQuery, CostEstimate } from './types';

export interface OptimizationResult {
  optimizedPlan: string;
  suggestions: string[];
}

export class QueryOptimizer {
  optimize(parsed: ParsedQuery): OptimizationResult {
    const suggestions: string[] = [];

    // Check for missing indexes
    if (parsed.conditions.length > 0) {
      const indexableFields = parsed.conditions
        .filter(c => ['=', 'IN'].includes(c.operator.toUpperCase()))
        .map(c => c.field);

      if (indexableFields.length > 0) {
        suggestions.push(`Consider indexing: ${indexableFields.join(', ')}`);
      }
    }

    // Check for SELECT *
    if (parsed.columns.includes('*')) {
      suggestions.push('Specify columns explicitly instead of SELECT *');
    }

    // Check for missing LIMIT
    if (!parsed.limit && parsed.type === 'select') {
      suggestions.push('Add LIMIT clause to prevent large result sets');
    }

    // Check for expensive operations
    if (parsed.joins.length > 3) {
      suggestions.push('Consider reducing number of JOINs or using CTEs');
    }

    // Check GROUP BY without aggregate
    if (parsed.groupBy.length > 0 && parsed.columns.length === parsed.groupBy.length) {
      suggestions.push('GROUP BY without aggregation - consider DISTINCT instead');
    }

    return {
      optimizedPlan: this.generateExecutionPlan(parsed),
      suggestions
    };
  }

  estimateCost(parsed: ParsedQuery): CostEstimate {
    // Base cost factors
    let bytesToScan = 0;
    let complexityScore = 0;
    const recommendations: string[] = [];

    // Estimate bytes based on tables
    const bytesPerTable: Record<string, number> = {
      security_events: 50_000_000_000,
      process_events: 30_000_000_000,
      network_flows: 100_000_000_000,
      authentication_events: 10_000_000_000,
      file_events: 20_000_000_000,
      user_activity_events: 15_000_000_000
    };

    for (const table of parsed.tables) {
      bytesToScan += bytesPerTable[table] || 1_000_000_000;
    }

    // Reduce estimate based on conditions
    if (parsed.conditions.length > 0) {
      const hasTimeFilter = parsed.conditions.some(
        c => c.field.includes('timestamp') || c.field.includes('time')
      );
      if (hasTimeFilter) {
        bytesToScan = Math.floor(bytesToScan * 0.1);
      } else {
        bytesToScan = Math.floor(bytesToScan * 0.5);
      }
    }

    // Add complexity for joins
    complexityScore += parsed.joins.length * 20;

    // Add complexity for aggregations
    if (parsed.groupBy.length > 0) {
      complexityScore += 15;
    }

    // Add complexity for sorting large results
    if (parsed.orderBy.length > 0 && !parsed.limit) {
      complexityScore += 25;
      recommendations.push('Add LIMIT clause to reduce sort overhead');
    }

    // Add complexity for subqueries
    const subqueryCount = (parsed.columns.join(' ').match(/SELECT/gi) || []).length;
    complexityScore += subqueryCount * 30;

    // Calculate estimates
    const estimatedTimeMs = Math.floor(
      (bytesToScan / 1_000_000_000) * 100 + complexityScore * 50
    );
    const estimatedCost = (bytesToScan / 1_000_000_000_000) * 5;

    let complexity: CostEstimate['complexity'];
    if (complexityScore < 20) complexity = 'low';
    else if (complexityScore < 50) complexity = 'medium';
    else if (complexityScore < 100) complexity = 'high';
    else complexity = 'very_high';

    // Generate recommendations
    if (!parsed.limit) {
      recommendations.push('Consider adding LIMIT clause');
    }

    if (parsed.columns.includes('*')) {
      recommendations.push('Select only needed columns instead of *');
    }

    if (parsed.joins.length > 2) {
      recommendations.push('Consider breaking query into multiple steps with CTEs');
    }

    return {
      bytesToScan,
      estimatedTimeMs,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      complexity,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private generateExecutionPlan(parsed: ParsedQuery): string {
    const steps: string[] = [];

    steps.push(`1. Scan tables: ${parsed.tables.join(', ')}`);

    if (parsed.conditions.length > 0) {
      steps.push(`2. Apply filters: ${parsed.conditions.length} conditions`);
    }

    if (parsed.joins.length > 0) {
      steps.push(
        `3. Execute joins: ${parsed.joins.map(j => `${j.type} JOIN ${j.table}`).join(', ')}`
      );
    }

    if (parsed.groupBy.length > 0) {
      steps.push(`4. Group by: ${parsed.groupBy.join(', ')}`);
    }

    if (parsed.orderBy.length > 0) {
      steps.push(
        `5. Sort by: ${parsed.orderBy.map(o => `${o.field} ${o.direction}`).join(', ')}`
      );
    }

    if (parsed.limit) {
      steps.push(`6. Limit results: ${parsed.limit}`);
    }

    return steps.join('\n');
  }
}
