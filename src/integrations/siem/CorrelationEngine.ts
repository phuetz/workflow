/**
 * SIEM Event Correlation Engine
 *
 * Real-time event correlation engine for detecting security incidents through pattern matching,
 * temporal analysis, entity behavior tracking, and statistical anomaly detection.
 * Implements 15+ pre-built correlation rules covering common attack patterns and supports
 * custom rule definition for advanced threat detection.
 */

import { EventEmitter } from 'events'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Base security event structure
 */
export interface SecurityEvent {
  /** Unique event identifier */
  id: string
  /** Event timestamp (milliseconds since epoch) */
  timestamp: number
  /** Event source system (e.g., 'firewall', 'auth', 'endpoint', 'network') */
  source: string
  /** Event type classification */
  eventType: string
  /** Event severity (0-100) */
  severity: number
  /** Primary entity (user, IP, host, etc.) */
  entity: {
    type: 'user' | 'ip' | 'host' | 'service' | 'session'
    value: string
  }
  /** Additional entities involved */
  relatedEntities?: Array<{ type: string; value: string }>
  /** Event-specific fields */
  fields: Record<string, unknown>
  /** Raw event data for pattern matching */
  raw?: string
}

/**
 * Time window types for temporal correlation
 */
export type TimeWindow = '1m' | '5m' | '15m' | '1h' | '24h' | 'custom'

/**
 * Correlation rule priority levels
 */
export enum CorrelationPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Time-based correlation configuration
 */
export interface TimeCorrelationConfig {
  windowType: TimeWindow
  customWindowMs?: number
  eventSequence?: string[]
  frequencyThreshold?: number
  withinSeconds?: number
}

/**
 * Entity-based correlation configuration
 */
export interface EntityCorrelationConfig {
  groupByType: 'user' | 'ip' | 'host' | 'session'
  anomalyIndicators: string[]
  velocityWindow: number // in seconds
  velocityThreshold: number // events per window
}

/**
 * Pattern-based correlation configuration
 */
export interface PatternCorrelationConfig {
  patterns: PatternRule[]
  caseSensitive?: boolean
}

/**
 * Statistical correlation configuration
 */
export interface StatisticalCorrelationConfig {
  baselineWindow: number // in seconds
  deviationMultiplier: number // e.g., 3 for 3-sigma
  rareEventThreshold: number // percentile, 0-100
}

/**
 * Pattern matching rule
 */
export interface PatternRule {
  name: string
  fieldName: string
  pattern: RegExp | string
  severity: number
  weight: number
}

/**
 * Correlation rule definition
 */
export interface CorrelationRule {
  id: string
  name: string
  description: string
  priority: CorrelationPriority
  enabled: boolean
  conditions: CorrelationCondition[]
  actions: CorrelationAction[]
  ttlSeconds: number
  deduplicationWindow: number
}

/**
 * Condition for rule evaluation
 */
export interface CorrelationCondition {
  type: 'time' | 'entity' | 'pattern' | 'statistical' | 'compound'
  config: TimeCorrelationConfig | EntityCorrelationConfig | PatternCorrelationConfig | StatisticalCorrelationConfig
  operator?: 'AND' | 'OR'
  threshold?: number
}

/**
 * Action triggered when rule matches
 */
export interface CorrelationAction {
  type: 'alert' | 'escalate' | 'isolate' | 'custom'
  severity: number
  enrichment?: Record<string, unknown>
  customHandler?: (events: SecurityEvent[], correlation: CorrelationResult) => Promise<void>
}

/**
 * Correlated event group
 */
export interface CorrelationResult {
  id: string
  ruleId: string
  ruleName: string
  timestamp: number
  correlationScore: number
  severity: number
  events: SecurityEvent[]
  chainType?: AttackChainStage
  attackPath?: AttackChainStage[]
  relatedEntities: Set<string>
  metadata: {
    correlationType: string
    matchedConditions: string[]
    confidence: number
    mitreTechniques?: string[]
  }
}

