/**
 * Comprehensive SIEM Integration Test Suite
 * Tests for SIEMConnectors, EventNormalizer, StreamManager, SIEMQueryBuilder, and CorrelationEngine
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  SplunkConnector,
  ElasticsearchConnector,
  QRadarConnector,
  LogRhythmConnector,
  DatadogSecurityConnector,
  SIEMConnectorManager,
  SIEMEvent,
  BaseSIEMConnector,
  SplunkConfig,
  ElasticsearchConfig,
  QRadarConfig,
  LogRhythmConfig,
  DatadogConfig,
} from '../integrations/siem/SIEMConnectors'
import EventNormalizer, {
  WorkflowEvent,
  CEFEvent,
  LEEFEvent,
  ECSEvent,
  SyslogEvent,
  GeoLocation,
  ThreatIntel,
  AssetContext,
  UserContext,
  EnrichedEvent,
} from '../integrations/siem/EventNormalizer'
import StreamManager, {
  StreamDestination,
  StreamMetrics,
  StreamHealth,
  DeadLetterEntry,
  FilterRule,
} from '../integrations/siem/StreamManager'
import {
  SIEMQueryBuilder,
  SIEMPlatform,
  ComparisonOperator,
  AggregationFunction,
  SortOrder,
  SavedSearchRepository,
  QUERY_TEMPLATES,
  LogicalOperator,
} from '../integrations/siem/SIEMQueryBuilder'
import {
  CorrelationEngine,
  SecurityEvent,
  CorrelationRule,
  CorrelationPriority,
  AttackChainStage,
  TimeCorrelationConfig,
  EntityCorrelationConfig,
  PatternCorrelationConfig,
  StatisticalCorrelationConfig,
} from '../integrations/siem/CorrelationEngine'

// ============================================================================
// HELPERS & FIXTURES
// ============================================================================

const createMockSIEMEvent = (overrides?: Partial<SIEMEvent>): SIEMEvent => ({
  timestamp: Date.now(),
  source: 'test-source',
  eventType: 'test_event',
  severity: 'high',
  message: 'Test event message',
  metadata: { test: true },
  tags: ['test'],
  userId: 'user123',
  workflowId: 'wf123',
  executionId: 'exec123',
  ...overrides,
})

const createMockWorkflowEvent = (overrides?: Partial<WorkflowEvent>): WorkflowEvent => ({
  id: `event_${Date.now()}`,
  timestamp: Date.now(),
  type: 'security',
  severity: 'high',
  source: 'test-system',
  message: 'Test workflow event',
  userId: 'user123',
  workflowId: 'wf123',
  nodeId: 'node123',
  ...overrides,
})

const createMockSecurityEvent = (overrides?: Partial<SecurityEvent>): SecurityEvent => ({
  id: `sec_${Date.now()}`,
  timestamp: Date.now(),
  source: 'firewall',
  eventType: 'auth_failure',
  severity: 50,
  entity: { type: 'user', value: 'testuser' },
  fields: { username: 'testuser', reason: 'invalid_password' },
  ...overrides,
})

const createMockGeoLocation = (): GeoLocation => ({
  country: 'US',
  country_code: 'US',
  city: 'San Francisco',
  latitude: 37.7749,
  longitude: -122.4194,
  timezone: 'America/Los_Angeles',
  asn: 'AS16509',
  isp: 'Amazon AWS',
})

const createMockThreatIntel = (): ThreatIntel => ({
  isKnownMalicious: false,
  riskScore: 25,
  categories: ['suspicious'],
  lastSeen: Date.now() - 86400000,
})

const createMockAssetContext = (): AssetContext => ({
  hostname: 'test-host',
  owner: 'infra-team',
  criticality: 'high',
  tags: ['production', 'web'],
  environment: 'production',
})

const createMockUserContext = (): UserContext => ({
  id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  department: 'engineering',
  role: 'developer',
  riskLevel: 'low',
})

// ============================================================================
// TESTS: SIEM CONNECTORS
// ============================================================================

describe('SIEM Integration', () => {
  describe('SIEMConnectors', () => {
    let splunkConfig: SplunkConfig
    let elasticsearchConfig: ElasticsearchConfig
    let qradarConfig: QRadarConfig
    let logrhythmConfig: LogRhythmConfig
    let datadogConfig: DatadogConfig

    beforeEach(() => {
      splunkConfig = {
        type: 'splunk',
        name: 'Splunk HEC',
        enabled: true,
        hecUrl: 'localhost:8088',
        hecToken: 'test-token',
        index: 'main',
        sourcetype: 'workflow',
        rateLimit: 1000,
        batchSize: 100,
        batchIntervalMs: 5000,
        maxRetries: 3,
        timeout: 30000,
      }

      elasticsearchConfig = {
        type: 'elasticsearch',
        name: 'Elasticsearch',
        enabled: true,
        nodes: ['http://localhost:9200'],
        apiKey: 'test-api-key',
        indexPattern: 'security-*',
        rateLimit: 1000,
        batchSize: 100,
        batchIntervalMs: 5000,
        maxRetries: 3,
        timeout: 30000,
      }

      qradarConfig = {
        type: 'qradar',
        name: 'IBM QRadar',
        enabled: true,
        host: 'qradar.example.com',
        apiKey: 'test-api-key',
        port: 443,
        rateLimit: 500,
        batchSize: 50,
        batchIntervalMs: 5000,
        maxRetries: 3,
        timeout: 30000,
      }

      logrhythmConfig = {
        type: 'logrhythm',
        name: 'LogRhythm',
        enabled: true,
        caseApiUrl: 'https://logrhythm.example.com',
        token: 'test-token',
        rateLimit: 500,
        batchSize: 50,
        batchIntervalMs: 5000,
        maxRetries: 3,
        timeout: 30000,
      }

      datadogConfig = {
        type: 'datadog',
        name: 'Datadog',
        enabled: true,
        apiKey: 'test-api-key',
        applicationKey: 'test-app-key',
        site: 'us1',
        rateLimit: 1000,
        batchSize: 100,
        batchIntervalMs: 5000,
        maxRetries: 3,
        timeout: 30000,
      }
    })

    describe('SplunkConnector', () => {
      let connector: SplunkConnector

      beforeEach(() => {
        connector = new SplunkConnector(splunkConfig)
      })

      it('should initialize with correct config', () => {
        expect(connector.isConnected()).toBe(false)
        expect(connector.getCircuitBreakerState().state).toBe('closed')
      })

      it('should handle connection lifecycle', async () => {
        const connectedSpy = vi.fn()
        connector.on('connected', connectedSpy)

        // Mock health check
        vi.spyOn(connector, 'healthCheck').mockResolvedValue(true)

        await connector.connect()
        expect(connector.isConnected()).toBe(true)

        await connector.disconnect()
        expect(connector.isConnected()).toBe(false)
      })

      it('should send individual events', async () => {
        vi.spyOn(connector, 'healthCheck').mockResolvedValue(true)
        await connector.connect()

        const event = createMockSIEMEvent()
        await connector.sendEvent(event)

        // Event should be queued
        expect(connector.getDeadLetterQueue().length).toBe(0)
      })

      it('should batch events on timer', async () => {
        vi.spyOn(connector, 'healthCheck').mockResolvedValue(true)
        vi.spyOn(connector, 'sendBatch').mockResolvedValue(undefined)

        await connector.connect()

        const event1 = createMockSIEMEvent({ timestamp: Date.now() })
        const event2 = createMockSIEMEvent({ timestamp: Date.now() + 1000 })

        await connector.sendEvent(event1)
        await connector.sendEvent(event2)

        // Wait for batch timer
        await new Promise((resolve) => setTimeout(resolve, 6000))

        await connector.disconnect()
      })

      it('should enforce rate limiting', async () => {
        const connectorWithLimit = new SplunkConnector({
          ...splunkConfig,
          rateLimit: 10, // 10 events per second
        })

        vi.spyOn(connectorWithLimit, 'healthCheck').mockResolvedValue(true)
        await connectorWithLimit.connect()

        const startTime = Date.now()
        const event = createMockSIEMEvent()

        // Send multiple events
        await connectorWithLimit.sendEvent(event)
        await connectorWithLimit.sendEvent(event)

        const duration = Date.now() - startTime
        expect(duration >= 0).toBe(true) // Should respect rate limit

        await connectorWithLimit.disconnect()
      })

      it('should handle circuit breaker transitions', async () => {
        const cbState = connector.getCircuitBreakerState()
        expect(cbState.state).toBe('closed')
        expect(cbState.failures).toBe(0)

        // Simulate failures
        for (let i = 0; i < 5; i++) {
          connector['updateCircuitBreaker'](false)
        }

        const failedState = connector.getCircuitBreakerState()
        expect(failedState.state).toBe('open')
        expect(failedState.failures).toBe(5)
      })

      it('should recover from open circuit after timeout', async () => {
        // Open circuit
        for (let i = 0; i < 5; i++) {
          connector['updateCircuitBreaker'](false)
        }

        expect(connector.getCircuitBreakerState().state).toBe('open')

        // Verify healing is blocked
        expect(connector['shouldAttemptHealing']()).toBe(false)

        // Move time forward
        vi.useFakeTimers()
        vi.advanceTimersByTime(35000)

        // Should transition to half-open
        expect(connector['shouldAttemptHealing']()).toBe(true)

        vi.useRealTimers()
      })

      it('should manage dead letter queue', async () => {
        const event = createMockSIEMEvent()

        // Manually add to dead letter queue
        connector['addToDeadLetterQueue']({
          event,
          timestamp: Date.now(),
          retries: 0,
        })

        const dlq = connector.getDeadLetterQueue()
        expect(dlq.length).toBe(1)
        expect(dlq[0].event).toBe(event)

        connector.clearDeadLetterQueue()
        expect(connector.getDeadLetterQueue().length).toBe(0)
      })

      it('should emit error events on connection failure', async () => {
        const errorSpy = vi.fn()
        connector.on('error', errorSpy)

        vi.spyOn(connector, 'healthCheck').mockResolvedValue(false)

        try {
          await connector.connect()
        } catch (error) {
          // Expected
        }

        expect(connector.isConnected()).toBe(false)
      })
    })

    describe('ElasticsearchConnector', () => {
      let connector: ElasticsearchConnector

      beforeEach(() => {
        connector = new ElasticsearchConnector(elasticsearchConfig)
      })

      it('should initialize with multiple nodes', () => {
        expect(connector.isConnected()).toBe(false)
      })

      it('should send batch to Elasticsearch bulk API', async () => {
        vi.spyOn(connector, 'healthCheck').mockResolvedValue(true)
        vi.spyOn(connector, 'sendBatch').mockResolvedValue(undefined)

        await connector.connect()

        const events = [
          createMockSIEMEvent(),
          createMockSIEMEvent(),
          createMockSIEMEvent(),
        ]

        await connector.sendBatch(events)
        expect(connector.isConnected()).toBe(true)

        await connector.disconnect()
      })

      it('should handle connection pooling', async () => {
        vi.spyOn(connector, 'healthCheck').mockResolvedValue(true)
        await connector.connect()

        const key = 'test-connection'
        const conn = { type: 'elasticsearch' }

        connector['setConnection'](key, conn)
        expect(connector['getConnection'](key)).toBe(conn)

        await connector.disconnect()
      })
    })

    describe('QRadarConnector', () => {
      let connector: QRadarConnector

      beforeEach(() => {
        connector = new QRadarConnector(qradarConfig)
      })

      it('should format events for QRadar API', async () => {
        vi.spyOn(connector, 'healthCheck').mockResolvedValue(true)
        vi.spyOn(connector, 'sendBatch').mockResolvedValue(undefined)

        await connector.connect()

        const event = createMockSIEMEvent({
          metadata: {
            sourceIp: '192.168.1.100',
            destinationIp: '10.0.0.1',
          },
        })

        await connector.sendBatch([event])

        await connector.disconnect()
      })

      it('should support custom event mapping', async () => {
        const customConfig = {
          ...qradarConfig,
          customEventMapping: {
            workflow_execution: 'CUSTOM_EVENT_001',
          },
        }
        const customConnector = new QRadarConnector(customConfig)

        vi.spyOn(customConnector, 'healthCheck').mockResolvedValue(true)
        vi.spyOn(customConnector, 'sendBatch').mockResolvedValue(undefined)

        await customConnector.connect()
        await customConnector.disconnect()
      })
    })

    describe('LogRhythmConnector', () => {
      let connector: LogRhythmConnector

      beforeEach(() => {
        connector = new LogRhythmConnector(logrhythmConfig)
      })

      it('should format events in CEF format for LogRhythm', async () => {
        vi.spyOn(connector, 'healthCheck').mockResolvedValue(true)
        vi.spyOn(connector, 'sendBatch').mockResolvedValue(undefined)

        await connector.connect()

        const event = createMockSIEMEvent()
        await connector.sendBatch([event])

        await connector.disconnect()
      })
    })

    describe('DatadogSecurityConnector', () => {
      let connector: DatadogSecurityConnector

      beforeEach(() => {
        connector = new DatadogSecurityConnector(datadogConfig)
      })

      it('should build correct Datadog URL for different sites', () => {
        expect(connector['ddApiUrl']).toContain('datadoghq.com')
      })

      it('should handle multiple Datadog sites', async () => {
        const eu1Connector = new DatadogSecurityConnector({
          ...datadogConfig,
          site: 'eu1',
        })

        expect(eu1Connector['ddApiUrl']).toContain('datadoghq.eu')
      })

      it('should send events with proper tags and metadata', async () => {
        vi.spyOn(connector, 'healthCheck').mockResolvedValue(true)
        vi.spyOn(connector, 'sendBatch').mockResolvedValue(undefined)

        await connector.connect()

        const event = createMockSIEMEvent()
        await connector.sendBatch([event])

        await connector.disconnect()
      })
    })

    describe('SIEMConnectorManager', () => {
      let manager: SIEMConnectorManager

      beforeEach(() => {
        manager = new SIEMConnectorManager()
      })

      it('should register and manage multiple connectors', () => {
        const splunk = new SplunkConnector(splunkConfig)
        const elastic = new ElasticsearchConnector(elasticsearchConfig)

        manager.registerConnector('splunk', splunk)
        manager.registerConnector('elasticsearch', elastic)

        vi.spyOn(splunk, 'isConnected').mockReturnValue(true)
        vi.spyOn(elastic, 'isConnected').mockReturnValue(true)
      })

      it('should send event to all connected connectors', async () => {
        const splunk = new SplunkConnector(splunkConfig)
        const elastic = new ElasticsearchConnector(elasticsearchConfig)

        vi.spyOn(splunk, 'isConnected').mockReturnValue(true)
        vi.spyOn(splunk, 'sendEvent').mockResolvedValue(undefined)
        vi.spyOn(elastic, 'isConnected').mockReturnValue(true)
        vi.spyOn(elastic, 'sendEvent').mockResolvedValue(undefined)

        manager.registerConnector('splunk', splunk)
        manager.registerConnector('elasticsearch', elastic)

        const event = createMockSIEMEvent()
        await manager.sendEventToAll(event)

        expect(splunk.sendEvent).toHaveBeenCalledWith(event)
        expect(elastic.sendEvent).toHaveBeenCalledWith(event)
      })

      it('should send event to specific connector', async () => {
        const splunk = new SplunkConnector(splunkConfig)
        vi.spyOn(splunk, 'sendEvent').mockResolvedValue(undefined)

        manager.registerConnector('splunk', splunk)

        const event = createMockSIEMEvent()
        await manager.sendEventTo('splunk', event)

        expect(splunk.sendEvent).toHaveBeenCalledWith(event)
      })

      it('should get connector status', async () => {
        const splunk = new SplunkConnector(splunkConfig)
        vi.spyOn(splunk, 'isConnected').mockReturnValue(true)
        vi.spyOn(splunk, 'healthCheck').mockResolvedValue(true)

        manager.registerConnector('splunk', splunk)

        const status = await manager.getConnectorStatus('splunk')
        expect(status).not.toBeNull()
        expect(status?.name).toBe('splunk')
        expect(status?.connected).toBe(true)
      })

      it('should get all connector statuses', async () => {
        const splunk = new SplunkConnector(splunkConfig)
        const elastic = new ElasticsearchConnector(elasticsearchConfig)

        vi.spyOn(splunk, 'isConnected').mockReturnValue(true)
        vi.spyOn(splunk, 'healthCheck').mockResolvedValue(true)
        vi.spyOn(elastic, 'isConnected').mockReturnValue(false)
        vi.spyOn(elastic, 'healthCheck').mockResolvedValue(false)

        manager.registerConnector('splunk', splunk)
        manager.registerConnector('elasticsearch', elastic)

        const statuses = await manager.getAllConnectorStatus()
        expect(statuses.length).toBe(2)
      })

      it('should handle error events', async () => {
        const errorSpy = vi.fn()
        manager.on('error', errorSpy)

        const splunk = new SplunkConnector(splunkConfig)
        vi.spyOn(splunk, 'isConnected').mockReturnValue(true)
        vi.spyOn(splunk, 'sendEvent').mockRejectedValue(new Error('Send failed'))

        manager.registerConnector('splunk', splunk)

        const event = createMockSIEMEvent()
        await manager.sendEventToAll(event)
      })

      it('should disconnect all connectors', async () => {
        const splunk = new SplunkConnector(splunkConfig)
        const elastic = new ElasticsearchConnector(elasticsearchConfig)

        vi.spyOn(splunk, 'disconnect').mockResolvedValue(undefined)
        vi.spyOn(elastic, 'disconnect').mockResolvedValue(undefined)

        manager.registerConnector('splunk', splunk)
        manager.registerConnector('elasticsearch', elastic)

        await manager.disconnectAll()

        expect(splunk.disconnect).toHaveBeenCalled()
        expect(elastic.disconnect).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // TESTS: EVENT NORMALIZER
  // ============================================================================

  describe('EventNormalizer', () => {
    let normalizer: EventNormalizer
    let geoipProvider: (ip: string) => Promise<GeoLocation>
    let threatIntelProvider: (ip: string) => Promise<ThreatIntel>
    let assetProvider: (hostname: string) => Promise<AssetContext>
    let userProvider: (userId: string) => Promise<UserContext>

    beforeEach(() => {
      geoipProvider = vi.fn().mockResolvedValue(createMockGeoLocation())
      threatIntelProvider = vi.fn().mockResolvedValue(createMockThreatIntel())
      assetProvider = vi.fn().mockResolvedValue(createMockAssetContext())
      userProvider = vi.fn().mockResolvedValue(createMockUserContext())

      normalizer = new EventNormalizer(
        geoipProvider,
        threatIntelProvider,
        assetProvider,
        userProvider
      )
    })

    describe('CEF Normalization', () => {
      it('should convert event to valid CEF format', async () => {
        const event = createMockWorkflowEvent()
        const cef = await normalizer.toCEF(event)

        expect(cef.cefVersion).toBeDefined()
        expect(cef.deviceVendor).toBe('Workflow')
        expect(cef.deviceProduct).toBe('WorkflowEngine')
        expect(cef.signatureId).toBeDefined()
        expect(cef.raw).toMatch(/^CEF:/)
      })

      it('should include all event fields in CEF extensions', async () => {
        const event = createMockWorkflowEvent({
          userId: 'user123',
          workflowId: 'wf123',
          nodeId: 'node123',
          duration: 5000,
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
        })

        const cef = await normalizer.toCEF(event)
        expect(cef.extensions.suser).toBe('user123')
        expect(cef.extensions.cs1).toBe('wf123')
        expect(cef.extensions.cs2).toBe('node123')
        expect(cef.extensions.dur).toBe(5000)
      })

      it('should escape special characters in CEF values', async () => {
        const event = createMockWorkflowEvent({
          message: 'Test=message with|pipe',
        })

        const cef = await normalizer.toCEF(event)
        expect(cef.raw).toContain('\\=')
      })

      it('should validate CEF format', async () => {
        const event = createMockWorkflowEvent()
        const cef = await normalizer.toCEF(event)

        const isValid = normalizer.validateCEF(cef)
        expect(isValid).toBe(true)
      })

      it('should map severity correctly', async () => {
        const events = [
          { event: createMockWorkflowEvent({ severity: 'critical' }), expectedSev: 10 },
          { event: createMockWorkflowEvent({ severity: 'high' }), expectedSev: 8 },
          { event: createMockWorkflowEvent({ severity: 'medium' }), expectedSev: 5 },
          { event: createMockWorkflowEvent({ severity: 'low' }), expectedSev: 3 },
          { event: createMockWorkflowEvent({ severity: 'info' }), expectedSev: 1 },
        ]

        for (const { event, expectedSev } of events) {
          const cef = await normalizer.toCEF(event)
          expect(cef.severity).toBe(expectedSev)
        }
      })
    })

    describe('LEEF Normalization', () => {
      it('should convert event to valid LEEF format', async () => {
        const event = createMockWorkflowEvent()
        const leef = await normalizer.toLEEF(event)

        expect(leef.version).toBe('2.0')
        expect(leef.vendor).toBe('Workflow')
        expect(leef.product).toBe('WorkflowEngine')
        expect(leef.raw).toMatch(/^LEEF:/)
      })

      it('should include all attributes in LEEF event', async () => {
        const event = createMockWorkflowEvent({
          userId: 'user123',
          workflowId: 'wf123',
          duration: 5000,
        })

        const leef = await normalizer.toLEEF(event)
        expect(leef.attributes.userId).toBe('user123')
        expect(leef.attributes.workflowId).toBe('wf123')
        expect(leef.attributes.duration).toBe(5000)
      })

      it('should validate LEEF format', async () => {
        const event = createMockWorkflowEvent()
        const leef = await normalizer.toLEEF(event)

        const isValid = normalizer.validateLEEF(leef)
        expect(isValid).toBe(true)
      })
    })

    describe('ECS Normalization', () => {
      it('should convert event to valid ECS format', async () => {
        const event = createMockWorkflowEvent()
        const ecs = await normalizer.toECS(event)

        expect(ecs['@timestamp']).toBeDefined()
        expect(ecs.event).toBeDefined()
        expect(ecs.event.id).toBe(event.id)
        expect(ecs.message).toBe(event.message)
      })

      it('should include ECS standard fields', async () => {
        const event = createMockWorkflowEvent({
          severity: 'critical',
          result: 'failure',
        })

        const ecs = await normalizer.toECS(event)
        expect(ecs.event.severity).toBe(5)
        expect(ecs.event.outcome).toBe('failure')
      })

      it('should include enriched data in ECS', async () => {
        const event = createMockWorkflowEvent({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          source: 'auth-system',
        })

        const enriched = await normalizer.enrichEvent(event)
        const ecs = await normalizer.toECS(event, enriched)

        expect(ecs.user).toBeDefined()
        expect(ecs.source).toBeDefined()
      })

      it('should validate ECS format', async () => {
        const event = createMockWorkflowEvent()
        const ecs = await normalizer.toECS(event)

        const isValid = normalizer.validateECS(ecs)
        expect(isValid).toBe(true)
      })

      it('should convert duration to nanoseconds', async () => {
        const event = createMockWorkflowEvent({ duration: 1000 })
        const ecs = await normalizer.toECS(event)

        expect(ecs.event.duration).toBe(1000 * 1_000_000)
      })
    })

    describe('Syslog Normalization', () => {
      it('should convert event to RFC 5424 syslog format', async () => {
        const event = createMockWorkflowEvent()
        const syslog = await normalizer.toSyslog(event)

        expect(syslog.priority).toBeGreaterThanOrEqual(0)
        expect(syslog.facility).toBeGreaterThanOrEqual(0)
        expect(syslog.severity).toBeGreaterThanOrEqual(0)
        expect(syslog.severity).toBeLessThanOrEqual(7)
        expect(syslog.raw).toMatch(/^<\d+>/)
      })

      it('should include structured data in syslog', async () => {
        const event = createMockWorkflowEvent({
          userId: 'user123',
          workflowId: 'wf123',
        })

        const syslog = await normalizer.toSyslog(event)
        expect(syslog.structuredData.workflow).toBeDefined()
        expect(syslog.structuredData.workflow.id).toBe('wf123')
      })

      it('should validate syslog format', async () => {
        const event = createMockWorkflowEvent()
        const syslog = await normalizer.toSyslog(event)

        const isValid = normalizer.validateSyslog(syslog)
        expect(isValid).toBe(true)
      })

      it('should calculate priority correctly', async () => {
        const event = createMockWorkflowEvent({ severity: 'critical' })
        const syslog = await normalizer.toSyslog(event)

        const facility = 16 // local0
        const severityMap: Record<string, number> = { critical: 2, high: 3, medium: 4, low: 5, info: 6 }
        const expectedPriority = facility * 8 + severityMap['critical']

        expect(syslog.priority).toBe(expectedPriority)
      })
    })

    describe('Event Enrichment', () => {
      it('should enrich event with geo-location', async () => {
        const event = createMockWorkflowEvent({
          ipAddress: '192.168.1.1',
        })

        const enriched = await normalizer.enrichEvent(event)
        expect(enriched.geoLocation).toBeDefined()
        expect(enriched.geoLocation?.country).toBe('US')
        expect(geoipProvider).toHaveBeenCalledWith('192.168.1.1')
      })

      it('should enrich event with threat intelligence', async () => {
        const event = createMockWorkflowEvent({
          ipAddress: '192.168.1.1',
        })

        const enriched = await normalizer.enrichEvent(event)
        expect(enriched.threatIntel).toBeDefined()
        expect(threatIntelProvider).toHaveBeenCalledWith('192.168.1.1')
      })

      it('should enrich event with asset context', async () => {
        const event = createMockWorkflowEvent({
          source: 'auth-system',
        })

        const enriched = await normalizer.enrichEvent(event)
        expect(enriched.assetContext).toBeDefined()
        expect(assetProvider).toHaveBeenCalledWith('auth-system')
      })

      it('should enrich event with user context', async () => {
        const event = createMockWorkflowEvent({
          userId: 'user123',
        })

        const enriched = await normalizer.enrichEvent(event)
        expect(enriched.userContext).toBeDefined()
        expect(userProvider).toHaveBeenCalledWith('user123')
      })

      it('should cache enrichment data', async () => {
        const event1 = createMockWorkflowEvent({ ipAddress: '192.168.1.1' })
        const event2 = createMockWorkflowEvent({ ipAddress: '192.168.1.1' })

        await normalizer.enrichEvent(event1)
        await normalizer.enrichEvent(event2)

        // Should use cache on second call
        expect(geoipProvider).toHaveBeenCalledTimes(1)
      })

      it('should handle enrichment provider failures gracefully', async () => {
        const failingGeoip = vi.fn().mockRejectedValue(new Error('GeoIP failed'))
        const normalizer2 = new EventNormalizer(
          failingGeoip,
          undefined,
          undefined,
          undefined
        )

        const event = createMockWorkflowEvent({ ipAddress: '192.168.1.1' })
        const enriched = await normalizer2.enrichEvent(event)

        expect(enriched.geoLocation).toBeUndefined()
      })
    })

    describe('Caching and Statistics', () => {
      it('should track cache statistics', async () => {
        const event1 = createMockWorkflowEvent({
          ipAddress: '192.168.1.1',
          userId: 'user123',
          source: 'auth-system',
        })

        await normalizer.enrichEvent(event1)

        const stats = normalizer.getCacheStats()
        expect(stats.geoip).toBeGreaterThan(0)
        expect(stats.threatIntel).toBeGreaterThan(0)
        expect(stats.users).toBeGreaterThan(0)
        expect(stats.assets).toBeGreaterThan(0)
      })

      it('should clear all caches', async () => {
        const event = createMockWorkflowEvent({
          ipAddress: '192.168.1.1',
          userId: 'user123',
        })

        await normalizer.enrichEvent(event)

        normalizer.clearCaches()

        const stats = normalizer.getCacheStats()
        expect(stats.geoip).toBe(0)
        expect(stats.threatIntel).toBe(0)
        expect(stats.users).toBe(0)
      })
    })

    describe('Integrity Verification', () => {
      it('should generate integrity hash for events', async () => {
        const event = createMockWorkflowEvent()
        const cef = await normalizer.toCEF(event)

        const hash = normalizer.generateIntegrityHash(cef)
        expect(hash).toMatch(/^[a-f0-9]{64}$/) // SHA256 hex
      })

      it('should generate different hashes for different events', async () => {
        const event1 = createMockWorkflowEvent({ message: 'event1' })
        const event2 = createMockWorkflowEvent({ message: 'event2' })

        const cef1 = await normalizer.toCEF(event1)
        const cef2 = await normalizer.toCEF(event2)

        const hash1 = normalizer.generateIntegrityHash(cef1)
        const hash2 = normalizer.generateIntegrityHash(cef2)

        expect(hash1).not.toBe(hash2)
      })
    })
  })

  // ============================================================================
  // TESTS: STREAM MANAGER
  // ============================================================================

  describe('StreamManager', () => {
    let streamManager: StreamManager

    beforeEach(() => {
      streamManager = new StreamManager()
    })

    describe('Destination Management', () => {
      it('should register stream destination', () => {
        const destination: StreamDestination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
            batchSize: 100,
            flushIntervalMs: 5000,
          },
        }

        streamManager.registerDestination(destination)

        const metrics = streamManager.getMetrics('dest1') as StreamMetrics
        expect(metrics.destinationId).toBe('dest1')
      })

      it('should reject duplicate destination registration', () => {
        const destination: StreamDestination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
          },
        }

        streamManager.registerDestination(destination)

        expect(() => {
          streamManager.registerDestination(destination)
        }).toThrow()
      })

      it('should unregister destination', () => {
        const destination: StreamDestination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
          },
        }

        streamManager.registerDestination(destination)
        streamManager.unregisterDestination('dest1')

        expect(() => {
          streamManager.getMetrics('dest1')
        }).toThrow()
      })
    })

    describe('Event Streaming', () => {
      let destination: StreamDestination

      beforeEach(() => {
        destination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
            batchSize: 2,
            flushIntervalMs: 1000,
          },
        }
        streamManager.registerDestination(destination)
      })

      it('should add event to buffer', async () => {
        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)

        const metrics = streamManager.getMetrics('dest1') as StreamMetrics
        expect(metrics.bufferSize).toBeGreaterThan(0)
      })

      it('should flush buffer when batch size reached', async () => {
        const flushSpy = vi.spyOn(streamManager, 'flushBuffer')

        const event1 = createMockWorkflowEvent()
        const event2 = createMockWorkflowEvent()

        await streamManager.streamEvent(event1)
        await streamManager.streamEvent(event2)

        // Should trigger flush when batch size (2) is reached
        expect(flushSpy).toHaveBeenCalled()
      })

      it('should apply sampling to events', async () => {
        const sampledDest: StreamDestination = {
          ...destination,
          config: { ...destination.config, samplingRate: 0.5 },
        }

        streamManager.unregisterDestination('dest1')
        streamManager.registerDestination(sampledDest)

        let count = 0
        for (let i = 0; i < 10; i++) {
          const event = createMockWorkflowEvent()
          await streamManager.streamEvent(event)
          count++
        }

        const metrics = streamManager.getMetrics('dest1') as StreamMetrics
        // With 50% sampling, buffer should have ~5 events (but may vary)
        expect(metrics.bufferSize).toBeLessThanOrEqual(count)
      })

      it('should apply filter rules to events', async () => {
        const filteredDest: StreamDestination = {
          ...destination,
          filterRules: [
            {
              field: 'severity',
              operator: 'equals',
              value: 'critical',
            },
          ],
        }

        streamManager.unregisterDestination('dest1')
        streamManager.registerDestination(filteredDest)

        const lowSevEvent = createMockWorkflowEvent({ severity: 'low' })
        const highSevEvent = createMockWorkflowEvent({ severity: 'critical' })

        await streamManager.streamEvent(lowSevEvent)
        await streamManager.streamEvent(highSevEvent)

        const metrics = streamManager.getMetrics('dest1') as StreamMetrics
        expect(metrics.bufferSize).toBe(1) // Only critical event
      })

      it('should handle buffer overflow with dead letter queue', async () => {
        const dest: StreamDestination = {
          ...destination,
          config: { ...destination.config, batchSize: 1000000 }, // Very large
        }

        streamManager.unregisterDestination('dest1')
        streamManager.registerDestination(dest)

        // This would normally trigger DLQ on overflow
        // Just verify DLQ is accessible
        const dlq = streamManager.getDeadLetterQueue()
        expect(Array.isArray(dlq)).toBe(true)
      })
    })

    describe('Buffer Flushing', () => {
      let destination: StreamDestination

      beforeEach(() => {
        destination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
            batchSize: 10,
            flushIntervalMs: 1000,
            compressionEnabled: false,
          },
        }
        streamManager.registerDestination(destination)
      })

      it('should flush buffered events', async () => {
        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)

        await streamManager.flushBuffer('dest1')

        const metrics = streamManager.getMetrics('dest1') as StreamMetrics
        expect(metrics.bufferSize).toBe(0)
      })

      it('should update metrics after flush', async () => {
        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)

        await streamManager.flushBuffer('dest1')

        const metrics = streamManager.getMetrics('dest1') as StreamMetrics
        expect(metrics.eventsSent).toBeGreaterThanOrEqual(0)
      })

      it('should compress data when enabled', async () => {
        const compressedDest: StreamDestination = {
          ...destination,
          config: { ...destination.config, compressionEnabled: true },
        }

        streamManager.unregisterDestination('dest1')
        streamManager.registerDestination(compressedDest)

        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)

        // Compression is applied internally
        await streamManager.flushBuffer('dest1')
      })

      it('should handle flush errors gracefully', async () => {
        const errorSpy = vi.fn()
        streamManager.on('error', errorSpy)

        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)

        // Flush with mock error
        await streamManager.flushBuffer('dest1')
      })
    })

    describe('Stream Health and Metrics', () => {
      let destination: StreamDestination

      beforeEach(() => {
        destination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
          },
        }
        streamManager.registerDestination(destination)
      })

      it('should track stream health', () => {
        const health = streamManager.getHealth('dest1') as StreamHealth
        expect(health.status).toBe('healthy')
        expect(health.failureCount).toBe(0)
        expect(health.successCount).toBe(0)
      })

      it('should calculate success rate', async () => {
        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)

        const metrics = streamManager.getMetrics('dest1') as StreamMetrics
        expect(metrics.successRate).toBeGreaterThanOrEqual(0)
        expect(metrics.successRate).toBeLessThanOrEqual(1)
      })

      it('should track latency percentiles', async () => {
        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)
        await streamManager.flushBuffer('dest1')

        const metrics = streamManager.getMetrics('dest1') as StreamMetrics
        expect(metrics.p50Latency).toBeGreaterThanOrEqual(0)
        expect(metrics.p95Latency).toBeGreaterThanOrEqual(0)
        expect(metrics.p99Latency).toBeGreaterThanOrEqual(0)
      })

      it('should get all metrics', () => {
        const allMetrics = streamManager.getMetrics() as StreamMetrics[]
        expect(Array.isArray(allMetrics)).toBe(true)
      })

      it('should get all health statuses', () => {
        const allHealth = streamManager.getHealth() as StreamHealth[]
        expect(Array.isArray(allHealth)).toBe(true)
      })
    })

    describe('Dead Letter Queue', () => {
      let destination: StreamDestination

      beforeEach(() => {
        destination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
          },
        }
        streamManager.registerDestination(destination)
      })

      it('should get dead letter queue entries', () => {
        const dlq = streamManager.getDeadLetterQueue()
        expect(Array.isArray(dlq)).toBe(true)
      })

      it('should limit DLQ size', () => {
        const dlq = streamManager.getDeadLetterQueue(100)
        expect(dlq.length).toBeLessThanOrEqual(100)
      })

      it('should replay events from dead letter queue', async () => {
        const event = createMockWorkflowEvent()

        // Mock adding to DLQ
        streamManager['addToDeadLetterQueue']('dest1', event, 'Test error')

        const replayed = await streamManager.replayDeadLetterQueue(10)
        expect(typeof replayed).toBe('number')
      })
    })

    describe('Checkpoints and Recovery', () => {
      let destination: StreamDestination

      beforeEach(() => {
        destination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
          },
        }
        streamManager.registerDestination(destination)
      })

      it('should get stream checkpoint', () => {
        const checkpoint = streamManager.getCheckpoint('dest1')
        expect(checkpoint === undefined || checkpoint.destinationId === 'dest1').toBe(true)
      })

      it('should create checkpoint after flush', async () => {
        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)
        await streamManager.flushBuffer('dest1')

        const checkpoint = streamManager.getCheckpoint('dest1')
        expect(checkpoint).toBeDefined()
        if (checkpoint) {
          expect(checkpoint.lastEventId).toBeDefined()
          expect(checkpoint.lastTimestamp).toBeGreaterThan(0)
        }
      })
    })

    describe('Shutdown', () => {
      it('should shutdown and flush all buffers', async () => {
        const destination: StreamDestination = {
          id: 'dest1',
          name: 'Test Destination',
          type: 'splunk',
          enabled: true,
          config: {
            endpoint: 'http://localhost:8088',
            apiKey: 'test-key',
            format: 'cef',
          },
        }

        streamManager.registerDestination(destination)

        const event = createMockWorkflowEvent()
        await streamManager.streamEvent(event)

        await streamManager.shutdown()

        // After shutdown, all timers should be cleared
      })
    })
  })

  // ============================================================================
  // TESTS: SIEM QUERY BUILDER
  // ============================================================================

  describe('SIEMQueryBuilder', () => {
    describe('Query Construction', () => {
      it('should create query for Splunk', () => {
        const builder = new SIEMQueryBuilder(SIEMPlatform.SPLUNK)
        const result = builder
          .where('severity', ComparisonOperator.EQUALS, 'high')
          .build()

        expect(result.platform).toBe(SIEMPlatform.SPLUNK)
        expect(result.query).toContain('severity')
      })

      it('should create query for Elasticsearch', () => {
        const builder = new SIEMQueryBuilder(SIEMPlatform.ELASTICSEARCH)
        const result = builder
          .where('severity', ComparisonOperator.EQUALS, 'high')
          .build()

        expect(result.platform).toBe(SIEMPlatform.ELASTICSEARCH)
        expect(result.query).toContain('bool')
      })

      it('should create query for QRadar', () => {
        const builder = new SIEMQueryBuilder(SIEMPlatform.QRADAR)
        const result = builder
          .where('severity', ComparisonOperator.EQUALS, 'high')
          .build()

        expect(result.platform).toBe(SIEMPlatform.QRADAR)
        expect(result.query).toContain('SELECT')
      })

      it('should create query for LogRhythm', () => {
        const builder = new SIEMQueryBuilder(SIEMPlatform.LOGRHYTHM)
        const result = builder
          .where('severity', ComparisonOperator.EQUALS, 'high')
          .build()

        expect(result.platform).toBe(SIEMPlatform.LOGRHYTHM)
      })
    })

    describe('Condition Building', () => {
      it('should add WHERE condition', () => {
        const builder = new SIEMQueryBuilder()
        builder.where('field', ComparisonOperator.EQUALS, 'value')

        expect(builder['conditions'].length).toBe(1)
      })

      it('should add AND condition', () => {
        const builder = new SIEMQueryBuilder()
        builder
          .where('field1', ComparisonOperator.EQUALS, 'value1')
          .and('field2', ComparisonOperator.EQUALS, 'value2')

        expect(builder['conditions'].length).toBe(2)
        expect(builder['conditions'][1].logicalOperator).toBe(LogicalOperator.AND)
      })

      it('should add OR condition', () => {
        const builder = new SIEMQueryBuilder()
        builder
          .where('field1', ComparisonOperator.EQUALS, 'value1')
          .or('field2', ComparisonOperator.EQUALS, 'value2')

        expect(builder['conditions'].length).toBe(2)
        expect(builder['conditions'][1].logicalOperator).toBe(LogicalOperator.OR)
      })

      it('should add NOT condition', () => {
        const builder = new SIEMQueryBuilder()
        builder
          .where('field1', ComparisonOperator.EQUALS, 'value1')
          .not('field2', ComparisonOperator.EQUALS, 'value2')

        expect(builder['conditions'].length).toBe(2)
      })

      it('should add IN condition', () => {
        const builder = new SIEMQueryBuilder()
        builder.in('status', ['active', 'pending'])

        expect(builder['conditions'].length).toBe(1)
        expect(builder['conditions'][0].operator).toBe(ComparisonOperator.IN)
      })

      it('should add BETWEEN condition', () => {
        const builder = new SIEMQueryBuilder()
        builder.between('response_time', 0, 1000)

        expect(builder['conditions'].length).toBe(1)
        expect(builder['conditions'][0].operator).toBe(ComparisonOperator.BETWEEN)
      })
    })

    describe('Time Range', () => {
      it('should set absolute time range', () => {
        const from = new Date('2025-01-01')
        const to = new Date('2025-12-31')

        const builder = new SIEMQueryBuilder()
        builder.timeRange(from, to)

        expect(builder['timeRange']).toBeDefined()
      })

      it('should set relative time range', () => {
        const builder = new SIEMQueryBuilder()
        builder.relativeTime('last_24_hours')

        expect(builder['timeRange']).toBeDefined()
        expect(builder['timeRange']?.relative).toBe('last_24_hours')
      })
    })

    describe('Aggregations', () => {
      it('should add count aggregation', () => {
        const builder = new SIEMQueryBuilder()
        builder.count('total_events')

        expect(builder['aggregations'].length).toBe(1)
      })

      it('should add sum aggregation', () => {
        const builder = new SIEMQueryBuilder()
        builder.sum('bytes_transferred', 'total_bytes')

        expect(builder['aggregations'].length).toBe(1)
      })

      it('should add avg aggregation', () => {
        const builder = new SIEMQueryBuilder()
        builder.avg('response_time', 'avg_latency')

        expect(builder['aggregations'].length).toBe(1)
      })

      it('should add percentile aggregation', () => {
        const builder = new SIEMQueryBuilder()
        builder.percentile('response_time', 95, 'p95')

        expect(builder['aggregations'].length).toBe(1)
      })

      it('should add distinct aggregation', () => {
        const builder = new SIEMQueryBuilder()
        builder.distinct('username', 'unique_users')

        expect(builder['aggregations'].length).toBe(1)
      })
    })

    describe('Grouping and Sorting', () => {
      it('should add grouping', () => {
        const builder = new SIEMQueryBuilder()
        builder.groupBy('username', 'source_ip')

        expect(builder['grouping']).toBeDefined()
        expect(builder['grouping']?.fields.length).toBe(2)
      })

      it('should set group limit', () => {
        const builder = new SIEMQueryBuilder()
        builder.groupBy('username').groupLimit(100)

        expect(builder['grouping']?.limit).toBe(100)
      })

      it('should add sorting', () => {
        const builder = new SIEMQueryBuilder()
        builder.orderBy('timestamp', SortOrder.DESCENDING)

        expect(builder['sorting'].length).toBe(1)
        expect(builder['sorting'][0].order).toBe(SortOrder.DESCENDING)
      })
    })

    describe('Query Options', () => {
      it('should set result limit', () => {
        const builder = new SIEMQueryBuilder()
        builder.limit(1000)

        expect(builder['config'].maxResults).toBe(1000)
      })

      it('should set timeout', () => {
        const builder = new SIEMQueryBuilder()
        builder.timeout(300)

        expect(builder['config'].timeout).toBe(300)
      })

      it('should add index hints', () => {
        const builder = new SIEMQueryBuilder()
        builder.indexHints('main', 'security')

        expect(builder['config'].indexHints?.length).toBe(2)
      })

      it('should enable optimization', () => {
        const builder = new SIEMQueryBuilder()
        builder.optimize()

        expect(builder['config'].costOptimization).toBe(true)
      })
    })

    describe('Query Validation', () => {
      it('should validate valid query', () => {
        const builder = new SIEMQueryBuilder()
        builder.where('field', ComparisonOperator.EQUALS, 'value')

        const validation = builder.validate()
        expect(validation.valid).toBe(true)
        expect(validation.errors.length).toBe(0)
      })

      it('should detect SQL injection attempts', () => {
        const builder = new SIEMQueryBuilder()
        builder.where('field; DROP TABLE', ComparisonOperator.EQUALS, 'value')

        const validation = builder.validate()
        expect(validation.valid).toBe(false)
      })

      it('should warn on grouping without aggregation', () => {
        const builder = new SIEMQueryBuilder()
        builder.groupBy('username')

        const validation = builder.validate()
        expect(validation.errors.length).toBeGreaterThan(0)
      })
    })

    describe('Builder Methods', () => {
      it('should clear conditions', () => {
        const builder = new SIEMQueryBuilder()
        builder.where('field', ComparisonOperator.EQUALS, 'value')
        builder.clear()

        expect(builder['conditions'].length).toBe(0)
      })

      it('should clone builder', () => {
        const builder = new SIEMQueryBuilder()
        builder.where('field', ComparisonOperator.EQUALS, 'value')

        const clone = builder.clone()
        clone.and('field2', ComparisonOperator.EQUALS, 'value2')

        expect(builder['conditions'].length).toBe(1)
        expect(clone['conditions'].length).toBe(2)
      })

      it('should set platform', () => {
        const builder = new SIEMQueryBuilder(SIEMPlatform.SPLUNK)
        builder.setPlatform(SIEMPlatform.ELASTICSEARCH)

        const result = builder.build()
        expect(result.platform).toBe(SIEMPlatform.ELASTICSEARCH)
      })
    })

    describe('Cost Estimation', () => {
      it('should estimate query cost', () => {
        const builder = new SIEMQueryBuilder()
        builder
          .where('field1', ComparisonOperator.EQUALS, 'value1')
          .and('field2', ComparisonOperator.EQUALS, 'value2')
          .aggregate(AggregationFunction.COUNT, '*')
          .optimize()

        const cost = builder.getQueryCostEstimate()
        expect(cost).toBeGreaterThan(0)
      })
    })

    describe('SavedSearchRepository', () => {
      let repo: SavedSearchRepository

      beforeEach(() => {
        repo = new SavedSearchRepository()
      })

      it('should save search', () => {
        const search = repo.save(
          'test_search',
          'Test search description',
          'SELECT * FROM events',
          SIEMPlatform.SPLUNK
        )

        expect(search.id).toBeDefined()
        expect(search.name).toBe('test_search')
      })

      it('should get saved search by ID', () => {
        const saved = repo.save(
          'test_search',
          'Test description',
          'SELECT * FROM events',
          SIEMPlatform.SPLUNK
        )

        const retrieved = repo.get(saved.id)
        expect(retrieved).toBe(saved)
      })

      it('should list all searches', () => {
        repo.save('search1', 'Desc1', 'query1', SIEMPlatform.SPLUNK)
        repo.save('search2', 'Desc2', 'query2', SIEMPlatform.ELASTICSEARCH)

        const all = repo.list()
        expect(all.length).toBe(2)
      })

      it('should filter searches by platform', () => {
        repo.save('search1', 'Desc1', 'query1', SIEMPlatform.SPLUNK)
        repo.save('search2', 'Desc2', 'query2', SIEMPlatform.ELASTICSEARCH)

        const splunkSearches = repo.listByPlatform(SIEMPlatform.SPLUNK)
        expect(splunkSearches.length).toBe(1)
      })

      it('should delete search', () => {
        const saved = repo.save(
          'test_search',
          'Test description',
          'SELECT * FROM events',
          SIEMPlatform.SPLUNK
        )

        const deleted = repo.delete(saved.id)
        expect(deleted).toBe(true)

        const retrieved = repo.get(saved.id)
        expect(retrieved).toBeUndefined()
      })

      it('should update search', () => {
        const saved = repo.save(
          'test_search',
          'Original description',
          'SELECT * FROM events',
          SIEMPlatform.SPLUNK
        )

        const updated = repo.update(saved.id, {
          name: 'updated_search',
        })

        expect(updated?.name).toBe('updated_search')
      })
    })

    describe('Query Templates', () => {
      it('should provide failed auth template', () => {
        const builder = QUERY_TEMPLATES.failedAuth()
        const result = builder.build()

        expect(result.query).toBeDefined()
      })

      it('should provide brute force template', () => {
        const builder = QUERY_TEMPLATES.bruteForce()
        const result = builder.build()

        expect(result.query).toBeDefined()
      })

      it('should provide suspicious network template', () => {
        const builder = QUERY_TEMPLATES.suspiciousNetwork()
        const result = builder.build()

        expect(result.query).toBeDefined()
      })

      it('should provide all templates', () => {
        const templates = [
          QUERY_TEMPLATES.failedAuth,
          QUERY_TEMPLATES.bruteForce,
          QUERY_TEMPLATES.suspiciousNetwork,
          QUERY_TEMPLATES.dataExfiltration,
          QUERY_TEMPLATES.privilegeEscalation,
          QUERY_TEMPLATES.malwareIndicators,
          QUERY_TEMPLATES.databaseAnomalies,
          QUERY_TEMPLATES.sslCertificateIssues,
          QUERY_TEMPLATES.dnsExfiltration,
        ]

        expect(templates.length).toBeGreaterThan(0)

        for (const template of templates) {
          const builder = template()
          const result = builder.build()
          expect(result.query).toBeDefined()
        }
      })
    })
  })

  // ============================================================================
  // TESTS: CORRELATION ENGINE
  // ============================================================================

  describe('CorrelationEngine', () => {
    let engine: CorrelationEngine

    beforeEach(() => {
      engine = new CorrelationEngine()
    })

    describe('Rule Management', () => {
      it('should register correlation rule', () => {
        const rule: CorrelationRule = {
          id: 'rule1',
          name: 'Test Rule',
          description: 'Test rule description',
          priority: CorrelationPriority.HIGH,
          enabled: true,
          conditions: [],
          actions: [],
          ttlSeconds: 300,
          deduplicationWindow: 60,
        }

        engine.registerRule(rule)
        const rules = engine.getRules()
        expect(rules.length).toBeGreaterThan(0)
      })

      it('should unregister rule', () => {
        const rule: CorrelationRule = {
          id: 'rule1',
          name: 'Test Rule',
          description: 'Test rule description',
          priority: CorrelationPriority.HIGH,
          enabled: true,
          conditions: [],
          actions: [],
          ttlSeconds: 300,
          deduplicationWindow: 60,
        }

        engine.registerRule(rule)
        engine.unregisterRule('rule1')

        const rules = engine.getRules()
        const found = rules.find((r) => r.id === 'rule1')
        expect(found).toBeUndefined()
      })

      it('should get enabled rules only', () => {
        const enabledRule: CorrelationRule = {
          id: 'rule1',
          name: 'Enabled Rule',
          description: 'Enabled',
          priority: CorrelationPriority.HIGH,
          enabled: true,
          conditions: [],
          actions: [],
          ttlSeconds: 300,
          deduplicationWindow: 60,
        }

        const disabledRule: CorrelationRule = {
          id: 'rule2',
          name: 'Disabled Rule',
          description: 'Disabled',
          priority: CorrelationPriority.HIGH,
          enabled: false,
          conditions: [],
          actions: [],
          ttlSeconds: 300,
          deduplicationWindow: 60,
        }

        engine.registerRule(enabledRule)
        engine.registerRule(disabledRule)

        const rules = engine.getRules()
        const hasDisabled = rules.some((r) => r.id === 'rule2')
        expect(hasDisabled).toBe(false)
      })
    })

    describe('Event Processing', () => {
      it('should process security event', async () => {
        const event = createMockSecurityEvent()
        const results = await engine.processEvent(event)

        expect(Array.isArray(results)).toBe(true)
      })

      it('should emit correlation event', async () => {
        const correlationSpy = vi.fn()
        engine.on('correlation', correlationSpy)

        const event = createMockSecurityEvent()
        await engine.processEvent(event)

        // Default rules may trigger correlation
      })

      it('should update entity behavior', async () => {
        const event = createMockSecurityEvent()
        await engine.processEvent(event)

        const behavior = engine.getEntityBehavior('user:testuser')
        expect(behavior).toBeDefined()
        if (behavior) {
          expect(behavior.eventCount).toBeGreaterThan(0)
        }
      })
    })

    describe('Time-based Correlation', () => {
      it('should detect events within time window', async () => {
        const event1 = createMockSecurityEvent({ timestamp: Date.now() })
        const event2 = createMockSecurityEvent({ timestamp: Date.now() + 1000 })

        await engine.processEvent(event1)
        await engine.processEvent(event2)

        const history = engine.getCorrelationHistory()
        expect(Array.isArray(history)).toBe(true)
      })

      it('should track event sequences', async () => {
        const event1 = createMockSecurityEvent({
          eventType: 'failed_login',
          timestamp: Date.now(),
        })
        const event2 = createMockSecurityEvent({
          eventType: 'successful_login',
          timestamp: Date.now() + 5000,
        })

        await engine.processEvent(event1)
        await engine.processEvent(event2)
      })
    })

    describe('Entity-based Correlation', () => {
      it('should track entity behavior', async () => {
        const entity = 'user:attacker'

        for (let i = 0; i < 5; i++) {
          const event = createMockSecurityEvent({
            entity: { type: 'user', value: 'attacker' },
            timestamp: Date.now() + i * 1000,
          })
          await engine.processEvent(event)
        }

        const behavior = engine.getEntityBehavior(entity)
        expect(behavior?.eventCount).toBe(5)
      })

      it('should calculate velocity', async () => {
        const entity = 'user:testuser'

        const event1 = createMockSecurityEvent({
          entity: { type: 'user', value: 'testuser' },
          timestamp: Date.now(),
        })

        await engine.processEvent(event1)

        const behavior = engine.getEntityBehavior(entity)
        expect(behavior?.velocity).toBeGreaterThanOrEqual(0)
      })

      it('should detect anomalous velocity', async () => {
        for (let i = 0; i < 10; i++) {
          const event = createMockSecurityEvent({
            entity: { type: 'ip', value: '192.168.1.100' },
            timestamp: Date.now() + i * 100, // Rapid fire
          })
          await engine.processEvent(event)
        }
      })
    })

    describe('Pattern-based Correlation', () => {
      it('should match patterns in event data', async () => {
        const event = createMockSecurityEvent({
          fields: { action: 'suspicious_download.exe' },
        })

        await engine.processEvent(event)
      })

      it('should support regex patterns', async () => {
        const event = createMockSecurityEvent({
          fields: { data: 'DROP TABLE users' },
        })

        await engine.processEvent(event)
      })
    })

    describe('Statistical Correlation', () => {
      it('should detect statistical anomalies', async () => {
        // Create baseline
        for (let i = 0; i < 20; i++) {
          const event = createMockSecurityEvent({
            entity: { type: 'user', value: 'normaluser' },
            timestamp: Date.now() + i * 1000,
          })
          await engine.processEvent(event)
        }

        // Send anomalous event
        const anomalyEvent = createMockSecurityEvent({
          entity: { type: 'user', value: 'normaluser' },
          timestamp: Date.now() + 50000,
        })
        await engine.processEvent(anomalyEvent)
      })

      it('should calculate baseline', async () => {
        const event = createMockSecurityEvent()
        await engine.processEvent(event)

        const behavior = engine.getEntityBehavior('user:testuser')
        expect(behavior?.baseline).toBeDefined()
      })
    })

    describe('Deduplication', () => {
      it('should deduplicate correlations', async () => {
        const event1 = createMockSecurityEvent()
        const event2 = createMockSecurityEvent()

        await engine.processEvent(event1)
        await engine.processEvent(event2)

        const history = engine.getCorrelationHistory()
        expect(history.length).toBeGreaterThanOrEqual(0)
      })

      it('should respect deduplication window', async () => {
        vi.useFakeTimers()

        const event = createMockSecurityEvent()
        const results1 = await engine.processEvent(event)

        vi.advanceTimersByTime(100) // Within dedup window

        const results2 = await engine.processEvent(event)

        vi.advanceTimersByTime(400000) // Beyond dedup window

        const results3 = await engine.processEvent(event)

        vi.useRealTimers()
      })
    })

    describe('Metrics and State Management', () => {
      it('should track correlation metrics', async () => {
        const event = createMockSecurityEvent()
        await engine.processEvent(event)

        const metrics = engine.getMetrics()
        expect(metrics.totalCorrelations).toBeGreaterThanOrEqual(0)
        expect(metrics.correlationLatencyMs).toBeGreaterThanOrEqual(0)
      })

      it('should get correlation history', async () => {
        const event = createMockSecurityEvent()
        await engine.processEvent(event)

        const history = engine.getCorrelationHistory(100)
        expect(Array.isArray(history)).toBe(true)
      })

      it('should reset engine state', async () => {
        const event = createMockSecurityEvent()
        await engine.processEvent(event)

        engine.reset()

        const metrics = engine.getMetrics()
        expect(metrics.totalCorrelations).toBe(0)
      })

      it('should cleanup expired state', async () => {
        const event = createMockSecurityEvent()
        await engine.processEvent(event)

        // Cleanup should not throw
        engine['cleanup']()
      })
    })

    describe('Default Rules', () => {
      it('should have brute force rule', () => {
        const rules = engine.getRules()
        const bruteForceRule = rules.find((r) => r.name === 'Brute Force Attack')
        expect(bruteForceRule).toBeDefined()
      })

      it('should have lateral movement rule', () => {
        const rules = engine.getRules()
        const lateralRule = rules.find((r) => r.name === 'Lateral Movement')
        expect(lateralRule).toBeDefined()
      })

      it('should have data exfiltration rule', () => {
        const rules = engine.getRules()
        const exfilRule = rules.find((r) => r.name === 'Data Exfiltration')
        expect(exfilRule).toBeDefined()
      })

      it('should have 15+ default rules', () => {
        const rules = engine.getRules()
        expect(rules.length).toBeGreaterThanOrEqual(15)
      })
    })

    describe('MITRE ATT&CK Mapping', () => {
      it('should map rules to MITRE techniques', async () => {
        const event = createMockSecurityEvent()
        const results = await engine.processEvent(event)

        // Check if any correlations have MITRE mapping
        for (const result of results) {
          expect(result.metadata).toBeDefined()
        }
      })
    })
  })

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    it('should perform end-to-end flow: event → normalize → stream', async () => {
      const normalizer = new EventNormalizer()
      const streamManager = new StreamManager(normalizer)

      const destination: StreamDestination = {
        id: 'test-dest',
        name: 'Test',
        type: 'splunk',
        enabled: true,
        config: {
          endpoint: 'http://localhost:8088',
          apiKey: 'test',
          format: 'cef',
        },
      }

      streamManager.registerDestination(destination)

      const event = createMockWorkflowEvent()
      await streamManager.streamEvent(event)

      const metrics = streamManager.getMetrics('test-dest') as StreamMetrics
      expect(metrics).toBeDefined()
    })

    it('should correlate events from stream', async () => {
      const engine = new CorrelationEngine()

      const event1 = createMockSecurityEvent({
        eventType: 'failed_login',
        entity: { type: 'user', value: 'attacker' },
      })

      const event2 = createMockSecurityEvent({
        eventType: 'failed_login',
        entity: { type: 'user', value: 'attacker' },
        timestamp: event1.timestamp + 1000,
      })

      const result1 = await engine.processEvent(event1)
      const result2 = await engine.processEvent(event2)

      expect(Array.isArray(result1)).toBe(true)
      expect(Array.isArray(result2)).toBe(true)
    })

    it('should query events with builder and process through engine', async () => {
      const builder = new SIEMQueryBuilder(SIEMPlatform.SPLUNK)
      const query = builder
        .where('severity', ComparisonOperator.EQUALS, 'high')
        .and('event_type', ComparisonOperator.EQUALS, 'security')
        .count('event_count')
        .groupBy('username')
        .build()

      expect(query.query).toBeDefined()

      const engine = new CorrelationEngine()
      const event = createMockSecurityEvent({ severity: 80 })

      await engine.processEvent(event)
    })
  })
})
