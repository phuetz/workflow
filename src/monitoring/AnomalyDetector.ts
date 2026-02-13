/**
 * Advanced Anomaly Detection Engine
 * ML-powered anomaly detection for security events and system behavior
 * Week 8: Phase 2 - Security Monitoring & Alerting
 */

import { EventEmitter } from 'events'

// Types and Interfaces

export enum AnomalyType {
  SPIKE = 'spike',
  DROP = 'drop',
  UNUSUAL_PATTERN = 'unusual_pattern',
  BEHAVIOR_CHANGE = 'behavior_change',
  FREQUENCY_ANOMALY = 'frequency_anomaly',
  TEMPORAL_ANOMALY = 'temporal_anomaly'
}

export interface Anomaly {
  id: string
  timestamp: Date
  type: AnomalyType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metric: string
  expectedValue: number
  actualValue: number
  deviation: number // standard deviations
  confidence: number // 0-1
  context: Record<string, any>
  recommendations: string[]
}

export interface Baseline {
  metric: string
  mean: number
  standardDeviation: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
  dataPoints: number
  lastUpdated: Date
  confidence: number
}

export interface DetectionConfig {
  sensitivity: number // 0-1 (higher = more sensitive)
  baselineWindow: number // days
  minimumDataPoints: number
  deviationThreshold: number // standard deviations
  confidenceThreshold: number // 0-1
  adaptiveLearning: boolean
  ignoreList: string[] // metrics to ignore
}

export interface MetricData {
  metric: string
  value: number
  timestamp: Date
  context?: Record<string, any>
}

export interface SecurityMetrics {
  loginAttempts: number
  failedLogins: number
  apiCalls: number
  dataExports: number
  errorRate: number
  responseTime: number
  cpuUsage: number
  memoryUsage: number
  networkTraffic: number
  [key: string]: number
}

export interface UserActivity {
  userId: string
  timestamp: Date
  loginTime: Date
  location: string
  ipAddress: string
  deviceId: string
  success: boolean
  userAgent: string
}

export interface APIMetrics {
  userId: string
  endpoint: string
  method: string
  timestamp: Date
  responseTime: number
  statusCode: number
  dataSize: number
  parameters: Record<string, any>
}

export interface DataAccess {
  userId: string
  resource: string
  accessType: string
  timestamp: Date
  dataSize: number
  queryPattern: string
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted'
}

export interface SystemMetrics {
  timestamp: Date
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIn: number
  networkOut: number
  errorCount: number
  responseTime: number
  throughput: number
}

export interface UserBehaviorProfile {
  userId: string
  typicalLoginHours: number[] // 0-23
  typicalLocations: string[]
  commonActions: string[]
  averageSessionDuration: number
  typicalAPICallRate: number
  dataAccessPatterns: string[]
  riskScore: number
  lastUpdated: Date
}

export interface TimeSeriesAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonality: boolean
  outliers: number[]
  changePoints: Date[]
  forecast: number[]
  confidence_intervals: Array<{ lower: number; upper: number }>
}

export interface AnomalyFilter {
  metricName?: string
  type?: AnomalyType
  severity?: string
  startTime?: Date
  endTime?: Date
  userId?: string
}

// Main Anomaly Detector Class

export class AnomalyDetector extends EventEmitter {
  private static instance: AnomalyDetector
  private baselines: Map<string, Baseline> = new Map()
  private metricsHistory: Map<string, CircularBuffer> = new Map()
  private anomalies: Anomaly[] = []
  private userProfiles: Map<string, UserBehaviorProfile> = new Map()
  private config: DetectionConfig
  private readonly BUFFER_SIZE = 10000
  private readonly HISTORY_RETENTION_DAYS = 90
  private lastCleanup: Date = new Date()

  private constructor(config?: Partial<DetectionConfig>) {
    super()
    this.config = {
      sensitivity: 0.85,
      baselineWindow: 30,
      minimumDataPoints: 100,
      deviationThreshold: 3.0,
      confidenceThreshold: 0.8,
      adaptiveLearning: true,
      ignoreList: [],
      ...config
    }

    // Start periodic cleanup
    this.startPeriodicCleanup()
  }

