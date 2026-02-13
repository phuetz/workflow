/**
 * Event Normalization Service
 * Converts internal events to SIEM-compatible formats (CEF, LEEF, ECS, Syslog)
 * Supports enrichment with geo-IP, threat intel, and contextual data
 */

import * as crypto from 'crypto'

/**
 * Internal event schema
 */
export interface WorkflowEvent {
  id: string
  timestamp: number
  type: 'execution' | 'error' | 'security' | 'audit' | 'performance'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  source: string
  message: string
  userId?: string
  workflowId?: string
  nodeId?: string
  metadata?: Record<string, unknown>
  error?: {
    code: string
    message: string
    stack?: string
  }
  action?: string
  result?: 'success' | 'failure'
  duration?: number
  ipAddress?: string
  userAgent?: string
}

/**
 * CEF event format
 */
export interface CEFEvent {
  cefVersion: string
  deviceVendor: string
  deviceProduct: string
  deviceVersion: string
  signatureId: string
  name: string
  severity: number
  extensions: Record<string, string | number>
  raw: string
}

/**
 * LEEF event format
 */
export interface LEEFEvent {
  version: string
  vendor: string
  product: string
  productVersion: string
  eventId: string
  delimiter: string
  attributes: Record<string, string | number>
  raw: string
}

/**
 * ECS (Elastic Common Schema) event format
 */
export interface ECSEvent {
  '@timestamp': string
  event: {
    id: string
    category: string
    type: string
    action: string
    severity: number
    outcome: 'success' | 'failure'
    duration?: number
    risk_score?: number
  }
  message: string
  log?: {
    level: string
    logger: string
  }
  host?: {
    name: string
    ip: string
    os?: {
      platform: string
    }
  }
  source?: {
    ip: string
    geo?: GeoLocation
    user?: {
      id: string
      name: string
    }
  }
  destination?: {
    ip: string
    geo?: GeoLocation
  }
  user?: {
    id: string
    name: string
    email: string
    roles: string[]
    department?: string
  }
  process?: {
    name: string
    pid: number
  }
  error?: {
    code: string
    message: string
  }
  threat?: {
    indicator?: {
      type: string
      ip: string
    }
    score?: number
    enrichment?: Record<string, unknown>
  }
  [key: string]: unknown
}

/**
 * Syslog RFC 5424 event format
 */
export interface SyslogEvent {
  priority: number
  facility: number
  severity: number
  timestamp: string
  hostname: string
  tag: string
  pid: number
  msgId: string
  structuredData: Record<string, Record<string, string>>
  msg: string
  raw: string
}

/**
 * Geo-location data from IP lookup
 */
export interface GeoLocation {
  country: string
  country_code: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  asn: string
  isp: string
}

/**
 * Threat intelligence data
 */
export interface ThreatIntel {
  isKnownMalicious: boolean
  riskScore: number
  categories: string[]
  lastSeen?: number
  indicators?: string[]
}

/**
 * Asset context information
 */
export interface AssetContext {
  hostname: string
  owner: string
  criticality: 'critical' | 'high' | 'medium' | 'low'
  tags: string[]
  environment: 'production' | 'staging' | 'development'
}

/**
 * User context information
 */
export interface UserContext {
  id: string
  name: string
  email: string
  department: string
  role: string
  manager?: string
  riskLevel: 'high' | 'medium' | 'low'
}

/**
 * Enriched event with all contextual data
 */
export interface EnrichedEvent extends WorkflowEvent {
  geoLocation?: GeoLocation
  threatIntel?: ThreatIntel
  assetContext?: AssetContext
  userContext?: UserContext
}

/**
 * Event Normalizer Service
 * Converts internal events to SIEM-compatible formats
 */
export class EventNormalizer {
  private static readonly CEF_VERSION = '0'
  private static readonly LEEF_VERSION = '2.0'
  private static readonly DEVICE_VENDOR = 'Workflow'
  private static readonly DEVICE_PRODUCT = 'WorkflowEngine'
  private static readonly DEVICE_VERSION = '1.0'

  /**
   * Severity mapping from internal to standard formats
   */
  private static readonly SEVERITY_MAP: Record<
    string,
    { cef: number; ecsNumber: number; syslog: number }
  > = {
    critical: { cef: 10, ecsNumber: 5, syslog: 2 },
    high: { cef: 8, ecsNumber: 4, syslog: 3 },
    medium: { cef: 5, ecsNumber: 3, syslog: 4 },
    low: { cef: 3, ecsNumber: 2, syslog: 5 },
    info: { cef: 1, ecsNumber: 1, syslog: 6 }
  }