/**
 * MITRE ATT&CK kill chain stages
 */
export enum AttackChainStage {
  RECONNAISSANCE = 'reconnaissance',
  WEAPONIZATION = 'weaponization',
  DELIVERY = 'delivery',
  EXPLOITATION = 'exploitation',
  INSTALLATION = 'installation',
  COMMAND_AND_CONTROL = 'command_and_control',
  ACTIONS_ON_OBJECTIVES = 'actions_on_objectives'
}

/**
 * Correlation metrics
 */
export interface CorrelationMetrics {
  rulesTriggeredPerHour: number
  totalCorrelations: number
  truePositives: number
  falsePositives: number
  correlationLatencyMs: number
  stateStoreSizeBytes: number
  activeSessions: number
}

/**
 * Correlation context for state tracking
 */
interface CorrelationContext {
  eventBuffer: Map<string, SecurityEvent[]>
  entityBehavior: Map<string, EntityBehavior>
  correlationHistory: Map<string, CorrelationResult>
  sessionState: Map<string, SessionState>
  lastCleanup: number
}

/**
 * Entity behavior tracking
 */
interface EntityBehavior {
  entity: string
  eventCount: number
  lastEventTime: number
  velocity: number
  anomalyScore: number
  baseline: Record<string, number>
}

/**
 * Session state for multi-event correlations
 */
interface SessionState {
  sessionId: string
  createdAt: number
  expiresAt: number
  events: SecurityEvent[]
  correlationScore: number
  chainStages: Set<AttackChainStage>
}

// ============================================================================
// Correlation Engine
// ============================================================================

/**
 * Main event correlation engine for SIEM
 */
export class CorrelationEngine extends EventEmitter {
  private rules: Map<string, CorrelationRule> = new Map()
  private context: CorrelationContext = {
    eventBuffer: new Map(),
    entityBehavior: new Map(),
    correlationHistory: new Map(),
    sessionState: new Map(),
    lastCleanup: Date.now()
  }
  private metrics: CorrelationMetrics = {
    rulesTriggeredPerHour: 0,
    totalCorrelations: 0,
    truePositives: 0,
    falsePositives: 0,
    correlationLatencyMs: 0,
    stateStoreSizeBytes: 0,
    activeSessions: 0
  }
  private maxStateSize = 100000
  private cleanupIntervalMs = 60000
  private deduplicationCache: Map<string, number> = new Map()

  constructor() {
    super()
    this.initializeCleanupInterval()
    this.registerDefaultRules()
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Process incoming security event through correlation engine
   */
  public async processEvent(event: SecurityEvent): Promise<CorrelationResult[]> {
    const startTime = Date.now()
    const correlations: CorrelationResult[] = []

    try {
      // Update state
      this.updateEntityBehavior(event)
      this.addToEventBuffer(event)

      // Evaluate all active rules
      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue

        const result = await this.evaluateRule(rule, event)
        if (result) {
          // Check deduplication
          if (!this.isDuplicate(result)) {
            correlations.push(result)
            this.context.correlationHistory.set(result.id, result)
            this.metrics.totalCorrelations++
            this.emit('correlation', result)
          }
        }
      }

      this.metrics.correlationLatencyMs = Date.now() - startTime
      return correlations
    } catch (error) {
      this.emit('error', error)
      return []
    }
  }

  /**
   * Register a correlation rule
   */
  public registerRule(rule: CorrelationRule): void {
    this.rules.set(rule.id, rule)
    this.emit('ruleRegistered', rule)
  }

