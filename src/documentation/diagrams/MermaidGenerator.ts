/**
 * Mermaid Diagram Generator
 * Generate Mermaid.js flowchart syntax from workflows
 */

import type { WorkflowAnalysis, MermaidOptions } from '../../types/workflowDocumentation';

export class MermaidGenerator {
  private defaultOptions: MermaidOptions = {
    theme: 'default',
    direction: 'TB',
    nodeShape: {},
  };

  /**
   * Generate Mermaid flowchart
   */
  generate(analysis: WorkflowAnalysis, options?: Partial<MermaidOptions>): string {
    const opts = { ...this.defaultOptions, ...options };

    const parts: string[] = [];

    // Header
    parts.push(`graph ${opts.direction}`);
    parts.push('');

    // Nodes
    analysis.nodes.forEach((node) => {
      const shape = this.getNodeShape(node.type, opts);
      const label = this.sanitizeLabel(node.name);
      const nodeId = this.sanitizeId(node.id);

      parts.push(`  ${nodeId}${shape.open}${label}${shape.close}`);
    });

    parts.push('');

    // Connections
    analysis.connections.forEach((conn) => {
      const sourceId = this.sanitizeId(conn.sourceNode);
      const targetId = this.sanitizeId(conn.targetNode);
      const arrow = this.getArrowStyle(conn.type);
      const label = conn.label ? `|${this.sanitizeLabel(conn.label)}|` : '';

      parts.push(`  ${sourceId} ${arrow.line}${label}${arrow.tip} ${targetId}`);
    });

    parts.push('');

    // Styling
    const styles = this.generateStyles(analysis, opts);
    parts.push(...styles);

    // Theme config
    if (opts.theme !== 'default') {
      parts.push('');
      parts.push(`%%{init: {'theme':'${opts.theme}'}}%%`);
    }

    return parts.join('\n');
  }

  /**
   * Generate styled Mermaid diagram with categories
   */
  generateStyled(analysis: WorkflowAnalysis, options?: Partial<MermaidOptions>): string {
    const opts = { ...this.defaultOptions, ...options };

    const parts: string[] = [];

    // Header with theme
    parts.push(`%%{init: {'theme':'${opts.theme}'}}%%`);
    parts.push(`graph ${opts.direction}`);
    parts.push('');

    // Define classes for categories
    const categories = this.getCategories(analysis);
    parts.push('  %% Category Classes');
    categories.forEach((category, index) => {
      parts.push(`  classDef ${this.sanitizeId(category)} fill:${this.getCategoryColor(category, index)},stroke:#333,stroke-width:2px`);
    });
    parts.push('');

    // Nodes with classes
    parts.push('  %% Nodes');
    analysis.nodes.forEach((node) => {
      const shape = this.getNodeShape(node.type, opts);
      const label = this.sanitizeLabel(node.name);
      const nodeId = this.sanitizeId(node.id);

      parts.push(`  ${nodeId}${shape.open}${label}${shape.close}`);
    });

    parts.push('');

    // Connections
    parts.push('  %% Connections');
    analysis.connections.forEach((conn) => {
      const sourceId = this.sanitizeId(conn.sourceNode);
      const targetId = this.sanitizeId(conn.targetNode);
      const arrow = this.getArrowStyle(conn.type);
      const label = conn.label ? `|${this.sanitizeLabel(conn.label)}|` : '';

      parts.push(`  ${sourceId} ${arrow.line}${label}${arrow.tip} ${targetId}`);
    });

    parts.push('');

    // Apply classes to nodes
    parts.push('  %% Apply Styles');
    analysis.nodes.forEach((node) => {
      const nodeId = this.sanitizeId(node.id);
      const className = this.sanitizeId(node.category);
      parts.push(`  class ${nodeId} ${className}`);
    });

    return parts.join('\n');
  }

  /**
   * Generate subgraph for grouped nodes
   */
  generateWithSubgraphs(analysis: WorkflowAnalysis, options?: Partial<MermaidOptions>): string {
    const opts = { ...this.defaultOptions, ...options };

    const parts: string[] = [];

    // Header
    parts.push(`graph ${opts.direction}`);
    parts.push('');

    // Group nodes by category
    const nodesByCategory = this.groupNodesByCategory(analysis);

    Object.entries(nodesByCategory).forEach(([category, nodes]) => {
      parts.push(`  subgraph ${this.sanitizeId(category)}["${category}"]`);
      parts.push('    direction LR');

      nodes.forEach((node) => {
        const shape = this.getNodeShape(node.type, opts);
        const label = this.sanitizeLabel(node.name);
        const nodeId = this.sanitizeId(node.id);

        parts.push(`    ${nodeId}${shape.open}${label}${shape.close}`);
      });

      parts.push('  end');
      parts.push('');
    });

    // Connections
    analysis.connections.forEach((conn) => {
      const sourceId = this.sanitizeId(conn.sourceNode);
      const targetId = this.sanitizeId(conn.targetNode);
      const arrow = this.getArrowStyle(conn.type);
      const label = conn.label ? `|${this.sanitizeLabel(conn.label)}|` : '';

      parts.push(`  ${sourceId} ${arrow.line}${label}${arrow.tip} ${targetId}`);
    });

    return parts.join('\n');
  }

