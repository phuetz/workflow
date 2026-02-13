/**
 * Data Transformer - Handles data transformations and enrichments
 */

import { EventEmitter } from 'events';
import { SecureExpressionEngineV2 } from '../../expressions/SecureExpressionEngineV2';
import {
  IngestionRecord,
  TransformationConfig,
  EnrichmentConfig,
  TransformationHandler,
  EnrichmentHandler,
} from './types';

export class DataTransformer extends EventEmitter {
  private transformationHandlers: Map<string, TransformationHandler> = new Map();
  private enrichmentHandlers: Map<string, EnrichmentHandler> = new Map();
  private dedupeCache: Map<string, number> = new Map();
  private enrichmentCache: Map<string, any> = new Map();
  private lookupTables: Map<string, Map<string, any>> = new Map();
  private joinDataCache: Map<string, Map<string, any>> = new Map();

  constructor() {
    super();
    this.registerBuiltInTransformations();
    this.registerBuiltInEnrichments();
  }

  /**
   * Apply transformations to a record
   */
  async applyTransformations(
    record: IngestionRecord,
    transformations: TransformationConfig[]
  ): Promise<IngestionRecord | IngestionRecord[] | null> {
    let result: IngestionRecord | IngestionRecord[] | null = record;

    for (const transformation of transformations.sort((a, b) => a.order - b.order)) {
      if (!result) break;

      const handler = this.transformationHandlers.get(transformation.type);
      if (handler) {
        if (Array.isArray(result)) {
          // Process array of records
          const newResults: IngestionRecord[] = [];
          for (const r of result) {
            const transformed = await handler(r, transformation.config);
            if (transformed) {
              if (Array.isArray(transformed)) {
                newResults.push(...transformed);
              } else {
                newResults.push(transformed);
              }
            }
          }
          result = newResults.length > 0 ? newResults : null;
        } else {
          result = await handler(result, transformation.config);
        }
      }
    }

    return result;
  }

  /**
   * Apply enrichments to a record
   */
  async applyEnrichments(
    record: IngestionRecord,
    enrichments: EnrichmentConfig[]
  ): Promise<IngestionRecord> {
    let enrichedRecord = record;

    for (const enrichment of enrichments) {
      const handler = this.enrichmentHandlers.get(enrichment.source);
      if (handler) {
        enrichedRecord = await handler(enrichedRecord, enrichment.config);
      }
    }

    return enrichedRecord;
  }

  /**
   * Register a custom transformation handler
   */
  registerTransformationHandler(type: string, handler: TransformationHandler): void {
    this.transformationHandlers.set(type, handler);
    this.emit('handler:registered', { type: 'transformation', name: type });
  }

  /**
   * Register a custom enrichment handler
   */
  registerEnrichmentHandler(source: string, handler: EnrichmentHandler): void {
    this.enrichmentHandlers.set(source, handler);
    this.emit('handler:registered', { type: 'enrichment', name: source });
  }

  /**
   * Set a lookup table for enrichment
   */
  setLookupTable(tableId: string, data: Map<string, any>): void {
    this.lookupTables.set(tableId, data);
  }

  /**
   * Set join data cache
   */
  setJoinDataCache(source: string, data: Map<string, any>): void {
    this.joinDataCache.set(source, data);
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.dedupeCache.clear();
    this.enrichmentCache.clear();
    this.lookupTables.clear();
    this.joinDataCache.clear();
  }

