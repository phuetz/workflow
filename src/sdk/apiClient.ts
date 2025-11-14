/**
 * API Client SDK
 * TypeScript SDK for WorkflowBuilder Pro API
 */

export interface APIClientConfig {
  baseURL: string;
  apiKey?: string;
  accessToken?: string;
  timeout?: number;
  retries?: number;
  onError?: (error: APIError) => void;
}

export interface APIError {
  code: string;
  message: string;
  statusCode?: number;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class WorkflowBuilderClient {
  private config: Required<APIClientConfig>;

  constructor(config: APIClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      onError: () => {},
      ...config
    };
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = new URL(path, this.config.baseURL);

    // Add query params
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    // Make request with retries
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method,
          headers,
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const apiError: APIError = {
            code: error.code || `HTTP_${response.status}`,
            message: error.message || response.statusText,
            statusCode: response.status,
            details: error.details
          };

          this.config.onError(apiError);
          throw apiError;
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if ('statusCode' in lastError && (lastError as any).statusCode >= 400 && (lastError as any).statusCode < 500) {
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Workflows API
   */
  workflows = {
    list: async (params?: PaginationParams) => {
      return this.request<PaginatedResponse<any>>('GET', '/workflows', { query: params });
    },

    get: async (id: string) => {
      return this.request<any>('GET', `/workflows/${id}`);
    },

    create: async (workflow: any) => {
      return this.request<any>('POST', '/workflows', { body: workflow });
    },

    update: async (id: string, workflow: any) => {
      return this.request<any>('PUT', `/workflows/${id}`, { body: workflow });
    },

    delete: async (id: string) => {
      return this.request<void>('DELETE', `/workflows/${id}`);
    },

    execute: async (id: string, input?: any) => {
      return this.request<any>('POST', `/workflows/${id}/execute`, { body: { input } });
    }
  };

  /**
   * Executions API
   */
  executions = {
    get: async (id: string) => {
      return this.request<any>('GET', `/executions/${id}`);
    },

    list: async (params?: PaginationParams & { workflowId?: string }) => {
      return this.request<PaginatedResponse<any>>('GET', '/executions', { query: params });
    },

    cancel: async (id: string) => {
      return this.request<any>('POST', `/executions/${id}/cancel`);
    },

    logs: async (id: string) => {
      return this.request<any>('GET', `/executions/${id}/logs`);
    }
  };

  /**
   * Credentials API
   */
  credentials = {
    list: async () => {
      return this.request<any[]>('GET', '/credentials');
    },

    get: async (id: string) => {
      return this.request<any>('GET', `/credentials/${id}`);
    },

    create: async (credential: any) => {
      return this.request<any>('POST', '/credentials', { body: credential });
    },

    update: async (id: string, credential: any) => {
      return this.request<any>('PUT', `/credentials/${id}`, { body: credential });
    },

    delete: async (id: string) => {
      return this.request<void>('DELETE', `/credentials/${id}`);
    }
  };

  /**
   * Webhooks API
   */
  webhooks = {
    list: async (params?: { workflowId?: string }) => {
      return this.request<any[]>('GET', '/webhooks', { query: params });
    },

    create: async (webhook: any) => {
      return this.request<any>('POST', '/webhooks', { body: webhook });
    },

    delete: async (id: string) => {
      return this.request<void>('DELETE', `/webhooks/${id}`);
    }
  };

  /**
   * Users API
   */
  users = {
    me: async () => {
      return this.request<any>('GET', '/users/me');
    },

    update: async (data: any) => {
      return this.request<any>('PUT', '/users/me', { body: data });
    }
  };

  /**
   * Auth API
   */
  auth = {
    login: async (email: string, password: string) => {
      return this.request<any>('POST', '/auth/login', {
        body: { email, password }
      });
    },

    register: async (email: string, password: string, displayName: string) => {
      return this.request<any>('POST', '/auth/register', {
        body: { email, password, displayName }
      });
    },

    refresh: async (refreshToken: string) => {
      return this.request<any>('POST', '/auth/refresh', {
        body: { refreshToken }
      });
    },

    logout: async () => {
      return this.request<void>('POST', '/auth/logout');
    }
  };

  /**
   * Set access token
   */
  setAccessToken(token: string): void {
    this.config.accessToken = token;
  }

  /**
   * Set API key
   */
  setAPIKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }
}

/**
 * Create client instance
 */
export function createClient(config: APIClientConfig): WorkflowBuilderClient {
  return new WorkflowBuilderClient(config);
}

/**
 * Default client instance
 */
export const client = createClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.workflowbuilder.app/v1'
});
