/**
 * Markdown Exporter
 * Export workflow documentation to GitHub-flavored Markdown
 */

import type { WorkflowAnalysis, DocumentationConfig } from '../../types/workflowDocumentation';
import { MermaidGenerator } from '../diagrams/MermaidGenerator';
import { TemplateEngine, type TemplateContext } from '../TemplateEngine';

export class MarkdownExporter {
  private mermaidGenerator: MermaidGenerator;
  private templateEngine: TemplateEngine;

  constructor() {
    this.mermaidGenerator = new MermaidGenerator();
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Export to Markdown
   */
  export(analysis: WorkflowAnalysis, config: DocumentationConfig): string {
    const parts: string[] = [];

    // Title and metadata
    parts.push(this.generateHeader(analysis, config));
    parts.push('');

    // Table of contents
    parts.push(this.generateTableOfContents(config));
    parts.push('');

    // Overview section
    parts.push(this.generateOverview(analysis, config));
    parts.push('');

    // Diagram section
    if (config.embedDiagrams) {
      parts.push(this.generateDiagramSection(analysis, config));
      parts.push('');
    }

    // Statistics
    parts.push(this.generateStatistics(analysis));
    parts.push('');

    // Nodes documentation
    if (config.includeNodeDetails) {
      parts.push(this.generateNodesDocumentation(analysis, config));
      parts.push('');
    }

    // Variables
    if (config.includeVariables && analysis.variables.length > 0) {
      parts.push(this.generateVariablesSection(analysis));
      parts.push('');
    }

    // Dependencies
    parts.push(this.generateDependencies(analysis));
    parts.push('');

    // API Documentation
    if (config.includeAPISpecs) {
      const apiDocs = this.generateAPIDocumentation(analysis);
      if (apiDocs) {
        parts.push(apiDocs);
        parts.push('');
      }
    }

    // Workflow Structure
    parts.push(this.generateStructureSection(analysis));
    parts.push('');

    // Footer
    parts.push(this.generateFooter(config));

    return parts.join('\n');
  }

  /**
   * Generate header with title and metadata
   */
  private generateHeader(analysis: WorkflowAnalysis, config: DocumentationConfig): string {
    const { metadata } = analysis;
    const parts: string[] = [];

    parts.push(`# ${metadata.name}`);
    parts.push('');

    // Badges
    const badges: string[] = [];
    badges.push(`![Version](https://img.shields.io/badge/version-${encodeURIComponent(metadata.version)}-blue)`);
    badges.push(`![Status](https://img.shields.io/badge/status-${metadata.status}-green)`);
    if (metadata.tags.length > 0) {
      badges.push(`![Tags](https://img.shields.io/badge/tags-${encodeURIComponent(metadata.tags.join(','))}-orange)`);
    }
    parts.push(badges.join(' '));
    parts.push('');

    // Metadata table
    parts.push('| Property | Value |');
    parts.push('|----------|-------|');
    parts.push(`| **Version** | ${metadata.version} |`);
    if (config.author || metadata.author) {
      parts.push(`| **Author** | ${config.author || metadata.author} |`);
    }
    if (config.organization || metadata.organization) {
      parts.push(`| **Organization** | ${config.organization || metadata.organization} |`);
    }
    parts.push(`| **Last Updated** | ${metadata.updatedAt.toLocaleString()} |`);
    parts.push(`| **Status** | ${metadata.status} |`);
    if (metadata.executionCount) {
      parts.push(`| **Total Executions** | ${metadata.executionCount} |`);
    }
    parts.push('');

    // Description
    if (metadata.description) {
      parts.push('## Description');
      parts.push('');
      parts.push(metadata.description);
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Generate table of contents
   */
  private generateTableOfContents(config: DocumentationConfig): string {
    const parts: string[] = [];
    parts.push('## Table of Contents');
    parts.push('');
    parts.push('- [Overview](#overview)');
    if (config.embedDiagrams) {
      parts.push('- [Workflow Diagram](#workflow-diagram)');
    }
    parts.push('- [Statistics](#statistics)');
    if (config.includeNodeDetails) {
      parts.push('- [Node Documentation](#node-documentation)');
    }
    if (config.includeVariables) {
      parts.push('- [Variables](#variables)');
    }
    parts.push('- [Dependencies](#dependencies)');
    if (config.includeAPISpecs) {
      parts.push('- [API Documentation](#api-documentation)');
    }
    parts.push('- [Workflow Structure](#workflow-structure)');

    return parts.join('\n');
  }

  /**
   * Generate overview section
   */
  private generateOverview(analysis: WorkflowAnalysis, config: DocumentationConfig): string {
    const parts: string[] = [];
    parts.push('## Overview');
    parts.push('');

    const { metadata, statistics } = analysis;

    parts.push('### Quick Summary');
    parts.push('');
    parts.push(`This workflow contains ${statistics.totalNodes} nodes connected by ${statistics.totalConnections} connections.`);
    parts.push(`The maximum depth is ${statistics.maxDepth} levels.`);
    parts.push('');

    if (metadata.tags.length > 0) {
      parts.push('### Tags');
      parts.push('');
      parts.push(metadata.tags.map((tag) => `\`${tag}\``).join(' '));
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Generate diagram section
   */
  private generateDiagramSection(analysis: WorkflowAnalysis, config: DocumentationConfig): string {
    const parts: string[] = [];
    parts.push('## Workflow Diagram');
    parts.push('');

    const mermaidCode = this.mermaidGenerator.generateStyled(analysis, {
      theme: 'default',
      direction: config.diagramLayout === 'horizontal' ? 'LR' : 'TB',
    });

    parts.push('```mermaid');
    parts.push(mermaidCode);
    parts.push('```');
    parts.push('');

    parts.push('> **Note:** The diagram above shows the complete workflow structure with all nodes and connections.');

    return parts.join('\n');
  }

  /**
   * Generate statistics section
   */
  private generateStatistics(analysis: WorkflowAnalysis): string {
    const { statistics, structure } = analysis;
    const parts: string[] = [];

    parts.push('## Statistics');
    parts.push('');

    parts.push('### General');
    parts.push('');
    parts.push(`- **Total Nodes:** ${statistics.totalNodes}`);
    parts.push(`- **Total Connections:** ${statistics.totalConnections}`);
    parts.push(`- **Maximum Depth:** ${statistics.maxDepth}`);
    if (statistics.avgExecutionTime) {
      parts.push(`- **Average Execution Time:** ${statistics.avgExecutionTime.toFixed(2)}ms`);
    }
    parts.push('');

    parts.push('### Node Distribution by Category');
    parts.push('');
    Object.entries(statistics.nodesByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = ((count / statistics.totalNodes) * 100).toFixed(1);
        parts.push(`- **${category}:** ${count} (${percentage}%)`);
      });
    parts.push('');

    parts.push('### Structure');
    parts.push('');
    parts.push(`- **Entry Points:** ${structure.entryPoints.length}`);
    parts.push(`- **Exit Points:** ${structure.exitPoints.length}`);
    parts.push(`- **Branches:** ${structure.branches.length}`);
    parts.push(`- **Loops:** ${structure.loops.length}`);

    return parts.join('\n');
  }

  /**
   * Generate nodes documentation
   */
  private generateNodesDocumentation(analysis: WorkflowAnalysis, config: DocumentationConfig): string {
    const parts: string[] = [];
    parts.push('## Node Documentation');
    parts.push('');

    analysis.nodes.forEach((node, index) => {
      parts.push(`### ${index + 1}. ${node.name}`);
      parts.push('');

      // Node info
      parts.push('| Property | Value |');
      parts.push('|----------|-------|');
      parts.push(`| **ID** | \`${node.id}\` |`);
      parts.push(`| **Type** | ${node.type} |`);
      parts.push(`| **Category** | ${node.category} |`);
      if (node.description) {
        parts.push(`| **Description** | ${node.description} |`);
      }
      parts.push(`| **Inputs** | ${node.inputs.length} |`);
      parts.push(`| **Outputs** | ${node.outputs.length} |`);
      parts.push('');

      // Configuration
      if (Object.keys(node.config).length > 0) {
        parts.push('**Configuration:**');
        parts.push('');
        parts.push('```json');
        parts.push(JSON.stringify(node.config, null, 2));
        parts.push('```');
        parts.push('');
      }

      // Examples
      if (config.includeExamples && (node.exampleInput || node.exampleOutput)) {
        parts.push('**Examples:**');
        parts.push('');

        if (node.exampleInput) {
          parts.push('<details>');
          parts.push('<summary>Example Input</summary>');
          parts.push('');
          parts.push('```json');
          parts.push(JSON.stringify(node.exampleInput, null, 2));
          parts.push('```');
          parts.push('</details>');
          parts.push('');
        }

        if (node.exampleOutput) {
          parts.push('<details>');
          parts.push('<summary>Example Output</summary>');
          parts.push('');
          parts.push('```json');
          parts.push(JSON.stringify(node.exampleOutput, null, 2));
          parts.push('```');
          parts.push('</details>');
          parts.push('');
        }
      }

      // Connections
      if (node.inputs.length > 0 || node.outputs.length > 0) {
        parts.push('**Connections:**');
        parts.push('');

        if (node.inputs.length > 0) {
          parts.push('*Inputs:*');
          node.inputs.forEach((input) => {
            const sourceNode = analysis.nodes.find((n) => n.id === input.sourceNode);
            parts.push(`- From: ${sourceNode?.name || input.sourceNode}`);
          });
          parts.push('');
        }

        if (node.outputs.length > 0) {
          parts.push('*Outputs:*');
          node.outputs.forEach((output) => {
            const targetNode = analysis.nodes.find((n) => n.id === output.targetNode);
            parts.push(`- To: ${targetNode?.name || output.targetNode}${output.label ? ` (${output.label})` : ''}`);
          });
          parts.push('');
        }
      }

      // Notes
      if (node.notes) {
        parts.push(`> **Note:** ${node.notes}`);
        parts.push('');
      }

      parts.push('---');
      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Generate variables section
   */
  private generateVariablesSection(analysis: WorkflowAnalysis): string {
    const parts: string[] = [];
    parts.push('## Variables');
    parts.push('');

    if (analysis.variables.length === 0) {
      parts.push('*No variables defined in this workflow.*');
      return parts.join('\n');
    }

    parts.push('| Variable | Type | Scope | Description | Used In |');
    parts.push('|----------|------|-------|-------------|---------|');

    analysis.variables.forEach((variable) => {
      const usedInNames = variable.usedIn.map((nodeId) => {
        const node = analysis.nodes.find((n) => n.id === nodeId);
        return node ? node.name : nodeId;
      });

      parts.push(
        `| \`${variable.name}\` | ${variable.type} | ${variable.scope} | ${variable.description || '-'} | ${usedInNames.join(', ')} |`
      );
    });

    return parts.join('\n');
  }

  /**
   * Generate dependencies section
   */
  private generateDependencies(analysis: WorkflowAnalysis): string {
    const { dependencies } = analysis;
    const parts: string[] = [];

    parts.push('## Dependencies');
    parts.push('');

    const hasDeps =
      dependencies.credentials.length > 0 ||
      dependencies.integrations.length > 0 ||
      dependencies.subWorkflows.length > 0;

    if (!hasDeps) {
      parts.push('*This workflow has no external dependencies.*');
      return parts.join('\n');
    }

    if (dependencies.credentials.length > 0) {
      parts.push('### Credentials');
      parts.push('');
      dependencies.credentials.forEach((cred) => {
        parts.push(`- \`${cred}\``);
      });
      parts.push('');
    }

    if (dependencies.integrations.length > 0) {
      parts.push('### Integrations');
      parts.push('');
      dependencies.integrations.forEach((integration) => {
        parts.push(`- ${integration}`);
      });
      parts.push('');
    }

    if (dependencies.subWorkflows.length > 0) {
      parts.push('### Sub-Workflows');
      parts.push('');
      dependencies.subWorkflows.forEach((subWorkflow) => {
        parts.push(`- ${subWorkflow}`);
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Generate API documentation for webhook endpoints
   */
  private generateAPIDocumentation(analysis: WorkflowAnalysis): string | null {
    const webhookNodes = analysis.nodes.filter((n) => n.type.toLowerCase().includes('webhook'));

    if (webhookNodes.length === 0) {
      return null;
    }

    const parts: string[] = [];
    parts.push('## API Documentation');
    parts.push('');
    parts.push('This workflow exposes the following webhook endpoints:');
    parts.push('');

    webhookNodes.forEach((node) => {
      const method = node.config.method || 'POST';
      const path = node.config.path || `/${node.id}`;

      parts.push(`### ${node.name}`);
      parts.push('');
      parts.push('```http');
      parts.push(`${method} ${path}`);
      parts.push('```');
      parts.push('');

      if (node.description) {
        parts.push(node.description);
        parts.push('');
      }

      // Request example
      if (node.exampleInput) {
        parts.push('**Request Body:**');
        parts.push('');
        parts.push('```json');
        parts.push(JSON.stringify(node.exampleInput, null, 2));
        parts.push('```');
        parts.push('');
      }

      // Response example
      if (node.exampleOutput) {
        parts.push('**Response:**');
        parts.push('');
        parts.push('```json');
        parts.push(JSON.stringify(node.exampleOutput, null, 2));
        parts.push('```');
        parts.push('');
      }

      parts.push('---');
      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Generate workflow structure section
   */
  private generateStructureSection(analysis: WorkflowAnalysis): string {
    const { structure } = analysis;
    const parts: string[] = [];

    parts.push('## Workflow Structure');
    parts.push('');

    // Entry points
    parts.push('### Entry Points');
    parts.push('');
    if (structure.entryPoints.length === 0) {
      parts.push('*No entry points defined.*');
    } else {
      structure.entryPoints.forEach((entryId) => {
        const node = analysis.nodes.find((n) => n.id === entryId);
        parts.push(`- **${node?.name || entryId}** (\`${entryId}\`)`);
      });
    }
    parts.push('');

    // Exit points
    parts.push('### Exit Points');
    parts.push('');
    if (structure.exitPoints.length === 0) {
      parts.push('*No exit points defined.*');
    } else {
      structure.exitPoints.forEach((exitId) => {
        const node = analysis.nodes.find((n) => n.id === exitId);
        parts.push(`- **${node?.name || exitId}** (\`${exitId}\`)`);
      });
    }
    parts.push('');

    // Branches
    if (structure.branches.length > 0) {
      parts.push('### Conditional Branches');
      parts.push('');
      structure.branches.forEach((branch, index) => {
        const node = analysis.nodes.find((n) => n.id === branch.startNode);
        parts.push(`**Branch ${index + 1}:** ${node?.name || branch.startNode}`);
        if (branch.condition) {
          parts.push(`- Condition: \`${branch.condition}\``);
        }
        parts.push(`- Paths: ${branch.branches.length}`);
        parts.push('');
      });
    }

    // Loops
    if (structure.loops.length > 0) {
      parts.push('### Loops');
      parts.push('');
      structure.loops.forEach((loop, index) => {
        const startNode = analysis.nodes.find((n) => n.id === loop.startNode);
        const endNode = analysis.nodes.find((n) => n.id === loop.endNode);
        parts.push(`**Loop ${index + 1}:**`);
        parts.push(`- Start: ${startNode?.name || loop.startNode}`);
        parts.push(`- End: ${endNode?.name || loop.endNode}`);
        parts.push(`- Path Length: ${loop.path.length}`);
        if (loop.maxIterations) {
          parts.push(`- Max Iterations: ${loop.maxIterations}`);
        }
        parts.push('');
      });
    }

    return parts.join('\n');
  }

  /**
   * Generate footer
   */
  private generateFooter(config: DocumentationConfig): string {
    const parts: string[] = [];
    parts.push('---');
    parts.push('');
    parts.push('*This documentation was automatically generated.*');
    parts.push('');

    return parts.join('\n');
  }
}

export default MarkdownExporter;
