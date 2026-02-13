/**
 * API Service Integration
 * REST, GraphQL, and WebSocket API management
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { GraphQLClient, gql } from 'graphql-request';

export interface APIConfig {
  baseURL: string;
  headers?: Record<string, string>;
  timeout?: number;
  auth?: {
    type: 'bearer' | 'basic' | 'apikey' | 'oauth2';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    keyLocation?: 'header' | 'query';
    keyName?: string;
  };
  retries?: {
    enabled: boolean;
    count: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
}

export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface APIResponse {
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
  duration: number;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;
  auth?: {
    type: 'token' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
}

export interface GraphQLConfig {
  endpoint: string;
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'apikey';
    token?: string;
    apiKey?: string;
  };
}

export interface RateLimiter {
  requests: number[];
  limit: number;
  window: number;
}

export class APIService extends EventEmitter {
  private clients: Map<string, AxiosInstance> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private graphqlClients: Map<string, GraphQLClient> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private requestQueues: Map<string, Array<() => Promise<unknown>>> = new Map();
  
  constructor() {
    super();
  }
  
  // REST API Management
  
  public createRESTClient(clientId: string, config: APIConfig): void {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: config.headers || {}
    };
    
    // Setup authentication
    if (config.auth) {
      switch (config.auth.type) {
        case 'bearer':
          axiosConfig.headers!['Authorization'] = `Bearer ${config.auth.token}`;
          break;
          
        case 'basic': {
          const basicAuth = Buffer.from(
            `${config.auth.username}:${config.auth.password}`
          ).toString('base64');
          axiosConfig.headers!['Authorization'] = `Basic ${basicAuth}`;
          break;
        }
          
        case 'apikey':
          if (config.auth.keyLocation === 'header') {
            axiosConfig.headers![config.auth.keyName || 'X-API-Key'] = config.auth.apiKey;
          }
          break;
      }
    }
    
    const client = axios.create(axiosConfig);
    
    // Setup request interceptor
    client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        
        // Handle API key in query params
        if (config.auth?.type === 'apikey' && config.auth.keyLocation === 'query') {
          config.params = config.params || {};
          config.params[config.auth.keyName || 'api_key'] = config.auth.apiKey;
        }
        
        this.emit('requestStart', {
          clientId,
          method: config.method,
          url: config.url
        });
        
        return config;
      },
      (error) => {
        this.emit('requestError', { clientId, error });
        return Promise.reject(error);
      }
    );
    
    // Setup response interceptor
    client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        
        this.emit('requestComplete', {
          clientId,
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          duration
        });
        
        return response;
      },
      async (error) => {
        const duration = error.config ? 
          Date.now() - error.config.metadata.startTime : 0;
        
        this.emit('requestError', {
          clientId,
          error,
          duration
        });
        
        // Handle retries
        if (config.retries?.enabled && this.shouldRetry(error, config.retries)) {
          return this.retryRequest(error, config.retries);
        }
        
        return Promise.reject(error);
      }
    );
    
    this.clients.set(clientId, client);
    
    // Setup rate limiting
    if (config.rateLimit) {
      this.rateLimiters.set(clientId, {
        requests: [],
        limit: config.rateLimit.requests,
        window: config.rateLimit.window
      });
    }
    
    this.emit('clientCreated', { clientId, baseURL: config.baseURL });
  }
  
  public async makeRequest(
    clientId: string,
    request: APIRequest
  ): Promise<APIResponse> {
    const client = this.clients.get(clientId);
    
    if (!client) {
      throw new Error(`API client ${clientId} not found`);
    }
    
    // Check rate limiting
    if (this.rateLimiters.has(clientId)) {
      await this.checkRateLimit(clientId);
    }
    
    try {
      const startTime = Date.now();
      
      const response: AxiosResponse = await client.request({
        method: request.method,
        url: request.url,
        data: request.data,
        params: request.params,
        headers: request.headers
      });
      
      const duration = Date.now() - startTime;
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
        duration
      };
      
    } catch (error: unknown) {
      if (error.response) {
        // HTTP error response
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
          duration: Date.now() - (error.config?.metadata?.startTime || Date.now())
        };
      }
      
      throw error;
    }
  }
  
  // Batch Requests
  
  public async makeBatchRequests(
    clientId: string,
    requests: APIRequest[],
    concurrent: boolean = true,
    maxConcurrency: number = 5
  ): Promise<APIResponse[]> {
    if (concurrent) {
      // Process requests concurrently with limit
      const results: APIResponse[] = [];
      
      for (let i = 0; i < requests.length; i += maxConcurrency) {
        const batch = requests.slice(i, i + maxConcurrency);
        const batchPromises = batch.map(request => 
          this.makeRequest(clientId, request)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              status: 500,
              statusText: 'Internal Error',
              data: { error: result.reason.message },
              headers: {},
              duration: 0
            });
          }
        }
      }
      
      return results;
    } else {
      // Process requests sequentially
      const results: APIResponse[] = [];
      
      for (const request of requests) {
        try {
          const response = await this.makeRequest(clientId, request);
          results.push(response);
        } catch (error: unknown) {
          results.push({
            status: 500,
            statusText: 'Internal Error',
            data: { error: error.message },
            headers: {},
            duration: 0
          });
        }
      }
      
      return results;
    }
  }
  
  // GraphQL Client Management
  
  public createGraphQLClient(clientId: string, config: GraphQLConfig): void {
    const headers: Record<string, string> = config.headers || {};
    
    // Setup authentication
    if (config.auth) {
      switch (config.auth.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${config.auth.token}`;
          break;
          
        case 'apikey':
          headers['X-API-Key'] = config.auth.apiKey!;
          break;
      }
    }
    
    const client = new GraphQLClient(config.endpoint, { headers });
    
    this.graphqlClients.set(clientId, client);
    
    this.emit('graphqlClientCreated', {
      clientId,
      endpoint: config.endpoint
    });
  }
  
  public async executeGraphQLQuery(
    clientId: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.graphqlClients.get(clientId);
    
    if (!client) {
      throw new Error(`GraphQL client ${clientId} not found`);
    }
    
    try {
      const startTime = Date.now();
      
      const result = await client.request(gql`${query}`, variables);
      
      const duration = Date.now() - startTime;
      
      this.emit('graphqlQueryExecuted', {
        clientId,
        query: query.substring(0, 100),
        duration
      });
      
      return result;
      
    } catch (error) {
      this.emit('graphqlError', { clientId, error });
      throw error;
    }
  }
  
  public async executeGraphQLMutation(
    clientId: string,
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<unknown> {
    return this.executeGraphQLQuery(clientId, mutation, variables);
  }
  
  // WebSocket Management
  
  public createWebSocketConnection(
    connectionId: string,
    config: WebSocketConfig
  ): void {
    const wsOptions: unknown = {};
    
    if (config.protocols) {
      wsOptions.protocols = config.protocols;
    }
    
    if (config.headers) {
      wsOptions.headers = config.headers;
    }
    
    // Setup authentication
    if (config.auth) {
      wsOptions.headers = wsOptions.headers || {};
      
      switch (config.auth.type) {
        case 'token':
          wsOptions.headers['Authorization'] = `Bearer ${config.auth.token}`;
          break;
          
        case 'basic': {
          const basicAuth = Buffer.from(
            `${config.auth.username}:${config.auth.password}`
          ).toString('base64');
          wsOptions.headers['Authorization'] = `Basic ${basicAuth}`;
          break;
        }
      }
    }
    
    const ws = new WebSocket(config.url, wsOptions);
    
    ws.on('open', () => {
      this.emit('websocketConnected', { connectionId });
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.emit('websocketMessage', {
          connectionId,
          message
        });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        this.emit('websocketMessage', {
          connectionId,
          message: data.toString()
        });
      }
    });
    
    ws.on('error', (error) => {
      this.emit('websocketError', { connectionId, error });
      
      // Auto-reconnect if configured
      if (config.reconnect?.enabled) {
        this.scheduleReconnect(connectionId, config);
      }
    });
    
    ws.on('close', (code, reason) => {
      this.emit('websocketDisconnected', {
        connectionId,
        code,
        reason: reason.toString()
      });
      
      this.websockets.delete(connectionId);
      
      // Auto-reconnect if configured
      if (config.reconnect?.enabled) {
        this.scheduleReconnect(connectionId, config);
      }
    });
    
    this.websockets.set(connectionId, ws);
  }
  
  public sendWebSocketMessage(
    connectionId: string,
    message: unknown
  ): void {
    const ws = this.websockets.get(connectionId);
    
    if (!ws) {
      throw new Error(`WebSocket connection ${connectionId} not found`);
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket connection ${connectionId} is not open`);
    }
    
    const messageString = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);
    
    ws.send(messageString);
    
    this.emit('websocketMessageSent', {
      connectionId,
      message: messageString.substring(0, 100)
    });
  }
  
  public closeWebSocketConnection(connectionId: string): void {
    const ws = this.websockets.get(connectionId);
    
    if (ws) {
      ws.close();
      this.websockets.delete(connectionId);
    }
  }
  
  // Webhook Support
  
  public async sendWebhook(
    url: string,
    payload: unknown,
    options?: {
      method?: 'POST' | 'PUT';
      headers?: Record<string, string>;
      secret?: string;
      timeout?: number;
    }
  ): Promise<APIResponse> {
    const method = options?.method || 'POST';
    const headers = {
      'Content-Type': 'application/json',
      ...options?.headers
    };
    
    // Add signature if secret provided
    if (options?.secret) {
      const crypto = await import('crypto');
      const signature = crypto
        .createHmac('sha256', options.secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      headers['X-Hub-Signature-256'] = `sha256=${signature}`;
    }
    
    try {
      const startTime = Date.now();
      
      const response = await axios.request({
        method,
        url,
        data: payload,
        headers,
        timeout: options?.timeout || 30000
      });
      
      const duration = Date.now() - startTime;
      
      this.emit('webhookSent', {
        url,
        status: response.status,
        duration
      });
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
        duration
      };
      
    } catch (error: unknown) {
      this.emit('webhookError', { url, error });
      throw error;
    }
  }
  
  // Authentication Helpers
  
  public async refreshOAuth2Token(
    clientId: string,
    refreshToken: string,
    clientSecret: string,
    tokenEndpoint: string
  ): Promise<unknown> {
    try {
      const response = await axios.post(tokenEndpoint, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      this.emit('tokenRefreshed', { clientId });
      
      return response.data;
      
    } catch (error) {
      this.emit('tokenRefreshError', { clientId, error });
      throw error;
    }
  }
  
  public async getOAuth2Token(
    clientId: string,
    clientSecret: string,
    authorizationCode: string,
    redirectUri: string,
    tokenEndpoint: string
  ): Promise<unknown> {
    try {
      const response = await axios.post(tokenEndpoint, {
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      this.emit('tokenObtained', { clientId });
      
      return response.data;
      
    } catch (error) {
      this.emit('tokenError', { clientId, error });
      throw error;
    }
  }
  
  // API Testing and Monitoring
  
  public async testEndpoint(
    clientId: string,
    endpoint: string,
    expectedStatus: number = 200
  ): Promise<{
    success: boolean;
    status: number;
    duration: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      const response = await this.makeRequest(clientId, {
        method: 'GET',
        url: endpoint
      });
      
      const duration = Date.now() - startTime;
      const success = response.status === expectedStatus;
      
      this.emit('endpointTested', {
        clientId,
        endpoint,
        success,
        status: response.status,
        duration
      });
      
      return {
        success,
        status: response.status,
        duration,
        error: success ? undefined : `Expected ${expectedStatus}, got ${response.status}`
      };
      
    } catch (error: unknown) {
      this.emit('endpointTestError', { clientId, endpoint, error });
      
      return {
        success: false,
        status: 0,
        duration: 0,
        error: error.message
      };
    }
  }
  
  public async monitorEndpoints(
    endpoints: Array<{
      clientId: string;
      endpoint: string;
      expectedStatus?: number;
      interval?: number;
    }>,
    duration: number = 60000
  ): Promise<void> {
    const monitors = endpoints.map(config => {
      const interval = setInterval(async () => {
        await this.testEndpoint(
          config.clientId,
          config.endpoint,
          config.expectedStatus
        );
      }, config.interval || 30000);
      
      return interval;
    });
    
    // Stop monitoring after specified duration
    setTimeout(() => {
      monitors.forEach(interval => clearInterval(interval));
      this.emit('monitoringStopped', { duration });
    }, duration);
    
    this.emit('monitoringStarted', {
      endpointCount: endpoints.length,
      duration
    });
  }
  
  // Rate Limiting
  
  private async checkRateLimit(clientId: string): Promise<void> {
    const rateLimiter = this.rateLimiters.get(clientId);
    
    if (!rateLimiter) {
      return;
    }
    
    const now = Date.now();
    
    // Remove expired requests
    rateLimiter.requests = rateLimiter.requests.filter(
      timestamp => now - timestamp < rateLimiter.window
    );
    
    // Check if limit exceeded
    if (rateLimiter.requests.length >= rateLimiter.limit) {
      const oldestRequest = Math.min(...rateLimiter.requests);
      const waitTime = rateLimiter.window - (now - oldestRequest);
      
      this.emit('rateLimitExceeded', {
        clientId,
        waitTime
      });
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Record this request
    rateLimiter.requests.push(now);
  }
  
  // Retry Logic
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private shouldRetry(error: unknown, retryConfig: unknown): boolean {
    if (!error.response) {
      return true; // Network errors
    }
    
    const status = error.response.status;
    
    // Retry on server errors and rate limiting
    return status >= 500 || status === 429;
  }
  
  private async retryRequest(error: unknown, retryConfig: unknown): Promise<unknown> {
    const delay = retryConfig.backoff === 'exponential' 
      ? retryConfig.delay * Math.pow(2, error.config.retryCount || 0)
      : retryConfig.delay;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    error.config.retryCount = (error.config.retryCount || 0) + 1;
    
    if (error.config.retryCount > retryConfig.count) {
      return Promise.reject(error);
    }
    
    return axios.request(error.config);
  }
  
  // WebSocket Reconnection
  
  private scheduleReconnect(connectionId: string, config: WebSocketConfig): void {
    if (!config.reconnect) {
      return;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const reconnectKey = `${connectionId}_reconnect`;
    
    setTimeout(() => {
      try {
        this.createWebSocketConnection(connectionId, config);
      } catch (error) {
        this.emit('reconnectFailed', { connectionId, error });
      }
    }, config.reconnect.delay);
  }
  
  // Utility Methods
  
  public listClients(): string[] {
    return Array.from(this.clients.keys());
  }
  
  public listWebSocketConnections(): string[] {
    return Array.from(this.websockets.keys());
  }
  
  public listGraphQLClients(): string[] {
    return Array.from(this.graphqlClients.keys());
  }
  
  public removeClient(clientId: string): void {
    this.clients.delete(clientId);
    this.rateLimiters.delete(clientId);
    this.requestQueues.delete(clientId);
    
    this.emit('clientRemoved', { clientId });
  }
  
  public removeAllClients(): void {
    this.clients.clear();
    this.rateLimiters.clear();
    this.requestQueues.clear();
    
    // Close all WebSocket connections
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [connectionId, ws] of this.websockets) {
      ws.close();
    }
    this.websockets.clear();
    
    this.graphqlClients.clear();
    
    this.emit('allClientsRemoved');
  }
}