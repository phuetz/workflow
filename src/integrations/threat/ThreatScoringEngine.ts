/**
 * Threat Scoring and Risk Assessment Engine
 *
 * Provides comprehensive threat intelligence scoring with multiple calculation models,
 * risk assessment frameworks, and real-time scoring capabilities for security operations.
 *
 * @module ThreatScoringEngine
 */

/**
 * Supported IOC (Indicator of Compromise) types
 */
export enum IOCType {
  HASH = 'hash',
  DOMAIN = 'domain',
  IP = 'ip',
  URL = 'url',
  EMAIL = 'email',
  FILE_PATH = 'file_path',
  REGISTRY_KEY = 'registry_key',
  MUTEX = 'mutex',
  C2_COMMUNICATION = 'c2_communication'
}

/**
 * Source reliability ratings
 */
export enum SourceReliability {
  UNKNOWN = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  VERIFIED = 5
}

/**
 * Risk severity levels
 */
export enum RiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

/**
 * Scoring model types
 */
export enum ScoringModel {
  WEIGHTED_AVERAGE = 'weighted_average',
  MACHINE_LEARNING = 'machine_learning',
  RULE_BASED = 'rule_based'
}

/**
 * Indicator of Compromise metadata
 */
export interface IOCData {
  type: IOCType
  value: string
  sourceReliability: SourceReliability
  confidence: number // 0-1
  firstSeen: Date
  lastSeen: Date
  age: number // days
}

/**
 * Campaign information associated with IOC
 */
export interface CampaignContext {
  name: string
  severity: number // 0-100
  aptGroupAttribution?: string
  targetedIndustries: string[]
  geographicTargets: string[]
  techniques: string[] // MITRE ATT&CK techniques
}

/**
 * Behavioral indicators for threat assessment
 */
export interface BehavioralIndicators {
  activityVolume: number // 0-100
  attackComplexity: number // 0-100
  evasionTechniques: string[]
  persistenceIndicators: string[]
  c2CommunicationPatterns: string[]
}

/**
 * Impact assessment data
 */
export interface ImpactAssessment {
  dataExposurePotential: number // 0-100
  businessCriticalityOfTarget: number // 0-100
  lateralMovementPotential: number // 0-100
  recoveryDifficulty: number // 0-100
}

/**
 * Scoring dimension weights configuration
 */
export interface ScoringWeights {
  iocSeverity: number
  context: number
  behavioral: number
  impact: number
}

/**
 * Scoring dimensions calculation
 */
export interface ScoringDimensions {
  iocSeverityScore: number
  contextScore: number
  behavioralScore: number
  impactScore: number
}

/**
 * Complete threat score result
 */
export interface ThreatScore {
  overallScore: number // 0-100
  dimensions: ScoringDimensions
  riskLevel: RiskLevel
  confidence: number // 0-1
  calculatedAt: Date
  modelUsed: ScoringModel
  explanation: string
}

/**
 * Risk matrix entry for likelihood and impact
 */
export interface RiskMatrix {
  likelihood: number // 0-100
  impact: number // 0-100
  riskLevel: RiskLevel
  mitigationRequired: boolean
}

/**
 * Risk threshold configuration
 */
export interface RiskThresholds {
  critical: number // score >= this is critical
  high: number
  medium: number
  low: number
}

/**
 * Scoring rule for rule-based model
 */
export interface ScoringRule {
  id: string
  name: string
  priority: number
  condition: (score: ScoringDimensions) => boolean
  scoreAdjustment: number // -100 to +100
  description: string
}

/**
 * Historical score entry for trend analysis
 */
export interface ScoreHistory {
  ioc: string
  score: number
  riskLevel: RiskLevel
  timestamp: Date
  dimensions: ScoringDimensions
}

/**
 * Feature vector for ML model training
 */
export interface FeatureVector {
  iocType: number
  sourceReliability: number
  confidence: number
  ageDecay: number
  campaignSeverity: number
  aptAttribution: number
  targetIndustryMatch: number
  activityVolume: number
  attackComplexity: number
  evasionTechniqueCount: number
  dataExposurePotential: number
  businessCriticality: number
  lateralMovementPotential: number
  label?: number // 0-100 threat score for training
}

/**
 * ML Model metadata
 */
export interface ModelMetadata {
  version: string
  trainedAt: Date
  accuracy: number
  sampleSize: number
  features: string[]
}

/**
 * Risk assessment report
 */
