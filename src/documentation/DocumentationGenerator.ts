/**
 * Documentation Generator
 * Main orchestrator for auto-generating comprehensive workflow documentation
 */

import type {
  WorkflowAnalysis,
  DocumentationConfig,
  GeneratedDocumentation,
  DocumentationProgress,
} from '../types/workflowDocumentation';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';

import { WorkflowAnalyzer } from './WorkflowAnalyzer';
import { MetadataExtractor, type WorkflowData } from './MetadataExtractor';
import { TemplateEngine } from './TemplateEngine';
import { MermaidGenerator } from './diagrams/MermaidGenerator';
import { MarkdownExporter } from './exporters/MarkdownExporter';
import { JSONExporter } from './exporters/JSONExporter';
import { OpenAPIExporter } from './exporters/OpenAPIExporter';

export class DocumentationGenerator {
  private analyzer: WorkflowAnalyzer;
  private metadataExtractor: MetadataExtractor;
  private templateEngine: TemplateEngine;
  private mermaidGenerator: MermaidGenerator;
  private markdownExporter: MarkdownExporter;
  private jsonExporter: JSONExporter;
  private openAPIExporter: OpenAPIExporter;

  private progressCallbacks: Map<string, (progress: DocumentationProgress) => void> = new Map();

  constructor() {
    this.analyzer = new WorkflowAnalyzer();
    this.metadataExtractor = new MetadataExtractor();
    this.templateEngine = new TemplateEngine();
    this.mermaidGenerator = new MermaidGenerator();
    this.markdownExporter = new MarkdownExporter();
    this.jsonExporter = new JSONExporter();
    this.openAPIExporter = new OpenAPIExporter();
  }

  /**
   * Generate comprehensive documentation
   */
  async generate(
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    config: DocumentationConfig,
    metadata?: Record<string, any>
  ): Promise<GeneratedDocumentation> {
    const taskId = this.generateTaskId();
    const startTime = performance.now();

    try {
      // Initialize
      this.updateProgress(taskId, {
        status: 'initializing',
        progress: 0,
        currentStep: 'Initializing documentation generation',
        startTime: new Date(),
      });

      // Analyze workflow
      this.updateProgress(taskId, {
        status: 'analyzing',
        progress: 20,
        currentStep: 'Analyzing workflow structure',
        startTime: new Date(),
      });

      const analysis = await this.analyzer.analyzeWorkflow(workflowId, nodes, edges, metadata);

      // Generate diagrams
      this.updateProgress(taskId, {
        status: 'generating_diagrams',
        progress: 40,
        currentStep: 'Generating diagrams',
        startTime: new Date(),
      });

      const diagrams = await this.generateDiagrams(analysis, config);

      // Render documentation
      this.updateProgress(taskId, {
        status: 'rendering',
        progress: 60,
        currentStep: 'Rendering documentation',
        startTime: new Date(),
      });

      const content = await this.renderDocumentation(analysis, config);

      // Export
      this.updateProgress(taskId, {
        status: 'exporting',
        progress: 80,
        currentStep: 'Exporting documentation',
        startTime: new Date(),
      });

      const generationTime = performance.now() - startTime;

      const documentation: GeneratedDocumentation = {
        id: taskId,
        workflowId,
        format: config.format,
        content,
        generatedAt: new Date(),
        generatedBy: config.author,
        version: config.version || '1.0.0',
        diagrams,
        generationTime,
        config,
      };

      // Complete
      this.updateProgress(taskId, {
        status: 'complete',
        progress: 100,
        currentStep: 'Documentation generated successfully',
        startTime: new Date(),
      });

      return documentation;
    } catch (error) {
      this.updateProgress(taskId, {
        status: 'error',
        progress: 0,
        currentStep: 'Error generating documentation',
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime: new Date(),
      });

      throw error;
    }
  }

  /**
   * Analyze workflow only
   */
  async analyze(
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    metadata?: Record<string, any>
  ): Promise<WorkflowAnalysis> {
    return this.analyzer.analyzeWorkflow(workflowId, nodes, edges, metadata);
  }

  /**
   * Generate diagrams for workflow
   */
  private async generateDiagrams(
    analysis: WorkflowAnalysis,
    config: DocumentationConfig
  ): Promise<GeneratedDocumentation['diagrams']> {
    const diagrams: GeneratedDocumentation['diagrams'] = [];

    // Mermaid diagram
    if (config.diagramFormat === 'mermaid' || !config.diagramFormat) {
      const mermaidCode = this.mermaidGenerator.generateStyled(analysis, {
        theme: 'default',
        direction: config.diagramLayout === 'horizontal' ? 'LR' : 'TB',
      });

      diagrams.push({
        format: 'mermaid',
        content: mermaidCode,
      });
    }

    return diagrams;
  }

