/**
 * Discord Integration Service
 * Complete Discord API integration for n8n parity
 */

import { logger } from '../services/SimpleLogger';
import { integrationRateLimiter } from '../backend/security/RateLimitService';

export interface DiscordCredentials {
  botToken: string;
  applicationId?: string;
  publicKey?: string;
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  tts?: boolean;
  components?: DiscordComponent[];
  allowed_mentions?: {
    parse?: ('users' | 'roles' | 'everyone')[];
    users?: string[];
    roles?: string[];
    replied_user?: boolean;
  };
  message_reference?: {
    message_id: string;
    channel_id?: string;
    guild_id?: string;
  };
  files?: DiscordFile[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordComponent {
  type: 1 | 2 | 3 | 4 | 5; // ActionRow, Button, SelectMenu, TextInput, UserSelect
  components?: DiscordComponent[];
  style?: 1 | 2 | 3 | 4 | 5; // Primary, Secondary, Success, Danger, Link
  label?: string;
  emoji?: { name: string; id?: string };
  custom_id?: string;
  url?: string;
  disabled?: boolean;
  options?: Array<{
    label: string;
    value: string;
    description?: string;
    emoji?: { name: string; id?: string };
    default?: boolean;
  }>;
  placeholder?: string;
  min_values?: number;
  max_values?: number;
}

export interface DiscordFile {
  name: string;
  data: Buffer | string;
  contentType?: string;
}

export interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  name?: string;
  topic?: string;
  position?: number;
  nsfw?: boolean;
  last_message_id?: string;
  parent_id?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner_id: string;
  member_count?: number;
  description?: string;
  features: string[];
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  email?: string;
  global_name?: string;
}

export interface DiscordMember {
  user: DiscordUser;
  nick?: string;
  roles: string[];
  joined_at: string;
  premium_since?: string;
  deaf: boolean;
  mute: boolean;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

export class DiscordIntegration {
  private credentials: DiscordCredentials;
  private baseUrl = 'https://discord.com/api/v10';

  constructor(credentials: DiscordCredentials) {
    this.credentials = credentials;
    logger.info('DiscordIntegration initialized');
  }

  // === MESSAGE OPERATIONS ===

  /**
   * Send a message to a channel
   */
  async sendMessage(channelId: string, message: DiscordMessage): Promise<{ id: string; channel_id: string }> {
    await this.checkRateLimit('discord:messages');

    const response = await this.apiCall<{ id: string; channel_id: string }>(
      'POST',
      `/channels/${channelId}/messages`,
      message
    );

    logger.debug('Discord message sent', { channelId, messageId: response.id });
    return response;
  }

  /**
   * Edit a message
   */
  async editMessage(channelId: string, messageId: string, message: Partial<DiscordMessage>): Promise<void> {
    await this.checkRateLimit('discord:messages');

    await this.apiCall('PATCH', `/channels/${channelId}/messages/${messageId}`, message);
    logger.debug('Discord message edited', { channelId, messageId });
  }

  /**
   * Delete a message
   */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await this.checkRateLimit('discord:messages');

    await this.apiCall('DELETE', `/channels/${channelId}/messages/${messageId}`);
    logger.debug('Discord message deleted', { channelId, messageId });
  }

  /**
   * Bulk delete messages (2-100 messages, not older than 14 days)
   */
  async bulkDeleteMessages(channelId: string, messageIds: string[]): Promise<void> {
    await this.checkRateLimit('discord');

    if (messageIds.length < 2 || messageIds.length > 100) {
      throw new Error('Bulk delete requires 2-100 message IDs');
    }

    await this.apiCall('POST', `/channels/${channelId}/messages/bulk-delete`, {
      messages: messageIds
    });

    logger.debug('Discord messages bulk deleted', { channelId, count: messageIds.length });
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    await this.checkRateLimit('discord');

    const encodedEmoji = encodeURIComponent(emoji);
    await this.apiCall('PUT', `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`);
  }

  /**
   * Remove a reaction
   */
  async removeReaction(channelId: string, messageId: string, emoji: string, userId = '@me'): Promise<void> {
    await this.checkRateLimit('discord');

    const encodedEmoji = encodeURIComponent(emoji);
    await this.apiCall('DELETE', `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/${userId}`);
  }

