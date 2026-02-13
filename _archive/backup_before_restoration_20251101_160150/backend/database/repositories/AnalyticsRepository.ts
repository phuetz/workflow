/**
 * Analytics Repository - Prisma Implementation
 * Handles workflow analytics, system metrics, and audit logs
 */

import {
  WorkflowAnalytics,
  SystemMetrics,
  AuditLog,
  Notification,
  NotificationType,
  NotificationPriority,
  Prisma
} from '@prisma/client';
import { prisma } from '../prisma';
import { logger } from '../../../services/LoggingService';

export interface CreateWorkflowAnalyticsInput {
  workflowId: string;
  date: Date;
  executions?: number;
  successfulRuns?: number;
  failedRuns?: number;
  avgDuration?: number;
  totalDuration?: number;
  metrics?: Prisma.InputJsonValue;
}

export interface CreateSystemMetricsInput {
  metricType: string;
  value: number;
  labels?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateAuditLogInput {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
  priority?: NotificationPriority;
  expiresAt?: Date;
}

export class AnalyticsRepository {
  // ==================== WORKFLOW ANALYTICS ====================

  /**
   * Record workflow analytics for a day
   */
  async recordWorkflowAnalytics(data: CreateWorkflowAnalyticsInput): Promise<WorkflowAnalytics> {
    try {
      const date = new Date(data.date);
      date.setHours(0, 0, 0, 0); // Normalize to start of day

      return await prisma.workflowAnalytics.upsert({
        where: {
          workflowId_date: {
            workflowId: data.workflowId,
            date,
          },
        },
        create: {
          workflowId: data.workflowId,
          date,
          executions: data.executions || 0,
          successfulRuns: data.successfulRuns || 0,
          failedRuns: data.failedRuns || 0,
          avgDuration: data.avgDuration || 0,
          totalDuration: data.totalDuration || 0,
          metrics: data.metrics || {},
        },
        update: {
          executions: { increment: data.executions || 0 },
          successfulRuns: { increment: data.successfulRuns || 0 },
          failedRuns: { increment: data.failedRuns || 0 },
          totalDuration: { increment: data.totalDuration || 0 },
        },
      });
    } catch (error) {
      logger.error('Error recording workflow analytics:', error);
      throw error;
    }
  }

