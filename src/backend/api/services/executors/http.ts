import fetch, { RequestInit } from 'node-fetch';

export interface HttpAuthBasic { type: 'basic'; username: string; password: string }
export interface HttpAuthBearer { type: 'bearer'; token: string }
export interface HttpAuthApiKey { type: 'api_key'; apiKey: string; headerName?: string }
export type HttpAuth = HttpAuthBasic | HttpAuthBearer | HttpAuthApiKey;

export interface HttpRequestConfig {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  authentication?: HttpAuth;
}

export async function executeHttpRequest(cfg: HttpRequestConfig): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
}> {
  const method = (cfg.method || 'GET').toUpperCase();
  const urlObj = new URL(cfg.url);

  if (cfg.queryParams) {
    Object.entries(cfg.queryParams).forEach(([k, v]) => {
      if (v !== undefined) urlObj.searchParams.set(k, String(v));
    });
  }

  // Basic SSRF guard (do not allow localhost/private ranges)
  const host = urlObj.hostname;
  if (
    host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' ||
    /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
  ) {
    throw new Error('Access to local/private network addresses is not allowed');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(cfg.headers || {}),
  };

  if (cfg.authentication) {
    switch (cfg.authentication.type) {
      case 'basic': {
        const token = Buffer.from(`${cfg.authentication.username}:${cfg.authentication.password}`).toString('base64');
        headers['Authorization'] = `Basic ${token}`;
        break;
      }
      case 'bearer':
        headers['Authorization'] = `Bearer ${cfg.authentication.token}`;
        break;
      case 'api_key':
        if (cfg.authentication.headerName) headers[cfg.authentication.headerName] = cfg.authentication.apiKey;
        else urlObj.searchParams.set('api_key', cfg.authentication.apiKey);
        break;
    }
  }

  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method) && cfg.body !== undefined) {
    body = typeof cfg.body === 'string' ? cfg.body : JSON.stringify(cfg.body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 30000);

  const init: RequestInit = { method, headers, body, signal: controller.signal };
  const response = await fetch(urlObj.toString(), init);
  clearTimeout(timeout);

  const contentType = response.headers.get('content-type') || '';
  let parsed: unknown;
  if (contentType.includes('application/json')) parsed = await response.json();
  else if (contentType.startsWith('text/')) parsed = await response.text();
  else parsed = await response.arrayBuffer();

  if (!response.ok) {
    const msg = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    throw new Error(`HTTP ${response.status}: ${response.statusText}\n${msg}`);
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: parsed,
  };
}

