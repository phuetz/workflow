/**
 * OneDrive API Client
 * Implements file operations for Microsoft Graph OneDrive API
 */

import type {
  OneDriveCredentials,
  OneDriveResponse,
  OneDriveItem
} from './onedrive.types';

export class OneDriveClient {
  private credentials: OneDriveCredentials;
  private baseUrl = 'https://graph.microsoft.com/v1.0/me/drive';

  constructor(credentials: OneDriveCredentials) {
    this.credentials = credentials;
  }

  async uploadFile(path: string, content: string): Promise<OneDriveResponse<OneDriveItem>> {
    return this.apiCall(`/root:${path}:/content`, 'PUT', content, {
      'Content-Type': 'text/plain'
    });
  }

  async downloadFile(itemId: string): Promise<OneDriveResponse<Blob>> {
    return this.apiCall(`/items/${itemId}/content`, 'GET');
  }

  async createFolder(name: string, parentPath = '/'): Promise<OneDriveResponse<OneDriveItem>> {
    return this.apiCall(`/root:${parentPath}:/children`, 'POST', {
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    });
  }

  async listFiles(path = '/'): Promise<OneDriveResponse<{ value: OneDriveItem[] }>> {
    return this.apiCall(`/root:${path}:/children`, 'GET');
  }

  async shareFile(itemId: string, type: 'view' | 'edit' = 'view'): Promise<OneDriveResponse<{ link: { webUrl: string } }>> {
    return this.apiCall(`/items/${itemId}/createLink`, 'POST', {
      type,
      scope: 'anonymous'
    });
  }

  async deleteFile(itemId: string): Promise<OneDriveResponse> {
    return this.apiCall(`/items/${itemId}`, 'DELETE');
  }

  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown,
    customHeaders?: Record<string, string>
  ): Promise<OneDriveResponse<T>> {
    if (!this.credentials.accessToken) {
      return { ok: false, error: 'Missing access token' };
    }

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        ...customHeaders
      };

      if (!customHeaders && method !== 'GET' && method !== 'DELETE') {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.error?.message || `OneDrive API error: ${response.status}`
        };
      }

      const data = method !== 'DELETE' && response.status !== 204
        ? await response.json().catch(() => ({}))
        : {};

      return { ok: true, data: data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }
}

export function createOneDriveClient(credentials: OneDriveCredentials): OneDriveClient {
  return new OneDriveClient(credentials);
}
