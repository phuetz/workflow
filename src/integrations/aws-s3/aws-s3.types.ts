/**
 * AWS S3 Integration Types
 * Object storage service
 */

export interface AWSS3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  bucket?: string;
}

export type AWSS3Operation =
  | 'uploadObject'
  | 'downloadObject'
  | 'listObjects'
  | 'deleteObject'
  | 'createBucket';

export interface AWSS3Response<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface S3Object {
  Key: string;
  LastModified?: Date;
  Size?: number;
  ETag?: string;
}
