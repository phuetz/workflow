/**
 * QueryExecutor - Query execution logic with mock data generation
 */

import type { QueryConfig, ColumnInfo } from './types';

export interface ExecutionResult {
  data: Record<string, unknown>[];
  bytesScanned: number;
}

export class QueryExecutor {
  async executeRealtime(
    _sql: string,
    config?: QueryConfig,
    isCancelled?: () => boolean
  ): Promise<ExecutionResult> {
    await this.simulateExecution(100, isCancelled);

    return {
      data: this.generateMockData(config?.maxRows || 100),
      bytesScanned: Math.floor(Math.random() * 10000000)
    };
  }

  async executeBatch(
    _sql: string,
    config?: QueryConfig,
    isCancelled?: () => boolean
  ): Promise<ExecutionResult> {
    await this.simulateExecution(500, isCancelled);

    return {
      data: this.generateMockData(config?.maxRows || 1000),
      bytesScanned: Math.floor(Math.random() * 100000000)
    };
  }

  private async simulateExecution(
    baseMs: number,
    isCancelled?: () => boolean
  ): Promise<void> {
    const totalTime = baseMs + Math.random() * baseMs;
    const checkInterval = 50;
    let elapsed = 0;

    while (elapsed < totalTime) {
      if (isCancelled?.()) {
        throw new Error('Query cancelled');
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }
  }

  private generateMockData(count: number): Record<string, unknown>[] {
    const data: Record<string, unknown>[] = [];

    for (let i = 0; i < Math.min(count, 100); i++) {
      data.push({
        id: `evt_${i}`,
        timestamp: new Date(Date.now() - Math.random() * 86400000),
        source_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        destination_ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        event_type: ['authentication', 'network', 'process', 'file'][
          Math.floor(Math.random() * 4)
        ],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        user_id: `user_${Math.floor(Math.random() * 1000)}`,
        host_id: `host_${Math.floor(Math.random() * 100)}`
      });
    }

    return data;
  }

  inferColumns(data: Record<string, unknown>[]): ColumnInfo[] {
    if (data.length === 0) return [];

    const sample = data[0];
    return Object.entries(sample).map(([name, value]) => ({
      name,
      type: this.inferType(value),
      nullable: data.some(row => row[name] === null || row[name] === undefined)
    }));
  }

  private inferType(value: unknown): string {
    if (value === null || value === undefined) return 'unknown';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'timestamp';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  bindParameters(sql: string, parameters: Record<string, unknown>): string {
    let bound = sql;

    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `:${key}`;
      let replacement: string;

      if (value === null || value === undefined) {
        replacement = 'NULL';
      } else if (Array.isArray(value)) {
        replacement = `(${value.map(v => (typeof v === 'string' ? `'${v}'` : v)).join(', ')})`;
      } else if (value instanceof Date) {
        replacement = `'${value.toISOString()}'`;
      } else if (typeof value === 'string') {
        replacement = `'${value.replace(/'/g, "''")}'`;
      } else {
        replacement = String(value);
      }

      bound = bound.replace(new RegExp(placeholder, 'g'), replacement);
    }

    return bound;
  }

  hashQuery(sql: string, parameters?: Record<string, unknown>): string {
    const content = sql + JSON.stringify(parameters || {});
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return `qh_${Math.abs(hash).toString(36)}`;
  }
}
