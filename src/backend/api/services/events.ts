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

    socket.on('disconnect', (reason) => {
      connectionCount--;
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        reason,
        totalConnections: connectionCount
      });
    });

    socket.on('error', (error) => {
      logger.error('WebSocket error', {
        socketId: socket.id,
        error: error.message
      });
    });

    // Log subscription to rooms
    socket.on('subscribe', (room: string) => {
      socket.join(room);
      logger.debug('WebSocket room joined', { socketId: socket.id, room });
    });

    socket.on('unsubscribe', (room: string) => {
      socket.leave(room);
      logger.debug('WebSocket room left', { socketId: socket.id, room });
    });
  });

  return io;
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
