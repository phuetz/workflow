/**
 * Multi-Channel Notification System
 * Enterprise-grade notification delivery across multiple channels
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

export interface Notification {
  id: string;
  type: NotificationType;
  channels: NotificationChannel[];
  template: NotificationTemplate;
  recipients: Recipient[];
  data: any;
  priority: NotificationPriority;
  scheduling?: SchedulingConfig;
  tracking?: TrackingConfig;
  retry?: RetryConfig;
  status: NotificationStatus;
  metadata?: any;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
}

export type NotificationType =
  | 'alert'
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'reminder'
  | 'marketing'
  | 'transactional'
  | 'system'
  | 'custom';

export interface NotificationChannel {
  type: ChannelType;
  config: ChannelConfig;
  enabled: boolean;
  priority: number;
  fallback?: string;
  rateLimit?: RateLimitConfig;
  filters?: ChannelFilter[];
}

export type ChannelType =
  | 'email'
  | 'sms'
  | 'push'
  | 'slack'
  | 'discord'
  | 'teams'
  | 'telegram'
  | 'whatsapp'
  | 'webhook'
  | 'in-app'
  | 'voice'
  | 'desktop';

export interface ChannelConfig {
  provider?: string;
  credentials?: any;
  endpoint?: string;
  timeout?: number;
  headers?: Record<string, string>;
  customization?: any;
}

export interface Recipient {
  id: string;
  type: 'user' | 'group' | 'role' | 'channel' | 'external';
  channels: ChannelPreference[];
  preferences?: NotificationPreferences;
  timezone?: string;
  locale?: string;
  metadata?: any;
}

export interface ChannelPreference {
  channel: ChannelType;
  address: string;
  verified: boolean;
  priority: number;
  schedule?: ScheduleWindow[];
}

export interface ScheduleWindow {
  days: number[];
  startTime: string;
  endTime: string;
  timezone?: string;
}

export interface NotificationPreferences {
  channels?: ChannelType[];
  types?: NotificationType[];
  frequency?: FrequencyConfig;
  doNotDisturb?: DoNotDisturbConfig;
  digest?: DigestConfig;
  unsubscribed?: string[];
}

export interface FrequencyConfig {
  maxPerHour?: number;
  maxPerDay?: number;
  maxPerWeek?: number;
  cooldown?: number;
}

export interface DoNotDisturbConfig {
  enabled: boolean;
  schedule?: ScheduleWindow[];
  allowUrgent?: boolean;
}

export interface DigestConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  time?: string;
  types?: NotificationType[];
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channels: ChannelTemplate[];
  variables?: TemplateVariable[];
  localization?: LocalizationConfig;
  version?: string;
}

export interface ChannelTemplate {
  channel: ChannelType;
  subject?: string;
  content: string;
  format?: 'text' | 'html' | 'markdown' | 'json';
  attachments?: AttachmentConfig[];
  actions?: ActionConfig[];
  styling?: any;
}

export interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  validation?: string;
}

export interface LocalizationConfig {
  defaultLocale: string;
  locales: Record<string, ChannelTemplate[]>;
}

export interface AttachmentConfig {
  type: 'file' | 'image' | 'document' | 'inline';
  source: string;
  name?: string;
  contentType?: string;
}

export interface ActionConfig {
  type: 'button' | 'link' | 'form' | 'custom';
  label: string;
  action: string;
  style?: string;
  confirmation?: boolean;
}

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface SchedulingConfig {
  sendAt?: Date;
  timezone?: string;
  respectDoNotDisturb?: boolean;
  expiresAt?: Date;
}

export interface TrackingConfig {
  trackDelivery: boolean;
  trackOpen: boolean;
  trackClick: boolean;
  trackUnsubscribe: boolean;
  webhookUrl?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  backoff: 'exponential' | 'linear' | 'constant';
  initialDelay: number;
  maxDelay?: number;
  fallbackChannel?: ChannelType;
}

export type NotificationStatus =
  | 'pending'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'cancelled';

export interface RateLimitConfig {
  maxPerSecond?: number;
  maxPerMinute?: number;
  maxPerHour?: number;
  maxPerDay?: number;
}

export interface ChannelFilter {
  type: 'whitelist' | 'blacklist' | 'regex' | 'custom';
  value: any;
}

export interface NotificationBatch {
  id: string;
  notifications: Notification[];
  template: NotificationTemplate;
  scheduling?: SchedulingConfig;
  status: BatchStatus;
  progress: BatchProgress;
}

export interface BatchProgress {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}

export type BatchStatus = 'preparing' | 'sending' | 'completed' | 'failed' | 'cancelled';

export interface NotificationProvider {
  name: string;
  type: ChannelType;
  send(notification: Notification, recipient: Recipient): Promise<any>;
  verify?(address: string): Promise<boolean>;
  getStatus?(messageId: string): Promise<any>;
}

export interface NotificationMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
  unsubscribed: number;
  byChannel: Record<ChannelType, ChannelMetrics>;
  byType: Record<NotificationType, number>;
  avgDeliveryTime: number;
  successRate: number;
}

export interface ChannelMetrics {
  sent: number;
  delivered: number;
  failed: number;
  cost?: number;
  performance?: number;
}

export class MultiChannelNotificationSystem extends EventEmitter {
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private batches: Map<string, NotificationBatch> = new Map();
  private providers: Map<ChannelType, NotificationProvider[]> = new Map();
  private queue: Map<string, Notification[]> = new Map();
  private recipients: Map<string, Recipient> = new Map();
  private metrics: NotificationMetrics;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private digestQueues: Map<string, Notification[]> = new Map();
  private config: NotificationConfig;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<NotificationConfig>) {
    super();
    this.config = {
      defaultChannels: ['email'],
      fallbackChannel: 'email',
      trackingEnabled: true,
      digestEnabled: true,
      retryAttempts: 3,
      queueSize: 10000,
      batchSize: 100,
      rateLimit: {
        maxPerSecond: 100,
        maxPerMinute: 1000,
        maxPerHour: 10000
      },
      ...config
    };

    this.metrics = this.createEmptyMetrics();
    this.initialize();
  }

  /**
   * Initialize notification system
   */
  private initialize(): void {
    // Register default providers
    this.registerDefaultProviders();

    // Start background processes
    this.startBackgroundProcesses();

    // Set up event handlers
    this.setupEventHandlers();

    logger.debug('Multi-channel notification system initialized');
  }

  /**
   * Send notification
   */
  async send(
    type: NotificationType,
    recipients: Recipient[],
    data: any,
    options?: {
      template?: string;
      channels?: ChannelType[];
      priority?: NotificationPriority;
      scheduling?: SchedulingConfig;
      tracking?: TrackingConfig;
      retry?: RetryConfig;
      metadata?: any;
    }
  ): Promise<Notification> {
    // Get or create template
    const template = options?.template 
      ? this.templates.get(options.template)
      : this.createDefaultTemplate(type);

    if (!template) {
      throw new Error('Template not found');
    }

    // Create notification
    const notification: Notification = {
      id: this.generateNotificationId(),
      type,
      channels: this.determineChannels(options?.channels),
      template,
      recipients,
      data,
      priority: options?.priority || 'normal',
      scheduling: options?.scheduling,
      tracking: options?.tracking || { 
        trackDelivery: true,
        trackOpen: false,
        trackClick: false,
        trackUnsubscribe: false
      },
      retry: options?.retry || {
        maxAttempts: this.config.retryAttempts,
        backoff: 'exponential',
        initialDelay: 1000
      },
      status: 'pending',
      metadata: options?.metadata,
      createdAt: new Date()
    };

    // Store notification
    this.notifications.set(notification.id, notification);

    // Check scheduling
    if (notification.scheduling?.sendAt) {
      await this.scheduleNotification(notification);
    } else {
      await this.processNotification(notification);
    }

    this.emit('notification:created', notification);
    return notification;
  }

  /**
   * Send batch notifications
   */
  async sendBatch(
    notifications: Array<{
      type: NotificationType;
      recipients: Recipient[];
      data: any;
    }>,
    template: string,
    options?: {
      scheduling?: SchedulingConfig;
      parallel?: boolean;
    }
  ): Promise<NotificationBatch> {
    const templateObj = this.templates.get(template);
    if (!templateObj) {
      throw new Error('Template not found');
    }

    const batch: NotificationBatch = {
      id: `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      notifications: [],
      template: templateObj,
      scheduling: options?.scheduling,
      status: 'preparing',
      progress: {
        total: notifications.length,
        sent: 0,
        delivered: 0,
        failed: 0,
        pending: notifications.length
      }
    };

    this.batches.set(batch.id, batch);

    // Create notifications
    for (const notif of notifications) {
      const notification = await this.send(
        notif.type,
        notif.recipients,
        notif.data,
        {
          template,
          scheduling: options?.scheduling
        }
      );
      batch.notifications.push(notification);
    }

    batch.status = 'sending';
    
    // Process batch
    if (options?.parallel) {
      await this.processBatchParallel(batch);
    } else {
      await this.processBatchSequential(batch);
    }

    batch.status = 'completed';
    this.emit('batch:completed', batch);
    return batch;
  }

  /**
   * Create notification template
   */
  createTemplate(template: Omit<NotificationTemplate, 'id'>): NotificationTemplate {
    const fullTemplate: NotificationTemplate = {
      ...template,
      id: `template_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    };

    this.templates.set(fullTemplate.id, fullTemplate);
    this.emit('template:created', fullTemplate);
    return fullTemplate;
  }

  /**
   * Register notification provider
   */
  registerProvider(provider: NotificationProvider): void {
    if (!this.providers.has(provider.type)) {
      this.providers.set(provider.type, []);
    }
    
    this.providers.get(provider.type)!.push(provider);
    this.emit('provider:registered', provider);
  }

  /**
   * Update recipient preferences
   */
  updateRecipientPreferences(
    recipientId: string,
    preferences: Partial<NotificationPreferences>
  ): void {
    const recipient = this.recipients.get(recipientId);
    if (recipient) {
      recipient.preferences = {
        ...recipient.preferences,
        ...preferences
      };
      this.recipients.set(recipientId, recipient);
      this.emit('preferences:updated', { recipientId, preferences });
    }
  }

  /**
   * Get notification status
   */
  async getStatus(notificationId: string): Promise<Notification | null> {
    return this.notifications.get(notificationId) || null;
  }

  /**
   * Cancel notification
   */
  async cancel(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.status !== 'pending' && notification.status !== 'scheduled') {
      return false;
    }

    notification.status = 'cancelled';
    this.notifications.set(notificationId, notification);
    
    // Clear scheduled timer if exists
    const timer = this.timers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(notificationId);
    }

    this.emit('notification:cancelled', notification);
    return true;
  }

  /**
   * Process notification
   */
  private async processNotification(notification: Notification): Promise<void> {
    notification.status = 'sending';
    
    for (const recipient of notification.recipients) {
      try {
        // Check recipient preferences
        if (!this.shouldSendToRecipient(notification, recipient)) {
          continue;
        }

        // Apply rate limiting
        const rateLimitKey = `${recipient.id}_${notification.type}`;
        if (!await this.checkRateLimit(rateLimitKey)) {
          await this.queueNotification(notification, recipient);
          continue;
        }

        // Determine best channel
        const channel = this.selectBestChannel(notification, recipient);
        if (!channel) {
          logger.warn(`No available channel for recipient ${recipient.id}`);
          continue;
        }

        // Send through channel
        await this.sendThroughChannel(notification, recipient, channel);
        
        // Update metrics
        this.updateMetrics(notification, channel, 'sent');
        
      } catch (error) {
        logger.error(`Failed to send notification to ${recipient.id}:`, error);
        await this.handleSendFailure(notification, recipient, error as Error);
      }
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    this.emit('notification:sent', notification);
  }

  /**
   * Send through channel
   */
  private async sendThroughChannel(
    notification: Notification,
    recipient: Recipient,
    channel: ChannelType
  ): Promise<void> {
    const providers = this.providers.get(channel) || [];
    
    if (providers.length === 0) {
      throw new Error(`No provider for channel ${channel}`);
    }

    // Try each provider until one succeeds
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        const result = await provider.send(notification, recipient);
        
        // Track delivery if enabled
        if (notification.tracking?.trackDelivery) {
          this.trackDelivery(notification, recipient, channel, result);
        }
        
        return;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Provider ${provider.name} failed:`, error);
      }
    }

    // All providers failed
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Handle send failure
   */
  private async handleSendFailure(
    notification: Notification,
    recipient: Recipient,
    error: Error
  ): Promise<void> {
    notification.failureReason = error.message;
    
    // Check retry policy
    if (notification.retry && notification.retry.maxAttempts > 0) {
      await this.scheduleRetry(notification, recipient);
    } else if (notification.retry?.fallbackChannel) {
      // Try fallback channel
      await this.sendThroughChannel(
        notification,
        recipient,
        notification.retry.fallbackChannel
      );
    }
    
    this.emit('notification:failed', { notification, recipient, error });
  }

  /**
   * Schedule retry
   */
  private async scheduleRetry(
    notification: Notification,
    recipient: Recipient
  ): Promise<void> {
    if (!notification.retry) return;
    
    const delay = this.calculateRetryDelay(notification.retry);
    
    setTimeout(async () => {
      notification.retry!.maxAttempts--;
      await this.processNotification(notification);
    }, delay);
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(retry: RetryConfig): number {
    const attempt = retry.maxAttempts;
    
    switch (retry.backoff) {
      case 'exponential':
        return Math.min(
          retry.initialDelay * Math.pow(2, attempt),
          retry.maxDelay || 60000
        );
      
      case 'linear':
        return Math.min(
          retry.initialDelay * attempt,
          retry.maxDelay || 60000
        );
      
      case 'constant':
      default:
        return retry.initialDelay;
    }
  }

  /**
   * Should send to recipient
   */
  private shouldSendToRecipient(
    notification: Notification,
    recipient: Recipient
  ): boolean {
    const prefs = recipient.preferences;
    
    if (!prefs) return true;
    
    // Check unsubscribed
    if (prefs.unsubscribed?.includes(notification.type)) {
      return false;
    }
    
    // Check type preferences
    if (prefs.types && !prefs.types.includes(notification.type)) {
      return false;
    }
    
    // Check DND
    if (prefs.doNotDisturb?.enabled) {
      if (!prefs.doNotDisturb.allowUrgent || notification.priority !== 'urgent') {
        if (this.isInDNDPeriod(prefs.doNotDisturb)) {
          return false;
        }
      }
    }
    
    // Check frequency limits
    if (prefs.frequency) {
      if (!this.checkFrequencyLimit(recipient.id, prefs.frequency)) {
        return false;
      }
    }
    
    // Check digest preferences
    if (prefs.digest?.enabled && prefs.digest.types?.includes(notification.type)) {
      this.addToDigest(recipient.id, notification);
      return false;
    }
    
    return true;
  }

  /**
   * Select best channel
   */
  private selectBestChannel(
    notification: Notification,
    recipient: Recipient
  ): ChannelType | null {
    // Get available channels
    const availableChannels = recipient.channels
      .filter(ch => ch.verified)
      .sort((a, b) => b.priority - a.priority);
    
    // Check notification channel preferences
    const preferredChannels = notification.channels
      .filter(ch => ch.enabled)
      .sort((a, b) => b.priority - a.priority);
    
    // Find best match
    for (const prefChannel of preferredChannels) {
      const recipientChannel = availableChannels.find(
        ch => ch.channel === prefChannel.type
      );
      
      if (recipientChannel && this.isChannelAvailable(recipientChannel)) {
        return recipientChannel.channel;
      }
    }
    
    // Use fallback
    return this.config.fallbackChannel;
  }

  /**
   * Check if channel is available
   */
  private isChannelAvailable(channel: ChannelPreference): boolean {
    // Check schedule windows
    if (channel.schedule && channel.schedule.length > 0) {
      const now = new Date();
      return channel.schedule.some(window => 
        this.isInScheduleWindow(now, window)
      );
    }
    
    return true;
  }

  /**
   * Check schedule window
   */
  private isInScheduleWindow(date: Date, window: ScheduleWindow): boolean {
    const day = date.getDay();
    if (!window.days.includes(day)) {
      return false;
    }
    
    const time = date.toTimeString().slice(0, 5);
    return time >= window.startTime && time <= window.endTime;
  }

  /**
   * Check DND period
   */
  private isInDNDPeriod(dnd: DoNotDisturbConfig): boolean {
    if (!dnd.schedule) return false;
    
    const now = new Date();
    return dnd.schedule.some(window => 
      this.isInScheduleWindow(now, window)
    );
  }

  /**
   * Check frequency limit
   */
  private checkFrequencyLimit(
    recipientId: string,
    frequency: FrequencyConfig
  ): boolean {
    // Implementation would check actual send counts
    // Simplified for demo
    return true;
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(key: string): Promise<boolean> {
    const limiter = this.getRateLimiter(key);
    return limiter.allow();
  }

  /**
   * Get rate limiter
   */
  private getRateLimiter(key: string): RateLimiter {
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, new RateLimiter(this.config.rateLimit));
    }
    return this.rateLimiters.get(key)!;
  }

  /**
   * Queue notification
   */
  private async queueNotification(
    notification: Notification,
    recipient: Recipient
  ): Promise<void> {
    const queueKey = `${recipient.id}_queue`;
    
    if (!this.queue.has(queueKey)) {
      this.queue.set(queueKey, []);
    }
    
    const queue = this.queue.get(queueKey)!;
    
    if (queue.length < this.config.queueSize) {
      queue.push(notification);
      this.emit('notification:queued', { notification, recipient });
    } else {
      logger.warn(`Queue full for recipient ${recipient.id}`);
    }
  }

  /**
   * Add to digest
   */
  private addToDigest(recipientId: string, notification: Notification): void {
    const digestKey = `${recipientId}_digest`;
    
    if (!this.digestQueues.has(digestKey)) {
      this.digestQueues.set(digestKey, []);
    }
    
    this.digestQueues.get(digestKey)!.push(notification);
    this.emit('notification:digested', { recipientId, notification });
  }

  /**
   * Schedule notification
   */
  private async scheduleNotification(notification: Notification): Promise<void> {
    if (!notification.scheduling?.sendAt) return;
    
    const delay = notification.scheduling.sendAt.getTime() - Date.now();
    
    if (delay <= 0) {
      await this.processNotification(notification);
    } else {
      notification.status = 'scheduled';
      
      const timer = setTimeout(async () => {
        await this.processNotification(notification);
        this.timers.delete(notification.id);
      }, delay);
      
      this.timers.set(notification.id, timer);
    }
  }

  /**
   * Track delivery
   */
  private trackDelivery(
    notification: Notification,
    recipient: Recipient,
    channel: ChannelType,
    result: any
  ): void {
    notification.status = 'delivered';
    notification.deliveredAt = new Date();
    
    this.emit('notification:delivered', {
      notification,
      recipient,
      channel,
      result
    });
    
    // Send webhook if configured
    if (notification.tracking?.webhookUrl) {
      this.sendTrackingWebhook(
        notification.tracking.webhookUrl,
        'delivered',
        { notification, recipient, channel }
      );
    }
  }

  /**
   * Send tracking webhook
   */
  private async sendTrackingWebhook(
    url: string,
    event: string,
    data: any
  ): Promise<void> {
    // Implementation would send actual webhook
    logger.debug(`Tracking webhook: ${event} to ${url}`);
  }

  /**
   * Process batch parallel
   */
  private async processBatchParallel(batch: NotificationBatch): Promise<void> {
    const promises = batch.notifications.map(notification =>
      this.processNotification(notification)
        .then(() => {
          batch.progress.sent++;
          batch.progress.pending--;
        })
        .catch(() => {
          batch.progress.failed++;
          batch.progress.pending--;
        })
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Process batch sequential
   */
  private async processBatchSequential(batch: NotificationBatch): Promise<void> {
    for (const notification of batch.notifications) {
      try {
        await this.processNotification(notification);
        batch.progress.sent++;
      } catch (error) {
        batch.progress.failed++;
      }
      batch.progress.pending--;
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    notification: Notification,
    channel: ChannelType,
    event: 'sent' | 'delivered' | 'failed'
  ): void {
    this.metrics.sent++;
    
    if (!this.metrics.byChannel[channel]) {
      this.metrics.byChannel[channel] = {
        sent: 0,
        delivered: 0,
        failed: 0
      };
    }
    
    const channelMetrics = this.metrics.byChannel[channel];
    
    switch (event) {
      case 'sent':
        channelMetrics.sent++;
        break;
      case 'delivered':
        channelMetrics.delivered++;
        this.metrics.delivered++;
        break;
      case 'failed':
        channelMetrics.failed++;
        this.metrics.failed++;
        break;
    }
    
    this.metrics.byType[notification.type] = 
      (this.metrics.byType[notification.type] || 0) + 1;
    
    // Calculate success rate
    const total = this.metrics.sent;
    const successful = this.metrics.delivered;
    this.metrics.successRate = total > 0 ? (successful / total) * 100 : 0;
  }

  /**
   * Create default template
   */
  private createDefaultTemplate(type: NotificationType): NotificationTemplate {
    return {
      id: `default_${type}`,
      name: `Default ${type} template`,
      type,
      channels: [
        {
          channel: 'email',
          subject: '{{subject}}',
          content: '{{message}}',
          format: 'html'
        },
        {
          channel: 'sms',
          content: '{{message}}',
          format: 'text'
        }
      ],
      variables: [
        { name: 'subject', type: 'string', required: false },
        { name: 'message', type: 'string', required: true }
      ]
    };
  }

  /**
   * Determine channels
   */
  private determineChannels(channels?: ChannelType[]): NotificationChannel[] {
    const channelTypes = channels || this.config.defaultChannels;
    
    return channelTypes.map((type, index) => ({
      type,
      config: {},
      enabled: true,
      priority: channelTypes.length - index
    }));
  }

  /**
   * Register default providers
   */
  private registerDefaultProviders(): void {
    // Email provider
    this.registerProvider({
      name: 'default-email',
      type: 'email',
      async send(notification, recipient) {
        logger.debug(`Sending email to ${recipient.id}`);
        return { messageId: crypto.randomBytes(16).toString('hex') };
      }
    });

    // SMS provider
    this.registerProvider({
      name: 'default-sms',
      type: 'sms',
      async send(notification, recipient) {
        logger.debug(`Sending SMS to ${recipient.id}`);
        return { messageId: crypto.randomBytes(16).toString('hex') };
      }
    });

    // In-app provider
    this.registerProvider({
      name: 'default-in-app',
      type: 'in-app',
      async send(notification, recipient) {
        logger.debug(`Sending in-app notification to ${recipient.id}`);
        return { messageId: crypto.randomBytes(16).toString('hex') };
      }
    });
  }

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    // Process queues
    setInterval(() => {
      this.processQueues();
    }, 5000);

    // Send digests
    setInterval(() => {
      this.sendDigests();
    }, 60000);

    // Clean old notifications
    setInterval(() => {
      this.cleanOldNotifications();
    }, 3600000);
  }

  /**
   * Process queues
   */
  private async processQueues(): Promise<void> {
    for (const [key, queue] of Array.from(this.queue.entries())) {
      if (queue.length === 0) continue;

      const notification = queue.shift();
      if (notification) {
        await this.processNotification(notification);
      }
    }
  }

  /**
   * Send digests
   */
  private async sendDigests(): Promise<void> {
    for (const [key, notifications] of Array.from(this.digestQueues.entries())) {
      if (notifications.length === 0) continue;

      const recipientId = key.replace('_digest', '');
      const recipient = this.recipients.get(recipientId);

      if (recipient && this.shouldSendDigest(recipient)) {
        await this.sendDigest(recipient, notifications);
        this.digestQueues.set(key, []);
      }
    }
  }

  /**
   * Should send digest
   */
  private shouldSendDigest(recipient: Recipient): boolean {
    const digest = recipient.preferences?.digest;
    if (!digest?.enabled) return false;
    
    // Check frequency
    const now = new Date();
    const hour = now.getHours();
    
    switch (digest.frequency) {
      case 'hourly':
        return true;
      case 'daily':
        return hour === parseInt(digest.time || '9');
      case 'weekly':
        return now.getDay() === 1 && hour === parseInt(digest.time || '9');
      default:
        return false;
    }
  }

  /**
   * Send digest
   */
  private async sendDigest(
    recipient: Recipient,
    notifications: Notification[]
  ): Promise<void> {
    const digestData = {
      count: notifications.length,
      notifications: notifications.map(n => ({
        type: n.type,
        data: n.data,
        createdAt: n.createdAt
      }))
    };
    
    await this.send(
      'info',
      [recipient],
      digestData,
      {
        template: 'digest',
        priority: 'low'
      }
    );
  }

  /**
   * Clean old notifications
   */
  private cleanOldNotifications(): void {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

    for (const [id, notification] of Array.from(this.notifications.entries())) {
      if (notification.createdAt < cutoff) {
        this.notifications.delete(id);
      }
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('notification:delivered', ({ notification }) => {
      this.updateMetrics(notification, notification.channels[0].type, 'delivered');
    });

    this.on('notification:failed', ({ notification }) => {
      this.updateMetrics(notification, notification.channels[0].type, 'failed');
    });
  }

  /**
   * Generate notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create empty metrics
   */
  private createEmptyMetrics(): NotificationMetrics {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
      bounced: 0,
      unsubscribed: 0,
      byChannel: {} as Record<ChannelType, ChannelMetrics>,
      byType: {} as Record<NotificationType, number>,
      avgDeliveryTime: 0,
      successRate: 0
    };
  }

  /**
   * Get metrics
   */
  getMetrics(): NotificationMetrics {
    return { ...this.metrics };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    // Clear all timers
    for (const timer of Array.from(this.timers.values())) {
      clearTimeout(timer);
    }

    this.removeAllListeners();
    logger.debug('Notification system shut down');
  }
}

// Helper classes
class RateLimiter {
  private counts: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  allow(): boolean {
    const now = Date.now();
    const key = 'default';
    
    if (!this.counts.has(key)) {
      this.counts.set(key, []);
    }
    
    const timestamps = this.counts.get(key)!;
    
    // Remove old timestamps
    const oneHourAgo = now - 3600000;
    const filtered = timestamps.filter(t => t > oneHourAgo);
    this.counts.set(key, filtered);
    
    // Check limits
    if (this.config.maxPerHour && filtered.length >= this.config.maxPerHour) {
      return false;
    }
    
    // Add current timestamp
    filtered.push(now);
    return true;
  }
}

// Configuration interface
interface NotificationConfig {
  defaultChannels: ChannelType[];
  fallbackChannel: ChannelType;
  trackingEnabled: boolean;
  digestEnabled: boolean;
  retryAttempts: number;
  queueSize: number;
  batchSize: number;
  rateLimit: RateLimitConfig;
}

// Export singleton instance
export const notificationSystem = new MultiChannelNotificationSystem();