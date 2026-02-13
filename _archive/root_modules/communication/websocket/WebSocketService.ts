import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import WebSocket from 'ws';

export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  userId?: string;
  tenantId?: string;
  sessionId: string;
  channels: Set<string>;
  subscriptions: Set<string>;
  metadata: {
    connectedAt: number;
    lastActivity: number;
    ip: string;
    userAgent?: string;
    origin?: string;
    protocol?: string;
    extensions?: string[];
    compression?: boolean;
    keepAliveInterval?: number;
  };
  authentication: {
    authenticated: boolean;
    token?: string;
    permissions: Set<string>;
    roles: Set<string>;
    expiresAt?: number;
  };
  rate: {
    messages: number;
    bytesReceived: number;
    bytesSent: number;
    lastReset: number;
    limited: boolean;
  };
  state: 'connecting' | 'connected' | 'authenticated' | 'disconnected' | 'error';
}

export interface WebSocketMessage {
  id: string;
  type: string;
  action?: string;
  channel?: string;
  payload: unknown;
  metadata: {
    timestamp: number;
    connectionId: string;
    userId?: string;
    tenantId?: string;
    messageId: string;
    correlationId?: string;
    requestId?: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    ttl?: number;
    retryCount?: number;
  };
  routing: {
    broadcast?: boolean;
    targets?: string[];
    channels?: string[];
    excludeSender?: boolean;
    conditions?: RoutingCondition[];
  };
  compression?: {
    algorithm: 'gzip' | 'deflate' | 'brotli';
    threshold: number;
  };
}

export interface RoutingCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
}

export interface WebSocketChannel {
  name: string;
  type: 'public' | 'private' | 'presence' | 'broadcast';
  connections: Set<string>;
  config: ChannelConfig;
  statistics: {
    connectionCount: number;
    messageCount: number;
    bytesTransferred: number;
    createdAt: number;
    lastActivity: number;
  };
  state: 'active' | 'inactive' | 'suspended';
}

export interface ChannelConfig {
  maxConnections?: number;
  requireAuthentication: boolean;
  permissions?: string[];
  rateLimiting?: {
    messagesPerSecond: number;
    bytesPerSecond: number;
    burstSize: number;
  };
  persistence?: {
    enabled: boolean;
    historySize: number;
    ttl: number;
  };
  compression?: {
    enabled: boolean;
    algorithm: 'gzip' | 'deflate' | 'brotli';
    threshold: number;
  };
  validation?: {
    schema?: unknown;
    strictMode: boolean;
  };
  hooks?: {
    onJoin?: string;
    onLeave?: string;
    onMessage?: string;
  };
}

export interface WebSocketSubscription {
  id: string;
  connectionId: string;
  pattern: string;
  type: 'exact' | 'wildcard' | 'regex';
  filters?: SubscriptionFilter[];
  metadata: {
    createdAt: number;
    messageCount: number;
    lastMessage?: number;
  };
}

export interface SubscriptionFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
}

export interface WebSocketRoom {
  id: string;
  name: string;
  connections: Set<string>;
  maxConnections?: number;
  private: boolean;
  password?: string;
  owner?: string;
  moderators: Set<string>;
  metadata: {
    createdAt: number;
    lastActivity: number;
    messageCount: number;
    tags?: string[];
    customData?: { [key: string]: unknown };
  };
  state: 'active' | 'inactive' | 'locked' | 'archived';
}

export interface WebSocketEvent {
  type: 'connection' | 'disconnection' | 'message' | 'error' | 'authentication' | 'subscription' | 'unsubscription';
  connectionId: string;
  timestamp: number;
  data?: unknown;
  metadata?: {
    ip?: string;
    userAgent?: string;
    duration?: number;
    reason?: string;
    error?: string;
  };
}

export interface WebSocketMetrics {
  connections: {
    total: number;
    active: number;
    authenticated: number;
    byTenant: { [tenantId: string]: number };
  };
  channels: {
    total: number;
    active: number;
    totalConnections: number;
  };
  messages: {
    sent: number;
    received: number;
    bytesTransferred: number;
    messagesPerSecond: number;
  };
  performance: {
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
  };
  timestamp: number;
}

