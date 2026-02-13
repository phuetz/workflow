import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPayload } from '../types';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  async initialize() {
    if (!Device.isDevice) {
      console.log('Notifications only work on physical devices');
      return;
    }

    await this.registerForPushNotifications();
    this.setupNotificationListeners();
  }

  private async registerForPushNotifications() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      console.log('Push token:', token);

      // Save token to backend
      // await ApiClient.post('/users/push-token', { token });
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
      });
    }
  }

  private setupNotificationListeners() {
    // Handle notification when app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;

      // Navigate based on notification data
      if (data.type === 'execution') {
        // Navigation will be handled by the app
        console.log('Navigate to execution:', data.executionId);
      } else if (data.type === 'workflow') {
        console.log('Navigate to workflow:', data.workflowId);
      }
    });
  }

  // Send local notification
  async sendLocalNotification(payload: NotificationPayload): Promise<string> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      console.log('Notifications disabled');
      return '';
    }

    return Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: true,
      },
      trigger: null, // Send immediately
    });
  }

  // Execution notifications
  async notifyExecutionComplete(workflowName: string, executionId: string, success: boolean) {
    const settings = await this.getSettings();

    if (success && !settings.executionComplete) {
      return;
    }
    if (!success && !settings.executionFailed) {
      return;
    }

    const title = success ? 'Execution Completed' : 'Execution Failed';
    const body = `Workflow "${workflowName}" ${success ? 'completed successfully' : 'failed'}`;

    await this.sendLocalNotification({
      title,
      body,
      data: {
        type: 'execution',
        executionId,
      },
    });
  }

  async notifyWorkflowUpdated(workflowName: string, workflowId: string) {
    const settings = await this.getSettings();
    if (!settings.workflowUpdated) {
      return;
    }

    await this.sendLocalNotification({
      title: 'Workflow Updated',
      body: `"${workflowName}" has been updated`,
      data: {
        type: 'workflow',
        workflowId,
      },
    });
  }

  // Badge management
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  async incrementBadge() {
    const current = await Notifications.getBadgeCountAsync();
    await this.setBadgeCount(current + 1);
  }

  async clearBadge() {
    await this.setBadgeCount(0);
  }

  // Notification settings
  async getSettings() {
    try {
      const settingsStr = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      return settingsStr
        ? JSON.parse(settingsStr)
        : {
            enabled: true,
            executionComplete: true,
            executionFailed: true,
            workflowUpdated: true,
          };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        enabled: true,
        executionComplete: true,
        executionFailed: true,
        workflowUpdated: true,
      };
    }
  }

  async updateSettings(settings: {
    enabled?: boolean;
    executionComplete?: boolean;
    executionFailed?: boolean;
    workflowUpdated?: boolean;
  }) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  }

  // Cancel notifications
  async cancelNotification(notificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default new NotificationService();
