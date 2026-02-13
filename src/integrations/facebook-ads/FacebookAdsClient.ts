/**
 * Facebook Ads API Client
 * Implements advertising operations for Facebook Marketing API
 */

import type {
  FacebookAdsCredentials,
  FacebookAdsResponse,
  FacebookCampaign,
  FacebookAdSet,
  FacebookInsights
} from './facebook-ads.types';

export class FacebookAdsClient {
  private credentials: FacebookAdsCredentials;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(credentials: FacebookAdsCredentials) {
    this.credentials = credentials;
  }

  // Campaign Operations
  async createCampaign(campaign: Omit<FacebookCampaign, 'id' | 'created_time' | 'updated_time'>): Promise<FacebookAdsResponse<FacebookCampaign>> {
    return this.apiCall(`/${this.credentials.adAccountId}/campaigns`, 'POST', campaign);
  }

  async getCampaign(campaignId: string): Promise<FacebookAdsResponse<FacebookCampaign>> {
    return this.apiCall(`/${campaignId}`, 'GET');
  }

  async updateCampaign(campaignId: string, updates: Partial<FacebookCampaign>): Promise<FacebookAdsResponse<FacebookCampaign>> {
    return this.apiCall(`/${campaignId}`, 'POST', updates);
  }

  // Ad Set Operations
  async createAdSet(adSet: Omit<FacebookAdSet, 'id'>): Promise<FacebookAdsResponse<FacebookAdSet>> {
    return this.apiCall(`/${this.credentials.adAccountId}/adsets`, 'POST', adSet);
  }

  async getAdSet(adSetId: string): Promise<FacebookAdsResponse<FacebookAdSet>> {
    return this.apiCall(`/${adSetId}`, 'GET');
  }

  // Insights
  async getInsights(objectId: string, params?: { date_preset?: string; time_range?: { since: string; until: string } }): Promise<FacebookAdsResponse<FacebookInsights[]>> {
    const query = new URLSearchParams();
    if (params?.date_preset) query.append('date_preset', params.date_preset);
    if (params?.time_range) {
      query.append('time_range', JSON.stringify(params.time_range));
    }

    return this.apiCall(`/${objectId}/insights?${query.toString()}`, 'GET');
  }

  // Core API Call Method
  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<FacebookAdsResponse<T>> {
    if (!this.credentials.accessToken) {
      return { ok: false, error: 'Missing access token' };
    }

    try {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      url.searchParams.append('access_token', this.credentials.accessToken);

      // For POST requests, add body as form data
      let requestBody: string | undefined;
      if (body && method === 'POST') {
        const params = new URLSearchParams();
        Object.entries(body).forEach(([key, value]) => {
          params.append(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
        requestBody = params.toString();
      }

      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.error?.message || `Facebook Ads API error: ${response.status}`
        };
      }

      const data = await response.json();
      return { ok: true, data: data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }
}

export function createFacebookAdsClient(credentials: FacebookAdsCredentials): FacebookAdsClient {
  return new FacebookAdsClient(credentials);
}
