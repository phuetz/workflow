/**
 * Typeform Service
 * Handles Typeform API operations with API token authentication
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';

interface TypeformCredentials {
  apiToken: string;
}

interface TypeformResponse {
  responseId: string;
  landedAt: string;
  submittedAt: string;
  answers: any[];
  variables?: any[];
  hidden?: Record<string, any>;
  calculated?: Record<string, any>;
}

interface TypeformForm {
  id: string;
  title: string;
  theme: any;
  workspace: any;
  settings: any;
  fields: any[];
}

export class TypeformService {
  private readonly baseURL = 'https://api.typeform.com';
  private axiosInstance: AxiosInstance;
  private credentials: TypeformCredentials;

  constructor(credentials: TypeformCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${credentials.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get form responses
   */
  async getFormResponses(
    formId: string,
    options?: {
      pageSize?: number;
      since?: string;
      until?: string;
      after?: string;
      before?: string;
      includedResponseIds?: string;
      completed?: boolean;
      sort?: 'asc' | 'desc';
      query?: string;
      fields?: string;
    }
  ): Promise<any> {
    try {
      logger.info(`Fetching Typeform responses for form ${formId}`);

      const params: any = {
        page_size: options?.pageSize || 25,
      };

      if (options?.since) params.since = options.since;
      if (options?.until) params.until = options.until;
      if (options?.after) params.after = options.after;
      if (options?.before) params.before = options.before;
      if (options?.includedResponseIds) params.included_response_ids = options.includedResponseIds;
      if (options?.completed !== undefined) params.completed = options.completed;
      if (options?.sort) params.sort = options.sort;
      if (options?.query) params.query = options.query;
      if (options?.fields) params.fields = options.fields;

      const response = await this.axiosInstance.get(
        `/forms/${formId}/responses`,
        { params }
      );

      const items = response.data.items || [];
      logger.info(`Found ${items.length} responses for form ${formId}`);

      return {
        total_items: response.data.total_items,
        page_count: response.data.page_count,
        items: items,
      };
    } catch (error) {
      logger.error(`Failed to fetch form responses:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all form responses (with pagination)
   */
  async getAllFormResponses(
    formId: string,
    options?: {
      since?: string;
      until?: string;
      completed?: boolean;
      maxResults?: number;
    }
  ): Promise<TypeformResponse[]> {
    try {
      logger.info(`Fetching all responses for form ${formId}`);

      const allResponses: TypeformResponse[] = [];
      let after: string | undefined;
      const maxResults = options?.maxResults || 1000;
      const pageSize = 25;

      while (allResponses.length < maxResults) {
        const response = await this.getFormResponses(formId, {
          pageSize,
          since: options?.since,
          until: options?.until,
          completed: options?.completed,
          after,
        });

        if (response.items.length === 0) break;

        allResponses.push(...response.items);

        // Check if there are more pages
        if (response.items.length < pageSize) break;

        // Get the last response ID for next page
        after = response.items[response.items.length - 1].response_id;
      }

      logger.info(`Fetched total of ${allResponses.length} responses`);
      return allResponses;
    } catch (error) {
      logger.error('Failed to fetch all responses:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get single response by ID
   */
  async getResponse(formId: string, responseId: string): Promise<TypeformResponse> {
    try {
      logger.info(`Fetching Typeform response ${responseId}`);

      const response = await this.axiosInstance.get(
        `/forms/${formId}/responses`,
        {
          params: {
            included_response_ids: responseId,
          },
        }
      );

      const items = response.data.items || [];
      if (items.length === 0) {
        throw new Error(`Response ${responseId} not found`);
      }

      return items[0];
    } catch (error) {
      logger.error(`Failed to fetch response ${responseId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get form details
   */
  async getForm(formId: string): Promise<TypeformForm> {
    try {
      logger.info(`Fetching Typeform form ${formId}`);

      const response = await this.axiosInstance.get(`/forms/${formId}`);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch form ${formId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get list of forms
   */
  async getForms(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    workspaceId?: string;
  }): Promise<any> {
    try {
      logger.info('Fetching Typeform forms');

      const params: any = {
        page: options?.page || 1,
        page_size: options?.pageSize || 10,
      };

      if (options?.search) params.search = options.search;
      if (options?.workspaceId) params.workspace_id = options.workspaceId;

      const response = await this.axiosInstance.get('/forms', { params });

      const forms = response.data.items || [];
      logger.info(`Found ${forms.length} forms`);

      return {
        total_items: response.data.total_items,
        page_count: response.data.page_count,
        items: forms,
      };
    } catch (error) {
      logger.error('Failed to fetch forms:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create form (requires premium account)
   */
  async createForm(formData: any): Promise<any> {
    try {
      logger.info('Creating Typeform form');

      const response = await this.axiosInstance.post('/forms', formData);

      logger.info(`Form created successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create form:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update form
   */
  async updateForm(formId: string, updates: any): Promise<any> {
    try {
      logger.info(`Updating Typeform form ${formId}`);

      const response = await this.axiosInstance.patch(`/forms/${formId}`, updates);

      logger.info(`Form updated successfully`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to update form ${formId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete form
   */
  async deleteForm(formId: string): Promise<void> {
    try {
      logger.info(`Deleting Typeform form ${formId}`);

      await this.axiosInstance.delete(`/forms/${formId}`);

      logger.info(`Form deleted successfully`);
    } catch (error) {
      logger.error(`Failed to delete form ${formId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get webhooks for a form
   */
  async getWebhooks(formId: string): Promise<any[]> {
    try {
      logger.info(`Fetching webhooks for form ${formId}`);

      const response = await this.axiosInstance.get(`/forms/${formId}/webhooks`);

      const webhooks = response.data.items || [];
      logger.info(`Found ${webhooks.length} webhooks`);

      return webhooks;
    } catch (error) {
      logger.error('Failed to fetch webhooks:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(
    formId: string,
    url: string,
    tag?: string,
    enabled = true
  ): Promise<any> {
    try {
      logger.info(`Creating webhook for form ${formId}`);

      const response = await this.axiosInstance.put(
        `/forms/${formId}/webhooks/${tag || 'default'}`,
        {
          url,
          enabled,
        }
      );

      logger.info(`Webhook created successfully`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(formId: string, tag: string): Promise<void> {
    try {
      logger.info(`Deleting webhook ${tag} for form ${formId}`);

      await this.axiosInstance.delete(`/forms/${formId}/webhooks/${tag}`);

      logger.info(`Webhook deleted successfully`);
    } catch (error) {
      logger.error('Failed to delete webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const calculatedSignature = `sha256=${hmac.digest('base64')}`;

    return calculatedSignature === signature;
  }

  /**
   * Get workspaces
   */
  async getWorkspaces(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<any> {
    try {
      logger.info('Fetching Typeform workspaces');

      const params: any = {
        page: options?.page || 1,
        page_size: options?.pageSize || 10,
      };

      if (options?.search) params.search = options.search;

      const response = await this.axiosInstance.get('/workspaces', { params });

      const workspaces = response.data.items || [];
      logger.info(`Found ${workspaces.length} workspaces`);

      return {
        total_items: response.data.total_items,
        page_count: response.data.page_count,
        items: workspaces,
      };
    } catch (error) {
      logger.error('Failed to fetch workspaces:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get themes
   */
  async getThemes(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      logger.info('Fetching Typeform themes');

      const params: any = {
        page: options?.page || 1,
        page_size: options?.pageSize || 10,
      };

      const response = await this.axiosInstance.get('/themes', { params });

      const themes = response.data.items || [];
      logger.info(`Found ${themes.length} themes`);

      return {
        total_items: response.data.total_items,
        page_count: response.data.page_count,
        items: themes,
      };
    } catch (error) {
      logger.error('Failed to fetch themes:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get images
   */
  async getImages(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      logger.info('Fetching Typeform images');

      const params: any = {
        page: options?.page || 1,
        page_size: options?.pageSize || 10,
      };

      const response = await this.axiosInstance.get('/images', { params });

      const images = response.data.items || [];
      logger.info(`Found ${images.length} images`);

      return {
        total_items: response.data.total_items,
        page_count: response.data.page_count,
        items: images,
      };
    } catch (error) {
      logger.error('Failed to fetch images:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const tfError = error.response?.data;
      if (tfError?.description) {
        return new Error(`Typeform API Error: ${tfError.description}`);
      }
      if (tfError?.message) {
        return new Error(`Typeform API Error: ${tfError.message}`);
      }
      return new Error(`Typeform API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown Typeform error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'Typeform',
      authenticated: this.credentials.apiToken ? true : false,
    };
  }
}

// Export factory function
export function createTypeformService(credentials: TypeformCredentials): TypeformService {
  return new TypeformService(credentials);
}
