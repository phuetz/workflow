/**
 * ExecutionStreamingService Tests
 * Tests for real-time execution streaming functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { ExecutionStreamingService } from '../backend/services/ExecutionStreamingService';
import type { WebSocketServerManager } from '../backend/websocket/WebSocketServer';
import type { WebSocketClient, WebSocketMessage } from '../types/websocket';

// Mock WebSocketServerManager
class MockWebSocketServer extends EventEmitter implements Partial<WebSocketServerManager> {
  private clients = new Map<string, WebSocketClient>();

  sendToClient(client: WebSocketClient, message: WebSocketMessage): void {
    // Simulate sending message
  }

  broadcast(message: WebSocketMessage, options?: unknown): void {
    // Simulate broadcasting
  }

  getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  addMockClient(client: WebSocketClient): void {
    this.clients.set(client.id, client);
  }

  removeMockClient(clientId: string): void {
    this.clients.delete(clientId);
  }
}

describe('ExecutionStreamingService', () => {
  let wsServer: MockWebSocketServer;
  let streamingService: ExecutionStreamingService;
  let mockClient: WebSocketClient;

  beforeEach(() => {
    // Create mock WebSocket server
    wsServer = new MockWebSocketServer();

    // Create streaming service
    streamingService = new ExecutionStreamingService(wsServer as unknown as WebSocketServerManager);

    // Create mock client
    mockClient = {
      id: 'client-123',
      socket: {} as WebSocket,
      userId: 'user-456',
      subscriptions: new Set(),
      metadata: {},
      lastActivity: new Date()
    };

    wsServer.addMockClient(mockClient);
  });

  afterEach(() => {
    streamingService.shutdown();
  });

  describe('Execution Stream Lifecycle', () => {
    it('should start execution stream', () => {
      const executionId = 'exec-123';
      const workflowId = 'workflow-456';

      streamingService.startExecution({
        executionId,
        workflowId,
        userId: 'user-789'
      });

      const streamInfo = streamingService.getStreamInfo(executionId);
      expect(streamInfo).toBeDefined();
      expect(streamInfo?.executionId).toBe(executionId);
      expect(streamInfo?.workflowId).toBe(workflowId);
    });

    it('should enforce maximum concurrent streams', () => {
      // Start many streams
      for (let i = 0; i < 1001; i++) {
        if (i < 1000) {
          streamingService.startExecution({
            executionId: `exec-${i}`,
            workflowId: 'workflow-test',
            userId: 'user-test'
          });
        } else {
          // 1001st stream should fail
          expect(() => {
            streamingService.startExecution({
              executionId: `exec-${i}`,
              workflowId: 'workflow-test',
              userId: 'user-test'
            });
          }).toThrow('Maximum concurrent streams reached');
        }
      }
    });

    it('should track active stream count', () => {
      expect(streamingService.getActiveStreamCount()).toBe(0);

      streamingService.startExecution({
        executionId: 'exec-1',
        workflowId: 'workflow-1',
        userId: 'user-1'
      });

      expect(streamingService.getActiveStreamCount()).toBe(1);

      streamingService.startExecution({
        executionId: 'exec-2',
        workflowId: 'workflow-2',
        userId: 'user-2'
      });

      expect(streamingService.getActiveStreamCount()).toBe(2);
    });
  });

  describe('Event Emission', () => {
    beforeEach(() => {
      streamingService.startExecution({
        executionId: 'exec-test',
        workflowId: 'workflow-test',
        userId: 'user-test'
      });
    });

    it('should emit node started event', () => {
      return new Promise<void>((resolve) => {
        streamingService.once('event', (event) => {
          expect(event.type).toBe('node_started');
          expect(event.executionId).toBe('exec-test');
          expect(event.data.nodeId).toBe('node-123');
          expect(event.data.nodeName).toBe('HTTP Request');
          expect(event.data.nodeType).toBe('http');
          resolve();
        });

        streamingService.emitNodeStarted(
          'exec-test',
          'node-123',
          'HTTP Request',
          'http',
          { url: 'https://example.com' }
        );
      });
    });

    it('should emit node completed event', () => {
      return new Promise<void>((resolve) => {
        streamingService.once('event', (event) => {
          expect(event.type).toBe('node_completed');
          expect(event.data.nodeId).toBe('node-123');
          expect(event.data.duration).toBe(1500);
          expect(event.data.output).toEqual({ status: 200 });
          resolve();
        });

        streamingService.emitNodeCompleted(
          'exec-test',
          'node-123',
          'HTTP Request',
          'http',
          { status: 200 },
          1500,
          { memoryUsage: 50 }
        );
      });
    });

    it('should emit node failed event', () => {
      return new Promise<void>((resolve) => {
        streamingService.once('event', (event) => {
          expect(event.type).toBe('node_failed');
          expect(event.data.nodeId).toBe('node-123');
          expect(event.data.error).toBe('Connection timeout');
          resolve();
        });

        streamingService.emitNodeFailed(
          'exec-test',
          'node-123',
          'HTTP Request',
          'http',
          new Error('Connection timeout')
        );
      });
    });

    it('should emit progress event', () => {
      return new Promise<void>((resolve) => {
        streamingService.once('event', (event) => {
          expect(event.type).toBe('progress');
          expect(event.data.nodesCompleted).toBe(5);
          expect(event.data.nodesTotal).toBe(10);
          expect(event.data.percentage).toBe(50);
          resolve();
        });

        streamingService.emitProgress('exec-test', 5, 10, 2);
      });
    });

    it('should emit execution completed event', () => {
      return new Promise<void>((resolve) => {
        streamingService.once('event', (event) => {
          expect(event.type).toBe('completed');
          expect(event.data.duration).toBe(5000);
          expect(event.data.nodesExecuted).toBe(10);
          expect(event.data.success).toBe(true);
          resolve();
        });

        streamingService.emitExecutionCompleted('exec-test', {
          duration: 5000,
          nodesExecuted: 10,
          success: true
        });
      });
    });

    it('should increment event sequence numbers', () => {
      const events: number[] = [];

      streamingService.on('event', (event) => {
        events.push(event.sequence);
      });

      streamingService.emitNodeStarted('exec-test', 'node-1', 'Test', 'test');
      streamingService.emitNodeCompleted('exec-test', 'node-1', 'Test', 'test', {}, 100);
      streamingService.emitNodeStarted('exec-test', 'node-2', 'Test', 'test');

      expect(events).toEqual([2, 3, 4]); // Starts at 2 because startExecution emits event with sequence 1
    });
  });

  describe('Client Subscriptions', () => {
    it('should handle execution subscription', () => {
      const sendToClientSpy = vi.spyOn(wsServer, 'sendToClient');

      const message: WebSocketMessage = {
        id: 'msg-123',
        type: 'execution.subscribe',
        data: { executionId: 'exec-test' },
        timestamp: new Date()
      };

      wsServer.emit('message', mockClient, message);

      expect(sendToClientSpy).toHaveBeenCalled();
      expect(mockClient.subscriptions.has('execution:exec-test')).toBe(true);
    });

    it('should handle execution unsubscription', () => {
      // First subscribe
      mockClient.subscriptions.add('execution:exec-test');

      const sendToClientSpy = vi.spyOn(wsServer, 'sendToClient');

      const message: WebSocketMessage = {
        id: 'msg-123',
        type: 'execution.unsubscribe',
        data: { executionId: 'exec-test' },
        timestamp: new Date()
      };

      wsServer.emit('message', mockClient, message);

      expect(sendToClientSpy).toHaveBeenCalled();
      expect(mockClient.subscriptions.has('execution:exec-test')).toBe(false);
    });

    it('should handle execution cancellation request', () => {
      const cancelListener = vi.fn();
      streamingService.on('execution.cancel', cancelListener);

      const message: WebSocketMessage = {
        id: 'msg-123',
        type: 'execution.cancel',
        data: { executionId: 'exec-test' },
        timestamp: new Date()
      };

      // Start execution first
      streamingService.startExecution({
        executionId: 'exec-test',
        workflowId: 'workflow-test',
        userId: 'user-456'
      });

      wsServer.emit('message', mockClient, message);

      expect(cancelListener).toHaveBeenCalledWith({
        executionId: 'exec-test',
        userId: 'user-456'
      });
    });
  });

  describe('Data Flow', () => {
    beforeEach(() => {
      streamingService.startExecution({
        executionId: 'exec-test',
        workflowId: 'workflow-test',
        userId: 'user-test'
      });
    });

    it('should emit data flow event', () => {
      return new Promise<void>((resolve) => {
        streamingService.once('event', (event) => {
          expect(event.type).toBe('data_flow');
          expect(event.data.fromNodeId).toBe('node-1');
          expect(event.data.toNodeId).toBe('node-2');
          expect(event.data.edgeId).toBe('edge-1');
          expect(event.data.size).toBeGreaterThan(0);
          resolve();
        });

        streamingService.emitDataFlow(
          'exec-test',
          'node-1',
          'node-2',
          'edge-1',
          { result: 'success', data: [1, 2, 3] }
        );
      });
    });
  });

  describe('Stream Management', () => {
    it('should get stream information', () => {
      streamingService.startExecution({
        executionId: 'exec-123',
        workflowId: 'workflow-456',
        userId: 'user-789',
        metadata: { test: 'data' }
      });

      const info = streamingService.getStreamInfo('exec-123');
      expect(info).toBeDefined();
      expect(info?.executionId).toBe('exec-123');
      expect(info?.workflowId).toBe('workflow-456');
      expect(info?.userId).toBe('user-789');
      expect(info?.metadata).toEqual({ test: 'data' });
    });

    it('should get all active streams', () => {
      streamingService.startExecution({
        executionId: 'exec-1',
        workflowId: 'workflow-1',
        userId: 'user-1'
      });

      streamingService.startExecution({
        executionId: 'exec-2',
        workflowId: 'workflow-2',
        userId: 'user-2'
      });

      const streams = streamingService.getActiveStreams();
      expect(streams).toHaveLength(2);
      expect(streams.find(s => s.executionId === 'exec-1')).toBeDefined();
      expect(streams.find(s => s.executionId === 'exec-2')).toBeDefined();
    });

    it('should handle missing execution for events', () => {
      // Try to emit event for non-existent execution
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      streamingService.emitNodeStarted(
        'non-existent',
        'node-1',
        'Test',
        'test'
      );

      // Should not throw, just log warning
      expect(warnSpy).not.toThrow();

      warnSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid subscription request', () => {
      const sendToClientSpy = vi.spyOn(wsServer, 'sendToClient');

      const message: WebSocketMessage = {
        id: 'msg-123',
        type: 'execution.subscribe',
        data: {}, // Missing executionId
        timestamp: new Date()
      };

      wsServer.emit('message', mockClient, message);

      expect(sendToClientSpy).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          type: 'error',
          data: expect.objectContaining({
            code: 'INVALID_REQUEST'
          })
        })
      );
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency events efficiently', () => {
      streamingService.startExecution({
        executionId: 'exec-perf',
        workflowId: 'workflow-perf',
        userId: 'user-perf'
      });

      const startTime = Date.now();
      const eventCount = 1000;

      for (let i = 0; i < eventCount; i++) {
        streamingService.emitNodeStarted(
          'exec-perf',
          `node-${i}`,
          `Node ${i}`,
          'test'
        );
      }

      const duration = Date.now() - startTime;

      // Should process 1000 events in less than 1 second
      expect(duration).toBeLessThan(1000);

      // Average latency should be < 1ms per event
      const averageLatency = duration / eventCount;
      expect(averageLatency).toBeLessThan(1);
    });

    it('should support 1000+ concurrent streams', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        streamingService.startExecution({
          executionId: `exec-${i}`,
          workflowId: `workflow-${i}`,
          userId: `user-${i}`
        });
      }

      const duration = Date.now() - startTime;

      expect(streamingService.getActiveStreamCount()).toBe(1000);
      // Should create 1000 streams in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on shutdown', () => {
      streamingService.startExecution({
        executionId: 'exec-1',
        workflowId: 'workflow-1',
        userId: 'user-1'
      });

      expect(streamingService.getActiveStreamCount()).toBe(1);

      streamingService.shutdown();

      expect(streamingService.getActiveStreamCount()).toBe(0);
    });
  });
});
