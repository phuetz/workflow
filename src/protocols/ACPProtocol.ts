/**
 * Agent Communication Protocol (ACP)
 *
 * JSON-RPC based protocol for standardized agent communication
 * with authentication, routing, and connection pooling.
 */

import { EventEmitter } from 'events';
import WebSocket, { WebSocketServer } from 'ws';

// ACP Message Format (JSON-RPC 2.0 based)
export interface ACPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ACP Request
export interface ACPRequest extends ACPMessage {
  method: string;
  params?: Record<string, unknown>;
}

// ACP Response
export interface ACPResponse extends ACPMessage {
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ACP Error Codes
export enum ACPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  AUTH_FAILED = -32000,
  RATE_LIMIT = -32001,
  AGENT_NOT_FOUND = -32002,
  TIMEOUT = -32003
}

// Connection Configuration
export interface ACPConnectionConfig {
  url: string;
  agentId: string;
  apiKey?: string;
  timeout?: number;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  poolSize?: number;
}

// Connection Status
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// Connection Pool Entry
interface PooledConnection {
  id: string;
  ws: WebSocket;
  status: ConnectionStatus;
  lastUsed: number;
  requestCount: number;
  createdAt: number;
}

/**
 * ACP Protocol Client
 */
export class ACPClient extends EventEmitter {
  private config: Required<ACPConnectionConfig>;
  private connectionPool: Map<string, PooledConnection> = new Map();
  private pendingRequests: Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private messageHandlers: Map<string, (params: unknown) => Promise<unknown>> = new Map();
  private nextRequestId = 1;
  private reconnectAttempts = 0;

  constructor(config: ACPConnectionConfig) {
    super();
    this.config = {
      url: config.url,
      agentId: config.agentId,
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      reconnect: config.reconnect !== false,
      reconnectDelay: config.reconnectDelay || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      poolSize: config.poolSize || 5
    };
  }

