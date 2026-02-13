/**
 * AWS S3 API Client
 * Implements object storage operations for AWS S3 using native fetch
 * Uses AWS Signature Version 4 for authentication
 */

import type {
  AWSS3Credentials,
  AWSS3Response,
  S3Object
} from './aws-s3.types';
import { logger } from '../../services/SimpleLogger';

// AWS Signature V4 implementation
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
  return hmacSHA256(`AWS4${key}`, dateStamp)
    .then(kDate => hmacSHA256(kDate, regionName))
    .then(kRegion => hmacSHA256(kRegion, serviceName))
    .then(kService => hmacSHA256(kService, 'aws4_request'));
}

async function hmacSHA256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export class AWSS3Client {
  private credentials: AWSS3Credentials;
  private region: string;
  private service = 's3';

  constructor(credentials: AWSS3Credentials) {
    this.credentials = credentials;
    this.region = credentials.region || 'us-east-1';
  }

  private async signRequest(
    method: string,
    bucket: string,
    key: string,
    headers: Record<string, string>,
    payload: string = ''
  ): Promise<Record<string, string>> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const host = `${bucket}.s3.${this.region}.amazonaws.com`;
    const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
    const canonicalQuerystring = '';

    const payloadHash = await sha256(payload);

    const signedHeaders = {
      ...headers,
      'host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash
    };

    const sortedHeaderKeys = Object.keys(signedHeaders).sort();
    const canonicalHeaders = sortedHeaderKeys
      .map(k => `${k.toLowerCase()}:${signedHeaders[k].trim()}`)
      .join('\n') + '\n';
    const signedHeadersStr = sortedHeaderKeys.map(k => k.toLowerCase()).join(';');

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeadersStr,
      payloadHash
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const canonicalRequestHash = await sha256(canonicalRequest);

    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash
    ].join('\n');

    const signingKey = await getSignatureKey(
      this.credentials.secretAccessKey,
      dateStamp,
      this.region,
      this.service
    );

    const signature = toHex(await hmacSHA256(signingKey, stringToSign));

    const authorizationHeader = `${algorithm} Credential=${this.credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

    return {
      ...signedHeaders,
      'Authorization': authorizationHeader
    };
  }

  async uploadObject(bucket: string, key: string, body: string, contentType: string = 'application/octet-stream'): Promise<AWSS3Response> {
    try {
      const headers = await this.signRequest('PUT', bucket, key, {
        'Content-Type': contentType,
        'Content-Length': String(new TextEncoder().encode(body).length)
      }, body);

      const url = `https://${bucket}.s3.${this.region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('S3 upload failed', { bucket, key, status: response.status, error: errorText });
        return {
          ok: false,
          error: `S3 upload failed: ${response.status} - ${errorText}`
        };
      }

      logger.info('S3 upload successful', { bucket, key });
      return {
        ok: true,
        data: {
          etag: response.headers.get('ETag') || '',
          versionId: response.headers.get('x-amz-version-id') || undefined
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('S3 upload error', { bucket, key, error: message });
      return {
        ok: false,
        error: `S3 upload error: ${message}`
      };
    }
  }

  async downloadObject(bucket: string, key: string): Promise<AWSS3Response<string>> {
    try {
      const headers = await this.signRequest('GET', bucket, key, {});

      const url = `https://${bucket}.s3.${this.region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('S3 download failed', { bucket, key, status: response.status });
        return {
          ok: false,
          error: `S3 download failed: ${response.status} - ${errorText}`
        };
      }

      const data = await response.text();
      logger.info('S3 download successful', { bucket, key, size: data.length });
      return {
        ok: true,
        data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('S3 download error', { bucket, key, error: message });
      return {
        ok: false,
        error: `S3 download error: ${message}`
      };
    }
  }

  async listObjects(bucket: string, prefix?: string, maxKeys: number = 1000): Promise<AWSS3Response<S3Object[]>> {
    try {
      const queryParams = new URLSearchParams({
        'list-type': '2',
        'max-keys': String(maxKeys)
      });
      if (prefix) {
        queryParams.set('prefix', prefix);
      }

      const headers = await this.signRequest('GET', bucket, '', {});
      const url = `https://${bucket}.s3.${this.region}.amazonaws.com/?${queryParams}`;

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('S3 list failed', { bucket, prefix, status: response.status });
        return {
          ok: false,
          error: `S3 list failed: ${response.status} - ${errorText}`
        };
      }

      const xmlText = await response.text();
      const objects = this.parseListObjectsResponse(xmlText);

      logger.info('S3 list successful', { bucket, prefix, count: objects.length });
      return {
        ok: true,
        data: objects
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('S3 list error', { bucket, prefix, error: message });
      return {
        ok: false,
        error: `S3 list error: ${message}`
      };
    }
  }

  private parseListObjectsResponse(xml: string): S3Object[] {
    const objects: S3Object[] = [];
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;

    while ((match = contentRegex.exec(xml)) !== null) {
      const content = match[1];
      const key = this.extractXmlValue(content, 'Key');
      const size = this.extractXmlValue(content, 'Size');
      const lastModified = this.extractXmlValue(content, 'LastModified');
      const etag = this.extractXmlValue(content, 'ETag');
      const storageClass = this.extractXmlValue(content, 'StorageClass');

      if (key) {
        objects.push({
          Key: key,
          LastModified: lastModified ? new Date(lastModified) : undefined,
          Size: size ? parseInt(size, 10) : undefined,
          ETag: etag?.replace(/"/g, '') || undefined
        });
      }
    }

    return objects;
  }

  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  async deleteObject(bucket: string, key: string): Promise<AWSS3Response> {
    try {
      const headers = await this.signRequest('DELETE', bucket, key, {});

      const url = `https://${bucket}.s3.${this.region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        logger.error('S3 delete failed', { bucket, key, status: response.status });
        return {
          ok: false,
          error: `S3 delete failed: ${response.status} - ${errorText}`
        };
      }

      logger.info('S3 delete successful', { bucket, key });
      return {
        ok: true
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('S3 delete error', { bucket, key, error: message });
      return {
        ok: false,
        error: `S3 delete error: ${message}`
      };
    }
  }

  async createBucket(bucket: string): Promise<AWSS3Response> {
    try {
      const locationConstraint = this.region !== 'us-east-1'
        ? `<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><LocationConstraint>${this.region}</LocationConstraint></CreateBucketConfiguration>`
        : '';

      const headers = await this.signRequest('PUT', bucket, '', {
        'Content-Type': 'application/xml'
      }, locationConstraint);

      const url = `https://${bucket}.s3.${this.region}.amazonaws.com/`;

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: locationConstraint || undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('S3 create bucket failed', { bucket, status: response.status });
        return {
          ok: false,
          error: `S3 create bucket failed: ${response.status} - ${errorText}`
        };
      }

      logger.info('S3 bucket created', { bucket, region: this.region });
      return {
        ok: true
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('S3 create bucket error', { bucket, error: message });
      return {
        ok: false,
        error: `S3 create bucket error: ${message}`
      };
    }
  }

  async headObject(bucket: string, key: string): Promise<AWSS3Response<{ exists: boolean; metadata?: Record<string, string> }>> {
    try {
      const headers = await this.signRequest('HEAD', bucket, key, {});

      const url = `https://${bucket}.s3.${this.region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

      const response = await fetch(url, {
        method: 'HEAD',
        headers
      });

      if (response.status === 404) {
        return {
          ok: true,
          data: { exists: false }
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          error: `S3 head failed: ${response.status}`
        };
      }

      const metadata: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        if (key.startsWith('x-amz-meta-')) {
          metadata[key.replace('x-amz-meta-', '')] = value;
        }
      });

      return {
        ok: true,
        data: {
          exists: true,
          metadata
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: `S3 head error: ${message}`
      };
    }
  }

  async copyObject(sourceBucket: string, sourceKey: string, destBucket: string, destKey: string): Promise<AWSS3Response> {
    try {
      const copySource = `${sourceBucket}/${sourceKey}`;
      const headers = await this.signRequest('PUT', destBucket, destKey, {
        'x-amz-copy-source': copySource
      });

      const url = `https://${destBucket}.s3.${this.region}.amazonaws.com/${encodeURIComponent(destKey).replace(/%2F/g, '/')}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('S3 copy failed', { sourceBucket, sourceKey, destBucket, destKey, status: response.status });
        return {
          ok: false,
          error: `S3 copy failed: ${response.status} - ${errorText}`
        };
      }

      logger.info('S3 copy successful', { sourceBucket, sourceKey, destBucket, destKey });
      return {
        ok: true
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('S3 copy error', { sourceBucket, sourceKey, destBucket, destKey, error: message });
      return {
        ok: false,
        error: `S3 copy error: ${message}`
      };
    }
  }

  async getPresignedUrl(bucket: string, key: string, expiresIn: number = 3600, operation: 'GET' | 'PUT' = 'GET'): Promise<AWSS3Response<string>> {
    try {
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.slice(0, 8);

      const host = `${bucket}.s3.${this.region}.amazonaws.com`;
      const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;

      const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
      const credential = `${this.credentials.accessKeyId}/${credentialScope}`;

      const queryParams = new URLSearchParams({
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': credential,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': String(expiresIn),
        'X-Amz-SignedHeaders': 'host'
      });

      const canonicalQuerystring = Array.from(queryParams.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

      const canonicalRequest = [
        operation,
        canonicalUri,
        canonicalQuerystring,
        `host:${host}\n`,
        'host',
        'UNSIGNED-PAYLOAD'
      ].join('\n');

      const canonicalRequestHash = await sha256(canonicalRequest);

      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        canonicalRequestHash
      ].join('\n');

      const signingKey = await getSignatureKey(
        this.credentials.secretAccessKey,
        dateStamp,
        this.region,
        this.service
      );

      const signature = toHex(await hmacSHA256(signingKey, stringToSign));

      const presignedUrl = `https://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

      return {
        ok: true,
        data: presignedUrl
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: `Failed to generate presigned URL: ${message}`
      };
    }
  }
}

export function createAWSS3Client(credentials: AWSS3Credentials): AWSS3Client {
  return new AWSS3Client(credentials);
}
