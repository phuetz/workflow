/**
 * Budget Monitor
 * Monitor budgets and send alerts
 */

import type { CostBudget, BudgetAlert, DateRange } from '../../types/advanced-analytics';
import { costBreakdown } from './CostBreakdown';
import { logger } from '../../services/SimpleLogger';

export class BudgetMonitor {
  private budgets: Map<string, CostBudget> = new Map();
  private alertHandlers: Map<string, Set<(budget: CostBudget, alert: BudgetAlert) => void>> = new Map();

  /**
   * Create a new budget
   */
  createBudget(
    name: string,
    limit: number,
    period: 'daily' | 'weekly' | 'monthly',
    workflowIds?: string[]
  ): CostBudget {
    const budget: CostBudget = {
      id: this.generateId(),
      name,
      limit,
      period,
      current: 0,
      percentage: 0,
      alerts: [
        { threshold: 50, notified: false, channels: ['email'] },
        { threshold: 75, notified: false, channels: ['email', 'slack'] },
        { threshold: 90, notified: false, channels: ['email', 'slack', 'webhook'] },
        { threshold: 100, notified: false, channels: ['email', 'slack', 'webhook'] },
      ],
      workflowIds,
    };

    this.budgets.set(budget.id, budget);
    return budget;
  }

  /**
   * Update budget
   */
  updateBudget(budgetId: string, updates: Partial<CostBudget>): CostBudget | null {
    const budget = this.budgets.get(budgetId);
    if (!budget) return null;

    const updated = { ...budget, ...updates };
    this.budgets.set(budgetId, updated);
    return updated;
  }

  /**
   * Delete budget
   */
  deleteBudget(budgetId: string): boolean {
    return this.budgets.delete(budgetId);
  }

  /**
   * Get budget
   */
  getBudget(budgetId: string): CostBudget | null {
    return this.budgets.get(budgetId) || null;
  }

  /**
   * Get all budgets
   */
  getAllBudgets(): CostBudget[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Update budget usage
   */
  updateBudgetUsage(budgetId: string): void {
    const budget = this.budgets.get(budgetId);
    if (!budget) return;

    const dateRange = this.getDateRangeForPeriod(budget.period);
    const summary = costBreakdown.getCostSummary(dateRange);

    // Filter by workflows if specified
    let currentCost = summary.totalCost;
    if (budget.workflowIds && budget.workflowIds.length > 0) {
      currentCost = 0;
      budget.workflowIds.forEach(workflowId => {
        const workflowCost = costBreakdown.getWorkflowCostBreakdown(
          workflowId,
          dateRange
        );
        currentCost += workflowCost.totalCost;
      });
    }

    budget.current = currentCost;
    budget.percentage = (currentCost / budget.limit) * 100;

    // Check alerts
    this.checkAlerts(budget);

    this.budgets.set(budgetId, budget);
  }

  /**
   * Update all budgets
   */
  updateAllBudgets(): void {
    this.budgets.forEach((budget, id) => {
      this.updateBudgetUsage(id);
    });
  }

  /**
   * Check budget alerts
   */
  private checkAlerts(budget: CostBudget): void {
    budget.alerts.forEach(alert => {
      if (budget.percentage >= alert.threshold && !alert.notified) {
        // Mark as notified
        alert.notified = true;
        alert.notifiedAt = new Date();

        // Trigger alert handlers
        this.triggerAlert(budget, alert);

        logger.debug(
          `Budget alert: ${budget.name} reached ${alert.threshold}% (${budget.current.toFixed(2)}/${budget.limit})`
        );
      }

      // Reset notification if usage drops below threshold
      if (budget.percentage < alert.threshold - 5 && alert.notified) {
        alert.notified = false;
        alert.notifiedAt = undefined;
      }
    });
  }

  /**
   * Trigger alert
   */
  private triggerAlert(budget: CostBudget, alert: BudgetAlert): void {
    const handlers = this.alertHandlers.get(budget.id);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(budget, alert);
        } catch (error) {
          logger.error('Error in alert handler:', error);
        }
      });
    }

    // Send notifications based on channels
    alert.channels.forEach(channel => {
      this.sendNotification(channel, budget, alert);
    });
  }

  /**
   * Send notification
   */
  private sendNotification(
    channel: 'email' | 'slack' | 'webhook',
    budget: CostBudget,
    alert: BudgetAlert
  ): void {
    const message = {
      budgetName: budget.name,
      threshold: alert.threshold,
      current: budget.current,
      limit: budget.limit,
      percentage: budget.percentage,
      period: budget.period,
    };

    switch (channel) {
      case 'email':
        // Send email notification
        logger.debug('Email notification:', message);
        break;
      case 'slack':
        // Send Slack notification
        logger.debug('Slack notification:', message);
        break;
      case 'webhook':
        // Send webhook notification
        logger.debug('Webhook notification:', message);
        break;
    }
  }

  /**
   * Subscribe to alerts
   */
  onAlert(
    budgetId: string,
    handler: (budget: CostBudget, alert: BudgetAlert) => void
  ): void {
    if (!this.alertHandlers.has(budgetId)) {
      this.alertHandlers.set(budgetId, new Set());
    }
    this.alertHandlers.get(budgetId)?.add(handler);
  }

  /**
   * Unsubscribe from alerts
   */
  offAlert(
    budgetId: string,
    handler: (budget: CostBudget, alert: BudgetAlert) => void
  ): void {
    this.alertHandlers.get(budgetId)?.delete(handler);
  }

  /**
   * Get budgets approaching limit
   */
  getBudgetsApproachingLimit(threshold: number = 80): CostBudget[] {
    return Array.from(this.budgets.values()).filter(
      budget => budget.percentage >= threshold
    );
  }

  /**
   * Get budgets over limit
   */
  getBudgetsOverLimit(): CostBudget[] {
    return Array.from(this.budgets.values()).filter(
      budget => budget.percentage >= 100
    );
  }

  /**
   * Get date range for period
   */
  private getDateRangeForPeriod(period: 'daily' | 'weekly' | 'monthly'): DateRange {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return { start, end };
  }

  /**
   * Get projected cost
   */
  getProjectedCost(budgetId: string): number | null {
    const budget = this.budgets.get(budgetId);
    if (!budget) return null;

    const dateRange = this.getDateRangeForPeriod(budget.period);
    const now = new Date();

    const elapsedTime = now.getTime() - dateRange.start.getTime();
    const totalTime = dateRange.end.getTime() - dateRange.start.getTime();

    if (elapsedTime <= 0) return 0;

    const percentageElapsed = elapsedTime / totalTime;
    const projectedCost = budget.current / percentageElapsed;

    return projectedCost;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(budgetId: string): number | null {
    const budget = this.budgets.get(budgetId);
    if (!budget) return null;

    return Math.max(0, budget.limit - budget.current);
  }

  /**
   * Export budgets
   */
  export(): CostBudget[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Import budgets
   */
  import(budgets: CostBudget[]): void {
    budgets.forEach(budget => {
      this.budgets.set(budget.id, budget);
    });
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const budgetMonitor = new BudgetMonitor();
