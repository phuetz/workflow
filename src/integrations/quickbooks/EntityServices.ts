/**
 * QuickBooks Entity Services
 * Handles operations for Bills, Expenses, Items, Accounts, Vendors, Employees, and Journal Entries
 */

import { EventEmitter } from 'events';
import type { APIClient } from './APIClient';
import type {
  Bill,
  Expense,
  Item,
  Account,
  Vendor,
  Employee,
  JournalEntry,
  QueryOptions
} from './types';

/**
 * Base Entity Service with common CRUD operations
 */
abstract class BaseEntityService<T extends { id?: string }> {
  protected apiClient: APIClient;
  protected eventEmitter: EventEmitter;
  protected cache: Map<string, { data: any; expiry: Date }>;
  protected buildQuery: (entity: string, options?: QueryOptions) => string;
  protected entityName: string;
  protected apiPath: string;

  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string,
    entityName: string,
    apiPath: string
  ) {
    this.apiClient = apiClient;
    this.eventEmitter = eventEmitter;
    this.cache = cache;
    this.buildQuery = buildQuery;
    this.entityName = entityName;
    this.apiPath = apiPath;
  }

  public async create(entity: T): Promise<T> {
    const response = await this.apiClient.post<T>(`/${this.apiPath}`, entity);
    this.eventEmitter.emit(`${this.entityName}Created`, response.data);
    return response.data;
  }

  public async get(id: string): Promise<T> {
    const cacheKey = `${this.entityName}:${id}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.apiClient.get<T>(`/${this.apiPath}/${id}`);
    this.setCached(cacheKey, response.data, 60000);
    return response.data;
  }

  public async update(entity: T): Promise<T> {
    const response = await this.apiClient.post<T>(`/${this.apiPath}`, entity);
    this.invalidateCache(`${this.entityName}:${entity.id}`);
    this.eventEmitter.emit(`${this.entityName}Updated`, response.data);
    return response.data;
  }

  public async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/${this.apiPath}/${id}`);
    this.invalidateCache(`${this.entityName}:${id}`);
    this.eventEmitter.emit(`${this.entityName}Deleted`, { id });
  }

  public async query(options?: QueryOptions): Promise<T[]> {
    const query = this.buildQuery(this.entityName, options);
    const response = await this.apiClient.query<T[]>(query);
    return response.data;
  }

  protected getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  protected setCached(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: new Date(Date.now() + ttlMs)
    });
  }

  protected invalidateCache(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

/**
 * Bill Service
 */
export class BillService extends BaseEntityService<Bill> {
  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string
  ) {
    super(apiClient, eventEmitter, cache, buildQuery, 'bill', 'bill');
  }
}

/**
 * Expense Service
 */
export class ExpenseService extends BaseEntityService<Expense> {
  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string
  ) {
    super(apiClient, eventEmitter, cache, buildQuery, 'expense', 'purchase');
  }

  // Override query to use correct entity name for QuickBooks API
  public async query(options?: QueryOptions): Promise<Expense[]> {
    const query = this.buildQuery('Purchase', options);
    const response = await this.apiClient.query<Expense[]>(query);
    return response.data;
  }
}

/**
 * Item Service
 */
export class ItemService extends BaseEntityService<Item> {
  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string
  ) {
    super(apiClient, eventEmitter, cache, buildQuery, 'item', 'item');
  }

  // Override query to use correct entity name
  public async query(options?: QueryOptions): Promise<Item[]> {
    const query = this.buildQuery('Item', options);
    const response = await this.apiClient.query<Item[]>(query);
    return response.data;
  }
}

/**
 * Account Service (no delete operation for accounts)
 */
export class AccountService extends BaseEntityService<Account> {
  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string
  ) {
    super(apiClient, eventEmitter, cache, buildQuery, 'account', 'account');
  }

  // Override query to use correct entity name
  public async query(options?: QueryOptions): Promise<Account[]> {
    const query = this.buildQuery('Account', options);
    const response = await this.apiClient.query<Account[]>(query);
    return response.data;
  }

  // Accounts cannot be deleted in QuickBooks, only deactivated
  public async delete(_id: string): Promise<void> {
    throw new Error('Accounts cannot be deleted in QuickBooks. Use update to deactivate.');
  }
}

/**
 * Vendor Service
 */
export class VendorService extends BaseEntityService<Vendor> {
  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string
  ) {
    super(apiClient, eventEmitter, cache, buildQuery, 'vendor', 'vendor');
  }

  // Override query to use correct entity name
  public async query(options?: QueryOptions): Promise<Vendor[]> {
    const query = this.buildQuery('Vendor', options);
    const response = await this.apiClient.query<Vendor[]>(query);
    return response.data;
  }
}

/**
 * Employee Service (no delete operation for employees)
 */
export class EmployeeService extends BaseEntityService<Employee> {
  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string
  ) {
    super(apiClient, eventEmitter, cache, buildQuery, 'employee', 'employee');
  }

  // Override query to use correct entity name
  public async query(options?: QueryOptions): Promise<Employee[]> {
    const query = this.buildQuery('Employee', options);
    const response = await this.apiClient.query<Employee[]>(query);
    return response.data;
  }

  // Employees cannot be deleted in QuickBooks, only deactivated
  public async delete(_id: string): Promise<void> {
    throw new Error('Employees cannot be deleted in QuickBooks. Use update to deactivate.');
  }
}

/**
 * Journal Entry Service
 */
export class JournalEntryService extends BaseEntityService<JournalEntry> {
  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string
  ) {
    super(apiClient, eventEmitter, cache, buildQuery, 'journalEntry', 'journalentry');
  }

  // Override query to use correct entity name
  public async query(options?: QueryOptions): Promise<JournalEntry[]> {
    const query = this.buildQuery('JournalEntry', options);
    const response = await this.apiClient.query<JournalEntry[]>(query);
    return response.data;
  }
}
