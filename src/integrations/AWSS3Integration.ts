/**
 * AWS S3 Integration Service
 * Complete S3 API integration for n8n parity
 */

import { logger } from '../services/SimpleLogger';
import { integrationRateLimiter } from '../backend/security/RateLimitService';
import * as crypto from 'crypto';

export interface AWSS3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
  endpoint?: string; // For S3-compatible storage (MinIO, DigitalOcean Spaces, etc.)
}

export interface S3Object {
  Key: string;
  Size: number;
  LastModified: Date;
  ETag: string;
  StorageClass?: string;
  Owner?: { ID: string; DisplayName: string };
}

export interface S3Bucket {
  Name: string;
  CreationDate: Date;
}

export interface S3UploadOptions {
  Bucket: string;
  Key: string;
  Body: Buffer | string | ReadableStream;
  ContentType?: string;
  ContentEncoding?: string;
  ContentDisposition?: string;
  CacheControl?: string;
  Metadata?: Record<string, string>;
  ACL?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
  StorageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
  ServerSideEncryption?: 'AES256' | 'aws:kms';
  SSEKMSKeyId?: string;
  Tagging?: string;
}

export interface S3CopyOptions {
  SourceBucket: string;
  SourceKey: string;
  DestBucket: string;
  DestKey: string;
  ACL?: string;
  MetadataDirective?: 'COPY' | 'REPLACE';
  Metadata?: Record<string, string>;
}

export interface S3ListOptions {
  Bucket: string;
  Prefix?: string;
  Delimiter?: string;
  MaxKeys?: number;
  ContinuationToken?: string;
  StartAfter?: string;
}

export interface S3GetSignedUrlOptions {
  Bucket: string;
  Key: string;
  Expires?: number; // seconds
  ResponseContentType?: string;
  ResponseContentDisposition?: string;
}

export class AWSS3Integration {
  private credentials: AWSS3Credentials;
  private service = 's3';

  constructor(credentials: AWSS3Credentials) {
    this.credentials = credentials;
    logger.info('AWSS3Integration initialized', { region: credentials.region });
  }

  // === BUCKET OPERATIONS ===

  /**
   * List all buckets
   */
  async listBuckets(): Promise<S3Bucket[]> {
    await this.checkRateLimit('aws_s3');

    const response = await this.signedRequest({
      method: 'GET',
      path: '/',
      headers: {}
    });

    // Parse XML response
    const xml = await response.text();
    const buckets = this.parseListBucketsResponse(xml);

    logger.debug('S3 buckets listed', { count: buckets.length });
    return buckets;
  }

  /**
   * Create a bucket
   */
  async createBucket(bucketName: string, options?: {
    ACL?: string;
    LocationConstraint?: string;
  }): Promise<void> {
    await this.checkRateLimit('aws_s3');

    let body = '';
    if (options?.LocationConstraint && options.LocationConstraint !== 'us-east-1') {
      body = `<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <LocationConstraint>${options.LocationConstraint}</LocationConstraint>
      </CreateBucketConfiguration>`;
    }

    const headers: Record<string, string> = {};
    if (options?.ACL) headers['x-amz-acl'] = options.ACL;

    await this.signedRequest({
      method: 'PUT',
      bucket: bucketName,
      path: '/',
      headers,
      body
    });

    logger.info('S3 bucket created', { bucketName });
  }

  /**
   * Delete a bucket (must be empty)
   */
  async deleteBucket(bucketName: string): Promise<void> {
    await this.checkRateLimit('aws_s3');

    await this.signedRequest({
      method: 'DELETE',
      bucket: bucketName,
      path: '/',
      headers: {}
    });

    logger.info('S3 bucket deleted', { bucketName });
  }

  /**
   * Check if bucket exists
   */
  async bucketExists(bucketName: string): Promise<boolean> {
    try {
      await this.signedRequest({
        method: 'HEAD',
        bucket: bucketName,
        path: '/',
        headers: {}
      });
      return true;
    } catch {
      return false;
    }
  }

  // === OBJECT OPERATIONS ===

  /**
   * List objects in a bucket
   */
  async listObjects(options: S3ListOptions): Promise<{
    objects: S3Object[];
    prefixes: string[];
    isTruncated: boolean;
    nextContinuationToken?: string;
  }> {
    await this.checkRateLimit('aws_s3:get');

    const queryParams = new URLSearchParams({ 'list-type': '2' });
    if (options.Prefix) queryParams.append('prefix', options.Prefix);
    if (options.Delimiter) queryParams.append('delimiter', options.Delimiter);
    if (options.MaxKeys) queryParams.append('max-keys', String(options.MaxKeys));
    if (options.ContinuationToken) queryParams.append('continuation-token', options.ContinuationToken);
    if (options.StartAfter) queryParams.append('start-after', options.StartAfter);

    const response = await this.signedRequest({
      method: 'GET',
      bucket: options.Bucket,
      path: `/?${queryParams.toString()}`,
      headers: {}
    });

    const xml = await response.text();
    return this.parseListObjectsResponse(xml);
  }

