import { EventEmitter } from 'events'
import axios, { AxiosInstance } from 'axios'

/**
 * IOC (Indicator of Compromise) type enumeration
 */
export enum IOCType {
  IPv4 = 'IPv4',
  IPv6 = 'IPv6',
  Domain = 'domain',
  URL = 'url',
  MD5 = 'md5',
  SHA1 = 'sha1',
  SHA256 = 'sha256',
  Email = 'email',
  CVE = 'cve',
  FileHash = 'file_hash',
  Hostname = 'hostname',
  Unknown = 'unknown'
}

/**
 * Traffic Light Protocol (TLP) classification
 */
export enum TLPLevel {
  White = 'white',   // No restrictions
  Green = 'green',   // Community-wide distribution
  Amber = 'amber',   // Limited to organization
  Red = 'red'        // Restricted to recipients only
}

/**
 * Standardized IOC (Indicator of Compromise) format
 */
export interface IOCRecord {
  type: IOCType
  value: string
  source: string
  confidence: number // 0-100
  firstSeen?: Date
  lastSeen?: Date
  tags: string[]
  tlp: TLPLevel
  severity?: 'low' | 'medium' | 'high' | 'critical'
  rawData?: Record<string, any>
}

/**
 * Threat feed configuration
 */
export interface ThreatFeedConfig {
  name: string
  enabled: boolean
  refreshIntervalMs: number // 5 min - 24 hours
  apiKey?: string
  apiUrl?: string
  timeout?: number
  maxRetries?: number
  retryDelayMs?: number
  rateLimitPerMin?: number
  priority?: number // 1-10, higher is better
}

/**
 * Feed health status
 */
export interface FeedHealthStatus {
  name: string
  isHealthy: boolean
  lastSuccessfulFetch?: Date
  lastError?: string
  consecutiveFailures: number
  iocCount: number
}

/**
 * Base threat feed interface
 */
export interface IThreatFeed {
  name: string
  config: ThreatFeedConfig
  connect(): Promise<void>
  disconnect(): Promise<void>
  fetch(): Promise<IOCRecord[]>
  subscribe(callback: (iocs: IOCRecord[]) => void): void
  unsubscribe(callback: (iocs: IOCRecord[]) => void): void
  getIOCs(): IOCRecord[]
  getHealth(): FeedHealthStatus
  on(event: string, listener: (...args: any[]) => void): this
  off(event: string, listener: (...args: any[]) => void): this
  emit(event: string, ...args: any[]): boolean
}

/**
 * Abstract base class for threat feeds
 */
abstract class BaseThreatFeed extends EventEmitter implements IThreatFeed {
  name: string
  config: ThreatFeedConfig
  protected iocs: IOCRecord[] = []
  protected lastFetch?: Date
  protected consecutiveFailures = 0
  protected httpClient: AxiosInstance
  protected refreshTimer?: NodeJS.Timeout

  constructor(name: string, config: ThreatFeedConfig) {
    super()
    this.name = name
    this.config = { ...config, enabled: config.enabled !== false }
    this.httpClient = axios.create({
      timeout: config.timeout || 30000,
      headers: {
        'User-Agent': 'ThreatFeedManager/1.0'
      }
    })
  }

  /**
   * Connect to threat feed
   */
  async connect(): Promise<void> {
    if (!this.config.enabled) return

    try {
      await this.validateConnection()
      this.startRefreshTimer()
      this.emit('connected', { feed: this.name })
    } catch (error) {
      this.emit('error', { feed: this.name, error })
      throw error
    }
  }

  /**
   * Disconnect from threat feed
   */
  async disconnect(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
    this.emit('disconnected', { feed: this.name })
  }

