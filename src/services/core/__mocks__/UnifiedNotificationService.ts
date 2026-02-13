/**
 * Mock for UnifiedNotificationService to allow tests to run
 * PLAN C - Fix for circular dependency issue
 */

import { EventEmitter } from 'events';

export class UnifiedNotificationService extends EventEmitter {
  private static instance: UnifiedNotificationService;

  private constructor() {
    super();
    // Initialize method is properly defined here
    this.initialize();
  }

  static getInstance(): UnifiedNotificationService {
    if (!UnifiedNotificationService.instance) {
      UnifiedNotificationService.instance = new UnifiedNotificationService();
    }
    return UnifiedNotificationService.instance;
  }

  private initialize(): void {
    // Mock initialization
    console.log('Mock UnifiedNotificationService initialized');
  }

  async send(notification: any): Promise<void> {
    // Mock send
    this.emit('notification.sent', notification);
  }

  async broadcast(notification: any): Promise<void> {
    // Mock broadcast
    this.emit('notification.broadcast', notification);
  }

  async createAlert(alert: any): Promise<void> {
    // Mock alert creation
    this.emit('alert.created', alert);
  }

  async triggerAlert(alertId: string, data?: any): Promise<void> {
    // Mock alert trigger
    this.emit('alert.triggered', { alertId, data });
  }

  registerChannel(channel: any): void {
    // Mock channel registration
  }

  unregisterChannel(channelId: string): void {
    // Mock channel unregistration
  }

  getChannels(): any[] {
    return [];
  }

  getStats(): any {
    return {
      sent: 0,
      failed: 0,
      pending: 0,
      channels: 0
    };
  }

  destroy(): void {
    this.removeAllListeners();
  }
}

// Export singleton instance
export const notificationService = UnifiedNotificationService.getInstance();