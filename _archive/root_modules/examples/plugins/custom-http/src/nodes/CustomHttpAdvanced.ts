/**
 * Example Plugin: Advanced HTTP Client
 * Demonstrates: Authentication, Retry logic, Caching, Error handling
 */

import {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
} from '@workflow/sdk';

export class CustomHttpAdvanced implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Custom HTTP Advanced',
    name: 'customHttpAdvanced',
    group: ['transform'],
    version: 1,
    description: 'Advanced HTTP client with retry, caching, and authentication',
    defaults: {
      name: 'HTTP Advanced',
      color: '#0055FF',
    },
    inputs: ['main'],
    outputs: ['main', 'error'],
    credentials: [
      {
        name: 'customHttpCredential',
        required: false,
      },
    ],
    properties: [
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'DELETE', value: 'DELETE' },
        ],
        default: 'GET',
        description: 'HTTP method to use',
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        placeholder: 'https://api.example.com/data',
        description: 'The URL to make the request to',
      },
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basic' },
          { name: 'Bearer Token', value: 'bearer' },
          { name: 'API Key', value: 'apiKey' },
          { name: 'Custom', value: 'custom' },
        ],
        default: 'none',
      },
      {
        displayName: 'Headers',
        name: 'headers',
        type: 'json',
        default: '{}',
        description: 'Custom headers as JSON object',
      },
      {
        displayName: 'Body',
        name: 'body',
        type: 'json',
        default: '{}',
        displayOptions: {
          show: {
            method: ['POST', 'PUT', 'PATCH'],
          },
        },
        description: 'Request body as JSON',
      },
      {
        displayName: 'Retry',
        name: 'retry',
        type: 'boolean',
        default: false,
        description: 'Enable automatic retry on failure',
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: 'number',
        default: 3,
        displayOptions: {
          show: {
            retry: [true],
          },
        },
        description: 'Maximum number of retry attempts',
      },
      {
        displayName: 'Cache Response',
        name: 'cacheResponse',
        type: 'boolean',
        default: false,
        description: 'Cache successful responses',
      },
      {
        displayName: 'Cache TTL (seconds)',
        name: 'cacheTtl',
        type: 'number',
        default: 300,
        displayOptions: {
          show: {
            cacheResponse: [true],
          },
        },
        description: 'Time to keep cache in seconds',
      },
      {
        displayName: 'Timeout (ms)',
        name: 'timeout',
        type: 'number',
        default: 30000,
        description: 'Request timeout in milliseconds',
      },
    ],
  };

  // Simple in-memory cache
  private cache: Map<string, { data: any; expires: number }> = new Map();

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const errorData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const method = this.getNodeParameter('method', i) as string;
        const url = this.getNodeParameter('url', i) as string;
        const authentication = this.getNodeParameter('authentication', i) as string;
        const headers = JSON.parse(this.getNodeParameter('headers', i, '{}') as string);
        const retry = this.getNodeParameter('retry', i) as boolean;
        const maxRetries = this.getNodeParameter('maxRetries', i, 3) as number;
        const cacheResponse = this.getNodeParameter('cacheResponse', i) as boolean;
        const cacheTtl = this.getNodeParameter('cacheTtl', i, 300) as number;
        const timeout = this.getNodeParameter('timeout', i, 30000) as number;

        // Build request options
        const requestOptions: any = {
          method,
          url,
          headers: { ...headers },
          timeout,
          json: true,
        };

        // Add body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          const body = this.getNodeParameter('body', i, '{}') as string;
          requestOptions.body = typeof body === 'string' ? JSON.parse(body) : body;
        }

        // Add authentication
        if (authentication !== 'none') {
          const credentials = await this.getCredentials('customHttpCredential');

          if (authentication === 'basic') {
            const auth = `${credentials.username}:${credentials.password}`;
            requestOptions.headers['Authorization'] = `Basic ${Buffer.from(auth).toString('base64')}`;
          } else if (authentication === 'bearer') {
            requestOptions.headers['Authorization'] = `Bearer ${credentials.token}`;
          } else if (authentication === 'apiKey') {
            requestOptions.headers[credentials.headerName as string] = credentials.apiKey;
          }
        }

        // Check cache
        if (cacheResponse && method === 'GET') {
          const cacheKey = this.getCacheKey(url, requestOptions.headers);
          const cached = this.getFromCache(cacheKey);

          if (cached) {
            returnData.push({
              json: {
                ...cached,
                _cached: true,
              },
            });
            continue;
          }
        }

        // Execute request with retry
        let response;
        let attempts = 0;

        while (attempts <= (retry ? maxRetries : 0)) {
          try {
            response = await this.helpers.request(requestOptions);
            break;
          } catch (error: any) {
            attempts++;

            if (attempts > (retry ? maxRetries : 0)) {
              throw error;
            }

            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
            await this.sleep(delay);
          }
        }

        // Cache response
        if (cacheResponse && method === 'GET' && response) {
          const cacheKey = this.getCacheKey(url, requestOptions.headers);
          this.setCache(cacheKey, response, cacheTtl);
        }

        returnData.push({
          json: {
            ...response,
            _attempts: attempts + 1,
          },
        });

      } catch (error: any) {
        if (this.continueOnFail()) {
          errorData.push({
            json: {
              error: error.message,
              statusCode: error.statusCode,
              url: this.getNodeParameter('url', i) as string,
            },
            error,
          });
        } else {
          throw error;
        }
      }
    }

    return [returnData, errorData];
  }

  private getCacheKey(url: string, headers: any): string {
    return `${url}_${JSON.stringify(headers)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl * 1000),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
