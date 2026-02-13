# Agent 6 - Integration Example

## Complete Real-Time Workflow Execution Example

This document demonstrates how to integrate all Agent 6 components for a complete real-time workflow execution experience.

---

## Backend Setup

### 1. Initialize Services (server.ts)

```typescript
import express from 'express';
import { createServer } from 'http';
import { createApp } from './backend/api/app';
import { initializeWebSocketServer } from './backend/websocket/WebSocketServer';
import { initializeExecutionStreamingService } from './backend/services/ExecutionStreamingService';
import { initializeEventBus, getEventPublisher } from './backend/services/EventBus';
import { initializeWebhookRetryService } from './backend/services/WebhookRetryService';
import { initializePerformanceOptimizer } from './backend/services/PerformanceOptimizer';
import { logger } from './services/LoggingService';
import { verifyJWT } from './backend/auth/jwt';

const app = createApp();
const httpServer = createServer(app);

// Initialize WebSocket server with authentication
const wsServer = initializeWebSocketServer({
  server: httpServer,
  path: '/ws',
  maxConnections: 1000,
  pingInterval: 30000,
  pongTimeout: 5000,
  compression: true,
  authentication: async (token: string) => {
    try {
      const decoded = await verifyJWT(token);
      return { userId: decoded.userId };
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      return null;
    }
  },
  rateLimiting: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000
  }
});

// Initialize execution streaming service
const streamingService = initializeExecutionStreamingService(wsServer);

// Initialize event bus
const eventBus = initializeEventBus({
  historyEnabled: true,
  historyMaxSize: 10000
});

// Initialize webhook retry service
const webhookService = initializeWebhookRetryService();

// Initialize performance optimizer
const optimizer = initializePerformanceOptimizer({
  workerPool: {
    minWorkers: 2,
    maxWorkers: 10,
    idleTimeout: 60000,
    taskTimeout: 300000
  },
  resourceLimits: {
    maxMemoryMB: 2048,
    maxCpuPercent: 80,
    maxConcurrentExecutions: 100,
    maxExecutionTime: 300000
  },
  cache: {
    enabled: true,
    maxSize: 1000,
    ttl: 3600000
  }
});

// Setup event listeners
const eventPublisher = getEventPublisher();

streamingService.on('event', (event) => {
  logger.debug('Execution stream event:', event);
});

eventBus.subscribe(
  { types: ['execution.completed', 'execution.failed'] },
  (event) => {
    logger.info('Execution ended:', event);
    // Send notifications, update analytics, etc.
  }
);

webhookService.on('webhook.failed', ({ deliveryId, webhookId, lastError }) => {
  logger.error('Webhook delivery failed permanently:', {
    deliveryId,
    webhookId,
    lastError
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  eventPublisher.systemStartup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  eventPublisher.systemShutdown();

  httpServer.close(() => {
    wsServer.shutdown();
    streamingService.shutdown();
    eventBus.shutdown();
    webhookService.shutdown();
    optimizer.shutdown();
    process.exit(0);
  });
});
```

### 2. Create Execution Endpoint

