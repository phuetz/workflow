/**
 * Autonomous Decision Engine
 *
 * Real-time threat assessment and automated decision making for security events.
 * Provides confidence-based action selection with human-in-the-loop escalation.
 *
 * @module AutonomousDecisionEngine
 */

/**
 * Threat severity levels
 */
export enum ThreatSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

/**
 * Decision types
 */
export enum DecisionType {
  IMMEDIATE = 'IMMEDIATE', // Auto-execute
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED', // Needs human approval
  ADVISORY = 'ADVISORY', // Recommendation only
  ESCALATION = 'ESCALATION', // Escalate to analysts
}

/**
 * Autonomous action types
 */
export enum ActionType {
  BLOCK_IP = 'BLOCK_IP',
  RATE_LIMIT = 'RATE_LIMIT',
  QUARANTINE = 'QUARANTINE',
  LOCK_ACCOUNT = 'LOCK_ACCOUNT',
  ISOLATE_SYSTEM = 'ISOLATE_SYSTEM',
  REVOKE_SESSION = 'REVOKE_SESSION',
  REVOKE_TOKEN = 'REVOKE_TOKEN',
  RESET_MFA = 'RESET_MFA',
  REQUIRE_REAUTH = 'REQUIRE_REAUTH',
  DISABLE_API_KEY = 'DISABLE_API_KEY',
  SUSPEND_WORKFLOW = 'SUSPEND_WORKFLOW',
  PAUSE_EXECUTION = 'PAUSE_EXECUTION',
  SNAPSHOT_DATA = 'SNAPSHOT_DATA',
  ENABLE_MONITORING = 'ENABLE_MONITORING',
  ROTATE_CREDENTIALS = 'ROTATE_CREDENTIALS',
  BACKUP_DATA = 'BACKUP_DATA',
  RESTRICT_PERMISSIONS = 'RESTRICT_PERMISSIONS',
  REQUIRE_2FA = 'REQUIRE_2FA',
  NOTIFY_ADMINS = 'NOTIFY_ADMINS',
  LOG_EVENT = 'LOG_EVENT',
}

/**
 * Policy priority levels
 */
export enum PolicyPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
}

/**
 * Threat context information
 */
export interface ThreatContext {
  threatId: string;
  timestamp: number;
  severity: ThreatSeverity;
  category: string;
  source: string;
  targetId: string;
  targetType: string;
  description: string;
  indicators: Record<string, unknown>;
  historicalData?: {
    previousIncidents: number;
    lastIncidentTime?: number;
    falsePositiveRate: number;
  };
  businessContext?: {
    isBusinessHours: boolean;
    isCriticalSystem: boolean;
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  };
}

/**
 * Decision result
 */
export interface Decision {
  decisionId: string;
  threatId: string;
  type: DecisionType;
  severity: ThreatSeverity;
  recommendedActions: ActionInfo[];
  confidence: number;
  reasoning: string;
  falsePositiveProbability: number;
  impactAssessment: {
    businessImpact: string;
    userImpact: string;
    systemImpact: string;
  };
  appliedPolicy?: string;
  timestamp: number;
  executedActions?: ExecutedAction[];
  escalationPath?: string[];
  humanReview?: {
    required: boolean;
    reviewedBy?: string;
    approved?: boolean;
    comments?: string;
  };
}

/**
 * Action information
 */
export interface ActionInfo {
  actionType: ActionType;
  priority: number;
  description: string;
  prerequisites: ActionType[];
  rollbackable: boolean;
  estimatedImpact: string;
}

/**
 * Executed action tracking
 */
export interface ExecutedAction {
  actionType: ActionType;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  executedAt?: number;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Security policy definition
 */
export interface SecurityPolicy {
  policyId: string;
  name: string;
  description: string;
  priority: PolicyPriority;
  enabled: boolean;
  conditions: PolicyCondition[];
  actions: ActionType[];
  requiresApproval: boolean;
  exceptions: PolicyException[];
  schedule?: PolicySchedule;
  roleBasedRules?: Record<string, boolean>;
}

/**
 * Policy condition
 */
export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'regex';
  value: unknown;
}