  /**
   * Get an object
   */
  async getObject(bucket: string, key: string, options?: {
    Range?: string;
    IfModifiedSince?: Date;
    IfNoneMatch?: string;
  }): Promise<{ Body: Buffer; ContentType: string; ContentLength: number; ETag: string; LastModified: Date; Metadata: Record<string, string> }> {
    await this.checkRateLimit('aws_s3:get');

    const headers: Record<string, string> = {};
    if (options?.Range) headers['Range'] = options.Range;
    if (options?.IfModifiedSince) headers['If-Modified-Since'] = options.IfModifiedSince.toUTCString();
    if (options?.IfNoneMatch) headers['If-None-Match'] = options.IfNoneMatch;

    const response = await this.signedRequest({
      method: 'GET',
      bucket,
      path: `/${encodeURIComponent(key)}`,
      headers
    });

    const body = Buffer.from(await response.arrayBuffer());
    const metadata: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      if (key.startsWith('x-amz-meta-')) {
        metadata[key.replace('x-amz-meta-', '')] = value;
      }
    });

    return {
      Body: body,
      ContentType: response.headers.get('content-type') || 'application/octet-stream',
      ContentLength: parseInt(response.headers.get('content-length') || '0'),
      ETag: response.headers.get('etag') || '',
      LastModified: new Date(response.headers.get('last-modified') || ''),
      Metadata: metadata
    };
  }

  /**
   * Upload an object
   */
  async putObject(options: S3UploadOptions): Promise<{ ETag: string; VersionId?: string }> {
    await this.checkRateLimit('aws_s3');

    const headers: Record<string, string> = {};
    if (options.ContentType) headers['Content-Type'] = options.ContentType;
    if (options.ContentEncoding) headers['Content-Encoding'] = options.ContentEncoding;
    if (options.ContentDisposition) headers['Content-Disposition'] = options.ContentDisposition;
    if (options.CacheControl) headers['Cache-Control'] = options.CacheControl;
    if (options.ACL) headers['x-amz-acl'] = options.ACL;
    if (options.StorageClass) headers['x-amz-storage-class'] = options.StorageClass;
    if (options.ServerSideEncryption) headers['x-amz-server-side-encryption'] = options.ServerSideEncryption;
    if (options.SSEKMSKeyId) headers['x-amz-server-side-encryption-aws-kms-key-id'] = options.SSEKMSKeyId;
    if (options.Tagging) headers['x-amz-tagging'] = options.Tagging;

    if (options.Metadata) {
      for (const [key, value] of Object.entries(options.Metadata)) {
        headers[`x-amz-meta-${key}`] = value;
      }
    }

    const body = typeof options.Body === 'string' ? options.Body : options.Body;

    const response = await this.signedRequest({
      method: 'PUT',
      bucket: options.Bucket,
      path: `/${encodeURIComponent(options.Key)}`,
      headers,
      body
    });

    logger.debug('S3 object uploaded', { bucket: options.Bucket, key: options.Key });

    return {
      ETag: response.headers.get('etag') || '',
      VersionId: response.headers.get('x-amz-version-id') || undefined
    };
  }

  /**
   * Delete an object
   */
  async deleteObject(bucket: string, key: string, versionId?: string): Promise<void> {
    await this.checkRateLimit('aws_s3');

    const path = versionId
      ? `/${encodeURIComponent(key)}?versionId=${versionId}`
      : `/${encodeURIComponent(key)}`;

    await this.signedRequest({
      method: 'DELETE',
      bucket,
      path,
      headers: {}
    });

    logger.debug('S3 object deleted', { bucket, key });
  }

  /**
   * Delete multiple objects
   */
  async deleteObjects(bucket: string, keys: string[]): Promise<{ Deleted: string[]; Errors: Array<{ Key: string; Code: string; Message: string }> }> {
    await this.checkRateLimit('aws_s3');

    const body = `<?xml version="1.0" encoding="UTF-8"?>
      <Delete>
        ${keys.map(key => `<Object><Key>${this.escapeXml(key)}</Key></Object>`).join('')}
      </Delete>`;

    const contentMD5 = crypto.createHash('md5').update(body).digest('base64');

    const response = await this.signedRequest({
      method: 'POST',
      bucket,
      path: '/?delete',
      headers: {
        'Content-MD5': contentMD5,
        'Content-Type': 'application/xml'
      },
      body
    });

    const xml = await response.text();
    return this.parseDeleteObjectsResponse(xml);
  }

  /**
   * Copy an object
   */
  async copyObject(options: S3CopyOptions): Promise<{ ETag: string }> {
    await this.checkRateLimit('aws_s3');

    const headers: Record<string, string> = {
      'x-amz-copy-source': `/${options.SourceBucket}/${encodeURIComponent(options.SourceKey)}`
    };

    if (options.ACL) headers['x-amz-acl'] = options.ACL;
    if (options.MetadataDirective) headers['x-amz-metadata-directive'] = options.MetadataDirective;

    if (options.Metadata && options.MetadataDirective === 'REPLACE') {
      for (const [key, value] of Object.entries(options.Metadata)) {
        headers[`x-amz-meta-${key}`] = value;
      }
    }

    const response = await this.signedRequest({
      method: 'PUT',
      bucket: options.DestBucket,
      path: `/${encodeURIComponent(options.DestKey)}`,
      headers
    });

    const xml = await response.text();
    const etag = xml.match(/<ETag>"?([^"<]+)"?<\/ETag>/)?.[1] || '';

    logger.debug('S3 object copied', {
      from: `${options.SourceBucket}/${options.SourceKey}`,
      to: `${options.DestBucket}/${options.DestKey}`
    });

    return { ETag: etag };
  }

  /**
   * Get object metadata (HEAD request)
   */
  async headObject(bucket: string, key: string): Promise<{
    ContentType: string;
    ContentLength: number;
    ETag: string;
    LastModified: Date;
    Metadata: Record<string, string>;
  }> {
    await this.checkRateLimit('aws_s3:get');

    const response = await this.signedRequest({
      method: 'HEAD',
      bucket,
      path: `/${encodeURIComponent(key)}`,
      headers: {}
    });

    const metadata: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (key.startsWith('x-amz-meta-')) {
        metadata[key.replace('x-amz-meta-', '')] = value;
      }
    });

    return {
      ContentType: response.headers.get('content-type') || 'application/octet-stream',
      ContentLength: parseInt(response.headers.get('content-length') || '0'),
      ETag: response.headers.get('etag') || '',
      LastModified: new Date(response.headers.get('last-modified') || ''),
      Metadata: metadata
    };
  }

  /**
   * Generate a pre-signed URL for GET
   */
  getSignedUrl(options: S3GetSignedUrlOptions): string {
    const expires = options.Expires || 3600;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const host = this.getHost(options.Bucket);
    const credentialScope = `${dateStamp}/${this.credentials.region}/${this.service}/aws4_request`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.credentials.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expires),
      'X-Amz-SignedHeaders': 'host'
    };

    if (options.ResponseContentType) {
      queryParams['response-content-type'] = options.ResponseContentType;
    }
    if (options.ResponseContentDisposition) {
      queryParams['response-content-disposition'] = options.ResponseContentDisposition;
    }
    if (this.credentials.sessionToken) {
      queryParams['X-Amz-Security-Token'] = this.credentials.sessionToken;
    }

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');

    const canonicalRequest = [
      'GET',
      `/${encodeURIComponent(options.Key)}`,
      canonicalQueryString,
      `host:${host}`,
      '',
      'host',
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signature = this.getSignature(dateStamp, stringToSign);

    const protocol = this.credentials.endpoint ? (this.credentials.endpoint.startsWith('https') ? 'https' : 'http') : 'https';
    return `${protocol}://${host}/${encodeURIComponent(options.Key)}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  /**
   * Generate a pre-signed URL for PUT (upload)
   */
  getSignedUploadUrl(bucket: string, key: string, options?: {
    Expires?: number;
    ContentType?: string;
  }): string {
    const expires = options?.Expires || 3600;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const host = this.getHost(bucket);
    const credentialScope = `${dateStamp}/${this.credentials.region}/${this.service}/aws4_request`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.credentials.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expires),
      'X-Amz-SignedHeaders': 'host'
    };

    if (this.credentials.sessionToken) {
      queryParams['X-Amz-Security-Token'] = this.credentials.sessionToken;
    }

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalRequest = [
      'PUT',
      `/${encodeURIComponent(key)}`,
      canonicalQueryString,
      `host:${host}`,
      '',
      'host',
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signature = this.getSignature(dateStamp, stringToSign);

    const protocol = this.credentials.endpoint ? (this.credentials.endpoint.startsWith('https') ? 'https' : 'http') : 'https';
    return `${protocol}://${host}/${encodeURIComponent(key)}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ ok: boolean; buckets: number }> {
    const buckets = await this.listBuckets();
    return { ok: true, buckets: buckets.length };
  }

  // Private methods

  private getHost(bucket?: string): string {
    if (this.credentials.endpoint) {
      const url = new URL(this.credentials.endpoint);
      return bucket ? `${bucket}.${url.host}` : url.host;
    }
    return bucket
      ? `${bucket}.s3.${this.credentials.region}.amazonaws.com`
      : `s3.${this.credentials.region}.amazonaws.com`;
  }

  private async signedRequest(params: {
    method: string;
    bucket?: string;
    path: string;
    headers: Record<string, string>;
    body?: string | Buffer | ReadableStream;
  }): Promise<Response> {
    const host = this.getHost(params.bucket);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const headers: Record<string, string> = {
      ...params.headers,
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': params.body
        ? crypto.createHash('sha256').update(params.body as string | Buffer).digest('hex')
        : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // Empty string hash
    };

    if (this.credentials.sessionToken) {
      headers['x-amz-security-token'] = this.credentials.sessionToken;
    }

    const signedHeaders = Object.keys(headers)
      .map(k => k.toLowerCase())
      .sort()
      .join(';');

    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(k => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join('\n');

    const canonicalRequest = [
      params.method,
      params.path,
      '',
      canonicalHeaders,
      '',
      signedHeaders,
      headers['x-amz-content-sha256']
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.credentials.region}/${this.service}/aws4_request`;

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signature = this.getSignature(dateStamp, stringToSign);

    headers['Authorization'] = [
      `AWS4-HMAC-SHA256 Credential=${this.credentials.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`
    ].join(', ');

    const protocol = this.credentials.endpoint
      ? (this.credentials.endpoint.startsWith('https') ? 'https' : 'http')
      : 'https';

    const url = `${protocol}://${host}${params.path}`;

    const response = await fetch(url, {
      method: params.method,
      headers,
      body: params.body as BodyInit | undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('S3 API error', { status: response.status, error: errorText });
      throw new Error(`S3 API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  private getSignature(dateStamp: string, stringToSign: string): string {
    const kDate = crypto.createHmac('sha256', `AWS4${this.credentials.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.credentials.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(this.service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  }

  private parseListBucketsResponse(xml: string): S3Bucket[] {
    const buckets: S3Bucket[] = [];
    const bucketRegex = /<Bucket><Name>([^<]+)<\/Name><CreationDate>([^<]+)<\/CreationDate><\/Bucket>/g;
    let match;
    while ((match = bucketRegex.exec(xml)) !== null) {
      buckets.push({
        Name: match[1],
        CreationDate: new Date(match[2])
      });
    }
    return buckets;
  }

  private parseListObjectsResponse(xml: string): {
    objects: S3Object[];
    prefixes: string[];
    isTruncated: boolean;
    nextContinuationToken?: string;
  } {
    const objects: S3Object[] = [];
    const prefixes: string[] = [];

    const objectRegex = /<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<LastModified>([^<]+)<\/LastModified>[\s\S]*?<ETag>"?([^"<]+)"?<\/ETag>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g;
    let match;
    while ((match = objectRegex.exec(xml)) !== null) {
      objects.push({
        Key: match[1],
        LastModified: new Date(match[2]),
        ETag: match[3],
        Size: parseInt(match[4])
      });
    }

    const prefixRegex = /<CommonPrefixes><Prefix>([^<]+)<\/Prefix><\/CommonPrefixes>/g;
    while ((match = prefixRegex.exec(xml)) !== null) {
      prefixes.push(match[1]);
    }

    const isTruncated = xml.includes('<IsTruncated>true</IsTruncated>');
    const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);

    return {
      objects,
      prefixes,
      isTruncated,
      nextContinuationToken: tokenMatch?.[1]
    };
  }

  private parseDeleteObjectsResponse(xml: string): {
    Deleted: string[];
    Errors: Array<{ Key: string; Code: string; Message: string }>;
  } {
    const deleted: string[] = [];
    const errors: Array<{ Key: string; Code: string; Message: string }> = [];

    const deletedRegex = /<Deleted><Key>([^<]+)<\/Key><\/Deleted>/g;
    let match;
    while ((match = deletedRegex.exec(xml)) !== null) {
      deleted.push(match[1]);
    }

    const errorRegex = /<Error><Key>([^<]+)<\/Key><Code>([^<]+)<\/Code><Message>([^<]+)<\/Message><\/Error>/g;
    while ((match = errorRegex.exec(xml)) !== null) {
      errors.push({ Key: match[1], Code: match[2], Message: match[3] });
    }

    return { Deleted: deleted, Errors: errors };
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const result = await integrationRateLimiter.checkIntegrationLimit(
      endpoint,
      'aws-s3-integration'
    );

    if (!result.allowed) {
      const waitTime = result.retryAfter || 1;
      logger.warn('S3 rate limit hit, waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
  }
}

// Factory function
export function createAWSS3Integration(credentials: AWSS3Credentials): AWSS3Integration {
  return new AWSS3Integration(credentials);
}

export default AWSS3Integration;
