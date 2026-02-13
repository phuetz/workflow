/**
 * Enterprise Audit System
 *
 * Comprehensive audit logging, compliance reporting, and forensic analysis system.
 * Implements tamper-proof logging with real-time streaming and long-term retention.
 *
 * @module EnterpriseAuditSystem
 */

import crypto from 'crypto'
import EventEmitter from 'events'

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN = 'auth:login',
  AUTH_LOGOUT = 'auth:logout',
  AUTH_FAILED = 'auth:failed',
  AUTH_MFA = 'auth:mfa',
  AUTH_SESSION_CREATE = 'auth:session_create',
  AUTH_SESSION_REVOKE = 'auth:session_revoke',
  AUTH_TOKEN_ISSUED = 'auth:token_issued',
  AUTH_TOKEN_REVOKED = 'auth:token_revoked',

  // Authorization events
  AUTHZ_GRANTED = 'authz:granted',
  AUTHZ_DENIED = 'authz:denied',
  AUTHZ_ROLE_CHANGED = 'authz:role_changed',
  AUTHZ_PERMISSION_CHANGED = 'authz:permission_changed',

  // Data access events
  DATA_READ = 'data:read',
  DATA_WRITE = 'data:write',
  DATA_DELETE = 'data:delete',
  DATA_EXPORT = 'data:export',

  // Configuration changes
  CONFIG_CHANGED = 'config:changed',
  CONFIG_SECURITY = 'config:security',
  CONFIG_POLICY = 'config:policy',

  // Administrative actions
  ADMIN_USER_CREATE = 'admin:user_create',
  ADMIN_USER_DELETE = 'admin:user_delete',
  ADMIN_USER_UPDATE = 'admin:user_update',
  ADMIN_ROLE_CREATE = 'admin:role_create',
  ADMIN_ROLE_DELETE = 'admin:role_delete',

  // Security incidents
  SECURITY_ALERT = 'security:alert',
  SECURITY_THREAT = 'security:threat',
  SECURITY_BREACH = 'security:breach',
  SECURITY_REMEDIATION = 'security:remediation'
}

/**
 * Severity levels for audit events
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  SOC2 = 'soc2',
  ISO27001 = 'iso27001',
  PCI_DSS = 'pci_dss',
  HIPAA = 'hipaa',
  GDPR = 'gdpr'
}

/**
 * Audit event structure
 */
export interface AuditEvent {
  id: string
  timestamp: Date
  userId: string
  eventType: AuditEventType
  severity: AuditSeverity
  resource: string
  action: string
  details: Record<string, unknown>
  ipAddress: string
  userAgent: string
  status: 'success' | 'failure'
  errorMessage?: string
  parentEventId?: string
  correlationId: string
  hash?: string
  previousHash?: string
}

/**
 * Search query interface
 */
export interface AuditSearchQuery {
  userId?: string
  eventType?: AuditEventType
  severity?: AuditSeverity
  resource?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
  fullText?: string
}

/**
 * Retention policy interface
 */
export interface RetentionPolicy {
  name: string
  framework?: ComplianceFramework
  retentionDays: number
  archivalDays?: number
  purgeAfterDays?: number
  legalHold?: boolean
}

/**
 * Compliance report interface
 */
export interface ComplianceReport {
  id: string
  framework: ComplianceFramework
  generatedAt: Date
  period: {
    startDate: Date
    endDate: Date
  }
  metrics: Record<string, unknown>
  findings: ComplianceFinding[]
  score: number
}

/**
 * Compliance finding interface
 */
export interface ComplianceFinding {
  id: string
  controlId: string
  status: 'pass' | 'fail' | 'partial'
  evidence: AuditEvent[]
  remediation?: string
  dueDate?: Date
}

/**
 * Anomaly detection result
 */
export interface AnomalyResult {
  eventId: string
  anomalyScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
}

/**
 * Enterprise Audit System
 *
 * Provides comprehensive audit logging, compliance reporting, and forensic analysis.
 * Implements tamper-proof logging with cryptographic hashing and real-time streaming.
 */
