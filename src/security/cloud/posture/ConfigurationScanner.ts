/**
 * Configuration Scanner
 *
 * Handles cloud resource configuration scanning and drift detection.
 *
 * @module posture/ConfigurationScanner
 */

import * as crypto from 'crypto';
import {
  AssessmentCategory,
  CloudProvider,
  CloudProviderAdapter,
  RawFinding,
  RiskSeverity,
  SecurityFinding
} from './types';
import { ComplianceChecker } from './ComplianceChecker';
import { RemediationAdvisor } from './RemediationAdvisor';

/**
 * ConfigurationScanner handles resource scanning and assessment execution
 */
export class ConfigurationScanner {
  private complianceChecker: ComplianceChecker;
  private remediationAdvisor: RemediationAdvisor;

  constructor() {
    this.complianceChecker = new ComplianceChecker();
    this.remediationAdvisor = new RemediationAdvisor();
  }

  /**
   * Run assessment for a specific category
   */
  async runAssessment(
    provider: CloudProvider,
    providerAdapter: CloudProviderAdapter,
    resourceId: string,
    resourceType: string,
    category: AssessmentCategory
  ): Promise<SecurityFinding[]> {
    const rawFindings = await providerAdapter.runAssessment(
      resourceId,
      resourceType,
      category
    );

    return rawFindings.map(rf => ({
      id: this.generateId(),
      resourceId,
      resourceType,
      category,
      severity: this.calculateSeverity(rf),
      title: rf.title,
      description: rf.description,
      riskScore: rf.riskScore,
      affectedFrameworks: this.complianceChecker.mapToFrameworks(category),
      evidence: rf.evidence,
      remediation: this.remediationAdvisor.generateRemediation(provider, rf),
      lastDetected: new Date(),
      firstDetected: rf.firstDetected || new Date(),
      status: 'open'
    }));
  }

  /**
   * Detect configuration drift for a resource
   */
  async detectDrift(
    providerAdapter: CloudProviderAdapter | undefined,
    resourceId: string,
    resourceType: string
  ): Promise<{ detected: boolean; details?: string }> {
    if (!providerAdapter) {
      return { detected: false };
    }

    try {
      const driftData = await providerAdapter.detectDrift(resourceId, resourceType);
      return driftData;
    } catch {
      return { detected: false };
    }
  }

  /**
   * Calculate severity from risk score
   */
  calculateSeverity(rf: RawFinding): RiskSeverity {
    const score = rf.riskScore;
    if (score >= 90) return RiskSeverity.CRITICAL;
    if (score >= 70) return RiskSeverity.HIGH;
    if (score >= 50) return RiskSeverity.MEDIUM;
    if (score >= 30) return RiskSeverity.LOW;
    return RiskSeverity.INFO;
  }

  /**
   * Generate unique identifier
   */
  private generateId(): string {
    return `finding_${crypto.randomBytes(8).toString('hex')}`;
  }
}

export default ConfigurationScanner;
