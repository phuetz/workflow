/**
 * Webhook Repository - Prisma Implementation
 * Handles webhook and webhook event database operations
 */

import { Webhook, WebhookEvent, HttpMethod, Prisma } from '@prisma/client';
import { prisma, executeInTransaction } from '../prisma';
import { logger } from '../../../services/LoggingService';

export interface CreateWebhookInput {
  workflowId: string;
  url: string;
  method?: HttpMethod;
  secret?: string;
  headers?: Prisma.InputJsonValue;
}

export interface UpdateWebhookInput {
  url?: string;
  method?: HttpMethod;
  isActive?: boolean;
  secret?: string | null;
  headers?: Prisma.InputJsonValue;
}

export interface CreateWebhookEventInput {
  webhookId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  headers: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateWebhookEventInput {
  processed?: boolean;
  processingError?: Prisma.InputJsonValue;
}

export type WebhookWithEvents = Webhook & {
  events: WebhookEvent[];
};

export class WebhookRepository {
  /**
   * Create new webhook
   */
  async create(data: CreateWebhookInput): Promise<Webhook> {
    try {
      return await prisma.webhook.create({
        data: {
          workflowId: data.workflowId,
          url: data.url,
          method: data.method || HttpMethod.POST,
          secret: data.secret,
          headers: data.headers || {},
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Webhook URL already exists');
        }
      }
      logger.error('Error creating webhook:', error);
      throw error;
    }
  }

  /**
   * Find webhook by ID
   */
  async findById(id: string): Promise<Webhook | null> {
    try {
      return await prisma.webhook.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding webhook:', error);
      throw error;
    }
  }

  /**
   * Find webhook by URL
   */
  async findByUrl(url: string): Promise<Webhook | null> {
    try {
      return await prisma.webhook.findUnique({
        where: { url },
      });
    } catch (error) {
      logger.error('Error finding webhook by URL:', error);
      throw error;
    }
  }

  /**
   * Find webhooks by workflow
   */
  async findByWorkflow(workflowId: string): Promise<Webhook[]> {
    try {
      return await prisma.webhook.findMany({
        where: { workflowId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error finding webhooks by workflow:', error);
      throw error;
    }
  }

  /**
   * Update webhook
   */
  async update(id: string, data: UpdateWebhookInput): Promise<Webhook> {
    try {
      return await prisma.webhook.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Webhook URL already exists');
        }
        if (error.code === 'P2025') {
          throw new Error('Webhook not found');
        }
      }
      logger.error('Error updating webhook:', error);
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.webhook.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false;
        }
      }
      logger.error('Error deleting webhook:', error);
      throw error;
    }
  }

