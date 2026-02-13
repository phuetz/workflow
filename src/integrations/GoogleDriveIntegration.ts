/**
 * Google Drive Integration Service
 * Complete Google Drive API v3 integration for n8n parity
 */

import { logger } from '../services/SimpleLogger';
import { integrationRateLimiter } from '../backend/security/RateLimitService';

export interface GoogleDriveCredentials {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  expiresAt?: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  shared?: boolean;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  permissions?: DrivePermission[];
}

export interface DriveFolder extends DriveFile {
  mimeType: 'application/vnd.google-apps.folder';
}

export interface DrivePermission {
  id?: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  domain?: string;
  allowFileDiscovery?: boolean;
}

export interface DriveListOptions {
  q?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  fields?: string;
  spaces?: 'drive' | 'appDataFolder' | 'photos';
  corpora?: 'user' | 'domain' | 'drive' | 'allDrives';
  includeItemsFromAllDrives?: boolean;
  supportsAllDrives?: boolean;
}

export interface DriveUploadOptions {
  name: string;
  mimeType?: string;
  parents?: string[];
  description?: string;
  properties?: Record<string, string>;
  appProperties?: Record<string, string>;
}

export interface DriveExportFormat {
  'application/vnd.google-apps.document': 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'text/plain' | 'text/html' | 'application/rtf' | 'application/epub+zip';
  'application/vnd.google-apps.spreadsheet': 'application/pdf' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' | 'text/csv' | 'text/tab-separated-values';
  'application/vnd.google-apps.presentation': 'application/pdf' | 'application/vnd.openxmlformats-officedocument.presentationml.presentation' | 'text/plain';
  'application/vnd.google-apps.drawing': 'application/pdf' | 'image/svg+xml' | 'image/png' | 'image/jpeg';
}

export class GoogleDriveIntegration {
  private credentials: GoogleDriveCredentials;
  private baseUrl = 'https://www.googleapis.com/drive/v3';
  private uploadUrl = 'https://www.googleapis.com/upload/drive/v3';

  constructor(credentials: GoogleDriveCredentials) {
    this.credentials = credentials;
    logger.info('GoogleDriveIntegration initialized');
  }

  // === FILE OPERATIONS ===

  /**
   * List files
   */
  async listFiles(options: DriveListOptions = {}): Promise<{
    files: DriveFile[];
    nextPageToken?: string;
  }> {
    await this.checkRateLimit('google_drive');

    const params = new URLSearchParams();
    if (options.q) params.append('q', options.q);
    if (options.pageSize) params.append('pageSize', String(options.pageSize));
    if (options.pageToken) params.append('pageToken', options.pageToken);
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.fields) params.append('fields', options.fields);
    if (options.spaces) params.append('spaces', options.spaces);
    if (options.corpora) params.append('corpora', options.corpora);
    if (options.includeItemsFromAllDrives) params.append('includeItemsFromAllDrives', 'true');
    if (options.supportsAllDrives) params.append('supportsAllDrives', 'true');

    // Default fields if not specified
    if (!options.fields) {
      params.append('fields', 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, shared)');
    }

    const response = await this.apiCall<{ files: DriveFile[]; nextPageToken?: string }>(
      'GET',
      `/files?${params.toString()}`
    );

