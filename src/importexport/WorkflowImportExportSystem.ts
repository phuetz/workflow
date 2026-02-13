/**
 * Workflow Import/Export System
 * Complete system for importing/exporting workflows in multiple formats
 */

import { EventEmitter } from 'events';
import JSZip from 'jszip';
import * as YAML from 'yaml';
import type {
  UnknownRecord,
  JSONValue,
  JSONObject,
  TransformFunction
} from '../types/common-types';

// Types
export interface ExportOptions {
  format: 'json' | 'yaml' | 'n8n' | 'zapier' | 'package';
  includeCredentials?: boolean;
  includeExecutionHistory?: boolean;
  includeVariables?: boolean;
  includeNodeData?: boolean;
  encryption?: {
    enabled: boolean;
    password?: string;
    algorithm?: string;
  };
  compression?: boolean;
  version?: string;
}

export interface ImportOptions {
  format?: 'auto' | 'json' | 'yaml' | 'n8n' | 'zapier' | 'package';
  validateSchema?: boolean;
  mapping?: FieldMapping[];
  overwrite?: boolean;
  mergeStrategy?: 'replace' | 'merge' | 'skip';
  decryption?: {
    password?: string;
  };
  transformRules?: TransformRule[];
  dryRun?: boolean;
}

export interface WorkflowPackage {
  metadata: PackageMetadata;
  workflows: ExportedWorkflow[];
  nodes?: CustomNodeDefinition[];
  credentials?: EncryptedCredential[];
  variables?: GlobalVariable[];
  resources?: Resource[];
  dependencies?: Dependency[];
}

export interface PackageMetadata {
  version: string;
  exportedAt: Date;
  exportedBy?: string;
  platform: string;
  platformVersion: string;
  description?: string;
  tags?: string[];
  license?: string;
  checksum?: string;
}

export interface ExportedWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: ExportedNode[];
  connections: ExportedConnection[];
  settings?: WorkflowSettings;
  variables?: Record<string, JSONValue>;
  version?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExportedNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  parameters: UnknownRecord;
  credentials?: string[];
  disabled?: boolean;
  notes?: string;
  color?: string;
  webhookId?: string;
}

export interface ExportedConnection {
  sourceNodeId: string;
  sourceHandleId?: string;
  targetNodeId: string;
  targetHandleId?: string;
  type?: 'main' | 'error';
}

export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveDataSuccessExecution?: boolean;
  saveDataErrorExecution?: boolean;
  saveManualExecutions?: boolean;
  callerPolicy?: 'any' | 'none' | 'workflowsFromAList';
  timezone?: string;
  errorWorkflow?: string;
  maxExecutionTime?: number;
}

export interface CustomNodeDefinition {
  name: string;
  displayName: string;
  description: string;
  version: number;
  icon?: string;
  group: string[];
  inputs: string[];
  outputs: string[];
  properties: NodeProperty[];
  credentials?: CredentialDefinition[];
  code?: string;
}

export interface NodeProperty {
  displayName: string;
  name: string;
  type: string;
  default?: JSONValue;
  required?: boolean;
  description?: string;
  options?: JSONValue[];
  displayOptions?: UnknownRecord;
  placeholder?: string;
  validation?: PropertyValidation;
}

export interface PropertyValidation {
  type?: string;
  properties?: UnknownRecord;
  message?: string;
}

export interface CredentialDefinition {
  name: string;
  required?: boolean;
  displayOptions?: UnknownRecord;
}

export interface EncryptedCredential {
  id: string;
  name: string;
  type: string;
  data: string; // Encrypted
  nodesAccess?: NodeAccess[];
}

export interface NodeAccess {
  nodeType: string;
  date: Date;
}

export interface GlobalVariable {
  key: string;
  value: JSONValue;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  encrypted?: boolean;
}

export interface Resource {
  id: string;
  type: 'file' | 'image' | 'template' | 'schema';
  name: string;
  path: string;
  content?: string | Buffer;
  mimeType?: string;
  size?: number;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'node' | 'integration' | 'library';
  required: boolean;
  source?: string;
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: TransformFunction<unknown, unknown>;
}

export interface TransformRule {
  type: 'node' | 'connection' | 'variable' | 'credential';
  condition?: (item: unknown) => boolean;
  transform: TransformFunction<unknown, unknown>;
}

export interface ImportResult {
  success: boolean;
  workflows: ImportedWorkflow[];
  errors: ImportError[];
  warnings: ImportWarning[];
  statistics: ImportStatistics;
}

export interface ImportedWorkflow {
  id: string;
  originalId: string;
  name: string;
  status: 'imported' | 'updated' | 'skipped' | 'failed';
  nodeCount: number;
  connectionCount: number;
}

