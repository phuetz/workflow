# Push Notifications System Guide

Complete guide for the mobile push notification system using Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup](#setup)
4. [Usage](#usage)
5. [Notification Types](#notification-types)
6. [Rules & Customization](#rules--customization)
7. [Analytics](#analytics)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The push notification system provides:

- **Multi-platform support**: iOS, Android, and Web push notifications
- **Firebase Cloud Messaging (FCM)**: Primary delivery mechanism for all platforms
- **Apple Push Notification service (APNs)**: Optional direct iOS notifications
- **Device management**: Track and manage user devices
- **Rule engine**: Customize when and how notifications are sent
- **Priority-based delivery**: Critical, high, normal, and low priority
- **Quiet hours**: Respect user preferences for notification times
- **Batch sending**: Efficient bulk notification delivery
- **Analytics**: Track delivery, open rates, and performance
- **10+ notification types**: Workflow events, approvals, system alerts

## Architecture

### Core Components

```
┌─────────────────┐
│  PushService    │ ← Main orchestration service
└────────┬────────┘
         │
    ┌────┴────┬────────────┬──────────────┐
    │         │            │              │
┌───▼───┐ ┌──▼──┐  ┌──────▼──────┐  ┌───▼────┐
│  FCM  │ │ APNs│  │   Device    │  │  Rule  │
│Provider│ │Provider│ Registry    │  │ Engine │
└───────┘ └─────┘  └─────────────┘  └────────┘
                          │
                    ┌─────┴─────┐
                    │           │
              ┌─────▼─────┐ ┌──▼────────┐
              │ Priority  │ │  Batch    │
              │  Manager  │ │  Sender   │
              └───────────┘ └───────────┘
```

### Database Schema

```prisma
model DeviceToken {
  id          String      @id @default(cuid())
  userId      String
  token       String      @unique
  platform    PushPlatform
  deviceName  String?
  deviceModel String?
  osVersion   String?
  appVersion  String?
  locale      String      @default("en")
  timezone    String      @default("UTC")
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  lastUsed    DateTime?
}

model PushNotification {
  id          String      @id @default(cuid())
  userId      String
  type        PushNotificationType
  title       String
  body        String
  data        Json?
  badge       Int?
  priority    PushNotificationPriority
  sentAt      DateTime    @default(now())
  deliveredAt DateTime?
  openedAt    DateTime?
  failedAt    DateTime?
}

model PushNotificationRule {
  id          String      @id @default(cuid())
  userId      String
  type        PushNotificationType
  enabled     Boolean     @default(true)
  priority    PushNotificationPriority
  platforms   PushPlatform[]
  quietHours  Json?
  conditions  Json?
}
```

## Setup

### 1. Firebase Setup

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Navigate to Project Settings → Service Accounts
4. Generate new private key (downloads JSON file)

#### Get Configuration

```typescript
// From Firebase service account JSON
const firebaseConfig = {
  projectId: 'your-project-id',
  clientEmail: 'firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com',
  privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
};
```

#### Environment Variables

```bash
# .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

### 2. Apple Push Notification Setup (Optional)

#### Get APNs Credentials

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create APNs Auth Key (.p8 file)
4. Note your Team ID and Key ID

#### Environment Variables

```bash
# .env
APNS_TEAM_ID=your-team-id
APNS_KEY_ID=your-key-id
APNS_KEY_PATH=/path/to/AuthKey_XXXXX.p8
APNS_BUNDLE_ID=com.yourapp.bundleid
APNS_PRODUCTION=false # or true for production
```

### 3. Initialize Push Service

```typescript
import { PushService } from './notifications/push/PushService';

// FCM only (recommended - covers iOS, Android, Web)
const pushService = new PushService({
  fcm: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!,
  },
  analytics: true,
  batchSize: 500,
});

// With APNs (optional)
const pushService = new PushService({
  fcm: { /* config */ },
  apns: {
    teamId: process.env.APNS_TEAM_ID!,
    keyId: process.env.APNS_KEY_ID!,
    key: fs.readFileSync(process.env.APNS_KEY_PATH!),
    bundleId: process.env.APNS_BUNDLE_ID!,
    production: process.env.APNS_PRODUCTION === 'true',
  },
  defaultProvider: 'fcm', // or 'apns'
});

await pushService.initialize();
```

## Usage

### Register Device

```typescript
// When user opens mobile app
const device = await pushService.registerDevice({
  userId: 'user123',
  token: 'fcm-device-token-from-client',
  platform: 'ios', // or 'android', 'web'
  deviceName: 'iPhone 14 Pro',
  deviceModel: 'iPhone15,2',
  osVersion: '17.0',
  appVersion: '1.2.0',
  locale: 'en',
  timezone: 'America/New_York',
});
```

### Send Notification

#### To Single User

```typescript
import { NotificationBuilder } from './notifications/push/NotificationTypes';

// Using builder (recommended)
const payload = NotificationBuilder.workflowCompleted(
  'workflow123',
  'Data Sync',
  2500 // duration in ms
);

const results = await pushService.sendToUser('user123', payload);

// Check results
for (const result of results) {
  if (result.success) {
    console.log(`Sent to ${result.platform}: ${result.messageId}`);
  } else {
    console.error(`Failed: ${result.error?.message}`);
  }
}
```

#### To Multiple Users

```typescript
const payload = NotificationBuilder.systemAlert('High CPU usage detected');

const results = await pushService.sendToUsers(
  ['user1', 'user2', 'user3'],
  payload
);

// results is a Map<userId, PushNotificationResult[]>
for (const [userId, userResults] of results) {
  console.log(`User ${userId}: ${userResults.length} notifications sent`);
}
```

#### Custom Notification

```typescript
const payload = NotificationBuilder.custom(
  'Custom Title',
  'Custom message body',
  { customData: 'value' },
  'high' // priority
);

await pushService.sendToUser('user123', payload);
```

### Send to Topic

```typescript
// Subscribe devices to topic
await pushService.subscribeToTopic(
  ['token1', 'token2'],
  'workflow-updates'
);

// Send to all subscribed devices
const payload = NotificationBuilder.systemAlert('Maintenance scheduled');
await pushService.sendToTopic('workflow-updates', payload);
```

## Notification Types

### Workflow Notifications

```typescript
// Workflow started
NotificationBuilder.workflowStarted('wf123', 'Data Sync');

// Workflow completed
NotificationBuilder.workflowCompleted('wf123', 'Data Sync', 2500);

// Workflow failed
NotificationBuilder.workflowFailed('wf123', 'Data Sync', 'Connection timeout');

// Workflow timeout
NotificationBuilder.workflowTimeout('wf123', 'Data Sync', 300000);
```

### Approval Notifications

```typescript
// Approval request
NotificationBuilder.approvalRequest(
  'approval123',
  'wf123',
  'Deploy to Production',
  'Optional message'
);

// Approval granted
NotificationBuilder.approvalApproved(
  'approval123',
  'wf123',
  'Deploy to Production',
  'john@example.com'
);

// Approval rejected
NotificationBuilder.approvalRejected(
  'approval123',
  'wf123',
  'Deploy to Production',
  'jane@example.com',
  'Security concerns'
);
```

### System Notifications

```typescript
// System alert
NotificationBuilder.systemAlert('High CPU usage on worker-01', {
  cpu: 95,
  worker: 'worker-01'
});

// System warning
NotificationBuilder.systemWarning('Disk space low', {
  diskUsage: 85
});

// System error
NotificationBuilder.systemError('Database connection lost', error);
```

### Notification Template

```typescript
{
  type: 'workflow_completed',
  title: 'Workflow Completed',
  body: 'Workflow "Data Sync" completed successfully',
  priority: 'normal',
  sound: 'default',
  badge: 1,
  data: {
    workflowId: 'wf123',
    workflowName: 'Data Sync',
    duration: 2500
  }
}
```

## Rules & Customization

### Set User Rules

```typescript
import { notificationRuleEngine } from './notifications/push/RuleEngine';

const rule = {
  id: 'rule123',
  userId: 'user123',
  type: 'workflow_completed',
  enabled: true,
  priority: 'normal',
  platforms: ['ios', 'android'],
  quietHours: {
    enabled: true,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'America/New_York',
    days: [0, 1, 2, 3, 4, 5, 6] // All days
  },
  conditions: [
    {
      field: 'workflowName',
      operator: 'contains',
      value: 'Production'
    }
  ],
  customizations: {
    title: 'Production Workflow Completed',
    sound: 'success',
    badge: 1
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

await notificationRuleEngine.setRule(rule);
```

### Evaluate Rule

```typescript
const result = await notificationRuleEngine.evaluate({
  userId: 'user123',
  type: 'workflow_completed',
  payload: NotificationBuilder.workflowCompleted('wf123', 'Production Deploy'),
  timestamp: new Date(),
  data: {
    workflowName: 'Production Deploy'
  }
});

if (result.shouldSend) {
  await pushService.sendToUser(
    'user123',
    result.modifiedPayload || payload,
    result.modifiedOptions
  );
} else {
  console.log(`Not sending: ${result.reason}`);
}
```

### Quiet Hours

Quiet hours prevent non-critical notifications during specified times:

```typescript
const quietHours = {
  enabled: true,
  startTime: '22:00', // 10 PM
  endTime: '08:00',   // 8 AM
  timezone: 'America/New_York',
  days: [0, 1, 2, 3, 4, 5, 6] // All days (Sunday=0)
};
```

- **Critical notifications** bypass quiet hours
- **Time format**: HH:mm (24-hour)
- **Timezone aware**: Respects user's timezone
- **Day selection**: Optional, defaults to all days

## Analytics

### Track Events

```typescript
import { pushAnalyticsService } from './notifications/push/Analytics';

// Track sent
await pushAnalyticsService.trackSent(
  'notif123',
  'device-token',
  'ios',
  'workflow_completed'
);

// Track delivered
await pushAnalyticsService.trackDelivered('notif123');

// Track opened
await pushAnalyticsService.trackOpened('notif123');

// Track failed
await pushAnalyticsService.trackFailed('notif123', 'Invalid token');
```

### Get Metrics

```typescript
// Get metrics for time range
const metrics = await pushAnalyticsService.getMetrics({
  start: new Date('2024-01-01'),
  end: new Date('2024-12-31')
});

console.log(metrics);
// {
//   sent: 10000,
//   delivered: 9950,
//   opened: 2500,
//   failed: 50,
//   deliveryRate: 99.5,
//   openRate: 25.1,
//   avgDeliveryTime: 150, // ms
//   avgOpenTime: 45000 // ms
// }
```

### Delivery Report

```typescript
const report = await pushService.getDeliveryReport(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

console.log(report);
// {
//   totalSent: 10000,
//   totalDelivered: 9950,
//   totalOpened: 2500,
//   totalFailed: 50,
//   deliveryRate: 99.5,
//   openRate: 25.1,
//   avgDeliveryTime: 150,
//   platformBreakdown: [
//     { platform: 'ios', sent: 6000, delivered: 5970, opened: 1500, failed: 30 },
//     { platform: 'android', sent: 4000, delivered: 3980, opened: 1000, failed: 20 }
//   ],
//   typeBreakdown: [
//     { type: 'workflow_completed', sent: 5000, delivered: 4980, opened: 1200, failed: 20 },
//     // ...
//   ]
// }
```

## Best Practices

### 1. Priority Usage

**Critical**: Use sparingly for emergencies only
```typescript
- System outages
- Security alerts
- Data loss events
```

**High**: Important but not critical
```typescript
- Workflow failures
- Approval requests
- System errors
```

**Normal**: Standard notifications
```typescript
- Workflow completed
- Approvals granted/rejected
- System warnings
```

**Low**: Non-urgent updates
```typescript
- Workflow started
- Info messages
```

### 2. Notification Content

**Keep it concise**:
- Title: Max 50 characters
- Body: Max 120 characters for visibility
- Use clear, action-oriented language

**Good**:
```
Title: "Deploy Failed"
Body: "Production deploy failed. Check logs."
```

**Bad**:
```
Title: "Notification"
Body: "Something happened with your workflow..."
```

### 3. Frequency Management

- Implement rate limiting per user
- Batch similar notifications
- Use quiet hours
- Allow users to customize preferences

### 4. Token Management

```typescript
// Refresh token when updated
await pushService.registerDevice({
  userId: 'user123',
  token: newToken,
  platform: 'ios'
});

// Clean up invalid tokens
pushService.on('device:removed', (token) => {
  console.log(`Removed invalid token: ${token}`);
});
```

### 5. Error Handling

```typescript
const results = await pushService.sendToUser('user123', payload);

for (const result of results) {
  if (!result.success && result.error) {
    if (result.error.shouldRemoveToken) {
      // Token is invalid, remove it
      await pushService.unregisterDeviceByToken(result.deviceToken);
    } else if (result.error.isRetryable) {
      // Retry later
      retryQueue.add(result);
    } else {
      // Log error
      logger.error('Push notification failed', result.error);
    }
  }
}
```

## Performance Metrics

### Target Metrics

- **Delivery Latency**: < 1 second (FCM typically 100-200ms)
- **Delivery Success Rate**: > 99%
- **Supported Devices**: 10,000+ per instance
- **Throughput**: 1,000+ notifications/minute
- **Battery Impact**: Minimal (use high priority sparingly)

### Monitoring

```typescript
// Get service status
const status = pushService.getStatus();
console.log(status);
// {
//   fcm: { initialized: true, hasValidToken: true },
//   apns: { initialized: true, production: false },
//   deviceRegistry: { initialized: true },
//   metrics: {
//     sent: 1000,
//     delivered: 990,
//     opened: 250,
//     failed: 10,
//     deliveryRate: 99.0,
//     openRate: 25.3
//   }
// }

// Get queue sizes
const queueSizes = priorityManager.getQueueSizes();
console.log(queueSizes);
// { critical: 0, high: 5, normal: 20, low: 10 }
```

## Troubleshooting

### Common Issues

#### 1. Notifications Not Received

**Check device registration**:
```typescript
const devices = await pushService.getUserDevices('user123');
console.log(devices);
```

**Verify token is active**:
```typescript
const device = await deviceRegistry.getDeviceByToken('token123');
console.log(device?.isActive);
```

**Check rules**:
```typescript
const rule = await notificationRuleEngine.getRule('user123', 'workflow_completed');
console.log(rule?.enabled);
```

#### 2. High Failure Rate

**Check FCM credentials**:
```bash
# Verify environment variables
echo $FIREBASE_PROJECT_ID
echo $FIREBASE_CLIENT_EMAIL
```

**Monitor error codes**:
```typescript
pushService.on('notification:failed', (result, error) => {
  console.error(`Failed to send to ${result.deviceToken}:`, error);
  // Common errors:
  // - INVALID_TOKEN: Remove device
  // - UNREGISTERED: Remove device
  // - SERVICE_UNAVAILABLE: Retry
  // - QUOTA_EXCEEDED: Slow down
});
```

#### 3. Delivery Delays

**Check queue sizes**:
```typescript
const totalQueued = priorityManager.getTotalQueueSize();
if (totalQueued > 1000) {
  console.warn('High queue backlog');
}
```

**Optimize batching**:
```typescript
const batchSender = new BatchSender({
  maxBatchSize: 500,
  batchTimeout: 1000, // Reduce for faster delivery
});
```

### Debug Mode

```typescript
// Enable debug logging
pushService.on('notification:sent', (result, latency) => {
  console.log(`Sent in ${latency}ms:`, result);
});

pushService.on('notification:failed', (result, error) => {
  console.error('Failed:', result, error);
});

// Test notification
import { PushTestPanel } from './components/PushTestPanel';
// Use UI to send test notifications
```

## Security Considerations

### 1. Credential Storage

```typescript
// Use environment variables
// Never commit credentials to git
// Use secret management (AWS Secrets Manager, etc.)

// .gitignore
.env
.env.local
service-account.json
```

### 2. Token Security

```typescript
// Validate token format before storing
const isValid = fcmProvider.validateToken(token);
if (!isValid) {
  throw new Error('Invalid token format');
}

// Never expose tokens in logs
logger.info('Device registered', {
  userId,
  platform,
  tokenPreview: token.substring(0, 20) + '...'
});
```

### 3. Data Privacy

```typescript
// Don't send sensitive data in notifications
// Bad
const payload = {
  title: 'Payment Received',
  body: `Credit card ending in ${last4} charged $${amount}`,
  data: { cardNumber: fullCardNumber } // ❌ Never do this
};

// Good
const payload = {
  title: 'Payment Received',
  body: 'Tap to view details',
  data: { paymentId: 'pay_123' } // ✅ Use identifiers
};
```

## API Reference

### PushService

```typescript
class PushService {
  async initialize(): Promise<void>;
  async registerDevice(params: RegisterDeviceParams): Promise<DeviceToken>;
  async unregisterDevice(deviceId: string): Promise<void>;
  async getUserDevices(userId: string): Promise<DeviceToken[]>;
  async sendToUser(userId: string, payload: PushNotificationPayload, options?: PushNotificationOptions): Promise<PushNotificationResult[]>;
  async sendToUsers(userIds: string[], payload: PushNotificationPayload, options?: PushNotificationOptions): Promise<Map<string, PushNotificationResult[]>>;
  async sendToTopic(topic: string, payload: PushNotificationPayload, options?: PushNotificationOptions): Promise<PushNotificationResult>;
  async getDeliveryReport(startDate: Date, endDate: Date): Promise<PushDeliveryReport>;
  getMetrics(): ServiceMetrics;
  getStatus(): ServiceStatus;
  async shutdown(): Promise<void>;
}
```

### NotificationBuilder

```typescript
class NotificationBuilder {
  static workflowStarted(workflowId: string, workflowName: string): PushNotificationPayload;
  static workflowCompleted(workflowId: string, workflowName: string, duration?: number): PushNotificationPayload;
  static workflowFailed(workflowId: string, workflowName: string, errorMessage: string): PushNotificationPayload;
  static approvalRequest(approvalId: string, workflowId: string, workflowName: string, message?: string): PushNotificationPayload;
  static systemAlert(message: string, data?: Record<string, any>): PushNotificationPayload;
  static custom(title: string, message: string, data?: Record<string, any>, priority?: PushPriority): PushNotificationPayload;
}
```

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review Firebase Cloud Messaging [documentation](https://firebase.google.com/docs/cloud-messaging)
- Check APNs [documentation](https://developer.apple.com/documentation/usernotifications)
- Open an issue in the repository

## License

MIT License - See LICENSE file for details
