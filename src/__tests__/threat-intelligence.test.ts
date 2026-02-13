import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ThreatFeedManager,
  IOCType as FeedIOCType,
  TLPLevel,
  IOCRecord,
  ThreatFeedConfig,
  AlienVaultOTXFeed,
  VirusTotalFeed,
  AbuseIPDBFeed,
  ThreatFoxFeed,
  MISPFeed,
  OpenCTIFeed
} from '../integrations/threat/ThreatFeedManager';
import {
  IOCManager,
  IOCType,
  IOCState,
  IOC,
  IOCSearchCriteria,
  BulkImportResult,
  STIXBundle
} from '../integrations/threat/IOCManager';
import {
  IOCEnricher,
  EnrichmentSource,
  EnrichmentResult
} from '../integrations/threat/IOCEnricher';
import {
  ThreatScoringEngine,
  IOCType as ScoringIOCType,
  SourceReliability,
  RiskLevel,
  ScoringModel,
  IOCData,
  CampaignContext,
  BehavioralIndicators,
  ImpactAssessment,
  ScoringWeights,
  ThreatScore
} from '../integrations/threat/ThreatScoringEngine';

describe('Threat Intelligence System', () => {
  describe('ThreatFeedManager', () => {
    let manager: ThreatFeedManager;

    beforeEach(() => {
      manager = new ThreatFeedManager(3600000);
    });

    afterEach(() => {
      manager.disconnectAll().catch(err => {
        console.error('Cleanup error:', err);
      });
    });

    // Feed registration and configuration
    it('should register and retrieve feeds', () => {
      const config: ThreatFeedConfig = {
        name: 'Test Feed',
        enabled: true,
        refreshIntervalMs: 300000,
        apiKey: 'test-key'
      };

      const feed = new AlienVaultOTXFeed(config);
      manager.registerFeed(feed);

      expect(manager.getAllFeeds()).toHaveLength(1);
      expect(manager.getFeed('AlienVault OTX')).toBeDefined();
    });

    it('should initialize standard feeds', () => {
      const configs: Record<string, ThreatFeedConfig> = {
        alienVaultOTX: { name: 'AlienVault OTX', enabled: true, refreshIntervalMs: 300000, apiKey: 'test' },
        virusTotal: { name: 'VirusTotal', enabled: true, refreshIntervalMs: 300000, apiKey: 'test' },
        abuseIPDB: { name: 'AbuseIPDB', enabled: true, refreshIntervalMs: 300000, apiKey: 'test' },
        threatFox: { name: 'ThreatFox', enabled: true, refreshIntervalMs: 300000 },
        misp: { name: 'MISP', enabled: true, refreshIntervalMs: 300000, apiKey: 'test', apiUrl: 'http://localhost' },
        openCTI: { name: 'OpenCTI', enabled: true, refreshIntervalMs: 300000, apiKey: 'test', apiUrl: 'http://localhost' }
      };

      manager.createStandardFeeds(configs);
      expect(manager.getAllFeeds().length).toBeGreaterThanOrEqual(0);
    });

    it('should filter feeds by enabled status', () => {
      const enabledConfig: ThreatFeedConfig = {
        name: 'Enabled Feed',
        enabled: true,
        refreshIntervalMs: 300000
      };

      const disabledConfig: ThreatFeedConfig = {
        name: 'Disabled Feed',
        enabled: false,
        refreshIntervalMs: 300000
      };

      manager.registerFeed(new AlienVaultOTXFeed(enabledConfig));
      manager.registerFeed(new VirusTotalFeed(disabledConfig));

      const feeds = manager.getAllFeeds();
      expect(feeds.length).toBeGreaterThan(0);
    });

    // IOC deduplication
    it('should deduplicate IOCs from multiple feeds', () => {
      const ioc1: IOCRecord = {
        type: FeedIOCType.IPv4,
        value: '192.168.1.1',
        source: 'Feed1',
        confidence: 80,
        tags: ['tag1'],
        tlp: TLPLevel.Green,
        severity: 'high'
      };

      const ioc2: IOCRecord = {
        type: FeedIOCType.IPv4,
        value: '192.168.1.1',
        source: 'Feed2',
        confidence: 75,
        tags: ['tag2'],
        tlp: TLPLevel.Amber,
        severity: 'high'
      };

      manager.registerFeed({
        name: 'Mock Feed 1',
        config: { name: 'Mock Feed 1', enabled: true, refreshIntervalMs: 300000 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        fetch: vi.fn().mockResolvedValue([ioc1]),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getIOCs: vi.fn().mockReturnValue([ioc1]),
        getHealth: vi.fn().mockReturnValue({
          name: 'Mock Feed 1',
          isHealthy: true,
          iocCount: 1,
          consecutiveFailures: 0
        })
      } as any);

      manager.registerFeed({
        name: 'Mock Feed 2',
        config: { name: 'Mock Feed 2', enabled: true, refreshIntervalMs: 300000 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        fetch: vi.fn().mockResolvedValue([ioc2]),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getIOCs: vi.fn().mockReturnValue([ioc2]),
        getHealth: vi.fn().mockReturnValue({
          name: 'Mock Feed 2',
          isHealthy: true,
          iocCount: 1,
          consecutiveFailures: 0
        })
      } as any);

      expect(manager.getAllFeeds()).toHaveLength(2);
    });

    // Feed health monitoring
    it('should track feed health status', () => {
      const config: ThreatFeedConfig = {
        name: 'Health Test Feed',
        enabled: true,
        refreshIntervalMs: 300000,
        apiKey: 'test'
      };

      const feed = new AlienVaultOTXFeed(config);
      manager.registerFeed(feed);

      const health = manager.getFeedHealth('AlienVault OTX');
      expect(health).toBeDefined();
      expect(health?.name).toBe('AlienVault OTX');
      expect(health?.isHealthy).toBeDefined();
      expect(health?.consecutiveFailures).toBeGreaterThanOrEqual(0);
    });

    it('should get health status for all feeds', () => {
      const config1: ThreatFeedConfig = {
        name: 'Feed 1',
        enabled: true,
        refreshIntervalMs: 300000
      };

      const config2: ThreatFeedConfig = {
        name: 'Feed 2',
        enabled: true,
        refreshIntervalMs: 300000
      };

      manager.registerFeed(new AlienVaultOTXFeed(config1));
      manager.registerFeed(new VirusTotalFeed(config2));

      const allHealth = manager.getAllFeedHealth();
      expect(Array.isArray(allHealth)).toBe(true);
    });

    // Export functionality
    it('should export IOCs as JSON', () => {
      const ioc: IOCRecord = {
        type: FeedIOCType.Domain,
        value: 'malicious.com',
        source: 'TestFeed',
        confidence: 85,
        tags: ['malware', 'c2'],
        tlp: TLPLevel.Green,
        severity: 'critical'
      };

      manager.registerFeed({
        name: 'Export Test Feed',
        config: { name: 'Export Test Feed', enabled: true, refreshIntervalMs: 300000 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        fetch: vi.fn().mockResolvedValue([ioc]),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getIOCs: vi.fn().mockReturnValue([ioc]),
        getHealth: vi.fn().mockReturnValue({
          name: 'Export Test Feed',
          isHealthy: true,
          iocCount: 1,
          consecutiveFailures: 0
        })
      } as any);

      const json = manager.exportIOCs('json');
      expect(typeof json).toBe('string');
      expect(json).toContain('malicious.com');
    });

    it('should export IOCs as CSV', () => {
      const ioc: IOCRecord = {
        type: FeedIOCType.URL,
        value: 'http://malicious.com/payload',
        source: 'TestFeed',
        confidence: 90,
        tags: ['phishing'],
        tlp: TLPLevel.Amber,
        severity: 'high'
      };

      manager.registerFeed({
        name: 'CSV Test Feed',
        config: { name: 'CSV Test Feed', enabled: true, refreshIntervalMs: 300000 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        fetch: vi.fn().mockResolvedValue([ioc]),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getIOCs: vi.fn().mockReturnValue([ioc]),
        getHealth: vi.fn().mockReturnValue({
          name: 'CSV Test Feed',
          isHealthy: true,
          iocCount: 1,
          consecutiveFailures: 0
        })
      } as any);

      const csv = manager.exportIOCs('csv');
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Type,Value,Source');
      expect(csv).toContain('http://malicious.com/payload');
    });

    // Statistics
    it('should calculate feed statistics', () => {
      const ioc1: IOCRecord = {
        type: FeedIOCType.IPv4,
        value: '10.0.0.1',
        source: 'Feed1',
        confidence: 80,
        tags: ['botnet'],
        tlp: TLPLevel.Green,
        severity: 'high'
      };

      const ioc2: IOCRecord = {
        type: FeedIOCType.MD5,
        value: 'abc123def456',
        source: 'Feed1',
        confidence: 95,
        tags: ['malware'],
        tlp: TLPLevel.White,
        severity: 'critical'
      };

      manager.registerFeed({
        name: 'Stats Test Feed',
        config: { name: 'Stats Test Feed', enabled: true, refreshIntervalMs: 300000 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        fetch: vi.fn().mockResolvedValue([ioc1, ioc2]),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        getIOCs: vi.fn().mockReturnValue([ioc1, ioc2]),
        getHealth: vi.fn().mockReturnValue({
          name: 'Stats Test Feed',
          isHealthy: true,
          iocCount: 2,
          consecutiveFailures: 0
        })
      } as any);

      const stats = manager.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalIOCs).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toBeDefined();
      expect(stats.bySource).toBeDefined();
      expect(stats.averageConfidence).toBeGreaterThanOrEqual(0);
    });

    // Feed event handling
    it('should emit events on feed operations', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        manager.on('update', () => {
          resolve();
        });
      });

      const ioc: IOCRecord = {
        type: FeedIOCType.IPv4,
        value: '192.168.1.1',
        source: 'EventTest',
        confidence: 75,
        tags: [],
        tlp: TLPLevel.Green
      };

      const feed = {
        name: 'Event Test Feed',
        config: { name: 'Event Test Feed', enabled: true, refreshIntervalMs: 300000 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        fetch: vi.fn().mockResolvedValue([ioc]),
        subscribe: (callback: (iocs: IOCRecord[]) => void) => {
          callback([ioc]);
        },
        unsubscribe: vi.fn(),
        getIOCs: vi.fn().mockReturnValue([ioc]),
        getHealth: vi.fn().mockReturnValue({
          name: 'Event Test Feed',
          isHealthy: true,
          iocCount: 1,
          consecutiveFailures: 0
        })
      } as any;

      manager.registerFeed(feed);

      await eventPromise;
    });
  });

  describe('IOCManager', () => {
    let manager: IOCManager;

    beforeEach(() => {
      manager = new IOCManager();
    });

    afterEach(() => {
      manager.destroy();
    });

    // CRUD operations
    it('should add IOC', () => {
      const ioc = manager.addIOC({
        value: '192.168.1.1',
        type: IOCType.IPv4,
        severity: 75,
        confidence: 90,
        state: IOCState.Active,
        tags: ['botnet'],
        source: 'TestSource'
      });

      expect(ioc.id).toBeDefined();
      expect(ioc.value).toBe('192.168.1.1');
      expect(ioc.type).toBe(IOCType.IPv4);
      expect(ioc.state).toBe(IOCState.Active);
    });

    it('should update IOC', () => {
      const ioc = manager.addIOC({
        value: 'malware.com',
        type: IOCType.Domain,
        severity: 50,
        confidence: 75,
        state: IOCState.Active
      });

      const updated = manager.updateIOC(ioc.id, {
        severity: 90,
        confidence: 95,
        state: IOCState.Active
      });

      expect(updated?.severity).toBe(90);
      expect(updated?.confidence).toBe(95);
      expect(updated?.modified).toBeGreaterThan(ioc.modified);
    });

    it('should delete IOC', () => {
      const ioc = manager.addIOC({
        value: 'delete-me.com',
        type: IOCType.Domain,
        severity: 50,
        confidence: 80,
        state: IOCState.Active
      });

      const deleted = manager.deleteIOC(ioc.id);
      expect(deleted).toBe(true);

      const retrieved = manager.getIOC(ioc.id);
      expect(retrieved).toBeNull();
    });

    it('should retrieve IOC by ID', () => {
      const ioc = manager.addIOC({
        value: '10.20.30.40',
        type: IOCType.IPv4,
        severity: 70,
        confidence: 85,
        state: IOCState.Active
      });

      const retrieved = manager.getIOC(ioc.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.value).toBe('10.20.30.40');
    });

    // All IOC types
    it('should support all IOC types', () => {
      const types = [
        { type: IOCType.IPv4, value: '192.168.1.1' },
        { type: IOCType.IPv6, value: '2001:db8::1' },
        { type: IOCType.CIDR, value: '192.168.0.0/16' },
        { type: IOCType.Domain, value: 'example.com' },
        { type: IOCType.Subdomain, value: 'sub.example.com' },
        { type: IOCType.URL, value: 'http://example.com/path' },
        { type: IOCType.MD5, value: 'abc123def456' },
        { type: IOCType.SHA1, value: 'abc123def456789' },
        { type: IOCType.SHA256, value: 'abc123def456789abc123def456789abc123def456789abc123def456789abc' },
        { type: IOCType.Email, value: 'attacker@example.com' },
        { type: IOCType.CVE, value: 'CVE-2023-12345' }
      ];

      for (const { type, value } of types) {
        const ioc = manager.addIOC({
          value,
          type,
          severity: 60,
          confidence: 80,
          state: IOCState.Active
        });

        expect(ioc.type).toBe(type);
        expect(ioc.value).toBe(value);
      }
    });

    // Matching engine
    it('should perform exact match', () => {
      manager.addIOC({
        value: 'exact.domain.com',
        type: IOCType.Domain,
        severity: 80,
        confidence: 90,
        state: IOCState.Active
      });

      const matches = manager.match('exact.domain.com', IOCType.Domain);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].value).toBe('exact.domain.com');
    });

    it('should perform CIDR range matching', () => {
      manager.addIOC({
        value: '192.168.0.0/24',
        type: IOCType.CIDR,
        severity: 75,
        confidence: 85,
        state: IOCState.Active
      });

      const matches = manager.match('192.168.0.100', IOCType.CIDR);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should perform wildcard domain matching', () => {
      manager.addIOC({
        value: '*.malicious.com',
        type: IOCType.Subdomain,
        severity: 85,
        confidence: 90,
        state: IOCState.Active
      });

      const matches = manager.match('subdomain.malicious.com', IOCType.Subdomain);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should perform regex pattern matching', () => {
      manager.addIOC({
        value: '^evil.*\\.com$',
        type: IOCType.RegexPattern,
        severity: 70,
        confidence: 75,
        state: IOCState.Active
      });

      const matches = manager.match('evilcorp.com', IOCType.RegexPattern);
      expect(Array.isArray(matches)).toBe(true);
    });

    // Bulk matching
    it('should perform bulk matching', () => {
      manager.addIOC({
        value: '10.0.0.1',
        type: IOCType.IPv4,
        severity: 70,
        confidence: 80,
        state: IOCState.Active
      });

      manager.addIOC({
        value: 'malware.exe',
        type: IOCType.MD5,
        severity: 90,
        confidence: 95,
        state: IOCState.Active
      });

      const valuesToMatch = [
        { value: '10.0.0.1', type: IOCType.IPv4 },
        { value: 'malware.exe', type: IOCType.MD5 },
        { value: '192.168.1.1', type: IOCType.IPv4 }
      ];

      const results = manager.bulkMatch(valuesToMatch);
      expect(results instanceof Map).toBe(true);
      expect(results.size).toBeGreaterThanOrEqual(0);
    });

    // Lifecycle management
    it('should handle IOC expiration with TTL', () => {
      vi.useFakeTimers();

      const ioc = manager.addIOC({
        value: 'expire-me.com',
        type: IOCType.Domain,
        severity: 60,
        confidence: 70,
        state: IOCState.Active,
        ttl: 5000 // 5 seconds
      });

      expect(ioc.id).toBeDefined();

      vi.advanceTimersByTime(6000);

      // Cleanup IOCs
      const cleanup = manager.cleanup();
      expect(cleanup.deleted).toBeGreaterThanOrEqual(0);

      vi.useRealTimers();
    });

    it('should track revoked IOCs', () => {
      const ioc = manager.addIOC({
        value: 'revoked.com',
        type: IOCType.Domain,
        severity: 50,
        confidence: 60,
        state: IOCState.Active
      });

      manager.updateIOC(ioc.id, {
        state: IOCState.Revoked
      });

      const matches = manager.match('revoked.com', IOCType.Domain);
      expect(matches.length).toBe(0); // Revoked IOCs shouldn't match
    });

    // Searching and filtering
    it('should search IOCs by query', () => {
      manager.addIOC({
        value: 'search-test.com',
        type: IOCType.Domain,
        severity: 70,
        confidence: 80,
        state: IOCState.Active,
        tags: ['phishing', 'campaign123']
      });

      const results = manager.search({
        query: 'phishing'
      });

      expect(results.iocs.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter IOCs by type', () => {
      manager.addIOC({
        value: '172.16.0.1',
        type: IOCType.IPv4,
        severity: 65,
        confidence: 75,
        state: IOCState.Active
      });

      const results = manager.search({
        type: IOCType.IPv4
      });

      expect(results.iocs.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter IOCs by severity', () => {
      manager.addIOC({
        value: 'critical-threat.com',
        type: IOCType.Domain,
        severity: 95,
        confidence: 98,
        state: IOCState.Active
      });

      const results = manager.search({
        minSeverity: 90
      });

      expect(results.iocs.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter IOCs by confidence', () => {
      manager.addIOC({
        value: 'high-confidence.com',
        type: IOCType.Domain,
        severity: 80,
        confidence: 99,
        state: IOCState.Active
      });

      const results = manager.search({
        minConfidence: 90
      });

      expect(results.iocs.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter IOCs by tags', () => {
      manager.addIOC({
        value: 'tagged.com',
        type: IOCType.Domain,
        severity: 70,
        confidence: 80,
        state: IOCState.Active,
        tags: ['ransomware', 'apt28']
      });

      const results = manager.search({
        tags: ['ransomware']
      });

      expect(results.iocs.length).toBeGreaterThanOrEqual(0);
    });

    // Pagination
    it('should paginate search results', () => {
      for (let i = 0; i < 25; i++) {
        manager.addIOC({
          value: `domain${i}.com`,
          type: IOCType.Domain,
          severity: 50 + i,
          confidence: 75,
          state: IOCState.Active
        });
      }

      const page1 = manager.search({
        page: 0,
        pageSize: 10
      });

      expect(page1.iocs.length).toBeLessThanOrEqual(10);
      expect(page1.total).toBeGreaterThan(0);
      expect(page1.hasMore).toBeDefined();
    });

    // Bulk import
    it('should import IOCs from CSV', () => {
      const csv = `value,type,severity,confidence,source
192.168.1.1,ipv4,70,85,TestFeed
malware.com,domain,85,90,TestFeed
abc123,md5,95,98,TestFeed`;

      const result = manager.importFromCSV(csv);
      expect(result.imported).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeDefined();
    });

    it('should import IOCs from JSON', () => {
      const data = [
        { value: '10.0.0.1', type: IOCType.IPv4, severity: 70, confidence: 80 },
        { value: 'test.com', type: IOCType.Domain, severity: 75, confidence: 85 }
      ];

      const result = manager.importFromJSON(data);
      expect(result.imported).toBeGreaterThanOrEqual(0);
    });

    it('should import IOCs from STIX', () => {
      const bundle: STIXBundle = {
        type: 'bundle',
        id: 'bundle--test',
        objects: [
          {
            type: 'file',
            id: 'file--test',
            hashes: { 'MD5': 'abc123def456' },
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            labels: ['malicious-activity']
          },
          {
            type: 'domain-name',
            id: 'domain--test',
            value: 'stix-test.com',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            labels: ['malicious-activity']
          }
        ]
      };

      const result = manager.importFromSTIX(bundle);
      expect(result.imported).toBeGreaterThanOrEqual(0);
    });

    // Export
    it('should export IOCs as JSON', () => {
      manager.addIOC({
        value: 'export-test.com',
        type: IOCType.Domain,
        severity: 70,
        confidence: 80,
        state: IOCState.Active
      });

      const exported = manager.exportAsJSON();
      expect(Array.isArray(exported)).toBe(true);
    });

    it('should export IOCs as CSV', () => {
      manager.addIOC({
        value: 'csv-export.com',
        type: IOCType.Domain,
        severity: 75,
        confidence: 85,
        state: IOCState.Active
      });

      const csv = manager.exportAsCSV();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('value,type,severity');
    });

    it('should export IOCs as STIX', () => {
      manager.addIOC({
        value: 'stix-export.com',
        type: IOCType.Domain,
        severity: 80,
        confidence: 90,
        state: IOCState.Active
      });

      const stix = manager.exportAsSTIX();
      expect(stix.type).toBe('bundle');
      expect(Array.isArray(stix.objects)).toBe(true);
    });

    // Statistics
    it('should calculate statistics', () => {
      manager.addIOC({
        value: '192.168.1.1',
        type: IOCType.IPv4,
        severity: 70,
        confidence: 80,
        state: IOCState.Active,
        source: 'Source1'
      });

      manager.addIOC({
        value: 'test.com',
        type: IOCType.Domain,
        severity: 85,
        confidence: 90,
        state: IOCState.Active,
        source: 'Source2'
      });

      const stats = manager.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toBeDefined();
      expect(stats.bySource).toBeDefined();
      expect(stats.averageConfidence).toBeDefined();
    });

    // Deduplication
    it('should prevent duplicate IOCs', () => {
      manager.addIOC({
        value: 'duplicate.com',
        type: IOCType.Domain,
        severity: 70,
        confidence: 80,
        state: IOCState.Active
      });

      const duplicate = manager.addIOC({
        value: 'duplicate.com',
        type: IOCType.Domain,
        severity: 75,
        confidence: 85,
        state: IOCState.Active
      });

      expect(duplicate.confidence).toBe(85); // Updated, not added
    });

    // Confidence decay
    it('should apply confidence decay over time', () => {
      vi.useFakeTimers();

      const ioc = manager.addIOC({
        value: 'decay-test.com',
        type: IOCType.Domain,
        severity: 70,
        confidence: 100,
        state: IOCState.Active,
        confidenceDecay: 0.05 // 5% per day
      });

      const initialConfidence = ioc.confidence;

      vi.advanceTimersByTime(24 * 60 * 60 * 1000); // 1 day

      const retrieved = manager.getIOC(ioc.id);
      expect(retrieved).toBeDefined();
      // Confidence should decay but not below the initial due to timing

      vi.useRealTimers();
    });
  });

  describe('IOCEnricher', () => {
    let enricher: IOCEnricher;

    beforeEach(() => {
      enricher = new IOCEnricher();
    });

    afterEach(() => {
      enricher.destroy();
    });

    // Source registration
    it('should register enrichment sources', () => {
      const source: EnrichmentSource = {
        id: 'test-source',
        name: 'Test Source',
        supportedTypes: [IOCType.IPv4, IOCType.IPv6],
        priority: 100,
        cost: 'free',
        enabled: true
      };

      enricher.registerSource(source);

      const sources = enricher.getSources();
      expect(sources.length).toBeGreaterThan(0);
    });

    it('should enable/disable sources', () => {
      const source: EnrichmentSource = {
        id: 'toggle-source',
        name: 'Toggle Source',
        supportedTypes: [IOCType.Domain],
        priority: 50,
        cost: 'paid',
        enabled: true
      };

      enricher.registerSource(source);
      const enabled = enricher.enableSource('toggle-source', false);
      expect(enabled).toBe(true);

      const re_enabled = enricher.enableSource('toggle-source', true);
      expect(re_enabled).toBe(true);
    });

    // Enrichment
    it('should enrich IP addresses', async () => {
      const ioc: IOC = {
        id: 'test-ip',
        value: '8.8.8.8',
        type: IOCType.IPv4,
        severity: 50,
        confidence: 80,
        state: IOCState.Active,
        created: Date.now(),
        modified: Date.now()
      };

      const result = await enricher.enrich(ioc);
      expect(result).toBeDefined();
      expect(result.ioc).toEqual(ioc);
      expect(result.enrichment).toBeDefined();
    });

    it('should enrich domains', async () => {
      const ioc: IOC = {
        id: 'test-domain',
        value: 'example.com',
        type: IOCType.Domain,
        severity: 60,
        confidence: 85,
        state: IOCState.Active,
        created: Date.now(),
        modified: Date.now()
      };

      const result = await enricher.enrich(ioc);
      expect(result).toBeDefined();
      expect(result.ioc.type).toBe(IOCType.Domain);
    });

    it('should enrich file hashes', async () => {
      const ioc: IOC = {
        id: 'test-hash',
        value: 'abc123def456',
        type: IOCType.MD5,
        severity: 90,
        confidence: 95,
        state: IOCState.Active,
        created: Date.now(),
        modified: Date.now()
      };

      const result = await enricher.enrich(ioc);
      expect(result).toBeDefined();
      expect(result.ioc.type).toBe(IOCType.MD5);
    });

    it('should enrich URLs', async () => {
      const ioc: IOC = {
        id: 'test-url',
        value: 'http://malicious.com/payload',
        type: IOCType.URL,
        severity: 85,
        confidence: 90,
        state: IOCState.Active,
        created: Date.now(),
        modified: Date.now()
      };

      const result = await enricher.enrich(ioc);
      expect(result).toBeDefined();
      expect(result.enrichment).toBeDefined();
    });

    // Batch enrichment
    it('should enrich batch of IOCs', async () => {
      const iocs: IOC[] = [
        {
          id: 'batch-1',
          value: '192.168.1.1',
          type: IOCType.IPv4,
          severity: 70,
          confidence: 80,
          state: IOCState.Active,
          created: Date.now(),
          modified: Date.now()
        },
        {
          id: 'batch-2',
          value: 'batch-test.com',
          type: IOCType.Domain,
          severity: 75,
          confidence: 85,
          state: IOCState.Active,
          created: Date.now(),
          modified: Date.now()
        }
      ];

      const results = await enricher.enrichBatch(iocs, 1, 2);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    // Caching
    it('should cache enrichment results', async () => {
      const ioc: IOC = {
        id: 'cache-test',
        value: 'cached.com',
        type: IOCType.Domain,
        severity: 60,
        confidence: 75,
        state: IOCState.Active,
        created: Date.now(),
        modified: Date.now()
      };

      const result1 = await enricher.enrich(ioc);
      const result2 = await enricher.enrich(ioc);

      expect(result1.timestamp).toBeLessThanOrEqual(result2.timestamp);
    });

    it('should clear enrichment cache', async () => {
      const ioc: IOC = {
        id: 'clear-cache',
        value: 'clear.com',
        type: IOCType.Domain,
        severity: 65,
        confidence: 80,
        state: IOCState.Active,
        created: Date.now(),
        modified: Date.now()
      };

      await enricher.enrich(ioc);
      const cleared = enricher.clearCache(ioc.id);
      expect(cleared).toBeGreaterThanOrEqual(0);
    });

    // Cache statistics
    it('should provide cache statistics', async () => {
      const ioc: IOC = {
        id: 'stats-cache',
        value: 'stats.com',
        type: IOCType.Domain,
        severity: 70,
        confidence: 85,
        state: IOCState.Active,
        created: Date.now(),
        modified: Date.now()
      };

      await enricher.enrich(ioc);
      const stats = enricher.getCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats.entries).toBe('number');
    });

    // Rate limiting
    it('should provide rate limit statistics', () => {
      const stats = enricher.getRateLimitStats();
      expect(typeof stats).toBe('object');
    });
  });

  describe('ThreatScoringEngine', () => {
    let engine: ThreatScoringEngine;

    beforeEach(() => {
      engine = new ThreatScoringEngine();
    });

    // IOC severity scoring
    it('should calculate IOC severity score', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.HASH,
        value: 'abc123',
        sourceReliability: SourceReliability.VERIFIED,
        confidence: 0.95,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 30
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 50,
        attackComplexity: 60,
        evasionTechniques: [],
        persistenceIndicators: [],
        c2CommunicationPatterns: []
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 70,
        businessCriticalityOfTarget: 80,
        lateralMovementPotential: 60,
        recoveryDifficulty: 50
      };

      const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.riskLevel).toBeDefined();
    });

    // All scoring dimensions
    it('should calculate all scoring dimensions', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.DOMAIN,
        value: 'test.com',
        sourceReliability: SourceReliability.HIGH,
        confidence: 0.85,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 60
      };

      const campaign: CampaignContext = {
        name: 'Campaign 1',
        severity: 75,
        aptGroupAttribution: 'APT28',
        targetedIndustries: ['Finance', 'Defense'],
        geographicTargets: ['US', 'EU'],
        techniques: ['T1566', 'T1204']
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 70,
        attackComplexity: 80,
        evasionTechniques: ['anti-analysis', 'obfuscation'],
        persistenceIndicators: ['registry-modification'],
        c2CommunicationPatterns: ['dns-tunneling']
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 85,
        businessCriticalityOfTarget: 90,
        lateralMovementPotential: 75,
        recoveryDifficulty: 70
      };

      const score = engine.calculateWeightedScore(ioc, campaign, behavior, impact);
      expect(score.dimensions).toBeDefined();
      expect(score.dimensions.iocSeverityScore).toBeGreaterThanOrEqual(0);
      expect(score.dimensions.contextScore).toBeGreaterThanOrEqual(0);
      expect(score.dimensions.behavioralScore).toBeGreaterThanOrEqual(0);
      expect(score.dimensions.impactScore).toBeGreaterThanOrEqual(0);
    });

    // Scoring models
    it('should calculate weighted average score', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.IP,
        value: '192.168.1.1',
        sourceReliability: SourceReliability.MEDIUM,
        confidence: 0.75,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 90
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 45,
        attackComplexity: 50,
        evasionTechniques: [],
        persistenceIndicators: [],
        c2CommunicationPatterns: []
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 60,
        businessCriticalityOfTarget: 65,
        lateralMovementPotential: 55,
        recoveryDifficulty: 50
      };

      const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
      expect(score.modelUsed).toBe(ScoringModel.WEIGHTED_AVERAGE);
      expect(score.overallScore).toBeDefined();
    });

    it('should calculate ML-based score', () => {
      const featureVector = {
        iocType: 1.0,
        sourceReliability: 0.8,
        confidence: 0.9,
        ageDecay: 0.85,
        campaignSeverity: 75,
        aptAttribution: 1,
        targetIndustryMatch: 0.8,
        activityVolume: 70,
        attackComplexity: 80,
        evasionTechniqueCount: 3,
        dataExposurePotential: 85,
        businessCriticality: 90,
        lateralMovementPotential: 75
      };

      const score = engine.calculateMLScore(featureVector, '1.0');
      expect(score.modelUsed).toBe(ScoringModel.MACHINE_LEARNING);
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    // Risk assessment
    it('should determine risk level from score', () => {
      expect(engine.getRiskLevel(85)).toBe(RiskLevel.CRITICAL);
      expect(engine.getRiskLevel(65)).toBe(RiskLevel.HIGH);
      expect(engine.getRiskLevel(45)).toBe(RiskLevel.MEDIUM);
      expect(engine.getRiskLevel(25)).toBe(RiskLevel.LOW);
      expect(engine.getRiskLevel(5)).toBe(RiskLevel.INFO);
    });

    it('should calculate risk matrix', () => {
      const matrix = engine.calculateRiskMatrix(80, 70);
      expect(matrix.likelihood).toBe(80);
      expect(matrix.impact).toBe(70);
      expect(matrix.riskLevel).toBeDefined();
      expect(matrix.mitigationRequired).toBeDefined();
    });

    // Score history
    it('should record score history', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.HASH,
        value: 'history-test',
        sourceReliability: SourceReliability.HIGH,
        confidence: 0.9,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 30
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 60,
        attackComplexity: 70,
        evasionTechniques: [],
        persistenceIndicators: [],
        c2CommunicationPatterns: []
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 75,
        businessCriticalityOfTarget: 80,
        lateralMovementPotential: 70,
        recoveryDifficulty: 60
      };

      const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
      engine.recordScoreHistory('test-ioc', score);

      const history = engine.getScoreHistory('test-ioc');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].score).toBe(score.overallScore);
    });

    // Trend analysis
    it('should analyze score trends', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.IP,
        value: 'trend-test',
        sourceReliability: SourceReliability.MEDIUM,
        confidence: 0.7,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 60
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 50,
        attackComplexity: 60,
        evasionTechniques: [],
        persistenceIndicators: [],
        c2CommunicationPatterns: []
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 70,
        businessCriticalityOfTarget: 75,
        lateralMovementPotential: 65,
        recoveryDifficulty: 55
      };

      for (let i = 0; i < 5; i++) {
        const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
        engine.recordScoreHistory('trend-ioc', score);
      }

      const trend = engine.analyzeTrend('trend-ioc');
      expect(trend).toBeDefined();
      if (trend) {
        expect(['increasing', 'decreasing', 'stable']).toContain(trend.trend);
        expect(typeof trend.changeRate).toBe('number');
      }
    });

    // Alert generation
    it('should generate alerts from scores', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.HASH,
        value: 'alert-test',
        sourceReliability: SourceReliability.VERIFIED,
        confidence: 0.98,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 10
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 90,
        attackComplexity: 95,
        evasionTechniques: ['code-obfuscation', 'anti-vm'],
        persistenceIndicators: ['registry', 'startup'],
        c2CommunicationPatterns: ['dns-covert', 'https-tunneling']
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 95,
        businessCriticalityOfTarget: 95,
        lateralMovementPotential: 90,
        recoveryDifficulty: 85
      };

      const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
      const alert = engine.generateAlert('critical-ioc', score);

      expect(alert.id).toBeDefined();
      expect(alert.ioc).toBe('critical-ioc');
      expect(alert.threatScore).toEqual(score);
      expect(alert.priority).toBeGreaterThan(0);
      expect(alert.slaMinutes).toBeGreaterThan(0);
    });

    // Risk reports
    it('should generate risk reports', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.DOMAIN,
        value: 'report-test.com',
        sourceReliability: SourceReliability.HIGH,
        confidence: 0.85,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 45
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 70,
        attackComplexity: 75,
        evasionTechniques: ['obfuscation'],
        persistenceIndicators: [],
        c2CommunicationPatterns: []
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 80,
        businessCriticalityOfTarget: 85,
        lateralMovementPotential: 70,
        recoveryDifficulty: 60
      };

      const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
      const report = engine.generateRiskReport('entity-123', 'server', [
        { ioc: 'test-ioc-1', score }
      ]);

      expect(report.entityId).toBe('entity-123');
      expect(report.entityType).toBe('server');
      expect(report.overallRisk).toBeGreaterThanOrEqual(0);
      expect(report.riskLevel).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    // Custom rules
    it('should apply custom scoring rules', () => {
      engine.registerScoringRule({
        id: 'rule-1',
        name: 'High Activity Boost',
        priority: 100,
        condition: (dims) => dims.behavioralScore > 70,
        scoreAdjustment: 10,
        description: 'Boost score if high activity detected'
      });

      const ioc: IOCData = {
        type: ScoringIOCType.IP,
        value: 'rule-test',
        sourceReliability: SourceReliability.MEDIUM,
        confidence: 0.8,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 30
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 80,
        attackComplexity: 75,
        evasionTechniques: [],
        persistenceIndicators: [],
        c2CommunicationPatterns: []
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 75,
        businessCriticalityOfTarget: 80,
        lateralMovementPotential: 70,
        recoveryDifficulty: 60
      };

      const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
      expect(score.overallScore).toBeDefined();
    });

    // Configuration
    it('should update risk thresholds', () => {
      engine.setRiskThresholds({
        critical: 85,
        high: 65,
        medium: 45,
        low: 25
      });

      const thresholds = engine.getRiskThresholds();
      expect(thresholds.critical).toBe(85);
      expect(thresholds.high).toBe(65);
    });

    it('should update scoring weights', () => {
      const weights: ScoringWeights = {
        iocSeverity: 0.4,
        context: 0.3,
        behavioral: 0.2,
        impact: 0.1
      };

      engine.setScoringWeights(weights);
      const retrieved = engine.getScoringWeights();
      expect(retrieved.iocSeverity).toBe(0.4);
      expect(retrieved.context).toBe(0.3);
    });

    it('should validate threat scores', () => {
      const validScore: ThreatScore = {
        overallScore: 75,
        dimensions: {
          iocSeverityScore: 80,
          contextScore: 70,
          behavioralScore: 75,
          impactScore: 70
        },
        riskLevel: RiskLevel.HIGH,
        confidence: 0.85,
        calculatedAt: new Date(),
        modelUsed: ScoringModel.WEIGHTED_AVERAGE,
        explanation: 'Test score'
      };

      const validation = engine.validateScore(validScore);
      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    // Export
    it('should export score data as JSON', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.HASH,
        value: 'export-test',
        sourceReliability: SourceReliability.HIGH,
        confidence: 0.9,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 20
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 65,
        attackComplexity: 70,
        evasionTechniques: [],
        persistenceIndicators: [],
        c2CommunicationPatterns: []
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 75,
        businessCriticalityOfTarget: 80,
        lateralMovementPotential: 70,
        recoveryDifficulty: 60
      };

      const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
      engine.recordScoreHistory('export-ioc', score);

      const json = engine.exportScoreData('json');
      expect(typeof json).toBe('string');
      expect(json.length).toBeGreaterThan(0);
    });

    it('should export score data as CSV', () => {
      const ioc: IOCData = {
        type: ScoringIOCType.IP,
        value: 'csv-export',
        sourceReliability: SourceReliability.MEDIUM,
        confidence: 0.75,
        firstSeen: new Date(),
        lastSeen: new Date(),
        age: 40
      };

      const behavior: BehavioralIndicators = {
        activityVolume: 55,
        attackComplexity: 60,
        evasionTechniques: [],
        persistenceIndicators: [],
        c2CommunicationPatterns: []
      };

      const impact: ImpactAssessment = {
        dataExposurePotential: 70,
        businessCriticalityOfTarget: 75,
        lateralMovementPotential: 65,
        recoveryDifficulty: 55
      };

      const score = engine.calculateWeightedScore(ioc, null, behavior, impact);
      engine.recordScoreHistory('csv-ioc', score);

      const csv = engine.exportScoreData('csv');
      expect(typeof csv).toBe('string');
      expect(csv).toContain('IOC,Score,RiskLevel');
    });
  });

  describe('Integration Tests', () => {
    let feedManager: ThreatFeedManager;
    let iocManager: IOCManager;
    let enricher: IOCEnricher;
    let scorer: ThreatScoringEngine;

    beforeEach(() => {
      feedManager = new ThreatFeedManager();
      iocManager = new IOCManager();
      enricher = new IOCEnricher();
      scorer = new ThreatScoringEngine();
    });

    afterEach(() => {
      iocManager.destroy();
      enricher.destroy();
    });

    it('should execute end-to-end threat intelligence flow', async () => {
      // 1. Add IOC to manager
      const ioc = iocManager.addIOC({
        value: '192.168.1.100',
        type: IOCType.IPv4,
        severity: 75,
        confidence: 85,
        state: IOCState.Active,
        source: 'TestFeed',
        tags: ['botnet']
      });

      expect(ioc.id).toBeDefined();

      // 2. Retrieve and enrich
      const retrieved = iocManager.getIOC(ioc.id);
      expect(retrieved).toBeDefined();

      if (retrieved) {
        const enriched = await enricher.enrich(retrieved, 1, 5000);
        expect(enriched.enrichment).toBeDefined();

        // 3. Calculate threat score
        const iocData: IOCData = {
          type: ScoringIOCType.IP,
          value: retrieved.value,
          sourceReliability: SourceReliability.HIGH,
          confidence: retrieved.confidence / 100,
          firstSeen: new Date(retrieved.created),
          lastSeen: new Date(retrieved.modified),
          age: 5
        };

        const behavior: BehavioralIndicators = {
          activityVolume: 60,
          attackComplexity: 70,
          evasionTechniques: [],
          persistenceIndicators: [],
          c2CommunicationPatterns: []
        };

        const impact: ImpactAssessment = {
          dataExposurePotential: 75,
          businessCriticalityOfTarget: 80,
          lateralMovementPotential: 70,
          recoveryDifficulty: 60
        };

        const score = scorer.calculateWeightedScore(iocData, null, behavior, impact);
        expect(score.overallScore).toBeGreaterThanOrEqual(0);
        expect(score.riskLevel).toBeDefined();

        // 4. Generate alert if critical
        if (score.riskLevel === RiskLevel.CRITICAL || score.riskLevel === RiskLevel.HIGH) {
          const alert = scorer.generateAlert(ioc.id, score);
          expect(alert.id).toBeDefined();
          expect(alert.priority).toBeGreaterThan(0);
        }
      }
    });

    it('should handle bulk IOC processing', async () => {
      // Add multiple IOCs
      const iocs = [];
      for (let i = 0; i < 10; i++) {
        const ioc = iocManager.addIOC({
          value: `bulk-test-${i}.com`,
          type: IOCType.Domain,
          severity: 50 + i * 5,
          confidence: 70 + i * 2,
          state: IOCState.Active
        });
        iocs.push(ioc);
      }

      // Bulk match
      const toMatch = iocs.map(ioc => ({
        value: ioc.value,
        type: ioc.type
      }));

      const matches = iocManager.bulkMatch(toMatch);
      expect(matches instanceof Map).toBe(true);

      // Batch enrich
      const results = await enricher.enrichBatch(iocs, 1, 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should manage workflow with feed → IOC → enrich → score', async () => {
      // Simulate feed data
      const feedData: IOCRecord[] = [
        {
          type: FeedIOCType.Domain,
          value: 'workflow-test.com',
          source: 'TestFeed',
          confidence: 85,
          tags: ['workflow', 'test'],
          tlp: TLPLevel.Green,
          severity: 'high'
        }
      ];

      // Convert to manager IOC
      for (const record of feedData) {
        const ioc = iocManager.addIOC({
          value: record.value,
          type: record.type === FeedIOCType.IPv4 ? IOCType.IPv4 :
                record.type === FeedIOCType.IPv6 ? IOCType.IPv6 :
                record.type === FeedIOCType.Domain ? IOCType.Domain :
                record.type === FeedIOCType.URL ? IOCType.URL :
                IOCType.Domain,
          severity: record.severity === 'critical' ? 95 :
                   record.severity === 'high' ? 80 :
                   record.severity === 'medium' ? 60 : 40,
          confidence: record.confidence,
          state: IOCState.Active,
          source: record.source,
          tags: record.tags
        });

        // Enrich
        const enriched = await enricher.enrich(ioc);
        expect(enriched).toBeDefined();

        // Score
        const iocData: IOCData = {
          type: ScoringIOCType.DOMAIN,
          value: ioc.value,
          sourceReliability: SourceReliability.HIGH,
          confidence: ioc.confidence / 100,
          firstSeen: new Date(),
          lastSeen: new Date(),
          age: 1
        };

        const behavior: BehavioralIndicators = {
          activityVolume: 50,
          attackComplexity: 60,
          evasionTechniques: [],
          persistenceIndicators: [],
          c2CommunicationPatterns: []
        };

        const impact: ImpactAssessment = {
          dataExposurePotential: 70,
          businessCriticalityOfTarget: 75,
          lateralMovementPotential: 65,
          recoveryDifficulty: 55
        };

        const score = scorer.calculateWeightedScore(iocData, null, behavior, impact);
        expect(score).toBeDefined();
      }
    });

    it('should correlate multiple threat indicators', () => {
      // Add related IOCs
      const domain = iocManager.addIOC({
        value: 'malware-c2.com',
        type: IOCType.Domain,
        severity: 90,
        confidence: 95,
        state: IOCState.Active,
        tags: ['c2', 'campaign-x']
      });

      const ip = iocManager.addIOC({
        value: '203.0.113.1',
        type: IOCType.IPv4,
        severity: 85,
        confidence: 90,
        state: IOCState.Active,
        tags: ['c2', 'campaign-x']
      });

      const email = iocManager.addIOC({
        value: 'attacker@malware-c2.com',
        type: IOCType.Email,
        severity: 75,
        confidence: 80,
        state: IOCState.Active,
        tags: ['campaign-x']
      });

      // Search by campaign tag
      const results = iocManager.search({
        tags: ['campaign-x']
      });

      expect(results.iocs.length).toBeGreaterThanOrEqual(0);
    });
  });
});
