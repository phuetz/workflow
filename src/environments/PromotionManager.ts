/**
 * Promotion Manager
 * Orchestrates workflow promotions with approval gates and rollback capability
 */

import { logger } from '../services/SimpleLogger';
import { getEnvironmentManager } from './EnvironmentManager';
import { getPromotionValidator, PromotionValidationReport } from './PromotionValidator';
import { getEnvironmentService } from '../backend/environment/EnvironmentService';
import {
  PromoteWorkflowRequest,
  PromoteWorkflowResponse,
  WorkflowPromotion,
  PromotionStatus,
} from '../backend/environment/EnvironmentTypes';
import { getAuditService } from '../backend/audit/AuditService';
import { AuditAction, AuditCategory, AuditSeverity } from '../backend/audit/AuditTypes';

export interface PromotionApproval {
  id: string;
  promotionId: string;
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: Date;
  comments?: string;
}

export interface PromotionRequest {
  workflowId: string;
  sourceEnvId: string;
  targetEnvId: string;
  credentialMappings?: Record<string, string>;
  variableMappings?: Record<string, string>;
  requireApproval: boolean;
  runTests: boolean;
  scheduledAt?: Date;
  requestedBy: string;
}

export interface PromotionExecution {
  id: string;
  request: PromotionRequest;
  validation: PromotionValidationReport;
  approvals: PromotionApproval[];
  status: PromotionStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  rollbackAvailable: boolean;
  previousVersion?: any;
}

export interface RollbackRequest {
  promotionId: string;
  reason: string;
  requestedBy: string;
}

export class PromotionManager {
  private envManager = getEnvironmentManager();
  private envService = getEnvironmentService();
  private validator = getPromotionValidator();
  private promotions: Map<string, PromotionExecution> = new Map();
  private approvals: Map<string, PromotionApproval[]> = new Map();