  /**
   * Render documentation based on format
   */
  private async renderDocumentation(
    analysis: WorkflowAnalysis,
    config: DocumentationConfig
  ): Promise<string> {
    switch (config.format) {
      case 'markdown':
        return this.markdownExporter.export(analysis, config);

      case 'json':
        return this.jsonExporter.export(analysis, config);

      case 'openapi':
        return this.openAPIExporter.exportYAML(analysis);

      case 'html':
        return this.renderHTML(analysis, config);

      case 'pdf':
        return this.renderPDF(analysis, config);

      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  /**
   * Render HTML documentation
   */
  private async renderHTML(analysis: WorkflowAnalysis, config: DocumentationConfig): Promise<string> {
    // Convert Markdown to HTML
    const markdown = this.markdownExporter.export(analysis, config);

    // Wrap in HTML template
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${analysis.metadata.name} - Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    code {
      background-color: #f6f8fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #dfe2e5;
      padding: 8px 13px;
      text-align: left;
    }
    th {
      background-color: #f6f8fa;
      font-weight: 600;
    }
    blockquote {
      border-left: 4px solid #dfe2e5;
      padding: 0 16px;
      color: #6a737d;
      margin: 0;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .badge {
      display: inline-block;
      padding: 3px 6px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      color: #fff;
      border-radius: 3px;
      margin-right: 4px;
    }
    .badge-blue { background-color: #0366d6; }
    .badge-green { background-color: #28a745; }
    .badge-orange { background-color: #f66a0a; }
  </style>
  ${config.embedDiagrams ? '<script type="module">import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs"; mermaid.initialize({ startOnLoad: true });</script>' : ''}
</head>
<body>
  <div id="content">
${markdown}
  </div>
</body>
</html>`;
  }

  /**
   * Render PDF documentation (placeholder)
   */
  private async renderPDF(analysis: WorkflowAnalysis, config: DocumentationConfig): Promise<string> {
    // For PDF generation, we would use puppeteer
    // For now, return HTML that can be converted to PDF
    return this.renderHTML(analysis, config);
  }

  /**
   * Quick export to specific format
   */
  async export(
    analysis: WorkflowAnalysis,
    format: 'markdown' | 'json' | 'openapi',
    config?: Partial<DocumentationConfig>
  ): Promise<string> {
    const defaultConfig: DocumentationConfig = {
      format,
      includeNodeDetails: true,
      includeVariables: true,
      includeExamples: true,
      includeAPISpecs: true,
      includeVersionHistory: false,
      diagramLayout: 'auto',
      colorScheme: 'category',
      showNodeIcons: true,
      showConnectionLabels: true,
      embedDiagrams: true,
      ...config,
    };

    return this.renderDocumentation(analysis, defaultConfig);
  }

  /**
   * Generate documentation from workflow data
   */
  async generateFromWorkflowData(
    workflowData: WorkflowData,
    config: DocumentationConfig
  ): Promise<GeneratedDocumentation> {
    return this.generate(
      workflowData.id,
      workflowData.nodes,
      workflowData.edges,
      config,
      workflowData.metadata
    );
  }

  /**
   * Register progress callback
   */
  onProgress(taskId: string, callback: (progress: DocumentationProgress) => void): void {
    this.progressCallbacks.set(taskId, callback);
  }

  /**
   * Update progress
   */
  private updateProgress(taskId: string, progress: DocumentationProgress): void {
    const callback = this.progressCallbacks.get(taskId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): DocumentationConfig {
    return {
      format: 'markdown',
      includeNodeDetails: true,
      includeVariables: true,
      includeExamples: true,
      includeAPISpecs: true,
      includeVersionHistory: false,
      diagramLayout: 'auto',
      colorScheme: 'category',
      showNodeIcons: true,
      showConnectionLabels: true,
      embedDiagrams: true,
    };
  }

  /**
   * Estimate generation time
   */
  estimateGenerationTime(nodeCount: number, format: string): number {
    // Base time: 100ms
    let estimatedTime = 100;

    // Add time per node: ~10ms per node
    estimatedTime += nodeCount * 10;

    // Add time based on format
    const formatMultiplier: Record<string, number> = {
      json: 1,
      markdown: 1.5,
      html: 2,
      pdf: 3,
      openapi: 1.2,
    };

    estimatedTime *= formatMultiplier[format] || 1;

    return estimatedTime;
  }
}

export default DocumentationGenerator;