```typescript
// backend/api/routes/executions.ts
import { Router } from 'express';
import { StreamingExecutionEngine } from '../../components/execution/StreamingExecutionEngine';
import { getExecutionStreamingService } from '../../backend/services/ExecutionStreamingService';
import { getEventPublisher } from '../../backend/services/EventBus';
import { getPerformanceOptimizer } from '../../backend/services/PerformanceOptimizer';
import { logger } from '../../services/LoggingService';
import { requireAuth } from '../../middleware/auth';

const router = Router();
const streamingService = getExecutionStreamingService();
const eventPublisher = getEventPublisher();
const optimizer = getPerformanceOptimizer();

/**
 * Start workflow execution with real-time streaming
 */
router.post('/:workflowId/execute', requireAuth, async (req, res) => {
  const { workflowId } = req.params;
  const { nodes, edges, triggerData } = req.body;
  const userId = req.user.id;

  try {
    // Generate execution ID
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Starting workflow execution', {
      executionId,
      workflowId,
      userId,
      nodeCount: nodes.length
    });

    // Start execution stream
    streamingService.startExecution({
      executionId,
      workflowId,
      userId,
      metadata: {
        triggeredBy: req.body.triggeredBy || 'manual',
        triggerData,
        startedAt: new Date()
      }
    });

    // Publish execution started event
    eventPublisher.executionStarted(executionId, workflowId, {
      userId,
      nodeCount: nodes.length,
      triggeredBy: req.body.triggeredBy || 'manual'
    });

    // Create streaming execution engine
    const engine = new StreamingExecutionEngine(nodes, edges, {
      executionId,
      workflowId,
      enableStreaming: true,
      authToken: req.headers.authorization?.replace('Bearer ', ''),
      maxExecutionTime: 300000,
      enableMetrics: true
    });

    // Return execution ID immediately
    res.json({
      executionId,
      workflowId,
      status: 'started',
      message: 'Execution started, subscribe to WebSocket for real-time updates'
    });

    // Execute workflow asynchronously
    executeWorkflowAsync(engine, executionId, workflowId, userId);

  } catch (error) {
    logger.error('Failed to start execution:', error);
    res.status(500).json({
      error: 'Failed to start execution',
      message: error.message
    });
  }
});

/**
 * Execute workflow asynchronously with streaming
 */
async function executeWorkflowAsync(
  engine: StreamingExecutionEngine,
  executionId: string,
  workflowId: string,
  userId: string
): Promise<void> {
  try {
    // Execute workflow
    const result = await engine.execute();

    // Get metrics
    const metrics = engine.getMetrics();
    const streamingMetrics = engine.getStreamingMetrics();

    logger.info('Workflow execution completed', {
      executionId,
      workflowId,
      success: result.success,
      duration: metrics.overallMetrics.duration,
      nodesExecuted: result.metrics.nodesExecuted
    });

    // Publish completion event
    eventPublisher.executionCompleted(executionId, {
      success: result.success,
      duration: metrics.overallMetrics.duration || 0,
      nodesExecuted: result.metrics.nodesExecuted,
      metrics,
      streamingMetrics
    });

    // Cleanup
    engine.cleanup();

  } catch (error) {
    logger.error('Workflow execution failed:', error);

    // Publish failure event
    eventPublisher.executionFailed(executionId, error.message, {
      workflowId,
      userId,
      error: error.stack
    });

    // Cleanup
    engine.cleanup();
  }
}

/**
 * Get execution status
 */
router.get('/:executionId/status', requireAuth, async (req, res) => {
  const { executionId } = req.params;

  // Get stream info
  const streamInfo = streamingService?.getStreamInfo(executionId);

  if (!streamInfo) {
    return res.status(404).json({
      error: 'Execution not found',
      executionId
    });
  }

  res.json({
    executionId,
    workflowId: streamInfo.workflowId,
    userId: streamInfo.userId,
    metadata: streamInfo.metadata,
    activeStreams: streamingService.getActiveStreamCount()
  });
});

/**
 * Cancel execution
 */
router.post('/:executionId/cancel', requireAuth, async (req, res) => {
  const { executionId } = req.params;
  const { reason } = req.body;

  // Emit cancellation via streaming service
  streamingService?.emitExecutionCancelled(executionId, reason);

  // Publish event
  eventPublisher.executionCancelled(executionId, reason);

  res.json({
    executionId,
    status: 'cancelled',
    reason
  });
});

export default router;
```

### 3. Webhook Integration

