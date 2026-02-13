import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as cron from 'node-cron';

export interface SLADefinition {
  id: string;
  name: string;
  description?: string;
  type: 'availability' | 'performance' | 'response-time' | 'resolution-time' | 'throughput' | 'custom';
  target: SLATarget;
  measurement: SLAMeasurement;
  businessHours?: BusinessHours;
  exclusions?: SLAExclusion[];
  escalation?: EscalationPolicy;
  penalties?: PenaltyDefinition[];
  reporting: SLAReporting;
  status: 'draft' | 'active' | 'suspended' | 'expired';
  validity: {
    startDate: Date;
    endDate?: Date;
  };
  metadata: {
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    version: number;
    tags?: string[];
  };
}

export interface SLATarget {
  metric: string;
  value: number;
  unit: 'percentage' | 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'count' | 'custom';
  aggregation: 'average' | 'minimum' | 'maximum' | 'percentile' | 'sum';
  percentile?: number; // For percentile aggregation
  comparison: 'greater-than' | 'less-than' | 'equal' | 'between';
  thresholds?: {
    warning?: number;
    critical?: number;
  };
}

export interface SLAMeasurement {
  source: 'metrics' | 'logs' | 'api' | 'database' | 'custom';
  query?: string;
  endpoint?: string;
  filters?: Record<string, unknown>;
  interval: 'minute' | 'hour' | 'day' | 'week' | 'month';
  window?: {
    size: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  calculation?: string; // Custom calculation expression
}

export interface BusinessHours {
  timezone: string;
  schedule: Array<{
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    start: string; // HH:mm format
    end: string;
  }>;
  holidays?: Array<{
    date: string; // YYYY-MM-DD
    name: string;
    recurring?: boolean;
  }>;
}

export interface SLAExclusion {
  type: 'maintenance' | 'incident' | 'planned' | 'force-majeure';
  startTime: Date;
  endTime: Date;
  reason: string;
  approvedBy?: string;
  automaticDetection?: boolean;
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
  repeatInterval?: number; // minutes
  maxEscalations?: number;
}

export interface EscalationLevel {
  level: number;
  threshold: number; // percentage of target
  delay: number; // minutes before escalation
  contacts: EscalationContact[];
  actions?: EscalationAction[];
}

export interface EscalationContact {
  type: 'email' | 'sms' | 'phone' | 'slack' | 'pagerduty' | 'webhook';
  target: string;
  name?: string;
  role?: string;
}

export interface EscalationAction {
  type: 'notification' | 'ticket' | 'webhook' | 'custom';
  config: unknown;
}

export interface PenaltyDefinition {
  type: 'credit' | 'refund' | 'discount' | 'custom';
  trigger: {
    breachCount?: number;
    breachDuration?: number; // minutes
    breachPercentage?: number;
  };
  calculation: {
    type: 'fixed' | 'percentage' | 'tiered' | 'custom';
    value?: number;
    tiers?: Array<{
      threshold: number;
      value: number;
    }>;
    formula?: string;
  };
  cap?: {
    type: 'monthly' | 'quarterly' | 'yearly';
    value: number;
  };
}

export interface SLAReporting {
  frequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'dashboard' | 'email' | 'pdf' | 'api';
  includeDetails: boolean;
  includeRawData?: boolean;
}

export interface SLAMeasurementData {
  slaId: string;
  timestamp: Date;
  value: number;
  target: number;
  achievement: number; // percentage
  status: 'met' | 'warning' | 'breached';
  metadata?: {
    source?: string;
    tags?: Record<string, string>;
    breakdown?: Record<string, number>;
  };
}

export interface SLABreach {
  id: string;
  slaId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  severity: 'minor' | 'major' | 'critical';
  value: number;
  target: number;
  impact?: {
    affectedServices?: string[];
    affectedUsers?: number;
    businessImpact?: string;
  };
  rootCause?: string;
  resolution?: {
    time: Date;
    action: string;
    resolvedBy: string;
  };
  escalated?: boolean;
  penaltyApplied?: boolean;
}

export interface SLAReport {
  id: string;
  slaId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    achievement: number;
    uptime: number;
    breaches: number;
    exclusions: number;
    penalties?: number;
  };
  details: {
    measurements: SLAMeasurementData[];
    breaches: SLABreach[];
    exclusions: SLAExclusion[];
    trends: TrendAnalysis;
  };
  compliance: {
    status: 'compliant' | 'non-compliant' | 'at-risk';
    forecast?: {
      nextPeriod: number;
      confidence: number;
    };
  };
  recommendations?: string[];
}

