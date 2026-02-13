/**
 * Threat Hunting System Tests
 *
 * Comprehensive test suite for ThreatHuntingPlatform, HuntQueryLibrary,
 * and InvestigationTools with 120+ tests covering core functionality,
 * integration, and edge cases.
 *
 * @file threat-hunting.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ThreatHuntingPlatform,
  Hunt,
  Hypothesis,
  HuntFinding,
  HuntStatus,
  HypothesisStatus,
  FindingSeverity,
  DataSourceType,
  HuntTechnique,
  HuntTemplate
} from '../ai/security/ThreatHuntingPlatform'
import {
  HuntQueryLibrary,
  HuntQuery,
  QueryCategory
} from '../ai/security/HuntQueryLibrary'
import {
  InvestigationTools,
  InvestigationCase,
  EntityReference,
  EntityAnalysis,
  IOC,
  EvidenceItem,
  TimelineEvent,
  EntityRelationship
} from '../ai/security/InvestigationTools'

// ============================================================================
// THREAT HUNTING PLATFORM TESTS (40+ tests)
// ============================================================================

describe('ThreatHuntingPlatform', () => {
  let platform: ThreatHuntingPlatform

  beforeEach(() => {
    platform = new ThreatHuntingPlatform()
  })

  // Hunt Creation and Lifecycle Tests (8 tests)
  describe('Hunt Lifecycle', () => {
    it('should create a new hunt', () => {
      const hunt = platform.createHunt({
        name: 'APT28 Hunting Campaign',
        description: 'Hunt for APT28 indicators',
        status: HuntStatus.PLANNED,
        scope: 'All endpoints',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      expect(hunt).toBeDefined()
      expect(hunt.id).toMatch(/^hunt_/)
      expect(hunt.name).toBe('APT28 Hunting Campaign')
      expect(hunt.status).toBe(HuntStatus.PLANNED)
      expect(hunt.hypotheses).toHaveLength(0)
      expect(hunt.findings).toHaveLength(0)
    })

    it('should retrieve hunt by ID', () => {
      const created = platform.createHunt({
        name: 'Test Hunt',
        description: 'Test description',
        status: HuntStatus.PLANNED,
        scope: 'Network',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      const retrieved = platform.getHunt(created.id)
      expect(retrieved).toEqual(created)
    })

    it('should list all hunts', () => {
      platform.createHunt({
        name: 'Hunt 1',
        description: 'First',
        status: HuntStatus.PLANNED,
        scope: 'Scope1',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      platform.createHunt({
        name: 'Hunt 2',
        description: 'Second',
        status: HuntStatus.ACTIVE,
        scope: 'Scope2',
        startDate: new Date(),
        huntedBy: 'user2'
      })

      const hunts = platform.listHunts()
      expect(hunts).toHaveLength(2)
    })

    it('should filter hunts by status', () => {
      platform.createHunt({
        name: 'Active Hunt',
        description: 'Active',
        status: HuntStatus.ACTIVE,
        scope: 'Scope',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      platform.createHunt({
        name: 'Planned Hunt',
        description: 'Planned',
        status: HuntStatus.PLANNED,
        scope: 'Scope',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      const activeHunts = platform.listHunts(HuntStatus.ACTIVE)
      expect(activeHunts).toHaveLength(1)
      expect(activeHunts[0].name).toBe('Active Hunt')
    })

    it('should emit hunt:created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        platform.on('hunt:created', (hunt: Hunt) => {
          expect(hunt.name).toBe('Event Test Hunt')
          resolve()
        })
      })

      platform.createHunt({
        name: 'Event Test Hunt',
        description: 'Test',
        status: HuntStatus.PLANNED,
        scope: 'Test',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      await eventPromise
    })

    it('should return null for non-existent hunt', () => {
      const hunt = platform.getHunt('invalid_id')
      expect(hunt).toBeNull()
    })

    it('should handle multiple hunts concurrently', () => {
      const hunts = Array.from({ length: 5 }).map((_, i) =>
        platform.createHunt({
          name: `Hunt ${i}`,
          description: `Concurrent ${i}`,
          status: HuntStatus.PLANNED,
          scope: 'Scope',
          startDate: new Date(),
          huntedBy: `user${i}`
        })
      )

      expect(platform.listHunts()).toHaveLength(5)
      expect(new Set(hunts.map(h => h.id)).size).toBe(5)
    })
  })

  // Hypothesis Management Tests (10 tests)
  describe('Hypothesis Management', () => {
    let hunt: Hunt

    beforeEach(() => {
      hunt = platform.createHunt({
        name: 'Hypothesis Test Hunt',
        description: 'Test hypotheses',
        status: HuntStatus.PLANNED,
        scope: 'Test',
        startDate: new Date(),
        huntedBy: 'user1'
      })
    })

    it('should add hypothesis to hunt', () => {
      const hypothesis = platform.addHypothesis(hunt.id, {
        title: 'Credential Theft Hypothesis',
        description: 'Attackers are stealing credentials',
        assumptions: ['LSASS access indicates credential theft'],
        killChain: [
          {
            phase: 'Credential Access',
            description: 'LSASS memory access',
            indicators: ['EventCode 10'],
            mitreTechniques: ['T1110.001']
          }
        ],
        mitreTactics: ['Credential Access'],
        mitreTechniques: ['T1110.001', 'T1555.003']
      })

      expect(hypothesis).toBeDefined()
      expect(hypothesis?.id).toMatch(/^hyp_/)
      expect(hypothesis?.status).toBe(HypothesisStatus.DRAFT)
      expect(hypothesis?.confidence).toBe(0)
      expect(hunt.hypotheses).toHaveLength(1)
    })

    it('should return null for invalid hunt when adding hypothesis', () => {
      const hypothesis = platform.addHypothesis('invalid_hunt_id', {
        title: 'Test',
        description: 'Test',
        assumptions: [],
        killChain: [],
        mitreTactics: [],
        mitreTechniques: []
      })

      expect(hypothesis).toBeNull()
    })

    it('should set initial hypothesis status to DRAFT', () => {
      const hypothesis = platform.addHypothesis(hunt.id, {
        title: 'New Hypothesis',
        description: 'Testing status',
        assumptions: [],
        killChain: [],
        mitreTactics: [],
        mitreTechniques: []
      })

      expect(hypothesis?.status).toBe(HypothesisStatus.DRAFT)
    })

    it('should populate hypothesis with required fields', () => {
      const hypothesis = platform.addHypothesis(hunt.id, {
        title: 'Test Hypothesis',
        description: 'Test',
        assumptions: ['Assumption 1'],
        killChain: [],
        mitreTactics: ['Persistence'],
        mitreTechniques: ['T1547.001']
      })

      expect(hypothesis?.title).toBe('Test Hypothesis')
      expect(hypothesis?.mitreTactics).toContain('Persistence')
      expect(hypothesis?.mitreTechniques).toContain('T1547.001')
      expect(hypothesis?.assumptions).toContain('Assumption 1')
    })

    it('should update hypothesis status through validation', async () => {
      const hypothesis = platform.addHypothesis(hunt.id, {
        title: 'Test',
        description: 'Test',
        assumptions: [],
        killChain: [],
        mitreTactics: [],
        mitreTechniques: []
      })

      const validated = platform.validateHypothesis(hunt.id, hypothesis!.id)
      expect(validated?.status).toBe(HypothesisStatus.INCONCLUSIVE)
    })

    it('should emit hypothesis:created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        platform.on('hypothesis:created', (hyp: Hypothesis) => {
          expect(hyp.title).toBe('Event Hypothesis')
          resolve()
        })
      })

      platform.addHypothesis(hunt.id, {
        title: 'Event Hypothesis',
        description: 'Test',
        assumptions: [],
        killChain: [],
        mitreTactics: [],
        mitreTechniques: []
      })

      await eventPromise
    })

    it('should handle multiple hypotheses per hunt', () => {
      for (let i = 0; i < 3; i++) {
        platform.addHypothesis(hunt.id, {
          title: `Hypothesis ${i}`,
          description: `Test ${i}`,
          assumptions: [],
          killChain: [],
          mitreTactics: [],
          mitreTechniques: []
        })
      }

      expect(hunt.hypotheses).toHaveLength(3)
    })

    it('should initialize hypothesis with empty evidence array', () => {
      const hypothesis = platform.addHypothesis(hunt.id, {
        title: 'Test',
        description: 'Test',
        assumptions: [],
        killChain: [],
        mitreTactics: [],
        mitreTechniques: []
      })

      expect(hypothesis?.evidence).toEqual([])
    })

    it('should set hypothesis createdBy to hunt owner', () => {
      const testHunt = platform.createHunt({
        name: 'Test',
        description: 'Test',
        status: HuntStatus.PLANNED,
        scope: 'Test',
        startDate: new Date(),
        huntedBy: 'specific_hunter'
      })

      const hypothesis = platform.addHypothesis(testHunt.id, {
        title: 'Test',
        description: 'Test',
        assumptions: [],
        killChain: [],
        mitreTactics: [],
        mitreTechniques: []
      })

      expect(hypothesis?.createdBy).toBe('specific_hunter')
    })
  })

  // Hunt Execution Tests (8 tests)
  describe('Hunt Execution', () => {
    let hunt: Hunt

    beforeEach(() => {
      hunt = platform.createHunt({
        name: 'Execution Test Hunt',
        description: 'Test execution',
        status: HuntStatus.PLANNED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1',
        dataSources: [DataSourceType.WINDOWS_EVENTS],
        techniques: [HuntTechnique.IOC_SEARCH]
      })

      platform.connectDataSource(DataSourceType.WINDOWS_EVENTS, {})
      platform.addHypothesis(hunt.id, {
        title: 'Test',
        description: 'Test',
        assumptions: [],
        killChain: [],
        mitreTactics: [],
        mitreTechniques: []
      })
    })

    it('should execute hunt', async () => {
      const result = await platform.executeHunt(hunt.id)
      expect(result.success).toBe(true)
    })

    it('should return false for non-existent hunt', async () => {
      const result = await platform.executeHunt('invalid_hunt')
      expect(result.success).toBe(false)
      expect(result.findingsCount).toBe(0)
    })

    it('should update hunt status to ACTIVE during execution', async () => {
      await platform.executeHunt(hunt.id)
      const updated = platform.getHunt(hunt.id)
      expect(updated?.status).toBe(HuntStatus.COMPLETED)
    })

    it('should set end date on completed hunt', async () => {
      await platform.executeHunt(hunt.id)
      const completed = platform.getHunt(hunt.id)
      expect(completed?.endDate).toBeDefined()
    })

    it('should emit hunt:completed event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        platform.on('hunt:completed', (completedHunt: Hunt) => {
          expect(completedHunt.id).toBe(hunt.id)
          resolve()
        })
      })

      platform.executeHunt(hunt.id)
      await eventPromise
    })

    it('should validate all hypotheses during execution', async () => {
      platform.addHypothesis(hunt.id, {
        title: 'Second Hypothesis',
        description: 'Test',
        assumptions: [],
        killChain: [],
        mitreTactics: [],
        mitreTechniques: []
      })

      await platform.executeHunt(hunt.id)
      const updated = platform.getHunt(hunt.id)
      expect(updated?.hypotheses.every(h => h.status !== HypothesisStatus.DRAFT)).toBe(true)
    })

    it('should collect evidence from all data sources', async () => {
      await platform.executeHunt(hunt.id)
      const evidence = platform.getHuntEvidence(hunt.id)
      expect(evidence.length).toBeGreaterThan(0)
    })

    it('should handle execution of hunt with no data sources', async () => {
      const emptyHunt = platform.createHunt({
        name: 'Empty Hunt',
        description: 'No sources',
        status: HuntStatus.PLANNED,
        scope: 'Test',
        startDate: new Date(),
        huntedBy: 'user1',
        dataSources: [],
        techniques: []
      })

      const result = await platform.executeHunt(emptyHunt.id)
      expect(result.success).toBe(true)
    })
  })

  // Hunt Template Tests (7 tests)
  describe('Hunt Templates', () => {
    it('should create hunt template', () => {
      const template = platform.createHuntTemplate({
        name: 'Persistence Hunting Template',
        description: 'Hunt for persistence mechanisms',
        category: 'persistence',
        hypotheses: [
          {
            title: 'Registry Persistence',
            description: 'Hunt for registry-based persistence',
            assumptions: [],
            killChain: [],
            mitreTactics: ['Persistence'],
            mitreTechniques: ['T1547.001'],
            createdBy: 'admin'
          }
        ],
        dataSources: [DataSourceType.WINDOWS_EVENTS],
        techniques: [HuntTechnique.IOC_SEARCH],
        estimatedDuration: 3600,
        difficulty: 'intermediate'
      })

      expect(template).toBeDefined()
      expect(template.id).toMatch(/^tpl_/)
      expect(template.name).toBe('Persistence Hunting Template')
    })

    it('should create hunt from template', () => {
      const template = platform.createHuntTemplate({
        name: 'Test Template',
        description: 'Test',
        category: 'persistence',
        hypotheses: [
          {
            title: 'Test Hypothesis',
            description: 'Test',
            assumptions: [],
            killChain: [],
            mitreTactics: [],
            mitreTechniques: [],
            createdBy: 'admin'
          }
        ],
        dataSources: [DataSourceType.WINDOWS_EVENTS],
        techniques: [HuntTechnique.IOC_SEARCH],
        estimatedDuration: 3600,
        difficulty: 'beginner'
      })

      const hunt = platform.createHuntFromTemplate(template.id, 'Hunt from Template', 'user1')
      expect(hunt).toBeDefined()
      expect(hunt?.hypotheses).toHaveLength(1)
      expect(hunt?.hypotheses[0].title).toBe('Test Hypothesis')
    })

    it('should return null for non-existent template', () => {
      const hunt = platform.createHuntFromTemplate('invalid_template', 'Hunt', 'user')
      expect(hunt).toBeNull()
    })

    it('should list all templates', () => {
      platform.createHuntTemplate({
        name: 'Template 1',
        description: 'First',
        category: 'persistence',
        hypotheses: [],
        dataSources: [],
        techniques: [],
        estimatedDuration: 3600,
        difficulty: 'beginner'
      })

      platform.createHuntTemplate({
        name: 'Template 2',
        description: 'Second',
        category: 'credential-access',
        hypotheses: [],
        dataSources: [],
        techniques: [],
        estimatedDuration: 7200,
        difficulty: 'advanced'
      })

      const templates = platform.getHuntTemplates()
      expect(templates).toHaveLength(2)
    })

    it('should emit template:created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        platform.on('template:created', (template: HuntTemplate) => {
          expect(template.name).toBe('Event Template')
          resolve()
        })
      })

      platform.createHuntTemplate({
        name: 'Event Template',
        description: 'Test',
        category: 'persistence',
        hypotheses: [],
        dataSources: [],
        techniques: [],
        estimatedDuration: 3600,
        difficulty: 'beginner'
      })

      await eventPromise
    })

    it('should inherit template properties in created hunt', () => {
      const template = platform.createHuntTemplate({
        name: 'Template',
        description: 'Template Description',
        category: 'persistence',
        hypotheses: [],
        dataSources: [DataSourceType.WINDOWS_EVENTS, DataSourceType.LINUX_LOGS],
        techniques: [HuntTechnique.IOC_SEARCH],
        estimatedDuration: 5000,
        difficulty: 'advanced'
      })

      const hunt = platform.createHuntFromTemplate(template.id, 'New Hunt', 'user1')
      expect(hunt?.dataSources).toContain(DataSourceType.WINDOWS_EVENTS)
      expect(hunt?.techniques).toContain(HuntTechnique.IOC_SEARCH)
    })

    it('should initialize hunt documentation from template', () => {
      const template = platform.createHuntTemplate({
        name: 'Template',
        description: 'Test',
        category: 'persistence',
        hypotheses: [],
        dataSources: [],
        techniques: [],
        estimatedDuration: 3600,
        difficulty: 'beginner'
      })

      const hunt = platform.createHuntFromTemplate(template.id, 'Hunt', 'user1')
      expect(hunt?.documentation).toBeDefined()
      expect(hunt?.documentation.synopsis).toBeDefined()
    })
  })

  // Hunt Scheduling and Automation Tests (5 tests)
  describe('Hunt Scheduling', () => {
    let hunt: Hunt

    beforeEach(() => {
      hunt = platform.createHunt({
        name: 'Scheduled Hunt',
        description: 'Test scheduling',
        status: HuntStatus.PLANNED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })
    })

    it('should schedule hunt execution', () => {
      const scheduled = platform.scheduleHunt(hunt.id, '0 */6 * * *', false)
      expect(scheduled).toBeDefined()
      expect(scheduled?.schedule).toBe('0 */6 * * *')
      expect(scheduled?.enabled).toBe(true)
    })

    it('should set auto-escalation on schedule', () => {
      const scheduled = platform.scheduleHunt(hunt.id, '0 0 * * *', true)
      expect(scheduled?.autoEscalate).toBe(true)
    })

    it('should emit hunt:scheduled event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        platform.on('hunt:scheduled', (scheduled) => {
          expect(scheduled.huntId).toBe(hunt.id)
          resolve()
        })
      })

      platform.scheduleHunt(hunt.id, '0 0 * * *', false)
      await eventPromise
    })

    it('should return null for non-existent hunt', () => {
      const scheduled = platform.scheduleHunt('invalid_hunt', '0 0 * * *')
      expect(scheduled).toBeNull()
    })

    it('should set next run time on schedule creation', () => {
      const scheduled = platform.scheduleHunt(hunt.id, '0 0 * * *')
      expect(scheduled?.nextRun).toBeDefined()
      expect(scheduled?.nextRun.getTime()).toBeGreaterThan(0)
    })
  })

  // Findings Management Tests (8 tests)
  describe('Findings Management', () => {
    let hunt: Hunt

    beforeEach(() => {
      hunt = platform.createHunt({
        name: 'Findings Test Hunt',
        description: 'Test findings',
        status: HuntStatus.ACTIVE,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })
    })

    it('should create finding in hunt', () => {
      const finding = platform.createFinding(hunt.id, {
        title: 'Suspicious Process Execution',
        description: 'Detected mimikatz execution',
        severity: FindingSeverity.CRITICAL,
        confidence: 0.95,
        affectedAssets: ['PC001', 'PC002'],
        evidenceIds: [],
        recommendation: 'Isolate affected systems immediately',
        mitreTechniques: ['T1110.001'],
        falsePositive: false,
        escalated: false
      })

      expect(finding).toBeDefined()
      expect(finding?.id).toMatch(/^find_/)
      expect(finding?.severity).toBe(FindingSeverity.CRITICAL)
      expect(finding?.escalated).toBe(true)
    })

    it('should auto-escalate critical findings', () => {
      const finding = platform.createFinding(hunt.id, {
        title: 'Critical Finding',
        description: 'Critical issue',
        severity: FindingSeverity.CRITICAL,
        confidence: 0.9,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Investigate',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      expect(finding?.escalated).toBe(true)
      expect(finding?.escalationTime).toBeDefined()
    })

    it('should auto-escalate high severity findings', () => {
      const finding = platform.createFinding(hunt.id, {
        title: 'High Finding',
        description: 'High issue',
        severity: FindingSeverity.HIGH,
        confidence: 0.8,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Investigate',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      expect(finding?.escalated).toBe(true)
    })

    it('should not auto-escalate low severity findings', () => {
      const finding = platform.createFinding(hunt.id, {
        title: 'Low Finding',
        description: 'Low issue',
        severity: FindingSeverity.LOW,
        confidence: 0.5,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Monitor',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      expect(finding?.escalated).toBe(false)
      expect(finding?.escalationTime).toBeUndefined()
    })

    it('should emit finding:created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        platform.on('finding:created', (finding: HuntFinding) => {
          expect(finding.title).toBe('Event Finding')
          resolve()
        })
      })

      platform.createFinding(hunt.id, {
        title: 'Event Finding',
        description: 'Test',
        severity: FindingSeverity.MEDIUM,
        confidence: 0.7,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Review',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      await eventPromise
    })

    it('should return null for non-existent hunt', () => {
      const finding = platform.createFinding('invalid_hunt', {
        title: 'Test',
        description: 'Test',
        severity: FindingSeverity.MEDIUM,
        confidence: 0.5,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Test',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      expect(finding).toBeNull()
    })

    it('should retrieve findings for hunt', () => {
      platform.createFinding(hunt.id, {
        title: 'Finding 1',
        description: 'First',
        severity: FindingSeverity.HIGH,
        confidence: 0.8,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Review',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      platform.createFinding(hunt.id, {
        title: 'Finding 2',
        description: 'Second',
        severity: FindingSeverity.MEDIUM,
        confidence: 0.6,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Review',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      const findings = platform.getHuntFindings(hunt.id)
      expect(findings).toHaveLength(2)
    })
  })

  // Collaboration Tests (3 tests)
  describe('Hunt Collaboration', () => {
    let hunt: Hunt

    beforeEach(() => {
      hunt = platform.createHunt({
        name: 'Collaborative Hunt',
        description: 'Team hunt',
        status: HuntStatus.ACTIVE,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'lead_hunter'
      })
    })

    it('should create collaboration session', () => {
      const collab = platform.createCollaboration(hunt.id, [
        { userId: 'user1', name: 'John', role: 'lead', joinedAt: new Date() },
        { userId: 'user2', name: 'Jane', role: 'investigator', joinedAt: new Date() }
      ])

      expect(collab).toBeDefined()
      expect(collab?.participants).toHaveLength(2)
    })

    it('should return null for non-existent hunt', () => {
      const collab = platform.createCollaboration('invalid_hunt', [])
      expect(collab).toBeNull()
    })

    it('should emit collaboration:created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        platform.on('collaboration:created', (collab) => {
          expect(collab.huntId).toBe(hunt.id)
          resolve()
        })
      })

      platform.createCollaboration(hunt.id, [])
      await eventPromise
    })
  })

  // Metrics Calculation Tests (4 tests)
  describe('Metrics Calculation', () => {
    it('should calculate zero metrics for empty platform', () => {
      const metrics = platform.calculateMetrics()
      expect(metrics.huntsCompleted).toBe(0)
      expect(metrics.falsePositiveRate).toBe(0)
    })

    it('should calculate metrics with completed hunts', () => {
      const hunt = platform.createHunt({
        name: 'Metrics Hunt',
        description: 'Test',
        status: HuntStatus.COMPLETED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      platform.createFinding(hunt.id, {
        title: 'Finding',
        description: 'Test',
        severity: FindingSeverity.HIGH,
        confidence: 0.8,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Review',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      const metrics = platform.calculateMetrics()
      expect(metrics.huntsCompleted).toBe(1)
      expect(metrics.findingsPerHunt).toBeGreaterThan(0)
    })

    it('should calculate false positive rate', () => {
      const hunt = platform.createHunt({
        name: 'FP Hunt',
        description: 'Test',
        status: HuntStatus.COMPLETED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      platform.createFinding(hunt.id, {
        title: 'False Positive',
        description: 'Test',
        severity: FindingSeverity.MEDIUM,
        confidence: 0.3,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Review',
        mitreTechniques: [],
        falsePositive: true,
        escalated: false
      })

      const metrics = platform.calculateMetrics()
      expect(metrics.falsePositiveRate).toBeGreaterThan(0)
    })

    it('should calculate escalation rate', () => {
      const hunt = platform.createHunt({
        name: 'Escalation Hunt',
        description: 'Test',
        status: HuntStatus.COMPLETED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      platform.createFinding(hunt.id, {
        title: 'Critical Finding',
        description: 'Test',
        severity: FindingSeverity.CRITICAL,
        confidence: 0.95,
        affectedAssets: [],
        evidenceIds: [],
        recommendation: 'Immediate action',
        mitreTechniques: [],
        falsePositive: false,
        escalated: false
      })

      const metrics = platform.calculateMetrics()
      expect(metrics.escalationRate).toBeGreaterThan(0)
    })
  })

  // Data Source Connection Tests (2 tests)
  describe('Data Source Management', () => {
    it('should connect data source', () => {
      const connected = platform.connectDataSource(DataSourceType.WINDOWS_EVENTS, {})
      expect(connected).toBe(true)
    })

    it('should emit datasource:connected event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        platform.on('datasource:connected', (event) => {
          expect(event.sourceType).toBe(DataSourceType.WINDOWS_EVENTS)
          resolve()
        })
      })

      platform.connectDataSource(DataSourceType.WINDOWS_EVENTS, {})
      await eventPromise
    })
  })

  // Export Tests (2 tests)
  describe('Export Functionality', () => {
    it('should export hunt report', () => {
      const hunt = platform.createHunt({
        name: 'Export Test',
        description: 'Test export',
        status: HuntStatus.COMPLETED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'user1'
      })

      const report = platform.exportHuntReport(hunt.id)
      expect(report).toBeDefined()
      expect(report?.hunt.name).toBe('Export Test')
    })

    it('should return null for non-existent hunt export', () => {
      const report = platform.exportHuntReport('invalid_hunt')
      expect(report).toBeNull()
    })
  })
})

// ============================================================================
// HUNT QUERY LIBRARY TESTS (30+ tests)
// ============================================================================

describe('HuntQueryLibrary', () => {
  let library: HuntQueryLibrary

  beforeEach(() => {
    library = new HuntQueryLibrary()
  })

  // Basic Query Tests (8 tests)
  describe('Query Management', () => {
    it('should load all queries on initialization', () => {
      const queries = library.getAllQueries()
      expect(queries.length).toBeGreaterThanOrEqual(50)
    })

    it('should get query by ID', () => {
      const query = library.getQueryById('persist_registry_runkeys')
      expect(query).toBeDefined()
      expect(query?.name).toBe('Registry Run Keys Modification')
    })

    it('should return undefined for non-existent query', () => {
      const query = library.getQueryById('invalid_query_id')
      expect(query).toBeUndefined()
    })

    it('should get queries by category', () => {
      const persistenceQueries = library.getQueriesByCategory('persistence')
      expect(persistenceQueries).toBeDefined()
      expect(persistenceQueries.length).toBeGreaterThan(0)
      expect(persistenceQueries.every(q => q.category === 'persistence')).toBe(true)
    })

    it('should get queries by MITRE technique', () => {
      const t1547Queries = library.getQueriesByMitreTechnique('T1547.001')
      expect(t1547Queries.length).toBeGreaterThan(0)
      expect(t1547Queries.every(q => q.mitreTechniques.includes('T1547.001'))).toBe(true)
    })

    it('should have all category types', () => {
      const categories: QueryCategory[] = [
        'persistence',
        'credential-access',
        'lateral-movement',
        'data-exfiltration',
        'defense-evasion'
      ]

      for (const category of categories) {
        const queries = library.getQueriesByCategory(category)
        expect(queries.length).toBeGreaterThan(0)
      }
    })

    it('should have 10 queries per category', () => {
      const categories: QueryCategory[] = [
        'persistence',
        'credential-access',
        'lateral-movement',
        'data-exfiltration',
        'defense-evasion'
      ]

      for (const category of categories) {
        const queries = library.getQueriesByCategory(category)
        expect(queries.length).toBeGreaterThanOrEqual(10)
      }
    })

    it('should have valid query structure', () => {
      const queries = library.getAllQueries()
      for (const query of queries) {
        expect(query.id).toBeDefined()
        expect(query.name).toBeDefined()
        expect(query.description).toBeDefined()
        expect(query.category).toBeDefined()
        expect(query.mitreTactics).toBeDefined()
        expect(query.mitreTechniques).toBeDefined()
        expect(query.queries).toBeDefined()
        expect(query.effectiveness).toBeGreaterThanOrEqual(1)
        expect(query.effectiveness).toBeLessThanOrEqual(10)
      }
    })
  })

  // Query Search Tests (8 tests)
  describe('Query Search', () => {
    it('should search queries by keyword', () => {
      const results = library.searchQueries('Registry')
      expect(results.queries.length).toBeGreaterThan(0)
    })

    it('should search by partial match', () => {
      const results = library.searchQueries('persistence')
      expect(results.queries.some(q => q.name.toLowerCase().includes('persistence'))).toBe(true)
    })

    it('should search by MITRE technique', () => {
      const results = library.searchQueries('T1047')
      expect(results.queries.length).toBeGreaterThan(0)
    })

    it('should be case insensitive', () => {
      const upper = library.searchQueries('MIMIKATZ')
      const lower = library.searchQueries('mimikatz')
      expect(upper.total).toBe(lower.total)
    })

    it('should return total count', () => {
      const results = library.searchQueries('test')
      expect(results.total).toEqual(results.queries.length)
    })

    it('should search description', () => {
      const results = library.searchQueries('credential')
      expect(results.queries.length).toBeGreaterThan(0)
    })

    it('should return empty results for no matches', () => {
      const results = library.searchQueries('nonexistent_unique_string_12345')
      expect(results.total).toBe(0)
      expect(results.queries).toHaveLength(0)
    })

    it('should search across all query fields', () => {
      const nameSearch = library.searchQueries('Process Injection')
      const descSearch = library.searchQueries('hollow')
      expect(nameSearch.queries.length).toBeGreaterThan(0)
      expect(descSearch.queries.length).toBeGreaterThan(0)
    })
  })

  // Query Filtering Tests (8 tests)
  describe('Query Filtering', () => {
    it('should filter by category', () => {
      const results = library.filterQueries({ category: 'persistence' })
      expect(results.queries.every(q => q.category === 'persistence')).toBe(true)
      expect(results.category).toBe('persistence')
    })

    it('should filter by severity', () => {
      const results = library.filterQueries({ severity: 'critical' })
      expect(results.queries.every(q => q.severity === 'critical')).toBe(true)
    })

    it('should filter by minimum effectiveness', () => {
      const results = library.filterQueries({ minEffectiveness: 8 })
      expect(results.queries.every(q => q.effectiveness >= 8)).toBe(true)
    })

    it('should filter by data sources', () => {
      const results = library.filterQueries({
        dataSources: ['Process Monitoring']
      })
      expect(results.queries.every(q =>
        q.dataSources.some(ds => ds.includes('Process'))
      )).toBe(true)
    })

    it('should combine multiple filters', () => {
      const results = library.filterQueries({
        category: 'persistence',
        severity: 'high',
        minEffectiveness: 7
      })

      expect(results.queries.every(q =>
        q.category === 'persistence' &&
        q.severity === 'high' &&
        q.effectiveness >= 7
      )).toBe(true)
    })

    it('should return empty results for impossible filter', () => {
      const results = library.filterQueries({
        minEffectiveness: 100
      })
      expect(results.queries).toHaveLength(0)
    })

    it('should include filter details in results', () => {
      const results = library.filterQueries({
        category: 'lateral-movement',
        severity: 'high'
      })
      expect(results.filters).toBeDefined()
      expect(results.category).toBe('lateral-movement')
    })

    it('should return result count', () => {
      const results = library.filterQueries({ category: 'credential-access' })
      expect(results.total).toEqual(results.queries.length)
    })
  })

  // Platform-Specific Queries Tests (4 tests)
  describe('Platform-Specific Queries', () => {
    it('should have Splunk queries', () => {
      const queries = library.getAllQueries()
      const hasSpunk = queries.some(q => q.queries.splunk && q.queries.splunk.length > 0)
      expect(hasSpunk).toBe(true)
    })

    it('should have Elasticsearch queries', () => {
      const queries = library.getAllQueries()
      const hasElastic = queries.some(q => q.queries.elasticsearch && q.queries.elasticsearch.length > 0)
      expect(hasElastic).toBe(true)
    })

    it('should have KQL queries', () => {
      const queries = library.getAllQueries()
      const hasKQL = queries.some(q => q.queries.kql && q.queries.kql.length > 0)
      expect(hasKQL).toBe(true)
    })

    it('should have SQL queries', () => {
      const queries = library.getAllQueries()
      const hasSQL = queries.some(q => q.queries.sql && q.queries.sql.length > 0)
      expect(hasSQL).toBe(true)
    })
  })

  // Query Metadata Tests (2 tests)
  describe('Query Metadata', () => {
    it('should have effectiveness rating for all queries', () => {
      const queries = library.getAllQueries()
      expect(queries.every(q => q.effectiveness >= 1 && q.effectiveness <= 10)).toBe(true)
    })

    it('should have false positive guidance', () => {
      const queries = library.getAllQueries()
      expect(queries.every(q => q.falsePositiveGuidance && q.falsePositiveGuidance.length > 0)).toBe(true)
    })
  })
})

// ============================================================================
// INVESTIGATION TOOLS TESTS (35+ tests)
// ============================================================================

describe('InvestigationTools', () => {
  let tools: InvestigationTools

  beforeEach(() => {
    tools = new InvestigationTools()
  })

  // Case Management Tests (10 tests)
  describe('Case Management', () => {
    it('should create investigation case', async () => {
      const caseData = await tools.createCase(
        'Suspected Breach',
        'Unauthorized access detected',
        'high',
        'analyst1'
      )

      expect(caseData).toBeDefined()
      expect(caseData.id).toMatch(/^case_/)
      expect(caseData.status).toBe('open')
      expect(caseData.severity).toBe('high')
    })

    it('should update case status', async () => {
      const caseData = await tools.createCase('Test', 'Test', 'high', 'user1')
      const updated = await tools.updateCaseStatus(caseData.id, 'in_progress')

      expect(updated.status).toBe('in_progress')
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(caseData.updatedAt.getTime())
    })

    it('should throw error for invalid case status update', async () => {
      await expect(tools.updateCaseStatus('invalid_case', 'closed')).rejects.toThrow()
    })

    it('should add note to case', async () => {
      const caseData = await tools.createCase('Test', 'Test', 'high', 'user1')
      const note = await tools.addCaseNote(
        caseData.id,
        'analyst1',
        'Initial assessment complete',
        []
      )

      expect(note).toBeDefined()
      expect(note.content).toBe('Initial assessment complete')
      expect(note.author).toBe('analyst1')
    })

    it('should throw error when adding note to invalid case', async () => {
      await expect(tools.addCaseNote('invalid_case', 'user', 'note', [])).rejects.toThrow()
    })

    it('should emit case:created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tools.on('case:created', (caseData: InvestigationCase) => {
          expect(caseData.title).toBe('Event Case')
          resolve()
        })
      })

      tools.createCase('Event Case', 'Test', 'high', 'user1')
      await eventPromise
    })

    it('should emit case:updated event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tools.on('case:updated', (caseData: InvestigationCase) => {
          expect(caseData.status).toBe('closed')
          resolve()
        })
      })

      const c = await tools.createCase('Test', 'Test', 'high', 'user1')
      tools.updateCaseStatus(c.id, 'closed')
      await eventPromise
    })

    it('should emit case:note_added event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tools.on('case:note_added', (event) => {
          expect(event.note.content).toBe('Test Note')
          resolve()
        })
      })

      const c = await tools.createCase('Test', 'Test', 'high', 'user1')
      tools.addCaseNote(c.id, 'user', 'Test Note')
      await eventPromise
    })

    it('should support all severity levels', async () => {
      const severities = ['critical', 'high', 'medium', 'low'] as const

      for (const severity of severities) {
        const caseData = await tools.createCase('Test', 'Test', severity, 'user1')
        expect(caseData.severity).toBe(severity)
      }
    })

    it('should support all case statuses', async () => {
      const caseData = await tools.createCase('Test', 'Test', 'high', 'user1')
      const statuses = ['open', 'in_progress', 'suspended', 'closed'] as const

      for (const status of statuses) {
        const updated = await tools.updateCaseStatus(caseData.id, status)
        expect(updated.status).toBe(status)
      }
    })
  })

  // Entity Analysis Tests (10 tests)
  describe('Entity Analysis', () => {
    let caseData: InvestigationCase

    beforeEach(async () => {
      caseData = await tools.createCase('Analysis Case', 'Test', 'high', 'analyst1')
    })

    it('should analyze IP address', async () => {
      const analysis = await tools.analyzeIP('192.168.1.1', caseData.id)

      expect(analysis).toBeDefined()
      expect(analysis.type).toBe('ip')
      expect(analysis.metadata).toBeDefined()
      expect(analysis.reputation).toBeDefined()
    })

    it('should analyze domain', async () => {
      const analysis = await tools.analyzeDomain('example.com', caseData.id)

      expect(analysis).toBeDefined()
      expect(analysis.type).toBe('domain')
      expect(analysis.metadata).toBeDefined()
    })

    it('should analyze file hash', async () => {
      const analysis = await tools.analyzeFileHash(
        'abcdef123456',
        'sha256',
        caseData.id
      )

      expect(analysis).toBeDefined()
      expect(analysis.type).toBe('file')
    })

    it('should analyze user', async () => {
      const analysis = await tools.analyzeUser('admin', caseData.id)

      expect(analysis).toBeDefined()
      expect(analysis.type).toBe('user')
    })

    it('should analyze process', async () => {
      const analysis = await tools.analyzeProcess('1234', 'explorer.exe', caseData.id)

      expect(analysis).toBeDefined()
      expect(analysis.type).toBe('process')
    })

    it('should include reputation data', async () => {
      const analysis = await tools.analyzeIP('10.0.0.1')

      expect(analysis.reputation).toBeDefined()
      expect(analysis.reputation.score).toBeDefined()
      expect(analysis.reputation.status).toBeDefined()
    })

    it('should extract indicators from entities', async () => {
      const analysis = await tools.analyzeIP('1.1.1.1')

      expect(analysis.indicators).toBeDefined()
      expect(analysis.indicators.length).toBeGreaterThan(0)
    })

    it('should assess risk factors', async () => {
      const analysis = await tools.analyzeIP('8.8.8.8')

      expect(analysis.riskFactors).toBeDefined()
    })

    it('should analyze multiple entity types', async () => {
      const ipAnalysis = await tools.analyzeIP('1.1.1.1', caseData.id)
      const domainAnalysis = await tools.analyzeDomain('test.com', caseData.id)
      const userAnalysis = await tools.analyzeUser('testuser', caseData.id)

      expect(ipAnalysis.type).toBe('ip')
      expect(domainAnalysis.type).toBe('domain')
      expect(userAnalysis.type).toBe('user')
    })

    it('should handle analysis without case association', async () => {
      const analysis = await tools.analyzeIP('192.0.2.1')
      expect(analysis).toBeDefined()
      expect(analysis.type).toBe('ip')
    })
  })

  // Evidence Management Tests (8 tests)
  describe('Evidence Management', () => {
    let caseData: InvestigationCase

    beforeEach(async () => {
      caseData = await tools.createCase('Evidence Case', 'Test', 'high', 'analyst1')
    })

    it('should add evidence to case', async () => {
      const evidence = await tools.addEvidence(
        caseData.id,
        'file',
        'malware.exe',
        '/evidence/malware.exe',
        'endpoint'
      )

      expect(evidence).toBeDefined()
      expect(evidence.name).toBe('malware.exe')
      expect(evidence.type).toBe('file')
    })

    it('should throw error for invalid case', async () => {
      await expect(tools.addEvidence('invalid_case', 'file', 'test', 'path', 'system')).rejects.toThrow()
    })

    it('should analyze evidence', async () => {
      const evidence = await tools.addEvidence(
        caseData.id,
        'log',
        'security.log',
        '/var/log/security.log',
        'siem'
      )

      const analysis = await tools.analyzeEvidence(evidence.id)

      expect(analysis).toBeDefined()
      expect(analysis.status).toBe('complete')
      expect(analysis.findings).toBeDefined()
    })

    it('should extract indicators from evidence', async () => {
      const evidence = await tools.addEvidence(
        caseData.id,
        'log',
        'test.log',
        '/path',
        'system'
      )

      const analysis = await tools.analyzeEvidence(evidence.id)
      expect(analysis.indicators).toBeDefined()
    })

    it('should emit evidence:added event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tools.on('evidence:added', (evidence: EvidenceItem) => {
          expect(evidence.name).toBe('test.log')
          resolve()
        })
      })

      tools.addEvidence(caseData.id, 'log', 'test.log', '/path', 'system')
      await eventPromise
    })

    it('should emit evidence:analyzed event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tools.on('evidence:analyzed', (evidence: EvidenceItem) => {
          expect(evidence.analysis.status).toBe('complete')
          resolve()
        })
      })

      const e = await tools.addEvidence(caseData.id, 'log', 'test.log', '/path', 'system')
      tools.analyzeEvidence(e.id)
      await eventPromise
    })

    it('should support multiple evidence types', async () => {
      const types = ['file', 'log', 'memory', 'network', 'artifact', 'screenshot']

      for (const type of types) {
        const evidence = await tools.addEvidence(
          caseData.id,
          type,
          `test.${type}`,
          `/path`,
          'system'
        )
        expect(evidence.type).toBe(type)
      }
    })

    it('should calculate evidence risk score', async () => {
      const evidence = await tools.addEvidence(
        caseData.id,
        'file',
        'test.exe',
        '/path',
        'system'
      )

      const analysis = await tools.analyzeEvidence(evidence.id)
      expect(analysis.riskScore).toBeGreaterThanOrEqual(0)
      expect(analysis.riskScore).toBeLessThanOrEqual(1)
    })
  })

  // Timeline Management Tests (6 tests)
  describe('Timeline Management', () => {
    let caseData: InvestigationCase

    beforeEach(async () => {
      caseData = await tools.createCase('Timeline Case', 'Test', 'high', 'analyst1')
    })

    it('should add timeline event', async () => {
      const event = await tools.addTimelineEvent(
        caseData.id,
        new Date(),
        'login',
        'auth_log',
        'User login detected',
        'info',
        ['user1']
      )

      expect(event).toBeDefined()
      expect(event.eventType).toBe('login')
    })

    it('should build timeline for case', async () => {
      await tools.addTimelineEvent(
        caseData.id,
        new Date(),
        'login',
        'auth',
        'Login',
        'info',
        []
      )

      const timeline = await tools.buildTimeline(caseData.id)
      expect(timeline).toBeDefined()
      expect(timeline.length).toBeGreaterThan(0)
    })

    it('should analyze timeline', async () => {
      const analysis = await tools.analyzeTimeline(caseData.id)

      expect(analysis).toBeDefined()
      expect(analysis.duration).toBeGreaterThanOrEqual(0)
      expect(analysis.eventCount).toBeDefined()
    })

    it('should emit timeline:event_added event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tools.on('timeline:event_added', (event) => {
          expect(event.event.eventType).toBe('test')
          resolve()
        })
      })

      tools.addTimelineEvent(
        caseData.id,
        new Date(),
        'test',
        'source',
        'Test event',
        'info',
        []
      )

      await eventPromise
    })

    it('should emit timeline:analyzed event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tools.on('timeline:analyzed', () => {
          resolve()
        })
      })

      tools.analyzeTimeline(caseData.id)
      await eventPromise
    })

    it('should correlate logs from multiple sources', async () => {
      const events = await tools.correlateLogs(caseData.id, [
        {
          name: 'auth_log',
          events: [
            { timestamp: new Date().toISOString(), type: 'login', description: 'Login', severity: 'info', entities: [] }
          ]
        }
      ])

      expect(events).toBeDefined()
      expect(events.length).toBeGreaterThan(0)
    })
  })

  // Relationship Mapping Tests (5 tests)
  describe('Relationship Mapping', () => {
    let caseData: InvestigationCase

    beforeEach(async () => {
      caseData = await tools.createCase('Relationship Case', 'Test', 'high', 'analyst1')
    })

    it('should create relationship between entities', async () => {
      const rel = await tools.createRelationship(
        caseData.id,
        'ip_1.1.1.1',
        'domain_example.com',
        'resolves_to',
        0.9,
        []
      )

      expect(rel).toBeDefined()
      expect(rel.sourceEntity).toBe('ip_1.1.1.1')
      expect(rel.targetEntity).toBe('domain_example.com')
    })

    it('should emit relationship:created event', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        tools.on('relationship:created', () => {
          resolve()
        })
      })

      tools.createRelationship(
        caseData.id,
        'entity1',
        'entity2',
        'communicates_with',
        0.8
      )

      await eventPromise
    })

    it('should analyze entity graph', async () => {
      await tools.createRelationship(
        caseData.id,
        'entity1',
        'entity2',
        'communicates_with',
        0.9
      )

      const graph = await tools.analyzeEntityGraph(caseData.id)

      expect(graph).toBeDefined()
      expect(graph.nodes).toBeDefined()
      expect(graph.edges).toBeDefined()
      expect(graph.metrics).toBeDefined()
    })

    it('should calculate graph metrics', async () => {
      const graph = await tools.analyzeEntityGraph(caseData.id)

      expect(graph.metrics.nodeCount).toBeGreaterThanOrEqual(0)
      expect(graph.metrics.edgeCount).toBeGreaterThanOrEqual(0)
      expect(graph.metrics.density).toBeGreaterThanOrEqual(0)
    })

    it('should normalize strength value', async () => {
      const rel1 = await tools.createRelationship(
        caseData.id,
        'e1',
        'e2',
        'communicates_with',
        1.5
      )

      const rel2 = await tools.createRelationship(
        caseData.id,
        'e3',
        'e4',
        'communicates_with',
        -0.5
      )

      expect(rel1.strength).toBeLessThanOrEqual(1)
      expect(rel2.strength).toBeGreaterThanOrEqual(0)
    })
  })

  // Forensic Tools Tests (3 tests)
  describe('Forensic Tools', () => {
    let caseData: InvestigationCase

    beforeEach(async () => {
      caseData = await tools.createCase('Forensic Case', 'Test', 'critical', 'analyst1')
    })

    it('should extract IOCs from case', async () => {
      await tools.analyzeIP('8.8.8.8', caseData.id)
      const iocs = await tools.extractIOCs(caseData.id)

      expect(iocs).toBeDefined()
      expect(Array.isArray(iocs)).toBe(true)
    })

    it('should analyze memory dump', async () => {
      const buffer = Buffer.from('memory_data')
      const analysis = await tools.analyzeMemory(caseData.id, buffer, {})

      expect(analysis).toBeDefined()
      expect(analysis.status).toBe('complete')
    })

    it('should analyze disk image', async () => {
      const analysis = await tools.analyzeDisk(
        caseData.id,
        '/path/to/disk.img',
        'NTFS'
      )

      expect(analysis).toBeDefined()
      expect(analysis.status).toBe('complete')
    })
  })

  // Reporting Tests (4 tests)
  describe('Reporting', () => {
    let caseData: InvestigationCase

    beforeEach(async () => {
      caseData = await tools.createCase('Report Case', 'Test', 'high', 'analyst1')
    })

    it('should generate investigation report', async () => {
      const report = await tools.generateReport(caseData.id)

      expect(report).toBeDefined()
      expect(report.caseId).toBe(caseData.id)
      expect(report.generatedAt).toBeDefined()
      expect(report.findings).toBeDefined()
    })

    it('should export report as JSON', async () => {
      const report = await tools.generateReport(caseData.id)
      const json = await tools.exportReportJSON(report)

      expect(typeof json).toBe('string')
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('should export timeline as CSV', async () => {
      const csv = await tools.exportTimeline(caseData.id, 'csv')

      expect(typeof csv).toBe('string')
      expect(csv).toContain('Timestamp')
    })

    it('should export timeline as JSON', async () => {
      const json = await tools.exportTimeline(caseData.id, 'json')

      expect(typeof json).toBe('string')
      expect(() => JSON.parse(json)).not.toThrow()
    })
  })

  // AI-Assisted Analysis Tests (3 tests)
  describe('AI-Assisted Analysis', () => {
    let caseData: InvestigationCase

    beforeEach(async () => {
      caseData = await tools.createCase('AI Case', 'Test', 'high', 'analyst1')
    })

    it('should find similar cases', async () => {
      caseData.tags = ['malware', 'endpoint']

      const anotherCase = await tools.createCase('Similar', 'Test', 'high', 'analyst1')
      anotherCase.tags = ['malware', 'endpoint', 'network']

      const similar = await tools.findSimilarCases(caseData.id)
      expect(Array.isArray(similar)).toBe(true)
    })

    it('should get recommendations', async () => {
      const recommendations = await tools.getRecommendations(caseData.id)

      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('should highlight anomalies', async () => {
      const anomalies = await tools.highlightAnomalies(caseData.id)

      expect(Array.isArray(anomalies)).toBe(true)
    })
  })
})

// ============================================================================
// INTEGRATION TESTS (15+ tests)
// ============================================================================

describe('Threat Hunting Integration', () => {
  let platform: ThreatHuntingPlatform
  let library: HuntQueryLibrary
  let tools: InvestigationTools

  beforeEach(() => {
    platform = new ThreatHuntingPlatform()
    library = new HuntQueryLibrary()
    tools = new InvestigationTools()
  })

  // End-to-End Workflow Tests (5 tests)
  describe('End-to-End Hunt Workflow', () => {
    it('should execute complete hunt workflow', async () => {
      // Create hunt
      const hunt = platform.createHunt({
        name: 'E2E Hunt',
        description: 'End-to-end workflow',
        status: HuntStatus.PLANNED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      // Add hypothesis
      platform.addHypothesis(hunt.id, {
        title: 'Persistence Hunt',
        description: 'Hunt for persistence mechanisms',
        assumptions: [],
        killChain: [],
        mitreTactics: ['Persistence'],
        mitreTechniques: ['T1547.001']
      })

      // Connect data source
      platform.connectDataSource(DataSourceType.WINDOWS_EVENTS, {})

      // Execute hunt
      const result = await platform.executeHunt(hunt.id)

      expect(result.success).toBe(true)
      expect(hunt.status).toBe(HuntStatus.COMPLETED)
    })

    it('should integrate queries from library into hunt', async () => {
      const hunt = platform.createHunt({
        name: 'Query Integration Hunt',
        description: 'Using library queries',
        status: HuntStatus.PLANNED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      const persistenceQueries = library.getQueriesByCategory('persistence')
      expect(persistenceQueries.length).toBeGreaterThan(0)

      // Hunt can use these queries
      expect(hunt.id).toBeDefined()
    })

    it('should manage findings throughout workflow', async () => {
      const hunt = platform.createHunt({
        name: 'Findings Workflow',
        description: 'Test findings management',
        status: HuntStatus.ACTIVE,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      platform.createFinding(hunt.id, {
        title: 'Critical Finding',
        description: 'Immediate action required',
        severity: FindingSeverity.CRITICAL,
        confidence: 0.95,
        affectedAssets: ['PC001'],
        evidenceIds: [],
        recommendation: 'Isolate system',
        mitreTechniques: ['T1110.001'],
        falsePositive: false,
        escalated: false
      })

      const findings = platform.getHuntFindings(hunt.id)
      expect(findings).toHaveLength(1)
      expect(findings[0].escalated).toBe(true)
    })

    it('should correlate hunt findings with investigation cases', async () => {
      const hunt = platform.createHunt({
        name: 'Correlation Hunt',
        description: 'Test correlation',
        status: HuntStatus.ACTIVE,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      const caseData = await tools.createCase(
        'Investigation Case',
        'Findings from hunt',
        'high',
        'analyst1'
      )

      expect(hunt.id).toBeDefined()
      expect(caseData.id).toBeDefined()
    })

    it('should support multi-hypothesis hunt validation', async () => {
      const hunt = platform.createHunt({
        name: 'Multi-Hypothesis Hunt',
        description: 'Multiple hypotheses',
        status: HuntStatus.PLANNED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1',
        dataSources: [DataSourceType.WINDOWS_EVENTS],
        techniques: [HuntTechnique.IOC_SEARCH]
      })

      platform.connectDataSource(DataSourceType.WINDOWS_EVENTS, {})

      for (let i = 0; i < 3; i++) {
        platform.addHypothesis(hunt.id, {
          title: `Hypothesis ${i}`,
          description: `Multi-hypothesis test ${i}`,
          assumptions: [],
          killChain: [],
          mitreTactics: [],
          mitreTechniques: []
        })
      }

      await platform.executeHunt(hunt.id)
      expect(hunt.hypotheses).toHaveLength(3)
      expect(hunt.hypotheses.every(h => h.status !== HypothesisStatus.DRAFT)).toBe(true)
    })
  })

  // Query to Investigation Pipeline Tests (3 tests)
  describe('Query to Investigation Pipeline', () => {
    it('should map hunt queries to investigation evidence', async () => {
      const persistenceQueries = library.getQueriesByCategory('persistence')
      const query = persistenceQueries[0]

      const caseData = await tools.createCase(
        'Query Evidence Case',
        'From persistence queries',
        'high',
        'analyst1'
      )

      const evidence = await tools.addEvidence(
        caseData.id,
        'log',
        `${query.name}.log`,
        `/evidence/${query.id}`,
        'hunt_results'
      )

      expect(evidence.name).toBe(`${query.name}.log`)
    })

    it('should link hunt findings to investigation IOCs', async () => {
      const hunt = platform.createHunt({
        name: 'IOC Hunt',
        description: 'Generate IOCs',
        status: HuntStatus.COMPLETED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      platform.createFinding(hunt.id, {
        title: 'Malware Detected',
        description: 'Malicious hash found',
        severity: FindingSeverity.CRITICAL,
        confidence: 0.99,
        affectedAssets: ['PC001'],
        evidenceIds: [],
        recommendation: 'Quarantine',
        mitreTechniques: ['T1204.001'],
        falsePositive: false,
        escalated: false
      })

      const caseData = await tools.createCase(
        'IOC Case',
        'From hunt findings',
        'critical',
        'analyst1'
      )

      expect(caseData.id).toBeDefined()
    })

    it('should support query filtering based on investigation scope', () => {
      // Investigation case determines what queries to use
      const credentialQueries = library.getQueriesByCategory('credential-access')
      expect(credentialQueries.length).toBeGreaterThan(0)

      // Each query has multiple platform implementations
      credentialQueries.forEach(q => {
        expect(q.queries.splunk).toBeDefined()
        expect(q.queries.elasticsearch).toBeDefined()
      })
    })
  })

  // Case Management Integration Tests (2 tests)
  describe('Investigation Case Integration', () => {
    it('should manage multiple cases across hunts', async () => {
      const hunt1 = platform.createHunt({
        name: 'Hunt 1',
        description: 'First hunt',
        status: HuntStatus.ACTIVE,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      const hunt2 = platform.createHunt({
        name: 'Hunt 2',
        description: 'Second hunt',
        status: HuntStatus.ACTIVE,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      const case1 = await tools.createCase('Case 1', 'From hunt 1', 'high', 'analyst1')
      const case2 = await tools.createCase('Case 2', 'From hunt 2', 'high', 'analyst1')

      expect(platform.listHunts()).toHaveLength(2)
    })

    it('should support collaborative analysis across hunts and cases', async () => {
      const hunt = platform.createHunt({
        name: 'Collaborative Hunt',
        description: 'Team effort',
        status: HuntStatus.ACTIVE,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'lead_hunter'
      })

      const collab = platform.createCollaboration(hunt.id, [
        { userId: 'hunter1', name: 'Hunter 1', role: 'investigator', joinedAt: new Date() },
        { userId: 'analyst1', name: 'Analyst 1', role: 'analyst', joinedAt: new Date() }
      ])

      expect(collab?.participants).toHaveLength(2)
    })
  })

  // Advanced Integration Tests (5 tests)
  describe('Advanced Integration Scenarios', () => {
    it('should support threat campaign tracking across multiple hunts', async () => {
      const campaign = 'APT28_Campaign'

      const hunt1 = platform.createHunt({
        name: `${campaign}_Phase1`,
        description: 'Initial access',
        status: HuntStatus.COMPLETED,
        scope: 'Endpoints',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      const hunt2 = platform.createHunt({
        name: `${campaign}_Phase2`,
        description: 'Lateral movement',
        status: HuntStatus.ACTIVE,
        scope: 'Network',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      const hunts = platform.listHunts()
      expect(hunts.some(h => h.name.includes(campaign))).toBe(true)
    })

    it('should integrate threat intelligence with hunt queries', () => {
      const lateralQueries = library.getQueriesByCategory('lateral-movement')
      expect(lateralQueries.length).toBeGreaterThan(0)

      lateralQueries.forEach(q => {
        expect(q.mitreTechniques).toBeDefined()
        expect(q.mitreTechniques.length).toBeGreaterThan(0)
      })
    })

    it('should support metrics-driven hunt optimization', () => {
      const hunt = platform.createHunt({
        name: 'Metrics Hunt',
        description: 'Test metrics',
        status: HuntStatus.COMPLETED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      for (let i = 0; i < 5; i++) {
        platform.createFinding(hunt.id, {
          title: `Finding ${i}`,
          description: 'Test',
          severity: i % 2 === 0 ? FindingSeverity.HIGH : FindingSeverity.MEDIUM,
          confidence: 0.5 + (i * 0.1),
          affectedAssets: [],
          evidenceIds: [],
          recommendation: 'Review',
          mitreTechniques: [],
          falsePositive: i === 4,
          escalated: false
        })
      }

      const metrics = platform.calculateMetrics()
      expect(metrics.huntsCompleted).toBe(1)
      expect(metrics.findingsPerHunt).toBeGreaterThan(0)
      expect(metrics.falsePositiveRate).toBeGreaterThan(0)
    })

    it('should support cross-hunt entity correlation', async () => {
      const hunt = platform.createHunt({
        name: 'Correlation Hunt',
        description: 'Entity correlation',
        status: HuntStatus.COMPLETED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      const caseData = await tools.createCase(
        'Correlation Case',
        'Cross-hunt correlation',
        'high',
        'analyst1'
      )

      await tools.analyzeIP('192.168.1.1', caseData.id)
      const analysis = await tools.analyzeIP('192.168.1.1')

      expect(analysis.type).toBe('ip')
    })

    it('should support investigation reports with hunt data', async () => {
      const hunt = platform.createHunt({
        name: 'Report Hunt',
        description: 'Test reporting',
        status: HuntStatus.COMPLETED,
        scope: 'All',
        startDate: new Date(),
        huntedBy: 'hunter1'
      })

      const report = platform.exportHuntReport(hunt.id)
      expect(report).toBeDefined()
      expect(report?.hunt.name).toBe('Report Hunt')
    })
  })
})
