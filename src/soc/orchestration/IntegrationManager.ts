/**
 * IntegrationManager - Manages security system integrations
 *
 * @module soc/orchestration/IntegrationManager
 */

import { EventEmitter } from 'events'
import {
  IntegrationSystem,
  IntegrationConfig,
  IntegrationHealth
} from './types'

export class IntegrationManager extends EventEmitter {
  private integrations: Map<IntegrationSystem, IntegrationConfig> = new Map()
  private integrationHealth: Map<IntegrationSystem, IntegrationHealth> = new Map()
  private healthCheckIntervalMs: number
  private healthCheckTimer?: NodeJS.Timeout

  constructor(healthCheckIntervalMs: number = 60000) {
    super()
    this.healthCheckIntervalMs = healthCheckIntervalMs
  }

  /**
   * Integrate a security system
   */
  public integrateSystem(config: IntegrationConfig): void {
    this.integrations.set(config.system, config)
    this.integrationHealth.set(config.system, {
      system: config.system,
      status: 'unknown',
      latency: 0,
      lastCheck: new Date(),
      errorCount: 0,
      successRate: 100
    })

    this.emit('integration:registered', { system: config.system, name: config.name })

    // Perform initial health check
    this.checkIntegrationHealth(config.system)
  }

  /**
   * Simulate health check (placeholder for actual API calls)
   */
  private async simulateHealthCheck(_config: IntegrationConfig): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
    // Simulate 95% success rate
    if (Math.random() < 0.05) {
      throw new Error('Health check failed')
    }
  }

  /**
   * Check health of a specific integration
   */
  public async checkIntegrationHealth(system: IntegrationSystem): Promise<IntegrationHealth> {
    const config = this.integrations.get(system)
    if (!config) {
      return {
        system,
        status: 'unhealthy' as const,
        latency: 0,
        lastCheck: new Date(),
        errorCount: 0,
        successRate: 0
      }
    }

    const startTime = Date.now()
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy'
    let errorCount = 0

    try {
      // Simulate health check (in production, would make actual API call)
      await this.simulateHealthCheck(config)
      status = 'healthy'
    } catch (_error) {
      errorCount++
      const existingHealth = this.integrationHealth.get(system)
      if (existingHealth && existingHealth.errorCount >= 3) {
        status = 'unhealthy'
      } else {
        status = 'degraded'
      }
    }

    const health: IntegrationHealth = {
      system,
      status,
      latency: Date.now() - startTime,
      lastCheck: new Date(),
      errorCount: (this.integrationHealth.get(system)?.errorCount || 0) + errorCount,
      successRate: status === 'healthy' ? 100 : status === 'degraded' ? 75 : 0
    }

    this.integrationHealth.set(system, health)
    config.lastHealthCheck = new Date()
    config.healthStatus = status

    if (status !== 'healthy') {
      this.emit('integration:unhealthy', { system, health })
    }

    return health
  }

  /**
   * Check health of all integrations
   */
  public async checkHealth(): Promise<Map<IntegrationSystem, IntegrationHealth>> {
    const results = new Map<IntegrationSystem, IntegrationHealth>()

    for (const [system, config] of Array.from(this.integrations.entries())) {
      if (!config.enabled) continue

      const health = await this.checkIntegrationHealth(system)
      results.set(system, health)
    }

    return results
  }

  /**
   * Start health monitoring
   */
  public startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth().catch(err => this.emit('error', err))
    }, this.healthCheckIntervalMs)
  }

  /**
   * Stop health monitoring
   */
  public stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }
  }

  /**
   * Get integration by system type
   */
  public getIntegration(system: IntegrationSystem): IntegrationConfig | undefined {
    return this.integrations.get(system)
  }

  /**
   * Get all integrations
   */
  public getIntegrations(): IntegrationConfig[] {
    return Array.from(this.integrations.values())
  }

  /**
   * Get integration health
   */
  public getIntegrationHealth(system: IntegrationSystem): IntegrationHealth | undefined {
    return this.integrationHealth.get(system)
  }

  /**
   * Get all integration health statuses
   */
  public getAllIntegrationHealth(): Map<IntegrationSystem, IntegrationHealth> {
    return new Map(this.integrationHealth)
  }

  /**
   * Clear all data and stop timers
   */
  public clear(): void {
    this.stopHealthMonitoring()
    this.integrations.clear()
    this.integrationHealth.clear()
  }
}
