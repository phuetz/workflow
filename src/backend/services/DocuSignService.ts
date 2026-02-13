/**
 * DocuSign Service
 * Handles DocuSign eSignature API operations with OAuth 2.0 authentication
 */

import * as crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';

interface DocuSignCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  baseUrl?: string;
  tokenExpiry?: number;
}

interface DocuSignRecipient {
  email: string;
  name: string;
  recipientId: string;
  routingOrder?: number;
  roleName?: string;
  tabs?: any;
}

interface DocuSignDocument {
  documentBase64?: string;
  documentId: string;
  name: string;
  fileExtension: string;
  documentUrl?: string;
}

interface DocuSignEnvelope {
  emailSubject: string;
  emailMessage?: string;
  status: 'created' | 'sent' | 'delivered' | 'completed' | 'voided';
  documents: DocuSignDocument[];
  recipients: {
    signers: DocuSignRecipient[];
    carbonCopies?: DocuSignRecipient[];
  };
  templateId?: string;
  templateRoles?: any[];
}

export class DocuSignService {
  private readonly authURL = 'https://account.docusign.com/oauth/token';
  private readonly userInfoURL = 'https://account.docusign.com/oauth/userinfo';
  private readonly demoAuthURL = 'https://account-d.docusign.com/oauth/token';
  private readonly demoUserInfoURL = 'https://account-d.docusign.com/oauth/userinfo';

  private axiosInstance: AxiosInstance;
  private credentials: DocuSignCredentials;
  private isDemo: boolean;

  constructor(credentials: DocuSignCredentials, isDemo = false) {
    this.credentials = credentials;
    this.isDemo = isDemo;

    this.axiosInstance = axios.create({
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for automatic token refresh
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken();

        // Set base URL if we have it
        if (this.credentials.baseUrl) {
          config.baseURL = this.credentials.baseUrl;
        }

        config.headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Ensure we have a valid access token and account info
   */
  private async ensureValidToken(): Promise<void> {
    const now = Date.now();
    const expiry = this.credentials.tokenExpiry || 0;

    // Refresh if token expires in less than 5 minutes
    if (!this.credentials.accessToken || now >= expiry - 300000) {
      await this.refreshAccessToken();
    }

    // Get account info if we don't have it
    if (!this.credentials.accountId || !this.credentials.baseUrl) {
      await this.getUserInfo();
    }
  }

  /**
   * Refresh OAuth 2.0 access token
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      logger.info('Refreshing DocuSign access token');

      const authUrl = this.isDemo ? this.demoAuthURL : this.authURL;

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.credentials.refreshToken || '',
      });

      const response = await axios.post(authUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString('base64')}`,
        },
      });

      this.credentials.accessToken = response.data.access_token;
      this.credentials.refreshToken = response.data.refresh_token;
      this.credentials.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      logger.info('DocuSign access token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh DocuSign access token:', error);
      throw new Error('DocuSign authentication failed');
    }
  }

  /**
   * Get user info to obtain account ID and base URL
   */
  private async getUserInfo(): Promise<void> {
    try {
      logger.info('Fetching DocuSign user info');

      const userInfoUrl = this.isDemo ? this.demoUserInfoURL : this.userInfoURL;

      const response = await axios.get(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
        },
      });

      const accounts = response.data.accounts;
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        this.credentials.accountId = account.account_id;
        this.credentials.baseUrl = account.base_uri + '/restapi';

        logger.info(`DocuSign account configured: ${this.credentials.accountId}`);
      } else {
        throw new Error('No DocuSign accounts found for this user');
      }
    } catch (error) {
      logger.error('Failed to fetch DocuSign user info:', error);
      throw new Error('Failed to get DocuSign account information');
    }
  }