```typescript
// backend/api/routes/webhooks.ts
import { Router } from 'express';
import { getWebhookRetryService } from '../../backend/services/WebhookRetryService';
import { logger } from '../../services/LoggingService';

const router = Router();
const webhookService = getWebhookRetryService();

/**
 * Queue webhook delivery
 */
router.post('/send', async (req, res) => {
  const { url, method, headers, body, authentication, retryConfig } = req.body;

  try {
    const deliveryId = await webhookService.queueWebhook({
      id: `webhook-${Date.now()}`,
      url,
      method: method || 'POST',
      headers: headers || {},
      body,
      timeout: 30000,
      authentication,
      retryConfig
    });

    res.json({
      deliveryId,
      status: 'queued',
      message: 'Webhook queued for delivery'
    });
  } catch (error) {
    logger.error('Failed to queue webhook:', error);
    res.status(500).json({
      error: 'Failed to queue webhook',
      message: error.message
    });
  }
});

/**
 * Get webhook delivery status
 */
router.get('/:deliveryId/status', (req, res) => {
  const { deliveryId } = req.params;

  const delivery = webhookService.getDeliveryStatus(deliveryId);
  const log = webhookService.getDeliveryLog(deliveryId);

  if (!delivery && !log) {
    return res.status(404).json({
      error: 'Webhook delivery not found',
      deliveryId
    });
  }

  res.json({
    delivery,
    log,
    stats: webhookService.getStats()
  });
});

export default router;
```

---

## Frontend Integration

### 1. Connect to WebSocket

```typescript
// utils/websocket.ts
import { createExecutionStreamer, ExecutionStreamer } from '../components/execution/ExecutionStreamer';

class WebSocketManager {
  private streamers = new Map<string, ExecutionStreamer>();

  createStreamer(executionId: string, workflowId: string, authToken: string): ExecutionStreamer {
    if (this.streamers.has(executionId)) {
      return this.streamers.get(executionId)!;
    }

    const streamer = createExecutionStreamer({
      executionId,
      workflowId,
      websocketUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      authentication: { token: authToken },
      onEvent: (event) => {
        console.log('Execution event:', event);
      },
      onError: (error) => {
        console.error('Streamer error:', error);
      },
      onDisconnect: () => {
        console.warn('Streamer disconnected');
      }
    });

    this.streamers.set(executionId, streamer);

    // Auto cleanup
    streamer.once('completed', () => {
      setTimeout(() => {
        this.removeStreamer(executionId);
      }, 60000);
    });

    streamer.once('failed', () => {
      setTimeout(() => {
        this.removeStreamer(executionId);
      }, 60000);
    });

    return streamer;
  }

  removeStreamer(executionId: string): void {
    const streamer = this.streamers.get(executionId);
    if (streamer) {
      streamer.destroy();
      this.streamers.delete(executionId);
    }
  }

  cleanup(): void {
    for (const streamer of this.streamers.values()) {
      streamer.destroy();
    }
    this.streamers.clear();
  }
}

export const wsManager = new WebSocketManager();
```

### 2. React Hook for Real-Time Execution

