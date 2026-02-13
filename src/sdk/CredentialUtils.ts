/**
 * CredentialUtils - Utilities for credential management in custom nodes
 */

import { ICredentialDataDecryptedObject, IHttpRequestOptions } from './NodeInterface';

export interface ICredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: ICredentialProperty[];
  authenticate?: IAuthenticateGeneric;
  test?: ICredentialTestRequest;
  icon?: string;
  iconUrl?: string;
}

export interface ICredentialProperty {
  displayName: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'hidden' | 'password' | 'options';
  default?: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  typeOptions?: {
    password?: boolean;
    minValue?: number;
    maxValue?: number;
  };
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
  options?: Array<{ name: string; value: string | number }>;
}

export interface IAuthenticateGeneric {
  type: 'generic';
  properties: {
    auth?: {
      username?: string;
      password?: string;
    };
    headers?: Record<string, string>;
    qs?: Record<string, any>;
    body?: Record<string, any>;
  };
}

export interface ICredentialTestRequest {
  request: IHttpRequestOptions;
  rules?: ICredentialTestRequestRule[];
}

export interface ICredentialTestRequestRule {
  type: 'responseCode' | 'responseSuccessBody' | 'responseErrorBody';
  properties: {
    value?: number | string;
    message?: string;
    key?: string;
  };
}

/**
 * Credential utilities class
 */
export class CredentialUtils {
  /**
   * Create a basic authentication header
   */
  static createBasicAuthHeader(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Create a bearer token header
   */
  static createBearerAuthHeader(token: string): string {
    return `Bearer ${token}`;
  }

  /**
   * Apply credentials to HTTP request options
   */
  static applyCredentials(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
    authenticationType: 'basic' | 'bearer' | 'apiKey' | 'oauth2' = 'basic'
  ): IHttpRequestOptions {
    const options = { ...requestOptions };

    switch (authenticationType) {
      case 'basic':
        if (credentials.username && credentials.password) {
          options.headers = {
            ...options.headers,
            Authorization: this.createBasicAuthHeader(
              credentials.username as string,
              credentials.password as string
            ),
          };
        }
        break;

      case 'bearer':
        if (credentials.token) {
          options.headers = {
            ...options.headers,
            Authorization: this.createBearerAuthHeader(credentials.token as string),
          };
        }
        break;

      case 'apiKey':
        if (credentials.apiKey) {
          const headerName = credentials.headerName || 'X-API-Key';
          options.headers = {
            ...options.headers,
            [headerName as string]: credentials.apiKey as string,
          };
        }
        break;

      case 'oauth2':
        if (credentials.accessToken) {
          options.headers = {
            ...options.headers,
            Authorization: this.createBearerAuthHeader(credentials.accessToken as string),
          };
        }
        break;
    }

    return options;
  }

  /**
   * Validate credential properties
   */
  static validateCredentials(
    credentials: ICredentialDataDecryptedObject,
    requiredProperties: string[]
  ): { valid: boolean; missingProperties: string[] } {
    const missingProperties: string[] = [];

    for (const property of requiredProperties) {
      if (!credentials[property] || credentials[property] === '') {
        missingProperties.push(property);
      }
    }

    return {
      valid: missingProperties.length === 0,
      missingProperties,
    };
  }

  /**
   * Test credentials by making a test request
   */
  static async testCredentials(
    credentials: ICredentialDataDecryptedObject,
    testRequest: ICredentialTestRequest,
    requestFunction: (options: IHttpRequestOptions) => Promise<any>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await requestFunction(testRequest.request);

      // Apply test rules if specified
      if (testRequest.rules) {
        for (const rule of testRequest.rules) {
          const result = this.applyTestRule(rule, response);
          if (!result.success) {
            return result;
          }
        }
      }

      return { success: true, message: 'Credentials are valid' };
    } catch (error: any) {
      return {
        success: false,
        message: `Credential test failed: ${error.message}`,
      };
    }
  }

