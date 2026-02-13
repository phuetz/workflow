/**
 * Slack Integration Service
 * Complete Slack Web API integration for n8n parity
 */

import { logger } from '../services/SimpleLogger';
import { integrationRateLimiter } from '../backend/security/RateLimitService';

export interface SlackCredentials {
  botToken: string;
  signingSecret?: string;
  appToken?: string; // For Socket Mode
}

export interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  reply_broadcast?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  mrkdwn?: boolean;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'image' | 'actions' | 'context' | 'header' | 'input';
  text?: { type: 'plain_text' | 'mrkdwn'; text: string };
  block_id?: string;
  accessory?: unknown;
  elements?: unknown[];
  fields?: Array<{ type: string; text: string }>;
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  text?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_member: boolean;
  num_members?: number;
  topic?: { value: string };
  purpose?: { value: string };
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
  is_admin: boolean;
  is_bot: boolean;
  profile: {
    display_name: string;
    status_text: string;
    status_emoji: string;
    image_72: string;
  };
}

export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  size: number;
  url_private: string;
  url_private_download: string;
  permalink: string;
}

interface SlackApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
  };
  [key: string]: unknown;
}

export class SlackIntegration {
  private credentials: SlackCredentials;
  private baseUrl = 'https://slack.com/api';

  constructor(credentials: SlackCredentials) {
    this.credentials = credentials;
    logger.info('SlackIntegration initialized');
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(message: SlackMessage): Promise<{ ts: string; channel: string }> {
    await this.checkRateLimit('slack');

    const response = await this.apiCall<{ ts: string; channel: string }>('chat.postMessage', {
      ...message,
      as_user: true
    });

    logger.debug('Slack message sent', { channel: message.channel, ts: response.ts });
    return response;
  }

  /**
   * Update an existing message
   */
  async updateMessage(channel: string, ts: string, message: Partial<SlackMessage>): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('chat.update', {
      channel,
      ts,
      ...message
    });

    logger.debug('Slack message updated', { channel, ts });
  }

