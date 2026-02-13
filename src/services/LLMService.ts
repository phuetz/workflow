import { logger } from './SimpleLogger';
import { ConfigHelpers } from '../config/environment';
import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMPool,
  LLMMetrics,
  LLMRequestConfig,
  LLMMessage,
  LLMTool,
  LLMUsage
} from '../types/llm';

export class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  private pools: Map<string, LLMPool> = new Map();
  private cache: Map<string, LLMResponse> = new Map();
  private metrics: Map<string, LLMMetrics> = new Map();
  private activeRequests: Map<string, AbortController> = new Map();

  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeProviders();
    this.startHealthCheck();
  }

  // Provider Management
  async registerProvider(provider: LLMProvider): Promise<boolean> {
    try {
      // Validate provider configuration
      const isValid = await this.validateProvider(provider);
      if (!isValid) {
        throw new Error('Invalid provider configuration');
      }

      // Test connection
      await this.testProviderConnection(provider);

      this.providers.set(provider.id, provider);
      logger.info(`LLM Provider registered: ${provider.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to register provider ${provider.name}:`, error);
      return false;
    }
  }

  async updateProvider(providerId: string, updates: Partial<LLMProvider>): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) return false;

    const updatedProvider: LLMProvider = { ...provider, ...updates };
    return this.registerProvider(updatedProvider);
  }

  async removeProvider(providerId: string): Promise<boolean> {
    const removed = this.providers.delete(providerId);
    if (removed) {
      logger.info(`LLM Provider removed: ${providerId}`);
    }
    return removed;
  }

  // Model Management
  getAvailableModels(providerId?: string): LLMModel[] {
    const models: LLMModel[] = [];

    for (const provider of this.providers.values()) {
      if (!providerId || provider.id === providerId) {
        models.push(...provider.models);
      }
    }

    return models.filter(model => model.status === 'available');
  }

  getModel(modelId: string): LLMModel | null {
    for (const provider of this.providers.values()) {
      const model = provider.models.find(m => m.id === modelId);
      if (model) return model;
    }
    return null;
  }

  getBestModel(requirements: {
    type?: string;
    capabilities?: string[];
    maxCost?: number;
    minPerformance?: number;
  }): LLMModel | null {
    const allModels = this.getAvailableModels();

    const candidates = allModels.filter(model => {
      if (requirements.type && model.type !== requirements.type) return false;
      if (requirements.maxCost && model.costPerToken.input > requirements.maxCost) return false;
      if (requirements.minPerformance && model.performance.accuracy < requirements.minPerformance) return false;

      if (requirements.capabilities) {
        for (const capability of requirements.capabilities) {
          if (!model.capabilities[capability as keyof typeof model.capabilities]) {
            return false;
          }
        }
      }

      return true;
    });

    if (candidates.length === 0) return null;

    // Sort by performance and cost
    candidates.sort((a, b) => {
      const scoreA = a.performance.accuracy - (a.costPerToken.input * 1000);
      const scoreB = b.performance.accuracy - (b.costPerToken.input * 1000);
      return scoreB - scoreA;
    });

    return candidates[0];
  }

  // Request Handling
  async generateText(
    modelId: string,
    messages: LLMMessage[],
    config: LLMRequestConfig = {},
    tools?: LLMTool[]
  ): Promise<LLMResponse> {
    const request: LLMRequest = {
      id: this.generateId(),
      providerId: this.getProviderIdByModel(modelId),
      modelId,
      messages,
      config,
      tools,
      timestamp: new Date().toISOString(),
      userId: 'current_user',
      organizationId: 'current_org'
    };

    return this.executeRequest(request);
  }

  async generateTextStream(
    modelId: string,
    messages: LLMMessage[],
    config: LLMRequestConfig = {},
    tools?: LLMTool[]
  ): Promise<AsyncGenerator<LLMStreamChunk>> {
    const request: LLMRequest = {
      id: this.generateId(),
      providerId: this.getProviderIdByModel(modelId),
      modelId,
      messages,
      config: { ...config, stream: true },
      tools,
      timestamp: new Date().toISOString(),
      userId: 'current_user',
      organizationId: 'current_org'
    };

    return this.executeStreamRequest(request);
  }

  async executeRequest(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);

    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey) as LLMResponse | undefined;
      if (cached) {
        return {
          ...cached,
          cached: true,
          latency: Date.now() - startTime
        };
      }

      // Get provider
      const provider = this.providers.get(request.providerId);
      if (!provider) {
        throw new Error(`Provider ${request.providerId} not found`);
      }

      // Validate model
      const model = this.getModel(request.modelId);
      if (!model) {
        throw new Error(`Model ${request.modelId} not found`);
      }

      // Check rate limits
      await this.checkRateLimits(provider, request);

      // Execute request
      const response = await this.callProvider(provider, request);

      // Update metrics
      this.updateMetrics(provider.id, model.id, response.usage, Date.now() - startTime);

      // Cache response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      this.handleError(error, request);
      throw error;
    }
  }

  async executeStreamRequest(request: LLMRequest): Promise<AsyncGenerator<LLMStreamChunk>> {
    const provider = this.providers.get(request.providerId);
    if (!provider) {
      throw new Error(`Provider ${request.providerId} not found`);
    }

    return this.callProviderStream(provider, request);
  }

  // Provider-specific implementations
  private async callProvider(provider: LLMProvider, request: LLMRequest): Promise<LLMResponse> {
    const abortController = new AbortController();
    this.activeRequests.set(request.id, abortController);

    try {
      switch (provider.type) {
        case 'openai':
          return await this.callOpenAI(provider, request, abortController.signal);
        case 'anthropic':
          return await this.callAnthropic(provider, request, abortController.signal);
        case 'google':
          return await this.callGoogle(provider, request, abortController.signal);
        case 'azure':
          return await this.callAzure(provider, request, abortController.signal);
        case 'local':
          return await this.callLocal(provider, request, abortController.signal);
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }
    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  private async callOpenAI(provider: LLMProvider, request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> {
    const url = `${provider.config.baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.config.apiKey}`,
        'OpenAI-Organization': provider.config.organization || '',
        ...provider.config.headers
      },
      body: JSON.stringify({
        model: request.modelId,
        messages: request.messages,
        temperature: request.config.temperature,
        max_tokens: request.config.maxTokens,
        top_p: request.config.topP,
        frequency_penalty: request.config.frequencyPenalty,
        presence_penalty: request.config.presencePenalty,
        stop: request.config.stopSequences,
        tools: request.tools,
        stream: false
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return {
      id: data.id,
      requestId: request.id,
      providerId: provider.id,
      modelId: request.modelId,
      content: data.choices[0].message.content,
      finishReason: data.choices[0].finish_reason,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        cost: this.calculateCost(provider.id, request.modelId, data.usage),
        currency: 'USD'
      },
      toolCalls: data.choices[0].message.tool_calls,
      timestamp: new Date().toISOString(),
      latency: 0,
      cached: false
    };
  }

  private async callAnthropic(provider: LLMProvider, request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> {
    const url = `${provider.config.baseUrl}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.config.apiKey || '',
        'anthropic-version': '2023-06-01',
        ...provider.config.headers
      },
      body: JSON.stringify({
        model: request.modelId,
        messages: request.messages.filter(m => m.role !== 'system'),
        system: request.messages.find(m => m.role === 'system')?.content,
        max_tokens: request.config.maxTokens || 1024,
        temperature: request.config.temperature,
        top_p: request.config.topP,
        stop_sequences: request.config.stopSequences,
        tools: request.tools,
        stream: false
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return {
      id: data.id,
      requestId: request.id,
      providerId: provider.id,
      modelId: request.modelId,
      content: data.content[0].text,
      finishReason: data.stop_reason,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        cost: this.calculateCost(provider.id, request.modelId, data.usage),
        currency: 'USD'
      },
      timestamp: new Date().toISOString(),
      latency: 0,
      cached: false
    };
  }

  private async callGoogle(provider: LLMProvider, request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> {
    const url = `${provider.config.baseUrl}/models/${request.modelId}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.config.apiKey}`,
        ...provider.config.headers
      },
      body: JSON.stringify({
        contents: request.messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          parts: [{ text: m.content }]
        })),
        generationConfig: {
          temperature: request.config.temperature,
          topP: request.config.topP,
          topK: request.config.topK,
          maxOutputTokens: request.config.maxTokens,
          stopSequences: request.config.stopSequences
        },
        tools: request.tools
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return {
      id: this.generateId(),
      requestId: request.id,
      providerId: provider.id,
      modelId: request.modelId,
      content: data.candidates[0].content.parts[0].text,
      finishReason: data.candidates[0].finishReason,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
        cost: this.calculateCost(provider.id, request.modelId, data.usageMetadata),
        currency: 'USD'
      },
      timestamp: new Date().toISOString(),
      latency: 0,
      cached: false
    };
  }

  private async callAzure(provider: LLMProvider, request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> {
    const url = `${provider.config.baseUrl}/openai/deployments/${request.modelId}/chat/completions?api-version=2023-05-15`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': provider.config.apiKey || '',
        ...provider.config.headers
      },
      body: JSON.stringify({
        messages: request.messages,
        temperature: request.config.temperature,
        max_tokens: request.config.maxTokens,
        top_p: request.config.topP,
        frequency_penalty: request.config.frequencyPenalty,
        presence_penalty: request.config.presencePenalty,
        stop: request.config.stopSequences,
        tools: request.tools,
        stream: false
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return {
      id: data.id,
      requestId: request.id,
      providerId: provider.id,
      modelId: request.modelId,
      content: data.choices[0].message.content,
      finishReason: data.choices[0].finish_reason,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        cost: this.calculateCost(provider.id, request.modelId, data.usage),
        currency: 'USD'
      },
      toolCalls: data.choices[0].message.tool_calls,
      timestamp: new Date().toISOString(),
      latency: 0,
      cached: false
    };
  }

  private async callLocal(provider: LLMProvider, request: LLMRequest, signal: AbortSignal): Promise<LLMResponse> {
    const url = `${provider.config.baseUrl}/v1/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...provider.config.headers
      },
      body: JSON.stringify({
        model: request.modelId,
        messages: request.messages,
        temperature: request.config.temperature,
        max_tokens: request.config.maxTokens,
        top_p: request.config.topP,
        stop: request.config.stopSequences,
        stream: false
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Local API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return {
      id: data.id || this.generateId(),
      requestId: request.id,
      providerId: provider.id,
      modelId: request.modelId,
      content: data.choices[0].message.content,
      finishReason: data.choices[0].finish_reason || 'stop',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        cost: 0,
        currency: 'USD'
      },
      timestamp: new Date().toISOString(),
      latency: 0,
      cached: false
    };
  }

  private async *callProviderStream(provider: LLMProvider, request: LLMRequest): AsyncGenerator<LLMStreamChunk> {
    yield {
      id: this.generateId(),
      requestId: request.id,
      delta: 'Streaming not yet implemented',
      finishReason: 'stop'
    };
  }

  // Pool Management
  async createPool(pool: LLMPool): Promise<boolean> {
    try {
      this.pools.set(pool.id, pool);
      return true;
    } catch (error) {
      logger.error('Failed to create pool:', error);
      return false;
    }
  }

  async executeWithPool(poolId: string, request: Omit<LLMRequest, 'providerId'>): Promise<LLMResponse> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    const provider = this.selectProviderFromPool(pool);
    const fullRequest: LLMRequest = {
      ...request,
      providerId: provider.id
    } as LLMRequest;

    return this.executeRequest(fullRequest);
  }

  private selectProviderFromPool(pool: LLMPool): LLMProvider {
    const activeProviders = pool.providers
      .filter((p): p is LLMProvider => p !== undefined && p.status === 'active');

    if (activeProviders.length === 0) {
      throw new Error('No active providers in pool');
    }

    switch (pool.strategy) {
      case 'round_robin':
        return activeProviders[Math.floor(Math.random() * activeProviders.length)];
      case 'least_latency':
        return activeProviders.reduce((best, current) =>
          this.getAverageLatency(current.id) < this.getAverageLatency(best.id) ? current : best
        );
      case 'least_cost':
        return activeProviders.reduce((best, current) =>
          this.getAverageCost(current.id) < this.getAverageCost(best.id) ? current : best
        );
      case 'best_quality':
      case 'custom':
      default:
        return activeProviders[0];
    }
  }

  // Utility Methods
  private async validateProvider(provider: LLMProvider): Promise<boolean> {
    if (!provider.id || !provider.name || !provider.type) {
      return false;
    }

    if (!provider.config.apiKey && provider.type !== 'local') {
      return false;
    }

    return true;
  }

  private async testProviderConnection(provider: LLMProvider): Promise<boolean> {
    try {
      const testRequest: LLMRequest = {
        id: this.generateId(),
        providerId: provider.id,
        modelId: provider.models[0]?.id || 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        config: { maxTokens: 10 },
        timestamp: new Date().toISOString(),
        userId: 'test',
        organizationId: 'test'
      };

      await this.callProvider(provider, testRequest);
      return true;
    } catch (error) {
      logger.error(`Provider connection test failed for ${provider.name}:`, error);
      return false;
    }
  }

  private async checkRateLimits(provider: LLMProvider, _request: LLMRequest): Promise<void> {
    const limits = provider.limits;
    if (!limits) return;

    const currentUsage = this.getCurrentUsage(provider.id);

    if (currentUsage.requestsPerMinute >= limits.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded: requests per minute');
    }

    if (currentUsage.tokensPerMinute >= limits.maxTokensPerMinute) {
      throw new Error('Rate limit exceeded: tokens per minute');
    }
  }

  private getCurrentUsage(_providerId: string): { requestsPerMinute: number; tokensPerMinute: number } {
    return { requestsPerMinute: 0, tokensPerMinute: 0 };
  }

  private calculateCost(providerId: string, modelId: string, usage: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number; promptTokenCount?: number; candidatesTokenCount?: number }): number {
    const model = this.getModel(modelId);
    if (!model) return 0;

    const inputTokens = usage.prompt_tokens || usage.input_tokens || usage.promptTokenCount || 0;
    const outputTokens = usage.completion_tokens || usage.output_tokens || usage.candidatesTokenCount || 0;

    const inputCost = inputTokens * model.costPerToken.input;
    const outputCost = outputTokens * model.costPerToken.output;
    return inputCost + outputCost;
  }

  private updateMetrics(providerId: string, modelId: string, usage: LLMUsage, latency: number): void {
    const key = `${providerId}:${modelId}`;
    const existing = this.metrics.get(key);

    if (existing) {
      existing.requests += 1;
      existing.tokens += usage.totalTokens;
      existing.cost += usage.cost;
      existing.averageLatency = (existing.averageLatency * (existing.requests - 1) + latency) / existing.requests;
    } else {
      this.metrics.set(key, {
        providerId,
        modelId,
        period: 'current',
        requests: 1,
        tokens: usage.totalTokens,
        cost: usage.cost,
        averageLatency: latency,
        successRate: 1,
        errorRate: 0,
        errors: {},
        timestamp: new Date().toISOString()
      });
    }
  }

  private getAverageLatency(providerId: string): number {
    const providerMetrics = Array.from(this.metrics.values()).filter(m => m.providerId === providerId);
    if (providerMetrics.length === 0) return 0;

    const totalLatency = providerMetrics.reduce((sum, m) => sum + m.averageLatency, 0);
    return totalLatency / providerMetrics.length;
  }

  private getAverageCost(providerId: string): number {
    const providerMetrics = Array.from(this.metrics.values()).filter(m => m.providerId === providerId);
    if (providerMetrics.length === 0) return 0;

    const totalCost = providerMetrics.reduce((sum, m) => sum + m.cost, 0);
    const totalTokens = providerMetrics.reduce((sum, m) => sum + m.tokens, 0);
    return totalTokens > 0 ? totalCost / totalTokens : 0;
  }

  private getProviderIdByModel(modelId: string): string {
    for (const provider of this.providers.values()) {
      if (provider.models.some(m => m.id === modelId)) {
        return provider.id;
      }
    }
    throw new Error(`Model ${modelId} not found in any provider`);
  }

  private getCacheKey(request: LLMRequest): string {
    return `${request.modelId}:${JSON.stringify(request.messages)}:${JSON.stringify(request.config)}`;
  }

  private getFromCache(key: string): LLMResponse | undefined {
    return this.cache.get(key);
  }

  private setCache(key: string, value: LLMResponse): void {
    this.cache.set(key, value);

    // Simple LRU cache cleanup
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  private handleError(error: unknown, request: LLMRequest): void {
    logger.error('LLM Request failed:', error);

    const key = `${request.providerId}:${request.modelId}`;
    const metrics = this.metrics.get(key);
    if (metrics) {
      metrics.errorRate += 1;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      metrics.errors[errorMessage] = (metrics.errors[errorMessage] || 0) + 1;
    }
  }

  private generateId(): string {
    return 'llm_' + Math.random().toString(36).substring(2, 11);
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkProviderHealth();
    }, 30000);
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  private async checkProviderHealth(): Promise<void> {
    for (const provider of this.providers.values()) {
      try {
        await this.testProviderConnection(provider);
        if (provider.status !== 'active') {
          provider.status = 'active';
          this.providers.set(provider.id, provider);
        }
      } catch {
        if (provider.status !== 'error') {
          provider.status = 'error';
          this.providers.set(provider.id, provider);
        }
      }
    }
  }

  private initializeProviders(): void {
    const timeout = ConfigHelpers.getTimeout('llmRequest');

    const openaiProvider: LLMProvider = {
      id: 'openai',
      name: 'OpenAI',
      description: 'OpenAI GPT models',
      type: 'openai',
      status: 'inactive',
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
            fineTuning: false
          },
          contextLength: 8192,
          maxTokens: 4096,
          costPerToken: {
            input: 0.00003,
            output: 0.00006
          },
          performance: {
            averageLatency: 2000,
            tokensPerSecond: 50,
            reliability: 0.99,
            accuracy: 0.95,
            lastBenchmark: new Date().toISOString()
          },
          status: 'available',
          tags: ['chat', 'reasoning', 'coding']
        }
      ],
      config: {
        baseUrl: 'https://api.openai.com/v1',
        timeout,
        retryAttempts: 3
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
        fineTuning: true
      },
      pricing: {
        model: 'gpt-4',
        currency: 'USD',
        inputTokenPrice: 0.00003,
        outputTokenPrice: 0.00006
      },
      limits: {
        maxRequestsPerMinute: 60,
        maxTokensPerMinute: 150000,
        maxConcurrentRequests: 10,
        maxContextLength: 8192,
        maxResponseTokens: 4096
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.providers.set(openaiProvider.id, openaiProvider);
  }

  // Public API
  getProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(providerId: string): LLMProvider | undefined {
    return this.providers.get(providerId);
  }

  getMetrics(): LLMMetrics[] {
    return Array.from(this.metrics.values());
  }

  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }
}
