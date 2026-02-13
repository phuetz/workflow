import { logger } from './SimpleLogger';
/**
 * Schedule Service
 * Real cron-based scheduling system for workflow automation
 */

export interface ScheduledJob {
  id: string;
  workflowId: string;
  cronExpression: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  timezone: string;
  description?: string;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CronJob {
  id: string;
  job: ScheduledJob;
  timeoutId?: NodeJS.Timeout;
  intervalId?: NodeJS.Timeout;
}

export class ScheduleService {
  private jobs: Map<string, CronJob> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    // Start the schedule checker
    this.startScheduleChecker();
  }

  // Job Management
  createJob(job: Omit<ScheduledJob, 'id' | 'createdAt' | 'updatedAt' | 'nextRun'>): ScheduledJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const scheduledJob: ScheduledJob = {
      ...job,
      id,
      nextRun: this.calculateNextRun(job.cronExpression, job.timezone),
      createdAt: now,
      updatedAt: now
    };

    const cronJob: CronJob = {
      id,
      job: scheduledJob
    };

    this.jobs.set(id, cronJob);
    
    if (scheduledJob.enabled) {
      this.scheduleNextExecution(cronJob);
    }

    this.emit('job-created', scheduledJob);
    return scheduledJob;
  }

  updateJob(id: string, updates: Partial<ScheduledJob>): ScheduledJob | null {
    const cronJob = this.jobs.get(id);
    if (!cronJob) return null;

    // Clear existing schedule
    this.clearJobSchedule(cronJob);

    // Update job
    const updatedJob: ScheduledJob = {
      ...cronJob.job,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    // Recalculate next run if cron expression or timezone changed
    if (updates.cronExpression || updates.timezone) {
      updatedJob.nextRun = this.calculateNextRun(
        updatedJob.cronExpression, 
        updatedJob.timezone
      );
    }

    cronJob.job = updatedJob;
    this.jobs.set(id, cronJob);

    // Reschedule if enabled
    if (updatedJob.enabled) {
      this.scheduleNextExecution(cronJob);
    }

    this.emit('job-updated', updatedJob);
    return updatedJob;
  }

  deleteJob(id: string): boolean {
    const cronJob = this.jobs.get(id);
    if (!cronJob) return false;

    this.clearJobSchedule(cronJob);
    this.jobs.delete(id);
    
    this.emit('job-deleted', id);
    return true;
  }

  getJob(id: string): ScheduledJob | null {
    const cronJob = this.jobs.get(id);
    return cronJob ? cronJob.job : null;
  }

  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(cronJob => cronJob.job);
  }

  // Job Control
  enableJob(id: string): boolean {
    const cronJob = this.jobs.get(id);
    if (!cronJob) return false;

    cronJob.job.enabled = true;
    cronJob.job.updatedAt = new Date().toISOString();
    cronJob.job.nextRun = this.calculateNextRun(
      cronJob.job.cronExpression, 
      cronJob.job.timezone
    );

    this.scheduleNextExecution(cronJob);
    this.emit('job-enabled', cronJob.job);
    return true;
  }

  disableJob(id: string): boolean {
    const cronJob = this.jobs.get(id);
    if (!cronJob) return false;

    cronJob.job.enabled = false;
    cronJob.job.updatedAt = new Date().toISOString();
    cronJob.job.nextRun = null;

    this.clearJobSchedule(cronJob);
    this.emit('job-disabled', cronJob.job);
    return true;
  }

  toggleJob(id: string): boolean {
    const cronJob = this.jobs.get(id);
    if (!cronJob) return false;

    if (cronJob.job.enabled) {
      return this.disableJob(id);
    } else {
      return this.enableJob(id);
    }
  }

  // Manual execution
  async executeJob(id: string): Promise<boolean> {
    const cronJob = this.jobs.get(id);
    if (!cronJob) return false;

    try {
      await this.executeWorkflow(cronJob.job);
      
      // Update last run
      cronJob.job.lastRun = new Date().toISOString();
      cronJob.job.updatedAt = new Date().toISOString();
      
      this.emit('job-executed', cronJob.job);
      return true;
    } catch (error) {
      logger.error(`Failed to execute job ${id}:`, error);
      this.emit('job-execution-failed', { job: cronJob.job, error });
      return false;
    }
  }

  // Cron Expression Utilities
  calculateNextRun(cronExpression: string, timezone: string = 'UTC'): string | null {
    try {
      const next = this.getNextCronExecution(cronExpression, timezone);
      return next ? next.toISOString() : null;
    } catch (error) {
      logger.error('Error calculating next run:', error);
      return null;
    }
  }

  private getNextCronExecution(cronExpression: string, timezone: string): Date | null {
    // Parse cron expression: minute hour dayOfMonth month dayOfWeek
    // Support for: * / - , ? special characters
    const parts = cronExpression.trim().split(/\s+/);

    if (parts.length !== 5) {
      throw new Error('Invalid cron expression format');
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Convert to target timezone
    const nextExecution = this.toTimezone(new Date(), timezone);

    // Start from next minute
    nextExecution.setSeconds(0);
    nextExecution.setMilliseconds(0);
    nextExecution.setMinutes(nextExecution.getMinutes() + 1);

    // Find next valid execution time
    for (let i = 0; i < 366 * 24 * 60; i++) { // Max 1 year ahead
      if (this.matchesCronExpression(nextExecution, minute, hour, dayOfMonth, month, dayOfWeek)) {
        return this.fromTimezone(nextExecution, timezone);
      }
      nextExecution.setMinutes(nextExecution.getMinutes() + 1);
    }

    return null; // No valid execution found within a year
  }

  private matchesCronExpression(
    date: Date, 
    minute: string, 
    hour: string, 
    dayOfMonth: string, 
    month: string, 
    dayOfWeek: string
  ): boolean {
    return (
      this.matchesCronField(date.getMinutes(), minute, 0, 59) &&
      this.matchesCronField(date.getHours(), hour, 0, 23) &&
      this.matchesCronField(date.getDate(), dayOfMonth, 1, 31) &&
      this.matchesCronField(date.getMonth() + 1, month, 1, 12) &&
      this.matchesCronField(date.getDay(), dayOfWeek, 0, 6)
    );
  }

  private matchesCronField(value: number, pattern: string, min: number, max: number): boolean {
    if (pattern === '*') return true;

    // Handle lists (e.g., "1,3,5")
    if (pattern.includes(',')) {
      return pattern.split(',').some(p => this.matchesCronField(value, p.trim(), min, max));
    }

    // Handle ranges (e.g., "1-5")
    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(Number);
      return value >= start && value <= end;
    }

    // Handle steps (e.g., "*/5" or "1-10/2")
    if (pattern.includes('/')) {
      const [range, step] = pattern.split('/');
      const stepValue = parseInt(step);

      if (range === '*') {
        return (value - min) % stepValue === 0;
      } else if (range.includes('-')) {
        const [start, end] = range.split('-').map(Number);
        return value >= start && value <= end && (value - start) % stepValue === 0;
      } else {
        const start = parseInt(range);
        return value >= start && (value - start) % stepValue === 0;
      }
    }

    // Handle specific value
    return value === Number(pattern);
  }

  private toTimezone(date: Date, timezone: string): Date {
    if (timezone === 'UTC') return new Date(date);

    // Simple timezone conversion (in a real app, use libraries like date-fns-tz)
    const utcTime = date.getTime() - (date.getTimezoneOffset() * 60000);
    const offset = this.getTimezoneOffset(timezone);
    return new Date(utcTime + (offset * 60000));
  }

  private fromTimezone(date: Date, timezone: string): Date {
    if (timezone === 'UTC') return new Date(date);

    const utcTime = date.getTime();
    return new Date(utcTime - (date.getTimezoneOffset() * 60000));
  }

  private getTimezoneOffset(timezone: string): number {
    // Simplified timezone offsets (in minutes)
    const offsets: Record<string, number> = {
      'UTC': 0,
      'Europe/London': 0, // GMT, varies with DST
      'Europe/Paris': 60, // CET, varies with DST
      'Europe/Berlin': 60, // CET, varies with DST
      'America/New_York': -300, // EST, varies with DST
      'America/Chicago': -360, // CST, varies with DST
      'America/Los_Angeles': -480, // PST, varies with DST
      'Asia/Tokyo': 540,
      'Asia/Shanghai': 480,
      'Asia/Kolkata': 330,
      'Australia/Sydney': 600 // AEST, varies with DST
    };
    
    return offsets[timezone] || 0;
  }

  // Schedule Management
  private scheduleNextExecution(cronJob: CronJob): void {
    this.clearJobSchedule(cronJob);

    if (!cronJob.job.enabled || !cronJob.job.nextRun) return;

    const nextRunTime = new Date(cronJob.job.nextRun).getTime();
    const now = Date.now();
    const delay = Math.max(0, nextRunTime - now);

    cronJob.timeoutId = setTimeout(async () => {
      try {
        await this.executeWorkflow(cronJob.job);
        
        // Update job after execution
        cronJob.job.lastRun = new Date().toISOString();
        cronJob.job.nextRun = this.calculateNextRun(
          cronJob.job.cronExpression, 
          cronJob.job.timezone
        );
        cronJob.job.updatedAt = new Date().toISOString();

        // Schedule next execution
        if (cronJob.job.enabled) {
          this.scheduleNextExecution(cronJob);
        }

        this.emit('job-executed', cronJob.job);
      } catch (error) {
        logger.error(`Failed to execute scheduled job ${cronJob.id}:`, error);
        this.emit('job-execution-failed', { job: cronJob.job, error });
        
        // Reschedule even if execution failed
        if (cronJob.job.enabled) {
          cronJob.job.nextRun = this.calculateNextRun(
            cronJob.job.cronExpression, 
            cronJob.job.timezone
          );
          this.scheduleNextExecution(cronJob);
        }
      }
    }, delay);
  }

  private clearJobSchedule(cronJob: CronJob): void {
    if (cronJob.timeoutId) {
      clearTimeout(cronJob.timeoutId);
      cronJob.timeoutId = undefined;
    }
    if (cronJob.intervalId) {
      clearInterval(cronJob.intervalId);
      cronJob.intervalId = undefined;
    }
  }

  private startScheduleChecker(): void {
    // Check every minute for any missed executions
    setInterval(() => {
      this.checkMissedExecutions();
    }, 60000);
  }

  private checkMissedExecutions(): void {
    const now = new Date();

    for (const cronJob of this.jobs.values()) {
      if (!cronJob.job.enabled || !cronJob.job.nextRun) continue;

      const nextRun = new Date(cronJob.job.nextRun);
      if (nextRun <= now && !cronJob.timeoutId) {
        // Missed execution, reschedule
        logger.warn(`Missed execution for job ${cronJob.id}, rescheduling...`);
        this.scheduleNextExecution(cronJob);
      }
    }
  }

  private async executeWorkflow(job: ScheduledJob): Promise<void> {
    logger.info(`Executing scheduled workflow: ${job.workflowId}`);
    
    // In a real implementation, this would trigger the workflow execution engine
    // For now, we'll emit an event that can be handled by the execution engine
    this.emit('workflow-trigger', {
      workflowId: job.workflowId,
      trigger: 'schedule',
      jobId: job.id,
      timestamp: new Date().toISOString()
    });
    
    // Simulate workflow execution time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Event System
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Validation
  validateCronExpression(cronExpression: string): { isValid: boolean; error?: string } {
    try {
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length !== 5) {
        return { isValid: false, error: 'Cron expression must have 5 fields' };
      }

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      
      // Basic validation
      if (!this.isValidCronField(minute, 0, 59)) {
        return { isValid: false, error: 'Invalid minute field (0-59)' };
      }
      if (!this.isValidCronField(hour, 0, 23)) {
        return { isValid: false, error: 'Invalid hour field (0-23)' };
      }
      if (!this.isValidCronField(dayOfMonth, 1, 31)) {
        return { isValid: false, error: 'Invalid day of month field (1-31)' };
      }
      if (!this.isValidCronField(month, 1, 12)) {
        return { isValid: false, error: 'Invalid month field (1-12)' };
      }
      if (!this.isValidCronField(dayOfWeek, 0, 6)) {
        return { isValid: false, error: 'Invalid day of week field (0-6)' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid cron expression format' };
    }
  }

  private isValidCronField(field: string, min: number, max: number): boolean {
    if (field === '*') return true;
    
    // Handle lists
    if (field.includes(',')) {
      return field.split(',').every(part => this.isValidCronField(part.trim(), min, max));
    }
    
    // Handle ranges
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(s => parseInt(s.trim()));
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }
    
    // Handle steps
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepValue = parseInt(step.trim());
      if (isNaN(stepValue) || stepValue <= 0) return false;

      if (range === '*') return true;
      return this.isValidCronField(range, min, max);
    }

    // Handle specific value
    const value = parseInt(field.trim());
    return !isNaN(value) && value >= min && value <= max;
  }

  // Cleanup
  destroy(): void {
    for (const cronJob of this.jobs.values()) {
      this.clearJobSchedule(cronJob);
    }
    this.jobs.clear();
    this.eventListeners.clear();
  }
}

// Singleton instance
export const scheduleService = new ScheduleService();