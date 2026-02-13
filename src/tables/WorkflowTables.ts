/**
 * Workflow Tables - Built-in Structured Data Storage
 * Similar to Zapier Tables / Airtable-like functionality
 */

import { EventEmitter } from 'events';

// Types
export interface TableDefinition {
  id: string;
  name: string;
  description?: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  permissions?: TablePermissions;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ColumnDefinition {
  id: string;
  name: string;
  type: ColumnType;
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  options?: ColumnOptions;
  validation?: ColumnValidation;
}

export type ColumnType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'file'
  | 'relation'
  | 'formula'
  | 'rollup'
  | 'lookup'
  | 'autonumber';

export interface ColumnOptions {
  choices?: Array<{ value: string; label: string; color?: string }>;
  relationTable?: string;
  relationColumn?: string;
  formula?: string;
  rollupFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  lookupColumn?: string;
  format?: string;
  precision?: number;
}

export interface ColumnValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: (value: unknown) => string | null;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface TablePermissions {
  read: string[];
  write: string[];
  delete: string[];
  admin: string[];
}

export interface TableRow {
  id: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  version: number;
}

export interface QueryOptions {
  filter?: FilterCondition[];
  sort?: SortCondition[];
  limit?: number;
  offset?: number;
  select?: string[];
}

export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: unknown;
  logic?: 'and' | 'or';
}

export type FilterOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'is_empty' | 'is_not_empty'
  | 'in' | 'not_in';

export interface SortCondition {
  column: string;
  direction: 'asc' | 'desc';
}

export interface QueryResult {
  rows: TableRow[];
  total: number;
  hasMore: boolean;
}

export interface TableChange {
  type: 'insert' | 'update' | 'delete';
  tableId: string;
  rowId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
}

/**
 * Workflow Tables Manager
 */
export class WorkflowTablesManager extends EventEmitter {
  private tables: Map<string, TableDefinition> = new Map();
  private rows: Map<string, Map<string, TableRow>> = new Map();
  private changeLog: TableChange[] = [];
  private autoNumberCounters: Map<string, number> = new Map();

  constructor() {
    super();
  }

