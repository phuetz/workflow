/**
 * Universal SIEM Query Builder
 * Supports Splunk SPL, Elasticsearch DSL, IBM QRadar AQL, and LogRhythm LQL
 * Provides fluent API for building platform-agnostic security queries
 */

/**
 * Supported SIEM platforms
 */
export enum SIEMPlatform {
  SPLUNK = 'splunk',
  ELASTICSEARCH = 'elasticsearch',
  QRADAR = 'qradar',
  LOGRHYTHM = 'logrhythm',
}

/**
 * Comparison operators
 */
export enum ComparisonOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_EQUAL = '>=',
  LESS_EQUAL = '<=',
  LIKE = 'LIKE',
  REGEX = 'REGEX',
  IN = 'IN',
  BETWEEN = 'BETWEEN',
  EXISTS = 'EXISTS',
  NOT_EXISTS = 'NOT_EXISTS',
}

/**
 * Logical operators
 */
export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

/**
 * Aggregation functions
 */
export enum AggregationFunction {
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  PERCENTILE = 'percentile',
  DISTINCT = 'distinct',
  RATE = 'rate',
}

/**
 * Sorting order
 */
export enum SortOrder {
  ASCENDING = 'ASC',
  DESCENDING = 'DESC',
}

/**
 * Condition clause
 */
export interface Condition {
  field: string
  operator: ComparisonOperator
  value: unknown
  logicalOperator?: LogicalOperator
}

/**
 * Aggregation clause
 */
export interface AggregationClause {
  function: AggregationFunction
  field: string
  alias?: string
  percentile?: number
}

/**
 * Grouping clause
 */
export interface GroupingClause {
  fields: string[]
  limit?: number
}

/**
 * Sorting clause
 */
export interface SortingClause {
  field: string
  order: SortOrder
}

/**
 * Time range specification
 */
export interface TimeRange {
  from: Date | string
  to: Date | string
  relative?: string
}

/**
 * Query configuration
 */
export interface QueryConfig {
  maxResults?: number
  timeout?: number
  indexHints?: string[]
  costOptimization?: boolean
}

/**
 * Saved search definition
 */
export interface SavedSearch {
  id: string
  name: string
  description: string
  query: string
  platform: SIEMPlatform
  schedule?: string
  alertThreshold?: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Query result
 */
export interface QueryResult {
  platform: SIEMPlatform
  query: string
  estimatedCost?: number
  executionTime?: number
  resultCount?: number
}

/**
 * Universal SIEM Query Builder
 * Provides fluent API for building queries across multiple SIEM platforms
 */
export class SIEMQueryBuilder {
  private conditions: Condition[] = []
  private selectedFields: string[] = []
  private aggregations: AggregationClause[] = []
  private grouping: GroupingClause | null = null
  private sorting: SortingClause[] = []
  private timeRangeValue: TimeRange | null = null
  private config: QueryConfig = {}
  private platform: SIEMPlatform = SIEMPlatform.SPLUNK
  private lastLogicalOperator: LogicalOperator = LogicalOperator.AND

  /**
   * Create a new SIEM query builder
   */
  constructor(platform: SIEMPlatform = SIEMPlatform.SPLUNK) {
    this.platform = platform
  }

  /**
   * Set the target SIEM platform
   */
  setPlatform(platform: SIEMPlatform): this {
    this.platform = platform
    return this
  }

  /**
   * Add a WHERE condition
   */
  where(field: string, operator: ComparisonOperator, value: unknown): this {
    this.conditions.push({
      field,
      operator,
      value,
      logicalOperator: LogicalOperator.AND,
    })
    this.lastLogicalOperator = LogicalOperator.AND
    return this
  }

  /**
   * Add an AND condition
   */
  and(field: string, operator: ComparisonOperator, value: unknown): this {
    this.conditions.push({
      field,
      operator,
      value,
      logicalOperator: LogicalOperator.AND,
    })
    this.lastLogicalOperator = LogicalOperator.AND
    return this
  }

  /**
   * Add an OR condition
   */
  or(field: string, operator: ComparisonOperator, value: unknown): this {
    this.conditions.push({
      field,
      operator,
      value,
      logicalOperator: LogicalOperator.OR,
    })
    this.lastLogicalOperator = LogicalOperator.OR
    return this
  }