/**
 * Policy exception
 */
export interface PolicyException {
  type: 'user' | 'system' | 'ip' | 'time_window';
  value: string;
  expiresAt?: number;
}

/**
 * Policy schedule
 */
export interface PolicySchedule {
  businessHoursOnly: boolean;
  timezone?: string;
  daysOfWeek?: number[];
  blackoutPeriods?: Array<{ start: number; end: number }>;
}

/**
 * Decision audit record
 */
export interface AuditRecord {
  decisionId: string;
  threatId: string;
  timestamp: number;
  decision: DecisionType;
  actions: ActionType[];
  confidence: number;
  analyst?: {
    userId: string;
    action: 'approved' | 'rejected' | 'modified';
    approved: boolean;
    timestamp: number;
    feedback: string;
  };
  outcome: {
    correctDecision: boolean;
    falsePositive: boolean;
    delayedDetection: boolean;
    actualSeverity: ThreatSeverity;
  };
}

/**
 * Autonomous Decision Engine
 *
 * Performs real-time threat assessment and makes automated security decisions.
 * Integrates with human analysts for approval and learning.
 */
export class AutonomousDecisionEngine {
  private policies: Map<string, SecurityPolicy> = new Map();
  private decisions: Map<string, Decision> = new Map();
  private auditLog: AuditRecord[] = [];
  private actionStats: Map<ActionType, { count: number; failures: number; lastExecution: number }> = new Map();
  private decisionStats: Map<DecisionType, { count: number; accuracy: number }> = new Map();
  private threatContexts: Map<string, ThreatContext> = new Map(); // Store threat contexts for audit

  // Guardrails
  private readonly MAX_ACTIONS_PER_HOUR = 100;
  private readonly MAX_AUTO_EXECUTE_SEVERITY = ThreatSeverity.HIGH;
  private readonly AUTO_ESCALATION_CONFIDENCE_THRESHOLD = 40; // Below 40% confidence
  private readonly BUSINESS_CRITICAL_SYSTEMS = new Set<string>();
  private readonly ACTION_RATE_LIMITS = new Map<ActionType, { maxPerHour: number; maxPerDay: number }>();

  constructor() {
    this.initializeActionRateLimits();
  }

  /**
   * Initialize action rate limits
   */
  private initializeActionRateLimits(): void {
    const limits: Record<ActionType, { maxPerHour: number; maxPerDay: number }> = {
      [ActionType.BLOCK_IP]: { maxPerHour: 50, maxPerDay: 200 },
      [ActionType.RATE_LIMIT]: { maxPerHour: 100, maxPerDay: 500 },
      [ActionType.QUARANTINE]: { maxPerHour: 20, maxPerDay: 100 },
      [ActionType.LOCK_ACCOUNT]: { maxPerHour: 10, maxPerDay: 50 },
      [ActionType.ISOLATE_SYSTEM]: { maxPerHour: 5, maxPerDay: 20 },
      [ActionType.REVOKE_SESSION]: { maxPerHour: 50, maxPerDay: 200 },
      [ActionType.REVOKE_TOKEN]: { maxPerHour: 50, maxPerDay: 200 },
      [ActionType.RESET_MFA]: { maxPerHour: 10, maxPerDay: 50 },
      [ActionType.REQUIRE_REAUTH]: { maxPerHour: 30, maxPerDay: 150 },
      [ActionType.DISABLE_API_KEY]: { maxPerHour: 20, maxPerDay: 100 },
      [ActionType.SUSPEND_WORKFLOW]: { maxPerHour: 15, maxPerDay: 75 },
      [ActionType.PAUSE_EXECUTION]: { maxPerHour: 30, maxPerDay: 150 },
      [ActionType.SNAPSHOT_DATA]: { maxPerHour: 50, maxPerDay: 200 },
      [ActionType.ENABLE_MONITORING]: { maxPerHour: 50, maxPerDay: 200 },
      [ActionType.ROTATE_CREDENTIALS]: { maxPerHour: 10, maxPerDay: 50 },
      [ActionType.BACKUP_DATA]: { maxPerHour: 20, maxPerDay: 100 },
      [ActionType.RESTRICT_PERMISSIONS]: { maxPerHour: 15, maxPerDay: 75 },
      [ActionType.REQUIRE_2FA]: { maxPerHour: 10, maxPerDay: 50 },
      [ActionType.NOTIFY_ADMINS]: { maxPerHour: 100, maxPerDay: 500 },
      [ActionType.LOG_EVENT]: { maxPerHour: 500, maxPerDay: 5000 },
    };

    for (const [actionType, limit] of Object.entries(limits)) {
      this.ACTION_RATE_LIMITS.set(actionType as ActionType, limit);
    }
  }

