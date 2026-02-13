/**
 * OneDrive Integration Types
 * Microsoft cloud storage
 */

export interface OneDriveCredentials {
  accessToken: string;
}

export type OneDriveOperation =
  | 'uploadFile'
  | 'downloadFile'
  | 'createFolder'
  | 'listFiles'
  | 'shareFile'
  | 'deleteFile';

export interface OneDriveResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface OneDriveItem {
  id: string;
  name: string;
  size?: number;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  webUrl?: string;
  folder?: Record<string, unknown>;
  file?: Record<string, unknown>;
}
