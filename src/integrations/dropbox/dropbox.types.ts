/**
 * Dropbox Integration Types
 * Cloud storage for files and folders
 */

export interface DropboxCredentials {
  accessToken: string;
}

export type DropboxOperation =
  | 'uploadFile'
  | 'downloadFile'
  | 'createFolder'
  | 'listFolder'
  | 'shareFile'
  | 'deleteFile';

export interface DropboxResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface DropboxFile {
  '.tag': 'file' | 'folder';
  name: string;
  path_lower?: string;
  path_display?: string;
  id: string;
  client_modified?: string;
  server_modified?: string;
  size?: number;
}