  /**
   * Create and send envelope
   */
  async createEnvelope(envelope: DocuSignEnvelope): Promise<any> {
    try {
      logger.info(`Creating DocuSign envelope: ${envelope.emailSubject}`);

      const payload = {
        emailSubject: envelope.emailSubject,
        emailBlurb: envelope.emailMessage,
        status: envelope.status,
        documents: envelope.documents.map(doc => ({
          documentBase64: doc.documentBase64,
          documentId: doc.documentId,
          name: doc.name,
          fileExtension: doc.fileExtension,
        })),
        recipients: {
          signers: envelope.recipients.signers.map(signer => ({
            email: signer.email,
            name: signer.name,
            recipientId: signer.recipientId,
            routingOrder: signer.routingOrder || '1',
            roleName: signer.roleName,
            tabs: signer.tabs || {
              signHereTabs: [{
                documentId: '1',
                pageNumber: '1',
                xPosition: '100',
                yPosition: '100',
              }],
            },
          })),
          carbonCopies: envelope.recipients.carbonCopies?.map(cc => ({
            email: cc.email,
            name: cc.name,
            recipientId: cc.recipientId,
            routingOrder: cc.routingOrder || '2',
          })),
        },
      };

      const response = await this.axiosInstance.post(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes`,
        payload
      );

      logger.info(`Envelope created successfully: ${response.data.envelopeId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create DocuSign envelope:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create envelope from template
   */
  async createEnvelopeFromTemplate(
    templateId: string,
    templateRoles: any[],
    emailSubject: string,
    status: 'created' | 'sent' = 'sent'
  ): Promise<any> {
    try {
      logger.info(`Creating envelope from template: ${templateId}`);

      const payload = {
        templateId,
        templateRoles,
        emailSubject,
        status,
      };

      const response = await this.axiosInstance.post(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes`,
        payload
      );

      logger.info(`Envelope created from template: ${response.data.envelopeId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create envelope from template:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get envelope status
   */
  async getEnvelope(envelopeId: string): Promise<any> {
    try {
      logger.info(`Fetching DocuSign envelope ${envelopeId}`);

      const response = await this.axiosInstance.get(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes/${envelopeId}`
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch envelope ${envelopeId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get envelope recipients
   */
  async getEnvelopeRecipients(envelopeId: string): Promise<any> {
    try {
      logger.info(`Fetching recipients for envelope ${envelopeId}`);

      const response = await this.axiosInstance.get(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes/${envelopeId}/recipients`
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch envelope recipients:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Download envelope documents
   */
  async downloadEnvelopeDocuments(envelopeId: string): Promise<Buffer> {
    try {
      logger.info(`Downloading documents for envelope ${envelopeId}`);

      const response = await this.axiosInstance.get(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes/${envelopeId}/documents/combined`,
        {
          responseType: 'arraybuffer',
        }
      );

      logger.info(`Documents downloaded successfully`);
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download envelope documents:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Void envelope
   */
  async voidEnvelope(envelopeId: string, voidedReason: string): Promise<any> {
    try {
      logger.info(`Voiding envelope ${envelopeId}`);

      const response = await this.axiosInstance.put(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes/${envelopeId}`,
        {
          status: 'voided',
          voidedReason,
        }
      );

      logger.info(`Envelope voided successfully`);
      return response.data;
    } catch (error) {
      logger.error('Failed to void envelope:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List envelopes
   */
  async listEnvelopes(options?: {
    fromDate?: string;
    toDate?: string;
    status?: string;
    count?: number;
  }): Promise<any> {
    try {
      logger.info('Listing DocuSign envelopes');

      const params: any = {
        from_date: options?.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        count: options?.count || 100,
      };

      if (options?.toDate) params.to_date = options.toDate;
      if (options?.status) params.status = options.status;

      const response = await this.axiosInstance.get(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes`,
        { params }
      );

      const envelopes = response.data.envelopes || [];
      logger.info(`Found ${envelopes.length} envelopes`);
      return response.data;
    } catch (error) {
      logger.error('Failed to list envelopes:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get envelope custom fields
   */
  async getEnvelopeCustomFields(envelopeId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes/${envelopeId}/custom_fields`
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get custom fields:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Send reminder for envelope
   */
  async sendEnvelopeReminder(envelopeId: string): Promise<any> {
    try {
      logger.info(`Sending reminder for envelope ${envelopeId}`);

      const response = await this.axiosInstance.put(
        `/v2.1/accounts/${this.credentials.accountId}/envelopes/${envelopeId}/notification`,
        {
          reminders: {
            reminderEnabled: 'true',
            reminderDelay: '2',
            reminderFrequency: '2',
          },
        }
      );

      logger.info('Reminder sent successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to send reminder:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get list of templates
   */
  async listTemplates(): Promise<any> {
    try {
      logger.info('Listing DocuSign templates');

      const response = await this.axiosInstance.get(
        `/v2.1/accounts/${this.credentials.accountId}/templates`,
        {
          params: { count: 100 },
        }
      );

      const templates = response.data.envelopeTemplates || [];
      logger.info(`Found ${templates.length} templates`);
      return response.data;
    } catch (error) {
      logger.error('Failed to list templates:', error);
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
    const calculatedSignature = hmac.digest('base64');

    return calculatedSignature === signature;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const dsError = error.response?.data;
      if (dsError?.message) {
        return new Error(`DocuSign API Error: ${dsError.message}`);
      }
      return new Error(`DocuSign API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown DocuSign error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'DocuSign',
      accountId: this.credentials.accountId,
      tokenValid: this.credentials.accessToken ? true : false,
      tokenExpiry: this.credentials.tokenExpiry ? new Date(this.credentials.tokenExpiry).toISOString() : null,
      demo: this.isDemo,
      baseUrl: this.credentials.baseUrl,
    };
  }
}

// Export factory function
export function createDocuSignService(
  credentials: DocuSignCredentials,
  isDemo = false
): DocuSignService {
  return new DocuSignService(credentials, isDemo);
}
