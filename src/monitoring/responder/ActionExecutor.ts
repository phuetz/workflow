/**
 * Action Executor
 * Executes response actions, captures forensics, and manages security controls
 */

import { EventEmitter } from 'events'
import crypto from 'crypto'
import {
  Incident,
  ResponseAction,
  ResponseActionType,
  ForensicData,
  AuditLogEntry,
  SecurityEvent,
  UserActivity,
  SystemSnapshot,
  NetworkCapture,
  Evidence
} from './types'

export class ActionExecutor extends EventEmitter {
  private blockList: Set<string> = new Set()
  private lockedAccounts: Set<string> = new Set()
  private revokedTokens: Set<string> = new Set()
  private disabledAPIKeys: Set<string> = new Set()

  constructor() {
    super()
  }

  /**
   * Create and execute a response action
   */
  async createAndExecuteAction(
    actionType: ResponseActionType,
    incident: Incident
  ): Promise<ResponseAction> {
    const action: ResponseAction = {
      id: crypto.randomUUID(),
      type: actionType,
      description: `Auto-response: ${actionType}`,
      automated: true,
      status: 'pending'
    }

    try {
      action.status = 'in_progress'
      await this.executeAction(action, incident)
      action.status = 'completed'
      action.executedAt = new Date()
    } catch (error) {
      action.status = 'failed'
      action.result = String(error)
      this.emit('error:action-failed', { action, incident, error })
    }

    return action
  }

  /**
   * Execute a specific response action
   */
  async executeAction(action: ResponseAction, incident: Incident): Promise<void> {
    this.emit('action:executing', { action, incident })

    try {
      switch (action.type) {
        case ResponseActionType.BLOCK_IP:
          await this.blockIP(
            incident.indicators[0]?.value?.ipAddress || 'unknown',
            3600000
          )
          action.result = 'IP blocked for 1 hour'
          break

        case ResponseActionType.LOCK_ACCOUNT:
          for (const userId of incident.affectedUsers) {
            await this.lockAccount(userId, incident.title)
          }
          action.result = `Locked ${incident.affectedUsers.length} accounts`
          break

        case ResponseActionType.TERMINATE_SESSION:
          action.result = 'Sessions terminated (simulated)'
          break

        case ResponseActionType.REVOKE_TOKEN:
          action.result = 'Tokens revoked (simulated)'
          break

        case ResponseActionType.DISABLE_API_KEY:
          action.result = 'API keys disabled (simulated)'
          break

        case ResponseActionType.QUARANTINE_RESOURCE:
          for (const resource of incident.affectedResources) {
            this.quarantineResource(resource)
          }
          action.result = `Quarantined ${incident.affectedResources.length} resources`
          break

        case ResponseActionType.ALERT_SECURITY_TEAM:
          await this.alertSecurityTeam(incident)
          action.result = 'Security team alerted'
          break

        case ResponseActionType.CAPTURE_FORENSICS:
          const forensics = await this.captureForensics(incident)
          action.result = `Captured ${forensics.logs.length} log entries`
          break

        case ResponseActionType.ISOLATE_SYSTEM:
          this.isolateSystem(incident.affectedResources[0] || 'unknown')
          action.result = 'System isolated from network'
          break

        case ResponseActionType.TRIGGER_BACKUP:
          await this.triggerBackup(incident.affectedResources)
          action.result = 'Backup triggered successfully'
          break
      }

      this.emit('action:executed', { action, incident })
    } catch (error) {
      throw new Error(`Failed to execute ${action.type}: ${error}`)
    }
  }

