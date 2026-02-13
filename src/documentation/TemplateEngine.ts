/**
 * Template Engine
 * Customizable documentation templates with variable substitution
 */

import type {
  DocumentTemplate,
  TemplateSection,
  WorkflowAnalysis,
} from '../types/workflowDocumentation';

export interface TemplateContext {
  workflow: WorkflowAnalysis;
  generatedAt: Date;
  generatedBy?: string;
  customData?: Record<string, any>;
}

export class TemplateEngine {
  private builtinTemplates: Map<string, DocumentTemplate> = new Map();

  constructor() {
    this.registerBuiltinTemplates();
  }

  /**
   * Register built-in templates
   */
  private registerBuiltinTemplates(): void {
    // Standard template
    this.builtinTemplates.set('standard', {
      name: 'Standard Documentation',
      description: 'Comprehensive workflow documentation',
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          type: 'overview',
          order: 1,
          enabled: true,
        },
        {
          id: 'diagram',
          title: 'Workflow Diagram',
          type: 'diagram',
          order: 2,
          enabled: true,
        },
        {
          id: 'nodes',
          title: 'Node Documentation',
          type: 'nodes',
          order: 3,
          enabled: true,
        },
        {
          id: 'variables',
          title: 'Variables',
          type: 'variables',
          order: 4,
          enabled: true,
        },
        {
          id: 'api',
          title: 'API Documentation',
          type: 'api',
          order: 5,
          enabled: true,
        },
      ],
    });

    // Minimal template
    this.builtinTemplates.set('minimal', {
      name: 'Minimal Documentation',
      description: 'Quick overview with diagram',
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          type: 'overview',
          order: 1,
          enabled: true,
        },
        {
          id: 'diagram',
          title: 'Workflow Diagram',
          type: 'diagram',
          order: 2,
          enabled: true,
        },
      ],
    });

    // Detailed template
    this.builtinTemplates.set('detailed', {
      name: 'Detailed Documentation',
      description: 'Complete documentation with all details',
      sections: [
        {
          id: 'overview',
          title: 'Overview',
          type: 'overview',
          order: 1,
          enabled: true,
        },
        {
          id: 'diagram',
          title: 'Workflow Diagram',
          type: 'diagram',
          order: 2,
          enabled: true,
        },
        {
          id: 'statistics',
          title: 'Statistics',
          type: 'custom',
          template: this.getStatisticsTemplate(),
          order: 3,
          enabled: true,
        },
        {
          id: 'nodes',
          title: 'Node Documentation',
          type: 'nodes',
          order: 4,
          enabled: true,
        },
        {
          id: 'variables',
          title: 'Variables',
          type: 'variables',
          order: 5,
          enabled: true,
        },
        {
          id: 'dependencies',
          title: 'Dependencies',
          type: 'custom',
          template: this.getDependenciesTemplate(),
          order: 6,
          enabled: true,
        },
        {
          id: 'api',
          title: 'API Documentation',
          type: 'api',
          order: 7,
          enabled: true,
        },
      ],
    });
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): DocumentTemplate | undefined {
    return this.builtinTemplates.get(name);
  }

  /**
   * Register custom template
   */
  registerTemplate(name: string, template: DocumentTemplate): void {
    this.builtinTemplates.set(name, template);
  }

  /**
   * Render template with context
   */
  render(template: DocumentTemplate, context: TemplateContext): string {
    const enabledSections = template.sections
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order);

    const parts: string[] = [];

    enabledSections.forEach((section) => {
      const content = this.renderSection(section, context);
      if (content) {
        parts.push(content);
      }
    });

    return parts.join('\n\n');
  }

  /**
   * Render individual section
   */
  private renderSection(section: TemplateSection, context: TemplateContext): string {
    switch (section.type) {
      case 'overview':
        return this.renderOverview(context);
      case 'diagram':
        return this.renderDiagramSection(context);
      case 'nodes':
        return this.renderNodes(context);
      case 'variables':
        return this.renderVariables(context);
      case 'api':
        return this.renderAPI(context);
      case 'custom':
        return this.renderCustomSection(section, context);
      default:
        return '';
    }
  }

  /**
   * Render overview section
   */
  private renderOverview(context: TemplateContext): string {
    const { workflow } = context;
    const { metadata, statistics } = workflow;

    return `# ${metadata.name}

**Version:** ${metadata.version}
${metadata.author ? `**Author:** ${metadata.author}\n` : ''}${metadata.organization ? `**Organization:** ${metadata.organization}\n` : ''}**Last Updated:** ${metadata.updatedAt.toLocaleString()}
${metadata.status ? `**Status:** ${metadata.status}\n` : ''}
${metadata.description ? `\n${metadata.description}\n` : ''}
## Quick Stats

- **Total Nodes:** ${statistics.totalNodes}
- **Total Connections:** ${statistics.totalConnections}
- **Maximum Depth:** ${statistics.maxDepth}
${metadata.executionCount ? `- **Executions:** ${metadata.executionCount}\n` : ''}${metadata.tags.length > 0 ? `\n**Tags:** ${metadata.tags.join(', ')}\n` : ''}`;
  }

  /**
   * Render diagram section placeholder
   */
  private renderDiagramSection(context: TemplateContext): string {
    return `## Workflow Diagram

[Diagram will be inserted here based on selected format]`;
  }

  /**
   * Render nodes documentation
   */
  private renderNodes(context: TemplateContext): string {
    const { workflow } = context;
    const parts: string[] = ['## Nodes'];

    workflow.nodes.forEach((node, index) => {
      parts.push(`### ${index + 1}. ${node.name}`);
      parts.push('');
      parts.push(`- **Type:** ${node.type}`);
      parts.push(`- **Category:** ${node.category}`);
      if (node.description) {
        parts.push(`- **Description:** ${node.description}`);
      }
      parts.push(`- **Inputs:** ${node.inputs.length}`);
      parts.push(`- **Outputs:** ${node.outputs.length}`);

      // Configuration
      if (Object.keys(node.config).length > 0) {
        parts.push('');
        parts.push('**Configuration:**');
        parts.push('```json');
        parts.push(JSON.stringify(node.config, null, 2));
        parts.push('```');
      }

      // Examples
      if (node.exampleInput || node.exampleOutput) {
        parts.push('');
        parts.push('**Examples:**');
        if (node.exampleInput) {
          parts.push('');
          parts.push('Input:');
          parts.push('```json');
          parts.push(JSON.stringify(node.exampleInput, null, 2));
          parts.push('```');
        }
        if (node.exampleOutput) {
          parts.push('');
          parts.push('Output:');
          parts.push('```json');
          parts.push(JSON.stringify(node.exampleOutput, null, 2));
          parts.push('```');
        }
      }

      // Notes
      if (node.notes) {
        parts.push('');
        parts.push(`**Notes:** ${node.notes}`);
      }

      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Render variables section
   */
  private renderVariables(context: TemplateContext): string {
    const { workflow } = context;

    if (workflow.variables.length === 0) {
      return '## Variables\n\nNo variables used in this workflow.';
    }

    const parts: string[] = ['## Variables'];
    parts.push('');
    parts.push('| Variable | Type | Scope | Used In |');
    parts.push('|----------|------|-------|---------|');

    workflow.variables.forEach((variable) => {
      const usedInNodes = variable.usedIn.map((nodeId) => {
        const node = workflow.nodes.find((n) => n.id === nodeId);
        return node ? node.name : nodeId;
      });

      parts.push(
        `| \`${variable.name}\` | ${variable.type} | ${variable.scope} | ${usedInNodes.join(', ')} |`
      );
    });

    return parts.join('\n');
  }

  /**
   * Render API section
   */
  private renderAPI(context: TemplateContext): string {
    const { workflow } = context;

    // Find webhook nodes
    const webhookNodes = workflow.nodes.filter((n) => n.type.toLowerCase().includes('webhook'));

    if (webhookNodes.length === 0) {
      return '';
    }

    const parts: string[] = ['## API Documentation'];
    parts.push('');
    parts.push('This workflow exposes the following webhook endpoints:');
    parts.push('');

    webhookNodes.forEach((node) => {
      const method = node.config.method || 'POST';
      const path = node.config.path || `/${node.id}`;

      parts.push(`### ${node.name}`);
      parts.push('');
      parts.push(`**Endpoint:** \`${method} ${path}\``);
      if (node.description) {
        parts.push(`**Description:** ${node.description}`);
      }
      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Render custom section with template
   */
  private renderCustomSection(section: TemplateSection, context: TemplateContext): string {
    if (!section.template) return '';

    // Simple template variable substitution
    let content = section.template;

    // Replace variables
    content = content.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getValueByPath(context, path.trim());
      return value !== undefined ? String(value) : match;
    });

    return `## ${section.title}\n\n${content}`;
  }

  /**
   * Get value by path from context
   */
  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Get statistics template
   */
  private getStatisticsTemplate(): string {
    return `### Node Distribution

{{#each workflow.statistics.nodesByCategory}}
- **{{@key}}:** {{this}}
{{/each}}

### Workflow Structure

- **Entry Points:** {{workflow.structure.entryPoints.length}}
- **Exit Points:** {{workflow.structure.exitPoints.length}}
- **Branches:** {{workflow.structure.branches.length}}
- **Loops:** {{workflow.structure.loops.length}}`;
  }

  /**
   * Get dependencies template
   */
  private getDependenciesTemplate(): string {
    return `### External Dependencies

{{#if workflow.dependencies.credentials.length}}
**Credentials:**
{{#each workflow.dependencies.credentials}}
- {{this}}
{{/each}}
{{/if}}

{{#if workflow.dependencies.integrations.length}}
**Integrations:**
{{#each workflow.dependencies.integrations}}
- {{this}}
{{/each}}
{{/if}}

{{#if workflow.dependencies.subWorkflows.length}}
**Sub-Workflows:**
{{#each workflow.dependencies.subWorkflows}}
- {{this}}
{{/each}}
{{/if}}`;
  }

  /**
   * List available templates
   */
  listTemplates(): { name: string; description: string }[] {
    return Array.from(this.builtinTemplates.values()).map((t) => ({
      name: t.name,
      description: t.description || '',
    }));
  }
}

export default TemplateEngine;