  /**
   * Get channel messages
   */
  async getMessages(channelId: string, options: {
    limit?: number;
    before?: string;
    after?: string;
    around?: string;
  } = {}): Promise<Array<{ id: string; content: string; author: DiscordUser }>> {
    await this.checkRateLimit('discord');

    const params = new URLSearchParams();
    if (options.limit) params.append('limit', String(options.limit));
    if (options.before) params.append('before', options.before);
    if (options.after) params.append('after', options.after);
    if (options.around) params.append('around', options.around);

    return this.apiCall('GET', `/channels/${channelId}/messages?${params.toString()}`);
  }

  /**
   * Pin a message
   */
  async pinMessage(channelId: string, messageId: string): Promise<void> {
    await this.checkRateLimit('discord');

    await this.apiCall('PUT', `/channels/${channelId}/pins/${messageId}`);
  }

  /**
   * Unpin a message
   */
  async unpinMessage(channelId: string, messageId: string): Promise<void> {
    await this.checkRateLimit('discord');

    await this.apiCall('DELETE', `/channels/${channelId}/pins/${messageId}`);
  }

  // === CHANNEL OPERATIONS ===

  /**
   * Get channel info
   */
  async getChannel(channelId: string): Promise<DiscordChannel> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordChannel>('GET', `/channels/${channelId}`);
  }

  /**
   * Create a channel in a guild
   */
  async createChannel(guildId: string, options: {
    name: string;
    type?: number; // 0: text, 2: voice, 4: category, 5: announcement, 13: stage, 15: forum
    topic?: string;
    parent_id?: string;
    nsfw?: boolean;
    position?: number;
  }): Promise<DiscordChannel> {
    await this.checkRateLimit('discord');

    const channel = await this.apiCall<DiscordChannel>('POST', `/guilds/${guildId}/channels`, options);
    logger.info('Discord channel created', { guildId, channelId: channel.id, name: options.name });
    return channel;
  }

