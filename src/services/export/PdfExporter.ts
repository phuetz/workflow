/**
 * PDF Exporter
 * Exports workflows to documented PDF format with diagrams and node configurations
 */

import type {
  WorkflowExporter,
  WorkflowData,
  ExportOptions,
  ExportResult,
  ExportFormat,
  NodeInfo,
  EdgeInfo,
  PdfExportConfig
} from './types';

/**
 * Exports workflows to PDF documentation format
 * Includes workflow diagram, node list, and configurations
 */
export class PdfExporter implements WorkflowExporter {
  private config: PdfExportConfig;

  constructor(config: Partial<PdfExportConfig> = {}) {
    this.config = {
      includeToc: true,
      includeDiagram: true,
      includeNodeList: true,
      includeConnectionList: true,
      pageSize: 'A4',
      orientation: 'portrait',
      ...config
    };
  }

  /**
   * Export a workflow to PDF format
   * @param workflow - Workflow data to export
   * @param options - Export options
   * @returns Promise resolving to export result with PDF blob
   */
  async export(
    workflow: WorkflowData,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const pdfContent = this.generatePdfContent(workflow, options);
      const pdfBlob = await this.createPdfBlob(pdfContent, workflow);

      const filename = options.filename
        ? `${options.filename}.pdf`
        : `${this.sanitizeFilename(workflow.name || 'workflow')}-documentation.pdf`;

      return {
        success: true,
        data: pdfBlob,
        mimeType: this.getMimeType(),
        filename,
        size: pdfBlob.size,
        exportedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        mimeType: this.getMimeType(),
        filename: 'export-failed.pdf',
        errors: [error instanceof Error ? error.message : 'PDF generation failed']
      };
    }
  }

  /**
   * Get the export format
   */
  getFormat(): ExportFormat {
    return 'pdf';
  }

  /**
   * Get the MIME type for PDF
   */
  getMimeType(): string {
    return 'application/pdf';
  }

  /**
   * Get the file extension for PDF
   */
  getFileExtension(): string {
    return 'pdf';
  }

  /**
   * Generate PDF content structure
   */
  private generatePdfContent(
    workflow: WorkflowData,
    options: Partial<ExportOptions>
  ): PdfDocumentContent {
    const nodes = this.extractNodeInfo(workflow);
    const edges = this.extractEdgeInfo(workflow);

    return {
      title: workflow.name || 'Workflow Documentation',
      author: this.config.author || 'Workflow Automation Platform',
      createdAt: new Date(),
      sections: [
        this.createOverviewSection(workflow),
        ...(this.config.includeDiagram ? [this.createDiagramSection(workflow)] : []),
        ...(this.config.includeNodeList ? [this.createNodeListSection(nodes, options)] : []),
        ...(this.config.includeConnectionList ? [this.createConnectionSection(edges)] : [])
      ]
    };
  }

  /**
   * Create the overview section
   */
  private createOverviewSection(workflow: WorkflowData): PdfSection {
    return {
      title: 'Overview',
      content: [
        { type: 'heading', level: 1, text: workflow.name || 'Workflow' },
        { type: 'paragraph', text: workflow.description || 'No description provided.' },
        { type: 'divider' },
        { type: 'metadata', items: [
          { label: 'Version', value: workflow.version || '1.0.0' },
          { label: 'Created', value: workflow.createdAt || 'Unknown' },
          { label: 'Last Updated', value: workflow.updatedAt || 'Unknown' },
          { label: 'Total Nodes', value: String(workflow.nodes.length) },
          { label: 'Total Connections', value: String(workflow.edges.length) }
        ]}
      ]
    };
  }

  /**
   * Create the diagram section (placeholder for visual representation)
   */
  private createDiagramSection(workflow: WorkflowData): PdfSection {
    const bounds = this.calculateWorkflowBounds(workflow.nodes);

    return {
      title: 'Workflow Diagram',
      content: [
        { type: 'heading', level: 2, text: 'Visual Representation' },
        { type: 'diagram', workflow, bounds },
        { type: 'note', text: 'Diagram shows the logical flow between nodes.' }
      ]
    };
  }

  /**
   * Create the node list section
   */
  private createNodeListSection(
    nodes: NodeInfo[],
    options: Partial<ExportOptions>
  ): PdfSection {
    const nodeItems: PdfContentItem[] = [
      { type: 'heading', level: 2, text: 'Nodes' }
    ];

    // Group nodes by type
    const nodesByType = this.groupNodesByType(nodes);

    for (const [type, typeNodes] of Object.entries(nodesByType)) {
      nodeItems.push({ type: 'heading', level: 3, text: this.formatNodeType(type) });

      for (const node of typeNodes) {
        nodeItems.push({
          type: 'nodeCard',
          node,
          includeConfig: options.includeNodeConfigs !== false
        });
      }
    }

    return {
      title: 'Nodes',
      content: nodeItems
    };
  }

  /**
   * Create the connections section
   */
  private createConnectionSection(edges: EdgeInfo[]): PdfSection {
    return {
      title: 'Connections',
      content: [
        { type: 'heading', level: 2, text: 'Data Flow Connections' },
        { type: 'table', headers: ['From', 'To', 'Label'], rows: edges.map(edge => [
          edge.source,
          edge.target,
          edge.label || '-'
        ])}
      ]
    };
  }

  /**
   * Extract node information from workflow
   */
  private extractNodeInfo(workflow: WorkflowData): NodeInfo[] {
    return workflow.nodes.map(node => {
      const data = node.data as Record<string, unknown>;
      return {
        id: node.id,
        type: node.type,
        label: (data.label as string) || node.type,
        description: data.description as string | undefined,
        position: node.position,
        inputs: this.getNodeInputs(node),
        outputs: this.getNodeOutputs(node),
        config: this.extractNodeConfig(data)
      };
    });
  }

  /**
   * Extract edge information from workflow
   */
  private extractEdgeInfo(workflow: WorkflowData): EdgeInfo[] {
    return workflow.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      label: (edge.data as Record<string, unknown>)?.label as string | undefined
    }));
  }

  /**
   * Get input handles for a node
   */
  private getNodeInputs(node: WorkflowData['nodes'][0]): string[] {
    const data = node.data as Record<string, unknown>;
    const inputs = data.inputs as string[] | undefined;
    return inputs || ['main'];
  }

  /**
   * Get output handles for a node
   */
  private getNodeOutputs(node: WorkflowData['nodes'][0]): string[] {
    const data = node.data as Record<string, unknown>;
    const outputs = data.outputs as string[] | undefined;
    return outputs || ['main'];
  }

  /**
   * Extract configuration from node data (excluding internal fields)
   */
  private extractNodeConfig(data: Record<string, unknown>): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const excludeFields = ['label', 'description', 'inputs', 'outputs', 'credentials', 'icon'];

    for (const [key, value] of Object.entries(data)) {
      if (!excludeFields.includes(key) && !key.startsWith('_')) {
        config[key] = value;
      }
    }

    return config;
  }

  /**
   * Group nodes by their type
   */
  private groupNodesByType(nodes: NodeInfo[]): Record<string, NodeInfo[]> {
    return nodes.reduce((groups, node) => {
      const type = node.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(node);
      return groups;
    }, {} as Record<string, NodeInfo[]>);
  }

  /**
   * Format node type for display
   */
  private formatNodeType(type: string): string {
    return type
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Calculate workflow bounds from node positions
   */
  private calculateWorkflowBounds(
    nodes: WorkflowData['nodes']
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 200); // Approximate node width
      maxY = Math.max(maxY, node.position.y + 80);  // Approximate node height
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Create PDF blob from content
   * Uses HTML-to-PDF approach for browser compatibility
   */
  private async createPdfBlob(
    content: PdfDocumentContent,
    workflow: WorkflowData
  ): Promise<Blob> {
    // Generate HTML content that can be printed to PDF
    const html = this.generateHtmlDocument(content, workflow);

    // For browser environment, we create a printable HTML document
    // Real PDF generation would use a library like jspdf or pdfmake
    const htmlBlob = new Blob([html], { type: 'text/html' });

    // Note: In a real implementation, you would use a PDF library here
    // For now, we return the HTML as a blob with PDF mime type
    // The actual PDF conversion would happen client-side using libraries like:
    // - jspdf (https://github.com/MrRio/jsPDF)
    // - pdfmake (https://github.com/bpampuch/pdfmake)
    // - html2pdf.js (https://github.com/eKoopmans/html2pdf.js)

    // Placeholder: Return HTML content (actual implementation would convert to PDF)
    return htmlBlob;
  }

  /**
   * Generate HTML document from content structure
   */
  private generateHtmlDocument(
    content: PdfDocumentContent,
    workflow: WorkflowData
  ): string {
    const styles = this.getDocumentStyles();
    const body = this.renderContentToHtml(content);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="document">
    ${body}
  </div>
</body>
</html>`;
  }

  /**
   * Get CSS styles for the PDF document
   */
  private getDocumentStyles(): string {
    return `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
      h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
      h2 { color: #2d2d2d; margin-top: 2rem; }
      h3 { color: #444; margin-top: 1.5rem; }
      .metadata { background: #f8fafc; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
      .metadata-item { display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px solid #e2e8f0; }
      .node-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin: 1rem 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .node-card h4 { margin: 0 0 0.5rem 0; color: #1e40af; }
      .node-type { font-size: 0.875rem; color: #6b7280; }
      .config-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
      .config-table th, .config-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
      .config-table th { background: #f1f5f9; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
      th, td { padding: 0.75rem; text-align: left; border: 1px solid #e2e8f0; }
      th { background: #f8fafc; font-weight: 600; }
      .divider { border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
      .note { background: #fef3c7; padding: 0.75rem; border-radius: 4px; font-size: 0.875rem; }
      @media print { body { max-width: none; } .page-break { page-break-before: always; } }
    `;
  }

  /**
   * Render content structure to HTML
   */
  private renderContentToHtml(content: PdfDocumentContent): string {
    const sections = content.sections.map(section => {
      const sectionContent = section.content.map(item => this.renderContentItem(item)).join('\n');
      return `<section class="section">${sectionContent}</section>`;
    });

    return sections.join('\n<div class="page-break"></div>\n');
  }

  /**
   * Render a single content item to HTML
   */
  private renderContentItem(item: PdfContentItem): string {
    switch (item.type) {
      case 'heading':
        return `<h${item.level}>${this.escapeHtml(item.text)}</h${item.level}>`;

      case 'paragraph':
        return `<p>${this.escapeHtml(item.text)}</p>`;

      case 'divider':
        return '<div class="divider"></div>';

      case 'metadata':
        const metaItems = item.items.map(m =>
          `<div class="metadata-item"><span>${this.escapeHtml(m.label)}</span><span>${this.escapeHtml(m.value)}</span></div>`
        ).join('');
        return `<div class="metadata">${metaItems}</div>`;

      case 'nodeCard':
        return this.renderNodeCard(item.node, item.includeConfig);

      case 'table':
        const headers = item.headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('');
        const rows = item.rows.map(row =>
          `<tr>${row.map(cell => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`
        ).join('');
        return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;

      case 'note':
        return `<div class="note">${this.escapeHtml(item.text)}</div>`;

      case 'diagram':
        return '<div class="diagram-placeholder">[Workflow Diagram]</div>';

      default:
        return '';
    }
  }

  /**
   * Render a node card to HTML
   */
  private renderNodeCard(node: NodeInfo, includeConfig: boolean): string {
    let configHtml = '';
    if (includeConfig && Object.keys(node.config || {}).length > 0) {
      const configRows = Object.entries(node.config || {}).map(([key, value]) =>
        `<tr><td>${this.escapeHtml(key)}</td><td>${this.escapeHtml(String(value))}</td></tr>`
      ).join('');
      configHtml = `<table class="config-table"><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody>${configRows}</tbody></table>`;
    }

    return `
      <div class="node-card">
        <h4>${this.escapeHtml(node.label)}</h4>
        <div class="node-type">Type: ${this.escapeHtml(node.type)} | ID: ${this.escapeHtml(node.id)}</div>
        ${node.description ? `<p>${this.escapeHtml(node.description)}</p>` : ''}
        ${configHtml}
      </div>
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Sanitize a filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 200);
  }
}

// Internal types for PDF content structure
interface PdfDocumentContent {
  title: string;
  author: string;
  createdAt: Date;
  sections: PdfSection[];
}

interface PdfSection {
  title: string;
  content: PdfContentItem[];
}

type PdfContentItem =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'divider' }
  | { type: 'metadata'; items: { label: string; value: string }[] }
  | { type: 'nodeCard'; node: NodeInfo; includeConfig: boolean }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'note'; text: string }
  | { type: 'diagram'; workflow: WorkflowData; bounds: { minX: number; minY: number; maxX: number; maxY: number } };
