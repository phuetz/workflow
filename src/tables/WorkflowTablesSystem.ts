/**
 * Workflow Tables System
 * Built-in database tables for workflow data storage (Zapier Tables equivalent)
 * Main orchestrator - delegates to specialized managers
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

// Re-export all types from system/types.ts
export * from './system/types';

// Import managers
import { TableManager } from './system/TableManager';
import { RowManager } from './system/RowManager';
import { QueryEngine } from './system/QueryBuilder';
import { ImportExportManager, type ExportOptions, type ImportOptions } from './system/ImportExport';

// Import types
import type {
  Table,
  TableSchema,
  TableSettings,
  TablePermissions,
  TableMetadata,
  Row,
  Query,
  Condition,
  Aggregation,
  View,
  ViewType,
  ViewLayout,
  Filter,
  Sort,
  Transaction,
  IsolationLevel,
  Operation,
  TableAPI,
  TableMetrics,
  TablesConfig
} from './system/types';

export class WorkflowTablesSystem extends EventEmitter implements TableAPI {
  private tableManager: TableManager;
  private rowManager: RowManager;
  private queryEngine: QueryEngine;
  private importExportManager: ImportExportManager;
  private transactions: Map<string, Transaction> = new Map();
  private metrics: TableMetrics;
  private config: TablesConfig;

  constructor(config?: Partial<TablesConfig>) {
    super();
    this.config = {
      maxTables: 1000,
      maxRowsPerTable: 1000000,
      maxRowSize: 1024 * 1024,
      enableAudit: true,
      enableVersioning: true,
      enableFullTextSearch: true,
      storageEngine: 'memory',
      cacheSize: 100 * 1024 * 1024,
      ...config
    };

    this.tableManager = new TableManager(this.config);
    this.rowManager = new RowManager();
    this.queryEngine = new QueryEngine();
    this.importExportManager = new ImportExportManager();
    this.metrics = this.tableManager.createEmptyMetrics();

    this.initialize();
  }

  private initialize(): void {
    this.createSystemTables();
    this.startBackgroundTasks();
    this.setupEventHandlers();
    logger.debug('Workflow Tables System initialized');
  }

  // Table Operations
  async createTable(
    name: string,
    schema: TableSchema,
    options?: {
      description?: string;
      workspaceId?: string;
      settings?: Partial<TableSettings>;
      permissions?: TablePermissions;
      metadata?: TableMetadata;
    }
  ): Promise<Table> {
    const table = await this.tableManager.createTable(name, schema, options);
    this.metrics.tables++;
    this.emit('table:created', table);
    return table;
  }

  // CRUD Operations
  async create(tableId: string, data: any): Promise<Row> {
    const table = this.tableManager.getTable(tableId);
    const rows = this.tableManager.getTableRows(tableId)!;
    const indexes = this.tableManager.getIndexes(tableId);
    return this.rowManager.createRow(table, rows, indexes, data, this.metrics);
  }

  async read(tableId: string, id: string): Promise<Row | null> {
    const table = this.tableManager.getTable(tableId);
    const rows = this.tableManager.getTableRows(tableId)!;
    return this.rowManager.readRow(table, rows, id, this.metrics);
  }

  async update(tableId: string, id: string, data: any): Promise<Row> {
    const table = this.tableManager.getTable(tableId);
    const rows = this.tableManager.getTableRows(tableId)!;
    const indexes = this.tableManager.getIndexes(tableId);
    return this.rowManager.updateRow(table, rows, indexes, id, data, this.metrics);
  }

  async delete(tableId: string, id: string): Promise<boolean> {
    const table = this.tableManager.getTable(tableId);
    const rows = this.tableManager.getTableRows(tableId)!;
    const indexes = this.tableManager.getIndexes(tableId);
    return this.rowManager.deleteRow(table, rows, indexes, id, this.metrics);
  }

  // Bulk Operations
  async bulkCreate(tableId: string, data: any[]): Promise<Row[]> {
    const table = this.tableManager.getTable(tableId);
    const rows = this.tableManager.getTableRows(tableId)!;
    const indexes = this.tableManager.getIndexes(tableId);
    return this.rowManager.bulkCreate(table, rows, indexes, data, this.metrics);
  }

  async bulkUpdate(tableId: string, updates: Array<{id: string; data: any}>): Promise<Row[]> {
    const table = this.tableManager.getTable(tableId);
    const rows = this.tableManager.getTableRows(tableId)!;
    const indexes = this.tableManager.getIndexes(tableId);
    return this.rowManager.bulkUpdate(table, rows, indexes, updates, this.metrics);
  }

  async bulkDelete(tableId: string, ids: string[]): Promise<number> {
    const table = this.tableManager.getTable(tableId);
    const rows = this.tableManager.getTableRows(tableId)!;
    const indexes = this.tableManager.getIndexes(tableId);
    return this.rowManager.bulkDelete(table, rows, indexes, ids, this.metrics);
  }

  // Query Operations
  async find(tableId: string, query: Query): Promise<Row[]> {
    const table = this.tableManager.getTable(tableId);
    const rows = this.tableManager.getTableRows(tableId)!;
    const cacheKey = this.getQueryCacheKey(tableId, query);
    const cached = this.rowManager.getFromCache(cacheKey);
    if (cached) return cached;

    const results = await this.queryEngine.execute(rows, query);
    const filtered = results.filter(r => !r.deletedAt);

    this.rowManager.addToCache(cacheKey, filtered);
    table.stats.readCount++;
    this.metrics.operations.reads++;

    return filtered;
  }

  async findOne(tableId: string, query: Query): Promise<Row | null> {
    const results = await this.find(tableId, { ...query, limit: 1 });
    return results[0] || null;
  }

  async count(tableId: string, where?: Condition): Promise<number> {
    const table = this.tableManager.getTable(tableId);
    if (!where) return table.stats.rowCount;

    const rows = await this.find(tableId, { from: tableId, where });
    return rows.length;
  }

  async aggregate(tableId: string, aggregations: Aggregation[]): Promise<any> {
    const rows = this.tableManager.getTableRows(tableId);
    return this.queryEngine.aggregate(Array.from(rows?.values() || []), aggregations);
  }

  // Relationship Operations
  async getRelated(tableId: string, id: string, relationship: string): Promise<Row[]> {
    const table = this.tableManager.getTable(tableId);
    const rel = table.relationships.find(r => r.name === relationship);
    if (!rel) throw new Error(`Relationship ${relationship} not found`);

    const row = await this.read(tableId, id);
    if (!row) throw new Error('Row not found');

    const query: Query = {
      from: rel.targetTable,
      where: {
        operator: 'and',
        conditions: [{ field: rel.targetColumn, operator: '=', value: row.data[rel.sourceColumn] }]
      }
    };
    return this.find(rel.targetTable, query);
  }

  async associate(tableId: string, id: string, relationship: string, targetId: string): Promise<void> {
    const table = this.tableManager.getTable(tableId);
    const rel = table.relationships.find(r => r.name === relationship);
    if (!rel) throw new Error(`Relationship ${relationship} not found`);

    if (rel.type === 'one-to-one' || rel.type === 'one-to-many') {
      await this.update(rel.targetTable, targetId, { [rel.targetColumn]: id });
    }
    this.emit('relationship:associated', { tableId, id, relationship, targetId });
  }

  async dissociate(tableId: string, id: string, relationship: string, targetId: string): Promise<void> {
    const table = this.tableManager.getTable(tableId);
    const rel = table.relationships.find(r => r.name === relationship);
    if (!rel) throw new Error(`Relationship ${relationship} not found`);

    if (rel.type === 'one-to-one' || rel.type === 'one-to-many') {
      await this.update(rel.targetTable, targetId, { [rel.targetColumn]: null });
    }
    this.emit('relationship:dissociated', { tableId, id, relationship, targetId });
  }

  // View Operations
  async createView(tableId: string, name: string, type: ViewType, config: {
    query?: Query; filters?: Filter[]; sort?: Sort[];
    groupBy?: string[]; columns?: string[]; layout?: ViewLayout;
  }): Promise<View> {
    const table = this.tableManager.getTable(tableId);
    const view: View = {
      id: `view_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      name, type,
      query: config.query, filters: config.filters, sort: config.sort,
      groupBy: config.groupBy, columns: config.columns,
      layout: config.layout || { type, config: {} },
      shared: false, aggregations: []
    };
    table.views.push(view);
    this.emit('view:created', { table, view });
    return view;
  }

  // Transaction Operations
  async beginTransaction(isolation: IsolationLevel = 'read-committed'): Promise<Transaction> {
    const transaction: Transaction = {
      id: `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      operations: [], status: 'active', isolation, startedAt: new Date()
    };
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'active') throw new Error('Invalid transaction');

    try {
      for (const operation of transaction.operations) {
        await this.executeOperation(operation);
      }
      transaction.status = 'committed';
      transaction.committedAt = new Date();
    } catch (error) {
      await this.rollbackTransaction(transactionId);
      throw error;
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'active') throw new Error('Invalid transaction');
    transaction.status = 'rolled-back';
    transaction.rolledBackAt = new Date();
  }

  private async executeOperation(operation: Operation): Promise<void> {
    switch (operation.type) {
      case 'insert':
        await this.create(operation.tableId, operation.data);
        break;
      case 'update':
        const updateRows = await this.find(operation.tableId, { from: operation.tableId, where: operation.where });
        for (const row of updateRows) await this.update(operation.tableId, row.id, operation.data);
        break;
      case 'delete':
        const deleteRows = await this.find(operation.tableId, { from: operation.tableId, where: operation.where });
        for (const row of deleteRows) await this.delete(operation.tableId, row.id);
        break;
    }
  }

  // Import/Export Operations
  async exportTable(tableId: string, options: ExportOptions) {
    const table = this.tableManager.getTable(tableId);
    const rows = Array.from(this.tableManager.getTableRows(tableId)?.values() || []);
    return this.importExportManager.exportData(table, rows, options);
  }

  async importTable(tableId: string, data: string | Buffer, options: ImportOptions) {
    const table = this.tableManager.getTable(tableId);
    return this.importExportManager.importData(table, data, options, (rowData) => this.create(tableId, rowData));
  }

  // Helper Methods
  private getQueryCacheKey(tableId: string, query: Query): string {
    return `${tableId}:query:${JSON.stringify(query)}`;
  }

  private createSystemTables(): void {
    this.createTable('_metadata', {
      columns: [
        { id: 'id', name: 'id', type: 'text', dataType: { base: 'string' }, nullable: false },
        { id: 'key', name: 'key', type: 'text', dataType: { base: 'string' }, nullable: false },
        { id: 'value', name: 'value', type: 'json', dataType: { base: 'json' }, nullable: true }
      ],
      primaryKey: 'id'
    });

    if (this.config.enableAudit) {
      this.createTable('_audit_log', {
        columns: [
          { id: 'id', name: 'id', type: 'text', dataType: { base: 'string' }, nullable: false },
          { id: 'table_id', name: 'table_id', type: 'text', dataType: { base: 'string' }, nullable: false },
          { id: 'row_id', name: 'row_id', type: 'text', dataType: { base: 'string' }, nullable: false },
          { id: 'action', name: 'action', type: 'text', dataType: { base: 'string' }, nullable: false },
          { id: 'user', name: 'user', type: 'text', dataType: { base: 'string' }, nullable: true },
          { id: 'timestamp', name: 'timestamp', type: 'datetime', dataType: { base: 'datetime' }, nullable: false },
          { id: 'changes', name: 'changes', type: 'json', dataType: { base: 'json' }, nullable: true }
        ],
        primaryKey: 'id'
      });
    }
  }

  private startBackgroundTasks(): void {
    setInterval(() => this.updateStats(), 60000);
    setInterval(() => this.rowManager.cleanCache(), 300000);
  }

  private updateStats(): void {
    this.metrics.totalRows = 0;
    this.metrics.totalSize = 0;
    for (const table of this.tableManager.getAllTables()) {
      this.metrics.totalRows += table.stats.rowCount;
      this.metrics.totalSize += table.stats.sizeBytes;
    }
    if (this.metrics.operations.reads > 0) {
      this.metrics.performance.cacheHitRate = (this.rowManager.getCacheSize() / this.metrics.operations.reads) * 100;
    }
  }

  private setupEventHandlers(): void {
    this.on('table:created', (table) => logger.debug(`Table created: ${table.name}`));

    this.rowManager.on('row:created', ({ table, row }) => {
      if (table.settings.auditLog) this.createAuditLog(table.id, row.id, 'insert', row.createdBy);
      this.emit('row:created', { table, row });
    });

    this.rowManager.on('row:updated', ({ table, row, previous }) => {
      if (table.settings.auditLog) this.createAuditLog(table.id, row.id, 'update', row.updatedBy, { before: previous.data, after: row.data });
      this.emit('row:updated', { table, row, previous });
    });

    this.rowManager.on('row:deleted', ({ table, row }) => {
      if (table.settings.auditLog) this.createAuditLog(table.id, row.id, 'delete', row.deletedBy);
      this.emit('row:deleted', { table, row });
    });
  }

  private async createAuditLog(tableId: string, rowId: string, action: string, user?: string, changes?: any): Promise<void> {
    await this.create('_audit_log', { table_id: tableId, row_id: rowId, action, user: user || 'system', timestamp: new Date(), changes });
  }

  getMetrics(): TableMetrics { return { ...this.metrics }; }

  shutdown(): void {
    this.removeAllListeners();
    logger.debug('Workflow Tables System shut down');
  }
}

export const workflowTables = new WorkflowTablesSystem();
