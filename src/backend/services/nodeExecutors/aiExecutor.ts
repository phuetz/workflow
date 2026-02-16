/**
 * AI Node Executor
 * Real integration with OpenAI, Anthropic, and custom AI endpoints
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import axios from 'axios';
import { logger } from '../../../services/SimpleLogger';

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

async function executeOpenAI(options: {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}): Promise<any> {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: options.model,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: options.prompt },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    },
    {
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  );

  const data = response.data;
  return {
    provider: 'openai',
    model: options.model,
    response: {
      text: data.choices?.[0]?.message?.content || '',
      finishReason: data.choices?.[0]?.finish_reason,
      usage: data.usage,
    },
    timestamp: new Date().toISOString(),
  };
}

async function executeAnthropic(options: {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
}): Promise<any> {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: options.model,
      max_tokens: options.maxTokens,
      ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
      messages: [
        { role: 'user', content: options.prompt },
      ],
      temperature: options.temperature,
    },
    {
      headers: {
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  );

  const data = response.data;
  return {
    provider: 'anthropic',
    model: options.model,
    response: {
      text: data.content?.[0]?.text || '',
      stopReason: data.stop_reason,
      usage: data.usage,
    },
    timestamp: new Date().toISOString(),
  };
}

async function executeCustomAI(options: {
  endpoint: string;
  prompt: string;
  apiKey: string;
  model?: string;
}): Promise<any> {
  const response = await axios.post(
    options.endpoint,
    {
      prompt: options.prompt,
      model: options.model,
    },
    {
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  );

  return {
    provider: 'custom',
    endpoint: options.endpoint,
    response: response.data,
    timestamp: new Date().toISOString(),
  };
}

export const aiExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    const provider = (config.provider || 'openai') as string;
    const model = config.model as string | undefined;
    const prompt = config.prompt as string | undefined;
    const systemPrompt = config.systemPrompt as string | undefined;
    const temperature = (config.temperature ?? 0.7) as number;
    const maxTokens = (config.maxTokens || 1000) as number;
    const endpoint = config.endpoint as string | undefined;

    // API key from credentials or config
    const apiKey = credentials.apiKey || config.apiKey as string | undefined;

    if (!apiKey) {
      throw new Error('API key is required for AI operations (provide via credentials)');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const inputContext = (context.input || {}) as Record<string, unknown>;
    const processedPrompt = processTemplate(prompt, inputContext);

    logger.info('Executing AI request', { provider, model });

    try {
      let result: any;

      switch (provider) {
        case 'openai':
          result = await executeOpenAI({
            model: model || 'gpt-4o-mini',
            prompt: processedPrompt,
            systemPrompt,
            temperature,
            maxTokens,
            apiKey,
          });
          break;

        case 'anthropic':
          result = await executeAnthropic({
            model: model || 'claude-sonnet-4-5-20250929',
            prompt: processedPrompt,
            systemPrompt,
            temperature,
            maxTokens,
            apiKey,
          });
          break;

        case 'custom':
          if (!endpoint) {
            throw new Error('Custom endpoint is required for custom provider');
          }
          result = await executeCustomAI({
            endpoint,
            prompt: processedPrompt,
            apiKey,
            model,
          });
          break;

        default:
          throw new Error(`Unknown AI provider: ${provider}`);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        throw new Error(`AI API error (${status}): ${JSON.stringify(data)}`);
      }
      throw error;
    }
  },
};
