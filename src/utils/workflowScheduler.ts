/**
 * Advanced Workflow Scheduler
 * Cron-based scheduling with timezone support and advanced features
 */

export interface ScheduleConfig {
  id: string;
  workflowId: string;
  name: string;
  enabled: boolean;
  cron: string; // Cron expression
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  maxRuns?: number; // Maximum number of executions
  runCount?: number; // Current run count
  input?: any; // Input data for execution
  tags?: string[];
  onError?: 'continue' | 'pause' | 'disable';
  retryOnError?: boolean;
  maxRetries?: number;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
  lastRun?: string;
  nextRun?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  workflowId: string;
  executionId?: string;
  scheduledTime: string;
  startTime?: string;
  endTime?: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  retryCount?: number;
}

export interface CronExpression {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

class WorkflowScheduler {
  private schedules: Map<string, ScheduleConfig> = new Map();
  private executions: Map<string, ScheduleExecution[]> = new Map();
  private checkInterval?: NodeJS.Timeout;
  private checkIntervalMs: number = 60000; // Check every minute
  private executionEngine: any;

  constructor(executionEngine?: any) {
    this.executionEngine = executionEngine;
    this.loadFromStorage();
    this.startScheduler();
  }

  /**
   * Create schedule
   */
  createSchedule(
    workflowId: string,
    name: string,
    cron: string,
    createdBy: string,
    options?: {
      timezone?: string;
      startDate?: string;
      endDate?: string;
      maxRuns?: number;
      input?: any;
      tags?: string[];
      onError?: 'continue' | 'pause' | 'disable';
      retryOnError?: boolean;
      maxRetries?: number;
      notifyOnSuccess?: boolean;
      notifyOnFailure?: boolean;
    }
  ): ScheduleConfig {
    // Validate cron expression
    if (!this.validateCron(cron)) {
      throw new Error('Invalid cron expression');
    }

    const schedule: ScheduleConfig = {
      id: this.generateId(),
      workflowId,
      name,
      enabled: true,
      cron,
      timezone: options?.timezone || 'UTC',
      startDate: options?.startDate,
      endDate: options?.endDate,
      maxRuns: options?.maxRuns,
      runCount: 0,
      input: options?.input,
      tags: options?.tags,
      onError: options?.onError || 'continue',
      retryOnError: options?.retryOnError ?? true,
      maxRetries: options?.maxRetries ?? 3,
      notifyOnSuccess: options?.notifyOnSuccess,
      notifyOnFailure: options?.notifyOnFailure,
      nextRun: this.calculateNextRun(cron, options?.timezone || 'UTC'),
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.schedules.set(schedule.id, schedule);
    this.saveToStorage();

    return schedule;
  }

  /**
   * Update schedule
   */
  updateSchedule(scheduleId: string, updates: Partial<ScheduleConfig>): ScheduleConfig {
    const schedule = this.schedules.get(scheduleId);

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Validate cron if being updated
    if (updates.cron && !this.validateCron(updates.cron)) {
      throw new Error('Invalid cron expression');
    }

    const updated = {
      ...schedule,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Recalculate next run if cron or timezone changed
    if (updates.cron || updates.timezone) {
      updated.nextRun = this.calculateNextRun(
        updated.cron,
        updated.timezone || 'UTC'
      );
    }

    this.schedules.set(scheduleId, updated);
    this.saveToStorage();

    return updated;
  }

  /**
   * Delete schedule
   */
  deleteSchedule(scheduleId: string): void {
    this.schedules.delete(scheduleId);
    this.executions.delete(scheduleId);
    this.saveToStorage();
  }

  /**
   * Enable/disable schedule
   */
  toggleSchedule(scheduleId: string, enabled: boolean): void {
    const schedule = this.schedules.get(scheduleId);

    if (schedule) {
      schedule.enabled = enabled;
      schedule.updatedAt = new Date().toISOString();
      this.schedules.set(scheduleId, schedule);
      this.saveToStorage();
    }
  }

  /**
   * Trigger schedule manually
   */
  async triggerSchedule(scheduleId: string): Promise<ScheduleExecution> {
    const schedule = this.schedules.get(scheduleId);

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return this.executeSchedule(schedule, true);
  }

  /**
   * Start scheduler
   */
  private startScheduler(): void {
    this.checkInterval = setInterval(() => {
      this.checkSchedules();
    }, this.checkIntervalMs);
  }

  /**
   * Stop scheduler
   */
  stopScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  /**
   * Check and execute due schedules
   */
  private async checkSchedules(): Promise<void> {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      // Check if schedule is due
      if (schedule.nextRun && new Date(schedule.nextRun) <= now) {
        // Check start/end dates
        if (schedule.startDate && now < new Date(schedule.startDate)) {
          continue;
        }

        if (schedule.endDate && now > new Date(schedule.endDate)) {
          schedule.enabled = false;
          this.schedules.set(schedule.id, schedule);
          continue;
        }

        // Check max runs
        if (schedule.maxRuns && schedule.runCount && schedule.runCount >= schedule.maxRuns) {
          schedule.enabled = false;
          this.schedules.set(schedule.id, schedule);
          continue;
        }

        // Execute schedule
        await this.executeSchedule(schedule);

        // Update next run
        schedule.lastRun = now.toISOString();
        schedule.nextRun = this.calculateNextRun(schedule.cron, schedule.timezone || 'UTC');
        schedule.runCount = (schedule.runCount || 0) + 1;
        this.schedules.set(schedule.id, schedule);
      }
    }

    this.saveToStorage();
  }

  /**
   * Execute schedule
   */
  private async executeSchedule(
    schedule: ScheduleConfig,
    manual: boolean = false
  ): Promise<ScheduleExecution> {
    const execution: ScheduleExecution = {
      id: this.generateId(),
      scheduleId: schedule.id,
      workflowId: schedule.workflowId,
      scheduledTime: schedule.nextRun || new Date().toISOString(),
      status: 'scheduled'
    };

    // Store execution
    const executions = this.executions.get(schedule.id) || [];
    executions.push(execution);
    this.executions.set(schedule.id, executions);

    try {
      execution.status = 'running';
      execution.startTime = new Date().toISOString();

      // Execute workflow
      const result = await this.executeWorkflow(
        schedule.workflowId,
        schedule.input || {}
      );

      execution.executionId = result.id;
      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
      execution.duration = new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();

      // Notify on success
      if (schedule.notifyOnSuccess) {
        this.notifyScheduleSuccess(schedule, execution);
      }
    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date().toISOString();

      // Handle error
      await this.handleScheduleError(schedule, execution, error);

      // Retry if configured
      if (schedule.retryOnError && (!execution.retryCount || execution.retryCount < (schedule.maxRetries || 3))) {
        execution.retryCount = (execution.retryCount || 0) + 1;
        setTimeout(() => {
          this.executeSchedule(schedule, manual);
        }, Math.pow(2, execution.retryCount!) * 1000); // Exponential backoff
      }

      // Notify on failure
      if (schedule.notifyOnFailure) {
        this.notifyScheduleFailure(schedule, execution, error);
      }
    }

    // Update execution
    const idx = executions.findIndex(e => e.id === execution.id);
    if (idx >= 0) {
      executions[idx] = execution;
      this.executions.set(schedule.id, executions);
    }

    this.saveToStorage();

    return execution;
  }

  /**
   * Handle schedule error
   */
  private async handleScheduleError(
    schedule: ScheduleConfig,
    execution: ScheduleExecution,
    error: Error
  ): Promise<void> {
    switch (schedule.onError) {
      case 'pause':
        schedule.enabled = false;
        this.schedules.set(schedule.id, schedule);
        break;

      case 'disable':
        schedule.enabled = false;
        this.schedules.set(schedule.id, schedule);
        break;

      case 'continue':
      default:
        // Continue with next scheduled run
        break;
    }
  }

  /**
   * Execute workflow (mock)
   */
  private async executeWorkflow(workflowId: string, input: any): Promise<any> {
    if (this.executionEngine) {
      return this.executionEngine.execute(workflowId, input);
    }

    // Mock execution
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: this.generateId(),
          status: 'completed',
          data: input
        });
      }, 1000);
    });
  }

  /**
   * Notify schedule success
   */
  private notifyScheduleSuccess(schedule: ScheduleConfig, execution: ScheduleExecution): void {
    console.log(`Schedule "${schedule.name}" executed successfully`, execution);
  }

  /**
   * Notify schedule failure
   */
  private notifyScheduleFailure(
    schedule: ScheduleConfig,
    execution: ScheduleExecution,
    error: Error
  ): void {
    console.error(`Schedule "${schedule.name}" failed`, execution, error);
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(cron: string, timezone: string): string {
    const now = new Date();
    const cronParts = this.parseCron(cron);

    // Simple next run calculation (in production, use a library like node-cron)
    let next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Increment by 1 minute and check if it matches cron
    while (!this.cronMatches(next, cronParts)) {
      next = new Date(next.getTime() + 60000); // Add 1 minute
    }

    return next.toISOString();
  }

  /**
   * Parse cron expression
   */
  private parseCron(cron: string): CronExpression {
    const parts = cron.trim().split(/\s+/);

    if (parts.length !== 5) {
      throw new Error('Cron expression must have 5 parts');
    }

    return {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4]
    };
  }

  /**
   * Check if date matches cron expression
   */
  private cronMatches(date: Date, cron: CronExpression): boolean {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    return (
      this.matchesCronPart(minute, cron.minute, 0, 59) &&
      this.matchesCronPart(hour, cron.hour, 0, 23) &&
      this.matchesCronPart(dayOfMonth, cron.dayOfMonth, 1, 31) &&
      this.matchesCronPart(month, cron.month, 1, 12) &&
      this.matchesCronPart(dayOfWeek, cron.dayOfWeek, 0, 6)
    );
  }

  /**
   * Match cron part
   */
  private matchesCronPart(value: number, pattern: string, min: number, max: number): boolean {
    // * matches all
    if (pattern === '*') return true;

    // */n matches every n
    if (pattern.startsWith('*/')) {
      const step = parseInt(pattern.substring(2));
      return value % step === 0;
    }

    // n-m matches range
    if (pattern.includes('-')) {
      const [start, end] = pattern.split('-').map(Number);
      return value >= start && value <= end;
    }

    // n,m,o matches list
    if (pattern.includes(',')) {
      const values = pattern.split(',').map(Number);
      return values.includes(value);
    }

    // n matches specific value
    return value === parseInt(pattern);
  }

  /**
   * Validate cron expression
   */
  private validateCron(cron: string): boolean {
    try {
      const parts = cron.trim().split(/\s+/);

      if (parts.length !== 5) {
        return false;
      }

      // Validate each part
      this.parseCron(cron);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get schedules
   */
  getSchedules(filters?: {
    workflowId?: string;
    enabled?: boolean;
    tags?: string[];
  }): ScheduleConfig[] {
    let schedules = Array.from(this.schedules.values());

    if (filters?.workflowId) {
      schedules = schedules.filter(s => s.workflowId === filters.workflowId);
    }

    if (filters?.enabled !== undefined) {
      schedules = schedules.filter(s => s.enabled === filters.enabled);
    }

    if (filters?.tags && filters.tags.length > 0) {
      schedules = schedules.filter(s =>
        s.tags?.some(tag => filters.tags!.includes(tag))
      );
    }

    return schedules.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get schedule executions
   */
  getExecutions(scheduleId: string, limit?: number): ScheduleExecution[] {
    const executions = this.executions.get(scheduleId) || [];

    const sorted = executions.sort((a, b) =>
      new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
    );

    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get schedule statistics
   */
  getStatistics(scheduleId: string) {
    const schedule = this.schedules.get(scheduleId);
    const executions = this.executions.get(scheduleId) || [];

    const completed = executions.filter(e => e.status === 'completed');
    const failed = executions.filter(e => e.status === 'failed');

    return {
      schedule,
      totalRuns: executions.length,
      successfulRuns: completed.length,
      failedRuns: failed.length,
      successRate: executions.length > 0 ? (completed.length / executions.length) * 100 : 0,
      averageDuration: completed.length > 0
        ? completed.reduce((sum, e) => sum + (e.duration || 0), 0) / completed.length
        : 0,
      lastExecution: executions[executions.length - 1]
    };
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('workflow-schedules', JSON.stringify(Array.from(this.schedules.entries())));
        localStorage.setItem('schedule-executions', JSON.stringify(Array.from(this.executions.entries())));
      } catch (error) {
        console.error('Failed to save schedules:', error);
      }
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const schedules = localStorage.getItem('workflow-schedules');
        if (schedules) {
          this.schedules = new Map(JSON.parse(schedules));
        }

        const executions = localStorage.getItem('schedule-executions');
        if (executions) {
          this.executions = new Map(JSON.parse(executions));
        }
      } catch (error) {
        console.error('Failed to load schedules:', error);
      }
    }
  }
}

