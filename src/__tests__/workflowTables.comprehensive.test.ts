/**
 * Comprehensive Unit Tests for Workflow Tables
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkflowTablesManager,
  createWorkflowTables,
  TableDefinition,
  ColumnDefinition,
  TableRow,
  QueryOptions,
} from '../tables/WorkflowTables';

describe('WorkflowTablesManager', () => {
  let manager: WorkflowTablesManager;

  beforeEach(() => {
    manager = createWorkflowTables();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(manager).toBeInstanceOf(WorkflowTablesManager);
    });
  });

  describe('createTable', () => {
    it('should create a new table', async () => {
      const table = await manager.createTable({
        name: 'Users',
        columns: [
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'email', required: true },
          { name: 'age', type: 'number', required: false },
        ],
      });

      expect(table).toBeDefined();
      expect(table.id).toBeDefined();
      expect(table.name).toBe('Users');
      expect(table.columns.length).toBe(3);
    });

    it('should generate unique table IDs', async () => {
      const table1 = await manager.createTable({ name: 'Table1', columns: [] });
      const table2 = await manager.createTable({ name: 'Table2', columns: [] });

      expect(table1.id).not.toBe(table2.id);
    });

    it('should emit table:created event', async () => {
      let created = false;
      manager.on('table:created', () => { created = true; });

      await manager.createTable({ name: 'Test', columns: [] });

      expect(created).toBe(true);
    });

    it('should preserve provided columns', () => {
      const table = manager.createTable({
        name: 'WithAutoId',
        columns: [{ id: 'name_col', name: 'name', type: 'text' }],
      });

      const hasNameColumn = table.columns.some(c => c.name === 'name' && c.type === 'text');
      expect(hasNameColumn).toBe(true);
    });

    it('should support all column types', async () => {
      const columnTypes: Array<ColumnDefinition['type']> = [
        'text', 'number', 'boolean', 'date', 'datetime',
        'email', 'url', 'select', 'multiselect', 'json',
        'file', 'relation', 'formula', 'rollup', 'lookup', 'autonumber',
      ];

      const columns = columnTypes.map((type, i) => ({
        name: `col_${type}`,
        type,
      }));

      const table = await manager.createTable({ name: 'AllTypes', columns });

      expect(table.columns.length).toBeGreaterThanOrEqual(columnTypes.length);
    });

    it('should handle table with description', async () => {
      const table = await manager.createTable({
        name: 'Described',
        description: 'A table with description',
        columns: [],
      });

      expect(table.description).toBe('A table with description');
    });
  });

  describe('getTable', () => {
    it('should retrieve created table', async () => {
      const created = await manager.createTable({ name: 'GetTest', columns: [] });
      const retrieved = manager.getTable(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent table', () => {
      const result = manager.getTable('non_existent');
      expect(result).toBeUndefined();
    });
  });

  describe('listTables', () => {
    it('should list all tables', async () => {
      await manager.createTable({ name: 'List1', columns: [] });
      await manager.createTable({ name: 'List2', columns: [] });

      const tables = manager.listTables();

      expect(tables).toBeInstanceOf(Array);
      expect(tables.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array initially', () => {
      const freshManager = createWorkflowTables();
      const tables = freshManager.listTables();

      expect(tables).toEqual([]);
    });
  });

  describe('updateTable', () => {
    it('should update table name', () => {
      const table = manager.createTable({ name: 'Original', columns: [] });

      const updated = manager.updateTable(table.id, { name: 'Updated' });

      expect(updated).not.toBeNull();
      expect(manager.getTable(table.id)?.name).toBe('Updated');
    });

    it('should update table description', () => {
      const table = manager.createTable({ name: 'Desc', columns: [] });

      manager.updateTable(table.id, { description: 'New description' });

      expect(manager.getTable(table.id)?.description).toBe('New description');
    });

    it('should return null for non-existent table', () => {
      const result = manager.updateTable('non_existent', { name: 'New' });
      expect(result).toBeNull();
    });

    it('should emit table:updated event', () => {
      let updatedTable: TableDefinition | null = null;
      manager.on('table:updated', (table) => { updatedTable = table; });

      const table = manager.createTable({ name: 'Event', columns: [] });
      manager.updateTable(table.id, { name: 'EventUpdated' });

      expect(updatedTable?.id).toBe(table.id);
    });
  });

  describe('deleteTable', () => {
    it('should delete table', () => {
      const table = manager.createTable({ name: 'ToDelete', columns: [] });

      const deleted = manager.deleteTable(table.id);

      expect(deleted).toBe(true);
      expect(manager.getTable(table.id)).toBeUndefined();
    });

    it('should return false for non-existent table', () => {
      const result = manager.deleteTable('non_existent');
      expect(result).toBe(false);
    });

    it('should emit table:deleted event', () => {
      let deletedId: string | null = null;
      manager.on('table:deleted', (id) => { deletedId = id; });

      const table = manager.createTable({ name: 'DeleteEvent', columns: [] });
      manager.deleteTable(table.id);

      expect(deletedId).toBe(table.id);
    });
  });

  describe('addColumn', () => {
    it('should add column to table', () => {
      const table = manager.createTable({
        name: 'AddCol',
        columns: [{ id: 'existing_id', name: 'existing', type: 'text' }],
      });

      manager.addColumn(table.id, { id: 'new_id', name: 'newCol', type: 'number' });

      const updated = manager.getTable(table.id);
      expect(updated?.columns.some(c => c.name === 'newCol')).toBe(true);
    });

    it('should return null for non-existent table', () => {
      const result = manager.addColumn('non_existent', { id: 'col_id', name: 'col', type: 'text' });
      expect(result).toBeNull();
    });
  });

  describe('removeColumn', () => {
    it('should remove column from table', () => {
      const table = manager.createTable({
        name: 'RemoveCol',
        columns: [
          { id: 'keep_id', name: 'keep', type: 'text' },
          { id: 'remove_id', name: 'remove', type: 'text' },
        ],
      });

      manager.removeColumn(table.id, 'remove_id');

      const updated = manager.getTable(table.id);
      expect(updated?.columns.some(c => c.name === 'remove')).toBe(false);
    });

    it('should return null for non-existent column', () => {
      const table = manager.createTable({
        name: 'ProtectId',
        columns: [{ id: 'other_id', name: 'other', type: 'text' }],
      });

      const result = manager.removeColumn(table.id, 'non_existent_id');

      expect(result).toBeNull();
    });
  });

  describe('insertRow', () => {
    it('should insert row into table', async () => {
      const table = await manager.createTable({
        name: 'InsertRow',
        columns: [
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'email' },
        ],
      });

      const row = await manager.insertRow(table.id, {
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(row).toBeDefined();
      expect(row.id).toBeDefined();
      expect(row.data.name).toBe('John Doe');
    });

    it('should auto-generate row ID', async () => {
      const table = await manager.createTable({
        name: 'AutoId',
        columns: [{ name: 'value', type: 'text' }],
      });

      const row1 = await manager.insertRow(table.id, { value: 'first' });
      const row2 = await manager.insertRow(table.id, { value: 'second' });

      expect(row1.id).not.toBe(row2.id);
    });

    it('should emit row:inserted event', async () => {
      let insertedRow: TableRow | null = null;
      manager.on('row:inserted', (row) => { insertedRow = row; });

      const table = await manager.createTable({
        name: 'InsertEvent',
        columns: [{ name: 'value', type: 'text' }],
      });

      await manager.insertRow(table.id, { value: 'test' });

      expect(insertedRow).toBeDefined();
    });

    it('should validate required fields', async () => {
      const table = manager.createTable({
        name: 'Required',
        columns: [
          { name: 'required_field', type: 'text', required: true },
        ],
      });

      expect(() => manager.insertRow(table.id, {})).toThrow();
    });

    it('should add createdAt timestamp', () => {
      const table = manager.createTable({
        name: 'Timestamp',
        columns: [{ name: 'value', type: 'text' }],
      });

      const row = manager.insertRow(table.id, { value: 'test' });

      expect(row.createdAt).toBeDefined();
      expect(row.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('updateRow', () => {
    it('should update existing row', () => {
      const table = manager.createTable({
        name: 'UpdateRow',
        columns: [{ name: 'name', type: 'text' }],
      });

      const row = manager.insertRow(table.id, { name: 'Original' });
      manager.updateRow(table.id, row.id, { name: 'Updated' });

      const result = manager.query(table.id, {});
      const updated = result.rows.find(r => r.id === row.id);

      expect(updated?.data.name).toBe('Updated');
    });

    it('should add updatedAt timestamp', () => {
      const table = manager.createTable({
        name: 'UpdateTimestamp',
        columns: [{ name: 'name', type: 'text' }],
      });

      const row = manager.insertRow(table.id, { name: 'Test' });
      manager.updateRow(table.id, row.id, { name: 'Updated' });

      const result = manager.query(table.id, {});
      const updated = result.rows.find(r => r.id === row.id);

      expect(updated?.updatedAt).toBeDefined();
    });

    it('should emit row:updated event', () => {
      let updated = false;
      manager.on('row:updated', () => { updated = true; });

      const table = manager.createTable({
        name: 'UpdateEvent',
        columns: [{ name: 'name', type: 'text' }],
      });

      const row = manager.insertRow(table.id, { name: 'Test' });
      manager.updateRow(table.id, row.id, { name: 'Updated' });

      expect(updated).toBe(true);
    });
  });

  describe('deleteRow', () => {
    it('should delete row from table', () => {
      const table = manager.createTable({
        name: 'DeleteRow',
        columns: [{ name: 'name', type: 'text' }],
      });

      const row = manager.insertRow(table.id, { name: 'ToDelete' });
      manager.deleteRow(table.id, row.id);

      const result = manager.query(table.id, {});
      expect(result.rows.find(r => r.id === row.id)).toBeUndefined();
    });

    it('should emit row:deleted event', () => {
      let deleted = false;
      manager.on('row:deleted', () => { deleted = true; });

      const table = manager.createTable({
        name: 'DeleteEvent',
        columns: [{ name: 'name', type: 'text' }],
      });

      const row = manager.insertRow(table.id, { name: 'Test' });
      manager.deleteRow(table.id, row.id);

      expect(deleted).toBe(true);
    });
  });

  describe('query', () => {
    let tableId: string;

    beforeEach(() => {
      const table = manager.createTable({
        name: 'QueryTest',
        columns: [
          { name: 'name', type: 'text' },
          { name: 'age', type: 'number' },
          { name: 'active', type: 'boolean' },
        ],
      });
      tableId = table.id;

      manager.insertRow(tableId, { name: 'Alice', age: 25, active: true });
      manager.insertRow(tableId, { name: 'Bob', age: 30, active: false });
      manager.insertRow(tableId, { name: 'Charlie', age: 35, active: true });
      manager.insertRow(tableId, { name: 'Diana', age: 28, active: true });
    });

    it('should return all rows without filters', () => {
      const result = manager.query(tableId, {});

      expect(result.total).toBe(4);
      expect(result.rows.length).toBe(4);
    });

    it('should filter by exact match', () => {
      const result = manager.query(tableId, {
        filter: [{ column: 'name', operator: 'eq', value: 'Alice' }],
      });

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data.name).toBe('Alice');
    });

    it('should filter by boolean', () => {
      const result = manager.query(tableId, {
        filter: [{ column: 'active', operator: 'eq', value: true }],
      });

      expect(result.rows.length).toBe(3);
      expect(result.rows.every(r => r.data.active === true)).toBe(true);
    });

    it('should filter by number comparison', () => {
      const result = manager.query(tableId, {
        filter: [{ column: 'age', operator: 'gt', value: 28 }],
      });

      expect(result.rows.every(r => (r.data.age as number) > 28)).toBe(true);
    });

    it('should filter by less than', () => {
      const result = manager.query(tableId, {
        filter: [{ column: 'age', operator: 'lt', value: 30 }],
      });

      expect(result.rows.every(r => (r.data.age as number) < 30)).toBe(true);
    });

    it('should sort ascending', () => {
      const result = manager.query(tableId, {
        sort: [{ column: 'age', direction: 'asc' }],
      });

      for (let i = 1; i < result.rows.length; i++) {
        expect((result.rows[i].data.age as number) >= (result.rows[i - 1].data.age as number)).toBe(true);
      }
    });

    it('should sort descending', () => {
      const result = manager.query(tableId, {
        sort: [{ column: 'age', direction: 'desc' }],
      });

      for (let i = 1; i < result.rows.length; i++) {
        expect((result.rows[i].data.age as number) <= (result.rows[i - 1].data.age as number)).toBe(true);
      }
    });

    it('should limit results', () => {
      const result = manager.query(tableId, {
        limit: 2,
      });

      expect(result.rows.length).toBe(2);
    });

    it('should skip results with offset', () => {
      const allResult = manager.query(tableId, {});
      const offsetResult = manager.query(tableId, { offset: 2 });

      expect(offsetResult.rows.length).toBe(allResult.total - 2);
    });

    it('should combine filter, sort, and pagination', () => {
      const result = manager.query(tableId, {
        filter: [{ column: 'active', operator: 'eq', value: true }],
        sort: [{ column: 'age', direction: 'asc' }],
        limit: 2,
      });

      expect(result.rows.length).toBe(2);
      expect(result.rows.every(r => r.data.active === true)).toBe(true);
      expect((result.rows[0].data.age as number) <= (result.rows[1].data.age as number)).toBe(true);
    });

    it('should select specific fields', () => {
      const result = manager.query(tableId, {
        select: ['name', 'age'],
      });

      expect(result.rows[0].data.name).toBeDefined();
      expect(result.rows[0].data.age).toBeDefined();
    });
  });

  describe('bulkInsert', () => {
    it('should insert multiple rows', async () => {
      const table = await manager.createTable({
        name: 'BulkInsert',
        columns: [{ name: 'value', type: 'text' }],
      });

      const rows = await manager.bulkInsert(table.id, [
        { value: 'one' },
        { value: 'two' },
        { value: 'three' },
      ]);

      expect(rows.length).toBe(3);
    });

    it('should emit rows:bulk_inserted event', () => {
      let count = 0;
      manager.on('rows:bulk_inserted', (data) => { count = data.count; });

      const table = manager.createTable({
        name: 'BulkEvent',
        columns: [{ name: 'value', type: 'text' }],
      });

      manager.bulkInsert(table.id, [
        { value: 'a' },
        { value: 'b' },
      ]);

      expect(count).toBe(2);
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple rows', () => {
      const table = manager.createTable({
        name: 'BulkUpdate',
        columns: [
          { name: 'name', type: 'text' },
          { name: 'status', type: 'text' },
        ],
      });

      manager.bulkInsert(table.id, [
        { name: 'A', status: 'pending' },
        { name: 'B', status: 'pending' },
        { name: 'C', status: 'complete' },
      ]);

      manager.bulkUpdate(
        table.id,
        [{ column: 'status', operator: 'eq', value: 'pending' }],
        { status: 'processed' }
      );

      const result = manager.query(table.id, {
        filter: [{ column: 'status', operator: 'eq', value: 'processed' }],
      });

      expect(result.rows.length).toBe(2);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple rows', () => {
      const table = manager.createTable({
        name: 'BulkDelete',
        columns: [
          { name: 'name', type: 'text' },
          { name: 'active', type: 'boolean' },
        ],
      });

      manager.bulkInsert(table.id, [
        { name: 'A', active: true },
        { name: 'B', active: false },
        { name: 'C', active: false },
      ]);

      manager.bulkDelete(table.id, [{ column: 'active', operator: 'eq', value: false }]);

      const remaining = manager.query(table.id, {});
      expect(remaining.rows.length).toBe(1);
      expect(remaining.rows[0].data.name).toBe('A');
    });
  });

  describe('row count via query', () => {
    it('should return row count', () => {
      const table = manager.createTable({
        name: 'Count',
        columns: [{ name: 'value', type: 'text' }],
      });

      manager.bulkInsert(table.id, [
        { value: 'a' },
        { value: 'b' },
        { value: 'c' },
      ]);

      const result = manager.query(table.id, {});

      expect(result.total).toBe(3);
    });

    it('should return 0 for empty table', () => {
      const table = manager.createTable({
        name: 'Empty',
        columns: [],
      });

      const result = manager.query(table.id, {});

      expect(result.total).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate email format', () => {
      const table = manager.createTable({
        name: 'ValidateEmail',
        columns: [{ name: 'email', type: 'email', required: true }],
      });

      expect(() =>
        manager.insertRow(table.id, { email: 'invalid-email' })
      ).toThrow();
    });

    it('should validate url format', () => {
      const table = manager.createTable({
        name: 'ValidateUrl',
        columns: [{ name: 'url', type: 'url', required: true }],
      });

      expect(() =>
        manager.insertRow(table.id, { url: 'not-a-url' })
      ).toThrow();
    });

    it('should validate number type', () => {
      const table = manager.createTable({
        name: 'ValidateNumber',
        columns: [{ name: 'count', type: 'number', required: true }],
      });

      expect(() =>
        manager.insertRow(table.id, { count: 'not-a-number' })
      ).toThrow();
    });

    it('should accept valid email', async () => {
      const table = await manager.createTable({
        name: 'ValidEmail',
        columns: [{ name: 'email', type: 'email' }],
      });

      const row = await manager.insertRow(table.id, { email: 'test@example.com' });

      expect(row.data.email).toBe('test@example.com');
    });

    it('should accept valid url', async () => {
      const table = await manager.createTable({
        name: 'ValidUrl',
        columns: [{ name: 'url', type: 'url' }],
      });

      const row = await manager.insertRow(table.id, { url: 'https://example.com' });

      expect(row.data.url).toBe('https://example.com');
    });
  });

  describe('factory function', () => {
    it('should create manager instance', () => {
      const instance = createWorkflowTables();
      expect(instance).toBeInstanceOf(WorkflowTablesManager);
    });
  });
});