export interface ImportError {
  type: 'validation' | 'compatibility' | 'missing_dependency' | 'permission';
  message: string;
  workflowId?: string;
  nodeId?: string;
  details?: UnknownRecord;
}

export interface ImportWarning {
  type: 'deprecated' | 'version_mismatch' | 'missing_optional' | 'transformed';
  message: string;
  workflowId?: string;
  nodeId?: string;
  details?: UnknownRecord;
}

export interface ImportStatistics {
  totalWorkflows: number;
  importedWorkflows: number;
  updatedWorkflows: number;
  skippedWorkflows: number;
  failedWorkflows: number;
  totalNodes: number;
  totalConnections: number;
  totalCredentials: number;
  totalVariables: number;
  processingTime: number;
}

export interface FormatConverter {
  name: string;
  canImport: (data: unknown) => boolean;
  canExport: boolean;
  import: (data: unknown, options: ImportOptions) => Promise<WorkflowPackage>;
  export: (pkg: WorkflowPackage, options: ExportOptions) => Promise<string | Buffer>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  expected?: unknown;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// Main System Class
export class WorkflowImportExportSystem extends EventEmitter {
  private static instance: WorkflowImportExportSystem;
  private converters: Map<string, FormatConverter> = new Map();
  private validators: Map<string, WorkflowValidator> = new Map();
  private transformers: Map<string, WorkflowTransformer> = new Map();
  private encryptionService: EncryptionService;
  private compressionService: CompressionService;

  private constructor() {
    super();
    this.encryptionService = new EncryptionService();
    this.compressionService = new CompressionService();
    this.initializeConverters();
    this.initializeValidators();
    this.initializeTransformers();
  }

  public static getInstance(): WorkflowImportExportSystem {
    if (!WorkflowImportExportSystem.instance) {
      WorkflowImportExportSystem.instance = new WorkflowImportExportSystem();
    }
    return WorkflowImportExportSystem.instance;
  }

