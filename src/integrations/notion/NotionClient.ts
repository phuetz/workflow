/**
 * Notion API Client
 * Official Notion API v1 integration
 */

import type {
  NotionCredentials,
  NotionResponse,
  NotionPage,
  NotionDatabase,
  NotionBlock,
  NotionDatabaseQuery,
  NotionSearchParameters,
  NotionPaginatedList
} from './notion.types';

export function createNotionClient(credentials: NotionCredentials) {
  return new NotionClient(credentials);
}

export class NotionClient {
  private baseUrl = 'https://api.notion.com/v1';
  private version = '2022-06-28'; // Notion API version

  constructor(private credentials: NotionCredentials) {}

  /**
   * Make API request
   */
  private async apiCall<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<NotionResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.credentials.token}`,
          'Content-Type': 'application/json',
          'Notion-Version': this.version
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { ok: true, data: {} as T };
      }

      const data = await response.json();
      return { ok: true, data };

    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a page
   */
  async createPage(data: {
    parent: { database_id: string } | { page_id: string };
    properties: Record<string, any>;
    children?: any[];
    icon?: any;
    cover?: any;
  }): Promise<NotionResponse<NotionPage>> {
    return this.apiCall<NotionPage>('/pages', 'POST', data);
  }

  /**
   * Update a page
   */
  async updatePage(data: {
    page_id: string;
    properties?: Record<string, any>;
    archived?: boolean;
    icon?: any;
    cover?: any;
  }): Promise<NotionResponse<NotionPage>> {
    const { page_id, ...updateData } = data;
    return this.apiCall<NotionPage>(`/pages/${page_id}`, 'PATCH', updateData);
  }

  /**
   * Get a page
   */
  async getPage(data: {
    page_id: string;
    filter_properties?: string[];
  }): Promise<NotionResponse<NotionPage>> {
    const { page_id, filter_properties } = data;
    const query = filter_properties
      ? `?filter_properties=${filter_properties.join(',')}`
      : '';
    return this.apiCall<NotionPage>(`/pages/${page_id}${query}`);
  }

  /**
   * Archive a page (delete)
   */
  async archivePage(data: {
    page_id: string;
  }): Promise<NotionResponse<NotionPage>> {
    return this.updatePage({
      page_id: data.page_id,
      archived: true
    });
  }

  /**
   * Query a database
   */
  async queryDatabase(data: NotionDatabaseQuery): Promise<NotionResponse<NotionPaginatedList<NotionPage>>> {
    const { database_id, ...queryData } = data;
    return this.apiCall<NotionPaginatedList<NotionPage>>(
      `/databases/${database_id}/query`,
      'POST',
      queryData
    );
  }

  /**
   * Create a database
   */
  async createDatabase(data: {
    parent: { page_id: string };
    title: Array<{ type: 'text'; text: { content: string } }>;
    properties: Record<string, any>;
    is_inline?: boolean;
    icon?: any;
    cover?: any;
  }): Promise<NotionResponse<NotionDatabase>> {
    return this.apiCall<NotionDatabase>('/databases', 'POST', data);
  }

  /**
   * Update a database
   */
  async updateDatabase(data: {
    database_id: string;
    title?: Array<{ type: 'text'; text: { content: string } }>;
    description?: Array<{ type: 'text'; text: { content: string } }>;
    properties?: Record<string, any>;
    icon?: any;
    cover?: any;
  }): Promise<NotionResponse<NotionDatabase>> {
    const { database_id, ...updateData } = data;
    return this.apiCall<NotionDatabase>(`/databases/${database_id}`, 'PATCH', updateData);
  }

  /**
   * Get a database
   */
  async getDatabase(data: {
    database_id: string;
  }): Promise<NotionResponse<NotionDatabase>> {
    return this.apiCall<NotionDatabase>(`/databases/${data.database_id}`);
  }

  /**
   * Append block children
   */
  async appendBlockChildren(data: {
    block_id: string;
    children: any[];
    after?: string;
  }): Promise<NotionResponse<{ results: NotionBlock[] }>> {
    const { block_id, ...blockData } = data;
    return this.apiCall<{ results: NotionBlock[] }>(
      `/blocks/${block_id}/children`,
      'PATCH',
      blockData
    );
  }

  /**
   * Get a block
   */
  async getBlock(data: {
    block_id: string;
  }): Promise<NotionResponse<NotionBlock>> {
    return this.apiCall<NotionBlock>(`/blocks/${data.block_id}`);
  }

  /**
   * Get block children
   */
  async getBlockChildren(data: {
    block_id: string;
    start_cursor?: string;
    page_size?: number;
  }): Promise<NotionResponse<NotionPaginatedList<NotionBlock>>> {
    const { block_id, start_cursor, page_size } = data;
    const params = new URLSearchParams();
    if (start_cursor) params.set('start_cursor', start_cursor);
    if (page_size) params.set('page_size', String(page_size));

    const query = params.toString() ? `?${params}` : '';
    return this.apiCall<NotionPaginatedList<NotionBlock>>(`/blocks/${block_id}/children${query}`);
  }

  /**
   * Search
   */
  async search(data: NotionSearchParameters = {}): Promise<NotionResponse<NotionPaginatedList<NotionPage | NotionDatabase>>> {
    return this.apiCall<NotionPaginatedList<NotionPage | NotionDatabase>>(
      '/search',
      'POST',
      data
    );
  }

  /**
   * Get user
   */
  async getUser(data: {
    user_id: string;
  }): Promise<NotionResponse<any>> {
    return this.apiCall(`/users/${data.user_id}`);
  }

  /**
   * List all users
   */
  async listUsers(data: {
    start_cursor?: string;
    page_size?: number;
  } = {}): Promise<NotionResponse<NotionPaginatedList<any>>> {
    const params = new URLSearchParams();
    if (data.start_cursor) params.set('start_cursor', data.start_cursor);
    if (data.page_size) params.set('page_size', String(data.page_size));

    const query = params.toString() ? `?${params}` : '';
    return this.apiCall<NotionPaginatedList<any>>(`/users${query}`);
  }

  /**
   * Helper: Create simple text page
   */
  async createTextPage(data: {
    parent_id: string;
    title: string;
    content?: string;
  }): Promise<NotionResponse<NotionPage>> {
    const children = data.content
      ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: data.content }
                }
              ]
            }
          }
        ]
      : [];

    return this.createPage({
      parent: { page_id: data.parent_id },
      properties: {
        title: {
          title: [
            {
              type: 'text',
              text: { content: data.title }
            }
          ]
        }
      },
      children
    });
  }

  /**
   * Helper: Query database with simple filter
   */
  async queryDatabaseSimple(data: {
    database_id: string;
    property: string;
    value: string | number | boolean;
    operator?: 'equals' | 'contains' | 'starts_with' | 'ends_with';
  }): Promise<NotionResponse<NotionPaginatedList<NotionPage>>> {
    const operator = data.operator || 'equals';

    return this.queryDatabase({
      database_id: data.database_id,
      filter: {
        property: data.property,
        [typeof data.value === 'string' ? 'rich_text' : typeof data.value === 'number' ? 'number' : 'checkbox']: {
          [operator]: data.value
        }
      }
    });
  }
}
