/**
 * PLAN C PHASE 3 - Service Monolithique 4: Notifications Unifiées
 * Consolide notifications, alertes, événements, webhooks et messages temps réel
 * REFACTORED: Utilise SharedPatterns pour éliminer les duplications
 */

import { logger } from '../LoggingService';
import cacheService from '../CacheService';
import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';
import {
  withErrorHandling,
  withRetry,
  withCache,
  debounce,
  throttle,
  generateId,
  groupBy,
  processBatch
} from '../../utils/SharedPatterns';

// Types
export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'websocket' | 'slack' | 'teams' | 'discord' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
  rateLimit?: RateLimit;
  filters?: NotificationFilter[];
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: any;
  source: string;
  timestamp: Date;
  channels: string[];
  metadata?: Record<string, any>;
  ttl?: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channels: string[];
  subject?: string;
  bodyTemplate: string;
  variables: string[];
  formatting?: NotificationFormatting;
}

export interface NotificationFormatting {
  html?: boolean;
  markdown?: boolean;
  attachments?: boolean;
  inlineImages?: boolean;
}

export interface NotificationFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'regex';
  value: any;
  action: 'include' | 'exclude';
}

export interface RateLimit {
  maxPerMinute?: number;
  maxPerHour?: number;
  maxPerDay?: number;
  burstLimit?: number;
}

export interface NotificationSubscription {
  id: string;
  userId: string;
  channels: string[];
  types: string[];
  filters?: NotificationFilter[];
  preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  emailDigest?: boolean;
  digestFrequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours?: { start: string; end: string };
  timezone?: string;
  language?: string;
}

export interface Alert {
  id: string;
  name: string;
  condition: AlertCondition;
  notification: Notification;
  cooldown?: number;
  autoResolve?: boolean;
  escalation?: EscalationPolicy;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'contains';
  threshold: any;
  duration?: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  repeatInterval?: number;
  maxEscalations?: number;
}

export interface EscalationLevel {
  delay: number;
  channels: string[];
  notifyUsers?: string[];
  notifyGroups?: string[];
}

/**
 * Service unifié de notifications
 */
export class UnifiedNotificationService extends EventEmitter {
  private static instance: UnifiedNotificationService;
  
  // Configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly NOTIFICATION_QUEUE_SIZE = 10000;
  private readonly BATCH_SIZE = 100;
  private readonly DIGEST_INTERVAL = 3600000; // 1 hour
  
  // Storage
  private channels: Map<string, NotificationChannel> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private notificationQueue: Notification[] = [];
  private digestQueue: Map<string, Notification[]> = new Map();
  
  // Rate limiting
  private rateLimiters: Map<string, RateLimiter> = new Map();
  
  // WebSocket connections
  private wsServer: WebSocketServer | null = null;
  private wsClients: Map<string, WebSocket> = new Map();
  
  // Processing
  private processingTimer: NodeJS.Timeout | null = null;
  private digestTimer: NodeJS.Timeout | null = null;
  
  private constructor() {
    super();
    this.initialize();
  }
  
  static getInstance(): UnifiedNotificationService {
    if (!UnifiedNotificationService.instance) {
      UnifiedNotificationService.instance = new UnifiedNotificationService();
    }
    return UnifiedNotificationService.instance;
  }
  
  private initialize(): void {
    // Setup default channels
    this.setupDefaultChannels();
    
    // Start notification processor
    this.startNotificationProcessor();
    
    // Start digest processor
    this.startDigestProcessor();
    
    // Setup WebSocket server
    this.setupWebSocketServer();
    
    logger.info('Unified Notification Service initialized');
  }
  
  /**
   * Send a notification
   */
  async send(notification: Omit<Notification, 'id' | 'timestamp'>): Promise<void> {
    await withErrorHandling(
      async () => {
        const fullNotification: Notification = {
          ...notification,
          id: generateId('notif'),
          timestamp: new Date()
        };
        
        // Validate notification
        this.validateNotification(fullNotification);
        
        // Apply filters
        const filteredChannels = await this.applyFilters(fullNotification);
        
        if (filteredChannels.length === 0) {
          logger.debug('Notification filtered out, no channels to send to');
          return;
        }
        
        fullNotification.channels = filteredChannels;
        
        // Check rate limits
        for (const channelId of filteredChannels) {
          if (!this.checkRateLimit(channelId)) {
            logger.warn(`Rate limit exceeded for channel ${channelId}`);
            fullNotification.channels = fullNotification.channels.filter(c => c !== channelId);
          }
        }
        
        if (fullNotification.channels.length === 0) {
          logger.warn('All channels rate limited');
          return;
        }
        
        // Queue notification
        this.queueNotification(fullNotification);
        
        // Emit event
        this.emit('notification.sent', fullNotification);
        
        logger.info(`Notification ${fullNotification.id} queued for delivery`);
      },
      {
        operation: 'send',
        module: 'UnifiedNotificationService',
        data: notification
      }
    );
  }
  