export interface WebSocketServiceConfig {
  server: {
    port: number;
    host?: string;
    path?: string;
    backlog?: number;
    maxPayload?: number;
    compression?: boolean;
    perMessageDeflate?: boolean;
    clientTracking?: boolean;
    skipUTF8Validation?: boolean;
  };
  authentication: {
    enabled: boolean;
    required: boolean;
    tokenValidation: {
      secret?: string;
      algorithm?: string;
      issuer?: string;
      audience?: string;
    };
    sessionTimeout: number;
    maxFailedAttempts: number;
    lockoutDuration: number;
  };
  rateLimiting: {
    enabled: boolean;
    connections: {
      maxPerIP: number;
      maxPerUser: number;
      windowMs: number;
    };
    messages: {
      maxPerSecond: number;
      burstSize: number;
      windowMs: number;
    };
    bandwidth: {
      maxBytesPerSecond: number;
      windowMs: number;
    };
  };
  channels: {
    maxChannels: number;
    maxConnectionsPerChannel: number;
    autoCreateChannels: boolean;
    persistentChannels: string[];
  };
  clustering: {
    enabled: boolean;
    redisUrl?: string;
    nodeId?: string;
    heartbeatInterval: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    enablePerformanceTracking: boolean;
    enableDetailedLogging: boolean;
  };
  security: {
    cors: {
      enabled: boolean;
      origins: string[];
      methods: string[];
      allowedHeaders: string[];
    };
    ssl: {
      enabled: boolean;
      cert?: string;
      key?: string;
      ca?: string;
    };
    ddosProtection: {
      enabled: boolean;
      maxConnectionsPerIP: number;
      windowMs: number;
      banDuration: number;
    };
  };
  persistence: {
    enabled: boolean;
    provider: 'redis' | 'memory' | 'database';
    ttl: number;
    maxHistorySize: number;
  };
}

export class WebSocketService extends EventEmitter {
  private config: WebSocketServiceConfig;
  private server?: WebSocket.Server;
  private connections: Map<string, WebSocketConnection> = new Map();
  private channels: Map<string, WebSocketChannel> = new Map();
  private subscriptions: Map<string, WebSocketSubscription> = new Map();
  private rooms: Map<string, WebSocketRoom> = new Map();
  private messageHistory: Map<string, WebSocketMessage[]> = new Map();
  private rateLimiters: Map<string, unknown> = new Map();
  private bannedIPs: Set<string> = new Set();
  private metrics: WebSocketMetrics;
  private metricsInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: WebSocketServiceConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      await this.createServer();
      this.setupEventHandlers();
      this.startMetricsCollection();
      this.createPersistentChannels();
      
