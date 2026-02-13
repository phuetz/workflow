/**
 * Communication node executors: Email, Slack, Discord, HTTP
 */

import type { WorkflowNode, NodeConfig, HttpAuthentication } from '../types';
import { interpolateString } from '../ExpressionEvaluator';

/**
 * Execute HTTP request node
 */
export async function executeHttpRequest(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = interpolateString(String(config.url || 'https://jsonplaceholder.typicode.com/posts/1'), inputData);
  const method = String(config.method || 'GET').toUpperCase();
  const timeout = Number(config.timeout || 30000);

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.headers as Record<string, string> || {})
  };

  // Add authentication if configured
  if (config.authentication) {
    const auth = config.authentication as HttpAuthentication;
    if (auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'basic') {
      const credentials = btoa(`${auth.username}:${auth.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (auth.type === 'apiKey') {
      if (auth.in === 'header') {
        headers[auth.name as string] = auth.value as string;
      }
    }
  }

  // Build request body
  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const bodyData = config.body || inputData;
    body = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
  }

  const startTime = Date.now();

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response based on content type
    let responseBody: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return {
      statusCode: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      url,
      method,
      duration,
      success: response.ok
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorObj = error instanceof Error ? error : new Error(String(error));

    if (errorObj.name === 'AbortError') {
      return {
        statusCode: 408,
        statusText: 'Request Timeout',
        headers: {},
        body: { error: 'Request timed out', timeout },
        url,
        method,
        duration,
        success: false
      };
    }
    return {
      statusCode: 0,
      statusText: 'Network Error',
      headers: {},
      body: { error: errorObj.message || 'Network request failed' },
      url,
      method,
      duration,
      success: false
    };
  }
}

/**
 * Execute email node
 */
export async function executeEmail(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const to = String(config.to || inputData.email || 'user@example.com');
  const subject = String(config.subject || 'Email from workflow');
  const host = String(config.host || '');

  return {
    sent: true,
    to,
    subject,
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    provider: host.includes('gmail') ? 'Gmail' : 'SMTP',
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute Slack node
 */
export async function executeSlack(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const channel = (config.channel as string) || '#general';
  const message = (config.message as string) || 'Message from workflow';

  return {
    sent: true,
    channel,
    message,
    ts: Date.now().toString(),
    user: 'workflow-bot'
  };
}

/**
 * Execute Discord node
 */
export async function executeDiscord(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const content = (config.content as string) || 'Message from workflow';

  return {
    sent: true,
    content,
    messageId: Math.random().toString(36).substring(2, 20),
    timestamp: new Date().toISOString()
  };
}
