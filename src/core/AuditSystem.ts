/**
 * Audit System and Compliance
 * Complete audit logging and compliance management
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

export interface AuditLog {
  id: string;
  timestamp: Date;
  level: AuditLevel;
  category: AuditCategory;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  username?: string;
  userRole?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  location?: GeoLocation;
  details?: any;
  changes?: ChangeRecord[];
  result: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  duration?: number;
  correlationId?: string;
  tags?: string[];
  compliance?: ComplianceInfo;
  signature?: string;
  archived: boolean;
}

export type AuditLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'configuration'
  | 'workflow'
  | 'system'
  | 'security'
  | 'compliance'
  | 'admin';

export interface ChangeRecord {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'create' | 'update' | 'delete';
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface ComplianceInfo {
  framework: ComplianceFramework;
  requirements: string[];
  controls: string[];
  evidence?: string[];
  status: 'compliant' | 'non-compliant' | 'partial';
}

export type ComplianceFramework = 
  | 'GDPR'
  | 'HIPAA'
  | 'SOC2'
  | 'ISO27001'
  | 'PCI-DSS'
  | 'CCPA'
  | 'NIST';

export interface AuditPolicy {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  categories: AuditCategory[];
  levels: AuditLevel[];
  actions: string[];
  resources: string[];
  retention: RetentionPolicy;
  alerts: AlertPolicy[];
  compliance?: ComplianceFramework[];
}

export interface RetentionPolicy {
  duration: number; // Days
  archiveAfter?: number; // Days
  deleteAfter?: number; // Days
  compressAfter?: number; // Days
}

export interface AlertPolicy {
  id: string;
  name: string;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldown?: number; // Minutes
}

export interface AlertCondition {
  type: 'threshold' | 'pattern' | 'anomaly';
  metric?: string;
  operator?: 'gt' | 'lt' | 'eq' | 'contains' | 'regex';
  value?: any;
  window?: number; // Minutes
  count?: number;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'ticket';
  config: any;
}

export interface AuditReport {
  id: string;
  name: string;
  period: {
    start: Date;
    end: Date;
  };
  filters?: AuditFilters;
  summary: AuditSummary;
  details: AuditLog[];
  compliance?: ComplianceReport;
  generatedAt: Date;
  generatedBy: string;
}

export interface AuditFilters {
  categories?: AuditCategory[];
  levels?: AuditLevel[];
  users?: string[];
  actions?: string[];
  resources?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  result?: 'success' | 'failure' | 'partial';
  search?: string;
}

export interface AuditSummary {
  totalEvents: number;
  byCategory: Record<AuditCategory, number>;
  byLevel: Record<AuditLevel, number>;
  byResult: {
    success: number;
    failure: number;
    partial: number;
  };
  topUsers: Array<{ userId: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
  failureRate: number;
  averageDuration: number;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  status: 'compliant' | 'non-compliant' | 'partial';
  score: number;
  controls: Array<{
    id: string;
    name: string;
    status: 'pass' | 'fail' | 'partial';
    evidence: string[];
  }>;
  violations: Array<{
    control: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    remediation: string;
  }>;
  recommendations: string[];
}

export class AuditSystem extends EventEmitter {
  private logs: Map<string, AuditLog> = new Map();
  private policies: Map<string, AuditPolicy> = new Map();
  private alerts: Map<string, { lastTriggered: Date; count: number }> = new Map();
  private buffer: AuditLog[] = [];
  private flushInterval: NodeJS.Timeout;
  private archiveInterval: NodeJS.Timeout;
  private signatureKey: string;
  private complianceControls: Map<ComplianceFramework, ComplianceControl[]> = new Map();

  constructor() {
    super();
    this.signatureKey = process.env.AUDIT_SIGNATURE_KEY || crypto.randomBytes(32).toString('hex');
    this.initializeDefaultPolicies();
    this.initializeComplianceControls();
    this.startBackgroundTasks();
  }

  /**
   * Initialize default audit policies
   */
  private initializeDefaultPolicies(): void {
    // Security policy
    this.createPolicy({
      id: 'security',
      name: 'Security Audit Policy',
      description: 'Audit security-related events',
      enabled: true,
      categories: ['authentication', 'authorization', 'security'],
      levels: ['warning', 'error', 'critical'],
      actions: ['login', 'logout', 'permission_change', 'password_change', 'access_denied'],
      resources: ['user', 'role', 'permission', 'api_key'],
      retention: {
        duration: 365,
        archiveAfter: 90,
        compressAfter: 30
      },
      alerts: [
        {
          id: 'failed_logins',
          name: 'Multiple Failed Logins',
          condition: {
            type: 'threshold',
            metric: 'failed_login_count',
            operator: 'gt',
            value: 5,
            window: 10
          },
          actions: [
            {
              type: 'email',
              config: { to: 'security@example.com' }
            }
          ]
        }
      ],
      compliance: ['SOC2', 'ISO27001']
    });

    // Data access policy
    this.createPolicy({
      id: 'data_access',
      name: 'Data Access Audit Policy',
      description: 'Audit data access and modifications',
      enabled: true,
      categories: ['data_access', 'data_modification'],
      levels: ['info', 'warning', 'error'],
      actions: ['read', 'write', 'delete', 'export', 'import'],
      resources: ['workflow', 'execution', 'credential', 'data'],
      retention: {
        duration: 180,
        archiveAfter: 60
      },
      alerts: [
        {
          id: 'mass_deletion',
          name: 'Mass Data Deletion',
          condition: {
            type: 'threshold',
            metric: 'delete_count',
            operator: 'gt',
            value: 100,
            window: 60
          },
          actions: [
            {
              type: 'slack',
              config: { channel: '#security-alerts' }
            }
          ]
        }
      ],
      compliance: ['GDPR', 'CCPA']
    });

    // Compliance policy
    this.createPolicy({
      id: 'compliance',
      name: 'Compliance Audit Policy',
      description: 'Audit for regulatory compliance',
      enabled: true,
      categories: ['compliance', 'admin'],
      levels: ['info', 'warning', 'error', 'critical'],
      actions: ['*'],
      resources: ['*'],
      retention: {
        duration: 2555, // 7 years
        archiveAfter: 365,
        deleteAfter: 2555
      },
      alerts: [],
      compliance: ['GDPR', 'HIPAA', 'SOC2', 'ISO27001', 'PCI-DSS']
    });
  }

  /**
   * Initialize compliance controls
   */
  private initializeComplianceControls(): void {
    // GDPR controls
    this.complianceControls.set('GDPR', [
      {
        id: 'GDPR-1',
        name: 'Data Subject Rights',
        description: 'Ensure data subject rights are respected',
        check: () => this.checkDataSubjectRights()
      },
      {
        id: 'GDPR-2',
        name: 'Consent Management',
        description: 'Track and manage user consent',
        check: () => this.checkConsentManagement()
      },
      {
        id: 'GDPR-3',
        name: 'Data Retention',
        description: 'Comply with data retention policies',
        check: () => this.checkDataRetention()
      }
    ]);

    // SOC2 controls
    this.complianceControls.set('SOC2', [
      {
        id: 'SOC2-1',
        name: 'Access Control',
        description: 'Logical access controls',
        check: () => this.checkAccessControl()
      },
      {
        id: 'SOC2-2',
        name: 'Change Management',
        description: 'Track system changes',
        check: () => this.checkChangeManagement()
      },
      {
        id: 'SOC2-3',
        name: 'Incident Response',
        description: 'Incident detection and response',
        check: () => this.checkIncidentResponse()
      }
    ]);
  }

  /**
   * Log audit event
   */
  log(params: Omit<AuditLog, 'id' | 'timestamp' | 'signature' | 'archived'>): void {
    const log: AuditLog = {
      ...params,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      archived: false
    };

    // Generate signature
    log.signature = this.generateSignature(log);

    // Add to buffer
    this.buffer.push(log);

    // Check if should flush immediately
    if (log.level === 'critical' || this.buffer.length >= 100) {
      this.flush();
    }

    // Check alerts
    this.checkAlerts(log);

    // Emit event
    this.emit('audit-logged', log);
  }

  /**
   * Create audit policy
   */
  createPolicy(policy: AuditPolicy): void {
    this.policies.set(policy.id, policy);
    this.emit('policy-created', policy);
    logger.info(`Audit policy created: ${policy.name}`);
  }

  /**
   * Query audit logs
   */
  query(filters: AuditFilters): AuditLog[] {
    let results = Array.from(this.logs.values());

    // Apply filters
    if (filters.categories?.length) {
      results = results.filter(log => 
        filters.categories!.includes(log.category)
      );
    }

    if (filters.levels?.length) {
      results = results.filter(log => 
        filters.levels!.includes(log.level)
      );
    }

    if (filters.users?.length) {
      results = results.filter(log => 
        log.userId && filters.users!.includes(log.userId)
      );
    }

    if (filters.actions?.length) {
      results = results.filter(log => 
        filters.actions!.includes(log.action)
      );
    }

    if (filters.resources?.length) {
      results = results.filter(log => 
        filters.resources!.includes(log.resource)
      );
    }

    if (filters.dateRange) {
      results = results.filter(log => 
        log.timestamp >= filters.dateRange!.start &&
        log.timestamp <= filters.dateRange!.end
      );
    }

    if (filters.result) {
      results = results.filter(log => log.result === filters.result);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(log => 
        JSON.stringify(log).toLowerCase().includes(search)
      );
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return results;
  }

  /**
   * Generate audit report
   */
  generateReport(params: {
    name: string;
    period: { start: Date; end: Date };
    filters?: AuditFilters;
    includeCompliance?: boolean;
    userId: string;
  }): AuditReport {
    const filters: AuditFilters = {
      ...params.filters,
      dateRange: params.period
    };

    const logs = this.query(filters);
    const summary = this.generateSummary(logs);
    
    const report: AuditReport = {
      id: `report_${Date.now()}`,
      name: params.name,
      period: params.period,
      filters,
      summary,
      details: logs,
      generatedAt: new Date(),
      generatedBy: params.userId
    };

    if (params.includeCompliance) {
      report.compliance = this.generateComplianceReport(logs);
    }

    this.emit('report-generated', report);

    return report;
  }

  /**
   * Generate summary from logs
   */
  private generateSummary(logs: AuditLog[]): AuditSummary {
    const summary: AuditSummary = {
      totalEvents: logs.length,
      byCategory: {} as Record<AuditCategory, number>,
      byLevel: {} as Record<AuditLevel, number>,
      byResult: {
        success: 0,
        failure: 0,
        partial: 0
      },
      topUsers: [],
      topActions: [],
      topResources: [],
      failureRate: 0,
      averageDuration: 0
    };

    // Count by category
    const categoryCount = new Map<AuditCategory, number>();
    const levelCount = new Map<AuditLevel, number>();
    const userCount = new Map<string, number>();
    const actionCount = new Map<string, number>();
    const resourceCount = new Map<string, number>();
    let totalDuration = 0;
    let durationCount = 0;

    for (const log of logs) {
      // Category
      categoryCount.set(log.category, (categoryCount.get(log.category) || 0) + 1);
      
      // Level
      levelCount.set(log.level, (levelCount.get(log.level) || 0) + 1);
      
      // Result
      summary.byResult[log.result]++;
      
      // User
      if (log.userId) {
        userCount.set(log.userId, (userCount.get(log.userId) || 0) + 1);
      }
      
      // Action
      actionCount.set(log.action, (actionCount.get(log.action) || 0) + 1);
      
      // Resource
      resourceCount.set(log.resource, (resourceCount.get(log.resource) || 0) + 1);
      
      // Duration
      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
      }
    }

    // Convert maps to objects
    for (const [key, value] of categoryCount) {
      summary.byCategory[key] = value;
    }
    
    for (const [key, value] of levelCount) {
      summary.byLevel[key] = value;
    }

    // Top users
    summary.topUsers = Array.from(userCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    // Top actions
    summary.topActions = Array.from(actionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    // Top resources
    summary.topResources = Array.from(resourceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));

    // Calculate rates
    if (logs.length > 0) {
      summary.failureRate = (summary.byResult.failure / logs.length) * 100;
    }
    
    if (durationCount > 0) {
      summary.averageDuration = totalDuration / durationCount;
    }

    return summary;
  }

  /**
   * Generate compliance report
   */
  private generateComplianceReport(logs: AuditLog[]): ComplianceReport {
    // Check for GDPR compliance as example
    const framework: ComplianceFramework = 'GDPR';
    const controls = this.complianceControls.get(framework) || [];
    
    const controlResults = controls.map(control => {
      const result = control.check(logs);
      return {
        id: control.id,
        name: control.name,
        status: result.status,
        evidence: result.evidence
      };
    });

    const violations = controlResults
      .filter(c => c.status === 'fail')
      .map(c => ({
        control: c.id,
        description: `Control ${c.name} failed`,
        severity: 'high' as const,
        remediation: 'Review and update control implementation'
      }));

    const score = controlResults.filter(c => c.status === 'pass').length / controls.length * 100;

    return {
      framework,
      status: score >= 80 ? 'compliant' : score >= 60 ? 'partial' : 'non-compliant',
      score,
      controls: controlResults,
      violations,
      recommendations: [
        'Implement automated compliance checks',
        'Regular compliance training',
        'Periodic compliance audits'
      ]
    };
  }

  /**
   * Check alerts
   */
  private checkAlerts(log: AuditLog): void {
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;
      
      for (const alert of policy.alerts) {
        if (this.shouldTriggerAlert(log, alert)) {
          this.triggerAlert(alert, log);
        }
      }
    }
  }

  /**
   * Should trigger alert
   */
  private shouldTriggerAlert(log: AuditLog, alert: AlertPolicy): boolean {
    const condition = alert.condition;
    
    switch (condition.type) {
      case 'threshold':
        // Count matching events in window
        const windowStart = new Date(Date.now() - (condition.window || 60) * 60000);
        const matchingLogs = this.query({
          dateRange: { start: windowStart, end: new Date() }
        });
        
        return matchingLogs.length > (condition.value || 0);
      
      case 'pattern':
        // Check if log matches pattern
        if (condition.operator === 'contains') {
          return JSON.stringify(log).includes(condition.value);
        } else if (condition.operator === 'regex') {
          return new RegExp(condition.value).test(JSON.stringify(log));
        }
        break;
      
      case 'anomaly':
        // Detect anomalies (simplified)
        return log.level === 'critical' || log.result === 'failure';
    }
    
    return false;
  }

  /**
   * Trigger alert
   */
  private triggerAlert(alert: AlertPolicy, log: AuditLog): void {
    // Check cooldown
    const alertKey = alert.id;
    const lastAlert = this.alerts.get(alertKey);
    
    if (lastAlert && alert.cooldown) {
      const cooldownEnd = new Date(lastAlert.lastTriggered.getTime() + alert.cooldown * 60000);
      if (new Date() < cooldownEnd) {
        return;
      }
    }

    // Execute alert actions
    for (const action of alert.actions) {
      this.executeAlertAction(action, alert, log);
    }

    // Update alert tracking
    this.alerts.set(alertKey, {
      lastTriggered: new Date(),
      count: (lastAlert?.count || 0) + 1
    });

    this.emit('alert-triggered', { alert, log });
  }

  /**
   * Execute alert action
   */
  private executeAlertAction(action: AlertAction, alert: AlertPolicy, log: AuditLog): void {
    switch (action.type) {
      case 'email':
        logger.info(`Would send email to ${action.config.to}: Alert ${alert.name}`);
        break;
      
      case 'slack':
        logger.info(`Would send Slack message to ${action.config.channel}: Alert ${alert.name}`);
        break;
      
      case 'webhook':
        logger.info(`Would call webhook ${action.config.url}: Alert ${alert.name}`);
        break;
      
      case 'sms':
        logger.info(`Would send SMS to ${action.config.phone}: Alert ${alert.name}`);
        break;
      
      case 'ticket':
        logger.info(`Would create ticket: Alert ${alert.name}`);
        break;
    }
  }

  /**
   * Generate signature for log
   */
  private generateSignature(log: AuditLog): string {
    const data = JSON.stringify({
      timestamp: log.timestamp,
      action: log.action,
      resource: log.resource,
      userId: log.userId,
      result: log.result
    });
    
    return crypto
      .createHmac('sha256', this.signatureKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify log signature
   */
  verifySignature(log: AuditLog): boolean {
    const expectedSignature = this.generateSignature(log);
    return log.signature === expectedSignature;
  }

  /**
   * Flush buffer to storage
   */
  private flush(): void {
    if (this.buffer.length === 0) return;
    
    const toFlush = [...this.buffer];
    this.buffer = [];

    for (const log of toFlush) {
      this.logs.set(log.id, log);
    }

    logger.debug(`Flushed ${toFlush.length} audit logs`);
    
    this.emit('logs-flushed', toFlush);
  }

  /**
   * Archive old logs
   */
  private async archiveLogs(): Promise<void> {
    const now = Date.now();
    const archived: AuditLog[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;
      
      const archiveAge = (policy.retention.archiveAfter || 90) * 24 * 60 * 60 * 1000;
      const deleteAge = (policy.retention.deleteAfter || 365) * 24 * 60 * 60 * 1000;

      for (const [id, log] of this.logs.entries()) {
        const age = now - log.timestamp.getTime();
        
        // Delete old logs
        if (deleteAge && age > deleteAge) {
          this.logs.delete(id);
          continue;
        }
        
        // Archive logs
        if (archiveAge && age > archiveAge && !log.archived) {
          log.archived = true;
          archived.push(log);
        }
      }
    }

    if (archived.length > 0) {
      // In production, would move to cold storage
      logger.info(`Archived ${archived.length} audit logs`);
      this.emit('logs-archived', archived);
    }
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Flush buffer periodically
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000); // Every 10 seconds

    // Archive logs periodically
    this.archiveInterval = setInterval(() => {
      this.archiveLogs();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Compliance check methods
   */
  private checkDataSubjectRights(logs?: AuditLog[]): ComplianceCheckResult {
    // Check if data subject rights are being respected
    const recentLogs = logs || this.query({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    });

    const dataRequests = recentLogs.filter(log => 
      log.action.includes('data_export') || 
      log.action.includes('data_deletion')
    );

    return {
      status: dataRequests.length > 0 ? 'pass' : 'partial',
      evidence: dataRequests.map(log => log.id)
    };
  }

  private checkConsentManagement(logs?: AuditLog[]): ComplianceCheckResult {
    // Check consent tracking
    const recentLogs = logs || this.query({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    });

    const consentLogs = recentLogs.filter(log => 
      log.action.includes('consent')
    );

    return {
      status: consentLogs.length > 0 ? 'pass' : 'fail',
      evidence: consentLogs.map(log => log.id)
    };
  }

  private checkDataRetention(logs?: AuditLog[]): ComplianceCheckResult {
    // Check if data retention policies are followed
    const oldestLog = Array.from(this.logs.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
    
    const maxRetention = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years
    const age = oldestLog ? Date.now() - oldestLog.timestamp.getTime() : 0;

    return {
      status: age < maxRetention ? 'pass' : 'fail',
      evidence: oldestLog ? [oldestLog.id] : []
    };
  }

  private checkAccessControl(logs?: AuditLog[]): ComplianceCheckResult {
    // Check access control
    const recentLogs = logs || this.query({
      categories: ['authorization'],
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    });

    const accessDenied = recentLogs.filter(log => 
      log.action === 'access_denied'
    );

    return {
      status: accessDenied.length > 0 ? 'pass' : 'partial',
      evidence: accessDenied.map(log => log.id)
    };
  }

  private checkChangeManagement(logs?: AuditLog[]): ComplianceCheckResult {
    // Check change tracking
    const recentLogs = logs || this.query({
      categories: ['configuration', 'admin'],
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    });

    const changes = recentLogs.filter(log => log.changes && log.changes.length > 0);

    return {
      status: changes.length > 0 ? 'pass' : 'partial',
      evidence: changes.map(log => log.id)
    };
  }

  private checkIncidentResponse(logs?: AuditLog[]): ComplianceCheckResult {
    // Check incident response
    const recentLogs = logs || this.query({
      levels: ['error', 'critical'],
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    });

    const incidents = recentLogs.filter(log => 
      log.category === 'security' && log.result === 'failure'
    );

    return {
      status: incidents.length === 0 ? 'pass' : 'partial',
      evidence: incidents.map(log => log.id)
    };
  }

  /**
   * Export audit logs
   */
  exportLogs(format: 'json' | 'csv', filters?: AuditFilters): string {
    const logs = this.query(filters || {});
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        const headers = ['id', 'timestamp', 'level', 'category', 'action', 'resource', 'userId', 'result'];
        const rows = logs.map(log => 
          headers.map(h => log[h as keyof AuditLog] || '').join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      
      default:
        return '';
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const logs = Array.from(this.logs.values());
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter(log => log.timestamp > last24h);

    return {
      totalLogs: logs.length,
      archivedLogs: logs.filter(log => log.archived).length,
      last24Hours: recentLogs.length,
      failureRate: recentLogs.filter(log => log.result === 'failure').length / recentLogs.length * 100,
      topCategories: this.generateSummary(recentLogs).topActions.slice(0, 5),
      activeAlerts: this.alerts.size,
      policies: this.policies.size
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    clearInterval(this.flushInterval);
    clearInterval(this.archiveInterval);
    this.flush();
    this.removeAllListeners();
  }
}

// Compliance control interface
interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  check: (logs?: AuditLog[]) => ComplianceCheckResult;
}

interface ComplianceCheckResult {
  status: 'pass' | 'fail' | 'partial';
  evidence: string[];
}

// Export singleton instance
export const auditSystem = new AuditSystem();