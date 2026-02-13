/**
 * Compliance Auditor - Framework Compliance Checking
 * Automated auditing for SOC2, ISO 27001, HIPAA, GDPR
 */

import { EventEmitter } from 'events';
import type { ComplianceFramework } from '../types/compliance';
import type {
  ComplianceAuditResult,
  ComplianceFindings,
  ComplianceScanConfig,
  PolicySeverity,
  PolicyContext,
} from './types/governance';
import { ComplianceManager } from '../compliance/ComplianceManager';

/**
 * Compliance Auditor - Automated compliance checking
 */
export class ComplianceAuditor extends EventEmitter {
  private complianceManager: ComplianceManager;
  private scanConfig: ComplianceScanConfig;
  private auditHistory: Map<string, ComplianceAuditResult[]> = new Map();

  constructor(
    complianceManager: ComplianceManager,
    config: Partial<ComplianceScanConfig> = {}
  ) {
    super();
    this.complianceManager = complianceManager;
    this.scanConfig = {
      frameworks: config.frameworks || ['SOC2', 'ISO27001', 'HIPAA', 'GDPR'] as ComplianceFramework[],
      frequency: config.frequency || 'daily',
      scope: config.scope || 'all_agents',
      agentIds: config.agentIds,
      autoRemediate: config.autoRemediate ?? false,
      notifyOnFailure: config.notifyOnFailure ?? true,
    };
  }

  /**
   * Audit agent against all enabled frameworks
   */
  async auditAgent(agentId: string, context: PolicyContext, auditedBy: string): Promise<ComplianceAuditResult[]> {
    const results: ComplianceAuditResult[] = [];

    for (const framework of this.scanConfig.frameworks) {
      if (!this.complianceManager.isFrameworkEnabled(framework)) continue;

      const result = await this.auditFramework(agentId, framework, context, auditedBy);
      results.push(result);

      // Store in history
      this.storeAuditResult(agentId, result);
    }

    return results;
  }

  /**
   * Audit against specific framework
   */
  private async auditFramework(
    agentId: string,
    framework: ComplianceFramework,
    context: PolicyContext,
    auditedBy: string
  ): Promise<ComplianceAuditResult> {
    const controls = this.complianceManager.getControlsByFramework(framework);
    const findings: ComplianceFindings[] = [];
    let passCount = 0;

    for (const control of controls) {
      const finding = await this.evaluateControl(control.id, context);
      findings.push(finding);

      if (finding.status === 'pass') passCount++;
    }

    const score = controls.length > 0 ? (passCount / controls.length) * 100 : 100;
    const status = score >= 95 ? 'compliant' : score >= 70 ? 'partial' : 'non_compliant';

    const result: ComplianceAuditResult = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      framework,
      agentId,
      auditedAt: new Date(),
      auditedBy,
      score,
      status,
      findings,
      recommendations: this.generateRecommendations(findings),
      nextAuditDate: this.calculateNextAuditDate(),
    };

    this.emit('audit:completed', { agentId, framework, result });

    return result;
  }

  /**
   * Evaluate a single control
   */
  private async evaluateControl(controlId: string, context: PolicyContext): Promise<ComplianceFindings> {
    const control = this.complianceManager.getControl(controlId);
    if (!control) {
      return {
        controlId,
        controlName: 'Unknown Control',
        status: 'fail',
        severity: 'medium' as PolicySeverity,
        description: 'Control not found',
        remediationRequired: true,
      };
    }

    // Evaluate based on control category
    const status = this.checkControl(control.category, context);

    return {
      controlId: control.id,
      controlName: control.name,
      status,
      severity: status === 'fail' ? ('high' as PolicySeverity) : ('low' as PolicySeverity),
      description: control.description,
      evidence: [],
      remediationRequired: status === 'fail',
    };
  }

  /**
   * Check control compliance
   */
  private checkControl(category: string, context: PolicyContext): 'pass' | 'fail' | 'warning' {
    // Simplified control checks - in production, implement detailed checks per control
    const checks = {
      'Access Control': () => context.requestedActions.length <= 5,
      'Encryption': () => context.dataAccess.every(d => d.dataClassification !== 'restricted'),
      'Audit Logging': () => true, // Always enabled
      'Data Protection': () => !context.dataAccess.some(d => d.containsPII && d.accessType === 'delete'),
      'Incident Response': () => true,
      'Risk Management': () => context.metadata?.riskScore ? context.metadata.riskScore < 75 : true,
    };

    const check = checks[category as keyof typeof checks];
    if (!check) return 'warning';

    return check() ? 'pass' : 'fail';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(findings: ComplianceFindings[]): string[] {
    const recommendations: string[] = [];
    const failures = findings.filter(f => f.status === 'fail');

    if (failures.length === 0) {
      recommendations.push('All controls passed. Maintain current compliance posture.');
    } else {
      recommendations.push(`Address ${failures.length} failing control(s)`);
      failures.forEach(f => {
        recommendations.push(`- ${f.controlName}: ${f.description}`);
      });
    }

    return recommendations;
  }

  /**
   * Calculate next audit date
   */
  private calculateNextAuditDate(): Date {
    const now = Date.now();
    const intervals = {
      continuous: 1,
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    return new Date(now + intervals[this.scanConfig.frequency]);
  }

  /**
   * Store audit result
   */
  private storeAuditResult(agentId: string, result: ComplianceAuditResult): void {
    let history = this.auditHistory.get(agentId) || [];
    history.push(result);

    // Keep only last 100 audits
    if (history.length > 100) {
      history = history.slice(-100);
    }

    this.auditHistory.set(agentId, history);
  }

  /**
   * Get audit history
   */
  getAuditHistory(agentId: string): ComplianceAuditResult[] {
    return this.auditHistory.get(agentId) || [];
  }

  /**
   * Get compliance score
   */
  getComplianceScore(agentId: string): number {
    const history = this.getAuditHistory(agentId);
    if (history.length === 0) return 0;

    const latest = history[history.length - 1];
    return latest.score;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    let totalAudits = 0;
    let compliantAgents = 0;
    let nonCompliantAgents = 0;

    for (const history of this.auditHistory.values()) {
      totalAudits += history.length;
      if (history.length > 0) {
        const latest = history[history.length - 1];
        if (latest.status === 'compliant') compliantAgents++;
        else if (latest.status === 'non_compliant') nonCompliantAgents++;
      }
    }

    return {
      totalAudits,
      totalAgents: this.auditHistory.size,
      compliantAgents,
      nonCompliantAgents,
      frameworks: this.scanConfig.frameworks,
    };
  }
}

export const complianceAuditor = (manager: ComplianceManager) => new ComplianceAuditor(manager);
