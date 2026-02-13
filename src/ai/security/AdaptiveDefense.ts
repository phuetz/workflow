/**
 * Adaptive Defense System
 * Dynamically responds to threats with escalating defense mechanisms
 */

import { EventEmitter } from 'events'

/**
 * Threat types detected by the security system
 */
export enum ThreatType {
  DDOS = 'ddos',
  BRUTE_FORCE = 'brute_force',
  DATA_EXFILTRATION = 'data_exfiltration',
  MALWARE = 'malware',
  INSIDER_THREAT = 'insider_threat',
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  POLICY_VIOLATION = 'policy_violation'
}

/**
 * Defense levels with increasing severity
 */
export enum DefenseLevel {
  NORMAL = 1,
  ELEVATED = 2,
  HIGH = 3,
  CRITICAL = 4,
  EMERGENCY = 5
}

/**
 * Defense configuration for each level
 */
interface LevelConfig {
  rateLimitRequests: number
  rateLimitWindow: number // milliseconds
  authStepUpRequired: boolean
  authStepUpMethods: string[]
  permissionReduction: number // percentage
  loggingLevel: 'basic' | 'detailed' | 'extensive'
  encryptionLevel: 'standard' | 'strong' | 'maximum'
  accessDenialRate: number // percentage of requests to deny
  quarantineThreshold: number // requests before action
}

/**
 * Threat intelligence record
 */
interface ThreatIntelligence {
  type: ThreatType
  severity: number // 1-10
  sourceIPs: Set<string>
  sourceUsers: Set<string>
  timestamp: number
  count: number
  lastSeen: number
  patterns: string[]
  indicators: Record<string, number>
}

/**
 * Defense action record
 */
interface DefenseAction {
  id: string
  type: string
  threatType: ThreatType
  level: DefenseLevel
  timestamp: number
  duration: number
  status: 'active' | 'completed' | 'failed'
  effectiveness: number
  targetIPs: string[]
  targetUsers: string[]
  metrics: Record<string, number>
}

/**
 * Adaptive defense configuration
 */
interface AdaptiveDefenseConfig {
  baseLevelConfigs?: Partial<Record<DefenseLevel, Partial<LevelConfig>>>
  threatThresholds?: Record<ThreatType, number>
  autoEscalation?: boolean
  autoDeescalation?: boolean
  deescalationDelay?: number
  maxConcurrentDefenses?: number
  enableLearning?: boolean
  learningSampleSize?: number
}

/**
 * Defense effectiveness metrics
 */
interface DefenseMetrics {
  defenseEffectiveness: number
  attackMitigationRate: number
  averageResponseTime: number
  falsePositiveRate: number
  resourceUtilization: number
  successfulDefenses: number
  failedDefenses: number
  partialDefenses: number
}

/**
 * Adaptive Defense System
 * Implements threat-aware, multi-level defense with learning capabilities
 */
export class AdaptiveDefense extends EventEmitter {
  private currentLevel: DefenseLevel = DefenseLevel.NORMAL
  private levelConfigs: Record<DefenseLevel, LevelConfig>
  private threatIntelligence: Map<ThreatType, ThreatIntelligence> = new Map()
  private activeDefenses: Map<string, DefenseAction> = new Map()
  private threatThresholds: Record<ThreatType, number>
  private autoEscalation: boolean
  private autoDeescalation: boolean
  private deescalationDelay: number
  private maxConcurrentDefenses: number
  private enableLearning: boolean
  private learningSampleSize: number
  private defenseHistory: DefenseAction[] = []
  private responsePatterns: Map<ThreatType, number[]> = new Map()
  private lastDeescalationCheck: number = 0

  constructor(config: AdaptiveDefenseConfig = {}) {
    super()

    this.levelConfigs = this.initializeLevelConfigs(config.baseLevelConfigs)
    this.threatThresholds = config.threatThresholds || this.initializeThresholds()
    this.autoEscalation = config.autoEscalation ?? true
    this.autoDeescalation = config.autoDeescalation ?? true
    this.deescalationDelay = config.deescalationDelay ?? 300000 // 5 minutes
    this.maxConcurrentDefenses = config.maxConcurrentDefenses ?? 10
    this.enableLearning = config.enableLearning ?? true
    this.learningSampleSize = config.learningSampleSize ?? 100

    this.initializeResponsePatterns()
    this.startAutoDeescalation()
  }

