/**
 * Webhook Wait
 * Advanced webhook operations with async resume capabilities (n8n-like)
 */

import { waitNodeManager, type WaitExecution } from './waitNode';

export type WebhookMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface WebhookWaitConfig {
  path?: string; // Custom path or auto-generated
  httpMethod: WebhookMethod | WebhookMethod[];
  authentication?: {
    type: 'none' | 'basicAuth' | 'headerAuth' | 'queryAuth';
    username?: string;
    password?: string;
    headerName?: string;
    headerValue?: string;
    queryParameter?: string;
    queryValue?: string;
  };
  responseMode: 'onReceived' | 'lastBeforeExecution' | 'allData';
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  limit?: number; // Max webhooks to collect
  timeout?: number; // Max wait time in ms
  dataTransformation?: {
    extractPath?: string; // JSON path to extract
    filter?: string; // Filter expression
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
  };
}

export interface WebhookRequest {
  id: string;
  method: WebhookMethod;
  path: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

export interface WebhookWaitExecution {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  config: WebhookWaitConfig;
  webhookUrl: string;
  requests: WebhookRequest[];
  status: 'waiting' | 'resumed' | 'timeout' | 'cancelled';
  createdAt: string;
  resumedAt?: string;
}

class WebhookWaitManager {
  private webhookExecutions: Map<string, WebhookWaitExecution> = new Map();
  private pathToExecutionMap: Map<string, string> = new Map();

