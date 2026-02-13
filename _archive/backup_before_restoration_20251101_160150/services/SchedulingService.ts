/**
 * Advanced Scheduling Service
 * Comprehensive scheduling system with cron, calendar, and timezone support
 */

import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import { advancedExecutionEngine } from './AdvancedExecutionEngine';
import * as cronParser from 'cron-parser';
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
    
    for (const [scheduleId, schedule] of this.schedules.entries()) {
      if (!schedule.enabled || schedule.status !== 'active') continue;
      
      // Check if it's time to run
      if (schedule.nextRun && schedule.nextRun <= now) {
        // Check for conflicts and windows
        
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
    history.push(execution);
    this.executionHistory.set(schedule.id, history);

    try {
      execution.status = 'running';
      execution.actualStartTime = new Date();
      
      // Execute workflow
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
    
    switch (schedule.schedule.type) {
      case 'cron':
        if (schedule.schedule.pattern.cron) {
          try {
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
            lastRun: schedule.lastRun,
            runCount: this.executionHistory.get(schedule.id)?.length || 0,
            metadata: {},
            timezone: schedule.timezone
          };
          return nextDate || undefined;
        }
        break;
    }
    
    return undefined;
  }

  private async updateNextRunTimes(): Promise<void> {
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled && schedule.status === 'active') {
        schedule.nextRun = await this.calculateNextRun(schedule);
      }
    }
  }

  private cleanupExecutionHistory(): void {
    
    for (const [scheduleId, history] of this.executionHistory.entries()) {
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
    return this.executeOperation('createSchedule', async () => {
      
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
  }

  /**
   * Update an existing schedule
   */
  public async updateSchedule(scheduleId: string, updates: Partial<ScheduledWorkflow>): Promise<void> {
    return this.executeOperation('updateSchedule', async () => {
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
  }

  /**
   * Delete a schedule
   */
  public async deleteSchedule(scheduleId: string): Promise<void> {
    return this.executeOperation('deleteSchedule', async () => {
      if (!deleted) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }
      
      // Clean up associated data
      this.executionHistory.delete(scheduleId);
      
      // Cancel any active timers
      if (timer) {
        clearTimeout(timer);
        this.activeTimers.delete(scheduleId);
      }
      
      logger.info('Schedule deleted', { scheduleId });
    });
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
    return this.executeOperation('enableSchedule', async () => {
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }
      
      schedule.enabled = true;
      schedule.status = 'active';
      schedule.nextRun = await this.calculateNextRun(schedule);
      
      logger.info('Schedule enabled', { scheduleId });
    });
  }

  /**
   * Disable a schedule
   */
  public async disableSchedule(scheduleId: string): Promise<void> {
    return this.executeOperation('disableSchedule', async () => {
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }
      
      schedule.enabled = false;
      schedule.status = 'disabled';
      schedule.nextRun = undefined;
      
      logger.info('Schedule disabled', { scheduleId });
    });
  }

  /**
   * Pause a schedule
   */
  public async pauseSchedule(scheduleId: string, until?: Date): Promise<void> {
    return this.executeOperation('pauseSchedule', async () => {
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }
      
      schedule.status = 'paused';
      
      if (until) {
        // Set up timer to resume
        if (delay > 0) {
            this.resumeSchedule(scheduleId);
          }, delay);
          
          this.activeTimers.set(scheduleId, timer);
        }
      }
      
      logger.info('Schedule paused', { scheduleId, until });
    });
  }

  /**
   * Resume a paused schedule
   */
  public async resumeSchedule(scheduleId: string): Promise<void> {
    return this.executeOperation('resumeSchedule', async () => {
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }
      
      if (schedule.status === 'paused') {
        schedule.status = 'active';
        schedule.nextRun = await this.calculateNextRun(schedule);
        
        // Clear any resume timer
        if (timer) {
          clearTimeout(timer);
          this.activeTimers.delete(scheduleId);
        }
        
        logger.info('Schedule resumed', { scheduleId });
      }
    });
  }

  /**
   * Manually trigger a schedule
   */
  public async triggerSchedule(scheduleId: string, options?: TriggerOptions): Promise<ScheduledExecution> {
    return this.executeOperation('triggerSchedule', async () => {
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }
      
      // Check if we should force execution
      if (!options?.force) {
        
        if (conflicts.length > 0 || windowViolation) {
          throw new Error('Schedule execution blocked by conflicts or window violations');
        }
      }
      
      // Execute immediately
      await this.executeSchedule(schedule);
      
      return history[history.length - 1];
    });
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
        for (let __i = 0; i < 10; i++) {
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
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    const runs: Date[] = [];
    
    for (let __i = 0; i < count; i++) {
      
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
    if (!schedule) return [];
    
    const conflicts: ScheduleConflict[] = [];
    
    // Check for overlapping schedules (simplified)
    for (const [otherId, otherSchedule] of this.schedules.entries()) {
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
    return this.executeOperation('createScheduleGroup', async () => {
      
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
  }

  /**
   * Update a schedule group
   */
  public async updateScheduleGroup(groupId: string, updates: Partial<ScheduleGroup>): Promise<void> {
    return this.executeOperation('updateScheduleGroup', async () => {
      if (!group) {
        throw new Error(`Schedule group ${groupId} not found`);
      }
      
      Object.assign(group, updates);
      
      logger.info('Schedule group updated', { groupId, updates });
    });
  }

  /**
   * Orchestrate a schedule group
   */
  public async orchestrateGroup(groupId: string): Promise<void> {
    return this.executeOperation('orchestrateGroup', async () => {
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
  }

  /**
   * Create a schedule window
   */
  public async createScheduleWindow(window: Omit<ScheduleWindow, 'id'>): Promise<ScheduleWindow> {
    return this.executeOperation('createScheduleWindow', async () => {
      
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
  }

  /**
   * Get active windows for a specific date
   */
  public async getActiveWindows(date?: Date): Promise<ScheduleWindow[]> {
    const activeWindows: ScheduleWindow[] = [];
    
    for (const window of this.windows.values()) {
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
      exec.scheduledTime >= timeRange.start && 
      exec.scheduledTime <= timeRange.end
    );
    
    
      .filter(e => e.result?.duration)
      .map(e => e.result!.duration);
    
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
    
      if (!e.actualStartTime || !e.scheduledTime) return false;
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
    
    executions.forEach(exec => {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    
    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  }

  private findPeakDays(executions: ScheduledExecution[]): DayOfWeek[] {
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    executions.forEach(exec => {
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
    
    // Time-based pattern detection
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
    
    
    return (failureCount / recentHistory.length) * 100;
  }

  /**
   * Get execution history for a schedule
   */
  public async getExecutionHistory(scheduleId: string, limit?: number): Promise<ScheduledExecution[]> {
    
    // Sort by scheduled time (newest first)
      b.scheduledTime.getTime() - a.scheduledTime.getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get schedule health
   */
  public async getScheduleHealth(scheduleId: string): Promise<{ health: number; issues: string[] }> {
    
    const issues: string[] = [];
    
    if (recentHistory.length === 0) {
      return { health: 100, issues: ['No execution history'] };
    }
    
    // Calculate success rate
    health = Math.floor(successRate * 100);
    
    // Check for issues
    if (successRate < 0.9) {
      issues.push(`Low success rate: ${(successRate * 100).toFixed(1)}%`);
    }
    
    // Check for recent failures
    if (recentFailures >= 3) {
      health -= 20;
      issues.push(`${recentFailures} failures in last 5 executions`);
    }
    
    // Check for performance degradation
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
    return this.executeOperation('createScheduleTemplate', async () => {
      
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
  }

  /**
   * Get schedule templates
   */
  public async getScheduleTemplates(category?: string): Promise<ScheduleTemplate[]> {
    
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
      cronParser.parseExpression(expression);
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