  /**
   * Connect to ACP server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const conn = this.createConnection();

        conn.ws.on('open', () => {
          conn.status = ConnectionStatus.CONNECTED;
          this.reconnectAttempts = 0;
          this.emit('connected', conn.id);

          // Authenticate
          this.authenticate(conn.id)
            .then(() => resolve())
            .catch(reject);
        });

        conn.ws.on('error', (error) => {
          conn.status = ConnectionStatus.FAILED;
          this.emit('error', error);
          if (this.connectionPool.size === 0) {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create a new connection in the pool
   */
  private createConnection(): PooledConnection {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ws = new WebSocket(this.config.url);

    const conn: PooledConnection = {
      id,
      ws,
      status: ConnectionStatus.CONNECTING,
      lastUsed: Date.now(),
      requestCount: 0,
      createdAt: Date.now()
    };

    // Setup message handling
    ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(data.toString());
    });

    ws.on('close', () => {
      conn.status = ConnectionStatus.DISCONNECTED;
      this.connectionPool.delete(id);
      this.emit('disconnected', id);

      // Attempt reconnection if enabled
      if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    });

    this.connectionPool.set(id, conn);
    return conn;
  }

  /**
   * Get an available connection from the pool
   */
  private getConnection(): PooledConnection {
    // Find connected connection
    for (const conn of this.connectionPool.values()) {
      if (conn.status === ConnectionStatus.CONNECTED) {
        conn.lastUsed = Date.now();
        conn.requestCount++;
        return conn;
      }
    }

    // Create new connection if pool not full
    if (this.connectionPool.size < this.config.poolSize) {
      const conn = this.createConnection();
      return conn;
    }

    // Use least recently used connection
    let lru: PooledConnection | null = null;
    for (const conn of this.connectionPool.values()) {
      if (!lru || conn.lastUsed < lru.lastUsed) {
        lru = conn;
      }
    }

    if (lru) {
      lru.lastUsed = Date.now();
      lru.requestCount++;
      return lru;
    }

    throw new Error('No available connections in pool');
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.emit('reconnecting', this.reconnectAttempts, delay);

    setTimeout(() => {
      this.connect().catch((error) => {
        this.emit('reconnect-failed', error);
      });
    }, delay);
  }

  /**
   * Authenticate with the server
   */
  private async authenticate(connectionId: string): Promise<void> {
    await this.sendRequest('auth.authenticate', {
      agentId: this.config.agentId,
      apiKey: this.config.apiKey
    }, connectionId);
  }

  /**
   * Send a request
   */
  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const conn = this.getConnection();
    return this.sendRequest(method, params, conn.id);
  }

  /**
   * Send request on specific connection
   */
  private async sendRequest(
    method: string,
    params: Record<string, unknown> | undefined,
    connectionId: string
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextRequestId++;
      const conn = this.connectionPool.get(connectionId);

      if (!conn || conn.status !== ConnectionStatus.CONNECTED) {
        reject(new Error('Connection not available'));
        return;
      }

      const message: ACPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        conn.ws.send(JSON.stringify(message));
      } catch (error) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Send a notification (no response expected)
   */
  notify(method: string, params?: Record<string, unknown>): void {
    const conn = this.getConnection();

    if (conn.status !== ConnectionStatus.CONNECTED) {
      throw new Error('Connection not available');
    }

    const message: ACPRequest = {
      jsonrpc: '2.0',
      method,
      params
    };

    conn.ws.send(JSON.stringify(message));
  }

  /**
   * Register a method handler
   */
  registerMethod(method: string, handler: (params: unknown) => Promise<unknown>): void {
    this.messageHandlers.set(method, handler);
  }

  /**
   * Unregister a method handler
   */
  unregisterMethod(method: string): void {
    this.messageHandlers.delete(method);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(data: string): Promise<void> {
    try {
      const message: ACPMessage = JSON.parse(data);

      // Handle response
      if ('result' in message || 'error' in message) {
        const pending = this.pendingRequests.get(message.id!);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id!);

          if (message.error) {
            pending.reject(new Error(message.error.message));
          } else {
            pending.resolve(message.result);
          }
        }
        return;
      }

      // Handle request
      if (message.method) {
        const handler = this.messageHandlers.get(message.method);

        if (!handler) {
          if (message.id !== undefined) {
            this.sendResponse(message.id, undefined, {
              code: ACPErrorCode.METHOD_NOT_FOUND,
              message: `Method not found: ${message.method}`
            });
          }
          return;
        }

        try {
          const result = await handler(message.params);
          if (message.id !== undefined) {
            this.sendResponse(message.id, result);
          }
        } catch (error) {
          if (message.id !== undefined) {
            this.sendResponse(message.id, undefined, {
              code: ACPErrorCode.INTERNAL_ERROR,
              message: error instanceof Error ? error.message : 'Internal error'
            });
          }
        }
      }
    } catch (error) {
      this.emit('parse-error', error);
    }
  }

  /**
   * Send a response
   */
  private sendResponse(
    id: string | number,
    result?: unknown,
    error?: { code: number; message: string; data?: unknown }
  ): void {
    const conn = this.getConnection();

    if (conn.status !== ConnectionStatus.CONNECTED) {
      return;
    }

    const message: ACPResponse = {
      jsonrpc: '2.0',
      id,
      result,
      error
    };

    conn.ws.send(JSON.stringify(message));
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    // Clear pending requests
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client disconnecting'));
    }
    this.pendingRequests.clear();

    // Close all connections
    for (const conn of this.connectionPool.values()) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.close();
      }
    }
    this.connectionPool.clear();
  }

  /**
   * Get connection pool stats
   */
  getPoolStats() {
    const stats = {
      total: this.connectionPool.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      failed: 0,
      totalRequests: 0
    };

    for (const conn of this.connectionPool.values()) {
      switch (conn.status) {
        case ConnectionStatus.CONNECTED:
          stats.connected++;
          break;
        case ConnectionStatus.CONNECTING:
          stats.connecting++;
          break;
        case ConnectionStatus.DISCONNECTED:
          stats.disconnected++;
          break;
        case ConnectionStatus.FAILED:
          stats.failed++;
          break;
      }
      stats.totalRequests += conn.requestCount;
    }

    return stats;
  }
}

