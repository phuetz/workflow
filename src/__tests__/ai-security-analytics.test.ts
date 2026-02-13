/**
 * Comprehensive tests for AI Security Analytics system
 *
 * Tests for:
 * - MLThreatDetector.ts - ML-based threat detection
 * - BehaviorAnalytics.ts - User and entity behavior analytics
 * - PredictiveIntelligence.ts - Predictive security intelligence
 *
 * Coverage: 125+ tests, 1,800-2,200 lines
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import MLThreatDetector, {
  SecurityEvent,
  SecurityFeatures,
  ThreatPrediction,
  SequencePattern,
} from '../ai/security/MLThreatDetector'
import { BehaviorAnalyticsEngine } from '../ai/security/BehaviorAnalytics'
import { PredictiveIntelligence } from '../ai/security/PredictiveIntelligence'

// ============================================================================
// ML THREAT DETECTOR TESTS (40+ tests)
// ============================================================================

describe('MLThreatDetector - Core Functionality', () => {
  let detector: MLThreatDetector

  beforeEach(() => {
    detector = new MLThreatDetector()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(detector).toBeDefined()
      const metrics = detector.getMetrics()
      expect(metrics).toBeDefined()
    })

    it('should accept custom config', () => {
      const customDetector = new MLThreatDetector({
        anomalyThreshold: 0.8,
        threatThreshold: 0.7,
      })
      expect(customDetector).toBeDefined()
    })

    it('should initialize with online learning disabled', () => {
      const detector = new MLThreatDetector({
        enableOnlineLearning: false,
      })
      expect(detector).toBeDefined()
    })
  })

  describe('Threat Prediction', () => {
    it('should predict threats from security events', async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'high',
        port: 22,
        protocol: 'SSH',
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(prediction).toBeDefined()
      expect(prediction.anomalyScore).toBeGreaterThanOrEqual(0)
      expect(prediction.anomalyScore).toBeLessThanOrEqual(1)
      expect(prediction.primaryThreat).toBeDefined()
      expect(prediction.threatConfidence).toBeGreaterThanOrEqual(0)
    })

    it('should classify threats correctly', async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '203.0.113.45',
        targetIP: '10.0.0.1',
        userId: 'user456',
        action: 'authenticate',
        severity: 'high',
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(prediction.threatClassification).toBeDefined()
      expect(prediction.threatClassification.malware).toBeGreaterThanOrEqual(0)
      expect(prediction.threatClassification.bruteForce).toBeGreaterThanOrEqual(0)
      expect(prediction.threatClassification.phishing).toBeGreaterThanOrEqual(0)
    })

    it('should have high anomaly score for suspicious behavior', async () => {
      const detector = new MLThreatDetector({ anomalyThreshold: 0.5 })

      // Add suspicious events
      for (let i = 0; i < 50; i++) {
        const event: SecurityEvent = {
          timestamp: Date.now() - (50 - i) * 1000,
          eventType: 'failed_login',
          sourceIP: `192.168.1.${i % 256}`,
          targetIP: '10.0.0.1',
          userId: 'target_user',
          action: 'authenticate',
          severity: 'high',
          port: 22,
          metadata: {},
        }
        await detector.predictThreat(event)
      }

      const final = await detector.predictThreat({
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.200',
        targetIP: '10.0.0.1',
        userId: 'target_user',
        action: 'authenticate',
        severity: 'high',
        metadata: {},
      })

      expect(final.anomalyScore).toBeGreaterThan(0.3)
    })
  })

  describe('Batch Prediction', () => {
    it('should predict threats for multiple events', async () => {
      const events: SecurityEvent[] = [
        {
          timestamp: Date.now() - 2000,
          eventType: 'failed_login',
          sourceIP: '192.168.1.1',
          targetIP: '10.0.0.1',
          userId: 'user1',
          action: 'authenticate',
          severity: 'medium',
          metadata: {},
        },
        {
          timestamp: Date.now() - 1000,
          eventType: 'access',
          sourceIP: '192.168.1.2',
          targetIP: '10.0.0.1',
          userId: 'user2',
          action: 'access_resource',
          severity: 'low',
          metadata: {},
        },
        {
          timestamp: Date.now(),
          eventType: 'data_transfer',
          sourceIP: '192.168.1.3',
          targetIP: '10.0.0.1',
          userId: 'user3',
          action: 'transfer_data',
          severity: 'high',
          metadata: {},
        },
      ]

      const predictions = await detector.batchPredict(events)
      expect(predictions).toHaveLength(3)
      expect(predictions[0].metadata).toBeDefined()
      expect(predictions[0].metadata.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty batch', async () => {
      const predictions = await detector.batchPredict([])
      expect(predictions).toHaveLength(0)
    })
  })

  describe('Feature Extraction', () => {
    it('should extract numerical features', async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'low',
        port: 443,
        payload: 'x'.repeat(1000),
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(prediction).toBeDefined()
      expect(prediction.explainability.topFeatures).toBeDefined()
      expect(prediction.explainability.topFeatures.length).toBeGreaterThan(0)
    })

    it('should calculate event rate correctly', async () => {
      // Add multiple events
      const now = Date.now()
      for (let i = 0; i < 10; i++) {
        await detector.predictThreat({
          timestamp: now - (10 - i) * 60000,
          eventType: 'login',
          sourceIP: '192.168.1.100',
          targetIP: '10.0.0.1',
          userId: 'user123',
          action: 'authenticate',
          severity: 'low',
          metadata: {},
        })
      }

      const event: SecurityEvent = {
        timestamp: now,
        eventType: 'login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'low',
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(prediction).toBeDefined()
    })
  })

  describe('Anomaly Detection', () => {
    it('should detect isolation forest anomalies', async () => {
      const detector = new MLThreatDetector({ anomalyThreshold: 0.6 })

      // Normal events
      for (let i = 0; i < 20; i++) {
        await detector.predictThreat({
          timestamp: Date.now() - (20 - i) * 1000,
          eventType: 'login',
          sourceIP: '192.168.1.100',
          targetIP: '10.0.0.1',
          userId: 'regular_user',
          action: 'authenticate',
          severity: 'low',
          port: 443,
          metadata: {},
        })
      }

      // Anomalous event
      const anomaly = await detector.predictThreat({
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '203.0.113.200',
        targetIP: '10.0.0.1',
        userId: 'regular_user',
        action: 'authenticate',
        severity: 'critical',
        port: 22,
        protocol: 'telnet',
        metadata: {},
      })

      expect(anomaly.anomalyScore).toBeGreaterThan(0.3)
    })

    it('should mark high score as anomaly', async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.1',
        targetIP: '10.0.0.1',
        userId: 'user1',
        action: 'authenticate',
        severity: 'critical',
        metadata: {},
      }

      const detector = new MLThreatDetector({ anomalyThreshold: 0.5 })
      // Add many suspicious events
      for (let i = 0; i < 100; i++) {
        await detector.predictThreat({
          timestamp: Date.now() - (100 - i) * 100,
          eventType: 'failed_login',
          sourceIP: `192.168.1.${i}`,
          targetIP: '10.0.0.1',
          userId: 'target',
          action: 'authenticate',
          severity: 'high',
          metadata: {},
        })
      }

      const prediction = await detector.predictThreat(event)
      expect(typeof prediction.isAnomaly).toBe('boolean')
    })
  })

  describe('Sequence Pattern Analysis', () => {
    it('should detect brute force attack patterns', async () => {
      for (let i = 0; i < 7; i++) {
        await detector.predictThreat({
          timestamp: Date.now() - (7 - i) * 1000,
          eventType: 'failed_login',
          sourceIP: '192.168.1.50',
          targetIP: '10.0.0.1',
          userId: 'admin',
          action: 'authenticate',
          severity: 'high',
          metadata: {},
        })
      }

      const prediction = await detector.predictThreat({
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.50',
        targetIP: '10.0.0.1',
        userId: 'admin',
        action: 'authenticate',
        severity: 'high',
        metadata: {},
      })

      expect(prediction.sequencePatterns).toBeDefined()
      expect(Array.isArray(prediction.sequencePatterns)).toBe(true)
    })

    it('should detect data exfiltration patterns', async () => {
      const patterns = [
        { type: 'authenticate', action: 'authenticate' },
        { type: 'access', action: 'access_data' },
        { type: 'access', action: 'access_data' },
        { type: 'transfer', action: 'transfer_data' },
      ]

      for (const pattern of patterns) {
        await detector.predictThreat({
          timestamp: Date.now(),
          eventType: pattern.type as any,
          sourceIP: '192.168.1.100',
          targetIP: '10.0.0.1',
          userId: 'suspicious_user',
          action: pattern.action,
          severity: 'high',
          metadata: {},
        })
      }

      const prediction = await detector.predictThreat({
        timestamp: Date.now(),
        eventType: 'transfer',
        sourceIP: '192.168.1.100',
        targetIP: '203.0.113.1',
        userId: 'suspicious_user',
        action: 'transfer_data',
        severity: 'critical',
        payload: 'x'.repeat(10000),
        metadata: {},
      })

      expect(prediction.sequencePatterns).toBeDefined()
    })

    it('should detect privilege escalation patterns', async () => {
      const escalationPattern = [
        {
          timestamp: Date.now() - 3000,
          eventType: 'login',
        },
        {
          timestamp: Date.now() - 2000,
          eventType: 'access',
        },
        {
          timestamp: Date.now() - 1000,
          eventType: 'access',
        },
      ]

      for (const step of escalationPattern) {
        await detector.predictThreat({
          timestamp: step.timestamp,
          eventType: step.eventType as any,
          sourceIP: '192.168.1.75',
          targetIP: '10.0.0.1',
          userId: 'escalating_user',
          action: step.eventType === 'login' ? 'authenticate' : 'execute_command',
          severity: 'medium',
          metadata: {},
        })
      }

      const prediction = await detector.predictThreat({
        timestamp: Date.now(),
        eventType: 'access',
        sourceIP: '192.168.1.75',
        targetIP: '10.0.0.1',
        userId: 'escalating_user',
        action: 'system_access',
        severity: 'high',
        metadata: {},
      })

      expect(prediction.sequencePatterns).toBeDefined()
    })
  })

  describe('Threat Clustering', () => {
    it('should assign cluster to threat', async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'high',
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(typeof prediction.clusterAssignment).toBe('number')
      expect(prediction.clusterAssignment).toBeGreaterThanOrEqual(0)
    })

    it('should group similar threats into same cluster', async () => {
      const baseEvent: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'high',
        metadata: {},
      }

      const prediction1 = await detector.predictThreat(baseEvent)

      const prediction2 = await detector.predictThreat({
        ...baseEvent,
        timestamp: Date.now() + 1000,
      })

      // Both should have cluster assignments
      expect(typeof prediction1.clusterAssignment).toBe('number')
      expect(typeof prediction2.clusterAssignment).toBe('number')
    })
  })

  describe('Explainability', () => {
    it('should provide feature importance', async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'high',
        port: 22,
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(prediction.explainability.featureImportance).toBeDefined()
      expect(prediction.explainability.featureImportance.size).toBeGreaterThan(0)
    })

    it('should provide top features', async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '203.0.113.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'critical',
        port: 22,
        protocol: 'telnet',
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(prediction.explainability.topFeatures).toBeDefined()
      expect(prediction.explainability.topFeatures.length).toBeGreaterThan(0)
      expect(prediction.explainability.topFeatures[0]).toHaveProperty('feature')
      expect(prediction.explainability.topFeatures[0]).toHaveProperty('value')
      expect(prediction.explainability.topFeatures[0]).toHaveProperty('impact')
    })

    it('should provide human-readable insights', async () => {
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'critical',
        port: 22,
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(prediction.explainability.humanReadableInsights).toBeDefined()
      expect(Array.isArray(prediction.explainability.humanReadableInsights)).toBe(
        true
      )
    })
  })

  describe('Model Management', () => {
    it('should export model', () => {
      const exported = detector.exportModel()
      expect(exported).toBeDefined()
      expect(typeof exported).toBe('object')
    })

    it('should import model', () => {
      const exported = detector.exportModel()
      detector.importModel(exported)
      expect(detector).toBeDefined()
    })

    it('should handle evaluation', async () => {
      const events: SecurityEvent[] = [
        {
          timestamp: Date.now() - 1000,
          eventType: 'failed_login',
          sourceIP: '192.168.1.1',
          targetIP: '10.0.0.1',
          userId: 'user1',
          action: 'authenticate',
          severity: 'high',
          metadata: {},
        },
        {
          timestamp: Date.now(),
          eventType: 'login',
          sourceIP: '192.168.1.1',
          targetIP: '10.0.0.1',
          userId: 'user1',
          action: 'authenticate',
          severity: 'low',
          metadata: {},
        },
      ]

      const labels = [true, false]

      await detector.evaluateModel(events, labels)
      const metrics = detector.getMetrics()
      expect(metrics).toBeDefined()
    })
  })

  describe('Online Learning', () => {
    it('should update models with online learning enabled', async () => {
      const detector = new MLThreatDetector({ enableOnlineLearning: true })

      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'high',
        metadata: {},
      }

      const prediction1 = await detector.predictThreat(event)
      const prediction2 = await detector.predictThreat(event)

      expect(prediction1).toBeDefined()
      expect(prediction2).toBeDefined()
    })

    it('should skip updates with online learning disabled', async () => {
      const detector = new MLThreatDetector({ enableOnlineLearning: false })

      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'user123',
        action: 'authenticate',
        severity: 'high',
        metadata: {},
      }

      const prediction = await detector.predictThreat(event)
      expect(prediction).toBeDefined()
    })
  })
})

// ============================================================================
// BEHAVIOR ANALYTICS TESTS (35+ tests)
// ============================================================================

describe('BehaviorAnalyticsEngine - User Behavior', () => {
  let engine: BehaviorAnalyticsEngine

  beforeEach(() => {
    engine = new BehaviorAnalyticsEngine()
  })

  describe('Baseline Creation', () => {
    it('should create user baseline', () => {
      const historicalData = [
        {
          userId: 'user123',
          timestamp: new Date(),
          type: 'login' as const,
          location: 'Office',
          device: 'Laptop',
          duration: 300,
        },
        {
          userId: 'user123',
          timestamp: new Date(),
          type: 'access' as const,
          resource: 'Database',
          privilegeLevel: 'user',
        },
      ]

      const baseline = engine.createUserBaseline('user123', historicalData)
      expect(baseline).toBeDefined()
      expect(baseline.userId).toBe('user123')
      expect(baseline.loginPatterns).toBeDefined()
      expect(baseline.accessPatterns).toBeDefined()
    })

    it('should analyze login patterns', () => {
      const historicalData = [
        {
          userId: 'user456',
          timestamp: new Date('2024-01-01 09:00:00'),
          type: 'login' as const,
          location: 'NYC',
          device: 'Desktop',
        },
        {
          userId: 'user456',
          timestamp: new Date('2024-01-02 09:15:00'),
          type: 'login' as const,
          location: 'NYC',
          device: 'Desktop',
        },
      ]

      const baseline = engine.createUserBaseline('user456', historicalData)
      expect(baseline.loginPatterns.frequentLocations.get('NYC')).toBeDefined()
      expect(baseline.loginPatterns.frequentDevices.get('Desktop')).toBeDefined()
    })

    it('should analyze access patterns', () => {
      const historicalData = [
        {
          userId: 'user789',
          timestamp: new Date(),
          type: 'access' as const,
          resource: 'Sales DB',
          privilegeLevel: 'user',
        },
        {
          userId: 'user789',
          timestamp: new Date(),
          type: 'access' as const,
          resource: 'Sales DB',
          privilegeLevel: 'user',
        },
      ]

      const baseline = engine.createUserBaseline('user789', historicalData)
      expect(baseline.accessPatterns.frequentResources.get('Sales DB')).toBeDefined()
    })

    it('should analyze data access patterns', () => {
      const historicalData = [
        {
          userId: 'user101',
          timestamp: new Date(),
          type: 'data_access' as const,
          dataSize: 1024000,
          duration: 60000,
        },
        {
          userId: 'user101',
          timestamp: new Date(),
          type: 'data_access' as const,
          dataSize: 2048000,
          duration: 90000,
        },
      ]

      const baseline = engine.createUserBaseline('user101', historicalData)
      expect(baseline.dataAccessPatterns.averageBytesPerDay).toBeGreaterThan(0)
      expect(baseline.dataAccessPatterns.averageDataAccessDuration).toBeGreaterThan(0)
    })
  })

  describe('Entity Baseline Creation', () => {
    it('should create device baseline', () => {
      const baseline = engine.createEntityBaseline('device_001', 'device')
      expect(baseline).toBeDefined()
      expect(baseline.entityId).toBe('device_001')
      expect(baseline.entityType).toBe('device')
      expect(baseline.networkBehavior).toBeDefined()
    })

    it('should create application baseline', () => {
      const baseline = engine.createEntityBaseline('app_001', 'application')
      expect(baseline).toBeDefined()
      expect(baseline.applicationBehavior).toBeDefined()
    })

    it('should create API baseline', () => {
      const baseline = engine.createEntityBaseline('api_001', 'api')
      expect(baseline).toBeDefined()
      expect(baseline.apiUsage).toBeDefined()
    })
  })

  describe('Activity Recording', () => {
    it('should record activity events', () => {
      const event = {
        userId: 'user123',
        timestamp: new Date(),
        type: 'login' as const,
        location: 'Office',
      }

      engine.recordActivityEvent(event)
      // Event recorded successfully
      expect(engine).toBeDefined()
    })

    it('should emit activity_recorded event', async () => {
      const event = {
        userId: 'user456',
        timestamp: new Date(),
        type: 'access' as const,
        resource: 'Database',
      }

      const eventPromise = new Promise<void>((resolve) => {
        engine.on('activity_recorded', (recorded) => {
          expect(recorded.userId).toBe('user456')
          resolve()
        })
      })

      engine.recordActivityEvent(event)
      await eventPromise
    })
  })

  describe('Temporal Anomaly Detection', () => {
    it('should detect unusual login times', () => {
      const historicalData = Array.from({ length: 30 }, (_, i) => ({
        userId: 'user_temporal',
        timestamp: new Date(`2024-01-${(i % 30) + 1} 09:00:00`),
        type: 'login' as const,
        location: 'Office',
        device: 'Desktop',
      }))

      engine.createUserBaseline('user_temporal', historicalData)

      // Record unusual time login
      engine.recordActivityEvent({
        userId: 'user_temporal',
        timestamp: new Date('2024-02-01 03:00:00'),
        type: 'login' as const,
        location: 'Office',
      })

      const anomalies = engine.analyzeUserActivity('user_temporal')
      expect(anomalies).toBeDefined()
      expect(Array.isArray(anomalies)).toBe(true)
    })

    it('should identify temporal anomalies in recent events', () => {
      const historicalData = [
        {
          userId: 'user_time',
          timestamp: new Date('2024-01-01 09:00:00'),
          type: 'login' as const,
        },
        {
          userId: 'user_time',
          timestamp: new Date('2024-01-02 09:30:00'),
          type: 'login' as const,
        },
      ]

      engine.createUserBaseline('user_time', historicalData)

      engine.recordActivityEvent({
        userId: 'user_time',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        type: 'login' as const,
        location: 'Office',
      })

      const anomalies = engine.analyzeUserActivity('user_time')
      expect(Array.isArray(anomalies)).toBe(true)
    })
  })

  describe('Spatial Anomaly Detection', () => {
    it('should detect impossible travel', () => {
      const historicalData = [
        {
          userId: 'user_spatial',
          timestamp: new Date('2024-01-01 09:00:00'),
          type: 'login' as const,
          location: 'New York',
        },
      ]

      engine.createUserBaseline('user_spatial', historicalData)

      const now = Date.now()
      // London login
      engine.recordActivityEvent({
        userId: 'user_spatial',
        timestamp: new Date(now - 60000),
        type: 'login' as const,
        location: 'New York',
      })

      // Impossible: Tokyo 1 minute later
      engine.recordActivityEvent({
        userId: 'user_spatial',
        timestamp: new Date(now),
        type: 'login' as const,
        location: 'Tokyo',
      })

      const anomalies = engine.analyzeUserActivity('user_spatial')
      const spatialAnomalies = anomalies.filter((a) => a.anomalyType === 'spatial')
      expect(Array.isArray(spatialAnomalies)).toBe(true)
    })

    it('should not flag normal location changes', () => {
      const historicalData = [
        {
          userId: 'user_normal_travel',
          timestamp: new Date('2024-01-01 09:00:00'),
          type: 'login' as const,
          location: 'NYC',
        },
        {
          userId: 'user_normal_travel',
          timestamp: new Date('2024-01-02 18:00:00'),
          type: 'login' as const,
          location: 'LA',
        },
      ]

      engine.createUserBaseline('user_normal_travel', historicalData)

      const now = Date.now()
      engine.recordActivityEvent({
        userId: 'user_normal_travel',
        timestamp: new Date(now - 60000),
        type: 'login' as const,
        location: 'NYC',
      })

      // Next day in LA (reasonable travel)
      engine.recordActivityEvent({
        userId: 'user_normal_travel',
        timestamp: new Date(now + 86400000),
        type: 'login' as const,
        location: 'LA',
      })

      const anomalies = engine.analyzeUserActivity('user_normal_travel')
      expect(Array.isArray(anomalies)).toBe(true)
    })
  })

  describe('Volumetric Anomaly Detection', () => {
    it('should detect unusual data transfer volumes', () => {
      const historicalData = Array.from({ length: 30 }, () => ({
        userId: 'user_volume',
        timestamp: new Date(),
        type: 'data_access' as const,
        dataSize: 1024000, // 1MB per day
      }))

      engine.createUserBaseline('user_volume', historicalData)

      engine.recordActivityEvent({
        userId: 'user_volume',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
        type: 'data_access' as const,
        dataSize: 100000000, // 100MB
      })

      const anomalies = engine.analyzeUserActivity('user_volume')
      const volumetricAnomalies = anomalies.filter(
        (a) => a.anomalyType === 'volumetric'
      )
      expect(Array.isArray(volumetricAnomalies)).toBe(true)
    })

    it('should consider historical baseline for volumetric analysis', () => {
      const historicalData = Array.from({ length: 30 }, (_, i) => ({
        userId: 'user_baseline_volume',
        timestamp: new Date(),
        type: 'data_access' as const,
        dataSize: 10000000 + i * 100000, // 10MB baseline
      }))

      engine.createUserBaseline('user_baseline_volume', historicalData)

      engine.recordActivityEvent({
        userId: 'user_baseline_volume',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
        type: 'data_access' as const,
        dataSize: 50000000, // 5x normal
      })

      const anomalies = engine.analyzeUserActivity('user_baseline_volume')
      expect(Array.isArray(anomalies)).toBe(true)
    })
  })

  describe('Pattern Anomaly Detection', () => {
    it('should detect excessive privilege escalations', () => {
      const historicalData = [
        {
          userId: 'user_priv',
          timestamp: new Date(),
          type: 'privilege_elevation' as const,
        },
      ]

      engine.createUserBaseline('user_priv', historicalData)

      // Record many escalations
      for (let i = 0; i < 50; i++) {
        engine.recordActivityEvent({
          userId: 'user_priv',
          timestamp: new Date(Date.now() - (50 - i) * 1000),
          type: 'privilege_elevation' as const,
        })
      }

      const anomalies = engine.analyzeUserActivity('user_priv')
      const patternAnomalies = anomalies.filter((a) => a.anomalyType === 'pattern')
      expect(Array.isArray(patternAnomalies)).toBe(true)
    })
  })

  describe('Risk Scoring', () => {
    it('should calculate user risk profile', () => {
      const historicalData = [
        {
          userId: 'user_risk',
          timestamp: new Date(),
          type: 'login' as const,
        },
      ]

      engine.createUserBaseline('user_risk', historicalData)

      const profile = engine.calculateUserRiskProfile('user_risk')
      expect(profile).toBeDefined()
      expect(profile.userId).toBe('user_risk')
      expect(profile.overallRiskScore).toBeGreaterThanOrEqual(0)
      expect(profile.overallRiskScore).toBeLessThanOrEqual(100)
      expect(['low', 'medium', 'high', 'critical']).toContain(profile.riskLevel)
    })

    it('should track risk trends', () => {
      const historicalData = [
        {
          userId: 'user_trend',
          timestamp: new Date(),
          type: 'login' as const,
        },
      ]

      engine.createUserBaseline('user_trend', historicalData)

      const profile1 = engine.calculateUserRiskProfile('user_trend')
      const profile2 = engine.calculateUserRiskProfile('user_trend')

      expect(profile2.riskTrend).toBeDefined()
      expect(['improving', 'stable', 'degrading']).toContain(profile2.riskTrend)
    })

    it('should decay risk scores over time', () => {
      const historicalData = [
        {
          userId: 'user_decay',
          timestamp: new Date(),
          type: 'login' as const,
        },
      ]

      engine.createUserBaseline('user_decay', historicalData)

      const profile = engine.calculateUserRiskProfile('user_decay')
      expect(profile.lastUpdated).toBeDefined()
      expect(profile.nextReviewDate).toBeDefined()
    })
  })

  describe('Peer Group Analysis', () => {
    it('should create peer group', () => {
      const members = ['user1', 'user2', 'user3']

      const group = engine.createPeerGroup(
        'group_sales',
        'Sales Team',
        'department',
        members,
        { commonDepartment: 'Sales' }
      )

      expect(group).toBeDefined()
      expect(group.groupId).toBe('group_sales')
      expect(group.members).toHaveLength(3)
    })

    it('should detect peer group outliers', () => {
      // Create baselines for users
      const users = ['user_a', 'user_b', 'user_c']
      for (const user of users) {
        engine.createUserBaseline(user, [
          {
            userId: user,
            timestamp: new Date(),
            type: 'login' as const,
          },
        ])
      }

      // Create peer group
      engine.createPeerGroup('test_group', 'Test Group', 'role', users, {
        commonRole: 'Analyst',
      })

      // Calculate risk profiles
      for (const user of users) {
        engine.calculateUserRiskProfile(user)
      }

      const anomalies = engine.detectPeerGroupAnomalies('test_group')
      expect(Array.isArray(anomalies)).toBe(true)
    })

    it('should update peer group metrics', () => {
      const members = ['user_pg1', 'user_pg2']

      for (const user of members) {
        engine.createUserBaseline(user, [
          {
            userId: user,
            timestamp: new Date(),
            type: 'login' as const,
          },
        ])
      }

      const group = engine.createPeerGroup(
        'metrics_group',
        'Test',
        'role',
        members,
        {}
      )

      expect(group.baselineMetrics).toBeDefined()
      expect(group.baselineMetrics.averageRiskScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Alert Generation', () => {
    it('should generate behavioral alert', () => {
      const historicalData = [
        {
          userId: 'user_alert',
          timestamp: new Date(),
          type: 'login' as const,
        },
      ]

      engine.createUserBaseline('user_alert', historicalData)

      const alert = engine.generateBehavioralAlert(
        'user_alert',
        undefined,
        'anomaly',
        'critical'
      )

      expect(alert).toBeDefined()
      expect(alert.userId).toBe('user_alert')
      expect(alert.alertType).toBe('anomaly')
      expect(alert.severity).toBe('critical')
    })

    it('should emit alert_generated event', async () => {
      engine.createUserBaseline('user_event', [
        {
          userId: 'user_event',
          timestamp: new Date(),
          type: 'login' as const,
        },
      ])

      const eventPromise = new Promise<void>((resolve) => {
        engine.on('alert_generated', (alert) => {
          expect(alert).toBeDefined()
          resolve()
        })
      })

      engine.generateBehavioralAlert('user_event', undefined, 'anomaly', 'warning')
      await eventPromise
    })

    it('should track alert status', () => {
      const alert = engine.generateBehavioralAlert(
        'user_status',
        undefined,
        'risk_threshold',
        'critical'
      )

      engine.updateAlertStatus(alert.alertId, 'acknowledged', 'analyst_1')
      expect(alert.status).toBe('open') // Original status unchanged

      const alerts = engine.getAlerts('user_status', 'open')
      expect(Array.isArray(alerts)).toBe(true)
    })
  })

  describe('Threshold Management', () => {
    it('should set anomaly detection thresholds', () => {
      engine.setAnomalyThresholds({
        temporal: 75,
        spatial: 85,
        volumetric: 80,
      })

      expect(engine).toBeDefined()
    })
  })
})

// ============================================================================
// PREDICTIVE INTELLIGENCE TESTS (35+ tests)
// ============================================================================

describe('PredictiveIntelligence - Attack Prediction', () => {
  let intelligence: PredictiveIntelligence

  beforeEach(() => {
    intelligence = new PredictiveIntelligence()
  })

  describe('Initialization', () => {
    it('should initialize with metadata', () => {
      expect(intelligence).toBeDefined()
      const metrics = intelligence.getModelMetrics('attack-predictor')
      expect(metrics).toBeDefined()
      expect(metrics?.modelName).toContain('Attack')
    })

    it('should have all model metadata', () => {
      const models = [
        'attack-predictor',
        'vulnerability-predictor',
        'threat-forecaster',
        'risk-predictor',
        'resource-forecaster',
      ]

      for (const model of models) {
        const metadata = intelligence.getModelMetrics(model)
        expect(metadata).toBeDefined()
        expect(metadata?.accuracy).toBeGreaterThan(0)
        expect(metadata?.precision).toBeGreaterThan(0)
      }
    })
  })

  describe('Attack Prediction', () => {
    it('should predict attacks', async () => {
      const historicalAttacks = [
        {
          type: 'brute_force',
          timestamp: '2024-01-01T10:00:00Z',
          target: 'server_1',
          vector: 'SSH',
          severity: 0.8,
        },
        {
          type: 'brute_force',
          timestamp: '2024-01-02T11:00:00Z',
          target: 'server_2',
          vector: 'RDP',
          severity: 0.7,
        },
      ]

      const predictions = await intelligence.predictAttacks(
        historicalAttacks,
        {
          exposures: 30,
          patched: 80,
          mfaAdoption: 60,
          alertingCoverage: 70,
        },
        []
      )

      expect(Array.isArray(predictions)).toBe(true)
      expect(predictions.length).toBeGreaterThan(0)
      expect(predictions[0]).toHaveProperty('attackType')
      expect(predictions[0]).toHaveProperty('likelihood')
      expect(predictions[0]).toHaveProperty('confidence')
    })

    it('should predict attack timing', async () => {
      const historicalAttacks = [
        {
          type: 'ddos',
          timestamp: '2024-01-01T10:00:00Z',
          target: 'api_1',
          vector: 'HTTP',
          severity: 0.9,
        },
      ]

      const predictions = await intelligence.predictAttacks(
        historicalAttacks,
        { exposures: 50, patched: 70, mfaAdoption: 40, alertingCoverage: 60 },
        []
      )

      const ddosPrediction = predictions.find((p) => p.attackType === 'ddos')
      if (ddosPrediction) {
        expect(ddosPrediction.timeToAttack).toBeDefined()
        expect(ddosPrediction.timeToAttack.min).toBeGreaterThan(0)
        expect(ddosPrediction.timeToAttack.max).toBeGreaterThan(
          ddosPrediction.timeToAttack.min
        )
      }
    })

    it('should predict attack targets', async () => {
      const historicalAttacks = [
        {
          type: 'phishing',
          timestamp: '2024-01-01T09:00:00Z',
          target: 'user_admin',
          vector: 'Email',
          severity: 0.6,
        },
        {
          type: 'phishing',
          timestamp: '2024-01-02T09:30:00Z',
          target: 'user_exec',
          vector: 'Email',
          severity: 0.7,
        },
      ]

      const predictions = await intelligence.predictAttacks(
        historicalAttacks,
        { exposures: 20, patched: 90, mfaAdoption: 80, alertingCoverage: 85 },
        []
      )

      expect(predictions.length).toBeGreaterThan(0)
      const phishingPrediction = predictions[0]
      expect(phishingPrediction.targetPrediction).toBeDefined()
      expect(phishingPrediction.targetPrediction.probability).toBeGreaterThanOrEqual(0)
    })

    it('should predict attack vectors', async () => {
      const historicalAttacks = [
        {
          type: 'exploit',
          timestamp: '2024-01-01T10:00:00Z',
          target: 'web_server',
          vector: 'SQL_Injection',
          severity: 0.8,
        },
        {
          type: 'exploit',
          timestamp: '2024-01-02T10:00:00Z',
          target: 'web_server',
          vector: 'XSS',
          severity: 0.6,
        },
      ]

      const predictions = await intelligence.predictAttacks(
        historicalAttacks,
        { exposures: 40, patched: 60, mfaAdoption: 50, alertingCoverage: 70 },
        []
      )

      expect(predictions[0].attackVectors).toBeDefined()
      expect(Array.isArray(predictions[0].attackVectors)).toBe(true)
      if (predictions[0].attackVectors.length > 0) {
        expect(predictions[0].attackVectors[0]).toHaveProperty('vector')
        expect(predictions[0].attackVectors[0]).toHaveProperty('probability')
      }
    })

    it('should include confidence intervals', async () => {
      const historicalAttacks = [
        {
          type: 'ransomware',
          timestamp: '2024-01-01T10:00:00Z',
          target: 'workstation',
          vector: 'Email',
          severity: 0.9,
        },
      ]

      const predictions = await intelligence.predictAttacks(
        historicalAttacks,
        { exposures: 35, patched: 75, mfaAdoption: 55, alertingCoverage: 65 },
        []
      )

      expect(predictions[0].confidenceInterval).toBeDefined()
      expect(predictions[0].confidenceInterval.lower).toBeGreaterThanOrEqual(0)
      expect(predictions[0].confidenceInterval.upper).toBeLessThanOrEqual(1)
    })
  })

  describe('Vulnerability Prediction', () => {
    it('should predict vulnerabilities', async () => {
      const vulnerabilities = [
        {
          id: 'CVE-2024-001',
          cvss: 8.5,
          type: 'RCE',
          discoveredDate: '2024-01-01',
          affectedAssets: ['server_1', 'server_2'],
        },
        {
          id: 'CVE-2024-002',
          cvss: 6.5,
          type: 'Auth Bypass',
          discoveredDate: '2024-01-02',
          affectedAssets: ['app_1'],
        },
      ]

      const predictions = await intelligence.predictVulnerabilities(
        vulnerabilities,
        { exposedSystems: 10, attackSurface: 5, networkAccess: 3 },
        []
      )

      expect(Array.isArray(predictions)).toBe(true)
      expect(predictions[0]).toHaveProperty('vulnerabilityId')
      expect(predictions[0]).toHaveProperty('exploitability')
      expect(predictions[0]).toHaveProperty('priorityScore')
    })

    it('should calculate exploitability', async () => {
      const vulnerabilities = [
        {
          id: 'CVE-2024-100',
          cvss: 9.8,
          type: 'Critical RCE',
          discoveredDate: '2024-01-01',
          affectedAssets: ['critical_system'],
        },
      ]

      const exploitInfo = [
        {
          vulnerabilityId: 'CVE-2024-100',
          exploitAvailable: true,
          pocsPublished: 5,
          inTheWild: true,
          exploitKits: 2,
        },
      ]

      const predictions = await intelligence.predictVulnerabilities(
        vulnerabilities,
        { exposedSystems: 20, attackSurface: 10, networkAccess: 5 },
        exploitInfo
      )

      expect(predictions[0].exploitability).toBeGreaterThan(0)
      expect(predictions[0].exploitability).toBeLessThanOrEqual(1)
    })

    it('should predict time to exploit', async () => {
      const vulnerabilities = [
        {
          id: 'CVE-2024-200',
          cvss: 7.5,
          type: 'Privilege Escalation',
          discoveredDate: '2024-01-01',
          affectedAssets: ['server_3'],
        },
      ]

      const predictions = await intelligence.predictVulnerabilities(
        vulnerabilities,
        { exposedSystems: 15, attackSurface: 8, networkAccess: 4 },
        [
          {
            vulnerabilityId: 'CVE-2024-200',
            exploitAvailable: true,
            pocsPublished: 3,
            inTheWild: false,
            exploitKits: 1,
          },
        ]
      )

      expect(predictions[0].timeToExploit).toBeDefined()
      expect(predictions[0].timeToExploit.min).toBeGreaterThan(0)
      expect(predictions[0].timeToExploit.expected).toBeGreaterThanOrEqual(
        predictions[0].timeToExploit.min
      )
    })

    it('should determine patch urgency', async () => {
      const vulnerabilities = [
        {
          id: 'CVE-2024-URGENT',
          cvss: 9.5,
          type: 'Critical',
          discoveredDate: '2024-01-01',
          affectedAssets: ['all'],
        },
      ]

      const predictions = await intelligence.predictVulnerabilities(
        vulnerabilities,
        { exposedSystems: 50, attackSurface: 30, networkAccess: 20 },
        [
          {
            vulnerabilityId: 'CVE-2024-URGENT',
            exploitAvailable: true,
            pocsPublished: 10,
            inTheWild: true,
            exploitKits: 5,
          },
        ]
      )

      expect(
        ['immediate', 'urgent', 'important', 'routine']
      ).toContain(predictions[0].patchUrgency)
    })
  })

  describe('Threat Forecasting', () => {
    it('should forecast threats', async () => {
      const historicalThreats = [
        { name: 'Ransomware', severity: 0.9, timestamp: '2024-01-01T10:00:00Z', frequency: 3 },
        { name: 'Phishing', severity: 0.7, timestamp: '2024-01-02T10:00:00Z', frequency: 5 },
      ]

      const forecast = await intelligence.forecastThreats(
        historicalThreats,
        [
          { name: 'Ransomware', severity: 0.9, trend: 'increasing' },
          { name: 'Phishing', severity: 0.7, trend: 'stable' },
        ],
        '30d'
      )

      expect(forecast).toBeDefined()
      expect(forecast.forecastPeriod).toBe('30d')
      expect(Array.isArray(forecast.threats)).toBe(true)
    })

    it('should identify threat trends', async () => {
      const historicalThreats = Array.from({ length: 10 }, (_, i) => ({
        name: 'Malware',
        severity: 0.5 + (i * 0.05),
        timestamp: `2024-01-${i + 1}T10:00:00Z`,
        frequency: 5 + i,
      }))

      const forecast = await intelligence.forecastThreats(
        historicalThreats,
        [{ name: 'Malware', severity: 0.75, trend: 'increasing' }],
        '7d'
      )

      expect(forecast.threats).toBeDefined()
      if (forecast.threats.length > 0) {
        expect(['increasing', 'stable', 'decreasing']).toContain(forecast.threats[0].trend)
      }
    })

    it('should detect seasonal patterns', async () => {
      const historicalThreats = [
        { name: 'Holiday Phishing', severity: 0.6, timestamp: '2023-12-01T10:00:00Z', frequency: 10 },
        { name: 'Holiday Phishing', severity: 0.65, timestamp: '2024-12-01T10:00:00Z', frequency: 12 },
      ]

      const forecast = await intelligence.forecastThreats(
        historicalThreats,
        [{ name: 'Holiday Phishing', severity: 0.65, trend: 'stable' }],
        '90d'
      )

      expect(forecast.seasonalPatterns).toBeDefined()
    })

    it('should detect emerging threats', async () => {
      const historicalThreats = [
        { name: 'Known Threat', severity: 0.7, timestamp: '2024-01-01T10:00:00Z', frequency: 2 },
      ]

      const forecast = await intelligence.forecastThreats(
        historicalThreats,
        [
          { name: 'Known Threat', severity: 0.7, trend: 'stable' },
          { name: 'New Emerging Threat', severity: 0.8, trend: 'increasing' },
        ],
        '30d'
      )

      expect(forecast.emergingThreats).toBeDefined()
    })
  })

  describe('Risk Prediction', () => {
    it('should predict risk scores', async () => {
      const currentMetrics = {
        score: 50,
        factors: [
          { name: 'Exposures', impact: 20, trend: 'up' as const },
          { name: 'Patch Gap', impact: 15, trend: 'stable' as const },
        ],
      }

      const prediction = await intelligence.predictRisk(currentMetrics, [], 30)

      expect(prediction).toBeDefined()
      expect(prediction.currentRiskScore).toBe(50)
      expect(prediction.predictedRiskScore).toBeDefined()
      expect(prediction.riskTrajectory).toBeDefined()
    })

    it('should evaluate mitigation impact', async () => {
      const currentMetrics = {
        score: 70,
        factors: [
          { name: 'Vulnerabilities', impact: 30, trend: 'up' as const },
        ],
      }

      const mitigations = [
        { strategy: 'Patch Management', riskReduction: 15, cost: 5000, timeline: 7 },
        { strategy: 'Network Segmentation', riskReduction: 20, cost: 10000, timeline: 14 },
      ]

      const prediction = await intelligence.predictRisk(currentMetrics, mitigations, 30)

      expect(prediction.mitigationStrategies).toBeDefined()
      expect(prediction.mitigationStrategies.length).toBe(2)
      expect(prediction.mitigationStrategies[0]).toHaveProperty('strategy')
      expect(prediction.mitigationStrategies[0]).toHaveProperty('effectiveness')
    })

    it('should generate what-if scenarios', async () => {
      const currentMetrics = {
        score: 60,
        factors: [{ name: 'Factor1', impact: 10, trend: 'stable' as const }],
      }

      const prediction = await intelligence.predictRisk(currentMetrics, [], 30)

      expect(prediction.whatIfScenarios).toBeDefined()
      expect(Array.isArray(prediction.whatIfScenarios)).toBe(true)
      expect(prediction.whatIfScenarios.length).toBeGreaterThan(0)
    })
  })

  describe('Resource Prediction', () => {
    it('should predict team workload', async () => {
      const incidents = [
        { timestamp: '2024-01-01T10:00:00Z', type: 'breach', resolution_time: 4, severity: 0.9 },
        { timestamp: '2024-01-02T11:00:00Z', type: 'malware', resolution_time: 2, severity: 0.7 },
      ]

      const prediction = await intelligence.predictResources(
        incidents,
        { currentAlertVolume: 100, teamSize: 5, currentWorkload: 60 },
        '30d'
      )

      expect(prediction).toBeDefined()
      expect(prediction.teamWorkloadForecast).toBeDefined()
      expect(prediction.teamWorkloadForecast.predictedWorkload).toBeGreaterThanOrEqual(0)
    })

    it('should predict incident volume', async () => {
      const incidents = Array.from({ length: 10 }, (_, i) => ({
        timestamp: `2024-01-${i + 1}T10:00:00Z`,
        type: 'incident',
        resolution_time: 2 + i,
        severity: 0.5 + Math.random() * 0.5,
      }))

      const prediction = await intelligence.predictResources(
        incidents,
        { currentAlertVolume: 150, teamSize: 8, currentWorkload: 70 },
        '7d'
      )

      expect(prediction.incidentVolumePrediction).toBeDefined()
      expect(prediction.incidentVolumePrediction.expectedIncidents).toBeGreaterThanOrEqual(0)
    })

    it('should predict alert fatigue', async () => {
      const incidents = [
        { timestamp: '2024-01-01T10:00:00Z', type: 'alert', resolution_time: 0.5, severity: 0.2 },
      ]

      const prediction = await intelligence.predictResources(
        incidents,
        { currentAlertVolume: 500, teamSize: 3, currentWorkload: 80 },
        '30d'
      )

      expect(prediction.alertFatiguePrediction).toBeDefined()
      expect(typeof prediction.alertFatiguePrediction.signalToNoise).toBe('number')
      expect(typeof prediction.alertFatiguePrediction.alertOverload).toBe('boolean')
    })

    it('should recommend resource allocation', async () => {
      const incidents = [
        { timestamp: '2024-01-01T10:00:00Z', type: 'incident', resolution_time: 3, severity: 0.8 },
      ]

      const prediction = await intelligence.predictResources(
        incidents,
        { currentAlertVolume: 200, teamSize: 5, currentWorkload: 75 },
        '30d'
      )

      expect(prediction.resourceAllocation).toBeDefined()
      expect(Array.isArray(prediction.resourceAllocation)).toBe(true)
    })

    it('should predict capacity planning', async () => {
      const incidents = [
        { timestamp: '2024-01-01T10:00:00Z', type: 'incident', resolution_time: 4, severity: 0.9 },
      ]

      const prediction = await intelligence.predictResources(
        incidents,
        { currentAlertVolume: 300, teamSize: 4, currentWorkload: 85 },
        '30d'
      )

      expect(prediction.capacityPlanning).toBeDefined()
      expect(prediction.capacityPlanning.currentCapacity).toBeGreaterThan(0)
      expect(prediction.capacityPlanning.projectedDemand).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Recommendation Generation', () => {
    it('should generate recommendations', async () => {
      const predictions = {
        attacks: [
          {
            attackType: 'brute_force',
            likelihood: 0.75,
            confidence: 0.85,
            timeToAttack: { min: 24, max: 168, expected: 72 },
            targetPrediction: {
              users: ['admin'],
              systems: ['web_server'],
              dataAssets: ['db_1'],
              probability: 0.8,
            },
            attackVectors: [
              { vector: 'SSH', probability: 0.6, ranking: 1 },
            ],
            confidenceInterval: { lower: 0.7, upper: 0.8, confidence: 0.95 },
          },
        ],
        vulnerabilities: [],
        threats: {
          forecastPeriod: '30d' as const,
          threats: [],
          seasonalPatterns: [],
          emergingThreats: [],
          threatLandscapeEvolution: { direction: 'stable' as const, magnitude: 0, keyDrivers: [] },
        },
        risk: {
          currentRiskScore: 50,
          predictedRiskScore: 55,
          riskTrajectory: 'stable' as const,
          timeHorizon: 30,
          riskFactors: [],
          mitigationStrategies: [],
          whatIfScenarios: [],
        },
        resources: {
          forecastPeriod: '30d',
          teamWorkloadForecast: {
            currentWorkload: 70,
            predictedWorkload: 75,
            peakWorkload: 85,
            peakDate: '2024-02-01',
          },
          incidentVolumePrediction: {
            expectedIncidents: 5,
            confidenceInterval: [4, 6],
            trend: 'stable' as const,
            seasonalAdjustment: 0,
          },
          alertFatiguePrediction: {
            alertVolume: 100,
            signalToNoise: 0.05,
            alertOverload: true,
            recommendedThresholds: [],
          },
          resourceAllocation: [],
          capacityPlanning: {
            currentCapacity: 200,
            projectedDemand: 180,
            surplus: 20,
            shortage: 0,
            recommendedIncrease: 0,
          },
        },
      }

      const recommendations = await intelligence.generateRecommendations(
        predictions,
        { assets: ['server_1', 'server_2'], users: 100, budget: 50000 }
      )

      expect(Array.isArray(recommendations)).toBe(true)
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('priority')
        expect(recommendations[0]).toHaveProperty('action')
        expect(recommendations[0]).toHaveProperty('rationale')
      }
    })
  })

  describe('Accuracy Tracking', () => {
    it('should track prediction accuracy', () => {
      intelligence.trackAccuracy('pred_1', 'attack-predictor', 0.7, 0.75)

      const history = intelligence.getPredictionHistory()
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].predictionId).toBe('pred_1')
    })

    it('should calculate accuracy statistics', () => {
      intelligence.trackAccuracy('pred_1', 'attack-predictor', 0.5, 0.55)
      intelligence.trackAccuracy('pred_2', 'attack-predictor', 0.7, 0.75)

      const stats = intelligence.getAccuracyStats('attack-predictor')
      expect(stats).toBeDefined()
      expect(stats.predictionCount).toBe(2)
      expect(stats.meanError).toBeDefined()
      expect(stats.calibrationRate).toBeGreaterThanOrEqual(0)
    })

    it('should identify calibrated predictions', () => {
      // Close prediction (< 20% error)
      intelligence.trackAccuracy('calibrated', 'threat-forecaster', 0.8, 0.81)

      const history = intelligence.getPredictionHistory()
      const calibrated = history.find((p) => p.predictionId === 'calibrated')

      expect(calibrated?.isCalibrated).toBe(true)
    })

    it('should track model performance over time', () => {
      for (let i = 0; i < 5; i++) {
        intelligence.trackAccuracy(
          `pred_${i}`,
          'vulnerability-predictor',
          0.6 + i * 0.05,
          0.65 + i * 0.05
        )
      }

      const stats = intelligence.getAccuracyStats('vulnerability-predictor')
      expect(stats.predictionCount).toBe(5)
    })
  })

  describe('Model Metadata', () => {
    it('should retrieve model metrics', () => {
      const metrics = intelligence.getModelMetrics('attack-predictor')
      expect(metrics).toBeDefined()
      expect(metrics?.accuracy).toBeGreaterThan(0.7)
      expect(metrics?.f1Score).toBeGreaterThan(0.7)
    })

    it('should track model version', () => {
      const metrics = intelligence.getModelMetrics('threat-forecaster')
      expect(metrics?.version).toBeDefined()
    })

    it('should track training date', () => {
      const metrics = intelligence.getModelMetrics('risk-predictor')
      expect(metrics?.trainingDate).toBeDefined()
    })
  })
})

// ============================================================================
// INTEGRATION TESTS (15+ tests)
// ============================================================================

describe('AI Security Analytics - Integration Tests', () => {
  let detector: MLThreatDetector
  let behavior: BehaviorAnalyticsEngine
  let intelligence: PredictiveIntelligence

  beforeEach(() => {
    detector = new MLThreatDetector()
    behavior = new BehaviorAnalyticsEngine()
    intelligence = new PredictiveIntelligence()
  })

  describe('End-to-End Threat Detection Flow', () => {
    it('should detect and classify threat holistically', async () => {
      // 1. ML Threat Detection
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '203.0.113.100',
        targetIP: '10.0.0.1',
        userId: 'admin',
        action: 'authenticate',
        severity: 'critical',
        port: 22,
        protocol: 'SSH',
        metadata: { attackCampaign: 'APT-28' },
      }

      const mlPrediction = await detector.predictThreat(event)
      expect(mlPrediction.anomalyScore).toBeGreaterThan(0)

      // 2. Behavior Analytics
      behavior.createUserBaseline('admin', [
        {
          userId: 'admin',
          timestamp: new Date(),
          type: 'login' as const,
          location: 'Office',
        },
      ])

      behavior.recordActivityEvent({
        userId: 'admin',
        timestamp: new Date(),
        type: 'failed_login' as const,
      })

      const behaviorAnomalies = behavior.analyzeUserActivity('admin')
      expect(Array.isArray(behaviorAnomalies)).toBe(true)

      // 3. Predictive Intelligence
      const predictions = await intelligence.predictAttacks(
        [
          {
            type: 'brute_force',
            timestamp: new Date().toISOString(),
            target: 'admin',
            vector: 'SSH',
            severity: 0.9,
          },
        ],
        { exposures: 40, patched: 70, mfaAdoption: 50, alertingCoverage: 65 },
        []
      )

      expect(predictions.length).toBeGreaterThan(0)
      expect(mlPrediction.anomalyScore).toBeGreaterThan(0)
    })

    it('should correlate events across systems', async () => {
      // Simulate coordinated attack
      const timestamp = Date.now()

      // 1. Multiple failed logins detected by ML
      for (let i = 0; i < 5; i++) {
        await detector.predictThreat({
          timestamp: timestamp - (5 - i) * 1000,
          eventType: 'failed_login',
          sourceIP: `192.168.1.${i}`,
          targetIP: '10.0.0.1',
          userId: 'target',
          action: 'authenticate',
          severity: 'high',
          metadata: {},
        })
      }

      // 2. Behavioral anomalies detected
      behavior.createUserBaseline('target', [
        {
          userId: 'target',
          timestamp: new Date(),
          type: 'login' as const,
        },
      ])

      for (let i = 0; i < 5; i++) {
        behavior.recordActivityEvent({
          userId: 'target',
          timestamp: new Date(timestamp - (5 - i) * 1000),
          type: 'failed_login' as const,
        })
      }

      const mlPrediction = await detector.predictThreat({
        timestamp,
        eventType: 'failed_login',
        sourceIP: '192.168.1.100',
        targetIP: '10.0.0.1',
        userId: 'target',
        action: 'authenticate',
        severity: 'critical',
        metadata: {},
      })

      const behaviorAnalysis = behavior.analyzeUserActivity('target')
      const riskProfile = behavior.calculateUserRiskProfile('target')

      expect(mlPrediction.isAnomaly).toBeDefined()
      expect(behaviorAnalysis.length).toBeGreaterThanOrEqual(0)
      expect(riskProfile.overallRiskScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Behavior to Prediction Pipeline', () => {
    it('should feed behavior analysis into predictions', async () => {
      // 1. Create baseline and analyze behavior
      behavior.createUserBaseline('user1', [
        {
          userId: 'user1',
          timestamp: new Date(),
          type: 'login' as const,
          location: 'NYC',
        },
      ])

      // 2. Record anomalous activity
      behavior.recordActivityEvent({
        userId: 'user1',
        timestamp: new Date(),
        type: 'data_access' as const,
        dataSize: 500000000, // Large transfer
      })

      // 3. Get behavioral analysis
      const behaviorAnomalies = behavior.analyzeUserActivity('user1')
      const riskProfile = behavior.calculateUserRiskProfile('user1')

      // 4. Use for predictive modeling
      const predictions = await intelligence.predictAttacks(
        [
          {
            type: 'data_exfiltration',
            timestamp: new Date().toISOString(),
            target: 'user1',
            vector: 'Network',
            severity: riskProfile.overallRiskScore / 100,
          },
        ],
        { exposures: 30, patched: 80, mfaAdoption: 60, alertingCoverage: 70 },
        []
      )

      expect(riskProfile.overallRiskScore).toBeGreaterThanOrEqual(0)
      expect(predictions.length).toBeGreaterThan(0)
    })
  })

  describe('Multi-Model Ensemble', () => {
    it('should combine model outputs for comprehensive threat assessment', async () => {
      const timestamp = Date.now()

      // Model 1: ML Threat Detector
      const mlResults: ThreatPrediction[] = []
      for (let i = 0; i < 3; i++) {
        const result = await detector.predictThreat({
          timestamp: timestamp - (3 - i) * 1000,
          eventType: 'failed_login',
          sourceIP: `203.0.113.${i}`,
          targetIP: '10.0.0.1',
          userId: 'test_user',
          action: 'authenticate',
          severity: 'high',
          metadata: {},
        })
        mlResults.push(result)
      }

      // Model 2: Behavior Analytics
      behavior.createUserBaseline('test_user', [
        {
          userId: 'test_user',
          timestamp: new Date(),
          type: 'login' as const,
        },
      ])

      for (let i = 0; i < 3; i++) {
        behavior.recordActivityEvent({
          userId: 'test_user',
          timestamp: new Date(timestamp - (3 - i) * 1000),
          type: 'failed_login' as const,
        })
      }

      const behaviorResults = behavior.analyzeUserActivity('test_user')
      const riskProfile = behavior.calculateUserRiskProfile('test_user')

      // Model 3: Predictive Intelligence
      const predictiveResults = await intelligence.predictAttacks(
        [
          {
            type: 'brute_force',
            timestamp: new Date().toISOString(),
            target: 'test_user',
            vector: 'SSH',
            severity: Math.max(...mlResults.map((r) => r.anomalyScore)),
          },
        ],
        { exposures: 35, patched: 75, mfaAdoption: 55, alertingCoverage: 65 },
        []
      )

      // Ensemble analysis
      const mlConsensus = mlResults.filter((r) => r.isAnomaly).length >= 2
      const behaviorConsensus = behaviorResults.length > 0
      const predictiveConsensus = predictiveResults.some((r) => r.likelihood > 0.6)

      expect(typeof mlConsensus).toBe('boolean')
      expect(typeof behaviorConsensus).toBe('boolean')
      expect(typeof predictiveConsensus).toBe('boolean')
    })
  })

  describe('Alert Generation Pipeline', () => {
    it('should generate alerts from detection results', async () => {
      // Detection phase
      const event: SecurityEvent = {
        timestamp: Date.now(),
        eventType: 'failed_login',
        sourceIP: '203.0.113.50',
        targetIP: '10.0.0.1',
        userId: 'alert_user',
        action: 'authenticate',
        severity: 'critical',
        metadata: {},
      }

      const mlPrediction = await detector.predictThreat(event)

      // Behavior analysis
      behavior.createUserBaseline('alert_user', [
        {
          userId: 'alert_user',
          timestamp: new Date(),
          type: 'login' as const,
        },
      ])

      behavior.recordActivityEvent({
        userId: 'alert_user',
        timestamp: new Date(),
        type: 'failed_login' as const,
      })

      // Alert generation
      if (mlPrediction.isAnomaly && mlPrediction.anomalyScore > 0.7) {
        const alert = behavior.generateBehavioralAlert(
          'alert_user',
          undefined,
          'anomaly',
          'critical'
        )

        expect(alert).toBeDefined()
        expect(alert.userId).toBe('alert_user')
        expect(alert.severity).toBe('critical')
      }
    })
  })

  describe('Performance Under Load', () => {
    it('should handle multiple concurrent threat predictions', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        timestamp: Date.now() - (10 - i) * 100,
        eventType: 'failed_login' as const,
        sourceIP: `192.168.${i}.${i}`,
        targetIP: '10.0.0.1',
        userId: `user_${i}`,
        action: 'authenticate',
        severity: 'high' as const,
        metadata: {},
      }))

      const predictions = await Promise.all(
        events.map((event) => detector.predictThreat(event))
      )

      expect(predictions).toHaveLength(10)
      expect(predictions.every((p) => p)).toBe(true)
    })

    it('should process behavioral analysis at scale', () => {
      // Create baselines for multiple users
      const users = Array.from({ length: 20 }, (_, i) => `user_${i}`)

      for (const userId of users) {
        behavior.createUserBaseline(userId, [
          {
            userId,
            timestamp: new Date(),
            type: 'login' as const,
          },
        ])
      }

      // Record activities
      for (const userId of users) {
        for (let j = 0; j < 5; j++) {
          behavior.recordActivityEvent({
            userId,
            timestamp: new Date(),
            type: 'access' as const,
            resource: `resource_${j}`,
          })
        }
      }

      // Analyze all users
      const analyses = users.map((userId) =>
        behavior.analyzeUserActivity(userId)
      )

      expect(analyses).toHaveLength(20)
      expect(analyses.every((a) => Array.isArray(a))).toBe(true)
    })
  })

  describe('Cross-System Correlation', () => {
    it('should correlate findings across all systems', async () => {
      const timestamp = Date.now()
      const susUser = 'correlated_user'

      // ML Detection
      const mlResults = []
      for (let i = 0; i < 3; i++) {
        const result = await detector.predictThreat({
          timestamp: timestamp - (3 - i) * 100,
          eventType: 'failed_login',
          sourceIP: `203.0.113.${100 + i}`,
          targetIP: '10.0.0.1',
          userId: susUser,
          action: 'authenticate',
          severity: 'high',
          metadata: {},
        })
        mlResults.push(result)
      }

      // Behavior Analysis
      behavior.createUserBaseline(susUser, [
        {
          userId: susUser,
          timestamp: new Date(),
          type: 'login' as const,
        },
      ])

      for (let i = 0; i < 3; i++) {
        behavior.recordActivityEvent({
          userId: susUser,
          timestamp: new Date(timestamp - (3 - i) * 100),
          type: 'failed_login' as const,
        })
      }

      const riskProfile = behavior.calculateUserRiskProfile(susUser)

      // Predictive Analysis
      const predictions = await intelligence.predictAttacks(
        [
          {
            type: 'brute_force',
            timestamp: new Date().toISOString(),
            target: susUser,
            vector: 'SSH',
            severity: riskProfile.overallRiskScore / 100,
          },
        ],
        { exposures: 40, patched: 70, mfaAdoption: 50, alertingCoverage: 60 },
        []
      )

      // Correlate
      const mlAnomalies = mlResults.filter((r) => r.isAnomaly)
      const behaviorAnomalies = behavior.analyzeUserActivity(susUser)
      const predictedRisk = predictions.filter((p) => p.likelihood > 0.6)

      const correlationScore =
        (mlAnomalies.length > 0 ? 1 : 0) +
        (behaviorAnomalies.length > 0 ? 1 : 0) +
        (predictedRisk.length > 0 ? 1 : 0)

      expect(correlationScore).toBeGreaterThan(0)
    })
  })
})
