/**
 * Trigger Service
 * Manages workflow triggers including webhooks, schedules, and file watchers
 */

import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import { workflowAnalytics } from './WorkflowAnalyticsService';
import type { WorkflowExecution } from '../types/workflowTypes';

export interface TriggerConfig {
  id: string;
  workflowId: string;
  type: TriggerType;
  name: string;
  enabled: boolean;
  config: TriggerSpecificConfig;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export type TriggerType = 
  | 'webhook'
  | 'schedule' 
  | 'file_watcher'
  | 'email'
  | 'database'
  | 'http_poll'
  | 'manual';

export interface TriggerSpecificConfig {
  // Webhook config
  path?: string;
  methods?: string[];
  authentication?: 'none' | 'api_key' | 'basic' | 'oauth';
  
  // Schedule config
  cron?: string;
  timezone?: string;
  
  // File watcher config
  watchPath?: string;
  events?: ('created' | 'modified' | 'deleted')[];
  filePattern?: string;
  
  // Email config
  imapConfig?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  mailbox?: string;
  markAsRead?: boolean;
  
  // Database config
  connectionString?: string;
  query?: string;
  pollInterval?: number;
  
  // HTTP Poll config
  url?: string;
  interval?: number;
  headers?: Record<string, string>;
  lastResponse?: unknown;
}

export interface TriggerExecution {
  triggerId: string;
  workflowId: string;
  timestamp: Date;
  data: unknown;
  source: string; // IP address, file path, etc.
  metadata: Record<string, unknown>;
}

export interface WebhookRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  ip: string;
}

export interface WebhookResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export class TriggerService extends BaseService {
  private triggers: Map<string, TriggerConfig> = new Map();
  private activePollers: Map<string, NodeJS.Timeout> = new Map();
  private webhookHandlers: Map<string, (...args: unknown[]) => unknown> = new Map();

  constructor() {
    super('TriggerService', {
      enableRetry: true,
      maxRetries: 3
    });

    // Initialize built-in triggers
    this.initializeBuiltInTriggers();
  }

  private initializeBuiltInTriggers(): void {
    // Manual trigger is always available
    this.registerTrigger({
      id: 'manual-trigger',
      workflowId: '*', // Global manual trigger
      type: 'manual',
      name: 'Manual Trigger',
      enabled: true,
      config: {},
      createdAt: new Date(),
      triggerCount: 0
    });

    logger.info('Trigger service initialized');
  }

  /**
   * Register a new trigger
   */
  public async registerTrigger(config: TriggerConfig): Promise<void> {
    return this.executeOperation('registerTrigger', async () => {
      this.triggers.set(config.id, config);

      // Set up the trigger based on type
      await this.setupTrigger(config);

      logger.info('Trigger registered', {
        triggerId: config.id,
        type: config.type,
        workflowId: config.workflowId
      });
    });
  }

  /**
   * Unregister a trigger
   */
  public async unregisterTrigger(triggerId: string): Promise<void> {
    return this.executeOperation('unregisterTrigger', async () => {
      if (!trigger) return;

      // Clean up the trigger
      await this.cleanupTrigger(trigger);
      this.triggers.delete(triggerId);

      logger.info('Trigger unregistered', { triggerId });
    });
  }

  /**
   * Setup trigger based on type
   */
  private async setupTrigger(config: TriggerConfig): Promise<void> {
    if (!config.enabled) return;

    switch (config.type) {
      case 'webhook':
        await this.setupWebhookTrigger(config);
        break;
      case 'schedule':
        await this.setupScheduleTrigger(config);
        break;
      case 'file_watcher':
        await this.setupFileWatcherTrigger(config);
        break;
      case 'http_poll':
        await this.setupHttpPollTrigger(config);
        break;
      case 'database':
        await this.setupDatabaseTrigger(config);
        break;
      case 'email':
        await this.setupEmailTrigger(config);
        break;
    }
  }

