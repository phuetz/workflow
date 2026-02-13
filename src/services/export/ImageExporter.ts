/**
 * Image Exporter
 * Exports workflow canvas to PNG or SVG format
 */

import type {
  WorkflowExporter,
  WorkflowData,
  ExportOptions,
  ExportResult,
  ExportFormat,
  ImageExportConfig
} from './types';

/**
 * Exports workflows to image formats (PNG, SVG)
 * Uses browser-native canvas and SVG capabilities
 */
export class ImageExporter implements WorkflowExporter {
  private format: 'png' | 'svg';
  private config: ImageExportConfig;

  constructor(format: 'png' | 'svg' = 'png', config: Partial<ImageExportConfig> = {}) {
    this.format = format;
    this.config = {
      format,
      quality: 1,
      pixelRatio: 2,
      includeBackground: true,
      padding: 20,
      ...config
    };
  }

  /**
   * Export a workflow to image format
   * @param workflow - Workflow data to export
   * @param options - Export options
   * @returns Promise resolving to export result with image blob
   */
  async export(
    workflow: WorkflowData,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      const imageBlob = this.format === 'svg'
        ? await this.exportToSvg(workflow, options)
        : await this.exportToPng(workflow, options);

      const filename = options.filename
        ? `${options.filename}.${this.format}`
        : `${this.sanitizeFilename(workflow.name || 'workflow')}.${this.format}`;

      return {
        success: true,
        data: imageBlob,
        mimeType: this.getMimeType(),
        filename,
        size: imageBlob.size,
        exportedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        mimeType: this.getMimeType(),
        filename: `export-failed.${this.format}`,
        errors: [error instanceof Error ? error.message : 'Image export failed']
      };
    }
  }

  /**
   * Get the export format
   */
  getFormat(): ExportFormat {
    return this.format;
  }

  /**
   * Get the MIME type for the image format
   */
  getMimeType(): string {
    return this.format === 'svg' ? 'image/svg+xml' : 'image/png';
  }

  /**
   * Get the file extension for the image format
   */
  getFileExtension(): string {
    return this.format;
  }

  /**
   * Export workflow to PNG format
   */
  private async exportToPng(
    workflow: WorkflowData,
    options: Partial<ExportOptions>
  ): Promise<Blob> {
    const svg = this.generateWorkflowSvg(workflow, options);
    return this.svgToPng(svg, options);
  }

  /**
   * Export workflow to SVG format
   */
  private async exportToSvg(
    workflow: WorkflowData,
    options: Partial<ExportOptions>
  ): Promise<Blob> {
    const svg = this.generateWorkflowSvg(workflow, options);
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  /**
   * Generate SVG representation of the workflow
   */
  private generateWorkflowSvg(
    workflow: WorkflowData,
    options: Partial<ExportOptions>
  ): string {
    const bounds = this.calculateBounds(workflow.nodes);
    const padding = this.config.padding || 20;
    const width = options.width || (bounds.maxX - bounds.minX + padding * 2);
    const height = options.height || (bounds.maxY - bounds.minY + padding * 2);
    const backgroundColor = options.backgroundColor || '#f8fafc';

    const offsetX = -bounds.minX + padding;
    const offsetY = -bounds.minY + padding;

    // Generate edge paths
    const edgePaths = workflow.edges.map(edge => {
      const sourceNode = workflow.nodes.find(n => n.id === edge.source);
      const targetNode = workflow.nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) return '';

      const sourceX = sourceNode.position.x + offsetX + 100; // Node center-right
      const sourceY = sourceNode.position.y + offsetY + 30;
      const targetX = targetNode.position.x + offsetX; // Node left
      const targetY = targetNode.position.y + offsetY + 30;

      // Bezier curve control points
      const midX = (sourceX + targetX) / 2;

      return `<path
        d="M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}"
        stroke="#94a3b8"
        stroke-width="2"
        fill="none"
        marker-end="url(#arrowhead)"
      />`;
    }).join('\n');

    // Generate node rectangles
    const nodeRects = workflow.nodes.map(node => {
      const x = node.position.x + offsetX;
      const y = node.position.y + offsetY;
      const data = node.data as Record<string, unknown>;
      const label = (data.label as string) || node.type;
      const nodeColor = this.getNodeColor(node.type);

      return `
        <g transform="translate(${x}, ${y})">
          <rect
            x="0" y="0"
            width="200" height="60"
            rx="8" ry="8"
            fill="white"
            stroke="${nodeColor}"
            stroke-width="2"
          />
          <rect
            x="0" y="0"
            width="200" height="24"
            rx="8" ry="8"
            fill="${nodeColor}"
          />
          <rect
            x="0" y="16"
            width="200" height="8"
            fill="${nodeColor}"
          />
          <text
            x="100" y="16"
            text-anchor="middle"
            fill="white"
            font-family="system-ui, sans-serif"
            font-size="12"
            font-weight="600"
          >${this.escapeXml(this.truncateText(label, 25))}</text>
          <text
            x="100" y="45"
            text-anchor="middle"
            fill="#64748b"
            font-family="system-ui, sans-serif"
            font-size="11"
          >${this.escapeXml(this.formatNodeType(node.type))}</text>
        </g>
      `;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}"
     height="${height}"
     viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8"/>
    </marker>
  </defs>
  ${this.config.includeBackground ? `<rect width="100%" height="100%" fill="${backgroundColor}"/>` : ''}
  <g class="edges">
    ${edgePaths}
  </g>
  <g class="nodes">
    ${nodeRects}
  </g>
</svg>`;
  }

  /**
   * Convert SVG to PNG using canvas
   */
  private async svgToPng(
    svgString: string,
    options: Partial<ExportOptions>
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const pixelRatio = this.config.pixelRatio || 2;
        const canvas = document.createElement('canvas');
        canvas.width = img.width * pixelRatio;
        canvas.height = img.height * pixelRatio;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.scale(pixelRatio, pixelRatio);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          blob => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create PNG blob'));
            }
          },
          'image/png',
          this.config.quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG for PNG conversion'));
      };

      img.src = url;
    });
  }

  /**
   * Calculate bounds of all nodes
   */
  private calculateBounds(
    nodes: WorkflowData['nodes']
  ): { minX: number; minY: number; maxX: number; maxY: number } {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 200); // Node width
      maxY = Math.max(maxY, node.position.y + 60);  // Node height
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Get color for node based on type
   */
  private getNodeColor(type: string): string {
    const colorMap: Record<string, string> = {
      trigger: '#10b981',     // Green
      webhook: '#10b981',
      schedule: '#10b981',
      http: '#3b82f6',        // Blue
      email: '#8b5cf6',       // Purple
      slack: '#6366f1',       // Indigo
      database: '#f59e0b',    // Amber
      postgres: '#f59e0b',
      mysql: '#f59e0b',
      mongodb: '#f59e0b',
      filter: '#ec4899',      // Pink
      transform: '#ec4899',
      code: '#64748b',        // Slate
      function: '#64748b',
      if: '#f97316',          // Orange
      switch: '#f97316',
      loop: '#14b8a6',        // Teal
      ai: '#a855f7',          // Purple
      openai: '#a855f7',
      anthropic: '#a855f7'
    };

    const lowerType = type.toLowerCase();
    for (const [key, color] of Object.entries(colorMap)) {
      if (lowerType.includes(key)) {
        return color;
      }
    }

    return '#64748b'; // Default slate
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
   * Truncate text to max length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 200);
  }
}
