/**
 * SIEM Stream Manager Service
 * Handles real-time event streaming to multiple SIEM platforms
 * Features: buffering, batching, compression, retry logic, and health monitoring
 */

import zlib from 'zlib'
import { EventEmitter } from 'events'
import EventNormalizer, { WorkflowEvent, CEFEvent, LEEFEvent, ECSEvent, SyslogEvent } from './EventNormalizer'

/**
 * Stream destination configuration
 */
export interface StreamDestination {
  id: string
  name: string
  type: 'splunk' | 'datadog' | 'elastic' | 'sumologic' | 'cribl' | 'azure_sentinel'
  enabled: boolean
  config: {
    endpoint: string
    apiKey: string
    format: 'cef' | 'leef' | 'ecs' | 'syslog'
    batchSize?: number
    flushIntervalMs?: number
    compressionEnabled?: boolean
    samplingRate?: number // 0.0 to 1.0
  }
  filterRules?: FilterRule[]
  priority?: number // 1-10, higher = more important
}

/**
 * Event filter rule
 */
export interface FilterRule {
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'regex' | 'in'
  value: string | string[] | RegExp
  negate?: boolean
}

/**
 * Stream buffer entry
 */
interface BufferEntry {
  event: WorkflowEvent
  formatted?: string
  timestamp: number
  retryCount: number
}

/**
 * Stream metrics
 */
export interface StreamMetrics {
  destinationId: string
  eventsSent: number
  eventsFailed: number
  successRate: number
  averageLatency: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  throughput: number
  bufferSize: number
  lastEventTime?: number
}

/**
 * Stream health status
 */
export interface StreamHealth {
  destinationId: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastChecked: number
  failureCount: number
  successCount: number
  errorRate: number
  nextRetry?: number
}

/**
 * Dead letter queue entry
 */
export interface DeadLetterEntry {
  id: string
  destinationId: string
  event: WorkflowEvent
  error: string
  timestamp: number
  retryAttempts: number
}

/**
 * Stream checkpoint for replay
 */
export interface StreamCheckpoint {
  destinationId: string
  lastEventId: string
  lastTimestamp: number
  bufferPosition: number
}

/**
 * Compressed batch
 */
interface CompressedBatch {
  data: Buffer
  originalSize: number
  compressedSize: number
  timestamp: number
}

/**
 * SIEM Stream Manager
 * Manages real-time streaming to multiple SIEM platforms
 */
export class StreamManager extends EventEmitter {
  private normalizer: EventNormalizer
  private destinations: Map<string, StreamDestination> = new Map()
  private buffers: Map<string, BufferEntry[]> = new Map()
  private metrics: Map<string, StreamMetrics> = new Map()
  private health: Map<string, StreamHealth> = new Map()
  private deadLetterQueue: DeadLetterEntry[] = []
  private checkpoints: Map<string, StreamCheckpoint> = new Map()
  private flushTimers: Map<string, NodeJS.Timeout> = new Map()
  private isProcessing: Map<string, boolean> = new Map()

  private readonly DEFAULT_BUFFER_SIZE = 10_000
  private readonly DEFAULT_BATCH_SIZE = 100
  private readonly DEFAULT_FLUSH_INTERVAL_MS = 5_000
  private readonly COMPRESSION_THRESHOLD = 1_024 // 1KB
  private readonly MAX_RETRIES = 3
  private readonly RETRY_BACKOFF_MS = 1_000
  private readonly HEALTH_CHECK_INTERVAL_MS = 30_000
  private readonly METRICS_WINDOW_MS = 60_000

  constructor(normalizer?: EventNormalizer) {
    super()
    this.normalizer = normalizer || new EventNormalizer()
    this.setupHealthCheck()
  }

  /**
   * Register a stream destination
   */
  registerDestination(destination: StreamDestination): void {
    if (this.destinations.has(destination.id)) {
      throw new Error(`Destination ${destination.id} already registered`)
    }

    this.destinations.set(destination.id, destination)
    this.buffers.set(destination.id, [])
    this.metrics.set(destination.id, {
      destinationId: destination.id,
      eventsSent: 0,
      eventsFailed: 0,
      successRate: 1.0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
      bufferSize: 0
    })
    this.health.set(destination.id, {
      destinationId: destination.id,
      status: 'healthy',
      lastChecked: Date.now(),
      failureCount: 0,
      successCount: 0,
      errorRate: 0
    })

    this.emit('destination:registered', destination)
  }