  /**
   * Add a NOT condition
   */
  not(field: string, operator: ComparisonOperator, value: unknown): this {
    this.conditions.push({
      field,
      operator,
      value,
      logicalOperator: LogicalOperator.NOT,
    })
    this.lastLogicalOperator = LogicalOperator.NOT
    return this
  }

  /**
   * Add an IN condition
   */
  in(field: string, values: unknown[]): this {
    this.conditions.push({
      field,
      operator: ComparisonOperator.IN,
      value: values,
      logicalOperator: LogicalOperator.AND,
    })
    return this
  }

  /**
   * Add a BETWEEN condition
   */
  between(field: string, min: unknown, max: unknown): this {
    this.conditions.push({
      field,
      operator: ComparisonOperator.BETWEEN,
      value: [min, max],
      logicalOperator: LogicalOperator.AND,
    })
    return this
  }

  /**
   * Add a time range filter
   */
  timeRange(from: Date | string, to: Date | string): this {
    this.timeRangeValue = { from, to }
    return this
  }

  /**
   * Add a relative time range
   */
  relativeTime(relative: string): this {
    this.timeRangeValue = { from: relative, to: 'now', relative }
    return this
  }

  /**
   * Select specific fields
   */
  select(...fields: string[]): this {
    this.selectedFields = fields
    return this
  }

  /**
   * Add aggregation
   */
  aggregate(
    func: AggregationFunction,
    field: string,
    alias?: string,
    percentile?: number
  ): this {
    this.aggregations.push({
      function: func,
      field,
      alias,
      percentile,
    })
    return this
  }

  /**
   * Add count aggregation
   */
  count(alias?: string): this {
    return this.aggregate(AggregationFunction.COUNT, '*', alias)
  }

  /**
   * Add sum aggregation
   */
  sum(field: string, alias?: string): this {
    return this.aggregate(AggregationFunction.SUM, field, alias)
  }

  /**
   * Add average aggregation
   */
  avg(field: string, alias?: string): this {
    return this.aggregate(AggregationFunction.AVG, field, alias)
  }

  /**
   * Add min aggregation
   */
  min(field: string, alias?: string): this {
    return this.aggregate(AggregationFunction.MIN, field, alias)
  }

  /**
   * Add max aggregation
   */
  max(field: string, alias?: string): this {
    return this.aggregate(AggregationFunction.MAX, field, alias)
  }

  /**
   * Add percentile aggregation
   */
  percentile(
    field: string,
    percentile: number,
    alias?: string
  ): this {
    return this.aggregate(
      AggregationFunction.PERCENTILE,
      field,
      alias,
      percentile
    )
  }

  /**
   * Add distinct aggregation
   */
  distinct(field: string, alias?: string): this {
    return this.aggregate(AggregationFunction.DISTINCT, field, alias)
  }

  /**
   * Group results by fields
   */
  groupBy(...fields: string[]): this {
    this.grouping = { fields, limit: 1000 }
    return this
  }

  /**
   * Set group limit
   */
  groupLimit(limit: number): this {
    if (this.grouping) {
      this.grouping.limit = limit
    }
    return this
  }

  /**
   * Add a HAVING clause (for aggregated conditions)
   */
  having(field: string, operator: ComparisonOperator, value: unknown): this {
    // HAVING clauses are used with GROUP BY to filter aggregated results
    // For simplicity, we'll add this as a condition that will be applied post-aggregation
    this.conditions.push({
      field,
      operator,
      value,
      logicalOperator: LogicalOperator.AND,
    })
    return this
  }

  /**
   * Add sorting
   */
  orderBy(field: string, order: SortOrder = SortOrder.DESCENDING): this {
    this.sorting.push({ field, order })
    return this
  }

  /**
   * Set maximum results
   */
  limit(maxResults: number): this {
    this.config.maxResults = maxResults
    return this
  }

  /**
   * Set query timeout (in seconds)
   */
  timeout(seconds: number): this {
    this.config.timeout = seconds
    return this
  }

  /**
   * Add index hints for optimization
   */
  indexHints(...hints: string[]): this {
    this.config.indexHints = hints
    return this
  }

