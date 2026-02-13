/**
 * Pattern Template Generator
 * Generates one-click templates from pattern definitions
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type { PatternDefinition, PatternTemplate } from '../types/patterns';

/**
 * Pattern Template Generator
 */
export class PatternTemplateGenerator {
  /**
   * Generate template from pattern
   */
  static generateTemplate(pattern: PatternDefinition): PatternTemplate {
    const nodes: Partial<WorkflowNode>[] = [];
    const edges: Partial<WorkflowEdge>[] = [];

    // Generate nodes based on pattern structure
    let nodeIndex = 0;
    const nodeMap = new Map<string, string>(); // type -> id

    for (const nodeType of pattern.structure.requiredNodeTypes) {
      const nodeId = `node-${nodeIndex++}`;
      nodeMap.set(nodeType, nodeId);

      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: 100, y: 100 + nodeIndex * 150 },
        data: {
          id: nodeId,
          type: nodeType,
          label: this.generateLabel(nodeType, pattern),
          icon: this.getIconForType(nodeType),
          color: this.getColorForType(nodeType),
          inputs: 1,
          outputs: 1,
          config: this.generateDefaultConfig(nodeType),
        } as any,
      });
    }

    // Generate edges based on pattern structure
    let edgeIndex = 0;
    for (const edgePattern of pattern.structure.requiredEdges) {
      const sourceId = nodeMap.get(edgePattern.from);
      const targetId = nodeMap.get(edgePattern.to);

      if (sourceId && targetId) {
        edges.push({
          id: `edge-${edgeIndex++}`,
          source: sourceId,
          target: targetId,
          animated: edgePattern.type === 'parallel',
        });
      }
    }

    return {
      id: `template-${pattern.id}`,
      patternId: pattern.id,
      name: `${pattern.name} Template`,
      description: `Ready-to-use template for ${pattern.name} pattern`,
      nodes,
      edges,
      placeholders: this.generatePlaceholders(pattern),
      configuration: {
        pattern: pattern.name,
        category: pattern.category,
        complexity: pattern.complexity,
      },
    };
  }

  /**
   * Generate label for node type
   */
  private static generateLabel(nodeType: string, pattern: PatternDefinition): string {
    const labels: Record<string, string> = {
      webhook: 'Webhook Trigger',
      'http-request': 'HTTP Request',
      filter: 'Filter Data',
      switch: 'Conditional Branch',
      function: 'Transform Data',
      set: 'Set Variables',
      merge: 'Merge Results',
      split: 'Split Data',
      aggregate: 'Aggregate',
      delay: 'Delay',
      schedule: 'Schedule',
      email: 'Send Email',
      slack: 'Send to Slack',
      database: 'Database Query',
      cache: 'Cache',
      retry: 'Retry',
      'circuit-breaker': 'Circuit Breaker',
      loop: 'Loop',
    };

    return labels[nodeType] || nodeType.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Get icon for node type
   */
  private static getIconForType(nodeType: string): string {
    const icons: Record<string, string> = {
      webhook: '🔔',
      'http-request': '🌐',
      filter: '🔍',
      switch: '🔀',
      function: '⚙️',
      set: '📝',
      merge: '🔗',
      split: '✂️',
      aggregate: '📊',
      delay: '⏱️',
      schedule: '⏰',
      email: '📧',
      slack: '💬',
      database: '🗄️',
      cache: '💾',
      retry: '🔄',
      'circuit-breaker': '🛡️',
      loop: '🔁',
    };

    return icons[nodeType] || '📦';
  }

  /**
   * Get color for node type
   */
  private static getColorForType(nodeType: string): string {
    const colors: Record<string, string> = {
      webhook: '#10b981',
      'http-request': '#3b82f6',
      filter: '#f59e0b',
      switch: '#8b5cf6',
      function: '#06b6d4',
      set: '#6366f1',
      merge: '#ec4899',
      split: '#f97316',
      aggregate: '#14b8a6',
      delay: '#84cc16',
      schedule: '#eab308',
      email: '#ef4444',
      slack: '#8b5cf6',
      database: '#0ea5e9',
      cache: '#a855f7',
      retry: '#10b981',
      'circuit-breaker': '#dc2626',
      loop: '#f59e0b',
    };

    return colors[nodeType] || '#6b7280';
  }

  /**
   * Generate default configuration for node type
   */
  private static generateDefaultConfig(nodeType: string): Record<string, unknown> {
    const configs: Record<string, Record<string, unknown>> = {
      'http-request': {
        method: 'GET',
        url: '{{url}}',
        timeout: 30000,
        retry: true,
        maxRetries: 3,
      },
      filter: {
        condition: '{{condition}}',
      },
      switch: {
        cases: [
          { condition: '{{case1}}', output: 'output1' },
          { condition: '{{case2}}', output: 'output2' },
        ],
      },
      function: {
        code: '// Transform data here\nreturn data;',
      },
      delay: {
        duration: 1000,
      },
      schedule: {
        cron: '0 0 * * *',
      },
      email: {
        to: '{{recipient}}',
        subject: '{{subject}}',
        body: '{{body}}',
      },
      loop: {
        maxIterations: 10,
        condition: '{{exitCondition}}',
      },
    };

    return configs[nodeType] || {};
  }

  /**
   * Generate placeholders
   */
  private static generatePlaceholders(
    pattern: PatternDefinition
  ): Array<{
    id: string;
    type: 'node' | 'config' | 'credential';
    description: string;
    required: boolean;
    defaultValue?: unknown;
  }> {
    const placeholders: Array<{
      id: string;
      type: 'node' | 'config' | 'credential';
      description: string;
      required: boolean;
      defaultValue?: unknown;
    }> = [];

    // Add placeholders based on pattern requirements
    if (pattern.structure.requiredNodeTypes.includes('http-request')) {
      placeholders.push({
        id: 'url',
        type: 'config',
        description: 'API endpoint URL',
        required: true,
      });
    }

    if (pattern.structure.requiredNodeTypes.includes('database')) {
      placeholders.push({
        id: 'database-credentials',
        type: 'credential',
        description: 'Database connection credentials',
        required: true,
      });
    }

    if (pattern.structure.requiredNodeTypes.includes('email')) {
      placeholders.push({
        id: 'email-config',
        type: 'config',
        description: 'Email configuration',
        required: true,
      });
    }

    return placeholders;
  }

  /**
   * Apply template to workflow
   */
  static applyTemplate(
    template: PatternTemplate,
    startPosition?: { x: number; y: number }
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const offset = startPosition || { x: 0, y: 0 };

    const nodes = template.nodes.map((node, index) => ({
      ...node,
      id: node.id || `node-${Date.now()}-${index}`,
      position: {
        x: (node.position?.x || 0) + offset.x,
        y: (node.position?.y || 0) + offset.y,
      },
    })) as WorkflowNode[];

    const edges = template.edges.map((edge, index) => ({
      ...edge,
      id: edge.id || `edge-${Date.now()}-${index}`,
    })) as WorkflowEdge[];

    return { nodes, edges };
  }

  /**
   * Get all available templates
   */
  static getAllTemplates(patterns: PatternDefinition[]): PatternTemplate[] {
    return patterns.map((pattern) => this.generateTemplate(pattern));
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(
    patterns: PatternDefinition[],
    category: string
  ): PatternTemplate[] {
    return patterns
      .filter((p) => p.category === category)
      .map((pattern) => this.generateTemplate(pattern));
  }
}

/**
 * Quick template generation
 */
export function generateTemplate(pattern: PatternDefinition): PatternTemplate {
  return PatternTemplateGenerator.generateTemplate(pattern);
}

/**
 * Quick template application
 */
export function applyTemplate(
  template: PatternTemplate,
  position?: { x: number; y: number }
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  return PatternTemplateGenerator.applyTemplate(template, position);
}
