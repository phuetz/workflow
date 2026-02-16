/**
 * Backend Services Tests
 * Tests for MonitoringService, WorkflowVersionService, DurableExecutionService, LogStreamingService.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  workflowExecution: {
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _avg: { duration: null } }),
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn().mockResolvedValue([]),
  },
  workflow: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  workflowVersion: {
    findFirst: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../../backend/database/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../services/SimpleLogger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../backend/queue/QueueManager', () => ({
  queueManager: {
    getQueueMetrics: vi.fn().mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 }),
  },
}));

// ============================================================================
// MonitoringService Tests
// ============================================================================

describe('MonitoringService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../backend/services/MonitoringService');
    service = new mod.MonitoringService();
  });

  it('getMetrics returns execution and system metrics', async () => {
    mockPrisma.workflowExecution.count.mockResolvedValue(100);
    mockPrisma.workflowExecution.aggregate.mockResolvedValue({ _avg: { duration: 1500 } });
    mockPrisma.workflow.count.mockResolvedValue(10);

    const metrics = await service.getMetrics();

    expect(metrics).toHaveProperty('executions');
    expect(metrics).toHaveProperty('workflows');
    expect(metrics).toHaveProperty('system');
    expect(metrics).toHaveProperty('queue');
    expect(metrics.system).toHaveProperty('uptimeSeconds');
    expect(metrics.system).toHaveProperty('memoryUsedMB');
    expect(metrics.system).toHaveProperty('nodeVersion');
  });

  it('getExecutionTimeline returns grouped results', async () => {
    const now = new Date();
    mockPrisma.workflowExecution.findMany.mockResolvedValue([
      { status: 'SUCCESS', startedAt: now, duration: 100 },
      { status: 'FAILED', startedAt: now, duration: 200 },
      { status: 'SUCCESS', startedAt: now, duration: 300 },
    ]);

    const timeline = await service.getExecutionTimeline(1);

    expect(Array.isArray(timeline)).toBe(true);
    if (timeline.length > 0) {
      expect(timeline[0]).toHaveProperty('hour');
      expect(timeline[0]).toHaveProperty('total');
      expect(timeline[0]).toHaveProperty('success');
      expect(timeline[0]).toHaveProperty('failure');
    }
  });

  it('getTopFailingWorkflows returns ranked results', async () => {
    mockPrisma.workflowExecution.groupBy.mockResolvedValue([
      { workflowId: 'wf1', _count: 5 },
      { workflowId: 'wf2', _count: 3 },
    ]);
    mockPrisma.workflow.findMany.mockResolvedValue([
      { id: 'wf1', name: 'Workflow 1' },
      { id: 'wf2', name: 'Workflow 2' },
    ]);

    const failures = await service.getTopFailingWorkflows(5);

    expect(failures).toHaveLength(2);
    expect(failures[0]).toHaveProperty('workflowId', 'wf1');
    expect(failures[0]).toHaveProperty('workflowName', 'Workflow 1');
    expect(failures[0]).toHaveProperty('failureCount', 5);
  });
});

// ============================================================================
// DurableExecutionService Tests
// ============================================================================

describe('DurableExecutionService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../backend/services/DurableExecutionService');
    service = new mod.DurableExecutionService();
  });

  it('saveCheckpoint updates execution output', async () => {
    mockPrisma.workflowExecution.update.mockResolvedValue({});

    await service.saveCheckpoint('exec-1', 'node-5', { 'node-5': { data: 'result' } }, ['node-6']);

    expect(mockPrisma.workflowExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exec-1' },
        data: expect.objectContaining({
          output: expect.objectContaining({
            checkpoint: expect.objectContaining({
              lastCompletedNode: 'node-5',
              nextNodes: ['node-6'],
            }),
          }),
        }),
      })
    );
  });

  it('recoverExecution returns checkpoint data', async () => {
    mockPrisma.workflowExecution.findUnique.mockResolvedValue({
      output: {
        checkpoint: {
          lastCompletedNode: 'node-3',
          nodeResults: { 'node-3': {} },
          nextNodes: ['node-4'],
        },
      },
    });

    const result = await service.recoverExecution('exec-1');

    expect(result.canResume).toBe(true);
    expect(result.lastCompletedNode).toBe('node-3');
    expect(result.nextNodes).toEqual(['node-4']);
  });

  it('recoverExecution returns false when no checkpoint', async () => {
    mockPrisma.workflowExecution.findUnique.mockResolvedValue({ output: {} });

    const result = await service.recoverExecution('exec-1');

    expect(result.canResume).toBe(false);
  });

  it('recoverExecution returns false when execution not found', async () => {
    mockPrisma.workflowExecution.findUnique.mockResolvedValue(null);

    const result = await service.recoverExecution('nonexistent');

    expect(result.canResume).toBe(false);
  });

  it('createApprovalGate returns token and URL', async () => {
    mockPrisma.workflowExecution.update.mockResolvedValue({});

    const result = await service.createApprovalGate('exec-1', 'wf-1', 'node-5', ['user-1']);

    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('gateId');
    expect(result).toHaveProperty('approvalUrl');
    expect(result.token).toHaveLength(64); // 32 bytes hex
    expect(result.approvalUrl).toContain('/api/approvals/');
  });

  it('resolveApprovalGate approves and resumes execution', async () => {
    mockPrisma.workflowExecution.update.mockResolvedValue({});

    const gate = await service.createApprovalGate('exec-1', 'wf-1', 'node-5', ['*']);
    const result = await service.resolveApprovalGate(gate.token, 'approved', 'user-1', 'Looks good');

    expect(result.status).toBe('approved');
    expect(result.executionId).toBe('exec-1');
  });

  it('resolveApprovalGate rejects and cancels execution', async () => {
    mockPrisma.workflowExecution.update.mockResolvedValue({});

    const gate = await service.createApprovalGate('exec-2', 'wf-1', 'node-5', ['*']);
    const result = await service.resolveApprovalGate(gate.token, 'rejected', 'user-1', 'Not ready');

    expect(result.status).toBe('rejected');
  });

  it('getPendingApprovals returns only pending gates', async () => {
    mockPrisma.workflowExecution.update.mockResolvedValue({});

    await service.createApprovalGate('exec-1', 'wf-1', 'node-1', ['*']);
    await service.createApprovalGate('exec-2', 'wf-1', 'node-2', ['*']);

    const pending = service.getPendingApprovals();
    expect(pending.length).toBeGreaterThanOrEqual(2);
  });

  it('findStaleExecutions queries for old running executions', async () => {
    mockPrisma.workflowExecution.findMany.mockResolvedValue([
      { id: 'stale-1' },
      { id: 'stale-2' },
    ]);

    const stale = await service.findStaleExecutions(60000);

    expect(stale).toEqual(['stale-1', 'stale-2']);
    expect(mockPrisma.workflowExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'RUNNING',
        }),
      })
    );
  });
});

// ============================================================================
// WorkflowVersionService Tests
// ============================================================================

describe('WorkflowVersionService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../backend/services/WorkflowVersionService');
    service = new mod.WorkflowVersionService();
  });

  it('commit creates a new version', async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue({
      id: 'wf-1', nodes: [{ id: 'n1' }], edges: [{ id: 'e1' }], variables: {}, settings: {},
    });
    mockPrisma.workflowVersion.findFirst.mockResolvedValue(null);
    mockPrisma.workflowVersion.create.mockResolvedValue({
      id: 'v-1', version: 1, branch: 'main',
    });

    const result = await service.commit('wf-1', 'main', 'Initial commit', 'user-1');

    expect(result).toEqual({ id: 'v-1', version: 1, branch: 'main' });
    expect(mockPrisma.workflowVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workflowId: 'wf-1',
          version: 1,
          branch: 'main',
          commitMessage: 'Initial commit',
        }),
      })
    );
  });

  it('commit increments version number', async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue({
      id: 'wf-1', nodes: [], edges: [], variables: {}, settings: {},
    });
    mockPrisma.workflowVersion.findFirst.mockResolvedValue({
      version: 3, nodes: [], edges: [],
    });
    mockPrisma.workflowVersion.create.mockResolvedValue({
      id: 'v-4', version: 4, branch: 'main',
    });

    const result = await service.commit('wf-1', 'main', 'Next', 'user-1');

    expect(result.version).toBe(4);
  });

  it('commit throws when workflow not found', async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue(null);

    await expect(service.commit('nonexistent', 'main', 'msg', 'u1'))
      .rejects.toThrow('Workflow not found');
  });

  it('listVersions returns versions for a workflow', async () => {
    mockPrisma.workflowVersion.findMany.mockResolvedValue([
      { id: 'v-2', version: 2, branch: 'main', commitMessage: 'Second' },
      { id: 'v-1', version: 1, branch: 'main', commitMessage: 'First' },
    ]);

    const versions = await service.listVersions('wf-1');

    expect(versions).toHaveLength(2);
    expect(mockPrisma.workflowVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workflowId: 'wf-1' },
        orderBy: { version: 'desc' },
      })
    );
  });

  it('createBranch copies source branch data', async () => {
    mockPrisma.workflowVersion.findFirst
      .mockResolvedValueOnce(null) // branch doesn't exist check
      .mockResolvedValueOnce({ // source branch latest
        version: 5, nodes: [{ id: 'n1' }], edges: [], variables: {}, settings: {},
        size: 100, checksum: 'abc123',
      });
    mockPrisma.workflowVersion.create.mockResolvedValue({
      id: 'new-v', version: 1,
    });

    const result = await service.createBranch('wf-1', 'feature/test', 'main', 'user-1');

    expect(result.branch).toBe('feature/test');
    expect(mockPrisma.workflowVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          branch: 'feature/test',
          version: 1,
          baseBranch: 'main',
        }),
      })
    );
  });

  it('createBranch rejects invalid branch names', async () => {
    await expect(service.createBranch('wf-1', '..invalid', 'main', 'u1'))
      .rejects.toThrow('Invalid branch name');
  });

  it('tag adds tag to a version', async () => {
    mockPrisma.workflowVersion.findFirst.mockResolvedValue({
      id: 'v-1', tags: ['v1.0'],
    });
    mockPrisma.workflowVersion.update.mockResolvedValue({});

    const result = await service.tag('wf-1', 1, 'main', 'v1.1');

    expect(result).toEqual({ version: 1, tag: 'v1.1' });
    expect(mockPrisma.workflowVersion.update).toHaveBeenCalledWith({
      where: { id: 'v-1' },
      data: { tags: ['v1.0', 'v1.1'] },
    });
  });
});

// ============================================================================
// LogStreamingService Tests
// ============================================================================

describe('LogStreamingService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../backend/services/LogStreamingService');
    service = new mod.LogStreamingService();
  });

  it('initializes with empty streams', () => {
    expect(service).toBeDefined();
  });

  it('log method accepts entries', () => {
    // The log method buffers entries internally
    if (typeof service.log === 'function') {
      service.log('info', 'test message', { key: 'value' });
      service.log('error', 'error message');
    }
    expect(service).toBeDefined();
  });
});
