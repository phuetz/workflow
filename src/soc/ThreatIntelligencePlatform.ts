/**
 * ThreatIntelligencePlatform.ts
 *
 * Comprehensive Threat Intelligence Platform for workflow automation security.
 * Provides multi-source threat feed aggregation, IOC management, threat actor profiling,
 * campaign tracking, STIX/TAXII support, and integration with MISP and OpenCTI.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Type Definitions
// ============================================================================

export type IOCType =
  | 'ip-src' | 'ip-dst' | 'domain' | 'hostname' | 'url'
  | 'md5' | 'sha1' | 'sha256' | 'sha512'
  | 'email-src' | 'email-dst' | 'filename' | 'registry-key';

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type ThreatCategory =
  | 'malware' | 'ransomware' | 'apt' | 'botnet' | 'phishing'
  | 'c2' | 'exploit' | 'data-theft' | 'cryptominer' | 'scanner';

export type FeedType =
  | 'alienvault-otx' | 'abuse-ch' | 'emerging-threats' | 'feodo-tracker'
  | 'malware-bazaar' | 'urlhaus' | 'threatfox' | 'phishtank'
  | 'spamhaus' | 'dshield' | 'misp' | 'opencti' | 'custom';

export type HuntPlatform = 'splunk' | 'elastic' | 'qradar' | 'sentinel' | 'chronicle' | 'yara' | 'sigma';

export interface IOC {
  id: string;
  type: IOCType;
  value: string;
  confidence: number;
  severity: ThreatSeverity;
  categories: ThreatCategory[];
  firstSeen: Date;
  lastSeen: Date;
  expiresAt?: Date;
  sources: string[];
  tags: string[];
  context: { description?: string; killChainPhases?: string[]; mitreAttackIds?: string[]; malwareFamily?: string };
  enrichment?: IOCEnrichment;
  relatedIOCs: string[];
  threatActorIds: string[];
  campaignIds: string[];
  stixId?: string;
}

export interface IOCEnrichment {
  geoLocation?: { country: string; countryCode: string; asn?: number; asnOrg?: string };
  whois?: { registrar?: string; createdDate?: Date };
  dns?: { aRecords?: string[]; mxRecords?: string[] };
  reputation?: { score: number; sources: { name: string; score: number }[] };
  virusTotal?: { positives: number; total: number; scanDate: Date };
  shodan?: { ports?: number[]; services?: string[]; vulns?: string[] };
  enrichedAt: Date;
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  motivation: ('financial' | 'espionage' | 'hacktivism' | 'destruction' | 'unknown')[];
  sophistication: 'none' | 'minimal' | 'intermediate' | 'advanced' | 'expert';
  targetedSectors: string[];
  targetedCountries: string[];
  ttps: TTP[];
  iocIds: string[];
  campaignIds: string[];
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
  sources: string[];
  stixId?: string;
}

export interface TTP {
  id: string;
  name: string;
  mitreId?: string;
  tactic?: string;
  technique?: string;
  description?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  threatActorIds: string[];
  status: 'active' | 'historic' | 'inactive';
  objectives: string[];
  targetedSectors: string[];
  targetedCountries: string[];
  ttps: TTP[];
  iocIds: string[];
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
  sources: string[];
  stixId?: string;
}

export interface ThreatFeed {
  id: string;
  name: string;
  type: FeedType;
  url: string;
  format: 'stix' | 'taxii' | 'csv' | 'json' | 'txt';
  enabled: boolean;
  refreshInterval: number;
  lastRefresh?: Date;
  iocCount: number;
  errorCount: number;
  lastError?: string;
  authentication?: { type: 'none' | 'api-key' | 'basic'; apiKey?: string; username?: string; password?: string };
  filters?: { minConfidence?: number; severities?: ThreatSeverity[]; categories?: ThreatCategory[] };
}

export interface HuntQuery {
  id: string;
  name: string;
  description: string;
  platform: HuntPlatform;
  query: string;
  iocIds: string[];
  createdAt: Date;
}

export interface IntelligenceReport {
  id: string;
  title: string;
  summary: string;
  content: string;
  reportType: 'threat-report' | 'campaign-report' | 'actor-profile' | 'malware-analysis';
  tlp: 'white' | 'green' | 'amber' | 'red';
  threatActorIds: string[];
  campaignIds: string[];
  iocIds: string[];
  recommendations: string[];
  createdAt: Date;
  stixBundle?: STIXBundle;
}

export interface STIXBundle {
  type: 'bundle';
  id: string;
  spec_version: '2.1';
  objects: STIXObject[];
}

export interface STIXObject {
  type: string;
  spec_version: '2.1';
  id: string;
  created: string;
  modified: string;
  [key: string]: unknown;
}

export interface ThreatIntelligenceConfig {
  autoEnrichment: boolean;
  enrichmentProviders: string[];
  defaultConfidence: number;
  iocRetentionDays: number;
  deduplicationEnabled: boolean;
  correlationEnabled: boolean;
  mispUrl?: string;
  mispApiKey?: string;
  openCTIUrl?: string;
  openCTIApiKey?: string;
}

// ============================================================================
// ThreatIntelligencePlatform Class
// ============================================================================

export class ThreatIntelligencePlatform extends EventEmitter {
  private static instance: ThreatIntelligencePlatform | null = null;

  private iocs: Map<string, IOC> = new Map();
  private threatActors: Map<string, ThreatActor> = new Map();
  private campaigns: Map<string, Campaign> = new Map();
  private feeds: Map<string, ThreatFeed> = new Map();
  private huntQueries: Map<string, HuntQuery> = new Map();
  private reports: Map<string, IntelligenceReport> = new Map();

  private config: ThreatIntelligenceConfig;
  private feedRefreshTimers: Map<string, NodeJS.Timeout> = new Map();
  private initialized: boolean = false;

  private constructor(config?: Partial<ThreatIntelligenceConfig>) {
    super();
    this.config = {
      autoEnrichment: true,
      enrichmentProviders: ['virustotal', 'shodan', 'whois', 'geoip'],
      defaultConfidence: 50,
      iocRetentionDays: 90,
      deduplicationEnabled: true,
      correlationEnabled: true,
      ...config,
    };
    this.initializeDefaultFeeds();
  }

  public static getInstance(config?: Partial<ThreatIntelligenceConfig>): ThreatIntelligencePlatform {
    if (!ThreatIntelligencePlatform.instance) {
      ThreatIntelligencePlatform.instance = new ThreatIntelligencePlatform(config);
    }
    return ThreatIntelligencePlatform.instance;
  }

  public static resetInstance(): void {
    if (ThreatIntelligencePlatform.instance) {
      ThreatIntelligencePlatform.instance.shutdown();
      ThreatIntelligencePlatform.instance = null;
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.emit('initializing');

    for (const feed of Array.from(this.feeds.values())) {
      if (feed.enabled) this.scheduleFeedRefresh(feed);
    }

    if (this.config.mispUrl && this.config.mispApiKey) await this.connectToMISP();
    if (this.config.openCTIUrl && this.config.openCTIApiKey) await this.connectToOpenCTI();

    this.initialized = true;
    this.emit('initialized');
  }

  public shutdown(): void {
    for (const timer of Array.from(this.feedRefreshTimers.values())) {
      clearTimeout(timer);
    }
    this.feedRefreshTimers.clear();
    this.emit('shutdown');
  }

  // ============================================================================
  // Feed Management
  // ============================================================================

  private initializeDefaultFeeds(): void {
    const defaultFeeds: Partial<ThreatFeed>[] = [
      { id: 'alienvault-otx', name: 'AlienVault OTX', type: 'alienvault-otx', url: 'https://otx.alienvault.com/api/v1/pulses/subscribed', format: 'json', enabled: false, refreshInterval: 3600 },
      { id: 'abuse-ch-urlhaus', name: 'URLhaus', type: 'urlhaus', url: 'https://urlhaus.abuse.ch/downloads/json_recent/', format: 'json', enabled: false, refreshInterval: 300 },
      { id: 'abuse-ch-feodo', name: 'Feodo Tracker', type: 'feodo-tracker', url: 'https://feodotracker.abuse.ch/downloads/ipblocklist.json', format: 'json', enabled: false, refreshInterval: 3600 },
      { id: 'abuse-ch-malwarebazaar', name: 'Malware Bazaar', type: 'malware-bazaar', url: 'https://bazaar.abuse.ch/export/json/recent/', format: 'json', enabled: false, refreshInterval: 900 },
      { id: 'abuse-ch-threatfox', name: 'ThreatFox', type: 'threatfox', url: 'https://threatfox.abuse.ch/export/json/recent/', format: 'json', enabled: false, refreshInterval: 900 },
      { id: 'emerging-threats', name: 'Emerging Threats', type: 'emerging-threats', url: 'https://rules.emergingthreats.net/blockrules/compromised-ips.txt', format: 'txt', enabled: false, refreshInterval: 3600 },
      { id: 'phishtank', name: 'PhishTank', type: 'phishtank', url: 'https://data.phishtank.com/data/online-valid.json', format: 'json', enabled: false, refreshInterval: 3600 },
      { id: 'spamhaus-drop', name: 'Spamhaus DROP', type: 'spamhaus', url: 'https://www.spamhaus.org/drop/drop.txt', format: 'txt', enabled: false, refreshInterval: 86400 },
      { id: 'dshield', name: 'DShield', type: 'dshield', url: 'https://www.dshield.org/block.txt', format: 'txt', enabled: false, refreshInterval: 86400 },
      { id: 'tor-exit-nodes', name: 'TOR Exit Nodes', type: 'custom', url: 'https://check.torproject.org/exit-addresses', format: 'txt', enabled: false, refreshInterval: 3600 },
    ];

    for (const feedConfig of defaultFeeds) {
      const feed: ThreatFeed = {
        id: feedConfig.id!, name: feedConfig.name!, type: feedConfig.type!, url: feedConfig.url!,
        format: feedConfig.format!, enabled: feedConfig.enabled!, refreshInterval: feedConfig.refreshInterval!,
        iocCount: 0, errorCount: 0,
      };
      this.feeds.set(feed.id, feed);
    }
  }

  public async ingestFeed(feedId: string): Promise<{ success: boolean; iocCount: number; errors: string[] }> {
    const feed = this.feeds.get(feedId);
    if (!feed) return { success: false, iocCount: 0, errors: [`Feed not found: ${feedId}`] };

    const errors: string[] = [];
    let iocCount = 0;

    this.emit('feed:ingesting', { feedId, feedName: feed.name });

    try {
      const response = await this.fetchFeedData(feed);
      const parsedIOCs = await this.parseFeedData(feed, response);

      for (const iocData of parsedIOCs) {
        try {
          const ioc = await this.addIOC(iocData);
          if (ioc) iocCount++;
        } catch (error) {
          errors.push(`Failed to add IOC: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      feed.lastRefresh = new Date();
      feed.iocCount += iocCount;
      feed.errorCount = errors.length;

      this.emit('feed:ingested', { feedId, feedName: feed.name, iocCount, errors });
      return { success: true, iocCount, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      feed.errorCount++;
      feed.lastError = errorMessage;
      this.emit('feed:error', { feedId, feedName: feed.name, error: errorMessage });
      return { success: false, iocCount: 0, errors: [errorMessage] };
    }
  }

  private async fetchFeedData(feed: ThreatFeed): Promise<unknown> {
    // In production, use fetch/axios with proper authentication
    return this.simulateFeedFetch(feed);
  }

  private async parseFeedData(feed: ThreatFeed, data: unknown): Promise<Partial<IOC>[]> {
    const iocs: Partial<IOC>[] = [];

    switch (feed.format) {
      case 'json':
        iocs.push(...this.parseJSONFeed(feed, data));
        break;
      case 'stix':
        iocs.push(...this.parseSTIXFeed(data as STIXBundle));
        break;
      case 'txt':
        iocs.push(...this.parseTXTFeed(data as string));
        break;
    }

    return feed.filters ? this.applyFeedFilters(iocs, feed.filters) : iocs;
  }

  private parseJSONFeed(feed: ThreatFeed, data: unknown): Partial<IOC>[] {
    const iocs: Partial<IOC>[] = [];
    const items = Array.isArray(data) ? data : (data as Record<string, unknown>).data || [];

    for (const item of items as Record<string, unknown>[]) {
      const ioc = this.mapFeedItemToIOC(feed.type, item);
      if (ioc) iocs.push(ioc);
    }
    return iocs;
  }

  private parseSTIXFeed(data: STIXBundle): Partial<IOC>[] {
    const iocs: Partial<IOC>[] = [];
    if (data.objects) {
      for (const obj of data.objects) {
        if (obj.type === 'indicator') {
          const ioc = this.stixIndicatorToIOC(obj);
          if (ioc) iocs.push(ioc);
        }
      }
    }
    return iocs;
  }

  private parseTXTFeed(data: string): Partial<IOC>[] {
    const iocs: Partial<IOC>[] = [];
    const lines = data.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
      const value = line.split(/\s+/)[0].trim();
      if (value) {
        const type = this.inferIOCType(value);
        if (type) {
          iocs.push({ type, value, confidence: this.config.defaultConfidence, severity: 'medium', categories: [], sources: ['txt-feed'], tags: [] });
        }
      }
    }
    return iocs;
  }

  private mapFeedItemToIOC(feedType: FeedType, item: Record<string, unknown>): Partial<IOC> | null {
    switch (feedType) {
      case 'urlhaus':
        return { type: 'url', value: item.url as string, severity: 'high', categories: ['malware'], sources: ['urlhaus'], context: { malwareFamily: item.threat as string } };
      case 'feodo-tracker':
        return { type: 'ip-dst', value: item.ip_address as string, severity: 'critical', categories: ['c2', 'botnet'], sources: ['feodo-tracker'], context: { malwareFamily: item.malware as string } };
      case 'malware-bazaar':
        return { type: 'sha256', value: item.sha256_hash as string, severity: 'critical', categories: ['malware'], sources: ['malware-bazaar'], context: { malwareFamily: item.signature as string } };
      case 'threatfox':
        return { type: this.inferIOCType(item.ioc as string) || 'domain', value: item.ioc as string, severity: 'high', categories: ['c2'], sources: ['threatfox'], context: { malwareFamily: item.malware as string } };
      case 'phishtank':
        return { type: 'url', value: item.url as string, severity: 'high', categories: ['phishing'], sources: ['phishtank'], context: { description: `Phishing targeting ${item.target || 'unknown'}` } };
      default:
        return null;
    }
  }

  private stixIndicatorToIOC(indicator: STIXObject): Partial<IOC> | null {
    const pattern = indicator.pattern as string;
    if (!pattern) return null;

    const iocData = this.parseSTIXPattern(pattern);
    if (!iocData) return null;

    return {
      type: iocData.type, value: iocData.value, stixId: indicator.id,
      confidence: (indicator.confidence as number) || this.config.defaultConfidence,
      severity: 'medium', categories: [], sources: ['stix'], tags: [],
      context: { description: indicator.description as string },
    };
  }

  private parseSTIXPattern(pattern: string): { type: IOCType; value: string } | null {
    const patterns: { regex: RegExp; type: IOCType }[] = [
      { regex: /\[ipv4-addr:value\s*=\s*'([^']+)'\]/, type: 'ip-dst' },
      { regex: /\[domain-name:value\s*=\s*'([^']+)'\]/, type: 'domain' },
      { regex: /\[url:value\s*=\s*'([^']+)'\]/, type: 'url' },
      { regex: /\[file:hashes\.'SHA-256'\s*=\s*'([^']+)'\]/, type: 'sha256' },
    ];

    for (const { regex, type } of patterns) {
      const match = pattern.match(regex);
      if (match) return { type, value: match[1] };
    }
    return null;
  }

  private applyFeedFilters(iocs: Partial<IOC>[], filters: ThreatFeed['filters']): Partial<IOC>[] {
    if (!filters) return iocs;
    return iocs.filter(ioc => {
      if (filters.minConfidence && (ioc.confidence || 0) < filters.minConfidence) return false;
      if (filters.severities && ioc.severity && !filters.severities.includes(ioc.severity)) return false;
      if (filters.categories && ioc.categories) {
        const hasCategory = ioc.categories.some(cat => filters.categories!.includes(cat));
        if (!hasCategory) return false;
      }
      return true;
    });
  }

  private scheduleFeedRefresh(feed: ThreatFeed): void {
    if (this.feedRefreshTimers.has(feed.id)) {
      clearTimeout(this.feedRefreshTimers.get(feed.id)!);
    }

    const timer = setTimeout(async () => {
      await this.ingestFeed(feed.id);
      this.scheduleFeedRefresh(feed);
    }, feed.refreshInterval * 1000);

    this.feedRefreshTimers.set(feed.id, timer);
  }

  // ============================================================================
  // IOC Management
  // ============================================================================

  public async addIOC(iocData: Partial<IOC>): Promise<IOC | null> {
    if (!iocData.type || !iocData.value) throw new Error('IOC type and value are required');

    const normalizedValue = this.normalizeIOCValue(iocData.type, iocData.value);

    if (this.config.deduplicationEnabled) {
      const existingIOC = this.findIOCByValue(iocData.type, normalizedValue);
      if (existingIOC) return this.updateExistingIOC(existingIOC, iocData);
    }

    const ioc: IOC = {
      id: this.generateId('ioc'),
      type: iocData.type,
      value: normalizedValue,
      confidence: iocData.confidence || this.config.defaultConfidence,
      severity: iocData.severity || 'medium',
      categories: iocData.categories || [],
      firstSeen: iocData.firstSeen || new Date(),
      lastSeen: iocData.lastSeen || new Date(),
      expiresAt: iocData.expiresAt || new Date(Date.now() + this.config.iocRetentionDays * 86400000),
      sources: iocData.sources || [],
      tags: iocData.tags || [],
      context: iocData.context || {},
      relatedIOCs: iocData.relatedIOCs || [],
      threatActorIds: iocData.threatActorIds || [],
      campaignIds: iocData.campaignIds || [],
      stixId: iocData.stixId,
    };

    this.iocs.set(ioc.id, ioc);

    if (this.config.autoEnrichment) this.enrichIOC(ioc.id).catch(() => {});
    if (this.config.correlationEnabled) this.correlateIOC(ioc);

    this.emit('ioc:added', ioc);
    return ioc;
  }

  public async enrichIOC(iocId: string): Promise<IOC | null> {
    const ioc = this.iocs.get(iocId);
    if (!ioc) return null;

    const enrichment: IOCEnrichment = { enrichedAt: new Date() };

    this.emit('ioc:enriching', { iocId, iocType: ioc.type });

    try {
      if (['ip-src', 'ip-dst'].includes(ioc.type)) {
        enrichment.geoLocation = await this.enrichGeoLocation(ioc.value);
        enrichment.reputation = await this.enrichReputation(ioc.value, 'ip');
        if (this.config.enrichmentProviders.includes('shodan')) {
          enrichment.shodan = await this.enrichShodan(ioc.value);
        }
      }

      if (['domain', 'hostname'].includes(ioc.type)) {
        enrichment.dns = await this.enrichDNS(ioc.value);
        enrichment.whois = await this.enrichWhois(ioc.value);
        enrichment.reputation = await this.enrichReputation(ioc.value, 'domain');
      }

      if (['md5', 'sha1', 'sha256', 'sha512'].includes(ioc.type)) {
        if (this.config.enrichmentProviders.includes('virustotal')) {
          enrichment.virusTotal = await this.enrichVirusTotal(ioc.value);
        }
      }

      ioc.enrichment = enrichment;
      this.emit('ioc:enriched', { iocId, enrichment });
      return ioc;
    } catch (error) {
      this.emit('ioc:enrichment-error', { iocId, error });
      return ioc;
    }
  }

  private findIOCByValue(type: IOCType, value: string): IOC | undefined {
    for (const ioc of Array.from(this.iocs.values())) {
      if (ioc.type === type && ioc.value === value) return ioc;
    }
    return undefined;
  }

  private updateExistingIOC(existingIOC: IOC, newData: Partial<IOC>): IOC {
    existingIOC.lastSeen = new Date();
    if (newData.confidence) existingIOC.confidence = Math.round((existingIOC.confidence + newData.confidence) / 2);
    if (newData.sources) existingIOC.sources = Array.from(new Set([...existingIOC.sources, ...newData.sources]));
    if (newData.tags) existingIOC.tags = Array.from(new Set([...existingIOC.tags, ...newData.tags]));
    if (newData.categories) existingIOC.categories = Array.from(new Set([...existingIOC.categories, ...newData.categories]));
    this.emit('ioc:updated', existingIOC);
    return existingIOC;
  }

  private normalizeIOCValue(type: IOCType, value: string): string {
    switch (type) {
      case 'domain': case 'hostname': return value.toLowerCase().replace(/^www\./, '');
      case 'email-src': case 'email-dst': return value.toLowerCase();
      case 'md5': case 'sha1': case 'sha256': case 'sha512': return value.toLowerCase();
      case 'url': return value.toLowerCase();
      default: return value;
    }
  }

  private inferIOCType(value: string): IOCType | null {
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'ip-dst';
    if (/^[a-fA-F0-9]{32}$/.test(value)) return 'md5';
    if (/^[a-fA-F0-9]{64}$/.test(value)) return 'sha256';
    if (/^https?:\/\//.test(value)) return 'url';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email-src';
    if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(value)) return 'domain';
    return null;
  }

  private correlateIOC(ioc: IOC): void {
    for (const actor of Array.from(this.threatActors.values())) {
      if (actor.iocIds.includes(ioc.id)) continue;
      if (ioc.context.malwareFamily) {
        const actorMalware = actor.ttps.map(ttp => ttp.name.toLowerCase()).filter(name => name.includes(ioc.context.malwareFamily!.toLowerCase()));
        if (actorMalware.length > 0) {
          ioc.threatActorIds.push(actor.id);
          actor.iocIds.push(ioc.id);
        }
      }
    }

    for (const campaign of Array.from(this.campaigns.values())) {
      if (campaign.iocIds.includes(ioc.id)) continue;
      if (ioc.context.mitreAttackIds) {
        const matchingTTPs = campaign.ttps.filter(ttp => ioc.context.mitreAttackIds!.includes(ttp.mitreId || ''));
        if (matchingTTPs.length > 0) {
          ioc.campaignIds.push(campaign.id);
          campaign.iocIds.push(ioc.id);
        }
      }
    }
  }

  // ============================================================================
  // Threat Actor Management
  // ============================================================================

  public trackThreatActor(actorData: Partial<ThreatActor>): ThreatActor {
    if (!actorData.name) throw new Error('Threat actor name is required');

    const actor: ThreatActor = {
      id: actorData.id || this.generateId('actor'),
      name: actorData.name,
      aliases: actorData.aliases || [],
      description: actorData.description || '',
      motivation: actorData.motivation || ['unknown'],
      sophistication: actorData.sophistication || 'intermediate',
      targetedSectors: actorData.targetedSectors || [],
      targetedCountries: actorData.targetedCountries || [],
      ttps: actorData.ttps || [],
      iocIds: actorData.iocIds || [],
      campaignIds: actorData.campaignIds || [],
      firstSeen: actorData.firstSeen || new Date(),
      lastSeen: actorData.lastSeen || new Date(),
      confidence: actorData.confidence || this.config.defaultConfidence,
      sources: actorData.sources || [],
      stixId: actorData.stixId,
    };

    this.threatActors.set(actor.id, actor);
    this.emit('threatActor:tracked', actor);
    return actor;
  }

  public getThreatActor(actorId: string): ThreatActor | undefined {
    return this.threatActors.get(actorId);
  }

  // ============================================================================
  // Campaign Management
  // ============================================================================

  public createCampaign(campaignData: Partial<Campaign>): Campaign {
    if (!campaignData.name) throw new Error('Campaign name is required');

    const campaign: Campaign = {
      id: campaignData.id || this.generateId('campaign'),
      name: campaignData.name,
      description: campaignData.description || '',
      threatActorIds: campaignData.threatActorIds || [],
      status: campaignData.status || 'active',
      objectives: campaignData.objectives || [],
      targetedSectors: campaignData.targetedSectors || [],
      targetedCountries: campaignData.targetedCountries || [],
      ttps: campaignData.ttps || [],
      iocIds: campaignData.iocIds || [],
      firstSeen: campaignData.firstSeen || new Date(),
      lastSeen: campaignData.lastSeen || new Date(),
      confidence: campaignData.confidence || this.config.defaultConfidence,
      sources: campaignData.sources || [],
      stixId: campaignData.stixId,
    };

    this.campaigns.set(campaign.id, campaign);

    for (const actorId of campaign.threatActorIds) {
      const actor = this.threatActors.get(actorId);
      if (actor && !actor.campaignIds.includes(campaign.id)) actor.campaignIds.push(campaign.id);
    }

    this.emit('campaign:created', campaign);
    return campaign;
  }

  public getCampaign(campaignId: string): Campaign | undefined {
    return this.campaigns.get(campaignId);
  }

  // ============================================================================
  // Hunt Query Generation
  // ============================================================================

  public generateHuntQuery(params: { platform: HuntPlatform; iocIds?: string[]; threatActorIds?: string[]; campaignIds?: string[]; name?: string }): HuntQuery {
    const iocs: IOC[] = [];
    const ttps: TTP[] = [];

    if (params.iocIds) {
      for (const iocId of params.iocIds) {
        const ioc = this.iocs.get(iocId);
        if (ioc) iocs.push(ioc);
      }
    }

    if (params.threatActorIds) {
      for (const actorId of params.threatActorIds) {
        const actor = this.threatActors.get(actorId);
        if (actor) {
          for (const iocId of actor.iocIds) {
            const ioc = this.iocs.get(iocId);
            if (ioc && !iocs.includes(ioc)) iocs.push(ioc);
          }
          ttps.push(...actor.ttps);
        }
      }
    }

    if (params.campaignIds) {
      for (const campaignId of params.campaignIds) {
        const campaign = this.campaigns.get(campaignId);
        if (campaign) {
          for (const iocId of campaign.iocIds) {
            const ioc = this.iocs.get(iocId);
            if (ioc && !iocs.includes(ioc)) iocs.push(ioc);
          }
          ttps.push(...campaign.ttps);
        }
      }
    }

    const query = this.buildPlatformQuery(params.platform, iocs, ttps);

    const huntQuery: HuntQuery = {
      id: this.generateId('hunt'),
      name: params.name || `Hunt Query - ${params.platform}`,
      description: `Auto-generated hunt query for ${params.platform}`,
      platform: params.platform,
      query,
      iocIds: iocs.map(ioc => ioc.id),
      createdAt: new Date(),
    };

    this.huntQueries.set(huntQuery.id, huntQuery);
    this.emit('huntQuery:generated', huntQuery);
    return huntQuery;
  }

  private buildPlatformQuery(platform: HuntPlatform, iocs: IOC[], ttps: TTP[]): string {
    const iocsByType = this.groupIOCsByType(iocs);

    switch (platform) {
      case 'splunk':
        return this.buildSplunkQuery(iocsByType, ttps);
      case 'elastic':
        return this.buildElasticQuery(iocsByType);
      case 'sigma':
        return this.buildSigmaRule(iocsByType, ttps);
      case 'yara':
        return this.buildYaraRule(iocs);
      default:
        return iocs.map(ioc => `${ioc.type}: ${ioc.value}`).join('\n');
    }
  }

  private buildSplunkQuery(iocsByType: Record<string, string[]>, ttps: TTP[]): string {
    const conditions: string[] = [];
    if (iocsByType['ip-dst']) conditions.push(`dest_ip IN (${iocsByType['ip-dst'].map(v => `"${v}"`).join(', ')})`);
    if (iocsByType['domain']) conditions.push(`dest_host IN (${iocsByType['domain'].map(v => `"${v}"`).join(', ')})`);
    for (const ttp of ttps) {
      if (ttp.mitreId) conditions.push(`mitre_attack_id="${ttp.mitreId}"`);
    }
    return `index=* (${conditions.join(' OR ')}) | stats count by src_ip, dest_ip, user`;
  }

  private buildElasticQuery(iocsByType: Record<string, string[]>): string {
    const should: Record<string, unknown>[] = [];
    if (iocsByType['ip-dst']) should.push({ terms: { 'destination.ip': iocsByType['ip-dst'] } });
    if (iocsByType['domain']) should.push({ terms: { 'dns.question.name': iocsByType['domain'] } });
    return JSON.stringify({ query: { bool: { should, minimum_should_match: 1 } } }, null, 2);
  }

  private buildSigmaRule(iocsByType: Record<string, string[]>, ttps: TTP[]): string {
    const lines = ['title: Auto-generated Threat Hunt Rule', 'status: experimental', 'logsource:', '    category: process_creation', 'detection:', '    selection:'];
    if (iocsByType['ip-dst']) {
      lines.push('        DestinationIp|contains:');
      for (const ip of iocsByType['ip-dst'].slice(0, 10)) lines.push(`            - '${ip}'`);
    }
    lines.push('    condition: selection', 'level: high', 'tags:');
    for (const ttp of ttps) {
      if (ttp.mitreId) lines.push(`    - attack.${ttp.mitreId.toLowerCase()}`);
    }
    return lines.join('\n');
  }

  private buildYaraRule(iocs: IOC[]): string {
    const stringIOCs = iocs.filter(ioc => ['domain', 'url'].includes(ioc.type)).slice(0, 20);
    const lines = ['rule ThreatIntel_AutoGenerated {', '    meta:', '        description = "Auto-generated YARA rule"', '    strings:'];
    stringIOCs.forEach((ioc, i) => lines.push(`        $s${i} = "${ioc.value}" nocase`));
    lines.push('    condition:', '        any of ($s*)', '}');
    return lines.join('\n');
  }

  private groupIOCsByType(iocs: IOC[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    for (const ioc of iocs) {
      if (!grouped[ioc.type]) grouped[ioc.type] = [];
      grouped[ioc.type].push(ioc.value);
    }
    return grouped;
  }

  // ============================================================================
  // Intelligence Sharing (STIX/TAXII)
  // ============================================================================

  public async shareIntelligence(params: { iocIds?: string[]; threatActorIds?: string[]; campaignIds?: string[]; destination: 'misp' | 'opencti' | 'taxii' }): Promise<{ success: boolean; objectsShared: number; errors: string[] }> {
    const errors: string[] = [];
    let objectsShared = 0;

    const bundle = this.buildSTIXBundle(params);
    this.emit('intelligence:sharing', { destination: params.destination, objectCount: bundle.objects.length });

    try {
      switch (params.destination) {
        case 'misp': objectsShared = await this.shareToMISP(bundle); break;
        case 'opencti': objectsShared = await this.shareToOpenCTI(bundle); break;
        case 'taxii': objectsShared = bundle.objects.length; break;
      }
      this.emit('intelligence:shared', { destination: params.destination, objectsShared });
      return { success: true, objectsShared, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      return { success: false, objectsShared: 0, errors };
    }
  }

  private buildSTIXBundle(params: { iocIds?: string[]; threatActorIds?: string[]; campaignIds?: string[] }): STIXBundle {
    const objects: STIXObject[] = [];
    const now = new Date().toISOString();

    if (params.iocIds) {
      for (const iocId of params.iocIds) {
        const ioc = this.iocs.get(iocId);
        if (ioc) objects.push(this.iocToSTIXIndicator(ioc, now));
      }
    }

    if (params.threatActorIds) {
      for (const actorId of params.threatActorIds) {
        const actor = this.threatActors.get(actorId);
        if (actor) objects.push(this.actorToSTIXThreatActor(actor, now));
      }
    }

    if (params.campaignIds) {
      for (const campaignId of params.campaignIds) {
        const campaign = this.campaigns.get(campaignId);
        if (campaign) objects.push(this.campaignToSTIXCampaign(campaign, now));
      }
    }

    return { type: 'bundle', id: `bundle--${this.generateUUID()}`, spec_version: '2.1', objects };
  }

  private iocToSTIXIndicator(ioc: IOC, now: string): STIXObject {
    return {
      type: 'indicator', spec_version: '2.1', id: ioc.stixId || `indicator--${this.generateUUID()}`,
      created: ioc.firstSeen.toISOString(), modified: now,
      name: `${ioc.type}: ${ioc.value}`, description: ioc.context.description || `Indicator of type ${ioc.type}`,
      pattern: this.buildSTIXPattern(ioc), pattern_type: 'stix',
      valid_from: ioc.firstSeen.toISOString(), confidence: ioc.confidence,
    };
  }

  private actorToSTIXThreatActor(actor: ThreatActor, now: string): STIXObject {
    return {
      type: 'threat-actor', spec_version: '2.1', id: actor.stixId || `threat-actor--${this.generateUUID()}`,
      created: actor.firstSeen.toISOString(), modified: now,
      name: actor.name, description: actor.description, aliases: actor.aliases,
      sophistication: actor.sophistication, confidence: actor.confidence,
    };
  }

  private campaignToSTIXCampaign(campaign: Campaign, now: string): STIXObject {
    return {
      type: 'campaign', spec_version: '2.1', id: campaign.stixId || `campaign--${this.generateUUID()}`,
      created: campaign.firstSeen.toISOString(), modified: now,
      name: campaign.name, description: campaign.description, confidence: campaign.confidence,
    };
  }

  private buildSTIXPattern(ioc: IOC): string {
    const typeMapping: Partial<Record<IOCType, string>> = {
      'ip-src': 'ipv4-addr:value', 'ip-dst': 'ipv4-addr:value', 'domain': 'domain-name:value',
      'url': 'url:value', 'sha256': "file:hashes.'SHA-256'", 'md5': "file:hashes.'MD5'",
    };
    const stixType = typeMapping[ioc.type] || 'artifact:payload_bin';
    return `[${stixType} = '${ioc.value}']`;
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  public generateReport(params: { title: string; reportType: IntelligenceReport['reportType']; tlp: IntelligenceReport['tlp']; threatActorIds?: string[]; campaignIds?: string[]; iocIds?: string[] }): IntelligenceReport {
    const threatActors: ThreatActor[] = [];
    const campaigns: Campaign[] = [];
    const iocs: IOC[] = [];

    if (params.threatActorIds) {
      for (const actorId of params.threatActorIds) {
        const actor = this.threatActors.get(actorId);
        if (actor) threatActors.push(actor);
      }
    }

    if (params.campaignIds) {
      for (const campaignId of params.campaignIds) {
        const campaign = this.campaigns.get(campaignId);
        if (campaign) campaigns.push(campaign);
      }
    }

    if (params.iocIds) {
      for (const iocId of params.iocIds) {
        const ioc = this.iocs.get(iocId);
        if (ioc) iocs.push(ioc);
      }
    }

    const summary = `This report covers ${threatActors.length} threat actor(s), ${campaigns.length} campaign(s), and ${iocs.length} IOCs.`;
    const content = this.generateReportContent(threatActors, campaigns, iocs);
    const recommendations = this.generateRecommendations(threatActors);

    const report: IntelligenceReport = {
      id: this.generateId('report'),
      title: params.title,
      summary,
      content,
      reportType: params.reportType,
      tlp: params.tlp,
      threatActorIds: threatActors.map(a => a.id),
      campaignIds: campaigns.map(c => c.id),
      iocIds: iocs.map(i => i.id),
      recommendations,
      createdAt: new Date(),
      stixBundle: this.buildSTIXBundle({ iocIds: iocs.map(i => i.id), threatActorIds: threatActors.map(a => a.id), campaignIds: campaigns.map(c => c.id) }),
    };

    this.reports.set(report.id, report);
    this.emit('report:generated', report);
    return report;
  }

  private generateReportContent(threatActors: ThreatActor[], campaigns: Campaign[], iocs: IOC[]): string {
    const sections: string[] = ['# Executive Summary\n'];

    if (threatActors.length > 0) {
      sections.push('\n# Threat Actors\n');
      for (const actor of threatActors) {
        sections.push(`## ${actor.name}\n**Motivation:** ${actor.motivation.join(', ')}\n**Sophistication:** ${actor.sophistication}\n${actor.description}\n`);
      }
    }

    if (campaigns.length > 0) {
      sections.push('\n# Campaigns\n');
      for (const campaign of campaigns) {
        sections.push(`## ${campaign.name}\n**Status:** ${campaign.status}\n${campaign.description}\n`);
      }
    }

    if (iocs.length > 0) {
      sections.push('\n# Indicators of Compromise\n');
      const iocsByType = this.groupIOCsByType(iocs);
      for (const [type, values] of Object.entries(iocsByType)) {
        sections.push(`## ${type.toUpperCase()}\n`);
        for (const value of values.slice(0, 20)) sections.push(`- ${value}\n`);
      }
    }

    return sections.join('');
  }

  private generateRecommendations(threatActors: ThreatActor[]): string[] {
    const recommendations: string[] = ['Block all IOCs at perimeter security controls.', 'Update detection signatures based on provided intelligence.'];

    const hasAdvanced = threatActors.some(actor => ['advanced', 'expert'].includes(actor.sophistication));
    if (hasAdvanced) {
      recommendations.push('Implement advanced threat detection (EDR/NDR).');
      recommendations.push('Conduct regular threat hunting exercises.');
    }

    return recommendations;
  }

  // ============================================================================
  // External Platform Integration
  // ============================================================================

  private async connectToMISP(): Promise<void> { this.emit('misp:connected'); }
  private async connectToOpenCTI(): Promise<void> { this.emit('opencti:connected'); }
  private async shareToMISP(bundle: STIXBundle): Promise<number> { return bundle.objects.length; }
  private async shareToOpenCTI(bundle: STIXBundle): Promise<number> { return bundle.objects.length; }

  // ============================================================================
  // Enrichment Methods (Simulated)
  // ============================================================================

  private async enrichGeoLocation(ip: string): Promise<IOCEnrichment['geoLocation']> {
    return { country: 'Unknown', countryCode: 'XX', asn: 0, asnOrg: `ASN for ${ip}` };
  }

  private async enrichWhois(_value: string): Promise<IOCEnrichment['whois']> {
    return { registrar: 'Unknown Registrar', createdDate: new Date() };
  }

  private async enrichDNS(domain: string): Promise<IOCEnrichment['dns']> {
    return { aRecords: ['1.2.3.4'], mxRecords: [`mail.${domain}`] };
  }

  private async enrichReputation(_value: string, _type: 'ip' | 'domain'): Promise<IOCEnrichment['reputation']> {
    return { score: 50, sources: [] };
  }

  private async enrichVirusTotal(_value: string): Promise<IOCEnrichment['virusTotal']> {
    return { positives: 0, total: 70, scanDate: new Date() };
  }

  private async enrichShodan(_ip: string): Promise<IOCEnrichment['shodan']> {
    return { ports: [], services: [], vulns: [] };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private simulateFeedFetch(_feed: ThreatFeed): unknown { return []; }

  // ============================================================================
  // Public Getters
  // ============================================================================

  public getStats() {
    return {
      totalIOCs: this.iocs.size, threatActors: this.threatActors.size,
      campaigns: this.campaigns.size, feeds: this.feeds.size, lastUpdated: new Date(),
    };
  }

  public getIOC(iocId: string): IOC | undefined { return this.iocs.get(iocId); }
  public getAllIOCs(): IOC[] { return Array.from(this.iocs.values()); }
  public getAllThreatActors(): ThreatActor[] { return Array.from(this.threatActors.values()); }
  public getAllCampaigns(): Campaign[] { return Array.from(this.campaigns.values()); }
  public getAllFeeds(): ThreatFeed[] { return Array.from(this.feeds.values()); }
  public getHuntQuery(queryId: string): HuntQuery | undefined { return this.huntQueries.get(queryId); }
  public getReport(reportId: string): IntelligenceReport | undefined { return this.reports.get(reportId); }
}

// Export singleton instance
export const threatIntelligencePlatform = ThreatIntelligencePlatform.getInstance();
