import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface SMSMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  type: 'text' | 'unicode' | 'binary';
  encoding: 'GSM7' | 'UCS2' | 'binary';
  parts: number;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  scheduledAt?: number;
  validityPeriod?: number;
  flash?: boolean;
  statusReport?: boolean;
  metadata: {
    timestamp: number;
    tenantId?: string;
    userId?: string;
    workflowId?: string;
    executionId?: string;
    campaignId?: string;
    messageId: string;
    country?: string;
    carrier?: string;
    messageClass?: 0 | 1 | 2 | 3;
    dataCoding?: number;
    protocolId?: number;
  };
  template?: {
    id: string;
    variables: { [key: string]: unknown };
  };
  tracking?: {
    enabled: boolean;
    callbackUrl?: string;
    reference?: string;
  };
}

export interface SMSDeliveryStatus {
  messageId: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'expired' | 'rejected' | 'unknown';
  timestamp: number;
  provider?: string;
  providerMessageId?: string;
  cost?: {
    amount: number;
    currency: string;
  };
  error?: {
    code: string;
    message: string;
    permanent: boolean;
  };
  events: SMSEvent[];
  deliveryReceipt?: {
    status: string;
    timestamp: number;
    networkCode?: string;
    errorCode?: string;
  };
}

export interface SMSEvent {
  type: 'queued' | 'sent' | 'delivered' | 'failed' | 'expired' | 'buffered' | 'accepted' | 'unknown';
  timestamp: number;
  data?: {
    networkCode?: string;
    errorCode?: string;
    cost?: {
      amount: number;
      currency: string;
    };
    location?: {
      country: string;
      region?: string;
      city?: string;
      mcc?: string;
      mnc?: string;
    };
  };
}

export interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  variables: { [key: string]: unknown };
  language?: string;
  encoding: 'GSM7' | 'UCS2';
  maxLength: number;
  category?: string;
  approved?: boolean;
  presets?: {
    flash?: boolean;
    priority?: SMSMessage['priority'];
    validityPeriod?: number;
  };
  compliance?: {
    optOutInstructions: boolean;
    senderIdRequired: boolean;
    regulatoryApproval?: string;
  };
}

export interface SMSCampaign {
  id: string;
  name: string;
  template: SMSTemplate;
  recipients: SMSRecipientList;
  sender: string;
  schedule?: SMSSchedule;
  settings: CampaignSettings;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  statistics: CampaignStatistics;
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    tags: string[];
    budget?: {
      maxCost: number;
      currency: string;
      costPerMessage?: number;
    };
  };
}

export interface SMSRecipientList {
  id: string;
  name: string;
  type: 'static' | 'dynamic' | 'segment';
  recipients: SMSRecipient[];
  query?: string;
  filters?: RecipientFilter[];
  segmentation?: {
    field: string;
    segments: Array<{
      name: string;
      condition: unknown;
      customMessage?: string;
    }>;
  };
}

export interface SMSRecipient {
  phoneNumber: string;
  name?: string;
  customFields?: { [key: string]: unknown };
  subscriptionStatus: 'subscribed' | 'unsubscribed' | 'bounced' | 'invalid';
  subscriptionDate?: number;
  unsubscriptionDate?: number;
  lastSMSDate?: number;
  tags?: string[];
  preferences?: {
    frequency: 'immediate' | 'daily' | 'weekly';
    categories: string[];
    timeZone?: string;
    quietHours?: {
      start: string;
      end: string;
    };
  };
  validation?: {
    isValid: boolean;
    carrier?: string;
    country?: string;
    lineType?: 'mobile' | 'landline' | 'voip' | 'unknown';
    lastValidated?: number;
  };
}

export interface RecipientFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
}

export interface SMSSchedule {
  type: 'immediate' | 'scheduled' | 'recurring' | 'optimal';
  sendAt?: number;
  timezone?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: number;
    maxSends?: number;
  };
  throttling?: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
    batchSize: number;
    batchDelay: number;
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  optimalTiming?: {
    enabled: boolean;
    algorithm: 'timezone' | 'engagement' | 'carrier';
    window: number;
  };
}

