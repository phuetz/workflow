/**
 * Webhook Tunnel System Types
 * Extracted from WebhookTunnelSystem.ts for modular architecture
 */

import * as http from 'http';
import * as https from 'https';
import type * as WS from 'ws';

// ============================================================================
// TUNNEL CONFIGURATION
// ============================================================================

export interface TunnelConfig {
  id: string;
  name: string;
  localPort: number;
  localHost?: string;
  protocol?: 'http' | 'https';
  subdomain?: string;
  customDomain?: string;
  region?: string;
  authToken?: string;
  metadata: TunnelMetadata;
  settings: TunnelSettings;
  createdAt: Date;
  status: TunnelStatus;
}

export interface TunnelMetadata {
  owner: string;
  project?: string;
  environment?: string;
  description?: string;
  tags?: string[];
  version?: string;
}

export interface TunnelSettings {
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  requestTimeout: number;
  keepAlive: boolean;
  keepAliveInterval: number;
  compression: boolean;
  encryption: boolean;
  rateLimit?: RateLimitConfig;
  allowedMethods?: string[];
  allowedHeaders?: string[];
  blockedIPs?: string[];
  allowedIPs?: string[];
  requestTransform?: RequestTransform;
  responseTransform?: ResponseTransform;
  webhookValidation?: WebhookValidation;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
}

export interface TunnelStatus {
  state: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  publicUrl?: string;
  connectionTime?: Date;
  lastActivity?: Date;
  bytesIn: number;
  bytesOut: number;
  requestsCount: number;
  errorsCount: number;
  averageLatency: number;
  uptime?: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface TunnelRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
  body?: Buffer;
  query?: Record<string, string>;
  params?: Record<string, string>;
  timestamp: Date;
  sourceIP?: string;
  userAgent?: string;
  protocol: string;
  tunnelId: string;
}

export interface TunnelResponse {
  id: string;
  requestId: string;
  statusCode: number;
  statusMessage?: string;
  headers: Record<string, string | string[]>;
  body?: Buffer;
  timestamp: Date;
  duration: number;
  size: number;
}

// ============================================================================
// TRANSFORMATION TYPES
// ============================================================================

export interface RequestTransform {
  enabled: boolean;
  rules: TransformRule[];
  scripts?: TransformScript[];
}

export interface ResponseTransform {
  enabled: boolean;
  rules: TransformRule[];
  scripts?: TransformScript[];
}

export interface TransformRule {
  id: string;
  name: string;
  type: 'header' | 'body' | 'query' | 'path';
  action: 'add' | 'remove' | 'replace' | 'modify';
  match?: string | RegExp;
  value?: any;
  condition?: TransformCondition;
}

export interface TransformScript {
  id: string;
  name: string;
  language: 'javascript' | 'typescript';
  code: string;
  timeout?: number;
}

export interface TransformCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'exists';
  value?: any;
}

// ============================================================================
// WEBHOOK VALIDATION
// ============================================================================

export interface WebhookValidation {
  enabled: boolean;
  providers: WebhookProvider[];
  customValidation?: CustomValidation;
}

export interface WebhookProvider {
  name: 'github' | 'stripe' | 'shopify' | 'slack' | 'twilio' | 'sendgrid' | 'custom';
  secret?: string;
  signatureHeader?: string;
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
  timestampTolerance?: number;
}

export interface CustomValidation {
  validateFunction: (request: TunnelRequest) => boolean;
  errorMessage?: string;
}

// ============================================================================
// INSPECTION & REPLAY
// ============================================================================

export interface RequestInspection {
  request: TunnelRequest;
  response?: TunnelResponse;
  validation?: ValidationResult;
  transformations?: TransformationLog[];
  timing: RequestTiming;
  metadata: RequestMetadata;
}

export interface ValidationResult {
  valid: boolean;
  provider?: string;
  signature?: string;
  timestamp?: Date;
  errors?: string[];
}

export interface TransformationLog {
  rule: TransformRule;
  before: any;
  after: any;
  duration: number;
}

export interface RequestTiming {
  dns?: number;
  tcp?: number;
  tls?: number;
  firstByte?: number;
  download?: number;
  total: number;
}

export interface RequestMetadata {
  tunnelId: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  tags?: Record<string, string>;
}

export interface ReplayConfig {
  targetUrl?: string;
  modifyRequest?: (request: TunnelRequest) => TunnelRequest;
  modifyResponse?: (response: TunnelResponse) => TunnelResponse;
  delay?: number;
  times?: number;
}

// ============================================================================
// MONITORING & LOGGING
// ============================================================================

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
  logValidation: boolean;
  maxBodySize?: number;
  redactHeaders?: string[];
  redactBody?: boolean;
  destination?: 'console' | 'file' | 'remote';
  remoteEndpoint?: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  alerting: AlertingConfig;
}

export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRule[];
  destinations: AlertDestination[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  cooldown?: number;
}

export interface AlertCondition {
  metric: 'errorRate' | 'latency' | 'requestRate' | 'bytesTransferred' | 'uptime';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  window?: number;
}

export interface AlertDestination {
  type: 'email' | 'webhook' | 'slack' | 'pagerduty';
  config: Record<string, any>;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstSize?: number;
  byIP?: boolean;
  byHeader?: string;
  whitelist?: string[];
  customKey?: (request: TunnelRequest) => string;
}

// ============================================================================
// TUNNEL EVENTS
// ============================================================================

export interface TunnelEvent {
  type: TunnelEventType;
  tunnelId: string;
  timestamp: Date;
  data?: any;
}

export type TunnelEventType =
  | 'tunnel.created'
  | 'tunnel.connected'
  | 'tunnel.disconnected'
  | 'tunnel.error'
  | 'tunnel.reconnecting'
  | 'request.received'
  | 'request.forwarded'
  | 'response.received'
  | 'response.sent'
  | 'validation.failed'
  | 'rateLimit.exceeded'
  | 'error.occurred';

// ============================================================================
// STATISTICS
// ============================================================================

export interface TunnelStatistics {
  tunnelId: string;
  startTime: Date;
  uptime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalBytesIn: number;
  totalBytesOut: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
  errorsPerSecond: number;
  topPaths: Array<{ path: string; count: number }>;
  topMethods: Array<{ method: string; count: number }>;
  topStatusCodes: Array<{ code: number; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
}

// ============================================================================
// TUNNEL PROVIDER
// ============================================================================

export interface TunnelProvider {
  name: string;
  connect(config: TunnelConfig): Promise<TunnelConnection>;
  disconnect(connectionId: string): Promise<void>;
  getStatus(connectionId: string): TunnelStatus;
  getStatistics(connectionId: string): TunnelStatistics;
}

export interface TunnelConnection {
  id: string;
  publicUrl: string;
  websocket?: WS.WebSocket;
  httpServer?: http.Server | https.Server;
  forward(request: TunnelRequest): Promise<TunnelResponse>;
  close(): Promise<void>;
}
