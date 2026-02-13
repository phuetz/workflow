/**
 * Policy Violation Tracker
 *
 * Real-time monitoring and tracking of policy violations across the platform.
 * Detects violations in <5 seconds and triggers appropriate actions.
 */

import { EventEmitter } from 'events';
import {
  PolicyViolation,
  PolicyViolationType,
  AlertSeverity,
  PolicyAction,
} from './types/observability';

/**
 * Policy rule definition
 */
interface PolicyRule {
  id: string;
  name: string;
  description: string;
  type: PolicyViolationType;
  enabled: boolean;
  severity: AlertSeverity;
  conditions: PolicyCondition[];
  actions: PolicyActionConfig[];
  scope: {
    agentIds?: string[];
    workflowIds?: string[];
    userIds?: string[];
    global: boolean;
  };
}

/**
 * Policy condition
 */
interface PolicyCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne' | 'contains' | 'matches';
  value: any;
}

/**
 * Policy action configuration
 */
interface PolicyActionConfig {
  type: 'alert' | 'block' | 'throttle' | 'log' | 'quarantine';
  config: Record<string, any>;
}

/**
 * Violation context
 */
interface ViolationContext {
  agentId: string;
  workflowId?: string;
  userId?: string;
  data: Record<string, any>;
}

/**
 * Policy violation tracker implementation
 */
export class PolicyViolationTracker extends EventEmitter {
  private rules: Map<string, PolicyRule>;
  private violations: Map<string, PolicyViolation>;
  private activeViolations: Map<string, Set<string>>; // agentId -> violation IDs
  private violationCounts: Map<string, number>; // agentId -> count
  private detectionLatencies: number[];
  private maxLatencySamples: number = 1000;

  constructor() {
    super();
    this.rules = new Map();
    this.violations = new Map();
    this.activeViolations = new Map();
    this.violationCounts = new Map();
    this.detectionLatencies = [];

    this.initializeDefaultRules();
  }

  /**
   * Create a policy rule
   */
  createRule(rule: Omit<PolicyRule, 'id'>): string {
    const id = this.generateRuleId();
    const policyRule: PolicyRule = { id, ...rule };

    this.rules.set(id, policyRule);

    this.emit('rule:created', policyRule);

    return id;
  }

