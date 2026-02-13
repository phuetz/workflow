/**
 * WebSocket Server Service
 * Real-time WebSocket server communication with rooms, authentication, and message routing
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { Express } from 'express';
import { logger } from './LoggingService';
import { authService } from './AuthManager';
import { monitoringService } from './MonitoringService';

interface WebSocketUser {
  id: string;
  socketId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  rooms: Set<string>;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

interface Room {
  id: string;
  name: string;
  type: 'workflow' | 'execution' | 'collaboration' | 'chat' | 'custom';
  users: Set<string>;
  permissions: {
    join: string[];
    send: string[];
    manage: string[];
  };
  metadata: Record<string, unknown>;
  created: Date;
  lastActivity: Date;
}

interface WebSocketMessage {
  type: string;
  payload: unknown;
  userId?: string;
  room?: string;
  timestamp: Date;
  id: string;
}

interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalRooms: number;
  messagesPerSecond: number;
  userStats: Map<string, {
    connections: number;
    messages: number;
    lastSeen: Date;
  }>;
  roomStats: Map<string, {
    users: number;
    messages: number;
    lastActivity: Date;
  }>;
}

export class WebSocketServerService {
  private static instance: WebSocketServerService;
  private io: Server | null = null;
  private httpServer: unknown = null;
  private connectedUsers: Map<string, WebSocketUser> = new Map();
  private rooms: Map<string, Room> = new Map();
  private messageHistory: Map<string, WebSocketMessage[]> = new Map();
  private stats: WebSocketStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    totalRooms: 0,
    messagesPerSecond: 0,
    userStats: new Map(),
    roomStats: new Map()
  };
  private messageRateTracker: number[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): WebSocketServerService {
    if (!WebSocketServerService.instance) {
      WebSocketServerService.instance = new WebSocketServerService();
    }
    return WebSocketServerService.instance;
  }

  /**
   * Initialize WebSocket server
   */
  public initialize(app: Express, port: number = 3002): void {
    try {
      // Create HTTP server
      this.httpServer = createServer(app);

      // Initialize Socket.IO
      this.io = new Server(this.httpServer, {
        cors: {
          origin: process.env.CORS_ORIGIN || "*",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        maxHttpBufferSize: 1e6, // 1MB
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Setup middleware
      this.setupMiddleware();

      // Setup event handlers
      this.setupEventHandlers();

      // Setup default rooms
      this.setupDefaultRooms();

      // Start cleanup interval
      this.startCleanup();

      // Start HTTP server
      this.httpServer.listen(port, () => {
        logger.info(`🔌 WebSocket server listening on port ${port}`);
      });

    } catch (error) {
      logger.error('❌ Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        if (!user) {
          return next(new Error('Invalid authentication token'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        logger.error('❌ WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // Rate limiting would be implemented here
      next();
    });

    // Logging middleware
    this.io.use((socket, next) => {
      logger.info(`🔌 WebSocket connection attempt from user: ${socket.data.user?.id}`);
      next();
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: unknown): void {
    
    try {
      // Create user session
      const webSocketUser: WebSocketUser = {
        id: socket.id,
        socketId: socket.id,
        userId: user.id,
        roles: user.roles || [],
        permissions: user.permissions || [],
        rooms: new Set(),
        lastActivity: new Date(),
        metadata: {
          userAgent: socket.handshake.headers['user-agent'],
          ip: socket.handshake.address
        }
      };

      this.connectedUsers.set(socket.id, webSocketUser);
      this.updateConnectionStats(true);

      logger.info(`✅ WebSocket user connected: ${user.id} (${socket.id})`);

      // Setup socket event handlers
      this.setupSocketHandlers(socket, webSocketUser);

      // Send welcome message
      this.sendToSocket(socket.id, 'connection:welcome', {
        userId: user.id,
        socketId: socket.id,
        serverTime: new Date().toISOString(),
        availableRooms: this.getAvailableRooms(webSocketUser)
      });

      // Auto-join user to personal room
      this.joinRoom(socket.id, `user:${user.id}`);

    } catch (error) {
      logger.error('❌ Error handling WebSocket connection:', error);
      socket.disconnect();
    }
  }

  private setupSocketHandlers(socket: unknown, user: WebSocketUser): void {
    // Join room
    socket.on('room:join', async (data: { roomId: string; password?: string }) => {
      try {
        await this.handleJoinRoom(socket.id, data.roomId, data.password);
      } catch (error) {
        this.sendError(socket.id, 'room:join:error', error.message);
      }
    });

    // Leave room
    socket.on('room:leave', (data: { roomId: string }) => {
      try {
        this.handleLeaveRoom(socket.id, data.roomId);
      } catch (error) {
        this.sendError(socket.id, 'room:leave:error', error.message);
      }
    });

    // Send message
    socket.on('message:send', async (data: { roomId: string; type: string; payload: unknown }) => {
      try {
        await this.handleSendMessage(socket.id, data);
      } catch (error) {
        this.sendError(socket.id, 'message:send:error', error.message);
      }
    });

    // Create room
    socket.on('room:create', async (data: { name: string; type: string; permissions?: unknown; metadata?: unknown }) => {
      try {
        await this.handleCreateRoom(socket.id, data);
      } catch (error) {
        this.sendError(socket.id, 'room:create:error', error.message);
      }
    });

    // Workflow events
    socket.on('workflow:subscribe', (data: { workflowId: string }) => {
      this.handleWorkflowSubscription(socket.id, data.workflowId);
    });

    socket.on('workflow:unsubscribe', (data: { workflowId: string }) => {
      this.handleWorkflowUnsubscription(socket.id, data.workflowId);
    });

    // Execution events
    socket.on('execution:subscribe', (data: { executionId: string }) => {
      this.handleExecutionSubscription(socket.id, data.executionId);
    });

    // Collaboration events
    socket.on('collaboration:cursor', (data: { workflowId: string; position: { x: number; y: number } }) => {
      this.handleCursorUpdate(socket.id, data);
    });

    socket.on('collaboration:selection', (data: { workflowId: string; nodeIds: string[] }) => {
      this.handleSelectionUpdate(socket.id, data);
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      user.lastActivity = new Date();
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket.id, reason);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`❌ WebSocket error for user ${user.userId}:`, error);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleJoinRoom(socketId: string, roomId: string, password?: string): Promise<void> {
    if (!user) throw new Error('User not found');

    if (!room) throw new Error('Room not found');

    // Check permissions
    if (!this.hasPermission(user, room.permissions.join)) {
      throw new Error('Insufficient permissions to join room');
    }

    // Join room
    await this.joinRoom(socketId, roomId);
    
    logger.info(`🏠 User ${user.userId} joined room: ${roomId}`);
  }

  private handleLeaveRoom(socketId: string, roomId: string): void {
    if (!user) return;

    this.leaveRoom(socketId, roomId);
    
    logger.info(`🚪 User ${user.userId} left room: ${roomId}`);
  }

  private async handleSendMessage(socketId: string, data: { roomId: string; type: string; payload: unknown }): Promise<void> {
    if (!user) throw new Error('User not found');

    if (!room) throw new Error('Room not found');

    // Check if user is in room
    if (!user.rooms.has(data.roomId)) {
      throw new Error('User not in room');
    }

    // Check send permissions
    if (!this.hasPermission(user, room.permissions.send)) {
      throw new Error('Insufficient permissions to send messages');
    }

    // Create message
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: data.type,
      payload: data.payload,
      userId: user.userId,
      room: data.roomId,
      timestamp: new Date()
    };

    // Store message history
    this.storeMessage(data.roomId, message);

    // Send to room
    this.broadcastToRoom(data.roomId, 'message:received', message);

    // Update stats
    this.updateMessageStats(user.userId, data.roomId);

    // Update user activity
    user.lastActivity = new Date();

    logger.debug(`💬 Message sent by ${user.userId} to room ${data.roomId}: ${message.type}`);
  }

  private async handleCreateRoom(socketId: string, data: { name: string; type: string; permissions?: unknown; metadata?: unknown }): Promise<void> {
    if (!user) throw new Error('User not found');

    // Check if user can create rooms
    if (!user.permissions.includes('rooms:create')) {
      throw new Error('Insufficient permissions to create rooms');
    }

    const room: Room = {
      id: roomId,
      name: data.name,
      type: data.type as string,
      users: new Set(),
      permissions: data.permissions || {
        join: ['authenticated'],
        send: ['authenticated'],
        manage: [user.userId]
      },
      metadata: data.metadata || {},
      created: new Date(),
      lastActivity: new Date()
    };

    this.rooms.set(roomId, room);
    this.stats.totalRooms++;

    // Auto-join creator
    await this.joinRoom(socketId, roomId);

    this.sendToSocket(socketId, 'room:created', {
      roomId,
      room: this.serializeRoom(room)
    });

    logger.info(`🏠 Room created: ${roomId} by user ${user.userId}`);
  }

  private handleWorkflowSubscription(socketId: string, workflowId: string): void {
    this.joinRoom(socketId, roomId);
    
    logger.info(`📋 User ${user?.userId} subscribed to workflow: ${workflowId}`);
  }

  private handleWorkflowUnsubscription(socketId: string, workflowId: string): void {
    this.leaveRoom(socketId, roomId);
    
    logger.info(`📋 User ${user?.userId} unsubscribed from workflow: ${workflowId}`);
  }

  private handleExecutionSubscription(socketId: string, executionId: string): void {
    this.joinRoom(socketId, roomId);
    
    logger.info(`⚡ User ${user?.userId} subscribed to execution: ${executionId}`);
  }

  private handleCursorUpdate(socketId: string, data: { workflowId: string; position: { x: number; y: number } }): void {
    if (!user) return;

    
    this.broadcastToRoom(roomId, 'collaboration:cursor', {
      userId: user.userId,
      position: data.position,
      timestamp: new Date()
    }, socketId); // Exclude sender
  }

  private handleSelectionUpdate(socketId: string, data: { workflowId: string; nodeIds: string[] }): void {
    if (!user) return;

    
    this.broadcastToRoom(roomId, 'collaboration:selection', {
      userId: user.userId,
      nodeIds: data.nodeIds,
      timestamp: new Date()
    }, socketId); // Exclude sender
  }

  private handleDisconnection(socketId: string, reason: string): void {
    if (!user) return;

    // Leave all rooms
    for (const roomId of user.rooms) {
      this.leaveRoom(socketId, roomId, false);
    }

    // Remove user
    this.connectedUsers.delete(socketId);
    this.updateConnectionStats(false);

    logger.info(`❌ WebSocket user disconnected: ${user.userId} (${socketId}) - ${reason}`);
  }

  private async joinRoom(socketId: string, roomId: string): Promise<void> {
    if (!user) return;

    // Create room if it doesn't exist (for system rooms)
    if (!this.rooms.has(roomId) && this.isSystemRoom(roomId)) {
      await this.createSystemRoom(roomId);
    }

    if (!room) return;

    // Add user to room
    user.rooms.add(roomId);
    room.users.add(socketId);
    room.lastActivity = new Date();

    // Join socket to room
    if (this.io) {
      if (socket) {
        socket.join(roomId);
      }
    }

    // Update room stats
    this.updateRoomStats(roomId);

    // Notify room about new user
    this.broadcastToRoom(roomId, 'room:user:joined', {
      userId: user.userId,
      socketId,
      timestamp: new Date()
    }, socketId);

    // Send room info to user
    this.sendToSocket(socketId, 'room:joined', {
      roomId,
      room: this.serializeRoom(room),
      users: Array.from(room.users).map(id => this.connectedUsers.get(id)).filter(Boolean)
    });
  }

  private leaveRoom(socketId: string, roomId: string, notify: boolean = true): void {
    if (!user) return;

    if (!room) return;

    // Remove user from room
    user.rooms.delete(roomId);
    room.users.delete(socketId);

    // Leave socket room
    if (this.io) {
      if (socket) {
        socket.leave(roomId);
      }
    }

    // Update room stats
    this.updateRoomStats(roomId);

    if (notify) {
      // Notify room about user leaving
      this.broadcastToRoom(roomId, 'room:user:left', {
        userId: user.userId,
        socketId,
        timestamp: new Date()
      });

      // Send confirmation to user
      this.sendToSocket(socketId, 'room:left', { roomId });
    }

    // Clean up empty non-system rooms
    if (room.users.size === 0 && !this.isSystemRoom(roomId)) {
      this.rooms.delete(roomId);
      this.stats.totalRooms--;
    }
  }

  private broadcastToRoom(roomId: string, event: string, data: unknown, excludeSocketId?: string): void {
    if (!this.io) return;

    if (excludeSocketId) {
      this.io.to(roomId).except(excludeSocketId).emit(event, data);
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }

  private sendToSocket(socketId: string, event: string, data: unknown): void {
    if (!this.io) return;

    if (socket) {
      socket.emit(event, data);
    }
  }

  private sendError(socketId: string, event: string, message: string): void {
    this.sendToSocket(socketId, event, {
      error: true,
      message,
      timestamp: new Date().toISOString()
    });
  }

  private setupDefaultRooms(): void {
      {
        id: 'general',
        name: 'General Chat',
        type: 'chat' as const,
        permissions: {
          join: ['authenticated'],
          send: ['authenticated'],
          manage: ['admin']
        }
      },
      {
        id: 'announcements',
        name: 'Announcements',
        type: 'chat' as const,
        permissions: {
          join: ['authenticated'],
          send: ['admin'],
          manage: ['admin']
        }
      }
    ];

    for (const roomData of defaultRooms) {
      const room: Room = {
        ...roomData,
        users: new Set(),
        metadata: {},
        created: new Date(),
        lastActivity: new Date()
      };

      this.rooms.set(room.id, room);
      this.stats.totalRooms++;
    }

    logger.info(`🏠 Created ${defaultRooms.length} default rooms`);
  }

  private async createSystemRoom(roomId: string): Promise<void> {
    let type: Room['type'] = 'custom';

    if (roomId.startsWith('user:')) {
      name = `User Room`;
      type = 'custom';
    } else if (roomId.startsWith('workflow:')) {
      name = `Workflow ${roomId.split(':')[1]}`;
      type = 'workflow';
    } else if (roomId.startsWith('execution:')) {
      name = `Execution ${roomId.split(':')[1]}`;
      type = 'execution';
    }

    const room: Room = {
      id: roomId,
      name,
      type,
      users: new Set(),
      permissions: {
        join: ['authenticated'],
        send: ['authenticated'],
        manage: ['admin']
      },
      metadata: { system: true },
      created: new Date(),
      lastActivity: new Date()
    };

    this.rooms.set(roomId, room);
    this.stats.totalRooms++;
  }

  private isSystemRoom(roomId: string): boolean {
    return roomId.startsWith('user:') || 
           roomId.startsWith('workflow:') || 
           roomId.startsWith('execution:') ||
           roomId === 'general' ||
           roomId === 'announcements';
  }

  private hasPermission(user: WebSocketUser, requiredPermissions: string[]): boolean {
    if (requiredPermissions.includes('everyone')) return true;
    if (requiredPermissions.includes('authenticated') && user.userId) return true;
    
    // Check roles
    if (hasRole) return true;

    // Check specific permissions
    if (hasPermission) return true;

    // Check user ID
    return requiredPermissions.includes(user.userId);
  }

  private storeMessage(roomId: string, message: WebSocketMessage): void {
    if (!this.messageHistory.has(roomId)) {
      this.messageHistory.set(roomId, []);
    }

    history.push(message);

    // Keep only last 1000 messages per room
    if (history.length > 1000) {
      history.shift();
    }
  }

  private updateConnectionStats(connected: boolean): void {
    if (connected) {
      this.stats.totalConnections++;
      this.stats.activeConnections++;
    } else {
      this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
    }

    // Record metrics
    monitoringService.recordMetric('websocket.connections.active', this.stats.activeConnections);
    monitoringService.recordMetric('websocket.connections.total', this.stats.totalConnections);
  }

  private updateMessageStats(userId: string, roomId: string): void {
    this.stats.totalMessages++;

    // Track message rate
    this.messageRateTracker.push(Date.now());
    // Keep only last minute of messages
    this.messageRateTracker = this.messageRateTracker.filter(time => time > oneMinuteAgo);
    this.stats.messagesPerSecond = this.messageRateTracker.length / 60;

    // Update user stats
    if (!this.stats.userStats.has(userId)) {
      this.stats.userStats.set(userId, {
        connections: 0,
        messages: 0,
        lastSeen: new Date()
      });
    }
    userStats.messages++;
    userStats.lastSeen = new Date();

    // Update room stats
    if (!this.stats.roomStats.has(roomId)) {
      this.stats.roomStats.set(roomId, {
        users: 0,
        messages: 0,
        lastActivity: new Date()
      });
    }
    roomStats.messages++;
    roomStats.lastActivity = new Date();

    // Record metrics
    monitoringService.recordMetric('websocket.messages.total', 1, { room: roomId });
    monitoringService.recordMetric('websocket.messages.rate', this.stats.messagesPerSecond, {}, 'per_second');
  }

  private updateRoomStats(roomId: string): void {
    if (!room) return;

    if (!this.stats.roomStats.has(roomId)) {
      this.stats.roomStats.set(roomId, {
        users: 0,
        messages: 0,
        lastActivity: new Date()
      });
    }

    roomStats.users = room.users.size;
    roomStats.lastActivity = new Date();
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private serializeRoom(room: Room): unknown {
    return {
      id: room.id,
      name: room.name,
      type: room.type,
      userCount: room.users.size,
      created: room.created,
      lastActivity: room.lastActivity,
      metadata: room.metadata
    };
  }

  private getAvailableRooms(user: WebSocketUser): unknown[] {
    
    for (const room of this.rooms.values()) {
      if (this.hasPermission(user, room.permissions.join)) {
        availableRooms.push(this.serializeRoom(room));
      }
    }
    
    return availableRooms;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
      this.cleanupOldMessages();
    }, 60000); // Run every minute
  }

  private cleanupInactiveConnections(): void {
    
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.lastActivity < fiveMinutesAgo) {
        logger.info(`🧹 Cleaning up inactive connection: ${user.userId} (${socketId})`);
        this.handleDisconnection(socketId, 'inactive');
      }
    }
  }

  private cleanupOldMessages(): void {
    
    for (const [roomId, messages] of this.messageHistory.entries()) {
      this.messageHistory.set(roomId, filteredMessages);
    }
  }

  /**
   * Public API methods
   */

  // Broadcast workflow events
  public broadcastWorkflowUpdate(workflowId: string, event: string, data: unknown): void {
    this.broadcastToRoom(roomId, event, {
      workflowId,
      ...data,
      timestamp: new Date()
    });
  }

  // Broadcast execution events
  public broadcastExecutionUpdate(executionId: string, event: string, data: unknown): void {
    this.broadcastToRoom(roomId, event, {
      executionId,
      ...data,
      timestamp: new Date()
    });
  }

  // Send notification to user
  public sendNotificationToUser(userId: string, notification: unknown): void {
    this.broadcastToRoom(roomId, 'notification', {
      ...notification,
      timestamp: new Date()
    });
  }

  // Get statistics
  public getStats(): WebSocketStats {
    return { ...this.stats };
  }

  // Get connected users
  public getConnectedUsers(): WebSocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  // Get room information
  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // Get all rooms
  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // Get message history
  public getMessageHistory(roomId: string, limit: number = 100): WebSocketMessage[] {
    return history.slice(-limit);
  }

  /**
   * Shutdown WebSocket service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down WebSocket service...');

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect all clients
    if (this.io) {
      this.io.emit('server:shutdown', {
        message: 'Server is shutting down',
        timestamp: new Date()
      });

      // Close all connections
      this.io.close();
    }

    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close();
    }

    // Clear data
    this.connectedUsers.clear();
    this.rooms.clear();
    this.messageHistory.clear();

    logger.info('✅ WebSocket service shutdown complete');
  }
}

export const webSocketServerService = WebSocketServerService.getInstance();