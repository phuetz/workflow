/**
 * MonitoringService - Continuous compliance monitoring
 */

import { EventEmitter } from 'events';
import {
  AutomationControl,
  ComplianceGap,
  ComplianceAlert,
  ComplianceFrameworkType,
  AlertSeverity,
  Evidence,
  AssessmentType,
  MonitoringConfig,
  AssessmentResult,
} from './types';

export class MonitoringService extends EventEmitter {
  private monitoringConfig: MonitoringConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private alerts: Map<string, ComplianceAlert>;
  private evidence: Map<string, Evidence[]>;
  private gaps: Map<string, ComplianceGap>;
  private controls: Map<string, AutomationControl>;
  private readonly MAX_ALERTS = 100000;

  private generateId: (prefix: string) => string;
  private getControlsByFramework: (framework: ComplianceFrameworkType) => AutomationControl[];
  private assessControl: (controlId: string, assessedBy: string, options: { collectEvidence?: boolean; runAutomation?: boolean }) => Promise<AssessmentResult>;

  constructor(
    alerts: Map<string, ComplianceAlert>,
    evidence: Map<string, Evidence[]>,
    gaps: Map<string, ComplianceGap>,
    controls: Map<string, AutomationControl>,
    generateId: (prefix: string) => string,
    getControlsByFramework: (framework: ComplianceFrameworkType) => AutomationControl[],
    assessControl: (controlId: string, assessedBy: string, options: { collectEvidence?: boolean; runAutomation?: boolean }) => Promise<AssessmentResult>
  ) {
    super();
    this.alerts = alerts;
    this.evidence = evidence;
    this.gaps = gaps;
    this.controls = controls;
    this.generateId = generateId;
    this.getControlsByFramework = getControlsByFramework;
    this.assessControl = assessControl;

    this.monitoringConfig = {
      enabled: true,
      checkIntervalMs: 60000,
      alertThresholds: new Map([
        [AlertSeverity.CRITICAL, 0],
        [AlertSeverity.HIGH, 5],
        [AlertSeverity.MEDIUM, 10],
        [AlertSeverity.LOW, 20],
        [AlertSeverity.INFO, 50],
      ]),
      notificationChannels: [],
      retentionDays: 365,
    };
  }

  startMonitoring(): void {
    if (this.monitoringInterval) return;
    this.monitoringConfig.enabled = true;
    this.monitoringInterval = setInterval(() => this.runMonitoringCycle(), this.monitoringConfig.checkIntervalMs);
    this.emit('monitoring:started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.monitoringConfig.enabled = false;
    this.emit('monitoring:stopped');
  }

  private async runMonitoringCycle(): Promise<void> {
    for (const framework of Object.values(ComplianceFrameworkType)) {
      const frameworkControls = this.getControlsByFramework(framework);
      for (const control of frameworkControls) {
        if (control.assessmentType === AssessmentType.CONTINUOUS) {
          if (!control.nextAssessmentDue || control.nextAssessmentDue <= new Date()) {
            try {
              await this.assessControl(control.id, 'monitoring_system', { collectEvidence: true, runAutomation: true });
            } catch (error) {
              await this.createAlert({
                framework,
                controlId: control.id,
                severity: AlertSeverity.MEDIUM,
                title: `Monitoring assessment failed for ${control.name}`,
                description: error instanceof Error ? error.message : 'Unknown error',
                source: 'monitoring',
              });
            }
          }
        }
      }
    }
    await this.checkExpiringEvidence();
    await this.checkOverdueGaps();
    this.emit('monitoring:cycle_completed');
  }

  private async checkExpiringEvidence(): Promise<void> {
    const now = new Date();
    const warningDays = 30;
    for (const [controlId, evidenceList] of Array.from(this.evidence.entries())) {
      for (const ev of evidenceList) {
        if (ev.validUntil) {
          const daysUntilExpiry = (ev.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (daysUntilExpiry <= warningDays && daysUntilExpiry > 0) {
            const control = this.controls.get(controlId);
            await this.createAlert({
              framework: control?.framework,
              controlId,
              severity: AlertSeverity.LOW,
              title: `Evidence expiring soon: ${ev.title}`,
              description: `Evidence will expire in ${Math.ceil(daysUntilExpiry)} days`,
              source: 'monitoring',
            });
          }
        }
      }
    }
  }

  private async checkOverdueGaps(): Promise<void> {
    const now = new Date();
    for (const gap of Array.from(this.gaps.values())) {
      if (gap.status !== 'resolved' && gap.dueDate && gap.dueDate < now) {
        await this.createAlert({
          framework: gap.framework,
          controlId: gap.controlId,
          severity: AlertSeverity.HIGH,
          title: `Overdue compliance gap: ${gap.controlName}`,
          description: `Gap remediation was due on ${gap.dueDate.toISOString()}`,
          source: 'monitoring',
        });
      }
    }
  }

  async createAlert(params: {
    framework?: ComplianceFrameworkType;
    controlId?: string;
    severity: AlertSeverity;
    title: string;
    description: string;
    source: string;
  }): Promise<ComplianceAlert> {
    const alert: ComplianceAlert = {
      id: this.generateId('alert'),
      framework: params.framework!,
      controlId: params.controlId,
      severity: params.severity,
      title: params.title,
      description: params.description,
      source: params.source,
      triggeredAt: new Date(),
      status: 'open',
      relatedAlerts: [],
    };

    this.alerts.set(alert.id, alert);

    if (this.alerts.size > this.MAX_ALERTS) {
      const oldestAlerts = Array.from(this.alerts.entries())
        .sort((a, b) => a[1].triggeredAt.getTime() - b[1].triggeredAt.getTime())
        .slice(0, 1000);
      for (const [id] of oldestAlerts) this.alerts.delete(id);
    }

    await this.sendAlertNotifications(alert);
    this.emit('alert:created', { alert });
    return alert;
  }

  private async sendAlertNotifications(alert: ComplianceAlert): Promise<void> {
    for (const channel of this.monitoringConfig.notificationChannels) {
      if (!channel.enabled || !channel.severities.includes(alert.severity)) continue;
      this.emit('notification:sent', { alert, channel: channel.type });
    }
  }

  getAlerts(options?: { framework?: ComplianceFrameworkType; status?: ComplianceAlert['status'] }): ComplianceAlert[] {
    let alertsList = Array.from(this.alerts.values());
    if (options?.framework) alertsList = alertsList.filter(a => a.framework === options.framework);
    if (options?.status) alertsList = alertsList.filter(a => a.status === options.status);
    return alertsList.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }
}
