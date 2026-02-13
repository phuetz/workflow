/**
 * QuickBooks Payment Service
 * Handles all payment-related operations
 */

import { EventEmitter } from 'events';
import type { APIClient } from './APIClient';
import type { Payment, QueryOptions } from './types';

/**
 * Payment Service for QuickBooks payment operations
 */
export class PaymentService {
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

  public async create(payment: Payment): Promise<Payment> {
    const response = await this.apiClient.post<Payment>('/payment', payment);
    this.eventEmitter.emit('paymentCreated', response.data);
    return response.data;
  }

  public async get(id: string): Promise<Payment> {
    const cached = this.getCached(`payment:${id}`);
    if (cached) return cached;

    const response = await this.apiClient.get<Payment>(`/payment/${id}`);
    this.setCached(`payment:${id}`, response.data, 60000);
    return response.data;
  }

  public async update(payment: Payment): Promise<Payment> {
    const response = await this.apiClient.post<Payment>('/payment', payment);
    this.invalidateCache(`payment:${payment.id}`);
    this.eventEmitter.emit('paymentUpdated', response.data);
    return response.data;
  }

  public async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/payment/${id}`);
    this.invalidateCache(`payment:${id}`);
    this.eventEmitter.emit('paymentDeleted', { id });
  }

  public async query(options?: QueryOptions): Promise<Payment[]> {
    const query = this.buildQuery('Payment', options);
    const response = await this.apiClient.query<Payment[]>(query);
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
