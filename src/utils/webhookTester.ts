/**
 * Webhook Testing Tool
 * Test and debug webhooks with request inspection and replay
 */

export enum WebhookMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

export interface WebhookRequest {
  id: string;
  timestamp: Date;
  method: WebhookMethod;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: any;
  rawBody: string;
  sourceIp?: string;
  userAgent?: string;
}

export interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  duration: number;
  error?: string;
}

export interface WebhookTest {
  id: string;
  name: string;
  webhookId: string;
  request: WebhookRequest;
  response?: WebhookResponse;
  createdAt: Date;
  workflow?: {
    id: string;
    executionId?: string;
    triggered: boolean;
  };
}

export interface WebhookEndpoint {
  id: string;
  workflowId: string;
  url: string;
  method: WebhookMethod;
  isActive: boolean;
  secretKey?: string;
  requireSignature: boolean;
  allowedIps?: string[];
  createdAt: Date;
  requestCount: number;
  lastRequestAt?: Date;
}

export interface WebhookSignatureConfig {
  algorithm: 'sha256' | 'sha1' | 'md5';
  header: string; // Header name to check
  secret: string;
  prefix?: string; // e.g., "sha256="
}

class WebhookTester {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private requests: Map<string, WebhookRequest[]> = new Map();
  private tests: Map<string, WebhookTest> = new Map();
  private listeners: Map<string, Set<(request: WebhookRequest) => void>> = new Map();

  /**
   * Create a test webhook endpoint
   */
  createEndpoint(
    workflowId: string,
    method: WebhookMethod = WebhookMethod.POST,
    options?: {
      secretKey?: string;
      requireSignature?: boolean;
      allowedIps?: string[];
    }
  ): WebhookEndpoint {
    const endpoint: WebhookEndpoint = {
      id: this.generateId('webhook'),
      workflowId,
      url: this.generateWebhookUrl(),
      method,
      isActive: true,
      secretKey: options?.secretKey,
      requireSignature: options?.requireSignature || false,
      allowedIps: options?.allowedIps,
      createdAt: new Date(),
      requestCount: 0
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.requests.set(endpoint.id, []);

    return endpoint;
  }

  /**
   * Generate webhook URL
   */
  private generateWebhookUrl(): string {
    const baseUrl = import.meta.env.VITE_WEBHOOK_BASE_URL || 'https://hooks.workflowbuilder.app';
    const path = this.generateId('hook');
    return `${baseUrl}/${path}`;
  }

  /**
   * Simulate webhook request
   */
  async simulateRequest(
    endpointId: string,
    options: {
      method?: WebhookMethod;
      headers?: Record<string, string>;
      query?: Record<string, string>;
      body?: any;
      sourceIp?: string;
    }
  ): Promise<WebhookTest> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error('Webhook endpoint not found');
    }