```typescript
// hooks/useExecutionStreaming.ts
import { useState, useEffect, useCallback } from 'react';
import { wsManager } from '../utils/websocket';
import { ExecutionStreamEvent } from '../components/execution/ExecutionStreamer';

export interface ExecutionState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  nodesCompleted: number;
  nodesTotal: number;
  nodesInProgress: number;
  currentNode?: string;
  error?: string;
  duration?: number;
  events: ExecutionStreamEvent[];
}

export function useExecutionStreaming(
  executionId: string,
  workflowId: string,
  authToken: string
) {
  const [state, setState] = useState<ExecutionState>({
    status: 'pending',
    progress: 0,
    nodesCompleted: 0,
    nodesTotal: 0,
    nodesInProgress: 0,
    events: []
  });

  useEffect(() => {
    const streamer = wsManager.createStreamer(executionId, workflowId, authToken);

    // Listen to all events
    const handleEvent = (event: ExecutionStreamEvent) => {
      setState(prev => ({
        ...prev,
        events: [...prev.events, event]
      }));
    };

    // Listen to specific events
    streamer.on('node_started', (event) => {
      setState(prev => ({
        ...prev,
        status: 'running',
        currentNode: event.data.nodeId as string,
        nodesInProgress: prev.nodesInProgress + 1
      }));
    });

    streamer.on('node_completed', (event) => {
      setState(prev => ({
        ...prev,
        nodesCompleted: prev.nodesCompleted + 1,
        nodesInProgress: Math.max(0, prev.nodesInProgress - 1)
      }));
    });

    streamer.on('node_failed', (event) => {
      setState(prev => ({
        ...prev,
        nodesInProgress: Math.max(0, prev.nodesInProgress - 1),
        error: event.data.error as string
      }));
    });

    streamer.on('progress', (event) => {
      const data = event.data as {
        percentage: number;
        nodesCompleted: number;
        nodesTotal: number;
        nodesInProgress: number;
      };

      setState(prev => ({
        ...prev,
        progress: data.percentage,
        nodesCompleted: data.nodesCompleted,
        nodesTotal: data.nodesTotal,
        nodesInProgress: data.nodesInProgress
      }));
    });

    streamer.on('completed', (event) => {
      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        duration: event.data.duration as number
      }));
    });

    streamer.on('failed', (event) => {
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: event.data.error as string
      }));
    });

    streamer.on('cancelled', (event) => {
      setState(prev => ({
        ...prev,
        status: 'cancelled'
      }));
    });

    streamer.on('*', handleEvent);

    // Cleanup
    return () => {
      streamer.off('*', handleEvent);
    };
  }, [executionId, workflowId, authToken]);

  const cancel = useCallback(() => {
    // Call API to cancel execution
    fetch(`/api/executions/${executionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'User cancelled'
      })
    });
  }, [executionId, authToken]);

  return { state, cancel };
}
```

### 3. Execution Monitor Component

```tsx
// components/ExecutionMonitor.tsx
import React from 'react';
import { useExecutionStreaming } from '../hooks/useExecutionStreaming';
import LiveExecutionMonitor from './LiveExecutionMonitor';

