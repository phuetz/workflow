/**
 * WebSocket Type Definitions
 */

// CloseEvent type for WebSocket disconnections (compatible with browser and Node.js)
export interface CloseEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectDelay?: number; // Milliseconds
  maxReconnectAttempts?: number;
  pingInterval?: number; // Milliseconds
  pongTimeout?: number; // Milliseconds
  messageQueueSize?: number;
  binaryType?: 'blob' | 'arraybuffer';
  authentication?: WebSocketAuthentication;
  headers?: Record<string, string>;
}

export interface WebSocketAuthentication {
  type: 'token' | 'apiKey' | 'custom';
  token?: string;
  apiKey?: string;
  custom?: Record<string, unknown>;
}

export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'reconnecting';

export interface WebSocketMessage {
  id: string;
  type: string;
  data?: unknown;
  timestamp: Date;
  correlationId?: string;
  priority?: 'high' | 'normal' | 'low';
  error?: WebSocketError;
}

export interface WebSocketError {
  code: string;
  message: string;
  details?: unknown;
}

export interface WebSocketEvent {
  name: string;
  data: unknown;
  timestamp: Date;
  source?: string;
}

export interface SubscriptionOptions {
  filter?: Record<string, unknown>;
  bufferSize?: number;
  acknowledgment?: boolean;
}

// Specific message types
export interface WorkflowUpdateMessage extends WebSocketMessage {
  type: 'workflow.update';
  data: {
    workflowId: string;
    executionId: string;
    status: string;
    progress?: number;
    currentNode?: string;
    error?: Error;
  };
}

export interface NodeExecutionMessage extends WebSocketMessage {
  type: 'node.execution';
  data: {
    workflowId: string;
    executionId: string;
    nodeId: string;
    status: 'started' | 'completed' | 'failed';
    duration?: number;
    output?: unknown;
    error?: Error;
  };
}

export interface MetricsUpdateMessage extends WebSocketMessage {
  type: 'metrics.update';
  data: {
    timestamp: Date;
    metrics: {
      cpu?: number;
      memory?: number;
      responseTime?: number;
      errorRate?: number;
      activeConnections?: number;
    };
  };
}

export interface AlertMessage extends WebSocketMessage {
  type: 'alert';
  data: {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    timestamp: Date;
    source: string;
    metadata?: Record<string, unknown>;
  };
}

export interface CollaborationMessage extends WebSocketMessage {
  type: 'collaboration';
  data: {
    action: 'cursor' | 'selection' | 'edit' | 'presence';
    userId: string;
    userName: string;
    workflowId: string;
    details: unknown;
  };
}

// Server-side types
export interface WebSocketClient {
  id: string;
  socket: any; // WebSocket from 'ws' library - typed as any to avoid conflicts
  userId?: string;
  subscriptions: Set<string>;
  metadata: Record<string, unknown>;
  lastActivity: Date;
}

export interface WebSocketRoom {
  id: string;
  name: string;
  clients: Set<string>;
  metadata: Record<string, unknown>;
  created: Date;
}

export interface BroadcastOptions {
  room?: string;
  exclude?: string[];
  filter?: (client: WebSocketClient) => boolean;
}

// Client-side helpers
export interface WebSocketHookOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface WebSocketHookReturn {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  send: <T = unknown>(type: string, data: T) => Promise<void>;
  subscribe: <T = unknown>(event: string, callback: (data: T) => void) => () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  connectionStats: () => ConnectionStats;
}

export interface ConnectionStats {
  state: ConnectionState;
  latency: number;
  messagesSent: number;
  messagesReceived: number;
  reconnectAttempts: number;
  connectedAt?: Date;
  disconnectedAt?: Date;
}

// Event emitter types
export interface WebSocketEventMap {
  connecting: [];
  connected: [];
  disconnected: [event: CloseEvent];
  error: [error: Error];
  message: [message: WebSocketMessage];
  'workflow.update': [data: WorkflowUpdateMessage['data']];
  'node.execution': [data: NodeExecutionMessage['data']];
  'metrics.update': [data: MetricsUpdateMessage['data']];
  alert: [data: AlertMessage['data']];
  collaboration: [data: CollaborationMessage['data']];
}