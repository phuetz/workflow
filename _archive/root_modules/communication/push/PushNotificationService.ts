import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface PushNotification {
  id: string;
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos';
  deviceToken: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: number;
  sound?: string;
  category?: string;
  thread?: string;
  collapseKey?: string;
  priority: 'min' | 'low' | 'default' | 'high' | 'max';
  timeToLive?: number;
  scheduledAt?: number;
  data?: { [key: string]: unknown };
  actions?: PushAction[];
  localization?: {
    titleKey?: string;
    titleArgs?: string[];
    bodyKey?: string;
    bodyArgs?: string[];
    locale?: string;
  };
  metadata: {
    timestamp: number;
    tenantId?: string;
    userId?: string;
    workflowId?: string;
    executionId?: string;
    campaignId?: string;
    messageId: string;
    appId?: string;
    environment?: 'development' | 'staging' | 'production';
    version?: string;
  };
  targeting?: {
    userSegments?: string[];
    geofence?: {
      latitude: number;
      longitude: number;
      radius: number;
    };
    timeRange?: {
      start: string;
      end: string;
      timezone: string;
    };
    conditions?: TargetingCondition[];
  };
}

export interface PushAction {
  id: string;
  title: string;
  icon?: string;
  type: 'button' | 'text_input';
  destructive?: boolean;
  authenticationRequired?: boolean;
  foreground?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface TargetingCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
}

export interface PushDeliveryStatus {
  notificationId: string;
  deviceToken: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'expired' | 'clicked' | 'dismissed';
  timestamp: number;
  provider?: string;
  providerMessageId?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  events: PushEvent[];
  analytics?: {
    deliveredAt?: number;
    openedAt?: number;
    clickedAt?: number;
    dismissedAt?: number;
    actionTaken?: string;
  };
}

export interface PushEvent {
  type: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'dismissed' | 'failed' | 'expired';
  timestamp: number;
  data?: {
    actionId?: string;
    errorCode?: string;
    userAgent?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    device?: {
      model?: string;
      os?: string;
      osVersion?: string;
      appVersion?: string;
    };
  };
}

export interface PushTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  platform: PushNotification['platform'] | 'universal';
  variables: { [key: string]: unknown };
  rich?: {
    image?: string;
    video?: string;
    audio?: string;
    attachments?: Array<{
      type: 'image' | 'video' | 'audio' | 'document';
      url: string;
      thumbnail?: string;
    }>;
  };
  interactive?: {
    actions: PushAction[];
    category: string;
  };
  styling?: {
    color?: string;
    icon?: string;
    largeIcon?: string;
    smallIcon?: string;
    accentColor?: string;
    ledColor?: string;
    vibrationPattern?: number[];
  };
  conditions?: TemplateCondition[];
  localization?: { [locale: string]: PushTemplateLocale };
}

export interface TemplateCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
  template: Partial<PushTemplate>;
}

export interface PushTemplateLocale {
  title: string;
  body: string;
  actions?: Array<{
    id: string;
    title: string;
  }>;
}

export interface PushCampaign {
  id: string;
  name: string;
  template: PushTemplate;
  audience: PushAudience;
  schedule?: PushSchedule;
  settings: CampaignSettings;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'completed';
  statistics: CampaignStatistics;
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    tags: string[];
    budget?: {
      maxNotifications: number;
      costPerNotification?: number;
    };
  };
}

export interface PushAudience {
  id: string;
  name: string;
  type: 'all_users' | 'segments' | 'topics' | 'devices' | 'custom';
  criteria: AudienceCriteria;
  estimatedSize?: number;
  exclusions?: {
    unsubscribed: boolean;
    recentlySent?: number; // hours
    segments?: string[];
    topics?: string[];
  };
}

export interface AudienceCriteria {
  segments?: string[];
  topics?: string[];
  deviceTokens?: string[];
  userIds?: string[];
  filters?: AudienceFilter[];
  geolocation?: {
    regions: Array<{
      country?: string;
      state?: string;
      city?: string;
      coordinates?: {
        latitude: number;
        longitude: number;
        radius: number;
      };
    }>;
  };
  deviceCriteria?: {
    platforms?: PushNotification['platform'][];
    appVersions?: string[];
    osVersions?: string[];
    deviceModels?: string[];
    lastSeenAfter?: number;
    installDate?: {
      after?: number;
      before?: number;
    };
  };
  behavioral?: {
    engagementLevel?: 'high' | 'medium' | 'low';
    lastOpenAfter?: number;
    purchaseHistory?: boolean;
    customEvents?: Array<{
      event: string;
      count?: number;
      timeframe?: number;
    }>;
  };
}

