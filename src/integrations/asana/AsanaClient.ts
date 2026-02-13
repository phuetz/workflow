/**
 * Asana API Client
 * REST API v1.0
 */

import type { AsanaCredentials, AsanaResponse, AsanaTask, AsanaProject, AsanaComment } from './asana.types';

export function createAsanaClient(credentials: AsanaCredentials) {
  return new AsanaClient(credentials);
}

export class AsanaClient {
  private baseUrl = 'https://app.asana.com/api/1.0';

  constructor(private credentials: AsanaCredentials) {}

  private async apiCall<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<AsanaResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify({ data: body }) : undefined
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { ok: false, error: error.errors?.[0]?.message || `HTTP ${response.status}` };
      }

      const result = await response.json();
      return { ok: true, data: result.data };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async createTask(task: { name: string; notes?: string; projects?: string[]; assignee?: string; due_on?: string; workspace?: string }): Promise<AsanaResponse<AsanaTask>> {
    return this.apiCall<AsanaTask>('/tasks', 'POST', { ...task, workspace: task.workspace || this.credentials.workspaceGid });
  }

  async updateTask(taskGid: string, updates: Partial<AsanaTask>): Promise<AsanaResponse<AsanaTask>> {
    return this.apiCall<AsanaTask>(`/tasks/${taskGid}`, 'PUT', updates);
  }

  async getTask(taskGid: string): Promise<AsanaResponse<AsanaTask>> {
    return this.apiCall<AsanaTask>(`/tasks/${taskGid}?opt_fields=name,notes,completed,assignee,due_on,projects,tags,custom_fields`);
  }

  async deleteTask(taskGid: string): Promise<AsanaResponse<{}>> {
    return this.apiCall<{}>(`/tasks/${taskGid}`, 'DELETE');
  }

  async searchTasks(params: { project?: string; section?: string; assignee?: string; workspace?: string; completed_since?: string }): Promise<AsanaResponse<AsanaTask[]>> {
    const queryParams = new URLSearchParams(params as any);
    return this.apiCall<AsanaTask[]>(`/tasks?${queryParams}`);
  }

  async createProject(project: { name: string; notes?: string; workspace?: string; team?: string; color?: string }): Promise<AsanaResponse<AsanaProject>> {
    return this.apiCall<AsanaProject>('/projects', 'POST', { ...project, workspace: project.workspace || this.credentials.workspaceGid });
  }

  async getProject(projectGid: string): Promise<AsanaResponse<AsanaProject>> {
    return this.apiCall<AsanaProject>(`/projects/${projectGid}`);
  }

  async updateProject(projectGid: string, updates: Partial<AsanaProject>): Promise<AsanaResponse<AsanaProject>> {
    return this.apiCall<AsanaProject>(`/projects/${projectGid}`, 'PUT', updates);
  }

  async addComment(taskGid: string, text: string): Promise<AsanaResponse<AsanaComment>> {
    return this.apiCall<AsanaComment>(`/tasks/${taskGid}/stories`, 'POST', { text });
  }

  async getTags(workspace?: string): Promise<AsanaResponse<any[]>> {
    return this.apiCall<any[]>(`/workspaces/${workspace || this.credentials.workspaceGid}/tags`);
  }

  async getUsers(workspace?: string): Promise<AsanaResponse<any[]>> {
    return this.apiCall<any[]>(`/workspaces/${workspace || this.credentials.workspaceGid}/users`);
  }

  async getTeams(organization?: string): Promise<AsanaResponse<any[]>> {
    return this.apiCall<any[]>(`/organizations/${organization || this.credentials.workspaceGid}/teams`);
  }
}
