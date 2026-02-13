/**
 * Push Notification System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PushService } from '../notifications/push/PushService';
import { DeviceRegistry } from '../notifications/push/DeviceRegistry';
import { NotificationRuleEngine } from '../notifications/push/RuleEngine';
import { PriorityManager } from '../notifications/push/PriorityManager';
import { BatchSender } from '../notifications/push/BatchSender';
import { PushAnalyticsService } from '../notifications/push/Analytics';
import { NotificationBuilder } from '../notifications/push/NotificationTypes';
import { FCMProvider } from '../notifications/push/FCMProvider';
import type { PushNotificationPayload, DeviceToken } from '../types/push';

describe('DeviceRegistry', () => {
  let registry: DeviceRegistry;

  beforeEach(() => {
    registry = new DeviceRegistry();
  });

  afterEach(async () => {
    await registry.clearAll();
  });

  it('should register a new device', async () => {
    const device = await registry.registerDevice({
      userId: 'user1',
      token: 'token123',
      platform: 'ios',
      deviceName: 'iPhone 14',
    });

    expect(device.id).toBeDefined();
    expect(device.userId).toBe('user1');
    expect(device.token).toBe('token123');
    expect(device.platform).toBe('ios');
    expect(device.isActive).toBe(true);
  });

  it('should update existing device on duplicate token', async () => {
    const device1 = await registry.registerDevice({
      userId: 'user1',
      token: 'token123',
      platform: 'ios',
      deviceName: 'iPhone 14',
    });

    const device2 = await registry.registerDevice({
      userId: 'user1',
      token: 'token123',
      platform: 'ios',
      deviceName: 'iPhone 14 Pro',
    });

    expect(device2.id).toBe(device1.id);
    expect(device2.deviceName).toBe('iPhone 14 Pro');
  });

  it('should get user devices', async () => {
    await registry.registerDevice({
      userId: 'user1',
      token: 'token1',
      platform: 'ios',
    });

    await registry.registerDevice({
      userId: 'user1',
      token: 'token2',
      platform: 'android',
    });

    const devices = await registry.getUserDevices('user1');
    expect(devices).toHaveLength(2);
  });

  it('should get user device tokens', async () => {
    await registry.registerDevice({
      userId: 'user1',
      token: 'token1',
      platform: 'ios',
    });

    await registry.registerDevice({
      userId: 'user1',
      token: 'token2',
      platform: 'android',
    });

    const tokens = await registry.getUserDeviceTokens('user1');
    expect(tokens).toHaveLength(2);
    expect(tokens).toContain('token1');
    expect(tokens).toContain('token2');
  });

  it('should filter devices by platform', async () => {
    await registry.registerDevice({
      userId: 'user1',
      token: 'token1',
      platform: 'ios',
    });

    await registry.registerDevice({
      userId: 'user1',
      token: 'token2',
      platform: 'android',
    });

    const iosTokens = await registry.getUserDeviceTokens('user1', 'ios');
    expect(iosTokens).toHaveLength(1);
    expect(iosTokens[0]).toBe('token1');
  });

  it('should unregister device', async () => {
    const device = await registry.registerDevice({
      userId: 'user1',
      token: 'token1',
      platform: 'ios',
    });

    await registry.unregisterDevice(device.id);

    const devices = await registry.getUserDevices('user1');
    expect(devices).toHaveLength(0);
  });

  it('should mark device as inactive', async () => {
    const device = await registry.registerDevice({
      userId: 'user1',
      token: 'token1',
      platform: 'ios',
    });

    await registry.markDeviceInactive(device.id);

    const updatedDevice = await registry.getDevice(device.id);
    expect(updatedDevice?.isActive).toBe(false);
  });

  it('should get registry statistics', async () => {
    await registry.registerDevice({
      userId: 'user1',
      token: 'token1',
      platform: 'ios',
    });

    await registry.registerDevice({
      userId: 'user1',
      token: 'token2',
      platform: 'android',
    });

    await registry.registerDevice({
      userId: 'user2',
      token: 'token3',
      platform: 'ios',
    });

    const stats = await registry.getStats();
    expect(stats.totalDevices).toBe(3);
    expect(stats.activeDevices).toBe(3);
    expect(stats.devicesByPlatform.ios).toBe(2);
    expect(stats.devicesByPlatform.android).toBe(1);
  });
});

describe('NotificationBuilder', () => {
  it('should build workflow started notification', () => {
    const notification = NotificationBuilder.workflowStarted('wf1', 'Data Sync');

    expect(notification.type).toBe('workflow_started');
    expect(notification.title).toBe('Workflow Started');
    expect(notification.body).toContain('Data Sync');
    expect(notification.data).toEqual({
      workflowId: 'wf1',
      workflowName: 'Data Sync',
    });
  });

  it('should build workflow completed notification', () => {
    const notification = NotificationBuilder.workflowCompleted('wf1', 'Data Sync', 2500);

    expect(notification.type).toBe('workflow_completed');
    expect(notification.data?.duration).toBe(2500);
  });

  it('should build workflow failed notification', () => {
    const notification = NotificationBuilder.workflowFailed(
      'wf1',
      'Data Sync',
      'Connection timeout'
    );

    expect(notification.type).toBe('workflow_failed');
    expect(notification.body).toContain('Connection timeout');
    expect(notification.priority).toBe('high');
  });

  it('should build approval request notification', () => {
    const notification = NotificationBuilder.approvalRequest(
      'approval1',
      'wf1',
      'Deploy to Production'
    );

    expect(notification.type).toBe('approval_request');
    expect(notification.body).toContain('Deploy to Production');
    expect(notification.priority).toBe('high');
  });

  it('should build custom notification', () => {
    const notification = NotificationBuilder.custom(
      'Custom Title',
      'Custom Message',
      { foo: 'bar' },
      'high'
    );

    expect(notification.type).toBe('custom');
    expect(notification.title).toBe('Custom Title');
    expect(notification.body).toBe('Custom Message');
    expect(notification.priority).toBe('high');
    expect(notification.data?.foo).toBe('bar');
  });
});

describe('NotificationRuleEngine', () => {
  let ruleEngine: NotificationRuleEngine;

  beforeEach(() => {
    ruleEngine = new NotificationRuleEngine();
  });

  afterEach(async () => {
    await ruleEngine.clearAll();
  });

  it('should set and get rule', async () => {
    const rule = {
      id: 'rule1',
      userId: 'user1',
      type: 'workflow_completed' as const,
      enabled: true,
      priority: 'normal' as const,
      platforms: ['ios' as const, 'android' as const],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ruleEngine.setRule(rule);

    const retrieved = await ruleEngine.getRule('user1', 'workflow_completed');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('rule1');
  });

  it('should evaluate enabled rule as should send', async () => {
    const rule = {
      id: 'rule1',
      userId: 'user1',
      type: 'workflow_completed' as const,
      enabled: true,
      priority: 'normal' as const,
      platforms: ['ios' as const],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ruleEngine.setRule(rule);

    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const result = await ruleEngine.evaluate({
      userId: 'user1',
      type: 'workflow_completed',
      payload,
      timestamp: new Date(),
    });

    expect(result.shouldSend).toBe(true);
  });

  it('should evaluate disabled rule as should not send', async () => {
    const rule = {
      id: 'rule1',
      userId: 'user1',
      type: 'workflow_completed' as const,
      enabled: false,
      priority: 'normal' as const,
      platforms: ['ios' as const],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ruleEngine.setRule(rule);

    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const result = await ruleEngine.evaluate({
      userId: 'user1',
      type: 'workflow_completed',
      payload,
      timestamp: new Date(),
    });

    expect(result.shouldSend).toBe(false);
    expect(result.reason).toContain('disabled');
  });

  it('should respect quiet hours', async () => {
    const now = new Date();
    const rule = {
      id: 'rule1',
      userId: 'user1',
      type: 'workflow_completed' as const,
      enabled: true,
      priority: 'normal' as const,
      platforms: ['ios' as const],
      quietHours: {
        enabled: true,
        startTime: '00:00',
        endTime: '23:59',
        timezone: 'UTC',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ruleEngine.setRule(rule);

    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const result = await ruleEngine.evaluate({
      userId: 'user1',
      type: 'workflow_completed',
      payload,
      timestamp: now,
    });

    expect(result.shouldSend).toBe(false);
    expect(result.reason).toContain('quiet hours');
  });

  it('should send critical notifications during quiet hours', async () => {
    const now = new Date();
    const rule = {
      id: 'rule1',
      userId: 'user1',
      type: 'system_error' as const,
      enabled: true,
      priority: 'critical' as const,
      platforms: ['ios' as const],
      quietHours: {
        enabled: true,
        startTime: '00:00',
        endTime: '23:59',
        timezone: 'UTC',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ruleEngine.setRule(rule);

    const payload = NotificationBuilder.systemError('Critical error');
    const result = await ruleEngine.evaluate({
      userId: 'user1',
      type: 'system_error',
      payload,
      timestamp: now,
    });

    expect(result.shouldSend).toBe(true);
  });
});

describe('PriorityManager', () => {
  let priorityManager: PriorityManager;

  beforeEach(() => {
    priorityManager = new PriorityManager(10, 100);
  });

  afterEach(() => {
    priorityManager.stop();
    priorityManager.clearAll();
  });

  it('should enqueue notification', async () => {
    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const id = await priorityManager.enqueue('user1', payload);

    expect(id).toBeDefined();
    const sizes = priorityManager.getQueueSizes();
    expect(sizes.normal).toBe(1);
  });

  it('should queue by priority', async () => {
    const normalPayload = NotificationBuilder.workflowStarted('wf1', 'Test');
    const highPayload = NotificationBuilder.workflowFailed('wf2', 'Test', 'Error');

    await priorityManager.enqueue('user1', normalPayload);
    await priorityManager.enqueue('user1', highPayload);

    const sizes = priorityManager.getQueueSizes();
    expect(sizes.normal).toBe(1);
    expect(sizes.high).toBe(1);
  });

  it('should get total queue size', async () => {
    const payload1 = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const payload2 = NotificationBuilder.workflowFailed('wf2', 'Test', 'Error');

    await priorityManager.enqueue('user1', payload1);
    await priorityManager.enqueue('user1', payload2);

    expect(priorityManager.getTotalQueueSize()).toBe(2);
  });

  it('should emit processing event', async () => {
    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    await priorityManager.enqueue('user1', payload);

    const processingPromise = new Promise(resolve => {
      priorityManager.once('processing', resolve);
    });

    priorityManager.start();

    await processingPromise;
    priorityManager.stop();
  });
});

describe('BatchSender', () => {
  let batchSender: BatchSender;

  beforeEach(() => {
    batchSender = new BatchSender({ maxBatchSize: 3, batchTimeout: 100 });
  });

  afterEach(() => {
    batchSender.clearAll();
  });

  it('should add notification to batch', async () => {
    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const batchId = await batchSender.addToBatch('user1', payload);

    expect(batchId).toBeDefined();
    const stats = batchSender.getStats();
    expect(stats.pendingBatches).toBe(1);
    expect(stats.totalNotifications).toBe(1);
  });

  it('should send batch when full', async () => {
    const sendPromise = new Promise(resolve => {
      batchSender.once('batch:sending', resolve);
    });

    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');

    await batchSender.addToBatch('user1', payload);
    await batchSender.addToBatch('user1', payload);
    await batchSender.addToBatch('user1', payload); // This should trigger send

    await sendPromise;

    const stats = batchSender.getStats();
    expect(stats.pendingBatches).toBe(0);
  });

  it('should send batch on timeout', async () => {
    const sendPromise = new Promise(resolve => {
      batchSender.once('batch:sending', resolve);
    });

    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    await batchSender.addToBatch('user1', payload);

    await sendPromise;
  });

  it('should flush all pending batches', async () => {
    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');

    await batchSender.addToBatch('user1', payload);
    await batchSender.addToBatch('user2', payload);

    expect(batchSender.getStats().pendingBatches).toBe(2);

    await batchSender.flushAll();

    expect(batchSender.getStats().pendingBatches).toBe(0);
  });
});

describe('PushAnalyticsService', () => {
  let analytics: PushAnalyticsService;

  beforeEach(() => {
    analytics = new PushAnalyticsService();
  });

  afterEach(() => {
    analytics.clearAll();
  });

  it('should track notification sent', async () => {
    await analytics.trackSent('notif1', 'token1', 'ios', 'workflow_completed');

    const tracked = await analytics.getAnalytics('notif1');
    expect(tracked).toBeDefined();
    expect(tracked?.notificationId).toBe('notif1');
    expect(tracked?.platform).toBe('ios');
  });

  it('should track notification delivered', async () => {
    await analytics.trackSent('notif1', 'token1', 'ios', 'workflow_completed');
    await analytics.trackDelivered('notif1');

    const tracked = await analytics.getAnalytics('notif1');
    expect(tracked?.deliveredAt).toBeDefined();
  });

  it('should track notification opened', async () => {
    await analytics.trackSent('notif1', 'token1', 'ios', 'workflow_completed');
    await analytics.trackDelivered('notif1');
    await analytics.trackOpened('notif1');

    const tracked = await analytics.getAnalytics('notif1');
    expect(tracked?.openedAt).toBeDefined();
  });

  it('should calculate metrics', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await analytics.trackSent('notif1', 'token1', 'ios', 'workflow_completed');
    await analytics.trackDelivered('notif1');
    await analytics.trackOpened('notif1');

    await analytics.trackSent('notif2', 'token2', 'android', 'workflow_completed');
    await analytics.trackFailed('notif2', 'Token invalid');

    const metrics = await analytics.getMetrics({
      start: yesterday,
      end: now,
    });

    expect(metrics.sent).toBe(2);
    expect(metrics.delivered).toBe(1);
    expect(metrics.opened).toBe(1);
    expect(metrics.failed).toBe(1);
    expect(metrics.deliveryRate).toBe(50);
    expect(metrics.openRate).toBe(100);
  });

  it('should get delivery report', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await analytics.trackSent('notif1', 'token1', 'ios', 'workflow_completed');
    await analytics.trackDelivered('notif1');
    await analytics.trackOpened('notif1');

    const report = await analytics.getDeliveryReport(yesterday, now);

    expect(report.totalSent).toBe(1);
    expect(report.totalDelivered).toBe(1);
    expect(report.totalOpened).toBe(1);
    expect(report.deliveryRate).toBe(100);
    expect(report.openRate).toBe(100);
    expect(report.platformBreakdown).toBeDefined();
    expect(report.typeBreakdown).toBeDefined();
  });
});

describe('FCMProvider', () => {
  let fcmProvider: FCMProvider;

  beforeEach(async () => {
    fcmProvider = new FCMProvider({
      projectId: 'test-project',
      clientEmail: 'test@test.com',
      privateKey: 'test-key',
    });
    await fcmProvider.initialize();
  });

  afterEach(async () => {
    await fcmProvider.shutdown();
  });

  it('should initialize successfully', () => {
    const status = fcmProvider.getStatus();
    expect(status.initialized).toBe(true);
  });

  it('should validate FCM token format', () => {
    const validToken = 'a'.repeat(150);
    const invalidToken = 'abc';

    expect(fcmProvider.validateToken(validToken)).toBe(true);
    expect(fcmProvider.validateToken(invalidToken)).toBe(false);
  });

  it('should send notification to device', async () => {
    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const result = await fcmProvider.sendToDevice('token123', payload);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should send to multiple devices', async () => {
    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const results = await fcmProvider.sendToMultipleDevices(['token1', 'token2'], payload);

    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
  });
});

describe('PushService Integration', () => {
  let pushService: PushService;
  let deviceRegistry: DeviceRegistry;

  beforeEach(async () => {
    deviceRegistry = new DeviceRegistry();
    pushService = new PushService(
      {
        fcm: {
          projectId: 'test-project',
          clientEmail: 'test@test.com',
          privateKey: 'test-key',
        },
      },
      deviceRegistry
    );
    await pushService.initialize();
  });

  afterEach(async () => {
    await pushService.shutdown();
    await deviceRegistry.clearAll();
  });

  it('should register and get devices', async () => {
    // Use valid FCM token format (140+ chars alphanumeric)
    const validToken = 'a'.repeat(150);

    const device = await pushService.registerDevice({
      userId: 'user1',
      token: validToken,
      platform: 'ios',
      deviceName: 'iPhone',
    });

    expect(device.id).toBeDefined();

    const devices = await pushService.getUserDevices('user1');
    expect(devices).toHaveLength(1);
    expect(devices[0].id).toBe(device.id);
  });

  it('should send notification to user', async () => {
    // Use valid FCM token format
    const validToken = 'b'.repeat(150);

    await pushService.registerDevice({
      userId: 'user1',
      token: validToken,
      platform: 'ios',
    });

    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test Workflow');
    const results = await pushService.sendToUser('user1', payload);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
  });

  it('should handle user with no devices', async () => {
    const payload = NotificationBuilder.workflowCompleted('wf1', 'Test');
    const results = await pushService.sendToUser('nonexistent', payload);

    expect(results).toHaveLength(0);
  });

  it('should send to multiple users', async () => {
    // Use valid FCM tokens
    const token1 = 'c'.repeat(150);
    const token2 = 'd'.repeat(150);

    await pushService.registerDevice({
      userId: 'user1',
      token: token1,
      platform: 'ios',
    });

    await pushService.registerDevice({
      userId: 'user2',
      token: token2,
      platform: 'android',
    });

    const payload = NotificationBuilder.systemAlert('Test Alert');
    const results = await pushService.sendToUsers(['user1', 'user2'], payload);

    expect(results.size).toBe(2);
    expect(results.get('user1')).toHaveLength(1);
    expect(results.get('user2')).toHaveLength(1);
  });

  it('should get service status', () => {
    const status = pushService.getStatus();

    expect(status.fcm).toBeDefined();
    expect(status.deviceRegistry).toBeDefined();
    expect(status.metrics).toBeDefined();
  });

  it('should get metrics', () => {
    const metrics = pushService.getMetrics();

    expect(metrics.sent).toBeDefined();
    expect(metrics.delivered).toBeDefined();
    expect(metrics.opened).toBeDefined();
    expect(metrics.failed).toBeDefined();
    expect(metrics.deliveryRate).toBeDefined();
    expect(metrics.openRate).toBeDefined();
  });
});
