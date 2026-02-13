/**
 * TemplateManager - Manages report templates
 */

import { EventEmitter } from 'events';
import type {
  ReportTemplate,
  ReportType,
  StakeholderView,
  ReportBranding,
  ReportSection,
  ReportFilter,
} from './types';

export interface CreateTemplateOptions {
  name: string;
  description: string;
  reportType: ReportType;
  stakeholderView: StakeholderView;
  branding: ReportBranding;
  sections: ReportSection[];
  filters?: ReportFilter[];
  createdBy: string;
  isDefault?: boolean;
}

/**
 * TemplateManager handles report template CRUD operations
 */
export class TemplateManager extends EventEmitter {
  private templates: Map<string, ReportTemplate> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize default templates
   */
  initializeDefaultTemplates(): void {
    const defaultBranding: ReportBranding = {
      primaryColor: '#1a365d',
      secondaryColor: '#2b6cb0',
      fontFamily: 'Inter, sans-serif',
      companyName: 'Workflow Automation Platform',
      confidentialityNotice: 'CONFIDENTIAL - For authorized recipients only',
    };

    // Executive Summary Template
    this.createTemplate({
      name: 'Executive Summary - Default',
      description: 'High-level compliance overview for executives and board members',
      reportType: 'executive_summary' as ReportType,
      stakeholderView: 'board' as StakeholderView,
      branding: defaultBranding,
      sections: [
        { id: 'summary', name: 'Executive Summary', type: 'summary', order: 1, visible: true, config: {} },
        { id: 'metrics', name: 'Key Metrics', type: 'metrics', order: 2, visible: true, config: {} },
        { id: 'risks', name: 'Risk Overview', type: 'chart', order: 3, visible: true, config: { chartType: 'heatmap' } },
        { id: 'recommendations', name: 'Recommendations', type: 'recommendations', order: 4, visible: true, config: {} },
      ],
      createdBy: 'system',
      isDefault: true,
    });

    // Detailed Assessment Template
    this.createTemplate({
      name: 'Detailed Assessment - Default',
      description: 'Comprehensive control assessment for IT and security teams',
      reportType: 'detailed_assessment' as ReportType,
      stakeholderView: 'it' as StakeholderView,
      branding: defaultBranding,
      sections: [
        { id: 'overview', name: 'Assessment Overview', type: 'summary', order: 1, visible: true, config: {} },
        { id: 'controls', name: 'Control Assessments', type: 'table', order: 2, visible: true, config: {} },
        { id: 'findings', name: 'Findings', type: 'findings', order: 3, visible: true, config: {} },
        { id: 'evidence', name: 'Evidence Summary', type: 'table', order: 4, visible: true, config: {} },
        { id: 'recommendations', name: 'Recommendations', type: 'recommendations', order: 5, visible: true, config: {} },
      ],
      createdBy: 'system',
      isDefault: true,
    });

    // Auditor Report Template
    this.createTemplate({
      name: 'Audit Report - Default',
      description: 'Comprehensive audit report for external auditors',
      reportType: 'audit_report' as ReportType,
      stakeholderView: 'auditors' as StakeholderView,
      branding: defaultBranding,
      sections: [
        { id: 'scope', name: 'Audit Scope', type: 'text', order: 1, visible: true, config: {} },
        { id: 'methodology', name: 'Methodology', type: 'text', order: 2, visible: true, config: {} },
        { id: 'controls', name: 'Control Testing', type: 'table', order: 3, visible: true, config: {} },
        { id: 'findings', name: 'Audit Findings', type: 'findings', order: 4, visible: true, config: {} },
        { id: 'evidence', name: 'Evidence Trail', type: 'table', order: 5, visible: true, config: {} },
        { id: 'opinion', name: 'Audit Opinion', type: 'text', order: 6, visible: true, config: {} },
      ],
      createdBy: 'system',
      isDefault: true,
    });
  }

  /**
   * Create a new report template
   */
  async createTemplate(options: CreateTemplateOptions): Promise<ReportTemplate> {
    const templateId = this.generateId('template');

    const template: ReportTemplate = {
      id: templateId,
      name: options.name,
      description: options.description,
      reportType: options.reportType,
      stakeholderView: options.stakeholderView,
      branding: options.branding,
      sections: options.sections,
      filters: options.filters || [],
      createdAt: new Date(),
      createdBy: options.createdBy,
      updatedAt: new Date(),
      isDefault: options.isDefault || false,
    };

    this.templates.set(templateId, template);
    this.emit('template:created', { templateId, template });

    return template;
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<ReportTemplate, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<ReportTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(templateId, updatedTemplate);
    this.emit('template:updated', { templateId, updates });

    return updatedTemplate;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template not found: ${templateId}`);
    }

    this.templates.delete(templateId);
    this.emit('template:deleted', { templateId });
  }

  /**
   * Get all templates
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get default template for a report type
   */
  getDefaultTemplate(reportType: ReportType): ReportTemplate | undefined {
    return Array.from(this.templates.values()).find(
      t => t.reportType === reportType && t.isDefault
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