  /**
   * Validate connection - override in subclasses
   */
  protected async validateConnection(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Fetch IOCs - implement in subclasses
   */
  abstract fetch(): Promise<IOCRecord[]>

  /**
   * Subscribe to updates
   */
  subscribe(callback: (iocs: IOCRecord[]) => void): void {
    this.on('update', callback)
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(callback: (iocs: IOCRecord[]) => void): void {
    this.off('update', callback)
  }

  /**
   * Get cached IOCs
   */
  getIOCs(): IOCRecord[] {
    return [...this.iocs]
  }

  /**
   * Get health status
   */
  getHealth(): FeedHealthStatus {
    return {
      name: this.name,
      isHealthy: this.consecutiveFailures < 3,
      lastSuccessfulFetch: this.lastFetch,
      iocCount: this.iocs.length,
      consecutiveFailures: this.consecutiveFailures
    }
  }

  /**
   * Start automatic refresh timer
   */
  protected startRefreshTimer(): void {
    this.refreshTimer = setInterval(() => {
      this.fetchWithRetry()
    }, this.config.refreshIntervalMs)

    // Initial fetch
    this.fetchWithRetry()
  }

  /**
   * Fetch with retry logic
   */
  protected async fetchWithRetry(attempt = 0): Promise<void> {
    const maxRetries = this.config.maxRetries || 3

    try {
      const iocs = await this.fetch()
      this.iocs = iocs
      this.lastFetch = new Date()
      this.consecutiveFailures = 0
      this.emit('update', iocs)
    } catch (error) {
      this.consecutiveFailures++
      const delay = (this.config.retryDelayMs || 5000) * Math.pow(2, attempt)

      if (attempt < maxRetries) {
        setTimeout(() => this.fetchWithRetry(attempt + 1), delay)
      } else {
        this.emit('error', {
          feed: this.name,
          error: error instanceof Error ? error.message : String(error),
          attempt
        })
      }
    }
  }
}

/**
 * AlienVault OTX Feed Integration
 */
class AlienVaultOTXFeed extends BaseThreatFeed {
  constructor(config: ThreatFeedConfig) {
    super('AlienVault OTX', {
      ...config,
      apiUrl: config.apiUrl || 'https://otx.alienvault.com/api/v1'
    })
  }

  protected async validateConnection(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('AlienVault OTX requires API key')
    }

    await this.httpClient.get(`${this.config.apiUrl}/user/`, {
      headers: { 'X-OTX-API-KEY': this.config.apiKey }
    })
  }

  async fetch(): Promise<IOCRecord[]> {
    const iocs: IOCRecord[] = []

    try {
      // Fetch pulses
      const response = await this.httpClient.get(
        `${this.config.apiUrl}/pulses/subscribed/`,
        {
          headers: { 'X-OTX-API-KEY': this.config.apiKey },
          params: { limit: 100 }
        }
      )

      for (const pulse of response.data.results || []) {
        // Process each IOC type
        for (const ioc of pulse.indicators || []) {
          iocs.push(this.normalizeIOC(ioc, pulse))
        }
      }

      return iocs
    } catch (error) {
      throw new Error(
        `AlienVault OTX fetch failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private normalizeIOC(
    indicator: Record<string, any>,
    pulse: Record<string, any>
  ): IOCRecord {
    let type: IOCType = IOCType.Unknown

    switch (indicator.type) {
      case 'IPv4':
        type = IOCType.IPv4
        break
      case 'IPv6':
        type = IOCType.IPv6
        break
      case 'domain':
        type = IOCType.Domain
        break
      case 'url':
        type = IOCType.URL
        break
      case 'md5':
        type = IOCType.MD5
        break
      case 'sha1':
        type = IOCType.SHA1
        break
      case 'sha256':
        type = IOCType.SHA256
        break
      case 'email':
        type = IOCType.Email
        break
    }

    return {
      type,
      value: indicator.indicator,
      source: 'AlienVault OTX',
      confidence: (indicator.reputation || 0) + 50, // Normalize to 0-100
      firstSeen: pulse.created ? new Date(pulse.created) : undefined,
      lastSeen: pulse.modified ? new Date(pulse.modified) : undefined,
      tags: [...(pulse.tags || []), ...(indicator.tags || [])],
      tlp: this.mapTLP(pulse.tlp),
      severity: this.calculateSeverity(indicator.reputation || 0),
      rawData: indicator
    }
  }

  private mapTLP(tlpString?: string): TLPLevel {
    const mapping: Record<string, TLPLevel> = {
      'white': TLPLevel.White,
      'green': TLPLevel.Green,
      'amber': TLPLevel.Amber,
      'red': TLPLevel.Red
    }
    return mapping[tlpString?.toLowerCase() || ''] || TLPLevel.White
  }

  private calculateSeverity(
    reputation: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (reputation >= 75) return 'critical'
    if (reputation >= 50) return 'high'
    if (reputation >= 25) return 'medium'
    return 'low'
  }
}

/**
 * VirusTotal Feed Integration
 */
class VirusTotalFeed extends BaseThreatFeed {
  private requestCount = 0
  private requestResetTime = Date.now()

  constructor(config: ThreatFeedConfig) {
    super('VirusTotal', {
      ...config,
      apiUrl: config.apiUrl || 'https://www.virustotal.com/api/v3',
      rateLimitPerMin: config.rateLimitPerMin || 4 // Free tier limit
    })
  }

  protected async validateConnection(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('VirusTotal requires API key')
    }

    await this.httpClient.get(`${this.config.apiUrl}/user/`, {
      headers: { 'x-apikey': this.config.apiKey }
    })
  }

  async fetch(): Promise<IOCRecord[]> {
    // Note: In production, this would fetch from a monitored list
    // For demo, we return empty array
    return []
  }

  /**
   * Look up specific indicators
   */
  async lookupIP(ip: string): Promise<IOCRecord | null> {
    await this.checkRateLimit()

    try {
      const response = await this.httpClient.get(
        `${this.config.apiUrl}/ip_addresses/${ip}`,
        { headers: { 'x-apikey': this.config.apiKey } }
      )

      const data = response.data.data

      return {
        type: this.getIPType(ip),
        value: ip,
        source: 'VirusTotal',
        confidence: this.calculateConfidence(data.attributes.last_analysis_stats),
        lastSeen: new Date(data.attributes.last_analysis_date * 1000),
        tags: [...(data.attributes.tags || []), 'ip_lookup'],
        tlp: TLPLevel.Green,
        severity: this.calculateVTSeverity(data.attributes.last_analysis_stats),
        rawData: data.attributes
      }
    } catch (error) {
      throw new Error(
        `VirusTotal IP lookup failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Look up URL
   */
  async lookupURL(url: string): Promise<IOCRecord | null> {
    await this.checkRateLimit()

    try {
      const urlId = Buffer.from(url).toString('base64').replace(/=/g, '')
      const response = await this.httpClient.get(
        `${this.config.apiUrl}/urls/${urlId}`,
        { headers: { 'x-apikey': this.config.apiKey } }
      )

      const data = response.data.data

      return {
        type: IOCType.URL,
        value: url,
        source: 'VirusTotal',
        confidence: this.calculateConfidence(data.attributes.last_analysis_stats),
        lastSeen: new Date(data.attributes.last_analysis_date * 1000),
        tags: [...(data.attributes.tags || []), 'url_lookup'],
        tlp: TLPLevel.Green,
        severity: this.calculateVTSeverity(data.attributes.last_analysis_stats),
        rawData: data.attributes
      }
    } catch (error) {
      throw new Error(
        `VirusTotal URL lookup failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now()

    if (now - this.requestResetTime > 60000) {
      this.requestCount = 0
      this.requestResetTime = now
    }

    if (this.requestCount >= (this.config.rateLimitPerMin || 4)) {
      const waitTime = 60000 - (now - this.requestResetTime)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestCount = 0
      this.requestResetTime = Date.now()
    }

    this.requestCount++
  }

  private getIPType(ip: string): IOCType {
    return ip.includes(':') ? IOCType.IPv6 : IOCType.IPv4
  }

  private calculateConfidence(stats: Record<string, number>): number {
    const malicious = stats.malicious || 0
    const undetected = stats.undetected || 0
    const total = Object.values(stats).reduce((a, b) => a + b, 0)

    return total > 0 ? Math.round((malicious / total) * 100) : 0
  }

  private calculateVTSeverity(
    stats: Record<string, number>
  ): 'low' | 'medium' | 'high' | 'critical' {
    const malicious = stats.malicious || 0

    if (malicious >= 10) return 'critical'
    if (malicious >= 5) return 'high'
    if (malicious >= 2) return 'medium'
    return 'low'
  }
}

/**
 * AbuseIPDB Feed Integration
 */
class AbuseIPDBFeed extends BaseThreatFeed {
  constructor(config: ThreatFeedConfig) {
    super('AbuseIPDB', {
      ...config,
      apiUrl: config.apiUrl || 'https://api.abuseipdb.com/api/v2'
    })
  }

  protected async validateConnection(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('AbuseIPDB requires API key')
    }

    await this.httpClient.get(`${this.config.apiUrl}/check`, {
      headers: { Key: this.config.apiKey },
      params: { ipAddress: '8.8.8.8', maxAgeInDays: 90 }
    })
  }

  async fetch(): Promise<IOCRecord[]> {
    // Note: In production, this would fetch from blacklist
    return []
  }

  /**
   * Check IP reputation
   */
  async checkIP(ip: string): Promise<IOCRecord | null> {
    try {
      const response = await this.httpClient.get(`${this.config.apiUrl}/check`, {
        headers: {
          Key: this.config.apiKey,
          'Accept': 'application/json'
        },
        params: {
          ipAddress: ip,
          maxAgeInDays: 90,
          verbose: true
        }
      })

      const data = response.data.data

      if (!data) return null

      return {
        type: this.getIPType(ip),
        value: ip,
        source: 'AbuseIPDB',
        confidence: data.abuseConfidenceScore || 0,
        lastSeen: data.lastReportedAt ? new Date(data.lastReportedAt) : undefined,
        tags: data.usageType ? [data.usageType] : [],
        tlp: TLPLevel.Green,
        severity: this.calculateAbuseSeverity(data.abuseConfidenceScore || 0),
        rawData: data
      }
    } catch (error) {
      throw new Error(
        `AbuseIPDB check failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private getIPType(ip: string): IOCType {
    return ip.includes(':') ? IOCType.IPv6 : IOCType.IPv4
  }

  private calculateAbuseSeverity(
    confidence: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= 75) return 'critical'
    if (confidence >= 50) return 'high'
    if (confidence >= 25) return 'medium'
    return 'low'
  }
}

/**
 * ThreatFox (Abuse.ch) Feed Integration
 */
class ThreatFoxFeed extends BaseThreatFeed {
  constructor(config: ThreatFeedConfig) {
    super('ThreatFox', {
      ...config,
      apiUrl: config.apiUrl || 'https://threatfox-api.abuse.ch/api/v1/',
      timeout: config.timeout || 15000
    })
  }

  protected async validateConnection(): Promise<void> {
    // ThreatFox doesn't require authentication
    const response = await this.httpClient.post(
      `${this.config.apiUrl}`,
      { query: 'get_tags' }
    )

    if (!response.data || response.data.query_status === 'failed') {
      throw new Error('ThreatFox validation failed')
    }
  }

  async fetch(): Promise<IOCRecord[]> {
    try {
      const response = await this.httpClient.post(`${this.config.apiUrl}`, {
        query: 'get_iocs',
        days: 30,
        limit: 1000
      })

      if (response.data.query_status === 'failed') {
        throw new Error(response.data.error || 'Query failed')
      }

      const iocs: IOCRecord[] = []

      for (const ioc of response.data.data || []) {
        iocs.push(this.normalizeIOC(ioc))
      }

      return iocs
    } catch (error) {
      throw new Error(
        `ThreatFox fetch failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private normalizeIOC(ioc: Record<string, any>): IOCRecord {
    let type: IOCType = IOCType.Unknown

    switch (ioc.ioc_type) {
      case 'ip:port':
      case 'ip':
        type = ioc.ioc.includes(':') ? IOCType.IPv6 : IOCType.IPv4
        break
      case 'domain':
        type = IOCType.Domain
        break
      case 'url':
        type = IOCType.URL
        break
      case 'md5':
        type = IOCType.MD5
        break
      case 'sha256':
        type = IOCType.SHA256
        break
    }

    return {
      type,
      value: ioc.ioc,
      source: 'ThreatFox',
      confidence: 85, // ThreatFox provides well-vetted IOCs
      firstSeen: ioc.first_submission_timestamp
        ? new Date(ioc.first_submission_timestamp * 1000)
        : undefined,
      lastSeen: ioc.last_submission_timestamp
        ? new Date(ioc.last_submission_timestamp * 1000)
        : undefined,
      tags: [ioc.malware_family || 'unknown', ...(ioc.tags || [])],
      tlp: TLPLevel.White,
      severity: 'high',
      rawData: ioc
    }
  }
}

/**
 * MISP Feed Integration
 */
class MISPFeed extends BaseThreatFeed {
  constructor(config: ThreatFeedConfig) {
    super('MISP', {
      ...config,
      timeout: config.timeout || 30000
    })
  }

  protected async validateConnection(): Promise<void> {
    if (!this.config.apiKey || !this.config.apiUrl) {
      throw new Error('MISP requires API key and API URL')
    }

    await this.httpClient.get(`${this.config.apiUrl}/servers/getVersion.json`, {
      headers: { Authorization: this.config.apiKey }
    })
  }

  async fetch(): Promise<IOCRecord[]> {
    try {
      const response = await this.httpClient.get(
        `${this.config.apiUrl}/events/index.json`,
        {
          headers: { Authorization: this.config.apiKey },
          params: {
            limit: 100,
            timestamp: Math.floor(Date.now() / 1000) - 86400 // Last 24 hours
          }
        }
      )

      const iocs: IOCRecord[] = []

      for (const event of response.data || []) {
        if (event.Event && event.Event.Attribute) {
          for (const attr of event.Event.Attribute) {
            const ioc = this.normalizeAttribute(attr, event.Event)
            if (ioc) iocs.push(ioc)
          }
        }
      }

      return iocs
    } catch (error) {
      throw new Error(
        `MISP fetch failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private normalizeAttribute(
    attr: Record<string, any>,
    event: Record<string, any>
  ): IOCRecord | null {
    let type: IOCType = IOCType.Unknown

    switch (attr.type) {
      case 'ip-dst':
      case 'ip-src':
        type = attr.value.includes(':') ? IOCType.IPv6 : IOCType.IPv4
        break
      case 'domain':
      case 'hostname':
        type = IOCType.Domain
        break
      case 'url':
        type = IOCType.URL
        break
      case 'md5':
        type = IOCType.MD5
        break
      case 'sha1':
        type = IOCType.SHA1
        break
      case 'sha256':
        type = IOCType.SHA256
        break
      default:
        return null
    }

    return {
      type,
      value: attr.value,
      source: 'MISP',
      confidence: attr.to_ids ? 95 : 50,
      firstSeen: event.date ? new Date(event.date) : undefined,
      tags: [event.info || 'unknown', ...(attr.tags?.map((t: any) => t.name) || [])],
      tlp: this.mapTLP(attr.distribution),
      severity: attr.to_ids ? 'high' : 'medium',
      rawData: attr
    }
  }

  private mapTLP(distribution: number): TLPLevel {
    const mapping: Record<number, TLPLevel> = {
      0: TLPLevel.Red,
      1: TLPLevel.Amber,
      2: TLPLevel.Green,
      3: TLPLevel.White,
      4: TLPLevel.White // Community
    }
    return mapping[distribution] || TLPLevel.Green
  }
}

/**
 * OpenCTI Feed Integration
 */
class OpenCTIFeed extends BaseThreatFeed {
  constructor(config: ThreatFeedConfig) {
    super('OpenCTI', {
      ...config,
      timeout: config.timeout || 30000
    })
  }

  protected async validateConnection(): Promise<void> {
    if (!this.config.apiKey || !this.config.apiUrl) {
      throw new Error('OpenCTI requires API key and API URL')
    }

    const query = `
      query {
        me {
          id
          name
        }
      }
    `

    const response = await this.httpClient.post(
      `${this.config.apiUrl}/graphql`,
      { query },
      { headers: { Authorization: `Bearer ${this.config.apiKey}` } }
    )

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message)
    }
  }

  async fetch(): Promise<IOCRecord[]> {
    try {
      const query = `
        query {
          indicators(first: 100) {
            edges {
              node {
                id
                name
                pattern
                created
                modified
                objectMarking {
                  edges {
                    node {
                      definition_type
                    }
                  }
                }
                externalReferences {
                  edges {
                    node {
                      source_name
                    }
                  }
                }
              }
            }
          }
        }
      `

      const response = await this.httpClient.post(
        `${this.config.apiUrl}/graphql`,
        { query },
        { headers: { Authorization: `Bearer ${this.config.apiKey}` } }
      )

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message)
      }

      const iocs: IOCRecord[] = []

      for (const edge of response.data.data?.indicators?.edges || []) {
        const node = edge.node
        const ioc = this.normalizeIndicator(node)
        if (ioc) iocs.push(ioc)
      }

      return iocs
    } catch (error) {
      throw new Error(
        `OpenCTI fetch failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private normalizeIndicator(indicator: Record<string, any>): IOCRecord | null {
    const pattern = indicator.pattern || ''
    const type = this.extractType(pattern)

    if (type === IOCType.Unknown) return null

    const value = this.extractValue(pattern)

    if (!value) return null

    return {
      type,
      value,
      source: 'OpenCTI',
      confidence: 90,
      firstSeen: indicator.created ? new Date(indicator.created) : undefined,
      lastSeen: indicator.modified ? new Date(indicator.modified) : undefined,
      tags: [indicator.name || 'unknown'],
      tlp: this.extractTLP(indicator.objectMarking),
      severity: 'high',
      rawData: indicator
    }
  }

  private extractType(pattern: string): IOCType {
    if (pattern.includes('ipv4-addr')) return IOCType.IPv4
    if (pattern.includes('ipv6-addr')) return IOCType.IPv6
    if (pattern.includes('domain-name')) return IOCType.Domain
    if (pattern.includes('url')) return IOCType.URL
    if (pattern.includes('file:hashes.MD5')) return IOCType.MD5
    if (pattern.includes('file:hashes.SHA-1')) return IOCType.SHA1
    if (pattern.includes('file:hashes.SHA-256')) return IOCType.SHA256
    return IOCType.Unknown
  }

  private extractValue(pattern: string): string | null {
    const match = pattern.match(/['"]([^'"]+)['"]/)
    return match ? match[1] : null
  }

  private extractTLP(objectMarking: Record<string, any>): TLPLevel {
    const marking = objectMarking?.edges?.[0]?.node?.definition_type || ''

    const mapping: Record<string, TLPLevel> = {
      'tlp:white': TLPLevel.White,
      'tlp:green': TLPLevel.Green,
      'tlp:amber': TLPLevel.Amber,
      'tlp:red': TLPLevel.Red
    }

    return mapping[marking.toLowerCase()] || TLPLevel.Green
  }
}

/**
 * Threat Feed Manager - manages multiple threat feeds with deduplication and caching
 */
export class ThreatFeedManager extends EventEmitter {
  private feeds: Map<string, IThreatFeed> = new Map()
  private allIOCs: Map<string, IOCRecord> = new Map() // Deduplicated IOCs
  private cache: Map<string, { data: IOCRecord[]; timestamp: number }> = new Map()
  private cacheTTLMs: number

  /**
   * Create threat feed manager
   */
  constructor(cacheTTLMs = 3600000) {
    super()
    this.cacheTTLMs = cacheTTLMs
  }

  /**
   * Register a threat feed
   */
  registerFeed(feed: IThreatFeed): void {
    this.feeds.set(feed.name, feed)
    feed.subscribe((iocs: IOCRecord[]) => {
      this.mergeIOCs(iocs)
      this.emit('update', this.getDeduplicatedIOCs())
    })

    feed.on('error', (error: any) => {
      this.emit('feed_error', { feed: feed.name, ...error })
    })

    feed.on('connected', () => {
      this.emit('feed_connected', { feed: feed.name })
    })

    feed.on('disconnected', () => {
      this.emit('feed_disconnected', { feed: feed.name })
    })
  }

  /**
   * Create standard feeds
   */
  createStandardFeeds(configs: Record<string, ThreatFeedConfig>): void {
    const feedConfigs = {
      alienVaultOTX: configs.alienVaultOTX,
      virusTotal: configs.virusTotal,
      abuseIPDB: configs.abuseIPDB,
      threatFox: configs.threatFox,
      misp: configs.misp,
      openCTI: configs.openCTI
    }

    if (feedConfigs.alienVaultOTX?.enabled) {
      this.registerFeed(new AlienVaultOTXFeed(feedConfigs.alienVaultOTX))
    }

    if (feedConfigs.virusTotal?.enabled) {
      this.registerFeed(new VirusTotalFeed(feedConfigs.virusTotal))
    }

    if (feedConfigs.abuseIPDB?.enabled) {
      this.registerFeed(new AbuseIPDBFeed(feedConfigs.abuseIPDB))
    }

    if (feedConfigs.threatFox?.enabled) {
      this.registerFeed(new ThreatFoxFeed(feedConfigs.threatFox))
    }

    if (feedConfigs.misp?.enabled) {
      this.registerFeed(new MISPFeed(feedConfigs.misp))
    }

    if (feedConfigs.openCTI?.enabled) {
      this.registerFeed(new OpenCTIFeed(feedConfigs.openCTI))
    }
  }

  /**
   * Connect all feeds
   */
  async connectAll(): Promise<void> {
    const promises = Array.from(this.feeds.values()).map(feed =>
      feed.connect().catch(error => {
        this.emit('feed_error', { feed: feed.name, error })
      })
    )

    await Promise.allSettled(promises)
  }

  /**
   * Disconnect all feeds
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.feeds.values()).map(feed =>
      feed.disconnect()
    )

    await Promise.all(promises)
  }

  /**
   * Merge IOCs from a feed
   */
  private mergeIOCs(iocs: IOCRecord[]): void {
    for (const ioc of iocs) {
      const key = `${ioc.type}:${ioc.value}`
      const existing = this.allIOCs.get(key)

      if (existing) {
        // Merge with existing: take highest confidence, latest dates
        existing.confidence = Math.max(existing.confidence, ioc.confidence)
        if (ioc.lastSeen && (!existing.lastSeen || ioc.lastSeen > existing.lastSeen)) {
          existing.lastSeen = ioc.lastSeen
        }
        const tagSet = new Set([...existing.tags, ...ioc.tags])
        existing.tags = Array.from(tagSet)
      } else {
        this.allIOCs.set(key, ioc)
      }
    }

    this.cache.clear() // Invalidate cache
  }

  /**
   * Get deduplicated IOCs
   */
  getDeduplicatedIOCs(): IOCRecord[] {
    return Array.from(this.allIOCs.values())
  }

  /**
   * Get IOCs filtered by type
   */
  getIOCsByType(type: IOCType): IOCRecord[] {
    return Array.from(this.allIOCs.values()).filter(ioc => ioc.type === type)
  }

  /**
   * Search IOCs by value
   */
  searchIOCs(query: string, type?: IOCType): IOCRecord[] {
    const lowerQuery = query.toLowerCase()

    return Array.from(this.allIOCs.values()).filter(ioc => {
      const matchesType = !type || ioc.type === type
      const matchesValue = ioc.value.toLowerCase().includes(lowerQuery)
      const matchesTags = ioc.tags.some(tag =>
        tag.toLowerCase().includes(lowerQuery)
      )

      return matchesType && (matchesValue || matchesTags)
    })
  }

  /**
   * Get IOCs by severity
   */
  getIOCsBySeverity(severity: string): IOCRecord[] {
    return Array.from(this.allIOCs.values()).filter(
      ioc => ioc.severity === severity
    )
  }

  /**
   * Get health status of all feeds
   */
  getAllFeedHealth(): FeedHealthStatus[] {
    return Array.from(this.feeds.values()).map(feed => feed.getHealth())
  }

  /**
   * Get specific feed health
   */
  getFeedHealth(feedName: string): FeedHealthStatus | null {
    const feed = this.feeds.get(feedName)
    return feed ? feed.getHealth() : null
  }

  /**
   * Get feed by name
   */
  getFeed(feedName: string): IThreatFeed | undefined {
    return this.feeds.get(feedName)
  }

  /**
   * Get all feeds
   */
  getAllFeeds(): IThreatFeed[] {
    return Array.from(this.feeds.values())
  }

  /**
   * Invalidate cache
   */
  invalidateCache(): void {
    this.cache.clear()
  }

  /**
   * Export IOCs as JSON
   */
  exportIOCs(format: 'json' | 'csv' = 'json'): string {
    const iocs = this.getDeduplicatedIOCs()

    if (format === 'json') {
      return JSON.stringify(iocs, null, 2)
    }

    // CSV format
    const headers = [
      'Type',
      'Value',
      'Source',
      'Confidence',
      'Severity',
      'Tags',
      'FirstSeen',
      'LastSeen'
    ]
    const rows = iocs.map(ioc => [
      ioc.type,
      ioc.value,
      ioc.source,
      ioc.confidence,
      ioc.severity || 'unknown',
      ioc.tags.join(';'),
      ioc.firstSeen?.toISOString() || '',
      ioc.lastSeen?.toISOString() || ''
    ])

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalIOCs: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
    bySource: Record<string, number>
    averageConfidence: number
  } {
    const iocs = this.getDeduplicatedIOCs()

    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    let totalConfidence = 0

    for (const ioc of iocs) {
      byType[ioc.type] = (byType[ioc.type] || 0) + 1
      bySeverity[ioc.severity || 'unknown'] =
        (bySeverity[ioc.severity || 'unknown'] || 0) + 1
      bySource[ioc.source] = (bySource[ioc.source] || 0) + 1
      totalConfidence += ioc.confidence
    }

    return {
      totalIOCs: iocs.length,
      byType,
      bySeverity,
      bySource,
      averageConfidence: iocs.length > 0 ? totalConfidence / iocs.length : 0
    }
  }
}

// Export classes and interfaces
export {
  BaseThreatFeed,
  AlienVaultOTXFeed,
  VirusTotalFeed,
  AbuseIPDBFeed,
  ThreatFoxFeed,
  MISPFeed,
  OpenCTIFeed
}
