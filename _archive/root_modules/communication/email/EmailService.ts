import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface EmailMessage {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  subject: string;
  body: EmailBody;
  attachments?: EmailAttachment[];
  headers?: { [key: string]: string };
  priority: 'low' | 'normal' | 'high';
  tracking?: EmailTracking;
  template?: EmailTemplate;
  metadata: {
    timestamp: number;
    tenantId?: string;
    userId?: string;
    workflowId?: string;
    executionId?: string;
    campaignId?: string;
    messageId: string;
    references?: string[];
    inReplyTo?: string;
    listUnsubscribe?: string;
    contentLanguage?: string;
  };
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailBody {
  text?: string;
  html?: string;
  amp?: string;
  calendar?: CalendarEvent;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  contentDisposition?: 'attachment' | 'inline';
  contentId?: string;
  encoding?: 'base64' | 'binary' | '7bit' | '8bit' | 'quoted-printable';
  size?: number;
}

export interface EmailTracking {
  enabled: boolean;
  openTracking: boolean;
  clickTracking: boolean;
  bounceTracking: boolean;
  customDomain?: string;
  trackingId?: string;
  utmParameters?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: EmailBody;
  variables: { [key: string]: unknown };
  conditions?: TemplateCondition[];
  localization?: { [locale: string]: EmailTemplateLocale };
}

export interface TemplateCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
  template: Partial<EmailTemplate>;
}

export interface EmailTemplateLocale {
  subject: string;
  body: EmailBody;
}

export interface CalendarEvent {
  method: 'REQUEST' | 'REPLY' | 'CANCEL';
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  organizer: EmailAddress;
  attendees?: Array<{
    email: string;
    name?: string;
    role: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT';
    status: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
  }>;
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval?: number;
    byDay?: string[];
    until?: Date;
    count?: number;
  };
}

export interface EmailDeliveryStatus {
  messageId: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'bounced' | 'failed' | 'complained' | 'unsubscribed';
  timestamp: number;
  provider?: string;
  providerMessageId?: string;
  error?: {
    code: string;
    message: string;
    category: 'permanent' | 'temporary';
  };
  events: EmailEvent[];
}

export interface EmailEvent {
  type: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  timestamp: number;
  data?: {
    ip?: string;
    userAgent?: string;
    url?: string;
    reason?: string;
    bounceType?: 'hard' | 'soft';
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
  };
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template: EmailTemplate;
  recipients: EmailRecipientList;
  schedule?: EmailSchedule;
  settings: CampaignSettings;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  statistics: CampaignStatistics;
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    tags: string[];
  };
}

export interface EmailRecipientList {
  id: string;
  name: string;
  type: 'static' | 'dynamic' | 'segment';
  recipients: EmailRecipient[];
  query?: string;
  filters?: RecipientFilter[];
  segmentation?: {
    field: string;
    segments: Array<{
      name: string;
      condition: unknown;
      template?: Partial<EmailTemplate>;
    }>;
  };
}

export interface EmailRecipient {
  email: string;
  name?: string;
  customFields?: { [key: string]: unknown };
  subscriptionStatus: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  subscriptionDate?: number;
  unsubscriptionDate?: number;
  lastEmailDate?: number;
  tags?: string[];
  preferences?: {
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
    topics: string[];
    format: 'html' | 'text';
  };
}

export interface RecipientFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
}

export interface EmailSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  sendAt?: number;
  timezone?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: number;
    maxSends?: number;
  };
  throttling?: {
    maxPerHour: number;
    maxPerDay: number;
    batchSize: number;
    batchDelay: number;
  };
}

export interface CampaignSettings {
  trackOpens: boolean;
  trackClicks: boolean;
  unsubscribeLink: boolean;
  customUnsubscribeUrl?: string;
  bounceHandling: boolean;
  suppressionList: string[];
  abTesting?: {
    enabled: boolean;
    testPercent: number;
    winnerCriteria: 'open_rate' | 'click_rate' | 'conversion_rate';
    testDuration: number;
    variants: Array<{
      name: string;
      percentage: number;
      template: Partial<EmailTemplate>;
    }>;
  };
}