  /**
   * Initialize default level configurations
   */
  private initializeLevelConfigs(
    overrides?: Partial<Record<DefenseLevel, Partial<LevelConfig>>>
  ): Record<DefenseLevel, LevelConfig> {
    const defaults: Record<DefenseLevel, LevelConfig> = {
      [DefenseLevel.NORMAL]: {
        rateLimitRequests: 1000,
        rateLimitWindow: 60000,
        authStepUpRequired: false,
        authStepUpMethods: [],
        permissionReduction: 0,
        loggingLevel: 'basic',
        encryptionLevel: 'standard',
        accessDenialRate: 0,
        quarantineThreshold: 100
      },
      [DefenseLevel.ELEVATED]: {
        rateLimitRequests: 500,
        rateLimitWindow: 60000,
        authStepUpRequired: true,
        authStepUpMethods: ['mfa'],
        permissionReduction: 10,
        loggingLevel: 'detailed',
        encryptionLevel: 'standard',
        accessDenialRate: 5,
        quarantineThreshold: 50
      },
      [DefenseLevel.HIGH]: {
        rateLimitRequests: 200,
        rateLimitWindow: 60000,
        authStepUpRequired: true,
        authStepUpMethods: ['mfa', 'biometric'],
        permissionReduction: 30,
        loggingLevel: 'detailed',
        encryptionLevel: 'strong',
        accessDenialRate: 15,
        quarantineThreshold: 20
      },
      [DefenseLevel.CRITICAL]: {
        rateLimitRequests: 50,
        rateLimitWindow: 60000,
        authStepUpRequired: true,
        authStepUpMethods: ['mfa', 'biometric', 'hardware_key'],
        permissionReduction: 60,
        loggingLevel: 'extensive',
        encryptionLevel: 'strong',
        accessDenialRate: 40,
        quarantineThreshold: 5
      },
      [DefenseLevel.EMERGENCY]: {
        rateLimitRequests: 10,
        rateLimitWindow: 60000,
        authStepUpRequired: true,
        authStepUpMethods: ['mfa', 'biometric', 'hardware_key', 'manual_approval'],
        permissionReduction: 90,
        loggingLevel: 'extensive',
        encryptionLevel: 'maximum',
        accessDenialRate: 80,
        quarantineThreshold: 1
      }
    }

    if (overrides) {
      Object.entries(overrides).forEach(([level, override]) => {
        defaults[Number(level) as DefenseLevel] = {
          ...defaults[Number(level) as DefenseLevel],
          ...override
        }
      })
    }

    return defaults
  }

  /**
   * Initialize threat thresholds
   */
  private initializeThresholds(): Record<ThreatType, number> {
    return {
      [ThreatType.DDOS]: 1000,
      [ThreatType.BRUTE_FORCE]: 10,
      [ThreatType.DATA_EXFILTRATION]: 5,
      [ThreatType.MALWARE]: 1,
      [ThreatType.INSIDER_THREAT]: 3,
      [ThreatType.SQL_INJECTION]: 5,
      [ThreatType.XSS]: 10,
      [ThreatType.UNAUTHORIZED_ACCESS]: 15,
      [ThreatType.ANOMALOUS_BEHAVIOR]: 8,
      [ThreatType.POLICY_VIOLATION]: 20
    }
  }

  /**
   * Initialize response patterns for each threat type
   */
  private initializeResponsePatterns(): void {
    Object.values(ThreatType).forEach(threatType => {
      this.responsePatterns.set(threatType, [])
    })
  }

