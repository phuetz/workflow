/**
 * DataCollector - Collects and analyzes compliance data for report generation
 */

import { ComplianceFramework } from '../../../types/compliance';
import type {
  ReportPeriod,
  FrameworkAnalysis,
  CategoryAnalysis,
  ControlAssessmentSection,
  ControlAssessmentDetail,
  GapAnalysisSection,
  GapSummary,
  PrioritizedGap,
  RemediationTimeline,
  EvidenceSection,
  RiskMatrixSection,
  RiskMatrixCell,
  RiskHeatmapData,
  RiskItem,
  TrendAnalysisSection,
  TrendPeriod,
  TrendDataPoint,
  TrendInsight,
  HistoricalPeriod,
  TrendAggregation,
  TrendPrediction,
  RiskPriority,
  StakeholderView,
} from './types';
import { RiskPriority as RiskPriorityEnum } from './types';

/**
 * DataCollector handles data gathering and analysis for compliance reports
 */
export class DataCollector {
  /**
   * Get framework control count
   */
  getFrameworkControlCount(framework: ComplianceFramework): number {
    const counts: Record<ComplianceFramework, number> = {
      [ComplianceFramework.SOC2]: 60,
      [ComplianceFramework.ISO27001]: 114,
      [ComplianceFramework.HIPAA]: 45,
      [ComplianceFramework.GDPR]: 99,
    };
    return counts[framework] || 50;
  }

  /**
   * Analyze a framework for the given period
   */
  analyzeFramework(framework: ComplianceFramework, period: ReportPeriod): FrameworkAnalysis {
    const totalControls = this.getFrameworkControlCount(framework);
    const compliantControls = Math.floor(totalControls * 0.75);
    const nonCompliantControls = Math.floor(totalControls * 0.15);
    const inProgressControls = totalControls - compliantControls - nonCompliantControls;

    return {
      framework,
      totalControls,
      compliantControls,
      nonCompliantControls,
      inProgressControls,
      complianceScore: (compliantControls / totalControls) * 100,
      trend: 'improving',
      criticalGaps: Math.floor(nonCompliantControls * 0.2),
      controlsByCategory: this.analyzeControlsByCategory(framework),
    };
  }

  /**
   * Analyze controls by category
   */
  analyzeControlsByCategory(framework: ComplianceFramework): Record<string, CategoryAnalysis> {
    const categories = ['Access Control', 'Encryption', 'Audit Logging', 'Incident Response'];
    const analysis: Record<string, CategoryAnalysis> = {};

    categories.forEach(category => {
      const total = Math.floor(Math.random() * 20) + 5;
      const compliant = Math.floor(total * (0.6 + Math.random() * 0.3));
      analysis[category] = {
        category,
        totalControls: total,
        compliantControls: compliant,
        score: (compliant / total) * 100,
      };
    });

    return analysis;
  }

  /**
   * Calculate overall compliance score
   */
  calculateOverallScore(analyses: FrameworkAnalysis[]): number {
    if (analyses.length === 0) return 0;
    return analyses.reduce((sum, a) => sum + a.complianceScore, 0) / analyses.length;
  }

  /**
   * Determine risk level based on score
   */
  determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  /**
   * Generate key findings
   */
  generateKeyFindings(analyses: FrameworkAnalysis[], stakeholderView: StakeholderView): string[] {
    const findings: string[] = [];

    for (const analysis of analyses) {
      if (analysis.complianceScore < 70) {
        findings.push(`${analysis.framework} compliance score is below target at ${analysis.complianceScore.toFixed(1)}%`);
      }
      if (analysis.criticalGaps > 0) {
        findings.push(`${analysis.criticalGaps} critical gaps identified in ${analysis.framework}`);
      }
    }

    if (findings.length === 0) {
      findings.push('All frameworks are meeting compliance targets');
    }

    return findings;
  }

  /**
   * Count critical issues
   */
  countCriticalIssues(analyses: FrameworkAnalysis[]): number {
    return analyses.reduce((sum, a) => sum + a.criticalGaps, 0);
  }

  /**
   * Calculate improvement from last period
   */
  calculateImprovementFromLastPeriod(frameworks: ComplianceFramework[], period: ReportPeriod): number {
    return Math.random() * 10 - 2; // -2% to +8%
  }

