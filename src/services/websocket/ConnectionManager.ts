/**
 * WebSocket Connection Manager
 * Handles user connections, authentication, and session management
 */

import type { Server, Socket } from 'socket.io';
import { logger } from '../SimpleLogger';
import { authService } from '../auth';
import type { WebSocketUser } from './types';

export class ConnectionManager {
  private connectedUsers: Map<string, WebSocketUser> = new Map();

  /**
   * Setup authentication and logging middleware
   */
  public setupMiddleware(io: Server): void {
    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const user = await authService.verifyToken(token);
        if (!user) {
          return next(new Error('Invalid authentication token'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware placeholder
    io.use((_socket, next) => {
      next();
    });

    // Logging middleware
    io.use((socket, next) => {
      logger.info(`WebSocket connection attempt from user: ${socket.data.user?.id}`);
      next();
    });
  }

  /**
   * Create a new user session from socket connection
   */
  public createUserSession(socket: Socket): WebSocketUser {
    const user = socket.data.user;

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
    logger.info(`WebSocket user connected: ${user.id} (${socket.id})`);

    return webSocketUser;
  }

  /**
   * Remove user session on disconnect
   */
  public removeUserSession(socketId: string): WebSocketUser | undefined {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      this.connectedUsers.delete(socketId);
      logger.info(`WebSocket user disconnected: ${user.userId} (${socketId})`);
    }
    return user;
  }

  /**
   * Get user by socket ID
   */
  public getUser(socketId: string): WebSocketUser | undefined {
    return this.connectedUsers.get(socketId);
  }

  /**
   * Get all connected users
   */
  public getConnectedUsers(): WebSocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Update user's last activity timestamp
   */
  public updateUserActivity(socketId: string): void {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * Get count of active connections
   */
  public getActiveConnectionCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user has required permission
   */
  public hasPermission(user: WebSocketUser, requiredPermissions: string[]): boolean {
    if (requiredPermissions.includes('everyone')) return true;
    if (requiredPermissions.includes('authenticated') && user.userId) return true;

    // Check roles
    const hasRole = user.roles.some(role => requiredPermissions.includes(role));
    if (hasRole) return true;

    // Check specific permissions
    const hasPermission = user.permissions.some(perm => requiredPermissions.includes(perm));
    if (hasPermission) return true;

    // Check user ID
    return requiredPermissions.includes(user.userId);
  }

  /**
   * Get inactive users (not active in last N minutes)
   */
  public getInactiveUsers(inactiveMinutes: number = 5): WebSocketUser[] {
    const cutoff = new Date(Date.now() - inactiveMinutes * 60 * 1000);
    const inactiveUsers: WebSocketUser[] = [];

    for (const user of this.connectedUsers.values()) {
      if (user.lastActivity < cutoff) {
        inactiveUsers.push(user);
      }
    }

    return inactiveUsers;
  }

  /**
   * Clear all connections
   */
  public clear(): void {
    this.connectedUsers.clear();
  }

  /**
   * Get all connected user entries for iteration
   */
  public entries(): IterableIterator<[string, WebSocketUser]> {
    return this.connectedUsers.entries();
  }
}
