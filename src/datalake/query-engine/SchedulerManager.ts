/**
 * SchedulerManager - Query scheduling and alert management
 */

import type { ScheduledQuery, AlertConfig, QueryResult } from './types';
import type { EventEmitter } from 'events';

export class SchedulerManager {
  private scheduledQueries: Map<string, ScheduledQuery> = new Map();
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private emitter: EventEmitter,
    private executeQueryFn: (sql: string, params: Record<string, unknown>, config: { enableCache: boolean }) => Promise<QueryResult>,
    private getSavedQueryFn: (queryId: string) => { sql: string; name: string } | undefined,
    private generateIdFn: (prefix: string) => string
  ) {}

  start(): void {
    this.schedulerInterval = setInterval(() => {
      const now = new Date();
      for (const scheduled of this.scheduledQueries.values()) {
        if (scheduled.enabled && scheduled.nextRun && scheduled.nextRun <= now) {
          this.runScheduledQuery(scheduled).catch(err =>
            this.emitter.emit('scheduler:error', { scheduleId: scheduled.id, error: err.message })
          );
        }
      }
    }, 60000);
  }

  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  async schedule(queryId: string, schedule: string, options: { alertConfig?: AlertConfig; enabled?: boolean }, userId: string): Promise<ScheduledQuery> {
    const id = this.generateIdFn('sched');
    const scheduled: ScheduledQuery = {
      id, queryId, schedule, enabled: options.enabled ?? true, alertConfig: options.alertConfig,
      nextRun: this.calculateNextRun(schedule), runCount: 0, failureCount: 0, createdAt: new Date(), createdBy: userId
    };
    this.scheduledQueries.set(id, scheduled);
    this.emitter.emit('query:scheduled', { scheduleId: id, queryId });
    return scheduled;
  }

  get(scheduleId: string): ScheduledQuery | undefined { return this.scheduledQueries.get(scheduleId); }
  list(): ScheduledQuery[] { return Array.from(this.scheduledQueries.values()); }
  get size(): number { return this.scheduledQueries.size; }

  update(scheduleId: string, updates: Partial<Pick<ScheduledQuery, 'schedule' | 'enabled' | 'alertConfig'>>): ScheduledQuery | null {
    const scheduled = this.scheduledQueries.get(scheduleId);
    if (!scheduled) return null;
    const updated = { ...scheduled, ...updates, nextRun: updates.schedule ? this.calculateNextRun(updates.schedule) : scheduled.nextRun };
    this.scheduledQueries.set(scheduleId, updated);
    this.emitter.emit('schedule:updated', { scheduleId });
    return updated;
  }

  delete(scheduleId: string): boolean {
    const deleted = this.scheduledQueries.delete(scheduleId);
    if (deleted) this.emitter.emit('schedule:deleted', { scheduleId });
    return deleted;
  }

  private async runScheduledQuery(scheduled: ScheduledQuery): Promise<void> {
    const query = this.getSavedQueryFn(scheduled.queryId);
    if (!query) return;
    try {
      const result = await this.executeQueryFn(query.sql, {}, { enableCache: false });
      scheduled.lastRun = new Date();
      scheduled.runCount++;
      scheduled.nextRun = this.calculateNextRun(scheduled.schedule);
      if (scheduled.alertConfig && result.status === 'completed') await this.checkAlertCondition(scheduled, result, query.name);
      this.emitter.emit('schedule:executed', { scheduleId: scheduled.id, result: result.status });
    } catch (error) {
      scheduled.failureCount++;
      scheduled.lastRun = new Date();
      scheduled.nextRun = this.calculateNextRun(scheduled.schedule);
      this.emitter.emit('schedule:failed', { scheduleId: scheduled.id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async checkAlertCondition(scheduled: ScheduledQuery, result: QueryResult, queryName: string): Promise<void> {
    const alert = scheduled.alertConfig!;
    let shouldTrigger = false;
    switch (alert.condition.type) {
      case 'row_count': shouldTrigger = this.evaluateCondition(result.rowCount, alert.condition.operator, alert.condition.value); break;
      case 'threshold': if (alert.condition.field && result.data.length > 0) shouldTrigger = this.evaluateCondition(result.data[0][alert.condition.field] as number, alert.condition.operator, alert.condition.value); break;
      case 'change': shouldTrigger = alert.condition.operator === 'exists' ? result.rowCount > 0 : result.rowCount === 0; break;
    }
    if (shouldTrigger && alert.throttleMinutes && alert.lastTriggered) {
      if ((Date.now() - alert.lastTriggered.getTime()) / 60000 < alert.throttleMinutes) shouldTrigger = false;
    }
    if (shouldTrigger) {
      alert.lastTriggered = new Date();
      for (const channel of alert.channels) {
        this.emitter.emit('alert:triggered', { scheduleId: scheduled.id, queryName, channel: channel.type, severity: alert.severity, rowCount: result.rowCount });
      }
    }
  }

  private evaluateCondition(value: number, operator: string, threshold?: number): boolean {
    if (threshold === undefined) return false;
    switch (operator) {
      case '>': return value > threshold; case '<': return value < threshold;
      case '>=': return value >= threshold; case '<=': return value <= threshold;
      case '==': return value === threshold; case '!=': return value !== threshold;
      default: return false;
    }
  }

  private calculateNextRun(schedule: string): Date {
    const now = new Date();
    const parts = schedule.split(' ');
    if (parts[0].startsWith('*/')) return new Date(now.getTime() + parseInt(parts[0].substring(2), 10) * 60000);
    return new Date(now.getTime() + 3600000);
  }
}
