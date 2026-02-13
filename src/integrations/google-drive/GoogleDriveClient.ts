/**
 * Google Drive API Client
 * Implements file operations for Google Drive API v3
 */

import type {
  GoogleDriveCredentials,
  GoogleDriveResponse,
  GoogleDriveFile,
  GoogleDriveFileList
} from './google-drive.types';

export class GoogleDriveClient {
  private credentials: GoogleDriveCredentials;
  private baseUrl = 'https://www.googleapis.com/drive/v3';

  constructor(credentials: GoogleDriveCredentials) {
    this.credentials = credentials;
  }

  async uploadFile(file: { name: string; content: string; mimeType?: string; parents?: string[] }): Promise<GoogleDriveResponse<GoogleDriveFile>> {
    const metadata = {
      name: file.name,
      mimeType: file.mimeType,
      parents: file.parents
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([file.content], { type: file.mimeType || 'text/plain' }));

    return this.apiCall('/files?uploadType=multipart', 'POST', form, true);
  }

  async downloadFile(fileId: string): Promise<GoogleDriveResponse<Blob>> {
    return this.apiCall(`/files/${fileId}?alt=media`, 'GET');
  }

  async createFolder(name: string, parents?: string[]): Promise<GoogleDriveResponse<GoogleDriveFile>> {
    return this.apiCall('/files', 'POST', {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents
    });
  }

  async listFiles(params?: { q?: string; pageSize?: number; pageToken?: string }): Promise<GoogleDriveResponse<GoogleDriveFileList>> {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.pageToken) query.append('pageToken', params.pageToken);

    return this.apiCall(`/files?${query.toString()}`, 'GET');
  }

  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<GoogleDriveResponse> {
    return this.apiCall(`/files/${fileId}/permissions`, 'POST', {
      type: 'user',
      role,
      emailAddress: email
    });
  }

  async deleteFile(fileId: string): Promise<GoogleDriveResponse> {
    return this.apiCall(`/files/${fileId}`, 'DELETE');
  }

  private async apiCall<T = unknown>(
    endpoint: string,
    method: string,
    body?: unknown,
    isMultipart = false
  ): Promise<GoogleDriveResponse<T>> {
    if (!this.credentials.accessToken) {
      return { ok: false, error: 'Missing access token' };
    }

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
      };

      if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? (isMultipart ? body as FormData : JSON.stringify(body)) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: error.error?.message || `Google Drive API error: ${response.status}`
        };
      }

      const data = method !== 'DELETE' && response.status !== 204
        ? await response.json()
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

export function createGoogleDriveClient(credentials: GoogleDriveCredentials): GoogleDriveClient {
  return new GoogleDriveClient(credentials);
}