  /**
   * Analyze threat and escalate defense if needed
   */
  async analyzeThreat(
    threatType: ThreatType,
    severity: number,
    context: {
      sourceIP?: string
      sourceUser?: string
      indicators?: Record<string, number>
      patterns?: string[]
    }
  ): Promise<DefenseLevel> {
    const timestamp = Date.now()

    // Update threat intelligence
    let threat = this.threatIntelligence.get(threatType)
    if (!threat) {
      threat = {
        type: threatType,
        severity: 0,
        sourceIPs: new Set(),
        sourceUsers: new Set(),
        timestamp,
        count: 0,
        lastSeen: timestamp,
        patterns: [],
        indicators: {}
      }
      this.threatIntelligence.set(threatType, threat)
    }

    threat.count++
    threat.severity = Math.max(threat.severity, severity)
    threat.lastSeen = timestamp

    if (context.sourceIP) {
      threat.sourceIPs.add(context.sourceIP)
    }
    if (context.sourceUser) {
      threat.sourceUsers.add(context.sourceUser)
    }
    if (context.patterns) {
      threat.patterns.push(...context.patterns)
    }
    if (context.indicators) {
      Object.entries(context.indicators).forEach(([key, value]) => {
        threat!.indicators[key] = (threat!.indicators[key] || 0) + value
      })
    }

    // Store response pattern
    const patterns = this.responsePatterns.get(threatType) || []
    patterns.push(severity)
    if (patterns.length > this.learningSampleSize) {
      patterns.shift()
    }

    // Determine new defense level
    let newLevel = this.currentLevel
    if (this.autoEscalation) {
      newLevel = this.calculateDefenseLevel(threat)
    }

    // Escalate if needed
    if (newLevel > this.currentLevel) {
      await this.escalateDefense(newLevel, threatType, context)
    }

    this.emit('threat_detected', {
      threatType,
      severity,
      currentLevel: this.currentLevel,
      newLevel,
      context
    })

    return this.currentLevel
  }

  /**
   * Calculate appropriate defense level based on threat
   */
  private calculateDefenseLevel(threat: ThreatIntelligence): DefenseLevel {
    const threshold = this.threatThresholds[threat.type]
    const severity = threat.severity
    const count = threat.count

    // Multi-factor scoring
    const severityScore = (severity / 10) * 0.4
    const countScore = Math.min(count / threshold, 1) * 0.4
    const recencyScore = this.calculateRecencyScore(threat.lastSeen) * 0.2

    const totalScore = severityScore + countScore + recencyScore

    if (totalScore >= 0.9) return DefenseLevel.EMERGENCY
    if (totalScore >= 0.7) return DefenseLevel.CRITICAL
    if (totalScore >= 0.5) return DefenseLevel.HIGH
    if (totalScore >= 0.3) return DefenseLevel.ELEVATED
    return DefenseLevel.NORMAL
  }

  /**
   * Calculate recency score (more recent = higher score)
   */
  private calculateRecencyScore(lastSeen: number): number {
    const now = Date.now()
    const age = now - lastSeen
    const decayFactor = Math.exp(-age / 300000) // 5-minute half-life
    return decayFactor
  }

