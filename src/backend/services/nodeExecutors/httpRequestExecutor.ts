/**
 * HTTP Request Node Executor
 * Executes real HTTP requests with authentication, SSRF protection, and auto-pagination
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import fetch, { Response } from 'node-fetch';
import { logger } from '../../../services/SimpleLogger';

const MAX_PAGES = 100;

function isPrivateAddress(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.1[6-9]\./.test(hostname) ||
    /^172\.2[0-9]\./.test(hostname) ||
    /^172\.3[01]\./.test(hostname) ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.includes('metadata')
  );
}

function buildHeaders(
  headers: Record<string, string>,
  credentials: Record<string, unknown>,
  authentication?: {
    type?: string;
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    headerName?: string;
  }
): Record<string, string> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Apply credential-based auth first
  if (credentials.token) {
    requestHeaders['Authorization'] = `Bearer ${credentials.token}`;
  } else if (credentials.apiKey) {
    requestHeaders['Authorization'] = `Bearer ${credentials.apiKey}`;
  } else if (credentials.username && credentials.password) {
    const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    requestHeaders['Authorization'] = `Basic ${basicAuth}`;
  }

  // Override with explicit node-level auth
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
        if (authentication.headerName && authentication.apiKey) {
          requestHeaders[authentication.headerName] = authentication.apiKey;
        }
        break;
    }
  }

  return requestHeaders;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  } else if (contentType?.includes('text/')) {
    return response.text();
  } else {
    return response.buffer();
  }
}

/**
 * Extract next page URL from response using common pagination patterns.
 * Supports: Link header, offset/page params, cursor-based, and JSON body fields.
 */
function getNextPageUrl(
  response: Response,
  responseBody: unknown,
  currentUrl: string,
  paginationConfig: {
    mode: string;
    limitParam?: string;
    offsetParam?: string;
    pageParam?: string;
    cursorParam?: string;
    cursorPath?: string;
    nextUrlPath?: string;
    maxPages?: number;
    pageSize?: number;
  },
  currentPage: number
): string | null {
  const mode = paginationConfig.mode;

  // Link header pagination (RFC 5988)
  if (mode === 'linkHeader' || mode === 'auto') {
    const linkHeader = response.headers.get('link');
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) return nextMatch[1];
    }
    if (mode === 'linkHeader') return null;
  }

  // Offset-based pagination
  if (mode === 'offset' || mode === 'auto') {
    const url = new URL(currentUrl);
    const limitParam = paginationConfig.limitParam || 'limit';
    const offsetParam = paginationConfig.offsetParam || 'offset';
    const pageSize = paginationConfig.pageSize || parseInt(url.searchParams.get(limitParam) || '0') || 100;
    const currentOffset = parseInt(url.searchParams.get(offsetParam) || '0');

    // Check if we got fewer results than page size (last page)
    const items = Array.isArray(responseBody) ? responseBody :
      (responseBody && typeof responseBody === 'object' && 'data' in (responseBody as Record<string, unknown>))
        ? (responseBody as Record<string, unknown>).data
        : null;

    if (Array.isArray(items) && items.length < pageSize) return null;
    if (Array.isArray(items) && items.length === 0) return null;

    url.searchParams.set(offsetParam, String(currentOffset + pageSize));
    url.searchParams.set(limitParam, String(pageSize));
    return url.toString();
  }

  // Page-based pagination
  if (mode === 'page') {
    const url = new URL(currentUrl);
    const pageParam = paginationConfig.pageParam || 'page';
    url.searchParams.set(pageParam, String(currentPage + 1));
    return url.toString();
  }

  // Cursor-based pagination
  if (mode === 'cursor') {
    if (!responseBody || typeof responseBody !== 'object') return null;
    const cursorPath = paginationConfig.cursorPath || 'meta.next_cursor';
    let cursor: unknown = responseBody;
    for (const key of cursorPath.split('.')) {
      if (cursor && typeof cursor === 'object') {
        cursor = (cursor as Record<string, unknown>)[key];
      } else {
        cursor = undefined;
      }
    }
    if (!cursor) return null;
    const url = new URL(currentUrl);
    url.searchParams.set(paginationConfig.cursorParam || 'cursor', String(cursor));
    return url.toString();
  }

  // JSON body next URL
  if (mode === 'nextUrl') {
    if (!responseBody || typeof responseBody !== 'object') return null;
    const nextUrlPath = paginationConfig.nextUrlPath || 'next';
    let nextUrl: unknown = responseBody;
    for (const key of nextUrlPath.split('.')) {
      if (nextUrl && typeof nextUrl === 'object') {
        nextUrl = (nextUrl as Record<string, unknown>)[key];
      } else {
        nextUrl = undefined;
      }
    }
    return typeof nextUrl === 'string' && nextUrl ? nextUrl : null;
  }

  return null;
}