  /**
   * Enable cost optimization
   */
  optimize(): this {
    this.config.costOptimization = true
    return this
  }

  /**
   * Build query for the configured platform
   */
  build(): QueryResult {
    switch (this.platform) {
      case SIEMPlatform.SPLUNK:
        return this.buildSplunk()
      case SIEMPlatform.ELASTICSEARCH:
        return this.buildElasticsearch()
      case SIEMPlatform.QRADAR:
        return this.buildQRadar()
      case SIEMPlatform.LOGRHYTHM:
        return this.buildLogRhythm()
      default:
        throw new Error(`Unsupported platform: ${this.platform}`)
    }
  }

  /**
   * Build Splunk SPL query
   */
  private buildSplunk(): QueryResult {
    let query = ''

    // Add index hints
    if (this.config.indexHints && this.config.indexHints.length > 0) {
      query += `index=${this.config.indexHints.join(' OR index=')} `
    }

    // Add conditions
    if (this.conditions.length > 0) {
      const conditionParts = this.conditions.map((cond) => {
        const operator =
          cond.logicalOperator === LogicalOperator.NOT ? 'NOT ' : ''
        return this.formatSplunkCondition(operator, cond)
      })
      query += conditionParts.join(' ')
    }

    // Add time range
    if (this.timeRangeValue) {
      query += this.formatSplunkTimeRange()
    }

    // Add pipe commands
    if (
      this.selectedFields.length > 0 ||
      this.aggregations.length > 0 ||
      this.grouping ||
      this.sorting.length > 0
    ) {
      query += ' | '

      if (this.aggregations.length > 0 || this.grouping) {
        query += this.formatSplunkStats()
      } else if (this.selectedFields.length > 0) {
        query += `table ${this.selectedFields.join(', ')}`
      }

      if (this.sorting.length > 0) {
        query += ` | sort ${this.sorting.map((s) => `${s.order === SortOrder.ASCENDING ? '+' : '-'}${s.field}`).join(', ')}`
      }
    }

    if (this.config.maxResults) {
      query += ` | head ${this.config.maxResults}`
    }

    return {
      platform: SIEMPlatform.SPLUNK,
      query: query.trim(),
    }
  }

  /**
   * Format Splunk condition
   */
  private formatSplunkCondition(operator: string, cond: Condition): string {
    const field = cond.field
    const op = cond.operator
    let value = cond.value

    if (op === ComparisonOperator.IN) {
      const values = (value as unknown[])
        .map((v) => `"${this.escapeSplunkValue(v)}"`)
        .join(' OR ')
      return `${operator}(${field}=${values})`
    }

    if (op === ComparisonOperator.BETWEEN) {
      const [min, max] = value as [unknown, unknown]
      return `${operator}${field}>=${min} AND ${field}<=${max}`
    }

    value = this.escapeSplunkValue(value)

    if (op === ComparisonOperator.REGEX) {
      return `${operator}${field}=~"${value}"`
    }

    if (op === ComparisonOperator.LIKE) {
      return `${operator}${field}=*${value}*`
    }

    if (op === ComparisonOperator.EXISTS) {
      return `${operator}${field}=*`
    }

    if (op === ComparisonOperator.NOT_EXISTS) {
      return `${operator}NOT ${field}=*`
    }

    return `${operator}${field}${op}"${value}"`
  }

  /**
   * Format Splunk time range
   */
  private formatSplunkTimeRange(): string {
    if (!this.timeRangeValue) return ''

    if (this.timeRangeValue.relative) {
      return ` earliest=${this.timeRangeValue.relative} latest=now`
    }

    const fromStr = this.formatDateForPlatform(this.timeRangeValue.from)
    const toStr = this.formatDateForPlatform(this.timeRangeValue.to)
    return ` earliest="${fromStr}" latest="${toStr}"`
  }

