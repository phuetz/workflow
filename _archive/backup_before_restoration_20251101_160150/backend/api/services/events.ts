import { EventEmitter } from 'node:events';
import type { Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';

const bus = new EventEmitter();
let io: IOServer | null = null;

export function setupSockets(server: HttpServer) {
  if (io) return io;
  io = new IOServer(server, { cors: { origin: '*', credentials: false } });
  bus.on('broadcast', ({ type, payload }) => {
    io?.emit(type, payload);
  });
  io.on('connection', (socket) => {
    socket.emit('welcome', { ok: true });
  });
  return io;
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
  broadcast('execution_queued', data);
}
export function emitExecutionStarted(data: { id: string; workflowId: string; startedAt: string }) {
  broadcast('execution_started', data);
}
export function emitExecutionUpdated(data: { id: string; status: string; progress?: number }) {
  broadcast('execution_updated', data);
}
export function emitExecutionFinished(data: { id: string; workflowId: string; status: string; finishedAt: string; error?: string }) {
  broadcast('execution_finished', data);
}
export function emitNodeStarted(data: { execId: string; nodeId: string; type: string; ts: number }) {
  broadcast('node_started', data);
}
export function emitNodeFinished(data: { execId: string; nodeId: string; type: string; ts: number; status: 'success' | 'failure'; durationMs: number }) {
  broadcast('node_finished', data);
}

export function emitExecutionLog(data: { execId: string; ts: number; level: 'debug'|'info'|'warn'|'error'; message: string; data?: unknown }) {
  broadcast('execution_log', data);
}
