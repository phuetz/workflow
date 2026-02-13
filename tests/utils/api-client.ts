/**
 * API Test Client
 * Utility for making authenticated API requests in tests
 */

import { TEST_CONFIG } from '../setup/integration-setup';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  status: number;
  headers: Headers;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  constructor(baseUrl: string = `http://localhost:${TEST_CONFIG.API_PORT}`) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string): void {
    this.token = token;
  }

  clearAuthToken(): void {
    this.token = null;
  }

  async login(email: string, password: string): Promise<string> {
    const response = await this.post<{ tokens: { accessToken: string } }>('/api/v1/auth/login', {
      email,
      password
    });

    if (response.data?.tokens.accessToken) {
      this.setAuthToken(response.data.tokens.accessToken);
      return response.data.tokens.accessToken;
    }

    throw new Error('Login failed');
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return this.request<T>(url.toString(), {
      method: 'GET'
    });
  }

  async post<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(`${this.baseUrl}${path}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(`${this.baseUrl}${path}`, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async patch<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(`${this.baseUrl}${path}`, {
      method: 'DELETE'
    });
  }

  private async request<T>(url: string, options: RequestInit): Promise<ApiResponse<T>> {
    const headers = { ...this.defaultHeaders };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });

    let data: T | undefined;
    let error: ApiResponse['error'] | undefined;

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      if (response.ok) {
        data = json;
      } else {
        error = {
          message: json.message || json.error || 'Request failed',
          code: json.code,
          details: json.details || json
        };
      }
    } else {
      const text = await response.text();
      if (response.ok) {
        data = text as unknown as T;
      } else {
        error = {
          message: text || 'Request failed'
        };
      }
    }

    return {
      data,
      error,
      status: response.status,
      headers: response.headers
    };
  }
}

// Create a default instance
export const apiClient = new ApiClient();
