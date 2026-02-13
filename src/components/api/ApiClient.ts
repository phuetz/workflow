/**
 * API Client with Authentication & Error Handling
 * Centralized HTTP client for all backend communication
 */

import { authService } from '../../services/auth';
import { securityManager } from '../../backend/security/SecurityManager';

interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  skipRateLimit?: boolean;
}

export class ApiClient {
  private baseURL: string;
  private defaultTimeout = 30000;
  private maxRetries = 3;
  private retryDelay = 1000;

  // Rate limiting state
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute window
  private readonly RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per minute

  constructor() {
    this.baseURL = process.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  }

  private checkRateLimit(endpoint: string): boolean {
    const now = Date.now();
    const key = endpoint.split('?')[0]; // Normalize endpoint
    const current = this.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new window
      this.requestCounts.set(key, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }

    if (current.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    current.count++;
    return true;
  }

  // ================================
  // HTTP METHODS
  // ================================

  async get<T = unknown>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  async post<T = unknown>(endpoint: string, data?: unknown, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, config);
  }

  async put<T = unknown>(endpoint: string, data?: unknown, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  async patch<T = unknown>(endpoint: string, data?: unknown, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, config);
  }

  async delete<T = unknown>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }

  // ================================
  // CORE REQUEST METHOD
  // ================================

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {

    // Rate limiting check
    if (!config.skipRateLimit) {
      const allowed = this.checkRateLimit(endpoint);
      if (!allowed) {
        throw new ApiError('Rate limit exceeded. Please wait before making more requests.', 429);
      }
    }

    let lastError: Error | null = null;
    const maxRetries = config.retry ?? this.maxRetries;
    const delay = config.retryDelay ?? this.retryDelay;
    const timeout = config.timeout ?? this.defaultTimeout;
    const url = `${this.baseURL}${endpoint}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest<T>(method, url, data, config, timeout);

        // Log successful API call
        await securityManager.logAction({
          action: `api_${method.toLowerCase()}`,
          resourceType: 'api',
          severity: 'low',
          newValues: { endpoint, status: 'success', attempt: attempt + 1 }
        });

        return response;

      } catch (error) {
        lastError = error as Error;

        // Don't retry for certain error types
        if (error instanceof ApiError) {
          if ([400, 401, 403, 404, 422].includes(error.status)) {
            break;
          }
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(delay);
        }
      }
    }

    // Log failed API call
    await securityManager.logAction({
      action: `api_${method.toLowerCase()}_failed`,
      resourceType: 'api',
      severity: 'medium',
      newValues: {
        endpoint,
        error: lastError?.message,
        attempts: maxRetries + 1
      }
    });

    throw lastError;
  }

  private async makeRequest<T>(
    method: string,
    url: string,
    data: unknown,
    config: RequestConfig,
    timeout: number
  ): Promise<ApiResponse<T>> {

    const headers = this.buildHeaders(config);

    const requestInit: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout)
    };

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      requestInit.body = JSON.stringify(securityManager.sanitizeInput(data));
    }

    // Make the request
    const response = await fetch(url, requestInit);
    const contentType = response.headers.get('content-type');

    // Handle non-JSON responses
    if (!contentType?.includes('application/json')) {
      throw new ApiError('Invalid response format', response.status);
    }

    const responseData = await response.json() as ApiResponse<T>;

    // Handle error responses
    if (!response.ok) {
      throw new ApiError(
        responseData.message || `HTTP ${response.status} error`,
        response.status,
        responseData.errors
      );
    }

    return responseData;
  }

  // ================================
  // AUTHENTICATION HELPERS
  // ================================

  private buildHeaders(config: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Version': '1.0.0',
      'X-Requested-With': 'XMLHttpRequest',
      ...config.headers
    };

    // Add authentication header
    if (!config.skipAuth && authService.isAuthenticated()) {
      headers['Authorization'] = authService.getAuthHeader();
    }

    // Add CSRF protection
    const csrfToken = this.getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    // Add request ID for tracing
    headers['X-Request-ID'] = this.generateRequestId();

    return headers;
  }

  private getCSRFToken(): string | null {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null;
  }

  private generateRequestId(): string {
    // Use crypto.getRandomValues() for secure random generation
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return `req_${Date.now()}_${Array.from(array, num => num.toString(36)).join('')}`;
  }

  // ================================
  // SPECIALIZED API METHODS
  // ================================

  // Workflows API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getWorkflows(_params: unknown = {}) {
    return this.get('/workflows', { headers: { 'X-Resource': 'workflows' } });
  }

  async createWorkflow(workflow: unknown) {
    return this.post('/workflows', workflow);
  }

  async updateWorkflow(id: string, updates: unknown) {
    return this.put(`/workflows/${id}`, updates);
  }

  async deleteWorkflow(id: string) {
    return this.delete(`/workflows/${id}`);
  }

  async executeWorkflow(id: string, input?: unknown) {
    return this.post(`/workflows/${id}/execute`, { input });
  }

  // Executions API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getExecutions(workflowId?: string, _params: unknown = {}) {
    const endpoint = workflowId ? `/executions?workflowId=${workflowId}` : '/executions';
    return this.get(endpoint, { headers: { 'X-Resource': 'executions' } });
  }

  async getExecution(id: string) {
    return this.get(`/executions/${id}`);
  }

  async cancelExecution(id: string) {
    return this.post(`/executions/${id}/cancel`);
  }

  async retryExecution(id: string) {
    return this.post(`/executions/${id}/retry`);
  }

  // Credentials API
  async getCredentials() {
    return this.get('/credentials', { headers: { 'X-Resource': 'credentials' } });
  }

  async createCredential(credential: unknown) {
    return this.post('/credentials', credential);
  }

  async updateCredential(id: string, updates: unknown) {
    return this.put(`/credentials/${id}`, updates);
  }

  async deleteCredential(id: string) {
    return this.delete(`/credentials/${id}`);
  }

  async testCredential(id: string) {
    return this.post(`/credentials/${id}/test`);
  }

  // Webhooks API
  async getWebhooks() {
    return this.get('/webhooks');
  }

  async createWebhook(webhook: unknown) {
    return this.post('/webhooks', webhook);
  }

  async updateWebhook(id: string, updates: unknown) {
    return this.put(`/webhooks/${id}`, updates);
  }

  async deleteWebhook(id: string) {
    return this.delete(`/webhooks/${id}`);
  }

  // Users API (Admin only)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUsers(_params: unknown = {}) {
    return this.get('/users', { headers: { 'X-Admin-Required': 'true' } });
  }

  async createUser(user: unknown) {
    return this.post('/users', user, { headers: { 'X-Admin-Required': 'true' } });
  }

  async updateUser(id: string, updates: unknown) {
    return this.put(`/users/${id}`, updates);
  }

  async deleteUser(id: string) {
    return this.delete(`/users/${id}`, { headers: { 'X-Admin-Required': 'true' } });
  }

  // Analytics API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAnalytics(_params: unknown = {}) {
    return this.get('/analytics', { headers: { 'X-Resource': 'analytics' } });
  }

  async getMetrics(type: string, timeRange: string) {
    return this.get(`/metrics/${type}`, { 
      headers: { 'X-Time-Range': timeRange }
    });
  }

  // System API
  async getSystemHealth() {
    return this.get('/system/health', { skipAuth: true });
  }

  async getSystemMetrics() {
    return this.get('/system/metrics', { headers: { 'X-Admin-Required': 'true' } });
  }

  // ================================
  // FILE UPLOAD HELPERS
  // ================================

  async uploadFile(file: File, endpoint: string, onProgress?: (progress: number) => void): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Upload progress
      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new ApiError(`Upload failed: ${xhr.statusText}`, xhr.status));
        }
      };

      xhr.onerror = () => reject(new ApiError('Upload failed', 0));

      xhr.open('POST', `${this.baseURL}${endpoint}`);

      // Add auth header
      if (authService.isAuthenticated()) {
        xhr.setRequestHeader('Authorization', authService.getAuthHeader());
      }

      xhr.send(formData);
    });
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      await this.get('/ping', { skipAuth: true, timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // Get API status
  async getApiStatus() {
    return this.get('/status', { skipAuth: true });
  }
}

// ================================
// ERROR HANDLING
// ================================

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isRateLimitError(): boolean {
    return this.status === 429;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// React hook for API calls
export function useApi() {
  // Import React dynamically for hook compatibility
  const React = require('react');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null) as [ApiError | null, (error: ApiError | null) => void];

  const makeRequest = async <T,>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: unknown
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const client = new ApiClient();
      const result = await client[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch']<T>(endpoint, data as never);
      return result.data;
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(
        err instanceof Error ? err.message : 'Unknown error',
        0
      );
      setError(apiError);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    makeRequest,
    clearError: () => setError(null)
  };
}