  /**
   * Update a policy rule
   */
  updateRule(id: string, updates: Partial<PolicyRule>): void {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Rule not found: ${id}`);
    }

    Object.assign(rule, updates);

    this.emit('rule:updated', rule);
  }

  /**
   * Delete a policy rule
   */
  deleteRule(id: string): void {
    this.rules.delete(id);
    this.emit('rule:deleted', id);
  }

  /**
   * Get a policy rule
   */
  getRule(id: string): PolicyRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Get all policy rules
   */
  getAllRules(): PolicyRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Check for policy violations
   */
  async checkPolicies(context: ViolationContext): Promise<PolicyViolation[]> {
    const startTime = Date.now();
    const violations: PolicyViolation[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      // Check scope
      if (!this.matchesScope(context, rule.scope)) {
        continue;
      }

      // Check conditions
      if (this.evaluateConditions(context.data, rule.conditions)) {
        const violation = await this.createViolation(rule, context);
        violations.push(violation);
      }
    }

    const detectionLatency = Date.now() - startTime;
    this.recordDetectionLatency(detectionLatency);

    return violations;
  }

  /**
   * Record a violation
   */
  async recordViolation(
    type: PolicyViolationType,
    severity: AlertSeverity,
    agentId: string,
    description: string,
    details: Record<string, any> = {},
    workflowId?: string,
    userId?: string
  ): Promise<string> {
    const id = this.generateViolationId();

    const violation: PolicyViolation = {
      id,
      timestamp: Date.now(),
      type,
      severity,
      agentId,
      workflowId,
      userId,
      description,
      details,
      resolved: false,
      actions: [],
    };

    this.violations.set(id, violation);

    // Track active violations
    if (!this.activeViolations.has(agentId)) {
      this.activeViolations.set(agentId, new Set());
    }
    this.activeViolations.get(agentId)!.add(id);

    // Update violation count
    this.violationCounts.set(agentId, (this.violationCounts.get(agentId) || 0) + 1);

    this.emit('violation:detected', violation);

    // Execute default actions based on severity
    await this.executeDefaultActions(violation);

    return id;
  }

  /**
   * Resolve a violation
   */
  resolveViolation(violationId: string, resolvedBy?: string): void {
    const violation = this.violations.get(violationId);
    if (!violation) {
      return;
    }

    violation.resolved = true;
    violation.resolvedAt = Date.now();
    violation.resolvedBy = resolvedBy;

    // Remove from active violations
    const activeSet = this.activeViolations.get(violation.agentId);
    if (activeSet) {
      activeSet.delete(violationId);
    }

    this.emit('violation:resolved', violation);
  }

  /**
   * Get violations with filters
   */
  getViolations(
    filter: {
      types?: PolicyViolationType[];
      agentIds?: string[];
      workflowIds?: string[];
      userIds?: string[];
      severity?: AlertSeverity[];
      startTime?: number;
      endTime?: number;
      resolved?: boolean;
    } = {}
  ): PolicyViolation[] {
    let violations = Array.from(this.violations.values());

    if (filter.types) {
      violations = violations.filter(v => filter.types!.includes(v.type));
    }

    if (filter.agentIds) {
      violations = violations.filter(v => filter.agentIds!.includes(v.agentId));
    }

    if (filter.workflowIds) {
      violations = violations.filter(v =>
        v.workflowId && filter.workflowIds!.includes(v.workflowId)
      );
    }

    if (filter.userIds) {
      violations = violations.filter(v =>
        v.userId && filter.userIds!.includes(v.userId)
      );
    }

    if (filter.severity) {
      violations = violations.filter(v => filter.severity!.includes(v.severity));
    }

    if (filter.startTime) {
      violations = violations.filter(v => v.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      violations = violations.filter(v => v.timestamp <= filter.endTime!);
    }

    if (filter.resolved !== undefined) {
      violations = violations.filter(v => v.resolved === filter.resolved);
    }

    return violations.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get active violations for an agent
   */
  getActiveViolations(agentId: string): PolicyViolation[] {
    const violationIds = this.activeViolations.get(agentId);
    if (!violationIds) {
      return [];
    }

    return Array.from(violationIds)
      .map(id => this.violations.get(id))
      .filter(v => v !== undefined) as PolicyViolation[];
  }

  /**
   * Get violation statistics
   */
  getStatistics(): {
    totalViolations: number;
    activeViolations: number;
    resolvedViolations: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<PolicyViolationType, number>;
    averageDetectionLatency: number;
    p95DetectionLatency: number;
  } {
    const violations = Array.from(this.violations.values());

    const bySeverity: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const byType: Record<PolicyViolationType, number> = {
      cost_exceeded: 0,
      rate_limit_exceeded: 0,
      unauthorized_access: 0,
      data_retention_violation: 0,
      compliance_violation: 0,
      security_violation: 0,
      performance_degradation: 0,
      resource_quota_exceeded: 0,
    };

    for (const violation of violations) {
      bySeverity[violation.severity]++;
      byType[violation.type]++;
    }

    const sortedLatencies = [...this.detectionLatencies].sort((a, b) => a - b);

    return {
      totalViolations: violations.length,
      activeViolations: violations.filter(v => !v.resolved).length,
      resolvedViolations: violations.filter(v => v.resolved).length,
      bySeverity,
      byType,
      averageDetectionLatency: this.detectionLatencies.length > 0
        ? this.detectionLatencies.reduce((sum, l) => sum + l, 0) / this.detectionLatencies.length
        : 0,
      p95DetectionLatency: this.percentile(sortedLatencies, 0.95),
    };
  }

  /**
   * Get top violators
   */
  getTopViolators(limit: number = 10): Array<{ agentId: string; count: number }> {
    return Array.from(this.violationCounts.entries())
      .map(([agentId, count]) => ({ agentId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.violations.clear();
    this.activeViolations.clear();
    this.violationCounts.clear();
    this.detectionLatencies = [];
  }

  /**
   * Create violation from rule
   */
  private async createViolation(
    rule: PolicyRule,
    context: ViolationContext
  ): Promise<PolicyViolation> {
    const id = this.generateViolationId();

    const violation: PolicyViolation = {
      id,
      timestamp: Date.now(),
      type: rule.type,
      severity: rule.severity,
      agentId: context.agentId,
      workflowId: context.workflowId,
      userId: context.userId,
      description: `${rule.name}: ${rule.description}`,
      details: context.data,
      resolved: false,
      actions: [],
    };

    this.violations.set(id, violation);

    // Track active violations
    if (!this.activeViolations.has(context.agentId)) {
      this.activeViolations.set(context.agentId, new Set());
    }
    this.activeViolations.get(context.agentId)!.add(id);

    // Update violation count
    this.violationCounts.set(
      context.agentId,
      (this.violationCounts.get(context.agentId) || 0) + 1
    );

    this.emit('violation:detected', violation);

    // Execute rule actions
    await this.executeActions(violation, rule.actions);

    return violation;
  }

  /**
   * Execute actions for a violation
   */
  private async executeActions(
    violation: PolicyViolation,
    actionConfigs: PolicyActionConfig[]
  ): Promise<void> {
    for (const actionConfig of actionConfigs) {
      try {
        const action: PolicyAction = {
          type: actionConfig.type,
          timestamp: Date.now(),
          result: 'success',
        };

        // In production, execute actual actions
        // For now, just emit events
        this.emit('action:executed', {
          violation,
          action: actionConfig,
        });

        violation.actions.push(action);
      } catch (error) {
        const action: PolicyAction = {
          type: actionConfig.type,
          timestamp: Date.now(),
          result: 'failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        };
        violation.actions.push(action);
      }
    }
  }

  /**
   * Execute default actions based on severity
   */
  private async executeDefaultActions(violation: PolicyViolation): Promise<void> {
    const actions: PolicyActionConfig[] = [];

    switch (violation.severity) {
      case 'critical':
        actions.push(
          { type: 'alert', config: { channels: ['email', 'slack', 'pagerduty'] } },
          { type: 'block', config: {} }
        );
        break;
      case 'high':
        actions.push(
          { type: 'alert', config: { channels: ['email', 'slack'] } },
          { type: 'throttle', config: { rate: 0.5 } }
        );
        break;
      case 'medium':
        actions.push(
          { type: 'alert', config: { channels: ['slack'] } },
          { type: 'log', config: {} }
        );
        break;
      case 'low':
      case 'info':
        actions.push({ type: 'log', config: {} });
        break;
    }

    await this.executeActions(violation, actions);
  }

  /**
   * Check if context matches scope
   */
  private matchesScope(context: ViolationContext, scope: PolicyRule['scope']): boolean {
    if (scope.global) {
      return true;
    }

    if (scope.agentIds && !scope.agentIds.includes(context.agentId)) {
      return false;
    }

    if (scope.workflowIds && context.workflowId && !scope.workflowIds.includes(context.workflowId)) {
      return false;
    }

    if (scope.userIds && context.userId && !scope.userIds.includes(context.userId)) {
      return false;
    }

    return true;
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(data: Record<string, any>, conditions: PolicyCondition[]): boolean {
    return conditions.every(condition => {
      const value = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'gt':
          return value > condition.value;
        case 'gte':
          return value >= condition.value;
        case 'lt':
          return value < condition.value;
        case 'lte':
          return value <= condition.value;
        case 'eq':
          return value === condition.value;
        case 'ne':
          return value !== condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'matches':
          return new RegExp(condition.value).test(String(value));
        default:
          return false;
      }
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Record detection latency
   */
  private recordDetectionLatency(latency: number): void {
    this.detectionLatencies.push(latency);

    // Keep only last N samples
    if (this.detectionLatencies.length > this.maxLatencySamples) {
      this.detectionLatencies.shift();
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Initialize default policy rules
   */
  private initializeDefaultRules(): void {
    // Cost exceeded rule
    this.createRule({
      name: 'Cost Limit Exceeded',
      description: 'Agent has exceeded cost budget',
      type: 'cost_exceeded',
      enabled: true,
      severity: 'high',
      conditions: [
        { field: 'cost', operator: 'gt', value: 100 },
      ],
      actions: [
        { type: 'alert', config: { channels: ['email'] } },
        { type: 'throttle', config: { rate: 0.5 } },
      ],
      scope: { global: true },
    });

    // Rate limit exceeded rule
    this.createRule({
      name: 'Rate Limit Exceeded',
      description: 'Agent has exceeded rate limit',
      type: 'rate_limit_exceeded',
      enabled: true,
      severity: 'medium',
      conditions: [
        { field: 'requestsPerMinute', operator: 'gt', value: 100 },
      ],
      actions: [
        { type: 'throttle', config: { rate: 0.3 } },
        { type: 'log', config: {} },
      ],
      scope: { global: true },
    });

    // Performance degradation rule
    this.createRule({
      name: 'Performance Degradation',
      description: 'Agent performance has degraded significantly',
      type: 'performance_degradation',
      enabled: true,
      severity: 'medium',
      conditions: [
        { field: 'latency', operator: 'gt', value: 5000 },
      ],
      actions: [
        { type: 'alert', config: { channels: ['slack'] } },
        { type: 'log', config: {} },
      ],
      scope: { global: true },
    });
  }

  /**
   * Generate rule ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate violation ID
   */
  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default PolicyViolationTracker;