/**
 * ACP Server
 */
export class ACPServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, { ws: WebSocket; agentId?: string; authenticated: boolean }> = new Map();
  private methodHandlers: Map<string, (params: unknown, agentId?: string) => Promise<unknown>> = new Map();
  private authHandler?: (agentId: string, apiKey: string) => Promise<boolean>;

  constructor(port: number) {
    super();
    this.wss = new WebSocketServer({ port });
    this.setupServer();
  }

  /**
   * Setup WebSocket server
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.clients.set(clientId, {
        ws,
        authenticated: false
      });

      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(clientId, data.toString());
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        this.emit('client-disconnected', clientId);
      });

      this.emit('client-connected', clientId);
    });

    // Register built-in authentication handler
    this.registerMethod('auth.authenticate', async (params: any) => {
      const { agentId, apiKey } = params;

      if (this.authHandler) {
        const authenticated = await this.authHandler(agentId, apiKey);
        if (authenticated) {
          return { status: 'authenticated', agentId };
        } else {
          throw new Error('Authentication failed');
        }
      }

      return { status: 'authenticated', agentId };
    });
  }

  /**
   * Set authentication handler
   */
  setAuthHandler(handler: (agentId: string, apiKey: string) => Promise<boolean>): void {
    this.authHandler = handler;
  }

  /**
   * Register a method handler
   */
  registerMethod(
    method: string,
    handler: (params: unknown, agentId?: string) => Promise<unknown>
  ): void {
    this.methodHandlers.set(method, handler);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(clientId: string, data: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: ACPMessage = JSON.parse(data);

      // Handle request
      if (message.method) {
        const handler = this.methodHandlers.get(message.method);

        if (!handler) {
          if (message.id !== undefined) {
            this.sendResponse(client.ws, message.id, undefined, {
              code: ACPErrorCode.METHOD_NOT_FOUND,
              message: `Method not found: ${message.method}`
            });
          }
          return;
        }

        try {
          const result = await handler(message.params, client.agentId);

          // Update client authentication status
          if (message.method === 'auth.authenticate' && result) {
            client.authenticated = true;
            client.agentId = (message.params as any)?.agentId;
          }

          if (message.id !== undefined) {
            this.sendResponse(client.ws, message.id, result);
          }
        } catch (error) {
          if (message.id !== undefined) {
            this.sendResponse(client.ws, message.id, undefined, {
              code: ACPErrorCode.INTERNAL_ERROR,
              message: error instanceof Error ? error.message : 'Internal error'
            });
          }
        }
      }
    } catch (error) {
      this.emit('parse-error', error);
    }
  }

  /**
   * Send a response
   */
  private sendResponse(
    ws: WebSocket,
    id: string | number,
    result?: unknown,
    error?: { code: number; message: string; data?: unknown }
  ): void {
    const message: ACPResponse = {
      jsonrpc: '2.0',
      id,
      result,
      error
    };

    ws.send(JSON.stringify(message));
  }

  /**
   * Broadcast to all authenticated clients
   */
  broadcast(method: string, params?: Record<string, unknown>): void {
    const message: ACPRequest = {
      jsonrpc: '2.0',
      method,
      params
    };

    const messageStr = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (client.authenticated && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }

  /**
   * Send to specific agent
   */
  sendToAgent(agentId: string, method: string, params?: Record<string, unknown>): boolean {
    for (const client of this.clients.values()) {
      if (client.agentId === agentId && client.ws.readyState === WebSocket.OPEN) {
        const message: ACPRequest = {
          jsonrpc: '2.0',
          method,
          params
        };
        client.ws.send(JSON.stringify(message));
        return true;
      }
    }
    return false;
  }

  /**
   * Get server stats
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.authenticated).length,
      registeredMethods: this.methodHandlers.size
    };
  }

  /**
   * Close server
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.clients.clear();
        resolve();
      });
    });
  }
}
