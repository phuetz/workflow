/**
 * HTTP Request Node Executor
 * Executes HTTP requests with authentication and error handling
 */

import { Node } from 'reactflow';
import { NodeExecutor } from './index';
import fetch from 'node-fetch';

export const httpRequestExecutor: NodeExecutor = {
  async execute(node: Node, _context: unknown): Promise<unknown> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const {
      method = 'GET',
      url,
      headers = {},
      authentication,
      timeout = 30000,
      body,
      queryParams = {}
    } = node.data;

    if (!url) {
      throw new Error('URL is required for HTTP request');
    }

    try {
      // Build URL with query parameters
      const urlObj = new URL(url);

      // SECURITY: Prevent SSRF attacks - block localhost and private IPs
      if (urlObj.hostname === 'localhost' || 
          urlObj.hostname === '127.0.0.1' ||
          urlObj.hostname.match(/^10\./) ||
          urlObj.hostname.match(/^192\.168\./) ||
          urlObj.hostname.match(/^172\.1[6-9]\./) ||
          urlObj.hostname.match(/^172\.2[0-9]\./) ||
          urlObj.hostname.match(/^172\.3[01]\./) ||
          urlObj.hostname === '0.0.0.0' ||
          urlObj.hostname === '::1' ||
          urlObj.hostname.includes('metadata')) {
        throw new Error('Access to local/private network addresses is not allowed');
      }
      
      // SECURITY: Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error(`Protocol ${urlObj.protocol} is not allowed`);
      }
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value));
        }
      });

      // Prepare headers
      const requestHeaders: unknown = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Add authentication
      if (authentication) {
        switch (authentication.type) {
          case 'basic': {
            const basicAuth = Buffer.from(
              `${authentication.username}:${authentication.password}`
            ).toString('base64');
            requestHeaders['Authorization'] = `Basic ${basicAuth}`;
            break;
          }
          
          case 'bearer':
            requestHeaders['Authorization'] = `Bearer ${authentication.token}`;
            break;
          
          case 'api_key':
            if (authentication.headerName) {
              requestHeaders[authentication.headerName] = authentication.apiKey;
            } else {
              urlObj.searchParams.append('api_key', authentication.apiKey);
            }
            break;
        }
      }

      // Prepare body
      let requestBody: string | undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        requestBody = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Make request
      const response = await fetch(urlObj.toString(), {
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      const responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: null as unknown
      };

      // Try to parse response body
      if (contentType?.includes('application/json')) {
        responseData.body = await response.json();
      } else if (contentType?.includes('text/')) {
        responseData.body = await response.text();
      } else {
        responseData.body = await response.buffer();
      }

      // Check for HTTP errors
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}\n${
            typeof responseData.body === 'string' 
              ? responseData.body 
              : JSON.stringify(responseData.body)
          }`
        );
      }

      return responseData;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`HTTP request timed out after ${timeout}ms`);
      }
      throw error;
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];

    if (!node.data.url) {
      errors.push('URL is required');
    } else {
      try {
        new URL(node.data.url);
      } catch {
        errors.push('Invalid URL format');
      }
    }

    if (!node.data.method) {
      errors.push('HTTP method is required');
    }

    return errors;
  }
};