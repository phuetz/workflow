/**
 * QuickBooks API Client
 * Handles HTTP communication with QuickBooks API
 */

import type { AuthManager } from './AuthClient';
import type {
  QuickBooksConfig,
  QuickBooksResponse,
  Report,
  BatchOperation
} from './types';

/**
 * API Client for QuickBooks HTTP requests
 */
export class APIClient {
  private authManager: AuthManager;
  private config: QuickBooksConfig;

  constructor(authManager: AuthManager, config: QuickBooksConfig) {
    this.authManager = authManager;
    this.config = config;
  }

  private getBaseUrl(): string {
    const env = this.authManager.getEnvironment();
    return env === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';
  }

  public async get<T>(path: string): Promise<QuickBooksResponse<T>> {
    // Simulated API call
    return {
      data: {} as T,
      time: new Date().toISOString(),
      status: 200,
      headers: {}
    };
  }

  public async post<T>(path: string, data: any): Promise<QuickBooksResponse<T>> {
    // Simulated API call
    return {
      data: data as T,
      time: new Date().toISOString(),
      status: 200,
      headers: {}
    };
  }

  public async delete(path: string): Promise<QuickBooksResponse<void>> {
    // Simulated API call
    return {
      data: undefined,
      time: new Date().toISOString(),
      status: 204,
      headers: {}
    };
  }

  public async query<T>(query: string): Promise<QuickBooksResponse<T>> {
    // Simulated API call
    return {
      data: [] as any,
      time: new Date().toISOString(),
      status: 200,
      headers: {}
    };
  }

  public async getReport(reportName: string, params: any): Promise<QuickBooksResponse<Report>> {
    // Simulated API call
    return {
      data: {
        header: { reportName },
        columns: [],
        rows: []
      },
      time: new Date().toISOString(),
      status: 200,
      headers: {}
    };
  }

  public async batch(operations: BatchOperation[]): Promise<QuickBooksResponse<any[]>> {
    // Simulated API call
    return {
      data: operations.map(op => ({ bId: op.bId, result: {} })),
      time: new Date().toISOString(),
      status: 200,
      headers: {}
    };
  }
}

/**
 * Rate Limiter for API requests
 */
export class RateLimiter {
  private requests: number[] = [];
  private config: { maxRequests: number; windowMs: number };

  constructor(config: { maxRequests: number; windowMs: number }) {
    this.config = config;
  }

  public async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.config.windowMs);

    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.config.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}
