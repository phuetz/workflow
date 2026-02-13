/** Jira Client - REST API v3 */
import type {
  JiraCredentials,
  JiraResponse,
  JiraIssue,
  JiraProject,
  JiraComment,
  JiraTransition,
  JiraSearchRequest,
  JiraSearchResponse,
  JiraCreateIssueInput,
  JiraUpdateIssueInput,
} from './jira.types';

export function createJiraClient(credentials: JiraCredentials): JiraClient {
  return new JiraClient(credentials);
}

export class JiraClient {
  private readonly baseUrl: string;

  constructor(private readonly credentials: JiraCredentials) {
    // Support both full URLs and domain-only
    this.baseUrl = credentials.domain.startsWith('http')
      ? `${credentials.domain}/rest/api/3`
      : `https://${credentials.domain}/rest/api/3`;
  }

  private async apiCall<T = any>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<JiraResponse<T>> {
    try {
      const auth = btoa(`${this.credentials.email}:${this.credentials.apiToken}`);

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
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

      // Many operations return 204 No Content (DELETE, PUT, etc.)
      if (response.status === 204) {
        return { ok: true, data: undefined as T };
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

  async createIssue(input: JiraCreateIssueInput): Promise<JiraResponse<JiraIssue>> {
    return this.apiCall<JiraIssue>('/issue', 'POST', input);
  }

  async updateIssue(issueIdOrKey: string, input: JiraUpdateIssueInput): Promise<JiraResponse<void>> {
    return this.apiCall<void>(`/issue/${issueIdOrKey}`, 'PUT', input);
  }

  async getIssue(
    issueIdOrKey: string,
    fields?: string[],
    expand?: string[]
  ): Promise<JiraResponse<JiraIssue>> {
    const params = new URLSearchParams();
    if (fields && fields.length > 0) params.append('fields', fields.join(','));
    if (expand && expand.length > 0) params.append('expand', expand.join(','));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<JiraIssue>(`/issue/${issueIdOrKey}${query}`);
  }

  async deleteIssue(issueIdOrKey: string, deleteSubtasks: boolean = false): Promise<JiraResponse<void>> {
    const params = deleteSubtasks ? '?deleteSubtasks=true' : '';
    return this.apiCall<void>(`/issue/${issueIdOrKey}${params}`, 'DELETE');
  }

  async searchIssues(request: JiraSearchRequest): Promise<JiraResponse<JiraSearchResponse>> {
    const params = new URLSearchParams();
    params.append('jql', request.jql);
    if (request.startAt !== undefined) params.append('startAt', String(request.startAt));
    if (request.maxResults !== undefined) params.append('maxResults', String(request.maxResults));
    if (request.fields && request.fields.length > 0) params.append('fields', request.fields.join(','));
    if (request.expand && request.expand.length > 0) params.append('expand', request.expand.join(','));

    return this.apiCall<JiraSearchResponse>(`/search?${params.toString()}`);
  }

  async addComment(
    issueIdOrKey: string,
    body: any,
    visibility?: { type: string; value: string }
  ): Promise<JiraResponse<JiraComment>> {
    const payload: any = { body };
    if (visibility) payload.visibility = visibility;
    return this.apiCall<JiraComment>(`/issue/${issueIdOrKey}/comment`, 'POST', payload);
  }

  async getComments(
    issueIdOrKey: string,
    startAt?: number,
    maxResults?: number
  ): Promise<JiraResponse<{ comments: JiraComment[]; startAt: number; maxResults: number; total: number }>> {
    const params = new URLSearchParams();
    if (startAt !== undefined) params.append('startAt', String(startAt));
    if (maxResults !== undefined) params.append('maxResults', String(maxResults));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall(`/issue/${issueIdOrKey}/comment${query}`);
  }

  async getTransitions(issueIdOrKey: string): Promise<JiraResponse<{ transitions: JiraTransition[] }>> {
    return this.apiCall<{ transitions: JiraTransition[] }>(`/issue/${issueIdOrKey}/transitions`);
  }

  async transitionIssue(
    issueIdOrKey: string,
    transitionId: string,
    fields?: any,
    comment?: string
  ): Promise<JiraResponse<void>> {
    const body: any = {
      transition: { id: transitionId },
    };
    if (fields) body.fields = fields;
    if (comment) {
      body.update = {
        comment: [{ add: { body: comment } }],
      };
    }
    return this.apiCall<void>(`/issue/${issueIdOrKey}/transitions`, 'POST', body);
  }

  async assignIssue(issueIdOrKey: string, accountId: string | null): Promise<JiraResponse<void>> {
    const body = accountId ? { accountId } : { accountId: null };
    return this.apiCall<void>(`/issue/${issueIdOrKey}/assignee`, 'PUT', body);
  }

  async getProjects(
    startAt?: number,
    maxResults?: number
  ): Promise<JiraResponse<{ values: JiraProject[]; startAt: number; maxResults: number; total: number }>> {
    const params = new URLSearchParams();
    if (startAt !== undefined) params.append('startAt', String(startAt));
    if (maxResults !== undefined) params.append('maxResults', String(maxResults));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<{ values: JiraProject[]; startAt: number; maxResults: number; total: number }>(`/project/search${query}`);
  }

  async createProject(
    key: string,
    name: string,
    projectTypeKey: string,
    projectTemplateKey?: string,
    description?: string,
    leadAccountId?: string
  ): Promise<JiraResponse<JiraProject>> {
    const body: any = {
      key,
      name,
      projectTypeKey,
    };
    if (projectTemplateKey) body.projectTemplateKey = projectTemplateKey;
    if (description) body.description = description;
    if (leadAccountId) body.leadAccountId = leadAccountId;
    return this.apiCall<JiraProject>('/project', 'POST', body);
  }
}