export interface RiskReport {
  entityId: string
  entityType: string
  overallRisk: number
  riskLevel: RiskLevel
  topThreats: {
    ioc: string
    score: number
    riskLevel: RiskLevel
  }[]
  riskDistribution: Record<RiskLevel, number>
  scoreExplanations: Map<string, string>
  generatedAt: Date
  recommendations: string[]
}

/**
 * Alert generated from score-based routing
 */
export interface ScoredAlert {
  id: string
  ioc: string
  threatScore: ThreatScore
  priority: number // 1-5 (5 highest)
  slaMinutes: number
  shouldEscalate: boolean
  assignedTeam?: string
  createdAt: Date
}

/**
 * Compliance mapping entry
 */
export interface ComplianceMapping {
  framework: string
  requirement: string
  scoreThreshold: number
  requiresApproval: boolean
  auditTrailRequired: boolean
}

/**
 * Main Threat Scoring Engine class
 */
export class ThreatScoringEngine {
  private iocTypeWeights: Record<IOCType, number> = {
    [IOCType.HASH]: 1.0,
    [IOCType.DOMAIN]: 0.8,
    [IOCType.IP]: 0.7,
    [IOCType.URL]: 0.75,
    [IOCType.EMAIL]: 0.6,
    [IOCType.FILE_PATH]: 0.5,
    [IOCType.REGISTRY_KEY]: 0.5,
    [IOCType.MUTEX]: 0.4,
    [IOCType.C2_COMMUNICATION]: 0.9
  }

  private defaultWeights: ScoringWeights = {
    iocSeverity: 0.35,
    context: 0.25,
    behavioral: 0.25,
    impact: 0.15
  }

  private riskThresholds: RiskThresholds = {
    critical: 80,
    high: 60,
    medium: 40,
    low: 20
  }

  private scoreHistory: Map<string, ScoreHistory[]> = new Map()
  private scoringRules: Map<string, ScoringRule> = new Map()
  private complianceMappings: ComplianceMapping[] = []
  private modelMetadata: ModelMetadata | null = null

  /**
   * Calculate IOC Severity Score
   * Considers IOC type, source reliability, confidence, and age
   */
  private calculateIOCSeverityScore(ioc: IOCData): number {
    const typeWeight = this.iocTypeWeights[ioc.type]
    const reliabilityScore = (ioc.sourceReliability / 5) * 100
    const confidenceScore = ioc.confidence * 100

    // Age decay factor: reduces score for older IOCs
    const ageDecayFactor = Math.max(0.3, 1 - (ioc.age / 365) * 0.1)

    const combined = (typeWeight * 30 + reliabilityScore * 0.3 + confidenceScore * 0.4)
    return Math.min(100, combined * ageDecayFactor)
  }

  /**
   * Calculate Context Score
   * Assesses campaign severity, APT attribution, and targeting
   */
  private calculateContextScore(campaign: CampaignContext | null): number {
    if (!campaign) return 0

    const campaignScore = campaign.severity
    const aptBonus = campaign.aptGroupAttribution ? 15 : 0
    const industryCount = Math.min(campaign.targetedIndustries.length * 10, 30)
    const geoCount = Math.min(campaign.geographicTargets.length * 5, 20)

    return Math.min(100, campaignScore * 0.5 + aptBonus + industryCount + geoCount)
  }

  /**
   * Calculate Behavioral Score
   * Evaluates activity patterns, evasion, and persistence
   */
  private calculateBehavioralScore(behavior: BehavioralIndicators): number {
    const activityScore = behavior.activityVolume * 0.4
    const complexityScore = behavior.attackComplexity * 0.3
    const evasionBonus = Math.min(behavior.evasionTechniques.length * 5, 30)
    const persistenceBonus = Math.min(behavior.persistenceIndicators.length * 5, 30)

    return Math.min(100, activityScore + complexityScore + evasionBonus + persistenceBonus)
  }

  /**
   * Calculate Impact Score
   * Assesses potential damage and recovery effort
   */
  private calculateImpactScore(impact: ImpactAssessment): number {
    const exposureScore = impact.dataExposurePotential * 0.35
    const criticalityScore = impact.businessCriticalityOfTarget * 0.3
    const lateralScore = impact.lateralMovementPotential * 0.2
    const recoveryScore = impact.recoveryDifficulty * 0.15

    return Math.min(100, exposureScore + criticalityScore + lateralScore + recoveryScore)
  }

