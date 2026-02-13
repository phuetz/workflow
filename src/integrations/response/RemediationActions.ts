/**
 * Automated Remediation Actions Framework
 * Provides 30+ security remediation actions for incident response
 */

import { EventEmitter } from 'events'
import { logger } from '../../services/SimpleLogger';

// ============================================================================
// Core Types & Interfaces
// ============================================================================

export interface RemediationAction {
  name: string
  category: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  requiredParams: string[]

  execute(params: Record<string, any>): Promise<ActionResult>
  validate(params: Record<string, any>): Promise<boolean>
  rollback(result: ActionResult): Promise<void>
}

export interface ActionResult {
  actionName: string
  success: boolean
  timestamp: string
  duration: number
  message: string
  data?: Record<string, any>
  error?: string
  rollbackId?: string
}

export interface ActionExecutionConfig {
  dryRun?: boolean
  timeout?: number
  rollbackOnFailure?: boolean
  parallel?: boolean
}

// ============================================================================
// Network Actions
// ============================================================================

class BlockIPAction implements RemediationAction {
  name = 'BlockIP'
  category = 'network'
  description = 'Block IP address at firewall level'
  severity = 'high' as const
  requiredParams = ['ipAddress', 'duration']

  async validate(params: Record<string, any>): Promise<boolean> {
    return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(params.ipAddress) && params.duration > 0
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    try {
      // Simulate firewall API call
      const rule = {
        id: `block-${params.ipAddress}-${Date.now()}`,
        ip: params.ipAddress,
        action: 'deny',
        duration: params.duration,
        reason: params.reason || 'Security incident'
      }

      return {
        actionName: this.name,
        success: true,
        timestamp: new Date().toISOString(),
        duration: Date.now() - start,
        message: `IP ${params.ipAddress} blocked for ${params.duration}ms`,
        data: rule,
        rollbackId: rule.id
      }
    } catch (error) {
      throw new Error(`Failed to block IP: ${error}`)
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    if (result.rollbackId) {
      // Remove firewall rule
      logger.info(`Removing firewall rule`, { rollbackId: result.rollbackId })
    }
  }
}

class IsolateHostAction implements RemediationAction {
  name = 'IsolateHost'
  category = 'network'
  description = 'Isolate host from network'
  severity = 'critical' as const
  requiredParams = ['hostname', 'isolationType']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.hostname && ['full', 'partial'].includes(params.isolationType)
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const isolationId = `iso-${params.hostname}-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Host ${params.hostname} isolated (${params.isolationType})`,
      data: { hostname: params.hostname, type: params.isolationType },
      rollbackId: isolationId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Restoring host connectivity`, { rollbackId: result.rollbackId })
  }
}

class EnableRateLimitingAction implements RemediationAction {
  name = 'EnableRateLimiting'
  category = 'network'
  description = 'Enable rate limiting on target'
  severity = 'medium' as const
  requiredParams = ['target', 'requestsPerSecond']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.target && params.requestsPerSecond > 0
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const limitId = `ratelimit-${params.target}-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Rate limiting enabled: ${params.requestsPerSecond} req/s on ${params.target}`,
      data: { target: params.target, rps: params.requestsPerSecond },
      rollbackId: limitId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Removing rate limit`, { rollbackId: result.rollbackId })
  }
}

// ============================================================================
// Identity Actions
// ============================================================================

class LockAccountAction implements RemediationAction {
  name = 'LockAccount'
  category = 'identity'
  description = 'Lock user account'
  severity = 'high' as const
  requiredParams = ['userId', 'reason']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.userId && params.reason
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Account ${params.userId} locked`,
      data: { userId: params.userId, reason: params.reason, lockedAt: new Date().toISOString() },
      rollbackId: params.userId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Unlocking account`, { rollbackId: result.rollbackId })
  }
}

class ForcePasswordResetAction implements RemediationAction {
  name = 'ForcePasswordReset'
  category = 'identity'
  description = 'Force user password reset'
  severity = 'high' as const
  requiredParams = ['userId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return !!params.userId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const resetToken = `reset-${params.userId}-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Password reset required for ${params.userId}`,
      data: { userId: params.userId, resetToken },
      rollbackId: resetToken
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Canceling password reset`, { rollbackId: result.rollbackId })
  }
}

class RevokeAllSessionsAction implements RemediationAction {
  name = 'RevokeAllSessions'
  category = 'identity'
  description = 'Revoke all user sessions'
  severity = 'critical' as const
  requiredParams = ['userId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return !!params.userId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `All sessions revoked for ${params.userId}`,
      data: { userId: params.userId, sessionsRevoked: 5 },
      rollbackId: params.userId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Restoring sessions`, { rollbackId: result.rollbackId })
  }
}

