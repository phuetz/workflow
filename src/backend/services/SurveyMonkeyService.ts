/**
 * SurveyMonkey Service
 * Handles SurveyMonkey API operations with OAuth 2.0 authentication
 */

import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';

interface SurveyMonkeyCredentials {
  accessToken: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

interface SurveyMonkeyCollector {
  name: string;
  type: string; // 'weblink' | 'email' | 'embedded'
  thank_you_message?: string;
  redirect_url?: string;
  display_survey_results?: boolean;
  edit_response_type?: string;
}

export class SurveyMonkeyService {
  private readonly baseURL = 'https://api.surveymonkey.com/v3';
  private readonly authURL = 'https://api.surveymonkey.com/oauth/token';
  private axiosInstance: AxiosInstance;
  private credentials: SurveyMonkeyCredentials;

  constructor(credentials: SurveyMonkeyCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for automatic token refresh (if refresh token available)
    if (credentials.refreshToken) {
      this.axiosInstance.interceptors.request.use(
        async (config) => {
          await this.ensureValidToken();
          config.headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
          return config;
        },
        (error) => Promise.reject(error)
      );
    }
  }

  /**
   * Ensure access token is valid, refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    const now = Date.now();
    const expiry = this.credentials.tokenExpiry || 0;

    // Refresh if token expires in less than 5 minutes
    if (this.credentials.refreshToken && (!this.credentials.accessToken || now >= expiry - 300000)) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Refresh OAuth access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.refreshToken) {
      logger.warn('Cannot refresh token: missing client credentials or refresh token');
      return;
    }

    try {
      logger.info('Refreshing SurveyMonkey access token');

      const response = await axios.post(this.authURL, {
        grant_type: 'refresh_token',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: this.credentials.refreshToken,
      });

      this.credentials.accessToken = response.data.access_token;
      if (response.data.refresh_token) {
        this.credentials.refreshToken = response.data.refresh_token;
      }
      this.credentials.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      logger.info('SurveyMonkey access token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh SurveyMonkey access token:', error);
      throw new Error('Token refresh failed');
    }
  }

  /**
   * SURVEY OPERATIONS
   */