export interface CampaignSettings {
  deliveryReports: boolean;
  flash: boolean;
  unicode: boolean;
  concatenate: boolean;
  validityPeriod: number;
  duplicateDetection: boolean;
  optOutHandling: boolean;
  linkShortening?: {
    enabled: boolean;
    domain?: string;
    tracking: boolean;
  };
  compliance?: {
    gdpr: boolean;
    tcpa: boolean;
    optInRequired: boolean;
    senderIdCompliance: boolean;
  };
  fallback?: {
    enabled: boolean;
    providers: string[];
    conditions: Array<{
      errorCodes: string[];
      action: 'retry' | 'failover' | 'abandon';
    }>;
  };
}

export interface CampaignStatistics {
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  expired: number;
  cost: {
    total: number;
    currency: string;
    perMessage: number;
  };
  deliveryRate: number;
  failureRate: number;
  averageDeliveryTime: number;
  countries?: { [country: string]: number };
  carriers?: { [carrier: string]: number };
  errorCodes?: { [code: string]: number };
  timeDistribution?: Array<{
    hour: number;
    sent: number;
    delivered: number;
  }>;
}

export interface SMSProvider {
  name: string;
  type: 'twilio' | 'aws_sns' | 'vonage' | 'messagebird' | 'plivo' | 'clickatell' | 'smpp' | 'http';
  config: SMSProviderConfig;
  capabilities: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
    alphanumericSender: boolean;
    deliveryReports: boolean;
    unicode: boolean;
    concatenation: boolean;
    flash: boolean;
    binary: boolean;
  };
  pricing: {
    currency: string;
    rates: Array<{
      country: string;
      mcc?: string;
      cost: number;
      type?: 'mobile' | 'landline';
    }>;
  };
  limits: {
    messagesPerSecond: number;
    messagesPerMinute: number;
    messagesPerHour: number;
    messagesPerDay: number;
    maxMessageLength: number;
    maxConcatenatedParts: number;
  };
  coverage: {
    countries: string[];
    globalCoverage: boolean;
    specialRoutes?: Array<{
      country: string;
      carriers: string[];
      quality: 'premium' | 'standard' | 'economy';
    }>;
  };
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  priority: number;
  healthCheck?: {
    lastCheck: number;
    healthy: boolean;
    latency?: number;
    error?: string;
  };
}

export interface SMSProviderConfig {
  // Twilio
  accountSid?: string;
  authToken?: string;
  
  // AWS SNS
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  
  // Vonage (Nexmo)
  apiKey?: string;
  apiSecret?: string;
  
  // MessageBird
  accessKey?: string;
  
  // SMPP
  host?: string;
  port?: number;
  systemId?: string;
  password?: string;
  systemType?: string;
  bindType?: 'transceiver' | 'transmitter' | 'receiver';
  
  // HTTP API
  endpoint?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  headers?: { [key: string]: string };
  
  // Common settings
  timeout?: number;
  retries?: number;
  keepAlive?: boolean;
  rateLimiting?: {
    enabled: boolean;
    requests: number;
    window: number;
  };
  webhook?: {
    url: string;
    username?: string;
    password?: string;
  };
}

export interface PhoneNumberInfo {
  phoneNumber: string;
  country: string;
  countryCode: string;
  nationalFormat: string;
  internationalFormat: string;
  e164Format: string;
  carrier?: string;
  lineType: 'mobile' | 'landline' | 'voip' | 'unknown';
  isValid: boolean;
  isPossible: boolean;
  region?: string;
  timeZone?: string[];
}

export interface SMSServiceConfig {
  providers: SMSProvider[];
  defaultProvider?: string;
  failover: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    healthCheckInterval: number;
  };
  validation: {
    enabled: boolean;
    provider?: string;
    cacheResults: boolean;
    cacheExpiry: number;
  };
  compliance: {
    optOutKeywords: string[];
    optInRequired: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    contentFiltering: {
      enabled: boolean;
      keywords: string[];
      action: 'block' | 'warn' | 'modify';
    };
  };
  analytics: {
    enabled: boolean;
    retention: number;
    realTimeTracking: boolean;
  };
  performance: {
    batchSize: number;
    maxConcurrent: number;
    queueSize: number;
    retentionDays: number;
  };
  security: {
    encryptMessages: boolean;
    maskPhoneNumbers: boolean;
    auditLogging: boolean;
  };
}

