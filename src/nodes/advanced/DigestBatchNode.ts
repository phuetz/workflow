/**
 * Digest/Batch Node
 * Collect and batch items over time before processing
 * Similar to Zapier's Digest feature
 */

import { EventEmitter } from 'events';

export interface DigestConfig {
  id: string;
  mode: 'time' | 'count' | 'schedule' | 'manual';
  timeWindow?: number; // milliseconds
  maxItems?: number;
  schedule?: ScheduleConfig;
  outputFormat?: 'array' | 'text' | 'json' | 'csv' | 'custom';
  customTemplate?: string;
  separator?: string;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  deduplicateBy?: string;
  aggregations?: AggregationConfig[];
  onRelease?: (batch: BatchResult) => void | Promise<void>;
}

export interface ScheduleConfig {
  cron?: string;
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone?: string;
}

export interface AggregationConfig {
  field: string;
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last' | 'concat';
  alias?: string;
}

export interface DigestItem {
  id: string;
  data: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface BatchResult {
  digestId: string;
  items: DigestItem[];
  itemCount: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  formatted: unknown;
  aggregations?: Record<string, unknown>;
  groups?: Record<string, DigestItem[]>;
}

export interface DigestState {
  id: string;
  items: DigestItem[];
  startTime: Date;
  timer?: NodeJS.Timeout;
  config: DigestConfig;
}

export class DigestBatchNode extends EventEmitter {
  private digests: Map<string, DigestState> = new Map();
  private scheduleTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
  }

  /**
   * Create a new digest/batch collector
   */
  createDigest(config: DigestConfig): string {
    const digestId = config.id || this.generateId();
    const state: DigestState = {
      id: digestId,
      items: [],
      startTime: new Date(),
      config
    };

    this.digests.set(digestId, state);

    // Setup timer for time-based mode
    if (config.mode === 'time' && config.timeWindow) {
      state.timer = setTimeout(() => this.releaseDigest(digestId), config.timeWindow);
    }

    // Setup schedule
    if (config.mode === 'schedule' && config.schedule) {
      this.setupSchedule(digestId, config.schedule);
    }

    this.emit('digest:created', { digestId, config });
    return digestId;
  }

  /**
   * Add item to digest
   */
  addItem(digestId: string, data: Record<string, unknown>, metadata?: Record<string, unknown>): boolean {
    const state = this.digests.get(digestId);
    if (!state) {
      this.emit('digest:not-found', { digestId });
      return false;
    }

    const item: DigestItem = {
      id: this.generateItemId(),
      data,
      timestamp: new Date(),
      metadata
    };

    // Check for duplicates
    if (state.config.deduplicateBy) {
      const dedupeValue = this.getNestedValue(data, state.config.deduplicateBy);
      const exists = state.items.some(i =>
        this.getNestedValue(i.data, state.config.deduplicateBy!) === dedupeValue
      );
      if (exists) {
        this.emit('digest:duplicate-skipped', { digestId, item });
        return false;
      }
    }

    state.items.push(item);
    this.emit('digest:item-added', { digestId, item, itemCount: state.items.length });

    // Check if max items reached
    if (state.config.mode === 'count' && state.config.maxItems && state.items.length >= state.config.maxItems) {
      this.releaseDigest(digestId);
    }

    return true;
  }