  /**
   * Escalate defense to specified level
   */
  async escalateDefense(
    level: DefenseLevel,
    threatType: ThreatType,
    context: any
  ): Promise<void> {
    if (level <= this.currentLevel) return

    const previousLevel = this.currentLevel
    this.currentLevel = level

    const defenseId = `defense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const defense: DefenseAction = {
      id: defenseId,
      type: 'escalation',
      threatType,
      level,
      timestamp: Date.now(),
      duration: 0,
      status: 'active',
      effectiveness: 0,
      targetIPs: Array.from(this.threatIntelligence.get(threatType)?.sourceIPs || []),
      targetUsers: Array.from(this.threatIntelligence.get(threatType)?.sourceUsers || []),
      metrics: {}
    }

    this.activeDefenses.set(defenseId, defense)

    // Apply defense mechanisms
    await this.applyDefenseMechanisms(level, threatType, context)

    this.emit('defense_escalated', {
      from: previousLevel,
      to: level,
      threatType,
      defenseId
    })
  }

  /**
   * Apply defensive mechanisms for given level
   */
  private async applyDefenseMechanisms(
    level: DefenseLevel,
    threatType: ThreatType,
    context: any
  ): Promise<void> {
    const config = this.levelConfigs[level]

    // Attack-specific defenses
    switch (threatType) {
      case ThreatType.DDOS:
        await this.activateDDoSDefense(level, context)
        break
      case ThreatType.BRUTE_FORCE:
        await this.activateBruteForceDefense(level, context)
        break
      case ThreatType.DATA_EXFILTRATION:
        await this.activateDataLossDefense(level, context)
        break
      case ThreatType.MALWARE:
        await this.activateMalwareDefense(level, context)
        break
      case ThreatType.INSIDER_THREAT:
        await this.activateInsiderThreatDefense(level, context)
        break
    }

    // General adaptive mechanisms
    await this.adaptRateLimiting(level, config)
    await this.adaptAuthentication(level, config)
    await this.adaptAccessControl(level, config)
    await this.adaptLogging(level, config)
    await this.adaptEncryption(level, config)
  }

  /**
   * Activate DDoS-specific defenses
   */
  private async activateDDoSDefense(level: DefenseLevel, context: any): Promise<void> {
    const config = this.levelConfigs[level]

    const actions: string[] = []

    if (level >= DefenseLevel.ELEVATED) {
      actions.push('enable_traffic_shaping')
    }
    if (level >= DefenseLevel.HIGH) {
      actions.push('enable_geo_blocking')
      actions.push('activate_cdn')
    }
    if (level >= DefenseLevel.CRITICAL) {
      actions.push('enable_ip_reputation_filtering')
      actions.push('activate_waf')
    }
    if (level >= DefenseLevel.EMERGENCY) {
      actions.push('enable_network_isolation')
      actions.push('activate_incident_response')
    }

    for (const action of actions) {
      this.emit('defense_action', {
        action,
        threatType: ThreatType.DDOS,
        level,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Activate brute force defenses
   */
  private async activateBruteForceDefense(level: DefenseLevel, context: any): Promise<void> {
    const actions: string[] = []

    if (level >= DefenseLevel.ELEVATED) {
      actions.push('progressive_delay_increase')
    }
    if (level >= DefenseLevel.HIGH) {
      actions.push('require_captcha')
      actions.push('account_lockdown')
    }
    if (level >= DefenseLevel.CRITICAL) {
      actions.push('require_mfa')
      actions.push('block_new_sessions')
    }
    if (level >= DefenseLevel.EMERGENCY) {
      actions.push('require_manual_verification')
      actions.push('notify_security_team')
    }

    for (const action of actions) {
      this.emit('defense_action', {
        action,
        threatType: ThreatType.BRUTE_FORCE,
        level,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Activate data loss prevention
   */
  private async activateDataLossDefense(level: DefenseLevel, context: any): Promise<void> {
    const actions: string[] = []

    if (level >= DefenseLevel.HIGH) {
      actions.push('dlp_scan_enabled')
      actions.push('block_large_transfers')
    }
    if (level >= DefenseLevel.CRITICAL) {
      actions.push('quarantine_suspicious_data')
      actions.push('disable_exports')
      actions.push('enable_data_classification')
    }
    if (level >= DefenseLevel.EMERGENCY) {
      actions.push('network_isolation')
      actions.push('disable_external_access')
    }

    for (const action of actions) {
      this.emit('defense_action', {
        action,
        threatType: ThreatType.DATA_EXFILTRATION,
        level,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Activate malware defenses
   */
  private async activateMalwareDefense(level: DefenseLevel, context: any): Promise<void> {
    const actions: string[] = []

    if (level >= DefenseLevel.NORMAL) {
      actions.push('enhanced_scanning')
    }
    if (level >= DefenseLevel.HIGH) {
      actions.push('quarantine_suspect_files')
      actions.push('isolate_infected_systems')
    }
    if (level >= DefenseLevel.CRITICAL) {
      actions.push('full_system_scan')
      actions.push('network_segment_isolation')
    }
    if (level >= DefenseLevel.EMERGENCY) {
      actions.push('full_isolation')
      actions.push('forensic_mode')
    }

    for (const action of actions) {
      this.emit('defense_action', {
        action,
        threatType: ThreatType.MALWARE,
        level,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Activate insider threat defenses
   */
  private async activateInsiderThreatDefense(level: DefenseLevel, context: any): Promise<void> {
    const actions: string[] = []

    if (level >= DefenseLevel.ELEVATED) {
      actions.push('enhanced_user_monitoring')
    }
    if (level >= DefenseLevel.HIGH) {
      actions.push('behavior_analytics')
      actions.push('restrict_permissions')
    }
    if (level >= DefenseLevel.CRITICAL) {
      actions.push('session_termination')
      actions.push('account_suspension')
    }
    if (level >= DefenseLevel.EMERGENCY) {
      actions.push('immediate_disable')
      actions.push('forensic_capture')
    }

    for (const action of actions) {
      this.emit('defense_action', {
        action,
        threatType: ThreatType.INSIDER_THREAT,
        level,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Adapt rate limiting based on defense level
   */
  private async adaptRateLimiting(
    level: DefenseLevel,
    config: LevelConfig
  ): Promise<void> {
    this.emit('rate_limit_update', {
      requests: config.rateLimitRequests,
      window: config.rateLimitWindow,
      level
    })
  }

  /**
   * Adapt authentication requirements
   */
  private async adaptAuthentication(
    level: DefenseLevel,
    config: LevelConfig
  ): Promise<void> {
    if (config.authStepUpRequired) {
      this.emit('auth_stepup_required', {
        methods: config.authStepUpMethods,
        level
      })
    }
  }

  /**
   * Adapt access control
   */
  private async adaptAccessControl(
    level: DefenseLevel,
    config: LevelConfig
  ): Promise<void> {
    this.emit('access_control_update', {
      permissionReduction: config.permissionReduction,
      accessDenialRate: config.accessDenialRate,
      level
    })
  }

  /**
   * Adapt logging detail level
   */
  private async adaptLogging(level: DefenseLevel, config: LevelConfig): Promise<void> {
    this.emit('logging_level_update', {
      level: config.loggingLevel,
      defenseLevel: level
    })
  }

  /**
   * Adapt encryption strength
   */
  private async adaptEncryption(level: DefenseLevel, config: LevelConfig): Promise<void> {
    this.emit('encryption_update', {
      level: config.encryptionLevel,
      defenseLevel: level
    })
  }

  /**
   * Auto-deescalation timer
   */
  private startAutoDeescalation(): void {
    setInterval(() => {
      if (!this.autoDeescalation) return

      const now = Date.now()
      const timeSinceLastCheck = now - this.lastDeescalationCheck

      if (timeSinceLastCheck < this.deescalationDelay) return

      this.lastDeescalationCheck = now

      // Check threat status
      let maxThreatLevel = DefenseLevel.NORMAL
      for (const threat of this.threatIntelligence.values()) {
        const threatLevel = this.calculateDefenseLevel(threat)
        maxThreatLevel = Math.max(maxThreatLevel, threatLevel)
      }

      // Deescalate if appropriate
      if (maxThreatLevel < this.currentLevel) {
        this.deescalateDefense(maxThreatLevel)
      }
    }, 60000) // Check every minute
  }

  /**
   * Deescalate defense level
   */
  private deescalateDefense(newLevel: DefenseLevel): void {
    if (newLevel >= this.currentLevel) return

    const previousLevel = this.currentLevel
    this.currentLevel = newLevel

    // Update active defenses
    for (const defense of this.activeDefenses.values()) {
      if (defense.status === 'active') {
        defense.status = 'completed'
        defense.duration = Date.now() - defense.timestamp
      }
    }

    this.emit('defense_deescalated', {
      from: previousLevel,
      to: newLevel,
      timestamp: Date.now()
    })
  }

  /**
   * Get current defense metrics
   */
  getMetrics(): DefenseMetrics {
    const completedDefenses = Array.from(this.activeDefenses.values()).filter(
      d => d.status === 'completed'
    )

    const successfulDefenses = completedDefenses.filter(d => d.effectiveness > 0.7).length
    const partialDefenses = completedDefenses.filter(
      d => d.effectiveness > 0.3 && d.effectiveness <= 0.7
    ).length
    const failedDefenses = completedDefenses.filter(d => d.effectiveness <= 0.3).length

    const avgResponseTime =
      completedDefenses.length > 0
        ? completedDefenses.reduce((sum, d) => sum + d.duration, 0) / completedDefenses.length
        : 0

    return {
      defenseEffectiveness:
        completedDefenses.length > 0
          ? completedDefenses.reduce((sum, d) => sum + d.effectiveness, 0) /
            completedDefenses.length
          : 0,
      attackMitigationRate:
        completedDefenses.length > 0
          ? (successfulDefenses + partialDefenses * 0.5) / completedDefenses.length
          : 0,
      averageResponseTime: avgResponseTime,
      falsePositiveRate: this.calculateFalsePositiveRate(),
      resourceUtilization: this.calculateResourceUtilization(),
      successfulDefenses,
      failedDefenses,
      partialDefenses
    }
  }

  /**
   * Calculate false positive rate
   */
  private calculateFalsePositiveRate(): number {
    if (this.defenseHistory.length === 0) return 0
    const falsePositives = this.defenseHistory.filter(d => d.effectiveness < 0.2).length
    return falsePositives / this.defenseHistory.length
  }

  /**
   * Calculate resource utilization
   */
  private calculateResourceUtilization(): number {
    const activeDefensesCount = Array.from(this.activeDefenses.values()).filter(
      d => d.status === 'active'
    ).length
    return (activeDefensesCount / this.maxConcurrentDefenses) * 100
  }

  /**
   * Record defense effectiveness
   */
  recordDefenseEffectiveness(defenseId: string, effectiveness: number): void {
    const defense = this.activeDefenses.get(defenseId)
    if (defense) {
      defense.effectiveness = Math.min(Math.max(effectiveness, 0), 1)
      this.defenseHistory.push(defense)

      if (this.enableLearning) {
        this.optimizeDefenseParameters(defense)
      }
    }
  }

  /**
   * Optimize defense parameters based on effectiveness
   */
  private optimizeDefenseParameters(defense: DefenseAction): void {
    if (defense.effectiveness >= 0.8) {
      // Defense was very effective, maintain current strategy
      return
    }

    if (defense.effectiveness < 0.4) {
      // Defense was ineffective, try escalating further
      const nextLevel = Math.min(defense.level + 1, DefenseLevel.EMERGENCY)
      if (nextLevel > defense.level) {
        this.emit('defense_optimization', {
          defenseId: defense.id,
          recommendation: 'escalate',
          nextLevel,
          currentEffectiveness: defense.effectiveness
        })
      }
    }
  }

  /**
   * Get current defense level
   */
  getCurrentLevel(): DefenseLevel {
    return this.currentLevel
  }

  /**
   * Get threat intelligence summary
   */
  getThreatSummary(): {
    activeThreats: number
    highestSeverity: number
    topThreats: Array<{ type: ThreatType; count: number; severity: number }>
  } {
    const threats = Array.from(this.threatIntelligence.values())
    const topThreats = threats
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(t => ({
        type: t.type,
        count: t.count,
        severity: t.severity
      }))

    return {
      activeThreats: threats.length,
      highestSeverity: Math.max(...threats.map(t => t.severity), 0),
      topThreats
    }
  }

  /**
   * Force defense level (for testing/manual intervention)
   */
  forceDefenseLevel(level: DefenseLevel): void {
    if (level !== this.currentLevel) {
      const previousLevel = this.currentLevel
      this.currentLevel = level

      this.emit('defense_level_forced', {
        from: previousLevel,
        to: level,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Reset defense system
   */
  reset(): void {
    this.currentLevel = DefenseLevel.NORMAL
    this.threatIntelligence.clear()
    this.activeDefenses.clear()
    this.defenseHistory = []
    this.lastDeescalationCheck = 0

    this.emit('defense_reset', {
      timestamp: Date.now()
    })
  }
}

export default AdaptiveDefense
