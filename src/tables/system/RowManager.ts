/**
 * Row Manager - Row CRUD and bulk operations
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import type {
  Table,
  Row,
  Index,
  BulkOperation,
  BulkOperationType,
  TableTrigger,
  TriggerEvent,
  TriggerTiming,
  TableMetrics,
  CacheEntry
} from './types';
import { ColumnManager } from './ColumnManager';

export class RowManager extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private bulkOperations: Map<string, BulkOperation> = new Map();
  private columnManager: ColumnManager;

  constructor() {
    super();
    this.columnManager = new ColumnManager();
  }

  /**
   * Create a new row
   */
  async createRow(
    table: Table,
    rows: Map<string, Row>,
    indexes: Map<string, any> | undefined,
    data: any,
    metrics: TableMetrics
  ): Promise<Row> {
    // Validate data
    await this.columnManager.validateRowData(table, data);

    // Apply defaults
    const processedData = this.columnManager.applyDefaults(table, data);

    // Create row
    const row: Row = {
      id: this.generateRowId(),
      tableId: table.id,
      data: processedData,
      version: 1,
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      updatedBy: 'system'
    };

    // Store row
    rows.set(row.id, row);

    // Update indexes
    if (indexes) {
      await this.updateIndexes(table, indexes, row, 'insert');
    }

    // Trigger events
    await this.executeTriggers(table, 'insert', 'after', row);

    // Update stats
    table.stats.rowCount++;
    table.stats.writeCount++;
    metrics.operations.writes++;

    // Clear cache
    this.invalidateCache(table.id);

    this.emit('row:created', { table, row });
    return row;
  }

  /**
   * Read a row by ID
   */
  async readRow(
    table: Table,
    rows: Map<string, Row>,
    id: string,
    metrics: TableMetrics
  ): Promise<Row | null> {
    // Check cache
    const cached = this.getFromCache(`${table.id}:${id}`);
    if (cached) {
      return cached;
    }

    // Get row
    const row = rows.get(id) || null;

    if (row && !row.deletedAt) {
      // Update stats
      table.stats.readCount++;
      table.stats.lastAccessed = new Date();
      metrics.operations.reads++;

      // Cache result
      this.addToCache(`${table.id}:${id}`, row);

      return row;
    }

    return null;
  }

  /**
   * Update a row
   */
  async updateRow(
    table: Table,
    rows: Map<string, Row>,
    indexes: Map<string, any> | undefined,
    id: string,
    data: any,
    metrics: TableMetrics
  ): Promise<Row> {
    const existingRow = await this.readRow(table, rows, id, metrics);

    if (!existingRow) {
      throw new Error('Row not found');
    }

    // Validate update
    await this.columnManager.validateRowData(table, data, true);

    // Trigger before update
    await this.executeTriggers(table, 'update', 'before', existingRow);

    // Update row
    const updatedRow: Row = {
      ...existingRow,
      data: { ...existingRow.data, ...data },
      version: existingRow.version! + 1,
      updatedAt: new Date(),
      updatedBy: 'system'
    };

    // Store updated row
    rows.set(id, updatedRow);

    // Update indexes
    if (indexes) {
      await this.updateIndexes(table, indexes, updatedRow, 'update', existingRow);
    }

    // Trigger after update
    await this.executeTriggers(table, 'update', 'after', updatedRow);

    // Update stats
    table.stats.writeCount++;
    table.stats.lastModified = new Date();
    metrics.operations.writes++;

    // Clear cache
    this.invalidateCache(table.id);

    this.emit('row:updated', { table, row: updatedRow, previous: existingRow });
    return updatedRow;
  }

  /**
   * Delete a row
   */
  async deleteRow(
    table: Table,
    rows: Map<string, Row>,
    indexes: Map<string, any> | undefined,
    id: string,
    metrics: TableMetrics
  ): Promise<boolean> {
    const row = await this.readRow(table, rows, id, metrics);

    if (!row) {
      return false;
    }

    // Trigger before delete
    await this.executeTriggers(table, 'delete', 'before', row);

    if (table.settings.softDelete) {
      // Soft delete
      row.deletedAt = new Date();
      row.deletedBy = 'system';
      rows.set(id, row);
    } else {
      // Hard delete
      rows.delete(id);

      // Update indexes
      if (indexes) {
        await this.updateIndexes(table, indexes, row, 'delete');
      }
    }

    // Trigger after delete
    await this.executeTriggers(table, 'delete', 'after', row);

    // Update stats
    table.stats.rowCount--;
    table.stats.lastModified = new Date();
    metrics.operations.deletes++;

    // Clear cache
    this.invalidateCache(table.id);

    this.emit('row:deleted', { table, row });
    return true;
  }

  /**
   * Bulk create rows
   */
  async bulkCreate(
    table: Table,
    rows: Map<string, Row>,
    indexes: Map<string, any> | undefined,
    data: any[],
    metrics: TableMetrics
  ): Promise<Row[]> {
    const operation = this.createBulkOperation(table.id, 'insert', data.length);
    const createdRows: Row[] = [];

    try {
      for (const item of data) {
        try {
          const row = await this.createRow(table, rows, indexes, item, metrics);
          createdRows.push(row);
          operation.processedRows++;
        } catch (error) {
          operation.errors.push({
            row: operation.processedRows,
            error: (error as Error).message
          });
        }

        operation.progress = (operation.processedRows / operation.totalRows) * 100;
      }

      operation.status = 'completed';
    } catch (error) {
      operation.status = 'failed';
      throw error;
    } finally {
      operation.completedAt = new Date();
    }

    return createdRows;
  }

  /**
   * Bulk update rows
   */
  async bulkUpdate(
    table: Table,
    rows: Map<string, Row>,
    indexes: Map<string, any> | undefined,
    updates: Array<{id: string; data: any}>,
    metrics: TableMetrics
  ): Promise<Row[]> {
    const operation = this.createBulkOperation(table.id, 'update', updates.length);
    const updatedRows: Row[] = [];

    try {
      for (const update of updates) {
        try {
          const row = await this.updateRow(table, rows, indexes, update.id, update.data, metrics);
          updatedRows.push(row);
          operation.processedRows++;
        } catch (error) {
          operation.errors.push({
            row: operation.processedRows,
            error: (error as Error).message
          });
        }

        operation.progress = (operation.processedRows / operation.totalRows) * 100;
      }

      operation.status = 'completed';
    } catch (error) {
      operation.status = 'failed';
      throw error;
    } finally {
      operation.completedAt = new Date();
    }

    return updatedRows;
  }

  /**
   * Bulk delete rows
   */
  async bulkDelete(
    table: Table,
    rows: Map<string, Row>,
    indexes: Map<string, any> | undefined,
    ids: string[],
    metrics: TableMetrics
  ): Promise<number> {
    const operation = this.createBulkOperation(table.id, 'delete', ids.length);
    let deleted = 0;

    try {
      for (const id of ids) {
        try {
          const success = await this.deleteRow(table, rows, indexes, id, metrics);
          if (success) deleted++;
          operation.processedRows++;
        } catch (error) {
          operation.errors.push({
            row: operation.processedRows,
            error: (error as Error).message
          });
        }

        operation.progress = (operation.processedRows / operation.totalRows) * 100;
      }

      operation.status = 'completed';
    } catch (error) {
      operation.status = 'failed';
      throw error;
    } finally {
      operation.completedAt = new Date();
    }

    return deleted;
  }

  /**
   * Update indexes for a row
   */
  private async updateIndexes(
    table: Table,
    tableIndexes: Map<string, any>,
    row: Row,
    operation: 'insert' | 'update' | 'delete',
    oldRow?: Row
  ): Promise<void> {
    for (const index of table.indexes) {
      const indexMap = tableIndexes.get(index.id) || new Map();

      if (operation === 'delete' || (operation === 'update' && oldRow)) {
        // Remove old index entry
        const oldKey = this.getIndexKey(index, oldRow || row);
        indexMap.delete(oldKey);
      }

      if (operation === 'insert' || operation === 'update') {
        // Add new index entry
        const key = this.getIndexKey(index, row);

        if (index.unique && indexMap.has(key)) {
          throw new Error(`Unique constraint violation on index ${index.name}`);
        }

        indexMap.set(key, row.id);
      }

      tableIndexes.set(index.id, indexMap);
    }
  }

  /**
   * Get index key for a row
   */
  private getIndexKey(index: Index, row: Row): string {
    return index.columns.map(col => row.data[col]).join(':');
  }

  /**
   * Execute triggers for an event
   */
  private async executeTriggers(
    table: Table,
    event: TriggerEvent,
    timing: TriggerTiming,
    row: Row
  ): Promise<void> {
    const triggers = table.triggers.filter(
      t => t.event === event && t.timing === timing && t.enabled
    );

    for (const trigger of triggers) {
      if (trigger.condition && !this.evaluateExpression(trigger.condition, row.data)) {
        continue;
      }

      await this.executeTriggerAction(trigger, row);
    }
  }

  /**
   * Execute a trigger action
   */
  private async executeTriggerAction(trigger: TableTrigger, row: Row): Promise<void> {
    switch (trigger.action.type) {
      case 'webhook':
        logger.debug(`Webhook triggered: ${trigger.name}`);
        break;

      case 'workflow':
        logger.debug(`Workflow triggered: ${trigger.name}`);
        break;

      case 'notification':
        logger.debug(`Notification triggered: ${trigger.name}`);
        break;
    }

    this.emit('trigger:executed', { trigger, row });
  }

  /**
   * Evaluate expression (simple implementation)
   */
  private evaluateExpression(_expression: string, _data: any): boolean {
    try {
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create bulk operation
   */
  private createBulkOperation(
    tableId: string,
    type: BulkOperationType,
    totalRows: number
  ): BulkOperation {
    const operation: BulkOperation = {
      id: this.generateOperationId(),
      tableId,
      type,
      status: 'running',
      progress: 0,
      totalRows,
      processedRows: 0,
      errors: [],
      startedAt: new Date()
    };

    this.bulkOperations.set(operation.id, operation);
    return operation;
  }

  /**
   * Cache operations
   */
  getFromCache(key: string): any {
    const entry = this.cache.get(key);

    if (entry && Date.now() - entry.timestamp < 300000) {
      return entry.data;
    }

    return null;
  }

  addToCache(key: string, data: any): void {
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidateCache(tableId: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(tableId)) {
        this.cache.delete(key);
      }
    }
  }

  cleanCache(): void {
    const now = Date.now();
    const ttl = 300000;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * ID generators
   */
  private generateRowId(): string {
    return `row_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}