export interface AudienceFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex' | 'exists';
  value?: unknown;
}

export interface PushSchedule {
  type: 'immediate' | 'scheduled' | 'recurring' | 'triggered' | 'optimal';
  sendAt?: number;
  timezone?: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    timeOfDay?: string;
    endDate?: number;
    maxOccurrences?: number;
  };
  triggered?: {
    event: string;
    delay?: number;
    conditions?: TargetingCondition[];
  };
  throttling?: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
    batchSize: number;
    batchDelay: number;
  };
  optimization?: {
    sendTimeOptimization: boolean;
    frequencyCapping?: {
      maxPerDay: number;
      maxPerWeek: number;
      maxPerMonth: number;
    };
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
  };
}

export interface CampaignSettings {
  tracking: {
    delivery: boolean;
    opens: boolean;
    clicks: boolean;
    conversions: boolean;
    customEvents: string[];
  };
  delivery: {
    priority: PushNotification['priority'];
    timeToLive: number;
    collapseKey?: string;
    delayWhileIdle: boolean;
    dryRun: boolean;
  };
  fallback: {
    enabled: boolean;
    channels: ('email' | 'sms' | 'webhook')[];
    delay: number;
    conditions: Array<{
      event: 'not_delivered' | 'not_opened' | 'failed';
      timeframe: number;
    }>;
  };
  abTesting?: {
    enabled: boolean;
    testPercent: number;
    winnerCriteria: 'open_rate' | 'click_rate' | 'conversion_rate';
    testDuration: number;
    variants: Array<{
      name: string;
      percentage: number;
      template: Partial<PushTemplate>;
    }>;
  };
  compliance: {
    respectOptOut: boolean;
    respectDoNotDisturb: boolean;
    respectQuietHours: boolean;
    gdprCompliant: boolean;
  };
}

export interface CampaignStatistics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  dismissed: number;
  failed: number;
  expired: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  dismissalRate: number;
  failureRate: number;
  avgDeliveryTime: number;
  avgTimeToOpen: number;
  platforms?: { [platform: string]: number };
  actions?: { [actionId: string]: number };
  errors?: { [errorCode: string]: number };
  geographics?: { [country: string]: { sent: number; opened: number; clicked: number } };
  timeDistribution?: Array<{
    hour: number;
    sent: number;
    delivered: number;
    opened: number;
  }>;
}

