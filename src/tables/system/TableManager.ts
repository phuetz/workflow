/**
 * Table Manager - Table CRUD operations
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import type {
  Table,
  TableSchema,
  TableSettings,
  TablePermissions,
  TableMetadata,
  Index,
  View,
  Row,
  TablesConfig,
  TableMetrics
} from './types';

export class TableManager extends EventEmitter {
  private tables: Map<string, Table> = new Map();
  private rows: Map<string, Map<string, Row>> = new Map();
  private indexes: Map<string, Map<string, any>> = new Map();
  private views: Map<string, View> = new Map();
  private config: TablesConfig;

  constructor(config: TablesConfig) {
    super();
    this.config = config;
  }

  /**
   * Create a new table
   */
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
    this.validateTableSchema(schema);

    if (this.tables.size >= this.config.maxTables) {
      throw new Error(`Maximum tables limit (${this.config.maxTables}) reached`);
    }

    const table: Table = {
      id: this.generateTableId(),
      name,
      description: options?.description,
      workspaceId: options?.workspaceId || 'default',
      schema,
      settings: this.createDefaultSettings(options?.settings),
      permissions: options?.permissions || this.createDefaultPermissions(),
      indexes: [],
      relationships: [],
      triggers: [],
      views: [],
      metadata: options?.metadata || {},
      stats: this.createDefaultStats(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tables.set(table.id, table);
    this.rows.set(table.id, new Map());

    await this.createDefaultIndexes(table);
    await this.createDefaultViews(table);

    this.emit('table:created', table);
    return table;
  }

  /**
   * Get table by ID
   */
  getTable(tableId: string): Table {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`Table ${tableId} not found`);
    }
    return table;
  }

  /**
   * Get table rows map
   */
  getTableRows(tableId: string): Map<string, Row> | undefined {
    return this.rows.get(tableId);
  }

  /**
   * Get all tables
   */
  getAllTables(): Table[] {
    return Array.from(this.tables.values());
  }

  /**
   * Get table count
   */
  getTableCount(): number {
    return this.tables.size;
  }

  /**
   * Delete table
   */
  async deleteTable(tableId: string): Promise<boolean> {
    const table = this.tables.get(tableId);
    if (!table) return false;

    this.tables.delete(tableId);
    this.rows.delete(tableId);
    this.indexes.delete(tableId);

    for (const view of table.views) {
      this.views.delete(view.id);
    }

    this.emit('table:deleted', table);
    return true;
  }

  /**
   * Update table metadata
   */
  async updateTableMetadata(
    tableId: string,
    updates: Partial<Pick<Table, 'name' | 'description' | 'metadata'>>
  ): Promise<Table> {
    const table = this.getTable(tableId);

    if (updates.name) table.name = updates.name;
    if (updates.description) table.description = updates.description;
    if (updates.metadata) table.metadata = { ...table.metadata, ...updates.metadata };

    table.updatedAt = new Date();

    this.emit('table:updated', table);
    return table;
  }

  /**
   * Validate table schema
   */
  validateTableSchema(schema: TableSchema): void {
    if (!schema.columns || schema.columns.length === 0) {
      throw new Error('Table must have at least one column');
    }

    if (!schema.primaryKey) {
      throw new Error('Table must have a primary key');
    }

    for (const column of schema.columns) {
      if (!column.name || !column.type) {
        throw new Error('Invalid column definition');
      }
    }
  }

  /**
   * Create default table indexes
   */
  private async createDefaultIndexes(table: Table): Promise<void> {
    const pkIndex: Index = {
      id: this.generateIndexId(),
      name: `pk_${table.name}`,
      columns: [table.schema.primaryKey],
      type: 'btree',
      unique: true
    };

    table.indexes.push(pkIndex);
    this.indexes.set(table.id, new Map());

    if (table.schema.uniqueKeys) {
      for (const uniqueKey of table.schema.uniqueKeys) {
        const index: Index = {
          id: this.generateIndexId(),
          name: `uk_${table.name}_${uniqueKey}`,
          columns: [uniqueKey],
          type: 'btree',
          unique: true
        };
        table.indexes.push(index);
      }
    }
  }

  /**
   * Create default views for table
   */
  private async createDefaultViews(table: Table): Promise<void> {
    const tableView: View = {
      id: this.generateViewId(),
      name: 'All Records',
      type: 'table',
      shared: true,
      columns: table.schema.columns.map(c => c.name)
    };

    table.views.push(tableView);
    this.views.set(tableView.id, tableView);
  }

  /**
   * Get table indexes map
   */
  getIndexes(tableId: string): Map<string, any> | undefined {
    return this.indexes.get(tableId);
  }

  /**
   * Create default settings
   */
  private createDefaultSettings(overrides?: Partial<TableSettings>): TableSettings {
    return {
      auditLog: this.config.enableAudit,
      softDelete: true,
      versioning: this.config.enableVersioning,
      fullTextSearch: this.config.enableFullTextSearch,
      caching: {
        enabled: true,
        ttl: 300000,
        strategy: 'memory'
      },
      pagination: {
        defaultLimit: 100,
        maxLimit: 1000,
        cursorBased: true
      },
      export: {
        formats: ['csv', 'json', 'excel'],
        maxRows: 100000,
        includeHeaders: true,
        includeMetadata: false
      },
      import: {
        formats: ['csv', 'json', 'excel'],
        maxRows: 100000,
        validation: 'strict',
        duplicateHandling: 'skip'
      },
      ...overrides
    };
  }

  /**
   * Create default permissions
   */
  private createDefaultPermissions(): TablePermissions {
    return {
      owner: 'system',
      public: { read: false, write: false, delete: false, admin: false },
      roles: [],
      users: [],
      apiKeys: []
    };
  }

  /**
   * Create default stats
   */
  private createDefaultStats(): Table['stats'] {
    return {
      rowCount: 0,
      sizeBytes: 0,
      lastModified: new Date(),
      lastAccessed: new Date(),
      readCount: 0,
      writeCount: 0,
      indexCount: 0,
      avgRowSize: 0
    };
  }

  /**
   * ID generators
   */
  private generateTableId(): string {
    return `tbl_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateIndexId(): string {
    return `idx_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateViewId(): string {
    return `view_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create empty metrics
   */
  createEmptyMetrics(): TableMetrics {
    return {
      tables: 0,
      totalRows: 0,
      totalSize: 0,
      operations: {
        reads: 0,
        writes: 0,
        deletes: 0
      },
      performance: {
        avgQueryTime: 0,
        avgWriteTime: 0,
        cacheHitRate: 0
      },
      topTables: []
    };
  }
}
