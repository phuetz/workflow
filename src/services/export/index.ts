/**
 * Export Module
 * Barrel export and factory function for workflow exporters
 */

// Export types
export type {
  ExportFormat,
  WorkflowData,
  ExportOptions,
  ExportResult,
  WorkflowExporter,
  NodeInfo,
  EdgeInfo,
  PdfExportConfig,
  ImageExportConfig,
  MaskedCredential
} from './types';

// Export concrete implementations
export { JsonExporter } from './JsonExporter';
export { PdfExporter } from './PdfExporter';
export { ImageExporter } from './ImageExporter';

// Import for factory function
import type { ExportFormat, WorkflowExporter } from './types';
import { JsonExporter } from './JsonExporter';
import { PdfExporter } from './PdfExporter';
import { ImageExporter } from './ImageExporter';
import { logger } from '../SimpleLogger';

/**
 * Factory function to get the appropriate exporter for a given format
 * @param format - The export format to use
 * @returns The appropriate WorkflowExporter implementation
 * @throws Error if format is not supported
 *
 * @example
 * ```typescript
 * const exporter = getExporter('json');
 * const result = await exporter.export(workflow, { prettyPrint: true });
 * ```
 */
export function getExporter(format: ExportFormat): WorkflowExporter {
  switch (format) {
    case 'json':
      return new JsonExporter();

    case 'pdf':
      return new PdfExporter();

    case 'png':
      return new ImageExporter('png');

    case 'svg':
      return new ImageExporter('svg');

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Get all supported export formats
 * @returns Array of supported format identifiers
 */
export function getSupportedFormats(): ExportFormat[] {
  return ['json', 'pdf', 'png', 'svg'];
}

/**
 * Check if a format is supported
 * @param format - Format to check
 * @returns True if the format is supported
 */
export function isFormatSupported(format: string): format is ExportFormat {
  return getSupportedFormats().includes(format as ExportFormat);
}

/**
 * Get format metadata (mime type, extension, description)
 * @param format - Export format
 * @returns Format metadata object
 */
export function getFormatMetadata(format: ExportFormat): {
  mimeType: string;
  extension: string;
  description: string;
} {
  const metadata: Record<ExportFormat, { mimeType: string; extension: string; description: string }> = {
    json: {
      mimeType: 'application/json',
      extension: 'json',
      description: 'JSON file - Native workflow format'
    },
    pdf: {
      mimeType: 'application/pdf',
      extension: 'pdf',
      description: 'PDF document - Printable documentation'
    },
    png: {
      mimeType: 'image/png',
      extension: 'png',
      description: 'PNG image - Raster workflow diagram'
    },
    svg: {
      mimeType: 'image/svg+xml',
      extension: 'svg',
      description: 'SVG image - Vector workflow diagram'
    }
  };

  return metadata[format];
}

/**
 * Helper to trigger a download of exported content
 * @param result - Export result from any exporter
 */
export function downloadExport(result: import('./types').ExportResult): void {
  if (!result.success || !result.data) {
    logger.error('Cannot download failed export', { component: 'export', errors: result.errors });
    return;
  }

  const blob = result.data instanceof Blob
    ? result.data
    : new Blob([result.data], { type: result.mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
