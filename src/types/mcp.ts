/**
 * Model Context Protocol (MCP) Type Definitions
 * Protocol Version: 1.0
 * Spec: https://spec.modelcontextprotocol.io/
 */

// JSON-RPC 2.0 Base Types
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown> | unknown[];
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown> | unknown[];
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Protocol Types
export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
  experimental?: Record<string, unknown>;
}

export interface MCPClientInfo {
  name: string;
  version: string;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
}

export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  clientInfo: MCPClientInfo;
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  serverInfo: MCPServerInfo;
  instructions?: string;
}

// Tool Types
export interface MCPToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
  properties?: Record<string, MCPToolParameter>;
  items?: MCPToolParameter;
}

export interface MCPToolSchema {
  type: 'object';
  properties: Record<string, MCPToolParameter>;
  required?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolSchema;
}

export interface MCPToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface MCPToolCallResult {
  content: MCPContent[];
  isError?: boolean;
}

// Resource Types
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface MCPReadResourceParams {
  uri: string;
}

export interface MCPReadResourceResult {
  contents: MCPResourceContents[];
}

export interface MCPSubscribeResourceParams {
  uri: string;
}

export interface MCPResourceUpdatedNotification {
  uri: string;
}

// Prompt Types
export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: MCPContent;
}

export interface MCPGetPromptParams {
  name: string;
  arguments?: Record<string, string>;
}

export interface MCPGetPromptResult {
  description?: string;
  messages: MCPPromptMessage[];
}

// Content Types
export type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;

export interface MCPTextContent {
  type: 'text';
  text: string;
}

export interface MCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface MCPResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

// Logging Types
export type MCPLogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

export interface MCPLogEntry {
  level: MCPLogLevel;
  logger?: string;
  data?: unknown;
  message: string;
}

export interface MCPSetLevelParams {
  level: MCPLogLevel;
}

// Connection Types
export interface MCPConnectionConfig {
  url: string;
  transport: 'websocket' | 'stdio' | 'sse';
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
  headers?: Record<string, string>;
  authentication?: MCPAuthentication;
}

export interface MCPAuthentication {
  type: 'bearer' | 'basic' | 'apiKey' | 'custom';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  customHeader?: string;
  customValue?: string;
}

export type MCPConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface MCPConnectionStatus {
  state: MCPConnectionState;
  connectedAt?: Date;
  lastError?: string;
  reconnectAttempts?: number;
  serverInfo?: MCPServerInfo;
}

// Server Types
export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: MCPCapabilities;
  port?: number;
  path?: string;
  maxClients?: number;
  authentication?: MCPAuthentication;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
}

export interface MCPServerStats {
  connectedClients: number;
  totalRequests: number;
  totalErrors: number;
  uptime: number;
  toolCalls: Record<string, number>;
  resourceAccess: Record<string, number>;
}

// Tool Registry Types
export interface MCPToolDefinition {
  tool: MCPTool;
  handler: (params: Record<string, unknown>) => Promise<MCPToolCallResult>;
  version?: string;
  deprecated?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MCPToolRegistryConfig {
  namespace?: string;
  versioning?: boolean;
  validation?: boolean;
  monitoring?: boolean;
}

// Resource Provider Types
export interface MCPResourceDefinition {
  resource: MCPResource;
  provider: (uri: string) => Promise<MCPResourceContents>;
  version?: string;
  cacheable?: boolean;
  ttl?: number;
  metadata?: Record<string, unknown>;
}

export interface MCPResourceProviderConfig {
  caching?: boolean;
  defaultTTL?: number;
  maxCacheSize?: number;
  monitoring?: boolean;
}

// Orchestrator Types
export interface MCPServerConnection {
  id: string;
  name: string;
  url: string;
  status: MCPConnectionStatus;
  capabilities: MCPCapabilities;
  tools?: MCPTool[];
  resources?: MCPResource[];
  lastPing?: Date;
  priority?: number;
}

export interface MCPOrchestratorConfig {
  servers: MCPConnectionConfig[];
  loadBalancing?: 'round-robin' | 'least-connections' | 'priority' | 'random';
  healthCheckInterval?: number;
  failoverEnabled?: boolean;
  toolRouting?: 'any' | 'all' | 'custom';
  customRouter?: (tool: string, servers: MCPServerConnection[]) => MCPServerConnection;
}

export interface MCPOrchestratorStats {
  totalServers: number;
  connectedServers: number;
  totalTools: number;
  totalResources: number;
  requestsProcessed: number;
  failovers: number;
  averageLatency: number;
}

// Event Types
export type MCPEventType =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'toolCalled'
  | 'resourceAccessed'
  | 'toolsListChanged'
  | 'resourcesListChanged'
  | 'promptsListChanged';

export interface MCPEvent {
  type: MCPEventType;
  timestamp: Date;
  data?: unknown;
  serverId?: string;
  error?: Error;
}

export type MCPEventHandler = (event: MCPEvent) => void;

// Workflow Integration Types
export interface MCPWorkflowTool extends MCPTool {
  workflowId: string;
  nodeType: string;
  autoGenerated: boolean;
}

export interface MCPWorkflowResource extends MCPResource {
  workflowId: string;
  resourceType: 'workflow' | 'execution' | 'data';
}

export interface MCPExecutionContext {
  workflowId: string;
  executionId: string;
  nodeId?: string;
  userId?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

// Error Codes (JSON-RPC standard + MCP specific)
export enum MCPErrorCode {
  // JSON-RPC 2.0 Standard Errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // MCP Specific Errors
  PROTOCOL_VERSION_MISMATCH = -32000,
  CAPABILITY_NOT_SUPPORTED = -32001,
  TOOL_NOT_FOUND = -32002,
  RESOURCE_NOT_FOUND = -32003,
  PROMPT_NOT_FOUND = -32004,
  TOOL_EXECUTION_ERROR = -32005,
  RESOURCE_ACCESS_ERROR = -32006,
  AUTHENTICATION_FAILED = -32007,
  RATE_LIMIT_EXCEEDED = -32008,
  SERVER_OVERLOADED = -32009,
  SUBSCRIPTION_FAILED = -32010,
}

// Monitoring Types
export interface MCPMetrics {
  connections: {
    total: number;
    active: number;
    failed: number;
  };
  tools: {
    registered: number;
    called: number;
    errors: number;
    averageExecutionTime: number;
  };
  resources: {
    registered: number;
    accessed: number;
    errors: number;
    cacheHitRate: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface MCPHealthCheck {
  healthy: boolean;
  timestamp: Date;
  checks: {
    connection: boolean;
    protocol: boolean;
    tools: boolean;
    resources: boolean;
  };
  errors?: string[];
}
