/**
 * PandaDoc Service
 * Handles PandaDoc API operations for document workflow and e-signatures
 */

import { logger } from '../../services/LoggingService';
import axios, { AxiosInstance } from 'axios';

interface PandaDocCredentials {
  apiKey: string;
}

interface PandaDocRecipient {
  email: string;
  firstName: string;
  lastName: string;
  role: string; // 'signer' | 'approver' | 'cc'
  signingOrder?: number;
}

interface PandaDocCreateFromTemplateInput {
  templateId: string;
  name: string;
  recipients: PandaDocRecipient[];
  tokens?: Record<string, any>; // Template variables
  folderId?: string;
  tags?: string[];
  fields?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface PandaDocCreateFromPdfInput {
  name: string;
  url?: string;
  file?: Buffer;
  recipients: PandaDocRecipient[];
  parseFormFields?: boolean;
  folderId?: string;
  tags?: string[];
  fields?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class PandaDocService {
  private readonly baseURL = 'https://api.pandadoc.com/public/v1';
  private axiosInstance: AxiosInstance;
  private credentials: PandaDocCredentials;

  constructor(credentials: PandaDocCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `API-Key ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * DOCUMENT OPERATIONS
   */

  /**
   * Create document from template
   */
  async createDocumentFromTemplate(input: PandaDocCreateFromTemplateInput): Promise<any> {
    try {
      logger.info('Creating PandaDoc document from template');

      const response = await this.axiosInstance.post('/documents', {
        template_uuid: input.templateId,
        name: input.name,
        recipients: input.recipients.map(r => ({
          email: r.email,
          first_name: r.firstName,
          last_name: r.lastName,
          role: r.role,
          signing_order: r.signingOrder,
        })),
        tokens: input.tokens ? Object.entries(input.tokens).map(([name, value]) => ({
          name,
          value,
        })) : undefined,
        folder_uuid: input.folderId,
        tags: input.tags,
        fields: input.fields,
        metadata: input.metadata,
      });

      logger.info(`Document created from template: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create document from template:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create document from PDF
   */
  async createDocumentFromPdf(input: PandaDocCreateFromPdfInput): Promise<any> {
    try {
      logger.info('Creating PandaDoc document from PDF');

      const payload: any = {
        name: input.name,
        recipients: input.recipients.map(r => ({
          email: r.email,
          first_name: r.firstName,
          last_name: r.lastName,
          role: r.role,
          signing_order: r.signingOrder,
        })),
        parse_form_fields: input.parseFormFields !== false,
        folder_uuid: input.folderId,
        tags: input.tags,
        fields: input.fields,
        metadata: input.metadata,
      };

      if (input.url) {
        payload.url = input.url;
      } else if (input.file) {
        // For file upload, need to use multipart/form-data
        const formData = new FormData();
        formData.append('file', new Blob([input.file]), 'document.pdf');
        formData.append('data', JSON.stringify(payload));

        const response = await this.axiosInstance.post('/documents', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        logger.info(`Document created from PDF file: ${response.data.id}`);
        return response.data;
      }

      const response = await this.axiosInstance.post('/documents', payload);

      logger.info(`Document created from PDF URL: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create document from PDF:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get document details
   */
  async getDocument(documentId: string): Promise<any> {
    try {
      logger.info(`Fetching PandaDoc document: ${documentId}`);

      const response = await this.axiosInstance.get(`/documents/${documentId}/details`);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch document ${documentId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Get document status
   */
  async getDocumentStatus(documentId: string): Promise<any> {
    try {
      logger.info(`Fetching PandaDoc document status: ${documentId}`);

      const response = await this.axiosInstance.get(`/documents/${documentId}`);

      return {
        id: response.data.id,
        status: response.data.status,
        name: response.data.name,
        dateCreated: response.data.date_created,
        dateModified: response.data.date_modified,
        dateCompleted: response.data.date_completed,
        expirationDate: response.data.expiration_date,
      };
    } catch (error) {
      logger.error(`Failed to fetch document status ${documentId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Send document
   */
  async sendDocument(documentId: string, options?: {
    subject?: string;
    message?: string;
    silent?: boolean;
  }): Promise<any> {
    try {
      logger.info(`Sending PandaDoc document: ${documentId}`);

      const response = await this.axiosInstance.post(`/documents/${documentId}/send`, {
        subject: options?.subject,
        message: options?.message,
        silent: options?.silent || false,
      });

      logger.info('Document sent successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to send document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Download document
   */
  async downloadDocument(documentId: string, format: 'pdf' | 'original' = 'pdf'): Promise<Buffer> {
    try {
      logger.info(`Downloading PandaDoc document: ${documentId} (${format})`);

      const response = await this.axiosInstance.get(`/documents/${documentId}/download`, {
        params: { format },
        responseType: 'arraybuffer',
      });

      logger.info('Document downloaded successfully');
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      logger.info(`Deleting PandaDoc document: ${documentId}`);

      await this.axiosInstance.delete(`/documents/${documentId}`);

      logger.info('Document deleted successfully');
    } catch (error) {
      logger.error('Failed to delete document:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List documents
   */
  async listDocuments(options?: {
    status?: string;
    tag?: string;
    count?: number;
    page?: number;
    orderBy?: string;
    folderId?: string;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<any> {
    try {
      logger.info('Listing PandaDoc documents');

      const params: any = {
        count: options?.count || 100,
        page: options?.page || 1,
      };

      if (options?.status) params.status = options.status;
      if (options?.tag) params.tag = options.tag;
      if (options?.orderBy) params.order_by = options.orderBy;
      if (options?.folderId) params.folder_uuid = options.folderId;
      if (options?.createdFrom) params.created_from = options.createdFrom;
      if (options?.createdTo) params.created_to = options.createdTo;

      const response = await this.axiosInstance.get('/documents', { params });

      const documents = response.data.results || [];
      logger.info(`Found ${documents.length} documents`);

      return {
        documents,
        count: response.data.count,
        page: params.page,
      };
    } catch (error) {
      logger.error('Failed to list documents:', error);
      throw this.handleError(error);
    }
  }

  /**
   * TEMPLATE OPERATIONS
   */

  /**
   * List templates
   */
  async listTemplates(options?: {
    tag?: string;
    count?: number;
    page?: number;
    folderId?: string;
  }): Promise<any> {
    try {
      logger.info('Listing PandaDoc templates');

      const params: any = {
        count: options?.count || 100,
        page: options?.page || 1,
      };

      if (options?.tag) params.tag = options.tag;
      if (options?.folderId) params.folder_uuid = options.folderId;

      const response = await this.axiosInstance.get('/templates', { params });

      const templates = response.data.results || [];
      logger.info(`Found ${templates.length} templates`);

      return {
        templates,
        count: response.data.count,
        page: params.page,
      };
    } catch (error) {
      logger.error('Failed to list templates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get template details
   */
  async getTemplate(templateId: string): Promise<any> {
    try {
      logger.info(`Fetching PandaDoc template: ${templateId}`);

      const response = await this.axiosInstance.get(`/templates/${templateId}/details`);

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch template ${templateId}:`, error);
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
      logger.info('Listing PandaDoc webhooks');

      const response = await this.axiosInstance.get('/webhooks');

      const webhooks = response.data.results || [];
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
    url: string;
    event: string;
    shared_key?: string;
  }): Promise<any> {
    try {
      logger.info('Creating PandaDoc webhook');

      const response = await this.axiosInstance.post('/webhooks', {
        url: webhook.url,
        event: webhook.event,
        shared_key: webhook.shared_key,
      });

      logger.info(`Webhook created successfully: ${response.data.uuid}`);
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
      logger.info(`Deleting PandaDoc webhook: ${webhookId}`);

      await this.axiosInstance.delete(`/webhooks/${webhookId}`);

      logger.info('Webhook deleted successfully');
    } catch (error) {
      logger.error('Failed to delete webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * FOLDER OPERATIONS
   */

  /**
   * List folders
   */
  async listFolders(options?: {
    parentId?: string;
    count?: number;
    page?: number;
  }): Promise<any> {
    try {
      logger.info('Listing PandaDoc folders');

      const params: any = {
        count: options?.count || 100,
        page: options?.page || 1,
      };

      if (options?.parentId) params.parent_uuid = options.parentId;

      const response = await this.axiosInstance.get('/documents/folders', { params });

      const folders = response.data.results || [];
      logger.info(`Found ${folders.length} folders`);

      return {
        folders,
        count: response.data.count,
        page: params.page,
      };
    } catch (error) {
      logger.error('Failed to list folders:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create folder
   */
  async createFolder(folder: {
    name: string;
    parentId?: string;
  }): Promise<any> {
    try {
      logger.info('Creating PandaDoc folder');

      const response = await this.axiosInstance.post('/documents/folders', {
        name: folder.name,
        parent_uuid: folder.parentId,
      });

      logger.info(`Folder created successfully: ${response.data.uuid}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create folder:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const pdError = error.response?.data;
      if (pdError?.detail) {
        return new Error(`PandaDoc API Error: ${pdError.detail}`);
      }
      if (pdError?.message) {
        return new Error(`PandaDoc API Error: ${pdError.message}`);
      }
      return new Error(`PandaDoc API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown PandaDoc error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'PandaDoc',
      authenticated: this.credentials.apiKey ? true : false,
    };
  }
}

// Export factory function
export function createPandaDocService(credentials: PandaDocCredentials): PandaDocService {
  return new PandaDocService(credentials);
}
