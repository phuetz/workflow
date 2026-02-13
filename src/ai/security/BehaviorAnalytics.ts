/**
 * Behavior Analytics Engine
 *
 * Enterprise-grade User Behavior Analytics (UBA) and Entity Behavior Analytics (EBA)
 * for detecting anomalous activities and security threats.
 *
 * Features:
 * - User activity baseline creation and management
 * - Anomaly detection (temporal, spatial, volumetric, pattern-based)
 * - Risk scoring with multi-factor calculation
 * - Peer group analysis and outlier detection
 * - Automated alerts and recommendations
 */

import { EventEmitter } from 'events'
import type {
  UserBaseline,
  EntityBaseline,
  ActivityEvent,
  BehavioralAnomaly,
  UserRiskProfile,
  PeerGroup,
  BehaviorAlert,
  AnomalyThresholds
} from './behavior/types'
import { PatternAnalyzer } from './behavior/PatternAnalyzer'
import { BaselineBuilder } from './behavior/BaselineBuilder'
import { DeviationDetector } from './behavior/DeviationDetector'
import { RiskScorer } from './behavior/RiskScorer'

/**
 * Behavior Analytics Engine
 *
 * Detects anomalous user and entity behaviors using statistical analysis,
 * machine learning, and peer group comparison.
 */
export class BehaviorAnalyticsEngine extends EventEmitter {
  private baselines: Map<string, UserBaseline>
  private entityBaselines: Map<string, EntityBaseline>
  private activityHistory: Map<string, ActivityEvent[]>
  private riskProfiles: Map<string, UserRiskProfile>
  private peerGroups: Map<string, PeerGroup>
  private alerts: Map<string, BehaviorAlert>
  private anomalyThresholds: AnomalyThresholds
  private riskDecayRate: number
  private baselineInitializationDays: number

  // Extracted components
  private patternAnalyzer: PatternAnalyzer
  private baselineBuilder: BaselineBuilder
  private deviationDetector: DeviationDetector
  private riskScorer: RiskScorer

  constructor() {
    super()
    this.baselines = new Map()
    this.entityBaselines = new Map()
    this.activityHistory = new Map()
    this.riskProfiles = new Map()
    this.peerGroups = new Map()
    this.alerts = new Map()
    this.anomalyThresholds = {
      temporal: 70,
      spatial: 80,
      volumetric: 75,
      pattern: 65,
      peerGroup: 72
    }
    this.riskDecayRate = 0.05 // 5% decay per day
    this.baselineInitializationDays = 30

    // Initialize components
    this.patternAnalyzer = new PatternAnalyzer(this.anomalyThresholds)
    this.baselineBuilder = new BaselineBuilder(this.baselineInitializationDays, this.patternAnalyzer)
    this.deviationDetector = new DeviationDetector(this.anomalyThresholds, this.patternAnalyzer)
    this.riskScorer = new RiskScorer(this.riskDecayRate, this.anomalyThresholds)
  }

  /**
   * Create or update a user baseline
   */
  createUserBaseline(userId: string, historicalData: ActivityEvent[]): UserBaseline {
    const baseline = this.baselineBuilder.createUserBaseline(userId, historicalData)
    this.baselines.set(userId, baseline)
    this.emit('baseline_created', { userId, baseline })
    return baseline
  }

  /**
   * Create an entity baseline
   */
  createEntityBaseline(entityId: string, entityType: EntityBaseline['entityType']): EntityBaseline {
    const baseline = this.baselineBuilder.createEntityBaseline(entityId, entityType)
    this.entityBaselines.set(entityId, baseline)
    return baseline
  }

  /**
   * Record an activity event
   */
  recordActivityEvent(event: ActivityEvent): void {
    const key = event.userId || event.entityId || 'unknown'
    const events = this.activityHistory.get(key) || []
    events.push(event)

    // Keep only recent history (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const filtered = events.filter(e => e.timestamp > ninetyDaysAgo)

    this.activityHistory.set(key, filtered)
    this.emit('activity_recorded', event)
  }

  /**
   * Analyze user activity for anomalies
   */
  analyzeUserActivity(userId: string): BehavioralAnomaly[] {
    const baseline = this.baselines.get(userId)
    if (!baseline) {
      return []
    }

    const events = this.activityHistory.get(userId) || []

    // Get recent events (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentEvents = events.filter(e => e.timestamp > oneDayAgo)

    return this.deviationDetector.analyzeUserActivity(userId, baseline, recentEvents)
  }

  /**
   * Calculate comprehensive user risk profile
   */
  calculateUserRiskProfile(userId: string): UserRiskProfile {
    const existingProfile = this.riskProfiles.get(userId)
    const anomalies = this.analyzeUserActivity(userId)
    const peerComparison = this.compareToPeerGroup(userId)

    const profile = this.riskScorer.calculateUserRiskProfile(
      userId,
      anomalies,
      peerComparison.outlierScore,
      existingProfile
    )

    this.riskProfiles.set(userId, profile)
    return profile
  }