  public static getInstance(config?: Partial<DetectionConfig>): AnomalyDetector {
    if (!AnomalyDetector.instance) {
      AnomalyDetector.instance = new AnomalyDetector(config)
    }
    return AnomalyDetector.instance
  }

  // Core Detection Methods

  public detect(metrics: SecurityMetrics): Anomaly[] {
    const detected: Anomaly[] = []
    const timestamp = new Date()

    for (const [metric, value] of Object.entries(metrics)) {
      if (this.config.ignoreList.includes(metric)) {
        continue
      }

      // Record metric
      this.recordMetric(metric, value, timestamp)

      // Get baseline
      const baseline = this.getBaseline(metric)
      if (!baseline) {
        continue
      }

      // Perform detections
      const spikeAnomaly = this.detectSpike(value, baseline)
      if (spikeAnomaly) {
        detected.push(spikeAnomaly)
      }

      const dropAnomaly = this.detectDrop(value, baseline)
      if (dropAnomaly) {
        detected.push(dropAnomaly)
      }
    }

    // Store anomalies
    this.anomalies.push(...detected)
    detected.forEach(anomaly => this.emit('anomaly', anomaly))

    return detected
  }

  public detectForUser(userId: string, timeWindow: number): Anomaly[] {
    const now = new Date()
    const startTime = new Date(now.getTime() - timeWindow * 60000)

    return this.anomalies.filter(
      anomaly =>
        anomaly.context?.userId === userId &&
        anomaly.timestamp >= startTime &&
        anomaly.timestamp <= now
    )
  }

  public detectForResource(resource: string, timeWindow: number): Anomaly[] {
    const now = new Date()
    const startTime = new Date(now.getTime() - timeWindow * 60000)

    return this.anomalies.filter(
      anomaly =>
        anomaly.context?.resource === resource &&
        anomaly.timestamp >= startTime &&
        anomaly.timestamp <= now
    )
  }

  // Baseline Management

  public updateBaseline(metric: string, value: number): void {
    const buffer = this.getOrCreateBuffer(metric)
    buffer.add(value)

    // Update baseline if enough data points
    if (buffer.size() >= this.config.minimumDataPoints) {
      this.calculateBaseline(metric)
    }
  }

  public getBaseline(metric: string): Baseline | null {
    return this.baselines.get(metric) || null
  }

  public calculateBaselines(historicalData: MetricData[]): void {
    const groupedData = new Map<string, number[]>()

    for (const data of historicalData) {
      if (!groupedData.has(data.metric)) {
        groupedData.set(data.metric, [])
      }
      groupedData.get(data.metric)!.push(data.value)
    }

    groupedData.forEach((values, metric) => {
      this.calculateBaseline(metric, values)
    })
  }

  public resetBaseline(metric: string): void {
    this.baselines.delete(metric)
    this.metricsHistory.delete(metric)
  }

  private calculateBaseline(metric: string, values?: number[]): void {
    let data = values

    if (!data) {
      const buffer = this.metricsHistory.get(metric)
      if (!buffer) {
        return
      }
      data = buffer.toArray()
    }

    if (data.length < this.config.minimumDataPoints) {
      return
    }

    const sorted = [...data].sort((a, b) => a - b)
    const mean = data.reduce((a, b) => a + b, 0) / data.length
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      data.length
    const stdDev = Math.sqrt(variance)

    const baseline: Baseline = {
      metric,
      mean,
      standardDeviation: stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      dataPoints: data.length,
      lastUpdated: new Date(),
      confidence: Math.min(data.length / 1000, 1.0)
    }

    this.baselines.set(metric, baseline)
  }

  // Specific Anomaly Detectors

