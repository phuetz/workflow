/**
 * Google Analytics API Client
 * Implements analytics reporting for Google Analytics Reporting API v4
 */

import type {
  GoogleAnalyticsCredentials,
  GoogleAnalyticsResponse,
  GoogleAnalyticsReportRequest,
  GoogleAnalyticsReport
} from './google-analytics.types';

export class GoogleAnalyticsClient {
  private credentials: GoogleAnalyticsCredentials;
  private baseUrl = 'https://analyticsreporting.googleapis.com/v4';

  constructor(credentials: GoogleAnalyticsCredentials) {
    this.credentials = credentials;
  }

  async getReport(request: GoogleAnalyticsReportRequest): Promise<GoogleAnalyticsResponse<GoogleAnalyticsReport>> {
    return this.apiCall('/reports:batchGet', 'POST', {
      reportRequests: [request]
    });
  }

  async getRealtime(viewId: string, metrics: string[]): Promise<GoogleAnalyticsResponse> {
    return this.apiCall('/data/realtime', 'GET', {
      ids: `ga:${viewId}`,
      metrics: metrics.join(',')
    });
  }

  async trackEvent(data: {
    trackingId: string;
    clientId: string;
    eventCategory: string;
    eventAction: string;
    eventLabel?: string;
    eventValue?: number;
  }): Promise<GoogleAnalyticsResponse> {
    const params = new URLSearchParams({
      v: '1',
      tid: data.trackingId,
      cid: data.clientId,
      t: 'event',
      ec: data.eventCategory,
      ea: data.eventAction,
      ...(data.eventLabel && { el: data.eventLabel }),
      ...(data.eventValue && { ev: data.eventValue.toString() })
    });

    return fetch('https://www.google-analytics.com/collect', {
      method: 'POST',
      body: params
    }).then(() => ({ ok: true })).catch(error => ({
      ok: false,
      error: error instanceof Error ? error.message : 'Request failed'
    }));
  }

  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown
  ): Promise<GoogleAnalyticsResponse<T>> {
    if (!this.credentials.accessToken) {
      return { ok: false, error: 'Missing access token' };
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
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.error?.message || `Google Analytics API error: ${response.status}`
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

export function createGoogleAnalyticsClient(credentials: GoogleAnalyticsCredentials): GoogleAnalyticsClient {
  return new GoogleAnalyticsClient(credentials);
}
