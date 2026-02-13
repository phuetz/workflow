/**
 * Audit Service
 * Comprehensive audit logging, compliance, and forensic analysis
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  category: AuditCategory;
  severity: AuditSeverity;
  actor: {
    userId?: string;
    username?: string;
    email?: string;
    ipAddress: string;
    userAgent: string;
    sessionId?: string;
    roles?: string[];
  };
  resource: {
    type: string;
    id?: string;
    name?: string;
    attributes?: Record<string, unknown>;
  };
  action: {
    name: string;
    result: ActionResult;
    details: Record<string, unknown>;
    duration?: number;
  };
  context: {
    location?: string;
    device?: string;
    application: string;
    version: string;
    environment: string;
    correlationId?: string;
    parentEventId?: string;
  };
  compliance: {
    frameworks: string[]; // e.g., ['SOX', 'GDPR', 'HIPAA']
    dataClassification?: string;
    retentionPeriod?: number;
  };
  integrity: {
    hash: string;
    signature?: string;
    previousEventHash?: string;
  };
  metadata: Record<string, unknown>;
}

export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SYSTEM_ACCESS = 'system_access',
  CONFIGURATION = 'configuration',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  ERROR = 'error',
  PERFORMANCE = 'performance'
}

export enum AuditSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum ActionResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  ERROR = 'error'
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: string[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  actors?: string[];
  resources?: string[];
  results?: ActionResult[];
  ipAddresses?: string[];
  searchText?: string;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  id: string;
  name: string;
  description: string;
  filters: AuditFilter;
  events: AuditEvent[];
  statistics: {
    totalEvents: number;
    eventsByCategory: Record<AuditCategory, number>;
    eventsBySeverity: Record<AuditSeverity, number>;
    eventsByResult: Record<ActionResult, number>;
    uniqueActors: number;
    uniqueResources: number;
    timeRange: {
      start: Date;
      end: Date;
    };
  };
  generatedAt: Date;
  generatedBy: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'count_gt' | 'count_gte';
  value: unknown;
  timeWindow?: number; // minutes
  threshold?: number;
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'sms' | 'slack' | 'log';
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  requirements: ComplianceRequirement[];
  retentionPeriod: number; // days
  isActive: boolean;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  eventTypes: string[];
  categories: AuditCategory[];
  dataElements: string[];
  retentionPeriod: number;
  encryptionRequired: boolean;
}

export class AuditService extends EventEmitter {
  private events: Map<string, AuditEvent> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private complianceFrameworks: Map<string, ComplianceFramework> = new Map();
  private eventChain: string[] = []; // For integrity chain
  private recentAlerts: Map<string, Date> = new Map(); // For cooldown tracking
  
  constructor() {
    super();
    this.initializeComplianceFrameworks();
    this.initializeDefaultAlertRules();
  }
  
  private initializeComplianceFrameworks(): void {
    const frameworks: ComplianceFramework[] = [
      {
        id: 'sox',
        name: 'Sarbanes-Oxley Act',
        description: 'Financial reporting and corporate governance',
        requirements: [
          {
            id: 'sox-401',
            name: 'Financial Data Access',
            description: 'All access to financial data must be logged',
            eventTypes: ['data_access', 'data_modification'],
            categories: [AuditCategory.DATA_ACCESS, AuditCategory.DATA_MODIFICATION],
            dataElements: ['financial_data', 'revenue', 'expenses', 'assets'],
            retentionPeriod: 2555, // 7 years
            encryptionRequired: true
          }
        ],
        retentionPeriod: 2555,
        isActive: true
      },
      {
        id: 'gdpr',
        name: 'General Data Protection Regulation',
        description: 'EU data protection and privacy regulation',
        requirements: [
          {
            id: 'gdpr-32',
            name: 'Security of Processing',
            description: 'Log all personal data processing activities',
            eventTypes: ['data_access', 'data_modification', 'data_export'],
            categories: [AuditCategory.DATA_ACCESS, AuditCategory.DATA_MODIFICATION],
            dataElements: ['personal_data', 'pii', 'sensitive_data'],
            retentionPeriod: 2190, // 6 years
            encryptionRequired: true
          }
        ],
        retentionPeriod: 2190,
        isActive: true
      },
      {
        id: 'hipaa',
        name: 'Health Insurance Portability and Accountability Act',
        description: 'Healthcare data protection regulation',
        requirements: [
          {
            id: 'hipaa-164',
            name: 'Audit Controls',
            description: 'Log all access to PHI',
            eventTypes: ['data_access', 'data_modification', 'authentication'],
            categories: [AuditCategory.DATA_ACCESS, AuditCategory.AUTHENTICATION],
            dataElements: ['phi', 'health_data', 'medical_records'],
            retentionPeriod: 2190,
            encryptionRequired: true
          }
        ],
        retentionPeriod: 2190,
        isActive: true
      }
    ];
    
    for (const framework of frameworks) {
      this.complianceFrameworks.set(framework.id, framework);
    }
  }
  
  private initializeDefaultAlertRules(): void {
    const rules: AlertRule[] = [
      {
        id: 'failed-login-attempts',
        name: 'Failed Login Attempts',
        description: 'Alert on multiple failed login attempts',
        isActive: true,
        conditions: [
          {
            field: 'eventType',
            operator: 'eq',
            value: 'failed_login'
          },
          {
            field: 'actor.ipAddress',
            operator: 'count_gte',
            value: 5,
            timeWindow: 10,
            threshold: 5
          }
        ],
        actions: [
          {
            type: 'email',
            config: {
              recipients: ['security@company.com'],
              subject: 'Security Alert: Multiple Failed Login Attempts'
            },
            enabled: true
          }
        ],
        cooldownPeriod: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'privileged-access',
        name: 'Privileged Access',
        description: 'Alert on privileged operations',
        isActive: true,
        conditions: [
          {
            field: 'actor.roles',
            operator: 'contains',
            value: 'admin'
          },
          {
            field: 'category',
            operator: 'in',
            value: [AuditCategory.CONFIGURATION, AuditCategory.SYSTEM_ACCESS]
          }
        ],
        actions: [
          {
            type: 'log',
            config: {
              level: 'warn',
              message: 'Privileged operation performed'
            },
            enabled: true
          }
        ],
        cooldownPeriod: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'data-exfiltration',
        name: 'Potential Data Exfiltration',
        description: 'Alert on suspicious data access patterns',
        isActive: true,
        conditions: [
          {
            field: 'category',
            operator: 'eq',
            value: AuditCategory.DATA_ACCESS
          },
          {
            field: 'actor.userId',
            operator: 'count_gt',
            value: 100,
            timeWindow: 60,
            threshold: 100
          }
        ],
        actions: [
          {
            type: 'email',
            config: {
              recipients: ['security@company.com', 'dpo@company.com'],
              subject: 'CRITICAL: Potential Data Exfiltration Detected'
            },
            enabled: true
          }
        ],
        cooldownPeriod: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    for (const rule of rules) {
      this.alertRules.set(rule.id, rule);
    }
  }
  
  // Event Logging
  
  public async logEvent(eventData: {
    eventType: string;
    category: AuditCategory;
    severity: AuditSeverity;
    actor: {
      userId?: string;
      username?: string;
      email?: string;
      ipAddress: string;
      userAgent: string;
      sessionId?: string;
      roles?: string[];
    };
    resource: {
      type: string;
      id?: string;
      name?: string;
      attributes?: Record<string, unknown>;
    };
    action: {
      name: string;
      result: ActionResult;
      details: Record<string, unknown>;
      duration?: number;
    };
    context?: {
      location?: string;
      device?: string;
      application?: string;
      version?: string;
      environment?: string;
      correlationId?: string;
      parentEventId?: string;
    };
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const eventId = crypto.randomUUID();
    const timestamp = new Date();
    
    // Determine compliance frameworks
    const applicableFrameworks = this.getApplicableFrameworks(eventData);
    
    // Calculate retention period
    const retentionPeriod = Math.max(
      ...applicableFrameworks.map(f => f.retentionPeriod),
      365 // Default 1 year
    );
    
    // Get previous event hash for integrity chain
    const previousEventHash = this.eventChain.length > 0 
      ? this.events.get(this.eventChain[this.eventChain.length - 1])?.integrity.hash
      : undefined;
    
    // Create event payload for hashing
    const eventPayload = {
      id: eventId,
      timestamp,
      eventType: eventData.eventType,
      category: eventData.category,
      actor: eventData.actor,
      resource: eventData.resource,
      action: eventData.action,
      previousEventHash
    };
    
    // Calculate integrity hash
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(eventPayload))
      .digest('hex');
    
    const auditEvent: AuditEvent = {
      id: eventId,
      timestamp,
      eventType: eventData.eventType,
      category: eventData.category,
      severity: eventData.severity,
      actor: eventData.actor,
      resource: eventData.resource,
      action: eventData.action,
      context: {
        application: 'Workflow Platform',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        ...eventData.context
      },
      compliance: {
        frameworks: applicableFrameworks.map(f => f.id),
        dataClassification: this.classifyData(eventData.resource),
        retentionPeriod
      },
      integrity: {
        hash,
        previousEventHash
      },
      metadata: eventData.metadata || {}
    };
    
    // Store event
    this.events.set(eventId, auditEvent);
    this.eventChain.push(eventId);
    
    // Check alert rules
    await this.checkAlertRules(auditEvent);
    
    // Emit event for real-time processing
    this.emit('auditEvent', auditEvent);
    
    return eventId;
  }
  
  private getApplicableFrameworks(eventData: unknown): ComplianceFramework[] {
    const frameworks: ComplianceFramework[] = [];
    
    for (const framework of this.complianceFrameworks.values()) {
      if (!framework.isActive) continue;
      
      for (const requirement of framework.requirements) {
        const typeMatches = requirement.eventTypes.includes(eventData.eventType);
        const categoryMatches = requirement.categories.includes(eventData.category);
        const dataMatches = requirement.dataElements.some(element =>
          this.eventContainsDataElement(eventData, element)
        );
        
        if (typeMatches || categoryMatches || dataMatches) {
          frameworks.push(framework);
          break;
        }
      }
    }
    
    return frameworks;
  }
  
  private eventContainsDataElement(eventData: unknown, dataElement: string): boolean {
    const searchIn = JSON.stringify(eventData).toLowerCase();
    return searchIn.includes(dataElement.toLowerCase());
  }
  
  private classifyData(resource: unknown): string {
    const attributes = resource.attributes || {};
    const resourceType = resource.type.toLowerCase();
    
    if (resourceType.includes('financial') || 
        attributes.financial || 
        attributes.revenue || 
        attributes.payment) {
      return 'financial';
    }
    
    if (resourceType.includes('personal') || 
        attributes.pii || 
        attributes.email || 
        attributes.phone) {
      return 'personal';
    }
    
    if (resourceType.includes('health') || 
        attributes.phi || 
        attributes.medical) {
      return 'health';
    }
    
    if (attributes.confidential || attributes.secret) {
      return 'confidential';
    }
    
    return 'internal';
  }
  
  // Alert Processing
  
  private async checkAlertRules(event: AuditEvent): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.isActive) continue;
      
      // Check cooldown
      const lastTriggered = this.recentAlerts.get(rule.id);
      if (lastTriggered) {
        const cooldownExpiry = new Date(lastTriggered.getTime() + rule.cooldownPeriod * 60000);
        if (new Date() < cooldownExpiry) {
          continue; // Still in cooldown
        }
      }
      
      // Check conditions
      if (await this.evaluateAlertConditions(rule.conditions, event)) {
        await this.triggerAlert(rule, event);
      }
    }
  }
  
  private async evaluateAlertConditions(
    conditions: AlertCondition[],
    event: AuditEvent
  ): Promise<boolean> {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, event)) {
        return false; // All conditions must be true
      }
    }
    
    return true;
  }
  
  private evaluateCondition(condition: AlertCondition, event: AuditEvent): boolean {
    const fieldValue = this.getNestedValue(event, condition.field);
    
    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return fieldValue > condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'contains':
        return Array.isArray(fieldValue) 
          ? fieldValue.includes(condition.value)
          : String(fieldValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'count_gt':
      case 'count_gte':
        return this.evaluateCountCondition(condition, event);
      default:
        return false;
    }
  }
  
  private evaluateCountCondition(condition: AlertCondition, event: AuditEvent): boolean {
    if (!condition.timeWindow) return false;
    
    const timeThreshold = new Date(Date.now() - condition.timeWindow * 60000);
    const fieldValue = this.getNestedValue(event, condition.field);
    
    // Count matching events in time window
    const matchingEvents = Array.from(this.events.values()).filter(e => {
      if (e.timestamp < timeThreshold) return false;
      
      const eventFieldValue = this.getNestedValue(e, condition.field);
      return eventFieldValue === fieldValue;
    });
    
    const count = matchingEvents.length;
    
    return condition.operator === 'count_gt' 
      ? count > condition.threshold!
      : count >= condition.threshold!;
  }
  
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private async triggerAlert(rule: AlertRule, event: AuditEvent): Promise<void> {
    this.recentAlerts.set(rule.id, new Date());
    rule.lastTriggered = new Date();
    
    for (const action of rule.actions) {
      if (!action.enabled) continue;
      
      try {
        await this.executeAlertAction(action, rule, event);
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }
    
    this.emit('alertTriggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      event,
      timestamp: new Date()
    });
  }
  
  private async executeAlertAction(
    action: AlertAction,
    rule: AlertRule,
    event: AuditEvent
  ): Promise<void> {
    switch (action.type) {
      case 'email':
        // Integration with email service would go here
        console.log(`EMAIL ALERT: ${rule.name}`, {
          to: action.config.recipients,
          subject: action.config.subject,
          event: event.id
        });
        break;
        
      case 'webhook':
        // HTTP webhook call would go here
        console.log(`WEBHOOK ALERT: ${rule.name}`, {
          url: action.config.url,
          event: event.id
        });
        break;
        
      case 'log':
        console.log(`AUDIT ALERT [${rule.name}]:`, action.config.message, {
          eventId: event.id,
          actor: event.actor.username || event.actor.userId,
          action: event.action.name
        });
        break;
        
      default:
        console.log(`Unsupported alert action type: ${action.type}`);
    }
  }
  
  // Search and Filtering
  
  public searchEvents(filter: AuditFilter): AuditEvent[] {
    let events = Array.from(this.events.values());
    
    // Apply filters
    if (filter.startDate) {
      events = events.filter(e => e.timestamp >= filter.startDate!);
    }
    
    if (filter.endDate) {
      events = events.filter(e => e.timestamp <= filter.endDate!);
    }
    
    if (filter.eventTypes?.length) {
      events = events.filter(e => filter.eventTypes!.includes(e.eventType));
    }
    
    if (filter.categories?.length) {
      events = events.filter(e => filter.categories!.includes(e.category));
    }
    
    if (filter.severities?.length) {
      events = events.filter(e => filter.severities!.includes(e.severity));
    }
    
    if (filter.actors?.length) {
      events = events.filter(e => 
        filter.actors!.some(actor => 
          e.actor.userId === actor || 
          e.actor.username === actor || 
          e.actor.email === actor
        )
      );
    }
    
    if (filter.resources?.length) {
      events = events.filter(e => 
        filter.resources!.includes(e.resource.type) ||
        filter.resources!.includes(e.resource.id || '') ||
        filter.resources!.includes(e.resource.name || '')
      );
    }
    
    if (filter.results?.length) {
      events = events.filter(e => filter.results!.includes(e.action.result));
    }
    
    if (filter.ipAddresses?.length) {
      events = events.filter(e => filter.ipAddresses!.includes(e.actor.ipAddress));
    }
    
    if (filter.correlationId) {
      events = events.filter(e => e.context.correlationId === filter.correlationId);
    }
    
    if (filter.searchText) {
      const searchText = filter.searchText.toLowerCase();
      events = events.filter(e => 
        JSON.stringify(e).toLowerCase().includes(searchText)
      );
    }
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    
    return events.slice(offset, offset + limit);
  }
  
  // Reporting
  
  public generateReport(
    name: string,
    description: string,
    filters: AuditFilter,
    generatedBy: string
  ): AuditReport {
    const events = this.searchEvents({ ...filters, limit: undefined, offset: undefined });
    
    const statistics = this.calculateStatistics(events);
    
    const report: AuditReport = {
      id: crypto.randomUUID(),
      name,
      description,
      filters,
      events,
      statistics,
      generatedAt: new Date(),
      generatedBy
    };
    
    this.emit('reportGenerated', {
      reportId: report.id,
      eventCount: events.length,
      generatedBy
    });
    
    return report;
  }
  
  private calculateStatistics(events: AuditEvent[]) {
    const eventsByCategory: Record<AuditCategory, number> = {
      [AuditCategory.AUTHENTICATION]: 0,
      [AuditCategory.AUTHORIZATION]: 0,
      [AuditCategory.DATA_ACCESS]: 0,
      [AuditCategory.DATA_MODIFICATION]: 0,
      [AuditCategory.SYSTEM_ACCESS]: 0,
      [AuditCategory.CONFIGURATION]: 0,
      [AuditCategory.SECURITY]: 0,
      [AuditCategory.COMPLIANCE]: 0,
      [AuditCategory.ERROR]: 0,
      [AuditCategory.PERFORMANCE]: 0
    };
    
    const eventsBySeverity: Record<AuditSeverity, number> = {
      [AuditSeverity.CRITICAL]: 0,
      [AuditSeverity.HIGH]: 0,
      [AuditSeverity.MEDIUM]: 0,
      [AuditSeverity.LOW]: 0,
      [AuditSeverity.INFO]: 0
    };
    
    const eventsByResult: Record<ActionResult, number> = {
      [ActionResult.SUCCESS]: 0,
      [ActionResult.FAILURE]: 0,
      [ActionResult.PARTIAL]: 0,
      [ActionResult.ERROR]: 0
    };
    
    const uniqueActors = new Set<string>();
    const uniqueResources = new Set<string>();
    let earliestEvent = new Date();
    let latestEvent = new Date(0);
    
    for (const event of events) {
      eventsByCategory[event.category]++;
      eventsBySeverity[event.severity]++;
      eventsByResult[event.action.result]++;
      
      uniqueActors.add(event.actor.userId || event.actor.username || event.actor.email || 'unknown');
      uniqueResources.add(`${event.resource.type}:${event.resource.id || event.resource.name || 'unknown'}`);
      
      if (event.timestamp < earliestEvent) {
        earliestEvent = event.timestamp;
      }
      if (event.timestamp > latestEvent) {
        latestEvent = event.timestamp;
      }
    }
    
    return {
      totalEvents: events.length,
      eventsByCategory,
      eventsBySeverity,
      eventsByResult,
      uniqueActors: uniqueActors.size,
      uniqueResources: uniqueResources.size,
      timeRange: {
        start: events.length > 0 ? earliestEvent : new Date(),
        end: events.length > 0 ? latestEvent : new Date()
      }
    };
  }
  
  // Integrity Verification
  
  public verifyIntegrity(eventId?: string): {
    valid: boolean;
    errors: string[];
    verifiedEvents: number;
  } {
    const errors: string[] = [];
    let verifiedEvents = 0;
    
    const eventsToVerify = eventId 
      ? [this.events.get(eventId)].filter(Boolean) as AuditEvent[]
      : Array.from(this.events.values());
    
    let previousHash: string | undefined;
    
    for (const event of eventsToVerify.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
      // Verify hash
      const eventPayload = {
        id: event.id,
        timestamp: event.timestamp,
        eventType: event.eventType,
        category: event.category,
        actor: event.actor,
        resource: event.resource,
        action: event.action,
        previousEventHash: event.integrity.previousEventHash
      };
      
      const expectedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(eventPayload))
        .digest('hex');
      
      if (event.integrity.hash !== expectedHash) {
        errors.push(`Event ${event.id}: Hash mismatch`);
      }
      
      // Verify chain
      if (previousHash && event.integrity.previousEventHash !== previousHash) {
        errors.push(`Event ${event.id}: Chain integrity broken`);
      }
      
      previousHash = event.integrity.hash;
      verifiedEvents++;
    }
    
    return {
      valid: errors.length === 0,
      errors,
      verifiedEvents
    };
  }
  
  // Compliance
  
  public getComplianceStatus(): {
    frameworks: Array<{
      id: string;
      name: string;
      compliant: boolean;
      issues: string[];
      coverage: number;
    }>;
    overallCompliance: number;
  } {
    const frameworkStatus = [];
    let totalCompliance = 0;
    
    for (const framework of this.complianceFrameworks.values()) {
      if (!framework.isActive) continue;
      
      const issues: string[] = [];
      let coverage = 0;
      
      // Check if we have events for required categories
      for (const requirement of framework.requirements) {
        const hasEvents = Array.from(this.events.values()).some(event => 
          requirement.categories.includes(event.category) ||
          requirement.eventTypes.includes(event.eventType)
        );
        
        if (hasEvents) {
          coverage++;
        } else {
          issues.push(`Missing events for requirement: ${requirement.name}`);
        }
      }
      
      const compliancePercentage = (coverage / framework.requirements.length) * 100;
      
      frameworkStatus.push({
        id: framework.id,
        name: framework.name,
        compliant: issues.length === 0,
        issues,
        coverage: compliancePercentage
      });
      
      totalCompliance += compliancePercentage;
    }
    
    return {
      frameworks: frameworkStatus,
      overallCompliance: frameworkStatus.length > 0 
        ? totalCompliance / frameworkStatus.length 
        : 100
    };
  }
  
  // Management APIs
  
  public createAlertRule(ruleData: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const rule: AlertRule = {
      ...ruleData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.alertRules.set(rule.id, rule);
    
    this.emit('alertRuleCreated', { ruleId: rule.id, name: rule.name });
    
    return rule;
  }
  
  public updateAlertRule(
    ruleId: string,
    updates: Partial<Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>>
  ): AlertRule {
    const rule = this.alertRules.get(ruleId);
    
    if (!rule) {
      throw new Error('Alert rule not found');
    }
    
    Object.assign(rule, updates, { updatedAt: new Date() });
    
    this.emit('alertRuleUpdated', { ruleId, updates });
    
    return rule;
  }
  
  public deleteAlertRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    
    if (!rule) {
      throw new Error('Alert rule not found');
    }
    
    this.alertRules.delete(ruleId);
    this.recentAlerts.delete(ruleId);
    
    this.emit('alertRuleDeleted', { ruleId });
  }
  
  // Utility Methods
  
  public getEvent(eventId: string): AuditEvent | undefined {
    return this.events.get(eventId);
  }
  
  public getAllEvents(): AuditEvent[] {
    return Array.from(this.events.values());
  }
  
  public getAlertRule(ruleId: string): AlertRule | undefined {
    return this.alertRules.get(ruleId);
  }
  
  public getAllAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }
  
  public getComplianceFramework(frameworkId: string): ComplianceFramework | undefined {
    return this.complianceFrameworks.get(frameworkId);
  }
  
  public getAllComplianceFrameworks(): ComplianceFramework[] {
    return Array.from(this.complianceFrameworks.values());
  }
  
  public getStats(): {
    totalEvents: number;
    eventsToday: number;
    alertRules: number;
    activeAlerts: number;
    complianceFrameworks: number;
    integrityValid: boolean;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const eventsToday = Array.from(this.events.values())
      .filter(e => e.timestamp >= today).length;
    
    const integrity = this.verifyIntegrity();
    
    return {
      totalEvents: this.events.size,
      eventsToday,
      alertRules: this.alertRules.size,
      activeAlerts: Array.from(this.alertRules.values()).filter(r => r.isActive).length,
      complianceFrameworks: Array.from(this.complianceFrameworks.values())
        .filter(f => f.isActive).length,
      integrityValid: integrity.valid
    };
  }
  
  // Cleanup
  
  public cleanup(retentionDays: number = 365): number {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const [eventId, event] of this.events.entries()) {
      if (event.timestamp < cutoffDate) {
        // Check compliance retention requirements
        const maxRetention = Math.max(
          ...event.compliance.frameworks
            .map(fId => this.complianceFrameworks.get(fId)?.retentionPeriod || 0),
          retentionDays
        );
        
        const complianceCutoff = new Date(Date.now() - maxRetention * 24 * 60 * 60 * 1000);
        
        if (event.timestamp < complianceCutoff) {
          this.events.delete(eventId);
          
          // Remove from chain
          const chainIndex = this.eventChain.indexOf(eventId);
          if (chainIndex > -1) {
            this.eventChain.splice(chainIndex, 1);
          }
          
          deletedCount++;
        }
      }
    }
    
    this.emit('cleanupCompleted', { deletedEvents: deletedCount });
    
    return deletedCount;
  }
}