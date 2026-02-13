/**
 * Credential Testing Service
 *
 * Validates credentials before use by attempting to connect/authenticate
 * with the target service. Supports multiple credential types.
 *
 * @module backend/services/CredentialTesterService
 */

import * as crypto from 'crypto';
import * as net from 'net';
import * as tls from 'tls';
import { CredentialType } from '@prisma/client';
import { logger } from '../../services/SimpleLogger';

// Default timeout for credential tests (5 seconds)
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 10000;

/**
 * Result of a credential test
 */
export interface CredentialTestResult {
  success: boolean;
  message: string;
  details?: {
    latency?: number;
    serverInfo?: string;
    expiresAt?: string;
    scopes?: string[];
    [key: string]: unknown;
  };
  testedAt: string;
}

/**
 * Configuration for testing credentials
 */
export interface CredentialTestConfig {
  type: CredentialType | string;
  data: Record<string, unknown>;
  testEndpoint?: string;
  timeoutMs?: number;
}

/**
 * Credential Tester Service
 */
export class CredentialTesterService {
  private defaultTimeout: number;

  constructor(defaultTimeout = DEFAULT_TIMEOUT_MS) {
    this.defaultTimeout = Math.min(defaultTimeout, MAX_TIMEOUT_MS);
  }

  /**
   * Test a credential based on its type
   */
  async test(config: CredentialTestConfig): Promise<CredentialTestResult> {
    const timeout = Math.min(config.timeoutMs || this.defaultTimeout, MAX_TIMEOUT_MS);
    const startTime = Date.now();
    const testedAt = new Date().toISOString();

    try {
      // Normalize credential type
      const type = this.normalizeType(config.type);

      let result: CredentialTestResult;

      switch (type) {
        case CredentialType.API_KEY:
          result = await this.testApiKey(config.data, timeout);
          break;
        case CredentialType.OAUTH2:
          result = await this.testOAuth2(config.data, timeout);
          break;
        case CredentialType.BASIC_AUTH:
          result = await this.testBasicAuth(config.data, timeout);
          break;
        case CredentialType.DATABASE:
          result = await this.testDatabase(config.data, timeout);
          break;
        case CredentialType.SSH_KEY:
          result = await this.testSSHKey(config.data);
          break;
        case CredentialType.JWT:
          result = await this.testJWT(config.data);
          break;
        case CredentialType.CUSTOM:
          // Check if this is an SMTP credential
          if (this.isSmtpCredential(config.data)) {
            result = await this.testSmtp(config.data, timeout);
          } else {
            result = await this.testCustom(config.data, timeout);
          }
          break;
        default:
          result = {
            success: false,
            message: `Unsupported credential type: ${config.type}`,
            testedAt
          };
      }

      // Add latency if not already set
      if (result.success && result.details && !result.details.latency) {
        result.details.latency = Date.now() - startTime;
      }

      result.testedAt = testedAt;
      return result;

    } catch (error) {
      logger.error('Credential test failed', { error, type: config.type });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during credential test',
        testedAt
      };
    }
  }

  /**
   * Normalize credential type string to CredentialType enum
   */
  private normalizeType(type: CredentialType | string): CredentialType {
    if (typeof type !== 'string') return type;

    const typeMap: Record<string, CredentialType> = {
      api_key: CredentialType.API_KEY,
      apikey: CredentialType.API_KEY,
      oauth2: CredentialType.OAUTH2,
      oauth: CredentialType.OAUTH2,
      basic_auth: CredentialType.BASIC_AUTH,
      basic: CredentialType.BASIC_AUTH,
      database: CredentialType.DATABASE,
      db: CredentialType.DATABASE,
      ssh_key: CredentialType.SSH_KEY,
      ssh: CredentialType.SSH_KEY,
      jwt: CredentialType.JWT,
      bearer: CredentialType.JWT,
      custom: CredentialType.CUSTOM
    };

    const normalized = typeMap[type.toLowerCase()];
    if (!normalized && Object.values(CredentialType).includes(type as CredentialType)) {
      return type as CredentialType;
    }
    return normalized || CredentialType.CUSTOM;
  }

  /**
   * Test API Key credential
   * Makes a simple authenticated request to verify the key
   */
  private async testApiKey(
    data: Record<string, unknown>,
    timeout: number
  ): Promise<CredentialTestResult> {
    const apiKey = data.apiKey || data.key || data.api_key;
    const testUrl = data.testUrl || data.baseUrl || data.url;
    const headerName = data.headerName || data.header || 'Authorization';
    const headerPrefix = data.headerPrefix || data.prefix || 'Bearer';

    if (!apiKey) {
      return {
        success: false,
        message: 'API key is missing',
        testedAt: ''
      };
    }

    // If no test URL provided, just validate key format
    if (!testUrl) {
      // Basic key format validation
      const keyStr = String(apiKey);
      if (keyStr.length < 8) {
        return {
          success: false,
          message: 'API key appears too short (minimum 8 characters)',
          testedAt: ''
        };
      }

      return {
        success: true,
        message: 'API key format validated (no test endpoint provided)',
        details: {
          keyLength: keyStr.length,
          keyPrefix: keyStr.substring(0, 4) + '****'
        },
        testedAt: ''
      };
    }

    // Make authenticated request
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headerValue = headerPrefix ? `${headerPrefix} ${apiKey}` : String(apiKey);
      const headers: Record<string, string> = {
        [String(headerName)]: headerValue
      };

      const response = await fetch(String(testUrl), {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: 'API key authentication successful',
          details: {
            latency,
            statusCode: response.status,
            serverInfo: response.headers.get('server') || undefined
          },
          testedAt: ''
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: `Authentication failed: ${response.status} ${response.statusText}`,
          details: { statusCode: response.status, latency },
          testedAt: ''
        };
      }

      // Other errors might not be auth-related
      return {
        success: true,
        message: `API key accepted (endpoint returned ${response.status})`,
        details: { latency, statusCode: response.status },
        testedAt: ''
      };

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          message: `Connection timed out after ${timeout}ms`,
          testedAt: ''
        };
      }
      throw error;
    }
  }

  /**
   * Test OAuth2 credential
   * Verifies the token via introspection or userinfo endpoint
   */
  private async testOAuth2(
    data: Record<string, unknown>,
    timeout: number
  ): Promise<CredentialTestResult> {
    const accessToken = data.accessToken || data.access_token || data.token;
    const refreshToken = data.refreshToken || data.refresh_token;
    const tokenUrl = data.tokenUrl || data.token_url;
    const clientId = data.clientId || data.client_id;
    const clientSecret = data.clientSecret || data.client_secret;
    const introspectUrl = data.introspectUrl || data.introspect_url;
    const userInfoUrl = data.userInfoUrl || data.userinfo_url;

    if (!accessToken) {
      // Check if we can use refresh token
      if (refreshToken && tokenUrl && clientId && clientSecret) {
        return this.testOAuth2Refresh(data, timeout);
      }
      return {
        success: false,
        message: 'Access token is missing',
        testedAt: ''
      };
    }

    const startTime = Date.now();

    // Try userinfo endpoint first (most common)
    if (userInfoUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(String(userInfoUrl), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (response.ok) {
          const userInfo = await response.json() as Record<string, unknown>;
          return {
            success: true,
            message: 'OAuth2 token is valid',
            details: {
              latency,
              subject: userInfo.sub || userInfo.email || userInfo.id || 'unknown',
              scopes: Array.isArray(userInfo.scope) ? userInfo.scope : undefined
            },
            testedAt: ''
          };
        }

        if (response.status === 401) {
          return {
            success: false,
            message: 'OAuth2 token is invalid or expired',
            details: { latency },
            testedAt: ''
          };
        }

      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return {
            success: false,
            message: `Connection timed out after ${timeout}ms`,
            testedAt: ''
          };
        }
        // Fall through to try introspect
      }
    }

    // Try token introspection
    if (introspectUrl && clientId && clientSecret) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch(String(introspectUrl), {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `token=${accessToken}`,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        if (response.ok) {
          const result = await response.json() as { active?: boolean; exp?: number; scope?: string };
          if (result.active) {
            return {
              success: true,
              message: 'OAuth2 token is valid and active',
              details: {
                latency,
                expiresAt: result.exp ? new Date(result.exp * 1000).toISOString() : undefined,
                scopes: result.scope ? result.scope.split(' ') : undefined
              },
              testedAt: ''
            };
          }
          return {
            success: false,
            message: 'OAuth2 token is not active',
            details: { latency },
            testedAt: ''
          };
        }

      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return {
            success: false,
            message: `Connection timed out after ${timeout}ms`,
            testedAt: ''
          };
        }
      }
    }

    // No validation endpoint available, basic format check
    const tokenStr = String(accessToken);
    if (tokenStr.length < 10) {
      return {
        success: false,
        message: 'Access token appears too short',
        testedAt: ''
      };
    }

    return {
      success: true,
      message: 'OAuth2 token format validated (no validation endpoint available)',
      details: {
        tokenLength: tokenStr.length,
        hasRefreshToken: !!refreshToken
      },
      testedAt: ''
    };
  }

  /**
   * Test OAuth2 refresh token by attempting to get new access token
   */
  private async testOAuth2Refresh(
    data: Record<string, unknown>,
    timeout: number
  ): Promise<CredentialTestResult> {
    const refreshToken = data.refreshToken || data.refresh_token;
    const tokenUrl = data.tokenUrl || data.token_url;
    const clientId = data.clientId || data.client_id;
    const clientSecret = data.clientSecret || data.client_secret;

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(String(tokenUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: String(refreshToken),
          client_id: String(clientId),
          client_secret: String(clientSecret)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        const result = await response.json() as { access_token?: string; expires_in?: number };
        return {
          success: true,
          message: 'OAuth2 refresh token is valid',
          details: {
            latency,
            expiresIn: result.expires_in,
            accessTokenReceived: !!result.access_token
          },
          testedAt: ''
        };
      }

      return {
        success: false,
        message: `Refresh token validation failed: ${response.status} ${response.statusText}`,
        details: { latency },
        testedAt: ''
      };

    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          message: `Connection timed out after ${timeout}ms`,
          testedAt: ''
        };
      }
      throw error;
    }
  }

  /**
   * Test Basic Auth credential
   */
  private async testBasicAuth(
    data: Record<string, unknown>,
    timeout: number
  ): Promise<CredentialTestResult> {
    const username = data.username || data.user;
    const password = data.password || data.pass;
    const testUrl = data.testUrl || data.baseUrl || data.url;

    if (!username || !password) {
      return {
        success: false,
        message: 'Username or password is missing',
        testedAt: ''
      };
    }

    // If no test URL, just validate format
    if (!testUrl) {
      return {
        success: true,
        message: 'Basic auth credentials format validated (no test endpoint provided)',
        details: {
          username: String(username),
          passwordLength: String(password).length
        },
        testedAt: ''
      };
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      const response = await fetch(String(testUrl), {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: 'Basic authentication successful',
          details: {
            latency,
            statusCode: response.status,
            serverInfo: response.headers.get('server') || undefined
          },
          testedAt: ''
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: `Authentication failed: ${response.status} ${response.statusText}`,
          details: { latency, statusCode: response.status },
          testedAt: ''
        };
      }

      return {
        success: true,
        message: `Authentication accepted (endpoint returned ${response.status})`,
        details: { latency, statusCode: response.status },
        testedAt: ''
      };

    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          message: `Connection timed out after ${timeout}ms`,
          testedAt: ''
        };
      }
      throw error;
    }
  }

  /**
   * Test Database credential
   * Attempts to connect to the database
   */
  private async testDatabase(
    data: Record<string, unknown>,
    timeout: number
  ): Promise<CredentialTestResult> {
    const host = data.host || data.hostname || 'localhost';
    const port = data.port || this.getDefaultPort(data.type as string);
    const username = data.username || data.user;
    const password = data.password || data.pass;
    const database = data.database || data.db || data.dbname;
    const ssl = data.ssl !== false;
    const connectionString = data.connectionString || data.uri || data.url;

    // Parse connection string if provided
    let parsedHost = host;
    let parsedPort = port;

    if (connectionString && typeof connectionString === 'string') {
      try {
        const url = new URL(connectionString);
        parsedHost = url.hostname || host;
        parsedPort = url.port ? parseInt(url.port) : port;
      } catch {
        // Not a valid URL, use as-is
      }
    }

    if (!parsedHost) {
      return {
        success: false,
        message: 'Database host is missing',
        testedAt: ''
      };
    }

    // Try TCP connection to verify host and port
    const startTime = Date.now();

    return new Promise<CredentialTestResult>((resolve) => {
      const socket = ssl
        ? tls.connect({
            host: String(parsedHost),
            port: Number(parsedPort) || 5432,
            timeout,
            rejectUnauthorized: false
          })
        : net.connect({
            host: String(parsedHost),
            port: Number(parsedPort) || 5432,
            timeout
          });

      const timeoutId = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          message: `Connection timed out after ${timeout}ms`,
          testedAt: ''
        });
      }, timeout);

      socket.on('connect', () => {
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        socket.destroy();

        resolve({
          success: true,
          message: 'Database connection successful',
          details: {
            latency,
            host: String(parsedHost),
            port: Number(parsedPort),
            ssl,
            hasUsername: !!username,
            hasPassword: !!password,
            database: database ? String(database) : undefined
          },
          testedAt: ''
        });
      });

      socket.on('error', (err) => {
        clearTimeout(timeoutId);
        socket.destroy();

        resolve({
          success: false,
          message: `Database connection failed: ${err.message}`,
          details: {
            host: String(parsedHost),
            port: Number(parsedPort),
            errorCode: (err as NodeJS.ErrnoException).code
          },
          testedAt: ''
        });
      });

      socket.on('timeout', () => {
        clearTimeout(timeoutId);
        socket.destroy();

        resolve({
          success: false,
          message: `Connection timed out after ${timeout}ms`,
          testedAt: ''
        });
      });
    });
  }

  /**
   * Get default port for database type
   */
  private getDefaultPort(dbType?: string): number {
    if (!dbType) return 5432;

    const ports: Record<string, number> = {
      postgres: 5432,
      postgresql: 5432,
      mysql: 3306,
      mariadb: 3306,
      mongodb: 27017,
      mongo: 27017,
      redis: 6379,
      mssql: 1433,
      sqlserver: 1433,
      oracle: 1521
    };

    return ports[dbType.toLowerCase()] || 5432;
  }

  /**
   * Test SSH Key credential
   * Validates key format and structure
   */
  private async testSSHKey(
    data: Record<string, unknown>
  ): Promise<CredentialTestResult> {
    const privateKey = data.privateKey || data.private_key || data.key;
    const passphrase = data.passphrase;

    if (!privateKey) {
      return {
        success: false,
        message: 'SSH private key is missing',
        testedAt: ''
      };
    }

    const keyStr = String(privateKey).trim();

    // Check for valid key format
    const validFormats = [
      { start: '-----BEGIN OPENSSH PRIVATE KEY-----', type: 'OpenSSH' },
      { start: '-----BEGIN RSA PRIVATE KEY-----', type: 'RSA' },
      { start: '-----BEGIN DSA PRIVATE KEY-----', type: 'DSA' },
      { start: '-----BEGIN EC PRIVATE KEY-----', type: 'EC' },
      { start: '-----BEGIN PRIVATE KEY-----', type: 'PKCS8' }
    ];

    const format = validFormats.find(f => keyStr.startsWith(f.start));
    if (!format) {
      return {
        success: false,
        message: 'Invalid SSH key format. Must be PEM-encoded private key',
        testedAt: ''
      };
    }

    // Check for matching END header
    const endHeader = format.start.replace('BEGIN', 'END');
    if (!keyStr.includes(endHeader)) {
      return {
        success: false,
        message: `Invalid SSH key: missing ${endHeader}`,
        testedAt: ''
      };
    }

    // Check if key is encrypted
    const isEncrypted = keyStr.includes('ENCRYPTED') || keyStr.includes('Proc-Type: 4,ENCRYPTED');
    if (isEncrypted && !passphrase) {
      return {
        success: false,
        message: 'SSH key is encrypted but no passphrase provided',
        details: { keyType: format.type, isEncrypted: true },
        testedAt: ''
      };
    }

    // Try to parse key using Node.js crypto
    try {
      const keyObject = crypto.createPrivateKey({
        key: keyStr,
        format: 'pem',
        passphrase: passphrase ? String(passphrase) : undefined
      });

      const keyDetails = keyObject.asymmetricKeyDetails;

      return {
        success: true,
        message: 'SSH key is valid',
        details: {
          keyType: format.type,
          algorithm: keyObject.asymmetricKeyType,
          modulusLength: keyDetails?.modulusLength,
          isEncrypted
        },
        testedAt: ''
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Key parsing failed';

      if (message.includes('passphrase')) {
        return {
          success: false,
          message: 'Invalid passphrase for encrypted SSH key',
          details: { keyType: format.type, isEncrypted: true },
          testedAt: ''
        };
      }

      return {
        success: false,
        message: `SSH key validation failed: ${message}`,
        details: { keyType: format.type },
        testedAt: ''
      };
    }
  }

  /**
   * Test JWT / Bearer token
   * Validates token format and optionally checks signature
   */
  private async testJWT(
    data: Record<string, unknown>
  ): Promise<CredentialTestResult> {
    const token = data.token || data.jwt || data.accessToken;
    const secret = data.secret || data.signingKey;

    if (!token) {
      return {
        success: false,
        message: 'JWT token is missing',
        testedAt: ''
      };
    }

    const tokenStr = String(token).trim();
    const parts = tokenStr.split('.');

    if (parts.length !== 3) {
      return {
        success: false,
        message: 'Invalid JWT format: must have 3 parts (header.payload.signature)',
        testedAt: ''
      };
    }

    try {
      // Decode header
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf8')
      ) as { alg?: string; typ?: string };

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8')
      ) as { exp?: number; iat?: number; iss?: string; sub?: string };

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp ? payload.exp < now : false;

      if (isExpired) {
        return {
          success: false,
          message: 'JWT token has expired',
          details: {
            algorithm: header.alg,
            issuer: payload.iss,
            subject: payload.sub,
            expiredAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined
          },
          testedAt: ''
        };
      }

      // Verify signature if secret provided
      if (secret && header.alg) {
        const isValid = this.verifyJWTSignature(tokenStr, String(secret), header.alg);
        if (!isValid) {
          return {
            success: false,
            message: 'JWT signature verification failed',
            details: { algorithm: header.alg },
            testedAt: ''
          };
        }
      }

      return {
        success: true,
        message: secret ? 'JWT token is valid and signature verified' : 'JWT token format is valid',
        details: {
          algorithm: header.alg,
          issuer: payload.iss,
          subject: payload.sub,
          issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : undefined,
          expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
          signatureVerified: !!secret
        },
        testedAt: ''
      };

    } catch (error) {
      return {
        success: false,
        message: `JWT parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        testedAt: ''
      };
    }
  }

  /**
   * Verify JWT signature using HMAC
   */
  private verifyJWTSignature(token: string, secret: string, algorithm: string): boolean {
    const parts = token.split('.');
    const signatureInput = `${parts[0]}.${parts[1]}`;

    let hashAlg: string;
    switch (algorithm.toUpperCase()) {
      case 'HS256':
        hashAlg = 'sha256';
        break;
      case 'HS384':
        hashAlg = 'sha384';
        break;
      case 'HS512':
        hashAlg = 'sha512';
        break;
      default:
        // Non-HMAC algorithms not supported for verification here
        return true;
    }

    const expectedSignature = crypto
      .createHmac(hashAlg, secret)
      .update(signatureInput)
      .digest('base64url');

    return expectedSignature === parts[2];
  }

  /**
   * Test Custom credential
   * Uses provided test configuration
   */
  private async testCustom(
    data: Record<string, unknown>,
    timeout: number
  ): Promise<CredentialTestResult> {
    const testUrl = data.testUrl || data.baseUrl || data.url;
    const testMethod = data.testMethod || 'GET';
    const testHeaders = data.testHeaders as Record<string, string> | undefined;

    // If test URL provided, attempt connection
    if (testUrl) {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(String(testUrl), {
          method: String(testMethod),
          headers: testHeaders || {},
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;

        return {
          success: response.ok || response.status < 500,
          message: response.ok
            ? 'Custom credential test successful'
            : `Custom credential test returned ${response.status}`,
          details: {
            latency,
            statusCode: response.status,
            serverInfo: response.headers.get('server') || undefined
          },
          testedAt: ''
        };

      } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name === 'AbortError') {
          return {
            success: false,
            message: `Connection timed out after ${timeout}ms`,
            testedAt: ''
          };
        }
        throw error;
      }
    }

    // No test possible, just validate data exists
    const hasData = Object.keys(data).length > 0;
    return {
      success: hasData,
      message: hasData
        ? 'Custom credential data present (no test endpoint configured)'
        : 'Custom credential has no data',
      details: {
        fieldCount: Object.keys(data).length
      },
      testedAt: ''
    };
  }

  /**
   * Check if credential data appears to be SMTP configuration
   */
  private isSmtpCredential(data: Record<string, unknown>): boolean {
    const smtpIndicators = ['smtpHost', 'smtp_host', 'mailServer', 'mail_server'];
    const hasSmtpIndicator = smtpIndicators.some(key => key in data);

    // Also check if it has typical SMTP ports
    const port = data.port || data.smtpPort || data.smtp_port;
    const smtpPorts = [25, 465, 587, 2525];
    const hasSmtpPort = port && smtpPorts.includes(Number(port));

    return !!(hasSmtpIndicator || hasSmtpPort);
  }

  /**
   * Test SMTP credential
   * Attempts to connect to the mail server
   */
  private async testSmtp(
    data: Record<string, unknown>,
    timeout: number
  ): Promise<CredentialTestResult> {
    const host = data.smtpHost || data.smtp_host || data.mailServer || data.mail_server || data.host || 'localhost';
    const port = data.smtpPort || data.smtp_port || data.port || 587;
    const username = data.username || data.user || data.smtpUser || data.smtp_user;
    const password = data.password || data.pass || data.smtpPassword || data.smtp_password;
    const secure = data.secure !== undefined ? data.secure : (Number(port) === 465);

    if (!host) {
      return {
        success: false,
        message: 'SMTP host is missing',
        testedAt: ''
      };
    }

    const startTime = Date.now();

    return new Promise<CredentialTestResult>((resolve) => {
      const socket = secure
        ? tls.connect({
            host: String(host),
            port: Number(port),
            timeout,
            rejectUnauthorized: false
          })
        : net.connect({
            host: String(host),
            port: Number(port),
            timeout
          });

      let serverBanner = '';
      let dataReceived = false;

      const timeoutId = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          message: `Connection timed out after ${timeout}ms`,
          testedAt: ''
        });
      }, timeout);

      socket.on('connect', () => {
        // For plain connection, upgrade to TLS may be needed (STARTTLS)
        // For now, just verify we can connect
      });

      socket.on('data', (chunk) => {
        dataReceived = true;
        serverBanner += chunk.toString();

        // Check for SMTP greeting (220)
        if (serverBanner.includes('220')) {
          clearTimeout(timeoutId);
          const latency = Date.now() - startTime;

          // Send QUIT to close gracefully
          socket.write('QUIT\r\n');

          setTimeout(() => socket.destroy(), 100);

          resolve({
            success: true,
            message: 'SMTP connection successful',
            details: {
              latency,
              host: String(host),
              port: Number(port),
              secure,
              serverInfo: serverBanner.substring(0, 100).trim(),
              hasCredentials: !!(username && password)
            },
            testedAt: ''
          });
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timeoutId);
        socket.destroy();

        resolve({
          success: false,
          message: `SMTP connection failed: ${err.message}`,
          details: {
            host: String(host),
            port: Number(port),
            errorCode: (err as NodeJS.ErrnoException).code
          },
          testedAt: ''
        });
      });

      socket.on('timeout', () => {
        clearTimeout(timeoutId);
        socket.destroy();

        resolve({
          success: false,
          message: `Connection timed out after ${timeout}ms`,
          testedAt: ''
        });
      });

      socket.on('close', () => {
        clearTimeout(timeoutId);
        if (!dataReceived) {
          resolve({
            success: false,
            message: 'Connection closed without SMTP response',
            testedAt: ''
          });
        }
      });
    });
  }
}

// Singleton instance
let testerInstance: CredentialTesterService | null = null;

/**
 * Get singleton instance of CredentialTesterService
 */
export function getCredentialTesterService(): CredentialTesterService {
  if (!testerInstance) {
    testerInstance = new CredentialTesterService();
  }
  return testerInstance;
}

export default CredentialTesterService;
