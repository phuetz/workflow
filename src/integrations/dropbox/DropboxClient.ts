/**
 * Dropbox API Client
 * Implements file operations for Dropbox API v2
 */

import type {
  DropboxCredentials,
  DropboxResponse,
  DropboxFile
} from './dropbox.types';

export class DropboxClient {
  private credentials: DropboxCredentials;
  private baseUrl = 'https://api.dropboxapi.com/2';
  private contentUrl = 'https://content.dropboxapi.com/2';

  constructor(credentials: DropboxCredentials) {
    this.credentials = credentials;
  }

  async uploadFile(path: string, content: string): Promise<DropboxResponse<DropboxFile>> {
    return this.apiCall('/files/upload', 'POST', content, {
      'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true })
    }, true);
  }

  async downloadFile(path: string): Promise<DropboxResponse<Blob>> {
    return this.apiCall('/files/download', 'POST', null, {
      'Dropbox-API-Arg': JSON.stringify({ path })
    }, true);
  }

  async createFolder(path: string): Promise<DropboxResponse<DropboxFile>> {
    return this.apiCall('/files/create_folder_v2', 'POST', { path });
  }

  async listFolder(path: string): Promise<DropboxResponse<{ entries: DropboxFile[] }>> {
    return this.apiCall('/files/list_folder', 'POST', { path });
  }

  async shareFile(path: string): Promise<DropboxResponse<{ url: string }>> {
    return this.apiCall('/sharing/create_shared_link_with_settings', 'POST', { path });
  }

  async deleteFile(path: string): Promise<DropboxResponse<DropboxFile>> {
    return this.apiCall('/files/delete_v2', 'POST', { path });
  }

  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown,
    customHeaders?: Record<string, string>,
    isContent = false
  ): Promise<DropboxResponse<T>> {
    if (!this.credentials.accessToken) {
      return { ok: false, error: 'Missing access token' };
    }

    try {
      const baseUrl = isContent ? this.contentUrl : this.baseUrl;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        ...customHeaders
      };

      if (!isContent && !customHeaders) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.error_summary || `Dropbox API error: ${response.status}`
        };
      }

      const data = await response.json().catch(() => ({}));
      return { ok: true, data: data as T };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }
}

export function createDropboxClient(credentials: DropboxCredentials): DropboxClient {
  return new DropboxClient(credentials);
}
