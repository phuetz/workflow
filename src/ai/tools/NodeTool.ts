import { AgentTool } from '../../types/agents';
import { nodeTypes } from '../../data/nodeTypes';

/**
 * Node Tool - Wraps individual workflow nodes as tools for agents
 * Allows agents to execute specific node types independently
 */
export class NodeTool {
  /**
   * Create a tool from a node type
   */
  static createFromNodeType(nodeType: string): AgentTool | null {
    const nodeDefinition = nodeTypes[nodeType];
    if (!nodeDefinition) {
      return null;
    }

    return {
      id: `node_${nodeType}`,
      name: nodeDefinition.label || nodeType,
      description: nodeDefinition.description || `Execute ${nodeType} node`,
      type: 'node',
      category: this.mapCategory(nodeDefinition.category),
      parameters: this.extractParameters(nodeDefinition),
      returns: {
        type: 'object',
        description: 'Node execution result',
        schema: this.extractReturnSchema(nodeDefinition),
      },
      examples: [],
      metadata: {
        nodeType,
        category: nodeDefinition.category,
      },
    };
  }

  /**
   * Create tools for all available node types
   */
  static createAllNodeTools(): AgentTool[] {
    const tools: AgentTool[] = [];

    Object.keys(nodeTypes).forEach(nodeType => {
      const tool = this.createFromNodeType(nodeType);
      if (tool) {
        tools.push(tool);
      }
    });

    return tools;
  }

  /**
   * Extract parameters from node definition
   */
  private static extractParameters(nodeDefinition: unknown): AgentTool['parameters'] {
    const parameters: AgentTool['parameters'] = [];

    // Add common input parameter
    parameters.push({
      name: 'input',
      type: 'any',
      description: 'Input data for the node',
      required: false,
    });

    // Extract node-specific config if available
    if (nodeDefinition && typeof nodeDefinition === 'object' && 'config' in nodeDefinition) {
      const config = nodeDefinition.config as Record<string, unknown>;
      Object.entries(config).forEach(([key, value]) => {
        parameters.push({
          name: key,
          type: typeof value,
          description: `Node configuration: ${key}`,
          required: false,
          default: value,
        });
      });
    }

    return parameters;
  }

  /**
   * Extract return schema from node definition
   */
  private static extractReturnSchema(nodeDefinition: unknown): Record<string, unknown> {
    const schema: Record<string, unknown> = {
      success: 'boolean',
      output: 'any',
      metadata: 'object',
    };

    // Add node-specific output if available
    if (nodeDefinition && typeof nodeDefinition === 'object' && 'outputs' in nodeDefinition) {
      const outputs = nodeDefinition.outputs as unknown[];
      outputs.forEach((output: unknown) => {
        if (output && typeof output === 'object' && 'name' in output) {
          schema[(output as { name: string }).name] = 'any';
        }
      });
    }

    return schema;
  }

  /**
   * Map node category to tool category
   */
  private static mapCategory(nodeCategory: string): AgentTool['category'] {
    const categoryMap: Record<string, AgentTool['category']> = {
      trigger: 'api-integration',
      action: 'api-integration',
      transform: 'data-processing',
      flow: 'utilities',
      database: 'database',
      ai: 'ai-ml',
      communication: 'communication',
      file: 'file-operations',
      code: 'code-execution',
    };

    return categoryMap[nodeCategory] || 'custom';
  }

  /**
   * Get tools by category
   */
  static getToolsByCategory(category: string): AgentTool[] {
    const allTools = this.createAllNodeTools();
    return allTools.filter(tool => tool.category === category);
  }

  /**
   * Get tool count
   */
  static getToolCount(): number {
    return Object.keys(nodeTypes).length;
  }
}
