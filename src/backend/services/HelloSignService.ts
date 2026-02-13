/**
 * HelloSign Service (Dropbox Sign)
 * Handles HelloSign eSignature API operations with API key authentication
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';

interface HelloSignCredentials {
  apiKey: string;
}

interface HelloSignSigner {
  email: string;
  name: string;
  order?: number;
}

interface HelloSignSignatureRequest {
  title: string;
  subject?: string;
  message?: string;
  signers: HelloSignSigner[];
  ccEmailAddresses?: string[];
  fileUrls?: string[];
  fileData?: string;
  testMode?: boolean;
  useTextTags?: boolean;
  hideTextTags?: boolean;
  allowDecline?: boolean;
}

interface HelloSignTemplate {
  templateId: string;
  title?: string;
  subject?: string;
  message?: string;
  signers: Array<{
    role: string;
    email: string;
    name: string;
  }>;
  customFields?: Record<string, string>;
}

export class HelloSignService {
  private readonly baseURL = 'https://api.hellosign.com/v3';
  private axiosInstance: AxiosInstance;
  private credentials: HelloSignCredentials;

  constructor(credentials: HelloSignCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send signature request
   */
  async sendSignatureRequest(request: HelloSignSignatureRequest): Promise<any> {
    try {
      logger.info(`Sending HelloSign signature request: ${request.title}`);

      const formData: any = {
        title: request.title,
        subject: request.subject || request.title,
        message: request.message || '',
        test_mode: request.testMode ? '1' : '0',
      };

      // Add signers
      request.signers.forEach((signer, index) => {
        formData[`signers[${index}][email_address]`] = signer.email;
        formData[`signers[${index}][name]`] = signer.name;
        if (signer.order) {
          formData[`signers[${index}][order]`] = signer.order;
        }
      });

      // Add CC email addresses
      if (request.ccEmailAddresses) {
        request.ccEmailAddresses.forEach((email, index) => {
          formData[`cc_email_addresses[${index}]`] = email;
        });
      }

      // Add file URLs
      if (request.fileUrls) {
        request.fileUrls.forEach((url, index) => {
          formData[`file_url[${index}]`] = url;
        });
      }

      // Add options
      if (request.useTextTags) {
        formData['use_text_tags'] = '1';
      }
      if (request.hideTextTags) {
        formData['hide_text_tags'] = '1';
      }
      if (request.allowDecline !== false) {
        formData['allow_decline'] = '1';
      }

      const response = await this.axiosInstance.post(
        '/signature_request/send',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info(`Signature request sent successfully: ${response.data.signature_request?.signature_request_id}`);
      return response.data.signature_request;
    } catch (error) {
      logger.error('Failed to send signature request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Send signature request with template
   */
  async sendWithTemplate(template: HelloSignTemplate): Promise<any> {
    try {
      logger.info(`Sending HelloSign signature request with template: ${template.templateId}`);

      const formData: any = {
        template_id: template.templateId,
        title: template.title || 'Template Signature Request',
        subject: template.subject || template.title,
        message: template.message || '',
      };

      // Add signers
      template.signers.forEach((signer, index) => {
        formData[`signers[${signer.role}][email_address]`] = signer.email;
        formData[`signers[${signer.role}][name]`] = signer.name;
      });

      // Add custom fields
      if (template.customFields) {
        Object.entries(template.customFields).forEach(([key, value]) => {
          formData[`custom_fields[${key}]`] = value;
        });
      }

      const response = await this.axiosInstance.post(
        '/signature_request/send_with_template',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info(`Template signature request sent successfully: ${response.data.signature_request?.signature_request_id}`);
      return response.data.signature_request;
    } catch (error) {
      logger.error('Failed to send template signature request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get signature request status
   */
  async getSignatureRequest(signatureRequestId: string): Promise<any> {
    try {
      logger.info(`Fetching HelloSign signature request: ${signatureRequestId}`);

      const response = await this.axiosInstance.get(
        `/signature_request/${signatureRequestId}`
      );

      return response.data.signature_request;
    } catch (error) {
      logger.error(`Failed to fetch signature request ${signatureRequestId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Cancel signature request
   */
  async cancelSignatureRequest(signatureRequestId: string): Promise<void> {
    try {
      logger.info(`Canceling HelloSign signature request: ${signatureRequestId}`);

      await this.axiosInstance.post(
        `/signature_request/cancel/${signatureRequestId}`
      );

      logger.info('Signature request canceled successfully');
    } catch (error) {
      logger.error('Failed to cancel signature request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Download files (signed documents)
   */
  async downloadFiles(signatureRequestId: string, fileType: 'pdf' | 'zip' = 'pdf'): Promise<Buffer> {
    try {
      logger.info(`Downloading files for signature request: ${signatureRequestId}`);

      const response = await this.axiosInstance.get(
        `/signature_request/files/${signatureRequestId}`,
        {
          params: { file_type: fileType },
          responseType: 'arraybuffer',
        }
      );

      logger.info('Files downloaded successfully');
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download files:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List signature requests
   */
  async listSignatureRequests(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      logger.info('Listing HelloSign signature requests');

      const params: any = {
        page: options?.page || 1,
        page_size: options?.pageSize || 20,
      };

      const response = await this.axiosInstance.get('/signature_request/list', { params });

      const requests = response.data.signature_requests || [];
      logger.info(`Found ${requests.length} signature requests`);

      return {
        signature_requests: requests,
        list_info: response.data.list_info,
      };
    } catch (error) {
      logger.error('Failed to list signature requests:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Send reminder for signature request
   */
  async sendReminder(signatureRequestId: string, email: string): Promise<void> {
    try {
      logger.info(`Sending reminder for signature request: ${signatureRequestId}`);

      await this.axiosInstance.post(
        `/signature_request/remind/${signatureRequestId}`,
        {
          email_address: email,
        }
      );

      logger.info('Reminder sent successfully');
    } catch (error) {
      logger.error('Failed to send reminder:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get account info
   */
  async getAccount(): Promise<any> {
    try {
      logger.info('Fetching HelloSign account info');

      const response = await this.axiosInstance.get('/account');

      return response.data.account;
    } catch (error) {
      logger.error('Failed to fetch account info:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List templates
   */
  async listTemplates(options?: {
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    try {
      logger.info('Listing HelloSign templates');

      const params: any = {
        page: options?.page || 1,
        page_size: options?.pageSize || 20,
      };

      const response = await this.axiosInstance.get('/template/list', { params });

      const templates = response.data.templates || [];
      logger.info(`Found ${templates.length} templates`);

      return {
        templates,
        list_info: response.data.list_info,
      };
    } catch (error) {
      logger.error('Failed to list templates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get template
   */
  async getTemplate(templateId: string): Promise<any> {
    try {
      logger.info(`Fetching HelloSign template: ${templateId}`);

      const response = await this.axiosInstance.get(`/template/${templateId}`);

      return response.data.template;
    } catch (error) {
      logger.error(`Failed to fetch template ${templateId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      logger.info(`Deleting HelloSign template: ${templateId}`);

      await this.axiosInstance.post(`/template/delete/${templateId}`);

      logger.info('Template deleted successfully');
    } catch (error) {
      logger.error('Failed to delete template:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verify webhook event
   */
  verifyWebhookEvent(eventHash: string, eventTime: string, apiKey: string): boolean {
    const hmac = crypto.createHmac('sha256', apiKey);
    hmac.update(eventTime);
    const calculatedHash = hmac.digest('hex');

    return calculatedHash === eventHash;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const hsError = error.response?.data?.error;
      if (hsError?.error_msg) {
        return new Error(`HelloSign API Error: ${hsError.error_msg}`);
      }
      return new Error(`HelloSign API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown HelloSign error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'HelloSign',
      authenticated: this.credentials.apiKey ? true : false,
    };
  }
}

// Export factory function
export function createHelloSignService(credentials: HelloSignCredentials): HelloSignService {
  return new HelloSignService(credentials);
}