  /**
   * Format Splunk stats
   */
  private formatSplunkStats(): string {
    let stats = 'stats '

    if (this.aggregations.length > 0) {
      const aggs = this.aggregations.map((agg) => {
        const alias = agg.alias ? ` as ${agg.alias}` : ''
        if (agg.function === AggregationFunction.COUNT) {
          return `count${alias}`
        }
        if (agg.function === AggregationFunction.DISTINCT) {
          return `dc(${agg.field})${alias}`
        }
        if (agg.function === AggregationFunction.PERCENTILE) {
          return `perc${agg.percentile}(${agg.field})${alias}`
        }
        return `${agg.function}(${agg.field})${alias}`
      })
      stats += aggs.join(', ')
    }

    if (this.grouping) {
      stats += ` by ${this.grouping.fields.join(', ')}`
    }

    return stats
  }

  /**
   * Build Elasticsearch DSL query
   */
  private buildElasticsearch(): QueryResult {
    const dsl: Record<string, unknown> = {
      query: {
        bool: {
          must: [],
          should: [],
          must_not: [],
        },
      },
      size: this.config.maxResults || 10000,
    }

    const mustClauses: unknown[] = []
    const shouldClauses: unknown[] = []
    const mustNotClauses: unknown[] = []

    // Add conditions
    for (const cond of this.conditions) {
      const clause = this.formatElasticsearchCondition(cond)

      if (cond.logicalOperator === LogicalOperator.NOT) {
        mustNotClauses.push(clause)
      } else if (cond.logicalOperator === LogicalOperator.OR) {
        shouldClauses.push(clause)
      } else {
        mustClauses.push(clause)
      }
    }

    // Add time range filter
    if (this.timeRangeValue) {
      mustClauses.push(this.formatElasticsearchTimeRange())
    }

    // Build bool query
    const bool = (dsl.query as Record<string, unknown>).bool as Record<
      string,
      unknown
    >

    if (mustClauses.length > 0) {
      bool.must = mustClauses
    }

    if (shouldClauses.length > 0) {
      bool.should = shouldClauses
      bool.minimum_should_match = 1
    }

    if (mustNotClauses.length > 0) {
      bool.must_not = mustNotClauses
    }

    // Add aggregations
    if (this.aggregations.length > 0 || this.grouping) {
      dsl.aggs = this.formatElasticsearchAggregations()
    }

    // Add sorting
    if (this.sorting.length > 0) {
      dsl.sort = this.sorting.map((s) => ({
        [s.field]: {
          order: s.order === SortOrder.ASCENDING ? 'asc' : 'desc',
        },
      }))
    }

    // Add field selection
    if (this.selectedFields.length > 0) {
      dsl._source = this.selectedFields
    }

    return {
      platform: SIEMPlatform.ELASTICSEARCH,
      query: JSON.stringify(dsl, null, 2),
    }
  }

  /**
   * Format Elasticsearch condition
   */
  private formatElasticsearchCondition(
    cond: Condition
  ): Record<string, unknown> {
    const field = cond.field
    const op = cond.operator
    const value = cond.value

    if (op === ComparisonOperator.EQUALS) {
      return { term: { [field]: value } }
    }

    if (op === ComparisonOperator.NOT_EQUALS) {
      return { bool: { must_not: { term: { [field]: value } } } }
    }

    if (op === ComparisonOperator.LIKE || op === ComparisonOperator.REGEX) {
      return { wildcard: { [field]: `*${value}*` } }
    }

    if (op === ComparisonOperator.IN) {
      return { terms: { [field]: value as unknown[] } }
    }

    if (
      op === ComparisonOperator.GREATER_THAN ||
      op === ComparisonOperator.GREATER_EQUAL ||
      op === ComparisonOperator.LESS_THAN ||
      op === ComparisonOperator.LESS_EQUAL
    ) {
      return this.formatElasticsearchRange(field, op, value)
    }

    if (op === ComparisonOperator.EXISTS) {
      return { exists: { field } }
    }

    if (op === ComparisonOperator.NOT_EXISTS) {
      return { bool: { must_not: { exists: { field } } } }
    }

    return { match: { [field]: value } }
  }

  /**
   * Format Elasticsearch range condition
   */
  private formatElasticsearchRange(
    field: string,
    op: ComparisonOperator,
    value: unknown
  ): Record<string, unknown> {
    const range: Record<string, unknown> = {}

    if (op === ComparisonOperator.GREATER_THAN) {
      range.gt = value
    } else if (op === ComparisonOperator.GREATER_EQUAL) {
      range.gte = value
    } else if (op === ComparisonOperator.LESS_THAN) {
      range.lt = value
    } else if (op === ComparisonOperator.LESS_EQUAL) {
      range.lte = value
    }

    return { range: { [field]: range } }
  }

