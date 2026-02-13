/**
 * API and CLI Access Types
 * REST API endpoints, authentication, and CLI interface definitions
 */

// API Authentication
export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string; // First 8 chars of key for display
  hashedKey: string; // Full hashed key for validation
  permissions: APIPermission[];
  scopes: APIScope[];
  rateLimits: RateLimit;
  usage: APIUsageStats;
  metadata: APIKeyMetadata;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface APIPermission {
  resource: APIResource;
  actions: APIAction[];
  conditions?: PermissionCondition[];
}

export type APIResource = 
  | 'workflows'
  | 'executions'
  | 'nodes'
  | 'credentials'
  | 'variables'
  | 'schedules'
  | 'webhooks'
  | 'analytics'
  | 'sharing'
  | 'users'
  | 'admin';

export type APIAction = 
  | 'read'
  | 'write' 
  | 'delete'
  | 'execute'
  | 'manage';

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'lt' | 'gt' | 'lte' | 'gte';
  value: unknown;
}

export type APIScope = 
  | 'workflow:read'
  | 'workflow:write'
  | 'workflow:execute'
  | 'workflow:delete'
  | 'execution:read'
  | 'execution:write'
  | 'node:read'
  | 'node:write'
  | 'credential:read'
  | 'credential:write'
  | 'variable:read'
  | 'variable:write'
  | 'schedule:read'
  | 'schedule:write'
  | 'webhook:read'
  | 'webhook:write'
  | 'analytics:read'
  | 'sharing:read'
  | 'sharing:write'
  | 'admin:read'
  | 'admin:write';

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  quotaReset: 'minute' | 'hour' | 'day' | 'month';
}

export interface APIUsageStats {
  totalRequests: number;
  requestsThisMonth: number;
  requestsToday: number;
  lastMonthRequests: number;
  averageResponseTime: number;
  errorRate: number;
  quotaUsage: QuotaUsage;
  topEndpoints: EndpointUsage[];
  recentActivity: APIActivity[];
}

export interface QuotaUsage {
  minute: { used: number; limit: number; resetAt: Date };
  hour: { used: number; limit: number; resetAt: Date };
  day: { used: number; limit: number; resetAt: Date };
  month: { used: number; limit: number; resetAt: Date };
}

export interface EndpointUsage {
  endpoint: string;
  method: string;
  requests: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface APIActivity {
  id: string;
  timestamp: Date;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ipAddress?: string;
  error?: string;
}

export interface APIKeyMetadata {
  createdBy: string;
  description?: string;
  environment: 'development' | 'staging' | 'production';
  application?: string;
  tags: string[];
  allowedIPs?: string[];
  allowedDomains?: string[];
}

// API Endpoints and Responses
export interface APIEndpoint {
  path: string;
  method: HTTPMethod;
  description: string;
  parameters: APIParameter[];
  requestBody?: APISchema;
  responses: APIEndpointResponse[];
  authentication: boolean;
  ratelimit: boolean;
  scopes: APIScope[];
  examples: APIExample[];
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  example?: unknown;
  enum?: unknown[];
}

export interface APISchema {
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
  example?: unknown;
}

export interface APIEndpointResponse {
  statusCode: number;
  description: string;
  schema?: APISchema;
  examples?: Record<string, unknown>;
}

export interface APIExample {
  name: string;
  description: string;
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response: {
    statusCode: number;
    headers?: Record<string, string>;
    body: unknown;
  };
}

// CLI Types
export interface CLICommand {
  name: string;
  description: string;
  usage: string;
  options: CLIOption[];
  examples: CLIExample[];
  subcommands?: CLICommand[];
  handler?: CLIHandler;
}

export interface CLIOption {
  name: string;
  alias?: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
  choices?: string[];
}

export interface CLIExample {
  command: string;
  description: string;
  output?: string;
}

export type CLIHandler = (args: unknown, options: unknown) => Promise<CLIResult>;

export interface CLIResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

export interface CLIConfig {
  apiUrl: string;
  apiKey?: string;
  format: 'json' | 'table' | 'yaml';
  verbose: boolean;
  timeout: number;
  retries: number;
  profile?: string;
}

export interface CLIProfile {
  name: string;
  apiUrl: string;
  apiKey: string;
  defaultFormat: 'json' | 'table' | 'yaml';
  isDefault: boolean;
}

// Webhook API Types
export interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  isActive: boolean;
  headers?: Record<string, string>;
  retryPolicy: WebhookRetryPolicy;
  filters?: WebhookFilter[];
  stats: WebhookStats;
  createdAt: Date;
}