  /**
   * Generate top recommendations
   */
  generateTopRecommendations(analyses: FrameworkAnalysis[], stakeholderView: StakeholderView): string[] {
    const recommendations: string[] = [];

    for (const analysis of analyses) {
      if (analysis.criticalGaps > 0) {
        recommendations.push(`Prioritize remediation of ${analysis.criticalGaps} critical gaps in ${analysis.framework}`);
      }
      if (analysis.complianceScore < 80) {
        recommendations.push(`Increase focus on ${analysis.framework} to improve compliance score`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current compliance posture with regular monitoring');
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Generate next steps
   */
  generateNextSteps(analyses: FrameworkAnalysis[], stakeholderView: StakeholderView): string[] {
    return [
      'Review and prioritize identified gaps',
      'Allocate resources for remediation activities',
      'Schedule follow-up assessments',
      'Update stakeholders on progress',
    ];
  }

  /**
   * Generate control assessment section
   */
  generateControlAssessmentSection(framework: ComplianceFramework, period: ReportPeriod): ControlAssessmentSection {
    const totalControls = this.getFrameworkControlCount(framework);
    const assessments: ControlAssessmentDetail[] = [];

    for (let i = 1; i <= Math.min(totalControls, 20); i++) {
      assessments.push({
        controlId: `${framework}_${i}`,
        controlName: `Control ${i}`,
        category: ['Access Control', 'Encryption', 'Audit Logging'][i % 3],
        status: ['compliant', 'non_compliant', 'in_progress'][Math.floor(Math.random() * 3)],
        lastAssessed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        assessedBy: 'security_team',
        findings: [],
        evidenceCount: Math.floor(Math.random() * 5) + 1,
        riskPriority: (Math.floor(Math.random() * 4) + 1) as RiskPriority,
      });
    }

    const compliant = assessments.filter(a => a.status === 'compliant').length;
    const nonCompliant = assessments.filter(a => a.status === 'non_compliant').length;

    return {
      framework,
      assessments,
      summary: {
        total: assessments.length,
        compliant,
        nonCompliant,
        needsReview: assessments.length - compliant - nonCompliant,
      },
    };
  }

  /**
   * Perform gap analysis
   */
  performGapAnalysis(frameworks: ComplianceFramework[], period: ReportPeriod): GapAnalysisSection {
    const gapsByFramework: Record<ComplianceFramework, GapSummary> = {} as Record<ComplianceFramework, GapSummary>;

    let totalGaps = 0;
    let criticalGaps = 0;
    let highGaps = 0;
    let mediumGaps = 0;
    let lowGaps = 0;

    frameworks.forEach(framework => {
      const frameworkGaps = Math.floor(Math.random() * 20) + 5;
      const critical = Math.floor(frameworkGaps * 0.1);
      const high = Math.floor(frameworkGaps * 0.2);
      const medium = Math.floor(frameworkGaps * 0.3);
      const low = frameworkGaps - critical - high - medium;

      totalGaps += frameworkGaps;
      criticalGaps += critical;
      highGaps += high;
      mediumGaps += medium;
      lowGaps += low;

      gapsByFramework[framework] = {
        framework,
        totalGaps: frameworkGaps,
        gapsByCategory: {
          'Access Control': Math.floor(frameworkGaps * 0.3),
          'Data Protection': Math.floor(frameworkGaps * 0.25),
          'Monitoring': Math.floor(frameworkGaps * 0.25),
          'Other': Math.floor(frameworkGaps * 0.2),
        },
        estimatedRemediationEffort: `${frameworkGaps * 2}-${frameworkGaps * 4} days`,
      };
    });

    return {
      totalGaps,
      criticalGaps,
      highGaps,
      mediumGaps,
      lowGaps,
      gapsByFramework,
      prioritizedGaps: this.generatePrioritizedGaps(frameworks),
      remediationTimeline: this.generateRemediationTimeline(frameworks),
    };
  }

  /**
   * Generate prioritized gaps
   */
  generatePrioritizedGaps(frameworks: ComplianceFramework[]): PrioritizedGap[] {
    return frameworks.flatMap(framework => [
      {
        gap: {
          id: `gap_${framework}_1`,
          framework,
          controlId: `${framework}_access_1`,
          gapDescription: 'Missing multi-factor authentication for admin accounts',
          severity: 'critical' as const,
          impact: 'High risk of unauthorized access',
          currentState: 'Single-factor authentication',
          requiredState: 'MFA enabled for all admin accounts',
          remediationSteps: ['Configure MFA provider', 'Enable MFA for admins', 'Test and verify'],
          estimatedEffort: '2-3 days',
          priority: 1,
          status: 'open' as const,
        },
        riskScore: 95,
        businessImpact: 'Critical security vulnerability',
        remediationComplexity: 'medium' as const,
        recommendedPriority: RiskPriorityEnum.CRITICAL,
        estimatedCost: 5000,
      },
    ]);
  }

  /**
   * Generate remediation timeline
   */
  generateRemediationTimeline(frameworks: ComplianceFramework[]): RemediationTimeline[] {
    const now = new Date();
    return [
      {
        phase: 'Phase 1 - Critical Gaps',
        startDate: now,
        endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        gaps: ['gap_1', 'gap_2'],
        milestones: ['MFA implementation complete', 'Encryption upgrade complete'],
        resources: ['Security Team', 'IT Operations'],
      },
      {
        phase: 'Phase 2 - High Priority Gaps',
        startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        gaps: ['gap_3', 'gap_4', 'gap_5'],
        milestones: ['Access review process implemented', 'Logging improvements complete'],
        resources: ['Security Team', 'Compliance Team'],
      },
    ];
  }

  /**
   * Generate evidence section
   */
  generateEvidenceSection(frameworks: ComplianceFramework[], period: ReportPeriod): EvidenceSection {
    return {
      totalEvidence: 150,
      evidenceByType: {
        document: 45,
        screenshot: 30,
        log: 40,
        report: 20,
        attestation: 15,
      },
      evidenceByFramework: frameworks.reduce((acc, f) => {
        acc[f] = Math.floor(Math.random() * 50) + 20;
        return acc;
      }, {} as Record<ComplianceFramework, number>),
      recentEvidence: [],
      expiringEvidence: [],
      evidenceGaps: ['Control AC-1 missing attestation', 'Control ENC-3 needs updated screenshot'],
    };
  }

  /**
   * Generate risk matrix
   */
  generateRiskMatrix(analyses: FrameworkAnalysis[]): RiskMatrixSection {
    const matrix: RiskMatrixCell[][] = [];

    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      const row: RiskMatrixCell[] = [];
      for (let impact = 1; impact <= 5; impact++) {
        row.push({
          likelihood,
          impact,
          count: Math.floor(Math.random() * 5),
          controls: [],
        });
      }
      matrix.push(row);
    }

    return {
      matrix,
      heatmap: this.generateRiskHeatmap(analyses),
      topRisks: this.identifyTopRisks(analyses),
      riskDistribution: {
        critical: 5,
        high: 10,
        medium: 25,
        low: 40,
        informational: 20,
      },
    };
  }

  /**
   * Generate risk heatmap
   */
  generateRiskHeatmap(analyses: FrameworkAnalysis[]): RiskHeatmapData[] {
    const categories = ['Access Control', 'Data Protection', 'Network Security', 'Incident Response'];
    return categories.map(category => ({
      category,
      riskLevel: Math.random() * 100,
      controlCount: Math.floor(Math.random() * 30) + 10,
      gapCount: Math.floor(Math.random() * 10),
    }));
  }

  /**
   * Identify top risks
   */
  identifyTopRisks(analyses: FrameworkAnalysis[]): RiskItem[] {
    return [
      {
        id: 'risk_1',
        description: 'Insufficient access control monitoring',
        likelihood: 4,
        impact: 5,
        riskScore: 20,
        mitigationStatus: 'in_progress',
      },
      {
        id: 'risk_2',
        description: 'Outdated encryption standards',
        likelihood: 3,
        impact: 4,
        riskScore: 12,
        mitigationStatus: 'planned',
      },
    ];
  }

  /**
   * Analyze trends
   */
  analyzeTrends(frameworks: ComplianceFramework[], period: ReportPeriod): TrendAnalysisSection {
    const periods: TrendPeriod[] = [];
    const complianceTrend: TrendDataPoint[] = [];
    const gapTrend: TrendDataPoint[] = [];
    const riskTrend: TrendDataPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(period.endDate);
      date.setMonth(date.getMonth() - i);

      periods.push({
        label: date.toISOString().substring(0, 7),
        startDate: new Date(date.getFullYear(), date.getMonth(), 1),
        endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      });

      complianceTrend.push({
        date,
        value: 70 + Math.random() * 20 + (11 - i) * 0.5,
      });

      gapTrend.push({
        date,
        value: Math.max(5, 30 - (11 - i) * 1.5 + Math.random() * 5),
      });

      riskTrend.push({
        date,
        value: Math.max(10, 50 - (11 - i) * 2 + Math.random() * 10),
      });
    }

    const frameworkTrends: Record<ComplianceFramework, TrendDataPoint[]> = {} as Record<ComplianceFramework, TrendDataPoint[]>;
    frameworks.forEach(framework => {
      frameworkTrends[framework] = complianceTrend.map(point => ({
        ...point,
        value: point.value + (Math.random() * 10 - 5),
      }));
    });

    return {
      periods,
      complianceTrend,
      gapTrend,
      riskTrend,
      frameworkTrends,
      insights: this.generateTrendInsights(),
    };
  }

  /**
   * Generate trend insights
   */
  private generateTrendInsights(): TrendInsight[] {
    return [
      {
        type: 'improvement',
        message: 'Overall compliance score improved by 8% over the past quarter',
        metric: 'compliance_score',
        change: 8,
        recommendation: 'Continue current remediation activities',
      },
      {
        type: 'warning',
        message: 'Gap resolution rate has slowed in the past month',
        metric: 'gap_resolution_rate',
        change: -15,
        recommendation: 'Allocate additional resources to gap remediation',
      },
    ];
  }

  /**
   * Generate historical periods
   */
  generateHistoricalPeriods(count: number, periodType: 'month' | 'quarter' | 'year'): ReportPeriod[] {
    const periods: ReportPeriod[] = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const endDate = new Date(now);
      let startDate: Date;

      switch (periodType) {
        case 'month':
          endDate.setMonth(endDate.getMonth() - i);
          startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          endDate.setMonth(endDate.getMonth() - i * 3);
          startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() - i);
          startDate = new Date(endDate);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      periods.push({ startDate, endDate });
    }

    return periods;
  }

  /**
   * Get historical score
   */
  getHistoricalScore(framework: ComplianceFramework, period: ReportPeriod): number {
    return 70 + Math.random() * 25;
  }

  /**
   * Get historical control count
   */
  getHistoricalControlCount(framework: ComplianceFramework, period: ReportPeriod): number {
    return this.getFrameworkControlCount(framework);
  }

  /**
   * Get historical gap count
   */
  getHistoricalGapCount(framework: ComplianceFramework, period: ReportPeriod, type: 'identified' | 'resolved'): number {
    return Math.floor(Math.random() * 20) + 5;
  }

  /**
   * Get historical evidence count
   */
  getHistoricalEvidenceCount(framework: ComplianceFramework, period: ReportPeriod): number {
    return Math.floor(Math.random() * 50) + 20;
  }

  /**
   * Calculate trend aggregations
   */
  calculateTrendAggregations(periods: HistoricalPeriod[]): TrendAggregation[] {
    const scores = periods.map(p => p.complianceScore);
    const gaps = periods.map(p => p.gapsIdentified);

    return [
      {
        metric: 'compliance_score',
        average: scores.reduce((a, b) => a + b, 0) / scores.length,
        min: Math.min(...scores),
        max: Math.max(...scores),
        trend: scores[scores.length - 1] > scores[0] ? 'up' : 'down',
        percentChange: ((scores[scores.length - 1] - scores[0]) / scores[0]) * 100,
      },
      {
        metric: 'gaps_identified',
        average: gaps.reduce((a, b) => a + b, 0) / gaps.length,
        min: Math.min(...gaps),
        max: Math.max(...gaps),
        trend: gaps[gaps.length - 1] < gaps[0] ? 'up' : 'down',
        percentChange: ((gaps[gaps.length - 1] - gaps[0]) / gaps[0]) * 100,
      },
    ];
  }

  /**
   * Generate trend predictions
   */
  generateTrendPredictions(periods: HistoricalPeriod[]): TrendPrediction[] {
    const lastScore = periods[periods.length - 1]?.complianceScore || 75;

    return [
      {
        metric: 'compliance_score',
        predictedValue: Math.min(100, lastScore + 2),
        confidence: 0.75,
        horizon: '3 months',
      },
      {
        metric: 'gaps_count',
        predictedValue: Math.max(0, periods[periods.length - 1]?.gapsIdentified - 3 || 10),
        confidence: 0.70,
        horizon: '3 months',
      },
    ];
  }
}
