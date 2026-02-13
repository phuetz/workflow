/**
 * Import Services
 * Barrel export and factory for workflow importers
 */

// Export types
export type {
  ImportOptions,
  ImportResult,
  ImportError,
  ImportErrorCode,
  ImportWarning,
  ImportWarningCode,
  ImportStatistics,
  WorkflowData,
  WorkflowSettings,
  WorkflowImportMetadata,
  SchemaValidationResult,
  WorkflowImporter,
  N8nWorkflow,
  N8nNode,
  N8nConnections,
  N8nConnection,
  N8nCredentialRef,
  N8nSettings,
  NodeTypeMapping
} from './types';

// Export importer classes
export { JsonImporter } from './JsonImporter';
export { N8nImporter } from './N8nImporter';

// Import importer classes for factory
import { JsonImporter } from './JsonImporter';
import { N8nImporter } from './N8nImporter';
import type { WorkflowImporter, ImportResult, ImportOptions } from './types';

/**
 * Supported import formats
 */
export type ImportFormat = 'json' | 'n8n' | 'auto';

/**
 * Registry of available importers
 */
const importerRegistry: Map<string, WorkflowImporter> = new Map();

// Initialize with built-in importers
const jsonImporter = new JsonImporter();
const n8nImporter = new N8nImporter();

importerRegistry.set('json', jsonImporter);
importerRegistry.set('n8n', n8nImporter);

/**
 * Get an importer for the specified format
 * @param format - The import format ('json', 'n8n', or 'auto')
 * @returns The appropriate importer or null if not found
 */
export function getImporter(format: ImportFormat): WorkflowImporter | null {
  if (format === 'auto') {
    return null; // Use detectAndGetImporter for auto-detection
  }
  return importerRegistry.get(format) || null;
}

/**
 * Detect the format of the given data and return the appropriate importer
 * @param data - The data to analyze
 * @returns The appropriate importer or null if format cannot be detected
 */
export function detectAndGetImporter(data: unknown): WorkflowImporter | null {
  // Try each importer in order of specificity (most specific first)
  const importerOrder: WorkflowImporter[] = [
    n8nImporter,  // n8n format is more specific
    jsonImporter  // JSON is the fallback
  ];

  for (const importer of importerOrder) {
    if (importer.canImport(data)) {
      return importer;
    }
  }

  return null;
}

/**
 * Detect the format of the given data
 * @param data - The data to analyze
 * @returns The detected format or null if unknown
 */
export function detectFormat(data: unknown): ImportFormat | null {
  if (n8nImporter.canImport(data)) {
    return 'n8n';
  }
  if (jsonImporter.canImport(data)) {
    return 'json';
  }
  return null;
}

/**
 * Register a custom importer
 * @param format - The format identifier
 * @param importer - The importer implementation
 */
export function registerImporter(format: string, importer: WorkflowImporter): void {
  importerRegistry.set(format, importer);
}

/**
 * Unregister an importer
 * @param format - The format identifier to remove
 * @returns true if the importer was removed, false if it wasn't registered
 */
export function unregisterImporter(format: string): boolean {
  return importerRegistry.delete(format);
}

/**
 * Get all registered format names
 * @returns Array of registered format names
 */
export function getRegisteredFormats(): string[] {
  return Array.from(importerRegistry.keys());
}

/**
 * Import workflow from data with auto-detection or specified format
 * @param data - The raw data to import
 * @param format - The format ('json', 'n8n', or 'auto' for auto-detection)
 * @param options - Import options
 * @returns Import result
 */
export async function importWorkflow(
  data: unknown,
  format: ImportFormat = 'auto',
  options: ImportOptions = {}
): Promise<ImportResult> {
  let importer: WorkflowImporter | null;

  if (format === 'auto') {
    importer = detectAndGetImporter(data);
    if (!importer) {
      return {
        success: false,
        errors: [{
          code: 'INVALID_FORMAT',
          message: 'Could not detect the workflow format. Please specify the format explicitly.'
        }],
        warnings: []
      };
    }
  } else {
    importer = getImporter(format);
    if (!importer) {
      return {
        success: false,
        errors: [{
          code: 'INVALID_FORMAT',
          message: `Unknown import format: ${format}. Available formats: ${getRegisteredFormats().join(', ')}`
        }],
        warnings: []
      };
    }
  }

  return importer.import(data, options);
}

/**
 * Parse a string or file content and import as workflow
 * @param content - String content (JSON or YAML)
 * @param format - The format ('json', 'n8n', or 'auto')
 * @param options - Import options
 * @returns Import result
 */
export async function importWorkflowFromString(
  content: string,
  format: ImportFormat = 'auto',
  options: ImportOptions = {}
): Promise<ImportResult> {
  let data: unknown;

  try {
    // Try to parse as JSON first
    data = JSON.parse(content);
  } catch {
    // If JSON parsing fails, try YAML
    try {
      // Dynamic import for YAML support
      const yaml = await import('js-yaml');
      data = yaml.load(content);
    } catch {
      return {
        success: false,
        errors: [{
          code: 'PARSE_ERROR',
          message: 'Failed to parse content as JSON or YAML'
        }],
        warnings: []
      };
    }
  }

  return importWorkflow(data, format, options);
}

/**
 * Validate workflow data without importing
 * @param data - The data to validate
 * @param format - The format ('json', 'n8n', or 'auto')
 * @returns Validation result with any errors found
 */
export async function validateWorkflow(
  data: unknown,
  format: ImportFormat = 'auto'
): Promise<{ valid: boolean; format: string | null; errors: ImportResult['errors'] }> {
  let importer: WorkflowImporter | null;
  let detectedFormat: string | null = null;

  if (format === 'auto') {
    importer = detectAndGetImporter(data);
    if (importer) {
      detectedFormat = importer.getFormat();
    }
  } else {
    importer = getImporter(format);
    detectedFormat = format;
  }

  if (!importer) {
    return {
      valid: false,
      format: null,
      errors: [{
        code: 'INVALID_FORMAT',
        message: 'Could not determine workflow format'
      }]
    };
  }

  const result = await importer.validate(data);
  return {
    valid: result.valid,
    format: detectedFormat,
    errors: result.errors
  };
}
