/**
 * Export Module Types
 * Common types and interfaces for all workflow exporters
 */

import type { WorkflowNode, WorkflowEdge } from '../../types/workflow';

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'pdf' | 'png' | 'svg';

/**
 * Workflow data structure for export
 */
export interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  version?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt?: string;
  updatedAt?: string;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Options for controlling export behavior
 */
export interface ExportOptions {
  /** Export format to use */
  format: ExportFormat;
  /** Include masked credentials in export */
  includeCredentials?: boolean;
  /** Include workflow metadata (creation date, version, etc.) */
  includeMetadata?: boolean;
  /** Pretty print JSON output with indentation */
  prettyPrint?: boolean;
  /** Image width for PNG/SVG exports */
  width?: number;
  /** Image height for PNG/SVG exports */
  height?: number;
  /** Background color for image exports */
  backgroundColor?: string;
  /** Scale factor for image exports */
  scale?: number;
  /** Include node configurations in PDF */
  includeNodeConfigs?: boolean;
  /** Custom filename (without extension) */
  filename?: string;
}

/**
 * Result of an export operation
 */
export interface ExportResult {
  /** Whether the export was successful */
  success: boolean;
  /** Exported data (string for JSON, Blob for binary formats) */
  data?: string | Blob;
  /** MIME type of the exported data */
  mimeType: string;
  /** Suggested filename for download */
  filename: string;
  /** Size of the exported data in bytes */
  size?: number;
  /** Error messages if export failed */
  errors?: string[];
  /** Warnings that occurred during export */
  warnings?: string[];
  /** Export timestamp */
  exportedAt?: Date;
}

/**
 * Interface that all workflow exporters must implement
 */
export interface WorkflowExporter {
  /**
   * Export a workflow to the specific format
   * @param workflow - Workflow data to export
   * @param options - Export options
   * @returns Promise resolving to export result
   */
  export(workflow: WorkflowData, options?: Partial<ExportOptions>): Promise<ExportResult>;

  /**
   * Get the export format this exporter handles
   */
  getFormat(): ExportFormat;

  /**
   * Get the MIME type for this export format
   */
  getMimeType(): string;

  /**
   * Get the default file extension for this format
   */
  getFileExtension(): string;
}

/**
 * Node information for documentation exports
 */
export interface NodeInfo {
  id: string;
  type: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
  inputs: string[];
  outputs: string[];
  config?: Record<string, unknown>;
}

/**
 * Edge information for documentation exports
 */
export interface EdgeInfo {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

/**
 * Configuration for PDF export
 */
export interface PdfExportConfig {
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Include table of contents */
  includeToc?: boolean;
  /** Include workflow diagram */
  includeDiagram?: boolean;
  /** Include node list with configs */
  includeNodeList?: boolean;
  /** Include connection list */
  includeConnectionList?: boolean;
  /** Page size (A4, Letter, etc.) */
  pageSize?: 'A4' | 'Letter' | 'Legal';
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
}

/**
 * Configuration for image export
 */
export interface ImageExportConfig {
  /** Target element selector or ref */
  element?: HTMLElement | null;
  /** Output format */
  format: 'png' | 'svg';
  /** Image quality (0-1) for PNG */
  quality?: number;
  /** Pixel ratio for high-DPI displays */
  pixelRatio?: number;
  /** Include workflow canvas background */
  includeBackground?: boolean;
  /** Padding around the workflow in pixels */
  padding?: number;
}

/**
 * Masked credential for export
 */
export interface MaskedCredential {
  id: string;
  name: string;
  type: string;
  fields: string[];
  lastUsed?: string;
}
