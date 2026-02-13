/**
 * Import/Export Service
 * Main orchestrator for workflow import, export, format conversion, and migration
 */

import { BaseService } from './BaseService';
import type {
  WorkflowExport,
  ExportFormat,
  ImportOptions,
  ImportResult,
  ImportSource,
  ExportOptions,
  BulkExport,
  WorkflowMigration,
  ExportTemplate,
  FormatConverter,
  ValidationOptions,
  ImportExportService as IImportExportService
} from '../types/importExport';
import * as yaml from 'js-yaml';

// Import sub-services
import {
  WorkflowImporter,
  workflowImporter,
  WorkflowExporter,
  workflowExporter,
  MigrationService,
  migrationService,
  N8nAdapter,
  n8nAdapter,
  ZapierAdapter,
  zapierAdapter
} from './import-export';

export class ImportExportService extends BaseService implements IImportExportService {
  private static instance: ImportExportService;
  private converters: Map<string, FormatConverter> = new Map();
  private templates: Map<string, ExportTemplate> = new Map();
  private exportHistory: WorkflowExport[] = [];
  private importHistory: ImportResult[] = [];
  private bulkExports: Map<string, BulkExport> = new Map();

  // Sub-services
  private importer: WorkflowImporter;
  private exporter: WorkflowExporter;
  private migration: MigrationService;
  private n8n: N8nAdapter;
  private zapier: ZapierAdapter;

  private constructor() {
    super('ImportExportService');
    this.importer = workflowImporter;
    this.exporter = workflowExporter;
    this.migration = migrationService;
    this.n8n = n8nAdapter;
    this.zapier = zapierAdapter;
    this.initializeConverters();
    this.initializeTemplates();
  }

  static getInstance(): ImportExportService {
    if (!ImportExportService.instance) {
      ImportExportService.instance = new ImportExportService();
    }
    return ImportExportService.instance;
  }

  private initializeConverters() {
    // Native JSON converter
    this.registerConverter({
      fromFormat: 'json',
      toFormat: 'json',
      convert: (data) => data,
      validate: (data) => {
        try {
          JSON.stringify(data);
          return true;
        } catch {
          return false;
        }
      }
    });

    // JSON to YAML converter
    this.registerConverter({
      fromFormat: 'json',
      toFormat: 'yaml',
      convert: (data) => yaml.dump(data),
      validate: (data) => {
        try {
          yaml.load(data as string);
          return true;
        } catch {
          return false;
        }
      }
    });

    // YAML to JSON converter
    this.registerConverter({
      fromFormat: 'yaml',
      toFormat: 'json',
      convert: (data) => yaml.load(data as string),
      validate: (data) => {
        try {
          yaml.load(data as string);
          return true;
        } catch {
          return false;
        }
      }
    });

    // n8n format converters
    this.registerConverter(this.n8n.createConverter());
    this.registerConverter(this.n8n.createReverseConverter());

    // Zapier format converters
    this.registerConverter(this.zapier.createConverter());
    this.registerConverter(this.zapier.createReverseConverter());
  }

  private initializeTemplates() {
    this.templates.set('basic', {
      id: 'basic',
      name: 'Basic Export',
      description: 'Export workflow without credentials or environment',
      format: 'json',
      includeCredentials: false,
      includeCustomNodes: false,
      includeEnvironment: false
    });

    this.templates.set('full', {
      id: 'full',
      name: 'Full Export',
      description: 'Export everything including credentials and environment',
      format: 'json',
      includeCredentials: true,
      includeCustomNodes: true,
      includeEnvironment: true
    });

    this.templates.set('migration', {
      id: 'migration',
      name: 'Migration Export',
      description: 'Export for migration to another platform',
      format: 'json',
      includeCredentials: true,
      includeCustomNodes: true,
      includeEnvironment: true,
      transformations: [{ type: 'sanitize', config: { removeExecutionData: true } }]
    });
  }

  // === Export Methods ===

