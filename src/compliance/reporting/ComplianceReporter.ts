/**
 * Compliance Reporter
 * Generates compliance reports in multiple formats
 */

import { EventEmitter } from 'events';
import type {
  ComplianceReport,
  ComplianceFramework,
  ControlAssessment,
  ComplianceGap,
} from '../../types/compliance';

export class ComplianceReporter extends EventEmitter {
  /**
   * Generate compliance report
   */
  async generateReport(
    framework: ComplianceFramework,
    reportType: ComplianceReport['reportType'],
    generatedBy: string,
    data: {
      controlAssessments: ControlAssessment[];
      gaps: ComplianceGap[];
      totalControls: number;
      evidenceCount: number;
      attestationCount: number;
    },
    period: { startDate: Date; endDate: Date }
  ): Promise<ComplianceReport> {
    const compliantControls = data.controlAssessments.filter(
      a => a.status === 'compliant'
    ).length;

    const complianceScore = data.totalControls > 0
      ? (compliantControls / data.totalControls) * 100
      : 0;

    const criticalFindings = data.gaps.filter(g => g.severity === 'critical').length;
    const openGaps = data.gaps.filter(g => g.status === 'open' || g.status === 'in_progress').length;

    const report: ComplianceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      framework,
      reportType,
      generatedAt: new Date(),
      generatedBy,
      period,
      summary: {
        totalControls: data.totalControls,
        compliantControls,
        complianceScore,
        criticalFindings,
        openGaps,
      },
      controlAssessments: data.controlAssessments,
      gaps: data.gaps,
      recommendations: this.generateRecommendations(complianceScore, data.gaps),
      evidenceCount: data.evidenceCount,
      attestationCount: data.attestationCount,
      format: 'json',
    };

    this.emit('report:generated', { report });

    return report;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(score: number, gaps: ComplianceGap[]): string[] {
    const recommendations: string[] = [];

    if (score < 50) {
      recommendations.push('URGENT: Compliance score critically low. Immediate action required.');
    } else if (score < 70) {
      recommendations.push('Compliance score needs improvement. Prioritize gap remediation.');
    } else if (score < 90) {
      recommendations.push('Good compliance posture. Address remaining gaps to achieve full compliance.');
    } else {
      recommendations.push('Excellent compliance score. Maintain current controls.');
    }

    const criticalGaps = gaps.filter(g => g.severity === 'critical' && g.status !== 'resolved');
    if (criticalGaps.length > 0) {
      recommendations.push(`Address ${criticalGaps.length} critical gap(s) immediately.`);
    }

    const highGaps = gaps.filter(g => g.severity === 'high' && g.status !== 'resolved');
    if (highGaps.length > 0) {
      recommendations.push(`Remediate ${highGaps.length} high-priority gap(s) within 30 days.`);
    }

    return recommendations;
  }

  /**
   * Export report to CSV
   */
  async exportToCSV(report: ComplianceReport): Promise<string> {
    const headers = ['Control ID', 'Status', 'Assessed By', 'Assessed At', 'Findings'];
    const rows = report.controlAssessments.map(a => [
      a.controlId,
      a.status,
      a.assessedBy,
      a.assessedAt.toISOString(),
      a.findings.join('; '),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Export report to JSON
   */
  async exportToJSON(report: ComplianceReport): Promise<string> {
    return JSON.stringify(report, null, 2);
  }
}