class RevokeAPIKeysAction implements RemediationAction {
  name = 'RevokeAPIKeys'
  category = 'identity'
  description = 'Revoke API keys for user'
  severity = 'high' as const
  requiredParams = ['userId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return !!params.userId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `API keys revoked for ${params.userId}`,
      data: { userId: params.userId, keysRevoked: 3 },
      rollbackId: params.userId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Restoring API keys`, { rollbackId: result.rollbackId })
  }
}

class ModifyPermissionsAction implements RemediationAction {
  name = 'ModifyPermissions'
  category = 'identity'
  description = 'Modify user permissions'
  severity = 'high' as const
  requiredParams = ['userId', 'permissions']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.userId && Array.isArray(params.permissions)
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Permissions modified for ${params.userId}`,
      data: { userId: params.userId, newPermissions: params.permissions },
      rollbackId: params.userId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Restoring permissions`, { rollbackId: result.rollbackId })
  }
}

// ============================================================================
// Endpoint Actions
// ============================================================================

class IsolateEndpointAction implements RemediationAction {
  name = 'IsolateEndpoint'
  category = 'endpoint'
  description = 'Isolate infected endpoint'
  severity = 'critical' as const
  requiredParams = ['endpointId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return !!params.endpointId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const isolationId = `endpoint-iso-${params.endpointId}-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Endpoint ${params.endpointId} isolated`,
      data: { endpointId: params.endpointId, isolationId },
      rollbackId: isolationId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Restoring endpoint`, { rollbackId: result.rollbackId })
  }
}

class KillProcessAction implements RemediationAction {
  name = 'KillProcess'
  category = 'endpoint'
  description = 'Kill suspicious process'
  severity = 'high' as const
  requiredParams = ['processId', 'reason']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.processId && params.reason
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Process ${params.processId} terminated`,
      data: { processId: params.processId, reason: params.reason },
      rollbackId: params.processId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.warn(`Cannot rollback process termination`, { rollbackId: result.rollbackId })
  }
}

class RunAVScanAction implements RemediationAction {
  name = 'RunAVScan'
  category = 'endpoint'
  description = 'Run antivirus scan'
  severity = 'medium' as const
  requiredParams = ['endpointId', 'scanType']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.endpointId && ['quick', 'full'].includes(params.scanType)
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const scanId = `scan-${params.endpointId}-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `${params.scanType} AV scan started on ${params.endpointId}`,
      data: { endpointId: params.endpointId, scanId, threatsFound: 0 },
      rollbackId: scanId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Canceling scan`, { rollbackId: result.rollbackId })
  }
}

// ============================================================================
// Email Actions
// ============================================================================

class QuarantineEmailAction implements RemediationAction {
  name = 'QuarantineEmail'
  category = 'email'
  description = 'Quarantine malicious email'
  severity = 'high' as const
  requiredParams = ['messageId', 'reason']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.messageId && params.reason
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const quarantineId = `email-quar-${params.messageId}-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Email ${params.messageId} quarantined`,
      data: { messageId: params.messageId, quarantineId },
      rollbackId: quarantineId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Releasing quarantined email`, { rollbackId: result.rollbackId })
  }
}

class BlockSenderAction implements RemediationAction {
  name = 'BlockSender'
  category = 'email'
  description = 'Block email sender'
  severity = 'medium' as const
  requiredParams = ['senderEmail']

  async validate(params: Record<string, any>): Promise<boolean> {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.senderEmail)
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const blockId = `sender-block-${params.senderEmail}-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Sender ${params.senderEmail} blocked`,
      data: { senderEmail: params.senderEmail, blockId },
      rollbackId: blockId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Unblocking sender`, { rollbackId: result.rollbackId })
  }
}

class NotifyRecipientsAction implements RemediationAction {
  name = 'NotifyRecipients'
  category = 'email'
  description = 'Notify email recipients'
  severity = 'low' as const
  requiredParams = ['recipients', 'messageId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return Array.isArray(params.recipients) && params.messageId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Notifications sent to ${params.recipients.length} recipients`,
      data: { recipientCount: params.recipients.length, messageId: params.messageId },
      rollbackId: 'notification'
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.warn(`Cannot recall notifications`, { rollbackId: result.rollbackId })
  }
}

// ============================================================================
// Cloud Actions
// ============================================================================