  /**
   * Edit a channel
   */
  async editChannel(channelId: string, options: {
    name?: string;
    topic?: string;
    nsfw?: boolean;
    position?: number;
    parent_id?: string;
  }): Promise<DiscordChannel> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordChannel>('PATCH', `/channels/${channelId}`, options);
  }

  /**
   * Delete a channel
   */
  async deleteChannel(channelId: string): Promise<void> {
    await this.checkRateLimit('discord');

    await this.apiCall('DELETE', `/channels/${channelId}`);
    logger.info('Discord channel deleted', { channelId });
  }

  /**
   * Get guild channels
   */
  async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordChannel[]>('GET', `/guilds/${guildId}/channels`);
  }

  // === GUILD (SERVER) OPERATIONS ===

  /**
   * Get guild info
   */
  async getGuild(guildId: string): Promise<DiscordGuild> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordGuild>('GET', `/guilds/${guildId}`);
  }

  /**
   * Get all guilds the bot is in
   */
  async getGuilds(): Promise<DiscordGuild[]> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordGuild[]>('GET', '/users/@me/guilds');
  }

  /**
   * Get guild members
   */
  async getGuildMembers(guildId: string, options: {
    limit?: number;
    after?: string;
  } = {}): Promise<DiscordMember[]> {
    await this.checkRateLimit('discord');

    const params = new URLSearchParams();
    if (options.limit) params.append('limit', String(options.limit));
    if (options.after) params.append('after', options.after);

    return this.apiCall<DiscordMember[]>('GET', `/guilds/${guildId}/members?${params.toString()}`);
  }

  /**
   * Get a specific guild member
   */
  async getGuildMember(guildId: string, userId: string): Promise<DiscordMember> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordMember>('GET', `/guilds/${guildId}/members/${userId}`);
  }

  /**
   * Search guild members
   */
  async searchGuildMembers(guildId: string, query: string, limit = 10): Promise<DiscordMember[]> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordMember[]>(
      'GET',
      `/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  /**
   * Kick a member from a guild
   */
  async kickMember(guildId: string, userId: string, reason?: string): Promise<void> {
    await this.checkRateLimit('discord');

    const headers: Record<string, string> = {};
    if (reason) headers['X-Audit-Log-Reason'] = reason;

    await this.apiCall('DELETE', `/guilds/${guildId}/members/${userId}`, undefined, headers);
    logger.info('Discord member kicked', { guildId, userId });
  }

  /**
   * Ban a member from a guild
   */
  async banMember(guildId: string, userId: string, options?: {
    delete_message_days?: number;
    reason?: string;
  }): Promise<void> {
    await this.checkRateLimit('discord');

    const headers: Record<string, string> = {};
    if (options?.reason) headers['X-Audit-Log-Reason'] = options.reason;

    await this.apiCall('PUT', `/guilds/${guildId}/bans/${userId}`, {
      delete_message_days: options?.delete_message_days || 0
    }, headers);

    logger.info('Discord member banned', { guildId, userId });
  }

  /**
   * Unban a member
   */
  async unbanMember(guildId: string, userId: string): Promise<void> {
    await this.checkRateLimit('discord');

    await this.apiCall('DELETE', `/guilds/${guildId}/bans/${userId}`);
    logger.info('Discord member unbanned', { guildId, userId });
  }

  // === ROLE OPERATIONS ===

  /**
   * Get guild roles
   */
  async getGuildRoles(guildId: string): Promise<DiscordRole[]> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordRole[]>('GET', `/guilds/${guildId}/roles`);
  }

  /**
   * Create a role
   */
  async createRole(guildId: string, options: {
    name?: string;
    color?: number;
    hoist?: boolean;
    mentionable?: boolean;
    permissions?: string;
  }): Promise<DiscordRole> {
    await this.checkRateLimit('discord');

    const role = await this.apiCall<DiscordRole>('POST', `/guilds/${guildId}/roles`, options);
    logger.info('Discord role created', { guildId, roleId: role.id, name: options.name });
    return role;
  }

  /**
   * Add role to member
   */
  async addRoleToMember(guildId: string, userId: string, roleId: string): Promise<void> {
    await this.checkRateLimit('discord');

    await this.apiCall('PUT', `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
  }

  /**
   * Remove role from member
   */
  async removeRoleFromMember(guildId: string, userId: string, roleId: string): Promise<void> {
    await this.checkRateLimit('discord');

    await this.apiCall('DELETE', `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
  }

  // === USER OPERATIONS ===

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<DiscordUser> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordUser>('GET', '/users/@me');
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<DiscordUser> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordUser>('GET', `/users/${userId}`);
  }

  /**
   * Create a DM channel with a user
   */
  async createDM(userId: string): Promise<DiscordChannel> {
    await this.checkRateLimit('discord');

    return this.apiCall<DiscordChannel>('POST', '/users/@me/channels', {
      recipient_id: userId
    });
  }

  /**
   * Send a DM to a user
   */
  async sendDM(userId: string, message: DiscordMessage): Promise<{ id: string; channel_id: string }> {
    const channel = await this.createDM(userId);
    return this.sendMessage(channel.id, message);
  }

  // === WEBHOOK OPERATIONS ===

  /**
   * Execute a webhook
   */
  async executeWebhook(webhookId: string, webhookToken: string, message: DiscordMessage & {
    username?: string;
    avatar_url?: string;
    wait?: boolean;
  }): Promise<{ id: string } | void> {
    await this.checkRateLimit('discord');

    const params = message.wait ? '?wait=true' : '';
    const response = await fetch(`${this.baseUrl}/webhooks/${webhookId}/${webhookToken}${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Discord API error: ${JSON.stringify(error)}`);
    }

    if (message.wait) {
      return response.json() as Promise<{ id: string }>;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ ok: boolean; user: DiscordUser }> {
    const user = await this.getCurrentUser();
    return { ok: true, user };
  }

  // Private methods

  private async apiCall<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bot ${this.credentials.botToken}`,
      ...additionalHeaders
    };

    if (body && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Discord API error', { method, endpoint, status: response.status, error: errorData });
      throw new Error(`Discord API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const result = await integrationRateLimiter.checkIntegrationLimit(
      endpoint,
      'discord-integration'
    );

    if (!result.allowed) {
      const waitTime = result.retryAfter || 1;
      logger.warn('Discord rate limit hit, waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
  }
}

// Factory function
export function createDiscordIntegration(credentials: DiscordCredentials): DiscordIntegration {
  return new DiscordIntegration(credentials);
}

export default DiscordIntegration;