  /**
   * Unregister a stream destination
   */
  unregisterDestination(destinationId: string): void {
    this.destinations.delete(destinationId)
    this.buffers.delete(destinationId)
    this.metrics.delete(destinationId)
    this.health.delete(destinationId)

    const timer = this.flushTimers.get(destinationId)
    if (timer) {
      clearTimeout(timer)
      this.flushTimers.delete(destinationId)
    }

    this.emit('destination:unregistered', destinationId)
  }

  /**
   * Stream event to all enabled destinations
   */
  async streamEvent(event: WorkflowEvent): Promise<void> {
    for (const [destId, destination] of this.destinations) {
      if (!destination.enabled) continue

      // Apply sampling
      if (!this.shouldSample(destination.config.samplingRate)) continue

      // Apply filters
      if (!this.matchesFilters(event, destination.filterRules)) continue

      // Add to buffer
      const buffer = this.buffers.get(destId)
      if (buffer && buffer.length < this.DEFAULT_BUFFER_SIZE) {
        buffer.push({
          event,
          timestamp: Date.now(),
          retryCount: 0
        })

        // Update buffer size metric
        const metrics = this.metrics.get(destId)
        if (metrics) {
          metrics.bufferSize = buffer.length
        }

        // Trigger flush if batch size reached
        if (buffer.length >= (destination.config.batchSize || this.DEFAULT_BATCH_SIZE)) {
          this.flushBuffer(destId).catch((err) => {
            this.emit('error', {
              destinationId: destId,
              error: err,
              context: 'auto-flush'
            })
          })
        } else if (!this.flushTimers.has(destId)) {
          // Schedule flush
          const flushInterval = destination.config.flushIntervalMs || this.DEFAULT_FLUSH_INTERVAL_MS
          const timer = setTimeout(() => {
            this.flushTimers.delete(destId)
            this.flushBuffer(destId).catch((err) => {
              this.emit('error', {
                destinationId: destId,
                error: err,
                context: 'scheduled-flush'
              })
            })
          }, flushInterval)
          this.flushTimers.set(destId, timer)
        }
      } else if (buffer) {
        // Buffer overflow - add to dead letter queue
        this.addToDeadLetterQueue(destId, event, 'Buffer overflow')
      }
    }
  }

