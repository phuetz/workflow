/**
 * WebSocket Room Manager
 * Handles room creation, membership, and lifecycle management
 */

import type { Server } from 'socket.io';
import { logger } from '../SimpleLogger';
import type {
  Room,
  RoomPermissions,
  SerializedRoom,
  WebSocketUser,
  DEFAULT_ROOM_PERMISSIONS
} from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  /**
   * Setup default rooms on initialization
   */
  public setupDefaultRooms(): number {
    const defaultRooms = [
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
    }

    logger.info(`Created ${defaultRooms.length} default rooms`);
    return defaultRooms.length;
  }

  /**
   * Create a new room
   */
  public createRoom(
    name: string,
    type: Room['type'],
    permissions?: RoomPermissions,
    metadata?: Record<string, unknown>,
    creatorId?: string
  ): Room {
    const roomId = this.generateRoomId();

    const room: Room = {
      id: roomId,
      name,
      type,
      users: new Set(),
      permissions: permissions || {
        join: ['authenticated'],
        send: ['authenticated'],
        manage: creatorId ? [creatorId] : ['admin']
      },
      metadata: metadata || {},
      created: new Date(),
      lastActivity: new Date()
    };

    this.rooms.set(roomId, room);
    logger.info(`Room created: ${roomId}`);

    return room;
  }

  /**
   * Create a system room (for workflows, executions, users)
   */
  public createSystemRoom(roomId: string): Room {
    let name = 'System Room';
    let type: Room['type'] = 'custom';

    if (roomId.startsWith('user:')) {
      name = 'User Room';
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
    return room;
  }

  /**
   * Check if room ID represents a system room
   */
  public isSystemRoom(roomId: string): boolean {
    return roomId.startsWith('user:') ||
      roomId.startsWith('workflow:') ||
      roomId.startsWith('execution:') ||
      roomId === 'general' ||
      roomId === 'announcements';
  }

  /**
   * Get room by ID
   */
  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get or create room (for system rooms)
   */
  public getOrCreateRoom(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room && this.isSystemRoom(roomId)) {
      room = this.createSystemRoom(roomId);
    }
    return room!;
  }

  /**
   * Get all rooms
   */
  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get total room count
   */
  public getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Join user to room
   */
  public async joinRoom(
    io: Server,
    socketId: string,
    roomId: string,
    user: WebSocketUser
  ): Promise<Room | null> {
    // Create room if it doesn't exist (for system rooms)
    if (!this.rooms.has(roomId) && this.isSystemRoom(roomId)) {
      this.createSystemRoom(roomId);
    }

    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Add user to room
    user.rooms.add(roomId);
    room.users.add(socketId);
    room.lastActivity = new Date();

    // Join socket to room
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomId);
    }

    return room;
  }

  /**
   * Remove user from room
   */
  public leaveRoom(
    io: Server,
    socketId: string,
    roomId: string,
    user: WebSocketUser
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove user from room
    user.rooms.delete(roomId);
    room.users.delete(socketId);

    // Leave socket room
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomId);
    }

    // Clean up empty non-system rooms
    if (room.users.size === 0 && !this.isSystemRoom(roomId)) {
      this.rooms.delete(roomId);
    }

    return true;
  }

  /**
   * Remove user from all rooms
   */
  public leaveAllRooms(io: Server, socketId: string, user: WebSocketUser): void {
    for (const roomId of Array.from(user.rooms)) {
      this.leaveRoom(io, socketId, roomId, user);
    }
  }

  /**
   * Get rooms available for user to join
   */
  public getAvailableRooms(
    user: WebSocketUser,
    hasPermission: (user: WebSocketUser, permissions: string[]) => boolean
  ): SerializedRoom[] {
    const availableRooms: SerializedRoom[] = [];

    for (const room of this.rooms.values()) {
      if (hasPermission(user, room.permissions.join)) {
        availableRooms.push(this.serializeRoom(room));
      }
    }

    return availableRooms;
  }

  /**
   * Serialize room for client
   */
  public serializeRoom(room: Room): SerializedRoom {
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

  /**
   * Delete a room
   */
  public deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /**
   * Clear all rooms
   */
  public clear(): void {
    this.rooms.clear();
  }

  /**
   * Generate unique room ID
   */
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
