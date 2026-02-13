/**
 * WebSocket Module Barrel Export
 * Re-exports all WebSocket-related types and classes
 */

// Types
export type {
  WebSocketUser,
  Room,
  RoomPermissions,
  WebSocketMessage,
  WebSocketStats,
  UserStats,
  RoomStats,
  JoinRoomData,
  SendMessageData,
  CreateRoomData,
  CursorUpdateData,
  SelectionUpdateData,
  SerializedRoom,
  RoomType
} from './types';

export { DEFAULT_ROOM_PERMISSIONS } from './types';

// Classes
export { ConnectionManager } from './ConnectionManager';
export { MessageHandler } from './MessageHandler';
export { RoomManager } from './RoomManager';
export { StatsTracker } from './StatsTracker';