  // Export Methods
  public async exportWorkflow(
    workflow: UnknownRecord,
    options: ExportOptions
  ): Promise<Buffer | string> {
    try {
      this.emit('export:start', { workflow, options });

      // Create workflow package
      const pkg = await this.createWorkflowPackage(workflow, options);

      // Validate package
      const validation = await this.validatePackage(pkg);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors[0].message}`);
      }

      // Get converter
      const converter = this.converters.get(options.format);
      if (!converter) {
        throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Convert to target format
      let result = await converter.export(pkg, options);

      // Apply encryption if needed
      if (options.encryption?.enabled) {
        result = await this.encryptionService.encrypt(result, options.encryption);
      }

      // Apply compression if needed
      if (options.compression) {
        result = await this.compressionService.compress(result);
      }

      this.emit('export:complete', { workflow, options, size: result.length });
      return result;
    } catch (error) {
      this.emit('export:error', { workflow, options, error });
      throw error;
    }
  }

  public async exportMultipleWorkflows(
    workflows: UnknownRecord[],
    options: ExportOptions
  ): Promise<Buffer> {
    try {
      this.emit('export:batch:start', { count: workflows.length, options });

      const packages: WorkflowPackage[] = [];
      for (const workflow of workflows) {
        const pkg = await this.createWorkflowPackage(workflow, options);
        packages.push(pkg);
      }

      // Merge packages
      const mergedPackage = this.mergePackages(packages);

      // Create archive
      const archive = await this.createArchive(mergedPackage, options);

      this.emit('export:batch:complete', { count: workflows.length });
      return archive;
    } catch (error) {
      this.emit('export:batch:error', { error });
      throw error;
    }
  }

  // Import Methods
  public async importWorkflow(
    data: Buffer | string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    try {
      this.emit('import:start', { options });

      const startTime = Date.now();
      let processedData = data;

      // Decrypt if needed
      if (options.decryption?.password) {
        const decrypted = await this.encryptionService.decrypt(
          processedData,
          options.decryption
        );
        processedData = typeof decrypted === 'string' || Buffer.isBuffer(decrypted) ? decrypted : JSON.stringify(decrypted);
      }

      // Decompress if needed
      if (this.compressionService.isCompressed(processedData)) {
        processedData = await this.compressionService.decompress(processedData);
      }

      // Auto-detect format if needed
      const format = options.format === 'auto' 
        ? this.detectFormat(processedData)
        : options.format!;

      // Get converter
      const converter = this.converters.get(format);
      if (!converter) {
        throw new Error(`Unsupported import format: ${format}`);
      }

      // Convert to workflow package
      const pkg = await converter.import(processedData, options);

      // Validate if requested
      if (options.validateSchema) {
        const validation = await this.validatePackage(pkg);
        if (!validation.valid) {
          return this.createErrorResult(validation.errors);
        }
      }

      // Apply transformations
      const transformedPkg = await this.applyTransformations(pkg, options);

      // Perform dry run if requested
      if (options.dryRun) {
        return this.performDryRun(transformedPkg, options);
      }

      // Import workflows
      const result = await this.performImport(transformedPkg, options);
      result.statistics.processingTime = Date.now() - startTime;

      this.emit('import:complete', result);
      return result;
    } catch (error) {
      this.emit('import:error', { error });
      throw error;
    }
  }

  // Validation Methods
  public async validateWorkflow(workflow: UnknownRecord): Promise<ValidationResult> {
    const validator = this.validators.get('default');
    return validator!.validate(workflow as any);
  }

  private async validatePackage(pkg: WorkflowPackage): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate metadata
    if (!pkg.metadata?.version) {
      errors.push({
        path: 'metadata.version',
        message: 'Version is required'
      });
    }

    // Validate workflows
    for (let i = 0; i < pkg.workflows.length; i++) {
      const workflow = pkg.workflows[i];
      const workflowValidation = await this.validateWorkflow(workflow as any);

      errors.push(...workflowValidation.errors.map(e => ({
        ...e,
        path: `workflows[${i}].${e.path}`
      })));

      warnings.push(...workflowValidation.warnings.map(w => ({
        ...w,
        path: `workflows[${i}].${w.path}`
      })));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Conversion Methods
  private async createWorkflowPackage(
    workflow: UnknownRecord,
    options: ExportOptions
  ): Promise<WorkflowPackage> {
    const pkg: WorkflowPackage = {
      metadata: {
        version: options.version || '1.0.0',
        exportedAt: new Date(),
        platform: 'workflow-automation',
        platformVersion: '1.0.0',
        checksum: ''
      },
      workflows: [this.convertToExportedWorkflow(workflow)]
    };

    // Add credentials if requested
    if (options.includeCredentials) {
      pkg.credentials = await this.exportCredentials(workflow);
    }

    // Add variables if requested
    if (options.includeVariables) {
      pkg.variables = await this.exportVariables(workflow);
    }

    // Add execution history if requested
    if (options.includeExecutionHistory) {
      // Implementation for execution history export
    }

    // Calculate checksum
    pkg.metadata.checksum = await this.calculateChecksum(pkg);

    return pkg;
  }

  private convertToExportedWorkflow(workflow: UnknownRecord): ExportedWorkflow {
    return {
      id: workflow.id as string,
      name: workflow.name as string,
      description: workflow.description as string | undefined,
      nodes: (workflow.nodes as UnknownRecord[]).map((n) => this.convertToExportedNode(n)),
      connections: (workflow.edges as UnknownRecord[]).map((e) => this.convertToExportedConnection(e)),
      settings: workflow.settings as WorkflowSettings | undefined,
      variables: workflow.variables as Record<string, JSONValue> | undefined,
      tags: workflow.tags as string[] | undefined,
      createdAt: workflow.createdAt as Date | undefined,
      updatedAt: workflow.updatedAt as Date | undefined
    };
  }

  private convertToExportedNode(node: UnknownRecord): ExportedNode {
    const data = node.data as UnknownRecord | undefined;
    return {
      id: node.id as string,
      type: node.type as string,
      name: (data?.label as string) || (node.name as string),
      position: node.position as { x: number; y: number },
      parameters: (data?.parameters as UnknownRecord) || {},
      credentials: data?.credentials as string[] | undefined,
      disabled: data?.disabled as boolean | undefined,
      notes: data?.notes as string | undefined,
      color: data?.color as string | undefined
    };
  }

  private convertToExportedConnection(edge: UnknownRecord): ExportedConnection {
    return {
      sourceNodeId: edge.source as string,
      sourceHandleId: edge.sourceHandle as string | undefined,
      targetNodeId: edge.target as string,
      targetHandleId: edge.targetHandle as string | undefined,
      type: edge.type as 'main' | 'error' | undefined
    };
  }

  // Format Detection
  private detectFormat(data: unknown): string {
    if (typeof data === 'string') {
      // Try JSON
      try {
        const parsed = JSON.parse(data);
        if (parsed.version && parsed.workflows) return 'package';
        if (parsed.nodes && parsed.connections) return 'json';
        if (parsed.name && parsed.nodes) return 'n8n';
        if (parsed.zaps) return 'zapier';
      } catch {}

      // Try YAML
      try {
        const parsed = YAML.parse(data);
        if (parsed.workflows) return 'yaml';
      } catch {}
    }

    // Check for binary formats
    if (Buffer.isBuffer(data)) {
      // Check ZIP signature
      if (data[0] === 0x50 && data[1] === 0x4b) {
        return 'package';
      }
    }

    return 'json'; // Default
  }

  // Transform Methods
  private async applyTransformations(
    pkg: WorkflowPackage,
    options: ImportOptions
  ): Promise<WorkflowPackage> {
    if (!options.transformRules?.length) {
      return pkg;
    }

    const transformed = { ...pkg };

    for (const rule of options.transformRules) {
      switch (rule.type) {
        case 'node':
          transformed.workflows = transformed.workflows.map(w => ({
            ...w,
            nodes: w.nodes.map(n =>
              rule.condition?.(n) ?? true ? rule.transform(n) as ExportedNode : n
            )
          }));
          break;
        case 'connection':
          transformed.workflows = transformed.workflows.map(w => ({
            ...w,
            connections: w.connections.map(c =>
              rule.condition?.(c) ?? true ? rule.transform(c) as ExportedConnection : c
            )
          }));
          break;
        case 'variable':
          if (transformed.variables) {
            transformed.variables = transformed.variables.map(v =>
              rule.condition?.(v) ?? true ? rule.transform(v) as GlobalVariable : v
            );
          }
          break;
      }
    }

    return transformed;
  }

  // Import Execution
  private async performImport(
    pkg: WorkflowPackage,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      workflows: [],
      errors: [],
      warnings: [],
      statistics: {
        totalWorkflows: pkg.workflows.length,
        importedWorkflows: 0,
        updatedWorkflows: 0,
        skippedWorkflows: 0,
        failedWorkflows: 0,
        totalNodes: 0,
        totalConnections: 0,
        totalCredentials: pkg.credentials?.length || 0,
        totalVariables: pkg.variables?.length || 0,
        processingTime: 0
      }
    };

    // Import each workflow
    for (const workflow of pkg.workflows) {
      try {
        const importedWorkflow = await this.importSingleWorkflow(
          workflow,
          options
        );
        
        result.workflows.push(importedWorkflow);
        
        // Update statistics
        if (importedWorkflow.status === 'imported') {
          result.statistics.importedWorkflows++;
        } else if (importedWorkflow.status === 'updated') {
          result.statistics.updatedWorkflows++;
        } else if (importedWorkflow.status === 'skipped') {
          result.statistics.skippedWorkflows++;
        }
        
        result.statistics.totalNodes += importedWorkflow.nodeCount;
        result.statistics.totalConnections += importedWorkflow.connectionCount;
      } catch (error: any) {
        result.statistics.failedWorkflows++;
        result.errors.push({
          type: 'compatibility',
          message: error.message,
          workflowId: workflow.id
        });
      }
    }

    // Import credentials
    if (pkg.credentials && options.mergeStrategy !== 'skip') {
      await this.importCredentials(pkg.credentials, options);
    }

    // Import variables
    if (pkg.variables && options.mergeStrategy !== 'skip') {
      await this.importVariables(pkg.variables, options);
    }

    result.success = result.errors.length === 0;
    return result;
  }

  private async importSingleWorkflow(
    workflow: ExportedWorkflow,
    options: ImportOptions
  ): Promise<ImportedWorkflow> {
    // Check if workflow exists
    const existing = await this.findExistingWorkflow(workflow.id);
    
    if (existing && options.mergeStrategy === 'skip') {
      return {
        id: workflow.id,
        originalId: workflow.id,
        name: workflow.name,
        status: 'skipped',
        nodeCount: workflow.nodes.length,
        connectionCount: workflow.connections.length
      };
    }

    // Apply field mappings
    if (options.mapping) {
      workflow = this.applyFieldMappings(workflow, options.mapping);
    }

    // Save workflow
    const savedWorkflow = await this.saveWorkflow(workflow, {
      overwrite: options.overwrite || existing !== null
    });

    return {
      id: String(savedWorkflow.id),
      originalId: workflow.id,
      name: workflow.name,
      status: existing ? 'updated' : 'imported',
      nodeCount: workflow.nodes.length,
      connectionCount: workflow.connections.length
    };
  }

  // Archive Methods
  private async createArchive(
    pkg: WorkflowPackage,
    options: ExportOptions
  ): Promise<Buffer> {
    const zip = new JSZip();

    // Add metadata
    zip.file('metadata.json', JSON.stringify(pkg.metadata, null, 2));

    // Add workflows
    const workflowsFolder = zip.folder('workflows');
    for (const workflow of pkg.workflows) {
      workflowsFolder!.file(
        `${workflow.id}.json`,
        JSON.stringify(workflow, null, 2)
      );
    }

    // Add credentials
    if (pkg.credentials) {
      const credentialsFolder = zip.folder('credentials');
      for (const credential of pkg.credentials) {
        credentialsFolder!.file(
          `${credential.id}.json`,
          JSON.stringify(credential, null, 2)
        );
      }
    }

    // Add variables
    if (pkg.variables) {
      zip.file('variables.json', JSON.stringify(pkg.variables, null, 2));
    }

    // Add resources
    if (pkg.resources) {
      const resourcesFolder = zip.folder('resources');
      for (const resource of pkg.resources) {
        resourcesFolder!.file(resource.path, resource.content || '');
      }
    }

    // Generate ZIP
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: options.compression ? 'DEFLATE' : 'STORE',
      compressionOptions: { level: 9 }
    });

    return buffer;
  }

  // Converter Initialization
  private initializeConverters(): void {
    // JSON Converter
    this.converters.set('json', new JSONConverter());
    
    // YAML Converter
    this.converters.set('yaml', new YAMLConverter());
    
    // N8N Converter
    this.converters.set('n8n', new N8NConverter());
    
    // Zapier Converter
    this.converters.set('zapier', new ZapierConverter());
    
    // Package Converter
    this.converters.set('package', new PackageConverter());
  }

  private initializeValidators(): void {
    this.validators.set('default', new DefaultWorkflowValidator());
  }

  private initializeTransformers(): void {
    this.transformers.set('default', new DefaultWorkflowTransformer());
  }

  // Helper Methods
  private async exportCredentials(workflow: UnknownRecord): Promise<EncryptedCredential[]> {
    // Implementation for exporting credentials
    return [];
  }

  private async exportVariables(workflow: UnknownRecord): Promise<GlobalVariable[]> {
    // Implementation for exporting variables
    return [];
  }

  private async importCredentials(
    credentials: EncryptedCredential[],
    options: ImportOptions
  ): Promise<void> {
    // Implementation for importing credentials
  }

  private async importVariables(
    variables: GlobalVariable[],
    options: ImportOptions
  ): Promise<void> {
    // Implementation for importing variables
  }

  private async findExistingWorkflow(id: string): Promise<UnknownRecord | null> {
    // Implementation to find existing workflow
    return null;
  }

  private async saveWorkflow(
    workflow: ExportedWorkflow,
    options: { overwrite: boolean }
  ): Promise<UnknownRecord> {
    // Implementation to save workflow
    return { id: workflow.id };
  }

  private applyFieldMappings(
    workflow: ExportedWorkflow,
    mappings: FieldMapping[]
  ): ExportedWorkflow {
    // Implementation for field mappings
    return workflow;
  }

  private mergePackages(packages: WorkflowPackage[]): WorkflowPackage {
    const merged: WorkflowPackage = {
      metadata: packages[0].metadata,
      workflows: [],
      nodes: [],
      credentials: [],
      variables: [],
      resources: [],
      dependencies: []
    };

    for (const pkg of packages) {
      merged.workflows.push(...pkg.workflows);
      if (pkg.nodes) merged.nodes!.push(...pkg.nodes);
      if (pkg.credentials) merged.credentials!.push(...pkg.credentials);
      if (pkg.variables) merged.variables!.push(...pkg.variables);
      if (pkg.resources) merged.resources!.push(...pkg.resources);
      if (pkg.dependencies) merged.dependencies!.push(...pkg.dependencies);
    }

    return merged;
  }

  private async calculateChecksum(pkg: WorkflowPackage): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(pkg));
    return hash.digest('hex');
  }

  private createErrorResult(errors: ValidationError[]): ImportResult {
    return {
      success: false,
      workflows: [],
      errors: errors.map(e => ({
        type: 'validation' as const,
        message: e.message,
        details: e as any
      })),
      warnings: [],
      statistics: {
        totalWorkflows: 0,
        importedWorkflows: 0,
        updatedWorkflows: 0,
        skippedWorkflows: 0,
        failedWorkflows: 0,
        totalNodes: 0,
        totalConnections: 0,
        totalCredentials: 0,
        totalVariables: 0,
        processingTime: 0
      }
    };
  }

  private performDryRun(
    pkg: WorkflowPackage,
    options: ImportOptions
  ): ImportResult {
    const result: ImportResult = {
      success: true,
      workflows: pkg.workflows.map(w => ({
        id: w.id,
        originalId: w.id,
        name: w.name,
        status: 'skipped',
        nodeCount: w.nodes.length,
        connectionCount: w.connections.length
      })),
      errors: [],
      warnings: [{
        type: 'transformed',
        message: 'Dry run mode - no changes were made',
        details: { dryRun: true }
      }],
      statistics: {
        totalWorkflows: pkg.workflows.length,
        importedWorkflows: 0,
        updatedWorkflows: 0,
        skippedWorkflows: pkg.workflows.length,
        failedWorkflows: 0,
        totalNodes: pkg.workflows.reduce((sum, w) => sum + w.nodes.length, 0),
        totalConnections: pkg.workflows.reduce((sum, w) => sum + w.connections.length, 0),
        totalCredentials: pkg.credentials?.length || 0,
        totalVariables: pkg.variables?.length || 0,
        processingTime: 0
      }
    };

    return result;
  }
}

// Converter Classes
class JSONConverter implements FormatConverter {
  name = 'json';

  canImport(data: unknown): boolean {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return parsed && typeof parsed === 'object';
    } catch {
      return false;
    }
  }

  canExport = true;

  async import(data: unknown, options: ImportOptions): Promise<WorkflowPackage> {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Convert to standard package format
    if (parsed.workflows) {
      return parsed as WorkflowPackage;
    }

    // Single workflow
    return {
      metadata: {
        version: '1.0.0',
        exportedAt: new Date(),
        platform: 'workflow-automation',
        platformVersion: '1.0.0'
      },
      workflows: [parsed]
    };
  }

  async export(pkg: WorkflowPackage, options: ExportOptions): Promise<string> {
    if (pkg.workflows.length === 1 && !options.includeCredentials) {
      return JSON.stringify(pkg.workflows[0], null, 2);
    }
    return JSON.stringify(pkg, null, 2);
  }
}

class YAMLConverter implements FormatConverter {
  name = 'yaml';

  canImport(data: unknown): boolean {
    try {
      YAML.parse(data as string);
      return true;
    } catch {
      return false;
    }
  }

  canExport = true;

  async import(data: unknown, options: ImportOptions): Promise<WorkflowPackage> {
    const parsed = YAML.parse(data as string);

    if (parsed.workflows) {
      return parsed as WorkflowPackage;
    }

    return {
      metadata: {
        version: '1.0.0',
        exportedAt: new Date(),
        platform: 'workflow-automation',
        platformVersion: '1.0.0'
      },
      workflows: [parsed]
    };
  }

  async export(pkg: WorkflowPackage, options: ExportOptions): Promise<string> {
    if (pkg.workflows.length === 1 && !options.includeCredentials) {
      return YAML.stringify(pkg.workflows[0]);
    }
    return YAML.stringify(pkg);
  }
}

class N8NConverter implements FormatConverter {
  name = 'n8n';

  canImport(data: unknown): boolean {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return parsed.name && parsed.nodes && parsed.connections;
    } catch {
      return false;
    }
  }

  canExport = true;

  async import(data: unknown, options: ImportOptions): Promise<WorkflowPackage> {
    const n8nWorkflow = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Convert N8N format to our format
    const workflow: ExportedWorkflow = {
      id: n8nWorkflow.id || `n8n_${Date.now()}`,
      name: n8nWorkflow.name,
      nodes: this.convertN8NNodes(n8nWorkflow.nodes),
      connections: this.convertN8NConnections(n8nWorkflow.connections),
      settings: n8nWorkflow.settings,
      tags: n8nWorkflow.tags
    };

    return {
      metadata: {
        version: '1.0.0',
        exportedAt: new Date(),
        platform: 'n8n',
        platformVersion: n8nWorkflow.version || 'unknown'
      },
      workflows: [workflow]
    };
  }

  async export(pkg: WorkflowPackage, options: ExportOptions): Promise<string> {
    const workflow = pkg.workflows[0];
    
    const n8nWorkflow = {
      id: workflow.id,
      name: workflow.name,
      nodes: this.convertToN8NNodes(workflow.nodes),
      connections: this.convertToN8NConnections(workflow.connections),
      settings: workflow.settings,
      tags: workflow.tags,
      version: 1
    };

    return JSON.stringify(n8nWorkflow, null, 2);
  }

  private convertN8NNodes(nodes: UnknownRecord[]): ExportedNode[] {
    return nodes.map(node => ({
      id: node.id as string,
      type: node.type as string,
      name: node.name as string,
      position: node.position as { x: number; y: number },
      parameters: (node.parameters as UnknownRecord) || {},
      credentials: node.credentials as string[] | undefined,
      disabled: node.disabled as boolean | undefined,
      notes: node.notes as string | undefined
    }));
  }

  private convertN8NConnections(connections: UnknownRecord): ExportedConnection[] {
    const result: ExportedConnection[] = [];
    const connectionsObj = connections as Record<string, any>;

    for (const sourceNode in connectionsObj) {
      const sourceConnections = connectionsObj[sourceNode] as Record<string, any>;
      for (const outputType in sourceConnections) {
        const outputConnections = sourceConnections[outputType] as Record<string, any>;
        for (const outputIndex in outputConnections) {
          const connectionsList = outputConnections[outputIndex] as any[];
          for (const connection of connectionsList) {
            result.push({
              sourceNodeId: sourceNode,
              sourceHandleId: `${outputType}_${outputIndex}`,
              targetNodeId: connection.node,
              targetHandleId: `${connection.type}_${connection.index}`
            });
          }
        }
      }
    }

    return result;
  }

  private convertToN8NNodes(nodes: ExportedNode[]): any[] {
    return nodes.map(node => ({
      id: node.id,
      type: node.type,
      name: node.name,
      position: node.position,
      parameters: node.parameters,
      credentials: node.credentials,
      disabled: node.disabled,
      notes: node.notes
    }));
  }

  private convertToN8NConnections(connections: ExportedConnection[]): UnknownRecord {
    const result: UnknownRecord = {};

    for (const conn of connections) {
      if (!result[conn.sourceNodeId]) {
        result[conn.sourceNodeId] = {};
      }

      const [outputType, outputIndex] = (conn.sourceHandleId || 'main_0').split('_');
      const [inputType, inputIndex] = (conn.targetHandleId || 'main_0').split('_');

      const sourceRecord = result[conn.sourceNodeId] as UnknownRecord;
      if (!sourceRecord[outputType]) {
        sourceRecord[outputType] = {};
      }

      const outputRecord = sourceRecord[outputType] as UnknownRecord;
      if (!outputRecord[outputIndex]) {
        outputRecord[outputIndex] = [];
      }

      (outputRecord[outputIndex] as unknown[]).push({
        node: conn.targetNodeId,
        type: inputType,
        index: parseInt(inputIndex)
      });
    }

    return result;
  }
}

class ZapierConverter implements FormatConverter {
  name = 'zapier';

  canImport(data: unknown): boolean {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return parsed.zaps || parsed.tasks;
    } catch {
      return false;
    }
  }

  canExport = false; // Zapier format is proprietary

  async import(data: unknown, options: ImportOptions): Promise<WorkflowPackage> {
    const zapierData = typeof data === 'string' ? JSON.parse(data) : data;
    
    const workflows: ExportedWorkflow[] = [];
    
    // Convert Zapier Zaps to workflows
    const zaps = zapierData.zaps || [zapierData];
    for (const zap of zaps) {
      workflows.push(this.convertZapToWorkflow(zap));
    }

    return {
      metadata: {
        version: '1.0.0',
        exportedAt: new Date(),
        platform: 'zapier',
        platformVersion: 'unknown'
      },
      workflows
    };
  }

  async export(pkg: WorkflowPackage, options: ExportOptions): Promise<string> {
    throw new Error('Export to Zapier format is not supported');
  }

  private convertZapToWorkflow(zap: UnknownRecord): ExportedWorkflow {
    const nodes: ExportedNode[] = [];
    const connections: ExportedConnection[] = [];
    const tasks = zap.tasks as any[];

    // Convert tasks to nodes
    let previousNodeId: string | null = null;
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const nodeId = `task_${i}`;

      nodes.push({
        id: nodeId,
        type: this.mapZapierAppToNodeType(task.app),
        name: task.name || `Task ${i + 1}`,
        position: { x: 250, y: 100 + (i * 150) },
        parameters: task.params || {}
      });

      // Create connection from previous node
      if (previousNodeId) {
        connections.push({
          sourceNodeId: previousNodeId,
          targetNodeId: nodeId
        });
      }

      previousNodeId = nodeId;
    }

    return {
      id: String(zap.id || `zapier_${Date.now()}`),
      name: String(zap.name),
      description: zap.description as string | undefined,
      nodes,
      connections
    };
  }

  private mapZapierAppToNodeType(app: string): string {
    const mapping: { [key: string]: string } = {
      'gmail': 'email',
      'slack': 'slack',
      'sheets': 'googleSheets',
      'calendar': 'googleCalendar',
      'webhook': 'webhook',
      'filter': 'filter',
      'formatter': 'transform'
    };
    
    return mapping[app.toLowerCase()] || app;
  }
}

class PackageConverter implements FormatConverter {
  name = 'package';

  canImport(data: any): boolean {
    // Check for ZIP signature
    if (Buffer.isBuffer(data)) {
      return data[0] === 0x50 && data[1] === 0x4b;
    }
    return false;
  }

  canExport = true;

  async import(data: any, options: ImportOptions): Promise<WorkflowPackage> {
    const zip = await JSZip.loadAsync(data);
    
    // Read metadata
    const metadataFile = zip.file('metadata.json');
    if (!metadataFile) {
      throw new Error('Invalid package: missing metadata.json');
    }
    const metadata = JSON.parse(await metadataFile.async('string'));
    
    // Read workflows
    const workflows: ExportedWorkflow[] = [];
    const workflowsFolder = zip.folder('workflows');
    if (workflowsFolder) {
      const files = workflowsFolder.file(/.*/);
      for (const file of files) {
        const workflow = JSON.parse(await file.async('string'));
        workflows.push(workflow);
      }
    }
    
    // Read other components
    const pkg: WorkflowPackage = {
      metadata,
      workflows
    };
    
    // Read credentials
    const credentialsFolder = zip.folder('credentials');
    if (credentialsFolder) {
      pkg.credentials = [];
      const files = credentialsFolder.file(/.*/);
      for (const file of files) {
        const credential = JSON.parse(await file.async('string'));
        pkg.credentials.push(credential);
      }
    }
    
    // Read variables
    const variablesFile = zip.file('variables.json');
    if (variablesFile) {
      pkg.variables = JSON.parse(await variablesFile.async('string'));
    }
    
    return pkg;
  }

  async export(pkg: WorkflowPackage, options: ExportOptions): Promise<Buffer> {
    const system = WorkflowImportExportSystem.getInstance();
    return system['createArchive'](pkg, options);
  }
}

// Support Classes
class EncryptionService {
  async encrypt(data: unknown, options: UnknownRecord): Promise<Buffer> {
    const crypto = require('crypto');
    const algorithm = options.algorithm || 'aes-256-gcm';
    const password = options.password;
    
    // Generate key from password
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const input = typeof data === 'string' ? data : JSON.stringify(data);
    let encrypted = cipher.update(input, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = (cipher as any).getAuthTag();
    
    // Combine salt, iv, authTag, and encrypted data
    return Buffer.concat([salt, iv, authTag, encrypted]);
  }

  async decrypt(data: unknown, options: UnknownRecord): Promise<unknown> {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const password = options.password;

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);

    // Extract components
    const salt = buffer.slice(0, 32);
    const iv = buffer.slice(32, 48);
    const authTag = buffer.slice(48, 64);
    const encrypted = buffer.slice(64);

    // Generate key from password
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    const result = decrypted.toString('utf8');
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }
}

class CompressionService {
  async compress(data: unknown): Promise<Buffer> {
    const zlib = require('zlib');
    const input = Buffer.isBuffer(data) ? data : Buffer.from(data as string);
    return new Promise((resolve, reject) => {
      zlib.gzip(input, (err: Error | null, result: Buffer) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  async decompress(data: unknown): Promise<Buffer> {
    const zlib = require('zlib');
    const input = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
    return new Promise((resolve, reject) => {
      zlib.gunzip(input, (err: Error | null, result: Buffer) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  isCompressed(data: unknown): boolean {
    if (!Buffer.isBuffer(data)) return false;
    // Check for GZIP signature
    return data[0] === 0x1f && data[1] === 0x8b;
  }
}

class DefaultWorkflowValidator implements WorkflowValidator {
  async validate(workflow: UnknownRecord): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields
    if (!workflow.id) {
      errors.push({
        path: 'id',
        message: 'Workflow ID is required'
      });
    }

    if (!workflow.name) {
      errors.push({
        path: 'name',
        message: 'Workflow name is required'
      });
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push({
        path: 'nodes',
        message: 'Workflow must have nodes array'
      });
    } else if (workflow.nodes.length === 0) {
      warnings.push({
        path: 'nodes',
        message: 'Workflow has no nodes',
        suggestion: 'Add at least one trigger node'
      });
    }

    // Validate nodes
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      workflow.nodes.forEach((node: any, index: number) => {
        if (!node.id) {
          errors.push({
            path: `nodes[${index}].id`,
            message: 'Node ID is required'
          });
        }
        if (!node.type) {
          errors.push({
            path: `nodes[${index}].type`,
            message: 'Node type is required'
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

interface WorkflowValidator {
  validate(workflow: UnknownRecord): Promise<ValidationResult>;
}

class DefaultWorkflowTransformer implements WorkflowTransformer {
  transform(workflow: UnknownRecord, rules: TransformRule[]): UnknownRecord {
    // Implementation
    return workflow;
  }
}

interface WorkflowTransformer {
  transform(workflow: UnknownRecord, rules: TransformRule[]): UnknownRecord;
}

// Export singleton instance
export default WorkflowImportExportSystem.getInstance();