export type WebhookEvent = 
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.deleted'
  | 'workflow.executed'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'node.executed'
  | 'error.occurred';

export interface WebhookRetryPolicy {
  maxRetries: number;
  retryDelay: number; // seconds
  backoffMultiplier: number;
  maxDelay: number; // seconds
}

export interface WebhookFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface WebhookStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
  lastDeliveryAt?: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
}

// API Service Interface
export interface APIService {
  // API Key Management
  createAPIKey(options: CreateAPIKeyOptions): Promise<APIKey>;
  listAPIKeys(userId?: string): Promise<APIKey[]>;
  getAPIKey(keyId: string): Promise<APIKey | null>;
  updateAPIKey(keyId: string, updates: Partial<APIKey>): Promise<APIKey>;
  deleteAPIKey(keyId: string): Promise<void>;
  rotateAPIKey(keyId: string): Promise<APIKey>;
  
  // Authentication
  validateAPIKey(key: string): Promise<APIKey | null>;
  checkPermissions(apiKey: APIKey, resource: APIResource, action: APIAction): boolean;
  checkRateLimit(apiKey: APIKey): Promise<RateLimitResult>;
  
  // Usage Analytics
  recordAPIUsage(keyId: string, endpoint: string, method: string, statusCode: number, responseTime: number): Promise<void>;
  getAPIUsage(keyId: string, period?: DateRange): Promise<APIUsageStats>;
  
  // Endpoints Documentation
  getAPIDocumentation(): APIEndpoint[];
  generateOpenAPISpec(): unknown;
  
  // CLI Support
  generateCLIConfig(apiKey: string): CLIConfig;
  executeCLICommand(command: string, args: string[], options: CLIConfig): Promise<CLIResult>;
  
  // Webhooks
  createWebhook(webhook: Omit<WebhookEndpoint, 'id' | 'stats' | 'createdAt'>): Promise<WebhookEndpoint>;
  listWebhooks(): Promise<WebhookEndpoint[]>;
  deleteWebhook(webhookId: string): Promise<void>;
  deliverWebhook(webhookId: string, event: WebhookEvent, payload: unknown): Promise<void>;
}

export interface CreateAPIKeyOptions {
  name: string;
  description?: string;
  permissions: APIPermission[];
  scopes: APIScope[];
  rateLimits?: Partial<RateLimit>;
  expiresIn?: number; // seconds
  environment?: 'development' | 'staging' | 'production';
  allowedIPs?: string[];
  allowedDomains?: string[];
  tags?: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Standard API Response Format
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: APIMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
}

export interface APIMetadata {
  timestamp: string;
  requestId: string;
  version: string;
  rateLimit?: {
    remaining: number;
    resetAt: string;
  };
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// Workflow API Specific Types
export interface WorkflowExecutionRequest {
  workflowId: string;
  input?: unknown;
  parameters?: Record<string, unknown>;
  environment?: string;
  async?: boolean;
  webhookUrl?: string;
}

export interface WorkflowExecutionResponse {
  executionId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
  logs?: ExecutionLog[];
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  data?: unknown;
}

// GraphQL API Types (if supporting GraphQL)
export interface GraphQLQuery {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: unknown;
}