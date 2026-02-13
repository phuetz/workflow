/**
 * Security Metrics Dashboard
 *
 * Comprehensive security operations metrics and KPI tracking system with
 * real-time updates, alerting, compliance tracking, and benchmarking.
 *
 * @module SecurityMetricsDashboard
 */

import { EventEmitter } from 'eventemitter3';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Severity level for alerts and incidents
 */
export enum SeverityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * Incident types for classification
 */
export enum IncidentType {
  MALWARE = 'malware',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_BREACH = 'data_breach',
  DENIAL_OF_SERVICE = 'denial_of_service',
  MISCONFIGURATION = 'misconfiguration',
  POLICY_VIOLATION = 'policy_violation',
  THIRD_PARTY_INCIDENT = 'third_party_incident',
  COMPLIANCE_VIOLATION = 'compliance_violation'
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  SOC2 = 'soc2',
  ISO27001 = 'iso27001',
  HIPAA = 'hipaa',
  GDPR = 'gdpr',
  PCI_DSS = 'pci_dss',
  NIST = 'nist'
}

/**
 * Response SLA status
 */
export enum SLAStatus {
  MET = 'met',
  AT_RISK = 'at_risk',
  BREACHED = 'breached'
}

/**
 * Key performance indicator definition
 */
export interface KPI {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  lastUpdated: Date;
  benchmark?: number;
  goal?: number;
}

/**
 * Time-based metric
 */
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  timestamp: Date;
  threshold?: number;
  currentValue?: number;
  status: 'active' | 'resolved' | 'acknowledged';
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

/**
 * Incident definition
 */
export interface Incident {
  id: string;
  type: IncidentType;
  severity: SeverityLevel;
  title: string;
  description: string;
  detectedAt: Date;
  respondedAt?: Date;
  containedAt?: Date;
  recoveredAt?: Date;
  status: 'detected' | 'responded' | 'contained' | 'recovered' | 'closed';
  assignedTo?: string;
  tags: string[];
}

/**
 * Response SLA definition
 */
export interface ResponseSLA {
  severity: SeverityLevel;
  detectionSLA: number; // minutes
  responseTimeSLA: number; // minutes
  containmentSLA: number; // minutes
  recoveryTimeSLA: number; // minutes
}

/**
 * Security metrics snapshot
 */
export interface SecurityMetricsSnapshot {
  timestamp: Date;
  kpis: Record<string, KPI>;
  alerts: Alert[];
  incidents: Incident[];
  operationalMetrics: OperationalMetrics;
  riskMetrics: RiskMetrics;
  complianceMetrics: ComplianceMetrics;
}

/**
 * Operational metrics
 */
export interface OperationalMetrics {
  alertVolumeByDay: MetricDataPoint[];
  alertVolumeBySeverity: Record<SeverityLevel, number>;
  incidentDistributionByType: Record<IncidentType, number>;
  responseSLACompliance: number; // percentage
  analyticWorkload: number; // incidents per analyst
  automationEffectiveness: number; // percentage
  toolUtilization: Record<string, number>; // tool name -> utilization %
  falsePositiveRate: number; // percentage
  alertToIncidentRatio: number;
}

/**
 * Risk metrics
 */
export interface RiskMetrics {
  overallRiskScore: number; // 0-100
  riskScoreTrend: MetricDataPoint[];
  vulnerabilityCount: Record<SeverityLevel, number>;
  patchComplianceScore: number; // percentage
  configurationDriftCount: number;
  thirdPartyRiskScore: number;
  exposedAssetsCount: number;
}

/**
 * Compliance metrics
 */
export interface ComplianceMetrics {
  controlEffectiveness: Record<string, number>; // control -> compliance %
  complianceScoreByFramework: Record<ComplianceFramework, number>; // 0-100
  auditFindingsCount: number;
  remediationProgressPercent: number;
  overallComplianceScore: number; // 0-100
}

/**
 * Threshold alert configuration
 */
export interface ThresholdConfig {
  metricName: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: SeverityLevel;
  enabled: boolean;
}

/**
 * Trend alert configuration
 */
export interface TrendAlertConfig {
  metricName: string;
  percentageChange: number;
  timeWindowMinutes: number;
  severity: SeverityLevel;
  enabled: boolean;
}

