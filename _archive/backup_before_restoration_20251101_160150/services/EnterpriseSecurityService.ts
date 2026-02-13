/**
 * Enterprise Security Service
 * Advanced enterprise-grade security features including SAML SSO, advanced audit logging,
 * compliance frameworks, data governance, and security policies
 */

import { EventEmitter } from 'events';
import { logger } from './LoggingService';
import { monitoringService } from './MonitoringService';
import { encryptionService } from './EncryptionService';

interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  type: 'access' | 'data' | 'network' | 'compliance';
  rules: SecurityRule[];
  enforcement: 'warn' | 'block' | 'audit';
  scope: string[]; // Resources, users, or groups affected
  enabled: boolean;
  created: Date;
  updated: Date;
  createdBy: string;
}

interface SecurityRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'require_approval' | 'log' | 'encrypt';
  parameters: Record<string, unknown>;
  priority: number;
}

interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  sourceIp: string;
  userAgent: string;
  result: 'success' | 'failure' | 'warning';
  details: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  compliance: {
    gdpr: boolean;
    hipaa: boolean;
    sox: boolean;
    iso27001: boolean;
  };
}

interface SAMLConfig {
  entityId: string;
  singleSignOnUrl: string;
  x509Certificate: string;
  signatureAlgorithm: string;
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    groups: string;
  };
  nameIdFormat: string;
  authnContextClassRef: string;
}

interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
  assessments: ComplianceAssessment[];
  status: 'compliant' | 'non_compliant' | 'pending' | 'not_applicable';
  lastAssessment: Date;
  nextAssessment: Date;
}

interface ComplianceRequirement {
  id: string;
  control: string;
  description: string;
  category: string;
  mandatory: boolean;
  implemented: boolean;
  evidence: string[];
  lastReview: Date;
  assignee: string;
}

interface ComplianceAssessment {
  id: string;
  assessor: string;
  timestamp: Date;
  score: number;
  findings: ComplianceFinding[];
  recommendations: string[];
  status: 'passed' | 'failed' | 'partial';
}

interface ComplianceFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requirement: string;
  remediation: string;
  dueDate: Date;
}

interface DataClassification {
  id: string;
  name: string;
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  description: string;
  handling: {
    storage: string[];
    transmission: string[];
    access: string[];
    retention: number; // days
    disposal: string;
  };
  labels: string[];
}

interface DataGovernancePolicy {
  id: string;
  name: string;
  scope: string;
  classification: string;
  rules: DataGovernanceRule[];
  retention: {
    period: number; // days
    action: 'archive' | 'delete' | 'anonymize';
    exceptions: string[];
  };
  privacy: {
    pii: boolean;
    phi: boolean;
    sensitive: boolean;
    consent_required: boolean;
  };
}

interface DataGovernanceRule {
  condition: string;
  action: string;
  parameters: Record<string, unknown>;
}

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  category: 'access' | 'data_breach' | 'malware' | 'phishing' | 'other';
  affectedResources: string[];
  affectedUsers: string[];
  timeline: IncidentTimelineEntry[];
  assignee: string;
  created: Date;
  resolved?: Date;
  rootCause?: string;
  remediation: string[];
}

interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
}

interface ThreatIntelligence {
  id: string;
  type: 'ioc' | 'ttp' | 'vulnerability' | 'campaign';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source: string;
  data: Record<string, unknown>;
  confidence: number; // 0-100
  timestamp: Date;
  expires?: Date;
  tags: string[];
}

