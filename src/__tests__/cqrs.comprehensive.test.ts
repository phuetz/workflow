/**
 * Comprehensive Unit Tests for CQRS (Command Query Responsibility Segregation)
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommandBus,
  CreateWorkflowCommandHandler,
  UpdateWorkflowCommandHandler,
  AddNodeCommandHandler,
  ExecuteWorkflowCommandHandler,
  commandBus,
} from '../cqrs/CommandHandler';
import {
  QueryBus,
  GetWorkflowQueryHandler,
  ListWorkflowsQueryHandler,
  GetExecutionQueryHandler,
  ListExecutionsQueryHandler,
  GetMetricsQueryHandler,
  queryBus,
  getWorkflowHandler,
  listWorkflowsHandler,
  getExecutionHandler,
  listExecutionsHandler,
  getMetricsHandler,
} from '../cqrs/QueryHandler';

describe('CQRS - Command Handlers', () => {
  describe('CreateWorkflowCommandHandler', () => {
    let handler: CreateWorkflowCommandHandler;

    beforeEach(() => {
      handler = new CreateWorkflowCommandHandler();
    });

    it('should identify its command type', () => {
      expect(handler.canHandle('CreateWorkflow')).toBe(true);
      expect(handler.canHandle('UpdateWorkflow')).toBe(false);
    });

    it('should validate command with missing name', async () => {
      const validation = await handler.validate({
        id: 'cmd_1',
        type: 'CreateWorkflow',
        data: { description: 'Test' },
        timestamp: new Date(),
        userId: 'user_1',
      } as any);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate valid command', async () => {
      const validation = await handler.validate({
        id: 'cmd_1',
        type: 'CreateWorkflow',
        data: { name: 'Test Workflow' },
        timestamp: new Date(),
        userId: 'user_1',
      } as any);

      expect(validation.valid).toBe(true);
    });
  });

  describe('UpdateWorkflowCommandHandler', () => {
    let handler: UpdateWorkflowCommandHandler;

    beforeEach(() => {
      handler = new UpdateWorkflowCommandHandler();
    });

    it('should identify its command type', () => {
      expect(handler.canHandle('UpdateWorkflow')).toBe(true);
      expect(handler.canHandle('CreateWorkflow')).toBe(false);
    });

    it('should validate command with missing workflowId', async () => {
      const validation = await handler.validate({
        id: 'cmd_1',
        type: 'UpdateWorkflow',
        data: { name: 'New Name' },
        timestamp: new Date(),
        userId: 'user_1',
      } as any);

      expect(validation.valid).toBe(false);
    });

    it('should validate valid update command', async () => {
      const validation = await handler.validate({
        id: 'cmd_1',
        type: 'UpdateWorkflow',
        data: { workflowId: 'wf_123', name: 'New Name' },
        timestamp: new Date(),
        userId: 'user_1',
      } as any);

      expect(validation.valid).toBe(true);
    });
  });

  describe('AddNodeCommandHandler', () => {
    let handler: AddNodeCommandHandler;

    beforeEach(() => {
      handler = new AddNodeCommandHandler();
    });

    it('should identify its command type', () => {
      expect(handler.canHandle('AddNode')).toBe(true);
      expect(handler.canHandle('DeleteNode')).toBe(false);
    });

    it('should validate command with missing fields', async () => {
      const validation = await handler.validate({
        id: 'cmd_1',
        type: 'AddNode',
        data: { workflowId: 'wf_123' },
        timestamp: new Date(),
        userId: 'user_1',
      } as any);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.field === 'nodeType')).toBe(true);
    });

    it('should validate valid add node command', async () => {
      const validation = await handler.validate({
        id: 'cmd_1',
        type: 'AddNode',
        data: {
          workflowId: 'wf_123',
          nodeType: 'http_request',
          position: { x: 100, y: 100 },
        },
        timestamp: new Date(),
        userId: 'user_1',
      } as any);

      expect(validation.valid).toBe(true);
    });
  });

  describe('ExecuteWorkflowCommandHandler', () => {
    let handler: ExecuteWorkflowCommandHandler;

    beforeEach(() => {
      handler = new ExecuteWorkflowCommandHandler();
    });

    it('should identify its command type', () => {
      expect(handler.canHandle('ExecuteWorkflow')).toBe(true);
      expect(handler.canHandle('CreateWorkflow')).toBe(false);
    });

    it('should validate command with missing workflowId', async () => {
      const validation = await handler.validate({
        id: 'cmd_1',
        type: 'ExecuteWorkflow',
        data: { input: {} },
        timestamp: new Date(),
        userId: 'user_1',
      } as any);

      expect(validation.valid).toBe(false);
    });

    it('should validate valid execute command', async () => {
      const validation = await handler.validate({
        id: 'cmd_1',
        type: 'ExecuteWorkflow',
        data: { workflowId: 'wf_123' },
        timestamp: new Date(),
        userId: 'user_1',
      } as any);

      expect(validation.valid).toBe(true);
    });
  });

  describe('CommandBus', () => {
    let bus: CommandBus;

    beforeEach(() => {
      bus = new CommandBus();
    });

    it('should register handlers', () => {
      const handler = new CreateWorkflowCommandHandler();
      bus.registerHandler('CreateWorkflow', handler);

      expect(bus.getHandlers()).toContain('CreateWorkflow');
    });

    it('should return error for unregistered command type', async () => {
      const result = await bus.dispatch({
        id: 'cmd_1',
        type: 'UnknownCommand',
        data: {},
        timestamp: new Date(),
        userId: 'user_1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No handler registered');
    });

    it('should return cached result for duplicate command', async () => {
      const handler = new CreateWorkflowCommandHandler();
      bus.registerHandler('CreateWorkflow', handler);

      const command = {
        id: 'cmd_duplicate',
        type: 'CreateWorkflow',
        data: { name: 'Test' },
        timestamp: new Date(),
        userId: 'user_1',
      };

      const result1 = await bus.dispatch(command);
      const result2 = await bus.dispatch(command);

      // Second call should return cached result (idempotency)
      expect(result2.success).toBe(result1.success);
    });

    it('should list all registered handlers', () => {
      bus.registerHandler('CreateWorkflow', new CreateWorkflowCommandHandler());
      bus.registerHandler('UpdateWorkflow', new UpdateWorkflowCommandHandler());

      const handlers = bus.getHandlers();
      expect(handlers).toContain('CreateWorkflow');
      expect(handlers).toContain('UpdateWorkflow');
    });
  });

  describe('Global commandBus', () => {
    it('should be defined', () => {
      expect(commandBus).toBeDefined();
    });

    it('should have default handlers registered', () => {
      const handlers = commandBus.getHandlers();
      expect(handlers).toContain('CreateWorkflow');
      expect(handlers).toContain('UpdateWorkflow');
      expect(handlers).toContain('AddNode');
      expect(handlers).toContain('ExecuteWorkflow');
    });
  });
});

describe('CQRS - Query Handlers', () => {
  describe('GetWorkflowQueryHandler', () => {
    let handler: GetWorkflowQueryHandler;

    beforeEach(() => {
      handler = new GetWorkflowQueryHandler();
    });

    it('should identify its query type', () => {
      expect(handler.canHandle('GetWorkflow')).toBe(true);
      expect(handler.canHandle('ListWorkflows')).toBe(false);
    });

    it('should validate query with missing workflowId', async () => {
      const validation = await handler.validate({
        id: 'q_1',
        type: 'GetWorkflow',
        parameters: {},
        timestamp: new Date(),
      } as any);

      expect(validation.valid).toBe(false);
    });

    it('should return not found for non-existent workflow', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'GetWorkflow',
        parameters: { workflowId: 'non_existent' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return workflow after update', async () => {
      handler.updateWorkflow('wf_test', { id: 'wf_test', name: 'Test' });

      const result = await handler.handle({
        id: 'q_1',
        type: 'GetWorkflow',
        parameters: { workflowId: 'wf_test' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'wf_test', name: 'Test' });
    });
  });

  describe('ListWorkflowsQueryHandler', () => {
    let handler: ListWorkflowsQueryHandler;

    beforeEach(() => {
      handler = new ListWorkflowsQueryHandler();
      // Add test data
      handler.updateWorkflow('wf_1', { id: 'wf_1', name: 'Alpha', tags: ['tag1'], createdAt: new Date('2024-01-01') });
      handler.updateWorkflow('wf_2', { id: 'wf_2', name: 'Beta', tags: ['tag2'], createdAt: new Date('2024-01-02') });
      handler.updateWorkflow('wf_3', { id: 'wf_3', name: 'Gamma', tags: ['tag1', 'tag2'], createdAt: new Date('2024-01-03') });
    });

    it('should identify its query type', () => {
      expect(handler.canHandle('ListWorkflows')).toBe(true);
      expect(handler.canHandle('GetWorkflow')).toBe(false);
    });

    it('should list all workflows', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'ListWorkflows',
        parameters: {},
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);
    });

    it('should filter by tags', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'ListWorkflows',
        parameters: { tags: ['tag1'] },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
    });

    it('should search by name', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'ListWorkflows',
        parameters: { search: 'Alpha' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Alpha');
    });

    it('should paginate results', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'ListWorkflows',
        parameters: { limit: 2, offset: 0 },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.totalCount).toBe(3);
    });

    it('should delete workflow', async () => {
      handler.deleteWorkflow('wf_1');

      const result = await handler.handle({
        id: 'q_1',
        type: 'ListWorkflows',
        parameters: {},
        timestamp: new Date(),
      } as any);

      expect(result.data.length).toBe(2);
    });
  });

  describe('GetExecutionQueryHandler', () => {
    let handler: GetExecutionQueryHandler;

    beforeEach(() => {
      handler = new GetExecutionQueryHandler();
    });

    it('should identify its query type', () => {
      expect(handler.canHandle('GetExecution')).toBe(true);
    });

    it('should return not found for non-existent execution', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'GetExecution',
        parameters: { executionId: 'non_existent' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return execution after update', async () => {
      handler.updateExecution('exec_1', { id: 'exec_1', status: 'running' });

      const result = await handler.handle({
        id: 'q_1',
        type: 'GetExecution',
        parameters: { executionId: 'exec_1' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('running');
    });
  });

  describe('ListExecutionsQueryHandler', () => {
    let handler: ListExecutionsQueryHandler;

    beforeEach(() => {
      handler = new ListExecutionsQueryHandler();
      handler.updateExecution('exec_1', { id: 'exec_1', workflowId: 'wf_1', status: 'completed', startedAt: new Date('2024-01-01') });
      handler.updateExecution('exec_2', { id: 'exec_2', workflowId: 'wf_1', status: 'failed', startedAt: new Date('2024-01-02') });
      handler.updateExecution('exec_3', { id: 'exec_3', workflowId: 'wf_2', status: 'running', startedAt: new Date('2024-01-03') });
    });

    it('should identify its query type', () => {
      expect(handler.canHandle('ListExecutions')).toBe(true);
    });

    it('should list all executions', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'ListExecutions',
        parameters: {},
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);
    });

    it('should filter by workflowId', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'ListExecutions',
        parameters: { workflowId: 'wf_1' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
    });

    it('should filter by status', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'ListExecutions',
        parameters: { status: ['completed'] },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
    });

    it('should filter by date range', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'ListExecutions',
        parameters: { fromDate: new Date('2024-01-02') },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
    });
  });

  describe('GetMetricsQueryHandler', () => {
    let handler: GetMetricsQueryHandler;

    beforeEach(() => {
      handler = new GetMetricsQueryHandler();
    });

    it('should identify its query type', () => {
      expect(handler.canHandle('GetMetrics')).toBe(true);
    });

    it('should validate query with missing metricType', async () => {
      const validation = await handler.validate({
        id: 'q_1',
        type: 'GetMetrics',
        parameters: {},
        timestamp: new Date(),
      } as any);

      expect(validation.valid).toBe(false);
    });

    it('should return empty metrics initially', async () => {
      const result = await handler.handle({
        id: 'q_1',
        type: 'GetMetrics',
        parameters: { metricType: 'execution_time' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return metrics after adding', async () => {
      handler.addMetric('wf_1', { type: 'execution_time', value: 100, timestamp: new Date() });
      handler.addMetric('wf_1', { type: 'execution_time', value: 200, timestamp: new Date() });

      const result = await handler.handle({
        id: 'q_1',
        type: 'GetMetrics',
        parameters: { workflowId: 'wf_1', metricType: 'execution_time' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
    });

    it('should return global metrics', async () => {
      handler.addMetric(null, { type: 'total_executions', value: 500, timestamp: new Date() });

      const result = await handler.handle({
        id: 'q_1',
        type: 'GetMetrics',
        parameters: { metricType: 'total_executions' },
        timestamp: new Date(),
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
    });
  });

  describe('QueryBus', () => {
    let bus: QueryBus;

    beforeEach(() => {
      bus = new QueryBus();
    });

    it('should register handlers', () => {
      const handler = new GetWorkflowQueryHandler();
      bus.registerHandler('GetWorkflow', handler);

      expect(bus.getHandlers()).toContain('GetWorkflow');
    });

    it('should return error for unregistered query type', async () => {
      const result = await bus.execute({
        id: 'q_1',
        type: 'UnknownQuery',
        parameters: {},
        timestamp: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No handler registered');
    });

    it('should execute registered handler', async () => {
      const handler = new ListWorkflowsQueryHandler();
      bus.registerHandler('ListWorkflows', handler);

      const result = await bus.execute({
        id: 'q_1',
        type: 'ListWorkflows',
        parameters: {},
        timestamp: new Date(),
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Global queryBus', () => {
    it('should be defined', () => {
      expect(queryBus).toBeDefined();
    });

    it('should have default handlers registered', () => {
      const handlers = queryBus.getHandlers();
      expect(handlers).toContain('GetWorkflow');
      expect(handlers).toContain('ListWorkflows');
      expect(handlers).toContain('GetExecution');
      expect(handlers).toContain('ListExecutions');
      expect(handlers).toContain('GetMetrics');
    });
  });

  describe('Exported handler instances', () => {
    it('should export handler instances', () => {
      expect(getWorkflowHandler).toBeDefined();
      expect(listWorkflowsHandler).toBeDefined();
      expect(getExecutionHandler).toBeDefined();
      expect(listExecutionsHandler).toBeDefined();
      expect(getMetricsHandler).toBeDefined();
    });
  });
});