    logger.debug('Google Drive files listed', { count: response.files.length });
    return response;
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string, fields?: string): Promise<DriveFile> {
    await this.checkRateLimit('google_drive');

    const params = new URLSearchParams();
    params.append('fields', fields || 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, shared, owners, permissions');
    params.append('supportsAllDrives', 'true');

    return this.apiCall<DriveFile>('GET', `/files/${fileId}?${params.toString()}`);
  }

  /**
   * Download file content
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    await this.checkRateLimit('google_drive');

    const response = await fetch(`${this.baseUrl}/files/${fileId}?alt=media&supportsAllDrives=true`, {
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Export Google Docs/Sheets/Slides to different formats
   */
  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    await this.checkRateLimit('google_drive');

    const response = await fetch(`${this.baseUrl}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`, {
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to export file: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Upload a file
   */
  async uploadFile(content: Buffer | string, options: DriveUploadOptions): Promise<DriveFile> {
    await this.checkRateLimit('google_drive');

    // Simple upload for files < 5MB
    const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;

    if (contentBuffer.length < 5 * 1024 * 1024) {
      return this.simpleUpload(contentBuffer, options);
    }

    // Resumable upload for larger files
    return this.resumableUpload(contentBuffer, options);
  }

  /**
   * Create a folder
   */
  async createFolder(name: string, parentId?: string): Promise<DriveFolder> {
    await this.checkRateLimit('google_drive');

    const metadata: Record<string, unknown> = {
      name,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentId) {
      metadata.parents = [parentId];
    }

    const folder = await this.apiCall<DriveFolder>('POST', '/files?supportsAllDrives=true', metadata);

    logger.info('Google Drive folder created', { name, id: folder.id });
    return folder;
  }

  /**
   * Update file metadata
   */
  async updateFile(fileId: string, metadata: {
    name?: string;
    description?: string;
    properties?: Record<string, string>;
    addParents?: string;
    removeParents?: string;
  }): Promise<DriveFile> {
    await this.checkRateLimit('google_drive');

    const params = new URLSearchParams();
    params.append('supportsAllDrives', 'true');
    if (metadata.addParents) params.append('addParents', metadata.addParents);
    if (metadata.removeParents) params.append('removeParents', metadata.removeParents);

    const body: Record<string, unknown> = {};
    if (metadata.name) body.name = metadata.name;
    if (metadata.description) body.description = metadata.description;
    if (metadata.properties) body.properties = metadata.properties;

    return this.apiCall<DriveFile>('PATCH', `/files/${fileId}?${params.toString()}`, body);
  }

  /**
   * Copy a file
   */
  async copyFile(fileId: string, options?: {
    name?: string;
    parents?: string[];
  }): Promise<DriveFile> {
    await this.checkRateLimit('google_drive');

    const body: Record<string, unknown> = {};
    if (options?.name) body.name = options.name;
    if (options?.parents) body.parents = options.parents;

    const copy = await this.apiCall<DriveFile>(
      'POST',
      `/files/${fileId}/copy?supportsAllDrives=true`,
      body
    );

    logger.debug('Google Drive file copied', { sourceId: fileId, copyId: copy.id });
    return copy;
  }

  /**
   * Move a file to a different folder
   */
  async moveFile(fileId: string, newParentId: string, oldParentId?: string): Promise<DriveFile> {
    const params = new URLSearchParams();
    params.append('addParents', newParentId);
    if (oldParentId) params.append('removeParents', oldParentId);
    params.append('supportsAllDrives', 'true');

    return this.apiCall<DriveFile>('PATCH', `/files/${fileId}?${params.toString()}`);
  }

  /**
   * Delete a file (move to trash)
   */
  async trashFile(fileId: string): Promise<DriveFile> {
    await this.checkRateLimit('google_drive');

    return this.apiCall<DriveFile>('PATCH', `/files/${fileId}?supportsAllDrives=true`, {
      trashed: true
    });
  }

  /**
   * Permanently delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.checkRateLimit('google_drive');

    await this.apiCall('DELETE', `/files/${fileId}?supportsAllDrives=true`);
    logger.info('Google Drive file deleted', { fileId });
  }

  /**
   * Empty trash
   */
  async emptyTrash(): Promise<void> {
    await this.checkRateLimit('google_drive');

    await this.apiCall('DELETE', '/files/trash');
    logger.info('Google Drive trash emptied');
  }

  // === PERMISSION OPERATIONS ===

  /**
   * List permissions
   */
  async listPermissions(fileId: string): Promise<DrivePermission[]> {
    await this.checkRateLimit('google_drive');

    const response = await this.apiCall<{ permissions: DrivePermission[] }>(
      'GET',
      `/files/${fileId}/permissions?supportsAllDrives=true&fields=permissions(id,type,role,emailAddress,domain)`
    );

    return response.permissions;
  }

  /**
   * Create a permission (share)
   */
  async createPermission(fileId: string, permission: DrivePermission, options?: {
    sendNotificationEmail?: boolean;
    emailMessage?: string;
    transferOwnership?: boolean;
  }): Promise<DrivePermission> {
    await this.checkRateLimit('google_drive');

    const params = new URLSearchParams();
    params.append('supportsAllDrives', 'true');
    if (options?.sendNotificationEmail !== undefined) {
      params.append('sendNotificationEmail', String(options.sendNotificationEmail));
    }
    if (options?.emailMessage) {
      params.append('emailMessage', options.emailMessage);
    }
    if (options?.transferOwnership) {
      params.append('transferOwnership', 'true');
    }

    const created = await this.apiCall<DrivePermission>(
      'POST',
      `/files/${fileId}/permissions?${params.toString()}`,
      permission
    );

    logger.debug('Google Drive permission created', { fileId, type: permission.type, role: permission.role });
    return created;
  }

  /**
   * Update a permission
   */
  async updatePermission(fileId: string, permissionId: string, role: DrivePermission['role']): Promise<DrivePermission> {
    await this.checkRateLimit('google_drive');

    return this.apiCall<DrivePermission>(
      'PATCH',
      `/files/${fileId}/permissions/${permissionId}?supportsAllDrives=true`,
      { role }
    );
  }

  /**
   * Delete a permission (unshare)
   */
  async deletePermission(fileId: string, permissionId: string): Promise<void> {
    await this.checkRateLimit('google_drive');

    await this.apiCall('DELETE', `/files/${fileId}/permissions/${permissionId}?supportsAllDrives=true`);
    logger.debug('Google Drive permission deleted', { fileId, permissionId });
  }

  // === SEARCH OPERATIONS ===

  /**
   * Search files by name
   */
  async searchByName(name: string, options?: { exactMatch?: boolean; inFolder?: string }): Promise<DriveFile[]> {
    const query = options?.exactMatch
      ? `name = '${this.escapeQuery(name)}'`
      : `name contains '${this.escapeQuery(name)}'`;

    const fullQuery = options?.inFolder
      ? `${query} and '${options.inFolder}' in parents`
      : query;

    const result = await this.listFiles({ q: fullQuery });
    return result.files;
  }

  /**
   * Search files by type
   */
  async searchByType(mimeType: string, folderId?: string): Promise<DriveFile[]> {
    let query = `mimeType = '${mimeType}'`;
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const result = await this.listFiles({ q: query });
    return result.files;
  }

  /**
   * Get files in a folder
   */
  async getFilesInFolder(folderId: string, options?: { recursive?: boolean }): Promise<DriveFile[]> {
    const result = await this.listFiles({
      q: `'${folderId}' in parents and trashed = false`
    });

    if (options?.recursive) {
      const folders = result.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      for (const folder of folders) {
        const subFiles = await this.getFilesInFolder(folder.id, { recursive: true });
        result.files.push(...subFiles);
      }
    }

    return result.files;
  }

  /**
   * Get recent files
   */
  async getRecentFiles(limit = 10): Promise<DriveFile[]> {
    const result = await this.listFiles({
      pageSize: limit,
      orderBy: 'modifiedTime desc',
      q: 'trashed = false'
    });

    return result.files;
  }

  /**
   * Get starred files
   */
  async getStarredFiles(): Promise<DriveFile[]> {
    const result = await this.listFiles({
      q: 'starred = true and trashed = false'
    });

    return result.files;
  }

  // === UTILITY METHODS ===

  /**
   * Get storage quota
   */
  async getStorageQuota(): Promise<{
    limit: string;
    usage: string;
    usageInDrive: string;
    usageInDriveTrash: string;
  }> {
    await this.checkRateLimit('google_drive');

    const response = await this.apiCall<{
      storageQuota: {
        limit: string;
        usage: string;
        usageInDrive: string;
        usageInDriveTrash: string;
      };
    }>('GET', '/about?fields=storageQuota');

    return response.storageQuota;
  }

  /**
   * Generate shareable link
   */
  async generateShareableLink(fileId: string, role: DrivePermission['role'] = 'reader'): Promise<string> {
    // First make it accessible via link
    await this.createPermission(fileId, {
      type: 'anyone',
      role
    });

    // Get the file to retrieve the webViewLink
    const file = await this.getFile(fileId, 'webViewLink');
    return file.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ ok: boolean; email: string }> {
    const response = await this.apiCall<{ user: { emailAddress: string } }>(
      'GET',
      '/about?fields=user(emailAddress)'
    );

    return { ok: true, email: response.user.emailAddress };
  }

  // Private methods

  private async simpleUpload(content: Buffer, options: DriveUploadOptions): Promise<DriveFile> {
    const metadata = {
      name: options.name,
      mimeType: options.mimeType,
      parents: options.parents,
      description: options.description,
      properties: options.properties,
      appProperties: options.appProperties
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = Buffer.concat([
      Buffer.from(delimiter),
      Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
      Buffer.from(JSON.stringify(metadata)),
      Buffer.from(delimiter),
      Buffer.from(`Content-Type: ${options.mimeType || 'application/octet-stream'}\r\n\r\n`),
      content,
      Buffer.from(closeDelimiter)
    ]);

    const response = await fetch(`${this.uploadUrl}/files?uploadType=multipart&supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${JSON.stringify(error)}`);
    }

    const file = await response.json() as DriveFile;
    logger.info('Google Drive file uploaded', { name: options.name, id: file.id });
    return file;
  }

  private async resumableUpload(content: Buffer, options: DriveUploadOptions): Promise<DriveFile> {
    // Initialize resumable upload
    const initResponse = await fetch(`${this.uploadUrl}/files?uploadType=resumable&supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': options.mimeType || 'application/octet-stream',
        'X-Upload-Content-Length': String(content.length)
      },
      body: JSON.stringify({
        name: options.name,
        mimeType: options.mimeType,
        parents: options.parents,
        description: options.description
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Failed to initialize upload: ${initResponse.status}`);
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL in response');
    }

    // Upload content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': options.mimeType || 'application/octet-stream',
        'Content-Length': String(content.length)
      },
      body: new Uint8Array(content)
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const file = await uploadResponse.json() as DriveFile;
    logger.info('Google Drive file uploaded (resumable)', { name: options.name, id: file.id });
    return file;
  }

  private async apiCall<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.credentials.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      logger.error('Google Drive API error', { method, endpoint, status: response.status, error });
      throw new Error(`Google Drive API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private escapeQuery(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const result = await integrationRateLimiter.checkIntegrationLimit(
      endpoint,
      'google-drive-integration'
    );

    if (!result.allowed) {
      const waitTime = result.retryAfter || 1;
      logger.warn('Google Drive rate limit hit, waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
  }
}

// Factory function
export function createGoogleDriveIntegration(credentials: GoogleDriveCredentials): GoogleDriveIntegration {
  return new GoogleDriveIntegration(credentials);
}

export default GoogleDriveIntegration;
