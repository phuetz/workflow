/**
 * Cost Attribution Engine
 *
 * Tracks and attributes costs across agents, workflows, users, teams, and organizations.
 * Provides real-time cost tracking, budgeting, forecasting, and alerts.
 */

import { EventEmitter } from 'events';
import {
  CostAttribution,
  CostBreakdown,
  CostCategory,
  CostTrends,
  AlertSeverity,
} from './types/observability';

/**
 * Cost entry for tracking
 */
interface CostEntry {
  id: string;
  timestamp: number;
  amount: number;
  category: CostCategory;
  agentId?: string;
  workflowId?: string;
  userId?: string;
  teamId?: string;
  organizationId?: string;
  metadata: Record<string, any>;
}

/**
 * Budget configuration
 */
interface BudgetConfig {
  id: string;
  name: string;
  limit: number;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  scope: {
    agentIds?: string[];
    workflowIds?: string[];
    userIds?: string[];
    teamIds?: string[];
    organizationIds?: string[];
  };
  alertThresholds: number[]; // [50, 80, 90, 100] percentages
  enabled: boolean;
}

/**
 * Budget status
 */
interface BudgetStatus {
  budgetId: string;
  current: number;
  limit: number;
  percentage: number;
  remaining: number;
  status: 'ok' | 'warning' | 'exceeded';
  projectedEnd: number; // When budget will be exceeded
}

/**
 * Cost attribution engine implementation
 */
export class CostAttributionEngine extends EventEmitter {
  private costs: Map<string, CostEntry>;
  private budgets: Map<string, BudgetConfig>;
  private budgetAlerts: Map<string, Set<number>>; // Track which thresholds have been alerted
  private aggregationCache: Map<string, CostAttribution>;
  private cacheExpiry: number = 60000; // 1 minute

  constructor() {
    super();
    this.costs = new Map();
    this.budgets = new Map();
    this.budgetAlerts = new Map();
    this.aggregationCache = new Map();

    this.startAggregationTask();
  }

  /**
   * Record a cost entry
   */
  recordCost(
    amount: number,
    category: CostCategory,
    metadata: {
      agentId?: string;
      workflowId?: string;
      userId?: string;
      teamId?: string;
      organizationId?: string;
      [key: string]: any;
    }
  ): string {
    const id = this.generateCostId();
    const entry: CostEntry = {
      id,
      timestamp: Date.now(),
      amount,
      category,
      agentId: metadata.agentId,
      workflowId: metadata.workflowId,
      userId: metadata.userId,
      teamId: metadata.teamId,
      organizationId: metadata.organizationId,
      metadata,
    };

    this.costs.set(id, entry);

    // Invalidate cache
    this.aggregationCache.clear();

    // Check budgets
    this.checkBudgets(entry);

    this.emit('cost:recorded', entry);

    return id;
  }

  /**
   * Get cost attribution for a time period
   */
  async getAttribution(
    startTime: number,
    endTime: number,
    scope?: {
      agentIds?: string[];
      workflowIds?: string[];
      userIds?: string[];
      teamIds?: string[];
      organizationIds?: string[];
    }
  ): Promise<CostAttribution> {
    const cacheKey = `${startTime}_${endTime}_${JSON.stringify(scope || {})}`;
    const cached = this.aggregationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached;
    }

    const filteredCosts = this.filterCosts(startTime, endTime, scope);

    const total = filteredCosts.reduce((sum, c) => sum + c.amount, 0);

    const byAgent: Record<string, number> = {};
    const byWorkflow: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const byTeam: Record<string, number> = {};
    const byOrganization: Record<string, number> = {};
    const byCategory: Record<CostCategory, number> = {
      llm: 0,
      compute: 0,
      storage: 0,
      network: 0,
      external: 0,
    };

    for (const cost of filteredCosts) {
      if (cost.agentId) {
        byAgent[cost.agentId] = (byAgent[cost.agentId] || 0) + cost.amount;
      }
      if (cost.workflowId) {
        byWorkflow[cost.workflowId] = (byWorkflow[cost.workflowId] || 0) + cost.amount;
      }
      if (cost.userId) {
        byUser[cost.userId] = (byUser[cost.userId] || 0) + cost.amount;
      }
      if (cost.teamId) {
        byTeam[cost.teamId] = (byTeam[cost.teamId] || 0) + cost.amount;
      }
      if (cost.organizationId) {
        byOrganization[cost.organizationId] = (byOrganization[cost.organizationId] || 0) + cost.amount;
      }
      byCategory[cost.category] += cost.amount;
    }

    const trends = this.calculateTrends(startTime, endTime);

    const attribution: CostAttribution = {
      id: this.generateCostId(),
      timestamp: Date.now(),
      period: { start: startTime, end: endTime },
      total,
      byAgent,
      byWorkflow,
      byUser,
      byTeam,
      byOrganization,
      byCategory,
      currency: 'USD',
      trends,
    };

