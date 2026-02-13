/**
 * Import/Export Types
 * Comprehensive system for workflow import, export, and migration
 */

import type { WorkflowNode, WorkflowEdge } from './workflow';
import type { WorkflowMetadata } from './common';

export interface WorkflowExport {
  id: string;
  name: string;
  description?: string;
  version: string;
  exportedAt: Date;
  exportedBy: string;
  format: ExportFormat;
  metadata: WorkflowMetadata;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  credentials?: ExportedCredential[];
  customNodes?: ExportedCustomNode[];
  environment?: EnvironmentConfig;
  checksum: string;
}

export type ExportFormat = 'json' | 'yaml' | 'n8n' | 'zapier' | 'make' | 'powerautomate';

export interface ExportedCredential {
  id: string;
  name: string;
  type: string;
  description?: string;
  // Credentials are exported without sensitive data
  requiredFields: string[];
  isEncrypted: boolean;
}

export interface ExportedCustomNode {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  version: string;
  executor: string; // Serialized function code
  documentation?: string;
  icon?: string;
}

export interface EnvironmentConfig {
  variables: EnvironmentVariable[];
  webhookUrl?: string;
  timezone?: string;
  locale?: string;
  features?: string[];
}

export interface EnvironmentVariable {
  name: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

export interface ImportOptions {
  format: ExportFormat;
  overwriteExisting?: boolean;
  importCredentials?: boolean;
  importCustomNodes?: boolean;
  importEnvironment?: boolean;
  dryRun?: boolean;
  mappings?: ImportMappings;
  validation?: ValidationOptions;
}

export interface ImportMappings {
  nodeTypes?: Record<string, string>; // old type -> new type
  credentials?: Record<string, string>; // old id -> new id
  variables?: Record<string, string>; // old name -> new name
  customFields?: Record<string, unknown>;
}

export interface ValidationOptions {
  validateNodeTypes?: boolean;
  validateConnections?: boolean;
  validateCredentials?: boolean;
  validateExpressions?: boolean;
  strictMode?: boolean;
}

export interface ImportResult {
  success: boolean;
  workflowId?: string;
  errors: ImportError[];
  warnings: ImportWarning[];
  statistics: ImportStatistics;
  mappingsApplied: ImportMappings;
}

export interface ImportError {
  type: ImportErrorType;
  message: string;
  nodeId?: string;
  field?: string;
  details?: unknown;
}

export type ImportErrorType = 
  | 'invalid_format'
  | 'missing_node_type'
  | 'invalid_connection'
  | 'missing_credential'
  | 'expression_error'
  | 'version_mismatch'
  | 'checksum_mismatch';

export interface ImportWarning {
  type: ImportWarningType;
  message: string;
  nodeId?: string;
  field?: string;
  suggestion?: string;
}

export type ImportWarningType = 
  | 'deprecated_node'
  | 'missing_optional_field'
  | 'credential_not_found'
  | 'environment_variable_missing'
  | 'feature_not_supported';

export interface ImportStatistics {
  totalNodes: number;
  importedNodes: number;
  totalEdges: number;
  importedEdges: number;
  totalCredentials: number;
  importedCredentials: number;
  executionTime: number;
}

export interface WorkflowMigration {
  id: string;
  fromFormat: ExportFormat;
  toFormat: ExportFormat;
  fromVersion: string;
  toVersion: string;
  rules: MigrationRule[];
  customTransformers: Record<string, MigrationTransformer>;
}

export interface MigrationRule {
  type: 'node' | 'edge' | 'credential' | 'expression';
  pattern: string | RegExp;
  action: MigrationAction;
  config?: unknown;
}

export type MigrationAction = 
  | 'rename'
  | 'replace'
  | 'remove'
  | 'transform'
  | 'split'
  | 'merge';

export interface MigrationTransformer {
  name: string;
  description: string;
  transform: (data: unknown, context: MigrationContext) => unknown;
}

export interface MigrationContext {
  workflow: WorkflowExport;
  node?: WorkflowNode;
  edge?: WorkflowEdge;
  options: ImportOptions;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  includeCredentials: boolean;
  includeCustomNodes: boolean;
  includeEnvironment: boolean;
  filters?: ExportFilters;
  transformations?: ExportTransformation[];
}

export interface ExportFilters {
  nodeTypes?: string[];
  excludeNodeTypes?: string[];
  tags?: string[];
  dateRange?: { start: Date; end: Date };
}

export interface ExportTransformation {
  type: 'sanitize' | 'obfuscate' | 'compress' | 'encrypt';
  config: Record<string, unknown>;
}

export interface BulkExport {
  id: string;
  name: string;
  workflows: string[]; // workflow IDs
  format: ExportFormat;
  options: ExportOptions;
  status: BulkExportStatus;
  progress: number;
  result?: BulkExportResult;
  startedAt: Date;
  completedAt?: Date;
}

export type BulkExportStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExportOptions {
  includeCredentials?: boolean;
  includeCustomNodes?: boolean;
  includeEnvironment?: boolean;
  includeExecutionHistory?: boolean;
  includeAnalytics?: boolean;
  compression?: 'none' | 'gzip' | 'zip';
  encryption?: {
    enabled: boolean;
    publicKey?: string;
  };
}

export interface BulkExportResult {
  file: string; // file path or URL
  size: number;
  checksum: string;
  exports: Array<{
    workflowId: string;
    name: string;
    success: boolean;
    error?: string;
  }>;
}

export interface ImportSource {
  type: 'file' | 'url' | 'text' | 'clipboard';
  data: string | File | URL;
  format?: ExportFormat;
}

export interface FormatConverter {
  fromFormat: ExportFormat;
  toFormat: ExportFormat;
  convert: (data: unknown) => unknown;
  validate: (data: unknown) => boolean;
}

export interface ImportExportService {
  // Export
  exportWorkflow(workflowId: string, format: ExportFormat, options?: ExportOptions): Promise<WorkflowExport>;
  exportBulk(workflowIds: string[], format: ExportFormat, options?: ExportOptions): Promise<BulkExport>;
  downloadExport(exportData: WorkflowExport, filename?: string): Promise<void>;
  
  // Import
  importWorkflow(source: ImportSource, options?: ImportOptions): Promise<ImportResult>;
  validateImport(source: ImportSource, options?: ValidationOptions): Promise<ImportResult>;
  previewImport(source: ImportSource): Promise<WorkflowExport>;
  
  // Migration
  migrateWorkflow(workflow: WorkflowExport, migration: WorkflowMigration): Promise<WorkflowExport>;
  detectFormat(data: unknown): ExportFormat | null;
  
  // Templates
  createExportTemplate(template: Omit<ExportTemplate, 'id'>): Promise<ExportTemplate>;
  applyExportTemplate(workflowId: string, templateId: string): Promise<WorkflowExport>;
  
  // Converters
  registerConverter(converter: FormatConverter): void;
  convertFormat(data: unknown, fromFormat: ExportFormat, toFormat: ExportFormat): Promise<unknown>;
  
  // History
  getExportHistory(workflowId?: string): Promise<WorkflowExport[]>;
  getImportHistory(workflowId?: string): Promise<ImportResult[]>;
}