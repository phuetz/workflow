import WorkflowService from '../services/WorkflowService';
import ApiClient from '../services/ApiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workflow } from '../types';

jest.mock('../services/ApiClient');
jest.mock('@react-native-async-storage/async-storage');

const mockWorkflow: Workflow = {
  id: '1',
  name: 'Test Workflow',
  description: 'Test Description',
  active: true,
  nodes: [],
  edges: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  executionCount: 5,
};

describe('WorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkflows', () => {
    it('should fetch workflows from API', async () => {
      (ApiClient.get as jest.Mock).mockResolvedValueOnce([mockWorkflow]);

      const result = await WorkflowService.getWorkflows();

      expect(ApiClient.get).toHaveBeenCalledWith('/workflows');
      expect(result).toEqual([mockWorkflow]);
    });

    it('should cache workflows after fetching', async () => {
      (ApiClient.get as jest.Mock).mockResolvedValueOnce([mockWorkflow]);

      await WorkflowService.getWorkflows();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_workflows',
        JSON.stringify([mockWorkflow])
      );
    });

    it('should return cached workflows on error', async () => {
      (ApiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([mockWorkflow])
      );

      const result = await WorkflowService.getWorkflows();

      expect(result).toEqual([mockWorkflow]);
    });
  });

  describe('getWorkflow', () => {
    it('should fetch single workflow by ID', async () => {
      (ApiClient.get as jest.Mock).mockResolvedValueOnce(mockWorkflow);

      const result = await WorkflowService.getWorkflow('1');

      expect(ApiClient.get).toHaveBeenCalledWith('/workflows/1');
      expect(result).toEqual(mockWorkflow);
    });

    it('should return cached workflow on error', async () => {
      (ApiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([mockWorkflow])
      );

      const result = await WorkflowService.getWorkflow('1');

      expect(result).toEqual(mockWorkflow);
    });
  });

  describe('createWorkflow', () => {
    it('should create new workflow', async () => {
      const newWorkflow = { name: 'New Workflow', active: false };
      (ApiClient.post as jest.Mock).mockResolvedValueOnce(mockWorkflow);

      const result = await WorkflowService.createWorkflow(newWorkflow);

      expect(ApiClient.post).toHaveBeenCalledWith('/workflows', newWorkflow);
      expect(result).toEqual(mockWorkflow);
    });
  });

  describe('updateWorkflow', () => {
    it('should update existing workflow', async () => {
      const updates = { name: 'Updated Name' };
      (ApiClient.put as jest.Mock).mockResolvedValueOnce({
        ...mockWorkflow,
        ...updates,
      });

      const result = await WorkflowService.updateWorkflow('1', updates);

      expect(ApiClient.put).toHaveBeenCalledWith('/workflows/1', updates);
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow', async () => {
      (ApiClient.delete as jest.Mock).mockResolvedValueOnce(undefined);

      await WorkflowService.deleteWorkflow('1');

      expect(ApiClient.delete).toHaveBeenCalledWith('/workflows/1');
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow with data', async () => {
      const executionData = { input: 'test' };
      const mockExecution = {
        id: 'exec-1',
        workflowId: '1',
        workflowName: 'Test Workflow',
        status: 'running' as const,
        startedAt: '2024-01-01T00:00:00Z',
        nodeResults: {},
      };

      (ApiClient.post as jest.Mock).mockResolvedValueOnce(mockExecution);

      const result = await WorkflowService.executeWorkflow('1', executionData);

      expect(ApiClient.post).toHaveBeenCalledWith('/workflows/1/execute', {
        data: executionData,
      });
      expect(result).toEqual(mockExecution);
    });
  });

  describe('searchWorkflows', () => {
    it('should search workflows by query', async () => {
      const query = 'test';
      (ApiClient.get as jest.Mock).mockResolvedValueOnce([mockWorkflow]);

      const result = await WorkflowService.searchWorkflows(query);

      expect(ApiClient.get).toHaveBeenCalledWith(`/workflows/search?q=${query}`);
      expect(result).toEqual([mockWorkflow]);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      await WorkflowService.clearCache();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'cached_workflows',
        'cached_executions',
      ]);
    });
  });
});
