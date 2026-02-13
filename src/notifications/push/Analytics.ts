/**
 * Push Notification Analytics
 * Track and analyze push notification metrics
 */

import { EventEmitter } from 'events';
import {
  PushAnalytics,
  PushDeliveryReport,
  PushNotificationType,
  PushPlatform,
} from '../../types/push';

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
}

export interface AnalyticsMetrics {
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  avgDeliveryTime: number;
  avgOpenTime: number;
}

export class PushAnalyticsService extends EventEmitter {
  private analytics: Map<string, PushAnalytics>;
  private metricsCache: Map<string, AnalyticsMetrics>;
  private cacheTTL: number = 60000; // 1 minute

  constructor() {
    super();
    this.analytics = new Map();
    this.metricsCache = new Map();
  }

  /**
   * Track notification sent
   */
  async trackSent(
    notificationId: string,
    deviceToken: string,
    platform: PushPlatform,
    type: PushNotificationType,
    metadata?: Record<string, any>
  ): Promise<void> {
    const analytics: PushAnalytics = {
      notificationId,
      deviceToken,
      platform,
      type,
      sentAt: new Date(),
      metadata,
    };

    this.analytics.set(notificationId, analytics);
    this.emit('tracked:sent', analytics);
    this.invalidateCache();
  }

  /**
   * Track notification delivered
   */
  async trackDelivered(notificationId: string): Promise<void> {
    const analytics = this.analytics.get(notificationId);
    if (analytics) {
      analytics.deliveredAt = new Date();
      this.emit('tracked:delivered', analytics);
      this.invalidateCache();
    }
  }

  /**
   * Track notification opened
   */
  async trackOpened(notificationId: string): Promise<void> {
    const analytics = this.analytics.get(notificationId);
    if (analytics) {
      analytics.openedAt = new Date();
      this.emit('tracked:opened', analytics);
      this.invalidateCache();
    }
  }

  /**
   * Track notification dismissed
   */
  async trackDismissed(notificationId: string): Promise<void> {
    const analytics = this.analytics.get(notificationId);
    if (analytics) {
      analytics.dismissedAt = new Date();
      this.emit('tracked:dismissed', analytics);
      this.invalidateCache();
    }
  }

  /**
   * Track notification failed
   */
  async trackFailed(
    notificationId: string,
    error: string
  ): Promise<void> {
    const analytics = this.analytics.get(notificationId);
    if (analytics) {
      analytics.failedAt = new Date();
      analytics.error = error;
      this.emit('tracked:failed', analytics);
      this.invalidateCache();
    }
  }

  /**
   * Get analytics for notification
   */
  async getAnalytics(notificationId: string): Promise<PushAnalytics | null> {
    return this.analytics.get(notificationId) || null;
  }

