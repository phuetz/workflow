/**
 * WebSocket Server Types
 * Type definitions for WebSocket server communication
 */

export interface WebSocketUser {
  id: string;
  socketId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  rooms: Set<string>;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

export interface Room {
  id: string;
  name: string;
  type: 'workflow' | 'execution' | 'collaboration' | 'chat' | 'custom';
  users: Set<string>;
  permissions: RoomPermissions;
  metadata: Record<string, unknown>;
  created: Date;
  lastActivity: Date;
}

export interface RoomPermissions {
  join: string[];
  send: string[];
  manage: string[];
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  userId?: string;
  room?: string;
  timestamp: Date;
  id: string;
}

export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalRooms: number;
  messagesPerSecond: number;
  userStats: Map<string, UserStats>;
  roomStats: Map<string, RoomStats>;
}

export interface UserStats {
  connections: number;
  messages: number;
  lastSeen: Date;
}

export interface RoomStats {
  users: number;
  messages: number;
  lastActivity: Date;
}

export interface JoinRoomData {
  roomId: string;
  password?: string;
}

export interface SendMessageData {
  roomId: string;
  type: string;
  payload: unknown;
}

export interface CreateRoomData {
  name: string;
  type: string;
  permissions?: RoomPermissions;
  metadata?: Record<string, unknown>;
}

export interface CursorUpdateData {
  workflowId: string;
  position: { x: number; y: number };
}

export interface SelectionUpdateData {
  workflowId: string;
  nodeIds: string[];
}

export interface SerializedRoom {
  id: string;
  name: string;
  type: string;
  userCount: number;
  created: Date;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

export type RoomType = Room['type'];

export const DEFAULT_ROOM_PERMISSIONS: RoomPermissions = {
  join: ['authenticated'],
  send: ['authenticated'],
  manage: ['admin']
};