export interface CampaignStatistics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
  unsubscribeRate: number;
  deliveryRate: number;
  topLinks?: Array<{
    url: string;
    clicks: number;
  }>;
  topLocations?: Array<{
    country: string;
    opens: number;
    clicks: number;
  }>;
  deviceStats?: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface EmailProvider {
  name: string;
  type: 'smtp' | 'api' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark';
  config: EmailProviderConfig;
  limits: {
    messagesPerHour: number;
    messagesPerDay: number;
    maxRecipients: number;
    maxAttachmentSize: number;
    maxMessageSize: number;
  };
  features: {
    tracking: boolean;
    templates: boolean;
    webhooks: boolean;
    scheduling: boolean;
    abTesting: boolean;
  };
  status: 'active' | 'inactive' | 'error';
  priority: number;
  healthCheck?: {
    lastCheck: number;
    healthy: boolean;
    error?: string;
  };
}

export interface EmailProviderConfig {
  // SMTP
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  
  // API-based
  apiKey?: string;
  apiSecret?: string;
  region?: string;
  endpoint?: string;
  
  // Provider-specific
  domain?: string;
  webhookSecret?: string;
  
  // Connection settings
  timeout?: number;
  maxConnections?: number;
  rateLimiting?: {
    enabled: boolean;
    requests: number;
    window: number;
  };
}

export interface EmailServiceConfig {
  providers: EmailProvider[];
  defaultProvider?: string;
  failover: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    healthCheckInterval: number;
  };
  templates: {
    directory: string;
    cacheSize: number;
    reloadOnChange: boolean;
  };
  tracking: {
    domain: string;
    pixelTracking: boolean;
    linkTracking: boolean;
    utmTracking: boolean;
    cookieDomain?: string;
  };
  security: {
    dkim: {
      enabled: boolean;
      privateKey?: string;
      selector?: string;
      domain?: string;
    };
    spf: {
      enabled: boolean;
      record?: string;
    };
    dmarc: {
      enabled: boolean;
      policy: 'none' | 'quarantine' | 'reject';
      percentage?: number;
    };
  };
  compliance: {
    gdpr: boolean;
    canSpam: boolean;
    suppressionLists: string[];
    unsubscribeHandling: boolean;
    bounceHandling: boolean;
  };
  performance: {
    batchSize: number;
    maxConcurrent: number;
    queueSize: number;
    retentionDays: number;
  };
}