export class EnterpriseAuditSystem extends EventEmitter {
  private auditLog: Map<string, AuditEvent> = new Map()
  private hashChain: Map<string, string> = new Map()
  private retentionPolicies: Map<string, RetentionPolicy> = new Map()
  private complianceFrameworks: Set<ComplianceFramework> = new Set()
  private streamingHandlers: Array<(event: AuditEvent) => Promise<void>> = []
  private archiveStorage: Map<string, AuditEvent[]> = new Map()
  private alertThresholds: Map<string, number> = new Map()
  private userActivityCache: Map<string, AuditEvent[]> = new Map()
  private lastHashValue: string = crypto.createHash('sha256').digest('hex')

  constructor() {
    super()
    this.initializeDefaultPolicies()
    this.initializeDefaultThresholds()
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    const policies: RetentionPolicy[] = [
      {
        name: 'SOC2 Policy',
        framework: ComplianceFramework.SOC2,
        retentionDays: 365,
        archivalDays: 180
      },
      {
        name: 'HIPAA Policy',
        framework: ComplianceFramework.HIPAA,
        retentionDays: 2555, // 7 years
        archivalDays: 1095 // 3 years
      },
      {
        name: 'GDPR Policy',
        framework: ComplianceFramework.GDPR,
        retentionDays: 730, // 2 years
        archivalDays: 365 // 1 year
      },
      {
        name: 'Default Policy',
        retentionDays: 180,
        archivalDays: 90
      }
    ]

    policies.forEach(policy => {
      this.retentionPolicies.set(policy.name, policy)
    })
  }

  /**
   * Initialize default alert thresholds
   */
  private initializeDefaultThresholds(): void {
    this.alertThresholds.set('failed_logins_per_hour', 5)
    this.alertThresholds.set('data_exports_per_day', 10)
    this.alertThresholds.set('role_changes_per_day', 5)
    this.alertThresholds.set('config_changes_per_hour', 10)
  }

  /**
   * Log an audit event
   * @param event - The audit event to log
   * @returns The logged event with hash
   */
  async logEvent(event: Partial<AuditEvent>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      userId: event.userId || 'unknown',
      eventType: event.eventType || AuditEventType.SECURITY_ALERT,
      severity: event.severity || AuditSeverity.INFO,
      resource: event.resource || '',
      action: event.action || '',
      details: event.details || {},
      ipAddress: event.ipAddress || '',
      userAgent: event.userAgent || '',
      status: event.status || 'success',
      correlationId: event.correlationId || this.generateCorrelationId(),
      previousHash: this.lastHashValue
    }

    // Calculate cryptographic hash for tamper-proofing
    auditEvent.hash = this.calculateEventHash(auditEvent)
    this.lastHashValue = auditEvent.hash

    // Store event
    this.auditLog.set(auditEvent.id, auditEvent)
    this.hashChain.set(auditEvent.id, auditEvent.hash)

    // Update user activity cache
    if (!this.userActivityCache.has(auditEvent.userId)) {
      this.userActivityCache.set(auditEvent.userId, [])
    }
    this.userActivityCache.get(auditEvent.userId)!.push(auditEvent)

    // Stream event to handlers
    await this.streamEvent(auditEvent)

    // Check for anomalies and alerts
    await this.checkForAnomalies(auditEvent)
    await this.checkAlertThresholds(auditEvent)

    // Emit event for subscribers
    this.emit('audit:event', auditEvent)

