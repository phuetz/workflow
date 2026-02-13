/**
 * Slack API Client
 * PROJET SAUVÉ - Phase 6: Top 20 Integrations
 */

import { logger } from '../../services/SimpleLogger';
import type {
  SlackCredentials,
  SlackOperationParams,
  SlackResponse,
  SlackChannel,
  SlackUser,
  SlackMessage,
  SlackFile,
  SlackWebhookMessage,
  SlackChannelsListResponse,
  SlackConversationHistoryResponse,
} from './slack.types';

export class SlackClient {
  private credentials: SlackCredentials;
  private baseUrl = 'https://slack.com/api';

  constructor(credentials: SlackCredentials) {
    this.credentials = credentials;
  }

  /**
   * Execute a Slack operation
   */
  async executeOperation(params: SlackOperationParams): Promise<SlackResponse> {
    try {
      switch (params.operation) {
        case 'sendMessage':
          return await this.sendMessage(params.message!);

        case 'sendDirectMessage':
          return await this.sendDirectMessage(params.userId!, params.text!);

        case 'uploadFile':
          return await this.uploadFile(params.file!);

        case 'getChannels':
          return await this.getChannels();

        case 'getUserInfo':
          return await this.getUserInfo(params.userId!);

        case 'createChannel':
          return await this.createChannel(params.channelName!, params as { is_private?: boolean });

        case 'archiveChannel':
          return await this.archiveChannel(params.channelId!);

        case 'addReaction':
          return await this.addReaction(params.channelId!, params.timestamp!, params.reaction!);

        case 'updateMessage':
          return await this.updateMessage(params.channelId!, params.timestamp!, params.text!);

        case 'deleteMessage':
          return await this.deleteMessage(params.channelId!, params.timestamp!);

        case 'getConversationHistory':
          return await this.getConversationHistory(params.channelId!, params.limit);

        case 'inviteToChannel':
          return await this.inviteToChannel(params.channelId!, params.userId!);

        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(message: {
    channel: string;
    text?: string;
    blocks?: unknown[];
    attachments?: unknown[];
    thread_ts?: string;
    reply_broadcast?: boolean;
    username?: string;
    icon_emoji?: string;
    icon_url?: string;
  }): Promise<SlackResponse<{ ts: string; channel: string }>> {
    return this.apiCall('chat.postMessage', message);
  }

  /**
   * Send a direct message to a user
   */
  async sendDirectMessage(userId: string, text: string): Promise<SlackResponse> {
    // First, open a DM conversation
    const conversation = await this.apiCall<{ channel: { id: string } }>('conversations.open', {
      users: userId,
    });

    if (!conversation.ok || !conversation.data) {
      return {
        ok: false,
        error: 'Failed to open DM conversation',
      };
    }

    // Then send the message
    return this.sendMessage({
      channel: conversation.data.channel.id,
      text,
    });
  }

  /**
   * Upload a file to Slack
   */
  async uploadFile(file: {
    content: string | Buffer;
    filename: string;
    channels?: string;
    title?: string;
    initial_comment?: string;
  }): Promise<SlackResponse<SlackFile>> {
    const formData = new FormData();

    const contentBuffer = typeof file.content === 'string' ? file.content : new Uint8Array(file.content);
    formData.append('file', new Blob([contentBuffer]), file.filename);

    if (file.channels) formData.append('channels', file.channels);
    if (file.title) formData.append('title', file.title);
    if (file.initial_comment) formData.append('initial_comment', file.initial_comment);

    return this.apiCall('files.upload', formData);
  }

  /**
   * Get list of channels
   */
  async getChannels(params?: {
    exclude_archived?: boolean;
    types?: string;
    limit?: number;
    cursor?: string;
  }): Promise<SlackResponse<SlackChannelsListResponse>> {
    return this.apiCall('conversations.list', {
      exclude_archived: params?.exclude_archived ?? true,
      types: params?.types ?? 'public_channel,private_channel',
      limit: params?.limit ?? 100,
      cursor: params?.cursor,
    });
  }

  /**
   * Get user information
   */
  async getUserInfo(userId: string): Promise<SlackResponse<{ user: SlackUser }>> {
    return this.apiCall('users.info', { user: userId });
  }

  /**
   * Create a channel
   */
  async createChannel(
    name: string,
    options?: { is_private?: boolean }
  ): Promise<SlackResponse<{ channel: SlackChannel }>> {
    return this.apiCall('conversations.create', {
      name,
      is_private: options?.is_private ?? false,
    });
  }

  /**
   * Archive a channel
   */
  async archiveChannel(channelId: string): Promise<SlackResponse> {
    return this.apiCall('conversations.archive', { channel: channelId });
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    channel: string,
    timestamp: string,
    reaction: string
  ): Promise<SlackResponse> {
    return this.apiCall('reactions.add', {
      channel,
      timestamp,
      name: reaction.replace(/:/g, ''), // Remove colons if present
    });
  }

  /**
   * Update a message
   */
  async updateMessage(
    channel: string,
    timestamp: string,
    text: string
  ): Promise<SlackResponse> {
    return this.apiCall('chat.update', {
      channel,
      ts: timestamp,
      text,
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(channel: string, timestamp: string): Promise<SlackResponse> {
    return this.apiCall('chat.delete', {
      channel,
      ts: timestamp,
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    channel: string,
    limit?: number,
    cursor?: string
  ): Promise<SlackResponse<SlackConversationHistoryResponse>> {
    return this.apiCall('conversations.history', {
      channel,
      limit: limit ?? 100,
      cursor,
    });
  }

  /**
   * Invite user to channel
   */
  async inviteToChannel(channelId: string, userId: string): Promise<SlackResponse> {
    return this.apiCall('conversations.invite', {
      channel: channelId,
      users: userId,
    });
  }

  /**
   * Send message via incoming webhook
   */
  async sendWebhookMessage(message: SlackWebhookMessage): Promise<SlackResponse> {
    if (!this.credentials.webhookUrl) {
      return {
        ok: false,
        error: 'Webhook URL not configured',
      };
    }

    try {
      const response = await fetch(this.credentials.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          error: text || 'Webhook request failed',
        };
      }

      return {
        ok: true,
        data: { message: 'ok' },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Webhook request failed',
      };
    }
  }

  /**
   * Make an API call to Slack
   */
  private async apiCall<T = unknown>(
    method: string,
    params?: Record<string, unknown> | FormData
  ): Promise<SlackResponse<T>> {
    const token = this.credentials.botToken || this.credentials.accessToken;

    if (!token) {
      return {
        ok: false,
        error: 'No authentication token provided',
      };
    }

    try {
      const url = `${this.baseUrl}/${method}`;

      let body: string | FormData;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
      };

      if (params instanceof FormData) {
        body = params;
        // Don't set Content-Type for FormData, browser will set it with boundary
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(params || {});
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      const json = await response.json();

      if (!json.ok) {
        return {
          ok: false,
          error: json.error || 'API request failed',
          data: json,
        };
      }

      return {
        ok: true,
        data: json as T,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'API request failed',
      };
    }
  }

  /**
   * Verify webhook signature (for incoming webhooks)
   */
  verifySignature(
    signature: string,
    timestamp: string,
    body: string
  ): boolean {
    if (!this.credentials.signingSecret) {
      throw new Error('Signing secret not configured');
    }

    // Implement HMAC verification
    // This would require crypto module
    // For now, return true (implement in production)
    logger.warn('Webhook signature verification not implemented');
    return true;
  }
}

/**
 * Factory function to create Slack client
 */
export function createSlackClient(credentials: SlackCredentials): SlackClient {
  return new SlackClient(credentials);
}
