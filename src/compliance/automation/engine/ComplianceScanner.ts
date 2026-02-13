/**
 * ComplianceScanner - Compliance checking and scoring
 */

import { EventEmitter } from 'events';
import {
  AutomationControl,
  AssessmentResult,
  AssessmentType,
  ComplianceGap,
  ComplianceScore,
  ComplianceAlert,
  ComplianceFrameworkType,
  AlertSeverity,
  ControlStatus,
  ControlFrequency,
} from './types';

export class ComplianceScanner extends EventEmitter {
  private controls: Map<string, AutomationControl>;
  private assessments: Map<string, AssessmentResult[]>;
  private gaps: Map<string, ComplianceGap>;
  private scores: Map<ComplianceFrameworkType, ComplianceScore>;

  constructor(
    controls: Map<string, AutomationControl>,
    assessments: Map<string, AssessmentResult[]>,
    gaps: Map<string, ComplianceGap>,
    scores: Map<ComplianceFrameworkType, ComplianceScore>
  ) {
    super();
    this.controls = controls;
    this.assessments = assessments;
    this.gaps = gaps;
    this.scores = scores;
  }

  /**
   * Run comprehensive compliance check for a framework
   */
  async runComplianceCheck(
    framework: ComplianceFrameworkType,
    options: {
      fullAssessment?: boolean;
      collectEvidence?: boolean;
      assessedBy?: string;
    } = {},
    assessControlFunc: (
      controlId: string,
      assessedBy: string,
      options: { collectEvidence?: boolean; runAutomation?: boolean }
    ) => Promise<AssessmentResult>,
    createAlertFunc: (params: {
      framework?: ComplianceFrameworkType;
      controlId?: string;
      severity: AlertSeverity;
      title: string;
      description: string;
      source: string;
    }) => Promise<ComplianceAlert>,
    logAuditEntry: (entry: {
      eventType: string;
      framework?: ComplianceFrameworkType;
      actor: string;
      action: string;
      resourceType: string;
      resourceId: string;
      afterState?: Record<string, unknown>;
      result: 'success' | 'failure';
    }) => Promise<void>
  ): Promise<{
    framework: ComplianceFrameworkType;
    score: ComplianceScore;
    assessments: AssessmentResult[];
    gaps: ComplianceGap[];
    alerts: ComplianceAlert[];
  }> {
    const { fullAssessment = false, collectEvidence = true, assessedBy = 'system' } = options;

    await logAuditEntry({
      eventType: 'compliance_check_started',
      framework,
      actor: assessedBy,
      action: 'run_compliance_check',
      resourceType: 'framework',
      resourceId: framework,
      result: 'success',
    });

    const frameworkControls = this.getControlsByFramework(framework);
    const checkAssessments: AssessmentResult[] = [];
    const checkGaps: ComplianceGap[] = [];
    const checkAlerts: ComplianceAlert[] = [];

    for (const control of frameworkControls) {
      // Skip if recently assessed unless full assessment requested
      if (!fullAssessment && control.lastAssessedAt) {
        const daysSinceAssessment = (Date.now() - control.lastAssessedAt.getTime()) / (1000 * 60 * 60 * 24);
        const frequencyDays = this.getFrequencyDays(control.frequency);
        if (daysSinceAssessment < frequencyDays) {
          continue;
        }
      }

      try {
        const assessment = await assessControlFunc(control.id, assessedBy, {
          collectEvidence,
          runAutomation: control.assessmentType === AssessmentType.AUTOMATED,
        });
        checkAssessments.push(assessment);

        // Collect associated gaps and alerts
        const controlGaps = Array.from(this.gaps.values()).filter(
          g => g.controlId === control.id && g.status === 'open'
        );
        checkGaps.push(...controlGaps);
      } catch (error) {
        // Create alert for failed assessment
        const alert = await createAlertFunc({
          framework,
          controlId: control.id,
          severity: AlertSeverity.HIGH,
          title: `Failed to assess control ${control.name}`,
          description: `Assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          source: 'compliance_check',
        });
        checkAlerts.push(alert);
      }
    }

    // Update and get compliance score
    const score = await this.updateComplianceScore(framework);

    await logAuditEntry({
      eventType: 'compliance_check_completed',
      framework,
      actor: assessedBy,
      action: 'run_compliance_check',
      resourceType: 'framework',
      resourceId: framework,
      afterState: { score: score.overallScore, assessmentCount: checkAssessments.length },
      result: 'success',
    });

    this.emit('compliance:checked', { framework, score, assessments: checkAssessments, gaps: checkGaps });

    return {
      framework,
      score,
      assessments: checkAssessments,
      gaps: checkGaps,
      alerts: checkAlerts,
    };
  }

  /**
   * Get compliance score for a framework
   */
  async getComplianceScore(framework: ComplianceFrameworkType): Promise<ComplianceScore> {
    let score = this.scores.get(framework);

    if (!score) {
      score = await this.updateComplianceScore(framework);
    }

    return score;
  }

  /**
   * Update compliance score for a framework
   */
  async updateComplianceScore(framework: ComplianceFrameworkType): Promise<ComplianceScore> {
    const frameworkControls = this.getControlsByFramework(framework);

    if (frameworkControls.length === 0) {
      const emptyScore: ComplianceScore = {
        framework,
        overallScore: 0,
        weightedScore: 0,
        controlScores: new Map(),
        categoryScores: new Map(),
        trend: 'stable',
        historicalScores: [],
        lastAssessed: new Date(),
        nextAssessmentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        criticalGaps: 0,
        highGaps: 0,
        mediumGaps: 0,
        lowGaps: 0,
      };
      this.scores.set(framework, emptyScore);
      return emptyScore;
    }

    const controlScores = new Map<string, number>();
    const categoryScores = new Map<string, { total: number; count: number }>();
    let totalScore = 0;
    let totalWeight = 0;

    for (const control of frameworkControls) {
      const controlAssessments = this.assessments.get(control.id) || [];
      const latestAssessment = controlAssessments[controlAssessments.length - 1];
      const controlScore = latestAssessment?.score ?? 0;

      controlScores.set(control.id, controlScore);
      totalScore += controlScore * control.weight;
      totalWeight += control.weight;

      // Aggregate by category
      const categoryData = categoryScores.get(control.category) || { total: 0, count: 0 };
      categoryData.total += controlScore;
      categoryData.count += 1;
      categoryScores.set(control.category, categoryData);
    }

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const weightedScore = overallScore;

    // Calculate category averages
    const finalCategoryScores = new Map<string, number>();
    for (const [category, data] of Array.from(categoryScores.entries())) {
      finalCategoryScores.set(category, data.count > 0 ? data.total / data.count : 0);
    }

    // Count gaps by severity
    const frameworkGaps = Array.from(this.gaps.values()).filter(
      g => g.framework === framework && g.status !== 'resolved'
    );
    const criticalGaps = frameworkGaps.filter(g => g.severity === AlertSeverity.CRITICAL).length;
    const highGaps = frameworkGaps.filter(g => g.severity === AlertSeverity.HIGH).length;
    const mediumGaps = frameworkGaps.filter(g => g.severity === AlertSeverity.MEDIUM).length;
    const lowGaps = frameworkGaps.filter(g => g.severity === AlertSeverity.LOW).length;

    // Calculate trend
    const existingScore = this.scores.get(framework);
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    const historicalScores = existingScore?.historicalScores || [];

    if (historicalScores.length > 0) {
      const previousScore = historicalScores[historicalScores.length - 1].score;
      if (overallScore > previousScore + 5) trend = 'improving';
      else if (overallScore < previousScore - 5) trend = 'declining';
    }

    historicalScores.push({ date: new Date(), score: overallScore });
    if (historicalScores.length > 365) {
      historicalScores.shift();
    }

    const score: ComplianceScore = {
      framework,
      overallScore: Math.round(overallScore * 100) / 100,
      weightedScore: Math.round(weightedScore * 100) / 100,
      controlScores,
      categoryScores: finalCategoryScores,
      trend,
      historicalScores,
      lastAssessed: new Date(),
      nextAssessmentDue: this.calculateNextAssessmentDue(frameworkControls),
      criticalGaps,
      highGaps,
      mediumGaps,
      lowGaps,
    };

    this.scores.set(framework, score);
    this.emit('score:updated', { framework, score });

    return score;
  }

  /**
   * Get controls by framework
   */
  getControlsByFramework(framework: ComplianceFrameworkType): AutomationControl[] {
    return Array.from(this.controls.values()).filter(c => c.framework === framework);
  }

  /**
   * Get frequency in days
   */
  private getFrequencyDays(frequency: ControlFrequency): number {
    const daysMap: Record<string, number> = {
      continuous: 0,
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365,
    };
    return daysMap[frequency] || 30;
  }

  /**
   * Calculate next assessment due date
   */
  private calculateNextAssessmentDue(controls: AutomationControl[]): Date {
    const nextDates = controls
      .filter(c => c.nextAssessmentDue)
      .map(c => c.nextAssessmentDue!.getTime());

    if (nextDates.length === 0) {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    return new Date(Math.min(...nextDates));
  }
}
