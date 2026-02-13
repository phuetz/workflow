import { AgentTool } from '../../types/agents';

/**
 * Workflow Tool - Wraps workflows as executable tools for agents
 * Allows agents to execute entire workflows as single tool calls
 */
export class WorkflowTool {
  /**
   * Create a tool from a workflow definition
   */
  static createFromWorkflow(workflow: WorkflowDefinition): AgentTool {
    return {
      id: `workflow_${workflow.id}`,
      name: workflow.name,
      description: workflow.description || `Execute workflow: ${workflow.name}`,
      type: 'workflow',
      category: 'custom',
      parameters: this.extractParameters(workflow),
      returns: {
        type: 'object',
        description: 'Workflow execution result',
        schema: {
          success: 'boolean',
          output: 'any',
          executionId: 'string',
        },
      },
      examples: [],
      metadata: {
        workflowId: workflow.id,
        nodeCount: workflow.nodes?.length || 0,
      },
    };
  }

  /**
   * Extract parameters from workflow
   */
  private static extractParameters(workflow: WorkflowDefinition): AgentTool['parameters'] {
    const parameters: AgentTool['parameters'] = [];

    // Extract trigger parameters if available
    if (workflow.trigger) {
      parameters.push({
        name: 'triggerData',
        type: 'object',
        description: 'Data to trigger the workflow with',
        required: true,
      });
    }

    // Extract input variables
    if (workflow.variables) {
      Object.entries(workflow.variables).forEach(([name, config]) => {
        parameters.push({
          name,
          type: typeof config.default,
          description: config.description || `Workflow variable: ${name}`,
          required: config.required ?? false,
          default: config.default,
        });
      });
    }

    return parameters;
  }

  /**
   * Validate workflow tool parameters
   */
  static validateParameters(
    tool: AgentTool,
    parameters: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    tool.parameters.forEach(param => {
      const value = parameters[param.name];

      if (param.required && value === undefined) {
        errors.push(`Required parameter '${param.name}' is missing`);
      }

      if (value !== undefined && typeof value !== param.type) {
        errors.push(`Parameter '${param.name}' must be of type ${param.type}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Types
interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes?: unknown[];
  trigger?: unknown;
  variables?: Record<string, VariableConfig>;
}

interface VariableConfig {
  description?: string;
  default?: unknown;
  required?: boolean;
}
