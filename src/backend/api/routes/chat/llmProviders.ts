/**
 * LLM Provider Configurations
 * Defines all supported AI providers and their model configurations
 */

import type { LLMProvider } from '../../../../types/llm';
import { LLMService } from '../../../../services/LLMService';
import { logger } from '../../../../services/SimpleLogger';

// Singleton LLM service instance for the chat module
let llmServiceInstance: LLMService | null = null;

/**
 * Get or create the LLM service instance
 */
export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
    initializeLLMProviders(llmServiceInstance);
  }
  return llmServiceInstance;
}

/**
 * Create OpenAI provider configuration
 */
function createOpenAIProvider(): LLMProvider {
  return {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI GPT models',
    type: 'openai',
    status: 'active',
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        providerId: 'openai',
        version: '4',
        description: 'Most capable GPT model',
        type: 'text',
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          planning: true,
          imageAnalysis: false,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
          embedding: false,
          fineTuning: false,
        },
        contextLength: 8192,
        maxTokens: 4096,
        costPerToken: { input: 0.00003, output: 0.00006 },
        performance: {
          averageLatency: 2000,
          tokensPerSecond: 50,
          reliability: 0.99,
          accuracy: 0.95,
          lastBenchmark: new Date().toISOString(),
        },
        status: 'available',
        tags: ['chat', 'reasoning', 'coding'],
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        providerId: 'openai',
        version: '4-turbo',
        description: 'Faster and cheaper GPT-4 variant',
        type: 'text',
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          planning: true,
          imageAnalysis: true,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
          embedding: false,
          fineTuning: false,
        },
        contextLength: 128000,
        maxTokens: 4096,
        costPerToken: { input: 0.00001, output: 0.00003 },
        performance: {
          averageLatency: 1500,
          tokensPerSecond: 80,
          reliability: 0.99,
          accuracy: 0.94,
          lastBenchmark: new Date().toISOString(),
        },
        status: 'available',
        tags: ['chat', 'vision', 'fast'],
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        providerId: 'openai',
        version: '3.5-turbo',
        description: 'Fast and cost-effective model',
        type: 'text',
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          planning: false,
          imageAnalysis: false,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
          embedding: false,
          fineTuning: true,
        },
        contextLength: 16385,
        maxTokens: 4096,
        costPerToken: { input: 0.0000005, output: 0.0000015 },
        performance: {
          averageLatency: 800,
          tokensPerSecond: 100,
          reliability: 0.99,
          accuracy: 0.88,
          lastBenchmark: new Date().toISOString(),
        },
        status: 'available',
        tags: ['chat', 'fast', 'cheap'],
      },
    ],
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      organization: process.env.OPENAI_ORGANIZATION,
      timeout: 60000,
      retryAttempts: 3,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      imageInput: true,
      audioInput: false,
      videoInput: false,
      jsonMode: true,
      systemMessages: true,
      toolUse: true,
      contextWindow: 128000,
      batchProcessing: true,
      fineTuning: true,
    },
    pricing: {
      model: 'gpt-4',
      currency: 'USD',
      inputTokenPrice: 0.00003,
      outputTokenPrice: 0.00006,
    },
    limits: {
      maxRequestsPerMinute: 500,
      maxTokensPerMinute: 150000,
      maxConcurrentRequests: 100,
      maxContextLength: 128000,
      maxResponseTokens: 4096,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create Anthropic provider configuration
 */
function createAnthropicProvider(): LLMProvider {
  return {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models',
    type: 'anthropic',
    status: 'active',
    models: [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        providerId: 'anthropic',
        version: '3-opus',
        description: 'Most powerful Claude model',
        type: 'text',
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          planning: true,
          imageAnalysis: true,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
          embedding: false,
          fineTuning: false,
        },
        contextLength: 200000,
        maxTokens: 4096,
        costPerToken: { input: 0.000015, output: 0.000075 },
        performance: {
          averageLatency: 3000,
          tokensPerSecond: 40,
          reliability: 0.99,
          accuracy: 0.96,
          lastBenchmark: new Date().toISOString(),
        },
        status: 'available',
        tags: ['chat', 'reasoning', 'vision'],
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        providerId: 'anthropic',
        version: '3-sonnet',
        description: 'Balanced performance and speed',
        type: 'text',
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          planning: true,
          imageAnalysis: true,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
          embedding: false,
          fineTuning: false,
        },
        contextLength: 200000,
        maxTokens: 4096,
        costPerToken: { input: 0.000003, output: 0.000015 },
        performance: {
          averageLatency: 1500,
          tokensPerSecond: 70,
          reliability: 0.99,
          accuracy: 0.93,
          lastBenchmark: new Date().toISOString(),
        },
        status: 'available',
        tags: ['chat', 'balanced', 'vision'],
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        providerId: 'anthropic',
        version: '3-haiku',
        description: 'Fastest and most affordable',
        type: 'text',
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          planning: false,
          imageAnalysis: true,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
          embedding: false,
          fineTuning: false,
        },
        contextLength: 200000,
        maxTokens: 4096,
        costPerToken: { input: 0.00000025, output: 0.00000125 },
        performance: {
          averageLatency: 500,
          tokensPerSecond: 150,
          reliability: 0.99,
          accuracy: 0.89,
          lastBenchmark: new Date().toISOString(),
        },
        status: 'available',
        tags: ['chat', 'fast', 'cheap'],
      },
    ],
    config: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: 'https://api.anthropic.com/v1',
      timeout: 60000,
      retryAttempts: 3,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      imageInput: true,
      audioInput: false,
      videoInput: false,
      jsonMode: true,
      systemMessages: true,
      toolUse: true,
      contextWindow: 200000,
      batchProcessing: false,
      fineTuning: false,
    },
    pricing: {
      model: 'claude-3-sonnet',
      currency: 'USD',
      inputTokenPrice: 0.000003,
      outputTokenPrice: 0.000015,
    },
    limits: {
      maxRequestsPerMinute: 500,
      maxTokensPerMinute: 100000,
      maxConcurrentRequests: 100,
      maxContextLength: 200000,
      maxResponseTokens: 4096,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create Google AI provider configuration
 */
function createGoogleProvider(): LLMProvider {
  return {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini models',
    type: 'google',
    status: 'active',
    models: [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        providerId: 'google',
        version: 'pro',
        description: 'Google Gemini Pro model',
        type: 'text',
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          planning: true,
          imageAnalysis: false,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
          embedding: false,
          fineTuning: false,
        },
        contextLength: 32768,
        maxTokens: 8192,
        costPerToken: { input: 0.000000125, output: 0.000000375 },
        performance: {
          averageLatency: 1000,
          tokensPerSecond: 80,
          reliability: 0.98,
          accuracy: 0.91,
          lastBenchmark: new Date().toISOString(),
        },
        status: 'available',
        tags: ['chat', 'google', 'multimodal'],
      },
    ],
    config: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      timeout: 60000,
      retryAttempts: 3,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      imageInput: true,
      audioInput: false,
      videoInput: false,
      jsonMode: true,
      systemMessages: true,
      toolUse: true,
      contextWindow: 32768,
      batchProcessing: false,
      fineTuning: false,
    },
    pricing: {
      model: 'gemini-pro',
      currency: 'USD',
      inputTokenPrice: 0.000000125,
      outputTokenPrice: 0.000000375,
    },
    limits: {
      maxRequestsPerMinute: 60,
      maxTokensPerMinute: 60000,
      maxConcurrentRequests: 10,
      maxContextLength: 32768,
      maxResponseTokens: 8192,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create Azure OpenAI provider configuration
 */
function createAzureProvider(): LLMProvider {
  return {
    id: 'azure',
    name: 'Azure OpenAI',
    description: 'Azure-hosted OpenAI models',
    type: 'azure',
    status: 'active',
    models: [
      {
        id: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
        name: 'Azure GPT-4',
        providerId: 'azure',
        version: '4',
        description: 'Azure-hosted GPT-4',
        type: 'text',
        capabilities: {
          textGeneration: true,
          codeGeneration: true,
          reasoning: true,
          planning: true,
          imageAnalysis: false,
          functionCalling: true,
          jsonMode: true,
          streaming: true,
          embedding: false,
          fineTuning: false,
        },
        contextLength: 8192,
        maxTokens: 4096,
        costPerToken: { input: 0.00003, output: 0.00006 },
        performance: {
          averageLatency: 2000,
          tokensPerSecond: 50,
          reliability: 0.99,
          accuracy: 0.95,
          lastBenchmark: new Date().toISOString(),
        },
        status: 'available',
        tags: ['chat', 'azure', 'enterprise'],
      },
    ],
    config: {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseUrl: process.env.AZURE_OPENAI_ENDPOINT,
      timeout: 60000,
      retryAttempts: 3,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      imageInput: false,
      audioInput: false,
      videoInput: false,
      jsonMode: true,
      systemMessages: true,
      toolUse: true,
      contextWindow: 8192,
      batchProcessing: false,
      fineTuning: true,
    },
    pricing: {
      model: 'gpt-4',
      currency: 'USD',
      inputTokenPrice: 0.00003,
      outputTokenPrice: 0.00006,
    },
    limits: {
      maxRequestsPerMinute: 60,
      maxTokensPerMinute: 150000,
      maxConcurrentRequests: 10,
      maxContextLength: 8192,
      maxResponseTokens: 4096,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Initialize LLM providers from environment variables
 */
export async function initializeLLMProviders(service: LLMService): Promise<void> {
  // OpenAI provider
  if (process.env.OPENAI_API_KEY) {
    await service.registerProvider(createOpenAIProvider()).catch((err) => {
      logger.warn('Failed to register OpenAI provider:', err);
    });
  }

  // Anthropic provider
  if (process.env.ANTHROPIC_API_KEY) {
    await service.registerProvider(createAnthropicProvider()).catch((err) => {
      logger.warn('Failed to register Anthropic provider:', err);
    });
  }

  // Google AI provider
  if (process.env.GOOGLE_AI_API_KEY) {
    await service.registerProvider(createGoogleProvider()).catch((err) => {
      logger.warn('Failed to register Google AI provider:', err);
    });
  }

  // Azure OpenAI provider
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    await service.registerProvider(createAzureProvider()).catch((err) => {
      logger.warn('Failed to register Azure OpenAI provider:', err);
    });
  }
}
