/** Confluence Client - REST API v2 (Cloud) */
import type {
  ConfluenceCredentials,
  ConfluenceResponse,
  ConfluencePage,
  ConfluenceSpace,
  ConfluenceComment,
  ConfluenceSearchResponse,
  ConfluenceCreatePageInput,
  ConfluenceUpdatePageInput,
  ConfluenceCreateSpaceInput,
} from './confluence.types';

export function createConfluenceClient(credentials: ConfluenceCredentials): ConfluenceClient {
  return new ConfluenceClient(credentials);
}

export class ConfluenceClient {
  private readonly baseUrl: string;

  constructor(private readonly credentials: ConfluenceCredentials) {
    // Support both full URLs and domain-only
    this.baseUrl = credentials.domain.startsWith('http')
      ? `${credentials.domain}/wiki/api/v2`
      : `https://${credentials.domain}/wiki/api/v2`;
  }

  private async apiCall<T = any>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<ConfluenceResponse<T>> {
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

      // DELETE operations may return 204 No Content
      if (method === 'DELETE' && response.status === 204) {
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

  async createPage(input: ConfluenceCreatePageInput): Promise<ConfluenceResponse<ConfluencePage>> {
    return this.apiCall<ConfluencePage>('/pages', 'POST', input);
  }

  async updatePage(input: ConfluenceUpdatePageInput): Promise<ConfluenceResponse<ConfluencePage>> {
    const { id, ...updateData } = input;
    return this.apiCall<ConfluencePage>(`/pages/${id}`, 'PUT', updateData);
  }

  async getPage(
    pageId: string,
    includeBody: boolean = true,
    includeVersion: boolean = true
  ): Promise<ConfluenceResponse<ConfluencePage>> {
    const params = new URLSearchParams();
    if (includeBody) params.append('body-format', 'storage');
    if (includeVersion) params.append('include-version', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<ConfluencePage>(`/pages/${pageId}${query}`);
  }

  async deletePage(pageId: string, purge: boolean = false): Promise<ConfluenceResponse<void>> {
    const params = purge ? '?purge=true' : '';
    return this.apiCall<void>(`/pages/${pageId}${params}`, 'DELETE');
  }

  async searchContent(
    cql: string,
    limit: number = 25,
    cursor?: string
  ): Promise<ConfluenceResponse<ConfluenceSearchResponse>> {
    const params = new URLSearchParams();
    params.append('cql', cql);
    params.append('limit', String(limit));
    if (cursor) params.append('cursor', cursor);
    return this.apiCall<ConfluenceSearchResponse>(`/pages?${params.toString()}`);
  }

  async createBlogPost(
    spaceId: string,
    title: string,
    body: { representation: 'storage' | 'atlas_doc_format'; value: string },
    status: 'current' | 'draft' = 'current'
  ): Promise<ConfluenceResponse<ConfluencePage>> {
    const input = {
      spaceId,
      status,
      title,
      body,
    };
    return this.apiCall<ConfluencePage>('/blogposts', 'POST', input);
  }

  async addComment(
    pageId: string,
    body: { representation: 'storage' | 'atlas_doc_format'; value: string },
    status: 'current' | 'draft' = 'current'
  ): Promise<ConfluenceResponse<ConfluenceComment>> {
    const input = {
      pageId,
      status,
      body,
    };
    return this.apiCall<ConfluenceComment>(`/pages/${pageId}/footer-comments`, 'POST', input);
  }

  async getComments(
    pageId: string,
    location: 'inline' | 'footer' | 'resolved' = 'footer',
    limit: number = 25,
    cursor?: string
  ): Promise<ConfluenceResponse<{ results: ConfluenceComment[] }>> {
    const params = new URLSearchParams();
    params.append('body-format', 'storage');
    params.append('limit', String(limit));
    if (cursor) params.append('cursor', cursor);
    return this.apiCall<{ results: ConfluenceComment[] }>(
      `/pages/${pageId}/${location}-comments?${params.toString()}`
    );
  }

  async getSpaces(
    type?: 'global' | 'personal',
    status?: 'current' | 'archived',
    limit: number = 25,
    cursor?: string
  ): Promise<ConfluenceResponse<{ results: ConfluenceSpace[] }>> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (status) params.append('status', status);
    params.append('limit', String(limit));
    if (cursor) params.append('cursor', cursor);
    return this.apiCall<{ results: ConfluenceSpace[] }>(`/spaces?${params.toString()}`);
  }

  async createSpace(input: ConfluenceCreateSpaceInput): Promise<ConfluenceResponse<ConfluenceSpace>> {
    return this.apiCall<ConfluenceSpace>('/spaces', 'POST', input);
  }

  async getSpace(spaceId: string): Promise<ConfluenceResponse<ConfluenceSpace>> {
    return this.apiCall<ConfluenceSpace>(`/spaces/${spaceId}`);
  }
}