  /**
   * Create webhook wait
   */
  async createWebhookWait(
    workflowId: string,
    executionId: string,
    nodeId: string,
    config: WebhookWaitConfig
  ): Promise<WebhookWaitExecution> {
    const id = this.generateId();
    const path = config.path || this.generatePath(id);
    const webhookUrl = this.buildWebhookUrl(path);

    const execution: WebhookWaitExecution = {
      id,
      workflowId,
      executionId,
      nodeId,
      config,
      webhookUrl,
      requests: [],
      status: 'waiting',
      createdAt: new Date().toISOString()
    };

    this.webhookExecutions.set(id, execution);
    this.pathToExecutionMap.set(path, id);

    // Set timeout if configured
    if (config.timeout) {
      setTimeout(() => {
        this.handleTimeout(id);
      }, config.timeout);
    }

    this.saveToStorage();

    return execution;
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    path: string,
    method: WebhookMethod,
    headers: Record<string, string>,
    query: Record<string, any>,
    body: any,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{
    success: boolean;
    status: number;
    headers?: Record<string, string>;
    body?: any;
    error?: string;
  }> {
    const executionId = this.pathToExecutionMap.get(path);

    if (!executionId) {
      return {
        success: false,
        status: 404,
        body: { error: 'Webhook not found' }
      };
    }

    const execution = this.webhookExecutions.get(executionId);

    if (!execution) {
      return {
        success: false,
        status: 404,
        body: { error: 'Execution not found' }
      };
    }

    if (execution.status !== 'waiting') {
      return {
        success: false,
        status: 410,
        body: { error: 'Webhook execution already completed' }
      };
    }

    // Validate HTTP method
    const allowedMethods = Array.isArray(execution.config.httpMethod)
      ? execution.config.httpMethod
      : [execution.config.httpMethod];

    if (!allowedMethods.includes(method)) {
      return {
        success: false,
        status: 405,
        body: { error: `Method ${method} not allowed` },
        headers: { Allow: allowedMethods.join(', ') }
      };
    }

    // Authenticate
    if (execution.config.authentication) {
      const authResult = this.authenticate(
        execution.config.authentication,
        headers,
        query
      );

      if (!authResult.success) {
        return {
          success: false,
          status: 401,
          body: { error: 'Authentication failed' },
          headers: { 'WWW-Authenticate': 'Basic realm="Webhook"' }
        };
      }
    }

    // Store request
    const request: WebhookRequest = {
      id: this.generateId(),
      method,
      path,
      headers,
      query,
      body,
      timestamp: new Date().toISOString(),
      ip: meta?.ip,
      userAgent: meta?.userAgent
    };

    execution.requests.push(request);

    // Check if should resume
    const shouldResume = this.shouldResumeExecution(execution);

    if (shouldResume) {
      execution.status = 'resumed';
      execution.resumedAt = new Date().toISOString();

      // Resume workflow execution
      await this.resumeWorkflow(execution);
    }

    this.webhookExecutions.set(executionId, execution);
    this.saveToStorage();

    // Return response
    return {
      success: true,
      status: execution.config.responseCode || 200,
      headers: execution.config.responseHeaders,
      body: execution.config.responseBody || {
        success: true,
        message: 'Webhook received',
        executionId: execution.executionId
      }
    };
  }

  /**
   * Get webhook execution
   */
  getExecution(id: string): WebhookWaitExecution | undefined {
    return this.webhookExecutions.get(id);
  }

  /**
   * Cancel webhook wait
   */
  async cancel(id: string): Promise<void> {
    const execution = this.webhookExecutions.get(id);

    if (execution) {
      execution.status = 'cancelled';
      this.webhookExecutions.set(id, execution);

      // Remove path mapping
      this.pathToExecutionMap.delete(execution.webhookUrl.split('/').pop()!);

      this.saveToStorage();
    }
  }

  /**
   * Authenticate webhook request
   */
  private authenticate(
    config: WebhookWaitConfig['authentication'],
    headers: Record<string, string>,
    query: Record<string, any>
  ): { success: boolean; error?: string } {
    if (!config || config.type === 'none') {
      return { success: true };
    }

    switch (config.type) {
      case 'basicAuth': {
        const authHeader = headers['authorization'] || headers['Authorization'];
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return { success: false, error: 'Missing Basic Auth header' };
        }

        const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
        const [username, password] = credentials.split(':');

        if (username !== config.username || password !== config.password) {
          return { success: false, error: 'Invalid credentials' };
        }

        return { success: true };
      }

      case 'headerAuth': {
        const headerValue = headers[config.headerName!.toLowerCase()];
        if (headerValue !== config.headerValue) {
          return { success: false, error: 'Invalid header authentication' };
        }
        return { success: true };
      }

      case 'queryAuth': {
        const queryValue = query[config.queryParameter!];
        if (queryValue !== config.queryValue) {
          return { success: false, error: 'Invalid query authentication' };
        }
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown authentication type' };
    }
  }

  /**
   * Check if should resume execution
   */
  private shouldResumeExecution(execution: WebhookWaitExecution): boolean {
    const { config, requests } = execution;

    switch (config.responseMode) {
      case 'onReceived':
        // Resume on first webhook
        return requests.length === 1;

      case 'lastBeforeExecution':
        // Resume when limit reached
        return config.limit ? requests.length >= config.limit : false;

      case 'allData':
        // Resume when limit reached
        return config.limit ? requests.length >= config.limit : false;

      default:
        return false;
    }
  }

  /**
   * Resume workflow execution
   */
  private async resumeWorkflow(execution: WebhookWaitExecution): Promise<void> {
    let data: any;

    switch (execution.config.responseMode) {
      case 'onReceived':
        data = execution.requests[0];
        break;

      case 'lastBeforeExecution':
        data = execution.requests[execution.requests.length - 1];
        break;

      case 'allData':
        data = execution.requests;
        break;
    }

    // Apply transformations
    if (execution.config.dataTransformation) {
      data = this.transformData(data, execution.config.dataTransformation);
    }

    // Resume via wait node manager
    const waitExecution = await waitNodeManager.wait(
      execution.workflowId,
      execution.executionId,
      execution.nodeId,
      {
        mode: 'webhook',
        webhook: {
          path: execution.webhookUrl,
          httpMethod: 'POST',
          responseMode: 'onReceived'
        }
      }
    );

    await waitNodeManager.resume(waitExecution.id, data);
  }

  /**
   * Transform webhook data
   */
  private transformData(
    data: any,
    transformation: WebhookWaitConfig['dataTransformation']
  ): any {
    if (!transformation) return data;

    let result = data;

    // Extract path
    if (transformation.extractPath) {
      result = this.extractJsonPath(result, transformation.extractPath);
    }

    // Filter
    if (transformation.filter && Array.isArray(result)) {
      result = result.filter((item: any) => this.evaluateFilter(item, transformation.filter!));
    }

    // Sort
    if (transformation.sort && Array.isArray(result)) {
      result = result.sort((a: any, b: any) => {
        const aVal = a[transformation.sort!.field];
        const bVal = b[transformation.sort!.field];

        if (transformation.sort!.order === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return result;
  }

  /**
   * Extract value from JSON path
   */
  private extractJsonPath(data: any, path: string): any {
    const parts = path.split('.');
    let result = data;

    for (const part of parts) {
      if (result === null || result === undefined) {
        return undefined;
      }
      result = result[part];
    }

    return result;
  }

  /**
   * Evaluate filter expression
   */
  private evaluateFilter(item: any, filter: string): boolean {
    try {
      // Simple expression evaluation (can be enhanced)
      const func = new Function('item', `return ${filter}`);
      return func(item);
    } catch {
      return false;
    }
  }

  /**
   * Handle timeout
   */
  private handleTimeout(id: string): void {
    const execution = this.webhookExecutions.get(id);

    if (execution && execution.status === 'waiting') {
      execution.status = 'timeout';
      this.webhookExecutions.set(id, execution);
      this.saveToStorage();
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate webhook path
   */
  private generatePath(id: string): string {
    return `/webhook/${id}`;
  }

  /**
   * Build full webhook URL
   */
  private buildWebhookUrl(path: string): string {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  /**
   * Save to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const executions = Array.from(this.webhookExecutions.entries());
        const paths = Array.from(this.pathToExecutionMap.entries());

        localStorage.setItem('webhook-wait-executions', JSON.stringify(executions));
        localStorage.setItem('webhook-wait-paths', JSON.stringify(paths));
      } catch (error) {
        console.error('Failed to save webhook wait data:', error);
      }
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const executions = localStorage.getItem('webhook-wait-executions');
        const paths = localStorage.getItem('webhook-wait-paths');

        if (executions) {
          this.webhookExecutions = new Map(JSON.parse(executions));
        }

        if (paths) {
          this.pathToExecutionMap = new Map(JSON.parse(paths));
        }
      } catch (error) {
        console.error('Failed to load webhook wait data:', error);
      }
    }
  }

  /**
   * Clean up old executions
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();

    for (const [id, execution] of this.webhookExecutions) {
      const createdAt = new Date(execution.createdAt).getTime();

      if (now - createdAt > olderThanMs && execution.status !== 'waiting') {
        this.webhookExecutions.delete(id);
      }
    }

    this.saveToStorage();
  }
}

// Singleton instance
export const webhookWaitManager = new WebhookWaitManager();

/**
 * Webhook Wait Node Type
 */
export const WebhookWaitNodeType = {
  type: 'webhookWait',
  category: 'Core',
  label: 'Webhook Wait',
  icon: '🔗',
  color: '#f59e0b',
  description: 'Wait for webhook callback to resume execution',

  inputs: [
    { name: 'input', type: 'any', required: true }
  ],

  outputs: [
    { name: 'output', type: 'any' }
  ],

  settings: [
    {
      key: 'path',
      label: 'Webhook Path',
      type: 'text',
      placeholder: '/webhook/custom-path (optional)',
      description: 'Leave empty to auto-generate'
    },
    {
      key: 'httpMethod',
      label: 'HTTP Method',
      type: 'multiSelect',
      default: ['POST'],
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'PATCH', value: 'PATCH' },
        { label: 'DELETE', value: 'DELETE' }
      ]
    },
    {
      key: 'responseMode',
      label: 'Response Mode',
      type: 'select',
      default: 'onReceived',
      options: [
        {
          label: 'On Received',
          value: 'onReceived',
          description: 'Resume immediately on first webhook'
        },
        {
          label: 'Last Before Execution',
          value: 'lastBeforeExecution',
          description: 'Collect webhooks and use the last one'
        },
        {
          label: 'All Data',
          value: 'allData',
          description: 'Collect all webhooks and return as array'
        }
      ]
    },
    {
      key: 'limit',
      label: 'Max Webhooks',
      type: 'number',
      default: 1,
      showIf: (config: any) => config.responseMode !== 'onReceived'
    },
    {
      key: 'authenticationType',
      label: 'Authentication',
      type: 'select',
      default: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Basic Auth', value: 'basicAuth' },
        { label: 'Header Auth', value: 'headerAuth' },
        { label: 'Query Param', value: 'queryAuth' }
      ]
    },
    {
      key: 'responseCode',
      label: 'Response Status Code',
      type: 'number',
      default: 200
    },
    {
      key: 'timeoutMinutes',
      label: 'Timeout (minutes)',
      type: 'number',
      default: 60,
      description: '0 = no timeout'
    }
  ],

  execute: async (config: any, inputs: any, context: any) => {
    const webhookConfig: WebhookWaitConfig = {
      path: config.path,
      httpMethod: config.httpMethod,
      responseMode: config.responseMode,
      limit: config.limit,
      responseCode: config.responseCode,
      timeout: config.timeoutMinutes ? config.timeoutMinutes * 60 * 1000 : undefined,
      authentication: config.authenticationType !== 'none' ? {
        type: config.authenticationType,
        username: config.authUsername,
        password: config.authPassword,
        headerName: config.authHeaderName,
        headerValue: config.authHeaderValue,
        queryParameter: config.authQueryParam,
        queryValue: config.authQueryValue
      } : undefined
    };

    const execution = await webhookWaitManager.createWebhookWait(
      context.workflowId,
      context.executionId,
      context.nodeId,
      webhookConfig
    );

    return [{
      json: {
        webhookId: execution.id,
        webhookUrl: execution.webhookUrl,
        status: 'waiting',
        responseMode: config.responseMode
      }
    }];
  }
};

/**
 * Express/HTTP handler for webhook endpoints
 */
export async function handleWebhookRequest(req: any, res: any): Promise<void> {
  const path = req.path || req.url;
  const method = req.method as WebhookMethod;
  const headers = req.headers || {};
  const query = req.query || {};
  const body = req.body;

  const result = await webhookWaitManager.handleWebhook(
    path,
    method,
    headers,
    query,
    body,
    {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: headers['user-agent']
    }
  );

  res.status(result.status);

  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  res.json(result.body);
}
