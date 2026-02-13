/**
 * DocuSign Integration System
 * Main orchestrator for electronic signature and document management
 * Delegates to specialized services for specific operations
 */

import { EventEmitter } from 'events';

// Import from docusign subdirectory
import { DocuSignAuthManager } from './docusign/AuthClient';
import { EnvelopeService } from './docusign/EnvelopeService';
import { TemplateService } from './docusign/TemplateService';
import { SignerService, BulkSendService } from './docusign/SignerService';
import { WebhookHandler, RateLimiter } from './docusign/WebhookHandler';

// Re-export types for backward compatibility
export * from './docusign/types';

import type {
  DocuSignConfig,
  DocuSignAuth,
  DocuSignStats,
  EnvelopeDefinition,
  EnvelopeSummary,
  Document,
  Recipients,
  RecipientViewRequest,
  RecipientViewResponse,
  Tabs,
  Template,
  TemplateRole,
  EventNotification,
  BulkSendingList,
  BulkSendingCopy,
  UserInfo
} from './docusign/types';

/**
 * Main DocuSign Integration System
 */
export class DocuSignIntegration extends EventEmitter {
  private static instance: DocuSignIntegration;

  private config: DocuSignConfig;
  private authManager: DocuSignAuthManager;
  private envelopeService: EnvelopeService;
  private templateService: TemplateService;
  private signerService: SignerService;
  private webhookHandler: WebhookHandler;
  private bulkSendService: BulkSendService;
  private cache: Map<string, { data: any; expiry: Date }>;
  private stats: DocuSignStats;
  private rateLimiter: RateLimiter;

  private constructor() {
    super();
    this.cache = new Map();
    this.stats = this.getDefaultStats();
    this.config = this.getDefaultConfig();

    // Initialize services
    this.authManager = new DocuSignAuthManager(this.config.auth);
    this.envelopeService = new EnvelopeService(this.authManager, this.config);
    this.templateService = new TemplateService(this.authManager, this.config);
    this.signerService = new SignerService(this.authManager, this.config);
    this.webhookHandler = new WebhookHandler(this.config);
    this.bulkSendService = new BulkSendService(this.authManager, this.config);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
  }

  public static getInstance(): DocuSignIntegration {
    if (!DocuSignIntegration.instance) {
      DocuSignIntegration.instance = new DocuSignIntegration();
    }
    return DocuSignIntegration.instance;
  }

  // Configuration
  private getDefaultConfig(): DocuSignConfig {
    return {
      auth: { integrationKey: '', secretKey: '', redirectUri: '', environment: 'demo' },
      webhooksEnabled: false,
      embeddedSigningEnabled: true,
      bulkSendEnabled: false,
      templatesEnabled: true,
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      rateLimit: { maxRequests: 1000, windowMs: 60000 }
    };
  }

  private getDefaultStats(): DocuSignStats {
    return {
      totalEnvelopes: 0, sentEnvelopes: 0, completedEnvelopes: 0,
      voidedEnvelopes: 0, declinedEnvelopes: 0, totalTemplates: 0,
      webhooksReceived: 0, webhooksProcessed: 0, bulkSendJobs: 0,
      averageCompletionTime: 0
    };
  }

  public configure(config: Partial<DocuSignConfig>): void {
    this.config = { ...this.config, ...config };
    this.authManager.updateAuth(this.config.auth);
    this.emit('configured', this.config);
  }

  // Authentication
  public async getConsentUrl(scopes?: string[]): Promise<string> {
    return this.authManager.getConsentUrl(scopes);
  }

  public async exchangeAuthorizationCode(code: string): Promise<void> {
    await this.authManager.exchangeAuthorizationCode(code);
    this.emit('authenticated');
  }

  public async refreshAccessToken(): Promise<void> {
    await this.authManager.refreshAccessToken();
    this.emit('tokenRefreshed');
  }

  public async getUserInfo(): Promise<UserInfo> {
    return this.authManager.getUserInfo();
  }

  // Envelope Operations
  public async createEnvelope(envelope: EnvelopeDefinition): Promise<EnvelopeSummary> {
    return this.executeWithRetry(async () => {
      const result = await this.envelopeService.create(envelope);
      this.stats.totalEnvelopes++;
      if (envelope.status === 'sent') this.stats.sentEnvelopes++;
      this.emit('envelopeCreated', result);
      return result;
    });
  }

