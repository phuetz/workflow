/**
 * ContainmentManager - Handles threat containment actions
 *
 * @module soc/orchestration/ContainmentManager
 */

import { EventEmitter } from 'events'
import { randomBytes } from 'crypto'
import {
  ContainmentAction,
  ContainmentType,
  ContainmentRequest,
  SecurityIncident,
  ThreatSeverity
} from './types'

export class ContainmentManager extends EventEmitter {
  private containmentRegistry: Map<string, ContainmentAction> = new Map()
  private pendingApprovals: Map<string, { type: 'containment'; actionId: string; incidentId: string }> = new Map()

  constructor() {
    super()
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`
  }

  /**
   * Check if containment type is rollbackable
   */
  private isContainmentRollbackable(type: ContainmentType): boolean {
    const rollbackable = [
      ContainmentType.ISOLATE_HOST,
      ContainmentType.BLOCK_IP,
      ContainmentType.BLOCK_DOMAIN,
      ContainmentType.DISABLE_USER,
      ContainmentType.DISABLE_SERVICE,
      ContainmentType.LOCK_ACCOUNT,
      ContainmentType.RESTRICT_PERMISSIONS
    ]
    return rollbackable.includes(type)
  }

  /**
   * Update asset containment status
   */
  private updateAssetContainmentStatus(
    incident: SecurityIncident,
    target: string,
    status: ContainmentAction['status']
  ): void {
    for (const asset of incident.affectedAssets) {
      if (asset.identifier === target) {
        if (status === 'active') {
          asset.containmentStatus = 'full'
        } else if (status === 'released') {
          asset.containmentStatus = 'released'
        }
      }
    }
  }

  // Containment action implementations (simulated)
  private async isolateHost(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async blockIP(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async blockDomain(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async disableUser(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async revokeSessions(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async quarantineFile(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async blockNetworkSegment(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async disableService(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async revokeAPIKeys(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async lockAccount(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async restrictPermissions(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * Execute a containment action
   */
  private async executeContainment(action: ContainmentAction, incident: SecurityIncident): Promise<void> {
    this.emit('containment:executing', { action, incidentId: incident.id })

    switch (action.type) {
      case ContainmentType.ISOLATE_HOST:
        await this.isolateHost(action.target)
        break
      case ContainmentType.BLOCK_IP:
        await this.blockIP(action.target)
        break
      case ContainmentType.BLOCK_DOMAIN:
        await this.blockDomain(action.target)
        break
      case ContainmentType.DISABLE_USER:
        await this.disableUser(action.target)
        break
      case ContainmentType.REVOKE_SESSIONS:
        await this.revokeSessions(action.target)
        break
      case ContainmentType.QUARANTINE_FILE:
        await this.quarantineFile(action.target)
        break
      case ContainmentType.BLOCK_NETWORK_SEGMENT:
        await this.blockNetworkSegment(action.target)
        break
      case ContainmentType.DISABLE_SERVICE:
        await this.disableService(action.target)
        break
      case ContainmentType.REVOKE_API_KEYS:
        await this.revokeAPIKeys(action.target)
        break
      case ContainmentType.LOCK_ACCOUNT:
        await this.lockAccount(action.target)
        break
      case ContainmentType.RESTRICT_PERMISSIONS:
        await this.restrictPermissions(action.target)
        break
      default:
        throw new Error(`Unknown containment type: ${action.type}`)
    }

    this.emit('containment:executed', { action, incidentId: incident.id })
  }

  /**
   * Execute containment release
   */
  private async executeContainmentRelease(_action: ContainmentAction): Promise<void> {
    // Simulate release action
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200))
  }

  /**
   * Contain a threat by applying containment actions
   */
  public async containThreat(
    incident: SecurityIncident,
    actions: ContainmentRequest[],
    initiator: string,
    requireApprovalForContainment: boolean = false
  ): Promise<ContainmentAction[]> {
    const results: ContainmentAction[] = []

    for (const actionRequest of actions) {
      const containmentId = this.generateId('cont')
      const action: ContainmentAction = {
        id: containmentId,
        type: actionRequest.type,
        target: actionRequest.target,
        targetType: actionRequest.targetType,
        status: 'pending',
        initiatedAt: new Date(),
        initiatedBy: initiator,
        automated: actionRequest.automated ?? false,
        rollbackable: this.isContainmentRollbackable(actionRequest.type),
        metadata: {}
      }

      // Check if approval is required
      if (requireApprovalForContainment && !actionRequest.automated) {
        this.pendingApprovals.set(containmentId, {
          type: 'containment',
          actionId: containmentId,
          incidentId: incident.id
        })
        this.emit('containment:awaiting_approval', { action, incidentId: incident.id })
        action.status = 'pending'
      } else {
        // Execute containment
        try {
          await this.executeContainment(action, incident)
          action.status = 'active'
        } catch (error) {
          action.status = 'failed'
          action.metadata.error = error instanceof Error ? error.message : String(error)
        }
      }

      this.containmentRegistry.set(containmentId, action)
      incident.containmentActions.push(action)
      results.push(action)

      // Update affected asset containment status
      this.updateAssetContainmentStatus(incident, actionRequest.target, action.status)
    }

    this.emit('threat:contained', { incidentId: incident.id, actions: results })
    return results
  }

  /**
   * Release a containment action
   */
  public async releaseContainment(
    containmentId: string,
    releasedBy: string,
    _reason: string
  ): Promise<ContainmentAction> {
    const action = this.containmentRegistry.get(containmentId)
    if (!action) {
      throw new Error(`Containment action ${containmentId} not found`)
    }

    if (action.status !== 'active') {
      throw new Error(`Containment action ${containmentId} is not active`)
    }

    try {
      await this.executeContainmentRelease(action)
      action.status = 'released'
      action.releasedAt = new Date()
      action.releasedBy = releasedBy
      action.duration = action.releasedAt.getTime() - action.initiatedAt.getTime()
    } catch (error) {
      throw new Error(`Failed to release containment: ${error instanceof Error ? error.message : String(error)}`)
    }

    this.emit('containment:released', { action, releasedBy })
    return action
  }

  /**
   * Auto-contain incident based on severity
   */
  public async autoContainIncident(incident: SecurityIncident, autoContainCritical: boolean, autoContainHigh: boolean): Promise<void> {
    if (
      (incident.severity === ThreatSeverity.CRITICAL && !autoContainCritical) &&
      (incident.severity === ThreatSeverity.HIGH && !autoContainHigh)
    ) {
      return
    }

    const containmentActions: ContainmentRequest[] = []

    // Add containment for affected hosts
    for (const asset of incident.affectedAssets) {
      if (asset.type === 'host' && asset.criticality !== 'critical') {
        containmentActions.push({
          type: ContainmentType.ISOLATE_HOST,
          target: asset.identifier,
          targetType: 'host',
          automated: true
        })
      }
      if (asset.type === 'user') {
        containmentActions.push({
          type: ContainmentType.DISABLE_USER,
          target: asset.identifier,
          targetType: 'user',
          automated: true
        })
      }
    }

    // Block malicious IPs from indicators
    for (const indicator of incident.indicators) {
      if (indicator.type === 'ip' && indicator.severity === ThreatSeverity.CRITICAL) {
        containmentActions.push({
          type: ContainmentType.BLOCK_IP,
          target: indicator.value,
          targetType: 'ip',
          automated: true
        })
      }
    }

    if (containmentActions.length > 0) {
      await this.containThreat(incident, containmentActions, 'system', false)
    }
  }

  /**
   * Get active containments
   */
  public getActiveContainments(): ContainmentAction[] {
    return Array.from(this.containmentRegistry.values()).filter(a => a.status === 'active')
  }

  /**
   * Get pending approvals
   */
  public getPendingApprovals(): Map<string, { type: 'containment'; actionId: string; incidentId: string }> {
    return new Map(this.pendingApprovals)
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.containmentRegistry.clear()
    this.pendingApprovals.clear()
  }
}
