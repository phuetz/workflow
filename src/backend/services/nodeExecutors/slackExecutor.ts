/**
 * Slack Node Executor
 * Real integration with Slack Web API
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import axios from 'axios';
import { logger } from '../../../services/SimpleLogger';

const SLACK_API = 'https://slack.com/api';

async function slackApi(
  method: string,
  botToken: string,
  data?: Record<string, unknown>
): Promise<any> {
  const response = await axios.post(`${SLACK_API}/${method}`, data, {
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    timeout: 30000,
  });

  if (!response.data.ok) {
    throw new Error(`Slack API error: ${response.data.error}`);
  }

  return response.data;
}

export const slackExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    const botToken = credentials.botToken || credentials.token || credentials.apiKey;
    if (!botToken) {
      throw new Error('Slack bot token is required (provide via credentials)');
    }

    const operation = (config.operation || 'sendMessage') as string;

    logger.info('Executing Slack operation', { operation });

    try {
      let result: any;

      switch (operation) {
        case 'sendMessage': {
          const channel = config.channel as string;
          const text = config.text as string;
          const blocks = config.blocks as unknown[] | undefined;
          if (!channel) throw new Error('Channel is required');
          if (!text && !blocks) throw new Error('Text or blocks is required');
          result = await slackApi('chat.postMessage', botToken, {
            channel,
            text,
            ...(blocks ? { blocks } : {}),
          });
          break;
        }

        case 'updateMessage': {
          const channel = config.channel as string;
          const ts = config.ts as string;
          const text = config.text as string;
          if (!channel || !ts) throw new Error('Channel and message ts are required');
          result = await slackApi('chat.update', botToken, { channel, ts, text });
          break;
        }

        case 'uploadFile': {
          const channels = config.channels as string;
          const content = config.content as string;
          const filename = config.filename as string;
          const title = config.title as string | undefined;
          if (!content) throw new Error('File content is required');
          result = await slackApi('files.upload', botToken, {
            channels,
            content,
            filename: filename || 'file.txt',
            title,
          });
          break;
        }

        case 'listChannels': {
          const types = (config.types || 'public_channel') as string;
          result = await slackApi('conversations.list', botToken, {
            types,
            limit: config.limit || 100,
          });
          break;
        }

        case 'setTopic': {
          const channel = config.channel as string;
          const topic = config.topic as string;
          if (!channel || !topic) throw new Error('Channel and topic are required');
          result = await slackApi('conversations.setTopic', botToken, { channel, topic });
          break;
        }

        case 'addReaction': {
          const channel = config.channel as string;
          const timestamp = config.timestamp as string;
          const name = config.name as string;
          if (!channel || !timestamp || !name) throw new Error('Channel, timestamp, and reaction name are required');
          result = await slackApi('reactions.add', botToken, { channel, timestamp, name });
          break;
        }

        default:
          throw new Error(`Unknown Slack operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Slack API error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  },
};