  /**
   * Event type to CEF signature mapping
   */
  private static readonly CEF_SIGNATURES: Record<string, string> = {
    execution: '1001',
    error: '2001',
    security: '3001',
    audit: '4001',
    performance: '5001'
  }

  /**
   * Event type to ECS category mapping
   */
  private static readonly ECS_CATEGORIES: Record<string, string> = {
    execution: 'process',
    error: 'issue',
    security: 'intrusion_detection',
    audit: 'authentication',
    performance: 'web'
  }

  /**
   * GeoIP lookup cache
   */
  private geoipCache: Map<string, GeoLocation> = new Map()

  /**
   * Threat intelligence cache
   */
  private threatIntelCache: Map<string, ThreatIntel> = new Map()

  /**
   * Asset context cache
   */
  private assetCache: Map<string, AssetContext> = new Map()

  /**
   * User context cache
   */
  private userCache: Map<string, UserContext> = new Map()

  constructor(
    private geoipProvider?: (ip: string) => Promise<GeoLocation>,
    private threatIntelProvider?: (ip: string) => Promise<ThreatIntel>,
    private assetProvider?: (hostname: string) => Promise<AssetContext>,
    private userProvider?: (userId: string) => Promise<UserContext>
  ) {}

  /**
   * Normalize event to CEF format
   */
  async toCEF(event: WorkflowEvent): Promise<CEFEvent> {
    const severity = EventNormalizer.SEVERITY_MAP[event.severity]
    const signatureId = EventNormalizer.CEF_SIGNATURES[event.type]

    const extensions: Record<string, string | number> = {
      msg: event.message,
      act: event.action || 'Unknown',
      outcome: event.result === 'success' ? 'success' : 'failure',
      rt: event.timestamp,
      type: event.type
    }

    if (event.userId) extensions.suser = event.userId
    if (event.workflowId) extensions.cs1 = event.workflowId
    if (event.nodeId) extensions.cs2 = event.nodeId
    if (event.duration) extensions.dur = event.duration
    if (event.ipAddress) extensions.src = event.ipAddress
    if (event.userAgent) extensions.userAgent = event.userAgent
    if (event.error) {
      extensions.cs3 = event.error.code
      extensions.cs4 = event.error.message
    }

    const extensionsStr = Object.entries(extensions)
      .map(([key, value]) => `${key}=${this.escapeCEFValue(value.toString())}`)
      .join(' ')

    const raw = `CEF:${EventNormalizer.CEF_VERSION}|${EventNormalizer.DEVICE_VENDOR}|${EventNormalizer.DEVICE_PRODUCT}|${EventNormalizer.DEVICE_VERSION}|${signatureId}|${event.message}|${severity.cef}|${extensionsStr}`

    return {
      cefVersion: EventNormalizer.CEF_VERSION,
      deviceVendor: EventNormalizer.DEVICE_VENDOR,
      deviceProduct: EventNormalizer.DEVICE_PRODUCT,
      deviceVersion: EventNormalizer.DEVICE_VERSION,
      signatureId,
      name: event.message,
      severity: severity.cef,
      extensions,
      raw
    }
  }

  /**
   * Normalize event to LEEF format
   */
  async toLEEF(event: WorkflowEvent): Promise<LEEFEvent> {
    const delimiter = '\t'
    const severity = EventNormalizer.SEVERITY_MAP[event.severity]

    const attributes: Record<string, string | number> = {
      eventId: event.id,
      timestamp: event.timestamp,
      severity: severity.cef,
      message: event.message,
      type: event.type,
      action: event.action || 'Unknown',
      result: event.result === 'success' ? 'success' : 'failure'
    }

    if (event.userId) attributes.userId = event.userId
    if (event.workflowId) attributes.workflowId = event.workflowId
    if (event.nodeId) attributes.nodeId = event.nodeId
    if (event.duration) attributes.duration = event.duration
    if (event.ipAddress) attributes.srcIp = event.ipAddress
    if (event.userAgent) attributes.userAgent = event.userAgent
    if (event.error) {
      attributes.errorCode = event.error.code
      attributes.errorMessage = event.error.message
    }

    const attributesStr = Object.entries(attributes)
      .map(([key, value]) => `${key}=${this.escapeLEEFValue(value.toString())}`)
      .join(delimiter)

    const raw = `LEEF:${EventNormalizer.LEEF_VERSION}|${EventNormalizer.DEVICE_VENDOR}|${EventNormalizer.DEVICE_PRODUCT}|${EventNormalizer.DEVICE_VERSION}|${event.type}|${delimiter}${attributesStr}`

    return {
      version: EventNormalizer.LEEF_VERSION,
      vendor: EventNormalizer.DEVICE_VENDOR,
      product: EventNormalizer.DEVICE_PRODUCT,
      productVersion: EventNormalizer.DEVICE_VERSION,
      eventId: event.type,
      delimiter,
      attributes,
      raw
    }
  }

