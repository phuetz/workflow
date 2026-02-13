/**
 * QuickBooks Invoice Service
 * Handles all invoice-related operations
 */

import { EventEmitter } from 'events';
import type { APIClient } from './APIClient';
import type { Invoice, QueryOptions } from './types';

/**
 * Invoice Service for QuickBooks invoice operations
 */
export class InvoiceService {
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

  public async create(invoice: Invoice): Promise<Invoice> {
    const response = await this.apiClient.post<Invoice>('/invoice', invoice);
    this.eventEmitter.emit('invoiceCreated', response.data);
    return response.data;
  }

  public async get(id: string): Promise<Invoice> {
    const cached = this.getCached(`invoice:${id}`);
    if (cached) return cached;

    const response = await this.apiClient.get<Invoice>(`/invoice/${id}`);
    this.setCached(`invoice:${id}`, response.data, 60000);
    return response.data;
  }

  public async update(invoice: Invoice): Promise<Invoice> {
    const response = await this.apiClient.post<Invoice>('/invoice', invoice);
    this.invalidateCache(`invoice:${invoice.id}`);
    this.eventEmitter.emit('invoiceUpdated', response.data);
    return response.data;
  }

  public async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/invoice/${id}`);
    this.invalidateCache(`invoice:${id}`);
    this.eventEmitter.emit('invoiceDeleted', { id });
  }

  public async send(id: string, email?: string): Promise<void> {
    const params = email ? { sendTo: email } : {};
    await this.apiClient.post(`/invoice/${id}/send`, params);
    this.eventEmitter.emit('invoiceSent', { id, email });
  }

  public async query(options?: QueryOptions): Promise<Invoice[]> {
    const query = this.buildQuery('Invoice', options);
    const response = await this.apiClient.query<Invoice[]>(query);
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
