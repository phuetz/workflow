/**
 * WebSocket Message Handler
 * Handles message processing, storage, and broadcasting
 */

import type { Server } from 'socket.io';
import { logger } from '../SimpleLogger';
import type { WebSocketMessage, WebSocketUser } from './types';

export class MessageHandler {
  private messageHistory: Map<string, WebSocketMessage[]> = new Map();

  /**
   * Create a new message
   */
  public createMessage(
    type: string,
    payload: unknown,
    userId: string,
    roomId: string
  ): WebSocketMessage {
    return {
      id: this.generateMessageId(),
      type,
      payload,
      userId,
      room: roomId,
      timestamp: new Date()
    };
  }

  /**
   * Store message in history
   */
  public storeMessage(roomId: string, message: WebSocketMessage): void {
    if (!this.messageHistory.has(roomId)) {
      this.messageHistory.set(roomId, []);
    }

    const history = this.messageHistory.get(roomId)!;
    history.push(message);

    // Keep only last 1000 messages per room
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Get message history for a room
   */
  public getMessageHistory(roomId: string, limit: number = 100): WebSocketMessage[] {
    const history = this.messageHistory.get(roomId) || [];
    return history.slice(-limit);
  }

  /**
   * Broadcast message to a room
   */
  public broadcastToRoom(
    io: Server,
    roomId: string,
    event: string,
    data: unknown,
    excludeSocketId?: string
  ): void {
    if (excludeSocketId) {
      io.to(roomId).except(excludeSocketId).emit(event, data);
    } else {
      io.to(roomId).emit(event, data);
    }
  }

  /**
   * Send message to a specific socket
   */
  public sendToSocket(io: Server, socketId: string, event: string, data: unknown): void {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Send error message to a specific socket
   */
  public sendError(io: Server, socketId: string, event: string, message: string): void {
    this.sendToSocket(io, socketId, event, {
      error: true,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast workflow update
   */
  public broadcastWorkflowUpdate(
    io: Server,
    workflowId: string,
    event: string,
    data: unknown
  ): void {
    const roomId = `workflow:${workflowId}`;
    this.broadcastToRoom(io, roomId, event, {
      workflowId,
      ...(typeof data === 'object' && data !== null ? data : {}),
      timestamp: new Date()
    });
  }

  /**
   * Broadcast execution update
   */
  public broadcastExecutionUpdate(
    io: Server,
    executionId: string,
    event: string,
    data: unknown
  ): void {
    const roomId = `execution:${executionId}`;
    this.broadcastToRoom(io, roomId, event, {
      executionId,
      ...(typeof data === 'object' && data !== null ? data : {}),
      timestamp: new Date()
    });
  }

  /**
   * Send notification to user
   */
  public sendNotificationToUser(io: Server, userId: string, notification: unknown): void {
    const roomId = `user:${userId}`;
    this.broadcastToRoom(io, roomId, 'notification', {
      ...(typeof notification === 'object' && notification !== null ? notification : {}),
      timestamp: new Date()
    });
  }

  /**
   * Handle cursor update for collaboration
   */
  public handleCursorUpdate(
    io: Server,
    user: WebSocketUser,
    workflowId: string,
    position: { x: number; y: number }
  ): void {
    const roomId = `workflow:${workflowId}`;
    this.broadcastToRoom(io, roomId, 'collaboration:cursor', {
      userId: user.userId,
      position,
      timestamp: new Date()
    }, user.socketId);
  }

  /**
   * Handle selection update for collaboration
   */
  public handleSelectionUpdate(
    io: Server,
    user: WebSocketUser,
    workflowId: string,
    nodeIds: string[]
  ): void {
    const roomId = `workflow:${workflowId}`;
    this.broadcastToRoom(io, roomId, 'collaboration:selection', {
      userId: user.userId,
      nodeIds,
      timestamp: new Date()
    }, user.socketId);
  }

  /**
   * Cleanup old messages (older than specified time)
   */
  public cleanupOldMessages(maxAgeMs: number = 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAgeMs);

    for (const [roomId, messages] of this.messageHistory.entries()) {
      const filteredMessages = messages.filter(msg => msg.timestamp > cutoff);
      this.messageHistory.set(roomId, filteredMessages);
    }
  }

  /**
   * Clear all message history
   */
  public clear(): void {
    this.messageHistory.clear();
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message activity
   */
  public logMessage(user: WebSocketUser, roomId: string, type: string): void {
    logger.debug(`Message sent by ${user.userId} to room ${roomId}: ${type}`);
  }
}