  /**
   * Format Elasticsearch time range
   */
  private formatElasticsearchTimeRange(): Record<string, unknown> {
    if (!this.timeRangeValue) return {}

    const range: Record<string, unknown> = {
      'timestamp': {
        gte: this.timeRangeValue.from,
        lte: this.timeRangeValue.to,
      },
    }

    return { range }
  }

  /**
   * Format Elasticsearch aggregations
   */
  private formatElasticsearchAggregations(): Record<string, unknown> {
    const aggs: Record<string, unknown> = {}

    if (this.grouping && this.grouping.fields.length > 0) {
      const currentAgg: Record<string, unknown> = aggs
      const field = this.grouping.fields[0]

      currentAgg['group_by'] = {
        terms: { field, size: this.grouping.limit || 1000 },
      }

      if (this.aggregations.length > 0) {
        const metrics: Record<string, unknown> = {}
        for (const agg of this.aggregations) {
          const key = agg.alias || agg.function
          metrics[key] = this.formatElasticsearchAggregation(agg)
        }
        ;(currentAgg['group_by'] as Record<string, unknown>)['aggs'] = metrics
      }
    } else if (this.aggregations.length > 0) {
      for (const agg of this.aggregations) {
        const key = agg.alias || agg.function
        aggs[key] = this.formatElasticsearchAggregation(agg)
      }
    }

    return aggs
  }

  /**
   * Format single Elasticsearch aggregation
   */
  private formatElasticsearchAggregation(
    agg: AggregationClause
  ): Record<string, unknown> {
    switch (agg.function) {
      case AggregationFunction.COUNT:
        return { value_count: { field: agg.field } }
      case AggregationFunction.SUM:
        return { sum: { field: agg.field } }
      case AggregationFunction.AVG:
        return { avg: { field: agg.field } }
      case AggregationFunction.MIN:
        return { min: { field: agg.field } }
      case AggregationFunction.MAX:
        return { max: { field: agg.field } }
      case AggregationFunction.PERCENTILE:
        return {
          percentiles: {
            field: agg.field,
            percents: [agg.percentile || 95],
          },
        }
      case AggregationFunction.DISTINCT:
        return { cardinality: { field: agg.field } }
      default:
        return {}
    }
  }

  /**
   * Build IBM QRadar AQL query
   */
  private buildQRadar(): QueryResult {
    let query = 'SELECT '

    // Add selected fields or default to all
    if (this.selectedFields.length > 0) {
      query += this.selectedFields.join(', ')
    } else {
      query += 'sourceip, destinationip, username, eventtype, severity'
    }

    query += ' FROM events WHERE 1=1'

    // Add conditions
    for (const cond of this.conditions) {
      query += ' ' + this.formatQRadarCondition(cond)
    }

    // Add time range
    if (this.timeRangeValue) {
      query += this.formatQRadarTimeRange()
    }

    // Add grouping
    if (this.grouping) {
      query += ` GROUP BY ${this.grouping.fields.join(', ')}`
    }

    // Add sorting
    if (this.sorting.length > 0) {
      query += ' ORDER BY '
      query += this.sorting
        .map(
          (s) =>
            `${s.field} ${s.order === SortOrder.ASCENDING ? 'ASC' : 'DESC'}`
        )
        .join(', ')
    }

    // Add limit
    if (this.config.maxResults) {
      query += ` LIMIT ${this.config.maxResults}`
    }

    return {
      platform: SIEMPlatform.QRADAR,
      query: query.trim(),
    }
  }

