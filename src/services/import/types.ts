/**
 * Import Types
 * Common types and interfaces for workflow importers
 */

import type { WorkflowNode, WorkflowEdge } from '../../types/workflow';

/**
 * Options for import operations
 */
export interface ImportOptions {
  /** Validate the schema before importing */
  validateSchema?: boolean;
  /** Preserve original IDs from the import source */
  preserveIds?: boolean;
  /** Overwrite existing workflow if ID matches */
  overwriteExisting?: boolean;
  /** Perform a dry run without saving */
  dryRun?: boolean;
  /** Node type mappings for conversion */
  nodeTypeMappings?: Record<string, string>;
  /** Credential ID mappings */
  credentialMappings?: Record<string, string>;
}

/**
 * Workflow data structure for internal use
 */
export interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  version?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
  metadata?: WorkflowImportMetadata;
}

/**
 * Workflow settings that may be imported
 */
export interface WorkflowSettings {
  environment?: string;
  timezone?: string;
  variables?: Record<string, unknown>;
}

/**
 * Metadata attached during import
 */
export interface WorkflowImportMetadata {
  importedAt: Date;
  importedFrom: string;
  originalFormat: string;
  originalId?: string;
}

/**
 * Result of an import operation
 */
export interface ImportResult {
  /** Whether the import was successful */
  success: boolean;
  /** The imported workflow data (if successful) */
  workflow?: WorkflowData;
  /** Errors encountered during import */
  errors?: ImportError[];
  /** Warnings that don't prevent import */
  warnings?: ImportWarning[];
  /** Statistics about the import */
  statistics?: ImportStatistics;
}

/**
 * Import error details
 */
export interface ImportError {
  /** Error code for programmatic handling */
  code: ImportErrorCode;
  /** Human-readable error message */
  message: string;
  /** Path to the problematic field (dot notation) */
  path?: string;
  /** The invalid value that caused the error */
  value?: unknown;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Error codes for import failures
 */
export type ImportErrorCode =
  | 'INVALID_FORMAT'
  | 'INVALID_SCHEMA'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_NODE_TYPE'
  | 'INVALID_CONNECTION'
  | 'DUPLICATE_NODE_ID'
  | 'CIRCULAR_REFERENCE'
  | 'UNSUPPORTED_VERSION'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Import warning details
 */
export interface ImportWarning {
  /** Warning code */
  code: ImportWarningCode;
  /** Human-readable warning message */
  message: string;
  /** Path to the field with the warning */
  path?: string;
  /** Suggested action to resolve the warning */
  suggestion?: string;
}

/**
 * Warning codes for import issues
 */
export type ImportWarningCode =
  | 'DEPRECATED_NODE_TYPE'
  | 'UNKNOWN_NODE_TYPE'
  | 'MISSING_OPTIONAL_FIELD'
  | 'CREDENTIAL_NOT_FOUND'
  | 'UNSUPPORTED_FEATURE'
  | 'VERSION_MISMATCH';

/**
 * Statistics about an import operation
 */
export interface ImportStatistics {
  /** Total number of nodes in the source */
  totalNodes: number;
  /** Number of nodes successfully imported */
  importedNodes: number;
  /** Number of nodes that failed to import */
  failedNodes: number;
  /** Total number of edges in the source */
  totalEdges: number;
  /** Number of edges successfully imported */
  importedEdges: number;
  /** Number of node types that needed mapping */
  mappedNodeTypes: number;
  /** Time taken for the import in milliseconds */
  importDurationMs: number;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  /** Whether the schema is valid */
  valid: boolean;
  /** Validation errors */
  errors: ImportError[];
}

/**
 * Interface that all workflow importers must implement
 */
export interface WorkflowImporter {
  /**
   * Import workflow data from the given source
   * @param data - The raw data to import
   * @param options - Import options
   * @returns Import result with workflow data or errors
   */
  import(data: unknown, options?: ImportOptions): Promise<ImportResult>;

  /**
   * Check if this importer can handle the given data
   * @param data - The data to check
   * @returns true if this importer can handle the data
   */
  canImport(data: unknown): boolean;

  /**
   * Get the format identifier for this importer
   * @returns Format string (e.g., 'json', 'n8n', 'zapier')
   */
  getFormat(): string;

  /**
   * Validate the data without performing the import
   * @param data - The data to validate
   * @returns Validation result
   */
  validate(data: unknown): Promise<SchemaValidationResult>;
}

/**
 * N8n specific types
 */
export interface N8nWorkflow {
  id?: string | number;
  name: string;
  active?: boolean;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings?: N8nSettings;
  staticData?: unknown;
  pinData?: Record<string, unknown[]>;
  versionId?: string;
  meta?: Record<string, unknown>;
}

export interface N8nNode {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, N8nCredentialRef>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  webhookId?: string;
}

export interface N8nCredentialRef {
  id: string;
  name: string;
}

export interface N8nConnections {
  [nodeName: string]: {
    [outputType: string]: N8nConnection[][];
  };
}

export interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8nSettings {
  executionOrder?: 'v0' | 'v1';
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
  timezone?: string;
}

/**
 * Node type mapping configuration
 */
export interface NodeTypeMapping {
  /** Source node type pattern (can include wildcards) */
  sourceType: string;
  /** Target node type in our system */
  targetType: string;
  /** Parameter transformation function */
  transformParameters?: (params: Record<string, unknown>) => Record<string, unknown>;
}
