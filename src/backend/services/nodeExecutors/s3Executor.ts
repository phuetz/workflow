/**
 * S3 Node Executor
 * Real integration with AWS S3 via @aws-sdk/client-s3
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { logger } from '../../../services/SimpleLogger';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const s3Executor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    const accessKeyId = credentials.accessKeyId || credentials.awsAccessKeyId;
    const secretAccessKey = credentials.secretAccessKey || credentials.awsSecretAccessKey;
    const region = credentials.region || config.region || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are required (accessKeyId, secretAccessKey)');
    }

    const bucket = config.bucket as string;
    const key = config.key as string;
    const operation = (config.operation || 'getObject') as string;

    if (!bucket) throw new Error('S3 bucket is required');

    const {
      S3Client,
      GetObjectCommand,
      PutObjectCommand,
      DeleteObjectCommand,
      ListObjectsV2Command,
    } = await import('@aws-sdk/client-s3');

    const client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    logger.info('Executing S3 operation', { operation, bucket });

    try {
      let result: any;

      switch (operation) {
        case 'getObject': {
          if (!key) throw new Error('Object key is required for getObject');
          const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
          const bodyBytes = await response.Body?.transformToByteArray();

          if (bodyBytes) {
            // Store to temp file for binary data reference
            const id = crypto.randomUUID();
            const tmpDir = path.join(os.tmpdir(), 'workflow-binary', context.executionId);
            fs.mkdirSync(tmpDir, { recursive: true });
            const tmpPath = path.join(tmpDir, id);
            fs.writeFileSync(tmpPath, bodyBytes);

            result = {
              contentType: response.ContentType,
              contentLength: response.ContentLength,
              lastModified: response.LastModified?.toISOString(),
              eTag: response.ETag,
            };

            return {
              success: true,
              data: result,
              binaryData: [{
                id,
                fileName: key.split('/').pop() || key,
                mimeType: response.ContentType || 'application/octet-stream',
                size: bodyBytes.length,
                storagePath: tmpPath,
              }],
              timestamp: new Date().toISOString(),
            };
          }

          result = {
            contentType: response.ContentType,
            contentLength: response.ContentLength,
          };
          break;
        }

        case 'putObject': {
          if (!key) throw new Error('Object key is required for putObject');
          const body = config.body || context.input?.body;
          const contentType = (config.contentType || 'application/octet-stream') as string;

          await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: typeof body === 'string' ? body : JSON.stringify(body),
            ContentType: contentType,
          }));

          result = { uploaded: true, bucket, key };
          break;
        }

        case 'deleteObject': {
          if (!key) throw new Error('Object key is required for deleteObject');
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
          result = { deleted: true, bucket, key };
          break;
        }

        case 'listObjects': {
          const prefix = (config.prefix || '') as string;
          const maxKeys = (config.maxKeys || 1000) as number;
          const response = await client.send(new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: maxKeys,
          }));

          result = {
            objects: (response.Contents || []).map(obj => ({
              key: obj.Key,
              size: obj.Size,
              lastModified: obj.LastModified?.toISOString(),
              eTag: obj.ETag,
            })),
            isTruncated: response.IsTruncated,
            keyCount: response.KeyCount,
          };
          break;
        }

        default:
          throw new Error(`Unknown S3 operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        throw new Error(`S3 object not found: ${key}`);
      }
      if (error.name === 'NoSuchBucket') {
        throw new Error(`S3 bucket not found: ${bucket}`);
      }
      throw error;
    }
  },
};