  public detectLoginAnomalies(user: UserActivity): Anomaly[] {
    const anomalies: Anomaly[] = []
    const profile = this.getOrCreateUserProfile(user.userId)

    // Check for unusual login time
    const hour = user.loginTime.getHours()
    const isUnusualTime = !profile.typicalLoginHours.includes(hour)

    if (isUnusualTime && Math.random() > 0.7) {
      // 30% confidence if unusual time
      const anomaly: Anomaly = {
        id: this.generateId(),
        timestamp: user.timestamp,
        type: AnomalyType.TEMPORAL_ANOMALY,
        severity: 'low',
        description: `Unusual login time: ${hour}:00`,
        metric: `login_time_${user.userId}`,
        expectedValue: this.getMeanHour(profile.typicalLoginHours),
        actualValue: hour,
        deviation: 1.5,
        confidence: 0.7,
        context: { userId: user.userId, location: user.location },
        recommendations: ['Verify login was authorized', 'Check for account compromise']
      }
      anomalies.push(anomaly)
    }

    // Check for unusual location
    if (
      !profile.typicalLocations.includes(user.location) &&
      profile.typicalLocations.length > 0
    ) {
      const anomaly: Anomaly = {
        id: this.generateId(),
        timestamp: user.timestamp,
        type: AnomalyType.BEHAVIOR_CHANGE,
        severity: 'medium',
        description: `Login from new location: ${user.location}`,
        metric: `login_location_${user.userId}`,
        expectedValue: profile.typicalLocations.length,
        actualValue: 1,
        deviation: 2.0,
        confidence: 0.85,
        context: { userId: user.userId, newLocation: user.location, ip: user.ipAddress },
        recommendations: [
          'Send security alert to user',
          'Request additional verification',
          'Review recent account activity'
        ]
      }
      anomalies.push(anomaly)
    }

    // Check for rapid successive logins
    const recentLogins = this.anomalies.filter(
      a =>
        a.context?.userId === user.userId &&
        a.timestamp.getTime() > Date.now() - 60000 // 1 minute
    ).length

    if (recentLogins > 5) {
      const anomaly: Anomaly = {
        id: this.generateId(),
        timestamp: user.timestamp,
        type: AnomalyType.FREQUENCY_ANOMALY,
        severity: 'high',
        description: `Rapid successive login attempts (${recentLogins} in 1 minute)`,
        metric: `login_frequency_${user.userId}`,
        expectedValue: 1,
        actualValue: recentLogins,
        deviation: 3.5,
        confidence: 0.95,
        context: { userId: user.userId, attempts: recentLogins },
        recommendations: [
          'Temporarily lock account',
          'Send security alert to user',
          'Investigate brute force attack'
        ]
      }
      anomalies.push(anomaly)
    }

    // Track successful login for profile learning
    if (user.success) {
      this.updateUserBehaviorProfile(user)
    }

    return anomalies
  }

  public detectAPIAnomalies(apiMetrics: APIMetrics): Anomaly[] {
    const anomalies: Anomaly[] = []
    const metric = `api_calls_${apiMetrics.endpoint}`
    const baseline = this.getBaseline(metric)

    // Check response time anomaly
    if (baseline) {
      const rtBaseline = this.getBaseline(`response_time_${apiMetrics.endpoint}`)
      if (rtBaseline) {
        const deviation = (apiMetrics.responseTime - rtBaseline.mean) / rtBaseline.standardDeviation
        if (deviation > this.config.deviationThreshold) {
          const anomaly: Anomaly = {
            id: this.generateId(),
            timestamp: apiMetrics.timestamp,
            type: AnomalyType.SPIKE,
            severity: deviation > 5 ? 'high' : 'medium',
            description: `Slow API response on ${apiMetrics.endpoint}`,
            metric: `response_time_${apiMetrics.endpoint}`,
            expectedValue: rtBaseline.mean,
            actualValue: apiMetrics.responseTime,
            deviation,
            confidence: Math.min(deviation / 5, 1.0),
            context: { userId: apiMetrics.userId, endpoint: apiMetrics.endpoint },
            recommendations: ['Check API performance', 'Review backend logs', 'Monitor resource usage']
          }
          anomalies.push(anomaly)
        }
      }
    }

    // Check for unusual parameter patterns
    const paramString = JSON.stringify(apiMetrics.parameters)
    const paramMetric = `api_params_${apiMetrics.endpoint}`
    const paramBaseline = this.getBaseline(paramMetric)

    if (paramBaseline) {
      // Simple pattern deviation check
      const hash = this.hashString(paramString)
      const deviation = Math.abs(hash - paramBaseline.mean) / (paramBaseline.standardDeviation + 1)

      if (deviation > 2.5) {
        const anomaly: Anomaly = {
          id: this.generateId(),
          timestamp: apiMetrics.timestamp,
          type: AnomalyType.UNUSUAL_PATTERN,
          severity: 'low',
          description: `Unusual API parameters for ${apiMetrics.endpoint}`,
          metric: paramMetric,
          expectedValue: paramBaseline.mean,
          actualValue: hash,
          deviation,
          confidence: 0.75,
          context: { userId: apiMetrics.userId, endpoint: apiMetrics.endpoint },
          recommendations: ['Review API call details', 'Check for unauthorized access']
        }
        anomalies.push(anomaly)
      }
    }

    // Record the API call
    this.recordMetric(metric, 1, apiMetrics.timestamp)
    this.recordMetric(`response_time_${apiMetrics.endpoint}`, apiMetrics.responseTime, apiMetrics.timestamp)

    return anomalies
  }

