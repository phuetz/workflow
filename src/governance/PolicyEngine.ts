/**
 * Policy Engine - Core Policy Enforcement and Auditing
 * Runtime policy evaluation with versioning and compliance tracking
 */

import { EventEmitter } from 'events';
import {
  Policy,
  PolicyContext,
  PolicyEvaluationResult,
  PolicyViolation,
  PolicyAction,
  PolicyCategory,
  PolicySeverity,
  PolicyCondition,
} from './types/governance';
import { getAllPolicyTemplates } from './PolicyTemplates';

/**
 * Policy evaluation cache entry
 */
interface CacheEntry {
  result: PolicyEvaluationResult;
  expiresAt: number;
}

/**
 * Policy Engine Configuration
 */
interface PolicyEngineConfig {
  enableCaching: boolean;
  cacheExpirationMs: number;
  evaluationTimeoutMs: number;
  maxConcurrentEvaluations: number;
  autoLoadTemplates: boolean;
}

/**
 * Policy Engine - Main governance enforcement engine
 */
export class PolicyEngine extends EventEmitter {
  private policies: Map<string, Policy> = new Map();
  private violations: Map<string, PolicyViolation> = new Map();
  private evaluationCache: Map<string, CacheEntry> = new Map();
  private config: PolicyEngineConfig;
  private evaluationCount = 0;
  private violationCount = 0;

  constructor(config: Partial<PolicyEngineConfig> = {}) {
    super();

    this.config = {
      enableCaching: config.enableCaching ?? true,
      cacheExpirationMs: config.cacheExpirationMs ?? 300000, // 5 minutes
      evaluationTimeoutMs: config.evaluationTimeoutMs ?? 100, // 100ms
      maxConcurrentEvaluations: config.maxConcurrentEvaluations ?? 100,
      autoLoadTemplates: config.autoLoadTemplates ?? true,
    };

    if (this.config.autoLoadTemplates) {
      this.loadPolicyTemplates();
    }

    // Cleanup cache periodically
    setInterval(() => this.cleanupCache(), 60000); // Every minute
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  /**
   * Load all policy templates
   */
  loadPolicyTemplates(): void {
    const templates = getAllPolicyTemplates();
    let loaded = 0;

    for (const template of templates) {
      this.policies.set(template.id, template);
      loaded++;
    }

    this.emit('policies:loaded', { count: loaded });
  }

  /**
   * Add a policy
   */
  addPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
    this.emit('policy:added', { policyId: policy.id, policy });
  }

