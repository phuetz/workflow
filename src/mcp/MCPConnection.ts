/**
 * MCP Connection Manager
 * Handles WebSocket connections with automatic reconnection
 */

import type {
  MCPConnectionConfig,
  MCPConnectionState,
  MCPConnectionStatus,
  MCPEvent,
  MCPEventHandler,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  MCPErrorCode,
} from '../types/mcp';
import { MCPProtocol } from './MCPProtocol';
import { logger } from '../services/SimpleLogger';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

export class MCPConnection {
  private config: MCPConnectionConfig;
  private protocol: MCPProtocol;
  private ws: WebSocket | null = null;
  private state: MCPConnectionState = 'disconnected';
  private connectedAt?: Date;
  private lastError?: string;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private pendingRequests = new Map<string | number, PendingRequest>();
  private eventHandlers: MCPEventHandler[] = [];
  private messageQueue: string[] = [];
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: MCPConnectionConfig) {
    this.config = {
      reconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      timeout: 30000,
      ...config,
    };
    this.protocol = new MCPProtocol();
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');

    try {
      await this.createConnection();
      this.setState('connected');
      this.connectedAt = new Date();
      this.reconnectAttempts = 0;
      this.lastError = undefined;
      this.emitEvent({ type: 'connected', timestamp: new Date() });

      // Process queued messages
      this.flushMessageQueue();

      // Start heartbeat
      this.startHeartbeat();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.setState('failed');
      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // Attempt reconnection if enabled
      if (this.config.reconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
        this.scheduleReconnect();
      }

      throw error;
    }
  }

  /**
   * Create WebSocket connection
   */
  private createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = this.buildConnectionUrl();
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          resolve();
        };

        this.ws.onclose = (event) => {
          this.handleDisconnect(event.code, event.reason);
        };

        this.ws.onerror = (event) => {
          reject(new Error(`WebSocket error: ${event.type}`));
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Build connection URL with authentication
   */
  private buildConnectionUrl(): string {
    const url = new URL(this.config.url);

    if (this.config.authentication?.type === 'apiKey' && this.config.authentication.apiKey) {
      url.searchParams.set('apiKey', this.config.authentication.apiKey);
    }

    return url.toString();
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
      this.pendingRequests.delete(id);
    }

    this.setState('disconnected');
    this.emitEvent({ type: 'disconnected', timestamp: new Date() });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(code: number, reason: string): void {
    this.stopHeartbeat();
    this.lastError = `Disconnected: ${code} - ${reason}`;

    // Clean up
    if (this.ws) {
      this.ws = null;
    }

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
      this.pendingRequests.delete(id);
    }

    this.emitEvent({ type: 'disconnected', timestamp: new Date() });

    // Attempt reconnection if enabled
    if (this.config.reconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
      this.scheduleReconnect();
    } else {
      this.setState('failed');
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.setState('reconnecting');
    this.reconnectAttempts++;

    const delay = (this.config.reconnectDelay || 1000) * Math.pow(2, this.reconnectAttempts - 1);

    this.emitEvent({
      type: 'reconnecting',
      timestamp: new Date(),
      data: { attempt: this.reconnectAttempts, delay },
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        logger.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    const parsed = this.protocol.parseMessage(data);

    if (parsed.error) {
      logger.error('Message parse error:', parsed.error);
      return;
    }

    const message = parsed.message as JSONRPCResponse | JSONRPCNotification;

    // Check if it's a response to a pending request
    if ('id' in message && typeof message.id !== 'undefined') {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if ('error' in message && message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    }
    // It's a notification
    else if ('method' in message) {
      this.handleNotification(message as JSONRPCNotification);
    }
  }

  /**
   * Handle notification from server
   */
  private handleNotification(notification: JSONRPCNotification): void {
    const eventMap: Record<string, string> = {
      'notifications/tools/list_changed': 'toolsListChanged',
      'notifications/resources/list_changed': 'resourcesListChanged',
      'notifications/resources/updated': 'resourceUpdated',
      'notifications/prompts/list_changed': 'promptsListChanged',
    };

    const eventType = eventMap[notification.method];
    if (eventType) {
      this.emitEvent({
        type: eventType as any,
        timestamp: new Date(),
        data: notification.params,
      });
    }
  }

  /**
   * Send a request and wait for response
   */
  async sendRequest(method: string, params?: Record<string, unknown> | unknown[]): Promise<unknown> {
    if (this.state !== 'connected') {
      throw new Error('Not connected to server');
    }

    const request = this.protocol.createRequest(method, params);
    const requestId = request.id;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeout || 30000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        this.sendMessage(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Send a notification (no response expected)
   */
  sendNotification(method: string, params?: Record<string, unknown> | unknown[]): void {
    if (this.state !== 'connected') {
      throw new Error('Not connected to server');
    }

    const notification = this.protocol.createNotification(method, params);
    this.sendMessage(JSON.stringify(notification));
  }

  /**
   * Send raw message
   */
  private sendMessage(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for later
      this.messageQueue.push(message);
      return;
    }

    this.ws.send(message);
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.state === 'connected') {
        this.sendRequest('ping').catch((error) => {
          logger.error('Heartbeat failed:', error);
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Set connection state
   */
  private setState(state: MCPConnectionState): void {
    this.state = state;
  }

  /**
   * Get connection status
   */
  getStatus(): MCPConnectionStatus {
    return {
      state: this.state,
      connectedAt: this.connectedAt,
      lastError: this.lastError,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Add event handler
   */
  on(handler: MCPEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  off(handler: MCPEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit event to all handlers
   */
  private emitEvent(event: MCPEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        logger.error('Event handler error:', error);
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MCPConnectionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MCPConnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