export class EmailService extends EventEmitter {
  private config: EmailServiceConfig;
  private providers: Map<string, EmailProvider> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();
  private campaigns: Map<string, EmailCampaign> = new Map();
  private recipientLists: Map<string, EmailRecipientList> = new Map();
  private deliveryStatuses: Map<string, EmailDeliveryStatus> = new Map();
  private messageQueue: EmailMessage[] = [];
  private sendingQueue: EmailMessage[] = [];
  private processingMessages: Set<string> = new Set();
  private suppressionList: Set<string> = new Set();
  private isProcessing = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: EmailServiceConfig) {
    super();
    this.config = config;
    this.initializeProviders();
    this.startHealthChecks();
    this.startMessageProcessor();
  }

  // Message Operations
  public async sendEmail(message: Omit<EmailMessage, 'id' | 'metadata'>): Promise<string> {
    const emailMessage: EmailMessage = {
      id: crypto.randomUUID(),
      metadata: {
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      },
      ...message
    };

    // Validate message
    await this.validateMessage(emailMessage);

    // Check suppression list
    const suppressedRecipients = this.checkSuppressionList(emailMessage);
    if (suppressedRecipients.length > 0) {
      this.emit('email:suppressed', { messageId: emailMessage.id, suppressedRecipients });
    }

    // Remove suppressed recipients
    emailMessage.to = emailMessage.to.filter(addr => !suppressedRecipients.includes(addr.email));
    
    if (emailMessage.to.length === 0) {
      throw new Error('All recipients are suppressed');
    }

    // Apply template if specified
    if (emailMessage.template) {
      await this.applyTemplate(emailMessage);
    }

    // Add tracking if enabled
    if (emailMessage.tracking?.enabled) {
      await this.addTracking(emailMessage);
    }

    // Queue message for sending
    this.messageQueue.push(emailMessage);

    // Initialize delivery status
    const deliveryStatus: EmailDeliveryStatus = {
      messageId: emailMessage.id,
      status: 'queued',
      timestamp: Date.now(),
      events: [{
        type: 'queued',
        timestamp: Date.now()
      }]
    };

    this.deliveryStatuses.set(emailMessage.id, deliveryStatus);

    this.emit('email:queued', emailMessage);
    return emailMessage.id;
  }

  public async sendBulkEmail(messages: Array<Omit<EmailMessage, 'id' | 'metadata'>>): Promise<string[]> {
    const messageIds: string[] = [];

    for (const message of messages) {
      try {
        const messageId = await this.sendEmail(message);
        messageIds.push(messageId);
      } catch (error) {
        this.emit('bulk:send:error', { message, error });
      }
    }

    this.emit('bulk:send:completed', { total: messages.length, sent: messageIds.length });
    return messageIds;
  }

  public async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus | undefined> {
    return this.deliveryStatuses.get(messageId);
  }

  public async getDeliveryStatuses(messageIds: string[]): Promise<EmailDeliveryStatus[]> {
    return messageIds
      .map(id => this.deliveryStatuses.get(id))
      .filter(status => status !== undefined) as EmailDeliveryStatus[];
  }

  // Template Operations
  public async createTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
    const emailTemplate: EmailTemplate = {
      id: crypto.randomUUID(),
      ...template
    };

    // Validate template
    await this.validateTemplate(emailTemplate);

    this.templates.set(emailTemplate.id, emailTemplate);
    this.emit('template:created', emailTemplate);
    
    return emailTemplate;
  }

  public async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    const updatedTemplate = { ...template, ...updates };
    await this.validateTemplate(updatedTemplate);

    this.templates.set(id, updatedTemplate);
    this.emit('template:updated', updatedTemplate);
    
    return updatedTemplate;
  }

  public async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    this.templates.delete(id);
    this.emit('template:deleted', template);
  }

  public getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.get(id);
  }

  public getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  // Campaign Operations
  public async createCampaign(campaign: Omit<EmailCampaign, 'id' | 'status' | 'statistics' | 'metadata'>): Promise<EmailCampaign> {
    const emailCampaign: EmailCampaign = {
      id: crypto.randomUUID(),
      status: 'draft',
      statistics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        complaintRate: 0,
        unsubscribeRate: 0,
        deliveryRate: 0
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        tags: []
      },
      ...campaign
    };

    this.campaigns.set(emailCampaign.id, emailCampaign);
    this.emit('campaign:created', emailCampaign);
    
    return emailCampaign;
  }

  public async sendCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error(`Campaign cannot be sent in status: ${campaign.status}`);
    }

    campaign.status = 'sending';
    campaign.metadata.updatedAt = Date.now();

    // Get recipients
    const recipients = await this.getRecipients(campaign.recipients);

    // Apply A/B testing if configured
    const recipientGroups = campaign.settings.abTesting?.enabled 
      ? this.createABTestGroups(recipients, campaign.settings.abTesting)
      : [{ recipients, template: campaign.template }];

    // Send emails in batches
    for (const group of recipientGroups) {
      await this.sendCampaignBatch(campaign, group.recipients, group.template);
    }

    campaign.status = 'sent';
    campaign.metadata.updatedAt = Date.now();

    this.emit('campaign:sent', campaign);
  }

  public async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = 'paused';
    campaign.metadata.updatedAt = Date.now();

    this.emit('campaign:paused', campaign);
  }

  public async cancelCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = 'cancelled';
    campaign.metadata.updatedAt = Date.now();

    this.emit('campaign:cancelled', campaign);
  }

  public getCampaign(id: string): EmailCampaign | undefined {
    return this.campaigns.get(id);
  }

  public getAllCampaigns(): EmailCampaign[] {
    return Array.from(this.campaigns.values());
  }

  // Recipient List Operations
  public async createRecipientList(list: Omit<EmailRecipientList, 'id'>): Promise<EmailRecipientList> {
    const recipientList: EmailRecipientList = {
      id: crypto.randomUUID(),
      ...list
    };

    this.recipientLists.set(recipientList.id, recipientList);
    this.emit('recipient_list:created', recipientList);
    
    return recipientList;
  }

  public async addRecipient(listId: string, recipient: EmailRecipient): Promise<void> {
    const list = this.recipientLists.get(listId);
    if (!list) {
      throw new Error(`Recipient list not found: ${listId}`);
    }

    // Check if recipient already exists
    const existingIndex = list.recipients.findIndex(r => r.email === recipient.email);
    if (existingIndex >= 0) {
      list.recipients[existingIndex] = recipient;
    } else {
      list.recipients.push(recipient);
    }

    this.emit('recipient:added', { listId, recipient });
  }

  public async removeRecipient(listId: string, email: string): Promise<void> {
    const list = this.recipientLists.get(listId);
    if (!list) {
      throw new Error(`Recipient list not found: ${listId}`);
    }

    const index = list.recipients.findIndex(r => r.email === email);
    if (index >= 0) {
      list.recipients.splice(index, 1);
      this.emit('recipient:removed', { listId, email });
    }
  }

  public async unsubscribeRecipient(email: string, reason?: string): Promise<void> {
    this.suppressionList.add(email);

    // Update recipient in all lists
    for (const list of this.recipientLists.values()) {
      const recipient = list.recipients.find(r => r.email === email);
      if (recipient) {
        recipient.subscriptionStatus = 'unsubscribed';
        recipient.unsubscriptionDate = Date.now();
      }
    }

    this.emit('recipient:unsubscribed', { email, reason });
  }

  // Provider Operations
  public async addProvider(provider: EmailProvider): Promise<void> {
    await this.validateProvider(provider);
    this.providers.set(provider.name, provider);
    this.emit('provider:added', provider);
  }

  public async removeProvider(name: string): Promise<void> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }

    this.providers.delete(name);
    this.emit('provider:removed', provider);
  }

  public async testProvider(name: string): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }

    try {
      await this.performProviderHealthCheck(provider);
      return true;
    } catch (error) {
      this.emit('provider:test:failed', { provider, error });
      return false;
    }
  }

  // Private Methods
  private initializeProviders(): void {
    for (const provider of this.config.providers) {
      this.providers.set(provider.name, provider);
    }
  }

  private startHealthChecks(): void {
    if (!this.config.failover.enabled) return;

    this.healthCheckInterval = setInterval(async () => {
      for (const provider of this.providers.values()) {
        try {
          await this.performProviderHealthCheck(provider);
          provider.status = 'active';
          if (provider.healthCheck) {
            provider.healthCheck.healthy = true;
            provider.healthCheck.lastCheck = Date.now();
            delete provider.healthCheck.error;
          }
        } catch (error) {
          provider.status = 'error';
          if (provider.healthCheck) {
            provider.healthCheck.healthy = false;
            provider.healthCheck.lastCheck = Date.now();
            provider.healthCheck.error = error.message;
          }
          this.emit('provider:health:failed', { provider, error });
        }
      }
    }, this.config.failover.healthCheckInterval);
  }

  private startMessageProcessor(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processMessageQueue();
  }

  private async processMessageQueue(): Promise<void> {
    while (this.isProcessing) {
      if (this.messageQueue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const batch = this.messageQueue.splice(0, this.config.performance.batchSize);
      
      for (const message of batch) {
        if (this.processingMessages.has(message.id)) continue;
        
        this.processingMessages.add(message.id);
        this.sendMessage(message).finally(() => {
          this.processingMessages.delete(message.id);
        });
      }

      // Throttle processing
      if (batch.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private async sendMessage(message: EmailMessage): Promise<void> {
    const deliveryStatus = this.deliveryStatuses.get(message.id);
    if (!deliveryStatus) return;

    deliveryStatus.status = 'sending';
    deliveryStatus.events.push({
      type: 'sent',
      timestamp: Date.now()
    });

    try {
      const provider = await this.selectProvider(message);
      
      switch (provider.type) {
        case 'smtp':
          await this.sendViaSMTP(message, provider);
          break;
        case 'sendgrid':
          await this.sendViaSendGrid(message, provider);
          break;
        case 'mailgun':
          await this.sendViaMailgun(message, provider);
          break;
        case 'ses':
          await this.sendViaSES(message, provider);
          break;
        case 'postmark':
          await this.sendViaPostmark(message, provider);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      deliveryStatus.status = 'sent';
      deliveryStatus.provider = provider.name;
      deliveryStatus.events.push({
        type: 'delivered',
        timestamp: Date.now()
      });

      this.emit('email:sent', { message, provider });

    } catch (error) {
      deliveryStatus.status = 'failed';
      deliveryStatus.error = {
        code: error.code || 'SEND_ERROR',
        message: error.message,
        category: error.permanent ? 'permanent' : 'temporary'
      };

      this.emit('email:failed', { message, error });

      // Retry with different provider if configured
      if (this.config.failover.enabled && !error.permanent) {
        await this.retryWithFailover(message);
      }
    }
  }

  private async selectProvider(_message: EmailMessage): Promise<EmailProvider> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Get active providers sorted by priority
    const activeProviders = Array.from(this.providers.values())
      .filter(p => p.status === 'active')
      .sort((a, b) => a.priority - b.priority);

    if (activeProviders.length === 0) {
      throw new Error('No active email providers available');
    }

    // Use default provider if specified and active
    if (this.config.defaultProvider) {
      const defaultProvider = activeProviders.find(p => p.name === this.config.defaultProvider);
      if (defaultProvider) {
        return defaultProvider;
      }
    }

    // Return first active provider
    return activeProviders[0];
  }

  private async sendViaSMTP(message: EmailMessage, provider: EmailProvider): Promise<void> {
    console.log(`Sending email ${message.id} via SMTP provider ${provider.name}`);
    // Mock SMTP sending
  }

  private async sendViaSendGrid(message: EmailMessage, provider: EmailProvider): Promise<void> {
    console.log(`Sending email ${message.id} via SendGrid provider ${provider.name}`);
    // Mock SendGrid API call
  }

  private async sendViaMailgun(message: EmailMessage, provider: EmailProvider): Promise<void> {
    console.log(`Sending email ${message.id} via Mailgun provider ${provider.name}`);
    // Mock Mailgun API call
  }

  private async sendViaSES(message: EmailMessage, provider: EmailProvider): Promise<void> {
    console.log(`Sending email ${message.id} via SES provider ${provider.name}`);
    // Mock AWS SES API call
  }

  private async sendViaPostmark(message: EmailMessage, provider: EmailProvider): Promise<void> {
    console.log(`Sending email ${message.id} via Postmark provider ${provider.name}`);
    // Mock Postmark API call
  }

  private async retryWithFailover(message: EmailMessage): Promise<void> {
    // Implement failover retry logic
    console.log(`Retrying email ${message.id} with failover`);
  }

  private async validateMessage(message: EmailMessage): Promise<void> {
    if (!message.from || !message.from.email) {
      throw new Error('From address is required');
    }

    if (!message.to || message.to.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!message.subject) {
      throw new Error('Subject is required');
    }

    if (!message.body.text && !message.body.html) {
      throw new Error('Message body is required');
    }

    // Validate email addresses
    for (const addr of [message.from, ...message.to, ...(message.cc || []), ...(message.bcc || [])]) {
      if (!this.isValidEmail(addr.email)) {
        throw new Error(`Invalid email address: ${addr.email}`);
      }
    }
  }

  private async validateTemplate(template: EmailTemplate): Promise<void> {
    if (!template.name) {
      throw new Error('Template name is required');
    }

    if (!template.subject) {
      throw new Error('Template subject is required');
    }

    if (!template.body.text && !template.body.html) {
      throw new Error('Template body is required');
    }
  }

  private async validateProvider(provider: EmailProvider): Promise<void> {
    if (!provider.name) {
      throw new Error('Provider name is required');
    }

    if (!provider.type) {
      throw new Error('Provider type is required');
    }

    if (!provider.config) {
      throw new Error('Provider configuration is required');
    }
  }

  private checkSuppressionList(message: EmailMessage): string[] {
    const suppressedRecipients: string[] = [];

    for (const recipient of message.to) {
      if (this.suppressionList.has(recipient.email)) {
        suppressedRecipients.push(recipient.email);
      }
    }

    return suppressedRecipients;
  }

  private async applyTemplate(message: EmailMessage): Promise<void> {
    if (!message.template) return;

    const template = this.templates.get(message.template.id);
    if (!template) {
      throw new Error(`Template not found: ${message.template.id}`);
    }

    // Apply template variables
    message.subject = this.interpolateTemplate(template.subject, message.template.variables);
    
    if (template.body.text) {
      message.body.text = this.interpolateTemplate(template.body.text, message.template.variables);
    }
    
    if (template.body.html) {
      message.body.html = this.interpolateTemplate(template.body.html, message.template.variables);
    }

    // Apply conditional templates
    if (template.conditions) {
      for (const condition of template.conditions) {
        if (this.evaluateCondition(condition, message.template.variables)) {
          if (condition.template.subject) {
            message.subject = this.interpolateTemplate(condition.template.subject, message.template.variables);
          }
          if (condition.template.body?.text) {
            message.body.text = this.interpolateTemplate(condition.template.body.text, message.template.variables);
          }
          if (condition.template.body?.html) {
            message.body.html = this.interpolateTemplate(condition.template.body.html, message.template.variables);
          }
          break;
        }
      }
    }
  }

  private interpolateTemplate(template: string, variables: { [key: string]: unknown }): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(variables, key.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private evaluateCondition(condition: TemplateCondition, variables: { [key: string]: unknown }): boolean {
    const value = this.getNestedValue(variables, condition.field);
    
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      case 'regex':
        return typeof value === 'string' && new RegExp(condition.value).test(value);
      default:
        return false;
    }
  }

  private async addTracking(message: EmailMessage): Promise<void> {
    if (!message.tracking?.enabled) return;

    const trackingId = crypto.randomUUID();
    message.tracking.trackingId = trackingId;

    // Add tracking pixel for open tracking
    if (message.tracking.openTracking && message.body.html) {
      const trackingPixel = `<img src="${this.config.tracking.domain}/track/open/${trackingId}" width="1" height="1" style="display:none;" />`;
      message.body.html += trackingPixel;
    }

    // Add click tracking to links
    if (message.tracking.clickTracking && message.body.html) {
      message.body.html = message.body.html.replace(
        /<a\s+([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>/gi,
        (match, attrs, url) => {
          const trackedUrl = `${this.config.tracking.domain}/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
          return match.replace(url, trackedUrl);
        }
      );
    }
  }

  private async getRecipients(recipientList: EmailRecipientList): Promise<EmailRecipient[]> {
    let recipients = [...recipientList.recipients];

    // Apply filters
    if (recipientList.filters) {
      recipients = recipients.filter(recipient => {
        return recipientList.filters!.every(filter => {
          const value = this.getNestedValue(recipient, filter.field);
          return this.evaluateFilterCondition(value, filter.operator, filter.value);
        });
      });
    }

    // Filter out unsubscribed recipients
    recipients = recipients.filter(r => r.subscriptionStatus === 'subscribed');

    return recipients;
  }

  private evaluateFilterCondition(value: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
        return value === expected;
      case 'ne':
        return value !== expected;
      case 'gt':
        return value > expected;
      case 'lt':
        return value < expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'nin':
        return Array.isArray(expected) && !expected.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(expected);
      case 'regex':
        return typeof value === 'string' && new RegExp(expected).test(value);
      default:
        return false;
    }
  }

  private createABTestGroups(recipients: EmailRecipient[], abTesting: NonNullable<CampaignSettings['abTesting']>): Array<{
    recipients: EmailRecipient[];
    template: EmailTemplate;
  }> {
    const groups: Array<{ recipients: EmailRecipient[]; template: EmailTemplate }> = [];
    const remainingRecipients = [...recipients];
    
    for (const variant of abTesting.variants) {
      const groupSize = Math.floor((recipients.length * variant.percentage) / 100);
      const groupRecipients = remainingRecipients.splice(0, groupSize);
      
      groups.push({
        recipients: groupRecipients,
        template: { ...this.templates.values().next().value, ...variant.template }
      });
    }

    return groups;
  }

  private async sendCampaignBatch(
    campaign: EmailCampaign,
    recipients: EmailRecipient[],
    template: EmailTemplate
  ): Promise<void> {
    const batchSize = campaign.schedule?.throttling?.batchSize || this.config.performance.batchSize;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      for (const recipient of batch) {
        try {
          await this.sendEmail({
            from: { email: 'noreply@company.com', name: 'Company' },
            to: [{ email: recipient.email, name: recipient.name }],
            subject: campaign.subject,
            body: template.body,
            template: {
              ...template,
              variables: { ...template.variables, ...recipient.customFields }
            },
            tracking: {
              enabled: campaign.settings.trackOpens || campaign.settings.trackClicks,
              openTracking: campaign.settings.trackOpens,
              clickTracking: campaign.settings.trackClicks,
              bounceTracking: campaign.settings.bounceHandling
            },
            priority: 'normal',
            metadata: {
              timestamp: Date.now(),
              campaignId: campaign.id
            }
          });

          campaign.statistics.sent++;
        } catch (error) {
          this.emit('campaign:send:error', { campaign, recipient, error });
        }
      }

      // Apply batch delay
      if (campaign.schedule?.throttling?.batchDelay) {
        await new Promise(resolve => setTimeout(resolve, campaign.schedule.throttling!.batchDelay));
      }
    }
  }

  private async performProviderHealthCheck(provider: EmailProvider): Promise<void> {
    // Mock health check - in real implementation, send test email or ping API
    console.log(`Performing health check for provider: ${provider.name}`);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Webhook Handlers (for provider callbacks)
  public async handleDeliveryWebhook(provider: string, payload: unknown): Promise<void> {
    // Handle delivery status updates from email providers
    const messageId = payload.messageId || payload.id;
    const deliveryStatus = this.deliveryStatuses.get(messageId);
    
    if (deliveryStatus) {
      deliveryStatus.providerMessageId = payload.providerMessageId;
      
      if (payload.event === 'delivered') {
        deliveryStatus.status = 'delivered';
        deliveryStatus.events.push({
          type: 'delivered',
          timestamp: Date.now(),
          data: payload.data
        });
      } else if (payload.event === 'bounced') {
        deliveryStatus.status = 'bounced';
        deliveryStatus.events.push({
          type: 'bounced',
          timestamp: Date.now(),
          data: {
            reason: payload.reason,
            bounceType: payload.bounceType
          }
        });
      }
      
      this.emit(`email:${payload.event}`, { messageId, payload });
    }
  }

  public async handleTrackingWebhook(trackingId: string, event: string, data: unknown): Promise<void> {
    // Handle tracking events (opens, clicks)
    this.emit(`tracking:${event}`, { trackingId, data });
  }

  // Public API
  public getProvider(name: string): EmailProvider | undefined {
    return this.providers.get(name);
  }

  public getAllProviders(): EmailProvider[] {
    return Array.from(this.providers.values());
  }

  public getRecipientList(id: string): EmailRecipientList | undefined {
    return this.recipientLists.get(id);
  }

  public getAllRecipientLists(): EmailRecipientList[] {
    return Array.from(this.recipientLists.values());
  }

  public getStats(): {
    messages: { queued: number; sending: number; sent: number; failed: number };
    campaigns: { total: number; active: number; completed: number };
    templates: { count: number };
    recipients: { total: number; subscribed: number; unsubscribed: number };
    providers: { total: number; active: number; failed: number };
  } {
    const messages = Array.from(this.deliveryStatuses.values());
    const campaigns = Array.from(this.campaigns.values());
    const recipients = Array.from(this.recipientLists.values())
      .flatMap(list => list.recipients);

    return {
      messages: {
        queued: messages.filter(m => m.status === 'queued').length,
        sending: messages.filter(m => m.status === 'sending').length,
        sent: messages.filter(m => m.status === 'sent' || m.status === 'delivered').length,
        failed: messages.filter(m => m.status === 'failed' || m.status === 'bounced').length
      },
      campaigns: {
        total: campaigns.length,
        active: campaigns.filter(c => ['sending', 'scheduled'].includes(c.status)).length,
        completed: campaigns.filter(c => c.status === 'sent').length
      },
      templates: {
        count: this.templates.size
      },
      recipients: {
        total: recipients.length,
        subscribed: recipients.filter(r => r.subscriptionStatus === 'subscribed').length,
        unsubscribed: recipients.filter(r => r.subscriptionStatus === 'unsubscribed').length
      },
      providers: {
        total: this.providers.size,
        active: Array.from(this.providers.values()).filter(p => p.status === 'active').length,
        failed: Array.from(this.providers.values()).filter(p => p.status === 'error').length
      }
    };
  }

  public async shutdown(): Promise<void> {
    this.isProcessing = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Wait for processing messages to complete
    while (this.processingMessages.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit('service:shutdown');
  }
}

export default EmailService;