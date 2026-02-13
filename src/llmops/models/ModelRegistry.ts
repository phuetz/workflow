/**
 * Model Registry
 * Central registry for all available models with metadata and capabilities
 */

import type { ModelMetadata, ModelProvider, ModelCapability } from '../types/llmops';
import { logger } from '../../services/SimpleLogger';

export class ModelRegistry {
  private models: Map<string, ModelMetadata> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * Register model
   */
  register(model: ModelMetadata): void {
    this.models.set(model.id, model);
    logger.debug(`[ModelRegistry] Registered: ${model.name} (${model.provider})`);
  }

  /**
   * Get model
   */
  get(modelId: string): ModelMetadata | undefined {
    return this.models.get(modelId);
  }

  /**
   * List all models
   */
  list(): ModelMetadata[] {
    return Array.from(this.models.values());
  }

  /**
   * List by provider
   */
  listByProvider(provider: ModelProvider): ModelMetadata[] {
    return this.list().filter((m) => m.provider === provider);
  }

  /**
   * Search models
   */
  search(query: {
    provider?: ModelProvider;
    tags?: string[];
    capabilities?: string[];
    maxCost?: number;
  }): ModelMetadata[] {
    let results = this.list();

    if (query.provider) {
      results = results.filter((m) => m.provider === query.provider);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((m) =>
        query.tags!.some((tag) => m.tags.includes(tag))
      );
    }

    if (query.capabilities && query.capabilities.length > 0) {
      results = results.filter((m) =>
        query.capabilities!.every((cap) => (m.capabilities as any)[cap])
      );
    }

    if (query.maxCost !== undefined) {
      results = results.filter(
        (m) => m.pricing.input + m.pricing.output <= query.maxCost!
      );
    }

    return results;
  }

  /**
   * Update model metadata
   */
  update(modelId: string, updates: Partial<ModelMetadata>): void {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const updated = {
      ...model,
      ...updates,
      updatedAt: new Date(),
    };

    this.models.set(modelId, updated);
  }

  /**
   * Remove model
   */
  remove(modelId: string): void {
    this.models.delete(modelId);
    logger.debug(`[ModelRegistry] Removed: ${modelId}`);
  }

  /**
   * Get model capabilities
   */
  getCapabilities(modelId: string): ModelCapability[] {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const capabilities: ModelCapability[] = [];

    for (const [name, supported] of Object.entries(model.capabilities)) {
      capabilities.push({
        name,
        description: this.getCapabilityDescription(name),
        supported: supported as boolean,
      });
    }

    return capabilities;
  }

  /**
   * Get capability description
   */
  private getCapabilityDescription(capability: string): string {
    const descriptions: Record<string, string> = {
      chat: 'Conversational chat capabilities',
      completion: 'Text completion',
      embedding: 'Text embeddings generation',
      fineTuning: 'Supports fine-tuning',
      vision: 'Image understanding',
      functionCalling: 'Function/tool calling',
    };

    return descriptions[capability] || capability;
  }

  /**
   * Initialize default models
   */
  private initializeDefaultModels(): void {
    // OpenAI models
    this.register({
      id: 'gpt-4',
      provider: 'openai',
      name: 'GPT-4',
      version: '0613',
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        fineTuning: true,
        vision: false,
        functionCalling: true,
      },
      contextWindow: 8192,
      maxTokens: 4096,
      pricing: {
        input: 0.03,
        output: 0.06,
      },
      averageLatency: 2000,
      throughput: 20,
      tags: ['production', 'high-quality'],
      description: 'Most capable OpenAI model for complex tasks',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.register({
      id: 'gpt-3.5-turbo',
      provider: 'openai',
      name: 'GPT-3.5 Turbo',
      version: '0125',
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        fineTuning: true,
        vision: false,
        functionCalling: true,
      },
      contextWindow: 16385,
      maxTokens: 4096,
      pricing: {
        input: 0.0015,
        output: 0.002,
      },
      averageLatency: 800,
      throughput: 50,
      tags: ['production', 'cost-effective'],
      description: 'Fast and cost-effective for most tasks',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Anthropic models
    this.register({
      id: 'claude-3-opus',
      provider: 'anthropic',
      name: 'Claude 3 Opus',
      version: '20240229',
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        fineTuning: true,
        vision: true,
        functionCalling: true,
      },
      contextWindow: 200000,
      maxTokens: 4096,
      pricing: {
        input: 0.015,
        output: 0.075,
      },
      averageLatency: 1500,
      throughput: 25,
      tags: ['production', 'high-quality', 'long-context'],
      description: 'Most intelligent Anthropic model',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.register({
      id: 'claude-3-sonnet',
      provider: 'anthropic',
      name: 'Claude 3 Sonnet',
      version: '20240229',
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        fineTuning: true,
        vision: true,
        functionCalling: true,
      },
      contextWindow: 200000,
      maxTokens: 4096,
      pricing: {
        input: 0.003,
        output: 0.015,
      },
      averageLatency: 1000,
      throughput: 35,
      tags: ['production', 'balanced'],
      description: 'Balanced intelligence and speed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.register({
      id: 'claude-3-haiku',
      provider: 'anthropic',
      name: 'Claude 3 Haiku',
      version: '20240307',
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        fineTuning: false,
        vision: true,
        functionCalling: false,
      },
      contextWindow: 200000,
      maxTokens: 4096,
      pricing: {
        input: 0.00025,
        output: 0.00125,
      },
      averageLatency: 400,
      throughput: 80,
      tags: ['production', 'fast', 'cost-effective'],
      description: 'Fastest and most cost-effective',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Google models
    this.register({
      id: 'gemini-pro',
      provider: 'google',
      name: 'Gemini Pro',
      version: '1.0',
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        fineTuning: false,
        vision: true,
        functionCalling: true,
      },
      contextWindow: 32768,
      maxTokens: 2048,
      pricing: {
        input: 0.00025,
        output: 0.0005,
      },
      averageLatency: 900,
      throughput: 40,
      tags: ['production', 'multimodal'],
      description: 'Google\'s multimodal AI model',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Azure OpenAI
    this.register({
      id: 'azure-gpt-4',
      provider: 'azure',
      name: 'Azure GPT-4',
      version: '0613',
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        fineTuning: true,
        vision: false,
        functionCalling: true,
      },
      contextWindow: 8192,
      maxTokens: 4096,
      pricing: {
        input: 0.03,
        output: 0.06,
      },
      averageLatency: 2200,
      throughput: 18,
      tags: ['production', 'enterprise'],
      description: 'GPT-4 via Azure OpenAI Service',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.debug(`[ModelRegistry] Initialized with ${this.models.size} default models`);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byProvider: Record<ModelProvider, number>;
    avgCost: number;
    avgLatency: number;
  } {
    const models = this.list();

    const byProvider: Partial<Record<ModelProvider, number>> = {};
    for (const model of models) {
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
    }

    const avgCost =
      models.reduce((sum, m) => sum + m.pricing.input + m.pricing.output, 0) /
      models.length;

    const avgLatency =
      models.reduce((sum, m) => sum + m.averageLatency, 0) / models.length;

    return {
      total: models.length,
      byProvider: byProvider as Record<ModelProvider, number>,
      avgCost,
      avgLatency,
    };
  }
}
