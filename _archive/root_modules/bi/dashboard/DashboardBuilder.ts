import { EventEmitter } from 'events';

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'kpi' | 'table' | 'map' | 'text' | 'image' | 'filter' | 'custom';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: {
    dataSource?: string;
    query?: string;
    metrics?: string[];
    dimensions?: string[];
    visualization?: {
      type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'treemap' | 'sankey';
      options?: unknown;
    };
    refresh?: {
      enabled: boolean;
      interval: number;
    };
    interaction?: {
      drillDown?: boolean;
      crossFilter?: boolean;
      export?: boolean;
    };
  };
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    padding?: number;
    borderRadius?: number;
  };
  dependencies?: string[];
  isVisible: boolean;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  category: string;
  layout: {
    type: 'grid' | 'freeform' | 'responsive';
    columns?: number;
    rowHeight?: number;
    breakpoints?: {
      lg?: number;
      md?: number;
      sm?: number;
    };
  };
  widgets: DashboardWidget[];
  theme: {
    mode: 'light' | 'dark' | 'auto';
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: number;
  };
  filters: Array<{
    id: string;
    name: string;
    type: 'date' | 'select' | 'multiselect' | 'range' | 'search';
    dimension: string;
    defaultValue?: unknown;
    options?: unknown[];
    isGlobal: boolean;
  }>;
  parameters: { [key: string]: unknown };
  permissions: {
    viewers: string[];
    editors: string[];
    isPublic: boolean;
  };
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isActive: boolean;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  config: Partial<Dashboard>;
  requiredDataSources: string[];
  tags: string[];
  popularity: number;
  rating: number;
  downloads: number;
}

export interface DashboardBuilderConfig {
  templates: DashboardTemplate[];
  widgetTypes: Array<{
    type: string;
    name: string;
    icon: string;
    defaultConfig: unknown;
  }>;
  visualizations: Array<{
    type: string;
    name: string;
    supportedDataTypes: string[];
    minDimensions: number;
    maxDimensions: number;
    minMetrics: number;
    maxMetrics: number;
  }>;
  themes: Array<{
    id: string;
    name: string;
    config: unknown;
  }>;
  gridOptions: {
    defaultColumns: number;
    defaultRowHeight: number;
    minColumns: number;
    maxColumns: number;
    snapToGrid: boolean;
  };
  features: {
    autoLayout: boolean;
    responsiveDesign: boolean;
    realTimeUpdates: boolean;
    collaboration: boolean;
    versionControl: boolean;
  };
}

export class DashboardBuilder extends EventEmitter {
  private config: DashboardBuilderConfig;
  private dashboards: Map<string, Dashboard> = new Map();
  private templates: Map<string, DashboardTemplate> = new Map();
  private activeEdits: Map<string, { dashboard: Dashboard; user: string; timestamp: Date }> = new Map();
  private widgetLibrary: Map<string, unknown> = new Map();
  private layoutEngine: LayoutEngine;
  private isInitialized = false;

  constructor(config: DashboardBuilderConfig) {
    super();
    this.config = config;
    this.layoutEngine = new LayoutEngine(config.gridOptions);
  }

  public async initialize(): Promise<void> {
    try {
      // Load templates
      for (const template of this.config.templates) {
        this.templates.set(template.id, template);
      }

      // Initialize widget library
      this.initializeWidgetLibrary();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async createDashboard(
    spec: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
    templateId?: string
  ): Promise<string> {
    const id = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let dashboard: Dashboard;
    
    if (templateId) {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      dashboard = {
        ...template.config,
        ...spec,
        id,
        widgets: template.config.widgets || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      } as Dashboard;
    } else {
      dashboard = {
        ...spec,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };
    }

    this.dashboards.set(id, dashboard);
    this.emit('dashboardCreated', { dashboard });
    
    return id;
  }

  public async addWidget(
    dashboardId: string,
    widgetSpec: Omit<DashboardWidget, 'id'>,
    options: {
      autoPosition?: boolean;
      beforeWidgetId?: string;
    } = {}
  ): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const widget: DashboardWidget = {
      ...widgetSpec,
      id: widgetId
    };

    // Auto-position if needed
    if (options.autoPosition || !widget.position) {
      widget.position = this.layoutEngine.findOptimalPosition(
        dashboard.widgets,
        widget.position?.w || 4,
        widget.position?.h || 3
      );
    }

    // Validate widget position
    if (this.layoutEngine.hasCollisions(widget, dashboard.widgets)) {
      // Try to resolve collisions
      widget.position = this.layoutEngine.resolveCollisions(widget, dashboard.widgets);
    }

    // Add widget
    if (options.beforeWidgetId) {
      const index = dashboard.widgets.findIndex(w => w.id === options.beforeWidgetId);
      if (index >= 0) {
        dashboard.widgets.splice(index, 0, widget);
      } else {
        dashboard.widgets.push(widget);
      }
    } else {
      dashboard.widgets.push(widget);
    }

    dashboard.updatedAt = new Date();
    dashboard.version++;

    this.emit('widgetAdded', { dashboardId, widget });
    
    return widgetId;
  }

  public async updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex < 0) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    const widget = dashboard.widgets[widgetIndex];
    const updatedWidget = { ...widget, ...updates };