export class SMSService extends EventEmitter {
  private config: SMSServiceConfig;
  private providers: Map<string, SMSProvider> = new Map();
  private templates: Map<string, SMSTemplate> = new Map();
  private campaigns: Map<string, SMSCampaign> = new Map();
  private recipientLists: Map<string, SMSRecipientList> = new Map();
  private deliveryStatuses: Map<string, SMSDeliveryStatus> = new Map();
  private messageQueue: SMSMessage[] = [];
  private processingMessages: Set<string> = new Set();
  private suppressionList: Set<string> = new Set();
  private phoneNumberCache: Map<string, PhoneNumberInfo> = new Map();
  private isProcessing = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: SMSServiceConfig) {
    super();
    this.config = config;
    this.initializeProviders();
    this.loadOptOutKeywords();
    this.startHealthChecks();
    this.startMessageProcessor();
  }

  // Message Operations
  public async sendSMS(message: Omit<SMSMessage, 'id' | 'metadata' | 'parts' | 'encoding'>): Promise<string> {
    const smsMessage: SMSMessage = {
      id: crypto.randomUUID(),
      type: 'text',
      encoding: this.detectEncoding(message.message),
      parts: this.calculateMessageParts(message.message),
      metadata: {
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      },
      ...message
    };

    // Validate message
    await this.validateMessage(smsMessage);

    // Check suppression list
    if (this.suppressionList.has(smsMessage.to)) {
      throw new Error(`Recipient is suppressed: ${smsMessage.to}`);
    }

    // Validate phone number
    const phoneInfo = await this.validatePhoneNumber(smsMessage.to);
    if (!phoneInfo.isValid) {
      throw new Error(`Invalid phone number: ${smsMessage.to}`);
    }

    // Check compliance
    await this.checkCompliance(smsMessage);

    // Apply template if specified
    if (smsMessage.template) {
      await this.applyTemplate(smsMessage);
    }

    // Apply link shortening if enabled
    await this.applyLinkShortening(smsMessage);

    // Queue message for sending
    this.messageQueue.push(smsMessage);

    // Initialize delivery status
    const deliveryStatus: SMSDeliveryStatus = {
      messageId: smsMessage.id,
      status: 'queued',
      timestamp: Date.now(),
      events: [{
        type: 'queued',
        timestamp: Date.now()
      }]
    };

    this.deliveryStatuses.set(smsMessage.id, deliveryStatus);

    this.emit('sms:queued', smsMessage);
    return smsMessage.id;
  }

  public async sendBulkSMS(messages: Array<Omit<SMSMessage, 'id' | 'metadata' | 'parts' | 'encoding'>>): Promise<string[]> {
    const messageIds: string[] = [];

    for (const message of messages) {
      try {
        const messageId = await this.sendSMS(message);
        messageIds.push(messageId);
      } catch (error) {
        this.emit('bulk:send:error', { message, error });
      }
    }

    this.emit('bulk:send:completed', { total: messages.length, sent: messageIds.length });
    return messageIds;
  }

  public async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus | undefined> {
    return this.deliveryStatuses.get(messageId);
  }

  public async getDeliveryStatuses(messageIds: string[]): Promise<SMSDeliveryStatus[]> {
    return messageIds
      .map(id => this.deliveryStatuses.get(id))
      .filter(status => status !== undefined) as SMSDeliveryStatus[];
  }

  // Phone Number Operations
  public async validatePhoneNumber(phoneNumber: string, useCache: boolean = true): Promise<PhoneNumberInfo> {
    if (useCache && this.phoneNumberCache.has(phoneNumber)) {
      return this.phoneNumberCache.get(phoneNumber)!;
    }

    // Mock phone number validation - in real implementation, use a service like Twilio Lookup
    const phoneInfo: PhoneNumberInfo = {
      phoneNumber,
      country: 'US',
      countryCode: '1',
      nationalFormat: phoneNumber,
      internationalFormat: `+${phoneNumber}`,
      e164Format: `+${phoneNumber}`,
      lineType: 'mobile',
      isValid: /^\+?[1-9]\d{1,14}$/.test(phoneNumber),
      isPossible: true,
      carrier: 'Unknown',
      region: 'Unknown',
      timeZone: ['America/New_York']
    };

    if (this.config.validation.cacheResults) {
      this.phoneNumberCache.set(phoneNumber, phoneInfo);
      
      // Auto-expire cache entries
      setTimeout(() => {
        this.phoneNumberCache.delete(phoneNumber);
      }, this.config.validation.cacheExpiry);
    }

    return phoneInfo;
  }

  public async lookupCarrier(phoneNumber: string): Promise<{ carrier?: string; country?: string; lineType?: string }> {
    const phoneInfo = await this.validatePhoneNumber(phoneNumber);
    return {
      carrier: phoneInfo.carrier,
      country: phoneInfo.country,
      lineType: phoneInfo.lineType
    };
  }

  // Template Operations
  public async createTemplate(template: Omit<SMSTemplate, 'id'>): Promise<SMSTemplate> {
    const smsTemplate: SMSTemplate = {
      id: crypto.randomUUID(),
      encoding: 'GSM7',
      maxLength: 160,
      ...template
    };

    // Validate template
    await this.validateTemplate(smsTemplate);

    this.templates.set(smsTemplate.id, smsTemplate);
    this.emit('template:created', smsTemplate);
    
    return smsTemplate;
  }

  public async updateTemplate(id: string, updates: Partial<SMSTemplate>): Promise<SMSTemplate> {
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

  // Campaign Operations
  public async createCampaign(campaign: Omit<SMSCampaign, 'id' | 'status' | 'statistics' | 'metadata'>): Promise<SMSCampaign> {
    const smsCampaign: SMSCampaign = {
      id: crypto.randomUUID(),
      status: 'draft',
      statistics: {
        sent: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        expired: 0,
        cost: { total: 0, currency: 'USD', perMessage: 0 },
        deliveryRate: 0,
        failureRate: 0,
        averageDeliveryTime: 0
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        tags: []
      },
      ...campaign
    };

    this.campaigns.set(smsCampaign.id, smsCampaign);
    this.emit('campaign:created', smsCampaign);
    
    return smsCampaign;
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

    // Send SMS messages in batches
    await this.sendCampaignBatch(campaign, recipients);

    campaign.status = 'sent';
    campaign.metadata.updatedAt = Date.now();

    this.emit('campaign:sent', campaign);
  }

  // Recipient List Operations
  public async createRecipientList(list: Omit<SMSRecipientList, 'id'>): Promise<SMSRecipientList> {
    const recipientList: SMSRecipientList = {
      id: crypto.randomUUID(),
      ...list
    };

    this.recipientLists.set(recipientList.id, recipientList);
    this.emit('recipient_list:created', recipientList);
    
    return recipientList;
  }

  public async addRecipient(listId: string, recipient: SMSRecipient): Promise<void> {
    const list = this.recipientLists.get(listId);
    if (!list) {
      throw new Error(`Recipient list not found: ${listId}`);
    }

    // Validate phone number
    const phoneInfo = await this.validatePhoneNumber(recipient.phoneNumber);
    recipient.validation = {
      isValid: phoneInfo.isValid,
      carrier: phoneInfo.carrier,
      country: phoneInfo.country,
      lineType: phoneInfo.lineType,
      lastValidated: Date.now()
    };

    // Check if recipient already exists
    const existingIndex = list.recipients.findIndex(r => r.phoneNumber === recipient.phoneNumber);
    if (existingIndex >= 0) {
      list.recipients[existingIndex] = recipient;
    } else {
      list.recipients.push(recipient);
    }

    this.emit('recipient:added', { listId, recipient });
  }

  public async removeRecipient(listId: string, phoneNumber: string): Promise<void> {
    const list = this.recipientLists.get(listId);
    if (!list) {
      throw new Error(`Recipient list not found: ${listId}`);
    }

    const index = list.recipients.findIndex(r => r.phoneNumber === phoneNumber);
    if (index >= 0) {
      list.recipients.splice(index, 1);
      this.emit('recipient:removed', { listId, phoneNumber });
    }
  }

  public async unsubscribeRecipient(phoneNumber: string, reason?: string): Promise<void> {
    this.suppressionList.add(phoneNumber);

    // Update recipient in all lists
    for (const list of this.recipientLists.values()) {
      const recipient = list.recipients.find(r => r.phoneNumber === phoneNumber);
      if (recipient) {
        recipient.subscriptionStatus = 'unsubscribed';
        recipient.unsubscriptionDate = Date.now();
      }
    }

    this.emit('recipient:unsubscribed', { phoneNumber, reason });
  }

  // Provider Operations
  public async addProvider(provider: SMSProvider): Promise<void> {
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

  private loadOptOutKeywords(): void {
    for (const _keyword of this.config.compliance.optOutKeywords) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // In real implementation, handle opt-out message processing
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

  private async sendMessage(message: SMSMessage): Promise<void> {
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
        case 'twilio':
          await this.sendViaTwilio(message, provider);
          break;
        case 'aws_sns':
          await this.sendViaAWSSNS(message, provider);
          break;
        case 'vonage':
          await this.sendViaVonage(message, provider);
          break;
        case 'messagebird':
          await this.sendViaMessageBird(message, provider);
          break;
        case 'plivo':
          await this.sendViaPlivo(message, provider);
          break;
        case 'smpp':
          await this.sendViaSMPP(message, provider);
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

      this.emit('sms:sent', { message, provider });

    } catch (error) {
      deliveryStatus.status = 'failed';
      deliveryStatus.error = {
        code: error.code || 'SEND_ERROR',
        message: error.message,
        permanent: error.permanent || false
      };

      this.emit('sms:failed', { message, error });

      // Retry with different provider if configured
      if (this.config.failover.enabled && !error.permanent) {
        await this.retryWithFailover(message);
      }
    }
  }

  private async selectProvider(message: SMSMessage): Promise<SMSProvider> {
    // Get active providers sorted by priority
    const activeProviders = Array.from(this.providers.values())
      .filter(p => p.status === 'active')
      .sort((a, b) => a.priority - b.priority);

    if (activeProviders.length === 0) {
      throw new Error('No active SMS providers available');
    }

    // Use default provider if specified and active
    if (this.config.defaultProvider) {
      const defaultProvider = activeProviders.find(p => p.name === this.config.defaultProvider);
      if (defaultProvider) {
        return defaultProvider;
      }
    }

    // Select based on destination country coverage
    const phoneInfo = await this.validatePhoneNumber(message.to);
    const providersWithCoverage = activeProviders.filter(p => 
      p.coverage.globalCoverage || p.coverage.countries.includes(phoneInfo.country)
    );

    if (providersWithCoverage.length > 0) {
      return providersWithCoverage[0];
    }

    // Fallback to first active provider
    return activeProviders[0];
  }

  private async sendViaTwilio(message: SMSMessage, provider: SMSProvider): Promise<void> {
    console.log(`Sending SMS ${message.id} via Twilio provider ${provider.name}`);
    // Mock Twilio API call
  }

  private async sendViaAWSSNS(message: SMSMessage, provider: SMSProvider): Promise<void> {
    console.log(`Sending SMS ${message.id} via AWS SNS provider ${provider.name}`);
    // Mock AWS SNS API call
  }

  private async sendViaVonage(message: SMSMessage, provider: SMSProvider): Promise<void> {
    console.log(`Sending SMS ${message.id} via Vonage provider ${provider.name}`);
    // Mock Vonage API call
  }

  private async sendViaMessageBird(message: SMSMessage, provider: SMSProvider): Promise<void> {
    console.log(`Sending SMS ${message.id} via MessageBird provider ${provider.name}`);
    // Mock MessageBird API call
  }

  private async sendViaPlivo(message: SMSMessage, provider: SMSProvider): Promise<void> {
    console.log(`Sending SMS ${message.id} via Plivo provider ${provider.name}`);
    // Mock Plivo API call
  }

  private async sendViaSMPP(message: SMSMessage, provider: SMSProvider): Promise<void> {
    console.log(`Sending SMS ${message.id} via SMPP provider ${provider.name}`);
    // Mock SMPP protocol implementation
  }

  private async retryWithFailover(message: SMSMessage): Promise<void> {
    console.log(`Retrying SMS ${message.id} with failover`);
  }

  private async validateMessage(message: SMSMessage): Promise<void> {
    if (!message.from) {
      throw new Error('From number is required');
    }

    if (!message.to) {
      throw new Error('To number is required');
    }

    if (!message.message) {
      throw new Error('Message content is required');
    }

    // Check message length
    if (message.message.length > 1600) { // Max for concatenated SMS
      throw new Error('Message too long');
    }

    // Validate phone number format
    if (!this.isValidPhoneNumber(message.to)) {
      throw new Error(`Invalid phone number format: ${message.to}`);
    }
  }

  private async validateTemplate(template: SMSTemplate): Promise<void> {
    if (!template.name) {
      throw new Error('Template name is required');
    }

    if (!template.message) {
      throw new Error('Template message is required');
    }

    if (template.message.length > template.maxLength) {
      throw new Error(`Template message exceeds max length: ${template.maxLength}`);
    }
  }

  private async validateProvider(provider: SMSProvider): Promise<void> {
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

  private async checkCompliance(message: SMSMessage): Promise<void> {
    // Check quiet hours
    if (this.config.compliance.quietHours.enabled) {
      const _now = new Date(); // eslint-disable-line @typescript-eslint/no-unused-vars
      const phoneInfo = await this.validatePhoneNumber(message.to);
      const _timeZone = phoneInfo.timeZone?.[0] || 'UTC'; // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // In real implementation, check if current time in recipient's timezone is within quiet hours
    }

    // Check content filtering
    if (this.config.compliance.contentFiltering.enabled) {
      for (const keyword of this.config.compliance.contentFiltering.keywords) {
        if (message.message.toLowerCase().includes(keyword.toLowerCase())) {
          switch (this.config.compliance.contentFiltering.action) {
            case 'block':
              throw new Error(`Message blocked due to prohibited content: ${keyword}`);
            case 'warn':
              this.emit('compliance:warning', { message, keyword });
              break;
            case 'modify':
              message.message = message.message.replace(new RegExp(keyword, 'gi'), '[FILTERED]');
              break;
          }
        }
      }
    }

    // Check opt-in requirement
    if (this.config.compliance.optInRequired) {
      const recipient = this.findRecipientByPhoneNumber(message.to);
      if (!recipient || recipient.subscriptionStatus !== 'subscribed') {
        throw new Error('Recipient has not opted in to receive messages');
      }
    }
  }

  private async applyTemplate(message: SMSMessage): Promise<void> {
    if (!message.template) return;

    const template = this.templates.get(message.template.id);
    if (!template) {
      throw new Error(`Template not found: ${message.template.id}`);
    }

    // Apply template variables
    message.message = this.interpolateTemplate(template.message, message.template.variables);
    
    // Apply template presets
    if (template.presets) {
      if (template.presets.flash !== undefined) {
        message.flash = template.presets.flash;
      }
      if (template.presets.priority) {
        message.priority = template.presets.priority;
      }
      if (template.presets.validityPeriod) {
        message.validityPeriod = template.presets.validityPeriod;
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

  private async applyLinkShortening(message: SMSMessage): Promise<void> {
    // Extract URLs and shorten them
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.message.match(urlRegex);
    
    if (urls) {
      for (const url of urls) {
        const shortUrl = await this.shortenUrl(url);
        message.message = message.message.replace(url, shortUrl);
      }
    }
  }

  private async shortenUrl(_url: string): Promise<string> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock URL shortening - in real implementation, use a service
    const shortId = crypto.randomBytes(4).toString('hex');
    return `https://short.ly/${shortId}`;
  }

  private detectEncoding(message: string): SMSMessage['encoding'] {
    // Check if message contains non-GSM characters
    const gsmCharset = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,-./:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñü]*$/;
    
    return gsmCharset.test(message) ? 'GSM7' : 'UCS2';
  }

  private calculateMessageParts(message: string): number {
    const encoding = this.detectEncoding(message);
    const maxLength = encoding === 'GSM7' ? 160 : 70;
    const maxConcatenatedLength = encoding === 'GSM7' ? 153 : 67; // Account for header
    
    if (message.length <= maxLength) {
      return 1;
    }
    
    return Math.ceil(message.length / maxConcatenatedLength);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic international phone number validation
    return /^\+?[1-9]\d{1,14}$/.test(phoneNumber.replace(/[\s\-()]/g, ''));
  }

  private findRecipientByPhoneNumber(phoneNumber: string): SMSRecipient | undefined {
    for (const list of this.recipientLists.values()) {
      const recipient = list.recipients.find(r => r.phoneNumber === phoneNumber);
      if (recipient) return recipient;
    }
    return undefined;
  }

  private async getRecipients(recipientList: SMSRecipientList): Promise<SMSRecipient[]> {
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

    // Filter out invalid phone numbers
    recipients = recipients.filter(r => r.validation?.isValid !== false);

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

  private async sendCampaignBatch(campaign: SMSCampaign, recipients: SMSRecipient[]): Promise<void> {
    const batchSize = campaign.schedule?.throttling?.batchSize || this.config.performance.batchSize;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      for (const recipient of batch) {
        try {
          await this.sendSMS({
            from: campaign.sender,
            to: recipient.phoneNumber,
            message: campaign.template.message,
            priority: 'normal',
            template: {
              id: campaign.template.id,
              variables: { ...campaign.template.variables, ...recipient.customFields }
            },
            tracking: {
              enabled: true,
              reference: campaign.id
            }
          });

          campaign.statistics.sent++;
        } catch (error) {
          campaign.statistics.failed++;
          this.emit('campaign:send:error', { campaign, recipient, error });
        }
      }

      // Apply batch delay
      if (campaign.schedule?.throttling?.batchDelay) {
        await new Promise(resolve => setTimeout(resolve, campaign.schedule.throttling!.batchDelay));
      }
    }
  }

  private async performProviderHealthCheck(provider: SMSProvider): Promise<void> {
    // Mock health check - in real implementation, send test SMS or ping API
    console.log(`Performing health check for provider: ${provider.name}`);
  }

  // Webhook Handlers
  public async handleDeliveryReceipt(provider: string, payload: unknown): Promise<void> {
    const messageId = payload.messageId || payload.id;
    const deliveryStatus = this.deliveryStatuses.get(messageId);
    
    if (deliveryStatus) {
      deliveryStatus.providerMessageId = payload.providerMessageId;
      
      if (payload.status === 'delivered') {
        deliveryStatus.status = 'delivered';
        deliveryStatus.events.push({
          type: 'delivered',
          timestamp: Date.now(),
          data: payload.data
        });
      } else if (payload.status === 'failed') {
        deliveryStatus.status = 'failed';
        deliveryStatus.error = {
          code: payload.errorCode || 'DELIVERY_FAILED',
          message: payload.errorMessage || 'Delivery failed',
          permanent: payload.permanent || false
        };
      }
      
      this.emit(`sms:delivery:${payload.status}`, { messageId, payload });
    }
  }

  public async handleIncomingSMS(payload: unknown): Promise<void> {
    // Handle incoming SMS messages (for two-way SMS)
    const incomingMessage = {
      from: payload.from,
      to: payload.to,
      message: payload.message,
      timestamp: Date.now(),
      provider: payload.provider
    };

    // Check for opt-out keywords
    for (const keyword of this.config.compliance.optOutKeywords) {
      if (incomingMessage.message.toLowerCase().includes(keyword.toLowerCase())) {
        await this.unsubscribeRecipient(incomingMessage.from, `Opt-out via keyword: ${keyword}`);
        break;
      }
    }

    this.emit('sms:incoming', incomingMessage);
  }

  // Public API
  public getProvider(name: string): SMSProvider | undefined {
    return this.providers.get(name);
  }

  public getAllProviders(): SMSProvider[] {
    return Array.from(this.providers.values());
  }

  public getTemplate(id: string): SMSTemplate | undefined {
    return this.templates.get(id);
  }

  public getAllTemplates(): SMSTemplate[] {
    return Array.from(this.templates.values());
  }

  public getCampaign(id: string): SMSCampaign | undefined {
    return this.campaigns.get(id);
  }

  public getAllCampaigns(): SMSCampaign[] {
    return Array.from(this.campaigns.values());
  }

  public getRecipientList(id: string): SMSRecipientList | undefined {
    return this.recipientLists.get(id);
  }

  public getAllRecipientLists(): SMSRecipientList[] {
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
        failed: messages.filter(m => m.status === 'failed' || m.status === 'expired').length
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

export default SMSService;