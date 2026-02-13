/**
 * Calendly Service
 * Handles Calendly API operations with OAuth 2.0 or API token authentication
 */

import { logger } from '../../services/LoggingService';
import axios, { AxiosInstance } from 'axios';

interface CalendlyCredentials {
  apiToken?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  tokenExpiry?: number;
}

interface CalendlyEvent {
  uri: string;
  name: string;
  status: 'active' | 'canceled';
  startTime: string;
  endTime: string;
  location?: any;
  inviteesCounter: {
    total: number;
    active: number;
    limit: number;
  };
  eventMemberships?: any[];
  eventGuests?: any[];
}

interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  status: 'active' | 'canceled';
  timezone: string;
  event: string;
  questionsAndAnswers?: any[];
  tracking?: any;
  textReminderNumber?: string;
  rescheduled?: boolean;
  oldInvitee?: string;
  newInvitee?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
}

export class CalendlyService {
  private readonly baseURL = 'https://api.calendly.com';
  private readonly authURL = 'https://auth.calendly.com/oauth/token';

  private axiosInstance: AxiosInstance;
  private credentials: CalendlyCredentials;
  private useOAuth: boolean;

  constructor(credentials: CalendlyCredentials, useOAuth = false) {
    this.credentials = credentials;
    this.useOAuth = useOAuth;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.useOAuth) {
          await this.ensureValidToken();
          config.headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
        } else {
          config.headers['Authorization'] = `Bearer ${this.credentials.apiToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Ensure we have a valid OAuth access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.useOAuth) return;

    const now = Date.now();
    const expiry = this.credentials.tokenExpiry || 0;

    // Refresh if token expires in less than 5 minutes
    if (!this.credentials.accessToken || now >= expiry - 300000) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Refresh OAuth 2.0 access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      logger.info('Refreshing Calendly access token');

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken || '',
        client_id: this.credentials.clientId || '',
        client_secret: this.credentials.clientSecret || '',
      });

      const response = await axios.post(this.authURL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.credentials.accessToken = response.data.access_token;
      this.credentials.refreshToken = response.data.refresh_token;
      this.credentials.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      logger.info('Calendly access token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh Calendly access token:', error);
      throw new Error('Calendly authentication failed');
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<any> {
    try {
      logger.info('Fetching current Calendly user');

      const response = await this.axiosInstance.get('/users/me');

      return response.data.resource;
    } catch (error) {
      logger.error('Failed to fetch current user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user's event types
   */
  async getEventTypes(userUri: string, options?: {
    count?: number;
    pageToken?: string;
    sort?: string;
    active?: boolean;
  }): Promise<any> {
    try {
      logger.info('Fetching Calendly event types');

      const params: any = {
        user: userUri,
        count: options?.count || 20,
      };

      if (options?.pageToken) params.page_token = options.pageToken;
      if (options?.sort) params.sort = options.sort;
      if (options?.active !== undefined) params.active = options.active;

      const response = await this.axiosInstance.get('/event_types', { params });

      const eventTypes = response.data.collection || [];
      logger.info(`Found ${eventTypes.length} event types`);

      return {
        collection: eventTypes,
        pagination: response.data.pagination,
      };
    } catch (error) {
      logger.error('Failed to fetch event types:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get scheduled events
   */
  async getScheduledEvents(options: {
    user?: string;
    organization?: string;
    count?: number;
    pageToken?: string;
    sort?: string;
    status?: 'active' | 'canceled';
    minStartTime?: string;
    maxStartTime?: string;
  }): Promise<any> {
    try {
      logger.info('Fetching Calendly scheduled events');

      const params: any = {
        count: options.count || 20,
      };

      if (options.user) params.user = options.user;
      if (options.organization) params.organization = options.organization;
      if (options.pageToken) params.page_token = options.pageToken;
      if (options.sort) params.sort = options.sort;
      if (options.status) params.status = options.status;
      if (options.minStartTime) params.min_start_time = options.minStartTime;
      if (options.maxStartTime) params.max_start_time = options.maxStartTime;

      const response = await this.axiosInstance.get('/scheduled_events', { params });

      const events = response.data.collection || [];
      logger.info(`Found ${events.length} scheduled events`);

      return {
        collection: events,
        pagination: response.data.pagination,
      };
    } catch (error) {
      logger.error('Failed to fetch scheduled events:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get single scheduled event
   */
  async getScheduledEvent(eventUri: string): Promise<CalendlyEvent> {
    try {
      logger.info(`Fetching Calendly event ${eventUri}`);

      // Extract UUID from URI
      const uuid = eventUri.split('/').pop();

      const response = await this.axiosInstance.get(`/scheduled_events/${uuid}`);

      return response.data.resource;
    } catch (error) {
      logger.error(`Failed to fetch event:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get event invitees
   */
  async getEventInvitees(eventUri: string, options?: {
    count?: number;
    pageToken?: string;
    email?: string;
    status?: 'active' | 'canceled';
  }): Promise<any> {
    try {
      logger.info(`Fetching invitees for event ${eventUri}`);

      // Extract UUID from URI
      const uuid = eventUri.split('/').pop();

      const params: any = {
        count: options?.count || 100,
      };

      if (options?.pageToken) params.page_token = options.pageToken;
      if (options?.email) params.email = options.email;
      if (options?.status) params.status = options.status;

      const response = await this.axiosInstance.get(
        `/scheduled_events/${uuid}/invitees`,
        { params }
      );

      const invitees = response.data.collection || [];
      logger.info(`Found ${invitees.length} invitees`);

      return {
        collection: invitees,
        pagination: response.data.pagination,
      };
    } catch (error) {
      logger.error('Failed to fetch invitees:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get single invitee
   */
  async getInvitee(inviteeUri: string): Promise<CalendlyInvitee> {
    try {
      logger.info(`Fetching Calendly invitee ${inviteeUri}`);

      // Extract UUID from URI
      const uuid = inviteeUri.split('/').pop();

      const response = await this.axiosInstance.get(`/scheduled_events/${uuid}/invitees`);

      return response.data.resource;
    } catch (error) {
      logger.error('Failed to fetch invitee:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Cancel scheduled event
   */
  async cancelEvent(eventUri: string, reason?: string): Promise<any> {
    try {
      logger.info(`Canceling Calendly event ${eventUri}`);

      // Extract UUID from URI
      const uuid = eventUri.split('/').pop();

      const response = await this.axiosInstance.post(
        `/scheduled_events/${uuid}/cancellation`,
        {
          reason: reason || 'Canceled via API',
        }
      );

      logger.info('Event canceled successfully');
      return response.data.resource;
    } catch (error) {
      logger.error('Failed to cancel event:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get organization details
   */
  async getOrganization(organizationUri: string): Promise<any> {
    try {
      logger.info(`Fetching organization ${organizationUri}`);

      // Extract UUID from URI
      const uuid = organizationUri.split('/').pop();

      const response = await this.axiosInstance.get(`/organizations/${uuid}`);

      return response.data.resource;
    } catch (error) {
      logger.error('Failed to fetch organization:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List organization memberships
   */
  async getOrganizationMemberships(organizationUri: string, options?: {
    count?: number;
    pageToken?: string;
    email?: string;
  }): Promise<any> {
    try {
      logger.info('Fetching organization memberships');

      const params: any = {
        organization: organizationUri,
        count: options?.count || 20,
      };

      if (options?.pageToken) params.page_token = options.pageToken;
      if (options?.email) params.email = options.email;

      const response = await this.axiosInstance.get('/organization_memberships', { params });

      const memberships = response.data.collection || [];
      logger.info(`Found ${memberships.length} memberships`);

      return {
        collection: memberships,
        pagination: response.data.pagination,
      };
    } catch (error) {
      logger.error('Failed to fetch memberships:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get webhooks
   */
  async getWebhookSubscriptions(organizationUri: string, scope: 'user' | 'organization'): Promise<any> {
    try {
      logger.info('Fetching webhook subscriptions');

      const params: any = {
        organization: organizationUri,
        scope,
      };

      const response = await this.axiosInstance.get('/webhook_subscriptions', { params });

      const webhooks = response.data.collection || [];
      logger.info(`Found ${webhooks.length} webhook subscriptions`);

      return {
        collection: webhooks,
        pagination: response.data.pagination,
      };
    } catch (error) {
      logger.error('Failed to fetch webhooks:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create webhook subscription
   */
  async createWebhookSubscription(
    url: string,
    events: string[],
    organizationUri: string,
    scope: 'user' | 'organization',
    userUri?: string
  ): Promise<any> {
    try {
      logger.info('Creating webhook subscription');

      const payload: any = {
        url,
        events,
        organization: organizationUri,
        scope,
      };

      if (scope === 'user' && userUri) {
        payload.user = userUri;
      }

      const response = await this.axiosInstance.post('/webhook_subscriptions', payload);

      logger.info(`Webhook created successfully: ${response.data.resource.uri}`);
      return response.data.resource;
    } catch (error) {
      logger.error('Failed to create webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete webhook subscription
   */
  async deleteWebhookSubscription(webhookUri: string): Promise<void> {
    try {
      logger.info(`Deleting webhook ${webhookUri}`);

      // Extract UUID from URI
      const uuid = webhookUri.split('/').pop();

      await this.axiosInstance.delete(`/webhook_subscriptions/${uuid}`);

      logger.info('Webhook deleted successfully');
    } catch (error) {
      logger.error('Failed to delete webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignature = hmac.digest('base64');

    return calculatedSignature === signature;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const calError = error.response?.data;
      if (calError?.message) {
        return new Error(`Calendly API Error: ${calError.message}`);
      }
      if (calError?.title) {
        return new Error(`Calendly API Error: ${calError.title}`);
      }
      return new Error(`Calendly API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown Calendly error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'Calendly',
      authenticated: (this.useOAuth && this.credentials.accessToken) || this.credentials.apiToken ? true : false,
      authType: this.useOAuth ? 'OAuth 2.0' : 'API Token',
      tokenExpiry: this.credentials.tokenExpiry ? new Date(this.credentials.tokenExpiry).toISOString() : null,
    };
  }
}

// Export factory function
export function createCalendlyService(
  credentials: CalendlyCredentials,
  useOAuth = false
): CalendlyService {
  return new CalendlyService(credentials, useOAuth);
}
