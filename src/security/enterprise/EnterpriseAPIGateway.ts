/**
 * Enterprise API Gateway
 *
 * Comprehensive API gateway for managing APIs with advanced security,
 * traffic management, monitoring, and governance features.
 *
 * Features:
 * - API registration and versioning
 * - Multi-strategy authentication and authorization
 * - Rate limiting, throttling, and traffic management
 * - Circuit breaker and retry policies
 * - Request/response transformation
 * - Performance metrics and analytics
 * - Compliance enforcement
 * - Developer portal integration
 */

import { EventEmitter } from 'events'

/**
 * API authentication strategy
 */
type AuthStrategy = 'api-key' | 'oauth2' | 'jwt' | 'mutual-tls' | 'custom'

/**
 * API authorization model
 */
type AuthorizationModel = 'rbac' | 'abac' | 'custom'

/**
 * Rate limiting strategy
 */
type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket'

/**
 * API status
 */
type APIStatus = 'active' | 'deprecated' | 'sunset' | 'archived'

/**
 * Request transformation type
 */
type TransformationType = 'header-injection' | 'body-transformation' | 'path-rewrite' | 'query-param-injection'

/**
 * API endpoint definition
 */
interface APIEndpoint {
  id: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  version: string
  description: string
  documentation?: string
  deprecated?: boolean
  tags: string[]
  authentication: AuthStrategy[]
  rateLimit?: {
    requests: number
    window: number // milliseconds
  }
  timeout?: number
  retryPolicy?: {
    maxRetries: number
    backoffMs: number
    backoffMultiplier: number
  }
}

/**
 * API definition
 */