  /**
   * Get node shape based on type
   */
  private getNodeShape(
    type: string,
    options: MermaidOptions
  ): { open: string; close: string } {
    // Check custom shape
    if (options.nodeShape[type]) {
      return this.getShapeBrackets(options.nodeShape[type]);
    }

    // Default shapes based on node type
    const typeLower = type.toLowerCase();

    if (typeLower.includes('trigger') || typeLower.includes('webhook')) {
      return { open: '([', close: '])' }; // Stadium
    }
    if (typeLower.includes('condition') || typeLower.includes('if')) {
      return { open: '{', close: '}' }; // Diamond
    }
    if (typeLower.includes('database') || typeLower.includes('storage')) {
      return { open: '[(', close: ')]' }; // Cylindrical
    }
    if (typeLower.includes('function') || typeLower.includes('code')) {
      return { open: '[[', close: ']]' }; // Subroutine
    }

    return { open: '[', close: ']' }; // Rectangle (default)
  }

  /**
   * Get shape brackets
   */
  private getShapeBrackets(shape: string): { open: string; close: string } {
    const shapes: Record<string, { open: string; close: string }> = {
      rect: { open: '[', close: ']' },
      round: { open: '(', close: ')' },
      stadium: { open: '([', close: '])' },
      subroutine: { open: '[[', close: ']]' },
      cylindrical: { open: '[(', close: ')]' },
      circle: { open: '((', close: '))' },
      diamond: { open: '{', close: '}' },
    };

    return shapes[shape] || shapes.rect;
  }

  /**
   * Get arrow style based on connection type
   */
  private getArrowStyle(type?: string): { line: string; tip: string } {
    switch (type) {
      case 'error':
        return { line: '-.-', tip: '.->' }; // Dotted line
      case 'conditional':
        return { line: '==', tip: '==>' }; // Thick line
      default:
        return { line: '--', tip: '-->' }; // Normal line
    }
  }

  /**
   * Generate style definitions
   */
  private generateStyles(analysis: WorkflowAnalysis, options: MermaidOptions): string[] {
    const styles: string[] = [];

    if (options.styleOverrides) {
      Object.entries(options.styleOverrides).forEach(([nodeId, style]) => {
        styles.push(`  style ${this.sanitizeId(nodeId)} ${style}`);
      });
    }

    return styles;
  }

  /**
   * Get unique categories
   */
  private getCategories(analysis: WorkflowAnalysis): string[] {
    const categories = new Set(analysis.nodes.map((n) => n.category));
    return Array.from(categories);
  }

  /**
   * Get color for category
   */
  private getCategoryColor(category: string, index: number): string {
    const colors = [
      '#e1f5ff',
      '#fff3e0',
      '#f3e5f5',
      '#e8f5e9',
      '#fff9c4',
      '#ffe0b2',
      '#f1f8e9',
      '#e0f2f1',
    ];

    return colors[index % colors.length];
  }

  /**
   * Group nodes by category
   */
  private groupNodesByCategory(analysis: WorkflowAnalysis): Record<string, typeof analysis.nodes> {
    const grouped: Record<string, typeof analysis.nodes> = {};

    analysis.nodes.forEach((node) => {
      if (!grouped[node.category]) {
        grouped[node.category] = [];
      }
      grouped[node.category].push(node);
    });

    return grouped;
  }

  /**
   * Sanitize node ID for Mermaid
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Sanitize label for Mermaid
   */
  private sanitizeLabel(label: string): string {
    return label.replace(/"/g, '\\"').replace(/\n/g, '<br/>');
  }

  /**
   * Generate minimal diagram (entry to exit)
   */
  generateMinimal(analysis: WorkflowAnalysis): string {
    const parts: string[] = [];
    parts.push('graph LR');
    parts.push('');

    // Only show entry and exit points with direct path
    const entryPoints = analysis.structure.entryPoints;
    const exitPoints = analysis.structure.exitPoints;

    entryPoints.forEach((entryId) => {
      const entryNode = analysis.nodes.find((n) => n.id === entryId);
      if (entryNode) {
        const nodeId = this.sanitizeId(entryId);
        parts.push(`  ${nodeId}([${this.sanitizeLabel(entryNode.name)}])`);
      }
    });

    parts.push('  Process[...]');

    exitPoints.forEach((exitId) => {
      const exitNode = analysis.nodes.find((n) => n.id === exitId);
      if (exitNode) {
        const nodeId = this.sanitizeId(exitId);
        parts.push(`  ${nodeId}[${this.sanitizeLabel(exitNode.name)}]`);
      }
    });

    parts.push('');

    // Connect entry -> process -> exit
    entryPoints.forEach((entryId) => {
      parts.push(`  ${this.sanitizeId(entryId)} --> Process`);
    });

    exitPoints.forEach((exitId) => {
      parts.push(`  Process --> ${this.sanitizeId(exitId)}`);
    });

    return parts.join('\n');
  }

  /**
   * Validate Mermaid syntax
   */
  validate(mermaidCode: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!mermaidCode.trim().startsWith('graph')) {
      errors.push('Diagram must start with "graph" directive');
    }

    // Check for unclosed brackets
    const openBrackets = (mermaidCode.match(/\[/g) || []).length;
    const closeBrackets = (mermaidCode.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push('Mismatched square brackets');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default MermaidGenerator;