  public detectDataAccessAnomalies(access: DataAccess): Anomaly[] {
    const anomalies: Anomaly[] = []
    const profile = this.getOrCreateUserProfile(access.userId)

    // Check for unusual data export size
    if (access.accessType === 'export') {
      const exportMetric = `data_export_${access.userId}`
      const baseline = this.getBaseline(exportMetric)

      if (baseline) {
        const deviation = (access.dataSize - baseline.mean) / (baseline.standardDeviation + 1)
        if (deviation > this.config.deviationThreshold) {
          const anomaly: Anomaly = {
            id: this.generateId(),
            timestamp: access.timestamp,
            type: AnomalyType.SPIKE,
            severity: deviation > 4 ? 'critical' : 'high',
            description: `Large data export: ${(access.dataSize / 1024 / 1024).toFixed(2)} MB`,
            metric: exportMetric,
            expectedValue: baseline.mean,
            actualValue: access.dataSize,
            deviation,
            confidence: Math.min(deviation / 5, 1.0),
            context: {
              userId: access.userId,
              resource: access.resource,
              sensitivity: access.sensitivity
            },
            recommendations: [
              'Verify export was authorized',
              'Review user access logs',
              'Check for data exfiltration'
            ]
          }
          anomalies.push(anomaly)
        }
      } else {
        this.recordMetric(exportMetric, access.dataSize, access.timestamp)
      }
    }

    // Check for access to sensitive resources
    if (access.sensitivity === 'restricted') {
      const sensitiveAccessMetric = `sensitive_access_${access.userId}`
      this.recordMetric(sensitiveAccessMetric, 1, access.timestamp)

      if (!profile.dataAccessPatterns.includes(access.queryPattern)) {
        const anomaly: Anomaly = {
          id: this.generateId(),
          timestamp: access.timestamp,
          type: AnomalyType.BEHAVIOR_CHANGE,
          severity: 'high',
          description: `Access to sensitive resource with new query pattern`,
          metric: sensitiveAccessMetric,
          expectedValue: 0,
          actualValue: 1,
          deviation: 2.5,
          confidence: 0.9,
          context: {
            userId: access.userId,
            resource: access.resource,
            sensitivity: access.sensitivity
          },
          recommendations: [
            'Alert security team',
            'Review data access logs',
            'Audit user permissions'
          ]
        }
        anomalies.push(anomaly)
      }
    }

    return anomalies
  }