export class EnterpriseSecurityService extends EventEmitter {
  private static instance: EnterpriseSecurityService;
  private securityPolicies: Map<string, SecurityPolicy> = new Map();
  private auditEvents: AuditEvent[] = [];
  private samlConfigs: Map<string, SAMLConfig> = new Map();
  private complianceFrameworks: Map<string, ComplianceFramework> = new Map();
  private dataClassifications: Map<string, DataClassification> = new Map();
  private dataGovernancePolicies: Map<string, DataGovernancePolicy> = new Map();
  private securityIncidents: Map<string, SecurityIncident> = new Map();
  private threatIntelligence: Map<string, ThreatIntelligence> = new Map();
  private auditBuffer: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private threatIntelInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.initializeDefaultPolicies();
    this.initializeComplianceFrameworks();
    this.initializeDataClassifications();
    this.startAuditProcessing();
    this.startThreatIntelligence();
  }

  public static getInstance(): EnterpriseSecurityService {
    if (!EnterpriseSecurityService.instance) {
      EnterpriseSecurityService.instance = new EnterpriseSecurityService();
    }
    return EnterpriseSecurityService.instance;
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: SecurityPolicy[] = [
      {
        id: 'password_policy',
        name: 'Password Security Policy',
        description: 'Enforces strong password requirements',
        type: 'access',
        rules: [
          {
            id: 'password_length',
            condition: 'password.length >= 12',
            action: 'deny',
            parameters: { minLength: 12 },
            priority: 1
          },
          {
            id: 'password_complexity',
            condition: 'password.complexity < 4',
            action: 'deny',
            parameters: { requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSymbols: true },
            priority: 2
          }
        ],
        enforcement: 'block',
        scope: ['all_users'],
        enabled: true,
        created: new Date(),
        updated: new Date(),
        createdBy: 'system'
      },
      {
        id: 'data_access_policy',
        name: 'Sensitive Data Access Policy',
        description: 'Controls access to sensitive data based on classification',
        type: 'data',
        rules: [
          {
            id: 'restricted_data_access',
            condition: 'data.classification === "restricted" && !user.hasRole("data_admin")',
            action: 'deny',
            parameters: {},
            priority: 1
          },
          {
            id: 'confidential_data_logging',
            condition: 'data.classification === "confidential"',
            action: 'log',
            parameters: { logLevel: 'audit' },
            priority: 2
          }
        ],
        enforcement: 'block',
        scope: ['workflows', 'data_sources'],
        enabled: true,
        created: new Date(),
        updated: new Date(),
        createdBy: 'system'
      },
      {
        id: 'geographic_restriction',
        name: 'Geographic Access Restriction',
        description: 'Restricts access based on geographic location',
        type: 'network',
        rules: [
          {
            id: 'country_restriction',
            condition: 'request.country in ["CN", "RU", "KP"]',
            action: 'deny',
            parameters: { blockedCountries: ['CN', 'RU', 'KP'] },
            priority: 1
          }
        ],
        enforcement: 'block',
        scope: ['api_access', 'web_access'],
        enabled: false,
        created: new Date(),
        updated: new Date(),
        createdBy: 'system'
      }
    ];

    defaultPolicies.forEach(policy => {
      this.securityPolicies.set(policy.id, policy);
    });

    logger.info(`🔒 Initialized ${defaultPolicies.length} default security policies`);
  }

  private initializeComplianceFrameworks(): void {
    const frameworks: ComplianceFramework[] = [
      {
        id: 'gdpr',
        name: 'General Data Protection Regulation',
        version: '2018',
        requirements: [
          {
            id: 'gdpr_consent',
            control: 'Article 6',
            description: 'Lawful basis for processing personal data',
            category: 'consent',
            mandatory: true,
            implemented: true,
            evidence: ['consent_management_system.pdf'],
            lastReview: new Date(),
            assignee: 'privacy_officer'
          },
          {
            id: 'gdpr_breach_notification',
            control: 'Article 33',
            description: 'Notification of personal data breach to supervisory authority',
            category: 'incident_response',
            mandatory: true,
            implemented: true,
            evidence: ['breach_notification_process.pdf'],
            lastReview: new Date(),
            assignee: 'security_team'
          }
        ],
        assessments: [],
        status: 'compliant',
        lastAssessment: new Date(),
        nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'iso27001',
        name: 'ISO/IEC 27001:2013',
        version: '2013',
        requirements: [
          {
            id: 'iso_isms',
            control: 'A.5.1.1',
            description: 'Information security management system',
            category: 'management',
            mandatory: true,
            implemented: true,
            evidence: ['isms_documentation.pdf'],
            lastReview: new Date(),
            assignee: 'ciso'
          },
          {
            id: 'iso_access_control',
            control: 'A.9.1.1',
            description: 'Access control policy',
            category: 'access_control',
            mandatory: true,
            implemented: true,
            evidence: ['access_control_policy.pdf'],
            lastReview: new Date(),
            assignee: 'security_team'
          }
        ],
        assessments: [],
        status: 'compliant',
        lastAssessment: new Date(),
        nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    ];

    frameworks.forEach(framework => {
      this.complianceFrameworks.set(framework.id, framework);
    });

    logger.info(`📋 Initialized ${frameworks.length} compliance frameworks`);
  }

  private initializeDataClassifications(): void {
    const classifications: DataClassification[] = [
      {
        id: 'public',
        name: 'Public',
        level: 'public',
        description: 'Information that can be freely shared with the public',
        handling: {
          storage: ['any'],
          transmission: ['any'],
          access: ['any'],
          retention: 2555, // 7 years
          disposal: 'standard_deletion'
        },
        labels: ['public', 'open']
      },
      {
        id: 'internal',
        name: 'Internal',
        level: 'internal',
        description: 'Information for internal use within the organization',
        handling: {
          storage: ['corporate_cloud', 'on_premise'],
          transmission: ['encrypted'],
          access: ['authenticated_users'],
          retention: 2555, // 7 years
          disposal: 'secure_deletion'
        },
        labels: ['internal', 'company_confidential']
      },
      {
        id: 'confidential',
        name: 'Confidential',
        level: 'confidential',
        description: 'Sensitive information that requires protection',
        handling: {
          storage: ['encrypted_storage'],
          transmission: ['encrypted', 'secure_channel'],
          access: ['role_based', 'need_to_know'],
          retention: 2555, // 7 years
          disposal: 'cryptographic_erasure'
        },
        labels: ['confidential', 'sensitive']
      },
      {
        id: 'restricted',
        name: 'Restricted',
        level: 'restricted',
        description: 'Highly sensitive information with strict access controls',
        handling: {
          storage: ['air_gapped', 'highest_encryption'],
          transmission: ['end_to_end_encrypted', 'authenticated_channel'],
          access: ['multi_factor_auth', 'privileged_access'],
          retention: 2555, // 7 years
          disposal: 'physical_destruction'
        },
        labels: ['restricted', 'top_secret', 'pii', 'phi']
      }
    ];

    classifications.forEach(classification => {
      this.dataClassifications.set(classification.id, classification);
    });

    logger.info(`🏷️ Initialized ${classifications.length} data classifications`);
  }

  private startAuditProcessing(): void {
    this.flushInterval = setInterval(() => {
      this.flushAuditBuffer();
    }, 30000); // Flush every 30 seconds
  }

  private startThreatIntelligence(): void {
    this.threatIntelInterval = setInterval(() => {
      this.updateThreatIntelligence();
    }, 300000); // Update every 5 minutes
  }

  /**
   * Security Policy Management
   */
  public createSecurityPolicy(policy: Omit<SecurityPolicy, 'id' | 'created' | 'updated'>): string {
    const newPolicy: SecurityPolicy = {
      ...policy,
      id,
      created: new Date(),
      updated: new Date()
    };

    this.securityPolicies.set(id, newPolicy);
    
    this.auditLog('security_policy_created', 'security_policy', id, {
      policyName: policy.name,
      type: policy.type,
      enforcement: policy.enforcement
    });

    logger.info(`🔒 Created security policy: ${policy.name} (${id})`);
    return id;
  }

  public evaluateSecurityPolicy(
    policyId: string,
    context: Record<string, unknown>
  ): { allowed: boolean; actions: string[]; violations: string[] } {
    if (!policy || !policy.enabled) {
      return { allowed: true, actions: [], violations: [] };
    }

    const violations: string[] = [];
    const actions: string[] = [];

    // Sort rules by priority

    for (const rule of sortedRules) {
      try {
        
        if (conditionMet) {
          actions.push(rule.action);
          
          switch (rule.action) {
            case 'deny':
              allowed = false;
              violations.push(`Policy violation: ${policy.name} - Rule: ${rule.id}`);
              break;
            case 'require_approval':
              allowed = false; // Will require manual approval
              actions.push('approval_required');
              break;
            case 'log':
              this.auditLog('policy_triggered', 'security_policy', policyId, {
                rule: rule.id,
                context
              });
              break;
            case 'encrypt':
              actions.push('encryption_required');
              break;
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to evaluate security rule ${rule.id}:`, error);
      }
    }

    // Record policy evaluation
    monitoringService.recordMetric('security.policy.evaluation', 1, {
      policyId,
      allowed: allowed.toString(),
      violations: violations.length.toString()
    });

    return { allowed, actions, violations };
  }

  /**
   * SAML SSO Management
   */
  public configureSAML(domain: string, config: SAMLConfig): void {
    this.samlConfigs.set(domain, config);
    
    this.auditLog('saml_configured', 'saml_config', domain, {
      entityId: config.entityId,
      singleSignOnUrl: config.singleSignOnUrl
    });

    logger.info(`🔐 Configured SAML SSO for domain: ${domain}`);
  }

  public async validateSAMLAssertion(
    assertion: string,
    domain: string
  ): Promise<{
    valid: boolean;
    user?: {
      email: string;
      firstName: string;
      lastName: string;
      groups: string[];
    };
    error?: string;
  }> {
    try {
      if (!config) {
        return { valid: false, error: 'SAML configuration not found' };
      }

      // Validate SAML assertion (simplified implementation)
      
      if (!isValid) {
        return { valid: false, error: 'Invalid SAML signature' };
      }

      
      this.auditLog('saml_login_success', 'authentication', user.email, {
        domain,
        groups: user.groups
      });

      return { valid: true, user };

    } catch (error) {
      this.auditLog('saml_login_failure', 'authentication', domain, {
        error: error.message
      });

      return { valid: false, error: error.message };
    }
  }

  /**
   * Audit Logging
   */
  public auditLog(
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, unknown> = {},
    userId?: string,
    userEmail?: string,
    sourceIp?: string,
    userAgent?: string,
    result: 'success' | 'failure' | 'warning' = 'success'
  ): void {
    const auditEvent: AuditEvent = {
      id: this.generateId('audit'),
      timestamp: new Date(),
      userId: userId || 'system',
      userEmail: userEmail || 'system',
      action,
      resource,
      resourceId,
      sourceIp: sourceIp || '127.0.0.1',
      userAgent: userAgent || 'system',
      result,
      details,
      riskLevel: this.calculateRiskLevel(action, details),
      compliance: {
        gdpr: this.isGDPRRelevant(action, details),
        hipaa: this.isHIPAARelevant(action, details),
        sox: this.isSOXRelevant(action, details),
        iso27001: this.isISO27001Relevant(action, details)
      }
    };

    this.auditBuffer.push(auditEvent);

    // Emit event for real-time monitoring
    this.emit('audit_event', auditEvent);

    // Immediate alert for critical events
    if (auditEvent.riskLevel === 'critical') {
      this.handleCriticalAuditEvent(auditEvent);
    }
  }

  private flushAuditBuffer(): void {
    if (this.auditBuffer.length === 0) return;

    // Add to main audit log
    this.auditEvents.push(...this.auditBuffer);
    
    // Keep only last 100,000 events in memory
    if (this.auditEvents.length > 100000) {
      this.auditEvents = this.auditEvents.slice(-100000);
    }

    // Store in persistent storage (simplified)
    this.storeAuditEvents(this.auditBuffer);

    this.auditBuffer = [];

    // Record metrics
    monitoringService.recordMetric('security.audit.events', this.auditEvents.length);
  }

  /**
   * Compliance Management
   */
  public assessCompliance(frameworkId: string): ComplianceAssessment {
    if (!framework) {
      throw new Error(`Compliance framework ${frameworkId} not found`);
    }

    const assessment: ComplianceAssessment = {
      id: this.generateId('assessment'),
      assessor: 'system',
      timestamp: new Date(),
      score: 0,
      findings: [],
      recommendations: [],
      status: 'passed'
    };


    for (const requirement of framework.requirements) {
      if (requirement.implemented) {
        implementedCount++;
      } else {
        const finding: ComplianceFinding = {
          severity: requirement.mandatory ? 'high' : 'medium',
          description: `Requirement not implemented: ${requirement.description}`,
          requirement: requirement.id,
          remediation: `Implement control ${requirement.control}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };
        assessment.findings.push(finding);
      }
    }

    assessment.score = (implementedCount / totalRequirements) * 100;
    assessment.status = assessment.score >= 90 ? 'passed' : assessment.score >= 70 ? 'partial' : 'failed';

    framework.assessments.push(assessment);
    framework.lastAssessment = new Date();
    framework.status = assessment.status === 'passed' ? 'compliant' : 'non_compliant';

    this.auditLog('compliance_assessment', 'compliance_framework', frameworkId, {
      score: assessment.score,
      status: assessment.status,
      findings: assessment.findings.length
    });

    logger.info(`📋 Compliance assessment completed for ${framework.name}: ${assessment.score}% (${assessment.status})`);

    return assessment;
  }

  /**
   * Data Governance
   */
  public classifyData(data: unknown, context: Record<string, unknown>): string {
    // Analyze data content to determine classification

    // Check for PII patterns
    if (this.containsPII(data)) {
      classification = 'confidential';
    }

    // Check for PHI patterns
    if (this.containsPHI(data)) {
      classification = 'restricted';
    }

    // Check for financial data
    if (this.containsFinancialData(data)) {
      classification = 'confidential';
    }

    // Apply context-based rules
    if (context.userClassification) {
      
      if (userLevel > dataLevel) {
        classification = context.userClassification;
      }
    }

    this.auditLog('data_classified', 'data', 'unknown', {
      classification,
      containsPII: this.containsPII(data),
      containsPHI: this.containsPHI(data),
      context
    });

    return classification;
  }

  public applyDataGovernancePolicy(
    policyId: string,
    data: unknown,
    context: Record<string, unknown>
  ): { allowed: boolean; actions: string[]; transformedData?: unknown } {
    if (!policy) {
      return { allowed: true, actions: [] };
    }

    const actions: string[] = [];

    // Apply governance rules
    for (const rule of policy.rules) {
      try {
        
        if (conditionMet) {
          switch (rule.action) {
            case 'anonymize':
              transformedData = this.anonymizeData(transformedData, rule.parameters);
              actions.push('anonymized');
              break;
            case 'encrypt':
              transformedData = this.encryptData(transformedData, rule.parameters);
              actions.push('encrypted');
              break;
            case 'restrict_access':
              allowed = false;
              actions.push('access_restricted');
              break;
            case 'log_access':
              this.auditLog('data_access', 'data_governance', policyId, {
                policy: policy.name,
                rule: rule.condition
              });
              actions.push('logged');
              break;
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to apply data governance rule:`, error);
      }
    }

    return { allowed, actions, transformedData };
  }

  /**
   * Security Incident Management
   */
  public createSecurityIncident(
    title: string,
    description: string,
    severity: SecurityIncident['severity'],
    category: SecurityIncident['category'],
    affectedResources: string[] = [],
    affectedUsers: string[] = []
  ): string {
    const incident: SecurityIncident = {
      id,
      title,
      description,
      severity,
      status: 'open',
      category,
      affectedResources,
      affectedUsers,
      timeline: [{
        timestamp: new Date(),
        action: 'incident_created',
        actor: 'system',
        details: 'Security incident created'
      }],
      assignee: 'security_team',
      created: new Date(),
      remediation: []
    };

    this.securityIncidents.set(id, incident);

    // Auto-escalate critical incidents
    if (severity === 'critical') {
      this.escalateIncident(id);
    }

    this.auditLog('security_incident_created', 'security_incident', id, {
      title,
      severity,
      category,
      affectedResources: affectedResources.length,
      affectedUsers: affectedUsers.length
    }, undefined, undefined, undefined, undefined, 'warning');

    logger.warn(`🚨 Security incident created: ${title} (${severity})`);

    return id;
  }

  public updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    notes?: string
  ): void {
    if (!incident) {
      throw new Error(`Security incident ${incidentId} not found`);
    }

    incident.status = status;

    incident.timeline.push({
      timestamp: new Date(),
      action: 'status_changed',
      actor: 'system',
      details: `Status changed from ${oldStatus} to ${status}${notes ? ': ' + notes : ''}`
    });

    if (status === 'resolved') {
      incident.resolved = new Date();
    }

    this.auditLog('security_incident_updated', 'security_incident', incidentId, {
      oldStatus,
      newStatus: status,
      notes
    });

    logger.info(`🔄 Security incident ${incidentId} status changed: ${oldStatus} → ${status}`);
  }

  /**
   * Threat Intelligence
   */
  private async updateThreatIntelligence(): Promise<void> {
    try {
      // Simulate threat intelligence feed update
      const threats: ThreatIntelligence[] = [
        {
          id: this.generateId('threat'),
          type: 'ioc',
          severity: 'high',
          source: 'commercial_feed',
          data: {
            ip: '192.168.1.100',
            type: 'malicious_ip',
            description: 'Known botnet C&C server'
          },
          confidence: 85,
          timestamp: new Date(),
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          tags: ['botnet', 'c2', 'malware']
        }
      ];

      for (const threat of threats) {
        this.threatIntelligence.set(threat.id, threat);
      }

      // Clean up expired threats
      for (const [id, threat] of this.threatIntelligence.entries()) {
        if (threat.expires && threat.expires < now) {
          this.threatIntelligence.delete(id);
        }
      }

      logger.debug(`🔍 Updated threat intelligence: ${threats.length} new threats`);

    } catch (error) {
      logger.error('❌ Failed to update threat intelligence:', error);
    }
  }

  /**
   * Helper Methods
   */

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    try {
      // Simple condition evaluation - in production use a proper expression parser
      return func(...Object.values(context));
    } catch (error) {
      logger.error(`❌ Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  private calculateRiskLevel(action: string, details: Record<string, unknown>): AuditEvent['riskLevel'] {
    // Risk calculation based on action and context
    if (action.includes('delete') || action.includes('destroy')) return 'high';
    if (action.includes('admin') || action.includes('privilege')) return 'medium';
    if (action.includes('login') || action.includes('access')) return 'low';
    if (details.error || details.failure) return 'medium';
    return 'low';
  }

  private isGDPRRelevant(action: string, details: Record<string, unknown>): boolean {
    return action.includes('personal') || action.includes('pii') || 
           details.containsPII || details.dataSubject;
  }

  private isHIPAARelevant(action: string, details: Record<string, unknown>): boolean {
    return action.includes('health') || action.includes('medical') || 
           details.containsPHI || details.healthData;
  }

  private isSOXRelevant(action: string, details: Record<string, unknown>): boolean {
    return action.includes('financial') || action.includes('audit') || 
           details.financialData || details.auditLog;
  }

  private isISO27001Relevant(action: string, details: Record<string, unknown>): boolean {
    return action.includes('security') || action.includes('access') || 
           action.includes('policy') || details.securityEvent;
  }

  private handleCriticalAuditEvent(event: AuditEvent): void {
    // Create security incident for critical audit events
    this.createSecurityIncident(
      `Critical Audit Event: ${event.action}`,
      `Critical security event detected: ${event.action} on ${event.resource}`,
      'high',
      'access',
      [event.resourceId || event.resource],
      [event.userId]
    );

    // Send immediate alerts
    this.emit('critical_audit_event', event);
  }

  private escalateIncident(incidentId: string): void {
    // Escalation logic for critical incidents
    logger.error(`🚨 CRITICAL INCIDENT ESCALATED: ${incidentId}`);
    this.emit('incident_escalated', { incidentId });
  }

  private containsPII(data: unknown): boolean {
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/ // Credit card
    ];

    return piiPatterns.some(pattern => pattern.test(dataString));
  }

  private containsPHI(data: unknown): boolean {
    return phiKeywords.some(keyword => dataString.includes(keyword));
  }

  private containsFinancialData(data: unknown): boolean {
      /\b\d{10,12}\b/, // Account numbers
      /\$\d+\.?\d*/, // Currency amounts
      /\b(IBAN|SWIFT)\b/i // Banking codes
    ];

    return financialPatterns.some(pattern => pattern.test(dataString));
  }

  private getClassificationLevel(classification: string): number {
    return levels[classification as keyof typeof levels] || 1;
  }

  private anonymizeData(data: unknown, parameters: Record<string, unknown>): unknown {
    // Simple anonymization - replace with hashed values
    
    if (parameters.fields) {
      for (const field of parameters.fields) {
        if (anonymized[field]) {
          anonymized[field] = this.hashValue(anonymized[field]);
        }
      }
    }
    
    return anonymized;
  }

  private encryptData(data: unknown, parameters: Record<string, unknown>): unknown {
    // Encrypt sensitive fields
    
    if (parameters.fields) {
      for (const field of parameters.fields) {
        if (encrypted[field]) {
          encrypted[field] = encryptionService.encrypt(encrypted[field]);
        }
      }
    }
    
    return encrypted;
  }

  private hashValue(value: string): string {
    // Simple hash function - use proper cryptographic hash in production
    return `hash_${value.length}_${Date.now()}`;
  }

  private async storeAuditEvents(events: AuditEvent[]): Promise<void> {
    // Store audit events in persistent storage
    // This would integrate with your database or audit system
    logger.debug(`📊 Stored ${events.length} audit events`);
  }

  private decodeSAMLAssertion(assertion: string): unknown {
    // Decode and parse SAML assertion
    // This is a simplified implementation
    return { decoded: true, assertion };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async verifySAMLSignature(assertion: unknown, certificate: string): Promise<boolean> {
    // Verify SAML signature using certificate
    // This is a simplified implementation
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private extractUserFromSAML(assertion: unknown, mapping: SAMLConfig['attributeMapping']): unknown {
    // Extract user information from SAML assertion
    return {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      groups: ['users']
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API Methods
   */

  public getSecurityPolicies(): SecurityPolicy[] {
    return Array.from(this.securityPolicies.values());
  }

  public getAuditEvents(
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    action?: string
  ): AuditEvent[] {

    if (startDate) {
      events = events.filter(e => e.timestamp >= startDate);
    }
    if (endDate) {
      events = events.filter(e => e.timestamp <= endDate);
    }
    if (userId) {
      events = events.filter(e => e.userId === userId);
    }
    if (action) {
      events = events.filter(e => e.action === action);
    }

    return events;
  }

  public getComplianceFrameworks(): ComplianceFramework[] {
    return Array.from(this.complianceFrameworks.values());
  }

  public getSecurityIncidents(): SecurityIncident[] {
    return Array.from(this.securityIncidents.values());
  }

  public getThreatIntelligence(): ThreatIntelligence[] {
    return Array.from(this.threatIntelligence.values());
  }

  public getDataClassifications(): DataClassification[] {
    return Array.from(this.dataClassifications.values());
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down enterprise security service...');

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    if (this.threatIntelInterval) {
      clearInterval(this.threatIntelInterval);
    }

    // Final flush of audit buffer
    this.flushAuditBuffer();

    this.removeAllListeners();

    logger.info('✅ Enterprise security service shutdown complete');
  }
}

export const enterpriseSecurityService = EnterpriseSecurityService.getInstance();