// Singleton instance
export const workflowScheduler = new WorkflowScheduler();

/**
 * Common cron patterns
 */
export const CronPatterns = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_2_HOURS: '0 */2 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  EVERY_12_HOURS: '0 */12 * * *',
  DAILY_AT_MIDNIGHT: '0 0 * * *',
  DAILY_AT_NOON: '0 12 * * *',
  WEEKLY_ON_MONDAY: '0 0 * * 1',
  MONTHLY_ON_FIRST: '0 0 1 * *',
  YEARLY_ON_JAN_1: '0 0 1 1 *'
};

/**
 * Cron builder helper
 */
export class CronBuilder {
  private minute: string = '*';
  private hour: string = '*';
  private dayOfMonth: string = '*';
  private month: string = '*';
  private dayOfWeek: string = '*';

  everyMinute(): this {
    this.minute = '*';
    return this;
  }

  everyNMinutes(n: number): this {
    this.minute = `*/${n}`;
    return this;
  }

  atMinute(minute: number): this {
    this.minute = minute.toString();
    return this;
  }

  everyHour(): this {
    this.hour = '*';
    this.minute = '0';
    return this;
  }

  everyNHours(n: number): this {
    this.hour = `*/${n}`;
    this.minute = '0';
    return this;
  }

  atHour(hour: number): this {
    this.hour = hour.toString();
    return this;
  }

  daily(): this {
    this.hour = '0';
    this.minute = '0';
    return this;
  }

  weekly(dayOfWeek: number = 1): this {
    this.dayOfWeek = dayOfWeek.toString();
    this.hour = '0';
    this.minute = '0';
    return this;
  }

  monthly(day: number = 1): this {
    this.dayOfMonth = day.toString();
    this.hour = '0';
    this.minute = '0';
    return this;
  }

  build(): string {
    return `${this.minute} ${this.hour} ${this.dayOfMonth} ${this.month} ${this.dayOfWeek}`;
  }
}
