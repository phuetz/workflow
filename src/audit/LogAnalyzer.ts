/**
 * Advanced Log Analysis and Search System
 * Week 7 Phase 2: Audit Logging & Compliance
 *
 * Provides comprehensive search, correlation, and analysis capabilities for audit logs
 * with statistical anomaly detection, pattern recognition, and visualization data generation.
 */

import { EventEmitter } from 'events'
import * as crypto from 'crypto'

/**
 * Core Interfaces
 */

export interface AuditLogEntry {
  id: string
  timestamp: Date
  eventType: string
  userId: string
  ipAddress: string
  action: string
  resource: string
  resourceType: string
  result: 'success' | 'failure'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: Record<string, any>
  correlationId?: string
  sessionId?: string
  userAgent?: string
  workflowId?: string
  executionId?: string
  errorCode?: string
  duration?: number
  metadata?: Record<string, any>
}

export interface LogQuery {
  search?: string
  filters?: {
    eventType?: string[]
    userId?: string[]
    dateRange?: { start: Date; end: Date }
    severity?: string[]
    result?: string[]
    resource?: string[]
    ipAddress?: string[]
    action?: string[]
    workflowId?: string[]
  }
  sort?: { field: string; order: 'asc' | 'desc' }[]
  limit?: number
  offset?: number
  aggregations?: {
    field: string
    type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'histogram'
    bucketSize?: number
  }[]
  facets?: string[]
}

export interface SearchResult {
  total: number
  hits: AuditLogEntry[]
  aggregations?: Map<string, any>
  facets?: Map<string, Map<string, number>>
  executionTime: number
  query: LogQuery
}

export interface CorrelatedEvents {
  rootEvent: AuditLogEntry
  relatedEvents: AuditLogEntry[]
  correlationType: 'session' | 'user' | 'workflow' | 'ip' | 'correlation-id'
  correlationScore: number
  timeline: AuditLogEntry[]
}

export interface DateRange {
  start: Date
  end: Date
}

export interface Timeline {
  userId: string
  events: AuditLogEntry[]
  sessions: UserSession[]
  activityHeatmap: Map<string, number>
}

export interface UserSession {
  sessionId: string
  userId: string
  startTime: Date
  endTime?: Date
  ipAddress: string
  eventCount: number
  actions: string[]
  success: number
  failures: number
}

export interface Anomaly {
  id: string
  timestamp: Date
  eventId: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  score: number
  context: Record<string, any>
}

export interface PatternAnalysis {
  eventType: string
  totalEvents: number
  patterns: {
    sequence: string[]
    frequency: number
    avgDuration: number
    successRate: number
  }[]
  frequencyDistribution: Map<string, number>
  timeDistribution: Map<string, number>
  commonActionSequences: string[][]
}

export interface BehaviorProfile {
  userId: string
  totalEvents: number
  eventFrequency: Map<string, number>
  actionsPerHour: number
  failureRate: number
  commonResources: string[]
  commonActions: string[]
  timeZone?: string
  typicalWorkingHours: { start: number; end: number }
  riskScore: number
  lastActivity: Date
}

export interface TopStat {
  value: string
  count: number
  percentage: number
  trend?: 'up' | 'down' | 'stable'
}

export interface TrendData {
  field: string
  interval: string
  dataPoints: {
    timestamp: Date
    value: number
    count: number
  }[]
  average: number
  trend: 'increasing' | 'decreasing' | 'stable'
  changePercent: number
}

export interface ExportOptions {
  format: 'json' | 'csv'
  includeDetails?: boolean
  compress?: boolean
}

/**
 * Main Log Analyzer Class
 */

export class LogAnalyzer extends EventEmitter {
  private logs: Map<string, AuditLogEntry> = new Map()
  private indexes: Map<string, Map<string, Set<string>>> = new Map()
  private cache: Map<string, { result: any; timestamp: number }> = new Map()
  private cacheTTL: number = 5 * 60 * 1000 // 5 minutes
  private baselineData: Map<string, BehaviorProfile> = new Map()
  private anomalies: Map<string, Anomaly> = new Map()

  constructor() {
    super()
    this.initializeIndexes()
  }

