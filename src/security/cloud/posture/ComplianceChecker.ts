/**
 * Compliance Checker
 *
 * Handles compliance framework evaluation and reporting.
 *
 * @module posture/ComplianceChecker
 */

import * as crypto from 'crypto';
import {
  AssessmentCategory,
  ComplianceFramework,
  ComplianceReport,
  CloudProvider,
  RiskSeverity,
  SecurityFinding
} from './types';

/**
 * ComplianceChecker handles compliance evaluation and report generation
 */
export class ComplianceChecker {
  /**
   * Evaluate compliance status across all frameworks
   */
  evaluateCompliance(findings: SecurityFinding[]): Record<ComplianceFramework, number> {
    const frameworks = Object.values(ComplianceFramework);
    const result: Record<ComplianceFramework, number> = {} as Record<ComplianceFramework, number>;

    for (const framework of frameworks) {
      const relevant = findings.filter(f => f.affectedFrameworks.includes(framework));
      const compliant = relevant.filter(f => f.status === 'remediated').length;
      result[framework] = relevant.length > 0 ? (compliant / relevant.length) * 100 : 100;
    }

    return result;
  }

  /**
   * Calculate compliance scores for all frameworks
   */
  calculateComplianceScores(
    findings: SecurityFinding[]
  ): Record<ComplianceFramework, number> {
    const frameworks = Object.values(ComplianceFramework);
    const result: Record<ComplianceFramework, number> = {} as Record<ComplianceFramework, number>;

    for (const framework of frameworks) {
      const relevant = findings.filter(f => f.affectedFrameworks.includes(framework));
      const compliant = relevant.filter(f => f.status === 'remediated').length;
      result[framework] = relevant.length > 0 ? (compliant / relevant.length) * 100 : 100;
    }

    return result;
  }

  /**
   * Map findings to compliance frameworks based on category
   */
  mapToFrameworks(category: AssessmentCategory): ComplianceFramework[] {
    const categoryMappings: Record<AssessmentCategory, ComplianceFramework[]> = {
      [AssessmentCategory.IDENTITY_ACCESS]: [
        ComplianceFramework.CIS_BENCHMARKS,
        ComplianceFramework.SOC2,
        ComplianceFramework.GDPR
      ],
      [AssessmentCategory.DATA_PROTECTION]: [
        ComplianceFramework.PCI_DSS,
        ComplianceFramework.HIPAA,
        ComplianceFramework.GDPR
      ],
      [AssessmentCategory.ENCRYPTION]: [
        ComplianceFramework.PCI_DSS,
        ComplianceFramework.HIPAA,
        ComplianceFramework.GDPR
      ],
      [AssessmentCategory.LOGGING_MONITORING]: [
        ComplianceFramework.SOC2,
        ComplianceFramework.HIPAA
      ],
      [AssessmentCategory.NETWORK_SECURITY]: [ComplianceFramework.CIS_BENCHMARKS],
      [AssessmentCategory.COMPUTE_SECURITY]: [ComplianceFramework.CIS_BENCHMARKS]
    };

    return categoryMappings[category] || [];
  }

  /**
   * Generate compliance report for a framework
   */
  generateComplianceReport(
    framework: ComplianceFramework,
    provider: CloudProvider,
    accountId: string,
    findings: SecurityFinding[]
  ): ComplianceReport {
    const relevantFindings = findings.filter(
      f => f.affectedFrameworks.includes(framework)
    );

    const categories = this.groupFindingsByCategory(relevantFindings);
    const categoryReports = categories.map(cat => ({
      name: cat.name,
      passed: cat.findings.filter(f => f.status === 'remediated').length,
      failed: cat.findings.filter(f => f.status === 'open').length,
      percentage: cat.findings.length > 0
        ? (cat.findings.filter(f => f.status === 'remediated').length / cat.findings.length) * 100
        : 100
    }));

    const failedControls = relevantFindings
      .filter(f => f.status === 'open')
      .map(f => ({
        controlId: f.id,
        controlName: f.title,
        severity: f.severity,
        affectedResources: 1,
        remediation: f.remediation.steps.join('; ')
      }));

    const completionPercentage = categoryReports.length > 0
      ? categoryReports.reduce((sum, c) => sum + c.percentage, 0) / categoryReports.length
      : 100;

    return {
      reportId: this.generateId(),
      framework,
      accountId,
      provider,
      generatedAt: new Date(),
      completionPercentage,
      categories: categoryReports,
      failedControls,
      executiveSummary: this.generateExecutiveSummary(
        completionPercentage,
        failedControls.length
      ),
      recommendations: this.generateRecommendations(relevantFindings)
    };
  }

  /**
   * Group findings by assessment category
   */
  private groupFindingsByCategory(
    findings: SecurityFinding[]
  ): Array<{ name: string; findings: SecurityFinding[] }> {
    const grouped = new Map<string, SecurityFinding[]>();

    for (const finding of findings) {
      const key = finding.category;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(finding);
    }

    return Array.from(grouped.entries()).map(([name, findings]) => ({ name, findings }));
  }

  /**
   * Generate executive summary for report
   */
  private generateExecutiveSummary(completionPercentage: number, failedCount: number): string {
    return `${completionPercentage.toFixed(1)}% compliant with ${failedCount} failed controls requiring attention.`;
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(findings: SecurityFinding[]): string[] {
    const critical = findings.filter(f => f.severity === RiskSeverity.CRITICAL);
    const recommendations: string[] = [];

    if (critical.length > 0) {
      recommendations.push(`Immediately address ${critical.length} critical findings`);
    }

    if (findings.filter(f => f.category === AssessmentCategory.IDENTITY_ACCESS).length > 0) {
      recommendations.push('Review and restrict identity and access policies');
    }

    recommendations.push('Implement automated compliance monitoring');
    recommendations.push('Establish regular security assessment schedule');

    return recommendations;
  }

  /**
   * Generate unique identifier
   */
  private generateId(): string {
    return `report_${crypto.randomBytes(8).toString('hex')}`;
  }
}

export default ComplianceChecker;