export interface DeviceRegistration {
  deviceToken: string;
  platform: PushNotification['platform'];
  userId?: string;
  appId: string;
  registeredAt: number;
  lastSeen: number;
  status: 'active' | 'inactive' | 'invalid' | 'unsubscribed';
  metadata: {
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    locale?: string;
    timezone?: string;
    tags?: string[];
    customData?: { [key: string]: unknown };
  };
  subscriptions: {
    topics: string[];
    segments: string[];
    categories: string[];
  };
  preferences: {
    enabled: boolean;
    categories?: { [category: string]: boolean };
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    frequency?: 'all' | 'important' | 'minimal';
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface PushProvider {
  name: string;
  type: 'apns' | 'fcm' | 'wns' | 'web_push' | 'huawei' | 'baidu';
  platform: PushNotification['platform'][];
  config: PushProviderConfig;
  capabilities: {
    richNotifications: boolean;
    interactiveNotifications: boolean;
    silentNotifications: boolean;
    groupedNotifications: boolean;
    scheduledNotifications: boolean;
    locationBasedNotifications: boolean;
    customSounds: boolean;
    badges: boolean;
    analytics: boolean;
  };
  limits: {
    maxPayloadSize: number;
    maxNotificationsPerSecond: number;
    maxNotificationsPerHour: number;
    maxNotificationsPerDay: number;
    maxTokensPerRequest: number;
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

export interface PushProviderConfig {
  // APNS (iOS)
  keyId?: string;
  teamId?: string;
  bundleId?: string;
  privateKey?: string;
  production?: boolean;
  
  // FCM (Android/Web)
  serverKey?: string;
  senderId?: string;
  projectId?: string;
  
  // WNS (Windows)
  clientId?: string;
  clientSecret?: string;
  
  // Web Push
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
  
  // Huawei HMS
  appId?: string;
  appSecret?: string;
  
  // Common settings
  timeout?: number;
  retries?: number;
  batchSize?: number;
  rateLimiting?: {
    enabled: boolean;
    requests: number;
    window: number;
  };
}

export interface PushServiceConfig {
  providers: PushProvider[];
  defaultProvider?: { [platform: string]: string };
  failover: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    healthCheckInterval: number;
  };
  analytics: {
    enabled: boolean;
    retention: number;
    realTimeTracking: boolean;
    customEvents: string[];
  };
  compliance: {
    respectOptOut: boolean;
    gdprCompliant: boolean;
    optInRequired: boolean;
    quietHours: {
      enabled: boolean;
      defaultStart: string;
      defaultEnd: string;
      timezone: string;
    };
  };
  performance: {
    batchSize: number;
    maxConcurrent: number;
    queueSize: number;
    retentionDays: number;
    cacheSize: number;
  };
  security: {
    encryptPayload: boolean;
    validateTokens: boolean;
    auditLogging: boolean;
    tokenRotation: {
      enabled: boolean;
      interval: number;
    };
  };
}

export class PushNotificationService extends EventEmitter {
  private config: PushServiceConfig;
  private providers: Map<string, PushProvider> = new Map();
  private templates: Map<string, PushTemplate> = new Map();
  private campaigns: Map<string, PushCampaign> = new Map();
  private audiences: Map<string, PushAudience> = new Map();
  private deviceRegistrations: Map<string, DeviceRegistration> = new Map();
  private deliveryStatuses: Map<string, PushDeliveryStatus> = new Map();
  private notificationQueue: PushNotification[] = [];
  private processingNotifications: Set<string> = new Set();
  private userSegments: Map<string, Set<string>> = new Map();
  private topics: Map<string, Set<string>> = new Map();
  private isProcessing = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: PushServiceConfig) {
    super();
    this.config = config;
    this.initializeProviders();
    this.startHealthChecks();
    this.startNotificationProcessor();
  }

  // Notification Operations
  public async sendPushNotification(notification: Omit<PushNotification, 'id' | 'metadata'>): Promise<string> {
    const pushNotification: PushNotification = {
      id: crypto.randomUUID(),
      metadata: {
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      },
      ...notification
    };

    // Validate notification
    await this.validateNotification(pushNotification);

    // Check device registration
    const device = this.deviceRegistrations.get(pushNotification.deviceToken);
    if (!device) {
      throw new Error(`Device not registered: ${pushNotification.deviceToken}`);
    }

    if (device.status !== 'active') {
      throw new Error(`Device is not active: ${device.status}`);
    }

    // Check user preferences
    if (!this.checkUserPreferences(device, pushNotification)) {
      throw new Error('Notification blocked by user preferences');
    }

    // Apply targeting conditions
    if (pushNotification.targeting && !this.evaluateTargeting(device, pushNotification.targeting)) {
      throw new Error('Device does not match targeting criteria');
    }

    // Apply template if specified
    await this.applyTemplate(pushNotification);

    // Queue notification for sending
    this.notificationQueue.push(pushNotification);

    // Initialize delivery status
    const deliveryStatus: PushDeliveryStatus = {
      notificationId: pushNotification.id,
      deviceToken: pushNotification.deviceToken,
      status: 'queued',
      timestamp: Date.now(),
      events: [{
        type: 'queued',
        timestamp: Date.now()
      }]
    };

    this.deliveryStatuses.set(pushNotification.id, deliveryStatus);

    this.emit('push:queued', pushNotification);
    return pushNotification.id;
  }

  public async sendToAudience(
    audience: PushAudience,
    notification: Omit<PushNotification, 'id' | 'metadata' | 'deviceToken'>
  ): Promise<string[]> {
    const devices = await this.getAudienceDevices(audience);
    const notificationIds: string[] = [];

    for (const device of devices) {
      try {
        const notificationId = await this.sendPushNotification({
          ...notification,
          deviceToken: device.deviceToken
        });
        notificationIds.push(notificationId);
      } catch (error) {
        this.emit('audience:send:error', { device, error });
      }
    }

    this.emit('audience:send:completed', { 
      audienceId: audience.id, 
      total: devices.length, 
      sent: notificationIds.length 
    });
    
    return notificationIds;
  }

  public async getDeliveryStatus(notificationId: string): Promise<PushDeliveryStatus | undefined> {
    return this.deliveryStatuses.get(notificationId);
  }

  // Device Management
  public async registerDevice(registration: Omit<DeviceRegistration, 'registeredAt' | 'lastSeen' | 'status'>): Promise<void> {
    const deviceRegistration: DeviceRegistration = {
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      status: 'active',
      subscriptions: { topics: [], segments: [], categories: [] },
      preferences: { enabled: true },
      ...registration
    };

    // Validate device token format
    await this.validateDeviceToken(deviceRegistration.deviceToken, deviceRegistration.platform);

    this.deviceRegistrations.set(deviceRegistration.deviceToken, deviceRegistration);

    // Add to default segments
    await this.addDeviceToSegment(deviceRegistration.deviceToken, 'all_users');
    await this.addDeviceToSegment(deviceRegistration.deviceToken, `platform_${deviceRegistration.platform}`);

    this.emit('device:registered', deviceRegistration);
  }

  public async unregisterDevice(deviceToken: string): Promise<void> {
    const device = this.deviceRegistrations.get(deviceToken);
    if (!device) {
      throw new Error(`Device not found: ${deviceToken}`);
    }

    device.status = 'inactive';

    // Remove from segments and topics
    for (const segment of device.subscriptions.segments) {
      await this.removeDeviceFromSegment(deviceToken, segment);
    }

    for (const topic of device.subscriptions.topics) {
      await this.unsubscribeFromTopic(deviceToken, topic);
    }

    this.emit('device:unregistered', device);
  }

  public async updateDevicePreferences(
    deviceToken: string, 
    preferences: Partial<DeviceRegistration['preferences']>
  ): Promise<void> {
    const device = this.deviceRegistrations.get(deviceToken);
    if (!device) {
      throw new Error(`Device not found: ${deviceToken}`);
    }

    device.preferences = { ...device.preferences, ...preferences };
    device.lastSeen = Date.now();

    this.emit('device:preferences:updated', { deviceToken, preferences });
  }

  public async updateDeviceLocation(
    deviceToken: string,
    location: DeviceRegistration['location']
  ): Promise<void> {
    const device = this.deviceRegistrations.get(deviceToken);
    if (!device) {
      throw new Error(`Device not found: ${deviceToken}`);
    }

    device.location = location;
    device.lastSeen = Date.now();

    this.emit('device:location:updated', { deviceToken, location });
  }

  // Topic Management
  public async subscribeToTopic(deviceToken: string, topic: string): Promise<void> {
    const device = this.deviceRegistrations.get(deviceToken);
    if (!device) {
      throw new Error(`Device not found: ${deviceToken}`);
    }

    if (!device.subscriptions.topics.includes(topic)) {
      device.subscriptions.topics.push(topic);
    }

    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic)!.add(deviceToken);

    this.emit('topic:subscribed', { deviceToken, topic });
  }

  public async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<void> {
    const device = this.deviceRegistrations.get(deviceToken);
    if (!device) {
      throw new Error(`Device not found: ${deviceToken}`);
    }

    device.subscriptions.topics = device.subscriptions.topics.filter(t => t !== topic);

    const topicDevices = this.topics.get(topic);
    if (topicDevices) {
      topicDevices.delete(deviceToken);
      if (topicDevices.size === 0) {
        this.topics.delete(topic);
      }
    }

    this.emit('topic:unsubscribed', { deviceToken, topic });
  }

  public async sendToTopic(
    topic: string,
    notification: Omit<PushNotification, 'id' | 'metadata' | 'deviceToken'>
  ): Promise<string[]> {
    const topicDevices = this.topics.get(topic);
    if (!topicDevices || topicDevices.size === 0) {
      return [];
    }

    const notificationIds: string[] = [];

    for (const deviceToken of topicDevices) {
      try {
        const notificationId = await this.sendPushNotification({
          ...notification,
          deviceToken
        });
        notificationIds.push(notificationId);
      } catch (error) {
        this.emit('topic:send:error', { deviceToken, topic, error });
      }
    }

    this.emit('topic:send:completed', { 
      topic, 
      total: topicDevices.size, 
      sent: notificationIds.length 
    });
    
    return notificationIds;
  }

  // Segment Management
  public async addDeviceToSegment(deviceToken: string, segment: string): Promise<void> {
    const device = this.deviceRegistrations.get(deviceToken);
    if (!device) {
      throw new Error(`Device not found: ${deviceToken}`);
    }

    if (!device.subscriptions.segments.includes(segment)) {
      device.subscriptions.segments.push(segment);
    }

    if (!this.userSegments.has(segment)) {
      this.userSegments.set(segment, new Set());
    }
    this.userSegments.get(segment)!.add(deviceToken);

    this.emit('segment:device:added', { deviceToken, segment });
  }

  public async removeDeviceFromSegment(deviceToken: string, segment: string): Promise<void> {
    const device = this.deviceRegistrations.get(deviceToken);
    if (!device) {
      throw new Error(`Device not found: ${deviceToken}`);
    }

    device.subscriptions.segments = device.subscriptions.segments.filter(s => s !== segment);

    const segmentDevices = this.userSegments.get(segment);
    if (segmentDevices) {
      segmentDevices.delete(deviceToken);
      if (segmentDevices.size === 0) {
        this.userSegments.delete(segment);
      }
    }

    this.emit('segment:device:removed', { deviceToken, segment });
  }

  // Template Operations
  public async createTemplate(template: Omit<PushTemplate, 'id'>): Promise<PushTemplate> {
    const pushTemplate: PushTemplate = {
      id: crypto.randomUUID(),
      platform: 'universal',
      variables: {},
      ...template
    };

    await this.validateTemplate(pushTemplate);
    this.templates.set(pushTemplate.id, pushTemplate);
    this.emit('template:created', pushTemplate);
    
    return pushTemplate;
  }

  public async updateTemplate(id: string, updates: Partial<PushTemplate>): Promise<PushTemplate> {
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

  // Campaign Operations
  public async createCampaign(campaign: Omit<PushCampaign, 'id' | 'status' | 'statistics' | 'metadata'>): Promise<PushCampaign> {
    const pushCampaign: PushCampaign = {
      id: crypto.randomUUID(),
      status: 'draft',
      statistics: {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        dismissed: 0,
        failed: 0,
        expired: 0,
        unsubscribed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        dismissalRate: 0,
        failureRate: 0,
        avgDeliveryTime: 0,
        avgTimeToOpen: 0
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        tags: []
      },
      ...campaign
    };

    this.campaigns.set(pushCampaign.id, pushCampaign);
    this.emit('campaign:created', pushCampaign);
    
    return pushCampaign;
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

    // Get audience devices
    const devices = await this.getAudienceDevices(campaign.audience);

    // Apply A/B testing if configured
    const deviceGroups = campaign.settings.abTesting?.enabled 
      ? this.createABTestGroups(devices, campaign.settings.abTesting)
      : [{ devices, template: campaign.template }];

    // Send notifications in batches
    for (const group of deviceGroups) {
      await this.sendCampaignBatch(campaign, group.devices, group.template);
    }

    campaign.status = 'sent';
    campaign.metadata.updatedAt = Date.now();

    this.emit('campaign:sent', campaign);
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

  private startNotificationProcessor(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processNotificationQueue();
  }

  private async processNotificationQueue(): Promise<void> {
    while (this.isProcessing) {
      if (this.notificationQueue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const batch = this.notificationQueue.splice(0, this.config.performance.batchSize);
      
      for (const notification of batch) {
        if (this.processingNotifications.has(notification.id)) continue;
        
        this.processingNotifications.add(notification.id);
        this.sendNotification(notification).finally(() => {
          this.processingNotifications.delete(notification.id);
        });
      }

      // Throttle processing
      if (batch.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private async sendNotification(notification: PushNotification): Promise<void> {
    const deliveryStatus = this.deliveryStatuses.get(notification.id);
    if (!deliveryStatus) return;

    deliveryStatus.status = 'sending';
    deliveryStatus.events.push({
      type: 'sent',
      timestamp: Date.now()
    });

    try {
      const provider = await this.selectProvider(notification);
      
      switch (provider.type) {
        case 'apns':
          await this.sendViaAPNS(notification, provider);
          break;
        case 'fcm':
          await this.sendViaFCM(notification, provider);
          break;
        case 'wns':
          await this.sendViaWNS(notification, provider);
          break;
        case 'web_push':
          await this.sendViaWebPush(notification, provider);
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

      this.emit('push:sent', { notification, provider });

    } catch (error) {
      deliveryStatus.status = 'failed';
      deliveryStatus.error = {
        code: error.code || 'SEND_ERROR',
        message: error.message,
        retryable: error.retryable !== false
      };

      this.emit('push:failed', { notification, error });

      // Retry with different provider if configured
      if (this.config.failover.enabled && error.retryable) {
        await this.retryWithFailover(notification);
      }
    }
  }

  private async selectProvider(notification: PushNotification): Promise<PushProvider> {
    // Get providers for this platform
    const platformProviders = Array.from(this.providers.values())
      .filter(p => p.status === 'active' && p.platform.includes(notification.platform))
      .sort((a, b) => a.priority - b.priority);

    if (platformProviders.length === 0) {
      throw new Error(`No active providers for platform: ${notification.platform}`);
    }

    // Use default provider if specified
    const defaultProvider = this.config.defaultProvider?.[notification.platform];
    if (defaultProvider) {
      const provider = platformProviders.find(p => p.name === defaultProvider);
      if (provider) {
        return provider;
      }
    }

    // Return first active provider for platform
    return platformProviders[0];
  }

  private async sendViaAPNS(notification: PushNotification, provider: PushProvider): Promise<void> {
    console.log(`Sending push notification ${notification.id} via APNS provider ${provider.name}`);
    // Mock APNS implementation
  }

  private async sendViaFCM(notification: PushNotification, provider: PushProvider): Promise<void> {
    console.log(`Sending push notification ${notification.id} via FCM provider ${provider.name}`);
    // Mock FCM implementation
  }

  private async sendViaWNS(notification: PushNotification, provider: PushProvider): Promise<void> {
    console.log(`Sending push notification ${notification.id} via WNS provider ${provider.name}`);
    // Mock WNS implementation
  }

  private async sendViaWebPush(notification: PushNotification, provider: PushProvider): Promise<void> {
    console.log(`Sending push notification ${notification.id} via Web Push provider ${provider.name}`);
    // Mock Web Push implementation
  }

  private async retryWithFailover(notification: PushNotification): Promise<void> {
    console.log(`Retrying push notification ${notification.id} with failover`);
  }

  private async validateNotification(notification: PushNotification): Promise<void> {
    if (!notification.deviceToken) {
      throw new Error('Device token is required');
    }

    if (!notification.title && !notification.body) {
      throw new Error('Title or body is required');
    }

    if (!notification.platform) {
      throw new Error('Platform is required');
    }
  }

  private async validateTemplate(template: PushTemplate): Promise<void> {
    if (!template.name) {
      throw new Error('Template name is required');
    }

    if (!template.title && !template.body) {
      throw new Error('Template title or body is required');
    }
  }

  private async validateDeviceToken(deviceToken: string, platform: PushNotification['platform']): Promise<void> {
    // Validate token format based on platform
    switch (platform) {
      case 'ios':
        if (!/^[a-f0-9]{64}$/i.test(deviceToken)) {
          throw new Error('Invalid iOS device token format');
        }
        break;
      case 'android':
        if (deviceToken.length < 140) {
          throw new Error('Invalid Android device token format');
        }
        break;
      // Add other platform validations
    }
  }

  private checkUserPreferences(device: DeviceRegistration, notification: PushNotification): boolean {
    if (!device.preferences.enabled) {
      return false;
    }

    // Check category preferences
    if (notification.category && device.preferences.categories) {
      if (device.preferences.categories[notification.category] === false) {
        return false;
      }
    }

    // Check quiet hours
    if (device.preferences.quietHours?.enabled) {
      const _now = new Date(); // eslint-disable-line @typescript-eslint/no-unused-vars
      const _timezone = device.preferences.quietHours.timezone || device.metadata.timezone || 'UTC'; // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // In real implementation, check if current time in user's timezone is within quiet hours
    }

    return true;
  }

  private evaluateTargeting(device: DeviceRegistration, targeting: NonNullable<PushNotification['targeting']>): boolean {
    // Check user segments
    if (targeting.userSegments && targeting.userSegments.length > 0) {
      const hasMatchingSegment = targeting.userSegments.some(segment => 
        device.subscriptions.segments.includes(segment)
      );
      if (!hasMatchingSegment) {
        return false;
      }
    }

    // Check geofence
    if (targeting.geofence && device.location) {
      const distance = this.calculateDistance(
        device.location.latitude,
        device.location.longitude,
        targeting.geofence.latitude,
        targeting.geofence.longitude
      );
      if (distance > targeting.geofence.radius) {
        return false;
      }
    }

    // Check time range
    if (targeting.timeRange) {
      const _now = new Date(); // eslint-disable-line @typescript-eslint/no-unused-vars
      const _timezone = targeting.timeRange.timezone || device.metadata.timezone || 'UTC'; // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // In real implementation, check if current time is within time range
    }

    // Check conditions
    if (targeting.conditions) {
      for (const condition of targeting.conditions) {
        const value = this.getNestedValue(device, condition.field);
        if (!this.evaluateCondition(value, condition.operator, condition.value)) {
          return false;
        }
      }
    }

    return true;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private evaluateCondition(value: unknown, operator: string, expected: unknown): boolean {
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
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  private async applyTemplate(notification: PushNotification): Promise<void> {
    // Template application logic would be implemented here
    console.log(`Applying template to notification ${notification.id}`);
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private async getAudienceDevices(audience: PushAudience): Promise<DeviceRegistration[]> {
    let devices: DeviceRegistration[] = [];

    switch (audience.type) {
      case 'all_users':
        devices = Array.from(this.deviceRegistrations.values());
        break;
      case 'segments':
        if (audience.criteria.segments) {
          for (const segment of audience.criteria.segments) {
            const segmentDevices = this.userSegments.get(segment);
            if (segmentDevices) {
              for (const deviceToken of segmentDevices) {
                const device = this.deviceRegistrations.get(deviceToken);
                if (device && !devices.includes(device)) {
                  devices.push(device);
                }
              }
            }
          }
        }
        break;
      case 'topics':
        if (audience.criteria.topics) {
          for (const topic of audience.criteria.topics) {
            const topicDevices = this.topics.get(topic);
            if (topicDevices) {
              for (const deviceToken of topicDevices) {
                const device = this.deviceRegistrations.get(deviceToken);
                if (device && !devices.includes(device)) {
                  devices.push(device);
                }
              }
            }
          }
        }
        break;
      case 'devices':
        if (audience.criteria.deviceTokens) {
          for (const deviceToken of audience.criteria.deviceTokens) {
            const device = this.deviceRegistrations.get(deviceToken);
            if (device) {
              devices.push(device);
            }
          }
        }
        break;
    }

    // Apply filters
    if (audience.criteria.filters) {
      devices = devices.filter(device => {
        return audience.criteria.filters!.every(filter => {
          const value = this.getNestedValue(device, filter.field);
          return this.evaluateCondition(value, filter.operator, filter.value);
        });
      });
    }

    // Filter out inactive devices
    devices = devices.filter(d => d.status === 'active' && d.preferences.enabled);

    return devices;
  }

  private createABTestGroups(devices: DeviceRegistration[], abTesting: NonNullable<CampaignSettings['abTesting']>): Array<{
    devices: DeviceRegistration[];
    template: PushTemplate;
  }> {
    const groups: Array<{ devices: DeviceRegistration[]; template: PushTemplate }> = [];
    const remainingDevices = [...devices];
    
    for (const variant of abTesting.variants) {
      const groupSize = Math.floor((devices.length * variant.percentage) / 100);
      const groupDevices = remainingDevices.splice(0, groupSize);
      
      groups.push({
        devices: groupDevices,
        template: { ...this.templates.values().next().value, ...variant.template }
      });
    }

    return groups;
  }

  private async sendCampaignBatch(
    campaign: PushCampaign,
    devices: DeviceRegistration[],
    template: PushTemplate
  ): Promise<void> {
    const batchSize = campaign.schedule?.throttling?.batchSize || this.config.performance.batchSize;
    
    for (let i = 0; i < devices.length; i += batchSize) {
      const batch = devices.slice(i, i + batchSize);
      
      for (const device of batch) {
        try {
          await this.sendPushNotification({
            platform: device.platform,
            deviceToken: device.deviceToken,
            title: template.title,
            body: template.body,
            priority: campaign.settings.delivery.priority,
            timeToLive: campaign.settings.delivery.timeToLive,
            data: { campaignId: campaign.id },
            metadata: {
              timestamp: Date.now(),
              campaignId: campaign.id,
              messageId: crypto.randomUUID()
            }
          });

          campaign.statistics.sent++;
        } catch (error) {
          campaign.statistics.failed++;
          this.emit('campaign:send:error', { campaign, device, error });
        }
      }

      // Apply batch delay
      if (campaign.schedule?.throttling?.batchDelay) {
        await new Promise(resolve => setTimeout(resolve, campaign.schedule.throttling!.batchDelay));
      }
    }
  }

  private async performProviderHealthCheck(provider: PushProvider): Promise<void> {
    console.log(`Performing health check for provider: ${provider.name}`);
  }

  // Webhook Handlers
  public async handleDeliveryCallback(provider: string, payload: unknown): Promise<void> {
    const notificationId = payload.notificationId || payload.id;
    const deliveryStatus = this.deliveryStatuses.get(notificationId);
    
    if (deliveryStatus) {
      deliveryStatus.providerMessageId = payload.providerMessageId;
      
      if (payload.event === 'delivered') {
        deliveryStatus.status = 'delivered';
        deliveryStatus.analytics = { deliveredAt: Date.now() };
      } else if (payload.event === 'opened') {
        deliveryStatus.analytics = { ...deliveryStatus.analytics, openedAt: Date.now() };
      } else if (payload.event === 'clicked') {
        deliveryStatus.analytics = { 
          ...deliveryStatus.analytics, 
          clickedAt: Date.now(),
          actionTaken: payload.actionId 
        };
      }
      
      deliveryStatus.events.push({
        type: payload.event,
        timestamp: Date.now(),
        data: payload.data
      });
      
      this.emit(`push:${payload.event}`, { notificationId, payload });
    }
  }

  // Public API
  public getProvider(name: string): PushProvider | undefined {
    return this.providers.get(name);
  }

  public getAllProviders(): PushProvider[] {
    return Array.from(this.providers.values());
  }

  public getTemplate(id: string): PushTemplate | undefined {
    return this.templates.get(id);
  }

  public getAllTemplates(): PushTemplate[] {
    return Array.from(this.templates.values());
  }

  public getCampaign(id: string): PushCampaign | undefined {
    return this.campaigns.get(id);
  }

  public getAllCampaigns(): PushCampaign[] {
    return Array.from(this.campaigns.values());
  }

  public getAudience(id: string): PushAudience | undefined {
    return this.audiences.get(id);
  }

  public getAllAudiences(): PushAudience[] {
    return Array.from(this.audiences.values());
  }

  public getDeviceRegistration(deviceToken: string): DeviceRegistration | undefined {
    return this.deviceRegistrations.get(deviceToken);
  }

  public getAllDeviceRegistrations(): DeviceRegistration[] {
    return Array.from(this.deviceRegistrations.values());
  }

  public getTopicSubscribers(topic: string): string[] {
    const topicDevices = this.topics.get(topic);
    return topicDevices ? Array.from(topicDevices) : [];
  }

  public getSegmentDevices(segment: string): string[] {
    const segmentDevices = this.userSegments.get(segment);
    return segmentDevices ? Array.from(segmentDevices) : [];
  }

  public getStats(): {
    notifications: { queued: number; sending: number; sent: number; failed: number };
    campaigns: { total: number; active: number; completed: number };
    templates: { count: number };
    devices: { total: number; active: number; inactive: number };
    topics: { count: number; totalSubscribers: number };
    segments: { count: number; totalDevices: number };
    providers: { total: number; active: number; failed: number };
  } {
    const notifications = Array.from(this.deliveryStatuses.values());
    const campaigns = Array.from(this.campaigns.values());
    const devices = Array.from(this.deviceRegistrations.values());

    return {
      notifications: {
        queued: notifications.filter(n => n.status === 'queued').length,
        sending: notifications.filter(n => n.status === 'sending').length,
        sent: notifications.filter(n => n.status === 'sent' || n.status === 'delivered').length,
        failed: notifications.filter(n => n.status === 'failed' || n.status === 'expired').length
      },
      campaigns: {
        total: campaigns.length,
        active: campaigns.filter(c => ['sending', 'scheduled'].includes(c.status)).length,
        completed: campaigns.filter(c => c.status === 'sent' || c.status === 'completed').length
      },
      templates: {
        count: this.templates.size
      },
      devices: {
        total: devices.length,
        active: devices.filter(d => d.status === 'active').length,
        inactive: devices.filter(d => d.status === 'inactive').length
      },
      topics: {
        count: this.topics.size,
        totalSubscribers: Array.from(this.topics.values()).reduce((sum, devices) => sum + devices.size, 0)
      },
      segments: {
        count: this.userSegments.size,
        totalDevices: Array.from(this.userSegments.values()).reduce((sum, devices) => sum + devices.size, 0)
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

    // Wait for processing notifications to complete
    while (this.processingNotifications.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit('service:shutdown');
  }
}

export default PushNotificationService;