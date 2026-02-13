/**
 * Lookup Node
 * Search and retrieve data from workflow tables, databases, or external sources
 * Similar to Zapier's Lookup functionality
 */

import { EventEmitter } from 'events';

export interface LookupConfig {
  source: LookupSource;
  matchField: string;
  matchValue: unknown;
  matchMode: 'exact' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'fuzzy';
  returnField?: string | string[];
  returnMultiple?: boolean;
  caseSensitive?: boolean;
  defaultValue?: unknown;
  createIfNotFound?: boolean;
  createData?: Record<string, unknown>;
  cacheResults?: boolean;
  cacheTtl?: number;
}

export interface LookupSource {
  type: 'table' | 'database' | 'api' | 'memory' | 'file';
  tableId?: string;
  tableName?: string;
  connectionId?: string;
  endpoint?: string;
  filePath?: string;
  data?: Record<string, unknown>[];
}

export interface LookupResult {
  success: boolean;
  found: boolean;
  data: unknown;
  matchCount: number;
  source: string;
  cached: boolean;
  created: boolean;
  duration: number;
  error?: string;
}

export interface LookupCacheEntry {
  key: string;
  value: unknown;
  timestamp: number;
  ttl: number;
}

export class LookupNode extends EventEmitter {
  private cache: Map<string, LookupCacheEntry> = new Map();
  private inMemoryTables: Map<string, Record<string, unknown>[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Perform lookup operation
   */
  async lookup(config: LookupConfig): Promise<LookupResult> {
    const startTime = Date.now();

    this.emit('lookup:start', { config });

    try {
      // Check cache first
      if (config.cacheResults) {
        const cacheKey = this.getCacheKey(config);
        const cached = this.getFromCache(cacheKey);
        if (cached !== undefined) {
          this.emit('lookup:cache-hit', { key: cacheKey });
          return {
            success: true,
            found: cached !== null,
            data: cached,
            matchCount: cached !== null ? (Array.isArray(cached) ? cached.length : 1) : 0,
            source: config.source.type,
            cached: true,
            created: false,
            duration: Date.now() - startTime
          };
        }
      }

      // Get data from source
      const sourceData = await this.getSourceData(config.source);

      // Perform lookup
      const matches = this.findMatches(sourceData, config);

      let resultData: unknown;
      if (matches.length === 0) {
        if (config.createIfNotFound && config.createData) {
          // Create new entry
          const newEntry = await this.createEntry(config);
          resultData = newEntry;
          this.emit('lookup:created', { entry: newEntry });

          if (config.cacheResults) {
            this.setInCache(this.getCacheKey(config), resultData, config.cacheTtl || 300000);
          }

          return {
            success: true,
            found: false,
            data: resultData,
            matchCount: 0,
            source: config.source.type,
            cached: false,
            created: true,
            duration: Date.now() - startTime
          };
        }
        resultData = config.defaultValue ?? null;
      } else if (config.returnMultiple) {
        resultData = this.extractFields(matches, config.returnField);
      } else {
        resultData = this.extractFields([matches[0]], config.returnField);
        if (Array.isArray(resultData) && resultData.length === 1) {
          resultData = resultData[0];
        }
      }

      // Cache result
      if (config.cacheResults) {
        this.setInCache(this.getCacheKey(config), resultData, config.cacheTtl || 300000);
      }

      this.emit('lookup:complete', { matchCount: matches.length });

      return {
        success: true,
        found: matches.length > 0,
        data: resultData,
        matchCount: matches.length,
        source: config.source.type,
        cached: false,
        created: false,
        duration: Date.now() - startTime
      };
    } catch (error) {
      this.emit('lookup:error', { error });
      return {
        success: false,
        found: false,
        data: config.defaultValue ?? null,
        matchCount: 0,
        source: config.source.type,
        cached: false,
        created: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Batch lookup - lookup multiple values at once
   */
  async batchLookup(configs: LookupConfig[]): Promise<LookupResult[]> {
    return Promise.all(configs.map(config => this.lookup(config)));
  }

  /**
   * Reverse lookup - find what references a value
   */
  async reverseLookup(config: LookupConfig & {
    targetField: string;
    targetValue: unknown;
  }): Promise<LookupResult> {
    // Find all records where targetField matches targetValue
    const modifiedConfig: LookupConfig = {
      ...config,
      matchField: config.targetField,
      matchValue: config.targetValue
    };
    return this.lookup(modifiedConfig);
  }

  /**
   * Register in-memory table for lookup
   */
  registerTable(tableId: string, data: Record<string, unknown>[]): void {
    this.inMemoryTables.set(tableId, data);
    this.emit('table:registered', { tableId, rowCount: data.length });
  }

  /**
   * Update in-memory table
   */
  updateTable(tableId: string, data: Record<string, unknown>[]): void {
    this.inMemoryTables.set(tableId, data);
    // Clear cache entries for this table
    for (const [key] of this.cache) {
      if (key.includes(tableId)) {
        this.cache.delete(key);
      }
    }
    this.emit('table:updated', { tableId, rowCount: data.length });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  private async getSourceData(source: LookupSource): Promise<Record<string, unknown>[]> {
    switch (source.type) {
      case 'table':
      case 'memory':
        const tableId = source.tableId || source.tableName || '';
        return this.inMemoryTables.get(tableId) || source.data || [];

      case 'database':
        // Simulated database lookup
        this.emit('database:query', { connectionId: source.connectionId });
        return source.data || [];

      case 'api':
        // Simulated API lookup
        this.emit('api:fetch', { endpoint: source.endpoint });
        return source.data || [];

      case 'file':
        // Simulated file lookup
        this.emit('file:read', { path: source.filePath });
        return source.data || [];

      default:
        return source.data || [];
    }
  }

  private findMatches(data: Record<string, unknown>[], config: LookupConfig): Record<string, unknown>[] {
    return data.filter(record => {
      const fieldValue = this.getNestedValue(record, config.matchField);
      return this.matchValue(fieldValue, config.matchValue, config);
    });
  }

  private matchValue(fieldValue: unknown, matchValue: unknown, config: LookupConfig): boolean {
    if (fieldValue === undefined || fieldValue === null) return false;

    const fieldStr = String(fieldValue);
    const matchStr = String(matchValue);
    const compareField = config.caseSensitive ? fieldStr : fieldStr.toLowerCase();
    const compareMatch = config.caseSensitive ? matchStr : matchStr.toLowerCase();

    switch (config.matchMode) {
      case 'exact':
        return compareField === compareMatch;

      case 'contains':
        return compareField.includes(compareMatch);

      case 'startsWith':
        return compareField.startsWith(compareMatch);

      case 'endsWith':
        return compareField.endsWith(compareMatch);

      case 'regex':
        try {
          const regex = new RegExp(matchStr, config.caseSensitive ? '' : 'i');
          return regex.test(fieldStr);
        } catch {
          return false;
        }

      case 'fuzzy':
        return this.fuzzyMatch(compareField, compareMatch) > 0.7;

      default:
        return compareField === compareMatch;
    }
  }

  private fuzzyMatch(str1: string, str2: string): number {
    // Simple Levenshtein-based similarity
    const len1 = str1.length;
    const len2 = str2.length;
    if (len1 === 0 || len2 === 0) return 0;

    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - matrix[len1][len2] / maxLen;
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

  private extractFields(records: Record<string, unknown>[], returnField?: string | string[]): unknown {
    if (!returnField) return records;

    const fields = Array.isArray(returnField) ? returnField : [returnField];

    return records.map(record => {
      if (fields.length === 1) {
        return this.getNestedValue(record, fields[0]);
      }
      const result: Record<string, unknown> = {};
      for (const field of fields) {
        result[field] = this.getNestedValue(record, field);
      }
      return result;
    });
  }

  private async createEntry(config: LookupConfig): Promise<Record<string, unknown>> {
    const newEntry = {
      id: this.generateId(),
      [config.matchField]: config.matchValue,
      ...config.createData,
      createdAt: new Date().toISOString()
    };

    // Add to in-memory table if using memory/table source
    if (config.source.type === 'table' || config.source.type === 'memory') {
      const tableId = config.source.tableId || config.source.tableName || '';
      const table = this.inMemoryTables.get(tableId) || [];
      table.push(newEntry);
      this.inMemoryTables.set(tableId, table);
    }

    return newEntry;
  }

  private getCacheKey(config: LookupConfig): string {
    return `${config.source.type}:${config.source.tableId || config.source.tableName}:${config.matchField}:${config.matchValue}`;
  }

  private getFromCache(key: string): unknown | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  private setInCache(key: string, value: unknown, ttl: number): void {
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  private generateId(): string {
    return `lookup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export factory function
export function createLookupNode(): LookupNode {
  return new LookupNode();
}