  /**
   * Get delivery report for time range
   */
  async getDeliveryReport(
    startDate: Date,
    endDate: Date
  ): Promise<PushDeliveryReport> {
    const analyticsInRange = Array.from(this.analytics.values()).filter(
      a => a.sentAt >= startDate && a.sentAt <= endDate
    );

    const totalSent = analyticsInRange.length;
    const totalDelivered = analyticsInRange.filter(a => a.deliveredAt).length;
    const totalOpened = analyticsInRange.filter(a => a.openedAt).length;
    const totalFailed = analyticsInRange.filter(a => a.failedAt).length;

    // Calculate platform breakdown
    const platformBreakdown = this.calculatePlatformBreakdown(analyticsInRange);

    // Calculate type breakdown
    const typeBreakdown = this.calculateTypeBreakdown(analyticsInRange);

    // Calculate average delivery time
    const avgDeliveryTime = this.calculateAvgDeliveryTime(analyticsInRange);

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalFailed,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      avgDeliveryTime,
      platformBreakdown,
      typeBreakdown,
    };
  }

  /**
   * Calculate platform breakdown
   */
  private calculatePlatformBreakdown(
    analytics: PushAnalytics[]
  ): PushDeliveryReport['platformBreakdown'] {
    const platforms: PushPlatform[] = ['ios', 'android', 'web'];
    return platforms.map(platform => {
      const platformAnalytics = analytics.filter(a => a.platform === platform);
      return {
        platform,
        sent: platformAnalytics.length,
        delivered: platformAnalytics.filter(a => a.deliveredAt).length,
        opened: platformAnalytics.filter(a => a.openedAt).length,
        failed: platformAnalytics.filter(a => a.failedAt).length,
      };
    });
  }

  /**
   * Calculate type breakdown
   */
  private calculateTypeBreakdown(
    analytics: PushAnalytics[]
  ): PushDeliveryReport['typeBreakdown'] {
    const types = [...new Set(analytics.map(a => a.type))];
    return types.map(type => {
      const typeAnalytics = analytics.filter(a => a.type === type);
      return {
        type,
        sent: typeAnalytics.length,
        delivered: typeAnalytics.filter(a => a.deliveredAt).length,
        opened: typeAnalytics.filter(a => a.openedAt).length,
        failed: typeAnalytics.filter(a => a.failedAt).length,
      };
    });
  }

  /**
   * Calculate average delivery time
   */
  private calculateAvgDeliveryTime(analytics: PushAnalytics[]): number {
    const deliveryTimes = analytics
      .filter(a => a.deliveredAt && a.sentAt)
      .map(a => a.deliveredAt!.getTime() - a.sentAt.getTime());

    return deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;
  }

  /**
   * Get metrics for time range
   */
  async getMetrics(timeRange: AnalyticsTimeRange): Promise<AnalyticsMetrics> {
    const cacheKey = `${timeRange.start.getTime()}_${timeRange.end.getTime()}`;
    const cached = this.metricsCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const analyticsInRange = Array.from(this.analytics.values()).filter(
      a => a.sentAt >= timeRange.start && a.sentAt <= timeRange.end
    );

    const sent = analyticsInRange.length;
    const delivered = analyticsInRange.filter(a => a.deliveredAt).length;
    const opened = analyticsInRange.filter(a => a.openedAt).length;
    const failed = analyticsInRange.filter(a => a.failedAt).length;

    const avgDeliveryTime = this.calculateAvgDeliveryTime(analyticsInRange);

    const openTimes = analyticsInRange
      .filter(a => a.openedAt && a.deliveredAt)
      .map(a => a.openedAt!.getTime() - a.deliveredAt!.getTime());

    const avgOpenTime = openTimes.length > 0
      ? openTimes.reduce((a, b) => a + b, 0) / openTimes.length
      : 0;

    const metrics: AnalyticsMetrics = {
      sent,
      delivered,
      opened,
      failed,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      avgDeliveryTime,
      avgOpenTime,
    };

    this.metricsCache.set(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get metrics by platform
   */
  async getMetricsByPlatform(
    platform: PushPlatform,
    timeRange: AnalyticsTimeRange
  ): Promise<AnalyticsMetrics> {
    const analyticsInRange = Array.from(this.analytics.values()).filter(
      a =>
        a.platform === platform &&
        a.sentAt >= timeRange.start &&
        a.sentAt <= timeRange.end
    );

    const sent = analyticsInRange.length;
    const delivered = analyticsInRange.filter(a => a.deliveredAt).length;
    const opened = analyticsInRange.filter(a => a.openedAt).length;
    const failed = analyticsInRange.filter(a => a.failedAt).length;

    return {
      sent,
      delivered,
      opened,
      failed,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      avgDeliveryTime: this.calculateAvgDeliveryTime(analyticsInRange),
      avgOpenTime: 0,
    };
  }

  /**
   * Get metrics by type
   */
  async getMetricsByType(
    type: PushNotificationType,
    timeRange: AnalyticsTimeRange
  ): Promise<AnalyticsMetrics> {
    const analyticsInRange = Array.from(this.analytics.values()).filter(
      a =>
        a.type === type &&
        a.sentAt >= timeRange.start &&
        a.sentAt <= timeRange.end
    );

    const sent = analyticsInRange.length;
    const delivered = analyticsInRange.filter(a => a.deliveredAt).length;
    const opened = analyticsInRange.filter(a => a.openedAt).length;
    const failed = analyticsInRange.filter(a => a.failedAt).length;

    return {
      sent,
      delivered,
      opened,
      failed,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      avgDeliveryTime: this.calculateAvgDeliveryTime(analyticsInRange),
      avgOpenTime: 0,
    };
  }

  /**
   * Get top performing notification types
   */
  async getTopPerformingTypes(
    timeRange: AnalyticsTimeRange,
    limit = 10
  ): Promise<Array<{ type: PushNotificationType; metrics: AnalyticsMetrics }>> {
    const types = [...new Set(Array.from(this.analytics.values()).map(a => a.type))];

    const typeMetrics = await Promise.all(
      types.map(async type => ({
        type,
        metrics: await this.getMetricsByType(type, timeRange),
      }))
    );

    // Sort by open rate
    return typeMetrics
      .sort((a, b) => b.metrics.openRate - a.metrics.openRate)
      .slice(0, limit);
  }

  /**
   * Invalidate metrics cache
   */
  private invalidateCache(): void {
    this.metricsCache.clear();
  }

  /**
   * Clean up old analytics data
   */
  async cleanup(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let removed = 0;
    for (const [id, analytics] of this.analytics) {
      if (analytics.sentAt < cutoffDate) {
        this.analytics.delete(id);
        removed++;
      }
    }

    this.emit('cleaned', removed);
    return removed;
  }

  /**
   * Export analytics data
   */
  async exportData(): Promise<PushAnalytics[]> {
    return Array.from(this.analytics.values());
  }

  /**
   * Import analytics data
   */
  async importData(data: PushAnalytics[]): Promise<void> {
    for (const analytics of data) {
      this.analytics.set(analytics.notificationId, analytics);
    }
    this.invalidateCache();
    this.emit('imported', data.length);
  }

  /**
   * Get total analytics count
   */
  getCount(): number {
    return this.analytics.size;
  }

  /**
   * Clear all analytics
   */
  clearAll(): void {
    this.analytics.clear();
    this.metricsCache.clear();
    this.emit('cleared');
  }
}

// Singleton instance
export const pushAnalyticsService = new PushAnalyticsService();