  /**
   * Format QRadar condition
   */
  private formatQRadarCondition(cond: Condition): string {
    const field = cond.field
    const op = cond.operator
    const value = cond.value
    const logOp = cond.logicalOperator || LogicalOperator.AND

    let clause = ''

    if (op === ComparisonOperator.IN) {
      const values = (value as unknown[])
        .map((v) => `'${this.escapeQRadarValue(v)}'`)
        .join(', ')
      clause = `${field} IN (${values})`
    } else if (op === ComparisonOperator.BETWEEN) {
      const [min, max] = value as [unknown, unknown]
      clause = `${field} BETWEEN ${min} AND ${max}`
    } else if (op === ComparisonOperator.LIKE) {
      clause = `${field} ILIKE '%${this.escapeQRadarValue(value)}%'`
    } else if (op === ComparisonOperator.REGEX) {
      clause = `${field} ~ '${this.escapeQRadarValue(value)}'`
    } else if (op === ComparisonOperator.EXISTS) {
      clause = `${field} IS NOT NULL`
    } else if (op === ComparisonOperator.NOT_EXISTS) {
      clause = `${field} IS NULL`
    } else {
      const escapedValue = this.escapeQRadarValue(value)
      clause = `${field} ${op} '${escapedValue}'`
    }

    if (logOp === LogicalOperator.NOT) {
      clause = `NOT (${clause})`
    }

    return `${logOp} ${clause}`
  }

  /**
   * Format QRadar time range
   */
  private formatQRadarTimeRange(): string {
    if (!this.timeRangeValue) return ''

    const from = this.formatDateForPlatform(this.timeRangeValue.from)
    const to = this.formatDateForPlatform(this.timeRangeValue.to)

    return ` START '${from}' STOP '${to}'`
  }

  /**
   * Build LogRhythm LQL query
   */
  private buildLogRhythm(): QueryResult {
    let query = ''

    // Add conditions
    const conditionParts: string[] = []
    for (const cond of this.conditions) {
      conditionParts.push(this.formatLogRhythmCondition(cond))
    }

    if (conditionParts.length > 0) {
      query += conditionParts.join(' AND ')
    }

    // Add time range
    if (this.timeRangeValue) {
      if (query) query += ' AND '
      query += this.formatLogRhythmTimeRange()
    }

    // Add sorting
    if (this.sorting.length > 0) {
      query += ' ORDER BY '
      query += this.sorting
        .map(
          (s) =>
            `${s.field} ${s.order === SortOrder.ASCENDING ? 'ASC' : 'DESC'}`
        )
        .join(', ')
    }

    // Add limit
    if (this.config.maxResults) {
      query += ` LIMIT ${this.config.maxResults}`
    }

    return {
      platform: SIEMPlatform.LOGRHYTHM,
      query: query.trim(),
    }
  }

  /**
   * Format LogRhythm condition
   */
  private formatLogRhythmCondition(cond: Condition): string {
    const field = cond.field
    const op = cond.operator
    const value = cond.value

    if (op === ComparisonOperator.IN) {
      const values = (value as unknown[])
        .map((v) => `'${this.escapeLogRhythmValue(v)}'`)
        .join(', ')
      return `${field} IN (${values})`
    }

    if (op === ComparisonOperator.BETWEEN) {
      const [min, max] = value as [unknown, unknown]
      return `${field} BETWEEN ${min} AND ${max}`
    }

    if (op === ComparisonOperator.LIKE) {
      return `${field} LIKE '%${this.escapeLogRhythmValue(value)}%'`
    }

    if (op === ComparisonOperator.REGEX) {
      return `${field} REGEX '${this.escapeLogRhythmValue(value)}'`
    }

    if (op === ComparisonOperator.EXISTS) {
      return `${field} IS NOT NULL`
    }

    if (op === ComparisonOperator.NOT_EXISTS) {
      return `${field} IS NULL`
    }

    const escapedValue = this.escapeLogRhythmValue(value)
    return `${field} ${op} '${escapedValue}'`
  }

  /**
   * Format LogRhythm time range
   */
  private formatLogRhythmTimeRange(): string {
    if (!this.timeRangeValue) return ''

    if (this.timeRangeValue.relative) {
      return `EventTime > '${this.timeRangeValue.relative}'`
    }

    const from = this.formatDateForPlatform(this.timeRangeValue.from)
    const to = this.formatDateForPlatform(this.timeRangeValue.to)

    return `EventTime BETWEEN '${from}' AND '${to}'`
  }