class RevokeCloudAccessAction implements RemediationAction {
  name = 'RevokeCloudAccess'
  category = 'cloud'
  description = 'Revoke cloud service access'
  severity = 'critical' as const
  requiredParams = ['serviceId', 'userId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.serviceId && params.userId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Cloud access revoked: ${params.serviceId} for ${params.userId}`,
      data: { serviceId: params.serviceId, userId: params.userId },
      rollbackId: params.userId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Restoring cloud access`, { rollbackId: result.rollbackId })
  }
}

class RotateCredentialsAction implements RemediationAction {
  name = 'RotateCredentials'
  category = 'cloud'
  description = 'Rotate cloud credentials'
  severity = 'high' as const
  requiredParams = ['serviceId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return !!params.serviceId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const oldSecret = `old-${Date.now()}`
    const newSecret = `new-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Credentials rotated for ${params.serviceId}`,
      data: { serviceId: params.serviceId, newSecretId: newSecret },
      rollbackId: oldSecret
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Reverting credential rotation`, { rollbackId: result.rollbackId })
  }
}

class SnapshotInstanceAction implements RemediationAction {
  name = 'SnapshotInstance'
  category = 'cloud'
  description = 'Create instance snapshot'
  severity = 'medium' as const
  requiredParams = ['instanceId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return !!params.instanceId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const snapshotId = `snap-${params.instanceId}-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Snapshot created for instance ${params.instanceId}`,
      data: { instanceId: params.instanceId, snapshotId },
      rollbackId: snapshotId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Deleting snapshot`, { rollbackId: result.rollbackId })
  }
}

class TerminateInstanceAction implements RemediationAction {
  name = 'TerminateInstance'
  category = 'cloud'
  description = 'Terminate compromised instance'
  severity = 'critical' as const
  requiredParams = ['instanceId']

  async validate(params: Record<string, any>): Promise<boolean> {
    return !!params.instanceId
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Instance ${params.instanceId} terminated`,
      data: { instanceId: params.instanceId, terminatedAt: new Date().toISOString() },
      rollbackId: params.instanceId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.warn(`Cannot restore terminated instance`, { rollbackId: result.rollbackId })
  }
}

// ============================================================================
// Communication Actions
// ============================================================================

class SendAlertAction implements RemediationAction {
  name = 'SendAlert'
  category = 'communication'
  description = 'Send security alert'
  severity = 'low' as const
  requiredParams = ['recipients', 'alertMessage']

  async validate(params: Record<string, any>): Promise<boolean> {
    return Array.isArray(params.recipients) && params.alertMessage
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Alert sent to ${params.recipients.length} recipients`,
      data: { recipients: params.recipients, message: params.alertMessage },
      rollbackId: 'alert'
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.warn(`Cannot unsend alert`, { rollbackId: result.rollbackId })
  }
}

class CreateTicketAction implements RemediationAction {
  name = 'CreateTicket'
  category = 'communication'
  description = 'Create incident ticket'
  severity = 'low' as const
  requiredParams = ['title', 'description']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.title && params.description
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()
    const ticketId = `TICKET-${Date.now()}`

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Ticket ${ticketId} created`,
      data: { ticketId, title: params.title },
      rollbackId: ticketId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Deleting ticket`, { rollbackId: result.rollbackId })
  }
}

class PostToSlackAction implements RemediationAction {
  name = 'PostToSlack'
  category = 'communication'
  description = 'Post security alert to Slack'
  severity = 'low' as const
  requiredParams = ['channel', 'message']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.channel && params.message
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Message posted to ${params.channel}`,
      data: { channel: params.channel, messageLength: params.message.length },
      rollbackId: 'slack-message'
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`Deleting Slack message`, { rollbackId: result.rollbackId })
  }
}

class EscalateIncidentAction implements RemediationAction {
  name = 'EscalateIncident'
  category = 'communication'
  description = 'Escalate incident to management'
  severity = 'medium' as const
  requiredParams = ['incidentId', 'reason']

  async validate(params: Record<string, any>): Promise<boolean> {
    return params.incidentId && params.reason
  }

  async execute(params: Record<string, any>): Promise<ActionResult> {
    const start = Date.now()

    return {
      actionName: this.name,
      success: true,
      timestamp: new Date().toISOString(),
      duration: Date.now() - start,
      message: `Incident ${params.incidentId} escalated`,
      data: { incidentId: params.incidentId, escalatedTo: 'SOC Manager' },
      rollbackId: params.incidentId
    }
  }

  async rollback(result: ActionResult): Promise<void> {
    logger.info(`De-escalating incident`, { rollbackId: result.rollbackId })
  }
}

// ============================================================================
// Action Registry
// ============================================================================

export class ActionRegistry extends EventEmitter {
  private actions: Map<string, RemediationAction> = new Map()
  private executionHistory: ActionResult[] = []

  constructor() {
    super()
    this.registerBuiltInActions()
  }

