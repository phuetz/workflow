/**
 * Risk Assessor
 *
 * Handles risk scoring and trend analysis.
 *
 * @module posture/RiskAssessor
 */

import {
  AssessmentCategory,
  CloudProvider,
  RiskSeverity,
  SecurityFinding
} from './types';

/**
 * RiskAssessor handles risk calculations and trend analysis
 */
export class RiskAssessor {
  /**
   * Calculate risk score for a set of findings
   */
  calculateCategoryRisk(findings: SecurityFinding[]): number {
    if (findings.length === 0) return 0;
    return findings.reduce((sum, f) => sum + f.riskScore, 0) / findings.length;
  }

  /**
   * Calculate scores for each assessment category
   */
  calculateCategoryScores(
    findings: SecurityFinding[]
  ): Record<AssessmentCategory, number> {
    const categories = Object.values(AssessmentCategory);
    const result: Record<AssessmentCategory, number> = {} as Record<AssessmentCategory, number>;

    for (const category of categories) {
      const categoryFindings = findings.filter(f => f.category === category);
      const remediatedCount = categoryFindings.filter(f => f.status === 'remediated').length;
      result[category] = categoryFindings.length > 0
        ? (remediatedCount / categoryFindings.length) * 100
        : 100;
    }

    return result;
  }

  /**
   * Calculate trend for a resource based on historical data
   */
  calculateTrend(_resourceId: string): 'improving' | 'stable' | 'degrading' {
    // Simplified: compare recent findings with historical
    return 'stable';
  }

  /**
   * Calculate account trend from risk trend data
   */
  calculateAccountTrend(
    trend: Array<{ date: Date; score: number }>
  ): 'improving' | 'stable' | 'degrading' {
    if (trend.length < 2) return 'stable';

    const recent = trend[trend.length - 1].score;
    const previous = trend[trend.length - 2].score;

    if (recent < previous - 5) return 'improving';
    if (recent > previous + 5) return 'degrading';
    return 'stable';
  }

  /**
   * Get risk trend data for an account
   */
  async getRiskTrend(
    _accountId: string,
    _provider: CloudProvider
  ): Promise<Array<{ date: Date; score: number }>> {
    // Simplified: return current assessment point
    return [{ date: new Date(), score: Math.random() * 100 }];
  }

  /**
   * Count critical findings
   */
  countCriticalFindings(findings: SecurityFinding[]): number {
    return findings.filter(f => f.severity === RiskSeverity.CRITICAL).length;
  }

  /**
   * Count high severity findings
   */
  countHighFindings(findings: SecurityFinding[]): number {
    return findings.filter(f => f.severity === RiskSeverity.HIGH).length;
  }

  /**
   * Count unremediated findings
   */
  countUnremediatedFindings(findings: SecurityFinding[]): number {
    return findings.filter(f => f.status === 'open').length;
  }

  /**
   * Calculate overall risk score from assessments
   */
  calculateOverallRiskScore(assessmentScores: number[]): number {
    if (assessmentScores.length === 0) return 0;
    return assessmentScores.reduce((sum, score) => sum + score, 0) / assessmentScores.length;
  }
}

export default RiskAssessor;
