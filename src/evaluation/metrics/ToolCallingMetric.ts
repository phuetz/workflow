/**
 * Tool Calling Metric
 * Validate that AI agents call the correct tools with correct parameters
 */

import type {
  MetricResult,
  ToolCallingMetricConfig,
  EvaluationInput,
  EvaluationContext,
  RegisteredMetric,
  MetricConfig,
} from '../../types/evaluation';

/**
 * Tool call structure
 */
interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Extract tool calls from output
 */
function extractToolCalls(output: unknown): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // Handle different output formats
  if (typeof output === 'object' && output !== null) {
    // Check if output has toolCalls array
    if ('toolCalls' in output && Array.isArray((output as { toolCalls: unknown }).toolCalls)) {
      return (output as { toolCalls: ToolCall[] }).toolCalls;
    }

    // Check if output has tools array
    if ('tools' in output && Array.isArray((output as { tools: unknown }).tools)) {
      return (output as { tools: ToolCall[] }).tools;
    }

    // Check if output has function_calls
    if ('function_calls' in output && Array.isArray((output as { function_calls: unknown }).function_calls)) {
      const calls = (output as { function_calls: Array<{ name: string; arguments: Record<string, unknown> }> }).function_calls;
      return calls.map((call) => ({
        name: call.name,
        parameters: call.arguments,
      }));
    }

    // Try to extract from text (common LLM format)
    if ('text' in output || 'content' in output) {
      const text = String((output as { text?: string; content?: string }).text || (output as { content?: string }).content || '');
      const toolPattern = /<tool_call>[\s\S]*?<\/tool_call>/g;
      const matches = text.match(toolPattern);

      if (matches) {
        for (const match of matches) {
          try {
            const nameMatch = match.match(/<name>(.*?)<\/name>/);
            const paramsMatch = match.match(/<parameters>([\s\S]*?)<\/parameters>/);

            if (nameMatch && paramsMatch) {
              toolCalls.push({
                name: nameMatch[1],
                parameters: JSON.parse(paramsMatch[1]),
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  return toolCalls;
}

/**
 * Validate parameter against schema
 */
function validateParameters(
  parameters: Record<string, unknown>,
  schema?: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  if (!schema) return { valid: true, errors: [] };

  const errors: string[] = [];

  // Basic schema validation
  for (const [key, schemaValue] of Object.entries(schema)) {
    if (typeof schemaValue === 'object' && schemaValue !== null) {
      const fieldSchema = schemaValue as { required?: boolean; type?: string };

      // Check required fields
      if (fieldSchema.required && !(key in parameters)) {
        errors.push(`Missing required parameter: ${key}`);
      }

      // Check type
      if (key in parameters && fieldSchema.type) {
        const actualType = typeof parameters[key];
        if (actualType !== fieldSchema.type) {
          errors.push(`Parameter ${key} has wrong type: expected ${fieldSchema.type}, got ${actualType}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Execute tool calling metric
 */
export async function executeToolCallingMetric(
  input: EvaluationInput,
  output: unknown,
  config: ToolCallingMetricConfig,
  context?: EvaluationContext
): Promise<MetricResult> {
  const startTime = Date.now();

  try {
    // Extract tool calls from output
    const toolCalls = extractToolCalls(output);

    // No expected tools and no tool calls = pass
    if (!config.config.expectedTools && toolCalls.length === 0) {
      return {
        metricId: config.id,
        metricType: 'toolCalling',
        metricName: config.name,
        score: 1.0,
        passed: true,
        feedback: 'No tool calling validation configured',
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }

    const expectedTools = config.config.expectedTools || [];
    const requireAllTools = config.config.requireAllTools ?? false;
    const validateParams = config.config.validateParameters ?? true;
    const parameterSchema = config.config.parameterSchema;

    let score = 0;
    const issues: string[] = [];
    const validToolCalls: string[] = [];
    const invalidToolCalls: string[] = [];

    // Check if expected tools were called
    if (expectedTools.length > 0) {
      const calledTools = toolCalls.map((tc) => tc.name);

      if (requireAllTools) {
        // All expected tools must be called
        const missingTools = expectedTools.filter((tool) => !calledTools.includes(tool));

        if (missingTools.length === 0) {
          score += 0.5; // 50% for calling all required tools
        } else {
          issues.push(`Missing required tools: ${missingTools.join(', ')}`);
        }
      } else {
        // At least one expected tool should be called
        const calledExpectedTools = expectedTools.filter((tool) => calledTools.includes(tool));

        if (calledExpectedTools.length > 0) {
          score += 0.5; // 50% for calling at least one expected tool
        } else {
          issues.push('None of the expected tools were called');
        }
      }
    }

    // Validate parameters if required
    if (validateParams && toolCalls.length > 0) {
      let validParams = 0;

      for (const toolCall of toolCalls) {
        if (parameterSchema && parameterSchema[toolCall.name]) {
          const schema = parameterSchema[toolCall.name];
          const validation = validateParameters(
            toolCall.parameters,
            typeof schema === 'object' && schema !== null ? schema as Record<string, unknown> : undefined
          );

          if (validation.valid) {
            validParams++;
            validToolCalls.push(toolCall.name);
          } else {
            invalidToolCalls.push(toolCall.name);
            issues.push(`Invalid parameters for ${toolCall.name}: ${validation.errors.join(', ')}`);
          }
        } else {
          // No schema, assume valid
          validParams++;
          validToolCalls.push(toolCall.name);
        }
      }

      // Add parameter validation score
      const paramScore = toolCalls.length > 0 ? validParams / toolCalls.length : 0;
      score += paramScore * 0.5; // 50% for parameter validation
    } else {
      // No parameter validation, give full points for this part
      score += 0.5;
    }

    // Determine pass/fail
    const threshold = config.threshold ?? 0.8;
    const passed = score >= threshold;

    return {
      metricId: config.id,
      metricType: 'toolCalling',
      metricName: config.name,
      score,
      passed,
      threshold,
      feedback:
        issues.length > 0
          ? `Tool calling issues found: ${issues.join('; ')}`
          : `All tool calls valid (${toolCalls.length} calls)`,
      details: {
        toolCalls: toolCalls.map((tc) => ({ name: tc.name, parameters: Object.keys(tc.parameters) })),
        expectedTools,
        validToolCalls,
        invalidToolCalls,
        issues,
        totalCalls: toolCalls.length,
      },
      timestamp: new Date(),
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      metricId: config.id,
      metricType: 'toolCalling',
      metricName: config.name,
      score: 0,
      passed: false,
      feedback: `Tool calling evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date(),
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Validate tool calling metric config
 */
export function validateToolCallingConfig(config: MetricConfig): boolean {
  const toolConfig = config as ToolCallingMetricConfig;

  if (!toolConfig.config) return true; // Config is optional

  // Validate expectedTools if provided
  if (toolConfig.config.expectedTools) {
    if (!Array.isArray(toolConfig.config.expectedTools)) {
      return false;
    }
  }

  return true;
}

/**
 * Registered tool calling metric
 */
export const ToolCallingMetric: RegisteredMetric = {
  type: 'toolCalling',
  name: 'Tool Calling',
  description: 'Validate that AI agents call the correct tools with correct parameters',
  defaultConfig: {
    threshold: 0.8,
    weight: 1,
    config: {
      requireAllTools: false,
      validateParameters: true,
    },
  },
  validator: validateToolCallingConfig,
  executor: executeToolCallingMetric,
};

export default ToolCallingMetric;
