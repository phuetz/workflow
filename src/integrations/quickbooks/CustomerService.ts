/**
 * QuickBooks Customer Service
 * Handles all customer-related operations
 */

import { EventEmitter } from 'events';
import type { APIClient } from './APIClient';
import type { Customer, QueryOptions } from './types';

/**
 * Customer Service for QuickBooks customer operations
 */
export class CustomerService {
  private apiClient: APIClient;
  private eventEmitter: EventEmitter;
  private cache: Map<string, { data: any; expiry: Date }>;
  private buildQuery: (entity: string, options?: QueryOptions) => string;

  constructor(
    apiClient: APIClient,
    eventEmitter: EventEmitter,
    cache: Map<string, { data: any; expiry: Date }>,
    buildQuery: (entity: string, options?: QueryOptions) => string
  ) {
    this.apiClient = apiClient;
    this.eventEmitter = eventEmitter;
    this.cache = cache;
    this.buildQuery = buildQuery;
  }

  public async create(customer: Customer): Promise<Customer> {
    const response = await this.apiClient.post<Customer>('/customer', customer);
    this.eventEmitter.emit('customerCreated', response.data);
    return response.data;
  }

  public async get(id: string): Promise<Customer> {
    const cached = this.getCached(`customer:${id}`);
    if (cached) return cached;

    const response = await this.apiClient.get<Customer>(`/customer/${id}`);
    this.setCached(`customer:${id}`, response.data, 60000);
    return response.data;
  }

  public async update(customer: Customer): Promise<Customer> {
    const response = await this.apiClient.post<Customer>('/customer', customer);
    this.invalidateCache(`customer:${customer.id}`);
    this.eventEmitter.emit('customerUpdated', response.data);
    return response.data;
  }

  public async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/customer/${id}`);
    this.invalidateCache(`customer:${id}`);
    this.eventEmitter.emit('customerDeleted', { id });
  }

  public async query(options?: QueryOptions): Promise<Customer[]> {
    const query = this.buildQuery('Customer', options);
    const response = await this.apiClient.query<Customer[]>(query);
    return response.data;
  }

  private getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCached(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: new Date(Date.now() + ttlMs)
    });
  }

  private invalidateCache(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}
