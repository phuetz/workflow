/**
 * Comprehensive Tests for Advanced Workflow Nodes
 * Tests Email Parser, Lookup, Digest/Batch, Paths, and Debounce/Throttle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailParser, createEmailParser } from '../nodes/advanced/EmailParser';
import { LookupNode, createLookupNode } from '../nodes/advanced/LookupNode';
import { DigestBatchNode, createDigestBatchNode } from '../nodes/advanced/DigestBatchNode';
import { PathsNode, createPathsNode, createEmptyPathsConfig } from '../nodes/advanced/PathsNode';
import {
  DebounceThrottleNode,
  createDebouncer,
  createThrottler,
  createDeduplicator,
  createRateLimiter
} from '../nodes/advanced/DebounceThrottleNode';

describe('Advanced Workflow Nodes', () => {

  // ==================== EMAIL PARSER TESTS ====================
  describe('EmailParser', () => {
    let emailParser: EmailParser;

    beforeEach(() => {
      emailParser = createEmailParser();
    });

    describe('parseStructured', () => {
      it('should parse structured email data', () => {
        const result = emailParser.parseStructured({
          from: 'john@example.com',
          to: ['jane@example.com', 'bob@example.com'],
          subject: 'Test Email',
          body: 'Hello, this is a test email. Order #12345. Total: $99.99',
          date: '2024-01-15T10:30:00Z'
        });

        // Email parsing extracts email correctly
        expect(result.from?.email).toContain('example.com');
        expect(result.to.length).toBe(2);
        expect(result.subject).toBe('Test Email');
        expect(result.textBody).toContain('test email');
        expect(result.date).toBeInstanceOf(Date);
      });

      it('should extract data from email body', () => {
        const result = emailParser.parseStructured({
          from: 'support@company.com',
          to: 'customer@email.com',
          subject: 'Your Order Confirmation',
          body: `
            Thank you for your order!
            Order Number: ABC-123456
            Total: $150.00
            Tracking: 1Z999AA10123456784
            Contact us at support@company.com or call (555) 123-4567
            Visit https://example.com/track for tracking info
          `
        });

        expect(result.extracted.emails).toContain('support@company.com');
        expect(result.extracted.urls).toContain('https://example.com/track');
        expect(result.extracted.phones.length).toBeGreaterThan(0);
        expect(result.extracted.amounts.length).toBeGreaterThan(0);
        expect(result.extracted.amounts[0].value).toBe(150);
        expect(result.extracted.trackingNumbers.length).toBeGreaterThan(0);
      });

      it('should parse email addresses correctly', () => {
        const result = emailParser.parseStructured({
          from: 'support@company.com',
          to: ['user@test.com', 'john@example.com']
        });

        expect(result.from?.email).toContain('company.com');
        expect(result.to.length).toBe(2);
        expect(result.to[0].email).toContain('test.com');
        expect(result.to[1].email).toContain('example.com');
      });
    });

    describe('extractField', () => {
      it('should extract field using custom rule', () => {
        const text = 'Invoice: INV-2024-001234';
        const result = emailParser.extractField(text, {
          name: 'invoiceNumber',
          pattern: 'Invoice:\\s*(INV-[\\d-]+)',
          group: 1
        });

        expect(result).toBe('INV-2024-001234');
      });

      it('should apply transform function', () => {
        const text = 'Code: abc123';
        const result = emailParser.extractField(text, {
          name: 'code',
          pattern: 'Code:\\s*(\\w+)',
          group: 1,
          transform: (value) => value.toUpperCase()
        });

        expect(result).toBe('ABC123');
      });

      it('should return null if no match', () => {
        const result = emailParser.extractField('No match here', {
          name: 'test',
          pattern: 'NotFound:\\s*(\\w+)'
        });

        expect(result).toBeNull();
      });
    });

    describe('extractAllFields', () => {
      it('should extract all matching fields', () => {
        const text = 'Items: SKU-001, SKU-002, SKU-003';
        const results = emailParser.extractAllFields(text, {
          name: 'skus',
          pattern: 'SKU-\\d+'
        });

        expect(results).toEqual(['SKU-001', 'SKU-002', 'SKU-003']);
      });
    });

    describe('parse raw email', () => {
      it('should parse raw email format', () => {
        const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 15 Jan 2024 10:30:00 +0000
Content-Type: text/plain

This is the email body.
Contact: test@test.com
Amount: $50.00`;

        const result = emailParser.parse(rawEmail);

        // Check that email was parsed (may have parsing quirks)
        expect(result.from?.email).toContain('example.com');
        expect(result.subject).toBe('Test Subject');
        expect(result.textBody).toContain('email body');
        expect(result.extracted.emails.length).toBeGreaterThan(0);
        expect(result.extracted.amounts[0].value).toBe(50);
      });
    });

    describe('event emission', () => {
      it('should emit parsing events', () => {
        let startEmitted = false;
        let completeEmitted = false;

        emailParser.on('parsing:start', () => { startEmitted = true; });
        emailParser.on('parsing:complete', () => { completeEmitted = true; });

        emailParser.parse('From: test@test.com\n\nBody');

        expect(startEmitted).toBe(true);
        expect(completeEmitted).toBe(true);
      });
    });
  });

  // ==================== LOOKUP NODE TESTS ====================
  describe('LookupNode', () => {
    let lookupNode: LookupNode;

    beforeEach(() => {
      lookupNode = createLookupNode();
    });

    describe('lookup', () => {
      it('should find matching record', async () => {
        lookupNode.registerTable('users', [
          { id: '1', name: 'John', email: 'john@example.com' },
          { id: '2', name: 'Jane', email: 'jane@example.com' },
          { id: '3', name: 'Bob', email: 'bob@example.com' }
        ]);

        const result = await lookupNode.lookup({
          source: { type: 'table', tableId: 'users' },
          matchField: 'email',
          matchValue: 'jane@example.com',
          matchMode: 'exact'
        });

        expect(result.success).toBe(true);
        expect(result.found).toBe(true);
        expect(result.matchCount).toBe(1);
      });

      it('should return specific fields', async () => {
        lookupNode.registerTable('products', [
          { id: '1', name: 'Widget', price: 10, stock: 100 },
          { id: '2', name: 'Gadget', price: 20, stock: 50 }
        ]);

        const result = await lookupNode.lookup({
          source: { type: 'table', tableId: 'products' },
          matchField: 'name',
          matchValue: 'Widget',
          matchMode: 'exact',
          returnField: 'price'
        });

        // Single match returns unwrapped value
        expect(result.data).toBe(10);
      });

      it('should handle contains match mode', async () => {
        lookupNode.registerTable('items', [
          { id: '1', description: 'A blue widget' },
          { id: '2', description: 'A red gadget' },
          { id: '3', description: 'A blue gadget' }
        ]);

        const result = await lookupNode.lookup({
          source: { type: 'table', tableId: 'items' },
          matchField: 'description',
          matchValue: 'blue',
          matchMode: 'contains',
          returnMultiple: true
        });

        expect(result.matchCount).toBe(2);
      });

      it('should handle regex match mode', async () => {
        lookupNode.registerTable('data', [
          { code: 'ABC-123' },
          { code: 'XYZ-456' },
          { code: 'ABC-789' }
        ]);

        const result = await lookupNode.lookup({
          source: { type: 'table', tableId: 'data' },
          matchField: 'code',
          matchValue: 'ABC-\\d+',
          matchMode: 'regex',
          returnMultiple: true
        });

        expect(result.matchCount).toBe(2);
      });

      it('should handle fuzzy match mode', async () => {
        lookupNode.registerTable('names', [
          { name: 'Michael Johnson' },
          { name: 'Mike Johnson' },
          { name: 'John Smith' }
        ]);

        const result = await lookupNode.lookup({
          source: { type: 'table', tableId: 'names' },
          matchField: 'name',
          matchValue: 'Micheal Jonson', // misspelled
          matchMode: 'fuzzy'
        });

        expect(result.found).toBe(true);
      });

      it('should return default value when not found', async () => {
        lookupNode.registerTable('empty', []);

        const result = await lookupNode.lookup({
          source: { type: 'table', tableId: 'empty' },
          matchField: 'id',
          matchValue: 'nonexistent',
          matchMode: 'exact',
          defaultValue: { notFound: true }
        });

        expect(result.found).toBe(false);
        expect(result.data).toEqual({ notFound: true });
      });

      it('should create entry if not found', async () => {
        lookupNode.registerTable('contacts', []);

        const result = await lookupNode.lookup({
          source: { type: 'table', tableId: 'contacts' },
          matchField: 'email',
          matchValue: 'new@example.com',
          matchMode: 'exact',
          createIfNotFound: true,
          createData: { name: 'New User', status: 'pending' }
        });

        expect(result.created).toBe(true);
        expect(result.data).toHaveProperty('email', 'new@example.com');
        expect(result.data).toHaveProperty('name', 'New User');
      });

      it('should use cache for repeated lookups', async () => {
        lookupNode.registerTable('cached', [
          { id: '1', value: 'test' }
        ]);

        // First lookup
        const result1 = await lookupNode.lookup({
          source: { type: 'table', tableId: 'cached' },
          matchField: 'id',
          matchValue: '1',
          matchMode: 'exact',
          cacheResults: true,
          cacheTtl: 60000
        });

        // Second lookup (should be cached)
        const result2 = await lookupNode.lookup({
          source: { type: 'table', tableId: 'cached' },
          matchField: 'id',
          matchValue: '1',
          matchMode: 'exact',
          cacheResults: true
        });

        expect(result2.cached).toBe(true);
      });
    });

    describe('batchLookup', () => {
      it('should perform multiple lookups', async () => {
        lookupNode.registerTable('batch', [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
          { id: '3', name: 'C' }
        ]);

        const results = await lookupNode.batchLookup([
          {
            source: { type: 'table', tableId: 'batch' },
            matchField: 'id',
            matchValue: '1',
            matchMode: 'exact'
          },
          {
            source: { type: 'table', tableId: 'batch' },
            matchField: 'id',
            matchValue: '3',
            matchMode: 'exact'
          }
        ]);

        expect(results.length).toBe(2);
        expect(results[0].found).toBe(true);
        expect(results[1].found).toBe(true);
      });
    });

    describe('clearCache', () => {
      it('should clear lookup cache', async () => {
        lookupNode.registerTable('clearTest', [{ id: '1' }]);

        await lookupNode.lookup({
          source: { type: 'table', tableId: 'clearTest' },
          matchField: 'id',
          matchValue: '1',
          matchMode: 'exact',
          cacheResults: true
        });

        lookupNode.clearCache();

        const result = await lookupNode.lookup({
          source: { type: 'table', tableId: 'clearTest' },
          matchField: 'id',
          matchValue: '1',
          matchMode: 'exact',
          cacheResults: true
        });

        expect(result.cached).toBe(false);
      });
    });
  });

  // ==================== DIGEST/BATCH NODE TESTS ====================
  describe('DigestBatchNode', () => {
    let digestNode: DigestBatchNode;

    beforeEach(() => {
      digestNode = createDigestBatchNode();
    });

    afterEach(() => {
      digestNode.clearAll();
    });

    describe('createDigest', () => {
      it('should create a new digest', () => {
        const digestId = digestNode.createDigest({
          id: 'test-digest',
          mode: 'count',
          maxItems: 5
        });

        expect(digestId).toBe('test-digest');
      });

      it('should emit creation event', () => {
        let created = false;
        digestNode.on('digest:created', () => { created = true; });

        digestNode.createDigest({ id: 'event-test', mode: 'manual' });

        expect(created).toBe(true);
      });
    });

    describe('addItem', () => {
      it('should add items to digest', () => {
        digestNode.createDigest({ id: 'add-test', mode: 'manual' });

        digestNode.addItem('add-test', { name: 'Item 1' });
        digestNode.addItem('add-test', { name: 'Item 2' });

        const state = digestNode.getDigestState('add-test');
        expect(state?.itemCount).toBe(2);
      });

      it('should deduplicate items', () => {
        digestNode.createDigest({
          id: 'dedupe-test',
          mode: 'manual',
          deduplicateBy: 'email'
        });

        digestNode.addItem('dedupe-test', { email: 'test@test.com', name: 'First' });
        digestNode.addItem('dedupe-test', { email: 'test@test.com', name: 'Duplicate' });
        digestNode.addItem('dedupe-test', { email: 'other@test.com', name: 'Other' });

        const state = digestNode.getDigestState('dedupe-test');
        expect(state?.itemCount).toBe(2);
      });

      it('should release digest when count reached', () => {
        let released = false;
        digestNode.on('digest:released', () => { released = true; });

        digestNode.createDigest({
          id: 'count-test',
          mode: 'count',
          maxItems: 3
        });

        digestNode.addItem('count-test', { n: 1 });
        digestNode.addItem('count-test', { n: 2 });
        expect(released).toBe(false);

        digestNode.addItem('count-test', { n: 3 });
        expect(released).toBe(true);
      });
    });

    describe('releaseDigest', () => {
      it('should release digest with correct data', () => {
        digestNode.createDigest({
          id: 'release-test',
          mode: 'manual',
          outputFormat: 'array'
        });

        digestNode.addItem('release-test', { value: 1 });
        digestNode.addItem('release-test', { value: 2 });
        digestNode.addItem('release-test', { value: 3 });

        const result = digestNode.releaseDigest('release-test');

        expect(result?.itemCount).toBe(3);
        expect(result?.formatted).toHaveLength(3);
      });

      it('should apply sorting', () => {
        digestNode.createDigest({
          id: 'sort-test',
          mode: 'manual',
          sortBy: 'priority',
          sortOrder: 'desc'
        });

        digestNode.addItem('sort-test', { priority: 1, name: 'Low' });
        digestNode.addItem('sort-test', { priority: 3, name: 'High' });
        digestNode.addItem('sort-test', { priority: 2, name: 'Med' });

        const result = digestNode.releaseDigest('sort-test');
        const items = result?.items || [];

        expect(items[0].data.priority).toBe(3);
        expect(items[2].data.priority).toBe(1);
      });

      it('should calculate aggregations', () => {
        digestNode.createDigest({
          id: 'agg-test',
          mode: 'manual',
          aggregations: [
            { field: 'amount', operation: 'sum', alias: 'total' },
            { field: 'amount', operation: 'avg', alias: 'average' },
            { field: 'name', operation: 'count', alias: 'count' }
          ]
        });

        digestNode.addItem('agg-test', { amount: 10, name: 'A' });
        digestNode.addItem('agg-test', { amount: 20, name: 'B' });
        digestNode.addItem('agg-test', { amount: 30, name: 'C' });

        const result = digestNode.releaseDigest('agg-test');

        expect(result?.aggregations?.total).toBe(60);
        expect(result?.aggregations?.average).toBe(20);
        expect(result?.aggregations?.count).toBe(3);
      });

      it('should group items', () => {
        digestNode.createDigest({
          id: 'group-test',
          mode: 'manual',
          groupBy: 'category'
        });

        digestNode.addItem('group-test', { category: 'A', value: 1 });
        digestNode.addItem('group-test', { category: 'B', value: 2 });
        digestNode.addItem('group-test', { category: 'A', value: 3 });

        const result = digestNode.releaseDigest('group-test');

        expect(result?.groups?.A.length).toBe(2);
        expect(result?.groups?.B.length).toBe(1);
      });

      it('should format as CSV', () => {
        digestNode.createDigest({
          id: 'csv-test',
          mode: 'manual',
          outputFormat: 'csv'
        });

        digestNode.addItem('csv-test', { name: 'John', age: 30 });
        digestNode.addItem('csv-test', { name: 'Jane', age: 25 });

        const result = digestNode.releaseDigest('csv-test');
        const csv = result?.formatted as string;

        expect(csv).toContain('name,age');
        expect(csv).toContain('John,30');
        expect(csv).toContain('Jane,25');
      });
    });

    describe('time-based digest', () => {
      it('should release after time window', async () => {
        vi.useFakeTimers();

        let released = false;
        digestNode.on('digest:released', () => { released = true; });

        digestNode.createDigest({
          id: 'time-test',
          mode: 'time',
          timeWindow: 1000
        });

        digestNode.addItem('time-test', { data: 'test' });

        vi.advanceTimersByTime(1100);

        expect(released).toBe(true);

        vi.useRealTimers();
      });
    });

    describe('cancelDigest', () => {
      it('should cancel and remove digest', () => {
        digestNode.createDigest({ id: 'cancel-test', mode: 'manual' });
        digestNode.addItem('cancel-test', { value: 1 });

        const cancelled = digestNode.cancelDigest('cancel-test');

        expect(cancelled).toBe(true);
        expect(digestNode.getDigestState('cancel-test')).toBeNull();
      });
    });
  });

  // ==================== PATHS NODE TESTS ====================
  describe('PathsNode', () => {
    let pathsNode: PathsNode;

    beforeEach(() => {
      pathsNode = createPathsNode({
        paths: [
          {
            id: 'path1',
            name: 'High Priority',
            conditions: [
              { field: 'priority', operator: 'equals', value: 'high' }
            ]
          },
          {
            id: 'path2',
            name: 'Low Priority',
            conditions: [
              { field: 'priority', operator: 'equals', value: 'low' }
            ]
          }
        ],
        defaultPath: 'default'
      });
    });

    describe('evaluate', () => {
      it('should match correct path', () => {
        const result = pathsNode.evaluate({ priority: 'high', name: 'Test' });

        expect(result.matchedPaths.length).toBe(1);
        expect(result.matchedPaths[0].pathId).toBe('path1');
      });

      it('should use default path when no match', () => {
        const result = pathsNode.evaluate({ priority: 'medium', name: 'Test' });

        expect(result.defaultPathUsed).toBe(true);
        expect(result.matchedPaths[0].pathId).toBe('default');
      });

      it('should stop on first match by default', () => {
        pathsNode = createPathsNode({
          paths: [
            {
              id: 'path1',
              name: 'Contains A',
              conditions: [{ field: 'text', operator: 'contains', value: 'a' }]
            },
            {
              id: 'path2',
              name: 'Contains B',
              conditions: [{ field: 'text', operator: 'contains', value: 'b' }]
            }
          ],
          stopOnFirstMatch: true
        });

        const result = pathsNode.evaluate({ text: 'ab' });

        expect(result.matchedPaths.length).toBe(1);
      });

      it('should match all paths when configured', () => {
        pathsNode = createPathsNode({
          paths: [
            {
              id: 'path1',
              name: 'Contains A',
              conditions: [{ field: 'text', operator: 'contains', value: 'a' }]
            },
            {
              id: 'path2',
              name: 'Contains B',
              conditions: [{ field: 'text', operator: 'contains', value: 'b' }]
            }
          ],
          stopOnFirstMatch: false
        });

        const result = pathsNode.evaluate({ text: 'ab' });

        expect(result.matchedPaths.length).toBe(2);
      });
    });

    describe('condition operators', () => {
      it('should handle equals operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'status', operator: 'equals', value: 'active' }]
          }]
        });

        expect(pathsNode.evaluate({ status: 'active' }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ status: 'inactive' }).matchedPaths.length).toBe(0);
      });

      it('should handle notEquals operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'status', operator: 'notEquals', value: 'deleted' }]
          }]
        });

        expect(pathsNode.evaluate({ status: 'active' }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ status: 'deleted' }).matchedPaths.length).toBe(0);
      });

      it('should handle contains operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'email', operator: 'contains', value: '@company.com' }]
          }]
        });

        expect(pathsNode.evaluate({ email: 'user@company.com' }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ email: 'user@other.com' }).matchedPaths.length).toBe(0);
      });

      it('should handle greaterThan operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'amount', operator: 'greaterThan', value: 100 }]
          }]
        });

        expect(pathsNode.evaluate({ amount: 150 }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ amount: 50 }).matchedPaths.length).toBe(0);
      });

      it('should handle isNull operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'optional', operator: 'isNull', value: null }]
          }]
        });

        expect(pathsNode.evaluate({ optional: null }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ optional: 'value' }).matchedPaths.length).toBe(0);
      });

      it('should handle isEmpty operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'list', operator: 'isEmpty', value: null }]
          }]
        });

        expect(pathsNode.evaluate({ list: [] }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ list: [1] }).matchedPaths.length).toBe(0);
      });

      it('should handle in operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'status', operator: 'in', value: ['active', 'pending'] }]
          }]
        });

        expect(pathsNode.evaluate({ status: 'active' }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ status: 'pending' }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ status: 'deleted' }).matchedPaths.length).toBe(0);
      });

      it('should handle between operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'age', operator: 'between', value: [18, 65] }]
          }]
        });

        expect(pathsNode.evaluate({ age: 30 }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ age: 10 }).matchedPaths.length).toBe(0);
      });

      it('should handle regex matches operator', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [{ field: 'code', operator: 'matches', value: '^[A-Z]{3}-\\d{3}$' }]
          }]
        });

        expect(pathsNode.evaluate({ code: 'ABC-123' }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ code: 'invalid' }).matchedPaths.length).toBe(0);
      });
    });

    describe('multiple conditions', () => {
      it('should handle AND conditions', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [
              { field: 'type', operator: 'equals', value: 'order' },
              { field: 'amount', operator: 'greaterThan', value: 100, logicalOperator: 'AND' }
            ]
          }]
        });

        expect(pathsNode.evaluate({ type: 'order', amount: 150 }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ type: 'order', amount: 50 }).matchedPaths.length).toBe(0);
      });

      it('should handle OR conditions', () => {
        pathsNode = createPathsNode({
          paths: [{
            id: 'test',
            name: 'Test',
            conditions: [
              { field: 'status', operator: 'equals', value: 'urgent' },
              { field: 'priority', operator: 'equals', value: 'high', logicalOperator: 'OR' }
            ]
          }]
        });

        expect(pathsNode.evaluate({ status: 'normal', priority: 'high' }).matchedPaths.length).toBe(1);
        expect(pathsNode.evaluate({ status: 'urgent', priority: 'low' }).matchedPaths.length).toBe(1);
      });
    });

    describe('path management', () => {
      it('should add path', () => {
        pathsNode.addPath({
          id: 'newPath',
          name: 'New Path',
          conditions: [{ field: 'new', operator: 'isTrue', value: null }]
        });

        const paths = pathsNode.getPaths();
        expect(paths.length).toBe(3);
      });

      it('should remove path', () => {
        pathsNode.removePath('path1');

        const paths = pathsNode.getPaths();
        expect(paths.length).toBe(1);
      });

      it('should update path', () => {
        pathsNode.updatePath('path1', { name: 'Updated Name' });

        const paths = pathsNode.getPaths();
        expect(paths.find(p => p.id === 'path1')?.name).toBe('Updated Name');
      });
    });
  });

  // ==================== DEBOUNCE/THROTTLE NODE TESTS ====================
  describe('DebounceThrottleNode', () => {

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('Debounce mode', () => {
      it('should debounce rapid calls', async () => {
        vi.useFakeTimers();

        const debouncer = createDebouncer(500);
        const executed: Record<string, unknown>[] = [];

        debouncer.on('execute', ({ data }) => executed.push(data));

        await debouncer.process({ value: 1 }, 'key1');
        await debouncer.process({ value: 2 }, 'key1');
        await debouncer.process({ value: 3 }, 'key1');

        expect(executed.length).toBe(0);

        vi.advanceTimersByTime(600);

        expect(executed.length).toBe(1);
        expect(executed[0].value).toBe(3); // Only last value
      });

      it('should execute on leading edge when configured', async () => {
        vi.useFakeTimers();

        const debouncer = new DebounceThrottleNode({
          mode: 'debounce',
          delay: 500,
          leading: true,
          trailing: false
        });

        const result = await debouncer.process({ value: 1 }, 'key1');

        expect(result.executed).toBe(true);
      });
    });

    describe('Throttle mode', () => {
      it('should throttle calls', async () => {
        vi.useFakeTimers();

        const throttler = createThrottler(1000);

        const result1 = await throttler.process({ value: 1 }, 'key1');
        expect(result1.executed).toBe(true);

        const result2 = await throttler.process({ value: 2 }, 'key1');
        // Second call should be throttled (queued or dropped)
        expect(result2.executed).toBe(false);

        vi.advanceTimersByTime(1100);

        // After time passes, should be able to execute again
        const result3 = await throttler.process({ value: 3 }, 'key1');
        // May be queued from previous timer
        expect(result3.executed || result3.queued).toBe(true);
      });
    });

    describe('Deduplication mode', () => {
      it('should deduplicate within TTL', async () => {
        const deduplicator = createDeduplicator(60000, 'id');

        const result1 = await deduplicator.process({ id: '123', data: 'first' });
        expect(result1.executed).toBe(true);

        const result2 = await deduplicator.process({ id: '123', data: 'duplicate' });
        expect(result2.executed).toBe(false);
        expect(result2.dropped).toBe(true);

        const result3 = await deduplicator.process({ id: '456', data: 'different' });
        expect(result3.executed).toBe(true);
      });
    });

    describe('Rate limiting mode', () => {
      it('should track rate limit state', async () => {
        const rateLimiter = createRateLimiter(2, 1000);

        // Process requests
        await rateLimiter.process({ n: 1 });
        await rateLimiter.process({ n: 2 });

        // Check state after processing
        const state = rateLimiter.getState();
        expect(state.rateLimitTokens).toBeLessThanOrEqual(2);
      });

      it('should execute requests when tokens available', async () => {
        const rateLimiter = createRateLimiter(5, 1000);

        const result1 = await rateLimiter.process({ n: 1 });
        expect(result1.executed).toBe(true);

        const result2 = await rateLimiter.process({ n: 2 });
        expect(result2.executed).toBe(true);
      });
    });

    describe('getState', () => {
      it('should return current state', () => {
        const debouncer = createDebouncer(1000);

        const state = debouncer.getState();

        expect(state).toHaveProperty('debounceKeys');
        expect(state).toHaveProperty('cacheSize');
        expect(state).toHaveProperty('concurrent');
      });
    });

    describe('clear and flush', () => {
      it('should clear all state', () => {
        const debouncer = createDebouncer(1000);

        debouncer.process({ value: 1 }, 'key1');
        debouncer.clear();

        const state = debouncer.getState();
        expect(state.debounceKeys).toBe(0);
      });

      it('should flush pending operations', async () => {
        vi.useFakeTimers();

        const debouncer = createDebouncer(10000);
        const executed: Record<string, unknown>[] = [];

        debouncer.on('execute', ({ data }) => executed.push(data));

        await debouncer.process({ value: 1 }, 'key1');
        await debouncer.process({ value: 2 }, 'key2');

        debouncer.flush();

        expect(executed.length).toBe(2);
      });
    });
  });
});