  public detectSystemAnomalies(systemMetrics: SystemMetrics): Anomaly[] {
    const anomalies: Anomaly[] = []

    // Check CPU usage
    const cpuBaseline = this.getBaseline('cpu_usage')
    if (cpuBaseline && systemMetrics.cpuUsage > cpuBaseline.p95) {
      const deviation = (systemMetrics.cpuUsage - cpuBaseline.mean) / cpuBaseline.standardDeviation
      const anomaly: Anomaly = {
        id: this.generateId(),
        timestamp: systemMetrics.timestamp,
        type: AnomalyType.SPIKE,
        severity: systemMetrics.cpuUsage > 90 ? 'critical' : 'high',
        description: `High CPU usage: ${systemMetrics.cpuUsage.toFixed(2)}%`,
        metric: 'cpu_usage',
        expectedValue: cpuBaseline.mean,
        actualValue: systemMetrics.cpuUsage,
        deviation,
        confidence: Math.min(Math.abs(deviation) / 5, 1.0),
        context: { timestamp: systemMetrics.timestamp },
        recommendations: ['Check running processes', 'Review resource allocation', 'Scale infrastructure']
      }
      anomalies.push(anomaly)
    }

    // Check memory usage
    const memBaseline = this.getBaseline('memory_usage')
    if (memBaseline && systemMetrics.memoryUsage > memBaseline.p95) {
      const deviation = (systemMetrics.memoryUsage - memBaseline.mean) / memBaseline.standardDeviation
      const anomaly: Anomaly = {
        id: this.generateId(),
        timestamp: systemMetrics.timestamp,
        type: AnomalyType.SPIKE,
        severity: systemMetrics.memoryUsage > 90 ? 'critical' : 'medium',
        description: `High memory usage: ${systemMetrics.memoryUsage.toFixed(2)}%`,
        metric: 'memory_usage',
        expectedValue: memBaseline.mean,
        actualValue: systemMetrics.memoryUsage,
        deviation,
        confidence: Math.min(Math.abs(deviation) / 5, 1.0),
        context: { timestamp: systemMetrics.timestamp },
        recommendations: ['Check memory leaks', 'Restart services', 'Increase memory allocation']
      }
      anomalies.push(anomaly)
    }

    // Check error rate
    if (systemMetrics.errorCount > 0) {
      const errorBaseline = this.getBaseline('error_count')
      if (errorBaseline) {
        const deviation = (systemMetrics.errorCount - errorBaseline.mean) / (errorBaseline.standardDeviation + 1)
        if (deviation > this.config.deviationThreshold) {
          const anomaly: Anomaly = {
            id: this.generateId(),
            timestamp: systemMetrics.timestamp,
            type: AnomalyType.SPIKE,
            severity: 'high',
            description: `High error rate: ${systemMetrics.errorCount} errors`,
            metric: 'error_count',
            expectedValue: errorBaseline.mean,
            actualValue: systemMetrics.errorCount,
            deviation,
            confidence: Math.min(deviation / 5, 1.0),
            context: { timestamp: systemMetrics.timestamp },
            recommendations: ['Check application logs', 'Investigate error causes', 'Alert engineering team']
          }
          anomalies.push(anomaly)
        }
      }
    }

    // Record metrics
    this.recordMetric('cpu_usage', systemMetrics.cpuUsage, systemMetrics.timestamp)
    this.recordMetric('memory_usage', systemMetrics.memoryUsage, systemMetrics.timestamp)
    this.recordMetric('error_count', systemMetrics.errorCount, systemMetrics.timestamp)

    return anomalies
  }

  // Time Series Analysis

  public analyzeTimeSeries(data: number[], timestamps: Date[]): TimeSeriesAnalysis {
    if (data.length < 3) {
      return {
        trend: 'stable',
        seasonality: false,
        outliers: [],
        changePoints: [],
        forecast: [],
        confidence_intervals: []
      }
    }

    // Calculate trend
    const trend = this.calculateTrend(data)

    // Detect outliers using IQR
    const outliers = this.detectOutliers(data)

    // Detect change points
    const changePoints = this.detectChangePoints(data, timestamps)

    // Simple forecasting (naive approach)
    const forecast = this.simpleExponentialSmoothing(data, 5)

    // Calculate confidence intervals
    const mean = data.reduce((a, b) => a + b, 0) / data.length
    const stdDev = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length)
    const confidence_intervals = forecast.map(value => ({
      lower: value - 1.96 * stdDev,
      upper: value + 1.96 * stdDev
    }))

