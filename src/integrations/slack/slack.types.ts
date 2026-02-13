/**
 * Slack Integration Types
 * PROJET SAUVÉ - Phase 6: Top 20 Integrations
 */

export interface SlackCredentials {
  botToken?: string;
  appToken?: string;
  webhookUrl?: string;
  accessToken?: string;
  signingSecret?: string;
}

export type SlackOperation =
  | 'sendMessage'
  | 'sendDirectMessage'
  | 'uploadFile'
  | 'getChannels'
  | 'getUserInfo'
  | 'createChannel'
  | 'archiveChannel'
  | 'addReaction'
  | 'updateMessage'
  | 'deleteMessage'
  | 'getConversationHistory'
  | 'inviteToChannel';

export type SlackResource =
  | 'message'
  | 'channel'
  | 'user'
  | 'file'
  | 'reaction'
  | 'conversation';

export interface SlackMessageOptions {
  channel: string;
  text?: string;
  blocks?: unknown[];
  attachments?: unknown[];
  thread_ts?: string;
  reply_broadcast?: boolean;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  is_member: boolean;
  num_members?: number;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
}

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  profile: {
    real_name: string;
    display_name: string;
    email?: string;
    image_24?: string;
    image_32?: string;
    image_48?: string;
    image_72?: string;
    image_192?: string;
    image_512?: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
}

export interface SlackFile {
  id: string;
  created: number;
  timestamp: number;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  size: number;
  url_private: string;
  url_private_download: string;
  permalink: string;
  user: string;
}

export interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  channel?: string;
  attachments?: unknown[];
  blocks?: unknown[];
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
}

export interface SlackOperationParams {
  operation: SlackOperation;
  resource: SlackResource;
  channelId?: string;
  userId?: string;
  text?: string;
  message?: SlackMessageOptions;
  file?: {
    content: string | Buffer;
    filename: string;
    channels?: string;
    title?: string;
    initial_comment?: string;
  };
  channelName?: string;
  timestamp?: string;
  reaction?: string;
  limit?: number;
  cursor?: string;
}

export interface SlackResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
  warning?: string;
  response_metadata?: {
    next_cursor?: string;
  };
}

export interface SlackApiError {
  ok: false;
  error: string;
  needed?: string;
  provided?: string;
}

// Block Kit Types (simplified)
export interface SlackBlock {
  type: string;
  block_id?: string;
  [key: string]: unknown;
}

export interface SlackSectionBlock extends SlackBlock {
  type: 'section';
  text: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  accessory?: unknown;
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
}

export interface SlackActionsBlock extends SlackBlock {
  type: 'actions';
  elements: unknown[];
}

export interface SlackDividerBlock extends SlackBlock {
  type: 'divider';
}

export interface SlackHeaderBlock extends SlackBlock {
  type: 'header';
  text: {
    type: 'plain_text';
    text: string;
    emoji?: boolean;
  };
}

// Webhook types
export interface SlackWebhookMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: unknown[];
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  channel?: string;
}

export interface SlackConversationHistoryResponse {
  ok: boolean;
  messages: SlackMessage[];
  has_more: boolean;
  pin_count?: number;
  response_metadata?: {
    next_cursor: string;
  };
}

export interface SlackChannelsListResponse {
  ok: boolean;
  channels: SlackChannel[];
  response_metadata?: {
    next_cursor: string;
  };
}