  async exportWorkflow(
    workflowId: string,
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<WorkflowExport> {
    const exportData = await this.exporter.exportWorkflow(
      workflowId,
      format,
      options,
      (data, fmt) => this.convertFormat(data, 'json', fmt)
    );
    this.exportHistory.push(exportData);
    return exportData;
  }

  async exportBulk(
    workflowIds: string[],
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<BulkExport> {
    const bulkExport: BulkExport = {
      id: this.generateId(),
      name: `Bulk Export ${new Date().toISOString()}`,
      workflows: workflowIds,
      format,
      options,
      status: 'pending',
      progress: 0,
      startedAt: new Date()
    };

    this.bulkExports.set(bulkExport.id, bulkExport);
    this.performBulkExport(bulkExport);

    return bulkExport;
  }

  private async performBulkExport(bulkExport: BulkExport) {
    try {
      bulkExport.status = 'running';
      const exports: WorkflowExport[] = [];
      const results: unknown[] = [];

      for (let i = 0; i < bulkExport.workflows.length; i++) {
        const workflowId = bulkExport.workflows[i];
        try {
          const exported = await this.exportWorkflow(workflowId, bulkExport.format, bulkExport.options);
          exports.push(exported);
          results.push({ workflowId, name: exported.name, success: true });
        } catch (error) {
          results.push({
            workflowId,
            name: 'Unknown',
            success: false,
            error: error instanceof Error ? error.message : 'Export failed'
          });
        }
        bulkExport.progress = ((i + 1) / bulkExport.workflows.length) * 100;
      }

      const archive = await this.exporter.createArchive(exports, bulkExport.options);

      bulkExport.status = 'completed';
      bulkExport.completedAt = new Date();
      bulkExport.result = {
        file: archive.path,
        size: archive.size,
        checksum: archive.checksum,
        exports: results as { workflowId: string; name: string; success: boolean; error?: string }[]
      };
    } catch (error) {
      bulkExport.status = 'failed';
      this.logger.error('Bulk export failed', { bulkExportId: bulkExport.id, error });
    }
  }

  async downloadExport(exportData: WorkflowExport, filename?: string): Promise<void> {
    return this.exporter.downloadExport(exportData, filename);
  }

  // === Import Methods ===

  async importWorkflow(
    source: ImportSource,
    options: ImportOptions = { format: 'json' }
  ): Promise<ImportResult> {
    const result = await this.importer.importWorkflow(
      source,
      options,
      (from, to) => this.getConverter(from as ExportFormat, to as ExportFormat),
      (data) => this.detectFormat(data)
    );
    this.importHistory.push(result);
    return result;
  }

  async validateImport(
    source: ImportSource,
    options: ValidationOptions = {}
  ): Promise<ImportResult> {
    const importOptions: ImportOptions = {
      format: 'json',
      dryRun: true,
      validation: options
    };
    return this.importWorkflow(source, importOptions);
  }

  async previewImport(source: ImportSource): Promise<WorkflowExport> {
    const data = await this.importer.parseImportSource(source);
    const format = this.detectFormat(data) || 'json';

    if (format !== 'json') {
      const converter = this.getConverter(format, 'json');
      if (converter) {
        return await converter.convert(data) as WorkflowExport;
      }
    }

    return data as WorkflowExport;
  }

  // === Migration Methods ===

  async migrateWorkflow(
    workflow: WorkflowExport,
    migrationConfig: WorkflowMigration
  ): Promise<WorkflowExport> {
    return this.migration.migrateWorkflow(
      workflow,
      migrationConfig,
      (from, to) => this.getConverter(from as ExportFormat, to as ExportFormat)
    );
  }

  // === Format Detection & Conversion ===

  detectFormat(data: unknown): ExportFormat | null {
    try {
      if (typeof data === 'string') {
        try {
          JSON.parse(data);
          return 'json';
        } catch {
          try {
            yaml.load(data);
            return 'yaml';
          } catch {
            if (data.includes('"nodes"') && data.includes('"connections"')) return 'n8n';
            if (data.includes('zap_meta') || data.includes('triggers')) return 'zapier';
          }
        }
      }

      if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        if (obj.nodes && obj.edges) return 'json';
        if (obj.nodes && obj.connections) return 'n8n';
        if (obj.triggers && obj.actions) return 'zapier';
      }
    } catch (error) {
      this.logger.warn('Failed to detect format', { error });
    }

    return null;
  }

  async convertFormat(
    data: unknown,
    fromFormat: ExportFormat,
    toFormat: ExportFormat
  ): Promise<unknown> {
    if (fromFormat === toFormat) return data;

    const converter = this.getConverter(fromFormat, toFormat);
    if (!converter) {
      throw new Error(`No converter available from ${fromFormat} to ${toFormat}`);
    }

    return converter.convert(data);
  }

  // === Template Methods ===

  async createExportTemplate(template: Omit<ExportTemplate, 'id'>): Promise<ExportTemplate> {
    const newTemplate: ExportTemplate = { ...template, id: this.generateId() };
    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  async applyExportTemplate(workflowId: string, templateId: string): Promise<WorkflowExport> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    const options: ExportOptions = {
      includeCredentials: template.includeCredentials,
      includeCustomNodes: template.includeCustomNodes,
      includeEnvironment: template.includeEnvironment
    };

    return this.exportWorkflow(workflowId, template.format, options);
  }

  // === Converter Methods ===

  registerConverter(converter: FormatConverter): void {
    const key = `${converter.fromFormat}->${converter.toFormat}`;
    this.converters.set(key, converter);
  }

  private getConverter(from: ExportFormat, to: ExportFormat): FormatConverter | null {
    return this.converters.get(`${from}->${to}`) || null;
  }

  // === History Methods ===

  async getExportHistory(workflowId?: string): Promise<WorkflowExport[]> {
    if (workflowId) return this.exportHistory.filter(e => e.id === workflowId);
    return [...this.exportHistory];
  }

  async getImportHistory(workflowId?: string): Promise<ImportResult[]> {
    if (workflowId) return this.importHistory.filter(i => i.workflowId === workflowId);
    return [...this.importHistory];
  }

  async getBulkExportStatus(bulkExportId: string): Promise<BulkExport> {
    const bulkExport = this.bulkExports.get(bulkExportId);
    if (!bulkExport) throw new Error(`Bulk export ${bulkExportId} not found`);
    return bulkExport;
  }

  // === Utility ===

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
