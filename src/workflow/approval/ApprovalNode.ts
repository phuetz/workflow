/**
 * Approval Node - Wait for Approval Node Type
 * Integrates with the execution engine to pause workflow execution
 */

import { logger } from '../../services/SimpleLogger';
import { approvalManager } from './ApprovalManager';
import { ApprovalNodeConfig, ApprovalRequest, Approver } from '../../types/approval';

/**
 * Execute an approval node
 * Returns a promise that resolves when approval is received
 */
export async function executeApprovalNode(
  nodeId: string,
  nodeName: string,
  config: ApprovalNodeConfig,
  inputData: Record<string, unknown>,
  context: {
    workflowId: string;
    workflowName: string;
    executionId: string;
  }
): Promise<{
  success: boolean;
  approved: boolean;
  data: Record<string, unknown>;
  approvalRequest?: ApprovalRequest;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    logger.info('Executing approval node', {
      nodeId,
      nodeName,
      workflowId: context.workflowId,
      executionId: context.executionId,
    });

    // Validate configuration
    if (!config.approvers || config.approvers.length === 0) {
      throw new Error('No approvers configured for approval node');
    }

    // Create approval request
    const approvalRequest = await approvalManager.getEngine().createApprovalRequest(config, {
      workflowId: context.workflowId,
      workflowName: context.workflowName,
      executionId: context.executionId,
      nodeId,
      nodeName,
      data: inputData,
    });

    // Check if auto-approved/rejected
    if (approvalRequest.status === 'approved') {
      logger.info('Approval node auto-approved', {
        nodeId,
        requestId: approvalRequest.id,
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        approved: true,
        data: {
          ...inputData,
          approvalRequest: {
            id: approvalRequest.id,
            status: approvalRequest.status,
            responses: approvalRequest.responses,
          },
        },
        approvalRequest,
      };
    }

    if (approvalRequest.status === 'rejected') {
      logger.info('Approval node auto-rejected', {
        nodeId,
        requestId: approvalRequest.id,
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        approved: false,
        data: {
          ...inputData,
          approvalRequest: {
            id: approvalRequest.id,
            status: approvalRequest.status,
            responses: approvalRequest.responses,
          },
        },
        approvalRequest,
      };
    }

    // Wait for approval
    logger.info('Waiting for approval', {
      nodeId,
      requestId: approvalRequest.id,
      approvers: approvalRequest.approvers.length,
      mode: approvalRequest.approvalMode,
    });

    // Return a promise that will be resolved by the approval callback
    return new Promise((resolve) => {
      // Register callback for when approval is completed
      approvalManager.registerCallback(approvalRequest.id, (result) => {
        const duration = Date.now() - startTime;

        logger.info('Approval received', {
          nodeId,
          requestId: approvalRequest.id,
          approved: result.approved,
          duration,
        });

        // Get updated request
        const updatedRequest = approvalManager.getApprovalRequest(approvalRequest.id);

        resolve({
          success: true,
          approved: result.approved,
          data: {
            ...inputData,
            ...(typeof result.data === 'object' && result.data !== null ? result.data : {}),
            approvalRequest: {
              id: approvalRequest.id,
              status: updatedRequest?.status || approvalRequest.status,
              responses: updatedRequest?.responses || approvalRequest.responses,
              approvedBy: updatedRequest?.responses.filter(r => r.decision === 'approve').map(r => r.approverName),
              rejectedBy: updatedRequest?.responses.filter(r => r.decision === 'reject').map(r => r.approverName),
            },
          },
          approvalRequest: updatedRequest,
        });
      });
    });
  } catch (error) {
    logger.error('Approval node execution failed', {
      nodeId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      approved: false,
      data: inputData,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get default approval node configuration
 */
export function getDefaultApprovalConfig(): ApprovalNodeConfig {
  return {
    approvers: [],
    approvalMode: 'any',
    timeoutMs: 86400000, // 24 hours
    timeoutAction: 'reject',
    notificationChannels: ['email', 'in-app'],
    sendReminders: true,
    reminderIntervalMs: 3600000, // 1 hour
    enableAuditTrail: true,
    priority: 'medium',
  };
}

/**
 * Validate approval node configuration
 */
export function validateApprovalConfig(config: Partial<ApprovalNodeConfig>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.approvers || config.approvers.length === 0) {
    errors.push('At least one approver is required');
  } else {
    // Validate approvers
    for (let i = 0; i < config.approvers.length; i++) {
      const approver = config.approvers[i];
      if (!approver.id && !approver.email) {
        errors.push(`Approver ${i + 1} must have either an ID or email`);
      }
      if (!approver.name) {
        errors.push(`Approver ${i + 1} must have a name`);
      }
      if (!approver.notificationChannels || approver.notificationChannels.length === 0) {
        warnings.push(`Approver ${i + 1} (${approver.name}) has no notification channels configured`);
      }
    }
  }

  if (!config.approvalMode) {
    errors.push('Approval mode is required');
  }

  if (config.approvalMode === 'custom' && !config.customApprovalLogic) {
    errors.push('Custom approval logic is required when approval mode is "custom"');
  }

  // Warnings
  if (!config.timeoutMs || config.timeoutMs <= 0) {
    warnings.push('No timeout configured - approval will wait indefinitely');
  } else if (config.timeoutMs < 60000) {
    warnings.push('Timeout is less than 1 minute - may be too short');
  } else if (config.timeoutMs > 604800000) {
    warnings.push('Timeout is more than 7 days - may be too long');
  }

  if (config.sendReminders && (!config.reminderIntervalMs || config.reminderIntervalMs <= 0)) {
    errors.push('Reminder interval must be set when reminders are enabled');
  }

  if (config.timeoutAction === 'escalate' && (!config.escalationTargets || config.escalationTargets.length === 0)) {
    errors.push('Escalation targets are required when timeout action is "escalate"');
  }

  if (!config.notificationChannels || config.notificationChannels.length === 0) {
    warnings.push('No notification channels configured - approvers may not be notified');
  }

  if (config.autoApprovalRules && config.autoApprovalRules.length > 0) {
    for (let i = 0; i < config.autoApprovalRules.length; i++) {
      const rule = config.autoApprovalRules[i];
      if (!rule.condition) {
        errors.push(`Auto-approval rule ${i + 1} must have a condition`);
      }
      if (!rule.action) {
        errors.push(`Auto-approval rule ${i + 1} must have an action`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create an approver from user information
 */
export function createApprover(
  userId: string,
  name: string,
  email: string,
  options?: {
    role?: string;
    notificationChannels?: ApprovalNodeConfig['notificationChannels'];
  }
): Approver {
  return {
    id: userId,
    email,
    name,
    role: options?.role,
    notificationChannels: options?.notificationChannels || ['email', 'in-app'],
  };
}