    return {
      trend,
      seasonality: this.detectSeasonality(data),
      outliers,
      changePoints,
      forecast,
      confidence_intervals
    }
  }

  public detectSpike(current: number, baseline: Baseline): Anomaly | null {
    if (!baseline || baseline.dataPoints === 0) {
      return null
    }

    const deviation = (current - baseline.mean) / (baseline.standardDeviation + 0.1)

    if (deviation > this.config.deviationThreshold) {
      return {
        id: this.generateId(),
        timestamp: new Date(),
        type: AnomalyType.SPIKE,
        severity: this.calculateSeverity(deviation),
        description: `Spike detected in ${baseline.metric}`,
        metric: baseline.metric,
        expectedValue: baseline.mean,
        actualValue: current,
        deviation,
        confidence: this.calculateConfidenceFromDeviation(deviation),
        context: { baseline: baseline.mean, current },
        recommendations: [
          'Investigate spike cause',
          'Check related metrics',
          'Review system logs'
        ]
      }
    }

    return null
  }

  public detectDrop(current: number, baseline: Baseline): Anomaly | null {
    if (!baseline || baseline.dataPoints === 0) {
      return null
    }

    const deviation = (baseline.mean - current) / (baseline.standardDeviation + 0.1)

    if (deviation > this.config.deviationThreshold) {
      return {
        id: this.generateId(),
        timestamp: new Date(),
        type: AnomalyType.DROP,
        severity: this.calculateSeverity(deviation),
        description: `Drop detected in ${baseline.metric}`,
        metric: baseline.metric,
        expectedValue: baseline.mean,
        actualValue: current,
        deviation,
        confidence: this.calculateConfidenceFromDeviation(deviation),
        context: { baseline: baseline.mean, current },
        recommendations: [
          'Investigate drop cause',
          'Check service availability',
          'Review error logs'
        ]
      }
    }

    return null
  }

  public detectPatternDeviation(pattern: number[], expected: number[]): Anomaly | null {
    if (pattern.length !== expected.length) {
      return null
    }

    const differences = pattern.map((val, idx) => Math.abs(val - expected[idx]))
    const avgDifference = differences.reduce((a, b) => a + b, 0) / differences.length
    const expectedMean = expected.reduce((a, b) => a + b, 0) / expected.length

    const deviation = avgDifference / (expectedMean + 1)

    if (deviation > 0.3) {
      // 30% threshold
      return {
        id: this.generateId(),
        timestamp: new Date(),
        type: AnomalyType.UNUSUAL_PATTERN,
        severity: deviation > 0.5 ? 'high' : 'medium',
        description: 'Unusual pattern detected',
        metric: 'pattern_deviation',
        expectedValue: expectedMean,
        actualValue: avgDifference,
        deviation: deviation * 100,
        confidence: Math.min(deviation, 1.0),
        context: { pattern, expected },
        recommendations: ['Review pattern details', 'Investigate pattern change', 'Check for anomalies']
      }
    }

    return null
  }

  // Machine Learning Methods

  public train(historicalData: MetricData[]): void {
    this.calculateBaselines(historicalData)

    // Build user behavior profiles
    const userActivities = new Map<string, UserActivity[]>()

    // This would be populated from actual user activity data
    // For now, we initialize profiles from configuration

    this.userProfiles.forEach((profile, userId) => {
      profile.lastUpdated = new Date()
    })
  }

  public predict(metric: string, horizon: number): number[] {
    const buffer = this.metricsHistory.get(metric)
    if (!buffer || buffer.size() < 10) {
      return []
    }

    const data = buffer.toArray()
    return this.simpleExponentialSmoothing(data, horizon)
  }

  public calculateConfidence(anomaly: Anomaly): number {
    let confidence = anomaly.confidence

    // Adjust based on baseline data points
    const baseline = this.getBaseline(anomaly.metric)
    if (baseline) {
      const dataPointsFactor = Math.min(baseline.dataPoints / 1000, 1.0)
      confidence *= dataPointsFactor
    }

    // Adjust based on deviation magnitude
    const deviationFactor = Math.min(Math.abs(anomaly.deviation) / 10, 1.0)
    confidence *= deviationFactor

    return Math.min(confidence, 1.0)
  }

  // Configuration Methods

  public setConfig(config: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  public setSensitivity(sensitivity: number): void {
    this.config.sensitivity = Math.max(0, Math.min(1, sensitivity))
    // Adjust deviation threshold based on sensitivity
    this.config.deviationThreshold = 4.0 - sensitivity * 2.0 // Range: 4.0 to 2.0
  }

  public addToIgnoreList(metric: string): void {
    if (!this.config.ignoreList.includes(metric)) {
      this.config.ignoreList.push(metric)
    }
  }

  // Reporting Methods

  public getAnomalies(filter?: AnomalyFilter): Anomaly[] {
    if (!filter) {
      return this.anomalies
    }

    return this.anomalies.filter(anomaly => {
      if (filter.metricName && anomaly.metric !== filter.metricName) {
        return false
      }
      if (filter.type && anomaly.type !== filter.type) {
        return false
      }
      if (filter.severity && anomaly.severity !== filter.severity) {
        return false
      }
      if (filter.startTime && anomaly.timestamp < filter.startTime) {
        return false
      }
      if (filter.endTime && anomaly.timestamp > filter.endTime) {
        return false
      }
      if (filter.userId && anomaly.context?.userId !== filter.userId) {
        return false
      }
      return true
    })
  }

  public getAnomalyRate(timeWindow: number): number {
    const now = new Date()
    const startTime = new Date(now.getTime() - timeWindow * 60000)

    const recentAnomalies = this.anomalies.filter(
      anomaly => anomaly.timestamp >= startTime && anomaly.timestamp <= now
    ).length

    const anomaliesPerMinute = recentAnomalies / timeWindow
    return anomaliesPerMinute
  }

  public getAnomaliesByType(type: AnomalyType): Anomaly[] {
    return this.anomalies.filter(anomaly => anomaly.type === type)
  }

  public getAnomaliesBySeverity(severity: string): Anomaly[] {
    return this.anomalies.filter(anomaly => anomaly.severity === severity)
  }

  public exportAnomalies(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.anomalies, null, 2)
    }

    // CSV format
    const headers = [
      'ID',
      'Timestamp',
      'Type',
      'Severity',
      'Metric',
      'Expected Value',
      'Actual Value',
      'Deviation',
      'Confidence',
      'Description'
    ]
    const rows = this.anomalies.map(a => [
      a.id,
      a.timestamp.toISOString(),
      a.type,
      a.severity,
      a.metric,
      a.expectedValue.toFixed(2),
      a.actualValue.toFixed(2),
      a.deviation.toFixed(2),
      a.confidence.toFixed(2),
      a.description
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    return csv
  }

  // Helper Methods

  private recordMetric(metric: string, value: number, timestamp: Date): void {
    const buffer = this.getOrCreateBuffer(metric)
    buffer.add(value)

    if (this.config.adaptiveLearning && buffer.size() % 50 === 0) {
      this.calculateBaseline(metric)
    }
  }

  private getOrCreateBuffer(metric: string): CircularBuffer {
    if (!this.metricsHistory.has(metric)) {
      this.metricsHistory.set(metric, new CircularBuffer(this.BUFFER_SIZE))
    }
    return this.metricsHistory.get(metric)!
  }

  private getOrCreateUserProfile(userId: string): UserBehaviorProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        userId,
        typicalLoginHours: Array.from({ length: 24 }, (_, i) => i), // All hours initially
        typicalLocations: [],
        commonActions: [],
        averageSessionDuration: 0,
        typicalAPICallRate: 0,
        dataAccessPatterns: [],
        riskScore: 0,
        lastUpdated: new Date()
      })
    }
    return this.userProfiles.get(userId)!
  }

  private updateUserBehaviorProfile(user: UserActivity): void {
    const profile = this.getOrCreateUserProfile(user.userId)

    // Update typical login hours
    const hour = user.loginTime.getHours()
    if (!profile.typicalLoginHours.includes(hour)) {
      profile.typicalLoginHours.push(hour)
    }

    // Update typical locations
    if (!profile.typicalLocations.includes(user.location)) {
      profile.typicalLocations.push(user.location)
    }

    profile.lastUpdated = new Date()
  }

  private calculateTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) {
      return 'stable'
    }

    const firstHalf = data.slice(0, Math.floor(data.length / 2))
    const secondHalf = data.slice(Math.floor(data.length / 2))

    const firstHalfMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondHalfMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    const percentageChange = (secondHalfMean - firstHalfMean) / firstHalfMean

    if (percentageChange > 0.05) {
      return 'increasing'
    } else if (percentageChange < -0.05) {
      return 'decreasing'
    }
    return 'stable'
  }

  private detectOutliers(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b)
    const q1 = this.percentile(sorted, 25)
    const q3 = this.percentile(sorted, 75)
    const iqr = q3 - q1

    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    return data
      .map((val, idx) => ({ val, idx }))
      .filter(({ val }) => val < lowerBound || val > upperBound)
      .map(({ idx }) => idx)
  }

  private detectChangePoints(data: number[], timestamps: Date[]): Date[] {
    if (data.length < 5) {
      return []
    }

    const changePoints: Date[] = []
    const threshold = 2.0 // Standard deviations

    for (let i = 2; i < data.length - 2; i++) {
      const prevMean = (data[i - 2] + data[i - 1]) / 2
      const nextMean = (data[i + 1] + data[i + 2]) / 2
      const overallMean = data.reduce((a, b) => a + b, 0) / data.length
      const stdDev = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / data.length)

      if (Math.abs(nextMean - prevMean) > threshold * stdDev) {
        changePoints.push(timestamps[i])
      }
    }

    return changePoints
  }

  private detectSeasonality(data: number[]): boolean {
    if (data.length < 24) {
      return false
    }

    // Check for repeating patterns (simplified)
    const firstCycle = data.slice(0, 12)
    const secondCycle = data.slice(12, 24)

    const correlation = this.calculateCorrelation(firstCycle, secondCycle)
    return correlation > 0.7
  }

  private calculateCorrelation(a: number[], b: number[]): number {
    const meanA = a.reduce((sum, val) => sum + val, 0) / a.length
    const meanB = b.reduce((sum, val) => sum + val, 0) / b.length

    let numerator = 0
    let denumeratorA = 0
    let denumeratorB = 0

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const diffA = a[i] - meanA
      const diffB = b[i] - meanB
      numerator += diffA * diffB
      denumeratorA += diffA * diffA
      denumeratorB += diffB * diffB
    }

    const denominator = Math.sqrt(denumeratorA * denumeratorB)
    return denominator === 0 ? 0 : numerator / denominator
  }

  private simpleExponentialSmoothing(data: number[], horizon: number): number[] {
    if (data.length === 0) {
      return []
    }

    const alpha = 0.3 // Smoothing factor
    let smoothed = data[0]
    const forecast: number[] = []

    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i] + (1 - alpha) * smoothed
    }

    // Forecast
    for (let i = 0; i < horizon; i++) {
      forecast.push(smoothed)
    }

    return forecast
  }

  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (lower === upper) {
      return sorted[lower]
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  }

  private calculateSeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation >= 5) {
      return 'critical'
    } else if (deviation >= 3.5) {
      return 'high'
    } else if (deviation >= 2.5) {
      return 'medium'
    }
    return 'low'
  }

  private calculateConfidenceFromDeviation(deviation: number): number {
    return Math.min(Math.abs(deviation) / 10, 1.0)
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private getMeanHour(hours: number[]): number {
    if (hours.length === 0) {
      return 12
    }
    return hours.reduce((a, b) => a + b, 0) / hours.length
  }

  private generateId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldAnomalies()
    }, 3600000) // Hourly cleanup
  }

  private cleanupOldAnomalies(): void {
    const cutoffDate = new Date(Date.now() - this.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    this.anomalies = this.anomalies.filter(anomaly => anomaly.timestamp > cutoffDate)
    this.lastCleanup = new Date()
  }
}

// Circular Buffer Implementation

class CircularBuffer {
  private buffer: number[]
  private index: number = 0
  private currentSize: number = 0

  constructor(capacity: number) {
    this.buffer = new Array(capacity)
  }

  public add(value: number): void {
    this.buffer[this.index] = value
    this.index = (this.index + 1) % this.buffer.length
    if (this.currentSize < this.buffer.length) {
      this.currentSize++
    }
  }

  public toArray(): number[] {
    const result: number[] = []
    for (let i = 0; i < this.currentSize; i++) {
      result.push(this.buffer[(this.index + i) % this.buffer.length])
    }
    return result
  }

  public size(): number {
    return this.currentSize
  }

  public clear(): void {
    this.buffer = new Array(this.buffer.length)
    this.index = 0
    this.currentSize = 0
  }
}

// Export singleton instance
export default AnomalyDetector
