export interface WorkflowMetrics {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  medianExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  successRate: number;
  errorRate: number;
  lastExecuted: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeMetrics {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  workflowId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  successRate: number;
  errorTypes: { [key: string]: number };
  performanceTrend: 'improving' | 'stable' | 'degrading';
  lastUpdated: Date;
}

export interface ExecutionMetrics {
  id: string;
  workflowId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'success' | 'failure' | 'timeout' | 'cancelled';
  nodesExecuted: number;
  totalNodes: number;
  executionPath: string[];
  errorDetails?: {
    nodeId: string;
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
  triggeredBy: string;
  environment: string;
}

export interface PerformanceReport {
  reportId: string;
  reportType: 'workflow' | 'node' | 'system' | 'custom';
  title: string;
  description: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: unknown;
  insights: ReportInsight[];
  recommendations: ReportRecommendation[];
  createdAt: Date;
  createdBy: string;
}

export interface ReportInsight {
  type: 'trend' | 'anomaly' | 'performance' | 'usage' | 'optimization';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  data: unknown;
}

export interface ReportRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'reliability' | 'cost' | 'security' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  implementation: string;
  estimatedImprovement: string;
}

export interface BusinessMetrics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  averageExecutionTime: number;
  systemUptime: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
  costMetrics: {
    totalCost: number;
    costPerExecution: number;
    costTrend: 'increasing' | 'stable' | 'decreasing';
  };
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowthRate: number;
  };
  timestamp: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
    threshold: number;
    timeWindow: number; // in minutes
  };
  actions: AlertAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: unknown;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  data: unknown;
}

/* eslint-disable @typescript-eslint/no-unused-vars */

import { realMetricsCollector } from './RealMetricsCollector';
import { logger } from './LoggingService';

export class AnalyticsService {
  private workflowMetrics: Map<string, WorkflowMetrics> = new Map();
  private realMetricsCollector = realMetricsCollector;
  private nodeMetrics: Map<string, NodeMetrics> = new Map();
  private executionMetrics: ExecutionMetrics[] = [];
  private businessMetrics: BusinessMetrics[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private reports: PerformanceReport[] = [];
  
  private metricsCollectionInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultMetrics();
    this.startMetricsCollection();
    this.initializeAlertRules();
  }

  // Workflow Analytics
  async trackWorkflowExecution(execution: ExecutionMetrics): Promise<void> {
    this.executionMetrics.push(execution);
    await this.updateWorkflowMetrics(execution);
    await this.updateNodeMetrics(execution);
    await this.checkAlertRules(execution);
  }

