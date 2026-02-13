/**
 * JSON Exporter
 * Exports workflows to native JSON format with configurable options
 */

import type {
  WorkflowExporter,
  WorkflowData,
  ExportOptions,
  ExportResult,
  ExportFormat,
  MaskedCredential
} from './types';

/**
 * Exports workflows to JSON format
 * Supports pretty printing, credential masking, and metadata inclusion
 */
export class JsonExporter implements WorkflowExporter {
  /**
   * Export a workflow to JSON format
   * @param workflow - Workflow data to export
   * @param options - Export options
   * @returns Promise resolving to export result with JSON string
   */
  async export(
    workflow: WorkflowData,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const exportData = this.prepareExportData(workflow, options);
      const indent = options.prettyPrint ? 2 : 0;
      const jsonString = JSON.stringify(exportData, null, indent);

      const filename = options.filename
        ? `${options.filename}.json`
        : `${this.sanitizeFilename(workflow.name || 'workflow')}.json`;

      return {
        success: true,
        data: jsonString,
        mimeType: this.getMimeType(),
        filename,
        size: new Blob([jsonString]).size,
        exportedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        mimeType: this.getMimeType(),
        filename: 'export-failed.json',
        errors: [error instanceof Error ? error.message : 'Unknown export error']
      };
    }
  }

  /**
   * Get the export format
   */
  getFormat(): ExportFormat {
    return 'json';
  }

  /**
   * Get the MIME type for JSON
   */
  getMimeType(): string {
    return 'application/json';
  }

  /**
   * Get the file extension for JSON
   */
  getFileExtension(): string {
    return 'json';
  }

  /**
   * Prepare workflow data for export based on options
   */
  private prepareExportData(
    workflow: WorkflowData,
    options: Partial<ExportOptions>
  ): Record<string, unknown> {
    const exportData: Record<string, unknown> = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes,
      edges: workflow.edges
    };

    // Include metadata if requested
    if (options.includeMetadata !== false) {
      exportData.version = workflow.version || '1.0.0';
      exportData.createdAt = workflow.createdAt;
      exportData.updatedAt = workflow.updatedAt;
      exportData.exportedAt = new Date().toISOString();
      exportData.settings = workflow.settings;

      if (workflow.metadata) {
        exportData.metadata = workflow.metadata;
      }
    }

    // Include masked credentials if requested
    if (options.includeCredentials) {
      exportData.credentials = this.extractMaskedCredentials(workflow.nodes);
    }

    return exportData;
  }

  /**
   * Extract and mask credentials from workflow nodes
   */
  private extractMaskedCredentials(
    nodes: WorkflowData['nodes']
  ): MaskedCredential[] {
    const credentials: MaskedCredential[] = [];
    const seenTypes = new Set<string>();

    for (const node of nodes) {
      const nodeData = node.data as Record<string, unknown>;
      const nodeCredentials = nodeData.credentials as Record<string, unknown> | undefined;

      if (nodeCredentials) {
        for (const [credType, credValue] of Object.entries(nodeCredentials)) {
          if (!seenTypes.has(credType)) {
            seenTypes.add(credType);
            credentials.push({
              id: `cred_${credType}_${Date.now()}`,
              name: credType,
              type: credType,
              fields: this.getCredentialFields(credValue),
              lastUsed: new Date().toISOString()
            });
          }
        }
      }
    }

    return credentials;
  }

  /**
   * Get field names from a credential object (values are masked)
   */
  private getCredentialFields(credential: unknown): string[] {
    if (typeof credential === 'object' && credential !== null) {
      return Object.keys(credential);
    }
    return [];
  }

  /**
   * Sanitize a filename by removing invalid characters
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 200);
  }
}
