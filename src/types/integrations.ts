/**
 * Integration System Types
 * Extensible node system for popular service integrations
 */

export interface IntegrationNode {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  color: string;
  version: string;
  author: string;
  tags: string[];
  credentials?: CredentialConfig[];
  inputs: NodeInput[];
  outputs: NodeOutput[];
  properties: NodeProperty[];
  executor: NodeExecutor;
  documentation: NodeDocumentation;
  examples: NodeExample[];
  pricing?: 'free' | 'premium' | 'enterprise';
  popularity: number; // Download/usage count
  rating: number; // 1-5 stars
  lastUpdated: Date;
}

export type IntegrationCategory = 
  | 'communication' // Slack, Discord, Teams, Email
  | 'crm' // Salesforce, HubSpot, Pipedrive
  | 'productivity' // Google Workspace, Office 365, Notion
  | 'ecommerce' // Shopify, WooCommerce, Stripe
  | 'social' // Twitter, LinkedIn, Facebook, Instagram
  | 'storage' // Google Drive, Dropbox, AWS S3
  | 'databases' // MySQL, PostgreSQL, MongoDB
  | 'analytics' // Google Analytics, Mixpanel
  | 'development' // GitHub, GitLab, Jira
  | 'marketing' // MailChimp, SendGrid, ConvertKit
  | 'ai' // OpenAI, Claude, Hugging Face
  | 'finance' // PayPal, Stripe, QuickBooks
  | 'utilities' // Date/Time, Math, Text processing
  | 'triggers' // Webhooks, Schedules, File watchers
  | 'custom'; // User-defined nodes

export interface CredentialConfig {
  name: string;
  displayName: string;
  type: 'oauth2' | 'apiKey' | 'basic' | 'jwt' | 'custom';
  required: boolean;
  description: string;
  properties: {
    [key: string]: {
      type: 'string' | 'password' | 'url';
      displayName: string;
      description?: string;
      placeholder?: string;
      default?: string;
    };
  };
  testEndpoint?: string; // URL to test credentials
  authUrl?: string; // OAuth authorization URL
  tokenUrl?: string; // OAuth token URL
  scopes?: string[]; // OAuth scopes
}

export interface NodeInput {
  name: string;
  displayName: string;
  type: 'main' | 'webhook' | 'trigger';
  required: boolean;
  description?: string;
}

export interface NodeOutput {
  name: string;
  displayName: string;
  type: 'main' | 'error';
  description?: string;
}

export interface NodeProperty {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiSelect' | 'json' | 'expression';
  required: boolean;
  default?: unknown;
  description?: string;
  placeholder?: string;
  options?: Array<{
    name: string;
    value: unknown;
    description?: string;
  }>;
  validators?: PropertyValidator[];
  dependsOn?: string; // Show only if another property has specific value
  conditional?: {
    property: string;
    value: unknown;
  };
}

export interface PropertyValidator {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
  customValidator?: (value: unknown) => boolean;
}

export interface NodeExecutor {
  execute: (params: ExecutorParams) => Promise<ExecutorResult>;
  webhook?: (params: WebhookParams) => Promise<WebhookResult>;
  poll?: (params: PollParams) => Promise<PollResult>;
}

export interface ExecutorParams {
  credentials?: Record<string, unknown>;
  properties: Record<string, unknown>;
  inputData: unknown[];
  workflowId: string;
  executionId: string;
  nodeId: string;
  userId: string;
  helpers: NodeHelpers;
}

export interface ExecutorResult {
  success: boolean;
  data?: unknown[];
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookParams extends ExecutorParams {
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
    query: Record<string, string>;
  };
}

