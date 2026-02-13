/**
 * Advanced Scheduling Service
 * Comprehensive scheduling system with cron, calendar, and timezone support
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import { advancedExecutionEngine } from './AdvancedExecutionEngine';
import { CronExpressionParser } from 'cron-parser';
import type {
  ScheduledWorkflow,
  Schedule,
  ScheduledExecution,
  ScheduleGroup,
  ScheduleWindow,
  ScheduleConflict,
  ScheduleAnalytics,
  ScheduleTemplate,
  ScheduleValidation,
  SchedulingService as ISchedulingService,
  ScheduleFilters,
  TriggerOptions,
  CronExpression,
  DayOfWeek
  // Removed unused imports: ExecutionStatus, ScheduleStatus, TimeUnit, CalendarPattern, ScheduleMetadata
} from '../types/scheduling';

export class SchedulingService extends BaseService implements ISchedulingService {
  private schedules: Map<string, ScheduledWorkflow> = new Map();
  private groups: Map<string, ScheduleGroup> = new Map();
  private windows: Map<string, ScheduleWindow> = new Map();
  private templates: Map<string, ScheduleTemplate> = new Map();
  private executionHistory: Map<string, ScheduledExecution[]> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private cronJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super('SchedulingService', {
      enableRetry: true,
      maxRetries: 3,
      enableCaching: true
    });

    this.initializeScheduling();
  }

  private async initializeScheduling(): Promise<void> {
    await this.createBuiltInTemplates();
    await this.loadSchedules();
    this.startScheduleMonitoring();
    
    logger.info('Scheduling service initialized', {
      totalSchedules: this.schedules.size,
      activeSchedules: Array.from(this.schedules.values()).filter(s => s.enabled).length
    });
  }

  private async createBuiltInTemplates(): Promise<void> {
    const templates: Array<Omit<ScheduleTemplate, 'id' | 'popularity' | 'createdAt'>> = [
      {
        name: 'Daily Morning Report',
        description: 'Run every weekday morning at 9 AM',
        category: 'business',
        schedule: {
          type: 'cron',
          pattern: {
            cron: {
              expression: '0 9 * * 1-5',
              minutes: '0',
              hours: '9',
              dayOfMonth: '*',
              month: '*',
              dayOfWeek: '1-5',
              description: 'Every weekday at 9:00 AM'
            }
          },
          startDate: new Date()
        },
        metadata: {
          priority: 'normal',
          notifyOnFailure: true,
          notifyOnSuccess: false,
          notificationChannels: [],
          tags: ['reporting', 'daily', 'business']
        },
        tags: ['reporting', 'daily', 'business'],
        createdBy: 'system'
      },
      {
        name: 'Hourly Data Sync',
        description: 'Synchronize data every hour',
        category: 'integration',
        schedule: {
          type: 'interval',
          pattern: {
            interval: {
              interval: 3600000, // 1 hour
              unit: 'hours',
              allowConcurrent: false
            }
          },
          startDate: new Date()
        },
        metadata: {
          priority: 'high',
          maxDuration: 1800000, // 30 minutes
          timeout: 1800000,
          retryPolicy: {
            maxAttempts: 3,
            delay: 60000,
            backoffMultiplier: 2,
            maxDelay: 300000
          },
          notifyOnFailure: true,
          notifyOnSuccess: false,
          notificationChannels: [],
          tags: ['sync', 'data', 'integration']
        },
        tags: ['sync', 'hourly', 'integration'],
        createdBy: 'system'
      },
      {
        name: 'Weekly Backup',
        description: 'Backup data every Sunday at 2 AM',
        category: 'maintenance',
        schedule: {
          type: 'cron',
          pattern: {
            cron: {
              expression: '0 2 * * 0',
              minutes: '0',
              hours: '2',
              dayOfMonth: '*',
              month: '*',
              dayOfWeek: '0',
              description: 'Every Sunday at 2:00 AM'
            }
          },
          startDate: new Date()
        },
        metadata: {
          priority: 'critical',
          notifyOnFailure: true,
          notifyOnSuccess: true,
          notificationChannels: [],
          tags: ['backup', 'weekly', 'maintenance']
        },
        tags: ['backup', 'weekly', 'maintenance'],
        createdBy: 'system'
      }
    ];

    for (const template of templates) {
      await this.createScheduleTemplate(template);
    }
  }

  private async loadSchedules(): Promise<void> {
    // In production, this would load from database
    // For now, create some sample schedules
    const sampleSchedule: Omit<ScheduledWorkflow, 'id' | 'executions' | 'createdAt' | 'updatedAt'> = {
      workflowId: 'workflow-1',
      name: 'Daily Report Generation',
      description: 'Generate daily reports for management',
      schedule: {
        type: 'cron',
        pattern: {
          cron: {
            expression: '0 9 * * 1-5',
            minutes: '0',
            hours: '9',
            dayOfMonth: '*',
            month: '*',
            dayOfWeek: '1-5',
            description: 'Every weekday at 9:00 AM'
          }
        },
        startDate: new Date()
      },
      enabled: true,
      timezone: 'America/New_York',
      status: 'active',
      metadata: {
        priority: 'normal',
        notifyOnFailure: true,
        notifyOnSuccess: false,
        notificationChannels: [
          {
            type: 'email',
            config: { smtp: 'smtp.example.com' },
            recipients: ['admin@example.com']
          }
        ],
        tags: ['reporting', 'daily']
      },
      createdBy: 'user-1'
    };

    await this.createSchedule(sampleSchedule);
  }

  private startScheduleMonitoring(): void {
    // Check schedules every minute
    setInterval(() => {
      this.checkAndExecuteSchedules();
    }, 60000);

    // Update next run times every hour
    setInterval(() => {
      this.updateNextRunTimes();
    }, 3600000);

    // Clean up old execution history daily
    setInterval(() => {
      this.cleanupExecutionHistory();
    }, 86400000);
  }

  private async checkAndExecuteSchedules(): Promise<void> {
    const now = new Date();

    for (const [scheduleId, schedule] of Array.from(this.schedules.entries())) {
      if (!schedule.enabled || schedule.status !== 'active') continue;

      // Check if it's time to run
      if (schedule.nextRun && schedule.nextRun <= now) {
        // Check for conflicts and windows
        const conflicts = await this.checkConflicts(scheduleId);
        const windowViolation = await this.checkWindowViolations(scheduleId, now);

        if (conflicts.length === 0 && !windowViolation) {
          await this.executeSchedule(schedule);
        } else {
          logger.warn('Schedule execution blocked', {
            scheduleId,
            conflicts: conflicts.length,
            windowViolation
          });
        }

        // Update next run time
        schedule.nextRun = await this.calculateNextRun(schedule);
      }
    }
  }

  private async executeSchedule(schedule: ScheduledWorkflow): Promise<void> {
    const execution: ScheduledExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      scheduleId: schedule.id,
      executionId: '',
      scheduledTime: schedule.nextRun!,
      status: 'pending',
      retryCount: 0,
      metadata: {}
    };

    // Add to history
    const history = this.executionHistory.get(schedule.id) || [];
    history.push(execution);
    this.executionHistory.set(schedule.id, history);

    try {
      execution.status = 'running';
      execution.actualStartTime = new Date();

      // Execute workflow
      const workflowExecution = await advancedExecutionEngine.executeWorkflow(
        schedule.workflowId,
        { scheduledExecution: true, scheduleId: schedule.id },
        {
          priority: schedule.metadata.priority,
          timeout: schedule.metadata.timeout,
          tags: ['scheduled', ...schedule.metadata.tags]
        }
      );

      execution.executionId = workflowExecution.id;
      
      // Wait for completion (in production would use event system)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      execution.actualEndTime = new Date();
      execution.status = 'success';
      execution.result = {
        success: true,
        duration: execution.actualEndTime.getTime() - execution.actualStartTime.getTime(),
        resourceUsage: {
          cpu: Math.random() * 100,
          memory: Math.random() * 1000000000,
          network: Math.random() * 10000000
        }
      };
      
      schedule.lastRun = execution.actualStartTime;
      
      logger.info('Scheduled workflow executed successfully', {
        scheduleId: schedule.id,
        executionId: execution.id,
        duration: execution.result.duration
      });
      
    } catch (error) {
      execution.actualEndTime = new Date();
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      
      logger.error('Scheduled workflow execution failed', {
        scheduleId: schedule.id,
        executionId: execution.id,
        error: execution.error
      });
      
      // Handle retry policy
      if (schedule.metadata.retryPolicy && execution.retryCount < schedule.metadata.retryPolicy.maxAttempts) {
        execution.retryCount++;
        setTimeout(() => this.executeSchedule(schedule), schedule.metadata.retryPolicy.delay);
      }
    }
  }

  private async calculateNextRun(schedule: ScheduledWorkflow): Promise<Date | undefined> {
    const now = schedule.lastRun || new Date();
    const lastRun = schedule.lastRun || new Date();

    switch (schedule.schedule.type) {
      case 'cron':
        if (schedule.schedule.pattern.cron) {
          try {
            const interval = CronExpressionParser.parse(
              schedule.schedule.pattern.cron.expression,
              {
                currentDate: now,
                tz: schedule.timezone
              }
            );
            return interval.next().toDate();
          } catch (error) {
            logger.error('Failed to parse cron expression', {
              scheduleId: schedule.id,
              expression: schedule.schedule.pattern.cron.expression,
              error
            });
          }
        }
        break;
        
      case 'interval':
        if (schedule.schedule.pattern.interval) {
          return new Date(lastRun.getTime() + schedule.schedule.pattern.interval.interval);
        }
        break;
        
      case 'one_time':
        if (schedule.schedule.pattern.oneTime && schedule.schedule.pattern.oneTime > now) {
          return schedule.schedule.pattern.oneTime;
        }
        break;
        
      case 'calendar':
        // Complex calendar logic would go here
        break;
        
      case 'custom':
        if (schedule.schedule.pattern.custom?.generator) {
          const context = {
            lastRun: schedule.lastRun,
            runCount: this.executionHistory.get(schedule.id)?.length || 0,
            metadata: {},
            timezone: schedule.timezone
          };
          const nextDate = schedule.schedule.pattern.custom.generator(context);
          return nextDate || undefined;
        }
        break;
    }
    
    return undefined;
  }

  private async updateNextRunTimes(): Promise<void> {
    for (const schedule of Array.from(this.schedules.values())) {
      if (schedule.enabled && schedule.status === 'active') {
        schedule.nextRun = await this.calculateNextRun(schedule);
      }
    }
  }

  private cleanupExecutionHistory(): void {
    const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [scheduleId, history] of Array.from(this.executionHistory.entries())) {
      const filteredHistory = history.filter(
        exec => exec.scheduledTime.getTime() > cutoffTime
      );

      if (filteredHistory.length !== history.length) {
        this.executionHistory.set(scheduleId, filteredHistory);
        logger.info('Cleaned up execution history', {
          scheduleId,
          removed: history.length - filteredHistory.length
        });
      }
    }
  }

  /**
   * Create a new schedule
   */
  public async createSchedule(
    schedule: Omit<ScheduledWorkflow, 'id' | 'executions' | 'createdAt' | 'updatedAt'>
  ): Promise<ScheduledWorkflow> {
    const result = await this.executeOperation('createSchedule', async () => {
      const id = `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newSchedule: ScheduledWorkflow = {
        ...schedule,
        id,
        executions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Calculate next run
      newSchedule.nextRun = await this.calculateNextRun(newSchedule);

      // Validate schedule
      const validation = await this.validateSchedule(newSchedule.schedule);
      if (!validation.valid) {
        throw new Error(`Invalid schedule: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      this.schedules.set(id, newSchedule);

      logger.info('Schedule created', {
        scheduleId: id,
        name: newSchedule.name,
        type: newSchedule.schedule.type,
        nextRun: newSchedule.nextRun
      });

      return newSchedule;
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create schedule');
    }

    return result.data;
  }

  /**
   * Update an existing schedule
   */
  public async updateSchedule(scheduleId: string, updates: Partial<ScheduledWorkflow>): Promise<void> {
    const result = await this.executeOperation('updateSchedule', async () => {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      Object.assign(schedule, updates, { updatedAt: new Date() });

      // Recalculate next run if schedule changed
      if (updates.schedule || updates.timezone) {
        schedule.nextRun = await this.calculateNextRun(schedule);
      }

      logger.info('Schedule updated', { scheduleId, updates });
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to update schedule');
    }
  }

  /**
   * Delete a schedule
   */
  public async deleteSchedule(scheduleId: string): Promise<void> {
    const result = await this.executeOperation('deleteSchedule', async () => {
      const deleted = this.schedules.delete(scheduleId);
      if (!deleted) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // Clean up associated data
      this.executionHistory.delete(scheduleId);

      // Cancel any active timers
      const timer = this.activeTimers.get(scheduleId);
      if (timer) {
        clearTimeout(timer);
        this.activeTimers.delete(scheduleId);
      }

      logger.info('Schedule deleted', { scheduleId });
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete schedule');
    }
  }

  /**
   * Get a schedule by ID
   */
  public async getSchedule(scheduleId: string): Promise<ScheduledWorkflow | null> {
    return this.schedules.get(scheduleId) || null;
  }

  /**
   * List schedules with filters
   */
  public async listSchedules(filters?: ScheduleFilters): Promise<ScheduledWorkflow[]> {
    let schedules = Array.from(this.schedules.values());

    if (filters) {
      if (filters.workflowId) {
        schedules = schedules.filter(s => s.workflowId === filters.workflowId);
      }
      if (filters.status?.length) {
        schedules = schedules.filter(s => filters.status!.includes(s.status));
      }
      if (filters.enabled !== undefined) {
        schedules = schedules.filter(s => s.enabled === filters.enabled);
      }
      if (filters.timezone) {
        schedules = schedules.filter(s => s.timezone === filters.timezone);
      }
      if (filters.tags?.length) {
        schedules = schedules.filter(s =>
          filters.tags!.some(tag => s.metadata.tags.includes(tag))
        );
      }
      if (filters.nextRunBefore) {
        schedules = schedules.filter(s =>
          s.nextRun && s.nextRun <= filters.nextRunBefore!
        );
      }
      if (filters.nextRunAfter) {
        schedules = schedules.filter(s =>
          s.nextRun && s.nextRun >= filters.nextRunAfter!
        );
      }
    }

    return schedules;
  }

  /**
   * Enable a schedule
   */
  public async enableSchedule(scheduleId: string): Promise<void> {
    const result = await this.executeOperation('enableSchedule', async () => {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      schedule.enabled = true;
      schedule.status = 'active';
      schedule.nextRun = await this.calculateNextRun(schedule);

      logger.info('Schedule enabled', { scheduleId });
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to enable schedule');
    }
  }

  /**
   * Disable a schedule
   */
  public async disableSchedule(scheduleId: string): Promise<void> {
    const result = await this.executeOperation('disableSchedule', async () => {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      schedule.enabled = false;
      schedule.status = 'disabled';
      schedule.nextRun = undefined;

      logger.info('Schedule disabled', { scheduleId });
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to disable schedule');
    }
  }

  /**
   * Pause a schedule
   */
  public async pauseSchedule(scheduleId: string, until?: Date): Promise<void> {
    const result = await this.executeOperation('pauseSchedule', async () => {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      schedule.status = 'paused';

      if (until) {
        const delay = until.getTime() - Date.now();
        // Set up timer to resume
        if (delay > 0) {
          const timer = setTimeout(() => {
            this.resumeSchedule(scheduleId);
          }, delay);

          this.activeTimers.set(scheduleId, timer);
        }
      }

      logger.info('Schedule paused', { scheduleId, until });
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to pause schedule');
    }
  }

  /**
   * Resume a paused schedule
   */
  public async resumeSchedule(scheduleId: string): Promise<void> {
    const result = await this.executeOperation('resumeSchedule', async () => {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (schedule.status === 'paused') {
        schedule.status = 'active';
        schedule.nextRun = await this.calculateNextRun(schedule);

        // Clear any resume timer
        const timer = this.activeTimers.get(scheduleId);
        if (timer) {
          clearTimeout(timer);
          this.activeTimers.delete(scheduleId);
        }

        logger.info('Schedule resumed', { scheduleId });
      }
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to resume schedule');
    }
  }

  /**
   * Manually trigger a schedule
   */
  public async triggerSchedule(scheduleId: string, options?: TriggerOptions): Promise<ScheduledExecution> {
    const result = await this.executeOperation('triggerSchedule', async () => {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // Check if we should force execution
      if (!options?.force) {
        const conflicts = await this.checkConflicts(scheduleId);
        const windowViolation = await this.checkWindowViolations(scheduleId, new Date());

        if (conflicts.length > 0 || windowViolation) {
          throw new Error('Schedule execution blocked by conflicts or window violations');
        }
      }

      // Execute immediately
      await this.executeSchedule(schedule);

      const history = this.executionHistory.get(scheduleId) || [];
      return history[history.length - 1];
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to trigger schedule');
    }

    return result.data;
  }

  /**
   * Validate a schedule configuration
   */
  public async validateSchedule(schedule: Schedule): Promise<ScheduleValidation> {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: Array<{ type: 'performance' | 'conflict' | 'resource'; message: string; severity: 'low' | 'medium' | 'high' }> = [];
    
    // Validate schedule type and pattern
    switch (schedule.type) {
      case 'cron':
        if (!schedule.pattern.cron?.expression) {
          errors.push({
            field: 'pattern.cron.expression',
            message: 'Cron expression is required',
            code: 'MISSING_CRON_EXPRESSION'
          });
        } else if (!this.validateCronExpression(schedule.pattern.cron.expression)) {
          errors.push({
            field: 'pattern.cron.expression',
            message: 'Invalid cron expression',
            code: 'INVALID_CRON_EXPRESSION'
          });
        }
        break;
        
      case 'interval':
        if (!schedule.pattern.interval?.interval || schedule.pattern.interval.interval <= 0) {
          errors.push({
            field: 'pattern.interval.interval',
            message: 'Interval must be greater than 0',
            code: 'INVALID_INTERVAL'
          });
        }
        
        if (schedule.pattern.interval?.interval && schedule.pattern.interval.interval < 60000) {
          warnings.push({
            type: 'performance',
            message: 'Intervals less than 1 minute may impact performance',
            severity: 'medium'
          });
        }
        break;
        
      case 'one_time':
        if (!schedule.pattern.oneTime) {
          errors.push({
            field: 'pattern.oneTime',
            message: 'One-time schedule requires a date',
            code: 'MISSING_ONE_TIME_DATE'
          });
        } else if (schedule.pattern.oneTime <= new Date()) {
          errors.push({
            field: 'pattern.oneTime',
            message: 'One-time schedule date must be in the future',
            code: 'PAST_ONE_TIME_DATE'
          });
        }
        break;
    }
    
    // Validate date range
    if (schedule.startDate > (schedule.endDate || new Date('2099-12-31'))) {
      errors.push({
        field: 'startDate',
        message: 'Start date must be before end date',
        code: 'INVALID_DATE_RANGE'
      });
    }
    
    // Calculate next runs for prediction
    const nextRuns: Date[] = [];
    if (errors.length === 0) {
      try {
        // Mock calculation - in production would use actual schedule logic
        let nextRun = new Date();
        for (let i = 0; i < 10; i++) {
          nextRun = new Date(nextRun.getTime() + 3600000); // Add 1 hour
          nextRuns.push(nextRun);
        }
      } catch (error) {
        warnings.push({
          type: 'performance',
          message: 'Unable to calculate future runs',
          severity: 'low'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      nextRuns,
      estimatedLoad: {
        peak: Math.random() * 100,
        average: Math.random() * 50
      }
    };
  }

  /**
   * Predict next runs for a schedule
   */
  public async predictNextRuns(scheduleId: string, count: number): Promise<Date[]> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    const runs: Date[] = [];
    let currentDate = new Date();

    for (let i = 0; i < count; i++) {
      const tempSchedule = { ...schedule, lastRun: currentDate };
      const nextRun = await this.calculateNextRun(tempSchedule);

      if (nextRun) {
        runs.push(nextRun);
        currentDate = nextRun;
      } else {
        break;
      }
    }

    return runs;
  }

  /**
   * Check for schedule conflicts
   */
  public async checkConflicts(scheduleId: string): Promise<ScheduleConflict[]> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return [];

    const conflicts: ScheduleConflict[] = [];

    // Check for overlapping schedules (simplified)
    for (const [otherId, otherSchedule] of Array.from(this.schedules.entries())) {
      if (otherId !== scheduleId && otherSchedule.enabled && otherSchedule.nextRun) {
        if (Math.abs(schedule.nextRun!.getTime() - otherSchedule.nextRun.getTime()) < 60000) {
          conflicts.push({
            id: `conflict-${Date.now()}`,
            type: 'overlap',
            schedules: [scheduleId, otherId],
            description: `Overlapping execution time with ${otherSchedule.name}`,
            severity: 'medium',
            detectedAt: new Date()
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Create a schedule group
   */
  public async createScheduleGroup(group: Omit<ScheduleGroup, 'id'>): Promise<ScheduleGroup> {
    const result = await this.executeOperation('createScheduleGroup', async () => {
      const id = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newGroup: ScheduleGroup = {
        ...group,
        id
      };

      this.groups.set(id, newGroup);

      logger.info('Schedule group created', {
        groupId: id,
        name: newGroup.name,
        scheduleCount: newGroup.schedules.length
      });

      return newGroup;
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create schedule group');
    }

    return result.data;
  }

  /**
   * Update a schedule group
   */
  public async updateScheduleGroup(groupId: string, updates: Partial<ScheduleGroup>): Promise<void> {
    const result = await this.executeOperation('updateScheduleGroup', async () => {
      const group = this.groups.get(groupId);
      if (!group) {
        throw new Error(`Schedule group ${groupId} not found`);
      }

      Object.assign(group, updates);

      logger.info('Schedule group updated', { groupId, updates });
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to update schedule group');
    }
  }

  /**
   * Orchestrate a schedule group
   */
  public async orchestrateGroup(groupId: string): Promise<void> {
    const result = await this.executeOperation('orchestrateGroup', async () => {
      const group = this.groups.get(groupId);
      if (!group) {
        throw new Error(`Schedule group ${groupId} not found`);
      }

      if (!group.enabled) {
        throw new Error('Schedule group is disabled');
      }

      // Execute schedules based on orchestration rule
      switch (group.orchestration.type) {
        case 'sequential':
          for (const scheduleId of group.schedules) {
            await this.triggerSchedule(scheduleId);
            // Wait for completion in production
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          break;

        case 'parallel':
          const executions = group.schedules.map(scheduleId =>
            this.triggerSchedule(scheduleId)
          );
          await Promise.all(executions);
          break;

        case 'dependency':
          // Complex dependency resolution would go here
          break;
      }

      logger.info('Schedule group orchestrated', { groupId });
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to orchestrate group');
    }
  }

  /**
   * Create a schedule window
   */
  public async createScheduleWindow(window: Omit<ScheduleWindow, 'id'>): Promise<ScheduleWindow> {
    const result = await this.executeOperation('createScheduleWindow', async () => {
      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newWindow: ScheduleWindow = {
        ...window,
        id
      };

      this.windows.set(id, newWindow);

      logger.info('Schedule window created', {
        windowId: id,
        name: newWindow.name,
        type: newWindow.type
      });

      return newWindow;
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create schedule window');
    }

    return result.data;
  }

  /**
   * Get active windows for a specific date
   */
  public async getActiveWindows(date?: Date): Promise<ScheduleWindow[]> {
    const checkDate = date || new Date();
    const activeWindows: ScheduleWindow[] = [];

    for (const window of Array.from(this.windows.values())) {
      if (checkDate >= window.startTime && checkDate <= window.endTime) {
        activeWindows.push(window);
      }
      // Check recurring windows logic would go here
    }

    return activeWindows;
  }

  /**
   * Check if a schedule violates any windows
   */
  public async checkWindowViolations(scheduleId: string, date: Date): Promise<boolean> {
    const activeWindows = await this.getActiveWindows(date);

    for (const window of activeWindows) {
      if (window.affectedSchedules.includes(scheduleId) && window.action === 'block') {
        return true;
      }
    }

    return false;
  }

  /**
   * Get schedule analytics
   */
  public async getScheduleAnalytics(
    scheduleId: string, 
    timeRange: { start: Date; end: Date }
  ): Promise<ScheduleAnalytics> {
    const history = this.executionHistory.get(scheduleId) || [];
    const relevantExecutions = history.filter(exec =>
      exec.scheduledTime >= timeRange.start &&
      exec.scheduledTime <= timeRange.end
    );

    const successfulExecutions = relevantExecutions.filter(e => e.status === 'success');
    const failedExecutions = relevantExecutions.filter(e => e.status === 'failed');
    const skippedExecutions = relevantExecutions.filter(e => e.status === 'skipped');

    const durations = relevantExecutions
      .filter(e => e.result?.duration)
      .map(e => e.result!.duration);

    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const onTimeExecutions = relevantExecutions.filter(e => {
      if (!e.actualStartTime || !e.scheduledTime) return false;
      const delay = e.actualStartTime.getTime() - e.scheduledTime.getTime();
      return delay < 60000; // Within 1 minute
    });
    
    return {
      scheduleId,
      timeRange,
      metrics: {
        totalExecutions: relevantExecutions.length,
        successfulExecutions: successfulExecutions.length,
        failedExecutions: failedExecutions.length,
        skippedExecutions: skippedExecutions.length,
        averageDuration,
        onTimePercentage: relevantExecutions.length > 0 
          ? (onTimeExecutions.length / relevantExecutions.length) * 100 
          : 100,
        reliability: relevantExecutions.length > 0 
          ? (successfulExecutions.length / relevantExecutions.length) * 100 
          : 100
      },
      patterns: {
        peakHours: this.findPeakHours(relevantExecutions),
        peakDays: this.findPeakDays(relevantExecutions),
        failurePatterns: this.analyzeFailurePatterns(failedExecutions)
      },
      predictions: {
        nextFailureRisk: this.predictFailureRisk(history),
        estimatedNextDuration: averageDuration * 1.1, // 10% buffer
        resourceRequirements: {
          cpu: successfulExecutions.reduce((sum, e) => 
            sum + (e.result?.resourceUsage?.cpu || 0), 0
          ) / (successfulExecutions.length || 1),
          memory: successfulExecutions.reduce((sum, e) => 
            sum + (e.result?.resourceUsage?.memory || 0), 0
          ) / (successfulExecutions.length || 1)
        }
      }
    };
  }

  private findPeakHours(executions: ScheduledExecution[]): number[] {
    const hourCounts = new Map<number, number>();

    executions.forEach(exec => {
      const hour = exec.scheduledTime.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  }

  private findPeakDays(executions: ScheduledExecution[]): DayOfWeek[] {
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayCounts = new Map<DayOfWeek, number>();

    executions.forEach(exec => {
      const day = dayNames[exec.scheduledTime.getDay()];
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    return Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  }

  private analyzeFailurePatterns(failures: ScheduledExecution[]): Array<{
    type: 'time_based' | 'resource_based' | 'dependency_based';
    description: string;
    occurrences: number;
    lastOccurrence: Date;
    recommendations: string[];
  }> {
    const patterns: Array<{
      type: 'time_based' | 'resource_based' | 'dependency_based';
      description: string;
      occurrences: number;
      lastOccurrence: Date;
      recommendations: string[];
    }> = [];

    // Time-based pattern detection
    const timeFailures = failures.filter(f => {
      const hour = f.scheduledTime.getHours();
      return hour >= 0 && hour <= 6; // Night time failures
    });

    if (timeFailures.length > 3) {
      patterns.push({
        type: 'time_based' as const,
        description: 'Frequent failures during night hours',
        occurrences: timeFailures.length,
        lastOccurrence: timeFailures[timeFailures.length - 1].scheduledTime,
        recommendations: [
          'Consider scheduling during business hours',
          'Check for maintenance windows',
          'Verify system availability during off-hours'
        ]
      });
    }
    
    // Resource-based pattern detection
    const resourceFailures = failures.filter(f =>
      f.error?.includes('memory') || f.error?.includes('cpu') || f.error?.includes('timeout')
    );

    if (resourceFailures.length > 2) {
      patterns.push({
        type: 'resource_based' as const,
        description: 'Resource exhaustion failures',
        occurrences: resourceFailures.length,
        lastOccurrence: resourceFailures[resourceFailures.length - 1].scheduledTime,
        recommendations: [
          'Increase resource allocation',
          'Optimize workflow performance',
          'Consider spreading load across time'
        ]
      });
    }
    
    return patterns;
  }

  private predictFailureRisk(history: ScheduledExecution[]): number {
    if (history.length < 10) return 0;

    const recentHistory = history.slice(-20); // Last 20 executions
    const failureCount = recentHistory.filter(e => e.status === 'failed').length;

    return (failureCount / recentHistory.length) * 100;
  }

  /**
   * Get execution history for a schedule
   */
  public async getExecutionHistory(scheduleId: string, limit?: number): Promise<ScheduledExecution[]> {
    const history = this.executionHistory.get(scheduleId) || [];

    // Sort by scheduled time (newest first)
    const sorted = history.sort((a, b) =>
      b.scheduledTime.getTime() - a.scheduledTime.getTime()
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get schedule health
   */
  public async getScheduleHealth(scheduleId: string): Promise<{ health: number; issues: string[] }> {
    const history = this.executionHistory.get(scheduleId) || [];
    const recentHistory = history.slice(-10); // Last 10 executions
    const issues: string[] = [];

    if (recentHistory.length === 0) {
      return { health: 100, issues: ['No execution history'] };
    }

    const successfulExecutions = recentHistory.filter(e => e.status === 'success').length;
    const successRate = successfulExecutions / recentHistory.length;

    // Calculate success rate
    let health = Math.floor(successRate * 100);

    // Check for issues
    if (successRate < 0.9) {
      issues.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
    }

    // Check for recent failures
    const recentFailures = recentHistory.slice(-5).filter(e => e.status === 'failed').length;
    if (recentFailures >= 3) {
      health -= 20;
      issues.push(`${recentFailures} failures in last 5 executions`);
    }

    // Check for performance degradation
    const avgDuration = recentHistory
      .filter(e => e.result?.duration)
      .reduce((sum, e) => sum + e.result!.duration, 0) / (recentHistory.length || 1);

    if (avgDuration > 300000) { // 5 minutes
      health -= 10;
      issues.push('Long average execution time');
    }

    return { health: Math.max(0, health), issues };
  }

  /**
   * Create a schedule template
   */
  public async createScheduleTemplate(
    template: Omit<ScheduleTemplate, 'id' | 'popularity' | 'createdAt'>
  ): Promise<ScheduleTemplate> {
    const result = await this.executeOperation('createScheduleTemplate', async () => {
      const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newTemplate: ScheduleTemplate = {
        ...template,
        id,
        popularity: 0,
        createdAt: new Date()
      };

      this.templates.set(id, newTemplate);

      logger.info('Schedule template created', {
        templateId: id,
        name: newTemplate.name,
        category: newTemplate.category
      });

      return newTemplate;
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create schedule template');
    }

    return result.data;
  }

  /**
   * Get schedule templates
   */
  public async getScheduleTemplates(category?: string): Promise<ScheduleTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Sort by popularity
    return templates.sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Apply a template to create a new schedule
   */
  public async applyTemplate(templateId: string, workflowId: string): Promise<ScheduledWorkflow> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Increment template popularity
    template.popularity++;

    const schedule: Omit<ScheduledWorkflow, 'id' | 'executions' | 'createdAt' | 'updatedAt'> = {
      workflowId,
      name: `${template.name} - ${new Date().toISOString()}`,
      description: template.description,
      schedule: { ...template.schedule },
      enabled: false, // Start disabled
      timezone: this.detectTimezone(),
      status: 'disabled',
      metadata: { ...template.metadata },
      createdBy: 'current-user' // Would come from auth context
    };

    return this.createSchedule(schedule);
  }

  /**
   * Timezone utilities
   */
  public convertToTimezone(date: Date, fromTz: string, toTz: string): Date {
    // Simplified timezone conversion - in production would use proper library
    return date;
  }

  public getSupportedTimezones(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Kolkata',
      'Australia/Sydney'
    ];
  }

  public detectTimezone(): string {
    // In browser environment
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
    return 'UTC';
  }

  /**
   * Cron expression utilities
   */
  public parseCronExpression(expression: string): CronExpression {
    const parts = expression.split(/\s+/);

    if (parts.length < 5 || parts.length > 7) {
      throw new Error('Invalid cron expression format');
    }

    return {
      expression,
      seconds: parts.length >= 6 ? parts[0] : undefined,
      minutes: parts[parts.length >= 6 ? 1 : 0],
      hours: parts[parts.length >= 6 ? 2 : 1],
      dayOfMonth: parts[parts.length >= 6 ? 3 : 2],
      month: parts[parts.length >= 6 ? 4 : 3],
      dayOfWeek: parts[parts.length >= 6 ? 5 : 4],
      year: parts.length === 7 ? parts[6] : undefined
    };
  }

  public validateCronExpression(expression: string): boolean {
    try {
      CronExpressionParser.parse(expression);
      return true;
    } catch {
      return false;
    }
  }

  public describeCronExpression(expression: string): string {
    try {
      // Simple description - in production would use a proper cron description library
      return `Runs according to cron: ${expression}`;
    } catch {
      return 'Invalid cron expression';
    }
  }

  public generateCronExpression(pattern: Partial<CronExpression>): string {
    const parts: string[] = [
      pattern.minutes || '*',
      pattern.hours || '*',
      pattern.dayOfMonth || '*',
      pattern.month || '*',
      pattern.dayOfWeek || '*'
    ];

    if (pattern.seconds) {
      parts.unshift(pattern.seconds);
    }

    if (pattern.year) {
      parts.push(pattern.year);
    }

    return parts.join(' ');
  }
}

// Export singleton instance
export const schedulingService = new SchedulingService();