    // Validate position if changed
    if (updates.position && this.layoutEngine.hasCollisions(updatedWidget, dashboard.widgets.filter(w => w.id !== widgetId))) {
      throw new Error('Widget position would cause collisions');
    }

    dashboard.widgets[widgetIndex] = updatedWidget;
    dashboard.updatedAt = new Date();
    dashboard.version++;

    this.emit('widgetUpdated', { dashboardId, widgetId, updates });
  }

  public async removeWidget(dashboardId: string, widgetId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex < 0) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    dashboard.widgets.splice(widgetIndex, 1);
    dashboard.updatedAt = new Date();
    dashboard.version++;

    this.emit('widgetRemoved', { dashboardId, widgetId });
  }

  public async duplicateWidget(
    dashboardId: string,
    widgetId: string,
    options: {
      offsetX?: number;
      offsetY?: number;
    } = {}
  ): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    const newWidget = {
      ...widget,
      position: {
        x: widget.position.x + (options.offsetX || 0),
        y: widget.position.y + (options.offsetY || widget.position.h),
        w: widget.position.w,
        h: widget.position.h
      }
    };

    return this.addWidget(dashboardId, newWidget, { autoPosition: true });
  }

  public async applyTemplate(dashboardId: string, templateId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Apply template configuration
    Object.assign(dashboard, {
      ...template.config,
      id: dashboard.id,
      name: dashboard.name,
      createdAt: dashboard.createdAt,
      createdBy: dashboard.createdBy,
      updatedAt: new Date(),
      version: dashboard.version + 1
    });

    this.emit('templateApplied', { dashboardId, templateId });
  }

  public async optimizeLayout(dashboardId: string, algorithm: 'compact' | 'flow' | 'masonry' = 'compact'): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const optimizedLayout = this.layoutEngine.optimize(dashboard.widgets, algorithm);
    
    dashboard.widgets = optimizedLayout;
    dashboard.updatedAt = new Date();
    dashboard.version++;

    this.emit('layoutOptimized', { dashboardId, algorithm });
  }

  public async exportDashboard(
    dashboardId: string,
    format: 'json' | 'yaml' | 'template' = 'json'
  ): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    let exported: string;

    switch (format) {
      case 'json':
        exported = JSON.stringify(dashboard, null, 2);
        break;
      
      case 'yaml':
        // Mock YAML export - in real implementation would use yaml library
        exported = `name: ${dashboard.name}\nwidgets: ${dashboard.widgets.length}`;
        break;
      
      case 'template': {
        const template: DashboardTemplate = {
          id: `template_${dashboard.id}`,
          name: `${dashboard.name} Template`,
          description: dashboard.description,
          category: dashboard.category,
          config: {
            layout: dashboard.layout,
            theme: dashboard.theme,
            widgets: dashboard.widgets.map(w => ({ ...w, id: undefined } as DashboardWidget))
          },
          requiredDataSources: Array.from(new Set(dashboard.widgets.map(w => w.config.dataSource).filter(Boolean))),
          tags: dashboard.tags,
          popularity: 0,
          rating: 0,
          downloads: 0
        };
        exported = JSON.stringify(template, null, 2);
        break;
      }
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    this.emit('dashboardExported', { dashboardId, format });
    return exported;
  }

  public async importDashboard(
    data: string,
    format: 'json' | 'yaml' = 'json',
    options: {
      overwriteId?: string;
      merge?: boolean;
    } = {}
  ): Promise<string> {
    let dashboardData: Partial<Dashboard>;

    switch (format) {
      case 'json':
        dashboardData = JSON.parse(data);
        break;
      
      case 'yaml':
        // Mock YAML import - in real implementation would use yaml library
        throw new Error('YAML import not yet implemented');
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    if (options.overwriteId) {
      const existing = this.dashboards.get(options.overwriteId);
      if (!existing) {
        throw new Error(`Dashboard not found: ${options.overwriteId}`);
      }

      if (options.merge) {
        // Merge widgets
        existing.widgets = [...existing.widgets, ...(dashboardData.widgets || [])];
      } else {
        // Overwrite
        Object.assign(existing, dashboardData, {
          id: existing.id,
          updatedAt: new Date(),
          version: existing.version + 1
        });
      }

      this.emit('dashboardImported', { dashboardId: options.overwriteId, merged: options.merge });
      return options.overwriteId;
    } else {
      // Create new dashboard
      return this.createDashboard(dashboardData as Dashboard);
    }
  }

  public async startCollaboration(dashboardId: string, userId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    this.activeEdits.set(dashboardId, {
      dashboard,
      user: userId,
      timestamp: new Date()
    });

    this.emit('collaborationStarted', { dashboardId, userId });
  }

  public async endCollaboration(dashboardId: string): Promise<void> {
    this.activeEdits.delete(dashboardId);
    this.emit('collaborationEnded', { dashboardId });
  }

  public getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  public getDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  public getTemplates(): DashboardTemplate[] {
    return Array.from(this.templates.values());
  }

  public async shutdown(): Promise<void> {
    this.isInitialized = false;
    this.activeEdits.clear();
    this.emit('shutdown');
  }

  private initializeWidgetLibrary(): void {
    // Initialize standard widget types
    this.widgetLibrary.set('chart', {
      defaultConfig: {
        visualization: { type: 'line' },
        refresh: { enabled: true, interval: 60000 }
      }
    });

    this.widgetLibrary.set('kpi', {
      defaultConfig: {
        style: { fontSize: 24, textAlign: 'center' }
      }
    });

    this.widgetLibrary.set('table', {
      defaultConfig: {
        pagination: { enabled: true, pageSize: 20 },
        sorting: { enabled: true },
        filtering: { enabled: true }
      }
    });
  }
}

