/**
 * WebSocket Server
 * Handles real-time bidirectional communication on the server side
 */

import { WebSocketServer as WSServer, WebSocket as WSWebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { EventEmitter } from 'events';
import { logger } from '../services/LogService';
import { RateLimiter } from '../../utils/security';
import type { 
  WebSocketClient, 
  WebSocketMessage,
  WebSocketRoom,
  BroadcastOptions 
} from '../../types/websocket';

export interface WebSocketServerConfig {
  port?: number;
  server?: HTTPServer;
  path?: string;
  maxConnections?: number;
  pingInterval?: number;
  pongTimeout?: number;
  maxMessageSize?: number;
  compression?: boolean;
  authentication?: (token: string) => Promise<{ userId: string } | null>;
  rateLimiting?: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

export class WebSocketServerManager extends EventEmitter {
  private wss: WSServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private rooms: Map<string, WebSocketRoom> = new Map();
  private config: Required<Omit<WebSocketServerConfig, 'server'>> & { server?: HTTPServer };
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: WebSocketServerConfig) {
    super();

    this.config = {
      port: config.port || 8082,
      server: config.server,
      path: config.path || '/ws',
      maxConnections: config.maxConnections || 1000,
      pingInterval: config.pingInterval || 30000,
      pongTimeout: config.pongTimeout || 5000,
      maxMessageSize: config.maxMessageSize || 1024 * 1024, // 1MB
      compression: config.compression !== false,
      authentication: config.authentication || (async () => null),
      rateLimiting: config.rateLimiting || {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000
      }
    };

    // Create WebSocket server
    if (this.config.server !== undefined) {
      this.wss = new WSServer({
        server: this.config.server,
        path: this.config.path,
        maxPayload: this.config.maxMessageSize,
        perMessageDeflate: this.config.compression
      });
    } else {
      this.wss = new WSServer({
        port: this.config.port,
        path: this.config.path,
        maxPayload: this.config.maxMessageSize,
        perMessageDeflate: this.config.compression
      });
    }

    this.setupEventHandlers();
    this.startHeartbeat();

    logger.info('WebSocket server initialized', {
      port: this.config.port,
      path: this.config.path
    });
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WSWebSocket, request: any): Promise<void> {
    const clientId = this.generateClientId();
    const clientIp = (request.socket?.remoteAddress || 'unknown').toString();

    logger.info('New WebSocket connection', { clientId, ip: clientIp });

    // Check connection limit
    if (this.clients.size >= this.config.maxConnections) {
      ws.close(1008, 'Server at capacity');
      return;
    }

    // Create client object
    const client: WebSocketClient = {
      id: clientId,
      socket: ws,
      subscriptions: new Set(),
      metadata: {
        ip: clientIp,
        userAgent: request.headers?.['user-agent'] || 'unknown',
        connectedAt: new Date()
      },
      lastActivity: new Date()
    };

    // Add to clients map
    this.clients.set(clientId, client);

    // Setup client event handlers
    ws.on('message', (data) => this.handleMessage(client, data));
    ws.on('close', (code, reason) => this.handleDisconnect(client, code, reason));
    ws.on('error', (error) => this.handleClientError(client, error));
    ws.on('pong', () => this.handlePong(client));

    // Send welcome message
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'welcome',
      data: {
        clientId,
        serverTime: new Date(),
        config: {
          pingInterval: this.config.pingInterval,
          maxMessageSize: this.config.maxMessageSize
        }
      },
      timestamp: new Date()
    });

    // Emit connection event
    this.emit('connection', client);
  }

  /**
   * Handle client message
   */
  private async handleMessage(client: WebSocketClient, data: Buffer | ArrayBuffer | Buffer[]): Promise<void> {
    client.lastActivity = new Date();

    try {
      // Parse message
      const dataString = Buffer.isBuffer(data)
        ? data.toString('utf8')
        : Array.isArray(data)
        ? Buffer.concat(data).toString('utf8')
        : new TextDecoder().decode(data);
      const message: WebSocketMessage = JSON.parse(dataString);

      // Rate limiting
      if (this.config.rateLimiting.enabled) {
        const key = `ws:${client.id}`;
        if (!RateLimiter.isAllowed(
          key,
          this.config.rateLimiting.maxRequests,
          this.config.rateLimiting.windowMs
        )) {
          this.sendError(client, 'RATE_LIMIT', 'Too many requests');
          return;
        }
      }

      // Log message
      logger.debug('WebSocket message received', {
        clientId: client.id,
        type: message.type
      });

      // Handle different message types
      switch (message.type) {
        case 'ping':
          this.handlePing(client, message);
          break;

        case 'auth':
          await this.handleAuth(client, message);
          break;

        case 'subscribe':
          this.handleSubscribe(client, message);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(client, message);
          break;

        case 'join':
          this.handleJoinRoom(client, message);
          break;

        case 'leave':
          this.handleLeaveRoom(client, message);
          break;

        case 'broadcast':
          this.handleBroadcast(client, message);
          break;

        default:
          // Emit custom message event
          this.emit('message', client, message);
          break;
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message', {
        clientId: client.id,
        error
      });
      this.sendError(client, 'INVALID_MESSAGE', 'Failed to process message');
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(client: WebSocketClient, code: number, reason: Buffer): void {
    logger.info('WebSocket client disconnected', {
      clientId: client.id,
      code,
      reason: reason.toString()
    });

    // Remove from all rooms
    for (const room of Array.from(this.rooms.values())) {
      room.clients.delete(client.id);
    }

    // Remove client
    this.clients.delete(client.id);

    // Emit disconnect event
    this.emit('disconnect', client, code, reason.toString());
  }

  /**
   * Handle client error
   */
  private handleClientError(client: WebSocketClient, error: Error): void {
    logger.error('WebSocket client error', {
      clientId: client.id,
      error: error.message
    });

    // Emit error event
    this.emit('client-error', client, error);
  }

  /**
   * Handle server error
   */
  private handleServerError(error: Error): void {
    logger.error('WebSocket server error', error);
    this.emit('error', error);
  }

  /**
   * Handle ping message
   */
  private handlePing(client: WebSocketClient, message: WebSocketMessage): void {
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'pong',
      data: message.data,
      correlationId: message.id,
      timestamp: new Date()
    });
  }

  /**
   * Handle pong from client
   */
  private handlePong(client: WebSocketClient): void {
    client.lastActivity = new Date();
  }

  /**
   * Handle authentication
   */
  private async handleAuth(client: WebSocketClient, message: WebSocketMessage): Promise<void> {
    try {
      const { token } = message.data as { token: string };
      const authResult = await this.config.authentication(token);

      if (authResult) {
        client.userId = authResult.userId;
        client.metadata.authenticated = true;
        
        this.sendToClient(client, {
          id: this.generateMessageId(),
          type: 'auth.success',
          data: { userId: authResult.userId },
          correlationId: message.id,
          timestamp: new Date()
        });

        logger.info('Client authenticated', {
          clientId: client.id,
          userId: authResult.userId
        });
      } else {
        this.sendError(client, 'AUTH_FAILED', 'Authentication failed', message.id);
      }
    } catch (error) {
      logger.error('Authentication error', error);
      this.sendError(client, 'AUTH_ERROR', 'Authentication error', message.id);
    }
  }

  /**
   * Handle subscription
   */
  private handleSubscribe(client: WebSocketClient, message: WebSocketMessage): void {
    const { event } = message.data as { event: string };
    client.subscriptions.add(event);
    
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'subscribe.success',
      data: { event },
      correlationId: message.id,
      timestamp: new Date()
    });
  }

  /**
   * Handle unsubscription
   */
  private handleUnsubscribe(client: WebSocketClient, message: WebSocketMessage): void {
    const { event } = message.data as { event: string };
    client.subscriptions.delete(event);
    
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'unsubscribe.success',
      data: { event },
      correlationId: message.id,
      timestamp: new Date()
    });
  }

  /**
   * Handle join room
   */
  private handleJoinRoom(client: WebSocketClient, message: WebSocketMessage): void {
    const { roomId } = message.data as { roomId: string };
    
    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: roomId,
        clients: new Set(),
        metadata: {},
        created: new Date()
      };
      this.rooms.set(roomId, room);
    }

    // Add client to room
    room.clients.add(client.id);
    
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'join.success',
      data: { roomId, members: room.clients.size },
      correlationId: message.id,
      timestamp: new Date()
    });

    // Notify other room members
    this.broadcast({
      id: this.generateMessageId(),
      type: 'room.member.joined',
      data: { roomId, clientId: client.id, userId: client.userId },
      timestamp: new Date()
    }, { room: roomId, exclude: [client.id] });
  }

  /**
   * Handle leave room
   */
  private handleLeaveRoom(client: WebSocketClient, message: WebSocketMessage): void {
    const { roomId } = message.data as { roomId: string };
    const room = this.rooms.get(roomId);
    
    if (room) {
      room.clients.delete(client.id);
      
      // Delete room if empty
      if (room.clients.size === 0) {
        this.rooms.delete(roomId);
      }
      
      // Notify other room members
      this.broadcast({
        id: this.generateMessageId(),
        type: 'room.member.left',
        data: { roomId, clientId: client.id, userId: client.userId },
        timestamp: new Date()
      }, { room: roomId });
    }

    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'leave.success',
      data: { roomId },
      correlationId: message.id,
      timestamp: new Date()
    });
  }

  /**
   * Handle broadcast request
   */
  private handleBroadcast(client: WebSocketClient, message: WebSocketMessage): void {
    const { room, data } = message.data as { room?: string; data: Record<string, unknown> };
    
    // Check permissions (implement your own logic)
    if (!this.canBroadcast(client)) {
      this.sendError(client, 'BROADCAST_DENIED', 'Not authorized to broadcast', message.id);
      return;
    }

    this.broadcast({
      id: this.generateMessageId(),
      type: 'broadcast',
      data,
      timestamp: new Date()
    }, { room, exclude: [client.id] });
  }

  /**
   * Send message to specific client
   */
  public sendToClient(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.socket.readyState === WSWebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to client
   */
  private sendError(
    client: WebSocketClient, 
    code: string, 
    message: string, 
    correlationId?: string
  ): void {
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'error',
      data: { code, message },
      correlationId,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast message
   */
  public broadcast(message: WebSocketMessage, options: BroadcastOptions = {}): void {
    const { room, exclude = [], filter } = options;

    for (const [clientId, client] of Array.from(this.clients.entries())) {
      // Skip excluded clients
      if (exclude.includes(clientId)) continue;

      // Check room membership
      if (room) {
        const roomObj = this.rooms.get(room);
        if (!roomObj || !roomObj.clients.has(clientId)) continue;
      }

      // Apply custom filter
      if (filter && !filter(client)) continue;

      this.sendToClient(client, message);
    }
  }

  /**
   * Emit event to subscribed clients
   */
  public emitEvent(event: string, data: Record<string, unknown>): void {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'event',
      data: { name: event, data },
      timestamp: new Date()
    };

    for (const client of Array.from(this.clients.values())) {
      if (client.subscriptions.has(event)) {
        this.sendToClient(client, message);
      }
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.pongTimeout;

      for (const [clientId, client] of Array.from(this.clients.entries())) {
        const lastActivity = client.lastActivity.getTime();
        
        // Check for inactive clients
        if (now - lastActivity > this.config.pingInterval + timeout) {
          logger.warn('Client inactive, disconnecting', { clientId });
          client.socket.terminate();
          continue;
        }

        // Send ping
        if (client.socket.readyState === WSWebSocket.OPEN) {
          (client.socket as WSWebSocket).ping();
        }
      }
    }, this.config.pingInterval);
  }

  /**
   * Check if client can broadcast
   */
  private canBroadcast(client: WebSocketClient): boolean {
    // Simplified authorization without room parameter
    // Implement your authorization logic here
    // For example, check if user is authenticated or has specific permissions
    return !!client.userId;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    clients: number;
    rooms: number;
    subscriptions: number;
    authenticated: number;
  } {
    let subscriptions = 0;
    let authenticated = 0;

    for (const client of Array.from(this.clients.values())) {
      subscriptions += client.subscriptions.size;
      if (client.userId) authenticated++;
    }

    return {
      clients: this.clients.size,
      rooms: this.rooms.size,
      subscriptions,
      authenticated
    };
  }

  /**
   * Get client by ID
   */
  public getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get clients in room
   */
  public getClientsInRoom(roomId: string): WebSocketClient[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.clients)
      .map(clientId => this.clients.get(clientId))
      .filter(client => client !== undefined) as WebSocketClient[];
  }

  /**
   * Shutdown server
   */
  public shutdown(): void {
    logger.info('Shutting down WebSocket server');

    // Stop heartbeat
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all client connections
    for (const client of Array.from(this.clients.values())) {
      client.socket.close(1001, 'Server shutting down');
    }

    // Close server
    this.wss.close();

    // Clear data
    this.clients.clear();
    this.rooms.clear();

    this.emit('shutdown');
  }
}

// Export singleton instance
let wsServer: WebSocketServerManager | null = null;

export function initializeWebSocketServer(config: WebSocketServerConfig): WebSocketServerManager {
  if (!wsServer) {
    wsServer = new WebSocketServerManager(config);
  }
  return wsServer;
}

export function getWebSocketServer(): WebSocketServerManager | null {
  return wsServer;
}