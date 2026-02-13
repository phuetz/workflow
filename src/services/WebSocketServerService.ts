/**
 * WebSocket Server Service
 * Main orchestrator for real-time WebSocket server communication
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import { Express } from 'express';
import { logger } from './SimpleLogger';
import { ConnectionManager } from './websocket/ConnectionManager';
import { MessageHandler } from './websocket/MessageHandler';
import { RoomManager } from './websocket/RoomManager';
import { StatsTracker } from './websocket/StatsTracker';
import type {
  WebSocketStats,
  WebSocketUser,
  Room,
  WebSocketMessage,
  JoinRoomData,
  SendMessageData,
  CreateRoomData,
  CursorUpdateData,
  SelectionUpdateData
} from './websocket/types';

export class WebSocketServerService {
  private static instance: WebSocketServerService;
  private io: Server | null = null;
  private httpServer: HttpServer | null = null;

  private connectionManager: ConnectionManager;
  private messageHandler: MessageHandler;
  private roomManager: RoomManager;
  private statsTracker: StatsTracker;

  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.connectionManager = new ConnectionManager();
    this.messageHandler = new MessageHandler();
    this.roomManager = new RoomManager();
    this.statsTracker = new StatsTracker();
  }

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
      this.httpServer = createServer(app);

      this.io = new Server(this.httpServer, {
        cors: {
          origin: process.env.CORS_ORIGIN || "*",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        maxHttpBufferSize: 1e6,
        pingTimeout: 60000,
        pingInterval: 25000
      });

      this.connectionManager.setupMiddleware(this.io);
      this.setupEventHandlers();
      const roomCount = this.roomManager.setupDefaultRooms();
      this.statsTracker.setRoomCount(roomCount);
      this.startCleanup();

      this.httpServer.listen(port, () => {
        logger.info(`WebSocket server listening on port ${port}`);
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.io) return;
    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: any): void {
    try {
      const webSocketUser = this.connectionManager.createUserSession(socket);
      this.statsTracker.updateConnectionStats(true);

      this.setupSocketHandlers(socket, webSocketUser);

      this.messageHandler.sendToSocket(this.io!, socket.id, 'connection:welcome', {
        userId: webSocketUser.userId,
        socketId: socket.id,
        serverTime: new Date().toISOString(),
        availableRooms: this.roomManager.getAvailableRooms(
          webSocketUser,
          this.connectionManager.hasPermission.bind(this.connectionManager)
        )
      });

      this.joinRoom(socket.id, `user:${webSocketUser.userId}`);
    } catch (error) {
      logger.error('Error handling WebSocket connection:', error);
      socket.disconnect();
    }
  }

  private setupSocketHandlers(socket: any, user: WebSocketUser): void {
    socket.on('room:join', async (data: JoinRoomData) => {
      try {
        await this.handleJoinRoom(socket.id, data.roomId, data.password);
      } catch (error) {
        this.messageHandler.sendError(this.io!, socket.id, 'room:join:error',
          error instanceof Error ? error.message : String(error));
      }
    });

    socket.on('room:leave', (data: { roomId: string }) => {
      try {
        this.handleLeaveRoom(socket.id, data.roomId);
      } catch (error) {
        this.messageHandler.sendError(this.io!, socket.id, 'room:leave:error',
          error instanceof Error ? error.message : String(error));
      }
    });

    socket.on('message:send', async (data: SendMessageData) => {
      try {
        await this.handleSendMessage(socket.id, data);
      } catch (error) {
        this.messageHandler.sendError(this.io!, socket.id, 'message:send:error',
          error instanceof Error ? error.message : String(error));
      }
    });

    socket.on('room:create', async (data: CreateRoomData) => {
      try {
        await this.handleCreateRoom(socket.id, data);
      } catch (error) {
        this.messageHandler.sendError(this.io!, socket.id, 'room:create:error',
          error instanceof Error ? error.message : String(error));
      }
    });

    socket.on('workflow:subscribe', (data: { workflowId: string }) => {
      this.joinRoom(socket.id, `workflow:${data.workflowId}`);
      logger.info(`User ${user.userId} subscribed to workflow: ${data.workflowId}`);
    });

    socket.on('workflow:unsubscribe', (data: { workflowId: string }) => {
      this.leaveRoom(socket.id, `workflow:${data.workflowId}`);
      logger.info(`User ${user.userId} unsubscribed from workflow: ${data.workflowId}`);
    });

    socket.on('execution:subscribe', (data: { executionId: string }) => {
      this.joinRoom(socket.id, `execution:${data.executionId}`);
      logger.info(`User ${user.userId} subscribed to execution: ${data.executionId}`);
    });

    socket.on('collaboration:cursor', (data: CursorUpdateData) => {
      const currentUser = this.connectionManager.getUser(socket.id);
      if (currentUser) {
        this.messageHandler.handleCursorUpdate(this.io!, currentUser, data.workflowId, data.position);
      }
    });

    socket.on('collaboration:selection', (data: SelectionUpdateData) => {
      const currentUser = this.connectionManager.getUser(socket.id);
      if (currentUser) {
        this.messageHandler.handleSelectionUpdate(this.io!, currentUser, data.workflowId, data.nodeIds);
      }
    });

    socket.on('ping', () => {
      this.connectionManager.updateUserActivity(socket.id);
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason: string) => this.handleDisconnection(socket.id, reason));
    socket.on('error', (error: Error) => logger.error(`WebSocket error for user ${user.userId}:`, error));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleJoinRoom(socketId: string, roomId: string, _password?: string): Promise<void> {
    const user = this.connectionManager.getUser(socketId);
    if (!user) throw new Error('User not found');

    const room = this.roomManager.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    if (!this.connectionManager.hasPermission(user, room.permissions.join)) {
      throw new Error('Insufficient permissions to join room');
    }

    await this.joinRoom(socketId, roomId);
    logger.info(`User ${user.userId} joined room: ${roomId}`);
  }

  private handleLeaveRoom(socketId: string, roomId: string): void {
    const user = this.connectionManager.getUser(socketId);
    if (!user) return;

    this.leaveRoom(socketId, roomId);
    logger.info(`User ${user.userId} left room: ${roomId}`);
  }

  private async handleSendMessage(socketId: string, data: SendMessageData): Promise<void> {
    const user = this.connectionManager.getUser(socketId);
    if (!user) throw new Error('User not found');

    const room = this.roomManager.getRoom(data.roomId);
    if (!room) throw new Error('Room not found');
    if (!user.rooms.has(data.roomId)) throw new Error('User not in room');
    if (!this.connectionManager.hasPermission(user, room.permissions.send)) {
      throw new Error('Insufficient permissions to send messages');
    }

    const message = this.messageHandler.createMessage(data.type, data.payload, user.userId, data.roomId);
    this.messageHandler.storeMessage(data.roomId, message);
    this.messageHandler.broadcastToRoom(this.io!, data.roomId, 'message:received', message);
    this.statsTracker.updateMessageStats(user.userId, data.roomId);
    this.connectionManager.updateUserActivity(socketId);
    this.messageHandler.logMessage(user, data.roomId, message.type);
  }

  private async handleCreateRoom(socketId: string, data: CreateRoomData): Promise<void> {
    const user = this.connectionManager.getUser(socketId);
    if (!user) throw new Error('User not found');

    if (!user.permissions.includes('rooms:create')) {
      throw new Error('Insufficient permissions to create rooms');
    }

    const room = this.roomManager.createRoom(
      data.name,
      data.type as Room['type'],
      data.permissions,
      data.metadata,
      user.userId
    );
    this.statsTracker.incrementRoomCount();

    await this.joinRoom(socketId, room.id);

    this.messageHandler.sendToSocket(this.io!, socketId, 'room:created', {
      roomId: room.id,
      room: this.roomManager.serializeRoom(room)
    });

    logger.info(`Room created: ${room.id} by user ${user.userId}`);
  }

  private handleDisconnection(socketId: string, reason: string): void {
    const user = this.connectionManager.getUser(socketId);
    if (!user) return;

    this.roomManager.leaveAllRooms(this.io!, socketId, user);
    this.connectionManager.removeUserSession(socketId);
    this.statsTracker.updateConnectionStats(false);

    logger.info(`WebSocket user disconnected: ${user.userId} (${socketId}) - ${reason}`);
  }

  private async joinRoom(socketId: string, roomId: string): Promise<void> {
    const user = this.connectionManager.getUser(socketId);
    if (!user) return;

    const room = await this.roomManager.joinRoom(this.io!, socketId, roomId, user);
    if (!room) return;

    this.statsTracker.updateRoomStats(roomId, room.users.size);

    this.messageHandler.broadcastToRoom(this.io!, roomId, 'room:user:joined', {
      userId: user.userId,
      socketId,
      timestamp: new Date()
    }, socketId);

    this.messageHandler.sendToSocket(this.io!, socketId, 'room:joined', {
      roomId,
      room: this.roomManager.serializeRoom(room),
      users: Array.from(room.users).map(id => this.connectionManager.getUser(id)).filter(Boolean)
    });
  }

  private leaveRoom(socketId: string, roomId: string, notify: boolean = true): void {
    const user = this.connectionManager.getUser(socketId);
    if (!user) return;

    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    this.roomManager.leaveRoom(this.io!, socketId, roomId, user);
    this.statsTracker.updateRoomStats(roomId, room.users.size);

    if (notify) {
      this.messageHandler.broadcastToRoom(this.io!, roomId, 'room:user:left', {
        userId: user.userId,
        socketId,
        timestamp: new Date()
      });
      this.messageHandler.sendToSocket(this.io!, socketId, 'room:left', { roomId });
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
      this.messageHandler.cleanupOldMessages();
    }, 60000);
  }

  private cleanupInactiveConnections(): void {
    const inactiveUsers = this.connectionManager.getInactiveUsers(5);
    for (const user of inactiveUsers) {
      logger.info(`Cleaning up inactive connection: ${user.userId} (${user.socketId})`);
      this.handleDisconnection(user.socketId, 'inactive');
    }
  }

  // Public API methods
  public broadcastWorkflowUpdate(workflowId: string, event: string, data: unknown): void {
    if (this.io) {
      this.messageHandler.broadcastWorkflowUpdate(this.io, workflowId, event, data);
    }
  }

  public broadcastExecutionUpdate(executionId: string, event: string, data: unknown): void {
    if (this.io) {
      this.messageHandler.broadcastExecutionUpdate(this.io, executionId, event, data);
    }
  }

  public sendNotificationToUser(userId: string, notification: unknown): void {
    if (this.io) {
      this.messageHandler.sendNotificationToUser(this.io, userId, notification);
    }
  }

  public getStats(): WebSocketStats {
    return this.statsTracker.getStats();
  }

  public getConnectedUsers(): WebSocketUser[] {
    return this.connectionManager.getConnectedUsers();
  }

  public getRoom(roomId: string): Room | undefined {
    return this.roomManager.getRoom(roomId);
  }

  public getAllRooms(): Room[] {
    return this.roomManager.getAllRooms();
  }

  public getMessageHistory(roomId: string, limit: number = 100): WebSocketMessage[] {
    return this.messageHandler.getMessageHistory(roomId, limit);
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket service...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.io) {
      this.io.emit('server:shutdown', {
        message: 'Server is shutting down',
        timestamp: new Date()
      });
      this.io.close();
    }

    if (this.httpServer) {
      this.httpServer.close();
    }

    this.connectionManager.clear();
    this.roomManager.clear();
    this.messageHandler.clear();

    logger.info('WebSocket service shutdown complete');
  }
}

export const webSocketServerService = WebSocketServerService.getInstance();
