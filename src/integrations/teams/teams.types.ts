/**
 * Microsoft Teams Integration Types
 * PROJET SAUVÉ - Phase 6: Communication
 */

export interface TeamsCredentials {
  accessToken?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

export type TeamsOperation =
  | 'sendMessage'
  | 'createChannel'
  | 'getTeamMembers'
  | 'sendAdaptiveCard'
  | 'uploadFile'
  | 'getChatMessages';

export interface TeamsMessage {
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  from?: {
    user: {
      displayName: string;
      id: string;
    };
  };
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  email?: string;
  webUrl?: string;
}

export interface TeamsAdaptiveCard {
  type: 'AdaptiveCard';
  version: string;
  body: unknown[];
  actions?: unknown[];
}

export interface TeamsResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
