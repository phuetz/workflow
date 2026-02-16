/**
 * Discord Node Executor
 * Real integration with Discord REST API v10
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import axios, { AxiosError } from 'axios';
import { logger } from '../../../services/SimpleLogger';

const DISCORD_API = 'https://discord.com/api/v10';

async function discordApi(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  path: string,
  botToken: string,
  data?: unknown
): Promise<any> {
  const response = await axios({
    method,
    url: `${DISCORD_API}${path}`,
    data,
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Respect rate limits
  const remaining = response.headers['x-ratelimit-remaining'];
  const resetAfter = response.headers['x-ratelimit-reset-after'];
  if (remaining === '0' && resetAfter) {
    const waitMs = parseFloat(resetAfter) * 1000;
    logger.warn(`Discord rate limit hit, waiting ${waitMs}ms`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  return response.data;
}

export const discordExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    const botToken = credentials.botToken || credentials.token;
    if (!botToken) {
      throw new Error('Discord bot token is required (provide via credentials)');
    }

    const operation = (config.operation || 'sendMessage') as string;

    logger.info('Executing Discord operation', { operation });

    try {
      let result: any;

      switch (operation) {
        case 'sendMessage': {
          const channelId = config.channelId as string;
          const content = config.content as string;
          const embeds = config.embeds as unknown[] | undefined;
          if (!channelId) throw new Error('Channel ID is required');
          if (!content && !embeds) throw new Error('Content or embeds is required');
          result = await discordApi('POST', `/channels/${channelId}/messages`, botToken, {
            content,
            ...(embeds ? { embeds } : {}),
          });
          break;
        }

        case 'editMessage': {
          const channelId = config.channelId as string;
          const messageId = config.messageId as string;
          const content = config.content as string;
          if (!channelId || !messageId) throw new Error('Channel ID and message ID are required');
          result = await discordApi('PATCH', `/channels/${channelId}/messages/${messageId}`, botToken, {
            content,
          });
          break;
        }

        case 'deleteMessage': {
          const channelId = config.channelId as string;
          const messageId = config.messageId as string;
          if (!channelId || !messageId) throw new Error('Channel ID and message ID are required');
          await discordApi('DELETE', `/channels/${channelId}/messages/${messageId}`, botToken);
          result = { deleted: true, messageId };
          break;
        }

        case 'addReaction': {
          const channelId = config.channelId as string;
          const messageId = config.messageId as string;
          const emoji = config.emoji as string;
          if (!channelId || !messageId || !emoji) throw new Error('Channel ID, message ID, and emoji are required');
          const encodedEmoji = encodeURIComponent(emoji);
          await discordApi('PUT', `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`, botToken);
          result = { reacted: true, emoji };
          break;
        }

        default:
          throw new Error(`Unknown Discord operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status === 429) {
          const retryAfter = error.response?.data?.retry_after || 5;
          throw new Error(`Discord rate limited. Retry after ${retryAfter}s`);
        }
        throw new Error(`Discord API error (${status}): ${JSON.stringify(error.response?.data)}`);
      }
      throw error;
    }
  },
};