  /**
   * Escape value for Splunk
   */
  private escapeSplunkValue(value: unknown): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    return str.replace(/"/g, '\\"')
  }

  /**
   * Escape value for QRadar
   */
  private escapeQRadarValue(value: unknown): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    return str.replace(/'/g, "''")
  }

  /**
   * Escape value for LogRhythm
   */
  private escapeLogRhythmValue(value: unknown): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    return str.replace(/'/g, "''")
  }

  /**
   * Format date for the configured platform
   */
  private formatDateForPlatform(date: Date | string): string {
    if (typeof date === 'string') return date

    switch (this.platform) {
      case SIEMPlatform.SPLUNK:
        return date.toISOString().replace('Z', '')
      case SIEMPlatform.ELASTICSEARCH:
        return date.toISOString()
      case SIEMPlatform.QRADAR:
        return date.toISOString()
      case SIEMPlatform.LOGRHYTHM:
        return date.toISOString()
      default:
        return date.toISOString()
    }
  }

  /**
   * Get query cost estimation (higher number = more expensive)
   */
  getQueryCostEstimate(): number {
    let cost = 1

    // Conditions add complexity
    cost += this.conditions.length * 0.5

    // Aggregations are expensive
    cost += this.aggregations.length * 2

    // Grouping is expensive
    if (this.grouping) cost += 3

    // Optimization reduces cost
    if (this.config.costOptimization) cost *= 0.7

    return Math.round(cost * 100) / 100
  }

  /**
   * Validate query syntax
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for injection attempts
    for (const cond of this.conditions) {
      const fieldStr = String(cond.field)
      if (fieldStr.includes(';') || fieldStr.includes('--')) {
        errors.push(`Potential injection in field: ${fieldStr}`)
      }
    }

    // Check for invalid operators
    if (this.grouping && this.aggregations.length === 0) {
      errors.push('Grouping without aggregation may return too many results')
    }

    // Check time range
    if (this.timeRangeValue) {
      const from = new Date(this.timeRangeValue.from)
      const to = new Date(this.timeRangeValue.to)
      if (from > to) {
        errors.push('Time range start is after end')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Clear all conditions
   */
  clear(): this {
    this.conditions = []
    this.selectedFields = []
    this.aggregations = []
    this.grouping = null
    this.sorting = []
    this.timeRangeValue = null
    return this
  }

  /**
   * Clone the builder
   */
  clone(): SIEMQueryBuilder {
    const clone = new SIEMQueryBuilder(this.platform)
    clone.conditions = [...this.conditions]
    clone.selectedFields = [...this.selectedFields]
    clone.aggregations = [...this.aggregations]
    clone.grouping = this.grouping ? { ...this.grouping } : null
    clone.sorting = [...this.sorting]
    clone.timeRangeValue = this.timeRangeValue ? { ...this.timeRangeValue } : null
    clone.config = { ...this.config }
    return clone
  }
}

/**
 * Saved searches repository
 */
export class SavedSearchRepository {
  private searches: Map<string, SavedSearch> = new Map()

  /**
   * Save a query
   */
  save(
    name: string,
    description: string,
    query: string,
    platform: SIEMPlatform
  ): SavedSearch {
    const id = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const search: SavedSearch = {
      id,
      name,
      description,
      query,
      platform,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.searches.set(id, search)
    return search
  }

  /**
   * Get saved search by ID
   */
  get(id: string): SavedSearch | undefined {
    return this.searches.get(id)
  }

  /**
   * List all saved searches
   */
  list(): SavedSearch[] {
    return Array.from(this.searches.values())
  }

  /**
   * List searches by platform
   */
  listByPlatform(platform: SIEMPlatform): SavedSearch[] {
    return Array.from(this.searches.values()).filter(
      (s) => s.platform === platform
    )
  }

  /**
   * Delete saved search
   */
  delete(id: string): boolean {
    return this.searches.delete(id)
  }

  /**
   * Update saved search
   */
  update(id: string, updates: Partial<SavedSearch>): SavedSearch | undefined {
    const search = this.searches.get(id)
    if (!search) return undefined

    const updated = {
      ...search,
      ...updates,
      updatedAt: new Date(),
    }
    this.searches.set(id, updated)
    return updated
  }
}

/**
 * Pre-built query templates for common security scenarios
 */
export const QUERY_TEMPLATES = {
  /**
   * Failed authentication attempts
   */
  failedAuth: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where('event_type', ComparisonOperator.EQUALS, 'authentication')
      .and('result', ComparisonOperator.EQUALS, 'failure')
      .count('failed_count')
      .groupBy('username', 'source_ip')
      .orderBy('failed_count', SortOrder.DESCENDING)
      .limit(100)
  },