  public async getEnvelope(envelopeId: string): Promise<EnvelopeDefinition> {
    return this.executeWithRetry(async () => {
      const cached = this.getCached(`envelope:${envelopeId}`);
      if (cached) return cached;
      const envelope = await this.envelopeService.get(envelopeId);
      this.setCached(`envelope:${envelopeId}`, envelope, 60000);
      return envelope;
    });
  }

  public async updateEnvelope(envelopeId: string, envelope: Partial<EnvelopeDefinition>): Promise<EnvelopeSummary> {
    return this.executeWithRetry(async () => {
      const result = await this.envelopeService.update(envelopeId, envelope);
      this.invalidateCache(`envelope:${envelopeId}`);
      this.emit('envelopeUpdated', result);
      return result;
    });
  }

  public async sendEnvelope(envelopeId: string): Promise<EnvelopeSummary> {
    return this.executeWithRetry(async () => {
      const result = await this.envelopeService.send(envelopeId);
      this.stats.sentEnvelopes++;
      this.invalidateCache(`envelope:${envelopeId}`);
      this.emit('envelopeSent', result);
      return result;
    });
  }

  public async voidEnvelope(envelopeId: string, voidReason: string): Promise<EnvelopeSummary> {
    return this.executeWithRetry(async () => {
      const result = await this.envelopeService.void(envelopeId, voidReason);
      this.stats.voidedEnvelopes++;
      this.invalidateCache(`envelope:${envelopeId}`);
      this.emit('envelopeVoided', result);
      return result;
    });
  }

  public async listEnvelopes(fromDate?: Date, status?: string, searchText?: string): Promise<EnvelopeDefinition[]> {
    return this.executeWithRetry(() => this.envelopeService.list(fromDate, status, searchText));
  }

  public async getEnvelopeDocuments(envelopeId: string): Promise<Document[]> {
    return this.executeWithRetry(() => this.envelopeService.getDocuments(envelopeId));
  }

  public async downloadDocument(envelopeId: string, documentId: string, format?: 'pdf' | 'combined'): Promise<Buffer> {
    return this.executeWithRetry(() => this.envelopeService.downloadDocument(envelopeId, documentId, format));
  }

  // Recipient Operations
  public async addRecipients(envelopeId: string, recipients: Recipients): Promise<Recipients> {
    return this.executeWithRetry(async () => {
      const result = await this.signerService.add(envelopeId, recipients);
      this.invalidateCache(`envelope:${envelopeId}`);
      this.emit('recipientsAdded', { envelopeId, recipients: result });
      return result;
    });
  }

  public async updateRecipients(envelopeId: string, recipients: Recipients): Promise<Recipients> {
    return this.executeWithRetry(async () => {
      const result = await this.signerService.update(envelopeId, recipients);
      this.invalidateCache(`envelope:${envelopeId}`);
      this.emit('recipientsUpdated', { envelopeId, recipients: result });
      return result;
    });
  }

