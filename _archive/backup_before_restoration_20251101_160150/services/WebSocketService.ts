/**
 * WebSocket Service
 * Manages real-time bidirectional communication
 */

import { EventEmitter } from 'events';
import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import type { 
  WebSocketMessage, 
  WebSocketEvent,
  WebSocketConfig,
  ConnectionState,
  SubscriptionOptions
} from '../types/websocket';

export class WebSocketService extends BaseService {
  private ws: WebSocket | null = null;
  private eventEmitter: EventEmitter;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private subscriptions: Map<string, Set<(data: Record<string, unknown>) => void>> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private lastPingTime: number = 0;
  private latency: number = 0;

  constructor(config: WebSocketConfig) {
    super('WebSocket', {
      enableRetry: true,
      maxRetries: config.maxReconnectAttempts || 5,
      retryDelayMs: config.reconnectDelay || 1000
    });

    this.config = {
      url: config.url,
      protocols: config.protocols,
      reconnect: config.reconnect !== false,
      reconnectDelay: config.reconnectDelay || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      pingInterval: config.pingInterval || 30000,
      pongTimeout: config.pongTimeout || 5000,
      messageQueueSize: config.messageQueueSize || 100,
      binaryType: config.binaryType || 'arraybuffer',
      authentication: config.authentication
    };

    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100); // Allow many subscriptions
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      logger.debug('WebSocket already connected or connecting');
      return;
    }

    this.connectionState = 'connecting';
    this.eventEmitter.emit('connecting');

    try {
      await this.executeOperation('connect', async () => {
        // Add authentication to URL if needed
        
        // Create WebSocket connection
        this.ws = new WebSocket(url, this.config.protocols);
        this.ws.binaryType = this.config.binaryType;

        // Setup event handlers
        this.setupEventHandlers();

        // Wait for connection to open
        await this.waitForConnection();

        // Start ping/pong heartbeat
        this.startHeartbeat();

        // Process queued messages
        await this.processMessageQueue();

        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.eventEmitter.emit('connected');

        logger.info('WebSocket connected successfully');
      });
    } catch (error) {
      this.connectionState = 'disconnected';
      this.eventEmitter.emit('error', error);
      
      if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        throw error;
      }
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(code = 1000, reason = 'Normal closure'): void {
    this.connectionState = 'disconnecting';
    
    // Cancel reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Close WebSocket connection
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(code, reason);
    }

    this.ws = null;
    this.connectionState = 'disconnected';
    this.eventEmitter.emit('disconnected', { code, reason });

    logger.info('WebSocket disconnected');
  }

  /**
   * Send a message
   */
  public async send<T = unknown>(
    type: string, 
    data: T, 
    options: { 
      priority?: 'high' | 'normal' | 'low';
      timeout?: number;
      expectResponse?: boolean;
    } = {}
  ): Promise<void> {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type,
      data,
      timestamp: new Date(),
      priority: options.priority || 'normal'
    };

    // If expecting response, create a promise that resolves when response is received
    if (options.expectResponse) {
      return new Promise((resolve, reject) => {
          this.eventEmitter.off(`response:${message.id}`, responseHandler);
          reject(new Error('Response timeout'));
        }, options.timeout || 30000);

          clearTimeout(timeout);
          resolve(response);
        };

        this.eventEmitter.once(`response:${message.id}`, responseHandler);
        this.sendMessage(message);
      });
    } else {
      return this.sendMessage(message);
    }
  }

  /**
   * Subscribe to events
   */
  public subscribe<T = unknown>(
    event: string, 
    callback: (data: T) => void,
    options: SubscriptionOptions = {}
  ): () => void {
    // Add to internal subscriptions
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event)!.add(callback);

    // If connected, send subscription message
    if (this.connectionState === 'connected') {
      this.send('subscribe', { 
        event, 
        ...options 
      }).catch(err => {
        logger.error('Failed to send subscription:', err);
      });
    }

    // Add event listener
    this.eventEmitter.on(event, callback);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(event, callback);
    };
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(event: string, callback?: (data: Record<string, unknown>) => void): void {
    if (callback) {
      this.eventEmitter.off(event, callback);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(event);
        }
      }
    } else {
      // Remove all listeners for this event
      this.eventEmitter.removeAllListeners(event);
      this.subscriptions.delete(event);
    }

    // If connected and no more subscriptions for this event, send unsubscribe
    if (this.connectionState === 'connected' && !this.subscriptions.has(event)) {
      this.send('unsubscribe', { event }).catch(err => {
        logger.error('Failed to send unsubscription:', err);
      });
    }
  }

  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection stats
   */
  public getConnectionStats(): {
    state: ConnectionState;
    latency: number;
    messagesSent: number;
    messagesReceived: number;
    reconnectAttempts: number;
    queueSize: number;
  } {
    return {
      state: this.connectionState,
      latency: this.latency,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.length
    };
  }

  private messagesSent = 0;
  private messagesReceived = 0;

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.addEventListener('open', this.handleOpen.bind(this));
    this.ws.addEventListener('message', this.handleMessage.bind(this));
    this.ws.addEventListener('error', this.handleError.bind(this));
    this.ws.addEventListener('close', this.handleClose.bind(this));
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(_event: Event): void {
    // Event parameter not used in current implementation
    logger.debug('WebSocket connection opened');
    
    // Send authentication if configured
    if (this.config.authentication) {
      this.authenticate().catch(err => {
        logger.error('Authentication failed:', err);
        this.disconnect(4001, 'Authentication failed');
      });
    }
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    this.messagesReceived++;

    try {
      let message: WebSocketMessage;
      
      if (typeof event.data === 'string') {
        message = JSON.parse(event.data);
      } else {
        // Handle binary data
        message = this.decodeBinaryMessage(event.data);
      }

      // Handle different message types
      switch (message.type) {
        case 'pong':
          this.handlePong(message);
          break;
        
        case 'response':
          this.handleResponse(message);
          break;
        
        case 'event':
          this.handleEvent(message);
          break;
        
        case 'error':
          this.handleErrorMessage(message);
          break;
        
        default:
          // Emit as custom event
          this.eventEmitter.emit(message.type, message.data);
          this.eventEmitter.emit('message', message);
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message:', error);
      this.eventEmitter.emit('error', error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event): void {
    logger.error('WebSocket error:', event);
    this.eventEmitter.emit('error', new Error('WebSocket error'));
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent): void {
    logger.info('WebSocket closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    this.stopHeartbeat();
    this.ws = null;
    this.connectionState = 'disconnected';
    
    this.eventEmitter.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    // Attempt reconnection if enabled and not a normal closure
    if (this.config.reconnect && 
        event.code !== 1000 && 
        event.code !== 1001 &&
        this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle pong message
   */
  private handlePong(_message: WebSocketMessage): void {
    this.latency = now - this.lastPingTime;
    logger.debug(`WebSocket latency: ${this.latency}ms`);
  }

  /**
   * Handle response message
   */
  private handleResponse(message: WebSocketMessage): void {
    if (message.correlationId) {
      this.eventEmitter.emit(`response:${message.correlationId}`, message.data);
    }
  }

  /**
   * Handle event message
   */
  private handleEvent(message: WebSocketMessage): void {
    this.eventEmitter.emit(event.name, event.data);
    
    // Also emit a generic event for logging/monitoring
    this.eventEmitter.emit('event', event);
  }

  /**
   * Handle error message
   */
  private handleErrorMessage(message: WebSocketMessage): void {
    (error as Record<string, unknown>).code = message.data.code;
    (error as Record<string, unknown>).details = message.data.details;
    
    this.eventEmitter.emit('error', error);
  }

  /**
   * Send message implementation
   */
  private async sendMessage(message: WebSocketMessage): Promise<void> {
    // Add to queue if not connected
    if (this.connectionState !== 'connected' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.messageQueue.length < this.config.messageQueueSize) {
        this.messageQueue.push(message);
        logger.debug('Message queued for sending when connected');
      } else {
        throw new Error('Message queue is full');
      }
      return;
    }

    try {
        ? this.encodeBinaryMessage(message)
        : JSON.stringify(message);
      
      this.ws.send(data);
      this.messagesSent++;
      
      logger.debug('WebSocket message sent', { type: message.type });
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error);
      throw error;
    }
  }

  /**
   * Wait for connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      if (this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

        reject(new Error('Connection timeout'));
      }, 30000);

        clearTimeout(timeout);
        resolve();
      };

        clearTimeout(timeout);
        reject(new Error('Connection failed'));
      };

      this.ws.addEventListener('open', openHandler, { once: true });
      this.ws.addEventListener('error', errorHandler, { once: true });
    });
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    this.messageQueue = [];

    for (const message of queue) {
      try {
        await this.sendMessage(message);
      } catch (error) {
        logger.error('Failed to send queued message:', error);
      }
    }
  }

  /**
   * Start heartbeat ping/pong
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.pingInterval = setInterval(() => {
      if (this.connectionState === 'connected' && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send('ping', { timestamp: this.lastPingTime }).catch(err => {
          logger.error('Failed to send ping:', err);
        });

        // Check for pong timeout
        setTimeout(() => {
          if (Date.now() - this.lastPingTime > this.config.pongTimeout) {
            logger.warn('Pong timeout - connection may be dead');
            this.handleConnectionLoss();
          }
        }, this.config.pongTimeout);
      }
    }, this.config.pingInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Handle connection loss
   */
  private handleConnectionLoss(): void {
    logger.warn('Connection loss detected');
    
    if (this.ws) {
      this.ws.close(4000, 'Connection loss');
    }
    
    this.ws = null;
    this.connectionState = 'disconnected';
    
    if (this.config.reconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectAttempts++;

    logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch(err => {
        logger.error('Reconnection attempt failed:', err);
      });
    }, delay);
  }

  /**
   * Build connection URL with authentication
   */
  private buildConnectionUrl(): string {

    if (this.config.authentication) {
      const { _type, token, apiKey } = this.config.authentication;
      
      switch (type) {
        case 'token':
          url.searchParams.set('token', token || '');
          break;
        case 'apiKey':
          url.searchParams.set('apiKey', apiKey || '');
          break;
      }
    }

    return url.toString();
  }

  /**
   * Authenticate connection
   */
  private async authenticate(): Promise<void> {
    if (!this.config.authentication) return;

    const { _type, token, apiKey, custom } = this.config.authentication;

    switch (type) {
      case 'token':
        await this.send('auth', { type: 'token', token });
        break;
      case 'apiKey':
        await this.send('auth', { type: 'apiKey', apiKey });
        break;
      case 'custom':
        if (custom) {
          await this.send('auth', custom);
        }
        break;
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Encode message as binary
   */
  private encodeBinaryMessage(message: WebSocketMessage): ArrayBuffer {
    return encoder.encode(jsonString).buffer;
  }

  /**
   * Decode binary message
   */
  private decodeBinaryMessage(data: ArrayBuffer): WebSocketMessage {
    return JSON.parse(jsonString);
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.disconnect();
    this.eventEmitter.removeAllListeners();
    this.subscriptions.clear();
    this.messageQueue = [];
    super.cleanup();
  }
}

// Singleton instance for default WebSocket connection
let defaultWebSocketService: WebSocketService | null = null;

export function initializeWebSocket(config: WebSocketConfig): WebSocketService {
  if (!defaultWebSocketService) {
    defaultWebSocketService = new WebSocketService(config);
  }
  return defaultWebSocketService;
}

export function getWebSocketService(): WebSocketService | null {
  return defaultWebSocketService;
}

// Export event types for convenience
export const WebSocketEvents = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  MESSAGE: 'message',
  EVENT: 'event'
} as const;