  /**
   * Brute force attack detection
   */
  bruteForce: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where('event_type', ComparisonOperator.EQUALS, 'authentication')
      .and('result', ComparisonOperator.EQUALS, 'failure')
      .relativeTime('last_1_hour')
      .count('failed_attempts')
      .groupBy('username', 'source_ip')
      .having('failed_attempts', ComparisonOperator.GREATER_THAN, 5)
  },

  /**
   * Suspicious network activity
   */
  suspiciousNetwork: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where('protocol', ComparisonOperator.IN, ['SMTP', 'SSH', 'RDP'])
      .and('destination_port', ComparisonOperator.GREATER_THAN, 49152)
      .count('event_count')
      .groupBy('source_ip', 'destination_ip')
      .orderBy('event_count', SortOrder.DESCENDING)
  },

  /**
   * Data exfiltration patterns
   */
  dataExfiltration: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where('bytes_transferred', ComparisonOperator.GREATER_THAN, 1073741824) // 1GB
      .and(
        'event_type',
        ComparisonOperator.IN,
        ['file_transfer', 'data_copy', 'network_traffic']
      )
      .sum('bytes_transferred', 'total_bytes')
      .groupBy('user', 'destination')
  },

  /**
   * Privilege escalation attempts
   */
  privilegeEscalation: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where('event_type', ComparisonOperator.EQUALS, 'privilege_change')
      .and('privilege_level_before', ComparisonOperator.LESS_THAN, 3)
      .and('privilege_level_after', ComparisonOperator.GREATER_EQUAL, 3)
      .timeRange(new Date(Date.now() - 86400000), new Date())
  },

  /**
   * Malware indicators
   */
  malwareIndicators: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where(
        'threat_category',
        ComparisonOperator.IN,
        ['malware', 'trojan', 'ransomware']
      )
      .and('confidence_score', ComparisonOperator.GREATER_EQUAL, 80)
      .count('malware_count')
      .groupBy('host', 'threat_category')
  },

  /**
   * Database access anomalies
   */
  databaseAnomalies: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where('data_source', ComparisonOperator.EQUALS, 'database')
      .and('query_type', ComparisonOperator.REGEX, '(DROP|DELETE|TRUNCATE)')
      .relativeTime('last_24_hours')
      .select('timestamp', 'user', 'database', 'query', 'source_ip')
  },

  /**
   * SSL/TLS certificate issues
   */
  sslCertificateIssues: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where('event_type', ComparisonOperator.EQUALS, 'ssl_certificate')
      .and('status', ComparisonOperator.IN, ['expired', 'revoked', 'invalid'])
      .timeRange(new Date(Date.now() - 604800000), new Date()) // Last 7 days
  },

  /**
   * DNS exfiltration detection
   */
  dnsExfiltration: (): SIEMQueryBuilder => {
    return new SIEMQueryBuilder()
      .where('protocol', ComparisonOperator.EQUALS, 'DNS')
      .and('query_length', ComparisonOperator.GREATER_THAN, 100)
      .sum('query_length', 'total_query_bytes')
      .groupBy('source_ip', 'domain')
  },
}

/**
 * Create a new SIEM query builder for a specific platform
 */
export function createSIEMQuery(platform: SIEMPlatform): SIEMQueryBuilder {
  return new SIEMQueryBuilder(platform)
}

/**
 * Convert between SIEM platform query formats
 */
export function convertQuery(
  query: string,
  fromPlatform: SIEMPlatform,
  toPlatform: SIEMPlatform
): QueryResult {
  // This is a simplified converter - in production, would need actual parsing
  const builder = new SIEMQueryBuilder(toPlatform)
  // Implementation would parse the source query and rebuild for target platform
  return builder.build()
}