  /**
   * Record webhook trigger
   */
  async recordTrigger(id: string): Promise<void> {
    try {
      await prisma.webhook.update({
        where: { id },
        data: {
          lastTriggeredAt: new Date(),
          triggerCount: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      logger.error('Error recording webhook trigger:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Create webhook event
   */
  async createEvent(data: CreateWebhookEventInput): Promise<WebhookEvent> {
    try {
      return await executeInTransaction(async (tx) => {
        // Create event
        const event = await tx.webhookEvent.create({
          data: {
            webhookId: data.webhookId,
            eventType: data.eventType,
            payload: data.payload,
            headers: data.headers,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          },
        });

        // Update webhook trigger stats
        await tx.webhook.update({
          where: { id: data.webhookId },
          data: {
            lastTriggeredAt: new Date(),
            triggerCount: {
              increment: 1,
            },
          },
        });

        return event;
      });
    } catch (error) {
      logger.error('Error creating webhook event:', error);
      throw error;
    }
  }

  /**
   * Update webhook event
   */
  async updateEvent(id: string, data: UpdateWebhookEventInput): Promise<WebhookEvent> {
    try {
      return await prisma.webhookEvent.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('Webhook event not found');
        }
      }
      logger.error('Error updating webhook event:', error);
      throw error;
    }
  }

  /**
   * Find webhook events
   */
  async findEvents(
    webhookId: string,
    options?: {
      skip?: number;
      limit?: number;
      processed?: boolean;
    }
  ): Promise<{ events: WebhookEvent[]; total: number }> {
    try {
      const where: Prisma.WebhookEventWhereInput = { webhookId };

      if (options?.processed !== undefined) {
        where.processed = options.processed;
      }

      const [events, total] = await Promise.all([
        prisma.webhookEvent.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 100,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.webhookEvent.count({ where }),
      ]);

      return { events, total };
    } catch (error) {
      logger.error('Error finding webhook events:', error);
      throw error;
    }
  }

  /**
   * Get unprocessed events
   */
  async getUnprocessedEvents(limit: number = 100): Promise<WebhookEvent[]> {
    try {
      return await prisma.webhookEvent.findMany({
        where: {
          processed: false,
        },
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          webhook: true,
        },
      });
    } catch (error) {
      logger.error('Error getting unprocessed events:', error);
      throw error;
    }
  }

  /**
   * Mark event as processed
   */
  async markEventProcessed(id: string, error?: any): Promise<void> {
    try {
      await this.updateEvent(id, {
        processed: true,
        processingError: error ? { message: error.message, stack: error.stack } : undefined,
      });
    } catch (error) {
      logger.error('Error marking event as processed:', error);
    }
  }

  /**
   * Delete old webhook events
   */
  async deleteOldEvents(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await prisma.webhookEvent.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          processed: true,
        },
      });

      logger.info(`Deleted ${result.count} old webhook events`);
      return result.count;
    } catch (error) {
      logger.error('Error deleting old webhook events:', error);
      throw error;
    }
  }

  /**
   * Get webhook statistics
   */
  async getStatistics(webhookId?: string) {
    try {
      const where: Prisma.WebhookEventWhereInput = webhookId ? { webhookId } : {};

      const [totalEvents, processedEvents, failedEvents, recentEvents] = await Promise.all([
        prisma.webhookEvent.count({ where }),
        prisma.webhookEvent.count({ where: { ...where, processed: true, processingError: null } }),
        prisma.webhookEvent.count({
          where: { ...where, processed: true, processingError: { not: Prisma.DbNull } },
        }),
        prisma.webhookEvent.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      let webhookStats = {};
      if (webhookId) {
        const webhook = await prisma.webhook.findUnique({
          where: { id: webhookId },
          select: {
            triggerCount: true,
            lastTriggeredAt: true,
          },
        });

        if (webhook) {
          webhookStats = {
            totalTriggers: webhook.triggerCount,
            lastTriggeredAt: webhook.lastTriggeredAt,
          };
        }
      }

      return {
        totalEvents,
        processedEvents,
        failedEvents,
        pendingEvents: totalEvents - processedEvents - failedEvents,
        recentEvents,
        successRate:
          totalEvents > 0 ? ((processedEvents / totalEvents) * 100).toFixed(2) : '0',
        ...webhookStats,
      };
    } catch (error) {
      logger.error('Error getting webhook statistics:', error);
      throw error;
    }
  }

  /**
   * Get webhook with recent events
   */
  async findByIdWithEvents(id: string, limit: number = 10): Promise<WebhookWithEvents | null> {
    try {
      return await prisma.webhook.findUnique({
        where: { id },
        include: {
          events: {
            take: limit,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding webhook with events:', error);
      throw error;
    }
  }

  /**
   * Get all active webhooks
   */
  async getActiveWebhooks(): Promise<Webhook[]> {
    try {
      return await prisma.webhook.findMany({
        where: {
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting active webhooks:', error);
      throw error;
    }
  }

  /**
   * Validate webhook secret
   */
  async validateSecret(webhookId: string, providedSecret: string): Promise<boolean> {
    try {
      const webhook = await this.findById(webhookId);
      if (!webhook || !webhook.secret) {
        return true; // No secret required
      }

      return webhook.secret === providedSecret;
    } catch (error) {
      logger.error('Error validating webhook secret:', error);
      return false;
    }
  }
}

// Singleton instance
export const webhookRepository = new WebhookRepository();
export default webhookRepository;
