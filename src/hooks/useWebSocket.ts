/**
 * useWebSocket Hook
 * React hook for WebSocket connections
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWebSocketService, initializeWebSocket } from '../services/WebSocketService';
import type {
  WebSocketConfig,
  WebSocketMessage,
  // ConnectionState, // eslint-disable-line @typescript-eslint/no-unused-vars
  WebSocketHookOptions,
  WebSocketHookReturn,
  ConnectionStats
} from '../types/websocket';
import { logger } from '../services/SimpleLogger';

export function useWebSocket(
  config: WebSocketConfig,
  options: WebSocketHookOptions = {}
): WebSocketHookReturn {
  const {
    autoConnect = true,
    reconnect = true,
    onConnect,
    onDisconnect,
    onError,
    onMessage
  } = options;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const wsRef = useRef<ReturnType<typeof initializeWebSocket> | null>(null);
  const isMounted = useRef(true);

  // Initialize WebSocket service if not already initialized
  useEffect(() => {
    if (!wsRef.current) {
      wsRef.current = initializeWebSocket({
        ...config,
        reconnect
      });
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!wsRef.current) return;

    try {
      setConnecting(true);
      setError(null);
      await wsRef.current.connect();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Connection failed'));
        setConnecting(false);
      }
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (!wsRef.current) return;
    wsRef.current.disconnect();
  }, []);

  // Send message
  const send = useCallback(<T = unknown>(
    type: string,
    data: T,
    options?: { priority?: 'high' | 'normal' | 'low'; timeout?: number }
  ): Promise<void> => {
    if (!wsRef.current) {
      throw new Error('WebSocket not initialized');
    }
    return wsRef.current.send(type, data, options);
  }, []);

  // Subscribe to events
  const subscribe = useCallback(<T = unknown>(
    event: string,
    callback: (data: T) => void
  ): (() => void) => {
    if (!wsRef.current) {
      return () => {};
    }
    return wsRef.current.subscribe(event, callback);
  }, []);

  // Get connection stats
  const connectionStats = useCallback((): ConnectionStats => {
    if (!wsRef.current) {
      return {
        state: 'disconnected',
        latency: 0,
        messagesSent: 0,
        messagesReceived: 0,
        reconnectAttempts: 0
      };
    }

    const stats = wsRef.current.getConnectionStats();

    return {
      ...stats,
      connectedAt: connected ? new Date() : undefined,
      disconnectedAt: !connected ? new Date() : undefined
    };
  }, [connected]);

  // Setup connection monitoring and auto-connect
  useEffect(() => {
    isMounted.current = true;
    const ws = wsRef.current;
    if (!ws) return;

    // Monitor connection state
    const checkConnectionState = () => {
      if (!isMounted.current) return;

      const state = ws.getConnectionState();
      setConnected(state === 'connected');
      setConnecting(state === 'connecting');
    };

    // Check state periodically
    const stateInterval = setInterval(checkConnectionState, 1000);

    // Subscribe to connection events if available
    const unsubscribeFns: Array<() => void> = [];

    try {
      // Subscribe to connection-related events
      const handleConnected = () => {
        if (isMounted.current) {
          setConnecting(false);
          setConnected(true);
          setError(null);
          onConnect?.();
        }
      };

      const handleDisconnected = (data: any) => {
        if (isMounted.current) {
          setConnecting(false);
          setConnected(false);
          onDisconnect?.(data);
        }
      };

      const handleError = (err: any) => {
        if (isMounted.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onError?.(error);
        }
      };

      // Try to subscribe to events
      unsubscribeFns.push(ws.subscribe('connected', handleConnected));
      unsubscribeFns.push(ws.subscribe('disconnected', handleDisconnected));
      unsubscribeFns.push(ws.subscribe('error', handleError));

      if (onMessage) {
        const handleMessage = (message: any) => {
          if (isMounted.current) {
            onMessage?.(message);
          }
        };
        unsubscribeFns.push(ws.subscribe('message', handleMessage));
      }
    } catch (err) {
      logger.debug('WebSocket event subscription not available', err);
    }

    // Auto-connect if enabled
    if (autoConnect && ws.getConnectionState() === 'disconnected') {
      connect();
    }

    // Cleanup
    return () => {
      isMounted.current = false;
      clearInterval(stateInterval);
      unsubscribeFns.forEach(unsub => {
        try {
          unsub();
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    };
  }, [autoConnect, connect, onConnect, onDisconnect, onError, onMessage]);

  return {
    connected,
    connecting,
    error,
    send,
    subscribe,
    connect,
    disconnect,
    connectionStats
  };
}

// Specialized hooks for specific use cases

/**
 * Hook for workflow execution updates
 */
export function useWorkflowUpdates(workflowId?: string) {
  const [executions, setExecutions] = useState<Map<string, unknown>>(new Map());
  const ws = useWebSocket(
    { url: process.env.REACT_APP_WS_URL || 'ws://localhost:3001' },
    {
      onConnect: () => {
        logger.debug('Connected to workflow updates');
      }
    }
  );

  useEffect(() => {
    if (!ws.connected) return;

    const unsubscribe = ws.subscribe<{ workflowId: string; executionId: string }>(
      'workflow:execution:update',
      (data) => {
        if (!workflowId || data.workflowId === workflowId) {
          setExecutions(prev => {
            const next = new Map(prev);
            next.set(data.executionId, data);
            return next;
          });
        }
      }
    );

    return unsubscribe;
  }, [ws.connected, ws.subscribe, workflowId]);

  return {
    executions: Array.from(executions.values()),
    connected: ws.connected
  };
}

