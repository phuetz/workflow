/**
 * ContentGenerator - Generates report content for different report types
 */

import { ComplianceFramework } from '../../../types/compliance';
import type {
  ReportType,
  ReportPeriod,
  ReportContent,
  StakeholderView,
  ReportFilter,
  ExecutiveSummary,
  RecommendationSection,
  ReportAppendix,
} from './types';
import { RiskPriority } from './types';
import { DataCollector } from './DataCollector';

/**
 * ContentGenerator creates report content based on report type
 */
export class ContentGenerator {
  private dataCollector: DataCollector;

  constructor() {
    this.dataCollector = new DataCollector();
  }

  /**
   * Generate report content based on type
   */
  async generateReportContent(
    reportType: ReportType,
    frameworks: ComplianceFramework[],
    period: ReportPeriod,
    stakeholderView: StakeholderView,
    filters?: ReportFilter[],
    includeEvidence?: boolean,
    includeRecommendations?: boolean
  ): Promise<ReportContent> {
    const baseContent: ReportContent = {
      title: this.getReportTitle(reportType, frameworks),
      subtitle: `${period.startDate.toISOString().split('T')[0]} to ${period.endDate.toISOString().split('T')[0]}`,
    };

    switch (reportType) {
      case 'executive_summary' as ReportType:
        return this.generateExecutiveSummaryContent(baseContent, frameworks, period, stakeholderView);

      case 'detailed_assessment' as ReportType:
        return this.generateDetailedAssessmentContent(baseContent, frameworks, period, includeEvidence);

      case 'gap_analysis' as ReportType:
        return this.generateGapAnalysisContent(baseContent, frameworks, period, includeRecommendations);

      case 'audit_report' as ReportType:
        return this.generateAuditReportContent(baseContent, frameworks, period);

      case 'remediation_report' as ReportType:
        return this.generateRemediationReportContent(baseContent, frameworks, period);

      case 'trend_analysis' as ReportType:
        return this.generateTrendAnalysisContent(baseContent, frameworks, period);

      default:
        return baseContent;
    }
  }

  /**
   * Get report title based on type and frameworks
   */
  getReportTitle(reportType: ReportType, frameworks: ComplianceFramework[]): string {
    const frameworkNames = frameworks.join(', ');
    const titles: Record<string, string> = {
      'executive_summary': `Executive Compliance Summary - ${frameworkNames}`,
      'detailed_assessment': `Detailed Compliance Assessment - ${frameworkNames}`,
      'gap_analysis': `Compliance Gap Analysis - ${frameworkNames}`,
      'audit_report': `Compliance Audit Report - ${frameworkNames}`,
      'certification_package': `Certification Package - ${frameworkNames}`,
      'evidence_package': `Evidence Package - ${frameworkNames}`,
      'remediation_report': `Remediation Report - ${frameworkNames}`,
      'trend_analysis': `Compliance Trend Analysis - ${frameworkNames}`,
    };
    return titles[reportType] || `Compliance Report - ${frameworkNames}`;
  }

  /**
   * Generate Executive Summary content
   */
  private async generateExecutiveSummaryContent(
    baseContent: ReportContent,
    frameworks: ComplianceFramework[],
    period: ReportPeriod,
    stakeholderView: StakeholderView
  ): Promise<ReportContent> {
    const frameworkAnalysis = frameworks.map(framework =>
      this.dataCollector.analyzeFramework(framework, period)
    );

    const overallScore = this.dataCollector.calculateOverallScore(frameworkAnalysis);
    const riskLevel = this.dataCollector.determineRiskLevel(overallScore);

    const complianceStatus: Record<ComplianceFramework, number> = {} as Record<ComplianceFramework, number>;
    frameworkAnalysis.forEach(analysis => {
      complianceStatus[analysis.framework] = analysis.complianceScore;
    });

    const executiveSummary: ExecutiveSummary = {
      overallScore,
      riskLevel,
      keyFindings: this.dataCollector.generateKeyFindings(frameworkAnalysis, stakeholderView),
      criticalIssues: this.dataCollector.countCriticalIssues(frameworkAnalysis),
      complianceStatus,
      improvementFromLastPeriod: this.dataCollector.calculateImprovementFromLastPeriod(frameworks, period),
      recommendations: this.dataCollector.generateTopRecommendations(frameworkAnalysis, stakeholderView),
      nextSteps: this.dataCollector.generateNextSteps(frameworkAnalysis, stakeholderView),
    };

    return {
      ...baseContent,
      executiveSummary,
      frameworkAnalysis,
      riskMatrix: this.dataCollector.generateRiskMatrix(frameworkAnalysis),
    };
  }

  /**
   * Generate Detailed Assessment content
   */
  private async generateDetailedAssessmentContent(
    baseContent: ReportContent,
    frameworks: ComplianceFramework[],
    period: ReportPeriod,
    includeEvidence?: boolean
  ): Promise<ReportContent> {
    const controlAssessments = frameworks.map(framework =>
      this.dataCollector.generateControlAssessmentSection(framework, period)
    );

    const content: ReportContent = {
      ...baseContent,
      controlAssessments,
      frameworkAnalysis: frameworks.map(f => this.dataCollector.analyzeFramework(f, period)),
    };

    if (includeEvidence) {
      content.evidence = this.dataCollector.generateEvidenceSection(frameworks, period);
    }

    content.recommendations = this.generateDetailedRecommendations(controlAssessments);

    return content;
  }