      this.isRunning = true;
      this.emit('service:started', { port: this.config.server.port });
      
    } catch (error) {
      this.emit('service:error', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Close all connections gracefully
    for (const connection of this.connections.values()) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.close(1001, 'Server shutdown');
      }
    }

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    this.isRunning = false;
    this.emit('service:stopped');
  }

  // Connection Management
  public getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  public getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  public getConnectionsByUser(userId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.userId === userId);
  }

  public getConnectionsByTenant(tenantId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.tenantId === tenantId);
  }

  public async authenticateConnection(
    connectionId: string,
    token: string,
    permissions?: string[],
    roles?: string[]
  ): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    try {
      // Validate token (mock implementation)
      const tokenData = await this.validateToken(token);
      
      connection.authentication = {
        authenticated: true,
        token,
        permissions: new Set(permissions || []),
        roles: new Set(roles || []),
        expiresAt: tokenData.expiresAt
      };
      
      connection.userId = tokenData.userId;
      connection.tenantId = tokenData.tenantId;
      connection.state = 'authenticated';

      this.emit('connection:authenticated', { connectionId, userId: tokenData.userId });
      return true;

    } catch (error) {
      this.emit('connection:authentication:failed', { connectionId, error });
      return false;
    }
  }

  public async disconnectConnection(connectionId: string, reason?: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Leave all channels
    for (const channelName of connection.channels) {
      await this.leaveChannel(connectionId, channelName);
    }

    // Remove all subscriptions
    for (const subscriptionId of connection.subscriptions) {
      await this.unsubscribe(connectionId, subscriptionId);
    }

    // Close socket
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close(1000, reason || 'Disconnected');
    }

    connection.state = 'disconnected';
    this.connections.delete(connectionId);

    this.emit('connection:disconnected', { connectionId, reason });
  }

  // Message Operations
  public async sendMessage(
    connectionId: string,
    message: Omit<WebSocketMessage, 'id' | 'metadata'>
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      throw new Error(`Connection not available: ${connectionId}`);
    }

    const wsMessage: WebSocketMessage = {
      id: crypto.randomUUID(),
      metadata: {
        timestamp: Date.now(),
        connectionId,
        userId: connection.userId,
        tenantId: connection.tenantId,
        messageId: crypto.randomUUID(),
        priority: 'normal'
      },
      routing: {},
      ...message
    };

    await this.deliverMessage(connection, wsMessage);
  }

  public async broadcast(
    message: Omit<WebSocketMessage, 'id' | 'metadata' | 'routing'>,
    options: {
      channels?: string[];
      excludeConnections?: string[];
      includeTenants?: string[];
      excludeTenants?: string[];
      requireAuthentication?: boolean;
      permissions?: string[];
    } = {}
  ): Promise<number> {
    let targetConnections = Array.from(this.connections.values());

    // Filter by channels
    if (options.channels && options.channels.length > 0) {
      targetConnections = targetConnections.filter(conn =>
        options.channels!.some(channel => conn.channels.has(channel))
      );
    }

    // Filter by tenant
    if (options.includeTenants) {
      targetConnections = targetConnections.filter(conn =>
        conn.tenantId && options.includeTenants!.includes(conn.tenantId)
      );
    }

    if (options.excludeTenants) {
      targetConnections = targetConnections.filter(conn =>
        !conn.tenantId || !options.excludeTenants!.includes(conn.tenantId)
      );
    }

    // Filter by authentication
    if (options.requireAuthentication) {
      targetConnections = targetConnections.filter(conn => conn.authentication.authenticated);
    }

    // Filter by permissions
    if (options.permissions) {
      targetConnections = targetConnections.filter(conn =>
        options.permissions!.every(permission => conn.authentication.permissions.has(permission))
      );
    }

    // Exclude specific connections
    if (options.excludeConnections) {
      targetConnections = targetConnections.filter(conn =>
        !options.excludeConnections!.includes(conn.id)
      );
    }

    const wsMessage: WebSocketMessage = {
      id: crypto.randomUUID(),
      metadata: {
        timestamp: Date.now(),
        connectionId: 'broadcast',
        messageId: crypto.randomUUID(),
        priority: 'normal'
      },
      routing: { broadcast: true },
      ...message
    };

    let deliveredCount = 0;
    for (const connection of targetConnections) {
      try {
        await this.deliverMessage(connection, wsMessage);
        deliveredCount++;
      } catch (error) {
        this.emit('broadcast:error', { connectionId: connection.id, error });
      }
    }

    this.emit('message:broadcast', { messageId: wsMessage.id, delivered: deliveredCount });
    return deliveredCount;
  }

  // Channel Management
  public async createChannel(
    name: string,
    config: ChannelConfig
  ): Promise<WebSocketChannel> {
    if (this.channels.has(name)) {
      throw new Error(`Channel already exists: ${name}`);
    }

    const channel: WebSocketChannel = {
      name,
      type: 'public',
      connections: new Set(),
      config,
      statistics: {
        connectionCount: 0,
        messageCount: 0,
        bytesTransferred: 0,
        createdAt: Date.now(),
        lastActivity: Date.now()
      },
      state: 'active'
    };

    this.channels.set(name, channel);
    
    if (config.persistence?.enabled) {
      this.messageHistory.set(name, []);
    }

    this.emit('channel:created', channel);
    return channel;
  }

  public async deleteChannel(name: string): Promise<void> {
    const channel = this.channels.get(name);
    if (!channel) {
      throw new Error(`Channel not found: ${name}`);
    }

    // Disconnect all connections from channel
    for (const connectionId of channel.connections) {
      await this.leaveChannel(connectionId, name);
    }

    this.channels.delete(name);
    this.messageHistory.delete(name);

    this.emit('channel:deleted', { name });
  }

  public async joinChannel(connectionId: string, channelName: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    let channel = this.channels.get(channelName);
    
    // Auto-create channel if enabled
    if (!channel && this.config.channels.autoCreateChannels) {
      channel = await this.createChannel(channelName, {
        requireAuthentication: false,
        rateLimiting: {
          messagesPerSecond: 10,
          bytesPerSecond: 1024 * 10,
          burstSize: 20
        }
      });
    }

    if (!channel) {
      throw new Error(`Channel not found: ${channelName}`);
    }

    // Check permissions
    if (channel.config.requireAuthentication && !connection.authentication.authenticated) {
      throw new Error('Authentication required to join channel');
    }

    if (channel.config.permissions) {
      const hasPermission = channel.config.permissions.some(permission =>
        connection.authentication.permissions.has(permission)
      );
      if (!hasPermission) {
        throw new Error('Insufficient permissions to join channel');
      }
    }

    // Check max connections
    if (channel.config.maxConnections && channel.connections.size >= channel.config.maxConnections) {
      throw new Error('Channel is at maximum capacity');
    }

    // Add to channel
    channel.connections.add(connectionId);
    connection.channels.add(channelName);
    channel.statistics.connectionCount = channel.connections.size;
    channel.statistics.lastActivity = Date.now();

    // Send channel history if persistence is enabled
    if (channel.config.persistence?.enabled) {
      const history = this.messageHistory.get(channelName) || [];
      const recentHistory = history.slice(-channel.config.persistence.historySize);
      
      for (const historicalMessage of recentHistory) {
        await this.deliverMessage(connection, {
          ...historicalMessage,
          type: 'channel_history',
          metadata: {
            ...historicalMessage.metadata,
            timestamp: Date.now(),
            connectionId
          }
        });
      }
    }

    this.emit('channel:joined', { connectionId, channelName });
  }

  public async leaveChannel(connectionId: string, channelName: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    const channel = this.channels.get(channelName);

    if (connection) {
      connection.channels.delete(channelName);
    }

    if (channel) {
      channel.connections.delete(connectionId);
      channel.statistics.connectionCount = channel.connections.size;
      channel.statistics.lastActivity = Date.now();
    }

    this.emit('channel:left', { connectionId, channelName });
  }

  public async sendToChannel(
    channelName: string,
    message: Omit<WebSocketMessage, 'id' | 'metadata' | 'channel'>,
    excludeConnection?: string
  ): Promise<number> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel not found: ${channelName}`);
    }

    const wsMessage: WebSocketMessage = {
      id: crypto.randomUUID(),
      channel: channelName,
      metadata: {
        timestamp: Date.now(),
        connectionId: 'channel',
        messageId: crypto.randomUUID(),
        priority: 'normal'
      },
      routing: { channels: [channelName] },
      ...message
    };

    // Store in history if persistence is enabled
    if (channel.config.persistence?.enabled) {
      const history = this.messageHistory.get(channelName) || [];
      history.push(wsMessage);
      
      // Trim history to max size
      if (history.length > channel.config.persistence.historySize) {
        history.splice(0, history.length - channel.config.persistence.historySize);
      }
      
      this.messageHistory.set(channelName, history);
    }

    let deliveredCount = 0;
    for (const connectionId of channel.connections) {
      if (excludeConnection && connectionId === excludeConnection) continue;

      const connection = this.connections.get(connectionId);
      if (connection) {
        try {
          await this.deliverMessage(connection, wsMessage);
          deliveredCount++;
        } catch (error) {
          this.emit('channel:message:error', { connectionId, channelName, error });
        }
      }
    }

    channel.statistics.messageCount++;
    channel.statistics.lastActivity = Date.now();

    this.emit('channel:message:sent', { channelName, messageId: wsMessage.id, delivered: deliveredCount });
    return deliveredCount;
  }

  // Subscription Management
  public async subscribe(
    connectionId: string,
    pattern: string,
    type: WebSocketSubscription['type'] = 'exact',
    filters?: SubscriptionFilter[]
  ): Promise<string> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const subscription: WebSocketSubscription = {
      id: crypto.randomUUID(),
      connectionId,
      pattern,
      type,
      filters,
      metadata: {
        createdAt: Date.now(),
        messageCount: 0
      }
    };

    this.subscriptions.set(subscription.id, subscription);
    connection.subscriptions.add(subscription.id);

    this.emit('subscription:created', subscription);
    return subscription.id;
  }

  public async unsubscribe(connectionId: string, subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.connectionId !== connectionId) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.delete(subscriptionId);
    }

    this.subscriptions.delete(subscriptionId);
    this.emit('subscription:cancelled', subscription);
  }

  // Room Management
  public async createRoom(
    name: string,
    options: {
      private?: boolean;
      password?: string;
      maxConnections?: number;
      owner?: string;
    } = {}
  ): Promise<WebSocketRoom> {
    if (this.rooms.has(name)) {
      throw new Error(`Room already exists: ${name}`);
    }

    const room: WebSocketRoom = {
      id: crypto.randomUUID(),
      name,
      connections: new Set(),
      maxConnections: options.maxConnections,
      private: options.private || false,
      password: options.password,
      owner: options.owner,
      moderators: new Set(),
      metadata: {
        createdAt: Date.now(),
        lastActivity: Date.now(),
        messageCount: 0
      },
      state: 'active'
    };

    this.rooms.set(name, room);
    this.emit('room:created', room);
    
    return room;
  }

  public async joinRoom(
    connectionId: string,
    roomName: string,
    password?: string
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    const room = this.rooms.get(roomName);

    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (!room) {
      throw new Error(`Room not found: ${roomName}`);
    }

    // Check password for private rooms
    if (room.private && room.password && room.password !== password) {
      throw new Error('Invalid room password');
    }

    // Check capacity
    if (room.maxConnections && room.connections.size >= room.maxConnections) {
      throw new Error('Room is at maximum capacity');
    }

    room.connections.add(connectionId);
    room.metadata.lastActivity = Date.now();

    this.emit('room:joined', { connectionId, roomName });
  }

  public async leaveRoom(connectionId: string, roomName: string): Promise<void> {
    const room = this.rooms.get(roomName);
    if (!room) return;

    room.connections.delete(connectionId);
    room.metadata.lastActivity = Date.now();

    this.emit('room:left', { connectionId, roomName });
  }

  public async sendToRoom(
    roomName: string,
    message: Omit<WebSocketMessage, 'id' | 'metadata'>,
    excludeConnection?: string
  ): Promise<number> {
    const room = this.rooms.get(roomName);
    if (!room) {
      throw new Error(`Room not found: ${roomName}`);
    }

    const wsMessage: WebSocketMessage = {
      id: crypto.randomUUID(),
      metadata: {
        timestamp: Date.now(),
        connectionId: 'room',
        messageId: crypto.randomUUID(),
        priority: 'normal'
      },
      routing: {},
      ...message
    };

    let deliveredCount = 0;
    for (const connectionId of room.connections) {
      if (excludeConnection && connectionId === excludeConnection) continue;

      const connection = this.connections.get(connectionId);
      if (connection) {
        try {
          await this.deliverMessage(connection, wsMessage);
          deliveredCount++;
        } catch (error) {
          this.emit('room:message:error', { connectionId, roomName, error });
        }
      }
    }

    room.metadata.messageCount++;
    room.metadata.lastActivity = Date.now();

    this.emit('room:message:sent', { roomName, messageId: wsMessage.id, delivered: deliveredCount });
    return deliveredCount;
  }

  // Private Methods
  private async createServer(): Promise<void> {
    this.server = new WebSocket.Server({
      port: this.config.server.port,
      host: this.config.server.host,
      path: this.config.server.path,
      backlog: this.config.server.backlog,
      maxPayload: this.config.server.maxPayload,
      perMessageDeflate: this.config.server.perMessageDeflate,
      clientTracking: this.config.server.clientTracking,
      skipUTF8Validation: this.config.server.skipUTF8Validation
    });
  }

  private setupEventHandlers(): void {
    if (!this.server) return;

    this.server.on('connection', (socket, request) => {
      this.handleConnection(socket, request);
    });

    this.server.on('error', (error) => {
      this.emit('server:error', error);
    });
  }

  private handleConnection(socket: WebSocket, request: unknown): void {
    const connectionId = crypto.randomUUID();
    const ip = request.socket.remoteAddress;

    // Check IP ban
    if (this.bannedIPs.has(ip)) {
      socket.close(1008, 'IP banned');
      return;
    }

    // Check rate limiting
    if (this.config.rateLimiting.enabled && !this.checkConnectionRateLimit(ip)) {
      socket.close(1008, 'Rate limit exceeded');
      return;
    }

    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      sessionId: crypto.randomUUID(),
      channels: new Set(),
      subscriptions: new Set(),
      metadata: {
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        ip,
        userAgent: request.headers['user-agent'],
        origin: request.headers.origin,
        protocol: request.headers['sec-websocket-protocol'],
        extensions: request.headers['sec-websocket-extensions']?.split(',') || []
      },
      authentication: {
        authenticated: false,
        permissions: new Set(),
        roles: new Set()
      },
      rate: {
        messages: 0,
        bytesReceived: 0,
        bytesSent: 0,
        lastReset: Date.now(),
        limited: false
      },
      state: 'connected'
    };

    this.connections.set(connectionId, connection);

    // Set up socket event handlers
    socket.on('message', (data) => {
      this.handleMessage(connectionId, data);
    });

    socket.on('close', (code, reason) => {
      this.handleDisconnection(connectionId, code, reason);
    });

    socket.on('error', (error) => {
      this.handleConnectionError(connectionId, error);
    });

    socket.on('pong', () => {
      connection.metadata.lastActivity = Date.now();
    });

    // Start keep-alive if configured
    if (connection.metadata.keepAliveInterval) {
      const keepAliveTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping();
        }
      }, connection.metadata.keepAliveInterval);
      
      socket.on('close', () => clearInterval(keepAliveTimer));
    }

    this.emit('connection:established', { connectionId, ip });
  }

  private async handleMessage(connectionId: string, data: WebSocket.Data): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Check rate limiting
      if (!this.checkMessageRateLimit(connection)) {
        connection.socket.close(1008, 'Message rate limit exceeded');
        return;
      }

      // Parse message
      let message: unknown;
      try {
        message = JSON.parse(data.toString());
      } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        connection.socket.send(JSON.stringify({
          type: 'error',
          error: 'Invalid JSON format'
        }));
        return;
      }

      // Update connection activity
      connection.metadata.lastActivity = Date.now();
      connection.rate.messages++;
      connection.rate.bytesReceived += data.length;

      // Handle different message types
      await this.processIncomingMessage(connection, message);

    } catch (error) {
      this.emit('message:error', { connectionId, error });
      
      connection.socket.send(JSON.stringify({
        type: 'error',
        error: 'Message processing failed'
      }));
    }
  }

  private async processIncomingMessage(connection: WebSocketConnection, message: unknown): Promise<void> {
    switch (message.type) {
      case 'authenticate':
        await this.handleAuthenticationMessage(connection, message);
        break;
      case 'join_channel':
        await this.handleJoinChannelMessage(connection, message);
        break;
      case 'leave_channel':
        await this.handleLeaveChannelMessage(connection, message);
        break;
      case 'subscribe':
        await this.handleSubscribeMessage(connection, message);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribeMessage(connection, message);
        break;
      case 'message':
        await this.handleUserMessage(connection, message);
        break;
      case 'ping':
        await this.handlePingMessage(connection, message);
        break;
      default:
        this.emit('message:unknown', { connectionId: connection.id, type: message.type });
    }
  }

  private async handleAuthenticationMessage(connection: WebSocketConnection, message: unknown): Promise<void> {
    try {
      const success = await this.authenticateConnection(
        connection.id,
        message.token,
        message.permissions,
        message.roles
      );

      connection.socket.send(JSON.stringify({
        type: 'authentication_result',
        success,
        userId: connection.userId,
        sessionId: connection.sessionId
      }));
    } catch (error) {
      connection.socket.send(JSON.stringify({
        type: 'authentication_result',
        success: false,
        error: error.message
      }));
    }
  }

  private async handleJoinChannelMessage(connection: WebSocketConnection, message: unknown): Promise<void> {
    try {
      await this.joinChannel(connection.id, message.channel);
      connection.socket.send(JSON.stringify({
        type: 'channel_joined',
        channel: message.channel
      }));
    } catch (error) {
      connection.socket.send(JSON.stringify({
        type: 'channel_join_failed',
        channel: message.channel,
        error: error.message
      }));
    }
  }

  private async handleLeaveChannelMessage(connection: WebSocketConnection, message: unknown): Promise<void> {
    await this.leaveChannel(connection.id, message.channel);
    connection.socket.send(JSON.stringify({
      type: 'channel_left',
      channel: message.channel
    }));
  }

  private async handleSubscribeMessage(connection: WebSocketConnection, message: unknown): Promise<void> {
    try {
      const subscriptionId = await this.subscribe(
        connection.id,
        message.pattern,
        message.type || 'exact',
        message.filters
      );

      connection.socket.send(JSON.stringify({
        type: 'subscription_created',
        subscriptionId,
        pattern: message.pattern
      }));
    } catch (error) {
      connection.socket.send(JSON.stringify({
        type: 'subscription_failed',
        pattern: message.pattern,
        error: error.message
      }));
    }
  }

  private async handleUnsubscribeMessage(connection: WebSocketConnection, message: unknown): Promise<void> {
    await this.unsubscribe(connection.id, message.subscriptionId);
    connection.socket.send(JSON.stringify({
      type: 'subscription_cancelled',
      subscriptionId: message.subscriptionId
    }));
  }

  private async handleUserMessage(connection: WebSocketConnection, message: unknown): Promise<void> {
    const wsMessage: WebSocketMessage = {
      id: crypto.randomUUID(),
      type: message.messageType || 'user_message',
      payload: message.payload,
      metadata: {
        timestamp: Date.now(),
        connectionId: connection.id,
        userId: connection.userId,
        tenantId: connection.tenantId,
        messageId: crypto.randomUUID(),
        priority: message.priority || 'normal'
      },
      routing: message.routing || {}
    };

    // Route message based on routing configuration
    if (message.channel) {
      await this.sendToChannel(message.channel, wsMessage, connection.id);
    } else if (message.room) {
      await this.sendToRoom(message.room, wsMessage, connection.id);
    } else if (message.routing?.targets) {
      for (const targetId of message.routing.targets) {
        try {
          await this.sendMessage(targetId, wsMessage);
        } catch (error) {
          this.emit('message:routing:error', { targetId, error });
        }
      }
    }

    // Check subscriptions for pattern matching
    await this.processSubscriptions(wsMessage);
  }

  private async handlePingMessage(connection: WebSocketConnection, message: unknown): Promise<void> {
    connection.socket.send(JSON.stringify({
      type: 'pong',
      timestamp: Date.now(),
      data: message.data
    }));
  }

  private handleDisconnection(connectionId: string, code: number, reason: Buffer): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Leave all channels
    for (const channelName of connection.channels) {
      this.leaveChannel(connectionId, channelName);
    }

    // Cancel all subscriptions
    for (const subscriptionId of connection.subscriptions) {
      this.subscriptions.delete(subscriptionId);
    }

    // Remove from all rooms
    for (const room of this.rooms.values()) {
      room.connections.delete(connectionId);
    }

    this.connections.delete(connectionId);

    this.emit('connection:disconnected', {
      connectionId,
      code,
      reason: reason.toString(),
      duration: Date.now() - connection.metadata.connectedAt
    });
  }

  private handleConnectionError(connectionId: string, error: Error): void {
    this.emit('connection:error', { connectionId, error });
  }

  private async deliverMessage(connection: WebSocketConnection, message: WebSocketMessage): Promise<void> {
    if (connection.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Connection not open');
    }

    // Apply compression if configured
    const data = JSON.stringify(message);
    if (message.compression && data.length > message.compression.threshold) {
      // Apply compression (mock implementation)
      console.log(`Compressing message with ${message.compression.algorithm}`);
    }

    connection.socket.send(data);
    connection.rate.bytesSent += data.length;
    
    this.emit('message:delivered', { connectionId: connection.id, messageId: message.id });
  }

  private async processSubscriptions(message: WebSocketMessage): Promise<void> {
    for (const subscription of this.subscriptions.values()) {
      if (this.matchesSubscription(message, subscription)) {
        const connection = this.connections.get(subscription.connectionId);
        if (connection) {
          try {
            await this.deliverMessage(connection, {
              ...message,
              type: 'subscription_message',
              metadata: {
                ...message.metadata,
                connectionId: connection.id
              }
            });
            
            subscription.metadata.messageCount++;
            subscription.metadata.lastMessage = Date.now();
          } catch (error) {
            this.emit('subscription:delivery:error', { subscriptionId: subscription.id, error });
          }
        }
      }
    }
  }

  private matchesSubscription(message: WebSocketMessage, subscription: WebSocketSubscription): boolean {
    // Pattern matching logic
    let matches = false;
    
    switch (subscription.type) {
      case 'exact':
        matches = message.type === subscription.pattern;
        break;
      case 'wildcard':
        matches = this.matchWildcard(message.type, subscription.pattern);
        break;
      case 'regex':
        matches = new RegExp(subscription.pattern).test(message.type);
        break;
    }

    if (!matches) return false;

    // Apply filters
    if (subscription.filters) {
      for (const filter of subscription.filters) {
        const value = this.getNestedValue(message, filter.field);
        if (!this.evaluateFilterCondition(value, filter.operator, filter.value)) {
          return false;
        }
      }
    }

    return true;
  }

  private matchWildcard(text: string, pattern: string): boolean {
    const regex = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${regex}$`).test(text);
  }

  private evaluateFilterCondition(value: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
        return value === expected;
      case 'ne':
        return value !== expected;
      case 'gt':
        return value > expected;
      case 'lt':
        return value < expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'nin':
        return Array.isArray(expected) && !expected.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(expected);
      case 'regex':
        return typeof value === 'string' && new RegExp(expected).test(value);
      default:
        return false;
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private checkConnectionRateLimit(ip: string): boolean {
    if (!this.config.rateLimiting.enabled) return true;

    const key = `conn_${ip}`;
    const limiter = this.rateLimiters.get(key) || { count: 0, resetTime: Date.now() + this.config.rateLimiting.connections.windowMs };
    
    if (Date.now() > limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = Date.now() + this.config.rateLimiting.connections.windowMs;
    }

    limiter.count++;
    this.rateLimiters.set(key, limiter);

    return limiter.count <= this.config.rateLimiting.connections.maxPerIP;
  }

  private checkMessageRateLimit(connection: WebSocketConnection): boolean {
    if (!this.config.rateLimiting.enabled) return true;

    const now = Date.now();
    const windowMs = this.config.rateLimiting.messages.windowMs;
    
    if (now - connection.rate.lastReset > windowMs) {
      connection.rate.messages = 0;
      connection.rate.lastReset = now;
      connection.rate.limited = false;
    }

    if (connection.rate.messages >= this.config.rateLimiting.messages.maxPerSecond) {
      connection.rate.limited = true;
      return false;
    }

    return true;
  }

  private async validateToken(token: string): Promise<{ userId: string; tenantId?: string; expiresAt?: number }> {
    // Mock token validation - in real implementation, use JWT library
    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return {
        userId: decoded.sub,
        tenantId: decoded.tenant,
        expiresAt: decoded.exp * 1000
      };
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error('Invalid token format');
    }
  }

  private createPersistentChannels(): void {
    for (const channelName of this.config.channels.persistentChannels) {
      this.createChannel(channelName, {
        requireAuthentication: false,
        persistence: {
          enabled: true,
          historySize: 100,
          ttl: 24 * 60 * 60 * 1000 // 24 hours
        }
      }).catch(error => {
        this.emit('channel:create:error', { channelName, error });
      });
    }
  }

  private initializeMetrics(): WebSocketMetrics {
    return {
      connections: {
        total: 0,
        active: 0,
        authenticated: 0,
        byTenant: {}
      },
      channels: {
        total: 0,
        active: 0,
        totalConnections: 0
      },
      messages: {
        sent: 0,
        received: 0,
        bytesTransferred: 0,
        messagesPerSecond: 0
      },
      performance: {
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0
      },
      timestamp: Date.now()
    };
  }

  private startMetricsCollection(): void {
    if (!this.config.monitoring.enabled) return;

    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  private updateMetrics(): void {
    const connections = Array.from(this.connections.values());
    const channels = Array.from(this.channels.values());

    this.metrics = {
      connections: {
        total: connections.length,
        active: connections.filter(c => c.state === 'connected' || c.state === 'authenticated').length,
        authenticated: connections.filter(c => c.authentication.authenticated).length,
        byTenant: connections.reduce((acc, conn) => {
          if (conn.tenantId) {
            acc[conn.tenantId] = (acc[conn.tenantId] || 0) + 1;
          }
          return acc;
        }, {} as { [key: string]: number })
      },
      channels: {
        total: channels.length,
        active: channels.filter(c => c.state === 'active').length,
        totalConnections: channels.reduce((sum, c) => sum + c.connections.size, 0)
      },
      messages: {
        sent: connections.reduce((sum, c) => sum + c.rate.bytesSent, 0),
        received: connections.reduce((sum, c) => sum + c.rate.bytesReceived, 0),
        bytesTransferred: connections.reduce((sum, c) => sum + c.rate.bytesSent + c.rate.bytesReceived, 0),
        messagesPerSecond: connections.reduce((sum, c) => sum + c.rate.messages, 0) / (this.config.monitoring.metricsInterval / 1000)
      },
      performance: {
        avgLatency: 0, // Would calculate actual latency
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0
      },
      timestamp: Date.now()
    };

    this.emit('metrics:updated', this.metrics);
  }

  // Public API
  public getChannel(name: string): WebSocketChannel | undefined {
    return this.channels.get(name);
  }

  public getAllChannels(): WebSocketChannel[] {
    return Array.from(this.channels.values());
  }

  public getRoom(name: string): WebSocketRoom | undefined {
    return this.rooms.get(name);
  }

  public getAllRooms(): WebSocketRoom[] {
    return Array.from(this.rooms.values());
  }

  public getSubscription(id: string): WebSocketSubscription | undefined {
    return this.subscriptions.get(id);
  }

  public getAllSubscriptions(): WebSocketSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public getMetrics(): WebSocketMetrics {
    return this.metrics;
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getChannelCount(): number {
    return this.channels.size;
  }
}

export default WebSocketService;