  public async deleteRecipient(envelopeId: string, recipientId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.signerService.delete(envelopeId, recipientId);
      this.invalidateCache(`envelope:${envelopeId}`);
      this.emit('recipientDeleted', { envelopeId, recipientId });
    });
  }

  public async listRecipients(envelopeId: string): Promise<Recipients> {
    return this.executeWithRetry(() => this.signerService.list(envelopeId));
  }

  public async createRecipientView(envelopeId: string, viewRequest: RecipientViewRequest): Promise<RecipientViewResponse> {
    return this.executeWithRetry(async () => {
      const result = await this.signerService.createView(envelopeId, viewRequest);
      this.emit('recipientViewCreated', { envelopeId, url: result.url });
      return result;
    });
  }

  public async updateRecipientTabs(envelopeId: string, recipientId: string, tabs: Tabs): Promise<Tabs> {
    return this.executeWithRetry(async () => {
      const result = await this.signerService.updateTabs(envelopeId, recipientId, tabs);
      this.emit('tabsUpdated', { envelopeId, recipientId, tabs: result });
      return result;
    });
  }

  // Template Operations
  public async createTemplate(template: Template): Promise<Template> {
    return this.executeWithRetry(async () => {
      const result = await this.templateService.create(template);
      this.stats.totalTemplates++;
      this.emit('templateCreated', result);
      return result;
    });
  }

  public async getTemplate(templateId: string): Promise<Template> {
    return this.executeWithRetry(async () => {
      const cached = this.getCached(`template:${templateId}`);
      if (cached) return cached;
      const template = await this.templateService.get(templateId);
      this.setCached(`template:${templateId}`, template, 300000);
      return template;
    });
  }

  public async updateTemplate(templateId: string, template: Partial<Template>): Promise<Template> {
    return this.executeWithRetry(async () => {
      const result = await this.templateService.update(templateId, template);
      this.invalidateCache(`template:${templateId}`);
      this.emit('templateUpdated', result);
      return result;
    });
  }

  public async deleteTemplate(templateId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.templateService.delete(templateId);
      this.stats.totalTemplates--;
      this.invalidateCache(`template:${templateId}`);
      this.emit('templateDeleted', { templateId });
    });
  }

  public async listTemplates(searchText?: string, shared?: boolean): Promise<Template[]> {
    return this.executeWithRetry(() => this.templateService.list(searchText, shared));
  }

  public async createEnvelopeFromTemplate(templateId: string, templateRoles: TemplateRole[], status?: 'created' | 'sent'): Promise<EnvelopeSummary> {
    return this.executeWithRetry(async () => {
      const envelope: EnvelopeDefinition = { templateId, templateRoles, status: status || 'sent', emailSubject: 'Document for Signature' };
      return this.createEnvelope(envelope);
    });
  }

  // Webhook Operations
  public async configureWebhook(url: string, events: string[], includeDocuments?: boolean): Promise<EventNotification> {
    const config = this.webhookHandler.createEventNotificationConfig(url, events, { includeDocuments });
    await this.webhookHandler.configure(config);
    this.emit('webhookConfigured', config);
    return config;
  }

  public async processWebhookEvent(payload: any, signature?: string): Promise<void> {
    if (signature && !this.webhookHandler.verifySignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }
    await this.webhookHandler.processEvent(payload);
    this.stats.webhooksReceived++;
    if (payload.envelopeStatus) {
      if (payload.envelopeStatus === 'completed') this.stats.completedEnvelopes++;
      else if (payload.envelopeStatus === 'declined') this.stats.declinedEnvelopes++;
      else if (payload.envelopeStatus === 'voided') this.stats.voidedEnvelopes++;
    }
    this.stats.webhooksProcessed++;
    this.emit('webhookProcessed', payload);
  }

  // Bulk Send Operations
  public async createBulkSendList(name: string, recipients: BulkSendingCopy[]): Promise<BulkSendingList> {
    return this.executeWithRetry(async () => {
      const result = await this.bulkSendService.createList(name, recipients);
      this.emit('bulkSendListCreated', result);
      return result;
    });
  }

  public async sendBulk(envelopeOrTemplateId: string, bulkListId: string, name?: string): Promise<string> {
    return this.executeWithRetry(async () => {
      const batchId = await this.bulkSendService.send(envelopeOrTemplateId, bulkListId, name);
      this.stats.bulkSendJobs++;
      this.emit('bulkSendStarted', { batchId, envelopeOrTemplateId, bulkListId });
      return batchId;
    });
  }

  public async getBulkSendStatus(batchId: string): Promise<any> {
    return this.executeWithRetry(() => this.bulkSendService.getStatus(batchId));
  }

  // Utility Methods
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.rateLimiter.checkLimit();
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    this.stats.lastError = lastError;
    throw lastError;
  }

  private getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > new Date()) return cached.data;
    this.cache.delete(key);
    return null;
  }

  private setCached(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, { data, expiry: new Date(Date.now() + ttlMs) });
  }

  private invalidateCache(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => { if (key.includes(pattern)) keysToDelete.push(key); });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Statistics
  public getStatistics(): DocuSignStats { return { ...this.stats }; }
  public resetStatistics(): void { this.stats = this.getDefaultStats(); }
  public clearCache(): void { this.cache.clear(); }
}

// Export singleton instance
export const docuSignIntegration = DocuSignIntegration.getInstance();
