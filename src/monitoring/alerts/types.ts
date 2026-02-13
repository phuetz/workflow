/**
 * Shared type definitions for Alert Manager modules
 */

// ================================
// TYPE DEFINITIONS
// ================================

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertCategory = 'security' | 'performance' | 'compliance' | 'system' | 'data' | 'integration';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'muted';
export type NotificationChannelType = 'email' | 'slack' | 'teams' | 'pagerduty' | 'sms' | 'webhook';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface Alert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string;
  category: AlertCategory;
  metrics?: Record<string, any>;
  context?: Record<string, any>;
  recommended_actions: string[];
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalationLevel: number;
  notificationsSent: number;
  muteUntil?: Date;
}

export interface AlertFilter {
  severity?: AlertSeverity[];
  category?: AlertCategory[];
  status?: AlertStatus[];
  source?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface NotificationChannelConfig {
  email?: EmailConfig;
  slack?: SlackConfig;
  teams?: TeamsConfig;
  pagerduty?: PagerDutyConfig;
  sms?: SMSConfig;
  webhook?: WebhookConfig;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
}

export interface TeamsConfig {
  webhookUrl: string;
}

export interface PagerDutyConfig {
  apiKey: string;
  routingKey: string;
  integrationUrl: string;
}

export interface SMSConfig {
  provider: 'twilio' | 'aws' | 'custom';
  apiKey: string;
  apiSecret?: string;
  from: string;
  to: string[];
  accountSid?: string;
}

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  method: 'POST' | 'PUT';
  timeout: number;
  verifySsl: boolean;
}

export interface NotificationChannel {
  type: NotificationChannelType;
  name: string;
  enabled: boolean;
  config: NotificationChannelConfig;
  severityFilter: AlertSeverity[];
  categoryFilter?: AlertCategory[];
  rateLimit?: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

export interface EscalationPolicy {
  id: string;
  name: string;
  enabled: boolean;
  rules: EscalationRule[];
}

export interface EscalationRule {
  level: number;
  delay: number; // minutes
  channels: string[];
  recipients: string[];
  condition?: (alert: Alert) => boolean;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  condition: (alert: Alert) => boolean;
  channels: string[];
  recipients?: string[];
  grouping?: boolean;
}

export interface AggregatedAlert {
  id: string;
  title: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  severity: AlertSeverity;
  relatedAlertIds: string[];
  lastAggregationTime?: Date;
}

export interface DeliveryStatusRecord {
  alertId: string;
  channel: string;
  status: DeliveryStatus;
  timestamp: Date;
  error?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

export interface AlertStatistics {
  totalAlerts: number;
  byStatus: Record<AlertStatus, number>;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<AlertCategory, number>;
  acknowledgedCount: number;
  acknowledgedRate: number;
  resolvedCount: number;
  resolvedRate: number;
  avgTimeToAcknowledge: number;
  avgTimeToResolve: number;
}

export interface ChannelStatistics {
  channel: NotificationChannelType;
  name: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  averageDeliveryTime: number;
  successRate: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// ================================
// ALERT TEMPLATES
// ================================

export const ALERT_TEMPLATES = {
  brute_force_attack: {
    title: 'Brute Force Attack Detected',
    category: 'security' as AlertCategory,
    severity: 'critical' as AlertSeverity,
    description: 'Multiple failed login attempts detected from {source}',
    recommended_actions: [
      'Review failed login attempts',
      'Consider blocking the source IP',
      'Reset passwords if credentials compromised',
      'Enable multi-factor authentication'
    ]
  },
  critical_security_event: {
    title: 'Critical Security Event',
    category: 'security' as AlertCategory,
    severity: 'critical' as AlertSeverity,
    description: 'Critical security event detected: {detail}',
    recommended_actions: [
      'Immediate investigation required',
      'Contact security team',
      'Review audit logs',
      'Initiate incident response protocol'
    ]
  },
  compliance_violation: {
    title: 'Compliance Violation Detected',
    category: 'compliance' as AlertCategory,
    severity: 'high' as AlertSeverity,
    description: 'Framework violation: {framework}',
    recommended_actions: [
      'Review compliance requirements',
      'Implement corrective actions',
      'Document remediation steps',
      'Schedule compliance audit'
    ]
  },
  system_degradation: {
    title: 'System Degradation Detected',
    category: 'system' as AlertCategory,
    severity: 'high' as AlertSeverity,
    description: 'System performance degraded: {metric}',
    recommended_actions: [
      'Check system resources',
      'Review active processes',
      'Investigate resource leaks',
      'Scale resources if needed'
    ]
  },
  high_error_rate: {
    title: 'High Error Rate Detected',
    category: 'system' as AlertCategory,
    severity: 'high' as AlertSeverity,
    description: 'Error rate exceeded threshold: {rate}%',
    recommended_actions: [
      'Review error logs',
      'Check service dependencies',
      'Investigate root cause',
      'Implement fix or rollback'
    ]
  },
  unusual_activity: {
    title: 'Unusual Activity Detected',
    category: 'security' as AlertCategory,
    severity: 'medium' as AlertSeverity,
    description: 'Unusual activity pattern detected: {activity}',
    recommended_actions: [
      'Monitor for continued activity',
      'Review user actions',
      'Check for account compromise',
      'Verify legitimate use case'
    ]
  },
  data_breach_indicator: {
    title: 'Potential Data Breach Indicator',
    category: 'security' as AlertCategory,
    severity: 'critical' as AlertSeverity,
    description: 'Indicators of potential data breach: {indicator}',
    recommended_actions: [
      'Initiate breach response protocol',
      'Isolate affected systems',
      'Preserve evidence and logs',
      'Notify affected parties'
    ]
  },
  configuration_change: {
    title: 'Unexpected Configuration Change',
    category: 'system' as AlertCategory,
    severity: 'medium' as AlertSeverity,
    description: 'Configuration change detected: {change}',
    recommended_actions: [
      'Review change logs',
      'Verify authorized change',
      'Assess impact',
      'Revert if unauthorized'
    ]
  },
  failed_backup: {
    title: 'Backup Failed',
    category: 'system' as AlertCategory,
    severity: 'high' as AlertSeverity,
    description: 'Backup operation failed: {reason}',
    recommended_actions: [
      'Review backup logs',
      'Check storage availability',
      'Verify backup configuration',
      'Retry backup immediately'
    ]
  },
  license_expiration: {
    title: 'License Expiration Warning',
    category: 'compliance' as AlertCategory,
    severity: 'medium' as AlertSeverity,
    description: 'License expires in {daysUntilExpiry} days',
    recommended_actions: [
      'Renew license immediately',
      'Verify license coverage',
      'Plan for renewal',
      'Notify stakeholders'
    ]
  }
};

// ================================
// UTILITY FUNCTIONS
// ================================

export function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getSeverityColor(severity: AlertSeverity): string {
  const colors = { low: '28a745', medium: 'ffc107', high: 'dc3545', critical: '8B0000' };
  return colors[severity];
}

export function mapSeverityToPagerDuty(severity: AlertSeverity): string {
  const map = { low: 'info', medium: 'warning', high: 'error', critical: 'critical' };
  return map[severity];
}