  /**
   * Get workflow analytics for a date range
   */
  async getWorkflowAnalytics(
    workflowId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkflowAnalytics[]> {
    try {
      return await prisma.workflowAnalytics.findMany({
        where: {
          workflowId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      });
    } catch (error) {
      logger.error('Error getting workflow analytics:', error);
      throw error;
    }
  }

  /**
   * Get aggregated analytics across all workflows
   */
  async getAggregatedAnalytics(startDate: Date, endDate: Date, userId?: string) {
    try {
      const where: Prisma.WorkflowAnalyticsWhereInput = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (userId) {
        where.workflow = {
          userId,
        };
      }

      const analytics = await prisma.workflowAnalytics.findMany({
        where,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      let totalExecutions = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      let totalDuration = 0;

      analytics.forEach((record) => {
        totalExecutions += record.executions;
        totalSuccessful += record.successfulRuns;
        totalFailed += record.failedRuns;
        totalDuration += record.totalDuration;
      });

      return {
        totalExecutions,
        totalSuccessful,
        totalFailed,
        successRate: totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0,
        avgDuration: totalExecutions > 0 ? totalDuration / totalExecutions : 0,
        byDate: analytics.reduce((acc, record) => {
          const dateKey = record.date.toISOString().split('T')[0];
          if (!acc[dateKey]) {
            acc[dateKey] = {
              executions: 0,
              successful: 0,
              failed: 0,
            };
          }
          acc[dateKey].executions += record.executions;
          acc[dateKey].successful += record.successfulRuns;
          acc[dateKey].failed += record.failedRuns;
          return acc;
        }, {} as Record<string, any>),
      };
    } catch (error) {
      logger.error('Error getting aggregated analytics:', error);
      throw error;
    }
  }

  /**
   * Get top performing workflows
   */
  async getTopWorkflows(
    limit: number = 10,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      const where: Prisma.WorkflowAnalyticsWhereInput = {};

      if (startDate && endDate) {
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      const analytics = await prisma.workflowAnalytics.groupBy({
        by: ['workflowId'],
        where,
        _sum: {
          executions: true,
          successfulRuns: true,
          failedRuns: true,
        },
        _avg: {
          avgDuration: true,
        },
        orderBy: {
          _sum: {
            executions: 'desc',
          },
        },
        take: limit,
      });

      // Get workflow names
      const workflowIds = analytics.map((a) => a.workflowId);
      const workflows = await prisma.workflow.findMany({
        where: {
          id: { in: workflowIds },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const workflowMap = new Map(workflows.map((w) => [w.id, w.name]));

      return analytics.map((a) => ({
        workflowId: a.workflowId,
        workflowName: workflowMap.get(a.workflowId) || 'Unknown',
        totalExecutions: a._sum.executions || 0,
        successfulRuns: a._sum.successfulRuns || 0,
        failedRuns: a._sum.failedRuns || 0,
        avgDuration: a._avg.avgDuration || 0,
        successRate:
          a._sum.executions && a._sum.successfulRuns
            ? ((a._sum.successfulRuns / a._sum.executions) * 100).toFixed(2)
            : '0',
      }));
    } catch (error) {
      logger.error('Error getting top workflows:', error);
      throw error;
    }
  }

  // ==================== SYSTEM METRICS ====================

  /**
   * Record system metric
   */
  async recordSystemMetric(data: CreateSystemMetricsInput): Promise<SystemMetrics> {
    try {
      return await prisma.systemMetrics.create({
        data: {
          metricType: data.metricType,
          value: data.value,
          labels: data.labels || {},
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      logger.error('Error recording system metric:', error);
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(
    metricType: string,
    startTime: Date,
    endTime: Date
  ): Promise<SystemMetrics[]> {
    try {
      return await prisma.systemMetrics.findMany({
        where: {
          metricType,
          timestamp: {
            gte: startTime,
            lte: endTime,
          },
        },
        orderBy: { timestamp: 'asc' },
      });
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      throw error;
    }
  }

  /**
   * Get latest metrics for dashboard
   */
  async getLatestMetrics() {
    try {
      const metricTypes = ['cpu_usage', 'memory_usage', 'disk_usage', 'active_connections'];

      const metrics = await Promise.all(
        metricTypes.map(async (type) => {
          const latest = await prisma.systemMetrics.findFirst({
            where: { metricType: type },
            orderBy: { timestamp: 'desc' },
          });
          return { type, latest };
        })
      );

      return metrics.reduce((acc, { type, latest }) => {
        if (latest) {
          acc[type] = {
            value: latest.value,
            timestamp: latest.timestamp,
            metadata: latest.metadata,
          };
        }
        return acc;
      }, {} as Record<string, any>);
    } catch (error) {
      logger.error('Error getting latest metrics:', error);
      throw error;
    }
  }

  /**
   * Delete old system metrics
   */
  async deleteOldMetrics(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await prisma.systemMetrics.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Deleted ${result.count} old system metrics`);
      return result.count;
    } catch (error) {
      logger.error('Error deleting old metrics:', error);
      throw error;
    }
  }

  // ==================== AUDIT LOGS ====================

  /**
   * Create audit log entry
   */
  async createAuditLog(data: CreateAuditLogInput): Promise<AuditLog> {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      logger.error('Error creating audit log:', error);
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(options?: {
    skip?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const where: Prisma.AuditLogWhereInput = {};

      if (options?.userId) where.userId = options.userId;
      if (options?.action) where.action = options.action;
      if (options?.resource) where.resource = options.resource;

      if (options?.startDate || options?.endDate) {
        where.timestamp = {};
        if (options.startDate) where.timestamp.gte = options.startDate;
        if (options.endDate) where.timestamp.lte = options.endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 100,
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { logs, total };
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Delete old audit logs
   */
  async deleteOldAuditLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Deleted ${result.count} old audit logs`);
      return result.count;
    } catch (error) {
      logger.error('Error deleting old audit logs:', error);
      throw error;
    }
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Create notification
   */
  async createNotification(data: CreateNotificationInput): Promise<Notification> {
    try {
      return await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          priority: data.priority || NotificationPriority.NORMAL,
          expiresAt: data.expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getNotifications(
    userId: string,
    options?: {
      skip?: number;
      limit?: number;
      read?: boolean;
      type?: NotificationType;
    }
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    try {
      const where: Prisma.NotificationWhereInput = { userId };

      if (options?.read !== undefined) where.read = options.read;
      if (options?.type) where.type = options.type;

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 50,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId, read: false } }),
      ]);

      return { notifications, total, unreadCount };
    } catch (error) {
      logger.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    try {
      return await prisma.notification.update({
        where: {
          id,
          userId, // Ensure user owns notification
        },
        data: {
          read: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Notification not found or access denied');
        }
      }
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return result.count;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.delete({
        where: {
          id,
          userId, // Ensure user owns notification
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false;
        }
      }
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete expired notifications
   */
  async deleteExpiredNotifications(): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            not: null,
            lt: new Date(),
          },
        },
      });

      logger.info(`Deleted ${result.count} expired notifications`);
      return result.count;
    } catch (error) {
      logger.error('Error deleting expired notifications:', error);
      throw error;
    }
  }
}

// Singleton instance
export const analyticsRepository = new AnalyticsRepository();
export default analyticsRepository;