  /**
   * Flush buffered events to destination
   */
  async flushBuffer(destinationId: string): Promise<void> {
    const destination = this.destinations.get(destinationId)
    if (!destination || !destination.enabled) return

    // Prevent concurrent flushes
    if (this.isProcessing.get(destinationId)) return
    this.isProcessing.set(destinationId, true)

    try {
      const buffer = this.buffers.get(destinationId)
      if (!buffer || buffer.length === 0) return

      // Clear scheduled flush timer
      const timer = this.flushTimers.get(destinationId)
      if (timer) {
        clearTimeout(timer)
        this.flushTimers.delete(destinationId)
      }

      const batch = buffer.splice(0, destination.config.batchSize || this.DEFAULT_BATCH_SIZE)
      const latencies: number[] = []

      // Format events
      const formattedBatch = await Promise.all(
        batch.map(async (entry) => {
          const startTime = Date.now()
          try {
            const formatted = await this.formatEvent(entry.event, destination.config.format)
            const latency = Date.now() - startTime
            latencies.push(latency)
            return formatted
          } catch (error) {
            this.addToDeadLetterQueue(
              destinationId,
              entry.event,
              `Format error: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return null
          }
        })
      )

      const validBatch = formattedBatch.filter((item) => item !== null) as string[]
      if (validBatch.length === 0) return

      // Combine batch
      const batchData = validBatch.join('\n')

      // Compress if enabled and large enough
      let payload: Buffer | string = batchData
      if (destination.config.compressionEnabled && batchData.length > this.COMPRESSION_THRESHOLD) {
        payload = await this.compressData(batchData)
      }

      // Send to destination
      const sendStartTime = Date.now()
      await this.sendBatch(destinationId, destination, payload)
      const sendLatency = Date.now() - sendStartTime

      // Update metrics
      this.updateMetrics(destinationId, validBatch.length, latencies, sendLatency)

      // Update checkpoint
      if (batch.length > 0) {
        const lastEntry = batch[batch.length - 1]
        this.checkpoints.set(destinationId, {
          destinationId,
          lastEventId: lastEntry.event.id,
          lastTimestamp: lastEntry.event.timestamp,
          bufferPosition: batch.length
        })
      }

      this.emit('batch:sent', {
        destinationId,
        count: validBatch.length,
        size: payload instanceof Buffer ? payload.length : payload.length
      })
    } catch (error) {
      this.emit('error', {
        destinationId,
        error,
        context: 'flush'
      })
    } finally {
      this.isProcessing.set(destinationId, false)
    }
  }

  /**
   * Send batch to destination with retry logic
   */
  private async sendBatch(
    destinationId: string,
    destination: StreamDestination,
    payload: Buffer | string
  ): Promise<void> {
    let lastError: Error | undefined
    let retries = 0

    while (retries < this.MAX_RETRIES) {
      try {
        // In production, this would use HTTP client (axios, fetch, etc.)
        // Here we simulate the request
        await this.simulateHTTPRequest(destination.config.endpoint, payload, destination.config.apiKey)

        // Update health status
        const health = this.health.get(destinationId)
        if (health) {
          health.status = 'healthy'
          health.failureCount = 0
          health.successCount++
          health.errorRate = health.failureCount / (health.failureCount + health.successCount)
          health.lastChecked = Date.now()
        }

        return
      } catch (error) {
        lastError = error as Error
        retries++

        if (retries < this.MAX_RETRIES) {
          // Exponential backoff
          const backoff = this.RETRY_BACKOFF_MS * Math.pow(2, retries - 1)
          await this.delay(backoff)
        }

        // Update health status
        const health = this.health.get(destinationId)
        if (health) {
          health.failureCount++
          health.errorRate = health.failureCount / (health.failureCount + health.successCount)
          if (health.failureCount >= 3) {
            health.status = 'unhealthy'
            health.nextRetry = Date.now() + 60_000
          } else {
            health.status = 'degraded'
          }
          health.lastChecked = Date.now()
        }
      }
    }

    throw lastError || new Error('Failed to send batch after max retries')
  }

  /**
   * Format event based on destination format
   */
  private async formatEvent(event: WorkflowEvent, format: 'cef' | 'leef' | 'ecs' | 'syslog'): Promise<string> {
    switch (format) {
      case 'cef': {
        const cef = await this.normalizer.toCEF(event)
        return cef.raw
      }
      case 'leef': {
        const leef = await this.normalizer.toLEEF(event)
        return leef.raw
      }
      case 'ecs': {
        const ecs = await this.normalizer.toECS(event)
        return JSON.stringify(ecs)
      }
      case 'syslog': {
        const syslog = await this.normalizer.toSyslog(event)
        return syslog.raw
      }
    }
  }

  /**
   * Compress data using gzip
   */
  private async compressData(data: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (error, compressed) => {
        if (error) reject(error)
        else resolve(compressed)
      })
    })
  }

  /**
   * Simulate HTTP request to destination
   */
  private async simulateHTTPRequest(endpoint: string, payload: Buffer | string, apiKey: string): Promise<void> {
    // In production implementation, use axios or fetch
    // const response = await axios.post(endpoint, payload, {
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': payload instanceof Buffer ? 'application/octet-stream' : 'text/plain',
    //     'X-Workflow-Signature': this.generateSignature(payload, apiKey)
    //   }
    // })
    // if (response.status < 200 || response.status >= 300) {
    //   throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    // }

    // For now, just validate the parameters
    if (!endpoint || !apiKey) {
      throw new Error('Invalid endpoint or API key')
    }
  }

  /**
   * Generate HMAC signature for payload
   */
  private generateSignature(payload: Buffer | string, secret: string): string {
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload instanceof Buffer ? payload : Buffer.from(payload))
    return hmac.digest('hex')
  }

  /**
   * Update stream metrics
   */
  private updateMetrics(destinationId: string, eventCount: number, latencies: number[], sendLatency: number): void {
    const metrics = this.metrics.get(destinationId)
    if (!metrics) return

    const allLatencies = [...latencies, sendLatency]
    allLatencies.sort((a, b) => a - b)

    metrics.eventsSent += eventCount
    metrics.successRate = metrics.eventsSent / (metrics.eventsSent + metrics.eventsFailed)
    metrics.averageLatency =
      (metrics.averageLatency * (metrics.eventsSent - eventCount) + allLatencies.reduce((a, b) => a + b, 0)) /
      metrics.eventsSent
    metrics.p50Latency = allLatencies[Math.floor(allLatencies.length * 0.5)]
    metrics.p95Latency = allLatencies[Math.floor(allLatencies.length * 0.95)]
    metrics.p99Latency = allLatencies[Math.floor(allLatencies.length * 0.99)]
    metrics.throughput = eventCount / (sendLatency / 1_000) // events/sec
    metrics.lastEventTime = Date.now()
  }

  /**
   * Add event to dead letter queue
   */
  private addToDeadLetterQueue(destinationId: string, event: WorkflowEvent, error: string): void {
    const dlqEntry: DeadLetterEntry = {
      id: `dlq_${Date.now()}_${Math.random()}`,
      destinationId,
      event,
      error,
      timestamp: Date.now(),
      retryAttempts: 0
    }

    this.deadLetterQueue.push(dlqEntry)

    // Keep DLQ size bounded
    if (this.deadLetterQueue.length > 10_000) {
      this.deadLetterQueue.shift()
    }

    this.emit('event:dead-lettered', dlqEntry)
  }

  /**
   * Replay events from dead letter queue
   */
  async replayDeadLetterQueue(limit: number = 100): Promise<number> {
    let replayed = 0

    for (let i = 0; i < Math.min(limit, this.deadLetterQueue.length); i++) {
      const entry = this.deadLetterQueue[i]
      entry.retryAttempts++

      try {
        await this.streamEvent(entry.event)
        this.deadLetterQueue.splice(i, 1)
        replayed++
      } catch (error) {
        // Keep in DLQ and continue
      }
    }

    return replayed
  }

  /**
   * Check if event should be sampled
   */
  private shouldSample(samplingRate: number = 1.0): boolean {
    if (samplingRate >= 1.0) return true
    if (samplingRate <= 0) return false
    return Math.random() < samplingRate
  }

  /**
   * Match event against filter rules
   */
  private matchesFilters(event: WorkflowEvent, rules?: FilterRule[]): boolean {
    if (!rules || rules.length === 0) return true

    return rules.every((rule) => {
      const value = this.getFieldValue(event, rule.field)
      let matches = false

      switch (rule.operator) {
        case 'equals':
          matches = String(value) === String(rule.value)
          break
        case 'contains':
          matches = String(value).includes(String(rule.value))
          break
        case 'startsWith':
          matches = String(value).startsWith(String(rule.value))
          break
        case 'regex':
          matches = (rule.value as RegExp).test(String(value))
          break
        case 'in':
          matches = (rule.value as string[]).includes(String(value))
          break
      }

      return rule.negate ? !matches : matches
    })
  }

  /**
   * Get nested field value from event
   */
  private getFieldValue(event: WorkflowEvent, field: string): unknown {
    const parts = field.split('.')
    let value: unknown = event

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * Setup health check interval
   */
  private setupHealthCheck(): void {
    setInterval(() => {
      for (const [destId, health] of this.health) {
        // Check if destination can be retried
        if (health.status === 'unhealthy' && health.nextRetry && Date.now() >= health.nextRetry) {
          health.status = 'degraded'
          health.nextRetry = undefined
          this.emit('health:recovered', destId)
        }
      }
    }, this.HEALTH_CHECK_INTERVAL_MS)
  }

  /**
   * Get stream metrics
   */
  getMetrics(destinationId?: string): StreamMetrics | StreamMetrics[] {
    if (destinationId) {
      const metrics = this.metrics.get(destinationId)
      if (!metrics) throw new Error(`Unknown destination: ${destinationId}`)
      return metrics
    }

    return Array.from(this.metrics.values())
  }

  /**
   * Get stream health status
   */
  getHealth(destinationId?: string): StreamHealth | StreamHealth[] {
    if (destinationId) {
      const health = this.health.get(destinationId)
      if (!health) throw new Error(`Unknown destination: ${destinationId}`)
      return health
    }

    return Array.from(this.health.values())
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(limit: number = 100): DeadLetterEntry[] {
    return this.deadLetterQueue.slice(0, limit)
  }

  /**
   * Get stream checkpoint
   */
  getCheckpoint(destinationId: string): StreamCheckpoint | undefined {
    return this.checkpoints.get(destinationId)
  }

  /**
   * Utility function: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Flush all buffers and cleanup
   */
  async shutdown(): Promise<void> {
    // Clear all timers
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer)
    }
    this.flushTimers.clear()

    // Flush all buffers
    for (const destinationId of this.destinations.keys()) {
      await this.flushBuffer(destinationId)
    }

    this.removeAllListeners()
  }
}

export default StreamManager