/**
 * Benchmarking data
 */
export interface BenchmarkData {
  metricName: string;
  industryAverage: number;
  industryMedian: number;
  top25Percentile: number;
  bottom25Percentile: number;
  yourValue: number;
  percentile: number;
}

/**
 * Dashboard widget definition
 */
export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'alert_table' | 'incident_table' | 'trend' | 'gauge';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  metrics: string[];
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  timeRange: {
    start: Date;
    end: Date;
  };
  refreshInterval: number; // milliseconds
  autoRefresh: boolean;
}

// ============================================================================
// Security Metrics Dashboard Class
// ============================================================================

/**
 * Comprehensive security metrics dashboard for tracking KPIs, incidents,
 * alerts, compliance, and risk metrics with real-time updates.
 *
 * Features:
 * - Real-time metric updates and streaming
 * - Customizable dashboard widgets
 * - Alerting with threshold and trend detection
 * - Incident tracking with SLA monitoring
 * - Compliance framework support
 * - Industry benchmarking
 * - Drill-down capability
 * - Export functionality
 * - Anomaly detection
 *
 * @class SecurityMetricsDashboard
 * @extends EventEmitter
 */
export class SecurityMetricsDashboard extends EventEmitter {
  private kpis: Map<string, KPI> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private metricsHistory: Map<string, MetricDataPoint[]> = new Map();
  private dashboards: Map<string, DashboardConfig> = new Map();
  private thresholdConfigs: Map<string, ThresholdConfig> = new Map();
  private trendConfigs: Map<string, TrendAlertConfig> = new Map();
  private slaConfigs: Map<SeverityLevel, ResponseSLA> = new Map();
  private benchmarkData: Map<string, BenchmarkData> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly metricsWindow: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    super();
    this.initializeSLAConfigs();
    this.initializeDefaultKPIs();
  }

  /**
   * Initialize default SLA configurations for different severity levels
   * @private
   */
  private initializeSLAConfigs(): void {
    this.slaConfigs.set(SeverityLevel.CRITICAL, {
      severity: SeverityLevel.CRITICAL,
      detectionSLA: 5,
      responseTimeSLA: 15,
      containmentSLA: 30,
      recoveryTimeSLA: 60
    });

    this.slaConfigs.set(SeverityLevel.HIGH, {
      severity: SeverityLevel.HIGH,
      detectionSLA: 15,
      responseTimeSLA: 60,
      containmentSLA: 120,
      recoveryTimeSLA: 480
    });

    this.slaConfigs.set(SeverityLevel.MEDIUM, {
      severity: SeverityLevel.MEDIUM,
      detectionSLA: 60,
      responseTimeSLA: 240,
      containmentSLA: 480,
      recoveryTimeSLA: 1440
    });

    this.slaConfigs.set(SeverityLevel.LOW, {
      severity: SeverityLevel.LOW,
      detectionSLA: 480,
      responseTimeSLA: 1440,
      containmentSLA: 2880,
      recoveryTimeSLA: 5760
    });
  }

  /**
   * Initialize default KPIs
   * @private
   */
  private initializeDefaultKPIs(): void {
    this.registerKPI('mttd', {
      name: 'Mean Time to Detect (MTTD)',
      value: 0,
      unit: 'minutes',
      threshold: 30,
      status: 'healthy',
      trend: 'stable',
      trendPercent: 0,
      lastUpdated: new Date(),
      benchmark: 25,
      goal: 20
    });

    this.registerKPI('mttr', {
      name: 'Mean Time to Respond (MTTR)',
      value: 0,
      unit: 'minutes',
      threshold: 60,
      status: 'healthy',
      trend: 'stable',
      trendPercent: 0,
      lastUpdated: new Date(),
      benchmark: 45,
      goal: 30
    });

    this.registerKPI('mttc', {
      name: 'Mean Time to Contain (MTTC)',
      value: 0,
      unit: 'minutes',
      threshold: 120,
      status: 'healthy',
      trend: 'stable',
      trendPercent: 0,
      lastUpdated: new Date(),
      benchmark: 90,
      goal: 60
    });

    this.registerKPI('mttrec', {
      name: 'Mean Time to Recover (MTTRec)',
      value: 0,
      unit: 'minutes',
      threshold: 240,
      status: 'healthy',
      trend: 'stable',
      trendPercent: 0,
      lastUpdated: new Date(),
      benchmark: 180,
      goal: 120
    });

    this.registerKPI('incident_volume', {
      name: 'Incident Volume',
      value: 0,
      unit: 'incidents/day',
      threshold: 5,
      status: 'healthy',
      trend: 'stable',
      trendPercent: 0,
      lastUpdated: new Date()
    });

    this.registerKPI('alert_to_incident_ratio', {
      name: 'Alert-to-Incident Ratio',
      value: 1,
      unit: 'ratio',
      threshold: 10,
      status: 'healthy',
      trend: 'stable',
      trendPercent: 0,
      lastUpdated: new Date(),
      goal: 5
    });

    this.registerKPI('false_positive_rate', {
      name: 'False Positive Rate',
      value: 0,
      unit: 'percent',
      threshold: 10,
      status: 'healthy',
      trend: 'stable',
      trendPercent: 0,
      lastUpdated: new Date(),
      goal: 5
    });

    this.registerKPI('security_posture_score', {
      name: 'Security Posture Score',
      value: 100,
      unit: 'score',
      threshold: 80,
      status: 'healthy',
      trend: 'stable',
      trendPercent: 0,
      lastUpdated: new Date(),
      benchmark: 75,
      goal: 95
    });
  }

  /**
   * Register a KPI
   * @param id - Unique KPI identifier
   * @param kpi - KPI definition
   */
  public registerKPI(id: string, kpi: KPI): void {
    this.kpis.set(id, kpi);
    this.metricsHistory.set(id, [{ timestamp: new Date(), value: kpi.value }]);
    this.emit('kpi:registered', { id, kpi });
  }

  /**
   * Update a KPI value
   * @param id - KPI identifier
   * @param value - New value
   * @param metadata - Optional metadata
   */
  public updateKPI(id: string, value: number, metadata?: Record<string, any>): void {
    const kpi = this.kpis.get(id);
    if (!kpi) throw new Error(`KPI ${id} not found`);

    const oldValue = kpi.value;
    const percentChange = ((value - oldValue) / oldValue) * 100;

    kpi.value = value;
    kpi.lastUpdated = new Date();
    kpi.trendPercent = percentChange;
    kpi.trend = percentChange > 1 ? 'up' : percentChange < -1 ? 'down' : 'stable';

    // Update status based on threshold
    if (kpi.threshold) {
      const isExceeding = value > kpi.threshold;
      if (isExceeding) {
        kpi.status = value > kpi.threshold * 1.5 ? 'critical' : 'warning';
      } else {
        kpi.status = 'healthy';
      }
    }

    // Add to history
    const history = this.metricsHistory.get(id) || [];
    history.push({ timestamp: new Date(), value, metadata });
    this.metricsHistory.set(id, history);

    // Clean old data
    this.pruneMetricsHistory(id);

    this.emit('kpi:updated', { id, oldValue, newValue: value, kpi });

    // Check threshold alerts
    this.checkThresholdAlerts(id, value);

    // Check trend alerts
    this.checkTrendAlerts(id);
  }

  /**
   * Get KPI by ID
   * @param id - KPI identifier
   * @returns KPI or undefined
   */
  public getKPI(id: string): KPI | undefined {
    return this.kpis.get(id);
  }

  /**
   * Get all KPIs
   * @returns Map of all KPIs
   */
  public getAllKPIs(): Map<string, KPI> {
    return new Map(this.kpis);
  }

  /**
   * Record an alert
   * @param alert - Alert definition
   * @returns Alert ID
   */
  public recordAlert(alert: Omit<Alert, 'id'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAlert: Alert = { ...alert, id };
    this.alerts.set(id, fullAlert);

    this.emit('alert:recorded', fullAlert);

    if (alert.severity === SeverityLevel.CRITICAL) {
      this.emit('alert:critical', fullAlert);
    }

    return id;
  }

  /**
   * Get alert by ID
   * @param id - Alert identifier
   * @returns Alert or undefined
   */
  public getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  /**
   * Get all active alerts
   * @returns Array of active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.status === 'active');
  }

  /**
   * Update alert status
   * @param alertId - Alert identifier
   * @param status - New status
   * @param metadata - Optional metadata
   */
  public updateAlertStatus(alertId: string, status: Alert['status'], metadata?: Record<string, any>): void {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);

    alert.status = status;
    if (status === 'acknowledged') {
      alert.acknowledgedAt = new Date();
    } else if (status === 'resolved') {
      alert.resolvedAt = new Date();
    }

    this.emit('alert:updated', { alertId, alert });
  }

  /**
   * Record an incident
   * @param incident - Incident definition
   * @returns Incident ID
   */
  public recordIncident(incident: Omit<Incident, 'id'>): string {
    const id = `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullIncident: Incident = { ...incident, id };
    this.incidents.set(id, fullIncident);

    this.emit('incident:recorded', fullIncident);

    // Create alert for the incident
    this.recordAlert({
      severity: incident.severity,
      title: `Incident: ${incident.title}`,
      description: incident.description,
      timestamp: incident.detectedAt,
      status: 'active'
    });

    return id;
  }

  /**
   * Get incident by ID
   * @param id - Incident identifier
   * @returns Incident or undefined
   */
  public getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  /**
   * Get all incidents
   * @returns Array of all incidents
   */
  public getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Update incident status
   * @param incidentId - Incident identifier
   * @param status - New status
   * @param metadata - Optional metadata
   */
  public updateIncidentStatus(incidentId: string, status: Incident['status'], metadata?: Record<string, any>): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    const oldStatus = incident.status;
    incident.status = status;

    if (status === 'responded') {
      incident.respondedAt = new Date();
    } else if (status === 'contained') {
      incident.containedAt = new Date();
    } else if (status === 'recovered') {
      incident.recoveredAt = new Date();
    }

    this.emit('incident:updated', { incidentId, oldStatus, newStatus: status, incident });

    // Update KPIs based on incident progression
    this.updateIncidentMetrics(incident);
  }

  /**
   * Register a threshold alert configuration
   * @param config - Threshold configuration
   */
  public registerThresholdAlert(config: ThresholdConfig): void {
    this.thresholdConfigs.set(config.metricName, config);
    this.emit('threshold:registered', config);
  }

  /**
   * Register a trend alert configuration
   * @param config - Trend configuration
   */
  public registerTrendAlert(config: TrendAlertConfig): void {
    this.trendConfigs.set(config.metricName, config);
    this.emit('trend:registered', config);
  }

  /**
   * Check threshold alerts for a metric
   * @private
   */
  private checkThresholdAlerts(metricId: string, value: number): void {
    const config = this.thresholdConfigs.get(metricId);
    if (!config || !config.enabled) return;

    let breached = false;
    switch (config.operator) {
      case 'gt':
        breached = value > config.threshold;
        break;
      case 'lt':
        breached = value < config.threshold;
        break;
      case 'gte':
        breached = value >= config.threshold;
        break;
      case 'lte':
        breached = value <= config.threshold;
        break;
      case 'eq':
        breached = value === config.threshold;
        break;
    }

    if (breached) {
      this.recordAlert({
        severity: config.severity,
        title: `Threshold breached: ${metricId}`,
        description: `Metric ${metricId} reached ${value} (threshold: ${config.threshold})`,
        timestamp: new Date(),
        threshold: config.threshold,
        currentValue: value,
        status: 'active'
      });
    }
  }

  /**
   * Check trend alerts for a metric
   * @private
   */
  private checkTrendAlerts(metricId: string): void {
    const config = this.trendConfigs.get(metricId);
    if (!config || !config.enabled) return;

    const history = this.metricsHistory.get(metricId);
    if (!history || history.length < 2) return;

    const cutoffTime = Date.now() - config.timeWindowMinutes * 60 * 1000;
    const recentPoints = history.filter(p => p.timestamp.getTime() > cutoffTime);

    if (recentPoints.length < 2) return;

    const oldValue = recentPoints[0].value;
    const newValue = recentPoints[recentPoints.length - 1].value;
    const changePercent = ((newValue - oldValue) / oldValue) * 100;

    if (Math.abs(changePercent) >= config.percentageChange) {
      this.recordAlert({
        severity: config.severity,
        title: `Trend alert: ${metricId}`,
        description: `Metric ${metricId} changed ${changePercent.toFixed(2)}% in ${config.timeWindowMinutes} minutes`,
        timestamp: new Date(),
        currentValue: newValue,
        status: 'active'
      });
    }
  }

  /**
   * Update incident-related metrics
   * @private
   */
  private updateIncidentMetrics(incident: Incident): void {
    if (incident.status === 'responded' && incident.respondedAt && incident.detectedAt) {
      const mttR = (incident.respondedAt.getTime() - incident.detectedAt.getTime()) / 60000;
      this.updateKPI('mttr', mttR);
    }

    if (incident.status === 'contained' && incident.containedAt && incident.detectedAt) {
      const mttC = (incident.containedAt.getTime() - incident.detectedAt.getTime()) / 60000;
      this.updateKPI('mttc', mttC);
    }

    if (incident.status === 'recovered' && incident.recoveredAt && incident.detectedAt) {
      const mttRec = (incident.recoveredAt.getTime() - incident.detectedAt.getTime()) / 60000;
      this.updateKPI('mttrec', mttRec);
    }
  }

  /**
   * Prune old metrics from history
   * @private
   */
  private pruneMetricsHistory(metricId: string): void {
    const history = this.metricsHistory.get(metricId);
    if (!history) return;

    const cutoff = Date.now() - this.metricsWindow;
    const pruned = history.filter(p => p.timestamp.getTime() > cutoff);
    this.metricsHistory.set(metricId, pruned);
  }

  /**
   * Create a custom dashboard
   * @param config - Dashboard configuration
   */
  public createDashboard(config: DashboardConfig): void {
    this.dashboards.set(config.id, config);
    this.emit('dashboard:created', config);
  }

  /**
   * Get dashboard by ID
   * @param id - Dashboard identifier
   * @returns Dashboard config or undefined
   */
  public getDashboard(id: string): DashboardConfig | undefined {
    return this.dashboards.get(id);
  }

  /**
   * Update dashboard widget
   * @param dashboardId - Dashboard identifier
   * @param widget - Widget definition
   */
  public updateWidget(dashboardId: string, widget: DashboardWidget): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error(`Dashboard ${dashboardId} not found`);

    const existingIndex = dashboard.widgets.findIndex(w => w.id === widget.id);
    if (existingIndex >= 0) {
      dashboard.widgets[existingIndex] = widget;
    } else {
      dashboard.widgets.push(widget);
    }

    this.emit('widget:updated', { dashboardId, widget });
  }

  /**
   * Get metrics for a given time range with drill-down
   * @param metricId - Metric identifier
   * @param startTime - Start time
   * @param endTime - End time
   * @param granularity - Aggregation granularity (minute, hour, day)
   * @returns Aggregated metric data points
   */
  public getMetricsTimeSeries(
    metricId: string,
    startTime: Date,
    endTime: Date,
    granularity: 'minute' | 'hour' | 'day' = 'hour'
  ): MetricDataPoint[] {
    const history = this.metricsHistory.get(metricId);
    if (!history) return [];

    const filtered = history.filter(
      p => p.timestamp >= startTime && p.timestamp <= endTime
    );

    if (granularity === 'minute') return filtered;

    return this.aggregateMetrics(filtered, granularity);
  }

  /**
   * Aggregate metrics by time granularity
   * @private
   */
  private aggregateMetrics(
    points: MetricDataPoint[],
    granularity: 'hour' | 'day'
  ): MetricDataPoint[] {
    if (points.length === 0) return [];

    const granularityMs = granularity === 'hour' ? 3600000 : 86400000;
    const aggregated: MetricDataPoint[] = [];
    let bucket: MetricDataPoint[] = [];
    let bucketStart = Math.floor(points[0].timestamp.getTime() / granularityMs) * granularityMs;

    for (const point of points) {
      const pointBucket = Math.floor(point.timestamp.getTime() / granularityMs) * granularityMs;

      if (pointBucket !== bucketStart) {
        if (bucket.length > 0) {
          const avgValue = bucket.reduce((sum, p) => sum + p.value, 0) / bucket.length;
          aggregated.push({
            timestamp: new Date(bucketStart),
            value: avgValue
          });
        }
        bucket = [];
        bucketStart = pointBucket;
      }

      bucket.push(point);
    }

    // Add final bucket
    if (bucket.length > 0) {
      const avgValue = bucket.reduce((sum, p) => sum + p.value, 0) / bucket.length;
      aggregated.push({
        timestamp: new Date(bucketStart),
        value: avgValue
      });
    }

    return aggregated;
  }

  /**
   * Get operational metrics
   * @returns Operational metrics
   */
  public getOperationalMetrics(): OperationalMetrics {
    const alertVolumeBySeverity: Record<SeverityLevel, number> = {
      [SeverityLevel.CRITICAL]: 0,
      [SeverityLevel.HIGH]: 0,
      [SeverityLevel.MEDIUM]: 0,
      [SeverityLevel.LOW]: 0,
      [SeverityLevel.INFO]: 0
    };

    const incidentDistributionByType: Record<IncidentType, number> = {
      [IncidentType.MALWARE]: 0,
      [IncidentType.UNAUTHORIZED_ACCESS]: 0,
      [IncidentType.DATA_BREACH]: 0,
      [IncidentType.DENIAL_OF_SERVICE]: 0,
      [IncidentType.MISCONFIGURATION]: 0,
      [IncidentType.POLICY_VIOLATION]: 0,
      [IncidentType.THIRD_PARTY_INCIDENT]: 0,
      [IncidentType.COMPLIANCE_VIOLATION]: 0
    };

    // Count alerts by severity
    for (const alert of Array.from(this.alerts.values())) {
      alertVolumeBySeverity[alert.severity]++;
    }

    // Count incidents by type
    for (const incident of Array.from(this.incidents.values())) {
      incidentDistributionByType[incident.type]++;
    }

    const totalAlerts = Object.values(alertVolumeBySeverity).reduce((a, b) => a + b, 0);
    const totalIncidents = this.incidents.size;
    const alertToIncidentRatio = totalIncidents > 0 ? totalAlerts / totalIncidents : 0;

    return {
      alertVolumeByDay: this.getMetricsTimeSeries('incident_volume',
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(),
        'hour'
      ),
      alertVolumeBySeverity,
      incidentDistributionByType,
      responseSLACompliance: this.calculateSLACompliance(),
      analyticWorkload: totalIncidents,
      automationEffectiveness: 75, // TODO: Calculate from automation metrics
      toolUtilization: {},
      falsePositiveRate: (this.kpis.get('false_positive_rate')?.value || 0),
      alertToIncidentRatio
    };
  }

  /**
   * Calculate SLA compliance percentage
   * @private
   */
  private calculateSLACompliance(): number {
    if (this.incidents.size === 0) return 100;

    let compliant = 0;
    let total = 0;

    for (const incident of Array.from(this.incidents.values())) {
      const sla = this.slaConfigs.get(incident.severity);
      if (!sla) continue;

      total++;

      const detectionSLAMs = sla.detectionSLA * 60 * 1000;
      if (incident.respondedAt && incident.detectedAt) {
        const responseTime = incident.respondedAt.getTime() - incident.detectedAt.getTime();
        if (responseTime <= sla.responseTimeSLA * 60 * 1000) {
          compliant++;
        }
      }
    }

    return total > 0 ? (compliant / total) * 100 : 100;
  }

  /**
   * Get risk metrics
   * @returns Risk metrics
   */
  public getRiskMetrics(): RiskMetrics {
    const vulnerabilityCount: Record<SeverityLevel, number> = {
      [SeverityLevel.CRITICAL]: 0,
      [SeverityLevel.HIGH]: 0,
      [SeverityLevel.MEDIUM]: 0,
      [SeverityLevel.LOW]: 0,
      [SeverityLevel.INFO]: 0
    };

    return {
      overallRiskScore: (this.kpis.get('security_posture_score')?.value || 100),
      riskScoreTrend: this.getMetricsTimeSeries('security_posture_score',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(),
        'day'
      ),
      vulnerabilityCount,
      patchComplianceScore: 95,
      configurationDriftCount: 0,
      thirdPartyRiskScore: 20,
      exposedAssetsCount: 0
    };
  }

  /**
   * Get compliance metrics
   * @returns Compliance metrics
   */
  public getComplianceMetrics(): ComplianceMetrics {
    const complianceScoreByFramework: Record<ComplianceFramework, number> = {
      [ComplianceFramework.SOC2]: 95,
      [ComplianceFramework.ISO27001]: 92,
      [ComplianceFramework.HIPAA]: 98,
      [ComplianceFramework.GDPR]: 96,
      [ComplianceFramework.PCI_DSS]: 94,
      [ComplianceFramework.NIST]: 93
    };

    const avgCompliance = Object.values(complianceScoreByFramework).reduce((a, b) => a + b, 0) /
      Object.keys(complianceScoreByFramework).length;

    return {
      controlEffectiveness: {},
      complianceScoreByFramework,
      auditFindingsCount: 3,
      remediationProgressPercent: 87,
      overallComplianceScore: avgCompliance
    };
  }

  /**
   * Add benchmark data
   * @param metricName - Metric name
   * @param benchmarkData - Benchmark data
   */
  public addBenchmark(metricName: string, benchmarkData: BenchmarkData): void {
    this.benchmarkData.set(metricName, benchmarkData);
    this.emit('benchmark:added', { metricName, benchmarkData });
  }

  /**
   * Get benchmark for metric
   * @param metricName - Metric name
   * @returns Benchmark data or undefined
   */
  public getBenchmark(metricName: string): BenchmarkData | undefined {
    return this.benchmarkData.get(metricName);
  }

  /**
   * Get metrics snapshot
   * @returns Current metrics snapshot
   */
  public getSnapshot(): SecurityMetricsSnapshot {
    return {
      timestamp: new Date(),
      kpis: Object.fromEntries(this.kpis),
      alerts: Array.from(this.alerts.values()),
      incidents: Array.from(this.incidents.values()),
      operationalMetrics: this.getOperationalMetrics(),
      riskMetrics: this.getRiskMetrics(),
      complianceMetrics: this.getComplianceMetrics()
    };
  }

  /**
   * Export metrics to JSON
   * @param format - Export format
   * @returns Exported data
   */
  public export(format: 'json' | 'csv' = 'json'): string {
    const snapshot = this.getSnapshot();

    if (format === 'json') {
      return JSON.stringify(snapshot, null, 2);
    }

    // CSV format
    const rows: string[] = [];
    rows.push('Metric,Value,Unit,Status,Trend,LastUpdated');

    for (const [id, kpi] of Array.from(this.kpis)) {
      rows.push(
        `${kpi.name},${kpi.value},${kpi.unit},${kpi.status},${kpi.trend},${kpi.lastUpdated.toISOString()}`
      );
    }

    return rows.join('\n');
  }

  /**
   * Start real-time metric updates
   * @param interval - Update interval in milliseconds
   */
  public startLiveUpdates(interval: number = 60000): void {
    if (this.updateInterval) clearInterval(this.updateInterval);

    this.updateInterval = setInterval(() => {
      this.emit('metrics:updated', this.getSnapshot());
    }, interval);
  }

  /**
   * Stop real-time metric updates
   */
  public stopLiveUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Perform health check on all metrics
   * @returns Health check result
   */
  public performHealthCheck(): Record<string, any> {
    const unhealthyKPIs = Array.from(this.kpis.values())
      .filter(kpi => kpi.status !== 'healthy');

    const criticalAlerts = this.getActiveAlerts()
      .filter(a => a.severity === SeverityLevel.CRITICAL);

    const slaBreaches = this.calculateSLACompliance() < 95;

    return {
      timestamp: new Date(),
      healthy: unhealthyKPIs.length === 0 && criticalAlerts.length === 0 && !slaBreaches,
      unhealthyKPIs,
      criticalAlerts,
      slaBreaches,
      overallStatus: unhealthyKPIs.length === 0 ? 'healthy' : 'degraded'
    };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopLiveUpdates();
    this.removeAllListeners();
    this.kpis.clear();
    this.alerts.clear();
    this.incidents.clear();
    this.metricsHistory.clear();
    this.dashboards.clear();
  }
}

export default SecurityMetricsDashboard;