  /**
   * Initialize search indexes for common fields
   */
  private initializeIndexes(): void {
    const indexFields = [
      'eventType',
      'userId',
      'action',
      'resource',
      'severity',
      'result',
      'ipAddress',
      'workflowId'
    ]

    for (const field of indexFields) {
      this.indexes.set(field, new Map())
    }
  }

  /**
   * Add a log entry and update indexes
   */
  addLog(log: AuditLogEntry): void {
    this.logs.set(log.id, log)
    this.invalidateCache()

    // Update indexes
    for (const [field, index] of this.indexes) {
      const value = String(log[field as keyof AuditLogEntry] ?? '')
      if (!index.has(value)) {
        index.set(value, new Set())
      }
      index.get(value)?.add(log.id)
    }

    this.emit('log:added', log)
  }

  /**
   * Add multiple logs in batch
   */
  addLogs(logs: AuditLogEntry[]): void {
    for (const log of logs) {
      this.addLog(log)
    }
  }

  /**
   * Advanced search with complex queries
   */
  async search(query: LogQuery): Promise<SearchResult> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(query)

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result
    }

    let results = Array.from(this.logs.values())

    // Apply search filter
    if (query.search) {
      results = this.performFullTextSearch(results, query.search)
    }

    // Apply field filters
    if (query.filters) {
      results = this.applyFilters(results, query.filters)
    }

    // Apply sorting
    if (query.sort && query.sort.length > 0) {
      results = this.applySorting(results, query.sort)
    }

    // Calculate facets
    const facets = new Map<string, Map<string, number>>()
    if (query.facets) {
      for (const facetField of query.facets) {
        facets.set(facetField, this.calculateFacet(results, facetField))
      }
    }

    // Calculate aggregations
    const aggregations = new Map<string, any>()
    if (query.aggregations) {
      for (const agg of query.aggregations) {
        aggregations.set(
          `${agg.field}_${agg.type}`,
          this.calculateAggregation(results, agg)
        )
      }
    }

    // Apply pagination
    const total = results.length
    const offset = query.offset ?? 0
    const limit = query.limit ?? 100
    const hits = results.slice(offset, offset + limit)

    const searchResult: SearchResult = {
      total,
      hits,
      aggregations: aggregations.size > 0 ? aggregations : undefined,
      facets: facets.size > 0 ? facets : undefined,
      executionTime: Date.now() - startTime,
      query
    }

    // Cache result
    this.cache.set(cacheKey, { result: searchResult, timestamp: Date.now() })

    this.emit('search:completed', searchResult)
    return searchResult
  }

  /**
   * Perform full-text search across all fields
   */
  private performFullTextSearch(logs: AuditLogEntry[], searchTerm: string): AuditLogEntry[] {
    const term = searchTerm.toLowerCase()
    const isRegex = searchTerm.startsWith('/') && searchTerm.endsWith('/')
    const isWildcard = searchTerm.includes('*')

    let matcher: (text: string) => boolean

    if (isRegex) {
      const pattern = new RegExp(searchTerm.slice(1, -1), 'i')
      matcher = (text) => pattern.test(text)
    } else if (isWildcard) {
      const pattern = new RegExp('^' + term.replace(/\*/g, '.*') + '$', 'i')
      matcher = (text) => pattern.test(text)
    } else {
      matcher = (text) => text.toLowerCase().includes(term)
    }

    return logs.filter((log) => {
      const searchableFields = [
        log.eventType,
        log.userId,
        log.action,
        log.resource,
        log.message,
        log.ipAddress,
        JSON.stringify(log.details),
        JSON.stringify(log.metadata)
      ]
      return searchableFields.some((field) => matcher(String(field ?? '')))
    })
  }

  /**
   * Apply field-specific filters
   */
  private applyFilters(logs: AuditLogEntry[], filters: LogQuery['filters']): AuditLogEntry[] {
    return logs.filter((log) => {
      if (
        filters.eventType &&
        !filters.eventType.includes(log.eventType)
      ) {
        return false
      }

      if (filters.userId && !filters.userId.includes(log.userId)) {
        return false
      }

      if (filters.dateRange) {
        if (
          log.timestamp < filters.dateRange.start ||
          log.timestamp > filters.dateRange.end
        ) {
          return false
        }
      }

      if (filters.severity && !filters.severity.includes(log.severity)) {
        return false
      }

      if (filters.result && !filters.result.includes(log.result)) {
        return false
      }

      if (filters.resource && !filters.resource.includes(log.resource)) {
        return false
      }

      if (filters.ipAddress && !filters.ipAddress.includes(log.ipAddress)) {
        return false
      }

      if (filters.action && !filters.action.includes(log.action)) {
        return false
      }

      if (filters.workflowId && !filters.workflowId.includes(log.workflowId ?? '')) {
        return false
      }

      return true
    })
  }

  /**
   * Apply sorting to results
   */
  private applySorting(
    logs: AuditLogEntry[],
    sortOptions: { field: string; order: 'asc' | 'desc' }[]
  ): AuditLogEntry[] {
    const sorted = [...logs]
    sorted.sort((a, b) => {
      for (const { field, order } of sortOptions) {
        const aVal = a[field as keyof AuditLogEntry]
        const bVal = b[field as keyof AuditLogEntry]

        let comparison = 0
        if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime()
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal
        } else {
          comparison = String(aVal).localeCompare(String(bVal))
        }

        if (comparison !== 0) {
          return order === 'asc' ? comparison : -comparison
        }
      }
      return 0
    })
    return sorted
  }

  /**
   * Calculate facet counts for a field
   */
  private calculateFacet(logs: AuditLogEntry[], field: string): Map<string, number> {
    const facet = new Map<string, number>()
    for (const log of logs) {
      const value = String(log[field as keyof AuditLogEntry] ?? '')
      facet.set(value, (facet.get(value) ?? 0) + 1)
    }
    return facet
  }

  /**
   * Calculate aggregations
   */
  private calculateAggregation(
    logs: AuditLogEntry[],
    agg: {
      field: string
      type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'histogram'
      bucketSize?: number
    }
  ): any {
    const values: number[] = []
    const histogram = new Map<string, number>()

    for (const log of logs) {
      const value = log[agg.field as keyof AuditLogEntry]

      if (typeof value === 'number') {
        values.push(value)
      }

      if (agg.type === 'histogram' && agg.bucketSize) {
        const bucket = Math.floor(Number(value) / agg.bucketSize) * agg.bucketSize
        histogram.set(
          `${bucket}-${bucket + agg.bucketSize}`,
          (histogram.get(`${bucket}-${bucket + agg.bucketSize}`) ?? 0) + 1
        )
      }
    }

    switch (agg.type) {
      case 'count':
        return logs.length
      case 'sum':
        return values.reduce((a, b) => a + b, 0)
      case 'avg':
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
      case 'min':
        return Math.min(...values)
      case 'max':
        return Math.max(...values)
      case 'histogram':
        return Object.fromEntries(histogram)
      default:
        return null
    }
  }

  /**
   * Correlate related events
   */
  async correlate(eventId: string): Promise<CorrelatedEvents> {
    const rootEvent = this.logs.get(eventId)
    if (!rootEvent) {
      throw new Error(`Event ${eventId} not found`)
    }

    const relatedEvents: AuditLogEntry[] = []
    let correlationType: CorrelatedEvents['correlationType'] = 'user'
    let correlationScore = 0

    // By correlation ID
    if (rootEvent.correlationId) {
      const byCorrelationId = Array.from(this.logs.values()).filter(
        (log) => log.correlationId === rootEvent.correlationId
      )
      if (byCorrelationId.length > 0) {
        relatedEvents.push(...byCorrelationId)
        correlationType = 'correlation-id'
        correlationScore = 0.95
      }
    }

    // By session ID
    if (rootEvent.sessionId) {
      const bySessionId = Array.from(this.logs.values()).filter(
        (log) => log.sessionId === rootEvent.sessionId
      )
      relatedEvents.push(...bySessionId.filter((e) => !relatedEvents.includes(e)))
      correlationType = 'session'
      correlationScore = Math.max(correlationScore, 0.9)
    }

    // By workflow execution
    if (rootEvent.executionId) {
      const byExecutionId = Array.from(this.logs.values()).filter(
        (log) => log.executionId === rootEvent.executionId
      )
      relatedEvents.push(...byExecutionId.filter((e) => !relatedEvents.includes(e)))
      correlationType = 'workflow'
      correlationScore = Math.max(correlationScore, 0.85)
    }

    // By user within time window
    const userEvents = Array.from(this.logs.values()).filter(
      (log) =>
        log.userId === rootEvent.userId &&
        Math.abs(log.timestamp.getTime() - rootEvent.timestamp.getTime()) < 60000 // 1 minute window
    )
    relatedEvents.push(...userEvents.filter((e) => !relatedEvents.includes(e)))
    correlationScore = Math.max(correlationScore, 0.75)

    // Build timeline
    const timeline = Array.from(
      new Set([rootEvent, ...relatedEvents.slice(0, 50)])
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return {
      rootEvent,
      relatedEvents: Array.from(new Set(relatedEvents)).slice(0, 100),
      correlationType,
      correlationScore,
      timeline
    }
  }

  /**
   * Build user activity timeline
   */
  async buildTimeline(userId: string, dateRange: DateRange): Promise<Timeline> {
    const userLogs = Array.from(this.logs.values()).filter(
      (log) =>
        log.userId === userId &&
        log.timestamp >= dateRange.start &&
        log.timestamp <= dateRange.end
    )

    const sessions = this.buildUserSessions(userLogs)
    const activityHeatmap = this.calculateActivityHeatmap(userLogs)

    return {
      userId,
      events: userLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      sessions,
      activityHeatmap
    }
  }

  /**
   * Build user sessions from logs
   */
  private buildUserSessions(logs: AuditLogEntry[]): UserSession[] {
    const sessions = new Map<string, UserSession>()
    const sessionTimeout = 30 * 60 * 1000 // 30 minutes

    let currentSession: UserSession | null = null

    for (const log of logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
      if (
        !currentSession ||
        log.timestamp.getTime() - currentSession.endTime!.getTime() > sessionTimeout ||
        log.ipAddress !== currentSession.ipAddress
      ) {
        if (currentSession) {
          sessions.set(currentSession.sessionId, currentSession)
        }
        currentSession = {
          sessionId: log.sessionId || this.generateSessionId(),
          userId: log.userId,
          startTime: log.timestamp,
          endTime: log.timestamp,
          ipAddress: log.ipAddress,
          eventCount: 1,
          actions: [log.action],
          success: log.result === 'success' ? 1 : 0,
          failures: log.result === 'failure' ? 1 : 0
        }
      } else {
        currentSession.endTime = log.timestamp
        currentSession.eventCount++
        if (!currentSession.actions.includes(log.action)) {
          currentSession.actions.push(log.action)
        }
        if (log.result === 'success') {
          currentSession.success++
        } else {
          currentSession.failures++
        }
      }
    }

    if (currentSession) {
      sessions.set(currentSession.sessionId, currentSession)
    }

    return Array.from(sessions.values())
  }

  /**
   * Calculate activity heatmap (hour/day distribution)
   */
  private calculateActivityHeatmap(logs: AuditLogEntry[]): Map<string, number> {
    const heatmap = new Map<string, number>()

    for (const log of logs) {
      const day = log.timestamp.getDay()
      const hour = log.timestamp.getHours()
      const key = `${day}-${hour}`
      heatmap.set(key, (heatmap.get(key) ?? 0) + 1)
    }

    return heatmap
  }

  /**
   * Detect anomalies in logs
   */
  async detectAnomalies(dateRange: DateRange, sensitivity: number = 0.8): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = []
    const relevantLogs = Array.from(this.logs.values()).filter(
      (log) => log.timestamp >= dateRange.start && log.timestamp <= dateRange.end
    )

    // Establish baseline for each user
    const userProfiles = new Map<string, BehaviorProfile>()
    for (const log of relevantLogs) {
      if (!userProfiles.has(log.userId)) {
        const profile = await this.getUserBehaviorProfile(log.userId)
        userProfiles.set(log.userId, profile)
      }
    }

    // Detect various anomaly types
    for (const log of relevantLogs) {
      const profile = userProfiles.get(log.userId)
      if (!profile) continue

      // High failure rate anomaly
      if (log.result === 'failure' && profile.failureRate < 0.1) {
        anomalies.push({
          id: this.generateAnomalyId(),
          timestamp: log.timestamp,
          eventId: log.id,
          type: 'unusual-failure',
          severity: 'medium',
          reason: `User ${log.userId} has unusually high failure rate`,
          score: this.calculateAnomalyScore(log, profile, 'failure-rate'),
          context: { userId: log.userId, baselineFailureRate: profile.failureRate }
        })
      }

      // Unusual action anomaly
      if (!profile.commonActions.includes(log.action)) {
        anomalies.push({
          id: this.generateAnomalyId(),
          timestamp: log.timestamp,
          eventId: log.id,
          type: 'unusual-action',
          severity: 'low',
          reason: `Unusual action for user: ${log.action}`,
          score: this.calculateAnomalyScore(log, profile, 'action'),
          context: { userId: log.userId, action: log.action }
        })
      }

      // Unusual time anomaly
      const hour = log.timestamp.getHours()
      if (
        hour < profile.typicalWorkingHours.start ||
        hour > profile.typicalWorkingHours.end
      ) {
        anomalies.push({
          id: this.generateAnomalyId(),
          timestamp: log.timestamp,
          eventId: log.id,
          type: 'unusual-time',
          severity: 'low',
          reason: `Activity outside typical working hours`,
          score: this.calculateAnomalyScore(log, profile, 'time'),
          context: {
            userId: log.userId,
            hour,
            typicalHours: profile.typicalWorkingHours
          }
        })
      }

      // High severity anomaly
      if (log.severity === 'critical') {
        anomalies.push({
          id: this.generateAnomalyId(),
          timestamp: log.timestamp,
          eventId: log.id,
          type: 'critical-event',
          severity: 'critical',
          reason: `Critical security event detected`,
          score: 0.95,
          context: { eventType: log.eventType, action: log.action }
        })
      }
    }

    // Filter by sensitivity threshold
    const filtered = anomalies.filter((a) => a.score >= sensitivity)

    // Store anomalies
    for (const anomaly of filtered) {
      this.anomalies.set(anomaly.id, anomaly)
    }

    this.emit('anomalies:detected', filtered)
    return filtered
  }

  /**
   * Calculate anomaly score
   */
  private calculateAnomalyScore(
    log: AuditLogEntry,
    profile: BehaviorProfile,
    type: string
  ): number {
    switch (type) {
      case 'failure-rate':
        return Math.min(1, log.result === 'failure' ? 0.8 : 0.2)
      case 'action':
        return 0.6
      case 'time':
        return 0.4
      default:
        return 0.5
    }
  }

  /**
   * Analyze patterns in logs
   */
  async analyzePatterns(eventType: string, dateRange: DateRange): Promise<PatternAnalysis> {
    const relevantLogs = Array.from(this.logs.values()).filter(
      (log) =>
        log.eventType === eventType &&
        log.timestamp >= dateRange.start &&
        log.timestamp <= dateRange.end
    )

    const frequencyDistribution = new Map<string, number>()
    const timeDistribution = new Map<string, number>()
    const sequences: string[][] = []
    let totalDuration = 0
    let successCount = 0

    for (const log of relevantLogs) {
      // Frequency
      frequencyDistribution.set(
        log.action,
        (frequencyDistribution.get(log.action) ?? 0) + 1
      )

      // Time distribution
      const hour = log.timestamp.getHours()
      const hourKey = `${hour}:00-${hour + 1}:00`
      timeDistribution.set(hourKey, (timeDistribution.get(hourKey) ?? 0) + 1)

      // Duration
      if (log.duration) {
        totalDuration += log.duration
      }

      // Success rate
      if (log.result === 'success') {
        successCount++
      }
    }

    // Extract action sequences
    const sortedLogs = relevantLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    for (let i = 0; i < Math.min(sortedLogs.length - 2, 100); i++) {
      sequences.push([
        sortedLogs[i].action,
        sortedLogs[i + 1].action,
        sortedLogs[i + 2].action
      ])
    }

    const commonSequencesWithFreq = this.findCommonSequencesWithFrequency(sequences, 3)
    const successRate = relevantLogs.length > 0 ? successCount / relevantLogs.length : 0

    return {
      eventType,
      totalEvents: relevantLogs.length,
      // O(n) solution: use pre-computed frequencies instead of filtering for each sequence
      patterns: commonSequencesWithFreq.map(({ sequence, frequency: freq }) => ({
        sequence,
        frequency: freq,
        avgDuration: relevantLogs.length > 0 ? totalDuration / relevantLogs.length : 0,
        successRate
      })),
      frequencyDistribution,
      timeDistribution,
      commonActionSequences: commonSequencesWithFreq.map(({ sequence }) => sequence)
    }
  }

  /**
   * Find common sequences in array of sequences with their frequencies
   * Returns sequences along with their counts - O(n) complexity
   */
  private findCommonSequencesWithFrequency(sequences: string[][], minFrequency: number): { sequence: string[], frequency: number }[] {
    const frequency = new Map<string, number>()

    for (const seq of sequences) {
      const key = JSON.stringify(seq)
      frequency.set(key, (frequency.get(key) ?? 0) + 1)
    }

    return Array.from(frequency.entries())
      .filter(([, count]) => count >= minFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ sequence: JSON.parse(key) as string[], frequency: count }))
  }

  /**
   * Find common sequences in array of sequences
   * @deprecated Use findCommonSequencesWithFrequency for better performance
   */
  private findCommonSequences(sequences: string[][], minFrequency: number): string[][] {
    return this.findCommonSequencesWithFrequency(sequences, minFrequency).map(({ sequence }) => sequence)
  }

  /**
   * Get user behavior profile
   */
  async getUserBehaviorProfile(userId: string): Promise<BehaviorProfile> {
    // Check cache
    if (this.baselineData.has(userId)) {
      return this.baselineData.get(userId)!
    }

    const userLogs = Array.from(this.logs.values()).filter((log) => log.userId === userId)

    const eventFrequency = new Map<string, number>()
    const actionFrequency = new Map<string, number>()
    const resourceFrequency = new Map<string, number>()
    const hourDistribution = new Map<number, number>()
    let failureCount = 0

    for (const log of userLogs) {
      eventFrequency.set(
        log.eventType,
        (eventFrequency.get(log.eventType) ?? 0) + 1
      )
      actionFrequency.set(log.action, (actionFrequency.get(log.action) ?? 0) + 1)
      resourceFrequency.set(log.resource, (resourceFrequency.get(log.resource) ?? 0) + 1)

      const hour = log.timestamp.getHours()
      hourDistribution.set(hour, (hourDistribution.get(hour) ?? 0) + 1)

      if (log.result === 'failure') {
        failureCount++
      }
    }

    const commonActions = Array.from(actionFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action]) => action)

    const commonResources = Array.from(resourceFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([resource]) => resource)

    const hoursArray = Array.from(hourDistribution.entries()).sort((a, b) => b[1] - a[1])
    const typicalStart = hoursArray.length > 0 ? hoursArray[0][0] : 9
    const typicalEnd = hoursArray.length > 1 ? hoursArray[1][0] : 17

    const actionsPerHour = userLogs.length / Math.max(1, Math.ceil(24))

    const profile: BehaviorProfile = {
      userId,
      totalEvents: userLogs.length,
      eventFrequency,
      actionsPerHour,
      failureRate: userLogs.length > 0 ? failureCount / userLogs.length : 0,
      commonResources,
      commonActions,
      typicalWorkingHours: { start: typicalStart, end: typicalEnd },
      riskScore: this.calculateRiskScore(userLogs),
      lastActivity: userLogs.length > 0
        ? userLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
            .timestamp
        : new Date()
    }

    this.baselineData.set(userId, profile)
    return profile
  }

  /**
   * Calculate user risk score
   */
  private calculateRiskScore(logs: AuditLogEntry[]): number {
    let score = 0

    const failureRate = logs.filter((l) => l.result === 'failure').length / Math.max(1, logs.length)
    score += failureRate * 20

    const criticalCount = logs.filter((l) => l.severity === 'critical').length
    score += Math.min(criticalCount * 10, 30)

    const highSeverityCount = logs.filter((l) => l.severity === 'high').length
    score += Math.min(highSeverityCount * 5, 20)

    const uniqueResources = new Set(logs.map((l) => l.resource)).size
    if (uniqueResources > 10) {
      score += 15
    }

    return Math.min(score / 10, 100)
  }

  /**
   * Get top statistics for a field
   */
  async getTopStats(field: string, limit: number, dateRange: DateRange): Promise<TopStat[]> {
    const relevantLogs = Array.from(this.logs.values()).filter(
      (log) => log.timestamp >= dateRange.start && log.timestamp <= dateRange.end
    )

    const stats = new Map<string, number>()

    for (const log of relevantLogs) {
      const value = String(log[field as keyof AuditLogEntry] ?? '')
      stats.set(value, (stats.get(value) ?? 0) + 1)
    }

    const total = relevantLogs.length
    const sorted = Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)

    return sorted.map(([value, count]) => ({
      value,
      count,
      percentage: (count / total) * 100
    }))
  }

  /**
   * Get trend data over time
   */
  async getTrendData(field: string, interval: string, dateRange: DateRange): Promise<TrendData> {
    const relevantLogs = Array.from(this.logs.values()).filter(
      (log) => log.timestamp >= dateRange.start && log.timestamp <= dateRange.end
    )

    const buckets = this.createTimeBuckets(dateRange, interval)
    const dataPoints: TrendData['dataPoints'] = []

    for (const [timestamp, bucket] of buckets) {
      const logsInBucket = relevantLogs.filter(
        (log) => log.timestamp >= bucket.start && log.timestamp < bucket.end
      )

      const fieldValues = logsInBucket
        .map((log) => Number(log[field as keyof AuditLogEntry]))
        .filter((v) => !isNaN(v))

      const value = fieldValues.length > 0
        ? fieldValues.reduce((a, b) => a + b, 0) / fieldValues.length
        : 0

      dataPoints.push({
        timestamp,
        value,
        count: logsInBucket.length
      })
    }

    const values = dataPoints.map((dp) => dp.value)
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    const firstValue = values[0] ?? 0
    const lastValue = values[values.length - 1] ?? 0
    const changePercent = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0

    return {
      field,
      interval,
      dataPoints,
      average,
      trend: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
      changePercent
    }
  }

  /**
   * Create time buckets for trend analysis
   */
  private createTimeBuckets(
    dateRange: DateRange,
    interval: string
  ): Map<Date, { start: Date; end: Date }> {
    const buckets = new Map<Date, { start: Date; end: Date }>()
    const intervalMs = this.parseInterval(interval)
    let current = new Date(dateRange.start)

    while (current < dateRange.end) {
      const next = new Date(current.getTime() + intervalMs)
      buckets.set(new Date(current), { start: current, end: next })
      current = next
    }

    return buckets
  }

  /**
   * Parse interval string to milliseconds
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/(\d+)(ms|s|m|h|d)/)
    if (!match) return 1000 * 60 // default 1 minute

    const [, value, unit] = match
    const v = parseInt(value, 10)

    switch (unit) {
      case 'ms':
        return v
      case 's':
        return v * 1000
      case 'm':
        return v * 1000 * 60
      case 'h':
        return v * 1000 * 60 * 60
      case 'd':
        return v * 1000 * 60 * 60 * 24
      default:
        return 1000 * 60
    }
  }

  /**
   * Find similar events
   */
  async findSimilarEvents(eventId: string, similarity: number = 0.8): Promise<AuditLogEntry[]> {
    const sourceEvent = this.logs.get(eventId)
    if (!sourceEvent) {
      return []
    }

    const candidates = Array.from(this.logs.values()).filter((log) => log.id !== eventId)
    const similar: { log: AuditLogEntry; score: number }[] = []

    for (const candidate of candidates) {
      const score = this.calculateSimilarity(sourceEvent, candidate)
      if (score >= similarity) {
        similar.push({ log: candidate, score })
      }
    }

    return similar
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((item) => item.log)
  }

  /**
   * Calculate similarity between two events
   */
  private calculateSimilarity(event1: AuditLogEntry, event2: AuditLogEntry): number {
    let score = 0
    let factors = 0

    if (event1.eventType === event2.eventType) {
      score += 0.2
    }
    factors++

    if (event1.action === event2.action) {
      score += 0.2
    }
    factors++

    if (event1.result === event2.result) {
      score += 0.15
    }
    factors++

    if (event1.severity === event2.severity) {
      score += 0.1
    }
    factors++

    if (event1.userId === event2.userId) {
      score += 0.15
    }
    factors++

    if (
      Math.abs(event1.timestamp.getTime() - event2.timestamp.getTime()) <
      60000
    ) {
      score += 0.1
    }
    factors++

    if (event1.ipAddress === event2.ipAddress) {
      score += 0.1
    }
    factors++

    return score / factors
  }

  /**
   * Export search results
   */
  async exportSearchResults(query: LogQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    const result = await this.search(query)

    if (format === 'json') {
      return JSON.stringify(result, (key, value) => {
        if (value instanceof Map) {
          return Object.fromEntries(value)
        }
        if (value instanceof Date) {
          return value.toISOString()
        }
        return value
      }, 2)
    }

    if (format === 'csv') {
      return this.convertToCSV(result.hits)
    }

    throw new Error(`Unsupported export format: ${format}`)
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) {
      return ''
    }

    const headers = [
      'id',
      'timestamp',
      'eventType',
      'userId',
      'action',
      'resource',
      'result',
      'severity',
      'message',
      'ipAddress'
    ]

    const rows = logs.map((log) =>
      headers
        .map((header) => {
          const value = log[header as keyof AuditLogEntry]
          const stringValue = value instanceof Date ? value.toISOString() : String(value ?? '')
          return `"${stringValue.replace(/"/g, '""')}"`
        })
        .join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  /**
   * Get visualization data
   */
  async getVisualizationData(dateRange: DateRange): Promise<Record<string, any>> {
    const relevantLogs = Array.from(this.logs.values()).filter(
      (log) => log.timestamp >= dateRange.start && log.timestamp <= dateRange.end
    )

    const eventTypeDist = this.calculateDistribution(relevantLogs, 'eventType')
    const severityDist = this.calculateDistribution(relevantLogs, 'severity')
    const resultDist = this.calculateDistribution(relevantLogs, 'result')
    const hourlyActivity = this.calculateHourlyActivity(relevantLogs)
    const topUsers = await this.getTopStats('userId', 10, dateRange)
    const topResources = await this.getTopStats('resource', 10, dateRange)

    return {
      summary: {
        total: relevantLogs.length,
        successRate:
          relevantLogs.filter((l) => l.result === 'success').length / Math.max(1, relevantLogs.length),
        failureRate:
          relevantLogs.filter((l) => l.result === 'failure').length / Math.max(1, relevantLogs.length),
        criticalCount: relevantLogs.filter((l) => l.severity === 'critical').length,
        highCount: relevantLogs.filter((l) => l.severity === 'high').length
      },
      distributions: {
        byEventType: Object.fromEntries(eventTypeDist),
        bySeverity: Object.fromEntries(severityDist),
        byResult: Object.fromEntries(resultDist)
      },
      timeSeries: {
        hourlyActivity
      },
      topStats: {
        users: topUsers,
        resources: topResources
      }
    }
  }

  /**
   * Calculate distribution of values for a field
   */
  private calculateDistribution(
    logs: AuditLogEntry[],
    field: string
  ): Map<string, number> {
    const dist = new Map<string, number>()
    for (const log of logs) {
      const value = String(log[field as keyof AuditLogEntry] ?? '')
      dist.set(value, (dist.get(value) ?? 0) + 1)
    }
    return dist
  }

  /**
   * Calculate hourly activity
   */
  private calculateHourlyActivity(logs: AuditLogEntry[]): Array<{ hour: number; count: number }> {
    const hourly = new Map<number, number>()
    for (let i = 0; i < 24; i++) {
      hourly.set(i, 0)
    }

    for (const log of logs) {
      const hour = log.timestamp.getHours()
      hourly.set(hour, (hourly.get(hour) ?? 0) + 1)
    }

    return Array.from(hourly.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour)
  }

  /**
   * Utility: Generate cache key from query
   */
  private generateCacheKey(query: LogQuery): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(query))
      .digest('hex')
  }

  /**
   * Utility: Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Utility: Generate anomaly ID
   */
  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.cache.clear()
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.logs.clear()
    this.indexes.forEach((index) => index.clear())
    this.cache.clear()
    this.baselineData.clear()
    this.anomalies.clear()
  }

  /**
   * Get analyzer statistics
   */
  getStats(): {
    totalLogs: number
    totalAnomalies: number
    cacheSize: number
    indexedFields: string[]
  } {
    return {
      totalLogs: this.logs.size,
      totalAnomalies: this.anomalies.size,
      cacheSize: this.cache.size,
      indexedFields: Array.from(this.indexes.keys())
    }
  }
}

export default LogAnalyzer