  /**
   * Add multiple items at once
   */
  addItems(digestId: string, items: Record<string, unknown>[]): number {
    let added = 0;
    for (const item of items) {
      if (this.addItem(digestId, item)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Manually release/flush the digest
   */
  releaseDigest(digestId: string): BatchResult | null {
    const state = this.digests.get(digestId);
    if (!state) {
      this.emit('digest:not-found', { digestId });
      return null;
    }

    // Clear timer if exists
    if (state.timer) {
      clearTimeout(state.timer);
    }

    const endTime = new Date();
    let items = [...state.items];

    // Apply sorting
    if (state.config.sortBy) {
      items = this.sortItems(items, state.config.sortBy, state.config.sortOrder || 'asc');
    }

    // Calculate aggregations
    const aggregations = this.calculateAggregations(items, state.config.aggregations);

    // Group items
    const groups = state.config.groupBy ? this.groupItems(items, state.config.groupBy) : undefined;

    // Format output
    const formatted = this.formatOutput(items, state.config);

    const result: BatchResult = {
      digestId,
      items,
      itemCount: items.length,
      startTime: state.startTime,
      endTime,
      duration: endTime.getTime() - state.startTime.getTime(),
      formatted,
      aggregations,
      groups
    };

    // Execute callback
    if (state.config.onRelease) {
      state.config.onRelease(result);
    }

    this.emit('digest:released', result);

    // Reset for next batch
    state.items = [];
    state.startTime = new Date();

    // Restart timer for time mode
    if (state.config.mode === 'time' && state.config.timeWindow) {
      state.timer = setTimeout(() => this.releaseDigest(digestId), state.config.timeWindow);
    }

    return result;
  }

  /**
   * Get current digest state without releasing
   */
  getDigestState(digestId: string): {
    itemCount: number;
    items: DigestItem[];
    startTime: Date;
    elapsed: number;
  } | null {
    const state = this.digests.get(digestId);
    if (!state) return null;

    return {
      itemCount: state.items.length,
      items: [...state.items],
      startTime: state.startTime,
      elapsed: Date.now() - state.startTime.getTime()
    };
  }

  /**
   * Peek at items without releasing
   */
  peekItems(digestId: string, limit?: number): DigestItem[] {
    const state = this.digests.get(digestId);
    if (!state) return [];

    return limit ? state.items.slice(0, limit) : [...state.items];
  }

  /**
   * Cancel and remove a digest
   */
  cancelDigest(digestId: string): boolean {
    const state = this.digests.get(digestId);
    if (!state) return false;

    if (state.timer) {
      clearTimeout(state.timer);
    }

    const scheduleTimer = this.scheduleTimers.get(digestId);
    if (scheduleTimer) {
      clearInterval(scheduleTimer);
      this.scheduleTimers.delete(digestId);
    }

    this.digests.delete(digestId);
    this.emit('digest:cancelled', { digestId, droppedItems: state.items.length });
    return true;
  }

  /**
   * List all active digests
   */
  listDigests(): { id: string; itemCount: number; mode: string }[] {
    const digests: { id: string; itemCount: number; mode: string }[] = [];
    for (const [id, state] of this.digests) {
      digests.push({
        id,
        itemCount: state.items.length,
        mode: state.config.mode
      });
    }
    return digests;
  }

  /**
   * Clear all digests
   */
  clearAll(): void {
    for (const [digestId] of this.digests) {
      this.cancelDigest(digestId);
    }
    this.emit('digests:cleared');
  }

  private setupSchedule(digestId: string, schedule: ScheduleConfig): void {
    // Simple schedule implementation - check every minute
    const timer = setInterval(() => {
      const now = new Date();

      let shouldRelease = false;

      if (schedule.hour !== undefined && schedule.minute !== undefined) {
        shouldRelease = now.getHours() === schedule.hour && now.getMinutes() === schedule.minute;
      }

      if (schedule.dayOfWeek !== undefined) {
        shouldRelease = shouldRelease && now.getDay() === schedule.dayOfWeek;
      }

      if (schedule.dayOfMonth !== undefined) {
        shouldRelease = shouldRelease && now.getDate() === schedule.dayOfMonth;
      }

      if (shouldRelease) {
        this.releaseDigest(digestId);
      }
    }, 60000);

    this.scheduleTimers.set(digestId, timer);
  }

  private sortItems(items: DigestItem[], field: string, order: 'asc' | 'desc'): DigestItem[] {
    return [...items].sort((a, b) => {
      const aVal = this.getNestedValue(a.data, field);
      const bVal = this.getNestedValue(b.data, field);

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return order === 'desc' ? -comparison : comparison;
    });
  }

  private groupItems(items: DigestItem[], field: string): Record<string, DigestItem[]> {
    const groups: Record<string, DigestItem[]> = {};
    for (const item of items) {
      const key = String(this.getNestedValue(item.data, field) || 'undefined');
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    return groups;
  }

  private calculateAggregations(items: DigestItem[], configs?: AggregationConfig[]): Record<string, unknown> {
    if (!configs || configs.length === 0) return {};

    const aggregations: Record<string, unknown> = {};

    for (const config of configs) {
      const values = items.map(i => this.getNestedValue(i.data, config.field));
      const alias = config.alias || `${config.field}_${config.operation}`;

      switch (config.operation) {
        case 'sum':
          aggregations[alias] = values.reduce((sum, v) => sum + (Number(v) || 0), 0);
          break;
        case 'avg':
          const nums = values.filter(v => !isNaN(Number(v)));
          aggregations[alias] = nums.length > 0
            ? nums.reduce((sum, v) => sum + Number(v), 0) / nums.length
            : 0;
          break;
        case 'min':
          aggregations[alias] = Math.min(...values.filter(v => !isNaN(Number(v))).map(Number));
          break;
        case 'max':
          aggregations[alias] = Math.max(...values.filter(v => !isNaN(Number(v))).map(Number));
          break;
        case 'count':
          aggregations[alias] = values.filter(v => v !== null && v !== undefined).length;
          break;
        case 'first':
          aggregations[alias] = values[0];
          break;
        case 'last':
          aggregations[alias] = values[values.length - 1];
          break;
        case 'concat':
          aggregations[alias] = values.filter(v => v !== null && v !== undefined).join(', ');
          break;
      }
    }

    return aggregations;
  }

  private formatOutput(items: DigestItem[], config: DigestConfig): unknown {
    const data = items.map(i => i.data);

    switch (config.outputFormat) {
      case 'array':
        return data;

      case 'text':
        return data.map(d => {
          if (typeof d === 'string') return d;
          return Object.values(d).join(config.separator || ' | ');
        }).join('\n');

      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const csvLines = [headers.join(',')];
        for (const row of data) {
          csvLines.push(headers.map(h => {
            const val = String(row[h] ?? '');
            return val.includes(',') ? `"${val}"` : val;
          }).join(','));
        }
        return csvLines.join('\n');

      case 'custom':
        if (!config.customTemplate) return data;
        let result = config.customTemplate;
        result = result.replace(/\{\{count\}\}/g, String(items.length));
        result = result.replace(/\{\{items\}\}/g, JSON.stringify(data));
        return result;

      default:
        return data;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private generateId(): string {
    return `digest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

// Export factory function
export function createDigestBatchNode(): DigestBatchNode {
  return new DigestBatchNode();
}
