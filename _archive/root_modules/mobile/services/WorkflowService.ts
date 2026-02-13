import ApiClient from './ApiClient';
import { Workflow, Execution } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKFLOWS_CACHE_KEY = 'cached_workflows';
const EXECUTIONS_CACHE_KEY = 'cached_executions';

class WorkflowService {
  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    try {
      const workflows = await ApiClient.get<Workflow[]>('/workflows');
      await this.cacheWorkflows(workflows);
      return workflows;
    } catch (error) {
      console.error('Error fetching workflows:', error);
      // Return cached data if offline
      return this.getCachedWorkflows();
    }
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const workflow = await ApiClient.get<Workflow>(`/workflows/${id}`);
      await this.cacheWorkflow(workflow);
      return workflow;
    } catch (error) {
      console.error('Error fetching workflow:', error);
      // Try to get from cache
      const cached = await this.getCachedWorkflow(id);
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    return ApiClient.post<Workflow>('/workflows', workflow);
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    return ApiClient.put<Workflow>(`/workflows/${id}`, updates);
  }

  async deleteWorkflow(id: string): Promise<void> {
    await ApiClient.delete(`/workflows/${id}`);
    await this.removeCachedWorkflow(id);
  }

  async toggleWorkflow(id: string, active: boolean): Promise<Workflow> {
    return ApiClient.patch<Workflow>(`/workflows/${id}/toggle`, { active });
  }

  // Executions
  async executeWorkflow(id: string, data?: Record<string, unknown>): Promise<Execution> {
    return ApiClient.post<Execution>(`/workflows/${id}/execute`, { data });
  }

  async getExecutions(workflowId?: string): Promise<Execution[]> {
    try {
      const url = workflowId ? `/executions?workflowId=${workflowId}` : '/executions';
      const executions = await ApiClient.get<Execution[]>(url);
      await this.cacheExecutions(executions);
      return executions;
    } catch (error) {
      console.error('Error fetching executions:', error);
      return this.getCachedExecutions();
    }
  }

  async getExecution(id: string): Promise<Execution> {
    try {
      const execution = await ApiClient.get<Execution>(`/executions/${id}`);
      await this.cacheExecution(execution);
      return execution;
    } catch (error) {
      console.error('Error fetching execution:', error);
      const cached = await this.getCachedExecution(id);
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  async cancelExecution(id: string): Promise<void> {
    await ApiClient.post(`/executions/${id}/cancel`);
  }

  async retryExecution(id: string): Promise<Execution> {
    return ApiClient.post<Execution>(`/executions/${id}/retry`);
  }

  async deleteExecution(id: string): Promise<void> {
    await ApiClient.delete(`/executions/${id}`);
    await this.removeCachedExecution(id);
  }

  // Search and filter
  async searchWorkflows(query: string): Promise<Workflow[]> {
    return ApiClient.get<Workflow[]>(`/workflows/search?q=${encodeURIComponent(query)}`);
  }

  async filterWorkflows(filters: {
    active?: boolean;
    tags?: string[];
    search?: string;
  }): Promise<Workflow[]> {
    const params = new URLSearchParams();
    if (filters.active !== undefined) {
      params.append('active', String(filters.active));
    }
    if (filters.tags && filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    return ApiClient.get<Workflow[]>(`/workflows?${params.toString()}`);
  }

  // Cache management
  private async cacheWorkflows(workflows: Workflow[]): Promise<void> {
    try {
      await AsyncStorage.setItem(WORKFLOWS_CACHE_KEY, JSON.stringify(workflows));
    } catch (error) {
      console.error('Error caching workflows:', error);
    }
  }

  private async cacheWorkflow(workflow: Workflow): Promise<void> {
    try {
      const cached = await this.getCachedWorkflows();
      const index = cached.findIndex((w) => w.id === workflow.id);
      if (index >= 0) {
        cached[index] = workflow;
      } else {
        cached.push(workflow);
      }
      await this.cacheWorkflows(cached);
    } catch (error) {
      console.error('Error caching workflow:', error);
    }
  }

  private async getCachedWorkflows(): Promise<Workflow[]> {
    try {
      const cached = await AsyncStorage.getItem(WORKFLOWS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached workflows:', error);
      return [];
    }
  }

  private async getCachedWorkflow(id: string): Promise<Workflow | null> {
    const cached = await this.getCachedWorkflows();
    return cached.find((w) => w.id === id) || null;
  }

  private async removeCachedWorkflow(id: string): Promise<void> {
    const cached = await this.getCachedWorkflows();
    const filtered = cached.filter((w) => w.id !== id);
    await this.cacheWorkflows(filtered);
  }

  private async cacheExecutions(executions: Execution[]): Promise<void> {
    try {
      await AsyncStorage.setItem(EXECUTIONS_CACHE_KEY, JSON.stringify(executions));
    } catch (error) {
      console.error('Error caching executions:', error);
    }
  }

  private async cacheExecution(execution: Execution): Promise<void> {
    try {
      const cached = await this.getCachedExecutions();
      const index = cached.findIndex((e) => e.id === execution.id);
      if (index >= 0) {
        cached[index] = execution;
      } else {
        cached.unshift(execution);
      }
      // Keep only last 100 executions
      const trimmed = cached.slice(0, 100);
      await this.cacheExecutions(trimmed);
    } catch (error) {
      console.error('Error caching execution:', error);
    }
  }

  private async getCachedExecutions(): Promise<Execution[]> {
    try {
      const cached = await AsyncStorage.getItem(EXECUTIONS_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached executions:', error);
      return [];
    }
  }

  private async getCachedExecution(id: string): Promise<Execution | null> {
    const cached = await this.getCachedExecutions();
    return cached.find((e) => e.id === id) || null;
  }

  private async removeCachedExecution(id: string): Promise<void> {
    const cached = await this.getCachedExecutions();
    const filtered = cached.filter((e) => e.id !== id);
    await this.cacheExecutions(filtered);
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.multiRemove([WORKFLOWS_CACHE_KEY, EXECUTIONS_CACHE_KEY]);
  }
}

export default new WorkflowService();
