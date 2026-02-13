import { logger } from '../services/SimpleLogger';
/**
 * Performance Budget Manager
 *
 * Manages performance budgets for workflows and operations:
 * - Define budgets (max time, memory, API calls, cost)
 * - Track budget compliance
 * - Historical budget trends
 * - Budget violations and alerts
 *
 * Usage:
 * const budgetManager = PerformanceBudgetManager.getInstance();
 * budgetManager.setBudget('workflow.execution', { maxTime: 5000, maxMemory: 100 });
 * const status = budgetManager.checkBudget('workflow.execution', { time: 6000 });
 */

export interface PerformanceBudget {
  id: string;
  name: string;
  metric: string;
  enabled: boolean;
  limits: BudgetLimits;
  scope: BudgetScope;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetLimits {
  maxTime?: number; // milliseconds
  maxMemory?: number; // MB or percentage
  maxApiCalls?: number;
  maxCost?: number; // dollars
  maxFileSize?: number; // MB
  maxDataTransfer?: number; // MB
}

export interface BudgetScope {
  type: 'global' | 'workflow' | 'node' | 'integration';
  targetId?: string; // workflow ID, node type, etc.
}

export interface BudgetCheck {
  budgetId: string;
  budgetName: string;
  metric: string;
  passed: boolean;
  violations: BudgetViolation[];
  timestamp: number;
}

export interface BudgetViolation {
  limit: keyof BudgetLimits;
  budgetValue: number;
  actualValue: number;
  exceeded: number; // percentage over budget
  severity: 'warning' | 'error' | 'critical';
}

export interface BudgetMetrics {
  time?: number;
  memory?: number;
  apiCalls?: number;
  cost?: number;
  fileSize?: number;
  dataTransfer?: number;
}

export interface BudgetTrend {
  budgetId: string;
  metric: string;
  period: 'day' | 'week' | 'month';
  data: {
    timestamp: number;
    passed: number;
    failed: number;
    complianceRate: number; // 0-100
  }[];
}

export interface BudgetReport {
  period: {
    start: number;
    end: number;
  };
  budgets: {
    id: string;
    name: string;
    totalChecks: number;
    passed: number;
    failed: number;
    complianceRate: number;
    violations: BudgetViolation[];
  }[];
  summary: {
    totalBudgets: number;
    activeBudgets: number;
    overallComplianceRate: number;
    criticalViolations: number;
  };
}

export class PerformanceBudgetManager {
  private static instance: PerformanceBudgetManager;
  private budgets: Map<string, PerformanceBudget> = new Map();
  private budgetChecks: BudgetCheck[] = [];
  private readonly MAX_CHECKS_HISTORY = 10000;

  private constructor() {
    this.loadBudgets();
  }

  public static getInstance(): PerformanceBudgetManager {
    if (!PerformanceBudgetManager.instance) {
      PerformanceBudgetManager.instance = new PerformanceBudgetManager();
    }
    return PerformanceBudgetManager.instance;
  }

