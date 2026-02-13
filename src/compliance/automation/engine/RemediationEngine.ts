/**
 * RemediationEngine - Remediation planning and gap management
 */

import { EventEmitter } from 'events';
import {
  AutomationControl,
  AssessmentResult,
  RemediationPlan,
  RemediationStep,
  RemediationType,
  ComplianceGap,
  AlertSeverity,
  Finding,
  ComplianceFrameworkType,
  ControlStatus,
} from './types';

export class RemediationEngine extends EventEmitter {
  private gaps: Map<string, ComplianceGap>;
  private remediationPlans: Map<string, RemediationPlan>;
  private controls: Map<string, AutomationControl>;

  private generateId: (prefix: string) => string;

  constructor(
    gaps: Map<string, ComplianceGap>,
    remediationPlans: Map<string, RemediationPlan>,
    controls: Map<string, AutomationControl>,
    generateId: (prefix: string) => string
  ) {
    super();
    this.gaps = gaps;
    this.remediationPlans = remediationPlans;
    this.controls = controls;
    this.generateId = generateId;
  }

  /**
   * Get all gaps
   */
  getGaps(options?: { framework?: ComplianceFrameworkType; status?: ComplianceGap['status'] }): ComplianceGap[] {
    let gapsList = Array.from(this.gaps.values());

    if (options?.framework) {
      gapsList = gapsList.filter(g => g.framework === options.framework);
    }
    if (options?.status) {
      gapsList = gapsList.filter(g => g.status === options.status);
    }

    return gapsList;
  }

  /**
   * Generate remediation plan for gaps
   */
  async generateRemediationPlan(
    gapId: string,
    options: {
      assignTo?: string;
      dueDate?: Date;
      priority?: number;
    } = {}
  ): Promise<RemediationPlan> {
    const gap = this.gaps.get(gapId);
    if (!gap) {
      throw new Error(`Gap not found: ${gapId}`);
    }

    const control = this.controls.get(gap.controlId);
    if (!control) {
      throw new Error(`Control not found: ${gap.controlId}`);
    }

    const plan = await this.createRemediationPlan(control, [], options.assignTo || 'unassigned');

    if (options.dueDate) {
      plan.dueDate = options.dueDate;
    }
    if (options.priority !== undefined) {
      plan.priority = options.priority;
    }
    if (options.assignTo) {
      plan.assignedTo = options.assignTo;
    }

    gap.remediationPlan = plan;
    this.gaps.set(gapId, gap);
    this.remediationPlans.set(plan.id, plan);

    this.emit('remediation:planned', { gapId, plan });

    return plan;
  }

  /**
   * Create remediation plan for a control
   */
  async createRemediationPlan(
    control: AutomationControl,
    findings: Finding[],
    createdBy: string
  ): Promise<RemediationPlan> {
    const steps: RemediationStep[] = [];
    let order = 1;

    // Generate steps from control's remediation steps
    for (const step of control.remediationSteps) {
      steps.push({
        ...step,
        id: this.generateId('step'),
        order: order++,
        status: 'pending',
      });
    }

    // Add steps based on findings
    for (const finding of findings) {
      steps.push({
        id: this.generateId('step'),
        order: order++,
        title: `Address finding: ${finding.title.substring(0, 50)}`,
        description: finding.recommendation,
        type: RemediationType.MANUAL,
        estimatedEffort: '4 hours',
        status: 'pending',
      });
    }

    // Add default steps if none exist
    if (steps.length === 0) {
      steps.push(
        {
          id: this.generateId('step'),
          order: 1,
          title: 'Review control requirements',
          description: `Review the requirements for control ${control.name}`,
          type: RemediationType.MANUAL,
          estimatedEffort: '2 hours',
          status: 'pending',
        },
        {
          id: this.generateId('step'),
          order: 2,
          title: 'Implement control',
          description: `Implement or update control to meet requirements`,
          type: RemediationType.MANUAL,
          estimatedEffort: '8 hours',
          status: 'pending',
        },
        {
          id: this.generateId('step'),
          order: 3,
          title: 'Document evidence',
          description: 'Collect and document evidence of control implementation',
          type: RemediationType.MANUAL,
          estimatedEffort: '2 hours',
          status: 'pending',
        },
        {
          id: this.generateId('step'),
          order: 4,
          title: 'Verify compliance',
          description: 'Re-assess control to verify compliance',
          type: RemediationType.AUTOMATIC,
          estimatedEffort: '1 hour',
          status: 'pending',
        }
      );
    }

    const plan: RemediationPlan = {
      id: this.generateId('plan'),
      gapId: '',
      controlId: control.id,
      framework: control.framework,
      title: `Remediation Plan for ${control.name}`,
      description: `Plan to bring control ${control.id} into compliance`,
      steps,
      priority: this.calculateRemediationPriority(control),
      estimatedEffort: this.calculateStepsEffort(steps),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'draft',
      createdAt: new Date(),
      createdBy,
    };

    this.remediationPlans.set(plan.id, plan);
    return plan;
  }

