/**
 * Discord Integration Types
 * PROJET SAUVÉ - Phase 6: Top 20 Integrations
 */

export interface DiscordCredentials {
  botToken?: string;
  webhookUrl?: string;
  applicationId?: string;
}

export type DiscordOperation =
  | 'sendMessage'
  | 'sendWebhook'
  | 'sendEmbed'
  | 'addReaction'
  | 'getServerInfo'
  | 'getChannels'
  | 'manageRoles'
  | 'sendDM'
  | 'editMessage'
  | 'deleteMessage'
  | 'createChannel';

export type DiscordResource =
  | 'message'
  | 'channel'
  | 'server'
  | 'user'
  | 'role'
  | 'webhook';

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
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
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

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  edited_timestamp?: string;
  embeds: DiscordEmbed[];
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    proxy_url: string;
    size: number;
  }>;
}

export interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  position?: number;
  name?: string;
  topic?: string;
  nsfw?: boolean;
  last_message_id?: string;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  parent_id?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  owner_id: string;
  region: string;
  afk_channel_id?: string;
  afk_timeout: number;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: DiscordRole[];
  emojis: DiscordEmoji[];
  features: string[];
  mfa_level: number;
  premium_tier: number;
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

export interface DiscordEmoji {
  id: string;
  name: string;
  roles?: string[];
  require_colons?: boolean;
  managed?: boolean;
  animated?: boolean;
  available?: boolean;
}

export interface DiscordOperationParams {
  operation: DiscordOperation;
  resource: DiscordResource;
  channelId?: string;
  content?: string;
  embed?: DiscordEmbed;
  messageId?: string;
  userId?: string;
  guildId?: string;
  roleName?: string;
  roleColor?: number;
  channelName?: string;
  channelType?: number;
  emoji?: string;
}

export interface DiscordResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: number;
  message?: string;
}

export interface DiscordWebhookMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  tts?: boolean;
  embeds?: DiscordEmbed[];
  allowed_mentions?: {
    parse?: string[];
    roles?: string[];
    users?: string[];
    replied_user?: boolean;
  };
}