  /**
   * Apply scoring rules to adjust base score
   */
  private applyRulesAdjustment(dimensions: ScoringDimensions, baseScore: number): number {
    let adjustedScore = baseScore
    const applicableRules = Array.from(this.scoringRules.values())
      .filter(rule => rule.condition(dimensions))
      .sort((a, b) => b.priority - a.priority)

    for (const rule of applicableRules) {
      adjustedScore += rule.scoreAdjustment
      adjustedScore = Math.max(0, Math.min(100, adjustedScore))
    }

    return adjustedScore
  }

  /**
   * Calculate threat score using weighted average model
   */
  calculateWeightedScore(
    ioc: IOCData,
    campaign: CampaignContext | null,
    behavior: BehavioralIndicators,
    impact: ImpactAssessment,
    weights?: ScoringWeights
  ): ThreatScore {
    const w = weights || this.defaultWeights

    const dimensions: ScoringDimensions = {
      iocSeverityScore: this.calculateIOCSeverityScore(ioc),
      contextScore: this.calculateContextScore(campaign),
      behavioralScore: this.calculateBehavioralScore(behavior),
      impactScore: this.calculateImpactScore(impact)
    }

    // Weighted average
    let overallScore = (
      dimensions.iocSeverityScore * w.iocSeverity +
      dimensions.contextScore * w.context +
      dimensions.behavioralScore * w.behavioral +
      dimensions.impactScore * w.impact
    )

    // Apply rules-based adjustments
    overallScore = this.applyRulesAdjustment(dimensions, overallScore)
    overallScore = Math.max(0, Math.min(100, overallScore))

    const riskLevel = this.getRiskLevel(overallScore)
    const confidence = (ioc.confidence * ioc.sourceReliability) / 5

    return {
      overallScore,
      dimensions,
      riskLevel,
      confidence,
      calculatedAt: new Date(),
      modelUsed: ScoringModel.WEIGHTED_AVERAGE,
      explanation: this.generateScoreExplanation(dimensions, overallScore)
    }
  }

  /**
   * Calculate threat score using ML model
   */
  calculateMLScore(
    featureVector: FeatureVector,
    modelVersion?: string
  ): ThreatScore {
    // Simplified ML scoring - in production would use trained model
    const features = [
      featureVector.iocType * 15,
      featureVector.sourceReliability * 15,
      featureVector.confidence * 15,
      featureVector.ageDecay * 10,
      featureVector.campaignSeverity * 12,
      featureVector.attackComplexity * 10,
      featureVector.evasionTechniqueCount * 8,
      featureVector.dataExposurePotential * 10
    ]

    const overallScore = features.reduce((a, b) => a + b, 0) / features.length
    const normalizedScore = Math.min(100, overallScore)

    const dimensions: ScoringDimensions = {
      iocSeverityScore: featureVector.iocType * featureVector.sourceReliability * 20,
      contextScore: featureVector.campaignSeverity * 0.8,
      behavioralScore: featureVector.attackComplexity * 0.8,
      impactScore: featureVector.dataExposurePotential * 0.6
    }

    const riskLevel = this.getRiskLevel(normalizedScore)

    return {
      overallScore: normalizedScore,
      dimensions,
      riskLevel,
      confidence: 0.75,
      calculatedAt: new Date(),
      modelUsed: ScoringModel.MACHINE_LEARNING,
      explanation: `ML model v${modelVersion || 'latest'} calculated score based on ${features.length} features`
    }
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score: number): RiskLevel {
    if (score >= this.riskThresholds.critical) return RiskLevel.CRITICAL
    if (score >= this.riskThresholds.high) return RiskLevel.HIGH
    if (score >= this.riskThresholds.medium) return RiskLevel.MEDIUM
    if (score >= this.riskThresholds.low) return RiskLevel.LOW
    return RiskLevel.INFO
  }

  /**
   * Calculate risk matrix from likelihood and impact
   */
  calculateRiskMatrix(likelihood: number, impact: number): RiskMatrix {
    const riskScore = (likelihood + impact) / 2

    return {
      likelihood,
      impact,
      riskLevel: this.getRiskLevel(riskScore),
      mitigationRequired: riskScore >= this.riskThresholds.high
    }
  }

  /**
   * Track score history for trend analysis
   */
  recordScoreHistory(ioc: string, score: ThreatScore): void {
    if (!this.scoreHistory.has(ioc)) {
      this.scoreHistory.set(ioc, [])
    }

    const history = this.scoreHistory.get(ioc)!
    history.push({
      ioc,
      score: score.overallScore,
      riskLevel: score.riskLevel,
      timestamp: score.calculatedAt,
      dimensions: score.dimensions
    })

    // Keep last 100 entries per IOC
    if (history.length > 100) {
      history.shift()
    }
  }