  /**
   * Add a security policy
   *
   * @param policy The security policy to add
   */
  public addPolicy(policy: SecurityPolicy): void {
    this.policies.set(policy.policyId, policy);
  }

  /**
   * Remove a security policy
   *
   * @param policyId The policy ID to remove
   */
  public removePolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  /**
   * Mark a system as business-critical
   *
   * @param systemId The system ID
   */
  public markBusinessCritical(systemId: string): void {
    this.BUSINESS_CRITICAL_SYSTEMS.add(systemId);
  }

  /**
   * Assess a security threat and make a decision
   *
   * @param context The threat context
   * @returns The decision
   */
  public assessThreat(context: ThreatContext): Decision {
    const decisionId = `dec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = Date.now();

    // Calculate threat confidence
    const confidence = this.calculateConfidence(context);

    // Calculate false positive probability
    const falsePositiveProbability = this.calculateFalsePositiveProbability(context);

    // Determine decision type
    const decisionType = this.determineDecisionType(context, confidence);

    // Find applicable policies
    const applicablePolicies = this.findApplicablePolicies(context);

    // Recommend actions
    const recommendedActions = this.recommendActions(context, applicablePolicies, decisionType);

    // Impact assessment
    const impactAssessment = this.assessImpact(context, recommendedActions);

    // Escalation path
    const escalationPath = this.determineEscalationPath(context, decisionType);

    const decision: Decision = {
      decisionId,
      threatId: context.threatId,
      type: decisionType,
      severity: context.severity,
      recommendedActions,
      confidence,
      reasoning: this.generateReasoning(context, confidence, decisionType),
      falsePositiveProbability,
      impactAssessment,
      appliedPolicy: applicablePolicies[0]?.policyId,
      timestamp,
      escalationPath,
      humanReview: {
        required:
          decisionType === DecisionType.APPROVAL_REQUIRED ||
          decisionType === DecisionType.ESCALATION,
        approved: undefined,
      },
    };

    // Store threat context for later audit retrieval
    this.threatContexts.set(context.threatId, context);
    this.decisions.set(decisionId, decision);
    return decision;
  }

  /**
   * Calculate threat confidence
   *
   * @param context The threat context
   * @returns Confidence score 0-100
   */
  private calculateConfidence(context: ThreatContext): number {
    let confidence = 50; // Base confidence

    // Adjust based on threat severity
    switch (context.severity) {
      case ThreatSeverity.CRITICAL:
        confidence += 30;
        break;
      case ThreatSeverity.HIGH:
        confidence += 20;
        break;
      case ThreatSeverity.MEDIUM:
        confidence += 10;
        break;
      case ThreatSeverity.LOW:
        confidence += 5;
        break;
    }

    // Adjust based on historical data
    if (context.historicalData) {
      if (context.historicalData.previousIncidents > 0) {
        confidence += Math.min(context.historicalData.previousIncidents * 5, 15);
      }

      // Reduce confidence if high false positive rate
      if (context.historicalData.falsePositiveRate > 0.3) {
        confidence -= 20;
      }
    }

    // Adjust based on business context
    if (context.businessContext?.isCriticalSystem) {
      confidence += 10; // Higher confidence for critical systems
    }

    return Math.min(Math.max(confidence, 0), 100);
  }

  /**
   * Calculate false positive probability
   *
   * @param context The threat context
   * @returns Probability 0-100
   */
  private calculateFalsePositiveProbability(context: ThreatContext): number {
    let probability = 20; // Base probability

    // Reduce for high severity
    if (context.severity === ThreatSeverity.CRITICAL) {
      probability -= 15;
    } else if (context.severity === ThreatSeverity.HIGH) {
      probability -= 10;
    }

    // Increase for low severity
    if (context.severity === ThreatSeverity.LOW) {
      probability += 20;
    } else if (context.severity === ThreatSeverity.INFO) {
      probability += 30;
    }

    // Use historical false positive rate
    if (context.historicalData?.falsePositiveRate) {
      probability = context.historicalData.falsePositiveRate * 100;
    }

    return Math.min(Math.max(probability, 0), 100);
  }

  /**
   * Determine decision type
   *
   * @param context The threat context
   * @param confidence The confidence score
   * @returns The decision type
   */
  private determineDecisionType(context: ThreatContext, confidence: number): DecisionType {
    const isCriticalSystem = context.businessContext?.isCriticalSystem || false;
    const isBusinessHours = context.businessContext?.isBusinessHours ?? true;

    // Escalate if confidence is too low
    if (confidence < this.AUTO_ESCALATION_CONFIDENCE_THRESHOLD) {
      return DecisionType.ESCALATION;
    }

    // Immediate action for critical severity threats with high confidence
    // Critical severity threats should get IMMEDIATE response regardless of system criticality
    if (context.severity === ThreatSeverity.CRITICAL && confidence >= 80) {
      return DecisionType.IMMEDIATE;
    }

    // For business-critical systems with high severity, escalate for review
    if (isCriticalSystem && context.severity === ThreatSeverity.HIGH) {
      return DecisionType.ESCALATION;
    }

    // Approval required for high severity or off-hours
    if (context.severity === ThreatSeverity.HIGH || !isBusinessHours) {
      return DecisionType.APPROVAL_REQUIRED;
    }

    // Medium severity = advisory
    if (context.severity === ThreatSeverity.MEDIUM) {
      return DecisionType.ADVISORY;
    }

    // Default to escalation
    return DecisionType.ESCALATION;
  }

  /**
   * Find applicable policies
   *
   * @param context The threat context
   * @returns List of applicable policies
   */
  private findApplicablePolicies(context: ThreatContext): SecurityPolicy[] {
    const applicable: SecurityPolicy[] = [];

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      // Check if policy conditions match
      const conditionsMatch = policy.conditions.every((condition) =>
        this.evaluateCondition(condition, context),
      );

      if (!conditionsMatch) continue;

      // Check if there are exceptions
      if (policy.exceptions.some((exception) => this.matchesException(exception, context)))
        continue;

      // Check schedule
      if (
        policy.schedule &&
        !this.isWithinSchedule(policy.schedule, context.businessContext?.isBusinessHours ?? true)
      ) {
        continue;
      }

      applicable.push(policy);
    }

    // Sort by priority
    applicable.sort((a, b) => a.priority - b.priority);

    return applicable;
  }

  /**
   * Evaluate a policy condition
   *
   * @param condition The policy condition
   * @param context The threat context
   * @returns Whether the condition matches
   */
  private evaluateCondition(condition: PolicyCondition, context: ThreatContext): boolean {
    const contextRecord = context as unknown as Record<string, unknown>;
    const fieldValue = contextRecord[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(String(condition.value));
      case 'greater_than':
        return (fieldValue as number) > (condition.value as number);
      case 'less_than':
        return (fieldValue as number) < (condition.value as number);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'regex':
        return new RegExp(String(condition.value)).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Check if exception matches
   *
   * @param exception The policy exception
   * @param context The threat context
   * @returns Whether the exception matches
   */
  private matchesException(exception: PolicyException, context: ThreatContext): boolean {
    if (exception.expiresAt && exception.expiresAt < Date.now()) {
      return false;
    }

    switch (exception.type) {
      case 'user':
        return context.targetId === exception.value;
      case 'system':
        return context.targetType === exception.value;
      case 'ip':
        return context.source === exception.value;
      case 'time_window':
        // Simplified - would need more context
        return false;
      default:
        return false;
    }
  }

  /**
   * Check if within schedule
   *
   * @param schedule The policy schedule
   * @param isBusinessHours Whether it's business hours
   * @returns Whether within schedule
   */
  private isWithinSchedule(schedule: PolicySchedule, isBusinessHours: boolean): boolean {
    if (schedule.businessHoursOnly && !isBusinessHours) {
      return false;
    }

    // Blackout periods check (simplified)
    if (schedule.blackoutPeriods) {
      const now = Date.now();
      for (const period of schedule.blackoutPeriods) {
        if (now >= period.start && now <= period.end) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Recommend actions
   *
   * @param context The threat context
   * @param policies The applicable policies
   * @param decisionType The decision type
   * @returns List of recommended actions
   */
  private recommendActions(
    context: ThreatContext,
    policies: SecurityPolicy[],
    decisionType: DecisionType,
  ): ActionInfo[] {
    const actionSet = new Set<ActionType>();

    // Collect actions from policies
    for (const policy of policies) {
      for (const action of policy.actions) {
        actionSet.add(action);
      }
    }

    // Add context-specific actions
    if (context.severity === ThreatSeverity.CRITICAL) {
      actionSet.add(ActionType.ISOLATE_SYSTEM);
      actionSet.add(ActionType.SNAPSHOT_DATA);
      actionSet.add(ActionType.ENABLE_MONITORING);
      actionSet.add(ActionType.NOTIFY_ADMINS);
    }

    if (context.category.includes('credential')) {
      actionSet.add(ActionType.ROTATE_CREDENTIALS);
      actionSet.add(ActionType.REVOKE_TOKEN);
      actionSet.add(ActionType.LOCK_ACCOUNT);
    }

    if (context.category.includes('injection') || context.category.includes('exploit')) {
      actionSet.add(ActionType.QUARANTINE);
      actionSet.add(ActionType.REQUIRE_REAUTH);
    }

    // Add authentication-related actions for brute force and auth threats
    if (
      context.category.includes('brute_force') ||
      context.category.includes('authentication') ||
      context.category === 'unauthorized_access' ||
      context.targetType === 'account'
    ) {
      actionSet.add(ActionType.LOCK_ACCOUNT);
      actionSet.add(ActionType.REQUIRE_REAUTH);
    }

    // Add account lockdown for account compromise
    if (context.category.includes('account_compromise') || context.category.includes('compromise')) {
      actionSet.add(ActionType.LOCK_ACCOUNT);
    }

    // Add DDoS-related actions
    if (context.category.includes('ddos') || context.category.includes('denial')) {
      actionSet.add(ActionType.BLOCK_IP);
      actionSet.add(ActionType.RATE_LIMIT);
      actionSet.add(ActionType.ENABLE_MONITORING);
    }

    // For HIGH severity threats, always add monitoring and logging
    if (context.severity === ThreatSeverity.HIGH) {
      actionSet.add(ActionType.ENABLE_MONITORING);
      actionSet.add(ActionType.LOG_EVENT);
    }

    // Build action info
    const actions: ActionInfo[] = [];
    const actionDependencies = this.getActionDependencies();

    for (const actionType of actionSet) {
      const deps = actionDependencies.get(actionType) || [];
      actions.push({
        actionType,
        priority: actions.length,
        description: this.getActionDescription(actionType),
        prerequisites: deps,
        rollbackable: this.isActionRollbackable(actionType),
        estimatedImpact: this.estimateActionImpact(actionType, context),
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get action dependencies
   *
   * @returns Map of action type to prerequisites
   */
  private getActionDependencies(): Map<ActionType, ActionType[]> {
    return new Map([
      [ActionType.ISOLATE_SYSTEM, [ActionType.SNAPSHOT_DATA]],
      [ActionType.REVOKE_TOKEN, [ActionType.LOG_EVENT]],
      [ActionType.REVOKE_SESSION, [ActionType.LOG_EVENT]],
      [ActionType.LOCK_ACCOUNT, [ActionType.SNAPSHOT_DATA, ActionType.LOG_EVENT]],
      [ActionType.ROTATE_CREDENTIALS, [ActionType.BACKUP_DATA]],
      [ActionType.RESTRICT_PERMISSIONS, [ActionType.SNAPSHOT_DATA]],
    ]);
  }

  /**
   * Get action description
   *
   * @param actionType The action type
   * @returns Description
   */
  private getActionDescription(actionType: ActionType): string {
    const descriptions: Record<ActionType, string> = {
      [ActionType.BLOCK_IP]: 'Block source IP address',
      [ActionType.RATE_LIMIT]: 'Apply rate limiting',
      [ActionType.QUARANTINE]: 'Quarantine suspicious content',
      [ActionType.LOCK_ACCOUNT]: 'Lock user account',
      [ActionType.ISOLATE_SYSTEM]: 'Isolate system from network',
      [ActionType.REVOKE_SESSION]: 'Revoke active sessions',
      [ActionType.REVOKE_TOKEN]: 'Revoke authentication tokens',
      [ActionType.RESET_MFA]: 'Reset multi-factor authentication',
      [ActionType.REQUIRE_REAUTH]: 'Require re-authentication',
      [ActionType.DISABLE_API_KEY]: 'Disable API keys',
      [ActionType.SUSPEND_WORKFLOW]: 'Suspend workflow execution',
      [ActionType.PAUSE_EXECUTION]: 'Pause current execution',
      [ActionType.SNAPSHOT_DATA]: 'Create data snapshot for forensics',
      [ActionType.ENABLE_MONITORING]: 'Enable enhanced monitoring',
      [ActionType.ROTATE_CREDENTIALS]: 'Rotate credentials',
      [ActionType.BACKUP_DATA]: 'Backup data before changes',
      [ActionType.RESTRICT_PERMISSIONS]: 'Restrict user permissions',
      [ActionType.REQUIRE_2FA]: 'Require 2FA authentication',
      [ActionType.NOTIFY_ADMINS]: 'Notify administrators',
      [ActionType.LOG_EVENT]: 'Log security event',
    };

    return descriptions[actionType] || 'Unknown action';
  }

  /**
   * Check if action is rollbackable
   *
   * @param actionType The action type
   * @returns Whether rollbackable
   */
  private isActionRollbackable(actionType: ActionType): boolean {
    const nonRollbackable = new Set([
      ActionType.SNAPSHOT_DATA,
      ActionType.BACKUP_DATA,
      ActionType.LOG_EVENT,
      ActionType.NOTIFY_ADMINS,
    ]);

    return !nonRollbackable.has(actionType);
  }

  /**
   * Estimate action impact
   *
   * @param actionType The action type
   * @param context The threat context
   * @returns Impact description
   */
  private estimateActionImpact(actionType: ActionType, context: ThreatContext): string {
    const severityFactor = {
      [ThreatSeverity.CRITICAL]: 'High',
      [ThreatSeverity.HIGH]: 'Medium',
      [ThreatSeverity.MEDIUM]: 'Low',
      [ThreatSeverity.LOW]: 'Minimal',
      [ThreatSeverity.INFO]: 'None',
    };

    return severityFactor[context.severity] || 'Unknown';
  }

  /**
   * Assess impact of actions
   *
   * @param context The threat context
   * @param actions The recommended actions
   * @returns Impact assessment
   */
  private assessImpact(
    context: ThreatContext,
    actions: ActionInfo[],
  ): { businessImpact: string; userImpact: string; systemImpact: string } {
    let businessImpact = 'Low';
    let userImpact = 'Low';
    let systemImpact = 'Low';

    if (actions.some((a) => a.actionType === ActionType.ISOLATE_SYSTEM)) {
      businessImpact = 'High';
      systemImpact = 'Critical';
    }

    if (actions.some((a) => a.actionType === ActionType.LOCK_ACCOUNT)) {
      userImpact = 'High';
    }

    // Account-related threats always have high user impact
    if (
      context.targetType === 'account' ||
      context.category.includes('account') ||
      context.category.includes('compromise')
    ) {
      userImpact = 'High';
    }

    if (actions.some((a) => a.actionType === ActionType.SUSPEND_WORKFLOW)) {
      businessImpact = 'Medium';
    }

    return { businessImpact, userImpact, systemImpact };
  }

  /**
   * Determine escalation path
   *
   * @param context The threat context
   * @param decisionType The decision type
   * @returns Escalation path
   */
  private determineEscalationPath(context: ThreatContext, decisionType: DecisionType): string[] {
    const path: string[] = [];

    // For ESCALATION decisions, include security analyst
    if (decisionType === DecisionType.ESCALATION) {
      path.push('security_analyst');
    }

    // For critical threats, always escalate to CISO regardless of decision type
    if (context.severity === ThreatSeverity.CRITICAL) {
      path.push('ciso');
      path.push('incident_commander');
    }

    // For business-critical systems, escalate to ops
    if (context.businessContext?.isCriticalSystem) {
      path.push('operations_manager');
    }

    return path;
  }

  /**
   * Generate reasoning explanation
   *
   * @param context The threat context
   * @param confidence The confidence score
   * @param decisionType The decision type
   * @returns Reasoning text
   */
  private generateReasoning(
    context: ThreatContext,
    confidence: number,
    decisionType: DecisionType,
  ): string {
    const parts: string[] = [];

    parts.push(`Threat Category: ${context.category}`);
    parts.push(`Severity: ${context.severity}`);
    parts.push(`Confidence: ${confidence}%`);
    parts.push(`Decision: ${decisionType}`);

    if (context.historicalData?.previousIncidents) {
      parts.push(`Previous Incidents: ${context.historicalData.previousIncidents}`);
    }

    return parts.join(' | ');
  }

  /**
   * Execute approved actions
   *
   * @param decisionId The decision ID
   * @param executor Function to execute actions
   * @returns Executed actions
   */
  public async executeActions(
    decisionId: string,
    executor: (actionType: ActionType) => Promise<unknown>,
  ): Promise<ExecutedAction[]> {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision not found: ${decisionId}`);

