/**
 * Provider Handlers
 * Route handlers for AI provider and model information
 */

import type { Request, Response } from 'express';
import { logger } from '../../../../services/SimpleLogger';
import { cacheLayer as cacheService } from '../../../../services/CacheLayer';
import { getLLMService } from './llmProviders';
import { isDatabaseAvailable, fallbackChatConfigs, fallbackChatSessions, fallbackChatMessages } from './storage';

/**
 * GET /api/chat/providers
 * Get available AI providers and their models
 */
export async function listProviders(_req: Request, res: Response): Promise<void> {
  try {
    const llmService = getLLMService();
    const providers = llmService.getProviders();

    const providerInfo = providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      type: provider.type,
      status: provider.status,
      models: provider.models.map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        contextLength: model.contextLength,
        maxTokens: model.maxTokens,
        capabilities: model.capabilities,
        status: model.status,
      })),
      capabilities: provider.capabilities,
    }));

    res.json({
      success: true,
      data: providerInfo,
      total: providers.length,
    });
  } catch (error) {
    logger.error('Failed to fetch AI providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI providers',
    });
  }
}

/**
 * GET /api/chat/models
 * Get all available AI models across providers
 */
export async function listModels(_req: Request, res: Response): Promise<void> {
  try {
    const llmService = getLLMService();
    const models = llmService.getAvailableModels();

    const modelInfo = models.map((model) => ({
      id: model.id,
      name: model.name,
      providerId: model.providerId,
      description: model.description,
      type: model.type,
      contextLength: model.contextLength,
      maxTokens: model.maxTokens,
      capabilities: model.capabilities,
      costPerToken: model.costPerToken,
      performance: model.performance,
      status: model.status,
      tags: model.tags,
    }));

    res.json({
      success: true,
      data: modelInfo,
      total: models.length,
    });
  } catch (error) {
    logger.error('Failed to fetch AI models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI models',
    });
  }
}

/**
 * GET /api/chat/metrics
 * Get AI usage metrics
 */
export async function getMetrics(_req: Request, res: Response): Promise<void> {
  try {
    const llmService = getLLMService();
    const metrics = llmService.getMetrics();

    res.json({
      success: true,
      data: metrics,
      total: metrics.length,
    });
  } catch (error) {
    logger.error('Failed to fetch AI metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI metrics',
    });
  }
}

/**
 * GET /api/chat/health
 * Health check for chat service
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  try {
    const dbAvailable = await isDatabaseAvailable();
    const cacheHealth = typeof (cacheService as any).healthCheck === 'function' ? await (cacheService as any).healthCheck() : { status: 'unknown' };

    // Check AI service health
    const llmService = getLLMService();
    const providers = llmService.getProviders();
    const activeProviders = providers.filter((p) => p.status === 'active');
    const aiHealthy = activeProviders.length > 0;

    res.json({
      success: true,
      status:
        dbAvailable && cacheHealth.status === 'healthy' && aiHealthy ? 'healthy' : 'degraded',
      database: dbAvailable,
      cache: cacheHealth.status,
      ai: {
        healthy: aiHealthy,
        providers: providers.length,
        activeProviders: activeProviders.length,
        models: llmService.getAvailableModels().length,
      },
      fallback: {
        configs: fallbackChatConfigs.size,
        sessions: fallbackChatSessions.size,
        messages: Array.from(fallbackChatMessages.values()).reduce(
          (sum, msgs) => sum + msgs.length,
          0
        ),
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
}
