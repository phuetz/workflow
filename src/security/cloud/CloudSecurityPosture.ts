/**
 * Cloud Security Posture Manager (CSPM)
 *
 * Comprehensive multi-cloud security assessment, compliance scanning, and remediation guidance.
 * Supports AWS, Azure, and GCP with CIS Benchmarks, SOC2, PCI DSS, HIPAA, and GDPR compliance.
 *
 * @module CloudSecurityPosture
 */

import * as crypto from 'crypto';
import {
  AccountRiskAssessment,
  CloudProvider,
  CloudProviderAdapter,
  ComplianceFramework,
  ComplianceReport,
  RemediationAction,
  ResourceRiskProfile,
  RiskSeverity,
  SecurityFinding
} from './posture/types';
import { ComplianceChecker } from './posture/ComplianceChecker';
import { ConfigurationScanner } from './posture/ConfigurationScanner';
import { RiskAssessor } from './posture/RiskAssessor';
import { RemediationAdvisor } from './posture/RemediationAdvisor';

// Re-export types for backward compatibility
export * from './posture/types';

/**
 * Cloud Security Posture Manager
 *
 * Manages multi-cloud security assessments, compliance scanning, risk scoring,
 * and remediation guidance across AWS, Azure, and GCP.
 */
export class CloudSecurityPostureManager {
  private providers: Map<CloudProvider, CloudProviderAdapter>;
  private findings: Map<string, SecurityFinding>;
  private remediations: Map<string, RemediationAction>;
  private assessmentCache: Map<string, { data: unknown; timestamp: number }>;
  private cacheExpiry: number;

  // Extracted components
  private complianceChecker: ComplianceChecker;
  private configScanner: ConfigurationScanner;
  private riskAssessor: RiskAssessor;
  private remediationAdvisor: RemediationAdvisor;

  /**
   * Initialize CSPM
   *
   * @param cacheExpiry - Cache expiry in milliseconds (default: 5 minutes)
   */
  constructor(cacheExpiry: number = 5 * 60 * 1000) {
    this.providers = new Map();
    this.findings = new Map();
    this.remediations = new Map();
    this.assessmentCache = new Map();
    this.cacheExpiry = cacheExpiry;

    // Initialize extracted components
    this.complianceChecker = new ComplianceChecker();
    this.configScanner = new ConfigurationScanner();
    this.riskAssessor = new RiskAssessor();
    this.remediationAdvisor = new RemediationAdvisor();
  }

  /**
   * Register cloud provider adapter
   */
  registerProvider(provider: CloudProvider, adapter: CloudProviderAdapter): void {
    this.providers.set(provider, adapter);
  }

  /**
   * Assess cloud resource security
   */
  async assessResource(
    provider: CloudProvider,
    resourceId: string,
    resourceType: string
  ): Promise<ResourceRiskProfile> {
    const cacheKey = `${provider}:${resourceId}`;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached as ResourceRiskProfile;
    }

    const providerAdapter = this.providers.get(provider);
    if (!providerAdapter) {
      throw new Error(`Provider ${provider} not registered`);
    }

    const assessments = await providerAdapter.assessResource(resourceId, resourceType);
    const findings: SecurityFinding[] = [];
    let riskScore = 0;

    // Run all assessment categories
    for (const assessment of assessments) {
      const categoryFindings = await this.configScanner.runAssessment(
        provider,
        providerAdapter,
        resourceId,
        resourceType,
        assessment.category
      );

      findings.push(...categoryFindings);
      this.storeFindings(categoryFindings);
      riskScore += this.riskAssessor.calculateCategoryRisk(categoryFindings);
    }

    // Detect configuration drift
    const driftDetection = await this.configScanner.detectDrift(
      providerAdapter,
      resourceId,
      resourceType
    );

    // Calculate compliance status
    const complianceStatus = this.complianceChecker.evaluateCompliance(findings);

    const profile: ResourceRiskProfile = {
      resourceId,
      resourceType,
      provider,
      riskScore: assessments.length > 0 ? Math.min(100, riskScore / assessments.length) : 0,
      findings: findings.length,
      criticalFindings: this.riskAssessor.countCriticalFindings(findings),
      complianceStatus,
      driftDetected: driftDetection.detected,
      driftDetails: driftDetection.details,
      lastAssessment: new Date(),
      trend: this.riskAssessor.calculateTrend(resourceId)
    };

