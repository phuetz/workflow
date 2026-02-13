/**
 * RemediationManager - Handles incident remediation actions
 *
 * @module soc/orchestration/RemediationManager
 */

import { EventEmitter } from 'events'
import { randomBytes } from 'crypto'
import {
  RemediationAction,
  RemediationType,
  RemediationRequest,
  ApprovalStatus,
  SecurityIncident
} from './types'

export class RemediationManager extends EventEmitter {
  private remediationRegistry: Map<string, RemediationAction> = new Map()
  private pendingApprovals: Map<string, { type: 'remediation'; actionId: string; incidentId: string }> = new Map()
  private remediationApprovers: string[]

  constructor(remediationApprovers: string[] = ['security_manager', 'ciso']) {
    super()
    this.remediationApprovers = remediationApprovers
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`
  }

  /**
   * Check if remediation type is rollbackable
   */
  private isRemediationRollbackable(type: RemediationType): boolean {
    const rollbackable = [
      RemediationType.UPDATE_FIREWALL_RULES,
      RemediationType.UPDATE_ACCESS_POLICIES,
      RemediationType.UPDATE_WAF_RULES
    ]
    return rollbackable.includes(type)
  }

  // Remediation action implementations (simulated)
  private async patchSystem(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  private async updateSignatures(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async rotateCredentials(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 150))
  }

  private async restoreBackup(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  private async rebuildSystem(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  private async updateFirewallRules(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async revokeCertificates(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async updateAccessPolicies(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async resetPassword(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  private async updateWAFRules(_target: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * Execute a remediation action
   */
  private async executeRemediation(action: RemediationAction, incident: SecurityIncident): Promise<void> {
    this.emit('remediation:executing', { action, incidentId: incident.id })

    switch (action.type) {
      case RemediationType.PATCH_SYSTEM:
        await this.patchSystem(action.target)
        break
      case RemediationType.UPDATE_SIGNATURES:
        await this.updateSignatures(action.target)
        break
      case RemediationType.ROTATE_CREDENTIALS:
        await this.rotateCredentials(action.target)
        break
      case RemediationType.RESTORE_BACKUP:
        await this.restoreBackup(action.target)
        break
      case RemediationType.REBUILD_SYSTEM:
        await this.rebuildSystem(action.target)
        break
      case RemediationType.UPDATE_FIREWALL_RULES:
        await this.updateFirewallRules(action.target)
        break
      case RemediationType.REVOKE_CERTIFICATES:
        await this.revokeCertificates(action.target)
        break
      case RemediationType.UPDATE_ACCESS_POLICIES:
        await this.updateAccessPolicies(action.target)
        break
      case RemediationType.RESET_PASSWORD:
        await this.resetPassword(action.target)
        break
      case RemediationType.UPDATE_WAF_RULES:
        await this.updateWAFRules(action.target)
        break
      default:
        throw new Error(`Unknown remediation type: ${action.type}`)
    }

    this.emit('remediation:executed', { action, incidentId: incident.id })
  }

  /**
   * Remediate an incident with specified actions
   */
  public async remediateIncident(
    incident: SecurityIncident,
    actions: RemediationRequest[],
    initiator: string
  ): Promise<RemediationAction[]> {
    const results: RemediationAction[] = []

    for (const actionRequest of actions) {
      const remediationId = this.generateId('rem')
      const requiresApproval = actionRequest.requiresApproval ?? true

      const action: RemediationAction = {
        id: remediationId,
        type: actionRequest.type,
        target: actionRequest.target,
        status: requiresApproval ? 'awaiting_approval' : 'pending',
        approvalStatus: requiresApproval ? ApprovalStatus.PENDING : ApprovalStatus.AUTO_APPROVED,
        approvers: this.remediationApprovers,
        initiatedAt: new Date(),
        initiatedBy: initiator,
        rollbackAvailable: this.isRemediationRollbackable(actionRequest.type),
        rollbackExecuted: false
      }

      if (requiresApproval) {
        this.pendingApprovals.set(remediationId, {
          type: 'remediation',
          actionId: remediationId,
          incidentId: incident.id
        })
        this.emit('remediation:awaiting_approval', { action, incidentId: incident.id, approvers: action.approvers })
      } else {
        // Execute remediation immediately
        try {
          await this.executeRemediation(action, incident)
          action.status = 'completed'
          action.completedAt = new Date()
        } catch (error) {
          action.status = 'failed'
          action.error = error instanceof Error ? error.message : String(error)
        }
      }

      this.remediationRegistry.set(remediationId, action)
      incident.remediationActions.push(action)
      results.push(action)
    }

    this.emit('incident:remediation_started', { incidentId: incident.id, actions: results })
    return results
  }

  /**
   * Approve a remediation action
   */
  public async approveRemediation(
    remediationId: string,
    approver: string,
    incident: SecurityIncident
  ): Promise<RemediationAction> {
    const action = this.remediationRegistry.get(remediationId)
    if (!action) {
      throw new Error(`Remediation action ${remediationId} not found`)
    }

    if (action.status !== 'awaiting_approval') {
      throw new Error(`Remediation action ${remediationId} is not awaiting approval`)
    }

    // Check if approver is authorized
    if (!action.approvers.includes(approver) && !this.remediationApprovers.includes(approver)) {
      throw new Error(`User ${approver} is not authorized to approve this remediation`)
    }

    action.approvalStatus = ApprovalStatus.APPROVED
    action.approvedBy = approver
    action.approvedAt = new Date()
    action.status = 'in_progress'

    this.pendingApprovals.delete(remediationId)

    try {
      await this.executeRemediation(action, incident)
      action.status = 'completed'
      action.completedAt = new Date()
    } catch (error) {
      action.status = 'failed'
      action.error = error instanceof Error ? error.message : String(error)
    }

    this.emit('remediation:approved', { action, approver })
    return action
  }

  /**
   * Get pending approvals
   */
  public getPendingApprovals(): Map<string, { type: 'remediation'; actionId: string; incidentId: string }> {
    return new Map(this.pendingApprovals)
  }

  /**
   * Get remediation by ID
   */
  public getRemediation(remediationId: string): RemediationAction | undefined {
    return this.remediationRegistry.get(remediationId)
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.remediationRegistry.clear()
    this.pendingApprovals.clear()
  }
}