    const executedActions: ExecutedAction[] = [];

    for (const actionInfo of decision.recommendedActions) {
      // Check rate limits
      if (!this.checkRateLimit(actionInfo.actionType)) {
        executedActions.push({
          actionType: actionInfo.actionType,
          status: 'failed',
          error: 'Rate limit exceeded',
        });
        continue;
      }

      try {
        const result = await executor(actionInfo.actionType);
        executedActions.push({
          actionType: actionInfo.actionType,
          status: 'completed',
          executedAt: Date.now(),
          result: result as Record<string, unknown>,
        });

        // Update stats
        this.updateActionStats(actionInfo.actionType, true);
      } catch (error) {
        executedActions.push({
          actionType: actionInfo.actionType,
          status: 'failed',
          error: String(error),
        });

        // Update stats
        this.updateActionStats(actionInfo.actionType, false);
      }
    }

    decision.executedActions = executedActions;
    return executedActions;
  }

  /**
   * Check rate limit for action
   *
   * @param actionType The action type
   * @returns Whether within rate limit
   */
  private checkRateLimit(actionType: ActionType): boolean {
    const limit = this.ACTION_RATE_LIMITS.get(actionType);
    const stats = this.actionStats.get(actionType);

    if (!limit || !stats) return true;

    // Check hourly limit
    const oneHourAgo = Date.now() - 3600000;
    if (stats.lastExecution > oneHourAgo && stats.count >= limit.maxPerHour) {
      return false;
    }

    return true;
  }

  /**
   * Update action statistics
   *
   * @param actionType The action type
   * @param success Whether the action succeeded
   */
  private updateActionStats(actionType: ActionType, success: boolean): void {
    const stats = this.actionStats.get(actionType) || { count: 0, failures: 0, lastExecution: 0 };

    stats.count++;
    stats.lastExecution = Date.now();
    if (!success) stats.failures++;

    this.actionStats.set(actionType, stats);
  }

  /**
   * Record analyst decision
   *
   * @param decisionId The decision ID
   * @param approved Whether approved
   * @param userId The analyst user ID
   * @param feedback The feedback
   */
  public recordAnalystDecision(
    decisionId: string,
    approved: boolean,
    userId: string,
    feedback: string,
  ): void {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new Error(`Decision not found: ${decisionId}`);

    decision.humanReview = {
      required: false,
      reviewedBy: userId,
      approved,
      comments: feedback,
    };

    // Create audit record
    const originalThreat = this.getThreatContext(decision.threatId);
    if (originalThreat) {
      const auditRecord: AuditRecord = {
        decisionId,
        threatId: decision.threatId,
        timestamp: Date.now(),
        decision: decision.type,
        actions: decision.recommendedActions.map((a) => a.actionType),
        confidence: decision.confidence,
        analyst: {
          userId,
          action: approved ? 'approved' : 'rejected',
          approved,
          timestamp: Date.now(),
          feedback,
        },
        outcome: {
          correctDecision: approved,
          falsePositive: !approved,
          delayedDetection: false,
          actualSeverity: originalThreat.severity,
        },
      };

      this.auditLog.push(auditRecord);
    }
  }

  /**
   * Get threat context from stored contexts
   *
   * @param threatId The threat ID
   * @returns The threat context or undefined
   */
  private getThreatContext(threatId: string): ThreatContext | undefined {
    return this.threatContexts.get(threatId);
  }

  /**
   * Get decision statistics
   *
   * @returns Decision statistics
   */
  public getDecisionStats(): Record<string, { count: number; accuracy: number }> {
    const result: Record<string, { count: number; accuracy: number }> = {};

    for (const [type, stats] of this.decisionStats.entries()) {
      result[type] = stats;
    }

    return result;
  }

  /**
   * Get audit log
   *
   * @param filters Optional filters
   * @returns Filtered audit records
   */
  public getAuditLog(filters?: { threatId?: string; userId?: string; startTime?: number; endTime?: number }): AuditRecord[] {
    let results = [...this.auditLog];

    if (filters?.threatId) {
      results = results.filter((r) => r.threatId === filters.threatId);
    }

    if (filters?.userId) {
      results = results.filter((r) => r.analyst?.userId === filters.userId);
    }

    if (filters?.startTime) {
      results = results.filter((r) => r.timestamp >= filters.startTime!);
    }

    if (filters?.endTime) {
      results = results.filter((r) => r.timestamp <= filters.endTime!);
    }

    return results;
  }

  /**
   * Learn from decisions
   *
   * Refine decision policies based on analyst feedback
   */
  public learnFromDecisions(): void {
    // Analyze audit log for patterns
    const correctDecisions = this.auditLog.filter((r) => r.outcome.correctDecision);
    const incorrectDecisions = this.auditLog.filter((r) => !r.outcome.correctDecision);

    // Update confidence scores
    // Would analyze patterns and adjust future decision confidence
  }
}

export default AutonomousDecisionEngine;
