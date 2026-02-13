/**
 * Baseline Builder
 *
 * Creates and manages user and entity baselines for behavior analytics.
 */

import type { UserBaseline, EntityBaseline, ActivityEvent } from './types'
import { PatternAnalyzer } from './PatternAnalyzer'

/**
 * Builds behavioral baselines for users and entities
 */
export class BaselineBuilder {
  private baselineInitializationDays: number
  private patternAnalyzer: PatternAnalyzer

  constructor(initializationDays: number, patternAnalyzer: PatternAnalyzer) {
    this.baselineInitializationDays = initializationDays
    this.patternAnalyzer = patternAnalyzer
  }

  /**
   * Create or update a user baseline
   */
  createUserBaseline(userId: string, historicalData: ActivityEvent[]): UserBaseline {
    const baseline: UserBaseline = {
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      loginPatterns: {
        timesOfDay: new Map(),
        daysOfWeek: new Map(),
        averageLoginTime: 0,
        frequentLocations: new Map(),
        frequentDevices: new Map()
      },
      accessPatterns: {
        frequentResources: new Map(),
        averageAccessFrequency: 0,
        peakAccessHours: [],
        privilegeLevelDistribution: new Map()
      },
      dataAccessPatterns: {
        averageBytesPerDay: 0,
        frequentDataTypes: new Map(),
        averageDataAccessDuration: 0,
        sensitiveDataAccessFrequency: 0
      },
      privilegePatterns: {
        elevationFrequency: 0,
        roleSwitches: 0,
        privilegeUsageDuration: 0,
        frequentPrivileges: new Map()
      },
      riskFactors: {
        baselineRiskScore: 0,
        failedLoginAttempts: 0,
        accountAnomalies: []
      }
    }

    // Process historical data to build baseline
    const dataAccessEvents = historicalData.filter(e => e.type === 'data_access')
    const privilegeEvents = historicalData.filter(e => e.type === 'privilege_elevation')
    const failedLogins = historicalData.filter(e => e.type === 'failed_login').length

    // Analyze login patterns using PatternAnalyzer
    this.patternAnalyzer.analyzeLoginPatterns(historicalData, baseline)

    // Analyze access patterns using PatternAnalyzer
    this.patternAnalyzer.analyzeAccessPatterns(historicalData, baseline, this.baselineInitializationDays)

    // Analyze data access patterns
    const totalDataBytes = dataAccessEvents.reduce((sum, e) => sum + (e.dataSize || 0), 0)
    baseline.dataAccessPatterns.averageBytesPerDay = totalDataBytes / this.baselineInitializationDays
    const avgDuration = dataAccessEvents.length > 0
      ? dataAccessEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / dataAccessEvents.length
      : 0
    baseline.dataAccessPatterns.averageDataAccessDuration = avgDuration

    // Analyze privilege patterns
    baseline.privilegePatterns.elevationFrequency = privilegeEvents.length / this.baselineInitializationDays
    baseline.riskFactors.failedLoginAttempts = failedLogins / 7 // per week

    return baseline
  }

  /**
   * Create an entity baseline
   */
  createEntityBaseline(entityId: string, entityType: EntityBaseline['entityType']): EntityBaseline {
    const baseline: EntityBaseline = {
      entityId,
      entityType,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    if (entityType === 'device') {
      baseline.networkBehavior = {
        typicalBandwidth: 0,
        typicalConnections: 0,
        frequentPeers: new Map(),
        typicalPorts: new Set()
      }
    } else if (entityType === 'application') {
      baseline.applicationBehavior = {
        typicalCPUUsage: 0,
        typicalMemoryUsage: 0,
        typicalErrorRate: 0,
        typicalResponseTime: 0
      }
    } else if (entityType === 'api') {
      baseline.apiUsage = {
        typicalCallsPerHour: 0,
        typicalEndpoints: new Map(),
        typicalPayloadSize: 0,
        typicalLatency: 0
      }
    }

    return baseline
  }
}
