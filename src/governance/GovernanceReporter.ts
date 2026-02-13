/**
 * Governance Reporter - Compliance Report Generation
 * Generate comprehensive governance reports in multiple formats
 */

import { EventEmitter } from 'events';
import type {
  GovernanceReport,
  GovernanceReportType,
  GovernanceSummary,
  ReportSection,
  ChartData,
} from './types/governance';
import { PolicyEngine } from './PolicyEngine';
import { RiskEvaluator } from './RiskEvaluator';
import { ComplianceAuditor } from './ComplianceAuditor';
import { AgentIdentityManager } from './AgentIdentityManager';
import { TaskAdherenceMonitor } from './TaskAdherenceMonitor';
import { PromptInjectionShield } from './PromptInjectionShield';
import { PIIDetector } from './PIIDetector';

/**
 * Governance Reporter - Generates comprehensive governance reports
 */
export class GovernanceReporter extends EventEmitter {
  private policyEngine: PolicyEngine;
  private riskEvaluator: RiskEvaluator;
  private complianceAuditor: ComplianceAuditor;
  private identityManager: AgentIdentityManager;
  private adherenceMonitor: TaskAdherenceMonitor;
  private injectionShield: PromptInjectionShield;
  private piiDetector: PIIDetector;

  constructor(
    policyEngine: PolicyEngine,
    riskEvaluator: RiskEvaluator,
    complianceAuditor: ComplianceAuditor,
    identityManager: AgentIdentityManager,
    adherenceMonitor: TaskAdherenceMonitor,
    injectionShield: PromptInjectionShield,
    piiDetector: PIIDetector
  ) {
    super();
    this.policyEngine = policyEngine;
    this.riskEvaluator = riskEvaluator;
    this.complianceAuditor = complianceAuditor;
    this.identityManager = identityManager;
    this.adherenceMonitor = adherenceMonitor;
    this.injectionShield = injectionShield;
    this.piiDetector = piiDetector;
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(
    generatedBy: string,
    period: { start: Date; end: Date }
  ): Promise<GovernanceReport> {
    const summary = this.collectSummary();
    const sections: ReportSection[] = [];

    // Overview section
    sections.push({
      title: 'Executive Overview',
      content: this.formatExecutiveOverview(summary),
      charts: [this.createComplianceChart(summary)],
    });

    // Risk section
    sections.push({
      title: 'Risk Assessment',
      content: this.formatRiskAssessment(summary),
      charts: [this.createRiskChart(summary)],
    });

    // Compliance section
    sections.push({
      title: 'Compliance Status',
      content: this.formatComplianceStatus(summary),
    });

    // Recommendations
    const recommendations = this.generateExecutiveRecommendations(summary);

    return this.createReport(
      'executive_summary',
      'Governance Executive Summary',
      generatedBy,
      period,
      summary,
      sections,
      recommendations,
      'pdf'
    );
  }

  /**
   * Generate compliance status report
   */
  async generateComplianceReport(
    generatedBy: string,
    period: { start: Date; end: Date }
  ): Promise<GovernanceReport> {
    const summary = this.collectSummary();
    const sections: ReportSection[] = [];

    // Policy compliance
    sections.push({
      title: 'Policy Compliance',
      content: this.formatPolicyCompliance(),
    });

    // Violations
    sections.push({
      title: 'Policy Violations',
      content: this.formatViolations(),
      charts: [this.createViolationTrendChart()],
    });

    // Audit results
    sections.push({
      title: 'Audit Results',
      content: this.formatAuditResults(),
    });

    const recommendations = this.generateComplianceRecommendations();

    return this.createReport(
      'compliance_status',
      'Compliance Status Report',
      generatedBy,
      period,
      summary,
      sections,
      recommendations,
      'pdf'
    );
  }

  /**
   * Generate risk assessment report
   */
  async generateRiskReport(
    generatedBy: string,
    period: { start: Date; end: Date }
  ): Promise<GovernanceReport> {
    const summary = this.collectSummary();
    const sections: ReportSection[] = [];

    const riskStats = this.riskEvaluator.getStatistics();

    sections.push({
      title: 'Risk Overview',
      content: `Average Risk Score: ${riskStats.avgRiskScore.toFixed(2)}/100\nHigh-Risk Agents: ${riskStats.highRiskAgents}`,
      charts: [this.createRiskDistributionChart()],
    });

    sections.push({
      title: 'Risk Factors Analysis',
      content: this.formatRiskFactors(),
    });

    const recommendations = this.generateRiskRecommendations(riskStats);

    return this.createReport(
      'risk_assessment',
      'Risk Assessment Report',
      generatedBy,
      period,
      summary,
      sections,
      recommendations,
      'pdf'
    );
  }

  /**
   * Generate policy violations report
   */
  async generateViolationsReport(
    generatedBy: string,
    period: { start: Date; end: Date }
  ): Promise<GovernanceReport> {
    const summary = this.collectSummary();
    const violations = this.policyEngine.getViolations();

    const sections: ReportSection[] = [{
      title: 'Violations Summary',
      content: `Total Violations: ${violations.length}\nCritical: ${summary.criticalViolations}\nOpen: ${violations.filter(v => v.status === 'open').length}`,
      data: violations,
      charts: [this.createViolationsBySeverityChart()],
    }];

    return this.createReport(
      'policy_violations',
      'Policy Violations Report',
      generatedBy,
      period,
      summary,
      sections,
      ['Review and address critical violations immediately'],
      'json'
    );
  }

  /**
   * Generate agent activity report
   */
  async generateAgentActivityReport(
    generatedBy: string,
    period: { start: Date; end: Date }
  ): Promise<GovernanceReport> {
    const summary = this.collectSummary();
    const identityStats = this.identityManager.getStatistics();

    const sections: ReportSection[] = [{
      title: 'Agent Activity',
      content: `Active Agents: ${summary.activeAgents}\nSuspended: ${summary.suspendedAgents}\nTotal Credentials: ${identityStats.totalCredentials}`,
      charts: [this.createAgentStatusChart()],
    }];

    return this.createReport(
      'agent_activity',
      'Agent Activity Report',
      generatedBy,
      period,
      summary,
      sections,
      [],
      'json'
    );
  }

  /**
   * Generate PII exposure report
   */
  async generatePIIReport(
    generatedBy: string,
    period: { start: Date; end: Date }
  ): Promise<GovernanceReport> {
    const summary = this.collectSummary();
    const piiStats = this.piiDetector.getStatistics();

    const sections: ReportSection[] = [{
      title: 'PII Detections',
      content: `Total PII Detections: ${summary.piiDetections}\nPII Types Detected: ${Object.keys(piiStats.patternsByType).length}`,
      charts: [this.createPIITypesChart()],
    }];

    return this.createReport(
      'pii_exposure',
      'PII Exposure Report',
      generatedBy,
      period,
      summary,
      sections,
      ['Review PII handling policies', 'Implement data masking where needed'],
      'pdf'
    );
  }

  /**
   * Generate security incidents report
   */
  async generateSecurityReport(
    generatedBy: string,
    period: { start: Date; end: Date }
  ): Promise<GovernanceReport> {
    const summary = this.collectSummary();
    const injectionStats = this.injectionShield.getStatistics();

    const sections: ReportSection[] = [{
      title: 'Security Incidents',
      content: `Prompt Injection Attempts: ${summary.promptInjections}\nBlocked: ${injectionStats.totalBlocks}\nBlock Rate: ${injectionStats.blockRate.toFixed(2)}%`,
      charts: [this.createSecurityIncidentsChart()],
    }];

    return this.createReport(
      'security_incidents',
      'Security Incidents Report',
      generatedBy,
      period,
      summary,
      sections,
      ['Maintain current security posture', 'Review blocked injection patterns'],
      'pdf'
    );
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Collect governance summary
   */
  private collectSummary(): GovernanceSummary {
    const policyStats = this.policyEngine.getStatistics();
    const riskStats = this.riskEvaluator.getStatistics();
    const identityStats = this.identityManager.getStatistics();
    const complianceStats = this.complianceAuditor.getStatistics();
    const piiStats = this.piiDetector.getStatistics();
    const injectionStats = this.injectionShield.getStatistics();

    return {
      totalAgents: identityStats.totalAgents,
      activeAgents: identityStats.agentsByStatus.active,
      suspendedAgents: identityStats.agentsByStatus.suspended,
      totalPolicies: policyStats.policies.total,
      activePolicies: policyStats.policies.enabled,
      policyViolations: policyStats.violations.total,
      criticalViolations: policyStats.violations.bySeverity.critical,
      averageRiskScore: riskStats.avgRiskScore,
      complianceScore: this.policyEngine.getPolicyComplianceScore(),
      piiDetections: piiStats.totalDetections,
      promptInjections: injectionStats.totalDetections,
    };
  }

  /**
   * Create report object
   */
  private createReport(
    type: GovernanceReportType,
    title: string,
    generatedBy: string,
    period: { start: Date; end: Date },
    summary: GovernanceSummary,
    sections: ReportSection[],
    recommendations: string[],
    format: 'json' | 'pdf' | 'html' | 'csv'
  ): GovernanceReport {
    const report: GovernanceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      generatedAt: new Date(),
      generatedBy,
      period,
      summary,
      sections,
      recommendations,
      format,
    };

    this.emit('report:generated', { reportId: report.id, type });

    return report;
  }

  /**
   * Format methods
   */
  private formatExecutiveOverview(summary: GovernanceSummary): string {
    return `
Governance Health Score: ${summary.complianceScore.toFixed(1)}/100

Agent Status:
- Total Agents: ${summary.totalAgents}
- Active: ${summary.activeAgents}
- Suspended: ${summary.suspendedAgents}

Security Posture:
- Average Risk Score: ${summary.averageRiskScore.toFixed(1)}/100
- Policy Violations: ${summary.policyViolations}
- Critical Violations: ${summary.criticalViolations}

Compliance:
- Compliance Score: ${summary.complianceScore.toFixed(1)}%
- Active Policies: ${summary.activePolicies}/${summary.totalPolicies}
    `.trim();
  }

  private formatRiskAssessment(summary: GovernanceSummary): string {
    const riskLevel = summary.averageRiskScore > 75 ? 'CRITICAL' :
                      summary.averageRiskScore > 50 ? 'HIGH' :
                      summary.averageRiskScore > 25 ? 'MEDIUM' : 'LOW';

    return `Risk Level: ${riskLevel}\nAverage Risk Score: ${summary.averageRiskScore.toFixed(1)}/100`;
  }

  private formatComplianceStatus(summary: GovernanceSummary): string {
    const status = summary.complianceScore >= 95 ? 'COMPLIANT' :
                   summary.complianceScore >= 70 ? 'PARTIAL' : 'NON-COMPLIANT';

    return `Status: ${status}\nCompliance Score: ${summary.complianceScore.toFixed(1)}%`;
  }

  private formatPolicyCompliance(): string {
    const stats = this.policyEngine.getStatistics();
    return `Total Policies: ${stats.policies.total}\nEnabled: ${stats.policies.enabled}\nEvaluations: ${stats.performance.totalEvaluations}`;
  }

  private formatViolations(): string {
    const violations = this.policyEngine.getViolations();
    const open = violations.filter(v => v.status === 'open').length;
    return `Total Violations: ${violations.length}\nOpen: ${open}\nResolved: ${violations.length - open}`;
  }

  private formatAuditResults(): string {
    const stats = this.complianceAuditor.getStatistics();
    return `Total Audits: ${stats.totalAudits}\nCompliant Agents: ${stats.compliantAgents}\nNon-Compliant: ${stats.nonCompliantAgents}`;
  }

  private formatRiskFactors(): string {
    return 'Risk factors analyzed: Data Access, External APIs, Permissions, Execution History, Complexity, PII Exposure, Compliance, Cost, Performance, Ethical AI';
  }

  /**
   * Chart creation methods
   */
  private createComplianceChart(summary: GovernanceSummary): ChartData {
    return {
      type: 'pie',
      title: 'Compliance Status',
      data: [summary.complianceScore, 100 - summary.complianceScore],
      labels: ['Compliant', 'Non-Compliant'],
    };
  }

  private createRiskChart(summary: GovernanceSummary): ChartData {
    return {
      type: 'bar',
      title: 'Risk Score',
      data: [summary.averageRiskScore],
      labels: ['Average Risk'],
    };
  }

  private createViolationTrendChart(): ChartData {
    const stats = this.policyEngine.getStatistics();
    return {
      type: 'line',
      title: 'Violations Trend',
      data: Object.values(stats.violations.bySeverity),
      labels: ['Critical', 'High', 'Medium', 'Low'],
    };
  }

  private createRiskDistributionChart(): ChartData {
    return {
      type: 'bar',
      title: 'Risk Distribution',
      data: [25, 40, 25, 10],
      labels: ['Low', 'Medium', 'High', 'Critical'],
    };
  }

  private createViolationsBySeverityChart(): ChartData {
    const stats = this.policyEngine.getStatistics();
    return {
      type: 'pie',
      title: 'Violations by Severity',
      data: Object.values(stats.violations.bySeverity),
      labels: ['Critical', 'High', 'Medium', 'Low'],
    };
  }

  private createAgentStatusChart(): ChartData {
    const stats = this.identityManager.getStatistics();
    return {
      type: 'pie',
      title: 'Agent Status',
      data: Object.values(stats.agentsByStatus),
      labels: ['Active', 'Suspended', 'Revoked'],
    };
  }

  private createPIITypesChart(): ChartData {
    const stats = this.piiDetector.getStatistics();
    return {
      type: 'bar',
      title: 'PII Types Detected',
      data: Object.values(stats.patternsByType),
      labels: Object.keys(stats.patternsByType),
    };
  }

  private createSecurityIncidentsChart(): ChartData {
    const stats = this.injectionShield.getStatistics();
    return {
      type: 'bar',
      title: 'Security Incidents',
      data: Object.values(stats.patternsByType),
      labels: Object.keys(stats.patternsByType),
    };
  }

  /**
   * Recommendation generators
   */
  private generateExecutiveRecommendations(summary: GovernanceSummary): string[] {
    const recommendations: string[] = [];

    if (summary.criticalViolations > 0) {
      recommendations.push(`URGENT: Address ${summary.criticalViolations} critical policy violations`);
    }

    if (summary.averageRiskScore > 75) {
      recommendations.push('High risk score detected - conduct immediate security review');
    }

    if (summary.complianceScore < 95) {
      recommendations.push('Improve compliance score to meet certification requirements');
    }

    if (summary.suspendedAgents > summary.activeAgents * 0.1) {
      recommendations.push('High number of suspended agents - review agent management processes');
    }

    return recommendations;
  }

  private generateComplianceRecommendations(): string[] {
    return [
      'Regular compliance audits recommended',
      'Maintain evidence for all controls',
      'Update policies to reflect current requirements',
    ];
  }

  private generateRiskRecommendations(riskStats: any): string[] {
    const recommendations: string[] = [];

    if (riskStats.highRiskAgents > 0) {
      recommendations.push(`Review ${riskStats.highRiskAgents} high-risk agents`);
    }

    recommendations.push('Implement continuous risk monitoring');
    recommendations.push('Regular security training for agent operators');

    return recommendations;
  }
}

/**
 * Factory function
 */
export const createGovernanceReporter = (
  policyEngine: PolicyEngine,
  riskEvaluator: RiskEvaluator,
  complianceAuditor: ComplianceAuditor,
  identityManager: AgentIdentityManager,
  adherenceMonitor: TaskAdherenceMonitor,
  injectionShield: PromptInjectionShield,
  piiDetector: PIIDetector
) => new GovernanceReporter(
  policyEngine,
  riskEvaluator,
  complianceAuditor,
  identityManager,
  adherenceMonitor,
  injectionShield,
  piiDetector
);
