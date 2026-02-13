/**
 * PolicyEngine - Policy enforcement and rule evaluation
 */

import { EventEmitter } from 'events';
import {
  Policy,
  PolicyRule,
  PolicyViolation,
  ComplianceFrameworkType,
  AlertSeverity,
  ComplianceAlert,
} from './types';

export interface PolicyEngineEvents {
  'policy:registered': { policyId: string };
  'policy:enforced': {
    policyId: string;
    violations: PolicyViolation[];
    remediationsTaken: Array<{ ruleId: string; action: string; success: boolean }>;
  };
}

export class PolicyEngine extends EventEmitter {
  private policies: Map<string, Policy> = new Map();
  private violations: Map<string, PolicyViolation> = new Map();

  private generateId: (prefix: string) => string;
  private createAlert: (params: {
    framework?: ComplianceFrameworkType;
    controlId?: string;
    severity: AlertSeverity;
    title: string;
    description: string;
    source: string;
  }) => Promise<ComplianceAlert>;
  private logAuditEntry: (entry: {
    eventType: string;
    framework?: ComplianceFrameworkType;
    actor: string;
    action: string;
    resourceType: string;
    resourceId: string;
    afterState?: Record<string, unknown>;
    result: 'success' | 'failure';
  }) => Promise<void>;

  constructor(
    generateId: (prefix: string) => string,
    createAlert: (params: {
      framework?: ComplianceFrameworkType;
      controlId?: string;
      severity: AlertSeverity;
      title: string;
      description: string;
      source: string;
    }) => Promise<ComplianceAlert>,
    logAuditEntry: (entry: {
      eventType: string;
      framework?: ComplianceFrameworkType;
      actor: string;
      action: string;
      resourceType: string;
      resourceId: string;
      afterState?: Record<string, unknown>;
      result: 'success' | 'failure';
    }) => Promise<void>
  ) {
    super();
    this.generateId = generateId;
    this.createAlert = createAlert;
    this.logAuditEntry = logAuditEntry;
  }

  /**
   * Register a policy
   */
  registerPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
    this.emit('policy:registered', { policyId: policy.id });
  }

  /**
   * Get all policies
   */
  getPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all violations
   */
  getViolations(): PolicyViolation[] {
    return Array.from(this.violations.values());
  }

  /**
   * Enforce a policy and take remediation actions
   */
  async enforcePolicy(
    policyId: string,
    context: Record<string, unknown>
  ): Promise<{
    policyId: string;
    violations: PolicyViolation[];
    remediationsTaken: Array<{ ruleId: string; action: string; success: boolean }>;
  }> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    if (!policy.enabled) {
      return { policyId, violations: [], remediationsTaken: [] };
    }

    const violations: PolicyViolation[] = [];
    const remediationsTaken: Array<{ ruleId: string; action: string; success: boolean }> = [];

    for (const rule of policy.rules) {
      const isViolated = await this.evaluateRule(rule, context);

      if (isViolated) {
        const violation: PolicyViolation = {
          id: this.generateId('violation'),
          policyId,
          ruleId: rule.id,
          framework: policy.frameworks[0],
          severity: rule.severity,
          description: rule.message,
          affectedResource: JSON.stringify(context).substring(0, 200),
          detectedAt: new Date(),
          remediationStatus: 'pending',
          autoRemediated: false,
        };

        violations.push(violation);
        this.violations.set(violation.id, violation);

        // Take action based on rule
        if (rule.action === 'remediate' && policy.autoRemediation && rule.remediationScript) {
          const success = await this.executeRemediation(rule.remediationScript, context);
          violation.autoRemediated = success;
          violation.remediationStatus = success ? 'completed' : 'failed';
          if (success) {
            violation.remediatedAt = new Date();
          }
          remediationsTaken.push({ ruleId: rule.id, action: 'remediate', success });
        } else if (rule.action === 'alert') {
          await this.createAlert({
            framework: policy.frameworks[0],
            severity: rule.severity,
            title: `Policy violation: ${policy.name}`,
            description: rule.message,
            source: 'policy_enforcement',
          });
          remediationsTaken.push({ ruleId: rule.id, action: 'alert', success: true });
        } else if (rule.action === 'block') {
          remediationsTaken.push({ ruleId: rule.id, action: 'block', success: true });
        }

        // Log violation
        await this.logAuditEntry({
          eventType: 'policy_violation',
          framework: policy.frameworks[0],
          actor: 'system',
          action: 'policy_enforcement',
          resourceType: 'policy',
          resourceId: policyId,
          afterState: { violation: violation.id, action: rule.action },
          result: 'success',
        });
      }
    }

    this.emit('policy:enforced', { policyId, violations, remediationsTaken });

    return { policyId, violations, remediationsTaken };
  }

  /**
   * Evaluate a policy rule against context
   */
  private async evaluateRule(rule: PolicyRule, context: Record<string, unknown>): Promise<boolean> {
    try {
      const condition = rule.condition;

      // Check for simple property conditions
      const matches = condition.match(/(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)/);
      if (matches) {
        const [, property, operator, value] = matches;
        const contextValue = context[property];
        const compareValue = value.replace(/['"]/g, '');

        switch (operator) {
          case '==': return String(contextValue) === compareValue;
          case '!=': return String(contextValue) !== compareValue;
          case '>': return Number(contextValue) > Number(compareValue);
          case '<': return Number(contextValue) < Number(compareValue);
          case '>=': return Number(contextValue) >= Number(compareValue);
          case '<=': return Number(contextValue) <= Number(compareValue);
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Execute remediation script
   */
  private async executeRemediation(
    _script: string,
    _context: Record<string, unknown>
  ): Promise<boolean> {
    // In production, this would execute the remediation script in a sandbox
    // For now, simulate with 90% success rate
    return Math.random() > 0.1;
  }
}