  /**
   * Create or update a budget
   */
  public setBudget(budget: Omit<PerformanceBudget, 'id' | 'createdAt' | 'updatedAt'>): PerformanceBudget {
    const id = this.generateBudgetId(budget.metric, budget.scope);
    const existing = this.budgets.get(id);

    const newBudget: PerformanceBudget = {
      id,
      ...budget,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    this.budgets.set(id, newBudget);
    this.saveBudgets();

    return newBudget;
  }

  /**
   * Generate unique budget ID
   */
  private generateBudgetId(metric: string, scope: BudgetScope): string {
    const scopeKey = scope.targetId ? `${scope.type}:${scope.targetId}` : scope.type;
    return `${metric}:${scopeKey}`;
  }

  /**
   * Get budget by ID
   */
  public getBudget(id: string): PerformanceBudget | undefined {
    return this.budgets.get(id);
  }

  /**
   * Get all budgets
   */
  public getAllBudgets(): PerformanceBudget[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Get budgets for a specific scope
   */
  public getBudgetsForScope(scope: BudgetScope): PerformanceBudget[] {
    return Array.from(this.budgets.values()).filter(budget => {
      if (budget.scope.type !== scope.type) return false;
      if (scope.targetId && budget.scope.targetId !== scope.targetId) return false;
      return true;
    });
  }

  /**
   * Delete a budget
   */
  public deleteBudget(id: string): boolean {
    const deleted = this.budgets.delete(id);
    if (deleted) {
      this.saveBudgets();
    }
    return deleted;
  }

  /**
   * Enable or disable a budget
   */
  public toggleBudget(id: string, enabled: boolean): boolean {
    const budget = this.budgets.get(id);
    if (!budget) return false;

    budget.enabled = enabled;
    budget.updatedAt = Date.now();
    this.saveBudgets();

    return true;
  }

  /**
   * Check metrics against budgets
   */
  public checkBudget(
    metric: string,
    metrics: BudgetMetrics,
    scope: BudgetScope
  ): BudgetCheck {
    const budgets = this.getBudgetsForScope(scope).filter(
      b => b.metric === metric && b.enabled
    );

    if (budgets.length === 0) {
      // No budget defined, auto-pass
      return {
        budgetId: 'none',
        budgetName: 'No Budget',
        metric,
        passed: true,
        violations: [],
        timestamp: Date.now(),
      };
    }

    // Check all matching budgets
    const allViolations: BudgetViolation[] = [];

    budgets.forEach(budget => {
      const violations = this.checkLimits(budget.limits, metrics);
      allViolations.push(...violations);
    });

    const check: BudgetCheck = {
      budgetId: budgets[0].id,
      budgetName: budgets[0].name,
      metric,
      passed: allViolations.length === 0,
      violations: allViolations,
      timestamp: Date.now(),
    };

    // Record check
    this.budgetChecks.push(check);

    // Keep only recent checks
    if (this.budgetChecks.length > this.MAX_CHECKS_HISTORY) {
      this.budgetChecks = this.budgetChecks.slice(-this.MAX_CHECKS_HISTORY);
    }

    this.saveBudgetChecks();

    return check;
  }

  /**
   * Check metrics against limits
   */
  private checkLimits(limits: BudgetLimits, metrics: BudgetMetrics): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    // Check time budget
    if (limits.maxTime !== undefined && metrics.time !== undefined) {
      if (metrics.time > limits.maxTime) {
        violations.push({
          limit: 'maxTime',
          budgetValue: limits.maxTime,
          actualValue: metrics.time,
          exceeded: ((metrics.time - limits.maxTime) / limits.maxTime) * 100,
          severity: this.getSeverity(metrics.time, limits.maxTime),
        });
      }
    }

    // Check memory budget
    if (limits.maxMemory !== undefined && metrics.memory !== undefined) {
      if (metrics.memory > limits.maxMemory) {
        violations.push({
          limit: 'maxMemory',
          budgetValue: limits.maxMemory,
          actualValue: metrics.memory,
          exceeded: ((metrics.memory - limits.maxMemory) / limits.maxMemory) * 100,
          severity: this.getSeverity(metrics.memory, limits.maxMemory),
        });
      }
    }

    // Check API calls budget
    if (limits.maxApiCalls !== undefined && metrics.apiCalls !== undefined) {
      if (metrics.apiCalls > limits.maxApiCalls) {
        violations.push({
          limit: 'maxApiCalls',
          budgetValue: limits.maxApiCalls,
          actualValue: metrics.apiCalls,
          exceeded: ((metrics.apiCalls - limits.maxApiCalls) / limits.maxApiCalls) * 100,
          severity: this.getSeverity(metrics.apiCalls, limits.maxApiCalls),
        });
      }
    }

    // Check cost budget
    if (limits.maxCost !== undefined && metrics.cost !== undefined) {
      if (metrics.cost > limits.maxCost) {
        violations.push({
          limit: 'maxCost',
          budgetValue: limits.maxCost,
          actualValue: metrics.cost,
          exceeded: ((metrics.cost - limits.maxCost) / limits.maxCost) * 100,
          severity: this.getSeverity(metrics.cost, limits.maxCost),
        });
      }
    }

    // Check file size budget
    if (limits.maxFileSize !== undefined && metrics.fileSize !== undefined) {
      if (metrics.fileSize > limits.maxFileSize) {
        violations.push({
          limit: 'maxFileSize',
          budgetValue: limits.maxFileSize,
          actualValue: metrics.fileSize,
          exceeded: ((metrics.fileSize - limits.maxFileSize) / limits.maxFileSize) * 100,
          severity: this.getSeverity(metrics.fileSize, limits.maxFileSize),
        });
      }
    }

    // Check data transfer budget
    if (limits.maxDataTransfer !== undefined && metrics.dataTransfer !== undefined) {
      if (metrics.dataTransfer > limits.maxDataTransfer) {
        violations.push({
          limit: 'maxDataTransfer',
          budgetValue: limits.maxDataTransfer,
          actualValue: metrics.dataTransfer,
          exceeded: ((metrics.dataTransfer - limits.maxDataTransfer) / limits.maxDataTransfer) * 100,
          severity: this.getSeverity(metrics.dataTransfer, limits.maxDataTransfer),
        });
      }
    }

    return violations;
  }

  /**
   * Determine violation severity
   */
  private getSeverity(actualValue: number, budgetValue: number): 'warning' | 'error' | 'critical' {
    const exceeded = ((actualValue - budgetValue) / budgetValue) * 100;

    if (exceeded > 100) return 'critical'; // Over 2x budget
    if (exceeded > 50) return 'error'; // Over 1.5x budget
    return 'warning'; // Over budget but less than 1.5x
  }

  /**
   * Get budget compliance rate
   */
  public getComplianceRate(budgetId: string, days: number = 7): number {
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const relevantChecks = this.budgetChecks.filter(
      check => check.budgetId === budgetId && check.timestamp >= startTime
    );

    if (relevantChecks.length === 0) return 100;

    const passed = relevantChecks.filter(check => check.passed).length;
    return (passed / relevantChecks.length) * 100;
  }

  /**
   * Get budget trend
   */
  public getBudgetTrend(budgetId: string, period: 'day' | 'week' | 'month'): BudgetTrend | null {
    const budget = this.budgets.get(budgetId);
    if (!budget) return null;

    const periodMs = period === 'day' ? 24 * 60 * 60 * 1000 :
                     period === 'week' ? 7 * 24 * 60 * 60 * 1000 :
                     30 * 24 * 60 * 60 * 1000;

    const bucketSize = period === 'day' ? 60 * 60 * 1000 : // hourly for day
                       period === 'week' ? 24 * 60 * 60 * 1000 : // daily for week
                       24 * 60 * 60 * 1000; // daily for month

    const startTime = Date.now() - periodMs;
    const relevantChecks = this.budgetChecks.filter(
      check => check.budgetId === budgetId && check.timestamp >= startTime
    );

    // Group checks by time bucket
    const buckets = new Map<number, { passed: number; failed: number }>();

    relevantChecks.forEach(check => {
      const bucketTime = Math.floor(check.timestamp / bucketSize) * bucketSize;
      const bucket = buckets.get(bucketTime) || { passed: 0, failed: 0 };

      if (check.passed) {
        bucket.passed++;
      } else {
        bucket.failed++;
      }

      buckets.set(bucketTime, bucket);
    });

    // Convert to array
    const data = Array.from(buckets.entries())
      .map(([timestamp, counts]) => ({
        timestamp,
        passed: counts.passed,
        failed: counts.failed,
        complianceRate: (counts.passed / (counts.passed + counts.failed)) * 100,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      budgetId,
      metric: budget.metric,
      period,
      data,
    };
  }

  /**
   * Generate budget report
   */
  public generateReport(days: number = 7): BudgetReport {
    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const budgetStats = Array.from(this.budgets.values()).map(budget => {
      const checks = this.budgetChecks.filter(
        check => check.budgetId === budget.id && check.timestamp >= startTime
      );

      const passed = checks.filter(check => check.passed).length;
      const failed = checks.filter(check => !check.passed).length;

      const violations = checks
        .filter(check => !check.passed)
        .flatMap(check => check.violations);

      return {
        id: budget.id,
        name: budget.name,
        totalChecks: checks.length,
        passed,
        failed,
        complianceRate: checks.length > 0 ? (passed / checks.length) * 100 : 100,
        violations,
      };
    });

    const activeBudgets = Array.from(this.budgets.values()).filter(b => b.enabled).length;
    const totalChecks = budgetStats.reduce((sum, stat) => sum + stat.totalChecks, 0);
    const totalPassed = budgetStats.reduce((sum, stat) => sum + stat.passed, 0);

    const criticalViolations = budgetStats.reduce(
      (sum, stat) => sum + stat.violations.filter(v => v.severity === 'critical').length,
      0
    );

    return {
      period: { start: startTime, end: endTime },
      budgets: budgetStats,
      summary: {
        totalBudgets: this.budgets.size,
        activeBudgets,
        overallComplianceRate: totalChecks > 0 ? (totalPassed / totalChecks) * 100 : 100,
        criticalViolations,
      },
    };
  }

  /**
   * Get recent violations
   */
  public getRecentViolations(limit: number = 100): BudgetCheck[] {
    return this.budgetChecks
      .filter(check => !check.passed)
      .slice(-limit)
      .reverse();
  }

  /**
   * Save budgets to storage
   */
  private saveBudgets(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const budgetsArray = Array.from(this.budgets.values());
        localStorage.setItem('performanceBudgets', JSON.stringify(budgetsArray));
      } catch (error) {
        logger.warn('Failed to save budgets:', error);
      }
    }
  }

  /**
   * Load budgets from storage
   */
  private loadBudgets(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('performanceBudgets');
        if (saved) {
          const budgetsArray: PerformanceBudget[] = JSON.parse(saved);
          budgetsArray.forEach(budget => {
            this.budgets.set(budget.id, budget);
          });
        }
      } catch (error) {
        logger.warn('Failed to load budgets:', error);
      }
    }

    this.loadBudgetChecks();
  }

  /**
   * Save budget checks to storage
   */
  private saveBudgetChecks(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        // Save only recent checks to avoid storage issues
        localStorage.setItem(
          'performanceBudgetChecks',
          JSON.stringify(this.budgetChecks.slice(-1000))
        );
      } catch (error) {
        logger.warn('Failed to save budget checks:', error);
      }
    }
  }

  /**
   * Load budget checks from storage
   */
  private loadBudgetChecks(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('performanceBudgetChecks');
        if (saved) {
          this.budgetChecks = JSON.parse(saved);
        }
      } catch (error) {
        logger.warn('Failed to load budget checks:', error);
      }
    }
  }

  /**
   * Clear all data
   */
  public clearAll(): void {
    this.budgets.clear();
    this.budgetChecks = [];
    this.saveBudgets();
    this.saveBudgetChecks();
  }
}

// Export singleton instance
export const performanceBudgetManager = PerformanceBudgetManager.getInstance();