  async getWorkflowMetrics(workflowId?: string): Promise<WorkflowMetrics[]> {
    if (workflowId) {
      const metrics = this.workflowMetrics.get(workflowId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.workflowMetrics.values());
  }

  async getNodeMetrics(nodeId?: string): Promise<NodeMetrics[]> {
    if (nodeId) {
      const metrics = this.nodeMetrics.get(nodeId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.nodeMetrics.values());
  }

  async getExecutionHistory(filters?: {
    workflowId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ExecutionMetrics[]> {
    let filtered = this.executionMetrics;

    if (filters) {
      filtered = filtered.filter(execution => {
        if (filters.workflowId && execution.workflowId !== filters.workflowId) return false;
        if (filters.status && execution.status !== filters.status) return false;
        if (filters.startDate && execution.startTime < filters.startDate) return false;
        if (filters.endDate && execution.endTime > filters.endDate) return false;
        return true;
      });
    }

    const sorted = filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
  }

  // Performance Analysis
  async generatePerformanceReport(
    type: PerformanceReport['reportType'],
    dateRange: { start: Date; end: Date },
    filters?: unknown
  ): Promise<PerformanceReport> {
    const reportId = this.generateId();
    const report: PerformanceReport = {
      reportId,
      reportType: type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Performance Report`,
      description: `Performance analysis for ${type} from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}`,
      dateRange,
      metrics: await this.calculateReportMetrics(type, dateRange, filters),
      insights: await this.generateInsights(type, dateRange, filters),
      recommendations: await this.generateRecommendations(type, dateRange, filters),
      createdAt: new Date(),
      createdBy: 'system'
    };

    this.reports.push(report);
    return report;
  }

  async getBusinessMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<BusinessMetrics[]> {
    const start = new Date();

    switch (period) {
      case 'hour':
        start.setHours(start.getHours() - 24);
        break;
      case 'day':
        start.setDate(start.getDate() - 7);
        break;
      case 'week':
        start.setDate(start.getDate() - 30);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 12);
        break;
    }

    return this.businessMetrics.filter(metric => metric.timestamp >= start);
  }

  // Real-time Monitoring
  async getRealTimeMetrics(): Promise<{
    activeExecutions: number;
    queuedExecutions: number;
    systemLoad: number;
    errorRate: number;
    avgResponseTime: number;
    throughput: number;
  }> {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentExecutions = this.executionMetrics.filter(
      exec => exec.startTime >= oneMinuteAgo
    );

    const activeExecutions = recentExecutions.filter(
      exec => exec.status === 'success' || exec.status === 'failure'
    ).length;

    const errorRate = recentExecutions.length > 0
      ? (recentExecutions.filter(exec => exec.status === 'failure').length / recentExecutions.length) * 100
      : 0;

    const avgResponseTime = recentExecutions.length > 0
      ? recentExecutions.reduce((sum, exec) => sum + exec.duration, 0) / recentExecutions.length
      : 0;

    return {
      activeExecutions,
      queuedExecutions: 0, // Mock
      systemLoad: 65.5, // Mock
      errorRate,
      avgResponseTime,
      throughput: recentExecutions.length
    };
  }

  // Alerting System
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const alertRule: AlertRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.alertRules.set(alertRule.id, alertRule);
    return alertRule;
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  async getAlerts(filters?: {
    resolved?: boolean;
    severity?: string;
    ruleId?: string;
  }): Promise<Alert[]> {
    let filtered = this.alerts;

    if (filters) {
      filtered = filtered.filter(alert => {
        if (filters.resolved !== undefined && alert.resolved !== filters.resolved) return false;
        if (filters.severity && alert.severity !== filters.severity) return false;
        if (filters.ruleId && alert.ruleId !== filters.ruleId) return false;
        return true;
      });
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
    }
  }

  // Data Export
  async exportData(
    type: 'workflows' | 'executions' | 'metrics' | 'alerts',
    format: 'csv' | 'json' | 'xlsx',
    filters?: unknown
  ): Promise<{ data: unknown; filename: string }> {
    let data: unknown;
    let filename: string;

    switch (type) {
      case 'workflows':
        data = await this.getWorkflowMetrics();
        filename = `workflow_metrics_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      case 'executions':
        data = await this.getExecutionHistory(filters);
        filename = `execution_history_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      case 'metrics':
        data = await this.getBusinessMetrics();
        filename = `business_metrics_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      case 'alerts':
        data = await this.getAlerts(filters);
        filename = `alerts_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      default:
        throw new Error('Invalid export type');
    }

    // Format data based on requested format
    if (format === 'csv') {
      data = this.convertToCSV(data);
    } else if (format === 'xlsx') {
      data = this.convertToExcel(data);
    }

    return { data, filename };
  }

  // Custom Dashboards
  async createCustomDashboard(_config: {
    name: string;
    description: string;
    widgets: DashboardWidget[];
  }): Promise<string> {
    // Store dashboard config (implementation depends on storage solution)
    const dashboardId = this.generateId();
    return dashboardId;
  }

  // Private Methods
  private async updateWorkflowMetrics(execution: ExecutionMetrics): Promise<void> {
    const existing = this.workflowMetrics.get(execution.workflowId);

    if (existing) {
      existing.totalExecutions++;
      if (execution.status === 'success') {
        existing.successfulExecutions++;
      } else {
        existing.failedExecutions++;
      }

      existing.successRate = (existing.successfulExecutions / existing.totalExecutions) * 100;
      existing.errorRate = (existing.failedExecutions / existing.totalExecutions) * 100;

      // Update execution time statistics
      const durations = this.executionMetrics
        .filter(e => e.workflowId === execution.workflowId)
        .map(e => e.duration);

      existing.averageExecutionTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      existing.medianExecutionTime = this.calculateMedian(durations);
      existing.minExecutionTime = Math.min(...durations);
      existing.maxExecutionTime = Math.max(...durations);
      existing.lastExecuted = execution.endTime;
      existing.updatedAt = new Date();
    } else {
      const newMetrics: WorkflowMetrics = {
        workflowId: execution.workflowId,
        workflowName: `Workflow ${execution.workflowId}`,
        totalExecutions: 1,
        successfulExecutions: execution.status === 'success' ? 1 : 0,
        failedExecutions: execution.status === 'failure' ? 1 : 0,
        averageExecutionTime: execution.duration,
        medianExecutionTime: execution.duration,
        minExecutionTime: execution.duration,
        maxExecutionTime: execution.duration,
        successRate: execution.status === 'success' ? 100 : 0,
        errorRate: execution.status === 'failure' ? 100 : 0,
        lastExecuted: execution.endTime,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.workflowMetrics.set(execution.workflowId, newMetrics);
    }
  }

  private async updateNodeMetrics(execution: ExecutionMetrics): Promise<void> {
    execution.executionPath.forEach(nodeId => {
      // Update or create node metrics
      // Implementation details...
    });
  }

  private async checkAlertRules(execution: ExecutionMetrics): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      const shouldAlert = await this.evaluateAlertCondition(rule, execution);
      if (shouldAlert) {
        await this.createAlert(rule, execution);
      }
    }
  }

  private async evaluateAlertCondition(rule: AlertRule, execution: ExecutionMetrics): Promise<boolean> {
    const { metric, operator, threshold } = rule.condition;

    let value: number;
    switch (metric) {
      case 'execution_time':
        value = execution.duration;
        break;
      case 'error_rate': {
        const workflowMetrics = this.workflowMetrics.get(execution.workflowId);
        value = workflowMetrics?.errorRate || 0;
        break;
      }
      default:
        return false;
    }

    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      case 'ne':
        return value !== threshold;
      default:
        return false;
    }
  }

  private async createAlert(rule: AlertRule, execution: ExecutionMetrics): Promise<void> {
    const alert: Alert = {
      id: this.generateId(),
      ruleId: rule.id,
      title: rule.name,
      message: `Alert triggered: ${rule.description}`,
      severity: 'high',
      timestamp: new Date(),
      resolved: false,
      data: { execution }
    };

    this.alerts.push(alert);
    
    // Execute alert actions
    for (const action of rule.actions) {
      if (action.enabled) {
        await this.executeAlertAction(action, alert);
      }
    }
  }

  private async executeAlertAction(_action: AlertAction, _alert: Alert): Promise<void> {
    // Implementation depends on the action type
    logger.info(`Executing ${_action.type} alert for: ${_alert.title}`);
  }

  private async calculateReportMetrics(
    _type: PerformanceReport['reportType'],
    dateRange: { start: Date; end: Date },
    _filters?: unknown
  ): Promise<unknown> {
    const filteredExecutions = this.executionMetrics.filter(
      exec => exec.startTime >= dateRange.start && exec.endTime <= dateRange.end
    );

    return {
      totalExecutions: filteredExecutions.length,
      successfulExecutions: filteredExecutions.filter(e => e.status === 'success').length,
      failedExecutions: filteredExecutions.filter(e => e.status === 'failure').length,
      averageExecutionTime: filteredExecutions.reduce((sum, e) => sum + e.duration, 0) / filteredExecutions.length,
      // More metrics...
    };
  }

  private async generateInsights(
    _type: PerformanceReport['reportType'],
    _dateRange: { start: Date; end: Date },
    _filters?: unknown
  ): Promise<ReportInsight[]> {
    const insights: ReportInsight[] = [];

    // Example insight generation
    insights.push({
      type: 'performance',
      title: 'High Error Rate Detected',
      description: 'The error rate has increased by 15% compared to last period',
      severity: 'high',
      impact: 'May affect user experience and system reliability',
      data: { errorRate: 15.5, previousErrorRate: 10.2 }
    });

    return insights;
  }

  private async generateRecommendations(
    _type: PerformanceReport['reportType'],
    _dateRange: { start: Date; end: Date },
    _filters?: unknown
  ): Promise<ReportRecommendation[]> {
    const recommendations: ReportRecommendation[] = [];

    // Example recommendation generation
    recommendations.push({
      id: this.generateId(),
      title: 'Optimize Slow Workflows',
      description: 'Several workflows are taking longer than expected to execute',
      category: 'performance',
      priority: 'high',
      effort: 'medium',
      impact: 'high',
      implementation: 'Review and optimize slow-running nodes, consider parallel execution',
      estimatedImprovement: '30% reduction in execution time'
    });

    return recommendations;
  }

  private initializeDefaultMetrics(): void {
    // Initialize with some sample data
    const sampleMetrics: WorkflowMetrics = {
      workflowId: 'workflow-001',
      workflowName: 'Email Automation',
      totalExecutions: 1250,
      successfulExecutions: 1180,
      failedExecutions: 70,
      averageExecutionTime: 2500,
      medianExecutionTime: 2200,
      minExecutionTime: 800,
      maxExecutionTime: 8900,
      successRate: 94.4,
      errorRate: 5.6,
      lastExecuted: new Date(),
      createdAt: new Date(Date.now() - 86400000 * 30),
      updatedAt: new Date()
    };

    this.workflowMetrics.set(sampleMetrics.workflowId, sampleMetrics);
  }

  private startMetricsCollection(): void {
    // Collect business metrics every 5 minutes
    this.metricsCollectionInterval = setInterval(() => {
      this.collectBusinessMetrics();
    }, 300000);
  }

  destroy(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = undefined;
    }
  }

  private async collectBusinessMetrics(): Promise<void> {
    const metrics: BusinessMetrics = {
      totalWorkflows: this.workflowMetrics.size,
      activeWorkflows: Array.from(this.workflowMetrics.values()).filter(w => w.totalExecutions > 0).length,
      totalExecutions: this.executionMetrics.length,
      successfulExecutions: this.executionMetrics.filter(e => e.status === 'success').length,
      averageExecutionTime: this.executionMetrics.reduce((sum, e) => sum + e.duration, 0) / this.executionMetrics.length,
      systemUptime: 99.5,
      resourceUtilization: this.realMetricsCollector.getResourceUtilization(),
      costMetrics: {
        totalCost: this.realMetricsCollector.getCurrentCostMetrics().totalCost,
        costPerExecution: this.realMetricsCollector.getCurrentCostMetrics().costPerExecution,
        costTrend: this.realMetricsCollector.getCurrentCostMetrics().costTrend
      },
      userMetrics: {
        totalUsers: 125,
        activeUsers: 89,
        newUsers: 12,
        userGrowthRate: 8.5
      },
      timestamp: new Date()
    };

    this.businessMetrics.push(metrics);
    
    // Keep only last 1000 records
    if (this.businessMetrics.length > 1000) {
      this.businessMetrics.shift();
    }
  }

  private initializeAlertRules(): void {
    // Default alert rules
    const defaultRules: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'High Execution Time',
        description: 'Workflow execution time exceeds 30 seconds',
        enabled: true,
        condition: {
          metric: 'execution_time',
          operator: 'gt',
          threshold: 30000,
          timeWindow: 5
        },
        actions: [
          {
            type: 'email',
            config: { recipients: ['admin@example.com'] },
            enabled: true
          }
        ]
      },
      {
        name: 'High Error Rate',
        description: 'Error rate exceeds 10%',
        enabled: true,
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 10,
          timeWindow: 15
        },
        actions: [
          {
            type: 'slack',
            config: { channel: '#alerts' },
            enabled: true
          }
        ]
      }
    ];

    defaultRules.forEach(rule => {
      this.createAlertRule(rule);
    });
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private convertToCSV(data: unknown[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = (row as Record<string, unknown>)[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  private convertToExcel(data: unknown[]): unknown {
    // Implementation would require a library like SheetJS
    return data;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge' | 'map';
  title: string;
  config: unknown;
  position: { x: number; y: number; width: number; height: number };
}

// Singleton instance
export const analyticsService = new AnalyticsService();