    // Create request
    const request: WebhookRequest = {
      id: this.generateId('req'),
      timestamp: new Date(),
      method: options.method || endpoint.method,
      url: endpoint.url,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WebhookTester/1.0',
        ...options.headers
      },
      query: options.query || {},
      body: options.body,
      rawBody: JSON.stringify(options.body),
      sourceIp: options.sourceIp,
      userAgent: options.headers?.['User-Agent'] || 'WebhookTester/1.0'
    };

    // Validate request
    const validation = this.validateRequest(endpoint, request);
    if (!validation.valid) {
      const test: WebhookTest = {
        id: this.generateId('test'),
        name: `Test ${new Date().toISOString()}`,
        webhookId: endpointId,
        request,
        response: {
          statusCode: 403,
          headers: {},
          body: { error: validation.error },
          duration: 0,
          error: validation.error
        },
        createdAt: new Date()
      };

      this.tests.set(test.id, test);
      return test;
    }

    // Store request
    const requests = this.requests.get(endpointId) || [];
    requests.unshift(request);

    // Keep only last 100 requests
    if (requests.length > 100) {
      this.requests.set(endpointId, requests.slice(0, 100));
    } else {
      this.requests.set(endpointId, requests);
    }

    // Update endpoint stats
    endpoint.requestCount++;
    endpoint.lastRequestAt = new Date();

    // Notify listeners
    this.notifyListeners(endpointId, request);

    // Simulate workflow execution
    const startTime = Date.now();
    const response = await this.executeWebhook(endpoint, request);
    const duration = Date.now() - startTime;

    response.duration = duration;

    // Create test record
    const test: WebhookTest = {
      id: this.generateId('test'),
      name: `Test ${new Date().toISOString()}`,
      webhookId: endpointId,
      request,
      response,
      createdAt: new Date(),
      workflow: {
        id: endpoint.workflowId,
        executionId: this.generateId('exec'),
        triggered: response.statusCode === 200
      }
    };

    this.tests.set(test.id, test);

    return test;
  }

  /**
   * Validate webhook request
   */
  private validateRequest(
    endpoint: WebhookEndpoint,
    request: WebhookRequest
  ): { valid: boolean; error?: string } {
    // Check if endpoint is active
    if (!endpoint.isActive) {
      return { valid: false, error: 'Webhook endpoint is disabled' };
    }

    // Check IP whitelist
    if (endpoint.allowedIps && endpoint.allowedIps.length > 0) {
      if (!request.sourceIp || !endpoint.allowedIps.includes(request.sourceIp)) {
        return { valid: false, error: 'IP address not allowed' };
      }
    }

    // Check signature
    if (endpoint.requireSignature && endpoint.secretKey) {
      const signatureValid = this.verifySignature(request, endpoint.secretKey);
      if (!signatureValid) {
        return { valid: false, error: 'Invalid signature' };
      }
    }

    return { valid: true };
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(request: WebhookRequest, secret: string): boolean {
    const signature = request.headers['x-webhook-signature'] || request.headers['x-hub-signature'];
    if (!signature) return false;

    // Simplified signature verification
    // In production, use crypto library
    const expectedSignature = this.generateSignature(request.rawBody, secret);
    return signature === expectedSignature;
  }

  /**
   * Generate webhook signature
   */
  generateSignature(
    payload: string,
    secret: string,
    config?: WebhookSignatureConfig
  ): string {
    // Simplified - in production use crypto.createHmac
    const algorithm = config?.algorithm || 'sha256';
    const prefix = config?.prefix || 'sha256=';

    // This is a placeholder - real implementation would use crypto
    const hash = btoa(payload + secret).substr(0, 64);
    return `${prefix}${hash}`;
  }

  /**
   * Execute webhook (simulate workflow execution)
   */
  private async executeWebhook(
    endpoint: WebhookEndpoint,
    request: WebhookRequest
  ): Promise<WebhookResponse> {
    try {
      // Simulate workflow execution delay
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Workflow-Id': endpoint.workflowId,
          'X-Request-Id': request.id
        },
        body: {
          success: true,
          message: 'Webhook received and workflow triggered',
          workflowId: endpoint.workflowId,
          executionId: this.generateId('exec'),
          timestamp: new Date().toISOString()
        },
        duration: 0 // Will be set by caller
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Internal server error' },
        duration: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Replay webhook request
   */
  async replayRequest(requestId: string): Promise<WebhookTest> {
    // Find original request
    let originalRequest: WebhookRequest | undefined;
    let endpointId: string | undefined;

    for (const [eId, requests] of this.requests.entries()) {
      const req = requests.find(r => r.id === requestId);
      if (req) {
        originalRequest = req;
        endpointId = eId;
        break;
      }
    }

    if (!originalRequest || !endpointId) {
      throw new Error('Request not found');
    }

    // Replay with same parameters
    return this.simulateRequest(endpointId, {
      method: originalRequest.method,
      headers: originalRequest.headers,
      query: originalRequest.query,
      body: originalRequest.body,
      sourceIp: originalRequest.sourceIp
    });
  }

  /**
   * Create request template
   */
  createTemplate(name: string, request: Partial<WebhookRequest>): {
    id: string;
    name: string;
    template: Partial<WebhookRequest>;
  } {
    return {
      id: this.generateId('template'),
      name,
      template: {
        method: request.method || WebhookMethod.POST,
        headers: request.headers || {
          'Content-Type': 'application/json'
        },
        query: request.query || {},
        body: request.body || {}
      }
    };
  }

  /**
   * Generate sample payloads for common services
   */
  getSamplePayload(service: string): any {
    const samples: Record<string, any> = {
      github: {
        action: 'opened',
        pull_request: {
          id: 1,
          number: 1,
          title: 'Update README',
          user: { login: 'octocat' },
          created_at: new Date().toISOString()
        }
      },
      stripe: {
        id: 'evt_1234567890',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_1234567890',
            amount: 2000,
            currency: 'usd',
            status: 'succeeded'
          }
        }
      },
      slack: {
        type: 'message',
        channel: 'C1234567890',
        user: 'U1234567890',
        text: 'Hello, world!',
        ts: '1234567890.123456'
      },
      shopify: {
        id: 820982911946154508,
        email: 'customer@example.com',
        total_price: '199.00',
        line_items: [
          {
            id: 466157049,
            title: 'Product Title',
            price: '199.00',
            quantity: 1
          }
        ]
      },
      custom: {
        event: 'custom.event',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Your custom data here'
        }
      }
    };

    return samples[service] || samples.custom;
  }

  /**
   * Get request history
   */
  getRequestHistory(endpointId: string, limit: number = 20): WebhookRequest[] {
    const requests = this.requests.get(endpointId) || [];
    return requests.slice(0, limit);
  }

  /**
   * Get test history
   */
  getTestHistory(webhookId?: string): WebhookTest[] {
    const tests = Array.from(this.tests.values());

    if (webhookId) {
      return tests.filter(t => t.webhookId === webhookId);
    }

    return tests;
  }

  /**
   * Subscribe to webhook requests
   */
  subscribe(
    endpointId: string,
    callback: (request: WebhookRequest) => void
  ): () => void {
    if (!this.listeners.has(endpointId)) {
      this.listeners.set(endpointId, new Set());
    }

    this.listeners.get(endpointId)!.add(callback);

    return () => {
      const listeners = this.listeners.get(endpointId);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(endpointId: string, request: WebhookRequest): void {
    const listeners = this.listeners.get(endpointId);
    if (!listeners) return;

    listeners.forEach(listener => {
      try {
        listener(request);
      } catch (error) {
        console.error('Error in webhook listener:', error);
      }
    });
  }

  /**
   * Get endpoint statistics
   */
  getStatistics(endpointId: string) {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    const requests = this.requests.get(endpointId) || [];
    const tests = this.getTestHistory(endpointId);

    const successfulTests = tests.filter(t => t.response?.statusCode === 200);
    const failedTests = tests.filter(t => t.response?.statusCode !== 200);

    return {
      totalRequests: endpoint.requestCount,
      recentRequests: requests.length,
      totalTests: tests.length,
      successfulTests: successfulTests.length,
      failedTests: failedTests.length,
      successRate: tests.length > 0 ? (successfulTests.length / tests.length) * 100 : 0,
      averageResponseTime:
        tests.reduce((sum, t) => sum + (t.response?.duration || 0), 0) / tests.length || 0,
      lastRequest: endpoint.lastRequestAt
    };
  }

  /**
   * Export test results
   */
  exportTest(testId: string): string {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');

    return JSON.stringify(test, null, 2);
  }

  /**
   * Clear request history
   */
  clearHistory(endpointId: string): void {
    this.requests.set(endpointId, []);
  }

  /**
   * Delete endpoint
   */
  deleteEndpoint(endpointId: string): void {
    this.endpoints.delete(endpointId);
    this.requests.delete(endpointId);
    this.listeners.delete(endpointId);
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const webhookTester = new WebhookTester();