/**
 * Hook for real-time metrics
 */
export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState<unknown>(null);
  const ws = useWebSocket(
    { url: process.env.REACT_APP_WS_URL || 'ws://localhost:3001' },
    {}
  );

  useEffect(() => {
    if (!ws.connected) return;

    const unsubscribe = ws.subscribe<unknown>('metrics:update', (data) => {
      setMetrics(data);
    });

    return unsubscribe;
  }, [ws.connected, ws.subscribe]);

  return {
    metrics,
    connected: ws.connected
  };
}

/**
 * Hook for collaboration features
 */
export function useCollaboration(workflowId: string, userId: string, userName: string) {
  const [collaborators, setCollaborators] = useState<Map<string, unknown>>(new Map());
  const [cursors, setCursors] = useState<Map<string, unknown>>(new Map());
  const ws = useWebSocket(
    { url: process.env.REACT_APP_WS_URL || 'ws://localhost:3001' },
    {}
  );

  // Send cursor position
  const sendCursorPosition = useCallback((position: unknown) => {
    ws.send('collaboration', {
      action: 'cursor',
      userId,
      userName,
      workflowId,
      details: position
    });
  }, [ws, userId, userName, workflowId]);

  // Send selection
  const sendSelection = useCallback((selection: unknown) => {
    ws.send('collaboration', {
      action: 'selection',
      userId,
      userName,
      workflowId,
      details: selection
    });
  }, [ws, userId, userName, workflowId]);

  // Send edit
  const sendEdit = useCallback((edit: unknown) => {
    ws.send('collaboration', {
      action: 'edit',
      userId,
      userName,
      workflowId,
      details: edit
    });
  }, [ws, userId, userName, workflowId]);

  useEffect(() => {
    if (!ws.connected) return;

    // Send presence
    ws.send('collaboration', {
      action: 'presence',
      userId,
      userName,
      workflowId,
      details: { joined: true }
    });

    // Subscribe to collaboration events
    const unsubscribe = ws.subscribe<{
      workflowId: string;
      userId: string;
      userName: string;
      action: string;
      details: { joined?: boolean };
    }>('collaboration', (data) => {
      if (data.workflowId !== workflowId || data.userId === userId) return;

      switch (data.action) {
        case 'presence':
          if (data.details.joined) {
            setCollaborators(prev => {
              const next = new Map(prev);
              next.set(data.userId, {
                userId: data.userId,
                userName: data.userName,
                joinedAt: new Date()
              });
              return next;
            });
          } else {
            setCollaborators(prev => {
              const next = new Map(prev);
              next.delete(data.userId);
              return next;
            });
            setCursors(prev => {
              const next = new Map(prev);
              next.delete(data.userId);
              return next;
            });
          }
          break;

        case 'cursor':
          setCursors(prev => {
            const next = new Map(prev);
            next.set(data.userId, {
              ...data.details,
              userId: data.userId,
              userName: data.userName
            });
            return next;
          });
          break;
      }
    });

    // Cleanup - send leave presence
    return () => {
      ws.send('collaboration', {
        action: 'presence',
        userId,
        userName,
        workflowId,
        details: { joined: false }
      });
      unsubscribe();
    };
  }, [ws.connected, ws.send, ws.subscribe, workflowId, userId, userName]);

  return {
    collaborators: Array.from(collaborators.values()),
    cursors: Array.from(cursors.values()),
    sendCursorPosition,
    sendSelection,
    sendEdit,
    connected: ws.connected
  };
}

/**
 * Hook for real-time alerts
 */
export function useRealtimeAlerts(onAlert?: (alert: unknown) => void) {
  const [alerts, setAlerts] = useState<unknown[]>([]);
  const [latestAlert, setLatestAlert] = useState<unknown>(null);

  const ws = useWebSocket(
    { url: process.env.REACT_APP_WS_URL || 'ws://localhost:3001' },
    {}
  );

  useEffect(() => {
    if (!ws.connected) return;

    const unsubscribe = ws.subscribe<{
      id?: string;
      timestamp: string;
    }>('alert', (data) => {
      const alert = {
        ...data,
        id: data.id || Date.now().toString(),
        timestamp: new Date(data.timestamp)
      };

      setAlerts(prev => [...prev, alert]);
      setLatestAlert(alert);
      onAlert?.(alert);
    });

    return unsubscribe;
  }, [ws.connected, ws.subscribe, onAlert]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter((a: { id: string }) => a.id !== alertId));
    if ((latestAlert as { id?: string })?.id === alertId) {
      setLatestAlert(null);
    }
  }, [latestAlert]);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
    setLatestAlert(null);
  }, []);

  return {
    alerts,
    latestAlert,
    dismissAlert,
    clearAllAlerts,
    connected: ws.connected
  };
}