  /**
   * Generate Gap Analysis content
   */
  private async generateGapAnalysisContent(
    baseContent: ReportContent,
    frameworks: ComplianceFramework[],
    period: ReportPeriod,
    includeRecommendations?: boolean
  ): Promise<ReportContent> {
    const gapAnalysis = this.dataCollector.performGapAnalysis(frameworks, period);

    const content: ReportContent = {
      ...baseContent,
      gapAnalysis,
      frameworkAnalysis: frameworks.map(f => this.dataCollector.analyzeFramework(f, period)),
      riskMatrix: this.dataCollector.generateRiskMatrix([]),
    };

    if (includeRecommendations) {
      content.recommendations = this.generateGapRecommendations(gapAnalysis);
    }

    return content;
  }

  /**
   * Generate Audit Report content
   */
  private async generateAuditReportContent(
    baseContent: ReportContent,
    frameworks: ComplianceFramework[],
    period: ReportPeriod
  ): Promise<ReportContent> {
    return {
      ...baseContent,
      frameworkAnalysis: frameworks.map(f => this.dataCollector.analyzeFramework(f, period)),
      controlAssessments: frameworks.map(f => this.dataCollector.generateControlAssessmentSection(f, period)),
      evidence: this.dataCollector.generateEvidenceSection(frameworks, period),
      gapAnalysis: this.dataCollector.performGapAnalysis(frameworks, period),
      recommendations: this.generateAuditRecommendations(frameworks),
      appendices: this.generateAuditAppendices(frameworks, period),
    };
  }

  /**
   * Generate Remediation Report content
   */
  private async generateRemediationReportContent(
    baseContent: ReportContent,
    frameworks: ComplianceFramework[],
    period: ReportPeriod
  ): Promise<ReportContent> {
    const gapAnalysis = this.dataCollector.performGapAnalysis(frameworks, period);

    return {
      ...baseContent,
      gapAnalysis,
      recommendations: this.generateRemediationPlan(gapAnalysis),
      appendices: this.generateRemediationAppendices(gapAnalysis),
    };
  }

  /**
   * Generate Trend Analysis content
   */
  private async generateTrendAnalysisContent(
    baseContent: ReportContent,
    frameworks: ComplianceFramework[],
    period: ReportPeriod
  ): Promise<ReportContent> {
    const trends = this.dataCollector.analyzeTrends(frameworks, period);

    return {
      ...baseContent,
      trends,
      frameworkAnalysis: frameworks.map(f => this.dataCollector.analyzeFramework(f, period)),
    };
  }

  /**
   * Generate detailed recommendations
   */
  private generateDetailedRecommendations(assessments: any[]): RecommendationSection[] {
    return [
      {
        priority: RiskPriority.CRITICAL,
        category: 'Access Control',
        title: 'Implement MFA for all privileged accounts',
        description: 'Multi-factor authentication should be enabled for all administrative and privileged user accounts.',
        rationale: 'Reduces risk of unauthorized access by 99%',
        estimatedEffort: '2 weeks',
        estimatedCost: 10000,
        relatedControls: ['AC-1', 'AC-2', 'AC-3'],
        relatedGaps: ['gap_1'],
      },
    ];
  }

  /**
   * Generate gap recommendations
   */
  private generateGapRecommendations(gapAnalysis: any): RecommendationSection[] {
    return this.generateDetailedRecommendations([]);
  }

  /**
   * Generate audit recommendations
   */
  private generateAuditRecommendations(frameworks: ComplianceFramework[]): RecommendationSection[] {
    return this.generateDetailedRecommendations([]);
  }

  /**
   * Generate audit appendices
   */
  private generateAuditAppendices(frameworks: ComplianceFramework[], period: ReportPeriod): ReportAppendix[] {
    return [
      {
        id: 'appendix_a',
        title: 'Appendix A - Control Mapping',
        type: 'table',
        content: {},
      },
      {
        id: 'appendix_b',
        title: 'Appendix B - Evidence Index',
        type: 'table',
        content: {},
      },
    ];
  }

  /**
   * Generate remediation plan
   */
  private generateRemediationPlan(gapAnalysis: any): RecommendationSection[] {
    return gapAnalysis.prioritizedGaps.map((pg: any) => ({
      priority: pg.recommendedPriority,
      category: 'Remediation',
      title: `Remediate: ${pg.gap.gapDescription}`,
      description: pg.gap.requiredState,
      rationale: pg.businessImpact,
      estimatedEffort: pg.gap.estimatedEffort,
      estimatedCost: pg.estimatedCost,
      relatedControls: [pg.gap.controlId],
      relatedGaps: [pg.gap.id],
    }));
  }

  /**
   * Generate remediation appendices
   */
  private generateRemediationAppendices(gapAnalysis: any): ReportAppendix[] {
    return [
      {
        id: 'appendix_timeline',
        title: 'Remediation Timeline',
        type: 'chart',
        content: gapAnalysis.remediationTimeline,
      },
    ];
  }
}