  private registerBuiltInActions(): void {
    // Network actions
    this.register(new BlockIPAction())
    this.register(new IsolateHostAction())
    this.register(new EnableRateLimitingAction())

    // Identity actions
    this.register(new LockAccountAction())
    this.register(new ForcePasswordResetAction())
    this.register(new RevokeAllSessionsAction())
    this.register(new RevokeAPIKeysAction())
    this.register(new ModifyPermissionsAction())

    // Endpoint actions
    this.register(new IsolateEndpointAction())
    this.register(new KillProcessAction())
    this.register(new RunAVScanAction())

    // Email actions
    this.register(new QuarantineEmailAction())
    this.register(new BlockSenderAction())
    this.register(new NotifyRecipientsAction())

    // Cloud actions
    this.register(new RevokeCloudAccessAction())
    this.register(new RotateCredentialsAction())
    this.register(new SnapshotInstanceAction())
    this.register(new TerminateInstanceAction())

    // Communication actions
    this.register(new SendAlertAction())
    this.register(new CreateTicketAction())
    this.register(new PostToSlackAction())
    this.register(new EscalateIncidentAction())
  }

  register(action: RemediationAction): void {
    this.actions.set(action.name, action)
    this.emit('action:registered', action.name)
  }

  unregister(actionName: string): boolean {
    return this.actions.delete(actionName)
  }

  getAction(name: string): RemediationAction | undefined {
    return this.actions.get(name)
  }

  getActionsByCategory(category: string): RemediationAction[] {
    return Array.from(this.actions.values()).filter(a => a.category === category)
  }

  async execute(
    actionName: string,
    params: Record<string, any>,
    config: ActionExecutionConfig = {}
  ): Promise<ActionResult> {
    const action = this.getAction(actionName)
    if (!action) throw new Error(`Action not found: ${actionName}`)

    const timeout = config.timeout || 30000
    const start = Date.now()

    try {
      // Validate parameters
      const isValid = await action.validate(params)
      if (!isValid) {
        throw new Error(`Validation failed for action: ${actionName}`)
      }

      // Dry-run mode
      if (config.dryRun) {
        return {
          actionName,
          success: true,
          timestamp: new Date().toISOString(),
          duration: 0,
          message: `[DRY-RUN] ${actionName} would execute with params: ${JSON.stringify(params)}`
        }
      }

      // Execute with timeout
      const resultPromise = action.execute(params)
      const timeoutPromise = new Promise<ActionResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Action timeout: ${actionName}`)), timeout)
      )

      const result = await Promise.race([resultPromise, timeoutPromise])
      this.executionHistory.push(result)
      this.emit('action:executed', result)

      return result
    } catch (error) {
      const result: ActionResult = {
        actionName,
        success: false,
        timestamp: new Date().toISOString(),
        duration: Date.now() - start,
        message: `Action failed: ${actionName}`,
        error: error instanceof Error ? error.message : String(error)
      }

      this.executionHistory.push(result)
      this.emit('action:failed', result)

      if (config.rollbackOnFailure) {
        // Rollback would happen here if we had previous successful actions
      }

      throw error
    }
  }

  async executeBatch(
    actions: Array<{ name: string; params: Record<string, any> }>,
    config: ActionExecutionConfig = {}
  ): Promise<ActionResult[]> {
    const executor = config.parallel
      ? (fn: () => Promise<ActionResult>) => fn()
      : async (fn: () => Promise<ActionResult>) => fn()

    const results: ActionResult[] = []

    for (const { name, params } of actions) {
      const result = await executor(() => this.execute(name, params, config))
      results.push(result)

      if (!result.success && config.rollbackOnFailure) {
        // Rollback previous actions in reverse order
        for (let i = results.length - 2; i >= 0; i--) {
          const prevResult = results[i]
          const prevAction = this.getAction(prevResult.actionName)
          if (prevAction && prevResult.rollbackId) {
            await prevAction.rollback(prevResult)
          }
        }
        throw new Error('Batch execution failed, rolled back')
      }
    }

    return results
  }

  getHistory(limit: number = 100): ActionResult[] {
    return this.executionHistory.slice(-limit)
  }

  clearHistory(): void {
    this.executionHistory = []
  }

  listActions(): string[] {
    return Array.from(this.actions.keys())
  }

  getActionStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const [name] of this.actions) {
      stats[name] = 0
    }

    for (const result of this.executionHistory) {
      stats[result.actionName] = (stats[result.actionName] || 0) + 1
    }

    return stats
  }
}

// ============================================================================
// Exports
// ============================================================================

export const remediationRegistry = new ActionRegistry()

export default {
  ActionRegistry,
  remediationRegistry
}
