/**
 * Unit Tests for Forensics Reconstructor Modules
 * Tests: TimelineBuilder, EvidenceAnalyzer, RootCauseAnalyzer, ImpactAnalyzer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimelineBuilder } from '../../forensics/reconstructor/TimelineBuilder';
import { EvidenceAnalyzer } from '../../forensics/reconstructor/EvidenceAnalyzer';
import { RootCauseAnalyzer } from '../../forensics/reconstructor/RootCauseAnalyzer';
import { ImpactAnalyzer } from '../../forensics/reconstructor/ImpactAnalyzer';
import {
  SecurityEvent,
  TimelineEvent,
  Asset,
  LateralMovement,
  IncidentReconstructorConfig,
  MitreTechnique,
  MITRE_TECHNIQUES,
  generateId,
  getMaxSeverity,
  PHASE_ORDER
} from '../../forensics/reconstructor/types';

// Helper function to create test security events
function createSecurityEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id: overrides.id || generateId('EVT'),
    timestamp: overrides.timestamp || new Date(),
    sourceSystem: overrides.sourceSystem || 'test-system',
    eventType: overrides.eventType || 'test-event',
    severity: overrides.severity || 'medium',
    sourceIp: overrides.sourceIp,
    destinationIp: overrides.destinationIp,
    sourceHost: overrides.sourceHost,
    destinationHost: overrides.destinationHost,
    sourceUser: overrides.sourceUser,
    destinationUser: overrides.destinationUser,
    processName: overrides.processName,
    processId: overrides.processId,
    parentProcessId: overrides.parentProcessId,
    commandLine: overrides.commandLine,
    filePath: overrides.filePath,
    fileHash: overrides.fileHash,
    networkPort: overrides.networkPort,
    protocol: overrides.protocol,
    action: overrides.action,
    outcome: overrides.outcome || 'success',
    rawData: overrides.rawData || {},
    tags: overrides.tags || [],
    indicators: overrides.indicators || []
  };
}

// Helper function to create test assets
function createAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: overrides.id || generateId('ASSET'),
    type: overrides.type || 'workstation',
    hostname: overrides.hostname,
    ipAddress: overrides.ipAddress,
    domain: overrides.domain,
    operatingSystem: overrides.operatingSystem,
    criticality: overrides.criticality || 'medium',
    owner: overrides.owner,
    department: overrides.department,
    compromisedAt: overrides.compromisedAt,
    accessLevel: overrides.accessLevel,
    services: overrides.services || [],
    vulnerabilities: overrides.vulnerabilities || []
  };
}

// Helper function to create test timeline events
function createTimelineEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: overrides.id || generateId('TLE'),
    timestamp: overrides.timestamp || new Date(),
    phase: overrides.phase || 'execution',
    description: overrides.description || 'Test event',
    severity: overrides.severity || 'medium',
    confidence: overrides.confidence ?? 0.8,
    sourceEvents: overrides.sourceEvents || [],
    assets: overrides.assets || [],
    techniques: overrides.techniques || [],
    indicators: overrides.indicators || [],
    actor: overrides.actor,
    notes: overrides.notes
  };
}

// Default test config
const testConfig: IncidentReconstructorConfig = {
  enableAutomaticCorrelation: true,
  correlationTimeWindowMs: 300000, // 5 minutes
  killChainMappingVersion: '2.0',
  maxTimelineEvents: 1000,
  maxGraphNodes: 500,
  enableThreatIntelEnrichment: true,
  threatIntelSources: ['mitre'],
  confidenceThreshold: 0.6
};

// ============================================================================
// TimelineBuilder Tests
// ============================================================================

describe('TimelineBuilder', () => {
  let timelineBuilder: TimelineBuilder;

  beforeEach(() => {
    timelineBuilder = new TimelineBuilder(testConfig);
  });

  describe('reconstructTimeline', () => {
    it('should reconstruct timeline from security events', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), sourceHost: 'host1' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:01:00Z'), sourceHost: 'host1' })
      ];

      const timeline = timelineBuilder.reconstructTimeline('inc-001', events);

      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0]).toHaveProperty('id');
      expect(timeline[0]).toHaveProperty('timestamp');
      expect(timeline[0]).toHaveProperty('phase');
    });

    it('should filter events by startTime option', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T09:00:00Z'), sourceHost: 'host1' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), sourceHost: 'host2' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T11:00:00Z'), sourceHost: 'host3' })
      ];

      const timeline = timelineBuilder.reconstructTimeline('inc-001', events, {
        startTime: new Date('2024-01-01T09:30:00Z')
      });

      expect(timeline.length).toBe(2);
    });

    it('should filter events by endTime option', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T09:00:00Z'), sourceHost: 'host1' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), sourceHost: 'host2' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T11:00:00Z'), sourceHost: 'host3' })
      ];

      const timeline = timelineBuilder.reconstructTimeline('inc-001', events, {
        endTime: new Date('2024-01-01T10:30:00Z')
      });

      expect(timeline.length).toBe(2);
    });

    it('should sort events chronologically', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T11:00:00Z'), sourceHost: 'host3' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T09:00:00Z'), sourceHost: 'host1' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), sourceHost: 'host2' })
      ];

      const timeline = timelineBuilder.reconstructTimeline('inc-001', events, { correlate: false });

      expect(timeline[0].timestamp.getTime()).toBeLessThanOrEqual(timeline[1].timestamp.getTime());
      expect(timeline[1].timestamp.getTime()).toBeLessThanOrEqual(timeline[2].timestamp.getTime());
    });

    it('should handle empty events array', () => {
      const timeline = timelineBuilder.reconstructTimeline('inc-001', []);
      expect(timeline).toEqual([]);
    });
  });

  describe('correlateEvents', () => {
    it('should correlate events with same source host', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), sourceHost: 'host1' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:01:00Z'), sourceHost: 'host1' })
      ];

      const groups = timelineBuilder.correlateEvents(events);

      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(2);
    });

    it('should correlate events with same source IP', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), sourceIp: '192.168.1.100' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:01:00Z'), sourceIp: '192.168.1.100' })
      ];

      const groups = timelineBuilder.correlateEvents(events);

      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(2);
    });

    it('should correlate events with same user', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), sourceUser: 'admin' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:01:00Z'), sourceUser: 'admin' })
      ];

      const groups = timelineBuilder.correlateEvents(events);

      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(2);
    });

    it('should correlate events with process lineage', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), processId: 1234 }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:01:00Z'), parentProcessId: 1234 })
      ];

      const groups = timelineBuilder.correlateEvents(events);

      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(2);
    });

    it('should correlate events with shared indicators', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), indicators: ['IOC-001'] }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:01:00Z'), indicators: ['IOC-001', 'IOC-002'] })
      ];

      const groups = timelineBuilder.correlateEvents(events);

      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(2);
    });

    it('should not correlate events outside time window', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ timestamp: new Date('2024-01-01T10:00:00Z'), sourceHost: 'host1' }),
        createSecurityEvent({ timestamp: new Date('2024-01-01T11:00:00Z'), sourceHost: 'host1' })
      ];

      const groups = timelineBuilder.correlateEvents(events);

      expect(groups.length).toBe(2);
    });
  });

  describe('mapEventsToTechniques', () => {
    it('should map PowerShell execution to T1059.001', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ processName: 'powershell.exe' })
      ];

      const techniques = timelineBuilder.mapEventsToTechniques(events);

      expect(techniques.some(t => t.id === 'T1059.001')).toBe(true);
    });

    it('should map credential dumping indicators', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ processName: 'mimikatz.exe' })
      ];

      const techniques = timelineBuilder.mapEventsToTechniques(events);

      expect(techniques.some(t => t.id === 'T1003.001')).toBe(true);
    });

    it('should map RDP lateral movement', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ networkPort: 3389, protocol: 'tcp' })
      ];

      const techniques = timelineBuilder.mapEventsToTechniques(events);

      expect(techniques.some(t => t.id === 'T1021.001')).toBe(true);
    });

    it('should map SMB lateral movement', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ networkPort: 445 })
      ];

      const techniques = timelineBuilder.mapEventsToTechniques(events);

      expect(techniques.some(t => t.id === 'T1021.002')).toBe(true);
    });

    it('should map ransomware indicators', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ filePath: 'document.encrypted' })
      ];

      const techniques = timelineBuilder.mapEventsToTechniques(events);

      expect(techniques.some(t => t.id === 'T1486')).toBe(true);
    });
  });

  describe('inferPhase', () => {
    it('should infer execution phase from execution techniques', () => {
      const events: SecurityEvent[] = [];
      const techniques: MitreTechnique[] = [MITRE_TECHNIQUES.get('T1059.001')!];

      const phase = timelineBuilder.inferPhase(events, techniques);

      expect(phase).toBe('execution');
    });

    it('should infer lateral_movement phase', () => {
      const events: SecurityEvent[] = [];
      const techniques: MitreTechnique[] = [MITRE_TECHNIQUES.get('T1021.001')!];

      const phase = timelineBuilder.inferPhase(events, techniques);

      expect(phase).toBe('lateral_movement');
    });

    it('should default to discovery when no techniques match', () => {
      // When no techniques are provided, the tactic count is empty
      // and maxTactic defaults to 'discovery'
      const phase = timelineBuilder.inferPhase([], []);
      expect(phase).toBe('discovery');
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate base confidence from event count', () => {
      const events: SecurityEvent[] = [createSecurityEvent()];
      const confidence = timelineBuilder.calculateConfidence(events);
      expect(confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should boost confidence for multiple events', () => {
      const events: SecurityEvent[] = Array(5).fill(null).map(() => createSecurityEvent());
      const confidence = timelineBuilder.calculateConfidence(events);
      expect(confidence).toBeGreaterThan(0.5);
    });

    it('should boost confidence for multiple indicators', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({ indicators: ['IOC-1', 'IOC-2', 'IOC-3'] })
      ];
      const confidence = timelineBuilder.calculateConfidence(events);
      expect(confidence).toBeGreaterThan(0.5);
    });

    it('should cap confidence at 1.0', () => {
      const events: SecurityEvent[] = Array(20).fill(null).map(() =>
        createSecurityEvent({ indicators: ['IOC-1', 'IOC-2'], outcome: 'success' })
      );
      const confidence = timelineBuilder.calculateConfidence(events);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });
});

// ============================================================================
// EvidenceAnalyzer Tests
// ============================================================================

describe('EvidenceAnalyzer', () => {
  let evidenceAnalyzer: EvidenceAnalyzer;

  beforeEach(() => {
    evidenceAnalyzer = new EvidenceAnalyzer(testConfig);
  });

  describe('trackLateralMovement', () => {
    it('should track lateral movement from events', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({
          sourceHost: 'host1',
          destinationHost: 'host2',
          networkPort: 3389
        })
      ];

      const movements = evidenceAnalyzer.trackLateralMovement('inc-001', events);

      expect(movements.length).toBe(1);
      expect(movements[0].sourceAsset.id).toBe('host1');
      expect(movements[0].destinationAsset.id).toBe('host2');
    });

    it('should detect RDP movement method', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({
          sourceHost: 'host1',
          destinationHost: 'host2',
          networkPort: 3389
        })
      ];

      const movements = evidenceAnalyzer.trackLateralMovement('inc-001', events);

      expect(movements[0].method).toBe('rdp');
    });

    it('should detect SSH movement method', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({
          sourceHost: 'host1',
          destinationHost: 'host2',
          networkPort: 22
        })
      ];

      const movements = evidenceAnalyzer.trackLateralMovement('inc-001', events);

      expect(movements[0].method).toBe('ssh');
    });

    it('should detect SMB movement method', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({
          sourceHost: 'host1',
          destinationHost: 'host2',
          networkPort: 445
        })
      ];

      const movements = evidenceAnalyzer.trackLateralMovement('inc-001', events);

      expect(movements[0].method).toBe('smb');
    });

    it('should mark destination asset as compromised', () => {
      const events: SecurityEvent[] = [
        createSecurityEvent({
          sourceHost: 'host1',
          destinationHost: 'host2',
          networkPort: 3389,
          outcome: 'success'
        })
      ];

      evidenceAnalyzer.trackLateralMovement('inc-001', events);
      const assets = evidenceAnalyzer.getAssets();

      expect(assets.get('host2')?.compromisedAt).toBeDefined();
    });
  });

  describe('getOrCreateAsset', () => {
    it('should create asset with hostname for non-IP identifier', () => {
      const asset = evidenceAnalyzer.getOrCreateAsset('server01', []);

      expect(asset.hostname).toBe('server01');
      expect(asset.ipAddress).toBeUndefined();
    });

    it('should create asset with IP for IP identifier', () => {
      const asset = evidenceAnalyzer.getOrCreateAsset('192.168.1.100', []);

      expect(asset.ipAddress).toBe('192.168.1.100');
      expect(asset.hostname).toBeUndefined();
    });

    it('should return existing asset if already created', () => {
      const asset1 = evidenceAnalyzer.getOrCreateAsset('server01', []);
      const asset2 = evidenceAnalyzer.getOrCreateAsset('server01', []);

      expect(asset1).toBe(asset2);
    });
  });

  describe('mapToKillChain', () => {
    it('should map timeline events to kill chain phases', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'initial_access', timestamp: new Date() }),
        createTimelineEvent({ phase: 'execution', timestamp: new Date() }),
        createTimelineEvent({ phase: 'lateral_movement', timestamp: new Date() })
      ];

      const mapping = evidenceAnalyzer.mapToKillChain('inc-001', timelineEvents);

      expect(mapping.phases.length).toBeGreaterThan(0);
      expect(mapping.phases.some(p => p.phase === 'initial_access')).toBe(true);
    });

    it('should calculate completeness percentage', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'initial_access' }),
        createTimelineEvent({ phase: 'execution' })
      ];

      const mapping = evidenceAnalyzer.mapToKillChain('inc-001', timelineEvents);

      expect(mapping.completeness).toBeGreaterThan(0);
    });

    it('should determine attack vector', () => {
      const phishingTechnique = MITRE_TECHNIQUES.get('T1566')!;
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'initial_access', techniques: [phishingTechnique] })
      ];

      const mapping = evidenceAnalyzer.mapToKillChain('inc-001', timelineEvents);

      expect(mapping.attackVector).toBe('Phishing');
    });

    it('should calculate dwell time', () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-01T12:00:00Z');

      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'initial_access', timestamp: start }),
        createTimelineEvent({ phase: 'impact', timestamp: end })
      ];

      const mapping = evidenceAnalyzer.mapToKillChain('inc-001', timelineEvents);

      expect(mapping.dwellTime).toBe(2 * 60 * 60 * 1000); // 2 hours
    });
  });
});

// ============================================================================
// RootCauseAnalyzer Tests
// ============================================================================

describe('RootCauseAnalyzer', () => {
  let rootCauseAnalyzer: RootCauseAnalyzer;

  beforeEach(() => {
    rootCauseAnalyzer = new RootCauseAnalyzer();
  });

  describe('performRootCauseAnalysis', () => {
    it('should perform root cause analysis', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'initial_access', assets: ['server01'] })
      ];
      const assets: Asset[] = [createAsset({ id: 'server01', hostname: 'server01' })];

      const rca = rootCauseAnalyzer.performRootCauseAnalysis('inc-001', timelineEvents, assets);

      expect(rca).toHaveProperty('primaryCause');
      expect(rca).toHaveProperty('entryPoint');
      expect(rca).toHaveProperty('recommendations');
    });

    it('should identify entry point', () => {
      const phishingTechnique = MITRE_TECHNIQUES.get('T1566')!;
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({
          phase: 'initial_access',
          assets: ['workstation01'],
          techniques: [phishingTechnique]
        })
      ];
      const assets: Asset[] = [createAsset({ id: 'workstation01' })];

      const rca = rootCauseAnalyzer.performRootCauseAnalysis('inc-001', timelineEvents, assets);

      expect(rca.entryPoint.type).toBe('phishing');
    });

    it('should identify contributing factors', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'privilege_escalation' }),
        createTimelineEvent({ phase: 'credential_access' }),
        createTimelineEvent({ phase: 'lateral_movement' }),
        createTimelineEvent({ phase: 'lateral_movement' }),
        createTimelineEvent({ phase: 'lateral_movement' })
      ];
      const assets: Asset[] = [createAsset({ criticality: 'critical', compromisedAt: new Date() })];

      const rca = rootCauseAnalyzer.performRootCauseAnalysis('inc-001', timelineEvents, assets);

      expect(rca.contributingFactors.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'execution' })
      ];
      const assets: Asset[] = [];

      const rca = rootCauseAnalyzer.performRootCauseAnalysis('inc-001', timelineEvents, assets);

      expect(rca.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('identifySecurityGaps', () => {
    it('should identify detection gaps with low confidence', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ confidence: 0.3 }),
        createTimelineEvent({ confidence: 0.4 }),
        createTimelineEvent({ confidence: 0.5 })
      ];

      const gaps = rootCauseAnalyzer.identifySecurityGaps(timelineEvents);

      expect(gaps.some(g => g.category === 'detection')).toBe(true);
    });

    it('should identify prevention gaps with execution phase', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'execution' })
      ];

      const gaps = rootCauseAnalyzer.identifySecurityGaps(timelineEvents);

      expect(gaps.some(g => g.category === 'prevention')).toBe(true);
    });

    it('should identify response gaps with extended dwell time', () => {
      const start = new Date('2024-01-01T10:00:00Z');
      const end = new Date('2024-01-02T12:00:00Z'); // 26 hours later

      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ timestamp: start }),
        createTimelineEvent({ timestamp: end })
      ];

      const gaps = rootCauseAnalyzer.identifySecurityGaps(timelineEvents);

      expect(gaps.some(g => g.category === 'response')).toBe(true);
    });
  });

  describe('buildCauseTree', () => {
    it('should build cause tree for phishing entry point', () => {
      const phishingTechnique = MITRE_TECHNIQUES.get('T1566')!;
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ techniques: [phishingTechnique] })
      ];
      const assets: Asset[] = [createAsset()];

      const entryPoint = rootCauseAnalyzer.identifyEntryPoint(timelineEvents, assets);
      const causeTree = rootCauseAnalyzer.buildCauseTree(timelineEvents, entryPoint, 5);

      expect(causeTree.children.some(c => c.description.includes('clicked'))).toBe(true);
    });

    it('should build cause tree for exploit entry point', () => {
      const exploitTechnique = MITRE_TECHNIQUES.get('T1190') || {
        id: 'T1190',
        name: 'Exploit Public-Facing Application',
        tactic: 'Initial Access',
        description: 'Exploit',
        platforms: ['Windows'],
        detection: [],
        mitigation: [],
        url: '',
        dataSourcesUsed: []
      };
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ techniques: [exploitTechnique], phase: 'initial_access' })
      ];
      const assets: Asset[] = [createAsset()];

      const entryPoint = rootCauseAnalyzer.identifyEntryPoint(timelineEvents, assets);
      entryPoint.type = 'exploit';
      const causeTree = rootCauseAnalyzer.buildCauseTree(timelineEvents, entryPoint, 5);

      expect(causeTree.children.some(c => c.description.includes('Unpatched'))).toBe(true);
    });
  });
});

// ============================================================================
// ImpactAnalyzer Tests
// ============================================================================

describe('ImpactAnalyzer', () => {
  let impactAnalyzer: ImpactAnalyzer;

  beforeEach(() => {
    impactAnalyzer = new ImpactAnalyzer(testConfig);
  });

  describe('assessImpact', () => {
    it('should assess impact with critical severity for ransomware', () => {
      const ransomwareTechnique = MITRE_TECHNIQUES.get('T1486')!;
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'impact', techniques: [ransomwareTechnique] })
      ];
      const lateralMovements: LateralMovement[] = [];

      const assessment = impactAnalyzer.assessImpact('inc-001', timelineEvents, lateralMovements);

      expect(assessment.overallImpact).toBe('critical');
      expect(assessment.impactTypes).toContain('ransomware');
    });

    it('should assess impact with data breach type for exfiltration', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'exfiltration' })
      ];
      const lateralMovements: LateralMovement[] = [];

      const assessment = impactAnalyzer.assessImpact('inc-001', timelineEvents, lateralMovements);

      expect(assessment.impactTypes).toContain('data_breach');
    });

    it('should assess business impact', () => {
      const asset = createAsset({ id: 'critical-server', criticality: 'critical', services: ['auth', 'api'] });
      impactAnalyzer.setAssets(new Map([[asset.id, asset]]));

      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ assets: ['critical-server'] })
      ];

      const assessment = impactAnalyzer.assessImpact('inc-001', timelineEvents, []);

      expect(assessment.businessImpact).toHaveProperty('operationalDowntime');
      expect(assessment.businessImpact).toHaveProperty('productivityLoss');
    });

    it('should assess technical impact', () => {
      const asset = createAsset({ id: 'server01', compromisedAt: new Date() });
      impactAnalyzer.setAssets(new Map([[asset.id, asset]]));

      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ assets: ['server01'] })
      ];

      const assessment = impactAnalyzer.assessImpact('inc-001', timelineEvents, []);

      expect(assessment.technicalImpact.confidentialityImpacted).toBe(true);
    });

    it('should assess regulatory impact for data breach', () => {
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'exfiltration' })
      ];

      const assessment = impactAnalyzer.assessImpact('inc-001', timelineEvents, []);

      expect(assessment.regulatoryImpact.applicableRegulations).toContain('GDPR');
      expect(assessment.regulatoryImpact.notificationRequired).toBe(true);
    });

    it('should assess financial impact', () => {
      const asset = createAsset({ id: 'server01', compromisedAt: new Date() });
      impactAnalyzer.setAssets(new Map([[asset.id, asset]]));

      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'exfiltration', assets: ['server01'] })
      ];

      const assessment = impactAnalyzer.assessImpact('inc-001', timelineEvents, []);

      expect(assessment.financialImpact.totalEstimatedLoss).toBeGreaterThan(0);
    });

    it('should assess recovery requirements', () => {
      const ransomwareTechnique = MITRE_TECHNIQUES.get('T1486')!;
      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'impact', techniques: [ransomwareTechnique] })
      ];

      const assessment = impactAnalyzer.assessImpact('inc-001', timelineEvents, []);

      expect(assessment.recoveryAssessment.estimatedRecoveryTime).toBe(72);
    });
  });

  describe('generateAttackGraph', () => {
    it('should generate attack graph with nodes', () => {
      const asset = createAsset({ id: 'server01', hostname: 'server01' });
      impactAnalyzer.setAssets(new Map([[asset.id, asset]]));

      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ assets: ['server01'], techniques: [MITRE_TECHNIQUES.get('T1059.001')!] })
      ];

      const graph = impactAnalyzer.generateAttackGraph('inc-001', timelineEvents, []);

      expect(graph.nodes.length).toBeGreaterThan(0);
    });

    it('should generate attack graph with edges from lateral movements', () => {
      const sourceAsset = createAsset({ id: 'host1', hostname: 'host1' });
      const destAsset = createAsset({ id: 'host2', hostname: 'host2' });
      impactAnalyzer.setAssets(new Map([
        [sourceAsset.id, sourceAsset],
        [destAsset.id, destAsset]
      ]));

      const movements: LateralMovement[] = [{
        id: 'lm-001',
        timestamp: new Date(),
        sourceAsset,
        destinationAsset: destAsset,
        method: 'rdp',
        techniques: [],
        success: true,
        confidence: 0.9,
        sourceEvents: []
      }];

      const graph = impactAnalyzer.generateAttackGraph('inc-001', [], movements);

      expect(graph.edges.some(e => e.type === 'lateral_movement')).toBe(true);
    });

    it('should calculate risk score', () => {
      const asset = createAsset({ id: 'server01', criticality: 'critical', compromisedAt: new Date() });
      impactAnalyzer.setAssets(new Map([[asset.id, asset]]));

      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ assets: ['server01'] })
      ];

      const graph = impactAnalyzer.generateAttackGraph('inc-001', timelineEvents, []);

      expect(graph.riskScore).toBeGreaterThanOrEqual(0);
      expect(graph.riskScore).toBeLessThanOrEqual(100);
    });

    it('should identify entry points', () => {
      const asset = createAsset({ id: 'entry-host' });
      impactAnalyzer.setAssets(new Map([[asset.id, asset]]));

      const timelineEvents: TimelineEvent[] = [
        createTimelineEvent({ phase: 'initial_access', assets: ['entry-host'], timestamp: new Date('2024-01-01T10:00:00Z') }),
        createTimelineEvent({ phase: 'execution', assets: ['other-host'], timestamp: new Date('2024-01-01T11:00:00Z') })
      ];

      const graph = impactAnalyzer.generateAttackGraph('inc-001', timelineEvents, []);

      expect(graph.entryPoints.length).toBeGreaterThan(0);
    });

    it('should limit nodes to maxNodes config', () => {
      const limitedConfig = { ...testConfig, maxGraphNodes: 2 };
      const limitedAnalyzer = new ImpactAnalyzer(limitedConfig);

      const assets = Array.from({ length: 10 }, (_, i) =>
        createAsset({ id: `server${i}`, hostname: `server${i}` })
      );
      limitedAnalyzer.setAssets(new Map(assets.map(a => [a.id, a])));

      const timelineEvents: TimelineEvent[] = assets.map(a =>
        createTimelineEvent({ assets: [a.id] })
      );

      const graph = limitedAnalyzer.generateAttackGraph('inc-001', timelineEvents, []);

      expect(graph.nodes.length).toBeLessThanOrEqual(2);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('generateId', () => {
    it('should generate ID with correct prefix', () => {
      const id = generateId('TEST');
      expect(id.startsWith('TEST_')).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId('TEST');
      const id2 = generateId('TEST');
      expect(id1).not.toBe(id2);
    });
  });

  describe('getMaxSeverity', () => {
    it('should return critical as max severity', () => {
      const severities = ['low', 'medium', 'critical', 'high'] as const;
      expect(getMaxSeverity([...severities])).toBe('critical');
    });

    it('should handle single severity', () => {
      expect(getMaxSeverity(['medium'])).toBe('medium');
    });
  });

  describe('PHASE_ORDER', () => {
    it('should have correct number of phases', () => {
      expect(PHASE_ORDER.length).toBe(14);
    });

    it('should start with reconnaissance', () => {
      expect(PHASE_ORDER[0]).toBe('reconnaissance');
    });

    it('should end with impact', () => {
      expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe('impact');
    });
  });

  describe('MITRE_TECHNIQUES', () => {
    it('should contain PowerShell technique', () => {
      expect(MITRE_TECHNIQUES.has('T1059.001')).toBe(true);
    });

    it('should have correct technique structure', () => {
      const technique = MITRE_TECHNIQUES.get('T1059.001');
      expect(technique).toHaveProperty('id');
      expect(technique).toHaveProperty('name');
      expect(technique).toHaveProperty('tactic');
      expect(technique).toHaveProperty('description');
    });
  });
});