  /**
   * Setup webhook trigger
   */
  private async setupWebhookTrigger(config: TriggerConfig): Promise<void> {
    const { _path, methods = ['POST'] } = config.config;
    if (!path) throw new Error('Webhook path is required');

      // Validate method
      if (!methods.includes(request.method)) {
        return {
          statusCode: 405,
          body: { error: 'Method not allowed' }
        };
      }

      // Authenticate if required
      if (!authResult.success) {
        return {
          statusCode: 401,
          body: { error: authResult.error }
        };
      }

      // Trigger workflow execution
        method: request.method,
        headers: request.headers,
        query: request.query,
        body: request.body,
        path: request.path,
        ip: request.ip,
        timestamp: new Date().toISOString()
      });

      // Update trigger stats
      await this.updateTriggerStats(config.id);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          success: true,
          executionId: execution?.id,
          timestamp: new Date().toISOString()
        }
      };
    };

    this.webhookHandlers.set(config.id, handler);
    logger.info('Webhook trigger setup', { triggerId: config.id, path });
  }

  /**
   * Setup schedule trigger
   */
  private async setupScheduleTrigger(config: TriggerConfig): Promise<void> {
    const { _cron, timezone = 'UTC' } = config.config;
    if (!cron) throw new Error('Cron expression is required');

    // Parse cron and calculate next execution

      // Trigger workflow
      await this.triggerWorkflow(config, {
        scheduledTime: new Date().toISOString(),
        cron,
        timezone
      });

      // Update stats and reschedule
      await this.updateTriggerStats(config.id);
      await this.setupScheduleTrigger(config); // Reschedule
    }, delay);

    this.activePollers.set(config.id, timeout);
    logger.info('Schedule trigger setup', { 
      triggerId: config.id, 
      cron, 
      nextExecution: nextExecution.toISOString() 
    });
  }

  /**
   * Setup file watcher trigger
   */
  private async setupFileWatcherTrigger(config: TriggerConfig): Promise<void> {
    const { _watchPath, events = ['created', 'modified'] } = config.config;
    // filePattern could be used for future file filtering
    if (!watchPath) throw new Error('Watch path is required');

    // In a real implementation, this would use fs.watch or chokidar
    logger.info('File watcher trigger setup', { 
      triggerId: config.id, 
      watchPath, 
      events 
    });

    // Mock file watcher for demonstration
      // Simulate file change detection
      
      if (shouldTrigger) {
        await this.triggerWorkflow(config, {
          event: 'modified',
          filePath: `${watchPath}/example.txt`,
          timestamp: new Date().toISOString(),
          fileSize: 1024
        });
        
        await this.updateTriggerStats(config.id);
      }
    }, 10000); // Check every 10 seconds

    this.activePollers.set(config.id, mockWatcher);
  }

  /**
   * Setup HTTP polling trigger
   */
  private async setupHttpPollTrigger(config: TriggerConfig): Promise<void> {
    const { url, interval = 60000, headers = {} } = config.config;
    if (!url) throw new Error('Poll URL is required');

      try {

        // Check if data has changed (simple comparison)

        if (hasChanged || !lastResponse) {
          // Update last response
          config.config.lastResponse = data;
          
          // Trigger workflow
          await this.triggerWorkflow(config, {
            url,
            data,
            statusCode: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            timestamp: new Date().toISOString()
          });

          await this.updateTriggerStats(config.id);
        }
      } catch (error) {
        logger.error('HTTP poll error', { 
          triggerId: config.id, 
          url, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    };

    // Initial poll
    await poll();

    // Set up interval
    this.activePollers.set(config.id, intervalId);

    logger.info('HTTP poll trigger setup', { triggerId: config.id, url, interval });
  }

  /**
   * Setup database trigger
   */
  private async setupDatabaseTrigger(config: TriggerConfig): Promise<void> {
    const { _connectionString, query, pollInterval = 60000 } = config.config;
    if (!connectionString || !query) {
      throw new Error('Database connection string and query are required');
    }

    // Mock database polling
      try {
        // In real implementation, would execute actual database query
          { id: 1, name: 'John', created_at: new Date() },
          { id: 2, name: 'Jane', created_at: new Date() }
        ];

        if (mockResults.length > 0) {
          await this.triggerWorkflow(config, {
            query,
            results: mockResults,
            count: mockResults.length,
            timestamp: new Date().toISOString()
          });

          await this.updateTriggerStats(config.id);
        }
      } catch (error) {
        logger.error('Database poll error', { 
          triggerId: config.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    };

    this.activePollers.set(config.id, intervalId);

    logger.info('Database trigger setup', { triggerId: config.id, pollInterval });
  }

  /**
   * Setup email trigger
   */
  private async setupEmailTrigger(config: TriggerConfig): Promise<void> {
    const { _imapConfig, mailbox = 'INBOX' } = config.config;
    // markAsRead could be used for future email handling
    if (!imapConfig) throw new Error('IMAP configuration is required');

    // Mock email monitoring
      try {
        // In real implementation, would connect to IMAP server
          {
            from: 'sender@example.com',
            subject: 'Test Email',
            body: 'This is a test email',
            date: new Date(),
            messageId: 'msg-123'
          }
        ];

        for (const email of mockEmails) {
          await this.triggerWorkflow(config, {
            email,
            mailbox,
            timestamp: new Date().toISOString()
          });

          await this.updateTriggerStats(config.id);
        }
      } catch (error) {
        logger.error('Email trigger error', { 
          triggerId: config.id, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    };

    this.activePollers.set(config.id, intervalId);

    logger.info('Email trigger setup', { triggerId: config.id, mailbox });
  }

  /**
   * Authenticate webhook request
   */
  private async authenticateWebhook(
    config: TriggerConfig, 
    request: WebhookRequest
  ): Promise<{ success: boolean; error?: string }> {
    const { _authentication } = config.config;

    switch (authentication) {
      case 'none':
        return { success: true };
      
      case 'api_key': {
        if (!apiKey) {
          return { success: false, error: 'API key required' };
        }
        // Validate API key (would check against stored keys)
        return { success: true };
      }
      
      case 'basic': {
        if (!authHeader?.startsWith('Basic ')) {
          return { success: false, error: 'Basic authentication required' };
        }
        // Validate basic auth (would decode and check credentials)
        return { success: true };
      }
      
      default:
        return { success: true };
    }
  }

  /**
   * Trigger workflow execution
   */
  private async triggerWorkflow(
    config: TriggerConfig, 
    data: unknown
  ): Promise<WorkflowExecution | null> {
    try {
      // In real implementation, would call workflow execution service
      const execution: WorkflowExecution = {
        id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workflowId: config.workflowId,
        userId: 'system', // Triggered by system
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        duration: Math.random() * 1000,
        input: data,
        output: { success: true, triggeredBy: config.type },
        nodeExecutions: [],
        context: {
          variables: {},
          results: {},
          metadata: {
            triggerId: config.id,
            triggerType: config.type
          }
        }
      };

      // Record execution for analytics
      await workflowAnalytics.recordExecution(execution);

      logger.info('Workflow triggered', {
        triggerId: config.id,
        workflowId: config.workflowId,
        executionId: execution.id
      });

      return execution;
    } catch (error) {
      logger.error('Failed to trigger workflow', {
        triggerId: config.id,
        workflowId: config.workflowId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Update trigger statistics
   */
  private async updateTriggerStats(triggerId: string): Promise<void> {
    if (!trigger) return;

    trigger.triggerCount++;
    trigger.lastTriggered = new Date();
    this.triggers.set(triggerId, trigger);
  }

  /**
   * Cleanup trigger resources
   */
  private async cleanupTrigger(config: TriggerConfig): Promise<void> {
    // Clear any active pollers
    if (poller) {
      clearInterval(poller);
      clearTimeout(poller);
      this.activePollers.delete(config.id);
    }

    // Remove webhook handlers
    this.webhookHandlers.delete(config.id);

    logger.info('Trigger cleaned up', { triggerId: config.id });
  }

  /**
   * Handle webhook request
   */
  public async handleWebhookRequest(
    path: string, 
    request: WebhookRequest
  ): Promise<WebhookResponse> {
    // Find matching webhook trigger
      t => t.type === 'webhook' && t.config.path === path && t.enabled
    );

    if (!trigger) {
      return {
        statusCode: 404,
        body: { error: 'Webhook not found' }
      };
    }

    if (!handler) {
      return {
        statusCode: 500,
        body: { error: 'Webhook handler not found' }
      };
    }

    return handler(request);
  }

  /**
   * Get all triggers for a workflow
   */
  public getWorkflowTriggers(workflowId: string): TriggerConfig[] {
    return Array.from(this.triggers.values()).filter(
      t => t.workflowId === workflowId
    );
  }

  /**
   * Get trigger by ID
   */
  public getTrigger(triggerId: string): TriggerConfig | undefined {
    return this.triggers.get(triggerId);
  }

  /**
   * Enable/disable trigger
   */
  public async setTriggerEnabled(triggerId: string, enabled: boolean): Promise<void> {
    if (!trigger) return;

    if (trigger.enabled === enabled) return;

    trigger.enabled = enabled;

    if (enabled) {
      await this.setupTrigger(trigger);
    } else {
      await this.cleanupTrigger(trigger);
    }

    this.triggers.set(triggerId, trigger);
    logger.info('Trigger enabled/disabled', { triggerId, enabled });
  }

  /**
   * Test trigger (manual execution)
   */
  public async testTrigger(triggerId: string, testData?: unknown): Promise<void> {
    if (!trigger) throw new Error('Trigger not found');

    await this.triggerWorkflow(trigger, testData || {
      test: true,
      timestamp: new Date().toISOString()
    });

    logger.info('Trigger tested', { triggerId });
  }

  /**
   * Calculate next cron execution time
   */
  private calculateNextCronExecution(_cron: string, _timezone: string): Date {
    // Unused parameters for future implementation: cron, timezone
    // Simplified cron parsing - in real implementation would use a cron library
    nextMinute.setSeconds(0, 0);
    return nextMinute;
  }

  /**
   * Get trigger statistics
   */
  public getTriggerStats(): {
    total: number;
    enabled: number;
    byType: Record<TriggerType, number>;
    totalTriggers: number;
  } {

    const byType: Record<TriggerType, number> = {
      webhook: 0,
      schedule: 0,
      file_watcher: 0,
      email: 0,
      database: 0,
      http_poll: 0,
      manual: 0
    };

    triggers.forEach(trigger => {
      byType[trigger.type]++;
    });

    return { total, enabled, byType, totalTriggers };
  }
}

// Export singleton instance
export const triggerService = new TriggerService();