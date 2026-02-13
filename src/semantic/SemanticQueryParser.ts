/**
 * Semantic Query Parser - Natural language to structured query
 *
 * Parses natural language queries into structured semantic queries
 * that can be executed against the semantic layer.
 *
 * @module semantic/SemanticQueryParser
 */

import {
  SemanticQuery,
  ParsedQuery,
  QueryIntent,
  QueryFilter,
  FilterOperator,
  TimeRange
} from './types/semantic';

/**
 * SemanticQueryParser converts natural language to semantic queries
 */
export class SemanticQueryParser {
  private patterns: QueryPattern[] = [];
  private entityMappings: Map<string, string> = new Map();
  private metricMappings: Map<string, string> = new Map();
  private dimensionMappings: Map<string, string> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeMappings();
  }

  // ============================================================================
  // QUERY PARSING
  // ============================================================================

  /**
   * Parse natural language query
   */
  parse(naturalLanguageQuery: string): SemanticQuery {
    const normalized = this.normalizeQuery(naturalLanguageQuery);

    // Detect intent
    const intent = this.detectIntent(normalized);

    // Extract entities
    const entities = this.extractEntities(normalized);

    // Extract metrics
    const metrics = this.extractMetrics(normalized);

    // Extract dimensions
    const dimensions = this.extractDimensions(normalized);

    // Extract filters
    const filters = this.extractFilters(normalized);

    // Extract time range
    const timeRange = this.extractTimeRange(normalized);

    // Extract limit
    const limit = this.extractLimit(normalized);

    // Calculate confidence
    const confidence = this.calculateConfidence(normalized, entities, metrics, dimensions);

    return {
      id: this.generateId(),
      naturalLanguageQuery,
      parsedQuery: {
        intent,
        entities,
        metrics,
        dimensions,
        filters,
        timeRange,
        limit
      },
      confidence,
      createdBy: 'system',
      createdAt: new Date()
    };
  }

  /**
   * Normalize query text
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Detect query intent
   */
  private detectIntent(query: string): QueryIntent {
    // Aggregate intent
    if (/\b(total|sum|average|avg|count|max|min)\b/.test(query)) {
      return QueryIntent.AGGREGATE;
    }

    // Compare intent
    if (/\b(compare|versus|vs|difference|between)\b/.test(query)) {
      return QueryIntent.COMPARE;
    }

    // Trend intent
    if (/\b(trend|over time|growth|change|historical)\b/.test(query)) {
      return QueryIntent.TREND;
    }

    // Rank intent
    if (/\b(top|bottom|best|worst|highest|lowest|rank)\b/.test(query)) {
      return QueryIntent.RANK;
    }

    // Search intent
    if (/\b(find|search|lookup|where|which)\b/.test(query)) {
      return QueryIntent.SEARCH;
    }

    // Default to retrieve
    return QueryIntent.RETRIEVE;
  }

  /**
   * Extract entities from query
   */
  private extractEntities(query: string): string[] {
    const entities: string[] = [];

    // Match against known entities
    for (const [pattern, entity] of this.entityMappings.entries()) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(query)) {
        entities.push(entity);
      }
    }

    return [...new Set(entities)];
  }

  /**
   * Extract metrics from query
   */
  private extractMetrics(query: string): string[] {
    const metrics: string[] = [];

    // Match against known metrics
    for (const [pattern, metric] of this.metricMappings.entries()) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(query)) {
        metrics.push(metric);
      }
    }

    // Detect implicit metrics
    if (/\btotal\b/.test(query)) {
      metrics.push('total');
    }

    if (/\baverage|avg\b/.test(query)) {
      metrics.push('average');
    }

    if (/\bcount\b/.test(query)) {
      metrics.push('count');
    }

    return [...new Set(metrics)];
  }

  /**
   * Extract dimensions from query
   */
  private extractDimensions(query: string): string[] {
    const dimensions: string[] = [];

    // Match against known dimensions
    for (const [pattern, dimension] of this.dimensionMappings.entries()) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(query)) {
        dimensions.push(dimension);
      }
    }

    // Detect "by X" patterns
    const byPattern = /\bby\s+(\w+)/gi;
    let match;
    while ((match = byPattern.exec(query)) !== null) {
      const dim = this.dimensionMappings.get(match[1]) || match[1];
      dimensions.push(dim);
    }

    return [...new Set(dimensions)];
  }

  /**
   * Extract filters from query
   */
  private extractFilters(query: string): QueryFilter[] {
    const filters: QueryFilter[] = [];

    // Extract comparison filters
    filters.push(...this.extractComparisonFilters(query));

    // Extract equality filters
    filters.push(...this.extractEqualityFilters(query));

    // Extract IN filters
    filters.push(...this.extractInFilters(query));

    // Extract range filters
    filters.push(...this.extractRangeFilters(query));

    return filters;
  }

  /**
   * Extract comparison filters (>, <, >=, <=)
   */
  private extractComparisonFilters(query: string): QueryFilter[] {
    const filters: QueryFilter[] = [];

    // Pattern: field > value, field greater than value
    const patterns = [
      { regex: /(\w+)\s*>\s*(\d+\.?\d*)/, operator: FilterOperator.GREATER_THAN },
      { regex: /(\w+)\s*<\s*(\d+\.?\d*)/, operator: FilterOperator.LESS_THAN },
      { regex: /(\w+)\s*>=\s*(\d+\.?\d*)/, operator: FilterOperator.GREATER_THAN_OR_EQUAL },
      { regex: /(\w+)\s*<=\s*(\d+\.?\d*)/, operator: FilterOperator.LESS_THAN_OR_EQUAL },
      { regex: /(\w+)\s+greater than\s+(\d+\.?\d*)/, operator: FilterOperator.GREATER_THAN },
      { regex: /(\w+)\s+less than\s+(\d+\.?\d*)/, operator: FilterOperator.LESS_THAN }
    ];

    for (const { regex, operator } of patterns) {
      const match = query.match(regex);
      if (match) {
        filters.push({
          field: match[1],
          operator,
          value: parseFloat(match[2])
        });
      }
    }

    return filters;
  }

  /**
   * Extract equality filters (=, !=)
   */
  private extractEqualityFilters(query: string): QueryFilter[] {
    const filters: QueryFilter[] = [];

    // Pattern: field = "value", field is "value"
    const patterns = [
      { regex: /(\w+)\s*=\s*"([^"]+)"/, operator: FilterOperator.EQUALS },
      { regex: /(\w+)\s*=\s*'([^']+)'/, operator: FilterOperator.EQUALS },
      { regex: /(\w+)\s+is\s+"([^"]+)"/, operator: FilterOperator.EQUALS },
      { regex: /(\w+)\s+is\s+'([^']+)'/, operator: FilterOperator.EQUALS },
      { regex: /(\w+)\s*!=\s*"([^"]+)"/, operator: FilterOperator.NOT_EQUALS },
      { regex: /(\w+)\s+is not\s+"([^"]+)"/, operator: FilterOperator.NOT_EQUALS }
    ];

    for (const { regex, operator } of patterns) {
      const match = query.match(regex);
      if (match) {
        filters.push({
          field: match[1],
          operator,
          value: match[2]
        });
      }
    }

    return filters;
  }

  /**
   * Extract IN filters
   */
  private extractInFilters(query: string): QueryFilter[] {
    const filters: QueryFilter[] = [];

    // Pattern: field in (value1, value2, ...)
    const inPattern = /(\w+)\s+in\s+\(([^)]+)\)/i;
    const match = query.match(inPattern);

    if (match) {
      const values = match[2].split(',').map(v =>
        v.trim().replace(/["']/g, '')
      );

      filters.push({
        field: match[1],
        operator: FilterOperator.IN,
        value: values
      });
    }

    return filters;
  }

  /**
   * Extract range filters (between)
   */
  private extractRangeFilters(query: string): QueryFilter[] {
    const filters: QueryFilter[] = [];

    // Pattern: field between value1 and value2
    const betweenPattern = /(\w+)\s+between\s+(\d+\.?\d*)\s+and\s+(\d+\.?\d*)/i;
    const match = query.match(betweenPattern);

    if (match) {
      filters.push({
        field: match[1],
        operator: FilterOperator.GREATER_THAN_OR_EQUAL,
        value: parseFloat(match[2])
      });

      filters.push({
        field: match[1],
        operator: FilterOperator.LESS_THAN_OR_EQUAL,
        value: parseFloat(match[3])
      });
    }

    return filters;
  }

  /**
   * Extract time range from query
   */
  private extractTimeRange(query: string): TimeRange | undefined {
    const now = new Date();

    // Last X days/weeks/months
    const lastPattern = /\blast\s+(\d+)\s+(day|week|month|year)s?/i;
    const lastMatch = query.match(lastPattern);

    if (lastMatch) {
      const count = parseInt(lastMatch[1]);
      const unit = lastMatch[2].toLowerCase();

      const start = new Date(now);
      switch (unit) {
        case 'day':
          start.setDate(start.getDate() - count);
          break;
        case 'week':
          start.setDate(start.getDate() - count * 7);
          break;
        case 'month':
          start.setMonth(start.getMonth() - count);
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - count);
          break;
      }

      return {
        start,
        end: now,
        granularity: this.inferGranularity(unit)
      };
    }

    // This/last X
    const thisPattern = /\b(this|last)\s+(day|week|month|quarter|year)/i;
    const thisMatch = query.match(thisPattern);

    if (thisMatch) {
      const period = thisMatch[1].toLowerCase();
      const unit = thisMatch[2].toLowerCase();

      return this.getPeriodTimeRange(period, unit);
    }

    // Yesterday, today, etc.
    if (/\byesterday\b/i.test(query)) {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      return { start, end, granularity: 'hour' };
    }

    if (/\btoday\b/i.test(query)) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      return { start, end: now, granularity: 'hour' };
    }

    return undefined;
  }

  /**
   * Get time range for period
   */
  private getPeriodTimeRange(period: string, unit: string): TimeRange {
    const now = new Date();
    const start = new Date(now);

    if (period === 'last') {
      switch (unit) {
        case 'day':
          start.setDate(start.getDate() - 1);
          break;
        case 'week':
          start.setDate(start.getDate() - 7);
          break;
        case 'month':
          start.setMonth(start.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(start.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - 1);
          break;
      }
    } else {
      // This period
      switch (unit) {
        case 'week':
          start.setDate(start.getDate() - start.getDay());
          break;
        case 'month':
          start.setDate(1);
          break;
        case 'quarter':
          start.setMonth(Math.floor(start.getMonth() / 3) * 3);
          start.setDate(1);
          break;
        case 'year':
          start.setMonth(0);
          start.setDate(1);
          break;
      }
    }

    start.setHours(0, 0, 0, 0);

    return {
      start,
      end: now,
      granularity: this.inferGranularity(unit)
    };
  }

  /**
   * Infer granularity from time unit
   */
  private inferGranularity(unit: string): 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' {
    switch (unit.toLowerCase()) {
      case 'day':
        return 'hour';
      case 'week':
        return 'day';
      case 'month':
        return 'day';
      case 'quarter':
        return 'week';
      case 'year':
        return 'month';
      default:
        return 'day';
    }
  }

  /**
   * Extract limit from query
   */
  private extractLimit(query: string): number | undefined {
    // Top/bottom N
    const topPattern = /\b(top|bottom|first|last)\s+(\d+)/i;
    const match = query.match(topPattern);

    if (match) {
      return parseInt(match[2]);
    }

    // Limit N
    const limitPattern = /\blimit\s+(\d+)/i;
    const limitMatch = query.match(limitPattern);

    if (limitMatch) {
      return parseInt(limitMatch[1]);
    }

    return undefined;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    query: string,
    entities: string[],
    metrics: string[],
    dimensions: string[]
  ): number {
    let score = 0;

    // Base score for having entities
    if (entities.length > 0) score += 0.3;

    // Score for having metrics
    if (metrics.length > 0) score += 0.3;

    // Score for having dimensions
    if (dimensions.length > 0) score += 0.2;

    // Score for clear intent keywords
    const intentKeywords = [
      'total', 'sum', 'average', 'count', 'show', 'get', 'find',
      'top', 'bottom', 'trend', 'compare'
    ];

    for (const keyword of intentKeywords) {
      if (query.includes(keyword)) {
        score += 0.05;
      }
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sq_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize query patterns
   */
  private initializePatterns(): void {
    this.patterns = [
      {
        pattern: /show me (total|sum) (\w+) by (\w+)/i,
        handler: this.handleAggregationPattern
      },
      {
        pattern: /what are the top (\d+) (\w+) by (\w+)/i,
        handler: this.handleTopNPattern
      },
      {
        pattern: /compare (\w+) between (\w+) and (\w+)/i,
        handler: this.handleComparisonPattern
      }
    ];
  }

  /**
   * Initialize entity/metric/dimension mappings
   */
  private initializeMappings(): void {
    // Entity mappings (synonyms to canonical names)
    this.entityMappings.set('users', 'User');
    this.entityMappings.set('customers', 'User');
    this.entityMappings.set('orders', 'Order');
    this.entityMappings.set('purchases', 'Order');
    this.entityMappings.set('products', 'Product');
    this.entityMappings.set('items', 'Product');

    // Metric mappings
    this.metricMappings.set('sales', 'TotalSales');
    this.metricMappings.set('revenue', 'TotalRevenue');
    this.metricMappings.set('profit', 'TotalProfit');
    this.metricMappings.set('orders', 'OrderCount');

    // Dimension mappings
    this.dimensionMappings.set('region', 'Geography');
    this.dimensionMappings.set('location', 'Geography');
    this.dimensionMappings.set('country', 'Geography');
    this.dimensionMappings.set('date', 'Time');
    this.dimensionMappings.set('time', 'Time');
    this.dimensionMappings.set('month', 'Time');
    this.dimensionMappings.set('category', 'Category');
    this.dimensionMappings.set('type', 'Category');
  }

  // ============================================================================
  // PATTERN HANDLERS
  // ============================================================================

  /**
   * Handle aggregation pattern
   */
  private handleAggregationPattern(match: RegExpMatchArray): Partial<ParsedQuery> {
    return {
      intent: QueryIntent.AGGREGATE,
      metrics: [match[2]],
      dimensions: [match[3]]
    };
  }

  /**
   * Handle top N pattern
   */
  private handleTopNPattern(match: RegExpMatchArray): Partial<ParsedQuery> {
    return {
      intent: QueryIntent.RANK,
      entities: [match[2]],
      dimensions: [match[3]],
      limit: parseInt(match[1])
    };
  }

  /**
   * Handle comparison pattern
   */
  private handleComparisonPattern(match: RegExpMatchArray): Partial<ParsedQuery> {
    return {
      intent: QueryIntent.COMPARE,
      metrics: [match[1]],
      filters: [
        {
          field: 'value',
          operator: FilterOperator.IN,
          value: [match[2], match[3]]
        }
      ]
    };
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface QueryPattern {
  pattern: RegExp;
  handler: (match: RegExpMatchArray) => Partial<ParsedQuery>;
}

// Singleton instance
let parserInstance: SemanticQueryParser | null = null;

export function getSemanticQueryParser(): SemanticQueryParser {
  if (!parserInstance) {
    parserInstance = new SemanticQueryParser();
  }
  return parserInstance;
}