export interface WebhookResult {
  workflowData?: unknown[];
  response?: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export interface PollParams extends ExecutorParams {
  lastPoll?: Date;
  pollConfig: {
    interval: number; // milliseconds
    maxItems?: number;
  };
}

export interface PollResult {
  items: unknown[];
  lastPollTime: Date;
  hasMore: boolean;
}

export interface NodeHelpers {
  httpRequest: (options: HttpRequestOptions) => Promise<HttpResponse>;
  logger: {
    info: (message: string, data?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    error: (message: string, data?: unknown) => void;
  };
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  crypto: {
    hash: (data: string, algorithm?: string) => string;
    encrypt: (data: string, key: string) => string;
    decrypt: (data: string, key: string) => string;
  };
  utils: {
    parseDate: (date: string) => Date;
    formatDate: (date: Date, format: string) => string;
    generateId: () => string;
    validateEmail: (email: string) => boolean;
    extractDomain: (url: string) => string;
  };
}

export interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  auth?: {
    type: 'bearer' | 'basic' | 'oauth2';
    token?: string;
    username?: string;
    password?: string;
  };
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface NodeDocumentation {
  description: string;
  setup?: string; // Setup instructions
  usage: string;
  parameters: Array<{
    name: string;
    description: string;
    example?: string;
  }>;
  examples: NodeExample[];
  troubleshooting?: Array<{
    issue: string;
    solution: string;
  }>;
  changelog?: Array<{
    version: string;
    date: Date;
    changes: string[];
  }>;
}

export interface NodeExample {
  name: string;
  description: string;
  configuration: Record<string, unknown>;
  inputData?: unknown;
  expectedOutput?: unknown;
  workflow?: {
    nodes: Array<{
      type: string;
      position: { x: number; y: number };
      data: Record<string, unknown>;
    }>;
    connections: Array<{
      source: string;
      target: string;
    }>;
  };
}

export interface IntegrationMarketplace {
  featured: IntegrationNode[];
  categories: Array<{
    name: IntegrationCategory;
    displayName: string;
    icon: string;
    count: number;
    nodes: IntegrationNode[];
  }>;
  popular: IntegrationNode[];
  recent: IntegrationNode[];
  search: (query: string, filters?: MarketplaceFilters) => IntegrationNode[];
}

export interface MarketplaceFilters {
  category?: IntegrationCategory;
  pricing?: 'free' | 'premium' | 'enterprise';
  minRating?: number;
  tags?: string[];
  author?: string;
}

export interface NodePackage {
  name: string;
  version: string;
  description: string;
  author: string;
  keywords: string[];
  homepage?: string;
  repository?: string;
  license: string;
  nodes: IntegrationNode[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  installInstructions: string;
}

// Popular service integrations to implement first
export const PRIORITY_INTEGRATIONS: Array<{
  name: string;
  category: IntegrationCategory;
  priority: 'high' | 'medium' | 'low';
  usage: number; // Estimated usage percentage
}> = [
  // Communication (High Priority)
  { name: 'Slack', category: 'communication', priority: 'high', usage: 85 },
  { name: 'Discord', category: 'communication', priority: 'high', usage: 60 },
  { name: 'Microsoft Teams', category: 'communication', priority: 'high', usage: 70 },
  { name: 'Email (SMTP)', category: 'communication', priority: 'high', usage: 95 },
  { name: 'Gmail', category: 'communication', priority: 'high', usage: 80 },
  
  // Productivity (High Priority)
  { name: 'Google Sheets', category: 'productivity', priority: 'high', usage: 90 },
  { name: 'Google Drive', category: 'storage', priority: 'high', usage: 85 },
  { name: 'Notion', category: 'productivity', priority: 'high', usage: 70 },
  { name: 'Airtable', category: 'productivity', priority: 'high', usage: 65 },
  { name: 'Trello', category: 'productivity', priority: 'high', usage: 60 },
  
  // CRM (High Priority)
  { name: 'Salesforce', category: 'crm', priority: 'high', usage: 75 },
  { name: 'HubSpot', category: 'crm', priority: 'high', usage: 65 },
  { name: 'Pipedrive', category: 'crm', priority: 'medium', usage: 40 },
  
  // Development (High Priority)
  { name: 'GitHub', category: 'development', priority: 'high', usage: 80 },
  { name: 'GitLab', category: 'development', priority: 'medium', usage: 45 },
  { name: 'Jira', category: 'development', priority: 'high', usage: 70 },
  
  // Social Media (Medium Priority)
  { name: 'Twitter/X', category: 'social', priority: 'medium', usage: 55 },
  { name: 'LinkedIn', category: 'social', priority: 'medium', usage: 50 },
  { name: 'Facebook', category: 'social', priority: 'medium', usage: 45 },
  
  // E-commerce (Medium Priority)
  { name: 'Shopify', category: 'ecommerce', priority: 'medium', usage: 60 },
  { name: 'Stripe', category: 'finance', priority: 'high', usage: 70 },
  { name: 'PayPal', category: 'finance', priority: 'medium', usage: 55 },
  
  // Marketing (Medium Priority)
  { name: 'MailChimp', category: 'marketing', priority: 'medium', usage: 65 },
  { name: 'SendGrid', category: 'marketing', priority: 'medium', usage: 50 },
  
  // AI/ML (High Priority - Competitive advantage)
  { name: 'OpenAI', category: 'ai', priority: 'high', usage: 75 },
  { name: 'Anthropic Claude', category: 'ai', priority: 'high', usage: 40 },
  { name: 'Hugging Face', category: 'ai', priority: 'medium', usage: 30 },
  
  // Databases (High Priority)
  { name: 'PostgreSQL', category: 'databases', priority: 'high', usage: 60 },
  { name: 'MySQL', category: 'databases', priority: 'high', usage: 70 },
  { name: 'MongoDB', category: 'databases', priority: 'high', usage: 55 },
  
  // Storage (Medium Priority)
  { name: 'AWS S3', category: 'storage', priority: 'medium', usage: 65 },
  { name: 'Dropbox', category: 'storage', priority: 'medium', usage: 50 },
  
  // Analytics (Low Priority)
  { name: 'Google Analytics', category: 'analytics', priority: 'low', usage: 40 },
  { name: 'Mixpanel', category: 'analytics', priority: 'low', usage: 25 }
];

// Built-in utility nodes that every workflow platform needs
export const UTILITY_NODES = [
  'HTTP Request',
  'Webhook',
  'Schedule Trigger',
  'File Trigger',
  'Code (JavaScript)',
  'Code (Python)',
  'Transform Data',
  'Filter Data',
  'Merge Data',
  'Split Data',
  'Delay',
  'If/Switch',
  'Loop',
  'Set Variable',
  'Date/Time',
  'Math Operations',
  'Text Operations',
  'JSON Parser',
  'CSV Parser',
  'XML Parser',
  'Regex',
  'Error Handler',
  'Stop Workflow',
  'Email Send',
  'SMS Send',
  'Push Notification'
];

export interface NodeRegistry {
  register: (node: IntegrationNode) => void;
  unregister: (nodeId: string) => void;
  get: (nodeId: string) => IntegrationNode | undefined;
  getByCategory: (category: IntegrationCategory) => IntegrationNode[];
  search: (query: string) => IntegrationNode[];
  getAll: () => IntegrationNode[];
  install: (packageName: string) => Promise<void>;
  uninstall: (packageName: string) => Promise<void>;
  update: (packageName: string) => Promise<void>;
  validate: (node: IntegrationNode) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Template for creating new integration nodes
export const createIntegrationTemplate = (
  name: string,
  category: IntegrationCategory,
  config: Partial<IntegrationNode>
): IntegrationNode => {
  return {
    id: `${category}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name: name.toLowerCase().replace(/\s+/g, '_'),
    displayName: name,
    description: config.description || `Integration with ${name}`,
    category,
    icon: config.icon || 'activity',
    color: config.color || '#666666',
    version: '1.0.0',
    author: 'System',
    tags: config.tags || [category, name.toLowerCase()],
    credentials: config.credentials || [],
    inputs: config.inputs || [{ name: 'main', displayName: 'Input', type: 'main', required: false }],
    outputs: config.outputs || [
      { name: 'main', displayName: 'Output', type: 'main' },
      { name: 'error', displayName: 'Error', type: 'error' }
    ],
    properties: config.properties || [],
    executor: config.executor || {
      execute: async () => ({ success: false, error: 'Not implemented' })
    },
    documentation: config.documentation || {
      description: `Integration with ${name}`,
      usage: 'Configure your credentials and properties to use this integration.',
      parameters: [],
      examples: []
    },
    examples: config.examples || [],
    pricing: config.pricing || 'free',
    popularity: config.popularity || 0,
    rating: config.rating || 0,
    lastUpdated: new Date(),
    ...config
  };
};