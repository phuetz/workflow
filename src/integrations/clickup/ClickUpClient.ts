/** ClickUp Client - REST API v2 */
import type {
  ClickUpCredentials,
  ClickUpResponse,
  ClickUpTask,
  ClickUpList,
  ClickUpFolder,
  ClickUpSpace,
  ClickUpComment,
  ClickUpCreateTaskInput,
  ClickUpUpdateTaskInput,
} from './clickup.types';

export function createClickUpClient(credentials: ClickUpCredentials): ClickUpClient {
  return new ClickUpClient(credentials);
}

export class ClickUpClient {
  private readonly baseUrl = 'https://api.clickup.com/api/v2';

  constructor(private readonly credentials: ClickUpCredentials) {}

  private async apiCall<T = any>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<ClickUpResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.credentials.apiToken,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createTask(listId: string, input: ClickUpCreateTaskInput): Promise<ClickUpResponse<ClickUpTask>> {
    return this.apiCall<ClickUpTask>(`/list/${listId}/task`, 'POST', input);
  }

  async updateTask(taskId: string, input: ClickUpUpdateTaskInput): Promise<ClickUpResponse<ClickUpTask>> {
    return this.apiCall<ClickUpTask>(`/task/${taskId}`, 'PUT', input);
  }

  async getTask(taskId: string, includeSubtasks: boolean = false): Promise<ClickUpResponse<ClickUpTask>> {
    const params = includeSubtasks ? '?include_subtasks=true' : '';
    return this.apiCall<ClickUpTask>(`/task/${taskId}${params}`);
  }

  async deleteTask(taskId: string): Promise<ClickUpResponse<void>> {
    return this.apiCall<void>(`/task/${taskId}`, 'DELETE');
  }

  async getTasks(
    listId: string,
    options?: {
      archived?: boolean;
      page?: number;
      order_by?: string;
      reverse?: boolean;
      subtasks?: boolean;
      statuses?: string[];
      assignees?: number[];
      tags?: string[];
    }
  ): Promise<ClickUpResponse<{ tasks: ClickUpTask[] }>> {
    const params = new URLSearchParams();
    if (options) {
      if (options.archived !== undefined) params.append('archived', String(options.archived));
      if (options.page) params.append('page', String(options.page));
      if (options.order_by) params.append('order_by', options.order_by);
      if (options.reverse) params.append('reverse', String(options.reverse));
      if (options.subtasks) params.append('subtasks', String(options.subtasks));
      if (options.statuses) options.statuses.forEach(s => params.append('statuses[]', s));
      if (options.assignees) options.assignees.forEach(a => params.append('assignees[]', String(a)));
      if (options.tags) options.tags.forEach(t => params.append('tags[]', t));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<{ tasks: ClickUpTask[] }>(`/list/${listId}/task${query}`);
  }

  async createList(
    folderId: string,
    name: string,
    content?: string,
    dueDate?: number,
    priority?: number,
    status?: string
  ): Promise<ClickUpResponse<ClickUpList>> {
    const body: any = { name };
    if (content) body.content = content;
    if (dueDate) body.due_date = dueDate;
    if (priority) body.priority = priority;
    if (status) body.status = status;
    return this.apiCall<ClickUpList>(`/folder/${folderId}/list`, 'POST', body);
  }

  async getList(listId: string): Promise<ClickUpResponse<ClickUpList>> {
    return this.apiCall<ClickUpList>(`/list/${listId}`);
  }

  async createFolder(
    spaceId: string,
    name: string
  ): Promise<ClickUpResponse<ClickUpFolder>> {
    return this.apiCall<ClickUpFolder>(`/space/${spaceId}/folder`, 'POST', { name });
  }

  async getFolder(folderId: string): Promise<ClickUpResponse<ClickUpFolder>> {
    return this.apiCall<ClickUpFolder>(`/folder/${folderId}`);
  }

  async createComment(
    taskId: string,
    commentText: string,
    assignee?: number,
    notifyAll: boolean = false
  ): Promise<ClickUpResponse<ClickUpComment>> {
    const body: any = {
      comment_text: commentText,
      notify_all: notifyAll,
    };
    if (assignee) body.assignee = assignee;
    return this.apiCall<ClickUpComment>(`/task/${taskId}/comment`, 'POST', body);
  }

  async getSpaces(teamId?: string): Promise<ClickUpResponse<{ spaces: ClickUpSpace[] }>> {
    const team = teamId || this.credentials.teamId;
    if (!team) {
      return {
        ok: false,
        error: 'Team ID is required. Provide it in credentials or as parameter.',
      };
    }
    return this.apiCall<{ spaces: ClickUpSpace[] }>(`/team/${team}/space`);
  }

  async createSpace(
    teamId: string,
    name: string,
    multipleAssignees: boolean = true,
    features?: any
  ): Promise<ClickUpResponse<ClickUpSpace>> {
    const body: any = {
      name,
      multiple_assignees: multipleAssignees,
    };
    if (features) body.features = features;
    return this.apiCall<ClickUpSpace>(`/team/${teamId}/space`, 'POST', body);
  }
}