    return auditEvent
  }

  /**
   * Calculate cryptographic hash for event (tamper-proof)
   */
  private calculateEventHash(event: Partial<AuditEvent>): string {
    const hashData = JSON.stringify({
      timestamp: event.timestamp,
      userId: event.userId,
      eventType: event.eventType,
      resource: event.resource,
      action: event.action,
      previousHash: event.previousHash
    })

    return crypto
      .createHash('sha256')
      .update(hashData)
      .digest('hex')
  }

  /**
   * Verify integrity of audit logs
   * @returns True if all logs are unmodified
   */
  verifyLogIntegrity(): boolean {
    let previousHash = ''

    for (const event of this.auditLog.values()) {
      if (event.previousHash && event.previousHash !== previousHash) {
        return false
      }

      const recalculatedHash = this.calculateEventHash(event)
      if (recalculatedHash !== event.hash) {
        return false
      }

      previousHash = event.hash || ''
    }

    return true
  }

  /**
   * Search audit logs
   */
  async searchLogs(query: AuditSearchQuery): Promise<AuditEvent[]> {
    let results: AuditEvent[] = Array.from(this.auditLog.values())

    // Apply filters
    if (query.userId) {
      results = results.filter(e => e.userId === query.userId)
    }
    if (query.eventType) {
      results = results.filter(e => e.eventType === query.eventType)
    }
    if (query.severity) {
      results = results.filter(e => e.severity === query.severity)
    }
    if (query.resource) {
      results = results.filter(e => e.resource.includes(query.resource))
    }
    if (query.startDate) {
      results = results.filter(e => e.timestamp >= query.startDate!)
    }
    if (query.endDate) {
      results = results.filter(e => e.timestamp <= query.endDate!)
    }

    // Full-text search
    if (query.fullText) {
      const searchTerm = query.fullText.toLowerCase()
      results = results.filter(e =>
        JSON.stringify(e).toLowerCase().includes(searchTerm)
      )
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    const offset = query.offset || 0
    const limit = query.limit || 100
    return results.slice(offset, offset + limit)
  }

  /**
   * Register a real-time streaming handler
   */
  registerStreamingHandler(
    handler: (event: AuditEvent) => Promise<void>
  ): void {
    this.streamingHandlers.push(handler)
  }

  /**
   * Stream event to all registered handlers
   */
  private async streamEvent(event: AuditEvent): Promise<void> {
    const promises = this.streamingHandlers.map(handler =>
      handler(event).catch(err => {
        this.emit('stream:error', err)
      })
    )
    await Promise.allSettled(promises)
  }

  /**
   * Check for anomalies in audit events
   */
  private async checkForAnomalies(event: AuditEvent): Promise<void> {
    const anomalies = this.detectAnomalies([event])
    if (anomalies.length > 0) {
      this.emit('anomaly:detected', anomalies)
    }
  }

  /**
   * Check alert thresholds
   */
  private async checkAlertThresholds(event: AuditEvent): Promise<void> {
    // Check failed login threshold
    if (event.eventType === AuditEventType.AUTH_FAILED) {
      const failedLogins = this.countRecentEvents(
        AuditEventType.AUTH_FAILED,
        event.userId,
        3600000 // 1 hour
      )
      const threshold = this.alertThresholds.get('failed_logins_per_hour') || 5
      if (failedLogins > threshold) {
        this.emit('threshold:exceeded', {
          type: 'failed_logins',
          count: failedLogins,
          threshold,
          userId: event.userId
        })
      }
    }

    // Check data export threshold
    if (event.eventType === AuditEventType.DATA_EXPORT) {
      const exports = this.countRecentEvents(
        AuditEventType.DATA_EXPORT,
        event.userId,
        86400000 // 1 day
      )
      const threshold = this.alertThresholds.get('data_exports_per_day') || 10
      if (exports > threshold) {
        this.emit('threshold:exceeded', {
          type: 'data_exports',
          count: exports,
          threshold,
          userId: event.userId
        })
      }
    }
  }

  /**
   * Count recent events matching criteria
   */
  private countRecentEvents(
    eventType: AuditEventType,
    userId: string,
    timeWindowMs: number
  ): number {
    const cutoffTime = Date.now() - timeWindowMs
    return Array.from(this.auditLog.values()).filter(
      e =>
        e.eventType === eventType &&
        e.userId === userId &&
        e.timestamp.getTime() > cutoffTime
    ).length
  }

  /**
   * Detect anomalies using statistical analysis
   */
  detectAnomalies(events: AuditEvent[]): AnomalyResult[] {
    const anomalies: AnomalyResult[] = []

    events.forEach(event => {
      let anomalyScore = 0
      const reasons: string[] = []

      // Check for unusual times
      const hour = event.timestamp.getHours()
      if (hour < 6 || hour > 22) {
        anomalyScore += 0.2
        reasons.push('Access outside business hours')
      }

      // Check for unusual resource access patterns
      const userEvents = this.userActivityCache.get(event.userId) || []
      if (userEvents.length > 100 && event.status === 'failure') {
        anomalyScore += 0.15
        reasons.push('Multiple failed attempts detected')
      }

      // Check for bulk data operations
      if (
        event.eventType === AuditEventType.DATA_EXPORT &&
        event.details.recordCount &&
        (event.details.recordCount as number) > 10000
      ) {
        anomalyScore += 0.3
        reasons.push('Large bulk data export detected')
      }

      // Check for privilege escalation attempts
      if (event.eventType === AuditEventType.AUTHZ_DENIED) {
        anomalyScore += 0.2
        reasons.push('Authorization denial detected')
      }

      if (anomalyScore > 0.3) {
        anomalies.push({
          eventId: event.id,
          anomalyScore,
          riskLevel: this.calculateRiskLevel(anomalyScore),
          reasons
        })
      }
    })

    return anomalies
  }

  /**
   * Calculate risk level from anomaly score
   */
  private calculateRiskLevel(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical'
    if (score >= 0.6) return 'high'
    if (score >= 0.4) return 'medium'
    return 'low'
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: ComplianceFramework,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const events = Array.from(this.auditLog.values()).filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    )

    const findings: ComplianceFinding[] = this.generateComplianceFindings(
      framework,
      events
    )

    const score = this.calculateComplianceScore(findings)

    return {
      id: this.generateReportId(),
      framework,
      generatedAt: new Date(),
      period: { startDate, endDate },
      metrics: this.calculateMetrics(events),
      findings,
      score
    }
  }

  /**
   * Generate compliance findings based on framework
   */
  private generateComplianceFindings(
    framework: ComplianceFramework,
    events: AuditEvent[]
  ): ComplianceFinding[] {
    const findings: ComplianceFinding[] = []

    switch (framework) {
      case ComplianceFramework.SOC2:
        findings.push(...this.generateSOC2Findings(events))
        break
      case ComplianceFramework.ISO27001:
        findings.push(...this.generateISO27001Findings(events))
        break
      case ComplianceFramework.PCI_DSS:
        findings.push(...this.generatePCIDSSFindings(events))
        break
      case ComplianceFramework.HIPAA:
        findings.push(...this.generateHIPAAFindings(events))
        break
      case ComplianceFramework.GDPR:
        findings.push(...this.generateGDPRFindings(events))
        break
    }

    return findings
  }

  /**
   * Generate SOC 2 findings
   */
  private generateSOC2Findings(events: AuditEvent[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = []

    // CC6.1 - Logical and Physical Access Controls
    const accessEvents = events.filter(
      e =>
        e.eventType === AuditEventType.AUTH_LOGIN ||
        e.eventType === AuditEventType.AUTHZ_GRANTED
    )
    findings.push({
      id: this.generateFindingId(),
      controlId: 'CC6.1',
      status: accessEvents.length > 10 ? 'pass' : 'fail',
      evidence: accessEvents.slice(0, 5)
    })

    // CC7.2 - System Monitoring
    const securityEvents = events.filter(
      e => e.severity === AuditSeverity.CRITICAL
    )
    findings.push({
      id: this.generateFindingId(),
      controlId: 'CC7.2',
      status: securityEvents.length === 0 ? 'pass' : 'partial',
      evidence: securityEvents.slice(0, 5)
    })

    return findings
  }

  /**
   * Generate ISO 27001 findings
   */
  private generateISO27001Findings(events: AuditEvent[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = []

    // A.9.1.1 - Access Control Policy
    const authzEvents = events.filter(
      e =>
        e.eventType === AuditEventType.AUTHZ_GRANTED ||
        e.eventType === AuditEventType.AUTHZ_DENIED
    )
    findings.push({
      id: this.generateFindingId(),
      controlId: 'A.9.1.1',
      status: authzEvents.length > 0 ? 'pass' : 'fail',
      evidence: authzEvents.slice(0, 5)
    })

    // A.12.4.1 - Event Logging
    const allEvents = events
    findings.push({
      id: this.generateFindingId(),
      controlId: 'A.12.4.1',
      status: allEvents.length > 100 ? 'pass' : 'partial',
      evidence: allEvents.slice(0, 5)
    })

    return findings
  }

  /**
   * Generate PCI DSS findings
   */
  private generatePCIDSSFindings(events: AuditEvent[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = []

    // Requirement 8.1 - User Identification
    const authEvents = events.filter(
      e =>
        e.eventType === AuditEventType.AUTH_LOGIN ||
        e.eventType === AuditEventType.AUTH_LOGOUT
    )
    findings.push({
      id: this.generateFindingId(),
      controlId: 'Req8.1',
      status: authEvents.length > 50 ? 'pass' : 'partial',
      evidence: authEvents.slice(0, 5)
    })

    return findings
  }

  /**
   * Generate HIPAA findings
   */
  private generateHIPAAFindings(events: AuditEvent[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = []

    // 45 CFR 164.312(b) - Audit Controls
    const dataAccessEvents = events.filter(
      e =>
        e.eventType === AuditEventType.DATA_READ ||
        e.eventType === AuditEventType.DATA_WRITE
    )
    findings.push({
      id: this.generateFindingId(),
      controlId: '164.312(b)',
      status: dataAccessEvents.length > 100 ? 'pass' : 'partial',
      evidence: dataAccessEvents.slice(0, 5)
    })

    return findings
  }

  /**
   * Generate GDPR findings
   */
  private generateGDPRFindings(events: AuditEvent[]): ComplianceFinding[] {
    const findings: ComplianceFinding[] = []

    // Article 32 - Data Protection
    const securityEvents = events.filter(
      e => e.severity === AuditSeverity.CRITICAL
    )
    findings.push({
      id: this.generateFindingId(),
      controlId: 'Art32',
      status: securityEvents.length === 0 ? 'pass' : 'fail',
      evidence: securityEvents.slice(0, 5)
    })

    return findings
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(findings: ComplianceFinding[]): number {
    if (findings.length === 0) return 100

    const passCount = findings.filter(f => f.status === 'pass').length
    const partialCount = findings.filter(f => f.status === 'partial').length

    return Math.round(
      (passCount * 100 + partialCount * 50) / findings.length
    )
  }

  /**
   * Calculate audit metrics
   */
  private calculateMetrics(
    events: AuditEvent[]
  ): Record<string, unknown> {
    const authEvents = events.filter(
      e => e.eventType.startsWith('auth:')
    )
    const authzEvents = events.filter(
      e => e.eventType.startsWith('authz:')
    )
    const dataEvents = events.filter(
      e => e.eventType.startsWith('data:')
    )
    const securityEvents = events.filter(
      e => e.severity === AuditSeverity.CRITICAL
    )

    return {
      totalEvents: events.length,
      authenticationEvents: authEvents.length,
      authorizationEvents: authzEvents.length,
      dataAccessEvents: dataEvents.length,
      securityIncidents: securityEvents.length,
      failureRate: events.length > 0
        ? Math.round(
            (events.filter(e => e.status === 'failure').length /
              events.length) *
              100
          )
        : 0,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      eventTypes: new Set(events.map(e => e.eventType)).size
    }
  }

  /**
   * Apply retention policy
   */
  async applyRetentionPolicy(
    policyName: string
  ): Promise<{ archived: number; purged: number }> {
    const policy = this.retentionPolicies.get(policyName)
    if (!policy) {
      throw new Error(`Policy not found: ${policyName}`)
    }

    const now = new Date()
    let archived = 0
    let purged = 0

    for (const [eventId, event] of this.auditLog.entries()) {
      const daysSinceEvent = Math.floor(
        (now.getTime() - event.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Archive old events
      if (
        policy.archivalDays &&
        daysSinceEvent > policy.archivalDays &&
        !this.isLegalHold(eventId)
      ) {
        if (!this.archiveStorage.has(policyName)) {
          this.archiveStorage.set(policyName, [])
        }
        this.archiveStorage.get(policyName)!.push(event)
        archived++
      }

      // Purge very old events
      if (
        policy.purgeAfterDays &&
        daysSinceEvent > policy.purgeAfterDays &&
        !this.isLegalHold(eventId)
      ) {
        this.auditLog.delete(eventId)
        this.hashChain.delete(eventId)
        purged++
      }
    }

    this.emit('retention:applied', { policyName, archived, purged })
    return { archived, purged }
  }

  /**
   * Check if event is under legal hold
   */
  private isLegalHold(eventId: string): boolean {
    const event = this.auditLog.get(eventId)
    return event?.details?.legalHold === true
  }

  /**
   * Export audit data
   */
  async exportLogs(
    format: 'json' | 'csv',
    query?: AuditSearchQuery
  ): Promise<string> {
    const events = await this.searchLogs(query || {})

    if (format === 'json') {
      return JSON.stringify(events, null, 2)
    } else {
      // CSV format
      const headers = [
        'ID',
        'Timestamp',
        'User',
        'Event Type',
        'Severity',
        'Resource',
        'Status'
      ]
      const rows = events.map(e => [
        e.id,
        e.timestamp.toISOString(),
        e.userId,
        e.eventType,
        e.severity,
        e.resource,
        e.status
      ])

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(v => `"${v}"`).join(','))
      ].join('\n')

      return csv
    }
  }

  /**
   * Reconstruct timeline for investigation
   */
  async reconstructTimeline(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditEvent[]> {
    const events = await this.searchLogs({
      userId,
      startDate,
      endDate
    })

    // Verify integrity of timeline
    const isIntact = this.verifyLogIntegrity()
    if (!isIntact) {
      this.emit('investigation:warning', {
        userId,
        message: 'Timeline may have been modified'
      })
    }

    return events
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${crypto.randomUUID()}`
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate finding ID
   */
  private generateFindingId(): string {
    return `find_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get audit statistics
   */
  getStatistics(): Record<string, unknown> {
    const events = Array.from(this.auditLog.values())
    const now = new Date()
    const last24h = new Date(now.getTime() - 86400000)

    return {
      totalEvents: events.length,
      events24h: events.filter(e => e.timestamp > last24h).length,
      integrityVerified: this.verifyLogIntegrity(),
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      eventTypeDistribution: this.getEventTypeDistribution(events),
      severityDistribution: this.getSeverityDistribution(events)
    }
  }

  /**
   * Get event type distribution
   */
  private getEventTypeDistribution(events: AuditEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    events.forEach(e => {
      distribution[e.eventType] = (distribution[e.eventType] || 0) + 1
    })
    return distribution
  }

  /**
   * Get severity distribution
   */
  private getSeverityDistribution(events: AuditEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    events.forEach(e => {
      distribution[e.severity] = (distribution[e.severity] || 0) + 1
    })
    return distribution
  }

  /**
   * Enable compliance framework
   */
  enableFramework(framework: ComplianceFramework): void {
    this.complianceFrameworks.add(framework)
  }

  /**
   * Disable compliance framework
   */
  disableFramework(framework: ComplianceFramework): void {
    this.complianceFrameworks.delete(framework)
  }

  /**
   * Get enabled frameworks
   */
  getEnabledFrameworks(): ComplianceFramework[] {
    return Array.from(this.complianceFrameworks)
  }

  /**
   * Add custom retention policy
   */
  addRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.set(policy.name, policy)
  }

  /**
   * Set alert threshold
   */
  setAlertThreshold(alertType: string, threshold: number): void {
    this.alertThresholds.set(alertType, threshold)
  }

  /**
   * Get all audit events for user
   */
  getUserAuditTrail(userId: string): AuditEvent[] {
    return this.userActivityCache.get(userId) || []
  }

  /**
   * Clear all audit data
   */
  clear(): void {
    this.auditLog.clear()
    this.hashChain.clear()
    this.userActivityCache.clear()
    this.archiveStorage.clear()
  }
}

export default EnterpriseAuditSystem