  /**
   * Unregister a correlation rule
   */
  public unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId)
    this.emit('ruleUnregistered', ruleId)
  }

  /**
   * Get all active rules
   */
  public getRules(): CorrelationRule[] {
    return Array.from(this.rules.values()).filter(r => r.enabled)
  }

  /**
   * Get correlation history
   */
  public getCorrelationHistory(limit: number = 1000): CorrelationResult[] {
    return Array.from(this.context.correlationHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Get entity behavior profile
   */
  public getEntityBehavior(entity: string): EntityBehavior | undefined {
    return this.context.entityBehavior.get(entity)
  }

  /**
   * Get current metrics
   */
  public getMetrics(): CorrelationMetrics {
    return {
      ...this.metrics,
      activeSessions: this.context.sessionState.size,
      stateStoreSizeBytes: this.calculateStateSize()
    }
  }

  /**
   * Clear all state and reset engine
   */
  public reset(): void {
    this.context = {
      eventBuffer: new Map(),
      entityBehavior: new Map(),
      correlationHistory: new Map(),
      sessionState: new Map(),
      lastCleanup: Date.now()
    }
    this.deduplicationCache.clear()
    this.metrics = {
      rulesTriggeredPerHour: 0,
      totalCorrelations: 0,
      truePositives: 0,
      falsePositives: 0,
      correlationLatencyMs: 0,
      stateStoreSizeBytes: 0,
      activeSessions: 0
    }
  }

  // ========================================================================
  // Rule Evaluation
  // ========================================================================

  /**
   * Evaluate a single rule against incoming event
   */
  private async evaluateRule(rule: CorrelationRule, event: SecurityEvent): Promise<CorrelationResult | null> {
    try {
      const matchedConditions: string[] = []
      let totalScore = 0

      for (const condition of rule.conditions) {
        const { matched, score } = await this.evaluateCondition(condition, event)
        if (matched) {
          matchedConditions.push(condition.type)
          totalScore += score
        }
      }

      if (matchedConditions.length === 0) return null

      const correlationScore = Math.min(100, totalScore)
      const relatedEvents = this.getRelatedEvents(event, rule)

      return {
        id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        timestamp: Date.now(),
        correlationScore,
        severity: rule.conditions[0].threshold || 50,
        events: relatedEvents,
        relatedEntities: this.extractRelatedEntities(relatedEvents),
        metadata: {
          correlationType: rule.conditions[0].type,
          matchedConditions,
          confidence: correlationScore / 100,
          mitreTechniques: this.mapToMitreTechniques(rule.name)
        }
      }
    } catch (error) {
      this.emit('error', error)
      return null
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: CorrelationCondition,
    event: SecurityEvent
  ): Promise<{ matched: boolean; score: number }> {
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition as any, event)
      case 'entity':
        return this.evaluateEntityCondition(condition as any, event)
      case 'pattern':
        return this.evaluatePatternCondition(condition as any, event)
      case 'statistical':
        return this.evaluateStatisticalCondition(condition as any, event)
      default:
        return { matched: false, score: 0 }
    }
  }

  /**
   * Evaluate time-based correlation
   */
  private evaluateTimeCondition(
    condition: CorrelationCondition,
    event: SecurityEvent
  ): { matched: boolean; score: number } {
    const config = condition.config as TimeCorrelationConfig
    const windowMs = this.getWindowMs(config.windowType, config.customWindowMs)
    const threshold = condition.threshold || 2

    const relatedEvents = Array.from(this.context.eventBuffer.values())
      .flat()
      .filter(e =>
        e.timestamp >= event.timestamp - windowMs &&
        e.timestamp <= event.timestamp &&
        (config.eventSequence?.includes(e.eventType) ?? true)
      )

    const matched = relatedEvents.length >= threshold
    const score = matched ? Math.min(100, (relatedEvents.length / threshold) * 50) : 0

    return { matched, score }
  }

  /**
   * Evaluate entity-based correlation
   */
  private evaluateEntityCondition(
    condition: CorrelationCondition,
    event: SecurityEvent
  ): { matched: boolean; score: number } {
    const config = condition.config as EntityCorrelationConfig
    const entity = `${config.groupByType}:${event.entity.value}`
    const behavior = this.context.entityBehavior.get(entity)

    if (!behavior) return { matched: false, score: 0 }

    const threshold = condition.threshold || 1
    const matched = behavior.velocity > config.velocityThreshold
    const anomalyScore = matched ? behavior.anomalyScore : 0

    return { matched, score: anomalyScore }
  }

  /**
   * Evaluate pattern-based correlation
   */
  private evaluatePatternCondition(
    condition: CorrelationCondition,
    event: SecurityEvent
  ): { matched: boolean; score: number } {
    const config = condition.config as PatternCorrelationConfig
    const rawData = event.raw || JSON.stringify(event.fields)

    let totalScore = 0
    let matchCount = 0

    for (const patternRule of config.patterns) {
      const regex = typeof patternRule.pattern === 'string'
        ? new RegExp(patternRule.pattern, config.caseSensitive ? '' : 'i')
        : patternRule.pattern

      if (regex.test(rawData)) {
        totalScore += patternRule.weight
        matchCount++
      }
    }

    const matched = matchCount > 0
    const score = matched ? Math.min(100, totalScore) : 0

    return { matched, score }
  }

  /**
   * Evaluate statistical correlation
   */
  private evaluateStatisticalCondition(
    condition: CorrelationCondition,
    event: SecurityEvent
  ): { matched: boolean; score: number } {
    const config = condition.config as StatisticalCorrelationConfig
    const entity = `${event.entity.type}:${event.entity.value}`
    const behavior = this.context.entityBehavior.get(entity)

    if (!behavior) return { matched: false, score: 0 }

    const baselineValue = behavior.baseline[event.eventType] || 0
    const deviation = Math.abs(behavior.eventCount - baselineValue) / Math.max(1, baselineValue)
    const threshold = config.deviationMultiplier

    const matched = deviation > threshold
    const score = matched ? Math.min(100, (deviation / threshold) * 60) : 0

    return { matched, score }
  }

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Update entity behavior tracking
   */
  private updateEntityBehavior(event: SecurityEvent): void {
    const entityKey = `${event.entity.type}:${event.entity.value}`
    const now = Date.now()

    let behavior = this.context.entityBehavior.get(entityKey)
    if (!behavior) {
      behavior = {
        entity: entityKey,
        eventCount: 0,
        lastEventTime: now,
        velocity: 0,
        anomalyScore: 0,
        baseline: {}
      }
    }

    behavior.eventCount++
    const timeDelta = (now - behavior.lastEventTime) / 1000
    behavior.velocity = timeDelta > 0 ? 1 / timeDelta : 1
    behavior.lastEventTime = now

    // Update baseline
    if (!behavior.baseline[event.eventType]) {
      behavior.baseline[event.eventType] = 1
    } else {
      behavior.baseline[event.eventType]++
    }

    // Calculate anomaly score
    behavior.anomalyScore = Math.min(100, behavior.velocity * 20)

    this.context.entityBehavior.set(entityKey, behavior)
  }

  /**
   * Add event to buffer
   */
  private addToEventBuffer(event: SecurityEvent): void {
    const key = event.source
    if (!this.context.eventBuffer.has(key)) {
      this.context.eventBuffer.set(key, [])
    }

    const buffer = this.context.eventBuffer.get(key)!
    buffer.push(event)

    // Limit buffer size
    if (buffer.length > 10000) {
      buffer.shift()
    }
  }

  /**
   * Get related events for a correlation
   */
  private getRelatedEvents(event: SecurityEvent, rule: CorrelationRule): SecurityEvent[] {
    const related: SecurityEvent[] = [event]
    const windowMs = 300000 // 5 minutes

    for (const buffer of this.context.eventBuffer.values()) {
      related.push(
        ...buffer.filter(e =>
          e.entity.value === event.entity.value &&
          e.timestamp >= event.timestamp - windowMs &&
          e.timestamp <= event.timestamp &&
          e.id !== event.id
        )
      )
    }

    return related.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Extract related entities from events
   */
  private extractRelatedEntities(events: SecurityEvent[]): Set<string> {
    const entities = new Set<string>()

    for (const event of events) {
      entities.add(`${event.entity.type}:${event.entity.value}`)
      event.relatedEntities?.forEach(e => {
        entities.add(`${e.type}:${e.value}`)
      })
    }

    return entities
  }

  /**
   * Check if correlation is duplicate
   */
  private isDuplicate(correlation: CorrelationResult): boolean {
    const hash = this.hashCorrelation(correlation)
    const lastTime = this.deduplicationCache.get(hash)

    if (lastTime && Date.now() - lastTime < 300000) { // 5 minutes
      return true
    }

    this.deduplicationCache.set(hash, Date.now())
    return false
  }

  /**
   * Generate correlation hash for deduplication
   */
  private hashCorrelation(correlation: CorrelationResult): string {
    const eventIds = correlation.events.map(e => e.id).sort().join(',')
    return `${correlation.ruleId}:${eventIds}`
  }

  /**
   * Calculate state store size in bytes
   */
  private calculateStateSize(): number {
    let size = 0
    size += Array.from(this.context.eventBuffer.values()).flat().length * 500
    size += this.context.entityBehavior.size * 200
    size += this.context.sessionState.size * 300
    return size
  }

  /**
   * Initialize periodic cleanup
   */
  private initializeCleanupInterval(): void {
    setInterval(() => this.cleanup(), this.cleanupIntervalMs)
  }

  /**
   * Cleanup expired state
   */
  private cleanup(): void {
    const now = Date.now()

    // Remove old events from buffers
    for (const buffer of this.context.eventBuffer.values()) {
      const cutoff = now - 86400000 // 24 hours
      const idx = buffer.findIndex(e => e.timestamp > cutoff)
      if (idx > 0) {
        buffer.splice(0, idx)
      }
    }

    // Remove expired sessions
    for (const [id, session] of this.context.sessionState.entries()) {
      if (session.expiresAt < now) {
        this.context.sessionState.delete(id)
      }
    }

    // Trim correlation history
    if (this.context.correlationHistory.size > this.maxStateSize) {
      const toDelete = this.context.correlationHistory.size - (this.maxStateSize * 0.9)
      const sorted = Array.from(this.context.correlationHistory.values())
        .sort((a, b) => a.timestamp - b.timestamp)

      for (let i = 0; i < toDelete; i++) {
        this.context.correlationHistory.delete(sorted[i].id)
      }
    }

    this.context.lastCleanup = now
  }

  /**
   * Get window in milliseconds
   */
  private getWindowMs(windowType: TimeWindow, customMs?: number): number {
    const windows: Record<TimeWindow, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '24h': 86400000,
      'custom': customMs || 60000
    }
    return windows[windowType]
  }

  /**
   * Map rule to MITRE ATT&CK techniques
   */
  private mapToMitreTechniques(ruleName: string): string[] {
    const mapping: Record<string, string[]> = {
      'brute_force': ['T1110'],
      'lateral_movement': ['T1021'],
      'data_exfiltration': ['T1030'],
      'privilege_escalation': ['T1134'],
      'account_takeover': ['T1078'],
      'reconnaissance': ['T1592'],
      'malware': ['T1105', 'T1059'],
      'credential_theft': ['T1555', 'T1056'],
      'supply_chain': ['T1195'],
      'insider_threat': ['T1020']
    }

    for (const [key, techniques] of Object.entries(mapping)) {
      if (ruleName.toLowerCase().includes(key)) {
        return techniques
      }
    }

    return []
  }

  // ========================================================================
  // Default Rules Registration
  // ========================================================================

  /**
   * Register all default correlation rules
   */
  private registerDefaultRules(): void {
    // 1. Brute Force Detection
    this.registerRule({
      id: 'rule_brute_force',
      name: 'Brute Force Attack',
      description: 'Detects multiple failed login attempts followed by success',
      priority: CorrelationPriority.HIGH,
      enabled: true,
      conditions: [
        {
          type: 'time',
          config: {
            windowType: '15m',
            eventSequence: ['failed_login', 'successful_login'],
            frequencyThreshold: 5
          },
          threshold: 5
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 75,
          enrichment: { attackType: 'brute_force' }
        }
      ],
      ttlSeconds: 900,
      deduplicationWindow: 300
    })

    // 2. Lateral Movement Detection
    this.registerRule({
      id: 'rule_lateral_movement',
      name: 'Lateral Movement',
      description: 'Detects failed access attempts to multiple systems from same source',
      priority: CorrelationPriority.HIGH,
      enabled: true,
      conditions: [
        {
          type: 'entity',
          config: {
            groupByType: 'ip',
            anomalyIndicators: ['failed_access'],
            velocityWindow: 900,
            velocityThreshold: 5
          },
          threshold: 3
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 80,
          enrichment: { attackType: 'lateral_movement' }
        }
      ],
      ttlSeconds: 900,
      deduplicationWindow: 300
    })

    // 3. Data Exfiltration Detection
    this.registerRule({
      id: 'rule_data_exfiltration',
      name: 'Data Exfiltration',
      description: 'Detects large data transfer followed by account changes',
      priority: CorrelationPriority.CRITICAL,
      enabled: true,
      conditions: [
        {
          type: 'pattern',
          config: {
            patterns: [
              {
                name: 'large_transfer',
                fieldName: 'data_size',
                pattern: '^[0-9]{9,}$',
                severity: 70,
                weight: 40
              },
              {
                name: 'account_delete',
                fieldName: 'action',
                pattern: 'delete_account|disable_mfa',
                severity: 85,
                weight: 60
              }
            ]
          }
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 95,
          enrichment: { attackType: 'data_exfiltration' }
        }
      ],
      ttlSeconds: 3600,
      deduplicationWindow: 600
    })

    // 4. Privilege Escalation Detection
    this.registerRule({
      id: 'rule_privilege_escalation',
      name: 'Privilege Escalation',
      description: 'Detects failed privilege attempts followed by admin access',
      priority: CorrelationPriority.HIGH,
      enabled: true,
      conditions: [
        {
          type: 'time',
          config: {
            windowType: '5m',
            eventSequence: ['privilege_denial', 'admin_access'],
            frequencyThreshold: 1
          },
          threshold: 2
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 85,
          enrichment: { attackType: 'privilege_escalation' }
        }
      ],
      ttlSeconds: 300,
      deduplicationWindow: 300
    })

    // 5. Account Takeover Detection
    this.registerRule({
      id: 'rule_account_takeover',
      name: 'Account Takeover',
      description: 'Detects login from new location + password change + MFA disable',
      priority: CorrelationPriority.CRITICAL,
      enabled: true,
      conditions: [
        {
          type: 'pattern',
          config: {
            patterns: [
              {
                name: 'new_location_login',
                fieldName: 'login_location',
                pattern: 'new_location|unusual_country',
                severity: 60,
                weight: 30
              },
              {
                name: 'mfa_disabled',
                fieldName: 'action',
                pattern: 'mfa_disabled|mfa_bypass',
                severity: 90,
                weight: 70
              }
            ]
          }
        }
      ],
      actions: [
        {
          type: 'escalate',
          severity: 95,
          enrichment: { attackType: 'account_takeover', action: 'force_mfa' }
        }
      ],
      ttlSeconds: 600,
      deduplicationWindow: 600
    })

    // 6. Reconnaissance Detection
    this.registerRule({
      id: 'rule_reconnaissance',
      name: 'Reconnaissance Activity',
      description: 'Detects port scanning followed by vulnerability exploitation',
      priority: CorrelationPriority.MEDIUM,
      enabled: true,
      conditions: [
        {
          type: 'entity',
          config: {
            groupByType: 'ip',
            anomalyIndicators: ['port_scan'],
            velocityWindow: 600,
            velocityThreshold: 50
          },
          threshold: 1
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 70,
          enrichment: { attackType: 'reconnaissance' }
        }
      ],
      ttlSeconds: 600,
      deduplicationWindow: 300
    })

    // 7. Malware Infection Detection
    this.registerRule({
      id: 'rule_malware_infection',
      name: 'Malware Infection',
      description: 'Detects suspicious download + process execution + C&C communication',
      priority: CorrelationPriority.CRITICAL,
      enabled: true,
      conditions: [
        {
          type: 'pattern',
          config: {
            patterns: [
              {
                name: 'suspicious_download',
                fieldName: 'action',
                pattern: 'download.*\\.exe|\\.dll|\\.sh',
                severity: 70,
                weight: 30
              },
              {
                name: 'process_execution',
                fieldName: 'process_name',
                pattern: 'svchost|explorer|cmd|powershell',
                severity: 75,
                weight: 40
              },
              {
                name: 'c2_communication',
                fieldName: 'destination_ip',
                pattern: 'malware_ip_list',
                severity: 95,
                weight: 70
              }
            ]
          }
        }
      ],
      actions: [
        {
          type: 'isolate',
          severity: 100,
          enrichment: { attackType: 'malware_infection', action: 'isolate_immediately' }
        }
      ],
      ttlSeconds: 1800,
      deduplicationWindow: 900
    })

    // 8. Insider Threat Detection
    this.registerRule({
      id: 'rule_insider_threat',
      name: 'Insider Threat',
      description: 'Detects off-hours access + unusual data access + download spike',
      priority: CorrelationPriority.CRITICAL,
      enabled: true,
      conditions: [
        {
          type: 'statistical',
          config: {
            baselineWindow: 604800, // 7 days
            deviationMultiplier: 3,
            rareEventThreshold: 95
          },
          threshold: 2
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 85,
          enrichment: { attackType: 'insider_threat' }
        }
      ],
      ttlSeconds: 3600,
      deduplicationWindow: 600
    })

    // 9. Credential Theft Detection
    this.registerRule({
      id: 'rule_credential_theft',
      name: 'Credential Theft',
      description: 'Detects multiple login failures across services + credential dump',
      priority: CorrelationPriority.HIGH,
      enabled: true,
      conditions: [
        {
          type: 'time',
          config: {
            windowType: '5m',
            eventSequence: ['failed_login', 'credential_dump'],
            frequencyThreshold: 1
          },
          threshold: 2
        }
      ],
      actions: [
        {
          type: 'escalate',
          severity: 90,
          enrichment: { attackType: 'credential_theft', action: 'reset_all_passwords' }
        }
      ],
      ttlSeconds: 600,
      deduplicationWindow: 300
    })

    // 10. Supply Chain Attack Detection
    this.registerRule({
      id: 'rule_supply_chain',
      name: 'Supply Chain Attack',
      description: 'Detects dependency update + backdoor installation + exfiltration',
      priority: CorrelationPriority.CRITICAL,
      enabled: true,
      conditions: [
        {
          type: 'pattern',
          config: {
            patterns: [
              {
                name: 'dependency_update',
                fieldName: 'package_name',
                pattern: 'package_update|npm_install|pip_install',
                severity: 40,
                weight: 20
              },
              {
                name: 'backdoor_install',
                fieldName: 'process_name',
                pattern: 'init\\.d|systemd|cron|launchd',
                severity: 95,
                weight: 80
              }
            ]
          }
        }
      ],
      actions: [
        {
          type: 'isolate',
          severity: 100,
          enrichment: { attackType: 'supply_chain', action: 'quarantine_immediately' }
        }
      ],
      ttlSeconds: 3600,
      deduplicationWindow: 900
    })

    // 11. DDoS Attack Detection
    this.registerRule({
      id: 'rule_ddos',
      name: 'DDoS Attack',
      description: 'Detects abnormal traffic spike from multiple IPs',
      priority: CorrelationPriority.HIGH,
      enabled: true,
      conditions: [
        {
          type: 'statistical',
          config: {
            baselineWindow: 3600,
            deviationMultiplier: 5,
            rareEventThreshold: 99
          },
          threshold: 1
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 80,
          enrichment: { attackType: 'ddos' }
        }
      ],
      ttlSeconds: 300,
      deduplicationWindow: 60
    })

    // 12. SQL Injection Detection
    this.registerRule({
      id: 'rule_sql_injection',
      name: 'SQL Injection Attempt',
      description: 'Detects SQL injection patterns in requests',
      priority: CorrelationPriority.HIGH,
      enabled: true,
      conditions: [
        {
          type: 'pattern',
          config: {
            patterns: [
              {
                name: 'sql_keywords',
                fieldName: 'request_body',
                pattern: "SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR\\s*1\\s*=\\s*1",
                severity: 85,
                weight: 100
              }
            ]
          }
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 85,
          enrichment: { attackType: 'sql_injection' }
        }
      ],
      ttlSeconds: 300,
      deduplicationWindow: 60
    })

    // 13. Zero-Day Exploitation Detection
    this.registerRule({
      id: 'rule_zero_day',
      name: 'Zero-Day Exploitation',
      description: 'Detects exploitation of unpatched vulnerabilities',
      priority: CorrelationPriority.CRITICAL,
      enabled: true,
      conditions: [
        {
          type: 'pattern',
          config: {
            patterns: [
              {
                name: 'exploit_attempt',
                fieldName: 'raw',
                pattern: 'CVE-|exploit|shellcode|payload',
                severity: 95,
                weight: 100
              }
            ]
          }
        }
      ],
      actions: [
        {
          type: 'isolate',
          severity: 100,
          enrichment: { attackType: 'zero_day', action: 'emergency_response' }
        }
      ],
      ttlSeconds: 3600,
      deduplicationWindow: 300
    })

    // 14. Ransomware Detection
    this.registerRule({
      id: 'rule_ransomware',
      name: 'Ransomware Activity',
      description: 'Detects file encryption + ransom note + C&C communication',
      priority: CorrelationPriority.CRITICAL,
      enabled: true,
      conditions: [
        {
          type: 'pattern',
          config: {
            patterns: [
              {
                name: 'file_encryption',
                fieldName: 'action',
                pattern: 'file_encrypted|\\.locked|\\.crypto',
                severity: 90,
                weight: 50
              },
              {
                name: 'ransom_note',
                fieldName: 'file_created',
                pattern: 'README\\.txt|DECRYPT\\.txt|ransom',
                severity: 100,
                weight: 100
              }
            ]
          }
        }
      ],
      actions: [
        {
          type: 'isolate',
          severity: 100,
          enrichment: { attackType: 'ransomware', action: 'emergency_isolation' }
        }
      ],
      ttlSeconds: 1800,
      deduplicationWindow: 600
    })

    // 15. Man-in-the-Middle (MITM) Detection
    this.registerRule({
      id: 'rule_mitm',
      name: 'Man-in-the-Middle Attack',
      description: 'Detects SSL/TLS certificate anomalies and traffic interception',
      priority: CorrelationPriority.HIGH,
      enabled: true,
      conditions: [
        {
          type: 'pattern',
          config: {
            patterns: [
              {
                name: 'cert_mismatch',
                fieldName: 'ssl_certificate',
                pattern: 'mismatch|invalid|untrusted|self-signed',
                severity: 80,
                weight: 60
              },
              {
                name: 'traffic_anomaly',
                fieldName: 'traffic_pattern',
                pattern: 'unusual_routing|arp_spoofing|dns_hijacking',
                severity: 85,
                weight: 70
              }
            ]
          }
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 85,
          enrichment: { attackType: 'mitm' }
        }
      ],
      ttlSeconds: 600,
      deduplicationWindow: 300
    })
  }
}

// ============================================================================
// Exports
// ============================================================================

export default CorrelationEngine