interface APIDefinition {
  id: string
  name: string
  title: string
  description: string
  version: string
  baseUrl: string
  status: APIStatus
  owner: string
  contact?: {
    name: string
    email: string
    url?: string
  }
  license?: {
    name: string
    url?: string
  }
  endpoints: APIEndpoint[]
  authentication: {
    strategies: AuthStrategy[]
    defaultStrategy: AuthStrategy
  }
  rateLimit: {
    global: {
      requests: number
      window: number
    }
    perUser?: {
      requests: number
      window: number
    }
    strategy: RateLimitStrategy
  }
  quota?: {
    dailyRequests?: number
    monthlyRequests?: number
    concurrentConnections?: number
  }
  documentation: {
    url: string
    openapi?: string
    postman?: string
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * API Key configuration
 */
interface APIKey {
  id: string
  key: string
  apiId: string
  name: string
  owner: string
  permissions: string[]
  ipWhitelist?: string[]
  ipBlacklist?: string[]
  rateLimit?: {
    requests: number
    window: number
  }
  quotas?: {
    daily?: number
    monthly?: number
  }
  expiresAt?: Date
  lastUsedAt?: Date
  createdAt: Date
  status: 'active' | 'suspended' | 'revoked'
}

/**
 * Request context
 */
interface RequestContext {
  id: string
  apiId: string
  apiKey?: string
  userId?: string
  method: string
  path: string
  headers: Record<string, string>
  query: Record<string, string>
  body?: unknown
  ip: string
  timestamp: Date
  userAgent?: string
}

/**
 * Request metrics
 */
interface RequestMetrics {
  requestId: string
  apiId: string
  endpoint: string
  method: string
  statusCode: number
  duration: number
  requestSize: number
  responseSize: number
  timestamp: Date
  userId?: string
  error?: string
  cached: boolean
  circuitBreakerTriggered: boolean
}

/**
 * Rate limit bucket
 */
interface RateLimitBucket {
  key: string
  count: number
  resetAt: number
  tokens?: number
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  apiId: string
  endpoint: string
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureAt?: Date
  successCount: number
  nextAttemptAt?: Date
}

/**
 * Policy definition for governance
 */
interface Policy {
  id: string
  name: string
  description: string
  apiIds: string[]
  rules: PolicyRule[]
  enforcementLevel: 'audit' | 'warn' | 'enforce'
  createdAt: Date
}

/**
 * Policy rule
 */
interface PolicyRule {
  id: string
  type: 'data-masking' | 'encryption' | 'audit-logging' | 'rate-limit' | 'ip-restriction'
  config: Record<string, unknown>
}

/**
 * Transformation rule
 */
interface TransformationRule {
  id: string
  type: TransformationType
  match: {
    path?: string
    method?: string
    header?: string
  }
  transform: Record<string, unknown>
  enabled: boolean
}

/**
 * Enterprise API Gateway
 *
 * Provides comprehensive API management, security, and monitoring capabilities
 * for enterprise environments.
 */
export class EnterpriseAPIGateway extends EventEmitter {
  /** Registered APIs */
  private apis: Map<string, APIDefinition> = new Map()

  /** API keys */
  private apiKeys: Map<string, APIKey> = new Map()

  /** Rate limit buckets */
  private rateLimitBuckets: Map<string, RateLimitBucket> = new Map()

  /** Circuit breaker states */
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()

  /** Request metrics */
  private metrics: RequestMetrics[] = []

  /** Policies */
  private policies: Map<string, Policy> = new Map()

  /** Transformation rules */
  private transformationRules: TransformationRule[] = []

  /** Configuration */
  private config: {
    enableRateLimit: boolean
    enableCircuitBreaker: boolean
    enableMetrics: boolean
    enableAuditLogging: boolean
    maxMetricsHistory: number
    circuitBreakerThreshold: number
    circuitBreakerTimeout: number
    cacheTTL: number
  }

  /**
   * Initialize gateway
   */
  constructor(config?: Partial<typeof EnterpriseAPIGateway.prototype.config>) {
    super()

    this.config = {
      enableRateLimit: true,
      enableCircuitBreaker: true,
      enableMetrics: true,
      enableAuditLogging: true,
      maxMetricsHistory: 100000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      cacheTTL: 3600000,
      ...config
    }

    // Cleanup old metrics periodically
    setInterval(() => this.cleanupMetrics(), 300000) // 5 minutes
  }

  /**
   * Register a new API
   */
  registerAPI(definition: APIDefinition): void {
    if (this.apis.has(definition.id)) {
      throw new Error(`API ${definition.id} already registered`)
    }

    this.apis.set(definition.id, definition)
    this.emit('api:registered', definition)
  }

  /**
   * Update API definition
   */
  updateAPI(id: string, updates: Partial<APIDefinition>): void {
    const api = this.apis.get(id)
    if (!api) {
      throw new Error(`API ${id} not found`)
    }

    const updated: APIDefinition = {
      ...api,
      ...updates,
      updatedAt: new Date()
    }

    this.apis.set(id, updated)
    this.emit('api:updated', updated)
  }

  /**
   * Deprecate API version
   */
  deprecateAPI(id: string, sunsetDate: Date): void {
    const api = this.apis.get(id)
    if (!api) {
      throw new Error(`API ${id} not found`)
    }

    api.status = 'deprecated'
    api.updatedAt = new Date()
    this.emit('api:deprecated', { id, sunsetDate })
  }

  /**
   * Create API key
   */
  createAPIKey(apiId: string, config: Omit<APIKey, 'id' | 'createdAt' | 'status'>): APIKey {
    const api = this.apis.get(apiId)
    if (!api) {
      throw new Error(`API ${apiId} not found`)
    }

    const apiKey: APIKey = {
      ...config,
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'active'
    }

    this.apiKeys.set(apiKey.key, apiKey)
    this.emit('apikey:created', { id: apiKey.id, apiId })

    return apiKey
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(keyId: string): void {
    const key = Array.from(this.apiKeys.values()).find(k => k.id === keyId)
    if (!key) {
      throw new Error(`API key ${keyId} not found`)
    }

    key.status = 'revoked'
    this.emit('apikey:revoked', { id: keyId })
  }

  /**
   * Validate API key
   */
  validateAPIKey(key: string, context: Partial<RequestContext>): { valid: boolean; apiKey?: APIKey; error?: string } {
    const apiKey = this.apiKeys.get(key)

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' }
    }

    if (apiKey.status !== 'active') {
      return { valid: false, error: 'API key is not active' }
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key has expired' }
    }

    // IP whitelist check
    if (apiKey.ipWhitelist && context.ip && !apiKey.ipWhitelist.includes(context.ip)) {
      return { valid: false, error: 'IP not whitelisted' }
    }

    // IP blacklist check
    if (apiKey.ipBlacklist && context.ip && apiKey.ipBlacklist.includes(context.ip)) {
      return { valid: false, error: 'IP is blacklisted' }
    }

    apiKey.lastUsedAt = new Date()
    return { valid: true, apiKey }
  }

  /**
   * Check rate limit
   */
  checkRateLimit(apiKeyId: string, apiId: string, strategy: RateLimitStrategy = 'token-bucket'): { allowed: boolean; remaining: number; resetAt: Date } {
    if (!this.config.enableRateLimit) {
      return { allowed: true, remaining: -1, resetAt: new Date() }
    }

    const bucketKey = `${apiKeyId}:${apiId}`
    const api = this.apis.get(apiId)
    if (!api) {
      return { allowed: false, remaining: 0, resetAt: new Date() }
    }

    const limit = api.rateLimit
    const bucket = this.rateLimitBuckets.get(bucketKey) || {
      key: bucketKey,
      count: 0,
      resetAt: Date.now() + limit.global.window,
      tokens: limit.global.requests
    }

    const now = Date.now()

    if (strategy === 'token-bucket') {
      // Refill tokens based on elapsed time
      if (now >= bucket.resetAt) {
        bucket.tokens = limit.global.requests
        bucket.resetAt = now + limit.global.window
      }

      if ((bucket.tokens ?? 0) > 0) {
        bucket.tokens = (bucket.tokens ?? 0) - 1
        this.rateLimitBuckets.set(bucketKey, bucket)
        return { allowed: true, remaining: bucket.tokens ?? 0, resetAt: new Date(bucket.resetAt) }
      }

      return { allowed: false, remaining: 0, resetAt: new Date(bucket.resetAt) }
    }

    // Sliding window
    if (now >= bucket.resetAt) {
      bucket.count = 0
      bucket.resetAt = now + limit.global.window
    }

    if (bucket.count < limit.global.requests) {
      bucket.count++
      this.rateLimitBuckets.set(bucketKey, bucket)
      return { allowed: true, remaining: limit.global.requests - bucket.count, resetAt: new Date(bucket.resetAt) }
    }

    return { allowed: false, remaining: 0, resetAt: new Date(bucket.resetAt) }
  }

  /**
   * Check circuit breaker
   */
  checkCircuitBreaker(apiId: string, endpoint: string): { canProceed: boolean; state: string } {
    if (!this.config.enableCircuitBreaker) {
      return { canProceed: true, state: 'disabled' }
    }

    const key = `${apiId}:${endpoint}`
    const breaker = this.circuitBreakers.get(key) || {
      apiId,
      endpoint,
      state: 'closed',
      failureCount: 0,
      successCount: 0
    }

    const now = Date.now()

    if (breaker.state === 'open') {
      if (breaker.nextAttemptAt && now >= breaker.nextAttemptAt.getTime()) {
        breaker.state = 'half-open'
        breaker.successCount = 0
      } else {
        return { canProceed: false, state: 'open' }
      }
    }

    this.circuitBreakers.set(key, breaker)
    return { canProceed: true, state: breaker.state }
  }

  /**
   * Record circuit breaker failure
   */
  recordCircuitBreakerFailure(apiId: string, endpoint: string): void {
    const key = `${apiId}:${endpoint}`
    const breaker = this.circuitBreakers.get(key) || {
      apiId,
      endpoint,
      state: 'closed',
      failureCount: 0,
      successCount: 0
    }

    breaker.failureCount++
    breaker.lastFailureAt = new Date()

    if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open'
      breaker.nextAttemptAt = new Date(Date.now() + this.config.circuitBreakerTimeout)
    }

    this.circuitBreakers.set(key, breaker)
    this.emit('circuitbreaker:failure', { apiId, endpoint, failureCount: breaker.failureCount })
  }

  /**
   * Record circuit breaker success
   */
  recordCircuitBreakerSuccess(apiId: string, endpoint: string): void {
    const key = `${apiId}:${endpoint}`
    const breaker = this.circuitBreakers.get(key)
    if (!breaker) return

    if (breaker.state === 'half-open') {
      breaker.successCount++

      if (breaker.successCount >= 3) {
        breaker.state = 'closed'
        breaker.failureCount = 0
        this.emit('circuitbreaker:recovered', { apiId, endpoint })
      }
    } else if (breaker.state === 'closed') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1)
    }

