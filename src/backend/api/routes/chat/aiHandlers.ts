/**
 * AI Handlers
 * AI/LLM integration logic for generating responses
 */

import type { LLMMessage, LLMResponse } from '../../../../types/llm';
import { logger } from '../../../../services/SimpleLogger';
import { getLLMService } from './llmProviders';
import type { AIConfig, AIResponseResult, StreamChunk } from './types';
import { DEFAULT_AI_CONFIG } from './types';

/**
 * Select the best available model based on configuration
 */
function selectModel(
  llmService: ReturnType<typeof getLLMService>,
  preferredModel?: string
): string {
  // Try preferred model first
  if (preferredModel) {
    const model = llmService.getModel(preferredModel);
    if (model) {
      return preferredModel;
    }
  }

  // Try to find best available model
  const bestModel = llmService.getBestModel({
    type: 'text',
    capabilities: ['textGeneration'],
  });

  if (bestModel) {
    return bestModel.id;
  }

  // Fall back to first available model
  const availableModels = llmService.getAvailableModels();
  if (availableModels.length > 0) {
    return availableModels[0].id;
  }

  throw new Error('No AI models available');
}

/**
 * Build LLM messages with system prompt
 */
function buildLLMMessages(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string
): LLMMessage[] {
  const llmMessages: LLMMessage[] = [];

  if (systemPrompt) {
    llmMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  for (const msg of messages) {
    llmMessages.push({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    });
  }

  return llmMessages;
}

/**
 * Generate AI response using configured LLM provider
 */
export async function generateAIResponse(
  messages: Array<{ role: string; content: string }>,
  config: AIConfig = {}
): Promise<AIResponseResult> {
  const llmService = getLLMService();
  const mergedConfig = { ...DEFAULT_AI_CONFIG, ...config };

  // Get available providers
  const providers = llmService.getProviders();
  if (providers.length === 0) {
    throw new Error(
      'No AI providers configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, or AZURE_OPENAI_API_KEY environment variable.'
    );
  }

  // Select model
  const modelId = selectModel(llmService, mergedConfig.model);

  // Build messages with system prompt
  const llmMessages = buildLLMMessages(messages, mergedConfig.systemPrompt);

  const startTime = Date.now();

  try {
    const response: LLMResponse = await llmService.generateText(modelId, llmMessages, {
      temperature: mergedConfig.temperature,
      maxTokens: mergedConfig.maxTokens,
    });

    const latency = Date.now() - startTime;

    return {
      content: response.content,
      usage: {
        input: response.usage.promptTokens,
        output: response.usage.completionTokens,
      },
      model: response.modelId,
      latency,
    };
  } catch (error) {
    logger.error('AI response generation failed:', error);
    throw error;
  }
}

/**
 * Generate streaming AI response
 */
export async function* generateAIResponseStream(
  messages: Array<{ role: string; content: string }>,
  config: AIConfig = {}
): AsyncGenerator<StreamChunk> {
  const llmService = getLLMService();
  const mergedConfig = { ...DEFAULT_AI_CONFIG, ...config, stream: true };

  // Get available providers
  const providers = llmService.getProviders();
  if (providers.length === 0) {
    throw new Error('No AI providers configured');
  }

  // Select model
  const modelId = selectModel(llmService, mergedConfig.model);

  // Build messages
  const llmMessages = buildLLMMessages(messages, mergedConfig.systemPrompt);

  try {
    const stream = await llmService.generateTextStream(modelId, llmMessages, {
      temperature: mergedConfig.temperature,
      maxTokens: mergedConfig.maxTokens,
    });

    for await (const chunk of stream) {
      yield {
        chunk: chunk.delta,
        done: chunk.finishReason === 'stop',
        usage: chunk.usage
          ? {
              input: chunk.usage.promptTokens || 0,
              output: chunk.usage.completionTokens || 0,
            }
          : undefined,
      };
    }
  } catch (error) {
    logger.error('AI streaming response failed:', error);
    throw error;
  }
}
