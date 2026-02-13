/**
 * JotForm Service
 * Handles JotForm API operations with API key authentication
 */

import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';

interface JotFormCredentials {
  apiKey: string;
}

interface JotFormSubmission {
  id: string;
  form_id: string;
  ip: string;
  created_at: string;
  status: string;
  answers: Record<string, any>;
}

export class JotFormService {
  private readonly baseURL = 'https://api.jotform.com';
  private axiosInstance: AxiosInstance;
  private credentials: JotFormCredentials;

  constructor(credentials: JotFormCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'APIKEY': credentials.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * SUBMISSION OPERATIONS
   */

  /**
   * Get form submissions
   */
  async getFormSubmissions(
    formId: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: string;
      orderBy?: string;
      direction?: 'ASC' | 'DESC';
    }
  ): Promise<any> {
    try {
      logger.info(`Fetching JotForm submissions for form ${formId}`);

      const params: any = {
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      };

      if (options?.filter) {
        params.filter = options.filter;
      }
      if (options?.orderBy) {
        params.orderby = options.orderBy;
      }
      if (options?.direction) {
        params.direction = options.direction;
      }

      const response = await this.axiosInstance.get(
        `/form/${formId}/submissions`,
        { params }
      );

      const submissions = response.data.content || [];
      logger.info(`Found ${submissions.length} submissions`);

      return {
        responseCode: response.data.responseCode,
        message: response.data.message,
        content: submissions,
        limit: response.data.limit,
        count: response.data.count,
      };
    } catch (error) {
      logger.error('Failed to fetch form submissions:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get single submission
   */
  async getSubmission(submissionId: string): Promise<JotFormSubmission> {
    try {
      logger.info(`Fetching JotForm submission: ${submissionId}`);

      const response = await this.axiosInstance.get(`/submission/${submissionId}`);

      return response.data.content;
    } catch (error) {
      logger.error(`Failed to fetch submission ${submissionId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Create submission
   */
  async createSubmission(formId: string, data: Record<string, any>): Promise<any> {
    try {
      logger.info(`Creating JotForm submission for form ${formId}`);

      const response = await this.axiosInstance.post(
        `/form/${formId}/submissions`,
        {
          submission: data,
        }
      );

      logger.info(`Submission created successfully`);
      return response.data.content;
    } catch (error) {
      logger.error('Failed to create submission:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete submission
   */
  async deleteSubmission(submissionId: string): Promise<void> {
    try {
      logger.info(`Deleting JotForm submission: ${submissionId}`);

      await this.axiosInstance.delete(`/submission/${submissionId}`);

      logger.info('Submission deleted successfully');
    } catch (error) {
      logger.error('Failed to delete submission:', error);
      throw this.handleError(error);
    }
  }

  /**
   * FORM OPERATIONS
   */

  /**
   * Get all forms
   */
  async getForms(options?: {
    offset?: number;
    limit?: number;
    filter?: string;
    orderBy?: string;
  }): Promise<any> {
    try {
      logger.info('Fetching JotForm forms');

      const params: any = {
        offset: options?.offset || 0,
        limit: options?.limit || 20,
      };

      if (options?.filter) {
        params.filter = options.filter;
      }
      if (options?.orderBy) {
        params.orderby = options.orderBy;
      }

      const response = await this.axiosInstance.get('/user/forms', { params });

      const forms = response.data.content || [];
      logger.info(`Found ${forms.length} forms`);

      return {
        responseCode: response.data.responseCode,
        message: response.data.message,
        content: forms,
      };
    } catch (error) {
      logger.error('Failed to fetch forms:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get single form
   */
  async getForm(formId: string): Promise<any> {
    try {
      logger.info(`Fetching JotForm form: ${formId}`);

      const response = await this.axiosInstance.get(`/form/${formId}`);

      return response.data.content;
    } catch (error) {
      logger.error(`Failed to fetch form ${formId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get form questions
   */
  async getFormQuestions(formId: string): Promise<any> {
    try {
      logger.info(`Fetching JotForm form questions: ${formId}`);

      const response = await this.axiosInstance.get(`/form/${formId}/questions`);

      return response.data.content;
    } catch (error) {
      logger.error('Failed to fetch form questions:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get form properties
   */
  async getFormProperties(formId: string): Promise<any> {
    try {
      logger.info(`Fetching JotForm form properties: ${formId}`);

      const response = await this.axiosInstance.get(`/form/${formId}/properties`);

      return response.data.content;
    } catch (error) {
      logger.error('Failed to fetch form properties:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete form
   */
  async deleteForm(formId: string): Promise<void> {
    try {
      logger.info(`Deleting JotForm form: ${formId}`);

      await this.axiosInstance.delete(`/form/${formId}`);

      logger.info('Form deleted successfully');
    } catch (error) {
      logger.error('Failed to delete form:', error);
      throw this.handleError(error);
    }
  }

  /**
   * USER OPERATIONS
   */

  /**
   * Get user info
   */
  async getUser(): Promise<any> {
    try {
      logger.info('Fetching JotForm user info');

      const response = await this.axiosInstance.get('/user');

      return response.data.content;
    } catch (error) {
      logger.error('Failed to fetch user info:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user usage
   */
  async getUserUsage(): Promise<any> {
    try {
      logger.info('Fetching JotForm user usage');

      const response = await this.axiosInstance.get('/user/usage');

      return response.data.content;
    } catch (error) {
      logger.error('Failed to fetch user usage:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user submissions
   */
  async getUserSubmissions(options?: {
    offset?: number;
    limit?: number;
    filter?: string;
    orderBy?: string;
  }): Promise<any> {
    try {
      logger.info('Fetching JotForm user submissions');

      const params: any = {
        offset: options?.offset || 0,
        limit: options?.limit || 20,
      };

      if (options?.filter) {
        params.filter = options.filter;
      }
      if (options?.orderBy) {
        params.orderby = options.orderBy;
      }

      const response = await this.axiosInstance.get('/user/submissions', { params });

      const submissions = response.data.content || [];
      logger.info(`Found ${submissions.length} user submissions`);

      return {
        responseCode: response.data.responseCode,
        message: response.data.message,
        content: submissions,
      };
    } catch (error) {
      logger.error('Failed to fetch user submissions:', error);
      throw this.handleError(error);
    }
  }

  /**
   * FOLDER OPERATIONS
   */

  /**
   * Get folders
   */
  async getFolders(): Promise<any> {
    try {
      logger.info('Fetching JotForm folders');

      const response = await this.axiosInstance.get('/user/folders');

      const folders = response.data.content || [];
      logger.info(`Found ${folders.length} folders`);

      return folders;
    } catch (error) {
      logger.error('Failed to fetch folders:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get folder forms
   */
  async getFolderForms(folderId: string): Promise<any> {
    try {
      logger.info(`Fetching forms in folder: ${folderId}`);

      const response = await this.axiosInstance.get(`/folder/${folderId}/forms`);

      const forms = response.data.content || [];
      logger.info(`Found ${forms.length} forms in folder`);

      return forms;
    } catch (error) {
      logger.error('Failed to fetch folder forms:', error);
      throw this.handleError(error);
    }
  }

  /**
   * REPORT OPERATIONS
   */

  /**
   * Get form reports
   */
  async getFormReports(formId: string): Promise<any> {
    try {
      logger.info(`Fetching reports for form: ${formId}`);

      const response = await this.axiosInstance.get(`/form/${formId}/reports`);

      const reports = response.data.content || [];
      logger.info(`Found ${reports.length} reports`);

      return reports;
    } catch (error) {
      logger.error('Failed to fetch form reports:', error);
      throw this.handleError(error);
    }
  }

  /**
   * WEBHOOK OPERATIONS
   */

  /**
   * Get form webhooks
   */
  async getFormWebhooks(formId: string): Promise<any> {
    try {
      logger.info(`Fetching webhooks for form: ${formId}`);

      const response = await this.axiosInstance.get(`/form/${formId}/webhooks`);

      return response.data.content;
    } catch (error) {
      logger.error('Failed to fetch form webhooks:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(formId: string, webhookURL: string): Promise<any> {
    try {
      logger.info(`Creating webhook for form: ${formId}`);

      const response = await this.axiosInstance.post(`/form/${formId}/webhooks`, {
        webhookURL,
      });

      logger.info('Webhook created successfully');
      return response.data.content;
    } catch (error) {
      logger.error('Failed to create webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(formId: string, webhookId: string): Promise<void> {
    try {
      logger.info(`Deleting webhook ${webhookId} for form ${formId}`);

      await this.axiosInstance.delete(`/form/${formId}/webhooks/${webhookId}`);

      logger.info('Webhook deleted successfully');
    } catch (error) {
      logger.error('Failed to delete webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Build filter string
   */
  buildFilter(filters: Record<string, any>): string {
    return JSON.stringify(filters);
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const jfError = error.response?.data;
      if (jfError?.message) {
        return new Error(`JotForm API Error: ${jfError.message}`);
      }
      if (jfError?.info) {
        return new Error(`JotForm API Error: ${jfError.info}`);
      }
      return new Error(`JotForm API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown JotForm error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'JotForm',
      authenticated: this.credentials.apiKey ? true : false,
    };
  }
}

// Export factory function
export function createJotFormService(credentials: JotFormCredentials): JotFormService {
  return new JotFormService(credentials);
}