    this.aggregationCache.set(cacheKey, attribution);

    return attribution;
  }

  /**
   * Create a budget
   */
  createBudget(config: Omit<BudgetConfig, 'id'>): string {
    const id = this.generateBudgetId();
    const budget: BudgetConfig = { id, ...config };

    this.budgets.set(id, budget);
    this.budgetAlerts.set(id, new Set());

    this.emit('budget:created', budget);

    return id;
  }

  /**
   * Update a budget
   */
  updateBudget(id: string, updates: Partial<BudgetConfig>): void {
    const budget = this.budgets.get(id);
    if (!budget) {
      throw new Error(`Budget not found: ${id}`);
    }

    Object.assign(budget, updates);

    this.emit('budget:updated', budget);
  }

  /**
   * Delete a budget
   */
  deleteBudget(id: string): void {
    this.budgets.delete(id);
    this.budgetAlerts.delete(id);

    this.emit('budget:deleted', id);
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(budgetId: string): Promise<BudgetStatus> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      throw new Error(`Budget not found: ${budgetId}`);
    }

    const period = this.getBudgetPeriod(budget.period);
    const costs = this.filterCosts(period.start, period.end, budget.scope);
    const current = costs.reduce((sum, c) => sum + c.amount, 0);

    const percentage = (current / budget.limit) * 100;
    const remaining = Math.max(0, budget.limit - current);

    let status: 'ok' | 'warning' | 'exceeded' = 'ok';
    if (percentage >= 100) {
      status = 'exceeded';
    } else if (percentage >= 80) {
      status = 'warning';
    }

    // Calculate projected end time
    const timeElapsed = Date.now() - period.start;
    const burnRate = current / timeElapsed;
    const projectedEnd = period.start + (budget.limit / burnRate);

    return {
      budgetId,
      current,
      limit: budget.limit,
      percentage,
      remaining,
      status,
      projectedEnd,
    };
  }

  /**
   * Get all budgets
   */
  getBudgets(): BudgetConfig[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Get cost breakdown by category
   */
  getCostByCategory(
    startTime: number,
    endTime: number,
    scope?: any
  ): Record<CostCategory, number> {
    const costs = this.filterCosts(startTime, endTime, scope);
    const breakdown: Record<CostCategory, number> = {
      llm: 0,
      compute: 0,
      storage: 0,
      network: 0,
      external: 0,
    };

    for (const cost of costs) {
      breakdown[cost.category] += cost.amount;
    }

    return breakdown;
  }

  /**
   * Get top cost drivers
   */
  getTopCostDrivers(
    startTime: number,
    endTime: number,
    by: 'agent' | 'workflow' | 'user',
    limit: number = 10
  ): Array<{ id: string; cost: number; percentage: number }> {
    const costs = this.filterCosts(startTime, endTime);
    const total = costs.reduce((sum, c) => sum + c.amount, 0);

    const costMap: Record<string, number> = {};

    for (const cost of costs) {
      const id = by === 'agent' ? cost.agentId :
                 by === 'workflow' ? cost.workflowId :
                 cost.userId;

      if (id) {
        costMap[id] = (costMap[id] || 0) + cost.amount;
      }
    }

    return Object.entries(costMap)
      .map(([id, cost]) => ({
        id,
        cost,
        percentage: (cost / total) * 100,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  /**
   * Get cost forecast
   */
  getForecast(days: number): number {
    const now = Date.now();
    const last30Days = now - 30 * 24 * 60 * 60 * 1000;
    const costs = this.filterCosts(last30Days, now);

    const dailyAverage = costs.reduce((sum, c) => sum + c.amount, 0) / 30;
    return dailyAverage * days;
  }

  /**
   * Export costs to CSV
   */
  exportToCSV(startTime: number, endTime: number): string {
    const costs = this.filterCosts(startTime, endTime);

    const headers = [
      'Timestamp',
      'Amount',
      'Category',
      'Agent ID',
      'Workflow ID',
      'User ID',
      'Team ID',
      'Organization ID',
    ];

    const rows = costs.map(c => [
      new Date(c.timestamp).toISOString(),
      c.amount.toFixed(4),
      c.category,
      c.agentId || '',
      c.workflowId || '',
      c.userId || '',
      c.teamId || '',
      c.organizationId || '',
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');
  }

  /**
   * Clear all cost data
   */
  clear(): void {
    this.costs.clear();
    this.aggregationCache.clear();
  }

  /**
   * Filter costs by time and scope
   */
  private filterCosts(
    startTime: number,
    endTime: number,
    scope?: {
      agentIds?: string[];
      workflowIds?: string[];
      userIds?: string[];
      teamIds?: string[];
      organizationIds?: string[];
    }
  ): CostEntry[] {
    return Array.from(this.costs.values()).filter(c => {
      if (c.timestamp < startTime || c.timestamp > endTime) {
        return false;
      }

      if (scope) {
        if (scope.agentIds && c.agentId && !scope.agentIds.includes(c.agentId)) {
          return false;
        }
        if (scope.workflowIds && c.workflowId && !scope.workflowIds.includes(c.workflowId)) {
          return false;
        }
        if (scope.userIds && c.userId && !scope.userIds.includes(c.userId)) {
          return false;
        }
        if (scope.teamIds && c.teamId && !scope.teamIds.includes(c.teamId)) {
          return false;
        }
        if (scope.organizationIds && c.organizationId && !scope.organizationIds.includes(c.organizationId)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate cost trends
   */
  private calculateTrends(startTime: number, endTime: number): CostTrends {
    const now = Date.now();
    const periodDays = (endTime - startTime) / (24 * 60 * 60 * 1000);

    const costs = this.filterCosts(startTime, endTime);
    const total = costs.reduce((sum, c) => sum + c.amount, 0);

    const dailyAverage = total / periodDays;
    const weeklyAverage = dailyAverage * 7;
    const monthlyAverage = dailyAverage * 30;

    // Calculate growth compared to previous period
    const previousPeriodStart = startTime - (endTime - startTime);
    const previousCosts = this.filterCosts(previousPeriodStart, startTime);
    const previousTotal = previousCosts.reduce((sum, c) => sum + c.amount, 0);

    const growth = previousTotal > 0
      ? ((total - previousTotal) / previousTotal) * 100
      : 0;

    return {
      dailyAverage,
      weeklyAverage,
      monthlyAverage,
      growth,
      forecast30Days: dailyAverage * 30,
      forecast90Days: dailyAverage * 90,
    };
  }

  /**
   * Get budget period start and end times
   */
  private getBudgetPeriod(period: BudgetConfig['period']): { start: number; end: number } {
    const now = Date.now();
    const date = new Date(now);

    switch (period) {
      case 'hourly':
        date.setMinutes(0, 0, 0);
        return {
          start: date.getTime(),
          end: date.getTime() + 60 * 60 * 1000,
        };

      case 'daily':
        date.setHours(0, 0, 0, 0);
        return {
          start: date.getTime(),
          end: date.getTime() + 24 * 60 * 60 * 1000,
        };

      case 'weekly':
        const day = date.getDay();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);
        return {
          start: date.getTime(),
          end: date.getTime() + 7 * 24 * 60 * 60 * 1000,
        };

      case 'monthly':
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        const nextMonth = new Date(date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return {
          start: date.getTime(),
          end: nextMonth.getTime(),
        };
    }
  }

  /**
   * Check budgets and send alerts
   */
  private async checkBudgets(cost: CostEntry): Promise<void> {
    for (const [budgetId, budget] of this.budgets.entries()) {
      if (!budget.enabled) {
        continue;
      }

      // Check if cost matches budget scope
      if (!this.costMatchesScope(cost, budget.scope)) {
        continue;
      }

      const status = await this.getBudgetStatus(budgetId);

      // Check alert thresholds
      const alerts = this.budgetAlerts.get(budgetId)!;
      for (const threshold of budget.alertThresholds) {
        if (status.percentage >= threshold && !alerts.has(threshold)) {
          alerts.add(threshold);

          const severity: AlertSeverity =
            threshold >= 100 ? 'critical' :
            threshold >= 90 ? 'high' :
            threshold >= 80 ? 'medium' : 'low';

          this.emit('budget:alert', {
            budgetId,
            budget,
            status,
            threshold,
            severity,
          });
        }
      }

      // Reset alerts if budget resets
      if (status.percentage < Math.min(...budget.alertThresholds)) {
        alerts.clear();
      }
    }
  }

  /**
   * Check if cost matches budget scope
   */
  private costMatchesScope(cost: CostEntry, scope: BudgetConfig['scope']): boolean {
    if (scope.agentIds && cost.agentId && !scope.agentIds.includes(cost.agentId)) {
      return false;
    }
    if (scope.workflowIds && cost.workflowId && !scope.workflowIds.includes(cost.workflowId)) {
      return false;
    }
    if (scope.userIds && cost.userId && !scope.userIds.includes(cost.userId)) {
      return false;
    }
    if (scope.teamIds && cost.teamId && !scope.teamIds.includes(cost.teamId)) {
      return false;
    }
    if (scope.organizationIds && cost.organizationId && !scope.organizationIds.includes(cost.organizationId)) {
      return false;
    }
    return true;
  }

  /**
   * Start background aggregation task
   */
  private startAggregationTask(): void {
    setInterval(() => {
      // Clear expired cache entries
      this.aggregationCache.clear();
    }, this.cacheExpiry);
  }

  /**
   * Generate cost ID
   */
  private generateCostId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate budget ID
   */
  private generateBudgetId(): string {
    return `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default CostAttributionEngine;