class LayoutEngine {
  private config: unknown;

  constructor(config: unknown) {
    this.config = config;
  }

  public findOptimalPosition(
    widgets: DashboardWidget[],
    width: number,
    height: number
  ): { x: number; y: number; w: number; h: number } {
    // Simple algorithm to find next available position
    let y = 0;
    let x = 0;

    while (true) {
      const position = { x, y, w: width, h: height };
      
      if (!this.hasCollisions({ position } as DashboardWidget, widgets)) {
        return position;
      }

      x += 1;
      if (x + width > this.config.defaultColumns) {
        x = 0;
        y += 1;
      }
    }
  }

  public hasCollisions(widget: DashboardWidget, otherWidgets: DashboardWidget[]): boolean {
    for (const other of otherWidgets) {
      if (other.id === widget.id) continue;
      
      if (this.overlaps(widget.position, other.position)) {
        return true;
      }
    }
    return false;
  }

  public resolveCollisions(widget: DashboardWidget, otherWidgets: DashboardWidget[]): unknown {
    // Simple collision resolution - move down
    const position = { ...widget.position };
    
    while (this.hasCollisions({ ...widget, position }, otherWidgets)) {
      position.y += 1;
    }
    
    return position;
  }

  public optimize(widgets: DashboardWidget[], _algorithm: string): DashboardWidget[] { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Simple optimization - compact vertically
    const sorted = [...widgets].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
    
    const optimized: DashboardWidget[] = [];
    
    for (const widget of sorted) {
      const newPosition = this.findOptimalPosition(optimized, widget.position.w, widget.position.h);
      optimized.push({
        ...widget,
        position: newPosition
      });
    }
    
    return optimized;
  }

  private overlaps(a: unknown, b: unknown): boolean {
    return !(
      a.x + a.w <= b.x ||
      b.x + b.w <= a.x ||
      a.y + a.h <= b.y ||
      b.y + b.h <= a.y
    );
  }
}