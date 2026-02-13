/**
 * Data Loss Prevention (DLP) Service
 * Prevent data leakage, monitor sensitive data, and enforce data protection policies
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface DLPPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  dataTypes: DataType[];
  conditions: DLPCondition[];
  actions: DLPAction[];
  scope: PolicyScope;
  exceptions: string[];
  schedule?: PolicySchedule;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export enum DataType {
  PII = 'pii',
  CREDIT_CARD = 'credit_card',
  SSN = 'ssn',
  PHONE_NUMBER = 'phone_number',
  EMAIL = 'email',
  IP_ADDRESS = 'ip_address',
  API_KEY = 'api_key',
  PASSWORD = 'password',
  FINANCIAL = 'financial',
  HEALTH_RECORD = 'health_record',
  CONFIDENTIAL = 'confidential',
  CUSTOM = 'custom'
}

export interface DLPCondition {
  type: 'content' | 'context' | 'metadata' | 'user' | 'location';
  operator: 'contains' | 'matches' | 'equals' | 'not_equals' | 'count_gt' | 'count_gte';
  value: unknown;
  caseSensitive: boolean;
  weight: number;
}

export interface DLPAction {
  type: DLPActionType;
  config: Record<string, unknown>;
  enabled: boolean;
}

export enum DLPActionType {
  BLOCK = 'block',
  QUARANTINE = 'quarantine',
  ENCRYPT = 'encrypt',
  REDACT = 'redact',
  ALERT = 'alert',
  LOG = 'log',
  REQUIRE_APPROVAL = 'require_approval',
  WATERMARK = 'watermark'
}

export interface PolicyScope {
  channels: string[];
  users: string[];
  departments: string[];
  applications: string[];
  locations: string[];
  timeZones: string[];
}

export interface PolicySchedule {
  enabled: boolean;
  timezone: string;
  allowedTimes: TimeRange[];
  blockedTimes: TimeRange[];
  weekdays: number[]; // 0-6, Sunday to Saturday
  holidays: Date[];
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface DataMatch {
  id: string;
  dataType: DataType;
  pattern: string;
  confidence: number;
  location: {
    start: number;
    end: number;
    context: string;
  };
  sensitivityLevel: SensitivityLevel;
  metadata: Record<string, unknown>;
}

export enum SensitivityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

export interface DLPIncident {
  id: string;
  timestamp: Date;
  policyId: string;
  policyName: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  dataMatches: DataMatch[];
  source: IncidentSource;
  user: {
    id: string;
    email: string;
    department: string;
    location: string;
  };
  context: {
    application: string;
    channel: string;
    action: string;
    destination?: string;
  };
  actionsApplied: DLPAction[];
  risk: {
    score: number;
    factors: string[];
    classification: 'low' | 'medium' | 'high' | 'critical';
  };
  investigation: {
    assigned: boolean;
    assignee?: string;
    notes: string[];
    resolution?: string;
  };
  metadata: Record<string, unknown>;
}

export enum IncidentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  ACCEPTED_RISK = 'accepted_risk'
}

export interface IncidentSource {
  type: 'email' | 'file_transfer' | 'web_upload' | 'api' | 'database' | 'print' | 'clipboard';
  endpoint: string;
  protocol: string;
  details: Record<string, unknown>;
}

export interface DataClassificationRule {
  id: string;
  name: string;
  description: string;
  dataType: DataType;
  pattern: RegExp | string;
  confidenceThreshold: number;
  sensitivityLevel: SensitivityLevel;
  enabled: boolean;
  customRule: boolean;
  metadata: Record<string, unknown>;
}

export interface QuarantineItem {
  id: string;
  incidentId: string;
  content: string; // Encrypted
  originalSize: number;
  quarantinedAt: Date;
  releaseDate?: Date;
  approved: boolean;
  approver?: string;
  metadata: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: string;
  incidentId: string;
  requestedBy: string;
  requestedAt: Date;
  approvers: string[];
  status: 'pending' | 'approved' | 'rejected';
  justification: string;
  approvedBy?: string;
  approvedAt?: Date;
  comments: string[];
  metadata: Record<string, unknown>;
}

export class DataLossPreventionService extends EventEmitter {
  private policies: Map<string, DLPPolicy> = new Map();
  private classificationRules: Map<string, DataClassificationRule> = new Map();
  private incidents: Map<string, DLPIncident> = new Map();
  private quarantine: Map<string, QuarantineItem> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private encryptionKey: Buffer;
  
  constructor() {
    super();
    this.encryptionKey = crypto.randomBytes(32);
    this.initializeDefaultRules();
    this.initializeDefaultPolicies();
  }
  
  private initializeDefaultRules(): void {
    const defaultRules: Omit<DataClassificationRule, 'id'>[] = [
      {
        name: 'Credit Card Numbers',
        description: 'Detects credit card numbers (Visa, MasterCard, Amex, etc.)',
        dataType: DataType.CREDIT_CARD,
        pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
        confidenceThreshold: 0.9,
        sensitivityLevel: SensitivityLevel.RESTRICTED,
        enabled: true,
        customRule: false,
        metadata: { luhnCheck: true }
      },
      {
        name: 'Social Security Numbers',
        description: 'Detects US Social Security Numbers',
        dataType: DataType.SSN,
        pattern: /\b(?!000|666|9\d{2})\d{3}-?(?!00)\d{2}-?(?!0000)\d{4}\b/g,
        confidenceThreshold: 0.85,
        sensitivityLevel: SensitivityLevel.RESTRICTED,
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'Phone Numbers',
        description: 'Detects phone numbers in various formats',
        dataType: DataType.PHONE_NUMBER,
        pattern: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
        confidenceThreshold: 0.7,
        sensitivityLevel: SensitivityLevel.INTERNAL,
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'Email Addresses',
        description: 'Detects email addresses',
        dataType: DataType.EMAIL,
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        confidenceThreshold: 0.8,
        sensitivityLevel: SensitivityLevel.INTERNAL,
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'IP Addresses',
        description: 'Detects IPv4 addresses',
        dataType: DataType.IP_ADDRESS,
        pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        confidenceThreshold: 0.9,
        sensitivityLevel: SensitivityLevel.CONFIDENTIAL,
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'API Keys',
        description: 'Detects API keys and tokens',
        dataType: DataType.API_KEY,
        pattern: /(?:api[_-]?key|token|secret)["\s:=]+[a-zA-Z0-9_-]{20,}/gi,
        confidenceThreshold: 0.8,
        sensitivityLevel: SensitivityLevel.RESTRICTED,
        enabled: true,
        customRule: false,
        metadata: {}
      },
      {
        name: 'Passwords',
        description: 'Detects password patterns',
        dataType: DataType.PASSWORD,
        pattern: /(?:password|pwd|pass)["\s:=]+[^\s"']{8,}/gi,
        confidenceThreshold: 0.6,
        sensitivityLevel: SensitivityLevel.RESTRICTED,
        enabled: true,
        customRule: false,
        metadata: {}
      }
    ];
    
    for (const ruleData of defaultRules) {
      const rule: DataClassificationRule = {
        ...ruleData,
        id: crypto.randomUUID()
      };
      this.classificationRules.set(rule.id, rule);
    }
  }
  
  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<DLPPolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Block Credit Card Data',
        description: 'Prevent transmission of credit card numbers',
        enabled: true,
        priority: 1,
        dataTypes: [DataType.CREDIT_CARD],
        conditions: [
          {
            type: 'content',
            operator: 'contains',
            value: DataType.CREDIT_CARD,
            caseSensitive: false,
            weight: 1.0
          }
        ],
        actions: [
          {
            type: DLPActionType.BLOCK,
            config: { message: 'Credit card data transmission blocked' },
            enabled: true
          },
          {
            type: DLPActionType.ALERT,
            config: { 
              channels: ['email', 'slack'],
              severity: 'critical'
            },
            enabled: true
          }
        ],
        scope: {
          channels: ['email', 'web', 'api'],
          users: [],
          departments: [],
          applications: [],
          locations: [],
          timeZones: []
        },
        exceptions: ['admin@company.com'],
        metadata: {}
      },
      {
        name: 'Quarantine SSN Data',
        description: 'Quarantine documents containing SSN for review',
        enabled: true,
        priority: 2,
        dataTypes: [DataType.SSN],
        conditions: [
          {
            type: 'content',
            operator: 'contains',
            value: DataType.SSN,
            caseSensitive: false,
            weight: 1.0
          }
        ],
        actions: [
          {
            type: DLPActionType.QUARANTINE,
            config: { 
              duration: 86400000, // 24 hours
              requireApproval: true
            },
            enabled: true
          },
          {
            type: DLPActionType.ALERT,
            config: { 
              channels: ['email'],
              severity: 'high'
            },
            enabled: true
          }
        ],
        scope: {
          channels: ['file_transfer', 'email'],
          users: [],
          departments: [],
          applications: [],
          locations: [],
          timeZones: []
        },
        exceptions: ['hr@company.com'],
        metadata: {}
      },
      {
        name: 'Encrypt API Keys',
        description: 'Automatically encrypt API keys in transit',
        enabled: true,
        priority: 3,
        dataTypes: [DataType.API_KEY],
        conditions: [
          {
            type: 'content',
            operator: 'contains',
            value: DataType.API_KEY,
            caseSensitive: false,
            weight: 1.0
          }
        ],
        actions: [
          {
            type: DLPActionType.ENCRYPT,
            config: { 
              algorithm: 'AES-256-GCM',
              keyRotation: true
            },
            enabled: true
          },
          {
            type: DLPActionType.LOG,
            config: { level: 'warn' },
            enabled: true
          }
        ],
        scope: {
          channels: ['api', 'web'],
          users: [],
          departments: [],
          applications: [],
          locations: [],
          timeZones: []
        },
        exceptions: [],
        metadata: {}
      }
    ];
    
    for (const policyData of defaultPolicies) {
      const policy: DLPPolicy = {
        ...policyData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.policies.set(policy.id, policy);
    }
  }
  
  // Content Analysis
  
  public async analyzeContent(
    content: string,
    context: {
      userId: string;
      userEmail: string;
      department: string;
      application: string;
      channel: string;
      action: string;
      destination?: string;
    }
  ): Promise<{
    violations: DLPIncident[];
    dataMatches: DataMatch[];
    riskScore: number;
    actionsTaken: DLPAction[];
  }> {
    // Classify data in content
    const dataMatches = await this.classifyData(content);
    
    if (dataMatches.length === 0) {
      return {
        violations: [],
        dataMatches: [],
        riskScore: 0,
        actionsTaken: []
      };
    }
    
    // Check policies
    const violations: DLPIncident[] = [];
    const actionsTaken: DLPAction[] = [];
    
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;
      
      const policyViolation = await this.checkPolicyViolation(
        policy,
        dataMatches,
        context
      );
      
      if (policyViolation) {
        violations.push(policyViolation);
        
        // Execute policy actions
        const policyActions = await this.executePolicyActions(
          policy,
          policyViolation,
          content
        );
        actionsTaken.push(...policyActions);
      }
    }
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(dataMatches, context);
    
    return {
      violations,
      dataMatches,
      riskScore,
      actionsTaken
    };
  }
  
  private async classifyData(content: string): Promise<DataMatch[]> {
    const matches: DataMatch[] = [];
    
    for (const rule of this.classificationRules.values()) {
      if (!rule.enabled) continue;
      
      const pattern = typeof rule.pattern === 'string' 
        ? new RegExp(rule.pattern, 'gi')
        : rule.pattern;
      
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const matchedText = match[0];
        let confidence = rule.confidenceThreshold;
        
        // Apply additional validation for specific data types
        if (rule.dataType === DataType.CREDIT_CARD && rule.metadata.luhnCheck) {
          confidence = this.validateCreditCard(matchedText) ? confidence : confidence * 0.5;
        }
        
        if (confidence >= rule.confidenceThreshold) {
          matches.push({
            id: crypto.randomUUID(),
            dataType: rule.dataType,
            pattern: matchedText,
            confidence,
            location: {
              start: match.index,
              end: match.index + matchedText.length,
              context: this.getContext(content, match.index, 50)
            },
            sensitivityLevel: rule.sensitivityLevel,
            metadata: {
              ruleId: rule.id,
              ruleName: rule.name
            }
          });
        }
      }
    }
    
    return matches;
  }
  
  private validateCreditCard(cardNumber: string): boolean {
    // Luhn algorithm validation
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let alternate = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits.charAt(i), 10);
      
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n = (n % 10) + 1;
        }
      }
      
      sum += n;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  }
  
  private getContext(content: string, position: number, radius: number): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(content.length, position + radius);
    return content.substring(start, end);
  }
  
  private async checkPolicyViolation(
    policy: DLPPolicy,
    dataMatches: DataMatch[],
    context: unknown
  ): Promise<DLPIncident | null> {
    // Check if policy applies to current context
    if (!this.policyApplies(policy, context)) {
      return null;
    }
    
    // Check if data types match
    const relevantMatches = dataMatches.filter(match => 
      policy.dataTypes.includes(match.dataType)
    );
    
    if (relevantMatches.length === 0) {
      return null;
    }
    
    // Evaluate policy conditions
    let conditionScore = 0;
    for (const condition of policy.conditions) {
      if (this.evaluateCondition(condition, relevantMatches, context)) {
        conditionScore += condition.weight;
      }
    }
    
    const normalizedScore = conditionScore / policy.conditions.length;
    
    if (normalizedScore < 0.5) {
      return null; // Policy threshold not met
    }
    
    // Create incident
    const incident: DLPIncident = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      policyId: policy.id,
      policyName: policy.name,
      severity: this.calculateIncidentSeverity(relevantMatches, normalizedScore),
      status: IncidentStatus.OPEN,
      dataMatches: relevantMatches,
      source: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: context.channel as any, // DLP source type conversion
        endpoint: context.destination || 'unknown',
        protocol: 'https',
        details: context
      },
      user: {
        id: context.userId,
        email: context.userEmail,
        department: context.department,
        location: 'unknown'
      },
      context: {
        application: context.application,
        channel: context.channel,
        action: context.action,
        destination: context.destination
      },
      actionsApplied: [],
      risk: {
        score: normalizedScore * 100,
        factors: this.identifyRiskFactors(relevantMatches, context),
        classification: this.classifyRisk(normalizedScore)
      },
      investigation: {
        assigned: false,
        notes: [],
      },
      metadata: {}
    };
    
    this.incidents.set(incident.id, incident);
    
    this.emit('policyViolation', incident);
    
    return incident;
  }
  
  private policyApplies(policy: DLPPolicy, context: unknown): boolean {
    const scope = policy.scope;
    
    // Check channels
    if (scope.channels.length > 0 && !scope.channels.includes(context.channel)) {
      return false;
    }
    
    // Check users
    if (scope.users.length > 0 && !scope.users.includes(context.userId)) {
      return false;
    }
    
    // Check departments  
    if (scope.departments.length > 0 && !scope.departments.includes(context.department)) {
      return false;
    }
    
    // Check exceptions
    if (policy.exceptions.includes(context.userEmail)) {
      return false;
    }
    
    // Check schedule if defined
    if (policy.schedule && !this.isWithinSchedule(policy.schedule)) {
      return false;
    }
    
    return true;
  }
  
  private isWithinSchedule(schedule: PolicySchedule): boolean {
    if (!schedule.enabled) return true;
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Check weekdays
    if (schedule.weekdays.length > 0 && !schedule.weekdays.includes(dayOfWeek)) {
      return false;
    }
    
    // Check blocked times
    for (const blockedTime of schedule.blockedTimes) {
      if (this.isTimeInRange(timeStr, blockedTime)) {
        return false;
      }
    }
    
    // Check allowed times
    if (schedule.allowedTimes.length > 0) {
      let inAllowedTime = false;
      for (const allowedTime of schedule.allowedTimes) {
        if (this.isTimeInRange(timeStr, allowedTime)) {
          inAllowedTime = true;
          break;
        }
      }
      if (!inAllowedTime) {
        return false;
      }
    }
    
    return true;
  }
  
  private isTimeInRange(time: string, range: TimeRange): boolean {
    return time >= range.start && time <= range.end;
  }
  
  private evaluateCondition(
    condition: DLPCondition,
    dataMatches: DataMatch[],
    context: unknown
  ): boolean {
    switch (condition.type) {
      case 'content':
        return dataMatches.some(match => 
          condition.operator === 'contains' && 
          match.dataType === condition.value
        );
      
      case 'context': {
        const contextValue = this.getNestedValue(context, condition.value);
        return this.compareValues(contextValue, condition.operator, condition.value);
      }
      
      case 'metadata':
        return dataMatches.some(match => 
          match.metadata[condition.value] !== undefined
        );
      
      case 'user':
        return this.compareValues(context.userId, condition.operator, condition.value);
      
      case 'location':
        return this.compareValues(context.location, condition.operator, condition.value);
      
      default:
        return false;
    }
  }
  
  private compareValues(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return typeof actual === 'string' && actual.includes(expected);
      case 'matches':
        return expected.test && expected.test(actual);
      case 'count_gt':
        return Array.isArray(actual) && actual.length > expected;
      case 'count_gte':
        return Array.isArray(actual) && actual.length >= expected;
      default:
        return false;
    }
  }
  
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private calculateIncidentSeverity(
    dataMatches: DataMatch[],
    policyScore: number
  ): IncidentSeverity {
    const maxSensitivity = dataMatches.reduce((max, match) => {
      const sensitivityScore = this.getSensitivityScore(match.sensitivityLevel);
      return Math.max(max, sensitivityScore);
    }, 0);
    
    const combinedScore = (policyScore + maxSensitivity / 5) / 2;
    
    if (combinedScore >= 0.9) return IncidentSeverity.CRITICAL;
    if (combinedScore >= 0.7) return IncidentSeverity.HIGH;
    if (combinedScore >= 0.5) return IncidentSeverity.MEDIUM;
    if (combinedScore >= 0.3) return IncidentSeverity.LOW;
    return IncidentSeverity.INFO;
  }
  
  private getSensitivityScore(level: SensitivityLevel): number {
    const scores = {
      [SensitivityLevel.PUBLIC]: 1,
      [SensitivityLevel.INTERNAL]: 2,
      [SensitivityLevel.CONFIDENTIAL]: 3,
      [SensitivityLevel.RESTRICTED]: 4,
      [SensitivityLevel.TOP_SECRET]: 5
    };
    return scores[level] || 1;
  }
  
  private calculateRiskScore(dataMatches: DataMatch[], context: unknown): number {
    let riskScore = 0;
    
    // Base risk from data sensitivity
    for (const match of dataMatches) {
      riskScore += this.getSensitivityScore(match.sensitivityLevel) * match.confidence;
    }
    
    // Context-based risk factors
    if (context.destination && !context.destination.includes('company.com')) {
      riskScore += 2; // External destination
    }
    
    if (context.channel === 'email') {
      riskScore += 1; // Email transmission
    }
    
    if (context.action === 'download' || context.action === 'export') {
      riskScore += 1.5; // Data extraction
    }
    
    return Math.min(riskScore * 10, 100); // Normalize to 0-100
  }
  
  private identifyRiskFactors(dataMatches: DataMatch[], context: unknown): string[] {
    const factors: string[] = [];
    
    const sensitiveDataTypes = dataMatches.filter(m => 
      m.sensitivityLevel === SensitivityLevel.RESTRICTED ||
      m.sensitivityLevel === SensitivityLevel.TOP_SECRET
    );
    
    if (sensitiveDataTypes.length > 0) {
      factors.push('Contains highly sensitive data');
    }
    
    if (dataMatches.length > 5) {
      factors.push('Multiple data elements detected');
    }
    
    if (context.destination && !context.destination.includes('company.com')) {
      factors.push('External destination');
    }
    
    if (context.action === 'bulk_download' || context.action === 'export') {
      factors.push('Data extraction activity');
    }
    
    return factors;
  }
  
  private classifyRisk(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }
  
  // Policy Actions
  
  private async executePolicyActions(
    policy: DLPPolicy,
    incident: DLPIncident,
    content: string
  ): Promise<DLPAction[]> {
    const executedActions: DLPAction[] = [];
    
    for (const action of policy.actions) {
      if (!action.enabled) continue;
      
      try {
        await this.executeAction(action, incident, content);
        executedActions.push(action);
      } catch (error) {
        console.error(`Error executing DLP action ${action.type}:`, error);
      }
    }
    
    incident.actionsApplied = executedActions;
    
    return executedActions;
  }
  
  private async executeAction(
    action: DLPAction,
    incident: DLPIncident,
    content: string
  ): Promise<void> {
    switch (action.type) {
      case DLPActionType.BLOCK:
        this.emit('contentBlocked', {
          incidentId: incident.id,
          message: action.config.message || 'Content blocked by DLP policy',
          user: incident.user
        });
        break;
      
      case DLPActionType.QUARANTINE:
        await this.quarantineContent(incident, content, action.config);
        break;
      
      case DLPActionType.ENCRYPT:
        await this.encryptContent(incident, content, action.config);
        break;
      
      case DLPActionType.REDACT:
        await this.redactContent(incident, content, action.config);
        break;
      
      case DLPActionType.ALERT:
        this.sendAlert(incident, action.config);
        break;
      
      case DLPActionType.LOG:
        this.logIncident(incident, action.config);
        break;
      
      case DLPActionType.REQUIRE_APPROVAL:
        await this.requireApproval(incident, action.config);
        break;
      
      case DLPActionType.WATERMARK:
        await this.applyWatermark(incident, content, action.config);
        break;
    }
  }
  
  private async quarantineContent(
    incident: DLPIncident,
    content: string,
    config: unknown
  ): Promise<void> {
    // Encrypt content for quarantine
    const encryptedContent = this.encryptForQuarantine(content);
    
    const quarantineItem: QuarantineItem = {
      id: crypto.randomUUID(),
      incidentId: incident.id,
      content: encryptedContent,
      originalSize: content.length,
      quarantinedAt: new Date(),
      releaseDate: config.duration ? new Date(Date.now() + config.duration) : undefined,
      approved: false,
      metadata: config
    };
    
    this.quarantine.set(quarantineItem.id, quarantineItem);
    
    if (config.requireApproval) {
      await this.createApprovalRequest(incident, 'Content quarantined - approval required for release');
    }
    
    this.emit('contentQuarantined', {
      quarantineId: quarantineItem.id,
      incidentId: incident.id
    });
  }
  
  private encryptForQuarantine(content: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    });
  }
  
  private decryptFromQuarantine(encryptedData: string): string {
    const data = JSON.parse(encryptedData);
    const _iv = Buffer.from(data.iv, 'base64'); // eslint-disable-line @typescript-eslint/no-unused-vars
    const authTag = Buffer.from(data.authTag, 'base64');
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  private async encryptContent(
    incident: DLPIncident,
    content: string,
    config: unknown
  ): Promise<void> {
    // In practice, would apply encryption to the content
    this.emit('contentEncrypted', {
      incidentId: incident.id,
      algorithm: config.algorithm || 'AES-256-GCM'
    });
  }
  
  private async redactContent(
    incident: DLPIncident,
    content: string,
    config: unknown
  ): Promise<void> {
    // Apply redaction to sensitive data
    let redactedContent = content;
    
    for (const match of incident.dataMatches) {
      const redactionChar = config.redactionChar || '*';
      const redactedValue = redactionChar.repeat(match.pattern.length);
      redactedContent = redactedContent.replace(match.pattern, redactedValue);
    }
    
    this.emit('contentRedacted', {
      incidentId: incident.id,
      redactedElements: incident.dataMatches.length
    });
  }
  
  private sendAlert(incident: DLPIncident, config: unknown): void {
    const alert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      incidentId: incident.id,
      severity: config.severity || incident.severity,
      message: `DLP Policy Violation: ${incident.policyName}`,
      details: {
        user: incident.user.email,
        dataTypes: incident.dataMatches.map(m => m.dataType),
        riskScore: incident.risk.score
      },
      channels: config.channels || ['log']
    };
    
    this.emit('dlpAlert', alert);
  }
  
  private logIncident(incident: DLPIncident, config: unknown): void {
    const logLevel = config.level || 'info';
    console.log(`DLP Incident [${logLevel.toUpperCase()}]:`, {
      incidentId: incident.id,
      policy: incident.policyName,
      user: incident.user.email,
      dataTypes: incident.dataMatches.map(m => m.dataType),
      riskScore: incident.risk.score
    });
  }
  
  private async requireApproval(incident: DLPIncident, config: unknown): Promise<void> {
    await this.createApprovalRequest(incident, config.justification || 'DLP policy requires approval');
  }
  
  private async createApprovalRequest(
    incident: DLPIncident,
    justification: string
  ): Promise<void> {
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      incidentId: incident.id,
      requestedBy: incident.user.id,
      requestedAt: new Date(),
      approvers: ['admin@company.com'], // Would be configured
      status: 'pending',
      justification,
      comments: [],
      metadata: {}
    };
    
    this.approvalRequests.set(request.id, request);
    
    this.emit('approvalRequired', {
      requestId: request.id,
      incidentId: incident.id,
      approvers: request.approvers
    });
  }
  
  private async applyWatermark(
    incident: DLPIncident,
    content: string,
    config: unknown
  ): Promise<void> {
    // Apply digital watermark to content
    this.emit('watermarkApplied', {
      incidentId: incident.id,
      watermarkType: config.type || 'text'
    });
  }
  
  // Management APIs
  
  public createPolicy(policyData: Omit<DLPPolicy, 'id' | 'createdAt' | 'updatedAt'>): DLPPolicy {
    const policy: DLPPolicy = {
      ...policyData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.policies.set(policy.id, policy);
    
    this.emit('policyCreated', { policyId: policy.id, name: policy.name });
    
    return policy;
  }
  
  public updatePolicy(
    policyId: string,
    updates: Partial<Omit<DLPPolicy, 'id' | 'createdAt' | 'updatedAt'>>
  ): DLPPolicy {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error('Policy not found');
    }
    
    Object.assign(policy, updates, { updatedAt: new Date() });
    
    this.emit('policyUpdated', { policyId, updates });
    
    return policy;
  }
  
  public deletePolicy(policyId: string): boolean {
    const deleted = this.policies.delete(policyId);
    
    if (deleted) {
      this.emit('policyDeleted', { policyId });
    }
    
    return deleted;
  }
  
  public getPolicy(policyId: string): DLPPolicy | undefined {
    return this.policies.get(policyId);
  }
  
  public getAllPolicies(): DLPPolicy[] {
    return Array.from(this.policies.values());
  }
  
  // Incident Management
  
  public getIncident(incidentId: string): DLPIncident | undefined {
    return this.incidents.get(incidentId);
  }
  
  public getAllIncidents(filter?: {
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    limit?: number;
  }): DLPIncident[] {
    let incidents = Array.from(this.incidents.values());
    
    if (filter) {
      if (filter.severity) {
        incidents = incidents.filter(i => i.severity === filter.severity);
      }
      if (filter.status) {
        incidents = incidents.filter(i => i.status === filter.status);
      }
      if (filter.startDate) {
        incidents = incidents.filter(i => i.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        incidents = incidents.filter(i => i.timestamp <= filter.endDate!);
      }
      if (filter.userId) {
        incidents = incidents.filter(i => i.user.id === filter.userId);
      }
    }
    
    incidents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (filter?.limit) {
      incidents = incidents.slice(0, filter.limit);
    }
    
    return incidents;
  }
  
  public updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    resolution?: string
  ): DLPIncident {
    const incident = this.incidents.get(incidentId);
    
    if (!incident) {
      throw new Error('Incident not found');
    }
    
    incident.status = status;
    if (resolution) {
      incident.investigation.resolution = resolution;
    }
    
    this.emit('incidentStatusUpdated', { incidentId, status });
    
    return incident;
  }
  
  // Approval Management
  
  public approveRequest(requestId: string, approverId: string, comments?: string): ApprovalRequest {
    const request = this.approvalRequests.get(requestId);
    
    if (!request) {
      throw new Error('Approval request not found');
    }
    
    if (!request.approvers.includes(approverId)) {
      throw new Error('User not authorized to approve this request');
    }
    
    request.status = 'approved';
    request.approvedBy = approverId;
    request.approvedAt = new Date();
    
    if (comments) {
      request.comments.push(comments);
    }
    
    // Release quarantined content if applicable
    const quarantineItems = Array.from(this.quarantine.values())
      .filter(item => item.incidentId === request.incidentId);
    
    for (const item of quarantineItems) {
      item.approved = true;
      item.approver = approverId;
    }
    
    this.emit('requestApproved', { requestId, approverId });
    
    return request;
  }
  
  public rejectRequest(requestId: string, approverId: string, comments: string): ApprovalRequest {
    const request = this.approvalRequests.get(requestId);
    
    if (!request) {
      throw new Error('Approval request not found');
    }
    
    if (!request.approvers.includes(approverId)) {
      throw new Error('User not authorized to reject this request');
    }
    
    request.status = 'rejected';
    request.comments.push(comments);
    
    this.emit('requestRejected', { requestId, approverId });
    
    return request;
  }
  
  // Statistics and Reporting
  
  public getStats(): {
    totalPolicies: number;
    activePolicies: number;
    totalIncidents: number;
    openIncidents: number;
    incidentsBySeverity: Record<IncidentSeverity, number>;
    violationsByDataType: Record<DataType, number>;
    quarantinedItems: number;
    pendingApprovals: number;
  } {
    const policies = Array.from(this.policies.values());
    const incidents = Array.from(this.incidents.values());
    const approvals = Array.from(this.approvalRequests.values());
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any  
    const incidentsBySeverity: Record<IncidentSeverity, number> = {} as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const violationsByDataType: Record<DataType, number> = {} as any;
    
    // Initialize counters
    Object.values(IncidentSeverity).forEach(severity => {
      incidentsBySeverity[severity] = 0;
    });
    Object.values(DataType).forEach(dataType => {
      violationsByDataType[dataType] = 0;
    });
    
    // Count incidents
    for (const incident of incidents) {
      incidentsBySeverity[incident.severity]++;
      
      for (const match of incident.dataMatches) {
        violationsByDataType[match.dataType]++;
      }
    }
    
    return {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.enabled).length,
      totalIncidents: incidents.length,
      openIncidents: incidents.filter(i => i.status === IncidentStatus.OPEN).length,
      incidentsBySeverity,
      violationsByDataType,
      quarantinedItems: this.quarantine.size,
      pendingApprovals: approvals.filter(a => a.status === 'pending').length
    };
  }
  
  // Cleanup
  
  public cleanup(retentionDays: number = 90): number {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    // Clean up old incidents
    for (const [incidentId, incident] of this.incidents.entries()) {
      if (incident.timestamp < cutoffDate && incident.status === IncidentStatus.RESOLVED) {
        this.incidents.delete(incidentId);
        deletedCount++;
      }
    }
    
    // Clean up old quarantine items
    for (const [itemId, item] of this.quarantine.entries()) {
      if (item.quarantinedAt < cutoffDate && item.approved) {
        this.quarantine.delete(itemId);
      }
    }
    
    // Clean up old approval requests
    for (const [requestId, request] of this.approvalRequests.entries()) {
      if (request.requestedAt < cutoffDate && request.status !== 'pending') {
        this.approvalRequests.delete(requestId);
      }
    }
    
    this.emit('cleanupCompleted', { deletedIncidents: deletedCount });
    
    return deletedCount;
  }
  
  public destroy(): void {
    this.policies.clear();
    this.classificationRules.clear();
    this.incidents.clear();
    this.quarantine.clear();
    this.approvalRequests.clear();
    
    this.emit('serviceDestroyed');
  }
}