/**
 * Google Drive Integration Types
 * Cloud storage for files and folders
 */

export interface GoogleDriveCredentials {
  accessToken: string;
  refreshToken?: string;
}

export type GoogleDriveOperation =
  | 'uploadFile'
  | 'downloadFile'
  | 'createFolder'
  | 'listFiles'
  | 'shareFile'
  | 'deleteFile';

export interface GoogleDriveResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface GoogleDriveFile {
  id?: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
}

export interface GoogleDriveFileList {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}