interface ExecutionMonitorProps {
  executionId: string;
  workflowId: string;
  authToken: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onComplete?: (summary: Record<string, unknown>) => void;
}

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  executionId,
  workflowId,
  authToken,
  nodes,
  edges,
  onComplete
}) => {
  const { state, cancel } = useExecutionStreaming(executionId, workflowId, authToken);

  return (
    <div className="execution-monitor">
      {/* Header */}
      <div className="execution-header">
        <h2>Execution: {executionId}</h2>
        <div className="status-badge status-{state.status}">
          {state.status.toUpperCase()}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${state.progress}%` }}
        />
        <span className="progress-text">{state.progress}%</span>
      </div>

      {/* Stats */}
      <div className="execution-stats">
        <div className="stat">
          <label>Nodes Completed</label>
          <value>{state.nodesCompleted} / {state.nodesTotal}</value>
        </div>
        <div className="stat">
          <label>In Progress</label>
          <value>{state.nodesInProgress}</value>
        </div>
        {state.duration && (
          <div className="stat">
            <label>Duration</label>
            <value>{(state.duration / 1000).toFixed(2)}s</value>
          </div>
        )}
      </div>

      {/* Live Workflow Visualization */}
      <LiveExecutionMonitor
        executionId={executionId}
        workflowId={workflowId}
        nodes={nodes}
        edges={edges}
        showMetrics={true}
        showDataFlow={true}
        onExecutionComplete={onComplete}
      />

      {/* Error Display */}
      {state.error && (
        <div className="execution-error">
          <h3>Error</h3>
          <pre>{state.error}</pre>
        </div>
      )}

      {/* Actions */}
      <div className="execution-actions">
        {state.status === 'running' && (
          <button onClick={cancel} className="btn-danger">
            Cancel Execution
          </button>
        )}
      </div>

      {/* Event Log */}
      <div className="event-log">
        <h3>Event Log</h3>
        <div className="events">
          {state.events.map((event, index) => (
            <div key={index} className="event-item">
              <span className="event-type">{event.type}</span>
              <span className="event-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span className="event-sequence">#{event.sequence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 4. Complete Usage Example

```tsx
// App.tsx or ExecutionPage.tsx
import React, { useState } from 'react';
import { ExecutionMonitor } from './components/ExecutionMonitor';

function ExecutionPage() {
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const startExecution = async () => {
    setIsExecuting(true);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nodes: workflowNodes,
          edges: workflowEdges,
          triggeredBy: 'manual',
          triggerData: {}
        })
      });

      const data = await response.json();
      setExecutionId(data.executionId);
    } catch (error) {
      console.error('Failed to start execution:', error);
      setIsExecuting(false);
    }
  };

  const handleComplete = (summary: Record<string, unknown>) => {
    console.log('Execution completed:', summary);
    setIsExecuting(false);
    // Update UI, show notification, etc.
  };

  return (
    <div className="execution-page">
      {!executionId ? (
        <button
          onClick={startExecution}
          disabled={isExecuting}
          className="btn-primary"
        >
          {isExecuting ? 'Starting...' : 'Start Execution'}
        </button>
      ) : (
        <ExecutionMonitor
          executionId={executionId}
          workflowId={workflowId}
          authToken={authToken}
          nodes={workflowNodes}
          edges={workflowEdges}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
```

---

## Performance Monitoring

### Metrics Dashboard

```tsx
// components/MetricsDashboard.tsx
import React, { useEffect, useState } from 'react';
import { getEventBus } from '../backend/services/EventBus';

export const MetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    activeExecutions: 0,
    completedToday: 0,
    failedToday: 0,
    averageDuration: 0,
    throughput: 0
  });

  useEffect(() => {
    const eventBus = getEventBus();

    // Subscribe to execution events
    const subscriptionId = eventBus.subscribe(
      { types: ['execution.completed', 'execution.failed'] },
      (event) => {
        // Update metrics
        setMetrics(prev => ({
          ...prev,
          completedToday: event.type === 'execution.completed'
            ? prev.completedToday + 1
            : prev.completedToday,
          failedToday: event.type === 'execution.failed'
            ? prev.failedToday + 1
            : prev.failedToday
        }));
      }
    );

    // Fetch current metrics
    const fetchMetrics = async () => {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      setMetrics(data);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);

    return () => {
      eventBus.unsubscribe(subscriptionId);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="metrics-dashboard">
      <div className="metric-card">
        <h3>Active Executions</h3>
        <div className="metric-value">{metrics.activeExecutions}</div>
      </div>
      <div className="metric-card">
        <h3>Completed Today</h3>
        <div className="metric-value">{metrics.completedToday}</div>
      </div>
      <div className="metric-card">
        <h3>Failed Today</h3>
        <div className="metric-value">{metrics.failedToday}</div>
      </div>
      <div className="metric-card">
        <h3>Average Duration</h3>
        <div className="metric-value">{metrics.averageDuration.toFixed(2)}s</div>
      </div>
      <div className="metric-card">
        <h3>Throughput</h3>
        <div className="metric-value">{metrics.throughput}/min</div>
      </div>
    </div>
  );
};
```

---

## Summary

This integration example demonstrates:

1. ✅ Complete backend setup with all services
2. ✅ Real-time WebSocket streaming
3. ✅ Event bus for system-wide events
4. ✅ Webhook retry with reliability
5. ✅ Performance optimization
6. ✅ Frontend real-time updates
7. ✅ React hooks for easy integration
8. ✅ Comprehensive error handling
9. ✅ Metrics and monitoring

**All components work together seamlessly to provide enterprise-grade real-time workflow execution!**
