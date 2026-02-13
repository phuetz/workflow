/**
 * DashboardManager - Manages executive dashboards
 */

import { EventEmitter } from 'events';
import { ComplianceFramework } from '../../../types/compliance';
import type {
  ExecutiveDashboard,
  DashboardWidget,
  DrilldownConfig,
  DashboardFilter,
  StakeholderView,
  DashboardOptions,
} from './types';

/**
 * DashboardManager handles executive dashboard operations
 */
export class DashboardManager extends EventEmitter {
  private dashboards: Map<string, ExecutiveDashboard> = new Map();

  /**
   * Create an executive dashboard
   */
  async createExecutiveDashboard(options: DashboardOptions): Promise<ExecutiveDashboard> {
    const dashboardId = this.generateId('dashboard');

    const widgets = this.generateDashboardWidgets(
      options.stakeholderView,
      options.frameworks
    );

    const drilldowns = this.generateDrilldownConfigs(widgets);
    const filters = this.generateDashboardFilters(options.frameworks);

    const dashboard: ExecutiveDashboard = {
      id: dashboardId,
      title: options.title,
      generatedAt: new Date(),
      stakeholderView: options.stakeholderView,
      widgets,
      drilldowns,
      filters,
      refreshInterval: 300000, // 5 minutes
    };

    this.dashboards.set(dashboardId, dashboard);
    this.emit('dashboard:created', { dashboardId, dashboard });

    return dashboard;
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(dashboardId: string): Promise<Record<string, unknown>> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const data: Record<string, unknown> = {};

    for (const widget of dashboard.widgets) {
      data[widget.id] = await this.getWidgetData(widget);
    }

    return data;
  }

  /**
   * Get dashboard by ID
   */
  getDashboard(dashboardId: string): ExecutiveDashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Get all dashboards
   */
  getDashboards(): ExecutiveDashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Generate dashboard widgets
   */
  private generateDashboardWidgets(
    stakeholderView: StakeholderView,
    frameworks: ComplianceFramework[]
  ): DashboardWidget[] {
    const widgets: DashboardWidget[] = [
      {
        id: 'widget_score',
        type: 'gauge',
        title: 'Overall Compliance Score',
        position: { x: 0, y: 0, width: 4, height: 2 },
        config: {
          dataSource: 'compliance_score',
          format: 'percentage',
          thresholds: [
            { value: 90, color: '#22c55e', label: 'Excellent' },
            { value: 70, color: '#eab308', label: 'Good' },
            { value: 50, color: '#f97316', label: 'Needs Improvement' },
            { value: 0, color: '#ef4444', label: 'Critical' },
          ],
        },
        drilldownId: 'drilldown_score',
      },
      {
        id: 'widget_trends',
        type: 'chart',
        title: 'Compliance Trends',
        position: { x: 4, y: 0, width: 8, height: 2 },
        config: {
          dataSource: 'compliance_trends',
          chartType: 'line',
          colors: ['#3b82f6', '#22c55e', '#eab308'],
        },
      },
      {
        id: 'widget_gaps',
        type: 'table',
        title: 'Top Gaps',
        position: { x: 0, y: 2, width: 6, height: 3 },
        config: {
          dataSource: 'top_gaps',
        },
        drilldownId: 'drilldown_gaps',
      },
      {
        id: 'widget_heatmap',
        type: 'heatmap',
        title: 'Risk Heat Map',
        position: { x: 6, y: 2, width: 6, height: 3 },
        config: {
          dataSource: 'risk_heatmap',
        },
      },
    ];

    // Add stakeholder-specific widgets
    if (stakeholderView === 'board' as StakeholderView) {
      widgets.push({
        id: 'widget_executive_summary',
        type: 'list',
        title: 'Key Insights for Board',
        position: { x: 0, y: 5, width: 12, height: 2 },
        config: {
          dataSource: 'executive_insights',
        },
      });
    }

    return widgets;
  }

  /**
   * Generate drilldown configs
   */
  private generateDrilldownConfigs(widgets: DashboardWidget[]): DrilldownConfig[] {
    return widgets
      .filter(w => w.drilldownId)
      .map(w => ({
        id: w.drilldownId!,
        title: `${w.title} Details`,
        parentWidgetId: w.id,
        dataSource: `${w.config.dataSource}_detail`,
        columns: ['name', 'status', 'score', 'lastAssessed'],
        filters: [],
      }));
  }

  /**
   * Generate dashboard filters
   */
  private generateDashboardFilters(frameworks: ComplianceFramework[]): DashboardFilter[] {
    return [
      {
        field: 'framework',
        label: 'Framework',
        type: 'multiselect',
        options: frameworks.map(f => ({ value: f, label: f })),
        defaultValue: frameworks,
      },
      {
        field: 'dateRange',
        label: 'Date Range',
        type: 'daterange',
        defaultValue: { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
      },
      {
        field: 'status',
        label: 'Status',
        type: 'multiselect',
        options: [
          { value: 'compliant', label: 'Compliant' },
          { value: 'non_compliant', label: 'Non-Compliant' },
          { value: 'in_progress', label: 'In Progress' },
        ],
      },
    ];
  }

  /**
   * Get widget data
   */
  private async getWidgetData(widget: DashboardWidget): Promise<unknown> {
    switch (widget.type) {
      case 'gauge':
        return { value: 82.5 };
      case 'chart':
        return { labels: [], datasets: [] };
      case 'table':
        return { rows: [] };
      case 'heatmap':
        return { cells: [] };
      default:
        return {};
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
