/**
 * Config Handlers
 * Route handlers for chat configuration CRUD operations
 */

import type { Request, Response } from 'express';
import { logger } from '../../../../services/SimpleLogger';
import {
  getAllChatConfigs,
  getChatConfig,
  storeChatConfig,
  updateChatConfig,
  deleteChatConfig,
} from './storage';

/**
 * GET /api/chat
 * List all chat configurations
 */
export async function listConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const configs = await getAllChatConfigs();
    res.json({
      success: true,
      data: configs,
      total: configs.length,
    });
  } catch (error) {
    logger.error('Failed to fetch chat configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat configurations',
    });
  }
}

/**
 * GET /api/chat/:chatId
 * Get chat configuration by ID
 */
export async function getConfig(req: Request, res: Response): Promise<void> {
  try {
    const { chatId } = req.params;
    const config = await getChatConfig(chatId);

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'Chat configuration not found',
      });
      return;
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to fetch chat configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat configuration',
    });
  }
}

/**
 * POST /api/chat
 * Create a new chat configuration
 */
export async function createConfig(req: Request, res: Response): Promise<void> {
  try {
    const chatConfig = req.body;
    const config = await storeChatConfig(chatConfig);

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Failed to create chat configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat configuration',
    });
  }
}

/**
 * PUT /api/chat/:chatId
 * Update chat configuration
 */
export async function updateConfig(req: Request, res: Response): Promise<void> {
  try {
    const { chatId } = req.params;
    const updates = req.body;

    const updatedConfig = await updateChatConfig(chatId, updates);

    if (!updatedConfig) {
      res.status(404).json({
        success: false,
        error: 'Chat configuration not found',
      });
      return;
    }

    res.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    logger.error('Failed to update chat configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update chat configuration',
    });
  }
}

/**
 * DELETE /api/chat/:chatId
 * Delete a chat configuration
 */
export async function deleteConfig(req: Request, res: Response): Promise<void> {
  try {
    const { chatId } = req.params;

    const existing = await getChatConfig(chatId);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Chat configuration not found',
      });
      return;
    }

    await deleteChatConfig(chatId);

    res.json({
      success: true,
      message: 'Chat configuration deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete chat configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat configuration',
    });
  }
}