  /**
   * Normalize event to ECS format
   */
  async toECS(event: WorkflowEvent, enriched?: EnrichedEvent): Promise<ECSEvent> {
    const severity = EventNormalizer.SEVERITY_MAP[event.severity]
    const category = EventNormalizer.ECS_CATEGORIES[event.type]

    const ecsEvent: ECSEvent = {
      '@timestamp': new Date(event.timestamp).toISOString(),
      event: {
        id: event.id,
        category,
        type: event.type,
        action: event.action || 'unknown',
        severity: severity.ecsNumber,
        outcome: event.result === 'success' ? 'success' : 'failure'
      },
      message: event.message
    }

    if (event.duration) ecsEvent.event.duration = event.duration * 1_000_000 // ns

    if (event.error) {
      ecsEvent.error = {
        code: event.error.code,
        message: event.error.message
      }
      ecsEvent.event.risk_score = severity.ecsNumber * 20
    }

    if (event.userId && enriched?.userContext) {
      ecsEvent.user = {
        id: enriched.userContext.id,
        name: enriched.userContext.name,
        email: enriched.userContext.email,
        roles: [enriched.userContext.role],
        department: enriched.userContext.department
      }
    }

    if (event.ipAddress) {
      ecsEvent.source = {
        ip: event.ipAddress
      }
      if (enriched?.geoLocation) {
        ecsEvent.source.geo = enriched.geoLocation
      }
    }

    if (enriched?.assetContext) {
      ecsEvent.host = {
        name: enriched.assetContext.hostname,
        ip: '0.0.0.0'
      }
    }

    if (enriched?.threatIntel) {
      ecsEvent.threat = {
        score: enriched.threatIntel.riskScore,
        enrichment: {
          isKnownMalicious: enriched.threatIntel.isKnownMalicious,
          categories: enriched.threatIntel.categories
        }
      }
    }

    return ecsEvent
  }

  /**
   * Normalize event to Syslog RFC 5424 format
   */
  async toSyslog(event: WorkflowEvent): Promise<SyslogEvent> {
    const severity = EventNormalizer.SEVERITY_MAP[event.severity]
    const facility = 16 // local0
    const priority = facility * 8 + severity.syslog

    const structuredData: Record<string, Record<string, string>> = {
      workflow: {
        id: event.workflowId || 'unknown',
        nodeId: event.nodeId || 'unknown',
        type: event.type
      }
    }

    if (event.userId) {
      structuredData.user = {
        id: event.userId
      }
    }

    if (event.error) {
      structuredData.error = {
        code: event.error.code,
        message: event.error.message
      }
    }

    const timestamp = new Date(event.timestamp).toISOString()
    const hostname = this.getHostname()
    const msgId = event.id

    const structuredDataStr = Object.entries(structuredData)
      .map(([name, params]) => {
        const paramsStr = Object.entries(params)
          .map(([key, value]) => `${key}="${this.escapeSyslogValue(value)}"`)
          .join(' ')
        return `[${name} ${paramsStr}]`
      })
      .join('')

    const raw = `<${priority}>${timestamp} ${hostname} ${event.source}[${process.pid}]: [${msgId}] ${structuredDataStr} ${event.message}`

    return {
      priority,
      facility,
      severity: severity.syslog,
      timestamp,
      hostname,
      tag: event.source,
      pid: process.pid,
      msgId,
      structuredData,
      msg: event.message,
      raw
    }
  }

  /**
   * Enrich event with contextual data
   */
  async enrichEvent(event: WorkflowEvent): Promise<EnrichedEvent> {
    const enriched: EnrichedEvent = { ...event }

    if (event.ipAddress) {
      enriched.geoLocation = await this.getGeoLocation(event.ipAddress)
      enriched.threatIntel = await this.getThreatIntel(event.ipAddress)
    }

    if (event.source) {
      enriched.assetContext = await this.getAssetContext(event.source)
    }

    if (event.userId) {
      enriched.userContext = await this.getUserContext(event.userId)
    }

    return enriched
  }

