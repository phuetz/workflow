/**
 * Import/Export Types
 * All interfaces and types for the import/export system
 */

// Re-export types from the main types file
export type {
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
  ImportMappings,
  MigrationRule,
  ExportedCredential,
  ExportedCustomNode,
  EnvironmentConfig
} from '../../types/importExport';

export type { WorkflowNode, WorkflowEdge } from '../../types/workflow';

// Archive file interface for createArchive
export interface ArchiveFile {
  name: string;
  content: string | Buffer;
}

// Archive result interface
export interface ArchiveResult {
  path: string;
  size: number;
  checksum: string;
  fileCount: number;
}

// Encrypted data structure
export interface EncryptedPayload {
  iv: string;
  data: string;
  tag: string;
  algorithm: string;
}

// Custom node definition interface
export interface CustomNodeDefinition {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  category?: string;
  version?: string;
  executor?: ((...args: unknown[]) => unknown) | string;
  documentation?: string;
  icon?: string;
}

// Import statistics
export interface ImportStatistics {
  totalNodes: number;
  importedNodes: number;
  totalEdges: number;
  importedEdges: number;
  totalCredentials: number;
  importedCredentials: number;
  executionTime: number;
}

// Validation result
export interface ValidationResult {
  errors: import('../../types/importExport').ImportError[];
  warnings: import('../../types/importExport').ImportWarning[];
}
