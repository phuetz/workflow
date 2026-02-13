/**
 * Google Cloud Logging Stream
 * Integration with Google Cloud Logging (Stackdriver)
 */

import axios, { AxiosInstance } from 'axios';
import { StreamTransport, TransportConfig } from '../StreamTransport';
import { StreamedLog } from '../LogStreamer';

export interface GCPLoggingConfig extends TransportConfig {
  projectId: string;
  logName: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
  resource?: {
    type: string;
    labels?: Record<string, string>;
  };
}

interface GCPLogEntry {
  logName: string;
  resource: {
    type: string;
    labels: Record<string, string>;
  };
  timestamp?: string;
  severity?: string;
  jsonPayload?: any;
  textPayload?: string;
  labels?: Record<string, string>;
  trace?: string;
  spanId?: string;
  httpRequest?: any;
}

export class GCPLoggingStream extends StreamTransport {
  private client: AxiosInstance;
  protected declare config: GCPLoggingConfig;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: GCPLoggingConfig) {
    super(config);

    this.client = axios.create({
      baseURL: 'https://logging.googleapis.com/v2',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.connect();
  }

  /**
   * Connect to GCP Logging
   */
  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      // Get access token
      await this.refreshAccessToken();

      const isValid = await this.validate();

      if (isValid) {
        this.setStatus('connected');
        this.emit('connected');
      } else {
        throw new Error('Cannot connect to GCP Logging');
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from GCP Logging
   */
  async disconnect(): Promise<void> {
    this.setStatus('disconnected');
    this.emit('disconnected');
  }

  /**
   * Send logs to GCP Logging
   */
  async send(logs: StreamedLog[]): Promise<void> {
    if (this.status !== 'connected') {
      throw new Error('Transport not connected');
    }

    // Refresh token if needed
    if (this.needsTokenRefresh()) {
      await this.refreshAccessToken();
    }

    const startTime = Date.now();

    try {
      const entries = logs.map(log => this.transformLog(log));

      const payload = {
        entries,
        logName: `projects/${this.config.projectId}/logs/${this.config.logName}`,
        resource: this.config.resource || {
          type: 'global',
        },
      };

      await this.client.post('/entries:write', payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const transferTime = Date.now() - startTime;
      this.updateMetrics(logs, transferTime);

      this.emit('logs:sent', { count: logs.length, time: transferTime });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Validate connection
   */
  async validate(): Promise<boolean> {
    try {
      // Try to list logs to validate credentials
      await this.client.get(`/projects/${this.config.projectId}/logs`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        params: {
          pageSize: 1,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Transform log to GCP format
   */
  private transformLog(log: StreamedLog): GCPLogEntry {
    const entry: GCPLogEntry = {
      logName: `projects/${this.config.projectId}/logs/${this.config.logName}`,
      resource: this.config.resource ? {
        type: this.config.resource.type,
        labels: this.config.resource.labels || {},
      } : {
        type: 'global',
        labels: {},
      },
      timestamp: log.timestamp,
      severity: this.mapLogLevel(log.level),
      jsonPayload: {
        message: log.message,
        category: log.category,
      },
      labels: {},
    };

    // Add context
    if (log.context) {
      entry.jsonPayload.context = log.context;
      entry.labels = {
        ...entry.labels,
        service: log.context.service,
        environment: log.context.environment,
        version: log.context.version,
      };
    }

    // Add trace information
    if (log.trace) {
      entry.trace = `projects/${this.config.projectId}/traces/${log.trace.traceId}`;
      entry.spanId = log.trace.spanId;
      entry.jsonPayload.trace = log.trace;
    }

    // Add error information
    if (log.error) {
      entry.jsonPayload.error = {
        type: log.error.type || log.error.name,
        message: log.error.message,
        stack: log.error.stack,
      };
    }

    // Add performance metrics
    if (log.performance) {
      entry.jsonPayload.performance = log.performance;
    }

    // Add user information
    if (log.user) {
      entry.jsonPayload.user = log.user;
      if (log.user.id) {
        entry.labels!.userId = log.user.id;
      }
    }

    // Add metadata
    if (log.metadata) {
      entry.jsonPayload.metadata = log.metadata;
    }

    return entry;
  }

  /**
   * Map log level to GCP severity
   */
  private mapLogLevel(level: string): string {
    const mapping: Record<string, string> = {
      trace: 'DEBUG',
      debug: 'DEBUG',
      info: 'INFO',
      warn: 'WARNING',
      error: 'ERROR',
      fatal: 'CRITICAL',
    };

    return mapping[level.toLowerCase()] || 'INFO';
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.config.credentials) {
      // Use Application Default Credentials or gcloud auth
      throw new Error('GCP credentials not provided');
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const claimSet = {
      iss: this.config.credentials.client_email,
      scope: 'https://www.googleapis.com/auth/logging.write',
      aud: 'https://oauth2.googleapis.com/token',
      exp,
      iat: now,
    };

    const jwt = this.createJWT(header, claimSet, this.config.credentials.private_key);

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = now + response.data.expires_in;
    } catch (error) {
      throw new Error('Failed to refresh GCP access token');
    }
  }

  /**
   * Check if token needs refresh
   */
  private needsTokenRefresh(): boolean {
    if (!this.accessToken || !this.tokenExpiry) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return now >= this.tokenExpiry - 300; // Refresh 5 minutes before expiry
  }

  /**
   * Create JWT for service account authentication
   */
  private createJWT(header: any, claimSet: any, privateKey: string): string {
    const crypto = require('crypto');

    const encodeBase64Url = (data: string): string => {
      return Buffer.from(data)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedClaimSet = encodeBase64Url(JSON.stringify(claimSet));

    const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    sign.end();

    const signature = sign.sign(privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${signatureInput}.${signature}`;
  }
}
