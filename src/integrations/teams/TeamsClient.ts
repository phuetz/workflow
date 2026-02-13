/**
 * Microsoft Teams API Client
 * PROJET SAUVÉ - Phase 6: Communication
 */

import type { TeamsCredentials, TeamsResponse, TeamsMessage, TeamsChannel } from './teams.types';

export class TeamsClient {
  private credentials: TeamsCredentials;
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(credentials: TeamsCredentials) {
    this.credentials = credentials;
  }

  async sendMessage(teamId: string, channelId: string, message: string): Promise<TeamsResponse> {
    return this.apiCall(`/teams/${teamId}/channels/${channelId}/messages`, 'POST', {
      body: {
        contentType: 'html',
        content: message,
      },
    });
  }

  async createChannel(teamId: string, name: string, description?: string): Promise<TeamsResponse<TeamsChannel>> {
    return this.apiCall(`/teams/${teamId}/channels`, 'POST', {
      displayName: name,
      description,
    });
  }

  async getTeamMembers(teamId: string): Promise<TeamsResponse> {
    return this.apiCall(`/teams/${teamId}/members`, 'GET');
  }

  async sendAdaptiveCard(teamId: string, channelId: string, card: unknown): Promise<TeamsResponse> {
    return this.apiCall(`/teams/${teamId}/channels/${channelId}/messages`, 'POST', {
      body: {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: JSON.stringify(card),
      },
    });
  }

  private async apiCall<T = unknown>(endpoint: string, method: string, body?: unknown): Promise<TeamsResponse<T>> {
    if (!this.credentials.accessToken) {
      return { ok: false, error: 'Access token not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        return { ok: false, error: error.message || 'API request failed' };
      }

      const data = await response.json();
      return { ok: true, data: data as T };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'API request failed' };
    }
  }
}

export function createTeamsClient(credentials: TeamsCredentials): TeamsClient {
  return new TeamsClient(credentials);
}