  private registerBuiltInTransformations(): void {
    // Map transformation
    this.transformationHandlers.set('map', async (record, config) => {
      if (config.fields) {
        const mappedValue: Record<string, any> = {};
        for (const [targetField, sourceField] of Object.entries(config.fields)) {
          mappedValue[targetField] = this.getNestedValue(record.value, sourceField as string);
        }
        return { ...record, value: mappedValue };
      }
      return record;
    });

    // Filter transformation
    this.transformationHandlers.set('filter', async (record, config) => {
      const matches = this.evaluateCondition(record.value, config.condition);
      return matches ? record : null;
    });

    // FlatMap transformation
    this.transformationHandlers.set('flatMap', async (record, config) => {
      const field = config.field || 'items';
      const items = this.getNestedValue(record.value, field);
      if (Array.isArray(items)) {
        return items.map((item, index) => ({
          ...record,
          id: `${record.id}_${index}`,
          value: config.preserveParent ? { ...record.value, item } : item,
        }));
      }
      return record;
    });

    // Aggregate transformation (handled in window processing)
    this.transformationHandlers.set('aggregate', async (record) => record);

    // Dedupe transformation
    this.transformationHandlers.set('dedupe', async (record, config) => {
      const dedupeKey = config.keyFields
        ? config.keyFields.map((f: string) => this.getNestedValue(record.value, f)).join('|')
        : record.key || record.id;

      const cacheKey = `dedupe:${config.id}:${dedupeKey}`;
      if (this.dedupeCache.has(cacheKey)) {
        return null;
      }
      this.dedupeCache.set(cacheKey, Date.now());

      // Clean old entries
      if (this.dedupeCache.size > (config.maxCacheSize || 10000)) {
        const cutoff = Date.now() - (config.windowMs || 300000);
        this.dedupeCache.forEach((timestamp, key) => {
          if (timestamp < cutoff) {
            this.dedupeCache.delete(key);
          }
        });
      }

      return record;
    });

    // Join transformation
    this.transformationHandlers.set('join', async (record, config) => {
      const lookupKey = this.getNestedValue(record.value, config.leftKey);
      const lookupData = await this.lookupJoinData(config.rightSource, lookupKey);

      if (lookupData || config.joinType !== 'inner') {
        return {
          ...record,
          value: {
            ...record.value,
            [config.resultField || 'joined']: lookupData,
          },
        };
      }
      return config.joinType === 'inner' ? null : record;
    });

    // Custom transformation
    this.transformationHandlers.set('custom', async (record, config) => {
      if (config.handler && typeof config.handler === 'function') {
        return await config.handler(record);
      }
      return record;
    });
  }

  private registerBuiltInEnrichments(): void {
    // API enrichment
    this.enrichmentHandlers.set('api', async (record, config) => {
      try {
        const url = this.interpolateString(config.url, record.value);
        const response = await this.makeHttpRequest(url, config);

        return {
          ...record,
          value: {
            ...record.value,
            [config.resultField || 'enriched']: response,
          },
        };
      } catch (error) {
        if (config.onError === 'skip') return record;
        throw error;
      }
    });

    // Database enrichment
    this.enrichmentHandlers.set('database', async (record, config) => {
      const lookupValue = this.getNestedValue(record.value, config.lookupField);
      const result = await this.queryDatabase(config, lookupValue);

      return {
        ...record,
        value: {
          ...record.value,
          [config.resultField || 'dbEnriched']: result,
        },
      };
    });

    // Cache enrichment
    this.enrichmentHandlers.set('cache', async (record, config) => {
      const cacheKey = this.interpolateString(config.keyPattern, record.value);
      const cached = this.enrichmentCache.get(cacheKey);

      if (cached) {
        return {
          ...record,
          value: {
            ...record.value,
            [config.resultField || 'cached']: cached,
          },
        };
      }
      return record;
    });

    // Lookup table enrichment
    this.enrichmentHandlers.set('lookup-table', async (record, config) => {
      const lookupKey = this.getNestedValue(record.value, config.keyField);
      const lookupTable = this.lookupTables.get(config.tableId);

      if (lookupTable) {
        const lookupValue = lookupTable.get(String(lookupKey));
        return {
          ...record,
          value: {
            ...record.value,
            [config.resultField || 'lookup']: lookupValue,
          },
        };
      }
      return record;
    });
  }

  // Utility methods
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateCondition(data: any, condition: string): boolean {
    try {
      const result = SecureExpressionEngineV2.evaluateExpression(
        condition,
        { data, Math, Array, Object, String, Number, Boolean },
        { timeout: 1000 }
      );
      if (!result.success) {
        return false;
      }
      return Boolean(result.value);
    } catch {
      return false;
    }
  }

  interpolateString(template: string, data: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      return String(this.getNestedValue(data, path) || '');
    });
  }

  private async lookupJoinData(source: string, value: any): Promise<any> {
    const cache = this.joinDataCache.get(source);
    return cache?.get(String(value));
  }

  private async makeHttpRequest(_url: string, _config: any): Promise<any> {
    // Simulated HTTP request
    return { status: 'ok', data: {} };
  }

  private async queryDatabase(_config: any, value: any): Promise<any> {
    // Simulated database query
    return { id: value, found: true };
  }
}
