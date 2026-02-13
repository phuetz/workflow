/**
 * Discord API Client
 * PROJET SAUVÉ - Phase 6: Top 20 Integrations
 */

import type {
  DiscordCredentials,
  DiscordOperationParams,
  DiscordResponse,
  DiscordEmbed,
  DiscordWebhookMessage,
  DiscordMessage,
  DiscordChannel,
  DiscordGuild,
} from './discord.types';

export class DiscordClient {
  private credentials: DiscordCredentials;
  private baseUrl = 'https://discord.com/api/v10';

  constructor(credentials: DiscordCredentials) {
    this.credentials = credentials;
  }

  /**
   * Execute a Discord operation
   */
  async executeOperation(params: DiscordOperationParams): Promise<DiscordResponse> {
    try {
      switch (params.operation) {
        case 'sendMessage':
          return await this.sendMessage(params.channelId!, params.content!, params.embed);

        case 'sendWebhook':
          return await this.sendWebhook({
            content: params.content,
            embeds: params.embed ? [params.embed] : undefined,
          });

        case 'sendEmbed':
          return await this.sendEmbed(params.channelId!, params.embed!);

        case 'addReaction':
          return await this.addReaction(params.channelId!, params.messageId!, params.emoji!);

        case 'getServerInfo':
          return await this.getServerInfo(params.guildId!);

        case 'getChannels':
          return await this.getChannels(params.guildId!);

        case 'sendDM':
          return await this.sendDM(params.userId!, params.content!);

        case 'editMessage':
          return await this.editMessage(params.channelId!, params.messageId!, params.content!);

        case 'deleteMessage':
          return await this.deleteMessage(params.channelId!, params.messageId!);

        case 'createChannel':
          return await this.createChannel(params.guildId!, params.channelName!, params.channelType);

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
  async sendMessage(
    channelId: string,
    content: string,
    embed?: DiscordEmbed
  ): Promise<DiscordResponse<DiscordMessage>> {
    return this.apiCall(`/channels/${channelId}/messages`, 'POST', {
      content,
      embeds: embed ? [embed] : undefined,
    });
  }

  /**
   * Send an embed to a channel
   */
  async sendEmbed(
    channelId: string,
    embed: DiscordEmbed
  ): Promise<DiscordResponse<DiscordMessage>> {
    return this.apiCall(`/channels/${channelId}/messages`, 'POST', {
      embeds: [embed],
    });
  }

  /**
   * Send message via webhook
   */
  async sendWebhook(message: DiscordWebhookMessage): Promise<DiscordResponse> {
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
        const error = await response.json();
        return {
          ok: false,
          error: error.message || 'Webhook request failed',
        };
      }

      // Discord webhooks return 204 No Content on success
      return {
        ok: true,
        data: { message: 'Webhook sent successfully' },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Webhook request failed',
      };
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<DiscordResponse> {
    // Encode emoji for URL
    const encodedEmoji = encodeURIComponent(emoji);

    return this.apiCall(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
      'PUT'
    );
  }

  /**
   * Get server (guild) information
   */
  async getServerInfo(guildId: string): Promise<DiscordResponse<DiscordGuild>> {
    return this.apiCall(`/guilds/${guildId}`, 'GET');
  }

  /**
   * Get list of channels in a server
   */
  async getChannels(guildId: string): Promise<DiscordResponse<DiscordChannel[]>> {
    return this.apiCall(`/guilds/${guildId}/channels`, 'GET');
  }

  /**
   * Send a direct message to a user
   */
  async sendDM(userId: string, content: string): Promise<DiscordResponse<DiscordMessage>> {
    // First, create a DM channel
    const dmChannel = await this.apiCall<DiscordChannel>('/users/@me/channels', 'POST', {
      recipient_id: userId,
    });

    if (!dmChannel.ok || !dmChannel.data) {
      return {
        ok: false,
        error: 'Failed to create DM channel',
      };
    }

    // Then send the message
    return this.sendMessage(dmChannel.data.id, content);
  }

  /**
   * Edit a message
   */
  async editMessage(
    channelId: string,
    messageId: string,
    content: string
  ): Promise<DiscordResponse<DiscordMessage>> {
    return this.apiCall(`/channels/${channelId}/messages/${messageId}`, 'PATCH', {
      content,
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(channelId: string, messageId: string): Promise<DiscordResponse> {
    return this.apiCall(`/channels/${channelId}/messages/${messageId}`, 'DELETE');
  }

  /**
   * Create a channel in a server
   */
  async createChannel(
    guildId: string,
    name: string,
    type?: number
  ): Promise<DiscordResponse<DiscordChannel>> {
    return this.apiCall(`/guilds/${guildId}/channels`, 'POST', {
      name,
      type: type ?? 0, // 0 = text channel, 2 = voice channel
    });
  }

  /**
   * Make an API call to Discord
   */
  private async apiCall<T = unknown>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<DiscordResponse<T>> {
    if (!this.credentials.botToken) {
      return {
        ok: false,
        error: 'Bot token not configured',
      };
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;

      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bot ${this.credentials.botToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {
          ok: true,
          data: undefined as T,
        };
      }

      const json = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          error: json.message || 'Discord API request failed',
          code: json.code,
        };
      }

      return {
        ok: true,
        data: json as T,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Discord API request failed',
      };
    }
  }
}

/**
 * Factory function to create Discord client
 */
export function createDiscordClient(credentials: DiscordCredentials): DiscordClient {
  return new DiscordClient(credentials);
}
