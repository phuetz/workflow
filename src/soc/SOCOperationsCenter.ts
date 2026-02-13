/**
 * SOC Operations Center
 * Enterprise Security Operations Center for workflow automation platform
 * Provides real-time security monitoring, alert triage, case management,
 * and incident response capabilities.
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertStatus = 'new' | 'triaged' | 'investigating' | 'escalated' | 'resolved' | 'closed' | 'false_positive';
export type CaseStatus = 'open' | 'investigating' | 'escalated' | 'pending_approval' | 'resolved' | 'closed';
export type CasePriority = 'P1' | 'P2' | 'P3' | 'P4';
export type ShiftType = 'day' | 'swing' | 'night';
export type TicketingSystem = 'servicenow' | 'jira' | 'zendesk' | 'custom';
export type RunbookStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  source: string;
  sourceType: 'siem' | 'ids' | 'edr' | 'dlp' | 'firewall' | 'manual' | 'automated' | 'external';
  indicators: ThreatIndicator[];
  affectedAssets: string[];
  assignedTo?: string;
  triageScore?: number;
  mlScore?: number;
  caseId?: string;
  tags: string[];
  rawData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ThreatIndicator {
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'file' | 'user' | 'process' | 'registry' | 'custom';
  value: string;
  confidence: number;
  context?: string;
  firstSeen?: Date;
  lastSeen?: Date;
}

export interface SOCCase {
  id: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  assignedTo?: string;
  escalatedTo?: string;
  relatedAlerts: string[];
  indicators: ThreatIndicator[];
  affectedAssets: string[];
  timeline: CaseTimelineEntry[];
  evidence: CaseEvidence[];
  runbooksExecuted: string[];
  externalTickets: ExternalTicket[];
  slaDeadline?: Date;
  slaBreached: boolean;
  resolutionNotes?: string;
  rootCause?: string;
  lessonsLearned?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface CaseTimelineEntry {
  id: string;
  timestamp: Date;
  type: 'creation' | 'update' | 'comment' | 'assignment' | 'escalation' | 'evidence' | 'runbook' | 'resolution';
  userId: string;
  content: string;
  attachments?: string[];
}

export interface CaseEvidence {
  id: string;
  type: 'log' | 'screenshot' | 'pcap' | 'memory_dump' | 'artifact' | 'report' | 'other';
  name: string;
  description: string;
  location: string;
  hash: string;
  collectedAt: Date;
  collectedBy: string;
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  timestamp: Date;
  action: 'collected' | 'transferred' | 'analyzed' | 'archived';
  userId: string;
  notes?: string;
}

export interface ExternalTicket {
  system: TicketingSystem;
  ticketId: string;
  url: string;
  status: string;
  createdAt: Date;
  lastSyncedAt: Date;
}

export interface SOCAnalyst {
  id: string;
  name: string;
  email: string;
  role: 'analyst' | 'senior_analyst' | 'lead' | 'manager';
  shift: ShiftType;
  skills: string[];
  currentCaseload: number;
  maxCaseload: number;
  available: boolean;
  lastActivity?: Date;
  performanceMetrics?: AnalystMetrics;
}

export interface AnalystMetrics {
  casesHandled: number;
  avgResolutionTime: number;
  falsePositiveRate: number;
  escalationRate: number;
  slaCompliance: number;
  customerSatisfaction?: number;
}

export interface Shift {
  id: string;
  type: ShiftType;
  startTime: Date;
  endTime: Date;
  analysts: string[];
  leadAnalyst: string;
  handoffNotes?: string;
  openCases: string[];
  pendingAlerts: number;
  metrics: ShiftMetrics;
}

export interface ShiftMetrics {
  alertsProcessed: number;
  casesOpened: number;
  casesClosed: number;
  avgTriageTime: number;
  escalations: number;
  slaBreaches: number;
}

export interface SLAConfig {
  severity: AlertSeverity;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationThresholdMinutes: number;
  notificationChannels: string[];
}

export interface SLAStatus {
  alertId?: string;
  caseId?: string;
  severity: AlertSeverity;
  createdAt: Date;
  responseDeadline: Date;
  resolutionDeadline: Date;
  respondedAt?: Date;
  resolvedAt?: Date;
  responseBreached: boolean;
  resolutionBreached: boolean;
  escalationTriggered: boolean;
  timeToResponse?: number;
  timeToResolution?: number;
}

export interface Runbook {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerConditions: TriggerCondition[];
  steps: RunbookStep[];
  requiredApprovals?: string[];
  automationLevel: 'manual' | 'semi-automated' | 'automated';
  estimatedDurationMinutes: number;
  createdBy: string;
  lastUpdated: Date;
  version: string;
  enabled: boolean;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in';
  value: unknown;
}

export interface RunbookStep {
  id: string;
  order: number;
  name: string;
  description: string;
  type: 'manual' | 'script' | 'api_call' | 'workflow' | 'approval' | 'notification';
  config: Record<string, unknown>;
  requiredInputs?: string[];
  outputs?: string[];
  timeout?: number;
  onFailure: 'stop' | 'continue' | 'retry';
  retryCount?: number;
}

export interface RunbookExecution {
  id: string;
  runbookId: string;
  caseId?: string;
  alertId?: string;
  status: RunbookStatus;
  startedAt: Date;
  completedAt?: Date;
  executedBy: string;
  currentStep: number;
  stepResults: StepResult[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  error?: string;
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}

export interface SOCMetrics {
  period: { start: Date; end: Date };
  mttd: number; // Mean Time to Detect (minutes)
  mttr: number; // Mean Time to Respond (minutes)
  mttc: number; // Mean Time to Contain (minutes)
  falsePositiveRate: number;
  alertVolume: AlertVolumeMetrics;
  caseMetrics: CaseVolumeMetrics;
  analystMetrics: Record<string, AnalystMetrics>;
  slaMetrics: SLAMetricsData;
  trendData: TrendDataPoint[];
}

export interface AlertVolumeMetrics {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  bySource: Record<string, number>;
  byStatus: Record<AlertStatus, number>;
  avgPerHour: number;
}

export interface CaseVolumeMetrics {
  total: number;
  open: number;
  closed: number;
  escalated: number;
  byPriority: Record<CasePriority, number>;
  avgResolutionTime: number;
}

export interface SLAMetricsData {
  totalTracked: number;
  responseCompliance: number;
  resolutionCompliance: number;
  breachesBySeverity: Record<AlertSeverity, number>;
}

export interface TrendDataPoint {
  timestamp: Date;
  alertCount: number;
  caseCount: number;
  mttr: number;
  slaCompliance: number;
}

export interface DashboardView {
  id: string;
  name: string;
  userId: string;
  isDefault: boolean;
  layout: DashboardWidget[];
  filters: DashboardFilter[];
  refreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'alerts' | 'cases' | 'metrics' | 'timeline' | 'chart' | 'map' | 'analysts' | 'sla';
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

export interface DashboardFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'between' | 'gt' | 'lt';
  value: unknown;
}

export interface InvestigationTool {
  id: string;
  name: string;
  type: 'enrichment' | 'sandbox' | 'forensics' | 'threat_intel' | 'osint' | 'custom';
  endpoint: string;
  authConfig: Record<string, unknown>;
  inputTypes: string[];
  outputFormat: string;
  enabled: boolean;
}

export interface TicketingIntegration {
  system: TicketingSystem;
  enabled: boolean;
  config: {
    baseUrl: string;
    projectKey?: string;
    auth: Record<string, unknown>;
    fieldMappings: Record<string, string>;
    statusMappings: Record<string, string>;
    syncInterval: number;
  };
}

export interface SOCConfig {
  slaConfigs: SLAConfig[];
  shiftSchedule: ShiftScheduleConfig;
  autoTriageEnabled: boolean;
  mlScoringEnabled: boolean;
  mlScoringThreshold: number;
  autoAssignmentEnabled: boolean;
  escalationRules: EscalationRule[];
  ticketingIntegrations: TicketingIntegration[];
  investigationTools: InvestigationTool[];
  retentionDays: number;
  notificationChannels: NotificationChannel[];
}

export interface ShiftScheduleConfig {
  dayShift: { start: string; end: string };
  swingShift: { start: string; end: string };
  nightShift: { start: string; end: string };
  timezone: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  conditions: TriggerCondition[];
  escalateTo: string;
  notifyChannels: string[];
  waitMinutes: number;
  enabled: boolean;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'teams' | 'pagerduty' | 'webhook' | 'sms';
  config: Record<string, unknown>;
  enabled: boolean;
}

// ============================================================================
// SOC Operations Center Implementation
// ============================================================================

export class SOCOperationsCenter extends EventEmitter {
  private static instance: SOCOperationsCenter | null = null;

  private alerts: Map<string, SecurityAlert> = new Map();
  private cases: Map<string, SOCCase> = new Map();
  private analysts: Map<string, SOCAnalyst> = new Map();
  private shifts: Map<string, Shift> = new Map();
  private runbooks: Map<string, Runbook> = new Map();
  private runbookExecutions: Map<string, RunbookExecution> = new Map();
  private dashboardViews: Map<string, DashboardView> = new Map();
  private slaTracking: Map<string, SLAStatus> = new Map();
  private config: SOCConfig;
  private currentShift?: Shift;
  private metricsCache: SOCMetrics | null = null;
  private metricsCacheTime: number = 0;
  private readonly METRICS_CACHE_TTL = 60000; // 1 minute
  private slaMonitoringInterval: NodeJS.Timeout | null = null;

  private constructor(config?: Partial<SOCConfig>) {
    super();
    this.config = this.initializeConfig(config);
    this.initializeSLAMonitoring();
    logger.info('SOC Operations Center initialized', undefined, 'SOC');
  }

  public static getInstance(config?: Partial<SOCConfig>): SOCOperationsCenter {
    if (!SOCOperationsCenter.instance) {
      SOCOperationsCenter.instance = new SOCOperationsCenter(config);
    }
    return SOCOperationsCenter.instance;
  }

  public static resetInstance(): void {
    if (SOCOperationsCenter.instance) {
      SOCOperationsCenter.instance.removeAllListeners();
      SOCOperationsCenter.instance = null;
    }
  }

  private initializeConfig(config?: Partial<SOCConfig>): SOCConfig {
    const defaultConfig: SOCConfig = {
      slaConfigs: [
        { severity: 'critical', responseTimeMinutes: 15, resolutionTimeMinutes: 60, escalationThresholdMinutes: 30, notificationChannels: ['pagerduty', 'slack'] },
        { severity: 'high', responseTimeMinutes: 30, resolutionTimeMinutes: 240, escalationThresholdMinutes: 60, notificationChannels: ['slack', 'email'] },
        { severity: 'medium', responseTimeMinutes: 120, resolutionTimeMinutes: 480, escalationThresholdMinutes: 180, notificationChannels: ['email'] },
        { severity: 'low', responseTimeMinutes: 480, resolutionTimeMinutes: 1440, escalationThresholdMinutes: 720, notificationChannels: ['email'] },
        { severity: 'info', responseTimeMinutes: 1440, resolutionTimeMinutes: 2880, escalationThresholdMinutes: 1440, notificationChannels: [] },
      ],
      shiftSchedule: {
        dayShift: { start: '06:00', end: '14:00' },
        swingShift: { start: '14:00', end: '22:00' },
        nightShift: { start: '22:00', end: '06:00' },
        timezone: 'UTC',
      },
      autoTriageEnabled: true,
      mlScoringEnabled: true,
      mlScoringThreshold: 0.7,
      autoAssignmentEnabled: true,
      escalationRules: [],
      ticketingIntegrations: [],
      investigationTools: [],
      retentionDays: 90,
      notificationChannels: [],
    };
    return { ...defaultConfig, ...config };
  }

  private initializeSLAMonitoring(): void {
    this.slaMonitoringInterval = setInterval(() => this.checkSLABreaches(), 60000); // Check every minute
  }

  // ============================================================================
  // Alert Management
  // ============================================================================

  public async ingestAlert(alertData: Omit<SecurityAlert, 'id' | 'timestamp' | 'status' | 'triageScore' | 'mlScore'>): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      ...alertData,
      id: this.generateId('ALT'),
      timestamp: new Date(),
      status: 'new',
      triageScore: undefined,
      mlScore: undefined,
    };

    // ML-assisted scoring if enabled
    if (this.config.mlScoringEnabled) {
      alert.mlScore = await this.calculateMLScore(alert);
    }

    this.alerts.set(alert.id, alert);
    this.initializeSLATracking(alert);

    this.emit('alert:ingested', alert);
    logger.info(`Alert ingested: ${alert.id}`, { severity: alert.severity, source: alert.source }, 'SOC');

    // Auto-triage if enabled
    if (this.config.autoTriageEnabled) {
      await this.triageAlert(alert.id);
    }

    return alert;
  }

  public async triageAlert(alertId: string, analystId?: string): Promise<SecurityAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    // Calculate triage score based on multiple factors
    const triageScore = this.calculateTriageScore(alert);
    alert.triageScore = triageScore;
    alert.status = 'triaged';

    // Update SLA tracking with response
    const slaStatus = this.slaTracking.get(alertId);
    if (slaStatus && !slaStatus.respondedAt) {
      slaStatus.respondedAt = new Date();
      slaStatus.timeToResponse = (slaStatus.respondedAt.getTime() - slaStatus.createdAt.getTime()) / 60000;
    }

    // Auto-assign if enabled
    if (this.config.autoAssignmentEnabled && !alert.assignedTo) {
      const analyst = this.findAvailableAnalyst(alert.severity);
      if (analyst) {
        alert.assignedTo = analyst.id;
        analyst.currentCaseload++;
      }
    }

    this.alerts.set(alertId, alert);
    this.emit('alert:triaged', { alert, triageScore, assignedTo: alert.assignedTo });
    logger.info(`Alert triaged: ${alertId}`, { triageScore, assignedTo: alert.assignedTo }, 'SOC');

    return alert;
  }

  private calculateTriageScore(alert: SecurityAlert): number {
    let score = 0;
    const weights = {
      severity: { critical: 100, high: 80, medium: 50, low: 25, info: 10 },
      indicatorCount: 5,
      assetCount: 10,
      mlBonus: 20,
    };

    // Severity weight
    score += weights.severity[alert.severity];

    // Indicator count
    score += Math.min(alert.indicators.length * weights.indicatorCount, 50);

    // Affected assets
    score += Math.min(alert.affectedAssets.length * weights.assetCount, 30);

    // ML score bonus
    if (alert.mlScore && alert.mlScore > this.config.mlScoringThreshold) {
      score += weights.mlBonus;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  private async calculateMLScore(alert: SecurityAlert): Promise<number> {
    // Simulated ML scoring - in production, would call actual ML model
    const factors = {
      severityWeight: { critical: 0.9, high: 0.75, medium: 0.5, low: 0.25, info: 0.1 },
      indicatorBonus: 0.05,
      historicalPattern: 0.1,
    };

    let score = factors.severityWeight[alert.severity];
    score += Math.min(alert.indicators.length * factors.indicatorBonus, 0.3);
    score += Math.random() * factors.historicalPattern; // Simulated pattern matching

    return Math.min(score, 1.0);
  }

  public getAlerts(filter?: {
    severity?: AlertSeverity[];
    status?: AlertStatus[];
    source?: string[];
    assignedTo?: string;
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): SecurityAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (filter) {
      if (filter.severity?.length) {
        alerts = alerts.filter(a => filter.severity!.includes(a.severity));
      }
      if (filter.status?.length) {
        alerts = alerts.filter(a => filter.status!.includes(a.status));
      }
      if (filter.source?.length) {
        alerts = alerts.filter(a => filter.source!.includes(a.source));
      }
      if (filter.assignedTo) {
        alerts = alerts.filter(a => a.assignedTo === filter.assignedTo);
      }
      if (filter.dateRange) {
        alerts = alerts.filter(a =>
          a.timestamp >= filter.dateRange!.start && a.timestamp <= filter.dateRange!.end
        );
      }
    }

    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return filter?.limit ? alerts.slice(0, filter.limit) : alerts;
  }

  // ============================================================================
  // Case Management
  // ============================================================================

  public async createCase(data: {
    title: string;
    description: string;
    priority: CasePriority;
    relatedAlerts?: string[];
    assignedTo?: string;
    tags?: string[];
  }, createdBy: string): Promise<SOCCase> {
    const now = new Date();
    const caseId = this.generateId('CASE');

    // Gather indicators from related alerts
    const indicators: ThreatIndicator[] = [];
    const affectedAssets: string[] = [];

    if (data.relatedAlerts?.length) {
      for (const alertId of data.relatedAlerts) {
        const alert = this.alerts.get(alertId);
        if (alert) {
          alert.caseId = caseId;
          alert.status = 'investigating';
          indicators.push(...alert.indicators);
          affectedAssets.push(...alert.affectedAssets);
          this.alerts.set(alertId, alert);
        }
      }
    }

    const newCase: SOCCase = {
      id: caseId,
      title: data.title,
      description: data.description,
      status: 'open',
      priority: data.priority,
      createdAt: now,
      updatedAt: now,
      createdBy,
      assignedTo: data.assignedTo,
      relatedAlerts: data.relatedAlerts || [],
      indicators: this.deduplicateIndicators(indicators),
      affectedAssets: Array.from(new Set(affectedAssets)),
      timeline: [{
        id: this.generateId('TL'),
        timestamp: now,
        type: 'creation',
        userId: createdBy,
        content: `Case created: ${data.title}`,
      }],
      evidence: [],
      runbooksExecuted: [],
      externalTickets: [],
      slaDeadline: this.calculateSLADeadline(data.priority),
      slaBreached: false,
      tags: data.tags || [],
    };

    this.cases.set(caseId, newCase);
    this.emit('case:created', newCase);
    logger.info(`Case created: ${caseId}`, { priority: data.priority, alerts: data.relatedAlerts?.length || 0 }, 'SOC');

    return newCase;
  }

  public async assignAnalyst(caseId: string, analystId: string, assignedBy: string): Promise<SOCCase> {
    const socCase = this.cases.get(caseId);
    if (!socCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const analyst = this.analysts.get(analystId);
    if (!analyst) {
      throw new Error(`Analyst ${analystId} not found`);
    }

    if (analyst.currentCaseload >= analyst.maxCaseload) {
      throw new Error(`Analyst ${analystId} is at maximum caseload`);
    }

    // Update previous analyst's caseload
    if (socCase.assignedTo) {
      const prevAnalyst = this.analysts.get(socCase.assignedTo);
      if (prevAnalyst) {
        prevAnalyst.currentCaseload = Math.max(0, prevAnalyst.currentCaseload - 1);
      }
    }

    socCase.assignedTo = analystId;
    socCase.updatedAt = new Date();
    analyst.currentCaseload++;

    socCase.timeline.push({
      id: this.generateId('TL'),
      timestamp: new Date(),
      type: 'assignment',
      userId: assignedBy,
      content: `Case assigned to ${analyst.name}`,
    });

    this.cases.set(caseId, socCase);
    this.emit('case:assigned', { case: socCase, analyst });
    logger.info(`Case ${caseId} assigned to ${analyst.name}`, undefined, 'SOC');

    return socCase;
  }

  public async escalateCase(caseId: string, escalateTo: string, reason: string, escalatedBy: string): Promise<SOCCase> {
    const socCase = this.cases.get(caseId);
    if (!socCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    socCase.status = 'escalated';
    socCase.escalatedTo = escalateTo;
    socCase.updatedAt = new Date();

    socCase.timeline.push({
      id: this.generateId('TL'),
      timestamp: new Date(),
      type: 'escalation',
      userId: escalatedBy,
      content: `Case escalated to ${escalateTo}. Reason: ${reason}`,
    });

    this.cases.set(caseId, socCase);
    this.emit('case:escalated', { case: socCase, escalateTo, reason });

    // Send notifications
    await this.sendEscalationNotifications(socCase, escalateTo, reason);
    logger.warn(`Case ${caseId} escalated to ${escalateTo}`, { reason }, 'SOC');

    return socCase;
  }

  public getCases(filter?: {
    status?: CaseStatus[];
    priority?: CasePriority[];
    assignedTo?: string;
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): SOCCase[] {
    let cases = Array.from(this.cases.values());

    if (filter) {
      if (filter.status?.length) {
        cases = cases.filter(c => filter.status!.includes(c.status));
      }
      if (filter.priority?.length) {
        cases = cases.filter(c => filter.priority!.includes(c.priority));
      }
      if (filter.assignedTo) {
        cases = cases.filter(c => c.assignedTo === filter.assignedTo);
      }
      if (filter.dateRange) {
        cases = cases.filter(c =>
          c.createdAt >= filter.dateRange!.start && c.createdAt <= filter.dateRange!.end
        );
      }
    }

    cases.sort((a, b) => {
      const priorityOrder: Record<CasePriority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return filter?.limit ? cases.slice(0, filter.limit) : cases;
  }

  // ============================================================================
  // SLA Management
  // ============================================================================

  public trackSLA(identifier: string): SLAStatus | undefined {
    return this.slaTracking.get(identifier);
  }

  private initializeSLATracking(alert: SecurityAlert): void {
    const slaConfig = this.config.slaConfigs.find(c => c.severity === alert.severity);
    if (!slaConfig) return;

    const now = alert.timestamp;
    const slaStatus: SLAStatus = {
      alertId: alert.id,
      severity: alert.severity,
      createdAt: now,
      responseDeadline: new Date(now.getTime() + slaConfig.responseTimeMinutes * 60000),
      resolutionDeadline: new Date(now.getTime() + slaConfig.resolutionTimeMinutes * 60000),
      responseBreached: false,
      resolutionBreached: false,
      escalationTriggered: false,
    };

    this.slaTracking.set(alert.id, slaStatus);
  }

  private calculateSLADeadline(priority: CasePriority): Date {
    const deadlineHours: Record<CasePriority, number> = {
      P1: 4,
      P2: 8,
      P3: 24,
      P4: 72,
    };
    return new Date(Date.now() + deadlineHours[priority] * 3600000);
  }

  private checkSLABreaches(): void {
    const now = new Date();

    for (const [id, sla] of Array.from(this.slaTracking.entries())) {
      // Check response breach
      if (!sla.respondedAt && now > sla.responseDeadline && !sla.responseBreached) {
        sla.responseBreached = true;
        this.emit('sla:response_breached', { id, sla });
        logger.warn(`SLA response breach: ${id}`, { severity: sla.severity }, 'SOC');
      }

      // Check resolution breach
      if (!sla.resolvedAt && now > sla.resolutionDeadline && !sla.resolutionBreached) {
        sla.resolutionBreached = true;
        this.emit('sla:resolution_breached', { id, sla });
        logger.warn(`SLA resolution breach: ${id}`, { severity: sla.severity }, 'SOC');
      }

      // Trigger escalation if needed
      if (!sla.escalationTriggered && (sla.responseBreached || sla.resolutionBreached)) {
        sla.escalationTriggered = true;
        this.triggerAutoEscalation(id, sla);
      }
    }
  }

  private async triggerAutoEscalation(id: string, sla: SLAStatus): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert?.caseId) {
      const socCase = this.cases.get(alert.caseId);
      if (socCase && socCase.status !== 'escalated') {
        const escalationTarget = this.findEscalationTarget(sla.severity);
        if (escalationTarget) {
          await this.escalateCase(socCase.id, escalationTarget, 'SLA breach - automatic escalation', 'system');
        }
      }
    }
  }

  // ============================================================================
  // Shift Management
  // ============================================================================

  public async handoffShift(outgoingShiftId: string, incomingShiftId: string, handoffNotes: string): Promise<Shift> {
    const outgoingShift = this.shifts.get(outgoingShiftId);
    const incomingShift = this.shifts.get(incomingShiftId);

    if (!outgoingShift || !incomingShift) {
      throw new Error('Invalid shift IDs for handoff');
    }

    // Transfer open cases and pending alerts
    const openCases = this.getCases({ status: ['open', 'investigating'] });
    const pendingAlerts = this.getAlerts({ status: ['new', 'triaged'] });

    incomingShift.openCases = openCases.map(c => c.id);
    incomingShift.pendingAlerts = pendingAlerts.length;
    incomingShift.handoffNotes = handoffNotes;

    // Update outgoing shift metrics
    outgoingShift.endTime = new Date();
    outgoingShift.metrics = this.calculateShiftMetrics(outgoingShift);

    this.currentShift = incomingShift;
    this.shifts.set(outgoingShiftId, outgoingShift);
    this.shifts.set(incomingShiftId, incomingShift);

    this.emit('shift:handoff', {
      outgoing: outgoingShift,
      incoming: incomingShift,
      openCases: openCases.length,
      pendingAlerts: pendingAlerts.length,
    });

    logger.info('Shift handoff completed', {
      from: outgoingShiftId,
      to: incomingShiftId,
      openCases: openCases.length,
      pendingAlerts: pendingAlerts.length,
    }, 'SOC');

    return incomingShift;
  }

  private calculateShiftMetrics(shift: Shift): ShiftMetrics {
    const shiftAlerts = this.getAlerts({
      dateRange: { start: shift.startTime, end: shift.endTime || new Date() },
    });

    const shiftCases = this.getCases({
      dateRange: { start: shift.startTime, end: shift.endTime || new Date() },
    });

    const triageTimes = shiftAlerts
      .filter(a => a.status !== 'new')
      .map(a => {
        const sla = this.slaTracking.get(a.id);
        return sla?.timeToResponse || 0;
      })
      .filter(t => t > 0);

    return {
      alertsProcessed: shiftAlerts.filter(a => a.status !== 'new').length,
      casesOpened: shiftCases.filter(c => c.createdAt >= shift.startTime).length,
      casesClosed: shiftCases.filter(c => c.status === 'closed').length,
      avgTriageTime: triageTimes.length > 0 ? triageTimes.reduce((a, b) => a + b, 0) / triageTimes.length : 0,
      escalations: shiftCases.filter(c => c.status === 'escalated').length,
      slaBreaches: Array.from(this.slaTracking.values()).filter(s =>
        s.responseBreached || s.resolutionBreached
      ).length,
    };
  }

  // ============================================================================
  // Runbook Automation
  // ============================================================================

  public registerRunbook(runbook: Runbook): void {
    this.runbooks.set(runbook.id, runbook);
    this.emit('runbook:registered', runbook);
    logger.info(`Runbook registered: ${runbook.id}`, { name: runbook.name }, 'SOC');
  }

  public async executeRunbook(
    runbookId: string,
    context: { caseId?: string; alertId?: string; inputs?: Record<string, unknown> },
    executedBy: string
  ): Promise<RunbookExecution> {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) {
      throw new Error(`Runbook ${runbookId} not found`);
    }

    if (!runbook.enabled) {
      throw new Error(`Runbook ${runbookId} is disabled`);
    }

    const execution: RunbookExecution = {
      id: this.generateId('RBX'),
      runbookId,
      caseId: context.caseId,
      alertId: context.alertId,
      status: 'running',
      startedAt: new Date(),
      executedBy,
      currentStep: 0,
      stepResults: runbook.steps.map(s => ({
        stepId: s.id,
        status: 'pending',
      })),
      inputs: context.inputs || {},
      outputs: {},
    };

    this.runbookExecutions.set(execution.id, execution);
    this.emit('runbook:started', execution);

    // Execute steps sequentially
    try {
      for (let i = 0; i < runbook.steps.length; i++) {
        const step = runbook.steps[i];
        execution.currentStep = i;
        execution.stepResults[i].status = 'running';
        execution.stepResults[i].startedAt = new Date();

        try {
          const stepOutput = await this.executeRunbookStep(step, execution);
          execution.stepResults[i].status = 'completed';
          execution.stepResults[i].completedAt = new Date();
          execution.stepResults[i].output = stepOutput;
          execution.outputs[step.id] = stepOutput;
        } catch (stepError) {
          execution.stepResults[i].status = 'failed';
          execution.stepResults[i].error = stepError instanceof Error ? stepError.message : 'Unknown error';

          if (step.onFailure === 'stop') {
            throw stepError;
          } else if (step.onFailure === 'retry' && step.retryCount) {
            // Retry logic
            let retrySuccess = false;
            for (let retry = 0; retry < step.retryCount; retry++) {
              try {
                const retryOutput = await this.executeRunbookStep(step, execution);
                execution.stepResults[i].status = 'completed';
                execution.stepResults[i].output = retryOutput;
                retrySuccess = true;
                break;
              } catch {
                // Continue retrying
              }
            }
            if (!retrySuccess) {
              // All retries exhausted, throw the error to stop execution
              throw stepError;
            }
          }
        }
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.runbookExecutions.set(execution.id, execution);

    // Update case if linked
    if (context.caseId) {
      const socCase = this.cases.get(context.caseId);
      if (socCase) {
        socCase.runbooksExecuted.push(execution.id);
        socCase.timeline.push({
          id: this.generateId('TL'),
          timestamp: new Date(),
          type: 'runbook',
          userId: executedBy,
          content: `Runbook "${runbook.name}" ${execution.status}: ${execution.id}`,
        });
        this.cases.set(context.caseId, socCase);
      }
    }

    this.emit('runbook:completed', execution);
    logger.info(`Runbook execution ${execution.status}: ${execution.id}`, { runbookId, status: execution.status }, 'SOC');

    return execution;
  }

  private async executeRunbookStep(step: RunbookStep, execution: RunbookExecution): Promise<unknown> {
    // Simulated step execution - in production, would call actual integrations
    switch (step.type) {
      case 'script':
        return { executed: true, stepId: step.id };
      case 'api_call':
        return { response: 'success', stepId: step.id };
      case 'workflow':
        return { workflowTriggered: true, stepId: step.id };
      case 'notification':
        await this.sendNotification(step.config as Record<string, unknown>);
        return { notified: true };
      case 'approval':
        // Would pause and wait for approval in production
        return { approved: true };
      case 'manual':
        return { manualStepCompleted: true };
      default:
        return { completed: true };
    }
  }

  // ============================================================================
  // Metrics and Reporting
  // ============================================================================

  public generateMetrics(period?: { start: Date; end: Date }): SOCMetrics {
    const now = Date.now();

    // Return cached metrics if fresh
    if (this.metricsCache && (now - this.metricsCacheTime) < this.METRICS_CACHE_TTL) {
      return this.metricsCache;
    }

    const effectivePeriod = period || {
      start: new Date(now - 24 * 3600000), // Last 24 hours
      end: new Date(),
    };

    const alerts = this.getAlerts({ dateRange: effectivePeriod });
    const cases = this.getCases({ dateRange: effectivePeriod });
    const slaStatuses = Array.from(this.slaTracking.values()).filter(s =>
      s.createdAt >= effectivePeriod.start && s.createdAt <= effectivePeriod.end
    );

    // Calculate MTTD, MTTR, MTTC
    const responseTimes = slaStatuses.filter(s => s.timeToResponse).map(s => s.timeToResponse!);
    const resolutionTimes = slaStatuses.filter(s => s.timeToResolution).map(s => s.timeToResolution!);

    const mttd = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const mttr = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;

    // False positive calculation
    const falsePositives = alerts.filter(a => a.status === 'false_positive').length;
    const falsePositiveRate = alerts.length > 0 ? (falsePositives / alerts.length) * 100 : 0;

    // Alert volume metrics
    const alertVolume: AlertVolumeMetrics = {
      total: alerts.length,
      bySeverity: this.countBy(alerts, 'severity') as Record<AlertSeverity, number>,
      bySource: this.countBy(alerts, 'source'),
      byStatus: this.countBy(alerts, 'status') as Record<AlertStatus, number>,
      avgPerHour: alerts.length / 24,
    };

    // Case volume metrics
    const caseVolume: CaseVolumeMetrics = {
      total: cases.length,
      open: cases.filter(c => ['open', 'investigating'].includes(c.status)).length,
      closed: cases.filter(c => c.status === 'closed').length,
      escalated: cases.filter(c => c.status === 'escalated').length,
      byPriority: this.countBy(cases, 'priority') as Record<CasePriority, number>,
      avgResolutionTime: mttr,
    };

    // SLA metrics
    const slaMetrics: SLAMetricsData = {
      totalTracked: slaStatuses.length,
      responseCompliance: slaStatuses.length > 0
        ? (slaStatuses.filter(s => !s.responseBreached).length / slaStatuses.length) * 100
        : 100,
      resolutionCompliance: slaStatuses.length > 0
        ? (slaStatuses.filter(s => !s.resolutionBreached).length / slaStatuses.length) * 100
        : 100,
      breachesBySeverity: this.countBreachesBySeverity(slaStatuses),
    };

    const metrics: SOCMetrics = {
      period: effectivePeriod,
      mttd,
      mttr,
      mttc: mttr * 0.6, // Estimated containment time
      falsePositiveRate,
      alertVolume,
      caseMetrics: caseVolume,
      analystMetrics: this.aggregateAnalystMetrics(),
      slaMetrics,
      trendData: this.calculateTrendData(effectivePeriod),
    };

    this.metricsCache = metrics;
    this.metricsCacheTime = now;

    return metrics;
  }

  private countBy<T>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private countBreachesBySeverity(slaStatuses: SLAStatus[]): Record<AlertSeverity, number> {
    const result: Record<AlertSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const sla of slaStatuses) {
      if (sla.responseBreached || sla.resolutionBreached) {
        result[sla.severity]++;
      }
    }
    return result;
  }

  private aggregateAnalystMetrics(): Record<string, AnalystMetrics> {
    const result: Record<string, AnalystMetrics> = {};
    for (const [id, analyst] of Array.from(this.analysts.entries())) {
      if (analyst.performanceMetrics) {
        result[id] = analyst.performanceMetrics;
      }
    }
    return result;
  }

  private calculateTrendData(period: { start: Date; end: Date }): TrendDataPoint[] {
    const points: TrendDataPoint[] = [];
    const intervalMs = 3600000; // 1 hour intervals
    let current = period.start.getTime();

    while (current < period.end.getTime()) {
      const timestamp = new Date(current);
      const nextTimestamp = new Date(current + intervalMs);

      const hourAlerts = this.getAlerts({ dateRange: { start: timestamp, end: nextTimestamp } });
      const hourCases = this.getCases({ dateRange: { start: timestamp, end: nextTimestamp } });

      points.push({
        timestamp,
        alertCount: hourAlerts.length,
        caseCount: hourCases.length,
        mttr: 0, // Would calculate from actual data
        slaCompliance: 100, // Would calculate from actual data
      });

      current += intervalMs;
    }

    return points;
  }

  // ============================================================================
  // Dashboard Management
  // ============================================================================

  public createDashboardView(view: Omit<DashboardView, 'id' | 'createdAt' | 'updatedAt'>): DashboardView {
    const dashboardView: DashboardView = {
      ...view,
      id: this.generateId('DSH'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboardViews.set(dashboardView.id, dashboardView);
    this.emit('dashboard:created', dashboardView);
    return dashboardView;
  }

  public getDashboardViews(userId: string): DashboardView[] {
    return Array.from(this.dashboardViews.values()).filter(v => v.userId === userId);
  }

  // ============================================================================
  // Ticketing Integration
  // ============================================================================

  public async syncWithTicketingSystem(caseId: string, system: TicketingSystem): Promise<ExternalTicket> {
    const socCase = this.cases.get(caseId);
    if (!socCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const integration = this.config.ticketingIntegrations.find(i => i.system === system && i.enabled);
    if (!integration) {
      throw new Error(`Ticketing integration ${system} not configured or disabled`);
    }

    // Create or update ticket (simulated)
    const ticket: ExternalTicket = {
      system,
      ticketId: `${system.toUpperCase()}-${Date.now()}`,
      url: `${integration.config.baseUrl}/ticket/${Date.now()}`,
      status: 'open',
      createdAt: new Date(),
      lastSyncedAt: new Date(),
    };

    socCase.externalTickets.push(ticket);
    socCase.updatedAt = new Date();
    this.cases.set(caseId, socCase);

    this.emit('ticket:synced', { caseId, ticket });
    logger.info(`Ticket synced: ${ticket.ticketId}`, { caseId, system }, 'SOC');

    return ticket;
  }

  // ============================================================================
  // Analyst Management
  // ============================================================================

  public registerAnalyst(analyst: SOCAnalyst): void {
    this.analysts.set(analyst.id, analyst);
    this.emit('analyst:registered', analyst);
    logger.info(`Analyst registered: ${analyst.id}`, { name: analyst.name, role: analyst.role }, 'SOC');
  }

  public getAvailableAnalysts(shift?: ShiftType): SOCAnalyst[] {
    return Array.from(this.analysts.values()).filter(a =>
      a.available &&
      a.currentCaseload < a.maxCaseload &&
      (!shift || a.shift === shift)
    );
  }

  private findAvailableAnalyst(severity: AlertSeverity): SOCAnalyst | undefined {
    const analysts = this.getAvailableAnalysts();

    // For critical/high severity, prefer senior analysts
    if (severity === 'critical' || severity === 'high') {
      const senior = analysts.find(a => ['senior_analyst', 'lead'].includes(a.role));
      if (senior) return senior;
    }

    // Otherwise, return analyst with lowest caseload
    return analysts.sort((a, b) => a.currentCaseload - b.currentCaseload)[0];
  }

  private findEscalationTarget(severity: AlertSeverity): string | undefined {
    const rule = this.config.escalationRules.find(r => r.enabled);
    return rule?.escalateTo;
  }

  // ============================================================================
  // Investigation Tools
  // ============================================================================

  public async enrichIndicator(indicator: ThreatIndicator): Promise<Record<string, unknown>> {
    const tools = this.config.investigationTools.filter(t =>
      t.enabled && t.type === 'enrichment' && t.inputTypes.includes(indicator.type)
    );

    const results: Record<string, unknown> = {};
    for (const tool of tools) {
      try {
        // Simulated enrichment - would call actual tool API
        results[tool.id] = {
          tool: tool.name,
          enriched: true,
          data: {
            reputation: 'unknown',
            lastSeen: new Date().toISOString(),
            relatedIndicators: [],
          },
        };
      } catch (error) {
        results[tool.id] = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return results;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private deduplicateIndicators(indicators: ThreatIndicator[]): ThreatIndicator[] {
    const seen = new Set<string>();
    return indicators.filter(i => {
      const key = `${i.type}:${i.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async sendNotification(config: Record<string, unknown>): Promise<void> {
    // Simulated notification - would integrate with actual channels
    logger.info('Notification sent', config, 'SOC');
  }

  private async sendEscalationNotifications(socCase: SOCCase, escalateTo: string, reason: string): Promise<void> {
    const slaConfig = this.config.slaConfigs.find(c =>
      c.severity === this.getHighestAlertSeverity(socCase.relatedAlerts)
    );

    if (slaConfig) {
      for (const channel of slaConfig.notificationChannels) {
        await this.sendNotification({
          channel,
          type: 'escalation',
          caseId: socCase.id,
          escalateTo,
          reason,
        });
      }
    }
  }

  private getHighestAlertSeverity(alertIds: string[]): AlertSeverity {
    const severityOrder: AlertSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severityOrder) {
      if (alertIds.some(id => this.alerts.get(id)?.severity === severity)) {
        return severity;
      }
    }
    return 'info';
  }

  // ============================================================================
  // Cleanup and Lifecycle
  // ============================================================================

  public destroy(): void {
    // Clear SLA monitoring interval
    if (this.slaMonitoringInterval) {
      clearInterval(this.slaMonitoringInterval);
      this.slaMonitoringInterval = null;
    }

    this.removeAllListeners();
    this.alerts.clear();
    this.cases.clear();
    this.analysts.clear();
    this.shifts.clear();
    this.runbooks.clear();
    this.runbookExecutions.clear();
    this.dashboardViews.clear();
    this.slaTracking.clear();
    this.metricsCache = null;
    logger.info('SOC Operations Center destroyed', undefined, 'SOC');
  }
}

// Export singleton accessor
export const getSOCOperationsCenter = (config?: Partial<SOCConfig>): SOCOperationsCenter => {
  return SOCOperationsCenter.getInstance(config);
};

export default SOCOperationsCenter;
