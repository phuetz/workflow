/**
 * AI Node Executor
 * Integrates with AI/ML services for intelligent processing
 */

import { Node } from '@xyflow/react';
import { NodeExecutor } from './index';
import { logger } from '../../../services/SimpleLogger';

// Helper functions for AI operations
function processTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getValueFromPath(context, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

function getValueFromPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// AI execution methods
async function executeOpenAI(options: {
  model: string;
  operation: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}): Promise<unknown> {
  // In production, use the actual OpenAI SDK
  logger.info('🤖 Executing OpenAI request:', {
    model: options.model,
    promptLength: options.prompt.length
  });

  // Simulate OpenAI response
  return {
    provider: 'openai',
    model: options.model,
    response: {
      text: `AI response to: ${options.prompt.substring(0, 50)}...`,
      usage: {
        prompt_tokens: Math.floor(options.prompt.length / 4),
        completion_tokens: 150,
        total_tokens: Math.floor(options.prompt.length / 4) + 150
      }
    },
    timestamp: new Date().toISOString()
  };
}

async function executeAnthropic(options: {
  model: string;
  operation: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}): Promise<unknown> {
  // In production, use the actual Anthropic SDK
  logger.info('🤖 Executing Anthropic request:', {
    model: options.model,
    promptLength: options.prompt.length
  });

  // Simulate Anthropic response
  return {
    provider: 'anthropic',
    model: options.model,
    response: {
      text: `Claude response to: ${options.prompt.substring(0, 50)}...`,
      usage: {
        input_tokens: Math.floor(options.prompt.length / 4),
        output_tokens: 150
      }
    },
    timestamp: new Date().toISOString()
  };
}

async function executeCustomAI(options: {
  endpoint: string;
  prompt: string;
  apiKey: string;
}): Promise<unknown> {
  // Custom AI endpoint integration
  logger.info('🤖 Executing custom AI request');

  return {
    provider: 'custom',
    endpoint: options.endpoint,
    response: {
      text: `Custom AI response`,
      metadata: {}
    },
    timestamp: new Date().toISOString()
  };
}

export const aiExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    // Extract config from node data
    const config = (node.data?.config || {}) as Record<string, unknown>;

    const provider = (config.provider || 'openai') as string;
    const model = config.model as string | undefined;
    const operation = (config.operation || 'completion') as string;
    const prompt = config.prompt as string | undefined;
    const temperature = (config.temperature || 0.7) as number;
    const maxTokens = (config.maxTokens || 1000) as number;
    const apiKey = config.apiKey as string | undefined;
    const endpoint = config.endpoint as string | undefined;

    if (!apiKey) {
      throw new Error('API key is required for AI operations');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    try {
      // Process prompt with context variables
      const contextRecord = (context || {}) as Record<string, unknown>;
      const processedPrompt = processTemplate(prompt, contextRecord);

      // Execute AI operation based on provider
      switch (provider) {
        case 'openai':
          return await executeOpenAI({
            model: model || 'gpt-3.5-turbo',
            operation,
            prompt: processedPrompt,
            temperature,
            maxTokens,
            apiKey
          });

        case 'anthropic':
          return await executeAnthropic({
            model: model || 'claude-2',
            operation,
            prompt: processedPrompt,
            temperature,
            maxTokens,
            apiKey
          });

        case 'custom':
          if (!endpoint) {
            throw new Error('Custom endpoint is required for custom provider');
          }
          return await executeCustomAI({
            endpoint,
            prompt: processedPrompt,
            apiKey
          });

        default:
          throw new Error(`Unknown AI provider: ${provider}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`AI operation failed: ${errorMessage}`);
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];
    const config = (node.data?.config || {}) as Record<string, unknown>;

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.prompt) {
      errors.push('Prompt is required');
    }

    if (!config.provider) {
      errors.push('AI provider is required');
    }

    if (config.provider === 'custom' && !config.endpoint) {
      errors.push('Custom endpoint is required for custom provider');
    }

    return errors;
  }
};