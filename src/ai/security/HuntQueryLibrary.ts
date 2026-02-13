/**
 * Hunt Query Library - Comprehensive Threat Hunting Query Collection
 *
 * This module provides a library of 50+ security hunt queries across multiple
 * categories and threat tactics. Each query includes MITRE ATT&CK mappings,
 * multi-platform support (Splunk, Elasticsearch, KQL, SQL), and guidance
 * on false positive management.
 *
 * @module HuntQueryLibrary
 * @version 2.0.0
 */

import {
  type HuntQuery,
  type HuntQueryResult,
  type HuntQueryFilters,
  type QueryCategory,
  getPersistenceQueries,
  getCredentialQueries,
  getLateralMovementQueries,
  getExfiltrationQueries,
  getDefenseEvasionQueries
} from './hunt'

// Re-export types for backwards compatibility
export type { HuntQuery, HuntQueryResult, QueryCategory } from './hunt'
export type { QueryImplementations } from './hunt'

/**
 * Hunt Query Library class - manages security hunt queries
 */
export class HuntQueryLibrary {
  /** Internal query storage */
  private queries: Map<string, HuntQuery> = new Map()
  /** Query cache by category */
  private categoryCache: Map<QueryCategory, HuntQuery[]> = new Map()

  constructor() {
    this.initializeQueries()
  }

  /**
   * Initialize all hunt queries from category modules
   */
  private initializeQueries(): void {
    // Load all query categories
    const allQueries = [
      ...getPersistenceQueries(),
      ...getCredentialQueries(),
      ...getLateralMovementQueries(),
      ...getExfiltrationQueries(),
      ...getDefenseEvasionQueries()
    ]

    // Add each query to the library
    for (const query of allQueries) {
      this.addQuery(query)
    }
  }

  /**
   * Add a query to the library
   */
  private addQuery(query: HuntQuery): void {
    this.queries.set(query.id, query)

    // Update category cache
    if (!this.categoryCache.has(query.category)) {
      this.categoryCache.set(query.category, [])
    }
    this.categoryCache.get(query.category)!.push(query)
  }

  /**
   * Get all queries
   */
  getAllQueries(): HuntQuery[] {
    return Array.from(this.queries.values())
  }

  /**
   * Get queries by category
   */
  getQueriesByCategory(category: QueryCategory): HuntQuery[] {
    return this.categoryCache.get(category) || []
  }

  /**
   * Search queries by keyword
   */
  searchQueries(keyword: string): HuntQueryResult {
    const searchTerm = keyword.toLowerCase()
    const results = Array.from(this.queries.values()).filter(
      q =>
        q.name.toLowerCase().includes(searchTerm) ||
        q.description.toLowerCase().includes(searchTerm) ||
        q.mitreTechniques.some(t => t.toLowerCase().includes(searchTerm))
    )

    return {
      queries: results,
      total: results.length
    }
  }

  /**
   * Filter queries by multiple criteria
   */
  filterQueries(filters: HuntQueryFilters): HuntQueryResult {
    let results = Array.from(this.queries.values())

    if (filters.category) {
      results = results.filter(q => q.category === filters.category)
    }

    if (filters.severity) {
      results = results.filter(q => q.severity === filters.severity)
    }

    if (filters.minEffectiveness !== undefined) {
      results = results.filter(q => q.effectiveness >= filters.minEffectiveness!)
    }

    if (filters.dataSources && filters.dataSources.length > 0) {
      results = results.filter(q =>
        filters.dataSources!.some(ds => q.dataSources.includes(ds))
      )
    }

    return {
      queries: results,
      total: results.length,
      category: filters.category,
      filters
    }
  }

  /**
   * Get query by ID
   */
  getQueryById(id: string): HuntQuery | undefined {
    return this.queries.get(id)
  }

  /**
   * Get queries by MITRE technique
   */
  getQueriesByMitreTechnique(technique: string): HuntQuery[] {
    return Array.from(this.queries.values()).filter(q =>
      q.mitreTechniques.includes(technique)
    )
  }

  /**
   * Get queries by severity level
   */
  getQueriesBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): HuntQuery[] {
    return Array.from(this.queries.values()).filter(q => q.severity === severity)
  }

  /**
   * Get queries by data source
   */
  getQueriesByDataSource(dataSource: string): HuntQuery[] {
    return Array.from(this.queries.values()).filter(q =>
      q.dataSources.includes(dataSource)
    )
  }

  /**
   * Get all available categories
   */
  getCategories(): QueryCategory[] {
    return Array.from(this.categoryCache.keys())
  }

  /**
   * Get statistics about the query library
   */
  getStatistics(): {
    totalQueries: number
    byCategory: Record<string, number>
    bySeverity: Record<string, number>
  } {
    const byCategory: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}

    for (const [category, queries] of this.categoryCache) {
      byCategory[category] = queries.length
    }

    for (const query of this.queries.values()) {
      bySeverity[query.severity] = (bySeverity[query.severity] || 0) + 1
    }

    return {
      totalQueries: this.queries.size,
      byCategory,
      bySeverity
    }
  }

  /**
   * Get all unique data sources
   */
  getAllDataSources(): string[] {
    const dataSources = new Set<string>()
    for (const query of this.queries.values()) {
      for (const ds of query.dataSources) {
        dataSources.add(ds)
      }
    }
    return Array.from(dataSources).sort()
  }

  /**
   * Get all unique MITRE techniques
   */
  getAllMitreTechniques(): string[] {
    const techniques = new Set<string>()
    for (const query of this.queries.values()) {
      for (const t of query.mitreTechniques) {
        techniques.add(t)
      }
    }
    return Array.from(techniques).sort()
  }
}
