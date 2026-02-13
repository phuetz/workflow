/**
 * WebSocket Stats Tracker
 * Tracks connection, message, and room statistics
 */

import monitoringService from '../MonitoringService';
import type { WebSocketStats, UserStats, RoomStats } from './types';

export class StatsTracker {
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

  /**
   * Get current statistics
   */
  public getStats(): WebSocketStats {
    return { ...this.stats };
  }

  /**
   * Update connection statistics
   */
  public updateConnectionStats(connected: boolean): void {
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

  /**
   * Update message statistics
   */
  public updateMessageStats(userId: string, roomId: string): void {
    this.stats.totalMessages++;

    // Track message rate
    const oneMinuteAgo = Date.now() - 60000;
    this.messageRateTracker.push(Date.now());
    // Keep only last minute of messages
    this.messageRateTracker = this.messageRateTracker.filter(time => time > oneMinuteAgo);
    this.stats.messagesPerSecond = this.messageRateTracker.length / 60;

    // Update user stats
    this.updateUserStats(userId);

    // Update room stats (messages)
    this.updateRoomMessageStats(roomId);

    // Record metrics
    monitoringService.recordMetric('websocket.messages.total', 1, { room: roomId });
    monitoringService.recordMetric('websocket.messages.rate', this.stats.messagesPerSecond);
  }

  /**
   * Update user statistics
   */
  private updateUserStats(userId: string): void {
    if (!this.stats.userStats.has(userId)) {
      this.stats.userStats.set(userId, {
        connections: 0,
        messages: 0,
        lastSeen: new Date()
      });
    }

    const userStats = this.stats.userStats.get(userId)!;
    userStats.messages++;
    userStats.lastSeen = new Date();
  }

  /**
   * Update room message statistics
   */
  private updateRoomMessageStats(roomId: string): void {
    if (!this.stats.roomStats.has(roomId)) {
      this.stats.roomStats.set(roomId, {
        users: 0,
        messages: 0,
        lastActivity: new Date()
      });
    }

    const roomStats = this.stats.roomStats.get(roomId)!;
    roomStats.messages++;
    roomStats.lastActivity = new Date();
  }

  /**
   * Update room user count
   */
  public updateRoomStats(roomId: string, userCount: number): void {
    if (!this.stats.roomStats.has(roomId)) {
      this.stats.roomStats.set(roomId, {
        users: 0,
        messages: 0,
        lastActivity: new Date()
      });
    }

    const roomStats = this.stats.roomStats.get(roomId)!;
    roomStats.users = userCount;
    roomStats.lastActivity = new Date();
  }

  /**
   * Increment total rooms counter
   */
  public incrementRoomCount(): void {
    this.stats.totalRooms++;
  }

  /**
   * Decrement total rooms counter
   */
  public decrementRoomCount(): void {
    this.stats.totalRooms = Math.max(0, this.stats.totalRooms - 1);
  }

  /**
   * Set total rooms count
   */
  public setRoomCount(count: number): void {
    this.stats.totalRooms = count;
  }

  /**
   * Get user stats
   */
  public getUserStats(userId: string): UserStats | undefined {
    return this.stats.userStats.get(userId);
  }

  /**
   * Get room stats
   */
  public getRoomStats(roomId: string): RoomStats | undefined {
    return this.stats.roomStats.get(roomId);
  }

  /**
   * Get active connection count
   */
  public getActiveConnections(): number {
    return this.stats.activeConnections;
  }

  /**
   * Get total messages count
   */
  public getTotalMessages(): number {
    return this.stats.totalMessages;
  }

  /**
   * Get messages per second rate
   */
  public getMessagesPerSecond(): number {
    return this.stats.messagesPerSecond;
  }

  /**
   * Reset all statistics
   */
  public reset(): void {
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalMessages: 0,
      totalRooms: 0,
      messagesPerSecond: 0,
      userStats: new Map(),
      roomStats: new Map()
    };
    this.messageRateTracker = [];
  }
}