    this.setInCache(cacheKey, profile);
    return profile;
  }

  /**
   * Assess entire cloud account
   */
  async assessAccount(provider: CloudProvider, accountId: string): Promise<AccountRiskAssessment> {
    const providerAdapter = this.providers.get(provider);
    if (!providerAdapter) {
      throw new Error(`Provider ${provider} not registered`);
    }

    const resources = await providerAdapter.enumerateResources(accountId);
    const assessments: ResourceRiskProfile[] = [];
    const allFindings: SecurityFinding[] = [];

    // Assess all resources in account
    for (const resource of resources) {
      const assessment = await this.assessResource(provider, resource.id, resource.type);
      assessments.push(assessment);

      // Collect all findings
      const resourceFindings = Array.from(this.findings.values()).filter(
        f => f.resourceId === resource.id
      );
      allFindings.push(...resourceFindings);
    }

    // Calculate scores
    const categoryScores = this.riskAssessor.calculateCategoryScores(allFindings);
    const complianceScores = this.complianceChecker.calculateComplianceScores(allFindings);
    const overallRiskScore = this.riskAssessor.calculateOverallRiskScore(
      assessments.map(a => a.riskScore)
    );

    // Build trend data
    const riskTrend = await this.riskAssessor.getRiskTrend(accountId, provider);

    return {
      accountId,
      provider,
      overallRiskScore,
      categoryScores,
      complianceScores,
      totalFindings: allFindings.length,
      criticalFindings: this.riskAssessor.countCriticalFindings(allFindings),
      highFindings: this.riskAssessor.countHighFindings(allFindings),
      unremediatedFindings: this.riskAssessor.countUnremediatedFindings(allFindings),
      assessmentDate: new Date(),
      trend: this.riskAssessor.calculateAccountTrend(riskTrend),
      riskTrend
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: ComplianceFramework,
    provider: CloudProvider,
    accountId: string
  ): Promise<ComplianceReport> {
    const findings = Array.from(this.findings.values()).filter(
      f => f.affectedFrameworks.includes(framework)
    );

    return this.complianceChecker.generateComplianceReport(
      framework,
      provider,
      accountId,
      findings
    );
  }

  /**
   * Execute automated remediation
   */
  async executeRemediation(findingId: string): Promise<RemediationAction> {
    const finding = this.findings.get(findingId);
    if (!finding) {
      throw new Error(`Finding ${findingId} not found`);
    }

    const provider = this.getFirstProvider();
    const providerAdapter = this.providers.get(provider);
    if (!providerAdapter) {
      throw new Error('No provider registered');
    }

    const action = await this.remediationAdvisor.executeRemediation(
      finding,
      provider,
      providerAdapter
    );

    // Update finding status if remediation completed
    if (action.status === 'completed') {
      finding.status = 'remediated';
      this.findings.set(findingId, finding);
    }

    this.remediations.set(action.id, action);
    return action;
  }

  /**
   * Rollback remediation
   */
  async rollbackRemediation(remediationId: string): Promise<RemediationAction> {
    const action = this.remediations.get(remediationId);
    if (!action) {
      throw new Error(`Remediation ${remediationId} not found`);
    }

    const finding = this.findings.get(action.findingId);
    if (!finding) {
      throw new Error(`Finding ${action.findingId} not found`);
    }

    const providerAdapter = this.providers.get(action.provider);
    if (!providerAdapter) {
      throw new Error(`Provider ${action.provider} not registered`);
    }

    const updatedAction = await this.remediationAdvisor.rollbackRemediation(
      action,
      finding,
      providerAdapter
    );

    // Restore finding status if rollback successful
    if (updatedAction.status === 'rolled_back') {
      finding.status = 'open';
      this.findings.set(action.findingId, finding);
    }

    this.remediations.set(remediationId, updatedAction);
    return updatedAction;
  }

  /**
   * Get findings for resource
   */
  getFindingsForResource(resourceId: string): SecurityFinding[] {
    return Array.from(this.findings.values()).filter(f => f.resourceId === resourceId);
  }

  /**
   * Get open findings
   */
  getOpenFindings(severity?: RiskSeverity): SecurityFinding[] {
    return Array.from(this.findings.values()).filter(f => {
      if (f.status !== 'open') return false;
      return severity ? f.severity === severity : true;
    });
  }

  // Private helper methods

  private storeFindings(findings: SecurityFinding[]): void {
    for (const finding of findings) {
      this.findings.set(finding.id, finding);
    }
  }

  private getFirstProvider(): CloudProvider {
    const providers = Array.from(this.providers.keys());
    if (providers.length === 0) {
      throw new Error('No providers registered');
    }
    return providers[0];
  }

  private generateId(): string {
    return `cspm_${crypto.randomBytes(8).toString('hex')}`;
  }

  private getFromCache(key: string): unknown | null {
    const cached = this.assessmentCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.assessmentCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setInCache(key: string, data: unknown): void {
    this.assessmentCache.set(key, { data, timestamp: Date.now() });
  }
}

export default CloudSecurityPostureManager;