export interface TrendAnalysis {
  direction: 'improving' | 'stable' | 'degrading';
  changeRate: number;
  forecast: Array<{
    timestamp: Date;
    predicted: number;
    confidence: number;
  }>;
  anomalies?: Array<{
    timestamp: Date;
    value: number;
    severity: 'low' | 'medium' | 'high';
    type: string;
  }>;
}

export interface SLADashboard {
  slas: Array<{
    sla: SLADefinition;
    currentStatus: {
      achievement: number;
      status: 'healthy' | 'warning' | 'critical';
      trend: 'up' | 'down' | 'stable';
    };
    recentBreaches: SLABreach[];
    nextMeasurement: Date;
  }>;
  overallHealth: {
    score: number;
    totalSLAs: number;
    breachedSLAs: number;
    atRiskSLAs: number;
  };
  alerts: SLAAlert[];
}

export interface SLAAlert {
  id: string;
  slaId: string;
  type: 'breach' | 'warning' | 'escalation' | 'penalty';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class SLAManagement extends EventEmitter {
  private slas: Map<string, SLADefinition> = new Map();
  private measurements: Map<string, SLAMeasurementData[]> = new Map();
  private breaches: Map<string, SLABreach[]> = new Map();
  private alerts: Map<string, SLAAlert> = new Map();
  private monitors: Map<string, cron.ScheduledTask> = new Map();
  private escalations: Map<string, unknown> = new Map();

  constructor() {
    super();
    this.startMonitoring();
  }

  // SLA Management
  public async createSLA(
    definition: Omit<SLADefinition, 'id' | 'metadata'>
  ): Promise<SLADefinition> {
    const sla: SLADefinition = {
      ...definition,
      id: crypto.randomUUID(),
      metadata: {
        createdAt: new Date(),
        createdBy: 'system', // Should be from context
        updatedAt: new Date(),
        updatedBy: 'system',
        version: 1
      }
    };

    // Validate SLA definition
    this.validateSLADefinition(sla);

    // Store SLA
    this.slas.set(sla.id, sla);

    // Start monitoring if active
    if (sla.status === 'active') {
      this.startSLAMonitoring(sla);
    }

    this.emit('sla:created', sla);
    return sla;
  }

  private validateSLADefinition(sla: SLADefinition): void {
    // Validate target
    if (!sla.target || sla.target.value === undefined) {
      throw new Error('SLA target is required');
    }

    // Validate measurement
    if (!sla.measurement) {
      throw new Error('SLA measurement configuration is required');
    }

    // Validate business hours if specified
    if (sla.businessHours) {
      this.validateBusinessHours(sla.businessHours);
    }

    // Validate escalation policy
    if (sla.escalation?.enabled) {
      this.validateEscalationPolicy(sla.escalation);
    }

    // Validate validity period
    if (sla.validity.endDate && sla.validity.endDate < sla.validity.startDate) {
      throw new Error('SLA end date must be after start date');
    }
  }

  private validateBusinessHours(hours: BusinessHours): void {
    if (!hours.timezone) {
      throw new Error('Business hours timezone is required');
    }

    if (!hours.schedule || hours.schedule.length === 0) {
      throw new Error('Business hours schedule is required');
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    for (const schedule of hours.schedule) {
      if (!timeRegex.test(schedule.start) || !timeRegex.test(schedule.end)) {
        throw new Error('Invalid time format in business hours');
      }
    }
  }

  private validateEscalationPolicy(policy: EscalationPolicy): void {
    if (!policy.levels || policy.levels.length === 0) {
      throw new Error('Escalation levels are required');
    }

    // Validate levels are in order
    const levels = policy.levels.sort((a, b) => a.level - b.level);
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].level !== i + 1) {
        throw new Error('Escalation levels must be sequential starting from 1');
      }

      if (levels[i].contacts.length === 0) {
        throw new Error(`Escalation level ${levels[i].level} must have at least one contact`);
      }
    }
  }

  // Monitoring
  private startMonitoring(): void {
    // Start global monitoring loop
    cron.schedule('* * * * *', async () => {
      await this.checkAllSLAs();
    });

    // Start cleanup job
    cron.schedule('0 0 * * *', async () => {
      await this.cleanupOldData();
    });
  }

  private startSLAMonitoring(sla: SLADefinition): void {
    // Get cron expression based on measurement interval
    const cronExpression = this.getCronExpression(sla.measurement.interval);

    const task = cron.schedule(cronExpression, async () => {
      try {
        await this.measureSLA(sla);
      } catch (error) {
        this.emit('sla:measurement:error', { slaId: sla.id, error });
      }
    });

    this.monitors.set(sla.id, task);
  }

  private getCronExpression(interval: SLAMeasurement['interval']): string {
    const expressions = {
      minute: '* * * * *',
      hour: '0 * * * *',
      day: '0 0 * * *',
      week: '0 0 * * 0',
      month: '0 0 1 * *'
    };

    return expressions[interval];
  }

  private async checkAllSLAs(): Promise<void> {
    for (const sla of this.slas.values()) {
      if (sla.status === 'active') {
        await this.checkSLAStatus(sla);
      }
    }
  }

  private async measureSLA(sla: SLADefinition): Promise<void> {
    try {
      // Get measurement value
      const value = await this.getMeasurementValue(sla);

      // Calculate achievement
      const achievement = this.calculateAchievement(value, sla.target);

      // Determine status
      const status = this.determineStatus(achievement, sla.target);

      // Create measurement record
      const measurement: SLAMeasurementData = {
        slaId: sla.id,
        timestamp: new Date(),
        value,
        target: sla.target.value,
        achievement,
        status
      };

      // Store measurement
      this.addMeasurement(measurement);

      // Check for breaches
      if (status === 'breached') {
        await this.handleBreach(sla, measurement);
      } else if (status === 'warning') {
        await this.handleWarning(sla, measurement);
      }

      // Update real-time reporting
      if (sla.reporting.frequency === 'real-time') {
        await this.sendRealtimeUpdate(sla, measurement);
      }

      this.emit('sla:measured', measurement);

    } catch (error) {
      this.emit('sla:measurement:failed', { slaId: sla.id, error });
    }
  }

  private async getMeasurementValue(sla: SLADefinition): Promise<number> {
    switch (sla.measurement.source) {
      case 'metrics':
        return this.getMetricValue(sla.measurement);
      case 'logs':
        return this.getLogValue(sla.measurement);
      case 'api':
        return this.getAPIValue(sla.measurement);
      case 'database':
        return this.getDatabaseValue(sla.measurement);
      case 'custom':
        return this.getCustomValue(sla.measurement);
      default:
        throw new Error(`Unsupported measurement source: ${sla.measurement.source}`);
    }
  }

  private async getMetricValue(_measurement: SLAMeasurement): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Query metrics system
    // This is a placeholder - integrate with actual metrics system
    return Math.random() * 100;
  }

  private async getLogValue(_measurement: SLAMeasurement): Promise<number> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Query log system
    return Math.random() * 100;
  }

  private async getAPIValue(measurement: SLAMeasurement): Promise<number> {
    // Call external API
    if (!measurement.endpoint) {
      throw new Error('API endpoint is required');
    }

    const response = await fetch(measurement.endpoint);
    const data = await response.json();
    
    // Extract value based on configuration
    return data.value || 0;
  }

  private async getDatabaseValue(measurement: SLAMeasurement): Promise<number> {
    // Execute database query
    if (!measurement.query) {
      throw new Error('Database query is required');
    }

    // Execute query and return result
    return 0;
  }

  private async getCustomValue(measurement: SLAMeasurement): Promise<number> {
    // Execute custom calculation
    if (!measurement.calculation) {
      throw new Error('Custom calculation is required');
    }

    // Evaluate expression safely
    return 0;
  }

  private calculateAchievement(value: number, target: SLATarget): number {
    let achievement: number;

    switch (target.comparison) {
      case 'greater-than':
        achievement = (value / target.value) * 100;
        break;
      case 'less-than':
        achievement = (target.value / value) * 100;
        break;
      case 'equal':
        achievement = value === target.value ? 100 : 0;
        break;
      case 'between': {
        // Assume target.value is the center and thresholds define range
        const range = (target.thresholds?.critical || 10);
        const distance = Math.abs(value - target.value);
        achievement = Math.max(0, 100 - (distance / range) * 100);
        break;
      }
      default:
        achievement = 0;
    }

    return Math.min(100, Math.max(0, achievement));
  }

  private determineStatus(
    achievement: number,
    target: SLATarget
  ): SLAMeasurementData['status'] {
    if (achievement >= 100) {
      return 'met';
    }

    if (target.thresholds?.warning && achievement >= target.thresholds.warning) {
      return 'warning';
    }

    return 'breached';
  }

  private addMeasurement(measurement: SLAMeasurementData): void {
    const measurements = this.measurements.get(measurement.slaId) || [];
    measurements.push(measurement);
    
    // Keep only recent measurements (e.g., last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMeasurements = measurements.filter(
      m => m.timestamp > thirtyDaysAgo
    );
    
    this.measurements.set(measurement.slaId, recentMeasurements);
  }

  // Breach Handling
  private async handleBreach(
    sla: SLADefinition,
    measurement: SLAMeasurementData
  ): Promise<void> {
    // Check if already in breach
    const existingBreach = this.getCurrentBreach(sla.id);
    
    if (existingBreach) {
      // Update existing breach
      existingBreach.endTime = measurement.timestamp;
      existingBreach.duration = 
        existingBreach.endTime.getTime() - existingBreach.startTime.getTime();
    } else {
      // Create new breach
      const breach: SLABreach = {
        id: crypto.randomUUID(),
        slaId: sla.id,
        startTime: measurement.timestamp,
        severity: this.determineSeverity(measurement.achievement),
        value: measurement.value,
        target: measurement.target
      };

      this.addBreach(breach);

      // Create alert
      await this.createAlert({
        slaId: sla.id,
        type: 'breach',
        severity: 'error',
        message: `SLA breach detected: ${sla.name} - Achievement: ${measurement.achievement.toFixed(2)}%`
      });

      // Start escalation if configured
      if (sla.escalation?.enabled) {
        await this.startEscalation(sla, breach);
      }
    }

    this.emit('sla:breached', { sla, measurement });
  }

  private getCurrentBreach(slaId: string): SLABreach | undefined {
    const breaches = this.breaches.get(slaId) || [];
    return breaches.find(b => !b.endTime);
  }

  private determineSeverity(achievement: number): SLABreach['severity'] {
    if (achievement >= 90) return 'minor';
    if (achievement >= 70) return 'major';
    return 'critical';
  }

  private addBreach(breach: SLABreach): void {
    const breaches = this.breaches.get(breach.slaId) || [];
    breaches.push(breach);
    this.breaches.set(breach.slaId, breaches);
  }

  private async handleWarning(
    sla: SLADefinition,
    measurement: SLAMeasurementData
  ): Promise<void> {
    await this.createAlert({
      slaId: sla.id,
      type: 'warning',
      severity: 'warning',
      message: `SLA warning: ${sla.name} - Achievement: ${measurement.achievement.toFixed(2)}%`
    });

    this.emit('sla:warning', { sla, measurement });
  }

  // Escalation Management
  private async startEscalation(sla: SLADefinition, breach: SLABreach): Promise<void> {
    if (!sla.escalation || !sla.escalation.enabled) return;

    const escalationState = {
      slaId: sla.id,
      breachId: breach.id,
      currentLevel: 0,
      startTime: new Date(),
      notificationsSent: 0
    };

    this.escalations.set(breach.id, escalationState);

    // Start with level 1
    await this.escalateToLevel(sla, breach, 1);
  }

  private async escalateToLevel(
    sla: SLADefinition,
    breach: SLABreach,
    level: number
  ): Promise<void> {
    const policy = sla.escalation;
    if (!policy || !policy.enabled) return;

    const levelConfig = policy.levels.find(l => l.level === level);
    if (!levelConfig) return;

    const escalationState = this.escalations.get(breach.id);
    if (!escalationState) return;

    escalationState.currentLevel = level;

    // Send notifications to all contacts
    for (const contact of levelConfig.contacts) {
      await this.sendEscalationNotification(sla, breach, contact, level);
    }

    // Execute actions
    if (levelConfig.actions) {
      for (const action of levelConfig.actions) {
        await this.executeEscalationAction(sla, breach, action);
      }
    }

    // Update breach
    breach.escalated = true;

    // Schedule next level if breach continues
    if (level < policy.levels.length) {
      setTimeout(async () => {
        // Check if breach is still active
        const currentBreach = this.getCurrentBreach(sla.id);
        if (currentBreach && currentBreach.id === breach.id) {
          await this.escalateToLevel(sla, breach, level + 1);
        }
      }, levelConfig.delay * 60 * 1000);
    }

    this.emit('sla:escalated', { sla, breach, level });
  }

  private async sendEscalationNotification(
    sla: SLADefinition,
    breach: SLABreach,
    contact: EscalationContact,
    level: number
  ): Promise<void> {
    const message = this.formatEscalationMessage(sla, breach, level);

    switch (contact.type) {
      case 'email':
        await this.sendEmail(contact.target, 'SLA Breach Escalation', message);
        break;
      case 'sms':
        await this.sendSMS(contact.target, message);
        break;
      case 'slack':
        await this.sendSlackMessage(contact.target, message);
        break;
      case 'pagerduty':
        await this.createPagerDutyIncident(contact.target, sla, breach);
        break;
      case 'webhook':
        await this.callWebhook(contact.target, { sla, breach, level });
        break;
    }
  }

  private formatEscalationMessage(
    sla: SLADefinition,
    breach: SLABreach,
    level: number
  ): string {
    return `
SLA BREACH ESCALATION - Level ${level}

SLA: ${sla.name}
Status: ${breach.severity.toUpperCase()}
Current Value: ${breach.value}
Target: ${breach.target}
Breach Duration: ${this.formatDuration(breach.duration || 0)}

Please take immediate action to resolve this issue.
    `.trim();
  }

  private formatDuration(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  private async executeEscalationAction(
    sla: SLADefinition,
    breach: SLABreach,
    action: EscalationAction
  ): Promise<void> {
    switch (action.type) {
      case 'notification':
        // Additional notification logic
        break;
      case 'ticket':
        await this.createSupportTicket(sla, breach, action.config);
        break;
      case 'webhook':
        await this.callWebhook(action.config.url, { sla, breach });
        break;
      case 'custom':
        // Execute custom action
        break;
    }
  }

  // Communication methods (placeholders)
  private async sendEmail(_to: string, _subject: string, _body: string): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Email implementation
  }

  private async sendSMS(_to: string, _message: string): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // SMS implementation
  }

  private async sendSlackMessage(_channel: string, _message: string): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Slack implementation
  }

  private async createPagerDutyIncident(
    _routingKey: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _sla: SLADefinition, // eslint-disable-line @typescript-eslint/no-unused-vars
    _breach: SLABreach // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // PagerDuty implementation
  }

  private async callWebhook(url: string, data: unknown): Promise<void> {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  private async createSupportTicket(
    _sla: SLADefinition, // eslint-disable-line @typescript-eslint/no-unused-vars
    _breach: SLABreach, // eslint-disable-line @typescript-eslint/no-unused-vars
    _config: unknown // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // Ticket creation implementation
  }

  // Reporting
  public async generateSLAReport(
    slaId: string,
    period: { start: Date; end: Date }
  ): Promise<SLAReport> {
    const sla = this.slas.get(slaId);
    if (!sla) {
      throw new Error(`SLA not found: ${slaId}`);
    }

    // Get measurements for period
    const measurements = this.getMeasurementsForPeriod(slaId, period);
    
    // Get breaches for period
    const breaches = this.getBreachesForPeriod(slaId, period);
    
    // Get exclusions for period
    const exclusions = this.getExclusionsForPeriod(sla, period);
    
    // Calculate summary
    const summary = this.calculateSummary(measurements, breaches, exclusions, sla);
    
    // Analyze trends
    const trends = this.analyzeTrends(measurements);
    
    // Determine compliance
    const compliance = this.determineCompliance(summary, sla);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, trends, breaches);

    const report: SLAReport = {
      id: crypto.randomUUID(),
      slaId,
      period,
      summary,
      details: {
        measurements,
        breaches,
        exclusions,
        trends
      },
      compliance,
      recommendations
    };

    this.emit('sla:report:generated', report);
    return report;
  }

  private getMeasurementsForPeriod(
    slaId: string,
    period: { start: Date; end: Date }
  ): SLAMeasurementData[] {
    const allMeasurements = this.measurements.get(slaId) || [];
    return allMeasurements.filter(
      m => m.timestamp >= period.start && m.timestamp <= period.end
    );
  }

  private getBreachesForPeriod(
    slaId: string,
    period: { start: Date; end: Date }
  ): SLABreach[] {
    const allBreaches = this.breaches.get(slaId) || [];
    return allBreaches.filter(
      b => b.startTime >= period.start && b.startTime <= period.end
    );
  }

  private getExclusionsForPeriod(
    sla: SLADefinition,
    period: { start: Date; end: Date }
  ): SLAExclusion[] {
    if (!sla.exclusions) return [];
    
    return sla.exclusions.filter(
      e => e.startTime >= period.start && e.startTime <= period.end
    );
  }

  private calculateSummary(
    measurements: SLAMeasurementData[],
    breaches: SLABreach[],
    exclusions: SLAExclusion[],
    sla: SLADefinition
  ): SLAReport['summary'] {
    // Calculate total time
    const totalTime = measurements.length > 0
      ? measurements[measurements.length - 1].timestamp.getTime() - measurements[0].timestamp.getTime()
      : 0;

    // Calculate exclusion time
    const exclusionTime = exclusions.reduce((total, e) => {
      return total + (e.endTime.getTime() - e.startTime.getTime());
    }, 0);

    // Calculate breach time
    const breachTime = breaches.reduce((total, b) => {
      const endTime = b.endTime || new Date();
      return total + (endTime.getTime() - b.startTime.getTime());
    }, 0);

    // Calculate adjusted time
    const adjustedTime = totalTime - exclusionTime;

    // Calculate achievement
    const achievement = adjustedTime > 0
      ? ((adjustedTime - breachTime) / adjustedTime) * 100
      : 0;

    // Calculate uptime
    const uptime = adjustedTime > 0
      ? ((adjustedTime - breachTime) / adjustedTime) * 100
      : 0;

    // Calculate penalties
    let penalties = 0;
    if (sla.penalties) {
      penalties = this.calculatePenalties(sla.penalties, {
        breaches: breaches.length,
        breachTime,
        achievement
      });
    }

    return {
      achievement,
      uptime,
      breaches: breaches.length,
      exclusions: exclusions.length,
      penalties
    };
  }

  private calculatePenalties(
    definitions: PenaltyDefinition[],
    metrics: { breaches: number; breachTime: number; achievement: number }
  ): number {
    let totalPenalty = 0;

    for (const definition of definitions) {
      let triggered = false;

      // Check triggers
      if (definition.trigger.breachCount && metrics.breaches >= definition.trigger.breachCount) {
        triggered = true;
      }
      
      if (definition.trigger.breachDuration && metrics.breachTime >= definition.trigger.breachDuration * 60000) {
        triggered = true;
      }
      
      if (definition.trigger.breachPercentage && (100 - metrics.achievement) >= definition.trigger.breachPercentage) {
        triggered = true;
      }

      if (triggered) {
        // Calculate penalty
        let penalty = 0;
        
        switch (definition.calculation.type) {
          case 'fixed':
            penalty = definition.calculation.value || 0;
            break;
          case 'percentage':
            penalty = (definition.calculation.value || 0) / 100;
            break;
          case 'tiered':
            if (definition.calculation.tiers) {
              for (const tier of definition.calculation.tiers) {
                if ((100 - metrics.achievement) >= tier.threshold) {
                  penalty = tier.value;
                }
              }
            }
            break;
        }

        totalPenalty += penalty;
      }
    }

    return totalPenalty;
  }

  private analyzeTrends(measurements: SLAMeasurementData[]): TrendAnalysis {
    if (measurements.length < 2) {
      return {
        direction: 'stable',
        changeRate: 0,
        forecast: []
      };
    }

    // Calculate trend direction
    const recentMeasurements = measurements.slice(-10);
    const firstHalf = recentMeasurements.slice(0, 5);
    const secondHalf = recentMeasurements.slice(5);
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.achievement, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.achievement, 0) / secondHalf.length;
    
    const changeRate = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    let direction: TrendAnalysis['direction'] = 'stable';
    if (changeRate > 5) direction = 'improving';
    if (changeRate < -5) direction = 'degrading';

    // Simple linear forecast
    const forecast = this.generateForecast(measurements);

    // Detect anomalies
    const anomalies = this.detectAnomalies(measurements);

    return {
      direction,
      changeRate,
      forecast,
      anomalies
    };
  }

  private generateForecast(
    measurements: SLAMeasurementData[]
  ): TrendAnalysis['forecast'] {
    // Simple linear regression for forecast
    const n = measurements.length;
    if (n < 2) return [];

    // Calculate slope and intercept
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    measurements.forEach((m, i) => {
      sumX += i;
      sumY += m.achievement;
      sumXY += i * m.achievement;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast for next 7 periods
    const forecast: TrendAnalysis['forecast'] = [];
    const lastTimestamp = measurements[n - 1].timestamp;
    
    for (let i = 1; i <= 7; i++) {
      const predicted = slope * (n + i) + intercept;
      const timestamp = new Date(lastTimestamp);
      timestamp.setHours(timestamp.getHours() + i * 24); // Daily forecast
      
      forecast.push({
        timestamp,
        predicted: Math.max(0, Math.min(100, predicted)),
        confidence: Math.max(0, 100 - i * 10) // Decreasing confidence
      });
    }

    return forecast;
  }

  private detectAnomalies(
    measurements: SLAMeasurementData[]
  ): TrendAnalysis['anomalies'] {
    if (measurements.length < 10) return [];

    const anomalies: TrendAnalysis['anomalies'] = [];
    
    // Calculate mean and standard deviation
    const values = measurements.map(m => m.achievement);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Detect anomalies (values outside 2 standard deviations)
    measurements.forEach(m => {
      const zScore = Math.abs((m.achievement - mean) / stdDev);
      
      if (zScore > 2) {
        anomalies.push({
          timestamp: m.timestamp,
          value: m.achievement,
          severity: zScore > 3 ? 'high' : 'medium',
          type: m.achievement < mean ? 'drop' : 'spike'
        });
      }
    });

    return anomalies;
  }

  private determineCompliance(
    summary: SLAReport['summary'],
    sla: SLADefinition
  ): SLAReport['compliance'] {
    let status: SLAReport['compliance']['status'] = 'compliant';
    
    if (summary.achievement < sla.target.value) {
      status = 'non-compliant';
    } else if (summary.achievement < sla.target.value * 1.1) {
      status = 'at-risk';
    }

    return {
      status,
      forecast: {
        nextPeriod: summary.achievement, // Simplified - use actual forecast
        confidence: 80
      }
    };
  }

  private generateRecommendations(
    summary: SLAReport['summary'],
    trends: TrendAnalysis,
    breaches: SLABreach[]
  ): string[] {
    const recommendations: string[] = [];

    // Based on achievement
    if (summary.achievement < 90) {
      recommendations.push('Consider reviewing and optimizing the underlying service performance');
    }

    // Based on trends
    if (trends.direction === 'degrading') {
      recommendations.push('Investigate the root cause of performance degradation');
      recommendations.push('Implement proactive monitoring and alerting');
    }

    // Based on breaches
    if (breaches.length > 5) {
      recommendations.push('Review SLA targets for feasibility');
      recommendations.push('Implement automated remediation for common issues');
    }

    // Based on breach patterns
    const breachTimes = breaches.map(b => b.startTime.getHours());
    const commonHour = this.findMostCommon(breachTimes);
    if (commonHour !== null) {
      recommendations.push(`Consider additional monitoring during hour ${commonHour} when most breaches occur`);
    }

    return recommendations;
  }

  private findMostCommon(arr: number[]): number | null {
    if (arr.length === 0) return null;
    
    const frequency: Record<number, number> = {};
    let maxFreq = 0;
    let mode = arr[0];
    
    for (const num of arr) {
      frequency[num] = (frequency[num] || 0) + 1;
      if (frequency[num] > maxFreq) {
        maxFreq = frequency[num];
        mode = num;
      }
    }
    
    return mode;
  }

  // Real-time Updates
  private async sendRealtimeUpdate(
    sla: SLADefinition,
    measurement: SLAMeasurementData
  ): Promise<void> {
    const update = {
      slaId: sla.id,
      slaName: sla.name,
      timestamp: measurement.timestamp,
      achievement: measurement.achievement,
      status: measurement.status,
      value: measurement.value,
      target: measurement.target
    };

    // Send to dashboard
    this.emit('sla:realtime:update', update);

    // Send to configured channels
    if (sla.reporting.format === 'api') {
      // Send to API endpoint
    }
  }

  // Alert Management
  private async createAlert(
    data: Omit<SLAAlert, 'id' | 'timestamp'>
  ): Promise<SLAAlert> {
    const alert: SLAAlert = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    this.alerts.set(alert.id, alert);
    this.emit('sla:alert:created', alert);
    
    return alert;
  }

  public acknowledgeAlert(alertId: string, userId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date();
      
      this.emit('sla:alert:acknowledged', alert);
    }
  }

  // Dashboard
  public getSLADashboard(): SLADashboard {
    const dashboardData: SLADashboard = {
      slas: [],
      overallHealth: {
        score: 0,
        totalSLAs: 0,
        breachedSLAs: 0,
        atRiskSLAs: 0
      },
      alerts: Array.from(this.alerts.values())
        .filter(a => !a.acknowledged)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    };

    let totalScore = 0;

    for (const sla of this.slas.values()) {
      if (sla.status !== 'active') continue;

      const measurements = this.measurements.get(sla.id) || [];
      const recentMeasurement = measurements[measurements.length - 1];
      const recentBreaches = (this.breaches.get(sla.id) || []).slice(-5);
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (recentMeasurement) {
        if (recentMeasurement.status === 'breached') {
          status = 'critical';
          dashboardData.overallHealth.breachedSLAs++;
        } else if (recentMeasurement.status === 'warning') {
          status = 'warning';
          dashboardData.overallHealth.atRiskSLAs++;
        }
        
        // Calculate trend
        if (measurements.length >= 2) {
          const previousMeasurement = measurements[measurements.length - 2];
          if (recentMeasurement.achievement > previousMeasurement.achievement) {
            trend = 'up';
          } else if (recentMeasurement.achievement < previousMeasurement.achievement) {
            trend = 'down';
          }
        }
        
        totalScore += recentMeasurement.achievement;
      }

      dashboardData.slas.push({
        sla,
        currentStatus: {
          achievement: recentMeasurement?.achievement || 0,
          status,
          trend
        },
        recentBreaches,
        nextMeasurement: this.getNextMeasurementTime(sla)
      });
      
      dashboardData.overallHealth.totalSLAs++;
    }

    dashboardData.overallHealth.score = 
      dashboardData.overallHealth.totalSLAs > 0
        ? totalScore / dashboardData.overallHealth.totalSLAs
        : 0;

    return dashboardData;
  }

  private getNextMeasurementTime(sla: SLADefinition): Date {
    const now = new Date();
    
    switch (sla.measurement.interval) {
      case 'minute':
        return new Date(now.getTime() + 60 * 1000);
      case 'hour':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'month': {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      }
      default:
        return now;
    }
  }

  // Cleanup
  private async cleanupOldData(): Promise<void> {
    const retentionDays = 90; // Keep 90 days of data
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean measurements
    for (const [slaId, measurements] of this.measurements.entries()) {
      const filtered = measurements.filter(m => m.timestamp > cutoffDate);
      this.measurements.set(slaId, filtered);
    }

    // Clean breaches
    for (const [slaId, breaches] of this.breaches.entries()) {
      const filtered = breaches.filter(b => b.startTime > cutoffDate);
      this.breaches.set(slaId, filtered);
    }

    // Clean acknowledged alerts
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.acknowledged && alert.timestamp < cutoffDate) {
        this.alerts.delete(alertId);
      }
    }

    this.emit('sla:cleanup:completed', { cutoffDate });
  }

  // Exclusion Management
  public async addExclusion(
    slaId: string,
    exclusion: Omit<SLAExclusion, 'automaticDetection'>
  ): Promise<void> {
    const sla = this.slas.get(slaId);
    if (!sla) {
      throw new Error(`SLA not found: ${slaId}`);
    }

    const newExclusion: SLAExclusion = {
      ...exclusion,
      automaticDetection: false
    };

    if (!sla.exclusions) {
      sla.exclusions = [];
    }
    
    sla.exclusions.push(newExclusion);
    
    // Recalculate affected reports
    await this.recalculateAffectedPeriod(slaId, exclusion.startTime, exclusion.endTime);
    
    this.emit('sla:exclusion:added', { slaId, exclusion: newExclusion });
  }

  private async recalculateAffectedPeriod(
    _slaId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    _start: Date, // eslint-disable-line @typescript-eslint/no-unused-vars
    _end: Date // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // Recalculate SLA metrics for the affected period
    // This would update historical calculations
  }

  // Status Management
  private async checkSLAStatus(sla: SLADefinition): Promise<void> {
    // Check if SLA should be deactivated
    if (sla.validity.endDate && sla.validity.endDate < new Date()) {
      sla.status = 'expired';
      this.stopSLAMonitoring(sla.id);
      this.emit('sla:expired', sla);
    }
  }

  private stopSLAMonitoring(slaId: string): void {
    const monitor = this.monitors.get(slaId);
    if (monitor) {
      monitor.stop();
      this.monitors.delete(slaId);
    }
  }

  // Public API
  public getSLA(slaId: string): SLADefinition | undefined {
    return this.slas.get(slaId);
  }

  public getAllSLAs(): SLADefinition[] {
    return Array.from(this.slas.values());
  }

  public getActiveSLAs(): SLADefinition[] {
    return Array.from(this.slas.values()).filter(sla => sla.status === 'active');
  }

  public async updateSLA(
    slaId: string,
    updates: Partial<SLADefinition>
  ): Promise<SLADefinition> {
    const sla = this.slas.get(slaId);
    if (!sla) {
      throw new Error(`SLA not found: ${slaId}`);
    }

    const updated: SLADefinition = {
      ...sla,
      ...updates,
      metadata: {
        ...sla.metadata,
        updatedAt: new Date(),
        updatedBy: 'system', // Should be from context
        version: sla.metadata.version + 1
      }
    };

    this.validateSLADefinition(updated);
    this.slas.set(slaId, updated);

    // Restart monitoring if needed
    if (updates.measurement || updates.status) {
      this.stopSLAMonitoring(slaId);
      if (updated.status === 'active') {
        this.startSLAMonitoring(updated);
      }
    }

    this.emit('sla:updated', updated);
    return updated;
  }

  public async deleteSLA(slaId: string): Promise<void> {
    const sla = this.slas.get(slaId);
    if (!sla) {
      throw new Error(`SLA not found: ${slaId}`);
    }

    // Stop monitoring
    this.stopSLAMonitoring(slaId);

    // Delete data
    this.slas.delete(slaId);
    this.measurements.delete(slaId);
    this.breaches.delete(slaId);

    // Delete related alerts
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.slaId === slaId) {
        this.alerts.delete(alertId);
      }
    }

    this.emit('sla:deleted', { slaId });
  }

  public getAlerts(slaId?: string): SLAAlert[] {
    const alerts = Array.from(this.alerts.values());
    
    if (slaId) {
      return alerts.filter(a => a.slaId === slaId);
    }
    
    return alerts;
  }

  public getBreaches(slaId: string): SLABreach[] {
    return this.breaches.get(slaId) || [];
  }

  public getMeasurements(slaId: string, limit?: number): SLAMeasurementData[] {
    const measurements = this.measurements.get(slaId) || [];
    
    if (limit) {
      return measurements.slice(-limit);
    }
    
    return measurements;
  }
}

export default SLAManagement;