  /**
   * Create a compliance gap
   */
  async createGap(
    control: AutomationControl,
    assessment: AssessmentResult | undefined,
    identifiedBy: string
  ): Promise<ComplianceGap> {
    const severity = this.calculateGapSeverity(control, assessment);

    const gap: ComplianceGap = {
      id: this.generateId('gap'),
      framework: control.framework,
      controlId: control.id,
      controlName: control.name,
      gapDescription: `Control ${control.name} is not meeting compliance requirements`,
      severity,
      riskScore: this.calculateRiskScore(control, assessment),
      impact: this.determineGapImpact(control, severity),
      currentState: control.status,
      requiredState: ControlStatus.COMPLIANT,
      identifiedAt: new Date(),
      identifiedBy,
      status: 'open',
      dueDate: this.calculateGapDueDate(severity),
    };

    this.gaps.set(gap.id, gap);
    this.emit('gap:created', { gap });

    return gap;
  }

  /**
   * Identify compliance gaps and generate recommendations
   */
  async identifyGaps(
    framework: ComplianceFrameworkType,
    options: {
      includeRemediation?: boolean;
      prioritize?: boolean;
    } = {}
  ): Promise<{
    gaps: ComplianceGap[];
    summary: {
      totalGaps: number;
      criticalGaps: number;
      highGaps: number;
      mediumGaps: number;
      lowGaps: number;
      estimatedRemediationEffort: string;
    };
    recommendations: string[];
  }> {
    const { includeRemediation = true, prioritize = true } = options;

    const frameworkControls = Array.from(this.controls.values()).filter(c => c.framework === framework);
    const identifiedGaps: ComplianceGap[] = [];

    for (const control of frameworkControls) {
      if (control.status === ControlStatus.NON_COMPLIANT ||
          control.status === ControlStatus.PARTIALLY_COMPLIANT) {

        // Check if gap already exists
        const existingGap = Array.from(this.gaps.values()).find(
          g => g.controlId === control.id && g.status !== 'resolved'
        );

        if (existingGap) {
          identifiedGaps.push(existingGap);
        } else {
          const gap = await this.createGap(control, undefined, 'system');
          identifiedGaps.push(gap);
        }
      }
    }

    // Prioritize gaps if requested
    if (prioritize) {
      identifiedGaps.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5);
      });
    }

    // Generate remediation plans if requested
    if (includeRemediation) {
      for (const gap of identifiedGaps) {
        if (!gap.remediationPlan) {
          const control = this.controls.get(gap.controlId);
          if (control) {
            gap.remediationPlan = await this.createRemediationPlan(control, [], 'system');
          }
        }
      }
    }

    // Calculate summary
    const summary = {
      totalGaps: identifiedGaps.length,
      criticalGaps: identifiedGaps.filter(g => g.severity === AlertSeverity.CRITICAL).length,
      highGaps: identifiedGaps.filter(g => g.severity === AlertSeverity.HIGH).length,
      mediumGaps: identifiedGaps.filter(g => g.severity === AlertSeverity.MEDIUM).length,
      lowGaps: identifiedGaps.filter(g => g.severity === AlertSeverity.LOW).length,
      estimatedRemediationEffort: this.calculateTotalRemediationEffort(identifiedGaps),
    };

    // Generate recommendations
    const recommendations = this.generateGapRecommendations(identifiedGaps, framework);

    return { gaps: identifiedGaps, summary, recommendations };
  }

  /**
   * Calculate gap severity
   */
  private calculateGapSeverity(
    _control: AutomationControl,
    assessment?: AssessmentResult
  ): AlertSeverity {
    const score = assessment?.score ?? 0;

    if (score < 30) return AlertSeverity.CRITICAL;
    if (score < 50) return AlertSeverity.HIGH;
    if (score < 70) return AlertSeverity.MEDIUM;
    if (score < 90) return AlertSeverity.LOW;
    return AlertSeverity.INFO;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(
    control: AutomationControl,
    assessment?: AssessmentResult
  ): number {
    const baseScore = 100 - (assessment?.score ?? 0);
    const weightMultiplier = control.weight / 10;
    return Math.min(100, baseScore * weightMultiplier);
  }

  /**
   * Determine gap impact
   */
  private determineGapImpact(control: AutomationControl, severity: AlertSeverity): string {
    const impacts: Record<AlertSeverity, string> = {
      [AlertSeverity.CRITICAL]: `Critical compliance violation affecting ${control.framework} certification`,
      [AlertSeverity.HIGH]: `Significant risk to ${control.framework} compliance posture`,
      [AlertSeverity.MEDIUM]: `Moderate impact on compliance in ${control.category}`,
      [AlertSeverity.LOW]: `Minor compliance gap in ${control.name}`,
      [AlertSeverity.INFO]: `Informational finding for ${control.name}`,
    };
    return impacts[severity];
  }

  /**
   * Calculate gap due date based on severity
   */
  private calculateGapDueDate(severity: AlertSeverity): Date {
    const daysMap: Record<AlertSeverity, number> = {
      [AlertSeverity.CRITICAL]: 7,
      [AlertSeverity.HIGH]: 14,
      [AlertSeverity.MEDIUM]: 30,
      [AlertSeverity.LOW]: 60,
      [AlertSeverity.INFO]: 90,
    };
    return new Date(Date.now() + daysMap[severity] * 24 * 60 * 60 * 1000);
  }

  /**
   * Calculate total remediation effort
   */
  private calculateTotalRemediationEffort(gaps: ComplianceGap[]): string {
    let totalHours = 0;

    for (const gap of gaps) {
      const severityHours: Record<AlertSeverity, number> = {
        [AlertSeverity.CRITICAL]: 80,
        [AlertSeverity.HIGH]: 40,
        [AlertSeverity.MEDIUM]: 20,
        [AlertSeverity.LOW]: 10,
        [AlertSeverity.INFO]: 4,
      };
      totalHours += severityHours[gap.severity] || 20;
    }

    if (totalHours < 40) return `${totalHours} hours`;
    if (totalHours < 200) return `${Math.ceil(totalHours / 40)} weeks`;
    return `${Math.ceil(totalHours / 160)} months`;
  }

  /**
   * Generate gap recommendations
   */
  private generateGapRecommendations(
    gaps: ComplianceGap[],
    framework: ComplianceFrameworkType
  ): string[] {
    const recommendations: string[] = [];

    const criticalGaps = gaps.filter(g => g.severity === AlertSeverity.CRITICAL);
    if (criticalGaps.length > 0) {
      recommendations.push(`Address ${criticalGaps.length} critical gap(s) within 7 days to maintain ${framework} compliance`);
    }

    const highGaps = gaps.filter(g => g.severity === AlertSeverity.HIGH);
    if (highGaps.length > 0) {
      recommendations.push(`Remediate ${highGaps.length} high-severity gap(s) within 14 days`);
    }

    const categories = Array.from(new Set(gaps.map(g => this.controls.get(g.controlId)?.category)));
    if (categories.length > 3) {
      recommendations.push('Consider cross-functional team to address gaps across multiple control categories');
    }

    if (gaps.length > 10) {
      recommendations.push('Allocate dedicated resources for compliance remediation program');
    }

    recommendations.push(`Schedule follow-up assessment for ${framework} framework after remediation`);

    return recommendations;
  }

  /**
   * Calculate remediation priority
   */
  private calculateRemediationPriority(control: AutomationControl): number {
    const statusPriority: Record<ControlStatus, number> = {
      [ControlStatus.NON_COMPLIANT]: 2,
      [ControlStatus.PARTIALLY_COMPLIANT]: 4,
      [ControlStatus.IN_PROGRESS]: 6,
      [ControlStatus.NOT_ASSESSED]: 5,
      [ControlStatus.COMPLIANT]: 10,
      [ControlStatus.NOT_APPLICABLE]: 10,
      [ControlStatus.EXCEPTION_GRANTED]: 8,
    };
    return Math.max(1, Math.min(10, statusPriority[control.status] - Math.floor(control.weight / 2)));
  }

  /**
   * Calculate total effort for remediation steps
   */
  private calculateStepsEffort(steps: RemediationStep[]): string {
    let totalHours = 0;

    for (const step of steps) {
      const match = step.estimatedEffort.match(/(\d+)/);
      if (match) {
        const value = parseInt(match[1], 10);
        if (step.estimatedEffort.includes('day')) totalHours += value * 8;
        else if (step.estimatedEffort.includes('week')) totalHours += value * 40;
        else totalHours += value;
      }
    }

    if (totalHours < 40) return `${totalHours} hours`;
    return `${Math.ceil(totalHours / 40)} weeks`;
  }
}