  /**
   * Apply a test rule to a response
   */
  private static applyTestRule(
    rule: ICredentialTestRequestRule,
    response: any
  ): { success: boolean; message: string } {
    switch (rule.type) {
      case 'responseCode':
        if (response.statusCode !== rule.properties.value) {
          return {
            success: false,
            message: rule.properties.message || `Expected status code ${rule.properties.value}, got ${response.statusCode}`,
          };
        }
        break;

      case 'responseSuccessBody':
        if (rule.properties.key) {
          const value = this.getNestedValue(response.body, rule.properties.key as string);
          if (!value) {
            return {
              success: false,
              message: rule.properties.message || `Expected property "${rule.properties.key}" in response body`,
            };
          }
        }
        break;

      case 'responseErrorBody':
        if (rule.properties.key) {
          const value = this.getNestedValue(response.body, rule.properties.key as string);
          if (value) {
            return {
              success: false,
              message: rule.properties.message || `Error in response: ${value}`,
            };
          }
        }
        break;
    }

    return { success: true, message: 'Rule passed' };
  }

  /**
   * Get nested value from object
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Create OAuth2 credentials type
   */
  static createOAuth2Credential(config: {
    name: string;
    displayName: string;
    authUrl: string;
    tokenUrl: string;
    scopes?: string[];
    documentationUrl?: string;
  }): ICredentialType {
    return {
      name: config.name,
      displayName: config.displayName,
      documentationUrl: config.documentationUrl,
      properties: [
        {
          displayName: 'Grant Type',
          name: 'grantType',
          type: 'options',
          options: [
            { name: 'Authorization Code', value: 'authorizationCode' },
            { name: 'Client Credentials', value: 'clientCredentials' },
          ],
          default: 'authorizationCode',
        },
        {
          displayName: 'Authorization URL',
          name: 'authUrl',
          type: 'string',
          default: config.authUrl,
          required: true,
        },
        {
          displayName: 'Access Token URL',
          name: 'accessTokenUrl',
          type: 'string',
          default: config.tokenUrl,
          required: true,
        },
        {
          displayName: 'Client ID',
          name: 'clientId',
          type: 'string',
          default: '',
          required: true,
        },
        {
          displayName: 'Client Secret',
          name: 'clientSecret',
          type: 'string',
          typeOptions: { password: true },
          default: '',
          required: true,
        },
        {
          displayName: 'Scope',
          name: 'scope',
          type: 'string',
          default: config.scopes?.join(' ') || '',
          description: 'Space-separated list of scopes',
        },
      ],
    };
  }

  /**
   * Create API Key credentials type
   */
  static createApiKeyCredential(config: {
    name: string;
    displayName: string;
    apiKeyName?: string;
    documentationUrl?: string;
  }): ICredentialType {
    return {
      name: config.name,
      displayName: config.displayName,
      documentationUrl: config.documentationUrl,
      properties: [
        {
          displayName: 'API Key',
          name: 'apiKey',
          type: 'string',
          typeOptions: { password: true },
          default: '',
          required: true,
        },
        {
          displayName: 'API Key Header Name',
          name: 'headerName',
          type: 'string',
          default: config.apiKeyName || 'X-API-Key',
          description: 'The header name where the API key should be sent',
        },
      ],
    };
  }

  /**
   * Create Basic Auth credentials type
   */
  static createBasicAuthCredential(config: {
    name: string;
    displayName: string;
    documentationUrl?: string;
  }): ICredentialType {
    return {
      name: config.name,
      displayName: config.displayName,
      documentationUrl: config.documentationUrl,
      properties: [
        {
          displayName: 'Username',
          name: 'username',
          type: 'string',
          default: '',
          required: true,
        },
        {
          displayName: 'Password',
          name: 'password',
          type: 'string',
          typeOptions: { password: true },
          default: '',
          required: true,
        },
      ],
    };
  }

  /**
   * Encrypt credential value
   */
  static encryptCredential(value: string, encryptionKey: string): string {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt credential value
   */
  static decryptCredential(encryptedValue: string, encryptionKey: string): string {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const [ivHex, encrypted] = encryptedValue.split(':');
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