  /**
   * Create a new table
   */
  createTable(definition: Omit<TableDefinition, 'id' | 'createdAt' | 'updatedAt'>): TableDefinition {
    const table: TableDefinition = {
      ...definition,
      id: this.generateId('table'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate column definitions
    this.validateColumns(table.columns);

    // Initialize storage
    this.tables.set(table.id, table);
    this.rows.set(table.id, new Map());

    // Initialize auto-number counters
    for (const col of table.columns.filter(c => c.type === 'autonumber')) {
      this.autoNumberCounters.set(`${table.id}_${col.id}`, 0);
    }

    this.emit('table:created', table);
    return table;
  }

  /**
   * Get table definition
   */
  getTable(tableId: string): TableDefinition | undefined {
    return this.tables.get(tableId);
  }

  /**
   * List all tables
   */
  listTables(): TableDefinition[] {
    return Array.from(this.tables.values());
  }

  /**
   * Update table definition
   */
  updateTable(tableId: string, updates: Partial<TableDefinition>): TableDefinition | null {
    const table = this.tables.get(tableId);
    if (!table) return null;

    const updated: TableDefinition = {
      ...table,
      ...updates,
      id: table.id, // Preserve ID
      createdAt: table.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    this.tables.set(tableId, updated);
    this.emit('table:updated', updated);
    return updated;
  }

  /**
   * Delete table
   */
  deleteTable(tableId: string): boolean {
    const table = this.tables.get(tableId);
    if (!table) return false;

    this.tables.delete(tableId);
    this.rows.delete(tableId);

    // Clean up auto-number counters
    for (const col of table.columns.filter(c => c.type === 'autonumber')) {
      this.autoNumberCounters.delete(`${tableId}_${col.id}`);
    }

    this.emit('table:deleted', tableId);
    return true;
  }

  /**
   * Add column to table
   */
  addColumn(tableId: string, column: ColumnDefinition): TableDefinition | null {
    const table = this.tables.get(tableId);
    if (!table) return null;

    // Check for duplicate column name
    if (table.columns.some(c => c.name === column.name)) {
      throw new Error(`Column ${column.name} already exists`);
    }

    table.columns.push(column);
    table.updatedAt = new Date();

    // Initialize auto-number counter if needed
    if (column.type === 'autonumber') {
      this.autoNumberCounters.set(`${tableId}_${column.id}`, 0);
    }

    this.emit('column:added', { tableId, column });
    return table;
  }

  /**
   * Remove column from table
   */
  removeColumn(tableId: string, columnId: string): TableDefinition | null {
    const table = this.tables.get(tableId);
    if (!table) return null;

    const columnIndex = table.columns.findIndex(c => c.id === columnId);
    if (columnIndex === -1) return null;

    const column = table.columns[columnIndex];
    table.columns.splice(columnIndex, 1);
    table.updatedAt = new Date();

    // Remove column data from all rows
    const tableRows = this.rows.get(tableId);
    if (tableRows) {
      for (const row of Array.from(tableRows.values())) {
        delete row.data[column.name];
      }
    }

    // Clean up auto-number counter
    if (column.type === 'autonumber') {
      this.autoNumberCounters.delete(`${tableId}_${columnId}`);
    }

    this.emit('column:removed', { tableId, columnId });
    return table;
  }

  /**
   * Insert a row
   */
  insertRow(tableId: string, data: Record<string, unknown>, userId?: string): TableRow {
    const table = this.tables.get(tableId);
    if (!table) {
      throw new Error(`Table ${tableId} not found`);
    }

    // Validate and process data
    const processedData = this.processRowData(table, data);

    const row: TableRow = {
      id: this.generateId('row'),
      data: processedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      version: 1,
    };

    // Store row
    const tableRows = this.rows.get(tableId)!;
    tableRows.set(row.id, row);

    // Log change
    this.logChange({
      type: 'insert',
      tableId,
      rowId: row.id,
      after: processedData,
      timestamp: new Date(),
      userId,
    });

    this.emit('row:inserted', { tableId, row });
    return row;
  }

  /**
   * Update a row
   */
  updateRow(tableId: string, rowId: string, data: Record<string, unknown>, userId?: string): TableRow | null {
    const table = this.tables.get(tableId);
    if (!table) return null;

    const tableRows = this.rows.get(tableId);
    if (!tableRows) return null;

    const row = tableRows.get(rowId);
    if (!row) return null;

    const before = { ...row.data };
    const processedData = this.processRowData(table, data, row.data);

    row.data = { ...row.data, ...processedData };
    row.updatedAt = new Date();
    row.version++;

    // Log change
    this.logChange({
      type: 'update',
      tableId,
      rowId,
      before,
      after: row.data,
      timestamp: new Date(),
      userId,
    });

    this.emit('row:updated', { tableId, row });
    return row;
  }

  /**
   * Delete a row
   */
  deleteRow(tableId: string, rowId: string, userId?: string): boolean {
    const tableRows = this.rows.get(tableId);
    if (!tableRows) return false;

    const row = tableRows.get(rowId);
    if (!row) return false;

    tableRows.delete(rowId);

    // Log change
    this.logChange({
      type: 'delete',
      tableId,
      rowId,
      before: row.data,
      timestamp: new Date(),
      userId,
    });

    this.emit('row:deleted', { tableId, rowId });
    return true;
  }

  /**
   * Get a row by ID
   */
  getRow(tableId: string, rowId: string): TableRow | undefined {
    return this.rows.get(tableId)?.get(rowId);
  }

  /**
   * Query rows with filtering, sorting, and pagination
   */
  query(tableId: string, options?: QueryOptions): QueryResult {
    const tableRows = this.rows.get(tableId);
    if (!tableRows) {
      return { rows: [], total: 0, hasMore: false };
    }

    let rows = Array.from(tableRows.values());

    // Apply filters
    if (options?.filter && options.filter.length > 0) {
      rows = this.applyFilters(rows, options.filter);
    }

    // Get total before pagination
    const total = rows.length;

    // Apply sorting
    if (options?.sort && options.sort.length > 0) {
      rows = this.applySorting(rows, options.sort);
    }

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    rows = rows.slice(offset, offset + limit);

    // Select specific columns
    if (options?.select && options.select.length > 0) {
      rows = rows.map(row => ({
        ...row,
        data: Object.fromEntries(
          Object.entries(row.data).filter(([key]) => options.select!.includes(key))
        ),
      }));
    }

    return {
      rows,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Apply filter conditions
   */
  private applyFilters(rows: TableRow[], filters: FilterCondition[]): TableRow[] {
    return rows.filter(row => {
      let result = true;
      let currentLogic: 'and' | 'or' = 'and';

      for (const filter of filters) {
        const value = row.data[filter.column];
        const matches = this.evaluateCondition(value, filter.operator, filter.value);

        if (currentLogic === 'and') {
          result = result && matches;
        } else {
          result = result || matches;
        }

        currentLogic = filter.logic || 'and';
      }

      return result;
    });
  }

  /**
   * Evaluate a single filter condition
   */
  private evaluateCondition(value: unknown, operator: FilterOperator, filterValue: unknown): boolean {
    switch (operator) {
      case 'eq':
        return value === filterValue;
      case 'neq':
        return value !== filterValue;
      case 'gt':
        return (value as number) > (filterValue as number);
      case 'gte':
        return (value as number) >= (filterValue as number);
      case 'lt':
        return (value as number) < (filterValue as number);
      case 'lte':
        return (value as number) <= (filterValue as number);
      case 'contains':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'not_contains':
        return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'starts_with':
        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'ends_with':
        return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'is_empty':
        return value === null || value === undefined || value === '';
      case 'is_not_empty':
        return value !== null && value !== undefined && value !== '';
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'not_in':
        return Array.isArray(filterValue) && !filterValue.includes(value);
      default:
        return true;
    }
  }

  /**
   * Apply sorting conditions
   */
  private applySorting(rows: TableRow[], sorts: SortCondition[]): TableRow[] {
    return [...rows].sort((a, b) => {
      for (const sort of sorts) {
        const aVal = a.data[sort.column];
        const bVal = b.data[sort.column];

        let comparison = 0;
        if (aVal === null || aVal === undefined) comparison = 1;
        else if (bVal === null || bVal === undefined) comparison = -1;
        else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = (aVal as number) - (bVal as number);
        }

        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Process and validate row data
   */
  private processRowData(
    table: TableDefinition,
    data: Record<string, unknown>,
    existingData?: Record<string, unknown>
  ): Record<string, unknown> {
    const processed: Record<string, unknown> = {};

    for (const column of table.columns) {
      let value = data[column.name];

      // Handle auto-number columns
      if (column.type === 'autonumber') {
        if (existingData?.[column.name] !== undefined) {
          value = existingData[column.name];
        } else {
          const counterKey = `${table.id}_${column.id}`;
          const counter = (this.autoNumberCounters.get(counterKey) || 0) + 1;
          this.autoNumberCounters.set(counterKey, counter);
          value = counter;
        }
      }

      // Apply default value if needed
      if ((value === undefined || value === null) && column.defaultValue !== undefined) {
        value = column.defaultValue;
      }

      // Handle formulas
      if (column.type === 'formula' && column.options?.formula) {
        value = this.evaluateFormula(column.options.formula, { ...existingData, ...data });
      }

      // Validate required fields
      if (column.required && (value === undefined || value === null || value === '')) {
        throw new Error(`Column ${column.name} is required`);
      }

      // Validate unique constraint
      if (column.unique && value !== undefined) {
        const existingRows = this.query(table.id, {
          filter: [{ column: column.name, operator: 'eq', value }],
        });
        if (existingRows.rows.length > 0) {
          throw new Error(`Value for ${column.name} must be unique`);
        }
      }

      // Type coercion and validation
      value = this.coerceAndValidate(value, column);

      if (value !== undefined) {
        processed[column.name] = value;
      }
    }

    return processed;
  }

  /**
   * Coerce value to correct type and validate
   */
  private coerceAndValidate(value: unknown, column: ColumnDefinition): unknown {
    if (value === undefined || value === null) return value;

    switch (column.type) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) throw new Error(`Invalid number for ${column.name}`);
        if (column.validation?.min !== undefined && num < column.validation.min) {
          throw new Error(`${column.name} must be at least ${column.validation.min}`);
        }
        if (column.validation?.max !== undefined && num > column.validation.max) {
          throw new Error(`${column.name} must be at most ${column.validation.max}`);
        }
        return num;

      case 'boolean':
        return Boolean(value);

      case 'date':
      case 'datetime':
        const date = new Date(value as string | number);
        if (isNaN(date.getTime())) throw new Error(`Invalid date for ${column.name}`);
        return date.toISOString();

      case 'email':
        const emailStr = String(value);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          throw new Error(`Invalid email for ${column.name}`);
        }
        return emailStr;

      case 'url':
        const urlStr = String(value);
        try {
          new URL(urlStr);
        } catch {
          throw new Error(`Invalid URL for ${column.name}`);
        }
        return urlStr;

      case 'select':
        const choices = column.options?.choices || [];
        if (choices.length > 0 && !choices.some(c => c.value === value)) {
          throw new Error(`Invalid choice for ${column.name}`);
        }
        return value;

      case 'multiselect':
        if (!Array.isArray(value)) {
          throw new Error(`${column.name} must be an array`);
        }
        const validChoices = column.options?.choices || [];
        if (validChoices.length > 0) {
          for (const v of value) {
            if (!validChoices.some(c => c.value === v)) {
              throw new Error(`Invalid choice ${v} for ${column.name}`);
            }
          }
        }
        return value;

      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            throw new Error(`Invalid JSON for ${column.name}`);
          }
        }
        return value;

      case 'text':
      default:
        const str = String(value);
        if (column.validation?.minLength !== undefined && str.length < column.validation.minLength) {
          throw new Error(`${column.name} must be at least ${column.validation.minLength} characters`);
        }
        if (column.validation?.maxLength !== undefined && str.length > column.validation.maxLength) {
          throw new Error(`${column.name} must be at most ${column.validation.maxLength} characters`);
        }
        if (column.validation?.pattern) {
          if (!new RegExp(column.validation.pattern).test(str)) {
            throw new Error(`${column.name} has invalid format`);
          }
        }
        return str;
    }
  }

  /**
   * Evaluate a simple formula
   */
  private evaluateFormula(formula: string, data: Record<string, unknown>): unknown {
    // Simple formula evaluation
    // Supports: {{column}} references and basic math
    let result = formula;

    // Replace column references
    result = result.replace(/\{\{(\w+)\}\}/g, (_, column) => {
      const value = data[column];
      return value !== undefined ? String(value) : '0';
    });

    // Evaluate math expressions (basic)
    try {
      // Simple and safe evaluation for basic math
      if (/^[\d\s+\-*/().]+$/.test(result)) {
        return Function(`'use strict'; return (${result})`)();
      }
    } catch {
      // Return formula string if evaluation fails
    }

    return result;
  }

  /**
   * Validate column definitions
   */
  private validateColumns(columns: ColumnDefinition[]): void {
    const names = new Set<string>();

    for (const column of columns) {
      if (!column.name) {
        throw new Error('Column name is required');
      }
      if (names.has(column.name)) {
        throw new Error(`Duplicate column name: ${column.name}`);
      }
      names.add(column.name);
    }
  }

  /**
   * Log a change
   */
  private logChange(change: TableChange): void {
    this.changeLog.push(change);

    // Keep only last 1000 changes
    if (this.changeLog.length > 1000) {
      this.changeLog = this.changeLog.slice(-1000);
    }
  }

  /**
   * Get change history for a table
   */
  getChangeHistory(tableId: string, limit?: number): TableChange[] {
    const changes = this.changeLog.filter(c => c.tableId === tableId);
    return limit ? changes.slice(-limit) : changes;
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Export table to JSON
   */
  exportToJSON(tableId: string): { definition: TableDefinition; rows: TableRow[] } | null {
    const table = this.tables.get(tableId);
    if (!table) return null;

    const rows = Array.from(this.rows.get(tableId)?.values() || []);
    return { definition: table, rows };
  }

  /**
   * Import table from JSON
   */
  importFromJSON(data: { definition: TableDefinition; rows: TableRow[] }, userId?: string): TableDefinition {
    const table = this.createTable({
      ...data.definition,
      createdBy: userId || data.definition.createdBy,
    });

    for (const row of data.rows) {
      this.insertRow(table.id, row.data, userId);
    }

    return table;
  }

  /**
   * Bulk insert rows
   */
  bulkInsert(tableId: string, rows: Array<Record<string, unknown>>, userId?: string): TableRow[] {
    const insertedRows: TableRow[] = [];

    for (const data of rows) {
      const row = this.insertRow(tableId, data, userId);
      insertedRows.push(row);
    }

    this.emit('rows:bulk_inserted', { tableId, count: insertedRows.length });
    return insertedRows;
  }

  /**
   * Bulk update rows
   */
  bulkUpdate(
    tableId: string,
    filter: FilterCondition[],
    updates: Record<string, unknown>,
    userId?: string
  ): number {
    const { rows } = this.query(tableId, { filter });
    let updatedCount = 0;

    for (const row of rows) {
      if (this.updateRow(tableId, row.id, updates, userId)) {
        updatedCount++;
      }
    }

    this.emit('rows:bulk_updated', { tableId, count: updatedCount });
    return updatedCount;
  }

  /**
   * Bulk delete rows
   */
  bulkDelete(tableId: string, filter: FilterCondition[], userId?: string): number {
    const { rows } = this.query(tableId, { filter });
    let deletedCount = 0;

    for (const row of rows) {
      if (this.deleteRow(tableId, row.id, userId)) {
        deletedCount++;
      }
    }

    this.emit('rows:bulk_deleted', { tableId, count: deletedCount });
    return deletedCount;
  }
}

// Export factory function
export function createWorkflowTables(): WorkflowTablesManager {
  return new WorkflowTablesManager();
}

export default WorkflowTablesManager;
