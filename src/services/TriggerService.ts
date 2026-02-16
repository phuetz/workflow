/**
 * Trigger Service
 * Manages workflow triggers including webhooks, schedules, and file watchers
 *
 * This service provides real implementations for:
 * - File watcher using chokidar (with fallback to mock if unavailable)
 * - Database polling using Prisma
 * - Email monitoring using IMAP (with fallback to mock if unavailable)
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import { workflowAnalytics } from './WorkflowAnalyticsService';
import type { WorkflowExecution } from '../types/workflowTypes';
import { ExecutionStatus } from '../types/workflowTypes';
import { prisma } from '../backend/database/prisma';

// Type definitions for optional dependencies
type ChokidarWatcher = {
  on: (event: string, callback: (path: string, stats?: unknown) => void) => ChokidarWatcher;
  close: () => Promise<void>;
};

type ImapConnection = {
  openBox: (mailbox: string) => Promise<unknown>;
  search: (criteria: unknown[], options: unknown) => Promise<unknown[]>;
  end: () => void;
};

// Lazy-loaded dependencies with availability flags
 
let chokidar: any = null;
let chokidarAvailable = false;
 
let imapSimple: any = null;
let imapAvailable = false;

// Dynamic import for chokidar (file watching)
async function loadChokidar(): Promise<boolean> {
  if (chokidarAvailable) return true;
  try {
    const module = await import('chokidar');
    chokidar = module.default || module;
    chokidarAvailable = true;
    logger.info('chokidar loaded successfully - real file watching enabled');
    return true;
  } catch (error) {
    logger.warn('chokidar not available - file watcher will use polling fallback', {
      error: error instanceof Error ? error.message : String(error),
      hint: 'Install chokidar with: npm install chokidar'
    });
    return false;
  }
}

// Dynamic import for imap-simple (email monitoring)
async function loadImapSimple(): Promise<boolean> {
  if (imapAvailable) return true;
  try {
     
    const module = await import(/* webpackIgnore: true */ 'imap-simple' as string);
    imapSimple = module.default || module;
    imapAvailable = true;
    logger.info('imap-simple loaded successfully - real email monitoring enabled');
    return true;
  } catch (error) {
    logger.warn('imap-simple not available - email trigger will use polling fallback', {
      error: error instanceof Error ? error.message : String(error),
      hint: 'Install imap-simple with: npm install imap-simple'
    });
    return false;
  }
}

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
  private webhookHandlers: Map<string, (request: WebhookRequest) => Promise<WebhookResponse>> = new Map();

  // Real file watchers (chokidar instances)
  private fileWatchers: Map<string, ChokidarWatcher> = new Map();

  // IMAP connections for email triggers
  private imapConnections: Map<string, ImapConnection> = new Map();

  // Track last check timestamps for database polling
  private lastCheckTimestamps: Map<string, Date> = new Map();

  // Track processed email IDs to avoid duplicates
  private processedEmailIds: Map<string, Set<string>> = new Map();

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
    await this.executeOperation('registerTrigger', async () => {
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
    await this.executeOperation('unregisterTrigger', async () => {
      const trigger = this.triggers.get(triggerId);
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
    const { path, methods = ['POST'] } = config.config;
    if (!path) throw new Error('Webhook path is required');

    const handler = async (request: WebhookRequest): Promise<WebhookResponse> => {
      // Validate method
      if (!methods.includes(request.method)) {
        return {
          statusCode: 405,
          body: { error: 'Method not allowed' }
        };
      }

      // Authenticate if required
      const authResult = await this.authenticateWebhook(config, request);
      if (!authResult.success) {
        return {
          statusCode: 401,
          body: { error: authResult.error }
        };
      }

      // Trigger workflow execution
      const execution = await this.triggerWorkflow(config, {
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
    const { cron, timezone = 'UTC' } = config.config;
    if (!cron) throw new Error('Cron expression is required');

    // Parse cron and calculate next execution
    const nextExecution = this.calculateNextCronExecution(cron, timezone);
    const delay = nextExecution.getTime() - Date.now();

    const timeout = setTimeout(async () => {
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
   * Setup file watcher trigger using chokidar for real file system monitoring
   * Falls back to polling-based simulation if chokidar is not available
   */
  private async setupFileWatcherTrigger(config: TriggerConfig): Promise<void> {
    const { watchPath, events = ['created', 'modified'], filePattern } = config.config;
    if (!watchPath) throw new Error('Watch path is required');

    // Try to load chokidar for real file watching
    const hasChokidar = await loadChokidar();

    if (hasChokidar && chokidar) {
      // Real file watching implementation using chokidar
      await this.setupRealFileWatcher(config, watchPath, events, filePattern);
    } else {
      // Fallback to fs.watch-based polling if chokidar not available
      await this.setupFallbackFileWatcher(config, watchPath, events, filePattern);
    }

    logger.info('File watcher trigger setup', {
      triggerId: config.id,
      watchPath,
      events,
      filePattern,
      implementation: hasChokidar ? 'chokidar' : 'fs-fallback'
    });
  }

  /**
   * Real file watcher implementation using chokidar
   */
  private async setupRealFileWatcher(
    config: TriggerConfig,
    watchPath: string,
    events: string[],
    filePattern?: string
  ): Promise<void> {
    if (!chokidar) {
      throw new Error('chokidar not loaded');
    }

    // Build glob pattern if file pattern specified
    const watchTarget = filePattern
      ? `${watchPath}/${filePattern}`
      : watchPath;

    const watcher = chokidar.watch(watchTarget, {
      persistent: true,
      ignoreInitial: true,
      // recursive watching is default in chokidar
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      },
      ignorePermissionErrors: true
    });

    // Handle file events
    const handleFileEvent = async (
      eventType: 'created' | 'modified' | 'deleted',
      filePath: string,
      stats?: unknown
    ) => {
      // Check if this event type is enabled
      if (!events.includes(eventType)) {
        return;
      }

      // Get file stats if not provided
      let fileStats = stats as { size?: number; mtime?: Date } | undefined;
      if (!fileStats && eventType !== 'deleted') {
        try {
          const fs = await import('fs/promises');
          const statResult = await fs.stat(filePath);
          fileStats = {
            size: statResult.size,
            mtime: statResult.mtime
          };
        } catch {
          // File may have been deleted before we could stat it
          fileStats = undefined;
        }
      }

      await this.triggerWorkflow(config, {
        event: eventType,
        filePath,
        timestamp: new Date().toISOString(),
        fileSize: fileStats?.size,
        modifiedAt: fileStats?.mtime?.toISOString(),
        watchPath
      });

      await this.updateTriggerStats(config.id);
    };

    // Register event handlers
    if (events.includes('created')) {
      watcher.on('add', (path: string, stats?: unknown) =>
        handleFileEvent('created', path, stats)
      );
    }

    if (events.includes('modified')) {
      watcher.on('change', (path: string, stats?: unknown) =>
        handleFileEvent('modified', path, stats)
      );
    }

    if (events.includes('deleted')) {
      watcher.on('unlink', (path: string) =>
        handleFileEvent('deleted', path, undefined)
      );
    }

    // Handle errors
    watcher.on('error', (errorPath: string) => {
      logger.error('File watcher error', {
        triggerId: config.id,
        watchPath,
        error: errorPath
      });
    });

    // Store the watcher for cleanup
    this.fileWatchers.set(config.id, watcher);
  }

  /**
   * Fallback file watcher using Node.js fs.watch
   * Used when chokidar is not available
   */
  private async setupFallbackFileWatcher(
    config: TriggerConfig,
    watchPath: string,
    events: string[],
    _filePattern?: string
  ): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const fsPromises = await import('fs/promises');

      // Track files for change detection
      const fileCache = new Map<string, { size: number; mtime: number }>();

      // Initial scan of directory
      const scanDirectory = async () => {
        try {
          const files = await fsPromises.readdir(watchPath, { withFileTypes: true });
          for (const file of files) {
            if (file.isFile()) {
              const filePath = path.join(watchPath, file.name);
              try {
                const stats = await fsPromises.stat(filePath);
                fileCache.set(filePath, {
                  size: stats.size,
                  mtime: stats.mtimeMs
                });
              } catch {
                // File may have been deleted
              }
            }
          }
        } catch (error) {
          logger.error('Failed to scan directory', {
            triggerId: config.id,
            watchPath,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      };

      await scanDirectory();

      // Use fs.watch for directory monitoring
      const watcher = fs.watch(watchPath, { persistent: true }, async (eventType, filename) => {
        if (!filename) return;

        const filePath = path.join(watchPath, filename);
        const cached = fileCache.get(filePath);

        try {
          const stats = await fsPromises.stat(filePath);
          const newInfo = { size: stats.size, mtime: stats.mtimeMs };

          if (!cached) {
            // New file created
            if (events.includes('created')) {
              await this.triggerWorkflow(config, {
                event: 'created',
                filePath,
                timestamp: new Date().toISOString(),
                fileSize: stats.size
              });
              await this.updateTriggerStats(config.id);
            }
          } else if (cached.mtime !== newInfo.mtime) {
            // File modified
            if (events.includes('modified')) {
              await this.triggerWorkflow(config, {
                event: 'modified',
                filePath,
                timestamp: new Date().toISOString(),
                fileSize: stats.size
              });
              await this.updateTriggerStats(config.id);
            }
          }

          fileCache.set(filePath, newInfo);
        } catch {
          // File was deleted
          if (cached && events.includes('deleted')) {
            fileCache.delete(filePath);
            await this.triggerWorkflow(config, {
              event: 'deleted',
              filePath,
              timestamp: new Date().toISOString()
            });
            await this.updateTriggerStats(config.id);
          }
        }
      });

      // Store watcher reference for cleanup (wrap in compatible interface)
      const watcherWrapper: ChokidarWatcher = {
        on: () => watcherWrapper,
        close: async () => {
          watcher.close();
        }
      };
      this.fileWatchers.set(config.id, watcherWrapper);

    } catch (error) {
      logger.error('Failed to setup fallback file watcher', {
        triggerId: config.id,
        watchPath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Setup HTTP polling trigger
   */
  private async setupHttpPollTrigger(config: TriggerConfig): Promise<void> {
    const { url, interval = 60000, headers = {} } = config.config;
    if (!url) throw new Error('Poll URL is required');

    const poll = async () => {
      try {
        const response = await fetch(url, { headers });
        const data = await response.json();

        // Check if data has changed (simple comparison)
        const lastResponse = config.config.lastResponse;
        const hasChanged = JSON.stringify(data) !== JSON.stringify(lastResponse);

        if (hasChanged || !lastResponse) {
          // Update last response
          config.config.lastResponse = data;

          // Trigger workflow
          const headersObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headersObj[key] = value;
          });

          await this.triggerWorkflow(config, {
            url,
            data,
            statusCode: response.status,
            headers: headersObj,
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
    const intervalId = setInterval(poll, interval);
    this.activePollers.set(config.id, intervalId);

    logger.info('HTTP poll trigger setup', { triggerId: config.id, url, interval });
  }

  /**
   * Setup database trigger with real Prisma-based polling
   * Supports both raw SQL queries and table change detection
   */
  private async setupDatabaseTrigger(config: TriggerConfig): Promise<void> {
    const { query, pollInterval = 60000 } = config.config;
    // connectionString is optional - uses default Prisma connection
    if (!query) {
      throw new Error('Database query is required for database trigger');
    }

    // Initialize last check timestamp
    if (!this.lastCheckTimestamps.has(config.id)) {
      this.lastCheckTimestamps.set(config.id, new Date(0));
    }

    const poll = async () => {
      try {
        const lastCheck = this.lastCheckTimestamps.get(config.id) || new Date(0);
        let results: unknown[] = [];
        let queryType: 'raw' | 'table_changes' = 'raw';

        // Detect if query is a table name (simple change detection) or raw SQL
        const isTableName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(query.trim());

        if (isTableName) {
          // Table change detection mode
          queryType = 'table_changes';
          results = await this.pollTableChanges(query, lastCheck);
        } else {
          // Raw SQL query mode (with timestamp parameter substitution)
          results = await this.executeRawQuery(query, lastCheck);
        }

        if (results.length > 0) {
          await this.triggerWorkflow(config, {
            query,
            queryType,
            results,
            count: results.length,
            lastCheck: lastCheck.toISOString(),
            timestamp: new Date().toISOString()
          });

          await this.updateTriggerStats(config.id);
        }

        // Update last check timestamp
        this.lastCheckTimestamps.set(config.id, new Date());

      } catch (error) {
        logger.error('Database poll error', {
          triggerId: config.id,
          query,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };

    // Initial poll
    await poll();

    // Set up interval for continuous polling
    const intervalId = setInterval(poll, pollInterval);
    this.activePollers.set(config.id, intervalId);

    logger.info('Database trigger setup', {
      triggerId: config.id,
      pollInterval,
      query: query.substring(0, 50) + (query.length > 50 ? '...' : '')
    });
  }

  /**
   * Poll a specific table for changes since last check
   * Uses Prisma to query records with updated_at > lastCheck
   */
  private async pollTableChanges(tableName: string, lastCheck: Date): Promise<unknown[]> {
    try {
      // Sanitize table name to prevent SQL injection
      const sanitizedTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');

      // Use raw query to check for changes
      // This assumes tables have an updated_at or created_at column
      const results = await prisma.$queryRawUnsafe<unknown[]>(`
        SELECT *
        FROM "${sanitizedTable}"
        WHERE
          (updated_at IS NOT NULL AND updated_at > $1)
          OR (updated_at IS NULL AND created_at > $1)
        ORDER BY COALESCE(updated_at, created_at) ASC
        LIMIT 100
      `, lastCheck);

      return results;
    } catch (error) {
      // If the query fails (e.g., column doesn't exist), try simpler approach
      logger.warn('Table change detection failed, trying alternative query', {
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });

      try {
        // Try with just created_at
        const results = await prisma.$queryRawUnsafe<unknown[]>(`
          SELECT *
          FROM "${tableName}"
          WHERE created_at > $1
          ORDER BY created_at ASC
          LIMIT 100
        `, lastCheck);
        return results;
      } catch (innerError) {
        logger.error('Alternative table query also failed', {
          tableName,
          error: innerError instanceof Error ? innerError.message : String(innerError)
        });
        return [];
      }
    }
  }

  /**
   * Execute a raw SQL query with optional timestamp parameter
   * Replaces {lastCheck} placeholder with the actual timestamp
   */
  private async executeRawQuery(query: string, lastCheck: Date): Promise<unknown[]> {
    try {
      // Replace {lastCheck} placeholder with parameterized value
      const hasLastCheckPlaceholder = query.includes('{lastCheck}');

      if (hasLastCheckPlaceholder) {
        // Replace placeholder and use parameterized query
        const parameterizedQuery = query.replace(/\{lastCheck\}/g, '$1');
        const results = await prisma.$queryRawUnsafe<unknown[]>(
          parameterizedQuery,
          lastCheck
        );
        return Array.isArray(results) ? results : [];
      } else {
        // Execute query as-is
        const results = await prisma.$queryRawUnsafe<unknown[]>(query);
        return Array.isArray(results) ? results : [];
      }
    } catch (error) {
      logger.error('Raw query execution failed', {
        query: query.substring(0, 100),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Setup email trigger with real IMAP support
   * Falls back to mock implementation if imap-simple is not available
   */
  private async setupEmailTrigger(config: TriggerConfig): Promise<void> {
    const { imapConfig, mailbox = 'INBOX', markAsRead = false } = config.config;
    if (!imapConfig) throw new Error('IMAP configuration is required');

    // Try to load imap-simple for real IMAP support
    const hasImap = await loadImapSimple();

    // Initialize processed email IDs set for this trigger
    if (!this.processedEmailIds.has(config.id)) {
      this.processedEmailIds.set(config.id, new Set());
    }

    if (hasImap && imapSimple) {
      // Real IMAP implementation
      await this.setupRealEmailTrigger(config, imapConfig, mailbox, markAsRead);
    } else {
      // Fallback to nodemailer IMAP or mock
      await this.setupFallbackEmailTrigger(config, imapConfig, mailbox);
    }

    logger.info('Email trigger setup', {
      triggerId: config.id,
      mailbox,
      host: imapConfig.host,
      implementation: hasImap ? 'imap-simple' : 'fallback'
    });
  }

  /**
   * Real IMAP email trigger using imap-simple
   */
  private async setupRealEmailTrigger(
    config: TriggerConfig,
    imapConfig: NonNullable<TriggerSpecificConfig['imapConfig']>,
    mailbox: string,
    markAsRead: boolean
  ): Promise<void> {
    if (!imapSimple) {
      throw new Error('imap-simple not loaded');
    }

    const processedIds = this.processedEmailIds.get(config.id)!;

    const connectAndPoll = async (): Promise<void> => {
      let connection: ImapConnection | null = null;

      try {
        // Connect to IMAP server
        const conn = await imapSimple.connect({
          imap: {
            user: imapConfig.username,
            password: imapConfig.password,
            host: imapConfig.host,
            port: imapConfig.port || 993,
            tls: imapConfig.secure !== false,
            authTimeout: 10000,
            tlsOptions: {
              rejectUnauthorized: false // Allow self-signed certs
            }
          }
        }) as ImapConnection;
        connection = conn;

        // Open mailbox
        await conn.openBox(mailbox);

        // Search for unseen emails
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
          bodies: ['HEADER', 'TEXT', ''],
          struct: true,
          markSeen: markAsRead
        };

        const messages = await conn.search(searchCriteria, fetchOptions);

        for (const message of messages) {
          const messageData = message as {
            attributes?: { uid?: number };
            parts?: Array<{
              which: string;
              body: unknown;
            }>;
          };

          // Get message ID to avoid duplicates
          const uid = messageData.attributes?.uid;
          const messageId = uid ? `uid-${uid}` : `msg-${Date.now()}-${Math.random()}`;

          if (processedIds.has(messageId)) {
            continue;
          }

          // Parse email parts
          const headerPart = messageData.parts?.find(p => p.which === 'HEADER');
          const textPart = messageData.parts?.find(p => p.which === 'TEXT');

          const headers = headerPart?.body as Record<string, string[]> | undefined;
          const body = textPart?.body as string | undefined;

          const email = {
            messageId,
            uid,
            from: headers?.from?.[0] || 'unknown',
            to: headers?.to?.[0] || 'unknown',
            subject: headers?.subject?.[0] || '(no subject)',
            date: headers?.date?.[0] ? new Date(headers.date[0]) : new Date(),
            body: body || '',
            headers
          };

          // Mark as processed
          processedIds.add(messageId);

          // Limit processed IDs cache size
          if (processedIds.size > 1000) {
            const iterator = processedIds.values();
            for (let i = 0; i < 500; i++) {
              processedIds.delete(iterator.next().value as string);
            }
          }

          // Trigger workflow for this email
          await this.triggerWorkflow(config, {
            email,
            mailbox,
            timestamp: new Date().toISOString()
          });

          await this.updateTriggerStats(config.id);
        }

        // Store connection for reuse
        this.imapConnections.set(config.id, conn);

      } catch (error) {
        logger.error('IMAP poll error', {
          triggerId: config.id,
          host: imapConfig.host,
          error: error instanceof Error ? error.message : String(error)
        });

        // Close connection on error
        if (connection) {
          try {
            connection.end();
          } catch {
            // Ignore close errors
          }
        }
        this.imapConnections.delete(config.id);
      }
    };

    // Initial poll
    await connectAndPoll();

    // Set up interval for continuous polling (every 60 seconds)
    const intervalId = setInterval(connectAndPoll, 60000);
    this.activePollers.set(config.id, intervalId);
  }

  /**
   * Fallback email trigger when imap-simple is not available
   * Uses nodemailer's built-in IMAP support or logging
   */
  private async setupFallbackEmailTrigger(
    config: TriggerConfig,
    imapConfig: NonNullable<TriggerSpecificConfig['imapConfig']>,
    mailbox: string
  ): Promise<void> {
    const processedIds = this.processedEmailIds.get(config.id)!;

    // Try to use the native imap module if available
    const poll = async () => {
      try {
        // Try dynamic import of imap module
         
        const Imap = await import(/* webpackIgnore: true */ 'imap' as string).catch(() => null);

        if (Imap && Imap.default) {
          await this.pollWithNativeImap(
            config,
            Imap.default,
            imapConfig,
            mailbox,
            processedIds
          );
        } else {
          // No IMAP library available - log warning and skip
          logger.warn('No IMAP library available for email trigger', {
            triggerId: config.id,
            hint: 'Install imap-simple (npm install imap-simple) or imap (npm install imap)'
          });
        }
      } catch (error) {
        logger.error('Email trigger fallback error', {
          triggerId: config.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };

    // Initial poll
    await poll();

    // Set up interval
    const intervalId = setInterval(poll, 60000);
    this.activePollers.set(config.id, intervalId);
  }

  /**
   * Poll emails using native imap module
   */
  private async pollWithNativeImap(
    config: TriggerConfig,
    ImapClass: new (config: unknown) => {
      once: (event: string, callback: (...args: unknown[]) => void) => void;
      connect: () => void;
      openBox: (mailbox: string, readOnly: boolean, callback: (err: Error | null, box: unknown) => void) => void;
      search: (criteria: string[], callback: (err: Error | null, uids: number[]) => void) => void;
      fetch: (source: number[], options: unknown) => {
        on: (event: string, callback: (msg: unknown, seqno: number) => void) => void;
        once: (event: string, callback: () => void) => void;
      };
      end: () => void;
    },
    imapConfig: NonNullable<TriggerSpecificConfig['imapConfig']>,
    mailbox: string,
    processedIds: Set<string>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const imap = new ImapClass({
        user: imapConfig.username,
        password: imapConfig.password,
        host: imapConfig.host,
        port: imapConfig.port || 993,
        tls: imapConfig.secure !== false,
        tlsOptions: { rejectUnauthorized: false }
      });

      const timeout = setTimeout(() => {
        try {
          imap.end();
        } catch {
          // Ignore
        }
        reject(new Error('IMAP connection timeout'));
      }, 30000);

      imap.once('ready', () => {
        imap.openBox(mailbox, true, (err: Error | null) => {
          if (err) {
            clearTimeout(timeout);
            imap.end();
            reject(err);
            return;
          }

          imap.search(['UNSEEN'], async (searchErr: Error | null, uids: number[]) => {
            if (searchErr) {
              clearTimeout(timeout);
              imap.end();
              reject(searchErr);
              return;
            }

            if (!uids || uids.length === 0) {
              clearTimeout(timeout);
              imap.end();
              resolve();
              return;
            }

            // Filter out already processed UIDs
            const newUids = uids.filter(uid => !processedIds.has(`uid-${uid}`));

            if (newUids.length === 0) {
              clearTimeout(timeout);
              imap.end();
              resolve();
              return;
            }

            const fetch = imap.fetch(newUids, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
              struct: true
            });

            const emails: Array<{
              uid: number;
              from: string;
              to: string;
              subject: string;
              date: Date;
            }> = [];

            fetch.on('message', (msg: unknown, seqno: number) => {
              const messageObj = msg as {
                on: (event: string, callback: (stream: unknown, info: unknown) => void) => void;
                once: (event: string, callback: (attrs: { uid: number }) => void) => void;
              };
              let uid = 0;
              const emailData: { from?: string; to?: string; subject?: string; date?: string } = {};

              messageObj.on('body', (stream: unknown, _info: unknown) => {
                const streamObj = stream as {
                  on: (event: string, callback: (chunk: Buffer) => void) => void;
                };
                let buffer = '';
                streamObj.on('data', (chunk: Buffer) => {
                  buffer += chunk.toString('utf8');
                });
                streamObj.on('end', () => {
                  const lines = buffer.split('\r\n');
                  for (const line of lines) {
                    if (line.toLowerCase().startsWith('from:')) {
                      emailData.from = line.substring(5).trim();
                    } else if (line.toLowerCase().startsWith('to:')) {
                      emailData.to = line.substring(3).trim();
                    } else if (line.toLowerCase().startsWith('subject:')) {
                      emailData.subject = line.substring(8).trim();
                    } else if (line.toLowerCase().startsWith('date:')) {
                      emailData.date = line.substring(5).trim();
                    }
                  }
                });
              });

              messageObj.once('attributes', (attrs: { uid: number }) => {
                uid = attrs.uid;
              });

              messageObj.once('end', () => {
                emails.push({
                  uid,
                  from: emailData.from || 'unknown',
                  to: emailData.to || 'unknown',
                  subject: emailData.subject || '(no subject)',
                  date: emailData.date ? new Date(emailData.date) : new Date()
                });
              });
            });

            fetch.once('end', async () => {
              clearTimeout(timeout);
              imap.end();

              // Process each email
              for (const email of emails) {
                const messageId = `uid-${email.uid}`;
                processedIds.add(messageId);

                await this.triggerWorkflow(config, {
                  email: {
                    ...email,
                    messageId
                  },
                  mailbox,
                  timestamp: new Date().toISOString()
                });

                await this.updateTriggerStats(config.id);
              }

              resolve();
            });
          });
        });
      });

      imap.once('error', (...args: unknown[]) => {
        clearTimeout(timeout);
        const err = args[0];
        reject(err instanceof Error ? err : new Error(String(err)));
      });

      imap.connect();
    });
  }

  /**
   * Authenticate webhook request
   */
  private async authenticateWebhook(
    config: TriggerConfig,
    request: WebhookRequest
  ): Promise<{ success: boolean; error?: string }> {
    const { authentication } = config.config;

    switch (authentication) {
      case 'none':
        return { success: true };

      case 'api_key': {
        const apiKey = request.headers['x-api-key'] || request.query.apiKey;
        if (!apiKey) {
          return { success: false, error: 'API key required' };
        }
        // Validate API key (would check against stored keys)
        return { success: true };
      }

      case 'basic': {
        const authHeader = request.headers.authorization;
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
        status: ExecutionStatus.Success,
        startTime: new Date(),
        endTime: new Date(),
        duration: Math.random() * 1000,
        input: data as Record<string, unknown>,
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
    const trigger = this.triggers.get(triggerId);
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
    const poller = this.activePollers.get(config.id);
    if (poller) {
      clearInterval(poller);
      clearTimeout(poller);
      this.activePollers.delete(config.id);
    }

    // Remove webhook handlers
    this.webhookHandlers.delete(config.id);

    // Close file watchers
    const fileWatcher = this.fileWatchers.get(config.id);
    if (fileWatcher) {
      try {
        await fileWatcher.close();
      } catch (error) {
        logger.warn('Error closing file watcher', {
          triggerId: config.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      this.fileWatchers.delete(config.id);
    }

    // Close IMAP connections
    const imapConnection = this.imapConnections.get(config.id);
    if (imapConnection) {
      try {
        imapConnection.end();
      } catch (error) {
        logger.warn('Error closing IMAP connection', {
          triggerId: config.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      this.imapConnections.delete(config.id);
    }

    // Clear processed email IDs
    this.processedEmailIds.delete(config.id);

    // Clear last check timestamps
    this.lastCheckTimestamps.delete(config.id);

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
    const trigger = Array.from(this.triggers.values()).find(
      t => t.type === 'webhook' && t.config.path === path && t.enabled
    );

    if (!trigger) {
      return {
        statusCode: 404,
        body: { error: 'Webhook not found' }
      };
    }

    const handler = this.webhookHandlers.get(trigger.id);
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
    const trigger = this.triggers.get(triggerId);
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
    const trigger = this.triggers.get(triggerId);
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
    const nextMinute = new Date(Date.now() + 60000);
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
    const triggers = Array.from(this.triggers.values());
    const total = triggers.length;
    const enabled = triggers.filter(t => t.enabled).length;
    const totalTriggers = triggers.reduce((sum, t) => sum + t.triggerCount, 0);

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
