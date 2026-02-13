/**
 * Hunt Query Types - Type definitions for threat hunting queries
 *
 * @module hunt/types
 */

/**
 * Query category enumeration
 */
export type QueryCategory =
  | 'persistence'
  | 'credential-access'
  | 'lateral-movement'
  | 'data-exfiltration'
  | 'defense-evasion'

/**
 * Query implementations across different platforms
 */
export interface QueryImplementations {
  /** Splunk SPL query */
  splunk: string
  /** Elasticsearch DSL query */
  elasticsearch: string
  /** Azure KQL query */
  kql: string
  /** Generic SQL query */
  sql: string
}

/**
 * Represents a hunt query in multiple formats
 */
export interface HuntQuery {
  /** Unique query identifier */
  id: string
  /** Query name */
  name: string
  /** Detailed description */
  description: string
  /** Category of the query */
  category: QueryCategory
  /** MITRE ATT&CK tactics */
  mitreTactics: string[]
  /** MITRE ATT&CK techniques */
  mitreTechniques: string[]
  /** Required data sources */
  dataSources: string[]
  /** Query implementations across platforms */
  queries: QueryImplementations
  /** Expected results when threat is detected */
  expectedResults: string
  /** Guidance on false positives */
  falsePositiveGuidance: string
  /** Effectiveness rating 1-10 */
  effectiveness: number
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low'
  /** Author/contributor */
  author: string
  /** Last updated date */
  lastUpdated: string
}

/**
 * Hunt query search results
 */
export interface HuntQueryResult {
  queries: HuntQuery[]
  total: number
  category?: QueryCategory
  filters?: Record<string, unknown>
}

/**
 * Filter options for querying hunt queries
 */
export interface HuntQueryFilters {
  category?: QueryCategory
  severity?: string
  minEffectiveness?: number
  dataSources?: string[]
}