export const httpRequestExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};
    const credentials = context.credentials || {};

    const method = (config.method || 'GET') as string;
    const url = config.url as string | undefined;
    const headers = (config.headers || {}) as Record<string, string>;
    const authentication = config.authentication as {
      type?: string; username?: string; password?: string;
      token?: string; apiKey?: string; headerName?: string;
    } | undefined;
    const timeout = (config.timeout || 30000) as number;
    const body = config.body;
    const queryParams = (config.queryParams || {}) as Record<string, unknown>;

    // Pagination config
    const pagination = config.pagination as {
      enabled?: boolean;
      mode?: string;
      limitParam?: string;
      offsetParam?: string;
      pageParam?: string;
      cursorParam?: string;
      cursorPath?: string;
      nextUrlPath?: string;
      maxPages?: number;
      pageSize?: number;
    } | undefined;

    if (!url) {
      throw new Error('URL is required for HTTP request');
    }

    try {
      const urlObj = new URL(url);

      // SECURITY: Prevent SSRF attacks
      if (isPrivateAddress(urlObj.hostname)) {
        throw new Error('Access to local/private network addresses is not allowed');
      }

      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error(`Protocol ${urlObj.protocol} is not allowed`);
      }

      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value));
        }
      });

      // Add api_key to URL if using api_key auth without header
      if (authentication?.type === 'api_key' && !authentication.headerName && authentication.apiKey) {
        urlObj.searchParams.append('api_key', authentication.apiKey);
      }

      const requestHeaders = buildHeaders(headers, credentials, authentication);

      let requestBody: string | undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        requestBody = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // Single request (no pagination)
      if (!pagination?.enabled) {
        return await doSingleRequest(urlObj.toString(), method, requestHeaders, requestBody, timeout);
      }

      // Paginated request
      const maxPages = Math.min(pagination.maxPages || 10, MAX_PAGES);
      const allItems: unknown[] = [];
      let currentUrl = urlObj.toString();
      let page = 1;
      let lastHeaders: Record<string, string> = {};

      while (page <= maxPages) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(currentUrl, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseBody = await parseResponseBody(response);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}\n${
              typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
            }`
          );
        }

        lastHeaders = Object.fromEntries(response.headers.entries());

        // Collect items
        const items = Array.isArray(responseBody)
          ? responseBody
          : (responseBody && typeof responseBody === 'object' && 'data' in (responseBody as Record<string, unknown>))
            ? (responseBody as Record<string, unknown>).data
            : [responseBody];

        if (Array.isArray(items)) {
          allItems.push(...items);
        } else {
          allItems.push(items);
        }

        // Get next page
        const nextUrl = getNextPageUrl(
          response,
          responseBody,
          currentUrl,
          { mode: pagination.mode || 'auto', ...pagination },
          page
        );

        if (!nextUrl) break;

        // SSRF check on pagination URLs
        const nextUrlObj = new URL(nextUrl);
        if (isPrivateAddress(nextUrlObj.hostname)) {
          throw new Error('Pagination URL points to a private address');
        }

        currentUrl = nextUrl;
        page++;
      }

      logger.info('HTTP paginated request completed', {
        url, pages: page, totalItems: allItems.length,
      });

      return {
        success: true,
        data: {
          status: 200,
          headers: lastHeaders,
          body: allItems,
          pagination: { pages: page, totalItems: allItems.length },
        },
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`HTTP request timed out after ${timeout}ms`);
      }
      throw error;
    }
  },
};

async function doSingleRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
  timeout: number
): Promise<NodeExecutionResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText}\n${
        typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
      }`
    );
  }

  return {
    success: true,
    data: {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
    },
    timestamp: new Date().toISOString(),
  };
}
