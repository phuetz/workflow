/**
 * Import/Export Service
 * Handles workflow import, export, format conversion, and migration
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
  ImportError,
  ImportWarning,
  ValidationOptions,
  ImportExportService as IImportExportService,
  ImportMappings
} from '../types/importExport';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { useWorkflowStore } from '../store/workflowStore';
import * as yaml from 'js-yaml';
import { createHash } from 'crypto';
import pako from 'pako';

export class ImportExportService extends BaseService implements IImportExportService {
  private static instance: ImportExportService;
  private converters: Map<string, FormatConverter> = new Map();
  private templates: Map<string, ExportTemplate> = new Map();
  private exportHistory: WorkflowExport[] = [];
  private importHistory: ImportResult[] = [];
  private bulkExports: Map<string, BulkExport> = new Map();

  private constructor() {
    super('ImportExportService');
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
    // Native JSON converter (identity)
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

    // n8n format converter
    this.registerConverter({
      fromFormat: 'json',
      toFormat: 'n8n',
      convert: (data) => this.convertToN8nFormat(data as WorkflowExport),
      validate: (data) => this.validateN8nFormat(data)
    });

    // Zapier format converter
    this.registerConverter({
      fromFormat: 'json',
      toFormat: 'zapier',
      convert: (data) => this.convertToZapierFormat(data as WorkflowExport),
      validate: (data) => this.validateZapierFormat(data)
    });
  }

  private initializeTemplates() {
    // Basic export template
    this.templates.set('basic', {
      id: 'basic',
      name: 'Basic Export',
      description: 'Export workflow without credentials or environment',
      format: 'json',
      includeCredentials: false,
      includeCustomNodes: false,
      includeEnvironment: false
    });

    // Full export template
    this.templates.set('full', {
      id: 'full',
      name: 'Full Export',
      description: 'Export everything including credentials and environment',
      format: 'json',
      includeCredentials: true,
      includeCustomNodes: true,
      includeEnvironment: true
    });

    // Migration template
    this.templates.set('migration', {
      id: 'migration',
      name: 'Migration Export',
      description: 'Export for migration to another platform',
      format: 'json',
      includeCredentials: true,
      includeCustomNodes: true,
      includeEnvironment: true,
      transformations: [
        {
          type: 'sanitize',
          config: { removeExecutionData: true }
        }
      ]
    });
  }

  async exportWorkflow(
    workflowId: string, 
    format: ExportFormat, 
    options: ExportOptions = {}
  ): Promise<WorkflowExport> {
    this.logger.info('Exporting workflow', { workflowId, format, options });

    try {
      // Get workflow data from store
      
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create export data
      const exportData: WorkflowExport = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: '1.0.0',
        exportedAt: new Date(),
        exportedBy: authService.getCurrentUser() || 'system',
        format,
        metadata: workflow.metadata || {},
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        checksum: ''
      };

      // Include optional data
      if (options.includeCredentials) {
        exportData.credentials = await this.exportCredentials(workflow.nodes);
      }

      if (options.includeCustomNodes) {
        exportData.customNodes = await this.exportCustomNodes(workflow.nodes);
      }

      if (options.includeEnvironment) {
        exportData.environment = await this.exportEnvironment(workflowId);
      }

      // Apply compression if requested
      let finalData: unknown = exportData;
      if (options.compression && options.compression !== 'none') {
        finalData = await this.compressData(exportData, options.compression);
      }

      // Apply encryption if requested
      if (options.encryption?.enabled) {
        finalData = await this.encryptData(finalData, options.encryption.publicKey);
      }

      // Generate checksum
      exportData.checksum = this.generateChecksum(finalData);

      // Convert to requested format
      if (format !== 'json') {
        if (converter) {
          finalData = await converter.convert(finalData);
        }
      }

      // Store in history
      this.exportHistory.push(exportData);

      return exportData;
    } catch (error) {
      this.logger.error('Failed to export workflow', { workflowId, error });
      throw error;
    }
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

    // Start async export
    this.performBulkExport(bulkExport);

    return bulkExport;
  }

  private async performBulkExport(bulkExport: BulkExport) {
    try {
      bulkExport.status = 'running';
      const exports: WorkflowExport[] = [];
      const results: unknown[] = [];

      for (let __i = 0; i < bulkExport.workflows.length; i++) {
        try {
            workflowId, 
            bulkExport.format, 
            bulkExport.options
          );
          exports.push(exported);
          results.push({
            workflowId,
            name: exported.name,
            success: true
          });
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

      // Create archive
      
      bulkExport.status = 'completed';
      bulkExport.completedAt = new Date();
      bulkExport.result = {
        file: archive.path,
        size: archive.size,
        checksum: archive.checksum,
        exports: results
      };
    } catch (error) {
      bulkExport.status = 'failed';
      this.logger.error('Bulk export failed', { bulkExportId: bulkExport.id, error });
    }
  }

  async downloadExport(exportData: WorkflowExport, filename?: string): Promise<void> {

    let content: string;
    if (exportData.format === 'json') {
      content = JSON.stringify(exportData, null, 2);
    } else if (exportData.format === 'yaml') {
      content = yaml.dump(exportData);
    } else {
      content = JSON.stringify(exportData);
    }

    // Create blob and download
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importWorkflow(
    source: ImportSource, 
    options: ImportOptions = { format: 'json' }
  ): Promise<ImportResult> {
    this.logger.info('Importing workflow', { source: source.type, options });

    const result: ImportResult = {
      success: false,
      errors: [],
      warnings: [],
      statistics: {
        totalNodes: 0,
        importedNodes: 0,
        totalEdges: 0,
        importedEdges: 0,
        totalCredentials: 0,
        importedCredentials: 0,
        executionTime: Date.now()
      },
      mappingsApplied: {}
    };

    try {
      // Parse source data
      
      // Detect format if not specified
      
      // Convert to internal format if needed
      let workflowData: WorkflowExport;
      if (format !== 'json') {
        if (!converter) {
          result.errors.push({
            type: 'invalid_format',
            message: `No converter available for format: ${format}`
          });
          return result;
        }
        workflowData = await converter.convert(data) as WorkflowExport;
      } else {
        workflowData = data as WorkflowExport;
      }

      // Validate import
      if (options.validation) {
        result.errors.push(...validationResult.errors);
        result.warnings.push(...validationResult.warnings);
        
        if (validationResult.errors.length > 0 && options.validation.strictMode) {
          return result;
        }
      }

      // Apply mappings
      if (options.mappings) {
        workflowData = await this.applyImportMappings(workflowData, options.mappings);
        result.mappingsApplied = options.mappings;
      }

      // Dry run mode
      if (options.dryRun) {
        result.success = true;
        result.statistics.totalNodes = workflowData.nodes.length;
        result.statistics.totalEdges = workflowData.edges.length;
        result.statistics.totalCredentials = workflowData.credentials?.length || 0;
        return result;
      }

      // Import workflow
        id: options.overwriteExisting ? workflowData.id : this.generateId(),
        name: workflowData.name,
        description: workflowData.description,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        metadata: workflowData.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Import nodes
      result.statistics.totalNodes = workflowData.nodes.length;
      for (const node of workflowData.nodes) {
        try {
          // Validate node type exists
          if (!this.isNodeTypeAvailable(node.type)) {
            result.warnings.push({
              type: 'missing_optional_field',
              message: `Node type ${node.type} not available`,
              nodeId: node.id,
              suggestion: 'Install the required integration'
            });
          }
          result.statistics.importedNodes++;
        } catch (error) {
          result.errors.push({
            type: 'missing_node_type',
            message: `Failed to import node ${node.id}`,
            nodeId: node.id,
            details: error
          });
        }
      }

      // Import edges
      result.statistics.totalEdges = workflowData.edges.length;
      result.statistics.importedEdges = workflowData.edges.length;

      // Import credentials if requested
      if (options.importCredentials && workflowData.credentials) {
        result.statistics.totalCredentials = workflowData.credentials.length;
        for (const cred of workflowData.credentials) {
          try {
            await this.importCredential(cred);
            result.statistics.importedCredentials++;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            result.warnings.push({
              type: 'credential_not_found',
              message: `Could not import credential ${cred.name}`,
              suggestion: 'Configure credentials manually'
            });
          }
        }
      }

      // Save workflow
      store.addWorkflow(newWorkflow);
      result.success = true;
      result.workflowId = newWorkflow.id;
      
      // Store in history
      this.importHistory.push(result);
      
      result.statistics.executionTime = Date.now() - result.statistics.executionTime;
      return result;
    } catch (error) {
      result.errors.push({
        type: 'invalid_format',
        message: 'Import failed',
        details: error
      });
      return result;
    }
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
    
    if (format !== 'json') {
      if (converter) {
        return await converter.convert(data) as WorkflowExport;
      }
    }
    
    return data as WorkflowExport;
  }

  async migrateWorkflow(
    workflow: WorkflowExport, 
    migration: WorkflowMigration
  ): Promise<WorkflowExport> {
    this.logger.info('Migrating workflow', { 
      workflowId: workflow.id, 
      fromFormat: migration.fromFormat, 
      toFormat: migration.toFormat 
    });


    // Apply migration rules
    for (const rule of migration.rules) {
      migratedWorkflow = await this.applyMigrationRule(migratedWorkflow, rule, migration);
    }

    // Convert format
    if (migration.fromFormat !== migration.toFormat) {
      if (converter) {
        migratedWorkflow = await converter.convert(migratedWorkflow) as WorkflowExport;
      }
    }

    migratedWorkflow.version = migration.toVersion;
    return migratedWorkflow;
  }

  detectFormat(data: unknown): ExportFormat | null {
    try {
      // Check if it's a string
      if (typeof data === 'string') {
        // Try to parse as JSON
        try {
          JSON.parse(data);
          return 'json';
        } catch {
          // Try to parse as YAML
          try {
            yaml.load(data);
            return 'yaml';
          } catch {
            // Check for specific format markers
            if (data.includes('"nodes"') && data.includes('"connections"')) {
              return 'n8n';
            }
            if (data.includes('zap_meta') || data.includes('triggers')) {
              return 'zapier';
            }
          }
        }
      }

      // Check object structure
      if (typeof data === 'object' && data !== null) {
        if (obj.nodes && obj.edges) {
          return 'json';
        }
        if (obj.nodes && obj.connections) {
          return 'n8n';
        }
        if (obj.triggers && obj.actions) {
          return 'zapier';
        }
      }
    } catch (error) {
      this.logger.warn('Failed to detect format', { error });
    }

    return null;
  }

  async createExportTemplate(
    template: Omit<ExportTemplate, 'id'>
  ): Promise<ExportTemplate> {
    const newTemplate: ExportTemplate = {
      ...template,
      id: this.generateId()
    };
    
    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  async applyExportTemplate(
    workflowId: string, 
    templateId: string
  ): Promise<WorkflowExport> {
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const options: ExportOptions = {
      includeCredentials: template.includeCredentials,
      includeCustomNodes: template.includeCustomNodes,
      includeEnvironment: template.includeEnvironment
    };

    return this.exportWorkflow(workflowId, template.format, options);
  }

  registerConverter(converter: FormatConverter): void {
    this.converters.set(key, converter);
  }

  async convertFormat(
    data: unknown, 
    fromFormat: ExportFormat, 
    toFormat: ExportFormat
  ): Promise<unknown> {
    if (fromFormat === toFormat) {
      return data;
    }

    if (!converter) {
      throw new Error(`No converter available from ${fromFormat} to ${toFormat}`);
    }

    return converter.convert(data);
  }

  async getExportHistory(workflowId?: string): Promise<WorkflowExport[]> {
    if (workflowId) {
      return this.exportHistory.filter(e => e.id === workflowId);
    }
    return [...this.exportHistory];
  }

  async getImportHistory(workflowId?: string): Promise<ImportResult[]> {
    if (workflowId) {
      return this.importHistory.filter(i => i.workflowId === workflowId);
    }
    return [...this.importHistory];
  }

  async getBulkExportStatus(bulkExportId: string): Promise<BulkExport> {
    if (!bulkExport) {
      throw new Error(`Bulk export ${bulkExportId} not found`);
    }
    return bulkExport;
  }

  // Private helper methods
  private async parseImportSource(source: ImportSource): Promise<unknown> {
    switch (source.type) {
      case 'file':
        return this.readFile(source.data as File);
      case 'url':
        return this.fetchUrl(source.data as URL);
      case 'text':
        return source.data;
      case 'clipboard':
        return navigator.clipboard.readText();
      default:
        throw new Error(`Unknown import source type: ${source.type}`);
    }
  }

  private async readFile(file: File): Promise<unknown> {
    return new Promise((resolve, reject) => {
      reader.onload = (e) => {
        try {
          resolve(JSON.parse(text));
        } catch {
          resolve(e.target?.result);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private async fetchUrl(url: URL): Promise<unknown> {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private getConverter(from: ExportFormat, to: ExportFormat): FormatConverter | null {
    return this.converters.get(`${from}->${to}`) || null;
  }

  private generateChecksum(data: unknown): string {
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async compressData(data: unknown, compression: 'gzip' | 'zip'): Promise<unknown> {
    return compressed;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async encryptData(data: unknown, publicKey?: string): Promise<unknown> {
    // Placeholder for encryption implementation
    // In production, use proper encryption library
    return data;
  }

  private async exportCredentials(nodes: WorkflowNode[]): Promise<unknown[]> {
    // Extract unique credential types from nodes
    nodes.forEach(node => {
      if (node.data.credentials) {
        Object.keys(node.data.credentials).forEach(type => credentialTypes.add(type));
      }
    });

    return Array.from(credentialTypes).map(type => ({
      id: this.generateId(),
      name: type,
      type,
      requiredFields: this.getCredentialFields(type),
      isEncrypted: true
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async exportCustomNodes(nodes: WorkflowNode[]): Promise<unknown[]> {
    // Placeholder for custom node export
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async exportEnvironment(workflowId: string): Promise<unknown> {
    return {
      variables: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createArchive(exports: WorkflowExport[], options: ExportOptions): Promise<unknown> {
    // Placeholder for archive creation
    return {
      path: '/tmp/export.zip',
      size: 1024 * 1024,
      checksum: this.generateChecksum(exports)
    };
  }

  private async validateImportData(
    data: WorkflowExport, 
    options: ValidationOptions
  ): Promise<{ errors: ImportError[], warnings: ImportWarning[] }> {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Validate structure
    if (!data.nodes || !Array.isArray(data.nodes)) {
      errors.push({
        type: 'invalid_format',
        message: 'Invalid workflow structure: missing nodes array'
      });
    }

    if (!data.edges || !Array.isArray(data.edges)) {
      errors.push({
        type: 'invalid_format',
        message: 'Invalid workflow structure: missing edges array'
      });
    }

    // Validate node types
    if (options.validateNodeTypes && data.nodes) {
      data.nodes.forEach(node => {
        if (!this.isNodeTypeAvailable(node.type)) {
          warnings.push({
            type: 'missing_optional_field',
            message: `Node type ${node.type} is not available`,
            nodeId: node.id,
            suggestion: 'Install the required integration package'
          });
        }
      });
    }

    // Validate connections
    if (options.validateConnections && data.nodes && data.edges) {
      data.edges.forEach(edge => {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          errors.push({
            type: 'invalid_connection',
            message: 'Edge references non-existent node',
            field: `${edge.source} -> ${edge.target}`
          });
        }
      });
    }

    return { errors, warnings };
  }

  private async applyImportMappings(
    data: WorkflowExport, 
    mappings: ImportMappings
  ): Promise<WorkflowExport> {

    // Apply node type mappings
    if (mappings.nodeTypes) {
      mapped.nodes = mapped.nodes.map(node => {
        if (mappings.nodeTypes![node.type]) {
          return {
            ...node,
            type: mappings.nodeTypes![node.type]
          };
        }
        return node;
      });
    }

    // Apply other mappings...

    return mapped;
  }

  private async applyMigrationRule(
    workflow: WorkflowExport,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rule: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    migration: WorkflowMigration
  ): Promise<WorkflowExport> {
    // Placeholder for migration rule application
    return workflow;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private isNodeTypeAvailable(nodeType: string): boolean {
    // Check if node type is registered
    // Placeholder implementation
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getCredentialFields(type: string): string[] {
    // Get required fields for credential type
    // Placeholder implementation
    return ['apiKey', 'apiSecret'];
  }

  private async importCredential(credential: unknown): Promise<void> {
    // Placeholder for credential import
    this.logger.info('Importing credential', { credential });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Format converters
  private convertToN8nFormat(workflow: WorkflowExport): unknown {
    return {
      name: workflow.name,
      nodes: workflow.nodes.map(node => ({
        id: node.id,
        name: node.data.label || node.type,
        type: `n8n-nodes-base.${node.type}`,
        position: [node.position.x, node.position.y],
        parameters: node.data
      })),
      connections: this.convertEdgesToN8nConnections(workflow.edges),
      settings: {},
      staticData: null
    };
  }

  private validateN8nFormat(data: unknown): boolean {
    return !!(data && data.nodes && data.connections);
  }

  private convertToZapierFormat(workflow: WorkflowExport): unknown {

    return {
      name: workflow.name,
      description: workflow.description,
      triggers: triggers.map(t => ({
        id: t.id,
        type: t.type,
        options: t.data
      })),
      actions: actions.map(a => ({
        id: a.id,
        type: a.type,
        options: a.data
      })),
      enabled: true
    };
  }

  private validateZapierFormat(data: unknown): boolean {
    return !!(data && (data.triggers || data.actions));
  }

  private convertEdgesToN8nConnections(edges: WorkflowEdge[]): unknown {
    const connections: unknown = {};
    
    edges.forEach(edge => {
      if (!connections[edge.source]) {
        connections[edge.source] = { main: [[]] };
      }
      connections[edge.source].main[0].push({
        node: edge.target,
        type: 'main',
        index: 0
      });
    });

    return connections;
  }
}