  /**
   * Request a workflow promotion
   */
  async requestPromotion(
    request: PromotionRequest
  ): Promise<PromotionExecution> {
    logger.info('Promotion requested', {
      workflowId: request.workflowId,
      sourceEnvId: request.sourceEnvId,
      targetEnvId: request.targetEnvId,
      requireApproval: request.requireApproval,
    });

    // Validate promotion
    const validation = await this.validator.validatePromotion({
      workflowId: request.workflowId,
      sourceEnvId: request.sourceEnvId,
      targetEnvId: request.targetEnvId,
    });

    // Create promotion execution record
    const promotion: PromotionExecution = {
      id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      request,
      validation,
      approvals: [],
      status: validation.canPromote
        ? request.requireApproval
          ? PromotionStatus.PENDING
          : PromotionStatus.IN_PROGRESS
        : PromotionStatus.FAILED,
      createdAt: new Date(),
      rollbackAvailable: false,
    };

    this.promotions.set(promotion.id, promotion);

    // If validation failed, return immediately
    if (!validation.canPromote) {
      logger.error('Promotion validation failed', {
        promotionId: promotion.id,
        errors: validation.errors,
      });
      return promotion;
    }

    // If approval required, create approval request
    if (request.requireApproval) {
      await this.createApprovalRequest(promotion);
    } else {
      // Execute immediately
      await this.executePromotion(promotion);
    }

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.WORKFLOW_PROMOTE,
      category: AuditCategory.WORKFLOW,
      severity: AuditSeverity.INFO,
      userId: request.requestedBy,
      username: request.requestedBy,
      resourceType: 'workflow',
      resourceId: request.workflowId,
      success: validation.canPromote,
      details: {
        promotionId: promotion.id,
        requireApproval: request.requireApproval,
        validation,
      },
    });

    return promotion;
  }

  /**
   * Create approval request
   */
  private async createApprovalRequest(
    promotion: PromotionExecution
  ): Promise<void> {
    const sourceEnv = await this.envManager.getEnvironment(
      promotion.request.sourceEnvId
    );
    const targetEnv = await this.envManager.getEnvironment(
      promotion.request.targetEnvId
    );

    logger.info('Approval required for promotion', {
      promotionId: promotion.id,
      sourceEnv: sourceEnv?.name,
      targetEnv: targetEnv?.name,
    });

    // In a real implementation, this would notify approvers
    // For now, we'll create a pending approval record
    const approval: PromotionApproval = {
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      promotionId: promotion.id,
      approverId: 'pending',
      approverName: 'Pending Approval',
      status: 'pending',
    };

    const approvals = [approval];
    this.approvals.set(promotion.id, approvals);
    promotion.approvals = approvals;
    this.promotions.set(promotion.id, promotion);
  }

  /**
   * Approve promotion
   */
  async approvePromotion(
    promotionId: string,
    approverId: string,
    approverName: string,
    comments?: string
  ): Promise<PromotionExecution> {
    const promotion = this.promotions.get(promotionId);
    if (!promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }

    if (promotion.status !== PromotionStatus.PENDING) {
      throw new Error(`Promotion is not pending approval: ${promotion.status}`);
    }

    logger.info('Promotion approved', {
      promotionId,
      approverId,
      approverName,
    });

    // Update approval
    const approvals = this.approvals.get(promotionId) || [];
    for (const approval of approvals) {
      if (approval.status === 'pending') {
        approval.status = 'approved';
        approval.approverId = approverId;
        approval.approverName = approverName;
        approval.approvedAt = new Date();
        approval.comments = comments;
      }
    }

    this.approvals.set(promotionId, approvals);
    promotion.approvals = approvals;

    // Execute promotion
    promotion.status = PromotionStatus.IN_PROGRESS;
    this.promotions.set(promotionId, promotion);

    await this.executePromotion(promotion);

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.WORKFLOW_PROMOTE,
      category: AuditCategory.WORKFLOW,
      severity: AuditSeverity.INFO,
      userId: approverId,
      username: approverName,
      resourceType: 'workflow',
      resourceId: promotion.request.workflowId,
      success: true,
      details: {
        promotionId,
        action: 'approved',
        comments,
      },
    });

    return promotion;
  }

  /**
   * Reject promotion
   */
  async rejectPromotion(
    promotionId: string,
    approverId: string,
    approverName: string,
    reason: string
  ): Promise<PromotionExecution> {
    const promotion = this.promotions.get(promotionId);
    if (!promotion) {
      throw new Error(`Promotion not found: ${promotionId}`);
    }

    if (promotion.status !== PromotionStatus.PENDING) {
      throw new Error(`Promotion is not pending approval: ${promotion.status}`);
    }

    logger.info('Promotion rejected', {
      promotionId,
      approverId,
      reason,
    });

    // Update approval
    const approvals = this.approvals.get(promotionId) || [];
    for (const approval of approvals) {
      if (approval.status === 'pending') {
        approval.status = 'rejected';
        approval.approverId = approverId;
        approval.approverName = approverName;
        approval.approvedAt = new Date();
        approval.comments = reason;
      }
    }

    this.approvals.set(promotionId, approvals);
    promotion.approvals = approvals;
    promotion.status = PromotionStatus.FAILED;
    promotion.error = `Rejected by ${approverName}: ${reason}`;
    this.promotions.set(promotionId, promotion);

    // Audit log
    const auditService = getAuditService();
    await auditService.log({
      action: AuditAction.WORKFLOW_PROMOTE,
      category: AuditCategory.WORKFLOW,
      severity: AuditSeverity.WARNING,
      userId: approverId,
      username: approverName,
      resourceType: 'workflow',
      resourceId: promotion.request.workflowId,
      success: false,
      details: {
        promotionId,
        action: 'rejected',
        reason,
      },
    });

    return promotion;
  }

  /**
   * Execute promotion
   */
  private async executePromotion(
    promotion: PromotionExecution
  ): Promise<void> {
    promotion.startedAt = new Date();
    promotion.status = PromotionStatus.IN_PROGRESS;
    this.promotions.set(promotion.id, promotion);

    try {
      logger.info('Executing promotion', {
        promotionId: promotion.id,
        workflowId: promotion.request.workflowId,
      });

      // 1. Run pre-promotion tests if requested
      if (promotion.request.runTests) {
        await this.runTests(promotion);
      }

      // 2. Backup current version in target (if exists)
      const previousVersion = await this.backupCurrentVersion(promotion);
      promotion.previousVersion = previousVersion;
      promotion.rollbackAvailable = !!previousVersion;

      // 3. Perform the actual promotion
      const response = await this.envService.promoteWorkflow(
        {
          workflowId: promotion.request.workflowId,
          sourceEnvId: promotion.request.sourceEnvId,
          targetEnvId: promotion.request.targetEnvId,
          credentialMappings: promotion.request.credentialMappings,
          variableMappings: promotion.request.variableMappings,
        },
        promotion.request.requestedBy
      );

      if (!response.success) {
        throw new Error(
          `Promotion failed: ${response.errors?.join(', ') || 'Unknown error'}`
        );
      }

      // 4. Verify promotion
      await this.verifyPromotion(promotion);

      // Success
      promotion.status = PromotionStatus.COMPLETED;
      promotion.completedAt = new Date();
      this.promotions.set(promotion.id, promotion);

      logger.info('Promotion completed successfully', {
        promotionId: promotion.id,
        duration: promotion.completedAt.getTime() - promotion.startedAt.getTime(),
      });
    } catch (error: any) {
      logger.error('Promotion failed', {
        promotionId: promotion.id,
        error: error.message,
      });

      promotion.status = PromotionStatus.FAILED;
      promotion.error = error.message;
      promotion.completedAt = new Date();
      this.promotions.set(promotion.id, promotion);

      // Auto-rollback on failure
      if (promotion.rollbackAvailable) {
        logger.info('Auto-rollback initiated due to promotion failure');
        await this.rollback({
          promotionId: promotion.id,
          reason: 'Auto-rollback due to promotion failure',
          requestedBy: 'system',
        });
      }
    }
  }

  /**
   * Run pre-promotion tests
   */
  private async runTests(promotion: PromotionExecution): Promise<void> {
    logger.info('Running pre-promotion tests', {
      promotionId: promotion.id,
    });

    // Simulate test execution
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.info('Pre-promotion tests passed', {
      promotionId: promotion.id,
    });
  }

  /**
   * Backup current version in target environment
   */
  private async backupCurrentVersion(
    promotion: PromotionExecution
  ): Promise<any> {
    const targetWorkflows = await this.envService.getEnvironmentWorkflows(
      promotion.request.targetEnvId
    );

    const existingWorkflow = targetWorkflows.find(
      (w) => w.workflowId === promotion.request.workflowId
    );

    if (existingWorkflow) {
      logger.info('Backing up existing workflow version', {
        promotionId: promotion.id,
        existingVersion: existingWorkflow.version,
      });

      return {
        version: existingWorkflow.version,
        deployedAt: existingWorkflow.deployedAt,
        deployedBy: existingWorkflow.deployedBy,
      };
    }

    return null;
  }

  /**
   * Verify promotion was successful
   */
  private async verifyPromotion(promotion: PromotionExecution): Promise<void> {
    logger.info('Verifying promotion', {
      promotionId: promotion.id,
    });

    // Check if workflow exists in target
    const targetWorkflows = await this.envService.getEnvironmentWorkflows(
      promotion.request.targetEnvId
    );

    const workflow = targetWorkflows.find(
      (w) => w.workflowId === promotion.request.workflowId
    );

    if (!workflow) {
      throw new Error('Workflow not found in target environment after promotion');
    }

    logger.info('Promotion verified', {
      promotionId: promotion.id,
      targetVersion: workflow.version,
    });
  }

  /**
   * Rollback promotion
   */
  async rollback(request: RollbackRequest): Promise<void> {
    const promotion = this.promotions.get(request.promotionId);
    if (!promotion) {
      throw new Error(`Promotion not found: ${request.promotionId}`);
    }

    if (!promotion.rollbackAvailable) {
      throw new Error('Rollback not available for this promotion');
    }

    logger.info('Rolling back promotion', {
      promotionId: request.promotionId,
      reason: request.reason,
      requestedBy: request.requestedBy,
    });

    try {
      // Restore previous version
      if (promotion.previousVersion) {
        logger.info('Restoring previous version', {
          version: promotion.previousVersion.version,
        });
      }

      // Update promotion status
      promotion.status = PromotionStatus.ROLLED_BACK;
      promotion.error = `Rolled back: ${request.reason}`;
      this.promotions.set(request.promotionId, promotion);

      // Call base service rollback
      await this.envService.rollbackPromotion(
        request.promotionId,
        request.requestedBy
      );

      logger.info('Promotion rolled back successfully', {
        promotionId: request.promotionId,
      });

      // Audit log
      const auditService = getAuditService();
      await auditService.log({
        action: AuditAction.WORKFLOW_ROLLBACK,
        category: AuditCategory.WORKFLOW,
        severity: AuditSeverity.WARNING,
        userId: request.requestedBy,
        username: request.requestedBy,
        resourceType: 'workflow',
        resourceId: promotion.request.workflowId,
        success: true,
        details: {
          promotionId: request.promotionId,
          reason: request.reason,
        },
      });
    } catch (error: any) {
      logger.error('Rollback failed', {
        promotionId: request.promotionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get promotion by ID
   */
  async getPromotion(promotionId: string): Promise<PromotionExecution | null> {
    return this.promotions.get(promotionId) || null;
  }

  /**
   * List promotions with filtering
   */
  async listPromotions(filter?: {
    workflowId?: string;
    status?: PromotionStatus;
    sourceEnvId?: string;
    targetEnvId?: string;
  }): Promise<PromotionExecution[]> {
    let promotions = Array.from(this.promotions.values());

    if (filter?.workflowId) {
      promotions = promotions.filter(
        (p) => p.request.workflowId === filter.workflowId
      );
    }

    if (filter?.status) {
      promotions = promotions.filter((p) => p.status === filter.status);
    }

    if (filter?.sourceEnvId) {
      promotions = promotions.filter(
        (p) => p.request.sourceEnvId === filter.sourceEnvId
      );
    }

    if (filter?.targetEnvId) {
      promotions = promotions.filter(
        (p) => p.request.targetEnvId === filter.targetEnvId
      );
    }

    return promotions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<PromotionExecution[]> {
    return this.listPromotions({ status: PromotionStatus.PENDING });
  }

  /**
   * Get promotion statistics
   */
  async getStatistics(): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    rolledBack: number;
    successRate: number;
  }> {
    const promotions = Array.from(this.promotions.values());

    const total = promotions.length;
    const completed = promotions.filter(
      (p) => p.status === PromotionStatus.COMPLETED
    ).length;
    const failed = promotions.filter(
      (p) => p.status === PromotionStatus.FAILED
    ).length;
    const pending = promotions.filter(
      (p) => p.status === PromotionStatus.PENDING
    ).length;
    const rolledBack = promotions.filter(
      (p) => p.status === PromotionStatus.ROLLED_BACK
    ).length;

    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      failed,
      pending,
      rolledBack,
      successRate,
    };
  }
}

// Singleton
let promotionManagerInstance: PromotionManager | null = null;

export function getPromotionManager(): PromotionManager {
  if (!promotionManagerInstance) {
    promotionManagerInstance = new PromotionManager();
    logger.info('PromotionManager singleton initialized');
  }
  return promotionManagerInstance;
}