  /**
   * Delete a message
   */
  async deleteMessage(channel: string, ts: string): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('chat.delete', { channel, ts });
    logger.debug('Slack message deleted', { channel, ts });
  }

  /**
   * React to a message with an emoji
   */
  async addReaction(channel: string, ts: string, emoji: string): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('reactions.add', {
      channel,
      timestamp: ts,
      name: emoji.replace(/:/g, '')
    });
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(channel: string, ts: string, emoji: string): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('reactions.remove', {
      channel,
      timestamp: ts,
      name: emoji.replace(/:/g, '')
    });
  }

  /**
   * Get channel list
   */
  async getChannels(options: {
    types?: string;
    limit?: number;
    cursor?: string;
  } = {}): Promise<{ channels: SlackChannel[]; nextCursor?: string }> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{ channels: SlackChannel[] }>('conversations.list', {
      types: options.types || 'public_channel,private_channel',
      limit: options.limit || 100,
      cursor: options.cursor,
      exclude_archived: true
    });

    return {
      channels: response.channels,
      nextCursor: (response as unknown as SlackApiResponse).response_metadata?.next_cursor
    };
  }

  /**
   * Get channel info
   */
  async getChannelInfo(channelId: string): Promise<SlackChannel> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{ channel: SlackChannel }>('conversations.info', {
      channel: channelId
    });

    return response.channel;
  }

  /**
   * Get channel members
   */
  async getChannelMembers(channelId: string, limit = 100): Promise<string[]> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{ members: string[] }>('conversations.members', {
      channel: channelId,
      limit
    });

    return response.members;
  }

  /**
   * Create a channel
   */
  async createChannel(name: string, isPrivate = false): Promise<SlackChannel> {
    await this.checkRateLimit('slack');

    const response = await this.apiCall<{ channel: SlackChannel }>('conversations.create', {
      name,
      is_private: isPrivate
    });

    logger.info('Slack channel created', { name, id: response.channel.id });
    return response.channel;
  }

  /**
   * Archive a channel
   */
  async archiveChannel(channelId: string): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('conversations.archive', { channel: channelId });
    logger.info('Slack channel archived', { channelId });
  }

  /**
   * Invite user to channel
   */
  async inviteToChannel(channelId: string, userIds: string[]): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('conversations.invite', {
      channel: channelId,
      users: userIds.join(',')
    });
  }

  /**
   * Set channel topic
   */
  async setChannelTopic(channelId: string, topic: string): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('conversations.setTopic', {
      channel: channelId,
      topic
    });
  }

  /**
   * Get user list
   */
  async getUsers(options: {
    limit?: number;
    cursor?: string;
  } = {}): Promise<{ users: SlackUser[]; nextCursor?: string }> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{ members: SlackUser[] }>('users.list', {
      limit: options.limit || 100,
      cursor: options.cursor
    });

    return {
      users: response.members,
      nextCursor: (response as unknown as SlackApiResponse).response_metadata?.next_cursor
    };
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<SlackUser> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{ user: SlackUser }>('users.info', {
      user: userId
    });

    return response.user;
  }

  /**
   * Look up user by email
   */
  async getUserByEmail(email: string): Promise<SlackUser> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{ user: SlackUser }>('users.lookupByEmail', {
      email
    });

    return response.user;
  }

  /**
   * Set user status
   */
  async setUserStatus(statusText: string, statusEmoji: string, expiration?: number): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('users.profile.set', {
      profile: JSON.stringify({
        status_text: statusText,
        status_emoji: statusEmoji,
        status_expiration: expiration || 0
      })
    });
  }

  /**
   * Upload a file
   */
  async uploadFile(options: {
    channels?: string;
    content?: string;
    file?: Buffer;
    filename?: string;
    title?: string;
    initial_comment?: string;
    thread_ts?: string;
  }): Promise<SlackFile> {
    await this.checkRateLimit('slack');

    const formData = new FormData();

    if (options.content) {
      formData.append('content', options.content);
    }
    if (options.file) {
      formData.append('file', new Blob([new Uint8Array(options.file)]), options.filename || 'file');
    }
    if (options.channels) formData.append('channels', options.channels);
    if (options.filename) formData.append('filename', options.filename);
    if (options.title) formData.append('title', options.title);
    if (options.initial_comment) formData.append('initial_comment', options.initial_comment);
    if (options.thread_ts) formData.append('thread_ts', options.thread_ts);

    const response = await fetch(`${this.baseUrl}/files.upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.botToken}`
      },
      body: formData
    });

    const data = await response.json() as SlackApiResponse<{ file: SlackFile }>;

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    logger.debug('File uploaded to Slack', { filename: options.filename });
    return data.file as SlackFile;
  }

  /**
   * Get file info
   */
  async getFileInfo(fileId: string): Promise<SlackFile> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{ file: SlackFile }>('files.info', {
      file: fileId
    });

    return response.file;
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('files.delete', { file: fileId });
    logger.debug('Slack file deleted', { fileId });
  }

  /**
   * Open a modal/view
   */
  async openModal(triggerId: string, view: unknown): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('views.open', {
      trigger_id: triggerId,
      view: JSON.stringify(view)
    });
  }

  /**
   * Update a modal/view
   */
  async updateModal(viewId: string, view: unknown): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('views.update', {
      view_id: viewId,
      view: JSON.stringify(view)
    });
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, options: {
    sort?: 'score' | 'timestamp';
    sort_dir?: 'asc' | 'desc';
    count?: number;
    page?: number;
  } = {}): Promise<{ messages: unknown[]; total: number }> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{
      messages: { matches: unknown[]; total: number }
    }>('search.messages', {
      query,
      sort: options.sort || 'timestamp',
      sort_dir: options.sort_dir || 'desc',
      count: options.count || 20,
      page: options.page || 1
    });

    return {
      messages: response.messages.matches,
      total: response.messages.total
    };
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(channel: string, options: {
    limit?: number;
    oldest?: string;
    latest?: string;
    cursor?: string;
  } = {}): Promise<{ messages: unknown[]; nextCursor?: string }> {
    await this.checkRateLimit('slack:web_api');

    const response = await this.apiCall<{ messages: unknown[] }>('conversations.history', {
      channel,
      limit: options.limit || 100,
      oldest: options.oldest,
      latest: options.latest,
      cursor: options.cursor
    });

    return {
      messages: response.messages,
      nextCursor: (response as unknown as SlackApiResponse).response_metadata?.next_cursor
    };
  }

  /**
   * Post ephemeral message (only visible to one user)
   */
  async postEphemeral(channel: string, user: string, text: string, blocks?: SlackBlock[]): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('chat.postEphemeral', {
      channel,
      user,
      text,
      blocks: blocks ? JSON.stringify(blocks) : undefined
    });
  }

  /**
   * Schedule a message
   */
  async scheduleMessage(channel: string, postAt: number, text: string, blocks?: SlackBlock[]): Promise<{ scheduled_message_id: string }> {
    await this.checkRateLimit('slack');

    const response = await this.apiCall<{ scheduled_message_id: string }>('chat.scheduleMessage', {
      channel,
      post_at: postAt,
      text,
      blocks: blocks ? JSON.stringify(blocks) : undefined
    });

    return { scheduled_message_id: response.scheduled_message_id };
  }

  /**
   * Delete a scheduled message
   */
  async deleteScheduledMessage(channel: string, scheduledMessageId: string): Promise<void> {
    await this.checkRateLimit('slack');

    await this.apiCall('chat.deleteScheduledMessage', {
      channel,
      scheduled_message_id: scheduledMessageId
    });
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ ok: boolean; team: string; user: string }> {
    const response = await this.apiCall<{ team: string; user: string }>('auth.test', {});
    return { ok: true, team: response.team, user: response.user };
  }

  // Private methods

  private async apiCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}/${method}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.botToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(params)
    });

    const data = await response.json() as SlackApiResponse<T>;

    if (!data.ok) {
      logger.error('Slack API error', { method, error: data.error });
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data as unknown as T;
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const result = await integrationRateLimiter.checkIntegrationLimit(
      endpoint,
      'slack-integration'
    );

    if (!result.allowed) {
      const waitTime = result.retryAfter || 1;
      logger.warn('Slack rate limit hit, waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
  }
}

// Factory function
export function createSlackIntegration(credentials: SlackCredentials): SlackIntegration {
  return new SlackIntegration(credentials);
}

export default SlackIntegration;