  /**
   * Send notification using template
   */
  async sendFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    overrides?: Partial<Notification>
  ): Promise<void> {
    try {
      const template = this.templates.get(templateId);
      
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      // Render template
      const rendered = this.renderTemplate(template, variables);
      
      // Create notification
      const notification: Omit<Notification, 'id' | 'timestamp'> = {
        type: 'info',
        severity: 'medium',
        title: rendered.subject || template.name,
        message: rendered.body,
        source: `template:${templateId}`,
        channels: template.channels,
        data: variables,
        ...overrides
      };
      
      await this.send(notification);
      
    } catch (error) {
      logger.error(`Failed to send from template ${templateId}:`, error);
      throw error;
    }
  }
  
  /**
   * Broadcast notification to all subscribers
   */
  async broadcast(
    notification: Omit<Notification, 'id' | 'timestamp' | 'channels'>
  ): Promise<void> {
    try {
      // Get all active channels
      const activeChannels = Array.from(this.channels.values())
        .filter(c => c.enabled)
        .map(c => c.id);
      
      await this.send({
        ...notification,
        channels: activeChannels
      });
      
      logger.info(`Broadcast notification sent to ${activeChannels.length} channels`);
      
    } catch (error) {
      logger.error('Broadcast failed:', error);
      throw error;
    }
  }
  
  /**
   * Create an alert
   */
  async createAlert(alert: Alert): Promise<void> {
    try {
      this.alerts.set(alert.id, alert);
      
      // Start monitoring
      this.startAlertMonitoring(alert);
      
      logger.info(`Alert ${alert.id} created`);
      
    } catch (error) {
      logger.error('Failed to create alert:', error);
      throw error;
    }
  }
  
  /**
   * Trigger an alert
   */
  async triggerAlert(alertId: string, data?: any): Promise<void> {
    try {
      const alert = this.alerts.get(alertId);
      
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }
      
      // Check cooldown
      const lastTriggered = await this.getAlertLastTriggered(alertId);
      
      if (lastTriggered && alert.cooldown) {
        const elapsed = Date.now() - lastTriggered.getTime();
        if (elapsed < alert.cooldown) {
          logger.debug(`Alert ${alertId} in cooldown period`);
          return;
        }
      }
      
      // Send notification
      await this.send({
        ...alert.notification,
        data: { ...alert.notification.data, ...data }
      });
      
      // Handle escalation
      if (alert.escalation) {
        await this.startEscalation(alert, data);
      }
      
      // Update last triggered
      await this.setAlertLastTriggered(alertId, new Date());
      
      logger.info(`Alert ${alertId} triggered`);
      
    } catch (error) {
      logger.error(`Failed to trigger alert ${alertId}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to notifications
   */
  async subscribe(subscription: NotificationSubscription): Promise<void> {
    try {
      this.subscriptions.set(subscription.id, subscription);

      // Store in cache for persistence
      try {
        await cacheService.set(
          `subscription:${subscription.id}`,
          subscription,
          86400 * 365 // 1 year (pseudo-no expiry)
        );
      } catch (cacheError) {
        logger.warn('Failed to cache subscription:', cacheError);
      }

      logger.info(`Subscription ${subscription.id} created for user ${subscription.userId}`);

    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }
  
  /**
   * Register a notification channel
   */
  registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    
    // Setup rate limiter if configured
    if (channel.rateLimit) {
      this.rateLimiters.set(channel.id, new RateLimiter(channel.rateLimit));
    }
    
    logger.info(`Channel ${channel.id} registered (type: ${channel.type})`);
  }
  
  /**
   * Register a notification template
   */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`Template ${template.id} registered`);
  }
  
  /**
   * Get notification history
   */
  async getHistory(
    filters?: {
      userId?: string;
      type?: string;
      severity?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Notification[]> {
    try {
      // In production, this would query a database
      // For now, return from cache
      const history: Notification[] = [];
      
      // Apply filters
      // ...
      
      return history.slice(0, filters?.limit || 100);
      
    } catch (error) {
      logger.error('Failed to get notification history:', error);
      return [];
    }
  }
  
  /**
   * Private helper methods
   */
  
  private setupDefaultChannels(): void {
    // Console channel (for development)
    this.registerChannel({
      id: 'console',
      type: 'custom',
      config: {},
      enabled: true
    });
    
    // WebSocket channel
    this.registerChannel({
      id: 'websocket',
      type: 'websocket',
      config: {},
      enabled: true
    });
  }
  
  private startNotificationProcessor(): void {
    this.processingTimer = setInterval(async () => {
      await this.processNotificationQueue();
    }, 1000);
  }
  
  private async processNotificationQueue(): Promise<void> {
    if (this.notificationQueue.length === 0) return;
    
    const batch = this.notificationQueue.splice(0, this.BATCH_SIZE);
    
    for (const notification of batch) {
      try {
        await this.deliverNotification(notification);
      } catch (error) {
        logger.error(`Failed to deliver notification ${notification.id}:`, error);
        
        // Retry logic
        if (!notification.metadata?.retryCount || notification.metadata.retryCount < this.MAX_RETRY_ATTEMPTS) {
          notification.metadata = {
            ...notification.metadata,
            retryCount: (notification.metadata?.retryCount || 0) + 1
          };
          this.notificationQueue.push(notification);
        }
      }
    }
  }
  
  private async deliverNotification(notification: Notification): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const channelId of notification.channels) {
      const channel = this.channels.get(channelId);
      
      if (!channel || !channel.enabled) continue;
      
      promises.push(this.deliverToChannel(notification, channel));
    }
    
    await Promise.allSettled(promises);
    
    // Store notification history
    await this.storeNotificationHistory(notification);
  }
  
  private async deliverToChannel(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<void> {
    switch (channel.type) {
      case 'console':
        logger.debug(`[${notification.type.toUpperCase()}] ${notification.title}: ${notification.message}`);
        break;
      
      case 'websocket':
        this.broadcastWebSocket(notification);
        break;
      
      case 'webhook':
        await this.sendWebhook(notification, channel);
        break;
      
      case 'email':
        await this.sendEmail(notification, channel);
        break;
      
      case 'slack':
        await this.sendSlack(notification, channel);
        break;
      
      case 'custom':
        if (channel.config.handler) {
          await channel.config.handler(notification);
        }
        break;
      
      default:
        logger.warn(`Unsupported channel type: ${channel.type}`);
    }
  }
  
  private broadcastWebSocket(notification: Notification): void {
    const message = JSON.stringify({
      type: 'notification',
      data: notification
    });
    
    for (const [clientId, ws] of this.wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
  
  private async sendWebhook(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<void> {
    const { url, headers = {}, method = 'POST' } = channel.config;
    
    // In production, use proper HTTP client
    logger.info(`Webhook sent to ${url}`);
  }
  
  private async sendEmail(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<void> {
    // In production, use email service
    logger.info(`Email sent: ${notification.title}`);
  }
  
  private async sendSlack(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<void> {
    // In production, use Slack API
    logger.info(`Slack notification sent`);
  }
  
  private startDigestProcessor(): void {
    this.digestTimer = setInterval(async () => {
      await this.processDigestQueue();
    }, this.DIGEST_INTERVAL);
  }
  
  private async processDigestQueue(): Promise<void> {
    for (const [userId, notifications] of this.digestQueue) {
      if (notifications.length === 0) continue;
      
      // Create digest notification
      const digest: Omit<Notification, 'id' | 'timestamp'> = {
        type: 'info',
        severity: 'low',
        title: `Digest: ${notifications.length} notifications`,
        message: this.createDigestMessage(notifications),
        source: 'digest',
        channels: ['email'],
        data: { notifications }
      };
      
      await this.send(digest);
      
      // Clear digest queue for user
      this.digestQueue.set(userId, []);
    }
  }
  
  private createDigestMessage(notifications: Notification[]): string {
    const grouped = this.groupNotificationsByType(notifications);
    let message = 'Notification Summary:\n\n';
    
    for (const [type, items] of Object.entries(grouped)) {
      message += `${type}: ${items.length} notifications\n`;
      
      for (const item of items.slice(0, 5)) {
        message += `  - ${item.title}\n`;
      }
      
      if (items.length > 5) {
        message += `  ... and ${items.length - 5} more\n`;
      }
      
      message += '\n';
    }
    
    return message;
  }
  
  private groupNotificationsByType(
    notifications: Notification[]
  ): Record<string, Notification[]> {
    return groupBy(notifications, (notification) => notification.type);
  }
  
  private setupWebSocketServer(): void {
    if (typeof window === 'undefined') {
      // Server-side only
      this.wsServer = new WebSocketServer({ port: 8080 });
      
      this.wsServer.on('connection', (ws, req) => {
        const clientId = this.generateClientId();
        this.wsClients.set(clientId, ws);
        
        ws.on('close', () => {
          this.wsClients.delete(clientId);
        });
        
        logger.info(`WebSocket client ${clientId} connected`);
      });
    }
  }
  
  private validateNotification(notification: Notification): void {
    if (!notification.title || !notification.message) {
      throw new Error('Notification must have title and message');
    }
    
    if (!notification.channels || notification.channels.length === 0) {
      throw new Error('Notification must have at least one channel');
    }
  }
  
  private async applyFilters(notification: Notification): Promise<string[]> {
    const filteredChannels: string[] = [];
    
    for (const channelId of notification.channels) {
      const channel = this.channels.get(channelId);
      
      if (!channel || !channel.enabled) continue;
      
      if (channel.filters) {
        const passed = this.evaluateFilters(notification, channel.filters);
        if (passed) {
          filteredChannels.push(channelId);
        }
      } else {
        filteredChannels.push(channelId);
      }
    }
    
    return filteredChannels;
  }
  
  private evaluateFilters(
    notification: Notification,
    filters: NotificationFilter[]
  ): boolean {
    for (const filter of filters) {
      const value = this.getNestedValue(notification, filter.field);
      const match = this.evaluateFilter(value, filter);
      
      if (filter.action === 'exclude' && match) {
        return false;
      }
      
      if (filter.action === 'include' && !match) {
        return false;
      }
    }
    
    return true;
  }
  
  private evaluateFilter(value: any, filter: NotificationFilter): boolean {
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      
      case 'contains':
        return String(value).includes(String(filter.value));
      
      case 'gt':
        return value > filter.value;
      
      case 'lt':
        return value < filter.value;
      
      case 'regex':
        return new RegExp(filter.value).test(String(value));
      
      default:
        return false;
    }
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private checkRateLimit(channelId: string): boolean {
    const limiter = this.rateLimiters.get(channelId);
    
    if (!limiter) return true;
    
    return limiter.tryConsume();
  }
  
  private queueNotification(notification: Notification): void {
    if (this.notificationQueue.length >= this.NOTIFICATION_QUEUE_SIZE) {
      // Remove oldest notification
      this.notificationQueue.shift();
    }
    
    this.notificationQueue.push(notification);
  }
  
  private renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>
  ): { subject?: string; body: string } {
    let body = template.bodyTemplate;
    let subject = template.subject;
    
    // Simple variable replacement
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      body = body.replace(regex, String(value));
      
      if (subject) {
        subject = subject.replace(regex, String(value));
      }
    }
    
    return { subject, body };
  }
  
  private startAlertMonitoring(alert: Alert): void {
    // In production, this would monitor metrics
    logger.info(`Started monitoring for alert ${alert.id}`);
  }
  
  private async startEscalation(alert: Alert, data: any): Promise<void> {
    if (!alert.escalation) return;
    
    for (const level of alert.escalation.levels) {
      await new Promise(resolve => setTimeout(resolve, level.delay));
      
      // Check if alert is still active
      // Send escalation notification
      await this.send({
        type: 'alert',
        severity: 'high',
        title: `[ESCALATED] ${alert.notification.title}`,
        message: alert.notification.message,
        source: `alert:${alert.id}:escalation`,
        channels: level.channels,
        data
      });
    }
  }
  
  private async getAlertLastTriggered(alertId: string): Promise<Date | null> {
    const cached = await cacheService.get(`alert:${alertId}:lastTriggered`);
    return cached ? new Date(cached) : null;
  }
  
  private async setAlertLastTriggered(alertId: string, date: Date): Promise<void> {
    try {
      await cacheService.set(
        `alert:${alertId}:lastTriggered`,
        date.toISOString(),
        86400 // 24 hours
      );
    } catch (error) {
      logger.warn('Failed to cache alert last triggered:', error);
    }
  }

  private async storeNotificationHistory(notification: Notification): Promise<void> {
    try {
      await cacheService.set(
        `notification:${notification.id}`,
        notification,
        (notification as any).ttl || 86400 // 24 hours default
      );
    } catch (error) {
      logger.warn('Failed to cache notification history:', error);
    }
  }
  
  private generateNotificationId(): string {
    return generateId('notif');
  }
  
  private generateClientId(): string {
    return generateId('client');
  }
}

/**
 * Rate limiter helper class
 */
class RateLimiter {
  private tokens: Map<string, number> = new Map();
  private config: RateLimit;
  
  constructor(config: RateLimit) {
    this.config = config;
  }
  
  tryConsume(key: string = 'default'): boolean {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / 60000)}`; // Per minute
    
    const current = this.tokens.get(windowKey) || 0;
    
    if (this.config.maxPerMinute && current >= this.config.maxPerMinute) {
      return false;
    }
    
    this.tokens.set(windowKey, current + 1);
    
    // Cleanup old tokens
    for (const [k, _] of this.tokens) {
      if (!k.startsWith(`${key}:${Math.floor(now / 60000)}`)) {
        this.tokens.delete(k);
      }
    }
    
    return true;
  }
}

// Export singleton instance
export const notificationService = UnifiedNotificationService.getInstance();