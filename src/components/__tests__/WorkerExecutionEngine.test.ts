// Tests pour le moteur d'exécution avec Web Workers
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

// Track all mock workers for cleanup
let mockWorkers: MockWorker[] = [];

// Mock Worker API with proper event listener support
class MockWorker {
  private messageListeners: Array<(event: MessageEvent) => void> = [];
  private errorListeners: Array<(event: ErrorEvent) => void> = [];
  private terminated = false;

  constructor() {
    mockWorkers.push(this);
  }

  addEventListener(event: string, callback: (event: unknown) => void) {
    if (event === 'message') {
      this.messageListeners.push(callback as (event: MessageEvent) => void);
    } else if (event === 'error') {
      this.errorListeners.push(callback as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(event: string, callback: (event: unknown) => void) {
    if (event === 'message') {
      const index = this.messageListeners.indexOf(callback as (event: MessageEvent) => void);
      if (index > -1) this.messageListeners.splice(index, 1);
    } else if (event === 'error') {
      const index = this.errorListeners.indexOf(callback as (event: ErrorEvent) => void);
      if (index > -1) this.errorListeners.splice(index, 1);
    }
  }

  postMessage(message: unknown) {
    if (this.terminated) return;

    const msg = message as { type?: string; nodeId?: string; data?: { nodeType?: string } };

    // Simulate async worker response
    setTimeout(() => {
      if (this.terminated) return;

      if (msg.type === 'execute' && msg.nodeId) {
        const responseEvent = new MessageEvent('message', {
          data: {
            type: 'result',
            nodeId: msg.nodeId,
            data: {
              success: true,
              data: { processed: true },
              duration: 100,
              metadata: {
                nodeType: msg.data?.nodeType || 'unknown',
                executedAt: new Date().toISOString(),
                retryCount: 0
              }
            }
          }
        });

        // Call all registered message listeners
        this.messageListeners.forEach(listener => {
          try {
            listener(responseEvent);
          } catch (e) {
            // Ignore errors in listeners
          }
        });
      }
    }, 5);
  }

  terminate() {
    this.terminated = true;
    this.messageListeners = [];
    this.errorListeners = [];
  }
}

// Set up global mocks before any module loads
(global as unknown as Record<string, unknown>).Worker = MockWorker;
(global as unknown as Record<string, unknown>).URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {}
};
(global as unknown as Record<string, unknown>).Blob = class {
  constructor(public parts: unknown[], public options?: unknown) {}
};

// Mock window with non-localhost location
(global as unknown as Record<string, unknown>).window = {
  ...global.window,
  location: {
    hostname: 'test.example.com',
    href: 'https://test.example.com',
    origin: 'https://test.example.com'
  },
  dispatchEvent: () => true
};

describe('WorkerExecutionEngine', () => {
  // Import the module dynamically so mocks are in place first
  let WorkerExecutionEngine: typeof import('../../services/WorkerExecutionEngine').WorkerExecutionEngine;
  let engine: InstanceType<typeof WorkerExecutionEngine>;

  beforeAll(async () => {
    // Reset module cache and reimport with mocks in place
    vi.resetModules();

    // Import the module fresh
    const module = await import('../../services/WorkerExecutionEngine');
    WorkerExecutionEngine = module.WorkerExecutionEngine;
  });

  beforeEach(() => {
    // Clear mock workers from previous tests
    mockWorkers = [];

    // Use real timers for async operations
    vi.useRealTimers();

    // Create engine - workers will be initialized because window.location.hostname is not localhost
    engine = new WorkerExecutionEngine(2); // Limiter a 2 workers pour les tests
  });

  afterEach(() => {
    if (engine) {
      engine.destroy();
    }

    // Terminate any remaining mock workers
    mockWorkers.forEach(w => w.terminate());
    mockWorkers = [];
  });

  describe('executeWorkflow', () => {
    it('devrait executer un workflow simple', async () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'node1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { type: 'transform', label: 'Transform', config: {} }
        }
      ];

      const edges: WorkflowEdge[] = [];

      const results = await engine.executeWorkflow(nodes, edges, {});
      expect(results.size).toBe(1);
      expect(results.get('node1')).toBeDefined();
      expect(results.get('node1')!.success).toBe(true);
    }, 10000);

    it('devrait executer les noeuds en parallele quand possible', async () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'node1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { type: 'trigger', label: 'Start', config: {} }
        },
        {
          id: 'node2',
          type: 'custom',
          position: { x: 300, y: 50 },
          data: { type: 'transform', label: 'Transform 1', config: {} }
        },
        {
          id: 'node3',
          type: 'custom',
          position: { x: 300, y: 150 },
          data: { type: 'transform', label: 'Transform 2', config: {} }
        }
      ];

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'node1', target: 'node2', type: 'smoothstep' },
        { id: 'e2', source: 'node1', target: 'node3', type: 'smoothstep' }
      ];

      const startTime = Date.now();
      const results = await engine.executeWorkflow(nodes, edges, {});
      const duration = Date.now() - startTime;

      expect(results.size).toBe(3);
      // Les noeuds 2 et 3 devraient s executer en parallele
      expect(duration).toBeLessThan(5000); // Should complete quickly with mocks
    }, 10000);

    it('devrait respecter les dependances entre noeuds', async () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'node1',
          type: 'custom',
          position: { x: 100, y: 100 },
          data: { type: 'transform', label: 'Step 1', config: {} }
        },
        {
          id: 'node2',
          type: 'custom',
          position: { x: 300, y: 100 },
          data: { type: 'transform', label: 'Step 2', config: {} }
        },
        {
          id: 'node3',
          type: 'custom',
          position: { x: 500, y: 100 },
          data: { type: 'transform', label: 'Step 3', config: {} }
        }
      ];

      const edges: WorkflowEdge[] = [
        { id: 'e1', source: 'node1', target: 'node2', type: 'smoothstep' },
        { id: 'e2', source: 'node2', target: 'node3', type: 'smoothstep' }
      ];

      const results = await engine.executeWorkflow(nodes, edges, {});
      expect(results.size).toBe(3);
      // Verifier que tous les noeuds ont ete executes avec succes
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    }, 10000);
  });

  describe('executeNode', () => {
    it('devrait executer un noeud individuel', async () => {
      const result = await engine.executeNode(
        'testNode',
        'transform',
        { expression: 'return $.data' },
        {
          nodeId: 'testNode',
          inputData: { data: 'test' },
          globalVariables: {},
          previousResults: {},
          executionMetadata: {
            startTime: Date.now(),
            timeout: 30000,
            maxRetries: 3,
            currentAttempt: 1
          }
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: true });
    }, 10000);
  });

  describe('getExecutionStats', () => {
    it('devrait retourner les statistiques d execution', () => {
      const stats = engine.getExecutionStats();
      expect(stats).toHaveProperty('totalWorkers');
      expect(stats).toHaveProperty('activeWorkers');
      expect(stats).toHaveProperty('idleWorkers');
      expect(stats).toHaveProperty('queuedJobs');
      expect(stats).toHaveProperty('completedJobs');

      expect(stats.totalWorkers).toBe(2);
      expect(stats.idleWorkers).toBe(2);
    });
  });

  describe('optimizeWorkerCount', () => {
    it('devrait ajuster le nombre de workers selon la charge', () => {
      const initialStats = engine.getExecutionStats();
      expect(initialStats.totalWorkers).toBe(2);

      // Augmenter la charge cible devrait potentiellement ajouter des workers
      engine.optimizeWorkerCount(0.9);

      const newStats = engine.getExecutionStats();
      expect(newStats.totalWorkers).toBeGreaterThanOrEqual(2);
    });
  });
});