  /**
   * Get geo-location for IP address with caching
   */
  private async getGeoLocation(ip: string): Promise<GeoLocation | undefined> {
    if (this.geoipCache.has(ip)) {
      return this.geoipCache.get(ip)
    }

    if (!this.geoipProvider) return undefined

    try {
      const location = await this.geoipProvider(ip)
      this.geoipCache.set(ip, location)
      return location
    } catch {
      return undefined
    }
  }

  /**
   * Get threat intelligence for IP address with caching
   */
  private async getThreatIntel(ip: string): Promise<ThreatIntel | undefined> {
    if (this.threatIntelCache.has(ip)) {
      return this.threatIntelCache.get(ip)
    }

    if (!this.threatIntelProvider) return undefined

    try {
      const intel = await this.threatIntelProvider(ip)
      this.threatIntelCache.set(ip, intel)
      return intel
    } catch {
      return undefined
    }
  }

  /**
   * Get asset context with caching
   */
  private async getAssetContext(hostname: string): Promise<AssetContext | undefined> {
    if (this.assetCache.has(hostname)) {
      return this.assetCache.get(hostname)
    }

    if (!this.assetProvider) return undefined

    try {
      const context = await this.assetProvider(hostname)
      this.assetCache.set(hostname, context)
      return context
    } catch {
      return undefined
    }
  }

  /**
   * Get user context with caching
   */
  private async getUserContext(userId: string): Promise<UserContext | undefined> {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)
    }

    if (!this.userProvider) return undefined

    try {
      const context = await this.userProvider(userId)
      this.userCache.set(userId, context)
      return context
    } catch {
      return undefined
    }
  }

  /**
   * Escape value for CEF format
   */
  private escapeCEFValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/=/g, '\\=')
      .replace(/\n/g, '\\n')
  }

  /**
   * Escape value for LEEF format
   */
  private escapeLEEFValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/=/g, '\\=')
      .replace(/\n/g, '\\n')
  }

  /**
   * Escape value for Syslog format
   */
  private escapeSyslogValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
  }

  /**
   * Get hostname for Syslog
   */
  private getHostname(): string {
    return process.env.HOSTNAME || 'workflow-engine'
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.geoipCache.clear()
    this.threatIntelCache.clear()
    this.assetCache.clear()
    this.userCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    geoip: number
    threatIntel: number
    assets: number
    users: number
  } {
    return {
      geoip: this.geoipCache.size,
      threatIntel: this.threatIntelCache.size,
      assets: this.assetCache.size,
      users: this.userCache.size
    }
  }

  /**
   * Validate CEF event format
   */
  validateCEF(event: CEFEvent): boolean {
    return (
      event.cefVersion !== undefined &&
      event.deviceVendor !== undefined &&
      event.deviceProduct !== undefined &&
      event.signatureId !== undefined &&
      event.name !== undefined &&
      event.severity >= 0 &&
      event.severity <= 10 &&
      event.raw.startsWith('CEF:')
    )
  }

  /**
   * Validate LEEF event format
   */
  validateLEEF(event: LEEFEvent): boolean {
    return (
      event.version !== undefined &&
      event.vendor !== undefined &&
      event.product !== undefined &&
      event.eventId !== undefined &&
      event.raw.startsWith('LEEF:')
    )
  }

  /**
   * Validate ECS event format
   */
  validateECS(event: ECSEvent): boolean {
    return (
      event['@timestamp'] !== undefined &&
      event.event !== undefined &&
      event.event.id !== undefined &&
      event.event.category !== undefined &&
      event.message !== undefined
    )
  }

  /**
   * Validate Syslog event format
   */
  validateSyslog(event: SyslogEvent): boolean {
    return (
      event.priority >= 0 &&
      event.facility >= 0 &&
      event.severity >= 0 &&
      event.severity <= 7 &&
      event.timestamp !== undefined &&
      event.hostname !== undefined &&
      event.msg !== undefined &&
      event.raw.startsWith('<')
    )
  }

  /**
   * Generate SHA256 hash for integrity verification
   */
  generateIntegrityHash(event: CEFEvent | LEEFEvent | ECSEvent | SyslogEvent): string {
    const eventStr = JSON.stringify(event)
    return crypto.createHash('sha256').update(eventStr).digest('hex')
  }
}

export default EventNormalizer
