/**
 * ViewManager - Materialized view management
 */

import type { MaterializedView, QueryResult } from './types';
import type { EventEmitter } from 'events';

export class ViewManager {
  private materializedViews: Map<string, MaterializedView> = new Map();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private emitter: EventEmitter,
    private executeQueryFn: (sql: string, params: Record<string, unknown>, config: { enableCache: boolean }) => Promise<QueryResult>,
    private generateIdFn: (prefix: string) => string
  ) {}

  start(): void {
    this.refreshInterval = setInterval(() => {
      const now = new Date();
      for (const view of this.materializedViews.values()) {
        if (view.nextRefresh && view.nextRefresh <= now && view.status === 'active') {
          this.refresh(view.id).catch(err =>
            this.emitter.emit('view:refresh_error', { viewId: view.id, error: err.message })
          );
        }
      }
    }, 300000);
  }

  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async create(name: string, query: string, refreshSchedule: string, userId: string): Promise<MaterializedView> {
    const id = this.generateIdFn('view');
    const now = new Date();
    const result = await this.executeQueryFn(query, {}, { enableCache: false });
    const view: MaterializedView = {
      id, name, query, refreshSchedule, lastRefresh: now, nextRefresh: this.calculateNextRun(refreshSchedule),
      status: 'active', rowCount: result.rowCount, sizeBytes: JSON.stringify(result.data).length, createdAt: now, createdBy: userId
    };
    this.materializedViews.set(id, view);
    this.emitter.emit('view:created', { viewId: id, name });
    return view;
  }

  get(viewId: string): MaterializedView | undefined { return this.materializedViews.get(viewId); }
  list(): MaterializedView[] { return Array.from(this.materializedViews.values()); }
  get size(): number { return this.materializedViews.size; }

  async refresh(viewId: string): Promise<MaterializedView | null> {
    const view = this.materializedViews.get(viewId);
    if (!view) return null;
    view.status = 'refreshing';
    this.emitter.emit('view:refreshing', { viewId });
    try {
      const result = await this.executeQueryFn(view.query, {}, { enableCache: false });
      view.lastRefresh = new Date();
      view.nextRefresh = this.calculateNextRun(view.refreshSchedule);
      view.status = 'active';
      view.rowCount = result.rowCount;
      view.sizeBytes = JSON.stringify(result.data).length;
      this.emitter.emit('view:refreshed', { viewId, rowCount: result.rowCount });
      return view;
    } catch (error) {
      view.status = 'error';
      this.emitter.emit('view:error', { viewId, error: error instanceof Error ? error.message : 'Unknown error' });
      return view;
    }
  }

  delete(viewId: string): boolean {
    const deleted = this.materializedViews.delete(viewId);
    if (deleted) this.emitter.emit('view:deleted', { viewId });
    return deleted;
  }

  private calculateNextRun(schedule: string): Date {
    const now = new Date();
    const parts = schedule.split(' ');
    if (parts[0].startsWith('*/')) return new Date(now.getTime() + parseInt(parts[0].substring(2), 10) * 60000);
    return new Date(now.getTime() + 3600000);
  }
}