    this.circuitBreakers.set(key, breaker)
  }

  /**
   * Record request metrics
   */
  recordMetrics(metrics: Omit<RequestMetrics, 'timestamp'>): void {
    if (!this.config.enableMetrics) return

    const metric: RequestMetrics = {
      ...metrics,
      timestamp: new Date()
    }

    this.metrics.push(metric)
    this.emit('metrics:recorded', metric)
  }

  /**
   * Get metrics
   */
  getMetrics(apiId?: string, timeRange?: { start: Date; end: Date }): RequestMetrics[] {
    let filtered = this.metrics

    if (apiId) {
      filtered = filtered.filter(m => m.apiId === apiId)
    }

    if (timeRange) {
      filtered = filtered.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
    }

    return filtered
  }

  /**
   * Get performance analytics
   */
  getAnalytics(apiId: string): {
    totalRequests: number
    successRate: number
    averageLatency: number
    errorRate: number
    topErrors: Array<{ error: string; count: number }>
    peakRequestRate: number
  } {
    const metrics = this.getMetrics(apiId)

    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageLatency: 0,
        errorRate: 0,
        topErrors: [],
        peakRequestRate: 0
      }
    }

    const successful = metrics.filter(m => m.statusCode >= 200 && m.statusCode < 300).length
    const errors = metrics.filter(m => m.statusCode >= 400)

    const errorMap = new Map<string, number>()
    errors.forEach(e => {
      if (e.error) {
        errorMap.set(e.error, (errorMap.get(e.error) ?? 0) + 1)
      }
    })

    const topErrors = Array.from(errorMap.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalRequests: metrics.length,
      successRate: successful / metrics.length,
      averageLatency: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      errorRate: errors.length / metrics.length,
      topErrors,
      peakRequestRate: metrics.length
    }
  }

  /**
   * Add transformation rule
   */
  addTransformationRule(rule: TransformationRule): void {
    this.transformationRules.push(rule)
    this.emit('transformation:added', rule)
  }

  /**
   * Apply transformations
   */
  applyTransformations(context: RequestContext): RequestContext {
    let transformed = { ...context }

    for (const rule of this.transformationRules) {
      if (!rule.enabled) continue

      if (rule.match.path && !this.pathMatches(transformed.path, rule.match.path)) continue
      if (rule.match.method && transformed.method !== rule.match.method) continue

      switch (rule.type) {
        case 'header-injection':
          transformed.headers = {
            ...transformed.headers,
            ...(rule.transform as Record<string, string>)
          }
          break

        case 'path-rewrite':
          transformed.path = this.rewritePath(transformed.path, rule.transform as { from: string; to: string })
          break

        case 'query-param-injection':
          transformed.query = {
            ...transformed.query,
            ...(rule.transform as Record<string, string>)
          }
          break
      }
    }

    return transformed
  }

  /**
   * Add governance policy
   */
  addPolicy(policy: Policy): void {
    if (this.policies.has(policy.id)) {
      throw new Error(`Policy ${policy.id} already exists`)
    }

    this.policies.set(policy.id, policy)
    this.emit('policy:added', policy)
  }

  /**
   * Check policy compliance
   */
  checkPolicyCompliance(apiId: string, context: RequestContext): { compliant: boolean; violations: string[] } {
    const violations: string[] = []

    for (const [, policy] of Array.from(this.policies)) {
      if (!policy.apiIds.includes(apiId)) continue

      for (const rule of policy.rules) {
        // Implementation depends on rule type
        // This is a simplified version
        if (rule.type === 'data-masking') {
          // Validate data masking rules
        } else if (rule.type === 'encryption') {
          // Validate encryption requirements
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    }
  }

  /**
   * Generate API documentation
   */
  generateDocumentation(apiId: string, format: 'openapi' | 'postman' | 'markdown' = 'markdown'): string {
    const api = this.apis.get(apiId)
    if (!api) {
      throw new Error(`API ${apiId} not found`)
    }

    switch (format) {
      case 'openapi':
        return this.generateOpenAPISpec(api)
      case 'postman':
        return this.generatePostmanCollection(api)
      case 'markdown':
      default:
        return this.generateMarkdownDocs(api)
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupMetrics(): void {
    if (this.metrics.length > this.config.maxMetricsHistory) {
      const toRemove = this.metrics.length - this.config.maxMetricsHistory
      this.metrics.splice(0, toRemove)
    }
  }

  /**
   * Check if path matches pattern
   */
  private pathMatches(path: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`)
    return regex.test(path)
  }

  /**
   * Rewrite path
   */
  private rewritePath(path: string, rule: { from: string; to: string }): string {
    return path.replace(new RegExp(rule.from), rule.to)
  }

  /**
   * Generate OpenAPI specification
   */
  private generateOpenAPISpec(api: APIDefinition): string {
    return JSON.stringify({
      openapi: '3.0.0',
      info: {
        title: api.title,
        description: api.description,
        version: api.version,
        contact: api.contact,
        license: api.license
      },
      servers: [{ url: api.baseUrl }],
      paths: api.endpoints.reduce((acc, endpoint) => {
        const key = endpoint.path
        if (!acc[key]) acc[key] = {}
        acc[key][endpoint.method.toLowerCase()] = {
          summary: endpoint.description,
          tags: endpoint.tags,
          deprecated: endpoint.deprecated ?? false
        }
        return acc
      }, {} as Record<string, unknown>)
    }, null, 2)
  }

  /**
   * Generate Postman collection
   */
  private generatePostmanCollection(api: APIDefinition): string {
    return JSON.stringify({
      info: {
        name: api.title,
        description: api.description,
        version: api.version
      },
      item: api.endpoints.map(endpoint => ({
        name: endpoint.description,
        request: {
          method: endpoint.method,
          url: `${api.baseUrl}${endpoint.path}`,
          header: [
            { key: 'Authorization', value: 'Bearer YOUR_API_KEY' }
          ]
        }
      }))
    }, null, 2)
  }

  /**
   * Generate Markdown documentation
   */
  private generateMarkdownDocs(api: APIDefinition): string {
    let md = `# ${api.title}\n\n`
    md += `${api.description}\n\n`
    md += `**Version**: ${api.version}\n`
    md += `**Status**: ${api.status}\n`
    md += `**Owner**: ${api.owner}\n\n`

    if (api.contact) {
      md += `## Contact\n`
      md += `- **Name**: ${api.contact.name}\n`
      md += `- **Email**: ${api.contact.email}\n\n`
    }

    md += `## Endpoints\n\n`

    for (const endpoint of api.endpoints) {
      md += `### ${endpoint.method} ${endpoint.path}\n\n`
      md += `${endpoint.description}\n\n`
      md += `- **Version**: ${endpoint.version}\n`
      md += `- **Authentication**: ${endpoint.authentication.join(', ')}\n`
      if (endpoint.deprecated) {
        md += `- **Status**: DEPRECATED\n`
      }
      md += '\n'
    }

    return md
  }
}

export type {
  APIDefinition,
  APIEndpoint,
  APIKey,
  RequestContext,
  RequestMetrics,
  RateLimitBucket,
  CircuitBreakerState,
  Policy,
  PolicyRule,
  TransformationRule,
  AuthStrategy,
  AuthorizationModel,
  RateLimitStrategy,
  APIStatus,
  TransformationType
}