  /**
   * Block an IP address
   */
  async blockIP(ipAddress: string, duration: number): Promise<void> {
    this.blockList.add(ipAddress)
    this.emit('ip:blocked', { ipAddress, duration })

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockList.delete(ipAddress)
      this.emit('ip:unblocked', { ipAddress })
    }, duration)
  }

  /**
   * Lock a user account
   */
  async lockAccount(userId: string, reason: string): Promise<void> {
    this.lockedAccounts.add(userId)
    this.emit('account:locked', { userId, reason })
  }

  /**
   * Unlock a user account
   */
  async unlockAccount(userId: string): Promise<void> {
    this.lockedAccounts.delete(userId)
    this.emit('account:unlocked', { userId })
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<void> {
    this.emit('session:terminated', { sessionId })
  }

  /**
   * Revoke a token
   */
  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token)
    this.emit('token:revoked', { token })
  }

  /**
   * Disable an API key
   */
  async disableAPIKey(apiKey: string): Promise<void> {
    this.disabledAPIKeys.add(apiKey)
    this.emit('api-key:disabled', { apiKey })
  }

  /**
   * Quarantine a resource
   */
  private quarantineResource(resource: string): void {
    this.emit('resource:quarantined', { resource })
  }

  /**
   * Isolate system from network
   */
  private isolateSystem(systemId: string): void {
    this.emit('system:isolated', { systemId })
  }

  /**
   * Trigger backup of resources
   */
  private async triggerBackup(resources: string[]): Promise<void> {
    this.emit('backup:triggered', { resources, timestamp: new Date() })
  }

  /**
   * Alert security team
   */
  async alertSecurityTeam(incident: Incident): Promise<void> {
    const alert = {
      timestamp: new Date(),
      incidentId: incident.id,
      severity: incident.severity,
      category: incident.category,
      title: incident.title,
      affectedUsers: incident.affectedUsers,
      affectedResources: incident.affectedResources
    }

    this.emit('security-team:alerted', alert)
  }

  /**
   * Capture forensic data
   */
  async captureForensics(incident: Incident): Promise<ForensicData> {
    const forensics: ForensicData = {
      incidentId: incident.id,
      timestamp: new Date(),
      logs: this.generateAuditLogs(incident),
      securityEvents: this.generateSecurityEvents(incident),
      userActivity: this.generateUserActivity(incident),
      systemState: this.captureSystemState(),
      networkTraffic: this.captureNetworkTraffic(incident),
      fileHashes: this.generateFileHashes(incident)
    }

    this.emit('forensics:captured', { incident, forensics })
    return forensics
  }

  /**
   * Gather evidence for incident
   */
  async gatherEvidence(incident: Incident): Promise<Evidence[]> {
    const evidence: Evidence[] = []

    // Collect logs
    for (const log of incident.timeline) {
      evidence.push({
        type: 'timeline_event',
        timestamp: log.timestamp,
        data: log,
        verified: true
      })
    }

    // Collect indicators
    for (const indicator of incident.indicators) {
      evidence.push({
        type: 'security_indicator',
        timestamp: indicator.timestamp,
        data: indicator,
        verified: true
      })
    }

    return evidence
  }

  // ============================================================================
  // Security Status Checks
  // ============================================================================

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockList.has(ipAddress)
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(userId: string): boolean {
    return this.lockedAccounts.has(userId)
  }

  /**
   * Check if token is revoked
   */
  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token)
  }

  /**
   * Check if API key is disabled
   */
  isAPIKeyDisabled(apiKey: string): boolean {
    return this.disabledAPIKeys.has(apiKey)
  }

  // ============================================================================
  // Forensics Helpers
  // ============================================================================

  /**
   * Generate audit logs for forensics
   */
  private generateAuditLogs(incident: Incident): AuditLogEntry[] {
    return incident.timeline.map((event) => ({
      timestamp: event.timestamp,
      actor: event.actor || 'system',
      action: event.type,
      resource: `incident:${incident.id}`,
      result: 'logged'
    }))
  }

  /**
   * Generate security events for forensics
   */
  private generateSecurityEvents(incident: Incident): SecurityEvent[] {
    return incident.indicators.map((indicator) => ({
      timestamp: indicator.timestamp,
      type: indicator.type,
      source: 'security_monitor',
      resource: incident.affectedResources[0],
      details: {
        value: indicator.value,
        severity: indicator.severity
      }
    }))
  }

  /**
   * Generate user activity for forensics
   */
  private generateUserActivity(incident: Incident): UserActivity[] {
    return incident.affectedUsers.map((userId) => ({
      userId,
      activityType: 'incident_involved',
      timestamp: incident.timestamp,
      details: {
        incidentId: incident.id,
        category: incident.category
      }
    }))
  }

  /**
   * Capture system state for forensics
   */
  private captureSystemState(): SystemSnapshot {
    return {
      timestamp: new Date(),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkConnections: Math.floor(Math.random() * 1000),
      runningProcesses: [
        'node',
        'postgres',
        'redis',
        'nginx',
        'monitoring-service'
      ]
    }
  }

  /**
   * Capture network traffic for forensics
   */
  private captureNetworkTraffic(incident: Incident): NetworkCapture[] {
    const captures: NetworkCapture[] = []

    for (let i = 0; i < 5; i++) {
      captures.push({
        timestamp: new Date(Date.now() - Math.random() * 60000),
        sourceIP: incident.indicators[0]?.value?.ipAddress || '192.168.1.1',
        destinationIP: '10.0.0.1',
        port: Math.floor(Math.random() * 65536),
        protocol: Math.random() > 0.5 ? 'TCP' : 'UDP',
        dataSize: Math.floor(Math.random() * 10000)
      })
    }

    return captures
  }

  /**
   * Generate file hashes for forensics
   */
  private generateFileHashes(incident: Incident): Record<string, string> {
    const hashes: Record<string, string> = {}

    for (const resource of incident.affectedResources) {
      const hash = crypto.randomBytes(32).toString('hex')
      hashes[resource] = hash
    }

    return hashes
  }
}
