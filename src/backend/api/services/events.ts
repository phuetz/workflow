import { EventEmitter } from 'node:events';
import type { Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { logger } from '../../../services/SimpleLogger';

const bus = new EventEmitter();
let io: IOServer | null = null;
let connectionCount = 0;

export function setupSockets(server: HttpServer) {
  if (io) return io;

  io = new IOServer(server, { cors: { origin: '*', credentials: false } });

  logger.info('WebSocket server initialized', { transport: 'socket.io' });

  bus.on('broadcast', ({ type, payload }) => {
    io?.emit(type, payload);
    logger.debug('WebSocket broadcast', { type, payloadSize: JSON.stringify(payload).length });
  });

  io.on('connection', (socket) => {
    connectionCount++;
    const clientInfo = {
      socketId: socket.id,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']?.substring(0, 50),
      totalConnections: connectionCount
    };

    logger.info('WebSocket client connected', clientInfo);
    socket.emit('welcome', { ok: true, socketId: socket.id });

    socket.on('error', (error) => {
      logger.error('WebSocket error', {
        socketId: socket.id,
        error: error.message
      });
    });

    // Room subscription
    socket.on('subscribe', (room: string) => {
      socket.join(room);
      logger.debug('WebSocket room joined', { socketId: socket.id, room });
    });

    socket.on('unsubscribe', (room: string) => {
      socket.leave(room);
      logger.debug('WebSocket room left', { socketId: socket.id, room });
    });

    // ===== Real-Time Collaboration Events =====

    socket.on('collaboration', (data: { action: string; workflowId?: string; [key: string]: unknown }) => {
      const { action, workflowId } = data;

      switch (action) {
        case 'presence': {
          // Track user presence per workflow
          const userId = data.userId as string || socket.id;
          const userName = data.userName as string || 'Anonymous';
          if (data.joined) {
            activeUsers.set(socket.id, { userId, userName, workflowId: workflowId || '', socketId: socket.id, lastSeen: Date.now() });
          } else {
            activeUsers.delete(socket.id);
          }
          // Broadcast to workflow room
          if (workflowId) {
            socket.join(`workflow:${workflowId}`);
            io?.to(`workflow:${workflowId}`).emit('collaboration', {
              action: 'presence',
              userId, userName,
              joined: !!data.joined,
              collaborators: getWorkflowCollaborators(workflowId),
            });
          }
          break;
        }

        case 'cursor': {
          // Broadcast cursor position to others in same workflow
          if (workflowId) {
            socket.to(`workflow:${workflowId}`).emit('collaboration', {
              action: 'cursor',
              userId: data.userId || socket.id,
              userName: data.userName,
              position: data.position,
              color: data.color,
            });
          }
          break;
        }

        case 'selection': {
          if (workflowId) {
            socket.to(`workflow:${workflowId}`).emit('collaboration', {
              action: 'selection',
              userId: data.userId || socket.id,
              selectedNodes: data.selectedNodes,
              selectedEdges: data.selectedEdges,
            });
          }
          break;
        }

        case 'edit': {
          // Broadcast workflow edits (node move, config change, etc.)
          if (workflowId) {
            socket.to(`workflow:${workflowId}`).emit('collaboration', {
              action: 'edit',
              userId: data.userId || socket.id,
              editType: data.editType,
              nodeId: data.nodeId,
              changes: data.changes,
              timestamp: Date.now(),
            });
          }
          break;
        }

        case 'typing': {
          if (workflowId) {
            socket.to(`workflow:${workflowId}`).emit('collaboration', {
              action: 'typing',
              userId: data.userId || socket.id,
              userName: data.userName,
              isTyping: data.isTyping,
              nodeId: data.nodeId,
            });
          }
          break;
        }

        case 'lock': {
          if (workflowId && data.nodeId) {
            const lockKey = `${workflowId}:${data.nodeId}`;
            if (data.acquire) {
              nodeLocks.set(lockKey, { userId: (data.userId as string) || socket.id, socketId: socket.id, ts: Date.now() });
            } else {
              nodeLocks.delete(lockKey);
            }
            io?.to(`workflow:${workflowId}`).emit('collaboration', {
              action: data.acquire ? 'lock-acquired' : 'lock-released',
              userId: data.userId || socket.id,
              nodeId: data.nodeId,
            });
          }
          break;
        }
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', (reason) => {
      connectionCount--;
      logger.info('WebSocket client disconnected', { socketId: socket.id, reason, totalConnections: connectionCount });
      const user = activeUsers.get(socket.id);
      if (user?.workflowId) {
        io?.to(`workflow:${user.workflowId}`).emit('collaboration', {
          action: 'presence',
          userId: user.userId,
          userName: user.userName,
          joined: false,
          collaborators: getWorkflowCollaborators(user.workflowId),
        });
      }
      activeUsers.delete(socket.id);
      // Release any locks held by this socket
      for (const [key, lock] of nodeLocks) {
        if (lock.socketId === socket.id) {
          nodeLocks.delete(key);
          const [wfId, nodeId] = key.split(':');
          io?.to(`workflow:${wfId}`).emit('collaboration', { action: 'lock-released', userId: lock.userId, nodeId });
        }
      }
    });
  });

  return io;
}

// Track active users per workflow
const activeUsers = new Map<string, { userId: string; userName: string; workflowId: string; socketId: string; lastSeen: number }>();
const nodeLocks = new Map<string, { userId: string; socketId: string; ts: number }>();

function getWorkflowCollaborators(workflowId: string) {
  const collabs: Array<{ userId: string; userName: string }> = [];
  for (const [, user] of activeUsers) {
    if (user.workflowId === workflowId) {
      collabs.push({ userId: user.userId, userName: user.userName });
    }
  }
  return collabs;
}

// Get current connection stats
export function getWebSocketStats() {
  return {
    connected: connectionCount,
    rooms: io?.sockets.adapter.rooms.size || 0
  };
}

export type BroadcastEvent = { type: string; payload: any };

function broadcast(type: string, payload: unknown) {
  bus.emit('broadcast', { type, payload });
}

export function onBroadcast(listener: (evt: BroadcastEvent) => void) {
  bus.on('broadcast', listener);
  return () => bus.off('broadcast', listener);
}

export function emitExecutionQueued(data: { id: string; workflowId: string; input?: unknown }) {
  logger.info('Workflow execution queued', {
    executionId: data.id,
    workflowId: data.workflowId,
    hasInput: !!data.input
  });
  broadcast('execution_queued', data);
}

export function emitExecutionStarted(data: { id: string; workflowId: string; startedAt: string }) {
  logger.info('Workflow execution started', {
    executionId: data.id,
    workflowId: data.workflowId,
    startedAt: data.startedAt
  });
  broadcast('execution_started', data);
}

export function emitExecutionUpdated(data: { id: string; status: string; progress?: number }) {
  logger.debug('Workflow execution updated', {
    executionId: data.id,
    status: data.status,
    progress: data.progress
  });
  broadcast('execution_updated', data);
}

export function emitExecutionFinished(data: { id: string; workflowId: string; status: string; finishedAt: string; error?: string }) {
  const logLevel = data.status === 'success' ? 'info' : 'error';
  logger[logLevel]('Workflow execution finished', {
    executionId: data.id,
    workflowId: data.workflowId,
    status: data.status,
    finishedAt: data.finishedAt,
    error: data.error
  });
  broadcast('execution_finished', data);
}

export function emitNodeStarted(data: { execId: string; nodeId: string; type: string; ts: number }) {
  logger.debug('Node execution started', {
    executionId: data.execId,
    nodeId: data.nodeId,
    nodeType: data.type,
    timestamp: data.ts
  });
  broadcast('node_started', data);
}

export function emitNodeFinished(data: { execId: string; nodeId: string; type: string; ts: number; status: 'success' | 'failure'; durationMs: number }) {
  const logLevel = data.status === 'success' ? 'debug' : 'warn';
  logger[logLevel]('Node execution finished', {
    executionId: data.execId,
    nodeId: data.nodeId,
    nodeType: data.type,
    status: data.status,
    durationMs: data.durationMs
  });
  broadcast('node_finished', data);
}

export function emitExecutionLog(data: { execId: string; ts: number; level: 'debug'|'info'|'warn'|'error'; message: string; data?: unknown }) {
  // Log at the specified level
  logger[data.level](`[Execution ${data.execId}] ${data.message}`, data.data);
  broadcast('execution_log', data);
}