  /**
   * List surveys
   */
  async listSurveys(options?: {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    folderId?: string;
    title?: string;
  }): Promise<any> {
    try {
      logger.info('Listing SurveyMonkey surveys');

      const params: any = {
        page: options?.page || 1,
        per_page: options?.perPage || 50,
      };

      if (options?.sortBy) params.sort_by = options.sortBy;
      if (options?.sortOrder) params.sort_order = options.sortOrder;
      if (options?.folderId) params.folder_id = options.folderId;
      if (options?.title) params.title = options.title;

      const response = await this.axiosInstance.get('/surveys', { params });

      const surveys = response.data.data || [];
      logger.info(`Found ${surveys.length} surveys`);

      return {
        surveys,
        page: response.data.page,
        perPage: response.data.per_page,
        total: response.data.total,
      };
    } catch (error) {
      logger.error('Failed to list surveys:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get survey
   */
  async getSurvey(surveyId: string): Promise<any> {
    try {
      logger.info(`Fetching SurveyMonkey survey: ${surveyId}`);

      const response = await this.axiosInstance.get(`/surveys/${surveyId}`);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch survey ${surveyId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get survey details (with pages and questions)
   */
  async getSurveyDetails(surveyId: string): Promise<any> {
    try {
      logger.info(`Fetching SurveyMonkey survey details: ${surveyId}`);

      const response = await this.axiosInstance.get(`/surveys/${surveyId}/details`);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch survey details ${surveyId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get survey pages
   */
  async getSurveyPages(surveyId: string): Promise<any> {
    try {
      logger.info(`Fetching SurveyMonkey survey pages: ${surveyId}`);

      const response = await this.axiosInstance.get(`/surveys/${surveyId}/pages`);

      const pages = response.data.data || [];
      logger.info(`Found ${pages.length} pages`);

      return { pages };
    } catch (error) {
      logger.error(`Failed to fetch survey pages ${surveyId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get survey questions
   */
  async getSurveyQuestions(surveyId: string): Promise<any> {
    try {
      logger.info(`Fetching SurveyMonkey survey questions: ${surveyId}`);

      // Get all pages first
      const pagesResponse = await this.axiosInstance.get(`/surveys/${surveyId}/pages`);
      const pages = pagesResponse.data.data || [];

      // Get questions for each page
      const allQuestions: any[] = [];
      for (const page of pages) {
        const questionsResponse = await this.axiosInstance.get(`/surveys/${surveyId}/pages/${page.id}/questions`);
        const questions = questionsResponse.data.data || [];
        allQuestions.push(...questions.map((q: any) => ({
          ...q,
          pageId: page.id,
          pageTitle: page.title,
        })));
      }

      logger.info(`Found ${allQuestions.length} questions`);

      return { questions: allQuestions };
    } catch (error) {
      logger.error(`Failed to fetch survey questions ${surveyId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * RESPONSE OPERATIONS
   */

  /**
   * Get bulk responses
   */
  async getBulkResponses(surveyId: string, options?: {
    page?: number;
    perPage?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    startCreatedAt?: string;
    endCreatedAt?: string;
    startModifiedAt?: string;
    endModifiedAt?: string;
  }): Promise<any> {
    try {
      logger.info(`Fetching bulk responses for survey: ${surveyId}`);

      const params: any = {
        page: options?.page || 1,
        per_page: options?.perPage || 100,
      };

      if (options?.status) params.status = options.status;
      if (options?.sortBy) params.sort_by = options.sortBy;
      if (options?.sortOrder) params.sort_order = options.sortOrder;
      if (options?.startCreatedAt) params.start_created_at = options.startCreatedAt;
      if (options?.endCreatedAt) params.end_created_at = options.endCreatedAt;
      if (options?.startModifiedAt) params.start_modified_at = options.startModifiedAt;
      if (options?.endModifiedAt) params.end_modified_at = options.endModifiedAt;

      const response = await this.axiosInstance.get(`/surveys/${surveyId}/responses/bulk`, { params });

      const responses = response.data.data || [];
      logger.info(`Found ${responses.length} responses`);

      return {
        responses,
        page: response.data.page,
        perPage: response.data.per_page,
        total: response.data.total,
      };
    } catch (error) {
      logger.error('Failed to fetch bulk responses:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get response
   */
  async getResponse(surveyId: string, responseId: string): Promise<any> {
    try {
      logger.info(`Fetching response: ${responseId} for survey: ${surveyId}`);

      const response = await this.axiosInstance.get(`/surveys/${surveyId}/responses/${responseId}`);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch response ${responseId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get response details
   */
  async getResponseDetails(surveyId: string, responseId: string): Promise<any> {
    try {
      logger.info(`Fetching response details: ${responseId} for survey: ${surveyId}`);

      const response = await this.axiosInstance.get(`/surveys/${surveyId}/responses/${responseId}/details`);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch response details ${responseId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * COLLECTOR OPERATIONS
   */

  /**
   * List collectors
   */
  async listCollectors(surveyId: string, options?: {
    page?: number;
    perPage?: number;
  }): Promise<any> {
    try {
      logger.info(`Listing collectors for survey: ${surveyId}`);

      const params: any = {
        page: options?.page || 1,
        per_page: options?.perPage || 50,
      };

      const response = await this.axiosInstance.get(`/surveys/${surveyId}/collectors`, { params });

      const collectors = response.data.data || [];
      logger.info(`Found ${collectors.length} collectors`);

      return {
        collectors,
        page: response.data.page,
        perPage: response.data.per_page,
        total: response.data.total,
      };
    } catch (error) {
      logger.error('Failed to list collectors:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get collector
   */
  async getCollector(collectorId: string): Promise<any> {
    try {
      logger.info(`Fetching collector: ${collectorId}`);

      const response = await this.axiosInstance.get(`/collectors/${collectorId}`);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch collector ${collectorId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Create collector
   */
  async createCollector(surveyId: string, collector: SurveyMonkeyCollector): Promise<any> {
    try {
      logger.info(`Creating collector for survey: ${surveyId}`);

      const response = await this.axiosInstance.post(`/surveys/${surveyId}/collectors`, collector);

      logger.info(`Collector created successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create collector:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update collector
   */
  async updateCollector(collectorId: string, collector: Partial<SurveyMonkeyCollector>): Promise<any> {
    try {
      logger.info(`Updating collector: ${collectorId}`);

      const response = await this.axiosInstance.patch(`/collectors/${collectorId}`, collector);

      logger.info('Collector updated successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to update collector:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete collector
   */
  async deleteCollector(collectorId: string): Promise<void> {
    try {
      logger.info(`Deleting collector: ${collectorId}`);

      await this.axiosInstance.delete(`/collectors/${collectorId}`);

      logger.info('Collector deleted successfully');
    } catch (error) {
      logger.error('Failed to delete collector:', error);
      throw this.handleError(error);
    }
  }

  /**
   * WEBHOOK OPERATIONS
   */

  /**
   * List webhooks
   */
  async listWebhooks(): Promise<any> {
    try {
      logger.info('Listing SurveyMonkey webhooks');

      const response = await this.axiosInstance.get('/webhooks');

      const webhooks = response.data.data || [];
      logger.info(`Found ${webhooks.length} webhooks`);

      return { webhooks };
    } catch (error) {
      logger.error('Failed to list webhooks:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(webhook: {
    name: string;
    event_type: string;
    object_type: string;
    object_ids: string[];
    subscription_url: string;
  }): Promise<any> {
    try {
      logger.info('Creating SurveyMonkey webhook');

      const response = await this.axiosInstance.post('/webhooks', webhook);

      logger.info(`Webhook created successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      logger.info(`Deleting webhook: ${webhookId}`);

      await this.axiosInstance.delete(`/webhooks/${webhookId}`);

      logger.info('Webhook deleted successfully');
    } catch (error) {
      logger.error('Failed to delete webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * USER OPERATIONS
   */

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<any> {
    try {
      logger.info('Fetching current SurveyMonkey user');

      const response = await this.axiosInstance.get('/users/me');

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch current user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const smError = error.response?.data;
      if (smError?.error?.message) {
        return new Error(`SurveyMonkey API Error: ${smError.error.message}`);
      }
      if (smError?.message) {
        return new Error(`SurveyMonkey API Error: ${smError.message}`);
      }
      return new Error(`SurveyMonkey API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown SurveyMonkey error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'SurveyMonkey',
      authenticated: this.credentials.accessToken ? true : false,
    };
  }
}

// Export factory function
export function createSurveyMonkeyService(credentials: SurveyMonkeyCredentials): SurveyMonkeyService {
  return new SurveyMonkeyService(credentials);
}