  /**
   * Compare user to peer group
   */
  private compareToPeerGroup(userId: string): { outlierScore: number; groupId: string | null } {
    const userProfile = this.riskProfiles.get(userId)
    if (!userProfile) return { outlierScore: 0, groupId: null }

    return this.riskScorer.compareToPeerGroup(
      userProfile.overallRiskScore,
      this.peerGroups,
      userId
    )
  }

  /**
   * Create or update a peer group
   */
  createPeerGroup(
    groupId: string,
    name: string,
    groupingType: PeerGroup['groupingType'],
    memberIds: string[],
    characteristics: PeerGroup['characteristics']
  ): PeerGroup {
    const group: PeerGroup = {
      groupId,
      name,
      groupingType,
      members: memberIds,
      characteristics,
      baselineMetrics: {
        averageRiskScore: 0,
        medianRiskScore: 0,
        standardDeviation: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Calculate baseline metrics
    this.riskScorer.updatePeerGroupMetrics(group, this.riskProfiles)
    this.peerGroups.set(groupId, group)

    return group
  }

  /**
   * Detect peer group anomalies
   */
  detectPeerGroupAnomalies(groupId: string): BehavioralAnomaly[] {
    const group = this.peerGroups.get(groupId)
    if (!group) return []

    return this.riskScorer.detectPeerGroupAnomalies(group, this.riskProfiles)
  }

  /**
   * Generate behavioral alert
   */
  generateBehavioralAlert(
    userId: string | undefined,
    entityId: string | undefined,
    alertType: BehaviorAlert['alertType'],
    severity: BehaviorAlert['severity']
  ): BehaviorAlert {
    const anomalies = userId ? this.analyzeUserActivity(userId) : []
    const profile = userId ? this.riskProfiles.get(userId) : undefined

    let title = ''
    let description = ''

    switch (alertType) {
      case 'anomaly':
        title = `Behavioral Anomaly Detected for ${userId || entityId}`
        description = `${anomalies.length} anomalies detected in recent activity`
        break
      case 'risk_threshold':
        title = `Risk Threshold Exceeded for ${userId || entityId}`
        description = `Risk score has crossed threshold: ${profile?.overallRiskScore.toFixed(1) || 'N/A'}`
        break
      case 'trend_change':
        title = `Risk Trend Change for ${userId || entityId}`
        description = `Risk profile trending ${profile?.riskTrend || 'unknown'}`
        break
      case 'peer_outlier':
        title = `Peer Group Outlier Detected for ${userId || entityId}`
        description = `User behavior significantly differs from peer group`
        break
    }

    const alert: BehaviorAlert = {
      alertId: `alert_${Date.now()}_${Math.random()}`,
      userId,
      entityId,
      timestamp: new Date(),
      alertType,
      severity,
      title,
      description,
      anomalies: anomalies.slice(0, 5),
      investigation: {
        suggestedFocusAreas: [
          'Recent access patterns',
          'Privilege usage',
          'Data transfers',
          'Location and device changes'
        ],
        relatedEvents: this.getRelatedEvents(userId || entityId || ''),
        contextualInformation: {
          riskProfile: profile,
          recentActivityCount: (this.activityHistory.get(userId || entityId || '') || []).length
        }
      },
      recommendations: this.riskScorer.generateRecommendations(anomalies, severity),
      status: 'open',
      createdAt: new Date()
    }

    this.alerts.set(alert.alertId, alert)
    this.emit('alert_generated', alert)

    return alert
  }

  /**
   * Get related events for investigation
   */
  private getRelatedEvents(identifier: string): string[] {
    const events = this.activityHistory.get(identifier) || []
    return events
      .slice(-20)
      .map(e => `${e.timestamp.toISOString()}: ${e.type}`)
  }

  /**
   * Get all alerts
   */
  getAlerts(userId?: string, status?: BehaviorAlert['status']): BehaviorAlert[] {
    const alerts = Array.from(this.alerts.values())

    return alerts.filter(alert => {
      if (userId && alert.userId !== userId) return false
      if (status && alert.status !== status) return false
      return true
    })
  }

  /**
   * Update alert status
   */
  updateAlertStatus(alertId: string, status: BehaviorAlert['status'], assignedTo?: string): void {
    const alert = this.alerts.get(alertId)
    if (!alert) return

    alert.status = status
    if (assignedTo) alert.assignedTo = assignedTo
    if (status === 'resolved') alert.resolvedAt = new Date()

    this.emit('alert_updated', alert)
  }

  /**
   * Get user risk profile
   */
  getUserRiskProfile(userId: string): UserRiskProfile | undefined {
    return this.riskProfiles.get(userId)
  }

  /**
   * Set anomaly detection thresholds
   */
  setAnomalyThresholds(thresholds: Partial<AnomalyThresholds>): void {
    this.anomalyThresholds = { ...this.anomalyThresholds, ...thresholds }
    this.deviationDetector.setThresholds(this.anomalyThresholds)
    this.riskScorer.setThresholds(this.anomalyThresholds)
  }
}

export type {
  UserBaseline,
  EntityBaseline,
  ActivityEvent,
  BehavioralAnomaly,
  UserRiskProfile,
  PeerGroup,
  BehaviorAlert,
  AnomalyThresholds
}