  /**
   * Analyze score trends over time
   */
  analyzeTrend(ioc: string): { trend: 'increasing' | 'decreasing' | 'stable', changeRate: number } | null {
    const history = this.scoreHistory.get(ioc)
    if (!history || history.length < 2) return null

    const recent = history.slice(-10)
    const older = history.slice(0, 5)

    const avgRecent = recent.reduce((sum, h) => sum + h.score, 0) / recent.length
    const avgOlder = older.reduce((sum, h) => sum + h.score, 0) / older.length

    const changeRate = ((avgRecent - avgOlder) / avgOlder) * 100

    return {
      trend: changeRate > 5 ? 'increasing' : changeRate < -5 ? 'decreasing' : 'stable',
      changeRate
    }
  }

  /**
   * Register a custom scoring rule
   */
  registerScoringRule(rule: ScoringRule): void {
    this.scoringRules.set(rule.id, rule)
  }

  /**
   * Generate alert from threat score
   */
  generateAlert(ioc: string, score: ThreatScore): ScoredAlert {
    const priorityMap: Record<RiskLevel, number> = {
      [RiskLevel.CRITICAL]: 5,
      [RiskLevel.HIGH]: 4,
      [RiskLevel.MEDIUM]: 3,
      [RiskLevel.LOW]: 2,
      [RiskLevel.INFO]: 1
    }

    const slaMap: Record<RiskLevel, number> = {
      [RiskLevel.CRITICAL]: 15,
      [RiskLevel.HIGH]: 60,
      [RiskLevel.MEDIUM]: 240,
      [RiskLevel.LOW]: 1440,
      [RiskLevel.INFO]: 10080
    }

    const priority = priorityMap[score.riskLevel]
    const shouldEscalate = score.riskLevel === RiskLevel.CRITICAL ||
                          (score.riskLevel === RiskLevel.HIGH && score.confidence > 0.8)

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ioc,
      threatScore: score,
      priority,
      slaMinutes: slaMap[score.riskLevel],
      shouldEscalate,
      createdAt: new Date()
    }
  }

  /**
   * Generate comprehensive risk report
   */
  generateRiskReport(
    entityId: string,
    entityType: string,
    threats: Array<{ ioc: string, score: ThreatScore }>
  ): RiskReport {
    const sortedThreats = threats.sort((a, b) => b.score.overallScore - a.score.overallScore)
    const topThreats = sortedThreats.slice(0, 5)

    const riskDistribution: Record<RiskLevel, number> = {
      [RiskLevel.CRITICAL]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.LOW]: 0,
      [RiskLevel.INFO]: 0
    }

    threats.forEach(t => {
      riskDistribution[t.score.riskLevel]++
    })

    const overallRisk = sortedThreats.length > 0
      ? sortedThreats[0].score.overallScore
      : 0

    const scoreExplanations = new Map<string, string>()
    topThreats.forEach(t => {
      scoreExplanations.set(t.ioc, t.score.explanation)
    })

    const recommendations = this.generateRecommendations(topThreats, riskDistribution)

    return {
      entityId,
      entityType,
      overallRisk,
      riskLevel: this.getRiskLevel(overallRisk),
      topThreats: topThreats.map(t => ({
        ioc: t.ioc,
        score: t.score.overallScore,
        riskLevel: t.score.riskLevel
      })),
      riskDistribution,
      scoreExplanations,
      generatedAt: new Date(),
      recommendations
    }
  }

  /**
   * Generate recommendations based on risk profile
   */
  private generateRecommendations(
    topThreats: Array<{ ioc: string, score: ThreatScore }>,
    distribution: Record<RiskLevel, number>
  ): string[] {
    const recommendations: string[] = []

    if (distribution[RiskLevel.CRITICAL] > 0) {
      recommendations.push('CRITICAL: Immediate incident response required')
      recommendations.push('Isolate affected systems and initiate containment')
      recommendations.push('Notify security leadership and relevant stakeholders')
    }

    if (distribution[RiskLevel.HIGH] > 0) {
      recommendations.push('Review and strengthen detection rules for high-risk indicators')
      recommendations.push('Increase monitoring frequency for related IOCs')
      recommendations.push('Consider blocking indicators at perimeter')
    }

    if (topThreats.some(t => t.score.riskLevel === RiskLevel.MEDIUM)) {
      recommendations.push('Add indicators to watch lists for further investigation')
      recommendations.push('Correlate with other security events')
    }

    if (topThreats.length === 0) {
      recommendations.push('Continue standard monitoring procedures')
    }

    return recommendations
  }

  /**
   * Generate human-readable score explanation
   */
  private generateScoreExplanation(dimensions: ScoringDimensions, overallScore: number): string {
    const factors: string[] = []

    if (dimensions.iocSeverityScore > 70) {
      factors.push('High IOC severity')
    }
    if (dimensions.contextScore > 50) {
      factors.push('Associated with significant campaigns')
    }
    if (dimensions.behavioralScore > 60) {
      factors.push('Complex attack behavior observed')
    }
    if (dimensions.impactScore > 70) {
      factors.push('High potential impact')
    }

    const factorStr = factors.length > 0 ? ` due to ${factors.join(', ')}` : ''
    const levelDesc = overallScore >= 80 ? 'critical' :
                      overallScore >= 60 ? 'significant' :
                      overallScore >= 40 ? 'moderate' : 'low'

    return `Threat score indicates ${levelDesc} threat level (${overallScore.toFixed(1)}/100)${factorStr}`
  }

  /**
   * Register compliance mapping
   */
  registerComplianceMapping(mapping: ComplianceMapping): void {
    this.complianceMappings.push(mapping)
  }

  /**
   * Check compliance requirements for score
   */
  getComplianceRequirements(score: number): ComplianceMapping[] {
    return this.complianceMappings.filter(m => score >= m.scoreThreshold)
  }

  /**
   * Update risk thresholds
   */
  setRiskThresholds(thresholds: Partial<RiskThresholds>): void {
    this.riskThresholds = { ...this.riskThresholds, ...thresholds }
  }

  /**
   * Get current risk thresholds
   */
  getRiskThresholds(): RiskThresholds {
    return { ...this.riskThresholds }
  }

  /**
   * Get score history for IOC
   */
  getScoreHistory(ioc: string): ScoreHistory[] {
    return this.scoreHistory.get(ioc) || []
  }

  /**
   * Update ML model metadata
   */
  updateModelMetadata(metadata: ModelMetadata): void {
    this.modelMetadata = metadata
  }

  /**
   * Get current model metadata
   */
  getModelMetadata(): ModelMetadata | null {
    return this.modelMetadata
  }

  /**
   * Set scoring weights
   */
  setScoringWeights(weights: ScoringWeights): void {
    const sum = weights.iocSeverity + weights.context + weights.behavioral + weights.impact
    if (Math.abs(sum - 1) > 0.01) {
      throw new Error('Scoring weights must sum to 1.0')
    }
    this.defaultWeights = weights
  }

  /**
   * Get scoring weights
   */
  getScoringWeights(): ScoringWeights {
    return { ...this.defaultWeights }
  }

  /**
   * Validate threat score and confidence
   */
  validateScore(score: ThreatScore): { valid: boolean, issues: string[] } {
    const issues: string[] = []

    if (score.overallScore < 0 || score.overallScore > 100) {
      issues.push('Score must be between 0-100')
    }

    if (score.confidence < 0 || score.confidence > 1) {
      issues.push('Confidence must be between 0-1')
    }

    const expectedLevel = this.getRiskLevel(score.overallScore)
    if (expectedLevel !== score.riskLevel) {
      issues.push('Risk level does not match score')
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * Export score data for external systems
   */
  exportScoreData(format: 'json' | 'csv'): string {
    if (format === 'json') {
      const data = Array.from(this.scoreHistory.entries()).map(([ioc, history]) => ({
        ioc,
        history: history.map(h => ({
          score: h.score,
          riskLevel: h.riskLevel,
          timestamp: h.timestamp.toISOString(),
          dimensions: h.dimensions
        }))
      }))
      return JSON.stringify(data, null, 2)
    } else {
      // CSV format
      let csv = 'IOC,Score,RiskLevel,Timestamp,IOCSeverity,Context,Behavioral,Impact\n'
      this.scoreHistory.forEach((history, ioc) => {
        history.forEach(h => {
          csv += `${ioc},${h.score},${h.riskLevel},${h.timestamp.toISOString()},${h.dimensions.iocSeverityScore},${h.dimensions.contextScore},${h.dimensions.behavioralScore},${h.dimensions.impactScore}\n`
        })
      })
      return csv
    }
  }
}

/**
 * Factory function to create a configured threat scoring engine
 */
export function createThreatScoringEngine(config?: {
  weights?: ScoringWeights
  thresholds?: RiskThresholds
}): ThreatScoringEngine {
  const engine = new ThreatScoringEngine()

  if (config?.weights) {
    engine.setScoringWeights(config.weights)
  }

  if (config?.thresholds) {
    engine.setRiskThresholds(config.thresholds)
  }

  return engine
}