  /**
   * Update a policy
   */
  updatePolicy(policyId: string, updates: Partial<Policy>): void {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const updated = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updated);
    this.invalidateCache(policyId);
    this.emit('policy:updated', { policyId, policy: updated });
  }

  /**
   * Remove a policy
   */
  removePolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    this.policies.delete(policyId);
    this.invalidateCache(policyId);
    this.emit('policy:removed', { policyId });
  }

  /**
   * Get a policy
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policies by category
   */
  getPoliciesByCategory(category: PolicyCategory): Policy[] {
    return this.getAllPolicies().filter(p => p.category === category);
  }

  /**
   * Get enabled policies
   */
  getEnabledPolicies(): Policy[] {
    return this.getAllPolicies().filter(p => p.enabled);
  }

  /**
   * Enable a policy
   */
  enablePolicy(policyId: string): void {
    this.updatePolicy(policyId, { enabled: true });
  }

  /**
   * Disable a policy
   */
  disablePolicy(policyId: string): void {
    this.updatePolicy(policyId, { enabled: false });
  }

  // ============================================================================
  // Policy Evaluation
  // ============================================================================

  /**
   * Evaluate all enabled policies against a context
   */
  async evaluateAll(context: PolicyContext): Promise<PolicyEvaluationResult[]> {
    const startTime = Date.now();
    const enabledPolicies = this.getEnabledPolicies();
    const results: PolicyEvaluationResult[] = [];

    // Check cache first
    const cacheKey = this.generateCacheKey(context);
    if (this.config.enableCaching) {
      const cached = this.evaluationCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return [cached.result];
      }
    }

    // Evaluate policies concurrently with limit
    const batches: Policy[][] = [];
    for (let i = 0; i < enabledPolicies.length; i += this.config.maxConcurrentEvaluations) {
      batches.push(enabledPolicies.slice(i, i + this.config.maxConcurrentEvaluations));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(policy => this.evaluatePolicy(policy, context))
      );
      results.push(...batchResults);
    }

    this.evaluationCount += results.length;

    const evaluationTime = Date.now() - startTime;
    this.emit('evaluation:complete', {
      context,
      results,
      evaluationTime,
      policyCount: results.length,
    });

    return results;
  }

  /**
   * Evaluate a single policy
   */
  async evaluatePolicy(
    policy: Policy,
    context: PolicyContext
  ): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();

    try {
      // Timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Policy evaluation timeout')),
          this.config.evaluationTimeoutMs
        );
      });

      const evaluationPromise = this.evaluatePolicyConditions(policy, context);
      const passed = await Promise.race([evaluationPromise, timeoutPromise]);

      const violations: string[] = [];
      const recommendations: string[] = [];

      if (!passed) {
        violations.push(`Policy "${policy.name}" violated`);
        if (policy.remediationSteps) {
          recommendations.push(...policy.remediationSteps);
        }

        // Record violation
        await this.recordViolation(policy, context, violations);
      }

      const result: PolicyEvaluationResult = {
        policyId: policy.id,
        policyName: policy.name,
        passed,
        action: policy.action,
        severity: policy.severity,
        violations,
        recommendations,
        evaluatedAt: new Date(),
        evaluationDurationMs: Date.now() - startTime,
      };

      // Cache result
      if (this.config.enableCaching && passed) {
        const cacheKey = `${policy.id}:${this.generateCacheKey(context)}`;
        this.evaluationCache.set(cacheKey, {
          result,
          expiresAt: Date.now() + this.config.cacheExpirationMs,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        policyId: policy.id,
        policyName: policy.name,
        passed: false,
        action: PolicyAction.WARN,
        severity: PolicySeverity.MEDIUM,
        violations: [`Evaluation error: ${errorMessage}`],
        recommendations: ['Review policy configuration', 'Check evaluation context'],
        evaluatedAt: new Date(),
        evaluationDurationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate policy conditions
   */
  private async evaluatePolicyConditions(
    policy: Policy,
    context: PolicyContext
  ): Promise<boolean> {
    // All conditions must pass (AND logic)
    for (const condition of policy.conditions) {
      if (!(await this.evaluateCondition(condition, context))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: PolicyCondition,
    context: PolicyContext
  ): Promise<boolean> {
    let actualValue: any;

    // Extract value from context based on condition type
    switch (condition.type) {
      case 'data_access':
        actualValue = context.dataAccess;
        break;
      case 'api_call':
        actualValue = context.apiCalls;
        break;
      case 'execution_time':
        actualValue = context.estimatedDuration || 0;
        break;
      case 'cost_threshold':
        actualValue = context.estimatedCost || 0;
        break;
      case 'pii_detection':
        actualValue = context.dataAccess.some(d => d.containsPII);
        break;
      case 'user_permission':
        actualValue = context.requestedActions;
        break;
      case 'data_residency':
        actualValue = context.dataAccess.map(d => d.dataResidency);
        break;
      case 'compliance_framework':
        actualValue = context.metadata?.complianceFrameworks || [];
        break;
      case 'resource_usage':
        actualValue = context.metadata?.resourceUsage || {};
        break;
      case 'custom':
        actualValue = context.metadata?.[condition.metadata?.checkType as string];
        break;
      default:
        return true;
    }

    // Apply operator
    return this.applyOperator(actualValue, condition.operator, condition.value);
  }

  /**
   * Apply comparison operator
   */
  private applyOperator(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;

      case 'contains':
        if (Array.isArray(actual)) {
          return actual.some(item =>
            typeof item === 'string' && item.includes(expected)
          );
        }
        return String(actual).includes(String(expected));

      case 'greater_than':
        return Number(actual) > Number(expected);

      case 'less_than':
        return Number(actual) < Number(expected);

      case 'matches':
        const regex = new RegExp(expected);
        return regex.test(String(actual));

      case 'in':
        if (Array.isArray(expected)) {
          return Array.isArray(actual)
            ? actual.some(item => expected.includes(item))
            : expected.includes(actual);
        }
        return false;

      case 'not_in':
        if (Array.isArray(expected)) {
          return Array.isArray(actual)
            ? !actual.some(item => expected.includes(item))
            : !expected.includes(actual);
        }
        return true;

      default:
        return true;
    }
  }

  // ============================================================================
  // Violation Management
  // ============================================================================

  /**
   * Record a policy violation
   */
  private async recordViolation(
    policy: Policy,
    context: PolicyContext,
    violations: string[]
  ): Promise<void> {
    const violation: PolicyViolation = {
      id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      policyId: policy.id,
      agentId: context.agentId,
      userId: context.userId,
      violationType: policy.category,
      severity: policy.severity,
      description: violations.join('; '),
      context,
      detectedAt: new Date(),
      status: 'open',
    };

    this.violations.set(violation.id, violation);
    this.violationCount++;

    this.emit('violation:detected', { violation });
  }

  /**
   * Get all violations
   */
  getViolations(): PolicyViolation[] {
    return Array.from(this.violations.values());
  }

  /**
   * Get violations by agent
   */
  getViolationsByAgent(agentId: string): PolicyViolation[] {
    return this.getViolations().filter(v => v.agentId === agentId);
  }

  /**
   * Get open violations
   */
  getOpenViolations(): PolicyViolation[] {
    return this.getViolations().filter(v => v.status === 'open');
  }

  /**
   * Resolve a violation
   */
  resolveViolation(violationId: string, resolvedBy: string, notes?: string): void {
    const violation = this.violations.get(violationId);
    if (!violation) {
      throw new Error(`Violation ${violationId} not found`);
    }

    violation.status = 'resolved';
    violation.resolvedAt = new Date();
    violation.resolvedBy = resolvedBy;
    violation.resolutionNotes = notes;

    this.emit('violation:resolved', { violation });
  }

  /**
   * Mark violation as false positive
   */
  markFalsePositive(violationId: string, userId: string, notes?: string): void {
    const violation = this.violations.get(violationId);
    if (!violation) {
      throw new Error(`Violation ${violationId} not found`);
    }

    violation.status = 'false_positive';
    violation.resolvedAt = new Date();
    violation.resolvedBy = userId;
    violation.resolutionNotes = notes;

    this.emit('violation:false_positive', { violation });
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Generate cache key from context
   */
  private generateCacheKey(context: PolicyContext): string {
    const parts = [
      context.agentId,
      context.userId,
      context.taskId || '',
      context.workflowId || '',
      JSON.stringify(context.requestedActions.sort()),
    ];
    return parts.join(':');
  }

  /**
   * Invalidate cache for a policy
   */
  private invalidateCache(policyId: string): void {
    const keysToDelete: string[] = [];

    for (const [key] of this.evaluationCache.entries()) {
      if (key.startsWith(`${policyId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.evaluationCache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.evaluationCache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.evaluationCache.entries()) {
      if (entry.expiresAt <= now) {
        this.evaluationCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('cache:cleaned', { count: cleaned });
    }
  }

  // ============================================================================
  // Statistics and Reporting
  // ============================================================================

  /**
   * Get policy statistics
   */
  getStatistics() {
    const policies = this.getAllPolicies();
    const enabledPolicies = this.getEnabledPolicies();
    const violations = this.getViolations();
    const openViolations = this.getOpenViolations();

    const bySeverity = {
      critical: violations.filter(v => v.severity === PolicySeverity.CRITICAL).length,
      high: violations.filter(v => v.severity === PolicySeverity.HIGH).length,
      medium: violations.filter(v => v.severity === PolicySeverity.MEDIUM).length,
      low: violations.filter(v => v.severity === PolicySeverity.LOW).length,
    };

    return {
      policies: {
        total: policies.length,
        enabled: enabledPolicies.length,
        disabled: policies.length - enabledPolicies.length,
      },
      violations: {
        total: violations.length,
        open: openViolations.length,
        resolved: violations.filter(v => v.status === 'resolved').length,
        falsePositives: violations.filter(v => v.status === 'false_positive').length,
        bySeverity,
      },
      performance: {
        totalEvaluations: this.evaluationCount,
        cacheSize: this.evaluationCache.size,
        cacheHitRate: this.calculateCacheHitRate(),
      },
    };
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // This would need proper instrumentation in production
    // For now, return an estimate based on cache size vs evaluations
    if (this.evaluationCount === 0) return 0;
    return Math.min(this.evaluationCache.size / this.evaluationCount, 1);
  }

  /**
   * Get policy compliance score
   */
  getPolicyComplianceScore(): number {
    const totalPolicies = this.getEnabledPolicies().length;
    const violations = this.getOpenViolations().length;

    if (totalPolicies === 0) return 100;

    const compliantPolicies = totalPolicies - violations;
    return Math.max(0, (compliantPolicies / totalPolicies) * 100);
  }

  /**
   * Export policy configuration
   */
  exportConfiguration(): {
    policies: Policy[];
    violations: PolicyViolation[];
    statistics: ReturnType<typeof this.getStatistics>;
    exportedAt: Date;
  } {
    return {
      policies: this.getAllPolicies(),
      violations: this.getViolations(),
      statistics: this.getStatistics(),
      exportedAt: new Date(),
    };
  }

  /**
   * Import policy configuration
   */
  importConfiguration(config: { policies: Policy[] }): void {
    this.policies.clear();

    for (const policy of config.policies) {
      this.policies.set(policy.id, policy);
    }

    this.clearCache();
    this.emit('configuration:imported', { count: config.policies.length });
  }
}

/**
 * Singleton instance
 */
export const policyEngine = new PolicyEngine();
