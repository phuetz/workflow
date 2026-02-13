/**
 * Remediation Advisor
 *
 * Handles remediation guidance and execution.
 *
 * @module posture/RemediationAdvisor
 */

import * as crypto from 'crypto';
import {
  CloudProvider,
  CloudProviderAdapter,
  RawFinding,
  RemediationAction,
  RemediationGuidance,
  RemediationStatus,
  SecurityFinding
} from './types';

/**
 * Remediation template type
 */
type RemediationTemplate = {
  steps: string[];
  effort: 'low' | 'medium' | 'high';
  cost: number;
};

/**
 * RemediationAdvisor handles remediation guidance and execution
 */
export class RemediationAdvisor {
  private remediationMap: Record<string, Record<string, RemediationTemplate>> = {
    aws: {
      'public_s3_bucket': {
        steps: [
          'Navigate to S3 bucket settings',
          'Disable public access',
          'Enable block public access settings'
        ],
        effort: 'low',
        cost: 0
      }
    },
    azure: {
      'weak_password_policy': {
        steps: [
          'Go to Azure AD security settings',
          'Increase password complexity requirements',
          'Enable password history'
        ],
        effort: 'low',
        cost: 0
      }
    },
    gcp: {
      'default_service_account': {
        steps: [
          'Create new service account',
          'Assign minimal required roles',
          'Disable default service account'
        ],
        effort: 'medium',
        cost: 0
      }
    }
  };

  /**
   * Generate remediation guidance for a finding
   */
  generateRemediation(provider: CloudProvider, _rf: RawFinding): RemediationGuidance {
    const providerRemediations = this.remediationMap[provider] || {};
    const defaultRemediation: RemediationTemplate = {
      steps: ['Contact cloud administrator for manual remediation'],
      effort: 'high',
      cost: 0
    };
    const remediation = (Object.values(providerRemediations)[0] as RemediationTemplate | undefined) || defaultRemediation;

    return {
      automated: remediation.effort === 'low',
      steps: remediation.steps,
      estimatedEffort: remediation.effort,
      estimatedCost: remediation.cost,
      prerequisitePermissions: ['account:admin']
    };
  }

  /**
   * Execute automated remediation for a finding
   */
  async executeRemediation(
    finding: SecurityFinding,
    provider: CloudProvider,
    providerAdapter: CloudProviderAdapter
  ): Promise<RemediationAction> {
    if (!finding.remediation.automated) {
      throw new Error(`Remediation for ${finding.id} is not automated`);
    }

    const action: RemediationAction = {
      id: this.generateId(),
      findingId: finding.id,
      findingTitle: finding.title,
      provider,
      status: RemediationStatus.IN_PROGRESS,
      automated: true,
      executedAt: new Date(),
      auditLog: [
        {
          timestamp: new Date(),
          action: 'initiated',
          details: `Automated remediation started`,
          status: RemediationStatus.IN_PROGRESS
        }
      ]
    };

    try {
      await providerAdapter.executeRemediation(finding);

      action.status = RemediationStatus.COMPLETED;
      action.completedAt = new Date();
      action.auditLog.push({
        timestamp: new Date(),
        action: 'completed',
        details: `Remediation applied successfully`,
        status: RemediationStatus.COMPLETED
      });
    } catch (error) {
      action.status = RemediationStatus.FAILED;
      action.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      action.auditLog.push({
        timestamp: new Date(),
        action: 'failed',
        details: action.errorMessage,
        status: RemediationStatus.FAILED
      });
    }

    return action;
  }

  /**
   * Rollback a remediation action
   */
  async rollbackRemediation(
    action: RemediationAction,
    finding: SecurityFinding,
    providerAdapter: CloudProviderAdapter
  ): Promise<RemediationAction> {
    if (!finding.remediation.rollbackSteps) {
      throw new Error('Rollback not available for this remediation');
    }

    try {
      await providerAdapter.rollbackRemediation(action);

      action.status = RemediationStatus.ROLLED_BACK;
      action.auditLog.push({
        timestamp: new Date(),
        action: 'rolled_back',
        details: 'Remediation rolled back successfully',
        status: RemediationStatus.ROLLED_BACK
      });
    } catch (error) {
      action.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      action.auditLog.push({
        timestamp: new Date(),
        action: 'rollback_failed',
        details: action.errorMessage,
        status: RemediationStatus.FAILED
      });
    }

    return action;
  }

  /**
   * Generate unique identifier
   */
  private generateId(): string {
    return `remediation_${crypto.randomBytes(8).toString('hex')}`;
  }
}

export default RemediationAdvisor;
