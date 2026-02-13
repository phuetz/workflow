/**
 * AWS CloudWatch Logs Stream
 * Integration with AWS CloudWatch Logs
 */

import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { StreamTransport, TransportConfig } from '../StreamTransport';
import { StreamedLog } from '../LogStreamer';

export interface CloudWatchConfig extends TransportConfig {
  region: string;
  logGroupName: string;
  logStreamName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

interface CloudWatchLogEvent {
  timestamp: number;
  message: string;
}

export class CloudWatchStream extends StreamTransport {
  private client: AxiosInstance;
  protected declare config: CloudWatchConfig;
  private sequenceToken?: string;

  constructor(config: CloudWatchConfig) {
    super(config);

    const endpoint = `https://logs.${config.region}.amazonaws.com`;

    this.client = axios.create({
      baseURL: endpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
      },
    });

    this.connect();
  }

  /**
   * Connect to CloudWatch
   */
  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      // Ensure log group exists
      await this.ensureLogGroup();

      // Ensure log stream exists
      await this.ensureLogStream();

      this.setStatus('connected');
      this.emit('connected');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from CloudWatch
   */
  async disconnect(): Promise<void> {
    this.setStatus('disconnected');
    this.emit('disconnected');
  }

  /**
   * Send logs to CloudWatch
   */
  async send(logs: StreamedLog[]): Promise<void> {
    if (this.status !== 'connected') {
      throw new Error('Transport not connected');
    }

    const startTime = Date.now();

    try {
      const logEvents: CloudWatchLogEvent[] = logs
        .map(log => this.transformLog(log))
        .sort((a, b) => a.timestamp - b.timestamp);

      const params = {
        logGroupName: this.config.logGroupName,
        logStreamName: this.config.logStreamName,
        logEvents,
        sequenceToken: this.sequenceToken,
      };

      const response = await this.makeRequest('PutLogEvents', params);

      // Update sequence token for next request
      this.sequenceToken = response.data.nextSequenceToken;

      const transferTime = Date.now() - startTime;
      this.updateMetrics(logs, transferTime);

      this.emit('logs:sent', { count: logs.length, time: transferTime });
    } catch (error: any) {
      // Handle sequence token mismatch
      if (error.response?.data?.__type === 'InvalidSequenceTokenException') {
        const expectedToken = error.response.data.expectedSequenceToken;
        this.sequenceToken = expectedToken;
        // Retry with correct token
        return this.send(logs);
      }

      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Validate connection
   */
  async validate(): Promise<boolean> {
    try {
      await this.makeRequest('DescribeLogGroups', {
        logGroupNamePrefix: this.config.logGroupName,
        limit: 1,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure log group exists
   */
  private async ensureLogGroup(): Promise<void> {
    try {
      const response = await this.makeRequest('DescribeLogGroups', {
        logGroupNamePrefix: this.config.logGroupName,
      });

      const exists = response.data.logGroups?.some(
        (group: any) => group.logGroupName === this.config.logGroupName
      );

      if (!exists) {
        await this.makeRequest('CreateLogGroup', {
          logGroupName: this.config.logGroupName,
        });
      }
    } catch (error) {
      // Ignore ResourceAlreadyExistsException
      if ((error as any).response?.data?.__type !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }
  }

  /**
   * Ensure log stream exists
   */
  private async ensureLogStream(): Promise<void> {
    try {
      const response = await this.makeRequest('DescribeLogStreams', {
        logGroupName: this.config.logGroupName,
        logStreamNamePrefix: this.config.logStreamName,
      });

      const stream = response.data.logStreams?.find(
        (s: any) => s.logStreamName === this.config.logStreamName
      );

      if (stream) {
        this.sequenceToken = stream.uploadSequenceToken;
      } else {
        await this.makeRequest('CreateLogStream', {
          logGroupName: this.config.logGroupName,
          logStreamName: this.config.logStreamName,
        });
      }
    } catch (error) {
      // Ignore ResourceAlreadyExistsException
      if ((error as any).response?.data?.__type !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }
  }

  /**
   * Transform log to CloudWatch format
   */
  private transformLog(log: StreamedLog): CloudWatchLogEvent {
    const message: any = {
      level: log.level,
      message: log.message,
      category: log.category,
    };

    if (log.context) {
      message.context = log.context;
    }

    if (log.trace) {
      message.trace = log.trace;
    }

    if (log.error) {
      message.error = log.error;
    }

    if (log.performance) {
      message.performance = log.performance;
    }

    if (log.user) {
      message.user = log.user;
    }

    if (log.metadata) {
      message.metadata = log.metadata;
    }

    return {
      timestamp: new Date(log.timestamp).getTime(),
      message: JSON.stringify(message),
    };
  }

  /**
   * Make AWS request with signature V4
   */
  private async makeRequest(action: string, params: any): Promise<any> {
    const headers = this.signRequest(action, params);

    return this.client.post('/', JSON.stringify(params), {
      headers: {
        ...headers,
        'X-Amz-Target': `Logs_20140328.${action}`,
      },
    });
  }

  /**
   * Sign request using AWS Signature V4
   */
  private signRequest(action: string, params: any): Record<string, string> {
    const accessKeyId = this.config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = this.config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = this.config.sessionToken || process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not provided');
    }

    const now = new Date();
    const amzDate = this.getAmzDate(now);
    const dateStamp = this.getDateStamp(now);

    const canonicalHeaders = `content-type:application/x-amz-json-1.1\nhost:logs.${this.config.region}.amazonaws.com\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';

    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(params))
      .digest('hex');

    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credentialScope = `${dateStamp}/${this.config.region}/logs/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto
      .createHash('sha256')
      .update(canonicalRequest)
      .digest('hex')}`;

    const signingKey = this.getSignatureKey(secretAccessKey, dateStamp, this.config.region, 'logs');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      'X-Amz-Date': amzDate,
      Authorization: authorizationHeader,
    };

    if (sessionToken) {
      headers['X-Amz-Security-Token'] = sessionToken;
    }

    return headers;
  }

  /**
   * Get signing key
   */
  private getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  }

  /**
   * Get AMZ date format
   */
  private getAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  }

  /**
   * Get date stamp
   */
  private getDateStamp(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }
}
