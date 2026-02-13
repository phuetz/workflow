/**
 * ScheduleManager - Manages report scheduling and execution
 */

import { EventEmitter } from 'events';
import type {
  ReportSchedule,
  ScheduleFrequency,
  ReportPeriod,
  ScheduleOptions,
} from './types';

/**
 * ScheduleManager handles scheduling recurring report generation
 */
export class ScheduleManager extends EventEmitter {
  private schedules: Map<string, ReportSchedule> = new Map();
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SCHEDULER_CHECK_INTERVAL = 60000; // 1 minute

  /**
   * Start the scheduler
   */
  startScheduler(processCallback: (scheduleId: string, schedule: ReportSchedule) => Promise<void>): void {
    if (this.schedulerInterval) {
      return;
    }

    this.schedulerInterval = setInterval(() => {
      this.processSchedules(processCallback);
    }, this.SCHEDULER_CHECK_INTERVAL);

    this.emit('scheduler:started');
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      this.emit('scheduler:stopped');
    }
  }

  /**
   * Schedule a recurring report
   */
  async scheduleReport(options: ScheduleOptions): Promise<ReportSchedule> {
    const scheduleId = this.generateId('schedule');

    const nextRunAt = this.calculateNextRunTime(
      options.frequency,
      options.cronExpression,
      options.startDate
    );

    const schedule: ReportSchedule = {
      id: scheduleId,
      name: options.name,
      templateId: options.templateId,
      frequency: options.frequency,
      cronExpression: options.cronExpression,
      nextRunAt,
      enabled: true,
      recipients: options.recipients,
      frameworks: options.frameworks,
      formats: options.formats,
      retentionDays: options.retentionDays || 90,
      createdBy: options.createdBy,
      createdAt: new Date(),
    };

    this.schedules.set(scheduleId, schedule);
    this.emit('schedule:created', { scheduleId, schedule });

    return schedule;
  }

  /**
   * Update a scheduled report
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<Omit<ReportSchedule, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<ReportSchedule> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const updatedSchedule = { ...schedule, ...updates };
    this.schedules.set(scheduleId, updatedSchedule);

    this.emit('schedule:updated', { scheduleId, updates });
    return updatedSchedule;
  }

  /**
   * Delete a scheduled report
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    if (!this.schedules.has(scheduleId)) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    this.schedules.delete(scheduleId);
    this.emit('schedule:deleted', { scheduleId });
  }

  /**
   * Get all schedules
   */
  getSchedules(): ReportSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get a schedule by ID
   */
  getSchedule(scheduleId: string): ReportSchedule | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * Process due schedules
   */
  private async processSchedules(
    processCallback: (scheduleId: string, schedule: ReportSchedule) => Promise<void>
  ): Promise<void> {
    const now = new Date();

    for (const [scheduleId, schedule] of this.schedules) {
      if (!schedule.enabled || schedule.nextRunAt > now) {
        continue;
      }

      try {
        this.emit('schedule:executing', { scheduleId });

        await processCallback(scheduleId, schedule);

        // Update schedule
        schedule.lastRunAt = now;
        schedule.lastRunStatus = 'success';
        schedule.nextRunAt = this.calculateNextRunTime(
          schedule.frequency,
          schedule.cronExpression
        );

        this.emit('schedule:completed', { scheduleId });
      } catch (error) {
        schedule.lastRunAt = now;
        schedule.lastRunStatus = 'failed';
        this.emit('schedule:failed', { scheduleId, error });
      }
    }
  }

  /**
   * Calculate next run time
   */
  calculateNextRunTime(
    frequency: ScheduleFrequency,
    cronExpression?: string,
    startDate?: Date
  ): Date {
    const now = startDate || new Date();

    switch (frequency) {
      case 'daily' as ScheduleFrequency:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly' as ScheduleFrequency:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly' as ScheduleFrequency:
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case 'quarterly' as ScheduleFrequency:
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter;
      case 'annually' as ScheduleFrequency:
        const nextYear = new Date(now);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear;
      default:
        return now;
    }
  }

  /**
   * Calculate report period based on frequency
   */
  calculateReportPeriod(frequency: ScheduleFrequency): ReportPeriod {
    const endDate = new Date();
    let startDate: Date;

    switch (frequency) {
      case 'daily' as ScheduleFrequency:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly' as ScheduleFrequency:
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly' as ScheduleFrequency:
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly' as ScheduleFrequency:
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'annually' as ScheduleFrequency:
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
